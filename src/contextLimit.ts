const CONTEXT_1M = 1_000_000;
const CONTEXT_200K = 200_000;

const CONTEXT_200K_MODELS: readonly string[] = [
  'haiku',
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
];

export function getContextLimitForModel(
  model: string,
  userLimit = 200000,
  modelContextLimits: Record<string, number> = {},
): number {
  if (model in modelContextLimits) {
    return modelContextLimits[model];
  }

  const id = model.toLowerCase().trim();
  if (!id || !id.startsWith('claude')) {
    return userLimit;
  }

  if (CONTEXT_200K_MODELS.some((m) => id.includes(m))) {
    return CONTEXT_200K;
  }

  return CONTEXT_1M;
}

export function formatModelDisplayName(model: string): string {
  if (!model) return 'Claude';
  const m = model.toLowerCase();
  if (m.includes('3-7-sonnet') || m.includes('3.7-sonnet')) return 'Sonnet 3.7';
  if (m.includes('3-5-sonnet') || m.includes('3.5-sonnet')) return 'Sonnet 3.5';
  if (m.includes('3-5-haiku') || m.includes('3.5-haiku')) return 'Haiku 3.5';
  if (m.includes('sonnet')) return 'Sonnet';
  if (m.includes('opus')) return 'Opus';
  if (m.includes('haiku')) return 'Haiku';
  return model.replace(/^claude-/, '');
}
