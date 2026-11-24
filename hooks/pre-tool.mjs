import { join, resolve, relative } from 'node:path';
import { homedir } from 'node:os';
import { ROOT, readInput, emit, safe, getMode, readIf, isMain } from './lib.mjs';
import { isNote } from '../scripts/vault-lint.mjs';
import { readTail, parseTurn, retryCapHit, loadTurnState, TARGET_S } from './learn.mjs';
import { budgetGate } from './budget.mjs';

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
  // newlines end a command too: a later line's tokens counted as rm args blocked `rm -rf <subdir>` (2026-11-23)
  for (const t of String(cmd).match(/"[^"]*"|'[^']*'|\n|[^\s]+/g) || []) {
    if (t === '\n') { segs.push([]); continue; }
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
    // Match only what runs: heredoc bodies and quoted strings are data (commit messages, sed text, python code that merely
    // mentions a PC app) and blocked real work on 2026-11-23 twice (L-135).
    const runs = ti.command.replace(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\s*\1\s*(\n|$)/g, ' ').replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''");
    const m = modes.pcOnlyBash && runs.match(new RegExp(modes.pcOnlyBash, 'i'));
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
  const { tool_name: tool = '', tool_input: ti = {}, session_id, transcript_path } = readInput();

  // Owner rule (permanent, 2026-11-22): never touch the Roblox Studio camera: no screenshots, video or camera code. Look at an export instead.
  if (/Roblox_Studio__(screen_capture|video_capture|character_navigation)$/.test(tool) ||
      (/Roblox_Studio__(execute_luau|multi_edit)$/.test(tool) && /CurrentCamera|\.CameraType|BindToRenderStep|Camera\.CFrame|cam\.CFrame/.test(JSON.stringify(ti))))
    return deny('Owner rule: never move or capture the Roblox Studio camera (no screenshots, videos, cinematics, camera code). Check looks from the export instead: Sandbox studio shots render (tools/3d/studio test/run.mjs shots) or the exported file.');

  // Hard tier clock: deny new agents past 50 %, all non-wrap-up work past 100 % (owner 2026-11-24)
  if (transcript_path) {
    const t0 = parseTurn(readTail(transcript_path, 1_500_000)).t0, st = loadTurnState(session_id);
    const why = budgetGate(tool, ti, (Date.now() - t0) / 1000, TARGET_S[st.tier || 'medium']);
    if (why) return deny(why);
  }

  // 3-try cap: the exact same call already failed 3 times this turn -> change approach instead of looping.
  if (transcript_path && /^(Bash|PowerShell|mcp__)/.test(tool)) {
    const turn = parseTurn(readTail(transcript_path, 1_500_000));
    // Owner-preferred tools (hooks/prefer.json): e.g. Umbrio Sandbox over Blender unless the owner names Blender.
    let prefer = { rules: [] };
    try { prefer = JSON.parse(readIf(join(ROOT, 'hooks', 'prefer.json')) || '{"rules":[]}'); } catch { /* keep empty */ }
    const p = (prefer.rules || []).find(r => new RegExp(r.match).test(tool) && !new RegExp(r.unless, 'i').test(turn.prompt));
    if (p) return deny(`Owner rule: use ${p.use} instead of ${tool}. Only use ${tool.split('__')[1] || tool} when the owner names it.`);
    if (retryCapHit(turn, tool, ti)) {
      const last = turn.errors.filter(e => e.tool === tool).at(-1);
      return deny(`3-try cap: this exact call already failed 3 times this turn${last ? ` (last error: ${last.text.slice(0, 160)})` : ''}. Change approach: read the domain's errors.md, try a different method, or log it (lessons.md / queue/pc.md) and move on.`);
    }
  }

  if ((tool === 'Bash' || tool === 'PowerShell') && typeof ti.command === 'string') {
    const why = dangerousCommand(ti.command);
    if (why) return deny(`${why}. Do it manually if truly intended.`);
  }

  // Target file only: a .mjs name inside the quoted sed expression is text, not the file edited (L-135, 2026-11-23)
  if (tool === 'Bash' && typeof ti.command === 'string' && /\b(sed\s+-i|perl\s+-pi)\b[^|;&\n]*\.(m?js|cjs|ts)\b/.test(ti.command.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''")))
    return deny('Edit .js/.mjs/.ts files with the Edit tool, not sed -i / perl -pi (regex backslashes and newlines get corrupted, L-045).');

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
