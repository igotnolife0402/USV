---
summary: Animation rules - key poses not frames, one spec drives every output, sine ramps, animate in Studio, weight is timing
updated: 2026-11-24
status: current
triggers: [animation, key pose, keyframe, easing, walk cycle, idle, attack swing, clip, pose, ik]
---
# Animation playbook

Umbrio work: [umbrio-animator.md](umbrio-animator.md) first (engine API, timing numbers, rig rules, workflow, gates).

## Rules (owner, from the old vault)
- Key poses, not frames: a few keys per joint on the motion's turning points, `auto` (Hermite, no stop) through continuous motion, `smooth` only where the move really starts or stops, impacts `out` + hit-stop (owner floor 2026-11-24: [cinematic-baseline](cinematic-baseline.md)). Orc: 114 keys (was 793), within 1.5° of the exact motion (`key_poses`, tol 1.5° rot / 0.05 stud pos).
- One motion spec per creature drives every output (Studio clip, Roblox Lua, video); change the spec, never one output.
- Action ramps are sine-shaped (no linear jerks); the same `window()` shape in Python, Lua and JS ([snippets](domains/animation/snippets/README.md)).
- Animate inside the Studio: export the rig at rest plus a key-pose clip; never bake/pre-pose meshes. The rig is a group per joint at its pivot, meshes at rest under it; a pose = the groups' rotations.
- Checks set Animate mode: the Studio animator applies clips only there or while playing.
- Hand and blade placement is named, not guessed: wrists by two-bone IK (`ik_arm`, wrist target + elbow direction), held blades by `aim` (a direction in the root frame).
- Fast cuts: never one key jump (a 150° Euler lerp cuts through the body or over the wrong shoulder): `arc_keys` adds slerped in-betweens so the tip draws a clean arc.
- IK in-betweens (2026-11-24, L-160/161): after a mid key, re-solve the target from it but keep the lower-residual solve; a blade turning > 120° in one swing turns at the shoulder, so regularise the hand rot toward the previous key (a wrist flipping bound to bound = lint euler-jump that no in-between fixes).
- Weight is timing: slow lift, long wind-up with the tip sagging behind, a held beat, a fast cut (0.22 s at 60 fps), a braked follow-through, slow recovery.
- Root `pos` keys keep the feet on the ground in every key. Never animate the root of a big build on phones (moves every object; bake statics first).
- Effects ride the clip: flipbooks with `start`/`life` or `show: [t0, t1]`; swing trails fitted to the tip path's plane and circle (`kind: swing`).

## Which tool
| Ask | Route |
|---|---|
| Creature idle/attack loop for Roblox + video | [beast](tools/3d/beast/README.md) `ANIM` spec (sine terms + action windows) |
| Roblox avatar pose, emote, weapon swing | [avatar](tools/3d/avatar/README.md) `POSES` + `CLIPS` (`--pose`, `--clip`) |
| Simple prop motion (bob, spin, pulse, walk, wave) | Studio animator presets (`anim.js`: bob, pulse, swing, walk...) |
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

## Cutscene rules (fight scenes; from the supernova duel critique 2026-11-24, every number measured by FK on the tab)
- Choreograph contact, not swings: every clash is a key where both blade segments meet (FK distance <= 0.15 stud) at a named contact point; the duel had 0 of 300 samples under 0.15 (strike moments 0.57-2.92 apart), so blades passed through each other.
- Spacing = reach: fighter gap at a clash ~ blade length x 0.8 (4.2/4.6 blades -> gap ~3.5), not 2.2; at 2.2 the saber went through Ren's torso at 10 samples (1.95, 2.0, 3.25, 7.15, 15.2...).
- Blades stay above the ground: Ren's tip was below y=0 for 2.65 s (53/300 samples); gate tip y >= 0.05 in every sample.
- Effects ride the contact point: place clash fx at the FK contact (they sat 0.54-2.56 studs off), parent beams/charges to the hands, never a fixed world x=0.
- Impact = hold: freeze both rigs 0.08-0.15 s at each contact (repeat the key), then a braked follow-through; no strike may lerp straight on (no holds existed).
- Fast cuts get `arc_keys` in-betweens (none were used: 0.15-0.35 s single Euler jumps).
- Camera: Umbrio has no timeline camera track (2026-11-24); until one exists, frame wide enough for both blades and plan cuts as separate bookmarks; a cutscene needs a camera track for "epic" (push-ins, shake, low angles).
- Distinct fighters: different outfit ids and per-fighter fx tint (both wore shirt 144076358 / pants 144076760; every fx was stock colour).
- Ending lands on something: the last 1.5 s showed an empty black frame (19.5 s); end on a held silhouette, crater or drifting embers that are visible.
- Gate before upload: run the FK checker (blade-blade min distance at each clash, blade-through-torso, tip below ground, fx-to-contact offset) and fail on any miss.
- Clip camera (2026-11-24): `clip.camera = {pos, target, fov, shake: [[t, v, ease]]}`; Animate > Key camera / Follow clip camera / Clear camera keys; duel.py takes SPEC `camera_keys`. Plan push-ins, low angles and shake on impacts with it.
- Review frame by frame (owner 2026-11-24): never rate from ~10 stills. `SHOTS_FPS=12 SHOTS_TAB=<tab> node test/run.mjs shots` writes every frame (`frames/f-XXXX.jpg`) and one labelled sheet per second (`sec-NN.jpg`) from the saved/clip camera; every rater gets ALL sheets, writes a note for every second citing frame numbers, then the main agent fact-checks each claim by FK on the read-back (CONFIRMED / WRONG / UNVERIFIABLE).
- Contact solving (2026-11-24, duel v2): bind poses with the wrist at the root's centre line (ik x = 0) and the blade aimed forward-up; a pattern search over gap, the defender's sidestep z and yaw (`supernova2/build.py`) brought 6/6 contacts to <= 0.05 stud. Wrists on the right side (x -0.25) put the blades in parallel planes 0.6-1.1 apart: no gap fixes that. A sidestep turns the fight axis, so rotate the side cameras with it.
- Letterbox needs a sky lighter than black (#1b2130): bars on a #05070d sky were invisible in every frame.
