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
