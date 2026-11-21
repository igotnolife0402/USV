// Shared helpers for vault hooks. Node 20+ stdlib only.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MODE_FILE = join(ROOT, '.claude', '.mode');

export function readInput() {
  try {
    const raw = readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export const emit = (obj) => process.stdout.write(JSON.stringify(obj));

// Hooks must never crash the session.
export async function safe(fn) {
  try { await fn(); } catch { /* silent */ }
  process.exit(0);
}

export function readIf(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

// Returns { mode: 'pc'|'mobile', remote: boolean }.
export function getMode(sessionId) {
  const remote = !!process.env.CLAUDE_CODE_BRIDGE_SESSION_ID;
  try {
    const o = JSON.parse(readFileSync(MODE_FILE, 'utf8'));
    if (o && sessionId && o.session_id === sessionId && (o.mode === 'pc' || o.mode === 'mobile')) return { mode: o.mode, remote };
  } catch { /* no override */ }
  return { mode: process.env.CLAUDE_CODE_REMOTE === 'true' ? 'mobile' : 'pc', remote };
}

export function setMode(mode, sessionId) {
  mkdirSync(dirname(MODE_FILE), { recursive: true });
  writeFileSync(MODE_FILE, JSON.stringify({ mode, session_id: sessionId || '' }));
}

// Simple YAML frontmatter: `key: value`, `[a, b]` lists, `>`/`|` folded blocks.
// Returns { data: object|null, body, end } where end = line count of the frontmatter block.
export function fm(text) {
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0].trim() !== '---') return { data: null, body: String(text), end: 0 };
  const close = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (close < 0) return { data: null, body: String(text), end: 0 };
  const data = {};
  let key = null;
  for (const l of lines.slice(1, close)) {
    const m = l.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) {
      key = m[1];
      let v = m[2].replace(/\s+#.*$/, '').trim();
      if (/^[>|][-+]?$/.test(v)) v = '';
      else if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1).split(',').map(s => unq(s.trim())).filter(Boolean);
      else v = unq(v);
      data[key] = v;
    } else if (key && /^\s+\S/.test(l) && typeof data[key] === 'string') {
      data[key] = (data[key] ? data[key] + ' ' : '') + l.trim();
    }
  }
  return { data, body: lines.slice(close + 1).join('\n').replace(/^\n+/, ''), end: close + 1 };
}
const unq = (s) => s.replace(/^(['"])(.*)\1$/, '$2');

export function today(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
