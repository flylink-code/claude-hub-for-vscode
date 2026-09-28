import assert from 'node:assert';
import test from 'node:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { parseTranscriptFile, generateForkTitle, rewriteTranscriptSessionIds, parseSubagentsDir, extractMarkdownTodos } from '../src/transcriptParser.js';
import { decodeProjectPath, isPathInWorkspace, resolveClaudeConfigDir } from '../src/configDir.js';
import { formatModelDisplayName, getContextLimitForModel } from '../src/contextLimit.js';
import { resolveLanguage, zhMessages, enMessages } from '../src/i18n.js';
import {
  formatProgressBar,
  formatK,
  formatDuration,
  resolveRenderOptions,
  formatStatusBarText,
  StatusBarRenderOptions,
} from '../src/statusBarFormatter.js';

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
  assert.ok(html.includes('agents-container'));
  assert.ok(html.includes('agents-list'));
  assert.ok(html.includes('toggleAgentsList'));
  assert.ok(html.includes('toggleAgentDetail'));
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
  assert.ok(html.includes('id="session-dur-label"'));
  assert.ok(html.includes('updateLiveSessionDuration'));
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

test('statusBar formatters format numbers and progress bar properly', () => {
  assert.strictEqual(formatK(900), '900');
  assert.strictEqual(formatK(1500), '1.5k');
  assert.strictEqual(formatK(200000), '200.0k');
  assert.strictEqual(formatK(1000000), '1.0M');
  assert.strictEqual(formatK(2500000), '2.5M');

  // Test progress bar
  const bar0 = formatProgressBar(0, 5);
  assert.strictEqual(bar0, '▱▱▱▱▱');
  const bar50 = formatProgressBar(50, 6);
  assert.strictEqual(bar50, '▰▰▰▱▱▱');
  const bar100 = formatProgressBar(100, 4);
  assert.strictEqual(bar100, '▰▰▰▰');
});

