import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { AgentEntry, TodoItem, TokenUsage, ToolEntry } from './types.js';

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
  skills: string[];
  mcpServers: string[];
  wasCleared: boolean;
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

const transcriptCache = new Map<string, CacheEntry>();
const MCP_PATTERN = /^mcp__(.+?)__(.+)$/;

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

/**
 * Extracts markdown checklist todos from text (e.g. - [ ] task, - [x] done, - [/] in progress).
 */
export function extractMarkdownTodos(text: string): TodoItem[] {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  const results: TodoItem[] = [];
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed.startsWith('- [') && !trimmed.startsWith('* [') && !trimmed.startsWith('+ [')) {
      continue;
    }
    const closeBracketIdx = trimmed.indexOf(']', 3);
    if (closeBracketIdx === -1) continue;
    const mark = trimmed.substring(3, closeBracketIdx).trim().toLowerCase();
    const content = trimmed.substring(closeBracketIdx + 1).trim();
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
  const agentMap = new Map<string, AgentEntry>();
  const pendingToolResults = new Map<string, { isError: boolean; endTime: Date }>();
  const activeToolIds = new Set<string>();
  const skillsSet = new Set<string>();
  const mcpSet = new Set<string>();
  const todos: TodoItem[] = [];
  const tasksMap = new Map<string, TodoItem>();
  let latestMarkdownTodos: TodoItem[] = [];

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
        if (typeof c === 'string' && c.includes('<command-name>/clear</command-name>')) {
          lastClearIndex = lineIndex;
          userMessagesAfterClear = 0;
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
          closeActiveTools(ts, 'error');
          if (tsMs !== null) {
            currentTurnStartTime = new Date(tsMs);
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
            } else if (name === 'TodoWrite' && Array.isArray(input.todos)) {
              todos.length = 0;
              for (const item of input.todos) {
                if (item && item.content && item.status) {
                  todos.push({
                    content: String(item.content),
                    status: item.status,
                  });
                }
              }
            } else if (name === 'TaskCreate' && input) {
              const content = String(input.subject || input.description || 'Task');
              const taskItem: TodoItem = {
                content,
                status: 'pending',
              };
              tasksMap.set(block.id, taskItem);
              if (input.taskId) {
                tasksMap.set(String(input.taskId), taskItem);
              }
            } else if (name === 'TaskUpdate' && input) {
              const taskId = input.taskId ? String(input.taskId) : undefined;
              if (taskId && tasksMap.has(taskId)) {
                const item = tasksMap.get(taskId)!;
                if (input.status) {
                  item.status =
                    input.status === 'completed'
                      ? 'completed'
                      : input.status === 'in_progress'
                      ? 'in_progress'
                      : 'pending';
                }
                if (input.subject) {
                  item.content = String(input.subject);
                }
              }
            }
          } else if (block.type === 'tool_result' && block.tool_use_id) {
            const toolId = block.tool_use_id;
            const existingTool = toolMap.get(toolId);
            if (existingTool) {
              existingTool.status = block.is_error ? 'error' : 'completed';
              existingTool.endTime = ts;
              existingTool.durationMs = Math.max(0, ts.getTime() - existingTool.startTime.getTime());
              activeToolIds.delete(toolId);
            } else {
              pendingToolResults.set(toolId, {
                isError: Boolean(block.is_error),
                endTime: ts,
              });
            }

            const existingAgent = agentMap.get(toolId);
            if (existingAgent) {
              existingAgent.status = 'completed';
              existingAgent.endTime = ts;
            }

            if (tasksMap.has(toolId)) {
              if (entry.toolUseResult?.task?.id) {
                const tId = String(entry.toolUseResult.task.id);
                tasksMap.set(tId, tasksMap.get(toolId)!);
              } else if (typeof block.content === 'string') {
                const match = block.content.match(/Task #(\d+) created/i);
                if (match && match[1]) {
                  tasksMap.set(match[1], tasksMap.get(toolId)!);
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

  if (todos.length === 0 && tasksMap.size > 0) {
    const uniqueTasks = Array.from(new Set(tasksMap.values()));
    todos.push(...uniqueTasks);
  }
  if (todos.length === 0 && latestMarkdownTodos.length > 0) {
    todos.push(...latestMarkdownTodos);
  }

  const wasCleared = lastClearIndex !== -1 && userMessagesAfterClear === 0;
  const totalTokens = wasCleared
    ? 0
    : latestUsage.inputTokens + latestUsage.cacheReadTokens + latestUsage.cacheCreationTokens;

  const allTools = Array.from(toolMap.values());
  const activeTools = allTools.filter((t) => t.status === 'running');
  const recentTools = allTools.slice(-20);

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
    skills: Array.from(skillsSet),
    mcpServers: Array.from(mcpSet),
    wasCleared,
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

