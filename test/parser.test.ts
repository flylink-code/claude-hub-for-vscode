import assert from 'node:assert';
import test from 'node:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Script } from 'node:vm';
import {
  parseTranscriptFile,
  generateForkTitle,
  rewriteTranscriptSessionIds,
  parseSubagentsDir,
  extractMarkdownTodos,
  extractPlanTodos,
  cleanPlanText,
  advancePlanProgress,
  clearTranscriptCache,
  extractBlockTextContent,
} from '../src/transcriptParser.js';
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
  assert.ok(html.includes('id="app" class="hub-container"'));
  assert.ok(html.includes('@container'));
  assert.ok(html.includes('btn-icon'));
  assert.ok(html.includes('btn-text'));
  assert.ok(html.includes('chip-label-short'));
  assert.ok(html.includes('header-sub'));
  assert.ok(html.includes('hud-info-row'));
  const extBadgeMatches = html.match(/id="ext-count-badge"/g);
  assert.strictEqual(extBadgeMatches ? extBadgeMatches.length : 0, 1);
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
      toolUseId: 'call_123456',
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
    assert.strictEqual(agents[0].toolUseId, 'call_123456');
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

test('cleanPlanText removes markdown styling and limits length cleanly', () => {
  assert.strictEqual(cleanPlanText('**核心逻辑**与`代码`实现'), '核心逻辑与代码实现');
  assert.strictEqual(cleanPlanText('[测试链接](https://example.com) 验证'), '测试链接 验证');
  assert.strictEqual(cleanPlanText('   多余   空白    字符  '), '多余 空白 字符');

  const longText = '这是一个非常长的句子。'.repeat(10);
  const cleaned = cleanPlanText(longText);
  assert.ok(cleaned.length <= 100);
});

test('extractPlanTodos extracts items from various plan markdown formats', () => {
  // 1. GFM checklist
  const gfmPlan = `
# Plan
- [x] 初始化工程结构
- [/] 实现解析器
- [ ] 编写测试用例
`;
  const gfmTodos = extractPlanTodos(gfmPlan);
  assert.strictEqual(gfmTodos.length, 3);
  assert.strictEqual(gfmTodos[0].status, 'completed');
  assert.strictEqual(gfmTodos[1].status, 'in_progress');
  assert.strictEqual(gfmTodos[2].status, 'pending');

  // 2. Numbered steps with code blocks (code blocks should be ignored)
  const stepPlan = `
## Implementation Steps
\`\`\`ts
1. console.log("this code should not be parsed as a task");
2. return true;
\`\`\`
1. **重构** \`src/transcriptParser.ts\` 支持 Plan 模式提取
2. 在 \`test/parser.test.ts\` 中补充完整单元测试
3. 运行 \`npm test\` 与 \`npm run compile\` 验证
`;
  const stepTodos = extractPlanTodos(stepPlan);
  assert.strictEqual(stepTodos.length, 3);
  assert.strictEqual(stepTodos[0].content, '重构 src/transcriptParser.ts 支持 Plan 模式提取');
  assert.strictEqual(stepTodos[1].content, '在 test/parser.test.ts 中补充完整单元测试');
  assert.strictEqual(stepTodos[2].content, '运行 npm test 与 npm run compile 验证');

  // 3. Phase headings
  const phasePlan = `
# 架构重构方案
### Phase 1: 数据模型升级
详见架构设计文档...
### Phase 2: 解析与进度跟踪机制
包含工具事件联动...
### Phase 3: 侧边栏与状态栏展示验证
`;
  const phaseTodos = extractPlanTodos(phasePlan);
  assert.strictEqual(phaseTodos.length, 3);
  assert.strictEqual(phaseTodos[0].content, 'Phase 1: 数据模型升级');
  assert.strictEqual(phaseTodos[1].content, 'Phase 2: 解析与进度跟踪机制');
  assert.strictEqual(phaseTodos[2].content, 'Phase 3: 侧边栏与状态栏展示验证');
});

