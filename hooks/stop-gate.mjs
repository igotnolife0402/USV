import { spawnSync, spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { ROOT, readInput, emit, safe, getMode, readIf, today, isMain } from './lib.mjs';
import { lintAll } from '../scripts/vault-lint.mjs';
import { readTail, parseTurn, signals, improvedCount, learnReason, nextLessonId, loadTurnState, recordMetrics, METRICS } from './learn.mjs';

const ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
const git = (args, timeout = 5000) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout, env: ENV, windowsHide: true, maxBuffer: 32 << 20 });

const SECRET_NAME = /(^|\/)(\.env(\..*)?|secrets?\.[^/]*|[^/]*\.(pem|key|p12|pfx))$/i;
const SECRET_TEXT = /\b[A-Z0-9_]*API_KEY\s*[=:]\s*['"]?[A-Za-z0-9_\-]{8,}|\bsk-(ant-)?[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\bghp_[A-Za-z0-9]{30,}|\bAKIA[0-9A-Z]{16}\b/;
const MAX_BYTES = 5 * 1024 * 1024;

// `git status --porcelain -z -uall` -> changed paths (rename/copy: the new path).
export function changedFiles(z) {
  const parts = z.split('\0'), out = [];
  for (let i = 0; i < parts.length; i++) {
    const e = parts[i];
    if (e.length < 4) continue;
    out.push(e.slice(3));
    if (/^[RC]/.test(e)) i++; // next part is the old path
  }
  return out;
}

// Why a staged path must not be committed, or null.
export function refuseReason(root, rel) {
  if (SECRET_NAME.test(rel) && !/\.example$/i.test(rel)) return 'secret file name';
  const abs = join(root, rel);
  let size = 0;
  try { size = statSync(abs).size; } catch { return null; } // deleted
  if (size > MAX_BYTES) return `over 5 MB (${(size / 1048576).toFixed(1)} MB)`;
  if (size < 1048576) { try { if (SECRET_TEXT.test(readFileSync(abs, 'utf8'))) return 'looks like it contains a secret/API key'; } catch { /* binary */ } }
  return null;
}

// ACE rule: lessons.md lines may only be appended or have their (h:N x:N) counters bumped.
export function lessonViolations(diff) {
  const strip = (l) => l.replace(/\(h:\d+ x:\d+\)/, '(h x)').replace(/\s+→ (promoted|applied|dup of)[: ].*$/, '').trimEnd();
  const lines = diff.split('\n');
  const removed = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).map(l => l.slice(1));
  const added = new Set(lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => strip(l.slice(1))));
  return removed.filter(l => l.startsWith('- [L-') && !added.has(strip(l)));
}

function inConflict() {
  if ((git(['ls-files', '-u']).stdout || '').trim()) return true;
  const gd = (git(['rev-parse', '--git-dir']).stdout || '').trim();
  if (!gd) return false;
  const dir = resolve(ROOT, gd);
  return ['MERGE_HEAD', 'rebase-merge', 'rebase-apply', 'CHERRY_PICK_HEAD'].some(f => existsSync(join(dir, f)));
}

