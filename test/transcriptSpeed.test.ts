import assert from 'node:assert/strict';
import test from 'node:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { TranscriptSpeedCollector, selectOutputSpeed } from '../src/transcriptSpeed.js';
import { parseTranscriptFile } from '../src/transcriptParser.js';

const stamp = (ms: number) => new Date(1700000000000 + ms).toISOString();
const request = (id = 'r', ms = 0) => ({ type: 'api-request', sessionId: 's', id, timestamp: stamp(ms) });
const assistant = (options: { request?: string; message?: string; ms?: number; tokens?: number; model?: string; tools?: string[]; stop?: string } = {}) => ({
  type: 'assistant', sessionId: 's', requestRef: options.request || 'r', uuid: 'a' + (options.ms ?? 2000), timestamp: stamp(options.ms ?? 2000),
  message: { id: options.message || 'm', model: options.model || 'relay-model', usage: { output_tokens: options.tokens ?? 100 },
    stop_reason: options.stop || (options.tools ? 'tool_use' : 'end_turn'),
    content: options.tools ? options.tools.map(id => ({ type: 'tool_use', id })) : [{ type: 'text', text: 'not retained' }] },
});
const result = (id = 'tool', ms = 3000) => ({ type: 'user', sessionId: 's', timestamp: stamp(ms), message: { content: [{ type: 'tool_result', tool_use_id: id }] } });
const cost = { type: 'cost-state', sessionId: 's' };
function collect(rows: any[]) {
  const reader = new TranscriptSpeedCollector();
  for (const row of rows) reader.consume(row);
  return reader.finish();
}

test('transcript speed: final response requires a boundary, last-prompt is not one', () => {
  const rows = [request(), assistant()];
  assert.equal(collect(rows).state, 'sampling');
  assert.equal(collect([...rows, { type: 'last-prompt', leafUuid: 'a2000' }]).sample, undefined);
  const value = collect([...rows, cost]);
  assert.equal(value.sample?.tokensPerSecond, 50);
  assert.equal(value.sample?.source, 'transcript');
  assert.equal(value.state, 'available');
});

test('transcript speed: duplicate blocks and usage are counted once, out-of-order input works', () => {
  const reading = collect([assistant({ ms: 2000, tokens: 100 }), assistant({ ms: 1500, tokens: 100 }), request(), cost]);
  assert.equal(reading.sample?.outputTokens, 100);
  assert.equal(reading.sample?.durationMs, 2000);
});

test('transcript speed: all tools must finish and execution time is excluded', () => {
  const rows = [request(), assistant({ tools: ['one'], ms: 1900 }), result('one', 1950), assistant({ tools: ['two'], ms: 2000 })];
  assert.equal(collect(rows).sample, undefined);
  const sample = collect([...rows, result('two', 30000)]).sample;
  assert.equal(sample?.durationMs, 2000);
  assert.equal(sample?.tokensPerSecond, 50);
});

test('transcript speed: user prompt parent confirms a final response, not an unrelated request', () => {
  const rows = [request(), assistant()];
  assert.equal(collect([...rows, request('parallel', 3000)]).sample, undefined);
  assert.equal(collect([...rows, { type: 'user', sessionId: 's', parentUuid: 'a2000', message: { content: 'next' } }]).sample?.tokensPerSecond, 50);
});

test('transcript speed: reject invalid counters, timestamps, short durations and mixed models', () => {
  for (const rows of [
    [request(), assistant({ tokens: -1 }), cost],
    [request(), assistant({ ms: 499 }), cost],
    [{ ...request(), timestamp: undefined }, assistant(), cost],
    [request(), { ...assistant(), timestamp: 'invalid' }, cost],
    [request(), assistant({ ms: 1000, tokens: 100 }), assistant({ ms: 2000, tokens: 90 }), cost],
    [request(), assistant({ tokens: 90 }), assistant({ tokens: 100 }), cost],
    [request(), assistant({ message: 'one', model: 'a' }), assistant({ message: 'two', model: 'b' }), cost],
    [request(), assistant({ stop: 'refusal' }), cost],
  ]) assert.equal(collect(rows).sample, undefined);
});

test('transcript speed: isolate sessions and sidechains, preserve last sample during next request', () => {
  const rows = [request(), assistant(), cost, request('next', 3000),
    { ...assistant({ request: 'next', ms: 4000 }), sessionId: 'other' },
    { ...assistant({ request: 'next', ms: 4000 }), isSidechain: true }];
  const reading = collect(rows);
  assert.equal(reading.sample?.tokensPerSecond, 50);
  assert.equal(reading.state, 'sampling');
});

test('transcript speed: model reset prevents old sample resurrection', () => {
  const reading = collect([request(), assistant(), cost,
    { type: 'attachment', sessionId: 's', timestamp: stamp(3000), attachment: { type: 'model' } }]);
  assert.equal(reading.sample, undefined);
  assert.equal(reading.resetAt, Date.parse(stamp(3000)));
});

test('transcript speed: a response appended after its old completion boundary is not final', () => {
  const reading = collect([request(), assistant({ ms: 1500 }), cost, assistant({ ms: 2000 })]);
  assert.equal(reading.sample, undefined);
  assert.equal(reading.state, 'sampling');
});

test('transcript speed: multiple unique messages sum once and pending concurrency is not finalized by cost', () => {
  const reading = collect([request(), assistant({ message: 'one', ms: 1500, tokens: 50 }), assistant({ message: 'two', tokens: 100 }), cost]);
  assert.equal(reading.sample?.outputTokens, 150);
  assert.equal(reading.sample?.tokensPerSecond, 75);
  assert.equal(collect([request(), request('parallel', 1000), assistant(), cost]).sample, undefined);
});

test('speed selector keeps transcript on absent bridge sample and chooses newest matching source', () => {
  const sample = collect([request(), assistant(), cost]).sample!;
  assert.equal(selectOutputSpeed(sample, undefined, 'relay-model'), sample);
  assert.equal(selectOutputSpeed(sample, sample, 'relay-model')?.source, 'transcript');
  assert.equal(selectOutputSpeed(sample, { ...sample, measuredAt: sample.measuredAt + 1 }, 'relay-model')?.source, 'statusLine');
  assert.equal(selectOutputSpeed(sample, sample, 'different'), undefined);
  assert.equal(selectOutputSpeed(sample, sample, 'relay-model', sample.measuredAt), undefined);
});

test('parser automatically derives IDE speed without installed statusLine and tolerates partial lines', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-ide-speed-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 's.jsonl');
  fs.writeFileSync(file, [request(), assistant(), cost].map(r => JSON.stringify(r)).join('\n') + '\n{"type":');
  const parsed = await parseTranscriptFile(file);
  assert.equal(parsed.outputSpeed?.tokensPerSecond, 50);
  assert.equal(parsed.outputSpeedState, 'available');
});

test('parser clears speed on /clear and missing request fields report unsupported', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-ide-speed-clear-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 's.jsonl');
  fs.writeFileSync(file, [request(), assistant(), cost, { type: 'user', timestamp: stamp(3000), message: { content: '/clear' } }].map(r => JSON.stringify(r)).join('\n'));
  assert.equal((await parseTranscriptFile(file)).outputSpeed, undefined);
  assert.equal(collect([{ ...assistant(), requestRef: undefined }]).state, 'unsupported');
});
