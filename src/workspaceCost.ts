import { SessionInfo } from './types.js';
import { estimateCostUsd, formatCostUsd, PRICING_TABLE_VERSION } from './modelPricing.js';

export interface CostRow {
  key: string;
  label: string;
  sessions: number;
  tokens: number;
  usd: number | null;
  unpricedSessions: number;
}

export interface WorkspaceCostReport {
  pricingVersion: string;
  generatedAt: string;
  scope: 'workspace' | 'all';
  totals: { sessions: number; tokens: number; usd: number | null; unpricedSessions: number };
  byProject: CostRow[];
  byModel: CostRow[];
  byDay: CostRow[];
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function bump(
  map: Map<string, CostRow>,
  key: string,
  label: string,
  tokens: number,
  usd: number | null,
  priced: boolean,
): void {
  const row = map.get(key) || {
    key,
    label,
    sessions: 0,
    tokens: 0,
    usd: 0,
    unpricedSessions: 0,
  };
  row.sessions += 1;
  row.tokens += tokens;
  if (!priced || usd === null) {
    row.unpricedSessions += 1;
    row.usd = row.usd === 0 && row.sessions === 1 ? null : row.usd;
    if (row.unpricedSessions === row.sessions) row.usd = null;
  } else {
    row.usd = (row.usd || 0) + usd;
  }
  map.set(key, row);
}

export function buildWorkspaceCostReport(
  sessions: SessionInfo[],
  scope: 'workspace' | 'all' = 'workspace',
): WorkspaceCostReport {
  const byProject = new Map<string, CostRow>();
  const byModel = new Map<string, CostRow>();
  const byDay = new Map<string, CostRow>();

  let totalTokens = 0;
  let totalUsd = 0;
  let anyPriced = false;
  let unpricedSessions = 0;

  for (const s of sessions) {
    const tokens = s.tokenUsage?.totalTokens || 0;
    totalTokens += tokens;
    const est = estimateCostUsd(s.tokenUsage, s.model || s.lastResponseModel || '');
    if (est.priced && est.usd !== null) {
      totalUsd += est.usd;
      anyPriced = true;
    } else {
      unpricedSessions += 1;
    }

    bump(byProject, s.projectPath || s.projectName, s.projectName || 'Unknown', tokens, est.usd, est.priced);
    const modelLabel = est.displayName || s.model || 'Unknown';
    bump(byModel, est.canonicalId || s.model || 'unknown', modelLabel, tokens, est.usd, est.priced);
    const when = s.lastUpdated ? new Date(s.lastUpdated) : (s.lastActivity?.timestamp ? new Date(s.lastActivity.timestamp) : new Date(0));
    const dk = when.getTime() > 0 ? dayKey(when) : 'unknown';
    bump(byDay, dk, dk, tokens, est.usd, est.priced);
  }

  const sortRows = (rows: CostRow[]) =>
    [...rows].sort((a, b) => (b.usd || 0) - (a.usd || 0) || b.tokens - a.tokens);

  return {
    pricingVersion: PRICING_TABLE_VERSION,
    generatedAt: new Date().toISOString(),
    scope,
    totals: {
      sessions: sessions.length,
      tokens: totalTokens,
      usd: anyPriced ? totalUsd : null,
      unpricedSessions,
    },
    byProject: sortRows([...byProject.values()]),
    byModel: sortRows([...byModel.values()]),
    byDay: sortRows([...byDay.values()]),
  };
}

export function formatWorkspaceCostMarkdown(report: WorkspaceCostReport): string {
  const lines: string[] = [];
  lines.push(`# Claude Hub — Workspace Cost Report`);
  lines.push('');
  lines.push(`- Scope: **${report.scope}**`);
  lines.push(`- Pricing table: \`${report.pricingVersion}\``);
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(
    `- Totals: **${report.totals.sessions}** sessions · **${report.totals.tokens.toLocaleString()}** tokens · **${formatCostUsd(report.totals.usd, report.totals.usd !== null)}**` +
      (report.totals.unpricedSessions
        ? ` · ${report.totals.unpricedSessions} unpriced session(s)`
        : ''),
  );
  lines.push('');
  lines.push(`## By project`);
  for (const r of report.byProject.slice(0, 30)) {
    lines.push(
      `- ${r.label}: ${r.sessions} sessions · ${r.tokens.toLocaleString()} tok · ${formatCostUsd(r.usd, r.usd !== null)}`,
    );
  }
  lines.push('');
  lines.push(`## By model`);
  for (const r of report.byModel.slice(0, 30)) {
    lines.push(
      `- ${r.label}: ${r.sessions} sessions · ${r.tokens.toLocaleString()} tok · ${formatCostUsd(r.usd, r.usd !== null)}`,
    );
  }
  lines.push('');
  lines.push(`## By day`);
  for (const r of report.byDay.slice(0, 30)) {
    lines.push(
      `- ${r.label}: ${r.sessions} sessions · ${r.tokens.toLocaleString()} tok · ${formatCostUsd(r.usd, r.usd !== null)}`,
    );
  }
  lines.push('');
  lines.push(`_Estimates only. Unpriced / gateway models show as —._`);
  return lines.join('\n');
}
