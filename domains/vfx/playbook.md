---
summary: Fastest proven path to punchy, performant VFX: layered particles, shaders, bloom; PC screenshot-verified, mobile Artifacts
updated: 2026-11-21
status: current
triggers: [particles, shader, explosion, glow, bloom, vfx]
---
# VFX playbook

## Deliverable (owner 2026-11-25, L-149)
- Effects come from the owner's VFX pack (`vfx/`, profiles/tools.md "VFX Pack"), painted per element; never hand-drawn three.js effects. Every element needs its own 3D hero (parts with pos/scale/color/visible tracks: bubbles that pop, fireball, black hole, sky pillar, rock spikes, books) + pack sheets as layers; no beam shapes unless asked (tools/vfx/elemental-onslaught/elements.py). Builder: tools/vfx/elemental-onslaught/umbrio.mjs (spec: anchors hand/T in metres, 3 s per beat: charge 0.5, travel 0.35, impact, linger).
- Every VFX ends in a fresh Umbrio tab: models as Umbrio meshes, effects as flipbook sheets (8x8, hub assets, `projects/<id>/tex/<id>` = `{asset}`) placed on the clip timeline. three.js pages only render the sheets ([sheets.mjs](tools/vfx/elemental-onslaught/sheets.mjs)). VFX is medium tier, however long.
- Sheets go up as hub assets first (Artifact `asset: true`, `file_paths`), then `tex` docs `{asset: id}`; base64 in a doc breaks the 256 KiB cap (L-150). Speed: render sheets + build the model in parallel, one write batch per stage.

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
- No browser automation or local files. Build the effect as an Artifact (tap to trigger) so the user sees it on the phone; save to `vfx/<name>.html` in the repo.
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
- Hub VFX Generator (2026-11-25): an element's main flipbook = a sheet script on the hub ugen.js (house style: one library element + one partner; jump < 3), baked by tools/vfx/elemental-onslaught/bake-sheets.cjs from gen-sheets.json; pack sheets are support layers.
- Palette/filler rule (L-155, 2026-11-25): a VFX rebuild starts `fx` empty (no carry-over cards); one PAL table per element drives ramps, part colours, impact lights and the caster circle (recoloured per element window); no layer cap (owner 2026-11-25, L-156 supersedes the 1-partner cap): layer smoke, glow, core, sparks, decal per element and paint every white sheet with its own multi-stop hue-shifting ramp + texture (`tex`, `texAmt` in umbrio.mjs); verify read-back ramps against element windows.
- Causal spec rule (L-157, 2026-11-25): before any generator sheet, write its spec (shape, motion over t, size in cell, colour ramp, the event that causes it) in a SPEC.md; after the bake, contact-strip every sheet and compare to its spec before use. A showcase tells ONE story where each layer is caused by the previous event (no beam raising dirt spikes), <= 10 flipbooks. Template: tools/vfx/frost-comet/ (SPEC.md, sheets.json, build.mjs).
- MP4 on mobile (2026-11-26): `SCRATCH=<s> DEPS=<s>/deps/node_modules SHOTS_TAB=<OUT/studio> SHOTS_DEVICE=desktop SHOTS_AT=... SHOTS_VIDEO=1 node tools/3d/studio/test/run.mjs shots` (22 s) -> <s>/shots/clip.mp4 + shots.jpg; needs an `OUT/studio/geo` dir (may be empty) and deps three@0.186.1, three-mesh-bvh@0.9.16, three-bvh-csg@0.0.18, mp4-muxer@5.2.2.
