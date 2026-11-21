// User-level hooks: sessions in ANY folder learn into this vault. Installed by scripts/install-global.mjs.
// Usage (from ~/.claude/settings.json): node "<vault>/hooks/global.mjs" start|prompt|pre|stop
// Inside the vault the project hooks already run, so this exits at once there.
import { spawnSync, spawn } from 'node:child_process';
import { join, relative, isAbsolute, resolve, basename } from 'node:path';
import { ROOT, readInput, emit, safe, readIf, fm, isMain, today } from './lib.mjs';
import { classify, route, RELAY } from './prompt-router.mjs';
import { readTail, parseTurn, signals, learnReason, nextLessonId, saveTurnState, loadTurnState, recordMetrics, retryCapHit, perfDigest, METRICS } from './learn.mjs';
import { lintAll } from '../scripts/vault-lint.mjs';

const V = ROOT.replace(/\\/g, '/');
const ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
const git = (args, timeout = 8000) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout, env: ENV, windowsHide: true });

export function insideVault(cwd) {
  const r = relative(resolve(ROOT).toLowerCase(), resolve(cwd || '.').toLowerCase());
  return r === '' || (!r.startsWith('..') && !isAbsolute(r));
}
const routerJson = () => { try { return JSON.parse(readIf(join(ROOT, 'router.json')) || '{}'); } catch { return {}; } };
const vaultChanged = (rel) => !!(git(['status', '--porcelain', '--', rel]).stdout || '').trim();

export function startContext() {
  const lessons = readIf(join(ROOT, 'lessons.md')).split('\n').filter(l => l.startsWith('- [L-'))
    .sort((a, b) => +b.match(/L-(\d+)/)[1] - +a.match(/L-(\d+)/)[1]).slice(0, 8).map(l => l.slice(0, 180));
  const perf = perfDigest(readIf(join(ROOT, METRICS)));
  return [`VAULT (shared memory for every task): ${V}. Routes, playbooks, errors and checklists live there; the prompt hook names the notes to read (absolute paths).`,
    'On any failure, slowness or owner complaint the Stop hook asks for a lesson in the vault: write it there, not in this project.',
    perf, lessons.length ? `NEWEST LESSONS\n${lessons.join('\n')}` : ''].filter(Boolean).join('\n').slice(0, 3000);
}

export function promptContext(prompt, sid) {
  if (RELAY.test(prompt)) return '';
  const router = routerJson();
  const tier = classify(prompt, router.tiers), routes = route(prompt, router);
  const uniq = (a) => [...new Set(a.filter(Boolean))];
  const skills = uniq(routes.map(r => r.skill));
  saveTurnState(sid, { tier, routes: routes.map(r => r.id), skills, t: Date.now(), external: true });
  const lines = [`VAULT ${V} | TIER=${tier}`];
  if (routes.length) {
    if (skills.length) lines.push(`Skill recipe (read first for any build/edit; the Stop hook checks): ${skills.map(s => `${V}/.claude/skills/${s}/SKILL.md`).join(', ')}`);
    lines.push(`Checklist: ${uniq(routes.map(r => r.checklist)).map(p => `${V}/${p}`).join(', ')}`);
    lines.push(`Read first: ${uniq(routes.flatMap(r => r.notes || [])).slice(0, 4).map(n => {
      const s = fm(readIf(join(ROOT, n))).data?.summary; return `${V}/${n}${s ? ` (${s})` : ''}`; }).join('; ')}`);
  }
  return lines.join('\n').slice(0, 1200);
}

function stop(input) {
  if (!input.transcript_path) return;
  const turn = parseTurn(readTail(input.transcript_path));
  const state = loadTurnState(input.session_id);
  const sigs = signals(turn, state);
  recordMetrics(turn, { ...state, routes: state.routes || [] }, sigs, 'pc');
  if (sigs.length && !input.stop_hook_active) {
    const why = learnReason(sigs, { lessonsChanged: vaultChanged('lessons.md'), routerChanged: vaultChanged('router.json'), knowChanged: ['domains', 'tools', 'checklists', '.claude/skills'].some(vaultChanged),
      nextId: nextLessonId(readIf(join(ROOT, 'lessons.md'))) });
    if (why) return emit({ decision: 'block', reason: `${why}\nVault: ${V} (lessons.md, router.json and domains/ are there; paths above are relative to it). Project: ${basename(input.cwd || process.cwd())}.` });
  }
  // Commit what this session taught the vault (vault files only), if the vault still lints clean.
  const st = (git(['status', '--porcelain']).stdout || '').trim();
  if (!st || st.split('\n').every(l => l.endsWith(METRICS))) return;
  if (lintAll(ROOT).some(r => r.level === 'error')) return;
  if ((git(['ls-files', '-u']).stdout || '').trim()) return;
  git(['add', '-A']);
  if (git(['commit', '-q', '-m', `vault: learned in ${basename(input.cwd || process.cwd())} ${today()}`], 30000).status === 0 && (git(['remote']).stdout || '').trim())
    spawn('git', ['push', '-q', 'origin', 'HEAD'], { cwd: ROOT, detached: true, stdio: 'ignore', env: ENV, windowsHide: true }).on('error', () => {}).unref();
}

if (isMain(import.meta.url)) safe(() => {
  const mode = process.argv[2];
  const input = readInput();
  if (insideVault(input.cwd || process.cwd())) return; // project hooks own the vault
  if (mode === 'start') return emit({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: startContext() } });
  if (mode === 'prompt') { const c = promptContext(String(input.prompt || ''), input.session_id); if (c) emit({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: c } }); return; }
  if (mode === 'pre' && input.transcript_path) {
    const turn = parseTurn(readTail(input.transcript_path, 1_500_000));
    if (retryCapHit(turn, input.tool_name || '', input.tool_input || {}))
      emit({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `3-try cap: this exact call already failed 3 times this turn. Change approach; check ${V}/domains/<d>/errors.md.` } });
    return;
  }
  if (mode === 'stop') stop(input);
});
