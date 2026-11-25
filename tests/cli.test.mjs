// scripts/vault.mjs (the CLI behind /vault, /learn, /queue) and the skill-miss check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = mkdtempSync(join(tmpdir(), 'vault cli '));
const V = join(BASE, 'vault copy');
for (const p of ['router.json', 'lessons.md', 'index.md', 'queue', 'domains', 'checklists', 'profiles', '.claude/skills'])
  // skip big untracked binaries (domains/vfx/refs videos: 2.6 GB per run filled the disk, 2026-11-25)
  cpSync(join(REPO, p), join(V, p), { recursive: true, filter: s => statSync(s).isDirectory() || statSync(s).size < 1e6 });
test.after(() => rmSync(BASE, { recursive: true, force: true }));
process.env.VAULT_ROOT = V;
const C = await import('../scripts/vault.mjs');
const L = await import('../hooks/learn.mjs');
const { personalSkill, SKILLS } = await import('../scripts/install-global.mjs');

test('route names real notes, checklist and existing skills', () => {
  const r = C.routeInfo('make a roblox sword with slash vfx');
  assert.ok(r.routes.includes('roblox') && r.routes.includes('vfx'));
  assert.ok(r.skills.length && r.skills.every(s => s.exists), 'every routed skill exists');
  assert.ok(r.checklist.every(c => c.startsWith('checklists/')));
});

test('every router route points at files and skills that exist', () => {
  const router = JSON.parse(readFileSync(join(REPO, 'router.json'), 'utf8'));
  for (const r of router.routes) {
    for (const n of r.notes) assert.doesNotThrow(() => readFileSync(join(REPO, n)), `${r.id}: ${n}`);
    if (r.checklist) assert.doesNotThrow(() => readFileSync(join(REPO, r.checklist)), `${r.id}: ${r.checklist}`);
    if (r.skill) assert.doesNotThrow(() => readFileSync(join(REPO, '.claude/skills', r.skill, 'SKILL.md')), `${r.id}: skill ${r.skill}`);
  }
});

test('find returns exact file:line hits', () => {
  const f = C.find(['drop', 'odds']);
  assert.ok(f.hits.some(h => h.f === 'domains/math/playbook.md' && h.line > 0));
});

test('learn appends the next id and an errors.md row; bump counts and flags promotion', () => {
  const before = readFileSync(join(V, 'lessons.md'), 'utf8');
  const next = L.nextLessonId(before);
  const r = C.learn({ cause: 'icon too small', rule: 'export 512 px', trigger: 'icon, export', domain: 'images', symptom: 'blurry icon', fix: 'export at 512' });
  assert.equal(r.id, next);
  const after = readFileSync(join(V, 'lessons.md'), 'utf8');
  assert.ok(after.startsWith(before.split(/^- \[L-/m)[0]), 'header kept');
  assert.match(after, new RegExp(`\\[${next}\\] \\(h:0 x:1\\)`));
  assert.match(readFileSync(join(V, 'domains/images/errors.md'), 'utf8'), /\| blurry icon \| icon too small \| export at 512 \|/);
  assert.equal(C.bump(next).promote, true, 'second hit -> promote');
  assert.throws(() => C.learn({ cause: 'a', rule: 'b' }), /needs/);
  assert.throws(() => C.learn({ cause: 'a', rule: 'b', trigger: 'c', domain: 'nope', symptom: 's' }), /no domains\/nope/);
});

test('words adds to a route and refuses clashes', () => {
  const r = C.addWords('math', ['geometry', 'roblox']);
  assert.deepEqual(r.added, ['geometry']);
  assert.match(r.clashes[0], /roblox \(on roblox\)/);
});

test('queue add / list / done', () => {
  const n = C.queue('list').length;
  C.queue('add', 'run the place in Studio', 'src/server/Main.luau');
  const l = C.queue('list'); assert.equal(l.length, n + 1);
  C.queue('done', String(l.length));
  assert.equal(C.queue('list').length, n);
});

test('skill miss: a routed skill not used on a build turn is a learning signal', () => {
  const turn = { prompt: 'build it', relay: false, secs: 10, errors: [], maxRetry: 0, reads: [], writes: ['index.html'], skills: [] };
  assert.deepEqual(L.signals(turn, { tier: 'medium', routes: ['web'], skills: ['website'] }).map(s => s.kind), ['skill']);
  assert.deepEqual(L.signals({ ...turn, skills: ['website'] }, { tier: 'medium', routes: ['web'], skills: ['website'] }).map(s => s.kind), [], 'skill used: no signal (improve is only measured when the Stop hook passes a log count)');
  assert.equal(L.signals({ ...turn, writes: [] }, { tier: 'medium', routes: ['web'], skills: ['website'] }).length, 0, 'questions need no skill');
  const lines = [JSON.stringify({ type: 'user', timestamp: '2026-11-21T10:00:00Z', message: { content: 'go' } }),
    JSON.stringify({ type: 'assistant', timestamp: '2026-11-21T10:00:05Z', message: { content: [{ type: 'tool_use', id: 's', name: 'Skill', input: { skill: 'website' } }] } })];
  assert.deepEqual(L.parseTurn(lines).skills, ['website']);
});

test('personal skill copies call the CLI by absolute path', () => {
  for (const s of SKILLS) {
    const txt = personalSkill(s, REPO.replace(/\\/g, '/'));
    assert.ok(!/node scripts\/vault\.mjs/.test(txt), s);
    // any clone folder name (cloud clones are not named Super-Vault)
    assert.match(txt, /node "(\/|[A-Za-z]:\/)[^"]*\/scripts\/vault\.mjs"/);
    assert.match(txt, /^---\nname: /);
  }
});

test('tool registry: add once, find by fuzzy words, update in place', () => {
  C.toolAdd('Umbrio Sandbox', { where: 'https://claude.ai/artifact/TEST', how: '3D character sandbox' });
  assert.equal(C.toolFind(['umbrio', 'sandbox'])[0].where, 'https://claude.ai/artifact/TEST');
  assert.equal(C.toolFind(['umbro'])[0]?.name, 'Umbrio Sandbox', 'typo still finds it');
  assert.equal(C.toolAdd('Umbrio Sandbox', { where: 'https://claude.ai/artifact/NEW' }).updated, true);
  assert.equal(C.toolFind(['umbrio']).filter(t => t.name === 'Umbrio Sandbox').length, 1);
});
