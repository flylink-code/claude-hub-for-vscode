# Changelog

本文件记录 Claude Hub for VS Code 的版本变更。

## [0.2.14] - 2026-10-10

### 中文

- **Task 优先双模式：** 新增 `claudeHub.todo.preferSource`（默认 `auto`）。Task 与 Checklist 各自有数据就显示；两者都有时以 Task 为主列表，不强制用另一边填空。
- **Task 工具开关与持久化：** 可选设置 `claudeHub.todoTools.enabled` 与命令「切换 Task 工具环境变量」，将 `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` 写入工作区 `.claude/settings.local.json`（仅 env，不装 Hub hooks），对新会话生效。
- **计价与费用：** 内置 Anthropic 价表，支持 `claudeHub.modelPricing` / `modelAliases` 覆盖；仪表盘费用展示更准确；新增工作区费用报告（markdown）。
- **Hub 会话能力（A/B）：** 会话置顶、标签、导出、时间线、分叉对比、重命名、恢复、handoff、转录搜索、后台任务入口、工作区费用报告等。
- **计划与原生 Task：** 磁盘计划合并、项目 `plan_checklist` 策略、原生 `~/.claude/tasks` 与 TaskCreate/Update/List 集成；待办展示去噪与状态芯片。
- **告警：** 可选上下文占用 / 闲置仍有工具运行等会话告警。
- **UI 打磨：** 顶栏图标工具栏、过滤按钮仅图标（无 WS/工作区短文案）、活跃态柔和样式；窄侧栏与待办卡片继续打磨。
- **移除代理配置 UI：** 仪表盘不再提供 Proxy / Base URL 保存表单（避免误改环境）；环境仍可通过 Claude 自身设置管理。
- 订阅额度读取改为默认关闭（`fetchSubscriptionUsage: false`，需显式开启）。
- 补充计价、Task 集成、时间线、转录搜索、工作区费用等回归测试。

### English

- **Task-first dual mode:** New `claudeHub.todo.preferSource` (default `auto`). Show Task and/or Checklist when each has data; Task is primary when both exist — never force-fill the other side.
- **Task tools toggle + persistence:** Opt-in `claudeHub.todoTools.enabled` and “Toggle Task Tools Env” write `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` into workspace `.claude/settings.local.json` (env only, no Hub hooks); applies to new Claude Code sessions.
- **Pricing & cost:** Built-in Anthropic rate table with `claudeHub.modelPricing` / `modelAliases` overrides; clearer dashboard cost display; workspace cost report (markdown).
- **Hub session features (A/B):** Pin, tags, export, timeline, fork compare, rename, resume, handoff, transcript search, background-tasks entry, workspace cost report, and related commands.
- **Plans & native tasks:** Disk plan merging, project `plan_checklist` policy, native `~/.claude/tasks` plus TaskCreate/Update/List integration; cleaner todo display and status chips.
- **Alerts:** Optional session alerts for context pressure and idle-with-tools.
- **UI polish:** Icon top toolbar; filter stays icon-only (no WS/workspace short label) with a softer active state; continued narrow-sidebar and todo-card polish.
- **Removed proxy UI:** Dashboard no longer offers a Proxy / Base URL save form (avoids accidental env changes); manage environment via Claude’s own settings.
- Subscription quota fetch defaults to off (`fetchSubscriptionUsage: false`; opt-in).
- Added regression coverage for pricing, task integration, timeline, transcript search, and workspace cost.

## [0.2.12] - 2026-09-30

### 中文

- 优化窄侧边栏布局：使用 container queries 和兼容 fallback，改进 Token 指标、HUD 信息及文档按钮在窄屏下的排列。
- 修复待办任务标题和操作按钮在窄屏下发生文字断行、碰撞的问题。
- 完善 Todo／Task 工作流状态同步：支持从计划文件的成功 `Edit` 操作中恢复复选框进度，正确处理乱序工具结果。
- 修复新一轮用户提示开始后已完成待办残留的问题，同时保留未完成和当前进行中的任务。
- 将进行中待办的方形 `🔄` emoji 替换为细线圆环，并修复 Cursor Webview 中圆环动画被 `prefers-reduced-motion` 意外停用的问题。
- 增加窄屏布局、待办生命周期、计划进度回放及圆环动画的回归测试。

### English

- Improved narrow-sidebar layout with container queries and a compatible fallback for Token metrics, HUD information, and document buttons.
- Fixed todo headers and action buttons wrapping or colliding in narrow sidebars.
- Improved Todo／Task workflow synchronization by replaying checklist progress from successful plan-file `Edit` operations and handling out-of-order tool results correctly.
- Fixed completed todos lingering after a new user prompt while preserving incomplete and currently running tasks.
- Replaced the square `🔄` emoji with a lightweight circular spinner, and fixed the spinner animation being unintentionally disabled by `prefers-reduced-motion` in Cursor Webviews.
- Added regression coverage for narrow layouts, todo lifecycles, plan-progress replay, and spinner animation.

[0.2.14]: https://github.com/flylink-code/claude-hub-for-vscode/releases/tag/v0.2.14
[0.2.12]: https://github.com/flylink-code/claude-hub-for-vscode/releases/tag/v0.2.12
[0.2.11]: https://github.com/flylink-code/claude-hub-for-vscode/releases/tag/v0.2.11