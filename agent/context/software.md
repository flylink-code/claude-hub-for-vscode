---
status: active
updated: 2026-11-13
---

# 软件摘要卡

> 只写指针与结论。架构细节看代码地图，**不要**复制进来。

## 事实源

| 内容 | 路径 | 状态 |
| --- | --- | --- |
| 模块布局与命令 | `AGENTS.md`（Repository Layout / Build & Test） | 有效 |
| 符号索引 | `doc/CODE_MAP_INDEX.md` | 有效 |
| 清单与设置 | `package.json`、`package.nls*.json` | 有效 |
| CI 与发布 | `.github/workflows/build-and-release.yml`、`scripts/package.ps1` | 有效 |

## 关键事实

- 语言 / 构建：TypeScript，`NodeNext`，相对导入必须带 `.js`；`npm run compile` → `out/`，入口 `out/extension.js`。
- 测试：`npm test`（Node 内置 test，`test/parser.test.ts`，产物在 `out-test/`）；无 lint / formatter。
- 模块：extension / commands / dashboardView / webviewHtml / sessionManager / transcriptParser / statusBar(+Formatter) / claudeConfigManager / claudeFeatures / configDir / contextLimit / i18n / types。
- 数据源：Claude Code JSONL 会话日志，视为不可信输入，须容忍残缺与乱序。
- 发布：`scripts/package.ps1|sh` 编译、测试、打包 VSIX 到 `dist/`；用户可见变更同步 `README.md` 与 `CHANGELOG.md`。

## 已知软件约束

- Webview 为内联 HTML，动态内容必须转义；新增交互需同时改 `webviewHtml.ts` 与 `dashboardView.ts`。
- 测速依赖日志私有字段（`api-request` / `assistant` / `usage`），字段缺失时降级为无数据。
- 推理等级只用会话日志记录值，不用全局默认冒充。

## 未决项

- 见 `plan.md`。

## 最后更新

- 2026-11-13 / agent-scaffold adopt
