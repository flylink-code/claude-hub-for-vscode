import * as fs from 'fs';
import { SessionInfo } from './types.js';
import { estimateCostUsd, formatCostUsd } from './modelPricing.js';

export interface ForkCompareSummary {
  parentId: string;
  childId: string;
  parentTitle: string;
  childTitle: string;
  parentLines: number;
  childLines: number;
  sharedPrefixLines: number;
  childOnlyLines: number;
  parentTokens: number;
  childTokens: number;
  parentCost: string;
  childCost: string;
  parentModel: string;
  childModel: string;
  notes: string[];
}

function countLines(file: string): { lines: number; hashes: string[] } {
  if (!file || !fs.existsSync(file)) return { lines: 0, hashes: [] };
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  // Stable-ish content fingerprint without full JSON parse cost
  const hashes = lines.map((l) => {
    // Strip sessionId-ish UUIDs so rewritten fork lines can still match parent prefix
    return l.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '<id>',
    );
  });
  return { lines: lines.length, hashes };
}

export function compareForkSessions(parent: SessionInfo, child: SessionInfo): ForkCompareSummary {
  const p = countLines(parent.sessionFile);
  const c = countLines(child.sessionFile);
  let shared = 0;
  const n = Math.min(p.hashes.length, c.hashes.length);
  for (let i = 0; i < n; i++) {
    if (p.hashes[i] !== c.hashes[i]) break;
    shared++;
  }
  const notes: string[] = [];
  if (shared === 0 && p.lines > 0 && c.lines > 0) {
    notes.push('No shared prefix after normalizing session ids (fork may have diverged early or files differ).');
  }
  if (c.lines < p.lines) {
    notes.push('Child transcript is shorter than parent (unexpected for a typical fork).');
  }
  const pEst = estimateCostUsd(parent.tokenUsage, parent.model);
  const cEst = estimateCostUsd(child.tokenUsage, child.model);
  return {
    parentId: parent.sessionId,
    childId: child.sessionId,
    parentTitle: parent.sessionTitle || parent.projectName,
    childTitle: child.sessionTitle || child.projectName,
    parentLines: p.lines,
    childLines: c.lines,
    sharedPrefixLines: shared,
    childOnlyLines: Math.max(0, c.lines - shared),
    parentTokens: parent.tokenUsage?.totalTokens || 0,
    childTokens: child.tokenUsage?.totalTokens || 0,
    parentCost: formatCostUsd(pEst.usd, pEst.priced),
    childCost: formatCostUsd(cEst.usd, cEst.priced),
    parentModel: parent.model,
    childModel: child.model,
    notes,
  };
}

export function formatForkCompareMarkdown(summary: ForkCompareSummary): string {
  const lines = [
    `# Fork compare`,
    ``,
    `| | Parent | Child (fork) |`,
    `|---|---|---|`,
    `| Title | ${summary.parentTitle} | ${summary.childTitle} |`,
    `| Session | \`${summary.parentId}\` | \`${summary.childId}\` |`,
    `| Model | ${summary.parentModel} | ${summary.childModel} |`,
    `| Transcript lines | ${summary.parentLines} | ${summary.childLines} |`,
    `| Tokens | ${summary.parentTokens} | ${summary.childTokens} |`,
    `| Cost est. | ${summary.parentCost} | ${summary.childCost} |`,
    ``,
    `- Shared prefix (id-normalized): **${summary.sharedPrefixLines}** lines`,
    `- Child-only after prefix: **${summary.childOnlyLines}** lines`,
    ``,
  ];
  if (summary.notes.length) {
    lines.push(`## Notes`);
    for (const n of summary.notes) lines.push(`- ${n}`);
    lines.push(``);
  }
  lines.push(`_Read-only local summary. Does not modify transcripts._`);
  return lines.join('\n');
}
