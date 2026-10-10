import * as fs from 'fs';
import * as path from 'path';

/** Allowlisted project-doc todo preferences (AGENTS.md / CLAUDE.md). */
export type PreferSource = 'auto' | 'tasks' | 'checklist' | 'todoWrite';
export type PlanChecklistMode = 'required' | 'preferred' | 'optional';
export type SyncPromptStyle = 'verify' | 'brief' | 'custom';

export interface ProjectTodoPolicy {
  sourceFile?: 'AGENTS.md' | 'CLAUDE.md';
  sourcePath?: string;
  prefer_source?: PreferSource;
  plan_checklist?: PlanChecklistMode;
  sync_prompt_style?: SyncPromptStyle;
  warn_plan_without_checklist?: boolean;
  activity_separate_from_status?: boolean;
  sync_prompt_custom_zh?: string;
  sync_prompt_custom_en?: string;
}

export const PROJECT_TODO_DOC_MAX_BYTES = 512 * 1024;
export const PROJECT_TODO_PROMPT_MAX_CHARS = 8 * 1024;

const SECTION_RE =
  /^#{1,3}\s+Claude Hub\s*[\u2014\u2013\-]\s*Task Tracking(?:\s*\/\s*\u4efb\u52a1\u8ffd\u8e2a)?\s*$/im;
const SECTION_RE_ZH = /^#{1,3}\s+.*Claude Hub.*\u4efb\u52a1\u8ffd\u8e2a.*$/im;

const PREFER_SOURCES = new Set<PreferSource>(['auto', 'tasks', 'checklist', 'todoWrite']);
const PLAN_CHECKLISTS = new Set<PlanChecklistMode>(['required', 'preferred', 'optional']);
const SYNC_STYLES = new Set<SyncPromptStyle>(['verify', 'brief', 'custom']);

interface CacheEntry {
  mtimeMs: number;
  size: number;
  policy: ProjectTodoPolicy | undefined;
}

const fileCache = new Map<string, CacheEntry>();

const VERIFY_PROMPT_ZH =
  '请核对本会话执行计划各阶段的实际进度和验证结果，先检查已有任务，避免重复创建。可用 TaskCreate/TaskUpdate/TaskList 时，记录真实的 pending、in_progress、completed；仅在验证后标记 completed。若任务工具不可用，请明确说明当前阶段和证据；若计划文件可编辑，可在核验后更新其中的 checklist 状态。不要仅凭 Agent 结束推断阶段完成。';
const VERIFY_PROMPT_EN =
  "Check actual progress and verification for each phase of this session's plan. Inspect existing tasks before creating new ones. If TaskCreate/TaskUpdate are available, record genuine pending, in_progress, and completed states; mark completed only after verification. Otherwise report the current phase and evidence, and update the plan checklist after verification if the plan file is editable. Do not infer phase completion from an Agent finishing.";
const BRIEF_PROMPT_ZH =
  '请根据执行计划同步任务状态：先查已有任务，用 TaskCreate/TaskUpdate/TaskList 记录真实进度；仅在验证后标记 completed；不要因 Agent 结束就推断完成。';
const BRIEF_PROMPT_EN =
  'Sync task status from the plan: inspect existing tasks, use TaskCreate/TaskUpdate/TaskList for real progress, mark completed only after verification, and do not infer completion from an Agent finishing.';

