export type StatusBarPreset = 'compact' | 'minimal' | 'detailed' | 'hud' | 'custom';
export type StatusBarContextFormat = 'percent' | 'tokens' | 'both';
export type StatusBarPosition = 'right' | 'left';

export interface StatusBarRenderOptions {
  preset: StatusBarPreset;
  contextFormat: StatusBarContextFormat;
  showProgressBar: boolean;
  showModel: boolean;
  showCost: boolean;
  showGitBranch: boolean;
  showTodos: boolean;
  showTools: boolean;
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
  gitBranch?: string;
  todos?: Array<{ status?: string }>;
  options: StatusBarRenderOptions;
}

export interface ConfigGetter {
  get<T>(key: string, defaultValue?: T): T | undefined;
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

export function resolveRenderOptions(config: ConfigGetter): StatusBarRenderOptions {
  const preset = (config.get<StatusBarPreset>('statusBar.preset', 'compact') as StatusBarPreset) || 'compact';

  if (preset === 'minimal') {
    return {
      preset,
      contextFormat: 'percent',
      showProgressBar: false,
      showModel: false,
      showCost: false,
      showGitBranch: false,
      showTodos: false,
      showTools: false,
    };
  }

  if (preset === 'compact') {
    return {
      preset,
      contextFormat: 'percent',
      showProgressBar: false,
      showModel: true,
      showCost: false,
      showGitBranch: false,
      showTodos: false,
      showTools: true,
    };
  }

  if (preset === 'detailed') {
    return {
      preset,
      contextFormat: 'both',
      showProgressBar: true,
      showModel: true,
      showCost: true,
      showGitBranch: true,
      showTodos: true,
      showTools: true,
    };
  }

  if (preset === 'hud') {
    return {
      preset,
      contextFormat: 'percent',
      showProgressBar: true,
      showModel: true,
      showCost: true,
      showGitBranch: false,
      showTodos: false,
      showTools: true,
    };
  }

  // Custom mode: read individual user configurations
  return {
    preset: 'custom',
    contextFormat: (config.get<StatusBarContextFormat>('statusBar.contextFormat', 'percent') as StatusBarContextFormat) || 'percent',
    showProgressBar: config.get<boolean>('statusBar.showProgressBar', false) ?? false,
    showModel: config.get<boolean>('statusBar.showModel', true) ?? true,
    showCost: config.get<boolean>('statusBar.showCost', false) ?? false,
    showGitBranch: config.get<boolean>('statusBar.showGitBranch', false) ?? false,
    showTodos: config.get<boolean>('statusBar.showTodos', false) ?? false,
    showTools: config.get<boolean>('statusBar.showTools', true) ?? true,
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
    gitBranch,
    todos,
    options,
  } = input;

  const icon = hasRunningTool ? '$(sync~spin)' : '$(sparkle)';
  const pctStr = `${percentage}%`;
  const tokensStr = `${formatK(totalTokens)}/${formatK(contextLimit)}`;

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
      extraParts.push(`◐ ${activeToolName} (${elapsedSec}s)`);
    } else if (options.showCost && cost) {
      extraParts.push(cost);
    }
    if (options.showGitBranch && gitBranch) {
      extraParts.push(`git:(${gitBranch})`);
    }

    if (extraParts.length > 0) {
      statusPart += ` │ ${extraParts.join(' │ ')}`;
    }
    return statusPart;
  }

  // 2. Minimal Preset: $(sparkle) 7%
  if (options.preset === 'minimal') {
    return `${icon} ${pctStr}`;
  }

  // 3. Compact Preset: $(sparkle) 7% · Sonnet 3.7 OR $(sync~spin) 7% · Tool (3s)
  if (options.preset === 'compact') {
    if (hasRunningTool && activeToolName && options.showTools) {
      return `${icon} ${pctStr} · ${activeToolName} (${elapsedSec}s)`;
    }
    if (options.showModel && modelDisplay) {
      return `${icon} ${pctStr} · ${modelDisplay}`;
    }
    return `${icon} ${pctStr}`;
  }

  // 4. Detailed or Custom Presets: build modularly
  const parts: string[] = [];

  // Running tool activity takes front seat if enabled
  if (hasRunningTool && activeToolName && options.showTools) {
    parts.push(`${activeToolName} (${elapsedSec}s)`);
  }

  if (options.showModel && modelDisplay) {
    parts.push(modelDisplay);
  }

  if (options.showCost && cost) {
    parts.push(cost);
  }

  if (options.showTodos && todos && todos.length > 0) {
    const completed = todos.filter((td) => td && td.status === 'completed').length;
    parts.push(`☑ ${completed}/${todos.length}`);
  }

  if (options.showGitBranch && gitBranch) {
    parts.push(`🌿 ${gitBranch}`);
  }

  const barPrefix = options.showProgressBar ? `${formatProgressBar(percentage, 5)} ` : '';
  const mainPart = `${icon} ${barPrefix}${contextValueStr}`;

  if (parts.length > 0) {
    return `${mainPart} · ${parts.join(' · ')}`;
  }
  return mainPart;
}
