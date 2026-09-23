import * as fs from 'fs';
import * as path from 'path';
import { resolveClaudeConfigDir, getClaudeProjectsDir } from './configDir.js';

function getVsCode(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('vscode');
  } catch {
    return null;
  }
}

export interface DiscoveredModel {
  id: string;
  title: string;
  subtitle: string;
  aliases: string[];
  isCurrentSession?: boolean;
}

export interface ClaudeSettings {
  model?: string;
  effortLevel?: 'low' | 'medium' | 'high' | 'max' | 'ultracode' | string;
  permissions?: {
    allow?: string[];
    defaultMode?: 'auto' | 'ask' | 'allow' | string;
    [key: string]: unknown;
  };
  skipWebFetchPreflight?: boolean;
  language?: string;
  env?: {
    ANTHROPIC_BASE_URL?: string;
    ANTHROPIC_AUTH_TOKEN?: string;
    ANTHROPIC_DEFAULT_OPUS_MODEL_NAME?: string;
    ANTHROPIC_DEFAULT_FABLE_MODEL_NAME?: string;
    ANTHROPIC_DEFAULT_SONNET_MODEL_NAME?: string;
    ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME?: string;
    [key: string]: unknown;
  };
  modelSettings?: Record<string, { effortLevel?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export function cleanModelKey(rawKey: string): string {
  if (!rawKey) return '';
  const trimmed = rawKey.trim();
  if (trimmed.toLowerCase() === 'claude.auto' || trimmed.toLowerCase() === 'auto') {
    return 'auto';
  }
  const multiDotMatch = /^claude\.[^.]+\.(.+)$/.exec(trimmed);
  if (multiDotMatch && multiDotMatch[1]) {
    return multiDotMatch[1];
  }
  if (trimmed.startsWith('claude.')) {
    return trimmed.slice(7);
  }
  if (trimmed.startsWith('claude-')) {
    return trimmed.slice(7);
  }
  return trimmed;
}

export function matchModel(candidate: string | undefined, models: DiscoveredModel[]): DiscoveredModel | undefined {
  if (!candidate) return undefined;
  const candLower = candidate.toLowerCase().trim();

  // 1. Exact ID or Title match
  let found = models.find((m) => m.id.toLowerCase() === candLower || m.title.toLowerCase() === candLower);
  if (found) return found;

  // 2. Alias match
  found = models.find((m) => m.aliases && m.aliases.some((a) => a.toLowerCase() === candLower));
  if (found) return found;

  // 3. Substring match
  found = models.find((m) => m.aliases && m.aliases.some((a) => candLower.includes(a) || a.includes(candLower)));
  return found;
}

export class ClaudeConfigManager {
  private _onDidChange: any;
  public readonly onDidChange: any;
  private settingsWatcher: fs.FSWatcher | null = null;
  private gatewayWatcher: fs.FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    const vsc = getVsCode();
    if (vsc?.EventEmitter) {
      this._onDidChange = new vsc.EventEmitter();
      this.onDidChange = this._onDidChange.event;
    } else {
      const listeners: Array<(e: any) => void> = [];
      this.onDidChange = (cb: (e: any) => void) => {
        listeners.push(cb);
        return { dispose: () => {} };
      };
      this._onDidChange = {
        fire: (val: any) => listeners.forEach((cb) => cb(val)),
      };
    }

    this.initSettingsWatcher();
    this.initGatewayWatcher();
  }

  public getSettingsPath(): string {
    const configDir = resolveClaudeConfigDir();
    return path.join(configDir, 'settings.json');
  }

  public getGatewayModelsPath(): string {
    const configDir = resolveClaudeConfigDir();
    return path.join(configDir, 'cache', 'gateway-models.json');
  }

  private initSettingsWatcher(): void {
    const filePath = this.getSettingsPath();
    if (!fs.existsSync(filePath)) return;

    try {
      this.settingsWatcher = fs.watch(filePath, (_event) => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this._onDidChange.fire(this.getClaudeSettings());
        }, 150);
      });
      if (typeof this.settingsWatcher.unref === 'function') {
        this.settingsWatcher.unref();
      }
    } catch {
      // ignore watch failures
    }
  }

  private initGatewayWatcher(): void {
    const filePath = this.getGatewayModelsPath();
    if (!fs.existsSync(filePath)) return;

    try {
      this.gatewayWatcher = fs.watch(filePath, (_event) => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this._onDidChange.fire(this.getClaudeSettings());
        }, 150);
      });
      if (typeof this.gatewayWatcher.unref === 'function') {
        this.gatewayWatcher.unref();
      }
    } catch {
      // ignore watch failures
    }
  }

  public getGatewayModels(): Array<{ id: string; display_name: string }> {
    const filePath = this.getGatewayModelsPath();
    if (!fs.existsSync(filePath)) return [];
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed?.models)) {
        return parsed.models.filter(
          (m: any) => m && typeof m.id === 'string' && typeof m.display_name === 'string',
        );
      }
    } catch {
      // ignore
    }
    return [];
  }

  public getGatewayModelMap(): Map<string, string> {
    const map = new Map<string, string>();
    const list = this.getGatewayModels();
    for (const item of list) {
      map.set(item.id, item.display_name);
      map.set(item.id.toLowerCase(), item.display_name);
      const clean = cleanModelKey(item.id);
      if (clean) {
        map.set(clean, item.display_name);
        map.set(clean.toLowerCase(), item.display_name);
      }
    }
    return map;
  }

  public getConfiguredModel(): string | undefined {
    const settings = this.getClaudeSettings();
    const env = settings.env || {};
    const candidate = settings.model || env.ANTHROPIC_MODEL;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    return undefined;
  }

  public getClaudeSettings(): ClaudeSettings {
    const filePath = this.getSettingsPath();
    if (!fs.existsSync(filePath)) {
      return {};
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as ClaudeSettings;
    } catch (err) {
      console.error('[Claude Hub] Failed to read Claude settings.json:', err);
      return {};
    }
  }

  /**
   * Dynamically inspect settings.json (env, modelSettings, proxy names)
   * and build the exact model list matching Image 3 and current provider configurations.
   */
  public getDiscoveredModels(activeSessionModel?: string): DiscoveredModel[] {
    const settings = this.getClaudeSettings();
    const env = settings.env || {};
    const models: DiscoveredModel[] = [];

    // 1. Default (recommended)
    const currentModelName =
      env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME || settings.model || 'Opus 5 (1M context)';
    models.push({
      id: 'default',
      title: 'Default (recommended)',
      subtitle: `Use the default model (currently ${currentModelName}) · $5/$25 per Mtok`,
      aliases: ['default', 'recommended'],
    });

    // 2. Models from env proxy definitions (as in Image 3)
    if (env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME) {
      models.push({
        id: 'opus',
        title: env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME,
        subtitle: 'Custom Opus model',
        aliases: ['opus', 'claude-opus', 'claude-opus-5', env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME.toLowerCase()],
      });
    }

    if (env.ANTHROPIC_DEFAULT_FABLE_MODEL_NAME) {
      models.push({
        id: 'fable',
        title: env.ANTHROPIC_DEFAULT_FABLE_MODEL_NAME,
        subtitle: 'Custom Fable model',
        aliases: ['fable', 'claude-fable-5', env.ANTHROPIC_DEFAULT_FABLE_MODEL_NAME.toLowerCase()],
      });
    }

    if (env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME) {
      models.push({
        id: 'sonnet',
        title: env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME,
        subtitle: 'Custom Sonnet model',
        aliases: ['sonnet', 'claude-sonnet', 'claude-sonnet-5', env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME.toLowerCase()],
      });
    }

    if (env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME) {
      models.push({
        id: 'haiku',
        title: env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME,
        subtitle: 'Custom Haiku model',
        aliases: ['haiku', 'claude-haiku', 'claude-haiku-4-5', env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME.toLowerCase()],
      });
    }

    // 3. Models from modelSettings
    if (settings.modelSettings && typeof settings.modelSettings === 'object') {
      for (const rawKey of Object.keys(settings.modelSettings)) {
        const cleanName = cleanModelKey(rawKey);
        if (!models.some((m) => m.id === cleanName || m.title === cleanName || m.aliases.includes(cleanName.toLowerCase()))) {
          models.push({
            id: cleanName,
            title: cleanName,
            subtitle: `Provider model (${cleanName})`,
            aliases: [cleanName.toLowerCase(), rawKey.toLowerCase()],
          });
        }
      }
    }

    // 4. Models from gateway-models.json
    const gwModels = this.getGatewayModels();
    for (const gm of gwModels) {
      const cleanName = cleanModelKey(gm.id);
      if (!models.some((m) => m.id === cleanName || m.id === gm.id || m.title === gm.display_name)) {
        models.push({
          id: cleanName || gm.id,
          title: gm.display_name,
          subtitle: `From gateway (${gm.id})`,
          aliases: [gm.id.toLowerCase(), cleanName.toLowerCase(), gm.display_name.toLowerCase()],
        });
      }
    }

    // 5. Standard Claude fallback models (if no custom env models were detected)
    if (models.length <= 1) {
      models.push(
        {
          id: 'claude-3-7-sonnet-20250219',
          title: 'Claude 3.7 Sonnet',
          subtitle: 'Hybrid reasoning and high-speed coding (1M / 200K)',
          aliases: ['claude-3-7-sonnet', 'sonnet-3.7', '3.7-sonnet'],
        },
        {
          id: 'claude-3-5-sonnet-20241022',
          title: 'Claude 3.5 Sonnet',
          subtitle: 'Previous generation coding frontier model',
          aliases: ['claude-3-5-sonnet', 'sonnet-3.5', '3.5-sonnet'],
        },
        {
          id: 'claude-3-5-haiku-20241022',
          title: 'Claude 3.5 Haiku',
          subtitle: 'Fast, lightweight, efficient for small edits',
          aliases: ['claude-3-5-haiku', 'haiku-3.5', '3.5-haiku'],
        },
        {
          id: 'opus',
          title: 'Claude Opus',
          subtitle: 'Deep research, complex reasoning and synthesis',
          aliases: ['opus', 'claude-3-opus', 'claude-opus'],
        },
      );
    }

    // 5. Check if active conversation uses a model not yet in list
    if (activeSessionModel) {
      const matched = matchModel(activeSessionModel, models);
      if (matched) {
        matched.isCurrentSession = true;
      } else {
        models.splice(1, 0, {
          id: activeSessionModel,
          title: activeSessionModel,
          subtitle: '当前对话实际使用模型 (Active Session Model)',
          aliases: [activeSessionModel.toLowerCase()],
          isCurrentSession: true,
        });
      }
    }

    return models;
  }

  public async updateClaudeSettings(patch: {
    model?: string;
    effortLevel?: string;
    defaultMode?: string;
    apiBaseUrl?: string;
    skipWebFetchPreflight?: boolean;
    language?: string;
  }): Promise<boolean> {
    const filePath = this.getSettingsPath();
    let current: ClaudeSettings = {};

    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        current = JSON.parse(content) as ClaudeSettings;
        fs.writeFileSync(`${filePath}.bak`, content, 'utf-8');
      }

      if (patch.model !== undefined) {
        current.model = patch.model;
      }
      if (patch.effortLevel !== undefined) {
        current.effortLevel = patch.effortLevel;
      }
      if (patch.defaultMode !== undefined) {
        current.permissions = current.permissions || {};
        current.permissions.defaultMode = patch.defaultMode;
      }
      if (patch.skipWebFetchPreflight !== undefined) {
        current.skipWebFetchPreflight = patch.skipWebFetchPreflight;
      }
      if (patch.language !== undefined) {
        current.language = patch.language;
      }
      if (patch.apiBaseUrl !== undefined) {
        current.env = current.env || {};
        if (patch.apiBaseUrl.trim()) {
          current.env.ANTHROPIC_BASE_URL = patch.apiBaseUrl.trim();
        } else {
          delete current.env.ANTHROPIC_BASE_URL;
        }
      }

      const parentDir = path.dirname(filePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
      this._onDidChange.fire(current);
      return true;
    } catch (err) {
      console.error('[Claude Hub] Failed to update Claude settings.json:', err);
      return false;
    }
  }

  public async openSettingsFile(): Promise<void> {
    const vsc = getVsCode();
    const filePath = this.getSettingsPath();
    if (!fs.existsSync(filePath)) {
      const parentDir = path.dirname(filePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(filePath, '{\n  "model": "claude-3-7-sonnet-20250219"\n}\n', 'utf-8');
    }
    if (vsc) {
      const doc = await vsc.workspace.openTextDocument(vsc.Uri.file(filePath));
      await vsc.window.showTextDocument(doc);
    }
  }

  public async openClaudeMdFile(): Promise<void> {
    const vsc = getVsCode();
    if (!vsc) return;
    const wsFolders = vsc.workspace.workspaceFolders;
    if (!wsFolders || wsFolders.length === 0) {
      vsc.window.showWarningMessage('No workspace open to locate CLAUDE.md');
      return;
    }
    const claudeMdPath = path.join(wsFolders[0].uri.fsPath, 'CLAUDE.md');
    if (!fs.existsSync(claudeMdPath)) {
      fs.writeFileSync(
        claudeMdPath,
        `# CLAUDE.md\n\nGuidelines for Claude Code working on this project.\n\n## Build & Test\n\n`,
        'utf-8',
      );
    }
    const doc = await vsc.workspace.openTextDocument(vsc.Uri.file(claudeMdPath));
    await vsc.window.showTextDocument(doc);
  }

  public cleanHistoricalSessions(olderThanDays = 3): number {
    const configDir = resolveClaudeConfigDir();
    const projectsDir = getClaudeProjectsDir(configDir);
    if (!fs.existsSync(projectsDir)) return 0;

    const cutoffMs = Date.now() - olderThanDays * 24 * 3600 * 1000;
    let deletedCount = 0;

    try {
      const pDirs = fs.readdirSync(projectsDir);
      for (const pDir of pDirs) {
        const fullDir = path.join(projectsDir, pDir);
        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullDir);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }

        const files = fs.readdirSync(fullDir).filter((f) => f.endsWith('.jsonl'));
        for (const f of files) {
          const fPath = path.join(fullDir, f);
          try {
            const fStat = fs.statSync(fPath);
            if (fStat.mtimeMs < cutoffMs) {
              fs.unlinkSync(fPath);
              deletedCount++;
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error('[Claude Hub] Error cleaning historical sessions:', err);
    }

    return deletedCount;
  }

  public dispose(): void {
    if (this.settingsWatcher) {
      try {
        this.settingsWatcher.close();
      } catch {
        // ignore
      }
      this.settingsWatcher = null;
    }
    if (this.gatewayWatcher) {
      try {
        this.gatewayWatcher.close();
      } catch {
        // ignore
      }
      this.gatewayWatcher = null;
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }
}
