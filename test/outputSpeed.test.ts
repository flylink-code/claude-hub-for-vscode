import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  SpeedIntegrationManager,
  buildWrapperCommand,
  canonicalTranscriptPath,
  findWindowsGitBash,
  isSpeedIntegrationInstalled,
  outputSpeedSampleFile,
  readOutputSpeed,
} from '../src/outputSpeed.js';
import type { OutputSpeedSample } from '../src/types.js';

interface CurrentSpeedInput {
  sessionId: string;
  transcriptPath: string;
  model: string;
  apiDurationMs?: number;
  usage?: Record<string, number> | null;
}

interface ComputeResult {
  state: Record<string, any>;
  sample: OutputSpeedSample | undefined;
}

interface BridgeModule {
  MIN_DURATION_MS: number;
  canonicalTranscriptPath(value: unknown): string;
  outputSpeedSampleKey(sessionId: string, canonicalPath: string): string;
  sampleFile(configDir: string, sessionId: string, canonicalPath: string): string;
  sanitizeUsage(value: unknown): Record<string, number> | undefined;
  computeSpeed(
    previous: Record<string, any> | undefined,
    current: CurrentSpeedInput,
    now?: number,
  ): ComputeResult;
  collect(
    event: unknown,
    options: { configDir: string; now?: number },
  ): OutputSpeedSample | undefined;
  formatStatus(sample: OutputSpeedSample | undefined): string;
  extractCurrent(event: unknown): any;
  runOriginalCommand(
    command: string,
    input: string,
    options?: Record<string, unknown>,
  ): Promise<{ stdout: string; code: number | null; signal: string | null; failed: boolean } | undefined>;
}

function resourcePath(name: string): string {
  const candidates = [
    path.resolve(__dirname, '../../resources', name),
    path.resolve(__dirname, '../resources', name),
    path.resolve(process.cwd(), 'resources', name),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Resource not found: ${name}`);
}

const requireFromTest = createRequire(__filename);
const bridge = requireFromTest(resourcePath('speed-bridge.cjs')) as BridgeModule;

function tempDir(t: TestContext, prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function usage(outputTokens: number): Record<string, number> {
  return {
    input_tokens: 11,
    output_tokens: outputTokens,
    cache_creation_input_tokens: 2,
    cache_read_input_tokens: 3,
  };
}

function canonical(pathValue: string): string {
  return bridge.canonicalTranscriptPath(pathValue);
}

function speedInput(
  transcriptPath: string,
  outputTokens: number,
  apiDurationMs: number,
  model = 'model-1',
  sessionId = 'session-1',
): CurrentSpeedInput {
  return {
    sessionId,
    transcriptPath,
    model,
    apiDurationMs,
    usage: usage(outputTokens),
  };
}

function statusEvent(options: {
  sessionId?: string;
  transcriptPath?: string;
  model?: string;
  outputTokens?: number;
  apiDurationMs?: number;
  usageValue?: Record<string, number> | null;
} = {}): Record<string, any> {
  return {
    session_id: options.sessionId ?? 'session-1',
    transcript_path:
      options.transcriptPath ?? path.join(os.tmpdir(), 'hub-projects', 'project', 'transcript.jsonl'),
    model: { id: options.model ?? 'model-1', display_name: 'Model One' },
    cost: { total_api_duration_ms: options.apiDurationMs ?? 1000, total_cost_usd: 0 },
    context_window: {
      current_usage:
        options.usageValue === undefined ? usage(options.outputTokens ?? 10) : options.usageValue,
    },
    // Noise that must never be persisted by the bridge.
    prompt: 'SECRET PROMPT TEXT',
    credentials: { token: 'SECRET-TOKEN' },
    transcript_body: 'SECRET BODY',
  };
}

function writeSettings(configDir: string, value: unknown): void {
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'settings.json'),
    JSON.stringify(value, null, 2) + '\n',
    'utf8',
  );
}

function readSettings(configDir: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(path.join(configDir, 'settings.json'), 'utf8'));
}

function managerFor(configDir: string): SpeedIntegrationManager {
  return new SpeedIntegrationManager(configDir, resourcePath('speed-bridge.cjs'));
}

function posixQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function powershellQuote(value: string): string {
  assert.ok(!/[\u0000-\u001f]/.test(value));
  return `'${value.replace(/'/g, "''")}'`;
}

function powershellExecutable(): string {
  const systemRoot = process.env.SystemRoot || 'C:\\Windows';
  const candidate = path.join(
    systemRoot,
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe',
  );
  return fs.existsSync(candidate) ? candidate : 'powershell.exe';
}

