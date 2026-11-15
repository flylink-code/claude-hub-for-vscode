import * as vscode from 'vscode';
import { ClaudeConfigManager } from './claudeConfigManager.js';
import { ClaudeFeaturesManager } from './claudeFeatures.js';
import { formatModelDisplayName, formatSelectedModelName } from './contextLimit.js';
import { SessionManager } from './sessionManager.js';
import { getWebviewContent } from './webviewHtml.js';
import { ClaudeConfigDirProvider, isPathInWorkspace } from './configDir.js';
import * as path from 'path';
import { TaskIntegrationManager } from './taskIntegration.js';
import { isAllowedPlanPath } from './nativeTasks.js';
import { t, getCurrentLanguage } from './i18n.js';
import { buildTaskSyncPrompt } from './projectTodoPolicy.js';
import { getPinnedSessionIds, sortSessionsWithPins } from './sessionPins.js';
import { getSessionTagMap } from './sessionTags.js';
import { lastSubscriptionFetchError } from './subscriptionUsage.js';
import { resolveTooltipSections } from './statusBarFormatter.js';

const ALLOWED_STATUS_BAR_SETTING_KEYS = new Set<string>([
  'statusBar.style',
  'statusBar.preset',
  'statusBar.separator',
  'statusBar.contextFormat',
  'statusBar.clickAction',
  'statusBar.hideWhenInactive',
  'statusBar.showContext',
  'statusBar.showProgressBar',
  'statusBar.showSpeed',
  'statusBar.showModel',
  'statusBar.showCost',
  'statusBar.showTools',
  'statusBar.showDuration',
  'statusBar.showTodos',
  'statusBar.showAgents',
  'statusBar.showGitBranch',
  'statusBar.tooltipSections',
]);

