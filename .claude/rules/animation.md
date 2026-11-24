---
paths: ["domains/animation/**","tools/3d/beast/**","tools/3d/avatar/**","tools/3d/studio/plugins/anim.js"]
---
# Animation rules
- Key poses, not frames: few keys per joint on turning points, `auto` through continuous motion, `smooth` only at real starts/stops; payoff/loop clips get `anim.cine` (domains/animation/cinematic-baseline.md); fit with `key_poses` (1.5° / 0.05 stud).
- One motion spec per creature drives Studio clip, Roblox Lua and video; change the spec, never one output.
- Ramps are sine `window()`, identical in Python, Lua and JS (domains/animation/snippets/README.md).
- Animate in the Studio: rig at rest + key-pose clip; never bake poses into meshes. Checks run in Animate mode.
- Hands by IK (`ik_arm`), blades by `aim`; fast cuts get `arc_keys` in-betweens, never one big Euler jump.
- Never animate the root of a big build on phones; bake statics first.
- GLB for animation (Studio FBX has none). Check with the shots check (`SHOTS_VIDEO=1`), look once.
- New failures go into domains/animation/errors.md.
