import { formatModelDisplayName } from './contextLimit.js';
import { t } from './i18n.js';
import {
  DEFAULT_TOOLTIP_SECTIONS,
  formatDuration,
  formatK,
  formatOutputSpeed,
  formatProgressBar,
  StatusBarStyle,
  StatusBarTooltipSections,
} from './statusBarFormatter.js';
import { BackgroundJob, SessionInfo, SubscriptionUsageData } from './types.js';

export const HOVER_ALLOWED_COMMANDS = [
  'claudeHub.openDashboard',
  'claudeHub.openDashboardTab',
  'claudeHub.refresh',
  'claudeHub.toggleFilter',
  'claudeHub.switchSession',
  'claudeHub.configureStatusBar',
];

const HOVER_DIM = 'color:var(--vscode-descriptionForeground);';
const HOVER_BLUE = 'color:var(--vscode-charts-blue);';

export interface BuildTooltipInput {
  session: SessionInfo;
  subscription: SubscriptionUsageData | null;
  model: string;
  cost: string;
  filterMode: 'currentWorkspace' | 'all';
  style: StatusBarStyle;
  sections?: Partial<StatusBarTooltipSections>;
  gatewayModelMap?: Map<string, string>;
  now?: number;
}

export function escHtml(value: unknown): string {
  return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return ch;
    }
  });
}

