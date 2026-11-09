# Changelog

本文件记录 Claude Hub for VS Code 的版本变更。

## [0.2.25] - 2026-11-09

### 中文

- **推理等级显示：** Dashboard、会话列表和状态栏改为读取各会话日志最近记录的实际 effort，修复当前对话选择 `medium` 却显示全局默认 `high` 的问题。
- **会话隔离与降级：** 支持日志记录的会话中途等级变更，忽略子代理参数；日志未记录 effort 时不显示等级，不再以全局默认配置冒充会话实际值。

### English

- **Effort display:** The dashboard, session list, and status bar now use the latest effort recorded in each session transcript, fixing sessions selected as `medium` being displayed with the global `high` default.
- **Session isolation and fallback:** Tracks recorded effort changes within a session and ignores subagent arguments. When effort is absent from the transcript, no level is shown instead of presenting the global default as the session's actual value.

## [0.2.24] - 2026-11-07

### 中文

- **输出速率：** IDE 会话由真实请求记录自动估算最近一次已完成响应的平均 tok/s（去重输出 Token / 请求开始至最后响应记录的耗时），无需开关；包含首 Token 等待与思考时间，不是实时解码速度。
- **速率防闪烁：** 监控行标签固定，仅在内容变化时更新速率 DOM，避免会话与配置刷新反复重写文本；“上次 / 采样中”状态保留在悬停提示。
- **采样状态：** 新请求进行中在提示中标记“采样中”，保留的读数标为“上次”；无样本显示 `—`，模型变化、`/clear`、计数重置或记录不完整时重建 / 降级，不伪造 0 速率。
- **私有字段降级：** 测速依赖观察到的 `api-request` / `assistant` / `usage` 字段而非稳定公开 API；字段缺失或变化时降级为无数据并说明，其他功能不受影响。
- **终端采集（可选）：** 原有启用 / 停用命令仅管理终端 `statusLine` 采样，已启用但无样本时不再诱导重复启用；停用终端采集不影响 IDE 自动测速。需要 Node.js 18+ 和执行 `statusLine` 的宿主，不采集正文、提示词或凭据，不联网。

### English

- **Output speed:** IDE sessions automatically estimate the latest completed response average from real request records (deduplicated output tokens / elapsed time from request-start to last-response records), with no toggle. Includes first-token wait and thinking time; not live decode speed.
- **Speed anti-flicker:** The monitor label stays fixed and speed DOM properties update only when content changes, avoiding repeated text rewrites during session/config refreshes. Last/sampling status remains in the tooltip.
- **Sampling states:** A request in progress is marked as sampling in the tooltip and any retained reading is labelled "last"; without a sample the UI shows `—`. Readings reset or degrade on model changes, `/clear`, counter resets, or incomplete records, and never report a fake zero.
- **Private-field degradation:** The estimate relies on observed `api-request` / `assistant` / `usage` fields, not a stable public API. Missing or changed fields degrade to no data with an explanation while other features keep working.
- **Terminal collection (optional):** The existing enable/disable commands now manage only terminal `statusLine` sampling, and an already-enabled collector waits for a sample instead of offering setup again. Disabling terminal collection does not affect automatic IDE measurement. Requires Node.js 18+ and a host that executes `statusLine`; collects no content, prompts or credentials and makes no network requests.

## [0.2.23] - 2026-11-06

### 中文

- **卡片圆角：** 分区标题背景改为跟随外层圆角（折叠时四角贴合），hover / 聚焦时顶部左右两角的蓝色边框不再出现断口。
- **四角渲染：** 分区卡片、会话卡片、指标气泡与运行条的背景限制在内边距内绘制，消除圆角外侧的 1px 抗锯齿残边。

### English

- **Card corners:** Section headers now follow the outer radius (all four corners when collapsed), so the hover/focus border no longer breaks at the top-left and top-right corners.
- **Corner rendering:** Section cards, session cards, metric bubbles, and the running bar clip their backgrounds to the padding box, removing the 1px anti-aliasing fringe outside rounded corners.

