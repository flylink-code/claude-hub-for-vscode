import assert from 'node:assert';
import test from 'node:test';
import * as path from 'node:path';
import { parseTranscriptFile, generateForkTitle } from '../src/transcriptParser.js';
import { decodeProjectPath, isPathInWorkspace } from '../src/configDir.js';
import { formatModelDisplayName, getContextLimitForModel } from '../src/contextLimit.js';
import { resolveLanguage, zhMessages, enMessages } from '../src/i18n.js';

test('resolveLanguage respects config overrides and auto detection', () => {
  assert.strictEqual(resolveLanguage('zh-CN', 'en-US'), 'zh-CN');
  assert.strictEqual(resolveLanguage('en', 'zh-CN'), 'en');
  assert.strictEqual(resolveLanguage('auto', 'zh-CN'), 'zh-CN');
  assert.strictEqual(resolveLanguage('auto', 'zh-TW'), 'zh-CN');
  assert.strictEqual(resolveLanguage('auto', 'en-US'), 'en');
  assert.strictEqual(resolveLanguage('auto', 'ja'), 'en');
});

test('i18n dictionaries have matching keys', () => {
  const enKeys = Object.keys(enMessages).sort();
  const zhKeys = Object.keys(zhMessages).sort();
  assert.deepStrictEqual(zhKeys, enKeys);
});

test('decodeProjectPath handles Windows encoded paths correctly', () => {
  const res = decodeProjectPath('e--W-AI-WorkSpace-clash-verge-rev');
  assert.strictEqual(res.fullPath, 'E:\\W\\AI\\WorkSpace\\clash\\verge\\rev');
  assert.ok(res.name.length > 0);
});

test('decodeProjectPath handles Unix encoded paths correctly', () => {
  const res = decodeProjectPath('-Users-ed-work-my-project');
  assert.strictEqual(res.fullPath, '/Users/ed/work/my/project');
  assert.ok(res.name.length > 0);
});

test('getContextLimitForModel returns correct limits', () => {
  assert.strictEqual(getContextLimitForModel('claude-3-5-sonnet-20241022'), 200000);
  assert.strictEqual(getContextLimitForModel('claude-3-5-haiku-20241022'), 200000);
  assert.strictEqual(getContextLimitForModel('claude-opus-4-6'), 1000000);
  assert.strictEqual(getContextLimitForModel('custom-model', 150000), 150000);
});

test('formatModelDisplayName maps models cleanly', () => {
  assert.strictEqual(formatModelDisplayName('claude-3-7-sonnet-20250219'), 'Sonnet 3.7');
  assert.strictEqual(formatModelDisplayName('claude-3-5-sonnet-20241022'), 'Sonnet 3.5');
  assert.strictEqual(formatModelDisplayName('claude-3-5-haiku-20241022'), 'Haiku 3.5');
  assert.strictEqual(formatModelDisplayName('claude.auto'), 'Auto');
  assert.strictEqual(formatModelDisplayName('auto'), 'Auto');
  assert.strictEqual(formatModelDisplayName('claude.sub2api.gpt-5.6-sol'), 'gpt-5.6-sol');
  assert.strictEqual(formatModelDisplayName('claude.sub2api.gpt-6-astra'), 'gpt-6-astra');
  assert.strictEqual(formatModelDisplayName('claude-sonnet-5'), 'Sonnet 5');
  assert.strictEqual(formatModelDisplayName('claude-haiku-4-5'), 'Haiku 4.5');
  assert.strictEqual(formatModelDisplayName('claude-fable-5'), 'Fable 5');
  assert.strictEqual(formatModelDisplayName('claude-opus-5'), 'Opus 5');
  assert.strictEqual(formatModelDisplayName('claude.auto', new Map([['claude.auto', 'Auto']])), 'Auto');
});

test('isPathInWorkspace matches case-insensitively on Windows', () => {
  const ws = ['E:\\W-AI_WorkSpace\\claude_hub_for_vscode'];
  assert.strictEqual(isPathInWorkspace('e:/w-ai_workspace/claude_hub_for_vscode', ws), true);
  assert.strictEqual(isPathInWorkspace('E:\\W-AI_WorkSpace\\other_project', ws), false);
});

