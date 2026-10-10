import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { compareForkSessions, formatForkCompareMarkdown } from '../src/forkCompare.js';
import { SessionInfo } from '../src/types.js';

function sess(id: string, file: string, tokens = 1000): SessionInfo {
  return {
    sessionId: id,
    sessionFile: file,
    projectName: 'p',
    projectPath: '/p',
    sessionTitle: id,
    model: 'claude-sonnet-5',
    contextLimit: 200000,
    tokenUsage: {
      inputTokens: tokens,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: tokens,
      percentage: 1,
    },
    tools: [],
    activeTools: [],
    agents: [],
    todos: [],
    skills: [],
    mcpServers: [],
    lastUpdated: new Date(),
    isIdle: true,
    isCurrentWorkspace: true,
    wasCleared: false,
  } as SessionInfo;
}

test('compareForkSessions counts shared prefix after id normalize', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-fork-'));
  const parentId = '11111111-1111-1111-1111-111111111111';
  const childId = '22222222-2222-2222-2222-222222222222';
  const shared = JSON.stringify({ type: 'user', message: { content: 'hello' }, sessionId: parentId });
  const parentFile = path.join(dir, 'p.jsonl');
  const childFile = path.join(dir, 'c.jsonl');
  fs.writeFileSync(parentFile, shared + '\n' + JSON.stringify({ type: 'assistant', message: { content: 'a' }, sessionId: parentId }) + '\n');
  fs.writeFileSync(
    childFile,
    JSON.stringify({ type: 'user', message: { content: 'hello' }, sessionId: childId }) +
      '\n' +
      JSON.stringify({ type: 'assistant', message: { content: 'a' }, sessionId: childId }) +
      '\n' +
      JSON.stringify({ type: 'user', message: { content: 'extra' }, sessionId: childId }) +
      '\n',
  );
  const summary = compareForkSessions(sess(parentId, parentFile), sess(childId, childFile));
  assert.equal(summary.sharedPrefixLines, 2);
  assert.equal(summary.childOnlyLines, 1);
  assert.ok(formatForkCompareMarkdown(summary).includes('Fork compare'));
});
