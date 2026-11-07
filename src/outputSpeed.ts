import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { atomicWriteJson, readJsonObject, resolveNodeExecutable } from './taskIntegration.js';
import type { OutputSpeedSample } from './types.js';

/**
 * Speed readings written by `resources/speed-bridge.cjs`.
 *
 * The bridge computes an average from the latest completed response:
 *   current_usage.output_tokens / delta(cost.total_api_duration_ms)
 * and stores the result under `<configDir>/hub-speed/samples/<sha256>.json`.
 *
 * This module mirrors only the tiny file-name/binding rules needed to read that
 * sample. The bridge remains the single implementation of the calculation.
 */

type JsonObject = Record<string, any>;

/** The bridge never publishes a reading shorter than this. */
const MIN_READING_DURATION_MS = 500;
/** Tolerate small clock adjustments when rejecting future `measuredAt` values. */
const MAX_FUTURE_SKEW_MS = 5000;
/** Reject tampered/torn readings whose rate does not match its inputs. */
const RATE_TOLERANCE = 0.01;

export interface SpeedManifest {
  version: number;
  /** StatusLine configuration that existed before Hub installed the wrapper. */
  previous: JsonObject | null;
  /** StatusLine configuration Hub installed. */
  installed: JsonObject;
  installedCommand: string;
  configDir: string;
  createdAt: number;
  updatedAt: number;
}

export interface SpeedEnableResult {
  changed: boolean;
  installedCommand: string;
  backupPath?: string;
}

export interface SpeedDisableResult {
  changed: boolean;
}

/**
 * Canonical transcript path shared with the bridge. Windows paths are
 * lower-cased so a differently-cased statusLine path maps to the same sample.
 */
export function canonicalTranscriptPath(value: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096) return '';
  let resolved: string;
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

export function outputSpeedSampleKey(sessionId: string, canonicalPath: string): string {
  return crypto.createHash('sha256').update(sessionId + '\u0000' + canonicalPath).digest('hex');
}

export function outputSpeedSampleFile(
  configDir: string,
  sessionId: string,
  transcriptPath: string,
): string | undefined {
  const canonical = canonicalTranscriptPath(transcriptPath);
  if (!configDir || !sessionId || !canonical) return undefined;
  return path.join(
    configDir,
    'hub-speed',
    'samples',
    outputSpeedSampleKey(sessionId, canonical) + '.json',
  );
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isPlainObject(value: unknown): value is JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function deepEqualJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;
  if (typeof left !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((item, index) => deepEqualJson(item, right[index]));
  }
  const leftKeys = Object.keys(left as object);
  const rightKeys = Object.keys(right as object);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      deepEqualJson((left as JsonObject)[key], (right as JsonObject)[key]),
  );
}

function cloneJson<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function readManifest(configDir: string): SpeedManifest | undefined {
  try {
    const value = JSON.parse(
      fs.readFileSync(path.join(configDir, 'hub-speed', 'manifest.json'), 'utf8'),
    );
    if (!isPlainObject(value)) return undefined;
    if (value.previous !== null && value.previous !== undefined && !isPlainObject(value.previous)) {
      return undefined;
    }
    if (!isPlainObject(value.installed)) return undefined;
    if (typeof value.installedCommand !== 'string') return undefined;
    return {
      version: typeof value.version === 'number' ? value.version : 1,
      previous: value.previous ?? null,
      installed: value.installed,
      installedCommand: value.installedCommand,
      configDir: typeof value.configDir === 'string' ? value.configDir : '',
      createdAt: typeof value.createdAt === 'number' ? value.createdAt : 0,
      updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
    };
  } catch {
    return undefined;
  }
}

/**
 * True when the Hub wrapper is both recorded in the manifest and still present
 * in the user's settings.json. If another tool changes statusLine, readers stop
 * using (potentially stale) samples immediately, and disable refuses to
 * overwrite the external change.
 */
export function isSpeedIntegrationInstalled(configDir: string): boolean {
  if (!configDir) return false;
  const manifest = readManifest(configDir);
  if (!manifest) return false;
  try {
    const settings = readJsonObject(path.join(configDir, 'settings.json'));
    return deepEqualJson(settings.statusLine, manifest.installed);
  } catch {
    return false;
  }
}

