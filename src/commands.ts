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
        const titleInfo = result.newSessionTitle ? `「${result.newSessionTitle}」` : '';
        const pick = await vscode.window.showInformationMessage(
          `已成功分叉会话 ${titleInfo} (ID: ${result.newSessionId.slice(0, 8)})`,
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

    vscode.commands.registerCommand('claudeHub.deleteSession', async (targetSessionId?: string) => {
      let sessionId = targetSessionId;
      if (!sessionId) {
        const sessions = sessionManager.allSessions;
        if (sessions.length === 0) {
          vscode.window.showInformationMessage('当前没有可删除的会话。');
          return;
        }
        const items = sessions.map((s) => ({
          label: `${s.projectName} - ${s.sessionTitle || '未命名对话'}`,
          description: `[${s.sessionId.substring(0, 8)}] ${s.tokenUsage.percentage}% · ${formatModelDisplayName(s.model)}`,
          detail: s.sessionFile,
          sessionId: s.sessionId,
        }));
        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: '选择要永久删除的 Claude 会话',
        });
        if (!selected) return;
        sessionId = selected.sessionId;
      }

      const session = sessionManager.allSessions.find((s) => s.sessionId === sessionId);
      const title = session ? session.sessionTitle || '未命名对话' : sessionId.substring(0, 8);
      const proj = session ? session.projectName : '';
      const displayLabel = proj ? `${proj} - ${title}` : title;

      const confirm = await vscode.window.showWarningMessage(
        `确定要永久删除会话「${displayLabel}」及其日志文件吗？此操作无法撤销。`,
        { modal: true },
        '确认删除',
      );

      if (confirm === '确认删除') {
        const ok = await sessionManager.deleteSession(sessionId);
        if (ok) {
          vscode.window.showInformationMessage(`已成功删除会话: ${displayLabel}`);
        } else {
          vscode.window.showErrorMessage(`删除会话失败，请检查文件读写权限。`);
        }
      }
    }),

    vscode.commands.registerCommand('claudeHub.configureStatusBar', async () => {
      const currentConfig = vscode.workspace.getConfiguration('claudeHub');
      const currentPreset = currentConfig.get<string>('statusBar.preset', 'compact');

      const items = [
        {
          label: '$(sparkle) 紧凑模式 (Compact)' + (currentPreset === 'compact' ? ' ✓ 当前' : ''),
          description: '$(sparkle) 7% · Sonnet 3.7',
          detail: '均衡简洁：显示上下文百分比与模型名称，执行任务时显示工具与耗时',
          preset: 'compact',
        },
        {
          label: '$(zap) 极简模式 (Minimal)' + (currentPreset === 'minimal' ? ' ✓ 当前' : ''),
          description: '$(sparkle) 7%',
          detail: '极低占用：仅显示状态图标与上下文占用百分比，不占状态栏宽度',
          preset: 'minimal',
        },
        {
          label: '$(list-unordered) 详细模式 (Detailed)' + (currentPreset === 'detailed' ? ' ✓ 当前' : ''),
          description: '$(sparkle) ▰▰▱▱ 7% (14k/200k) · Sonnet 3.7 · $0.02 · 🌿 main',
          detail: '完整信息：包含微型进度条、绝对 Token/上限、模型、费用预估与 Git 分支',
          preset: 'detailed',
        },
        {
          label: '$(terminal) Claude HUD 风格 (HUD Style)' + (currentPreset === 'hud' ? ' ✓ 当前' : ''),
          description: '[Sonnet 3.7] ▰▰▱▱ 7% │ $0.02',
          detail: '经典终端风格：模仿 claude-hud 插件排版样式',
          preset: 'hud',
        },
        {
          label: '$(gear) 自定义微调 / 打开高级设置' + (currentPreset === 'custom' ? ' ✓ 当前' : ''),
          description: '细粒度控制进度条、Token 格式、费用、分支、待办及对齐位置',
          detail: '打开 VS Code 设置中心定位到 Claude Hub 状态栏配置',
          preset: 'custom',
        },
      ];

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: '选择 Claude Hub 底部状态栏显示风格',
      });

      if (!picked) return;

      if (picked.preset === 'custom') {
        await currentConfig.update('statusBar.preset', 'custom', vscode.ConfigurationTarget.Global);
        await vscode.commands.executeCommand('workbench.action.openSettings', 'claudeHub.statusBar');
      } else {
        await currentConfig.update('statusBar.preset', picked.preset, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`已切换状态栏风格为「${picked.label.split(' ')[1]}」`);
      }
    }),
  );
}
