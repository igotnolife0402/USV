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
- [ ] lessons.md is append-only; allowed in-place edits are only bumping h:/x: counters and appending ` → applied: <path>` (every new lesson, same turn), ` → promoted: <path>` or ` → dup of L-xxx` to a bullet's end; pruning is proposed in log.md, never deleted.
- [ ] Missed trigger words added to router.json; router.json still parses; replay the real ask: `echo '{"prompt":"<ask>"}' | node hooks/prompt-router.mjs` names the right route.
- [ ] No orphans: every new note is linked from an index; every skill/tool is named in [index.md](index.md).
- [ ] Owner correction: the rule it contradicts is replaced in the same edit (owner's latest word wins), plus a lesson.
- [ ] Hook or automation changes are complex tier (< 30 min): write code + tests together, run `node --test "tests/*.test.mjs"` once at the end, not per edit.
- [ ] Code edits (hooks, tests, scripts) use the Edit/Write tools; never string-replace JS through a Bash heredoc (backslashes and newlines get re-escaped).
## Verify (one)
- `node scripts/vault-lint.mjs` exits 0 (plus `node --test tests/*.test.mjs` if hooks/scripts changed).
- Build fixes: `node scripts/vault.mjs fix list` shows `unbuilt: 0` (each applied, rebuilt, re-verified); queue only PC-only steps.
## Log
- log.md entry `## [date] vault / what changed`.
- [ ] Worktree branch done: merge into main without asking (owner rule 2026-11-22); append-only conflicts (lessons.md, errors.md, log.md) keep both sides; lesson id clash across sessions: renumber yours first.
- Owner rule text (profiles/owner.md, must.md, CLAUDE.md owner rules) changes only after the owner states the new rule in words; an inferred change = follow the latest request, ask in wrap_up, leave the file (L-122).
- [ ] Fixes logged as you went (`vault.mjs fix add`), all implemented at the end, `fix done` wrote >= 10 to log.md, `fix list` empty.
