import assert from 'node:assert';
import test from 'node:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { parseTranscriptFile, generateForkTitle, rewriteTranscriptSessionIds } from '../src/transcriptParser.js';
import { decodeProjectPath, isPathInWorkspace, resolveClaudeConfigDir } from '../src/configDir.js';
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

test('resolveClaudeConfigDir honors custom paths and home expansion', () => {
  assert.strictEqual(resolveClaudeConfigDir('C:\\custom-claude'), 'C:\\custom-claude');
  assert.strictEqual(resolveClaudeConfigDir('~/custom-claude'), path.join(os.homedir(), 'custom-claude'));
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

test('rewriteTranscriptSessionIds updates metadata without changing message text', () => {
  const oldId = 'old-session-id';
  const newId = 'new-session-id';
  const malformed = '{"type": "broken"';
  const content = [
    JSON.stringify({
      type: 'user',
      sessionId: oldId,
      parentSessionId: oldId,
      message: { content: `Keep ${oldId} in user text` },
    }),
    malformed,
    '',
  ].join('\r\n');

  const rewritten = rewriteTranscriptSessionIds(content, oldId, newId);
  const lines = rewritten.split('\r\n');
  const first = JSON.parse(lines[0]);

  assert.strictEqual(first.sessionId, newId);
  assert.strictEqual(first.parentSessionId, newId);
  assert.strictEqual(first.message.content, `Keep ${oldId} in user text`);
  assert.strictEqual(lines[1], malformed);
  assert.strictEqual(lines[2], '');
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
  assert.ok(html.includes('function escapeHtml'));
  assert.ok(html.includes('data-action="focusSession"'));
  assert.ok(html.includes('data-action="openSessionFile"'));
  assert.ok(html.includes('data-action="toggleMcp"'));
  assert.ok(html.includes('data-action="openSkill"'));
  assert.ok(html.includes('id="top-filter-btn"'));
  assert.ok(html.includes('id="btn-open-agents-md"'));
  assert.ok(html.includes('id="btn-open-claude-md"'));
  assert.ok(html.includes('setFilterMode'));
  assert.ok(html.includes('event.target instanceof Element'));
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

test('config directory provider is shared by Claude configuration and features', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-hub-config-'));
  const cacheDir = path.join(tempDir, 'cache');
  const skillsDir = path.join(tempDir, 'skills', 'demo-skill');
  let manager: ClaudeConfigManager | undefined;

  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'settings.json'),
      JSON.stringify({
        model: 'custom-model',
        mcpServers: { demo: { command: 'demo-mcp' } },
      }),
      'utf8',
    );
    fs.writeFileSync(
      path.join(cacheDir, 'gateway-models.json'),
      JSON.stringify({ models: [{ id: 'custom-model', display_name: 'Custom Model' }] }),
      'utf8',
    );
    fs.writeFileSync(path.join(skillsDir, 'SKILL.md'), '# Demo Skill\n\nA test skill.', 'utf8');

    manager = new ClaudeConfigManager(() => tempDir);
    assert.strictEqual(manager.getSettingsPath(), path.join(tempDir, 'settings.json'));
    assert.strictEqual(manager.getGatewayModelsPath(), path.join(cacheDir, 'gateway-models.json'));
    assert.strictEqual(manager.getConfiguredModel(), 'custom-model');
    assert.strictEqual(manager.getGatewayModels()[0].id, 'custom-model');

    const features = new ClaudeFeaturesManager(() => tempDir);
    assert.ok(features.getMcpServers().some((server) => server.name === 'demo'));
    assert.ok(features.getSkills().some((skill) => skill.filePath === path.join(skillsDir, 'SKILL.md')));

  } finally {
    manager?.dispose();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('ClaudeConfigManager manages AGENTS.md and CLAUDE.md status and generation', async () => {
  const wsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-hub-ws-'));
  const mgr = new ClaudeConfigManager();

  try {
    // Initial status: neither exists
    let status = mgr.getProjectDocStatus(wsDir);
    assert.strictEqual(status.hasAgentsMd, false);
    assert.strictEqual(status.hasClaudeMd, false);

    // Generate AGENTS.md
    const agentsPath = await mgr.openProjectDocFile('AGENTS', wsDir);
    assert.ok(agentsPath);
    assert.ok(fs.existsSync(agentsPath));
    const agentsContent = fs.readFileSync(agentsPath, 'utf8');
    assert.ok(agentsContent.includes('# AGENTS.md'));
    assert.ok(agentsContent.includes('## Agent Rules & Guidelines'));

    // Check status after creating AGENTS.md
    status = mgr.getProjectDocStatus(wsDir);
    assert.strictEqual(status.hasAgentsMd, true);
    assert.strictEqual(status.hasClaudeMd, false);

    // Generate CLAUDE.md
    const claudePath = await mgr.openProjectDocFile('CLAUDE', wsDir);
    assert.ok(claudePath);
    assert.ok(fs.existsSync(claudePath));
    const claudeContent = fs.readFileSync(claudePath, 'utf8');
    assert.ok(claudeContent.includes('# CLAUDE.md'));

    // Check status after creating both
    status = mgr.getProjectDocStatus(wsDir);
    assert.strictEqual(status.hasAgentsMd, true);
    assert.strictEqual(status.hasClaudeMd, true);
  } finally {
    mgr.dispose();
    fs.rmSync(wsDir, { recursive: true, force: true });
  }
});
