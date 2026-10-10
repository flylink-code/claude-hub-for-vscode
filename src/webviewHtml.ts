export function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Hub</title>
  <style>
    :root {
      --bg-color: var(--vscode-sideBar-background);
      --card-bg: var(--vscode-editor-background, rgba(30, 30, 30, 0.5));
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(255, 255, 255, 0.04);
      --claude-accent: #e07a5f;
      --claude-amber: #d97706;
      --success-color: #4ec9b0;
      --warning-color: #d7ba7d;
      --danger-color: #f14c4c;
      --text-main: var(--vscode-foreground);
      --text-muted: var(--vscode-descriptionForeground, #8c8c8c);
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

    /* Top Bar */
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding: 0 2px;
    }

    .top-title {
      font-weight: 700;
      font-size: 12px;
      letter-spacing: -0.2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .top-actions {
      display: flex;
      gap: 4px;
    }

    .icon-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      border-radius: 4px;
      padding: 3px 6px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-main);
    }

    .icon-btn.active {
      background: rgba(224, 122, 95, 0.16);
      border-color: rgba(224, 122, 95, 0.4);
      color: var(--claude-accent);
      font-weight: 600;
    }

    /* Accordion Section */
    .section-wrap {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      margin-bottom: 8px;
      overflow: hidden;
      transition: border-color 0.2s;
    }

    .section-wrap:hover {
      border-color: rgba(255, 255, 255, 0.14);
    }

    .section-header {
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-weight: 600;
      font-size: 11.5px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid transparent;
      user-select: none;
    }

    .section-header:hover {
      background: rgba(255, 255, 255, 0.05);
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
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-muted);
    }

    .status-pill.active {
      background: rgba(78, 201, 176, 0.15);
      color: var(--success-color);
      border: 1px solid rgba(78, 201, 176, 0.3);
    }

    .status-pill.idle {
      background: rgba(140, 140, 140, 0.15);
      color: var(--text-muted);
    }

    .status-pill.focused {
      background: rgba(224, 122, 95, 0.15);
      color: var(--claude-accent);
      border: 1px solid rgba(224, 122, 95, 0.3);
    }

    /* Progress Bar */
    .progress-bar-track {
      background: rgba(255, 255, 255, 0.08);
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin: 6px 0 8px 0;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: 3px;
      background: linear-gradient(90deg, #4ec9b0, #d97706);
      transition: width 0.3s ease;
    }

    /* Metrics Bubbles */
    .metrics-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
    }

    .metric-bubble {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 10.5px;
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .metric-bubble-lbl {
      color: var(--text-muted);
    }

    .metric-bubble-val {
      font-weight: 600;
      color: var(--text-main);
    }

    .hud-info-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 3px;
      gap: 4px;
      min-width: 0;
    }

    .hud-info-row > span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Running Tool Banner */
    .running-bar {
      background: rgba(224, 122, 95, 0.12);
      border: 1px solid rgba(224, 122, 95, 0.3);
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
      color: #58a6ff;
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
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: background 0.15s;
    }
    .todo-item-card:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .todo-item-card.completed {
      opacity: 0.7;
    }
    .todo-item-card.in_progress {
      background: rgba(56, 139, 253, 0.1);
      border-color: rgba(56, 139, 253, 0.32);
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
      color: var(--text-muted, #8b949e);
      background: rgba(139, 148, 158, 0.12);
      border-color: rgba(139, 148, 158, 0.28);
    }
    .todo-status-chip.in_progress {
      color: #58a6ff;
      background: rgba(56, 139, 253, 0.16);
      border-color: rgba(56, 139, 253, 0.4);
    }
    .todo-status-chip.completed {
      color: var(--success-color, #2ea043);
      background: rgba(46, 160, 67, 0.14);
      border-color: rgba(46, 160, 67, 0.35);
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
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 10px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }

    .filter-chip:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-main);
    }

    .filter-chip.active {
      background: var(--claude-accent);
      color: #fff;
      border-color: var(--claude-accent);
      font-weight: 600;
    }

    .chip-label-short {
      display: none;
    }

    .search-box {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      margin-bottom: 8px;
      outline: none;
    }

    .search-box:focus {
      border-color: var(--claude-accent);
    }

    /* Session Card */
    .session-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 5px;
      padding: 8px;
      margin-bottom: 6px;
      transition: all 0.15s ease;
    }

    .session-card:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .session-card.focused {
      border-color: rgba(224, 122, 95, 0.5);
      background: rgba(224, 122, 95, 0.06);
    }

    .session-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3px;
      gap: 6px;
      min-width: 0;
    }

    .session-project-name {
      font-weight: 600;
      font-size: 11.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1 1 auto;
      min-width: 0;
    }

    .session-header-badges {
      display: flex;
      align-items: center;
      gap: 3px;
      flex-shrink: 0;
    }

    .session-header-badges .status-pill {
      font-size: 9px;
      padding: 1.5px 5px;
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

    .session-title-text {
      color: var(--text-muted);
      font-size: 10.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 5px;
    }

    .session-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: var(--text-muted);
      margin-bottom: 6px;
      flex-wrap: wrap;
      gap: 4px;
    }

    .session-actions-row {
      display: flex;
      gap: 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 6px;
    }

    .session-act-btn {
      flex: 1 1 0;
      min-width: 0;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-main);
      border-radius: 3px;
      padding: 2.5px 4px;
      font-size: 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      white-space: nowrap;
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
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }

    .session-act-btn.fork:hover {
      background: rgba(78, 201, 176, 0.2);
      border-color: var(--success-color);
      color: var(--success-color);
    }

    .session-act-btn.focus:hover {
      background: rgba(224, 122, 95, 0.2);
      border-color: var(--claude-accent);
      color: var(--claude-accent);
    }

    .session-act-btn.delete:hover {
      background: rgba(244, 71, 71, 0.2);
      border-color: #f44747;
      color: #f44747;
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
        flex-direction: column;
        gap: 1px;
        align-items: flex-start;
      }
      .hud-info-row > span {
        text-align: left !important;
        max-width: 100%;
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
      .top-bar {
        flex-wrap: wrap;
        gap: 4px;
      }
      .top-actions .icon-btn {
        padding: 2px 4px;
        font-size: 10px;
      }
    }

    /* 旧版 Webview 才使用 viewport fallback；补偿 body 两侧共 16px padding。 */
    @supports not (container-type: inline-size) {
      @media (max-width: 306px) {
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
          flex-direction: column;
          gap: 1px;
          align-items: flex-start;
        }
        .hud-info-row > span {
          text-align: left !important;
          max-width: 100%;
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
        .top-bar {
          flex-wrap: wrap;
          gap: 4px;
        }
        .top-actions .icon-btn {
          padding: 2px 4px;
          font-size: 10px;
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
    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .feature-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.03);
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 11px;
    }

    .switch-btn {
      cursor: pointer;
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: transparent;
      color: var(--text-muted);
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
      justify-content: space-between;
      align-items: center;
      gap: 6px;
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

    .agent-desc {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 3px;
      line-height: 1.3;
      white-space: normal;
      word-break: break-all;
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
  </style>
</head>
<body>
  <div id="app" class="hub-container">

  <!-- Top Action Bar -->
  <div class="top-bar">
    <div class="top-title">
      <span>Claude</span>
      <span class="status-pill" id="global-status-pill">检测中</span>
    </div>
    <div class="top-actions">
      <button class="icon-btn" title="刷新状态" onclick="sendMessage('refresh')">🔄 刷新</button>
      <button class="icon-btn" id="top-filter-btn" title="切换当前工作区 / 全局过滤" onclick="sendMessage('toggleFilter')">📁 过滤</button>
    </div>
  </div>

  <!-- SECTION 1: 实时运行监控 (常驻展开) -->
  <div class="section-wrap" id="sec-monitor">
    <div class="section-header" onclick="toggleSection('sec-monitor')">
      <span class="section-header-title">
        <span class="caret">▼</span>
        <span>📊 实时运行监控</span>
      </span>
      <span id="session-status-badge" class="status-pill">--</span>
    </div>
    <div class="section-body">

      <!-- Project Name & Token % -->
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
        <span id="proj-name" style="font-weight: 600; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%;">未检测到会话</span>
        <span id="token-pct" style="font-weight: 700; color: var(--claude-accent);">0%</span>
      </div>

      <!-- Token Limit Bar -->
      <div class="progress-bar-track">
        <div id="token-fill" class="progress-bar-fill" style="width: 0%;"></div>
      </div>

      <!-- Detail Bubbles -->
      <div class="metrics-row">
        <div class="metric-bubble"><span class="metric-bubble-lbl">输入</span><span id="m-in" class="metric-bubble-val">0</span></div>
        <div class="metric-bubble"><span class="metric-bubble-lbl">缓存</span><span id="m-cache" class="metric-bubble-val">0</span></div>
        <div class="metric-bubble"><span class="metric-bubble-lbl">写入</span><span id="m-write" class="metric-bubble-val">0</span></div>
        <div class="metric-bubble"><span class="metric-bubble-lbl">输出</span><span id="m-out" class="metric-bubble-val">0</span></div>
      </div>

      <div class="hud-info-row">
        <span id="model-tag">模型: --</span>
        <span id="branch-tag">🌿 --</span>
      </div>

      <div class="hud-info-row" style="margin-top: 2px;">
        <span id="cost-label">预估消耗: &lt; $0.001</span>
        <span id="session-dur-label" style="text-align: right;">⏱️ 对话时长: --</span>
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

      <!-- Tasks Checklist (Auto collapsed when empty, collapsible header) -->
      <div id="todos-container" style="margin-top: 8px; display: none;">
        <div class="todos-header" onclick="toggleTodosList()">
          <div class="todos-header-title">
            <span id="todos-caret" class="caret">▼</span>
            <span>📋 待办任务</span>
          </div>
          <div class="todos-header-actions">
            <button type="button" id="todos-sync-btn" class="todos-sync-btn" style="display: none;" title="复制任务同步提示，发送到当前 Claude 对话" aria-label="复制任务同步提示" onclick="copyTodoSyncPrompt(event)">⧉<span class="todos-sync-text"> 复制提示</span></button>
            <button type="button" id="todos-clear-btn" class="todos-clear-btn" style="display: none;" title="隐藏当前待办（不删除任务文件）" aria-label="隐藏当前待办" onclick="clearCompletedTodos(event)">✕<span class="todos-clear-text"> 清除</span></button>
            <span id="todos-counter" class="status-pill">0/0</span>
          </div>
        </div>
        <div class="todo-progress-track">
          <div id="todos-progress-bar" class="todo-progress-fill" style="width: 0%;"></div>
        </div>
        <div id="todos-activity" class="todos-activity" style="display: none;"></div>
        <div id="todos-plan-warn" class="todos-plan-warn" role="status"></div>
        <div id="todos-list"></div>
      </div>

      <!-- Agent Map: 协作代理拓扑 (有代理时自动展示) -->
      <div id="agents-container" style="margin-top: 8px; display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 500; font-size: 11px; margin-bottom: 5px; cursor: pointer;" onclick="toggleAgentsList()">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span id="agents-caret" class="caret" style="display: inline-block; font-size: 9px; transition: transform 0.2s;">▼</span>
            <span>🤖 协作代理拓扑<span class="header-sub"> (Agent Map)</span></span>
          </div>
          <span id="agents-counter" class="status-pill">0</span>
        </div>
        <div id="agents-list" class="agents-tree"></div>
      </div>

      <!-- 5h Quota -->
      <div id="sub-container" style="margin-top: 8px; display: none;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-bottom: 2px;">
          <span>⏳ 5小时订阅配额</span>
          <span id="sub-reset"></span>
        </div>
        <div class="progress-bar-track" style="margin: 0;">
          <div id="sub-fill" class="progress-bar-fill" style="width: 0%;"></div>
        </div>
      </div>

    </div>
  </div>

  <!-- SECTION 2: 会话管理中心 (Session Manager - 默认展开) -->
  <div class="section-wrap" id="sec-sessions">
    <div class="section-header" onclick="toggleSection('sec-sessions')">
      <span class="section-header-title">
        <span class="caret">▼</span>
        <span>🕒 会话历史<span class="header-sub"> (Session Manager)</span></span>
      </span>
      <span id="sessions-total-badge" class="status-pill">0 个会话</span>
    </div>
    <div class="section-body">

      <!-- Filter Chips -->
      <div class="filter-chips-row">
        <button class="filter-chip active" id="chip-all" onclick="setSessionFilter('all')">全部</button>
        <button class="filter-chip" id="chip-ws" onclick="setSessionFilter('workspace')"><span class="chip-label-long">当前工作区</span><span class="chip-label-short">工作区</span></button>
        <button class="filter-chip" id="chip-active" onclick="setSessionFilter('active')">活跃中</button>
      </div>

      <!-- Search Input -->
      <input type="text" class="search-box" id="session-search" placeholder="🔍 搜索项目名称、会话标题..." oninput="onSearchInput(this.value)">

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

  <!-- SECTION 3: 扩展能力 MCP & Skills (默认收起) -->
  <div class="section-wrap collapsed" id="sec-extensions">
    <div class="section-header" onclick="toggleSection('sec-extensions')">
      <span class="section-header-title">
        <span class="caret">▼</span>
        <span>🧩 扩展能力<span class="header-sub"> (MCP &amp; Skills)</span></span>
      </span>
      <span id="ext-count-badge" class="status-pill">0 项</span>
    </div>
    <div class="section-body">

      <!-- MCP Servers -->
      <div style="font-weight: 600; font-size: 11px; margin-bottom: 4px;">🔌 MCP 服务器</div>
      <div id="mcp-servers-list" class="feature-list" style="margin-bottom: 10px;">
        <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
      </div>

      <!-- Skills -->
      <div style="font-weight: 600; font-size: 11px; margin-bottom: 4px;">⚡ 已安装技能 (Skills)</div>
      <div id="skills-list" class="feature-list">
        <div style="color: var(--text-muted); font-size: 11px;">加载中...</div>
      </div>

    </div>
  </div>

  <!-- SECTION 4: 网络代理与高级环境 (默认收起) -->
  <div class="section-wrap collapsed" id="sec-advanced">
    <div class="section-header" onclick="toggleSection('sec-advanced')">
      <span class="section-header-title">
        <span class="caret">▼</span>
        <span>🌐 网络代理与环境配置</span>
      </span>
      <span class="status-pill" style="font-size: 9px;">配置</span>
    </div>
    <div class="section-body">

      <div class="form-group">
        <label class="form-label">API Base URL (代理地址)</label>
        <input type="text" class="form-input" id="cfg-base-url" placeholder="https://api.anthropic.com">
      </div>

      <button class="btn btn-primary" onclick="saveProxyConfig()">💾 保存代理配置</button>
      <div id="save-toast" class="toast">✓ 配置已保存更新</div>

      <button class="btn btn-secondary" onclick="sendMessage('openSettingsJson')">⚙️ 打开 Claude settings.json</button>
      <div class="doc-btn-group">
        <button class="btn btn-secondary" id="btn-open-agents-md" style="flex: 1; margin: 0; padding: 7px 4px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="sendMessage('openProjectDoc', { docType: 'AGENTS' })" title="打开或创建项目根目录 AGENTS.md (支持新版 Agent 规范)">🤖 打开 AGENTS.md</button>
        <button class="btn btn-secondary" id="btn-open-claude-md" style="flex: 1; margin: 0; padding: 7px 4px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="sendMessage('openProjectDoc', { docType: 'CLAUDE' })" title="打开或创建项目根目录 CLAUDE.md (经典项目说明)">📝 打开 CLAUDE.md</button>
      </div>
      <button class="btn btn-secondary" id="btn-inject-todo-policy" style="margin-top: 6px;" onclick="sendMessage('injectTodoPolicy')" title="Append recommended Claude Hub task-tracking section to AGENTS.md or CLAUDE.md">📋 插入任务追踪段落</button>

    </div>
  </div>

  </div><!-- end #app.hub-container -->

  <script>
    const vscode = acquireVsCodeApi();
    let hubUiStrings = {
      planNoChecklistWarn: 'Plan has no GFM checklist — phase status may be inaccurate. Prefer checklist marks or TaskCreate/TaskUpdate.',
      injectSection: 'Insert task-tracking section',
      chipPending: 'Pending',
      chipActive: 'In progress',
      chipDone: 'Done',
      expand: 'Expand',
      collapse: 'Collapse',
    };
    function applyHubUiStrings(ui) {
      if (!ui || typeof ui !== 'object') return;
      if (typeof ui.planNoChecklistWarn === 'string') hubUiStrings.planNoChecklistWarn = ui.planNoChecklistWarn;
      if (typeof ui.injectSection === 'string') hubUiStrings.injectSection = ui.injectSection;
      if (typeof ui.chipPending === 'string') hubUiStrings.chipPending = ui.chipPending;
      if (typeof ui.chipActive === 'string') hubUiStrings.chipActive = ui.chipActive;
      if (typeof ui.chipDone === 'string') hubUiStrings.chipDone = ui.chipDone;
      if (typeof ui.expand === 'string') hubUiStrings.expand = ui.expand;
      if (typeof ui.collapse === 'string') hubUiStrings.collapse = ui.collapse;
      const injectBtn = document.getElementById('btn-inject-todo-policy');
      if (injectBtn) {
        injectBtn.textContent = '📋 ' + hubUiStrings.injectSection;
        injectBtn.title = hubUiStrings.injectSection;
      }
    }


    // Accordion State Memory
    function toggleSection(id) {
      const el = document.getElementById(id);
      el.classList.toggle('collapsed');
      try {
        localStorage.setItem('ch_sec_' + id, el.classList.contains('collapsed') ? '0' : '1');
      } catch (e) {}
    }

    ['sec-monitor', 'sec-sessions', 'sec-extensions', 'sec-advanced'].forEach(id => {
      try {
        const val = localStorage.getItem('ch_sec_' + id);
        if (val === '0') document.getElementById(id).classList.add('collapsed');
        if (val === '1') document.getElementById(id).classList.remove('collapsed');
      } catch (e) {}
    });

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
      if (agents.length) {
        parts.push({
          text: 'Agent ' + (running ? running + ' 运行 · ' : '') + ended + '/' + agents.length + ' 已结束',
          warn: false
        });
      }
      if (!session.isIdle && session.activeTools && session.activeTools.length) {
        parts.push({ text: '工具 ' + session.activeTools[0].name + ' 运行中', warn: false });
      } else if (!session.isIdle && session.lastActivity &&
          (!session.currentTurnStartTime ||
            session.lastActivity.timestamp >= new Date(session.currentTurnStartTime).getTime())) {
        parts.push({ text: '最近 ' + session.lastActivity.name, warn: false });
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

    function renderTodosList(s) {
      const todosList = document.getElementById('todos-list');
      if (!todosList || !s || !s.todos) return;
      todosList.innerHTML = s.todos.map(function(td) {
        const statusClass = td.status === 'completed' ? 'completed' : (td.status === 'in_progress' ? 'in_progress' : 'pending');
        let iconHtml = '<span style="opacity: 0.5;">☐</span>';
        if (td.status === 'completed') {
          iconHtml = '<span style="color: #2ea043; font-weight: bold;">☑</span>';
        } else if (td.status === 'in_progress') {
          iconHtml = '<span class="todo-spinner" role="img" title="进行中" aria-label="进行中"></span>';
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
        return '<div class="todo-item-card ' + statusClass + '" data-todo-id="' + escapeHtml(parts.key) + '">' +
          '<span class="todo-badge-icon">' + iconHtml + '</span>' +
          '<div class="todo-card-main">' +
            '<div class="todo-title-row">' +
              '<span class="todo-title">' + escapeHtml(parts.title) + '</span>' +
              chip +
            '</div>' +
            bodyHtml +
            subHtml +
          '</div>' +
        '</div>';
      }).join('');
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

    function toggleAgentDetail(detailId, agentKey) {
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
      const actionElement = source ? source.closest('[data-action]') : null;
      if (!actionElement) return;

      const action = actionElement.getAttribute('data-action');
      if (!action) return;

      if (action === 'focusSession' || action === 'forkSession' || action === 'deleteSession') {
        sendMessage(action, { sessionId: actionElement.getAttribute('data-session-id') || '' });
      } else if (action === 'openSessionFile') {
        sendMessage(action, { filePath: actionElement.getAttribute('data-file-path') || '' });
      } else if (action === 'toggleMcp') {
        sendMessage(action, {
          name: actionElement.getAttribute('data-name') || '',
          enabled: actionElement.getAttribute('data-enabled') === 'true'
        });
      } else if (action === 'openSkill') {
        sendMessage(action, { filePath: actionElement.getAttribute('data-file-path') || '' });
      }
    });

    // Sessions State
    let allSessions = [];
    let focusedSessionId = null;
    let currentSession = null;
    let currentFilter = 'all';
    let backendFilterMode = null;
    let searchKeyword = '';
    let currentPage = 1;
    const pageSize = 6;

    function updateTopFilterButton(mode) {
      const btn = document.getElementById('top-filter-btn');
      if (!btn) return;
      if (mode === 'currentWorkspace') {
        btn.innerHTML = '📁 工作区';
        btn.className = 'icon-btn active';
        btn.title = '当前过滤：仅当前工作区（点击切换为全部会话）';
      } else {
        btn.innerHTML = '🌐 全部';
        btn.className = 'icon-btn';
        btn.title = '当前过滤：显示全部会话（点击切换为仅当前工作区）';
      }
    }

    function setSessionFilter(filter, notifyBackend = true) {
      currentFilter = filter;
      currentPage = 1;
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
      } else if (filter === 'active') {
        const chip = document.getElementById('chip-active');
        if (chip) chip.classList.add('active');
      }
      renderSessionsList();
    }

    function onSearchInput(val) {
      searchKeyword = (val || '').toLowerCase().trim();
      currentPage = 1;
      renderSessionsList();
    }

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
          durEl.innerText = '⏱️ 对话时长: --';
          durEl.title = '';
        } else {
          const isIdle = !!currentSession.isIdle;
          const createdTime = currentSession.sessionCreated ? new Date(currentSession.sessionCreated).getTime() : 0;
          const turnStartTime = currentSession.currentTurnStartTime ? new Date(currentSession.currentTurnStartTime).getTime() : 0;
          const baseDurMs = currentSession.durationMs || 0;

          if (isIdle) {
            const durText = formatDuration(baseDurMs, false);
            durEl.innerText = '⏱️ 对话时长: ' + durText;
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
              durEl.innerText = '⏱️ 运行时长: ' + turnText + ' (总计 ' + totalText + ')';
              let tip = '当前任务运行时长: ' + turnText + ' · 累计有效对话: ' + totalText;
              if (createdTime > 0) {
                tip += ' · 会话创建于 ' + formatRelativeTime(createdTime);
              }
              durEl.title = tip;
            } else {
              durEl.innerText = '⏱️ 运行时长: ' + formatDuration(totalActiveMs, true);
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

    function renderSessionsList() {
      const container = document.getElementById('session-cards-list');
      const totalBadge = document.getElementById('sessions-total-badge');
      const wsCount = allSessions.filter(s => s.isCurrentWorkspace).length;
      const totalCount = allSessions.length;

      if (currentFilter === 'workspace') {
        totalBadge.innerText = wsCount + ' / ' + totalCount + ' 个会话';
      } else if (currentFilter === 'active') {
        const activeCount = allSessions.filter(s => !s.isIdle).length;
        totalBadge.innerText = activeCount + ' / ' + totalCount + ' 个会话';
      } else {
        totalBadge.innerText = totalCount + ' 个会话';
      }

      let filtered = allSessions.filter(s => {
        if (currentFilter === 'workspace' && !s.isCurrentWorkspace) return false;
        if (currentFilter === 'active' && s.isIdle) return false;
        if (searchKeyword) {
          const matchProj = (s.projectName || '').toLowerCase().includes(searchKeyword);
          const matchTitle = (s.sessionTitle || '').toLowerCase().includes(searchKeyword);
          const matchBranch = (s.gitBranch || '').toLowerCase().includes(searchKeyword);
          const matchModel = (s.model || '').toLowerCase().includes(searchKeyword);
          if (!matchProj && !matchTitle && !matchBranch && !matchModel) return false;
        }
        return true;
      });

      const totalPages = Math.ceil(filtered.length / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      document.getElementById('pagination-info').innerText = '第 ' + currentPage + ' / ' + totalPages + ' 页 (共 ' + filtered.length + ' 条)';
      document.getElementById('btn-prev-page').disabled = currentPage <= 1;
      document.getElementById('btn-next-page').disabled = currentPage >= totalPages;

      if (filtered.length === 0) {
        if (currentFilter === 'workspace') {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 16px 0;"><div>当前工作区暂无会话</div><div style="margin-top: 8px;"><button class="filter-chip active" style="display: inline-block; padding: 3px 10px;" onclick="setSessionFilter(\\'all\\')">🌐 查看全部项目会话</button></div></div>';
        } else {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 16px 0;">未找到符合条件的会话</div>';
        }
        return;
      }

      const startIndex = (currentPage - 1) * pageSize;
      const pageSessions = filtered.slice(startIndex, startIndex + pageSize);

      container.innerHTML = pageSessions.map(s => {
        const isFocused = s.sessionId === focusedSessionId;
        const focusedTag = isFocused ? '<span class="status-pill focused" style="font-size: 9px;"><span class="badge-icon">📍</span><span class="badge-text">当前聚焦</span></span>' : '';
        const activeTag = !s.isIdle ? '<span class="status-pill active" style="font-size: 9px;"><span class="badge-icon">⚡</span><span class="badge-text">活跃</span></span>' : '<span class="status-pill idle" style="font-size: 9px;"><span class="badge-icon">💤</span><span class="badge-text">闲置</span></span>';
        const cardClass = isFocused ? 'session-card focused' : 'session-card';
        const timeStr = formatRelativeTime(s.lastUpdated);
        const tokens = s.tokenUsage ? formatTokenCount(s.tokenUsage.totalTokens) : '0';
        const pct = s.tokenUsage && s.tokenUsage.percentage ? s.tokenUsage.percentage + '%' : '0%';
        const branchStr = s.gitBranch ? '🌿 ' + escapeHtml(s.gitBranch) : '';
        const titleStr = s.sessionTitle ? s.sessionTitle : '未命名对话';
        const projectNameStr = escapeHtml(s.projectName || '未知项目');
        const titleDisplay = escapeHtml(titleStr);
        const titleAttr = escapeAttribute(titleStr);
        const modelDisplay = escapeHtml(s.model || 'Claude');
        const sessionIdAttr = escapeAttribute(s.sessionId || '');
        const sessionFileAttr = escapeAttribute(s.sessionFile || '');

        const isFork = titleStr.includes('(Fork');
        const forkBadge = isFork ? ' <span style="background: rgba(78, 201, 176, 0.15); color: var(--success-color); font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: 600;">Fork</span>' : '';
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
        if (branchStr) rightMetaParts.push(branchStr);
        if (timeStr) rightMetaParts.push(timeStr);
        const rightMetaHtml = rightMetaParts.join(' · ');

        let tokenText = pct + ' (' + tokens + ' Tokens) · ' + modelDisplay;
        if (s.subagentsTotalTokens && s.subagentsTotalTokens > 0) {
          tokenText += ' <span style="opacity: 0.75;" title="含子代理独立消耗: +' + s.subagentsTotalTokens + '">(含代理 +' + formatTokenCount(s.subagentsTotalTokens) + ')</span>';
        }

        return '<div class="' + cardClass + '">' +
          '<div class="session-header-row">' +
            '<span class="session-project-name" title="' + projectNameStr + '">' + projectNameStr + '</span>' +
            '<div class="session-header-badges">' + focusedTag + activeTag + agentsBadge + '</div>' +
          '</div>' +
          '<div class="session-title-text" title="' + titleAttr + '">' + titleDisplay + forkBadge + '</div>' +
          '<div class="session-meta-row">' +
            '<span>' + tokenText + '</span>' +
            '<span>' + rightMetaHtml + '</span>' +
          '</div>' +
          '<div class="session-actions-row">' +
            '<button class="session-act-btn focus" data-action="focusSession" data-session-id="' + sessionIdAttr + '" title="聚焦此会话"><span class="btn-icon">👀</span><span class="btn-text">聚焦</span></button>' +
            '<button class="session-act-btn fork" data-action="forkSession" data-session-id="' + sessionIdAttr + '" title="分叉此会话 (Fork)"><span class="btn-icon">🌿</span><span class="btn-text">分叉</span></button>' +
            '<button class="session-act-btn" data-action="openSessionFile" data-file-path="' + sessionFileAttr + '" title="查看原始 JSONL 日志"><span class="btn-icon">📄</span><span class="btn-text">日志</span></button>' +
            '<button class="session-act-btn delete" data-action="deleteSession" data-session-id="' + sessionIdAttr + '" title="删除此会话"><span class="btn-icon">🗑️</span><span class="btn-text">删除</span></button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function saveProxyConfig() {
      const apiBaseUrl = document.getElementById('cfg-base-url').value.trim();
      sendMessage('saveConfig', { apiBaseUrl });
      const toast = document.getElementById('save-toast');
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }

    // Message Receiver
    window.addEventListener('message', event => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'updateSession') {
        applyHubUiStrings(msg.ui);
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

          if (modeChanged) {
            currentFilter = msg.filterMode === 'currentWorkspace' ? 'workspace' : 'all';
            currentPage = 1;
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            const activeChip = document.getElementById(msg.filterMode === 'currentWorkspace' ? 'chip-ws' : 'chip-all');
            if (activeChip) activeChip.classList.add('active');
          }
        }

        renderSessionsList();

        if (s) {
          document.getElementById('proj-name').innerText = s.projectName || '未知项目';
          const pct = (s.tokenUsage && s.tokenUsage.percentage) || 0;
          document.getElementById('token-pct').innerText = pct + '%';
          document.getElementById('token-fill').style.width = Math.min(pct, 100) + '%';

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
          document.getElementById('model-tag').innerText = '模型: ' + dispModel + respExtra;
          document.getElementById('branch-tag').innerText = s.gitBranch ? '🌿 ' + s.gitBranch : '';
          const baseCostText = '预估消耗: ' + (msg.cost || '< $0.001');
          const subagentCostExtra = (s.subagentsTotalTokens && s.subagentsTotalTokens > 0)
            ? ' (含子代理: +' + formatTokenCount(s.subagentsTotalTokens) + ' tok)'
            : '';
          document.getElementById('cost-label').innerText = baseCostText + subagentCostExtra;

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

          // Todos List
          const todosWrap = document.getElementById('todos-container');
          const todosList = document.getElementById('todos-list');
          const warnOnlyPlan = shouldWarnPlanWithoutChecklist(s);
          if (s.todos && s.todos.length > 0) {
            todosWrap.style.display = 'block';
            const done = s.todos.filter(x => x.status === 'completed').length;
            const inProg = s.todos.filter(x => x.status === 'in_progress').length;
            const pct = Math.round((done / s.todos.length) * 100);
            const isAllCompleted = done === s.todos.length;

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
                counterEl.innerHTML = '<span>✓ ' + done + '/' + s.todos.length + '</span><span class="todo-counter-detail">(已完成)</span>';
                counterEl.title = '✓ ' + done + '/' + s.todos.length + ' (已完成)';
              } else {
                counterEl.className = inProg > 0 ? 'status-pill active' : 'status-pill';
                const summaryText = done + '/' + s.todos.length;
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
                badges.push('<span class="agent-meta-chip" title="Worktree: ' + escapeAttribute(a.worktreeBranch) + '">🌿 ' + escapeHtml(a.worktreeBranch) + '</span>');
              }

              const descHtml = a.description ? '<div class="agent-desc" title="' + escapeAttribute(a.description) + '">' + escapeHtml(a.description) + '</div>' : '';

              const agentKey = a.id || a.toolUseId || ('agent-' + idx);
              const agentDetailId = 'agent-detail-' + idx;
              const details = [];
              if (a.id) details.push('<div><strong>ID:</strong> ' + escapeHtml(a.id) + '</div>');
              if (a.model) details.push('<div><strong>模型:</strong> ' + escapeHtml(a.model) + '</div>');
              if (a.parentAgentId) details.push('<div><strong>父代理:</strong> ' + escapeHtml(a.parentAgentId) + '</div>');
              if (a.worktreePath) details.push('<div><strong>工作区:</strong> ' + escapeHtml(a.worktreePath) + '</div>');
              const isExpanded = expandedAgentKeys.has(agentKey);
              const detailContent = details.length > 0 ? '<div id="' + agentDetailId + '" class="agent-detail-body" style="display: ' + (isExpanded ? 'flex' : 'none') + ';">' + details.join('') + '</div>' : '';

              return '<div class="' + cardClass + '" onclick="toggleAgentDetail(\\'' + agentDetailId + '\\', \\'' + escapeAttribute(agentKey) + '\\')">' +
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

        // Subscription Rate Limits
        if (msg.subscription && msg.subscription.fiveHour) {
          document.getElementById('sub-container').style.display = 'block';
          const pct = Math.min(100, Math.round(msg.subscription.fiveHour.utilization || 0));
          document.getElementById('sub-fill').style.width = pct + '%';
          document.getElementById('sub-reset').innerText = pct + '% · ' + (msg.subscription.fiveHour.resetsAt ? new Date(msg.subscription.fiveHour.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
        }
      }

      if (msg.type === 'loadConfig') {
        applyHubUiStrings(msg.ui);
        const c = msg.config || {};
        if (c.apiBaseUrl) {
          document.getElementById('cfg-base-url').value = c.apiBaseUrl;
        }
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
        const mcpList = document.getElementById('mcp-servers-list');
        if (msg.mcpServers && msg.mcpServers.length > 0) {
          mcpList.innerHTML = msg.mcpServers.map(s => {
            const enabled = s.isEnabled === true || s.enabled === true;
            const onCls = enabled ? 'switch-btn on' : 'switch-btn';
            const onTxt = enabled ? 'ON' : 'OFF';
            return '<div class="feature-item">' +
              '<span>' + escapeHtml(s.name) + '</span>' +
              '<button class="' + onCls + '" data-action="toggleMcp" data-name="' + escapeAttribute(s.name) + '" data-enabled="' + (!enabled) + '">' + onTxt + '</button>' +
            '</div>';
          }).join('');
        } else {
          mcpList.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">未检测到外部 MCP 配置</div>';
        }

        const skillsList = document.getElementById('skills-list');
        if (msg.skills && msg.skills.length > 0) {
          skillsList.innerHTML = msg.skills.map(sk => {
            const skillPath = sk.filePath || sk.path || '';
            return '<div class="feature-item" style="cursor: pointer;" data-action="openSkill" data-file-path="' + escapeAttribute(skillPath) + '">' +
              '<div>' +
                '<div style="font-weight: 500;">' + escapeHtml(sk.name) + '</div>' +
                '<div style="font-size: 10px; color: var(--text-muted);">' + escapeHtml(sk.description || '无描述') + '</div>' +
              '</div>' +
              '<span style="font-size: 10px; color: var(--claude-accent);">查看</span>' +
            '</div>';
          }).join('');
        } else {
          skillsList.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">暂无本地 Skills 技能</div>';
        }

        const totalExt = (msg.mcpServers ? msg.mcpServers.length : 0) + (msg.skills ? msg.skills.length : 0);
        document.getElementById('ext-count-badge').innerText = totalExt + ' 项';
      }
    });

    // 1-second live ticker for session duration and running tools
    setInterval(() => {
      if (currentSession && (!currentSession.isIdle || (currentSession.activeTools && currentSession.activeTools.length > 0))) {
        updateLiveSessionDuration();
      }
    }, 1000);

    // Notify backend ready
    sendMessage('ready');
  </script>
</body>
</html>`;
}
