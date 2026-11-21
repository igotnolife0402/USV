---
paths: ["**/*vfx*/**","**/*.glsl","domains/vfx/**"]
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
- Done = checklists/vfx.md; new failures go into domains/vfx/errors.md.
