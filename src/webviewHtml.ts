export function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Hub</title>
  <style>
    :root {
      --bg-color: var(--vscode-sideBar-background);
      --card-bg: var(--vscode-editor-background, rgba(30, 30, 30, 0.5));
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(255, 255, 255, 0.04);
      --claude-accent: #e07a5f;
      --claude-amber: #d97706;
      --success-color: #4ec9b0;
      --warning-color: #d7ba7d;
      --danger-color: #f14c4c;
      --text-main: var(--vscode-foreground);
      --text-muted: var(--vscode-descriptionForeground, #8c8c8c);
      --font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-family);
      color: var(--text-main);
      background-color: var(--bg-color);
      font-size: 12px;
      line-height: 1.45;
      padding: 10px 8px 24px 8px;
      user-select: none;
      overflow-x: hidden;
    }

    /* Top Bar */
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding: 0 2px;
    }

    .top-title {
      font-weight: 700;
      font-size: 12px;
      letter-spacing: -0.2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .top-actions {
      display: flex;
      gap: 4px;
    }

    .icon-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      border-radius: 4px;
      padding: 3px 6px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-main);
    }

    .icon-btn.active {
      background: rgba(224, 122, 95, 0.16);
      border-color: rgba(224, 122, 95, 0.4);
      color: var(--claude-accent);
      font-weight: 600;
    }

    /* Accordion Section */
    .section-wrap {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      margin-bottom: 8px;
      overflow: hidden;
      transition: border-color 0.2s;
    }

    .section-wrap:hover {
      border-color: rgba(255, 255, 255, 0.14);
    }

    .section-header {
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-weight: 600;
      font-size: 11.5px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid transparent;
      user-select: none;
    }

    .section-header:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .section-header-title {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .caret {
      font-size: 9px;
      transition: transform 0.2s ease;
      color: var(--text-muted);
      display: inline-block;
    }

    .section-wrap.collapsed .caret {
      transform: rotate(-90deg);
    }

    .section-wrap.collapsed .section-header {
      border-bottom-color: transparent;
    }

    .section-wrap:not(.collapsed) .section-header {
      border-bottom-color: var(--card-border);
    }

    .section-body {
      padding: 10px;
      display: block;
    }

    .section-wrap.collapsed .section-body {
      display: none;
    }

    /* Status Pill */
    .status-pill {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-muted);
    }

    .status-pill.active {
      background: rgba(78, 201, 176, 0.15);
      color: var(--success-color);
      border: 1px solid rgba(78, 201, 176, 0.3);
    }

    .status-pill.idle {
      background: rgba(140, 140, 140, 0.15);
      color: var(--text-muted);
    }

    .status-pill.focused {
      background: rgba(224, 122, 95, 0.15);
      color: var(--claude-accent);
      border: 1px solid rgba(224, 122, 95, 0.3);
    }

    /* Progress Bar */
    .progress-bar-track {
      background: rgba(255, 255, 255, 0.08);
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin: 6px 0 8px 0;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: 3px;
      background: linear-gradient(90deg, #4ec9b0, #d97706);
      transition: width 0.3s ease;
    }

    /* Metrics Bubbles */
    .metrics-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
    }

    .metric-bubble {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 10.5px;
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .metric-bubble-lbl {
      color: var(--text-muted);
    }

    .metric-bubble-val {
      font-weight: 600;
      color: var(--text-main);
    }

    /* Running Tool Banner */
    .running-bar {
      background: rgba(224, 122, 95, 0.12);
      border: 1px solid rgba(224, 122, 95, 0.3);
      border-radius: 4px;
      padding: 6px 8px;
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }

    .spin {
      display: inline-block;
      animation: spin 1.5s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* Session Manager Filters */
    .filter-chips-row {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    }

    .filter-chip {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 10px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .filter-chip:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-main);
    }

    .filter-chip.active {
      background: var(--claude-accent);
      color: #fff;
      border-color: var(--claude-accent);
      font-weight: 600;
    }

    .search-box {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      margin-bottom: 8px;
      outline: none;
    }

    .search-box:focus {
      border-color: var(--claude-accent);
    }

    /* Session Card */
    .session-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 5px;
      padding: 8px;
      margin-bottom: 6px;
      transition: all 0.15s ease;
    }

    .session-card:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .session-card.focused {
      border-color: rgba(224, 122, 95, 0.5);
      background: rgba(224, 122, 95, 0.06);
    }

    .session-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 3px;
      gap: 6px;
    }

    .session-project-name {
      font-weight: 600;
      font-size: 11.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .session-title-text {
      color: var(--text-muted);
      font-size: 10.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 5px;
    }

    .session-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: var(--text-muted);
      margin-bottom: 6px;
      flex-wrap: wrap;
      gap: 4px;
    }

    .session-actions-row {
      display: flex;
      gap: 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 6px;
    }

    .session-act-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-main);
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      transition: all 0.15s ease;
    }

    .session-act-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }

    .session-act-btn.fork:hover {
      background: rgba(78, 201, 176, 0.2);
      border-color: var(--success-color);
      color: var(--success-color);
    }

    .session-act-btn.focus:hover {
      background: rgba(224, 122, 95, 0.2);
      border-color: var(--claude-accent);
      color: var(--claude-accent);
    }

    .session-act-btn.delete:hover {
      background: rgba(244, 71, 71, 0.2);
      border-color: #f44747;
      color: #f44747;
    }

    /* Pagination Bar */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      color: var(--text-muted);
      padding-top: 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      margin-top: 6px;
    }

    .page-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-main);
      border-radius: 3px;
      padding: 2px 8px;
      font-size: 10px;
      cursor: pointer;
    }

    .page-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    /* Features / MCP / Skills */
    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .feature-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.03);
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 11px;
    }

    .switch-btn {
      cursor: pointer;
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: transparent;
      color: var(--text-muted);
    }

    .switch-btn.on {
      background: rgba(78, 201, 176, 0.2);
      border-color: var(--success-color);
      color: var(--success-color);
    }

    /* Input & Button */
    .form-group {
      margin-bottom: 8px;
    }

    .form-label {
      font-size: 10.5px;
      color: var(--text-muted);
      margin-bottom: 3px;
      display: block;
    }

    .form-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      outline: none;
    }

    .form-input:focus {
      border-color: var(--claude-accent);
    }

    .btn {
      width: 100%;
      padding: 5px 10px;
      border: 1px solid transparent;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
    }

    .btn-primary {
      background: var(--claude-accent);
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #cf6c52;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-main);
      border-color: var(--card-border);
      margin-top: 6px;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .toast {
      background: rgba(78, 201, 176, 0.2);
      color: var(--success-color);
      border: 1px solid rgba(78, 201, 176, 0.3);
      border-radius: 4px;
      padding: 4px;
      text-align: center;
      font-size: 10.5px;
      margin-top: 6px;
      display: none;
    }
  </style>
</head>
<body>

  <!-- Top Action Bar -->
  <div class="top-bar">
    <div class="top-title">
      <span>Claude</span>
      <span class="status-pill" id="global-status-pill">检测中</span>
    </div>
    <div class="top-actions">
      <button class="icon-btn" title="刷新状态" onclick="sendMessage('refresh')">🔄 刷新</button>
      <button class="icon-btn" id="top-filter-btn" title="切换当前工作区 / 全局过滤" onclick="sendMessage('toggleFilter')">📁 过滤</button>
    </div>
  </div>

  <!-- SECTION 1: 实时运行监控 (常驻展开) -->
  <div class="section-wrap" id="sec-monitor">
    <div class="section-header" onclick="toggleSection('sec-monitor')">
      <span class="section-header-title">
        <span class="caret">▼</span>
        <span>📊 实时运行监控</span>
      </span>
      <span id="session-status-badge" class="status-pill">--</span>
    </div>
    <div class="section-body">

      <!-- Project Name & Token % -->
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
        <span id="proj-name" style="font-weight: 600; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%;">未检测到会话</span>
        <span id="token-pct" style="font-weight: 700; color: var(--claude-accent);">0%</span>
      </div>

      <!-- Token Limit Bar -->
      <div class="progress-bar-track">
        <div id="token-fill" class="progress-bar-fill" style="width: 0%;"></div>
      </div>

      <!-- Detail Bubbles -->
      <div class="metrics-row">
        <div class="metric-bubble"><span class="metric-bubble-lbl">输入</span><span id="m-in" class="metric-bubble-val">0</span></div>
        <div class="metric-bubble"><span class="metric-bubble-lbl">缓存</span><span id="m-cache" class="metric-bubble-val">0</span></div>
        <div class="metric-bubble"><span class="metric-bubble-lbl">写入</span><span id="m-write" class="metric-bubble-val">0</span></div>
        <div class="metric-bubble"><span class="metric-bubble-lbl">输出</span><span id="m-out" class="metric-bubble-val">0</span></div>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-top: 4px;">
        <span id="model-tag">模型: --</span>
        <span id="branch-tag">🌿 --</span>
      </div>

      <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
        <span id="cost-label">预估消耗: &lt; $0.001</span>
      </div>

      <!-- Live Running Tool Banner (Auto hidden when idle) -->
      <div id="running-tool-banner" class="running-bar" style="display: none;">
        <div>
          <span class="spin">🔄</span>
          <strong id="running-tool-name" style="color: var(--claude-accent);">Edit</strong>
          <span id="running-tool-target" style="opacity: 0.8; margin-left: 4px;"></span>
        </div>
        <span id="running-tool-dur" class="status-pill">0s</span>
      </div>

      <!-- Tasks Checklist (Auto collapsed when empty) -->
      <div id="todos-container" style="margin-top: 8px; display: none;">
        <div style="display: flex; justify-content: space-between; font-weight: 500; font-size: 11px; margin-bottom: 4px;">
          <span>📋 待办任务</span>
          <span id="todos-counter" class="status-pill">0/0</span>
        </div>
        <div id="todos-list"></div>
      </div>

      <!-- 5h Quota -->
      <div id="sub-container" style="margin-top: 8px; display: none;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-bottom: 2px;">
          <span>⏳ 5小时订阅配额</span>
          <span id="sub-reset"></span>
        </div>
        <div class="progress-bar-track" style="margin: 0;">
          <div id="sub-fill" class="progress-bar-fill" style="width: 0%;"></div>
        </div>
      </div>

    </div>
  </div>

  <!-- SECTION 2: 会话管理中心 (Session Manager - 默认展开) -->
  <div class="section-wrap" id="sec-sessions">
    <div class="section-header" onclick="toggleSection('sec-sessions')">
      <span class="section-header-title">
        <span class="caret">▼</span>
        <span>🕒 会话历史 (Session Manager)</span>
      </span>
      <span id="sessions-total-badge" class="status-pill">0 个会话</span>
    </div>
    <div class="section-body">

      <!-- Filter Chips -->
      <div class="filter-chips-row">
        <button class="filter-chip active" id="chip-all" onclick="setSessionFilter('all')">全部</button>
        <button class="filter-chip" id="chip-ws" onclick="setSessionFilter('workspace')">当前工作区</button>
        <button class="filter-chip" id="chip-active" onclick="setSessionFilter('active')">活跃中</button>
      </div>

      <!-- Search Input -->
      <input type="text" class="search-box" id="session-search" placeholder="🔍 搜索项目名称、会话标题..." oninput="onSearchInput(this.value)">

      <!-- Session Cards List -->
      <div id="session-cards-list">
        <div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 12px 0;">加载会话中...</div>
      </div>

      <!-- Pagination Bar -->
      <div class="pagination-bar" id="session-pagination">
        <button class="page-btn" id="btn-prev-page" onclick="prevPage()">◀ 上一页</button>
        <span id="pagination-info">第 1 / 1 页</span>
        <button class="page-btn" id="btn-next-page" onclick="nextPage()">下一页 ▶</button>
      </div>

    </div>
  </div>

  <!-- SECTION 3: 扩展能力 MCP & Skills (默认收起) -->
  <div class="section-wrap collapsed" id="sec-extensions">
    <div class="section-header" onclick="toggleSection('sec-extensions')">
      <span class="section-header-title">
        <span class="caret">▼</span>
        <span>🧩 扩展能力 (MCP &amp; Skills)</span>
      </span>
      <span id="ext-count-badge" class="status-pill">0 项</span>
    </div>
    <div class="section-body">

      <!-- MCP Servers -->
      <div style="font-weight: 600; font-size: 11px; margin-bottom: 4px;">🔌 MCP 服务器</div>
      <div id="mcp-servers-list" class="feature-list" style="margin-bottom: 10px;">
        <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
      </div>

      <!-- Skills -->
      <div style="font-weight: 600; font-size: 11px; margin-bottom: 4px;">⚡ 已安装技能 (Skills)</div>
      <div id="skills-list" class="feature-list">
        <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
      </div>

    </div>
  </div>

  <!-- SECTION 4: 网络代理与高级环境 (默认收起) -->
  <div class="section-wrap collapsed" id="sec-advanced">
    <div class="section-header" onclick="toggleSection('sec-advanced')">
      <span class="section-header-title">
        <span class="caret">▼</span>
        <span>🌐 网络代理与环境配置</span>
      </span>
      <span class="status-pill" style="font-size: 9px;">配置</span>
    </div>
    <div class="section-body">

      <div class="form-group">
        <label class="form-label">API Base URL (代理地址)</label>
        <input type="text" class="form-input" id="cfg-base-url" placeholder="https://api.anthropic.com">
      </div>

      <button class="btn btn-primary" onclick="saveProxyConfig()">💾 保存代理配置</button>
      <div id="save-toast" class="toast">✓ 配置已保存更新</div>

      <button class="btn btn-secondary" onclick="sendMessage('openSettingsJson')">⚙️ 打开 Claude settings.json</button>
      <div style="display: flex; gap: 6px; margin-top: 6px;">
        <button class="btn btn-secondary" id="btn-open-agents-md" style="flex: 1; margin: 0; padding: 7px 4px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="sendMessage('openProjectDoc', { docType: 'AGENTS' })" title="打开或创建项目根目录 AGENTS.md (支持新版 Agent 规范)">🤖 打开 AGENTS.md</button>
        <button class="btn btn-secondary" id="btn-open-claude-md" style="flex: 1; margin: 0; padding: 7px 4px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="sendMessage('openProjectDoc', { docType: 'CLAUDE' })" title="打开或创建项目根目录 CLAUDE.md (经典项目说明)">📝 打开 CLAUDE.md</button>
      </div>

    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Accordion State Memory
    function toggleSection(id) {
      const el = document.getElementById(id);
      el.classList.toggle('collapsed');
      try {
        localStorage.setItem('ch_sec_' + id, el.classList.contains('collapsed') ? '0' : '1');
      } catch (e) {}
    }

    ['sec-monitor', 'sec-sessions', 'sec-extensions', 'sec-advanced'].forEach(id => {
      try {
        const val = localStorage.getItem('ch_sec_' + id);
        if (val === '0') document.getElementById(id).classList.add('collapsed');
        if (val === '1') document.getElementById(id).classList.remove('collapsed');
      } catch (e) {}
    });

    function sendMessage(type, data = {}) {
      vscode.postMessage({ type, ...data });
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[ch] || ch));
    }

    function escapeAttribute(value) {
      return escapeHtml(value);
    }

    document.addEventListener('click', event => {
      const source = event.target instanceof Element ? event.target : null;
      const actionElement = source ? source.closest('[data-action]') : null;
      if (!actionElement) return;

      const action = actionElement.getAttribute('data-action');
      if (!action) return;

      if (action === 'focusSession' || action === 'forkSession' || action === 'deleteSession') {
        sendMessage(action, { sessionId: actionElement.getAttribute('data-session-id') || '' });
      } else if (action === 'openSessionFile') {
        sendMessage(action, { filePath: actionElement.getAttribute('data-file-path') || '' });
      } else if (action === 'toggleMcp') {
        sendMessage(action, {
          name: actionElement.getAttribute('data-name') || '',
          enabled: actionElement.getAttribute('data-enabled') === 'true'
        });
      } else if (action === 'openSkill') {
        sendMessage(action, { filePath: actionElement.getAttribute('data-file-path') || '' });
      }
    });

    // Sessions State
    let allSessions = [];
    let focusedSessionId = null;
    let currentFilter = 'all';
    let backendFilterMode = null;
    let searchKeyword = '';
    let currentPage = 1;
    const pageSize = 6;

    function updateTopFilterButton(mode) {
      const btn = document.getElementById('top-filter-btn');
      if (!btn) return;
      if (mode === 'currentWorkspace') {
        btn.innerHTML = '📁 工作区';
        btn.className = 'icon-btn active';
        btn.title = '当前过滤：仅当前工作区（点击切换为全部会话）';
      } else {
        btn.innerHTML = '🌐 全部';
        btn.className = 'icon-btn';
        btn.title = '当前过滤：显示全部会话（点击切换为仅当前工作区）';
      }
    }

    function setSessionFilter(filter, notifyBackend = true) {
      currentFilter = filter;
      currentPage = 1;
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      if (filter === 'all') {
        const chip = document.getElementById('chip-all');
        if (chip) chip.classList.add('active');
        if (notifyBackend) {
          backendFilterMode = 'all';
          updateTopFilterButton('all');
          sendMessage('setFilterMode', { mode: 'all' });
        }
      } else if (filter === 'workspace') {
        const chip = document.getElementById('chip-ws');
        if (chip) chip.classList.add('active');
        if (notifyBackend) {
          backendFilterMode = 'currentWorkspace';
          updateTopFilterButton('currentWorkspace');
          sendMessage('setFilterMode', { mode: 'currentWorkspace' });
        }
      } else if (filter === 'active') {
        const chip = document.getElementById('chip-active');
        if (chip) chip.classList.add('active');
      }
      renderSessionsList();
    }

    function onSearchInput(val) {
      searchKeyword = (val || '').toLowerCase().trim();
      currentPage = 1;
      renderSessionsList();
    }

    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        renderSessionsList();
      }
    }

    function nextPage() {
      currentPage++;
      renderSessionsList();
    }

    function formatRelativeTime(timestamp) {
      if (!timestamp) return '';
      const diffMs = Date.now() - timestamp;
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return '刚刚';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return diffMin + '分钟前';
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return diffHours + '小时前';
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return '昨天';
      if (diffDays < 7) return diffDays + '天前';
      const d = new Date(timestamp);
      return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function formatTokenCount(num) {
      if (!num || num === 0) return '0';
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
      return String(num);
    }

    function renderSessionsList() {
      const container = document.getElementById('session-cards-list');
      const totalBadge = document.getElementById('sessions-total-badge');
      const wsCount = allSessions.filter(s => s.isCurrentWorkspace).length;
      const totalCount = allSessions.length;

      if (currentFilter === 'workspace') {
        totalBadge.innerText = wsCount + ' / ' + totalCount + ' 个会话';
      } else if (currentFilter === 'active') {
        const activeCount = allSessions.filter(s => !s.isIdle).length;
        totalBadge.innerText = activeCount + ' / ' + totalCount + ' 个会话';
      } else {
        totalBadge.innerText = totalCount + ' 个会话';
      }

      let filtered = allSessions.filter(s => {
        if (currentFilter === 'workspace' && !s.isCurrentWorkspace) return false;
        if (currentFilter === 'active' && s.isIdle) return false;
        if (searchKeyword) {
          const matchProj = (s.projectName || '').toLowerCase().includes(searchKeyword);
          const matchTitle = (s.sessionTitle || '').toLowerCase().includes(searchKeyword);
          const matchBranch = (s.gitBranch || '').toLowerCase().includes(searchKeyword);
          const matchModel = (s.model || '').toLowerCase().includes(searchKeyword);
          if (!matchProj && !matchTitle && !matchBranch && !matchModel) return false;
        }
        return true;
      });

      const totalPages = Math.ceil(filtered.length / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      document.getElementById('pagination-info').innerText = '第 ' + currentPage + ' / ' + totalPages + ' 页 (共 ' + filtered.length + ' 条)';
      document.getElementById('btn-prev-page').disabled = currentPage <= 1;
      document.getElementById('btn-next-page').disabled = currentPage >= totalPages;

      if (filtered.length === 0) {
        if (currentFilter === 'workspace') {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 16px 0;"><div>当前工作区暂无会话</div><div style="margin-top: 8px;"><button class="filter-chip active" style="display: inline-block; padding: 3px 10px;" onclick="setSessionFilter(\\'all\\')">🌐 查看全部项目会话</button></div></div>';
        } else {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 16px 0;">未找到符合条件的会话</div>';
        }
        return;
      }

      const startIndex = (currentPage - 1) * pageSize;
      const pageSessions = filtered.slice(startIndex, startIndex + pageSize);

      container.innerHTML = pageSessions.map(s => {
        const isFocused = s.sessionId === focusedSessionId;
        const focusedTag = isFocused ? '<span class="status-pill focused" style="font-size: 9px;">当前聚焦</span>' : '';
        const activeTag = !s.isIdle ? '<span class="status-pill active" style="font-size: 9px;">⚡ 活跃</span>' : '<span class="status-pill idle" style="font-size: 9px;">💤 闲置</span>';
        const cardClass = isFocused ? 'session-card focused' : 'session-card';
        const timeStr = formatRelativeTime(s.lastUpdated);
        const tokens = s.tokenUsage ? formatTokenCount(s.tokenUsage.totalTokens) : '0';
        const pct = s.tokenUsage && s.tokenUsage.percentage ? s.tokenUsage.percentage + '%' : '0%';
        const branchStr = s.gitBranch ? '🌿 ' + escapeHtml(s.gitBranch) : '';
        const titleStr = s.sessionTitle ? s.sessionTitle : '未命名对话';
        const projectNameStr = escapeHtml(s.projectName || '未知项目');
        const titleDisplay = escapeHtml(titleStr);
        const titleAttr = escapeAttribute(titleStr);
        const modelDisplay = escapeHtml(s.model || 'Claude');
        const sessionIdAttr = escapeAttribute(s.sessionId || '');
        const sessionFileAttr = escapeAttribute(s.sessionFile || '');

        const isFork = titleStr.includes('(Fork');
        const forkBadge = isFork ? ' <span style="background: rgba(78, 201, 176, 0.15); color: var(--success-color); font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: 600;">Fork</span>' : '';

        return '<div class="' + cardClass + '">' +
          '<div class="session-header-row">' +
            '<span class="session-project-name" title="' + projectNameStr + '">' + projectNameStr + '</span>' +
            '<div style="display:flex; gap: 4px;">' + focusedTag + activeTag + '</div>' +
          '</div>' +
          '<div class="session-title-text" title="' + titleAttr + '">' + titleDisplay + forkBadge + '</div>' +
          '<div class="session-meta-row">' +
            '<span>' + pct + ' (' + tokens + ' Tokens) · ' + modelDisplay + '</span>' +
            '<span>' + branchStr + (branchStr ? ' · ' : '') + timeStr + '</span>' +
          '</div>' +
          '<div class="session-actions-row">' +
            '<button class="session-act-btn focus" data-action="focusSession" data-session-id="' + sessionIdAttr + '">👀 聚焦</button>' +
            '<button class="session-act-btn fork" data-action="forkSession" data-session-id="' + sessionIdAttr + '">🌿 分叉 Fork</button>' +
            '<button class="session-act-btn" data-action="openSessionFile" data-file-path="' + sessionFileAttr + '">📄 日志</button>' +
            '<button class="session-act-btn delete" data-action="deleteSession" data-session-id="' + sessionIdAttr + '">🗑️ 删除</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function saveProxyConfig() {
      const apiBaseUrl = document.getElementById('cfg-base-url').value.trim();
      sendMessage('saveConfig', { apiBaseUrl });
      const toast = document.getElementById('save-toast');
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }

    // Message Receiver
    window.addEventListener('message', event => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'updateSession') {
        const s = msg.session;
        if (msg.allSessions) {
          allSessions = msg.allSessions;
        }
        if (msg.focusedSessionId !== undefined) {
          focusedSessionId = msg.focusedSessionId;
        }

        if (msg.filterMode !== undefined) {
          const modeChanged = backendFilterMode !== msg.filterMode;
          backendFilterMode = msg.filterMode;
          updateTopFilterButton(msg.filterMode);

          if (modeChanged) {
            currentFilter = msg.filterMode === 'currentWorkspace' ? 'workspace' : 'all';
            currentPage = 1;
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            const activeChip = document.getElementById(msg.filterMode === 'currentWorkspace' ? 'chip-ws' : 'chip-all');
            if (activeChip) activeChip.classList.add('active');
          }
        }

        renderSessionsList();

        if (s) {
          document.getElementById('proj-name').innerText = s.projectName || '未知项目';
          const pct = (s.tokenUsage && s.tokenUsage.percentage) || 0;
          document.getElementById('token-pct').innerText = pct + '%';
          document.getElementById('token-fill').style.width = Math.min(pct, 100) + '%';

          if (s.tokenUsage) {
            document.getElementById('m-in').innerText = formatTokenCount(s.tokenUsage.inputTokens);
            document.getElementById('m-cache').innerText = formatTokenCount(s.tokenUsage.cacheReadTokens);
            document.getElementById('m-write').innerText = formatTokenCount(s.tokenUsage.cacheCreationTokens);
            document.getElementById('m-out').innerText = formatTokenCount(s.tokenUsage.outputTokens);
          }

          const dispModel = s.modelDisplay || s.model || '默认';
          const respExtra = (s.lastResponseModelDisplay && s.lastResponseModelDisplay !== dispModel)
            ? ' (响应: ' + s.lastResponseModelDisplay + ')'
            : '';
          document.getElementById('model-tag').innerText = '模型: ' + dispModel + respExtra;
          document.getElementById('branch-tag').innerText = s.gitBranch ? '🌿 ' + s.gitBranch : '';
          document.getElementById('cost-label').innerText = '预估消耗: ' + (msg.cost || '< $0.001');

          const statusBadge = document.getElementById('session-status-badge');
          const globalBadge = document.getElementById('global-status-pill');
          if (!s.isIdle) {
            statusBadge.className = 'status-pill active';
            statusBadge.innerText = '⚡ 活跃';
            globalBadge.className = 'status-pill active';
            globalBadge.innerText = '活跃';
          } else {
            statusBadge.className = 'status-pill idle';
            statusBadge.innerText = '💤 闲置';
            globalBadge.className = 'status-pill idle';
            globalBadge.innerText = '闲置';
          }

          // Active Tool Banner
          const banner = document.getElementById('running-tool-banner');
          if (s.activeTools && s.activeTools.length > 0 && !s.isIdle) {
            const t = s.activeTools[0];
            document.getElementById('running-tool-name').innerText = t.name;
            document.getElementById('running-tool-target').innerText = t.target ? ' ' + t.target : '';
            document.getElementById('running-tool-dur').innerText = t.durationMs ? Math.round(t.durationMs / 1000) + 's' : '0s';
            banner.style.display = 'flex';
          } else {
            banner.style.display = 'none';
          }

          // Todos List
          const todosWrap = document.getElementById('todos-container');
          const todosList = document.getElementById('todos-list');
          if (s.todos && s.todos.length > 0) {
            todosWrap.style.display = 'block';
            const done = s.todos.filter(x => x.status === 'completed').length;
            document.getElementById('todos-counter').innerText = done + '/' + s.todos.length;
            todosList.innerHTML = s.todos.map(td => {
              const checked = td.status === 'completed' ? 'checked' : '';
              const strike = td.status === 'completed' ? 'style="text-decoration: line-through; opacity: 0.6;"' : '';
              return '<div style="display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 2px 0;">' +
                '<input type="checkbox" ' + checked + ' disabled>' +
                '<span ' + strike + '>' + escapeHtml(td.content) + '</span>' +
              '</div>';
            }).join('');
          } else {
            todosWrap.style.display = 'none';
          }
        }

        // Subscription Rate Limits
        if (msg.subscription && msg.subscription.fiveHour) {
          document.getElementById('sub-container').style.display = 'block';
          const pct = Math.min(100, Math.round(msg.subscription.fiveHour.utilization || 0));
          document.getElementById('sub-fill').style.width = pct + '%';
          document.getElementById('sub-reset').innerText = pct + '% · ' + (msg.subscription.fiveHour.resetsAt ? new Date(msg.subscription.fiveHour.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
        }
      }

      if (msg.type === 'loadConfig') {
        const c = msg.config || {};
        if (c.apiBaseUrl) {
          document.getElementById('cfg-base-url').value = c.apiBaseUrl;
        }
        if (msg.projectDocs) {
          const btnAgents = document.getElementById('btn-open-agents-md');
          const btnClaude = document.getElementById('btn-open-claude-md');
          if (btnAgents) {
            btnAgents.innerHTML = msg.projectDocs.hasAgentsMd ? '🤖 编辑 AGENTS.md' : '🤖 生成 AGENTS.md';
            btnAgents.title = msg.projectDocs.hasAgentsMd ? '当前项目已存在 AGENTS.md，点击打开编辑' : '当前项目未创建 AGENTS.md，点击自动生成模板';
          }
          if (btnClaude) {
            btnClaude.innerHTML = msg.projectDocs.hasClaudeMd ? '📝 编辑 CLAUDE.md' : '📝 生成 CLAUDE.md';
            btnClaude.title = msg.projectDocs.hasClaudeMd ? '当前项目已存在 CLAUDE.md，点击打开编辑' : '当前项目未创建 CLAUDE.md，点击自动生成模板';
          }
        }
      }

      if (msg.type === 'loadExtensions') {
        const mcpList = document.getElementById('mcp-servers-list');
        if (msg.mcpServers && msg.mcpServers.length > 0) {
          mcpList.innerHTML = msg.mcpServers.map(s => {
            const enabled = s.isEnabled === true || s.enabled === true;
            const onCls = enabled ? 'switch-btn on' : 'switch-btn';
            const onTxt = enabled ? 'ON' : 'OFF';
            return '<div class="feature-item">' +
              '<span>' + escapeHtml(s.name) + '</span>' +
              '<button class="' + onCls + '" data-action="toggleMcp" data-name="' + escapeAttribute(s.name) + '" data-enabled="' + (!enabled) + '">' + onTxt + '</button>' +
            '</div>';
          }).join('');
        } else {
          mcpList.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">未检测到外部 MCP 配置</div>';
        }

        const skillsList = document.getElementById('skills-list');
        if (msg.skills && msg.skills.length > 0) {
          skillsList.innerHTML = msg.skills.map(sk => {
            const skillPath = sk.filePath || sk.path || '';
            return '<div class="feature-item" style="cursor: pointer;" data-action="openSkill" data-file-path="' + escapeAttribute(skillPath) + '">' +
              '<div>' +
                '<div style="font-weight: 500;">' + escapeHtml(sk.name) + '</div>' +
                '<div style="font-size: 10px; color: var(--text-muted);">' + escapeHtml(sk.description || '无描述') + '</div>' +
              '</div>' +
              '<span style="font-size: 10px; color: var(--claude-accent);">查看</span>' +
            '</div>';
          }).join('');
        } else {
          skillsList.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">暂无本地 Skills 技能</div>';
        }

        const totalExt = (msg.mcpServers ? msg.mcpServers.length : 0) + (msg.skills ? msg.skills.length : 0);
        document.getElementById('ext-count-badge').innerText = totalExt + ' 项';
      }
    });

    // Notify backend ready
    sendMessage('ready');
  </script>
</body>
</html>`;
}
