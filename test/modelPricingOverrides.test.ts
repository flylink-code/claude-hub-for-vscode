import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateCostUsd,
  setPricingOverrides,
  resolvePricedModel,
} from '../src/modelPricing.js';

test('pricing overrides change rates and aliases', () => {
  setPricingOverrides({
    aliases: { 'my-sonnet': 'claude-sonnet-5' },
    rates: { 'claude-sonnet-5': { input: 9, output: 9, cacheRead: 0, cacheWrite: 0 } },
  });
  const resolved = resolvePricedModel('my-sonnet');
  assert.ok(resolved);
  const est = estimateCostUsd(
    { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
    'my-sonnet',
  );
  assert.equal(est.priced, true);
  assert.ok(est.usd !== null && Math.abs(est.usd - 9) < 1e-9);
  setPricingOverrides({});
});
