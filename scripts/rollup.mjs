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

// Move archive/metrics.jsonl rows from past months into archive/metrics-YYYY-MM.md summaries. Idempotent.
export function rollupMetrics(root = ROOT, now = today()) {
  const path = join(root, 'archive', 'metrics.jsonl');
  const lines = readIf(path).split('\n').filter(Boolean);
  const month = now.slice(0, 7), keep = [], old = {};
  for (const l of lines) {
    let r; try { r = JSON.parse(l); } catch { continue; }
    const m = String(r.t || '').slice(0, 7);
    if (m && m < month) (old[m] ||= []).push(r); else keep.push(l);
  }
  const moved = Object.keys(old).sort();
  for (const m of moved) {
    const rows = old[m], n = rows.length;
    const avg = (t) => { const x = rows.filter(r => r.tier === t); return x.length ? `${t} ${Math.round(x.reduce((s, r) => s + r.secs, 0) / x.length)}s (${x.length})` : null; };
    const bad = {};
    for (const r of rows) if (!r.ok || r.errors || (r.signals || []).length) for (const d of (r.routes?.length ? r.routes : ['unrouted'])) bad[d] = (bad[d] || 0) + 1;
    appendFileSync(join(root, 'archive', `metrics-${m}.md`), `# Metrics ${m}\n- turns: ${n}; on target: ${Math.round(100 * rows.filter(r => r.ok).length / n)}%\n` +
      `- avg: ${['simple', 'medium', 'complex'].map(avg).filter(Boolean).join(', ')}\n- tool errors: ${rows.reduce((s, r) => s + (r.errors || 0), 0)}; owner corrections: ${rows.filter(r => (r.signals || []).includes('correction')).length}\n` +
      `- weakest routes: ${Object.entries(bad).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([d, c]) => `${d} (${c})`).join(', ') || 'none'}\n\n`);
  }
  if (moved.length) writeFileSync(path, keep.length ? keep.join('\n') + '\n' : '');
  return moved;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const moved = rollup(), metrics = rollupMetrics();
  console.log(moved.length ? `rollup: archived log ${moved.join(', ')}` : 'rollup: no old log months');
  console.log(metrics.length ? `rollup: summarised metrics ${metrics.join(', ')}` : 'rollup: no old metric months');
}
