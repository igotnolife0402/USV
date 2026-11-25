// Auto-learning: read the current turn from the transcript, find failures / slowness / owner corrections /
// router misses, keep per-turn metrics, and tell the Stop hook what must be learned before stopping.
import { openSync, readSync, closeSync, fstatSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';
import { ROOT, readIf, today } from './lib.mjs';

export const TARGET_S = { simple: 60, medium: 300, complex: 1800 };
export const METRICS = 'archive/metrics.jsonl';
const RELAY = /<agent-message|<task-notification|\[SYSTEM NOTIFICATION|Subagent hand-back/i;
// The owner says the last result was bad. Short prompts only (pasted logs are not corrections).
// Phrased as a complaint about the last result, so task descriptions ("make it learn from errors") don't trigger it.
export const CORRECTION = /\b(still (broken|wrong|not working|failing|slow|bad|ugly)|(does|did|is) ?n[o']t work(ing)?|not working|(it'?s|it is|that'?s|that is|this is|was|looks|went) (wrong|broken|bad|ugly)|not what i (asked|wanted|said|meant)|you (missed|forgot|broke|ignored|skipped)|try again|redo (it|this|that)|(it|you) broke|took (way )?too long|too slow|so slow|fix (it|this|that) again|undo (it|this|that)|revert (it|this|that))\b/i;
// Tool errors that are normal search misses or expected guard denials, not failures.
const NOISE = /no (matches|files?) found|MOBILE MODE|3-try cap|user (doesn't|does not) want|rejected by the user|interrupted by user/i;

// Last `max` bytes of a file as lines (transcripts can be large; a turn is near the end).
export function readTail(path, max = 3_000_000) {
  try {
    const fd = openSync(path, 'r');
    const size = fstatSync(fd).size, len = Math.min(size, max), buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, size - len); closeSync(fd);
    const lines = buf.toString('utf8').split('\n');
    if (len < size) lines.shift(); // partial first line
    return lines;
  } catch { return []; }
}

const textOf = (c) => typeof c === 'string' ? c
  : Array.isArray(c) && c.length && c.every(b => b?.type === 'text') ? c.map(b => b.text).join('\n') : null;
const resultText = (b) => (typeof b.content === 'string' ? b.content
  : Array.isArray(b.content) ? b.content.map(x => x?.text || '').join(' ') : '').replace(/\s+/g, ' ').trim();
const keyOf = (name, input = {}) => `${name}:${input.command ?? input.file_path ?? JSON.stringify(input).slice(0, 200)}`;

// One turn = everything after the last user text message. Returns facts about it.
export function parseTurn(lines) {
  const E = [];
  for (const l of lines) { if (!l) continue; try { E.push(JSON.parse(l)); } catch { /* partial */ } }
  let start = -1;
  for (let i = E.length - 1; i >= 0; i--) {
    const e = E[i];
    if (e.type === 'user' && !e.isMeta && textOf(e.message?.content) !== null) { start = i; break; }
  }
  const prompt = start >= 0 ? textOf(E[start].message.content) : '';
  const t0 = start >= 0 ? Date.parse(E[start].timestamp) : NaN;
  let tEnd = t0;
  const uses = new Map(), errors = [], fails = new Map(), reads = new Set(), writes = new Set(), skills = new Set();
  let firstAgent = NaN, firstSend = NaN;
  let lastText = '', lastErr = false; // final reply + whether the last tool result was a real failure
  for (const m of String(prompt).matchAll(/<command-name>\s*\/?([\w:-]+)/g)) skills.add(m[1].split(':').pop()); // slash command
  for (const e of E.slice(start + 1)) {
    const ts = Date.parse(e.timestamp); if (ts > tEnd) tEnd = ts;
    const c = e.message?.content; if (!Array.isArray(c)) continue;
    for (const b of c) {
      if (b?.type === 'text' && e.type === 'assistant' && b.text?.trim()) lastText = b.text;
      if (b?.type === 'tool_result') lastErr = !!b.is_error && !NOISE.test(resultText(b)) && !/^(Grep|Glob)$/.test(uses.get(b.tool_use_id)?.name || '');
      if (b?.type === 'tool_use') {
        uses.set(b.id, { name: b.name, input: b.input || {} });
        if (b.name === 'Agent' && Number.isNaN(firstAgent)) firstAgent = ts;
        if (b.name === 'SendMessage' && Number.isNaN(firstSend)) firstSend = ts;
        const p = String(b.input?.file_path || b.input?.notebook_path || '').replace(/\\/g, '/');
        if (b.name === 'Read' && p) reads.add(p);
        if (b.name === 'Skill' && b.input?.skill) skills.add(String(b.input.skill).split(':').pop());
        const sk = p.match(/\.claude\/skills\/([\w-]+)\/SKILL\.md$/); if (b.name === 'Read' && sk) skills.add(sk[1]);
        if (/^(Write|Edit|MultiEdit)$/.test(b.name) && p) writes.add(p);
      } else if (b?.type === 'tool_result' && b.is_error) {
        const u = uses.get(b.tool_use_id) || { name: '?', input: {} };
        const text = resultText(b);
        if (NOISE.test(text) || /^(Grep|Glob)$/.test(u.name)) continue;
        errors.push({ tool: u.name, what: String(u.input.command || u.input.file_path || u.input.description || '').slice(0, 120), text: text.slice(0, 200) });
        const k = keyOf(u.name, u.input); fails.set(k, (fails.get(k) || 0) + 1);
      }
    }
  }
  return {
    prompt, relay: RELAY.test(prompt), t0, secs: Number.isFinite(t0) ? Math.round((Math.max(tEnd, t0) - t0) / 1000) : 0,
    errors, fails, maxRetry: Math.max(0, ...fails.values()), reads: [...reads], writes: [...writes], skills: [...skills], lastText, lastErr,
    agentSecs: Number.isFinite(firstAgent) ? Math.round((firstAgent - t0) / 1000) : null, specSecs: Number.isFinite(firstSend) && Number.isFinite(firstAgent) ? Math.round((firstSend - firstAgent) / 1000) : null,
  };
}

const rel = (p) => (isAbsolute(p) ? relative(ROOT, p) : p).replace(/\\/g, '/').replace(/^\.\//, '');
export const domainsOf = (paths) => [...new Set(paths.map(p => rel(p).match(/^domains\/([a-z0-9-]+)\//)?.[1]).filter(Boolean))];

// Turn facts + router state -> list of signals worth a lesson.
export function improvedCount(logText = '', label = 'improved') {
  const last = String(logText).split(/\n(?=## \[)/).pop() || '';
  // `Fixed: a, b, c` (or `;`) on one line, or the label followed by a numbered/bulleted list. label = regex alternation.
  const m = last.match(new RegExp(`^(?:${label}):[ \\t]*(.*)((?:\\n[ \\t]*(?:\\d+[.)]|[-*])[ \\t]+.+)*)`, 'im'));
  if (!m) return 0;
  const inline = m[1].split(/[;,]/).map(s => s.trim()).filter(Boolean).length;
  const listed = (m[2].match(/\n[ \t]*(?:\d+[.)]|[-*])[ \t]+\S/g) || []).length;
  return inline + listed;
}
export function signals(turn, state = {}, extra = {}) {
  const out = [];
  if (turn.relay) return out; // agent/system relays are not owner tasks
  const tier = state.tier || 'medium';
  // Any real error counts, on any task however small (pictures, models, math, vault upkeep).
  if (turn.errors.length >= 1)
    out.push({ kind: 'errors', text: `${turn.errors.length} tool error(s), worst retry x${turn.maxRetry}: ${turn.errors.slice(0, 3).map(e => `${e.tool} \`${e.what}\` → ${e.text}`).join(' | ')}` });
  const target = TARGET_S[tier];
  if (target && turn.secs > target) out.push({ kind: 'slow', text: `took ${turn.secs}s vs ${tier} target ${target}s` });
  if ((turn.skills || []).includes('crew') && turn.agentSecs != null && turn.agentSecs > 30) out.push({ kind: 'slow', text: `crew spawned workers ${turn.agentSecs}s after the prompt (cap 30s)` });
  if ((turn.skills || []).includes('crew') && turn.specSecs != null && turn.specSecs > 90) out.push({ kind: 'slow', text: `crew sent build specs ${turn.specSecs}s after spawning (cap 90s): brain worked alone` });
  if (turn.prompt.length < 1500 && CORRECTION.test(turn.prompt))
    out.push({ kind: 'correction', text: `owner said: "${turn.prompt.replace(/\s+/g, ' ').slice(0, 120)}"` });
  // Skill miss: the router named a skill for real work (files were written) but it was never invoked or read.
  // Writes only to vault plumbing (hooks, scripts, notes, router...) are vault work, not a domain build.
  const VAULT_META = /^(hooks|scripts|tests|profiles|checklists|queue|state|archive|\.claude|\.orchestration|\.github)\/|^(CLAUDE\.md|index\.md|lessons\.md|log\.md|router\.json)$/;
  const builds = turn.writes.filter(p => !VAULT_META.test(rel(p)));
  // An owner-invoked orchestration skill (/crew, /swarm, /helpers) replaces the routed skill (L-082): no skill miss then.
  const ownerSkill = ['crew', 'swarm', 'helpers'].some(s => (turn.skills || []).includes(s));
  const missedSkills = tier !== 'simple' && builds.length && !ownerSkill ? (state.skills || []).filter(s => !(turn.skills || []).includes(s)) : [];
  if (missedSkills.length)
    out.push({ kind: 'skill', text: `router named skill ${missedSkills.join(', ')} but it was not used`, skills: missedSkills });
  const routed = new Set(state.routes || []);
  const missed = domainsOf(turn.reads).filter(d => !routed.has(d));
  // Vault upkeep legitimately reads many domains; a miss is 1-2 unrouted domains on a non-vault task.
  if (missed.length && missed.length <= 2 && !routed.has('vault'))
    out.push({ kind: 'router', text: `read domains/${missed.join(', domains/')} but the prompt routed to ${[...routed].join(', ') || 'nothing'}`, domains: missed });
  // Honesty: the reply claims success while the last tool call failed (owner rule: never claim done unless checked).
  if (turn.lastErr && CLAIM.test(turn.lastText || '') && !ADMIT.test(turn.lastText || ''))
    out.push({ kind: 'honesty', text: 'the final reply claims success but the last tool call failed' });
  // Always improve (owner 2026-11-22): every task, any size, finds and fixes >= 3 real problems, logged as `improved: a; b; c`.
  // A contentless prompt (".", "?") with no tool work is a nudge, not a task: nothing to improve (owner 2026-11-25).
  const idle = !/[\p{L}\p{N}]/u.test(turn.prompt) && !turn.writes.length && !turn.errors.length;
  const imp = idle ? null : extra.improved; // null = not measured (unit calls / idle nudges); the Stop hooks always pass a number
  if (imp != null && imp < 3) out.push({ kind: 'improve', text: `${imp}/3 improvements logged` });
  // ...and the owner must be told them: the final reply lists them too (owner 2026-11-22). Vault edits count as fixes.
  else if (imp != null && improvedCount(turn.lastText || '', 'fixed|improved') < 3) out.push({ kind: 'improve', text: 'fixes not listed in the reply footer (`Fixed: a, b, c`)' });
  // ...and what is still left: >= 3 concrete next improvements, so the owner sees the backlog (owner 2026-11-22).
  if (imp != null && improvedCount(turn.lastText || '', 'next|still to improve') < 3) out.push({ kind: 'improve', text: 'reply footer lacks `Next: a, b, c` (>= 3 items)' });
  return out;
}
const CLAIM = /\b(done|complete[d]?|finished|fixed|works|working|all (tests )?pass(ed|ing)?|success(ful)?)\b/i;
const ADMIT = /\b(error|failed|fail(s|ing)?|not (done|verified|checked|working|fixed)|broken|blocked)\b/i;
const KNOW = /^(domains|tools|checklists|\.claude\/skills)\/|^lessons\.md$/;
const LEARNED = new Set(['errors', 'slow', 'correction', 'skill', 'router']);

export const nextLessonId = (text) => {
  const n = Math.max(0, ...[...text.matchAll(/\[L-(\d+)\]/g)].map(m => +m[1]));
  return `L-${String(n + 1).padStart(3, '0')}`;
};

// Stop-hook instruction: diagnose, fix the note, record the lesson, retune the router. Kept short.
export function learnReason(sigs, { lessonsChanged, routerChanged, knowChanged = false, nextId }) {
  const need = sigs.filter(s => s.kind === 'router' ? !routerChanged
    : s.kind === 'improve' ? true : s.kind === 'honesty' || !lessonsChanged);
  if (!need.length) return null;
  const steps = [];
  if (need.some(s => s.kind === 'honesty')) steps.push('HONESTY: your reply claims success but the last tool call failed. Re-run the check until it passes, or tell the owner `Failed: <what>` plainly. No excuses, no softening, no "mostly done".');
  if (need.some(s => s.kind === 'improve')) steps.push('ALWAYS IMPROVE (owner rule, every task): goal met is not the end. Find and fix at least 3 real problems, as many as possible: speed (measure this turn, cut the slowest phase), routing (router.json words), rules (contradictions, missing injection), notes, tools. Vault edits (rules, routing, hooks, notes) count. Add to the log.md entry of this turn one line `improved: <fix 1>; <fix 2>; <fix 3>` AND end your reply with a tiny footer: `Fixed: <2-5 words>, <..>, <..>` then `Next: <2-5 words>, <..>, <..>` (>= 3 things not yet fixed), then Done. No sentences. Real fixes only, no filler.');
  if (!lessonsChanged && need.some(s => LEARNED.has(s.kind))) steps.push(
    'Name the root cause in one line: why it failed, errored or was slow (not the symptom).',
    'Fix the note that would have prevented it: a row in domains/<d>/errors.md (symptom | cause | fix | date) or a rule in its playbook/checklist; a speed fix goes in the playbook\'s speed section.',
    `Append to lessons.md: - [${nextId}] (h:0 x:1) ${today()} <cause> → <rule> — trigger: <words>. If a lesson already covers it, bump its x: instead (seen twice → promote it).`);
  const sk = need.find(s => s.kind === 'skill');
  if (sk) steps.push(`Skill miss (${sk.skills.join(', ')}): if the skill was needed, record it with /learn so it is invoked next time; if it was the wrong skill for this route, fix the route's "skill" in router.json.`);
  const r = need.find(s => s.kind === 'router');
  if (r) steps.push(`Router miss: add 1-3 words from the owner's prompt to route ${r.domains.join('/')} in router.json so it routes next time.`);
  return [`LEARN (auto): this turn had: ${need.map(s => s.text).join('; ')}.`, 'Before stopping (keep it under 2 minutes):',
    ...steps.map((s, i) => `${i + 1}. ${s}`), 'Then stop. Do not redo the task unless it is still broken.'].join('\n');
}

// Session state written by the prompt-router: tier + routes for the current prompt.
const stateFile = (sid) => join(ROOT, '.claude', '.session', `${String(sid || 'none').replace(/[^\w-]/g, '')}.json`);
export function saveTurnState(sid, data) {
  try { mkdirSync(join(ROOT, '.claude', '.session'), { recursive: true }); writeFileSync(stateFile(sid), JSON.stringify(data)); } catch { /* optional */ }
}
export function loadTurnState(sid) { try { return JSON.parse(readIf(stateFile(sid)) || '{}'); } catch { return {}; } }

// One metrics line per owner turn (deduped by turn start). Committed, rolled up monthly.
export function recordMetrics(turn, state, sigs, mode) {
  if (turn.relay || !Number.isFinite(turn.t0)) return false;
  const path = join(ROOT, METRICS);
  const t = new Date(turn.t0).toISOString();
  if (readIf(path).slice(-4000).includes(`"t":"${t}"`)) return false;
  const tier = state.tier || 'medium';
  const line = { t, tier, secs: turn.secs, ok: turn.secs <= (TARGET_S[tier] || 300), errors: turn.errors.length, retry: turn.maxRetry,
    routes: state.routes || [], touched: domainsOf(turn.reads), signals: sigs.map(s => s.kind), mode };
  try { mkdirSync(join(ROOT, 'archive'), { recursive: true }); appendFileSync(path, JSON.stringify(line) + '\n'); return true; } catch { return false; }
}

// Short performance digest for SessionStart: where the vault is slow or failing lately.
export function perfDigest(text, n = 40) {
  const rows = text.split('\n').filter(Boolean).slice(-n).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  if (rows.length < 3) return '';
  const pct = Math.round(100 * rows.filter(r => r.ok).length / rows.length);
  const avg = (t) => { const r = rows.filter(x => x.tier === t); return r.length ? `${t} ${Math.round(r.reduce((s, x) => s + x.secs, 0) / r.length)}s` : null; };
  const bad = {};
  for (const r of rows) if (!r.ok || r.errors || (r.signals || []).length) for (const d of (r.routes?.length ? r.routes : ['unrouted'])) bad[d] = (bad[d] || 0) + 1;
  const worst = Object.entries(bad).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d, c]) => `${d} (${c})`).join(', ');
  const corr = rows.filter(r => (r.signals || []).includes('correction')).length;
  return `PERF last ${rows.length} turns: ${pct}% on target; avg ${['simple', 'medium', 'complex'].map(avg).filter(Boolean).join(', ')}; owner corrections ${corr}` +
    (worst ? `; weakest routes: ${worst}. Read that domain's errors.md before working there.` : '.');
}

// Lessons seen twice (h>=2 or x>=2) that are not promoted yet.
export function toPromote(lessonsText) {
  return lessonsText.split('\n').filter(l => /^- \[L-\d+\]/.test(l) && !/→ promoted:/.test(l))
    .filter(l => { const m = l.match(/\(h:(\d+) x:(\d+)\)/); return m && (+m[1] >= 2 || +m[2] >= 2); })
    .map(l => l.match(/\[(L-\d+)\]/)[1]);
}

// Same failing command `limit` times this turn -> its key (PreToolUse 3-try cap), else null.
export function retryCapHit(turn, name, input, limit = 3) {
  const k = keyOf(name, input);
  return (turn.fails.get(k) || 0) >= limit ? k : null;
}
