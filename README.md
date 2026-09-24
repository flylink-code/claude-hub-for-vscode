# Claude Hub for VS Code

[English](#english) · [简体中文](#zh-cn)

<a id="english"></a>

## English

Monitor, manage, and visualize **Claude Code** sessions inside VS Code. Claude Hub provides a single-page dashboard, a status-bar HUD, a session browser with search, paging, fork, and delete, plus controls for MCP servers and skills.

### Features

- **Dashboard.** A vertical accordion replaces a tab bar. The live panel stays open and shows the session indicator, context-window progress, input / cache / write / output tokens, estimated cost, and the Git branch. Tool activity and the todo list expand only while they are in use.
- **Sessions.** Filter by all sessions, the current workspace, or active sessions. Search by project, title, or Git branch, and page through long histories. Fork copies a session’s full transcript into a new UUID so you can open it or resume it with `claude --resume`. Delete removes a session record.
- **Workspace scope.** Current-workspace mode follows the folder open in VS Code. All-sessions mode lists every Claude Code session on the machine.
- **MCP and skills.** Claude Hub lists configured MCP servers and can enable or disable them. Installed skills are listed, and `SKILL.md` opens in the editor.
- **Environment.** View and edit the API base URL. Open the global `~/.claude/settings.json`, and open or generate the project `AGENTS.md` / `CLAUDE.md` from the dashboard.
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

  // Read the 5-hour subscription quota from local credentials.
  "claudeHub.fetchSubscriptionUsage": true,

  // Claude config directory. Empty uses ~/.claude.
  "claudeHub.configDir": "",

  // "auto" follows VS Code, or set "zh-CN" or "en".
  "claudeHub.language": "auto"
}
```

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

- **仪表盘。** 用纵向手风琴代替横向标签。实时面板保持展开，显示会话指示、上下文进度、输入 / 缓存命中 / 写入 / 输出 Token、预估费用和 Git 分支。工具耗时和待办清单只在有内容时展开。
- **会话。** 可按全部、当前工作区或活跃中过滤，并按项目名、标题或 Git 分支搜索，长列表分页浏览。分叉会把会话的完整记录复制为新的 UUID，可直接打开，或在终端用 `claude --resume` 继续。删除会移除一条会话记录。
- **工作区范围。** 当前工作区模式跟随 VS Code 正在打开的文件夹。全部会话模式列出本机所有 Claude Code 会话。
- **MCP 与技能。** 列出已配置的 MCP 服务，并可启停。已安装技能会列出来，`SKILL.md` 可在编辑器中打开。
- **环境。** 查看并修改 API Base URL，从仪表盘打开全局 `~/.claude/settings.json`，并打开或生成项目里的 `AGENTS.md` / `CLAUDE.md`。
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

  // 是否从本地凭据读取 5 小时订阅配额
  "claudeHub.fetchSubscriptionUsage": true,

  // Claude 配置目录，留空则为 ~/.claude
  "claudeHub.configDir": "",

  // "auto" 跟随 VS Code，也可设为 "zh-CN" 或 "en"
  "claudeHub.language": "auto"
}
```

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
