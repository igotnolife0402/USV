---
summary: Known VFX/particle/shader/post-processing failures with cause and fix
updated: 2026-11-21
status: current
triggers: [shader error, glsl error, particles lag, bloom broken, black screen]
---
# VFX errors

| Symptom | Cause | Fix | Seen |
|---|---|---|---|
| Black screen, no error visible | Shader compile/link failed silently | Check `gl.getShaderInfoLog` / `getProgramInfoLog`; three.js logs in console | 2026-11-21 |
| `ERROR: 0:12: '' : No precision specified for (float)` | GLSL ES fragment shader lacks precision | Add `precision highp float;` (mediump on old mobile) | 2026-11-21 |
| `cannot convert from 'const int' to 'float'` | GLSL has no implicit int→float | Write `1.0` not `1`; cast `float(i)` | 2026-11-21 |
| Shader looks different on phone | mediump precision / large time values | Wrap time `mod(t, 1000.)`; use highp where available | 2026-11-21 |
| FPS tanks after many explosions | Particles never freed / new objects each frame | Fixed-size pool; reuse; cap count | 2026-11-21 |
| Additive particles invisible on white bg | Additive blending adds to already-bright pixels | Use normal blend with dark core, or darken bg | 2026-11-21 |
| Transparent particles sort wrongly / pop | Depth write on transparent material | three.js: `depthWrite:false`, `transparent:true`, `blending:AdditiveBlending` | 2026-11-21 |
| Bloom blows out the whole scene | Threshold too low, tone mapping order | Raise threshold (~0.8), add OutputPass last | 2026-11-21 |
| Bloom/post makes colors dull | Missing OutputPass (color space) in composer | Append `OutputPass` after effects | 2026-11-21 |
| Full-screen shader hot on phone | Rendering at DPR 3 | `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` or render at 0.5 scale | 2026-11-21 |
| Hitch on first effect trigger | Shader compiled lazily | `renderer.compile(scene, cam)` at load / trigger once offscreen | 2026-11-21 |
| Texture sprite has dark fringes | Non-premultiplied alpha edges | Premultiply alpha or use radial gradient generated in canvas | 2026-11-21 |
| Roblox ParticleEmitter shows nothing | `Enabled` false with no `:Emit()`, or Rate 0, or parent not a part/attachment | Parent to Attachment/BasePart, call `emitter:Emit(n)` | 2026-11-21 |
| Effect fine at 60 Hz, too fast at 144 Hz | Per-frame updates | Multiply by dt; fixed step | 2026-11-21 |
| Flipbook choppy / pops (`max_step_jump` > ~3) | Something appears whole between frames; too few frames | 64 frames, ease the motion, tween keys along flow, never pop in | 2026-11-13 |
| Hair-thin lines read badly (`thin_stroke_pct` > ~10) | Strokes < 3 px at 128 px cell | Widen to >= 3 px; black hole 19.6 → 9 with 73° view, tighter frame, 3 px photon ring | 2026-11-13 |
| Loop visibly pops on Roblox | Single particle restarts its flipbook | Life = 4 cycles, Transparency fade in/out at 0.2/0.8, Rate 2/life so two overlap (VFX.lua) | 2026-11-13 |
| 8x8 sheet shows quarter frames | Emitter helper hard-coded `Grid4x4` (old `ElementVFX.make`) | Set `FlipbookLayout` from the sheet (Grid8x8); use tools/vfx/flipbook/VFX.lua | 2026-11-13 |
| Beam turns with the camera | Beam built as a camera-facing card | Make it a 3D volume (`shape: beam`), tile the blade sheet along x | 2026-11-13 |
| Effect ends with a hard cut at the cell edge | Content reaches the cell border / vanishes clean | Border fade `edge=0.07`; end by eroding into lingering embers/ash | 2026-11-13 |
| first liquid build exploded to the frame edges, second barely moved | built a new VFX generator straight from memory without invoking the routed vfx skill, so its recipe rules (4 layers with roles, physics not painting, look over dark and light, --check) were applied by luck | skill-first; tune with the preview sheet, keep --check under 60 s | 2026-11-21 |
| liquid splash on armor 'hits the ground' mid-air, looks like a sticker on top, lighting weird | reused the floor-splash sim for mid-air pops and baked an upper-left light into opaque camera-facing cards | liquid.py --air (no floor, radial, half gravity); front-lit, self-lit, translucent, soft edges; sizes 0.8x | 2026-11-21 |
| Headless Playwright frame all black, `__done` never set | jsDelivr CDN blocked from headless Chromium in cloud sessions; module import fails silently | Route the CDN to a scratch `npm i three@0.186.1` (tools/vfx/shots/shoot.cjs) | 2026-11-24 |
| Bright red beam renders pink/white wash over the frame | 4 additive layers with gains 1.4-4 + bloom 2.6 + ACES desaturating highs | Gains <= 1.5, bloom <= 1, threshold 0.5, NeutralToneMapping; measure red-dominant % on a frame | 2026-11-24 |
| Umbrio generator NameError on a helper (merge) | each crimson-beam generator copies its own subset of helpers; nova lacked merge from beam2 | copy the full helper block (noise1, tube, ring_geo, merge, crystal_geo) into a new generator in one go; run the generator before the render | 2026-11-24 |
| Umbrio gradient texture shows flat white on a disk band | Neon material emissive ignores/overrides the `gradient` texture | Cel bands: give each band its own solid Neon colour step (or use a lit material for textured gradients) | 2026-11-24 |
