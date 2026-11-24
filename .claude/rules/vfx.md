---
paths: ["**/*vfx*/**","**/*.glsl","domains/vfx/**","tools/vfx/**"]
---
# VFX rules
- Build each effect in an isolated test page with a trigger and FPS readout before integrating.
- Particles come from a fixed-size pool; never allocate per frame.
- All motion uses dt; effects must look the same at 60 and 144 Hz.
- GLSL ES: declare precision, use float literals (`1.0`), wrap `uTime` with `mod`.
- Surface shader compile errors (console on PC, on-screen `<pre>` in Artifacts).
- Cap DPR at 2 for full-screen shaders; one bloom pass max, OutputPass last.
- Respect `prefers-reduced-motion`; no full-screen flashes faster than 3 Hz.
- Artifacts: no external textures; generate sprites/noise in code.
- Flipbook sheets (tools/vfx/flipbook, domains/vfx/flipbook.md): from physics never painted; 4 stacked layers with distinct roles, hero layer brightest; new effect = recipe of existing presets, only new physics gets code; colour via `element=`.
- Flipbook checks: 64 frames Grid8x8 1024 px, `max_step_jump` < ~3, `thin_stroke_pct` < ~10, build < 60 s, look once over dark and light sky; outputs to scratch; finished white sheets go into `vfx/` only through `tools/vfx/library.py`.
- Need a texture? `grep -i <word> vfx/index.tsv` first and reuse a sheet; paint per vfx/README.md, never store colour copies.
- Nothing vanishes clean (erode into lingering particles); beams are 3D volumes, not camera cards; dragon `PACK` presets only on the dragon.
- Done = checklists/vfx.md; new failures go into domains/vfx/errors.md.
