import test from 'node:test';
import assert from 'node:assert/strict';
import { Script, runInNewContext } from 'node:vm';
import { getWebviewContent } from '../src/webviewHtml.js';

test('session search count and empty state reflect the selected filter', () => {
  const html = getWebviewContent();
  const start = html.indexOf('    function renderSessionsList()');
  const end = html.indexOf('      const startIndex =', start);
  assert.ok(start >= 0 && end > start);
  const source = html.slice(start, end) + '\n    }';
  const nodes: Record<string, { innerText: string; innerHTML: string; title: string; disabled: boolean }> = {};
  for (const id of ['session-cards-list', 'sessions-total-badge', 'pagination-info', 'btn-prev-page', 'btn-next-page']) {
    nodes[id] = { innerText: '', innerHTML: '', title: '', disabled: false };
  }
  const context = {
    document: { getElementById: (id: string) => nodes[id] },
    allSessions: [
      { isCurrentWorkspace: true, pinned: true, isIdle: false, sessionTitle: 'Alpha' },
      { isCurrentWorkspace: true, pinned: false, isIdle: true, sessionTitle: 'Beta' },
      { isCurrentWorkspace: false, pinned: false, isIdle: true, sessionTitle: 'Gamma' },
    ],
    currentFilter: 'pinned', searchKeyword: 'missing', pageSize: 8, currentPage: 1,
    openSessionMenuId: null, closeSessionMenu: () => {},
  };
  runInNewContext(source + '\nrenderSessionsList();', context);
  assert.equal(nodes['sessions-total-badge'].innerText, '0 / 1 个会话');
  assert.match(nodes['session-cards-list'].innerHTML, /当前筛选中没有匹配的会话/);
  assert.match(nodes['session-cards-list'].innerHTML, /clearSessionSearch/);
  context.currentFilter = 'workspace';
  runInNewContext(source + '\nrenderSessionsList();', context);
  assert.equal(nodes['sessions-total-badge'].innerText, '0 / 2 个会话');
  assert.doesNotMatch(nodes['session-cards-list'].innerHTML, /当前工作区暂无会话/);
  context.searchKeyword = '';
  context.currentFilter = 'pinned';
  // 避免进入卡片渲染，单独检查有结果时的计数。
  runInNewContext(source.replace("      if (filtered.length === 0) {", "      if (true) {") + '\nrenderSessionsList();', context);
  assert.equal(nodes['sessions-total-badge'].innerText, '1 个会话');
});

test('session cards keep view, resume, and more as the only persistent actions', () => {
  const html = getWebviewContent();

  const persistentButtons = html.match(/class="session-act-btn[^"]*"/g) || [];
  assert.equal(persistentButtons.length, 3);
  assert.ok(persistentButtons.some(c => c.includes('session-act-btn focus')));
  assert.ok(persistentButtons.some(c => c.includes('session-act-btn resume')));
  assert.ok(persistentButtons.some(c => c.includes('session-act-btn more')));

  assert.match(html, /data-action="focusSession"[^>]*title="查看此会话"><span class="btn-icon">👀<\/span><span class="btn-text">查看<\/span>/);
  assert.match(html, /data-action="resumeSession"[^>]*><span class="btn-icon">▶️<\/span><span class="btn-text">恢复<\/span>/);
  assert.match(html, /data-action="toggleSessionMenu"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"[^>]*><span class="btn-icon">⋯<\/span><span class="btn-text">更多<\/span>/);

  // Secondary session operations no longer render as persistent action-row buttons.
  assert.doesNotMatch(html, /class="session-act-btn (rename|fork|delete)"/);
  assert.ok(!html.includes('<span class="btn-text">聚焦</span>'));
});

test('session more menu keeps every existing operation and separates delete last', () => {
  const html = getWebviewContent();

  for (const action of [
    'renameSession',
    'togglePinSession',
    'exportSession',
    'compareFork',
    'editSessionTags',
    'showTimeline',
    'forkSession',
    'openSessionFile',
    'deleteSession'
  ]) {
    assert.ok(html.includes('data-action="' + action + '"'), 'missing menu action: ' + action);
  }

  // Compare stays conditional on the presence of a parent session.
  assert.match(html, /const compareMenuItem = s\.parentSessionId[\s\S]*?data-action="compareFork"/);

  const menuStart = html.indexOf('class="session-more-menu"');
  const menuEnd = html.indexOf("'</div>' +\n          '</div>';", menuStart);
  assert.ok(menuStart > 0 && menuEnd > menuStart);
  const menu = html.slice(menuStart, menuEnd);
  const separatorIndex = menu.indexOf('session-menu-sep');
  const deleteIndex = menu.indexOf('data-action="deleteSession"');
  assert.ok(separatorIndex > 0, 'menu should contain a separator before dangerous actions');
  assert.ok(deleteIndex > separatorIndex, 'delete must be the final, separated item');
  assert.ok(menu.indexOf('data-action="deleteSession"') === menu.lastIndexOf('data-action="deleteSession"'));
});

test('session more menu is keyboard accessible and closes on Escape with focus return', () => {
  const html = getWebviewContent();
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);

  assert.ok(html.includes('role="menu"'));
  assert.ok(html.includes('role="menuitem"'));
  assert.ok(html.includes('role="separator"'));
  assert.ok(html.includes('aria-label="会话更多操作"'));
  assert.ok(html.includes('aria-expanded="false"'));

  assert.ok(html.includes('function toggleSessionMenu'));
  assert.ok(html.includes('function closeSessionMenu'));
  assert.ok(html.includes('function setSessionMenuOpen'));
  assert.ok(html.includes("event.key === 'Escape'"));
  assert.ok(html.includes("event.key === 'ArrowDown'"));
  assert.ok(html.includes("event.key === 'ArrowUp'"));
  assert.ok(html.includes("event.key === 'Home'"));
  assert.ok(html.includes("event.key === 'End'"));
  assert.ok(html.includes('closeSessionMenu(true)'));
  assert.ok(html.includes('triggerToFocus.focus()'));
  assert.ok(html.includes('items[0].focus()'));

  assert.doesNotThrow(() => new Script(script));
});

