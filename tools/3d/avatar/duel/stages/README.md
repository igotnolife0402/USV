---
summary: Crossing, a 7.6 s saber-vs-greatsword fight built in 6 rendered stages (blocking, splines, impact, camera, lighting, vfx)
updated: 2026-11-24
status: current
---
# stages: one fight, every pass rendered

Shows the build process: the same choreography exported after each pass so the owner can compare stage N with N-1.
Rigs = the supernova Kaito/Ren tab (`BASE`); everything else (choreography, timing, camera, light, fx) is in these two files.

1. `python3 build.py BASE WORK` → `WORK/{s1,s2,s3,s6pre}` + `beats.json`; prints `GATE PASS|FAIL` (`--gate-only` stops there).
   - Key poses as data (lists `A`, `B`); `pose()` = box-bounded Gauss-Newton IK: right hand + blade (`dir`, `thru` a world point, `tip` on a world point), left hand `grip`/`guard`, flat feet.
   - Gate on s2: contacts within 0.15, ground-smash tip height, blade-through-body spans, tips above ground.
   - Auto in-betweens: a joint step > 90° gets up to 2 solved mid keys; then every Euler is re-expressed as the twin closest to the previous key (`near`).
   - s1 step keys; s2 `auto` + whip-in `cubic:0.7,0,1,0.6` into contacts, `out` after, overlap lag on forearm/hand/head; s3 = hit-stop warp + flash/shake; s6pre = s3 + flipbook cards fitted to each swing (sheets cached in `WORK/fx`).
2. `PLUGINS=../../../studio/plugins node finish.mjs WORK` → s4 camera (5 eased shots + `cinePass` payoff), s5 lighting (grade, impact + rim lights), s6 vfx.
3. Lint + render each from `tools/3d/studio`: `SHOTS_TAB=WORK/sN SHOTS_LINT='{"chest":3}' SHOTS_VIDEO=1 SHOTS_DEVICE=desktop node test/run.mjs shots`.

State 2026-11-24: lint s2 6 / s6 6 (was 10), all on Ren's wrist at the ground smash 2.75 (wrist solves to the opposite limit); preview artifact "Crossing Build Stages".
