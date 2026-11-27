---
name: learn
description: 'Use right after any failure, error, slow task, owner complaint or Stop-hook LEARN message, and when a vault rule clearly helped. Records the lesson (and errors.md row) with the next id via scripts/vault.mjs. Never hand-edit lessons.md.'
---
# /learn — record what this task taught

1. Root cause in one line (why, not the symptom).
2. Record it (picks the next L-id, appends, never rewrites):
   `node scripts/vault.mjs learn --cause "<cause>" --rule "<rule that prevents it>" --trigger "<words, comma separated>" --domain <roblox|web|games|3d|vfx|audio|animation|images|math> --symptom "<what was seen>" --fix "<fix>"`
   Omit `--domain/--symptom/--fix` only for vault-wide lessons.
3. Already a lesson for it? Count it instead: `node scripts/vault.mjs bump L-012 --hurt` (or `--helped` when the rule saved time). Output says `promote: true` at 2 hits → move the rule into the domain playbook/checklist or a hook, then append ` → promoted: <path>` to that bullet.
4. Router missed it? `node scripts/vault.mjs words <route> <word...>`.
5. Slow (over the tier target)? The rule is a speed rule: put it in the domain playbook's speed section.

Then stop; don't redo the task unless it is still broken.

## Mobile
Same commands; commit with the session's work.
- Check that `learn` printed a new id before tagging `→ applied` (2026-11-27: a rejected over-long lesson made a tail-of-file sed target the previous lesson). Keep cause + rule under 350 chars.
