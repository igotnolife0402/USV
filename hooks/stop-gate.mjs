import { spawnSync, spawn } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, readInput, emit, safe, getMode, readIf, today } from './lib.mjs';
import { lintFiles } from '../scripts/vault-lint.mjs';

const git = (...args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 5000, windowsHide: true });

safe(() => {
  const input = readInput();
  if (input.stop_hook_active) return;
  const st = git('status', '--porcelain', '-uall');
  if (st.status !== 0) return; // not a git repo (or git missing): never block
  const files = st.stdout.split('\n').filter(Boolean)
    .map(l => l.slice(3).split(' -> ').pop().replace(/^"|"$/g, ''));
  if (!files.length) return;

  const errs = lintFiles(files.filter(f => /\.md$/i.test(f))).filter(r => r.level === 'error');
  if (errs.length) return emit({ decision: 'block', reason: `Vault lint failed:\n${errs.map(e => `${e.file}:${e.line ?? 0} ${e.msg}`).join('\n')}\nFix now.` });

  const d = today();
  if (files.some(f => f !== 'log.md') && !readIf(join(ROOT, 'log.md')).includes(`## [${d}]`))
    return emit({ decision: 'block', reason: `Add a log.md entry: ## [${d}] <op> / <title> + 1-3 lines, and add a lessons.md bullet if anything failed this session.` });

  git('add', '-A');
  const c = spawnSync('git', ['commit', '-m', `vault: ${d} session ${String(input.session_id || 'unknown').slice(0, 8)}`], { cwd: ROOT, timeout: 15000, stdio: 'ignore', windowsHide: true });
  if (c.status === 0 && getMode(input.session_id).mode === 'pc' && git('remote').stdout?.trim())
    spawn('git', ['push'], { cwd: ROOT, detached: true, stdio: 'ignore', windowsHide: true }).on('error', () => {}).unref();
});
