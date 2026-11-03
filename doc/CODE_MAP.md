# Layered Code Map

`AGENTS.md` → `doc/codemap/hubs.md`（跨模块高频被引用声明）→ `doc/CODE_MAP_INDEX.md`（模块路由总索引）→ 模块文件页（`doc/codemap/<module>.md`）→ 文件符号页（`doc/codemap/<file>-<hash>-<page>.md`）→ 源码（`#L<line>`）。

除分页导航外，查询 CLI 支持直接跳过页面：
- `--find <symbol>`：直接返回 `path:line`、语法类型（Kind）与词法作用域（Scope）。
- `--outline <file>`：按源码顺序列出单个文件的全部声明。
- `--map [--tokens N]`：按 Token 预算输出被引用最多的核心声明（架构主轴）。

代码地图索引本仓库（`claude_hub_for_vscode`）的全部 TypeScript 源码、单元测试、构建脚本与地图工具本身，并通过 `doc/codemap.config.json` 按业务职责路由为 10 个模块：`core-entry`、`ui-dashboard`、`session-parser`、`session-ops`、`todo-tasks`、`config-features`、`usage-pricing`、`tests`、`scripts`、`tooling`。默认每页最多 100 行，请只按需读取命中的模块页、符号页与源码行区间，切勿将整张代码地图一次性加载到上下文。

## Commands

在项目根目录（`E:\W-AI_WorkSpace\claude_hub_for_vscode`）执行：

```powershell
node doc/codemap.mjs                                  # 增量生成（首次运行、配置变更、跨模块修改后执行）
node doc/codemap.mjs --module session-parser          # 仅刷新单个模块（需缓存已热且无模块外改动）
node doc/codemap.mjs --check                          # 零漂移校验（只校验不写文件，存在漂移则退出码非 0）
node doc/codemap.mjs --find SessionInfo               # 符号定位：输出 path:line、Kind、Scope
node doc/codemap.mjs --outline src/extension.ts       # 单文件声明大纲（按源码行号顺序）
node doc/codemap.mjs --map --tokens 800               # 受 Token 预算限制的枢纽声明概览
```

`--find` / `--outline` / `--map` 均为只读查询命令，仅读取缓存而不写入任何生成物。可附加 `--json` 获取机器可读 JSON 输出，附加 `--limit N` 调整 `--find` 返回条数上限，附加 `--tokens N` 调整 `--map` 概览预算。

依赖解析顺序：工作区 `node_modules`（`typescript`、`web-tree-sitter`、`tree-sitter-wasms`）→ `CODEMAP_REQUIRE_FROM` 环境变量指定目录 → 同级工作区目录。本项目已在 `devDependencies` 中内置完整依赖，开箱即用。

## Coverage Contract

`doc/codemap.config.json` 定义了索引根（`src`、`test`、`scripts`、`doc`）、扩展名白名单、排除路径段、模块路由表以及输出路径（`doc/CODE_MAP_INDEX.md`、`doc/codemap`、`doc/.codemap-cache.json`）。

- **纳入索引（Included）**：
  - `src/` 下的全部 VS Code 插件 TypeScript 生产源码（29 个文件）。
  - `test/` 下的全部 Node.js 原生测试套件（12 个 `.test.ts` 文件）。
  - `scripts/` 下的打包脚本（`package.ps1`、`package.sh`）。
  - `doc/` 下的代码地图生成器脚本（`doc/codemap.mjs`）。
- **排除范围（Excluded）**：
  - 编译与打包产物目录：`out`、`out-test`、`dist`。
  - 第三方依赖与环境目录：`node_modules`、`.git`、`.github`、`.vscode`、`.vscode-test`、`.claude`。
  - 静态资源与示例目录：`images`、`resources`、`example` 以及生成目录 `doc/codemap` 本身。
  - 非代码数据/文档文件（`.json`、`.md`、`.vsix`、`.svg`、`.png`）不在扩展名白名单中，不进入符号索引。
