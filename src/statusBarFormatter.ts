export type StatusBarPreset = 'compact' | 'minimal' | 'speed' | 'detailed' | 'hud' | 'custom';
export type StatusBarContextFormat = 'percent' | 'tokens' | 'both';
export type StatusBarPosition = 'right' | 'left';
export type StatusBarStyle = 'modern' | 'classic';
export type StatusBarSeparator = 'dot' | 'pipe';

export interface StatusBarTooltipSections {
  context: boolean;
  speed: boolean;
  modelBranch: boolean;
  activityDur: boolean;
  tokens: boolean;
  todos: boolean;
  agents: boolean;
  quota: boolean;
  actions: boolean;
}

export const DEFAULT_TOOLTIP_SECTIONS: StatusBarTooltipSections = {
  context: true,
  speed: true,
  modelBranch: true,
  activityDur: true,
  tokens: true,
  todos: true,
  agents: true,
  quota: true,
  actions: true,
};

export interface StatusBarRenderOptions {
  preset: StatusBarPreset;
  style?: StatusBarStyle;
  separator?: StatusBarSeparator;
  contextFormat: StatusBarContextFormat;
  showContext?: boolean;
  showProgressBar: boolean;
  showSpeed?: boolean;
  showModel: boolean;
  showCost: boolean;
  showGitBranch: boolean;
  showTodos: boolean;
  showTools: boolean;
  showDuration?: boolean;
  showAgents?: boolean;
}

export interface StatusBarFormatInput {
  percentage: number;
  totalTokens: number;
  contextLimit: number;
  modelDisplay: string;
  hasRunningTool: boolean;
  activeToolName?: string;
  elapsedSec?: number;
  cost?: string;
  outputTokensPerSecond?: number;
  gitBranch?: string;
  todos?: Array<{ status?: string }>;
  durationMs?: number;
  agentsRunning?: number;
  agentsTotal?: number;
  options: StatusBarRenderOptions;
}

export interface ConfigGetter {
  get<T>(key: string, defaultValue?: T): T | undefined;
}

export function resolveTooltipSections(config: ConfigGetter): StatusBarTooltipSections {
  const raw = config.get<Partial<StatusBarTooltipSections>>('statusBar.tooltipSections', DEFAULT_TOOLTIP_SECTIONS);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_TOOLTIP_SECTIONS };
  }
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

export function formatProgressBar(percentage: number, length = 6): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * length);
  const empty = length - filled;
  return '▰'.repeat(filled) + '▱'.repeat(empty);
}

export function formatK(tokens: number): string {
  if (tokens >= 1_000_000) {
    return (tokens / 1_000_000).toFixed(1) + 'M';
  }
  if (tokens >= 1_000) {
    return (tokens / 1_000).toFixed(1) + 'k';
  }
  return String(tokens);
}

/**
 * Formats a duration in milliseconds into a compact human-readable string.
 * @param ms Duration in milliseconds
 * @param precise If true, includes seconds when under 1 hour (e.g. "12m 30s")
 */
