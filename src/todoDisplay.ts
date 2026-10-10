export interface TodoDisplayInput {
  content?: string;
  description?: string;
  activeForm?: string;
  status?: 'pending' | 'in_progress' | 'completed' | string;
  id?: string;
}

export interface TodoDisplayParts {
  title: string;
  body: string;
  subtitle: string;
  key: string;
}

/** Strip markdown bold markers commonly pasted into Claude task subjects. */
export function stripTodoMarkdownNoise(text: string): string {
  if (!text) return '';
  let s = String(text).trim();
  s = s.replace(/^\*\*\s*/, '').replace(/\s*\*\*$/, '');
  s = s.replace(/\*\*/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Split a todo into title + body for dense sidebar cards.
 * Prefer explicit description; otherwise heuristic split on 任务N / first line / length.
 */
export function splitTodoDisplay(td: TodoDisplayInput): TodoDisplayParts {
  const rawContent = typeof td.content === 'string' ? td.content : '';
  const content = stripTodoMarkdownNoise(rawContent);
  const description = typeof td.description === 'string' ? td.description.trim() : '';
  const key = (typeof td.id === 'string' && td.id) ? td.id : (content || rawContent || 'todo');

  let title = content || 'Task';
  let body = description;

  if (!body) {
    const lines = rawContent.replace(/\r\n/g, '\n').split('\n').map((l) => stripTodoMarkdownNoise(l)).filter(Boolean);
    const first = lines[0] || content;
    const taskTitle = first.match(/^任务\s*\d+\s*[:：].+$/);
    if (taskTitle && first.length <= 56) {
      title = first;
      body = lines.slice(1).join('\n').trim();
      if (!body && content.length > first.length) {
        body = content.slice(content.indexOf(first) >= 0 ? content.indexOf(first) + first.length : first.length).trim();
      }
    } else if (lines.length > 1 && first.length <= 42) {
      title = first;
      body = lines.slice(1).join('\n').trim();
    } else if (content.length > 42) {
      const sent = content.search(/[。！？\n]/);
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
  // Avoid duplicating title inside body when clamp used full content as body
  if (body === content && title.endsWith('…')) {
    /* keep full body for expand */
  } else if (body.startsWith(title)) {
    body = body.slice(title.length).replace(/^[\s:：\-—]+/, '').trim();
  }

  const subtitle =
    td.status === 'in_progress' && typeof td.activeForm === 'string' && td.activeForm.trim()
      ? td.activeForm.trim()
      : '';

  return { title, body, subtitle, key };
}