/**
 * Read the latest completed-response speed sample for a session.
 *
 * The sample is only accepted when:
 *  - Hub's wrapper is currently installed (manifest and settings agree),
 *  - the stored session/path binding matches,
 *  - `model` matches exactly when supplied, and
 *  - the reading is structurally valid with finite positive numbers.
 *
 * `model` is the model that produced the response. Claude Code reports
 * `model.id` in statusLine JSON; when a relay is selected the session's selected
 * model may differ from the response model, so the caller should pass the same
 * model it wants to bind to. A mismatch returns undefined rather than a stale
 * reading.
 *
 * This never reads the JSONL transcript; only the small sample JSON is opened.
 */
export function readOutputSpeed(
  configDir: string,
  sessionId: string,
  transcriptPath: string,
  model?: string,
): OutputSpeedSample | undefined {
  if (!configDir || typeof configDir !== 'string') return undefined;
  if (typeof sessionId !== 'string' || !sessionId) return undefined;
  const canonical = canonicalTranscriptPath(transcriptPath);
  if (!canonical) return undefined;
  if (!isSpeedIntegrationInstalled(configDir)) return undefined;

  const file = path.join(
    configDir,
    'hub-speed',
    'samples',
    outputSpeedSampleKey(sessionId, canonical) + '.json',
  );

  let value: unknown;
  try {
    value = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
  if (!isPlainObject(value)) return undefined;
  if (value.session_id !== sessionId) return undefined;
  if (canonicalTranscriptPath(String(value.transcript_path ?? '')) !== canonical) return undefined;
  if (typeof value.model !== 'string') return undefined;
  if (model !== undefined && value.model !== model) return undefined;
  if (!isPositiveFinite(value.measuredAt)) return undefined;
  if (!isPositiveFinite(value.outputTokens)) return undefined;
  if (!isPositiveFinite(value.durationMs)) return undefined;
  if (!isPositiveFinite(value.tokensPerSecond)) return undefined;
  // The bridge only publishes readings whose API-duration delta reached 500 ms.
  if (value.durationMs < MIN_READING_DURATION_MS) return undefined;
  // A reading cannot have been measured in the future (allow a little clock skew).
  if (value.measuredAt > Date.now() + MAX_FUTURE_SKEW_MS) return undefined;
  // Reject inconsistent or tampered numbers: tokens/second must match
  // output_tokens and duration_ms.
  const expectedRate = value.outputTokens / (value.durationMs / 1000);
  const tolerance = Math.max(0.01, expectedRate * RATE_TOLERANCE);
  if (Math.abs(value.tokensPerSecond - expectedRate) > tolerance) return undefined;

  return {
    measuredAt: value.measuredAt,
    outputTokens: value.outputTokens,
    durationMs: value.durationMs,
    model: value.model,
    tokensPerSecond: value.tokensPerSecond,
  };
}

function posixQuote(value: string): string {
  // Close the quote, emit an escaped single quote, then reopen it.
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function powershellQuote(value: string): string {
  if (/[\u0000-\u001f]/.test(value)) {
    throw new Error('A status line path contains control characters that cannot be safely quoted.');
  }
  // PowerShell single-quoted strings do not expand `$` or backticks; an embedded
  // single quote is escaped by doubling it (`''`).
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Detect the Git Bash installation Claude Code uses on Windows.
 *
 * Claude Code exposes `CLAUDE_CODE_GIT_BASH_PATH`; when it is missing we check
 * the standard install locations so the generated wrapper and the bridge's
 * original-command runner agree on the same shell family.
 */
export function findWindowsGitBash(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const candidates: string[] = [];
  for (const key of ['CLAUDE_CODE_GIT_BASH_PATH', 'GIT_BASH_PATH']) {
    if (env[key]) candidates.push(env[key]!);
  }
  const programFiles = env.ProgramFiles || 'C:\\Program Files';
  candidates.push(
    path.join(programFiles, 'Git', 'bin', 'bash.exe'),
    path.join(programFiles, 'Git', 'usr', 'bin', 'bash.exe'),
  );
  if (env['ProgramFiles(x86)']) {
    candidates.push(
      path.join(env['ProgramFiles(x86)']!, 'Git', 'bin', 'bash.exe'),
      path.join(env['ProgramFiles(x86)']!, 'Git', 'usr', 'bin', 'bash.exe'),
    );
  }
  if (env.LOCALAPPDATA) {
    candidates.push(path.join(env.LOCALAPPDATA, 'Programs', 'Git', 'bin', 'bash.exe'));
  }
  for (const entry of String(env.PATH || env.Path || '').split(path.delimiter)) {
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

export type WindowsWrapperShell = 'bash' | 'powershell';

/**
 * Build the stable statusLine command string.
 *
 * The bridge can locate `<configDir>` from its own stable path
 * (`<configDir>/hub-speed/speed-bridge.cjs`), so only the Node executable and
 * script path appear here. The original user command is never embedded: it is
 * stored in the manifest and executed by the bridge as one opaque shell argument,
 * which preserves the user's own shell semantics.
 *
 * Quoting follows the shell Claude Code uses for statusLine commands:
 *  - Git Bash / sh: single quotes, with embedded `'` escaped as `'\''`.
 *  - PowerShell: the `&` call operator plus single-quoted paths. A bare
 *    `"C:\...\node.exe"` is a string expression in PowerShell, not a command.
 *    Single quotes also stop PowerShell from expanding `$` or backticks.
 *
 * The generated command never contains the user's original command, so no shell
 * string concatenation can re-interpret or inject it.
 */
export function buildWrapperCommand(
  nodeExecutable: string,
  bridgePath: string,
  platform: NodeJS.Platform = process.platform,
  windowsShell?: WindowsWrapperShell,
): string {
  if (!nodeExecutable || !bridgePath) throw new Error('Node.js and bridge paths are required.');
  if (platform !== 'win32') {
    return `${posixQuote(nodeExecutable)} ${posixQuote(bridgePath)}`;
  }

  const shell = windowsShell || (findWindowsGitBash() ? 'bash' : 'powershell');
  if (shell === 'bash') {
    // Git Bash on Windows accepts Windows paths inside POSIX single quotes.
    return `${posixQuote(nodeExecutable)} ${posixQuote(bridgePath)}`;
  }
  return `& ${powershellQuote(nodeExecutable)} ${powershellQuote(bridgePath)}`;
}

function commandReferencesBridge(command: string, bridgePath: string): boolean {
  const normalizedCommand = command.replace(/\\/g, '/').toLowerCase();
  const normalizedBridge = bridgePath.replace(/\\/g, '/').toLowerCase();
  if (normalizedCommand.includes(normalizedBridge)) return true;
  if (normalizedCommand.includes('speed-bridge.cjs')) return true;
  const encoded = Buffer.from(bridgePath, 'utf8').toString('base64');
  return command.includes(encoded);
}

function lstatOrUndefined(file: string): fs.Stats | undefined {
  try {
    return fs.lstatSync(file);
  } catch (error: any) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
}

/**
 * Installs/removes Hub's statusLine wrapper while preserving every other user
 * setting. This class never touches a real config directory unless the caller
 * passes one and explicitly calls enable()/disable().
 */
export class SpeedIntegrationManager {
  readonly hubDir: string;
  readonly bridgePath: string;
  readonly manifestPath: string;
  readonly settingsFile: string;

  constructor(
    public readonly configDir: string,
    private readonly bundledBridge: string,
  ) {
    if (!configDir || typeof configDir !== 'string') {
      throw new Error('Claude configuration directory is required.');
    }
    this.hubDir = path.join(configDir, 'hub-speed');
    this.bridgePath = path.join(this.hubDir, 'speed-bridge.cjs');
    this.manifestPath = path.join(this.hubDir, 'manifest.json');
    this.settingsFile = path.join(configDir, 'settings.json');
  }

  /** Whether the wrapper is installed and settings still match the manifest. */
  isEnabled(): boolean {
    return isSpeedIntegrationInstalled(this.configDir);
  }

  private assertSafeWriteTarget(): void {
    const settingsStat = lstatOrUndefined(this.settingsFile);
    if (settingsStat?.isSymbolicLink()) {
      throw new Error('Claude Hub refuses to write through a symbolic-link settings.json.');
    }
    if (settingsStat?.isDirectory()) {
      throw new Error('The settings.json path is a directory.');
    }
    const hubStat = lstatOrUndefined(this.hubDir);
    if (hubStat?.isSymbolicLink()) {
      throw new Error('Claude Hub refuses to write through a symbolic-link hub-speed directory.');
    }
    if (hubStat && !hubStat.isDirectory()) {
      throw new Error('The hub-speed path is not a directory.');
    }
  }

  private ensurePrivateDir(dir: string): void {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    try {
      fs.chmodSync(dir, 0o700);
    } catch {
      /* Windows and some filesystems do not expose POSIX modes */
    }
  }

  private installBridge(): void {
    this.ensurePrivateDir(this.hubDir);
    // Create the samples directory eagerly so SessionManager's file watcher can
    // observe the first reading without waiting for another scan cycle.
    this.ensurePrivateDir(path.join(this.hubDir, 'samples'));
    if (path.resolve(this.bundledBridge) === path.resolve(this.bridgePath)) return;
    let content: Buffer;
    try {
      content = fs.readFileSync(this.bundledBridge);
    } catch {
      throw new Error('The bundled speed bridge was not found.');
    }
    const temp = `${this.bridgePath}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temp, content);
      fs.renameSync(temp, this.bridgePath);
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
  }

  private backupSettings(original: string): string | undefined {
    if (!original) return undefined;
    const backupDir = path.join(this.hubDir, 'backups');
    this.ensurePrivateDir(backupDir);
    const backup = path.join(
      backupDir,
      `settings.${Date.now()}.${crypto.randomUUID()}.json`,
    );
    fs.writeFileSync(backup, original, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    return backup;
  }

  private writeManifest(manifest: SpeedManifest): void {
    atomicWriteJson(this.manifestPath, manifest);
  }

  /**
   * Install the wrapper into the user's config-dir settings.json.
   *
   * - Preserves the whole existing statusLine object (padding, type, unknown
   *   fields) and every unrelated setting.
   * - Stores the previous statusLine in the manifest for disable().
   * - Idempotent: a command that is already the canonical wrapper is not wrapped
   *   again, preventing nested `speed-bridge -> speed-bridge` invocations.
   * - Rejects malformed JSON, a disabled-hooks config, statusLine values that are
   *   not command-based, and symbolic-link write targets.
   * - Uses an optimistic read/write check so concurrent edits are not clobbered.
   */
  enable(nodeExecutable: string = resolveNodeExecutable()): SpeedEnableResult {
    if (!nodeExecutable || typeof nodeExecutable !== 'string') {
      throw new Error('A Node.js executable is required.');
    }
    this.assertSafeWriteTarget();

    const original = fs.existsSync(this.settingsFile)
      ? fs.readFileSync(this.settingsFile, 'utf8')
      : '';
    const settings = readJsonObject(this.settingsFile);
    if (settings.disableAllHooks === true) {
      throw new Error('Claude hooks are disabled; enable hooks before installing the speed bridge.');
    }
    const rawStatusLine = settings.statusLine;
    if (rawStatusLine !== undefined && !isPlainObject(rawStatusLine)) {
      throw new Error('The statusLine setting must be an object.');
    }
    if (rawStatusLine && rawStatusLine.type !== undefined && rawStatusLine.type !== 'command') {
      throw new Error('Only command-based status lines are supported.');
    }
    if (rawStatusLine && rawStatusLine.command !== undefined && typeof rawStatusLine.command !== 'string') {
      throw new Error('The statusLine command must be a string.');
    }

    const currentStatusLine: JsonObject | undefined = rawStatusLine
      ? cloneJson(rawStatusLine)
      : undefined;
    const installedCommand = buildWrapperCommand(
      nodeExecutable,
      this.bridgePath,
      process.platform,
      process.platform === 'win32'
        ? findWindowsGitBash()
          ? 'bash'
          : 'powershell'
        : undefined,
    );
    const existingManifest = readManifest(this.configDir);

    // Already installed: refresh the stable bridge and manifest without nesting
    // or rewriting settings.
    if (currentStatusLine && currentStatusLine.command === installedCommand) {
      this.installBridge();
      let manifestChanged = false;
      if (!existingManifest || !deepEqualJson(existingManifest.installed, currentStatusLine)) {
        const now = Date.now();
        this.writeManifest({
          version: 1,
          previous: existingManifest ? existingManifest.previous : null,
          installed: cloneJson(currentStatusLine),
          installedCommand,
          configDir: this.configDir,
          createdAt: existingManifest?.createdAt || now,
          updatedAt: now,
        });
        manifestChanged = true;
      }
      return { changed: manifestChanged, installedCommand };
    }

    // A different command that still references the bridge is an old/manual Hub
    // command, not a user command. Refuse instead of wrapping it a second time.
    if (
      currentStatusLine &&
      typeof currentStatusLine.command === 'string' &&
      commandReferencesBridge(currentStatusLine.command, this.bridgePath)
    ) {
      throw new Error(
        'The status line already references the Claude Hub speed bridge; disable it first.',
      );
    }

    const previous: JsonObject | null = currentStatusLine ? cloneJson(currentStatusLine) : null;
    const installed: JsonObject = currentStatusLine
      ? { ...cloneJson(currentStatusLine), command: installedCommand }
      : { type: 'command', command: installedCommand };

    const backupPath = this.backupSettings(original);
    this.installBridge();

    const now = Date.now();
    const manifest: SpeedManifest = {
      version: 1,
      previous,
      installed,
      installedCommand,
      configDir: this.configDir,
      createdAt: existingManifest?.createdAt || now,
      updatedAt: now,
    };
    // Write the manifest first: if the settings write fails, the wrapper is not
    // active yet and retrying enable() is safe.
    this.writeManifest(manifest);
    settings.statusLine = installed;
    try {
      atomicWriteJson(this.settingsFile, settings, original);
    } catch (error) {
      // Roll the manifest back so an external reader never believes the wrapper
      // is installed when settings.json was not updated.
      try {
        if (existingManifest) this.writeManifest(existingManifest);
        else fs.unlinkSync(this.manifestPath);
      } catch {
        /* best-effort rollback */
      }
      throw error;
    }

    return { changed: true, installedCommand, backupPath };
  }

  /**
   * Restore the previous statusLine, but only when settings still contain the
   * exact configuration Hub installed. External edits are reported and left
   * untouched. Successful disable also removes cached samples so no stale speed
   * reading survives.
   */
  disable(): SpeedDisableResult {
    this.assertSafeWriteTarget();
    if (!fs.existsSync(this.settingsFile)) return { changed: false };

    const original = fs.readFileSync(this.settingsFile, 'utf8');
    const settings = readJsonObject(this.settingsFile);
    const manifest = readManifest(this.configDir);
    if (!manifest) {
      const current = settings.statusLine;
      if (
        isPlainObject(current) &&
        typeof current.command === 'string' &&
        commandReferencesBridge(current.command, this.bridgePath)
      ) {
        throw new Error(
          'The speed bridge is configured but its manifest is missing; refusing to guess the previous status line.',
        );
      }
      return { changed: false };
    }

    if (!deepEqualJson(settings.statusLine, manifest.installed)) {
      throw new Error(
        'The status line was changed outside Claude Hub; refusing to overwrite that change.',
      );
    }

    this.backupSettings(original);
    if (manifest.previous === null) delete settings.statusLine;
    else settings.statusLine = cloneJson(manifest.previous);
    atomicWriteJson(this.settingsFile, settings, original);

    try {
      fs.unlinkSync(this.manifestPath);
    } catch {
      /* already gone */
    }
    try {
      fs.rmSync(path.join(this.hubDir, 'samples'), { recursive: true, force: true });
    } catch {
      /* samples are only a cache */
    }
    return { changed: true };
  }
}
