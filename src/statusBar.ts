import * as vscode from 'vscode';
import { formatModelDisplayName } from './contextLimit.js';
import { t } from './i18n.js';
import { SessionManager } from './sessionManager.js';
import { SessionInfo, SubscriptionUsageData } from './types.js';

export class StatusBarController implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private timer: NodeJS.Timeout | null = null;

  constructor(private sessionManager: SessionManager) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'claudeHub.switchSession';

    sessionManager.onDidUpdateSessions(() => this.update());
    sessionManager.onDidUpdateSubscription(() => this.update());

    // Update active timer every 1s for live running tool duration
    this.timer = setInterval(() => {
      const active = this.sessionManager.focusedSession;
      if (active && active.activeTools.length > 0) {
        this.update();
      }
    }, 1000);

    this.update();
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
        this.item.tooltip = new vscode.MarkdownString(
          '**Claude Code** · ' +
            t('status.stateIdle') +
            '\n\n' +
            t('status.tooltipOtherDesc', { count: otherActive }) +
            '\n\n[' +
            t('status.switchToAll') +
            '](command:claudeHub.toggleFilter)',
        );
        this.item.tooltip.isTrusted = true;
      } else {
        this.item.text = '$(sparkle) Idle';
        this.item.tooltip = new vscode.MarkdownString(
          '**Claude Code** · ' +
            t('status.stateIdle') +
            '\n\n[' +
            t('status.refresh') +
            '](command:claudeHub.refresh)',
        );
        this.item.tooltip.isTrusted = true;
      }
      this.item.backgroundColor = undefined;
      this.item.show();
      return;
    }

    const warningThreshold = config.get<number>('warningThreshold', 50);
    const dangerThreshold = config.get<number>('dangerThreshold', 75);

    const modelDisplay = formatModelDisplayName(session.model);
    const pct = session.tokenUsage.percentage;

    // Running activity
    let activityText = '';
    let hasRunningTool = false;
    if (session.activeTools.length > 0) {
      hasRunningTool = true;
      const tTool = session.activeTools[0];
      const elapsedSec = Math.max(0, Math.floor((Date.now() - tTool.startTime.getTime()) / 1000));
      activityText = ` · ${tTool.name} (${elapsedSec}s)`;
    }

    // Clean, modern minimal status bar text: $(sparkle) 7% · gpt-5.6-sol
    const icon = hasRunningTool ? '$(sync~spin)' : '$(sparkle)';
    if (hasRunningTool) {
      this.item.text = `${icon} ${pct}%${activityText}`;
    } else {
      this.item.text = `${icon} ${pct}% · ${modelDisplay}`;
    }

    // Color warning
    if (pct >= dangerThreshold) {
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    } else if (pct >= warningThreshold) {
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.item.backgroundColor = undefined;
    }

    this.item.tooltip = this.buildTooltip(session, this.sessionManager.subscriptionUsage);
    this.item.show();
  }

  private buildTooltip(session: SessionInfo, subscription: SubscriptionUsageData | null): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    const stateBadge = session.isIdle ? t('status.stateIdle') : t('status.stateActive');
    const model = session.model || 'Unknown';
    const branchPart = session.gitBranch ? ' · 🌿 ' + t('status.git') + ': `' + session.gitBranch + '`' : '';

    const pct = session.tokenUsage.percentage;
    const bar = renderProgressBar(pct);
    const totalK = formatK(session.tokenUsage.totalTokens);
    const limitK = formatK(session.contextLimit);

    const inTokens = formatK(session.tokenUsage.inputTokens);
    const cacheRead = formatK(session.tokenUsage.cacheReadTokens);
    const cacheWrite = formatK(session.tokenUsage.cacheCreationTokens);
    const outTokens = formatK(session.tokenUsage.outputTokens);
    const totalIn = session.tokenUsage.inputTokens + session.tokenUsage.cacheReadTokens;
    const hitRate = totalIn > 0 ? Math.round((session.tokenUsage.cacheReadTokens / totalIn) * 100) : 0;

    // Elegant and balanced header with visual progress bar
    md.appendMarkdown('### 🤖 ' + session.projectName + ' · ' + stateBadge + '\n\n');
    md.appendMarkdown('上下文: `' + bar + '` **' + pct + '%** (' + totalK + ' / ' + limitK + ' Tokens)\n\n');

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
        branchPart +
        '\n\n',
    );

    // Running Tool (only if running)
    if (session.activeTools.length > 0) {
      const tTool = session.activeTools[0];
      const dur = Math.max(0, Math.floor((Date.now() - tTool.startTime.getTime()) / 1000));
      const target = tTool.target ? ' (' + tTool.target + ')' : '';
      md.appendMarkdown('*运行中: ' + tTool.name + target + ' [' + dur + 's]*\n\n');
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

    // Balanced bottom action bar
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
        '](command:claudeHub.openSessionTranscript)\n',
    );

    return md;
  }

  public dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.item.dispose();
  }
}

function renderProgressBar(percentage: number, length = 8): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * length);
  const empty = length - filled;
  return '▰'.repeat(filled) + '▱'.repeat(empty);
}

function formatK(tokens: number): string {
  if (tokens >= 1_000_000) {
    return (tokens / 1_000_000).toFixed(1) + 'M';
  }
  if (tokens >= 1_000) {
    return Math.round(tokens / 1_000) + 'K';
  }
  return String(tokens);
}
