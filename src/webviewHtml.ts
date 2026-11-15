import { getWebviewClientScript } from './webview/clientScript.js';
import { getWebviewLayout } from './webview/layout.js';
import { getWebviewStyles } from './webview/styles.js';

export interface WebviewContentOptions {
  isSidebar?: boolean;
}

export function getWebviewContent(options?: WebviewContentOptions): string {
  const isSidebar = options?.isSidebar !== false;
  const bodyClass = isSidebar ? 'sidebar narrow' : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${getWebviewStyles()}
  </style>
</head>
<body class="${bodyClass}">${getWebviewLayout({ isSidebar })}
  <script>${getWebviewClientScript({ isSidebar })}
  </script>
</body>
</html>`;
}
