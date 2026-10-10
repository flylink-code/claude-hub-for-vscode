import * as vscode from 'vscode';
import { ClaudeConfigManager } from './claudeConfigManager.js';
import { ClaudeFeaturesManager } from './claudeFeatures.js';
import { formatModelDisplayName } from './contextLimit.js';
import { SessionManager } from './sessionManager.js';
import { getWebviewContent } from './webviewHtml.js';
import { ClaudeConfigDirProvider, isPathInWorkspace } from './configDir.js';
import * as path from 'path';
import { TaskIntegrationManager } from './taskIntegration.js';
import { isAllowedPlanPath } from './nativeTasks.js';
import { t, getCurrentLanguage } from './i18n.js';

export class ClaudeHubDashboardProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewType = 'claudeHub.dashboardView';
  private _view?: vscode.WebviewView;
  private featuresManager: ClaudeFeaturesManager;
  private taskIntegration: TaskIntegrationManager;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly sessionManager: SessionManager,
    private readonly configManager: ClaudeConfigManager,
    configDirProvider?: ClaudeConfigDirProvider,
  ) {
    this.featuresManager = new ClaudeFeaturesManager(configDirProvider);
    this.taskIntegration = new TaskIntegrationManager(context.globalStorageUri.fsPath,
      path.join(context.extensionUri.fsPath, 'resources', 'task-bridge.cjs'),
      () => this.sessionManager.claudeConfigDir);

    context.subscriptions.push(sessionManager.onDidUpdateSessions(() => {
      this.sendSessionUpdate();
      this.sendConfigUpdate();
    }));
    sessionManager.onDidUpdateSubscription(() => this.sendSessionUpdate());
    configManager.onDidChange(() => this.sendConfigUpdate());
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

    webviewView.webview.html = getWebviewContent();

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'ready':
          this.sendSessionUpdate();
          this.sendConfigUpdate();
          this.sendExtensionsUpdate();
          break;

        case 'refresh':
          await Promise.all([this.sessionManager.scanSessions(), this.sessionManager.refreshSubscription()]);
          this.sendSessionUpdate();
          break;

        case 'toggleFilter':
          this.sessionManager.toggleFilterMode();
          this.sendSessionUpdate();
          break;

        case 'setFilterMode':
          if (msg.mode === 'currentWorkspace' || msg.mode === 'all') {
            this.sessionManager.setFilterMode(msg.mode);
            this.sendSessionUpdate();
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
          const prompt = getCurrentLanguage() === 'zh-CN'
            ? `请核对本会话执行计划各阶段的实际进度和验证结果，先检查已有任务，避免重复创建。可用 TaskCreate/TaskUpdate 时，记录真实的 pending、in_progress、completed；仅在验证后标记 completed。若任务工具不可用，请明确说明当前阶段和证据；若计划文件可编辑，可在核验后更新其中的 checklist 状态。不要仅凭 Agent 结束推断阶段完成。\n${session.plan?.path ? `计划：${session.plan.path}\n` : ''}${names}`
            : `Check actual progress and verification for each phase of this session's plan. Inspect existing tasks before creating new ones. If TaskCreate/TaskUpdate are available, record genuine pending, in_progress, and completed states; mark completed only after verification. Otherwise report the current phase and evidence, and update the plan checklist after verification if the plan file is editable. Do not infer phase completion from an Agent finishing.\n${session.plan?.path ? `Plan: ${session.plan.path}\n` : ''}${names}`;
          await vscode.env.clipboard.writeText(prompt);
          vscode.window.showInformationMessage(t('task.copyDone'));
          break;
        }

        case 'selectTaskList': {
          const session = this.sessionManager.focusedSession;
          if (!session) break;
          const selected = await vscode.window.showQuickPick([
            { label: t('task.autoList'), listId: undefined as string | undefined },
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

        case 'saveConfig': {
          const ok = await this.configManager.updateClaudeSettings({
            apiBaseUrl: msg.apiBaseUrl,
          });
          if (ok) {
            vscode.window.showInformationMessage('Claude Code 代理配置已保存！');
          } else {
            vscode.window.showErrorMessage('保存配置失败，请检查文件写入权限。');
          }
          break;
        }

        case 'openSettingsJson':
          await this.configManager.openSettingsFile();
          break;

        case 'openClaudeMd':
          await this.configManager.openProjectDocFile(msg.docType);
          this.sendConfigUpdate();
          break;

        case 'openProjectDoc':
          await this.configManager.openProjectDocFile(msg.docType);
          this.sendConfigUpdate();
          break;

        case 'newConversation': {
          try {
            await vscode.commands.executeCommand('claude-vscode.newConversation');
          } catch {
            try {
              await vscode.commands.executeCommand('claude-vscode.editor.open');
            } catch {
              vscode.window.showInformationMessage(`已切换为 ${msg.model || '新模型'}，请在 Claude 对话窗口开始提问。`);
            }
          }
          break;
        }

        case 'copyText': {
          if (msg.text) {
            await vscode.env.clipboard.writeText(msg.text);
          }
          break;
        }
      }
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.sendSessionUpdate();
      }
    });
  }

  public sendSessionUpdate(): void {
    if (!this._view) return;
    const session = this.sessionManager.focusedSession;
    let cost = '< $0.001';
    if (session) {
      cost = ClaudeFeaturesManager.calculateCost(session.tokenUsage, session.model);
    }

    const gwMap = this.configManager.getGatewayModelMap();
    const allSessions = this.sessionManager.allSessions.map((s) => ({
      sessionId: s.sessionId,
      projectName: s.projectName,
      sessionTitle: s.sessionTitle,
      model: formatModelDisplayName(s.model, gwMap),
      rawModel: s.model,
      lastResponseModel: s.lastResponseModel ? formatModelDisplayName(s.lastResponseModel, gwMap) : undefined,
      tokenUsage: s.tokenUsage,
      lastUpdated: s.lastUpdated.getTime(),
      isIdle: s.isIdle,
      isCurrentWorkspace: s.isCurrentWorkspace,
      sessionFile: s.sessionFile,
      gitBranch: s.gitBranch,
      agentsCount: s.totalAgentsCount ?? (s.agents?.length || 0),
      subagentsTotalTokens: s.subagentsTotalTokens,
    }));

    const sessionPayload = session
      ? {
          ...session,
          modelDisplay: formatModelDisplayName(session.model, gwMap),
          lastResponseModelDisplay: session.lastResponseModel
            ? formatModelDisplayName(session.lastResponseModel, gwMap)
            : undefined,
        }
      : null;

    this._view.webview.postMessage({
      type: 'updateSession',
      session: sessionPayload,
      allSessions,
      focusedSessionId: session?.sessionId || null,
      filterMode: this.sessionManager.filterMode,
      subscription: this.sessionManager.subscriptionUsage,
      cost,
    });
  }

  public sendConfigUpdate(): void {
    if (!this._view) return;
    this._view.webview.postMessage({
      type: 'loadConfig',
      config: this.configManager.getClaudeSettings(),
      projectDocs: this.configManager.getProjectDocStatus(),
      taskIntegration: (vscode.workspace.workspaceFolders || []).map(folder => {
        const observed = this.sessionManager.allSessions.some(session =>
          session.taskToolsObserved && isPathInWorkspace(session.projectPath, [folder.uri.fsPath]));
        return this.taskIntegration.status(folder.uri.fsPath, observed);
      }),
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
    if (!this._view) return;
    this._view.webview.postMessage({
      type: 'loadExtensions',
      mcpServers: this.featuresManager.getMcpServers(),
      skills: this.featuresManager.getSkills(),
    });
  }

  public dispose(): void {
    // Resources cleanup
  }
}
