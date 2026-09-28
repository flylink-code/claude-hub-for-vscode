import * as vscode from 'vscode';
import { ClaudeConfigManager } from './claudeConfigManager.js';
import { ClaudeFeaturesManager } from './claudeFeatures.js';
import { formatModelDisplayName } from './contextLimit.js';
import { t } from './i18n.js';
import { SessionManager } from './sessionManager.js';
import {
  ConfigGetter,
  formatDuration,
  formatK,
  formatProgressBar,
  formatStatusBarText,
  resolveRenderOptions,
  StatusBarContextFormat,
  StatusBarFormatInput,
  StatusBarPosition,
  StatusBarPreset,
  StatusBarRenderOptions,
} from './statusBarFormatter.js';
import { SessionInfo, SubscriptionUsageData } from './types.js';

export {
  ConfigGetter,
  formatDuration,
  formatK,
  formatProgressBar,
  formatStatusBarText,
  resolveRenderOptions,
  StatusBarContextFormat,
  StatusBarFormatInput,
  StatusBarPosition,
  StatusBarPreset,
  StatusBarRenderOptions,
};

export class StatusBarController implements vscode.Disposable {
  private item!: vscode.StatusBarItem;
  private currentPosition: StatusBarPosition = 'right';
  private timer: NodeJS.Timeout | null = null;
  private disposables: vscode.Disposable[] = [];
  private lastTooltipString: string = '';
  private lastSemanticFingerprint: string = '';
  private isItemVisible: boolean = false;
  private lastBgColorId: string | undefined = undefined;