## [0.2.22] - 2026-11-06

### 中文

- **中转站上下文窗口：** 识别 `provider/model` 形式的中转站模型 id（如 `antigravity/claude-sonnet-5-5`、`kiro/claude-sonnet-5.5`），按模型家族正确计算上下文上限，不再一律回退为 200k。
- **模型上限覆盖：** `claudeHub.modelContextLimits` 现在同时匹配带或不带 provider 前缀的模型 id。
- **对话内切换模型：** 以最新的显式模型选择（`/model`）为准；中转站固定回报的默认响应模型不再覆盖当前选择，状态栏与 Dashboard 同步更新。
- **费用统计：** 会话费用按切换后的实际模型估算。

### English

- **Relay context windows:** Recognizes `provider/model` relay ids such as `antigravity/claude-sonnet-5-5` and `kiro/claude-sonnet-5.5`, resolving the context limit by model family instead of falling back to 200k.
- **Model limit overrides:** `claudeHub.modelContextLimits` now matches ids with or without the provider prefix.
- **Mid-session model switch:** The latest explicit picker choice (`/model`) wins; the default model that relays pin to assistant responses no longer masks the switch, and the status bar and dashboard stay in sync.
- **Cost estimates:** Session cost is estimated from the model actually in use after a switch.

## [0.2.21] - 2026-11-04

### 中文

- **工作区原生记忆：** 可信工作区默认使用 `.claude/memory/`，通过合并 `.claude/settings.local.json` 中的原生 `autoMemoryDirectory` 配置与 Claude Code 保持一致；重新启动 Claude Code 会话后生效。
- **记忆目录设置：** 新增 `claudeHub.memory.useWorkspace`，支持撤销工作区路径覆盖；保留已有自定义目录和其他配置，不迁移或删除历史记忆。
- **记忆面板：** 按原生配置读取记忆目录，支持用户、项目及本地配置优先级和 `~/` 路径；工作区子目录会话使用对应工作区配置。

### English

- **Native workspace memory:** Trusted workspaces default to `.claude/memory/`, configured through the native `autoMemoryDirectory` in `.claude/settings.local.json`. Restart Claude Code sessions to apply.
- **Memory directory setting:** Added `claudeHub.memory.useWorkspace` to remove the workspace override when disabled. Existing custom paths and unrelated settings are preserved; historical memory is not moved or deleted.
- **Memory panel:** Reads native memory directory settings with user, project, and local precedence and home-directory expansion; sessions in workspace subdirectories use their workspace configuration.

## [0.2.20] - 2026-11-04

### 中文

- **界面优化：** 整理实时监控、顶部工具栏和会话卡片的视觉层级，改善主题与窄侧栏适配。
- **会话操作：** 常用操作保留在卡片上，其他操作收纳到支持键盘导航的更多菜单；删除仍需要确认。
- **无障碍：** 主分区支持键盘展开、收起及焦点提示。
- **会话检索与主题：** 筛选计数与搜索结果一致，搜索无结果可一键清空；会话卡片、状态标签及运行提示改用 VS Code 主题色，改善浅色与高对比主题适配。
- **任务列表与搜索框：** 任务卡片、进行中状态、模式标签和会话搜索框跟随 VS Code 主题，避免浅色界面出现固定深色背景。
- **界面状态恢复：** 重新打开 Dashboard 后恢复主分区折叠、会话筛选和搜索、扩展页签与搜索及滚动位置；避免首次数据刷新覆盖置顶／活跃筛选。

### English

