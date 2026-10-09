'use strict';

// 独立 Hook：不加载 vscode、不调用模型、不修改原生任务或计划。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,128}$/.test(value) && !['.', '..'].includes(value);
const within = (root, file) => {
  const relative = path.relative(path.resolve(root), path.resolve(file));
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
};
const realWithin = (root, file) => {
  try { return within(fs.realpathSync(root), fs.realpathSync(file)); } catch { return false; }
};

async function main() {
  const args = process.argv.slice(2);
  const option = name => args[args.indexOf(name) + 1];
  const storage = option('--storage');
  const project = option('--project');
  const configDir = option('--config-dir');
  if (!storage || !project || !configDir) return {};
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 2 * 1024 * 1024) return {};
  }
  const event = JSON.parse(input);
  if (!safeId(event.session_id) || typeof event.cwd !== 'string' || !within(project, event.cwd)) return {};
  if (!['SessionStart', 'UserPromptSubmit', 'PostToolUse'].includes(event.hook_event_name)) return {};
  const sessions = path.join(storage, 'sessions');
  fs.mkdirSync(sessions, { recursive: true });
  const file = path.join(sessions, event.session_id + '.json');
  const lock = file + '.lock';
  let acquired = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    try { fs.writeFileSync(lock, '', { flag: 'wx' }); acquired = true; break; }
    catch (error) {
      if (error.code !== 'EEXIST') return {};
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }
  if (!acquired) return {};
  try {
    let state = {};
    try { state = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* 首次关联 */ }
    if (event.hook_event_name === 'SessionStart' && event.source === 'clear') state = {};
    state.sessionId = event.session_id;
    state.projectPath = path.resolve(event.cwd);
    const listId = process.env.CLAUDE_CODE_TASK_LIST_ID || event.session_id;
    if (safeId(listId) && realWithin(path.join(configDir, 'tasks'), path.join(configDir, 'tasks', listId))) {
      state.taskListId = listId;
    }
    let context = '';
    const guide = 'Claude Hub task tracking: when executing an approved plan, use TaskCreate for its phases, reuse existing tasks, set TaskUpdate status to in_progress before work, and completed only after the phase and its verification finish. Never mark all phases complete without checking existing work. During planning, do not create execution tasks yet.';
    if (event.hook_event_name === 'SessionStart') {
      const key = event.source || 'startup';
      if (state.startSource !== key || !state.startReminded) {
        context = guide;
        state.startSource = key;
        state.startReminded = true;
      }
    }
    if (event.hook_event_name === 'PostToolUse' && event.tool_name === 'ExitPlanMode') {
      const tool = event.tool_input || {};
      const response = event.tool_response || {};
      const candidate = tool.planFilePath || response.filePath || response.planFilePath;
      if (typeof candidate === 'string' && path.isAbsolute(candidate) && /\.md$/i.test(candidate) &&
          [path.join(configDir, 'plans'), path.join(project, '.claude', 'plans')]
            .some(root => within(root, candidate) && realWithin(root, candidate))) state.planPath = candidate;
      const planKey = crypto.createHash('sha256').update(String(tool.plan || state.planPath || 'approved-plan')).digest('hex');
      if (state.planKey !== planKey) {
        state.planKey = planKey;
        state.taskObservedAt = undefined;
        state.promptReminded = false;
        context = guide;
      }
    }
    if (event.hook_event_name === 'PostToolUse' && ['TaskCreate', 'TaskUpdate', 'TodoWrite'].includes(event.tool_name)) {
      state.taskObservedAt = Date.now();
      if (!state.taskReminded) {
        context = 'Claude Hub: continue updating these existing tasks as work starts and finishes; do not recreate the task list.';
        state.taskReminded = true;
      }
    }
    if (event.hook_event_name === 'UserPromptSubmit' && state.planKey && !state.taskObservedAt && !state.promptReminded) {
      context = guide;
      state.promptReminded = true;
    }
    const temp = file + '.' + crypto.randomUUID() + '.tmp';
    try { fs.writeFileSync(temp, JSON.stringify(state)); fs.renameSync(temp, file); }
    finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    return context ? { hookSpecificOutput: { hookEventName: event.hook_event_name, additionalContext: context } } : {};
  } finally { fs.unlinkSync(lock); }
}

main().then(output => process.stdout.write(JSON.stringify(output))).catch(() => {
  // 可选联动失败不阻塞 Claude 主任务，stdout 仍保持有效 Hook JSON。
  process.stdout.write('{}');
});
