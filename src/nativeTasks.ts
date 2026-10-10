import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TodoItem, TaskSource, SessionPlan } from './types.js';

export function taskSnapshot(source: string, listId: string | undefined, items: TodoItem[]): string {
  return crypto.createHash('sha256')
    .update(JSON.stringify({ source, listId, items }))
    .digest('hex');
}


/**
 * Merge disk plan snapshot into session todos.
 * Checklist on disk wins for none|plan|markdown; non-checklist phases keep parser todos
 * when taskSource is already plan. Never overrides tasks/todoWrite/native.
 */
export function mergeDiskPlanTodos(
  taskSource: TaskSource,
  parsedTodos: TodoItem[],
  diskPlan: SessionPlan,
): { todos: TodoItem[]; taskSource: TaskSource; plan: SessionPlan } {
  if (!['none', 'plan', 'markdown'].includes(taskSource)) {
    return { todos: parsedTodos, taskSource, plan: diskPlan };
  }
  if (diskPlan.isChecklist) {
    return { todos: diskPlan.items, taskSource: 'markdown', plan: diskPlan };
  }
  if (taskSource === 'plan' && parsedTodos.length > 0) {
    return { todos: parsedTodos, taskSource: 'plan', plan: diskPlan };
  }
  return { todos: diskPlan.items, taskSource: 'plan', plan: diskPlan };
}

export function isSafeId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9_.-]{1,128}$/.test(id) && id !== '.' && id !== '..';
}

export function isWithin(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

// 解析 realpath，避免任务列表或计划文件通过符号链接逃出配置目录。
export function isRealPathWithin(root: string, target: string): boolean {
  try {
    return isWithin(fs.realpathSync(root), fs.realpathSync(target));
  } catch {
    return false;
  }
}

export function isAllowedPlanPath(configDir: string, projectPath: string, file: string): boolean {
  if (!file || !path.isAbsolute(file) || !/\.md$/i.test(file)) return false;
  return [path.join(configDir, 'plans'), path.join(projectPath, '.claude', 'plans')]
    .some(root => isWithin(root, file) && isRealPathWithin(root, file));
}

export interface NativeTaskSnapshot {
  exists: boolean;
  valid: boolean;
  items: TodoItem[];
}

export class NativeTaskReader {
  private cache = new Map<string, TodoItem[]>();

  read(configDir: string, listId: string): NativeTaskSnapshot {
    if (!isSafeId(listId)) return { exists: false, valid: false, items: [] };
    const root = path.join(configDir, 'tasks');
    const dir = path.join(root, listId);
    if (!fs.existsSync(dir) || !isRealPathWithin(root, dir)) {
      this.cache.delete(dir);
      return { exists: false, valid: false, items: [] };
    }
    try {
      const items: TodoItem[] = [];
      let invalid = false;
      for (const name of fs.readdirSync(dir).filter(n => n.endsWith('.json') && !n.startsWith('.')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
        const file = path.join(dir, name);
        if (!isRealPathWithin(dir, file)) { invalid = true; continue; }
        try {
          const item = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (!isSafeId(item.id) || typeof item.subject !== 'string' ||
              !['pending', 'in_progress', 'completed', 'deleted'].includes(item.status)) {
            invalid = true;
            continue;
          }
          if (item.status === 'deleted') continue;
          items.push({
            id: item.id, content: item.subject, status: item.status,
            description: typeof item.description === 'string' ? item.description : undefined,
            blockedBy: Array.isArray(item.blockedBy) ? item.blockedBy.filter(isSafeId) : [],
            blocks: Array.isArray(item.blocks) ? item.blocks.filter(isSafeId) : [],
          });
        } catch { invalid = true; }
      }
      // 原子替换中的短暂坏 JSON 不应导致任务闪烁或回退到另一来源。
      if (invalid) {
        const previous = this.cache.get(dir);
        return { exists: true, valid: previous !== undefined, items: previous ?? [] };
      }
      this.cache.set(dir, items);
      return { exists: true, valid: true, items };
    } catch {
      const previous = this.cache.get(dir);
      return { exists: true, valid: previous !== undefined, items: previous ?? [] };
    }
  }

  clear(): void { this.cache.clear(); }
}

export interface TaskAssociation {
  sessionId: string;
  projectPath: string;
  taskListId?: string;
  planPath?: string;
  taskObservedAt?: number;
}

export function readTaskAssociation(storageDir: string, sessionId: string, projectPath: string): TaskAssociation | undefined {
  if (!isSafeId(sessionId)) return undefined;
  const root = path.join(storageDir, 'sessions');
  const file = path.join(root, `${sessionId}.json`);
  if (!isRealPathWithin(root, file)) return undefined;
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (value.sessionId !== sessionId || typeof value.projectPath !== 'string' ||
        path.resolve(value.projectPath).toLowerCase() !== path.resolve(projectPath).toLowerCase()) return undefined;
    return {
      sessionId, projectPath,
      taskListId: isSafeId(value.taskListId) ? value.taskListId : undefined,
      planPath: typeof value.planPath === 'string' ? value.planPath : undefined,
      taskObservedAt: typeof value.taskObservedAt === 'number' ? value.taskObservedAt : undefined,
    };
  } catch { return undefined; }
}

export function listTaskLists(configDir: string): string[] {
  const root = path.join(configDir, 'tasks');
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter(e => e.isDirectory() && isSafeId(e.name) && isRealPathWithin(root, path.join(root, e.name)))
      .map(e => e.name).sort();
  } catch { return []; }
}

// 每次刷新重新计算最近存在的祖先目录，支持 tasks/ 或计划目录晚创建。
export class TaskDataWatcher {
  private watchers = new Map<string, fs.FSWatcher>();

  constructor(private readonly onChange: () => void) {}

  refresh(configDir: string, storageDir: string, planPaths: string[]): void {
    const wanted = new Map<string, { dir: string; recursive: boolean }>();
    const add = (target: string, recursive: boolean) => {
      let dir = path.resolve(target);
      while (!fs.existsSync(dir)) {
        const parent = path.dirname(dir);
        if (parent === dir) return;
        dir = parent;
        recursive = false;
      }
      wanted.set(`${recursive}:${dir}`, { dir, recursive });
    };
    add(path.join(configDir, 'tasks'), true);
    add(path.join(storageDir, 'sessions'), true);
    for (const file of planPaths) add(path.dirname(file), false);
    for (const [key, watcher] of this.watchers) {
      if (!wanted.has(key)) { watcher.close(); this.watchers.delete(key); }
    }
    for (const [key, spec] of wanted) {
      if (this.watchers.has(key)) continue;
      try {
        const watcher = fs.watch(spec.dir, { recursive: spec.recursive }, (_event, filename) => {
          const name = filename == null ? '' : String(filename);
          if (!name || name.endsWith('.json') || name.endsWith('.md') || !path.extname(name)) this.onChange();
        });
        watcher.on('error', () => {
          watcher.close();
          this.watchers.delete(key);
          this.onChange();
        });
        this.watchers.set(key, watcher);
      } catch {
        // Node 18 在部分系统不支持递归 watch，退回每个列表目录。
        if (spec.recursive) {
          wanted.delete(key);
          add(spec.dir, false);
          try {
            for (const e of fs.readdirSync(spec.dir, { withFileTypes: true })) {
              if (e.isDirectory()) add(path.join(spec.dir, e.name), false);
            }
          } catch { /* 定时扫描仍会重试 */ }
        }
      }
    }
  }

  dispose(): void {
    for (const watcher of this.watchers.values()) watcher.close();
    this.watchers.clear();
  }
}
