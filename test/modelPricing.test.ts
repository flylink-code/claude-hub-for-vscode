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

test('resolvePricedModel leaves gateway and non-official unpriced', () => {
  assert.equal(resolvePricedModel('claude.sub2api.gpt-5.6-sol'), null);
  assert.equal(resolvePricedModel('gpt-4o'), null);
  assert.equal(resolvePricedModel('auto'), null);
  assert.equal(resolvePricedModel(''), null);
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