export class ClaudeHubDashboardProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewType = 'claudeHub.dashboardView';
  private _view?: vscode.WebviewView;
  private _panel?: vscode.WebviewPanel;
  private _pendingPanelTab?: string;
  private featuresManager: ClaudeFeaturesManager;
  private taskIntegration: TaskIntegrationManager;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly sessionManager: SessionManager,
    private readonly configManager: ClaudeConfigManager,
    configDirProvider?: ClaudeConfigDirProvider,
  ) {
    this.featuresManager = new ClaudeFeaturesManager(configDirProvider);
    this.taskIntegration = new TaskIntegrationManager(
      context.globalStorageUri.fsPath,
      path.join(context.extensionUri.fsPath, 'resources', 'task-bridge.cjs'),
      () => this.sessionManager.claudeConfigDir,
    );

    context.subscriptions.push(
      sessionManager.onDidUpdateSessions(() => {
        this.sendSessionUpdate();
        this.sendConfigUpdate();
        this.sendExtensionsUpdate();
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('claudeHub')) {
          this.sendConfigUpdate();
        }
      }),
    );
    sessionManager.onDidUpdateSubscription(() => this.sendSessionUpdate());
    configManager.onDidChange(() => this.sendConfigUpdate());
  }

  private postToViews(msg: unknown): void {
    this._view?.webview.postMessage(msg);
    this._panel?.webview.postMessage(msg);
  }

  private hasAnyView(): boolean {
    return Boolean(this._view || this._panel);
  }

  public async show(): Promise<void> {
    try {
      await vscode.commands.executeCommand('workbench.view.extension.claude-hub-container');
    } catch {
      // fallback if container ID differs
    }
    if (this._view) {
      this._view.show(true);
    } else {
      try {
        await vscode.commands.executeCommand('claudeHub.dashboardView.focus');
      } catch {
        // ignore
      }
    }
  }

  public async showSettingsTab(): Promise<void> {
    if (this._panel && this._panel.active) {
      this._panel.webview.postMessage({ type: 'switchTab', tab: 'settings' });
      return;
    }
    await this.show();
    if (this._view) {
      this._view.webview.postMessage({ type: 'switchTab', tab: 'settings' });
    }
  }

  public openInEditorTab(initialTab?: string): void {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.One);
      if (initialTab) {
        this._panel.webview.postMessage({ type: 'switchTab', tab: initialTab });
      }
      return;
    }

    this._pendingPanelTab = initialTab;
    this._panel = vscode.window.createWebviewPanel(
      'claudeHub.dashboardTab',
      'Claude Hub',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      },
    );
    this._panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'images', 'icon.svg');
    this._panel.webview.html = getWebviewContent({ isSidebar: false });
    this.attachMessageHandler(this._panel.webview, () => {
      if (this._pendingPanelTab) {
        this._panel?.webview.postMessage({ type: 'switchTab', tab: this._pendingPanelTab });
        this._pendingPanelTab = undefined;
      }
    });
    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewView.webview.html = getWebviewContent({ isSidebar: true });
    this.attachMessageHandler(webviewView.webview);

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.sendSessionUpdate();
        this.sendConfigUpdate();
      }
    });
  }

  private attachMessageHandler(webview: vscode.Webview, onReady?: () => void): void {
    webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'ready':
          webview.postMessage({ type: 'restoreUiState', state: this.context.globalState.get('dashboardUiState') });
          onReady?.();
          this.sendSessionUpdate();
          this.sendConfigUpdate();
          this.sendExtensionsUpdate();
          break;

        case 'saveUiState':
          if (msg.state && typeof msg.state === 'object' && !Array.isArray(msg.state)) {
            await this.context.globalState.update('dashboardUiState', msg.state);
          }
          break;

        case 'openDashboardTab':
          this.openInEditorTab(typeof msg.tab === 'string' ? msg.tab : undefined);
          break;

        case 'openVsCodeSettings':
          await vscode.commands.executeCommand('workbench.action.openSettings', 'claudeHub');
          break;

        case 'updateStatusBarConfig': {
          const key = typeof msg.key === 'string' ? msg.key : '';
          if (!ALLOWED_STATUS_BAR_SETTING_KEYS.has(key)) break;
          await vscode.workspace.getConfiguration('claudeHub').update(
            key,
            msg.value,
            vscode.ConfigurationTarget.Global,
          );
          this.sendConfigUpdate();
          break;
        }

        case 'enableOutputSpeed':
          await vscode.commands.executeCommand('claudeHub.enableOutputSpeed');
          break;

        case 'refresh':
          await Promise.all([this.sessionManager.scanSessions(), this.sessionManager.refreshSubscription()]);
          this.sendSessionUpdate();
          this.sendExtensionsUpdate();
          break;

        case 'toggleFilter':
          this.sessionManager.toggleFilterMode();
          this.sendSessionUpdate();
          this.sendExtensionsUpdate();
          break;

        case 'setFilterMode':
          if (msg.mode === 'currentWorkspace' || msg.mode === 'all') {
            this.sessionManager.setFilterMode(msg.mode);
            this.sendSessionUpdate();
            this.sendExtensionsUpdate();
          }
          break;

        case 'openLog': {
          const session = this.sessionManager.focusedSession;
          if (session) {
            try {
              const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(session.sessionFile));
              await vscode.window.showTextDocument(doc);
            } catch (err) {
              vscode.window.showErrorMessage(`无法打开日志: ${err}`);
            }
          }
          break;
        }

        case 'requestConfig':
          this.sendConfigUpdate();
          break;

        case 'requestExtensions':
          this.sendExtensionsUpdate();
          break;

        case 'enableTaskIntegration':
        case 'disableTaskIntegration': {
          const folder = await this.pickWorkspace();
          if (!folder) break;
          try {
            if (msg.type === 'enableTaskIntegration') this.taskIntegration.enable(folder.uri.fsPath);
            else this.taskIntegration.disable(folder.uri.fsPath);
            this.sendConfigUpdate();
            vscode.window.showInformationMessage(t(msg.type === 'enableTaskIntegration' ? 'task.saved' : 'task.stopped'));
          } catch (error) { vscode.window.showErrorMessage(t('task.error', { err: String(error) })); }
          break;
        }

        case 'setTodoToolsEnv': {
          const enabled = msg.enabled === true;
          const folders = vscode.workspace.workspaceFolders || [];
          let folder: vscode.WorkspaceFolder | undefined;
          if (folders.length === 1) {
            folder = folders[0];
          } else if (folders.length > 1) {
            folder = await this.pickWorkspace();
          }
          if (!folder) {
            this.sendConfigUpdate();
            if (folders.length === 0) {
              vscode.window.showInformationMessage(t('task.noProject'));
            }
            break;
          }
          try {
            this.taskIntegration.setTodoToolsEnv(folder.uri.fsPath, enabled);
            await vscode.workspace.getConfiguration('claudeHub').update(
              'todoTools.enabled',
              enabled,
              vscode.ConfigurationTarget.Workspace,
            );
            this.sendConfigUpdate();
            vscode.window.showInformationMessage(
              t(enabled ? 'todoTools.enabledToast' : 'todoTools.disabledToast'),
            );
          } catch (error) {
            this.sendConfigUpdate();
            vscode.window.showErrorMessage(t('task.error', { err: String(error) }));
          }
          break;
        }

        case 'openSessionPlan': {
          const session = this.sessionManager.focusedSession;
          const file = session?.plan?.path;
          if (session && file && isAllowedPlanPath(this.sessionManager.claudeConfigDir, session.projectPath, file)) {
            await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(file)));
          }
          break;
        }

        case 'copyTaskSyncPrompt': {
          const session = this.sessionManager.focusedSession;
          if (!session) break;
          const items = session.plan?.items ?? session.todos;
          const names = items.map(item => `- ${item.content}`).join('\n');
          const lang = getCurrentLanguage() === 'zh-CN' ? 'zh-CN' as const : 'en' as const;
          const prompt = buildTaskSyncPrompt({
            policy: session.projectTodoPolicy,
            language: lang,
            itemLines: names,
            planPath: session.plan?.path,
          });
          await vscode.env.clipboard.writeText(prompt);
          vscode.window.showInformationMessage(t('task.copyDone'));
          break;
        }

        case 'selectTaskList': {
          const session = this.sessionManager.focusedSession;
          if (!session) break;
          const selected = await vscode.window.showQuickPick([
            { label: t('task.unlinkList'), description: t('task.autoList'), listId: undefined as string | undefined },
            ...this.sessionManager.availableTaskLists.map(listId => ({ label: listId, listId })),
          ], { placeHolder: t('task.selectList') });
          if (selected) await this.sessionManager.selectTaskList(session.sessionId, selected.listId);
          break;
        }

        case 'toggleMcp':
          if (msg.name !== undefined && msg.enabled !== undefined) {
            this.featuresManager.toggleMcpServer(msg.name, msg.enabled);
            this.sendExtensionsUpdate();
          }
          break;

        case 'togglePlugin':
          if (msg.id !== undefined && msg.enabled !== undefined) {
            this.featuresManager.togglePlugin(String(msg.id), Boolean(msg.enabled));
            this.sendExtensionsUpdate();
          }
          break;

        case 'openMemoryIndex': {
          const session = this.sessionManager.focusedSession;
          const mem = this.featuresManager.getProjectMemories(session?.projectPath, session?.sessionFile);
          try {
            const indexPath = this.featuresManager.ensureMemoryIndexFile(mem.memoryDir);
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(indexPath));
            await vscode.window.showTextDocument(doc);
          } catch (err) {
            vscode.window.showErrorMessage(`无法打开 MEMORY.md: ${err}`);
          }
          this.sendExtensionsUpdate();
          break;
        }

        case 'createMemoryEntry': {
          const session = this.sessionManager.focusedSession;
          const mem = this.featuresManager.getProjectMemories(session?.projectPath, session?.sessionFile);
          let chosenType: 'user' | 'feedback' | 'project' | 'reference' = 'project';
          let slugInput = typeof msg.slug === 'string' ? msg.slug.trim() : (typeof msg.name === 'string' ? msg.name.trim() : '');
          let descInput = typeof msg.description === 'string' ? msg.description.trim() : '';

          if (slugInput) {
            const rawType = typeof msg.memoryType === 'string' ? msg.memoryType.toLowerCase() : 'project';
            if (rawType === 'user' || rawType === 'feedback' || rawType === 'project' || rawType === 'reference') {
              chosenType = rawType;
            }
          } else {
            const typePick = await vscode.window.showQuickPick(
              [
                { label: 'project', description: '项目架构约束、进行中目标或非显而易见的约定' },
                { label: 'feedback', description: '开发协作纠偏、用户确认的工作方式（含 Why / How to apply）' },
                { label: 'user', description: '用户角色、技术偏好与沟通习惯' },
                { label: 'reference', description: '外部文档、看板、工单或服务地址索引' },
              ],
              { placeHolder: t('memory.typePrompt') }
            );
            if (!typePick) break;
            chosenType = typePick.label as 'user' | 'feedback' | 'project' | 'reference';
            const slug = await vscode.window.showInputBox({
              prompt: t('memory.slugPrompt'),
              placeHolder: 'project-convention',
            });
            if (!slug || !slug.trim()) break;
            slugInput = slug.trim();
            const description = await vscode.window.showInputBox({
              prompt: t('memory.descPrompt'),
              placeHolder: '简明扼要描述该条记忆的适用场景',
            });
            if (description === undefined) break;
            descInput = description.trim();
          }

          try {
            const filePath = this.featuresManager.createMemoryEntry(mem.memoryDir, {
              name: slugInput,
              description: descInput || slugInput,
              type: chosenType,
            });
            this.sendExtensionsUpdate();
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(t('memory.createdToast', { name: path.basename(filePath) }));
          } catch (err) {
            vscode.window.showErrorMessage(`创建记忆失败: ${err}`);
          }
          break;
        }

        case 'deleteMemoryEntry': {
          const targetPath = typeof msg.filePath === 'string' ? msg.filePath : '';
          if (!targetPath) break;
          const displayName = typeof msg.name === 'string' && msg.name.trim()
            ? msg.name.trim()
            : path.basename(targetPath, '.md');
          const confirmBtn = t('memory.deleteBtn');
          const choice = await vscode.window.showWarningMessage(
            t('memory.deleteConfirm', { name: displayName }),
            { modal: true },
            confirmBtn,
          );
          if (choice !== confirmBtn) break;
          const session = this.sessionManager.focusedSession;
          const mem = this.featuresManager.getProjectMemories(session?.projectPath, session?.sessionFile);
          if (this.featuresManager.deleteMemoryEntry(targetPath, mem.memoryDir)) {
            this.sendExtensionsUpdate();
            vscode.window.showInformationMessage(t('memory.deletedToast', { name: displayName }));
          } else {
            vscode.window.showErrorMessage(`移除记忆失败: ${displayName}`);
          }
          break;
        }

        case 'editMemoryEntry': {
          const targetPath = typeof msg.filePath === 'string' ? msg.filePath : '';
          if (!targetPath) break;
          const currentName = typeof msg.name === 'string' && msg.name.trim()
            ? msg.name.trim()
            : path.basename(targetPath, '.md');
          const currentDesc = typeof msg.description === 'string' ? msg.description : '';
          const currentType = typeof msg.memoryType === 'string' ? msg.memoryType : 'project';

          let finalType: 'user' | 'feedback' | 'project' | 'reference' = 'project';
          let finalDesc = currentDesc;

          if (msg.directSave === true) {
            const rawType = currentType.toLowerCase();
            if (rawType === 'user' || rawType === 'feedback' || rawType === 'project' || rawType === 'reference') {
              finalType = rawType;
            }
            finalDesc = currentDesc.trim() || currentName;
          } else {
            const typeOptions = [
              { label: 'project', description: '项目架构约束、进行中目标或非显而易见的约定' },
              { label: 'feedback', description: '开发协作纠偏、用户确认的工作方式（含 Why / How to apply）' },
              { label: 'user', description: '用户角色、技术偏好与沟通习惯' },
              { label: 'reference', description: '外部文档、看板、工单或服务地址索引' },
            ].sort((a, b) => (a.label === currentType ? -1 : b.label === currentType ? 1 : 0));

            const typePick = await vscode.window.showQuickPick(typeOptions, {
              placeHolder: `${t('memory.typePrompt')} (当前: ${currentType})`,
            });
            if (!typePick) break;
            finalType = typePick.label as 'user' | 'feedback' | 'project' | 'reference';

            const nextDesc = await vscode.window.showInputBox({
              prompt: t('memory.descPrompt'),
              value: currentDesc,
              placeHolder: '简明扼要描述该条记忆的适用场景',
            });
            if (nextDesc === undefined) break;
            finalDesc = nextDesc.trim() || currentName;
          }

          const session = this.sessionManager.focusedSession;
          const mem = this.featuresManager.getProjectMemories(session?.projectPath, session?.sessionFile);
          if (
            this.featuresManager.updateMemoryEntryMeta(
              targetPath,
              {
                name: currentName,
                description: finalDesc,
                type: finalType,
              },
              mem.memoryDir,
            )
          ) {
            this.sendExtensionsUpdate();
            vscode.window.showInformationMessage(t('memory.updatedToast', { name: currentName }));
          } else {
            vscode.window.showErrorMessage(`更新记忆失败: ${currentName}`);
          }
          break;
        }

        case 'syncMemoryIndex': {
          const session = this.sessionManager.focusedSession;
          const mem = this.featuresManager.getProjectMemories(session?.projectPath, session?.sessionFile);
          try {
            const res = this.featuresManager.syncMemoryIndex(mem.memoryDir);
            this.sendExtensionsUpdate();
            vscode.window.showInformationMessage(
              t('memory.syncedToast', { added: res.added, removed: res.removed }),
            );
          } catch (err) {
            vscode.window.showErrorMessage(`同步 MEMORY.md 索引失败: ${err}`);
          }
          break;
        }

        case 'startWorktreeSession':
          await vscode.commands.executeCommand('claudeHub.startWorktreeSession', msg.worktreeName);
          break;

        case 'openSkill':
          if (msg.filePath) {
            try {
              const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(msg.filePath));
              await vscode.window.showTextDocument(doc);
            } catch (err) {
              vscode.window.showErrorMessage(`无法打开文件: ${err}`);
            }
          }
          break;

        case 'focusSession':
          if (msg.sessionId) {
            this.sessionManager.setFocusedSession(msg.sessionId);
          }
          break;

        case 'forkSession':
          if (msg.sessionId) {
            await vscode.commands.executeCommand('claudeHub.forkSession', msg.sessionId);
          }
          break;

        case 'deleteSession':
          if (msg.sessionId) {
            await vscode.commands.executeCommand('claudeHub.deleteSession', msg.sessionId);
          }
          break;

        case 'clearTodos':
          await this.sessionManager.clearSessionTodos(msg.sessionId);
          this.sendSessionUpdate();
          break;

        case 'openSessionFile':
          if (msg.filePath) {
            try {
              const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(msg.filePath));
              await vscode.window.showTextDocument(doc);
            } catch (err) {
              vscode.window.showErrorMessage(`无法打开日志: ${err}`);
            }
          }
          break;

        case 'openSettingsJson':
          await this.configManager.openSettingsFile();
          break;

        case 'openClaudeMd':
        case 'openProjectDoc':
          await this.configManager.openProjectDocFile(msg.docType);
          this.sendConfigUpdate();
          break;

        case 'compareFork':
          await vscode.commands.executeCommand('claudeHub.compareFork', msg.sessionId);
          break;

        case 'editSessionTags':
          await vscode.commands.executeCommand('claudeHub.editSessionTags', msg.sessionId);
          break;

        case 'showTimeline':
          await vscode.commands.executeCommand('claudeHub.showTimeline', msg.sessionId);
          break;

        case 'togglePinSession':
          await vscode.commands.executeCommand('claudeHub.togglePinSession', msg.sessionId);
          break;

        case 'exportSession':
          await vscode.commands.executeCommand('claudeHub.exportSession', msg.sessionId);
          break;

        case 'workspaceCostReport':
          await vscode.commands.executeCommand('claudeHub.workspaceCostReport');
          break;

        case 'searchTranscript':
          await vscode.commands.executeCommand('claudeHub.searchTranscript');
          break;

        case 'openBackgroundTasks':
          await vscode.commands.executeCommand('claudeHub.openBackgroundTasks');
          break;

        case 'resumeSession':
          await vscode.commands.executeCommand('claudeHub.resumeSession', msg.sessionId);
          break;

        case 'renameSession':
          await vscode.commands.executeCommand('claudeHub.renameSession', msg.sessionId);
          break;

        case 'slashCommand':
          await vscode.commands.executeCommand('claudeHub.slashCommand');
          break;

        case 'openWorktree':
          await vscode.commands.executeCommand('claudeHub.openWorktree', msg.worktreePath);
          break;

        case 'newConversation': {
          try {
            await vscode.commands.executeCommand('claudeHub.newConversationHandoff');
          } catch {
            try {
              await vscode.commands.executeCommand('claude-vscode.editor.open');
            } catch {
              vscode.window.showInformationMessage(`已切换为 ${msg.model || '新模型'}，请在 Claude 对话窗口开始提问。`);
            }
          }
          break;
        }

        case 'copyText':
          if (msg.text) {
            await vscode.env.clipboard.writeText(msg.text);
          }
          break;
      }
    });
  }

  private buildUiStrings(): Record<string, string> {
    return {
      tbRefresh: t('tb.refresh'),
      tbRefreshShort: t('tb.refreshShort'),
      tbOpenTab: t('tb.openTab'),
      tbSlash: t('tb.slash'),
      tbSearch: t('tb.search'),
      tbCost: t('tb.cost'),
      tbTasks: t('tb.tasks'),
      tbWorktree: t('tb.worktree'),
      tbFilter: t('tb.filter'),
      tbFilterWs: t('tb.filterWs'),
      tbFilterAll: t('tb.filterAll'),
      tbFilterWsShort: t('tb.filterWsShort'),
      tbFilterAllShort: t('tb.filterAllShort'),
      tabMonitor: t('ui.tab.monitor'),
      tabSessions: t('ui.tab.sessions'),
      tabExtensions: t('ui.tab.extensions'),
      tabSettings: t('ui.tab.settings'),
      scopeWindow: t('ui.scope.window'),
      scopeAll: t('ui.scope.all'),
      todoToolsTitle: t('todoTools.title'),
      todoToolsToggle: t('todoTools.toggle'),
      todoToolsCaveat: t('todoTools.caveat'),
      todoToolsOn: t('todoTools.on'),
      todoToolsOff: t('todoTools.off'),
      todoToolsEffectiveOn: t('todoTools.effectiveOn'),
      todoToolsEffectiveOff: t('todoTools.effectiveOff'),
      todoToolsObserved: t('todoTools.observed'),
      todoToolsHooksNote: t('todoTools.hooksNote'),
      planNoChecklistWarn: t('task.planNoChecklistWarn'),
      chipPending: t('task.chipPending'),
      chipActive: t('task.chipActive'),
      chipDone: t('task.chipDone'),
      expand: t('task.expand'),
      collapse: t('task.collapse'),
      hubTodosTitle: t('task.hubTodosTitle'),
      hubTodosHint: t('task.hubTodosHint'),
      clearHideOnly: t('task.clearHideOnly'),
      pickList: t('task.pickList'),
      needsList: t('task.needsList'),
      creating: t('task.creating'),
      depends: t('task.depends'),
      blocks: t('task.blocks'),
      sourceNative: t('task.sourceNative'),
      sourceTasks: t('task.sourceTasks'),
      sourceTodoWrite: t('task.sourceTodoWrite'),
      sourcePlan: t('task.sourcePlan'),
      sourceMarkdown: t('task.sourceMarkdown'),
      sourceNone: t('task.sourceNone'),
      listId: t('task.listId'),
      optInHint: t('task.optInHint'),
      modeTask: t('task.modeTask'),
      modeChecklist: t('task.modeChecklist'),
      modeNone: t('task.modeNone'),
      checklistAlso: t('task.checklistAlso'),
      checklistHidden: t('task.checklistHidden'),
      speedLabel: t('speed.label'),
      speedHint: t('speed.hint'),
      speedEnable: t('speed.enable'),
      speedWaiting: t('speed.waiting'),
      speedLast: t('speed.last'),
      speedSampling: t('speed.sampling'),
      speedUnsupported: t('speed.unsupported'),
      speedTerminalEnabled: t('speed.terminalEnabled'),
      speedSourceTranscript: t('speed.sourceTranscript'),
      speedSourceStatusLine: t('speed.sourceStatusLine'),
      speedMeasuredAt: t('speed.measuredAt'),
    };
  }

  public sendSessionUpdate(): void {
    if (!this.hasAnyView()) return;
    const session = this.sessionManager.focusedSession;
    let cost = '< $0.001';
    if (session) {
      cost = ClaudeFeaturesManager.calculateCost(session.tokenUsage, session.model);
    }

    const gwMap = this.configManager.getGatewayModelMap();
    const modelLabelOf = (s: { isCurrentWorkspace: boolean; model: string; lastResponseModel?: string; effortLevel?: string }): string => {
      const active = this.configManager.getActiveModel(s.model || s.lastResponseModel);
      if (s.isCurrentWorkspace && active) {
        return formatSelectedModelName(active, gwMap, s.effortLevel);
      }
      return formatSelectedModelName(s.model, gwMap, s.effortLevel);
    };
    const pinnedSessionIds = getPinnedSessionIds(this.context);
    const allSessions = sortSessionsWithPins(this.sessionManager.allSessions, pinnedSessionIds).map((s) => ({
      pinned: pinnedSessionIds.includes(s.sessionId),
      tags: (getSessionTagMap(this.context)[s.sessionId] || []),
      sessionId: s.sessionId,
      projectName: s.projectName,
      sessionTitle: s.sessionTitle,
      model: modelLabelOf(s),
      rawModel: s.model,
      lastResponseModel: s.lastResponseModel ? formatModelDisplayName(s.lastResponseModel, gwMap) : undefined,
      tokenUsage: s.tokenUsage,
      outputSpeed: s.outputSpeed,
      outputSpeedState: s.outputSpeedState,
      outputSpeedIntegrationEnabled: s.outputSpeedIntegrationEnabled,
      lastUpdated: s.lastUpdated.getTime(),
      isIdle: s.isIdle,
      isCurrentWorkspace: s.isCurrentWorkspace,
      workspaceFolderName: s.workspaceFolderName,
      parentSessionId: s.parentSessionId,
      sessionFile: s.sessionFile,
      gitBranch: s.gitBranch,
      durationMs: s.durationMs,
      totalSpanMs: s.totalSpanMs,
      agentsCount: s.totalAgentsCount ?? (s.agents?.length || 0),
      subagentsTotalTokens: s.subagentsTotalTokens,
      loopState: s.loopState,
      backgroundJobs: (s.backgroundJobs || [])
        .filter((job) => job.status === 'running')
        .map((job) => ({
          id: job.id,
          kind: job.kind,
          label: job.label,
          status: job.status,
          startTime: job.startTime instanceof Date ? job.startTime.getTime() : job.startTime,
          outputFile: job.outputFile,
        })),
    }));

    const sessionPayload = session
      ? {
          ...session,
          modelDisplay: modelLabelOf(session),
          lastResponseModelDisplay: session.lastResponseModel
            ? formatModelDisplayName(session.lastResponseModel, gwMap)
            : undefined,
        }
      : null;

    this.postToViews({
      type: 'updateSession',
      session: sessionPayload,
      allSessions,
      focusedSessionId: session?.sessionId || null,
      filterMode: this.sessionManager.filterMode,
      sessionListPageSize: vscode.workspace.getConfiguration('claudeHub').get<number>('sessionListPageSize', 8),
      subscription: this.sessionManager.subscriptionUsage,
      subscriptionError: lastSubscriptionFetchError ? lastSubscriptionFetchError.message : undefined,
      pinnedSessionIds: getPinnedSessionIds(this.context),
      cost,
      ui: this.buildUiStrings(),
    });
  }

  public sendConfigUpdate(): void {
    if (!this.hasAnyView()) return;
    const cfg = vscode.workspace.getConfiguration('claudeHub');
    const statusBarConfig = {
      style: cfg.get<string>('statusBar.style', 'modern') === 'classic' ? 'classic' : 'modern',
      preset: cfg.get<string>('statusBar.preset', 'compact'),
      separator: cfg.get<string>('statusBar.separator', 'dot') === 'pipe' ? 'pipe' : 'dot',
      contextFormat: cfg.get<string>('statusBar.contextFormat', 'percent'),
      clickAction: cfg.get<string>('statusBar.clickAction', 'openDashboard'),
      hideWhenInactive: cfg.get<boolean>('statusBar.hideWhenInactive', true) !== false,
      showContext: cfg.get<boolean>('statusBar.showContext', true) !== false,
      showProgressBar: cfg.get<boolean>('statusBar.showProgressBar', false) === true,
      showSpeed: cfg.get<boolean>('statusBar.showSpeed', true) !== false,
      showModel: cfg.get<boolean>('statusBar.showModel', true) !== false,
      showCost: cfg.get<boolean>('statusBar.showCost', false) === true,
      showTools: cfg.get<boolean>('statusBar.showTools', true) !== false,
      showDuration: cfg.get<boolean>('statusBar.showDuration', false) === true,
      showTodos: cfg.get<boolean>('statusBar.showTodos', false) === true,
      showAgents: cfg.get<boolean>('statusBar.showAgents', false) === true,
      showGitBranch: cfg.get<boolean>('statusBar.showGitBranch', false) === true,
      tooltipSections: resolveTooltipSections(cfg),
    };

    this.postToViews({
      type: 'loadConfig',
      config: this.configManager.getClaudeSettings(),
      statusBarConfig,
      projectDocs: this.configManager.getProjectDocStatus(),
      todoToolsEnabledSetting: (() => {
        const desired = cfg.get<boolean>('todoTools.enabled', false) === true;
        const folders = vscode.workspace.workspaceFolders || [];
        let anyEnvOn = false;
        for (const folder of folders) {
          try {
            this.taskIntegration.reconcileWithSetting(folder.uri.fsPath, desired);
          } catch (error) {
            console.warn('[Claude Hub] todoTools reconcile failed:', error);
          }
          const st = this.taskIntegration.status(folder.uri.fsPath);
          if (st.envEnabled) anyEnvOn = true;
        }
        if (anyEnvOn && !desired) {
          void cfg.update('todoTools.enabled', true, vscode.ConfigurationTarget.Workspace);
          return true;
        }
        return desired;
      })(),
      taskIntegration: (vscode.workspace.workspaceFolders || []).map(folder => {
        const observed = this.sessionManager.allSessions.some(session =>
          session.taskToolsObserved && isPathInWorkspace(session.projectPath, [folder.uri.fsPath]));
        return this.taskIntegration.status(folder.uri.fsPath, observed);
      }),
      ui: this.buildUiStrings(),
    });
  }

  private async pickWorkspace(): Promise<vscode.WorkspaceFolder | undefined> {
    if (!vscode.workspace.isTrusted) {
      vscode.window.showErrorMessage(t('task.error', { err: 'Workspace trust is required.' }));
      return undefined;
    }
    const folders = vscode.workspace.workspaceFolders || [];
    if (folders.length === 0) { vscode.window.showInformationMessage(t('task.noProject')); return undefined; }
    if (folders.length === 1) return folders[0];
    return vscode.window.showWorkspaceFolderPick({ placeHolder: t('task.selectProject') });
  }

  public sendExtensionsUpdate(): void {
    if (!this.hasAnyView()) return;
    const session = this.sessionManager.focusedSession;
    this.postToViews({
      type: 'loadExtensions',
      mcpServers: this.featuresManager.getMcpServers(),
      plugins: this.featuresManager.getPlugins(),
      skills: this.featuresManager.getSkills(),
      customAgents: this.featuresManager.getCustomAgents(),
      projectMemory: this.featuresManager.getProjectMemories(session?.projectPath, session?.sessionFile),
    });
  }

  public dispose(): void {
    this._panel?.dispose();
    this._panel = undefined;
  }
}