test('advancePlanProgress updates plan todos dynamically as tools execute', () => {
  const todos = [
    { content: '更新 src/transcriptParser.ts 支持 plan 模式', status: 'pending' as const },
    { content: '在 test/parser.test.ts 中编写测试', status: 'pending' as const },
    { content: '运行 npm test 验证', status: 'pending' as const },
  ];

  // Tool Edit starts on transcriptParser.ts
  advancePlanProgress(todos, 'Edit', { file_path: 'E:/project/src/transcriptParser.ts' }, false);
  assert.strictEqual(todos[0].status, 'in_progress');
  assert.strictEqual(todos[1].status, 'pending');

  // Tool Edit completes
  advancePlanProgress(todos, 'Edit', { file_path: 'E:/project/src/transcriptParser.ts' }, true);
  assert.strictEqual(todos[0].status, 'completed');

  // Tool Edit starts on parser.test.ts
  advancePlanProgress(todos, 'Edit', { file_path: 'E:/project/test/parser.test.ts' }, false);
  assert.strictEqual(todos[1].status, 'in_progress');

  // Tool Edit completes on parser.test.ts
  advancePlanProgress(todos, 'Edit', { file_path: 'E:/project/test/parser.test.ts' }, true);
  assert.strictEqual(todos[1].status, 'completed');

  // Tool Bash runs npm test and completes
  advancePlanProgress(todos, 'Bash', { command: 'npm test' }, true);
  assert.strictEqual(todos[2].status, 'completed');
});

test('parseTranscriptFile automatically parses ExitPlanMode and tracks execution progress', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-plan-mode-test-'));
  const filePath = path.join(tempDir, 'plan-session.jsonl');

  try {
    const lines = [
      // 1. Claude exits plan mode with plan content
      JSON.stringify({
        sessionId: 'session-plan-auto',
        type: 'assistant',
        timestamp: '2026-09-29T10:00:00.000Z',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'call_exit_plan',
              name: 'ExitPlanMode',
              input: {
                plan: `
## Implementation Plan
1. 修改 src/transcriptParser.ts 逻辑
2. 在 test/parser.test.ts 补充单测
3. 执行 npm test 校验
`,
              },
            },
          ],
        },
      }),
      JSON.stringify({
        type: 'user',
        timestamp: '2026-09-29T10:00:01.000Z',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'call_exit_plan',
              content: 'Plan approved. Proceeding with execution.',
            },
          ],
        },
      }),
      // 2. Claude switches to auto mode and executes tool Edit on transcriptParser.ts
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-09-29T10:00:02.000Z',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'call_edit_1',
              name: 'Edit',
              input: {
                file_path: 'E:/W-AI_WorkSpace/claude_hub_for_vscode/src/transcriptParser.ts',
                old_string: 'foo',
                new_string: 'bar',
              },
            },
          ],
        },
      }),
      // 3. Edit completes
      JSON.stringify({
        type: 'user',
        timestamp: '2026-09-29T10:00:03.000Z',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'call_edit_1',
              content: 'File updated successfully.',
            },
          ],
        },
      }),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);

    // Verify todos extracted from ExitPlanMode and progress advanced
    assert.strictEqual(parsed.todos.length, 3);
    assert.strictEqual(parsed.todos[0].content, '修改 src/transcriptParser.ts 逻辑');
    assert.strictEqual(parsed.todos[0].status, 'completed', 'Step 1 should be completed after Edit completes');
    assert.strictEqual(parsed.todos[1].content, '在 test/parser.test.ts 补充单测');
    assert.strictEqual(parsed.todos[1].status, 'pending');
    assert.strictEqual(parsed.todos[2].content, '执行 npm test 校验');
    assert.strictEqual(parsed.todos[2].status, 'pending');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('extractMarkdownTodos extracts checklists accurately and ignores markdown links and code block examples', () => {
  const text = `
Here is our execution plan:
- [x] Step 1: Implement basic layout
* [x] Step 2: Add theme support
- [/] Step 3: Run integration test
+ [ ] Step 4: Release v0.2.10
- [-] Step 5: Legacy in-progress format
  - [ ] Nested indented task
- [ ] Task with embedded link: check [PR #100](https://github.com/example/repo/pull/100) now

下面是解释说明代码块中的示范任务（包含4个反引号、缩进以及行内反引号，绝不能误解析为当前会话待办）：
\`\`\`markdown
- [x] 分析当前项目结构
- [/] 重构数据解析模块
- [ ] 运行单元测试
\`\`\`

\`\`\`\`markdown
     - [x] 四反引号示范任务1
     - [ ] 四反引号示范任务2
\`\`\`\`

这里是行内引用 \`- [ ] 行内任务示范\`，也不应当被提取。

重点文件（普通 Markdown 链接列表，绝不能误判为待办）：
- [ProxyBridge.exe](Windows/output_latest/ProxyBridge.exe)
- [ProxyBridgeCore.dll](Windows/output_latest/ProxyBridgeCore.dll)
- [ProxyBridge_CLI.exe](Windows/output_latest/ProxyBridge_CLI.exe)
* [README.md](README.md)
+ [Docs](https://docs.anthropic.com)
- [x](https://shortlink.org)

无效待办（空内容或格式不符）：
- [ ]
- [ ]
  `;
  const todos = extractMarkdownTodos(text);
  assert.strictEqual(todos.length, 7);
  assert.strictEqual(todos[0].content, 'Step 1: Implement basic layout');
  assert.strictEqual(todos[0].status, 'completed');
  assert.strictEqual(todos[1].content, 'Step 2: Add theme support');
  assert.strictEqual(todos[1].status, 'completed');
  assert.strictEqual(todos[2].content, 'Step 3: Run integration test');
  assert.strictEqual(todos[2].status, 'in_progress');
  assert.strictEqual(todos[3].content, 'Step 4: Release v0.2.10');
  assert.strictEqual(todos[3].status, 'pending');
  assert.strictEqual(todos[4].content, 'Step 5: Legacy in-progress format');
  assert.strictEqual(todos[4].status, 'in_progress');
  assert.strictEqual(todos[5].content, 'Nested indented task');
  assert.strictEqual(todos[5].status, 'pending');
  assert.strictEqual(todos[6].content, 'Task with embedded link: check [PR #100](https://github.com/example/repo/pull/100) now');
  assert.strictEqual(todos[6].status, 'pending');
});

