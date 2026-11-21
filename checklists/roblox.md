---
summary: Done criteria for Roblox work: server authority, validated remotes, zero Output errors in playtest; Rojo layout + queue on mobile.
updated: 2026-11-21
status: current
triggers: [roblox, luau, studio, rojo, obby, tycoon]
---
# Checklist: roblox
- [ ] Used the [roblox skill](.claude/skills/roblox/SKILL.md); followed the [roblox playbook](domains/roblox/playbook.md).
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
