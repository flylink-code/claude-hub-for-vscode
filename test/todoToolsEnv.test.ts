import test from 'node:test';
import assert from 'node:assert/strict';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TaskIntegrationManager, TASK_TOOL_ENV, TODO_TOOLS_GATE_ENV, readJsonObject, isTodoToolsEnvEnabled } from '../src/taskIntegration.js';
import { getWebviewContent } from '../src/webviewHtml.js';

function makeMgr(root: string) {
  const storage = path.join(root, 'storage');
  const bridge = path.join(root, 'bridge.cjs');
  fs.mkdirSync(storage, { recursive: true });
  fs.writeFileSync(bridge, "'use strict';\n", 'utf8');
  const configDir = path.join(root, 'claude-config');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'settings.json'), '{}\n', 'utf8');
  return new TaskIntegrationManager(storage, bridge, () => configDir);
}

test('setTodoToolsEnv writes env only without hooks', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-todo-env-'));
  const project = path.join(root, 'proj');
  fs.mkdirSync(project, { recursive: true });
  const mgr = makeMgr(root);

  mgr.setTodoToolsEnv(project, true);
  const file = path.join(project, '.claude', 'settings.local.json');
  assert.ok(fs.existsSync(file));
  const settings = readJsonObject(file);
  assert.equal(settings.env[TODO_TOOLS_GATE_ENV], '1');
  assert.equal(settings.env[TASK_TOOL_ENV], '1');
  assert.equal(settings.hooks, undefined);

  const st = mgr.status(project, false);
  assert.equal(st.envEnabled, true);
  assert.equal(st.hooksConfigured, false);
  assert.equal(st.configured, true);

  mgr.setTodoToolsEnv(project, false);
  const after = readJsonObject(file);
  assert.ok(!after.env || after.env[TASK_TOOL_ENV] === undefined);
  assert.ok(!after.env || after.env[TODO_TOOLS_GATE_ENV] === undefined);
  assert.equal(mgr.status(project).envEnabled, false);
});

test('setTodoToolsEnv turns official Task mode on over an explicit off', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-todo-env-conflict-'));
  const project = path.join(root, 'proj');
  fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.claude', 'settings.local.json'),
    JSON.stringify({ env: { CLAUDE_CODE_ENABLE_TASKS: '0' } }, null, 2) + '\n',
    'utf8',
  );
  const mgr = makeMgr(root);
  assert.equal(mgr.status(project).envEnabled, false);
  mgr.setTodoToolsEnv(project, true);
  const settings = readJsonObject(path.join(project, '.claude', 'settings.local.json'));
  assert.equal(settings.env[TODO_TOOLS_GATE_ENV], '1');
  assert.equal(settings.env[TASK_TOOL_ENV], '1');
  assert.equal(mgr.status(project).envEnabled, true);
  mgr.setTodoToolsEnv(project, false);
  const after = readJsonObject(path.join(project, '.claude', 'settings.local.json'));
  assert.equal(after.env[TASK_TOOL_ENV], '0');
  assert.equal(after.env[TODO_TOOLS_GATE_ENV], undefined);
});

test('enabling official Task mode keeps the tool gate and selector together', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-todo-legacy-'));
  const project = path.join(root, 'proj');
  fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.claude', 'settings.local.json'),
    JSON.stringify({ env: { [TODO_TOOLS_GATE_ENV]: '1' } }, null, 2) + '\n',
    'utf8',
  );
  const mgr = makeMgr(root);
  const key = crypto.createHash('sha256').update(path.resolve(project)).digest('hex');
  const own = path.join(root, 'storage', 'projects', `${key}.env-only.json`);
  fs.mkdirSync(path.dirname(own), { recursive: true });
  fs.writeFileSync(own, JSON.stringify({
    projectPath: project,
    hadEnv: true,
    previousExists: false,
  }), 'utf8');
  mgr.setTodoToolsEnv(project, true);
  const settings = readJsonObject(path.join(project, '.claude', 'settings.local.json'));
  assert.equal(settings.env[TODO_TOOLS_GATE_ENV], '1');
  assert.equal(settings.env[TASK_TOOL_ENV], '1');
});

test('isTodoToolsEnvEnabled normalizes 1/true variants', () => {
  assert.equal(isTodoToolsEnvEnabled('1'), true);
  assert.equal(isTodoToolsEnvEnabled(1), true);
  assert.equal(isTodoToolsEnvEnabled(true), true);
  assert.equal(isTodoToolsEnvEnabled('true'), true);
  assert.equal(isTodoToolsEnvEnabled('TRUE'), true);
  assert.equal(isTodoToolsEnvEnabled('0'), false);
  assert.equal(isTodoToolsEnvEnabled(false), false);
  assert.equal(isTodoToolsEnvEnabled(undefined), false);
});

test('status treats numeric/boolean env as enabled', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-todo-norm-'));
  const project = path.join(root, 'proj');
  fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.claude', 'settings.local.json'),
    JSON.stringify({ env: { [TODO_TOOLS_GATE_ENV]: 1, [TASK_TOOL_ENV]: true } }, null, 2) + '\n',
    'utf8',
  );
  const mgr = makeMgr(root);
  assert.equal(mgr.status(project).envEnabled, true);
});

test('reconcileWithSetting writes env when setting desires on', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-todo-rec-'));
  const project = path.join(root, 'proj');
  fs.mkdirSync(project, { recursive: true });
  const mgr = makeMgr(root);
  assert.equal(mgr.status(project).envEnabled, false);
  const wrote = mgr.reconcileWithSetting(project, true);
  assert.equal(wrote, true);
  assert.equal(mgr.status(project).envEnabled, true);
  assert.equal(mgr.reconcileWithSetting(project, true), false);
});

test('reconcileWithSetting clears Hub-owned env when setting desires off', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-todo-rec-off-'));
  const project = path.join(root, 'proj');
  fs.mkdirSync(project, { recursive: true });
  const mgr = makeMgr(root);
  mgr.setTodoToolsEnv(project, true);
  assert.equal(mgr.status(project).envEnabled, true);
  const cleared = mgr.reconcileWithSetting(project, false);
  assert.equal(cleared, true);
  assert.equal(mgr.status(project).envEnabled, false);
});

test('webview loadConfig calls renderTodoToolsPanel and ORs setting with env', () => {
  const html = getWebviewContent();
  assert.match(html, /if \(msg\.type === 'loadConfig'\)[\s\S]*?renderTodoToolsPanel\(msg\);/);
  assert.match(html, /const checked = anyEnvOn \|\| settingOn;/);
  assert.match(html, /id="todo-tools-toggle"/);
});