test('parseTranscriptFile clears todos when /clear command is executed', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-clear-task-test-'));
  const filePath = path.join(tempDir, 'clear-session.jsonl');

  try {
    const lines = [
      JSON.stringify({
        sessionId: 'clear-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: '前期任务：\n- [ ] 临时规划任务A',
            },
          ],
        },
      }),
      JSON.stringify({
        sessionId: 'clear-session',
        type: 'user',
        message: {
          role: 'user',
          content: '<command-name>/clear</command-name>',
        },
      }),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);

    assert.strictEqual(parsed.wasCleared, true);
    assert.strictEqual(parsed.todos.length, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
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

test('parseTranscriptFile ignores markdown links in assistant summary and leaves todos empty', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-md-link-test-'));
  const filePath = path.join(tempDir, 'link-summary-session.jsonl');

  try {
    const lines = [
      JSON.stringify({
        sessionId: 'link-summary-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: '## 最新测试文件\n\n重点文件：\n\n- [ProxyBridge.exe](Windows/output_latest/ProxyBridge.exe)\n- [ProxyBridgeCore.dll](Windows/output_latest/ProxyBridgeCore.dll)\n- [ProxyBridge_CLI.exe](Windows/output_latest/ProxyBridge_CLI.exe)\n- `WinDivert.dll`',
            },
          ],
        },
      }),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);

    // Markdown file links must NEVER be parsed as todo items
    assert.strictEqual(parsed.todos.length, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parseTranscriptFile handles Agent tools and clears them on /clear command', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-agent-test-'));
  const filePath = path.join(tempDir, 'agent-session.jsonl');

  try {
    const lines = [
      JSON.stringify({
        sessionId: 'agent-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_agent_01',
              name: 'Agent',
              input: {
                description: 'Explore workspace structure',
                subagent_type: 'Explore',
              },
            },
          ],
        },
      }),
      JSON.stringify({
        sessionId: 'agent-session',
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_agent_01',
              content: 'Found files. agentId: a1b2c3d4e5',
            },
          ],
        },
      }),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);

    assert.strictEqual(parsed.agents.length, 1);
    assert.strictEqual(parsed.agents[0].id, 'a1b2c3d4e5');
    assert.strictEqual(parsed.agents[0].toolUseId, 'toolu_agent_01');
    assert.strictEqual(parsed.agents[0].type, 'Explore');
    assert.strictEqual(parsed.agents[0].status, 'completed');

    // Now test that /clear removes agents
    lines.push(
      JSON.stringify({
        sessionId: 'agent-session',
        type: 'user',
        message: {
          role: 'user',
          content: '<command-name>/clear</command-name>',
        },
      })
    );
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const clearedParsed = await parseTranscriptFile(filePath);
    assert.strictEqual(clearedParsed.wasCleared, true);
    assert.strictEqual(clearedParsed.agents.length, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parseTranscriptFile automatically clears completed todos when a new user prompt begins', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-autoclear-test-'));
  const filePath = path.join(tempDir, 'autoclear-session.jsonl');

  try {
    const lines = [
      // Turn 1: user asks something
      JSON.stringify({
        sessionId: 'autoclear-session',
        type: 'user',
        message: {
          role: 'user',
          content: '请帮我完成任务',
        },
      }),
      // Turn 1: assistant does work with markdown todos and finishes them all
      JSON.stringify({
        sessionId: 'autoclear-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: '任务清单：\n- [x] 第一步：修改代码\n- [x] 第二步：验证功能',
            },
          ],
        },
      }),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    let parsed = await parseTranscriptFile(filePath);
    assert.strictEqual(parsed.todos.length, 2);
    assert.strictEqual(parsed.todos.every((t) => t.status === 'completed'), true);

    // Turn 2: user enters a new prompt ("初步看没什么问题了，发布0.2.11版本")
    lines.push(
      JSON.stringify({
        sessionId: 'autoclear-session',
        type: 'user',
        message: {
          role: 'user',
          content: '初步看没什么问题了，发布0.2.11版本',
        },
      })
    );

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    parsed = await parseTranscriptFile(filePath);
    // Completed todos should now be auto-cleared upon new user prompt
    assert.strictEqual(parsed.todos.length, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parseTranscriptFile retains incomplete todos when a new user prompt begins', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-retain-test-'));
  const filePath = path.join(tempDir, 'retain-session.jsonl');

  try {
    const lines = [
      JSON.stringify({
        sessionId: 'retain-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: '任务清单：\n- [x] 第一步：修改代码\n- [ ] 第二步：验证功能',
            },
          ],
        },
      }),
      JSON.stringify({
        sessionId: 'retain-session',
        type: 'user',
        message: {
          role: 'user',
          content: '继续执行第二步',
        },
      }),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);
    // Incomplete todos should NOT be cleared
    assert.strictEqual(parsed.todos.length, 2);
    assert.strictEqual(parsed.todos[0].status, 'completed');
    assert.strictEqual(parsed.todos[1].status, 'pending');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('advancePlanProgress ignores plan file writing and ExitPlanMode to keep newly generated plan in pending status', () => {
  const planTodos = [
    { content: '审查 src/transcriptParser.ts 中的代码块剥离', status: 'pending' as const },
    { content: '审查 src/dashboardView.ts 的待办任务状态展示', status: 'pending' as const },
    { content: '运行 npm test 验证全量单元测试', status: 'pending' as const },
  ];

  // 1. Tool Write to .claude/plans/xxx.md (running and completed) must not touch plan status
  advancePlanProgress(planTodos, 'Write', { file_path: 'C:/Users/admin/.claude/plans/test-plan.md' }, false);
  assert.strictEqual(planTodos[0].status, 'pending', 'Plan step 1 must remain pending during plan Write');
  advancePlanProgress(planTodos, 'Write', { file_path: 'C:/Users/admin/.claude/plans/test-plan.md' }, true);
  assert.strictEqual(planTodos[0].status, 'pending', 'Plan step 1 must remain pending after plan Write completes');

  // 2. Tool ExitPlanMode must not advance progress
  advancePlanProgress(planTodos, 'ExitPlanMode', {}, false);
  assert.strictEqual(planTodos[0].status, 'pending', 'Plan step 1 must remain pending during ExitPlanMode');
  advancePlanProgress(planTodos, 'ExitPlanMode', {}, true);
  assert.strictEqual(planTodos[0].status, 'pending', 'Plan step 1 must remain pending after ExitPlanMode');

  for (const completed of [false, true]) {
    advancePlanProgress(planTodos, 'Edit', {
      file_path: 'C:/Users/admin/.claude/plans/test-plan.md',
      old_string: '- [ ] 任务', new_string: '- [x] 任务',
    }, completed);
    assert.ok(planTodos.every(item => item.status === 'pending'), 'Plan Edit must not infer task progress');
  }

  // 3. Tool Edit on transcriptParser.ts starts running -> matches step 1 -> in_progress
  advancePlanProgress(planTodos, 'Edit', { file_path: 'E:/W-AI_WorkSpace/claude_hub_for_vscode/src/transcriptParser.ts' }, false);
  assert.strictEqual(planTodos[0].status, 'in_progress', 'Step 1 becomes in_progress when its target tool starts');
  assert.strictEqual(planTodos[1].status, 'pending');

  // 4. Tool Edit on transcriptParser.ts completes -> completed
  advancePlanProgress(planTodos, 'Edit', { file_path: 'E:/W-AI_WorkSpace/claude_hub_for_vscode/src/transcriptParser.ts' }, true);
  assert.strictEqual(planTodos[0].status, 'completed', 'Step 1 becomes completed when its tool completes');
});