export function formatDuration(ms: number, precise: boolean = false): string {
  if (isNaN(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) {
    return precise ? `${totalSec}s` : (totalSec === 0 ? '< 1m' : `${totalSec}s`);
  }
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes < 60) {
    return precise && seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/**
 * Formats a measured average output speed for compact UI display.
 * Only positive finite values are meaningful; anything else renders as an em dash.
 */
export function formatOutputSpeed(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return '—';
  }
  return value.toFixed(1) + ' tok/s';
}

/**
 * Whether the status bar item should be hidden because Claude Code is not being used.
 * A session whose Claude Code process has exited is never in use, regardless of how
 * recently its transcript was written. Otherwise it counts as in use when the process
 * is busy, the session is not idle, or background jobs are still running.
 */
export function shouldHideStatusBar(
  session: {
    isIdle: boolean;
    processLive?: boolean;
    processBusy?: boolean;
    backgroundJobs?: Array<{ status?: string }>;
  } | null | undefined,
  hideWhenInactive: boolean,
): boolean {
  if (!hideWhenInactive) return false;
  if (!session) return true;
  if (session.processLive === false) return true;
  if (session.processBusy) return false;
  if (!session.isIdle) return false;
  return !(session.backgroundJobs || []).some((job) => job.status === 'running');
}

export function resolveRenderOptions(config: ConfigGetter): StatusBarRenderOptions {
  const preset = (config.get<StatusBarPreset>('statusBar.preset', 'compact') as StatusBarPreset) || 'compact';
  const rawStyle = config.get<string>('statusBar.style', 'modern');
  const style: StatusBarStyle = rawStyle === 'classic' ? 'classic' : 'modern';
  const rawSep = config.get<string>('statusBar.separator', 'dot');
  const separator: StatusBarSeparator = rawSep === 'pipe' ? 'pipe' : 'dot';
  const showSpeed = config.get<boolean>('statusBar.showSpeed', true) ?? true;

  if (preset === 'minimal') {
    return {
      preset,
      style,
      separator,
      contextFormat: 'percent',
      showContext: true,
      showProgressBar: false,
      showSpeed: false,
      showModel: false,
      showCost: false,
      showGitBranch: false,
      showTodos: false,
      showTools: false,
      showDuration: false,
      showAgents: false,
    };
  }

  if (preset === 'speed') {
    return {
      preset,
      style,
      separator,
      contextFormat: 'percent',
      showContext: false,
      showProgressBar: false,
      showSpeed: true,
      showModel: true,
      showCost: false,
      showGitBranch: false,
      showTodos: false,
      showTools: true,
      showDuration: false,
      showAgents: false,
    };
  }

  if (preset === 'compact') {
    return {
      preset,
      style,
      separator,
      contextFormat: 'percent',
      showContext: true,
      showProgressBar: false,
      showSpeed,
      showModel: true,
      showCost: false,
      showGitBranch: false,
      showTodos: false,
      showTools: true,
      showDuration: false,
      showAgents: false,
    };
  }

  if (preset === 'detailed') {
    return {
      preset,
      style,
      separator,
      contextFormat: 'both',
      showContext: true,
      showProgressBar: true,
      showSpeed,
      showModel: true,
      showCost: true,
      showGitBranch: true,
      showTodos: true,
      showTools: true,
      showDuration: false,
      showAgents: false,
    };
  }

  if (preset === 'hud') {
    return {
      preset,
      style,
      separator: 'pipe',
      contextFormat: 'percent',
      showContext: true,
      showProgressBar: true,
      showSpeed,
      showModel: true,
      showCost: true,
      showGitBranch: false,
      showTodos: false,
      showTools: true,
      showDuration: false,
      showAgents: false,
    };
  }

  // Custom mode: read individual user configurations
  return {
    preset: 'custom',
    style,
    separator,
    contextFormat: (config.get<StatusBarContextFormat>('statusBar.contextFormat', 'percent') as StatusBarContextFormat) || 'percent',
    showContext: config.get<boolean>('statusBar.showContext', true) ?? true,
    showProgressBar: config.get<boolean>('statusBar.showProgressBar', false) ?? false,
    showSpeed,
    showModel: config.get<boolean>('statusBar.showModel', true) ?? true,
    showCost: config.get<boolean>('statusBar.showCost', false) ?? false,
    showGitBranch: config.get<boolean>('statusBar.showGitBranch', false) ?? false,
    showTodos: config.get<boolean>('statusBar.showTodos', false) ?? false,
    showTools: config.get<boolean>('statusBar.showTools', true) ?? true,
    showDuration: config.get<boolean>('statusBar.showDuration', false) ?? false,
    showAgents: config.get<boolean>('statusBar.showAgents', false) ?? false,
  };
}

export function formatStatusBarText(input: StatusBarFormatInput): string {
  const {
    percentage,
    totalTokens,
    contextLimit,
    modelDisplay,
    hasRunningTool,
    activeToolName,
    elapsedSec = 0,
    cost,
    outputTokensPerSecond,
    gitBranch,
    todos,
    durationMs,
    agentsRunning = 0,
    agentsTotal = 0,
    options,
  } = input;

  const isModern = options.style === 'modern';
  const sep = options.separator === 'pipe' ? ' │ ' : ' · ';
  const icon = hasRunningTool ? '$(sync~spin)' : '$(sparkle)';
  const pctStr = `${percentage}%`;
  const tokensStr = `${formatK(totalTokens)}/${formatK(contextLimit)}`;
  const speedText = formatOutputSpeed(outputTokensPerSecond);
  const speedEnabled = options.preset !== 'minimal' && options.showSpeed !== false;
  const speedSuffix = speedEnabled && speedText !== '—' ? `${sep}${speedText}` : '';

  let contextValueStr = pctStr;
  if (options.contextFormat === 'tokens') {
    contextValueStr = tokensStr;
  } else if (options.contextFormat === 'both') {
    contextValueStr = `${pctStr} (${tokensStr})`;
  }

  // 1. HUD Preset: [Model] ▰▰▱▱ 7% │ $0.02 or [Model] ▰▰▱▱ 7% │ ◐ Tool (3s)
  if (options.preset === 'hud') {
    const bar = formatProgressBar(percentage, 5);
    const badge = modelDisplay ? `[${modelDisplay}] ` : '';
    let statusPart = `${badge}${bar} ${percentage}%`;

    const extraParts: string[] = [];
    if (hasRunningTool && activeToolName && options.showTools) {
      extraParts.push(isModern ? `${activeToolName} (${elapsedSec}s)` : `◐ ${activeToolName} (${elapsedSec}s)`);
    } else if (options.showCost && cost) {
      extraParts.push(cost);
    }
    if (options.showGitBranch && gitBranch) {
      extraParts.push(isModern ? `$(git-branch) ${gitBranch}` : `git:(${gitBranch})`);
    }

    if (extraParts.length > 0) {
      statusPart += ` │ ${extraParts.join(' │ ')}`;
    }
    return statusPart + (speedEnabled && speedText !== '—' ? ` · ${speedText}` : '');
  }

  // 2. Minimal Preset: $(sparkle) 7%
  if (options.preset === 'minimal') {
    return `${icon} ${pctStr}`;
  }

  // 3. Speed-first Preset (Copilot Speedometer style): $(sparkle) 58.4 tok/s · Opus 5.5
  if (options.preset === 'speed') {
    const segs: string[] = [];
    if (speedText !== '—') {
      segs.push(speedText);
    } else {
      segs.push(pctStr);
    }
    if (hasRunningTool && activeToolName && options.showTools) {
      segs.push(`${activeToolName} (${elapsedSec}s)`);
    } else if (options.showModel && modelDisplay) {
      segs.push(modelDisplay);
    }
    return `${icon} ${segs.join(sep)}`;
  }

  // 4. Compact Preset: $(sparkle) 7% · Sonnet 3.7 OR $(sync~spin) 7% · Tool (3s)
  if (options.preset === 'compact') {
    if (hasRunningTool && activeToolName && options.showTools) {
      return `${icon} ${pctStr}${sep}${activeToolName} (${elapsedSec}s)` + speedSuffix;
    }
    if (options.showModel && modelDisplay) {
      return `${icon} ${pctStr}${sep}${modelDisplay}` + speedSuffix;
    }
    return `${icon} ${pctStr}` + speedSuffix;
  }

  // 5. Detailed or Custom Presets: build modularly across all 10 toggles
  const parts: string[] = [];

  if (hasRunningTool && activeToolName && options.showTools) {
    parts.push(`${activeToolName} (${elapsedSec}s)`);
  }

  if (options.showModel && modelDisplay) {
    parts.push(modelDisplay);
  }

  if (options.showCost && cost) {
    parts.push(cost);
  }

  if (options.showDuration && typeof durationMs === 'number' && durationMs > 0) {
    parts.push(formatDuration(durationMs, false));
  }

  if (options.showTodos && todos && todos.length > 0) {
    const completed = todos.filter((td) => td && td.status === 'completed').length;
    parts.push(isModern ? `$(check) ${completed}/${todos.length}` : `☑ ${completed}/${todos.length}`);
  }

  if (options.showAgents && agentsTotal > 0) {
    const agLabel = agentsRunning > 0 ? `${agentsRunning}/${agentsTotal}` : `${agentsTotal}`;
    parts.push(isModern ? `$(hubot) ${agLabel}` : `🤖 ${agLabel}`);
  }

  if (options.showGitBranch && gitBranch) {
    parts.push(isModern ? `$(git-branch) ${gitBranch}` : `🌿 ${gitBranch}`);
  }

  const showContext = options.showContext !== false;
  const barPrefix = options.showProgressBar ? `${formatProgressBar(percentage, 5)} ` : '';
  const contextSeg = showContext ? `${barPrefix}${contextValueStr}` : barPrefix.trim();

  if (contextSeg) {
    const mainPart = `${icon} ${contextSeg}`;
    if (parts.length > 0) {
      return `${mainPart}${sep}${parts.join(sep)}` + speedSuffix;
    }
    return mainPart + speedSuffix;
  }

  if (speedEnabled && speedText !== '—') {
    parts.push(speedText);
  }
  if (parts.length > 0) {
    return `${icon} ${parts.join(sep)}`;
  }
  return `${icon} Claude Hub`;
}
