import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatStatusBarText,
  resolveRenderOptions,
  resolveTooltipSections,
  DEFAULT_TOOLTIP_SECTIONS,
} from '../src/statusBarFormatter.js';
import { buildStatusTooltipMarkup, HOVER_ALLOWED_COMMANDS } from '../src/statusBarTooltip.js';
import { getWebviewContent } from '../src/webviewHtml.js';
import { SessionInfo } from '../src/types.js';

function makeSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
  const now = new Date('2026-11-15T10:00:00.000Z');
  return {
    sessionId: 'sess-v3-test',
    projectName: 'demo-app',
    projectPath: '/tmp/demo-app',
    sessionFile: '/tmp/demo-app/session.jsonl',
    sessionTitle: 'Optimize <script>alert(1)</script> UI',
    model: 'claude-opus-5-5',
    contextLimit: 200000,
    lastUpdated: now,
    isIdle: false,
    isCurrentWorkspace: true,
    gitBranch: 'feat/v0.3<xss>',
    durationMs: 750000,
    totalSpanMs: 1800000,
    tokenUsage: {
      inputTokens: 12000,
      outputTokens: 3400,
      cacheCreationTokens: 2000,
      cacheReadTokens: 66000,
      totalTokens: 84000,
      percentage: 42,
    },
    outputSpeed: {
      tokensPerSecond: 58.4,
      model: 'claude-opus-5-5',
      measuredAt: now.getTime(),
      source: 'statusLine',
      outputTokens: 584,
      durationMs: 10000,
    },
    skills: [],
    mcpServers: [],
    wasCleared: false,
    tools: [],
    activeTools: [{ id: 'tool-1', name: 'Edit', target: '/src/<bad>.ts', status: 'running', startTime: new Date(now.getTime() - 4000) }],
    todos: [
      { id: '1', content: 'Build <b>layout</b>', status: 'completed' },
      { id: '2', content: 'Verify tests', status: 'in_progress', activeForm: 'Running suite' },
    ],
    agents: [
      { id: 'a1', type: 'code-reviewer', name: 'reviewer', status: 'running', startTime: now },
      { id: 'a2', type: 'Explore', name: 'helper', status: 'completed', startTime: now, durationMs: 4000 },
    ],
    backgroundJobs: [
      { id: 'bg1', kind: 'shell', label: 'npm test', status: 'running', startTime: now },
    ],
    ...overrides,
  };
}

test('resolveRenderOptions defaults to modern style and compact preset', () => {
  const opts = resolveRenderOptions({
    get: <T>(_key: string, def?: T) => def,
  });
  assert.equal(opts.style, 'modern');
  assert.equal(opts.preset, 'compact');
  assert.equal(opts.separator, 'dot');
  assert.equal(opts.showSpeed, true);
});

test('formatStatusBarText supports speed preset, pipe separator, and modern vs classic icons', () => {
  const speedText = formatStatusBarText({
    percentage: 42,
    totalTokens: 84000,
    contextLimit: 200000,
    modelDisplay: 'Opus 5.5',
    hasRunningTool: false,
    outputTokensPerSecond: 58.4,
    options: {
      preset: 'speed',
      style: 'modern',
      separator: 'dot',
      contextFormat: 'percent',
      showProgressBar: false,
      showModel: true,
      showCost: false,
      showGitBranch: false,
      showTodos: false,
      showTools: true,
    },
  });
  assert.equal(speedText, '$(sparkle) 58.4 tok/s · Opus 5.5');

  const customModern = formatStatusBarText({
    percentage: 42,
    totalTokens: 84000,
    contextLimit: 200000,
    modelDisplay: 'Opus 5.5',
    hasRunningTool: false,
    cost: '$0.18',
    durationMs: 750000,
    agentsRunning: 1,
    agentsTotal: 2,
    gitBranch: 'main',
    todos: [{ status: 'completed' }, { status: 'pending' }],
    options: {
      preset: 'custom',
      style: 'modern',
      separator: 'pipe',
      contextFormat: 'percent',
      showContext: true,
      showProgressBar: false,
      showSpeed: false,
      showModel: true,
      showCost: true,
      showDuration: true,
      showTodos: true,
      showAgents: true,
      showGitBranch: true,
      showTools: false,
    },
  });
  assert.equal(
    customModern,
    '$(sparkle) 42% │ Opus 5.5 │ $0.18 │ 12m │ $(check) 1/2 │ $(hubot) 1/2 │ $(git-branch) main',
  );

  const customClassic = formatStatusBarText({
    percentage: 42,
    totalTokens: 84000,
    contextLimit: 200000,
    modelDisplay: 'Opus 5.5',
    hasRunningTool: false,
    agentsRunning: 1,
    agentsTotal: 2,
    gitBranch: 'main',
    todos: [{ status: 'completed' }, { status: 'pending' }],
    options: {
      preset: 'custom',
      style: 'classic',
      separator: 'dot',
      contextFormat: 'percent',
      showContext: false,
      showProgressBar: false,
      showSpeed: false,
      showModel: false,
      showCost: false,
      showTodos: true,
      showAgents: true,
      showGitBranch: true,
      showTools: false,
    },
  });
  assert.equal(customClassic, '$(sparkle) ☑ 1/2 · 🤖 1/2 · 🌿 main');
});

