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
}

export interface AgentEntry {
  id: string;
  type: string;
  model?: string;
  description?: string;
  status: 'running' | 'completed';
  startTime: Date;
  endTime?: Date;
  background?: boolean;
}

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
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
  contextLimit: number;
  tokenUsage: TokenUsage;
  tools: ToolEntry[];
  activeTools: ToolEntry[];
  agents: AgentEntry[];
  todos: TodoItem[];
  skills: string[];
  mcpServers: string[];
  gitBranch?: string;
  sessionCreated?: Date;
  lastUpdated: Date;
  isIdle: boolean;
  isCurrentWorkspace: boolean;
  wasCleared: boolean;
  cwd?: string;
}

export type FilterMode = 'currentWorkspace' | 'all';
