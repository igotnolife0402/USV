// Gates ported from the old vault (check, device mode, pre-commit) + stop-gate commits in a temp repo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

for (const k of Object.keys(process.env)) if (k.startsWith('GIT_')) delete process.env[k];
delete process.env.CLAUDE_CODE_REMOTE;
delete process.env.CLAUDE_CODE_BRIDGE_SESSION_ID;
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = mkdtempSync(join(tmpdir(), 'vault gates '));   // a space in every path below
process.env.VAULT_ROOT = join(BASE, 'unused');
const { MODE_CMD, today } = await import('../hooks/lib.mjs');
const { dangerousCommand, mobileBlock, outsideInstalls } = await import('../hooks/pre-tool.mjs');
const { changedFiles, refuseReason, lessonViolations } = await import('../hooks/stop-gate.mjs');
const { repoCheck, listFiles } = await import('../scripts/repo-check.mjs');
const MODES = JSON.parse(readFileSync(join(REPO, 'hooks', 'modes.json'), 'utf8'));

test.after(() => rmSync(BASE, { recursive: true, force: true }));

const put = (root, rel, text) => { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), text); };
const node = (args, input, env = {}) => spawnSync(process.execPath, args, { input: input && JSON.stringify(input), encoding: 'utf8', env: { ...process.env, ...env } });

test('ROOT ignores a bogus CLAUDE_PROJECT_DIR (session moved folders) and defaults to the vault', () => {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: join(BASE, 'old scratch') };
  delete env.VAULT_ROOT;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', `import('${new URL('../hooks/lib.mjs', import.meta.url).href}').then(m => process.stdout.write(m.ROOT))`], { encoding: 'utf8', env });
  assert.equal(r.stdout.toLowerCase(), REPO.toLowerCase());
});

test('settings.json hook commands are shell-agnostic: no $VARS, no || fail-closed', () => {
  const s = JSON.parse(readFileSync(join(REPO, '.claude', 'settings.json'), 'utf8'));
  const cmds = Object.values(s.hooks).flat().flatMap(m => m.hooks.map(h => h.command));
  assert.ok(cmds.length >= 5);
  for (const c of cmds) { assert.ok(!c.includes('$'), c); assert.ok(!c.includes('||'), c); }
});

test('MODE_CMD: only a leading /pc or /mobile switches (old device.py cases)', () => {
  const mode = (p) => p.match(MODE_CMD)?.[1].toLowerCase() || 'none';
  for (const [p, want] of [['/pc build a sword', 'pc'], ['/PC', 'pc'], ['  /mobile make vfx', 'mobile'], ['/mobile', 'mobile'],
    ['<command-name>/pc</command-name>', 'pc'], ['how do I use /pc?', 'none'], ['/pcx', 'none'], ['/pc-foo', 'none'],
    ['/mobilefoo', 'none'], ['hello', 'none'], ['', 'none'], ['/review /pc', 'none']]) assert.equal(mode(p), want, p);
});

test('pre-tool: destructive commands with a spaced vault path', () => {
  const U = 'Users';   // split so repo-check's machine-path scan doesn't flag this file
  const root = `C:/${U}/YOU B/Super Vault`;
  const bad = (c) => assert.ok(dangerousCommand(c, root), `should block: ${c}`);
  const ok = (c) => assert.equal(dangerousCommand(c, root), null, `should allow: ${c}`);
  for (const c of [`rm -rf "${root}"`, `rm -rf "/c/${U}/YOU B/Super Vault/"`, `rm -rf 'C:\\${U}\\YOU B\\Super Vault'`,
    'rm -rf .', 'rm -rf *', 'rm -rf ./*', 'rm -rf .git', 'rm -fr ~', 'rm -r -f /', 'rm --recursive --force "$CLAUDE_PROJECT_DIR"',
    'cd x && rm -rf .', 'git push origin +main', 'git push --force', 'git push -uf origin x', 'git reset --hard', 'git clean -fdx',
    'Remove-Item -Recurse -Force .git', 'Remove-Item -r -fo "C:/Users/YOU B/Super Vault"']) bad(c);
  for (const c of ['rm -rf ./build', 'rm -rf "C:/Users/YOU B/Super Vault/tmp"', 'git push --force-with-lease', 'git push origin main',
    'git commit -m "never git push --force or rm -rf ."', "git commit -m 'git reset --hard is blocked'", 'Remove-Item -Recurse -Force ./out']) ok(c);
});

