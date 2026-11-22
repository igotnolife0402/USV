---
summary: Done criteria for Roblox work: server authority, validated remotes, zero Output errors in playtest; Rojo layout + queue on mobile.
updated: 2026-11-22
status: current
triggers: [roblox, luau, studio, rojo, obby, tycoon]
---
# Checklist: roblox
- [ ] `node tools/roblox/rbxmx-check.mjs <file>.rbxmx` passes for every .rbxmx handed over.
- [ ] Used the [roblox skill](.claude/skills/roblox/SKILL.md); followed the [roblox playbook](domains/roblox/playbook.md).
- [ ] Owner floor met ([profiles/owner.md](profiles/owner.md)): full detail, no placeholders, scope exactly as asked, original (no clones).
- [ ] Models: [detail floor](domains/3d/detail.md) gate passes (`tools/3d/detail/detail.py` or `tools/roblox/detail-check.mjs`): custom meshes, textures, many combined parts.
- [ ] New game: [game post-mortem](domains/roblox/game-postmortem.md) rules applied in the plan (player count, fun systems, spectate, markers, palette).
- [ ] Bots: [bot-watch](tools/roblox/bot-watch.luau) numbers meet the targets in [bots](domains/roblox/bots.md) on every game with hazards.
- [ ] 10-second test: a new player knows the goal within 10 s without reading; first win in minutes.
- [ ] UI at phone 844x390: text >= 14 px, taps >= 38 px, no overlaps or clipped text; every shop item shows effect + price; no empty tabs.
- [ ] UI and hero builds come from a decided palette + layout (+ type), references first; builds also pass [checklists/3d.md](checklists/3d.md).
- [ ] Before release: simulated players (impatient 8-year-old, sound off, small phone, $10 allowance, "everything is AI" teen) find no blocker.
- [ ] Low-end phone: 10 heaviest models optimised without changing the look.
- [ ] Server authority: game state, currency, damage on server; client only input/UI/VFX.
- [ ] Remotes validated server-side (type, range, rate); never trust client values.
- [ ] Scripts in correct containers (ServerScriptService / StarterPlayerScripts / ReplicatedStorage modules).
- [ ] DataStore calls in pcall with retry; save on PlayerRemoving + BindToClose.
- [ ] No deprecated APIs (wait → task.wait, spawn → task.spawn).
## Verify (one)
- pc: Studio MCP playtest, read Output: zero errors, feature works once.
- mobile: .luau in Rojo layout, logic reviewed; append "sync + playtest in Studio" to queue/pc.md.
## Log
- log.md entry (place/feature, files). Errors → [roblox errors](domains/roblox/errors.md) + lesson.
