---
summary: Fill-in templates for crew prep and build specs, so the brain writes each in seconds instead of composing prose.
updated: 2026-11-22
status: current
---
# Crew spec templates (copy, fill the <>, send; never add prose)

## Prep (Agent spawn, first message, <= 5 lines)
Prep brief (no files to write yet). Piece: <one line>.
In the vault root (absolute path) paste: <exact commands, e.g. `sed -n A,Bp file`, `grep -n "x" file`>. Then wait for the spec.

## Build (SendMessage, <= 15 lines)
Build spec. Files (absolute paths under the vault root): <paths>. Use the Edit/Write tools only. One pass, no retries, no research of your own, ~8 tool calls.
<OWNER MUST block, only for builds/models>
1. <file>: <insert/replace exact text, anchored on an exact existing line>
2. <file>: <...>
Check once: <command with known output>; expected: <value>
Report in your agent-file format.

## Known-good checks
- Node tests: `node --test --test-reporter=tap <files> 2>&1 | grep -E "^ *not ok|^# (pass|fail)"`
- JS syntax: `node --check <file>`
- Vault lint: `node scripts/vault.mjs status 2>&1 | grep '"lint"'`
- Counts: `grep -c "<pattern>" <file>`
