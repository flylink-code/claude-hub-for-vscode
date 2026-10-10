import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { searchTranscriptFile } from '../src/transcriptSearch.js';
import { SessionInfo } from '../src/types.js';

test('searchTranscriptFile finds message text', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-search-'));
  const file = path.join(dir, 's.jsonl');
  fs.writeFileSync(
    file,
    [
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'please refactor auth module' } }),
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Sure' }] } }),
    ].join('\n') + '\n',
    'utf8',
  );
  const session = {
    sessionId: 's',
    sessionFile: file,
    projectName: 'p',
    sessionTitle: 't',
  } as SessionInfo;
  const hits = searchTranscriptFile(session, 'auth module');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 1);
});
