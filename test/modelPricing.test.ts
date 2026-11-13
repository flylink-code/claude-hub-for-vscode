import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRICING_TABLE_VERSION,
  estimateCostUsd,
  formatCostForDisplay,
  resolvePricedModel,
} from '../src/modelPricing.js';

test('pricing table version is set', () => {
  assert.ok(PRICING_TABLE_VERSION);
});

test('resolvePricedModel maps mainstream aliases', () => {
  assert.equal(resolvePricedModel('claude-sonnet-5')?.id, 'claude-sonnet-5');
  assert.equal(resolvePricedModel('sonnet')?.id, 'claude-sonnet-5');
  assert.equal(resolvePricedModel('claude-sonnet-4-5-20250929')?.id, 'claude-sonnet-4.5');
  assert.equal(resolvePricedModel('claude-opus-5.5')?.rates.input, 4);
  assert.equal(resolvePricedModel('claude-haiku-4-5')?.id, 'claude-haiku-4.5');
  assert.equal(resolvePricedModel('claude-fable-5')?.family, 'fable');
  assert.equal(resolvePricedModel('claude-3-7-sonnet-20250219')?.id, 'claude-3-7-sonnet');
});

test('resolvePricedModel leaves unknown and auto models unpriced', () => {
  assert.equal(resolvePricedModel('gpt-4o'), null);
  assert.equal(resolvePricedModel('some-unknown-model'), null);
  assert.equal(resolvePricedModel('claude.sub2api.some-unknown-model'), null);
  assert.equal(resolvePricedModel('kimi-k3-highspeed'), null);
  assert.equal(resolvePricedModel('auto'), null);
  assert.equal(resolvePricedModel(''), null);
});

test('resolvePricedModel prices GPT, DeepSeek, Gemini, Kimi, GLM and MiniMax through relay ids', () => {
  assert.equal(resolvePricedModel('claude.sub2api.gpt-5.6-sol')?.id, 'gpt-5.6-sol');
  assert.equal(resolvePricedModel('claude.gpt-6-luna')?.id, 'gpt-6-luna');
  assert.equal(resolvePricedModel('openai/gpt-6.1-sol')?.id, 'gpt-6.1-sol');
  assert.equal(resolvePricedModel('gpt-6-1-terra')?.id, 'gpt-6.1-terra');
  assert.equal(resolvePricedModel('claude.gemini-3.8-flash')?.id, 'gemini-3.8-flash');
  assert.equal(resolvePricedModel('claude.gemini-4-argon-medium')?.id, 'gemini-4-argon');
  assert.equal(resolvePricedModel('opencode-go/deepseek-v4.1-flash[1m]')?.id, 'deepseek-flash');
  assert.equal(resolvePricedModel('deepseek-v4-flash')?.id, 'deepseek-flash');
  assert.equal(resolvePricedModel('deepseek-v4-pro')?.id, 'deepseek-v4-pro');
  assert.equal(resolvePricedModel('moonshot/kimi-k3')?.id, 'kimi-k3');
  assert.equal(resolvePricedModel('kimi-k3.1-pro')?.id, 'kimi-k3.1-pro');
  assert.equal(resolvePricedModel('glm-5')?.id, 'glm-5');
  assert.equal(resolvePricedModel('minimax-m3')?.id, 'minimax-m3');
});

test('estimateCostUsd applies promotional rates only through their end date', () => {
  const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 0, cacheCreationTokens: 0 };
  const during = estimateCostUsd(usage, 'gpt-5.6-sol', null, new Date('2026-11-21T12:00:00Z'));
  assert.equal(during.usd, 4 + 20);
  const after = estimateCostUsd(usage, 'gpt-5.6-sol', null, new Date('2026-11-22T00:00:00Z'));
  assert.equal(after.usd, 5 + 30);

  const argonIntro = estimateCostUsd(usage, 'gemini-4-argon', null, new Date('2026-11-30T23:00:00Z'));
  assert.equal(argonIntro.usd, 2 + 10);
  const argonStandard = estimateCostUsd(usage, 'gemini-4-argon', null, new Date('2026-12-01T00:00:00Z'));
  assert.equal(argonStandard.usd, 4 + 20);

  const flashIntro = estimateCostUsd(usage, 'gemini-3.8-flash', null, new Date('2026-12-31T20:00:00Z'));
  assert.ok(Math.abs((flashIntro.usd ?? 0) - (0.75 + 3.75)) < 1e-9);
  const flashStandard = estimateCostUsd(usage, 'gemini-3.8-flash', null, new Date('2027-01-01T00:00:00Z'));
  assert.ok(Math.abs((flashStandard.usd ?? 0) - (1.5 + 7.5)) < 1e-9);
});

test('estimateCostUsd uses vendor list prices for non-Claude models', () => {
  const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 1_000_000, cacheCreationTokens: 0 };
  const now = new Date('2026-11-13T00:00:00Z');
  assert.ok(Math.abs((estimateCostUsd(usage, 'gpt-6.1-sol', null, now).usd ?? 0) - (2 + 10 + 0.1)) < 1e-9);
  assert.ok(Math.abs((estimateCostUsd(usage, 'deepseek-flash', null, now).usd ?? 0) - (0.3 + 1.2 + 0.006)) < 1e-9);
  assert.ok(Math.abs((estimateCostUsd(usage, 'kimi-k3', null, now).usd ?? 0) - (3 + 15 + 0.3)) < 1e-9);
  assert.ok(Math.abs((estimateCostUsd(usage, 'glm-5', null, now).usd ?? 0) - (1 + 3.2 + 0.2)) < 1e-9);
  assert.ok(Math.abs((estimateCostUsd(usage, 'minimax-m3', null, now).usd ?? 0) - (0.3 + 1.2 + 0.06)) < 1e-9);
});

test('estimateCostUsd includes cache write and uses MTok rates', () => {
  const est = estimateCostUsd(
    { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 1_000_000, cacheCreationTokens: 1_000_000 },
    'claude-sonnet-5',
  );
  assert.equal(est.priced, true);
  // 2 + 10 + 0.2 + 2.5 = 14.7
  assert.ok(est.usd !== null && Math.abs(est.usd - 14.7) < 1e-9);
});

test('formatCostForDisplay shows em-dash when unpriced', () => {
  assert.equal(formatCostForDisplay({ inputTokens: 1000, outputTokens: 1000 }, 'claude.sub2api.gpt-5'), '—');
});

test('formatCostForDisplay formats small costs', () => {
  const s = formatCostForDisplay({ inputTokens: 100, outputTokens: 100, cacheReadTokens: 0, cacheCreationTokens: 0 }, 'claude-sonnet-5');
  assert.ok(s.startsWith('$') || s.startsWith('< $'));
});