/**
 * Mirror install-time shell quoting so fixtures run under the same shell the
 * bridge uses for the user's original statusLine command.
 */
function buildNodeScriptCommand(scriptPath: string): string {
  if (process.platform !== 'win32' || findWindowsGitBash()) {
    return `${posixQuote(process.execPath)} ${posixQuote(scriptPath)}`;
  }
  return `& ${powershellQuote(process.execPath)} ${powershellQuote(scriptPath)}`;
}

function runThroughStatusLineShell(command: string, input: string) {
  const options = { input, encoding: 'utf8' as const, timeout: 30000, windowsHide: true };
  if (process.platform === 'win32') {
    const bash = findWindowsGitBash();
    if (bash) return spawnSync(bash, ['-c', command], options);
    return spawnSync(
      powershellExecutable(),
      ['-NoProfile', '-NonInteractive', '-Command', command],
      options,
    );
  }
  return spawnSync('/bin/sh', ['-c', command], options);
}

function runStableBridge(configDir: string, event: unknown) {
  const bridgeFile = path.join(configDir, 'hub-speed', 'speed-bridge.cjs');
  const result = spawnSync(
    process.execPath,
    [bridgeFile, '--config-dir', configDir],
    {
      input: JSON.stringify(event),
      encoding: 'utf8',
      timeout: 30000,
      windowsHide: true,
    },
  );
  assert.equal(result.status, 0, result.stderr || 'bridge exited unexpectedly');
  return result;
}

/** Write stdin in two chunks, splitting the first UTF-8 character's bytes. */
function runStableBridgeSplitStdin(
  configDir: string,
  event: unknown,
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  const text = JSON.stringify(event);
  const nonAscii = text.search(/[^\x00-\x7f]/);
  assert.ok(nonAscii > 0, 'fixture must contain a non-ASCII character to split');
  const input = Buffer.from(text, 'utf8');
  const splitAt = Buffer.byteLength(text.slice(0, nonAscii), 'utf8') + 1;
  const bridgeFile = path.join(configDir, 'hub-speed', 'speed-bridge.cjs');

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [bridgeFile, '--config-dir', configDir], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (status: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ status, stdout, stderr });
    };
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      finish(null);
    }, 30000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', () => finish(null));
    child.on('close', (code) => finish(code));
    child.stdin.write(input.subarray(0, splitAt));
    setTimeout(() => {
      try {
        child.stdin.end(input.subarray(splitAt));
      } catch {
        /* the close handler still settles */
      }
    }, 25);
  });
}

test('tsconfig.test includes src and test sources', () => {
  const config = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../tsconfig.test.json'), 'utf8'),
  );
  assert.ok(config.include.includes('src/**/*'));
  assert.ok(config.include.includes('test/**/*'));
});

test('canonicalTranscriptPath matches the bridge and normalises Windows casing', () => {
  const input = path.join(os.tmpdir(), 'hub-projects', 'Case', 'transcript.jsonl');
  assert.equal(canonicalTranscriptPath(input), bridge.canonicalTranscriptPath(input));
  if (process.platform === 'win32') {
    assert.equal(
      canonicalTranscriptPath(input.toUpperCase()),
      canonicalTranscriptPath(input.toLowerCase()),
    );
  }
});

test('computeSpeed: first event is a baseline, not a reading', () => {
  const transcript = canonical(path.join(os.tmpdir(), 'hub-projects', 'p', 't.jsonl'));
  const result = bridge.computeSpeed(undefined, speedInput(transcript, 10, 1000), 1000);
  assert.equal(result.sample, undefined);
  assert.equal(result.state.apiDurationMs, 1000);
  assert.equal(result.state.usage.output_tokens, 10);
});

test('computeSpeed: measures output_tokens over the API-duration delta', () => {
  const transcript = canonical(path.join(os.tmpdir(), 'hub-projects', 'p', 't.jsonl'));
  const base = bridge.computeSpeed(undefined, speedInput(transcript, 10, 1000), 1000).state;
  const result = bridge.computeSpeed(base, speedInput(transcript, 100, 3000), 2000);
  assert.ok(result.sample);
  assert.equal(result.sample.outputTokens, 100);
  assert.equal(result.sample.durationMs, 2000);
  assert.equal(result.sample.tokensPerSecond, 50);
  assert.equal(result.sample.model, 'model-1');
  assert.equal(result.sample.measuredAt, 2000);
});