test('session more menu fits a narrow sidebar and keeps escaping semantics', () => {
  const html = getWebviewContent();

  assert.match(html, /\.session-more-menu\s*\{[^}]*position: absolute;[^}]*max-width: min\(220px, calc\(100vw - 24px\)\);/);
  assert.match(html, /\.session-more-menu\.drop-up\s*\{[^}]*bottom: calc\(100% \+ 4px\);/);
  assert.match(html, /@container hub \(max-width: 290px\)\s*\{[\s\S]*?\.session-more-menu\s*\{[\s\S]*?max-width: calc\(100vw - 16px\);/);
  assert.ok(html.includes('menu.classList.add(\'drop-up\')'));

  // Dynamic identifiers still flow through escapeAttribute().
  assert.match(html, /data-session-id="' \+ sessionIdAttr \+ '"/);
  assert.match(html, /data-file-path="' \+ sessionFileAttr \+ '"/);
  assert.match(html, /const sessionIdAttr = escapeAttribute\(s\.sessionId \|\| ''\)/);
  assert.match(html, /const sessionFileAttr = escapeAttribute\(s\.sessionFile \|\| ''\)/);

  // Existing postMessage contracts are unchanged by the menu refactor.
  assert.ok(html.includes("sendMessage(action, { sessionId: actionElement.getAttribute('data-session-id') || '' });"));
  assert.ok(html.includes("sendMessage(action, { filePath: actionElement.getAttribute('data-file-path') || '' });"));
});

test('session cards and status pills use VS Code theme tokens in light and high contrast themes', () => {
  const html = getWebviewContent();
  const card = html.match(/\.session-card\s*\{([^}]*)\}/)?.[1] || '';
  const hovered = html.match(/\.session-card:hover\s*\{([^}]*)\}/)?.[1] || '';
  const focused = html.match(/\.session-card.focused\s*\{([^}]*)\}/)?.[1] || '';
  const pill = html.match(/(?:^|\n)\s*\.status-pill\s*\{([^}]*)\}/)?.[1] || '';
  const active = html.match(/\.status-pill.active\s*\{([^}]*)\}/)?.[1] || '';
  const banner = html.match(/\.running-bar\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(card, /background:\s*var\(--card-bg\)/);
  assert.match(card, /border:\s*1px solid var\(--vscode-contrastBorder/);
  assert.match(card, /overflow:\s*visible/);
  assert.match(hovered, /--vscode-list-hoverBackground/);
  assert.match(focused, /--vscode-list-inactiveSelectionBackground/);
  assert.match(pill, /--vscode-badge-background/);
  assert.match(active, /--vscode-list-inactiveSelectionForeground/);
  assert.match(banner, /--vscode-list-hoverBackground/);
});