- **Interface polish:** Refined the live monitor, toolbar, and session cards with improved theme and narrow sidebar support.
- **Session actions:** Kept common actions on each card and moved the rest into a keyboard-accessible menu; deletion still requires confirmation.
- **Accessibility:** Added keyboard toggles and focus indicators for the main sections.
- **Session search and themes:** Search and filter counts now agree, empty searches can be cleared, and session cards, status pills, and activity banners use VS Code theme colors.
- **Tasks and search:** Task cards, in-progress states, mode chips, and session search now follow the host theme rather than fixed dark fills.
- **Dashboard state:** Reopening the dashboard restores section collapse, session filters and search, extension tabs and search, and scroll position; initial session updates no longer override restored pinned or active filters.

## [0.2.19] - 2026-11-03

### 中文

- **扩展与记忆面板重构：** 新增顶部分类标签（`全部` / `⚡ 技能` / `🧩 插件` / `🔌 MCP` / `🧠 记忆` / `🤖 代理`）与实时关键字搜索框；五大子模块支持独立折叠/展开，空模块默认自动收起。
- **技能与插件多条目优化：** 新增技能来源范围切换（`全部` / `本地` / `插件`）；插件提供的技能按插件分组折叠展示（默认收起，搜索或从插件卡片点击 `⚡ N skills` 时自动定位展开）；修复 `SKILL.md` 多行 YAML 块标量（`>-` / `|`）描述被解析为 `>-` 的问题。
- **项目记忆（Auto Memory）完整管理：** 支持在面板内联表单（4 宫格分类胶囊 + 全宽输入行）或顶部向导中新建、编辑记忆条目，支持移除记忆文件并自动清理或一键同步 `MEMORY.md` 索引。
- **插件、自定义代理、`/loop` 与 Worktree 支持：** 支持查看与启停已安装 Claude Plugins、浏览 `.claude/agents/*.md` 自定义代理、实时监控 `/loop`（`ScheduleWakeup` / `CronCreate`）倒计时状态，以及通过顶栏按钮或 `claudeHub.startWorktreeSession` 快速在 Git Worktree 中启动会话（`claude -w`）。

### English

- **Extensions & Memory panel redesign:** Added top category tabs (`All` / `Skills` / `Plugins` / `MCP` / `Memory` / `Agents`) and instant keyword search; each subsection is independently collapsible, and empty sections auto-collapse by default.
- **Skills & Plugins scalability:** Added skill scope filter pills (`All` / `Local` / `Plugin`), collapsible per-plugin skill folders, and clickable `⚡ N skills` jump pills on plugin cards; fixed multi-line YAML block scalar (`>-` / `|`) descriptions in `SKILL.md`.
- **Auto Memory lifecycle management:** Added an inline creation/editing form with a 4-pill category selector (`project` / `feedback` / `user` / `reference`), memory entry removal with automatic `MEMORY.md` cleanup, and one-click `MEMORY.md` index sync.
- **Plugins, Custom Agents, `/loop`, and Worktree support:** Added installed Claude plugin toggles, custom agent discovery, live `/loop` (`ScheduleWakeup` / `CronCreate`) status banner, and `claudeHub.startWorktreeSession` (`claude -w`) quick launch.

## [0.2.18] - 2026-10-15

### 中文

- **上下文用量：** 按模型名称使用公开的上下文容量。`gemini-3.8` 与 `gemini-4-argon` 为 1,048,576，`gpt-5.6` / `gpt-6` 为 1,050,000，`deepseek-v4` 与现行 Claude 为 1M，Haiku 4.5 及更早模型为 200K。
- **当前模型：** 进行中的会话显示它实际在用的模型。全局选择只在会话还停在中转站默认模型、或还没有自己的模型时生效。

### English

- **Context usage:** The percentage uses the published context window for the model name. `gemini-3.8` and `gemini-4-argon` are 1,048,576, `gpt-5.6` / `gpt-6` are 1,050,000, `deepseek-v4` and current Claude models are 1M, and Haiku 4.5 and older models are 200K.
- **Selected model:** An in-progress session shows the model it is actually running. The global picker applies only while the session is still on the relay default, or has no model of its own.