test('computeSpeed: same usage keeps the reading and absorbs API-duration growth', () => {
  const transcript = canonical(path.join(os.tmpdir(), 'hub-projects', 'p', 't.jsonl'));
  const baseline = bridge.computeSpeed(undefined, speedInput(transcript, 10, 1000), 1000).state;
  const measured = bridge.computeSpeed(baseline, speedInput(transcript, 100, 3000), 2000);
  const repeated = bridge.computeSpeed(measured.state, speedInput(transcript, 100, 4500), 3000);
  assert.deepEqual(repeated.sample, measured.sample);
  assert.equal(repeated.state.apiDurationMs, 4500);
  // The absorbed baseline means the next response measures from 4500 ms.
  const next = bridge.computeSpeed(repeated.state, speedInput(transcript, 200, 5000), 4000);
  assert.equal(next.sample?.durationMs, 500);
  assert.equal(next.sample?.tokensPerSecond, 400);
});

test('computeSpeed: durations under 500 ms are absorbed without a new reading', () => {
  const transcript = canonical(path.join(os.tmpdir(), 'hub-projects', 'p', 't.jsonl'));
  const baseline = bridge.computeSpeed(undefined, speedInput(transcript, 10, 1000), 1000).state;
  const fast = bridge.computeSpeed(baseline, speedInput(transcript, 100, 1400), 2000);
  assert.equal(fast.sample, undefined);
  assert.equal(fast.state.apiDurationMs, 1400);
  const next = bridge.computeSpeed(fast.state, speedInput(transcript, 200, 2000), 3000);
  assert.equal(next.sample?.durationMs, 600);
  assert.ok(Math.abs((next.sample?.tokensPerSecond ?? 0) - 200 / 0.6) < 1e-9);
});

test('computeSpeed: counter reset, model change, output 0 and missing usage clear the reading', () => {
  const transcript = canonical(path.join(os.tmpdir(), 'hub-projects', 'p', 't.jsonl'));
  const baseline = bridge.computeSpeed(undefined, speedInput(transcript, 10, 1000), 1000).state;
  const measured = bridge.computeSpeed(baseline, speedInput(transcript, 100, 3000), 2000);
  assert.ok(measured.sample);

  const reset = bridge.computeSpeed(measured.state, speedInput(transcript, 120, 500), 3000);
  assert.equal(reset.sample, undefined);

  const modelChange = bridge.computeSpeed(
    measured.state,
    speedInput(transcript, 120, 4000, 'model-2'),
    3000,
  );
  assert.equal(modelChange.sample, undefined);
  assert.equal(modelChange.state.model, 'model-2');

  const zeroOutput = bridge.computeSpeed(
    measured.state,
    { ...speedInput(transcript, 0, 4000), usage: usage(0) },
    3000,
  );
  assert.equal(zeroOutput.sample, undefined);

  const missingUsage = bridge.computeSpeed(
    measured.state,
    { ...speedInput(transcript, 120, 4000), usage: undefined },
    3000,
  );
  assert.equal(missingUsage.sample, undefined);
});

test('collect stores only allow-listed fields (no prompt, body, or credentials)', (t) => {
  const root = tempDir(t, 'hub-speed-allowlist-');
  const configDir = path.join(root, 'claude');
  writeSettings(configDir, {});
  managerFor(configDir).enable(process.execPath);

  const transcript = path.join(root, 'projects', 'p', 'transcript.jsonl');
  bridge.collect(statusEvent({ transcriptPath: transcript, outputTokens: 10, apiDurationMs: 1000 }), {
    configDir,
    now: 1000,
  });
  bridge.collect(statusEvent({ transcriptPath: transcript, outputTokens: 100, apiDurationMs: 3000 }), {
    configDir,
    now: 2000,
  });

  const file = outputSpeedSampleFile(configDir, 'session-1', transcript);
  assert.ok(file && fs.existsSync(file));
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(file!).mode & 0o777, 0o600);
  }
  const raw = fs.readFileSync(file!, 'utf8');
  assert.ok(!raw.includes('SECRET'), 'sample must not contain prompt/body/credential data');
  const stored = JSON.parse(raw);
  const allowed = new Set([
    'session_id',
    'transcript_path',
    'model',
    'apiDurationMs',
    'usage',
    'updatedAt',
    'measuredAt',
    'outputTokens',
    'durationMs',
    'tokensPerSecond',
  ]);
  for (const key of Object.keys(stored)) assert.ok(allowed.has(key), `unexpected stored key: ${key}`);
  assert.deepEqual(Object.keys(stored.usage).sort(), [
    'cache_creation_input_tokens',
    'cache_read_input_tokens',
    'input_tokens',
    'output_tokens',
  ]);
});

