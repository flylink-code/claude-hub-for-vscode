import * as fs from 'fs';
import { SessionInfo } from './types.js';
import { estimateCostUsd, formatCostUsd } from './modelPricing.js';
import { formatCostForDisplay } from './modelPricing.js';

function recentUserTurns(sessionFile: string, limit = 8): string[] {
  if (!sessionFile || !fs.existsSync(sessionFile)) return [];
  const turns: string[] = [];
  const lines = fs.readFileSync(sessionFile, 'utf8').split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0 && turns.length < limit; i--) {
    const line = lines[i];
    if (!line) continue;
    try {
      const entry = JSON.parse(line);
      if (entry?.type !== 'user' && entry?.message?.role !== 'user') continue;
      let text = '';
      const c = entry.message?.content ?? entry.content;
      if (typeof c === 'string') text = c;
      else if (Array.isArray(c)) {
        text = c.map((b: any) => (typeof b === 'string' ? b : b?.text || '')).filter(Boolean).join('\n');
      }
      text = text.trim();
      if (!text) continue;
      turns.push(text.length > 500 ? text.slice(0, 500) + '…' : text);
    } catch {
      /* skip */
    }
  }
  return turns.reverse();
}

export function exportSessionMarkdown(session: SessionInfo): string {
  const est = estimateCostUsd(session.tokenUsage, session.model || '');
  const lines: string[] = [];
  lines.push(`# ${session.sessionTitle || session.projectName || 'Claude Session'}`);
  lines.push('');
  lines.push(`- Project: \`${session.projectName}\``);
  lines.push(`- Path: \`${session.projectPath || ''}\``);
  lines.push(`- Session ID: \`${session.sessionId}\``);
  lines.push(`- Model: ${session.model || '—'}${session.lastResponseModel ? ` (last: ${session.lastResponseModel})` : ''}`);
  lines.push(
    `- Tokens: ${session.tokenUsage.totalTokens.toLocaleString()} (${session.tokenUsage.percentage}%) · Cost est: ${formatCostUsd(est.usd, est.priced)}`,
  );
  if (session.gitBranch) lines.push(`- Branch: \`${session.gitBranch}\``);
  if (session.plan?.path) lines.push(`- Plan: \`${session.plan.path}\``);
  lines.push('');

  if (session.todos?.length) {
    lines.push(`## Todos (${session.todoMode || session.taskSource || 'tasks'})`);
    for (const t of session.todos) {
      const mark = t.status === 'completed' ? 'x' : t.status === 'in_progress' ? '/' : ' ';
      lines.push(`- [${mark}] ${t.content || t.description || t.id}`);
    }
    lines.push('');
  }

  if (session.agents?.length) {
    lines.push(`## Agents`);
    for (const a of session.agents) {
      lines.push(`- ${a.name || a.type || a.id} (${a.status})${a.worktreePath ? ` · ${a.worktreePath}` : ''}`);
    }
    lines.push('');
  }

  const turns = recentUserTurns(session.sessionFile, 8);
  if (turns.length) {
    lines.push(`## Recent user turns`);
    turns.forEach((t, i) => {
      lines.push(`### ${i + 1}`);
      lines.push(t);
      lines.push('');
    });
  }

  lines.push(`---`);
  lines.push(`_Exported by Claude Hub. Cost is a local estimate (${formatCostForDisplay(session.tokenUsage, session.model)})._`);
  return lines.join('\n');
}
