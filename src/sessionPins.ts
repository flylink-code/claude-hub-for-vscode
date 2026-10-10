import * as vscode from 'vscode';

const KEY = 'claudeHub.pinnedSessionIds';

export function getPinnedSessionIds(context: vscode.ExtensionContext): string[] {
  return context.globalState.get<string[]>(KEY, []) || [];
}

export function isPinned(context: vscode.ExtensionContext, sessionId: string): boolean {
  return getPinnedSessionIds(context).includes(sessionId);
}

export async function togglePin(context: vscode.ExtensionContext, sessionId: string): Promise<boolean> {
  const cur = getPinnedSessionIds(context);
  const idx = cur.indexOf(sessionId);
  if (idx >= 0) {
    cur.splice(idx, 1);
    await context.globalState.update(KEY, cur);
    return false;
  }
  cur.unshift(sessionId);
  await context.globalState.update(KEY, cur.slice(0, 100));
  return true;
}

export function sortSessionsWithPins<T extends { sessionId: string }>(
  sessions: T[],
  pinnedIds: string[],
): T[] {
  if (!pinnedIds.length) return sessions;
  const set = new Set(pinnedIds);
  const pinned: T[] = [];
  const rest: T[] = [];
  for (const s of sessions) {
    (set.has(s.sessionId) ? pinned : rest).push(s);
  }
  pinned.sort((a, b) => pinnedIds.indexOf(a.sessionId) - pinnedIds.indexOf(b.sessionId));
  return [...pinned, ...rest];
}
