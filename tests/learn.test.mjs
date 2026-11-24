// Auto-learning loop: transcript analysis, signals, Stop-hook learn block, 3-try cap, metrics, rollup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = mkdtempSync(join(tmpdir(), 'vault learn '));
process.env.VAULT_ROOT = join(BASE, 'unit');
const L = await import('../hooks/learn.mjs');
const { today } = await import('../hooks/lib.mjs');
const { rollupMetrics } = await import('../scripts/rollup.mjs');

const put = (root, rel, text) => { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), text); };
const node = (args, input, env = {}) => spawnSync(process.execPath, args, { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, ...env } });

// Minimal Claude Code transcript lines.
const T0 = Date.parse('2026-11-21T10:00:00Z');
const at = (s) => new Date(T0 + s * 1000).toISOString();
const user = (text, s = 0) => JSON.stringify({ type: 'user', timestamp: at(s), message: { role: 'user', content: text } });
const use = (id, name, input, s) => JSON.stringify({ type: 'assistant', timestamp: at(s), message: { content: [{ type: 'tool_use', id, name, input }] } });
const res = (id, text, err, s) => JSON.stringify({ type: 'user', timestamp: at(s), message: { content: [{ type: 'tool_result', tool_use_id: id, content: text, is_error: err }] } });
const transcript = (prompt, steps) => [user('earlier task', -500), use('x0', 'Bash', { command: 'old' }, -400), res('x0', 'boom', true, -399), user(prompt, 0), ...steps].join('\n') + '\n';

const failing = [
  use('a1', 'Bash', { command: 'npm run build' }, 10), res('a1', 'Error: Cannot find module three', true, 11),
  use('a2', 'Bash', { command: 'npm run build' }, 20), res('a2', 'Error: Cannot find module three', true, 21),
  use('a3', 'Grep', { pattern: 'x' }, 25), res('a3', 'No matches found', true, 26),
  use('a4', 'Read', { file_path: 'domains/vfx/playbook.md' }, 30), res('a4', 'ok', false, 31),
];

test('parseTurn: only the current turn, real errors, retries, reads, duration', () => {
  const t = L.parseTurn(transcript('build the site', failing).split('\n'));
  assert.equal(t.prompt, 'build the site');
  assert.equal(t.errors.length, 2);           // old turn + Grep miss ignored
  assert.equal(t.maxRetry, 2);
  assert.deepEqual(L.domainsOf(t.reads), ['vfx']);
  assert.equal(t.secs, 31);
});

test('signals: errors, slow, correction, router miss; relays give none', () => {
  const t = L.parseTurn(transcript('still broken, the build fails', failing).split('\n'));
  const kinds = L.signals({ ...t, secs: 400 }, { tier: 'medium', routes: ['web'] }).map(s => s.kind);
  assert.deepEqual(kinds, ['errors', 'slow', 'correction', 'router']);
  const one = L.parseTurn(transcript('make an icon', failing.slice(0, 2)).split('\n'));
  assert.deepEqual(L.signals(one, { tier: 'simple', routes: ['images'] }).map(s => s.kind), ['errors'], 'one error on a tiny task still teaches');
  const task = L.parseTurn(transcript('make it learn from every error and when it was super slow', []).split('\n'));
  assert.equal(L.signals(task, { tier: 'medium', routes: [] }).length, 0, 'a task description is not a correction');
  const relay = L.parseTurn(transcript('<task-notification> done', failing).split('\n'));
  assert.equal(L.signals(relay, {}).length, 0);
  const vault = L.signals(t, { tier: 'medium', routes: ['vault'] }).map(s => s.kind);
  assert.ok(!vault.includes('router'), 'vault upkeep may read any domain');
});

test('learnReason: asks for root cause + lesson, clears once the lesson exists', () => {
  const sigs = [{ kind: 'errors', text: '2 tool errors' }];
  const why = L.learnReason(sigs, { lessonsChanged: false, routerChanged: false, nextId: 'L-045' });
  assert.match(why, /root cause/);
  assert.match(why, /\[L-045\] \(h:0 x:1\)/);
  assert.equal(L.learnReason(sigs, { lessonsChanged: true, routerChanged: false, nextId: 'L-045' }), null);
  const r = L.learnReason([{ kind: 'router', text: 'miss', domains: ['vfx'] }], { lessonsChanged: true, routerChanged: false, nextId: 'L-1' });
  assert.match(r, /router\.json/);
  assert.equal(L.learnReason([{ kind: 'router', text: 'miss', domains: ['vfx'] }], { lessonsChanged: false, routerChanged: true, nextId: 'L-1' }), null);
});