test('parseTranscriptFile parses basic transcript fixture', async () => {
  const fixturePath = path.resolve('example/claude-hud/tests/fixtures/transcript-basic.jsonl');
  const parsed = await parseTranscriptFile(fixturePath);

  assert.ok(parsed);
  assert.strictEqual(typeof parsed.tokenUsage.inputTokens, 'number');
  assert.strictEqual(typeof parsed.tokenUsage.totalTokens, 'number');
  assert.ok(Array.isArray(parsed.tools));
  assert.ok(Array.isArray(parsed.todos));
});

import { getWebviewContent } from '../src/webviewHtml.js';
import { ClaudeConfigManager, matchModel, cleanModelKey } from '../src/claudeConfigManager.js';

import { ClaudeFeaturesManager } from '../src/claudeFeatures.js';

test('getWebviewContent returns valid HTML with sections and controls', () => {
  const html = getWebviewContent();
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('sec-monitor'));
  assert.ok(html.includes('sec-sessions'));
  assert.ok(html.includes('sec-extensions'));
  assert.ok(html.includes('sec-advanced'));
  assert.ok(html.includes('session-search'));
  assert.ok(html.includes('session-cards-list'));
  assert.ok(html.includes('session-pagination'));
});

test('ClaudeFeaturesManager reads skills and calculates cost safely', () => {
  const feat = new ClaudeFeaturesManager();
  const skills = feat.getSkills();
  assert.ok(Array.isArray(skills));
  const mcp = feat.getMcpServers();
  assert.ok(Array.isArray(mcp));

  const cost = ClaudeFeaturesManager.calculateCost(
    { inputTokens: 10000, outputTokens: 2000, cacheCreationTokens: 0, cacheReadTokens: 5000, totalTokens: 15000, percentage: 7 },
    'opus'
  );
  assert.ok(cost.startsWith('$'));
});

test('cleanModelKey strips prefixes and preserves dotted versions correctly', () => {
  assert.strictEqual(cleanModelKey('claude.sub2api.gpt-5.6-sol'), 'gpt-5.6-sol');
  assert.strictEqual(cleanModelKey('claude.sub2api.gpt-6-astra'), 'gpt-6-astra');
  assert.strictEqual(cleanModelKey('claude.antigravity--built-in.gemini-3.8-flash'), 'gemini-3.8-flash');
  assert.strictEqual(cleanModelKey('claude.auto'), 'auto');
  assert.strictEqual(cleanModelKey('auto'), 'auto');
  assert.strictEqual(cleanModelKey('claude-sonnet-5'), 'sonnet-5');
});

test('generateForkTitle increments fork counts properly', () => {
  assert.strictEqual(generateForkTitle(''), '未命名对话 (Fork)');
  assert.strictEqual(generateForkTitle(undefined), '未命名对话 (Fork)');
  assert.strictEqual(generateForkTitle('未命名对话'), '未命名对话 (Fork)');
  assert.strictEqual(generateForkTitle('未命名对话 (Fork)'), '未命名对话 (Fork 2)');
  assert.strictEqual(generateForkTitle('未命名对话 (Fork 2)'), '未命名对话 (Fork 3)');
  assert.strictEqual(generateForkTitle('2026-09-生产性实训套件'), '2026-09-生产性实训套件 (Fork)');
  assert.strictEqual(generateForkTitle('2026-09-生产性实训套件 (Fork)'), '2026-09-生产性实训套件 (Fork 2)');
  assert.strictEqual(generateForkTitle('2026-09-生产性实训套件 (Fork 9)'), '2026-09-生产性实训套件 (Fork 10)');
});

test('ClaudeConfigManager reads settings and discovers models safely', () => {
  const mgr = new ClaudeConfigManager();
  const settings = mgr.getClaudeSettings();
  assert.ok(typeof settings === 'object');
  const configured = mgr.getConfiguredModel();
  assert.ok(typeof configured === 'string' || configured === undefined);

  const models = mgr.getDiscoveredModels('gpt-5.6-sol');
  assert.ok(Array.isArray(models));
  assert.ok(models.length > 0);
  assert.ok(models.some((m) => m.title.includes('Default') || m.id.length > 0));

  // Verify matchModel matches by alias or title
  const matched = matchModel('gpt-5.6-sol', models);
  assert.ok(matched);
  assert.strictEqual(matched?.title, 'gpt-5.6-sol');

  mgr.dispose();
});
