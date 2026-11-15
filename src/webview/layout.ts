export function getWebviewLayout(options?: { isSidebar?: boolean }): string {
  const isSidebar = options?.isSidebar === true;
  const openTabBtnStyle = isSidebar ? '' : ' style="display: none;"';

  return `
  <div id="app" class="hub-container">
    <!-- Sticky Top Header: Brand + 4 Tabs left, Refresh + Open Tab SVG icons right -->
    <header class="hub-header">
      <div class="brand" title="Claude Hub">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.2l1.65 4.45L14.2 7.2l-4.55 1.55L8 13.2 6.35 8.75 1.8 7.2l4.55-1.55L8 1.2z"/></svg>
        <span class="brand-text">Claude Hub</span>
        <span class="status-pill" id="global-status-pill">检测中</span>
      </div>
      <nav class="tabs" role="tablist" aria-label="Dashboard sections">
        <button class="tab" id="tab-btn-monitor" type="button" role="tab" aria-selected="true" aria-controls="view-monitor" data-tab="monitor">监控</button>
        <button class="tab" id="tab-btn-sessions" type="button" role="tab" aria-selected="false" aria-controls="view-sessions" data-tab="sessions">会话</button>
        <button class="tab" id="tab-btn-extensions" type="button" role="tab" aria-selected="false" aria-controls="view-extensions" data-tab="extensions">扩展</button>
        <button class="tab" id="tab-btn-settings" type="button" role="tab" aria-selected="false" aria-controls="view-settings" data-tab="settings">设置</button>
      </nav>
      <div class="head-actions" role="toolbar" aria-label="Hub actions">
        <button class="icon-btn" id="hdr-refresh-btn" type="button" data-i18n-title="tbRefresh" title="刷新状态" aria-label="刷新状态" data-action="refresh">
          <svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.45 2.55a.75.75 0 0 1 1.06 0v3.9a.75.75 0 0 1-.75.75h-3.9a.75.75 0 0 1 0-1.5h2.08A5.25 5.25 0 1 0 13.1 9.5a.75.75 0 1 1 1.44.42A6.75 6.75 0 1 1 13.45 2.55z"/></svg>
        </button>
        <button class="icon-btn" id="hdr-open-tab-btn" type="button" data-i18n-title="tbOpenTab" title="在编辑器标签页打开" aria-label="在编辑器标签页打开" data-action="openDashboardTab"${openTabBtnStyle}>
          <svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2a.75.75 0 0 0 0 1.5h2.19L7.22 7.97a.75.75 0 1 0 1.06 1.06l4.47-4.47V6.75a.75.75 0 0 0 1.5 0V2.75a.75.75 0 0 0-.75-.75h-4zM3.75 4A1.75 1.75 0 0 0 2 5.75v6.5C2 13.216 2.784 14 3.75 14h6.5A1.75 1.75 0 0 0 12 12.25V9a.75.75 0 0 0-1.5 0v3.25a.25.25 0 0 1-.25.25h-6.5a.25.25 0 0 1-.25-.25v-6.5a.25.25 0 0 1 .25-.25H7a.75.75 0 0 0 0-1.5H3.75z"/></svg>
        </button>
      </div>
    </header>

    <!-- ══ TAB 1: MONITOR ══ -->
    <main class="view" id="view-monitor" role="tabpanel" aria-labelledby="tab-btn-monitor">
      <div class="dash-toolbar">
        <div class="segmented" role="group" aria-label="Scope">
          <button type="button" class="seg" id="monitor-scope-ws" data-action="setScopeMode" data-scope="currentWorkspace" aria-pressed="false">本窗口</button>
          <button type="button" class="seg active" id="monitor-scope-all" data-action="setScopeMode" data-scope="all" aria-pressed="true">全部</button>
        </div>
        <div class="scope-meta">
          <span class="live-dot idle" id="monitor-live-dot"></span>
          <span id="proj-name" class="monitor-project-name" title="">未检测到会话</span>
          <span id="session-status-badge" class="status-pill">--</span>
        </div>
      </div>

      <!-- Hero Context & Output Speed Card -->
      <div class="hero">
        <div class="hero-top">
          <span class="hero-label" id="hero-model-badge">--</span>
          <span id="hero-last-active" class="muted">--</span>
        </div>
        <div class="hero-main">
          <div>
            <span id="token-pct" class="monitor-context-value">0%</span>
            <span id="hero-tokens-sub" class="hero-tokens-sub">0 / 200k</span>
          </div>
          <div class="hero-right-stat">
            <div class="output-speed-row" id="output-speed-row">
              <span class="output-speed-label" id="output-speed-label">最近响应平均速率</span>
              <span class="output-speed-value" id="output-speed-value">—</span>
              <span class="output-speed-model" id="output-speed-model"></span>
              <button type="button" class="output-speed-enable" id="output-speed-enable" data-action="enableOutputSpeed">启用终端速率采集</button>
            </div>
          </div>
        </div>
        <div class="progress-bar-track" id="token-progress" role="progressbar" aria-label="上下文使用率" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div id="token-fill" class="progress-bar-fill" style="width: 0%;"></div>
        </div>
        <div class="hud-info-row" role="list" aria-label="运行摘要">
          <span class="hud-fact hud-fact-model" role="listitem"><span class="hud-fact-label">模型</span><span id="model-tag" class="hud-fact-value">--</span></span>
          <span class="hud-fact" role="listitem"><span class="hud-fact-label">分支</span><span id="branch-tag" class="hud-fact-value">--</span></span>
          <span class="hud-fact" role="listitem"><span class="hud-fact-label">消耗</span><span id="cost-label" class="hud-fact-value">--</span></span>
          <span class="hud-fact" role="listitem"><span class="hud-fact-label">时长</span><span id="session-dur-label" class="hud-fact-value">--</span></span>
        </div>
        <div id="sub-container" class="quota-inline" style="display: none;">
          <span id="sub-title">⏳ 订阅配额</span>
          <span id="sub-reset"></span>
          <div class="progress-bar-track" style="width: 100%; margin: 2px 0 0;">
            <div id="sub-fill" class="progress-bar-fill" style="width: 0%;"></div>
          </div>
          <div id="sub-meters" style="width: 100%; font-size: 10px; color: var(--fg-dim);"></div>
        </div>
      </div>

      <!-- Adaptive KPI Grid -->
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-label">输入 / 缓存</div>
          <div class="kpi-value"><span id="m-in">0</span> / <span id="m-cache">0</span></div>
          <div class="kpi-sub">写入 <span id="m-write">0</span></div>
        </div>
        <div class="kpi">
          <div class="kpi-label">输出 Tokens</div>
          <div class="kpi-value" id="m-out">0</div>
          <div class="kpi-sub" id="kpi-subagent-sub">主会话</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">预估费用</div>
          <div class="kpi-value" id="kpi-cost-val">--</div>
          <div class="kpi-sub" id="kpi-cost-sub">--</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">有效时长</div>
          <div class="kpi-value" id="kpi-dur-val">--</div>
          <div class="kpi-sub" id="kpi-dur-sub">--</div>
        </div>
      </div>

      <!-- Contextual Quick Actions Row (reassigned from cluttered top bar) -->
      <div class="quick-actions-row">
        <button type="button" class="btn ghost" data-action="slashCommand">/ 斜杠命令</button>
        <button type="button" class="btn ghost" data-action="openBackgroundTasks">后台任务 (/tasks) <span class="count-badge" id="monitor-bg-badge" style="display:none;">0</span></button>
        <button type="button" class="btn ghost" data-action="workspaceCostReport">成本报告</button>
      </div>

      <!-- Live Running Tool Banner -->
      <div id="running-tool-banner" class="running-bar" style="display: none;">
        <div style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          <span class="spin">🔄</span>
          <strong id="running-tool-name" style="color: var(--claude-accent);">Edit</strong>
          <span id="running-tool-target" style="opacity: 0.8; margin-left: 4px;"></span>
        </div>
        <span id="running-tool-dur" class="status-pill">0s</span>
      </div>

      <!-- Loop Status Banner -->
      <div id="loop-status-banner" class="running-bar" style="display: none; flex-direction: column; align-items: stretch; gap: 3px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span id="loop-status-icon">🔁</span>
            <strong id="loop-mode-label" style="color: var(--claude-accent);">Loop</strong>
            <span id="loop-meta-chips" style="opacity: 0.85; margin-left: 4px; font-size: 10px;"></span>
          </div>
          <span id="loop-countdown-pill" class="status-pill">--</span>
        </div>
        <div id="loop-reason-line" style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: none;"></div>
      </div>

      <!-- Full-bleed Pane: Session Todos -->
      <section class="block" id="todos-container" style="display: none;">
        <div class="block-head" onclick="toggleTodosList()">
          <div class="todos-header">
            <div class="todos-header-title">
              <span id="todos-caret" class="caret">▼</span>
              <span id="todos-title-label" title="">📋 待办任务</span>
            </div>
            <div class="todos-header-actions">
              <button type="button" id="todos-sync-btn" class="todos-sync-btn" style="display: none;" title="复制任务同步提示，发送到当前 Claude 对话" aria-label="复制任务同步提示" onclick="copyTodoSyncPrompt(event)">⧉<span class="todos-sync-text"> 复制提示</span></button>
              <button type="button" id="todos-clear-btn" class="todos-clear-btn" style="display: none;" title="Hide dashboard todos only — does not delete ~/.claude/tasks or stop slash /tasks jobs" aria-label="隐藏当前待办" onclick="clearCompletedTodos(event)">✕<span class="todos-clear-text"> 清除</span></button>
              <span id="todos-counter" class="status-pill">0/0</span>
            </div>
          </div>
        </div>
        <div class="block-body">
          <div class="todo-progress-track">
            <div id="todos-progress-bar" class="todo-progress-fill" style="width: 0%;"></div>
          </div>
          <div class="todos-meta" id="todos-meta" style="display: none;">
            <span class="todos-mode-chip" id="todos-mode-chip"></span>
            <span class="todos-source-chip" id="todos-source-chip"></span>
            <span class="todos-checklist-chip" id="todos-checklist-chip" style="display: none;"></span>
            <span id="todos-list-label"></span>
            <button type="button" class="todos-list-btn" id="todos-pick-list-btn">List</button>
            <span class="todos-needs-list" id="todos-needs-list" style="display: none;"></span>
          </div>
          <div id="todos-activity" class="todos-activity" style="display: none;"></div>
          <div id="todos-plan-warn" class="todos-plan-warn" role="status"></div>
          <div id="todos-empty-hint" class="todos-empty-hint" style="display: none;"></div>
          <div id="todos-list"></div>
        </div>
      </section>

      <!-- Full-bleed Pane: Subagent Topology (Bug.md overflow fixed) -->
      <section class="block" id="agents-container" style="display: none;">
        <div class="block-head" onclick="toggleAgentsList()">
          <div class="agents-heading">
            <div class="agents-heading-title">
              <span id="agents-caret" class="caret">▼</span>
              <span class="agents-heading-label">🤖 协作代理拓扑</span>
            </div>
            <span id="agents-counter" class="status-pill">0</span>
          </div>
        </div>
        <div class="block-body">
          <div id="agents-list" class="agents-tree"></div>
        </div>
      </section>

      <!-- Full-bleed Pane: Background /tasks -->
      <section class="block" id="bgjobs-container" style="display: none;">
        <div class="block-head">
          <span class="block-toggle" title="Claude Code 斜杠 /tasks 后台 shell 与异步 agent，不是会话待办">🧵 后台任务 <span style="opacity:0.7">(/tasks)</span> <span id="bgjobs-counter" class="status-pill">0</span></span>
          <span class="spacer"></span>
          <button type="button" class="linkbtn" onclick="sendMessage('openBackgroundTasks')" title="在 Claude Code 中打开 /tasks">打开</button>
        </div>
        <div class="block-body">
          <div id="bgjobs-list" style="font-size: 11px;"></div>
        </div>
      </section>
    </main>

    <!-- ══ TAB 2: SESSIONS (Master-Detail in wide mode, drill-down in narrow) ══ -->
    <main class="view" id="view-sessions" role="tabpanel" aria-labelledby="tab-btn-sessions" hidden>
      <div class="hub-search-row">
        <input type="text" class="search-box" id="session-search" placeholder="🔍 搜索标题、项目、分支、模型或标签..." oninput="onSearchInput(this.value)">
        <button type="button" class="btn ghost" data-action="searchTranscript" title="在会话记录中全文搜索">全文搜</button>
        <button type="button" class="btn ghost" data-action="startWorktreeSession" title="启动 Git Worktree 隔离会话 (claude -w)">+ Worktree</button>
      </div>

      <div class="filter-chips-row">
        <button type="button" class="filter-chip active" id="chip-all" onclick="setSessionFilter('all')">全部</button>
        <button type="button" class="filter-chip" id="chip-ws" onclick="setSessionFilter('workspace')"><span class="chip-label-long">当前工作区</span><span class="chip-label-short">工作区</span></button>
        <button type="button" class="filter-chip" id="chip-pinned" onclick="setSessionFilter('pinned')">置顶</button>
        <button type="button" class="filter-chip" id="chip-active" onclick="setSessionFilter('active')">活跃中</button>
        <span class="spacer"></span>
        <span id="sessions-total-badge" class="status-pill">0 个会话</span>
      </div>

      <div class="hub-split mode-list" id="sessions-split">
        <div class="hub-left">
          <div id="session-cards-list">
            <div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 12px 0;">加载会话中...</div>
          </div>
          <div class="pagination-bar" id="session-pagination">
            <button type="button" class="page-btn" id="btn-prev-page" onclick="prevPage()">◀ 上一页</button>
            <span id="pagination-info">第 1 / 1 页</span>
            <button type="button" class="page-btn" id="btn-next-page" onclick="nextPage()">下一页 ▶</button>
          </div>
        </div>

        <aside class="hub-reader" id="session-reader" aria-live="polite">
          <button type="button" class="btn ghost back-btn" id="reader-back-btn" data-action="closeSessionReader">← 返回会话列表</button>
          <div id="session-reader-body">
            <div class="muted" style="font-size: 12px; padding: 18px 0;">选择一个会话以查看详细信息与快捷操作</div>
          </div>
        </aside>
      </div>
    </main>

    <!-- ══ TAB 3: EXTENSIONS & MEMORY ══ -->
    <main class="view" id="view-extensions" role="tabpanel" aria-labelledby="tab-btn-extensions" hidden>
      <div class="ext-toolbar">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <div class="ext-tabs-row" id="ext-category-tabs">
            <button type="button" class="ext-tab-btn active" data-action="setExtTab" data-ext-tab="all">全部</button>
            <button type="button" class="ext-tab-btn" data-action="setExtTab" data-ext-tab="memory">🧠 记忆 <span class="ext-tab-count" id="ext-tab-count-memory">0</span></button>
            <button type="button" class="ext-tab-btn" data-action="setExtTab" data-ext-tab="mcp">🔌 MCP <span class="ext-tab-count" id="ext-tab-count-mcp">0</span></button>
            <button type="button" class="ext-tab-btn" data-action="setExtTab" data-ext-tab="skills">⚡ 技能 <span class="ext-tab-count" id="ext-tab-count-skills">0</span></button>
            <button type="button" class="ext-tab-btn" data-action="setExtTab" data-ext-tab="plugins">🧩 插件 <span class="ext-tab-count" id="ext-tab-count-plugins">0</span></button>
            <button type="button" class="ext-tab-btn" data-action="setExtTab" data-ext-tab="agents">🤖 代理 <span class="ext-tab-count" id="ext-tab-count-agents">0</span></button>
          </div>
          <span id="ext-count-badge" class="status-pill">0 项</span>
        </div>
        <div class="ext-search-wrap">
          <input type="text" id="ext-search-input" class="ext-search-input" placeholder="🔍 搜索技能、插件、MCP 或记忆..." oninput="onExtSearchInput(this.value)" />
          <button type="button" id="ext-search-clear" class="ext-search-clear" onclick="clearExtSearch()" title="清空搜索" style="display: none;">✕</button>
        </div>
      </div>

      <!-- Auto Memory -->
      <div class="ext-group" id="ext-group-memory" data-ext-group="memory">
        <div class="ext-group-header" data-action="toggleExtGroup" data-ext-group="memory">
          <span class="ext-group-title">
            <span class="caret">▼</span>
            <span class="ext-group-title-text">🧠 项目记忆</span>
            <span class="ext-group-badge" id="ext-badge-memory">0</span>
          </span>
          <div style="display: flex; gap: 3px; flex-shrink: 0;">
            <button class="icon-btn" type="button" style="font-size: 10px; padding: 1px 6px;" data-action="openMemoryIndex" title="打开或初始化项目的 MEMORY.md 索引">MEMORY.md</button>
            <button class="icon-btn" type="button" style="font-size: 10px; padding: 1px 6px;" data-action="syncMemoryIndex" title="同步 MEMORY.md 索引">🔄<span class="header-sub"> 同步</span></button>
            <button class="icon-btn" type="button" style="font-size: 10px; padding: 1px 6px; color: var(--blue);" data-action="createMemoryEntry" title="新建结构化项目记忆条目">+ 新建</button>
          </div>
        </div>
        <div class="ext-group-body">
          <div id="memory-inline-form" class="mem-inline-form">
            <div class="mem-inline-header">
              <span id="mem-form-title">➕ 新建项目记忆</span>
              <div style="display: flex; gap: 4px; align-items: center;">
                <button type="button" class="mem-act-btn" data-action="openMemoryWizard" id="mem-form-wizard-btn" title="使用 VS Code 顶部命令面板输入框创建">顶部向导</button>
                <button type="button" class="mem-act-btn" data-action="cancelMemoryForm" title="关闭表单">✕</button>
              </div>
            </div>
            <input type="hidden" id="mem-form-type" value="project" />
            <div class="mem-inline-field">
              <span class="mem-inline-label">记忆分类 (Type)</span>
              <div class="mem-type-pills" id="mem-type-pills">
                <button type="button" class="mem-type-pill active" data-action="selectMemType" data-mem-type="project" title="project: 项目架构约束、进行中目标或非显而易见的约定">📁 项目约定</button>
                <button type="button" class="mem-type-pill" data-action="selectMemType" data-mem-type="feedback" title="feedback: 开发协作纠偏、用户确认的工作方式">💬 协作纠偏</button>
                <button type="button" class="mem-type-pill" data-action="selectMemType" data-mem-type="user" title="user: 用户角色、技术偏好与沟通习惯">👤 用户偏好</button>
                <button type="button" class="mem-type-pill" data-action="selectMemType" data-mem-type="reference" title="reference: 外部文档、看板、工单或服务地址索引">🔗 外部参考</button>
              </div>
              <div class="mem-type-hint" id="mem-type-hint">记录项目架构约束、进行中目标或非显而易见的约定</div>
            </div>
            <div class="mem-inline-field">
              <span class="mem-inline-label">文件标识 (Slug)</span>
              <input type="text" id="mem-form-slug" class="mem-inline-input" placeholder="例如：build-quirks 或 arch-rule" onkeydown="if(event.key==='Enter'){submitMemoryInlineForm();}else if(event.key==='Escape'){closeMemoryInlineForm();}" />
            </div>
            <div class="mem-inline-field">
              <span class="mem-inline-label">一句话摘要（写入 MEMORY.md 索引）</span>
              <input type="text" id="mem-form-desc" class="mem-inline-input" placeholder="简明描述该条记忆的适用场景..." onkeydown="if(event.key==='Enter'){submitMemoryInlineForm();}else if(event.key==='Escape'){closeMemoryInlineForm();}" />
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 2px;">
              <button type="button" class="mem-act-btn" style="padding: 3px 10px; font-size: 10px;" data-action="cancelMemoryForm">取消</button>
              <button type="button" class="mem-act-btn primary" style="padding: 3px 10px; font-size: 10px; font-weight: 600;" data-action="submitMemoryForm" id="mem-form-submit-btn">保存并打开</button>
            </div>
          </div>
          <div id="memory-list" class="feature-list">
            <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
          </div>
        </div>
      </div>

      <!-- Plugins -->
      <div class="ext-group" id="ext-group-plugins" data-ext-group="plugins">
        <div class="ext-group-header" data-action="toggleExtGroup" data-ext-group="plugins">
          <span class="ext-group-title">
            <span class="caret">▼</span>
            <span class="ext-group-title-text">🧩 已安装插件</span>
            <span class="ext-group-badge" id="ext-badge-plugins">0</span>
          </span>
        </div>
        <div class="ext-group-body">
          <div id="plugins-list" class="feature-list">
            <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
          </div>
        </div>
      </div>

      <!-- MCP Servers -->
      <div class="ext-group" id="ext-group-mcp" data-ext-group="mcp">
        <div class="ext-group-header" data-action="toggleExtGroup" data-ext-group="mcp">
          <span class="ext-group-title">
            <span class="caret">▼</span>
            <span class="ext-group-title-text">🔌 MCP 服务器</span>
            <span class="ext-group-badge" id="ext-badge-mcp">0</span>
          </span>
        </div>
        <div class="ext-group-body">
          <div id="mcp-servers-list" class="feature-list">
            <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
          </div>
        </div>
      </div>

      <!-- Custom Agents -->
      <div class="ext-group" id="ext-group-agents" data-ext-group="agents">
        <div class="ext-group-header" data-action="toggleExtGroup" data-ext-group="agents">
          <span class="ext-group-title">
            <span class="caret">▼</span>
            <span class="ext-group-title-text">🤖 自定义代理</span>
            <span class="ext-group-badge" id="ext-badge-agents">0</span>
          </span>
        </div>
        <div class="ext-group-body">
          <div id="custom-agents-list" class="feature-list">
            <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
          </div>
        </div>
      </div>

      <!-- Skills -->
      <div class="ext-group" id="ext-group-skills" data-ext-group="skills">
        <div class="ext-group-header" data-action="toggleExtGroup" data-ext-group="skills">
          <span class="ext-group-title">
            <span class="caret">▼</span>
            <span class="ext-group-title-text">⚡ 已安装技能</span>
            <span class="ext-group-badge" id="ext-badge-skills">0</span>
          </span>
          <div class="ext-scope-pills" id="skill-scope-bar">
            <button type="button" class="ext-scope-pill active" data-action="setSkillScope" data-skill-scope="all" id="skill-scope-all">全部</button>
            <button type="button" class="ext-scope-pill" data-action="setSkillScope" data-skill-scope="local" id="skill-scope-local">本地</button>
            <button type="button" class="ext-scope-pill" data-action="setSkillScope" data-skill-scope="plugin" id="skill-scope-plugin">插件</button>
          </div>
        </div>
        <div class="ext-group-body">
          <div id="skills-list" class="feature-list">
            <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
          </div>
        </div>
      </div>
    </main>

    <!-- ══ TAB 4: SETTINGS & STATUS BAR / TOOLTIP CUSTOMIZER ══ -->
    <main class="view" id="view-settings" role="tabpanel" aria-labelledby="tab-btn-settings" hidden>
      <div class="settings-wrap">

        <section class="block" id="settings-statusbar-block">
          <div class="block-head">
            <span class="block-toggle">右下角状态栏与悬浮窗定制</span>
          </div>
          <div class="block-body">
            <div class="field">
              <div>
                <div class="field-label">视觉风格</div>
                <div class="field-hint">Modern 采用 Speedometer 表格对齐与主题 Codicon；Classic 保留 0.2 经典 Claude Hub 风格</div>
              </div>
              <div class="segmented" id="sb-style-group">
                <button type="button" class="seg" data-action="setStatusBarSetting" data-key="statusBar.style" data-value="modern" aria-pressed="true">Modern (0.3)</button>
                <button type="button" class="seg" data-action="setStatusBarSetting" data-key="statusBar.style" data-value="classic" aria-pressed="false">Classic (0.2)</button>
              </div>
            </div>

            <div class="field">
              <div>
                <div class="field-label">底栏预设模板</div>
                <div class="field-hint">点击预设快速切换底栏密度；勾选下方字段自动进入「自定义」</div>
              </div>
              <div class="segmented" id="sb-preset-group" style="flex-wrap:wrap;">
                <button type="button" class="seg" data-action="setStatusBarSetting" data-key="statusBar.preset" data-value="minimal" aria-pressed="false">极简</button>
                <button type="button" class="seg" data-action="setStatusBarSetting" data-key="statusBar.preset" data-value="compact" aria-pressed="true">紧凑</button>
                <button type="button" class="seg" data-action="setStatusBarSetting" data-key="statusBar.preset" data-value="speed" aria-pressed="false">速率</button>
                <button type="button" class="seg" data-action="setStatusBarSetting" data-key="statusBar.preset" data-value="hud" aria-pressed="false">HUD</button>
                <button type="button" class="seg" data-action="setStatusBarSetting" data-key="statusBar.preset" data-value="detailed" aria-pressed="false">详细</button>
                <button type="button" class="seg" data-action="setStatusBarSetting" data-key="statusBar.preset" data-value="custom" aria-pressed="false">自定义</button>
              </div>
            </div>

            <div class="field" style="grid-template-columns: minmax(0, 1fr);">
              <div>
                <div class="field-label">底栏显示字段（自由勾选）</div>
                <div class="field-hint">控制右下角常驻文本包含哪些指标（点击即切换为 custom 模式并实时生效）</div>
              </div>
              <div class="custom-chips-grid" id="sb-field-chips">
                <button type="button" class="toggle-chip" data-action="toggleStatusBarField" data-key="statusBar.showContext" aria-pressed="true">上下文 %</button>
                <button type="button" class="toggle-chip" data-action="toggleStatusBarField" data-key="statusBar.showProgressBar" aria-pressed="false">字符进度条</button>
                <button type="button" class="toggle-chip" data-action="toggleStatusBarField" data-key="statusBar.showSpeed" aria-pressed="true">输出速率</button>
                <button type="button" class="toggle-chip" data-action="toggleStatusBarField" data-key="statusBar.showModel" aria-pressed="true">模型名</button>
                <button type="button" class="toggle-chip" data-action="toggleStatusBarField" data-key="statusBar.showCost" aria-pressed="false">会话费用</button>
                <button type="button" class="toggle-chip" data-action="toggleStatusBarField" data-key="statusBar.showTools" aria-pressed="true">运行中工具</button>
                <button type="button" class="toggle-chip" data-action="toggleStatusBarField" data-key="statusBar.showDuration" aria-pressed="false">会话时长</button>
                <button type="button" class="toggle-chip" data-action="toggleStatusBarField" data-key="statusBar.showTodos" aria-pressed="false">待办进度</button>
                <button type="button" class="toggle-chip" data-action="toggleStatusBarField" data-key="statusBar.showAgents" aria-pressed="false">子代理数</button>
                <button type="button" class="toggle-chip" data-action="toggleStatusBarField" data-key="statusBar.showGitBranch" aria-pressed="false">Git 分支</button>
              </div>
            </div>

            <div class="field">
              <div>
                <div class="field-label">上下文格式与分隔符</div>
                <div class="field-hint">自定义上下文数值展示方式与段落分隔符</div>
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <select class="settings-select" id="sb-context-format" data-action="selectStatusBarSetting" data-key="statusBar.contextFormat" aria-label="Context format">
                  <option value="percent">百分比 (42%)</option>
                  <option value="tokens">Token (84k/200k)</option>
                  <option value="both">两者 (42% · 84k/200k)</option>
                </select>
                <select class="settings-select" id="sb-separator" data-action="selectStatusBarSetting" data-key="statusBar.separator" aria-label="Separator">
                  <option value="dot">圆点 ( · )</option>
                  <option value="pipe">竖线 ( │ )</option>
                </select>
              </div>
            </div>

            <div class="field">
              <div>
                <div class="field-label">单击底栏动作</div>
                <div class="field-hint">选择点击右下角状态栏时触发的默认行为</div>
              </div>
              <select class="settings-select" id="sb-click-action" data-action="selectStatusBarSetting" data-key="statusBar.clickAction" aria-label="Click action">
                <option value="openDashboard">打开侧边栏面板</option>
                <option value="openDashboardTab">打开编辑器宽屏标签页</option>
                <option value="switchSession">快速切换聚焦会话</option>
              </select>
            </div>

            <div class="field field-boolean">
              <div>
                <div class="field-label">无活跃对话时自动隐藏状态栏</div>
                <div class="field-hint">仅在 Claude Code 进程运行或有后台任务时显示</div>
              </div>
              <button type="button" class="switch" id="sb-hide-inactive" role="switch" aria-checked="true" data-action="toggleStatusBarBool" data-key="statusBar.hideWhenInactive"></button>
            </div>

            <div class="field" style="grid-template-columns: minmax(0, 1fr);">
              <div>
                <div class="field-label">悬浮窗 (Hover Tooltip) 区块开关</div>
                <div class="field-hint">自由裁剪悬停卡片中展示的信息区块，关闭后自动收拢排版</div>
              </div>
              <div class="custom-chips-grid" id="sb-tooltip-chips">
                <button type="button" class="toggle-chip" data-action="toggleTooltipSection" data-section="context" aria-pressed="true">上下文与费用</button>
                <button type="button" class="toggle-chip" data-action="toggleTooltipSection" data-section="speed" aria-pressed="true">输出速率</button>
                <button type="button" class="toggle-chip" data-action="toggleTooltipSection" data-section="modelBranch" aria-pressed="true">模型与分支</button>
                <button type="button" class="toggle-chip" data-action="toggleTooltipSection" data-section="activityDur" aria-pressed="true">时长与活动</button>
                <button type="button" class="toggle-chip" data-action="toggleTooltipSection" data-section="tokens" aria-pressed="true">Token 明细</button>
                <button type="button" class="toggle-chip" data-action="toggleTooltipSection" data-section="todos" aria-pressed="true">待办进度</button>
                <button type="button" class="toggle-chip" data-action="toggleTooltipSection" data-section="agents" aria-pressed="true">代理与后台</button>
                <button type="button" class="toggle-chip" data-action="toggleTooltipSection" data-section="quota" aria-pressed="true">订阅配额</button>
                <button type="button" class="toggle-chip" data-action="toggleTooltipSection" data-section="actions" aria-pressed="true">快捷操作栏</button>
              </div>
            </div>
          </div>
        </section>

        <section class="block" id="settings-env-block">
          <div class="block-head">
            <span class="block-toggle">任务工具与环境配置</span>
          </div>
          <div class="block-body">
            <div id="todo-tools-panel" style="padding: 8px 0; border-bottom: 1px solid var(--border-soft);">
              <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px;" id="todo-tools-title">Official Task mode</div>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; cursor: pointer;">
                <input type="checkbox" id="todo-tools-toggle" />
                <span id="todo-tools-toggle-label">Enable official Task tools (TaskCreate / TaskUpdate / TaskList)</span>
              </label>
              <div id="todo-tools-status" style="font-size: 10.5px; color: var(--text-muted); margin-top: 6px; line-height: 1.4;"></div>
              <div id="todo-tools-caveat" style="font-size: 10.5px; color: var(--claude-amber); margin-top: 4px; line-height: 1.4;">New sessions only. Writes CLAUDE_CODE_ENABLE_TODO_TOOLS=1 and CLAUDE_CODE_ENABLE_TASKS=1.</div>
            </div>

            <div class="doc-btn-group">
              <button type="button" class="btn ghost" onclick="sendMessage('openSettingsJson')">⚙️ Claude settings.json</button>
              <button type="button" class="btn ghost" id="btn-open-agents-md" onclick="sendMessage('openProjectDoc', { docType: 'AGENTS' })">🤖 AGENTS.md</button>
              <button type="button" class="btn ghost" id="btn-open-claude-md" onclick="sendMessage('openProjectDoc', { docType: 'CLAUDE' })">📝 CLAUDE.md</button>
              <button type="button" class="btn ghost" data-action="openVsCodeSettings">🔧 VS Code 插件设置</button>
            </div>
          </div>
        </section>

      </div>
    </main>
  </div>`;
}
