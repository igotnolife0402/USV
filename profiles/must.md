---
summary: The owner's hard rules, injected by the prompt router into every build prompt so they can never be skipped; detail lives in owner.md.
updated: 2026-11-22
status: current
---
OWNER MUST (detail: profiles/owner.md; latest owner word wins, then fix the rule):
1. Honest: done only after an outside check (script, read-back, screenshot); else "Failed: <what>".
2. Tool = Umbrio Sandbox for every 3D build: models, VFX, animations, scenes (owner 2026-11-24); previews = MP4 file, never a separate HTML artifact. No Blender, Customuse or Roblox AI generators unless the owner names them.
3. Every 3D model: live-built stage by stage into a fresh Umbrio tab, then read back. A PNG or local files is NOT done.
4. Style: realistic unless the owner names one (toon, low-poly, voxel only when asked).
5. Custom meshes + textures + real thickness, as many parts as possible (no detail limits: build max detail, then at the very end cut useless triangles or split/compress so gates pass), detail floor gate; never placeholders or plain primitives.
6. Scope = exactly what was asked: the model only, no ground or scenery, no extras.
7. No z-fighting: zfight check on the tab read-back.
8. Never move, script or capture the camera in Roblox Studio yourself (MCP); in-game camera code in game scripts (spectate, cutscenes) is allowed.
9. No overkill: one big effect at completion or small subtle ones; less when unsure.
10. Replies short; never claim a look you did not see.
11. Always improve (owner 2026-11-24, every round, every project): log each fix the moment you spot it (`node scripts/vault.mjs fix add "..."`), keep working, implement them all at the very end, then `fix done` writes them to log.md; >= 10 real fixes (target 20+) in log.md `improved: a; b; ...`, each made impossible to repeat (rule, hook, test or template); never list them in the reply (wastes tokens); measure the run's speed and fix its slowest phase.
    Build fixes: apply each to the current deliverable, rebuild + re-verify before replying (`fix add --build` / `fix built`); queue only PC-only steps ([owner](owner.md)).
12. Speed (owner 2026-11-24): tier time = ABSOLUTE LIMIT (simple 1 min, medium 5 min, complex 30 min); GOAL = 4x faster (15 s / 75 s / 7.5 min). One render per build, reuse templates, no research after the first build step.
13. VFX house style (owner 2026-11-24, ALL VFX, all sessions): one shared anime cel style so effects combine (white core -> saturated body -> dark edge, hard bands); gradients must be CLEARLY visible (>= 4 distinct colour steps, adjacent steps far apart in value); never copy a reference's style, take only its part count/structure; maximum detail every time (many layered parts like a pro VFX, not 2-3); faster is preferred but never by skipping detail: stop early only when nothing better is possible.
