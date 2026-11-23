#!/usr/bin/env node
// /improve delivery timer: the owner sets a think time; the prompt must land at that time +-5 s.
// Clock starts when the owner's message arrived (prompt-router saves it in .claude/.session/<sid>.json `t`),
// so time spent before the first tool call counts too.
//   node scripts/improve-timer.mjs start <seconds> [--now]   start (or restart) the budget
//   node scripts/improve-timer.mjs left                      elapsed / left / phase advice
//   node scripts/improve-timer.mjs done                      final elapsed and PASS/FAIL against +-5 s
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'state', `.improve-timer${process.env.IMPROVE_TIMER_ID ? '-' + process.env.IMPROVE_TIMER_ID.replace(/[^\w-]/g, '') : ''}.json`);
// Sonnet expansion grows with the brief: measured 2026-11-23 viking-helmet test (30s 16.9, 60s 19.6, 120s 23.9, 240s 27.1);
// any budget the owner types is interpolated between these points (owner: no fixed levels).
const PTS = [[15, 16], [30, 17], [60, 20], [120, 24], [240, 28], [600, 32]]
const sonnetFor = (b) => {
  if (b <= 15) return 0
  for (let i = 1; i < PTS.length; i++) if (b <= PTS[i][0]) { const [x0, y0] = PTS[i - 1], [x1, y1] = PTS[i]; return Math.round(y0 + (y1 - y0) * (b - x0) / (x1 - x0)) }
  return PTS[PTS.length - 1][1]
}
const TOL = 5;

function promptArrival() {
  const dir = join(ROOT, '.claude', '.session');
  try {
    const f = readdirSync(dir).filter(n => n.endsWith('.json'))
      .map(n => ({ n, m: statSync(join(dir, n)).mtimeMs })).sort((a, b) => b.m - a.m)[0];
    const t = JSON.parse(readFileSync(join(dir, f.n), 'utf8')).t;
    if (t && Date.now() - t < 120000) return t; // only a prompt from the last 2 min
  } catch { /* no hook state: fall back to now */ }
  return Date.now();
}

const [cmd, arg, flag] = process.argv.slice(2);
const now = Date.now();
if (cmd === 'start') {
  const budget = Number(arg);
  if (!(budget > 0)) { console.error('usage: start <seconds>'); process.exit(2); }
  const t0 = flag === '--now' ? now : promptArrival();
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify({ t0, budget }));
  const brief = budget - sonnetFor(budget);
  console.log(JSON.stringify({ budget, elapsed: +((now - t0) / 1000).toFixed(1), sonnet: sonnetFor(budget),
    send_brief_at: brief, note: budget <= 15 ? 'quick: write the outline yourself, no Sonnet' : `spawn Sonnet at ${brief}s` }));
} else if (cmd === 'left' || cmd === 'done') {
  let s;
  try { s = JSON.parse(readFileSync(FILE, 'utf8')); } catch { console.error('no timer: run start first'); process.exit(2); }
  const el = (now - s.t0) / 1000;
  const sendAt = s.budget - sonnetFor(s.budget);
  if (cmd === 'left') {
    console.log(JSON.stringify({ elapsed: +el.toFixed(1), budget: s.budget, left: +(s.budget - el).toFixed(1),
      brief_left: +(sendAt - el).toFixed(1), advice: el < sendAt - 8 ? 'keep researching/checking' : el < sendAt ? 'write the brief now' : 'send now' }));
  } else {
    const off = el - s.budget;
    console.log(JSON.stringify({ elapsed: +el.toFixed(1), budget: s.budget, off: +off.toFixed(1), result: Math.abs(off) <= TOL ? 'PASS' : 'FAIL' }));
    process.exit(Math.abs(off) <= TOL ? 0 : 1);
  }
} else {
  console.error('usage: start <seconds> [--now] | left | done');
  process.exit(2);
}
