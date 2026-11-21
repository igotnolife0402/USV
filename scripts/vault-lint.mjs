#!/usr/bin/env node
// Vault lint: frontmatter, size caps, links, JSON. Usage: node scripts/vault-lint.mjs --all | <files...>
import { readdirSync, existsSync } from 'node:fs';
import { join, resolve, relative, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, readIf, fm, today } from '../hooks/lib.mjs';
import { repoCheck, listFiles } from './repo-check.mjs';

const SKIP = /(^|\/)(node_modules|\.git|archive|\.worktrees)(\/|$)/;
const NOT_NOTE = /^(CLAUDE\.md|CLAUDE\.local\.md.*|log\.md|archive\/.*|\.orchestration\/.*|\.github\/.*|\.claude\/.*)$|(^|\/)README\.md$/;
export const isNote = (rel) => !NOT_NOTE.test(rel) && (/^(domains|profiles|checklists)\/.*\.md$/.test(rel) || ['index.md', 'lessons.md', 'queue/pc.md'].includes(rel));
const relOf = (p, root) => relative(root, resolve(root, p)).replace(/\\/g, '/');

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}

function exists(target, fromDir, root) {
  for (const base of [fromDir, root]) {
    const p = resolve(base, target);
    if (existsSync(p) || existsSync(p + '.md')) return true;
  }
  return false;
}

function lintMarkdown(rel, text, root, out) {
  const add = (msg, level = 'error', line) => out.push({ file: rel, ...(line ? { line } : {}), msg, level });
  const lines = text.split(/\r?\n/);
  const n = lines.length - (lines.at(-1) === '' ? 1 : 0);
  const name = basename(rel);
  const { data, end } = fm(text);

  if (rel === 'CLAUDE.md' && n > 200) add(`CLAUDE.md has ${n} lines (cap 200)`);
  if (rel === 'index.md' && n > 150) add(`index.md has ${n} lines (cap 150)`);

  if (name === 'SKILL.md') {
    if (n > 500) add(`SKILL.md has ${n} lines (cap 500)`);
    if (!data?.name) add('SKILL.md frontmatter missing name');
    if (!data?.description) add('SKILL.md frontmatter missing description');
    else if (data.description.length > 300) add(`SKILL.md description is ${data.description.length} chars (cap 300)`);
  }

  if (isNote(rel)) {
    if (rel !== 'index.md') {
      if (n > 200) add(`note has ${n} lines (cap 200): split it`);
      else if (n > 150) add(`note has ${n} lines (warn > 150)`, 'warn');
    }
    if (!data) add('missing frontmatter (summary, updated, status)', 'error', 1);
    else {
      if (!data.summary) add('frontmatter missing summary', 'error', 1);
      else if (String(data.summary).length > 140) add(`summary is ${String(data.summary).length} chars (cap 140)`, 'error', 1);
      if (!validDate(data.updated)) add(`updated "${data.updated ?? ''}" is not a valid YYYY-MM-DD date`, 'error', 1);
      else if (data.updated > today(new Date(Date.now() + 864e5))) add(`updated ${data.updated} is in the future`, 'error', 1);
      if (!['current', 'superseded'].includes(data.status)) add(`status "${data.status ?? ''}" must be current or superseded`, 'error', 1);
      if (data.status === 'superseded' && !data.superseded_by) add('superseded note needs superseded_by', 'error', 1);
    }
  }

  // Links: ignore fenced code blocks and inline code.
  const dir = dirname(resolve(root, rel));
  let fence = false;
  lines.forEach((raw, i) => {
    if (i < end) return;
    if (/^\s*(```|~~~)/.test(raw)) { fence = !fence; return; }
    if (fence) return;
    const l = raw.replace(/`[^`]*`/g, '');
    const targets = [];
    for (const m of l.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) targets.push(m[1]);
    for (const m of l.matchAll(/\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) if (m[1].trim()) targets.push(m[1].trim());
    for (const t of targets) {
      if (/^(https?:|mailto:|#)/i.test(t)) continue;
      let p = t.split('#')[0];
      try { p = decodeURIComponent(p); } catch { /* keep raw */ }
      if (p && !exists(p, dir, root)) add(`broken link: ${t}`, 'error', i + 1);
    }
  });
}

function lintJson(rel, text, root, out) {
  let j;
  try { j = JSON.parse(text); } catch (e) { return out.push({ file: rel, msg: `invalid JSON: ${e.message}`, level: 'error' }); }
  if (rel === 'router.json') {
    for (const r of j.routes || []) for (const p of [...(r.notes || []), r.checklist].filter(Boolean))
      if (!existsSync(join(root, p))) out.push({ file: rel, msg: `route ${r.id}: path not found: ${p}`, level: 'error' });
  }
}

export function lintFiles(paths, root = ROOT) {
  const out = [];
  for (const p of paths) {
    const rel = relOf(p, root);
    if (SKIP.test(rel)) continue;
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const text = readIf(abs);
    if (/\.md$/i.test(rel)) lintMarkdown(rel, text, root, out);
    else if (rel === 'router.json' || rel === 'hooks/modes.json') lintJson(rel, text, root, out);
  }
  return out;
}

export function lintAll(root = ROOT) {
  // git-tracked + untracked-not-ignored files (gitignored output is never linted); falls back to a walk outside git.
  const all = listFiles(root).filter(f => !SKIP.test(f));
  const files = all.filter(f => f.endsWith('.md'));
  for (const j of ['router.json', 'hooks/modes.json']) if (existsSync(join(root, j))) files.push(j);
  return [...lintFiles(files, root), ...repoCheck(root, all)];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const t0 = Date.now();
  const res = args.includes('--all') || !args.length ? lintAll() : lintFiles(args);
  for (const r of res) console.log(`${r.file}:${r.line ?? 0} ${r.level} ${r.msg}`);
  const errs = res.filter(r => r.level === 'error').length;
  console.log(`vault-lint: ${errs} error(s), ${res.length - errs} warning(s), ${Date.now() - t0} ms`);
  process.exit(errs ? 1 : 0);
}
