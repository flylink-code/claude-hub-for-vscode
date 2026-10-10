import assert from 'node:assert';
import test from 'node:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  extractTodoConfigFromMarkdown,
  parseTodoConfigFenceBody,
  normalizeTodoConfigObject,
  readProjectTodoPolicy,
  clearProjectTodoPolicyCache,
  buildTaskSyncPrompt,
  shouldWarnPlanWithoutChecklist,
  PROJECT_TODO_DOC_MAX_BYTES,
  resolvePreferSource,
  allowChecklistFill,
  todoModeFromSource,
} from '../src/projectTodoPolicy.js';
import { getWebviewContent } from '../src/webviewHtml.js';

const FENCE = '```';
const SAMPLE_SECTION = [
  '## Claude Hub — Task Tracking / 任务追踪',
  '',
  '### For Claude Code',
  '- Prefer TaskCreate.',
  '',
  FENCE + 'json',
  '{',
  '  "prefer_source": "tasks",',
  '  "plan_checklist": "required",',
  '  "sync_prompt_style": "brief",',
  '  "warn_plan_without_checklist": true,',
  '  "activity_separate_from_status": true',
  '}',
  FENCE,
  '',
].join('\n');

test('normalizeTodoConfigObject allowlists keys and drops unknowns', () => {
  const normalized = normalizeTodoConfigObject({
    prefer_source: 'checklist',
    plan_checklist: 'preferred',
    sync_prompt_style: 'custom',
    warn_plan_without_checklist: true,
    activity_separate_from_status: false,
    sync_prompt_custom_zh: '中文自定义',
    sync_prompt_custom_en: 'English custom',
    evil: 'nope',
    prefer_source_typo: 'tasks',
  });
  assert.strictEqual(normalized.prefer_source, 'checklist');
  assert.strictEqual(normalized.plan_checklist, 'preferred');
  assert.strictEqual(normalized.sync_prompt_style, 'custom');
  assert.strictEqual(normalized.warn_plan_without_checklist, true);
  assert.strictEqual(normalized.activity_separate_from_status, false);
  assert.strictEqual(normalized.sync_prompt_custom_zh, '中文自定义');
  assert.strictEqual(normalized.sync_prompt_custom_en, 'English custom');
  assert.strictEqual((normalized as any).evil, undefined);
});

test('parseTodoConfigFenceBody accepts JSON with # comments stripped', () => {
  const parsed = parseTodoConfigFenceBody(`# claude-hub.todo-config v1
{
  "prefer_source": "auto",
  "warn_plan_without_checklist": false
}
`);
  assert.ok(parsed);
  assert.strictEqual(parsed!.prefer_source, 'auto');
  assert.strictEqual(parsed!.warn_plan_without_checklist, false);
});

test('extractTodoConfigFromMarkdown finds section and JSON fence; ignores outside', () => {
  const md = [
    '# AGENTS.md',
    '',
    '## Other',
    FENCE + 'json',
    '{ "prefer_source": "todoWrite", "warn_plan_without_checklist": true }',
    FENCE,
    '',
    SAMPLE_SECTION,
    '',
    '## Build',
    'ok',
    '',
  ].join('\n');
  const policy = extractTodoConfigFromMarkdown(md);
  assert.ok(policy);
  assert.strictEqual(policy!.prefer_source, 'tasks');
  assert.strictEqual(policy!.plan_checklist, 'required');
  assert.strictEqual(policy!.sync_prompt_style, 'brief');
});

test('extractTodoConfigFromMarkdown accepts fence info marker claude-hub.todo-config', () => {
  const md = `## Claude Hub - Task Tracking

\`\`\`claude-hub.todo-config
{ "prefer_source": "todoWrite", "sync_prompt_style": "verify" }
\`\`\`
`;
  const policy = extractTodoConfigFromMarkdown(md);
  assert.ok(policy);
  assert.strictEqual(policy!.prefer_source, 'todoWrite');
});

