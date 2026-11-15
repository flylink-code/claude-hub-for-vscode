import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = path.resolve(import.meta.dirname, '..');
const webviewModPath = path.join(rootDir, 'out', 'webviewHtml.js');

if (!fs.existsSync(webviewModPath)) {
  console.error('Missing compiled out/webviewHtml.js. Run "npm run compile" first.');
  process.exit(1);
}

const { getWebviewContent } = await import(pathToFileURL(webviewModPath).href);

const previewDir = path.join(rootDir, '.preview');
fs.mkdirSync(previewDir, { recursive: true });

const mockBootstrapScript = `
<script>
(function () {
  window.acquireVsCodeApi = function () {
    return {
      getState: function () { return {}; },
      setState: function () {},
      postMessage: function (msg) { console.log('[preview postMessage]', msg); }
    };
  };
})();
</script>
`;

const mockDispatchScript = `
<script>
window.addEventListener('load', function () {
  const now = Date.now();
  const sampleSession = {
    sessionId: 'sess-preview-01',
    projectName: 'claude-hub-for-vscode',
    projectPath: 'e:/workspace/claude-hub-for-vscode',
    sessionFile: '~/.claude/projects/claude-hub/sess-preview-01.jsonl',
    sessionTitle: 'v0.3.0 UI Redesign & Status Bar Customizer',
    model: 'claude-opus-5-5',
    modelDisplay: 'Opus 5.5 · high',
    contextLimit: 200000,
    gitBranch: 'feat/v0.3-ui-redesign',
    isIdle: false,
    isCurrentWorkspace: true,
    durationMs: 745000,
    totalSpanMs: 1850000,
    lastUpdated: new Date(now - 30000).toISOString(),
    tokenUsage: {
      inputTokens: 14200,
      outputTokens: 3800,
      cacheCreationTokens: 2100,
      cacheReadTokens: 64100,
      totalTokens: 84200,
      percentage: 42
    },
    outputSpeed: {
      tokensPerSecond: 58.4,
      model: 'Opus 5.5',
      measuredAt: now - 5000,
      source: 'statusLine'
    },
    outputSpeedState: 'available',
    outputSpeedIntegrationEnabled: true,
    activeTools: [{ id: 't1', name: 'Edit', target: 'src/webview/layout.ts', startTime: new Date(now - 4000).toISOString() }],
    todos: [
      { id: '1', content: 'Split webviewHtml into modular layout & styles', status: 'completed' },
      { id: '2', content: 'Wire dual-host sidebar & editor tab', status: 'in_progress', activeForm: 'Testing Master-Detail reader' },
      { id: '3', content: 'Verify unit tests & VSIX packaging', status: 'pending' }
    ],
    taskSource: 'tasks',
    todoMode: 'task',
    agents: [
      { id: 'ag1', type: 'code-reviewer', name: 'UI Reviewer', status: 'running', startTime: new Date(now - 12000).toISOString(), totalTokens: 4200, toolsCount: 3, worktreeBranch: 'wt/very-long-worktree-branch-name-that-used-to-overflow-sidebar' },
      { id: 'ag2', type: 'Explore', name: 'Layout Explorer', status: 'completed', spawnDepth: 2, parentAgentId: 'ag1', durationMs: 6500, totalTokens: 1900, toolsCount: 5, description: 'Checked responsive narrow rules across sidebar breakpoints.' }
    ],
    backgroundJobs: [
      { id: 'bg1', kind: 'shell', label: 'npm run watch', status: 'running', startTime: now - 45000 }
    ]
  };

  window.postMessage({
    type: 'updateSession',
    session: sampleSession,
    allSessions: [
      { ...sampleSession, pinned: true, lastUpdated: now - 30000, agentsCount: 2 },
      { sessionId: 'sess-preview-02', projectName: 'api-gateway', sessionTitle: 'Fix token streaming backpressure', model: 'Sonnet 5.5', gitBranch: 'fix/stream', isIdle: true, isCurrentWorkspace: false, lastUpdated: now - 3600000 * 3, tokenUsage: { totalTokens: 32000, percentage: 16 }, durationMs: 420000 }
    ],
    focusedSessionId: 'sess-preview-01',
    filterMode: 'all',
    cost: '$0.18',
    subscription: {
      session: { key: '5h', label: '5h', percentage: 24, resetsAt: new Date(now + 7200000).toISOString() },
      meters: [{ key: '5h', label: '5h', percentage: 24 }, { key: '7d', label: '7d', percentage: 11 }]
    },
    ui: {
      tabMonitor: '监控',
      tabSessions: '会话',
      tabExtensions: '扩展',
      tabSettings: '设置',
      scopeWindow: '本窗口',
      scopeAll: '全部',
      hubTodosTitle: '会话任务',
      chipPending: '待办',
      chipActive: '进行中',
      chipDone: '已完成',
      modeTask: 'Task',
      sourceTasks: 'Task 工具',
      pickList: '选择列表',
      speedLabel: '最近响应平均速率',
      speedSourceStatusLine: '终端状态栏采样',
      speedSourceTranscript: '会话记录估算',
    }
  }, '*');

  window.postMessage({
    type: 'loadConfig',
    todoToolsEnabledSetting: true,
    taskIntegration: [{ envEnabled: true, effectiveEnabled: true, observed: true, hooksConfigured: false }],
    projectDocs: { hasAgentsMd: true, hasClaudeMd: false },
    statusBarConfig: {
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
      tooltipSections: { context: true, speed: true, modelBranch: true, activityDur: true, tokens: true, todos: true, agents: true, quota: true, actions: true }
    }
  }, '*');

  window.postMessage({
    type: 'loadExtensions',
    projectMemory: { hasIndex: true, entries: [{ name: 'v0.3-ui-redesign', type: 'project', description: 'Modular 4-tab Webview & dual statusBar styles', filePath: 'memory/v0.3.md' }] },
    mcpServers: [{ name: 'github', isEnabled: true, command: 'npx @modelcontextprotocol/server-github' }],
    plugins: [{ id: 'superpowers@local', name: 'superpowers', marketplace: 'local', version: '1.0.0', enabled: true, skillsCount: 4 }],
    customAgents: [{ name: 'code-reviewer', scope: 'workspace', model: 'sonnet', description: 'Review TypeScript diffs' }],
    skills: [{ name: 'brainstorming', scope: 'plugin', pluginId: 'superpowers@local', description: 'Design before implementation' }]
  }, '*');
});
</script>
`;

function injectPreview(html, isSidebar) {
  const withMockApi = html.replace('<script>', mockBootstrapScript + '\n  <script>');
  const withDispatch = withMockApi.replace('</body>', mockDispatchScript + '\n</body>');
  if (!isSidebar) return withDispatch;
  return withDispatch.replace(
    /<body([^>]*)>/,
    '<body$1 style="max-width:340px;margin:0 auto;border-left:1px solid #3c3c3c;border-right:1px solid #3c3c3c;">',
  );
}

const sidebarHtml = injectPreview(getWebviewContent({ isSidebar: true }), true);
const editorTabHtml = injectPreview(getWebviewContent({ isSidebar: false }), false);

fs.writeFileSync(path.join(previewDir, 'sidebar-340.html'), sidebarHtml, 'utf8');
fs.writeFileSync(path.join(previewDir, 'editor-tab.html'), editorTabHtml, 'utf8');

console.log('Generated preview files:');
console.log(' - ' + path.join(previewDir, 'sidebar-340.html'));
console.log(' - ' + path.join(previewDir, 'editor-tab.html'));
