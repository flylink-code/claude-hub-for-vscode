function getVsCode(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('vscode');
  } catch {
    return null;
  }
}

export type LanguageCode = 'auto' | 'zh-CN' | 'en';

export const enMessages = {
  // Status Bar
  'status.idle': 'Claude: Idle',
  'status.idleOthers': 'Claude: Idle ({count} elsewhere)',
  'status.tooltipTitle': '**Claude Code**: No active sessions detected.',
  'status.tooltipStart': 'Start a Claude Code session in terminal or Claude extension.',
  'status.tooltipOtherTitle': '**Claude Code**: Idle in current workspace.',
  'status.tooltipOtherDesc': '{count} active session(s) in other projects.',
  'status.switchToAll': 'Switch to All Sessions',
  'status.refresh': 'Refresh',
  'status.todos': 'Todos',
  'status.stateActive': '⚡ Active',
  'status.stateIdle': '💤 Idle',
  'status.contextWindow': 'Context Window',
  'status.input': 'Input',
  'status.cacheRead': 'Cache Read',
  'status.cacheWrite': 'Cache Write',
  'status.output': 'Output',
  'status.model': 'Model',
  'status.git': 'Git',
  'status.runningTools': 'Running Tools',
  'status.tasks': 'Tasks',
  'status.subscriptionLimits': 'Subscription Limits',
  'status.resetsIn': 'resets in {h}h {m}m',
  'status.quickRefresh': '🔄 Refresh',
  'status.quickAll': '📁 Show All Projects',
  'status.quickCurrent': '📁 Show Current Project Only',
  'status.quickSwitch': '📋 Switch Session',
  'status.quickLog': '📄 Open Log',

  // Sidebar
  'sidebar.noActive': 'No active Claude Code sessions',
  'sidebar.startTip': 'Start Claude Code in terminal',
  'sidebar.currentWsIdle': 'Current Workspace: Idle',
  'sidebar.noSessionForFolder': 'No session running for this folder',
  'sidebar.otherProjects': '🌐 Other Projects ({count} sessions)',
  'sidebar.otherActiveProjects': '🌐 Other Active Projects ({count})',
  'sidebar.otherHistoricalProjects': '🕒 Historical Sessions ({count})',
  'sidebar.moreHistory': '...and {count} more earlier sessions',
  'sidebar.clickExpandOthers': 'Click to expand sessions in other folders',
  'sidebar.modelLabel': 'Model: {model}',
  'sidebar.modelLimitOnly': 'limit: {limit}',
  'sidebar.tokensDesc': '{total} / {limit} Tokens',
  'sidebar.contextLabel': 'Context: [{bar}] {pct}%',
  'sidebar.hitRate': '{rate}% hit rate',
  'sidebar.subLimits': 'Subscription Rate Limits{extra}',
  'sidebar.activeToolsTitle': 'Active Tools ({count} running)',
  'sidebar.recentToolsTitle': 'Recent Tools ({count})',
  'sidebar.tasksTitle': 'Tasks: {completed}/{total} completed',
  'sidebar.subagentsTitle': 'Subagents ({count})',
  'sidebar.extensionsTitle': 'MCP & Skills ({count})',
  'sidebar.running': 'Running',
  'sidebar.elapsed': '{sec}s elapsed',

  // Commands
  'cmd.refreshed': 'Claude Hub: Refreshed Claude Code status.',
  'cmd.filteredWs': 'Claude Hub: Filtered to Current Workspace only.',
  'cmd.showingAll': 'Claude Hub: Showing all active Claude sessions.',
  'cmd.noSessions': 'Claude Hub: No Claude Code sessions found.',
  'cmd.selectPrompt': 'Select a Claude Code session to inspect',
  'cmd.focusedOn': 'Claude Hub: Focused on "{name}".',
  'cmd.noActiveOpen': 'Claude Hub: No active session to open.',
  'cmd.openError': 'Claude Hub: Could not open transcript: {err}',
  'cmd.tagWs': '📁 Current WS',
  'cmd.tagOther': '🌐 Other',
};