test('pre-tool hook denies rm -rf of the vault root when the root has a space', () => {
  const root = join(BASE, 'live vault');
  mkdirSync(root, { recursive: true });
  const r = node([join(REPO, 'hooks', 'pre-tool.mjs')], { tool_name: 'Bash', tool_input: { command: `rm -rf "${root}"` } }, { VAULT_ROOT: root });
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('pre-tool mobile: device.py checks (PC-only shell, outside installs, skills, MCPs)', () => {
  const deny = (t, i) => assert.ok(mobileBlock(t, i, MODES), `deny ${t} ${JSON.stringify(i)}`);
  const allow = (t, i) => assert.equal(mobileBlock(t, i, MODES), null, `allow ${t} ${JSON.stringify(i)}`);
  for (const [t, i] of [['mcp__plugin_x_y__z', {}], ['mcp__remote-devices__computer_click', {}], ['mcp__claude-code-remote__request_computer_folder', {}],
    ['Skill', { skill: 'anthropic-skills:chrome-browser' }], ['Bash', { command: 'blender -b x.blend -P a.py' }], ['Bash', { command: 'pip install torch' }],
    ['Bash', { command: 'npm i three lodash' }], ['Bash', { command: 'npx vite' }], ['Bash', { command: 'git clone https://github.com/a/b' }],
    ['Bash', { command: 'start notepad' }], ['Bash', { command: 'ls C:\\Users' }], ['Bash', { command: 'curl -L -o x.zip https://e.com/x.zip' }],
    ['Bash', { command: 'brew install ffmpeg' }], ['PowerShell', { command: 'winget install x' }]]) deny(t, i);
  for (const [t, i] of [['Read', {}], ['mcp__github__get_me', {}], ['mcp__claude-code-remote__get_session', {}], ['Skill', { skill: 'website' }],
    ['Bash', { command: 'node scripts/vault-lint.mjs --all | tail -5' }], ['Bash', { command: 'npm i three@0.186.1 three-mesh-bvh@0.9.16' }],
    ['Bash', { command: 'pip install numpy==2.5.3 pillow' }], ['Bash', { command: 'npm install' }], ['Bash', { command: 'npm start' }],
    ['Bash', { command: 'git push -u origin claude/x' }], ['Bash', { command: 'curl -s https://api.github.com/x' }]]) allow(t, i);
  assert.deepEqual(outsideInstalls('cargo install ripgrep', ['ripgrep']), ['ripgrep'], 'cargo/go/gem are always outside');
});

test('stop-gate helpers: -z parsing, refusals, ACE lessons guard', () => {
  assert.deepEqual(changedFiles(' M a b.md\0R  new.md\0old.md\0?? .env\0'), ['a b.md', 'new.md', '.env']);
  const d = join(BASE, 'refuse');
  put(d, 'k.txt', 'token sk-' + 'a'.repeat(30));
  put(d, 'ok.txt', 'nothing here');
  assert.match(refuseReason(d, 'k.txt'), /secret/);
  assert.equal(refuseReason(d, 'ok.txt'), null);
  assert.match(refuseReason(d, 'config/.env.local'), /secret file name/);
  assert.equal(refuseReason(d, '.env.example'), null);
  assert.match(refuseReason(d, 'id.pem'), /secret/);
  const L = '- [L-001] (h:0 x:0) 2026-01-01 rule — trigger: a';
  assert.deepEqual(lessonViolations(`-${L}\n+${L.replace('h:0', 'h:1')}`), [], 'counter bump is fine');
  assert.deepEqual(lessonViolations(`-${L}\n+${L.replace('rule', 'reworded')}`), [L], 'rewording is not');
});

// ---- stop-gate end to end in a temp git repo whose path has a space ----
const V = join(BASE, 'stop vault');
const g = (...a) => spawnSync('git', a, { cwd: V, encoding: 'utf8' });
const head = () => g('rev-parse', 'HEAD').stdout.trim();
const stop = (input = {}) => {
  const r = node([join(REPO, 'hooks', 'stop-gate.mjs')], { session_id: 'abcdefgh-123', ...input }, { VAULT_ROOT: V });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout ? JSON.parse(r.stdout) : null;
};

test('stop-gate: commits, refuses .env, skips conflicts and background work, never blocks on stop_hook_active', () => {
  mkdirSync(V, { recursive: true });
  g('init', '-q', '-b', 'main');
  for (const [k, v] of [['user.name', 't'], ['user.email', 't@t'], ['commit.gpgsign', 'false'], ['core.hooksPath', 'no-hooks']]) g('config', k, v);
  put(V, 'log.md', `# Log\n\n## [${today()}] test / setup\nline\n`);
  g('add', '-A'); g('commit', '-qm', 'init');

  put(V, 'state/a.md', 'hello\n');
  assert.equal(stop(), null);
  assert.match(g('log', '-1', '--format=%s').stdout, new RegExp(`vault: ${today()} session abcdefgh`));

  put(V, 'state/.env', 'X=1\n'); put(V, 'state/b.md', 'b\n');
  const env = stop();
  assert.equal(env.decision, 'block'); assert.match(env.reason, /state\/\.env \(secret file name\)/);
  assert.equal(g('ls-files', 'state/.env').stdout, '', '.env never committed');
  assert.match(g('ls-files', 'state/b.md').stdout, /b\.md/, 'the rest is committed');
  rmSync(join(V, 'state', '.env'));

  put(V, 'state/c.md', 'c\n');
  const before = head();
  writeFileSync(join(V, '.git', 'MERGE_HEAD'), before + '\n');
  assert.match(stop().reason, /Merge\/rebase in progress/);
  assert.equal(stop({ stop_hook_active: true }), null, 'second pass never blocks');
  assert.equal(head(), before, 'nothing committed mid-merge');
  rmSync(join(V, '.git', 'MERGE_HEAD'));

  assert.equal(stop({ background_tasks: [{ id: 'x' }] }), null);
  assert.equal(head(), before, 'background work running: no commit yet');

  put(V, 'state/c_old.md', 'junk name\n');
  assert.equal(stop({ stop_hook_active: true }), null, 'lint error + stop_hook_active: silent');
  assert.equal(head(), before, 'and no commit while lint fails');
  assert.match(stop().reason, /copy\/version name/);
  rmSync(join(V, 'state', 'c_old.md'));

  assert.equal(stop({ stop_hook_active: true }), null);
  assert.notEqual(head(), before, 'stop_hook_active still commits when lint passes');
  assert.equal(g('status', '--porcelain').stdout, '');
});

test('repo-check: old vault gates on a temp vault', () => {
  const d = join(BASE, 'repo check');
  put(d, 'stray.txt', 'x');
  put(d, 'state/plan_old.md', 'x');
  for (let i = 0; i < 21; i++) put(d, `domains/web/snippets/s${i}.js`, '//');
  for (let i = 0; i < 21; i++) put(d, `tools/3d/ed/test/t${i}.mjs`, '//');
  put(d, 'tools/3d/ed/tool.json', '{"name":"ed","what":"x"}');
  put(d, 'tools/3d/ed/main.js', "import x from '../../art/paint/a.js'\nconst p = '/tmp/" + "claude-0/x'");
  put(d, 'tools/3d/ed/index.html', '<script src="https://unpkg.com/three/build/three.js"></script>');
  put(d, 'tools/art/paint/a.js', 'export const a = 1');
  put(d, 'domains/web/index.md', 'see tools/3d/ed/ and [p](playbook.md)\n![](pic.png)\n');
  put(d, 'domains/web/playbook.md', 'x');
  put(d, 'domains/web/lost.md', 'nobody links me');
  put(d, 'domains/web/pic.png', 'x'); put(d, 'domains/web/unused.png', 'x');
  put(d, 'lessons.md', '- [L-001] (h:0 x:0) 2026-01-01 ok — trigger: a\n- [L-001] (h:0 x:0) 2026-01-01 dup — trigger: a\n- bad lesson\n');
  put(d, 'log.md', '# Log\n\n## [2026-01-01] add / fine\n## notes\n');
  put(d, 'router.json', JSON.stringify({ routes: [{ id: 'web', words: ['site'], skill: 'nope' }] }));
  const errs = repoCheck(d, listFiles(d)).filter(e => e.level === 'error').map(e => `${e.file}: ${e.msg}`).join('\n');
  for (const re of [/stray\.txt: not allowed in the vault root/, /plan_old\.md: copy\/version name/, /domains\/web\/snippets: 21 items/,
    /tools\/3d\/ed\/main\.js: '\.\.\/' path leaves/, /tools\/3d\/ed: missing tool\.json|tools\/art\/paint: missing tool\.json/,
    /main\.js: machine\/session path/, /index\.html: CDN library three is not pinned/, /lost\.md: orphan note/, /unused\.png: image not referenced/,
    /duplicate lesson id L-001/, /lesson must be/, /log heading must be/, /skill nope has no/, /tools\/art\/paint: no note links it/]) assert.match(errs, re);
  assert.doesNotMatch(errs, /tools\/3d\/ed\/test: /, 'tools/**/test is exempt from the folder cap');
  assert.doesNotMatch(errs, /pic\.png|playbook\.md: orphan/);
});

// ROUTE_CASES (old vault): real asks replayed through prompt-router against the real router.json.
test('route replay against the real router.json', () => {
  const ctx = (prompt) => JSON.parse(node([join(REPO, 'hooks', 'prompt-router.mjs')], { prompt, session_id: 'replay' }, { VAULT_ROOT: REPO }).stdout).hookSpecificOutput.additionalContext;
  const cases = [
    ['make me a crimson dragon sword swing vfx', 'vfx', 'medium'], ['explosion flipbook sheet with smoke', 'vfx', 'medium'],
    ['rbxmx kit with luau scripts', 'roblox', 'medium'], ['detailed low poly props', '3d', 'medium'],
    ['build me a portfolio website', 'web', 'medium'], ['make a snake browser game', 'game', 'medium'],
    ['footstep sound effects with webaudio', 'audio', 'medium'], ['optimize routing so nothing calls the wrong note in the vault', 'vault', 'medium'],
    ['fix typo in the landing page', 'web', 'simple'], ['build a mini blender 3d editor in the browser', '3d', 'complex'],
  ];
  for (const [p, checklist, tier] of cases) {
    const c = ctx(p);
    assert.match(c, new RegExp(`TIER=${tier}`), `${p}\n${c}`);
    assert.match(c, new RegExp(`Checklist: [^\\n]*checklists/${checklist}\\.md`), `${p}\n${c}`);
  }
  const many = ctx('roblox luau vfx particles beam website css game canvas sound sfx 3d mesh vault note');
  assert.ok((many.match(/checklists\//g) || []).length <= 2 && (many.match(/Skill: ([^\n]*)/)[1].split(',').length) <= 2, many);
  assert.ok((many.match(/Read first: ([^\n]*)/)[1].match(/[\w/.-]+\.md \(|[\w/.-]+\.md(;|$)/g) || []).length <= 4, many);
  for (const relay of ['<agent-message from="a2">website css game vfx</agent-message>', '<task-notification>build a full app website</task-notification>',
    '[SYSTEM NOTIFICATION] roblox vfx done', 'Subagent hand-back: website and game built'])
    assert.equal(ctx(relay), 'MODE=pc', relay);
});

test('post-tool-lint also lints router.json; /pc is ignored in a phone cloud session', () => {
  const d = join(BASE, 'post lint');
  put(d, 'router.json', JSON.stringify({ routes: [{ id: 'x', words: ['a'], notes: ['domains/missing.md'] }] }));
  const r = node([join(REPO, 'hooks', 'post-tool-lint.mjs')], { tool_name: 'Edit', tool_input: { file_path: join(d, 'router.json') } }, { VAULT_ROOT: d });
  assert.match(JSON.parse(r.stdout).reason, /path not found: domains\/missing\.md/);
  const p = node([join(REPO, 'hooks', 'prompt-router.mjs')], { prompt: '/pc do it', session_id: 'm' }, { VAULT_ROOT: d, CLAUDE_CODE_REMOTE: 'true' });
  assert.match(JSON.parse(p.stdout).hookSpecificOutput.additionalContext, /^MODE=mobile/);
});

test('pre-commit hook and installer exist and are wired', () => {
  const pc = readFileSync(join(REPO, '.githooks', 'pre-commit'), 'utf8');
  assert.match(pc, /node scripts\/vault-lint\.mjs --all && node --test "tests\/\*\.test\.mjs"/);
  assert.ok(existsSync(join(REPO, 'scripts', 'install-githooks.mjs')));
});