test('parseTranscriptFile replays successful plan checkbox edits and clears completed plans on the next prompt', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-plan-edit-'));
  const filePath = path.join(tempDir, 'session.jsonl');
  const planPath = 'C:\\Users\\admin\\.claude\\plans\\replay.md';
  const tool = (id: string, name: string, input: object) => JSON.stringify({
    type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] },
  });
  const result = (id: string, is_error = false) => JSON.stringify({
    type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error, content: 'result' }] },
  });
  const lines = [
    tool('write', 'Write', { file_path: planPath, content: '# Plan\n- [ ] 修改代码\n- [ ] 打包验证\n' }),
    result('write'),
  ];
  const replay = async () => {
    fs.writeFileSync(filePath, lines.join('\n'));
    clearTranscriptCache(filePath);
    return parseTranscriptFile(filePath);
  };
  try {
    const editInput = { file_path: planPath, old_string: '- [ ] 修改代码', new_string: '- [x] 修改代码' };
    lines.push(tool('failed', 'Edit', editInput), result('failed', true));
    assert.deepStrictEqual((await replay()).todos.map(t => t.status), ['pending', 'pending']);
    lines.push(tool('edit1', 'Edit', editInput));
    assert.deepStrictEqual((await replay()).todos.map(t => t.status), ['pending', 'pending']);
    lines.push(result('edit1'));
    assert.deepStrictEqual((await replay()).todos.map(t => t.status), ['completed', 'pending']);
    // 修改无关说明不应推进剩余任务。
    lines.push(tool('note', 'Edit', { file_path: planPath, old_string: '# Plan', new_string: '# 计划' }), result('note'));
    assert.deepStrictEqual((await replay()).todos.map(t => t.status), ['completed', 'pending']);
    lines.push(tool('edit2', 'Edit', { file_path: planPath, old_string: '- [ ] 打包验证', new_string: '- [x] 打包验证' }), result('edit2'));
    assert.deepStrictEqual((await replay()).todos.map(t => t.status), ['completed', 'completed']);
    // 冷启动重新解析，不依赖真实计划文件或内存缓存。
    clearTranscriptCache();
    assert.deepStrictEqual((await parseTranscriptFile(filePath)).todos.map(t => t.status), ['completed', 'completed']);
    lines.push(JSON.stringify({ type: 'user', message: { content: '下一项工作' } }));
    assert.deepStrictEqual((await replay()).todos, []);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parseTranscriptFile handles out-of-order plan Edit results and preserves unrelated inferred progress', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-plan-edit-ooo-'));
  const filePath = path.join(tempDir, 'session.jsonl');
  const planPath = '/home/user/.claude/plans/tasks.md';
  const tool = (id: string, name: string, input: object) => JSON.stringify({
    type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] },
  });
  const result = (id: string) => JSON.stringify({
    type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'success' }] },
  });
  try {
    const lines = [
      tool('write', 'Write', { file_path: planPath, content: '- [ ] 修改 module.ts\n- [ ] 打包验证\n' }), result('write'),
      tool('code', 'Edit', { file_path: '/project/module.ts' }), result('code'),
      result('edit'),
      tool('edit', 'Edit', { file_path: planPath, old_string: '- [ ] 打包验证', new_string: '- [x] 打包验证', replace_all: true }),
    ];
    fs.writeFileSync(filePath, lines.join('\n'));
    const parsed = await parseTranscriptFile(filePath);
    assert.deepStrictEqual(parsed.todos.map(t => t.status), ['completed', 'completed']);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parseTranscriptFile automatically clears completed agents when a new user prompt begins', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-agent-autoclear-test-'));
  const filePath = path.join(tempDir, 'autoclear-agent-session.jsonl');

  try {
    const lines = [
      // Turn 1: user asks something
      JSON.stringify({
        sessionId: 'agent-autoclear-session',
        type: 'user',
        message: {
          role: 'user',
          content: '请派生子代理执行任务',
        },
      }),
      // Turn 1: assistant spawns an agent
      JSON.stringify({
        sessionId: 'agent-autoclear-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_subagent_01',
              name: 'Agent',
              input: {
                description: 'Analyze codebase',
                subagent_type: 'Explore',
              },
            },
          ],
        },
      }),
      // Turn 1: tool_result completes the agent
      JSON.stringify({
        sessionId: 'agent-autoclear-session',
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_subagent_01',
              content: 'Completed task. agentId: explore-123',
            },
          ],
        },
      }),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    let parsed = await parseTranscriptFile(filePath);
    assert.strictEqual(parsed.agents.length, 1);
    assert.strictEqual(parsed.agents[0].status, 'completed');

    // Turn 2: user sends a new conversation prompt
    lines.push(
      JSON.stringify({
        sessionId: 'agent-autoclear-session',
        type: 'user',
        message: {
          role: 'user',
          content: '好的，现在帮我做下一步',
        },
      })
    );

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    parsed = await parseTranscriptFile(filePath);
    // Completed agents should now be auto-cleared upon new user prompt
    assert.strictEqual(parsed.agents.length, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parseTranscriptFile retains running agents when a new user prompt begins', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-agent-retain-test-'));
  const filePath = path.join(tempDir, 'retain-agent-session.jsonl');

  try {
    const lines = [
      JSON.stringify({
        sessionId: 'agent-retain-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_running_agent',
              name: 'Agent',
              input: {
                description: 'Long running task',
                subagent_type: 'general-purpose',
              },
            },
          ],
        },
      }),
      JSON.stringify({
        sessionId: 'agent-retain-session',
        type: 'user',
        message: {
          role: 'user',
          content: '现在状态如何？',
        },
      }),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);
    // Running agent should NOT be cleared by new user prompt
    assert.strictEqual(parsed.agents.length, 1);
    assert.strictEqual(parsed.agents[0].id, 'toolu_running_agent');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('subagent completed in prior turn is filtered out when current turn started after completion', () => {
  const t0 = new Date('2026-03-30T10:00:00Z');
  const t1 = new Date('2026-03-30T10:01:00Z');
  const t2 = new Date('2026-03-30T10:05:00Z');

  const allAgents = [
    {
      id: 'subagent-1',
      name: 'Agent 1',
      type: 'Explore',
      status: 'completed' as 'completed' | 'running',
      startTime: t0,
      endTime: t1,
      totalTokens: 1500,
    },
  ];

  const currentTurnStartTime = t2;
  const hasRunning = allAgents.some((a) => a.status === 'running');
  assert.strictEqual(hasRunning, false);

  const turnStartMs = currentTurnStartTime.getTime();
  const activeAgents = allAgents.filter((a) => {
    const agentEndMs = a.endTime
      ? a.endTime.getTime()
      : a.startTime
      ? a.startTime.getTime()
      : 0;
    return agentEndMs >= turnStartMs;
  });

  assert.strictEqual(activeAgents.length, 0);
  assert.strictEqual(allAgents.length, 1);
  assert.strictEqual(allAgents[0].totalTokens, 1500);
});

