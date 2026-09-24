import * as vscode from 'vscode';
import { ClaudeConfigManager } from './claudeConfigManager.js';
import { ClaudeFeaturesManager } from './claudeFeatures.js';
import { formatModelDisplayName } from './contextLimit.js';
import { t } from './i18n.js';
import { SessionManager } from './sessionManager.js';
import {
  ConfigGetter,
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

    // Update active timer every 1s ONLY for the status bar text duration (never refresh tooltip)
    this.timer = setInterval(() => {
      const active = this.sessionManager.focusedSession;
      if (active && active.activeTools.length > 0) {
        this.updateRunningTimeText();
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
    this.item.command = 'claudeHub.switchSession';
  }

  private checkPositionAndRecreate(): void {
    const config = vscode.workspace.getConfiguration('claudeHub');
    const targetPos = config.get<StatusBarPosition>('statusBar.position', 'right');
    if (targetPos !== this.currentPosition) {
      this.item.dispose();
      this.createItem();
    }
  }

  public update(): void {
    const config = vscode.workspace.getConfiguration('claudeHub');
    const show = config.get<boolean>('showStatusBarItem', true);
    if (!show) {
      this.item.hide();
      return;
    }

    const session = this.sessionManager.focusedSession;
    const filterMode = this.sessionManager.filterMode;
    const allSessions = this.sessionManager.allSessions;

    if (!session) {
      const otherActive = allSessions.filter((s) => !s.isIdle).length;
      if (filterMode === 'currentWorkspace' && otherActive > 0) {
        this.item.text = '$(sparkle) Idle (' + otherActive + ')';
        const tip = new vscode.MarkdownString(
          '**Claude Code** · ' +
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
        this.item.text = '$(sparkle) Idle';
        const tip = new vscode.MarkdownString(
          '**Claude Code** · ' +
            t('status.stateIdle') +
            '\n\n[' +
            t('status.refresh') +
            '](command:claudeHub.refresh)',
        );
        tip.isTrusted = true;
        this.setTooltipIfChanged(tip);
      }
      this.item.backgroundColor = undefined;
      this.item.show();
      return;
    }

    const warningThreshold = config.get<number>('warningThreshold', 50);
    const dangerThreshold = config.get<number>('dangerThreshold', 75);

    const gwMap = this.configManager?.getGatewayModelMap();
    const modelDisplay = formatModelDisplayName(session.model, gwMap);
    const pct = session.tokenUsage.percentage;

    // Running activity
    let hasRunningTool = false;
    let activeToolName: string | undefined;
    let elapsedSec = 0;
    if (session.activeTools.length > 0) {
      hasRunningTool = true;
      const tTool = session.activeTools[0];
      activeToolName = tTool.name;
      elapsedSec = Math.max(0, Math.floor((Date.now() - tTool.startTime.getTime()) / 1000));
    }

    const renderOpts = resolveRenderOptions(config);
    const cost = ClaudeFeaturesManager.calculateCost(session.tokenUsage, session.model);

    this.item.text = formatStatusBarText({
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

    // Color warning
    if (pct >= dangerThreshold) {
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    } else if (pct >= warningThreshold) {
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.item.backgroundColor = undefined;
    }

    this.setTooltipIfChanged(this.buildTooltip(session, this.sessionManager.subscriptionUsage));
    this.item.show();
  }

  /**
   * Only update the status bar label text for running tool seconds.
   * Never touch tooltip or call show() so hover popups stay smooth without flicker.
   */
  private updateRunningTimeText(): void {
    const session = this.sessionManager.focusedSession;
    if (!session || session.activeTools.length === 0) return;

    const config = vscode.workspace.getConfiguration('claudeHub');
    const show = config.get<boolean>('showStatusBarItem', true);
    if (!show) return;

    const renderOpts = resolveRenderOptions(config);
    if (!renderOpts.showTools) return;

    const tTool = session.activeTools[0];
    const elapsedSec = Math.max(0, Math.floor((Date.now() - tTool.startTime.getTime()) / 1000));
    const gwMap = this.configManager?.getGatewayModelMap();
    const modelDisplay = formatModelDisplayName(session.model, gwMap);
    const cost = ClaudeFeaturesManager.calculateCost(session.tokenUsage, session.model);

    const newText = formatStatusBarText({
      percentage: session.tokenUsage.percentage,
      totalTokens: session.tokenUsage.totalTokens,
      contextLimit: session.contextLimit,
      modelDisplay,
      hasRunningTool: true,
      activeToolName: tTool.name,
      elapsedSec,
      cost,
      gitBranch: session.gitBranch,
      todos: session.todos,
      options: renderOpts,
    });

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

  private buildTooltip(session: SessionInfo, subscription: SubscriptionUsageData | null): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    const stateBadge = session.isIdle ? t('status.stateIdle') : t('status.stateActive');
    const gwMap = this.configManager?.getGatewayModelMap();
    const model = formatModelDisplayName(session.model, gwMap);
    let modelExtra = '';
    if (session.lastResponseModel && session.lastResponseModel !== session.model) {
      const respModel = formatModelDisplayName(session.lastResponseModel, gwMap);
      modelExtra = ` *(⚡ 上次响应: \`${respModel}\`)*`;
    }
    const branchPart = session.gitBranch ? ' · 🌿 ' + t('status.git') + ': `' + session.gitBranch + '`' : '';

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

    // Header with visual progress bar and cost
    md.appendMarkdown('### 🤖 ' + session.projectName + ' · ' + stateBadge + '\n\n');
    md.appendMarkdown(
      '上下文: `' +
        bar +
        '` **' +
        pct +
        '%** (' +
        totalK +
        ' / ' +
        limitK +
        ' Tokens) · 费用: **' +
        cost +
        '**\n\n',
    );

    // Structured data blockquote
    md.appendMarkdown(
      '> 📥 ' +
        t('status.input') +
        ' ' +
        inTokens +
        ' · ⚡ ' +
        t('status.cacheRead') +
        ' ' +
        cacheRead +
        ' (' +
        hitRate +
        '%) · 💾 ' +
        t('status.cacheWrite') +
        ' ' +
        cacheWrite +
        ' · 📤 ' +
        t('status.output') +
        ' ' +
        outTokens +
        '\n>\n' +
        '> 🤖 ' +
        t('status.model') +
        ': `' +
        model +
        '`' +
        modelExtra +
        branchPart +
        '\n\n',
    );

    // Running Tool (only if running)
    if (session.activeTools.length > 0) {
      const tTool = session.activeTools[0];
      const target = tTool.target ? ' (' + tTool.target + ')' : '';
      md.appendMarkdown('*运行中: ' + tTool.name + target + '*\n\n');
    }

    // Todos (only if active)
    if (session.todos.length > 0) {
      const completed = session.todos.filter((td) => td.status === 'completed').length;
      md.appendMarkdown('*待办: ' + completed + '/' + session.todos.length + ' 已完成*\n\n');
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
      md.appendMarkdown('*5h 配额: ' + subscription.session.percentage + '%' + resetStr + '*\n\n');
    }

    // Bottom action bar
    md.appendMarkdown('---\n');
    const filterLabel =
      this.sessionManager.filterMode === 'currentWorkspace' ? t('status.quickAll') : t('status.quickCurrent');
    md.appendMarkdown(
      '[' +
        t('status.quickRefresh') +
        '](command:claudeHub.refresh)  ·  [' +
        filterLabel +
        '](command:claudeHub.toggleFilter)  ·  [' +
        t('status.quickSwitch') +
        '](command:claudeHub.switchSession)  ·  [' +
        t('status.quickLog') +
        '](command:claudeHub.openSessionTranscript)  ·  [⚙ 状态栏风格](command:claudeHub.configureStatusBar)\n',
    );

    return md;
  }

  public dispose(): void {
    if (this.timer) clearInterval(this.timer);
    for (const d of this.disposables) {
      d.dispose();
    }
    this.item.dispose();
  }
}
