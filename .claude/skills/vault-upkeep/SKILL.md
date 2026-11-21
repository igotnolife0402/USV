---
name: vault-upkeep
description: 'Use for vault maintenance: lint, monthly log rollup, splitting long notes, rebuilding indexes, deduping or superseding facts, promoting lessons, fixing router.json triggers. Also when lint fails or the owner says upkeep, tidy, clean vault, maintenance. Run as a sub-agent.'
---
# vault-upkeep — keep the vault small, true and routable

Run as a sub-agent (Agent tool, general-purpose) with this skill as the brief. Return <= 2k tokens: what changed (paths), what is proposed (needs owner OK), lint result.

## Steps (in order; skip a step with nothing to do)
1. Lint: `node scripts/vault-lint.mjs --all`. Fix every error (broken links, frontmatter, size caps). Warnings: fix if < 1 min each.
2. Rollup (first session of a month, or log.md > 150 lines): `node scripts/rollup.mjs` → moves last month's `log.md` entries to `archive/log-YYYY-MM.md`.
3. Split notes > 150 lines: cut by heading into `<note>-<topic>.md` in the same folder, each with full frontmatter (`summary`, `updated`, `status: current`, `triggers`); the original keeps a 3-5 line summary + links to the parts. Update links pointing into moved sections (`grep -rn "<note>.md" --include=*.md`).
4. Rebuild domain indexes: each `domains/<d>/index.md` lists every `.md` in its folder (one line: link + summary from frontmatter). Root `index.md` lists every domain + core file. Cap 150 lines.
5. Dedupe facts: grep for the same claim in two notes (same command, same API, same number). Keep it in the most specific note; replace the other with a link.
6. Supersede stale facts: a note contradicted by a newer one → set `status: superseded` + `superseded_by: <path>` in its frontmatter; don't delete. Facts with versions/dates older than 12 months → verify if cheap, else mark `(unverified since YYYY-MM)`.
7. Lessons (`lessons.md`, format `- [L-NNN] (h:H x:X) YYYY-MM-DD rule — trigger: words`):
   - lessons.md is append-only. The ONLY in-place edits allowed: bump `h:`/`x:` counters, and append ` → promoted: <path>` or ` → dup of L-xxx` to the end of a bullet. Never replace, reword, merge-delete or prune bullets.
   - Promote: same lesson seen twice (two bullets saying the same thing, or h >= 2) → copy the rule into the domain `playbook.md` (or propose a hook in `hooks/` if it is mechanically checkable), then append ` → promoted: <path>` to the bullet.
   - Near-duplicates: append ` → dup of L-xxx` to the newer bullet (keep both); bump counters on the older one if warranted.
   - Prune candidates (x > h, or no h increment and older than 60 days): PROPOSE in log.md and the report only; never remove them.
8. Router: for each recent `log.md` entry (last 30 days) whose task words did not hit a route, add the missing words to the matching route's `words` in `router.json` (lowercase, no duplicates, JSON stays valid: `node -e "JSON.parse(require('fs').readFileSync('router.json','utf8'))"`).
9. Re-run lint; must pass.
10. `log.md`: `## [YYYY-MM-DD] upkeep / vault` + 1-3 lines of what changed.

## Rules
- Never silently delete knowledge: supersede or propose.
- Never touch `archive/**` content except rollup output. Never edit `.orchestration/**`.
- Keep edits minimal; no rewording notes for style.
- `updated:` = today on every note you change.

## Verification (one check)
`node scripts/vault-lint.mjs --all` exits 0 after the changes.

## Done-check (`checklists/vault.md`)
- [ ] Lint passes. [ ] No note > 200 lines. [ ] Indexes list every note. [ ] Proposals listed, not executed. [ ] log.md line.

## Time target
< 5 min (medium). Monthly full pass < 10 min.

## Mobile
Same steps: everything is repo files + node scripts in the cloud session. If `node` is unavailable, do steps 3-8 by reading files and queue `- [ ] YYYY-MM-DD node scripts/vault-lint.mjs --all && node scripts/rollup.mjs — mobile upkeep`.