test('collect keeps sessions isolated and readOutputSpeed enforces path/model binding', (t) => {
  const root = tempDir(t, 'hub-speed-isolation-');
  const configDir = path.join(root, 'claude');
  writeSettings(configDir, {});
  managerFor(configDir).enable(process.execPath);

  const pathA = path.join(root, 'projects', 'a', 'transcript.jsonl');
  const pathB = path.join(root, 'projects', 'b', 'transcript.jsonl');
  const pathAOther = path.join(root, 'projects', 'a', 'other.jsonl');

  bridge.collect(statusEvent({ sessionId: 'a', transcriptPath: pathA, apiDurationMs: 1000 }), {
    configDir,
    now: 1000,
  });
  const sampleA = bridge.collect(
    statusEvent({ sessionId: 'a', transcriptPath: pathA, outputTokens: 100, apiDurationMs: 3000 }),
    { configDir, now: 2000 },
  );
  bridge.collect(statusEvent({ sessionId: 'b', transcriptPath: pathB, apiDurationMs: 1000 }), {
    configDir,
    now: 1000,
  });
  const sampleB = bridge.collect(
    statusEvent({ sessionId: 'b', transcriptPath: pathB, outputTokens: 60, apiDurationMs: 3000 }),
    { configDir, now: 2000 },
  );

  assert.deepEqual(
    readOutputSpeed(configDir, 'a', pathA, 'model-1'),
    sampleA,
  );
  assert.deepEqual(
    readOutputSpeed(configDir, 'b', pathB, 'model-1'),
    sampleB,
  );
  assert.equal(readOutputSpeed(configDir, 'a', pathAOther, 'model-1'), undefined);
  assert.equal(readOutputSpeed(configDir, 'a', pathA, 'model-2'), undefined);
  assert.notDeepEqual(sampleA, sampleB);

  if (process.platform === 'win32') {
    assert.deepEqual(readOutputSpeed(configDir, 'a', pathA.toUpperCase(), 'model-1'), sampleA);
  }
});

test('readOutputSpeed validates structure, finite positives and installed integration', (t) => {
  const root = tempDir(t, 'hub-speed-read-');
  const configDir = path.join(root, 'claude');
  const transcript = path.join(root, 'projects', 'p', 'transcript.jsonl');

  // Not installed yet: even a valid sample file must not be exposed.
  writeSettings(configDir, {});
  bridge.collect(statusEvent({ transcriptPath: transcript, apiDurationMs: 1000 }), {
    configDir,
    now: 1000,
  });
  const sample = bridge.collect(
    statusEvent({ transcriptPath: transcript, outputTokens: 100, apiDurationMs: 3000 }),
    { configDir, now: 2000 },
  );
  assert.ok(sample);
  const file = outputSpeedSampleFile(configDir, 'session-1', transcript);
  assert.ok(file && fs.existsSync(file));
  assert.equal(readOutputSpeed(configDir, 'session-1', transcript, 'model-1'), undefined);
  assert.equal(isSpeedIntegrationInstalled(configDir), false);

  managerFor(configDir).enable(process.execPath);
  assert.equal(isSpeedIntegrationInstalled(configDir), true);
  assert.deepEqual(readOutputSpeed(configDir, 'session-1', transcript, 'model-1'), sample);

  const original = JSON.parse(fs.readFileSync(file!, 'utf8'));
  for (const bad of [
    { ...original, session_id: 'other-session' },
    { ...original, transcript_path: path.join(root, 'other.jsonl') },
    { ...original, measuredAt: Number.NaN },
    { ...original, measuredAt: Date.now() + 60_000 },
    { ...original, outputTokens: -1 },
    { ...original, durationMs: 0 },
    { ...original, durationMs: 499 },
    { ...original, tokensPerSecond: Number.POSITIVE_INFINITY },
    { ...original, tokensPerSecond: original.tokensPerSecond + 10 },
  ]) {
    fs.writeFileSync(file!, JSON.stringify(bad), 'utf8');
    assert.equal(readOutputSpeed(configDir, 'session-1', transcript, 'model-1'), undefined);
  }
  fs.writeFileSync(file!, '{not json', 'utf8');
  assert.equal(readOutputSpeed(configDir, 'session-1', transcript, 'model-1'), undefined);
});

