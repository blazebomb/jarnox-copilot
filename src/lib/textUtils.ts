export type ModelAction = {
  action: 'create_file' | 'append_file' | 'insert_code';
  path?: string;
  content?: string;
};

export function commentPrefix(langId: string): string {
  if (langId === 'python' || langId === 'shellscript' || langId === 'yaml') return '# ';
  if (langId === 'html') return '<!-- ';
  return '// ';
}

export function commentSuffix(langId: string): string {
  return langId === 'html' ? ' -->' : '';
}

export function buildModelPrompt(user: string): string {
  return [
    'You are a VS Code automation agent. Decide the best response format:',
    '',
    'If the user requests creating or modifying files, respond ONLY with a single JSON object:',
    '{"action":"create_file|append_file|insert_code","path":"relative/path?","content":"string"}',
    '- create_file: create a new file at path with content',
    '- append_file: append content to existing file (create if missing)',
    '- insert_code: insert code into the current editor (no path)',
    'Rules:',
    '- Do not include explanations or backticks',
    '- Use Unix-style forward slashes in paths',
    '- Keep content exactly as intended (no extra commentary)',
    '',
    'Otherwise, if the user wants code to paste, reply with ONLY the code (you may use a fenced code block).',
    '',
    'User request:',
    user
  ].join('\n');
}

export function unwrapCodeFence(text: string): string {
  if (!text) return '';
  const fence = '```';
  const start = text.indexOf(fence);
  const end = text.lastIndexOf(fence);
  if (start !== -1 && end !== -1 && end > start) {
    let inner = text.slice(start + fence.length, end);
    inner = inner.replace(/^\s*[A-Za-z0-9_+#.\-]*\s*\n/, '');
    return inner.trim();
  }
  return text.trim();
}

export function stripComments(text: string): string {
  if (!text) return '';
  let out = text;
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/^\s*\/\/.*$/gm, '');
  out = out.replace(/^\s*#(?!\!).*$/gm, '');
  out = out
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/g, ''))
    .filter((l, i, arr) => l.trim() !== '' || (i > 0 && arr[i - 1].trim() !== ''))
    .join('\n')
    .trim();
  return out;
}

export function parseModelAction(text: string): ModelAction | null {
  const t = (text || '').trim();
  if (!t) return null;
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = t.slice(start, end + 1);
  try {
    const obj = JSON.parse(candidate);
    if (typeof obj?.action !== 'string') return null;
    const action = obj.action as string;
    if (!['create_file', 'append_file', 'insert_code'].includes(action)) return null;
    const out: ModelAction = { action: action as any };
    if (typeof obj.path === 'string') out.path = obj.path;
    if (typeof obj.content === 'string') out.content = obj.content;
    return out;
  } catch {
    return null;
  }
}
