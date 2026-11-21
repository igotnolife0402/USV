import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, readInput, emit, safe, getMode, readIf, fm } from './lib.mjs';

const CAP = 8000;
const num = (l) => parseInt(l.match(/^- \[L-(\d+)/)?.[1] || '0', 10);
const newest = (b) => [...b].sort((a, c) => num(c) - num(a)).slice(0, 10);

safe(() => {
  const input = readInput();
  const { mode, remote } = getMode(input.session_id);

  if (mode === 'pc') {
    const r = spawnSync('git', ['remote'], { cwd: ROOT, encoding: 'utf8', timeout: 5000, windowsHide: true });
    if (r.status === 0 && r.stdout.trim())
      spawnSync('git', ['pull', '--rebase', '--autostash'], { cwd: ROOT, timeout: 15000, stdio: 'ignore', windowsHide: true });
  }

  const what = mode === 'pc'
    ? 'PC: every connected MCP/tool/plugin allowed, Claude-native routes first; clear the PC queue first.'
    : 'MOBILE: only Claude tools, Artifacts, GitHub and session connectors; PC-only tools are blocked, queue PC steps in queue/pc.md.';
  const banner = `MODE=${mode} | remote=${remote ? 'yes' : 'no'}\n${what}`;

  let queue = '';
  if (mode === 'pc') {
    const items = readIf(join(ROOT, 'queue', 'pc.md')).split(/\r?\n/).filter(l => /^\s*- \[ \]/.test(l));
    if (items.length) queue = `PC QUEUE (do these first)\n${items.join('\n')}`;
  }
  let profile = fm(readIf(join(ROOT, 'profiles', `${mode}.md`))).body.trim();
  let index = fm(readIf(join(ROOT, 'index.md'))).body.trim();
  const bullets = readIf(join(ROOT, 'lessons.md')).split(/\r?\n/).filter(l => l.startsWith('- [L-'));
  let lessons = bullets.length ? `LESSONS (newest 10)\n${newest(bullets).join('\n')}` : '';

  const build = () => [banner, queue, profile, index, lessons].filter(Boolean).join('\n\n');
  // Trim in reverse priority: lessons, index, profile; banner + queue are kept.
  const trim = (s) => { const over = build().length - CAP; return over > 0 ? s.slice(0, Math.max(0, s.length - over - 20)) : s; };
  lessons = trim(lessons);
  index = trim(index);
  profile = trim(profile);
  const out = build().slice(0, CAP);

  emit({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: out } });
});
