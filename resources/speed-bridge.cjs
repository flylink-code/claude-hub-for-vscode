'use strict';

// Claude Hub statusLine speed bridge.
//
// This file is copied to `<claude-config>/hub-speed/speed-bridge.cjs` and must stay
// self-contained: Node built-ins only, no vscode, no network access. It is invoked
// directly as a Claude Code statusLine command, receives the statusLine JSON on
// stdin, records only an allow-listed speed sample, and optionally runs the user's
// previous statusLine command with exactly the same stdin/stdout.
//
// Allow-listed sample fields (never prompts, credentials, or transcript bodies):
//   session_id, transcript_path, model (model.id), usage counters,
//   cost.total_api_duration_ms, and the computed reading fields.
//
// The sample file name is sha256(session_id + NUL + canonical transcript path).
// Windows paths are lower-cased so casing differences do not split a session.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const MIN_DURATION_MS = 500;
const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const MAX_ORIGINAL_OUTPUT_BYTES = 1024 * 1024;
const ORIGINAL_TIMEOUT_MS = 10 * 1000;
const MAX_STORED_STDERR = 64 * 1024;
const USAGE_FIELDS = [
  'input_tokens',
  'output_tokens',
  'cache_creation_input_tokens',
  'cache_read_input_tokens',
];

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveFinite(value) {
  return isFiniteNumber(value) && value > 0;
}

/**
 * Canonical transcript path used for the sample-file hash and for binding checks.
 * Backslashes are normalised and, on Windows, the whole path is lower-cased.
 */
function canonicalTranscriptPath(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096) return '';
  let resolved;
  try {
    resolved = path.resolve(value);
  } catch {
    return '';
  }
  if (process.platform === 'win32') resolved = resolved.toLowerCase();
  const normalized = resolved.replace(/\\/g, '/');
  const stripped = normalized.replace(/\/+$/, '');
  return stripped || normalized || '/';
}

function outputSpeedSampleKey(sessionId, canonicalPath) {
  return crypto
    .createHash('sha256')
    .update(String(sessionId) + '\u0000' + canonicalPath)
    .digest('hex');
}

