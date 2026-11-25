---
summary: Reference-video pipeline: Sonnet workers grab a frame every 0.5 s, brain measures and analyzes one video at a time, distills recipes
updated: 2026-11-25
status: current
---
# Reference videos → replication recipes

Goal: learn how a reference looks and moves well enough to rebuild the technique with our tools (VFX Generator, Ember VFX Studio, Umbrio, Roblox emitters, three.js). Same technique, original assets: never copy someone's characters, logos or art one-to-one.

## Phases
1. **Intake** (brain): list links in `state/refs-<batch>.md` with a slug each (`01-fire-slash`, ...). Short links (vm./vt.) are fine.
2. **Grab** (3 `crew-worker` Sonnet agents, links split evenly): each runs `node tools/refs/grab.mjs <url> <slug>` per link, then `python3 -I tools/refs/stats.py refs/tiktok/<slug>`, and reports the JSON line + stats summary. One retry per link; no image reading, no analysis.
3. **Verify** (brain): `frames == expected` for every slug, method A (B = look at sheet01 first). A count is not a content check: open one sheet per video.
4. **Analyze** (brain, ONE video at a time): read stats.csv summary, view every sheet (all frames, 12 per image), zoom full-size frames only at key moments (cuts, peak motion, peak brightness). Write `refs/tiktok/<slug>/analysis.md` right away, before the next video, so compaction never loses work.
5. **Distill** (brain): repeated patterns across videos → rules in the matching domain playbook (vfx, animation, 3d, images); one line per rule, linked to the analyses.

## analysis.md template
- What it is (1 line) + why it reads well.
- Timeline: `t → event` rows (anticipation, impact, peak, dissipate, loop point).
- Layers: core / glow / sparks / smoke / distortion / text, each with shape, blend, size curve, lifetime.
- Colour: palette hexes from stats + where each is used; brightness curve.
- Motion: easing, speed, camera moves, shake, hit-stop, frame holds.
- Replication recipe: tool + concrete params (emitter rates, sizes, colours, timings).
- Not verified: anything guessed from blur or compression.

## Budget math (why one video at a time)
1 sheet ≈ 1.6k tokens = 12 frames = 6 s. A 30 s video = 5 sheets ≈ 8k tokens; 20 videos ≈ 160k: more than one context, so per-video analysis files are mandatory.
Tool: [tools/refs/README.md](../../tools/refs/README.md).
