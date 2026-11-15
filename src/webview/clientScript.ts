export function getWebviewClientScript(options?: { isSidebar?: boolean }): string {
  const isSidebarLiteral = options?.isSidebar === true ? 'true' : 'false';

  return `
    const vscode = acquireVsCodeApi();
    const IS_SIDEBAR = ${isSidebarLiteral};

    function updateLayoutMode() {
      const narrow = IS_SIDEBAR || window.innerWidth < 600;
      document.body.classList.toggle('narrow', narrow);
      document.body.classList.toggle('sidebar', IS_SIDEBAR);
      const openTabBtn = document.getElementById('hdr-open-tab-btn');
      if (openTabBtn) {
        openTabBtn.style.display = IS_SIDEBAR ? 'inline-flex' : 'none';
      }
    }
    window.addEventListener('resize', updateLayoutMode);
    updateLayoutMode();

    let hubUiStrings = {
      planNoChecklistWarn: 'Plan has no GFM checklist — phase status may be inaccurate. Prefer TaskCreate/TaskUpdate/TaskList, or checklist marks. (Hub todos ≠ slash /tasks.)',
      chipPending: 'Pending',
      chipActive: 'In progress',
      chipDone: 'Done',
      expand: 'Expand',
      collapse: 'Collapse',
      hubTodosTitle: 'Session tasks',
      hubTodosHint: 'Hub todos (Task tools), not slash /tasks.',
      clearHideOnly: 'Hide dashboard todos only; does not delete task files.',
      pickList: 'Choose list',
      needsList: 'Choose a task list to bind',
      creating: 'Creating…',
      depends: 'Depends on',
      blocks: 'Blocks',
      sourceNative: 'Native disk',
      sourceTasks: 'Task tools',
      sourceTodoWrite: 'TodoWrite',
      sourcePlan: 'Plan',
      sourceMarkdown: 'Checklist',
      sourceNone: 'No source',
      listId: 'List: {id}',
      optInHint: 'No Task or Checklist todos yet.',
      todoToolsTitle: 'Official Task mode',
      todoToolsToggle: 'Enable official Task tools (TaskCreate / TaskUpdate / TaskList)',
      todoToolsCaveat: 'New sessions only. Writes CLAUDE_CODE_ENABLE_TODO_TOOLS=1 and CLAUDE_CODE_ENABLE_TASKS=1.',
      todoToolsOn: 'On (settings.local.json)',
      todoToolsOff: 'Off',
      todoToolsEffectiveOn: 'Effective env: on',
      todoToolsEffectiveOff: 'Effective env: off',
      todoToolsObserved: 'Task tools observed in a session',
      todoToolsHooksNote: 'Hub hooks/bridge not installed (env-only).',
      modeTask: 'Task',
      modeChecklist: 'Checklist',
      modeNone: 'No todos',
      checklistAlso: 'Checklist also present',
      checklistHidden: 'Checklist hidden (tasks-only)',
      speedLabel: 'Latest response average',
      speedHint: 'Estimated from session records: output tokens divided by the API time of the latest completed request. Includes wait and thinking time; not live decode speed.',
      speedLast: 'last',
      speedSampling: 'sampling…',
      speedUnsupported: 'Session records lack the fields needed to estimate speed.',
      speedTerminalEnabled: 'Terminal collection is enabled; waiting for a sample.',
      speedSourceTranscript: 'session record estimate',
      speedSourceStatusLine: 'terminal status-line sample',
      speedMeasuredAt: 'sampled at {time}',
      speedEnable: 'Enable terminal speed collection',
      speedWaiting: 'Waiting for a completed response with usable timing records.',
      tbRefresh: 'Refresh status',
      tbOpenTab: 'Open in Editor Tab',
      tabMonitor: 'Monitor',
      tabSessions: 'Sessions',
      tabExtensions: 'Extensions',
      tabSettings: 'Settings',
      scopeWindow: 'This Window',
      scopeAll: 'All',
    };

    function applyHubUiStrings(ui) {
      if (!ui || typeof ui !== 'object') return;
      if (typeof ui.planNoChecklistWarn === 'string') hubUiStrings.planNoChecklistWarn = ui.planNoChecklistWarn;
      if (typeof ui.chipPending === 'string') hubUiStrings.chipPending = ui.chipPending;
      if (typeof ui.chipActive === 'string') hubUiStrings.chipActive = ui.chipActive;
      if (typeof ui.chipDone === 'string') hubUiStrings.chipDone = ui.chipDone;
      if (typeof ui.expand === 'string') hubUiStrings.expand = ui.expand;
      if (typeof ui.collapse === 'string') hubUiStrings.collapse = ui.collapse;
      const copyKeys = ['tbRefresh','tbRefreshShort','tbOpenTab','tbSlash','tbSearch','tbCost','tbTasks','tbWorktree','tbFilter','tbFilterWs','tbFilterAll','tbFilterWsShort','tbFilterAllShort','todoToolsTitle','todoToolsToggle','todoToolsCaveat','todoToolsOn','todoToolsOff','todoToolsEffectiveOn','todoToolsEffectiveOff','todoToolsObserved','todoToolsHooksNote','hubTodosTitle','hubTodosHint','clearHideOnly','pickList','needsList','creating','depends','blocks','sourceNative','sourceTasks','sourceTodoWrite','sourcePlan','sourceMarkdown','sourceNone','listId','optInHint','modeTask','modeChecklist','modeNone','checklistAlso','checklistHidden','speedLabel','speedHint','speedEnable','speedWaiting','speedLast','speedSampling','speedUnsupported','speedTerminalEnabled','speedSourceTranscript','speedSourceStatusLine','speedMeasuredAt','tabMonitor','tabSessions','tabExtensions','tabSettings','scopeWindow','scopeAll'];
      for (const k of copyKeys) { if (typeof ui[k] === 'string') hubUiStrings[k] = ui[k]; }
      const titleEl = document.getElementById('todos-title-label');
      if (titleEl && hubUiStrings.hubTodosTitle) {
        titleEl.textContent = '📋 ' + hubUiStrings.hubTodosTitle;
        titleEl.title = hubUiStrings.hubTodosHint || '';
      }
      const clearBtn = document.getElementById('todos-clear-btn');
      if (clearBtn && hubUiStrings.clearHideOnly) clearBtn.title = hubUiStrings.clearHideOnly;
      const pickBtn = document.getElementById('todos-pick-list-btn');
      if (pickBtn && hubUiStrings.pickList) pickBtn.textContent = hubUiStrings.pickList;
      const tabMonitor = document.getElementById('tab-btn-monitor');
      const tabSessions = document.getElementById('tab-btn-sessions');
      const tabExtensions = document.getElementById('tab-btn-extensions');
      const tabSettings = document.getElementById('tab-btn-settings');
      if (tabMonitor && hubUiStrings.tabMonitor) tabMonitor.textContent = hubUiStrings.tabMonitor;
      if (tabSessions && hubUiStrings.tabSessions) tabSessions.textContent = hubUiStrings.tabSessions;
      if (tabExtensions && hubUiStrings.tabExtensions) tabExtensions.textContent = hubUiStrings.tabExtensions;
      if (tabSettings && hubUiStrings.tabSettings) tabSettings.textContent = hubUiStrings.tabSettings;
      const scopeWs = document.getElementById('monitor-scope-ws');
      const scopeAll = document.getElementById('monitor-scope-all');
      if (scopeWs && hubUiStrings.scopeWindow) scopeWs.textContent = hubUiStrings.scopeWindow;
      if (scopeAll && hubUiStrings.scopeAll) scopeAll.textContent = hubUiStrings.scopeAll;
    }

    // 同步保存至 Webview 与扩展全局状态，重建视图及重启后均可恢复。
    const savedUiState = vscode.getState() || {};
    const mainTabs = ['monitor', 'sessions', 'extensions', 'settings'];
    let activeTab = 'monitor';
    let selectedReaderSessionId = null;
    let readerScrollY = 0;
    let uiStateRestored = false;
    let pendingScrollY = null;
    let uiStateSaveTimer = null;

    function switchMainTab(tab, persist) {
      if (!mainTabs.includes(tab)) tab = 'monitor';
      activeTab = tab;
      mainTabs.forEach(t => {
        const btn = document.getElementById('tab-btn-' + t);
        const view = document.getElementById('view-' + t);
        const isActive = t === tab;
        if (btn) btn.setAttribute('aria-selected', String(isActive));
        if (view) view.hidden = !isActive;
      });
      if (tab === 'sessions') {
        renderSessionsList();
        renderSessionReader();
      } else if (tab === 'extensions') {
        renderExtensionsPanel();
      }
      if (persist !== false) saveUiState();
    }

    function saveUiState() {
      const state = {
        activeTab,
        selectedReaderSessionId,
        sessionFilter: currentFilter,
        searchKeyword,
        extActiveTab,
        extSkillScope,
        extSearchQuery,
        extGroupManualState: { ...extGroupManualState },
        extShowAllPlugins,
        extShowAllLocalSkills,
        scrollY: window.scrollY,
      };
      vscode.setState(state);
      if (uiStateSaveTimer) clearTimeout(uiStateSaveTimer);
      uiStateSaveTimer = setTimeout(() => sendMessage('saveUiState', { state }), 200);
    }

    function restoreDashboardScroll() {
      if (pendingScrollY === null) return;
      window.scrollTo(0, pendingScrollY);
      pendingScrollY = null;
    }

    function restoreUiState(state) {
      if (uiStateRestored) return;
      uiStateRestored = true;
      state = state && typeof state === 'object' ? state : savedUiState;
      if (!state || typeof state !== 'object') return;
      if (typeof state.activeTab === 'string' && mainTabs.includes(state.activeTab)) {
        activeTab = state.activeTab;
      }
      if (typeof state.selectedReaderSessionId === 'string') {
        selectedReaderSessionId = state.selectedReaderSessionId;
      }
      if (['all', 'workspace', 'pinned', 'active'].includes(state.sessionFilter)) {
        currentFilter = state.sessionFilter;
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        const chip = document.getElementById({ all: 'chip-all', workspace: 'chip-ws', pinned: 'chip-pinned', active: 'chip-active' }[currentFilter]);
        if (chip) chip.classList.add('active');
      }
      if (typeof state.searchKeyword === 'string') {
        searchKeyword = state.searchKeyword.slice(0, 200).toLowerCase().trim();
        const searchEl = document.getElementById('session-search');
        if (searchEl) searchEl.value = searchKeyword;
      }
      if (['all', 'skills', 'plugins', 'mcp', 'memory', 'agents'].includes(state.extActiveTab)) extActiveTab = state.extActiveTab;
      if (['all', 'local', 'plugin'].includes(state.extSkillScope)) extSkillScope = state.extSkillScope;
      if (typeof state.extSearchQuery === 'string') {
        extSearchQuery = state.extSearchQuery.slice(0, 200);
        const extInput = document.getElementById('ext-search-input');
        const extClear = document.getElementById('ext-search-clear');
        if (extInput) extInput.value = extSearchQuery;
        if (extClear) extClear.style.display = extSearchQuery.trim() ? 'block' : 'none';
      }
      if (state.extGroupManualState && typeof state.extGroupManualState === 'object') {
        ['memory', 'plugins', 'mcp', 'agents', 'skills'].forEach(key => {
          if (typeof state.extGroupManualState[key] === 'boolean') extGroupManualState[key] = state.extGroupManualState[key];
        });
      }
      extShowAllPlugins = state.extShowAllPlugins === true;
      extShowAllLocalSkills = state.extShowAllLocalSkills === true;
      if (Number.isFinite(state.scrollY) && state.scrollY >= 0) pendingScrollY = state.scrollY;
      switchMainTab(activeTab, false);
      renderExtensionsPanel();
      renderSessionsList();
    }

    let userToggledAgents = false;
    let userManuallyOpened = false;
    let userToggledTodos = false;
    let userManuallyOpenedTodos = false;
    const expandedAgentKeys = new Set();

    function clearCompletedTodos(event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      const wrap = document.getElementById('todos-container');
      if (wrap) wrap.style.display = 'none';
      const list = document.getElementById('todos-list');
      if (list) list.innerHTML = '';
      userToggledTodos = false;
      userManuallyOpenedTodos = false;
      if (currentSession && currentSession.sessionId) {
        sendMessage('clearTodos', { sessionId: currentSession.sessionId });
      }
    }

    function copyTodoSyncPrompt(event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      if (currentSession) sendMessage('copyTaskSyncPrompt');
    }

    function shouldWarnPlanWithoutChecklist(session) {
      const policy = session && session.projectTodoPolicy;
      if (!policy || !policy.warn_plan_without_checklist) return false;
      const plan = session.plan;
      if (!plan) return false;
      return plan.isChecklist !== true;
    }

    function updateTodosPlanWarn(session) {
      const el = document.getElementById('todos-plan-warn');
      if (!el) return;
      if (shouldWarnPlanWithoutChecklist(session)) {
        el.textContent = '⚠️ ' + (hubUiStrings.planNoChecklistWarn || '');
        el.style.display = 'block';
      } else {
        el.textContent = '';
        el.style.display = 'none';
      }
    }

    const todoExpandState = new Map();

    function stripTodoMarkdownNoise(text) {
      if (!text) return '';
      let s = String(text).trim();
      s = s.replace(/^\\*\\*\\s*/, '').replace(/\\s*\\*\\*$/, '');
      s = s.replace(/\\*\\*/g, '');
      return s.replace(/\\s+/g, ' ').trim();
    }

    function splitTodoDisplay(td) {
      const rawContent = typeof td.content === 'string' ? td.content : '';
      const content = stripTodoMarkdownNoise(rawContent);
      const description = typeof td.description === 'string' ? td.description.trim() : '';
      const key = (typeof td.id === 'string' && td.id) ? td.id : (content || rawContent || 'todo');
      let title = content || 'Task';
      let body = description;
      if (!body) {
        const lines = rawContent.replace(/\\r\\n/g, '\\n').split('\\n').map(function(l) {
          return stripTodoMarkdownNoise(l);
        }).filter(Boolean);
        const first = lines[0] || content;
        const taskTitle = first.match(/^任务\\s*\\d+\\s*[:：].+$/);
        if (taskTitle && first.length <= 56) {
          title = first;
          body = lines.slice(1).join('\\n').trim();
          if (!body && content.length > first.length) {
            const idx = content.indexOf(first);
            body = content.slice(idx >= 0 ? idx + first.length : first.length).trim();
          }
        } else if (lines.length > 1 && first.length <= 42) {
          title = first;
          body = lines.slice(1).join('\\n').trim();
        } else if (content.length > 42) {
          const sent = content.search(/[。！？\\n]/);
          if (sent > 8 && sent <= 48) {
            title = content.slice(0, sent);
            body = content.slice(sent + 1).trim();
          } else {
            title = content.slice(0, 36).trim() + '…';
            body = content;
          }
        }
      } else {
        title = content || title;
      }
      if (!title) title = 'Task';
      if (!(body === content && title.endsWith('…')) && body.startsWith(title)) {
        body = body.slice(title.length).replace(/^[\\s:：\\-—]+/, '').trim();
      }
      const subtitle = (td.status === 'in_progress' && typeof td.activeForm === 'string' && td.activeForm.trim())
        ? td.activeForm.trim() : '';
      return { title: title, body: body, subtitle: subtitle, key: key };
    }

    function todoNeedsClamp(body) {
      if (!body) return false;
      const lines = body.split(/\\n/).length;
      return body.length > 90 || lines > 2;
    }

    function toggleTodoExpand(ev, key) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      todoExpandState.set(key, !todoExpandState.get(key));
      if (currentSession) renderTodosList(currentSession);
    }

    function getTodoChipLabel(status) {
      if (status === 'completed') return hubUiStrings.chipDone || 'Done';
      if (status === 'in_progress') return hubUiStrings.chipActive || 'In progress';
      return hubUiStrings.chipPending || 'Pending';
    }

    function getTodoActivityParts(session) {
      const agents = session.agents || [];
      const running = agents.filter(a => a.status === 'running').length;
      const ended = agents.length - running;
      const parts = [];
      const activeTodo = (session.todos || []).find(t => t.status === 'in_progress' && t.activeForm);
      if (activeTodo && activeTodo.activeForm) {
        parts.push({ text: activeTodo.activeForm, warn: false });
      }
      if (agents.length) {
        parts.push({
          text: 'Agent ' + (running ? running + ' 运行 · ' : '') + ended + '/' + agents.length + ' 已结束',
          warn: false
        });
      }
      if (!activeTodo) {
        if (!session.isIdle && session.activeTools && session.activeTools.length) {
          parts.push({ text: '工具 ' + session.activeTools[0].name + ' 运行中', warn: false });
        } else if (!session.isIdle && session.lastActivity &&
            (!session.currentTurnStartTime ||
              session.lastActivity.timestamp >= new Date(session.currentTurnStartTime).getTime())) {
          parts.push({ text: '最近 ' + session.lastActivity.name, warn: false });
        }
      }
      if (parts.length && (session.taskSource === 'plan' || session.taskSource === 'markdown') &&
          session.todos.every(t => t.status === 'pending')) {
        parts.push({ text: '阶段待确认', warn: true });
      }
      return parts;
    }

    function getTodoActivityText(session) {
      return getTodoActivityParts(session).map(p => p.text).join(' · ');
    }

    function renderTodosActivity(activityEl, session) {
      const parts = getTodoActivityParts(session);
      if (!parts.length) {
        activityEl.textContent = '';
        activityEl.style.display = 'none';
        return;
      }
      activityEl.innerHTML = parts.map(function(p, i) {
        const sep = i === 0 ? '' : '<span class="todos-activity-sep">·</span>';
        const cls = p.warn ? 'todos-activity-part todos-activity-warn' : 'todos-activity-part';
        return sep + '<span class="' + cls + '">' + escapeHtml(p.text) + '</span>';
      }).join('');
      activityEl.style.display = 'flex';
    }

    function resolveTodoLabel(session, id) {
      const hit = (session.todos || []).find(t => t.id === id);
      return hit ? hit.content : id;
    }

    function formatTodoDeps(session, td) {
      const bits = [];
      if (Array.isArray(td.blockedBy) && td.blockedBy.length) {
        bits.push((hubUiStrings.depends || 'Depends on') + ': ' + td.blockedBy.map(function(id) {
          return resolveTodoLabel(session, id);
        }).join(', '));
      }
      if (Array.isArray(td.blocks) && td.blocks.length) {
        bits.push((hubUiStrings.blocks || 'Blocks') + ': ' + td.blocks.map(function(id) {
          return resolveTodoLabel(session, id);
        }).join(', '));
      }
      return bits.length ? '<div class="todo-deps">' + escapeHtml(bits.join(' · ')) + '</div>' : '';
    }

    function updateTodosMeta(s) {
      const meta = document.getElementById('todos-meta');
      if (!meta) return;
      const hasTodos = (s.todos && s.todos.length) || (s.pendingTaskCreates && s.pendingTaskCreates.length) || s.taskListNeedsSelection || s.taskListId;
      if (!hasTodos && !(s.taskSource && s.taskSource !== 'none')) {
        meta.style.display = 'none';
        return;
      }
      meta.style.display = 'flex';
      const modeChip = document.getElementById('todos-mode-chip');
      const chip = document.getElementById('todos-source-chip');
      const checkChip = document.getElementById('todos-checklist-chip');
      const listLabel = document.getElementById('todos-list-label');
      const needs = document.getElementById('todos-needs-list');
      const pick = document.getElementById('todos-pick-list-btn');
      const mode = s.todoMode || (['native','tasks','todoWrite'].indexOf(s.taskSource) >= 0 ? 'task' : (['plan','markdown'].indexOf(s.taskSource) >= 0 ? 'checklist' : 'none'));
      if (modeChip) {
        modeChip.className = 'todos-mode-chip ' + mode;
        modeChip.textContent = mode === 'task' ? (hubUiStrings.modeTask || 'Task')
          : (mode === 'checklist' ? (hubUiStrings.modeChecklist || 'Checklist') : (hubUiStrings.modeNone || 'No todos'));
      }
      const sourceMap = {
        native: hubUiStrings.sourceNative,
        tasks: hubUiStrings.sourceTasks,
        todoWrite: hubUiStrings.sourceTodoWrite,
        plan: hubUiStrings.sourcePlan,
        markdown: hubUiStrings.sourceMarkdown,
        none: hubUiStrings.sourceNone,
      };
      if (chip) {
        chip.textContent = sourceMap[s.taskSource] || sourceMap.none || (s.taskSource || '');
        chip.style.display = (s.taskSource && s.taskSource !== 'none') ? 'inline' : 'none';
      }
      if (checkChip) {
        const tasksOnlyHidden = s.preferSource === 'tasks' && s.checklistAvailable && s.checklistFillAllowed === false;
        const also = mode === 'task' && s.checklistAvailable && s.checklistFillAllowed !== false;
        if (tasksOnlyHidden) {
          checkChip.style.display = 'inline';
          checkChip.className = 'todos-checklist-chip hidden-mode';
          checkChip.textContent = hubUiStrings.checklistHidden || 'Checklist hidden (tasks-only)';
        } else if (also) {
          checkChip.style.display = 'inline';
          checkChip.className = 'todos-checklist-chip';
          checkChip.textContent = hubUiStrings.checklistAlso || 'Checklist also present';
        } else {
          checkChip.style.display = 'none';
          checkChip.textContent = '';
        }
      }
      if (listLabel) {
        if (s.taskListId) {
          const tmpl = hubUiStrings.listId || 'List: {id}';
          listLabel.textContent = tmpl.replace('{id}', s.taskListId);
        } else {
          listLabel.textContent = '';
        }
      }
      if (pick) {
        pick.textContent = hubUiStrings.pickList || 'Choose list';
        pick.onclick = function(ev) {
          if (ev) ev.stopPropagation();
          sendMessage('selectTaskList');
        };
      }
      if (needs) {
        if (s.taskListNeedsSelection) {
          needs.style.display = 'inline';
          needs.textContent = hubUiStrings.needsList || '';
        } else {
          needs.style.display = 'none';
          needs.textContent = '';
        }
      }
      const clearBtn = document.getElementById('todos-clear-btn');
      if (clearBtn && hubUiStrings.clearHideOnly) clearBtn.title = hubUiStrings.clearHideOnly;
    }

    function updateTodosEmptyHint(s) {
      const el = document.getElementById('todos-empty-hint');
      if (!el) return;
      const hasDurable = s.todos && s.todos.length > 0;
      const hasPending = s.pendingTaskCreates && s.pendingTaskCreates.length > 0;
      const show = !hasDurable && !hasPending && !s.taskToolsObserved && (s.taskSource === 'none' || !s.taskSource);
      if (show) {
        el.style.display = 'block';
        el.textContent = hubUiStrings.optInHint || 'Turn on official Task mode (CLAUDE_CODE_ENABLE_TASKS) in Settings.';
      } else {
        el.style.display = 'none';
        el.textContent = '';
      }
    }

    function renderTodosList(s) {
      const todosList = document.getElementById('todos-list');
      if (!todosList || !s) return;
      updateTodosMeta(s);
      const durable = Array.isArray(s.todos) ? s.todos : [];
      const pending = Array.isArray(s.pendingTaskCreates) ? s.pendingTaskCreates : [];
      const pendingHtml = pending.map(function(pc) {
        const subject = pc.subject || 'Task';
        return '<div class="todo-item-card pending pending-create" data-pending-tool="' + escapeHtml(pc.toolUseId || '') + '">' +
          '<span class="todo-badge-icon"><span class="todo-spinner" role="img" aria-label="creating"></span></span>' +
          '<div class="todo-card-main">' +
            '<div class="todo-title-row">' +
              '<span class="todo-title">' + escapeHtml(subject) + '</span>' +
              '<span class="todo-status-chip pending">' + escapeHtml(hubUiStrings.creating || 'Creating…') + '</span>' +
            '</div>' +
            (pc.description ? '<div class="todo-body">' + escapeHtml(pc.description) + '</div>' : '') +
          '</div>' +
        '</div>';
      }).join('');
      const todosHtml = durable.map(function(td) {
        const statusClass = td.status === 'completed' ? 'completed' : (td.status === 'in_progress' ? 'in_progress' : 'pending');
        let iconHtml = '<span style="opacity: 0.5;">☐</span>';
        if (td.status === 'completed') {
          iconHtml = '<span style="color: #2ea043; font-weight: bold;">☑</span>';
        } else if (td.status === 'in_progress') {
          iconHtml = '<span class="todo-spinner" role="img" title="进行中" aria-label="进行中"></span>';
        }
        const parts = splitTodoDisplay(td);
        const expanded = !!todoExpandState.get(parts.key);
        const clamp = !expanded && todoNeedsClamp(parts.body);
        const chip = '<span class="todo-status-chip ' + statusClass + '">' + escapeHtml(getTodoChipLabel(td.status)) + '</span>';
        let bodyHtml = '';
        if (parts.body) {
          bodyHtml = '<div class="todo-body' + (clamp ? ' clamped' : '') + '">' + escapeHtml(parts.body) + '</div>';
          if (todoNeedsClamp(parts.body)) {
            const label = expanded ? (hubUiStrings.collapse || 'Collapse') : (hubUiStrings.expand || 'Expand');
            bodyHtml += '<button type="button" class="todo-expand-btn" data-todo-key="' + escapeHtml(parts.key) + '">' + escapeHtml(label) + '</button>';
          }
        }
        const subHtml = parts.subtitle
          ? '<div class="todo-active-form">' + escapeHtml(parts.subtitle) + '</div>'
          : '';
        const depsHtml = formatTodoDeps(s, td);
        return '<div class="todo-item-card ' + statusClass + '" data-todo-id="' + escapeHtml(parts.key) + '">' +
          '<span class="todo-badge-icon">' + iconHtml + '</span>' +
          '<div class="todo-card-main">' +
            '<div class="todo-title-row">' +
              '<span class="todo-title">' + escapeHtml(parts.title) + '</span>' +
              chip +
            '</div>' +
            bodyHtml +
            subHtml +
            depsHtml +
          '</div>' +
        '</div>';
      }).join('');
      todosList.innerHTML = pendingHtml + todosHtml;
      todosList.querySelectorAll('.todo-expand-btn').forEach(function(btn) {
        btn.addEventListener('click', function(ev) {
          toggleTodoExpand(ev, btn.getAttribute('data-todo-key') || '');
        });
      });
    }

    function toggleTodosList() {
      const wrap = document.getElementById('todos-container');
      const body = wrap ? wrap.querySelector('.block-body') : null;
      const list = document.getElementById('todos-list');
      const caret = document.getElementById('todos-caret');
      if (!list) return;
      userToggledTodos = true;
      if (list.style.display === 'none') {
        list.style.display = 'block';
        if (body) body.style.display = 'block';
        userManuallyOpenedTodos = true;
        if (caret) caret.style.transform = 'rotate(0deg)';
      } else {
        list.style.display = 'none';
        userManuallyOpenedTodos = false;
        if (caret) caret.style.transform = 'rotate(-90deg)';
      }
    }

    function toggleAgentsList() {
      const list = document.getElementById('agents-list');
      const caret = document.getElementById('agents-caret');
      if (!list) return;
      userToggledAgents = true;
      if (list.style.display === 'none') {
        list.style.display = 'flex';
        userManuallyOpened = true;
        if (caret) caret.style.transform = 'rotate(0deg)';
      } else {
        list.style.display = 'none';
        userManuallyOpened = false;
        if (caret) caret.style.transform = 'rotate(-90deg)';
      }
    }

    function toggleAgentDetail(detailId, agentKey, ev) {
      if (ev && ev.target instanceof Element && ev.target.closest('[data-action]')) return;
      const el = document.getElementById(detailId);
      if (!el) return;
      const isHidden = (el.style.display === 'none' || !el.style.display);
      el.style.display = isHidden ? 'flex' : 'none';
      if (agentKey) {
        if (isHidden) {
          expandedAgentKeys.add(agentKey);
        } else {
          expandedAgentKeys.delete(agentKey);
        }
      }
    }

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

    function isValidOutputSpeed(value) {
      return typeof value === 'number' && isFinite(value) && value > 0;
    }

    function formatOutputSpeed(value) {
      return isValidOutputSpeed(value) ? value.toFixed(1) + ' tok/s' : '—';
    }

    function updateOutputSpeedProperty(element, property, value) {
      if (element && element[property] !== value) element[property] = value;
    }

    function updateOutputSpeedButton(button, hidden) {
      if (!button) return;
      updateOutputSpeedProperty(button, 'hidden', hidden);
      updateOutputSpeedProperty(button.style, 'display', hidden ? 'none' : '');
    }

    function renderOutputSpeed(session) {
      const row = document.getElementById('output-speed-row');
      if (!row) return;
      const labelEl = document.getElementById('output-speed-label');
      const valueEl = document.getElementById('output-speed-value');
      const modelEl = document.getElementById('output-speed-model');
      const enableBtn = document.getElementById('output-speed-enable');
      const label = hubUiStrings.speedLabel || '最近响应平均速率';
      const state = session && typeof session.outputSpeedState === 'string' ? session.outputSpeedState : '';
      const integrationEnabled = !!(session && session.outputSpeedIntegrationEnabled === true);
      const isSampling = state === 'sampling';
      const lastLabel = hubUiStrings.speedLast || '上次';

      updateOutputSpeedProperty(labelEl, 'textContent', label);
      updateOutputSpeedProperty(enableBtn, 'textContent', hubUiStrings.speedEnable || '启用终端速率采集');

      const sample = session && session.outputSpeed;
      const tps = sample ? Number(sample.tokensPerSecond) : NaN;
      const hasSpeed = isValidOutputSpeed(tps);
      if (hasSpeed) {
        const modelText = sample.model ? String(sample.model) : '';
        const sourceText = sample.source === 'statusLine'
          ? (hubUiStrings.speedSourceStatusLine || '')
          : sample.source === 'transcript'
            ? (hubUiStrings.speedSourceTranscript || '')
            : '';
        const measuredAt = Number(sample.measuredAt);
        const measuredText = hubUiStrings.speedMeasuredAt && isFinite(measuredAt) && measuredAt > 0
          ? String(hubUiStrings.speedMeasuredAt).replace('{time}', new Date(measuredAt).toLocaleTimeString())
          : '';
        updateOutputSpeedProperty(valueEl, 'textContent', formatOutputSpeed(tps));
        updateOutputSpeedProperty(modelEl, 'textContent', modelText);
        updateOutputSpeedProperty(modelEl, 'title', modelText);
        updateOutputSpeedProperty(row, 'title', [
          label,
          isSampling ? lastLabel : '',
          modelText,
          sourceText,
          measuredText,
          hubUiStrings.speedHint || '',
          isSampling ? (hubUiStrings.speedSampling || '') : ''
        ].filter(Boolean).join(' · '));
        updateOutputSpeedButton(enableBtn, true);
      } else {
        let metaText = '';
        if (isSampling) metaText = hubUiStrings.speedSampling || '';
        else if (integrationEnabled) metaText = hubUiStrings.speedTerminalEnabled || '';
        else if (state === 'unsupported') metaText = hubUiStrings.speedUnsupported || '';
        updateOutputSpeedProperty(valueEl, 'textContent', '—');
        updateOutputSpeedProperty(modelEl, 'textContent', metaText);
        updateOutputSpeedProperty(modelEl, 'title', metaText);
        updateOutputSpeedProperty(row, 'title', metaText || hubUiStrings.speedWaiting || '');
        updateOutputSpeedButton(enableBtn, integrationEnabled);
      }
    }

    document.addEventListener('click', event => {
      const source = event.target instanceof Element ? event.target : null;
      if (openSessionMenuId && !(source && source.closest('.session-more-wrap'))) {
        closeSessionMenu(false);
      }

      const tabBtn = source ? source.closest('.tab[data-tab]') : null;
      if (tabBtn) {
        switchMainTab(tabBtn.getAttribute('data-tab') || 'monitor');
        return;
      }

      const actionElement = source ? source.closest('[data-action]') : null;
      if (actionElement) {
        const action = actionElement.getAttribute('data-action');
        if (!action) return;

        if (action === 'refresh') {
          sendMessage('refresh');
          return;
        } else if (action === 'openDashboardTab') {
          sendMessage('openDashboardTab');
          return;
        } else if (action === 'setScopeMode') {
          const scope = actionElement.getAttribute('data-scope');
          if (scope === 'currentWorkspace' || scope === 'all') {
            backendFilterMode = scope;
            updateMonitorScopeButtons(scope);
            setSessionFilter(scope === 'currentWorkspace' ? 'workspace' : 'all', false);
            sendMessage('setFilterMode', { mode: scope });
          }
          return;
        } else if (action === 'closeSessionReader') {
          closeSessionReader();
          return;
        } else if (action === 'setStatusBarSetting') {
          const key = actionElement.getAttribute('data-key');
          const value = actionElement.getAttribute('data-value');
          if (key) {
            if (key === 'statusBar.style') currentStatusBarConfig.style = value;
            if (key === 'statusBar.preset') currentStatusBarConfig.preset = value;
            renderStatusBarSettings(currentStatusBarConfig);
            sendMessage('updateStatusBarConfig', { key, value });
          }
          return;
        } else if (action === 'toggleStatusBarField') {
          const key = actionElement.getAttribute('data-key');
          if (key) {
            const prop = key.replace('statusBar.', '');
            const nextVal = !(currentStatusBarConfig[prop] === true);
            currentStatusBarConfig[prop] = nextVal;
            currentStatusBarConfig.preset = 'custom';
            renderStatusBarSettings(currentStatusBarConfig);
            sendMessage('updateStatusBarConfig', { key: 'statusBar.preset', value: 'custom' });
            sendMessage('updateStatusBarConfig', { key, value: nextVal });
          }
          return;
        } else if (action === 'toggleStatusBarBool') {
          const key = actionElement.getAttribute('data-key');
          if (key) {
            const prop = key.replace('statusBar.', '');
            const nextVal = !(currentStatusBarConfig[prop] !== false);
            currentStatusBarConfig[prop] = nextVal;
            renderStatusBarSettings(currentStatusBarConfig);
            sendMessage('updateStatusBarConfig', { key, value: nextVal });
          }
          return;
        } else if (action === 'toggleTooltipSection') {
          const sec = actionElement.getAttribute('data-section');
          if (sec) {
            const sections = { ...(currentStatusBarConfig.tooltipSections || {}) };
            const cur = sections[sec] !== false;
            sections[sec] = !cur;
            currentStatusBarConfig.tooltipSections = sections;
            renderStatusBarSettings(currentStatusBarConfig);
            sendMessage('updateStatusBarConfig', { key: 'statusBar.tooltipSections', value: sections });
          }
          return;
        } else if (action === 'openVsCodeSettings') {
          sendMessage('openVsCodeSettings');
          return;
        } else if (action === 'toggleSessionMenu') {
          toggleSessionMenu(actionElement, false);
          return;
        } else if (action === 'focusSession') {
          closeSessionMenu(false);
          sendMessage('focusSession', { sessionId: actionElement.getAttribute('data-session-id') || '' });
          switchMainTab('monitor');
          return;
        } else if (action === 'forkSession' || action === 'deleteSession' || action === 'resumeSession' || action === 'renameSession' || action === 'togglePinSession' || action === 'exportSession' || action === 'compareFork' || action === 'editSessionTags' || action === 'showTimeline') {
          closeSessionMenu(false);
          sendMessage(action, { sessionId: actionElement.getAttribute('data-session-id') || '' });
          return;
        } else if (action === 'openWorktree') {
          sendMessage(action, { worktreePath: actionElement.getAttribute('data-worktree-path') || '' });
          return;
        } else if (action === 'slashCommand' || action === 'workspaceCostReport' || action === 'searchTranscript' || action === 'openBackgroundTasks' || action === 'openMemoryIndex' || action === 'syncMemoryIndex' || action === 'startWorktreeSession' || action === 'enableOutputSpeed' || action === 'newConversation') {
          sendMessage(action, {});
          return;
        } else if (action === 'createMemoryEntry') {
          openMemoryInlineForm('create');
          return;
        } else if (action === 'openMemoryWizard') {
          closeMemoryInlineForm();
          sendMessage('createMemoryEntry', {});
          return;
        } else if (action === 'submitMemoryForm') {
          submitMemoryInlineForm();
          return;
        } else if (action === 'cancelMemoryForm') {
          closeMemoryInlineForm();
          return;
        } else if (action === 'selectMemType') {
          selectMemoryFormType(actionElement.getAttribute('data-mem-type') || 'project');
          return;
        } else if (action === 'deleteMemoryEntry') {
          sendMessage(action, {
            filePath: actionElement.getAttribute('data-file-path') || '',
            name: actionElement.getAttribute('data-memory-name') || ''
          });
          return;
        } else if (action === 'editMemoryEntry') {
          openMemoryInlineForm('edit', {
            filePath: actionElement.getAttribute('data-file-path') || '',
            name: actionElement.getAttribute('data-memory-name') || '',
            description: actionElement.getAttribute('data-memory-desc') || '',
            memoryType: actionElement.getAttribute('data-memory-type') || 'project'
          });
          return;
        } else if (action === 'toggleExtGroup') {
          toggleExtGroup(actionElement.getAttribute('data-ext-group') || '');
          return;
        } else if (action === 'openSessionFile') {
          closeSessionMenu(false);
          sendMessage(action, { filePath: actionElement.getAttribute('data-file-path') || '' });
          return;
        } else if (action === 'toggleMcp') {
          sendMessage(action, {
            name: actionElement.getAttribute('data-name') || '',
            enabled: actionElement.getAttribute('data-enabled') === 'true'
          });
          return;
        } else if (action === 'togglePlugin') {
          sendMessage(action, {
            id: actionElement.getAttribute('data-id') || '',
            enabled: actionElement.getAttribute('data-enabled') === 'true'
          });
          return;
        } else if (action === 'openSkill') {
          sendMessage(action, { filePath: actionElement.getAttribute('data-file-path') || '' });
          return;
        } else if (action === 'setExtTab') {
          setExtTab(actionElement.getAttribute('data-ext-tab') || 'all');
          return;
        } else if (action === 'setSkillScope') {
          setSkillScope(actionElement.getAttribute('data-skill-scope') || 'all');
          return;
        } else if (action === 'toggleMorePlugins') {
          extShowAllPlugins = !extShowAllPlugins;
          renderExtensionsPanel();
          saveUiState();
          return;
        } else if (action === 'toggleMoreLocalSkills') {
          extShowAllLocalSkills = !extShowAllLocalSkills;
          renderExtensionsPanel();
          saveUiState();
          return;
        } else if (action === 'toggleSkillPluginGroup') {
          const grp = actionElement.getAttribute('data-plugin-group') || '';
          if (grp) {
            if (expandedPluginSkillGroups.has(grp)) {
              expandedPluginSkillGroups.delete(grp);
            } else {
              expandedPluginSkillGroups.add(grp);
            }
            renderExtensionsPanel();
          }
          return;
        } else if (action === 'filterPluginSkills') {
          const pluginName = actionElement.getAttribute('data-plugin-name') || '';
          if (pluginName) {
            if (extActiveTab !== 'all' && extActiveTab !== 'skills') {
              extActiveTab = 'skills';
            }
            extGroupManualState['skills'] = false;
            if (extSkillScope === 'local') {
              extSkillScope = 'all';
            }
            expandedPluginSkillGroups.add(pluginName);
            renderExtensionsPanel();
            saveUiState();
            const grpEl = document.getElementById('skill-plugin-grp-' + pluginName.replace(/[^a-zA-Z0-9_-]/g, '_'));
            if (grpEl && grpEl.scrollIntoView) {
              grpEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
          return;
        }
      }

      const cardEl = source ? source.closest('.session-card[data-session-id]') : null;
      if (cardEl && !(source && source.closest('button, .session-more-wrap'))) {
        openSessionReader(cardEl.getAttribute('data-session-id') || '');
      }
    });

    document.addEventListener('change', event => {
      const target = event.target instanceof HTMLSelectElement ? event.target : null;
      if (!target) return;
      if (target.getAttribute('data-action') === 'selectStatusBarSetting') {
        const key = target.getAttribute('data-key');
        if (key) {
          const prop = key.replace('statusBar.', '');
          currentStatusBarConfig[prop] = target.value;
          sendMessage('updateStatusBarConfig', { key, value: target.value });
        }
      }
    });

    // Status Bar & Tooltip Customizer State
    let currentStatusBarConfig = {
      style: 'modern',
      preset: 'compact',
      separator: 'dot',
      contextFormat: 'percent',
      clickAction: 'openDashboard',
      hideWhenInactive: true,
      showContext: true,
      showProgressBar: false,
      showSpeed: true,
      showModel: true,
      showCost: false,
      showTools: true,
      showDuration: false,
      showTodos: false,
      showAgents: false,
      showGitBranch: false,
      tooltipSections: {
        context: true,
        speed: true,
        modelBranch: true,
        activityDur: true,
        tokens: true,
        todos: true,
        agents: true,
        quota: true,
        actions: true,
      },
    };

    function renderStatusBarSettings(sb) {
      if (!sb || typeof sb !== 'object') return;
      currentStatusBarConfig = {
        ...currentStatusBarConfig,
        ...sb,
        tooltipSections: {
          ...currentStatusBarConfig.tooltipSections,
          ...(sb.tooltipSections || {}),
        },
      };
      const styleGroup = document.getElementById('sb-style-group');
      if (styleGroup) {
        styleGroup.querySelectorAll('.seg').forEach(btn => {
          const active = btn.getAttribute('data-value') === (currentStatusBarConfig.style === 'classic' ? 'classic' : 'modern');
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-pressed', String(active));
        });
      }
      const presetGroup = document.getElementById('sb-preset-group');
      if (presetGroup) {
        presetGroup.querySelectorAll('.seg').forEach(btn => {
          const active = btn.getAttribute('data-value') === currentStatusBarConfig.preset;
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-pressed', String(active));
        });
      }
      const fieldChips = document.getElementById('sb-field-chips');
      if (fieldChips) {
        fieldChips.querySelectorAll('.toggle-chip').forEach(btn => {
          const key = (btn.getAttribute('data-key') || '').replace('statusBar.', '');
          const on = currentStatusBarConfig[key] === true;
          btn.setAttribute('aria-pressed', String(on));
        });
      }
      const ctxSel = document.getElementById('sb-context-format');
      if (ctxSel && currentStatusBarConfig.contextFormat) ctxSel.value = currentStatusBarConfig.contextFormat;
      const sepSel = document.getElementById('sb-separator');
      if (sepSel && currentStatusBarConfig.separator) sepSel.value = currentStatusBarConfig.separator;
      const clickSel = document.getElementById('sb-click-action');
      if (clickSel && currentStatusBarConfig.clickAction) clickSel.value = currentStatusBarConfig.clickAction;
      const hideBtn = document.getElementById('sb-hide-inactive');
      if (hideBtn) {
        const on = currentStatusBarConfig.hideWhenInactive !== false;
        hideBtn.classList.toggle('on', on);
        hideBtn.setAttribute('aria-checked', String(on));
      }
      const tipChips = document.getElementById('sb-tooltip-chips');
      if (tipChips) {
        const sections = currentStatusBarConfig.tooltipSections || {};
        tipChips.querySelectorAll('.toggle-chip').forEach(btn => {
          const sec = btn.getAttribute('data-section') || '';
          const on = sections[sec] !== false;
          btn.setAttribute('aria-pressed', String(on));
        });
      }
    }

    // Extensions & Memory State
    let extData = {
      projectMemory: null,
      plugins: [],
      mcpServers: [],
      customAgents: [],
      skills: []
    };
    let extActiveTab = 'all';
    let extSearchQuery = '';
    let extSkillScope = 'all';
    let extShowAllPlugins = false;
    let extShowAllLocalSkills = false;
    const extGroupManualState = {};
    const expandedPluginSkillGroups = new Set();

    function setExtTab(tab) {
      extActiveTab = tab || 'all';
      renderExtensionsPanel();
      saveUiState();
    }

    function setSkillScope(scope) {
      extSkillScope = scope || 'all';
      renderExtensionsPanel();
      saveUiState();
    }

    function onExtSearchInput(val) {
      extSearchQuery = String(val || '');
      const clearBtn = document.getElementById('ext-search-clear');
      if (clearBtn) {
        clearBtn.style.display = extSearchQuery.trim() ? 'block' : 'none';
      }
      renderExtensionsPanel();
      saveUiState();
    }

    function clearExtSearch() {
      extSearchQuery = '';
      const inputEl = document.getElementById('ext-search-input');
      if (inputEl) inputEl.value = '';
      const clearBtn = document.getElementById('ext-search-clear');
      if (clearBtn) clearBtn.style.display = 'none';
      renderExtensionsPanel();
      saveUiState();
    }

    let memFormMode = 'create';
    let memEditingFilePath = '';
    const memTypeHints = {
      project: '记录项目架构约束、进行中目标或非显而易见的约定',
      feedback: '记录开发协作纠偏、用户确认的工作方式（含 Why / How to apply）',
      user: '记录用户角色、技术偏好与沟通习惯',
      reference: '记录外部文档、看板、工单或服务地址索引'
    };

    function selectMemoryFormType(memType) {
      const validType = (memType === 'feedback' || memType === 'user' || memType === 'reference') ? memType : 'project';
      const typeEl = document.getElementById('mem-form-type');
      if (typeEl) typeEl.value = validType;
      const pillsWrap = document.getElementById('mem-type-pills');
      if (pillsWrap) {
        pillsWrap.querySelectorAll('.mem-type-pill').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-mem-type') === validType);
        });
      }
      const hintEl = document.getElementById('mem-type-hint');
      if (hintEl) {
        hintEl.textContent = memTypeHints[validType] || memTypeHints.project;
      }
    }

    function openMemoryInlineForm(mode, data) {
      memFormMode = mode === 'edit' ? 'edit' : 'create';
      memEditingFilePath = (data && data.filePath) ? String(data.filePath) : '';
      extGroupManualState['memory'] = false;

      const formEl = document.getElementById('memory-inline-form');
      const titleEl = document.getElementById('mem-form-title');
      const wizardBtn = document.getElementById('mem-form-wizard-btn');
      const slugEl = document.getElementById('mem-form-slug');
      const descEl = document.getElementById('mem-form-desc');
      const submitBtn = document.getElementById('mem-form-submit-btn');

      if (!formEl) return;
      formEl.classList.add('visible');

      if (memFormMode === 'edit') {
        if (titleEl) titleEl.textContent = '✏️ 编辑记忆：' + ((data && data.name) || '');
        if (wizardBtn) wizardBtn.style.display = 'none';
        selectMemoryFormType((data && data.memoryType) || 'project');
        if (slugEl) {
          slugEl.value = (data && data.name) || '';
          slugEl.disabled = true;
          slugEl.style.borderColor = '';
        }
        if (descEl) descEl.value = (data && data.description) || '';
        if (submitBtn) submitBtn.textContent = '保存修改';
        renderExtensionsPanel();
        if (descEl) descEl.focus();
      } else {
        if (titleEl) titleEl.textContent = '➕ 新建项目记忆';
        if (wizardBtn) wizardBtn.style.display = 'inline-block';
        selectMemoryFormType('project');
        if (slugEl) {
          slugEl.value = '';
          slugEl.disabled = false;
          slugEl.style.borderColor = '';
        }
        if (descEl) descEl.value = '';
        if (submitBtn) submitBtn.textContent = '保存并打开';
        renderExtensionsPanel();
        if (slugEl) slugEl.focus();
      }
    }

    function closeMemoryInlineForm() {
      const formEl = document.getElementById('memory-inline-form');
      if (formEl) formEl.classList.remove('visible');
      memEditingFilePath = '';
      renderExtensionsPanel();
    }

    function submitMemoryInlineForm() {
      const typeEl = document.getElementById('mem-form-type');
      const slugEl = document.getElementById('mem-form-slug');
      const descEl = document.getElementById('mem-form-desc');
      const memoryType = typeEl ? typeEl.value : 'project';
      const slug = slugEl ? slugEl.value.trim() : '';
      const description = descEl ? descEl.value.trim() : '';

      if (memFormMode === 'edit' && memEditingFilePath) {
        sendMessage('editMemoryEntry', {
          filePath: memEditingFilePath,
          name: slug,
          description: description || slug,
          memoryType,
          directSave: true
        });
        closeMemoryInlineForm();
        return;
      }

      if (!slug) {
        if (slugEl) {
          slugEl.style.borderColor = 'var(--danger-color)';
          slugEl.focus();
        }
        return;
      }
      if (slugEl) slugEl.style.borderColor = '';
      sendMessage('createMemoryEntry', {
        slug,
        name: slug,
        description: description || slug,
        memoryType
      });
      closeMemoryInlineForm();
    }

    function toggleExtGroup(groupKey) {
      if (!groupKey) return;
      const el = document.getElementById('ext-group-' + groupKey);
      if (!el) return;
      const nextCollapsed = !el.classList.contains('collapsed');
      extGroupManualState[groupKey] = nextCollapsed;
      renderExtensionsPanel();
      saveUiState();
    }

    function renderSkillItemHtml(sk, inPluginGroup) {
      const skillPath = sk.filePath || sk.path || '';
      const rawName = String(sk.name || '');
      const displayName = (inPluginGroup && rawName.indexOf(':') > -1)
        ? rawName.split(':').slice(1).join(':')
        : rawName;
      let scopeChip = '';
      if (sk.scope === 'workspace') {
        scopeChip = '<span style="background: rgba(78,201,176,0.18); color: var(--success-color); font-size: 9px; padding: 1px 4px; border-radius: 3px; margin-right: 4px;">workspace</span>';
      } else if (sk.scope === 'plugin') {
        scopeChip = '<span style="background: rgba(197,134,192,0.16); color: #c586c0; font-size: 9px; padding: 1px 4px; border-radius: 3px; margin-right: 4px;">plugin</span>';
      } else if (sk.scope) {
        scopeChip = '<span style="background: rgba(224,122,95,0.15); color: var(--claude-accent); font-size: 9px; padding: 1px 4px; border-radius: 3px; margin-right: 4px;">' + escapeHtml(sk.scope) + '</span>';
      }
      const desc = sk.description || '无描述';
      const tooltip = rawName + (sk.description ? ' — ' + sk.description : '');
      return '<div class="feature-item" style="cursor: pointer;" data-action="openSkill" data-file-path="' + escapeAttribute(skillPath) + '" title="' + escapeAttribute(tooltip) + '">' +
        '<div style="min-width: 0; flex: 1;">' +
          '<div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + scopeChip + escapeHtml(displayName) + '</div>' +
          '<div style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(desc) + '</div>' +
        '</div>' +
        '<span style="font-size: 10px; color: var(--blue); margin-left: 6px; flex-shrink: 0;">查看</span>' +
      '</div>';
    }

    function renderExtensionsPanel() {
      const q = extSearchQuery.trim().toLowerCase();
      const memInfo = extData.projectMemory || null;
      const allMemEntries = (memInfo && Array.isArray(memInfo.entries)) ? memInfo.entries : [];
      const allPlugins = Array.isArray(extData.plugins) ? extData.plugins : [];
      const allMcp = Array.isArray(extData.mcpServers) ? extData.mcpServers : [];
      const allAgents = Array.isArray(extData.customAgents) ? extData.customAgents : [];
      const allSkills = Array.isArray(extData.skills) ? extData.skills : [];

      const memEntries = q ? allMemEntries.filter(m =>
        String(m.name || '').toLowerCase().includes(q) ||
        String(m.description || '').toLowerCase().includes(q) ||
        String(m.type || '').toLowerCase().includes(q)
      ) : allMemEntries;

      const plugins = q ? allPlugins.filter(p =>
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.marketplace || '').toLowerCase().includes(q) ||
        String(p.description || '').toLowerCase().includes(q)
      ) : allPlugins;

      const mcpServers = q ? allMcp.filter(s =>
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.command || '').toLowerCase().includes(q) ||
        String(s.url || '').toLowerCase().includes(q)
      ) : allMcp;

      const customAgents = q ? allAgents.filter(ag =>
        String(ag.name || '').toLowerCase().includes(q) ||
        String(ag.description || '').toLowerCase().includes(q) ||
        String(ag.scope || '').toLowerCase().includes(q) ||
        String(ag.model || '').toLowerCase().includes(q)
      ) : allAgents;

      const skillsMatchedSearch = q ? allSkills.filter(sk =>
        String(sk.name || '').toLowerCase().includes(q) ||
        String(sk.description || '').toLowerCase().includes(q) ||
        String(sk.scope || '').toLowerCase().includes(q) ||
        String(sk.pluginId || '').toLowerCase().includes(q)
      ) : allSkills;

      const viewExt = document.getElementById('view-extensions');
      if (viewExt) viewExt.classList.toggle('single-tab-view', extActiveTab !== 'all');

      const tabCounts = {
        skills: q ? skillsMatchedSearch.length : allSkills.length,
        plugins: q ? plugins.length : allPlugins.length,
        mcp: q ? mcpServers.length : allMcp.length,
        memory: q ? memEntries.length : allMemEntries.length,
        agents: q ? customAgents.length : allAgents.length
      };
      ['skills', 'plugins', 'mcp', 'memory', 'agents'].forEach(k => {
        const el = document.getElementById('ext-tab-count-' + k);
        if (el) el.textContent = String(tabCounts[k]);
      });
      const tabContainer = document.getElementById('ext-category-tabs');
      if (tabContainer) {
        tabContainer.querySelectorAll('.ext-tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-ext-tab') === extActiveTab);
        });
      }

      const groupCounts = {
        memory: memEntries.length,
        plugins: plugins.length,
        mcp: mcpServers.length,
        agents: customAgents.length,
        skills: skillsMatchedSearch.length
      };
      const rawCounts = {
        memory: allMemEntries.length,
        plugins: allPlugins.length,
        mcp: allMcp.length,
        agents: allAgents.length,
        skills: allSkills.length
      };

      ['memory', 'plugins', 'mcp', 'agents', 'skills'].forEach(key => {
        const grpEl = document.getElementById('ext-group-' + key);
        if (!grpEl) return;
        if (extActiveTab !== 'all') {
          grpEl.style.display = (extActiveTab === key) ? 'block' : 'none';
          grpEl.classList.remove('collapsed');
        } else if (q) {
          grpEl.style.display = (groupCounts[key] > 0) ? 'block' : 'none';
          grpEl.classList.remove('collapsed');
        } else {
          grpEl.style.display = 'block';
          const manual = extGroupManualState[key];
          const shouldCollapse = (typeof manual === 'boolean') ? manual : (rawCounts[key] === 0 && key !== 'memory');
          grpEl.classList.toggle('collapsed', shouldCollapse);
        }
      });

      const memBadge = document.getElementById('ext-badge-memory');
      if (memBadge) memBadge.textContent = memEntries.length + ' 项';

      const enabledPluginsCount = plugins.filter(p => p.enabled === true || p.isEnabled === true).length;
      const plugBadge = document.getElementById('ext-badge-plugins');
      if (plugBadge) plugBadge.textContent = plugins.length > 0 ? (enabledPluginsCount + '/' + plugins.length + ' ON') : '0';

      const enabledMcpCount = mcpServers.filter(s => s.isEnabled === true || s.enabled === true).length;
      const mcpBadge = document.getElementById('ext-badge-mcp');
      if (mcpBadge) mcpBadge.textContent = mcpServers.length > 0 ? (enabledMcpCount + '/' + mcpServers.length + ' ON') : '0';

      const agBadge = document.getElementById('ext-badge-agents');
      if (agBadge) agBadge.textContent = String(customAgents.length);

      const memoryList = document.getElementById('memory-list');
      if (memoryList) {
        if (memEntries.length > 0) {
          memoryList.innerHTML = memEntries.map(m => {
            const mType = m.type || 'project';
            let badgeStyle = 'background: rgba(86,156,214,0.18); color: #9cdcfe;';
            if (mType === 'feedback') badgeStyle = 'background: rgba(204,167,0,0.18); color: var(--warning-color);';
            else if (mType === 'user') badgeStyle = 'background: rgba(78,201,176,0.18); color: var(--success-color);';
            else if (mType === 'reference') badgeStyle = 'background: rgba(197,134,192,0.18); color: #c586c0;';
            const typeBadge = '<span style="' + badgeStyle + ' font-size: 9px; padding: 1px 4px; border-radius: 3px; margin-right: 4px;">' + escapeHtml(mType) + '</span>';
            const filePathAttr = escapeAttribute(m.filePath || '');
            const nameAttr = escapeAttribute(m.name || m.slug || '');
            const descText = m.description || m.fileName || '';
            const descAttr = escapeAttribute(descText);
            const typeAttr = escapeAttribute(mType);
            return '<div class="feature-item" style="cursor: pointer;" data-action="openSkill" data-file-path="' + filePathAttr + '" title="' + escapeAttribute((m.name || '') + (descText ? ' — ' + descText : '')) + '">' +
              '<div style="min-width: 0; flex: 1;">' +
                '<div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + typeBadge + escapeHtml(m.name) + '</div>' +
                '<div style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(descText) + '</div>' +
              '</div>' +
              '<div class="mem-item-actions">' +
                '<button type="button" class="mem-act-btn primary" data-action="openSkill" data-file-path="' + filePathAttr + '" title="在编辑器中打开记忆文件">打开</button>' +
                '<button type="button" class="mem-act-btn" data-action="editMemoryEntry" data-file-path="' + filePathAttr + '" data-memory-name="' + nameAttr + '" data-memory-desc="' + descAttr + '" data-memory-type="' + typeAttr + '" title="修改记忆分类与摘要并同步 MEMORY.md">编辑</button>' +
                '<button type="button" class="mem-act-btn danger" data-action="deleteMemoryEntry" data-file-path="' + filePathAttr + '" data-memory-name="' + nameAttr + '" title="移除该记忆文件并从 MEMORY.md 索引中清理">移除</button>' +
              '</div>' +
            '</div>';
          }).join('');
        } else {
          const indexHint = q ? '无匹配的项目记忆' : ((memInfo && memInfo.hasIndex) ? '已存在 MEMORY.md 索引，暂无独立记忆卡片' : '当前项目暂无 Auto Memory，点右上角“+ 新建”添加');
          const inlineFormEl = document.getElementById('memory-inline-form');
          const isFormVisible = inlineFormEl && inlineFormEl.classList.contains('visible');
          memoryList.innerHTML = isFormVisible ? '' : '<div style="color: var(--text-muted); font-size: 11px;">' + escapeHtml(indexHint) + '</div>';
        }
      }

      const pluginsList = document.getElementById('plugins-list');
      if (pluginsList) {
        if (plugins.length > 0) {
          const maxVisiblePlugins = (!q && extActiveTab === 'all' && !extShowAllPlugins) ? 6 : plugins.length;
          const shownPlugins = plugins.slice(0, maxVisiblePlugins);
          let pluginsHtml = shownPlugins.map(p => {
            const enabled = p.enabled === true || p.isEnabled === true;
            const onCls = enabled ? 'switch on' : 'switch';
            const metaParts = [];
            if (p.marketplace) metaParts.push('@' + p.marketplace);
            if (p.version) metaParts.push('v' + p.version);
            const skillsJumpPill = p.skillsCount
              ? '<button type="button" class="ext-skill-jump-pill" data-action="filterPluginSkills" data-plugin-name="' + escapeAttribute(p.name) + '" title="点击展开 ' + escapeAttribute(p.name) + ' 提供的 ' + p.skillsCount + ' 项技能">⚡ ' + p.skillsCount + ' skills</button>'
              : '';
            return '<div class="feature-item">' +
              '<div style="min-width: 0; flex: 1;">' +
                '<div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center;">' +
                  '<span style="overflow: hidden; text-overflow: ellipsis;">' + escapeHtml(p.name) + '</span>' +
                  skillsJumpPill +
                '</div>' +
                '<div style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(metaParts.join(' · ')) + '</div>' +
              '</div>' +
              '<button type="button" class="' + onCls + '" role="switch" aria-checked="' + enabled + '" aria-label="' + escapeAttribute(p.name) + '" data-action="togglePlugin" data-id="' + escapeAttribute(p.id) + '" data-enabled="' + (!enabled) + '"></button>' +
            '</div>';
          }).join('');
          if (!q && extActiveTab === 'all' && plugins.length > 6) {
            const remain = plugins.length - 6;
            pluginsHtml += '<button type="button" class="ext-more-btn" data-action="toggleMorePlugins">' +
              (extShowAllPlugins ? '▲ 收起插件列表' : ('▼ 展开剩余 ' + remain + ' 个插件')) +
            '</button>';
          }
          pluginsList.innerHTML = pluginsHtml;
        } else {
          pluginsList.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">' + (q ? '无匹配的插件' : '未检测到已安装的 Claude Plugins') + '</div>';
        }
      }

      const mcpList = document.getElementById('mcp-servers-list');
      if (mcpList) {
        if (mcpServers.length > 0) {
          mcpList.innerHTML = mcpServers.map(s => {
            const enabled = s.isEnabled === true || s.enabled === true;
            const onCls = enabled ? 'switch on' : 'switch';
            const meta = s.command ? s.command : (s.url || '');
            return '<div class="feature-item">' +
              '<div style="min-width: 0; flex: 1;">' +
                '<div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(s.name) + '</div>' +
                (meta ? '<div style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(meta) + '</div>' : '') +
              '</div>' +
              '<button type="button" class="' + onCls + '" role="switch" aria-checked="' + enabled + '" aria-label="' + escapeAttribute(s.name) + '" data-action="toggleMcp" data-name="' + escapeAttribute(s.name) + '" data-enabled="' + (!enabled) + '"></button>' +
            '</div>';
          }).join('');
        } else {
          mcpList.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">' + (q ? '无匹配的 MCP 服务' : '未检测到外部 MCP 配置') + '</div>';
        }
      }

      const customAgentsList = document.getElementById('custom-agents-list');
      if (customAgentsList) {
        if (customAgents.length > 0) {
          customAgentsList.innerHTML = customAgents.map(ag => {
            const scopeTag = '<span style="background: rgba(78,201,176,0.16); color: var(--success-color); font-size: 9px; padding: 1px 4px; border-radius: 3px; margin-right: 4px;">' + escapeHtml(ag.scope || 'global') + '</span>';
            const modelTag = ag.model ? ' <span style="opacity: 0.7; font-size: 9px;">(' + escapeHtml(ag.model) + ')</span>' : '';
            return '<div class="feature-item" style="cursor: pointer;" data-action="openSkill" data-file-path="' + escapeAttribute(ag.filePath || '') + '">' +
              '<div style="min-width: 0; flex: 1;">' +
                '<div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + scopeTag + escapeHtml(ag.name) + modelTag + '</div>' +
                '<div style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(ag.description || '') + '</div>' +
              '</div>' +
              '<span style="font-size: 10px; color: var(--blue); margin-left: 6px; flex-shrink: 0;">查看</span>' +
            '</div>';
          }).join('');
        } else {
          customAgentsList.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">' + (q ? '无匹配的自定义代理' : '暂无自定义代理 (.claude/agents/*.md)') + '</div>';
        }
      }

      const localSkillsAll = skillsMatchedSearch.filter(sk => sk.scope !== 'plugin').sort((a, b) => {
        if (a.scope === b.scope) return String(a.name || '').localeCompare(String(b.name || ''));
        return a.scope === 'workspace' ? -1 : 1;
      });
      const pluginSkillsAll = skillsMatchedSearch.filter(sk => sk.scope === 'plugin');

      const skBadge = document.getElementById('ext-badge-skills');
      if (skBadge) skBadge.textContent = skillsMatchedSearch.length + ' 项';

      const scopeAllBtn = document.getElementById('skill-scope-all');
      const scopeLocalBtn = document.getElementById('skill-scope-local');
      const scopePluginBtn = document.getElementById('skill-scope-plugin');
      if (scopeAllBtn) {
        scopeAllBtn.textContent = '全部 ' + skillsMatchedSearch.length;
        scopeAllBtn.classList.toggle('active', extSkillScope === 'all');
      }
      if (scopeLocalBtn) {
        scopeLocalBtn.textContent = '本地 ' + localSkillsAll.length;
        scopeLocalBtn.classList.toggle('active', extSkillScope === 'local');
      }
      if (scopePluginBtn) {
        scopePluginBtn.textContent = '插件 ' + pluginSkillsAll.length;
        scopePluginBtn.classList.toggle('active', extSkillScope === 'plugin');
      }

      const skillsList = document.getElementById('skills-list');
      if (skillsList) {
        const showLocal = extSkillScope === 'all' || extSkillScope === 'local';
        const showPlugin = extSkillScope === 'all' || extSkillScope === 'plugin';
        const parts = [];

        if (showLocal && localSkillsAll.length > 0) {
          const maxLocal = (!q && extActiveTab === 'all' && extSkillScope === 'all' && !extShowAllLocalSkills) ? 6 : localSkillsAll.length;
          const visibleLocal = localSkillsAll.slice(0, maxLocal);
          parts.push(visibleLocal.map(sk => renderSkillItemHtml(sk, false)).join(''));
          if (!q && extActiveTab === 'all' && extSkillScope === 'all' && localSkillsAll.length > 6) {
            const remLocal = localSkillsAll.length - 6;
            parts.push(
              '<button type="button" class="ext-more-btn" data-action="toggleMoreLocalSkills">' +
                (extShowAllLocalSkills ? '▲ 收起本地技能' : ('▼ 展开剩余 ' + remLocal + ' 项本地技能')) +
              '</button>'
            );
          }
        }

        if (showPlugin && pluginSkillsAll.length > 0) {
          const groupMap = new Map();
          pluginSkillsAll.forEach(sk => {
            const rawName = String(sk.name || '');
            const prefix = rawName.indexOf(':') > -1
              ? rawName.split(':')[0]
              : (sk.pluginId ? String(sk.pluginId).split('@')[0] : 'plugin');
            if (!groupMap.has(prefix)) groupMap.set(prefix, []);
            groupMap.get(prefix).push(sk);
          });

          groupMap.forEach((grpSkills, pluginName) => {
            const autoExpand = Boolean(q) || (extSkillScope === 'plugin' && groupMap.size === 1) || expandedPluginSkillGroups.has(pluginName);
            const grpCls = autoExpand ? 'skill-plugin-group' : 'skill-plugin-group collapsed';
            const safeId = 'skill-plugin-grp-' + String(pluginName).replace(/[^a-zA-Z0-9_-]/g, '_');
            parts.push(
              '<div class="' + grpCls + '" id="' + safeId + '" data-plugin-group="' + escapeAttribute(pluginName) + '">' +
                '<div class="skill-plugin-group-header" data-action="toggleSkillPluginGroup" data-plugin-group="' + escapeAttribute(pluginName) + '" title="点击展开/收起 ' + escapeAttribute(pluginName) + ' 插件的技能列表">' +
                  '<span style="display: flex; align-items: center; gap: 5px; font-weight: 500;">' +
                    '<span class="caret">▼</span>' +
                    '<span>🧩 ' + escapeHtml(pluginName) + '</span>' +
                  '</span>' +
                  '<span class="ext-group-badge">' + grpSkills.length + ' 项技能</span>' +
                '</div>' +
                '<div class="skill-plugin-group-body">' +
                  grpSkills.map(sk => renderSkillItemHtml(sk, true)).join('') +
                '</div>' +
              '</div>'
            );
          });
        }

        if (parts.length > 0) {
          skillsList.innerHTML = parts.join('');
        } else {
          const emptySkillMsg = q
            ? '无匹配的技能'
            : (extSkillScope === 'local' ? '暂无本地 (Global / Workspace) 技能' : (extSkillScope === 'plugin' ? '暂无已启用插件提供的技能' : '暂无本地 Skills 技能'));
          skillsList.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">' + escapeHtml(emptySkillMsg) + '</div>';
        }
      }

      const totalExt = allMcp.length + allPlugins.length + allAgents.length + allMemEntries.length + allSkills.length;
      const badgeEl = document.getElementById('ext-count-badge');
      if (badgeEl) badgeEl.innerText = totalExt + ' 项';
    }

    // Sessions State
    let allSessions = [];
    let focusedSessionId = null;
    let currentSession = null;
    let currentFilter = 'all';
    let backendFilterMode = null;
    let initialFilterModeReceived = false;
    let searchKeyword = '';
    let currentPage = 1;
    let pageSize = 8;

    function updateMonitorScopeButtons(mode) {
      const wsBtn = document.getElementById('monitor-scope-ws');
      const allBtn = document.getElementById('monitor-scope-all');
      const isWs = mode === 'currentWorkspace';
      if (wsBtn) {
        wsBtn.classList.toggle('active', isWs);
        wsBtn.setAttribute('aria-pressed', String(isWs));
      }
      if (allBtn) {
        allBtn.classList.toggle('active', !isWs);
        allBtn.setAttribute('aria-pressed', String(!isWs));
      }
    }

    function applyToolbarI18n() {
      const refreshBtn = document.getElementById('hdr-refresh-btn');
      if (refreshBtn) {
        const tip = hubUiStrings.tbRefresh || 'Refresh status';
        refreshBtn.title = tip;
        refreshBtn.setAttribute('aria-label', tip);
      }
      const openTabBtn = document.getElementById('hdr-open-tab-btn');
      if (openTabBtn) {
        const tip = hubUiStrings.tbOpenTab || 'Open in Editor Tab';
        openTabBtn.title = tip;
        openTabBtn.setAttribute('aria-label', tip);
      }
    }

    function setSessionFilter(filter, notifyBackend = true) {
      currentFilter = filter;
      currentPage = 1;
      saveUiState();
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      if (filter === 'all') {
        const chip = document.getElementById('chip-all');
        if (chip) chip.classList.add('active');
        if (notifyBackend) {
          backendFilterMode = 'all';
          updateMonitorScopeButtons('all');
          sendMessage('setFilterMode', { mode: 'all' });
        }
      } else if (filter === 'workspace') {
        const chip = document.getElementById('chip-ws');
        if (chip) chip.classList.add('active');
        if (notifyBackend) {
          backendFilterMode = 'currentWorkspace';
          updateMonitorScopeButtons('currentWorkspace');
          sendMessage('setFilterMode', { mode: 'currentWorkspace' });
        }
      } else if (filter === 'pinned') {
        const chip = document.getElementById('chip-pinned');
        if (chip) chip.classList.add('active');
      } else if (filter === 'active') {
        const chip = document.getElementById('chip-active');
        if (chip) chip.classList.add('active');
      }
      renderSessionsList();
    }

    let searchDebounceTimer = null;
    function clearSessionSearch() {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchKeyword = '';
      currentPage = 1;
      saveUiState();
      const input = document.getElementById('session-search');
      if (input) input.value = '';
      renderSessionsList();
      if (input) input.focus();
    }

    function onSearchInput(val) {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        searchKeyword = (val || '').toLowerCase().trim();
        currentPage = 1;
        saveUiState();
        renderSessionsList();
      }, 150);
    }

    (function bindTodoToolsToggle() {
      const toggle = document.getElementById('todo-tools-toggle');
      if (!toggle || toggle.dataset.bound === '1') return;
      toggle.dataset.bound = '1';
      toggle.addEventListener('change', () => {
        if (toggle.dataset.syncing === '1') return;
        toggle.disabled = true;
        sendMessage('setTodoToolsEnv', { enabled: !!toggle.checked });
        setTimeout(() => { toggle.disabled = false; }, 4000);
      });
      applyToolbarI18n();
    })();

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

    function formatDuration(ms, precise) {
      if (isNaN(ms) || ms < 0) ms = 0;
      const totalSec = Math.floor(ms / 1000);
      if (totalSec < 60) {
        return precise ? totalSec + 's' : (totalSec === 0 ? '< 1m' : totalSec + 's');
      }
      const minutes = Math.floor(totalSec / 60);
      const seconds = totalSec % 60;
      if (minutes < 60) {
        return (precise && seconds > 0) ? (minutes + 'm ' + seconds + 's') : (minutes + 'm');
      }
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (hours < 24) {
        return remainingMinutes > 0 ? (hours + 'h ' + remainingMinutes + 'm') : (hours + 'h');
      }
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return remainingHours > 0 ? (days + 'd ' + remainingHours + 'h') : (days + 'd');
    }

    function updateLiveSessionDuration() {
      const durEl = document.getElementById('session-dur-label');
      const kpiDurVal = document.getElementById('kpi-dur-val');
      const kpiDurSub = document.getElementById('kpi-dur-sub');
      if (!currentSession) {
        if (durEl) { durEl.innerText = '--'; durEl.title = ''; }
        if (kpiDurVal) kpiDurVal.innerText = '--';
        if (kpiDurSub) kpiDurSub.innerText = '--';
      } else {
        const isIdle = !!currentSession.isIdle;
        const createdTime = currentSession.sessionCreated ? new Date(currentSession.sessionCreated).getTime() : 0;
        const turnStartTime = currentSession.currentTurnStartTime ? new Date(currentSession.currentTurnStartTime).getTime() : 0;
        const baseDurMs = currentSession.durationMs || 0;

        if (isIdle) {
          const durText = formatDuration(baseDurMs, false);
          if (durEl) {
            durEl.innerText = durText;
            let tip = '累计有效对话时长: ' + durText;
            if (createdTime > 0) tip += ' · 会话创建于 ' + formatRelativeTime(createdTime);
            if (currentSession.totalSpanMs && currentSession.totalSpanMs > baseDurMs) tip += ' (历时跨度 ' + formatDuration(currentSession.totalSpanMs, false) + ')';
            durEl.title = tip;
          }
          if (kpiDurVal) kpiDurVal.innerText = durText;
          if (kpiDurSub) kpiDurSub.innerText = currentSession.totalSpanMs ? ('跨度 ' + formatDuration(currentSession.totalSpanMs, false)) : '累计有效';
        } else {
          let turnDurMs = 0;
          if (turnStartTime > 0) turnDurMs = Math.max(0, Date.now() - turnStartTime);
          const turnText = turnDurMs > 0 ? formatDuration(turnDurMs, true) : '';
          const totalActiveMs = baseDurMs + (turnDurMs > 0 && turnDurMs <= 300000 ? turnDurMs : 0);
          const totalText = formatDuration(totalActiveMs, false);

          if (durEl) {
            if (turnText) {
              durEl.innerText = turnText + ' / 总 ' + totalText;
              let tip = '当前任务运行时长: ' + turnText + ' · 累计有效对话: ' + totalText;
              if (createdTime > 0) tip += ' · 会话创建于 ' + formatRelativeTime(createdTime);
              durEl.title = tip;
            } else {
              durEl.innerText = formatDuration(totalActiveMs, true);
              durEl.title = '累计有效运行时长: ' + formatDuration(totalActiveMs, true);
            }
          }
          if (kpiDurVal) kpiDurVal.innerText = turnText || formatDuration(totalActiveMs, true);
          if (kpiDurSub) kpiDurSub.innerText = '总 ' + totalText;
        }
      }

      if (currentSession && !currentSession.isIdle && currentSession.activeTools && currentSession.activeTools.length > 0) {
        const toolDurEl = document.getElementById('running-tool-dur');
        if (toolDurEl) {
          const t = currentSession.activeTools[0];
          const startMs = t.startTime ? new Date(t.startTime).getTime() : 0;
          const elapsedSec = startMs > 0 ? Math.max(0, Math.floor((Date.now() - startMs) / 1000)) : 0;
          toolDurEl.innerText = elapsedSec + 's';
        }
      }
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

    function jobTimeMs(value) {
      if (value == null || value === '') return 0;
      if (typeof value === 'number') return value;
      const parsed = new Date(value).getTime();
      return isNaN(parsed) ? 0 : parsed;
    }

    function bgKindLabel(kind) {
      if (kind === 'agent') return 'agent';
      if (kind === 'shell') return 'shell';
      if (kind === 'workflow') return 'workflow';
      return 'task';
    }

    function renderLoopBanner(s) {
      const banner = document.getElementById('loop-status-banner');
      if (!banner) return;
      const lp = s && s.loopState;
      if (!lp) {
        banner.style.display = 'none';
        return;
      }
      banner.style.display = 'flex';
      const modeEl = document.getElementById('loop-mode-label');
      const chipsEl = document.getElementById('loop-meta-chips');
      const pillEl = document.getElementById('loop-countdown-pill');
      const reasonEl = document.getElementById('loop-reason-line');

      if (modeEl) modeEl.textContent = lp.mode === 'cron' ? 'Cron Loop' : 'Dynamic Loop';
      if (chipsEl) {
        const metaParts = [];
        if (lp.mode === 'cron' && lp.cronExpression) metaParts.push(lp.cronExpression);
        else if (lp.delaySeconds) metaParts.push('间隔 ' + lp.delaySeconds + 's');
        if (lp.tickCount) metaParts.push('Tick #' + lp.tickCount);
        if (lp.noopStreak && lp.noopStreak > 0) metaParts.push('静默×' + lp.noopStreak);
        chipsEl.textContent = metaParts.join(' · ');
      }
      if (pillEl) {
        if (!lp.active) {
          pillEl.className = 'status-pill idle';
          pillEl.textContent = '已停止';
        } else if (lp.nextWakeAt) {
          const wakeMs = jobTimeMs(lp.nextWakeAt);
          const remMs = wakeMs > 0 ? wakeMs - Date.now() : 0;
          if (remMs > 0) {
            pillEl.className = 'status-pill active';
            pillEl.textContent = '⏳ ' + formatDuration(remMs, true);
          } else {
            pillEl.className = 'status-pill active';
            pillEl.textContent = '⚡ 待唤醒';
          }
        } else {
          pillEl.className = 'status-pill active';
          pillEl.textContent = '运行中';
        }
      }
      if (reasonEl) {
        const detail = lp.reason || lp.prompt || '';
        if (detail) {
          reasonEl.style.display = 'block';
          reasonEl.textContent = (lp.reason ? '原因: ' : '任务: ') + detail;
          reasonEl.title = detail;
        } else {
          reasonEl.style.display = 'none';
          reasonEl.textContent = '';
        }
      }
    }

    function bgStatusLabel(status) {
      if (status === 'running') return '运行中';
      if (status === 'error') return '失败';
      if (status === 'killed') return '已停止';
      return '已完成';
    }

    function renderBackgroundJobs(s) {
      const wrap = document.getElementById('bgjobs-container');
      const list = document.getElementById('bgjobs-list');
      const counter = document.getElementById('bgjobs-counter');
      const quickBadge = document.getElementById('monitor-bg-badge');
      if (!wrap || !list) return;
      const now = Date.now();
      const rows = [];
      const seen = {};
      function pushJob(job, project, sessionId) {
        if (!job || !job.id || job.status !== 'running') return;
        const key = (sessionId || '') + ':' + job.id;
        if (seen[key]) return;
        seen[key] = true;
        rows.push({ job: job, project: project || '' });
      }
      const ownJobs = (s && s.backgroundJobs) || [];
      for (let i = 0; i < ownJobs.length; i++) pushJob(ownJobs[i], '', s && s.sessionId);
      rows.sort(function (a, b) {
        const ar = a.job.status === 'running' ? 0 : 1;
        const br = b.job.status === 'running' ? 0 : 1;
        return ar - br;
      });
      const runningCount = rows.filter(function (row) { return row.job.status === 'running'; }).length;
      if (counter) counter.textContent = String(runningCount);
      if (quickBadge) {
        quickBadge.textContent = String(runningCount);
        quickBadge.style.display = runningCount > 0 ? 'inline-flex' : 'none';
      }
      if (!rows.length) {
        wrap.style.display = 'none';
        list.innerHTML = '';
        return;
      }
      wrap.style.display = 'block';
      list.innerHTML = rows.slice(0, 8).map(function (row) {
        const job = row.job;
        const running = job.status === 'running';
        const dotClass = running ? 'bgjob-dot running' : (job.status === 'error' ? 'bgjob-dot fail' : 'bgjob-dot');
        const startMs = jobTimeMs(job.startTime);
        const endMs = jobTimeMs(job.endTime);
        const elapsedMs = running
          ? (startMs > 0 ? Math.max(0, now - startMs) : 0)
          : (startMs > 0 && endMs > startMs ? endMs - startMs : 0);
        const elapsed = elapsedMs > 0 ? formatDuration(elapsedMs, true) : '';
        const prefix = row.project ? escapeHtml(row.project) + ' · ' : '';
        const meta = bgKindLabel(job.kind) + ' · ' + bgStatusLabel(job.status) + (elapsed ? ' · ' + elapsed : '');
        const title = job.outputFile ? escapeAttribute(job.outputFile) : escapeAttribute(job.label || job.id || '');
        return '<div class="bgjob-row" title="' + title + '"><span class="' + dotClass + '"></span><div class="bgjob-main"><div class="bgjob-label">' + prefix + escapeHtml(job.label || job.id || 'task') + '</div><div class="bgjob-meta">' + escapeHtml(meta) + '</div></div></div>';
      }).join('') + '<div style="opacity:0.65;margin-top:4px;">这是斜杠 /tasks 后台任务，不是会话待办。点“打开”可在 Claude Code 里查看。</div>';
    }

    function renderTodoToolsPanel(msg) {
      const title = document.getElementById('todo-tools-title');
      const label = document.getElementById('todo-tools-toggle-label');
      const caveat = document.getElementById('todo-tools-caveat');
      const status = document.getElementById('todo-tools-status');
      const toggle = document.getElementById('todo-tools-toggle');
      if (!toggle || !status) return;
      if (title && hubUiStrings.todoToolsTitle) title.textContent = hubUiStrings.todoToolsTitle;
      if (label && hubUiStrings.todoToolsToggle) label.textContent = hubUiStrings.todoToolsToggle;
      if (caveat && hubUiStrings.todoToolsCaveat) caveat.textContent = hubUiStrings.todoToolsCaveat;

      const states = Array.isArray(msg.taskIntegration) ? msg.taskIntegration : [];
      const primary = states[0];
      const settingOn = !!msg.todoToolsEnabledSetting;
      const anyEnvOn = states.some(function (s) { return !!(s && s.envEnabled); });
      const checked = anyEnvOn || settingOn;
      toggle.dataset.syncing = '1';
      toggle.checked = checked;
      toggle.disabled = false;
      delete toggle.dataset.syncing;
      const parts = [];
      if (primary) {
        parts.push(checked ? (hubUiStrings.todoToolsOn || 'On') : (hubUiStrings.todoToolsOff || 'Off'));
        parts.push(primary.effectiveEnabled ? (hubUiStrings.todoToolsEffectiveOn || 'Effective: on') : (hubUiStrings.todoToolsEffectiveOff || 'Effective: off'));
        if (primary.observed) parts.push(hubUiStrings.todoToolsObserved || 'Observed');
        if (primary.conflict) parts.push('⚠ ' + (primary.conflictReason || 'conflict'));
        if (!primary.hooksConfigured) parts.push(hubUiStrings.todoToolsHooksNote || 'env-only');
        if (states.length > 1) parts.push('(' + states.length + ' folders)');
      } else {
        parts.push(hubUiStrings.todoToolsOff || 'Off');
        parts.push('(no workspace folder)');
      }
      status.textContent = parts.join(' · ');
      status.style.color = primary && primary.conflict ? '#f44747' : 'var(--text-muted)';
    }

    let openSessionMenuId = null;

    function openSessionReader(sessionId) {
      if (!sessionId) return;
      selectedReaderSessionId = sessionId;
      readerScrollY = window.scrollY;
      renderSessionReader();
      renderSessionsList();
      const splitEl = document.getElementById('sessions-split');
      if (splitEl) {
        splitEl.classList.remove('mode-list');
        splitEl.classList.add('mode-detail');
      }
      if (document.body.classList.contains('narrow')) {
        window.scrollTo(0, 0);
      }
      saveUiState();
    }

    function closeSessionReader() {
      const splitEl = document.getElementById('sessions-split');
      if (splitEl) {
        splitEl.classList.remove('mode-detail');
        splitEl.classList.add('mode-list');
      }
      window.scrollTo(0, readerScrollY || 0);
    }

    function renderSessionReader() {
      const body = document.getElementById('session-reader-body');
      if (!body) return;
      const targetId = selectedReaderSessionId || focusedSessionId || (allSessions[0] && allSessions[0].sessionId) || null;
      const s = targetId ? allSessions.find(item => item.sessionId === targetId) : null;
      if (!s) {
        body.innerHTML = '<div class="muted" style="font-size: 12px; padding: 18px 0;">选择一个会话以查看详细信息与快捷操作</div>';
        return;
      }
      selectedReaderSessionId = s.sessionId;
      const sidAttr = escapeAttribute(s.sessionId || '');
      const fileAttr = escapeAttribute(s.sessionFile || '');
      const isFocused = s.sessionId === focusedSessionId;
      const title = s.sessionTitle || '未命名对话';
      const tokens = s.tokenUsage ? formatTokenCount(s.tokenUsage.totalTokens) : '0';
      const pct = s.tokenUsage && s.tokenUsage.percentage ? s.tokenUsage.percentage + '%' : '0%';
      const speed = s.outputSpeed && isValidOutputSpeed(Number(s.outputSpeed.tokensPerSecond))
        ? formatOutputSpeed(Number(s.outputSpeed.tokensPerSecond))
        : '—';
      const badges = [];
      badges.push(!s.isIdle ? '<span class="status-pill active">⚡ 活跃</span>' : '<span class="status-pill idle">💤 闲置</span>');
      if (isFocused) badges.push('<span class="status-pill focused">📍 当前聚焦</span>');
      if (s.pinned) badges.push('<span class="session-pin-badge">PIN</span>');
      if (title.includes('(Fork')) badges.push('<span class="status-pill">Fork</span>');
      if (s.agentsCount && s.agentsCount > 0) badges.push('<span class="status-pill">🤖 ' + s.agentsCount + ' 代理</span>');

      const tagsText = (s.tags && s.tags.length) ? s.tags.join(', ') : '—';
      const compareBtn = s.parentSessionId
        ? '<button type="button" class="btn ghost" data-action="compareFork" data-session-id="' + sidAttr + '">🔀 对比分叉</button>'
        : '';

      body.innerHTML =
        '<div class="reader-title">' + escapeHtml(title) + '</div>' +
        '<div class="reader-badges">' + badges.join('') + '</div>' +
        '<dl class="kv">' +
          '<dt>项目</dt><dd>' + escapeHtml((s.projectName || '未知项目') + (s.workspaceFolderName ? ' · ' + s.workspaceFolderName : '')) + '</dd>' +
          '<dt>模型</dt><dd>' + escapeHtml(s.model || 'Claude') + '</dd>' +
          '<dt>分支</dt><dd class="mono">' + escapeHtml(s.gitBranch || '—') + '</dd>' +
          '<dt>上下文</dt><dd>' + escapeHtml(pct + ' (' + tokens + ' Tokens)') + '</dd>' +
          '<dt>输出速率</dt><dd>' + escapeHtml(speed) + '</dd>' +
          '<dt>最近活跃</dt><dd>' + escapeHtml(formatRelativeTime(s.lastUpdated) || '—') + '</dd>' +
          '<dt>标签</dt><dd>' + escapeHtml(tagsText) + '</dd>' +
          '<dt>日志路径</dt><dd class="mono" style="font-size:10.5px;">' + escapeHtml(s.sessionFile || '—') + '</dd>' +
        '</dl>' +
        '<div class="action-grid">' +
          '<button type="button" class="btn primary" data-action="resumeSession" data-session-id="' + sidAttr + '">▶ 终端恢复</button>' +
          '<button type="button" class="btn" data-action="focusSession" data-session-id="' + sidAttr + '">📍 聚焦监控</button>' +
          '<button type="button" class="btn ghost" data-action="forkSession" data-session-id="' + sidAttr + '">🌿 分叉会话</button>' +
          '<button type="button" class="btn ghost" data-action="openSessionFile" data-file-path="' + fileAttr + '">📄 打开 JSONL</button>' +
          '<button type="button" class="btn ghost" data-action="showTimeline" data-session-id="' + sidAttr + '">🛡️ 时间线</button>' +
          compareBtn +
        '</div>' +
        '<div class="manage-row">' +
          '<button type="button" class="linkbtn" data-action="renameSession" data-session-id="' + sidAttr + '">重命名</button>' +
          '<button type="button" class="linkbtn" data-action="editSessionTags" data-session-id="' + sidAttr + '">编辑标签</button>' +
          '<button type="button" class="linkbtn" data-action="togglePinSession" data-session-id="' + sidAttr + '">' + (s.pinned ? '取消置顶' : '置顶') + '</button>' +
          '<button type="button" class="linkbtn" data-action="exportSession" data-session-id="' + sidAttr + '">导出 Markdown</button>' +
          '<button type="button" class="linkbtn" data-action="newConversation">新会话交接</button>' +
          '<span class="spacer"></span>' +
          '<button type="button" class="linkbtn danger" data-action="deleteSession" data-session-id="' + sidAttr + '">删除记录</button>' +
        '</div>';
    }

    function sessionGroupBucket(s) {
      if (s.pinned) return '置顶';
      if (!s.isIdle) return '活跃中';
      const now = Date.now();
      const diffHours = (now - (s.lastUpdated || 0)) / 3600000;
      if (diffHours < 24) return '今天';
      if (diffHours < 48) return '昨天';
      if (diffHours < 24 * 7) return '本周';
      return '更早';
    }

    function renderSessionsList() {
      const container = document.getElementById('session-cards-list');
      const totalBadge = document.getElementById('sessions-total-badge');
      const scopeCount = allSessions.filter(s => {
        if (currentFilter === 'workspace') return s.isCurrentWorkspace;
        if (currentFilter === 'active') return !s.isIdle;
        if (currentFilter === 'pinned') return s.pinned;
        return true;
      }).length;

      const filtered = allSessions.filter(s => {
        if (currentFilter === 'workspace' && !s.isCurrentWorkspace) return false;
        if (currentFilter === 'active' && s.isIdle) return false;
        if (currentFilter === 'pinned' && !s.pinned) return false;
        if (searchKeyword) {
          const matchProj = (s.projectName || '').toLowerCase().includes(searchKeyword);
          const matchTitle = (s.sessionTitle || '').toLowerCase().includes(searchKeyword);
          const matchBranch = (s.gitBranch || '').toLowerCase().includes(searchKeyword);
          const matchModel = (s.model || '').toLowerCase().includes(searchKeyword);
          const matchFolder = (s.workspaceFolderName || '').toLowerCase().includes(searchKeyword);
          const matchTags = Array.isArray(s.tags) && s.tags.some(t => String(t).toLowerCase().includes(searchKeyword));
          if (!matchProj && !matchTitle && !matchBranch && !matchModel && !matchFolder && !matchTags) return false;
        }
        return true;
      });

      totalBadge.innerText = searchKeyword
        ? filtered.length + ' / ' + scopeCount + ' 个会话'
        : scopeCount + ' 个会话';
      totalBadge.title = searchKeyword ? '搜索结果数 / 当前筛选总数' : '当前筛选会话数';

      const totalPages = Math.ceil(filtered.length / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      document.getElementById('pagination-info').innerText = '第 ' + currentPage + ' / ' + totalPages + ' 页 (共 ' + filtered.length + ' 条)';
      document.getElementById('btn-prev-page').disabled = currentPage <= 1;
      document.getElementById('btn-next-page').disabled = currentPage >= totalPages;

      if (filtered.length === 0) {
        if (openSessionMenuId) closeSessionMenu(false);
        if (searchKeyword) {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 16px 0;"><div>当前筛选中没有匹配的会话</div><div style="margin-top: 8px;"><button type="button" class="filter-chip" onclick="clearSessionSearch()">清除搜索</button></div></div>';
        } else if (currentFilter === 'workspace') {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 16px 0;"><div>当前工作区暂无会话</div><div style="margin-top: 8px;"><button class="filter-chip active" style="display: inline-block; padding: 3px 10px;" onclick="setSessionFilter(\\'all\\')">🌐 查看全部项目会话</button></div></div>';
        } else {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 16px 0;">未找到符合条件的会话</div>';
        }
        return;
      }

      const startIndex = (currentPage - 1) * pageSize;
      const pageSessions = filtered.slice(startIndex, startIndex + pageSize);
      const activeControl = container.contains(document.activeElement) ? document.activeElement : null;
      const focusedAction = activeControl && activeControl.getAttribute('data-action');
      const focusedId = activeControl && activeControl.getAttribute('data-session-id');
      const focusedPath = activeControl && activeControl.getAttribute('data-file-path');

      let lastBucket = '';
      container.innerHTML = pageSessions.map(s => {
        const bucket = sessionGroupBucket(s);
        let groupHeader = '';
        if (bucket !== lastBucket) {
          lastBucket = bucket;
          groupHeader = '<div class="session-group-label">' + escapeHtml(bucket) + '</div>';
        }
        const isFocused = s.sessionId === focusedSessionId;
        const isReaderSelected = s.sessionId === selectedReaderSessionId;
        const tagsBadge = (s.tags && s.tags.length) ? ('<span class="session-tag-badge" title="' + escapeAttribute(s.tags.join(', ')) + '">' + escapeHtml(s.tags.slice(0,3).join(' · ')) + (s.tags.length > 3 ? '…' : '') + '</span>') : '';
        const pinnedTag = s.pinned ? '<span class="session-pin-badge" title="已置顶 (Pinned)">PIN</span>' : '';
        const focusedTag = isFocused ? '<span class="status-pill focused" style="font-size: 9px;"><span class="badge-icon">📍</span><span class="badge-text">当前聚焦</span></span>' : '';
        const bgRunning = (s.backgroundJobs || []).filter(function (job) { return job && job.status === 'running'; });
        const bgBadge = bgRunning.length
          ? ' <span class="status-pill active" style="font-size: 9px;" title="' + escapeAttribute(bgRunning[0].label || '后台任务') + '"><span class="badge-icon">🧵</span><span class="badge-text">后台 ' + bgRunning.length + '</span></span>'
          : '';
        const loopBadge = (s.loopState && s.loopState.active)
          ? ' <span class="status-pill active" style="font-size: 9px;" title="' + escapeAttribute(s.loopState.reason || s.loopState.prompt || 'Loop 定时唤醒中') + '"><span class="badge-icon">🔁</span><span class="badge-text">' + (s.loopState.mode === 'cron' ? 'Cron' : (s.loopState.delaySeconds ? s.loopState.delaySeconds + 's' : 'Loop')) + '</span></span>'
          : '';
        const activeTag = !s.isIdle ? '<span class="status-pill active" style="font-size: 9px;"><span class="badge-icon">⚡</span><span class="badge-text">活跃</span></span>' : '<span class="status-pill idle" style="font-size: 9px;"><span class="badge-icon">💤</span><span class="badge-text">闲置</span></span>';
        const cardClass = 'session-card' + (isFocused ? ' focused' : '') + (isReaderSelected ? ' selected-reader' : '');
        const timeStr = formatRelativeTime(s.lastUpdated);
        const tokens = s.tokenUsage ? formatTokenCount(s.tokenUsage.totalTokens) : '0';
        const pct = s.tokenUsage && s.tokenUsage.percentage ? s.tokenUsage.percentage + '%' : '0%';
        const branchStr = s.gitBranch ? '🌿 ' + escapeHtml(s.gitBranch) : '';
        const branchAttr = escapeAttribute(s.gitBranch || '');
        const titleStr = s.sessionTitle ? s.sessionTitle : '未命名对话';
        const projectLabel = (s.projectName || '未知项目') + (s.workspaceFolderName ? ' · ' + s.workspaceFolderName : '');
        const projectNameStr = escapeHtml(projectLabel);
        const projectNameAttr = escapeAttribute(projectLabel);
        const titleDisplay = escapeHtml(titleStr);
        const titleAttr = escapeAttribute(titleStr);
        const modelDisplay = escapeHtml(s.model || 'Claude');
        const modelAttr = escapeAttribute(s.model || 'Claude');
        const sessionIdAttr = escapeAttribute(s.sessionId || '');
        const sessionFileAttr = escapeAttribute(s.sessionFile || '');

        const isFork = titleStr.includes('(Fork');
        const forkBadge = isFork ? '<span class="status-pill fork" title="Fork 会话">Fork</span>' : '';
        const agentsBadge = (s.agentsCount && s.agentsCount > 0) ? ' <span title="包含 ' + s.agentsCount + ' 个协作代理" style="background: rgba(55, 148, 255, 0.14); color: var(--blue); font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: 600;"><span class="badge-icon">🤖</span><span class="badge-text"> ' + s.agentsCount + '</span></span>' : '';

        const durationMs = s.durationMs !== undefined ? s.durationMs : 0;
        const durationStr = durationMs > 0 ? formatDuration(durationMs, false) : '';
        let durationTitle = '累计有效对话: ' + durationStr;
        if (s.totalSpanMs && s.totalSpanMs > durationMs) durationTitle += ' · 创建跨度: ' + formatDuration(s.totalSpanMs, false);
        const durationBadge = durationStr ? '<span title="' + escapeAttribute(durationTitle) + '">⏱️ ' + durationStr + '</span>' : '';

        const rightMetaParts = [];
        if (durationBadge) rightMetaParts.push(durationBadge);
        if (timeStr) rightMetaParts.push(timeStr);
        const speedTps = s.outputSpeed ? Number(s.outputSpeed.tokensPerSecond) : NaN;
        if (isValidOutputSpeed(speedTps)) {
          rightMetaParts.push('<span>⚡ ' + escapeHtml(formatOutputSpeed(speedTps)) + '</span>');
        }
        const rightMetaHtml = rightMetaParts.join(' · ');

        let tokenText = pct + ' (' + tokens + ' Tokens)';
        if (s.subagentsTotalTokens && s.subagentsTotalTokens > 0) {
          tokenText += ' <span style="opacity: 0.75;">(含代理 +' + formatTokenCount(s.subagentsTotalTokens) + ')</span>';
        }

        const compareMenuItem = s.parentSessionId
          ? '<button type="button" class="session-menu-item" role="menuitem" data-action="compareFork" data-session-id="' + sessionIdAttr + '" title="对比父会话"><span class="session-menu-icon">🔀</span><span class="session-menu-text">对比父会话</span></button>'
          : '';
        const moreMenuHtml =
          '<div class="session-more-wrap">' +
            '<button type="button" class="session-act-btn more" data-action="toggleSessionMenu" data-session-id="' + sessionIdAttr + '" title="更多会话操作" aria-haspopup="menu" aria-expanded="false"><span class="btn-icon">⋯</span><span class="btn-text">更多</span></button>' +
            '<div class="session-more-menu" role="menu" aria-label="会话更多操作" data-session-id="' + sessionIdAttr + '">' +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="renameSession" data-session-id="' + sessionIdAttr + '" title="重命名会话"><span class="session-menu-icon">✏️</span><span class="session-menu-text">重命名</span></button>' +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="togglePinSession" data-session-id="' + sessionIdAttr + '" title="置顶/取消置顶"><span class="session-menu-icon">' + (s.pinned ? '📌' : '📍') + '</span><span class="session-menu-text">' + (s.pinned ? '取消置顶' : '置顶') + '</span></button>' +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="exportSession" data-session-id="' + sessionIdAttr + '" title="导出 Markdown"><span class="session-menu-icon">📄</span><span class="session-menu-text">导出 Markdown</span></button>' +
              compareMenuItem +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="editSessionTags" data-session-id="' + sessionIdAttr + '" title="编辑标签"><span class="session-menu-icon">🏷️</span><span class="session-menu-text">编辑标签</span></button>' +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="showTimeline" data-session-id="' + sessionIdAttr + '" title="权限/Hook 时间线"><span class="session-menu-icon">🛡️</span><span class="session-menu-text">时间线</span></button>' +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="forkSession" data-session-id="' + sessionIdAttr + '" title="分叉此会话 (Fork)"><span class="session-menu-icon">🌿</span><span class="session-menu-text">分叉</span></button>' +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="openSessionFile" data-file-path="' + sessionFileAttr + '" title="查看原始 JSONL 日志"><span class="session-menu-icon">📄</span><span class="session-menu-text">查看日志</span></button>' +
              '<div class="session-menu-sep" role="separator"></div>' +
              '<button type="button" class="session-menu-item danger" role="menuitem" data-action="deleteSession" data-session-id="' + sessionIdAttr + '" title="删除此会话"><span class="session-menu-icon">🗑️</span><span class="session-menu-text">删除会话</span></button>' +
            '</div>' +
          '</div>';

        const branchRow = branchStr ? '<div class="session-branch-row"><span class="session-branch-text" title="' + branchAttr + '">' + branchStr + '</span></div>' : '';

        return groupHeader +
          '<div class="' + cardClass + '" data-session-id="' + sessionIdAttr + '">' +
          '<div class="session-header-row">' +
            '<div class="session-title-text" title="' + titleAttr + '">' + titleDisplay + '</div>' +
            '<div class="session-header-badges">' + focusedTag + activeTag + pinnedTag + loopBadge + bgBadge + agentsBadge + forkBadge + tagsBadge + '</div>' +
          '</div>' +
          '<div class="session-sub-row">' +
            '<span class="session-project-name" title="' + projectNameAttr + '">' + projectNameStr + '</span>' +
            '<span class="session-model-text" title="' + modelAttr + '">' + modelDisplay + '</span>' +
          '</div>' +
          branchRow +
          '<div class="session-meta-row">' +
            '<span class="session-meta-main">' + tokenText + '</span>' +
            '<span class="session-meta-side">' + rightMetaHtml + '</span>' +
          '</div>' +
          '<div class="session-actions-row">' +
            '<button type="button" class="session-act-btn focus" data-action="focusSession" data-session-id="' + sessionIdAttr + '" title="查看此会话"><span class="btn-icon">👀</span><span class="btn-text">查看</span></button>' +
            '<button type="button" class="session-act-btn resume" data-action="resumeSession" data-session-id="' + sessionIdAttr + '" title="在终端恢复 (claude --resume)"><span class="btn-icon">▶️</span><span class="btn-text">恢复</span></button>' +
            moreMenuHtml +
          '</div>' +
        '</div>';
      }).join('');

      if (openSessionMenuId) {
        const reopened = getSessionMenuBySessionId(openSessionMenuId);
        if (reopened) {
          setSessionMenuOpen(reopened, getSessionMenuTrigger(reopened), true, false);
        } else {
          openSessionMenuId = null;
        }
      }
      if (focusedAction) {
        const controls = container.querySelectorAll('[data-action]');
        for (let i = 0; i < controls.length; i++) {
          const control = controls[i];
          if (control.getAttribute('data-action') === focusedAction &&
              control.getAttribute('data-session-id') === focusedId &&
              control.getAttribute('data-file-path') === focusedPath) {
            control.focus({ preventScroll: true });
            break;
          }
        }
      }
    }

    function getSessionMenuBySessionId(sessionId) {
      const menus = document.querySelectorAll('.session-more-menu');
      for (let i = 0; i < menus.length; i++) {
        if (menus[i].getAttribute('data-session-id') === sessionId) return menus[i];
      }
      return null;
    }

    function getSessionMenuTrigger(menu) {
      if (!menu) return null;
      const wrap = menu.closest('.session-more-wrap');
      return wrap ? wrap.querySelector('[data-action="toggleSessionMenu"]') : null;
    }

    function getSessionMenuItems(menu) {
      if (!menu) return [];
      return Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'));
    }

    function setSessionMenuOpen(menu, trigger, open, focusFirst) {
      if (!menu) return;
      const sessionId = menu.getAttribute('data-session-id') || '';
      if (open) {
        const otherMenus = document.querySelectorAll('.session-more-menu.open');
        for (let i = 0; i < otherMenus.length; i++) {
          if (otherMenus[i] !== menu) {
            setSessionMenuOpen(otherMenus[i], getSessionMenuTrigger(otherMenus[i]), false, false);
          }
        }
        menu.classList.add('open');
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
        openSessionMenuId = sessionId;
        menu.classList.remove('drop-up');
        const rect = menu.getBoundingClientRect();
        if (window.innerHeight - rect.bottom < 8 && rect.top > rect.height) {
          menu.classList.add('drop-up');
        }
        if (focusFirst) {
          const items = getSessionMenuItems(menu);
          if (items.length) items[0].focus();
        }
      } else {
        menu.classList.remove('open');
        menu.classList.remove('drop-up');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (openSessionMenuId === sessionId) openSessionMenuId = null;
      }
    }

    function toggleSessionMenu(triggerElement, focusFirst) {
      if (!triggerElement) return;
      const wrap = triggerElement.closest('.session-more-wrap');
      const menu = wrap ? wrap.querySelector('.session-more-menu') : null;
      if (!menu) return;
      const willOpen = !menu.classList.contains('open');
      setSessionMenuOpen(menu, triggerElement, willOpen, willOpen && focusFirst === true);
    }

    function closeSessionMenu(returnFocus) {
      const openMenus = document.querySelectorAll('.session-more-menu.open');
      let triggerToFocus = null;
      for (let i = 0; i < openMenus.length; i++) {
        const trigger = getSessionMenuTrigger(openMenus[i]);
        if (returnFocus && !triggerToFocus) triggerToFocus = trigger;
        setSessionMenuOpen(openMenus[i], trigger, false, false);
      }
      openSessionMenuId = null;
      if (returnFocus && triggerToFocus) triggerToFocus.focus();
    }

    document.addEventListener('keydown', event => {
      const target = event.target instanceof Element ? event.target : null;
      const trigger = target ? target.closest('[data-action="toggleSessionMenu"]') : null;
      if (trigger && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        const wrap = trigger.closest('.session-more-wrap');
        const menu = wrap ? wrap.querySelector('.session-more-menu') : null;
        if (!menu) return;
        if (!menu.classList.contains('open')) {
          setSessionMenuOpen(menu, trigger, true, false);
        }
        const items = getSessionMenuItems(menu);
        if (items.length) {
          items[event.key === 'ArrowUp' ? items.length - 1 : 0].focus();
        }
        return;
      }

      const openMenu = document.querySelector('.session-more-menu.open');
      if (!openMenu) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeSessionMenu(true);
        return;
      }
      if (event.key === 'Tab') {
        closeSessionMenu(false);
        return;
      }

      const items = getSessionMenuItems(openMenu);
      if (!items.length) return;
      const currentIndex = items.indexOf(document.activeElement);
      let nextIndex = -1;
      if (event.key === 'ArrowDown') {
        nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      } else if (event.key === 'ArrowUp') {
        nextIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = items.length - 1;
      }
      if (nextIndex >= 0) {
        event.preventDefault();
        items[nextIndex].focus();
      }
    });

    // Message Receiver
    window.addEventListener('message', event => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'restoreUiState') {
        restoreUiState(msg.state);
        return;
      }

      if (msg.type === 'switchTab' && typeof msg.tab === 'string') {
        switchMainTab(msg.tab);
        return;
      }

      if (msg.type === 'updateSession') {
        if (!uiStateRestored) restoreUiState();
        applyHubUiStrings(msg.ui);
        applyToolbarI18n();
        if (msg.sessionListPageSize && msg.sessionListPageSize >= 4) {
          pageSize = Math.min(50, Math.max(4, Number(msg.sessionListPageSize) || 8));
        }
        const s = msg.session;
        currentSession = s || null;
        if (msg.allSessions) allSessions = msg.allSessions;
        if (msg.focusedSessionId !== undefined) focusedSessionId = msg.focusedSessionId;

        if (msg.filterMode !== undefined) {
          const modeChanged = backendFilterMode !== msg.filterMode;
          backendFilterMode = msg.filterMode;
          updateMonitorScopeButtons(msg.filterMode);

          if (modeChanged && (initialFilterModeReceived || currentFilter === 'all' || currentFilter === 'workspace')) {
            currentFilter = msg.filterMode === 'currentWorkspace' ? 'workspace' : 'all';
            currentPage = 1;
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            const activeChip = document.getElementById(msg.filterMode === 'currentWorkspace' ? 'chip-ws' : 'chip-all');
            if (activeChip) activeChip.classList.add('active');
          }
          initialFilterModeReceived = true;
        }

        renderSessionsList();
        renderSessionReader();

        if (s) {
          const projName = s.projectName || '未知项目';
          const projEl = document.getElementById('proj-name');
          if (projEl) {
            projEl.innerText = projName;
            projEl.title = projName;
          }
          const pct = (s.tokenUsage && s.tokenUsage.percentage) || 0;
          const pctEl = document.getElementById('token-pct');
          if (pctEl) pctEl.innerText = pct + '%';
          const heroSub = document.getElementById('hero-tokens-sub');
          if (heroSub && s.tokenUsage) {
            heroSub.innerText = formatTokenCount(s.tokenUsage.totalTokens || 0) + ' / ' + formatTokenCount(s.contextLimit || 200000);
          }
          const fillEl = document.getElementById('token-fill');
          if (fillEl) fillEl.style.width = Math.min(pct, 100) + '%';
          const tokenBar = document.getElementById('token-progress');
          if (tokenBar) tokenBar.setAttribute('aria-valuenow', String(Math.round(pct)));

          if (s.tokenUsage) {
            document.getElementById('m-in').innerText = formatTokenCount(s.tokenUsage.inputTokens);
            document.getElementById('m-cache').innerText = formatTokenCount(s.tokenUsage.cacheReadTokens);
            document.getElementById('m-write').innerText = formatTokenCount(s.tokenUsage.cacheCreationTokens);
            document.getElementById('m-out').innerText = formatTokenCount(s.tokenUsage.outputTokens);
          }
          renderOutputSpeed(s);

          const dispModel = s.modelDisplay || s.model || '默认';
          const respExtra = (s.lastResponseModelDisplay && s.lastResponseModelDisplay !== dispModel)
            ? ' (响应: ' + s.lastResponseModelDisplay + ')'
            : '';
          const heroBadge = document.getElementById('hero-model-badge');
          if (heroBadge) heroBadge.innerText = dispModel;
          const heroActive = document.getElementById('hero-last-active');
          if (heroActive) heroActive.innerText = s.lastUpdated ? formatRelativeTime(new Date(s.lastUpdated).getTime()) : '--';

          const modelEl = document.getElementById('model-tag');
          if (modelEl) {
            modelEl.innerText = dispModel + respExtra;
            modelEl.title = '模型: ' + dispModel + (respExtra ? ' · 最近响应: ' + s.lastResponseModelDisplay : '');
          }
          const branchEl = document.getElementById('branch-tag');
          if (branchEl) {
            branchEl.innerText = s.gitBranch || '未关联';
            branchEl.title = s.gitBranch ? 'Git 分支: ' + s.gitBranch : '当前会话未关联 Git 分支';
          }
          const baseCostText = '预估消耗: ' + (msg.cost || '< $0.001');
          const subagentCostExtra = (s.subagentsTotalTokens && s.subagentsTotalTokens > 0)
            ? ' (含子代理: +' + formatTokenCount(s.subagentsTotalTokens) + ' tok)'
            : '';
          const costEl = document.getElementById('cost-label');
          if (costEl) {
            costEl.innerText = (msg.cost || '< $0.001') + subagentCostExtra;
            costEl.title = baseCostText + subagentCostExtra;
          }

          const kpiCostVal = document.getElementById('kpi-cost-val');
          const kpiCostSub = document.getElementById('kpi-cost-sub');
          if (kpiCostVal) kpiCostVal.innerText = msg.cost || '< $0.001';
          if (kpiCostSub) kpiCostSub.innerText = (s.subagentsTotalTokens && s.subagentsTotalTokens > 0) ? ('子代理 +' + formatTokenCount(s.subagentsTotalTokens)) : '当前会话';

          const kpiSub = document.getElementById('kpi-subagent-sub');
          if (kpiSub) {
            const agTotal = s.totalAgentsCount || (s.agents && s.agents.length) || 0;
            kpiSub.innerText = agTotal > 0 ? ('协作代理 ×' + agTotal) : '主会话';
          }

          const statusBadge = document.getElementById('session-status-badge');
          const globalBadge = document.getElementById('global-status-pill');
          const liveDot = document.getElementById('monitor-live-dot');
          if (!s.isIdle) {
            if (statusBadge) { statusBadge.className = 'status-pill active'; statusBadge.innerText = '⚡ 活跃'; }
            if (globalBadge) { globalBadge.className = 'status-pill active'; globalBadge.innerText = '活跃'; }
            if (liveDot) liveDot.className = 'live-dot';
          } else {
            if (statusBadge) { statusBadge.className = 'status-pill idle'; statusBadge.innerText = '💤 闲置'; }
            if (globalBadge) { globalBadge.className = 'status-pill idle'; globalBadge.innerText = '闲置'; }
            if (liveDot) liveDot.className = 'live-dot idle';
          }

          const banner = document.getElementById('running-tool-banner');
          if (s.activeTools && s.activeTools.length > 0 && !s.isIdle) {
            const t = s.activeTools[0];
            document.getElementById('running-tool-name').innerText = t.name;
            document.getElementById('running-tool-target').innerText = t.target ? ' ' + t.target : '';
            const tStartMs = t.startTime ? new Date(t.startTime).getTime() : 0;
            const tDurSec = tStartMs > 0 ? Math.max(0, Math.floor((Date.now() - tStartMs) / 1000)) : (t.durationMs ? Math.round(t.durationMs / 1000) : 0);
            document.getElementById('running-tool-dur').innerText = tDurSec + 's';
            banner.style.display = 'flex';
          } else {
            banner.style.display = 'none';
          }

          const todosWrap = document.getElementById('todos-container');
          const todosList = document.getElementById('todos-list');
          const warnOnlyPlan = shouldWarnPlanWithoutChecklist(s);
          const todos = Array.isArray(s.todos) ? s.todos : [];
          const hasPendingCreates = Array.isArray(s.pendingTaskCreates) && s.pendingTaskCreates.length > 0;
          const hasTodoContent = todos.length > 0 || hasPendingCreates;
          if (hasTodoContent) {
            todosWrap.style.display = 'block';
            const done = todos.filter(x => x.status === 'completed').length;
            const inProg = todos.filter(x => x.status === 'in_progress').length;
            const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;
            const isAllCompleted = todos.length > 0 && done === todos.length;

            const counterEl = document.getElementById('todos-counter');
            const caret = document.getElementById('todos-caret');
            const clearBtn = document.getElementById('todos-clear-btn');
            const syncBtn = document.getElementById('todos-sync-btn');
            const activityEl = document.getElementById('todos-activity');

            if (clearBtn) {
              clearBtn.style.display = 'inline-block';
            }
            if (syncBtn) {
              syncBtn.style.display = s.taskSource === 'plan' || s.taskSource === 'markdown' ? 'inline-block' : 'none';
            }
            if (activityEl) {
              renderTodosActivity(activityEl, s);
              if (s.projectTodoPolicy && s.projectTodoPolicy.activity_separate_from_status === false) {
                activityEl.textContent = '';
                activityEl.style.display = 'none';
              }
            }
            updateTodosPlanWarn(s);

            if (counterEl) {
              if (isAllCompleted) {
                counterEl.className = 'status-pill idle';
                counterEl.innerHTML = '<span>✓ ' + done + '/' + todos.length + '</span><span class="todo-counter-detail">(已完成)</span>';
                counterEl.title = '✓ ' + done + '/' + todos.length + ' (已完成)';
              } else {
                counterEl.className = inProg > 0 ? 'status-pill active' : 'status-pill';
                const summaryText = done + '/' + todos.length;
                counterEl.innerHTML = '<span>' + summaryText + '</span><span class="todo-counter-detail">(' + pct + '%)</span>' + (inProg > 0 ? '<span class="todo-spinner" role="img" title="进行中" aria-label="进行中"></span>' : '');
                counterEl.title = summaryText + ' (' + pct + '%)' + (inProg > 0 ? ' · 进行中' : '');
              }
            }
            const progBar = document.getElementById('todos-progress-bar');
            if (progBar) progBar.style.width = pct + '%';

            if (isAllCompleted) {
              if (!userToggledTodos) {
                todosList.style.display = 'none';
                if (caret) caret.style.transform = 'rotate(-90deg)';
              } else {
                todosList.style.display = userManuallyOpenedTodos ? 'block' : 'none';
                if (caret) caret.style.transform = userManuallyOpenedTodos ? 'rotate(0deg)' : 'rotate(-90deg)';
              }
            } else {
              todosList.style.display = 'block';
              if (caret) caret.style.transform = 'rotate(0deg)';
            }

            renderTodosList(s);
          } else if (warnOnlyPlan) {
            todosWrap.style.display = 'block';
            if (todosList) todosList.innerHTML = '';
            const syncBtn = document.getElementById('todos-sync-btn');
            if (syncBtn) syncBtn.style.display = s.taskSource === 'plan' || s.taskSource === 'markdown' ? 'inline-block' : 'none';
            const clearBtn = document.getElementById('todos-clear-btn');
            if (clearBtn) clearBtn.style.display = 'none';
            const activityEl = document.getElementById('todos-activity');
            if (activityEl) { activityEl.textContent = ''; activityEl.style.display = 'none'; }
            const counterEl = document.getElementById('todos-counter');
            if (counterEl) { counterEl.className = 'status-pill'; counterEl.innerHTML = '0/0'; counterEl.title = '0/0'; }
            const progBar = document.getElementById('todos-progress-bar');
            if (progBar) progBar.style.width = '0%';
            updateTodosPlanWarn(s);
          } else {
            todosWrap.style.display = 'none';
            if (todosList) todosList.innerHTML = '';
            const activityEl = document.getElementById('todos-activity');
            if (activityEl) { activityEl.textContent = ''; activityEl.style.display = 'none'; }
            const warnEl = document.getElementById('todos-plan-warn');
            if (warnEl) { warnEl.textContent = ''; warnEl.style.display = 'none'; }
            userToggledTodos = false;
            userManuallyOpenedTodos = false;
          }

          const agentsWrap = document.getElementById('agents-container');
          const agentsList = document.getElementById('agents-list');
          if (s.agents && s.agents.length > 0) {
            agentsWrap.style.display = 'block';
            const runningCount = s.agents.filter(a => a.status === 'running').length;
            const counterEl = document.getElementById('agents-counter');
            const caret = document.getElementById('agents-caret');

            if (runningCount > 0) {
              if (counterEl) {
                counterEl.className = 'status-pill active';
                counterEl.innerText = runningCount + ' 运行中 · 共 ' + s.agents.length;
              }
              agentsList.style.display = 'flex';
              if (caret) caret.style.transform = 'rotate(0deg)';
            } else {
              if (counterEl) {
                counterEl.className = 'status-pill idle';
                counterEl.innerText = '✓ ' + s.agents.length + ' 个代理 (已完成)';
              }
              if (!userToggledAgents) {
                agentsList.style.display = 'none';
                if (caret) caret.style.transform = 'rotate(-90deg)';
              } else {
                agentsList.style.display = userManuallyOpened ? 'flex' : 'none';
                if (caret) caret.style.transform = userManuallyOpened ? 'rotate(0deg)' : 'rotate(-90deg)';
              }
            }

            agentsList.innerHTML = s.agents.map((a, idx) => {
              const isNested = (a.spawnDepth && a.spawnDepth > 1) || !!a.parentAgentId;
              const statusClass = a.status === 'completed' ? ' completed' : (a.status === 'running' ? ' running' : '');
              const cardClass = (isNested ? 'agent-item nested' : 'agent-item') + statusClass;
              const dotClass = a.status === 'running' ? 'agent-dot running' : (a.status === 'error' ? 'agent-dot error' : 'agent-dot completed');
              const nameText = a.name || (a.type ? '/' + a.type : '子代理 #' + (idx + 1));
              const nameDisplay = escapeHtml(nameText);
              const typeBadge = a.type && a.type !== 'fork' ? '<span class="agent-type-badge">' + escapeHtml(a.type) + '</span>' : '';

              const badges = [];
              if (a.durationMs) {
                badges.push('<span class="agent-meta-chip">⏱️ ' + formatDuration(a.durationMs, false) + '</span>');
              } else if (a.startTime) {
                const liveDur = Math.max(0, Date.now() - new Date(a.startTime).getTime());
                badges.push('<span class="agent-meta-chip">⏱️ ' + formatDuration(liveDur, false) + '</span>');
              }
              if (a.totalTokens) {
                badges.push('<span class="agent-meta-chip">🪙 ' + formatTokenCount(a.totalTokens) + '</span>');
              }
              if (a.toolsCount && a.toolsCount > 0) {
                badges.push('<span class="agent-meta-chip">🛠️ ' + a.toolsCount + '</span>');
              }
              if (a.worktreeBranch) {
                const branch = String(a.worktreeBranch);
                const shown = branch.length > 18 ? branch.slice(0, 17) + '…' : branch;
                badges.push('<span class="agent-meta-chip agent-meta-branch" title="Worktree: ' + escapeAttribute(branch) + '">🌿 ' + escapeHtml(shown) + '</span>');
              }

              const descHtml = a.description ? '<div class="agent-desc" title="' + escapeAttribute(a.description) + '">' + escapeHtml(a.description) + '</div>' : '';

              const agentKey = a.id || a.toolUseId || ('agent-' + idx);
              const agentDetailId = 'agent-detail-' + idx;
              const details = [];
              if (a.id) details.push('<div><strong>ID:</strong> ' + escapeHtml(a.id) + '</div>');
              if (a.model) details.push('<div><strong>模型:</strong> ' + escapeHtml(a.model) + '</div>');
              if (a.parentAgentId) details.push('<div><strong>父代理:</strong> ' + escapeHtml(a.parentAgentId) + '</div>');
              if (a.worktreePath) {
                details.push('<div><strong>工作区:</strong> ' + escapeHtml(a.worktreePath) + '</div>');
                details.push('<div class="agent-wt-actions"><button class="agent-wt-btn" data-action="openWorktree" data-worktree-path="' + escapeAttribute(a.worktreePath) + '">📂 Worktree</button></div>');
              }
              const isExpanded = expandedAgentKeys.has(agentKey);
              const detailContent = details.length > 0 ? '<div id="' + agentDetailId + '" class="agent-detail-body" style="display: ' + (isExpanded ? 'flex' : 'none') + ';">' + details.join('') + '</div>' : '';

              return '<div class="' + cardClass + '" onclick="toggleAgentDetail(\\'' + agentDetailId + '\\', \\'' + escapeAttribute(agentKey) + '\\', event)">' +
                '<div class="agent-item-header">' +
                  '<div class="agent-title-row">' +
                    '<span class="' + dotClass + '"></span>' +
                    '<span class="agent-name" title="' + escapeAttribute(nameText) + '">' + nameDisplay + '</span>' +
                    typeBadge +
                  '</div>' +
                  '<div class="agent-badges">' + badges.join('') + '</div>' +
                '</div>' +
                descHtml +
                detailContent +
              '</div>';
            }).join('');
          } else {
            if (agentsWrap) agentsWrap.style.display = 'none';
            if (agentsList) agentsList.innerHTML = '';
            userToggledAgents = false;
            userManuallyOpened = false;
          }
        } else {
          renderOutputSpeed(null);
          const heroSub = document.getElementById('hero-tokens-sub');
          if (heroSub) heroSub.innerText = '0 / 200k';
          const heroBadge = document.getElementById('hero-model-badge');
          if (heroBadge) heroBadge.innerText = '--';
          const todosWrap = document.getElementById('todos-container');
          if (todosWrap) todosWrap.style.display = 'none';
          const todosList = document.getElementById('todos-list');
          if (todosList) todosList.innerHTML = '';
          const counterEl = document.getElementById('todos-counter');
          if (counterEl) { counterEl.innerText = '0/0'; counterEl.className = 'status-pill'; counterEl.title = ''; }
          const progBar = document.getElementById('todos-progress-bar');
          if (progBar) progBar.style.width = '0%';
          userToggledTodos = false;
          userManuallyOpenedTodos = false;
          const agentsWrap = document.getElementById('agents-container');
          if (agentsWrap) agentsWrap.style.display = 'none';
          const agentsList = document.getElementById('agents-list');
          if (agentsList) agentsList.innerHTML = '';
          userToggledAgents = false;
          userManuallyOpened = false;
        }

        updateLiveSessionDuration();
        renderLoopBanner(s);

        if (msg.subscription && (msg.subscription.session || (msg.subscription.meters && msg.subscription.meters.length))) {
          const meter = msg.subscription.session || msg.subscription.meters[0];
          document.getElementById('sub-container').style.display = 'flex';
          const pct = Math.min(100, Math.round(meter.percentage || 0));
          document.getElementById('sub-fill').style.width = pct + '%';
          const label = meter.label || 'Quota';
          const reset = meter.resetsAt ? new Date(meter.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          document.getElementById('sub-reset').innerText = label + ' · ' + pct + '%' + (reset ? ' · ' + reset : '');
          const titleEl = document.getElementById('sub-title');
          if (titleEl) titleEl.textContent = '⏳ ' + label;
        } else if (msg.subscriptionError) {
          document.getElementById('sub-container').style.display = 'flex';
          document.getElementById('sub-fill').style.width = '0%';
          document.getElementById('sub-reset').innerText = msg.subscriptionError;
        }
        const metersEl = document.getElementById('sub-meters');
        if (metersEl) {
          const meters = (msg.subscription && msg.subscription.meters) ? msg.subscription.meters.slice(0, 4) : [];
          metersEl.innerHTML = meters.map(m => {
            const p = Math.min(100, Math.round(m.percentage || 0));
            return '<span>' + escapeHtml(m.label || m.key) + ': ' + p + '%</span>';
          }).join(' · ');
        }
        renderBackgroundJobs(s);
      }

      if (msg.type === 'loadConfig') {
        applyHubUiStrings(msg.ui);
        renderOutputSpeed(currentSession);
        renderTodoToolsPanel(msg);
        if (msg.statusBarConfig) {
          renderStatusBarSettings(msg.statusBarConfig);
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
        extData = {
          projectMemory: msg.projectMemory || null,
          plugins: Array.isArray(msg.plugins) ? msg.plugins : [],
          mcpServers: Array.isArray(msg.mcpServers) ? msg.mcpServers : [],
          customAgents: Array.isArray(msg.customAgents) ? msg.customAgents : [],
          skills: Array.isArray(msg.skills) ? msg.skills : []
        };
        renderExtensionsPanel();
        if (pendingScrollY !== null) requestAnimationFrame(restoreDashboardScroll);
      }
    });

    let scrollSaveTimer = null;
    window.addEventListener('scroll', () => {
      if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
      scrollSaveTimer = setTimeout(() => {
        pendingScrollY = null;
        saveUiState();
      }, 250);
    }, { passive: true });

    setInterval(() => {
      if (currentSession && (!currentSession.isIdle || (currentSession.activeTools && currentSession.activeTools.length > 0))) {
        updateLiveSessionDuration();
      }
      if (currentSession && currentSession.loopState && currentSession.loopState.active) {
        renderLoopBanner(currentSession);
      }
      const ownRunning = currentSession && currentSession.backgroundJobs && currentSession.backgroundJobs.some(function (job) { return job && job.status === 'running'; });
      if (ownRunning) renderBackgroundJobs(currentSession);
    }, 1000);

    applyToolbarI18n();
    sendMessage('ready');
  `;
}
