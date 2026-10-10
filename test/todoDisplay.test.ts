import assert from 'node:assert';
import test from 'node:test';
import { splitTodoDisplay, stripTodoMarkdownNoise } from '../src/todoDisplay.js';
import { getWebviewContent } from '../src/webviewHtml.js';

test('stripTodoMarkdownNoise removes bold markers', () => {
  assert.strictEqual(stripTodoMarkdownNoise('**任务 1：修复解析**'), '任务 1：修复解析');
  assert.strictEqual(stripTodoMarkdownNoise('hello **world**'), 'hello world');
});

test('splitTodoDisplay uses description as body', () => {
  const parts = splitTodoDisplay({
    id: 't1',
    content: '**任务 1：标题**',
    description: '详细说明一行',
    status: 'pending',
  });
  assert.strictEqual(parts.title, '任务 1：标题');
  assert.strictEqual(parts.body, '详细说明一行');
  assert.strictEqual(parts.key, 't1');
  assert.strictEqual(parts.subtitle, '');
});

test('splitTodoDisplay splits 任务N title from multiline content', () => {
  const parts = splitTodoDisplay({
    content: '任务 2：实现卡片布局\n把 icon 与 title/body 分列，并加入状态 chip。',
    status: 'pending',
  });
  assert.match(parts.title, /^任务 2：/);
  assert.ok(parts.body.includes('icon'));
});

test('splitTodoDisplay clamps long single-line content into title+body', () => {
  const long = '这是一条非常长的待办事项内容用于验证标题截断与正文保留完整文本内容以便展开查看全部细节';
  const parts = splitTodoDisplay({ content: long, status: 'pending' });
  assert.ok(parts.title.endsWith('…') || parts.title.length <= 48);
  assert.ok(parts.body.length > 0);
});

test('splitTodoDisplay activeForm subtitle only when in_progress', () => {
  const active = splitTodoDisplay({
    content: '写测试',
    status: 'in_progress',
    activeForm: '正在编写单元测试',
  });
  assert.strictEqual(active.subtitle, '正在编写单元测试');
  const pending = splitTodoDisplay({
    content: '写测试',
    status: 'pending',
    activeForm: '正在编写单元测试',
  });
  assert.strictEqual(pending.subtitle, '');
});

test('webview HTML includes todo polish classes', () => {
  const html = getWebviewContent();
  for (const cls of [
    'todo-card-main',
    'todo-title-row',
    'todo-status-chip',
    'todo-body',
    'todo-expand-btn',
    'todo-active-form',
    'todos-activity-warn',
    'todos-activity-part',
  ]) {
    assert.ok(html.includes(cls), `missing class ${cls}`);
  }
  assert.ok(html.includes('function splitTodoDisplay'));
  assert.ok(html.includes('function renderTodosList'));
  assert.ok(html.includes('todoExpandState'));
  assert.ok(html.includes('阶段待确认'));
});