## [0.2.17] - 2026-10-14

### 中文

- **当前模型：** 在 Claude Code 里切换模型后立刻显示新模型，不必等这一轮对话成功。中转站的 `ANTHROPIC_MODEL` 只在还没选择具体模型时作为默认。
- **后台任务：** 斜杠 `/tasks` 里已经结束的任务会从侧边栏去掉，不再保留最近完成的记录。
- **会话任务：** 当前对话没有待办时，自动隐藏「会话任务」栏，不再显示 `0/0`。

### English

- **Selected model:** Switching models in Claude Code updates the label immediately, without waiting for a successful turn. `ANTHROPIC_MODEL` is only the relay default when no concrete model is picked.
- **Background tasks:** Finished slash `/tasks` jobs leave the sidebar instead of staying as recent completions.
- **Session tasks:** The session-task section hides when the current conversation has no todos, instead of showing `0/0`.

## [0.2.16] - 2026-10-14

### 中文

- **协作代理拓扑：** 代理名称、状态芯片和任务说明分行显示，避免窄侧栏里 worktree 名称和说明叠在一起。

### English

- **Agent map:** The agent name, status chips, and task description each stay on their own line, so a long worktree id no longer covers the description in a narrow sidebar.

## [0.2.15] - 2026-10-14

### 中文

- **会话卡片：** 操作按钮按内容宽度换行，Token / 模型与分支时间不再叠在一起。
- **会话待办：** 默认只显示官方 Task（TaskCreate / TaskUpdate / TaskList 与 `~/.claude/tasks`）。Checklist 不再填入会话待办。旧版 TodoWrite 仅在没有官方 Task 时显示，且不能覆盖已有 Task。
- **高级配置：** 开关同时写入 `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` 与 `CLAUDE_CODE_ENABLE_TASKS=1`。前者让未识别模型（如 gpt6-luna）带上任务工具，后者选用最新的 TaskCreate / TaskUpdate / TaskList。
- **后台任务：** 侧边栏和状态栏同步当前对话的斜杠 `/tasks`。只统计仍在运行的 Claude Code 进程；`background_tasks_changed` 会整份替换任务列表，进程退出后列表为空。
- **当前模型：** 状态栏跟随 Claude Code 输入框里选中的模型。`ANTHROPIC_MODEL` 优先于过期的 `settings.model`，不再显示上一轮回复用过的模型。

### English

- **Session cards:** Action buttons wrap to their content width, and token, model, branch, and time no longer overlap.
- **Session todos:** Official Task mode is the default (TaskCreate / TaskUpdate / TaskList and `~/.claude/tasks`). Checklists are no longer session todos. Legacy TodoWrite appears only when no official tasks exist, and cannot replace them.
- **Advanced settings:** The toggle writes `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` and `CLAUDE_CODE_ENABLE_TASKS=1`. The first exposes task tools on unrecognized models such as gpt6-luna; the second selects TaskCreate / TaskUpdate / TaskList.
- **Background tasks:** The sidebar and status bar mirror slash `/tasks` for the current conversation. Only a running Claude Code process counts; `background_tasks_changed` replaces the list, and the list is empty after the process exits.
- **Selected model:** The status bar follows the model chosen in the Claude Code composer. `ANTHROPIC_MODEL` wins over a stale `settings.model`, instead of the previous turn's response model.

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

[0.2.16]: https://github.com/flylink-code/claude-hub-for-vscode/releases/tag/v0.2.16
[0.2.15]: https://github.com/flylink-code/claude-hub-for-vscode/releases/tag/v0.2.15
[0.2.14]: https://github.com/flylink-code/claude-hub-for-vscode/releases/tag/v0.2.14
[0.2.12]: https://github.com/flylink-code/claude-hub-for-vscode/releases/tag/v0.2.12
[0.2.11]: https://github.com/flylink-code/claude-hub-for-vscode/releases/tag/v0.2.11