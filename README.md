# Claude Hub for VS Code

实时监控、管理与可视化展示 **Claude Code** 运行状态的 VS Code 扩展插件。专为搭配 Claude Code 打造，提供单页流畅折叠仪表盘、状态栏实时 HUD 监控、多会话中心（检索/翻页/分叉 Fork）、MCP 与 Skills 生态管理。

---

## ✨ 核心特性

- 📊 **单页流畅折叠仪表盘 (Modern Accordion Dashboard)**：
  - 弃用繁琐的水平 Tab 栏，采用现代感十足的单页纵向滚动 + 手风琴折叠面板。
  - **实时运行监控 (常驻展开)**：项目会话指示灯、渐变色上下文进度条、单行指标气泡（输入、缓存命中、写入、输出 Tokens）、预估使用成本与 Git 分支。
  - **动态工具与待办清单**：仅在工具运行时高亮弹出秒级耗时气泡，待办任务清单按需自适应展开。
- 🕒 **全功能会话管理中心 (Session Manager)**：
  - **智能分类过滤**：`全部` · `当前工作区` · `活跃中` 一键切换。
  - **即时模糊搜索**：支持按项目名称、会话标题、Git 分支即时过滤。
  - **分页浏览**：支持对海量历史会话（100+ Sessions）平滑翻页浏览，杜绝长列表卡顿。
  - **🌿 会话分叉 (Fork Session)**：一键克隆会话全量上下文历史并分配独立 UUID，生成全新探索分支，支持快速打开或在终端以 `claude --resume` 启动。
- 🎯 **双重工作区过滤模式**：
  - **当前工作区模式 (默认)**：自动匹配 VS Code 当前打开的项目，聚焦当前项目会话，清爽无干扰。
  - **全局所有会话模式**：一键切换查看本机系统内所有正在运行的 Claude Code 会话。
- 🧩 **扩展生态管理 (MCP & Skills)**：
  - 自动扫描并展示当前配置的 MCP 服务，支持一键开关启停。
  - 识别并列出所有已安装技能（Skills），支持一键在 VS Code 中直接打开预览与编辑 `SKILL.md`。
- 🌐 **网络代理与环境配置**：
  - 支持查看与修改 API Base URL 代理地址。
  - 一键直达 Claude 全局配置 `settings.json` 与项目级指南 `CLAUDE.md`。
- 📌 **精致状态栏与适度结构化悬停卡片 (Status Bar & Hover HUD)**：
  - 状态栏紧凑指标：`$(robot) claude-hub · 7% | $(sync~spin) Edit (3s) | Todos 2/5`。
  - 适度丰富的 Markdown 悬停卡片：图形化进度条、结构化 Token 流与常用快捷操作。

---

## 🛠️ 快捷指令 (`Ctrl+Shift+P` / `Cmd+Shift+P`)

| 命令 | 说明 |
| --- | --- |
| `Claude Hub: 刷新 Claude Code 状态` | 立即强制重新扫描会话与订阅额度 |
| `Claude Hub: 切换当前工作区 / 全局所有会话过滤` | 切换「当前工作区」与「全局会话」模式 |
| `Claude Hub: 切换聚焦查看的 Claude 会话` | 弹出列表快速切换当前聚焦的会话 |
| `Claude Hub: 分叉当前会话 (Fork Session)` | 复制当前会话全量历史为新独立会话 |
| `Claude Hub: 打开当前会话底层运行日志` | 在编辑器中打开当前会话底层的 `.jsonl` 运行日志 |
| `Claude Hub: 打开 Claude Code 配置中心` | 快速打开 `~/.claude/settings.json` 配置文件 |

---

## ⚙️ 配置选项

在 VS Code `settings.json` 中可进行个性化调整：

```jsonc
{
  // 会话过滤模式: "currentWorkspace" (仅当前工作区) 或 "all" (全部会话)
  "claudeHub.filterMode": "currentWorkspace",

  // 状态栏显示开关
  "claudeHub.showStatusBarItem": true,

  // 闲置判定时间 (秒)，默认 180 秒无操作自动标记为闲置；设置为 0 表示永不闲置
  "claudeHub.idleTimeout": 180,

  // 刷新检测周期 (秒)
  "claudeHub.refreshInterval": 15,

  // 上下文预警阈值 (默认 50% 黄色警告，75% 红色高危)
  "claudeHub.warningThreshold": 50,
  "claudeHub.dangerThreshold": 75,

  // 自定义模型上下文大小限制覆盖 (Exact Model ID -> tokens)
  "claudeHub.modelContextLimits": {
    "claude-3-7-sonnet": 200000
  },

  // 是否拉取 5 小时订阅配额
  "claudeHub.fetchSubscriptionUsage": true,

  // 自定义 Claude 配置文件夹 (默认为 ~/.claude)
  "claudeHub.configDir": "",

  // 界面语言: "auto" (自动跟随 VS Code), "zh-CN", "en"
  "claudeHub.language": "auto"
}
```

---

## 📦 本地开发与构建

```bash
# 1. 安装依赖
npm install

# 2. 编译 TypeScript
npm run compile

# 3. 运行自动化单元测试
npm test

# 4. 打包生成 .vsix 插件安装包 (Windows PowerShell)
.\scripts\package.ps1
```

---

## 🙏 致谢与灵感来源 (Acknowledgements)

本项目的诞生与设计汲取了开源社区优秀项目的启发，在此特向以下项目及其作者致以诚挚的感谢：

1. **[claude-context-bar](https://github.com/edenaion/claude-context-bar)** by [Ed Zisk (@edenaion)](https://github.com/edenaion)  
   - 启发了 VS Code 状态栏上下文窗口监控、项目路径编码解码与多工作区会话映射机制。
2. **[claude-hud](https://github.com/jarrodwatts/claude-hud)** by [Jarrod Watts (@jarrodwatts)](https://github.com/jarrodwatts)  
   - 启发了 Claude Code 终端 HUD 状态行体系、JSONL Transcript 解析机制、实时工具追踪与成本计算模型。
3. **[claude-code-manager](https://github.com/vishalguptax/claude-code-manager)** by [Vishal Gupta (@vishalguptax)](https://github.com/vishalguptax)  
   - 启发了现代会话中心（Session Manager）的设计理念、海量会话检索以及会话分叉（Fork Session）的工作流设计。
