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
  'task.panel': 'Plan & Tasks',
  'task.notLinked': 'Plan has not been linked to tasks',
  'task.native': 'Native tasks',
  'task.tasks': 'Session tasks',
  'task.todoWrite': 'TodoWrite',
  'task.markdown': 'Checklist',
  'task.plan': 'Plan',
  'task.none': 'No task records',
  'task.enable': 'Enable task integration',
  'task.disable': 'Disable task integration',
  'task.openPlan': 'Open plan',
  'task.copySync': 'Copy task sync prompt',
  'task.selectList': 'Select task list',
  'task.autoList': 'Automatic association',
  'task.configured': 'Configured; verify in a subsequent Claude session',
  'task.observed': 'Task records observed',
  'task.off': 'Task integration is not configured for this project',
  'task.conflict': 'Tasks or Hooks are disabled, or configuration is invalid',
  'task.noProject': 'Open a workspace folder before configuring task integration.',
  'task.selectProject': 'Select the workspace to configure',
  'task.saved': 'Task integration configured for this project. Verify in a subsequent Claude session.',
  'task.stopped': 'Task integration disabled for this project.',
  'task.copyDone': 'Task sync prompt copied. Send it in the existing Claude conversation.',
  'task.error': 'Task integration: {err}',
  'task.recent': 'Recent activity',
  'task.noActivity': 'No tool activity recorded',
  'task.noNewRecords': 'No new records',
  'task.running': 'Running',
  'task.completed': 'Tool returned',
  'task.errorState': 'Tool error',
  'task.background': 'Background command started',
  'task.pendingCount': 'Pending',
  'task.activeCount': 'In progress',
  'task.doneCount': 'Completed',
  'task.depends': 'Depends on',
  'task.empty': 'Task list is empty',
  'task.planNoChecklistWarn': 'Plan has no GFM checklist — phase status may be inaccurate. Prefer checklist marks or TaskCreate/TaskUpdate.',
  'task.policyFrom': 'Todo policy: {file}',
  'task.injectSection': 'Insert task-tracking section',
  'task.injectConfirm': 'Append the recommended Claude Hub task-tracking section to {file}? Existing content will not be overwritten.',
  'task.injectAppend': 'Append',
  'task.injectCancel': 'Cancel',
  'task.injectDone': 'Appended task-tracking section to {file}.',
  'task.injectExists': '{file} already contains a Claude Hub task-tracking section.',
  'task.injectOpen': 'Open file',
  'task.injectCopy': 'Copy snippet',
  'task.injectCopied': 'Recommended task-tracking section copied to the clipboard.',
  'task.noWorkspace': 'Open a workspace folder first.',
  'task.chipPending': 'Pending',
  'task.chipActive': 'In progress',
  'task.chipDone': 'Done',
  'task.expand': 'Expand',
  'task.collapse': 'Collapse',
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
  'status.sessionDuration': 'Session Duration',
  'status.runningDuration': 'Running Time',
  'status.activityActive': '⚡ Activity: **Session Active**',
  'status.activityTool': '⚙️ Activity: **{name}**{target}',
  'status.activityThinking': '⚡ Activity: **Thinking & Generating...**',
  'status.activityIdle': '💤 Activity: **Ready (Idle)**',
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
  'status.quickDashboard': '📊 Dashboard',
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
  'cmd.deleted': 'Claude Hub: Deleted session "{name}".',
  'cmd.deleteConfirm': 'Are you sure you want to permanently delete session "{name}" and its logs?',
  'cmd.deletePrompt': 'Select a Claude Code session to permanently delete',
};

export const zhMessages: typeof enMessages = {
  'task.panel': '计划与任务',
  'task.notLinked': '计划尚未关联任务',
  'task.native': '原生任务',
  'task.tasks': '会话任务',
  'task.todoWrite': 'TodoWrite',
  'task.markdown': '复选清单',
  'task.plan': '计划',
  'task.none': '暂无任务记录',
  'task.enable': '启用任务联动',
  'task.disable': '停用任务联动',
  'task.openPlan': '打开计划',
  'task.copySync': '复制任务同步提示',
  'task.selectList': '选择任务列表',
  'task.autoList': '自动关联',
  'task.configured': '已配置，需在后续 Claude 会话验证',
  'task.observed': '已观察到任务记录',
  'task.off': '当前项目尚未配置任务联动',
  'task.conflict': 'Tasks 或 Hook 被关闭，或配置格式无效',
  'task.noProject': '请先打开工作区目录，再配置任务联动。',
  'task.selectProject': '选择要配置的工作区项目',
  'task.saved': '当前项目已配置任务联动，请在后续 Claude 会话验证。',
  'task.stopped': '当前项目已停用任务联动。',
  'task.copyDone': '任务同步提示已复制，请发送到原来的 Claude 对话。',
  'task.error': '任务联动：{err}',
  'task.recent': '最近活动',
  'task.noActivity': '暂无工具活动记录',
  'task.noNewRecords': '暂无新记录',
  'task.running': '执行中',
  'task.completed': '工具已返回',
  'task.errorState': '工具错误',
  'task.background': '后台命令已启动',
  'task.pendingCount': '待执行',
  'task.activeCount': '执行中',
  'task.doneCount': '已完成',
  'task.depends': '依赖任务',
  'task.empty': '任务列表为空',
  'task.planNoChecklistWarn': '计划缺少 GFM checklist，阶段状态可能不准。请用 checklist 勾选或 TaskCreate/TaskUpdate。',
  'task.policyFrom': '任务策略来源：{file}',
  'task.injectSection': '插入任务追踪段落',
  'task.injectConfirm': '把推荐的 Claude Hub 任务追踪段落追加到 {file}？不会覆盖已有内容。',
  'task.injectAppend': '追加',
  'task.injectCancel': '取消',
  'task.injectDone': '已追加任务追踪段落到 {file}。',
  'task.injectExists': '{file} 已包含 Claude Hub 任务追踪段落。',
  'task.injectOpen': '打开文件',
  'task.injectCopy': '复制片段',
  'task.injectCopied': '已复制推荐任务追踪段落到剪贴板。',
  'task.noWorkspace': '请先打开工作区目录。',
  'task.chipPending': '待办',
  'task.chipActive': '进行中',
  'task.chipDone': '已完成',
  'task.expand': '展开',
  'task.collapse': '收起',
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
  'status.sessionDuration': '对话时长',
  'status.runningDuration': '运行时长',
  'status.activityActive': '⚡ 执行状态: **对话活跃中**',
  'status.activityTool': '⚙️ 执行状态: **{name}**{target}',
  'status.activityThinking': '⚡ 执行状态: **思考与生成回复中...**',
  'status.activityIdle': '💤 执行状态: **就绪 (空闲)**',
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
  'status.quickDashboard': '📊 仪表盘',
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
  'cmd.deleted': 'Claude Hub: 已删除会话 "{name}"。',
  'cmd.deleteConfirm': '确定要永久删除会话 "{name}" 及其日志文件吗？此操作无法撤销。',
  'cmd.deletePrompt': '选择要永久删除的 Claude 会话',
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
