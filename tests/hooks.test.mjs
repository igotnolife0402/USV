import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = mkdtempSync(join(tmpdir(), 'vault-test-'));
process.env.CLAUDE_PROJECT_DIR = TMP;
delete process.env.CLAUDE_CODE_REMOTE;
delete process.env.CLAUDE_CODE_BRIDGE_SESSION_ID;
const { getMode, setMode, fm } = await import('../hooks/lib.mjs');
const { lintFiles } = await import('../scripts/vault-lint.mjs');
const { rollup } = await import('../scripts/rollup.mjs');

const put = (rel, text) => { mkdirSync(dirname(join(TMP, rel)), { recursive: true }); writeFileSync(join(TMP, rel), text); };
const FM = (s = 'a note') => `---\nsummary: ${s}\nupdated: 2025-01-01\nstatus: current\n---\n`;
mkdirSync(join(TMP, 'hooks'), { recursive: true });
copyFileSync(join(REPO, 'hooks', 'modes.json'), join(TMP, 'hooks', 'modes.json'));

function run(hook, input, env = {}) {
  const r = spawnSync(process.execPath, [join(REPO, 'hooks', hook)], {
    input: JSON.stringify(input), encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: TMP, ...env },
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout ? JSON.parse(r.stdout) : null;
}
const decision = (o) => o?.hookSpecificOutput?.permissionDecision;

test.after(() => rmSync(TMP, { recursive: true, force: true }));

test('getMode: env var and same-session override', () => {
  assert.equal(getMode('s1').mode, 'pc');
  process.env.CLAUDE_CODE_REMOTE = 'true';
  assert.equal(getMode('s1').mode, 'mobile');
  setMode('pc', 's1');
  assert.equal(getMode('s1').mode, 'pc');
  assert.equal(getMode('other').mode, 'mobile', 'override must not leak to other sessions');
  process.env.CLAUDE_CODE_BRIDGE_SESSION_ID = 'x';
  assert.equal(getMode('other').remote, true);
  delete process.env.CLAUDE_CODE_REMOTE;
  delete process.env.CLAUDE_CODE_BRIDGE_SESSION_ID;
  rmSync(join(TMP, '.claude', '.mode'));
});

test('fm parses lists and strings', () => {
  const { data, body } = fm('---\nsummary: hi\ntriggers: [a, b]\n---\nbody');
  assert.deepEqual(data.triggers, ['a', 'b']);
  assert.equal(data.summary, 'hi');
  assert.equal(body, 'body');
});

test('prompt-router: routes, tiers and /mobile override', () => {
  put('router.json', JSON.stringify({
    routes: [{ id: 'web', words: ['website', 'css'], notes: ['domains/web/index.md'], checklist: 'checklists/web.md', skill: 'website' }],
    tiers: { simple: ['explain', 'quick'], complex: ['editor', 'full app'] },
  }));
  put('domains/web/index.md', FM('web entry point'));
  const ctx = (prompt) => run('prompt-router.mjs', { prompt, session_id: 'r1' }).hookSpecificOutput.additionalContext;

  const web = ctx('build me a website with a hero');
  assert.match(web, /TIER=medium \(target: <5 min\)/);
  assert.match(web, /domains\/web\/index\.md \(web entry point\)/);
  assert.match(web, /Checklist: checklists\/web\.md/);
  assert.match(web, /Skill: website/);
  assert.ok(web.length < 1500);

  assert.match(ctx('quick: explain flexbox'), /TIER=simple/);
  assert.match(ctx('make a full app'), /TIER=complex/);
  assert.match(ctx('x'.repeat(700)), /TIER=complex/);
  assert.doesNotMatch(ctx('websites are cool'), /Read first/, 'word boundary');
  assert.match(ctx('/mobile build a website'), /^MODE=mobile/);
  assert.match(ctx('next prompt'), /^MODE=mobile/);
  rmSync(join(TMP, '.claude', '.mode'));
});

test('pre-tool: PC-only tools by mode', () => {
  const inp = { tool_name: 'mcp__blender__execute_blender_code', tool_input: {}, session_id: 'p1' };
  const d = run('pre-tool.mjs', inp, { CLAUDE_CODE_REMOTE: 'true' });
  assert.equal(decision(d), 'deny');
  assert.match(d.hookSpecificOutput.permissionDecisionReason, /MOBILE MODE.*three\.js/);
  assert.equal(run('pre-tool.mjs', inp), null);
});

test('pre-tool: dangerous bash and long notes denied in all modes', () => {
  const bash = (command) => decision(run('pre-tool.mjs', { tool_name: 'Bash', tool_input: { command } }));
  assert.equal(bash('git push --force origin main'), 'deny');
  assert.equal(bash('git push -f'), 'deny');
  assert.equal(bash('git reset --hard HEAD~1'), 'deny');
  assert.equal(bash('git clean -fd'), 'deny');
  assert.equal(bash('rm -rf /'), 'deny');
  assert.equal(bash('rm -rf ~'), 'deny');
  assert.equal(bash(`rm -rf "${TMP}"`), 'deny');
  assert.equal(bash('rm -rf ./build'), undefined);
  assert.equal(bash('git push origin main'), undefined);
  const write = (file_path) => decision(run('pre-tool.mjs', { tool_name: 'Write', tool_input: { file_path, content: 'x\n'.repeat(250) } }));
  assert.equal(write(join(TMP, 'domains', 'web', 'big.md')), 'deny');
  assert.equal(write(join(TMP, 'archive', 'log-2025-01.md')), undefined);
  assert.equal(write(join(TMP, '.claude', 'skills', 'x', 'SKILL.md')), undefined);
});

test('lint: missing frontmatter, broken link, over-cap note', () => {
  put('domains/web/nofm.md', '# no frontmatter\n');
  put('domains/web/broken.md', FM() + 'see [x](domains/web/missing.md) and [[domains/web/index]] and [ok](index.md)\n');
  put('domains/web/big.md', FM() + 'line\n'.repeat(210));
  put('domains/web/warn.md', FM() + 'line\n'.repeat(160));
  put('domains/web/bad.md', '---\nsummary: x\nupdated: 2999-01-01\nstatus: old\n---\n');
  const errs = (f) => lintFiles([f], TMP).filter(r => r.level === 'error').map(r => r.msg).join('|');
  assert.match(errs('domains/web/nofm.md'), /missing frontmatter/);
  assert.equal(errs('domains/web/broken.md'), 'broken link: domains/web/missing.md');
  assert.match(errs('domains/web/big.md'), /cap 200/);
  assert.equal(lintFiles(['domains/web/warn.md'], TMP)[0].level, 'warn');
  assert.match(errs('domains/web/bad.md'), /future.*status|status.*future/s);
  assert.equal(errs('domains/web/index.md'), '');
  for (const f of ['nofm', 'broken', 'big', 'warn', 'bad']) rmSync(join(TMP, 'domains', 'web', f + '.md'));
});

test('post-tool-lint blocks on a bad note', () => {
  put('profiles/pc.md', '# no fm\n');
  const out = run('post-tool-lint.mjs', { tool_name: 'Write', tool_input: { file_path: join(TMP, 'profiles', 'pc.md') } });
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /Vault lint failed/);
});

