---
summary: Done criteria for VFX (Roblox particles/beams/trails, web shaders/particles): reads clearly, cleans up, stays in budget.
updated: 2026-11-26
status: current
triggers: [vfx, particle, beam, trail, shader, aura, slash]
---
# Checklist: vfx
- [ ] Used the [vfx skill](.claude/skills/vfx/SKILL.md); followed the [vfx playbook](domains/vfx/playbook.md).
- [ ] No overkill: one big effect when the whole thing completes, or small subtle ones throughout; never a big effect per step ([owner](profiles/owner.md)).
- [ ] Owner floor met ([profiles/owner.md](profiles/owner.md)): full detail, no placeholders, scope exactly as asked, original (no clones).
- [ ] Attacks: trail traced from the real blade path (never a free-floating card); impact effect plays at the contact point from the contact frame.
- [ ] Destruction: the object is intact until contact, then exactly its own pieces, moved by physics; the projectile is a temporary helper, not exported.
- [ ] Reads clearly: anticipation → impact → dissipate; color/size/transparency curves over lifetime.
- [ ] One-shot effects clean up (Roblox: Debris or disable + destroy; web: pooled and removed).
- [ ] Budget: sane particle counts/rates; no leak over repeated triggers.
- [ ] Roblox: visuals client-side, triggered by a server event. Web: shader compiles, no console errors.
- [ ] Tunable params in one table/config.
## Baseline gate (owner 2026-11-26: "i have a baseline you have to score higher, stop bypassing it"; never skip)
- [ ] Effect score: render mp4 → `ffmpeg -vf fps=10 <dir>/all/f%05d.png` → `python3 -I tools/refs/keep.py <dir> 0.1` → `python3 -I tools/refs/baseline.py <dir> --hit <payoff s> --hue <deg>`; must beat the best own effect (frost-fault 7/7) = 7/7, else report `Failed: baseline <n>/7`.
- [ ] Hero models: `python3 -I tools/3d/detail/detail.py check <studio>/project.json <studio>/geo` → DETAIL PASS (hero class) before render; the bar is the owner's Umbrio refs (bunk bed, confetti cannon: 40+ parts, trim, sub-assemblies).
- [ ] Both scores go in the reply and log.md.
## Verify (one)
- pc: trigger the effect 3x in Studio playtest or browser; screenshot; instance/object count stays stable.
- mobile: Artifact preview (web) or code review + append "trigger in Studio, screenshot" to queue/pc.md.
## Log
- log.md entry (effect, path, key params). Errors → [vfx errors](domains/vfx/errors.md) + lesson.
- [ ] No zfight run: it is for solid models only (owner 2026-11-25); VFX check = read-back + contact strip vs spec.
