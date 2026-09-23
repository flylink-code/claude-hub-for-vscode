import * as vscode from 'vscode';
import { ClaudeConfigManager } from './claudeConfigManager.js';
import { ClaudeFeaturesManager } from './claudeFeatures.js';
import { formatModelDisplayName } from './contextLimit.js';
import { SessionManager } from './sessionManager.js';
import { getWebviewContent } from './webviewHtml.js';

export class ClaudeHubDashboardProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewType = 'claudeHub.dashboardView';
  private _view?: vscode.WebviewView;
  private timer: NodeJS.Timeout | null = null;
  private featuresManager: ClaudeFeaturesManager;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly sessionManager: SessionManager,
    private readonly configManager: ClaudeConfigManager,
  ) {
    this.featuresManager = new ClaudeFeaturesManager();

    sessionManager.onDidUpdateSessions(() => this.sendSessionUpdate());
    sessionManager.onDidUpdateSubscription(() => this.sendSessionUpdate());
    configManager.onDidChange(() => this.sendConfigUpdate());

    this.timer = setInterval(() => {
      const active = this.sessionManager.focusedSession;
      if (active && active.activeTools.length > 0 && this._view?.visible) {
        this.sendSessionUpdate();
      }
    }, 1000);
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
          await this.configManager.openClaudeMdFile();
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
      subscription: this.sessionManager.subscriptionUsage,
      cost,
    });
  }

  public sendConfigUpdate(): void {
    if (!this._view) return;
    this._view.webview.postMessage({
      type: 'loadConfig',
      config: this.configManager.getClaudeSettings(),
    });
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
    if (this.timer) clearInterval(this.timer);
  }
}
