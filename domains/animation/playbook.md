---
summary: Animation rules - key poses not frames, one spec drives every output, sine ramps, animate in Studio, weight is timing
updated: 2026-11-21
status: current
triggers: [animation, key pose, keyframe, easing, walk cycle, idle, attack swing, clip, pose, ik]
---
# Animation playbook

## Rules (owner, from the old vault)
- Key poses, not frames: a few keys per joint on the motion's turning points, `smooth` (sine in-out) between. Orc: 114 keys (was 793), within 1.5° of the exact motion (`key_poses`, tol 1.5° rot / 0.05 stud pos).
- One motion spec per creature drives every output (Studio clip, Roblox Lua, video); change the spec, never one output.
- Action ramps are sine-shaped (no linear jerks); the same `window()` shape in Python, Lua and JS ([snippets](domains/animation/snippets/README.md)).
- Animate inside the Studio: export the rig at rest plus a key-pose clip; never bake/pre-pose meshes. The rig is a group per joint at its pivot, meshes at rest under it; a pose = the groups' rotations.
- Checks set Animate mode: the Studio animator applies clips only there or while playing.
- Hand and blade placement is named, not guessed: wrists by two-bone IK (`ik_arm`, wrist target + elbow direction), held blades by `aim` (a direction in the root frame).
- Fast cuts: never one key jump (a 150° Euler lerp cuts through the body or over the wrong shoulder): `arc_keys` adds slerped in-betweens so the tip draws a clean arc.
- Weight is timing: slow lift, long wind-up with the tip sagging behind, a held beat, a fast cut (0.22 s at 60 fps), a braked follow-through, slow recovery.
- Root `pos` keys keep the feet on the ground in every key. Never animate the root of a big build on phones (moves every object; bake statics first).
- Flight paths around a player: author the path with clearance >= wing half-span + 4 studs (not body radius), and run the loop test (tools/roblox/wyvern/test/sim.mjs) before tuning anything else; the wyvern took 2 failed rounds (2026-11-24).
- Effects ride the clip: flipbooks with `start`/`life` or `show: [t0, t1]`; swing trails fitted to the tip path's plane and circle (`kind: swing`).

## Which tool
| Ask | Route |
|---|---|
| Creature idle/attack loop for Roblox + video | [beast](tools/3d/beast/README.md) `ANIM` spec (sine terms + action windows) |
| Roblox avatar pose, emote, weapon swing | [avatar](tools/3d/avatar/README.md) `POSES` + `CLIPS` (`--pose`, `--clip`) |
| Simple prop motion (bob, spin, pulse, walk, wave) | Studio animator presets (`anim.js`: bob, pulse, swing, walk...) |
| Long creature flying a showcase loop around the player (pet, boss intro) | [wyvern](tools/roblox/wyvern/README.md): path moves + `dur` in `spec.mjs`, chord follow-the-leader body, baked Luau tables, headless `test/sim.mjs` |
| Anything in Blender | Blender MCP keyframes (PC), export GLB with animation (FBX from Studio has none) |

## PC (/pc)
1. Edit the spec (ANIM or POSES/CLIPS), rebuild (`python orc.py out --sheets DIR` / `python avatar.py KIT OUT --clip C`, ~1 s).
2. Shots check: `SHOTS_TAB=OUT/studio SHOTS_AT=1,2,3 SHOTS_VIDEO=1 node tools/3d/studio/test/run.mjs shots` → look at `shots.jpg` + `clip.mp4` once.
3. Beast video: `NODE_MODULES=<three> node video.mjs out 12 24` (ffmpeg) → look at 4-6 frames once.
4. Write the clip into the Studio tab (pin `if_version`); Roblox: KeyframeSequence via Studio export or the kit's Animator script.

## Mobile fallback (/mobile)
- Edit the spec files and Studio clip JSON (`anim` tracks: `[[t, value, ease]]`) in the repo; run the Python build if numpy exists in the session.
- Preview: a three.js Artifact that tweens the key poses with the same `smooth` ease.
- Queue: `- [ ] YYYY-MM-DD shots check SHOTS_VIDEO=1 for <clip> — mobile-edited animation` in [queue/pc.md](queue/pc.md).

## Done
[checklists/3d.md](checklists/3d.md) + clip watched once (shots/MP4). New failure → [errors](domains/animation/errors.md).
