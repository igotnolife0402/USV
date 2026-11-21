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