test('external statusLine changes stop readers and disable refuses to overwrite', (t) => {
  const root = tempDir(t, 'hub-speed-external-');
  const configDir = path.join(root, 'claude');
  const transcript = path.join(root, 'projects', 'p', 'transcript.jsonl');
  writeSettings(configDir, { model: 'keep-me' });
  const manager = managerFor(configDir);
  manager.enable(process.execPath);

  bridge.collect(statusEvent({ transcriptPath: transcript, apiDurationMs: 1000 }), {
    configDir,
    now: 1000,
  });
  bridge.collect(statusEvent({ transcriptPath: transcript, outputTokens: 100, apiDurationMs: 3000 }), {
    configDir,
    now: 2000,
  });
  assert.ok(readOutputSpeed(configDir, 'session-1', transcript, 'model-1'));

  const settings = readSettings(configDir);
  settings.statusLine.command = 'external-tool --status';
  writeSettings(configDir, settings);

  assert.equal(isSpeedIntegrationInstalled(configDir), false);
  assert.equal(readOutputSpeed(configDir, 'session-1', transcript, 'model-1'), undefined);
  assert.throws(() => manager.disable(), /changed outside Claude Hub/i);
  assert.equal(readSettings(configDir).statusLine.command, 'external-tool --status');
});

test('enable preserves unrelated settings and the original statusLine, disable restores it', (t) => {
  const root = tempDir(t, 'hub-speed-manager-');
  const configDir = path.join(root, 'claude');
  const originalStatusLine = {
    type: 'command',
    command: 'my-status --compact',
    padding: 2,
    refreshInterval: 5,
  };
  const originalSettings = {
    model: 'keep-me',
    env: { KEEP: '1' },
    statusLine: originalStatusLine,
    permissions: { allow: ['Read'] },
  };
  writeSettings(configDir, originalSettings);
  const originalText = fs.readFileSync(path.join(configDir, 'settings.json'), 'utf8');
  const manager = managerFor(configDir);

  assert.equal(manager.isEnabled(), false);
  const first = manager.enable(process.execPath);
  assert.equal(first.changed, true);
  const installedSettings = readSettings(configDir);
  assert.equal(installedSettings.model, 'keep-me');
  assert.deepEqual(installedSettings.env, { KEEP: '1' });
  assert.deepEqual(installedSettings.permissions, { allow: ['Read'] });
  assert.equal(installedSettings.statusLine.type, 'command');
  assert.equal(installedSettings.statusLine.padding, 2);
  assert.equal(installedSettings.statusLine.refreshInterval, 5);
  assert.equal(installedSettings.statusLine.command, first.installedCommand);
  assert.notEqual(installedSettings.statusLine.command, originalStatusLine.command);
  assert.equal(manager.isEnabled(), true);
  // Created eagerly so SessionManager's samples watcher is not delayed.
  assert.ok(fs.statSync(path.join(configDir, 'hub-speed', 'samples')).isDirectory());
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(path.join(configDir, 'hub-speed')).mode & 0o777, 0o700);
  }

  const manifest = JSON.parse(
    fs.readFileSync(path.join(configDir, 'hub-speed', 'manifest.json'), 'utf8'),
  );
  assert.deepEqual(manifest.previous, originalStatusLine);
  assert.deepEqual(manifest.installed, installedSettings.statusLine);

  const backups = fs.readdirSync(path.join(configDir, 'hub-speed', 'backups'));
  assert.equal(backups.length, 1);
  assert.equal(
    fs.readFileSync(path.join(configDir, 'hub-speed', 'backups', backups[0]), 'utf8'),
    originalText,
  );
  if (process.platform !== 'win32') {
    assert.equal(
      fs.statSync(path.join(configDir, 'hub-speed', 'backups', backups[0])).mode & 0o777,
      0o600,
    );
  }

  // Idempotent: no nested wrapper and no settings rewrite.
  const beforeSecond = fs.readFileSync(path.join(configDir, 'settings.json'), 'utf8');
  const second = manager.enable(process.execPath);
  assert.equal(second.changed, false);
  assert.equal(second.installedCommand, first.installedCommand);
  assert.equal(fs.readFileSync(path.join(configDir, 'settings.json'), 'utf8'), beforeSecond);
  assert.match(installedSettings.statusLine.command, /speed-bridge\.cjs/);
  assert.equal(
    installedSettings.statusLine.command.split('speed-bridge.cjs').length - 1,
    1,
    'the wrapper must not be nested',
  );

  const disabled = manager.disable();
  assert.equal(disabled.changed, true);
  const restored = readSettings(configDir);
  assert.deepEqual(restored.statusLine, originalStatusLine);
  assert.equal(restored.model, 'keep-me');
  assert.deepEqual(restored.env, { KEEP: '1' });
  assert.equal(manager.isEnabled(), false);
  assert.equal(fs.existsSync(path.join(configDir, 'hub-speed', 'manifest.json')), false);
  assert.equal(manager.disable().changed, false);
});

