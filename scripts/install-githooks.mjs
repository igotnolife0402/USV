#!/usr/bin/env node
// Point git at the repo's .githooks/ (pre-commit runs vault-lint + tests), like the old vault did each session.
// Usage: node scripts/install-githooks.mjs   (same as: git config core.hooksPath .githooks)
// session-start.mjs calls installGitHooks() on every session, so fresh clones (phone cloud sessions) get it too.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT } from '../hooks/lib.mjs';

export function installGitHooks(root = ROOT) {
  if (!existsSync(join(root, '.githooks', 'pre-commit'))) return false;
  const git = (...a) => spawnSync('git', a, { cwd: root, encoding: 'utf8', timeout: 5000, windowsHide: true });
  if (git('config', '--get', 'core.hooksPath').stdout?.trim() === '.githooks') return true;
  return git('config', 'core.hooksPath', '.githooks').status === 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(installGitHooks() ? 'core.hooksPath = .githooks' : 'not installed (no .githooks/pre-commit or not a git repo)');
}