export const zhMessages: typeof enMessages = {
  // 状态栏
  'status.idle': 'Claude: 空闲',
  'status.idleOthers': 'Claude: 当前空闲 (其他项目有 {count} 个活跃)',
  'status.tooltipTitle': '**Claude Code**: 未检测到活跃会话。',
  'status.tooltipStart': '请在终端或 Claude 扩展中启动会话。',
  'status.tooltipOtherTitle': '**Claude Code**: 当前工作区无活跃会话。',
  'status.tooltipOtherDesc': '其他项目存在 {count} 个活跃会话。',
  'status.switchToAll': '切换查看所有会话',
  'status.refresh': '刷新',
  'status.todos': '待办',
  'status.stateActive': '⚡ 活跃',
  'status.stateIdle': '💤 闲置',
  'status.contextWindow': '上下文窗口',
  'status.input': '输入',
  'status.cacheRead': '缓存读取',
  'status.cacheWrite': '缓存写入',
  'status.output': '输出',
  'status.model': '模型',
  'status.git': '分支',
  'status.runningTools': '运行中工具',
  'status.tasks': '任务清单',
  'status.subscriptionLimits': '订阅配额限制',
  'status.resetsIn': '{h}小时{m}分后重置',
  'status.quickRefresh': '🔄 刷新',
  'status.quickAll': '📁 查看所有项目',
  'status.quickCurrent': '📁 仅看当前项目',
  'status.quickSwitch': '📋 切换会话',
  'status.quickLog': '📄 查看日志',

  // 侧边栏
  'sidebar.noActive': '未检测到活跃的 Claude Code 会话',
  'sidebar.startTip': '在终端启动 Claude Code 后自动接入',
  'sidebar.currentWsIdle': '当前工作区：空闲',
  'sidebar.noSessionForFolder': '此工作区暂无运行中的会话',
  'sidebar.otherProjects': '🌐 其他项目会话 ({count} 个)',
  'sidebar.otherActiveProjects': '🌐 其他活跃项目 ({count} 个)',
  'sidebar.otherHistoricalProjects': '🕒 历史会话记录 ({count} 个)',
  'sidebar.moreHistory': '...以及 {count} 个更早的历史会话',
  'sidebar.clickExpandOthers': '点击展开查看其他项目的会话',
  'sidebar.modelLabel': 'AI 模型: {model}',
  'sidebar.modelLimitOnly': '上限: {limit}',
  'sidebar.tokensDesc': '{total} / {limit} Tokens',
  'sidebar.contextLabel': '上下文消耗: [{bar}] {pct}%',
  'sidebar.hitRate': '命中率 {rate}%',
  'sidebar.subLimits': '订阅配额限制{extra}',
  'sidebar.activeToolsTitle': '活跃工具 ({count} 个运行中)',
  'sidebar.recentToolsTitle': '最近工具 ({count})',
  'sidebar.tasksTitle': '任务进度: {completed}/{total} 已完成',
  'sidebar.subagentsTitle': '子代理任务 ({count})',
  'sidebar.extensionsTitle': 'MCP 与 Skills ({count})',
  'sidebar.running': '运行中',
  'sidebar.elapsed': '耗时 {sec} 秒',

  // 命令
  'cmd.refreshed': 'Claude Hub: 已刷新 Claude Code 状态。',
  'cmd.filteredWs': 'Claude Hub: 已切换为仅查看当前工作区。',
  'cmd.showingAll': 'Claude Hub: 已切换为查看全部活跃会话。',
  'cmd.noSessions': 'Claude Hub: 未发现 Claude Code 会话。',
  'cmd.selectPrompt': '选择要聚焦查看的 Claude Code 会话',
  'cmd.focusedOn': 'Claude Hub: 已聚焦到会话 "{name}"。',
  'cmd.noActiveOpen': 'Claude Hub: 无可用会话可打开。',
  'cmd.openError': 'Claude Hub: 无法打开日志文件: {err}',
  'cmd.tagWs': '📁 当前工作区',
  'cmd.tagOther': '🌐 其他项目',
};

export type MessageKey = keyof typeof enMessages;

export function resolveLanguage(configLang?: string, vscodeLang?: string): 'zh-CN' | 'en' {
  const chosen = (configLang || 'auto').trim();
  if (chosen === 'zh-CN') return 'zh-CN';
  if (chosen === 'en') return 'en';

  const vLang = (vscodeLang || '').toLowerCase();
  if (vLang.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en';
}

export function getCurrentLanguage(): 'zh-CN' | 'en' {
  const vsc = getVsCode();
  const configLang = vsc?.workspace?.getConfiguration?.('claudeHub')?.get?.('language', 'auto') || 'auto';
  const vscodeLang = vsc?.env?.language || '';
  return resolveLanguage(configLang, vscodeLang);
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const lang = getCurrentLanguage();
  const dict = lang === 'zh-CN' ? zhMessages : enMessages;
  let text = dict[key] || enMessages[key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return text;
}
