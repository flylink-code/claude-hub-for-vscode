/**
 * Model pricing table and alias resolution for Claude Hub cost estimates.
 * Source: Anthropic Claude API list prices (docs.anthropic.com), as of 2026-10-10.
 * Rates are USD per million tokens (MTok). cacheWrite uses the 5-minute cache-write rate.
 * Non-official / unknown models resolve as unpriced (never silent Sonnet fallback).
 */

export const PRICING_TABLE_VERSION = '2026-10-10';

export type ModelFamily = 'opus' | 'sonnet' | 'haiku' | 'fable' | 'mythos' | 'other';

export interface ModelRates {
  /** USD per MTok */
  input: number;
  output: number;
  cacheRead: number;
  /** 5-minute prompt-cache write USD per MTok */
  cacheWrite: number;
}

export interface PricedModel {
  id: string;
  family: ModelFamily;
  displayName: string;
  rates: ModelRates;
  /** Optional note e.g. retired / tiered */
  note?: string;
}

export interface CostEstimate {
  usd: number | null;
  priced: boolean;
  canonicalId: string | null;
  family: ModelFamily;
  rates: ModelRates | null;
  displayName: string;
}

/** Built-in priced models (canonical ids). */
export const PRICED_MODELS: readonly PricedModel[] = [
  {
    id: 'claude-fable-5.1',
    family: 'fable',
    displayName: 'Fable 5.1',
    rates: { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
  },
  {
    id: 'claude-mythos-5.1',
    family: 'mythos',
    displayName: 'Mythos 5.1',
    rates: { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
    note: 'limited availability',
  },
  {
    id: 'claude-fable-5',
    family: 'fable',
    displayName: 'Fable 5',
    rates: { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 },
  },
  {
    id: 'claude-mythos-5',
    family: 'mythos',
    displayName: 'Mythos 5',
    rates: { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 },
    note: 'limited availability',
  },
  {
    id: 'claude-opus-5.5',
    family: 'opus',
    displayName: 'Opus 5.5',
    rates: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  },
  {
    id: 'claude-opus-5',
    family: 'opus',
    displayName: 'Opus 5',
    rates: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  },
  {
    id: 'claude-opus-4.8',
    family: 'opus',
    displayName: 'Opus 4.8',
    rates: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  },
  {
    id: 'claude-opus-4.7',
    family: 'opus',
    displayName: 'Opus 4.7',
    rates: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  },
  {
    id: 'claude-opus-4.6',
    family: 'opus',
    displayName: 'Opus 4.6',
    rates: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  },
  {
    id: 'claude-opus-4.5',
    family: 'opus',
    displayName: 'Opus 4.5',
    rates: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  },
  {
    id: 'claude-opus-4.1',
    family: 'opus',
    displayName: 'Opus 4.1',
    rates: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
    note: 'retired',
  },
  {
    id: 'claude-opus-4',
    family: 'opus',
    displayName: 'Opus 4',
    rates: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
    note: 'retired',
  },
  {
    id: 'claude-sonnet-5.5',
    family: 'sonnet',
    displayName: 'Sonnet 5.5',
    rates: { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  },
  {
    id: 'claude-sonnet-5',
    family: 'sonnet',
    displayName: 'Sonnet 5',
    rates: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  },
  {
    id: 'claude-sonnet-4.6',
    family: 'sonnet',
    displayName: 'Sonnet 4.6',
    rates: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  },
  {
    id: 'claude-sonnet-4.5',
    family: 'sonnet',
    displayName: 'Sonnet 4.5',
    rates: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  },
  {
    id: 'claude-sonnet-4',
    family: 'sonnet',
    displayName: 'Sonnet 4',
    rates: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
    note: 'retired',
  },
  {
    id: 'claude-3-7-sonnet',
    family: 'sonnet',
    displayName: 'Sonnet 3.7',
    // Legacy estimate aligned with Sonnet 4.x list tier when exact row unavailable
    rates: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
    note: 'legacy estimate',
  },
  {
    id: 'claude-3-5-sonnet',
    family: 'sonnet',
    displayName: 'Sonnet 3.5',
    rates: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
    note: 'legacy estimate',
  },
  {
    id: 'claude-haiku-5.5',
    family: 'haiku',
    displayName: 'Haiku 5.5',
    // Use <=100K prompt tier as default estimate
    rates: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
    note: 'default <=100K prompt tier; higher tier above 100K',
  },
  {
    id: 'claude-haiku-4.5',
    family: 'haiku',
    displayName: 'Haiku 4.5',
    rates: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  },
  {
    id: 'claude-3-5-haiku',
    family: 'haiku',
    displayName: 'Haiku 3.5',
    rates: { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
    note: 'retired',
  },
  {
    id: 'claude-3-opus',
    family: 'opus',
    displayName: 'Opus 3',
    rates: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
    note: 'legacy',
  },
];

/** Alias -> canonical priced model id. */
const ALIAS_TO_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const add = (alias: string, id: string) => {
    const key = alias.toLowerCase().trim();
    if (key && !map[key]) map[key] = id;
  };

  for (const m of PRICED_MODELS) {
    add(m.id, m.id);
    add(m.displayName, m.id);
    add(m.displayName.replace(/\s+/g, '-'), m.id);
    add(m.displayName.replace(/\s+/g, ''), m.id);
  }

  // Common short / dated / dotted aliases
  const extras: Array<[string, string]> = [
    ['opus', 'claude-opus-5'],
    ['claude-opus', 'claude-opus-5'],
    ['claude-opus-5[1m]', 'claude-opus-5'],
    ['sonnet', 'claude-sonnet-5'],
    ['claude-sonnet', 'claude-sonnet-5'],
    ['haiku', 'claude-haiku-4.5'],
    ['claude-haiku', 'claude-haiku-4.5'],
    ['fable', 'claude-fable-5'],
    ['claude-fable', 'claude-fable-5'],
    ['mythos', 'claude-mythos-5'],
    ['sonnet-5.5', 'claude-sonnet-5.5'],
    ['sonnet-5', 'claude-sonnet-5'],
    ['sonnet-4.6', 'claude-sonnet-4.6'],
    ['sonnet-4.5', 'claude-sonnet-4.5'],
    ['sonnet-4', 'claude-sonnet-4'],
    ['sonnet-3.7', 'claude-3-7-sonnet'],
    ['3.7-sonnet', 'claude-3-7-sonnet'],
    ['sonnet-3.5', 'claude-3-5-sonnet'],
    ['3.5-sonnet', 'claude-3-5-sonnet'],
    ['haiku-5.5', 'claude-haiku-5.5'],
    ['haiku-4.5', 'claude-haiku-4.5'],
    ['haiku-4-5', 'claude-haiku-4.5'],
    ['haiku-3.5', 'claude-3-5-haiku'],
    ['3.5-haiku', 'claude-3-5-haiku'],
    ['opus-5.5', 'claude-opus-5.5'],
    ['opus-5', 'claude-opus-5'],
    ['opus-4.8', 'claude-opus-4.8'],
    ['opus-4.7', 'claude-opus-4.7'],
    ['opus-4.6', 'claude-opus-4.6'],
    ['opus-4.5', 'claude-opus-4.5'],
    ['opus-4.1', 'claude-opus-4.1'],
    ['opus-4', 'claude-opus-4'],
    ['claude-opus-4-5', 'claude-opus-4.5'],
    ['claude-opus-4-1', 'claude-opus-4.1'],
    ['claude-sonnet-4-5', 'claude-sonnet-4.5'],
    ['claude-sonnet-4-0', 'claude-sonnet-4'],
    ['claude-opus-4-0', 'claude-opus-4'],
    ['claude-haiku-4-5', 'claude-haiku-4.5'],
    ['default', 'claude-sonnet-5'],
    ['recommended', 'claude-sonnet-5'],
  ];
  for (const [a, id] of extras) add(a, id);

  return map;
})();

const MODEL_BY_ID = new Map(PRICED_MODELS.map((m) => [m.id, m]));


export interface PricingRateOverride {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
}

export interface PricingOverrides {
  /** canonical or alias id -> partial rates (USD / MTok) */
  rates?: Record<string, PricingRateOverride>;
  /** alias -> canonical priced model id */
  aliases?: Record<string, string>;
}

let activeOverrides: PricingOverrides = {};

export function setPricingOverrides(overrides?: PricingOverrides | null): void {
  activeOverrides = overrides && typeof overrides === 'object' ? overrides : {};
}

export function getPricingOverrides(): PricingOverrides {
  return activeOverrides;
}

export function cleanModelKeyForPricing(rawKey: string): string {
  if (!rawKey) return '';
  const trimmed = rawKey.trim();
  // Strip claude.<provider>. prefix used by gateways
  const multiDot = /^claude\.[^.]+\.(.+)$/i.exec(trimmed);
  if (multiDot?.[1]) return multiDot[1];
  return trimmed.replace(/^claude[.-]/i, '');
}

export function normalizeModelId(model: string): string {
  return (model || '').toLowerCase().trim();
}

/**
 * Resolve a raw model string to a priced model when possible.
 * Unknown / non-official models return null (unpriced) — never invent Sonnet rates.
 */
export function resolvePricedModel(model: string): PricedModel | null {
  const raw = normalizeModelId(model);
  if (!raw || raw === 'auto' || raw === 'claude.auto') return null;

  const ovAliasRaw = activeOverrides.aliases?.[raw] || activeOverrides.aliases?.[model];
  if (ovAliasRaw) {
    const mapped = normalizeModelId(ovAliasRaw);
    if (ALIAS_TO_ID[mapped]) return MODEL_BY_ID.get(ALIAS_TO_ID[mapped]) ?? null;
    if (MODEL_BY_ID.has(mapped)) return MODEL_BY_ID.get(mapped) ?? null;
  }

  // Exact alias / id
  if (ALIAS_TO_ID[raw]) {
    return MODEL_BY_ID.get(ALIAS_TO_ID[raw]) ?? null;
  }

  const cleaned = cleanModelKeyForPricing(raw).toLowerCase();
  if (cleaned && ALIAS_TO_ID[cleaned]) {
    return MODEL_BY_ID.get(ALIAS_TO_ID[cleaned]) ?? null;
  }

  // Dated Anthropic ids: claude-sonnet-4-5-20250929 etc.
  const dated = raw.match(
    /claude-(opus|sonnet|haiku|fable|mythos)-(\d+(?:[.-]\d+)*)/i,
  );
  if (dated) {
    const family = dated[1].toLowerCase();
    const ver = dated[2].replace(/-/g, '.');
    const candidate = `claude-${family}-${ver}`;
    if (ALIAS_TO_ID[candidate]) return MODEL_BY_ID.get(ALIAS_TO_ID[candidate]) ?? null;
    // Try without trailing patch: 4.5.0 -> 4.5
    const short = candidate.replace(/\.\d+$/, '');
    if (ALIAS_TO_ID[short]) return MODEL_BY_ID.get(ALIAS_TO_ID[short]) ?? null;
  }

  // Legacy 3.x
  if (raw.includes('3-7-sonnet') || raw.includes('3.7-sonnet')) {
    return MODEL_BY_ID.get('claude-3-7-sonnet') ?? null;
  }
  if (raw.includes('3-5-sonnet') || raw.includes('3.5-sonnet')) {
    return MODEL_BY_ID.get('claude-3-5-sonnet') ?? null;
  }
  if (raw.includes('3-5-haiku') || raw.includes('3.5-haiku')) {
    return MODEL_BY_ID.get('claude-3-5-haiku') ?? null;
  }
  if (raw.includes('claude-3-opus') || (raw === 'claude-opus' && !raw.includes('4') && !raw.includes('5'))) {
    return MODEL_BY_ID.get('claude-3-opus') ?? null;
  }

  // Non-official / gateway ids stay unpriced (never silent Sonnet).
  if (/^claude\.[^.]+\./i.test(model)) return null;
  if (/gpt|gemini|llama|qwen|deepseek|mistral|\bo1\b|\bo3\b|astra/i.test(raw + ' ' + cleaned)) return null;

  const looksClaude =
    raw.startsWith('claude') ||
    raw.includes('opus') ||
    raw.includes('sonnet') ||
    raw.includes('haiku') ||
    raw.includes('fable') ||
    raw.includes('mythos');
  if (!looksClaude) return null;

  // Ordered family defaults for vague short names already handled; for longer ids:
  if (raw.includes('mythos')) return MODEL_BY_ID.get('claude-mythos-5') ?? null;
  if (raw.includes('fable')) return MODEL_BY_ID.get('claude-fable-5') ?? null;
  if (raw.includes('opus')) {
    if (raw.includes('5.5') || raw.includes('5-5')) return MODEL_BY_ID.get('claude-opus-5.5') ?? null;
    if (raw.includes('opus-5') || raw.includes('opus 5')) return MODEL_BY_ID.get('claude-opus-5') ?? null;
    if (raw.includes('4.5') || raw.includes('4-5')) return MODEL_BY_ID.get('claude-opus-4.5') ?? null;
    if (raw.includes('4.1') || raw.includes('4-1')) return MODEL_BY_ID.get('claude-opus-4.1') ?? null;
    if (raw.includes('opus-4') || raw.includes('opus 4')) return MODEL_BY_ID.get('claude-opus-4') ?? null;
    return MODEL_BY_ID.get('claude-opus-5') ?? null;
  }
  if (raw.includes('haiku')) {
    if (raw.includes('5.5') || raw.includes('5-5')) return MODEL_BY_ID.get('claude-haiku-5.5') ?? null;
    if (raw.includes('4.5') || raw.includes('4-5')) return MODEL_BY_ID.get('claude-haiku-4.5') ?? null;
    if (raw.includes('3.5') || raw.includes('3-5')) return MODEL_BY_ID.get('claude-3-5-haiku') ?? null;
    return MODEL_BY_ID.get('claude-haiku-4.5') ?? null;
  }
  if (raw.includes('sonnet')) {
    if (raw.includes('5.5') || raw.includes('5-5')) return MODEL_BY_ID.get('claude-sonnet-5.5') ?? null;
    if (/(?:^|[^0-9])sonnet-?5(?:[^0-9.]|$)/.test(raw) || raw.includes('sonnet-5') || raw.includes('sonnet 5')) {
      if (!raw.includes('5.5') && !raw.includes('5-5')) return MODEL_BY_ID.get('claude-sonnet-5') ?? null;
    }
    if (raw.includes('4.6') || raw.includes('4-6')) return MODEL_BY_ID.get('claude-sonnet-4.6') ?? null;
    if (raw.includes('4.5') || raw.includes('4-5')) return MODEL_BY_ID.get('claude-sonnet-4.5') ?? null;
    if (raw.includes('sonnet-4') || raw.includes('sonnet 4')) return MODEL_BY_ID.get('claude-sonnet-4') ?? null;
    return MODEL_BY_ID.get('claude-sonnet-5') ?? null;
  }

  return null;
}

export interface TokenUsageLike {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}


function applyRateOverrides(model: PricedModel, lookupKeys: string[]): PricedModel {
  const ratesMap = activeOverrides.rates || {};
  let patch: PricingRateOverride | undefined;
  for (const key of lookupKeys) {
    const k = key.toLowerCase();
    if (ratesMap[key]) { patch = ratesMap[key]; break; }
    if (ratesMap[k]) { patch = ratesMap[k]; break; }
  }
  if (!patch && ratesMap[model.id]) patch = ratesMap[model.id];
  if (!patch) return model;
  return {
    ...model,
    rates: {
      input: patch.input ?? model.rates.input,
      output: patch.output ?? model.rates.output,
      cacheRead: patch.cacheRead ?? model.rates.cacheRead,
      cacheWrite: patch.cacheWrite ?? model.rates.cacheWrite,
    },
  };
}

export function estimateCostUsd(tokenUsage: TokenUsageLike, model: string, overrides?: PricingOverrides | null): CostEstimate {
  if (overrides) setPricingOverrides(overrides);

  let resolved = resolvePricedModel(model);
  if (resolved) {
    resolved = applyRateOverrides(resolved, [model, normalizeModelId(model), cleanModelKeyForPricing(model), resolved.id]);
  }
  if (!resolved) {
    return {
      usd: null,
      priced: false,
      canonicalId: null,
      family: 'other',
      rates: null,
      displayName: model || 'Unknown',
    };
  }

  const r = resolved.rates;
  const input = tokenUsage.inputTokens || 0;
  const output = tokenUsage.outputTokens || 0;
  const cacheRead = tokenUsage.cacheReadTokens || 0;
  const cacheWrite = tokenUsage.cacheCreationTokens || 0;

  const usd =
    (input / 1_000_000) * r.input +
    (output / 1_000_000) * r.output +
    (cacheRead / 1_000_000) * r.cacheRead +
    (cacheWrite / 1_000_000) * r.cacheWrite;

  return {
    usd,
    priced: true,
    canonicalId: resolved.id,
    family: resolved.family,
    rates: r,
    displayName: resolved.displayName,
  };
}

export function formatCostUsd(usd: number | null, priced: boolean): string {
  if (!priced || usd === null || Number.isNaN(usd)) return '—';
  if (usd < 0.001) return '< $0.001';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

/** Compatibility helper matching prior calculateCost string output when priced. */
export function formatCostForDisplay(tokenUsage: TokenUsageLike, model: string): string {
  const est = estimateCostUsd(tokenUsage, model);
  return formatCostUsd(est.usd, est.priced);
}
