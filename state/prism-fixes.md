---
summary: Prism (Idk repo) speed + dragon_city look fix pass sent 2026-11-27; IDs, pass lines and who owns what.
updated: 2026-11-27
status: current
---
# Prism fix pass (relay to session_01NdorJbawUfbAwyxcvbGoJs)
Goal: Prism AI loop, render and MP4 fast; dragon_city look fixed. Owner approved all (2026-11-27). Repo igotnolife0402/Idk, branch claude/admiring-galileo-bjdfjg, tools/prism.

## Baseline (measured by the Prism session, 4-core cloud, SwiftShader)
- check house: debug 2.41 s, release 0.26 s. cargo test: debug 38.2 s, release 3.4 s.
- 720p frame, 1 worker: MSAA4 0.74 s, MSAA1 0.41, +shadow512 0.40, +bloom off 0.37; 2 workers MSAA1 0.280.
- 4 s 720p MP4: MSAA4 63.1 s, MSAA1 41.0, +bloom off +shadow512 31.2 (budget 6 s); time sits in encoder backpressure.
- dragon_city 10 s took 60 min; ~8.8 min per full render.

## Fix IDs
- S1 release CLI in GUIDE/build.mjs + dev opt-levels; S2 draft/final tiers; S3 MP4 split + encoder options; S4 raw RGBA → ffmpeg; S5 wasm opt 3 + simd128 + wasm-opt; S6 flaky release test; S7 real-GPU bench queued; S8 mesh cache (idea).
- L1 dragon readability; L2 feet/occlusion; L3 fire ramp not pink; L4 impact + skew + stray sphere lint; L5 city life; L6 3-shot plan.
- P1 preview-first; P2 checks on draft; P3 recipe ops; P4 contact sheet; P5 time before naming a cause.

## Pass lines
check house <= 0.3 s; cargo test <= 5 s warm; 4 s draft MP4 <= 6 s; dragon_city final <= 2 min; all tests pass, flake fixed; sheet: dragon readable, fire orange, feet on roof, no stray objects.

## Status
- 2026-11-27 sent (delivered). Next: read its before/after table, compare to pass lines, report to owner.
