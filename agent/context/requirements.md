---
status: active
updated: 2026-11-13
---

# 需求摘要卡

> 只写指针与结论。正文留在原位，**不要**复制进来。

## 事实源

| 内容 | 路径 | 状态 |
| --- | --- | --- |
| 产品定位与功能 | `README.md` | 有效 |
| 版本变更（中英） | `CHANGELOG.md` | 有效（当前 v0.2.25） |
| 待优化清单 | `task.md` | 有效（未提交） |
| 已知 UI 问题 | `Bug.md` | 有效（未提交，协作代理拓扑显示溢出） |
| 工程约定 | `AGENTS.md` | 有效 |

## 当前结论

- 范围：监控与管理本地 Claude Code 会话（Dashboard、状态栏 HUD、会话命令）；仅读取本地 JSONL，不联网、不采集正文。
- 界面语言：英文 + 简体中文，key 集合必须一致（测试强制）。
- 平台：Windows / macOS / Linux；VS Code ≥ 1.74。

## 未决项

- `task.md` 三项优化的优先级与验收口径待用户确认（见 `plan.md`）。

## 最后更新

- 2026-11-13 / agent-scaffold adopt
