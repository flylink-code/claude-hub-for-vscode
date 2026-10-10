import * as fs from 'fs';
import { SessionInfo } from './types.js';

export interface TranscriptHit {
  sessionId: string;
  projectName: string;
  sessionTitle: string;
  sessionFile: string;
  line: number;
  snippet: string;
  kind: string;
}

function extractText(entry: any): string {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  if (typeof entry.message?.content === 'string') return entry.message.content;
  if (Array.isArray(entry.message?.content)) {
    return entry.message.content
      .map((b: any) => (typeof b === 'string' ? b : b?.text || b?.name || ''))
      .filter(Boolean)
      .join(' ');
  }
  if (typeof entry.content === 'string') return entry.content;
  if (entry.tool_use?.name) return `${entry.tool_use.name} ${JSON.stringify(entry.tool_use.input || {}).slice(0, 200)}`;
  return '';
}

export function searchTranscriptFile(
  session: SessionInfo,
  query: string,
  limit = 50,
): TranscriptHit[] {
  const q = (query || '').trim().toLowerCase();
  if (!q || !session.sessionFile || !fs.existsSync(session.sessionFile)) return [];

  const hits: TranscriptHit[] = [];
  const content = fs.readFileSync(session.sessionFile, 'utf8');
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    let entry: any = null;
    try {
      entry = JSON.parse(line);
    } catch {
      if (line.toLowerCase().includes(q)) {
        hits.push({
          sessionId: session.sessionId,
          projectName: session.projectName,
          sessionTitle: session.sessionTitle,
          sessionFile: session.sessionFile,
          line: i + 1,
          snippet: line.slice(0, 240),
          kind: 'raw',
        });
      }
      if (hits.length >= limit) break;
      continue;
    }
    const text = extractText(entry);
    const hay = `${entry.type || ''} ${text}`.toLowerCase();
    if (!hay.includes(q)) continue;
    hits.push({
      sessionId: session.sessionId,
      projectName: session.projectName,
      sessionTitle: session.sessionTitle,
      sessionFile: session.sessionFile,
      line: i + 1,
      snippet: (text || line).replace(/\s+/g, ' ').slice(0, 240),
      kind: String(entry.type || 'entry'),
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

export function searchSessions(
  sessions: SessionInfo[],
  query: string,
  opts?: { limitPerSession?: number; maxHits?: number },
): TranscriptHit[] {
  const limitPerSession = opts?.limitPerSession ?? 20;
  const maxHits = opts?.maxHits ?? 100;
  const out: TranscriptHit[] = [];
  for (const s of sessions) {
    const hits = searchTranscriptFile(s, query, limitPerSession);
    out.push(...hits);
    if (out.length >= maxHits) return out.slice(0, maxHits);
  }
  return out;
}
