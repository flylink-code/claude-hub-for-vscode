# Claude Hub for VS Code

[English](#english) · [简体中文](#zh-cn)

<a id="english"></a>

## English

Monitor, manage, and visualize **Claude Code** sessions inside VS Code. Claude Hub provides a single-page dashboard, a status-bar HUD, a session browser with search, paging, fork, and delete, plus controls for MCP servers and skills.

### Features

> **Todo source:** Setting `claudeHub.todo.preferSource` defaults to `auto` (dual: Task and/or Checklist when present; Task primary if both) (official Task tools + `~/.claude/tasks`). Checklist/markdown fill is off unless you choose `checklist` or set project-doc `plan_checklist` to `required`.


- **Dashboard.** A vertical accordion replaces a tab bar. The live panel stays open and shows the session indicator, context-window progress, input / cache / write / output tokens, estimated cost, and the Git branch. Tool activity and the todo list expand only while they are in use.
- **Todo & Task Workflows.** Automatically parses live task checklists from `TodoWrite`, `TaskCreate`/`TaskUpdate`, or assistant Markdown task lists (`- [ ]`, `- [/]`, `- [x]`). Displays progress ratios, status indicators, and safely clears tasks on `/clear`. Hub dashboard todos track TaskCreate/Update/List and `~/.claude/tasks` — not the slash `/tasks` background-jobs view. Clear only hides dashboard items.
- **Subagent Map.** Visualizes subagents launched by Claude Code with live execution status, duration chips, token usage, tool invocations, and git worktrees. Automatically keeps open when running and collapses when finished.
- **Sessions.** Filter by all sessions, the current workspace, or active sessions. Search by project, title, or Git branch, and page through long histories. Fork copies a session’s full transcript into a new UUID so you can open it or resume it with `claude --resume`. Delete removes a session record.
- **Workspace scope.** Current-workspace mode follows the folder open in VS Code. All-sessions mode lists every Claude Code session on the machine.
- **MCP and skills.** Claude Hub lists configured MCP servers and can enable or disable them. Installed skills are listed, and `SKILL.md` opens in the editor.
- **Environment.** Open the global `~/.claude/settings.json`, and open or generate the project `AGENTS.md` / `CLAUDE.md` from the dashboard.
- **Status bar.** Highly customizable status-bar HUD with presets (`compact`, `minimal`, `detailed`, `hud`, or `custom`) and fine-grained toggles for mini progress bar, model name, tokens format, cost estimation, git branch, todos, running tool timing, and alignment. Optimized hover tooltip ensures zero flicker during live countdowns.

### Commands

Open the Command Palette with `Ctrl+Shift+P` / `Cmd+Shift+P`.

| Command | Action |
| --- | --- |
| `Claude Hub: Refresh Claude Code Status` | Rescan sessions and subscription usage |
| `Claude Hub: Toggle Workspace / All Sessions Filter` | Switch between the current workspace and all sessions |
| `Claude Hub: Switch Focused Claude Session` | Pick the session shown in the dashboard |
| `Claude Hub: Fork Claude Session` | Copy the current session into a new session |
| `Claude Hub: Delete Claude Session` | Delete a session record |
| `Claude Hub: Open Active Session Transcript` | Open the session `.jsonl` transcript |
| `Claude Hub: Open Claude Code Settings` | Open `~/.claude/settings.json` |
| `Claude Hub: Configure Status Bar Style` | Quick switch presets or tweak status bar display |

### Settings

```jsonc
{
  // "currentWorkspace" or "all"
  "claudeHub.filterMode": "currentWorkspace",

  "claudeHub.showStatusBarItem": true,

  // Hide the status bar item while no Claude Code conversation is active
  "claudeHub.statusBar.hideWhenInactive": true,

  // Status bar display presets: "compact" | "minimal" | "detailed" | "hud" | "custom"
  "claudeHub.statusBar.preset": "compact",

  // Status bar position: "right" or "left"
  "claudeHub.statusBar.position": "right",

  // Context format in custom mode: "percent" | "tokens" | "both"
  "claudeHub.statusBar.contextFormat": "percent",

  // Fine-grained toggles for custom mode
  "claudeHub.statusBar.showProgressBar": false,
  "claudeHub.statusBar.showModel": true,
  "claudeHub.statusBar.showCost": false,
  "claudeHub.statusBar.showGitBranch": false,
  "claudeHub.statusBar.showTodos": false,
  "claudeHub.statusBar.showTools": true,

  // Seconds without activity before a session is idle. 0 never marks a session idle.
  "claudeHub.idleTimeout": 180,

  // How often to rescan session files, in seconds.
  "claudeHub.refreshInterval": 15,

  // Context-window colors: yellow at 50%, red at 75%.
  "claudeHub.warningThreshold": 50,
  "claudeHub.dangerThreshold": 75,

  // Exact model id -> token limit.
  "claudeHub.modelContextLimits": {
    "claude-3-7-sonnet": 200000
  },

  // Opt-in: read subscription quota from local Claude Code OAuth (off by default).
  "claudeHub.fetchSubscriptionUsage": false,

  // Claude config directory. Empty uses ~/.claude.
  "claudeHub.configDir": "",

  // "auto" follows VS Code, or set "zh-CN" or "en".
  "claudeHub.language": "auto",

  // Todo source: "auto" (dual, Task-primary) | "tasks" | "checklist" | "todoWrite"
  "claudeHub.todo.preferSource": "auto",

  // Opt-in: persist CLAUDE_CODE_ENABLE_TODO_TOOLS=1 in workspace .claude/settings.local.json
  "claudeHub.todoTools.enabled": false,

  // Optional USD-per-MTok overrides keyed by model id
  "claudeHub.modelPricing": {}
}
```


### Output speed (tok/s)

The dashboard and non-minimal status-bar presets show a **latest completed response average** for the focused session. IDE sessions are measured automatically from the transcript records Claude Code already writes: unique output tokens of a completed API request divided by the elapsed time between its request-start and last-response records. No toggle, proxy, injection, or restart is required for IDE sessions.

This is a **real-request average-time estimate**. It includes first-token wait, thinking, and possible retries, so it is not live decode speed or a per-token streaming rate. While a new request is in progress the tooltip marks it as sampling and labels any retained reading as "last"; the monitor label stays fixed and unchanged speed content is not rewritten on repeated refreshes, avoiding flicker; with no usable sample it shows `—` rather than claiming 0 tok/s. Session-record speed is measured per model and resets on `/clear`, model changes, or incomplete records, and sub-500ms samples are not published. When the transcript has no verified completion boundary, a plain-text final response may be published only after the next associated user message confirms the previous request has finished, so some hosts show the sample a little later; `stop_reason` alone is not treated as completion.

The estimate depends on transcript fields observed in current Claude Code IDE sessions (`api-request` / `assistant` timestamps and `message.usage.output_tokens`). These are **not a guaranteed stable public API**. If a version omits, reorders, or changes them, speed degrades to `—` with an "unsupported" note while all other Hub features keep working. Model names and sources are rendered as text and escaped before entering the dashboard.

### Terminal speed collection (optional)

The **Claude Hub: Enable Terminal Speed Collection (tok/s)** command (or the panel button when no reading is available) only manages terminal `statusLine` sampling. It backs up and updates the configured Claude user `settings.json`, wraps and forwards an existing status-line command unchanged (stdin/stdout), and stores only allowlisted counters, model and session/path identifiers under `<configDir>/hub-speed/`. It requires Node.js 18+ and a host that executes `statusLine`; project/local overrides or disabled hooks can prevent collection. If it is already enabled but has no sample yet, the panel says so instead of repeatedly offering the enable button.

Terminal samples share the same display and are identified in the status-bar tooltip. The sample files contain no prompts, response content, or credentials, and the collector makes no network requests. Configuration backups contain the original settings (potentially including secrets); keep `<configDir>/hub-speed/backups/` private. Use **Claude Hub: Disable Terminal Speed Collection (tok/s)** to restore the previous status line; externally edited status-line configuration is never overwritten. Disabling terminal collection does **not** disable automatic IDE session-record measurement. Uninstalling the VSIX does not run the restore command, so disable terminal collection before uninstalling.

### Project docs (AGENTS.md / CLAUDE.md)


### Development

```bash
npm install
npm run compile
npm test

# Windows
.\scripts\package.ps1

# macOS / Linux
./scripts/package.sh
```

### Acknowledgements

- **[claude-context-bar](https://github.com/edenaion/claude-context-bar)** by [Ed Zisk (@edenaion)](https://github.com/edenaion) — status-bar context monitoring, path encoding, and multi-workspace session mapping.
- **[claude-hud](https://github.com/jarrodwatts/claude-hud)** by [Jarrod Watts (@jarrodwatts)](https://github.com/jarrodwatts) — terminal HUD layout, JSONL transcript parsing, live tool tracking, and cost calculation.
- **[claude-code-manager](https://github.com/vishalguptax/claude-code-manager)** by [Vishal Gupta (@vishalguptax)](https://github.com/vishalguptax) — session browser, search across many sessions, and the fork workflow.

<a id="zh-cn"></a>

## 简体中文

在 VS Code 里监控、管理并查看 **Claude Code** 会话。Claude Hub 提供单页仪表盘、状态栏 HUD、可搜索和分页的会话列表（支持分叉与删除），以及 MCP 服务和技能的管理。

### 功能

> **待办来源：** 设置 `claudeHub.todo.preferSource` 默认为 `auto`（双模式：有 Task 和/或 Checklist 则显示；两者都有时以 Task 为主）。Checklist/markdown 填充仅在选择 `checklist` 或项目文档 `plan_checklist` 为 `required` 时启用。

- **仪表盘。** 用纵向手风琴代替横向标签。实时面板保持展开，显示会话指示、上下文进度、输入 / 缓存命中 / 写入 / 输出 Token、预估费用和 Git 分支。工具耗时和待办清单只在有内容时展开。
- **待办任务工作流 (Todo)。** 自动实时捕获与解析 `TodoWrite`、`TaskCreate`/`TaskUpdate` 以及 Assistant Markdown 任务清单（待办 `[ ]`、进行中 `[/]`、已完成 `[x]`），实时呈现进度百分比与状态指示，并在 `/clear` 时自动重置清空。仪表盘待办跟踪 TaskCreate/Update/List 与 `~/.claude/tasks`，不是斜杠 `/tasks` 后台任务视图；Clear 仅隐藏仪表盘项。
- **子代理拓扑图谱 (Agent Map)。** 深度追踪与呈现 Claude Code 启动的 Subagent（子代理），展示执行状态、实时运行时长、Token 开销、工具调用次数与 Git Worktree 分支，支持运行期间智能自动展开、全部完成后自动收起归档。
- **会话。** 可按全部、当前工作区或活跃中过滤，并按项目名、标题或 Git 分支搜索，长列表分页浏览。分叉会把会话的完整记录复制为新的 UUID，可直接打开，或在终端用 `claude --resume` 继续。删除会移除一条会话记录。
- **工作区范围。** 当前工作区模式跟随 VS Code 正在打开的文件夹。全部会话模式列出本机所有 Claude Code 会话。
- **MCP 与技能。** 列出已配置的 MCP 服务，并可启停。已安装技能会列出来，`SKILL.md` 可在编辑器中打开。
- **环境。** 从仪表盘打开全局 `~/.claude/settings.json`，并打开或生成项目里的 `AGENTS.md` / `CLAUDE.md`。
- **状态栏。** 高度可定制的状态栏 HUD，支持多种预设风格（紧凑 `compact`、极简 `minimal`、详细 `detailed`、经典 HUD `hud`、自定义 `custom`），并提供微型进度条、模型名称、Token 格式、费用预估、Git 分支、待办进度、工具耗时及左右对齐等细粒度开关。经过深度防抖优化，任务执行走秒期间悬浮卡片绝对稳定、零闪烁。

### 命令

用 `Ctrl+Shift+P` / `Cmd+Shift+P` 打开命令面板。

| 命令 | 作用 |
| --- | --- |
| `Claude Hub: 刷新 Claude Code 状态` | 重新扫描会话和订阅额度 |
| `Claude Hub: 切换当前工作区 / 全局所有会话过滤` | 在当前工作区与全部会话之间切换 |
| `Claude Hub: 切换聚焦查看的 Claude 会话` | 选择仪表盘当前显示的会话 |
| `Claude Hub: 分叉当前会话 (Fork Session)` | 把当前会话复制为一条新会话 |
| `Claude Hub: 删除 Claude 会话记录` | 删除一条会话记录 |
| `Claude Hub: 打开当前会话底层运行日志` | 打开该会话的 `.jsonl` 记录 |
| `Claude Hub: 打开 Claude Code 配置中心` | 打开 `~/.claude/settings.json` |
| `Claude Hub: 配置状态栏显示风格` | 快速切换预设或细粒度微调状态栏显示项 |

### 设置

```jsonc
{
  // "currentWorkspace"（仅当前工作区）或 "all"（全部会话）
  "claudeHub.filterMode": "currentWorkspace",

  // 是否显示状态栏
  "claudeHub.showStatusBarItem": true,

  // 没有 Claude Code 对话在进行时隐藏状态栏
  "claudeHub.statusBar.hideWhenInactive": true,

  // 状态栏预设风格："compact"（紧凑） | "minimal"（极简） | "detailed"（详细） | "hud"（经典 HUD） | "custom"（自定义）
  "claudeHub.statusBar.preset": "compact",

  // 状态栏对齐位置："right"（右侧）或 "left"（左侧）
  "claudeHub.statusBar.position": "right",

  // 自定义模式下上下文使用率格式："percent" | "tokens" | "both"
  "claudeHub.statusBar.contextFormat": "percent",

  // 自定义模式细粒度开关
  "claudeHub.statusBar.showProgressBar": false,
  "claudeHub.statusBar.showModel": true,
  "claudeHub.statusBar.showCost": false,
  "claudeHub.statusBar.showGitBranch": false,
  "claudeHub.statusBar.showTodos": false,
  "claudeHub.statusBar.showTools": true,

  // 闲置判定秒数，默认 180。设为 0 表示永不标为闲置。
  "claudeHub.idleTimeout": 180,

  // 重新扫描会话文件的间隔（秒）
  "claudeHub.refreshInterval": 15,

  // 上下文占用颜色：50% 黄色，75% 红色
  "claudeHub.warningThreshold": 50,
  "claudeHub.dangerThreshold": 75,

  // 模型 ID -> Token 上限
  "claudeHub.modelContextLimits": {
    "claude-3-7-sonnet": 200000
  },

  // 可选：从本机 Claude Code OAuth 读取订阅配额（默认关闭）。
  "claudeHub.fetchSubscriptionUsage": false,

  // Claude 配置目录，留空则为 ~/.claude
  "claudeHub.configDir": "",

  // "auto" 跟随 VS Code，也可设为 "zh-CN" 或 "en"
  "claudeHub.language": "auto",

  // 待办来源："auto"（双模式，Task 优先）| "tasks" | "checklist" | "todoWrite"
  "claudeHub.todo.preferSource": "auto",

  // 可选：将 CLAUDE_CODE_ENABLE_TODO_TOOLS=1 写入工作区 .claude/settings.local.json
  "claudeHub.todoTools.enabled": false,

  // 可选：按模型 ID 覆盖美元/百万 token 单价
  "claudeHub.modelPricing": {}
}
```


### 输出速率（tok/s）

仪表盘及非极简 VS Code 状态栏预设会显示当前聚焦会话的**最近一次已完成响应的平均速率**。IDE 会话由 Claude Code 已写入的会话记录自动测速：同一已完成 API 请求的去重输出 Token 数除以请求开始记录至最后响应记录之间的耗时。IDE 会话无需开关、代理、注入或重启。

这是**真实请求的平均时间估算**，包含首 Token 等待、思考以及可能的重试，因此不是实时解码速度或逐 Token 流式速率。新请求进行中时，悬停提示标记“采样中”和保留读数的“上次”状态；监控行标签保持固定，重复刷新不改写相同内容，避免闪烁；没有可用样本时显示 `—`，不会声称速率为 0 tok/s。测速按模型隔离，并在 `/clear`、切换模型或记录不完整时重置；不足 500ms 的样本不发布。若会话记录中缺少经验证的完成边界，纯文本最终响应可能要等下一条关联用户消息确认上一请求已结束后才发布，因此部分宿主会稍晚显示样本；仅凭 `stop_reason` 不会被当作完成证据。

该估算依赖当前 Claude Code IDE 会话中观察到的记录字段（`api-request` / `assistant` 时间戳与 `message.usage.output_tokens`）。这些**不是保证稳定的公开 API**。若某个版本缺失、乱序或调整了字段，速率会降级为 `—` 并提示“不支持”，其余 Hub 功能继续工作。模型名与来源均按文本渲染，并在进入仪表盘前转义。

### 终端速率采集（可选）

**Claude Hub: 启用终端速率采集 (tok/s)** 命令（或没有可用读数时的面板按钮）只管理终端 `statusLine` 采样：备份并修改当前 Claude 配置目录的用户 `settings.json`，包装已有状态栏命令并透传原始 stdin / stdout，仅在 `<configDir>/hub-speed/` 保存白名单计数、模型及会话 / 路径标识。需要 Node.js 18+ 和执行 `statusLine` 的宿主；项目 / 本地状态栏覆盖或禁用 hooks 也可能阻止采集。若已启用但尚无样本，面板会提示已启用并等待，不再重复展示启用按钮。

终端样本与 IDE 记录样本共用同一展示位置，并在状态栏提示中标注来源。采样文件不保存提示词、响应正文或凭据，采集器不发起网络请求。配置备份包含原始设置（可能含密钥），请妥善保护 `<configDir>/hub-speed/backups/`。执行 **Claude Hub: 停用终端速率采集 (tok/s)** 恢复原状态栏；外部修改过的状态栏不会被强制覆盖。停用终端采集**不会**停用 IDE 会话记录自动测速。卸载 VSIX 不会自动运行恢复操作，请在卸载前停用终端采集。

### 项目文档（AGENTS.md / CLAUDE.md）


### 本地开发

```bash
npm install
npm run compile
npm test

# Windows
.\scripts\package.ps1

# macOS / Linux
./scripts/package.sh
```

### 致谢

- **[claude-context-bar](https://github.com/edenaion/claude-context-bar)**，作者 [Ed Zisk (@edenaion)](https://github.com/edenaion)。状态栏上下文监控、路径编解码，以及多工作区会话对应关系来自这个项目。
- **[claude-hud](https://github.com/jarrodwatts/claude-hud)**，作者 [Jarrod Watts (@jarrodwatts)](https://github.com/jarrodwatts)。终端 HUD 布局、JSONL 记录解析、实时工具跟踪和费用计算来自这个项目。
- **[claude-code-manager](https://github.com/vishalguptax/claude-code-manager)**，作者 [Vishal Gupta (@vishalguptax)](https://github.com/vishalguptax)。会话列表、大量会话检索，以及分叉流程来自这个项目。