function truncatePrompt(value: string): string {
  if (value.length <= PROJECT_TODO_PROMPT_MAX_CHARS) return value;
  return value.slice(0, PROJECT_TODO_PROMPT_MAX_CHARS);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Validate allowlisted keys from a parsed JSON object. Unknown keys ignored. */
export function normalizeTodoConfigObject(raw: unknown): ProjectTodoPolicy {
  if (!isPlainObject(raw)) return {};
  const out: ProjectTodoPolicy = {};
  if (typeof raw.prefer_source === 'string' && PREFER_SOURCES.has(raw.prefer_source as PreferSource)) {
    out.prefer_source = raw.prefer_source as PreferSource;
  }
  if (typeof raw.plan_checklist === 'string' && PLAN_CHECKLISTS.has(raw.plan_checklist as PlanChecklistMode)) {
    out.plan_checklist = raw.plan_checklist as PlanChecklistMode;
  }
  if (typeof raw.sync_prompt_style === 'string' && SYNC_STYLES.has(raw.sync_prompt_style as SyncPromptStyle)) {
    out.sync_prompt_style = raw.sync_prompt_style as SyncPromptStyle;
  }
  if (typeof raw.warn_plan_without_checklist === 'boolean') {
    out.warn_plan_without_checklist = raw.warn_plan_without_checklist;
  }
  if (typeof raw.activity_separate_from_status === 'boolean') {
    out.activity_separate_from_status = raw.activity_separate_from_status;
  }
  if (typeof raw.sync_prompt_custom_zh === 'string' && raw.sync_prompt_custom_zh.trim()) {
    out.sync_prompt_custom_zh = truncatePrompt(raw.sync_prompt_custom_zh.trim());
  }
  if (typeof raw.sync_prompt_custom_en === 'string' && raw.sync_prompt_custom_en.trim()) {
    out.sync_prompt_custom_en = truncatePrompt(raw.sync_prompt_custom_en.trim());
  }
  return out;
}

function stripJsonComments(body: string): string {
  return body
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('#');
    })
    .join('\n');
}

/** Try parse JSON object from fence body. */
export function parseTodoConfigFenceBody(body: string): ProjectTodoPolicy | undefined {
  const cleaned = stripJsonComments(body).trim();
  if (!cleaned) return undefined;
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    const normalized = normalizeTodoConfigObject(parsed);
    return Object.keys(normalized).length > 0 ? normalized : undefined;
  } catch {
    return undefined;
  }
}

function findSectionRange(markdown: string): { start: number; end: number } | undefined {
  const match = SECTION_RE.exec(markdown) || SECTION_RE_ZH.exec(markdown);
  if (!match || match.index === undefined) return undefined;
  const level = (match[0].match(/^#+/) || ['##'])[0].length;
  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const nextRe = new RegExp('\\r?\\n#{1,' + level + '}\\s+');
  const nextHeading = rest.search(nextRe);
  const end = nextHeading >= 0 ? start + nextHeading : markdown.length;
  return { start, end };
}

interface FenceMatch {
  info: string;
  body: string;
}

function findFences(section: string): FenceMatch[] {
  const fences: FenceMatch[] = [];
  const re = /```([^\n`]*)\r?\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    fences.push({ info: (m[1] || '').trim(), body: m[2] || '' });
  }
  return fences;
}

function fenceLooksLikeTodoConfig(info: string, body: string): boolean {
  const infoLower = info.toLowerCase();
  if (infoLower.includes('claude-hub.todo-config')) return true;
  if (infoLower === 'json' || infoLower.startsWith('json ')) return true;
  const first = body.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0) || '';
  return /claude-hub\.todo-config/i.test(first);
}

export function extractTodoConfigFromMarkdown(markdown: string): ProjectTodoPolicy | undefined {
  if (!markdown || typeof markdown !== 'string') return undefined;
  const range = findSectionRange(markdown);
  if (!range) return undefined;
  const section = markdown.slice(range.start, range.end);
  for (const fence of findFences(section)) {
    if (!fenceLooksLikeTodoConfig(fence.info, fence.body)) continue;
    const parsed = parseTodoConfigFenceBody(fence.body);
    if (parsed) return parsed;
  }
  return undefined;
}

function readDocFile(filePath: string): { text: string; mtimeMs: number; size: number } | undefined {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > PROJECT_TODO_DOC_MAX_BYTES) return undefined;
    const text = fs.readFileSync(filePath, 'utf8');
    return { text, mtimeMs: stat.mtimeMs, size: stat.size };
  } catch {
    return undefined;
  }
}

function policyFromDoc(projectPath: string, fileName: 'AGENTS.md' | 'CLAUDE.md'): ProjectTodoPolicy | undefined {
  const resolved = path.resolve(path.join(projectPath, fileName));
  const disk = readDocFile(resolved);
  if (!disk) {
    fileCache.delete(resolved);
    return undefined;
  }
  const cached = fileCache.get(resolved);
  if (cached && cached.mtimeMs === disk.mtimeMs && cached.size === disk.size) {
    return cached.policy ? { ...cached.policy, sourceFile: fileName, sourcePath: resolved } : undefined;
  }
  const extracted = extractTodoConfigFromMarkdown(disk.text);
  fileCache.set(resolved, { mtimeMs: disk.mtimeMs, size: disk.size, policy: extracted });
  return extracted ? { ...extracted, sourceFile: fileName, sourcePath: resolved } : undefined;
}

