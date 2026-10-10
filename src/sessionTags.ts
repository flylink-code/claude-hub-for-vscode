import * as vscode from 'vscode';

const KEY = 'claudeHub.sessionTags';

export type SessionTagMap = Record<string, string[]>;

function normalizeTag(tag: string): string | null {
  const t = (tag || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!t || t.length > 32) return null;
  if (!/^[a-z0-9][a-z0-9_.-]{0,31}$/.test(t)) return null;
  return t;
}

export function getSessionTagMap(context: vscode.ExtensionContext): SessionTagMap {
  return { ...(context.globalState.get<SessionTagMap>(KEY, {}) || {}) };
}

export function getSessionTags(context: vscode.ExtensionContext, sessionId: string): string[] {
  return [...(getSessionTagMap(context)[sessionId] || [])];
}

export async function setSessionTags(
  context: vscode.ExtensionContext,
  sessionId: string,
  tags: string[],
): Promise<string[]> {
  const map = getSessionTagMap(context);
  const cleaned = Array.from(
    new Set(tags.map(normalizeTag).filter((x): x is string => !!x)),
  ).slice(0, 12);
  if (cleaned.length === 0) delete map[sessionId];
  else map[sessionId] = cleaned;
  await context.globalState.update(KEY, map);
  return cleaned;
}

export async function addSessionTag(
  context: vscode.ExtensionContext,
  sessionId: string,
  tag: string,
): Promise<string[]> {
  const cur = getSessionTags(context, sessionId);
  const n = normalizeTag(tag);
  if (!n) return cur;
  if (!cur.includes(n)) cur.push(n);
  return setSessionTags(context, sessionId, cur);
}

export async function removeSessionTag(
  context: vscode.ExtensionContext,
  sessionId: string,
  tag: string,
): Promise<string[]> {
  const n = normalizeTag(tag);
  const cur = getSessionTags(context, sessionId).filter((t) => t !== n);
  return setSessionTags(context, sessionId, cur);
}

export const SUGGESTED_TAGS = ['wip', 'blocked', 'review', 'bug', 'feature', 'chore', 'urgent'] as const;
