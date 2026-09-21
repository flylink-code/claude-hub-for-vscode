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
import { resolveClaudeConfigDir } from './configDir.js';
import { TokenUsage } from './types.js';

export interface McpServerInfo {
  name: string;
  command?: string;
  url?: string;
  isEnabled: boolean;
}

export interface SkillInfo {
  name: string;
  description: string;
  scope: 'global' | 'workspace';
  filePath: string;
}

export interface CheckpointInfo {
  fileName: string;
  version: string;
  timestamp: Date;
  filePath: string;
  size: number;
}

export class ClaudeFeaturesManager {
  private configDir: string;

  constructor() {
    this.configDir = resolveClaudeConfigDir();
  }

  public getMcpServers(): McpServerInfo[] {
    const servers: McpServerInfo[] = [];
    const disabledSet = new Set<string>();

    // 1. Read disabled servers from settings.json
    const settingsPath = path.join(this.configDir, 'settings.json');
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
    const settingsPath = path.join(this.configDir, 'settings.json');
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

  public getSkills(): SkillInfo[] {
    const skills: SkillInfo[] = [];

    // 1. Global Skills in ~/.claude/skills/
    const globalSkillsDir = path.join(this.configDir, 'skills');
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

    return skills;
  }

  private extractSkillDescription(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8').slice(0, 1500);
      const descMatch = content.match(/<description>([\s\S]*?)<\/description>/i);
      if (descMatch) {
        return descMatch[1].trim().replace(/\s+/g, ' ').slice(0, 120);
      }
      const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
      return (lines[0] || 'Skill definition').slice(0, 100);
    } catch {
      return 'Skill definition';
    }
  }

  public getRecentCheckpoints(): CheckpointInfo[] {
    const checkpoints: CheckpointInfo[] = [];
    const historyDir = path.join(this.configDir, 'file-history');
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
    const m = (model || '').toLowerCase();
    let inRate = 0.003; // Sonnet: $3 / Mtok
    let outRate = 0.015; // Sonnet: $15 / Mtok
    let cacheRate = 0.0003;

    if (m.includes('opus')) {
      inRate = 0.015;
      outRate = 0.075;
      cacheRate = 0.0015;
    } else if (m.includes('haiku')) {
      inRate = 0.0008;
      outRate = 0.004;
      cacheRate = 0.00008;
    }

    const cost =
      (tokenUsage.inputTokens / 1000) * inRate +
      (tokenUsage.outputTokens / 1000) * outRate +
      (tokenUsage.cacheReadTokens / 1000) * cacheRate;

    if (cost < 0.001) return '< $0.001';
    return `$${cost.toFixed(3)}`;
  }
}
