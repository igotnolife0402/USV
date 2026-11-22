#!/usr/bin/env node
// Builds one catalog per style: tools/3d/styles/<style>.md, from the `# @style/@model/@run`
// tags at the top of every tools/3d/**/*.py. New style tag value = new file on the next run.
// Usage: node tools/3d/styles/build.mjs [--check]   (--check exits 1 if a .py has no @style tag)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);                  // tools/3d
const REPO = path.dirname(path.dirname(ROOT));
const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === '__pycache__' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (p !== HERE) walk(p, out); } else if (e.name.endsWith('.py')) out.push(p);
  }
  return out;
}

const styles = new Map();   // style -> [entry]
const untagged = [];
for (const file of walk(ROOT).sort()) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const tag = (k) => (lines.slice(0, 40).find((l) => l.startsWith(`# @${k}:`)) || '').slice(k.length + 4).trim();
  const style = tag('style');
  if (!style) { untagged.push(rel(file)); continue; }
  // quick-look API: top-level defs/classes with line numbers, and top-level UPPER constants (sizes, colors)
  const api = [], consts = [];
  lines.forEach((l, i) => {
    let m;
    if ((m = l.match(/^(def|class)\s+(\w+)\s*(\([^)]*\)?)/))) { if (!m[2].startsWith('_') && m[2].length > 2) api.push(`L${i + 1} ${m[1]} ${m[2]}${m[3] || ''}`); }
    else if ((m = l.match(/^([A-Z][A-Z0-9_]{2,})\s*=\s*(.+)$/))) consts.push(`L${i + 1} ${m[1]} = ${m[2].slice(0, 90)}`);
  });
  const entry = { file: rel(file), n: lines.length, model: tag('model'), run: tag('run'), api, consts };
  for (const s of style.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)) {
    if (!styles.has(s)) styles.set(s, []);
    styles.get(s).push(entry);
  }
}

if (process.argv.includes('--check')) {
  if (untagged.length) { console.error(`untagged (add # @style: ...):\n  ${untagged.join('\n  ')}`); process.exit(1); }
}

const today = new Date().toISOString().slice(0, 10);
const written = [];
for (const [style, entries] of [...styles].sort()) {
  const body = entries.map((e) => [
    `## ${e.model || path.basename(e.file)}`,
    `- file: \`${e.file}\` (${e.n} lines)${e.run ? `\n- run: \`${e.run}\`` : ''}`,
    e.api.length ? `- api:\n${e.api.map((a) => `  - ${a}`).join('\n')}` : '',
    e.consts.length ? `- constants:\n${e.consts.slice(0, 12).map((c) => `  - \`${c}\``).join('\n')}${e.consts.length > 12 ? `\n  - ...${e.consts.length - 12} more` : ''}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');
  const md = `---\nsummary: Every ${style} model template in tools/3d in one file: what, run command, functions and constants with line numbers. Generated; do not edit.\nupdated: ${today}\nstatus: current\n---\n# ${style} models (${entries.length})\nRead this file instead of opening templates. Then read only the line range you copy. Regenerate: \`node tools/3d/styles/build.mjs\`.\n\n${body}\n`;
  fs.writeFileSync(path.join(HERE, `${style}.md`), md);
  written.push(`${style}.md (${entries.length})`);
}
for (const f of fs.readdirSync(HERE)) if (f.endsWith('.md') && !styles.has(f.slice(0, -3))) fs.unlinkSync(path.join(HERE, f)); // style gone = catalog gone
console.log(`wrote ${written.join(', ')}${untagged.length ? ` | untagged: ${untagged.length}` : ''}`);