export function sanitizeMarkdownCode(value: string): string {
  return String(value).replace(/[\r\n]+/g, ' ').replace(/`/g, '').trim();
}

export function formatToolTargetPlain(name: string, target?: string): string {
  if (!target) return '';
  const trimmed = target.trim();
  if (!trimmed) return '';

  if (['read', 'edit', 'write', 'view', 'open'].some((k) => name.toLowerCase().includes(k)) && /[/\\]/.test(trimmed)) {
    const parts = trimmed.split(/[/\\]/);
    const fname = parts[parts.length - 1];
    if (fname) {
      return fname;
    }
  }

  const firstLine = trimmed.split(/[\r\n]+/)[0].trim().replace(/\s+/g, ' ');
  if (!firstLine) return '';
  const maxLen = 28;
  return firstLine.length > maxLen ? firstLine.substring(0, maxLen - 3) + '...' : firstLine;
}

function runningBackgroundJobs(session: SessionInfo | null | undefined): BackgroundJob[] {
  if (!session) return [];
  return (session.backgroundJobs || []).filter((job) => job.status === 'running');
}

function relativeTimeLabel(ts: number | undefined, now: number): string {
  if (!ts || !Number.isFinite(ts) || ts <= 0) return '';
  const diff = Math.max(0, now - ts);
  if (diff < 60_000) return t('status.md.justNow');
  if (diff < 3_600_000) return t('status.md.minAgo', { n: Math.floor(diff / 60_000) });
  if (diff < 86_400_000) return t('status.md.hrAgo', { n: Math.floor(diff / 3_600_000) });
  return t('status.md.dayAgo', { n: Math.floor(diff / 86_400_000) });
}

function normalizeSections(raw?: Partial<StatusBarTooltipSections>): StatusBarTooltipSections {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TOOLTIP_SECTIONS };
  return {
    context: raw.context !== false,
    speed: raw.speed !== false,
    modelBranch: raw.modelBranch !== false,
    activityDur: raw.activityDur !== false,
    tokens: raw.tokens !== false,
    todos: raw.todos !== false,
    agents: raw.agents !== false,
    quota: raw.quota !== false,
    actions: raw.actions !== false,
  };
}

export function buildStatusTooltipMarkup(input: BuildTooltipInput): string {
  const sections = normalizeSections(input.sections);
  if (input.style === 'classic') {
    return buildClassicTooltipMarkup(input, sections);
  }
  return buildModernTooltipMarkup(input, sections);
}

/**
 * Modern borderless HTML-table hover card inspired by Copilot Speedometer.
 * Uses single-row `<table width="100%">` blocks separated by `---` rules and
 * strict VS Code DOMPurify inline-style allowlist tokens.
 */
function buildModernTooltipMarkup(input: BuildTooltipInput, sec: StatusBarTooltipSections): string {
  const { session, subscription, model, cost, filterMode, gatewayModelMap, now = Date.now() } = input;
  const dim = (s: string) => `<span style="${HOVER_DIM}">${s}</span>`;

  const rawProjectName = session.projectName || '';
  const isThisExtension = /^(claude[-_]hub([-_]for)?[-_]vscode|claude[-_]hub)$/i.test(rawProjectName);
  const displayProjectName = isThisExtension ? 'Claude Hub' : (rawProjectName || 'Claude Hub');

  const scopeLabel = filterMode === 'currentWorkspace' ? t('status.md.scopeWindow') : t('status.md.scopeAll');
  const updatedMs = session.lastUpdated instanceof Date
    ? session.lastUpdated.getTime()
    : (typeof session.lastUpdated === 'number' ? session.lastUpdated : 0);
  const whenLabel = relativeTimeLabel(updatedMs, now);
  const stateLabel = session.isIdle ? t('status.md.idle') : t('status.md.running');
  const headRightParts = [scopeLabel, whenLabel, stateLabel].filter(Boolean).map(escHtml);

  const blocks: string[] = [];

  // Block 1: Header
  const headLeft = displayProjectName === 'Claude Hub'
    ? `<b>$(sparkle) Claude Hub</b>`
    : `<b>$(sparkle) Claude Hub · ${escHtml(displayProjectName)}</b>`;
  blocks.push(
    `<table width="100%"><tbody><tr><td>${headLeft}</td>` +
      `<td align="right">${dim(headRightParts.join(' · '))}</td></tr></tbody></table>`,
  );

  // Block 2: Primary metrics (Context / Speed / Model+Branch / Cost) + 3-column detail row
  const midRows: string[] = [];

  const pct = session.tokenUsage.percentage;
  const totalK = formatK(session.tokenUsage.totalTokens);
  const limitK = formatK(session.contextLimit);
  const speedValue = session.outputSpeed ? formatOutputSpeed(session.outputSpeed.tokensPerSecond) : '—';

  if (sec.context || sec.speed || sec.modelBranch) {
    const line1Parts: string[] = [];
    if (sec.context) {
      line1Parts.push(
        `<span style="${HOVER_BLUE}"><b>${escHtml(pct)}% ${escHtml(t('status.md.context'))}</b></span> ` +
          dim(`· ${escHtml(totalK)} / ${escHtml(limitK)}`),
      );
    }
    if (sec.speed && speedValue !== '—') {
      line1Parts.push(`<b>${escHtml(speedValue)}</b>`);
    } else if (sec.speed && session.outputSpeedState === 'sampling') {
      line1Parts.push(dim(escHtml(t('speed.sampling'))));
    }

    let line2 = '';
    if (sec.modelBranch) {
      const mParts: string[] = [`<code>${escHtml(model)}</code>`];
      if (
        session.lastResponseModel &&
        session.lastResponseModel !== session.model &&
        !['auto', 'claude.auto'].includes(session.lastResponseModel.toLowerCase().trim())
      ) {
        const respModel = formatModelDisplayName(session.lastResponseModel, gatewayModelMap);
        if (respModel !== model && respModel.toLowerCase() !== 'auto') {
          mParts.push(dim(`${escHtml(t('status.md.lastResp'))} ${escHtml(respModel)}`));
        }
      }
      if (session.gitBranch) {
        mParts.push(dim(`$(git-branch) ${escHtml(session.gitBranch)}`));
      }
      line2 = mParts.join(' · ');
    }

    const leftCellContent = [line1Parts.join(' · '), line2].filter(Boolean).join('<br>');
    const rightCell = sec.context
      ? `<td align="right">${dim(escHtml(t('status.md.cost')))}<br><b>${escHtml(cost)}</b></td>`
      : '';
    if (leftCellContent || rightCell) {
      midRows.push(
        `<table width="100%"><tbody><tr><td>${leftCellContent}</td>${rightCell}</tr></tbody></table>`,
      );
    }
  }

  // Detail columns (up to 3 columns, collapses cleanly when any toggle is off)
  const detailCells: Array<{ html: string; alignRight?: boolean }> = [];

  if (sec.activityDur) {
    const durationMs = session.durationMs ?? 0;
    let durVal: string;
    if (!session.isIdle && session.currentTurnStartTime) {
      const turnMs = Math.max(0, now - session.currentTurnStartTime.getTime());
      durVal = formatDuration(turnMs, true);
    } else {
      durVal = formatDuration(durationMs, false);
    }

    let actPart: string;
    if (!session.isIdle) {
      if (session.activeTools.length > 0) {
        const tTool = session.activeTools[0];
        const targetPlain = formatToolTargetPlain(tTool.name, tTool.target);
        actPart = targetPlain ? `${tTool.name} ${targetPlain}` : tTool.name;
      } else {
        actPart = t('status.md.thinking');
      }
    } else {
      actPart = t('status.md.waiting');
    }

    detailCells.push({
      html: `${dim(escHtml(t('status.md.durAct')))}<br><b>${escHtml(durVal)}</b> ${dim('· ' + escHtml(actPart))}`,
    });
  }

  if (sec.tokens) {
    const inTokens = formatK(session.tokenUsage.inputTokens);
    const cacheRead = formatK(session.tokenUsage.cacheReadTokens);
    const totalIn = session.tokenUsage.inputTokens + session.tokenUsage.cacheReadTokens;
    const hitRate = totalIn > 0 ? Math.round((session.tokenUsage.cacheReadTokens / totalIn) * 100) : 0;
    const cacheLabel = session.tokenUsage.cacheReadTokens > 0 ? `${cacheRead} (${hitRate}%)` : '0%';
    detailCells.push({
      html: `${dim(escHtml(t('status.md.ioCache')))}<br><b>${escHtml(inTokens)}</b> ${dim('· ' + escHtml(cacheLabel))}`,
    });
  }

  if (sec.tokens || sec.todos) {
    const outTokens = formatK(session.tokenUsage.outputTokens);
    const hasTodos = session.todos && session.todos.length > 0;
    const completed = hasTodos ? session.todos.filter((td) => td.status === 'completed').length : 0;
    const todoText = hasTodos ? `${completed}/${session.todos.length}` : '';

    if (sec.tokens && sec.todos && todoText) {
      detailCells.push({
        alignRight: true,
        html: `${dim(escHtml(t('status.md.outTodos')))}<br><b>${escHtml(outTokens)}</b> ${dim('· ' + escHtml(todoText))}`,
      });
    } else if (sec.tokens) {
      detailCells.push({
        alignRight: true,
        html: `${dim(escHtml(t('status.md.outOnly')))}<br><b>${escHtml(outTokens)}</b>`,
      });
    } else if (sec.todos && todoText) {
      detailCells.push({
        alignRight: true,
        html: `${dim(escHtml(t('status.md.todosOnly')))}<br><b>${escHtml(todoText)}</b>`,
      });
    }
  }

  if (detailCells.length > 0) {
    const tds = detailCells
      .map((cell, idx) => {
        const right = detailCells.length > 1 && (cell.alignRight || idx === detailCells.length - 1);
        return `<td${right ? ' align="right"' : ''}>${cell.html}</td>`;
      })
      .join('');
    midRows.push(`<table width="100%"><tbody><tr>${tds}</tr></tbody></table>`);
  }

  if (midRows.length > 0) {
    blocks.push(midRows.join('\n'));
  }

  // Block 3: Conditional Subagents / Background tasks / Subscription quota summary
  const extraLeft: string[] = [];
  if (sec.agents) {
    if (session.agents && session.agents.length > 0) {
      const runningAgents = session.agents.filter((a) => a.status === 'running').length;
      const agStr = runningAgents > 0
        ? t('status.md.agentsRun', { running: runningAgents, total: session.agents.length })
        : String(session.agents.length);
      const subTok = session.subagentsTotalTokens ? ` (+${formatK(session.subagentsTotalTokens)})` : '';
      extraLeft.push(`${dim(escHtml(t('status.md.agents')))} <b>${escHtml(agStr)}</b>${dim(escHtml(subTok))}`);
    }
    const ownBg = runningBackgroundJobs(session);
    if (ownBg.length > 0) {
      extraLeft.push(`${dim('/tasks')} <b>${ownBg.length}</b>`);
    }
  }

  let extraRight = '';
  if (sec.quota && subscription && subscription.session) {
    let resetStr = '';
    if (subscription.session.resetsAt) {
      const diffMs = subscription.session.resetsAt.getTime() - now;
      if (diffMs > 0) {
        const h = Math.floor(diffMs / (1000 * 60 * 60));
        const min = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        resetStr = ` (${h}h ${min}m)`;
      }
    }
    extraRight = `${dim(escHtml(t('status.md.quota5h')))} <b>${escHtml(subscription.session.percentage)}%</b>${dim(escHtml(resetStr))}`;
  }

  if (extraLeft.length > 0 || extraRight) {
    const leftTd = `<td>${extraLeft.join(' · ')}</td>`;
    const rightTd = extraRight ? `<td align="right">${extraRight}</td>` : '';
    blocks.push(`<table width="100%"><tbody><tr>${leftTd}${rightTd}</tr></tbody></table>`);
  }

  // Block 4: Bottom action links
  if (sec.actions) {
    const actionsHtml =
      `<table width="100%"><tbody><tr><td>` +
      `<a href="command:claudeHub.openDashboard">$(layout-sidebar-left) ${escHtml(t('status.md.actSidebar'))}</a>` +
      ` &nbsp;·&nbsp; ` +
      `<a href="command:claudeHub.openDashboardTab">$(link-external) ${escHtml(t('status.md.actTab'))}</a>` +
      ` &nbsp;·&nbsp; ` +
      `<a href="command:claudeHub.refresh">$(refresh) ${escHtml(t('status.md.actRefresh'))}</a>` +
      ` &nbsp;·&nbsp; ` +
      `<a href="command:claudeHub.switchSession">$(arrow-swap) ${escHtml(t('status.md.actSwitch'))}</a>` +
      ` &nbsp;·&nbsp; ` +
      `<a href="command:claudeHub.configureStatusBar">$(settings-gear) ${escHtml(t('status.md.actStyle'))}</a>` +
      `</td></tr></tbody></table>`;
    blocks.push(actionsHtml);
  }

  return blocks.join('\n\n---\n\n');
}

/**
 * Classic v0.2.x Claude Hub paragraph hover card, preserved for users who
 * select `claudeHub.statusBar.style = "classic"`, now honoring section toggles.
 */
function buildClassicTooltipMarkup(input: BuildTooltipInput, sec: StatusBarTooltipSections): string {
  const { session, subscription, model, cost, filterMode, gatewayModelMap, now = Date.now() } = input;
  const parts: string[] = [];

  const stateBadge = session.isIdle ? t('status.stateIdle') : t('status.stateActive');
  const rawProjectName = session.projectName || '';
  const isThisExtension = /^(claude[-_]hub([-_]for)?[-_]vscode|claude[-_]hub)$/i.test(rawProjectName);
  const displayProjectName = isThisExtension ? 'Claude Hub' : (rawProjectName || 'Claude Hub');

  let titleSuffix = '';
  if (
    session.sessionTitle &&
    session.sessionTitle.trim() &&
    session.sessionTitle !== rawProjectName &&
    session.sessionTitle !== displayProjectName
  ) {
    const cleanTitle = sanitizeMarkdownCode(session.sessionTitle);
    const clampedTitle = cleanTitle.length > 20 ? cleanTitle.substring(0, 18) + '...' : cleanTitle;
    titleSuffix = ` · *${escHtml(clampedTitle)}*`;
  }

  parts.push(`**${escHtml(displayProjectName)}**${titleSuffix} · \`${sanitizeMarkdownCode(stateBadge)}\``);

  const topGroup: string[] = [];
  if (sec.context) {
    const pct = session.tokenUsage.percentage;
    const bar = formatProgressBar(pct, 8);
    const totalK = formatK(session.tokenUsage.totalTokens);
    const limitK = formatK(session.contextLimit);
    topGroup.push(`上下文: \`${bar}\` **${pct}%** (${totalK}/${limitK}) · 费用: **${escHtml(cost)}**`);
  }

  if (sec.activityDur) {
    const durationMs = session.durationMs ?? 0;
    let durationText: string;
    if (!session.isIdle && session.currentTurnStartTime) {
      const turnMs = Math.max(0, now - session.currentTurnStartTime.getTime());
      const turnText = formatDuration(turnMs, true);
      const totalText = formatDuration(durationMs + (turnMs <= 300_000 ? turnMs : 0), false);
      durationText = `**${turnText}** *(${t('status.md.totalDur', { total: totalText })})*`;
    } else {
      const durText = formatDuration(durationMs, false);
      if (session.totalSpanMs && session.totalSpanMs > durationMs) {
        durationText = `**${durText}** *(${t('status.md.span', { span: formatDuration(session.totalSpanMs, false) })})*`;
      } else {
        durationText = `**${durText}**`;
      }
    }
    const durationLabel = session.isIdle ? t('status.sessionDuration') : t('status.runningDuration');
    topGroup.push(`⏱️ ${durationLabel}: ${durationText}`);

    let activityText: string;
    if (!session.isIdle) {
      if (session.activeTools.length > 0) {
        const tTool = session.activeTools[0];
        const elapsedSec = Math.max(0, Math.floor((now - tTool.startTime.getTime()) / 1000));
        const targetPlain = formatToolTargetPlain(tTool.name, tTool.target);
        const targetStr = targetPlain ? ` \`${sanitizeMarkdownCode(targetPlain)}\`` : '';
        activityText = t('status.activityTool', { name: sanitizeMarkdownCode(tTool.name), target: targetStr }) + (elapsedSec > 0 ? ` *(${elapsedSec}s)*` : '');
      } else {
        activityText = t('status.activityThinking');
      }
    } else {
      activityText = t('status.activityIdle');
    }
    topGroup.push(activityText);
  }

  if (sec.agents) {
    const ownRunning = runningBackgroundJobs(session);
    if (ownRunning.length > 0) {
      const lines = ownRunning.slice(0, 6).map((job) => {
        const start = job.startTime instanceof Date ? job.startTime.getTime() : new Date(job.startTime).getTime();
        const elapsed = start > 0 ? formatDuration(Math.max(0, now - start), true) : '';
        const safeLabel = sanitizeMarkdownCode(job.label).replace(/[*\\]/g, '');
        return '- `' + sanitizeMarkdownCode(job.kind) + '` ' + escHtml(safeLabel) + (elapsed ? ' · ' + elapsed : '');
      });
      topGroup.push('**' + escHtml(t('status.backgroundTitle')) + '**\n\n' + lines.join('\n'));
    }
  }

  if (topGroup.length > 0) {
    parts.push(topGroup.join('\n\n'));
  }

  const detailGroup: string[] = [];

  if (sec.modelBranch) {
    let modelExtra = '';
    if (
      session.lastResponseModel &&
      session.lastResponseModel !== session.model &&
      !['auto', 'claude.auto'].includes(session.lastResponseModel.toLowerCase().trim())
    ) {
      const respModel = formatModelDisplayName(session.lastResponseModel, gatewayModelMap);
      if (respModel !== model && respModel.toLowerCase() !== 'auto') {
        modelExtra = ` *(${t('status.md.lastResp')}: \`${sanitizeMarkdownCode(respModel)}\`)*`;
      }
    }
    const branchPart = session.gitBranch ? ` · 分支: \`${sanitizeMarkdownCode(session.gitBranch)}\`` : '';
    detailGroup.push(`模型: \`${sanitizeMarkdownCode(model)}\`${modelExtra}${branchPart}`);
  }

  if (sec.speed) {
    const speedSample = session.outputSpeed;
    const speedState = session.outputSpeedState;
    const speedValue = speedSample ? formatOutputSpeed(speedSample.tokensPerSecond) : '—';
    if (speedSample && speedValue !== '—') {
      const details: string[] = [];
      const speedModel = sanitizeMarkdownCode(
        speedSample.model ? formatModelDisplayName(speedSample.model, gatewayModelMap) : '',
      );
      if (speedModel) details.push('`' + speedModel + '`');
      if (speedSample.source === 'transcript') {
        details.push('*' + t('speed.sourceTranscript') + '*');
      } else if (speedSample.source === 'statusLine') {
        details.push('*' + t('speed.sourceStatusLine') + '*');
      }
      if (typeof speedSample.measuredAt === 'number' && Number.isFinite(speedSample.measuredAt) && speedSample.measuredAt > 0) {
        details.push(t('speed.measuredAt', { time: new Date(speedSample.measuredAt).toLocaleTimeString() }));
      }
      if (speedState === 'sampling') {
        details.push('*' + t('speed.last') + ' · ' + t('speed.sampling') + '*');
      }
      const detailPart = details.length > 0 ? ' · ' + details.join(' · ') : '';
      detailGroup.push('⚡ ' + t('speed.label') + ': **' + speedValue + '**' + detailPart + ' · *' + t('speed.hint') + '*');
    } else if (speedState === 'sampling') {
      detailGroup.push('⚡ ' + t('speed.label') + ': *' + t('speed.sampling') + '*');
    } else if (speedState === 'unsupported') {
      detailGroup.push('⚡ ' + t('speed.label') + ': ' + t('speed.unsupported'));
    } else if (session.outputSpeedIntegrationEnabled) {
      detailGroup.push('⚡ ' + t('speed.label') + ': ' + t('speed.terminalEnabled') + ' *' + t('speed.autoNote') + '*');
    } else if (speedState === 'waiting') {
      detailGroup.push('⚡ ' + t('speed.label') + ': ' + t('speed.waiting'));
    }
  }

  if (sec.tokens) {
    const inTokens = formatK(session.tokenUsage.inputTokens);
    const cacheRead = formatK(session.tokenUsage.cacheReadTokens);
    const outTokens = formatK(session.tokenUsage.outputTokens);
    const totalIn = session.tokenUsage.inputTokens + session.tokenUsage.cacheReadTokens;
    const hitRate = totalIn > 0 ? Math.round((session.tokenUsage.cacheReadTokens / totalIn) * 100) : 0;
    detailGroup.push(`Token: 入 **${inTokens}** · 出 **${outTokens}** · 缓存 **${cacheRead}** *(${hitRate}%)*`);
  }

  if (sec.todos && session.todos.length > 0) {
    const completed = session.todos.filter((td) => td.status === 'completed').length;
    const inProgress = session.todos.find((td) => td.status === 'in_progress');
    const todoPct = Math.round((completed / session.todos.length) * 100);
    let todoSummary = `📋 待办: **${completed}/${session.todos.length}** *(${todoPct}%)*`;
    if (inProgress) {
      const cleanContent = sanitizeMarkdownCode(inProgress.content);
      const shortContent = cleanContent.length > 18 ? cleanContent.substring(0, 16) + '...' : cleanContent;
      todoSummary += ` · 🔄 *${escHtml(shortContent)}*`;
    }
    detailGroup.push(`${todoSummary} · [面板 →](command:claudeHub.openDashboard)`);
  }

  if (sec.agents && session.agents && session.agents.length > 0) {
    const runningAgents = session.agents.filter((a) => a.status === 'running').length;
    const subTokens = session.subagentsTotalTokens ? ' · +' + formatK(session.subagentsTotalTokens) : '';
    const agentStatus = runningAgents > 0 ? `${runningAgents} 运行中 / 共 ${session.agents.length}` : `${session.agents.length} 个`;
    detailGroup.push(`协作代理: **${agentStatus}**${subTokens} · [拓扑 →](command:claudeHub.openDashboard)`);
  }

  if (sec.quota && subscription && subscription.session) {
    let resetStr = '';
    if (subscription.session.resetsAt) {
      const diffMs = subscription.session.resetsAt.getTime() - now;
      if (diffMs > 0) {
        const h = Math.floor(diffMs / (1000 * 60 * 60));
        const min = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        resetStr = ` (${h}h ${min}m 重置)`;
      }
    }
    detailGroup.push(`5h 配额: **${subscription.session.percentage}%**${resetStr}`);
  }

  if (detailGroup.length > 0) {
    parts.push('---\n\n' + detailGroup.join('\n\n'));
  }

  if (sec.actions) {
    const filterLabel = filterMode === 'currentWorkspace' ? t('status.quickAll') : t('status.quickCurrent');
    parts.push(
      '---\n' +
        `[${t('status.quickDashboard')}](command:claudeHub.openDashboard)  ·  ` +
        `[↗ ${t('status.md.actTab')}](command:claudeHub.openDashboardTab)  ·  ` +
        `[${t('status.quickRefresh')}](command:claudeHub.refresh)  ·  ` +
        `[${filterLabel}](command:claudeHub.toggleFilter)  ·  ` +
        `[${t('status.quickSwitch')}](command:claudeHub.switchSession)  ·  ` +
        `[⚙ ${t('status.md.actStyle')}](command:claudeHub.configureStatusBar)`,
    );
  }

  return parts.join('\n\n');
}
