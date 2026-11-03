function getVsCode(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('vscode');
  } catch {
    return null;
  }
}
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeConfigDirProvider, resolveClaudeConfigDir, resolveProjectMemoryDir } from './configDir.js';
import { TokenUsage } from './types.js';
import { formatCostForDisplay } from './modelPricing.js';

export interface McpServerInfo {
  name: string;
  command?: string;
  url?: string;
  isEnabled: boolean;
}

export interface SkillInfo {
  name: string;
  description: string;
  scope: 'global' | 'workspace' | 'plugin';
  filePath: string;
  pluginId?: string;
}

export interface PluginInfo {
  id: string;
  name: string;
  marketplace: string;
  version: string;
  scope: string;
  installPath: string;
  isEnabled: boolean;
  enabled: boolean;
  description?: string;
  skillsCount: number;
}

export interface CustomAgentInfo {
  name: string;
  description: string;
  model?: string;
  effort?: string;
  scope: 'global' | 'workspace' | 'plugin';
  filePath: string;
}

export type MemoryEntryType = 'user' | 'feedback' | 'project' | 'reference' | 'other';

export interface MemoryEntryInfo {
  slug: string;
  name: string;
  description: string;
  type: MemoryEntryType;
  filePath: string;
  modifiedAt?: string;
}

export interface ProjectMemoryInfo {
  memoryDir: string;
  indexFilePath: string;
  hasIndexFile: boolean;
  hasIndex: boolean;
  entries: MemoryEntryInfo[];
}

export interface CheckpointInfo {
  fileName: string;
  version: string;
  timestamp: Date;
  filePath: string;
  size: number;
}