test('readProjectTodoPolicy prefers AGENTS.md over CLAUDE.md', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-todo-policy-'));
  try {
    fs.writeFileSync(
      path.join(dir, 'CLAUDE.md'),
      `## Claude Hub — Task Tracking\n\n\`\`\`json\n{ "prefer_source": "checklist", "sync_prompt_style": "brief" }\n\`\`\`\n`,
      'utf8',
    );
    fs.writeFileSync(
      path.join(dir, 'AGENTS.md'),
      `## Claude Hub — Task Tracking / 任务追踪\n\n\`\`\`json\n{ "prefer_source": "tasks", "warn_plan_without_checklist": true }\n\`\`\`\n`,
      'utf8',
    );
    clearProjectTodoPolicyCache();
    const policy = readProjectTodoPolicy(dir);
    assert.ok(policy);
    assert.strictEqual(policy!.sourceFile, 'AGENTS.md');
    assert.strictEqual(policy!.prefer_source, 'tasks');
    assert.strictEqual(policy!.warn_plan_without_checklist, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readProjectTodoPolicy falls back to CLAUDE.md and caches by mtime', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-todo-policy-claude-'));
  try {
    const claude = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(
      claude,
      `## Claude Hub — Task Tracking\n\n\`\`\`json\n{ "prefer_source": "auto", "plan_checklist": "optional" }\n\`\`\`\n`,
      'utf8',
    );
    clearProjectTodoPolicyCache();
    const first = readProjectTodoPolicy(dir);
    assert.strictEqual(first?.sourceFile, 'CLAUDE.md');
    assert.strictEqual(first?.prefer_source, 'auto');
    const second = readProjectTodoPolicy(dir);
    assert.strictEqual(second?.prefer_source, 'auto');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readProjectTodoPolicy ignores oversized docs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-todo-policy-big-'));
  try {
    const huge = 'x'.repeat(PROJECT_TODO_DOC_MAX_BYTES + 10);
    fs.writeFileSync(
      path.join(dir, 'AGENTS.md'),
      `## Claude Hub — Task Tracking\n\n\`\`\`json\n{ "prefer_source": "tasks" }\n\`\`\`\n` + huge,
      'utf8',
    );
    clearProjectTodoPolicyCache();
    assert.strictEqual(readProjectTodoPolicy(dir), undefined);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('buildTaskSyncPrompt respects verify/brief/custom styles', () => {
  const items = '- phase 0';
  const verify = buildTaskSyncPrompt({ language: 'en', itemLines: items, planPath: '/p.md' });
  assert.ok(verify.includes('Do not infer phase completion'));
  assert.ok(verify.includes('Plan: /p.md'));
  assert.ok(verify.includes(items));

  const brief = buildTaskSyncPrompt({
    language: 'zh-CN',
    itemLines: items,
    policy: { sync_prompt_style: 'brief' },
  });
  assert.ok(brief.includes('仅在验证后标记 completed'));
  assert.ok(!brief.includes('若计划文件可编辑'));

  const custom = buildTaskSyncPrompt({
    language: 'zh-CN',
    itemLines: items,
    policy: {
      sync_prompt_style: 'custom',
      sync_prompt_custom_zh: '自定义中文提示',
      sync_prompt_custom_en: 'custom en',
    },
  });
  assert.ok(custom.startsWith('自定义中文提示'));
});

test('shouldWarnPlanWithoutChecklist only when policy asks and plan lacks checklist', () => {
  assert.strictEqual(shouldWarnPlanWithoutChecklist(undefined, { isChecklist: false }), false);
  assert.strictEqual(
    shouldWarnPlanWithoutChecklist({ warn_plan_without_checklist: true }, undefined),
    false,
  );
  assert.strictEqual(
    shouldWarnPlanWithoutChecklist({ warn_plan_without_checklist: true }, { isChecklist: true }),
    false,
  );
  assert.strictEqual(
    shouldWarnPlanWithoutChecklist({ warn_plan_without_checklist: true }, { isChecklist: false }),
    true,
  );
});

test('getWebviewContent includes plan-without-checklist warning chip helpers', () => {
  const html = getWebviewContent();
  assert.ok(html.includes('id="todos-plan-warn"'));
  assert.ok(html.includes('function shouldWarnPlanWithoutChecklist(session)'));
  assert.ok(html.includes('function updateTodosPlanWarn(session)'));
  assert.ok(html.includes('warn_plan_without_checklist'));
  assert.ok(html.includes('activity_separate_from_status'));
});




test('resolvePreferSource defaults to auto (dual); policy wins', () => {
  assert.strictEqual(resolvePreferSource(undefined, undefined), 'auto');
  assert.strictEqual(resolvePreferSource(undefined, 'auto'), 'auto');
  assert.strictEqual(resolvePreferSource(undefined, 'tasks'), 'tasks');
  assert.strictEqual(resolvePreferSource(undefined, 'checklist'), 'checklist');
  assert.strictEqual(resolvePreferSource({ prefer_source: 'todoWrite' }, 'tasks'), 'todoWrite');
  assert.strictEqual(resolvePreferSource({ prefer_source: 'auto' }, 'checklist'), 'auto');
});

test('allowChecklistFill: dual/auto allow; tasks-only needs required', () => {
  assert.strictEqual(allowChecklistFill('auto', undefined), true);
  assert.strictEqual(allowChecklistFill('tasks', undefined), false);
  assert.strictEqual(allowChecklistFill('tasks', { plan_checklist: 'preferred' }), false);
  assert.strictEqual(allowChecklistFill('tasks', { plan_checklist: 'required' }), true);
  assert.strictEqual(allowChecklistFill('checklist', undefined), true);
});

test('todoModeFromSource maps Task vs Checklist families', () => {
  assert.strictEqual(todoModeFromSource('native'), 'task');
  assert.strictEqual(todoModeFromSource('tasks'), 'task');
  assert.strictEqual(todoModeFromSource('todoWrite'), 'task');
  assert.strictEqual(todoModeFromSource('plan'), 'checklist');
  assert.strictEqual(todoModeFromSource('markdown'), 'checklist');
  assert.strictEqual(todoModeFromSource('none'), 'none');
});
