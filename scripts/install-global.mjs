#!/usr/bin/env node
// Add (or with --remove, take out) the vault's global learning hooks in the user-level Claude settings,
// so sessions in ANY folder learn into this vault. Keeps every other setting and hook. Idempotent.
// Usage: node scripts/install-global.mjs [--remove] [--settings <path>]
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const VAULT = resolve(dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const MARK = '/hooks/global.mjs';
const cmd = (mode) => `node "${VAULT}${MARK}" ${mode}`;
const PLAN = [
  ['SessionStart', null, 'start', 15],
  ['UserPromptSubmit', null, 'prompt', 10],
  ['PreToolUse', 'Bash|PowerShell|mcp__.*', 'pre', 10],
  ['Stop', null, 'stop', 120],
];

export function apply(settings, remove = false) {
  const s = settings || {};
  s.hooks ||= {};
  for (const [event] of PLAN) {
    s.hooks[event] = (s.hooks[event] || []).filter(g => !JSON.stringify(g).includes(MARK));
    if (!s.hooks[event].length) delete s.hooks[event];
  }
  if (!remove) for (const [event, matcher, mode, timeout] of PLAN)
    (s.hooks[event] ||= []).push({ ...(matcher ? { matcher } : {}), hooks: [{ type: 'command', command: cmd(mode), timeout }] });
  if (!Object.keys(s.hooks).length) delete s.hooks;
  return s;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const a = process.argv.slice(2), i = a.indexOf('--settings');
  const path = i >= 0 ? a[i + 1] : join(homedir(), '.claude', 'settings.json');
  const before = existsSync(path) ? readFileSync(path, 'utf8') : '{}';
  const json = JSON.parse(before || '{}');
  if (existsSync(path)) copyFileSync(path, path + '.bak-vault');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(apply(json, a.includes('--remove')), null, 2) + '\n');
  console.log(`${a.includes('--remove') ? 'removed' : 'installed'} vault global hooks in ${path} (backup: ${path}.bak-vault)`);
}
