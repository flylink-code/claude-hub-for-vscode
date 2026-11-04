import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { getWebviewContent } from '../src/webviewHtml.js';

test('dashboard restores saved panels and local filters across a rebuilt webview', () => {
  const html = getWebviewContent();
  const start = html.indexOf('    // 同步保存至 Webview');
  const end = html.indexOf('    // 保存折叠状态', start);
  assert.ok(start > 0 && end > start);
  const source = html.slice(start, end);
  const sections = ['sec-monitor', 'sec-sessions', 'sec-extensions', 'sec-advanced'];
  const nodes: Record<string, any> = {};
  for (const id of [...sections, 'session-search', 'ext-search-input', 'ext-search-clear', 'chip-all', 'chip-ws', 'chip-pinned', 'chip-active']) {
    const classes = new Set(id === 'chip-all' ? ['active'] : []);
    nodes[id] = {
      value: '', style: {},
      classList: {
        contains: (name: string) => classes.has(name),
        toggle: (name: string, force?: boolean) => (force ?? !classes.has(name)) ? classes.add(name) : classes.delete(name),
        remove: (name: string) => classes.delete(name),
        add: (name: string) => classes.add(name),
      },
    };
  }
  const sent: any[] = [];
  const state = {
    sections: { 'sec-monitor': true, 'sec-sessions': false, 'sec-extensions': false, 'sec-advanced': true },
    sessionFilter: 'pinned', searchKeyword: 'alpha', extActiveTab: 'skills', extSkillScope: 'plugin',
    extSearchQuery: 'memory', extGroupManualState: { mcp: true }, extShowAllPlugins: true, extShowAllLocalSkills: false,
  };
  const context = {
    vscode: { getState: () => ({}), setState: (value: unknown) => sent.push(value) },
    window: { scrollY: 120, scrollTo: () => {} },
    setTimeout: (callback: () => void) => { callback(); return 1; },
    clearTimeout: () => {},
    requestAnimationFrame: (callback: () => void) => callback(),
    document: {
      getElementById: (id: string) => nodes[id],
      querySelectorAll: () => sections.slice(0, 0).concat(['chip-all', 'chip-ws', 'chip-pinned', 'chip-active']).map(id => nodes[id]),
    },
    localStorage: { getItem: () => null },
    currentFilter: 'all', searchKeyword: '', extActiveTab: 'all', extSkillScope: 'all', extSearchQuery: '',
    extGroupManualState: {}, extShowAllPlugins: false, extShowAllLocalSkills: false,
    syncSectionState: () => {}, renderExtensionsPanel: () => {}, renderSessionsList: () => {},
    sendMessage: (type: string, payload: unknown) => sent.push({ type, payload }),
  };
  runInNewContext(source + '\nrestoreUiState(input); saveUiState(); result = { currentFilter, searchKeyword, extActiveTab, extSkillScope, extSearchQuery, extGroupManualState, extShowAllPlugins };',
    { ...context, input: state, result: null });
  const saved = sent[0];
  assert.equal(nodes['sec-monitor'].classList.contains('collapsed'), true);
  assert.equal(nodes['sec-advanced'].classList.contains('collapsed'), true);
  assert.equal(nodes['chip-pinned'].classList.contains('active'), true);
  assert.equal(nodes['session-search'].value, 'alpha');
  assert.equal(nodes['ext-search-input'].value, 'memory');
  assert.equal(saved.sessionFilter, 'pinned');
  assert.equal(saved.extActiveTab, 'skills');
  assert.equal(saved.extSkillScope, 'plugin');
  assert.equal(saved.extGroupManualState.mcp, true);
  assert.equal(saved.scrollY, 120);
  assert.equal(sent[1].type, 'saveUiState');
});

test('initial backend workspace mode does not replace restored pinned or active filter', () => {
  const html = getWebviewContent();
  assert.match(html, /if \(modeChanged && \(initialFilterModeReceived \|\| currentFilter === 'all' \|\| currentFilter === 'workspace'\)\)/);
  assert.match(html, /if \(!uiStateRestored\) restoreUiState\(\);/);
  assert.match(html, /if \(msg.type === 'restoreUiState'\) \{\s*restoreUiState\(msg.state\);/);
  assert.match(html, /if \(pendingScrollY !== null\) requestAnimationFrame\(restoreDashboardScroll\)/);
  assert.match(html, /window\.addEventListener\('scroll',/);
});