function sampleFile(configDir, sessionId, canonicalPath) {
  return path.join(
    configDir,
    'hub-speed',
    'samples',
    outputSpeedSampleKey(sessionId, canonicalPath) + '.json',
  );
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

// Atomic write so a statusLine invocation can never leave a half-written sample
// behind when two Claude sessions or a retry race each other. Samples contain
// conversation-derived usage, so the directory is private and files are 0600.
function atomicWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    fs.renameSync(temp, file);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

/**
 * Reduce an untrusted usage object to the four numeric counters Hub stores.
 * Missing/null counters become 0; malformed counters invalidate the sample.
 * output_tokens is required because it is the numerator of the speed reading.
 */
function sanitizeUsage(value) {
  if (!isPlainObject(value)) return undefined;
  const usage = {};
  for (const field of USAGE_FIELDS) {
    const raw = value[field];
    if (raw === undefined || raw === null) {
      usage[field] = 0;
    } else if (isFiniteNumber(raw) && raw >= 0) {
      usage[field] = raw;
    } else {
      return undefined;
    }
  }
  if (!isFiniteNumber(usage.output_tokens)) return undefined;
  return usage;
}

function usageKey(usage) {
  return USAGE_FIELDS.map((field) => String(usage[field])).join('|');
}

/**
 * Extract only allow-listed fields from the statusLine event.
 * Anything else in the JSON (especially prompt text or credentials) is dropped
 * here and can never reach disk through this module.
 */
function extractCurrent(event) {
  if (!isPlainObject(event)) return undefined;
  const sessionId = typeof event.session_id === 'string' ? event.session_id : '';
  if (!sessionId || sessionId.length > 512) return undefined;
  const transcriptPath = canonicalTranscriptPath(event.transcript_path);
  if (!transcriptPath) return undefined;
  const model =
    isPlainObject(event.model) && typeof event.model.id === 'string' ? event.model.id : '';
  const cost = isPlainObject(event.cost) ? event.cost : undefined;
  const apiDurationMs =
    cost && isFiniteNumber(cost.total_api_duration_ms) && cost.total_api_duration_ms >= 0
      ? cost.total_api_duration_ms
      : undefined;
  // Claude Code nests the latest request usage under context_window.current_usage.
  // Accept a top-level current_usage as a defensive fallback for older builds.
  const rawUsage =
    isPlainObject(event.context_window) && event.context_window.current_usage !== undefined
      ? event.context_window.current_usage
      : event.current_usage;
  const usage = sanitizeUsage(rawUsage);
  return { sessionId, transcriptPath, model, apiDurationMs, usage };
}

function sampleFromState(state, model) {
  if (!isPlainObject(state) || state.model !== model) return undefined;
  if (!isPositiveFinite(state.measuredAt)) return undefined;
  if (!isPositiveFinite(state.outputTokens)) return undefined;
  if (!isPositiveFinite(state.durationMs)) return undefined;
  if (!isPositiveFinite(state.tokensPerSecond)) return undefined;
  return {
    measuredAt: state.measuredAt,
    outputTokens: state.outputTokens,
    durationMs: state.durationMs,
    model: state.model,
    tokensPerSecond: state.tokensPerSecond,
  };
}

function withSample(state, sample) {
  if (!sample) return state;
  return {
    ...state,
    measuredAt: sample.measuredAt,
    outputTokens: sample.outputTokens,
    durationMs: sample.durationMs,
    tokensPerSecond: sample.tokensPerSecond,
  };
}

function normalizePrevious(value) {
  if (!isPlainObject(value)) return undefined;
  if (typeof value.session_id !== 'string' || !value.session_id) return undefined;
  if (typeof value.transcript_path !== 'string' || !value.transcript_path) return undefined;
  if (typeof value.model !== 'string') return undefined;
  if (!isFiniteNumber(value.apiDurationMs) || value.apiDurationMs < 0) return undefined;
  const usage = sanitizeUsage(value.usage);
  if (!usage) return undefined;
  return {
    session_id: value.session_id,
    transcript_path: value.transcript_path,
    model: value.model,
    apiDurationMs: value.apiDurationMs,
    usage,
    measuredAt: value.measuredAt,
    outputTokens: value.outputTokens,
    durationMs: value.durationMs,
    tokensPerSecond: value.tokensPerSecond,
  };
}

/**
 * Pure speed calculation.
 *
 * Reading = current_usage.output_tokens / (delta of cost.total_api_duration_ms).
 * Rules:
 *  - First sample for a session/model is a baseline only (nothing to display).
 *  - The same usage counters mean no new API response arrived: keep the previous
 *    reading, but move the API-duration baseline forward ("absorb" it).
 *  - A usage change with less than 500 ms of API-time delta is too noisy to
 *    measure; absorb the baseline and keep the previous reading.
 *  - Counter reset, model change, output_tokens == 0, or missing usage clears
 *    the reading; the next valid event becomes the new baseline.
 *  - If usage is identical but duration changed, a second response with exactly
 *    the same token counts would be indistinguishable. We conservatively keep
 *    the old reading instead of guessing (a missed update is safer than a wrong
 *    one).
 *
 * @param {object|undefined} previous stored state from the last invocation
 * @param {{sessionId:string,transcriptPath:string,model:string,apiDurationMs?:number,usage?:object}} current
 * @param {number} [now]
 * @returns {{state: object, sample: object|undefined}}
 */
function computeSpeed(previous, current, now) {
  const timestamp = isFiniteNumber(now) ? now : Date.now();
  const usage = sanitizeUsage(current && current.usage);
  const state = {
    session_id: typeof current?.sessionId === 'string' ? current.sessionId : '',
    transcript_path: typeof current?.transcriptPath === 'string' ? current.transcriptPath : '',
    model: typeof current?.model === 'string' ? current.model : '',
    usage: usage || null,
    updatedAt: timestamp,
  };
  if (isFiniteNumber(current?.apiDurationMs) && current.apiDurationMs >= 0) {
    state.apiDurationMs = current.apiDurationMs;
  }

  const outputTokens = usage ? usage.output_tokens : undefined;
  if (!isPositiveFinite(outputTokens)) {
    // output 0 or missing usage: clear any old reading.
    return { state, sample: undefined };
  }

  const prev = normalizePrevious(previous);
  if (
    !prev ||
    prev.session_id !== state.session_id ||
    prev.transcript_path !== state.transcript_path ||
    prev.model !== state.model
  ) {
    // First baseline or session/model change: no reading yet.
    return { state, sample: undefined };
  }

  if (!isFiniteNumber(current.apiDurationMs) || current.apiDurationMs < 0) {
    return { state, sample: undefined };
  }

  if (current.apiDurationMs < prev.apiDurationMs) {
    // cost.total_api_duration_ms reset (e.g. /clear or a new counter epoch).
    return { state, sample: undefined };
  }

  const existing = sampleFromState(prev, state.model);
  if (usageKey(prev.usage) === usageKey(usage)) {
    // Same response observed again: keep the reading and absorb API growth.
    return { state: withSample(state, existing), sample: existing };
  }

  const delta = current.apiDurationMs - prev.apiDurationMs;
  if (delta < MIN_DURATION_MS) {
    // Too short to measure reliably. Absorb the baseline so the next response
    // is measured from this point rather than including this fast request.
    return { state: withSample(state, existing), sample: existing };
  }

  const tokensPerSecond = outputTokens / (delta / 1000);
  if (!isPositiveFinite(tokensPerSecond)) {
    return { state: withSample(state, existing), sample: existing };
  }

  const sample = {
    measuredAt: timestamp,
    outputTokens,
    durationMs: delta,
    model: state.model,
    tokensPerSecond,
  };
  return { state: withSample(state, sample), sample };
}

/**
 * Read/modify/write the per-session sample state.
 * Returns the new reading, or undefined when this invocation only produced a
 * baseline or cleared an old reading.
 */
function collect(event, options) {
  const configDir = options && options.configDir;
  if (typeof configDir !== 'string' || !configDir) return undefined;
  const current = extractCurrent(event);
  if (!current) return undefined;

  const file = sampleFile(configDir, current.sessionId, current.transcriptPath);
  const previous = readJson(file);
  const result = computeSpeed(
    previous,
    current,
    options.now === undefined ? Date.now() : options.now,
  );
  try {
    atomicWriteJson(file, result.state);
  } catch {
    // A statusLine helper must never break the original status line.
  }
  return result.sample;
}

function formatStatus(sample) {
  if (sample && isPositiveFinite(sample.tokensPerSecond)) {
    return 'Claude Hub ' + sample.tokensPerSecond.toFixed(1) + ' tok/s';
  }
  return 'Claude Hub';
}

/** Locate Git Bash the same way Claude Code does on Windows. */
function findWindowsBash(env) {
  const environment = env || process.env;
  const candidates = [];
  for (const key of ['CLAUDE_CODE_GIT_BASH_PATH', 'GIT_BASH_PATH']) {
    if (environment[key]) candidates.push(environment[key]);
  }
  const programFiles = environment.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = environment['ProgramFiles(x86)'];
  const localAppData = environment.LOCALAPPDATA;
  candidates.push(
    path.join(programFiles, 'Git', 'bin', 'bash.exe'),
    path.join(programFiles, 'Git', 'usr', 'bin', 'bash.exe'),
  );
  if (programFilesX86) {
    candidates.push(
      path.join(programFilesX86, 'Git', 'bin', 'bash.exe'),
      path.join(programFilesX86, 'Git', 'usr', 'bin', 'bash.exe'),
    );
  }
  if (localAppData) {
    candidates.push(path.join(localAppData, 'Programs', 'Git', 'bin', 'bash.exe'));
  }
  const pathValue = environment.PATH || environment.Path || '';
  for (const entry of String(pathValue).split(path.delimiter)) {
    if (!entry) continue;
    candidates.push(
      path.join(entry, 'bash.exe'),
      path.join(entry, '..', 'bin', 'bash.exe'),
      path.join(entry, '..', 'usr', 'bin', 'bash.exe'),
    );
  }
  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) return candidate;
    } catch {
      /* ignore unreadable candidates */
    }
  }
  return undefined;
}

