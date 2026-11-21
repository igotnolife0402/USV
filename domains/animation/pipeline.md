---
summary: Animation pipeline - motion spec to key poses to Studio clip, Roblox KeyframeSequence or Lua, and MP4 video
updated: 2026-11-21
status: current
triggers: [animation pipeline, keyframesequence, anim spec, clip export, mp4 video]
---
# Animation pipeline

## 1. Spec (one per creature)
- Beast `ANIM` ([rig.py](tools/3d/beast/rig.py)): `{'len', 'periods': {name: s}, 'action': {'every': [a, b], 'first', 'len', 'phases': {name: [start, end, ramp_in, ramp_out]}}, 'joints': {seg: {'rot': {'x': terms}, 'pos': {'y': terms}}}, 'fx': [...]}`.
- Terms: `[amp, period, phase]` sine, `[phase_name, amp]` action window, `[const]`. Degrees and studs.
- Avatar: `POSES` (joint → Euler degrees in rig frame, optional `ik`) + `CLIPS` `[(seconds, pose[, ease])]` ([avatar.py](tools/3d/avatar/avatar.py)).

## 2. Key poses
`key_poses(anim, tol_rot=1.5, tol_pos=0.05)`: start from turning points and action-window corners, add the worst-fitting moment until every `smooth` tween fits, drop unneeded keys. Never a key per frame.

## 3. Studio clip
Tracks per object/channel: `[[t, value, ease]]` (ease on the segment's first key; eases: linear, ease, smooth, in, out, step, bounce, elastic). Fast cuts: clip fps 60. Format: [scene format](tools/3d/studio/docs/scene-format.md).

## 4. Outputs
| Output | How |
|---|---|
| Roblox kit | `ANIM_LUA` in rig.py evaluates the same spec at runtime (Animator script) |
| Roblox R6 KeyframeSequence | Studio export `.rbxmx` (roblox.js builds Motor6Ds + KeyframeSequences, Priority Action) |
| GLB | Studio Export glb (FBX has no animation) |
| MP4 | Studio Export > Video (fast ≤1280 px ≤30 fps; or 1080p render) / beast `video.mjs` (ffmpeg) / shots check `SHOTS_VIDEO=1` |

## 5. Check
Shots check on the tab read-back at 3 times + clip MP4; look once. Roblox playback is untested from the cloud: queue a Play test on PC.
