import * as vscode from 'vscode';
import { ClaudeConfigManager } from './claudeConfigManager.js';
import { ClaudeFeaturesManager } from './claudeFeatures.js';
import { formatSelectedModelName } from './contextLimit.js';
import { t } from './i18n.js';
import { SessionManager } from './sessionManager.js';
import {
  ConfigGetter,
  DEFAULT_TOOLTIP_SECTIONS,
  formatDuration,
  formatK,
  formatOutputSpeed,
  formatProgressBar,
  formatStatusBarText,
  resolveRenderOptions,
  resolveTooltipSections,
  shouldHideStatusBar,
  StatusBarContextFormat,
  StatusBarFormatInput,
  StatusBarPosition,
  StatusBarPreset,
  StatusBarRenderOptions,
  StatusBarSeparator,
  StatusBarStyle,
  StatusBarTooltipSections,
} from './statusBarFormatter.js';
import {
  buildStatusTooltipMarkup,
  HOVER_ALLOWED_COMMANDS,
} from './statusBarTooltip.js';
import { BackgroundJob, SessionInfo, SubscriptionUsageData } from './types.js';

function runningBackgroundJobs(session: SessionInfo | null | undefined): BackgroundJob[] {
  if (!session) return [];
  return (session.backgroundJobs || []).filter((job) => job.status === 'running');
}

function withBackgroundSuffix(text: string, count: number): string {
  if (count <= 0) return text;
  return text + ' · $(sync~spin) ' + t('status.backgroundRunning', { count });
}

function resolveClickCommand(clickAction?: string): string {
  if (clickAction === 'switchSession') return 'claudeHub.switchSession';
  if (clickAction === 'openDashboardTab') return 'claudeHub.openDashboardTab';
  return 'claudeHub.openDashboard';
}

