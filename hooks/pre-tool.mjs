import { join, resolve, relative } from 'node:path';
import { homedir } from 'node:os';
import { ROOT, readInput, emit, safe, getMode, readIf, isMain } from './lib.mjs';
import { isNote } from '../scripts/vault-lint.mjs';

const deny = (reason) => emit({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });

// Normalize Windows / Git Bash paths for comparison: C:\a\b, /c/a/b -> c:/a/b; ./x -> x; "/" -> ""
export function norm(p) {
  let s = String(p).replace(/^(['"])(.*)\1$/, '$2').replace(/\\/g, '/').replace(/^\/([a-z])(\/|$)/i, '$1:/').toLowerCase();
  while (s.startsWith('./')) s = s.slice(2);
  return s === './' ? '.' : s.replace(/\/+$/, '');
}

// Quote-aware tokens; unquoted ; & | split segments, so text inside a quoted commit message never matches.
export function segments(cmd) {
  const segs = [[]];
  for (const t of String(cmd).match(/"[^"]*"|'[^']*'|\S+/g) || []) {
    if (/^["']/.test(t)) { segs.at(-1).push(t); continue; }
    for (const part of t.split(/([;&|]+)/)) {
      if (!part) continue;
      if (/^[;&|]+$/.test(part)) segs.push([]); else segs.at(-1).push(part);
    }
  }
  return segs.filter(s => s.length);
}

function dangerTargets(root) {
  const out = new Set(['', '*', '.', '..', '~', '~/*', '.git', '$home', '${home}', '$home/*', '$env:userprofile', 'c:']);
  for (const base of [norm(root), '$claude_project_dir', '${claude_project_dir}'])
    for (const suf of ['', '/*', '/.git']) out.add(base + suf);
  const h = norm(homedir());
  out.add(h); out.add(h + '/*');
  return out;
}

export function dangerousCommand(cmd, root = ROOT) {
  const danger = dangerTargets(root);
  const hits = (args) => args.filter(a => !a.startsWith('-')).some(a => danger.has(norm(a)));
  for (const seg of segments(cmd)) {
    const low = seg.map(t => t.toLowerCase());
    const gi = low.indexOf('git');
    if (gi >= 0) {
      const rest = low.slice(gi + 1);
      while (rest[0] === '-c' || rest[0] === '-C') rest.splice(0, 2);
      const [sub, ...args] = rest;
      const flags = args.filter(a => /^-[^-]/.test(a)).join('');
      if (sub === 'push' && (args.includes('--force') || /f/.test(flags) || args.some(a => /^\+./.test(a))))
        return 'git push --force (or +branch) is blocked; use --force-with-lease if truly needed';
      if (sub === 'reset' && args.includes('--hard')) return 'git reset --hard is blocked';
      if (sub === 'clean' && /f/.test(flags) && /d/.test(flags)) return 'git clean -fd is blocked';
    }
    const ri = low.findIndex(t => t === 'rm' || t.endsWith('/rm'));
    if (ri >= 0) {
      const args = seg.slice(ri + 1), f = args.filter(a => /^-[^-]/.test(a)).join('');
      const rec = /r/i.test(f) || args.includes('--recursive'), force = /f/.test(f) || args.includes('--force');
      if (rec && force && hits(args)) return 'rm -rf on /, ~, ., *, .git or the vault root is blocked';
    }
    const pi = low.findIndex(t => /^(remove-item|ri|del|rd|rmdir)$/.test(t));
    if (pi >= 0) {
      const args = seg.slice(pi + 1), la = args.map(a => a.toLowerCase());
      if (la.some(a => /^-r(e(c(u(r(s(e)?)?)?)?)?)?$/.test(a)) && la.some(a => /^-fo(r(c(e)?)?)?$/.test(a)) && hits(args))
        return 'Remove-Item -Recurse -Force on the root, home, vault or .git is blocked';
    }
  }
  return null;
}

// Returns { what, key } when mobile must not run this call, else null. key picks the fallback.
export function mobileBlock(tool, ti = {}, modes = {}) {
  if ((modes.pcOnly || []).some(p => new RegExp(p).test(tool))) return { what: tool, key: tool };
  if (tool === 'Skill' && modes.pcOnlySkills && new RegExp(modes.pcOnlySkills, 'i').test(String(ti.skill || '')))
    return { what: `skill ${ti.skill}`, key: String(ti.skill) };
  if ((tool === 'Bash' || tool === 'PowerShell') && typeof ti.command === 'string') {
    const m = modes.pcOnlyBash && ti.command.match(new RegExp(modes.pcOnlyBash, 'i'));
    if (m) return { what: `'${m[0].trim()}'`, key: m[0] };
    const bad = outsideInstalls(ti.command, modes.mobilePackages || []);
    if (bad.length) return { what: `install of ${bad.join(', ')} (not a vault package)`, key: 'install' };
  }
  return null;
}

// Package names an install would fetch that the vault doesn't already pin. Bare `npm install` (lockfile) is fine.
export function outsideInstalls(cmd, allowed) {
  const ok = new Set(allowed.map(s => s.toLowerCase())), bad = [];
  const re = /\b(?:pip3?|python3?\s+-m\s+pip)\s+install\s+([^;&|]*)|\b(?:npm|pnpm|yarn)\s+(?:i|install|add)\b([^;&|]*)|\b(cargo|go|gem)\s+install\b([^;&|]*)/gi;
  for (const m of cmd.matchAll(re)) {
    const anyName = !!m[3];
    for (const a of (m[1] ?? m[2] ?? m[4] ?? '').trim().split(/\s+/)) {
      if (!a || a.startsWith('-')) continue;
      const name = a.replace(/^['"]|['"]$/g, '').split(/(?<=.)@|==|>=|<=|~=|[<>=[]/)[0].toLowerCase();
      if (anyName || !ok.has(name)) bad.push(a);
    }
  }
  return bad;
}

if (isMain(import.meta.url)) safe(() => {
  const { tool_name: tool = '', tool_input: ti = {}, session_id } = readInput();

  if ((tool === 'Bash' || tool === 'PowerShell') && typeof ti.command === 'string') {
    const why = dangerousCommand(ti.command);
    if (why) return deny(`${why}. Do it manually if truly intended.`);
  }

  if (tool === 'Write' && typeof ti.file_path === 'string') {
    const rel = relative(ROOT, resolve(ROOT, ti.file_path)).replace(/\\/g, '/');
    if (isNote(rel) && String(ti.content || '').split(/\r?\n/).length > 200)
      return deny('Note over 200 lines: split it into smaller notes and link them from the domain index');
  }

  if (getMode(session_id).mode === 'mobile') {
    let modes = {};
    try { modes = JSON.parse(readIf(join(ROOT, 'hooks', 'modes.json'))); } catch { /* keep empty */ }
    const why = mobileBlock(tool, ti, modes);
    if (why) {
      const use = (modes.fallbacks || []).find(f => new RegExp(f.match).test(why.key))?.use || "use Claude's own tools or an Artifact and queue the PC step";
      return deny(`MOBILE MODE: ${why.what} is PC-only or outside software. Fallback: ${use}. Then append the PC step to queue/pc.md.`);
    }
  }
});
