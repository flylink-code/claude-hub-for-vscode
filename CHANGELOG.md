# Changelog

本文件记录 Claude Hub for VS Code 的版本变更。

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

[0.2.12]: https://github.com/flylink-code/claude-hub-for-vscode/releases/tag/v0.2.12
[0.2.11]: https://github.com/flylink-code/claude-hub-for-vscode/releases/tag/v0.2.11
