---
status: active
updated: 2026-11-15
verified: false
supersedes: []
---

# ADR 0002：v0.3.0 采用四分栏双宿主 Webview 与可定制双风格状态栏

- **状态**：accepted
- **日期**：2026-11-15

## 上下文

`v0.2.x` 的单页手风琴侧边栏在接入 Auto Memory、Loop、后台 `/tasks` 与协作代理后高度过长、顶栏 7 个 Emoji 图标在窄栏易拥挤，且协作代理拓扑存在横向溢出（`Bug.md`）。同时部分老用户习惯 `0.2.x` 右下角的经典 Claude Hub 状态栏与悬停风格，且不同用户对右下角及悬浮窗想看的指标差异很大。

## 决策

1. **分支隔离**：从 `v0.2.26` 锚定 `release/v0.2.x` 维护分支，主线升至 `0.3.0`。
2. **左侧栏与编辑器宽屏双宿主**：参考 `copilot-speedometer` 重构为吸顶四分栏（`监控 / 会话 / 扩展 / 设置`）+ 右侧纯 SVG 图标（`刷新` + `在编辑器标签页打开`），窄栏单列、宽屏双栏（Master-Detail），并将 `src/webviewHtml.ts` 拆分为 `src/webview/{styles,layout,clientScript}.ts` 子模块（保留 `getWebviewContent()` 入口兼容）。
3. **右下角状态栏与悬浮窗双风格 + 深度自定义**：内置 `claudeHub.statusBar.style`（`modern` 默认表格对齐风 / `classic` 0.2 经典风），提供 6 档预设、底栏 10 项指标自由勾选与悬浮窗 9 大区块独立开关，并在「设置」Tab 内置可视化勾选工作台。

## 放弃的方案与原因

- **仅靠拆两个物理仓库/版本而不加风格开关**：会导致喜欢 `0.2.x` 右下角风格的用户无法获得 `0.3.x` 的新模型定价与功能演进。
- **连同左侧栏一起保留两套 5000 行 Webview 双模式**：维护成本翻倍且易产生双边功能漂移；左侧栏统一升级为新版四分栏，右下角保留轻量纯函数双风格即可兼顾体验与可维护性。
- **在 5140 行的单文件 `webviewHtml.ts` 中就地堆叠改动**：不利于后续样式隔离与单元测试定位。

## 后果与可逆性

- 详细规格见 `docs/superpowers/specs/2026-11-15-v0.3-ui-redesign-design.md`。
- 右下角可随时通过 `claudeHub.statusBar.style = "classic"` 零成本无损切回 `0.2.x` 视觉；若需构建纯 `0.2.x` 安装包，可直接检出 `release/v0.2.x` 分支打包。
