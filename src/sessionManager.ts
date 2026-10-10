import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  ClaudeConfigDirProvider,
  decodeProjectPath,
  getClaudeProjectsDir,
  isPathInWorkspace,
  resolveClaudeConfigDir,
} from './configDir.js';
import { getContextLimitForModel } from './contextLimit.js';
import { setPricingOverrides, PricingOverrides } from './modelPricing.js';
import { parseTranscriptFile, generateForkTitle, rewriteTranscriptSessionIds, parseSubagentsDir, clearTranscriptCache, extractPlanTodos, extractMarkdownTodos } from './transcriptParser.js';
import { fetchSubscriptionUsage, readOAuthToken } from './subscriptionUsage.js';
import { AgentEntry, FilterMode, SessionInfo, SubscriptionUsageData, TaskSource, TodoItem, SessionPlan } from './types.js';
import { ClaudeConfigManager } from './claudeConfigManager.js';
import { NativeTaskReader, TaskDataWatcher, readTaskAssociation, writeTaskAssociation, resolveNativeListCandidate, isAllowedPlanPath, isSafeId, listTaskLists, taskSnapshot, mergeDiskPlanTodos } from './nativeTasks.js';
import { SessionAlertController } from './sessionAlerts.js';
import { readProjectTodoPolicy, projectTodoPolicyWatchPaths, resolvePreferSource, allowChecklistFill, todoModeFromSource } from './projectTodoPolicy.js';

export { generateForkTitle };

export class SessionManager implements vscode.Disposable {
  private _sessions: SessionInfo[] = [];
  private _focusedSessionId: string | null = null;
  private _subscriptionUsage: SubscriptionUsageData | null = null;
  private _filterMode: FilterMode = 'currentWorkspace';

  private _onDidUpdateSessions = new vscode.EventEmitter<SessionInfo[]>();
  public readonly onDidUpdateSessions = this._onDidUpdateSessions.event;

  private _onDidUpdateSubscription = new vscode.EventEmitter<SubscriptionUsageData | null>();
  public readonly onDidUpdateSubscription = this._onDidUpdateSubscription.event;

  private fileWatcher: fs.FSWatcher | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private subscriptionTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isScanning = false;
  private scanQueued = false;
  private disposed = false;
  private taskReader = new NativeTaskReader();
  private taskWatcher = new TaskDataWatcher(() => this.scheduleScan());
  private alertController = new SessionAlertController();

