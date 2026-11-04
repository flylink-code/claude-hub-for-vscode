import * as fs from 'fs';
import * as path from 'path';
import { expandHome } from './configDir.js';

function readSettings(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`无效的 Claude Code 配置：${filePath}`);
  }
  return parsed as Record<string, unknown>;
}

/** 按原生配置优先级读取记忆目录，不将相对路径误当成绝对路径。 */
export function getConfiguredMemoryDir(configDir: string, projectPath?: string): string | undefined {
  const files = [path.join(configDir, 'settings.json')];
  if (projectPath) {
    files.push(path.join(projectPath, '.claude', 'settings.json'));
    files.push(path.join(projectPath, '.claude', 'settings.local.json'));
  }
  let directory: string | undefined;
  for (const file of files) {
    let value: unknown;
    try {
      value = readSettings(file).autoMemoryDirectory;
    } catch {
      // 无效配置不参与目录解析；写入时仍严格校验，避免覆盖损坏文件。
      continue;
    }
    if (typeof value !== 'string' || !value.trim()) continue;
    const expanded = expandHome(value.trim());
    if (path.isAbsolute(expanded)) directory = expanded;
  }
  return directory;
}

/** 仅为可信工作区调用；合并原生配置，保留用户自定义路径及其他设置。 */
export function syncWorkspaceMemoryDir(configDir: string, workspacePath: string, enabled: boolean): boolean {
  const localFile = path.join(workspacePath, '.claude', 'settings.local.json');
  const local = readSettings(localFile);
  const workspaceMemory = path.join(workspacePath, '.claude', 'memory');
  if (!enabled) {
    // 只撤销插件约定的工作区路径，不删除记忆文件，也不改动其他自定义目录。
    if (typeof local.autoMemoryDirectory !== 'string' ||
        path.resolve(expandHome(local.autoMemoryDirectory)) !== path.resolve(workspaceMemory)) return false;
    delete local.autoMemoryDirectory;
  } else {
    if (getConfiguredMemoryDir(configDir, workspacePath)) return false;
    local.autoMemoryDirectory = workspaceMemory;
  }
  fs.mkdirSync(path.dirname(localFile), { recursive: true });
  fs.writeFileSync(localFile, JSON.stringify(local, null, 2) + '\n', 'utf-8');
  return true;
}
