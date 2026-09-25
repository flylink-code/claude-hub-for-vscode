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
import { parseTranscriptFile, generateForkTitle, rewriteTranscriptSessionIds } from './transcriptParser.js';
import { fetchSubscriptionUsage, readOAuthToken } from './subscriptionUsage.js';
import { FilterMode, SessionInfo, SubscriptionUsageData } from './types.js';
import { ClaudeConfigManager } from './claudeConfigManager.js';

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

  public async deleteSession(sessionId: string): Promise<boolean> {
    const session = this._sessions.find((s) => s.sessionId === sessionId);
    if (!session || !session.sessionFile) {
      return false;
    }

    try {
      // 1. Delete main transcript .jsonl file
      if (fs.existsSync(session.sessionFile)) {
        fs.unlinkSync(session.sessionFile);
      }

      // 2. Delete subagents folder if exists (e.g. <dir>/<sessionId>/)
      const dir = path.dirname(session.sessionFile);
      const subagentDir = path.join(dir, sessionId);
      if (fs.existsSync(subagentDir)) {
        try {
          fs.rmSync(subagentDir, { recursive: true, force: true });
        } catch (e) {
          console.warn('[Claude Hub] Could not remove subagent directory:', e);
        }
      }

      // 3. Delete session-env directory if exists
      const configDir = this.getConfigDir();
      const sessionEnvDir = path.join(configDir, 'session-env', sessionId);
      if (fs.existsSync(sessionEnvDir)) {
        try {
          fs.rmSync(sessionEnvDir, { recursive: true, force: true });
        } catch (e) {
          console.warn('[Claude Hub] Could not remove session-env directory:', e);
        }
      }

      // 4. Reset focused session if this was the focused one
      if (this._focusedSessionId === sessionId) {
        this._focusedSessionId = null;
      }

      // 5. Rescan sessions so UI and status bar update immediately
      await this.scanSessions();
      return true;
    } catch (err) {
      console.error('[Claude Hub] Failed to delete session:', err);
      return false;
    }
  }

  public get subscriptionUsage(): SubscriptionUsageData | null {
    return this._subscriptionUsage;
  }

  private getConfigDir(): string {
    if (this.configDirProvider) {
      return this.configDirProvider();
    }
    const custom = vscode.workspace.getConfiguration('claudeHub').get<string>('configDir', '');
    return resolveClaudeConfigDir(custom);
  }

  private initWatchers(): void {
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
        if (changedName && changedName.endsWith('.jsonl')) {
          this.scheduleScan();
        }
      });
    } catch (err) {
      console.warn('[Claude Hub] Failed to set up recursive watcher on projects dir:', err);
    }
  }

  private scheduleScan(): void {
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

    const enabled = vscode.workspace.getConfiguration('claudeHub').get<boolean>('fetchSubscriptionUsage', true);
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
    const enabled = vscode.workspace.getConfiguration('claudeHub').get<boolean>('fetchSubscriptionUsage', true);
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
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      const config = vscode.workspace.getConfiguration('claudeHub');
      const defaultLimit = config.get<number>('contextLimit', 200000);
      const modelLimits = config.get<Record<string, number>>('modelContextLimits', {});
      const idleTimeout = config.get<number>('idleTimeout', 180);

      const projectsDir = getClaudeProjectsDir(this.getConfigDir());
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
          const realProjectName = matchingWsFolder
            ? matchingWsFolder.name
            : parsed.cwd
            ? path.basename(parsed.cwd)
            : decoded.name;

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
          const agents = isIdle
            ? parsed.agents.map((a) =>
                a.status === 'running'
                  ? { ...a, status: 'completed' as const, endTime: a.endTime || fileStat.mtime }
                  : a,
              )
            : parsed.agents;

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
            agents,
            todos: parsed.todos,
            skills: parsed.skills,
            mcpServers: parsed.mcpServers,
            gitBranch: parsed.gitBranch,
            sessionCreated: parsed.sessionCreated,
            lastUpdated: fileStat.mtime,
            isIdle,
            isCurrentWorkspace,
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
      this._onDidUpdateSessions.fire(this.getFilteredSessions());
    } catch (err) {
      console.error('[Claude Hub] Error during scanSessions:', err);
    } finally {
      this.isScanning = false;
    }
  }

  public dispose(): void {
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
  }
}