export function readProjectTodoPolicy(projectPath: string): ProjectTodoPolicy | undefined {
  if (!projectPath || typeof projectPath !== 'string') return undefined;
  const root = path.resolve(projectPath);
  try {
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return undefined;
  } catch {
    return undefined;
  }
  return policyFromDoc(root, 'AGENTS.md') || policyFromDoc(root, 'CLAUDE.md');
}

export function projectTodoPolicyWatchPaths(projectPath: string): string[] {
  if (!projectPath) return [];
  const root = path.resolve(projectPath);
  return [path.join(root, 'AGENTS.md'), path.join(root, 'CLAUDE.md')];
}

export function clearProjectTodoPolicyCache(): void {
  fileCache.clear();
}


/**
 * Effective prefer_source: project policy wins; else VS Code setting; default tasks.
 * "auto" is treated as Task-first ("tasks").
 */
export function resolvePreferSource(
  policy: ProjectTodoPolicy | undefined,
  setting?: PreferSource | string,
): PreferSource {
  const fromPolicy = policy?.prefer_source;
  if (fromPolicy && PREFER_SOURCES.has(fromPolicy)) {
    return fromPolicy;
  }
  if (typeof setting === 'string' && PREFER_SOURCES.has(setting as PreferSource)) {
    return setting as PreferSource;
  }
  return 'auto';
}

/** Force Task-only: hide checklist/markdown fill unless plan_checklist=required. */
export function isTasksOnlyPrefer(prefer: PreferSource): boolean {
  return prefer === 'tasks';
}

/** Dual/auto/checklist/todoWrite may use checklist when that data exists. tasks-only needs required. */
export function allowChecklistFill(
  prefer: PreferSource,
  policy: ProjectTodoPolicy | undefined,
): boolean {
  if (!isTasksOnlyPrefer(prefer)) return true;
  return policy?.plan_checklist === 'required';
}

export type TodoMode = 'task' | 'checklist' | 'none';

export function todoModeFromSource(taskSource: string | undefined): TodoMode {
  if (taskSource === 'native' || taskSource === 'tasks' || taskSource === 'todoWrite') return 'task';
  if (taskSource === 'plan' || taskSource === 'markdown') return 'checklist';
  return 'none';
}

export function shouldWarnPlanWithoutChecklist(
  policy: ProjectTodoPolicy | undefined,
  plan: { isChecklist?: boolean } | undefined,
): boolean {
  if (!policy?.warn_plan_without_checklist) return false;
  if (!plan) return false;
  return plan.isChecklist !== true;
}

export function buildTaskSyncPrompt(options: {
  policy?: ProjectTodoPolicy;
  language: 'zh-CN' | 'en';
  itemLines: string;
  planPath?: string;
}): string {
  const { policy, language, itemLines, planPath } = options;
  const style = policy?.sync_prompt_style || 'verify';
  let body: string;
  if (style === 'custom') {
    const custom =
      language === 'zh-CN'
        ? policy?.sync_prompt_custom_zh || policy?.sync_prompt_custom_en
        : policy?.sync_prompt_custom_en || policy?.sync_prompt_custom_zh;
    body = custom && custom.trim() ? custom.trim() : language === 'zh-CN' ? VERIFY_PROMPT_ZH : VERIFY_PROMPT_EN;
  } else if (style === 'brief') {
    body = language === 'zh-CN' ? BRIEF_PROMPT_ZH : BRIEF_PROMPT_EN;
  } else {
    body = language === 'zh-CN' ? VERIFY_PROMPT_ZH : VERIFY_PROMPT_EN;
  }
  const planLine = planPath
    ? language === 'zh-CN'
      ? `计划：${planPath}\n`
      : `Plan: ${planPath}\n`
    : '';
  return `${body}\n${planLine}${itemLines}`;
}

/** Canonical heading matched when reading project-doc todo policy. */
export const TODO_POLICY_SECTION_HEADING = "## Claude Hub — Task Tracking / 任务追踪";
