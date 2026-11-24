---
summary: Known animation failures (Studio clips, rigs, Roblox playback, swings) with cause and fix
updated: 2026-11-21
status: current
triggers: [animation error, clip not playing, pose wrong, swing through body, jerky motion]
---
# Animation errors

| Symptom | Cause | Fix | Seen |
|---|---|---|---|
| Clip does not show in a check/screenshot | Studio animator applies clips only in Animate mode or while playing | Set Animate mode in the check (shots check does) | 2026-11-13 |
| Fast swing cuts through the body / over the wrong shoulder | One big Euler key jump (150° lerp) | `arc_keys` in-betweens (slerped wrist target + aim) | 2026-11-16 |
| Hand misses the grip / blade points wrong | Guessed Euler angles | Wrist by `ik_arm` target + pole; blade by `aim` direction; two-handed: left wrist IKs to the grip | 2026-11-16 |
| Linear jerks at action start/end | Linear ramp | Sine `window()` ramps, same in Python/Lua/JS | 2026-11-13 |
| 793 keys, heavy doc, drift between outputs | A key per frame / per-output edits | `key_poses` fit (few keys on turning points, `smooth`); one spec drives all | 2026-11-13 |
| Pose baked, can't re-animate | Meshes pre-posed | Export the rig at rest + clip; pose = joint group rotations | 2026-11-13 |
| Avatar rotations off after conversion | Roblox Y-up/-Z-forward vs rig Z-up/-Y-forward | Studio rotations are three.js XYZ = 'ZYX' of the converted matrix (`to_b`) | 2026-11-16 |
| Thin gap at a joint that bends far (dragon wrist) | Rigid per-segment meshes | Overlap the segment ends or limit the bend | 2026-11-13 |
| iPhone freezes when playing | Root of a big build animated; shadow map per frame | Bake statics into meshes (~150 draw calls), animate sub-groups only | 2026-11-19 |
| FBX export has no animation | Studio FBX writer has no bones/clips | Use GLB for animation | 2026-11-13 |
| Swing trail sheet misaligned with the cut | Clip changed after the recipe was written | Re-run `avatar.py` (rewrites `swing-recipe.txt`), rebuild the sheet, check with `SHOTS_CAM` = project camera | 2026-11-16 |
| anim+vfx ask built Roblox luau in tools/vfx, skipped animation playbook | blind sub-agent sword swing: router top-2 cut dropped animation (sword hit 3d), vfx notes filled all 4 slots, so no animation playbook read; agent also thought Playwright was missing | routeNotes in prompt-router + vault.mjs; router words; .claude/rules Playwright line | 2026-11-24 |