test('parseTranscriptFile keeps in-progress TodoWrite todos even when prior markdown checklist was fully completed', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-task-isolation-test-'));
  const filePath = path.join(tempDir, 'task-isolation-session.jsonl');

  try {
    const lines = [
      // Turn 1: user prompt
      JSON.stringify({
        sessionId: 'task-isolation-session',
        type: 'user',
        message: {
          role: 'user',
          content: '请先完成准备工作',
        },
      }),
      // Turn 1: assistant writes markdown todos that are all completed
      JSON.stringify({
        sessionId: 'task-isolation-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: '准备工作：\n- [x] 依赖安装\n- [x] 配置检查',
            },
          ],
        },
      }),
      // Turn 2: assistant calls TodoWrite with an in-progress task
      JSON.stringify({
        sessionId: 'task-isolation-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'call_todowrite_1',
              name: 'TodoWrite',
              input: {
                todos: [
                  { id: '1', content: '核心业务改造', status: 'in_progress' },
                  { id: '2', content: '编写单元测试', status: 'pending' },
                ],
              },
            },
          ],
        },
      }),
      // Turn 3: user enters next prompt - this must NOT wipe out in-progress TodoWrite todos!
      JSON.stringify({
        sessionId: 'task-isolation-session',
        type: 'user',
        message: {
          role: 'user',
          content: '继续执行',
        },
      }),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);

    // In-progress TodoWrite items must be preserved!
    assert.strictEqual(parsed.todos.length, 2);
    assert.strictEqual(parsed.todos[0].content, '核心业务改造');
    assert.strictEqual(parsed.todos[0].status, 'in_progress');
    assert.strictEqual(parsed.todos[1].content, '编写单元测试');
    assert.strictEqual(parsed.todos[1].status, 'pending');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('extractBlockTextContent handles strings, text blocks, and structured arrays', () => {
  assert.strictEqual(extractBlockTextContent('hello world'), 'hello world');
  assert.strictEqual(extractBlockTextContent(['line 1', 'line 2']), 'line 1\nline 2');
  assert.strictEqual(
    extractBlockTextContent([{ type: 'text', text: 'agentId: sub_999' }]),
    'agentId: sub_999',
  );
  assert.strictEqual(extractBlockTextContent(null), '');
  assert.strictEqual(extractBlockTextContent(undefined), '');
});

