#!/usr/bin/env node
// One deterministic entry point for talking to the vault, so the right files are always touched.
//   node scripts/vault.mjs find <words...>            routed notes + exact grep hits (paths and lines)
//   node scripts/vault.mjs route "<prompt>"           what the prompt hook will route: tier, notes, checklist, skill
//   node scripts/vault.mjs learn --cause "" --rule "" --trigger "a, b" [--domain d --symptom "" --fix ""] [--helped]
//   node scripts/vault.mjs bump L-012 --helped|--hurt   count a lesson again (seen twice -> promote)
//   node scripts/vault.mjs words <routeId> <word...>   add trigger words to a route (warns on clashes)
//   node scripts/vault.mjs queue add "<step>" [--context ""] | queue list | queue done <n>
//   node scripts/vault.mjs status                      lint, performance, lessons to promote, queue, last commit
//   node scripts/vault.mjs tool find <words> | tool add "<name>" --where <url|path> [--kind artifact|cli|mcp|app] [--how ""]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readIf, fm, today } from '../hooks/lib.mjs';
import { classify, route } from '../hooks/prompt-router.mjs';
import { nextLessonId, perfDigest, toPromote, METRICS } from '../hooks/learn.mjs';
import { lintAll } from './vault-lint.mjs';

export const VAULT = process.env.VAULT_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), '..');
const P = (rel) => join(VAULT, rel);
const router = () => JSON.parse(readIf(P('router.json')) || '{"routes":[]}');
const summary = (rel) => fm(readIf(P(rel))).data?.summary || '';
const flag = (args, name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

export function routeInfo(prompt) {
  const r = router(), routes = route(prompt, r);
  return {
    tier: classify(prompt, r.tiers), routes: routes.map(x => x.id),
    notes: [...new Set(routes.flatMap(x => x.notes || []))].slice(0, 4).map(n => ({ path: n, summary: summary(n) })),
    checklist: [...new Set(routes.map(x => x.checklist).filter(Boolean))],
    skills: [...new Set(routes.map(x => x.skill).filter(Boolean))].map(s => ({ name: s, path: `.claude/skills/${s}/SKILL.md`, exists: existsSync(P(`.claude/skills/${s}/SKILL.md`)) })),
  };
}

const NOTE_DIRS = ['domains', 'profiles', 'checklists'];
function mdFiles(dir) {
  const out = [];
  for (const e of readdirSync(P(dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...mdFiles(rel)); else if (e.name.endsWith('.md')) out.push(rel);
  }
  return out;
}
export function find(words) {
  const info = routeInfo(words.join(' '));
  const terms = words.map(w => w.toLowerCase()).filter(w => w.length > 2);
  const hits = [];
  for (const f of [...NOTE_DIRS.flatMap(d => existsSync(P(d)) ? mdFiles(d) : []), 'lessons.md', 'index.md']) {
    readIf(P(f)).split('\n').forEach((line, i) => {
      const l = line.toLowerCase(), n = terms.filter(t => l.includes(t)).length;
      if (n) hits.push({ f, line: i + 1, n, text: line.trim().slice(0, 160) });
    });
  }
  hits.sort((a, b) => b.n - a.n);
  return { ...info, hits: hits.slice(0, 12) };
}

export function learn({ cause, rule, trigger, domain, symptom, fix, helped }) {
  if (!cause || !rule || !trigger) throw new Error('learn needs --cause, --rule and --trigger');
  const lp = P('lessons.md'), text = readIf(lp), id = nextLessonId(text);
  const bullet = `- [${id}] (h:${helped ? 1 : 0} x:${helped ? 0 : 1}) ${today()} ${cause} → ${rule} — trigger: ${trigger}`;
  const last = [...text.matchAll(/^- \[L-\d+\].*$/gm)].pop();
  writeFileSync(lp, last ? text.slice(0, last.index + last[0].length) + '\n' + bullet + text.slice(last.index + last[0].length) : text.replace(/\n*$/, '\n') + bullet + '\n');
  const wrote = [`lessons.md ${id}`];
  if (domain && symptom) {
    const ep = P(`domains/${domain}/errors.md`);
    if (!existsSync(ep)) throw new Error(`no domains/${domain}/errors.md (domains: ${readdirSync(P('domains')).join(', ')})`);
    const cell = (s) => String(s || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
    writeFileSync(ep, readIf(ep).replace(/\n*$/, '\n') + `| ${cell(symptom)} | ${cell(cause)} | ${cell(fix || rule)} | ${today()} |\n`);
    wrote.push(`domains/${domain}/errors.md`);
  }
  return { id, wrote };
}

export function bump(id, helped) {
  const lp = P('lessons.md'), text = readIf(lp);
  const re = new RegExp(`^(- \\[${id}\\] \\(h:)(\\d+)( x:)(\\d+)(\\).*)$`, 'm');
  const m = text.match(re); if (!m) throw new Error(`no lesson ${id}`);
  const h = +m[2] + (helped ? 1 : 0), x = +m[4] + (helped ? 0 : 1);
  writeFileSync(lp, text.replace(re, `$1${h}$3${x}$5`));
  return { id, h, x, promote: (h >= 2 || x >= 2) && !/→ promoted:/.test(m[0]) };
}

export function addWords(routeId, words) {
  const r = router(), target = r.routes.find(x => x.id === routeId);
  if (!target) throw new Error(`no route "${routeId}" (routes: ${r.routes.map(x => x.id).join(', ')})`);
  const added = [], clashes = [];
  for (const w of words.map(s => s.toLowerCase().trim()).filter(Boolean)) {
    const other = r.routes.find(x => x !== target && (x.words || []).includes(w));
    if (other) { clashes.push(`${w} (on ${other.id})`); continue; }
    if (!target.words.includes(w)) { target.words.push(w); added.push(w); }
  }
  writeFileSync(P('router.json'), JSON.stringify(r, null, 2) + '\n');
  return { added, clashes };
}

export function queue(op, arg, context) {
  const qp = P('queue/pc.md'), text = readIf(qp);
  const open = () => readIf(qp).split('\n').map((l, i) => ({ l, i })).filter(x => /^- \[ \]/.test(x.l));
  if (op === 'add') { writeFileSync(qp, text.replace(/\n*$/, '\n') + `- [ ] ${today()} ${arg}${context ? ` — ${context}` : ''}\n`); return open().map(x => x.l); }
  if (op === 'done') {
    const items = open(), it = items[Number(arg) - 1]; if (!it) throw new Error(`no open item ${arg} (have ${items.length})`);
    const lines = text.split('\n'); lines[it.i] = lines[it.i].replace('- [ ]', '- [x]'); writeFileSync(qp, lines.join('\n'));
  }
  return open().map((x, n) => `${n + 1}. ${x.l.slice(6)}`);
}

// Tool / artifact registry (profiles/tools.md): the owner teaches once, every session knows it.
const TOOLS = 'profiles/tools.md';
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function toolFind(words) {
  const q = norm(words.join(' ')).split(' ').filter(Boolean);
  return readIf(P(TOOLS)).split('\n').filter(l => /^\| (?!Name |---)/.test(l)).map(l => l.split('|').slice(1, -1).map(c => c.trim()))
    .map(([name, kind, where, how]) => ({ name, kind, where, how, score: q.filter(w => norm(`${name} ${how}`).includes(w) || norm(name).split(' ').some(n => n.startsWith(w.slice(0, 4)))).length }))
    .filter(t => t.score).sort((a, b) => b.score - a.score);
}
export function toolAdd(name, { where, kind = 'artifact', how = '' }) {
  if (!name || !where) throw new Error('tool add needs a name and --where <url or path>');
  const cell = (s) => String(s).replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  const text = readIf(P(TOOLS)), rows = text.split('\n');
  const i = rows.findIndex(l => l.startsWith(`| ${cell(name)} |`));
  const row = `| ${cell(name)} | ${cell(kind)} | ${cell(where)} | ${cell(how)} | ${today()} |`;
  if (i >= 0) rows[i] = row; else rows.splice(rows.reduce((last, l, n) => (l.startsWith('|') ? n : last), rows.length - 1) + 1, 0, row);
  writeFileSync(P(TOOLS), rows.join('\n'));
  return { name, where, updated: i >= 0 };
}

export function status() {
  const lint = lintAll(VAULT), errs = lint.filter(r => r.level === 'error');
  const g = spawnSync('git', ['log', '-1', '--format=%h %cr %s'], { cwd: VAULT, encoding: 'utf8' });
  return {
    lint: `${errs.length} error(s), ${lint.length - errs.length} warning(s)`, errors: errs.slice(0, 5).map(e => `${e.file}:${e.line ?? 0} ${e.msg}`),
    perf: perfDigest(readIf(P(METRICS))) || 'not enough turns yet', promote: toPromote(readIf(P('lessons.md'))),
    lessons: (readIf(P('lessons.md')).match(/^- \[L-/gm) || []).length, queue: queue('list').length, last: (g.stdout || '').trim(),
  };
}

const show = (o) => console.log(typeof o === 'string' ? o : JSON.stringify(o, null, 2));
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [cmd, ...a] = process.argv.slice(2);
  try {
    if (cmd === 'find') show(find(a));
    else if (cmd === 'route') show(routeInfo(a.join(' ')));
    else if (cmd === 'learn') show(learn({ cause: flag(a, 'cause'), rule: flag(a, 'rule'), trigger: flag(a, 'trigger'), domain: flag(a, 'domain'), symptom: flag(a, 'symptom'), fix: flag(a, 'fix'), helped: a.includes('--helped') }));
    else if (cmd === 'bump') show(bump(a[0], a.includes('--helped')));
    else if (cmd === 'words') show(addWords(a[0], a.slice(1)));
    else if (cmd === 'queue') show(queue(a[0] || 'list', a[1], flag(a, 'context')));
    else if (cmd === 'status') show(status());
    else if (cmd === 'tool' && a[0] === 'add') show(toolAdd(a[1], { where: flag(a, 'where'), kind: flag(a, 'kind'), how: flag(a, 'how') }));
    else if (cmd === 'tool') show(toolFind(a.slice(a[0] === 'find' ? 1 : 0)));
    else { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 11).map(l => l.replace(/^\/\/ ?/, '')).join('\n')); process.exitCode = cmd ? 1 : 0; }
  } catch (e) { console.error(`vault: ${e.message}`); process.exitCode = 1; }
}