test('session card gives the title priority and wraps badges instead of squeezing it', () => {
  const html = getWebviewContent();

  const titleRule = html.match(/\.session-title-text\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(titleRule, /flex:\s*1 1 12em/);
  assert.match(titleRule, /min-width:\s*0/);
  assert.match(titleRule, /font-weight:\s*600/);
  assert.match(titleRule, /-webkit-line-clamp:\s*2/);
  assert.doesNotMatch(titleRule, /white-space:\s*nowrap/);

  const headerRule = html.match(/\.session-header-row\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(headerRule, /flex-wrap:\s*wrap/);

  const badgesRule = html.match(/\.session-header-badges\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(badgesRule, /flex:\s*0 0 auto/);
  assert.match(badgesRule, /flex-wrap:\s*wrap/);
  assert.match(badgesRule, /max-width:\s*100%/);

  // The session title is the primary line; the Fork badge moved into the badge rail.
  assert.match(html, /'<div class="session-title-text" title="' \+ titleAttr \+ '">' \+ titleDisplay \+ '<\/div>'/);
  assert.match(html, /'<div class="session-header-badges">' \+ focusedTag \+ activeTag \+ pinnedTag \+ loopBadge \+ bgBadge \+ agentsBadge \+ forkBadge \+ tagsBadge \+ '<\/div>'/);
  assert.doesNotMatch(html, /session-title-text[^\n]*forkBadge/);
});

test('session card truncates long tags, model and branch while keeping full values', () => {
  const html = getWebviewContent();

  const tagRule = html.match(/\.session-tag-badge\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(tagRule, /min-width:\s*0/);
  assert.match(tagRule, /max-width:\s*100%/);
  assert.match(tagRule, /overflow:\s*hidden/);
  assert.match(tagRule, /text-overflow:\s*ellipsis/);

  for (const selector of ['session-project-name', 'session-model-text', 'session-branch-text']) {
    const rule = html.match(new RegExp('\\.' + selector + '\\s*\\{([^}]*)\\}'))?.[1] || '';
    assert.match(rule, /min-width:\s*0/, selector + ' should allow flex shrinking');
    assert.match(rule, /overflow:\s*hidden/, selector + ' should clip overflow');
    assert.match(rule, /text-overflow:\s*ellipsis/, selector + ' should ellipsize');
  }

  // Full values remain reachable through title attributes, all still escaped.
  assert.match(html, /class="session-tag-badge" title="' \+ escapeAttribute\(s\.tags\.join\(', '\)\)/);
  assert.match(html, /const projectNameAttr = escapeAttribute\(projectLabel\)/);
  assert.match(html, /const modelAttr = escapeAttribute\(s\.model \|\| 'Claude'\)/);
  assert.match(html, /const branchAttr = escapeAttribute\(s\.gitBranch \|\| ''\)/);
  assert.match(html, /class="session-project-name" title="' \+ projectNameAttr \+ '">' \+ projectNameStr/);
  assert.match(html, /class="session-model-text" title="' \+ modelAttr \+ '">' \+ modelDisplay/);
  assert.match(html, /class="session-branch-text" title="' \+ branchAttr \+ '">' \+ branchStr/);
});

test('session card narrow layout keeps the title readable and details wrapping', () => {
  const html = getWebviewContent();

  assert.match(html, /@container hub \(max-width: 290px\)\s*\{[\s\S]*?\.session-title-text\s*\{[^}]*font-size:\s*11\.5px;[\s\S]*?\.session-model-text\s*\{[^}]*max-width:\s*55%;/);
  assert.match(html, /@container hub \(max-width: 230px\)\s*\{[\s\S]*?\.session-title-text\s*\{[^}]*font-size:\s*11px;[\s\S]*?\.session-model-text\s*\{[^}]*max-width:\s*50%;/);
  assert.match(html, /@supports not \(container-type: inline-size\)\s*\{[\s\S]*?@media \(max-width: 306px\)\s*\{[\s\S]*?\.session-title-text\s*\{[^}]*font-size:\s*11\.5px;/);
  assert.match(html, /@supports not \(container-type: inline-size\)\s*\{[\s\S]*?@media \(max-width: 246px\)\s*\{[\s\S]*?\.session-title-text\s*\{[^}]*font-size:\s*11px;/);
});