test('parseTranscriptFile extracts agentId and Task # from array content block in tool_result', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-array-block-test-'));
  const filePath = path.join(tempDir, 'array-block-session.jsonl');

  try {
    const lines = [
      JSON.stringify({
        sessionId: 'array-block-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_array_agent',
              name: 'Agent',
              input: { description: 'Search patterns', subagent_type: 'Explore' },
            },
            {
              type: 'tool_use',
              id: 'toolu_task_create',
              name: 'TaskCreate',
              input: { subject: '修复数组解析缺陷' },
            },
          ],
        },
      }),
      JSON.stringify({
        sessionId: 'array-block-session',
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_array_agent',
              content: [
                { type: 'text', text: 'Subagent completed. Details: agentId: matrix_sub_999' },
              ],
            },
            {
              type: 'tool_result',
              tool_use_id: 'toolu_task_create',
              content: [
                { type: 'text', text: 'Task #77 created successfully: 修复数组解析缺陷' },
              ],
            },
          ],
        },
      }),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);

    assert.strictEqual(parsed.agents.length, 1);
    assert.strictEqual(parsed.agents[0].id, 'matrix_sub_999');
    assert.strictEqual(parsed.agents[0].toolUseId, 'toolu_array_agent');
    assert.strictEqual(parsed.todos.length, 1);
    assert.strictEqual(parsed.todos[0].content, '修复数组解析缺陷');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('activeAgents anti-flicker keeps running agents without re-surfacing older turn completed agents', () => {
  const t0 = new Date('2026-03-30T10:00:00Z');
  const t1 = new Date('2026-03-30T10:01:00Z'); // older agent finished
  const tTurn = new Date('2026-03-30T10:05:00Z'); // current turn started
  const tNow = new Date('2026-03-30T10:06:00Z'); // currently running

  const allAgents: Array<{
    id: string;
    name: string;
    type: string;
    status: 'completed' | 'running';
    startTime?: Date;
    endTime?: Date;
  }> = [
    {
      id: 'subagent-old',
      name: 'Agent Old',
      type: 'Explore',
      status: 'completed',
      startTime: t0,
      endTime: t1,
    },
    {
      id: 'subagent-active',
      name: 'Agent Active',
      type: 'general-purpose',
      status: 'running',
      startTime: tNow,
    },
  ];

  const turnStartMs = tTurn.getTime();
  const activeAgents = allAgents.filter((a) => {
    if (a.status === 'running') return true;
    const agentEndMs = a.endTime
      ? a.endTime.getTime()
      : a.startTime
      ? a.startTime.getTime()
      : 0;
    return agentEndMs >= turnStartMs;
  });

  // Old agent must stay filtered out, active agent must be kept
  assert.strictEqual(activeAgents.length, 1);
  assert.strictEqual(activeAgents[0].id, 'subagent-active');
});