test('3-try cap: the 4th identical failing call is denied by pre-tool', () => {
  const steps = [];
  for (let i = 0; i < 3; i++) steps.push(use(`r${i}`, 'Bash', { command: 'node broken.js' }, i * 2), res(`r${i}`, 'SyntaxError: Unexpected token', true, i * 2 + 1));
  const file = join(BASE, 'retry transcript.jsonl');
  writeFileSync(file, transcript('run it', steps));
  const root = join(BASE, 'cap vault'); mkdirSync(join(root, 'hooks'), { recursive: true });
  writeFileSync(join(root, 'hooks', 'modes.json'), '{}');
  const deny = node([join(REPO, 'hooks', 'pre-tool.mjs')], { tool_name: 'Bash', tool_input: { command: 'node broken.js' }, transcript_path: file, session_id: 's' }, { VAULT_ROOT: root });
  assert.match(deny.stdout, /3-try cap/);
  const other = node([join(REPO, 'hooks', 'pre-tool.mjs')], { tool_name: 'Bash', tool_input: { command: 'node fixed.js' }, transcript_path: file, session_id: 's' }, { VAULT_ROOT: root });
  assert.equal(other.stdout, '');
});

test('metrics: one line per owner turn, digest names weak routes, promote list', () => {
  const t = L.parseTurn(transcript('make a vfx slash', failing).split('\n'));
  assert.equal(L.recordMetrics(t, { tier: 'simple', routes: ['vfx'] }, [{ kind: 'errors' }], 'pc'), true);
  assert.equal(L.recordMetrics(t, { tier: 'simple', routes: ['vfx'] }, [], 'pc'), false, 'deduped');
  const path = join(process.env.VAULT_ROOT, L.METRICS);
  const row = JSON.parse(readFileSync(path, 'utf8').trim());
  assert.equal(row.inLimit, true); assert.equal(row.ok, row.secs <= 15, 'ok = on goal (limit/4)'); assert.equal(row.errors, 2);
  const many = Array.from({ length: 5 }, (_, i) => JSON.stringify({ t: at(i), tier: 'medium', secs: 400, ok: false, errors: 1, routes: ['roblox'], signals: ['slow'] })).join('\n');
  assert.match(L.perfDigest(many), /0% on goal.*weakest routes: roblox \(5\)/);
  assert.deepEqual(L.toPromote('- [L-001] (h:2 x:0) a\n- [L-002] (h:0 x:1) b\n- [L-003] (h:3 x:0) c → promoted: x.md'), ['L-001']);
});

test('rollupMetrics: past months become a summary note, current month stays', () => {
  const root = join(BASE, 'rollup vault');
  put(root, 'archive/metrics.jsonl', [
    { t: '2026-10-03T10:00:00.000Z', tier: 'simple', secs: 30, ok: true, errors: 0, routes: ['web'], signals: [] },
    { t: '2026-10-09T10:00:00.000Z', tier: 'medium', secs: 500, ok: false, errors: 2, routes: ['roblox'], signals: ['slow'] },
    { t: '2026-11-02T10:00:00.000Z', tier: 'simple', secs: 20, ok: true, errors: 0, routes: [], signals: [] },
  ].map(r => JSON.stringify(r)).join('\n') + '\n');
  assert.deepEqual(rollupMetrics(root, '2026-11-21'), ['2026-10']);
  assert.match(readFileSync(join(root, 'archive', 'metrics-2026-10.md'), 'utf8'), /turns: 2; on goal: 50%[\s\S]*roblox \(1\)/);
  assert.equal(readFileSync(join(root, 'archive', 'metrics.jsonl'), 'utf8').trim().split('\n').length, 1);
  assert.deepEqual(rollupMetrics(root, '2026-11-21'), [], 'idempotent');
});

test('stop-gate end to end: blocks to learn, then commits once the lesson is written', () => {
  const V = join(BASE, 'stop learn vault');
  const g = (...a) => spawnSync('git', a, { cwd: V, encoding: 'utf8', env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))) });
  mkdirSync(V, { recursive: true }); g('init', '-q'); g('config', 'user.name', 't'); g('config', 'user.email', 't@t');
  put(V, 'log.md', `# Log\n## [${today()}] test / x\nimproved: a; b; c; d; e; f; g; h; i; j\n`);   // the hook's own (local) date, not UTC
  const FM = '---\nsummary: l\nupdated: 2026-11-21\nstatus: current\n---\n';
  put(V, 'lessons.md', `${FM}# Lessons\n- [L-001] (h:0 x:0) 2026-11-21 a — trigger: a\n`);
  g('add', '-A'); g('commit', '-qm', 'init');
  const file = join(BASE, 'stop transcript.jsonl');
  writeFileSync(file, transcript('build the site', [...failing.slice(0, 6), JSON.stringify({ type: 'assistant', timestamp: at(40), message: { content: [{ type: 'text', text: 'Improved: a; b; c\nStill to improve: d; e; f' }] } })])); // errors only, no router miss
  put(V, 'state/work.md', 'x\n');
  const run = (extra = {}) => node([join(REPO, 'hooks', 'stop-gate.mjs')], { session_id: 'learn-1', transcript_path: file, ...extra }, { VAULT_ROOT: V });
  const first = run();
  assert.match(first.stdout, /LEARN \(auto\)[\s\S]*\[L-002\]/);
  assert.ok(existsSync(join(V, 'archive', 'metrics.jsonl')), 'metrics recorded');
  const silent = run({ stop_hook_active: true });
  assert.equal(silent.stdout, '', 'second pass never blocks');
  put(V, 'lessons.md', `${FM}# Lessons\n- [L-001] (h:0 x:0) 2026-11-21 a — trigger: a\n- [L-002] (h:0 x:1) 2026-11-21 three missing → pin deps — trigger: build\n`);
  assert.match(run().stdout, /Apply new lessons NOW/, 'a lesson that is not applied blocks');
  put(V, 'lessons.md', `${FM}# Lessons\n- [L-001] (h:0 x:0) 2026-11-21 a — trigger: a\n- [L-002] (h:0 x:1) 2026-11-21 three missing → pin deps — trigger: build → applied: checklists/web.md\n`);
  const ok = run();
  assert.equal(ok.stdout, '');
  assert.equal(g('status', '--porcelain').stdout.trim(), '', 'committed');
});

