// Global (user-level) hooks: sessions in any folder learn into the vault; the vault itself is left to project hooks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = mkdtempSync(join(tmpdir(), 'vault global '));
const { apply } = await import('../scripts/install-global.mjs');
const node = (args, input, env = {}) => spawnSync(process.execPath, args, { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, ...env } });
const HOOK = join(REPO, 'hooks', 'global.mjs');

test('installer adds the 4 global hooks once, keeps other hooks, and removes cleanly', () => {
  const other = { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo other' }] }] }, model: 'x' };
  const once = apply(structuredClone(other));
  const twice = apply(structuredClone(once));
  assert.deepEqual(twice, once, 'idempotent');
  assert.equal(once.model, 'x');
  assert.equal(once.hooks.Stop.length, 2);
  for (const e of ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'Stop'])
    assert.ok(JSON.stringify(once.hooks[e]).includes('/hooks/global.mjs'), e);
  assert.ok(!JSON.stringify(once).includes('$'), 'no shell variables in commands');
  const removed = apply(structuredClone(once), true);
  assert.deepEqual(removed, other);
});

test('inside the vault the global hook does nothing (project hooks run there)', () => {
  const r = node([HOOK, 'prompt'], { prompt: 'make a roblox obby', session_id: 'g1', cwd: REPO });
  assert.equal(r.stdout, '');
});

test('in another folder: routes into the vault with absolute paths', () => {
  const proj = join(BASE, 'some project');
  mkdirSync(proj, { recursive: true });
  const r = node([HOOK, 'prompt'], { prompt: 'calculate the drop rate odds for 20 rolls', session_id: 'g2', cwd: proj });
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /VAULT .*Super-Vault \| TIER=/);
  assert.match(ctx, /domains\/math\/index\.md/);
  const s = node([HOOK, 'start'], { session_id: 'g2', cwd: proj });
  assert.match(JSON.parse(s.stdout).hookSpecificOutput.additionalContext, /shared memory for every task/);
});

test('in another folder: a failed turn blocks once to learn into the vault', () => {
  const proj = join(BASE, 'other project');
  mkdirSync(proj, { recursive: true });
  const T0 = Date.parse('2026-11-21T10:00:00Z');
  const at = (s) => new Date(T0 + s * 1000).toISOString();
  const lines = [
    { type: 'user', timestamp: at(0), message: { content: 'make an icon' } },
    { type: 'assistant', timestamp: at(5), message: { content: [{ type: 'tool_use', id: 'a', name: 'Bash', input: { command: 'magick icon.svg icon.png' } }] } },
    { type: 'user', timestamp: at(6), message: { content: [{ type: 'tool_result', tool_use_id: 'a', content: 'magick: command not found', is_error: true }] } },
  ].map(o => JSON.stringify(o)).join('\n');
  const tr = join(BASE, 'icon transcript.jsonl');
  writeFileSync(tr, lines + '\n');
  // Point the hook at a scratch copy so the real vault's metrics and git are untouched.
  const r = node([HOOK, 'stop'], { session_id: 'g3', cwd: proj, transcript_path: tr, stop_hook_active: true }, { VAULT_ROOT: join(BASE, 'no vault') });
  assert.equal(r.stdout, '', 'second pass never blocks');
  const b = node([HOOK, 'stop'], { session_id: 'g3', cwd: proj, transcript_path: tr }, { VAULT_ROOT: join(BASE, 'no vault') });
  assert.match(b.stdout, /LEARN \(auto\)[\s\S]*magick[\s\S]*Vault: /);
});