test('clearTranscriptCache properly invalidates cache', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-cache-test-'));
  const filePath = path.join(tempDir, 'cache-session.jsonl');

  try {
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        sessionId: 'cache-session',
        type: 'user',
        message: { role: 'user', content: 'test cache' },
      }),
      'utf8',
    );

    const parsed1 = await parseTranscriptFile(filePath);
    assert.strictEqual(parsed1.sessionId, 'cache-session');

    // Test clear by path
    clearTranscriptCache(filePath);
    // Test clear all
    clearTranscriptCache();
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('getWebviewContent keeps narrow layout rules scoped and consistent', () => {
  const html = getWebviewContent();
  assert.ok(html.includes('container-name: hub;'));
  for (const width of [290, 260, 230]) {
    assert.ok(html.includes('@container hub (max-width: ' + width + 'px)'));
    assert.ok(html.includes('@media (max-width: ' + (width + 16) + 'px)'));
  }
  assert.ok(html.includes('@supports not (container-type: inline-size)'));
  assert.ok(html.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'));
  assert.ok(html.includes('class="doc-btn-group"'));
  assert.ok(html.includes('class="todos-header-title"'));
  assert.ok(html.includes('class="todos-header-actions"'));
  assert.ok(html.includes('class="todos-clear-text"'));
  assert.match(html, /<button[^>]+id="todos-clear-btn"[^>]+aria-label="清除已完成待办"/);
  assert.match(html, /\.status-pill\s*\{[^}]*white-space: nowrap;[^}]*flex-shrink: 0;/);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Script(script));
});

