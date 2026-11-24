import { join } from 'node:path';
import { ROOT, readInput, emit, safe, getMode, setMode, readIf, fm, MODE_CMD, isMain } from './lib.mjs';
import { saveTurnState, CORRECTION } from './learn.mjs';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hit = (text, word) => new RegExp(`(^|[^\\w])${esc(word)}($|[^\\w])`, 'i').test(text);

const SIMPLE_FIX = ['typo', 'fix typo', 'rename', 'quick'];
// Sub-agent reports, task notifications and pasted logs are not task requests: never tier them by their words.
const REPORT = /<task-notification>|<command-message>|^\s*(RATING:|STOLEN:|Traceback \(most recent|at \S+ \(.*:\d+:\d+\)|npm ERR!|\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2})/m;
export const looksLikeReport = (p) => REPORT.test(p) || p.split('\n').length > 40;

export function classify(prompt, tiers = {}) {
  if (looksLikeReport(prompt)) return 'medium';
  if (CORRECTION.test(prompt) || /\b(you (still )?didn'?t|you never|still (didn'?t|not))\b/i.test(prompt)) return 'medium'; // owner complaints need fixes, never "simple"
  if (prompt.length < 200 && [...SIMPLE_FIX, ...(tiers.simple || [])].some(w => hit(prompt, w))) return 'simple';
  if ((tiers.complex || []).some(w => hit(prompt, w)) || prompt.length > 4000) return 'complex';
  return 'medium';
}

// System/agent relays (hand-backs, notifications) are not owner tasks: no tier, no routes.
export const RELAY = /<agent-message|<task-notification|\[SYSTEM NOTIFICATION|Subagent hand-back/i;

// Top 2 routes by distinct word hits (ties: earlier route), so at most 2 checklists, 2 skills, 4 notes.
export function route(prompt, router = {}) {
  return (router.routes || [])
    .map((r, i) => ({ r, i, n: new Set((r.words || []).filter(w => hit(prompt, w)).map(w => w.toLowerCase())).size }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n || a.i - b.i).slice(0, 2).map(x => x.r);
}

// Fast path: a route's `fast` entry whose words hit replaces the generic notes/skill with the exact files to open.
export function fastPath(prompt, routes = []) {
  for (const r of routes) for (const f of r.fast || []) if ((f.words || []).some(w => hit(prompt, w))) return f;
  return null;
}
export const skillsFor = (prompt, routes) => { const f = fastPath(prompt, routes); return [...new Set((f && 'skill' in f ? [f.skill] : routes.map(r => r.skill)).filter(Boolean))]; };

const TARGET = { simple: 'goal 15 s, limit 1 min', medium: 'goal 75 s, limit 5 min', complex: 'goal 7.5 min, limit 30 min' };   // owner 2026-11-24: limit is absolute, goal = limit/4

const BUILD = /\b(make|build|create|model|design|generate|remake|redo|add)\b/i;
const must = () => (readIf(join(ROOT, 'profiles/must.md')) || '').replace(/^---[\s\S]*?---\s*/, '').trim();
function buildContext(prompt, mode, router) {
  if (RELAY.test(prompt)) return `MODE=${mode}`;
  const tier = classify(prompt, router.tiers);
  const lines = [`MODE=${mode} | TIER=${tier} (${TARGET[tier]})`];
  const routes = route(prompt, router);
  if (routes.length) {
    const uniq = (a) => [...new Set(a.filter(Boolean))];
    const f = fastPath(prompt, routes);
    const paths = f ? f.read || [] : uniq(routes.flatMap(r => r.notes || [])).slice(0, 4);
    const notes = paths.map(n => {
      const s = fm(readIf(join(ROOT, n))).data?.summary;
      return s ? `${n} (${s})` : n;
    });
    lines.push(`Checklist: ${uniq(routes.map(r => r.checklist)).join(', ')}`);
    const sk = skillsFor(prompt, routes);
    if (f) lines.push(`FAST PATH (open only these, skip index/playbook/tool tables): ${f.do}`);
    if (sk.length) lines.push(`Skill: ${sk.join(', ')} (invoke first with the Skill tool for any build/edit; the Stop hook checks)`);
    lines.push(`Read first: ${notes.join('; ')}`);
    lines.push('Before working: state in one line which of these apply, read them, then work. Mobile: never call PC-only tools; use the fallback and append PC-only steps to queue/pc.md.');
  }
  if (BUILD.test(prompt) || routes.some(r => r.id !== 'vault')) {
    if (!routes.length) lines.push('NO ROUTE: run `node scripts/vault.mjs find <main noun>`, then read that domain playbook + checklist before building.');
    lines.push(must());
  }
  return lines.join('\n').slice(0, 3000);
}

if (isMain(import.meta.url)) safe(() => {
  const { prompt = '', session_id } = readInput();
  const m = String(prompt).match(MODE_CMD);
  // A phone cloud session can't become PC: /pc there is ignored (stays mobile).
  if (m && !(m[1].toLowerCase() === 'pc' && process.env.CLAUDE_CODE_REMOTE === 'true')) setMode(m[1].toLowerCase(), session_id);
  let router = {};
  try { router = JSON.parse(readIf(join(ROOT, 'router.json')) || '{}'); } catch { /* bad router: lint reports it */ }
  const text = String(prompt);
  const ctx = buildContext(text, getMode(session_id).mode, router);
  // Tier + routes for the Stop hook's learning check (relays don't overwrite the owner's turn).
  if (!RELAY.test(text)) saveTurnState(session_id, { tier: classify(text, router.tiers), routes: route(text, router).map(r => r.id), skills: skillsFor(text, route(text, router)), t: Date.now() });
  emit({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ctx } });
});
