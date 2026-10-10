import * as fs from 'fs';
import { SessionInfo } from './types.js';

export type TimelineKind = 'permission' | 'hook' | 'system' | 'other';

export interface TimelineEvent {
  line: number;
  kind: TimelineKind;
  timestamp?: string;
  summary: string;
  rawType?: string;
}

const PERMISSION_RE =
  /permission|PermissionPrompt|tool_permission|permissions?\s*(denied|rejected|granted|allow|ask)/i;
const HOOK_RE = /\bhooks?\b|hook_event|PreToolUse|PostToolUse|Notification|UserPromptSubmit/i;

function summarize(entry: any, line: string): { kind: TimelineKind; summary: string } | null {
  const type = String(entry?.type || '');
  const blob =
    typeof entry === 'object'
      ? JSON.stringify(entry).slice(0, 2000)
      : line.slice(0, 2000);

  if (type === 'hook' || HOOK_RE.test(type) || HOOK_RE.test(blob)) {
    const name =
      entry?.hookName ||
      entry?.hook_name ||
      entry?.name ||
      entry?.event ||
      type ||
      'hook';
    const status = entry?.status || entry?.result || entry?.outcome || '';
    return {
      kind: 'hook',
      summary: `Hook ${name}${status ? ` · ${status}` : ''}`.slice(0, 200),
    };
  }

  if (
    type.includes('permission') ||
    entry?.permissionDecision ||
    entry?.permission ||
    PERMISSION_RE.test(blob)
  ) {
    const decision =
      entry?.permissionDecision ||
      entry?.decision ||
      entry?.permission?.decision ||
      ( /denied|rejected/i.test(blob) ? 'denied' : /granted|allow/i.test(blob) ? 'allowed' : 'prompt');
    const tool =
      entry?.toolName ||
      entry?.tool_name ||
      entry?.permission?.toolName ||
      entry?.message?.toolName ||
      '';
    return {
      kind: 'permission',
      summary: `Permission ${decision}${tool ? ` · ${tool}` : ''}`.slice(0, 200),
    };
  }

  if (type === 'system' && PERMISSION_RE.test(blob)) {
    return { kind: 'system', summary: 'System permission-related message'.slice(0, 200) };
  }

  return null;
}

/** Read-only scan of a transcript for permission / hook-related events. */
export function extractTimelineEvents(
  session: SessionInfo,
  opts?: { limit?: number },
): TimelineEvent[] {
  const limit = opts?.limit ?? 80;
  if (!session.sessionFile || !fs.existsSync(session.sessionFile)) return [];
  const out: TimelineEvent[] = [];
  const lines = fs.readFileSync(session.sessionFile, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // Cheap prefilter
    if (!PERMISSION_RE.test(line) && !HOOK_RE.test(line) && !/"type"\s*:\s*"hook"/i.test(line)) {
      continue;
    }
    let entry: any = null;
    try {
      entry = JSON.parse(line);
    } catch {
      out.push({
        line: i + 1,
        kind: PERMISSION_RE.test(line) ? 'permission' : 'hook',
        summary: line.replace(/\s+/g, ' ').slice(0, 200),
      });
      if (out.length >= limit) break;
      continue;
    }
    const hit = summarize(entry, line);
    if (!hit) continue;
    out.push({
      line: i + 1,
      kind: hit.kind,
      timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : undefined,
      summary: hit.summary,
      rawType: entry.type,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function formatTimelineMarkdown(
  session: SessionInfo,
  events: TimelineEvent[],
): string {
  const lines = [
    `# Permission / hook timeline`,
    ``,
    `- Session: **${session.sessionTitle || session.projectName}** (\`${session.sessionId}\`)`,
    `- Events: **${events.length}** (read-only scan)`,
    ``,
  ];
  if (!events.length) {
    lines.push(`_No permission/hook-related events matched in this transcript._`);
    return lines.join('\n');
  }
  for (const e of events) {
    const ts = e.timestamp ? ` · ${e.timestamp}` : '';
    lines.push(`- L${e.line} · **${e.kind}**${ts}: ${e.summary}`);
  }
  lines.push(``);
  lines.push(`_Does not change todo/task authority or transcript files._`);
  return lines.join('\n');
}