test('statusBar formatStatusBarText renders compact, minimal, detailed, hud and custom presets correctly', () => {
  const baseInput = {
    percentage: 7,
    totalTokens: 14000,
    contextLimit: 200000,
    modelDisplay: 'Sonnet 3.7',
    hasRunningTool: false,
    cost: '$0.02',
    gitBranch: 'main',
    todos: [{ status: 'completed' }, { status: 'pending' }],
  };

  // 1. Minimal preset
  const minimalText = formatStatusBarText({
    ...baseInput,
    options: {
      preset: 'minimal',
      contextFormat: 'percent',
      showProgressBar: false,
      showModel: false,
      showCost: false,
      showGitBranch: false,
      showTodos: false,
      showTools: false,
    },
  });
  assert.strictEqual(minimalText, '$(sparkle) 7%');

  // 1.1 Minimal running
  const minimalRunning = formatStatusBarText({
    ...baseInput,
    hasRunningTool: true,
    activeToolName: 'Bash',
    elapsedSec: 3,
    options: {
      preset: 'minimal',
      contextFormat: 'percent',
      showProgressBar: false,
      showModel: false,
      showCost: false,
      showGitBranch: false,
      showTodos: false,
      showTools: false,
    },
  });
  assert.strictEqual(minimalRunning, '$(sync~spin) 7%');

  // 2. Compact preset
  const compactIdle = formatStatusBarText({
    ...baseInput,
    options: {
      preset: 'compact',
      contextFormat: 'percent',
      showProgressBar: false,
      showModel: true,
      showCost: false,
      showGitBranch: false,
      showTodos: false,
      showTools: true,
    },
  });
  assert.strictEqual(compactIdle, '$(sparkle) 7% · Sonnet 3.7');

  const compactRunning = formatStatusBarText({
    ...baseInput,
    hasRunningTool: true,
    activeToolName: 'Bash',
    elapsedSec: 4,
    options: {
      preset: 'compact',
      contextFormat: 'percent',
      showProgressBar: false,
      showModel: true,
      showCost: false,
      showGitBranch: false,
      showTodos: false,
      showTools: true,
    },
  });
  assert.strictEqual(compactRunning, '$(sync~spin) 7% · Bash (4s)');

  // 3. HUD preset
  const hudIdle = formatStatusBarText({
    ...baseInput,
    options: {
      preset: 'hud',
      contextFormat: 'percent',
      showProgressBar: true,
      showModel: true,
      showCost: true,
      showGitBranch: false,
      showTodos: false,
      showTools: true,
    },
  });
  assert.ok(hudIdle.startsWith('[Sonnet 3.7]'));
  assert.ok(hudIdle.includes('7%'));
  assert.ok(hudIdle.includes('│ $0.02'));

  const hudRunning = formatStatusBarText({
    ...baseInput,
    hasRunningTool: true,
    activeToolName: 'Edit',
    elapsedSec: 2,
    options: {
      preset: 'hud',
      contextFormat: 'percent',
      showProgressBar: true,
      showModel: true,
      showCost: true,
      showGitBranch: false,
      showTodos: false,
      showTools: true,
    },
  });
  assert.ok(hudRunning.includes('│ ◐ Edit (2s)'));

  // 4. Detailed preset
  const detailedText = formatStatusBarText({
    ...baseInput,
    options: {
      preset: 'detailed',
      contextFormat: 'both',
      showProgressBar: true,
      showModel: true,
      showCost: true,
      showGitBranch: true,
      showTodos: true,
      showTools: true,
    },
  });
  assert.ok(detailedText.includes('$(sparkle)'));
  assert.ok(detailedText.includes('7% (14.0k/200.0k)'));
  assert.ok(detailedText.includes('Sonnet 3.7'));
  assert.ok(detailedText.includes('$0.02'));
  assert.ok(detailedText.includes('☑ 1/2'));
  assert.ok(detailedText.includes('🌿 main'));

  // 5. Custom preset with tokens only
  const customTokens = formatStatusBarText({
    ...baseInput,
    options: {
      preset: 'custom',
      contextFormat: 'tokens',
      showProgressBar: false,
      showModel: true,
      showCost: false,
      showGitBranch: false,
      showTodos: false,
      showTools: true,
    },
  });
  assert.strictEqual(customTokens, '$(sparkle) 14.0k/200.0k · Sonnet 3.7');
});

