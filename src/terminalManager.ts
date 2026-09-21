import * as vscode from 'vscode';

export class TerminalManager {
  public static findClaudeTerminal(): vscode.Terminal | undefined {
    return vscode.window.terminals.find(
      (t) =>
        t.name.toLowerCase().includes('claude') ||
        t.name.toLowerCase().includes('claude code'),
    );
  }

  public static focusOrLaunchClaudeTerminal(): vscode.Terminal {
    let terminal = this.findClaudeTerminal();
    if (!terminal) {
      const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      terminal = vscode.window.createTerminal({
        name: 'Claude Code',
        cwd,
        iconPath: new vscode.ThemeIcon('sparkle'),
      });
      terminal.sendText('claude');
    }
    terminal.show();
    return terminal;
  }

  public static sendSlashCommand(command: string): void {
    const terminal = this.focusOrLaunchClaudeTerminal();
    const cleanCmd = command.startsWith('/') ? command : `/${command}`;
    terminal.sendText(cleanCmd);
  }
}