/**
 * Pick the shell Claude Code uses for a statusLine command on this platform.
 * The original command is always passed as a single `-c`/`-Command` argument;
 * it is never concatenated into a larger shell string.
 */
function resolveShellCommand(command, options) {
  const opts = options || {};
  const platform = opts.platform || process.platform;
  if (platform === 'win32') {
    const bash = opts.bashPath || findWindowsBash(opts.env);
    if (bash) return { shell: bash, args: ['-c', command], kind: 'bash' };
    return {
      shell: opts.powershellPath || 'powershell.exe',
      args: ['-NoProfile', '-NonInteractive', '-Command', command],
      kind: 'powershell',
    };
  }
  return { shell: opts.shPath || '/bin/sh', args: ['-c', command], kind: 'sh' };
}

/**
 * Run the user's previous statusLine command with the original stdin.
 * Returns { stdout, code, signal, failed } or undefined on spawn failure,
 * timeout, or output overflow. The caller then shows a fallback instead of
 * leaving the status bar blank.
 */
function runOriginalCommand(command, input, options) {
  const opts = options || {};
  const timeoutMs = isFiniteNumber(opts.timeoutMs) ? opts.timeoutMs : ORIGINAL_TIMEOUT_MS;
  const maxBuffer = isFiniteNumber(opts.maxBuffer) ? opts.maxBuffer : MAX_ORIGINAL_OUTPUT_BYTES;
  const resolved = resolveShellCommand(command, opts);

  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(resolved.shell, resolved.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch {
      resolve(undefined);
      return;
    }

    let stdout = '';
    let stderr = '';
    let outputBytes = 0;
    let settled = false;
    let timedOut = false;
    let overflowed = false;
    let timer;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (stderr) {
        try {
          process.stderr.write(stderr);
        } catch {
          /* stderr is best-effort */
        }
      }
      resolve(result);
    };

    child.on('error', () => finish(undefined));
    // A child that exits before reading all stdin must not raise an unhandled EPIPE.
    child.stdin.on('error', () => {});
    child.stdout.on('error', () => finish(undefined));
    child.stderr.on('error', () => {});
    // Decode at the stream level so a multi-byte UTF-8 sequence split across
    // two data chunks is reassembled instead of being turned into mojibake.
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk) => {
      if (settled) return;
      const text = String(chunk);
      outputBytes += Buffer.byteLength(text, 'utf8');
      if (outputBytes > maxBuffer) {
        overflowed = true;
        try {
          child.kill();
        } catch {
          /* ignore */
        }
        finish(undefined);
        return;
      }
      stdout += text;
    });

    child.stderr.on('data', (chunk) => {
      if (stderr.length < MAX_STORED_STDERR) stderr += String(chunk);
    });

    child.on('close', (code, signal) => {
      if (timedOut || overflowed) {
        finish(undefined);
        return;
      }
      finish({ stdout, code, signal, failed: code !== 0 && code !== null });
    });

    timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      finish(undefined);
    }, timeoutMs);

    try {
      child.stdin.end(input || '');
    } catch {
      /* the close handler still resolves the promise */
    }
  });
}

