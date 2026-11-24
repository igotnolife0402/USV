---
summary: Cinematic floor - owner's 4 ref clips measured frame by frame, and anim.cine (push-in, slow-mo, flash, hit-stop, settle) in one call
updated: 2026-11-24
status: current
---
# Cinematic baseline (floor for every animation and cutscene)

Owner 2026-11-24: "make them a lot more smooth and detailed, use my old projects as the reference, not longer to build, a baseline for the bare minimum; pay attention to the way it zooms in and builds suspense". The refs below are the floor, not a style to copy.

## The refs, measured (ffmpeg per-frame luma + 4 fps / 12 fps sheets)
| Ref | Beats (s @ fps) | What makes it read as quality |
|---|---|---|
| outshot (darts, 23.4 s @30) | 9.5-11.5 close on the thrower, slow creeping push-in, sparkles; 11.75 release streak; 12.0 cut to a follow-cam on the dart in slow-mo, the board grows ~40 % -> 100 % of the frame over 4.5 s; 16.6 brightness dips 101 -> 92 over 5 frames, then the flash ramps 138 -> 174 in 5 frames and decays over ~3 s; BULLSEYE title on the flash; holds the close-up ~1 s, then pulls back wide for GAME SHOT + confetti | slow push that speeds up, time slowed under it, a dip before the flash, a held close-up before the reveal |
| confetti-cannon (7 s @30) | charge 2.5 s in 4 escalating steps (luma 38 -> 44 -> 45 -> 55 -> 71, one step per ~0.5 s: glow grows, colour pink -> gold -> cyan, rings, sparks); dark dip 73 -> 58 over 4 frames; 1-frame flash peak 164, decay to base in ~7 frames (x0.85 per frame); burst, smoke, streamers, slow drift and settle on the ground | escalation in steps, the dip, a short flash, a long settle that never fully stops |
| Shenron loop (18 s @60) | the serpent never stops: S-curves flow through every pose, swirl trails, first frame = last frame, camera orbits | continuous motion (auto eases), a seamless loop |
| combo14 (4 s @30) | 2-rig combo, hits, knockback, lying settle | hits land on held poses, the loser settles instead of freezing |

Shared shape: build (push-in + escalation) -> dip -> flash + freeze -> shake -> hold close -> slow reveal -> settle that keeps drifting.

## `anim.cine` (tools/3d/studio/plugins/cine.js; Animate > Cinematic pass)
`app.exec('anim.cine', {payoff: t, build?: s, kind?: 'impact'|'burst'|'loop', focus?: [x,y,z], reframe?: true, off?: true})`
- Frame the start shot (or key the camera) first; that framing is the wide shot. Re-running replaces the pass (idempotent); `off` restores the clip's own camera, warp and length.
| kind | build | push-in | fov | slowest warp | hit-stop | flash | shake | after |
|---|---|---|---|---|---|---|---|---|
| impact | 1.6 s | 45 % of the distance, `cubic:0.4,0,0.9,0.6` (creeps, then fast) | x0.82 | 0.3x | 4 frames | dip -0.12 over 4 frames, peak 0.85, decay 0.35 s | 3 % of the distance, decays 0.4 s | hold close <= 0.5 s drifting in, reveal >= 1 s with `cubic:0.42,0,0.58,1` |
| burst | 2.5 s | 30 % | x0.86 | 0.35x | 3 frames | dip -0.15, peak 0.95, decay 0.3 s | 4.5 % + 4 rumble steps in the build | reveal wider (110 %) |
| loop | - | one 360 deg orbit, 16 `auto` keys + one past each end (seamless) | - | none | - | - | - | - |
- Warp: speed 1 -> 0.6 -> slow into the payoff, frozen `hold` frames, 0.5 -> 1; the clip gets longer, the story length stays. A clip with its own warp keeps it (`cine.warp: 'kept'`).
- Flash = `clip.camera.flash` keys (-1 black .. 1 white), a full-frame pass like the bars, so viewport, shots and MP4 show it.
- Overrides: any preset number per call (`push`, `fov`, `slow`, `hold`, `flash`, `dip`, `shake`, `back`, ...). A shot that already starts close: `push: 0.2` (45 % pushed the duel camera into an occluding arm, 2026-11-24).
- Clip already cuts to a wide shot on the payoff (fights, blasts): cut on the flash peak, no close-up hold; held close, the duel camera sat inside the blast sphere for 0.8 s of white. Example: `tools/3d/avatar/duel/preview/cine_duel.mjs` (cine + cut on flash + 3-frame hit-stops on every clash + shots that enter moving).
- One big effect only (owner rule 9): one payoff per pass; for a fight with several clashes, cine the final blow and use hit-stop holds for the rest.

## Lint (anim.lint) baseline faults
`motion-stop` (a move brakes to 0 at a key and goes on the same way), `camera-robotic` (>= 3 camera keys, all linear/smooth), `static-camera` (>= 3 s clip, no camera keys), `payoff-flat` (shake peak with no flash within 0.2 s), `loop-seam` (looping clip whose first and last pose differ: rot > 2 deg, pos > 0.02).

## Verified 2026-11-24
`node test/run.mjs anim` 16/16 (2 new cases: cine numbers, pixels dim/flash/settle, idempotent, off; each lint rule). 12 fps sheet of a dart-into-board clip read frame by frame: push-in speeds up, flash holds 2 sheet frames, decays over 6, close-up holds ~1 s, reveal spreads over 11 frames. First version pulled back under the flash in one frame (fixed: hold + even ease). Real rigs/duel not yet re-shot with cine (queued).
