export function getWebviewStyles(): string {
  return `
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-foreground, #cccccc);
      --fg-dim: var(--vscode-descriptionForeground, #9d9d9d);
      --fg-section: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground, #cccccc));
      --border: var(--vscode-panel-border, #3c3c3c);
      --border-soft: color-mix(in srgb, var(--border) 60%, transparent);
      --surface: var(--vscode-editorWidget-background, rgba(128, 128, 128, 0.07));
      --hover: var(--vscode-list-hoverBackground, rgba(128, 128, 128, 0.12));
      --selected: var(--vscode-list-activeSelectionBackground, rgba(0, 127, 212, 0.22));
      --accent: var(--vscode-focusBorder, #007fd4);
      --input-bg: var(--vscode-input-background, #313131);
      --input-border: var(--vscode-input-border, var(--vscode-panel-border, #3c3c3c));
      --input-fg: var(--vscode-input-foreground, #cccccc);
      --btn-bg: var(--vscode-button-background, #0e639c);
      --btn-fg: var(--vscode-button-foreground, #ffffff);
      --btn-hover: var(--vscode-button-hoverBackground, #1177bb);
      --btn-sec-bg: var(--vscode-button-secondaryBackground, #3a3d41);
      --btn-sec-fg: var(--vscode-button-secondaryForeground, #ffffff);
      --btn-sec-hover: var(--vscode-button-secondaryHoverBackground, #45494e);
      --badge-bg: var(--vscode-badge-background, #4d4d4d);
      --badge-fg: var(--vscode-badge-foreground, #ffffff);
      --blue: var(--vscode-charts-blue, #3794ff);
      --green: var(--vscode-testing-iconPassed, #3fb950);
      --red: var(--vscode-errorForeground, #f85149);
      --mono: var(--vscode-editor-font-family, monospace);
      --radius: 6px;
      --h-control: 26px;
      --pad: 20px;

      /* Compatibility aliases used across existing task/session components */
      --hub-background: var(--bg);
      --hub-surface: var(--surface);
      --hub-border: var(--border);
      --hub-hover: var(--hover);
      --hub-focus: var(--accent);
      --hub-accent: var(--vscode-textLink-foreground, var(--blue));
      --bg-color: var(--bg);
      --card-bg: var(--surface);
      --card-border: var(--border);
      --card-hover: var(--hover);
      --claude-accent: var(--hub-accent);
      --claude-amber: var(--vscode-editorWarning-foreground, #cca700);
      --success-color: var(--green);
      --warning-color: var(--vscode-editorWarning-foreground, #cca700);
      --danger-color: var(--red);
      --text-main: var(--fg);
      --text-muted: var(--fg-dim);
      --font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    }

    body.sidebar {
      --bg: var(--vscode-sideBar-background, var(--vscode-editor-background, #181818));
      --pad: 12px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      max-width: 100%;
      overflow-x: hidden;
    }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background, rgba(121, 121, 121, 0.35)); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground, rgba(121, 121, 121, 0.55)); }

    body {
      font-family: var(--font-family);
      font-size: var(--vscode-font-size, 12.5px);
      color: var(--fg);
      background: var(--bg);
      line-height: 1.45;
      padding: 0 var(--pad) 28px;
      user-select: none;
    }

    button, select, input {
      font-family: inherit;
      font-size: 12px;
      color: inherit;
    }

    button:focus-visible, input:focus-visible, select:focus-visible,
    [role="button"]:focus-visible, [role="tab"]:focus-visible, [role="switch"]:focus-visible {
      outline: 1px solid var(--hub-focus);
      outline-offset: 1px;
    }

    #app.hub-container {
      width: 100%;
      container-type: inline-size;
      container-name: hub;
    }

    .view[hidden] {
      display: none !important;
    }

    .muted { color: var(--fg-dim); }
    .mono { font-family: var(--mono); }
    .spacer { flex: 1; }
    svg.ic { width: 15px; height: 15px; fill: currentColor; flex-shrink: 0; }
    code {
      font-family: var(--mono);
      background: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.14));
      padding: 1px 5px;
      border-radius: 3px;
    }

    /* ── Sticky Top Header (Tabs left, crisp SVG actions right) ── */
    header.hub-header {
      position: sticky;
      top: 0;
      z-index: 15;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 calc(var(--pad) * -1);
      padding: 8px var(--pad) 0;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 600;
      white-space: nowrap;
      padding-bottom: 7px;
    }

    .brand svg {
      width: 14px;
      height: 14px;
      fill: var(--blue);
      flex-shrink: 0;
    }

    .tabs {
      display: flex;
      gap: 2px;
      min-width: 0;
      scrollbar-width: none;
    }
    .tabs::-webkit-scrollbar { display: none; }

    .tab {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 6px 10px 7px;
      margin-bottom: -1px;
      cursor: pointer;
      color: var(--fg-dim);
      font-size: 12px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .tab:hover {
      color: var(--fg);
    }

    .tab[aria-selected="true"] {
      color: var(--fg);
      border-bottom-color: var(--accent);
      font-weight: 600;
    }

    .head-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      padding-bottom: 5px;
      margin-left: auto;
      flex-shrink: 0;
    }

    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      border: 1px solid transparent;
      border-radius: 5px;
      padding: 0 4px;
      background: transparent;
      color: var(--fg-dim);
      cursor: pointer;
      gap: 3px;
      flex-shrink: 0;
    }

    .icon-btn:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.18));
      color: var(--fg);
    }

    /* ── Generic Native Controls ── */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      justify-content: center;
      background: var(--btn-sec-bg);
      color: var(--btn-sec-fg);
      border: 1px solid transparent;
      border-radius: 4px;
      height: var(--h-control);
      padding: 0 10px;
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      min-width: 0;
    }

    .btn:hover {
      background: var(--btn-sec-hover);
    }

    .btn.primary, .btn-primary {
      background: var(--btn-bg);
      color: var(--btn-fg);
    }

    .btn.primary:hover, .btn-primary:hover {
      background: var(--btn-hover);
    }

    .btn.ghost, .btn-secondary {
      background: transparent;
      color: var(--fg-dim);
      border: 1px solid var(--border);
    }

    .btn.ghost:hover, .btn-secondary:hover {
      color: var(--fg);
      background: var(--hover);
    }

    .btn.danger {
      color: var(--red);
      border: 1px solid color-mix(in srgb, var(--red) 45%, transparent);
      background: transparent;
    }

    .btn.danger:hover {
      background: color-mix(in srgb, var(--red) 14%, transparent);
    }

    .segmented {
      display: inline-flex;
      width: fit-content;
      justify-self: start;
      border: 1px solid var(--border);
      border-radius: 5px;
      overflow: hidden;
      max-width: 100%;
    }

    .seg {
      background: none;
      border: none;
      padding: 0 9px;
      height: 24px;
      cursor: pointer;
      color: var(--fg-dim);
      font-size: 11.5px;
      border-right: 1px solid var(--border);
      white-space: nowrap;
    }

    .seg:last-child { border-right: none; }
    .seg:hover { background: var(--hover); color: var(--fg); }
    .seg[aria-pressed="true"], .seg.active {
      background: var(--selected);
      color: var(--fg);
      font-weight: 600;
    }

    .switch {
      position: relative;
      width: 34px;
      height: 20px;
      border-radius: 10px;
      padding: 0;
      flex-shrink: 0;
      border: 1px solid var(--border);
      background: var(--input-bg);
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s;
    }

    .switch::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--fg-dim);
      transition: transform 0.12s, background 0.12s;
    }

    .switch[aria-checked="true"], .switch.on {
      background: var(--btn-bg);
      border-color: var(--btn-bg);
    }

    .switch[aria-checked="true"]::after, .switch.on::after {
      transform: translateX(14px);
      background: var(--btn-fg);
    }

    .count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      font-size: 10.5px;
      font-weight: 600;
      background: var(--badge-bg);
      color: var(--badge-fg);
      font-variant-numeric: tabular-nums;
    }

    .linkbtn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      font-size: 11.5px;
      color: var(--vscode-textLink-foreground, var(--blue));
    }

    .linkbtn:hover { text-decoration: underline; }
    .linkbtn.danger { color: var(--red); }

    /* ── VS Code Full-Bleed Pane Header (.block-head) ── */
    section.block {
      margin: 16px calc(var(--pad) * -1) 0;
    }

    .block-head {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 28px;
      padding: 0 var(--pad);
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border-soft);
      background: color-mix(in srgb, var(--fg) 3%, transparent);
    }

    .block-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--fg-section);
      height: 100%;
      min-width: 0;
    }

    .block-toggle:hover { color: var(--fg); }
    .block-body { padding: 10px var(--pad) 0; }
    section.block.collapsed .block-body { display: none; }

    .caret {
      font-size: 9px;
      transition: transform 0.18s ease;
      color: var(--fg-dim);
      display: inline-block;
      flex-shrink: 0;
    }

    .collapsed .caret {
      transform: rotate(-90deg);
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

    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--green);
      flex-shrink: 0;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 22%, transparent);
    }

    .live-dot.idle {
      background: var(--fg-dim);
      box-shadow: none;
      opacity: 0.55;
    }

    /* ── Tab 1: Monitor (Hero + KPI Grid + Contextual Actions) ── */
    .dash-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 10px;
      margin-top: 12px;
    }

    .scope-meta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      font-size: 11px;
      color: var(--fg-dim);
    }

    .monitor-project-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
      color: var(--fg);
    }

    .hero {
      margin-top: 10px;
      padding: 12px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      border-left: 3px solid var(--blue);
      background: var(--surface);
      background-clip: padding-box;
    }

    .hero-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 10.5px;
      color: var(--fg-dim);
      min-width: 0;
    }

    .hero-label {
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hero-main {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      margin-top: 4px;
      flex-wrap: wrap;
    }

    .monitor-context-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--blue);
      line-height: 1.15;
      font-variant-numeric: tabular-nums;
    }

    .hero-tokens-sub {
      font-size: 12px;
      color: var(--fg-dim);
      font-variant-numeric: tabular-nums;
      margin-left: 4px;
    }

    .hero-right-stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
      min-width: 0;
      max-width: 100%;
    }
    .hero-right-stat .output-speed-row {
      justify-content: flex-end;
    }

    .quota-inline {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 6px 12px;
      margin-top: 8px;
      padding-top: 7px;
      border-top: 1px solid var(--border-soft);
      font-size: 11px;
      color: var(--fg-dim);
      min-width: 0;
    }

    .session-group-label {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--fg-dim);
      margin: 10px 0 5px;
    }
    .session-group-label:first-child { margin-top: 2px; }

    .settings-select {
      background: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--input-border);
      border-radius: 4px;
      height: var(--h-control);
      padding: 0 8px;
      font-size: 11.5px;
      max-width: 100%;
    }

    .progress-bar-track {
      background: var(--vscode-input-background, var(--card-hover));
      border: 1px solid var(--card-border);
      height: 5px;
      border-radius: 3px;
      overflow: hidden;
      margin: 8px 0 6px 0;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: 3px;
      background-color: var(--vscode-textLink-foreground, var(--vscode-progressBar-background, var(--hub-accent)));
      background-image: none;
      transition: width 0.3s ease;
    }

    .output-speed-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 5px;
      min-width: 0;
      margin-top: 4px;
      font-size: 10.5px;
      color: var(--text-muted);
    }

    .output-speed-label { flex: 0 0 auto; white-space: nowrap; }
    .output-speed-value {
      flex: 0 0 auto;
      font-weight: 600;
      color: var(--text-main);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .output-speed-model {
      flex: 0 1 auto;
      max-width: 180px;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      opacity: 0.85;
    }
    .output-speed-enable {
      flex: 0 0 auto;
      margin-left: auto;
      border: 1px solid var(--card-border);
      background: var(--vscode-input-background, var(--card-bg));
      color: var(--vscode-textLink-foreground, var(--hub-accent));
      border-radius: 3px;
      font-size: 9.5px;
      line-height: 1.4;
      padding: 1px 6px;
      cursor: pointer;
    }
    .output-speed-enable:hover {
      border-color: var(--vscode-focusBorder, var(--card-border));
    }

    .kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 9px;
    }

    .kpi {
      padding: 8px 10px;
      border-radius: var(--radius);
      border: 1px solid var(--border-soft);
      background: var(--surface);
      background-clip: padding-box;
      min-width: 0;
    }

    .kpi-label {
      font-size: 10.5px;
      color: var(--fg-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .kpi-value {
      font-size: 16px;
      font-weight: 600;
      margin-top: 2px;
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }

    .kpi-sub {
      font-size: 10.5px;
      color: var(--fg-dim);
      margin-top: 2px;
      overflow-wrap: anywhere;
    }

    .hud-info-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 12px;
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 8px;
      padding: 7px 10px;
      border-radius: var(--radius);
      border: 1px solid var(--border-soft);
      background: var(--surface);
      min-width: 0;
    }

    .hud-fact { display: flex; align-items: baseline; gap: 5px; min-width: 0; }
    .hud-fact-model { grid-column: 1 / -1; }
    .hud-fact-label { flex: 0 0 auto; font-size: 11px; color: var(--text-muted); }
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

    .quick-actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 9px;
    }

    .running-bar {
      background: var(--vscode-list-hoverBackground, var(--card-bg));
      background-clip: padding-box;
      border: 1px solid var(--vscode-contrastBorder, var(--card-border));
      border-radius: var(--radius);
      padding: 6px 9px;
      margin-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      min-width: 0;
    }

    .spin { display: inline-block; animation: spin 1.5s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

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
    }

    /* ── Todos Cards ── */
    .todos-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 11px;
      cursor: pointer;
      min-width: 0;
      width: 100%;
    }
    .todos-header-title {
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .todos-header-title > span:last-child { overflow: hidden; text-overflow: ellipsis; }
    .todos-header-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; white-space: nowrap; }
    .todos-clear-btn, .todos-sync-btn {
      background: transparent;
      border: 0;
      color: var(--text-muted);
      font: inherit;
      font-size: 10px;
      opacity: 0.8;
      cursor: pointer;
      padding: 2px 5px;
      border-radius: 3px;
      white-space: nowrap;
    }
    .todos-clear-btn:hover, .todos-sync-btn:hover { opacity: 1; background: var(--card-hover); }
    .todo-progress-track {
      height: 3px;
      border-radius: 2px;
      background: var(--border-soft);
      overflow: hidden;
      margin: 4px 0 8px 0;
    }
    .todo-progress-fill {
      height: 100%;
      border-radius: 2px;
      background: var(--blue);
      transition: width 0.3s ease;
    }
    .todo-item-card {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11px;
      padding: 6px 8px;
      border-radius: 6px;
      margin-bottom: 5px;
      background: var(--vscode-editor-background, var(--card-bg));
      border: 1px solid var(--vscode-contrastBorder, var(--card-border));
      transition: background 0.15s;
    }
    .todo-item-card:hover { background: var(--vscode-list-hoverBackground, var(--card-bg)); }
    .todo-item-card.completed { opacity: 0.7; }
    .todo-item-card.in_progress {
      background: var(--vscode-list-inactiveSelectionBackground, var(--card-bg));
      border-color: var(--vscode-focusBorder, var(--card-border));
    }
    .todo-item-card.pending-create { opacity: 0.85; border-style: dashed; }
    .todo-badge-icon { flex-shrink: 0; font-size: 12px; line-height: 1.35; margin-top: 1px; }
    .todo-badge-icon .todo-spinner { color: var(--vscode-progressBar-background, var(--hub-accent)); }
    .todo-card-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .todo-title-row { display: flex; align-items: flex-start; gap: 6px; min-width: 0; }
    .todo-title { flex: 1; min-width: 0; color: var(--text-main); font-weight: 600; font-size: 11px; line-height: 1.35; overflow-wrap: anywhere; }
    .todo-item-card.completed .todo-title { text-decoration: line-through; opacity: 0.75; font-weight: 500; }
    .todo-status-chip {
      flex-shrink: 0; font-size: 9px; font-weight: 600; line-height: 1; padding: 3px 6px;
      border-radius: 999px; white-space: nowrap; border: 1px solid transparent;
    }
    .todo-status-chip.pending { color: var(--text-muted); background: var(--input-bg); border-color: var(--border-soft); }
    .todo-status-chip.in_progress {
      color: var(--vscode-list-inactiveSelectionForeground, var(--text-main));
      background: var(--vscode-list-inactiveSelectionBackground, var(--card-bg));
      border-color: var(--vscode-focusBorder, var(--card-border));
    }
    .todo-status-chip.completed { color: var(--success-color); background: var(--input-bg); border-color: var(--border-soft); }
    .todo-body { color: var(--text-muted); font-size: 10px; line-height: 1.4; overflow-wrap: anywhere; }
    .todo-body.clamped { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; }
    .todo-expand-btn { align-self: flex-start; border: none; background: transparent; color: var(--claude-accent); font-size: 10px; cursor: pointer; }
    .todo-active-form { color: var(--text-muted); font-size: 10px; font-style: italic; line-height: 1.35; overflow-wrap: anywhere; }
    .todo-deps { color: var(--text-muted); font-size: 9px; line-height: 1.35; overflow-wrap: anywhere; }
    .todos-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 10px; color: var(--text-muted); padding: 2px 0 6px; }
    .todos-mode-chip { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; border: 1px solid transparent; }
    .todos-mode-chip.task { color: var(--vscode-button-foreground, #ffffff); background: var(--vscode-button-background, #0e639c); }
    .todos-mode-chip.checklist { color: var(--vscode-list-inactiveSelectionForeground, var(--text-main)); background: var(--vscode-list-inactiveSelectionBackground, var(--card-bg)); border-color: var(--border); }
    .todos-mode-chip.none { color: var(--text-muted); background: var(--input-bg); border-color: var(--border); }
    .todos-checklist-chip { font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 999px; color: var(--text-muted); border: 1px dashed var(--border); }
    .todos-checklist-chip.hidden-mode { color: var(--claude-amber); border-color: color-mix(in srgb, var(--claude-amber) 55%, transparent); }
    .todos-source-chip { font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 999px; border: 1px solid var(--border); }
    .todos-list-btn { padding: 1px 6px; border-radius: 4px; border: 1px solid var(--border); background: transparent; color: var(--claude-accent); font-size: 10px; cursor: pointer; }
    .todos-empty-hint { margin: 0 0 6px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-soft); background: var(--surface); color: var(--text-muted); font-size: 10px; line-height: 1.45; overflow-wrap: anywhere; }
    .todos-needs-list { color: var(--claude-amber); font-weight: 600; }
    .todos-activity {
      display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px;
      color: var(--text-muted); font-size: 10px; line-height: 1.4; overflow-wrap: anywhere;
      padding: 4px 6px; margin: 0 0 6px; border-radius: 6px; background: var(--surface); border: 1px solid var(--border-soft);
    }
    .todos-activity-part { color: var(--text-muted); }
    .todos-activity-sep { opacity: 0.55; user-select: none; }
    .todos-activity-warn { color: var(--claude-amber); font-weight: 600; }
    .todos-plan-warn {
      display: none; margin: 0 0 6px; padding: 6px 8px; border-radius: 6px;
      border: 1px solid color-mix(in srgb, var(--claude-amber) 55%, transparent);
      background: color-mix(in srgb, var(--claude-amber) 14%, transparent);
      color: var(--text-main); font-size: 10px; line-height: 1.45; overflow-wrap: anywhere;
    }

    /* ── Subagent Topology (Overflow-proof fix for Bug.md) ── */
    .agents-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      min-width: 0;
      width: 100%;
      font-weight: 600;
      font-size: 11px;
      cursor: pointer;
    }
    .agents-heading-title { display: flex; align-items: center; gap: 5px; min-width: 0; flex: 1; text-transform: uppercase; letter-spacing: 0.05em; }
    .agents-heading-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .agents-tree { display: flex; flex-direction: column; gap: 6px; min-width: 0; max-width: 100%; }

    .agent-item {
      background: var(--surface);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius);
      padding: 7px 9px;
      transition: background 0.15s ease, border-color 0.15s ease;
      cursor: pointer;
      position: relative;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
    }
    .agent-item:hover { background: var(--hover); border-color: var(--border); }
    .agent-item.running { border-color: color-mix(in srgb, var(--green) 50%, var(--border)); }
    .agent-item.completed { opacity: 0.85; }
    .agent-item.completed:hover { opacity: 1; }
    .agent-item.nested {
      margin-left: 12px;
      border-left: 2px solid var(--blue);
      max-width: calc(100% - 12px);
    }

    .agent-item-header {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
      min-width: 0;
      max-width: 100%;
    }
    .agent-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1;
      overflow: hidden;
    }
    .agent-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: var(--fg-dim); }
    .agent-dot.running { background: var(--green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 22%, transparent); }
    .agent-dot.completed { opacity: 0.55; }
    .agent-dot.error { background: var(--red); }

    .agent-name {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-main);
      min-width: 0;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .agent-type-badge {
      font-size: 9.5px;
      padding: 0 5px;
      border-radius: 3px;
      border: 1px solid var(--border);
      color: var(--fg-dim);
      flex-shrink: 0;
      max-width: 45%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .agent-badges {
      display: flex;
      align-items: center;
      gap: 4px 6px;
      min-width: 0;
      max-width: 100%;
      flex-wrap: wrap;
      overflow: hidden;
      font-size: 10px;
      color: var(--text-muted);
    }
    .agent-meta-chip {
      background: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.14));
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 9.5px;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .agent-meta-branch { max-width: 11em; font-family: var(--mono); }
    .agent-desc {
      display: block;
      width: 100%;
      min-width: 0;
      font-size: 10.5px;
      color: var(--text-muted);
      margin-top: 4px;
      line-height: 1.4;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .agent-detail-body {
      margin-top: 6px;
      padding-top: 5px;
      border-top: 1px dashed var(--border-soft);
      font-size: 10px;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .agent-wt-actions { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
    .agent-wt-btn {
      font-size: 10px; padding: 2px 7px; border-radius: 3px;
      border: 1px solid var(--border); background: transparent; color: var(--fg); cursor: pointer;
    }

    /* Background jobs */
    .bgjob-row { display: flex; gap: 6px; align-items: flex-start; padding: 5px 0; border-bottom: 1px solid var(--border-soft); }
    .bgjob-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 4px; flex: 0 0 auto; background: var(--fg-dim); }
    .bgjob-dot.running { background: var(--green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 20%, transparent); }
    .bgjob-dot.fail { background: var(--red); }
    .bgjob-main { min-width: 0; flex: 1; }
    .bgjob-label { overflow-wrap: anywhere; line-height: 1.35; }
    .bgjob-meta { color: var(--text-muted); font-size: 10px; margin-top: 1px; }

    /* ── Tab 2: Sessions (Master-Detail in wide mode, single-column in narrow) ── */
    .hub-search-row {
      display: flex;
      gap: 6px;
      align-items: center;
      margin-top: 12px;
    }

    .search-box {
      flex: 1;
      min-width: 0;
      width: 100%;
      background: var(--vscode-input-background, var(--input-bg));
      border: 1px solid var(--vscode-input-border, var(--input-border));
      color: var(--vscode-input-foreground, var(--input-fg));
      padding: 0 8px;
      height: var(--h-control);
      border-radius: 4px;
      font-size: 11.5px;
      outline: none;
    }
    .search-box::placeholder { color: var(--vscode-input-placeholderForeground, var(--text-muted)); }
    .search-box:focus { border-color: var(--vscode-focusBorder, var(--hub-accent)); }

    .filter-chips-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin: 8px 0 10px;
    }
    .filter-chip {
      background: var(--vscode-button-secondaryBackground, var(--card-bg));
      border: 1px solid var(--vscode-contrastBorder, var(--card-border));
      color: var(--text-muted);
      border-radius: 4px;
      padding: 3px 9px;
      font-size: 11px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s;
    }
    .filter-chip:hover { background: var(--vscode-button-secondaryHoverBackground, var(--card-hover)); color: var(--text-main); }
    .filter-chip.active {
      background: var(--selected);
      color: var(--fg);
      border-color: color-mix(in srgb, var(--blue) 60%, var(--border));
      font-weight: 600;
    }
    .chip-label-short { display: none; }

    .hub-split {
      display: grid;
      grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
      gap: 14px;
      align-items: start;
    }

    .hub-left { min-width: 0; }
    .hub-reader {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      padding: 14px 16px;
      min-width: 0;
      position: sticky;
      top: 48px;
    }

    .back-btn { display: none; }

    .session-card {
      position: relative;
      min-width: 0;
      overflow: visible;
      background: var(--card-bg);
      background-clip: padding-box;
      border: 1px solid var(--vscode-contrastBorder, var(--card-border));
      border-radius: var(--radius);
      padding: 9px 10px;
      margin-bottom: 7px;
      cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease;
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
    .session-card.selected-reader {
      border-color: var(--vscode-focusBorder, var(--card-border));
      background: var(--vscode-list-inactiveSelectionBackground, var(--card-bg));
      color: var(--vscode-list-inactiveSelectionForeground, var(--text-main));
    }

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
    .session-header-badges .status-pill { font-size: 9px; padding: 1px 5px; }
    .session-header-badges .status-pill.fork {
      color: var(--success-color);
      border-color: color-mix(in srgb, var(--success-color) 50%, var(--border));
    }
    .session-tag-badge {
      flex: 0 1 auto; min-width: 0; max-width: 100%;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-size: 9px; line-height: 1.35; padding: 1px 4px; border-radius: 3px;
      border: 1px solid var(--border); color: var(--blue);
    }
    .session-pin-badge {
      flex: 0 0 auto; font-size: 9px; line-height: 1.35; padding: 1px 4px;
      border-radius: 3px; border: 1px solid color-mix(in srgb, var(--warning-color) 55%, var(--border));
      color: var(--warning-color);
    }
    .session-sub-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 6px; min-width: 0; margin-bottom: 2px; color: var(--text-muted);
    }
    .session-project-name {
      flex: 1 1 auto; min-width: 0; font-weight: 500; font-size: 11px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .session-model-text {
      flex: 0 1 auto; min-width: 0; max-width: 45%; font-size: 10.5px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-muted);
    }
    .session-branch-row { display: flex; min-width: 0; margin-bottom: 2px; font-size: 10.5px; color: var(--text-muted); }
    .session-branch-text { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--mono); }
    .session-meta-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      font-size: 10.5px; color: var(--text-muted); margin-bottom: 6px;
      flex-wrap: wrap; gap: 2px 8px; min-width: 0; font-variant-numeric: tabular-nums;
    }
    .session-meta-main { flex: 1 1 10em; min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
    .session-meta-side { flex: 0 1 auto; min-width: 0; max-width: 100%; text-align: right; overflow-wrap: anywhere; }
    .session-actions-row {
      display: flex; flex-wrap: wrap; align-items: center; gap: 4px;
      border-top: 1px solid var(--border-soft); padding-top: 6px;
    }
    .session-act-btn {
      flex: 0 0 auto; max-width: 100%;
      background: var(--vscode-button-secondaryBackground, var(--card-bg));
      border: 1px solid var(--card-border);
      color: var(--vscode-button-secondaryForeground, var(--text-main));
      border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 3px; white-space: nowrap; overflow: hidden;
    }
    .session-act-btn:hover { background: var(--card-hover); color: var(--text-main); }
    .session-act-btn .btn-icon { font-size: 10px; line-height: 1; flex-shrink: 0; }
    .session-act-btn .btn-text { white-space: nowrap; }
    .session-more-wrap { position: relative; flex: 0 0 auto; display: inline-flex; }
    .session-act-btn.more[aria-expanded="true"] {
      background: var(--vscode-list-inactiveSelectionBackground, var(--card-hover));
      border-color: var(--vscode-focusBorder, var(--claude-accent));
    }
    .session-more-menu {
      position: absolute; top: calc(100% + 4px); right: 0; z-index: 40;
      display: none; flex-direction: column; min-width: 132px;
      max-width: min(220px, calc(100vw - 24px)); padding: 4px;
      background: var(--vscode-menu-background, #252526);
      color: var(--vscode-menu-foreground, var(--text-main));
      border: 1px solid var(--vscode-menu-border, var(--card-border));
      border-radius: 4px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    }
    .session-more-menu.open { display: flex; }
    .session-more-menu.drop-up { top: auto; bottom: calc(100% + 4px); }
    .session-menu-item {
      display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0;
      padding: 4px 6px; background: transparent; border: 1px solid transparent;
      border-radius: 3px; color: inherit; font: inherit; font-size: 11px; text-align: left; cursor: pointer;
    }
    .session-menu-item:hover, .session-menu-item:focus-visible {
      background: var(--vscode-menu-selectionBackground, var(--hover));
      color: var(--vscode-menu-selectionForeground, var(--fg));
    }
    .session-menu-item.danger { color: var(--danger-color); }
    .session-menu-icon { flex-shrink: 0; width: 14px; text-align: center; }
    .session-menu-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .session-menu-sep { height: 1px; margin: 3px 2px; background: var(--border-soft); }

    /* Session Detail Reader (Right Pane / Drill-down) */
    .reader-title { font-size: 13.5px; font-weight: 600; line-height: 1.4; word-break: break-word; }
    .reader-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
    .kv {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 5px 12px;
      margin: 11px 0 0;
      padding: 9px 11px;
      font-size: 11.5px;
      border-radius: var(--radius);
      border: 1px solid var(--border-soft);
      background: var(--bg);
    }
    .kv dt { color: var(--fg-dim); }
    .kv dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
    .action-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(105px, 1fr)); gap: 6px; margin-top: 12px; }
    .manage-row {
      display: flex; flex-wrap: wrap; align-items: center; gap: 5px 14px;
      margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-soft);
      font-size: 11px; color: var(--fg-dim);
    }

    .pagination-bar {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 11px; color: var(--text-muted); padding-top: 8px;
      border-top: 1px solid var(--border-soft); margin-top: 6px;
    }
    .page-btn {
      background: var(--btn-sec-bg); border: 1px solid var(--border); color: var(--btn-sec-fg);
      border-radius: 4px; padding: 3px 9px; font-size: 11px; cursor: pointer;
    }
    .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    /* ── Tab 3: Extensions & Auto Memory ── */
    .ext-toolbar { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    .ext-tabs-row { display: flex; flex-wrap: wrap; gap: 5px; }
    .ext-tab-btn {
      cursor: pointer; font-size: 11px; padding: 3px 8px; border-radius: 4px;
      border: 1px solid var(--border); background: var(--surface); color: var(--text-muted);
      display: inline-flex; align-items: center; gap: 4px;
    }
    .ext-tab-btn:hover { background: var(--hover); color: var(--fg); }
    .ext-tab-btn.active { background: var(--selected); border-color: color-mix(in srgb, var(--blue) 60%, var(--border)); color: var(--fg); font-weight: 600; }
    .ext-tab-count { font-size: 9.5px; opacity: 0.85; background: var(--badge-bg); color: var(--badge-fg); padding: 0 5px; border-radius: 8px; }
    .ext-search-wrap { position: relative; display: flex; align-items: center; }
    .ext-search-input {
      width: 100%; background: var(--input-bg); border: 1px solid var(--input-border);
      color: var(--input-fg); height: var(--h-control); padding: 0 24px 0 8px; border-radius: 4px; font-size: 11.5px; outline: none;
    }
    .ext-search-input:focus { border-color: var(--accent); }
    .ext-search-clear {
      position: absolute; right: 5px; background: transparent; border: none; color: var(--fg-dim); cursor: pointer; font-size: 11px;
    }

    .ext-group { margin: 14px calc(var(--pad) * -1) 0; }
    .ext-group-header {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      height: 28px; padding: 0 var(--pad); cursor: pointer;
      border-top: 1px solid var(--border); border-bottom: 1px solid var(--border-soft);
      background: color-mix(in srgb, var(--fg) 3%, transparent);
    }
    .ext-group-title {
      display: inline-flex; align-items: center; gap: 6px; min-width: 0;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-section);
    }
    .ext-group-title-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ext-group-badge {
      font-size: 10px; font-weight: 600; background: var(--badge-bg); color: var(--badge-fg);
      padding: 0 6px; border-radius: 9px; line-height: 16px;
    }
    .ext-group-body { padding: 8px var(--pad) 0; }
    .ext-group.collapsed .ext-group-body { display: none; }
    .ext-scope-pills { display: inline-flex; gap: 3px; flex-shrink: 0; }
    .ext-scope-pill {
      font-size: 10px; padding: 1px 6px; border-radius: 3px; border: 1px solid var(--border);
      background: transparent; color: var(--fg-dim); cursor: pointer;
    }
    .ext-scope-pill.active { background: var(--selected); color: var(--fg); border-color: var(--blue); font-weight: 600; }

    .feature-list { display: flex; flex-direction: column; }
    .feature-item {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 7px 0; border-bottom: 1px solid var(--border-soft); min-width: 0; font-size: 11.5px;
    }
    .feature-item:last-child { border-bottom: none; }
    .ext-more-btn {
      margin-top: 6px; width: 100%; padding: 4px 8px; font-size: 11px;
      background: transparent; border: 1px dashed var(--border); border-radius: 4px; color: var(--fg-dim); cursor: pointer;
    }
    .ext-skill-jump-pill {
      margin-left: 6px; font-size: 9.5px; padding: 0 5px; border-radius: 3px;
      border: 1px solid var(--border); background: transparent; color: var(--blue); cursor: pointer; flex-shrink: 0;
    }
    .skill-plugin-group { margin-top: 6px; border: 1px solid var(--border-soft); border-radius: var(--radius); overflow: hidden; }
    .skill-plugin-group-header {
      display: flex; align-items: center; justify-content: space-between; padding: 6px 8px;
      background: var(--surface); cursor: pointer; font-size: 11px;
    }
    .skill-plugin-group-body { padding: 2px 8px 6px; }
    .skill-plugin-group.collapsed .skill-plugin-group-body { display: none; }

    .mem-item-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .mem-act-btn {
      font-size: 10px; padding: 2px 6px; border-radius: 3px; border: 1px solid var(--border);
      background: transparent; color: var(--fg-dim); cursor: pointer;
    }
    .mem-act-btn:hover { color: var(--fg); background: var(--hover); }
    .mem-act-btn.primary { color: var(--blue); border-color: color-mix(in srgb, var(--blue) 50%, var(--border)); }
    .mem-act-btn.danger:hover { color: var(--red); border-color: var(--red); }

    .mem-inline-form {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 9px 10px; margin-bottom: 8px; display: none; flex-direction: column; gap: 7px;
    }
    .mem-inline-form.visible { display: flex; }
    .mem-inline-header { display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; font-weight: 600; color: var(--blue); }
    .mem-type-pills { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
    .mem-type-pill {
      cursor: pointer; font-size: 10px; padding: 3px 4px; border-radius: 4px;
      border: 1px solid var(--border); background: transparent; color: var(--fg-dim);
      text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .mem-type-pill.active { background: var(--selected); border-color: var(--blue); color: var(--fg); font-weight: 600; }
    .mem-type-hint { font-size: 10px; color: var(--fg-dim); }
    .mem-inline-field { display: flex; flex-direction: column; gap: 3px; }
    .mem-inline-label { font-size: 10px; color: var(--fg-dim); }
    .mem-inline-input {
      width: 100%; background: var(--input-bg); border: 1px solid var(--input-border);
      color: var(--input-fg); border-radius: 4px; padding: 4px 7px; font-size: 11px; outline: none;
    }
    .mem-inline-input:focus { border-color: var(--accent); }

    /* ── Tab 4: Settings & Status Bar / Tooltip Customizer ── */
    .settings-wrap { max-width: 820px; padding-top: 4px; }
    .field {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px 16px;
      align-items: center;
      padding: 9px 0;
      border-bottom: 1px solid var(--border-soft);
    }
    .field:last-child { border-bottom: none; }
    .field-label { font-size: 12px; font-weight: 500; color: var(--fg); }
    .field-hint { font-size: 11px; color: var(--fg-dim); margin-top: 2px; line-height: 1.45; }
    .custom-chips-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .toggle-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 9px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--fg-dim);
      font-size: 11px;
      cursor: pointer;
    }
    .toggle-chip:hover { color: var(--fg); background: var(--hover); }
    .toggle-chip[aria-pressed="true"] {
      background: var(--selected);
      color: var(--fg);
      border-color: color-mix(in srgb, var(--blue) 65%, var(--border));
      font-weight: 600;
    }
    .doc-btn-group { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }

    /* ── Narrow / Sidebar Responsive Rules (Copilot Speedometer pattern) ── */
    body.narrow .brand-text,
    body.narrow .brand .status-pill { display: none; }
    body.narrow header.hub-header { gap: 4px; }
    body.narrow .tabs { flex: 1 1 0; overflow-x: auto; }
    body.narrow .tab { flex: 1 0 auto; padding: 6px 4px 7px; }
    body.narrow .monitor-context-value { font-size: 24px; }
    body.narrow .hero-right-stat { align-items: flex-start; }
    body.narrow .hero-right-stat .output-speed-row { justify-content: flex-start; }
    body.narrow .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    body.narrow .field { grid-template-columns: minmax(0, 1fr); gap: 6px; }
    body.narrow .field.field-boolean { grid-template-columns: minmax(0, 1fr) auto; align-items: start; }
    body.narrow #sb-preset-group {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      width: 100%;
      border: none;
      border-radius: 0;
      gap: 4px;
      overflow: visible;
    }
    body.narrow #sb-preset-group .seg {
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0 4px;
      text-align: center;
    }
    body.narrow #sb-preset-group .seg.active,
    body.narrow #sb-preset-group .seg[aria-pressed="true"] {
      border-color: color-mix(in srgb, var(--blue) 60%, var(--border));
    }
    body.narrow .hub-split { grid-template-columns: minmax(0, 1fr); gap: 0; }
    body.narrow .hub-split.mode-list .hub-reader { display: none; }
    body.narrow .hub-split.mode-detail .hub-left { display: none; }
    body.narrow .hub-reader { border: none; background: none; padding: 0; position: static; }
    body.narrow .kv { background: var(--surface); }
    body.narrow .back-btn { display: inline-flex; margin-bottom: 10px; }

    @container hub (max-width: 290px) {
      .tab { padding: 6px 2px 7px; font-size: 11px; }
      .header-sub, .chip-label-long, .todos-clear-text, .todos-sync-text, .todo-counter-detail { display: none; }
      .chip-label-short { display: inline; }
      .session-header-badges .badge-text { display: none; }
      .session-title-text { font-size: 11.5px; }
      .session-model-text { max-width: 55%; }
      .session-more-menu { right: 0; min-width: 116px; max-width: calc(100vw - 16px); }
      .agent-item-header { flex-direction: column; align-items: stretch; gap: 3px; }
      .agent-title-row, .agent-badges { width: 100%; }
    }

    @container hub (max-width: 260px) {
      .hud-info-row { grid-template-columns: minmax(0, 1fr); gap: 3px; }
      .doc-btn-group { flex-direction: column; }
    }

    @container hub (max-width: 230px) {
      .session-act-btn .btn-text { display: none; }
      .session-title-text { font-size: 11px; }
      .session-model-text { max-width: 50%; }
    }

    @supports not (container-type: inline-size) {
      @media (max-width: 306px) {
        .header-sub, .chip-label-long, .todos-clear-text, .todos-sync-text, .todo-counter-detail { display: none; }
        .chip-label-short { display: inline; }
        .session-header-badges .badge-text { display: none; }
        .session-title-text { font-size: 11.5px; }
        .session-model-text { max-width: 55%; }
        .session-more-menu { right: 0; min-width: 116px; max-width: calc(100vw - 16px); }
        .agent-item-header { flex-direction: column; align-items: stretch; gap: 3px; }
        .agent-title-row, .agent-badges { width: 100%; }
      }
      @media (max-width: 276px) {
        .hud-info-row { grid-template-columns: minmax(0, 1fr); gap: 3px; }
        .doc-btn-group { flex-direction: column; }
      }
      @media (max-width: 246px) {
        .session-act-btn .btn-text { display: none; }
        .session-title-text { font-size: 11px; }
        .session-model-text { max-width: 50%; }
      }
    }
  `;
}