test('honesty: claiming done after a failed last call is flagged; admitting it is not', () => {
  const said = (text) => JSON.stringify({ type: 'assistant', timestamp: at(40), message: { content: [{ type: 'text', text }] } });
  const lie = L.parseTurn(transcript('build the site', [...failing.slice(0, 2), said('Done')]).split('\n'));
  assert.ok(L.signals(lie, { tier: 'medium' }).some(s => s.kind === 'honesty'));
  const why = L.learnReason(L.signals(lie, { tier: 'medium' }), { lessonsChanged: true, routerChanged: false, nextId: 'L-1' });
  assert.match(why, /HONESTY/, 'a lesson does not excuse a false claim');
  const honest = L.parseTurn(transcript('build the site', [...failing.slice(0, 2), said('Error: build fails, three missing')]).split('\n'));
  assert.ok(!L.signals(honest, { tier: 'medium' }).some(s => s.kind === 'honesty'));
  const fixed = L.parseTurn(transcript('build the site', [...failing.slice(0, 2), use('b', 'Bash', { command: 'npm run build' }, 30), res('b', 'ok', false, 31), said('Done')]).split('\n'));
  assert.ok(!L.signals(fixed, { tier: 'medium' }).some(s => s.kind === 'honesty'));
});

test('always improve: every task needs >= 10 logged fixes, none listed in the reply; crew spawn/spec delays are slow signals', () => {
  const clean = L.parseTurn(transcript('make a landing page', [use('w', 'Write', { file_path: 'C:/x/site/index.html' }, 5), res('w', 'ok', false, 6)]).split('\n'));
  const sigs = L.signals(clean, { tier: 'medium', routes: ['web'] }, { improved: 3 });
  assert.deepEqual(sigs.map(s => s.kind), ['improve'], 'only 3 of 10 fixes logged');
  assert.match(L.learnReason(sigs, { lessonsChanged: false, routerChanged: false, nextId: 'L-1' }), /ALWAYS IMPROVE[\s\S]*at least 10/);
  assert.equal(L.signals(clean, { tier: 'simple', routes: ['web'] }, { improved: 10 }).length, 0, '10 logged, no reply footer needed (owner: wastes tokens)');
  assert.equal(L.improvedCount('## [d] a\nimproved: x; y; z\n## [d] b\nimproved: q\n'), 1, 'only the newest entry counts');
  assert.equal(L.improvedCount('## [d] a\nwe log `improved:` lines\nimproved: x; y; z'), 3, 'line-start match only');
  const crew = { ...clean, skills: ['crew'], agentSecs: 45, specSecs: 120 };
  assert.equal(L.signals(crew, { tier: 'medium' }, { improved: 3 }).filter(s => s.kind === 'slow').length, 2);
});

test('owner-preferred tools: Blender is denied unless the owner names it (Umbrio Sandbox instead)', () => {
  const root = join(BASE, 'prefer vault'); mkdirSync(join(root, 'hooks'), { recursive: true });
  writeFileSync(join(root, 'hooks', 'modes.json'), '{}');
  writeFileSync(join(root, 'hooks', 'prefer.json'), readFileSync(join(REPO, 'hooks', 'prefer.json'), 'utf8'));
  const run = (prompt) => {
    const f = join(BASE, `prefer ${prompt.length}.jsonl`); writeFileSync(f, transcript(prompt, []));
    return node([join(REPO, 'hooks', 'pre-tool.mjs')], { tool_name: 'mcp__blender__execute_blender_code', tool_input: {}, transcript_path: f, session_id: 'p' }, { VAULT_ROOT: root }).stdout;
  };
  assert.match(run('make a poison armor model'), /Umbrio Sandbox/);
  assert.equal(run('make it in blender please'), '');
});
