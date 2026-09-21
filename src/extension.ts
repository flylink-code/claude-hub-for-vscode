import * as vscode from 'vscode';
import { ClaudeConfigManager } from './claudeConfigManager.js';
import { registerCommands } from './commands.js';
import { ClaudeHubDashboardProvider } from './dashboardView.js';
import { SessionManager } from './sessionManager.js';
import { StatusBarController } from './statusBar.js';

let sessionManager: SessionManager | null = null;
let configManager: ClaudeConfigManager | null = null;
let statusBarController: StatusBarController | null = null;
let dashboardProvider: ClaudeHubDashboardProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log('[Claude Hub] Activating modern extension...');

  configManager = new ClaudeConfigManager();
  sessionManager = new SessionManager(context);
  context.subscriptions.push(sessionManager);

  statusBarController = new StatusBarController(sessionManager);
  context.subscriptions.push(statusBarController);

  // Modern Webview Dashboard Provider (Unified View)
  dashboardProvider = new ClaudeHubDashboardProvider(context, sessionManager, configManager);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ClaudeHubDashboardProvider.viewType,
      dashboardProvider,
    ),
  );
  context.subscriptions.push(dashboardProvider);

  // Register Commands
  registerCommands(context, sessionManager, configManager);

  // Run initial scan
  sessionManager.scanSessions();
}

export function deactivate() {
  statusBarController?.dispose();
  dashboardProvider?.dispose();
  sessionManager?.dispose();
  statusBarController = null;
  dashboardProvider = null;
  sessionManager = null;
  configManager = null;
}
