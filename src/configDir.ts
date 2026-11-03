import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export type ClaudeConfigDirProvider = () => string;

export function resolveClaudeConfigDir(customSetting?: string): string {
  const setting = (customSetting ?? '').trim();
  if (setting) {
    return expandHome(setting);
  }
  const envDir = process.env.CLAUDE_CONFIG_DIR?.trim();
  if (envDir) {
    return expandHome(envDir);
  }
  return path.join(os.homedir(), '.claude');
}

export function expandHome(p: string): string {
  const homedir = os.homedir();
  if (p === '~') {
    return homedir;
  }
  if (p.startsWith('~/') || p.startsWith('~\\')) {
    return path.join(homedir, p.slice(2));
  }
  return p;
}

export function getClaudeProjectsDir(configDir: string): string {
  return path.join(configDir, 'projects');
}

export function decodeProjectPath(encodedName: string): { name: string; fullPath: string } {
  let decoded = encodedName;
  if (decoded.startsWith('-')) {
    decoded = decoded.substring(1);
  }

  const parts = decoded.split('-').filter((p) => p.length > 0);
  let fullPath: string;
  let projectName: string;

  if (parts.length > 0 && parts[0].length === 1 && /[a-zA-Z]/.test(parts[0])) {
    fullPath = parts[0].toUpperCase() + ':\\' + parts.slice(1).join('\\');
    projectName = parts[parts.length - 1] || 'Unknown';
    if (parts.length >= 3) {
      const startIndex = Math.max(2, parts.length - 3);
      projectName = parts.slice(startIndex).join('-');
    }
  } else {
    fullPath = '/' + parts.join('/');
    projectName = parts[parts.length - 1] || 'Unknown';
    if (parts.length >= 3) {
      projectName = parts.slice(Math.max(2, parts.length - 3)).join('-');
    }
  }

  return { name: projectName, fullPath };
}

export function normalizePath(p: string): string {
  return path.resolve(p).replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');
}

export function isPathInWorkspace(targetPath: string, workspaceFolders: string[]): boolean {
  if (!targetPath || workspaceFolders.length === 0) {
    return false;
  }
  const normTarget = normalizePath(targetPath);
  return workspaceFolders.some((ws) => {
    const normWs = normalizePath(ws);
    return normTarget === normWs || normTarget.startsWith(normWs + '/');
  });
}

export function encodeProjectPath(projectPath: string): string {
  const trimmed = projectPath.trim().replace(/[\\/]+$/, '');
  if (!trimmed) return 'default';
  const winMatch = /^([a-zA-Z]):[\\/](.*)$/.exec(trimmed);
  if (winMatch) {
    const drive = winMatch[1].toLowerCase();
    const rest = winMatch[2].replace(/[\\/_.:]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return rest ? `${drive}--${rest}` : `${drive}--`;
  }
  const unixRest = trimmed.replace(/^\/+/, '').replace(/[\\/_.:]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return unixRest ? `-${unixRest}` : '-root';
}

export function resolveProjectMemoryDir(
  configDir: string,
  projectPath?: string,
  sessionFile?: string,
): string {
  const projectsDir = getClaudeProjectsDir(configDir);
  if (sessionFile) {
    const sessionDir = path.dirname(sessionFile);
    if (normalizePath(path.dirname(sessionDir)) === normalizePath(projectsDir)) {
      return path.join(sessionDir, 'memory');
    }
  }

  if (projectPath) {
    const encoded = encodeProjectPath(projectPath);
    if (fs.existsSync(projectsDir)) {
      try {
        const dirs = fs.readdirSync(projectsDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
        const exact = dirs.find((d) => d.toLowerCase() === encoded.toLowerCase());
        if (exact) {
          return path.join(projectsDir, exact, 'memory');
        }
        const normTarget = normalizePath(projectPath);
        const matched = dirs.find((d) => normalizePath(decodeProjectPath(d).fullPath) === normTarget);
        if (matched) {
          return path.join(projectsDir, matched, 'memory');
        }
      } catch {
        // ignore read error
      }
    }
    return path.join(projectsDir, encoded, 'memory');
  }

  return path.join(projectsDir, 'default', 'memory');
}

