import { join, resolve, relative, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { ROOT, readInput, emit, safe, getMode, readIf } from './lib.mjs';

const deny = (reason) => emit({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });

// Normalize Windows / Git Bash paths for comparison: C:\a\b, /c/a/b -> c:/a/b
const norm = (p) => p.replace(/^['"]|['"]$/g, '').replace(/\\/g, '/').replace(/^\/([a-z])\//i, '$1:/').replace(/\/+$/, '').toLowerCase();

function dangerousBash(cmd) {
  if (/\bgit\s+push\b[^;&|]*\s(--force\b|-f\b)/.test(cmd)) return 'git push --force is blocked';
  if (/\bgit\s+reset\b[^;&|]*--hard\b/.test(cmd)) return 'git reset --hard is blocked';
  const clean = cmd.match(/\bgit\s+clean\b([^;&|]*)/);
  if (clean && /\s-\w*f/.test(clean[1]) && /\s-\w*d/.test(clean[1])) return 'git clean -fd is blocked';
  const roots = new Set(['', '/*', '~', '~/*', '$home', '${home}', norm(homedir()), norm(ROOT), norm(ROOT) + '/*'].map(norm));
  for (const m of cmd.matchAll(/\brm\s+([^;&|]*)/g)) {
    const args = m[1].trim().split(/\s+/);
    const flags = args.filter(a => a.startsWith('-')).join('');
    if (!/r/i.test(flags) || !/f/.test(flags)) continue;
    if (args.filter(a => !a.startsWith('-')).some(a => roots.has(norm(a)))) return 'rm -rf on /, ~ or the vault root is blocked';
  }
  return null;
}

safe(() => {
  const { tool_name: tool = '', tool_input: ti = {}, session_id } = readInput();

  if (tool === 'Bash' && typeof ti.command === 'string') {
    const why = dangerousBash(ti.command);
    if (why) return deny(`${why}. Do it manually if truly intended.`);
  }

  if (tool === 'Write' && typeof ti.file_path === 'string' && /\.md$/i.test(ti.file_path)) {
    const rel = relative(ROOT, resolve(ROOT, ti.file_path)).replace(/\\/g, '/');
    const inside = rel && !rel.startsWith('..') && !isAbsolute(rel);
    if (inside && !/^(archive\/|\.claude\/skills\/)/.test(rel) && String(ti.content || '').split(/\r?\n/).length > 200)
      return deny('Note over 200 lines: split it into smaller notes and link them from the domain index');
  }

  if (getMode(session_id).mode === 'mobile') {
    let modes = { pcOnly: [], fallbacks: [] };
    try { modes = JSON.parse(readIf(join(ROOT, 'hooks', 'modes.json'))); } catch { /* keep empty */ }
    if ((modes.pcOnly || []).some(p => new RegExp(p).test(tool))) {
      const use = (modes.fallbacks || []).find(f => new RegExp(f.match).test(tool))?.use || "use Claude's own tools or an Artifact and queue the PC step";
      return deny(`MOBILE MODE: ${tool} is PC-only. Fallback: ${use}. Then append the PC step to queue/pc.md.`);
    }
  }
});
