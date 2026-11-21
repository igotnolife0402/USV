#!/usr/bin/env node
// Move log.md sections older than the current month into archive/log-YYYY-MM.md. Idempotent.
import { writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, readIf, today } from '../hooks/lib.mjs';

export function rollup(root = ROOT, now = today()) {
  const logPath = join(root, 'log.md');
  const text = readIf(logPath).replace(/\r\n/g, '\n');
  if (!text) return [];
  const month = now.slice(0, 7);
  const blocks = text.split(/^(?=## )/m);
  const head = [], keep = [], old = {}, pointers = new Set();
  for (const b of blocks) {
    const date = b.match(/^## \[(\d{4}-\d{2})-\d{2}\]/)?.[1];
    if (/^## Archived months/.test(b)) b.split('\n').filter(l => l.startsWith('- ')).forEach(l => pointers.add(l.trim()));
    else if (!date) (keep.length ? keep : head).push(b);
    else if (date < month) (old[date] ||= []).push(b.replace(/\n*$/, '\n\n'));
    else keep.push(b);
  }
  const moved = Object.keys(old).sort();
  if (!moved.length) return [];
  mkdirSync(join(root, 'archive'), { recursive: true });
  for (const m of moved) {
    const f = join(root, 'archive', `log-${m}.md`);
    if (!existsSync(f)) writeFileSync(f, `# Log ${m}\n\n`);
    appendFileSync(f, old[m].join(''));
    pointers.add(`- ${m}: [archive/log-${m}.md](archive/log-${m}.md)`);
  }
  const arch = `## Archived months\n${[...pointers].sort().join('\n')}\n\n`;
  const out = head.join('').replace(/\n*$/, '\n\n') + arch + keep.join('');
  writeFileSync(logPath, out.replace(/\n*$/, '\n'));
  return moved;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const moved = rollup();
  console.log(moved.length ? `rollup: archived ${moved.join(', ')}` : 'rollup: nothing to archive');
}
