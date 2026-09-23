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
  const skillsSet = new Set<string>();
  const mcpSet = new Set<string>();
  const todos: TodoItem[] = [];

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
        const ts = new Date(entry.timestamp);
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
      }

      // Extract tool_use & tool_result
      const ts = entry.timestamp ? new Date(entry.timestamp) : new Date();
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
            const toolEntry: ToolEntry = {
              id: block.id,
              name,
              target,
              status: 'running',
              startTime: ts,
            };
            toolMap.set(block.id, toolEntry);

            if (name === 'Task' || name === 'Agent') {
              const agentEntry: AgentEntry = {
                id: block.id,
                type: String(input.subagent_type || 'agent'),
                model: input.model ? String(input.model) : undefined,
                description: input.description ? String(input.description) : undefined,
                status: 'running',
                startTime: ts,
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
            }
          } else if (block.type === 'tool_result' && block.tool_use_id) {
            const existingTool = toolMap.get(block.tool_use_id);
            if (existingTool) {
              existingTool.status = block.is_error ? 'error' : 'completed';
              existingTool.endTime = ts;
              existingTool.durationMs = Math.max(0, ts.getTime() - existingTool.startTime.getTime());
            }

            const existingAgent = agentMap.get(block.tool_use_id);
            if (existingAgent) {
              existingAgent.status = 'completed';
              existingAgent.endTime = ts;
            }
          }
        }
      }
    } catch {
      // Ignore unparseable lines
    }
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
  };
}
