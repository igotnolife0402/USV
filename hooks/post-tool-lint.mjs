import { resolve, relative, isAbsolute } from 'node:path';
import { ROOT, readInput, emit, safe } from './lib.mjs';
import { lintFiles } from '../scripts/vault-lint.mjs';

safe(() => {
  const { tool_name: tool = '', tool_input: ti = {} } = readInput();
  if (!/^(Edit|Write|MultiEdit)$/.test(tool) || !/\.md$/i.test(ti.file_path || '')) return;
  const rel = relative(ROOT, resolve(ROOT, ti.file_path));
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return;
  const errs = lintFiles([rel]).filter(r => r.level === 'error');
  if (errs.length) emit({ decision: 'block', reason: `Vault lint failed:\n${errs.map(e => `${e.file}:${e.line ?? 0} ${e.msg}`).join('\n')}\nFix now.` });
});
