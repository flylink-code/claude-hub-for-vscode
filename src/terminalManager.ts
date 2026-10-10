import * as vscode from 'vscode';

export class TerminalManager {
  public static findClaudeTerminal(): vscode.Terminal | undefined {
    return vscode.window.terminals.find(
      (t) =>
        t.name.toLowerCase().includes('claude') ||
        t.name.toLowerCase().includes('claude code'),
    );
  }

  public static focusOrLaunchClaudeTerminal(cwd?: string): vscode.Terminal {
    let terminal = this.findClaudeTerminal();
    if (!terminal) {
      const folder = cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      terminal = vscode.window.createTerminal({
        name: 'Claude Code',
        cwd: folder,
        iconPath: new vscode.ThemeIcon('sparkle'),
      });
      terminal.sendText('claude');
    }
    terminal.show();
    return terminal;
  }

  /** Open a dedicated terminal in cwd and run claude --resume <sessionId>. */
  public static resumeSession(sessionId: string, cwd?: string, label?: string): vscode.Terminal {
    const name = label ? `Claude (${label})` : 'Claude Code';
    const terminal = vscode.window.createTerminal({
      name,
      cwd: cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      iconPath: new vscode.ThemeIcon('debug-start'),
    });
    terminal.show();
    terminal.sendText(`claude --resume ${sessionId}`);
    return terminal;
  }

  public static sendSlashCommand(command: string, cwd?: string): void {
    const terminal = this.focusOrLaunchClaudeTerminal(cwd);
    const cleanCmd = command.startsWith('/') ? command : `/${command}`;
    terminal.sendText(cleanCmd);
  }

  public static openTerminalInPath(cwd: string, name?: string): vscode.Terminal {
    const terminal = vscode.window.createTerminal({
      name: name || 'Claude Worktree',
      cwd,
      iconPath: new vscode.ThemeIcon('terminal'),
    });
    terminal.show();
    return terminal;
  }
}
