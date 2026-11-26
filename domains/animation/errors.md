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
| improve delivery +18.9 s | /improve 60 cutscene delivered at 78.9 s: route sent it to roblox, so research went to finding the real tools (Umbrio anim/vfx/avatar) and the brief was sent ~20 s late | router words added; duel.py tool for two-fighter cutscenes | 2026-11-24 |
| Fight reads as both swinging through each other (owner 2026-11-24) | Clips authored per fighter with no shared contact keys; gap 2.2 vs 4.2/4.6 blades | Contact-key choreography + FK gate (playbook Cutscene rules): blade-blade <= 0.15 at each clash, saber through Ren's torso at 10 samples | 2026-11-24 |
| Greatsword tip under the floor 2.65 s | gs_strike/gs_follow poses authored standing alone, root lowered by knockback path | Gate tip y >= 0.05 every sample | 2026-11-24 |
| Kamehameha with hands 2.1 studs apart, saber still lit | Blade card show [0.8, 16.6] spans the beam; kamehameha pose on a yawed R15 kit | Hide or sheathe the weapon for two-hand moves; check palm distance <= 0.5 | 2026-11-24 |
| Strikes land together (1.9 / 1.95 s) | Both clips keyed on the same beat | Stagger attacker/defender >= 0.3 s | 2026-11-24 |
| Last 2.4 s empty black frame | Fighters hidden at 17.6, embers too faint to read | Hold aftermath visible to the end | 2026-11-24 |
| raters saw ~10 stills in a different framing | duel raters judged 12 stills from a forced 7,5,9 shots camera, not the owner's saved view; owner: go frame by frame | shots.mjs SHOTS_FPS + scene camera default | 2026-11-24 |
| slow, low-quality animation work | duel work took hours: animator lerped Euler per axis, stopped at every key, had no slow-mo, IK or lint, so fixes were hand-run offline | sample.js + anim.ik/mirror/lint + rulebook | 2026-11-24 |
| camera jumps back right after the flash | first anim.cine pulled the camera back under the flash in one frame and a 0.6 s reveal on a steep ease halved the subject per frame; only the 12 fps frame sheet showed it, the tests passed | hold close + cubic:0.42,0,0.58,1 reveal >= 1 s (cine.js) | 2026-11-24 |
| cine payoff frames show an arm or a white-out | duel cine: 45% push ended behind an occluding arm and the close-up hold sat inside the blast sphere (0.8 s white + card edges), seen only on the 12 fps sheet | push override + cut on flash (duel/preview/cine_duel.mjs) | 2026-11-24 |
| before/after preview looked identical | owner: both replays are the same; anim.cine hold/dip counted clip frames, so on a 60 fps clip a hit-stop was 0.05-0.07 s, and the before clip already had clash shakes | cine.js fps=30 for frame counts; cine_duel impact frames | 2026-11-24 |
| gate fail after adding in-betweens | auto in-between keys warm-started the next IK solve from the mid pose; the ground-smash tip key fell into a bad branch (residual 7.2, tip 1.9 under ground) | keep lower-residual solve (stages/build.py) | 2026-11-24 |
| lint euler-jump on b_JRightHand at a tip key | IK wrist hit opposite bound at a tip-placed key: 146 deg euler-jump that in-betweens and Euler twin choice cannot fix | open: add a hand-rot regulariser to pose() | 2026-11-24 |
| fight build > 30 min | Crossing was rendered 6 times by hand (12 min) plus cold fx sheets (57 s) and gate/lint retry loops; one fight cost 30+ min vs the owner's 5 min refs | fight.mjs one-command pipeline, 138 s measured | 2026-11-24 |
| Parallel chunk render produced 9-byte 'undefined' MP4s after 2 min | new option o.to collided with exportTo's o.to='data'; video went to SCRATCH/shots not SHOTS | o.frames=[a,b]; shots video writes to SHOTS; smoke-test new render options on ~10 frames first | 2026-11-24 |
| full renders wasted on plumbing bugs | new render options were first tested with full 2-min renders, so two plumbing bugs (o.to name clash, wrong output dir) cost 3 full runs | 10-frame smoke test first | 2026-11-24 |
| cine payoff landed at 10.6 s on a 12 s clip, clip grew to 14.5 s | anim.cine slow-mo stretches story time (~2 s burst/impact); spec was written in clip time | write the spec in story time: payoff_story = payoff_clip - ~1.65, len_story = len - ~2; read `anims.*.warp` after the build (2026-11-24) |
| headless Studio shots failed: no deps in a fresh session | `npm i` in a dir without package.json installs nowhere; deps are per session | in scratch/deps: `echo '{}' > package.json`, then npm i the pinned deps from docs/tests.md; DEPS=scratch/deps/node_modules (2026-11-24) |
