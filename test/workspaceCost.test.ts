import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkspaceCostReport, formatWorkspaceCostMarkdown } from '../src/workspaceCost.js';
import { SessionInfo } from '../src/types.js';

function fakeSession(partial: Partial<SessionInfo> & { sessionId: string }): SessionInfo {
  return {
    sessionFile: '',
    projectName: 'proj',
    projectPath: '/p',
    sessionTitle: 't',
    model: 'claude-sonnet-5',
    contextLimit: 200000,
    tokenUsage: {
      inputTokens: 1000000,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 1000000,
      percentage: 10,
    },
    tools: [],
    activeTools: [],
    agents: [],
    todos: [],
    skills: [],
    mcpServers: [],
    lastUpdated: new Date('2026-10-10T00:00:00Z'),
    isIdle: true,
    isCurrentWorkspace: true,
    wasCleared: false,
    ...partial,
  } as SessionInfo;
}

test('buildWorkspaceCostReport sums priced sessions', () => {
  const report = buildWorkspaceCostReport(
    [
      fakeSession({ sessionId: 'a', model: 'claude-sonnet-5' }),
      fakeSession({ sessionId: 'b', model: 'claude.sub2api.gpt-5', projectName: 'other' }),
    ],
    'all',
  );
  assert.equal(report.totals.sessions, 2);
  assert.ok(report.totals.usd !== null && report.totals.usd >= 2);
  assert.equal(report.totals.unpricedSessions, 1);
  const md = formatWorkspaceCostMarkdown(report);
  assert.ok(md.includes('Workspace Cost Report'));
  assert.ok(md.includes(report.pricingVersion));
});
