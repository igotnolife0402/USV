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
1. Build the effect in an isolated test page `tools/vfx/<name>/<name>.html` (+ tool.json; a root `vfx/` folder fails lint) with a trigger key and an FPS readout.
2. Serve, open with chrome-devtools-mcp/playwright-mcp, trigger, screenshot at peak (~100 ms) and decay; console clean.
3. Performance trace (chrome-devtools-mcp) for heavy effects: frame time ≤ 16 ms with 4x CPU throttle.
4. Integrate into the game/site; re-screenshot in context.
5. Roblox: build via Studio MCP run code (ParticleEmitter props), play, `look`/console check.

## Mobile fallback (/mobile)
- Build every effect/animation in a fresh **Umbrio Sandbox** tab (hub db docs via ArtifactData, recipe [umbrio-build](domains/3d/umbrio-build.md)): Neon/ForceField parts, point lights, anim tracks, flipbook `shape: beam`. Preview for the owner = **MP4** (`SHOTS_VIDEO=1 node test/run.mjs shots` in tools/3d/studio → clip.mp4, sent as a file), never a standalone HTML artifact (owner 2026-11-24).
- Standalone three.js pages only when the owner asks for a web page: no external textures; generate sprites on an offscreen canvas (radial gradient) or in-shader (smoothstep circles, noise).
- Shader errors are invisible without a console: log `gl.getShaderInfoLog` to an on-screen `<pre>`.
- Cloud check that works (2026-11-24): headless Chromium + [tools/vfx/shots/shoot.cjs](tools/vfx/shots/shoot.cjs); jsDelivr is unreachable there, so it serves three from a scratch `npm i three@0.186.1`. Make pages render a pure `frame(t)` from `?t=` and set `window.__done`.
- Additive beam/glow layers: keep layer gains <= ~1.5 and bloom <= ~1, use `NeutralToneMapping`; ACES + stacked additive red reads pink-white (crimson beam, 3 tries).
- Queue PC checks in [queue/pc.md](queue/pc.md), e.g.:
  `- [ ] 2026-11-21 perf trace explosion at 4x throttle, screenshot peak — vfx vfx/explosion.html`

## Quality bar
- Readable at a glance: clear silhouette, value contrast vs background, max ~0.5 s for gameplay hits.
- 60 fps on mid phone; particle cap enforced (pool), DPR capped at 2 for full-screen shaders.
- Respects `prefers-reduced-motion` (reduce shake/flash); no full-screen flashing > 3 Hz.
- No allocation per frame in update loops; no shader compile hitch at first trigger (warm up).

## Speed tricks
- Umbrio VFX depth (owner 2026-11-24 'beam is just a linear line, flat'): never plain cylinders/tori/spheres for energy. Template `tools/vfx/crimson-beam/umbrio_beam2.py`: physics flipbook beam (`kamehameha-beam:element=Ne`, sheet uploaded as hub asset, tex doc `{asset}`; headless shots get a data-url copy in `tex/`), thin translucent hot-red core tube (never a solid white Neon core: owner 2026-11-24 'white middle looks pretty bad'; the flipbook carries the bright centre), helix strand tubes, jagged lightning tubes flickering via `visible`, spiked crown, rippled ring meshes, rock shards rising with the shockwave, streak sparks aimed along launch. Its `tube(path, radii)` helper builds all of them.
- Umbrio VFX in one read (2026-11-24, 474 s spent finding these): template `tools/vfx/crimson-beam/umbrio_beam.py`; glow = `Neon` (core) / `ForceField` + `transparency` 0.45-0.88 (layers); torus lies flat, `size [dia, tube, dia]`, expand rings by scaling from a full-size torus (scaling a small one fattens the tube into a disc); tracks pos/rot/scale/color/visible only (fade = color to black); no camera track (shake = root group); `env.light: night`, fog `{color,near,far}`; keep sky effects below the view top (~target y + tan(fov/2)*dist). MP4: shots dir needs project.json, meta.json, geo/, uploads.json `{}`; ~90-100 s per run on llvmpipe, so get the layout right in one run. Flipbook sheets (1024 px, ~250 KB webp) always exceed the 225 KB doc cap: upload as a hub asset at once, never try data-url compression first (2026-11-24 cost a round).
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
