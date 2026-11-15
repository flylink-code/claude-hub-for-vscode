import test from 'node:test';
import assert from 'node:assert/strict';
import { getWebviewContent } from '../src/webviewHtml.js';

test('sticky header uses 4 tabs and crisp SVG-only header actions', () => {
  const sidebarHtml = getWebviewContent({ isSidebar: true });
  assert.ok(sidebarHtml.includes('class="hub-header"'));
  assert.ok(sidebarHtml.includes('class="tabs"'));
  assert.ok(sidebarHtml.includes('id="tab-btn-monitor"'));
  assert.ok(sidebarHtml.includes('id="tab-btn-sessions"'));
  assert.ok(sidebarHtml.includes('id="tab-btn-extensions"'));
  assert.ok(sidebarHtml.includes('id="tab-btn-settings"'));
  assert.ok(sidebarHtml.includes('id="hdr-refresh-btn"'));
  assert.ok(sidebarHtml.includes('id="hdr-open-tab-btn"'));
  assert.ok(sidebarHtml.includes('function switchMainTab'));
  assert.ok(sidebarHtml.includes('function applyToolbarI18n'));

  const actionsStart = sidebarHtml.indexOf('<div class="head-actions"');
  const actionsEnd = sidebarHtml.indexOf('</div>', actionsStart);
  assert.ok(actionsStart > 0 && actionsEnd > actionsStart);
  const toolbar = sidebarHtml.slice(actionsStart, actionsEnd);
  assert.equal((toolbar.match(/class="icon-btn"/g) || []).length, 2);
  assert.equal((toolbar.match(/<svg class="ic"/g) || []).length, 2);

  // Editor tab host hides the "open in editor tab" button and omits sidebar-narrow body class
  const tabHtml = getWebviewContent({ isSidebar: false });
  assert.match(tabHtml, /<body class="">/);
  assert.match(tabHtml, /id="hdr-open-tab-btn"[^>]*style="display: none;"/);
});

test('dashboard uses theme tokens, accessible tabs, and switches', () => {
  const html = getWebviewContent();
  assert.match(html, /--accent:\s*var\(--vscode-focusBorder/);
  assert.match(html, /--hover:\s*var\(--vscode-list-hoverBackground/);
  assert.match(html, /--hub-focus:\s*var\(--accent\)/);
  assert.match(html, /button:focus-visible/);
  assert.match(html, /\[role="tab"\]:focus-visible/);
  assert.match(html, /\[role="switch"\]:focus-visible/);
  assert.equal((html.match(/<button[^>]+role="tab"/g) || []).length, 4);
  assert.equal((html.match(/<main[^>]+role="tabpanel"/g) || []).length, 4);
});

test('secondary actions are placed contextually in Monitor and Sessions tabs', () => {
  const html = getWebviewContent();
  const monitorStart = html.indexOf('id="view-monitor"');
  const sessionsStart = html.indexOf('id="view-sessions"');
  const extensionsStart = html.indexOf('id="view-extensions"');
  assert.ok(monitorStart > 0 && sessionsStart > monitorStart && extensionsStart > sessionsStart);

  const monitorSlice = html.slice(monitorStart, sessionsStart);
  assert.ok(monitorSlice.includes('id="monitor-scope-ws"'));
  assert.ok(monitorSlice.includes('id="monitor-scope-all"'));
  assert.ok(monitorSlice.includes('data-action="slashCommand"'));
  assert.ok(monitorSlice.includes('data-action="openBackgroundTasks"'));
  assert.ok(monitorSlice.includes('data-action="workspaceCostReport"'));

  const sessionsSlice = html.slice(sessionsStart, extensionsStart);
  assert.ok(sessionsSlice.includes('data-action="searchTranscript"'));
  assert.ok(sessionsSlice.includes('data-action="startWorktreeSession"'));
  assert.ok(sessionsSlice.includes('id="sessions-split"'));
  assert.ok(sessionsSlice.includes('id="session-reader"'));
});

test('first-screen monitor facts wrap instead of clipping model, branch, and duration', () => {
  const html = getWebviewContent();
  assert.match(html, /\.hud-info-row\s*\{[^}]*display:\s*grid/);
  assert.match(html, /\.hud-info-row\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(html, /\.hud-fact-value\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(html, /\.hud-fact-model\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
  assert.match(html, /class="hud-fact hud-fact-model"[^>]*>[\s\S]*?id="model-tag"/);
  for (const id of ['model-tag', 'branch-tag', 'cost-label', 'session-dur-label']) {
    assert.ok(html.includes('id="' + id + '" class="hud-fact-value"'), 'missing monitor fact: ' + id);
  }
  assert.match(html, /durEl\.innerText = turnText \+ ' \/ 总 ' \+ totalText/);
});

test('search input and task cards use the host theme instead of dark-only fills', () => {
  const html = getWebviewContent();
  const rule = (selector: string) => html.match(new RegExp('\\.' + selector.replaceAll('.', '\\.') + '\\s*\\{([^}]*)\\}'))?.[1] || '';
  assert.match(rule('search-box'), /background:\s*var\(--vscode-input-background/);
  assert.match(rule('search-box'), /color:\s*var\(--vscode-input-foreground/);
  assert.match(rule('todo-item-card'), /background:\s*var\(--vscode-editor-background/);
  assert.match(rule('todo-item-card'), /border:\s*1px solid var\(--vscode-contrastBorder/);
  assert.match(rule('todo-item-card.in_progress'), /background:\s*var\(--vscode-list-inactiveSelectionBackground/);
  assert.match(rule('todo-status-chip.in_progress'), /color:\s*var\(--vscode-list-inactiveSelectionForeground/);
  assert.match(rule('todos-mode-chip.task'), /background:\s*var\(--vscode-button-background/);
});

test('hero, kpi, session cards, and running banner clip background to padding box', () => {
  const html = getWebviewContent();
  const rule = (selector: string) =>
    html.match(new RegExp('\\.' + selector.replaceAll('.', '\\.') + '\\s*\\{([^}]*)\\}'))?.[1] || '';
  for (const selector of ['hero', 'kpi', 'session-card', 'running-bar']) {
    assert.match(rule(selector), /background-clip:\s*padding-box/, selector + ' should clip its background to the padding box');
  }
  assert.match(rule('session-card'), /transition:\s*background-color[^;]*border-color/);
});

test('token progress fill keeps the theme color and has no inline background override', () => {
  const html = getWebviewContent();
  const tokenFillTag = html.match(/<div id="token-fill"[^>]*>/)?.[0] || '';
  assert.ok(tokenFillTag);
  assert.ok(!/background/.test(tokenFillTag), 'token-fill must not set an inline background');
  assert.match(html, /\.progress-bar-fill\s*\{[^}]*background-color:\s*var\(--vscode-textLink-foreground/);
  assert.ok(html.includes("if (fillEl) fillEl.style.width = Math.min(pct, 100) + '%'"));
  assert.ok(!html.includes("token-fill').style.background"));
  assert.ok(html.includes("tokenBar.setAttribute('aria-valuenow'"));
});
