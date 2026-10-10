import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { extractTimelineEvents } from '../src/timelineEvents.js';
import { SessionInfo } from '../src/types.js';

test('extractTimelineEvents finds permission and hook lines', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-tl-'));
  const file = path.join(dir, 's.jsonl');
  fs.writeFileSync(
    file,
    [
      JSON.stringify({ type: 'user', message: { content: 'hi' } }),
      JSON.stringify({ type: 'hook', hookName: 'PreToolUse', status: 'ok' }),
      JSON.stringify({ type: 'system', content: 'permission denied for Bash' }),
    ].join('\n') + '\n',
    'utf8',
  );
  const session = { sessionId: 's', sessionFile: file, sessionTitle: 't', projectName: 'p' } as SessionInfo;
  const events = extractTimelineEvents(session);
  assert.ok(events.some((e) => e.kind === 'hook'));
  assert.ok(events.some((e) => e.kind === 'permission' || e.kind === 'system'));
});