  constructor(
    private context: vscode.ExtensionContext,
    private configManager?: ClaudeConfigManager,
    private configDirProvider?: ClaudeConfigDirProvider,
  ) {
    const config = vscode.workspace.getConfiguration('claudeHub');
    this._filterMode = config.get<FilterMode>('filterMode', 'currentWorkspace');

    this.initWatchers();
    this.restartPeriodicScan();
    this.restartPeriodicSubscription();

    // Re-scan when configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('claudeHub')) {
          const cfg = vscode.workspace.getConfiguration('claudeHub');
          this._filterMode = cfg.get<FilterMode>('filterMode', 'currentWorkspace');
          this.configManager?.refreshWatchers();
          this.initWatchers();
          this.restartPeriodicScan();
          this.restartPeriodicSubscription();
          this.scanSessions();
          this.refreshSubscription();
        }
      }),
    );

    // Re-scan when Claude settings.json or gateway models change
    if (this.configManager) {
      context.subscriptions.push(
        this.configManager.onDidChange(() => {
          this.scheduleScan();
        }),
      );
    }

    // Re-scan when window gains focus
    context.subscriptions.push(
      vscode.window.onDidChangeWindowState((state) => {
        if (state.focused) {
          this.scanSessions();
        }
      }),
    );
  }

  public get filterMode(): FilterMode {
    return this._filterMode;
  }

  public setFilterMode(mode: FilterMode): void {
    this._filterMode = mode;
    vscode.workspace.getConfiguration('claudeHub').update('filterMode', mode, vscode.ConfigurationTarget.Global);
    this._onDidUpdateSessions.fire(this.getFilteredSessions());
  }

  public toggleFilterMode(): FilterMode {
    const nextMode = this._filterMode === 'currentWorkspace' ? 'all' : 'currentWorkspace';
    this.setFilterMode(nextMode);
    return nextMode;
  }

  public get allSessions(): SessionInfo[] {
    return this._sessions;
  }

  public getFilteredSessions(): SessionInfo[] {
    if (this._filterMode === 'currentWorkspace') {
      return this._sessions.filter((s) => s.isCurrentWorkspace);
    }
    return this._sessions;
  }

  public get focusedSession(): SessionInfo | null {
    const filtered = this.getFilteredSessions();
    if (this._focusedSessionId) {
      const found = filtered.find((s) => s.sessionId === this._focusedSessionId);
      if (found) return found;
    }
    return filtered[0] || (this._filterMode === 'currentWorkspace' ? null : this._sessions[0]) || null;
  }

  public setFocusedSession(sessionId: string): void {
    this._focusedSessionId = sessionId;
    this._onDidUpdateSessions.fire(this.getFilteredSessions());
  }

  public async forkSession(sessionId: string): Promise<{ newSessionId: string; filePath: string; projectName: string; newSessionTitle: string } | null> {
    const session = this._sessions.find((s) => s.sessionId === sessionId);
    if (!session || !session.sessionFile || !fs.existsSync(session.sessionFile)) {
      return null;
    }

    try {
      const newSessionId = crypto.randomUUID();
      const dir = path.dirname(session.sessionFile);
      const newFilePath = path.join(dir, `${newSessionId}.jsonl`);

      const content = fs.readFileSync(session.sessionFile, 'utf8');
      const resolvedDir = path.resolve(dir);
      const resolvedTarget = path.resolve(newFilePath);
      if (path.dirname(resolvedTarget) !== resolvedDir) {
        throw new Error('Fork target escaped the source session directory');
      }

      let forkedContent = rewriteTranscriptSessionIds(content, sessionId, newSessionId);

      const newTitle = generateForkTitle(session.sessionTitle);
      const titleEntry = JSON.stringify({
        type: 'custom-title',
        customTitle: newTitle,
        sessionId: newSessionId,
        timestamp: new Date().toISOString(),
      });

      if (!forkedContent.endsWith('\n')) {
        forkedContent += '\n';
      }
      forkedContent += titleEntry + '\n';

      fs.writeFileSync(newFilePath, forkedContent, 'utf8');

      // Rescan sessions so new session appears immediately
      await this.scanSessions();
      this.setFocusedSession(newSessionId);

      return {
        newSessionId,
        filePath: newFilePath,
        projectName: session.projectName,
        newSessionTitle: newTitle,
      };
    } catch (err) {
      console.error('[Claude Hub] Failed to fork session:', err);
      return null;
    }
  }

  public getTrashDir(): string {
    return path.join(this.getConfigDir(), '.hub-trash');
  }

  /** Soft-delete: move transcript (+ optional sidecars) into ~/.claude/.hub-trash for undo. */
  public async deleteSession(sessionId: string, options?: { permanent?: boolean }): Promise<{ ok: boolean; trashId?: string }> {
    const session = this._sessions.find((s) => s.sessionId === sessionId);
    if (!session || !session.sessionFile) {
      return { ok: false };
    }

    try {
      const permanent = options?.permanent === true;
      let trashId: string | undefined;

      if (!permanent) {
        const trashRoot = this.getTrashDir();
        fs.mkdirSync(trashRoot, { recursive: true });
        trashId = `${sessionId}-${Date.now()}`;
        const trashDir = path.join(trashRoot, trashId);
        fs.mkdirSync(trashDir, { recursive: true });

        const meta = {
          sessionId,
          originalFile: session.sessionFile,
          projectPath: session.projectPath,
          projectName: session.projectName,
          sessionTitle: session.sessionTitle,
          deletedAt: new Date().toISOString(),
        };
        fs.writeFileSync(path.join(trashDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

        if (fs.existsSync(session.sessionFile)) {
          const dest = path.join(trashDir, path.basename(session.sessionFile));
          fs.renameSync(session.sessionFile, dest);
        }
        clearTranscriptCache(session.sessionFile);

        const dir = path.dirname(session.sessionFile);
        const subagentDir = path.join(dir, sessionId);
        if (fs.existsSync(subagentDir)) {
          try {
            fs.renameSync(subagentDir, path.join(trashDir, 'subagents'));
          } catch (e) {
            console.warn('[Claude Hub] Could not move subagent directory:', e);
          }
        }

        const configDir = this.getConfigDir();
        const sessionEnvDir = path.join(configDir, 'session-env', sessionId);
        if (fs.existsSync(sessionEnvDir)) {
          try {
            fs.renameSync(sessionEnvDir, path.join(trashDir, 'session-env'));
          } catch (e) {
            console.warn('[Claude Hub] Could not move session-env directory:', e);
          }
        }
      } else {
        if (fs.existsSync(session.sessionFile)) {
          fs.unlinkSync(session.sessionFile);
        }
        clearTranscriptCache(session.sessionFile);

        const dir = path.dirname(session.sessionFile);
        const subagentDir = path.join(dir, sessionId);
        if (fs.existsSync(subagentDir)) {
          try {
            fs.rmSync(subagentDir, { recursive: true, force: true });
          } catch (e) {
            console.warn('[Claude Hub] Could not remove subagent directory:', e);
          }
        }

        const configDir = this.getConfigDir();
        const sessionEnvDir = path.join(configDir, 'session-env', sessionId);
        if (fs.existsSync(sessionEnvDir)) {
          try {
            fs.rmSync(sessionEnvDir, { recursive: true, force: true });
          } catch (e) {
            console.warn('[Claude Hub] Could not remove session-env directory:', e);
          }
        }
      }

      if (this._focusedSessionId === sessionId) {
        this._focusedSessionId = null;
      }

      await this.scanSessions();
      return { ok: true, trashId };
    } catch (err) {
      console.error('[Claude Hub] Failed to delete session:', err);
      return { ok: false };
    }
  }

  public async undoDeleteSession(trashId: string): Promise<boolean> {
    try {
      const trashDir = path.join(this.getTrashDir(), trashId);
      const metaPath = path.join(trashDir, 'meta.json');
      if (!fs.existsSync(metaPath)) return false;
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as {
        sessionId: string;
        originalFile: string;
      };
      const jsonlName = `${meta.sessionId}.jsonl`;
      const trashedFile = path.join(trashDir, jsonlName);
      if (!fs.existsSync(trashedFile)) return false;

      fs.mkdirSync(path.dirname(meta.originalFile), { recursive: true });
      if (fs.existsSync(meta.originalFile)) return false;
      fs.renameSync(trashedFile, meta.originalFile);

      const subSrc = path.join(trashDir, 'subagents');
      const subDest = path.join(path.dirname(meta.originalFile), meta.sessionId);
      if (fs.existsSync(subSrc) && !fs.existsSync(subDest)) {
        fs.renameSync(subSrc, subDest);
      }

      const envSrc = path.join(trashDir, 'session-env');
      const envDest = path.join(this.getConfigDir(), 'session-env', meta.sessionId);
      if (fs.existsSync(envSrc) && !fs.existsSync(envDest)) {
        fs.mkdirSync(path.dirname(envDest), { recursive: true });
        fs.renameSync(envSrc, envDest);
      }

      try {
        fs.rmSync(trashDir, { recursive: true, force: true });
      } catch {
        /* keep trash if cleanup fails */
      }

      await this.scanSessions();
      this.setFocusedSession(meta.sessionId);
      return true;
    } catch (err) {
      console.error('[Claude Hub] Failed to undo delete:', err);
      return false;
    }
  }

  public async renameSession(sessionId: string, newTitle: string): Promise<boolean> {
    const session = this._sessions.find((s) => s.sessionId === sessionId);
    if (!session || !session.sessionFile || !fs.existsSync(session.sessionFile)) {
      return false;
    }
    const title = (newTitle || '').trim();
    if (!title) return false;

    try {
      let prefix = '';
      try {
        const st = fs.statSync(session.sessionFile);
        if (st.size > 0) {
          const fd = fs.openSync(session.sessionFile, 'r');
          const buf = Buffer.alloc(1);
          fs.readSync(fd, buf, 0, 1, st.size - 1);
          fs.closeSync(fd);
          if (buf[0] !== 0x0a) prefix = '\n';
        }
      } catch { prefix = '\n'; }
      const entry = JSON.stringify({
        type: 'custom-title',
        customTitle: title,
        sessionId,
        timestamp: new Date().toISOString(),
      });
      fs.appendFileSync(session.sessionFile, prefix + entry + '\n', 'utf8');
      clearTranscriptCache(session.sessionFile);
      await this.scanSessions();
      return true;
    } catch (err) {
      console.error('[Claude Hub] Failed to rename session:', err);
      return false;
    }
  }

  public get subscriptionUsage(): SubscriptionUsageData | null {
    return this._subscriptionUsage;
  }

  public async clearSessionTodos(sessionId?: string): Promise<void> {
    const targetId = sessionId || this._focusedSessionId;
    if (!targetId) return;
    const session = this._sessions.find((s: SessionInfo) => s.sessionId === targetId);
    if (!session || session.todos.length === 0) return;
    const key = crypto.createHash('sha256').update(path.resolve(session.sessionFile)).digest('hex');
    const dismissed = { ...this.context.globalState.get<Record<string, string>>('dismissedTaskSnapshots', {}) };
    dismissed[key] = taskSnapshot(session.taskSource ?? 'none', session.taskListId ?? session.plan?.path, session.todos);
    await this.context.globalState.update('dismissedTaskSnapshots', dismissed);
    session.todos = [];
    this._onDidUpdateSessions.fire(this.getFilteredSessions());
    await this.scanSessions();
  }

  public get taskStorageDir(): string {
    return this.context.globalStorageUri.fsPath;
  }

  public get claudeConfigDir(): string { return this.getConfigDir(); }

  public get availableTaskLists(): string[] { return listTaskLists(this.getConfigDir()); }

  public async selectTaskList(sessionId: string, listId?: string): Promise<void> {
    if (!this._sessions.some(s => s.sessionId === sessionId)) throw new Error('Unknown session.');
    if (listId && (!isSafeId(listId) || !this.availableTaskLists.includes(listId))) throw new Error('Invalid task list.');
    const selections = { ...this.context.globalState.get<Record<string, string>>('taskListSelections', {}) };
    const key = `${path.resolve(this.getConfigDir())}:${sessionId}`;
    if (listId) selections[key] = listId;
    else delete selections[key];
    await this.context.globalState.update('taskListSelections', selections);
    await this.scanSessions();
  }

  private getConfigDir(): string {
    if (this.configDirProvider) {
      return this.configDirProvider();
    }
    const custom = vscode.workspace.getConfiguration('claudeHub').get<string>('configDir', '');
    return resolveClaudeConfigDir(custom);
  }

  private initWatchers(): void {
    this.taskReader.clear();
    this.taskWatcher.refresh(this.getConfigDir(), this.taskStorageDir, []);
    if (this.fileWatcher) {
      try {
        this.fileWatcher.close();
      } catch {
        // ignore
      }
      this.fileWatcher = null;
    }

    const projectsDir = getClaudeProjectsDir(this.getConfigDir());
    if (!fs.existsSync(projectsDir)) {
      return;
    }

    try {
      this.fileWatcher = fs.watch(projectsDir, { recursive: true }, (_event, filename) => {
        const changedName = filename == null ? undefined : String(filename);
        if (changedName && (changedName.endsWith('.jsonl') || changedName.endsWith('.meta.json'))) {
          this.scheduleScan();
        }
      });
    } catch (err) {
      console.warn('[Claude Hub] Failed to set up recursive watcher on projects dir:', err);
    }
  }

  private scheduleScan(): void {
    if (this.disposed) return;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.scanSessions();
    }, 400);
  }

  private restartPeriodicScan(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    const intervalSec = vscode.workspace.getConfiguration('claudeHub').get<number>('refreshInterval', 15);
    this.refreshTimer = setInterval(() => {
      this.scanSessions();
    }, Math.max(3, intervalSec) * 1000);
  }

  private restartPeriodicSubscription(): void {
    if (this.subscriptionTimer) {
      clearInterval(this.subscriptionTimer);
      this.subscriptionTimer = null;
    }

    const enabled = vscode.workspace.getConfiguration('claudeHub').get<boolean>('fetchSubscriptionUsage', false);
    if (!enabled) {
      void this.refreshSubscription();
      return;
    }

    const intervalSec = vscode.workspace.getConfiguration('claudeHub').get<number>('subscriptionRefreshInterval', 60);
    this.subscriptionTimer = setInterval(() => {
      void this.refreshSubscription();
    }, Math.max(30, intervalSec) * 1000);

    void this.refreshSubscription();
  }

  public async refreshSubscription(): Promise<void> {
    const enabled = vscode.workspace.getConfiguration('claudeHub').get<boolean>('fetchSubscriptionUsage', false);
    if (!enabled) {
      this._subscriptionUsage = null;
      this._onDidUpdateSubscription.fire(null);
      return;
    }

    try {
      const token = await readOAuthToken(this.getConfigDir());
      if (!token) {
        this._subscriptionUsage = null;
        this._onDidUpdateSubscription.fire(null);
        return;
      }
      const data = await fetchSubscriptionUsage(token);
      this._subscriptionUsage = data;
      this._onDidUpdateSubscription.fire(data);
    } catch (err) {
      console.warn('[Claude Hub] Failed to fetch subscription rate limits:', err);
    }
  }

  public async scanSessions(): Promise<void> {
    if (this.disposed) return;
    if (this.isScanning) { this.scanQueued = true; return; }
    this.isScanning = true;

    try {
      const config = vscode.workspace.getConfiguration('claudeHub');
      const defaultLimit = config.get<number>('contextLimit', 200000);
      const modelLimits = config.get<Record<string, number>>('modelContextLimits', {});
    const pricingRates = config.get<PricingOverrides['rates']>('modelPricing', {});
    const pricingAliases = config.get<PricingOverrides['aliases']>('modelAliases', {});
    setPricingOverrides({ rates: pricingRates || {}, aliases: pricingAliases || {} });
      const idleTimeout = config.get<number>('idleTimeout', 180);

      const projectsDir = getClaudeProjectsDir(this.getConfigDir());
      const watchMd = [
        ...this._sessions.map(s => s.plan?.path).filter((p): p is string => !!p),
        ...this._sessions.flatMap(s => projectTodoPolicyWatchPaths(s.projectPath)),
      ];
      this.taskWatcher.refresh(this.getConfigDir(), this.taskStorageDir, watchMd);
      if (!this.fileWatcher && fs.existsSync(projectsDir)) {
        this.initWatchers();
      }
      if (!fs.existsSync(projectsDir)) {
        this._sessions = [];
        this._onDidUpdateSessions.fire([]);
        return;
      }

      const configuredModel = this.configManager?.getConfiguredModel();
      const workspaceFolders = (vscode.workspace.workspaceFolders || []).map((f) => f.uri.fsPath);
      const projectDirs = fs.readdirSync(projectsDir);
      const discoveredSessions: SessionInfo[] = [];
      const dismissed = { ...this.context.globalState.get<Record<string, string>>('dismissedTaskSnapshots', {}) };
      let dismissedChanged = false;
      const cutoffTime = idleTimeout > 0 ? Date.now() - idleTimeout * 1000 : 0;

      for (const pDir of projectDirs) {
        if (pDir.includes('claude-plugins') || pDir.includes('claude-mem')) {
          continue;
        }
        const fullDirPath = path.join(projectsDir, pDir);
        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullDirPath);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }

        let jsonlFiles: string[];
        try {
          jsonlFiles = fs
            .readdirSync(fullDirPath)
            .filter((f) => f.endsWith('.jsonl') && !f.startsWith('agent-'));
        } catch {
          continue;
        }

        const decoded = decodeProjectPath(pDir);

        for (const file of jsonlFiles) {
          const filePath = path.join(fullDirPath, file);
          let fileStat: fs.Stats;
          try {
            fileStat = fs.statSync(filePath);
          } catch {
            continue;
          }

          // Check if session is idle
          const isIdle = idleTimeout > 0 && fileStat.mtime.getTime() < cutoffTime;

          const parsed = await parseTranscriptFile(filePath);
          const sessionId = parsed.sessionId || file.replace('.jsonl', '').substring(0, 8);
          const projectPath = parsed.cwd || decoded.fullPath;
          const association = readTaskAssociation(this.taskStorageDir, sessionId, projectPath);
          const selections = this.context.globalState.get<Record<string, string>>('taskListSelections', {});
          const selectedList = selections[`${path.resolve(this.getConfigDir())}:${sessionId}`];
          const configDir = this.getConfigDir();
          const projectTodoPolicy = readProjectTodoPolicy(projectPath);
          let preferSetting = 'auto';
          try {
            preferSetting = vscode.workspace.getConfiguration('claudeHub').get<string>('todo.preferSource', 'auto') || 'auto';
          } catch { /* tests without vscode */ }
          const preferSource = resolvePreferSource(projectTodoPolicy, preferSetting);
          const checklistFillOk = allowChecklistFill(preferSource, projectTodoPolicy);
          const listExists = (listId: string) => {
            const snap = this.taskReader.read(configDir, listId);
            return snap.exists;
          };
          const observedList = parsed.observedTaskListId;
          const picked = resolveNativeListCandidate({
            selectedList,
            associationListId: association?.taskListId || observedList,
            sessionId,
            listExists,
          });
          let todos = parsed.todos;
          let taskSource = parsed.taskSource ?? 'none';
          // Force tasks-only: drop assistant-markdown fill. Dual/auto keeps checklist when present.
          if (preferSource === 'tasks' && taskSource === 'markdown') {
            todos = [];
            taskSource = 'none';
          }
          let taskListId: string | undefined;
          let taskListNeedsSelection = false;
          let plan = parsed.plan;
          const parsedSource = parsed.taskSource ?? 'none';
          let checklistAvailable =
            parsedSource === 'plan' ||
            parsedSource === 'markdown' ||
            Boolean(plan?.isChecklist) ||
            ((plan?.items?.length || 0) > 0);
          const planPath = plan?.path || (!parsed.hadClearCommand ? association?.planPath : undefined);
          if (!parsed.wasCleared && planPath && isAllowedPlanPath(configDir, projectPath, planPath)) {
            try {
              const text = fs.readFileSync(planPath, 'utf8');
              const diskPlan = {
                path: planPath,
                items: extractPlanTodos(text),
                isChecklist: extractMarkdownTodos(text).length > 0,
              };
              if (diskPlan.isChecklist || diskPlan.items.length > 0) {
                checklistAvailable = true;
              }
              if (diskPlan.isChecklist && !checklistFillOk) {
                // tasks-only: keep plan path, do not fill todos from checklist
                plan = { path: planPath, items: [], isChecklist: true };
              } else {
                const hadTaskPrimary = taskSource === 'native' || taskSource === 'tasks' || taskSource === 'todoWrite';
                const merged = mergeDiskPlanTodos(taskSource, todos, diskPlan);
                if (hadTaskPrimary) {
                  // Task stays primary; checklist still noted via checklistAvailable
                  plan = merged.plan;
                } else {
                  todos = merged.todos;
                  taskSource = merged.taskSource;
                  plan = merged.plan;
                }
              }
            } catch { /* 文件暂时不可读时保留 transcript 快照 */ }
          }
          if (!parsed.wasCleared && (!parsed.hadClearCommand || parsed.taskToolsObserved) && picked.listId) {
            const native = this.taskReader.read(configDir, picked.listId);
            if (native.exists && native.valid) {
              if (taskSource === 'plan' || taskSource === 'markdown' || (plan && (plan.isChecklist || (plan.items && plan.items.length)))) {
                checklistAvailable = true;
              }
              todos = native.items;
              taskSource = 'native';
              taskListId = picked.listId;
              writeTaskAssociation(this.taskStorageDir, {
                sessionId,
                projectPath,
                taskListId: picked.listId,
                planPath: plan?.path || association?.planPath,
                taskObservedAt: Date.now(),
              });
            }
          }
          if (
            !parsed.wasCleared &&
            parsed.taskToolsObserved &&
            !taskListId &&
            listTaskLists(configDir).length > 0 &&
            (taskSource === 'tasks' || taskSource === 'none')
          ) {
            taskListNeedsSelection = true;
          }
          const todoMode = todoModeFromSource(taskSource);
          // If Task primary and checklist exists under dual mode, keep checklistAvailable true
          if (todoMode === 'task' && (plan?.isChecklist || (plan?.items && plan.items.length > 0))) {
            checklistAvailable = true;
          }
          if (todoMode === 'checklist') {
            checklistAvailable = true;
          }
          const checklistFillAllowed = checklistFillOk;
          const dismissKey = crypto.createHash('sha256').update(path.resolve(filePath)).digest('hex');
          if (dismissed[dismissKey]) {
            const current = taskSnapshot(taskSource, taskListId ?? plan?.path, todos);
            if (dismissed[dismissKey] === current) {
              todos = [];
            } else {
              delete dismissed[dismissKey];
              dismissedChanged = true;
            }
          }
          const isCurrentWorkspace = isPathInWorkspace(projectPath, workspaceFolders);

          // For current workspace sessions, prioritize currently configured model from settings
          // (e.g. user just switched provider or model in dropdown before sending a prompt).
          // Retain lastResponseModel for physical routing transparency.
          const effectiveModel =
            (isCurrentWorkspace && configuredModel) ? configuredModel : (parsed.model || configuredModel || '');
          const lastResponseModel =
            parsed.lastResponseModel || (parsed.model && parsed.model !== effectiveModel ? parsed.model : undefined);

          const contextLimit = getContextLimitForModel(effectiveModel, defaultLimit, modelLimits);

          const totalTokens = parsed.tokenUsage.totalTokens;
          const percentage = contextLimit > 0 ? Math.round((totalTokens / contextLimit) * 100) : 0;
          parsed.tokenUsage.percentage = percentage;

          const matchingWsFolder = (vscode.workspace.workspaceFolders || []).find((wf) =>
            isPathInWorkspace(projectPath, [wf.uri.fsPath]),
          );
          const workspaceFolderName = matchingWsFolder?.name;
          const rawProjectName = matchingWsFolder
            ? matchingWsFolder.name
            : parsed.cwd
            ? path.basename(parsed.cwd)
            : decoded.name;
          const realProjectName = /^(claude[-_]hub([-_]for)?[-_]vscode|claude[-_]hub)$/i.test(rawProjectName)
            ? 'Claude Hub'
            : rawProjectName;

          // If session is idle, ensure activeTools is cleared and reconcile lingering running tools/agents
          const activeTools = isIdle ? [] : parsed.activeTools;
          const tools = isIdle
            ? parsed.tools.map((t) =>
                t.status === 'running'
                  ? {
                      ...t,
                      status: 'completed' as const,
                      endTime: t.endTime || fileStat.mtime,
                      durationMs:
                        t.durationMs ??
                        Math.max(0, (t.endTime || fileStat.mtime).getTime() - t.startTime.getTime()),
                    }
                  : t,
              )
            : parsed.tools;
          // Discover and parse subagents from <sessionDir>/<sessionId>/subagents
          const rawSessionId = file.replace('.jsonl', '');
          const subagentsDir = path.join(fullDirPath, rawSessionId, 'subagents');
          let subagents: AgentEntry[] = [];
          if (fs.existsSync(subagentsDir)) {
            try {
              subagents = await parseSubagentsDir(subagentsDir, isIdle);
            } catch (err) {
              console.warn('[Claude Hub] Failed to parse subagents for session:', sessionId, err);
            }
          }

          // Merge subagents with parsed.agents from the main transcript with robust deduplication
          const mergedAgents: AgentEntry[] = [...subagents];
          for (const mainAgent of parsed.agents) {
            const alreadyExists = mergedAgents.some((a) => {
              // 1. Strict ID / ToolUseId matching
              if (a.id === mainAgent.id) return true;
              if (a.toolUseId && mainAgent.toolUseId && a.toolUseId === mainAgent.toolUseId) return true;
              if (a.toolUseId && a.toolUseId === mainAgent.id) return true;
              if (mainAgent.toolUseId && a.id === mainAgent.toolUseId) return true;
              if (mainAgent.id && a.id && (a.id.startsWith(mainAgent.id) || mainAgent.id.startsWith(a.id))) return true;

              // 2. Conflict safeguard: If both have explicit different toolUseIds, do not merge
              if (a.toolUseId && mainAgent.toolUseId && a.toolUseId !== mainAgent.toolUseId) {
                return false;
              }

              // 3. Fallback fuzzy match: only if at least one lacks toolUseId and timestamps are tightly aligned (within 10s)
              const descMatch =
                Boolean(a.description) &&
                a.description === mainAgent.description &&
                a.type === mainAgent.type &&
                a.startTime &&
                mainAgent.startTime &&
                Math.abs(a.startTime.getTime() - mainAgent.startTime.getTime()) < 10000;

              return Boolean(descMatch);
            });
            if (!alreadyExists) {
              mergedAgents.push(
                isIdle && mainAgent.status === 'running'
                  ? { ...mainAgent, status: 'completed' as const, endTime: mainAgent.endTime || fileStat.mtime }
                  : mainAgent,
              );
            }
          }

          const allAgents = isIdle
            ? mergedAgents.map((a) =>
                a.status === 'running'
                  ? { ...a, status: 'completed' as const, endTime: a.endTime || fileStat.mtime }
                  : a,
              )
            : mergedAgents;

          const totalAgentsCount = allAgents.length;
          const subagentsTotalTokens = allAgents.reduce((sum, a) => sum + (a.totalTokens || 0), 0);

          // Determine active/current-turn agents for live monitoring
          let activeAgents: AgentEntry[] = allAgents;
          if (parsed.wasCleared) {
            activeAgents = [];
          } else if (allAgents.length > 0 && parsed.currentTurnStartTime) {
            const turnStartMs = parsed.currentTurnStartTime.getTime();
            activeAgents = allAgents.filter((a) => {
              if (a.status === 'running') {
                return true;
              }
              const agentEndMs = a.endTime
                ? a.endTime.getTime()
                : a.startTime
                ? a.startTime.getTime()
                : 0;
              // If agent finished or started during or after current turn, keep it; otherwise it belongs to previous turn
              return agentEndMs >= turnStartMs;
            });
          }

          const sessionCreated =
            parsed.sessionCreated && !isNaN(parsed.sessionCreated.getTime())
              ? parsed.sessionCreated
              : fileStat.birthtime && fileStat.birthtime.getTime() > 0
              ? fileStat.birthtime
              : fileStat.mtime;

          // Calculate active interaction duration (filters idle gaps > 5min)
          let activeDurationMs = parsed.activeDurationMs || 0;
          if (!isIdle && parsed.lastEntryTimestamp) {
            const recentDiff = Date.now() - parsed.lastEntryTimestamp;
            if (recentDiff > 0 && recentDiff <= 300_000) {
              activeDurationMs += recentDiff;
            }
          }

          const totalSpanMs = Math.max(
            0,
            (isIdle ? fileStat.mtime.getTime() : Date.now()) - sessionCreated.getTime(),
          );

          discoveredSessions.push({
            sessionId,
            sessionFile: filePath,
            projectName: realProjectName,
            projectPath,
            sessionTitle: parsed.sessionTitle || '',
            model: effectiveModel,
            lastResponseModel,
            configuredModel: isCurrentWorkspace ? configuredModel : undefined,
            contextLimit,
            tokenUsage: parsed.tokenUsage,
            tools,
            activeTools,
            agents: activeAgents,
            totalAgentsCount: totalAgentsCount > 0 ? totalAgentsCount : undefined,
            subagentsTotalTokens: subagentsTotalTokens > 0 ? subagentsTotalTokens : undefined,
            todos,
            plan,
            taskSource,
            taskListId,
            todoMode,
            preferSource,
            checklistAvailable,
            checklistFillAllowed,
            pendingTaskCreates: parsed.pendingTaskCreates,
            taskListNeedsSelection,
            lastActivity: parsed.lastActivity,
            taskToolsObserved: parsed.taskToolsObserved || taskSource === 'native',
            projectTodoPolicy,
            skills: parsed.skills,
            mcpServers: parsed.mcpServers,
            gitBranch: parsed.gitBranch,
            sessionCreated,
            lastUpdated: fileStat.mtime,
            durationMs: activeDurationMs,
            totalSpanMs,
            currentTurnStartTime: parsed.currentTurnStartTime,
            isIdle,
            isCurrentWorkspace,
            workspaceFolderName,
            parentSessionId: parsed.parentSessionId,
            wasCleared: parsed.wasCleared,
            cwd: parsed.cwd,
          });
        }
      }

      // Sort: current workspace first, then non-idle, then most recently updated
      discoveredSessions.sort((a, b) => {
        if (a.isCurrentWorkspace !== b.isCurrentWorkspace) {
          return a.isCurrentWorkspace ? -1 : 1;
        }
        if (a.isIdle !== b.isIdle) {
          return a.isIdle ? 1 : -1;
        }
        return b.lastUpdated.getTime() - a.lastUpdated.getTime();
      });

      this._sessions = discoveredSessions;
      if (dismissedChanged) await this.context.globalState.update('dismissedTaskSnapshots', dismissed);
      const discoveredWatchMd = [
        ...discoveredSessions.map(s => s.plan?.path).filter((p): p is string => !!p),
        ...discoveredSessions.flatMap(s => projectTodoPolicyWatchPaths(s.projectPath)),
      ];
      this.taskWatcher.refresh(this.getConfigDir(), this.taskStorageDir, discoveredWatchMd);
      this.alertController.evaluate(this._sessions);
      this._onDidUpdateSessions.fire(this.getFilteredSessions());
    } catch (err) {
      console.error('[Claude Hub] Error during scanSessions:', err);
    } finally {
      this.isScanning = false;
      if (this.scanQueued) { this.scanQueued = false; this.scheduleScan(); }
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.taskWatcher.dispose();
    this.taskReader.clear();
    if (this.fileWatcher) {
      try {
        this.fileWatcher.close();
      } catch {
        // ignore
      }
      this.fileWatcher = null;
    }
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.subscriptionTimer) clearInterval(this.subscriptionTimer);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.refreshTimer = null;
    this.subscriptionTimer = null;
    this.debounceTimer = null;
    this._onDidUpdateSessions.dispose();
    this._onDidUpdateSubscription.dispose();
    clearTranscriptCache();
  }
}