test('enable without a previous statusLine removes it again on disable', (t) => {
  const root = tempDir(t, 'hub-speed-no-status-');
  const configDir = path.join(root, 'claude');
  writeSettings(configDir, { model: 'keep-me' });
  const manager = managerFor(configDir);
  manager.enable(process.execPath);

  const installed = readSettings(configDir);
  assert.equal(installed.statusLine.type, 'command');
  assert.match(installed.statusLine.command, /speed-bridge\.cjs/);

  manager.disable();
  const restored = readSettings(configDir);
  assert.equal(Object.prototype.hasOwnProperty.call(restored, 'statusLine'), false);
  assert.equal(restored.model, 'keep-me');
});

test('enable rejects malformed JSON, disabled hooks, invalid statusLine and symlinks', (t) => {
  const root = tempDir(t, 'hub-speed-reject-');
  const configDir = path.join(root, 'claude');
  const settingsFile = path.join(configDir, 'settings.json');
  fs.mkdirSync(configDir, { recursive: true });
  const manager = managerFor(configDir);

  fs.writeFileSync(settingsFile, '{broken json', 'utf8');
  assert.throws(() => manager.enable(process.execPath), SyntaxError);
  assert.equal(fs.readFileSync(settingsFile, 'utf8'), '{broken json');

  writeSettings(configDir, { disableAllHooks: true });
  assert.throws(() => manager.enable(process.execPath), /hooks are disabled/i);

  writeSettings(configDir, { statusLine: [] });
  assert.throws(() => manager.enable(process.execPath), /statusLine setting must be an object/i);

  writeSettings(configDir, { statusLine: { type: 'static', command: 'x' } });
  assert.throws(() => manager.enable(process.execPath), /Only command-based/i);

  writeSettings(configDir, { statusLine: { type: 'command', command: 42 } });
  assert.throws(() => manager.enable(process.execPath), /command must be a string/i);
  assert.equal(fs.existsSync(path.join(configDir, 'hub-speed', 'manifest.json')), false);

  const target = path.join(root, 'real-settings.json');
  fs.writeFileSync(target, '{}\n', 'utf8');
  fs.rmSync(settingsFile, { force: true });
  try {
    fs.symlinkSync(target, settingsFile, 'file');
  } catch {
    t.skip('symbolic links are not permitted in this environment');
    return;
  }
  assert.throws(() => manager.enable(process.execPath), /symbolic-link settings/i);
});

test('disable removes cached samples so no stale reading survives', (t) => {
  const root = tempDir(t, 'hub-speed-disable-cache-');
  const configDir = path.join(root, 'claude');
  const transcript = path.join(root, 'projects', 'p', 'transcript.jsonl');
  writeSettings(configDir, {});
  const manager = managerFor(configDir);
  manager.enable(process.execPath);
  bridge.collect(statusEvent({ transcriptPath: transcript, apiDurationMs: 1000 }), {
    configDir,
    now: 1000,
  });
  bridge.collect(statusEvent({ transcriptPath: transcript, outputTokens: 100, apiDurationMs: 3000 }), {
    configDir,
    now: 2000,
  });
  assert.ok(readOutputSpeed(configDir, 'session-1', transcript, 'model-1'));

  manager.disable();
  assert.equal(fs.existsSync(path.join(configDir, 'hub-speed', 'samples')), false);
  assert.equal(readOutputSpeed(configDir, 'session-1', transcript, 'model-1'), undefined);
});

test('buildWrapperCommand safely quotes spaces, single quotes and non-ASCII paths', () => {
  const node = "/opt/Node JS/O'Brien/node";
  const bridgePath = '/tmp/配置 目录/speed-bridge.cjs';
  assert.equal(
    buildWrapperCommand(node, bridgePath, 'linux'),
    `'/opt/Node JS/O'\\''Brien/node' '/tmp/配置 目录/speed-bridge.cjs'`,
  );

  const windowsNode = "C:\\Program Files\\Node JS\\O'Brien\\node.exe";
  const windowsBridge = "C:\\Users\\O'Brien\\配置 目录\\hub-speed\\speed-bridge.cjs";
  assert.equal(
    buildWrapperCommand(windowsNode, windowsBridge, 'win32', 'bash'),
    `'C:\\Program Files\\Node JS\\O'\\''Brien\\node.exe' 'C:\\Users\\O'\\''Brien\\配置 目录\\hub-speed\\speed-bridge.cjs'`,
  );
  assert.equal(
    buildWrapperCommand(windowsNode, windowsBridge, 'win32', 'powershell'),
    `& 'C:\\Program Files\\Node JS\\O''Brien\\node.exe' 'C:\\Users\\O''Brien\\配置 目录\\hub-speed\\speed-bridge.cjs'`,
  );

  // PowerShell single quotes keep `$` and backticks literal.
  const riskyBridge = 'C:\\Users\\$USER\\hub-speed\\speed-bridge.cjs';
  const riskyCommand = buildWrapperCommand(
    'C:\\nodejs\\node.exe',
    riskyBridge,
    'win32',
    'powershell',
  );
  assert.equal(
    riskyCommand,
    `& 'C:\\nodejs\\node.exe' 'C:\\Users\\$USER\\hub-speed\\speed-bridge.cjs'`,
  );
  assert.ok(!riskyCommand.includes('Buffer.from'));
  assert.throws(
    () => buildWrapperCommand('C:\\nodejs\\node.exe', 'C:\\bad\npath', 'win32', 'powershell'),
    /control characters/i,
  );
});