test('parseTranscriptFile handles out-of-order tool_result before tool_use', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-hub-test-ooo-'));
  const testFile = path.join(tempDir, 'test-ooo.jsonl');

  try {
    const lines = [
      // 1. Tool result arrives first (e.g. out of order in fast streaming)
      JSON.stringify({
        type: 'user',
        timestamp: '2026-09-24T10:00:01.000Z',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_01_read_file',
              content: 'file contents here',
              is_error: false,
            },
          ],
        },
      }),
      // 2. Corresponding tool_use arrives second
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-09-24T10:00:00.998Z',
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'toolu_01_read_file',
              name: 'Read',
              input: { file_path: '/path/to/app_model.c' },
            },
          ],
        },
      }),
    ];

    fs.writeFileSync(testFile, lines.join('\n'), 'utf8');

    const result = await parseTranscriptFile(testFile);
    assert.strictEqual(result.activeTools.length, 0, 'No active tools should linger when result is present');
    assert.strictEqual(result.tools.length, 1);
    assert.strictEqual(result.tools[0].name, 'Read');
    assert.strictEqual(result.tools[0].target, 'app_model.c');
    assert.strictEqual(result.tools[0].status, 'completed');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parseTranscriptFile calculates activeDurationMs by filtering multi-day idle gaps', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-hub-test-dur-'));
  const testFile = path.join(tempDir, 'test-dur.jsonl');

  try {
    const lines = [
      // Day 1: Session created and initial query (active 1 minute)
      JSON.stringify({
        sessionId: 'session-multi-day-test',
        type: 'user',
        timestamp: '2026-09-24T10:00:00.000Z',
        message: { content: [{ type: 'text', text: 'Hello Claude' }] },
      }),
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-09-24T10:01:00.000Z',
        message: { content: [{ type: 'text', text: 'Hello! How can I help?' }] },
      }),
      // Idle for 3 days (e.g. 72 hours of silence / computer shutdown)
      // Day 4: User resumes work and interacts for 2 minutes
      JSON.stringify({
        type: 'user',
        timestamp: '2026-09-27T10:00:00.000Z',
        message: { content: [{ type: 'text', text: 'Continue task' }] },
      }),
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-09-27T10:02:00.000Z',
        message: { content: [{ type: 'text', text: 'All done.' }] },
      }),
    ];

    fs.writeFileSync(testFile, lines.join('\n'), 'utf8');

    const result = await parseTranscriptFile(testFile);
    // Total calendar span is 3 days (259,320,000 ms), but active duration should only be 1min + 2min = 3 minutes (180,000 ms)
    assert.strictEqual(result.activeDurationMs, 180000, 'Idle gap of 3 days must be filtered out');
    assert.strictEqual(result.currentTurnStartTime?.toISOString(), '2026-09-27T10:00:00.000Z');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parseTranscriptFile reconciles lingering running tools on turn completion (cost-state / new turn)', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-hub-test-reconcile-'));
  const testFile = path.join(tempDir, 'test-reconcile.jsonl');

  try {
    const lines = [
      // 1. Tool use started
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-09-24T10:00:00.000Z',
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'toolu_unfinished',
              name: 'Bash',
              input: { command: 'long-running-cmd' },
            },
          ],
        },
      }),
      // 2. Turn ended and cost-state was recorded by Claude CLI without tool_result (e.g. user aborted)
      JSON.stringify({
        type: 'cost-state',
        timestamp: '2026-09-24T10:00:05.000Z',
      }),
    ];

    fs.writeFileSync(testFile, lines.join('\n'), 'utf8');

    const result = await parseTranscriptFile(testFile);
    assert.strictEqual(result.activeTools.length, 0, 'Active tools should be reconciled on cost-state');
    assert.strictEqual(result.tools.length, 1);
    assert.strictEqual(result.tools[0].status, 'error');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parseTranscriptFile reconciles running tools when assistant delivers final text', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-hub-test-asst-text-'));
  const testFile = path.join(tempDir, 'test-asst.jsonl');

  try {
    const lines = [
      // 1. Tool use started
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-09-24T10:00:00.000Z',
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'toolu_02',
              name: 'Grep',
              input: { pattern: 'test' },
            },
          ],
        },
      }),
      // 2. Assistant finishes turn with plain text
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-09-24T10:00:02.000Z',
        message: {
          content: [
            {
              type: 'text',
              text: 'Here is the summary of search results.',
            },
          ],
        },
      }),
    ];

    fs.writeFileSync(testFile, lines.join('\n'), 'utf8');

    const result = await parseTranscriptFile(testFile);
    assert.strictEqual(result.activeTools.length, 0, 'Active tools should be closed when assistant replies with text');
    assert.strictEqual(result.tools.length, 1);
    assert.strictEqual(result.tools[0].status, 'completed');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('formatDuration formats milliseconds into human-readable compact strings', () => {
  // Normal/compact mode
  assert.strictEqual(formatDuration(0), '< 1m');
  assert.strictEqual(formatDuration(45000), '45s');
  assert.strictEqual(formatDuration(60000), '1m');
  assert.strictEqual(formatDuration(125000), '2m');
  assert.strictEqual(formatDuration(3600000), '1h');
  assert.strictEqual(formatDuration(3660000), '1h 1m');
  assert.strictEqual(formatDuration(86400000), '1d');
  assert.strictEqual(formatDuration(90000000), '1d 1h');

  // Precise mode (shows seconds under 1 hour)
  assert.strictEqual(formatDuration(0, true), '0s');
  assert.strictEqual(formatDuration(14000, true), '14s');
  assert.strictEqual(formatDuration(65000, true), '1m 5s');
  assert.strictEqual(formatDuration(120000, true), '2m');
  assert.strictEqual(formatDuration(3600000, true), '1h');
  assert.strictEqual(formatDuration(-100, true), '0s');
});

