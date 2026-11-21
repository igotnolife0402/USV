---
description: Record a lesson from an error, failed check or owner correction (fix note, lesson, router words) in one pass.
disable-model-invocation: true
---
Lesson: $ARGUMENTS

1. Fix the wrong or missing note first (domain `errors.md`/`playbook.md`, `profiles/owner.md` for owner preferences, or the checklist). Owner correction: replace the rule it contradicts in the same edit.
2. grep `lessons.md` for the same root cause. Found: bump its `h:`/`x:`; seen twice → promote to the playbook or a hook and append ` → promoted: <path>`. Not found: append `- [L-NNN] (h:0 x:0) YYYY-MM-DD cause → rule — trigger: words` (next id = highest + 1).
3. lessons.md is append-only: never reword, reorder or delete bullets; propose pruning in log.md.
4. Add the words that should have routed here to `router.json`, then replay the ask: `echo '{"prompt":"<ask>"}' | node hooks/prompt-router.mjs`.
5. Run `node scripts/vault-lint.mjs`, then append a log.md entry.
