import { join } from 'node:path';
import { ROOT, readInput, emit, safe, getMode, setMode, readIf, fm, MODE_CMD } from './lib.mjs';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hit = (text, word) => new RegExp(`(^|[^\\w])${esc(word)}($|[^\\w])`, 'i').test(text);

const SIMPLE_FIX = ['typo', 'fix typo', 'rename', 'quick'];
// Sub-agent reports, task notifications and pasted logs are not task requests: never tier them by their words.
const REPORT = /<task-notification>|<command-message>|^\s*(RATING:|STOLEN:|Traceback \(most recent|at \S+ \(.*:\d+:\d+\)|npm ERR!|\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2})/m;
export const looksLikeReport = (p) => REPORT.test(p) || p.split('\n').length > 40;

export function classify(prompt, tiers = {}) {
  if (looksLikeReport(prompt)) return 'medium';
  if (prompt.length < 200 && [...SIMPLE_FIX, ...(tiers.simple || [])].some(w => hit(prompt, w))) return 'simple';
  if ((tiers.complex || []).some(w => hit(prompt, w)) || prompt.length > 4000) return 'complex';
  return 'medium';
}

// System/agent relays (hand-backs, notifications) are not owner tasks: no tier, no routes.
const RELAY = /<agent-message|<task-notification|\[SYSTEM NOTIFICATION|Subagent hand-back/i;

// Top 2 routes by distinct word hits (ties: earlier route), so at most 2 checklists, 2 skills, 4 notes.
function route(prompt, router = {}) {
  return (router.routes || [])
    .map((r, i) => ({ r, i, n: new Set((r.words || []).filter(w => hit(prompt, w)).map(w => w.toLowerCase())).size }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n || a.i - b.i).slice(0, 2).map(x => x.r);
}

const TARGET = { simple: '<1 min', medium: '<5 min', complex: '<30 min' };

function buildContext(prompt, mode, router) {
  if (RELAY.test(prompt)) return `MODE=${mode}`;
  const tier = classify(prompt, router.tiers);
  const lines = [`MODE=${mode} | TIER=${tier} (target: ${TARGET[tier]})`];
  const routes = route(prompt, router);
  if (routes.length) {
    const uniq = (a) => [...new Set(a.filter(Boolean))];
    const paths = uniq(routes.flatMap(r => r.notes || [])).slice(0, 4);
    const notes = paths.map(n => {
      const s = fm(readIf(join(ROOT, n))).data?.summary;
      return s ? `${n} (${s})` : n;
    });
    lines.push(`Checklist: ${uniq(routes.map(r => r.checklist)).join(', ')}`);
    lines.push(`Skill: ${uniq(routes.map(r => r.skill)).join(', ')}`);
    lines.push(`Read first: ${notes.join('; ')}`);
    lines.push('Before working: state in one line which of these apply, read them, then work. Mobile: never call PC-only tools; use the fallback and append PC-only steps to queue/pc.md.');
  }
  return lines.join('\n').slice(0, 1500);
}

safe(() => {
  const { prompt = '', session_id } = readInput();
  const m = String(prompt).match(MODE_CMD);
  // A phone cloud session can't become PC: /pc there is ignored (stays mobile).
  if (m && !(m[1].toLowerCase() === 'pc' && process.env.CLAUDE_CODE_REMOTE === 'true')) setMode(m[1].toLowerCase(), session_id);
  let router = {};
  try { router = JSON.parse(readIf(join(ROOT, 'router.json')) || '{}'); } catch { /* bad router: lint reports it */ }
  const ctx = buildContext(String(prompt), getMode(session_id).mode, router);
  emit({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ctx } });
});
