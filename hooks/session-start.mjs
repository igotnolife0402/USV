import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, readInput, emit, safe, getMode, readIf, fm } from './lib.mjs';
import { installGitHooks } from '../scripts/install-githooks.mjs';
import { rollup, rollupMetrics } from '../scripts/rollup.mjs';
import { perfDigest, toPromote, METRICS } from './learn.mjs';

const CAP = 8000;
const num = (l) => parseInt(l.match(/^- \[L-(\d+)/)?.[1] || '0', 10);
const newest = (b) => [...b].sort((a, c) => num(c) - num(a)).slice(0, 10);
const clip = (l, n) => (l.length > n ? l.slice(0, n - 3) + '...' : l);
const ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
const git = (args, timeout = 5000) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout, env: ENV, windowsHide: true });
const openItems = (text) => text.split(/\r?\n/).filter(l => /^\s*- \[ \]/.test(l)).map(l => l.trim());

safe(() => {
  const input = readInput();
  const { mode, remote } = getMode(input.session_id);
  const warn = [];
  try { installGitHooks(ROOT); } catch { /* optional */ }

  // PC startup only: sync with the phone's pushes. Never prompt for credentials; never leave a half rebase.
  let branchItems = [];
  if (mode === 'pc' && input.source === 'startup' && git(['remote']).stdout?.trim()) {
    const p = git(['pull', '--rebase', '--autostash'], 15000);
    if (p.status !== 0) {
      git(['rebase', '--abort']);
      warn.push(`WARNING: git pull failed (${(p.stderr || p.error?.message || 'timeout').trim().split('\n')[0].slice(0, 120)}); work is unsynced, pull manually.`);
    }
    if (git(['fetch', 'origin'], 15000).status === 0) {
      const local = new Set(openItems(readIf(join(ROOT, 'queue', 'pc.md'))));
      const refs = (git(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin/claude/']).stdout || '').split('\n').filter(Boolean).slice(0, 30);
      for (const ref of refs) {
        const items = openItems(git(['show', `${ref}:queue/pc.md`]).stdout || '').filter(i => !local.has(i));
        if (items.length) branchItems.push(`${ref} (merge it): ${items.length} item(s)\n${items.slice(0, 5).join('\n')}`);
      }
    }
  }

  const what = mode === 'pc'
    ? 'PC: every connected MCP/tool/plugin allowed, Claude-native routes first.'
    : 'MOBILE: only Claude tools, Artifacts, GitHub and session connectors; PC-only tools are blocked, queue PC steps in queue/pc.md and commit them to the session branch.';
  // Monthly upkeep runs itself: old log sections and metric rows move to archive/ on the first startup of a month.
  if (input.source === 'startup') { try { rollup(ROOT); rollupMetrics(ROOT); } catch { /* never block startup */ } }

  // Learning feedback: where recent turns were slow or failed, and lessons seen twice that must become rules.
  const perf = perfDigest(readIf(join(ROOT, METRICS)));
  const promote = toPromote(readIf(join(ROOT, 'lessons.md')));
  if (perf) warn.push(perf);
  if (promote.length) warn.push(`PROMOTE NOW (seen twice): ${promote.slice(0, 8).join(', ')}: move each rule into its domain playbook/checklist or a hook, then append "→ promoted: <path>" to the bullet.`);
  const banner = [`MODE=${mode} | remote=${remote ? 'yes' : 'no'}\n${what}`, ...warn].join('\n');

  let queue = '';
  if (mode === 'pc') {
    const items = openItems(readIf(join(ROOT, 'queue', 'pc.md')));
    const parts = [];
    if (items.length) parts.push(`PC QUEUE: ${items.length} item(s). Do them first if the task depends on them or the owner says /pc with no task; otherwise mention them in one line.\n${items.slice(0, 10).join('\n')}${items.length > 10 ? `\n(+${items.length - 10} more)` : ''}`);
    if (branchItems.length) parts.push(`PC QUEUE on phone branches (not merged yet):\n${branchItems.join('\n')}`);
    queue = parts.join('\n');
  }
  let profile = fm(readIf(join(ROOT, 'profiles', `${mode}.md`))).body.trim();
  let index = fm(readIf(join(ROOT, 'index.md'))).body.trim();
  const bullets = readIf(join(ROOT, 'lessons.md')).split(/\r?\n/).filter(l => l.startsWith('- [L-'));
  let lessons = bullets.length ? `LESSONS (newest 10)\n${newest(bullets).map(l => clip(l, 200)).join('\n')}` : '';

  const build = () => [banner, queue, profile, index, lessons].filter(Boolean).join('\n\n');
  // Trim order: index, then lessons, then profile; banner + queue are kept.
  const trim = (s) => { const over = build().length - CAP; return over > 0 ? s.slice(0, Math.max(0, s.length - over - 20)) : s; };
  index = trim(index);
  lessons = trim(lessons);
  profile = trim(profile);
  const out = build().slice(0, CAP);

  emit({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: out } });
});
