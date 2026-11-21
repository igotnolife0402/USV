---
summary: Done criteria for VFX (Roblox particles/beams/trails, web shaders/particles): reads clearly, cleans up, stays in budget.
updated: 2026-11-21
status: current
triggers: [vfx, particle, beam, trail, shader, aura, slash]
---
# Checklist: vfx
- [ ] Used the [vfx skill](.claude/skills/vfx/SKILL.md); followed the [vfx playbook](domains/vfx/playbook.md).
- [ ] Reads clearly: anticipation → impact → dissipate; color/size/transparency curves over lifetime.
- [ ] One-shot effects clean up (Roblox: Debris or disable + destroy; web: pooled and removed).
- [ ] Budget: sane particle counts/rates; no leak over repeated triggers.
- [ ] Roblox: visuals client-side, triggered by a server event. Web: shader compiles, no console errors.
- [ ] Tunable params in one table/config.
## Verify (one)
- pc: trigger the effect 3x in Studio playtest or browser; screenshot; instance/object count stays stable.
- mobile: Artifact preview (web) or code review + append "trigger in Studio, screenshot" to queue/pc.md.
## Log
- log.md entry (effect, path, key params). Errors → [vfx errors](domains/vfx/errors.md) + lesson.
