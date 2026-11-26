---
summary: Umbrio animator rulebook - quality numbers, rig rules, workflow, the new sampler/IK/mirror/warp/lint API, gates
updated: 2026-11-24
status: current
---
# Umbrio animator rules (read before any animation, rig or cutscene)

Why this exists (owner 2026-11-24, "for the time it took it sucks"): the duel lost hours to Euler flips, robotic stops at every key, faked slow-mo, offline IK and hand-run FK checks. The animator now does these itself; use them.

## Engine (tools/3d/studio/plugins/sample.js + anim.js, one sampler for viewport, GLB, Roblox, fk.py)
- Rotations slerp (shortest arc). A segment turning >= 180 deg on any axis stays Euler on purpose (spins).
- Eases per segment (the first key's): `linear ease smooth in out step bounce elastic`, plus
  - `auto`: Hermite through the neighbour keys, no stop at the key. Default for continuous motion.
  - `cubic:x1,y1,x2,y2`: custom bezier (CSS style), e.g. `cubic:0.7,0,1,0.6` for a whip-in.
- `clip.warp = [[clipT, storyT, ease]]`: time remap. Tracks, camera and flipbooks run on story time. Slow-mo = flat warp slope (0.25 = quarter speed), never stretched keys. `app.anim.story(t)`.
- `clip.camera = {pos, target, fov, shake, bars}` (bars = letterbox amount 0..1, 2.39:1).
- Commands: `anim.ik {chain:[upper, lower, end], target, pole, t}` -> keys upper + lower, returns `{reached, miss}`; `anim.mirror {t, from:'Left'}` copies by name (rot [x,-y,-z], pos [-x,y,z]); `anim.lint` -> `[{type, id, t, value}]`.
- Roblox export bakes 30 fps linear poses when a clip uses auto/cubic/warp or turns > 45 deg per key; GLB bakes per frame.

## Timing numbers (60 fps clips)
| Beat | Rule |
|---|---|
| Anticipation | 15-25 % of the action, opposite direction, ease `in` |
| Strike | 3-8 frames, ease `out` (or `cubic:0.7,0,1,0.6`) into the impact |
| Hit-stop / hold | 4-8 frames, same key twice; ease `in` out of it |
| Follow-through | 1.5-2x the strike, braked (`out`) |
| Overlap | child joints lag the parent 1-3 frames (wrist after elbow after shoulder) |
| Rotation per key | <= 120 deg without in-betweens (lint: euler-jump) |
| Speed per frame | <= 60 deg/frame on any joint unless covered by a cut/flash (lint: pose-snap) |
| Holds | no > 2 s with nothing moving (lint: dead-hold); add a breath, camera move or fx |
| Joints with >= 4 keys | use `auto` between poses (lint: robotic = all smooth/linear) |

## Rig rules
- One group per joint at its pivot, meshes at rest under it; never bake poses into meshes.
- Hands, feet and blades are placed by `anim.ik` (target + pole), never guessed Euler; key the pole so elbows/knees never flip.
- Symmetric poses: build one side, `anim.mirror` the other.
- Weapons ride the hand group; their tip path is what trails and contacts are fitted to (`tools/3d/avatar/duel/fk.py`).

## Workflow (every animation)
1. Block key poses on the turning points only (stepped), timing from the table.
2. Place hands/feet/blades with `anim.ik`; mirror symmetric poses.
3. Switch the in-between segments to `auto` (impacts `out`, holds `in`).
4. `anim.lint` -> 0 issues (or each one covered: a cut, a flash, an intentional spin).
5. Warp for slow-mo/speed ramps; camera keys (`clip.camera`) and bars. Floor (owner 2026-11-24): frame the wide shot, then `anim.cine {payoff}` (impact/burst) or `{kind:'loop'}` on every clip with a payoff or loop: push-in, slow-mo, dip + flash, hit-stop, shake, settle in one call ([cinematic-baseline](cinematic-baseline.md)).
6. Fights: FK gate (`fk.py`, contacts <= 0.15 stud, no blade through torsos, tips above ground).
7. Review every frame: `SHOTS_FPS=12` sheets ([tests](../../tools/3d/studio/docs/tests.md)); a note per second.

## Gates before upload
- `anim.lint` empty or every issue justified in the log (includes the baseline faults: motion-stop, camera-robotic, static-camera, payoff-flat, loop-seam).
- Exports: GLB/Roblox sample through the same sampler (no extra step), fk.py mirrors it.
- Phone fps for heavy cutscenes is a queued PC/phone check (not measurable headless).
