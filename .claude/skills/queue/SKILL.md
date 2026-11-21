---
name: queue
description: 'Use on the phone for any PC-only step (Roblox Studio, Blender, browser automation, local files, desktop apps), and on the PC to list or finish queued steps. Runs scripts/vault.mjs queue add|list|done so nothing is lost.'
---
# /queue — PC-only steps

- Phone (mobile mode), a step needs the PC: do the fallback first (profiles/mobile.md), then
  `node scripts/vault.mjs queue add "<exact step>" --context "<files, why, expected result>"`
  and report "done on mobile, PC step queued". Commit it with the session's work.
- PC: `node scripts/vault.mjs queue list` → do items the task depends on (or all, if the owner typed /pc alone) → `node scripts/vault.mjs queue done <n>` for each finished one.
- Items left on phone branches are listed by the PC SessionStart hook: merge that branch first.

## Mobile
This skill is mainly for mobile: never call the PC-only tool itself; the pre-tool hook blocks it.