test('installed launcher runs from a configDir with spaces, Chinese and a single quote', (t) => {
  const root = tempDir(t, "hub speed 配置 O'Brien-");
  const configDir = path.join(root, "claude 配置 O'Brien");
  writeSettings(configDir, {});
  const manager = managerFor(configDir);
  manager.enable(process.execPath);

  const command = readSettings(configDir).statusLine.command as string;
  assert.equal(
    command,
    buildWrapperCommand(process.execPath, manager.bridgePath, process.platform),
  );

  const result = runThroughStatusLineShell(command, JSON.stringify(statusEvent({})));
  if (result.error && (result.error as NodeJS.ErrnoException).code === 'ENOENT') {
    t.skip('statusLine shell is not available');
    return;
  }
  assert.equal(result.status, 0, result.stderr || 'launcher failed');
  assert.match(result.stdout, /^Claude Hub/);

  if (process.platform === 'win32') {
    // Exercise the PowerShell `&` form even when Git Bash is the detected shell.
    const powershellCommand = buildWrapperCommand(
      process.execPath,
      manager.bridgePath,
      'win32',
      'powershell',
    );
    const powershell = spawnSync(
      powershellExecutable(),
      ['-NoProfile', '-NonInteractive', '-Command', powershellCommand],
      {
        input: JSON.stringify(statusEvent({})),
        encoding: 'utf8',
        timeout: 30000,
        windowsHide: true,
      },
    );
    if (powershell.error && (powershell.error as NodeJS.ErrnoException).code === 'ENOENT') {
      t.skip('PowerShell is not available');
      return;
    }
    assert.equal(powershell.status, 0, powershell.stderr || 'PowerShell launcher failed');
    assert.match(powershell.stdout, /^Claude Hub/);
  }
});

test('real subprocess: existing statusLine stdin/stdout pass through and speed is recorded', (t) => {
  const root = tempDir(t, 'hub-speed-bridge-pass-');
  const configDir = path.join(root, 'claude');
  const transcript = path.join(root, 'projects', 'p', 'transcript.jsonl');
  const script = path.join(root, 'original-status.cjs');
  fs.writeFileSync(
    script,
    [
      "'use strict';",
      "let input = '';",
      "process.stdin.setEncoding('utf8');",
      "process.stdin.on('data', (chunk) => { input += chunk; });",
      "process.stdin.on('end', () => { process.stdout.write('ORIGINAL:' + input); });",
      '',
    ].join('\n'),
    'utf8',
  );

  writeSettings(configDir, {
    model: 'keep-me',
    statusLine: { type: 'command', command: buildNodeScriptCommand(script), padding: 3 },
  });
  managerFor(configDir).enable(process.execPath);

  const firstEvent = statusEvent({ transcriptPath: transcript, outputTokens: 10, apiDurationMs: 1000 });
  const first = runStableBridge(configDir, firstEvent);
  assert.equal(first.stdout, 'ORIGINAL:' + JSON.stringify(firstEvent));

  const secondEvent = statusEvent({ transcriptPath: transcript, outputTokens: 150, apiDurationMs: 3000 });
  const second = runStableBridge(configDir, secondEvent);
  assert.equal(second.stdout, 'ORIGINAL:' + JSON.stringify(secondEvent));

  const sample = readOutputSpeed(configDir, 'session-1', transcript, 'model-1');
  assert.ok(sample);
  assert.equal(sample.outputTokens, 150);
  assert.equal(sample.durationMs, 2000);
  assert.equal(sample.tokensPerSecond, 75);
  const settings = readSettings(configDir);
  assert.equal(settings.model, 'keep-me');
  assert.equal(settings.statusLine.padding, 3);
});

