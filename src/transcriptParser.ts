import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { AgentEntry, TodoItem, TokenUsage, ToolEntry, SessionPlan, TaskSource, LastActivity } from './types.js';

export interface ParsedTranscript {
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  sessionCreated?: Date;
  sessionTitle?: string;
  model: string;
  lastResponseModel?: string;
  tokenUsage: TokenUsage;
  tools: ToolEntry[];
  activeTools: ToolEntry[];
  agents: AgentEntry[];
  todos: TodoItem[];
  plan?: SessionPlan;
  taskSource?: TaskSource;
  lastActivity?: LastActivity;
  taskToolsObserved?: boolean;
  skills: string[];
  mcpServers: string[];
  wasCleared: boolean;
  hadClearCommand: boolean;
  activeDurationMs: number;
  currentTurnStartTime?: Date;
  lastEntryTimestamp?: number;
}

interface CacheEntry {
  mtimeMs: number;
  size: number;
  data: ParsedTranscript;
}

export function generateForkTitle(originalTitle?: string): string {
  const base = (originalTitle || '').trim() || '未命名对话';
  const openIdx = base.lastIndexOf('(Fork');
  if (openIdx !== -1 && base.endsWith(')')) {
    const prefix = base.substring(0, openIdx).trim() || '未命名对话';
    const inner = base.substring(openIdx + 5, base.length - 1).trim();
    const num = inner ? parseInt(inner, 10) : 1;
    const nextNum = isNaN(num) ? 2 : num + 1;
    return `${prefix} (Fork ${nextNum})`;
  }
  return `${base} (Fork)`;
}

const MAX_TRANSCRIPT_CACHE_SIZE = 500;
const transcriptCache = new Map<string, CacheEntry>();
const MCP_PATTERN = /^mcp__(.+?)__(.+)$/;

export function clearTranscriptCache(filePath?: string): void {
  if (filePath) {
    transcriptCache.delete(filePath);
  } else {
    transcriptCache.clear();
  }
}

export function extractBlockTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((item: any) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        if (typeof item.text === 'string') return item.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

function rewriteSessionIdsInValue(value: unknown, oldSessionId: string, newSessionId: string, key?: string): unknown {
  if (key === 'sessionId' || key === 'parentSessionId') {
    return value === oldSessionId ? newSessionId : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => rewriteSessionIdsInValue(item, oldSessionId, newSessionId));
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      output[childKey] = rewriteSessionIdsInValue(childValue, oldSessionId, newSessionId, childKey);
    }
    return output;
  }

  return value;
}

export function rewriteTranscriptSessionIds(
  content: string,
  oldSessionId: string,
  newSessionId: string,
): string {
  const chunks = content.match(/.*?(?:\r\n|\n|\r|$)/g)?.filter((chunk) => chunk.length > 0) || [];

  return chunks
    .map((chunk) => {
      let lineEnding = '';
      let line = chunk;
      if (line.endsWith('\r\n')) {
        lineEnding = '\r\n';
        line = line.slice(0, -2);
      } else if (line.endsWith('\n') || line.endsWith('\r')) {
        lineEnding = line.slice(-1);
        line = line.slice(0, -1);
      }

      if (!line.trim()) {
        return chunk;
      }

      try {
        const parsed = JSON.parse(line);
        return JSON.stringify(rewriteSessionIdsInValue(parsed, oldSessionId, newSessionId)) + lineEnding;
      } catch {
        return chunk;
      }
    })
    .join('');
}

function normalizeTarget(toolName: string, input?: Record<string, unknown>): string | undefined {
  if (!input) return undefined;

  switch (toolName) {
    case 'Read':
    case 'Write':
    case 'Edit': {
      const fp = (input.filePath as string) ?? (input.file_path as string) ?? (input.path as string);
      return fp ? path.basename(fp) : undefined;
    }
    case 'Glob':
    case 'Grep':
      return (input.pattern as string) ?? undefined;
    case 'Bash': {
      const cmd = input.command;
      if (typeof cmd === 'string') {
        const clean = cmd.replace(/\s+/g, ' ').trim();
        return clean.length > 35 ? `${clean.slice(0, 32)}...` : clean;
      }
      return undefined;
    }
    case 'Skill':
      return (input.name as string) ?? (input.skill as string) ?? undefined;
    case 'WebFetch':
    case 'webfetch':
      return (input.url as string) ?? undefined;
    case 'Task':
      return (input.description as string) ?? (input.subagent_type as string) ?? undefined;
  }
  return undefined;
}

const CHECKLIST_REGEX = /^[-*+]\s+\[([ xX/\-]?)]\s+(.+)/;
const PHASE_HEADING_REGEX =
  /^#{2,4}\s+(Phase|阶段|Step|步骤)\s*([0-9一二三四五六七八九十]+)?(?:\s*[:：\-.)]\s*|\s+)(.+)$/i;
const ORDERED_STEP_REGEX = /^\s*(?:(?:\d+|[一二三四五六七八九十])[.、\)]|(?:\d+|[一二三四五六七八九十]))\s+(.+)/;
const UNORDERED_STEP_REGEX = /^\s*[-*+]\s+(.+)/;
const PLAN_SECTION_HEADER_REGEX = /^#{1,4}\s+.*(?:implementation|execution|steps?|tasks?|plan|action items?|实施|执行|步骤|任务|计划|方案|落地|验证).*$/i;

