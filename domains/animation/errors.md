---
summary: Known animation failures (Studio clips, rigs, Roblox playback, swings) with cause and fix
updated: 2026-11-24
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
| Macarena forward arm pointed sideways | IK wrist targets typed from the rig-frame note, never rendered before the full clip | Render one frame of the first IK pose first; fix targets; queued fix in queue/pc.md | 2026-11-24 |
| Studio shots fail: mp4-muxer import | SHOTS_VIDEO needs mp4-muxer@5.2.2 in deps, not listed | Install it with the three deps (playbook Mobile fallback) | 2026-11-24 |
| arm sideways | Macarena IK wrist targets typed blind; full clip built before one frame was rendered, forward arm went sideways | one-frame render first | 2026-11-24 |
| Palm-down beat showed palm up | Wrist euler sign guessed; hand +X is the palm normal | Probe the palm normal (`palm.py`), fwd_down = (0,0,90) | 2026-11-24 |
| Crossed hand jumped when the other arm moved | Left cross offset applied only on the crossing beat | Apply the offset whenever that hand target is held | 2026-11-24 |
| Hand passed through face/crotch on cross-body moves | Straight joint interpolation between key poses | Outside via key per move (`VIA` map), full lean | 2026-11-24 |
| Held hand left the hip, arm straightened mid-move | Via key used half the lean, target out of reach | Via waist = max(lean before, after) + 2 | 2026-11-24 |
| Owner saw bad frames a 5-shot sheet missed | Review sampled frames, not every frame | Every-frame review rule (playbook Frame review) | 2026-11-24 |
| owner: cat vomited over my keyboard | Macarena verified with a 5-shot contact sheet; owner found swapped palms, hands through face and body, invisible hip roll | 3 review passes, 10 defects fixed | 2026-11-24 |
| Owner: stop sending all the frames | Verification sheets sent with the MP4 | Review silently; send only the deliverable (profiles/owner.md) | 2026-11-24 |
