import test from 'node:test';
import assert from 'node:assert/strict';
import { getWebviewContent } from '../src/webviewHtml.js';

test('top-actions icon toolbar uses equal icon/label slots and narrow hide rule', () => {
  const html = getWebviewContent();
  assert.ok(html.includes('class="top-actions"'));
  assert.ok(html.includes('icon-btn-icon'));
  assert.ok(html.includes('icon-btn-text'));
  assert.ok(html.includes('id="top-filter-btn"'));
  assert.ok(html.includes('data-i18n-title="tbRefresh"'));
  assert.ok(html.includes('.top-actions .icon-btn-text'));
  assert.ok(html.includes('min-width: 26px'));
  assert.ok(html.includes('function setIconBtnLabel'));
  assert.ok(html.includes('function applyToolbarI18n'));
  // no legacy plain text-only refresh chip
  assert.ok(!html.includes(">🔄 刷新</button>"));
  // filter is icon-only (no short WS/工作区 label) with soft active (no accent border)
  assert.ok(html.includes("#top-filter-btn .icon-btn-text"));
  assert.ok(html.includes("setIconBtnLabel(btn, '📁', '')"));
  assert.ok(html.includes("setIconBtnLabel(btn, '🌐', '')"));
  assert.ok(html.includes("border-color: transparent"));
  assert.ok(!html.includes('data-role="label">过滤</span>'));
});

test('dashboard uses theme tokens and accessible accordion headers', () => {
  const html = getWebviewContent();
  assert.match(html, /--hub-focus:\s*var\(--vscode-focusBorder/);
  assert.match(html, /--hub-hover:\s*var\(--vscode-list-hoverBackground/);
  assert.match(html, /button:focus-visible/);
  assert.equal((html.match(/class="section-header" role="button" tabindex="0"/g) || []).length, 4);
  assert.match(html, /header\.setAttribute\('aria-expanded'/);
  assert.match(html, /event\.key === 'Enter' \|\| event\.key === ' '/);
});

test('top bar is unified into one theme header with icon-only actions', () => {
  const html = getWebviewContent();
  assert.match(html, /\.top-bar\s*\{[^}]*background:\s*var\(--card-bg\)/);
  assert.match(html, /\.top-bar\s*\{[^}]*border:\s*1px solid var\(--card-border\)/);
  assert.ok(html.includes('class="top-brand-mark"'));
  assert.ok(html.includes('class="top-brand-name"'));

  const start = html.indexOf('<div class="top-actions"');
  const end = html.indexOf('</div>', start);
  assert.ok(start > 0 && end > start);
  const toolbar = html.slice(start, end);
  assert.equal((toolbar.match(/class="icon-btn(?: active)?"/g) || []).length, 7);
  assert.equal((toolbar.match(/class="icon-btn-icon"/g) || []).length, 7);
  assert.equal((toolbar.match(/data-i18n-title=/g) || []).length, 7);
  // Every action keeps an empty label slot so the rail stays visually uniform.
  assert.doesNotMatch(toolbar, /data-role="label">[^<]+</);
});

test('section titles drop redundant English subtitles', () => {
  const html = getWebviewContent();
  assert.ok(html.includes('🕒 会话历史'));
  assert.ok(html.includes('🧩 扩展与记忆'));
  assert.ok(html.includes('🤖 协作代理拓扑'));
  assert.doesNotMatch(
    html,
    /\(Session Manager\)|\(Agent Map\)|\(Memory · Plugins · MCP · Skills\)|\(Memory\)|\(Plugins\)|\(Agents\)|\(Skills\)/
  );
});

test('first-screen monitor facts wrap instead of clipping model, branch, and duration', () => {
  const html = getWebviewContent();
  assert.match(html, /\.hud-info-row\s*\{[^}]*display:\s*grid/);
  assert.match(html, /\.hud-info-row\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(html, /\.hud-fact-value\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(html, /\.hud-fact-model\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
  assert.match(html, /class="hud-fact hud-fact-model"[^>]*>[\s\S]*?id="model-tag"/);
  assert.ok(!/\.hud-info-row > span\s*\{[^}]*text-overflow:\s*ellipsis/.test(html));
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

test('section headers inherit the outer corner radius so focus rings stay closed', () => {
  const html = getWebviewContent();
  const rule = (selector: string) =>
    html.match(new RegExp('\\.' + selector.replaceAll('.', '\\.') + '\\s*\\{([^}]*)\\}'))?.[1] || '';
  // 5px = 6px 外圆角 - 1px 边框，避免方角背景盖住外层边框圆角
  assert.match(rule('section-header'), /border-radius:\s*5px 5px 0 0/);
  assert.match(rule('section-wrap.collapsed .section-header'), /border-radius:\s*5px/);
  for (const selector of ['section-wrap', 'session-card', 'metric-bubble', 'running-bar']) {
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
  assert.ok(html.includes("document.getElementById('token-fill').style.width = Math.min(pct, 100) + '%'"));
  assert.ok(!html.includes("token-fill').style.background"));
  assert.ok(html.includes("tokenBar.setAttribute('aria-valuenow'"));
});