/**
 * Strips markdown code blocks and inline code to avoid parsing code lines as tasks.
 * Uses a robust line-by-line fence parser supporting arbitrary backtick/tilde lengths and indentation.
 */
export function stripCodeBlocks(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const lines = text.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockFence = '';

  for (const line of lines) {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

    if (inCodeBlock) {
      if (fenceMatch && fenceMatch[1][0] === codeBlockFence[0] && fenceMatch[1].length >= codeBlockFence.length) {
        inCodeBlock = false;
        codeBlockFence = '';
      }
      continue;
    }

    if (fenceMatch) {
      inCodeBlock = true;
      codeBlockFence = fenceMatch[1];
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Cleans markdown formatting (bold, italic, inline code, links) from task text.
 */
export function cleanPlanText(text: string): string {
  let cleaned = text
    .replace(/\*\*([^*]+)\*\*/g, (_, m) => m)
    .replace(/\*([^*]+)\*/g, (_, m) => m)
    // Only strip underscore emphasis when the delimiters are not embedded in
    // an identifier such as `gateway_id_map` or `model_mapping_json`.
    .replace(/(?<![\w])__([^_\n]+)__(?![\w])/g, (_, m) => m)
    .replace(/(?<![\w])_([^_\n]+)_(?![\w])/g, (_, m) => m)
    .replace(/`([^`]+)`/g, (_, m) => m)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, (_, m) => m)
    .replace(/\s+/g, ' ')
    .trim();

  // If text is very long (e.g. detailed paragraphs), truncate to first sentence or max 100 chars
  if (cleaned.length > 100) {
    const endOfFirstSentence = cleaned.search(/[。！？\n;；]/);
    if (endOfFirstSentence > 10 && endOfFirstSentence <= 100) {
      cleaned = cleaned.slice(0, endOfFirstSentence);
    } else {
      cleaned = cleaned.slice(0, 97).trim() + '...';
    }
  }
  return cleaned;
}

/**
 * Extracts structured todo items from Plan text (e.g. ExitPlanMode, plan files, or plan attachments).
 * Falls back across checklist -> plan sections -> ordered steps -> phase headings.
 */
export function extractPlanTodos(text: string): TodoItem[] {
  if (!text || typeof text !== 'string') return [];

  // 1. If standard GFM checklist exists, it takes highest precedence
  const checklist = extractMarkdownTodos(text);
  if (checklist.length > 0) {
    return checklist;
  }

  // 2. Strip code blocks to avoid noise
  const stripped = stripCodeBlocks(text);
  const lines = stripped.split('\n');

  const phaseItems: TodoItem[] = [];
  const orderedSteps: TodoItem[] = [];
  const sectionSteps: TodoItem[] = [];

  let inPlanSection = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check heading
    if (trimmed.startsWith('#')) {
      if (PLAN_SECTION_HEADER_REGEX.test(trimmed)) {
        inPlanSection = true;
      } else if (/^#{1,2}\s+/.test(trimmed)) {
        inPlanSection = false;
      }

      const phaseMatch = PHASE_HEADING_REGEX.exec(trimmed);
      if (phaseMatch) {
        const label = phaseMatch[1];
        const number = phaseMatch[2] || '';
        const title = cleanPlanText(phaseMatch[3] || trimmed.replace(/^#+\s*/, ''));
        if (title.length >= 3 && !title.startsWith('|') && !title.startsWith('---')) {
          const isChineseLabel = label === '阶段' || label === '步骤';
          const display = isChineseLabel
            ? `${label}${number ? ` ${number}` : ''}：${title}`
            : `${label}${number ? ` ${number}` : ''}: ${title}`;
          phaseItems.push({
            content: display,
            status: 'pending',
          });
        }
      }
      continue;
    }

    // Skip table rows, blockquotes, separators
    if (trimmed.startsWith('|') || trimmed.startsWith('>') || trimmed.startsWith('---')) {
      continue;
    }

    // Check ordered step
    const orderedMatch = ORDERED_STEP_REGEX.exec(trimmed);
    if (orderedMatch) {
      const content = cleanPlanText(orderedMatch[1]);
      if (content.length >= 3) {
        orderedSteps.push({
          content,
          status: 'pending',
        });
        if (inPlanSection) {
          sectionSteps.push({
            content,
            status: 'pending',
          });
        }
      }
      continue;
    }

    // Check unordered step under a plan section
    if (inPlanSection) {
      const unorderedMatch = UNORDERED_STEP_REGEX.exec(trimmed);
      if (unorderedMatch) {
        const content = cleanPlanText(unorderedMatch[1]);
        if (content.length >= 3) {
          sectionSteps.push({
            content,
            status: 'pending',
          });
        }
      }
    }
  }

  // Determine which collection to use based on relevance and quality
  let candidates: TodoItem[] = [];
  // A plan with multiple explicit phases is intentionally represented by its
  // top-level phases. Otherwise a long verification section can drown out the
  // actual work breakdown (e.g. 3 phases becoming 21 validation items).
  if (phaseItems.length >= 2) {
    candidates = phaseItems;
  } else if (sectionSteps.length >= 2) {
    candidates = sectionSteps;
  } else if (orderedSteps.length >= 2) {
    candidates = orderedSteps;
  } else if (sectionSteps.length === 1) {
    candidates = sectionSteps;
  } else if (orderedSteps.length === 1) {
    candidates = orderedSteps;
  } else if (phaseItems.length === 1) {
    candidates = phaseItems;
  }

  // Deduplicate by content
  const seen = new Set<string>();
  const results: TodoItem[] = [];
  for (const item of candidates) {
    if (!seen.has(item.content)) {
      seen.add(item.content);
      results.push(item);
    }
    if (results.length >= 25) break;
  }

  return results;
}

/**
 * Resolves a TaskUpdate task id from streamed tool input.
 * Claude Code may emit taskId, id, or task_id before CLI key repair.
 */
export function resolveTaskId(input: any): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input.taskId ?? input.id ?? input.task_id;
  if (raw === undefined || raw === null) return undefined;
  const id = String(raw).trim();
  return id.length > 0 ? id : undefined;
}

/**
 * Advances plan todos based on tool executions (Edit, Write, Bash, Agent, etc.).
 *
 * NOT wired into parseTranscriptStream. Production plan status comes from
 * Task/TodoWrite tools, disk checklists (sessionManager), and syncPlanFile replay.
 * When options.authoritative is true (taskToolsObserved or source tasks/todoWrite/native),
 * this helper is a no-op — do not call it from the live parse loop.
 */
export function advancePlanProgress(
  planTodos: TodoItem[],
  toolName: string,
  input: any,
  isToolCompleted: boolean,
  options?: { authoritative?: boolean },
): void {
  if (!planTodos || planTodos.length === 0) return;
  if (options?.authoritative) return;

  // Plan generation tools must never advance execution progress
  if (toolName === 'ExitPlanMode') return;
  // 计划文件维护不代表执行任务，状态由成功的 checklist 编辑单独同步。
  if ((toolName === 'Write' || toolName === 'Edit') && input && typeof input.file_path === 'string') {
    const fp = input.file_path.replace(/\\/g, '/');
    if (fp.includes('.claude/plans/')) return;
  }

  const execTools = ['Edit', 'Write', 'Bash', 'Agent', 'Task'];
  if (!execTools.includes(toolName)) return;

  const MIN_TARGET_LEN = 5;
  const targets: string[] = [];
  if (input) {
    if (typeof input.file_path === 'string') {
      const fp = input.file_path.replace(/\\/g, '/');
      const base = fp.split('/').pop() || '';
      if (base) {
        targets.push(base.toLowerCase());
        const withoutExt = base.replace(/\.[^.]+$/, '');
        if (withoutExt.length >= MIN_TARGET_LEN) targets.push(withoutExt.toLowerCase());
      }
      if (fp.length >= MIN_TARGET_LEN) targets.push(fp.toLowerCase());
    }
    if (typeof input.command === 'string') {
      const cmd = input.command.toLowerCase().trim();
      if (cmd.length >= MIN_TARGET_LEN) targets.push(cmd);
      // Do not spray short command tokens (avoids matching "test" into unrelated todos).
    }
    if (typeof input.description === 'string' && input.description.length >= MIN_TARGET_LEN) {
      targets.push(input.description.toLowerCase());
    }
    if (typeof input.prompt === 'string') {
      const slice = input.prompt.slice(0, 100).toLowerCase();
      if (slice.length >= MIN_TARGET_LEN) targets.push(slice);
    }
  }

  const usable = [...new Set(targets.filter((t) => t.length >= MIN_TARGET_LEN))];
  usable.sort((a, b) => b.length - a.length);

  let matchedIndex = -1;
  for (let i = 0; i < planTodos.length; i++) {
    if (planTodos[i].status === 'completed') continue;
    const itemContent = planTodos[i].content.toLowerCase();
    const hasMatch = usable.some((t) => itemContent.includes(t));
    if (hasMatch) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex === -1) {
    for (let i = 0; i < planTodos.length; i++) {
      const itemContent = planTodos[i].content.toLowerCase();
      const hasMatch = usable.some((t) => itemContent.includes(t));
      if (hasMatch) {
        matchedIndex = i;
        break;
      }
    }
  }

  if (matchedIndex === -1) return;

  const targetItem = planTodos[matchedIndex];
  if (isToolCompleted) {
    targetItem.status = 'completed';
    // Do not auto-complete preceding items (reduces false positives).
  } else if (targetItem.status === 'pending') {
    targetItem.status = 'in_progress';
  }
}

/**
 * Extracts markdown checklist todos from text (e.g. - [ ] task, - [x] done, - [/] in progress).
 * Strictly requires GFM task list format to prevent false positives from markdown links (e.g. - [name](url)).
 */
export function extractMarkdownTodos(text: string): TodoItem[] {
  if (!text || typeof text !== 'string') return [];
  const stripped = stripCodeBlocks(text);
  const lines = stripped.split('\n');
  const results: TodoItem[] = [];
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const match = CHECKLIST_REGEX.exec(trimmed);
    if (!match) continue;

    const mark = match[1].toLowerCase();
    const content = match[2].trim();
    if (!content) continue;

    let status: 'pending' | 'in_progress' | 'completed' = 'pending';
    if (mark === 'x') {
      status = 'completed';
    } else if (mark === '/' || mark === '-') {
      status = 'in_progress';
    }
    results.push({ content, status });
  }
  return results;
}

export async function parseTranscriptFile(filePath: string): Promise<ParsedTranscript> {
  let stats: fs.Stats;
  try {
    stats = fs.statSync(filePath);
  } catch {
    return createEmptyTranscript();
  }

  const cached = transcriptCache.get(filePath);
  if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
    return cached.data;
  }

  const result = await parseTranscriptStream(filePath);
  if (transcriptCache.size >= MAX_TRANSCRIPT_CACHE_SIZE) {
    const oldestKey = transcriptCache.keys().next().value;
    if (oldestKey) {
      transcriptCache.delete(oldestKey);
    }
  }
  transcriptCache.set(filePath, {
    mtimeMs: stats.mtimeMs,
    size: stats.size,
    data: result,
  });

  return result;
}

function createEmptyTranscript(): ParsedTranscript {
  return {
    model: '',
    lastResponseModel: undefined,
    tokenUsage: {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
      percentage: 0,
    },
    tools: [],
    activeTools: [],
    agents: [],
    todos: [],
    skills: [],
    mcpServers: [],
    wasCleared: false,
    hadClearCommand: false,
    activeDurationMs: 0,
    currentTurnStartTime: undefined,
    lastEntryTimestamp: undefined,
  };
}

async function parseTranscriptStream(filePath: string): Promise<ParsedTranscript> {
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const toolMap = new Map<string, ToolEntry>();
  const toolInputMap = new Map<string, any>();
  const agentMap = new Map<string, AgentEntry>();
  const pendingToolResults = new Map<string, { isError: boolean; endTime: Date; response: any; text: string }>();
  const activeToolIds = new Set<string>();
  const skillsSet = new Set<string>();
  const mcpSet = new Set<string>();
  const todos: TodoItem[] = [];
  const tasksMap = new Map<string, TodoItem>();
  const planTodos: TodoItem[] = [];
  const planContents = new Map<string, string>();
  let activePlanPath: string | undefined;
  let activePlanText = '';
  let taskToolsObserved = false;
  const explicitState: { source: TaskSource } = { source: 'none' };
  const queuedTaskUpdates = new Map<string, any[]>();
  let latestMarkdownTodos: TodoItem[] = [];

  const updateTask = (id: string, input: any): void => {
    const item = tasksMap.get(id);
    if (!item) {
      queuedTaskUpdates.set(id, [...(queuedTaskUpdates.get(id) || []), input]);
      return;
    }
    if (input.status === 'deleted') { tasksMap.delete(id); return; }
    if (['pending', 'in_progress', 'completed'].includes(input.status)) item.status = input.status;
    if (typeof input.subject === 'string') item.content = input.subject;
    if (typeof input.description === 'string') item.description = input.description;
    const active = input.activeForm ?? input.active_form;
    if (typeof active === 'string') item.activeForm = active;
    for (const [field, addition] of [['blockedBy', 'addBlockedBy'], ['blocks', 'addBlocks']] as const) {
      if (Array.isArray(input[addition])) item[field] = Array.from(new Set([...(item[field] || []), ...input[addition].map(String)]));
    }
  };
  const applyTaskResult = (name: string, input: any, _toolId: string, response: any, text: string): void => {
    if (!['TaskCreate', 'TaskUpdate', 'TodoWrite'].includes(name)) return;
    taskToolsObserved = true;
    if (name === 'TodoWrite' && Array.isArray(input.todos)) {
      explicitState.source = 'todoWrite';
      todos.length = 0;
      for (const item of input.todos) {
        if (typeof item?.content === 'string' && ['pending', 'in_progress', 'completed'].includes(item.status)) {
          todos.push({ content: item.content, status: item.status });
        }
      }
    } else if (name === 'TaskCreate') {
      // Assigned id comes only from tool result / prose — never tool_use id fallback.
      const match = /Task #([a-zA-Z0-9_.-]+) created/i.exec(text);
      const rawId = response?.task?.id ?? response?.id ?? match?.[1];
      if (rawId === undefined || rawId === null || String(rawId).trim() === '') return;
      const id = String(rawId).trim();
      explicitState.source = 'tasks';
      const active = input.activeForm ?? input.active_form;
      tasksMap.set(id, {
        id,
        content: String(input.subject || input.description || 'Task'),
        status: 'pending',
        description: typeof input.description === 'string' ? input.description : undefined,
        activeForm: typeof active === 'string' ? active : undefined,
      });
      const updates = queuedTaskUpdates.get(id) || [];
      queuedTaskUpdates.delete(id);
      for (const update of updates) updateTask(id, update);
    } else if (name === 'TaskUpdate') {
      const taskId = resolveTaskId(input);
      if (!taskId) return;
      explicitState.source = 'tasks';
      updateTask(taskId, input);
    }
  };;

  // 仅重放 JSONL 中已成功的计划编辑，不读取文件当前内容覆盖历史状态。
  const syncPlanFile = (name: string, input: any): void => {
    if (typeof input.file_path !== 'string') return;
    const planPath = input.file_path.replace(/\\/g, '/');
    if (!planPath.includes('.claude/plans/')) return;
    if (name === 'Write' && typeof input.content === 'string') {
      planContents.set(planPath, input.content);
      activePlanPath = planPath;
      activePlanText = input.content;
      planTodos.length = 0;
      planTodos.push(...extractPlanTodos(input.content));
      return;
    }
    if (name !== 'Edit' || typeof input.old_string !== 'string' ||
        typeof input.new_string !== 'string' || !input.old_string) return;
    const previous = planContents.get(planPath);
    if (previous === undefined || !previous.includes(input.old_string)) return;
    if (!input.replace_all && previous.indexOf(input.old_string) !== previous.lastIndexOf(input.old_string)) return;
    const updated = input.replace_all
      ? previous.split(input.old_string).join(input.new_string)
      : previous.replace(input.old_string, () => input.new_string);
    planContents.set(planPath, updated);
    if (activePlanPath !== planPath) return;
    activePlanText = updated;
    planTodos.length = 0;
    planTodos.push(...extractPlanTodos(updated));
  };

  let sessionId: string | undefined;
  let cwd: string | undefined;
  let gitBranch: string | undefined;
  let sessionCreated: Date | undefined;
  let customTitle: string | undefined;
  let slugTitle: string | undefined;
  let lastDeclaredModel = '';
  let lastAssistantModel = '';
  let lastClearIndex = -1;
  let userMessagesAfterClear = 0;
  let lineIndex = 0;
  let lastEntryTimestamp: number | null = null;
  let activeDurationMs = 0;
  let currentTurnStartTime: Date | undefined;

  const usageByMessageId = new Map<string, {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  }>();

  let latestUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };

  for await (const line of rl) {
    lineIndex++;
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line);
      const ts = entry.timestamp ? new Date(entry.timestamp) : new Date();
      const tsMs = !isNaN(ts.getTime()) ? ts.getTime() : null;

      if (tsMs !== null) {
        if (lastEntryTimestamp !== null) {
          const diff = tsMs - lastEntryTimestamp;
          const maxThreshold = activeToolIds.size > 0 ? 30 * 60 * 1000 : 5 * 60 * 1000;
          if (diff > 0 && diff <= maxThreshold) {
            activeDurationMs += diff;
          }
        }
        lastEntryTimestamp = tsMs;
      }

      const closeActiveTools = (time: Date, fallbackStatus: 'completed' | 'error' = 'error') => {
        for (const tid of activeToolIds) {
          const t = toolMap.get(tid);
          if (t && t.status === 'running') {
            t.status = fallbackStatus;
            t.endTime = time;
            t.durationMs = Math.max(0, time.getTime() - t.startTime.getTime());
          }
          const ag = agentMap.get(tid);
          if (ag && ag.status === 'running') {
            ag.status = 'completed';
            ag.endTime = time;
          }
        }
        activeToolIds.clear();
      };

      if (!sessionId && entry.sessionId) {
        sessionId = entry.sessionId;
      }
      if (!cwd && entry.cwd) {
        cwd = entry.cwd;
      }
      if (!gitBranch && entry.gitBranch) {
        gitBranch = entry.gitBranch;
      }
      if (!sessionCreated && entry.timestamp) {
        if (!isNaN(ts.getTime())) {
          sessionCreated = ts;
        }
      }

      if (entry.type === 'custom-title' && typeof entry.customTitle === 'string') {
        customTitle = entry.customTitle;
      } else if (typeof entry.slug === 'string') {
        slugTitle = entry.slug;
      }

      // Check /clear
      if (entry.type === 'user' && entry.message?.content) {
        const c = entry.message.content;
        const isClearCommand =
          (typeof c === 'string' &&
            (c.includes('<command-name>/clear</command-name>') || c.trim() === '/clear')) ||
          (Array.isArray(c) &&
            c.some(
              (b: any) =>
                b &&
                b.type === 'text' &&
                typeof b.text === 'string' &&
                (b.text.includes('<command-name>/clear</command-name>') || b.text.trim() === '/clear'),
            ));

        if (isClearCommand) {
          lastClearIndex = lineIndex;
          userMessagesAfterClear = 0;
          todos.length = 0;
          tasksMap.clear();
          latestMarkdownTodos = [];
          planTodos.length = 0;
          activePlanPath = undefined;
          planContents.clear();
          queuedTaskUpdates.clear();
          activePlanText = '';
          explicitState.source = 'none';
          taskToolsObserved = false;
          agentMap.clear();
        } else {
          if (lastClearIndex !== -1) {
            userMessagesAfterClear++;
          }
        }

        // If a new user text prompt starts, close running tools from previous turns
        const isUserPrompt =
          (typeof c === 'string' && c.trim().length > 0) ||
          (Array.isArray(c) &&
            c.some(
              (b: any) =>
                b && b.type === 'text' && typeof b.text === 'string' && b.text.trim().length > 0,
            ));
        if (isUserPrompt) {
          // If previous agents were all completed, auto-clear them when a new user prompt begins
          const allAgentsCompleted =
            agentMap.size > 0 && Array.from(agentMap.values()).every((a) => a.status === 'completed');
          if (allAgentsCompleted) {
            agentMap.clear();
          }

          closeActiveTools(ts, 'error');
          if (tsMs !== null) {
            currentTurnStartTime = new Date(tsMs);
          }

          // Clear each source independently if all items in that source are completed,
          // preventing one completed source from accidentally wiping out in-progress items in another source.
          if (todos.length > 0 && todos.every((t) => t.status === 'completed')) {
            todos.length = 0;
          }
          if (tasksMap.size > 0 && Array.from(tasksMap.values()).every((t) => t.status === 'completed')) {
            tasksMap.clear();
          }
          if (latestMarkdownTodos.length > 0 && latestMarkdownTodos.every((t) => t.status === 'completed')) {
            latestMarkdownTodos = [];
          }
          if (planTodos.length > 0 && planTodos.every((t) => t.status === 'completed')) {
            planTodos.length = 0;
          }
        }
      }

      // Turn completion markers from CLI: cost-state or last-prompt indicates turn finalized
      if (entry.type === 'cost-state' || entry.type === 'last-prompt') {
        closeActiveTools(ts, 'error');
      }

      // Check model attachment (declared model, e.g. claude.auto, claude-opus-5, claude.sub2api.gpt-6-astra)
      if (entry.attachment?.type === 'model') {
        const id = entry.attachment.identity?.modelId;
        if (typeof id === 'string' && id.trim()) {
          lastDeclaredModel = id.trim();
        }
      }

      // Check plan attachment from CLI plan mode
      if (entry.attachment?.type === 'plan_mode' && entry.attachment.plan) {
        activePlanText = String(entry.attachment.plan);
        const extracted = extractPlanTodos(String(entry.attachment.plan));
        if (extracted.length > 0) {
          activePlanPath = undefined;
          planTodos.length = 0;
          planTodos.push(...extracted);
        }
      }

      // Model & Usage from assistant message
      if (entry.type === 'assistant') {
        if (entry.message?.model) {
          lastAssistantModel = String(entry.message.model);
        }
        if (entry.message?.usage) {
          const u = entry.message.usage;
          const msgId = entry.message.id;
          const current = {
            inputTokens: u.input_tokens || 0,
            outputTokens: u.output_tokens || 0,
            cacheCreationTokens: u.cache_creation_input_tokens || 0,
            cacheReadTokens: u.cache_read_input_tokens || 0,
          };
          if (msgId) {
            usageByMessageId.set(msgId, current);
          }
          latestUsage = current;
        }

        // If assistant responds with final text and no tool_use, close prior running tools
        const msgContent = entry.message?.content;
        if (typeof msgContent === 'string') {
          const parsed = extractMarkdownTodos(msgContent);
          if (parsed.length > 0) {
            latestMarkdownTodos = parsed;
          }
        } else if (Array.isArray(msgContent)) {
          const hasToolUse = msgContent.some((b: any) => b && b.type === 'tool_use');
          const hasText = msgContent.some(
            (b: any) =>
              b && b.type === 'text' && typeof b.text === 'string' && b.text.trim().length > 0,
          );
          if (!hasToolUse && hasText) {
            closeActiveTools(ts, 'completed');
          }
          for (const b of msgContent) {
            if (b && b.type === 'text' && typeof b.text === 'string') {
              const parsed = extractMarkdownTodos(b.text);
              if (parsed.length > 0) {
                latestMarkdownTodos = parsed;
              }
            }
          }
        }
      }

      // Extract tool_use & tool_result
      const content = entry.message?.content;

      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_use' && block.id && block.name) {
            const name = block.name;
            const input = block.input || {};

            if (name === 'Skill') {
              const sName = input.skill || input.name;
              if (sName) skillsSet.add(String(sName));
            }

            const mcpMatch = MCP_PATTERN.exec(name);
            if (mcpMatch) {
              mcpSet.add(mcpMatch[1]);
            }

            const target = normalizeTarget(name, input);
            toolInputMap.set(block.id, input);
            const pending = pendingToolResults.get(block.id);
            const status: 'running' | 'completed' | 'error' = pending
              ? (pending.isError ? 'error' : 'completed')
              : 'running';
            const endTime = pending ? pending.endTime : undefined;
            const durationMs =
              pending && ts
                ? Math.max(0, pending.endTime.getTime() - ts.getTime())
                : undefined;

            const toolEntry: ToolEntry = {
              id: block.id,
              name,
              target,
              status,
              startTime: ts,
              endTime,
              durationMs,
            };
            toolMap.set(block.id, toolEntry);

            if (status === 'running') {
              activeToolIds.add(block.id);
            } else if (pending) {
              pendingToolResults.delete(block.id);
            }

            if (name === 'ExitPlanMode') {
              let planContent = input.plan ? String(input.plan) : '';
              if (!planContent && input.planFilePath && typeof input.planFilePath === 'string') {
                try {
                  if (fs.existsSync(input.planFilePath)) {
                    planContent = fs.readFileSync(input.planFilePath, 'utf-8');
                  }
                } catch {
                  // Ignore read error
                }
              }
              if (planContent) {
                activePlanText = planContent;
                activePlanPath = typeof input.planFilePath === 'string'
                  ? input.planFilePath.replace(/\\/g, '/')
                  : undefined;
                if (activePlanPath) planContents.set(activePlanPath, planContent);
                const extracted = extractPlanTodos(planContent);
                if (extracted.length > 0) {
                  planTodos.length = 0;
                  planTodos.push(...extracted);
                }
              }
            }

            if (status === 'completed') {
              syncPlanFile(name, input);
              applyTaskResult(name, input, block.id, pending?.response, pending?.text || '');
              if (pending?.text.includes('running in background')) toolEntry.background = true;
            }
            if (name === 'Task' || name === 'Agent') {
              const agentEntry: AgentEntry = {
                id: block.id,
                type: String(input.subagent_type || 'agent'),
                model: input.model ? String(input.model) : undefined,
                description: input.description ? String(input.description) : undefined,
                status: status === 'running' ? 'running' : 'completed',
                startTime: ts,
                endTime,
                background: Boolean(input.run_in_background),
              };
              agentMap.set(block.id, agentEntry);
            }
          } else if (block.type === 'tool_result' && block.tool_use_id) {
            const toolId = block.tool_use_id;
            const existingTool = toolMap.get(toolId);
            if (existingTool) {
              existingTool.status = block.is_error ? 'error' : 'completed';
              existingTool.endTime = ts;
              existingTool.durationMs = Math.max(0, ts.getTime() - existingTool.startTime.getTime());
              activeToolIds.delete(toolId);

              if (!block.is_error) {
                const savedInput = toolInputMap.get(toolId);
                const toolInput = savedInput || { file_path: existingTool.target };
                syncPlanFile(existingTool.name, toolInput);
                const text = extractBlockTextContent(block.content);
                applyTaskResult(existingTool.name, toolInput, toolId, entry.toolUseResult, text);
                if (text.includes('running in background')) existingTool.background = true;
              }
            } else {
              pendingToolResults.set(toolId, {
                isError: Boolean(block.is_error),
                endTime: ts,
                response: entry.toolUseResult,
                text: extractBlockTextContent(block.content),
              });
            }

            const existingAgent = agentMap.get(toolId);
            const blockText = extractBlockTextContent(block.content);
            if (existingAgent) {
              existingAgent.status = 'completed';
              existingAgent.endTime = ts;
              if (blockText) {
                const agentIdMatch = blockText.match(/agentId:\s*([a-zA-Z0-9_\-]+)/i);
                if (agentIdMatch && agentIdMatch[1]) {
                  existingAgent.id = agentIdMatch[1];
                  existingAgent.toolUseId = toolId;
                }
              }
            }

          }
        }
      }
    } catch {
      // Ignore unparseable lines
    }
  }

  // 来源不混合：成功的显式空列表同样具有权威性。
  const explicitSource = explicitState.source;
  let taskSource: TaskSource = explicitSource;
  if (explicitSource === 'tasks') {
    todos.length = 0;
    todos.push(...tasksMap.values());
  } else if (explicitSource === 'none' && planTodos.length > 0) {
    todos.push(...planTodos);
    taskSource = extractMarkdownTodos(activePlanText).length ? 'markdown' : 'plan';
  } else if (explicitSource === 'none' && latestMarkdownTodos.length > 0) {
    todos.push(...latestMarkdownTodos);
    taskSource = 'markdown';
  }

  const wasCleared = lastClearIndex !== -1 && userMessagesAfterClear === 0;
  if (wasCleared) {
    todos.length = 0;
    planTodos.length = 0;
    agentMap.clear();
  }
  const totalTokens = wasCleared
    ? 0
    : latestUsage.inputTokens + latestUsage.cacheReadTokens + latestUsage.cacheCreationTokens;

  const allTools = Array.from(toolMap.values());
  const activeTools = allTools.filter((t) => t.status === 'running');
  const recentTools = allTools.slice(-20);
  const lastTool = allTools[allTools.length - 1];
  const lastActivity: LastActivity | undefined = lastTool ? {
    name: lastTool.name, target: lastTool.target,
    status: lastTool.background ? 'background' : lastTool.status,
    timestamp: (lastTool.endTime || lastTool.startTime).getTime(),
  } : undefined;

  const effectiveModel = lastDeclaredModel || lastAssistantModel || '';

  return {
    sessionId,
    cwd,
    gitBranch,
    sessionCreated,
    sessionTitle: customTitle || slugTitle || '',
    model: effectiveModel,
    lastResponseModel: lastAssistantModel || undefined,
    tokenUsage: {
      inputTokens: wasCleared ? 0 : latestUsage.inputTokens,
      outputTokens: wasCleared ? 0 : latestUsage.outputTokens,
      cacheCreationTokens: wasCleared ? 0 : latestUsage.cacheCreationTokens,
      cacheReadTokens: wasCleared ? 0 : latestUsage.cacheReadTokens,
      totalTokens,
      percentage: 0, // Calculated by sessionManager based on contextLimit
    },
    tools: recentTools,
    activeTools,
    agents: Array.from(agentMap.values()).slice(-10),
    todos,
    taskSource: wasCleared ? 'none' : taskSource,
    taskToolsObserved: !wasCleared && taskToolsObserved,
    plan: !wasCleared && activePlanText ? {
      path: activePlanPath,
      items: extractPlanTodos(activePlanText),
      isChecklist: extractMarkdownTodos(activePlanText).length > 0,
    } : undefined,
    lastActivity,
    skills: Array.from(skillsSet),
    mcpServers: Array.from(mcpSet),
    wasCleared,
    hadClearCommand: lastClearIndex !== -1,
    activeDurationMs,
    currentTurnStartTime,
    lastEntryTimestamp: lastEntryTimestamp ?? undefined,
  };
}

export interface SubagentMeta {
  agentType?: string;
  name?: string;
  description?: string;
  model?: string;
  spawnDepth?: number;
  parentAgentId?: string;
  worktreeBranch?: string;
  worktreePath?: string;
  requestShape?: string;
  toolUseId?: string;
}

/**
 * Parses all subagents within a session's subagents/ folder.
 */
export async function parseSubagentsDir(
  subagentsDir: string,
  isSessionIdle: boolean = false,
): Promise<AgentEntry[]> {
  if (!fs.existsSync(subagentsDir)) {
    return [];
  }

  let entries: string[] = [];
  try {
    entries = fs.readdirSync(subagentsDir);
  } catch {
    return [];
  }

  const metaFiles = entries.filter((f) => f.startsWith('agent-') && f.endsWith('.meta.json'));
  const agents: AgentEntry[] = [];

  for (const metaFile of metaFiles) {
    const metaPath = path.join(subagentsDir, metaFile);
    const agentId = metaFile.replace(/^agent-/, '').replace(/\.meta\.json$/, '');
    const jsonlPath = path.join(subagentsDir, `agent-${agentId}.jsonl`);

    let meta: SubagentMeta = {};
    try {
      const content = fs.readFileSync(metaPath, 'utf8');
      meta = JSON.parse(content) as SubagentMeta;
    } catch {
      // Continue with empty meta
    }

    let startTime: Date | undefined;
    let lastTimestamp: Date | undefined;
    let endTime: Date | undefined;
    let lastStopReason: string | null = null;
    let promptSnippet: string | undefined;
    let toolCount = 0;
    let totalTokens = 0;
    let tokenUsage: TokenUsage | undefined;

    if (fs.existsSync(jsonlPath)) {
      try {
        const fileStream = fs.createReadStream(jsonlPath);
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity,
        });

        for await (const line of rl) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const row = JSON.parse(trimmed);
            if (row.timestamp) {
              const rowDate = new Date(row.timestamp);
              if (!startTime) startTime = rowDate;
              lastTimestamp = rowDate;
            }

            if (row.message) {
              if (row.message.usage) {
                const u = row.message.usage;
                const inTok = Number(u.input_tokens || 0);
                const outTok = Number(u.output_tokens || 0);
                const cacheRead = Number(u.cache_read_input_tokens || 0);
                const cacheCreate = Number(u.cache_creation_input_tokens || 0);
                totalTokens = inTok + outTok + cacheRead + cacheCreate;
                tokenUsage = {
                  inputTokens: inTok,
                  outputTokens: outTok,
                  cacheReadTokens: cacheRead,
                  cacheCreationTokens: cacheCreate,
                  totalTokens,
                  percentage: 0,
                };
              }
              if (row.message.stop_reason) {
                lastStopReason = row.message.stop_reason;
              }
              if (Array.isArray(row.message.content)) {
                for (const blk of row.message.content) {
                  if (blk && blk.type === 'tool_use') {
                    toolCount++;
                  }
                }
              }
            }

            if (!promptSnippet && row.type === 'user') {
              if (typeof row.message?.content === 'string') {
                promptSnippet = row.message.content;
              } else if (Array.isArray(row.message?.content)) {
                const textBlock = row.message.content.find((b: any) => b && b.type === 'text');
                if (textBlock && typeof textBlock.text === 'string') {
                  promptSnippet = textBlock.text;
                }
              }
            }
          } catch {
            // Ignore corrupted lines
          }
        }
      } catch {
        // Ignore file read errors
      }
    }

    // Determine status
    let status: 'running' | 'completed' | 'error' = 'completed';
    if (!isSessionIdle) {
      if (lastStopReason === 'end_turn') {
        status = 'completed';
      } else if (lastStopReason === 'max_tokens' || lastStopReason === 'stop_sequence') {
        status = 'completed';
      } else if (startTime && lastTimestamp && Date.now() - lastTimestamp.getTime() > 180000) {
        // Inactive for more than 3 minutes
        status = 'completed';
      } else {
        status = 'running';
      }
    }

    if (status === 'completed') {
      endTime = lastTimestamp;
    }

    const durationMs = startTime
      ? Math.max(0, (endTime ? endTime.getTime() : (lastTimestamp ? lastTimestamp.getTime() : Date.now())) - startTime.getTime())
      : undefined;

    // Resolve name and description cleanly
    let name = meta.name;
    let description = meta.description;

    if (!description && promptSnippet) {
      const cleanSnippet = promptSnippet.trim();
      if (cleanSnippet.startsWith('Review target:') || cleanSnippet.includes('/code-review')) {
        description = '/code-review';
      } else {
        description = cleanSnippet.length > 50 ? cleanSnippet.substring(0, 48) + '...' : cleanSnippet;
      }
    }

    if (!name && !description) {
      name = meta.agentType || 'agent';
    }

    agents.push({
      id: agentId,
      toolUseId: meta.toolUseId,
      name,
      type: meta.agentType || 'agent',
      model: meta.model,
      description,
      status,
      startTime,
      endTime,
      durationMs,
      totalTokens: totalTokens > 0 ? totalTokens : undefined,
      tokenUsage,
      parentAgentId: meta.parentAgentId,
      spawnDepth: meta.spawnDepth || 1,
      worktreeBranch: meta.worktreeBranch,
      worktreePath: meta.worktreePath,
      background: meta.requestShape === 'background',
      toolsCount: toolCount > 0 ? toolCount : undefined,
    });
  }

  // Sort: primary agents first, nested subagents immediately under their parent
  const rootAgents = agents.filter((a) => !a.parentAgentId || a.spawnDepth === 1);
  const childAgents = agents.filter((a) => a.parentAgentId && a.spawnDepth && a.spawnDepth > 1);

  rootAgents.sort((a, b) => (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0));

  const ordered: AgentEntry[] = [];
  for (const root of rootAgents) {
    ordered.push(root);
    const children = childAgents.filter((c) => c.parentAgentId === root.id);
    children.sort((a, b) => (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0));
    ordered.push(...children);
  }

  // Add any orphaned children
  for (const child of childAgents) {
    if (!ordered.some((a) => a.id === child.id)) {
      ordered.push(child);
    }
  }

  return ordered;
}

