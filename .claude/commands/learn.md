---
description: Record a lesson from an error, failed check or owner correction (fix note, lesson, router words) in one pass.
disable-model-invocation: true
---
Lesson: $ARGUMENTS

1. Fix the wrong or missing note first (domain `errors.md`/`playbook.md`, `profiles/owner.md` for owner preferences, or the checklist). Owner correction: replace the rule it contradicts in the same edit.
2. grep `lessons.md` for the same root cause. Found: `node scripts/vault.mjs bump L-xxx --hurt|--helped`; `promote: true` → promote to the playbook or a hook and append ` → promoted: <path>`. Not found: `node scripts/vault.mjs learn --cause ... --rule ... --trigger ...` (it picks the id and format; see the `learn` skill).
3. lessons.md is append-only: never reword, reorder or delete bullets; propose pruning in log.md.
4. Add the words that should have routed here: `node scripts/vault.mjs words <route> <word...>`, then confirm with `node scripts/vault.mjs route "<ask>"`.
5. Run `node scripts/vault-lint.mjs`, then append a log.md entry.