function readManifest(configDir) {
  if (!configDir) return undefined;
  const value = readJson(path.join(configDir, 'hub-speed', 'manifest.json'));
  if (!isPlainObject(value)) return undefined;
  if (value.previous !== null && value.previous !== undefined && !isPlainObject(value.previous)) {
    return undefined;
  }
  if (!isPlainObject(value.installed)) return undefined;
  return value;
}

function resolveConfigDir(argv) {
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--config-dir' && typeof argv[index + 1] === 'string') return argv[index + 1];
    if (arg.startsWith('--config-dir=')) return arg.slice('--config-dir='.length);
  }
  // The stable deployment lives at <configDir>/hub-speed/speed-bridge.cjs, so it
  // can locate the config directory without putting a quoted path in the command.
  if (path.basename(__dirname) === 'hub-speed') return path.dirname(__dirname);
  return '';
}

async function readStdin(maxBytes) {
  let input = '';
  let bytes = 0;
  // Stream decoding preserves a multi-byte character split across chunks
  // (for example a Chinese transcript path written in two stdin writes).
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    const text = String(chunk);
    bytes += Buffer.byteLength(text, 'utf8');
    if (bytes > maxBytes) throw new Error('Status line input is too large.');
    input += text;
  }
  return input;
}

async function main(argv) {
  const args = argv || process.argv.slice(2);
  const configDir = resolveConfigDir(args);
  let input = '';
  let sample;
  try {
    input = await readStdin(MAX_INPUT_BYTES);
  } catch {
    // Keep going: the original command still runs, with whatever input we got.
  }
  try {
    if (input) sample = collect(JSON.parse(input), { configDir });
  } catch {
    // Untrusted input must never break the original status line.
  }

  const fallback = formatStatus(sample);
  const manifest = readManifest(configDir);
  const previous = manifest && manifest.previous;
  if (
    isPlainObject(previous) &&
    previous.type === 'command' &&
    typeof previous.command === 'string' &&
    previous.command.trim()
  ) {
    const result = await runOriginalCommand(previous.command, input, {});
    if (result && (result.stdout || !result.failed)) {
      process.stdout.write(result.stdout);
      return;
    }
  }
  process.stdout.write(fallback + '\n');
}

module.exports = {
  MIN_DURATION_MS,
  canonicalTranscriptPath,
  outputSpeedSampleKey,
  sampleFile,
  sanitizeUsage,
  computeSpeed,
  collect,
  formatStatus,
  extractCurrent,
  findWindowsBash,
  resolveShellCommand,
  runOriginalCommand,
  readManifest,
  resolveConfigDir,
  main,
};

if (require.main === module) {
  main().catch(() => {
    try {
      process.stdout.write('Claude Hub\n');
    } catch {
      /* nothing else we can do */
    }
  });
}
