import * as vscode from 'vscode';
import { SessionInfo } from './types.js';
import { t } from './i18n.js';

/** Tracks one-shot notifications so we do not spam on every scan. */
export class SessionAlertController {
  private warnedContext = new Set<string>();
  private dangerContext = new Set<string>();
  private idleTools = new Set<string>();

  public evaluate(sessions: SessionInfo[]): void {
    const config = vscode.workspace.getConfiguration('claudeHub');
    if (!config.get<boolean>('alerts.enabled', false)) return;

    const warnAt = config.get<number>('warningThreshold', 50) ?? 50;
    const dangerAt = config.get<number>('dangerThreshold', 75) ?? 75;
    const notifyContext = config.get<boolean>('alerts.context', true);
    const notifyIdle = config.get<boolean>('alerts.idleWithTools', true);

    for (const s of sessions) {
      const id = s.sessionId;
      const pct = s.tokenUsage?.percentage ?? 0;

      if (notifyContext) {
        if (pct >= dangerAt) {
          if (!this.dangerContext.has(id)) {
            this.dangerContext.add(id);
            this.warnedContext.add(id);
            void vscode.window.showWarningMessage(
              t('alert.contextDanger', { name: s.sessionTitle || s.projectName, pct: Math.round(pct) }),
            );
          }
        } else if (pct >= warnAt) {
          if (!this.warnedContext.has(id)) {
            this.warnedContext.add(id);
            void vscode.window.showInformationMessage(
              t('alert.contextWarn', { name: s.sessionTitle || s.projectName, pct: Math.round(pct) }),
            );
          }
        } else {
          this.warnedContext.delete(id);
          this.dangerContext.delete(id);
        }
      }

      if (notifyIdle && s.isIdle && (s.activeTools?.length ?? 0) > 0) {
        if (!this.idleTools.has(id)) {
          this.idleTools.add(id);
          void vscode.window.showWarningMessage(
            t('alert.idleTools', { name: s.sessionTitle || s.projectName, tool: s.activeTools[0]?.name || 'tool' }),
          );
        }
      } else {
        this.idleTools.delete(id);
      }
    }

    // Drop ids that disappeared
    const live = new Set(sessions.map((s) => s.sessionId));
    for (const set of [this.warnedContext, this.dangerContext, this.idleTools]) {
      for (const id of [...set]) {
        if (!live.has(id)) set.delete(id);
      }
    }
  }
}