test('parseSubagentsDir parses and sorts root and nested subagents properly', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-hub-subagents-'));
  const subagentsDir = path.join(tempDir, 'subagents');
  fs.mkdirSync(subagentsDir, { recursive: true });

  try {
    // 1. Root agent 1: "agent-root1"
    const root1Meta = {
      agentType: 'code-review',
      name: '审查系统代理实现',
      description: '审查子代理核心逻辑与接口',
      model: 'claude-haiku-4-5',
      spawnDepth: 1,
      worktreeBranch: 'feature/agent-review',
    };
    fs.writeFileSync(path.join(subagentsDir, 'agent-root1.meta.json'), JSON.stringify(root1Meta), 'utf8');

    const root1Lines = [
      JSON.stringify({
        type: 'user',
        timestamp: '2026-09-28T10:00:00.000Z',
        message: { content: [{ type: 'text', text: '开始审查' }] },
      }),
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-09-28T10:02:00.000Z',
        message: {
          usage: { input_tokens: 1500, output_tokens: 300 },
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'Read', input: {} },
            { type: 'text', text: '审查完成' },
          ],
          stop_reason: 'end_turn',
        },
      }),
    ];
    fs.writeFileSync(path.join(subagentsDir, 'agent-root1.jsonl'), root1Lines.join('\n'), 'utf8');

    // 2. Nested child of agent-root1: "agent-nested1"
    const nested1Meta = {
      agentType: 'general-purpose',
      name: '/code-review',
      description: '深层比对代码规范',
      model: 'claude-sonnet-5',
      spawnDepth: 2,
      parentAgentId: 'root1',
    };
    fs.writeFileSync(path.join(subagentsDir, 'agent-nested1.meta.json'), JSON.stringify(nested1Meta), 'utf8');

    const nested1Lines = [
      JSON.stringify({
        type: 'user',
        timestamp: '2026-09-28T10:00:30.000Z',
        message: { content: [{ type: 'text', text: '子审查' }] },
      }),
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-09-28T10:01:30.000Z',
        message: {
          usage: { input_tokens: 800, output_tokens: 120 },
          content: [{ type: 'text', text: '无误' }],
          stop_reason: 'end_turn',
        },
      }),
    ];
    fs.writeFileSync(path.join(subagentsDir, 'agent-nested1.jsonl'), nested1Lines.join('\n'), 'utf8');

    // 3. Root agent 2: "agent-root2"
    const root2Meta = {
      agentType: 'Explore',
      name: '探索构建配置',
      spawnDepth: 1,
    };
    fs.writeFileSync(path.join(subagentsDir, 'agent-root2.meta.json'), JSON.stringify(root2Meta), 'utf8');

    const nowIso = new Date().toISOString();
    const root2Lines = [
      JSON.stringify({
        type: 'user',
        timestamp: nowIso,
        message: { content: [{ type: 'text', text: '探索配置' }] },
      }),
      // Running agent (no stop_reason)
      JSON.stringify({
        type: 'assistant',
        timestamp: nowIso,
        message: {
          usage: { input_tokens: 500, output_tokens: 50 },
          content: [{ type: 'tool_use', id: 'tool_2', name: 'Glob', input: {} }],
        },
      }),
    ];
    fs.writeFileSync(path.join(subagentsDir, 'agent-root2.jsonl'), root2Lines.join('\n'), 'utf8');

    const agents = await parseSubagentsDir(subagentsDir, false);

    assert.strictEqual(agents.length, 3);

    // Root1 should be followed immediately by its child nested1
    assert.strictEqual(agents[0].id, 'root1');
    assert.strictEqual(agents[0].name, '审查系统代理实现');
    assert.strictEqual(agents[0].status, 'completed');
    assert.strictEqual(agents[0].durationMs, 120000);
    assert.strictEqual(agents[0].totalTokens, 1800);
    assert.strictEqual(agents[0].toolsCount, 1);
    assert.strictEqual(agents[0].worktreeBranch, 'feature/agent-review');

    // Nested agent
    assert.strictEqual(agents[1].id, 'nested1');
    assert.strictEqual(agents[1].parentAgentId, 'root1');
    assert.strictEqual(agents[1].spawnDepth, 2);
    assert.strictEqual(agents[1].durationMs, 60000);
    assert.strictEqual(agents[1].totalTokens, 920);

    // Root2 (running)
    assert.strictEqual(agents[2].id, 'root2');
    assert.strictEqual(agents[2].name, '探索构建配置');
    assert.strictEqual(agents[2].status, 'running');
    assert.strictEqual(agents[2].toolsCount, 1);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parseTranscriptFile parses TaskCreate and TaskUpdate into todos properly', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-task-test-'));
  const filePath = path.join(tempDir, 'task-session.jsonl');

  try {
    const lines = [
      JSON.stringify({
        sessionId: 'task-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'call_create_1',
              name: 'TaskCreate',
              input: { subject: '实现 AppShell 布局', description: '重构全局布局' },
            },
          ],
        },
      }),
      JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              tool_use_id: 'call_create_1',
              type: 'tool_result',
              content: 'Task #1 created successfully: 实现 AppShell 布局',
            },
          ],
        },
        toolUseResult: { task: { id: '1', subject: '实现 AppShell 布局' } },
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'call_create_2',
              name: 'TaskCreate',
              input: { subject: '修复悬浮窗闪烁问题' },
            },
          ],
        },
      }),
      JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              tool_use_id: 'call_create_2',
              type: 'tool_result',
              content: 'Task #2 created successfully: 修复悬浮窗闪烁问题',
            },
          ],
        },
        toolUseResult: { task: { id: '2', subject: '修复悬浮窗闪烁问题' } },
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'call_update_1',
              name: 'TaskUpdate',
              input: { taskId: '1', status: 'completed' },
            },
          ],
        },
      }),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);

    assert.strictEqual(parsed.todos.length, 2);
    assert.strictEqual(parsed.todos[0].content, '实现 AppShell 布局');
    assert.strictEqual(parsed.todos[0].status, 'completed');
    assert.strictEqual(parsed.todos[1].content, '修复悬浮窗闪烁问题');
    assert.strictEqual(parsed.todos[1].status, 'pending');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('extractMarkdownTodos extracts checklists accurately', () => {
  const text = `
Here is our execution plan:
- [x] Step 1: Implement basic layout
* [x] Step 2: Add theme support
- [/] Step 3: Run integration test
+ [ ] Step 4: Release v0.2.10
  `;
  const todos = extractMarkdownTodos(text);
  assert.strictEqual(todos.length, 4);
  assert.strictEqual(todos[0].content, 'Step 1: Implement basic layout');
  assert.strictEqual(todos[0].status, 'completed');
  assert.strictEqual(todos[1].content, 'Step 2: Add theme support');
  assert.strictEqual(todos[1].status, 'completed');
  assert.strictEqual(todos[2].content, 'Step 3: Run integration test');
  assert.strictEqual(todos[2].status, 'in_progress');
  assert.strictEqual(todos[3].content, 'Step 4: Release v0.2.10');
  assert.strictEqual(todos[3].status, 'pending');
});

test('parseTranscriptFile parses markdown checklists from assistant message as fallback todos', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-md-task-test-'));
  const filePath = path.join(tempDir, 'markdown-session.jsonl');

  try {
    const lines = [
      JSON.stringify({
        sessionId: 'md-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: '任务规划如下：\n- [x] 完成第一项检查\n- [ ] 进行第二项验证',
            },
          ],
        },
      }),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);

    assert.strictEqual(parsed.todos.length, 2);
    assert.strictEqual(parsed.todos[0].content, '完成第一项检查');
    assert.strictEqual(parsed.todos[0].status, 'completed');
    assert.strictEqual(parsed.todos[1].content, '进行第二项验证');
    assert.strictEqual(parsed.todos[1].status, 'pending');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});



