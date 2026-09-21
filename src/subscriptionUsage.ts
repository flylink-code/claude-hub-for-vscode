import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import { execFile } from 'child_process';
import { resolveClaudeConfigDir } from './configDir.js';
import { SubscriptionUsageData, UsageMeter } from './types.js';

const LIMIT_KIND_LABELS: Record<string, string> = {
  session: 'Session (5h)',
  weekly_all: 'Weekly (all models)',
  weekly_opus: 'Weekly (Opus)',
  weekly_sonnet: 'Weekly (Sonnet)',
};

const METER_LABELS: Record<string, string> = {
  five_hour: 'Session (5h)',
  seven_day: 'Weekly (all models)',
  seven_day_opus: 'Weekly (Opus)',
  seven_day_sonnet: 'Weekly (Sonnet)',
  seven_day_oauth_apps: 'Weekly (apps)',
};

function humanizeKey(key: string): string {
  return key
    .split(/[_\s]+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function extractAccessToken(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    const token = parsed?.claudeAiOauth?.accessToken || parsed?.oauthAccount?.accessToken;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

function readTokenFromCredentialsFile(configDir: string): string | null {
  const credFile = path.join(configDir, '.credentials.json');
  try {
    if (fs.existsSync(credFile)) {
      const token = extractAccessToken(fs.readFileSync(credFile, 'utf-8'));
      if (token) return token;
    }
  } catch {
    // ignore
  }

  // Also try ~/.claude.json in homedir
  const claudeJson = path.join(os.homedir(), '.claude.json');
  try {
    if (fs.existsSync(claudeJson)) {
      const token = extractAccessToken(fs.readFileSync(claudeJson, 'utf-8'));
      if (token) return token;
    }
  } catch {
    // ignore
  }

  return null;
}

function readTokenFromKeychain(): Promise<string | null> {
  return new Promise((resolve) => {
    if (process.platform !== 'darwin') {
      return resolve(null);
    }
    const user = process.env.USER || os.userInfo().username || 'claude-code-user';
    execFile(
      'security',
      ['find-generic-password', '-a', user, '-w', '-s', 'Claude Code-credentials'],
      { timeout: 3000 },
      (err, stdout) => {
        if (err || !stdout) {
          resolve(null);
          return;
        }
        resolve(extractAccessToken(stdout.trim()));
      },
    );
  });
}

export async function readOAuthToken(configDir?: string): Promise<string | null> {
  if (process.env.CLAUDE_OAUTH_TOKEN) {
    return process.env.CLAUDE_OAUTH_TOKEN.trim();
  }

  const resolved = configDir || resolveClaudeConfigDir();
  if (process.platform === 'darwin') {
    const fromKeychain = await readTokenFromKeychain();
    if (fromKeychain) return fromKeychain;
  }

  return readTokenFromCredentialsFile(resolved);
}

function readPercentage(meter: unknown): number | null {
  if (!meter || typeof meter !== 'object') {
    return null;
  }
  const m = meter as Record<string, unknown>;
  let val = m.percent;
  if (typeof val !== 'number') val = m.utilization;
  if (typeof val !== 'number') val = m.used_percentage;

  if (typeof val !== 'number' || Number.isNaN(val)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(val)));
}

function readResetsAt(meter: unknown): Date | null {
  if (!meter || typeof meter !== 'object') return null;
  const m = meter as Record<string, unknown>;
  const val = m.resets_at;
  if (typeof val === 'number') {
    return new Date(val * 1000);
  }
  if (typeof val === 'string' && val) {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function labelForLimit(entry: Record<string, unknown>): string {
  const kind = String(entry.kind ?? '');
  if (kind === 'session' || kind === 'weekly_all') {
    return LIMIT_KIND_LABELS[kind];
  }
  const scope = entry.scope as Record<string, unknown> | undefined;
  const model = scope?.model as Record<string, unknown> | undefined;
  const scopedName = model?.display_name as string | undefined;
  if (scopedName) {
    return `Weekly ${scopedName}`;
  }
  return LIMIT_KIND_LABELS[kind] || humanizeKey(kind || 'limit');
}

export function parseUsageResponse(body: unknown): SubscriptionUsageData | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const b = body as Record<string, unknown>;
  const meters: UsageMeter[] = [];
  let sessionMeter: UsageMeter | null = null;

  if (Array.isArray(b.limits) && b.limits.length > 0) {
    for (const raw of b.limits) {
      if (!raw || typeof raw !== 'object') continue;
      const entry = raw as Record<string, unknown>;
      const percentage = readPercentage(entry);
      if (percentage === null) continue;

      const label = labelForLimit(entry);
      const scope = entry.scope as Record<string, unknown> | undefined;
      const model = scope?.model as Record<string, unknown> | undefined;
      const scopedName = model?.display_name as string | undefined;
      const key = scopedName ? `${entry.kind}:${scopedName}` : String(entry.kind ?? label);

      const m: UsageMeter = {
        key,
        label,
        percentage,
        resetsAt: readResetsAt(entry),
        isActive: entry.is_active === true,
      };
      meters.push(m);
      if (entry.kind === 'session' && !sessionMeter) {
        sessionMeter = m;
      }
    }
  } else {
    const source = (b.rate_limits && typeof b.rate_limits === 'object' ? b.rate_limits : b) as Record<string, unknown>;
    for (const [key, raw] of Object.entries(source)) {
      if (key !== 'five_hour' && !key.startsWith('seven_day')) {
        continue;
      }
      const percentage = readPercentage(raw);
      if (percentage === null) continue;

      const m: UsageMeter = {
        key,
        label: METER_LABELS[key] || humanizeKey(key),
        percentage,
        resetsAt: readResetsAt(raw),
        isActive: false,
      };
      meters.push(m);
    }
    meters.sort((a, b) => (a.key === 'five_hour' ? -1 : b.key === 'five_hour' ? 1 : 0));
    sessionMeter = meters.find((m) => m.key === 'five_hour') || null;
  }

  if (meters.length === 0) {
    return null;
  }

  return {
    session: sessionMeter,
    meters,
    lastUpdated: new Date(),
  };
}

export function fetchSubscriptionUsage(token: string): Promise<SubscriptionUsageData | null> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/api/oauth/usage',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'claude-code',
        },
        timeout: 6000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            resolve(null);
            return;
          }
          try {
            resolve(parseUsageResponse(JSON.parse(data)));
          } catch {
            resolve(null);
          }
        });
      },
    );

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}