export function parseFrontmatterFields(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) return result;
  const lines = match[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const kv = /^(\s*)([A-Za-z0-9_-]+)\s*:\s*(.*?)\s*$/.exec(rawLine);
    if (!kv) continue;
    const keyIndent = kv[1].length;
    const key = kv[2].trim();
    const rawVal = kv[3].trim();
    if (!key || result[key]) continue;

    // Handle YAML block scalar indicators: >, >-, >+, |, |-, |+
    if (/^[|>][-+]?$/.test(rawVal)) {
      const blockLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (/^\s*$/.test(nextLine)) {
          j++;
          continue;
        }
        const indentMatch = /^(\s*)/.exec(nextLine);
        const nextIndent = indentMatch ? indentMatch[1].length : 0;
        if (nextIndent <= keyIndent) break;
        blockLines.push(nextLine.trim());
        j++;
      }
      i = j - 1;
      const joined = blockLines.join(' ').trim();
      if (joined) {
        result[key] = joined;
      }
      continue;
    }

    if (!rawVal) continue;

    let val = rawVal.replace(/^['"]|['"]$/g, '').trim();
    // Handle multi-line folded continuation lines that are indented deeper and not key:value pairs
    let j = i + 1;
    while (j < lines.length) {
      const nextLine = lines[j];
      if (/^\s*$/.test(nextLine)) break;
      const indentMatch = /^(\s*)/.exec(nextLine);
      const nextIndent = indentMatch ? indentMatch[1].length : 0;
      if (nextIndent <= keyIndent) break;
      if (/^\s*[A-Za-z0-9_-]+\s*:/.test(nextLine)) break;
      val += ' ' + nextLine.trim().replace(/^['"]|['"]$/g, '');
      j++;
    }
    i = j - 1;

    if (val) {
      result[key] = val;
    }
  }
  return result;
}

export class ClaudeFeaturesManager {
  private readonly configDirProvider: ClaudeConfigDirProvider;

  constructor(configDirProvider?: ClaudeConfigDirProvider) {
    this.configDirProvider = configDirProvider ?? (() => resolveClaudeConfigDir());
  }

  private getConfigDir(): string {
    return this.configDirProvider();
  }

  public getMcpServers(): McpServerInfo[] {
    const configDir = this.getConfigDir();
    const servers: McpServerInfo[] = [];
    const disabledSet = new Set<string>();

    // 1. Read disabled servers from settings.json
    const settingsPath = path.join(configDir, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        if (Array.isArray(settings.disabledMcpServers)) {
          settings.disabledMcpServers.forEach((s: unknown) => {
            if (typeof s === 'string') disabledSet.add(s);
          });
        }
        if (settings.mcpServers && typeof settings.mcpServers === 'object') {
          for (const [name, cfg] of Object.entries(settings.mcpServers as Record<string, any>)) {
            servers.push({
              name,
              command: cfg.command,
              url: cfg.url,
              isEnabled: !disabledSet.has(name),
            });
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. Read from ~/.claude.json
    const claudeJsonPath = path.join(os.homedir(), '.claude.json');
    if (fs.existsSync(claudeJsonPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));
        if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
          for (const [name, cfg] of Object.entries(parsed.mcpServers as Record<string, any>)) {
            if (!servers.some((s) => s.name === name)) {
              servers.push({
                name,
                command: cfg.command,
                url: cfg.url,
                isEnabled: !disabledSet.has(name),
              });
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return servers;
  }

  public toggleMcpServer(name: string, enable: boolean): boolean {
    const settingsPath = path.join(this.getConfigDir(), 'settings.json');
    if (!fs.existsSync(settingsPath)) return false;

    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      const disabledList: string[] = Array.isArray(settings.disabledMcpServers)
        ? settings.disabledMcpServers.filter((s: unknown) => typeof s === 'string')
        : [];

      if (enable) {
        settings.disabledMcpServers = disabledList.filter((s) => s !== name);
      } else {
        if (!disabledList.includes(name)) {
          disabledList.push(name);
        }
        settings.disabledMcpServers = disabledList;
      }

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  public getPlugins(): PluginInfo[] {
    const configDir = this.getConfigDir();
    const plugins: PluginInfo[] = [];
    const enabledMap: Record<string, boolean> = {};

    const settingsPath = path.join(configDir, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        if (settings.enabledPlugins && typeof settings.enabledPlugins === 'object') {
          for (const [k, v] of Object.entries(settings.enabledPlugins)) {
            if (typeof v === 'boolean') {
              enabledMap[k] = v;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    const installedPath = path.join(configDir, 'plugins', 'installed_plugins.json');
    if (fs.existsSync(installedPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(installedPath, 'utf-8'));
        const map = parsed?.plugins && typeof parsed.plugins === 'object' ? parsed.plugins : {};
        for (const [pluginId, entries] of Object.entries(map as Record<string, any>)) {
          const item = Array.isArray(entries) && entries.length > 0 ? entries[0] : entries;
          if (!item || typeof item !== 'object') continue;
          const [rawName, rawMarket] = pluginId.split('@');
          const name = rawName || pluginId;
          const marketplace = rawMarket || 'local';
          const installPath = typeof item.installPath === 'string' ? item.installPath : '';
          const version = typeof item.version === 'string' ? item.version : '';
          const scope = typeof item.scope === 'string' ? item.scope : 'user';
          const isEnabled = pluginId in enabledMap ? enabledMap[pluginId] === true : true;
          const meta = this.readPluginMeta(installPath);
          plugins.push({
            id: pluginId,
            name,
            marketplace,
            version,
            scope,
            installPath,
            isEnabled,
            enabled: isEnabled,
            description: meta.description,
            skillsCount: meta.skillsCount,
          });
        }
      } catch {
        // ignore
      }
    }

    // Also include plugins configured in enabledPlugins even if installed_plugins.json is absent
    for (const [pluginId, enabled] of Object.entries(enabledMap)) {
      if (plugins.some((p) => p.id === pluginId)) continue;
      const [rawName, rawMarket] = pluginId.split('@');
      const isEnabled = enabled === true;
      plugins.push({
        id: pluginId,
        name: rawName || pluginId,
        marketplace: rawMarket || 'local',
        version: '',
        scope: 'user',
        installPath: '',
        isEnabled,
        enabled: isEnabled,
        skillsCount: 0,
      });
    }

    return plugins;
  }

  private readPluginMeta(installPath: string): { description?: string; skillsCount: number } {
    if (!installPath || !fs.existsSync(installPath)) {
      return { skillsCount: 0 };
    }
    let description: string | undefined;
    const manifestPath = path.join(installPath, '.claude-plugin', 'plugin.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        if (typeof manifest.description === 'string' && manifest.description.trim()) {
          description = manifest.description.trim();
        }
      } catch {
        // ignore
      }
    }
    const skillsCount = this.collectPluginSkills(installPath, 'plugin').length;
    return { description, skillsCount };
  }

  private collectPluginSkills(installPath: string, pluginName: string, pluginId?: string): SkillInfo[] {
    const out: SkillInfo[] = [];
    if (!installPath || !fs.existsSync(installPath)) return out;

    const skillsDir = path.join(installPath, 'skills');
    if (fs.existsSync(skillsDir)) {
      try {
        for (const dir of fs.readdirSync(skillsDir)) {
          const skillMd = path.join(skillsDir, dir, 'SKILL.md');
          if (fs.existsSync(skillMd)) {
            out.push({
              name: `${pluginName}:${dir}`,
              description: this.extractSkillDescription(skillMd),
              scope: 'plugin',
              filePath: skillMd,
              pluginId,
            });
          }
        }
      } catch {
        // ignore
      }
    }

    const commandsDir = path.join(installPath, 'commands');
    if (fs.existsSync(commandsDir)) {
      try {
        for (const file of fs.readdirSync(commandsDir)) {
          if (!file.toLowerCase().endsWith('.md')) continue;
          const full = path.join(commandsDir, file);
          const cmdName = file.slice(0, -3);
          const qualified = `${pluginName}:${cmdName}`;
          if (out.some((s) => s.name === qualified)) continue;
          out.push({
            name: qualified,
            description: this.extractSkillDescription(full),
            scope: 'plugin',
            filePath: full,
            pluginId,
          });
        }
      } catch {
        // ignore
      }
    }
    return out;
  }

  public togglePlugin(pluginId: string, enable: boolean): boolean {
    const configDir = this.getConfigDir();
    const settingsPath = path.join(configDir, 'settings.json');
    if (!fs.existsSync(configDir)) return false;

    try {
      let settings: Record<string, any> = {};
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      }
      if (!settings.enabledPlugins || typeof settings.enabledPlugins !== 'object') {
        settings.enabledPlugins = {};
      }
      settings.enabledPlugins[pluginId] = enable;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  public getSkills(): SkillInfo[] {
    const configDir = this.getConfigDir();
    const skills: SkillInfo[] = [];

    // 1. Global Skills in ~/.claude/skills/
    const globalSkillsDir = path.join(configDir, 'skills');
    if (fs.existsSync(globalSkillsDir)) {
      try {
        const dirs = fs.readdirSync(globalSkillsDir);
        for (const dir of dirs) {
          const fullPath = path.join(globalSkillsDir, dir);
          let stat: fs.Stats;
          try {
            stat = fs.statSync(fullPath);
            if (!stat.isDirectory()) continue;
          } catch {
            continue;
          }

          const skillMd = path.join(fullPath, 'SKILL.md');
          if (fs.existsSync(skillMd)) {
            const desc = this.extractSkillDescription(skillMd);
            skills.push({
              name: dir,
              description: desc,
              scope: 'global',
              filePath: skillMd,
            });
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. Workspace Skills in <ws>/.claude/skills/
    const wsFolders = getVsCode()?.workspace?.workspaceFolders || [];
    for (const ws of wsFolders) {
      const wsSkillsDir = path.join(ws.uri.fsPath, '.claude', 'skills');
      if (fs.existsSync(wsSkillsDir)) {
        try {
          const dirs = fs.readdirSync(wsSkillsDir);
          for (const dir of dirs) {
            const skillMd = path.join(wsSkillsDir, dir, 'SKILL.md');
            if (fs.existsSync(skillMd)) {
              const desc = this.extractSkillDescription(skillMd);
              skills.push({
                name: dir,
                description: desc,
                scope: 'workspace',
                filePath: skillMd,
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }

    // 3. Enabled Plugin Skills and Commands
    for (const plugin of this.getPlugins()) {
      if (!plugin.isEnabled || !plugin.installPath) continue;
      for (const skill of this.collectPluginSkills(plugin.installPath, plugin.name, plugin.id)) {
        if (!skills.some((s) => s.name === skill.name)) {
          skills.push(skill);
        }
      }
    }

    return skills;
  }

  public getCustomAgents(): CustomAgentInfo[] {
    const configDir = this.getConfigDir();
    const agents: CustomAgentInfo[] = [];

    const scanDir = (dirPath: string, scope: 'global' | 'workspace' | 'plugin', prefix = '') => {
      if (!fs.existsSync(dirPath)) return;
      try {
        for (const entry of fs.readdirSync(dirPath)) {
          if (!entry.toLowerCase().endsWith('.md')) continue;
          const fullPath = path.join(dirPath, entry);
          try {
            if (!fs.statSync(fullPath).isFile()) continue;
            const content = fs.readFileSync(fullPath, 'utf-8').slice(0, 2000);
            const fm = parseFrontmatterFields(content);
            const baseName = fm.name || entry.slice(0, -3);
            const name = prefix ? `${prefix}:${baseName}` : baseName;
            const description = fm.description || this.extractSkillDescription(fullPath);
            agents.push({
              name,
              description,
              model: fm.model,
              effort: fm.effort,
              scope,
              filePath: fullPath,
            });
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    };

    scanDir(path.join(configDir, 'agents'), 'global');
    const wsFolders = getVsCode()?.workspace?.workspaceFolders || [];
    for (const ws of wsFolders) {
      scanDir(path.join(ws.uri.fsPath, '.claude', 'agents'), 'workspace');
    }
    for (const plugin of this.getPlugins()) {
      if (!plugin.isEnabled || !plugin.installPath) continue;
      scanDir(path.join(plugin.installPath, 'agents'), 'plugin', plugin.name);
    }

    return agents;
  }

  public getProjectMemories(projectPath?: string, sessionFile?: string): ProjectMemoryInfo {
    const configDir = this.getConfigDir();
    let effectiveProjectPath = projectPath;
    if (!effectiveProjectPath) {
      const wsFolders = getVsCode()?.workspace?.workspaceFolders || [];
      if (wsFolders.length > 0) {
        effectiveProjectPath = wsFolders[0].uri.fsPath;
      }
    }

    const memoryDir = resolveProjectMemoryDir(configDir, effectiveProjectPath, sessionFile);
    const indexFilePath = path.join(memoryDir, 'MEMORY.md');
    const hasIndexFile = fs.existsSync(indexFilePath);
    const entries: MemoryEntryInfo[] = [];

    if (fs.existsSync(memoryDir)) {
      try {
        const files = fs.readdirSync(memoryDir);
        for (const file of files) {
          if (!file.toLowerCase().endsWith('.md') || file.toUpperCase() === 'MEMORY.MD') continue;
          const fullPath = path.join(memoryDir, file);
          try {
            const stat = fs.statSync(fullPath);
            if (!stat.isFile()) continue;
            const content = fs.readFileSync(fullPath, 'utf-8').slice(0, 2000);
            const fm = parseFrontmatterFields(content);
            const slug = file.slice(0, -3);
            const name = fm.name || slug;
            const description = fm.description || this.extractSkillDescription(fullPath);
            const rawType = (fm.type || '').toLowerCase();
            const type: MemoryEntryType =
              rawType === 'user' || rawType === 'feedback' || rawType === 'project' || rawType === 'reference'
                ? rawType
                : 'other';
            entries.push({
              slug,
              name,
              description,
              type,
              filePath: fullPath,
              modifiedAt: fm.modified || stat.mtime.toISOString(),
            });
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    return {
      memoryDir,
      indexFilePath,
      hasIndexFile,
      hasIndex: hasIndexFile,
      entries,
    };
  }

  public ensureMemoryIndexFile(memoryDir: string): string {
    fs.mkdirSync(memoryDir, { recursive: true });
    const indexFilePath = path.join(memoryDir, 'MEMORY.md');
    if (!fs.existsSync(indexFilePath)) {
      fs.writeFileSync(indexFilePath, '', 'utf-8');
    }
    return indexFilePath;
  }

  public createMemoryEntry(
    memoryDir: string,
    options: { slug?: string; name?: string; type?: MemoryEntryType; description: string; body?: string },
  ): string {
    fs.mkdirSync(memoryDir, { recursive: true });
    const rawSlug = options.slug || options.name || 'project-note';
    const cleanSlug = rawSlug
      .trim()
      .toLowerCase()
      .replace(/\.md$/i, '')
      .replace(/[^a-z0-9一-龥_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project-note';
    const type: MemoryEntryType = options.type || 'project';
    const desc = options.description.trim() || cleanSlug;
    const fileName = `${cleanSlug}.md`;
    const filePath = path.join(memoryDir, fileName);

    if (!fs.existsSync(filePath)) {
      const content = [
        '---',
        `name: ${cleanSlug}`,
        `description: ${desc}`,
        'metadata:',
        `  type: ${type}`,
        '---',
        '',
        options.body?.trim() || `${desc}`,
        '',
        '**Why:** 补充背景与原因说明。',
        '',
        '**How to apply:** 补充在后续任务中的应用方式。',
        '',
      ].join('\n');
      fs.writeFileSync(filePath, content, 'utf-8');
    }

    const indexPath = path.join(memoryDir, 'MEMORY.md');
    const pointerLine = `- [${cleanSlug}](${fileName}) — ${desc}`;
    let indexContent = '';
    if (fs.existsSync(indexPath)) {
      indexContent = fs.readFileSync(indexPath, 'utf-8');
    }
    if (!indexContent.includes(`(${fileName})`)) {
      const next = indexContent.trimEnd()
        ? `${indexContent.trimEnd()}\n${pointerLine}\n`
        : `${pointerLine}\n`;
      fs.writeFileSync(indexPath, next, 'utf-8');
    }

    return filePath;
  }

  public deleteMemoryEntry(filePath: string, memoryDir?: string): boolean {
    if (!filePath || !fs.existsSync(filePath)) return false;
    const fileName = path.basename(filePath);
    if (fileName.toUpperCase() === 'MEMORY.MD' || !fileName.toLowerCase().endsWith('.md')) {
      return false;
    }
    const dir = memoryDir || path.dirname(filePath);
    try {
      fs.unlinkSync(filePath);
    } catch {
      return false;
    }

    const indexPath = path.join(dir, 'MEMORY.md');
    if (fs.existsSync(indexPath)) {
      try {
        const raw = fs.readFileSync(indexPath, 'utf-8');
        const lines = raw.split(/\r?\n/);
        const targetToken = `(${fileName})`.toLowerCase();
        const filtered = lines.filter((line) => !line.toLowerCase().includes(targetToken));
        const nextContent = filtered.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
        fs.writeFileSync(indexPath, nextContent ? `${nextContent}\n` : '', 'utf-8');
      } catch {
        // ignore index update error if file already deleted
      }
    }
    return true;
  }

  public updateMemoryEntryMeta(
    filePath: string,
    updates: { name?: string; description?: string; type?: MemoryEntryType },
    memoryDir?: string,
  ): boolean {
    if (!filePath || !fs.existsSync(filePath)) return false;
    const fileName = path.basename(filePath);
    if (fileName.toUpperCase() === 'MEMORY.MD' || !fileName.toLowerCase().endsWith('.md')) {
      return false;
    }
    const dir = memoryDir || path.dirname(filePath);
    const slug = fileName.slice(0, -3);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fm = parseFrontmatterFields(content);
      const nextName = (updates.name ?? fm.name ?? slug).trim() || slug;
      const nextDesc = (updates.description ?? fm.description ?? nextName).trim() || nextName;
      const rawType = (updates.type ?? fm.type ?? 'project').toLowerCase();
      const nextType: MemoryEntryType =
        rawType === 'user' || rawType === 'feedback' || rawType === 'project' || rawType === 'reference'
          ? rawType
          : 'project';

      const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trimStart();
      const newFileContent = [
        '---',
        `name: ${nextName}`,
        `description: ${nextDesc}`,
        'metadata:',
        `  type: ${nextType}`,
        '---',
        '',
        body,
      ].join('\n');
      fs.writeFileSync(filePath, newFileContent, 'utf-8');

      const indexPath = path.join(dir, 'MEMORY.md');
      const pointerLine = `- [${nextName}](${fileName}) — ${nextDesc}`;
      const targetToken = `(${fileName})`.toLowerCase();
      if (fs.existsSync(indexPath)) {
        const indexRaw = fs.readFileSync(indexPath, 'utf-8');
        const lines = indexRaw.split(/\r?\n/);
        let replaced = false;
        const updatedLines = lines.map((line) => {
          if (line.toLowerCase().includes(targetToken)) {
            replaced = true;
            return pointerLine;
          }
          return line;
        });
        if (!replaced) {
          if (updatedLines.length > 0 && updatedLines[updatedLines.length - 1] === '') {
            updatedLines.splice(updatedLines.length - 1, 0, pointerLine);
          } else {
            updatedLines.push(pointerLine);
          }
        }
        const joined = updatedLines.join('\n').trimEnd();
        fs.writeFileSync(indexPath, joined ? `${joined}\n` : `${pointerLine}\n`, 'utf-8');
      } else {
        fs.writeFileSync(indexPath, `${pointerLine}\n`, 'utf-8');
      }
      return true;
    } catch {
      return false;
    }
  }

  public syncMemoryIndex(memoryDir: string): { added: number; removed: number; indexFilePath: string } {
    fs.mkdirSync(memoryDir, { recursive: true });
    const indexPath = path.join(memoryDir, 'MEMORY.md');
    const existingFiles = new Map<string, { name: string; description: string; fileName: string }>();

    try {
      for (const file of fs.readdirSync(memoryDir)) {
        if (!file.toLowerCase().endsWith('.md') || file.toUpperCase() === 'MEMORY.MD') continue;
        const fullPath = path.join(memoryDir, file);
        try {
          if (!fs.statSync(fullPath).isFile()) continue;
          const content = fs.readFileSync(fullPath, 'utf-8').slice(0, 2500);
          const fm = parseFrontmatterFields(content);
          const slug = file.slice(0, -3);
          const name = fm.name || slug;
          const description = fm.description || this.extractSkillDescription(fullPath);
          existingFiles.set(file.toLowerCase(), { name, description, fileName: file });
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    let removed = 0;
    let added = 0;
    const seenFiles = new Set<string>();
    const keptLines: string[] = [];

    if (fs.existsSync(indexPath)) {
      const raw = fs.readFileSync(indexPath, 'utf-8');
      for (const line of raw.split(/\r?\n/)) {
        const linkMatch = /\[[^\]]*\]\(([^)]+\.md)\)/i.exec(line);
        if (linkMatch) {
          const linkedFile = path.basename(linkMatch[1].trim()).toLowerCase();
          if (!existingFiles.has(linkedFile)) {
            removed++;
            continue;
          }
          seenFiles.add(linkedFile);
        }
        keptLines.push(line);
      }
    }

    while (keptLines.length > 0 && keptLines[keptLines.length - 1].trim() === '') {
      keptLines.pop();
    }

    for (const [lowerFile, info] of existingFiles.entries()) {
      if (!seenFiles.has(lowerFile)) {
        keptLines.push(`- [${info.name}](${info.fileName}) — ${info.description}`);
        added++;
      }
    }

    const nextContent = keptLines.join('\n').trimEnd();
    fs.writeFileSync(indexPath, nextContent ? `${nextContent}\n` : '', 'utf-8');
    return { added, removed, indexFilePath: indexPath };
  }

  private extractSkillDescription(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8').slice(0, 3000);
      const fm = parseFrontmatterFields(content);
      if (fm.description && !/^[|>][-+]?$/.test(fm.description.trim())) {
        return fm.description.replace(/\s+/g, ' ').slice(0, 120);
      }
      const descMatch = content.match(/<description>([\s\S]*?)<\/description>/i);
      if (descMatch) {
        return descMatch[1].trim().replace(/\s+/g, ' ').slice(0, 120);
      }
      const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
      const lines = body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
      return (lines[0] || 'Skill definition').slice(0, 100);
    } catch {
      return 'Skill definition';
    }
  }

  public getRecentCheckpoints(): CheckpointInfo[] {
    const configDir = this.getConfigDir();
    const checkpoints: CheckpointInfo[] = [];
    const historyDir = path.join(configDir, 'file-history');
    if (!fs.existsSync(historyDir)) return checkpoints;

    try {
      const sessionDirs = fs.readdirSync(historyDir);
      for (const sDir of sessionDirs.slice(-5)) {
        const fullDir = path.join(historyDir, sDir);
        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullDir);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }

        const files = fs.readdirSync(fullDir);
        for (const f of files) {
          const fPath = path.join(fullDir, f);
          try {
            const fStat = fs.statSync(fPath);
            const versionMatch = f.match(/@v(\d+)$/);
            const version = versionMatch ? ('v' + versionMatch[1]) : 'v1';
            const cleanName = f.replace(/@v\d+/, '');

            checkpoints.push({
              fileName: cleanName,
              version,
              timestamp: fStat.mtime,
              filePath: fPath,
              size: fStat.size,
            });
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }

    checkpoints.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return checkpoints.slice(0, 15);
  }

  public static calculateCost(tokenUsage: TokenUsage, model: string): string {
    return formatCostForDisplay(tokenUsage, model);
  }
}
