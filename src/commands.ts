import * as vscode from 'vscode';
import { ClaudeConfigManager } from './claudeConfigManager.js';
import { formatModelDisplayName } from './contextLimit.js';
import { t } from './i18n.js';
import { SessionManager } from './sessionManager.js';
import { SessionInfo } from './types.js';

export function registerCommands(
  context: vscode.ExtensionContext,
  sessionManager: SessionManager,
  configManager: ClaudeConfigManager,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeHub.refresh', async () => {
      await Promise.all([sessionManager.scanSessions(), sessionManager.refreshSubscription()]);
      vscode.window.showInformationMessage(t('cmd.refreshed'));
    }),

    vscode.commands.registerCommand('claudeHub.toggleFilter', () => {
      const mode = sessionManager.toggleFilterMode();
      const msg = mode === 'currentWorkspace' ? t('cmd.filteredWs') : t('cmd.showingAll');
      vscode.window.showInformationMessage(msg);
    }),

    vscode.commands.registerCommand('claudeHub.switchSession', async () => {
      const sessions = sessionManager.allSessions;
      if (sessions.length === 0) {
        vscode.window.showInformationMessage(t('cmd.noSessions'));
        return;
      }

      interface SessionQuickPickItem extends vscode.QuickPickItem {
        session: SessionInfo;
      }

      const items: SessionQuickPickItem[] = sessions.map((s) => {
        const wsTag = s.isCurrentWorkspace ? t('cmd.tagWs') : t('cmd.tagOther');
        const model = formatModelDisplayName(s.model);
        const running = s.activeTools.length > 0 ? ` | 🔄 ${s.activeTools[0].name}` : '';
        const state = s.isIdle ? '💤' : '⚡';

        return {
          label: `${state} [${wsTag}] ${s.projectName} (${s.tokenUsage.percentage}%)`,
          description: `[${model}]${running} | ${s.sessionTitle || 'Untitled'}`,
          detail: s.sessionFile,
          session: s,
        };
      });

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: t('cmd.selectPrompt'),
      });

      if (picked) {
        sessionManager.setFocusedSession(picked.session.sessionId);
        vscode.window.showInformationMessage(t('cmd.focusedOn', { name: picked.session.projectName }));
      }
    }),

    vscode.commands.registerCommand('claudeHub.openSessionTranscript', async (item?: any) => {
      const session = item?.session || sessionManager.focusedSession;
      if (!session) {
        vscode.window.showWarningMessage(t('cmd.noActiveOpen'));
        return;
      }
      try {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(session.sessionFile));
        await vscode.window.showTextDocument(doc, { preview: true });
      } catch (err) {
        vscode.window.showErrorMessage(t('cmd.openError', { err: String(err) }));
      }
    }),

    vscode.commands.registerCommand('claudeHub.openSettings', async () => {
      await configManager.openSettingsFile();
    }),

    vscode.commands.registerCommand('claudeHub.forkSession', async (targetSessionId?: string) => {
      const sessionId = targetSessionId || sessionManager.focusedSession?.sessionId;
      if (!sessionId) {
        vscode.window.showWarningMessage('当前没有可分叉的会话。');
        return;
      }
      const result = await sessionManager.forkSession(sessionId);
      if (result) {
        const pick = await vscode.window.showInformationMessage(
          `已成功分叉会话！新会话 ID: ${result.newSessionId.slice(0, 8)}...`,
          '在终端启动 (claude --resume)',
          '打开日志文件',
        );
        if (pick === '在终端启动 (claude --resume)') {
          const terminal = vscode.window.createTerminal(`Claude (${result.projectName})`);
          terminal.show();
          terminal.sendText(`claude --resume ${result.newSessionId}`);
        } else if (pick === '打开日志文件') {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(result.filePath));
          await vscode.window.showTextDocument(doc);
        }
      } else {
        vscode.window.showErrorMessage('分叉会话失败，请检查文件读写权限。');
      }
    }),
  );
}
