import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawnSync } from 'child_process';
import { isWithin } from './nativeTasks.js';

export const TASK_TOOL_ENV = 'CLAUDE_CODE_ENABLE_TODO_TOOLS';

type JsonObject = Record<string, any>;

export interface TaskIntegrationState {
  projectPath: string;
  configured: boolean;
  observed: boolean;
  conflict?: boolean;
}

export function readJsonObject(file: string): JsonObject {
  if (!fs.existsSync(file)) return {};
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid JSON object: ${file}`);
  return value;
}

export function atomicWriteJson(file: string, value: unknown, expected?: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    if (expected !== undefined && (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '') !== expected) {
      throw new Error('Configuration changed while saving; retry the operation.');
    }
    fs.renameSync(temp, file);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

export function resolveNodeExecutable(): string {
  const result = spawnSync('node', ['-p', 'process.execPath'], {
    encoding: 'utf8', timeout: 3000, windowsHide: true,
  });
  const executable = result.stdout?.trim();
  if (result.error || result.status !== 0 || !executable || !fs.existsSync(executable)) {
    throw new Error('Node.js was not found. Install Node.js 18+ before enabling task integration.');
  }
  return executable;
}

interface Ownership {
  projectPath: string;
  hadEnv: boolean;
  previousExists: boolean;
  previousValue?: unknown;
}

export class TaskIntegrationManager {
  private readonly bridgePath: string;

  constructor(
    public readonly storageDir: string,
    private readonly bundledBridge: string,
    private readonly configDir: () => string,
  ) {
    this.bridgePath = path.join(storageDir, 'task-bridge.cjs');
  }

  private ownershipFile(project: string): string {
    const key = crypto.createHash('sha256').update(path.resolve(project)).digest('hex');
    return path.join(this.storageDir, 'projects', `${key}.json`);
  }

  private settingsFile(project: string): string {
    return path.join(path.resolve(project), '.claude', 'settings.local.json');
  }

  private ownedHook(hook: any): boolean {
    return hook?.type === 'command' && Array.isArray(hook.command) && hook.command[1] === this.bridgePath;
  }

  private effectiveEnv(project: string): Record<string, unknown> {
    return {
      ...process.env,
      ...readJsonObject(path.join(this.configDir(), 'settings.json')).env,
      ...readJsonObject(path.join(project, '.claude', 'settings.json')).env,
      ...readJsonObject(this.settingsFile(project)).env,
    };
  }

  status(project: string, observed = false): TaskIntegrationState {
    try {
      const settings = readJsonObject(this.settingsFile(project));
      const env = this.effectiveEnv(project);
      const hooks = settings.hooks || {};
      const configured = settings.env?.[TASK_TOOL_ENV] === '1' &&
        ['SessionStart', 'UserPromptSubmit', 'PostToolUse'].every(event =>
          Array.isArray(hooks[event]) && hooks[event].some((group: any) =>
            Array.isArray(group.hooks) && group.hooks.some((h: any) => this.ownedHook(h))));
      return {
        projectPath: project, configured, observed,
        conflict: ['0', 'false'].includes(String(env.CLAUDE_CODE_ENABLE_TASKS).toLowerCase()) ||
          !!readJsonObject(path.join(this.configDir(), 'settings.json')).disableAllHooks ||
          !!settings.disableAllHooks ||
          !!readJsonObject(path.join(project, '.claude', 'settings.json')).disableAllHooks,
      };
    } catch { return { projectPath: project, configured: false, observed, conflict: true }; }
  }

  private checkWriteTarget(project: string): void {
    if (!fs.statSync(project).isDirectory()) throw new Error('Workspace folder does not exist.');
    for (const target of [path.join(project, '.claude'), this.settingsFile(project)]) {
      if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) {
        throw new Error('Task integration refuses to write through a symbolic link.');
      }
      if (!isWithin(project, target)) throw new Error('Settings path escaped the workspace.');
    }
  }

  enable(project: string, nodeExecutable = resolveNodeExecutable()): void {
    this.checkWriteTarget(project);
    const state = this.status(project);
    if (state.conflict) throw new Error('Tasks or Hooks are explicitly disabled. Resolve that setting before enabling task integration.');
    const file = this.settingsFile(project);
    const original = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const settings = readJsonObject(file);
    if (settings.env !== undefined && (!settings.env || typeof settings.env !== 'object' || Array.isArray(settings.env))) {
      throw new Error('The env setting must be an object.');
    }
    if (settings.hooks !== undefined && (!settings.hooks || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks))) {
      throw new Error('The hooks setting must be an object.');
    }
    fs.mkdirSync(this.storageDir, { recursive: true });
    // 稳定路径脱离扩展版本目录；资源必须随 VSIX 分发。
    const bridge = fs.readFileSync(this.bundledBridge);
    const bridgeTemp = `${this.bridgePath}.${crypto.randomUUID()}.tmp`;
    try { fs.writeFileSync(bridgeTemp, bridge); fs.renameSync(bridgeTemp, this.bridgePath); }
    finally { if (fs.existsSync(bridgeTemp)) fs.unlinkSync(bridgeTemp); }

    const ownFile = this.ownershipFile(project);
    if (!fs.existsSync(ownFile)) {
      atomicWriteJson(ownFile, {
        projectPath: project, hadEnv: settings.env !== undefined,
        previousExists: Object.prototype.hasOwnProperty.call(settings.env || {}, TASK_TOOL_ENV),
        previousValue: settings.env?.[TASK_TOOL_ENV],
      } satisfies Ownership);
    }
    settings.env = { ...settings.env, [TASK_TOOL_ENV]: '1' };
    settings.hooks = { ...settings.hooks };
    for (const event of ['SessionStart', 'UserPromptSubmit', 'PostToolUse']) {
      const previous = settings.hooks[event] ?? [];
      if (!Array.isArray(previous)) throw new Error(`Invalid Hook configuration: ${event}`);
      const groups = previous.map((group: any) => ({
        ...group,
        hooks: Array.isArray(group.hooks) ? group.hooks.filter((h: any) => !this.ownedHook(h)) : group.hooks,
      })).filter((group: any) => !Array.isArray(group.hooks) || group.hooks.length > 0);
      groups.push({
        ...(event === 'PostToolUse' ? { matcher: 'ExitPlanMode|TaskCreate|TaskUpdate|TodoWrite' } : {}),
        hooks: [{
          type: 'command',
          // exec-form 避免 Windows 路径和 shell 引号、环境变量展开问题。
          command: [nodeExecutable, this.bridgePath, '--storage', this.storageDir,
            '--project', path.resolve(project), '--config-dir', this.configDir()],
          timeout: 5,
        }],
      });
      settings.hooks[event] = groups;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (original) fs.writeFileSync(`${file}.claude-hub-${Date.now()}.bak`, original, { flag: 'wx' });
    atomicWriteJson(file, settings, original);
  }

  disable(project: string): void {
    this.checkWriteTarget(project);
    const file = this.settingsFile(project);
    if (!fs.existsSync(file)) return;
    const original = fs.readFileSync(file, 'utf8');
    const settings = readJsonObject(file);
    const ownFile = this.ownershipFile(project);
    const ownership = fs.existsSync(ownFile) ? readJsonObject(ownFile) as Ownership : undefined;
    if (settings.hooks && typeof settings.hooks === 'object') {
      for (const event of ['SessionStart', 'UserPromptSubmit', 'PostToolUse']) {
        if (!Array.isArray(settings.hooks[event])) continue;
        settings.hooks[event] = settings.hooks[event].map((g: any) => ({
          ...g, hooks: Array.isArray(g.hooks) ? g.hooks.filter((h: any) => !this.ownedHook(h)) : g.hooks,
        })).filter((g: any) => !Array.isArray(g.hooks) || g.hooks.length > 0);
        if (settings.hooks[event].length === 0) delete settings.hooks[event];
      }
      if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
    }
    if (ownership && settings.env?.[TASK_TOOL_ENV] === '1') {
      if (ownership.previousExists) settings.env[TASK_TOOL_ENV] = ownership.previousValue;
      else delete settings.env[TASK_TOOL_ENV];
      if (!ownership.hadEnv && Object.keys(settings.env).length === 0) delete settings.env;
    }
    fs.writeFileSync(`${file}.claude-hub-${Date.now()}.bak`, original, { flag: 'wx' });
    atomicWriteJson(file, settings, original);
    if (fs.existsSync(ownFile)) fs.unlinkSync(ownFile);
  }
}