if (isMain(import.meta.url)) safe(() => {
  const input = readInput();
  const canBlock = !input.stop_hook_active; // second pass: never block (loop guard), but still commit if lint passes
  const block = (reason) => { if (canBlock) emit({ decision: 'block', reason }); };

  // Auto-learning: analyse this turn (errors, retries, slowness, owner corrections, router misses); keep metrics.
  const turn = input.transcript_path ? parseTurn(readTail(input.transcript_path)) : null;
  const state = loadTurnState(input.session_id);
  // Workers still running = the task is mid-flight: judge it when the last report is in, not now.
  const sigs = turn && !(input.background_tasks?.length > 0) ? signals(turn, state, { improved: improvedCount(readIf(join(ROOT, 'log.md'))) }) : [];
  if (turn) recordMetrics(turn, state, sigs, getMode(input.session_id).mode);

  const st = git(['status', '--porcelain', '-z', '-uall']);
  if (st.status !== 0) return; // not a git repo (or git missing): never block
  const files = changedFiles(st.stdout || '');

  if (sigs.length) {
    const why = learnReason(sigs, { lessonsChanged: files.includes('lessons.md'), routerChanged: files.includes('router.json'), knowChanged: files.some(f => /^(domains|tools|checklists|\.claude\/skills)\//.test(f)),
      nextId: nextLessonId(readIf(join(ROOT, 'lessons.md'))) });
    if (why) return block(why);
  }
  // Metrics alone never make a commit; they ride along with the next real change.
  if (!files.some(f => f !== METRICS)) return;

  const errs = lintAll(ROOT).filter(r => r.level === 'error');
  if (errs.length) return block(`Vault lint failed:\n${errs.slice(0, 30).map(e => `${e.file}:${e.line ?? 0} ${e.msg}`).join('\n')}${errs.length > 30 ? `\n(+${errs.length - 30} more)` : ''}\nFix now.`);

  if (files.includes('lessons.md')) {
    const bad = lessonViolations(git(['diff', 'HEAD', '--', 'lessons.md']).stdout || '');
    if (bad.length) return block(`lessons.md is ACE delta-only: restore these lines (only append bullets or bump h:/x:):\n${bad.join('\n')}`);
    const fresh = (git(['diff', 'HEAD', '--', 'lessons.md']).stdout || '').split('\n').filter(l => /^\+- \[L-\d+\]/.test(l) && !/→ (promoted|applied): /.test(l));
    if (fresh.length) return block(`Apply new lessons NOW (owner rule: a logged error that is never applied comes back). Put each rule into its playbook, checklist, skill or hook, then append " → applied: <path>" to the lesson line:\n${fresh.map(l => l.slice(1, 90)).join('\n')}`);
  }

  const d = today();
  if (files.some(f => f !== 'log.md' && f !== METRICS) && !readIf(join(ROOT, 'log.md')).includes(`## [${d}]`))
    return block(`Add a log.md entry: ## [${d}] <op> / <title> + 1-3 lines, and add a lessons.md bullet if anything failed this session.`);

  if (inConflict()) return block('Merge/rebase in progress or unresolved conflicts: resolve them (git status), then stop again. Nothing was committed.');
  if (input.background_tasks?.length > 0) return; // commit after background work finishes

  git(['add', '-A']);
  const staged = (git(['diff', '--cached', '--name-only', '-z']).stdout || '').split('\0').filter(Boolean);
  const refused = [];
  for (const f of staged) {
    const why = refuseReason(ROOT, f);
    if (why) { git(['reset', '-q', '--', f]); refused.push(`${f} (${why})`); }
  }
  const left = (git(['diff', '--cached', '--name-only']).stdout || '').trim();
  let committed = false;
  if (left) {
    const c = git(['commit', '-m', `vault: ${d} session ${String(input.session_id || 'unknown').slice(0, 8)}`], 45000);
    committed = c.status === 0;
    if (!committed) return block(`git commit failed (pre-commit hook?):\n${((c.stdout || '') + (c.stderr || '')).trim().slice(-1500)}\nFix it, then stop again.`);
  }
  if (committed && git(['remote']).stdout?.trim()) {
    const branch = (git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout || '').trim();
    if (getMode(input.session_id).mode === 'pc')
      spawn('git', ['push', '-u', 'origin', 'HEAD'], { cwd: ROOT, detached: true, stdio: 'ignore', env: ENV, windowsHide: true }).on('error', () => {}).unref();
    else if (branch && !/^(main|master|HEAD)$/.test(branch)) git(['push', '-u', 'origin', 'HEAD'], 30000); // phone: its session branch only
  }
  if (refused.length) block(`Not committed (left unstaged): ${refused.join('; ')}. Add them to .gitignore or delete them; never commit secrets or files over 5 MB.`);
});