test('resolveTooltipSections merges partial overrides cleanly', () => {
  const sections = resolveTooltipSections({
    get: <T>() => ({ context: true, speed: false, quota: false }) as unknown as T,
  });
  assert.equal(sections.context, true);
  assert.equal(sections.speed, false);
  assert.equal(sections.quota, false);
  assert.equal(sections.tokens, DEFAULT_TOOLTIP_SECTIONS.tokens);
});

test('buildStatusTooltipMarkup renders borderless HTML tables in modern style and escapes untrusted strings', () => {
  const session = makeSession();
  const markup = buildStatusTooltipMarkup({
    session,
    subscription: {
      session: { key: '5h', label: '5h', percentage: 24, isActive: true, resetsAt: new Date('2026-11-15T12:00:00.000Z') },
      meters: [],
      lastUpdated: new Date('2026-11-15T10:00:00.000Z'),
    },
    model: 'Opus 5.5 · high',
    cost: '$0.18',
    filterMode: 'currentWorkspace',
    style: 'modern',
    now: new Date('2026-11-15T10:02:00.000Z').getTime(),
  });

  assert.ok(markup.includes('<table width="100%"><tbody><tr>'));
  assert.ok(markup.includes('color:var(--vscode-charts-blue);'));
  assert.ok(markup.includes('color:var(--vscode-descriptionForeground);'));
  assert.ok(markup.includes('$(sparkle)'));
  assert.ok(markup.includes('$(git-branch)'));
  assert.ok(markup.includes('command:claudeHub.openDashboardTab'));
  assert.ok(HOVER_ALLOWED_COMMANDS.includes('claudeHub.openDashboardTab'));

  // XSS payloads from branch/tool target must be HTML-escaped
  assert.ok(!markup.includes('<script>'));
  assert.ok(!markup.includes('<bad>'));
  assert.ok(markup.includes('feat/v0.3&lt;xss&gt;'));
  assert.ok(markup.includes('&lt;bad&gt;.ts'));
});

test('buildStatusTooltipMarkup honors tooltipSections toggles in both modern and classic styles', () => {
  const session = makeSession();
  const modernMinimal = buildStatusTooltipMarkup({
    session,
    subscription: null,
    model: 'Opus 5.5',
    cost: '$0.18',
    filterMode: 'all',
    style: 'modern',
    sections: {
      context: true,
      speed: false,
      modelBranch: false,
      activityDur: false,
      tokens: false,
      todos: false,
      agents: false,
      quota: false,
      actions: false,
    },
  });
  assert.ok(modernMinimal.includes('42%'));
  assert.ok(!modernMinimal.includes('58.4 tok/s'));
  assert.ok(!modernMinimal.includes('command:claudeHub.openDashboard'));
  assert.ok(!modernMinimal.includes('\n\n---\n\n\n\n---\n\n'));

  // A single remaining detail cell (only todos enabled) must stay left-aligned
  const todosOnlyMarkup = buildStatusTooltipMarkup({
    session,
    subscription: null,
    model: 'Opus 5.5',
    cost: '$0.18',
    filterMode: 'all',
    style: 'modern',
    sections: {
      context: false,
      speed: false,
      modelBranch: false,
      activityDur: false,
      tokens: false,
      todos: true,
      agents: false,
      quota: false,
      actions: false,
    },
  });
  assert.ok(todosOnlyMarkup.includes('1/2'));
  const detailTable = todosOnlyMarkup.split('---')[1] || '';
  assert.ok(!detailTable.includes('align="right"'));

  const classicMarkup = buildStatusTooltipMarkup({
    session,
    subscription: null,
    model: 'Opus 5.5',
    cost: '$0.18',
    filterMode: 'all',
    style: 'classic',
    sections: {
      context: true,
      speed: true,
      modelBranch: true,
      activityDur: true,
      tokens: true,
      todos: true,
      agents: true,
      quota: true,
      actions: true,
    },
  });
  assert.ok(classicMarkup.includes('▰'));
  assert.ok(classicMarkup.includes('command:claudeHub.openDashboardTab'));
  assert.ok(!classicMarkup.includes('<script>'));
});

test('webview v0.3 fixes subagent horizontal overflow and exposes visual statusBar customizer', () => {
  const html = getWebviewContent();
  assert.match(html, /\.agent-item\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*overflow:\s*hidden;/);
  assert.match(html, /\.agent-item\.nested\s*\{[^}]*margin-left:\s*12px;[^}]*max-width:\s*calc\(100% - 12px\);/);
  assert.ok(!html.includes('.agent-item.nested::before'));

  for (const id of [
    'sb-style-group',
    'sb-preset-group',
    'sb-field-chips',
    'sb-tooltip-chips',
    'sb-context-format',
    'sb-separator',
    'sb-click-action',
    'sb-hide-inactive',
  ]) {
    assert.ok(html.includes('id="' + id + '"'), 'missing settings customizer control: ' + id);
  }
  assert.ok(html.includes('function renderStatusBarSettings'));
  assert.ok(html.includes("sendMessage('updateStatusBarConfig'"));
  assert.ok(html.includes('role="switch"'));
  assert.match(html, /body\.narrow \.brand \.status-pill\s*\{\s*display:\s*none;\s*\}/);
  assert.match(html, /\.head-actions\s*\{[^}]*flex-shrink:\s*0;/);
  assert.match(html, /body\.narrow #sb-preset-group\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
});
