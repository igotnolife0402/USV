---
summary: Done criteria for vault edits: frontmatter, size caps, links resolve, indexed, one fact once, lint passes, log entry.
updated: 2026-11-21
status: current
triggers: [vault, lesson, note, index, lint, rollup]
---
# Checklist: vault
- [ ] Used the [vault-upkeep skill](.claude/skills/vault-upkeep/SKILL.md) for lint/rollup/lesson promotion.
- [ ] Every new/changed note has frontmatter: summary (<= 140 chars), `updated:` today, `status:`.
- [ ] Notes <= 150 lines (hard 200); CLAUDE.md <= 200; index.md <= 150.
- [ ] New note linked from its domain index; superseded notes keep the file + `superseded_by:`.
- [ ] One fact once: grep before adding; link instead of copying.
- [ ] lessons.md is append-only; allowed in-place edits are only bumping h:/x: counters and appending ` → promoted: <path>` or ` → dup of L-xxx` to a bullet's end; pruning is proposed in log.md, never deleted.
- [ ] Missed trigger words added to router.json; router.json still parses; replay the real ask: `echo '{"prompt":"<ask>"}' | node hooks/prompt-router.mjs` names the right route.
- [ ] No orphans: every new note is linked from an index; every skill/tool is named in [index.md](index.md).
- [ ] Owner correction: the rule it contradicts is replaced in the same edit (owner's latest word wins), plus a lesson.
## Verify (one)
- `node scripts/vault-lint.mjs` exits 0 (plus `node --test tests/` if hooks/scripts changed).
## Log
- log.md entry `## [date] vault / what changed`.