test('session-start: <= 8000 chars and shows PC QUEUE', () => {
  put('profiles/pc.md', FM('pc profile') + 'PC PROFILE BODY\n');
  put('index.md', FM('root') + 'index line\n'.repeat(1500));
  put('lessons.md', FM('lessons') + Array.from({ length: 15 }, (_, i) => `- [L-${String(i + 1).padStart(3, '0')}] (h:0 x:0) 2025-01-01 rule ${i + 1}`).join('\n'));
  put('queue/pc.md', FM('queue') + '- [x] 2025-01-01 done one\n- [ ] 2025-01-02 run studio — ctx\n');
  const ctx = run('session-start.mjs', { session_id: 's' }).hookSpecificOutput.additionalContext;
  assert.ok(ctx.length <= 8000, `length ${ctx.length}`);
  assert.match(ctx, /^MODE=pc/);
  assert.match(ctx, /PC QUEUE \(do these first\)\n- \[ \] 2025-01-02 run studio/);
  assert.doesNotMatch(ctx, /done one/);
  assert.match(ctx, /PC PROFILE BODY/);
  assert.doesNotMatch(ctx, /summary: pc profile/);

  put('index.md', FM('root') + 'short index\n');
  const small = run('session-start.mjs', { session_id: 's' }).hookSpecificOutput.additionalContext;
  assert.match(small, /L-015/);
  assert.doesNotMatch(small, /L-005\]/, 'only newest 10 lessons');
  const mob = run('session-start.mjs', { session_id: 's' }, { CLAUDE_CODE_REMOTE: 'true' }).hookSpecificOutput.additionalContext;
  assert.doesNotMatch(mob, /PC QUEUE/);
});

test('rollup archives old months idempotently', () => {
  put('log.md', '# Log\n\n## [2025-01-03] add / a\nold one\n\n## [2025-02-01] fix / b\nold two\n\n## [2025-03-05] add / c\nnew\n');
  assert.deepEqual(rollup(TMP, '2025-03-10'), ['2025-01', '2025-02']);
  const log = readFileSync(join(TMP, 'log.md'), 'utf8');
  assert.match(log, /## Archived months\n- 2025-01: .*\n- 2025-02: /);
  assert.match(log, /## \[2025-03-05\]/);
  assert.doesNotMatch(log, /old one/);
  assert.match(readFileSync(join(TMP, 'archive', 'log-2025-01.md'), 'utf8'), /old one/);
  assert.deepEqual(rollup(TMP, '2025-03-10'), []);
  assert.equal(readFileSync(join(TMP, 'log.md'), 'utf8'), log);
  assert.equal(lintFiles(['log.md'], TMP).length, 0, 'archive pointers resolve');
});
