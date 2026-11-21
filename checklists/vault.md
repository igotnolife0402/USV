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
- [ ] lessons.md: only appended bullets or bumped h/x counters; no rewrites.
- [ ] Missed trigger words added to router.json; router.json still parses.
## Verify (one)
- `node scripts/vault-lint.mjs` exits 0 (plus `node --test tests/` if hooks/scripts changed).
## Log
- log.md entry `## [date] vault / what changed`.
