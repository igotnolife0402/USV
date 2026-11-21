import { join } from 'node:path';
import { ROOT, readInput, emit, safe, getMode, setMode, readIf, fm } from './lib.mjs';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hit = (text, word) => new RegExp(`(^|[^\\w])${esc(word)}($|[^\\w])`, 'i').test(text);

function classify(prompt, tiers = {}) {
  if ((tiers.complex || []).some(w => hit(prompt, w)) || prompt.length > 600) return 'complex';
  if ((tiers.simple || []).some(w => hit(prompt, w)) && prompt.length < 200) return 'simple';
  return 'medium';
}

function route(prompt, router = {}) {
  return (router.routes || []).filter(r => (r.words || []).some(w => hit(prompt, w)));
}

const TARGET = { simple: '<1 min', medium: '<5 min', complex: '<30 min' };

function buildContext(prompt, mode, router) {
  const tier = classify(prompt, router.tiers);
  const lines = [`MODE=${mode} | TIER=${tier} (target: ${TARGET[tier]})`];
  const routes = route(prompt, router);
  if (routes.length) {
    const uniq = (a) => [...new Set(a.filter(Boolean))];
    const notes = uniq(routes.flatMap(r => r.notes || [])).map(n => {
      const s = fm(readIf(join(ROOT, n))).data?.summary;
      return s ? `${n} (${s})` : n;
    });
    lines.push(`Read first: ${notes.join('; ')}`);
    lines.push(`Checklist: ${uniq(routes.map(r => r.checklist)).join(', ')}`);
    lines.push(`Skill: ${uniq(routes.map(r => r.skill)).join(', ')}`);
    lines.push('Before working: state in one line which of these apply, read them, then work. Mobile: never call PC-only tools; use the fallback and append PC-only steps to queue/pc.md.');
  }
  return lines.join('\n').slice(0, 1500);
}

safe(() => {
  const { prompt = '', session_id } = readInput();
  const m = prompt.trim().match(/^\/(pc|mobile)\b/i);
  if (m) setMode(m[1].toLowerCase(), session_id);
  let router = {};
  try { router = JSON.parse(readIf(join(ROOT, 'router.json')) || '{}'); } catch { /* bad router: lint reports it */ }
  const ctx = buildContext(prompt, getMode(session_id).mode, router);
  emit({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ctx } });
});
