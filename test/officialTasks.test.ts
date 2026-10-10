import assert from 'node:assert';
import test from 'node:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  parseTranscriptFile,
  normalizeOfficialTaskItem,
  extractTaskListItems,
  extractTaskGetItem,
  resolveTaskId,
} from '../src/transcriptParser.js';
import {
  resolveNativeListCandidate,
  NativeTaskReader,
  writeTaskAssociation,
  readTaskAssociation,
} from '../src/nativeTasks.js';
import { getWebviewContent } from '../src/webviewHtml.js';

test('normalizeOfficialTaskItem maps official fields', () => {
  const item = normalizeOfficialTaskItem({
    id: 't1',
    subject: 'Wire TaskList',
    status: 'in_progress',
    activeForm: 'Refreshing list',
    blockedBy: ['t0'],
    blocks: ['t2'],
  });
  assert.ok(item);
  assert.strictEqual(item!.id, 't1');
  assert.strictEqual(item!.content, 'Wire TaskList');
  assert.strictEqual(item!.status, 'in_progress');
  assert.strictEqual(item!.activeForm, 'Refreshing list');
  assert.deepStrictEqual(item!.blockedBy, ['t0']);
  assert.deepStrictEqual(item!.blocks, ['t2']);
  assert.strictEqual(normalizeOfficialTaskItem({ id: 'x', status: 'deleted', subject: 'gone' }), undefined);
  assert.strictEqual(normalizeOfficialTaskItem({ subject: 'no id' }), undefined);
});

test('extractTaskListItems accepts tasks/items/array shapes', () => {
  assert.strictEqual(extractTaskListItems({ tasks: [{ id: '1' }] }, '').length, 1);
  assert.strictEqual(extractTaskListItems({ items: [{ id: '2' }] }, '').length, 1);
  assert.strictEqual(extractTaskListItems([{ id: '3' }], '').length, 1);
  assert.strictEqual(extractTaskListItems({}, '[{"id":"4","subject":"x"}]').length, 1);
});

test('extractTaskGetItem reads task wrapper', () => {
  const raw = extractTaskGetItem({ task: { id: '9', subject: 'One', status: 'pending' } }, '');
  assert.strictEqual(resolveTaskId(raw), '9');
});

