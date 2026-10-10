import * as vscode from 'vscode';
import { ClaudeConfigManager } from './claudeConfigManager.js';
import { ClaudeHubDashboardProvider } from './dashboardView.js';
import { formatModelDisplayName } from './contextLimit.js';
import { t } from './i18n.js';
import { SessionManager } from './sessionManager.js';
import { SessionInfo } from './types.js';
import { TerminalManager } from './terminalManager.js';
import { TaskIntegrationManager } from './taskIntegration.js';
import * as path from 'path';
import { buildWorkspaceCostReport, formatWorkspaceCostMarkdown } from './workspaceCost.js';
import { searchSessions, searchTranscriptFile } from './transcriptSearch.js';
import { exportSessionMarkdown } from './sessionExport.js';
import { compareForkSessions, formatForkCompareMarkdown } from './forkCompare.js';
import { extractTimelineEvents, formatTimelineMarkdown } from './timelineEvents.js';
import { getSessionTags, setSessionTags, SUGGESTED_TAGS } from './sessionTags.js';
import { togglePin } from './sessionPins.js';

const SLASH_COMMANDS: Array<{ label: string; description: string; command: string }> = [
  { label: '/compact', description: 'Compact conversation context', command: '/compact' },
  { label: '/clear', description: 'Clear conversation', command: '/clear' },
  { label: '/cost', description: 'Show session cost', command: '/cost' },
  { label: '/model', description: 'Change model', command: '/model' },
  { label: '/memory', description: 'Open memory / CLAUDE.md', command: '/memory' },
  { label: '/tasks', description: 'Background tasks / jobs', command: '/tasks' },
  { label: '/help', description: 'Show Claude Code help', command: '/help' },
  { label: '/status', description: 'Show status', command: '/status' },
  { label: '/diff', description: 'Show diff', command: '/diff' },
  { label: '/config', description: 'Open config', command: '/config' },
];

