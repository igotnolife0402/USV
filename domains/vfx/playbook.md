---
summary: Fastest proven path to punchy, performant VFX: layered particles, shaders, bloom; PC screenshot-verified, mobile Artifacts
updated: 2026-11-24
status: current
triggers: [particles, shader, explosion, glow, bloom, vfx]
---
# VFX playbook

## Pick the tool
| Need | Use |
|---|---|
| 2D hits, sparks, dust | Canvas 2D particle pool, `globalCompositeOperation='lighter'` |
| Thousands of particles / 3D | three.js `Points` or InstancedMesh, GPU-updated in shader |
| Full-screen backgrounds, distortion | Fragment shader on a full-screen quad (raw WebGL or three.js) |
| Glow | three.js `EffectComposer` + `UnrealBloomPass`; 2D: additive + blur sprite |
| UI/CSS effects | CSS transforms, `filter`, `@keyframes`; no JS |
| Roblox | ParticleEmitter, Beam, Trail, Attachment; see [roblox](domains/roblox/index.md) |

## Anatomy of a good effect (layer these)
1. Anticipation (0-50 ms): flash or scale-up.
2. Core burst: bright, fast, short life (100-300 ms), additive.
3. Secondary: smoke/debris, slower, normal blend, gravity + drag.
4. Residue: embers/decals fading 0.5-2 s.
5. Camera: shake 4-10 px decaying, hit-stop 30-80 ms, optional chromatic flash.
Curves: size and alpha over life via ease-out; color hot (white/yellow) → cool (orange/red → gray).

## PC (/pc)
1. Build the effect in an isolated test page `vfx/<name>.html` with a trigger key and an FPS readout.
2. Serve, open with chrome-devtools-mcp/playwright-mcp, trigger, screenshot at peak (~100 ms) and decay; console clean.
3. Performance trace (chrome-devtools-mcp) for heavy effects: frame time ≤ 16 ms with 4x CPU throttle.
4. Integrate into the game/site; re-screenshot in context.
5. Roblox: build via Studio MCP run code (ParticleEmitter props), play, `look`/console check.

## Mobile fallback (/mobile)
- Sheet effects: run the flipbook tool in the cloud session as on PC ([flipbook](domains/vfx/flipbook.md)); queue only upload + Studio playtest.
- Headless Chromium + Playwright work for one small screenshot check (profiles/mobile.md); no local files. Otherwise build the effect as an Artifact (tap to trigger) so the user sees it on the phone; save to `vfx/<name>.html` in the repo.
- Artifacts: no external textures; generate sprites on an offscreen canvas (radial gradient) or in-shader (smoothstep circles, noise).
- Shader errors are invisible without a console: log `gl.getShaderInfoLog` to an on-screen `<pre>`.
- Queue PC checks in [queue/pc.md](queue/pc.md), e.g.:
  `- [ ] 2026-11-21 perf trace explosion at 4x throttle, screenshot peak — vfx vfx/explosion.html`

## Quality bar
- Readable at a glance: clear silhouette, value contrast vs background, max ~0.5 s for gameplay hits.
- 60 fps on mid phone; particle cap enforced (pool), DPR capped at 2 for full-screen shaders.
- Respects `prefers-reduced-motion` (reduce shake/flash); no full-screen flashing > 3 Hz.
- No allocation per frame in update loops; no shader compile hitch at first trigger (warm up).

## Speed tricks
- One generic emitter `{rate, life, speed, spread, gravity, drag, colors, size}` + presets beats bespoke code.
- Additive blending makes anything look 2x better on dark backgrounds.
- Value noise / fbm in shader covers fire, smoke, water, clouds.
- Reuse snippets in [snippets](domains/vfx/snippets/README.md).

## Done
Run [checklists/vfx.md](checklists/vfx.md). Add new failures to [errors](domains/vfx/errors.md).

## Quality tricks (liquid, 2026-11-21)
- Shade every liquid layer, droplets included: normal from the density gradient, a broad + a sharp specular (`^40` and `^400`) and a fresnel rim `(1-n.z)^2` in the emissive colour. Flat-coloured drops read as blobs.
- Normalise splat density by blur width (`w*w`) so one droplet clears the surface threshold at any cell size.
- Thick flat pools need detail: add fixed (not per-frame) noise to the height before the gradient, or they flicker.
- Flipbook cards in a 3D scene: never bake a side light (it fights the scene light as the camera turns); light from the camera, mostly emissive, thin parts translucent, soft alpha edges. Physics must match where it plays: a floor bounce only on the ground (`liquid.py --air` for bodies/mid-air).
- No overkill: effects mark the one big moment (all done) or run small and subtle throughout; never a big burst on every step (each armor piece, each hit). Owner rule 2026-11-21, applies to all builds.