test('parseTranscriptFile TaskList fully refreshes todos', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-tasklist-'));
  const filePath = path.join(tempDir, 'list.jsonl');
  try {
    const lines = [
      JSON.stringify({
        sessionId: 'list-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'call_c1', name: 'TaskCreate', input: { subject: 'Old task' } }],
        },
      }),
      JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'call_c1', content: 'Task #old created' }],
        },
        toolUseResult: { task: { id: 'old', subject: 'Old task' } },
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'call_list', name: 'TaskList', input: {} }],
        },
      }),
      JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'call_list', content: 'ok' }],
        },
        toolUseResult: {
          listId: 'my-list',
          tasks: [
            { id: 'a', subject: 'Alpha', status: 'completed' },
            { id: 'b', subject: 'Beta', status: 'in_progress', activeForm: 'Working Beta', blockedBy: ['a'] },
          ],
        },
      }),
    ];
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);
    assert.strictEqual(parsed.taskSource, 'tasks');
    assert.strictEqual(parsed.todos.length, 2);
    assert.ok(!parsed.todos.some(t => t.id === 'old'));
    assert.strictEqual(parsed.todos[0].id, 'a');
    assert.strictEqual(parsed.todos[1].activeForm, 'Working Beta');
    assert.deepStrictEqual(parsed.todos[1].blockedBy, ['a']);
    assert.strictEqual(parsed.observedTaskListId, 'my-list');
    assert.ok(parsed.taskToolsObserved);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parseTranscriptFile TaskGet reconciles one item', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-taskget-'));
  const filePath = path.join(tempDir, 'get.jsonl');
  try {
    const lines = [
      JSON.stringify({
        sessionId: 'get-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'call_c', name: 'TaskCreate', input: { subject: 'Topic' } }],
        },
      }),
      JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'call_c', content: 'Task #42 created' }],
        },
        toolUseResult: { task: { id: '42', subject: 'Topic' } },
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'call_g', name: 'TaskGet', input: { taskId: '42' } }],
        },
      }),
      JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'call_g', content: 'ok' }],
        },
        toolUseResult: {
          task: {
            id: '42',
            subject: 'Topic expanded',
            status: 'in_progress',
            activeForm: 'Editing Topic',
            blocks: ['99'],
          },
        },
      }),
    ];
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);
    assert.strictEqual(parsed.todos.length, 1);
    assert.strictEqual(parsed.todos[0].content, 'Topic expanded');
    assert.strictEqual(parsed.todos[0].status, 'in_progress');
    assert.strictEqual(parsed.todos[0].activeForm, 'Editing Topic');
    assert.deepStrictEqual(parsed.todos[0].blocks, ['99']);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parseTranscriptFile pendingCreates is transient and never uses tool_use id as todo id', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-pending-'));
  const filePath = path.join(tempDir, 'pending.jsonl');
  try {
    const lines = [
      JSON.stringify({
        sessionId: 'pending-session',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{
            type: 'tool_use',
            id: 'call_pending_xyz',
            name: 'TaskCreate',
            input: { subject: 'In flight', description: 'desc' },
          }],
        },
      }),
    ];
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    const parsed = await parseTranscriptFile(filePath);
    assert.ok(parsed.pendingTaskCreates && parsed.pendingTaskCreates.length === 1);
    assert.strictEqual(parsed.pendingTaskCreates![0].toolUseId, 'call_pending_xyz');
    assert.strictEqual(parsed.pendingTaskCreates![0].subject, 'In flight');
    assert.ok(!(parsed.todos || []).some(t => t.id === 'call_pending_xyz'));

    const lines2 = [
      lines[0],
      JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'call_pending_xyz', is_error: true, content: 'fail' }],
        },
      }),
    ];
    fs.writeFileSync(filePath, lines2.join('\n'), 'utf8');
    const parsed2 = await parseTranscriptFile(filePath);
    assert.deepStrictEqual(parsed2.pendingTaskCreates || [], []);
    assert.ok(!(parsed2.todos || []).some(t => t.id === 'call_pending_xyz'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('resolveNativeListCandidate does not silent-bind missing sessionId list', () => {
  const exists = new Set<string>(['real-list']);
  const listExists = (id: string) => exists.has(id);
  assert.deepStrictEqual(
    resolveNativeListCandidate({ sessionId: 'sess1', listExists }),
    { listId: undefined, usedFallbackSessionId: false },
  );
  exists.add('sess1');
  assert.deepStrictEqual(
    resolveNativeListCandidate({ sessionId: 'sess1', listExists }),
    { listId: 'sess1', usedFallbackSessionId: true },
  );
  assert.deepStrictEqual(
    resolveNativeListCandidate({
      selectedList: 'missing',
      associationListId: 'real-list',
      sessionId: 'sess1',
      listExists,
    }),
    { listId: undefined, usedFallbackSessionId: false },
  );
  assert.deepStrictEqual(
    resolveNativeListCandidate({ selectedList: 'real-list', sessionId: 'sess1', listExists }),
    { listId: 'real-list', usedFallbackSessionId: false },
  );
});

test('NativeTaskReader maps activeForm from disk JSON', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-native-af-'));
  const listId = 'listaf1';
  const dir = path.join(tempDir, 'tasks', listId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, '1.json'),
    JSON.stringify({ id: '1', subject: 'Disk task', status: 'in_progress', activeForm: 'Reading disk' }),
    'utf8',
  );
  try {
    const reader = new NativeTaskReader();
    const snap = reader.read(tempDir, listId);
    assert.ok(snap.exists && snap.valid);
    assert.strictEqual(snap.items[0].activeForm, 'Reading disk');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('writeTaskAssociation round-trips', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-assoc-'));
  try {
    assert.ok(writeTaskAssociation(tempDir, {
      sessionId: 'abc12345',
      projectPath: 'E:\\proj',
      taskListId: 'list1',
    }));
    const read = readTaskAssociation(tempDir, 'abc12345', 'E:\\proj');
    assert.ok(read);
    assert.strictEqual(read!.taskListId, 'list1');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('webview includes official-task polish markers', () => {
  const html = getWebviewContent();
  for (const token of [
    'todos-meta',
    'todo-deps',
    'pending-create',
    'pendingTaskCreates',
    'selectTaskList',
    'activeForm',
    'slash /tasks',
    'CLAUDE_CODE_ENABLE_TODO_TOOLS',
    'todos-mode-chip',
    'todos-checklist-chip',
  ]) {
    assert.ok(html.includes(token), 'missing ' + token);
  }
});