async function pickSession(
  sessions: SessionInfo[],
  placeHolder: string,
): Promise<SessionInfo | undefined> {
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
  const picked = await vscode.window.showQuickPick(items, { placeHolder });
  return picked?.session;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  sessionManager: SessionManager,
  configManager: ClaudeConfigManager,
  dashboardProvider?: ClaudeHubDashboardProvider,
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
      const session = await pickSession(sessions, t('cmd.selectPrompt'));
      if (session) {
        sessionManager.setFocusedSession(session.sessionId);
        vscode.window.showInformationMessage(t('cmd.focusedOn', { name: session.projectName }));
      }
    }),

    vscode.commands.registerCommand('claudeHub.openSessionTranscript', async () => {
      const session = sessionManager.focusedSession;
      if (!session?.sessionFile) {
        vscode.window.showInformationMessage(t('cmd.noActiveOpen'));
        return;
      }
      try {
        const doc = await vscode.workspace.openTextDocument(session.sessionFile);
        await vscode.window.showTextDocument(doc, { preview: true });
      } catch (err) {
        vscode.window.showErrorMessage(t('cmd.openError', { err: String(err) }));
      }
    }),

    vscode.commands.registerCommand('claudeHub.openSettings', async () => {
      const settingsPath = configManager.getSettingsPath();
      try {
        const doc = await vscode.workspace.openTextDocument(settingsPath);
        await vscode.window.showTextDocument(doc, { preview: false });
      } catch (err) {
        vscode.window.showErrorMessage(String(err));
      }
    }),

    vscode.commands.registerCommand('claudeHub.forkSession', async (targetSessionId?: string) => {
      const sessionId =
        targetSessionId ||
        sessionManager.focusedSession?.sessionId ||
        (
          await pickSession(sessionManager.allSessions, t('cmd.selectPrompt'))
        )?.sessionId;
      if (!sessionId) return;

      const result = await sessionManager.forkSession(sessionId);
      if (!result) {
        vscode.window.showErrorMessage(t('cmd.forkFailed'));
        return;
      }
      const pick = await vscode.window.showInformationMessage(
        t('cmd.forked', { name: result.newSessionTitle }),
        t('cmd.resumeInTerminal'),
        t('cmd.focusOnly'),
      );
      if (pick === t('cmd.resumeInTerminal')) {
        const session = sessionManager.allSessions.find((s) => s.sessionId === result.newSessionId);
        TerminalManager.resumeSession(result.newSessionId, session?.projectPath, result.projectName);
      }
    }),

    vscode.commands.registerCommand('claudeHub.resumeSession', async (targetSessionId?: string) => {
      const session =
        (targetSessionId
          ? sessionManager.allSessions.find((s) => s.sessionId === targetSessionId)
          : null) ||
        sessionManager.focusedSession ||
        (await pickSession(sessionManager.allSessions, t('cmd.resumePrompt')));
      if (!session) {
        vscode.window.showInformationMessage(t('cmd.noSessions'));
        return;
      }
      TerminalManager.resumeSession(session.sessionId, session.projectPath, session.projectName);
      vscode.window.showInformationMessage(t('cmd.resumed', { name: session.sessionTitle || session.projectName }));
    }),

    vscode.commands.registerCommand('claudeHub.slashCommand', async () => {
      const session = sessionManager.focusedSession;
      const items = [
        ...SLASH_COMMANDS.map((c) => ({
          label: c.label,
          description: c.description,
          command: c.command,
        })),
        { label: t('cmd.slashCustom'), description: '', command: '__custom__' },
      ];
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: t('cmd.slashPrompt'),
      });
      if (!picked) return;
      let command = picked.command;
      if (command === '__custom__') {
        const custom = await vscode.window.showInputBox({
          prompt: t('cmd.slashCustomPrompt'),
          placeHolder: '/my-command',
        });
        if (!custom?.trim()) return;
        command = custom.trim();
      }
      TerminalManager.sendSlashCommand(command, session?.projectPath);
    }),

    vscode.commands.registerCommand('claudeHub.renameSession', async (targetSessionId?: string) => {
      const session =
        (targetSessionId
          ? sessionManager.allSessions.find((s) => s.sessionId === targetSessionId)
          : null) ||
        sessionManager.focusedSession ||
        (await pickSession(sessionManager.allSessions, t('cmd.renamePrompt')));
      if (!session) return;
      const next = await vscode.window.showInputBox({
        prompt: t('cmd.renameInput'),
        value: session.sessionTitle || '',
      });
      if (next === undefined) return;
      const ok = await sessionManager.renameSession(session.sessionId, next);
      vscode.window.showInformationMessage(
        ok ? t('cmd.renamed', { name: next.trim() }) : t('cmd.renameFailed'),
      );
    }),

    vscode.commands.registerCommand('claudeHub.deleteSession', async (targetSessionId?: string) => {
      const sessions = sessionManager.allSessions;
      if (sessions.length === 0) {
        vscode.window.showInformationMessage(t('cmd.noSessions'));
        return;
      }
      let sessionId = targetSessionId;
      if (!sessionId) {
        const session = await pickSession(sessions, t('cmd.deletePrompt'));
        sessionId = session?.sessionId;
      }
      if (!sessionId) return;
      const session = sessions.find((s) => s.sessionId === sessionId);
      const name = session?.sessionTitle || session?.projectName || sessionId;

      const mode = await vscode.window.showWarningMessage(
        t('cmd.deleteConfirm', { name }),
        { modal: true },
        t('cmd.deleteTrash'),
        t('cmd.deletePermanent'),
      );
      if (!mode) return;

      const permanent = mode === t('cmd.deletePermanent');
      const result = await sessionManager.deleteSession(sessionId, { permanent });
      if (!result.ok) {
        vscode.window.showErrorMessage(t('cmd.deleteFailed'));
        return;
      }
      if (permanent) {
        vscode.window.showInformationMessage(t('cmd.deleted', { name }));
        return;
      }
      const undo = await vscode.window.showInformationMessage(
        t('cmd.trashed', { name }),
        t('cmd.undoDelete'),
      );
      if (undo === t('cmd.undoDelete') && result.trashId) {
        const restored = await sessionManager.undoDeleteSession(result.trashId);
        vscode.window.showInformationMessage(
          restored ? t('cmd.restored', { name }) : t('cmd.restoreFailed'),
        );
      }
    }),

    vscode.commands.registerCommand('claudeHub.openWorktree', async (worktreePath?: string) => {
      const target = worktreePath?.trim();
      if (!target) {
        vscode.window.showInformationMessage(t('cmd.noWorktree'));
        return;
      }
      const uri = vscode.Uri.file(target);
      const pick = await vscode.window.showQuickPick(
        [
          { label: t('cmd.worktreeReveal'), action: 'reveal' },
          { label: t('cmd.worktreeOpenFolder'), action: 'open' },
          { label: t('cmd.worktreeTerminal'), action: 'terminal' },
        ],
        { placeHolder: target },
      );
      if (!pick) return;
      if (pick.action === 'reveal') {
        await vscode.commands.executeCommand('revealFileInOS', uri);
      } else if (pick.action === 'open') {
        await vscode.commands.executeCommand('vscode.openFolder', uri, true);
      } else {
        TerminalManager.openTerminalInPath(target);
      }
    }),

    vscode.commands.registerCommand('claudeHub.configureStatusBar', async () => {
      const currentConfig = vscode.workspace.getConfiguration('claudeHub');
      const presets = [
        { label: '$(dashboard) compact', description: 'Compact', preset: 'compact' },
        { label: '$(minify) minimal', description: 'Minimal', preset: 'minimal' },
        { label: '$(list-flat) detailed', description: 'Detailed', preset: 'detailed' },
        { label: '$(pulse) hud', description: 'HUD', preset: 'hud' },
        { label: '$(settings-gear) custom…', description: 'Open settings', preset: 'custom-open' },
      ];
      const picked = await vscode.window.showQuickPick(presets, {
        placeHolder: 'Claude Hub status bar style',
      });
      if (!picked) return;
      if (picked.preset === 'custom-open') {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'claudeHub.statusBar');
      } else {
        await currentConfig.update('statusBar.preset', picked.preset, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Status bar → ${picked.preset}`);
      }
    }),


    vscode.commands.registerCommand('claudeHub.workspaceCostReport', async () => {
      const scopePick = await vscode.window.showQuickPick(
        [
          { label: t('cmd.costScopeWs'), scope: 'workspace' as const },
          { label: t('cmd.costScopeAll'), scope: 'all' as const },
        ],
        { placeHolder: t('cmd.costPrompt') },
      );
      if (!scopePick) return;
      const sessions =
        scopePick.scope === 'workspace'
          ? sessionManager.getFilteredSessions().filter((s) => s.isCurrentWorkspace)
          : sessionManager.allSessions;
      const report = buildWorkspaceCostReport(
        scopePick.scope === 'workspace' ? sessionManager.allSessions.filter((s) => s.isCurrentWorkspace) : sessions,
        scopePick.scope,
      );
      const md = formatWorkspaceCostMarkdown(report);
      const doc = await vscode.workspace.openTextDocument({ content: md, language: 'markdown' });
      await vscode.window.showTextDocument(doc, { preview: true });
    }),

    vscode.commands.registerCommand('claudeHub.searchTranscript', async () => {
      const query = await vscode.window.showInputBox({
        prompt: t('cmd.searchPrompt'),
        placeHolder: 'tool name, path, phrase…',
      });
      if (!query?.trim()) return;
      const scope = await vscode.window.showQuickPick(
        [
          { label: t('cmd.searchFocused'), mode: 'focused' as const },
          { label: t('cmd.searchWorkspace'), mode: 'workspace' as const },
        ],
        { placeHolder: t('cmd.searchScope') },
      );
      if (!scope) return;
      let hits =
        scope.mode === 'focused'
          ? sessionManager.focusedSession
            ? searchTranscriptFile(sessionManager.focusedSession, query)
            : []
          : searchSessions(
              sessionManager.allSessions.filter((s) => s.isCurrentWorkspace),
              query,
            );
      if (hits.length === 0) {
        vscode.window.showInformationMessage(t('cmd.searchEmpty'));
        return;
      }
      const picked = await vscode.window.showQuickPick(
        hits.map((h) => ({
          label: `L${h.line} · ${h.kind}`,
          description: h.projectName,
          detail: h.snippet,
          hit: h,
        })),
        { placeHolder: t('cmd.searchResults', { n: hits.length }) },
      );
      if (!picked) return;
      const doc = await vscode.workspace.openTextDocument(picked.hit.sessionFile);
      const editor = await vscode.window.showTextDocument(doc, { preview: true });
      const line = Math.max(0, picked.hit.line - 1);
      const range = new vscode.Range(line, 0, line, 200);
      editor.selection = new vscode.Selection(range.start, range.end);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    }),

    vscode.commands.registerCommand('claudeHub.exportSession', async (targetSessionId?: string) => {
      const session =
        (targetSessionId
          ? sessionManager.allSessions.find((s) => s.sessionId === targetSessionId)
          : null) ||
        sessionManager.focusedSession ||
        (await pickSession(sessionManager.allSessions, t('cmd.exportPrompt')));
      if (!session) return;
      const md = exportSessionMarkdown(session);
      const doc = await vscode.workspace.openTextDocument({ content: md, language: 'markdown' });
      await vscode.window.showTextDocument(doc, { preview: true });
    }),

    vscode.commands.registerCommand('claudeHub.togglePinSession', async (targetSessionId?: string) => {
      const session =
        (targetSessionId
          ? sessionManager.allSessions.find((s) => s.sessionId === targetSessionId)
          : null) || sessionManager.focusedSession;
      if (!session) {
        vscode.window.showInformationMessage(t('cmd.noSessions'));
        return;
      }
      const pinned = await togglePin(context, session.sessionId);
      sessionManager.setFocusedSession(session.sessionId);
      vscode.window.showInformationMessage(
        pinned ? t('cmd.pinned', { name: session.sessionTitle || session.projectName }) : t('cmd.unpinned', { name: session.sessionTitle || session.projectName }),
      );
      // Force UI refresh
      await sessionManager.scanSessions();
    }),

    vscode.commands.registerCommand('claudeHub.openBackgroundTasks', async () => {
      const session = sessionManager.focusedSession;
      const bg = (session?.agents || []).filter((a) => (a as any).background || a.status === 'running');
      const items = [
        { label: t('cmd.tasksSendSlash'), action: 'slash' as const },
        ...bg.map((a) => ({
          label: `$(robot) ${a.name || a.type || a.id}`,
          description: a.status,
          detail: a.worktreePath || a.name || '',
          action: 'noop' as const,
        })),
      ];
      const pick = await vscode.window.showQuickPick(items, {
        placeHolder: t('cmd.tasksPrompt'),
      });
      if (!pick) return;
      if (pick.action === 'slash') {
        TerminalManager.sendSlashCommand('/tasks', session?.projectPath);
      }
    }),

    vscode.commands.registerCommand('claudeHub.newConversationHandoff', async () => {
      const ext = vscode.extensions.getExtension('Anthropic.claude-code')
        || vscode.extensions.getExtension('anthropic.claude-code')
        || vscode.extensions.getExtension('Claude.claude-vscode');
      try {
        await vscode.commands.executeCommand('claude-vscode.newConversation');
        return;
      } catch {
        /* try alternate */
      }
      try {
        await vscode.commands.executeCommand('claude.newConversation');
        return;
      } catch {
        /* fall through */
      }
      if (!ext) {
        const open = await vscode.window.showWarningMessage(
          t('cmd.ccMissing'),
          t('cmd.ccInstall'),
          t('cmd.resumeInTerminal'),
        );
        if (open === t('cmd.ccInstall')) {
          await vscode.commands.executeCommand('workbench.extensions.search', 'Claude Code');
        } else if (open === t('cmd.resumeInTerminal')) {
          await vscode.commands.executeCommand('claudeHub.resumeSession');
        }
        return;
      }
      await ext.activate();
      vscode.window.showInformationMessage(t('cmd.ccHandoffHint'));
    }),

    
    vscode.commands.registerCommand('claudeHub.compareFork', async (targetSessionId?: string) => {
      const child =
        (targetSessionId
          ? sessionManager.allSessions.find((s) => s.sessionId === targetSessionId)
          : null) ||
        sessionManager.focusedSession ||
        (await pickSession(
          sessionManager.allSessions.filter((s) => !!s.parentSessionId),
          t('cmd.comparePrompt'),
        ));
      if (!child) return;
      if (!child.parentSessionId) {
        vscode.window.showInformationMessage(t('cmd.compareNoParent'));
        return;
      }
      const parent = sessionManager.allSessions.find((s) => s.sessionId === child.parentSessionId);
      if (!parent) {
        vscode.window.showWarningMessage(t('cmd.compareParentMissing'));
        return;
      }
      const summary = compareForkSessions(parent, child);
      const md = formatForkCompareMarkdown(summary);
      const doc = await vscode.workspace.openTextDocument({ content: md, language: 'markdown' });
      await vscode.window.showTextDocument(doc, { preview: true });
    }),

    vscode.commands.registerCommand('claudeHub.editSessionTags', async (targetSessionId?: string) => {
      const session =
        (targetSessionId
          ? sessionManager.allSessions.find((s) => s.sessionId === targetSessionId)
          : null) ||
        sessionManager.focusedSession ||
        (await pickSession(sessionManager.allSessions, t('cmd.tagsPrompt')));
      if (!session) return;
      const current = getSessionTags(context, session.sessionId);
      const input = await vscode.window.showInputBox({
        prompt: t('cmd.tagsInput'),
        value: current.join(', '),
        placeHolder: SUGGESTED_TAGS.join(', '),
      });
      if (input === undefined) return;
      const tags = await setSessionTags(
        context,
        session.sessionId,
        input.split(/[,，]/).map((x) => x.trim()).filter(Boolean),
      );
      vscode.window.showInformationMessage(
        t('cmd.tagsUpdated', { tags: tags.length ? tags.join(', ') : '(none)' }),
      );
      await sessionManager.scanSessions();
    }),

    vscode.commands.registerCommand('claudeHub.showTimeline', async (targetSessionId?: string) => {
      const session =
        (targetSessionId
          ? sessionManager.allSessions.find((s) => s.sessionId === targetSessionId)
          : null) || sessionManager.focusedSession;
      if (!session) {
        vscode.window.showInformationMessage(t('cmd.noSessions'));
        return;
      }
      const events = extractTimelineEvents(session);
      if (!events.length) {
        vscode.window.showInformationMessage(t('cmd.timelineEmpty'));
      }
      const md = formatTimelineMarkdown(session, events);
      const doc = await vscode.workspace.openTextDocument({ content: md, language: 'markdown' });
      await vscode.window.showTextDocument(doc, { preview: true });
    }),

    
    vscode.commands.registerCommand('claudeHub.toggleTodoTools', async () => {
      const folders = vscode.workspace.workspaceFolders || [];
      if (folders.length === 0) {
        vscode.window.showInformationMessage(t('task.noProject'));
        return;
      }
      const folder =
        folders.length === 1
          ? folders[0]
          : await vscode.window.showWorkspaceFolderPick({ placeHolder: t('task.selectProject') });
      if (!folder) return;
      const mgr = new TaskIntegrationManager(
        context.globalStorageUri.fsPath,
        path.join(context.extensionPath, 'resources', 'task-bridge.cjs'),
        () => sessionManager.claudeConfigDir,
      );
      const st = mgr.status(folder.uri.fsPath);
      const next = !st.envEnabled;
      try {
        mgr.setTodoToolsEnv(folder.uri.fsPath, next);
        await vscode.workspace.getConfiguration('claudeHub').update(
          'todoTools.enabled',
          next,
          vscode.ConfigurationTarget.Workspace,
        );
        vscode.window.showInformationMessage(
          t(next ? 'todoTools.enabledToast' : 'todoTools.disabledToast'),
        );
        dashboardProvider?.sendConfigUpdate();
      } catch (error) {
        vscode.window.showErrorMessage(t('task.error', { err: String(error) }));
      }
    }),

        vscode.commands.registerCommand('claudeHub.openDashboard', async () => {
      if (dashboardProvider) {
        await dashboardProvider.show();
        return;
      }
      try {
        await vscode.commands.executeCommand('workbench.view.extension.claude-hub-container');
      } catch {
        /* fallback */
      }
      try {
        await vscode.commands.executeCommand('claudeHub.dashboardView.focus');
      } catch {
        /* fallback */
      }
    }),
  );
}