export {
  buildStatusTooltipMarkup,
  ConfigGetter,
  DEFAULT_TOOLTIP_SECTIONS,
  formatDuration,
  formatK,
  formatOutputSpeed,
  formatProgressBar,
  formatStatusBarText,
  resolveRenderOptions,
  resolveTooltipSections,
  shouldHideStatusBar,
  StatusBarContextFormat,
  StatusBarFormatInput,
  StatusBarPosition,
  StatusBarPreset,
  StatusBarRenderOptions,
  StatusBarSeparator,
  StatusBarStyle,
  StatusBarTooltipSections,
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
    this.item.command = resolveClickCommand(clickAction);
    this.item.name = 'Claude Hub';
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

  /** Composer model for this workspace; transcript model for other projects. */
  private modelLabel(session: SessionInfo): string {
    const gwMap = this.configManager?.getGatewayModelMap();
    const configured = this.configManager?.getActiveModel(session.model || session.lastResponseModel);
    if (session.isCurrentWorkspace && configured) {
      return formatSelectedModelName(configured, gwMap, session.effortLevel);
    }
    return formatSelectedModelName(session.model, gwMap, session.effortLevel);
  }

  private buildFormatInput(session: SessionInfo, config: vscode.WorkspaceConfiguration): StatusBarFormatInput {
    const renderOpts = resolveRenderOptions(config);
    let hasRunningTool = false;
    let activeToolName: string | undefined;
    let elapsedSec = 0;
    if (!session.isIdle && session.activeTools.length > 0) {
      hasRunningTool = true;
      const tTool = session.activeTools[0];
      activeToolName = tTool.name;
      elapsedSec = Math.max(0, Math.floor((Date.now() - tTool.startTime.getTime()) / 1000));
    }
    const agents = session.agents || [];
    const agentsRunning = agents.filter((a) => a.status === 'running').length;
    return {
      percentage: session.tokenUsage.percentage,
      totalTokens: session.tokenUsage.totalTokens,
      contextLimit: session.contextLimit,
      modelDisplay: this.modelLabel(session),
      hasRunningTool,
      activeToolName,
      elapsedSec,
      cost: ClaudeFeaturesManager.calculateCost(session.tokenUsage, session.model),
      outputTokensPerSecond: session.outputSpeed?.tokensPerSecond,
      gitBranch: session.gitBranch,
      todos: session.todos,
      durationMs: session.durationMs ?? 0,
      agentsRunning,
      agentsTotal: agents.length,
      options: renderOpts,
    };
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
    const targetCommand = resolveClickCommand(clickAction);
    if (this.item.command !== targetCommand) {
      this.item.command = targetCommand;
    }

    const session = this.sessionManager.focusedSession;
    if (shouldHideStatusBar(session, config.get<boolean>('statusBar.hideWhenInactive', true))) {
      this.item.hide();
      this.isItemVisible = false;
      return;
    }
    const filterMode = this.sessionManager.filterMode;
    const allSessions = this.sessionManager.allSessions;

    if (!session) {
      const otherActive = allSessions.filter((s) => !s.isIdle).length;
      const bgCount = runningBackgroundJobs(session).length;
      const targetText = withBackgroundSuffix(
        filterMode === 'currentWorkspace' && otherActive > 0
          ? '$(sparkle) Idle (' + otherActive + ')'
          : '$(sparkle) Idle',
        bgCount,
      );
      if (this.item.text !== targetText) {
        this.item.text = targetText;
      }

      if (this.lastBgColorId !== undefined) {
        this.lastBgColorId = undefined;
        this.item.backgroundColor = undefined;
      }

      const idleFingerprint = `idle:${filterMode}:${otherActive}:${bgCount}`;
      if (idleFingerprint !== this.lastSemanticFingerprint) {
        this.lastSemanticFingerprint = idleFingerprint;
        const body = filterMode === 'currentWorkspace' && otherActive > 0
          ? `**Claude Hub** · ${t('status.stateIdle')}\n\n${t('status.tooltipOtherDesc', { count: otherActive })}\n\n[${t('status.switchToAll')}](command:claudeHub.toggleFilter)  ·  [↗ ${t('status.md.actTab')}](command:claudeHub.openDashboardTab)`
          : `**Claude Hub** · ${t('status.stateIdle')}\n\n[${t('status.refresh')}](command:claudeHub.refresh)  ·  [↗ ${t('status.md.actTab')}](command:claudeHub.openDashboardTab)`;
        const tip = new vscode.MarkdownString(body, true);
        tip.supportThemeIcons = true;
        tip.isTrusted = { enabledCommands: HOVER_ALLOWED_COMMANDS };
        this.setTooltipIfChanged(tip);
      }

      if (!this.isItemVisible) {
        this.item.show();
        this.isItemVisible = true;
      }
      return;
    }

    const warningThreshold = config.get<number>('warningThreshold', 50);
    const dangerThreshold = config.get<number>('dangerThreshold', 75);
    const pct = session.tokenUsage.percentage;

    const targetText = withBackgroundSuffix(
      formatStatusBarText(this.buildFormatInput(session, config)),
      runningBackgroundJobs(session).length,
    );

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

    const subscription = this.sessionManager.subscriptionUsage;
    this.setTooltipIfChanged(this.buildTooltip(session, subscription, config));

    if (!this.isItemVisible) {
      this.item.show();
      this.isItemVisible = true;
    }
  }

  /**
   * Smoothly tick active running state (status bar label text only) every second.
   * Tooltip updates are strictly event-driven to prevent hover redraw flicker.
   */
  private updateRunningState(): void {
    const session = this.sessionManager.focusedSession;
    if (!session || session.isIdle) return;

    const config = vscode.workspace.getConfiguration('claudeHub');
    const show = config.get<boolean>('showStatusBarItem', true);
    if (!show) return;

    const newText = withBackgroundSuffix(
      formatStatusBarText(this.buildFormatInput(session, config)),
      runningBackgroundJobs(session).length,
    );

    if (this.item.text !== newText) {
      this.item.text = newText;
    }
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
    config: vscode.WorkspaceConfiguration,
  ): vscode.MarkdownString {
    const rawStyle = config.get<string>('statusBar.style', 'modern');
    const style: StatusBarStyle = rawStyle === 'classic' ? 'classic' : 'modern';
    const sections = resolveTooltipSections(config);
    const markup = buildStatusTooltipMarkup({
      session,
      subscription,
      model: this.modelLabel(session),
      cost: ClaudeFeaturesManager.calculateCost(session.tokenUsage, session.model),
      filterMode: this.sessionManager.filterMode,
      style,
      sections,
      gatewayModelMap: this.configManager?.getGatewayModelMap(),
    });

    const md = new vscode.MarkdownString(markup, true);
    md.supportThemeIcons = true;
    md.supportHtml = true;
    md.isTrusted = { enabledCommands: HOVER_ALLOWED_COMMANDS };
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
