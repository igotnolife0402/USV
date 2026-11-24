---
paths: ["domains/animation/**","tools/3d/beast/**","tools/3d/avatar/**","tools/3d/studio/plugins/anim.js"]
---
# Animation rules
- Key poses, not frames: few keys per joint on turning points, `smooth` (sine in-out) between; fit with `key_poses` (1.5° / 0.05 stud).
- One motion spec per creature drives Studio clip, Roblox Lua and video; change the spec, never one output.
- Ramps are sine `window()`, identical in Python, Lua and JS (domains/animation/snippets/README.md).
- Animate in the Studio: rig at rest + key-pose clip; never bake poses into meshes. Checks run in Animate mode.
- Hands by IK (`ik_arm`), blades by `aim`; fast cuts get `arc_keys` in-betweens, never one big Euler jump.
- Never animate the root of a big build on phones; bake statics first.
- GLB for animation (Studio FBX has none). Check: every frame at >= 10 fps from a fixed front + 3/4 camera (`SHOTS_AT` all frames, 8-frame labeled sheets), read every sheet silently (never send sheets or frames to the owner, only the final MP4; owner 2026-11-24); fix, re-render, re-review until a pass has 0 defects. Never a 5-shot contact sheet or one look at the MP4 (owner 2026-11-24).
- Cross-body hand moves (to head, opposite hip, back pocket) get an outside via key ~0.075 s before the hit, with the full lean of the poses around it, so hands never pass through the head or body.
- Dances: feet planted by leg IK, isolations tip against their offset, cyclic keys dense + linear, no identical hold keys (domains/animation/playbook.md "Dance and emote motion").
- New failures go into domains/animation/errors.md.
