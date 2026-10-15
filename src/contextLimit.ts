const CONTEXT_1M = 1_000_000;
const CONTEXT_200K = 200_000;
/** Gemini 3.8 Flash and Gemini 4 Argon: 1,048,576. */
const CONTEXT_GEMINI = 1_048_576;
/** GPT-5.6 Sol/Terra/Luna and GPT-6: 1,050,000. */
const CONTEXT_GPT = 1_050_000;

const CONTEXT_200K_MODELS: readonly string[] = [
  'claude-3-5-sonnet',
  'claude-3-5-haiku',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku',
  'claude-opus-4-0',
  'claude-opus-4-1',
  'claude-opus-4-5',
  'claude-sonnet-4-0',
  'claude-sonnet-4-5',
  'haiku-4-5',
  'haiku-4.5',
];

function lookupModelLimit(model: string, modelContextLimits: Record<string, number>): number | undefined {
  if (typeof modelContextLimits[model] === 'number') return modelContextLimits[model];
  const id = model.toLowerCase();
  for (const [key, value] of Object.entries(modelContextLimits)) {
    if (key.toLowerCase() === id && typeof value === 'number') return value;
  }
  return undefined;
}

/**
 * Published context window for the usage percentage, matched on the model name.
 * Gemini 4 Argon and Gemini 3.8 Flash are both 1,048,576.
 * GPT-5.6 and GPT-6 are 1,050,000. DeepSeek V4 and current Claude models are 1M.
 * Haiku 4.5 and older Claude models stay at 200k.
 * An explicit `[1m]` / `[200k]` marker on the id wins over the family default.
 */
export function getContextLimitForModel(
  model: string,
  userLimit = 200000,
  modelContextLimits: Record<string, number> = {},
): number {
  const override = lookupModelLimit(model, modelContextLimits);
  if (override !== undefined) return override;

  const id = model.toLowerCase().trim();
  if (!id || id === 'auto' || id === 'claude.auto') return userLimit;

  const published = publishedContextWindow(id);
  if (published !== undefined) return published;

  if (!id.startsWith('claude')) return userLimit;

  if (CONTEXT_200K_MODELS.some((m) => id.includes(m))) return CONTEXT_200K;

  return CONTEXT_1M;
}

function publishedContextWindow(id: string): number | undefined {
  if (/(^|[^a-z0-9])1m([^a-z0-9]|$)/.test(id)) return CONTEXT_1M;
  if (/(^|[^a-z0-9])200k([^a-z0-9]|$)/.test(id)) return CONTEXT_200K;
  if (id.includes('gemini-4') || id.includes('gemini-3')) return CONTEXT_GEMINI;
  if (/gpt-(?:5\.6|5-6|6)/.test(id)) return CONTEXT_GPT;
  if (id.includes('deepseek-v4') || id.includes('deepseek-flash')) return CONTEXT_1M;
  if (id.includes('haiku-4.5') || id.includes('haiku-4-5')) return CONTEXT_200K;
  return undefined;
}

export function formatModelDisplayName(
  model: string,
  customNames?: Record<string, string> | Map<string, string>,
): string {
  if (!model) return 'Claude';

  if (customNames) {
    if (customNames instanceof Map) {
      const match = customNames.get(model) || customNames.get(model.toLowerCase());
      if (match) return match;
    } else {
      const match = customNames[model] || customNames[model.toLowerCase()];
      if (match) return match;
    }
  }

  const m = model.toLowerCase().trim();
  if (m === 'claude.auto' || m === 'auto') return 'Auto';

  if (m.includes('3-7-sonnet') || m.includes('3.7-sonnet')) return 'Sonnet 3.7';
  if (m.includes('3-5-sonnet') || m.includes('3.5-sonnet')) return 'Sonnet 3.5';
  if (m.includes('3-5-haiku') || m.includes('3.5-haiku')) return 'Haiku 3.5';
  if (m.includes('sonnet-5')) return 'Sonnet 5';
  if (m.includes('haiku-4-5') || m.includes('haiku-4.5')) return 'Haiku 4.5';
  if (m.includes('fable-5')) return 'Fable 5';
  if (m.includes('opus-5[1m]')) return 'Opus 5 (1M)';
  if (m.includes('opus-5')) return 'Opus 5';

  if (m.includes('sonnet')) return 'Sonnet';
  if (m.includes('opus')) return 'Opus';
  if (m.includes('haiku')) return 'Haiku';
  if (m.includes('fable')) return 'Fable';

  const gatewayRest = gatewayModelRemainder(model);
  if (gatewayRest) return gatewayRest;

  return model.replace(/^claude[.-]/i, '');
}

/**
 * `claude.<provider>.<model>` → model.
 * `claude.gemini-3.8-flash` is a single id whose version contains dots, not a provider prefix.
 * Splitting that one yields a leading digit (`8-flash`), so it is left intact.
 */
export function gatewayModelRemainder(model: string): string | undefined {
  const match = /^claude\.([^.]+)\.(.+)$/i.exec(model.trim());
  if (!match) return undefined;
  const rest = match[2];
  if (/^\d/.test(rest)) return undefined;
  return rest;
}

/** Composer effort chip, e.g. high → High. Empty when unset. */
export function formatEffortLabel(effort?: string): string {
  const level = (effort || '').trim().toLowerCase();
  if (!level) return '';
  if (level === 'xhigh') return 'xHigh';
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * Display name for the model selected in Claude Code, including effort
 * when it is not already part of the name ("gemini-3.8-flash High").
 */
export function formatSelectedModelName(
  model: string,
  customNames?: Record<string, string> | Map<string, string>,
  effort?: string,
): string {
  const name = formatModelDisplayName(model, customNames);
  const suffix = formatEffortLabel(effort);
  if (!suffix) return name;
  if (/(?:^|[\s._-])(xhigh|max|high|medium|low)$/i.test(name)) return name;
  return `${name} ${suffix}`;
}
