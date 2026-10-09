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
  blockedBy?: string[];
  blocks?: string[];
}

export type TaskSource = 'native' | 'tasks' | 'todoWrite' | 'plan' | 'markdown' | 'none';

export interface SessionPlan {
  path?: string;
  items: TodoItem[];
  isChecklist: boolean;
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
  lastActivity?: LastActivity;
  taskToolsObserved?: boolean;
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
}

export type FilterMode = 'currentWorkspace' | 'all';