test('real subprocess: no previous command shows Claude Hub tok/s', (t) => {
  const root = tempDir(t, 'hub-speed-bridge-fallback-');
  const configDir = path.join(root, 'claude');
  const transcript = path.join(root, 'projects', 'p', 'transcript.jsonl');
  writeSettings(configDir, {});
  managerFor(configDir).enable(process.execPath);

  const first = runStableBridge(
    configDir,
    statusEvent({ transcriptPath: transcript, outputTokens: 10, apiDurationMs: 1000 }),
  );
  assert.equal(first.stdout.trim(), 'Claude Hub');

  const second = runStableBridge(
    configDir,
    statusEvent({ transcriptPath: transcript, outputTokens: 150, apiDurationMs: 3000 }),
  );
  assert.equal(second.stdout.trim(), 'Claude Hub 75.0 tok/s');
});

test('real subprocess: a failing previous command does not break the status line', (t) => {
  const root = tempDir(t, 'hub-speed-bridge-fail-');
  const configDir = path.join(root, 'claude');
  const transcript = path.join(root, 'projects', 'p', 'transcript.jsonl');
  const script = path.join(root, 'failing-status.cjs');
  fs.writeFileSync(script, "'use strict';\nprocess.exit(3);\n", 'utf8');

  writeSettings(configDir, {
    statusLine: { type: 'command', command: buildNodeScriptCommand(script) },
  });
  managerFor(configDir).enable(process.execPath);

  const first = runStableBridge(
    configDir,
    statusEvent({ transcriptPath: transcript, outputTokens: 10, apiDurationMs: 1000 }),
  );
  assert.equal(first.stdout.trim(), 'Claude Hub');

  const second = runStableBridge(
    configDir,
    statusEvent({ transcriptPath: transcript, outputTokens: 150, apiDurationMs: 3000 }),
  );
  assert.equal(second.stdout.trim(), 'Claude Hub 75.0 tok/s');
});

test('runOriginalCommand enforces timeout and maxBuffer', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-speed-guards-'));
  try {
    const slow = path.join(root, 'slow.cjs');
    fs.writeFileSync(slow, 'setTimeout(() => {}, 5000);\n', 'utf8');
    const timedOut = await bridge.runOriginalCommand(buildNodeScriptCommand(slow), '', {
      timeoutMs: 800,
    });
    assert.equal(timedOut, undefined);

    const large = path.join(root, 'large.cjs');
    fs.writeFileSync(large, "process.stdout.write('x'.repeat(4096));\n", 'utf8');
    const overflowed = await bridge.runOriginalCommand(buildNodeScriptCommand(large), '', {
      maxBuffer: 512,
      timeoutMs: 10000,
    });
    assert.equal(overflowed, undefined);

    // A UTF-8 code point split across stdout chunks must be reassembled.
    const splitUtf8 = path.join(root, 'split-utf8.cjs');
    fs.writeFileSync(
      splitUtf8,
      [
        "'use strict';",
        "const bytes = Buffer.from('中文测试', 'utf8');",
        'process.stdout.write(bytes.subarray(0, 1));',
        'setTimeout(() => process.stdout.write(bytes.subarray(1)), 25);',
        '',
      ].join('\n'),
      'utf8',
    );
    const splitResult = await bridge.runOriginalCommand(
      buildNodeScriptCommand(splitUtf8),
      '',
      { timeoutMs: 10000 },
    );
    assert.equal(splitResult?.stdout, '中文测试');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('real subprocess: UTF-8 stdin split across chunks keeps a Chinese path intact', async (t) => {
  const root = tempDir(t, 'hub-speed-split-stdin-');
  const configDir = path.join(root, 'claude');
  const transcript = path.join(root, '项目', '记录.jsonl');
  writeSettings(configDir, {});
  managerFor(configDir).enable(process.execPath);

  const firstEvent = statusEvent({
    transcriptPath: transcript,
    outputTokens: 10,
    apiDurationMs: 1000,
  });
  const first = await runStableBridgeSplitStdin(configDir, firstEvent);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stdout.trim(), 'Claude Hub');
  const sampleFile = outputSpeedSampleFile(configDir, 'session-1', transcript);
  assert.ok(sampleFile && fs.existsSync(sampleFile), 'decoded Chinese path must key the sample');

  const secondEvent = statusEvent({
    transcriptPath: transcript,
    outputTokens: 100,
    apiDurationMs: 3000,
  });
  const second = await runStableBridgeSplitStdin(configDir, secondEvent);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.stdout.trim(), 'Claude Hub 50.0 tok/s');
  const sample = readOutputSpeed(configDir, 'session-1', transcript, 'model-1');
  assert.ok(sample);
  assert.equal(sample.outputTokens, 100);
  assert.equal(sample.durationMs, 2000);
  assert.equal(sample.model, 'model-1');
  assert.equal(sample.tokensPerSecond, 50);
});
