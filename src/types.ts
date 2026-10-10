export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  percentage: number;
}

export interface ToolEntry {
  id: string;
  name: string;
  target?: string;
  status: 'running' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  background?: boolean;
}

export interface AgentEntry {
  id: string;
  toolUseId?: string;
  name?: string;
  type: string;
  model?: string;
  description?: string;
  status: 'running' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  durationMs?: number;
  totalTokens?: number;
  tokenUsage?: TokenUsage;
  parentAgentId?: string;
  spawnDepth?: number;
  worktreeBranch?: string;
  worktreePath?: string;
  background?: boolean;
  toolsCount?: number;
}

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  id?: string;
  description?: string;
  activeForm?: string;
  blockedBy?: string[];
  blocks?: string[];
}

export type TaskSource = 'native' | 'tasks' | 'todoWrite' | 'plan' | 'markdown' | 'none';

export interface SessionPlan {
  path?: string;
  items: TodoItem[];
  isChecklist: boolean;
}

/** Allowlisted todo preferences parsed from AGENTS.md / CLAUDE.md (see projectTodoPolicy.ts). */
export interface ProjectTodoPolicyInfo {
  sourceFile?: 'AGENTS.md' | 'CLAUDE.md';
  sourcePath?: string;
  prefer_source?: 'auto' | 'tasks' | 'checklist' | 'todoWrite';
  plan_checklist?: 'required' | 'preferred' | 'optional';
  sync_prompt_style?: 'verify' | 'brief' | 'custom';
  warn_plan_without_checklist?: boolean;
  activity_separate_from_status?: boolean;
  sync_prompt_custom_zh?: string;
  sync_prompt_custom_en?: string;
}

export interface LastActivity {
  name: string;
  target?: string;
  status: 'running' | 'completed' | 'error' | 'background';
  timestamp: number;
}

export interface UsageMeter {
  key: string;
  label: string;
  percentage: number;
  resetsAt: Date | null;
  isActive: boolean;
}

export interface SubscriptionUsageData {
  session: UsageMeter | null;
  meters: UsageMeter[];
  lastUpdated: Date;
}

export interface SessionInfo {
  sessionId: string;
  sessionFile: string;
  projectName: string;
  projectPath: string;
  sessionTitle: string;
  model: string;
  lastResponseModel?: string;
  configuredModel?: string;
  contextLimit: number;
  tokenUsage: TokenUsage;
  tools: ToolEntry[];
  activeTools: ToolEntry[];
  agents: AgentEntry[];
  totalAgentsCount?: number;
  subagentsTotalTokens?: number;
  todos: TodoItem[];
  plan?: SessionPlan;
  taskSource?: TaskSource;
  taskListId?: string;
  /** High-level badge: Task (native/tasks/todoWrite) vs Checklist (plan/markdown). */
  todoMode?: 'task' | 'checklist' | 'none';
  /** Resolved prefer_source (auto = dual). */
  preferSource?: 'auto' | 'tasks' | 'checklist' | 'todoWrite';
  /** Checklist/markdown data exists (even if Task is primary). */
  checklistAvailable?: boolean;
  /** Whether checklist fill is allowed under current prefer. */
  checklistFillAllowed?: boolean;
  lastActivity?: LastActivity;
  taskToolsObserved?: boolean;
  /** Transient TaskCreate-in-flight cards (tool_use id only; never durable todo id). */
  pendingTaskCreates?: Array<{ toolUseId: string; subject: string; description?: string }>;
  /** True when Task tools seen but no valid native list could be bound. */
  taskListNeedsSelection?: boolean;
  projectTodoPolicy?: ProjectTodoPolicyInfo;
  skills: string[];
  mcpServers: string[];
  gitBranch?: string;
  sessionCreated?: Date;
  lastUpdated: Date;
  durationMs?: number;
  totalSpanMs?: number;
  currentTurnStartTime?: Date;
  isIdle: boolean;
  isCurrentWorkspace: boolean;
  wasCleared: boolean;
  cwd?: string;
  /** Set when this session was forked / resumed from another. */
  parentSessionId?: string;
  /** Matching workspace folder name when multi-root. */
  workspaceFolderName?: string;
}

export type FilterMode = 'currentWorkspace' | 'all';