- **模块路由（Module Routing）**：
  - 由 `doc/codemap.config.json` 的 `modules` 规则驱动，最长路径前缀优先匹配，末尾 `*` 仅匹配目录；未命中规则的路径归入 `defaultModule`（`tooling`），`src/` 下新增但尚未单独配置规则的文件默认归入 `core-entry`。
- **各语言提取粒度**：
  - **TypeScript / JavaScript（`.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`）**：基于 TypeScript Compiler AST 提取函数声明、箭头函数/函数表达式变量、类、构造器、方法与方法签名、属性与访问器、接口、类型别名与泛型参数、枚举与枚举成员、命名空间、解构绑定元素、导出说明符（`ExportSpecifier`）与默认导出。普通参数、导入语句、匿名内联回调、纯数据对象字面量属性不计为符号。
  - **Shell / PowerShell / Batch（`.sh`, `.ps1`, `.bat`, `.cmd`）**：词法级函数、`filter`、`class`、`enum` 与批处理标签导航（纯命令流脚本如 `scripts/package.ps1` 和 `scripts/package.sh` 无函数声明时记录为 0 个符号，但文件仍登记在 `scripts` 模块页中）。

`doc/CODE_MAP_INDEX.md`、`doc/codemap/hubs.md` 与 `doc/codemap/` 完全归生成器所有——**严禁手动编辑，也不要在 `doc/codemap/` 内放置手写文档**。

## Reference Graph and Hubs

`doc/codemap/hubs.md`、`--map` 以及模块符号页的入度统计来自**导入级（import-level）引用图**，而非类型检查器或调用图：

- **解析规则**：从 TypeScript / JavaScript 的 `import` / `export … from` 语句中提取符号名。对于相对路径导入（含 TypeScript `"module": "NodeNext"` 下的 `./foo.js` → `src/foo.ts` 映射），将其解析到索引内的目标文件并匹配顶层声明；非相对路径则尝试在全仓唯一同名顶层声明中消解。
- **诚实计数**：能唯一确定目标文件顶层声明的记为 `resolved`；存在多个同名顶层声明的记为 `ambiguous`；外部包（如 `vscode`、`node:fs`、`node:test`）或未索引符号记为 `unresolved`，绝不猜测连接。
- **不覆盖项（Not Covered）**：
  - 同一文件内部直接调用、方法调用链（如 `sessionManager.getSessions()`）、接口实现、动态 `import()`、CommonJS `require()`、Webview 内联脚本字符串中的 DOM 函数调用均不产生导入边。
  - **结论边界**：某个符号未出现在 `hubs.md` 或入度为 0，**绝不等于**“没有人依赖或调用它”。删除或重构导出符号前必须配合 `Grep` / LSP `usages` 确认真实引用。

## Known Baseline

首次全量生成记录的已知基线数字如下：

- **文件与符号**：`44` 个源码文件，`2778` 个提取符号，`71` 个生成页面（分布在 10 个模块）。
- **引用边统计**：`233` 条已解析（`resolved`），`0` 条歧义（`ambiguous`），`34` 条未解析（`unresolved`，全部来自 `vscode`、`node:*` 内置模块及外部包导入）。
- **解析恢复诊断（Parser Diagnostics）**：`0` 条。如后续引入新语法导致 `diagnostics` 升高，应在任务汇报中说明原因，不得手改生成页。

## Completion Checklist

1. 修改或排查代码前，先用 `node doc/codemap.mjs --map`、`--find <symbol>`、`--outline <file>` 或 `doc/CODE_MAP_INDEX.md` 定位到精确的 `文件路径:行号`，只读取相关源码片段。
2. 遵守 `AGENTS.md` 中的核心铁律（编译零错误、单元测试 100% 通过、`.vsix` 产物必须输出至 `dist/`、任务/计划权威顺序）。
3. 任何源码文件新增、修改、删除或重命名后，在项目根目录依次运行：
   ```powershell
   node doc/codemap.mjs
   node doc/codemap.mjs --check
   ```
   确认输出 `changed: 0`、`deleted: 0` 且退出码为 0。
4. 运行 `npm run compile` 与 `npm test`，确保编译与全部单元测试通过。
