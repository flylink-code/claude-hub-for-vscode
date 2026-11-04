export function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Hub</title>
  <style>
    :root {
      --hub-background: var(--vscode-sideBar-background, #252526);
      --hub-surface: var(--vscode-editor-background, var(--hub-background));
      --hub-border: var(--vscode-widget-border, var(--vscode-panel-border, transparent));
      --hub-hover: var(--vscode-list-hoverBackground, transparent);
      --hub-focus: var(--vscode-focusBorder, #007fd4);
      --hub-accent: var(--vscode-textLink-foreground, #3794ff);
      --bg-color: var(--hub-background);
      --card-bg: var(--hub-surface);
      --card-border: var(--hub-border);
      --card-hover: var(--hub-hover);
      --claude-accent: var(--hub-accent);
      --claude-amber: var(--vscode-editorWarning-foreground, #cca700);
      --success-color: var(--vscode-testing-iconPassed, #73c991);
      --warning-color: var(--vscode-editorWarning-foreground, #cca700);
      --danger-color: var(--vscode-errorForeground, #f14c4c);
      --text-main: var(--vscode-foreground, #cccccc);
      --text-muted: var(--vscode-descriptionForeground, var(--text-main));
      --font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-family);
      color: var(--text-main);
      background-color: var(--bg-color);
      font-size: 12px;
      line-height: 1.45;
      padding: 10px 8px 24px 8px;
      user-select: none;
      overflow-x: hidden;
    }

    /* Container Queries Root */
    #app.hub-container {
      width: 100%;
      container-type: inline-size;
      container-name: hub;
    }

    /* Top Bar: one compact, theme-driven header with a single action rail. */
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      min-width: 0;
      margin-bottom: 8px;
      padding: 5px 6px 5px 8px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 6px;
    }

    .top-title {
      font-weight: 700;
      font-size: 12px;
      letter-spacing: -0.2px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1 1 auto;
      min-width: 0;
    }

    .top-brand-mark {
      width: 7px;
      height: 7px;
      flex: 0 0 auto;
      border-radius: 2px;
      background: var(--hub-accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--hub-accent) 16%, transparent);
    }

    .top-brand-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .top-title .status-pill {
      flex-shrink: 0;
    }

    .top-actions {
      display: flex;
      align-items: center;
      gap: 1px;
      flex-shrink: 0;
      padding: 1px;
      border-radius: 5px;
      background: transparent;
      border: 1px solid transparent;
    }

    .icon-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      border-radius: 4px;
      padding: 0;
      min-width: 26px;
      height: 26px;
      font-size: 12px;
      line-height: 1;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    .icon-btn-icon {
      font-size: 12px;
      line-height: 1;
      width: 1.1em;
      text-align: center;
      filter: grayscale(0.25);
      opacity: 0.92;
    }

    .icon-btn-text {
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0;
      white-space: nowrap;
      max-width: 3.2em;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .icon-btn:hover {
      background: var(--card-hover);
      color: var(--text-main);
    }

    button:focus-visible, input:focus-visible, select:focus-visible,
    [role="button"]:focus-visible {
      outline: 1px solid var(--hub-focus);
      outline-offset: 2px;
    }

    .icon-btn:hover .icon-btn-icon {
      filter: none;
      opacity: 1;
    }

    .icon-btn.active {
      background: var(--vscode-list-inactiveSelectionBackground, var(--card-hover));
      border-color: transparent;
      color: var(--claude-accent);
      font-weight: 500;
    }
    .icon-btn.active .icon-btn-icon {
      filter: none;
      opacity: 1;
    }
    /* Filter stays icon-only even when active (no short WS/All label). */
    #top-filter-btn .icon-btn-text {
      display: none !important;
    }

    /* Accordion Section */
    .section-wrap {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      margin-bottom: 8px;
      overflow: visible;
      transition: border-color 0.2s;
    }

    .section-wrap:hover {
      border-color: var(--vscode-focusBorder, var(--card-border));
    }

    .section-header {
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      background: var(--card-bg);
      border-bottom: 1px solid transparent;
      user-select: none;
    }

    .section-header:hover {
      background: var(--card-hover);
    }

    .section-header-title {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-sub {
      opacity: 0.7;
      font-weight: 400;
      font-size: 10.5px;
    }

    .caret {
      font-size: 9px;
      transition: transform 0.2s ease;
      color: var(--text-muted);
      display: inline-block;
    }

    .section-wrap.collapsed .caret {
      transform: rotate(-90deg);
    }

    .section-wrap.collapsed .section-header {
      border-bottom-color: transparent;
    }

    .section-wrap:not(.collapsed) .section-header {
      border-bottom-color: var(--card-border);
    }

    .section-body {
      padding: 10px;
      display: block;
    }

    .section-wrap.collapsed .section-body {
      display: none;
    }

    /* Status Pill */
    .status-pill {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      flex-shrink: 0;
      background: var(--vscode-badge-background, var(--vscode-input-background, var(--card-bg)));
      color: var(--vscode-badge-foreground, var(--text-main));
      border: 1px solid var(--vscode-contrastBorder, var(--card-border));
    }

    .status-pill.active {
      background: var(--vscode-list-inactiveSelectionBackground, var(--card-bg));
      color: var(--vscode-list-inactiveSelectionForeground, var(--text-main));
      border-color: var(--vscode-contrastBorder, var(--card-border));
    }

    .status-pill.idle {
      background: var(--vscode-input-background, var(--card-bg));
      color: var(--text-muted);
    }

    .status-pill.focused {
      background: var(--vscode-list-activeSelectionBackground, var(--card-bg));
      color: var(--vscode-list-activeSelectionForeground, var(--text-main));
      border-color: var(--vscode-contrastBorder, var(--hub-focus));
    }

    /* Progress Bar */
    .progress-bar-track {
      background: var(--vscode-input-background, var(--card-hover));
      border: 1px solid var(--card-border);
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin: 6px 0 8px 0;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: 3px;
      /* Keep the fill on the VS Code theme accent; never write an inline
         background from script, which would mask the user's theme color. */
      background-color: var(--vscode-textLink-foreground, var(--vscode-progressBar-background, var(--hub-accent)));
      background-image: none;
      transition: width 0.3s ease;
    }

    /* First-screen session overview */
    .monitor-overview-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      min-width: 0;
      margin-bottom: 2px;
    }

    .monitor-project-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
      font-size: 12.5px;
    }

    .monitor-context {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .monitor-context-label {
      font-size: 9.5px;
      color: var(--text-muted);
    }

    .monitor-context-value {
      font-weight: 700;
      font-size: 13px;
      color: var(--claude-accent);
      font-variant-numeric: tabular-nums;
    }

    /* Metrics Bubbles */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 4px;
      margin-bottom: 4px;
    }

    .metric-bubble {
      background: var(--vscode-input-background, var(--card-bg));
      border: 1px solid var(--card-border);
      border-radius: 4px;
      padding: 3px 6px;
      font-size: 11px;
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: space-between;
      min-width: 0;
    }

    .metric-bubble-lbl {
      color: var(--text-muted);
      white-space: nowrap;
    }

    .metric-bubble-val {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text-main);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Runtime facts: grid + wrapping values keeps model / branch / duration
       readable without the old single-line ellipsis clipping. */
    .hud-info-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 3px 10px;
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
      min-width: 0;
    }

    .hud-fact {
      display: flex;
      align-items: baseline;
      gap: 4px;
      min-width: 0;
    }

    /* 模型名称通常较长，独占一行避免在窄栏中逐字符换行。 */
    .hud-fact-model {
      grid-column: 1 / -1;
    }

    .hud-fact-label {
      flex: 0 0 auto;
      font-size: 11px;
      color: var(--text-muted);
    }

    .hud-fact-value {
      min-width: 0;
      color: var(--text-main);
      line-height: 1.35;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    #session-dur-label {
      white-space: normal;
      font-variant-numeric: tabular-nums;
    }

    /* Running Tool Banner */
    .running-bar {
      background: var(--vscode-list-hoverBackground, var(--card-bg));
      border: 1px solid var(--vscode-contrastBorder, var(--card-border));
      border-radius: 4px;
      padding: 6px 8px;
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }

    .spin {
      display: inline-block;
      animation: spin 1.5s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* 待办进行中使用细线圆环，保留动画以明确表示任务仍在运行。 */
    .todo-spinner {
      display: inline-block;
      width: 10px;
      height: 10px;
      flex-shrink: 0;
      border: 1.5px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      vertical-align: middle;
      -webkit-animation: spin 0.9s linear infinite;
      animation: spin 0.9s linear infinite;
      animation-play-state: running;
      will-change: transform;
    }

    .todo-badge-icon .todo-spinner {
      color: var(--vscode-progressBar-background, var(--hub-accent));
    }

    /* Enhanced Todo Card in Hub Dashboard (T1–T4 display polish) */
    .todo-item-card {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11px;
      padding: 6px 8px;
      border-radius: 6px;
      margin-bottom: 4px;
      background: var(--vscode-editor-background, var(--card-bg));
      border: 1px solid var(--vscode-contrastBorder, var(--card-border));
      transition: background 0.15s;
    }
    .todo-item-card:hover {
      background: var(--vscode-list-hoverBackground, var(--card-bg));
    }
    .todo-item-card.completed {
      opacity: 0.7;
    }
    .todo-item-card.in_progress {
      background: var(--vscode-list-inactiveSelectionBackground, var(--card-bg));
      border-color: var(--vscode-focusBorder, var(--card-border));
    }
    .todo-badge-icon {
      flex-shrink: 0;
      font-size: 12px;
      line-height: 1.35;
      margin-top: 1px;
    }
    .todo-card-main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .todo-title-row {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      min-width: 0;
    }
    .todo-title {
      flex: 1;
      min-width: 0;
      color: var(--text-main, inherit);
      font-weight: 600;
      font-size: 11px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .todo-item-card.completed .todo-title {
      text-decoration: line-through;
      opacity: 0.75;
      font-weight: 500;
    }
    .todo-status-chip {
      flex-shrink: 0;
      font-size: 9px;
      font-weight: 600;
      line-height: 1;
      padding: 3px 6px;
      border-radius: 999px;
      letter-spacing: 0.02em;
      white-space: nowrap;
      border: 1px solid transparent;
    }
    .todo-status-chip.pending {
      color: var(--text-muted);
      background: var(--vscode-input-background, var(--card-bg));
      border-color: var(--vscode-contrastBorder, var(--card-border));
    }
    .todo-status-chip.in_progress {
      color: var(--vscode-list-inactiveSelectionForeground, var(--text-main));
      background: var(--vscode-list-inactiveSelectionBackground, var(--card-bg));
      border-color: var(--vscode-focusBorder, var(--card-border));
    }
    .todo-status-chip.completed {
      color: var(--success-color);
      background: var(--vscode-input-background, var(--card-bg));
      border-color: var(--vscode-contrastBorder, var(--card-border));
    }
    .todo-body {
      color: var(--text-muted, #8b949e);
      font-size: 10px;
      font-weight: 400;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .todo-body.clamped {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
    }
    .todo-expand-btn {
      align-self: flex-start;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--claude-accent, #e07a5f);
      font-size: 10px;
      cursor: pointer;
      opacity: 0.9;
    }
    .todo-expand-btn:hover {
      opacity: 1;
      text-decoration: underline;
    }
    .todo-active-form {
      color: var(--text-muted, #8b949e);
      font-size: 10px;
      font-style: italic;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .todo-deps {
      color: var(--text-muted, #8b949e);
      font-size: 9px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .todo-item-card.pending-create {
      opacity: 0.85;
      border-style: dashed;
    }
    .todos-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 8px;
      font-size: 10px;
      color: var(--text-muted);
      padding: 2px 0 6px;
    }
    .todos-mode-chip {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      letter-spacing: 0.02em;
      border: 1px solid transparent;
    }
    .todos-mode-chip.task {
      color: var(--vscode-button-foreground, #ffffff);
      background: var(--vscode-button-background, #0e639c);
      border-color: var(--vscode-contrastBorder, transparent);
    }
    .todos-mode-chip.checklist {
      color: var(--vscode-list-inactiveSelectionForeground, var(--text-main));
      background: var(--vscode-list-inactiveSelectionBackground, var(--card-bg));
      border-color: var(--vscode-contrastBorder, var(--card-border));
    }
    .todos-mode-chip.none {
      color: var(--text-muted);
      background: var(--vscode-input-background, var(--card-bg));
      border-color: var(--vscode-contrastBorder, var(--card-border));
    }
    .todos-checklist-chip {
      font-size: 9px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 999px;
      color: var(--text-muted, #8b949e);
      border: 1px dashed rgba(139, 148, 158, 0.45);
      background: rgba(139, 148, 158, 0.06);
    }
    .todos-checklist-chip.hidden-mode {
      color: var(--claude-amber, #d97706);
      border-color: color-mix(in srgb, var(--claude-amber, #d97706) 55%, transparent);
    }
    .todos-source-chip {
      font-size: 9px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid rgba(139, 148, 158, 0.35);
      background: rgba(139, 148, 158, 0.1);
    }
    .todos-list-btn {
      margin: 0;
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid rgba(224, 122, 95, 0.45);
      background: transparent;
      color: var(--claude-accent, #e07a5f);
      font-size: 10px;
      cursor: pointer;
    }
    .todos-empty-hint {
      margin: 0 0 6px;
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid rgba(139, 148, 158, 0.28);
      background: rgba(139, 148, 158, 0.08);
      color: var(--text-muted, #8b949e);
      font-size: 10px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .todos-needs-list {
      color: var(--claude-amber, #d97706);
      font-weight: 600;
    }

    .todo-progress-track {
      height: 3px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
      margin: 4px 0 6px 0;
    }
    .todo-progress-fill {
      height: 100%;
      border-radius: 2px;
      background: var(--claude-accent, #e07a5f);
      transition: width 0.3s ease;
    }

    /* Session Manager Filters */
    .filter-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 8px;
    }

    .filter-chip {
      background: var(--vscode-button-secondaryBackground, var(--card-bg));
      border: 1px solid var(--vscode-contrastBorder, var(--card-border));
      color: var(--text-muted);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 10px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }

    .filter-chip:hover {
      background: var(--vscode-button-secondaryHoverBackground, var(--card-hover));
      color: var(--text-main);
    }

    .filter-chip.active {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border-color: var(--vscode-contrastBorder, transparent);
      font-weight: 600;
    }

    .chip-label-short {
      display: none;
    }

    .search-box {
      width: 100%;
      background: var(--vscode-input-background, var(--card-bg));
      border: 1px solid var(--vscode-input-border, var(--card-border));
      color: var(--vscode-input-foreground, var(--text-main));
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      margin-bottom: 8px;
      outline: none;
    }

    .search-box::placeholder {
      color: var(--vscode-input-placeholderForeground, var(--text-muted));
    }

    .search-box:focus {
      border-color: var(--vscode-focusBorder, var(--hub-accent));
    }

    /* Session Card */
    .session-card {
      position: relative;
      min-width: 0;
      overflow: visible;
      background: var(--card-bg);
      border: 1px solid var(--vscode-contrastBorder, var(--card-border));
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 6px;
      transition: all 0.15s ease;
    }

    .session-card:hover {
      background: var(--vscode-list-hoverBackground, var(--card-bg));
      border-color: var(--vscode-focusBorder, var(--card-border));
    }

    .session-card.focused {
      border-color: var(--vscode-focusBorder, var(--card-border));
      background: var(--vscode-list-inactiveSelectionBackground, var(--card-bg));
      color: var(--vscode-list-inactiveSelectionForeground, var(--text-main));
    }

    /* 标题优先占宽；badge 放不下时整体换行，避免长标签/多 badge 挤压标题。 */
    .session-header-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
      gap: 4px 6px;
      min-width: 0;
    }

    .session-title-text {
      flex: 1 1 12em;
      min-width: 0;
      color: var(--text-main);
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
      overflow-wrap: anywhere;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }

    .session-header-badges {
      display: flex;
      flex: 0 0 auto;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 3px;
      min-width: 0;
      max-width: 100%;
    }

    .session-header-badges .status-pill {
      font-size: 9px;
      padding: 1.5px 5px;
      max-width: 100%;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .session-header-badges .status-pill.agents {
      background: rgba(224, 122, 95, 0.15);
      color: var(--claude-accent);
      border: 1px solid rgba(224, 122, 95, 0.3);
      font-weight: 600;
    }

    .session-header-badges .status-pill.fork {
      background: rgba(78, 201, 176, 0.15);
      color: var(--success-color);
      font-weight: 600;
    }

    .session-tag-badge {
      flex: 0 1 auto;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 9px;
      line-height: 1.35;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(86, 156, 214, 0.15);
      color: var(--vscode-textLink-foreground, #9cdcfe);
    }

    .session-pin-badge {
      flex: 0 0 auto;
      font-size: 9px;
      line-height: 1.35;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(204, 167, 0, 0.2);
      color: var(--warning-color, #cca700);
    }

    .session-sub-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      min-width: 0;
      margin-bottom: 2px;
      color: var(--text-muted);
    }

    .session-project-name {
      flex: 1 1 auto;
      min-width: 0;
      font-weight: 500;
      font-size: 10.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .session-model-text {
      flex: 0 1 auto;
      min-width: 0;
      max-width: 45%;
      font-size: 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-muted);
    }

    .session-branch-row {
      display: flex;
      min-width: 0;
      margin-bottom: 2px;
      font-size: 10px;
      line-height: 1.35;
      color: var(--text-muted);
    }

    .session-branch-text {
      flex: 1 1 auto;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .session-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 10px;
      color: var(--text-muted);
      margin-bottom: 6px;
      flex-wrap: wrap;
      gap: 2px 8px;
      min-width: 0;
    }

    .session-meta-main {
      flex: 1 1 10em;
      min-width: 0;
      max-width: 100%;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .session-meta-side {
      flex: 0 1 auto;
      min-width: 0;
      max-width: 100%;
      line-height: 1.35;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .session-actions-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      border-top: 1px solid var(--card-border);
      padding-top: 6px;
    }

    .session-act-btn {
      flex: 0 0 auto;
      max-width: 100%;
      background: var(--vscode-button-secondaryBackground, var(--card-bg));
      border: 1px solid var(--card-border);
      color: var(--vscode-button-secondaryForeground, var(--text-main));
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      white-space: nowrap;
      overflow: hidden;
      transition: all 0.15s ease;
    }

    .session-act-btn .btn-icon {
      font-size: 10px;
      line-height: 1;
      flex-shrink: 0;
    }

    .session-act-btn .btn-text {
      white-space: nowrap;
    }

    .session-act-btn:hover {
      background: var(--card-hover);
      color: var(--text-main);
    }

    .session-act-btn.fork:hover {
      background: rgba(78, 201, 176, 0.2);
      border-color: var(--success-color);
      color: var(--success-color);
    }

    .session-act-btn.focus:hover {
      background: var(--vscode-button-secondaryHoverBackground, var(--card-hover));
      border-color: var(--hub-focus);
      color: var(--text-main);
    }

    .session-act-btn.delete:hover {
      background: rgba(244, 71, 71, 0.2);
      border-color: #f44747;
      color: #f44747;
    }

    .session-act-btn.resume:hover {
      background: var(--vscode-button-secondaryHoverBackground, var(--card-hover));
      border-color: var(--hub-focus);
      color: var(--text-main);
    }

    .session-act-btn.rename:hover {
      background: rgba(204, 167, 0, 0.2);
      border-color: #cca700;
      color: #cca700;
    }

    .session-act-btn:focus-visible {
      outline: 1px solid var(--vscode-focusBorder, var(--claude-accent));
      outline-offset: 1px;
    }

    .session-more-wrap {
      position: relative;
      flex: 0 0 auto;
      display: inline-flex;
    }

    .session-act-btn.more[aria-expanded="true"] {
      background: var(--vscode-list-inactiveSelectionBackground, var(--card-hover));
      border-color: var(--vscode-focusBorder, var(--claude-accent));
      color: var(--text-main);
    }

    .session-more-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      z-index: 40;
      display: none;
      flex-direction: column;
      min-width: 132px;
      max-width: min(220px, calc(100vw - 24px));
      box-sizing: border-box;
      padding: 4px;
      background: var(--vscode-menu-background, #252526);
      color: var(--vscode-menu-foreground, var(--text-main));
      border: 1px solid var(--vscode-menu-border, var(--card-border, rgba(255, 255, 255, 0.12)));
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    }

    .session-more-menu.open {
      display: flex;
    }

    .session-more-menu.drop-up {
      top: auto;
      bottom: calc(100% + 4px);
    }

    .session-menu-item {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      min-width: 0;
      padding: 4px 6px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 3px;
      color: inherit;
      font: inherit;
      font-size: 11px;
      text-align: left;
      cursor: pointer;
    }

    .session-menu-item:hover,
    .session-menu-item:focus-visible {
      background: var(--vscode-menu-selectionBackground, rgba(255, 255, 255, 0.12));
      color: var(--vscode-menu-selectionForeground, #fff);
      outline: 1px solid var(--vscode-focusBorder, var(--claude-accent));
      outline-offset: -1px;
    }

    .session-menu-item.danger {
      color: var(--danger-color);
    }

    .session-menu-item.danger:hover,
    .session-menu-item.danger:focus-visible {
      background: var(--vscode-menu-selectionBackground, var(--card-hover));
      color: var(--vscode-menu-selectionForeground, var(--danger-color));
    }

    .session-menu-icon {
      flex-shrink: 0;
      width: 14px;
      text-align: center;
    }

    .session-menu-text {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-menu-sep {
      height: 1px;
      margin: 3px 2px;
      background: var(--card-border, rgba(255, 255, 255, 0.1));
    }

    @container hub (max-width: 290px) {
      .session-more-menu {
        right: 0;
        min-width: 116px;
        max-width: calc(100vw - 16px);
      }
    }

    @supports not (container-type: inline-size) {
      @media (max-width: 306px) {
        .session-more-menu {
          right: 0;
          min-width: 116px;
          max-width: calc(100vw - 16px);
        }
      }
    }

    .agent-wt-actions {
      display: flex;
      gap: 4px;
      margin-top: 4px;
      flex-wrap: wrap;
    }

    .agent-wt-btn {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 3px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05);
      color: var(--text-main);
      cursor: pointer;
    }

    /* 待办头部保持单行，窄屏通过隐藏次要标签释放空间。 */
    .todos-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      font-size: 11px;
      margin-bottom: 4px;
      cursor: pointer;
      min-width: 0;
    }

    .todos-header-title {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      white-space: nowrap;
    }

    .todos-header-title > span:last-child {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .todos-header-title .caret {
      flex-shrink: 0;
    }

    .todos-header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .todos-clear-btn, .todos-sync-btn {
      background: transparent;
      border: 0;
      color: var(--text-muted);
      font: inherit;
      font-size: 10px;
      opacity: 0.75;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      white-space: nowrap;
    }

    .todos-clear-btn:hover, .todos-sync-btn:hover {
      opacity: 1;
      background: var(--card-hover);
    }

    .todos-activity {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 6px;
      color: var(--text-muted);
      font-size: 10px;
      line-height: 1.4;
      overflow-wrap: anywhere;
      padding: 4px 6px;
      margin: 0 0 6px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .todos-activity-part {
      color: var(--text-muted);
    }
    .todos-activity-sep {
      color: rgba(139, 148, 158, 0.55);
      user-select: none;
    }
    .todos-activity-warn {
      color: var(--claude-amber, #d97706);
      font-weight: 600;
    }


    .todos-plan-warn {
      display: none;
      margin: 0 0 6px;
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid color-mix(in srgb, var(--claude-amber, #d97706) 55%, transparent);
      background: color-mix(in srgb, var(--claude-amber, #d97706) 14%, transparent);
      color: var(--text-main, inherit);
      font-size: 10px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }

    .doc-btn-group {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }

    /* 使用命名容器，避免意外匹配其他嵌套容器。 */
    @container hub (max-width: 290px) {
      .top-actions .icon-btn-text {
        display: none;
      }
      .top-actions .icon-btn {
        min-width: 24px;
        height: 24px;
        padding: 0;
      }
      .header-sub, .chip-label-long, .todos-clear-text, .todos-sync-text, .todo-counter-detail {
        display: none;
      }
      .chip-label-short {
        display: inline;
      }
      .filter-chip {
        padding: 2px 6px;
        font-size: 9.5px;
      }
      .session-header-badges .badge-text {
        display: none;
      }
      .session-header-badges .status-pill {
        padding: 1px 4px;
      }
      .session-title-text {
        font-size: 11.5px;
      }
      .session-model-text {
        max-width: 55%;
      }
      .metrics-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .metric-bubble {
        min-width: 0;
        justify-content: space-between;
        padding: 2px 5px;
        font-size: 10px;
      }
    }
    @container hub (max-width: 260px) {
      .hud-info-row {
        grid-template-columns: minmax(0, 1fr);
        gap: 2px;
      }
      .doc-btn-group {
        flex-direction: column;
      }
      .session-act-btn {
        padding: 2.5px 2px;
        font-size: 9.5px;
        gap: 2px;
      }
    }
    @container hub (max-width: 230px) {
      .session-act-btn {
        padding: 4px 0;
      }
      .session-act-btn .btn-text {
        display: none;
      }
      .session-title-text {
        font-size: 11px;
      }
      .session-model-text {
        max-width: 50%;
      }
      .session-header-badges {
        gap: 2px;
      }
      .top-bar {
        flex-wrap: wrap;
        gap: 4px;
      }
      .top-actions {
        width: 100%;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      .top-actions .icon-btn {
        min-width: 24px;
        height: 24px;
        font-size: 11px;
      }
    }

    /* 旧版 Webview 才使用 viewport fallback；补偿 body 两侧共 16px padding。 */
    @supports not (container-type: inline-size) {
      @media (max-width: 306px) {
        .top-actions .icon-btn-text {
          display: none;
        }
        .header-sub, .chip-label-long, .todos-clear-text, .todos-sync-text, .todo-counter-detail {
          display: none;
        }
        .chip-label-short {
          display: inline;
        }
        .filter-chip {
          padding: 2px 6px;
          font-size: 9.5px;
        }
        .session-header-badges .badge-text {
          display: none;
        }
        .session-header-badges .status-pill {
          padding: 1px 4px;
        }
        .session-title-text {
          font-size: 11.5px;
        }
        .session-model-text {
          max-width: 55%;
        }
        .metrics-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .metric-bubble {
          min-width: 0;
          justify-content: space-between;
          padding: 2px 5px;
          font-size: 10px;
        }
      }
      @media (max-width: 276px) {
        .hud-info-row {
          grid-template-columns: minmax(0, 1fr);
          gap: 2px;
        }
        .doc-btn-group {
          flex-direction: column;
        }
        .session-act-btn {
          padding: 2.5px 2px;
          font-size: 9.5px;
          gap: 2px;
        }
      }
      @media (max-width: 246px) {
        .session-act-btn {
          padding: 4px 0;
        }
        .session-act-btn .btn-text {
          display: none;
        }
        .session-title-text {
          font-size: 11px;
        }
        .session-model-text {
          max-width: 50%;
        }
        .session-header-badges {
          gap: 2px;
        }
        .top-bar {
          flex-wrap: wrap;
          gap: 4px;
        }
        .top-actions {
          width: 100%;
          justify-content: flex-end;
        }
        .top-actions .icon-btn {
          min-width: 24px;
          height: 24px;
          font-size: 11px;
        }
      }
    }

    /* Pagination Bar */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      color: var(--text-muted);
      padding-top: 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      margin-top: 6px;
    }

    .page-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-main);
      border-radius: 3px;
      padding: 2px 8px;
      font-size: 10px;
      cursor: pointer;
    }

    .page-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    /* Features / MCP / Skills */
    .ext-toolbar {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 8px;
    }

    .ext-tabs-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .ext-tab-btn {
      cursor: pointer;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 3px;
      transition: all 0.15s ease;
    }

    .ext-tab-btn:hover {
      background: rgba(255, 255, 255, 0.07);
      color: var(--text-main);
    }

    .ext-tab-btn.active {
      background: rgba(224, 122, 95, 0.18);
      border-color: rgba(224, 122, 95, 0.45);
      color: var(--text-main);
      font-weight: 600;
    }

    .ext-tab-count {
      font-size: 9px;
      opacity: 0.8;
      background: rgba(0, 0, 0, 0.22);
      padding: 0 4px;
      border-radius: 6px;
    }

    .ext-search-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .ext-search-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 4px 22px 4px 8px;
      border-radius: 4px;
      font-size: 10.5px;
      outline: none;
    }

    .ext-search-input:focus {
      border-color: var(--claude-accent);
    }

    .ext-search-clear {
      position: absolute;
      right: 4px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 10px;
      padding: 2px 4px;
      line-height: 1;
    }

    .ext-search-clear:hover {
      color: var(--text-main);
    }

    .ext-group {
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.015);
      margin-bottom: 6px;
      overflow: hidden;
    }

    .ext-group:last-child {
      margin-bottom: 0;
    }

    .ext-group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 8px;
      cursor: pointer;
      user-select: none;
      background: rgba(255, 255, 255, 0.02);
      gap: 6px;
    }

    .ext-group-header:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .ext-group-title {
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: 600;
      font-size: 11px;
      min-width: 0;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
    }

    .ext-group-title-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ext-group.collapsed .ext-group-header .caret {
      transform: rotate(-90deg);
    }

    .ext-group-body {
      padding: 6px 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .ext-group.collapsed .ext-group-body {
      display: none;
    }

    .ext-group-badge {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.07);
      color: var(--text-muted);
      font-weight: normal;
      white-space: nowrap;
    }

    .ext-scope-pills {
      display: inline-flex;
      gap: 2px;
      background: rgba(0, 0, 0, 0.25);
      padding: 1px;
      border-radius: 4px;
    }

    .ext-scope-pill {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 3px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
    }

    .ext-scope-pill:hover {
      color: var(--text-main);
    }

    .ext-scope-pill.active {
      background: rgba(224, 122, 95, 0.22);
      color: var(--claude-accent);
      font-weight: 600;
    }

    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 260px;
      overflow-y: auto;
    }

    #sec-extensions.single-tab-view .feature-list {
      max-height: 360px;
    }

    .feature-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.03);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      gap: 6px;
    }

    .feature-item:hover {
      background: rgba(255, 255, 255, 0.055);
    }

    .skill-plugin-group {
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.14);
      overflow: hidden;
    }

    .skill-plugin-group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 7px;
      cursor: pointer;
      font-size: 10.5px;
      color: var(--text-main);
      user-select: none;
    }

    .skill-plugin-group-header:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .skill-plugin-group.collapsed .skill-plugin-group-header .caret {
      transform: rotate(-90deg);
    }

    .skill-plugin-group-body {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 4px 6px 6px 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .skill-plugin-group.collapsed .skill-plugin-group-body {
      display: none;
    }

    .ext-more-btn {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed rgba(255, 255, 255, 0.12);
      color: var(--text-muted);
      font-size: 10px;
      padding: 3px 6px;
      border-radius: 4px;
      cursor: pointer;
      text-align: center;
      margin-top: 2px;
    }

    .ext-more-btn:hover {
      color: var(--text-main);
      border-color: rgba(224, 122, 95, 0.4);
      background: rgba(224, 122, 95, 0.08);
    }

    .ext-skill-jump-pill {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: rgba(224, 122, 95, 0.14);
      color: var(--claude-accent);
      border: 1px solid rgba(224, 122, 95, 0.28);
      border-radius: 8px;
      padding: 0 5px;
      font-size: 9px;
      cursor: pointer;
      margin-left: 4px;
    }

    .ext-skill-jump-pill:hover {
      background: rgba(224, 122, 95, 0.26);
    }

    .mem-item-actions {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      margin-left: 6px;
      flex-shrink: 0;
    }

    .mem-act-btn {
      cursor: pointer;
      font-size: 9.5px;
      padding: 1px 5px;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-muted);
      line-height: 1.3;
    }

    .mem-act-btn:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .mem-act-btn.primary {
      color: var(--claude-accent);
      border-color: rgba(224, 122, 95, 0.28);
      background: rgba(224, 122, 95, 0.1);
    }

    .mem-act-btn.primary:hover {
      background: rgba(224, 122, 95, 0.22);
    }

    .mem-act-btn.danger:hover {
      color: var(--danger-color);
      border-color: rgba(244, 71, 71, 0.45);
      background: rgba(244, 71, 71, 0.14);
    }

    .mem-inline-form {
      background: rgba(18, 20, 24, 0.75);
      border: 1px solid rgba(224, 122, 95, 0.35);
      border-radius: 6px;
      padding: 8px 9px;
      margin-bottom: 6px;
      display: none;
      flex-direction: column;
      gap: 7px;
    }

    .mem-inline-form.visible {
      display: flex;
    }

    .mem-inline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 600;
      color: var(--claude-accent);
    }

    .mem-type-pills {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 4px;
    }

    .mem-type-pill {
      cursor: pointer;
      font-size: 10px;
      padding: 3px 4px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.09);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-muted);
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: all 0.15s ease;
    }

    .mem-type-pill:hover {
      background: rgba(255, 255, 255, 0.07);
      color: var(--text-main);
    }

    .mem-type-pill.active[data-mem-type="project"] {
      background: rgba(86, 156, 214, 0.2);
      border-color: rgba(86, 156, 214, 0.55);
      color: #9cdcfe;
      font-weight: 600;
    }

    .mem-type-pill.active[data-mem-type="feedback"] {
      background: rgba(204, 167, 0, 0.2);
      border-color: rgba(204, 167, 0, 0.55);
      color: var(--warning-color);
      font-weight: 600;
    }

    .mem-type-pill.active[data-mem-type="user"] {
      background: rgba(78, 201, 176, 0.2);
      border-color: rgba(78, 201, 176, 0.55);
      color: var(--success-color);
      font-weight: 600;
    }

    .mem-type-pill.active[data-mem-type="reference"] {
      background: rgba(197, 134, 192, 0.2);
      border-color: rgba(197, 134, 192, 0.55);
      color: #c586c0;
      font-weight: 600;
    }

    .mem-type-hint {
      font-size: 9.5px;
      color: var(--text-muted);
      line-height: 1.3;
      padding: 0 1px;
    }

    .mem-inline-field {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .mem-inline-label {
      font-size: 9.5px;
      color: var(--text-muted);
    }

    .mem-inline-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      border-radius: 4px;
      padding: 4px 7px;
      font-size: 11px;
      outline: none;
    }

    .mem-inline-input:focus {
      border-color: var(--claude-accent);
    }

    .mem-inline-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .switch-btn {
      cursor: pointer;
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: transparent;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .switch-btn.on {
      background: rgba(78, 201, 176, 0.2);
      border-color: var(--success-color);
      color: var(--success-color);
    }

    /* Input & Button */
    .form-group {
      margin-bottom: 8px;
    }

    .form-label {
      font-size: 10.5px;
      color: var(--text-muted);
      margin-bottom: 3px;
      display: block;
    }

    .form-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      outline: none;
    }

    .form-input:focus {
      border-color: var(--claude-accent);
    }

    .btn {
      width: 100%;
      padding: 5px 10px;
      border: 1px solid transparent;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
    }

    .btn-primary {
      background: var(--claude-accent);
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #cf6c52;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-main);
      border-color: var(--card-border);
      margin-top: 6px;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .toast {
      background: rgba(78, 201, 176, 0.2);
      color: var(--success-color);
      border: 1px solid rgba(78, 201, 176, 0.3);
      border-radius: 4px;
      padding: 4px;
      text-align: center;
      font-size: 10.5px;
      margin-top: 6px;
      display: none;
    }

    /* Agent Map & Subagents Tree */
    .agents-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      min-width: 0;
      font-weight: 500;
      font-size: 11px;
      margin-bottom: 5px;
      cursor: pointer;
    }

    .agents-heading-title {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      flex: 1;
    }

    .agents-heading-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .agents-tree {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-top: 4px;
    }

    .agent-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      padding: 6px 8px;
      transition: all 0.15s ease;
      cursor: pointer;
      position: relative;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
    }

    .agent-item:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(224, 122, 95, 0.4);
    }

    .agent-item.running {
      border-color: rgba(78, 201, 176, 0.4);
      background: rgba(78, 201, 176, 0.04);
    }

    .agent-item.completed {
      opacity: 0.85;
    }

    .agent-item.completed:hover {
      opacity: 1;
    }

    .agent-item.nested {
      margin-left: 16px;
      border-left: 2px solid var(--claude-accent);
      background: rgba(224, 122, 95, 0.04);
    }

    .agent-item.nested::before {
      content: '';
      position: absolute;
      left: -10px;
      top: 14px;
      width: 8px;
      height: 1px;
      background: rgba(255, 255, 255, 0.25);
    }

    .agent-item-header {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
      min-width: 0;
    }

    .agent-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1;
      overflow: hidden;
    }

    .agent-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--text-muted);
    }

    .agent-dot.running {
      background: #4ec9b0;
      box-shadow: 0 0 6px #4ec9b0;
      animation: pulse-dot 1.5s infinite;
    }

    .agent-dot.completed {
      background: rgba(255, 255, 255, 0.45);
    }

    .agent-dot.error {
      background: #f44747;
      box-shadow: 0 0 6px #f44747;
    }

    @keyframes pulse-dot {
      0% { opacity: 0.6; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.15); }
      100% { opacity: 0.6; transform: scale(0.9); }
    }

    .agent-name {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-main);
      min-width: 0;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .agent-type-badge {
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .agent-badges {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      max-width: 100%;
      flex-wrap: wrap;
      overflow: hidden;
      font-size: 10px;
      color: var(--text-muted);
    }

    .agent-meta-chip {
      background: rgba(255, 255, 255, 0.05);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 9.5px;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .agent-meta-branch {
      max-width: 11em;
    }

    .agent-desc {
      display: block;
      width: 100%;
      min-width: 0;
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 3px;
      line-height: 1.35;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .agent-detail-body {
      margin-top: 6px;
      padding-top: 5px;
      border-top: 1px dashed rgba(255, 255, 255, 0.08);
      font-size: 9.5px;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* Narrow sidebars use two rows so long worktree chips cannot overlap the
       agent name or push the card outside the Webview viewport. */
    @container hub (max-width: 290px) {
      .agent-item-header {
        flex-direction: column;
        align-items: stretch;
        gap: 3px;
      }

      .agent-title-row,
      .agent-badges {
        width: 100%;
      }

      .agent-badges {
        justify-content: flex-start;
      }
    }

    /* Fallback for Webviews without Container Query support. */
    @supports not (container-type: inline-size) {
      @media (max-width: 306px) {
        .agent-item-header {
          flex-direction: column;
          align-items: stretch;
          gap: 3px;
        }

        .agent-title-row,
        .agent-badges {
          width: 100%;
        }

        .agent-badges {
          justify-content: flex-start;
        }
      }
    }
    .bgjob-row {
      display: flex;
      gap: 6px;
      align-items: flex-start;
      padding: 4px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .bgjob-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-top: 4px;
      flex: 0 0 auto;
      background: #8b949e;
    }
    .bgjob-dot.running {
      background: #3fb950;
      box-shadow: 0 0 0 3px rgba(63, 185, 80, 0.18);
    }
    .bgjob-dot.fail {
      background: #f85149;
    }
    .bgjob-main {
      min-width: 0;
      flex: 1;
    }
    .bgjob-label {
      overflow-wrap: anywhere;
      line-height: 1.35;
    }
    .bgjob-meta {
      color: var(--text-muted);
      font-size: 10px;
      margin-top: 1px;
    }
  </style>
</head>
<body>
  <div id="app" class="hub-container">

  <!-- Top Action Bar -->
  <div class="top-bar">
    <div class="top-title" title="Claude Hub">
      <span class="top-brand-mark" aria-hidden="true"></span>
      <span class="top-brand-name">Claude</span>
      <span class="status-pill" id="global-status-pill">检测中</span>
    </div>
    <div class="top-actions" role="toolbar" aria-label="Hub actions">
      <button class="icon-btn" type="button" data-i18n-title="tbRefresh" title="" aria-label="" onclick="sendMessage(\'refresh\')"><span class="icon-btn-icon" aria-hidden="true">🔄</span><span class="icon-btn-text" data-role="label"></span></button>
      <button class="icon-btn" type="button" data-i18n-title="tbSlash" title="" aria-label="" onclick="sendMessage(\'slashCommand\')"><span class="icon-btn-icon" aria-hidden="true">/</span><span class="icon-btn-text" data-role="label"></span></button>
      <button class="icon-btn" type="button" data-i18n-title="tbSearch" title="" aria-label="" onclick="sendMessage(\'searchTranscript\')"><span class="icon-btn-icon" aria-hidden="true">🔍</span><span class="icon-btn-text" data-role="label"></span></button>
      <button class="icon-btn" type="button" data-i18n-title="tbCost" title="" aria-label="" onclick="sendMessage(\'workspaceCostReport\')"><span class="icon-btn-icon" aria-hidden="true">💵</span><span class="icon-btn-text" data-role="label"></span></button>
      <button class="icon-btn" type="button" data-i18n-title="tbTasks" title="" aria-label="" onclick="sendMessage(\'openBackgroundTasks\')"><span class="icon-btn-icon" aria-hidden="true">🧵</span><span class="icon-btn-text" data-role="label"></span></button>
      <button class="icon-btn" type="button" data-i18n-title="tbWorktree" title="" aria-label="" onclick="sendMessage(\'startWorktreeSession\')"><span class="icon-btn-icon" aria-hidden="true">🌿</span><span class="icon-btn-text" data-role="label"></span></button>
      <button class="icon-btn" id="top-filter-btn" type="button" data-i18n-title="tbFilter" title="" aria-label="" onclick="sendMessage(\'toggleFilter\')"><span class="icon-btn-icon" aria-hidden="true">📁</span><span class="icon-btn-text" data-role="label"></span></button>
    </div>
  </div>

  <!-- SECTION 1: 实时运行监控 (常驻展开) -->
  <div class="section-wrap" id="sec-monitor">
    <div class="section-header" role="button" tabindex="0" onkeydown="sectionHeaderKeydown(event, this)" onclick="toggleSection('sec-monitor')">
      <span class="section-header-title">
        <span class="caret">▼</span>
        <span>📊 实时运行监控</span>
      </span>
      <span id="session-status-badge" class="status-pill">--</span>
    </div>
    <div class="section-body">

      <!-- Session overview: project + context usage are the primary tier. -->
      <div class="monitor-overview">
        <div class="monitor-overview-head">
          <span id="proj-name" class="monitor-project-name" title="">未检测到会话</span>
          <span class="monitor-context">
            <span class="monitor-context-label">上下文</span>
            <span id="token-pct" class="monitor-context-value">0%</span>
          </span>
        </div>

        <!-- Token Limit Bar: fill color comes from the VS Code theme only. -->
        <div class="progress-bar-track" id="token-progress" role="progressbar" aria-label="上下文使用率" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div id="token-fill" class="progress-bar-fill" style="width: 0%;"></div>
        </div>

        <!-- Detail Bubbles -->
        <div class="metrics-row">
          <div class="metric-bubble"><span class="metric-bubble-lbl">输入</span><span id="m-in" class="metric-bubble-val">0</span></div>
          <div class="metric-bubble"><span class="metric-bubble-lbl">缓存</span><span id="m-cache" class="metric-bubble-val">0</span></div>
          <div class="metric-bubble"><span class="metric-bubble-lbl">写入</span><span id="m-write" class="metric-bubble-val">0</span></div>
          <div class="metric-bubble"><span class="metric-bubble-lbl">输出</span><span id="m-out" class="metric-bubble-val">0</span></div>
        </div>

        <!-- Runtime facts: values wrap instead of being clipped. -->
        <div class="hud-info-row" role="list" aria-label="运行摘要">
          <span class="hud-fact hud-fact-model" role="listitem"><span class="hud-fact-label">模型</span><span id="model-tag" class="hud-fact-value">--</span></span>
          <span class="hud-fact" role="listitem"><span class="hud-fact-label">分支</span><span id="branch-tag" class="hud-fact-value">--</span></span>
          <span class="hud-fact" role="listitem"><span class="hud-fact-label">消耗</span><span id="cost-label" class="hud-fact-value">--</span></span>
          <span class="hud-fact" role="listitem"><span class="hud-fact-label">时长</span><span id="session-dur-label" class="hud-fact-value">--</span></span>
        </div>
      </div>

      <!-- Live Running Tool Banner (Auto hidden when idle) -->
      <div id="running-tool-banner" class="running-bar" style="display: none;">
        <div>
          <span class="spin">🔄</span>
          <strong id="running-tool-name" style="color: var(--claude-accent);">Edit</strong>
          <span id="running-tool-target" style="opacity: 0.8; margin-left: 4px;"></span>
        </div>
        <span id="running-tool-dur" class="status-pill">0s</span>
      </div>

      <!-- Loop Status Banner (Auto hidden when no loop in session) -->
      <div id="loop-status-banner" class="running-bar" style="display: none; flex-direction: column; align-items: stretch; gap: 3px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span id="loop-status-icon">🔁</span>
            <strong id="loop-mode-label" style="color: var(--claude-accent);">Loop</strong>
            <span id="loop-meta-chips" style="opacity: 0.85; margin-left: 4px; font-size: 10px;"></span>
          </div>
          <span id="loop-countdown-pill" class="status-pill">--</span>
        </div>
        <div id="loop-reason-line" style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: none;"></div>
      </div>

      <!-- Tasks Checklist (Auto collapsed when empty, collapsible header) -->
      <div id="todos-container" style="margin-top: 8px; display: none;">
        <div class="todos-header" onclick="toggleTodosList()">
          <div class="todos-header-title">
            <span id="todos-caret" class="caret">▼</span>
            <span id="todos-title-label" title="">📋 待办任务</span>
          </div>
          <div class="todos-header-actions">
            <button type="button" id="todos-sync-btn" class="todos-sync-btn" style="display: none;" title="复制任务同步提示，发送到当前 Claude 对话" aria-label="复制任务同步提示" onclick="copyTodoSyncPrompt(event)">⧉<span class="todos-sync-text"> 复制提示</span></button>
            <button type="button" id="todos-clear-btn" class="todos-clear-btn" style="display: none;" title="Hide dashboard todos only — does not delete ~/.claude/tasks or stop slash /tasks jobs" aria-label="隐藏当前待办" onclick="clearCompletedTodos(event)">✕<span class="todos-clear-text"> 清除</span></button>
            <span id="todos-counter" class="status-pill">0/0</span>
          </div>
        </div>
        <div class="todo-progress-track">
          <div id="todos-progress-bar" class="todo-progress-fill" style="width: 0%;"></div>
        </div>
        <div class="todos-meta" id="todos-meta" style="display: none;">
          <span class="todos-mode-chip" id="todos-mode-chip"></span>
          <span class="todos-source-chip" id="todos-source-chip"></span>
          <span class="todos-checklist-chip" id="todos-checklist-chip" style="display: none;"></span>
          <span id="todos-list-label"></span>
          <button type="button" class="todos-list-btn" id="todos-pick-list-btn">List</button>
          <span class="todos-needs-list" id="todos-needs-list" style="display: none;"></span>
        </div>
        <div id="todos-activity" class="todos-activity" style="display: none;"></div>
        <div id="todos-plan-warn" class="todos-plan-warn" role="status"></div>
        <div id="todos-empty-hint" class="todos-empty-hint" style="display: none;"></div>
        <div id="todos-list"></div>
      </div>

      <!-- Agent Map: 协作代理拓扑 (有代理时自动展示) -->
      <div id="agents-container" style="margin-top: 8px; display: none;">
        <div class="agents-heading" onclick="toggleAgentsList()">
          <div class="agents-heading-title">
            <span id="agents-caret" class="caret" style="display: inline-block; font-size: 9px; transition: transform 0.2s;">▼</span>
            <span class="agents-heading-label">🤖 协作代理拓扑</span>
          </div>
          <span id="agents-counter" class="status-pill">0</span>
        </div>
        <div id="agents-list" class="agents-tree"></div>
      </div>


      <!-- Background jobs (slash /tasks; visible while the session looks idle) -->
      <div id="bgjobs-container" style="margin-top: 8px; display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 4px;">
          <span title="Claude Code 斜杠 /tasks 后台 shell 与异步 agent，不是会话待办">🧵 后台任务 <span style="opacity:0.7">(/tasks)</span> <span id="bgjobs-counter" class="status-pill">0</span></span>
          <button class="icon-btn" style="font-size:10px;padding:2px 6px;" onclick="sendMessage('openBackgroundTasks')" title="在 Claude Code 中打开 /tasks">打开</button>
        </div>
        <div id="bgjobs-list" style="font-size: 11px;"></div>
      </div>

      <!-- Subscription quota (opt-in) -->
      <div id="sub-container" style="margin-top: 8px; display: none;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-bottom: 2px;">
          <span>⏳ 订阅配额</span>
          <span id="sub-reset"></span>
        </div>
        <div class="progress-bar-track" style="margin: 0;">
          <div id="sub-fill" class="progress-bar-fill" style="width: 0%;"></div>
        </div>
        <div id="sub-meters" style="margin-top: 4px; font-size: 10px; color: var(--text-muted);"></div>
      </div>

    </div>
  </div>

  <!-- SECTION 2: 会话管理中心 (Session Manager - 默认展开) -->
  <div class="section-wrap" id="sec-sessions">
    <div class="section-header" role="button" tabindex="0" onkeydown="sectionHeaderKeydown(event, this)" onclick="toggleSection('sec-sessions')">
      <span class="section-header-title">
        <span class="caret">▼</span>
        <span>🕒 会话历史</span>
      </span>
      <span id="sessions-total-badge" class="status-pill">0 个会话</span>
    </div>
    <div class="section-body">

      <!-- Filter Chips -->
      <div class="filter-chips-row">
        <button class="filter-chip active" id="chip-all" onclick="setSessionFilter('all')">全部</button>
        <button class="filter-chip" id="chip-ws" onclick="setSessionFilter('workspace')"><span class="chip-label-long">当前工作区</span><span class="chip-label-short">工作区</span></button>
        <button class="filter-chip" id="chip-pinned" onclick="setSessionFilter('pinned')">置顶</button>
        <button class="filter-chip" id="chip-active" onclick="setSessionFilter('active')">活跃中</button>
      </div>

      <!-- Search Input -->
      <input type="text" class="search-box" id="session-search" placeholder="🔍 搜索标题、项目、分支、模型或标签..." oninput="onSearchInput(this.value)">

      <!-- Session Cards List -->
      <div id="session-cards-list">
        <div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 12px 0;">加载会话中...</div>
      </div>

      <!-- Pagination Bar -->
      <div class="pagination-bar" id="session-pagination">
        <button class="page-btn" id="btn-prev-page" onclick="prevPage()">◀ 上一页</button>
        <span id="pagination-info">第 1 / 1 页</span>
        <button class="page-btn" id="btn-next-page" onclick="nextPage()">下一页 ▶</button>
      </div>

    </div>
  </div>

  <!-- SECTION 3: 扩展能力 MCP, Plugins, Skills & Memory (默认收起) -->
  <div class="section-wrap collapsed" id="sec-extensions">
    <div class="section-header" role="button" tabindex="0" onkeydown="sectionHeaderKeydown(event, this)" onclick="toggleSection('sec-extensions')">
      <span class="section-header-title">
        <span class="caret">▼</span>
        <span>🧩 扩展与记忆</span>
      </span>
      <span id="ext-count-badge" class="status-pill">0 项</span>
    </div>
    <div class="section-body">

      <!-- 分类切换与快速搜索栏 -->
      <div class="ext-toolbar">
        <div class="ext-tabs-row" id="ext-category-tabs">
          <button type="button" class="ext-tab-btn active" data-action="setExtTab" data-ext-tab="all">全部</button>
          <button type="button" class="ext-tab-btn" data-action="setExtTab" data-ext-tab="skills">⚡ 技能 <span class="ext-tab-count" id="ext-tab-count-skills">0</span></button>
          <button type="button" class="ext-tab-btn" data-action="setExtTab" data-ext-tab="plugins">🧩 插件 <span class="ext-tab-count" id="ext-tab-count-plugins">0</span></button>
          <button type="button" class="ext-tab-btn" data-action="setExtTab" data-ext-tab="mcp">🔌 MCP <span class="ext-tab-count" id="ext-tab-count-mcp">0</span></button>
          <button type="button" class="ext-tab-btn" data-action="setExtTab" data-ext-tab="memory">🧠 记忆 <span class="ext-tab-count" id="ext-tab-count-memory">0</span></button>
          <button type="button" class="ext-tab-btn" data-action="setExtTab" data-ext-tab="agents">🤖 代理 <span class="ext-tab-count" id="ext-tab-count-agents">0</span></button>
        </div>
        <div class="ext-search-wrap">
          <input type="text" id="ext-search-input" class="ext-search-input" placeholder="🔍 搜索技能、插件、MCP 或记忆..." oninput="onExtSearchInput(this.value)" />
          <button type="button" id="ext-search-clear" class="ext-search-clear" onclick="clearExtSearch()" title="清空搜索" style="display: none;">✕</button>
        </div>
      </div>

      <!-- Auto Memory -->
      <div class="ext-group" id="ext-group-memory" data-ext-group="memory">
        <div class="ext-group-header" data-action="toggleExtGroup" data-ext-group="memory">
          <span class="ext-group-title">
            <span class="caret">▼</span>
            <span class="ext-group-title-text">🧠 项目记忆</span>
            <span class="ext-group-badge" id="ext-badge-memory">0</span>
          </span>
          <div style="display: flex; gap: 3px; flex-shrink: 0;">
            <button class="icon-btn" type="button" style="font-size: 9.5px; padding: 1px 5px;" data-action="openMemoryIndex" title="打开或初始化项目的 MEMORY.md 索引">MEMORY.md</button>
            <button class="icon-btn" type="button" style="font-size: 9.5px; padding: 1px 5px;" data-action="syncMemoryIndex" title="同步 MEMORY.md 索引（清理已删除文件引用并补全未登记条目）">🔄<span class="header-sub"> 同步</span></button>
            <button class="icon-btn" type="button" style="font-size: 9.5px; padding: 1px 6px; color: var(--claude-accent); border-color: rgba(224,122,95,0.3);" data-action="createMemoryEntry" title="新建结构化项目记忆条目">+ 新建</button>
          </div>
        </div>
        <div class="ext-group-body">
          <div id="memory-inline-form" class="mem-inline-form">
            <div class="mem-inline-header">
              <span id="mem-form-title">➕ 新建项目记忆</span>
              <div style="display: flex; gap: 4px; align-items: center;">
                <button type="button" class="mem-act-btn" data-action="openMemoryWizard" id="mem-form-wizard-btn" title="使用 VS Code 顶部命令面板输入框创建">顶部向导</button>
                <button type="button" class="mem-act-btn" data-action="cancelMemoryForm" title="关闭表单">✕</button>
              </div>
            </div>
            <input type="hidden" id="mem-form-type" value="project" />
            <div class="mem-inline-field">
              <span class="mem-inline-label">记忆分类 (Type)</span>
              <div class="mem-type-pills" id="mem-type-pills">
                <button type="button" class="mem-type-pill active" data-action="selectMemType" data-mem-type="project" title="project: 项目架构约束、进行中目标或非显而易见的约定">📁 项目约定</button>
                <button type="button" class="mem-type-pill" data-action="selectMemType" data-mem-type="feedback" title="feedback: 开发协作纠偏、用户确认的工作方式">💬 协作纠偏</button>
                <button type="button" class="mem-type-pill" data-action="selectMemType" data-mem-type="user" title="user: 用户角色、技术偏好与沟通习惯">👤 用户偏好</button>
                <button type="button" class="mem-type-pill" data-action="selectMemType" data-mem-type="reference" title="reference: 外部文档、看板、工单或服务地址索引">🔗 外部参考</button>
              </div>
              <div class="mem-type-hint" id="mem-type-hint">记录项目架构约束、进行中目标或非显而易见的约定</div>
            </div>
            <div class="mem-inline-field">
              <span class="mem-inline-label">文件标识 (Slug)</span>
              <input type="text" id="mem-form-slug" class="mem-inline-input" placeholder="例如：build-quirks 或 arch-rule" onkeydown="if(event.key==='Enter'){submitMemoryInlineForm();}else if(event.key==='Escape'){closeMemoryInlineForm();}" />
            </div>
            <div class="mem-inline-field">
              <span class="mem-inline-label">一句话摘要（写入 MEMORY.md 索引）</span>
              <input type="text" id="mem-form-desc" class="mem-inline-input" placeholder="简明描述该条记忆的适用场景..." onkeydown="if(event.key==='Enter'){submitMemoryInlineForm();}else if(event.key==='Escape'){closeMemoryInlineForm();}" />
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 2px;">
              <button type="button" class="mem-act-btn" style="padding: 3px 10px; font-size: 10px;" data-action="cancelMemoryForm">取消</button>
              <button type="button" class="mem-act-btn primary" style="padding: 3px 10px; font-size: 10px; font-weight: 600;" data-action="submitMemoryForm" id="mem-form-submit-btn">保存并打开</button>
            </div>
          </div>
          <div id="memory-list" class="feature-list">
            <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
          </div>
        </div>
      </div>

      <!-- Plugins -->
      <div class="ext-group" id="ext-group-plugins" data-ext-group="plugins">
        <div class="ext-group-header" data-action="toggleExtGroup" data-ext-group="plugins">
          <span class="ext-group-title">
            <span class="caret">▼</span>
            <span class="ext-group-title-text">🧩 已安装插件</span>
            <span class="ext-group-badge" id="ext-badge-plugins">0</span>
          </span>
        </div>
        <div class="ext-group-body">
          <div id="plugins-list" class="feature-list">
            <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
          </div>
        </div>
      </div>

      <!-- MCP Servers -->
      <div class="ext-group" id="ext-group-mcp" data-ext-group="mcp">
        <div class="ext-group-header" data-action="toggleExtGroup" data-ext-group="mcp">
          <span class="ext-group-title">
            <span class="caret">▼</span>
            <span class="ext-group-title-text">🔌 MCP 服务器</span>
            <span class="ext-group-badge" id="ext-badge-mcp">0</span>
          </span>
        </div>
        <div class="ext-group-body">
          <div id="mcp-servers-list" class="feature-list">
            <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
          </div>
        </div>
      </div>

      <!-- Custom Agents -->
      <div class="ext-group" id="ext-group-agents" data-ext-group="agents">
        <div class="ext-group-header" data-action="toggleExtGroup" data-ext-group="agents">
          <span class="ext-group-title">
            <span class="caret">▼</span>
            <span class="ext-group-title-text">🤖 自定义代理</span>
            <span class="ext-group-badge" id="ext-badge-agents">0</span>
          </span>
        </div>
        <div class="ext-group-body">
          <div id="custom-agents-list" class="feature-list">
            <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
          </div>
        </div>
      </div>

      <!-- Skills -->
      <div class="ext-group" id="ext-group-skills" data-ext-group="skills">
        <div class="ext-group-header" data-action="toggleExtGroup" data-ext-group="skills">
          <span class="ext-group-title">
            <span class="caret">▼</span>
            <span class="ext-group-title-text">⚡ 已安装技能</span>
            <span class="ext-group-badge" id="ext-badge-skills">0</span>
          </span>
          <div class="ext-scope-pills" id="skill-scope-bar">
            <button type="button" class="ext-scope-pill active" data-action="setSkillScope" data-skill-scope="all" id="skill-scope-all">全部</button>
            <button type="button" class="ext-scope-pill" data-action="setSkillScope" data-skill-scope="local" id="skill-scope-local">本地</button>
            <button type="button" class="ext-scope-pill" data-action="setSkillScope" data-skill-scope="plugin" id="skill-scope-plugin">插件</button>
          </div>
        </div>
        <div class="ext-group-body">
          <div id="skills-list" class="feature-list">
            <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- SECTION 4: 网络代理与高级环境 (默认收起) -->
  <div class="section-wrap collapsed" id="sec-advanced">
    <div class="section-header" role="button" tabindex="0" onkeydown="sectionHeaderKeydown(event, this)" onclick="toggleSection('sec-advanced')">
      <span class="section-header-title">
        <span class="caret">▼</span>
        <span>⚙️ 高级 / 环境配置</span>
      </span>
      <span class="status-pill" style="font-size: 9px;">配置</span>
    </div>
    <div class="section-body">

      <div id="todo-tools-panel" style="margin: 10px 0; padding: 8px; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;">
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px;" id="todo-tools-title">Official Task mode</div>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; cursor: pointer;">
          <input type="checkbox" id="todo-tools-toggle" />
          <span id="todo-tools-toggle-label">Enable official Task tools (TaskCreate / TaskUpdate / TaskList)</span>
        </label>
        <div id="todo-tools-status" style="font-size: 10px; color: var(--text-muted); margin-top: 6px; line-height: 1.4;"></div>
        <div id="todo-tools-caveat" style="font-size: 10px; color: #cca700; margin-top: 6px; line-height: 1.4;">New sessions only. Writes CLAUDE_CODE_ENABLE_TODO_TOOLS=1 and CLAUDE_CODE_ENABLE_TASKS=1.</div>
      </div>

      <button class="btn btn-secondary" onclick="sendMessage('openSettingsJson')">⚙️ 打开 Claude settings.json</button>
      <div class="doc-btn-group">
        <button class="btn btn-secondary" id="btn-open-agents-md" style="flex: 1; margin: 0; padding: 7px 4px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="sendMessage('openProjectDoc', { docType: 'AGENTS' })" title="打开或创建项目根目录 AGENTS.md (支持新版 Agent 规范)">🤖 打开 AGENTS.md</button>
        <button class="btn btn-secondary" id="btn-open-claude-md" style="flex: 1; margin: 0; padding: 7px 4px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="sendMessage('openProjectDoc', { docType: 'CLAUDE' })" title="打开或创建项目根目录 CLAUDE.md (经典项目说明)">📝 打开 CLAUDE.md</button>
      </div>
</div>
  </div>

  </div><!-- end #app.hub-container -->

  <script>
    const vscode = acquireVsCodeApi();
    let hubUiStrings = {
      planNoChecklistWarn: 'Plan has no GFM checklist — phase status may be inaccurate. Prefer TaskCreate/TaskUpdate/TaskList, or checklist marks. (Hub todos ≠ slash /tasks.)',
      chipPending: 'Pending',
      chipActive: 'In progress',
      chipDone: 'Done',
      expand: 'Expand',
      collapse: 'Collapse',
      hubTodosTitle: 'Session tasks',
      hubTodosHint: 'Hub todos (Task tools), not slash /tasks.',
      clearHideOnly: 'Hide dashboard todos only; does not delete task files.',
      pickList: 'Choose list',
      needsList: 'Choose a task list to bind',
      creating: 'Creating…',
      depends: 'Depends on',
      blocks: 'Blocks',
      sourceNative: 'Native disk',
      sourceTasks: 'Task tools',
      sourceTodoWrite: 'TodoWrite',
      sourcePlan: 'Plan',
      sourceMarkdown: 'Checklist',
      sourceNone: 'No source',
      listId: 'List: {id}',
      optInHint: 'No Task or Checklist todos yet.',
      todoToolsTitle: 'Official Task mode',
      todoToolsToggle: 'Enable official Task tools (TaskCreate / TaskUpdate / TaskList)',
      todoToolsCaveat: 'New sessions only. Writes CLAUDE_CODE_ENABLE_TODO_TOOLS=1 and CLAUDE_CODE_ENABLE_TASKS=1.',
      todoToolsOn: 'On (settings.local.json)',
      todoToolsOff: 'Off',
      todoToolsEffectiveOn: 'Effective env: on',
      todoToolsEffectiveOff: 'Effective env: off',
      todoToolsObserved: 'Task tools observed in a session',
      todoToolsHooksNote: 'Hub hooks/bridge not installed (env-only).',
      modeTask: 'Task',
      modeChecklist: 'Checklist',
      modeNone: 'No todos',
      checklistAlso: 'Checklist also present',
      checklistHidden: 'Checklist hidden (tasks-only)',
    };
    function applyHubUiStrings(ui) {
      if (!ui || typeof ui !== 'object') return;
      if (typeof ui.planNoChecklistWarn === 'string') hubUiStrings.planNoChecklistWarn = ui.planNoChecklistWarn;
      if (typeof ui.chipPending === 'string') hubUiStrings.chipPending = ui.chipPending;
      if (typeof ui.chipActive === 'string') hubUiStrings.chipActive = ui.chipActive;
      if (typeof ui.chipDone === 'string') hubUiStrings.chipDone = ui.chipDone;
      if (typeof ui.expand === 'string') hubUiStrings.expand = ui.expand;
      if (typeof ui.collapse === 'string') hubUiStrings.collapse = ui.collapse;
      const copyKeys = ['tbRefresh','tbRefreshShort','tbSlash','tbSearch','tbCost','tbTasks','tbWorktree','tbFilter','tbFilterWs','tbFilterAll','tbFilterWsShort','tbFilterAllShort','todoToolsTitle','todoToolsToggle','todoToolsCaveat','todoToolsOn','todoToolsOff','todoToolsEffectiveOn','todoToolsEffectiveOff','todoToolsObserved','todoToolsHooksNote','hubTodosTitle','hubTodosHint','clearHideOnly','pickList','needsList','creating','depends','blocks','sourceNative','sourceTasks','sourceTodoWrite','sourcePlan','sourceMarkdown','sourceNone','listId','optInHint','modeTask','modeChecklist','modeNone','checklistAlso','checklistHidden'];
      for (const k of copyKeys) { if (typeof ui[k] === 'string') hubUiStrings[k] = ui[k]; }
      const titleEl = document.getElementById('todos-title-label');
      if (titleEl && hubUiStrings.hubTodosTitle) {
        titleEl.textContent = '📋 ' + hubUiStrings.hubTodosTitle;
        titleEl.title = hubUiStrings.hubTodosHint || '';
      }
      const clearBtn = document.getElementById('todos-clear-btn');
      if (clearBtn && hubUiStrings.clearHideOnly) clearBtn.title = hubUiStrings.clearHideOnly;
      const pickBtn = document.getElementById('todos-pick-list-btn');
      if (pickBtn && hubUiStrings.pickList) pickBtn.textContent = hubUiStrings.pickList;
}


    // 同步保存至 Webview 与扩展全局状态，重建视图及重启后均可恢复。
    const savedUiState = vscode.getState() || {};
    const sectionIds = ['sec-monitor', 'sec-sessions', 'sec-extensions', 'sec-advanced'];
    let uiStateRestored = false;
    let pendingScrollY = null;
    let uiStateSaveTimer = null;
    function saveUiState() {
      const sections = {};
      sectionIds.forEach(id => { sections[id] = document.getElementById(id).classList.contains('collapsed'); });
      const state = {
        sections,
        sessionFilter: currentFilter,
        searchKeyword,
        extActiveTab,
        extSkillScope,
        extSearchQuery,
        extGroupManualState: { ...extGroupManualState },
        extShowAllPlugins,
        extShowAllLocalSkills,
        scrollY: window.scrollY,
      };
      vscode.setState(state);
      if (uiStateSaveTimer) clearTimeout(uiStateSaveTimer);
      uiStateSaveTimer = setTimeout(() => sendMessage('saveUiState', { state }), 200);
    }
    function restoreDashboardScroll() {
      if (pendingScrollY === null) return;
      window.scrollTo(0, pendingScrollY);
      pendingScrollY = null;
    }
    function restoreUiState(state) {
      if (uiStateRestored) return;
      uiStateRestored = true;
      state = state && typeof state === 'object' ? state : savedUiState;
      if (!state || typeof state !== 'object') return;
      sectionIds.forEach(id => {
        let collapsed = state.sections && state.sections[id];
        if (typeof collapsed !== 'boolean') {
          try {
            const legacy = localStorage.getItem('ch_sec_' + id);
            if (legacy === '0' || legacy === '1') collapsed = legacy === '0';
          } catch (e) {}
        }
        if (typeof collapsed === 'boolean') {
          document.getElementById(id).classList.toggle('collapsed', collapsed);
          syncSectionState(document.getElementById(id));
        }
      });
      if (['all', 'workspace', 'pinned', 'active'].includes(state.sessionFilter)) {
        currentFilter = state.sessionFilter;
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        const chip = document.getElementById({ all: 'chip-all', workspace: 'chip-ws', pinned: 'chip-pinned', active: 'chip-active' }[currentFilter]);
        if (chip) chip.classList.add('active');
      }
      if (typeof state.searchKeyword === 'string') {
        searchKeyword = state.searchKeyword.slice(0, 200).toLowerCase().trim();
        document.getElementById('session-search').value = searchKeyword;
      }
      if (['all', 'skills', 'plugins', 'mcp', 'memory', 'agents'].includes(state.extActiveTab)) extActiveTab = state.extActiveTab;
      if (['all', 'local', 'plugin'].includes(state.extSkillScope)) extSkillScope = state.extSkillScope;
      if (typeof state.extSearchQuery === 'string') {
        extSearchQuery = state.extSearchQuery.slice(0, 200);
        document.getElementById('ext-search-input').value = extSearchQuery;
        document.getElementById('ext-search-clear').style.display = extSearchQuery.trim() ? 'block' : 'none';
      }
      if (state.extGroupManualState && typeof state.extGroupManualState === 'object') {
        ['memory', 'plugins', 'mcp', 'agents', 'skills'].forEach(key => {
          if (typeof state.extGroupManualState[key] === 'boolean') extGroupManualState[key] = state.extGroupManualState[key];
        });
      }
      extShowAllPlugins = state.extShowAllPlugins === true;
      extShowAllLocalSkills = state.extShowAllLocalSkills === true;
      if (Number.isFinite(state.scrollY) && state.scrollY >= 0) pendingScrollY = state.scrollY;
      renderExtensionsPanel();
      renderSessionsList();
    }

    // 保存折叠状态，同时让键盘和辅助技术获取当前状态。
    function syncSectionState(el) {
      const header = el.querySelector('.section-header');
      if (header) {
        header.setAttribute('aria-expanded', String(!el.classList.contains('collapsed')));
        header.setAttribute('aria-controls', el.id + '-body');
        const body = el.querySelector('.section-body');
        if (body) body.id = el.id + '-body';
      }
    }
    function sectionHeaderKeydown(event, header) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        header.click();
      }
    }
    function toggleSection(id) {
      const el = document.getElementById(id);
      el.classList.toggle('collapsed');
      syncSectionState(el);
      try { localStorage.setItem('ch_sec_' + id, el.classList.contains('collapsed') ? '0' : '1'); } catch (e) {}
      saveUiState();
    }

    sectionIds.forEach(id => syncSectionState(document.getElementById(id)));

    let userToggledAgents = false;
    let userManuallyOpened = false;
    let userToggledTodos = false;
    let userManuallyOpenedTodos = false;
    const expandedAgentKeys = new Set();

    function clearCompletedTodos(event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      const wrap = document.getElementById('todos-container');
      if (wrap) wrap.style.display = 'none';
      const list = document.getElementById('todos-list');
      if (list) list.innerHTML = '';
      userToggledTodos = false;
      userManuallyOpenedTodos = false;
      if (currentSession && currentSession.sessionId) {
        sendMessage('clearTodos', { sessionId: currentSession.sessionId });
      }
    }

    function copyTodoSyncPrompt(event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      if (currentSession) sendMessage('copyTaskSyncPrompt');
    }

    function shouldWarnPlanWithoutChecklist(session) {
      const policy = session && session.projectTodoPolicy;
      if (!policy || !policy.warn_plan_without_checklist) return false;
      const plan = session.plan;
      if (!plan) return false;
      return plan.isChecklist !== true;
    }

    function updateTodosPlanWarn(session) {
      const el = document.getElementById('todos-plan-warn');
      if (!el) return;
      if (shouldWarnPlanWithoutChecklist(session)) {
        el.textContent = '⚠️ ' + (hubUiStrings.planNoChecklistWarn || '');
        el.style.display = 'block';
      } else {
        el.textContent = '';
        el.style.display = 'none';
      }
    }

    const todoExpandState = new Map();

    function stripTodoMarkdownNoise(text) {
      if (!text) return '';
      let s = String(text).trim();
      s = s.replace(/^\\*\\*\\s*/, '').replace(/\\s*\\*\\*$/, '');
      s = s.replace(/\\*\\*/g, '');
      return s.replace(/\\s+/g, ' ').trim();
    }

    function splitTodoDisplay(td) {
      const rawContent = typeof td.content === 'string' ? td.content : '';
      const content = stripTodoMarkdownNoise(rawContent);
      const description = typeof td.description === 'string' ? td.description.trim() : '';
      const key = (typeof td.id === 'string' && td.id) ? td.id : (content || rawContent || 'todo');
      let title = content || 'Task';
      let body = description;
      if (!body) {
        const lines = rawContent.replace(/\\r\\n/g, '\\n').split('\\n').map(function(l) {
          return stripTodoMarkdownNoise(l);
        }).filter(Boolean);
        const first = lines[0] || content;
        const taskTitle = first.match(/^任务\\s*\\d+\\s*[:：].+$/);
        if (taskTitle && first.length <= 56) {
          title = first;
          body = lines.slice(1).join('\\n').trim();
          if (!body && content.length > first.length) {
            const idx = content.indexOf(first);
            body = content.slice(idx >= 0 ? idx + first.length : first.length).trim();
          }
        } else if (lines.length > 1 && first.length <= 42) {
          title = first;
          body = lines.slice(1).join('\\n').trim();
        } else if (content.length > 42) {
          const sent = content.search(/[。！？\\n]/);
          if (sent > 8 && sent <= 48) {
            title = content.slice(0, sent);
            body = content.slice(sent + 1).trim();
          } else {
            title = content.slice(0, 36).trim() + '…';
            body = content;
          }
        }
      } else {
        title = content || title;
      }
      if (!title) title = 'Task';
      if (!(body === content && title.endsWith('…')) && body.startsWith(title)) {
        body = body.slice(title.length).replace(/^[\\s:：\\-—]+/, '').trim();
      }
      const subtitle = (td.status === 'in_progress' && typeof td.activeForm === 'string' && td.activeForm.trim())
        ? td.activeForm.trim() : '';
      return { title: title, body: body, subtitle: subtitle, key: key };
    }

    function todoNeedsClamp(body) {
      if (!body) return false;
      const lines = body.split(/\\n/).length;
      return body.length > 90 || lines > 2;
    }

    function toggleTodoExpand(ev, key) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      todoExpandState.set(key, !todoExpandState.get(key));
      if (currentSession) renderTodosList(currentSession);
    }

    function getTodoChipLabel(status) {
      if (status === 'completed') return hubUiStrings.chipDone || 'Done';
      if (status === 'in_progress') return hubUiStrings.chipActive || 'In progress';
      return hubUiStrings.chipPending || 'Pending';
    }

    function getTodoActivityParts(session) {
      const agents = session.agents || [];
      const running = agents.filter(a => a.status === 'running').length;
      const ended = agents.length - running;
      const parts = [];
      const activeTodo = (session.todos || []).find(t => t.status === 'in_progress' && t.activeForm);
      if (activeTodo && activeTodo.activeForm) {
        parts.push({ text: activeTodo.activeForm, warn: false });
      }
      if (agents.length) {
        parts.push({
          text: 'Agent ' + (running ? running + ' 运行 · ' : '') + ended + '/' + agents.length + ' 已结束',
          warn: false
        });
      }
      if (!activeTodo) {
      if (!session.isIdle && session.activeTools && session.activeTools.length) {
        parts.push({ text: '工具 ' + session.activeTools[0].name + ' 运行中', warn: false });
      } else if (!session.isIdle && session.lastActivity &&
          (!session.currentTurnStartTime ||
            session.lastActivity.timestamp >= new Date(session.currentTurnStartTime).getTime())) {
        parts.push({ text: '最近 ' + session.lastActivity.name, warn: false });
      }
      }
      if (parts.length && (session.taskSource === 'plan' || session.taskSource === 'markdown') &&
          session.todos.every(t => t.status === 'pending')) {
        parts.push({ text: '阶段待确认', warn: true });
      }
      return parts;
    }

    function getTodoActivityText(session) {
      return getTodoActivityParts(session).map(p => p.text).join(' · ');
    }

    function renderTodosActivity(activityEl, session) {
      const parts = getTodoActivityParts(session);
      if (!parts.length) {
        activityEl.textContent = '';
        activityEl.style.display = 'none';
        return;
      }
      activityEl.innerHTML = parts.map(function(p, i) {
        const sep = i === 0 ? '' : '<span class="todos-activity-sep">·</span>';
        const cls = p.warn ? 'todos-activity-part todos-activity-warn' : 'todos-activity-part';
        return sep + '<span class="' + cls + '">' + escapeHtml(p.text) + '</span>';
      }).join('');
      activityEl.style.display = 'flex';
    }

    function resolveTodoLabel(session, id) {
      const hit = (session.todos || []).find(t => t.id === id);
      return hit ? hit.content : id;
    }

    function formatTodoDeps(session, td) {
      const bits = [];
      if (Array.isArray(td.blockedBy) && td.blockedBy.length) {
        bits.push((hubUiStrings.depends || 'Depends on') + ': ' + td.blockedBy.map(function(id) {
          return resolveTodoLabel(session, id);
        }).join(', '));
      }
      if (Array.isArray(td.blocks) && td.blocks.length) {
        bits.push((hubUiStrings.blocks || 'Blocks') + ': ' + td.blocks.map(function(id) {
          return resolveTodoLabel(session, id);
        }).join(', '));
      }
      return bits.length ? '<div class="todo-deps">' + escapeHtml(bits.join(' · ')) + '</div>' : '';
    }

    function updateTodosMeta(s) {
      const meta = document.getElementById('todos-meta');
      if (!meta) return;
      const hasTodos = (s.todos && s.todos.length) || (s.pendingTaskCreates && s.pendingTaskCreates.length) || s.taskListNeedsSelection || s.taskListId;
      if (!hasTodos && !(s.taskSource && s.taskSource !== 'none')) {
        meta.style.display = 'none';
        return;
      }
      meta.style.display = 'flex';
      const modeChip = document.getElementById('todos-mode-chip');
      const chip = document.getElementById('todos-source-chip');
      const checkChip = document.getElementById('todos-checklist-chip');
      const listLabel = document.getElementById('todos-list-label');
      const needs = document.getElementById('todos-needs-list');
      const pick = document.getElementById('todos-pick-list-btn');
      const mode = s.todoMode || (['native','tasks','todoWrite'].indexOf(s.taskSource) >= 0 ? 'task' : (['plan','markdown'].indexOf(s.taskSource) >= 0 ? 'checklist' : 'none'));
      if (modeChip) {
        modeChip.className = 'todos-mode-chip ' + mode;
        modeChip.textContent = mode === 'task' ? (hubUiStrings.modeTask || 'Task')
          : (mode === 'checklist' ? (hubUiStrings.modeChecklist || 'Checklist') : (hubUiStrings.modeNone || 'No todos'));
      }
      const sourceMap = {
        native: hubUiStrings.sourceNative,
        tasks: hubUiStrings.sourceTasks,
        todoWrite: hubUiStrings.sourceTodoWrite,
        plan: hubUiStrings.sourcePlan,
        markdown: hubUiStrings.sourceMarkdown,
        none: hubUiStrings.sourceNone,
      };
      if (chip) {
        chip.textContent = sourceMap[s.taskSource] || sourceMap.none || (s.taskSource || '');
        chip.style.display = (s.taskSource && s.taskSource !== 'none') ? 'inline' : 'none';
      }
      if (checkChip) {
        const tasksOnlyHidden = s.preferSource === 'tasks' && s.checklistAvailable && s.checklistFillAllowed === false;
        const also = mode === 'task' && s.checklistAvailable && s.checklistFillAllowed !== false;
        if (tasksOnlyHidden) {
          checkChip.style.display = 'inline';
          checkChip.className = 'todos-checklist-chip hidden-mode';
          checkChip.textContent = hubUiStrings.checklistHidden || 'Checklist hidden (tasks-only)';
        } else if (also) {
          checkChip.style.display = 'inline';
          checkChip.className = 'todos-checklist-chip';
          checkChip.textContent = hubUiStrings.checklistAlso || 'Checklist also present';
        } else {
          checkChip.style.display = 'none';
          checkChip.textContent = '';
        }
      }
      if (listLabel) {
        if (s.taskListId) {
          const tmpl = hubUiStrings.listId || 'List: {id}';
          listLabel.textContent = tmpl.replace('{id}', s.taskListId);
        } else {
          listLabel.textContent = '';
        }
      }
      if (pick) {
        pick.textContent = hubUiStrings.pickList || 'Choose list';
        pick.onclick = function(ev) {
          if (ev) ev.stopPropagation();
          sendMessage('selectTaskList');
        };
      }
      if (needs) {
        if (s.taskListNeedsSelection) {
          needs.style.display = 'inline';
          needs.textContent = hubUiStrings.needsList || '';
        } else {
          needs.style.display = 'none';
          needs.textContent = '';
        }
      }
      const clearBtn = document.getElementById('todos-clear-btn');
      if (clearBtn && hubUiStrings.clearHideOnly) clearBtn.title = hubUiStrings.clearHideOnly;
    }


    function updateTodosEmptyHint(s) {
      const el = document.getElementById('todos-empty-hint');
      if (!el) return;
      const hasDurable = s.todos && s.todos.length > 0;
      const hasPending = s.pendingTaskCreates && s.pendingTaskCreates.length > 0;
      const show = !hasDurable && !hasPending && !s.taskToolsObserved && (s.taskSource === 'none' || !s.taskSource);
      if (show) {
        el.style.display = 'block';
        el.textContent = hubUiStrings.optInHint || 'Turn on official Task mode (CLAUDE_CODE_ENABLE_TASKS) in Advanced settings.';
      } else {
        el.style.display = 'none';
        el.textContent = '';
      }
    }

    function renderTodosList(s) {
      const todosList = document.getElementById('todos-list');
      if (!todosList || !s) return;
      updateTodosMeta(s);
      const durable = Array.isArray(s.todos) ? s.todos : [];
      const pending = Array.isArray(s.pendingTaskCreates) ? s.pendingTaskCreates : [];
      const pendingHtml = pending.map(function(pc) {
        const subject = pc.subject || 'Task';
        return '<div class="todo-item-card pending pending-create" data-pending-tool="' + escapeHtml(pc.toolUseId || '') + '">' +
          '<span class="todo-badge-icon"><span class="todo-spinner" role="img" aria-label="creating"></span></span>' +
          '<div class="todo-card-main">' +
            '<div class="todo-title-row">' +
              '<span class="todo-title">' + escapeHtml(subject) + '</span>' +
              '<span class="todo-status-chip pending">' + escapeHtml(hubUiStrings.creating || 'Creating…') + '</span>' +
            '</div>' +
            (pc.description ? '<div class="todo-body">' + escapeHtml(pc.description) + '</div>' : '') +
          '</div>' +
        '</div>';
      }).join('');
      const todosHtml = durable.map(function(td) {
        const statusClass = td.status === 'completed' ? 'completed' : (td.status === 'in_progress' ? 'in_progress' : 'pending');
        let iconHtml = '<span style="opacity: 0.5;">\u2610</span>';
        if (td.status === 'completed') {
          iconHtml = '<span style="color: #2ea043; font-weight: bold;">\u2611</span>';
        } else if (td.status === 'in_progress') {
          iconHtml = '<span class="todo-spinner" role="img" title="\u8fdb\u884c\u4e2d" aria-label="\u8fdb\u884c\u4e2d"></span>';
        }
        const parts = splitTodoDisplay(td);
        const expanded = !!todoExpandState.get(parts.key);
        const clamp = !expanded && todoNeedsClamp(parts.body);
        const chip = '<span class="todo-status-chip ' + statusClass + '">' + escapeHtml(getTodoChipLabel(td.status)) + '</span>';
        let bodyHtml = '';
        if (parts.body) {
          bodyHtml = '<div class="todo-body' + (clamp ? ' clamped' : '') + '">' + escapeHtml(parts.body) + '</div>';
          if (todoNeedsClamp(parts.body)) {
            const label = expanded ? (hubUiStrings.collapse || 'Collapse') : (hubUiStrings.expand || 'Expand');
            bodyHtml += '<button type="button" class="todo-expand-btn" data-todo-key="' + escapeHtml(parts.key) + '">' + escapeHtml(label) + '</button>';
          }
        }
        const subHtml = parts.subtitle
          ? '<div class="todo-active-form">' + escapeHtml(parts.subtitle) + '</div>'
          : '';
        const depsHtml = formatTodoDeps(s, td);
        return '<div class="todo-item-card ' + statusClass + '" data-todo-id="' + escapeHtml(parts.key) + '">' +
          '<span class="todo-badge-icon">' + iconHtml + '</span>' +
          '<div class="todo-card-main">' +
            '<div class="todo-title-row">' +
              '<span class="todo-title">' + escapeHtml(parts.title) + '</span>' +
              chip +
            '</div>' +
            bodyHtml +
            subHtml +
            depsHtml +
          '</div>' +
        '</div>';
      }).join('');
      todosList.innerHTML = pendingHtml + todosHtml;
      todosList.querySelectorAll('.todo-expand-btn').forEach(function(btn) {
        btn.addEventListener('click', function(ev) {
          toggleTodoExpand(ev, btn.getAttribute('data-todo-key') || '');
        });
      });
    }

    function toggleTodosList() {
      const list = document.getElementById('todos-list');
      const caret = document.getElementById('todos-caret');
      if (!list) return;
      userToggledTodos = true;
      if (list.style.display === 'none') {
        list.style.display = 'block';
        userManuallyOpenedTodos = true;
        if (caret) caret.style.transform = 'rotate(0deg)';
      } else {
        list.style.display = 'none';
        userManuallyOpenedTodos = false;
        if (caret) caret.style.transform = 'rotate(-90deg)';
      }
    }

    function toggleAgentsList() {
      const list = document.getElementById('agents-list');
      const caret = document.getElementById('agents-caret');
      if (!list) return;
      userToggledAgents = true;
      if (list.style.display === 'none') {
        list.style.display = 'flex';
        userManuallyOpened = true;
        if (caret) caret.style.transform = 'rotate(0deg)';
      } else {
        list.style.display = 'none';
        userManuallyOpened = false;
        if (caret) caret.style.transform = 'rotate(-90deg)';
      }
    }

    function toggleAgentDetail(detailId, agentKey, ev) {
      if (ev && ev.target instanceof Element && ev.target.closest('[data-action]')) return;
      const el = document.getElementById(detailId);
      if (!el) return;
      const isHidden = (el.style.display === 'none' || !el.style.display);
      el.style.display = isHidden ? 'flex' : 'none';
      if (agentKey) {
        if (isHidden) {
          expandedAgentKeys.add(agentKey);
        } else {
          expandedAgentKeys.delete(agentKey);
        }
      }
    }

    function sendMessage(type, data = {}) {
      vscode.postMessage({ type, ...data });
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[ch] || ch));
    }

    function escapeAttribute(value) {
      return escapeHtml(value);
    }

    document.addEventListener('click', event => {
      const source = event.target instanceof Element ? event.target : null;
      if (openSessionMenuId && !(source && source.closest('.session-more-wrap'))) {
        closeSessionMenu(false);
      }
      const actionElement = source ? source.closest('[data-action]') : null;
      if (!actionElement) return;

      const action = actionElement.getAttribute('data-action');
      if (!action) return;

      if (action === 'toggleSessionMenu') {
        toggleSessionMenu(actionElement, false);
      } else if (action === 'focusSession' || action === 'forkSession' || action === 'deleteSession' || action === 'resumeSession' || action === 'renameSession' || action === 'togglePinSession' || action === 'exportSession' || action === 'compareFork' || action === 'editSessionTags' || action === 'showTimeline') {
        closeSessionMenu(false);
        sendMessage(action, { sessionId: actionElement.getAttribute('data-session-id') || '' });
      } else if (action === 'openWorktree') {
        sendMessage(action, { worktreePath: actionElement.getAttribute('data-worktree-path') || '' });
      } else if (action === 'slashCommand' || action === 'workspaceCostReport' || action === 'searchTranscript' || action === 'openBackgroundTasks' || action === 'openMemoryIndex' || action === 'syncMemoryIndex' || action === 'startWorktreeSession') {
        sendMessage(action, {});
      } else if (action === 'createMemoryEntry') {
        openMemoryInlineForm('create');
      } else if (action === 'openMemoryWizard') {
        closeMemoryInlineForm();
        sendMessage('createMemoryEntry', {});
      } else if (action === 'submitMemoryForm') {
        submitMemoryInlineForm();
      } else if (action === 'cancelMemoryForm') {
        closeMemoryInlineForm();
      } else if (action === 'selectMemType') {
        selectMemoryFormType(actionElement.getAttribute('data-mem-type') || 'project');
      } else if (action === 'deleteMemoryEntry') {
        sendMessage(action, {
          filePath: actionElement.getAttribute('data-file-path') || '',
          name: actionElement.getAttribute('data-memory-name') || ''
        });
      } else if (action === 'editMemoryEntry') {
        openMemoryInlineForm('edit', {
          filePath: actionElement.getAttribute('data-file-path') || '',
          name: actionElement.getAttribute('data-memory-name') || '',
          description: actionElement.getAttribute('data-memory-desc') || '',
          memoryType: actionElement.getAttribute('data-memory-type') || 'project'
        });
      } else if (action === 'toggleExtGroup') {
        toggleExtGroup(actionElement.getAttribute('data-ext-group') || '');
      } else if (action === 'openSessionFile') {
        closeSessionMenu(false);
        sendMessage(action, { filePath: actionElement.getAttribute('data-file-path') || '' });
      } else if (action === 'toggleMcp') {
        sendMessage(action, {
          name: actionElement.getAttribute('data-name') || '',
          enabled: actionElement.getAttribute('data-enabled') === 'true'
        });
      } else if (action === 'togglePlugin') {
        sendMessage(action, {
          id: actionElement.getAttribute('data-id') || '',
          enabled: actionElement.getAttribute('data-enabled') === 'true'
        });
      } else if (action === 'openSkill') {
        sendMessage(action, { filePath: actionElement.getAttribute('data-file-path') || '' });
      } else if (action === 'setExtTab') {
        setExtTab(actionElement.getAttribute('data-ext-tab') || 'all');
      } else if (action === 'setSkillScope') {
        setSkillScope(actionElement.getAttribute('data-skill-scope') || 'all');
      } else if (action === 'toggleMorePlugins') {
        extShowAllPlugins = !extShowAllPlugins;
        renderExtensionsPanel();
        saveUiState();
      } else if (action === 'toggleMoreLocalSkills') {
        extShowAllLocalSkills = !extShowAllLocalSkills;
        renderExtensionsPanel();
        saveUiState();
      } else if (action === 'toggleSkillPluginGroup') {
        const grp = actionElement.getAttribute('data-plugin-group') || '';
        if (grp) {
          if (expandedPluginSkillGroups.has(grp)) {
            expandedPluginSkillGroups.delete(grp);
          } else {
            expandedPluginSkillGroups.add(grp);
          }
          renderExtensionsPanel();
        }
      } else if (action === 'filterPluginSkills') {
        const pluginName = actionElement.getAttribute('data-plugin-name') || '';
        if (pluginName) {
          if (extActiveTab !== 'all' && extActiveTab !== 'skills') {
            extActiveTab = 'skills';
          }
          extGroupManualState['skills'] = false;
          if (extSkillScope === 'local') {
            extSkillScope = 'all';
          }
          expandedPluginSkillGroups.add(pluginName);
          renderExtensionsPanel();
          saveUiState();
          const grpEl = document.getElementById('skill-plugin-grp-' + pluginName.replace(/[^a-zA-Z0-9_-]/g, '_'));
          if (grpEl && grpEl.scrollIntoView) {
            grpEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }
    });

    // Extensions & Memory State
    let extData = {
      projectMemory: null,
      plugins: [],
      mcpServers: [],
      customAgents: [],
      skills: []
    };
    let extActiveTab = 'all';
    let extSearchQuery = '';
    let extSkillScope = 'all';
    let extShowAllPlugins = false;
    let extShowAllLocalSkills = false;
    const extGroupManualState = {};
    const expandedPluginSkillGroups = new Set();

    function setExtTab(tab) {
      extActiveTab = tab || 'all';
      renderExtensionsPanel();
      saveUiState();
    }

    function setSkillScope(scope) {
      extSkillScope = scope || 'all';
      renderExtensionsPanel();
      saveUiState();
    }

    function onExtSearchInput(val) {
      extSearchQuery = String(val || '');
      const clearBtn = document.getElementById('ext-search-clear');
      if (clearBtn) {
        clearBtn.style.display = extSearchQuery.trim() ? 'block' : 'none';
      }
      renderExtensionsPanel();
      saveUiState();
    }

    function clearExtSearch() {
      extSearchQuery = '';
      const inputEl = document.getElementById('ext-search-input');
      if (inputEl) inputEl.value = '';
      const clearBtn = document.getElementById('ext-search-clear');
      if (clearBtn) clearBtn.style.display = 'none';
      renderExtensionsPanel();
      saveUiState();
    }

    let memFormMode = 'create';
    let memEditingFilePath = '';
    const memTypeHints = {
      project: '记录项目架构约束、进行中目标或非显而易见的约定',
      feedback: '记录开发协作纠偏、用户确认的工作方式（含 Why / How to apply）',
      user: '记录用户角色、技术偏好与沟通习惯',
      reference: '记录外部文档、看板、工单或服务地址索引'
    };

    function selectMemoryFormType(memType) {
      const validType = (memType === 'feedback' || memType === 'user' || memType === 'reference') ? memType : 'project';
      const typeEl = document.getElementById('mem-form-type');
      if (typeEl) typeEl.value = validType;
      const pillsWrap = document.getElementById('mem-type-pills');
      if (pillsWrap) {
        pillsWrap.querySelectorAll('.mem-type-pill').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-mem-type') === validType);
        });
      }
      const hintEl = document.getElementById('mem-type-hint');
      if (hintEl) {
        hintEl.textContent = memTypeHints[validType] || memTypeHints.project;
      }
    }

    function openMemoryInlineForm(mode, data) {
      memFormMode = mode === 'edit' ? 'edit' : 'create';
      memEditingFilePath = (data && data.filePath) ? String(data.filePath) : '';
      extGroupManualState['memory'] = false;

      const formEl = document.getElementById('memory-inline-form');
      const titleEl = document.getElementById('mem-form-title');
      const wizardBtn = document.getElementById('mem-form-wizard-btn');
      const slugEl = document.getElementById('mem-form-slug');
      const descEl = document.getElementById('mem-form-desc');
      const submitBtn = document.getElementById('mem-form-submit-btn');

      if (!formEl) return;
      formEl.classList.add('visible');

      if (memFormMode === 'edit') {
        if (titleEl) titleEl.textContent = '✏️ 编辑记忆：' + ((data && data.name) || '');
        if (wizardBtn) wizardBtn.style.display = 'none';
        selectMemoryFormType((data && data.memoryType) || 'project');
        if (slugEl) {
          slugEl.value = (data && data.name) || '';
          slugEl.disabled = true;
          slugEl.style.borderColor = '';
        }
        if (descEl) descEl.value = (data && data.description) || '';
        if (submitBtn) submitBtn.textContent = '保存修改';
        renderExtensionsPanel();
        if (descEl) descEl.focus();
      } else {
        if (titleEl) titleEl.textContent = '➕ 新建项目记忆';
        if (wizardBtn) wizardBtn.style.display = 'inline-block';
        selectMemoryFormType('project');
        if (slugEl) {
          slugEl.value = '';
          slugEl.disabled = false;
          slugEl.style.borderColor = '';
        }
        if (descEl) descEl.value = '';
        if (submitBtn) submitBtn.textContent = '保存并打开';
        renderExtensionsPanel();
        if (slugEl) slugEl.focus();
      }
    }

    function closeMemoryInlineForm() {
      const formEl = document.getElementById('memory-inline-form');
      if (formEl) formEl.classList.remove('visible');
      memEditingFilePath = '';
      renderExtensionsPanel();
    }

    function submitMemoryInlineForm() {
      const typeEl = document.getElementById('mem-form-type');
      const slugEl = document.getElementById('mem-form-slug');
      const descEl = document.getElementById('mem-form-desc');
      const memoryType = typeEl ? typeEl.value : 'project';
      const slug = slugEl ? slugEl.value.trim() : '';
      const description = descEl ? descEl.value.trim() : '';

      if (memFormMode === 'edit' && memEditingFilePath) {
        sendMessage('editMemoryEntry', {
          filePath: memEditingFilePath,
          name: slug,
          description: description || slug,
          memoryType,
          directSave: true
        });
        closeMemoryInlineForm();
        return;
      }

      if (!slug) {
        if (slugEl) {
          slugEl.style.borderColor = 'var(--danger-color)';
          slugEl.focus();
        }
        return;
      }
      if (slugEl) slugEl.style.borderColor = '';
      sendMessage('createMemoryEntry', {
        slug,
        name: slug,
        description: description || slug,
        memoryType
      });
      closeMemoryInlineForm();
    }

    function toggleExtGroup(groupKey) {
      if (!groupKey) return;
      const el = document.getElementById('ext-group-' + groupKey);
      if (!el) return;
      const nextCollapsed = !el.classList.contains('collapsed');
      extGroupManualState[groupKey] = nextCollapsed;
      renderExtensionsPanel();
      saveUiState();
    }

    function renderSkillItemHtml(sk, inPluginGroup) {
      const skillPath = sk.filePath || sk.path || '';
      const rawName = String(sk.name || '');
      const displayName = (inPluginGroup && rawName.indexOf(':') > -1)
        ? rawName.split(':').slice(1).join(':')
        : rawName;
      let scopeChip = '';
      if (sk.scope === 'workspace') {
        scopeChip = '<span style="background: rgba(78,201,176,0.18); color: var(--success-color); font-size: 9px; padding: 1px 4px; border-radius: 3px; margin-right: 4px;">workspace</span>';
      } else if (sk.scope === 'plugin') {
        scopeChip = '<span style="background: rgba(197,134,192,0.16); color: #c586c0; font-size: 9px; padding: 1px 4px; border-radius: 3px; margin-right: 4px;">plugin</span>';
      } else if (sk.scope) {
        scopeChip = '<span style="background: rgba(224,122,95,0.15); color: var(--claude-accent); font-size: 9px; padding: 1px 4px; border-radius: 3px; margin-right: 4px;">' + escapeHtml(sk.scope) + '</span>';
      }
      const desc = sk.description || '无描述';
      const tooltip = rawName + (sk.description ? ' — ' + sk.description : '');
      return '<div class="feature-item" style="cursor: pointer;" data-action="openSkill" data-file-path="' + escapeAttribute(skillPath) + '" title="' + escapeAttribute(tooltip) + '">' +
        '<div style="min-width: 0; flex: 1;">' +
          '<div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + scopeChip + escapeHtml(displayName) + '</div>' +
          '<div style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(desc) + '</div>' +
        '</div>' +
        '<span style="font-size: 10px; color: var(--claude-accent); margin-left: 6px; flex-shrink: 0;">查看</span>' +
      '</div>';
    }

    function renderExtensionsPanel() {
      const q = extSearchQuery.trim().toLowerCase();
      const memInfo = extData.projectMemory || null;
      const allMemEntries = (memInfo && Array.isArray(memInfo.entries)) ? memInfo.entries : [];
      const allPlugins = Array.isArray(extData.plugins) ? extData.plugins : [];
      const allMcp = Array.isArray(extData.mcpServers) ? extData.mcpServers : [];
      const allAgents = Array.isArray(extData.customAgents) ? extData.customAgents : [];
      const allSkills = Array.isArray(extData.skills) ? extData.skills : [];

      const memEntries = q ? allMemEntries.filter(m =>
        String(m.name || '').toLowerCase().includes(q) ||
        String(m.description || '').toLowerCase().includes(q) ||
        String(m.type || '').toLowerCase().includes(q)
      ) : allMemEntries;

      const plugins = q ? allPlugins.filter(p =>
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.marketplace || '').toLowerCase().includes(q) ||
        String(p.description || '').toLowerCase().includes(q)
      ) : allPlugins;

      const mcpServers = q ? allMcp.filter(s =>
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.command || '').toLowerCase().includes(q) ||
        String(s.url || '').toLowerCase().includes(q)
      ) : allMcp;

      const customAgents = q ? allAgents.filter(ag =>
        String(ag.name || '').toLowerCase().includes(q) ||
        String(ag.description || '').toLowerCase().includes(q) ||
        String(ag.scope || '').toLowerCase().includes(q) ||
        String(ag.model || '').toLowerCase().includes(q)
      ) : allAgents;

      const skillsMatchedSearch = q ? allSkills.filter(sk =>
        String(sk.name || '').toLowerCase().includes(q) ||
        String(sk.description || '').toLowerCase().includes(q) ||
        String(sk.scope || '').toLowerCase().includes(q) ||
        String(sk.pluginId || '').toLowerCase().includes(q)
      ) : allSkills;

      // Update Top Category Tabs & Badges
      const secExt = document.getElementById('sec-extensions');
      if (secExt) {
        secExt.classList.toggle('single-tab-view', extActiveTab !== 'all');
      }
      const tabCounts = {
        skills: q ? skillsMatchedSearch.length : allSkills.length,
        plugins: q ? plugins.length : allPlugins.length,
        mcp: q ? mcpServers.length : allMcp.length,
        memory: q ? memEntries.length : allMemEntries.length,
        agents: q ? customAgents.length : allAgents.length
      };
      ['skills', 'plugins', 'mcp', 'memory', 'agents'].forEach(k => {
        const el = document.getElementById('ext-tab-count-' + k);
        if (el) el.textContent = String(tabCounts[k]);
      });
      const tabContainer = document.getElementById('ext-category-tabs');
      if (tabContainer) {
        tabContainer.querySelectorAll('.ext-tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-ext-tab') === extActiveTab);
        });
      }

      // Group visibility & collapse states
      const groupCounts = {
        memory: memEntries.length,
        plugins: plugins.length,
        mcp: mcpServers.length,
        agents: customAgents.length,
        skills: skillsMatchedSearch.length
      };
      const rawCounts = {
        memory: allMemEntries.length,
        plugins: allPlugins.length,
        mcp: allMcp.length,
        agents: allAgents.length,
        skills: allSkills.length
      };

      ['memory', 'plugins', 'mcp', 'agents', 'skills'].forEach(key => {
        const grpEl = document.getElementById('ext-group-' + key);
        if (!grpEl) return;
        if (extActiveTab !== 'all') {
          grpEl.style.display = (extActiveTab === key) ? 'block' : 'none';
          grpEl.classList.remove('collapsed');
        } else if (q) {
          grpEl.style.display = (groupCounts[key] > 0) ? 'block' : 'none';
          grpEl.classList.remove('collapsed');
        } else {
          grpEl.style.display = 'block';
          const manual = extGroupManualState[key];
          const shouldCollapse = (typeof manual === 'boolean') ? manual : (rawCounts[key] === 0 && key !== 'memory');
          grpEl.classList.toggle('collapsed', shouldCollapse);
        }
      });

      // Sub-header badges
      const memBadge = document.getElementById('ext-badge-memory');
      if (memBadge) memBadge.textContent = memEntries.length + ' 项';

      const enabledPluginsCount = plugins.filter(p => p.enabled === true || p.isEnabled === true).length;
      const plugBadge = document.getElementById('ext-badge-plugins');
      if (plugBadge) {
        plugBadge.textContent = plugins.length > 0 ? (enabledPluginsCount + '/' + plugins.length + ' ON') : '0';
      }

      const enabledMcpCount = mcpServers.filter(s => s.isEnabled === true || s.enabled === true).length;
      const mcpBadge = document.getElementById('ext-badge-mcp');
      if (mcpBadge) {
        mcpBadge.textContent = mcpServers.length > 0 ? (enabledMcpCount + '/' + mcpServers.length + ' ON') : '0';
      }

      const agBadge = document.getElementById('ext-badge-agents');
      if (agBadge) agBadge.textContent = String(customAgents.length);

      // 1. Memory List
      const memoryList = document.getElementById('memory-list');
      if (memoryList) {
        if (memEntries.length > 0) {
          memoryList.innerHTML = memEntries.map(m => {
            const mType = m.type || 'project';
            let badgeStyle = 'background: rgba(86,156,214,0.18); color: #9cdcfe;';
            if (mType === 'feedback') badgeStyle = 'background: rgba(204,167,0,0.18); color: var(--warning-color);';
            else if (mType === 'user') badgeStyle = 'background: rgba(78,201,176,0.18); color: var(--success-color);';
            else if (mType === 'reference') badgeStyle = 'background: rgba(197,134,192,0.18); color: #c586c0;';
            const typeBadge = '<span style="' + badgeStyle + ' font-size: 9px; padding: 1px 4px; border-radius: 3px; margin-right: 4px;">' + escapeHtml(mType) + '</span>';
            const filePathAttr = escapeAttribute(m.filePath || '');
            const nameAttr = escapeAttribute(m.name || m.slug || '');
            const descText = m.description || m.fileName || '';
            const descAttr = escapeAttribute(descText);
            const typeAttr = escapeAttribute(mType);
            return '<div class="feature-item" style="cursor: pointer;" data-action="openSkill" data-file-path="' + filePathAttr + '" title="' + escapeAttribute((m.name || '') + (descText ? ' — ' + descText : '')) + '">' +
              '<div style="min-width: 0; flex: 1;">' +
                '<div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + typeBadge + escapeHtml(m.name) + '</div>' +
                '<div style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(descText) + '</div>' +
              '</div>' +
              '<div class="mem-item-actions">' +
                '<button type="button" class="mem-act-btn primary" data-action="openSkill" data-file-path="' + filePathAttr + '" title="在编辑器中打开记忆文件">打开</button>' +
                '<button type="button" class="mem-act-btn" data-action="editMemoryEntry" data-file-path="' + filePathAttr + '" data-memory-name="' + nameAttr + '" data-memory-desc="' + descAttr + '" data-memory-type="' + typeAttr + '" title="修改记忆分类与摘要并同步 MEMORY.md">编辑</button>' +
                '<button type="button" class="mem-act-btn danger" data-action="deleteMemoryEntry" data-file-path="' + filePathAttr + '" data-memory-name="' + nameAttr + '" title="移除该记忆文件并从 MEMORY.md 索引中清理">移除</button>' +
              '</div>' +
            '</div>';
          }).join('');
        } else {
          const indexHint = q ? '无匹配的项目记忆' : ((memInfo && memInfo.hasIndex) ? '已存在 MEMORY.md 索引，暂无独立记忆卡片' : '当前项目暂无 Auto Memory，点右上角“+ 新建”添加');
          const inlineFormEl = document.getElementById('memory-inline-form');
          const isFormVisible = inlineFormEl && inlineFormEl.classList.contains('visible');
          memoryList.innerHTML = isFormVisible ? '' : '<div style="color: var(--text-muted); font-size: 11px;">' + escapeHtml(indexHint) + '</div>';
        }
      }

      // 2. Plugins List (with folding when > 6)
      const pluginsList = document.getElementById('plugins-list');
      if (pluginsList) {
        if (plugins.length > 0) {
          const maxVisiblePlugins = (!q && extActiveTab === 'all' && !extShowAllPlugins) ? 6 : plugins.length;
          const shownPlugins = plugins.slice(0, maxVisiblePlugins);
          let pluginsHtml = shownPlugins.map(p => {
            const enabled = p.enabled === true || p.isEnabled === true;
            const onCls = enabled ? 'switch-btn on' : 'switch-btn';
            const onTxt = enabled ? 'ON' : 'OFF';
            const metaParts = [];
            if (p.marketplace) metaParts.push('@' + p.marketplace);
            if (p.version) metaParts.push('v' + p.version);
            const skillsJumpPill = p.skillsCount
              ? '<button type="button" class="ext-skill-jump-pill" data-action="filterPluginSkills" data-plugin-name="' + escapeAttribute(p.name) + '" title="点击展开 ' + escapeAttribute(p.name) + ' 提供的 ' + p.skillsCount + ' 项技能">⚡ ' + p.skillsCount + ' skills</button>'
              : '';
            return '<div class="feature-item">' +
              '<div style="min-width: 0; flex: 1;">' +
                '<div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center;">' +
                  '<span style="overflow: hidden; text-overflow: ellipsis;">' + escapeHtml(p.name) + '</span>' +
                  skillsJumpPill +
                '</div>' +
                '<div style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(metaParts.join(' · ')) + '</div>' +
              '</div>' +
              '<button class="' + onCls + '" data-action="togglePlugin" data-id="' + escapeAttribute(p.id) + '" data-enabled="' + (!enabled) + '">' + onTxt + '</button>' +
            '</div>';
          }).join('');
          if (!q && extActiveTab === 'all' && plugins.length > 6) {
            const remain = plugins.length - 6;
            pluginsHtml += '<button type="button" class="ext-more-btn" data-action="toggleMorePlugins">' +
              (extShowAllPlugins ? '▲ 收起插件列表' : ('▼ 展开剩余 ' + remain + ' 个插件')) +
            '</button>';
          }
          pluginsList.innerHTML = pluginsHtml;
        } else {
          pluginsList.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">' + (q ? '无匹配的插件' : '未检测到已安装的 Claude Plugins') + '</div>';
        }
      }

      // 3. MCP Servers List
      const mcpList = document.getElementById('mcp-servers-list');
      if (mcpList) {
        if (mcpServers.length > 0) {
          mcpList.innerHTML = mcpServers.map(s => {
            const enabled = s.isEnabled === true || s.enabled === true;
            const onCls = enabled ? 'switch-btn on' : 'switch-btn';
            const onTxt = enabled ? 'ON' : 'OFF';
            return '<div class="feature-item">' +
              '<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(s.name) + '</span>' +
              '<button class="' + onCls + '" data-action="toggleMcp" data-name="' + escapeAttribute(s.name) + '" data-enabled="' + (!enabled) + '">' + onTxt + '</button>' +
            '</div>';
          }).join('');
        } else {
          mcpList.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">' + (q ? '无匹配的 MCP 服务' : '未检测到外部 MCP 配置') + '</div>';
        }
      }

      // 4. Custom Agents List
      const customAgentsList = document.getElementById('custom-agents-list');
      if (customAgentsList) {
        if (customAgents.length > 0) {
          customAgentsList.innerHTML = customAgents.map(ag => {
            const scopeTag = '<span style="background: rgba(78,201,176,0.16); color: var(--success-color); font-size: 9px; padding: 1px 4px; border-radius: 3px; margin-right: 4px;">' + escapeHtml(ag.scope || 'global') + '</span>';
            const modelTag = ag.model ? ' <span style="opacity: 0.7; font-size: 9px;">(' + escapeHtml(ag.model) + ')</span>' : '';
            return '<div class="feature-item" style="cursor: pointer;" data-action="openSkill" data-file-path="' + escapeAttribute(ag.filePath || '') + '">' +
              '<div style="min-width: 0; flex: 1;">' +
                '<div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + scopeTag + escapeHtml(ag.name) + modelTag + '</div>' +
                '<div style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(ag.description || '') + '</div>' +
              '</div>' +
              '<span style="font-size: 10px; color: var(--claude-accent); margin-left: 6px; flex-shrink: 0;">查看</span>' +
            '</div>';
          }).join('');
        } else {
          customAgentsList.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">' + (q ? '无匹配的自定义代理' : '暂无自定义代理 (.claude/agents/*.md)') + '</div>';
        }
      }

      // 5. Skills List (with Local vs Plugin scope filtering, per-plugin collapsible folders, and folding)
      const localSkillsAll = skillsMatchedSearch.filter(sk => sk.scope !== 'plugin').sort((a, b) => {
        if (a.scope === b.scope) return String(a.name || '').localeCompare(String(b.name || ''));
        return a.scope === 'workspace' ? -1 : 1;
      });
      const pluginSkillsAll = skillsMatchedSearch.filter(sk => sk.scope === 'plugin');

      const skBadge = document.getElementById('ext-badge-skills');
      if (skBadge) {
        skBadge.textContent = skillsMatchedSearch.length + ' 项';
      }

      const scopeAllBtn = document.getElementById('skill-scope-all');
      const scopeLocalBtn = document.getElementById('skill-scope-local');
      const scopePluginBtn = document.getElementById('skill-scope-plugin');
      if (scopeAllBtn) {
        scopeAllBtn.textContent = '全部 ' + skillsMatchedSearch.length;
        scopeAllBtn.classList.toggle('active', extSkillScope === 'all');
      }
      if (scopeLocalBtn) {
        scopeLocalBtn.textContent = '本地 ' + localSkillsAll.length;
        scopeLocalBtn.classList.toggle('active', extSkillScope === 'local');
      }
      if (scopePluginBtn) {
        scopePluginBtn.textContent = '插件 ' + pluginSkillsAll.length;
        scopePluginBtn.classList.toggle('active', extSkillScope === 'plugin');
      }

      const skillsList = document.getElementById('skills-list');
      if (skillsList) {
        const showLocal = extSkillScope === 'all' || extSkillScope === 'local';
        const showPlugin = extSkillScope === 'all' || extSkillScope === 'plugin';
        const parts = [];

        if (showLocal && localSkillsAll.length > 0) {
          const maxLocal = (!q && extActiveTab === 'all' && extSkillScope === 'all' && !extShowAllLocalSkills) ? 6 : localSkillsAll.length;
          const visibleLocal = localSkillsAll.slice(0, maxLocal);
          parts.push(visibleLocal.map(sk => renderSkillItemHtml(sk, false)).join(''));
          if (!q && extActiveTab === 'all' && extSkillScope === 'all' && localSkillsAll.length > 6) {
            const remLocal = localSkillsAll.length - 6;
            parts.push(
              '<button type="button" class="ext-more-btn" data-action="toggleMoreLocalSkills">' +
                (extShowAllLocalSkills ? '▲ 收起本地技能' : ('▼ 展开剩余 ' + remLocal + ' 项本地技能')) +
              '</button>'
            );
          }
        }

        if (showPlugin && pluginSkillsAll.length > 0) {
          const groupMap = new Map();
          pluginSkillsAll.forEach(sk => {
            const rawName = String(sk.name || '');
            const prefix = rawName.indexOf(':') > -1
              ? rawName.split(':')[0]
              : (sk.pluginId ? String(sk.pluginId).split('@')[0] : 'plugin');
            if (!groupMap.has(prefix)) groupMap.set(prefix, []);
            groupMap.get(prefix).push(sk);
          });

          groupMap.forEach((grpSkills, pluginName) => {
            const autoExpand = Boolean(q) || (extSkillScope === 'plugin' && groupMap.size === 1) || expandedPluginSkillGroups.has(pluginName);
            const grpCls = autoExpand ? 'skill-plugin-group' : 'skill-plugin-group collapsed';
            const safeId = 'skill-plugin-grp-' + String(pluginName).replace(/[^a-zA-Z0-9_-]/g, '_');
            parts.push(
              '<div class="' + grpCls + '" id="' + safeId + '" data-plugin-group="' + escapeAttribute(pluginName) + '">' +
                '<div class="skill-plugin-group-header" data-action="toggleSkillPluginGroup" data-plugin-group="' + escapeAttribute(pluginName) + '" title="点击展开/收起 ' + escapeAttribute(pluginName) + ' 插件的技能列表">' +
                  '<span style="display: flex; align-items: center; gap: 5px; font-weight: 500;">' +
                    '<span class="caret">▼</span>' +
                    '<span>🧩 ' + escapeHtml(pluginName) + '</span>' +
                  '</span>' +
                  '<span class="ext-group-badge">' + grpSkills.length + ' 项技能</span>' +
                '</div>' +
                '<div class="skill-plugin-group-body">' +
                  grpSkills.map(sk => renderSkillItemHtml(sk, true)).join('') +
                '</div>' +
              '</div>'
            );
          });
        }

        if (parts.length > 0) {
          skillsList.innerHTML = parts.join('');
        } else {
          const emptySkillMsg = q
            ? '无匹配的技能'
            : (extSkillScope === 'local' ? '暂无本地 (Global / Workspace) 技能' : (extSkillScope === 'plugin' ? '暂无已启用插件提供的技能' : '暂无本地 Skills 技能'));
          skillsList.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">' + escapeHtml(emptySkillMsg) + '</div>';
        }
      }

      const totalExt =
        allMcp.length +
        allPlugins.length +
        allAgents.length +
        allMemEntries.length +
        allSkills.length;
      const badgeEl = document.getElementById('ext-count-badge');
      if (badgeEl) badgeEl.innerText = totalExt + ' 项';
    }

    // Sessions State
    let allSessions = [];
    let focusedSessionId = null;
    let currentSession = null;
    let currentFilter = 'all';
    let backendFilterMode = null;
    let initialFilterModeReceived = false;
    let searchKeyword = '';
    let currentPage = 1;
    let pageSize = 8;

    function setIconBtnLabel(btn, icon, text) {
      if (!btn) return;
      let iconEl = btn.querySelector('.icon-btn-icon');
      let textEl = btn.querySelector('.icon-btn-text');
      if (!iconEl) {
        iconEl = document.createElement('span');
        iconEl.className = 'icon-btn-icon';
        iconEl.setAttribute('aria-hidden', 'true');
        btn.insertBefore(iconEl, btn.firstChild);
      }
      if (!textEl) {
        textEl = document.createElement('span');
        textEl.className = 'icon-btn-text';
        textEl.setAttribute('data-role', 'label');
        btn.appendChild(textEl);
      }
      iconEl.textContent = icon;
      textEl.textContent = text || '';
    }

    function applyToolbarI18n() {
      const map = {
        tbRefresh: hubUiStrings.tbRefresh || 'Refresh status',
        tbSlash: hubUiStrings.tbSlash || 'Slash command',
        tbSearch: hubUiStrings.tbSearch || 'Search transcript',
        tbCost: hubUiStrings.tbCost || 'Workspace cost report',
        tbTasks: hubUiStrings.tbTasks || 'Background /tasks (not Hub todos)',
        tbWorktree: hubUiStrings.tbWorktree || 'Start worktree session (claude -w)',
        tbFilter: hubUiStrings.tbFilter || 'Toggle workspace / all sessions filter',
      };
      document.querySelectorAll('.top-actions .icon-btn[data-i18n-title]').forEach((btn) => {
        const key = btn.getAttribute('data-i18n-title');
        const tip = map[key] || btn.title || '';
        if (!tip) return;
        // Filter button keeps dynamic title from updateTopFilterButton
        if (btn.id === 'top-filter-btn') return;
        btn.title = tip;
        btn.setAttribute('aria-label', tip);
      });
    }

    function updateTopFilterButton(mode) {
      const btn = document.getElementById('top-filter-btn');
      if (!btn) return;
      const tipWs = hubUiStrings.tbFilterWs || 'Filter: current workspace (click for all sessions)';
      const tipAll = hubUiStrings.tbFilterAll || 'Filter: all sessions (click for current workspace)';
      // Icon-only: never show WS/工作区/All short text in the toolbar.
      if (mode === 'currentWorkspace') {
        setIconBtnLabel(btn, '📁', '');
        btn.className = 'icon-btn active';
        btn.title = tipWs;
        btn.setAttribute('aria-label', tipWs);
      } else {
        setIconBtnLabel(btn, '🌐', '');
        btn.className = 'icon-btn';
        btn.title = tipAll;
        btn.setAttribute('aria-label', tipAll);
      }
    }

    function setSessionFilter(filter, notifyBackend = true) {
      currentFilter = filter;
      currentPage = 1;
      saveUiState();
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      if (filter === 'all') {
        const chip = document.getElementById('chip-all');
        if (chip) chip.classList.add('active');
        if (notifyBackend) {
          backendFilterMode = 'all';
          updateTopFilterButton('all');
          sendMessage('setFilterMode', { mode: 'all' });
        }
      } else if (filter === 'workspace') {
        const chip = document.getElementById('chip-ws');
        if (chip) chip.classList.add('active');
        if (notifyBackend) {
          backendFilterMode = 'currentWorkspace';
          updateTopFilterButton('currentWorkspace');
          sendMessage('setFilterMode', { mode: 'currentWorkspace' });
        }
      } else if (filter === 'pinned') {
        const chip = document.getElementById('chip-pinned');
        if (chip) chip.classList.add('active');
      } else if (filter === 'active') {
        const chip = document.getElementById('chip-active');
        if (chip) chip.classList.add('active');
      }
      renderSessionsList();
    }

    let searchDebounceTimer = null;
    function clearSessionSearch() {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchKeyword = '';
      currentPage = 1;
      saveUiState();
      const input = document.getElementById('session-search');
      if (input) input.value = '';
      renderSessionsList();
      if (input) input.focus();
    }
    function onSearchInput(val) {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        searchKeyword = (val || '').toLowerCase().trim();
        currentPage = 1;
        saveUiState();
        renderSessionsList();
      }, 150);
    }


    (function bindTodoToolsToggle() {
      const toggle = document.getElementById('todo-tools-toggle');
      if (!toggle || toggle.dataset.bound === '1') return;
      toggle.dataset.bound = '1';
      toggle.addEventListener('change', () => {
        if (toggle.dataset.syncing === '1') return;
        toggle.disabled = true;
        sendMessage('setTodoToolsEnv', { enabled: !!toggle.checked });
        // Host always sendConfigUpdate (success or cancel) which re-enables via render
        setTimeout(() => { toggle.disabled = false; }, 4000);
      });
      applyToolbarI18n();
    })();

    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        renderSessionsList();
      }
    }

    function nextPage() {
      currentPage++;
      renderSessionsList();
    }

    function formatDuration(ms, precise) {
      if (isNaN(ms) || ms < 0) ms = 0;
      const totalSec = Math.floor(ms / 1000);
      if (totalSec < 60) {
        return precise ? totalSec + 's' : (totalSec === 0 ? '< 1m' : totalSec + 's');
      }
      const minutes = Math.floor(totalSec / 60);
      const seconds = totalSec % 60;
      if (minutes < 60) {
        return (precise && seconds > 0) ? (minutes + 'm ' + seconds + 's') : (minutes + 'm');
      }
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (hours < 24) {
        return remainingMinutes > 0 ? (hours + 'h ' + remainingMinutes + 'm') : (hours + 'h');
      }
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return remainingHours > 0 ? (days + 'd ' + remainingHours + 'h') : (days + 'd');
    }

    function updateLiveSessionDuration() {
      const durEl = document.getElementById('session-dur-label');
      if (durEl) {
        if (!currentSession) {
          durEl.innerText = '--';
          durEl.title = '';
        } else {
          const isIdle = !!currentSession.isIdle;
          const createdTime = currentSession.sessionCreated ? new Date(currentSession.sessionCreated).getTime() : 0;
          const turnStartTime = currentSession.currentTurnStartTime ? new Date(currentSession.currentTurnStartTime).getTime() : 0;
          const baseDurMs = currentSession.durationMs || 0;

          if (isIdle) {
            const durText = formatDuration(baseDurMs, false);
            durEl.innerText = durText;
            let tip = '累计有效对话时长: ' + durText;
            if (createdTime > 0) {
              tip += ' · 会话创建于 ' + formatRelativeTime(createdTime);
            }
            if (currentSession.totalSpanMs && currentSession.totalSpanMs > baseDurMs) {
              tip += ' (历时跨度 ' + formatDuration(currentSession.totalSpanMs, false) + ')';
            }
            durEl.title = tip;
          } else {
            // Active running state
            let turnDurMs = 0;
            if (turnStartTime > 0) {
              turnDurMs = Math.max(0, Date.now() - turnStartTime);
            }
            const turnText = turnDurMs > 0 ? formatDuration(turnDurMs, true) : '';
            const totalActiveMs = baseDurMs + (turnDurMs > 0 && turnDurMs <= 300000 ? turnDurMs : 0);
            const totalText = formatDuration(totalActiveMs, false);

            if (turnText) {
              durEl.innerText = turnText + ' / 总 ' + totalText;
              let tip = '当前任务运行时长: ' + turnText + ' · 累计有效对话: ' + totalText;
              if (createdTime > 0) {
                tip += ' · 会话创建于 ' + formatRelativeTime(createdTime);
              }
              durEl.title = tip;
            } else {
              durEl.innerText = formatDuration(totalActiveMs, true);
              durEl.title = '累计有效运行时长: ' + formatDuration(totalActiveMs, true);
            }
          }
        }
      }

      // Also update running tool banner if tool is actively executing
      if (currentSession && !currentSession.isIdle && currentSession.activeTools && currentSession.activeTools.length > 0) {
        const toolDurEl = document.getElementById('running-tool-dur');
        if (toolDurEl) {
          const t = currentSession.activeTools[0];
          const startMs = t.startTime ? new Date(t.startTime).getTime() : 0;
          const elapsedSec = startMs > 0 ? Math.max(0, Math.floor((Date.now() - startMs) / 1000)) : 0;
          toolDurEl.innerText = elapsedSec + 's';
        }
      }
    }

    function formatRelativeTime(timestamp) {
      if (!timestamp) return '';
      const diffMs = Date.now() - timestamp;
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return '刚刚';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return diffMin + '分钟前';
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return diffHours + '小时前';
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return '昨天';
      if (diffDays < 7) return diffDays + '天前';
      const d = new Date(timestamp);
      return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function formatTokenCount(num) {
      if (!num || num === 0) return '0';
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
      return String(num);
    }

    
    function jobTimeMs(value) {
      if (value == null || value === '') return 0;
      if (typeof value === 'number') return value;
      const parsed = new Date(value).getTime();
      return isNaN(parsed) ? 0 : parsed;
    }

    function bgKindLabel(kind) {
      if (kind === 'agent') return 'agent';
      if (kind === 'shell') return 'shell';
      if (kind === 'workflow') return 'workflow';
      return 'task';
    }

    function renderLoopBanner(s) {
      const banner = document.getElementById('loop-status-banner');
      if (!banner) return;
      const lp = s && s.loopState;
      if (!lp) {
        banner.style.display = 'none';
        return;
      }
      banner.style.display = 'flex';
      const modeEl = document.getElementById('loop-mode-label');
      const chipsEl = document.getElementById('loop-meta-chips');
      const pillEl = document.getElementById('loop-countdown-pill');
      const reasonEl = document.getElementById('loop-reason-line');

      if (modeEl) {
        modeEl.textContent = lp.mode === 'cron' ? 'Cron Loop' : 'Dynamic Loop';
      }
      if (chipsEl) {
        const metaParts = [];
        if (lp.mode === 'cron' && lp.cronExpression) {
          metaParts.push(lp.cronExpression);
        } else if (lp.delaySeconds) {
          metaParts.push('间隔 ' + lp.delaySeconds + 's');
        }
        if (lp.tickCount) {
          metaParts.push('Tick #' + lp.tickCount);
        }
        if (lp.noopStreak && lp.noopStreak > 0) {
          metaParts.push('静默×' + lp.noopStreak);
        }
        chipsEl.textContent = metaParts.join(' · ');
      }
      if (pillEl) {
        if (!lp.active) {
          pillEl.className = 'status-pill idle';
          pillEl.textContent = '已停止';
        } else if (lp.nextWakeAt) {
          const wakeMs = jobTimeMs(lp.nextWakeAt);
          const remMs = wakeMs > 0 ? wakeMs - Date.now() : 0;
          if (remMs > 0) {
            pillEl.className = 'status-pill active';
            pillEl.textContent = '⏳ ' + formatDuration(remMs, true);
          } else {
            pillEl.className = 'status-pill active';
            pillEl.textContent = '⚡ 待唤醒';
          }
        } else {
          pillEl.className = 'status-pill active';
          pillEl.textContent = '运行中';
        }
      }
      if (reasonEl) {
        const detail = lp.reason || lp.prompt || '';
        if (detail) {
          reasonEl.style.display = 'block';
          reasonEl.textContent = (lp.reason ? '原因: ' : '任务: ') + detail;
          reasonEl.title = detail;
        } else {
          reasonEl.style.display = 'none';
          reasonEl.textContent = '';
        }
      }
    }

    function bgStatusLabel(status) {
      if (status === 'running') return '运行中';
      if (status === 'error') return '失败';
      if (status === 'killed') return '已停止';
      return '已完成';
    }

    function renderBackgroundJobs(s) {
      const wrap = document.getElementById('bgjobs-container');
      const list = document.getElementById('bgjobs-list');
      const counter = document.getElementById('bgjobs-counter');
      if (!wrap || !list) return;
      const now = Date.now();
      const rows = [];
      const seen = {};
      function pushJob(job, project, sessionId) {
        if (!job || !job.id || job.status !== 'running') return;
        const key = (sessionId || '') + ':' + job.id;
        if (seen[key]) return;
        seen[key] = true;
        rows.push({ job: job, project: project || '' });
      }
      const ownJobs = (s && s.backgroundJobs) || [];
      for (let i = 0; i < ownJobs.length; i++) pushJob(ownJobs[i], '', s && s.sessionId);
      rows.sort(function (a, b) {
        const ar = a.job.status === 'running' ? 0 : 1;
        const br = b.job.status === 'running' ? 0 : 1;
        return ar - br;
      });
      const runningCount = rows.filter(function (row) { return row.job.status === 'running'; }).length;
      if (counter) counter.textContent = String(runningCount);
      if (!rows.length) {
        wrap.style.display = 'none';
        list.innerHTML = '';
        return;
      }
      wrap.style.display = 'block';
      list.innerHTML = rows.slice(0, 8).map(function (row) {
        const job = row.job;
        const running = job.status === 'running';
        const dotClass = running ? 'bgjob-dot running' : (job.status === 'error' ? 'bgjob-dot fail' : 'bgjob-dot');
        const startMs = jobTimeMs(job.startTime);
        const endMs = jobTimeMs(job.endTime);
        const elapsedMs = running
          ? (startMs > 0 ? Math.max(0, now - startMs) : 0)
          : (startMs > 0 && endMs > startMs ? endMs - startMs : 0);
        const elapsed = elapsedMs > 0 ? formatDuration(elapsedMs, true) : '';
        const prefix = row.project ? escapeHtml(row.project) + ' · ' : '';
        const meta = bgKindLabel(job.kind) + ' · ' + bgStatusLabel(job.status) + (elapsed ? ' · ' + elapsed : '');
        const title = job.outputFile ? escapeAttribute(job.outputFile) : escapeAttribute(job.label || job.id || '');
        return '<div class="bgjob-row" title="' + title + '"><span class="' + dotClass + '"></span><div class="bgjob-main"><div class="bgjob-label">' + prefix + escapeHtml(job.label || job.id || 'task') + '</div><div class="bgjob-meta">' + escapeHtml(meta) + '</div></div></div>';
      }).join('') + '<div style="opacity:0.65;margin-top:4px;">这是斜杠 /tasks 后台任务，不是会话待办。点“打开”可在 Claude Code 里查看。</div>';
    }

    
    function renderTodoToolsPanel(msg) {
      const title = document.getElementById('todo-tools-title');
      const label = document.getElementById('todo-tools-toggle-label');
      const caveat = document.getElementById('todo-tools-caveat');
      const status = document.getElementById('todo-tools-status');
      const toggle = document.getElementById('todo-tools-toggle');
      if (!toggle || !status) return;
      if (title && hubUiStrings.todoToolsTitle) title.textContent = hubUiStrings.todoToolsTitle;
      if (label && hubUiStrings.todoToolsToggle) label.textContent = hubUiStrings.todoToolsToggle;
      if (caveat && hubUiStrings.todoToolsCaveat) caveat.textContent = hubUiStrings.todoToolsCaveat;

      const states = Array.isArray(msg.taskIntegration) ? msg.taskIntegration : [];
      const primary = states[0];
      const settingOn = !!msg.todoToolsEnabledSetting;
      const anyEnvOn = states.some(function (s) { return !!(s && s.envEnabled); });
      // Disk env OR Hub setting (after host reconcile both should agree).
      const checked = anyEnvOn || settingOn;
      toggle.dataset.syncing = '1';
      toggle.checked = checked;
      toggle.disabled = false;
      delete toggle.dataset.syncing;
      const parts = [];
      if (primary) {
        parts.push(checked ? (hubUiStrings.todoToolsOn || 'On') : (hubUiStrings.todoToolsOff || 'Off'));
        parts.push(primary.effectiveEnabled ? (hubUiStrings.todoToolsEffectiveOn || 'Effective: on') : (hubUiStrings.todoToolsEffectiveOff || 'Effective: off'));
        if (primary.observed) parts.push(hubUiStrings.todoToolsObserved || 'Observed');
        if (primary.conflict) parts.push('⚠ ' + (primary.conflictReason || 'conflict'));
        if (!primary.hooksConfigured) parts.push(hubUiStrings.todoToolsHooksNote || 'env-only');
        if (states.length > 1) parts.push('(' + states.length + ' folders)');
      } else {
        parts.push(hubUiStrings.todoToolsOff || 'Off');
        parts.push('(no workspace folder)');
      }
      status.textContent = parts.join(' · ');
      status.style.color = primary && primary.conflict ? '#f44747' : 'var(--text-muted)';
    }

    let openSessionMenuId = null;

    function renderSessionsList() {
      const container = document.getElementById('session-cards-list');
      const totalBadge = document.getElementById('sessions-total-badge');
      const scopeCount = allSessions.filter(s => {
        if (currentFilter === 'workspace') return s.isCurrentWorkspace;
        if (currentFilter === 'active') return !s.isIdle;
        if (currentFilter === 'pinned') return s.pinned;
        return true;
      }).length;

      const filtered = allSessions.filter(s => {
        if (currentFilter === 'workspace' && !s.isCurrentWorkspace) return false;
        if (currentFilter === 'active' && s.isIdle) return false;
        if (currentFilter === 'pinned' && !s.pinned) return false;
        if (searchKeyword) {
          const matchProj = (s.projectName || '').toLowerCase().includes(searchKeyword);
          const matchTitle = (s.sessionTitle || '').toLowerCase().includes(searchKeyword);
          const matchBranch = (s.gitBranch || '').toLowerCase().includes(searchKeyword);
          const matchModel = (s.model || '').toLowerCase().includes(searchKeyword);
          const matchFolder = (s.workspaceFolderName || '').toLowerCase().includes(searchKeyword);
          const matchTags = Array.isArray(s.tags) && s.tags.some(t => String(t).toLowerCase().includes(searchKeyword));
          if (!matchProj && !matchTitle && !matchBranch && !matchModel && !matchFolder && !matchTags) return false;
        }
        return true;
      });

      totalBadge.innerText = searchKeyword
        ? filtered.length + ' / ' + scopeCount + ' 个会话'
        : scopeCount + ' 个会话';
      totalBadge.title = searchKeyword ? '搜索结果数 / 当前筛选总数' : '当前筛选会话数';

      const totalPages = Math.ceil(filtered.length / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      document.getElementById('pagination-info').innerText = '第 ' + currentPage + ' / ' + totalPages + ' 页 (共 ' + filtered.length + ' 条)';
      document.getElementById('btn-prev-page').disabled = currentPage <= 1;
      document.getElementById('btn-next-page').disabled = currentPage >= totalPages;

      if (filtered.length === 0) {
        if (openSessionMenuId) closeSessionMenu(false);
        if (searchKeyword) {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 16px 0;"><div>当前筛选中没有匹配的会话</div><div style="margin-top: 8px;"><button type="button" class="filter-chip" onclick="clearSessionSearch()">清除搜索</button></div></div>';
        } else if (currentFilter === 'workspace') {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 16px 0;"><div>当前工作区暂无会话</div><div style="margin-top: 8px;"><button class="filter-chip active" style="display: inline-block; padding: 3px 10px;" onclick="setSessionFilter(\\'all\\')">🌐 查看全部项目会话</button></div></div>';
        } else {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 16px 0;">未找到符合条件的会话</div>';
        }
        return;
      }

      const startIndex = (currentPage - 1) * pageSize;
      const pageSessions = filtered.slice(startIndex, startIndex + pageSize);
      // 刷新列表前记录会话操作焦点，避免实时更新打断键盘操作。
      const activeControl = container.contains(document.activeElement) ? document.activeElement : null;
      const focusedAction = activeControl && activeControl.getAttribute('data-action');
      const focusedId = activeControl && activeControl.getAttribute('data-session-id');
      const focusedPath = activeControl && activeControl.getAttribute('data-file-path');

      container.innerHTML = pageSessions.map(s => {
        const isFocused = s.sessionId === focusedSessionId;
        const tagsBadge = (s.tags && s.tags.length) ? ('<span class="session-tag-badge" title="' + escapeAttribute(s.tags.join(', ')) + '">' + escapeHtml(s.tags.slice(0,3).join(' · ')) + (s.tags.length > 3 ? '…' : '') + '</span>') : '';
        const pinnedTag = s.pinned ? '<span class="session-pin-badge" title="已置顶 (Pinned)">PIN</span>' : '';
        const focusedTag = isFocused ? '<span class="status-pill focused" style="font-size: 9px;"><span class="badge-icon">📍</span><span class="badge-text">当前聚焦</span></span>' : '';
        const bgRunning = (s.backgroundJobs || []).filter(function (job) { return job && job.status === 'running'; });
        const bgBadge = bgRunning.length
          ? ' <span class="status-pill active" style="font-size: 9px;" title="' + escapeAttribute(bgRunning[0].label || '后台任务') + '"><span class="badge-icon">🧵</span><span class="badge-text">后台 ' + bgRunning.length + '</span></span>'
          : '';
        const loopBadge = (s.loopState && s.loopState.active)
          ? ' <span class="status-pill active" style="font-size: 9px;" title="' + escapeAttribute(s.loopState.reason || s.loopState.prompt || 'Loop 定时唤醒中') + '"><span class="badge-icon">🔁</span><span class="badge-text">' + (s.loopState.mode === 'cron' ? 'Cron' : (s.loopState.delaySeconds ? s.loopState.delaySeconds + 's' : 'Loop')) + '</span></span>'
          : '';
        const activeTag = !s.isIdle ? '<span class="status-pill active" style="font-size: 9px;"><span class="badge-icon">⚡</span><span class="badge-text">活跃</span></span>' : '<span class="status-pill idle" style="font-size: 9px;"><span class="badge-icon">💤</span><span class="badge-text">闲置</span></span>';
        const cardClass = isFocused ? 'session-card focused' : 'session-card';
        const timeStr = formatRelativeTime(s.lastUpdated);
        const tokens = s.tokenUsage ? formatTokenCount(s.tokenUsage.totalTokens) : '0';
        const pct = s.tokenUsage && s.tokenUsage.percentage ? s.tokenUsage.percentage + '%' : '0%';
        const branchStr = s.gitBranch ? '🌿 ' + escapeHtml(s.gitBranch) : '';
        const branchAttr = escapeAttribute(s.gitBranch || '');
        const titleStr = s.sessionTitle ? s.sessionTitle : '未命名对话';
        const projectLabel = (s.projectName || '未知项目') + (s.workspaceFolderName ? ' · ' + s.workspaceFolderName : '');
        const projectNameStr = escapeHtml(projectLabel);
        const projectNameAttr = escapeAttribute(projectLabel);
        const titleDisplay = escapeHtml(titleStr);
        const titleAttr = escapeAttribute(titleStr);
        const modelDisplay = escapeHtml(s.model || 'Claude');
        const modelAttr = escapeAttribute(s.model || 'Claude');
        const sessionIdAttr = escapeAttribute(s.sessionId || '');
        const sessionFileAttr = escapeAttribute(s.sessionFile || '');

        const isFork = titleStr.includes('(Fork');
        const forkBadge = isFork ? '<span class="status-pill fork" title="Fork 会话">Fork</span>' : '';
        const agentsBadge = (s.agentsCount && s.agentsCount > 0) ? ' <span title="包含 ' + s.agentsCount + ' 个协作代理" style="background: rgba(224, 122, 95, 0.15); color: var(--claude-accent); font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: 600;"><span class="badge-icon">🤖</span><span class="badge-text"> ' + s.agentsCount + '</span></span>' : '';

        const durationMs = s.durationMs !== undefined ? s.durationMs : 0;
        const durationStr = durationMs > 0 ? formatDuration(durationMs, false) : '';
        let durationTitle = '累计有效对话: ' + durationStr;
        if (s.totalSpanMs && s.totalSpanMs > durationMs) {
          durationTitle += ' · 创建跨度: ' + formatDuration(s.totalSpanMs, false);
        }
        const durationBadge = durationStr ? '<span title="' + escapeAttribute(durationTitle) + '">⏱️ ' + durationStr + '</span>' : '';

        const rightMetaParts = [];
        if (durationBadge) rightMetaParts.push(durationBadge);
        if (timeStr) rightMetaParts.push(timeStr);
        const rightMetaHtml = rightMetaParts.join(' · ');

        let tokenText = pct + ' (' + tokens + ' Tokens)';
        if (s.subagentsTotalTokens && s.subagentsTotalTokens > 0) {
          tokenText += ' <span style="opacity: 0.75;" title="含子代理独立消耗: +' + s.subagentsTotalTokens + '">(含代理 +' + formatTokenCount(s.subagentsTotalTokens) + ')</span>';
        }

        const compareMenuItem = s.parentSessionId
          ? '<button type="button" class="session-menu-item" role="menuitem" data-action="compareFork" data-session-id="' + sessionIdAttr + '" title="对比父会话"><span class="session-menu-icon">🔀</span><span class="session-menu-text">对比父会话</span></button>'
          : '';
        const moreMenuHtml =
          '<div class="session-more-wrap">' +
            '<button type="button" class="session-act-btn more" data-action="toggleSessionMenu" data-session-id="' + sessionIdAttr + '" title="更多会话操作" aria-haspopup="menu" aria-expanded="false"><span class="btn-icon">⋯</span><span class="btn-text">更多</span></button>' +
            '<div class="session-more-menu" role="menu" aria-label="会话更多操作" data-session-id="' + sessionIdAttr + '">' +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="renameSession" data-session-id="' + sessionIdAttr + '" title="重命名会话"><span class="session-menu-icon">✏️</span><span class="session-menu-text">重命名</span></button>' +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="togglePinSession" data-session-id="' + sessionIdAttr + '" title="置顶/取消置顶"><span class="session-menu-icon">' + (s.pinned ? '📌' : '📍') + '</span><span class="session-menu-text">' + (s.pinned ? '取消置顶' : '置顶') + '</span></button>' +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="exportSession" data-session-id="' + sessionIdAttr + '" title="导出 Markdown"><span class="session-menu-icon">📄</span><span class="session-menu-text">导出 Markdown</span></button>' +
              compareMenuItem +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="editSessionTags" data-session-id="' + sessionIdAttr + '" title="编辑标签"><span class="session-menu-icon">🏷️</span><span class="session-menu-text">编辑标签</span></button>' +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="showTimeline" data-session-id="' + sessionIdAttr + '" title="权限/Hook 时间线"><span class="session-menu-icon">🛡️</span><span class="session-menu-text">时间线</span></button>' +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="forkSession" data-session-id="' + sessionIdAttr + '" title="分叉此会话 (Fork)"><span class="session-menu-icon">🌿</span><span class="session-menu-text">分叉</span></button>' +
              '<button type="button" class="session-menu-item" role="menuitem" data-action="openSessionFile" data-file-path="' + sessionFileAttr + '" title="查看原始 JSONL 日志"><span class="session-menu-icon">📄</span><span class="session-menu-text">查看日志</span></button>' +
              '<div class="session-menu-sep" role="separator"></div>' +
              '<button type="button" class="session-menu-item danger" role="menuitem" data-action="deleteSession" data-session-id="' + sessionIdAttr + '" title="删除此会话"><span class="session-menu-icon">🗑️</span><span class="session-menu-text">删除会话</span></button>' +
            '</div>' +
          '</div>';

        const branchRow = branchStr ? '<div class="session-branch-row"><span class="session-branch-text" title="' + branchAttr + '">' + branchStr + '</span></div>' : '';

        return '<div class="' + cardClass + '">' +
          '<div class="session-header-row">' +
            '<div class="session-title-text" title="' + titleAttr + '">' + titleDisplay + '</div>' +
            '<div class="session-header-badges">' + focusedTag + activeTag + pinnedTag + loopBadge + bgBadge + agentsBadge + forkBadge + tagsBadge + '</div>' +
          '</div>' +
          '<div class="session-sub-row">' +
            '<span class="session-project-name" title="' + projectNameAttr + '">' + projectNameStr + '</span>' +
            '<span class="session-model-text" title="' + modelAttr + '">' + modelDisplay + '</span>' +
          '</div>' +
          branchRow +
          '<div class="session-meta-row">' +
            '<span class="session-meta-main">' + tokenText + '</span>' +
            '<span class="session-meta-side">' + rightMetaHtml + '</span>' +
          '</div>' +
          '<div class="session-actions-row">' +
            '<button type="button" class="session-act-btn focus" data-action="focusSession" data-session-id="' + sessionIdAttr + '" title="查看此会话"><span class="btn-icon">👀</span><span class="btn-text">查看</span></button>' +
            '<button type="button" class="session-act-btn resume" data-action="resumeSession" data-session-id="' + sessionIdAttr + '" title="在终端恢复 (claude --resume)"><span class="btn-icon">▶️</span><span class="btn-text">恢复</span></button>' +
            moreMenuHtml +
          '</div>' +
        '</div>';
      }).join('');

      if (openSessionMenuId) {
        const reopened = getSessionMenuBySessionId(openSessionMenuId);
        if (reopened) {
          setSessionMenuOpen(reopened, getSessionMenuTrigger(reopened), true, false);
        } else {
          openSessionMenuId = null;
        }
      }
      if (focusedAction) {
        const controls = container.querySelectorAll('[data-action]');
        for (let i = 0; i < controls.length; i++) {
          const control = controls[i];
          if (control.getAttribute('data-action') === focusedAction &&
              control.getAttribute('data-session-id') === focusedId &&
              control.getAttribute('data-file-path') === focusedPath) {
            control.focus({ preventScroll: true });
            break;
          }
        }
      }
    }

    function getSessionMenuBySessionId(sessionId) {
      const menus = document.querySelectorAll('.session-more-menu');
      for (let i = 0; i < menus.length; i++) {
        if (menus[i].getAttribute('data-session-id') === sessionId) return menus[i];
      }
      return null;
    }

    function getSessionMenuTrigger(menu) {
      if (!menu) return null;
      const wrap = menu.closest('.session-more-wrap');
      return wrap ? wrap.querySelector('[data-action="toggleSessionMenu"]') : null;
    }

    function getSessionMenuItems(menu) {
      if (!menu) return [];
      return Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'));
    }

    function setSessionMenuOpen(menu, trigger, open, focusFirst) {
      if (!menu) return;
      const sessionId = menu.getAttribute('data-session-id') || '';
      if (open) {
        const otherMenus = document.querySelectorAll('.session-more-menu.open');
        for (let i = 0; i < otherMenus.length; i++) {
          if (otherMenus[i] !== menu) {
            setSessionMenuOpen(otherMenus[i], getSessionMenuTrigger(otherMenus[i]), false, false);
          }
        }
        menu.classList.add('open');
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
        openSessionMenuId = sessionId;
        menu.classList.remove('drop-up');
        const rect = menu.getBoundingClientRect();
        if (window.innerHeight - rect.bottom < 8 && rect.top > rect.height) {
          menu.classList.add('drop-up');
        }
        if (focusFirst) {
          const items = getSessionMenuItems(menu);
          if (items.length) items[0].focus();
        }
      } else {
        menu.classList.remove('open');
        menu.classList.remove('drop-up');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (openSessionMenuId === sessionId) openSessionMenuId = null;
      }
    }

    function toggleSessionMenu(triggerElement, focusFirst) {
      if (!triggerElement) return;
      const wrap = triggerElement.closest('.session-more-wrap');
      const menu = wrap ? wrap.querySelector('.session-more-menu') : null;
      if (!menu) return;
      const willOpen = !menu.classList.contains('open');
      setSessionMenuOpen(menu, triggerElement, willOpen, willOpen && focusFirst === true);
    }

    function closeSessionMenu(returnFocus) {
      const openMenus = document.querySelectorAll('.session-more-menu.open');
      let triggerToFocus = null;
      for (let i = 0; i < openMenus.length; i++) {
        const trigger = getSessionMenuTrigger(openMenus[i]);
        if (returnFocus && !triggerToFocus) triggerToFocus = trigger;
        setSessionMenuOpen(openMenus[i], trigger, false, false);
      }
      openSessionMenuId = null;
      if (returnFocus && triggerToFocus) triggerToFocus.focus();
    }

    document.addEventListener('keydown', event => {
      const target = event.target instanceof Element ? event.target : null;
      const trigger = target ? target.closest('[data-action="toggleSessionMenu"]') : null;
      if (trigger && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        const wrap = trigger.closest('.session-more-wrap');
        const menu = wrap ? wrap.querySelector('.session-more-menu') : null;
        if (!menu) return;
        if (!menu.classList.contains('open')) {
          setSessionMenuOpen(menu, trigger, true, false);
        }
        const items = getSessionMenuItems(menu);
        if (items.length) {
          items[event.key === 'ArrowUp' ? items.length - 1 : 0].focus();
        }
        return;
      }

      const openMenu = document.querySelector('.session-more-menu.open');
      if (!openMenu) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeSessionMenu(true);
        return;
      }
      if (event.key === 'Tab') {
        closeSessionMenu(false);
        return;
      }

      const items = getSessionMenuItems(openMenu);
      if (!items.length) return;
      const currentIndex = items.indexOf(document.activeElement);
      let nextIndex = -1;
      if (event.key === 'ArrowDown') {
        nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      } else if (event.key === 'ArrowUp') {
        nextIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = items.length - 1;
      }
      if (nextIndex >= 0) {
        event.preventDefault();
        items[nextIndex].focus();
      }
    });


    // Message Receiver
    window.addEventListener('message', event => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'restoreUiState') {
        restoreUiState(msg.state);
        return;
      }

      if (msg.type === 'updateSession') {
        if (!uiStateRestored) restoreUiState();
        applyHubUiStrings(msg.ui);
        applyToolbarI18n();
        if (msg.sessionListPageSize && msg.sessionListPageSize >= 4) {
          pageSize = Math.min(50, Math.max(4, Number(msg.sessionListPageSize) || 8));
        }
        const s = msg.session;
        currentSession = s || null;
        if (msg.allSessions) {
          allSessions = msg.allSessions;
        }
        if (msg.focusedSessionId !== undefined) {
          focusedSessionId = msg.focusedSessionId;
        }

        if (msg.filterMode !== undefined) {
          const modeChanged = backendFilterMode !== msg.filterMode;
          backendFilterMode = msg.filterMode;
          updateTopFilterButton(msg.filterMode);

          if (modeChanged && (initialFilterModeReceived || currentFilter === 'all' || currentFilter === 'workspace')) {
            currentFilter = msg.filterMode === 'currentWorkspace' ? 'workspace' : 'all';
            currentPage = 1;
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            const activeChip = document.getElementById(msg.filterMode === 'currentWorkspace' ? 'chip-ws' : 'chip-all');
            if (activeChip) activeChip.classList.add('active');
          }
          initialFilterModeReceived = true;
        }

        renderSessionsList();

        if (s) {
          const projName = s.projectName || '未知项目';
          const projEl = document.getElementById('proj-name');
          projEl.innerText = projName;
          projEl.title = projName;
          const pct = (s.tokenUsage && s.tokenUsage.percentage) || 0;
          document.getElementById('token-pct').innerText = pct + '%';
          // Width only: the fill color stays on the theme-driven CSS rule.
          document.getElementById('token-fill').style.width = Math.min(pct, 100) + '%';
          const tokenBar = document.getElementById('token-progress');
          if (tokenBar) tokenBar.setAttribute('aria-valuenow', String(Math.round(pct)));

          if (s.tokenUsage) {
            document.getElementById('m-in').innerText = formatTokenCount(s.tokenUsage.inputTokens);
            document.getElementById('m-cache').innerText = formatTokenCount(s.tokenUsage.cacheReadTokens);
            document.getElementById('m-write').innerText = formatTokenCount(s.tokenUsage.cacheCreationTokens);
            document.getElementById('m-out').innerText = formatTokenCount(s.tokenUsage.outputTokens);
          }

          const dispModel = s.modelDisplay || s.model || '默认';
          const respExtra = (s.lastResponseModelDisplay && s.lastResponseModelDisplay !== dispModel)
            ? ' (响应: ' + s.lastResponseModelDisplay + ')'
            : '';
          const modelEl = document.getElementById('model-tag');
          modelEl.innerText = dispModel + respExtra;
          modelEl.title = '模型: ' + dispModel + (respExtra ? ' · 最近响应: ' + s.lastResponseModelDisplay : '');
          const branchEl = document.getElementById('branch-tag');
          branchEl.innerText = s.gitBranch || '未关联';
          branchEl.title = s.gitBranch ? 'Git 分支: ' + s.gitBranch : '当前会话未关联 Git 分支';
          const baseCostText = '预估消耗: ' + (msg.cost || '< $0.001');
          const subagentCostExtra = (s.subagentsTotalTokens && s.subagentsTotalTokens > 0)
            ? ' (含子代理: +' + formatTokenCount(s.subagentsTotalTokens) + ' tok)'
            : '';
          const costEl = document.getElementById('cost-label');
          costEl.innerText = (msg.cost || '< $0.001') + subagentCostExtra;
          costEl.title = baseCostText + subagentCostExtra;

          const statusBadge = document.getElementById('session-status-badge');
          const globalBadge = document.getElementById('global-status-pill');
          if (!s.isIdle) {
            statusBadge.className = 'status-pill active';
            statusBadge.innerText = '⚡ 活跃';
            globalBadge.className = 'status-pill active';
            globalBadge.innerText = '活跃';
          } else {
            statusBadge.className = 'status-pill idle';
            statusBadge.innerText = '💤 闲置';
            globalBadge.className = 'status-pill idle';
            globalBadge.innerText = '闲置';
          }

          // Active Tool Banner
          const banner = document.getElementById('running-tool-banner');
          if (s.activeTools && s.activeTools.length > 0 && !s.isIdle) {
            const t = s.activeTools[0];
            document.getElementById('running-tool-name').innerText = t.name;
            document.getElementById('running-tool-target').innerText = t.target ? ' ' + t.target : '';
            const tStartMs = t.startTime ? new Date(t.startTime).getTime() : 0;
            const tDurSec = tStartMs > 0 ? Math.max(0, Math.floor((Date.now() - tStartMs) / 1000)) : (t.durationMs ? Math.round(t.durationMs / 1000) : 0);
            document.getElementById('running-tool-dur').innerText = tDurSec + 's';
            banner.style.display = 'flex';
          } else {
            banner.style.display = 'none';
          }

          // Todos List — hide the whole section when this session has no tasks
          const todosWrap = document.getElementById('todos-container');
          const todosList = document.getElementById('todos-list');
          const warnOnlyPlan = shouldWarnPlanWithoutChecklist(s);
          const todos = Array.isArray(s.todos) ? s.todos : [];
          const hasPendingCreates = Array.isArray(s.pendingTaskCreates) && s.pendingTaskCreates.length > 0;
          const hasTodoContent = todos.length > 0 || hasPendingCreates;
          if (hasTodoContent) {
            todosWrap.style.display = 'block';
            const done = todos.filter(x => x.status === 'completed').length;
            const inProg = todos.filter(x => x.status === 'in_progress').length;
            const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;
            const isAllCompleted = todos.length > 0 && done === todos.length;

            const counterEl = document.getElementById('todos-counter');
            const caret = document.getElementById('todos-caret');
            const clearBtn = document.getElementById('todos-clear-btn');
            const syncBtn = document.getElementById('todos-sync-btn');
            const activityEl = document.getElementById('todos-activity');

            if (clearBtn) {
              clearBtn.style.display = 'inline-block';
            }
            if (syncBtn) {
              syncBtn.style.display = s.taskSource === 'plan' || s.taskSource === 'markdown' ? 'inline-block' : 'none';
            }
            if (activityEl) {
              renderTodosActivity(activityEl, s);
              if (s.projectTodoPolicy && s.projectTodoPolicy.activity_separate_from_status === false) {
                activityEl.textContent = '';
                activityEl.style.display = 'none';
              }
            }
            updateTodosPlanWarn(s);

            if (counterEl) {
              if (isAllCompleted) {
                counterEl.className = 'status-pill idle';
                counterEl.innerHTML = '<span>✓ ' + done + '/' + todos.length + '</span><span class="todo-counter-detail">(已完成)</span>';
                counterEl.title = '✓ ' + done + '/' + todos.length + ' (已完成)';
              } else {
                counterEl.className = inProg > 0 ? 'status-pill active' : 'status-pill';
                const summaryText = done + '/' + todos.length;
                counterEl.innerHTML = '<span>' + summaryText + '</span><span class="todo-counter-detail">(' + pct + '%)</span>' + (inProg > 0 ? '<span class="todo-spinner" role="img" title="进行中" aria-label="进行中"></span>' : '');
                counterEl.title = summaryText + ' (' + pct + '%)' + (inProg > 0 ? ' · 进行中' : '');
              }
            }
            const progBar = document.getElementById('todos-progress-bar');
            if (progBar) {
              progBar.style.width = pct + '%';
            }

            // 全部已完成：若用户未手动点击过，自动折叠收起
            if (isAllCompleted) {
              if (!userToggledTodos) {
                todosList.style.display = 'none';
                if (caret) caret.style.transform = 'rotate(-90deg)';
              } else {
                todosList.style.display = userManuallyOpenedTodos ? 'block' : 'none';
                if (caret) caret.style.transform = userManuallyOpenedTodos ? 'rotate(0deg)' : 'rotate(-90deg)';
              }
            } else {
              // 存在未完成任务，自动展开
              todosList.style.display = 'block';
              if (caret) caret.style.transform = 'rotate(0deg)';
            }

            renderTodosList(s);
          } else if (warnOnlyPlan) {
            todosWrap.style.display = 'block';
            if (todosList) todosList.innerHTML = '';
            const syncBtn = document.getElementById('todos-sync-btn');
            if (syncBtn) syncBtn.style.display = s.taskSource === 'plan' || s.taskSource === 'markdown' ? 'inline-block' : 'none';
            const clearBtn = document.getElementById('todos-clear-btn');
            if (clearBtn) clearBtn.style.display = 'none';
            const activityEl = document.getElementById('todos-activity');
            if (activityEl) { activityEl.textContent = ''; activityEl.style.display = 'none'; }
            const counterEl = document.getElementById('todos-counter');
            if (counterEl) { counterEl.className = 'status-pill'; counterEl.innerHTML = '0/0'; counterEl.title = '0/0'; }
            const progBar = document.getElementById('todos-progress-bar');
            if (progBar) progBar.style.width = '0%';
            updateTodosPlanWarn(s);
          } else {
            todosWrap.style.display = 'none';
            if (todosList) todosList.innerHTML = '';
            const activityEl = document.getElementById('todos-activity');
            if (activityEl) {
              activityEl.textContent = '';
              activityEl.style.display = 'none';
            }
            const warnEl = document.getElementById('todos-plan-warn');
            if (warnEl) { warnEl.textContent = ''; warnEl.style.display = 'none'; }
            userToggledTodos = false;
            userManuallyOpenedTodos = false;
          }

          // Agents Map (Subagents List)
          const agentsWrap = document.getElementById('agents-container');
          const agentsList = document.getElementById('agents-list');
          if (s.agents && s.agents.length > 0) {
            agentsWrap.style.display = 'block';
            const runningCount = s.agents.filter(a => a.status === 'running').length;
            const counterEl = document.getElementById('agents-counter');
            const caret = document.getElementById('agents-caret');

            if (runningCount > 0) {
              if (counterEl) {
                counterEl.className = 'status-pill active';
                counterEl.innerText = runningCount + ' 运行中 · 共 ' + s.agents.length;
              }
              // 运行中有活跃任务，自动保持展开
              agentsList.style.display = 'flex';
              if (caret) caret.style.transform = 'rotate(0deg)';
            } else {
              if (counterEl) {
                counterEl.className = 'status-pill idle';
                counterEl.innerText = '✓ ' + s.agents.length + ' 个代理 (已完成)';
              }
              // 全部已完成：若用户未手动点击过，自动折叠收起
              if (!userToggledAgents) {
                agentsList.style.display = 'none';
                if (caret) caret.style.transform = 'rotate(-90deg)';
              } else {
                agentsList.style.display = userManuallyOpened ? 'flex' : 'none';
                if (caret) caret.style.transform = userManuallyOpened ? 'rotate(0deg)' : 'rotate(-90deg)';
              }
            }

            agentsList.innerHTML = s.agents.map((a, idx) => {
              const isNested = (a.spawnDepth && a.spawnDepth > 1) || !!a.parentAgentId;
              const statusClass = a.status === 'completed' ? ' completed' : (a.status === 'running' ? ' running' : '');
              const cardClass = (isNested ? 'agent-item nested' : 'agent-item') + statusClass;
              const dotClass = a.status === 'running' ? 'agent-dot running' : (a.status === 'error' ? 'agent-dot error' : 'agent-dot completed');
              const nameText = a.name || (a.type ? '/' + a.type : '子代理 #' + (idx + 1));
              const nameDisplay = escapeHtml(nameText);
              const typeBadge = a.type && a.type !== 'fork' ? '<span class="agent-type-badge">' + escapeHtml(a.type) + '</span>' : '';

              const badges = [];
              if (a.durationMs) {
                badges.push('<span class="agent-meta-chip">⏱️ ' + formatDuration(a.durationMs, false) + '</span>');
              } else if (a.startTime) {
                const liveDur = Math.max(0, Date.now() - new Date(a.startTime).getTime());
                badges.push('<span class="agent-meta-chip">⏱️ ' + formatDuration(liveDur, false) + '</span>');
              }
              if (a.totalTokens) {
                badges.push('<span class="agent-meta-chip">🪙 ' + formatTokenCount(a.totalTokens) + '</span>');
              }
              if (a.toolsCount && a.toolsCount > 0) {
                badges.push('<span class="agent-meta-chip">🛠️ ' + a.toolsCount + '</span>');
              }
              if (a.worktreeBranch) {
                const branch = String(a.worktreeBranch);
                const shown = branch.length > 18 ? branch.slice(0, 17) + '…' : branch;
                badges.push('<span class="agent-meta-chip agent-meta-branch" title="Worktree: ' + escapeAttribute(branch) + '">🌿 ' + escapeHtml(shown) + '</span>');
              }

              const descHtml = a.description ? '<div class="agent-desc" title="' + escapeAttribute(a.description) + '">' + escapeHtml(a.description) + '</div>' : '';

              const agentKey = a.id || a.toolUseId || ('agent-' + idx);
              const agentDetailId = 'agent-detail-' + idx;
              const details = [];
              if (a.id) details.push('<div><strong>ID:</strong> ' + escapeHtml(a.id) + '</div>');
              if (a.model) details.push('<div><strong>模型:</strong> ' + escapeHtml(a.model) + '</div>');
              if (a.parentAgentId) details.push('<div><strong>父代理:</strong> ' + escapeHtml(a.parentAgentId) + '</div>');
              if (a.worktreePath) {
                details.push('<div><strong>工作区:</strong> ' + escapeHtml(a.worktreePath) + '</div>');
                details.push('<div class="agent-wt-actions"><button class="agent-wt-btn" data-action="openWorktree" data-worktree-path="' + escapeAttribute(a.worktreePath) + '">📂 Worktree</button></div>');
              }
              const isExpanded = expandedAgentKeys.has(agentKey);
              const detailContent = details.length > 0 ? '<div id="' + agentDetailId + '" class="agent-detail-body" style="display: ' + (isExpanded ? 'flex' : 'none') + ';">' + details.join('') + '</div>' : '';

              return '<div class="' + cardClass + '" onclick="toggleAgentDetail(\\'' + agentDetailId + '\\', \\'' + escapeAttribute(agentKey) + '\\', event)">' +
                '<div class="agent-item-header">' +
                  '<div class="agent-title-row">' +
                    '<span class="' + dotClass + '"></span>' +
                    '<span class="agent-name" title="' + escapeAttribute(nameText) + '">' + nameDisplay + '</span>' +
                    typeBadge +
                  '</div>' +
                  '<div class="agent-badges">' + badges.join('') + '</div>' +
                '</div>' +
                descHtml +
                detailContent +
              '</div>';
            }).join('');
          } else {
            if (agentsWrap) agentsWrap.style.display = 'none';
            if (agentsList) agentsList.innerHTML = '';
            userToggledAgents = false;
            userManuallyOpened = false;
          }
        } else {
          const todosWrap = document.getElementById('todos-container');
          if (todosWrap) todosWrap.style.display = 'none';
          const todosList = document.getElementById('todos-list');
          if (todosList) todosList.innerHTML = '';
          const counterEl = document.getElementById('todos-counter');
          if (counterEl) {
            counterEl.innerText = '0/0';
            counterEl.className = 'status-pill';
            counterEl.title = '';
          }
          const progBar = document.getElementById('todos-progress-bar');
          if (progBar) progBar.style.width = '0%';
          userToggledTodos = false;
          userManuallyOpenedTodos = false;
          const agentsWrap = document.getElementById('agents-container');
          if (agentsWrap) agentsWrap.style.display = 'none';
          const agentsList = document.getElementById('agents-list');
          if (agentsList) agentsList.innerHTML = '';
          userToggledAgents = false;
          userManuallyOpened = false;
        }

        updateLiveSessionDuration();
        renderLoopBanner(s);

        // Subscription Rate Limits (opt-in OAuth meters)
        if (msg.subscription && (msg.subscription.session || (msg.subscription.meters && msg.subscription.meters.length))) {
          const meter = msg.subscription.session || msg.subscription.meters[0];
          document.getElementById('sub-container').style.display = 'block';
          const pct = Math.min(100, Math.round(meter.percentage || 0));
          document.getElementById('sub-fill').style.width = pct + '%';
          const label = meter.label || 'Quota';
          const reset = meter.resetsAt ? new Date(meter.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          document.getElementById('sub-reset').innerText = label + ' · ' + pct + '%' + (reset ? ' · ' + reset : '');
          const titleEl = document.querySelector('#sub-container span');
          if (titleEl && titleEl.id !== 'sub-reset') titleEl.textContent = '⏳ ' + label;
        } else if (msg.subscriptionError) {
          document.getElementById('sub-container').style.display = 'block';
          document.getElementById('sub-fill').style.width = '0%';
          document.getElementById('sub-reset').innerText = msg.subscriptionError;
        }
        const metersEl = document.getElementById('sub-meters');
        if (metersEl) {
          const meters = (msg.subscription && msg.subscription.meters) ? msg.subscription.meters.slice(0, 4) : [];
          metersEl.innerHTML = meters.map(m => {
            const p = Math.min(100, Math.round(m.percentage || 0));
            return '<div>' + escapeHtml(m.label || m.key) + ': ' + p + '%</div>';
          }).join('');
        }
        renderBackgroundJobs(s);
      }

      if (msg.type === 'loadConfig') {
        applyHubUiStrings(msg.ui);
        renderTodoToolsPanel(msg);
        const c = msg.config || {};
        if (msg.projectDocs) {
          const btnAgents = document.getElementById('btn-open-agents-md');
          const btnClaude = document.getElementById('btn-open-claude-md');
          if (btnAgents) {
            btnAgents.innerHTML = msg.projectDocs.hasAgentsMd ? '🤖 编辑 AGENTS.md' : '🤖 生成 AGENTS.md';
            btnAgents.title = msg.projectDocs.hasAgentsMd ? '当前项目已存在 AGENTS.md，点击打开编辑' : '当前项目未创建 AGENTS.md，点击自动生成模板';
          }
          if (btnClaude) {
            btnClaude.innerHTML = msg.projectDocs.hasClaudeMd ? '📝 编辑 CLAUDE.md' : '📝 生成 CLAUDE.md';
            btnClaude.title = msg.projectDocs.hasClaudeMd ? '当前项目已存在 CLAUDE.md，点击打开编辑' : '当前项目未创建 CLAUDE.md，点击自动生成模板';
          }
        }
      }

      if (msg.type === 'loadExtensions') {
        extData = {
          projectMemory: msg.projectMemory || null,
          plugins: Array.isArray(msg.plugins) ? msg.plugins : [],
          mcpServers: Array.isArray(msg.mcpServers) ? msg.mcpServers : [],
          customAgents: Array.isArray(msg.customAgents) ? msg.customAgents : [],
          skills: Array.isArray(msg.skills) ? msg.skills : []
        };
        renderExtensionsPanel();
        if (pendingScrollY !== null) requestAnimationFrame(restoreDashboardScroll);
      }
    });

    let scrollSaveTimer = null;
    window.addEventListener('scroll', () => {
      if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
      scrollSaveTimer = setTimeout(() => {
        pendingScrollY = null;
        saveUiState();
      }, 250);
    }, { passive: true });

    // 1-second live ticker for session duration, running tools, loop countdown, and background jobs
    setInterval(() => {
      if (currentSession && (!currentSession.isIdle || (currentSession.activeTools && currentSession.activeTools.length > 0))) {
        updateLiveSessionDuration();
      }
      if (currentSession && currentSession.loopState && currentSession.loopState.active) {
        renderLoopBanner(currentSession);
      }
      const ownRunning = currentSession && currentSession.backgroundJobs && currentSession.backgroundJobs.some(function (job) { return job && job.status === 'running'; });
      if (ownRunning) renderBackgroundJobs(currentSession);
    }, 1000);

    // Notify backend ready
    applyToolbarI18n();
    sendMessage('ready');
  </script>
</body>
</html>`;
}
