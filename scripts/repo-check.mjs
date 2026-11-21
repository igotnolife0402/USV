// Whole-repo gates ported from the old vault's hub.py check (one walk, each text file read once).
// Called by vault-lint --all (CLI, CI, pre-commit, stop-gate). Returns [{file, line?, msg, level}].
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, basename, extname, posix } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_OK = new Set(['CLAUDE.md', 'CLAUDE.local.md', 'CLAUDE.local.md.example', 'index.md', 'lessons.md', 'log.md', 'router.json',
  'README.md', '.gitignore', '.gitattributes', '.github', '.githooks', '.claude', '.orchestration', 'archive', 'checklists',
  'domains', 'hooks', 'profiles', 'queue', 'scripts', 'state', 'tests', 'tools']);
const FOLDER_CAP = 20, IMG_CAP = 400_000, FILE_CAP = 200_000;
const IMG = /\.(png|jpe?g|webp|gif)$/i;
const TEXT = /\.(md|py|js|mjs|cjs|ts|json|lua|luau|txt|html|css|sh|yml|yaml|toml|xml|svg|csv)$/i;
const JUNK = /(^|[ _.-])(v\d+|old|copy|backup|bak|draft|tmp|temp)([ _.-]|$)|\(\d+\)/i;
// Assembled so this file doesn't trip its own scans.
const OLD_VAULT = ['Mobile' + '-Vault', 'vault' + '.py', 'agent' + '-vault', 'hub/' + 'hub.py', 'hub/' + 'device.py', 'hub' + '.py '];
const SESSION_PATH = new RegExp('/tmp/' + 'claude-|/root/' + '\\.claude/|/home/' + 'user/|AppData[\\\\/]Local[\\\\/]Temp[\\\\/]claude|\\b[A-Za-z]:[\\\\/]Users[\\\\/](?!(YOU|USER|<)\\b)[A-Za-z0-9]|(^|[\\s"\'(])/c/Users/');
const STATIC_IMPORT = /(?:^|[;\n])\s*(?:import|export)\s(?:[^;'"]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
const CDN = /https:\/\/(?:cdn\.jsdelivr\.net\/npm|unpkg\.com)\/((?:@[\w.-]+\/)?[\w.-]+)(@[^/\s"'`]*)?/g;
const LESSON = /^- \[L-(\d{3,})\] \(h:\d+ x:\d+\) \d{4}-\d{2}-\d{2} .+ — trigger: .+/;
const CONTENT_SKIP = /^(\.orchestration|archive)\//;

export function listFiles(root) {
  const r = spawnSync('git', ['ls-files', '-z', '-co', '--exclude-standard'], { cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true, maxBuffer: 64 << 20 });
  if (r.status === 0 && r.stdout) return [...new Set(r.stdout.split('\0').filter(Boolean))].filter(f => existsSync(join(root, f)));
  const out = [];
  const walk = (d, rel) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (['.git', 'node_modules', '.worktrees'].includes(e.name)) continue;
      const r2 = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(join(d, e.name), r2); else out.push(r2);
    }
  };
  walk(root, '');
  return out;
}

export function repoCheck(root, files = listFiles(root)) {
  const out = [];
  const add = (file, msg, level = 'error', line) => out.push({ file, ...(line ? { line } : {}), msg, level });
  const text = new Map();
  const read = (f) => { if (!text.has(f)) { try { text.set(f, readFileSync(join(root, f), 'utf8')); } catch { text.set(f, ''); } } return text.get(f); };
  const has = (f) => existsSync(join(root, f));

  // Layout: root allowlist, folder cap, junk names, sizes.
  const kids = new Map();
  for (const f of files) {
    const parts = f.split('/');
    if (!ROOT_OK.has(parts[0])) add(parts[0], 'not allowed in the vault root; put it in its folder (see .orchestration/ARCHITECTURE.md)');
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join('/');
      if (!parts[i].startsWith('.')) (kids.get(dir) || kids.set(dir, new Set()).get(dir)).add(parts[i]);
    }
    if (CONTENT_SKIP.test(f)) continue;
    if (JUNK.test(basename(f, extname(f)))) add(f, 'copy/version name; overwrite the original instead');
    let size = 0;
    try { size = statSync(join(root, f)).size; } catch { continue; }
    if (IMG.test(f)) { if (size > IMG_CAP) add(f, `${Math.round(size / 1000)} KB > ${IMG_CAP / 1000} KB; compress it`); }
    else if (!/\.md$/i.test(f) && size > FILE_CAP) add(f, `${Math.round(size / 1000)} KB > ${FILE_CAP / 1000} KB; too big for the vault (gitignore generated output, regenerate it from a script)`);
  }
  for (const [dir, set] of kids) if (!/^(\.orchestration|archive|\.claude)(\/|$)|^tools\/.*\/(test|tests|plugins)$/.test(dir) && set.size > FOLDER_CAP) add(dir, `${set.size} items > ${FOLDER_CAP}; split by category`);

  // Content: machine/session paths, old-vault names, image embeds, backticked paths, CDN pins.
  const texts = files.filter(f => TEXT.test(f) && !CONTENT_SKIP.test(f));
  const tops = new Set(files.map(f => f.split('/')[0]));
  const ignored = read('.gitignore').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && !/[*!]/.test(l));
  let corpus = '';
  for (const f of texts) {
    const t = read(f);
    corpus += t + '\n';
    const m = t.match(SESSION_PATH);
    if (m) add(f, `machine/session path (${m[0].trim()}); use paths relative to the vault root or env vars`, 'error', lineOf(t, m.index));
    if (!f.startsWith('scripts/repo-check')) for (const o of OLD_VAULT) if (t.includes(o)) add(f, `mentions the old vault (${o.trim()}); point at the new path or drop it`);
    if (/\.md$/i.test(f) && (/^(domains|profiles|checklists|queue)\//.test(f) || ['CLAUDE.md', 'index.md', 'lessons.md'].includes(f))) {
      for (const mm of t.matchAll(/`([\w.-]+(?:\/[\w.@-]+)+\/?)`/g)) {
        const p = mm[1].replace(/\/$/, '');
        if (!tops.has(p.split('/')[0]) || /^(state|archive)\//.test(p) || /YYYY|\.\.\./.test(p)) continue;
        if (ignored.some(i => p === i.replace(/\/$/, '') || p.startsWith(i.replace(/\/$/, '') + '/'))) continue;
        if (!has(p)) add(f, `names ${p} which does not exist`, 'error', lineOf(t, mm.index));
      }
    }
    if (/\.html$/i.test(f)) for (const [, pkg, ver] of t.matchAll(CDN))
      if (!/^@\d+\.\d+\.\d+(?:[-+][\w.]+)?$/.test(ver || '')) add(f, `CDN library ${pkg}${ver || ''} is not pinned to an exact version`);
  }
  const embedded = new Set([...corpus.matchAll(/[\w%. -]+\.(?:png|jpe?g|webp|gif)/gi)].map(m => basename(decodeURIComponentSafe(m[0].trim()))));
  for (const f of files) if (IMG.test(f) && !CONTENT_SKIP.test(f) && !embedded.has(basename(f))) add(f, 'image not referenced by any note or page; delete it or link it');

  // Notes must be reachable: linked from another note, index or router.json.
  const mdAll = files.filter(f => /\.md$/i.test(f));
  const isNoteLike = (f) => /^(domains|profiles|checklists)\/.*\.md$/.test(f) && !/(^|\/)README\.md$/.test(f);
  for (const f of mdAll.filter(isNoteLike)) {
    const name = basename(f), stem = f.replace(/\.md$/, '');
    const linked = files.some(o => o !== f && (/\.md$/i.test(o) || o === 'router.json') && !CONTENT_SKIP.test(o) &&
      (read(o).includes(f) || read(o).includes(stem) || (dirname(o) === dirname(f) && read(o).includes(name)) || read(o).includes(`/${name}`) || read(o).includes(`(${name})`)));
    if (!linked) add(f, 'orphan note: link it from its domain index.md (unlinked note = lost note)');
  }

  routerChecks(root, read, has, add);
  lessonsChecks(read('lessons.md'), add);
  logChecks(read('log.md'), add);
  const cl = read('CLAUDE.md').split('\n').length, il = read('index.md').split('\n').length;
  if (cl >= 160 && cl <= 200) add('CLAUDE.md', `${cl} lines, 80% of the 200 cap: move rules into notes before it fails`, 'warn');
  if (il >= 120 && il <= 150) add('index.md', `${il} lines, 80% of the 150 cap: split by domain before it fails`, 'warn');

  toolChecks(root, files, read, has, add);
  return out;
}

function decodeURIComponentSafe(s) { try { return decodeURIComponent(s); } catch { return s; } }
const lineOf = (t, i) => t.slice(0, i).split('\n').length;

function routerChecks(root, read, has, add) {
  if (!has('router.json')) return;
  let j; try { j = JSON.parse(read('router.json')); } catch { return; } // vault-lint reports invalid JSON
  const ids = new Set(), words = new Map();
  for (const r of j.routes || []) {
    if (!r.id) add('router.json', 'route without id');
    else if (ids.has(r.id)) add('router.json', `duplicate route id ${r.id}`); else ids.add(r.id);
    if (r.skill && !has(`.claude/skills/${r.skill}/SKILL.md`)) add('router.json', `route ${r.id}: skill ${r.skill} has no .claude/skills/${r.skill}/SKILL.md`);
    if (!(r.words || []).length) add('router.json', `route ${r.id}: no trigger words`);
    for (const w of r.words || []) {
      const k = String(w).toLowerCase();
      if (words.has(k) && words.get(k) !== r.id) add('router.json', `word "${k}" is on routes ${words.get(k)} and ${r.id} (both load)`, 'warn');
      else words.set(k, r.id);
    }
  }
}

function lessonsChecks(t, add) {
  const seen = new Set();
  t.split(/\r?\n/).forEach((l, i) => {
    if (!l.startsWith('- ')) return;
    const m = l.match(LESSON);
    if (!m) return add('lessons.md', 'lesson must be `- [L-NNN] (h:N x:N) YYYY-MM-DD rule — trigger: words`', 'error', i + 1);
    if (seen.has(m[1])) add('lessons.md', `duplicate lesson id L-${m[1]}`, 'error', i + 1);
    seen.add(m[1]);
    if (l.length > 400) add('lessons.md', `lesson is ${l.length} chars (cap 400): shorten to rule + trigger`, 'error', i + 1);
  });
}

function logChecks(t, add) {
  t.split(/\r?\n/).forEach((l, i) => {
    if (l.startsWith('## ') && !/^## \[\d{4}-\d{2}-\d{2}\] \S.* \/ \S/.test(l) && l !== '## Archived months')
      add('log.md', 'log heading must be `## [YYYY-MM-DD] op / title`', 'error', i + 1);
  });
}

function toolChecks(root, files, read, has, add) {
  const tools = [...new Set(files.filter(f => /^tools\/[^/]+\/[^/]+\//.test(f)).map(f => f.split('/').slice(0, 3).join('/')))];
  const outside = files.filter(f => (/\.md$/i.test(f) || f === 'router.json') && !f.startsWith('tools/') && !CONTENT_SKIP.test(f)).map(read).join('\n');
  const guideText = outside + files.filter(f => /^tools\/.*\.md$/i.test(f)).map(read).join('\n');
  const info = tools.map(dir => {
    const key = dir.slice(6), name = key.split('/')[1];
    const own = files.filter(f => f.startsWith(dir + '/'));
    let meta = {};
    if (!has(`${dir}/tool.json`)) add(dir, 'missing tool.json (name, what, run, prompt, url)');
    else { try { meta = JSON.parse(read(`${dir}/tool.json`)); } catch (e) { add(`${dir}/tool.json`, `invalid JSON: ${e.message}`); } }
    if ('uses' in meta) add(dir, "'uses' is banned; tools never depend on each other");
    // Code only: READMEs may link up to their domain notes; code must never reach another tool or leave its folder.
    const body = own.filter(f => TEXT.test(f) && !/\.md$/i.test(f)).map(f => [f, read(f)]);
    return { dir, key, name, meta, body, all: body.map(b => b[1]).join('\n') };
  });
  for (const t of info) {
    if (!outside.includes(`${t.dir}/`) && !outside.includes(t.dir + ')') && !outside.includes(t.dir + '`') && !outside.includes(t.dir + ' '))
      add(t.dir, 'no note links it (tools/<cat>/<tool>/ in a domain note or index), so no task can reach it');
    for (const [f, x] of t.body) for (const m of x.matchAll(/(?:\.\.[/\\])+[\w./\\-]*/g)) {
      const p = posix.normalize(posix.join(posix.dirname(f), m[0].replace(/\\/g, '/')));
      if (!p.startsWith(t.dir + '/') && p !== t.dir) { add(f, `'../' path leaves its tool folder (${m[0]})`); break; }
    }
    for (const o of info) {
      if (o === t || !t.all.includes(o.name)) continue;
      const n = esc(o.name);
      if (new RegExp(`(^|[^\\w-])${esc(o.key)}($|[^\\w-])`).test(t.all) || new RegExp(`(import|from|require\\(|source|open\\()\\s*['"]?[\\w./-]*\\b${n}\\b`).test(t.all))
        add(t.dir, `references tool ${o.dir}; tools must stay separate`);
    }
    const readme = read(`${t.dir}/README.md`);
    for (const f of files.filter(f => f.startsWith(`${t.dir}/docs/`) && /\.md$/i.test(f)))
      if (!readme.includes(`docs/${basename(f)}`)) add(f, 'its tool README does not link it');
    webChecks(t, files, read, add);
  }
}

// A tool page that runs in the hub loads fast on a phone: modules found only after another module downloads are
// modulepreloaded, preloads point at real files, CDN libraries are pinned (checked for every .html above).
function webChecks(t, files, read, add) {
  const web = t.meta.web;
  if (!Array.isArray(web) || !/\.html$/i.test(web[0] || '')) return;
  const entry = `${t.dir}/${web[0]}`, page = read(entry), base = posix.dirname(entry);
  const pre = new Set([...page.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)].map(m => m[1])
    .filter(h => !/^(https?:|\/\/)/.test(h)).map(h => posix.normalize(posix.join(base, h))));
  for (const p of pre) if (!files.includes(p)) add(entry, `modulepreload ${posix.relative(t.dir, p)} does not exist`);
  const local = (src, spec) => (/^\.\.?\//.test(spec) ? posix.normalize(posix.join(posix.dirname(src), spec)) : null);
  const inline = [...page.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  const todo = [...inline.matchAll(STATIC_IMPORT)].map(m => local(entry, m[1])).filter(Boolean);
  const seen = new Set(todo);
  while (todo.length) {
    const src = todo.pop();
    for (const m of read(src).matchAll(STATIC_IMPORT)) {
      const p = local(src, m[1]);
      if (p && !seen.has(p)) {
        seen.add(p); todo.push(p);
        if (!pre.has(p)) add(entry, `${posix.relative(t.dir, p)} is imported by ${posix.relative(t.dir, src)} but not modulepreloaded (one more round trip on every open)`);
      }
    }
  }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
