// Shared helpers for vault hooks. Node 20+ stdlib only.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Vault root = parent of hooks/. Hook commands are shell-agnostic (`node "./hooks/x.mjs"`, no $VAR): on this
// Windows PC hooks may run in PowerShell, where "$CLAUDE_PROJECT_DIR" expands to nothing (L-029).
// Never CLAUDE_PROJECT_DIR: it keeps the session's ORIGINAL folder after the session moves directories. VAULT_ROOT = tests only.
export const ROOT = process.env.VAULT_ROOT || dirname(dirname(fileURLToPath(import.meta.url)));
const MODE_FILE = join(ROOT, '.claude', '.mode');

export function readInput() {
  try {
    const raw = readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// True when this module is the script node was started with (case-insensitive: Windows drive letters vary).
export const isMain = (url) => !!process.argv[1] && fileURLToPath(url).toLowerCase() === resolve(process.argv[1]).toLowerCase();

export const emit =(obj) => process.stdout.write(JSON.stringify(obj));

// Hooks must never crash the session. Internal errors go to .claude/.logs/hooks.log (gitignored) so they can be debugged.
export async function safe(fn) {
  try { await fn(); } catch (e) { logError(e); }
  process.exit(0);
}

export function logError(e) {
  try {
    const dir = join(ROOT, '.claude', '.logs');
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, 'hooks.log'), `${new Date().toISOString()} ${basename(process.argv[1] || '?')} ${String(e?.stack || e).split('\n').slice(0, 3).join(' | ')}\n`);
  } catch { /* logging must never throw */ }
}

// /pc or /mobile at the very start of the owner's prompt, also as an expanded slash command
// (`<command-name>/pc</command-name>`). "/pcx", "/pc-foo", "how do I use /pc?" and "/review /pc" do not switch.
export const MODE_CMD = /^\s*(?:<command-name>\s*)?\/(pc|mobile)(?=\s|<|$)/i;

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