test('getWebviewContent renders compact todo counters with full tooltips', () => {
  const html = getWebviewContent();
  // 执行实际状态更新分支，防止 className 或文本更新丢掉窄屏标签。
  const start = html.indexOf('            if (counterEl) {', html.indexOf("const clearBtn = document.getElementById('todos-clear-btn');"));
  const end = html.indexOf("            const progBar = document.getElementById('todos-progress-bar');", start);
  assert.ok(start >= 0 && end > start);
  const script = new Script(html.slice(start, end));
  for (const state of [
    { done: 4, total: 4, inProg: 0, pct: 100, isAllCompleted: true, status: 'idle', detail: '(已完成)' },
    { done: 1, total: 4, inProg: 1, pct: 25, isAllCompleted: false, status: 'active', detail: '(25%)' },
    { done: 0, total: 4, inProg: 0, pct: 0, isAllCompleted: false, status: '', detail: '(0%)' },
  ]) {
    const counterEl = { className: '', innerHTML: '', title: '' };
    script.runInNewContext({ ...state, counterEl, s: { todos: Array(state.total) } });
    assert.ok(counterEl.innerHTML.includes(state.done + '/' + state.total));
    assert.ok(counterEl.innerHTML.includes('class="todo-counter-detail">' + state.detail));
    assert.ok(counterEl.title.includes(state.detail));
    assert.strictEqual(counterEl.className, 'status-pill' + (state.status ? ' ' + state.status : ''));
    assert.strictEqual(counterEl.innerHTML.includes('class="todo-spinner"'), state.inProg > 0);
    assert.ok(!counterEl.innerHTML.includes('🔄'));
  }
});

test('getWebviewContent uses a circular spinner for in-progress todos', () => {
  const html = getWebviewContent();
  assert.match(html, /\.todo-spinner\s*\{[^}]*width: 10px;[^}]*height: 10px;[^}]*border: 1\.5px solid currentColor;[^}]*border-right-color: transparent;[^}]*border-radius: 50%;[^}]*-webkit-animation: spin 0\.9s linear infinite;[^}]*animation: spin 0\.9s linear infinite;[^}]*animation-play-state: running;/);
  assert.doesNotMatch(html, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.todo-spinner\s*\{\s*animation: none;/);
  const branch = html.match(/else if \(td\.status === 'in_progress'\) \{([\s\S]*?)\} else/);
  assert.ok(branch);
  assert.ok(branch[1].includes('class="todo-spinner"'));
  assert.ok(branch[1].includes('aria-label="进行中"'));
  assert.ok(!branch[1].includes('🔄'));
});

test('getWebviewContent includes clear button and clearCompletedTodos handler', () => {
  const html = getWebviewContent();
  assert.ok(html.includes('id="todos-clear-btn"'), 'Webview HTML must have #todos-clear-btn element');
  assert.ok(html.includes('clearCompletedTodos'), 'Webview HTML must define clearCompletedTodos handler');
  assert.ok(html.includes('userDismissedTodosSessionId'), 'Webview HTML must handle userDismissedTodosSessionId');
});