  constructor(
    private sessionManager: SessionManager,
    private configManager?: ClaudeConfigManager,
  ) {
    this.createItem();

    sessionManager.onDidUpdateSessions(() => this.update());
    sessionManager.onDidUpdateSubscription(() => this.update());
    if (configManager) {
      configManager.onDidChange(() => this.update());
    }

    const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('claudeHub')) {
        this.checkPositionAndRecreate();
        this.update();
      }
    });
    this.disposables.push(configListener);

    // Real-time ticking every second when session is actively running
    this.timer = setInterval(() => {
      const active = this.sessionManager.focusedSession;
      if (active && !active.isIdle) {
        this.updateRunningState();
      }
    }, 1000);

    this.update();
  }

  private createItem(): void {
    const config = vscode.workspace.getConfiguration('claudeHub');
    const pos = config.get<StatusBarPosition>('statusBar.position', 'right');
    this.currentPosition = pos;

    const alignment =
      pos === 'left' ? vscode.StatusBarAlignment.Left : vscode.StatusBarAlignment.Right;
    this.item = vscode.window.createStatusBarItem(alignment, pos === 'left' ? 10 : 100);
    const clickAction = config.get<string>('statusBar.clickAction', 'openDashboard');
    this.item.command = clickAction === 'switchSession' ? 'claudeHub.switchSession' : 'claudeHub.openDashboard';
  }

  private checkPositionAndRecreate(): void {
    const config = vscode.workspace.getConfiguration('claudeHub');
    const targetPos = config.get<StatusBarPosition>('statusBar.position', 'right');
    if (targetPos !== this.currentPosition) {
      this.item.dispose();
      this.isItemVisible = false;
      this.createItem();
    }
  }

  public update(): void {
    const config = vscode.workspace.getConfiguration('claudeHub');
    const show = config.get<boolean>('showStatusBarItem', true);
    if (!show) {
      this.item.hide();
      this.isItemVisible = false;
      return;
    }

    const clickAction = config.get<string>('statusBar.clickAction', 'openDashboard');
    const targetCommand = clickAction === 'switchSession' ? 'claudeHub.switchSession' : 'claudeHub.openDashboard';
    if (this.item.command !== targetCommand) {
      this.item.command = targetCommand;
    }

    const session = this.sessionManager.focusedSession;
    const filterMode = this.sessionManager.filterMode;
    const allSessions = this.sessionManager.allSessions;

    if (!session) {
      const otherActive = allSessions.filter((s) => !s.isIdle).length;
      const targetText =
        filterMode === 'currentWorkspace' && otherActive > 0
          ? '$(sparkle) Idle (' + otherActive + ')'
          : '$(sparkle) Idle';
      if (this.item.text !== targetText) {
        this.item.text = targetText;
      }

      if (this.lastBgColorId !== undefined) {
        this.lastBgColorId = undefined;
        this.item.backgroundColor = undefined;
      }

      const idleFingerprint = `idle:${filterMode}:${otherActive}`;
      if (idleFingerprint !== this.lastSemanticFingerprint) {
        this.lastSemanticFingerprint = idleFingerprint;
        if (filterMode === 'currentWorkspace' && otherActive > 0) {
          const tip = new vscode.MarkdownString(
            '**Claude Hub** · ' +
              t('status.stateIdle') +
              '\n\n' +
              t('status.tooltipOtherDesc', { count: otherActive }) +
              '\n\n[' +
              t('status.switchToAll') +
              '](command:claudeHub.toggleFilter)',
          );
          tip.isTrusted = true;
          this.setTooltipIfChanged(tip);
        } else {
          const tip = new vscode.MarkdownString(
            '**Claude Hub** · ' +
              t('status.stateIdle') +
              '\n\n[' +
              t('status.refresh') +
              '](command:claudeHub.refresh)',
          );
          tip.isTrusted = true;
          this.setTooltipIfChanged(tip);
        }
      }

      if (!this.isItemVisible) {
        this.item.show();
        this.isItemVisible = true;
      }
      return;
    }

    const warningThreshold = config.get<number>('warningThreshold', 50);
    const dangerThreshold = config.get<number>('dangerThreshold', 75);

    const gwMap = this.configManager?.getGatewayModelMap();
    const modelDisplay = formatModelDisplayName(session.model, gwMap);
    const pct = session.tokenUsage.percentage;

    // Running activity (only when session is active and not idle)
    let hasRunningTool = false;
    let activeToolName: string | undefined;
    let elapsedSec = 0;
    if (!session.isIdle && session.activeTools.length > 0) {
      hasRunningTool = true;
      const tTool = session.activeTools[0];
      activeToolName = tTool.name;
      elapsedSec = Math.max(0, Math.floor((Date.now() - tTool.startTime.getTime()) / 1000));
    }

    const renderOpts = resolveRenderOptions(config);
    const cost = ClaudeFeaturesManager.calculateCost(session.tokenUsage, session.model);

    const targetText = formatStatusBarText({
      percentage: pct,
      totalTokens: session.tokenUsage.totalTokens,
      contextLimit: session.contextLimit,
      modelDisplay,
      hasRunningTool,
      activeToolName,
      elapsedSec,
      cost,
      gitBranch: session.gitBranch,
      todos: session.todos,
      options: renderOpts,
    });

    if (this.item.text !== targetText) {
      this.item.text = targetText;
    }

    // Color warning
    const targetBgId =
      pct >= dangerThreshold
        ? 'statusBarItem.errorBackground'
        : pct >= warningThreshold
        ? 'statusBarItem.warningBackground'
        : undefined;

    if (this.lastBgColorId !== targetBgId) {
      this.lastBgColorId = targetBgId;
      this.item.backgroundColor = targetBgId ? new vscode.ThemeColor(targetBgId) : undefined;
    }

    // Build tooltip and update smoothly if changed
    const subscription = this.sessionManager.subscriptionUsage;
    this.setTooltipIfChanged(this.buildTooltip(session, subscription));

    if (!this.isItemVisible) {
      this.item.show();
      this.isItemVisible = true;
    }
  }

  /**
   * Smoothly tick active running state (status bar label text only) every second.
   * Tooltip updates are strictly event-driven (on session/state transitions) to eliminate hover redraw flicker.
   */
  private updateRunningState(): void {
    const session = this.sessionManager.focusedSession;
    if (!session || session.isIdle) return;

    const config = vscode.workspace.getConfiguration('claudeHub');
    const show = config.get<boolean>('showStatusBarItem', true);
    if (!show) return;

    const renderOpts = resolveRenderOptions(config);
    const hasRunningTool = session.activeTools.length > 0;
    const tTool = hasRunningTool ? session.activeTools[0] : undefined;
    const elapsedSec = tTool ? Math.max(0, Math.floor((Date.now() - tTool.startTime.getTime()) / 1000)) : 0;
    const gwMap = this.configManager?.getGatewayModelMap();
    const modelDisplay = formatModelDisplayName(session.model, gwMap);
    const cost = ClaudeFeaturesManager.calculateCost(session.tokenUsage, session.model);

    // 1. Update status bar label text in-place (smooth 1s tick, no hover flicker)
    const newText = formatStatusBarText({
      percentage: session.tokenUsage.percentage,
      totalTokens: session.tokenUsage.totalTokens,
      contextLimit: session.contextLimit,
      modelDisplay,
      hasRunningTool,
      activeToolName: tTool?.name,
      elapsedSec,
      cost,
      gitBranch: session.gitBranch,
      todos: session.todos,
      options: renderOpts,
    });

    if (this.item.text !== newText) {
      this.item.text = newText;
    }

    // 2. NOTE: Tooltip is strictly NOT updated here!
    // Tooltip updates are purely event-driven during session transcript changes,
    // completely eliminating hover redraw flicker and visual distraction.
  }

  private setTooltipIfChanged(md: vscode.MarkdownString): void {
    if (this.lastTooltipString !== md.value) {
      this.lastTooltipString = md.value;
      this.item.tooltip = md;
    }
  }

  private buildTooltip(
    session: SessionInfo,
    subscription: SubscriptionUsageData | null,
  ): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    const stateBadge = session.isIdle ? t('status.stateIdle') : t('status.stateActive');
    const gwMap = this.configManager?.getGatewayModelMap();
    const model = formatModelDisplayName(session.model, gwMap);
    let modelExtra = '';
    if (
      session.lastResponseModel &&
      session.lastResponseModel !== session.model &&
      !['auto', 'claude.auto'].includes(session.lastResponseModel.toLowerCase().trim())
    ) {
      const respModel = formatModelDisplayName(session.lastResponseModel, gwMap);
      if (respModel !== model && respModel.toLowerCase() !== 'auto') {
        modelExtra = ` *(上次响应: \`${respModel}\`)*`;
      }
    }

    const pct = session.tokenUsage.percentage;
    const bar = formatProgressBar(pct, 8);
    const totalK = formatK(session.tokenUsage.totalTokens);
    const limitK = formatK(session.contextLimit);

    const inTokens = formatK(session.tokenUsage.inputTokens);
    const cacheRead = formatK(session.tokenUsage.cacheReadTokens);
    const cacheWrite = formatK(session.tokenUsage.cacheCreationTokens);
    const outTokens = formatK(session.tokenUsage.outputTokens);
    const totalIn = session.tokenUsage.inputTokens + session.tokenUsage.cacheReadTokens;
    const hitRate = totalIn > 0 ? Math.round((session.tokenUsage.cacheReadTokens / totalIn) * 100) : 0;
    const cost = ClaudeFeaturesManager.calculateCost(session.tokenUsage, session.model);

    const durationMs = session.durationMs ?? 0;
    let durationText: string;
    if (!session.isIdle && session.currentTurnStartTime) {
      const turnMs = Math.max(0, Date.now() - session.currentTurnStartTime.getTime());
      const turnText = formatDuration(turnMs, true);
      const totalText = formatDuration(durationMs + (turnMs <= 300_000 ? turnMs : 0), false);
      durationText = `**${turnText}** *(总计 ${totalText})*`;
    } else {
      const durText = formatDuration(durationMs, false);
      if (session.totalSpanMs && session.totalSpanMs > durationMs) {
        durationText = `**${durText}** *(跨度 ${formatDuration(session.totalSpanMs, false)})*`;
      } else {
        durationText = `**${durText}**`;
      }
    }
    const durationLabel = session.isIdle ? t('status.sessionDuration') : t('status.runningDuration');

    // 1. Header: Project name, optional clean session title, and state badge
    const rawProjectName = session.projectName || '';
    const isThisExtension = /^(claude[-_]hub([-_]for)?[-_]vscode|claude[-_]hub)$/i.test(rawProjectName);
    const displayProjectName = isThisExtension ? 'Claude Hub' : rawProjectName;

    let titleSuffix = '';
    if (
      session.sessionTitle &&
      session.sessionTitle.trim() &&
      session.sessionTitle !== rawProjectName &&
      session.sessionTitle !== displayProjectName
    ) {
      const cleanTitle = session.sessionTitle.replace(/[\r\n]+/g, ' ').trim();
      const clampedTitle = cleanTitle.length > 20 ? cleanTitle.substring(0, 18) + '...' : cleanTitle;
      titleSuffix = ` · *${clampedTitle}*`;
    }

    md.appendMarkdown('**' + displayProjectName + '**' + titleSuffix + ' · `' + stateBadge + '`\n\n');

    // 2. Fixed-slot activity status line (prevents jumpy height shifts between idle, thinking, and tool execution)
    let activityText: string;
    if (!session.isIdle) {
      if (session.activeTools.length > 0) {
        const tTool = session.activeTools[0];
        const elapsedSec = Math.max(0, Math.floor((Date.now() - tTool.startTime.getTime()) / 1000));
        const targetStr = formatToolTarget(tTool.name, tTool.target);
        activityText = t('status.activityTool', { name: tTool.name, target: targetStr }) + (elapsedSec > 0 ? ` *(${elapsedSec}s)*` : '');
      } else {
        activityText = t('status.activityThinking');
      }
    } else {
      activityText = t('status.activityIdle');
    }

    // 3. Core usage metrics, duration & current activity (compact vertical spacing)
    md.appendMarkdown(
      '上下文: `' +
        bar +
        '` **' +
        pct +
        '%** (' +
        totalK +
        '/' +
        limitK +
        ') · 费用: **' +
        cost +
        '**\n\n' +
        '⏱️ ' +
        durationLabel +
        ': ' +
        durationText +
        '\n\n' +
        activityText +
        '\n\n',
    );

    // 4. Structured details section
    md.appendMarkdown('---\n\n');

    // Model and Git branch in one compact line
    const branchPart = session.gitBranch ? ' · 分支: `' + session.gitBranch + '`' : '';
    md.appendMarkdown('模型: `' + model + '`' + modelExtra + branchPart + '\n\n');

    // Token breakdown in single compact line
    md.appendMarkdown(
      'Token: 入 **' +
        inTokens +
        '** · 出 **' +
        outTokens +
        '** · 缓存 **' +
        cacheRead +
        '** *(' +
        hitRate +
        '%)*\n\n',
    );

    // Todos (Compact HUD summary: 1 line, clicks straight into Dashboard)
    if (session.todos.length > 0) {
      const completed = session.todos.filter((td) => td.status === 'completed').length;
      const inProgress = session.todos.find((td) => td.status === 'in_progress');
      const todoPct = Math.round((completed / session.todos.length) * 100);
      let todoSummary = '📋 待办: **' + completed + '/' + session.todos.length + '** *(' + todoPct + '%)*';
      if (inProgress) {
        const cleanContent = inProgress.content.replace(/[\r\n]+/g, ' ').trim();
        const shortContent = cleanContent.length > 18 ? cleanContent.substring(0, 16) + '...' : cleanContent;
        todoSummary += ' · 🔄 *' + shortContent + '*';
      }
      md.appendMarkdown(todoSummary + ' · [面板 →](command:claudeHub.openDashboard)\n\n');
    }

    // Subagents (Compact 1 line)
    if (session.agents && session.agents.length > 0) {
      const runningAgents = session.agents.filter((a) => a.status === 'running').length;
      const subTokens = session.subagentsTotalTokens ? ' · +' + formatK(session.subagentsTotalTokens) : '';
      const agentStatus = runningAgents > 0 ? runningAgents + ' 运行中 / 共 ' + session.agents.length : session.agents.length + ' 个';
      md.appendMarkdown('协作代理: **' + agentStatus + '**' + subTokens + ' · [拓扑 →](command:claudeHub.openDashboard)\n\n');
    }

    // Subscription
    if (subscription && subscription.session) {
      let resetStr = '';
      if (subscription.session.resetsAt) {
        const diffMs = subscription.session.resetsAt.getTime() - Date.now();
        if (diffMs > 0) {
          const h = Math.floor(diffMs / (1000 * 60 * 60));
          const min = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          resetStr = ' (' + h + 'h ' + min + 'm 重置)';
        }
      }
      md.appendMarkdown('5h 配额: **' + subscription.session.percentage + '%**' + resetStr + '\n\n');
    }

    // Bottom action bar (clean, compact)
    md.appendMarkdown('---\n');
    const filterLabel =
      this.sessionManager.filterMode === 'currentWorkspace' ? t('status.quickAll') : t('status.quickCurrent');
    md.appendMarkdown(
      '[' +
        t('status.quickDashboard') +
        '](command:claudeHub.openDashboard)  ·  [' +
        t('status.quickRefresh') +
        '](command:claudeHub.refresh)  ·  [' +
        filterLabel +
        '](command:claudeHub.toggleFilter)  ·  [' +
        t('status.quickSwitch') +
        '](command:claudeHub.switchSession)  ·  [⚙ 风格](command:claudeHub.configureStatusBar)\n',
    );

    return md;
  }

  public dispose(): void {
    if (this.timer) clearInterval(this.timer);
    for (const d of this.disposables) {
      d.dispose();
    }
    this.item.dispose();
    this.isItemVisible = false;
  }
}

/**
 * Format active tool target (command or file path) into a clean, compact string.
 * Keeps tooltip width tightly controlled and prevents awkward line wraps.
 */
function formatToolTarget(name: string, target?: string): string {
  if (!target) return '';
  const trimmed = target.trim();
  if (!trimmed) return '';

  // If target looks like a file path (Read, Edit, etc.), show clean filename
  if (['read', 'edit', 'write', 'view', 'open'].some((k) => name.toLowerCase().includes(k)) && /[/\\]/.test(trimmed)) {
    const parts = trimmed.split(/[/\\]/);
    const fname = parts[parts.length - 1];
    if (fname) {
      return ' `' + fname + '`';
    }
  }

  // For command line or other patterns (Bash, Glob, Grep, etc.), collapse into single line and clamp
  const firstLine = trimmed.split(/[\r\n]+/)[0].trim().replace(/\s+/g, ' ');
  if (!firstLine) return '';
  const maxLen = 28;
  const clamped = firstLine.length > maxLen ? firstLine.substring(0, maxLen - 3) + '...' : firstLine;
  return ' `' + clamped + '`';
}
