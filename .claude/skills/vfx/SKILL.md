---
name: vfx
description: 'Use for visual effects, particles, explosions, magic, trails, beams, hit sparks, impacts, auras, shaders: Roblox ParticleEmitter/Beam/Trail recipes and three.js particle/shader recipes, with timing, layering (core, glow, sparks, smoke) and readability rules.'
---
# vfx — Roblox + three.js effects

## Design rules (both engines)
- Layer every effect, back to front: SMOKE (slow, dark/grey, alpha, long) → GLOW (soft additive, big, short) → CORE (bright, small, the shape) → SPARKS (fast, tiny, additive, gravity). Optional: shockwave ring, ground decal, light flash.
- Timing: anticipation 0-0.1 s → impact 0-0.08 s (brightest, biggest) → follow-through 0.2-0.6 s → dissipation 0.5-2 s. Fast in, slow out. Total hit effect <= 0.5 s; explosion <= 1.5 s; ambient loops seamless.
- Readability: silhouette first, color second. One dominant hue + white-hot core + one accent. Value contrast against the scene background. Gameplay-critical effects (hitboxes, telegraphs) are clear at 25% screen size.
- Size curves: start small → pop to max in 10% of life → shrink. Alpha: fade in 0-10%, fade out last 40%.
- Budget: < 200 live particles per effect on mobile; one burst > continuous emission; Rate 0 + `:Emit(n)` for bursts.

## Existing sheets first
Every effect ever made is in `vfx/sheets` (white). `grep -i <word> vfx/index.tsv | cut -f1-5`, reuse it, paint it per [vfx/README.md](../../../vfx/README.md) (gradient map, over-life colour, texture overlay, blend). Only generate when nothing fits.

## Flipbook sheets (owner's physics generator)
Need a texture sheet (explosion, black hole, beam, slash, dragon swing, crystal burst)? Use [tools/vfx/flipbook](tools/vfx/README.md) and follow [domains/vfx/flipbook.md](domains/vfx/flipbook.md): physics never painted, 4 stacked layers (`'a+b+c+d' --name ID`), new effect = recipe (`preset:key=v`), checks `max_step_jump` < ~3, `thin_stroke_pct` < ~10, < 60 s, look over dark + light sky, output to scratch. Emit with `VFX.lua` (Grid8x8).

## Roblox recipes
Attach to an `Attachment` in a part (invisible, `CanCollide=false`, `Anchored=true`). Fire with `emitter:Emit(n)`; cleanup with `Debris:AddItem(part, maxLifetime)`.
| Layer | ParticleEmitter props |
|---|---|
| Core | `Texture` soft circle/star, `LightEmission=1`, `Brightness=3`, `Lifetime=0.15-0.25`, `Speed=0`, `Size=NumberSequence{0:0.5, 0.1:3, 1:0}`, `Emit(1-3)` |
| Glow | `LightEmission=1`, `Transparency=NumberSequence{0:0.4, 1:1}`, `Size 0:2 → 1:6`, `Lifetime=0.3`, `Emit(1)` |
| Sparks | `LightEmission=1`, `Speed=NumberRange.new(20,40)`, `SpreadAngle=Vector2.new(180,180)`, `Acceleration=Vector3.new(0,-40,0)`, `Drag=3`, `Lifetime=NumberRange.new(0.2,0.5)`, `Size 0:0.2 → 1:0`, `Orientation=VelocityParallel`, `Squash` for streaks, `Emit(15-30)` |
| Smoke | `LightEmission=0`, `Color` grey, `Transparency 0:1, 0.1:0.5, 1:1`, `Speed=NumberRange.new(2,6)`, `Lifetime=NumberRange.new(1,2)`, `RotSpeed=NumberRange.new(-60,60)`, `Size 0:2 → 1:8`, `Emit(6-10)` |
| Shockwave | flat ring texture, `Orientation=VelocityPerpendicular` w/ `EmissionDirection=Top`, `Speed=0.01`, `Size 0:0 → 1:15`, `Lifetime=0.3` |
- `Beam`: two attachments, `Texture` scrolling (`TextureSpeed=2`, `TextureMode=Wrap`), `Width0/1`, `LightEmission=1`, `FaceCamera=true`; lasers/lightning (animate `CurveSize0/1` randomly per frame for lightning).
- `Trail`: two attachments on the moving part (sword blade tip + base), `Lifetime=0.15-0.3`, `Transparency 0:0.2 → 1:1`, `WidthScale 0:1 → 1:0`, `LightEmission=1`; enable only during the swing.
- Flash: `PointLight` `Brightness=5`, `Range=12`, tween to 0 in 0.15 s.
- Spawn effects on the CLIENT (FireAllClients with position) for smoothness; server only decides that it happened.
- Textures: use Roblox stock assets via the Toolbox or owner-provided ids; never invent `rbxassetid` numbers (ask or leave a `TEXTURE_ID` constant).

## three.js recipes
- Particles: `THREE.Points` + `BufferGeometry` with preallocated `position`, `velocity`, `life`, `size` attributes (pool size fixed, e.g. 2000); update on CPU in the loop, set `attr.needsUpdate=true`; `PointsMaterial({ size, map: softCircleCanvasTexture, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, vertexColors:true, sizeAttenuation:true })`.
- Soft circle texture from canvas: radial gradient white→transparent, 64x64, `CanvasTexture`.
- Per-particle size/alpha over life → small `ShaderMaterial`:
```glsl
// vertex
attribute float size; attribute float life; varying float vLife;
void main(){ vLife = life; vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_PointSize = size * (300.0 / -mv.z) * sin(3.14159 * clamp(life,0.0,1.0)); gl_Position = projectionMatrix * mv; }
// fragment
uniform vec3 color; varying float vLife;
void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
  gl_FragColor = vec4(color, smoothstep(0.5, 0.0, d) * vLife); }
```
- Many meshes (debris, shards) → `InstancedMesh`, set matrices per frame.
- Glow: `UnrealBloomPass` (strength 0.8-1.5, radius 0.4, threshold 0.8) via `EffectComposer`; or additive billboard sprites if no post-processing.
- Trails: ring buffer of last N positions → `Line2`/ribbon `BufferGeometry` with alpha fading by index.
- Shockwave: `RingGeometry` + additive material, scale 0→10 and opacity 1→0 over 0.3 s.
- Presets as data: `{ name, count, life:[min,max], speed:[min,max], spread, gravity, size:[start,end], color:[start,end], blending }`.

## Verification (one check)
Trigger the effect 3 times against the real scene background; screenshot at peak (impact frame) and at 50% life. Check: reads at small size, no hard sprite edges, no lingering particles, fps holds.

## Done-check (`checklists/vfx.md`)
- [ ] >= 3 layers (core, glow, sparks/smoke), timing fast-in slow-out.
- [ ] Cleanup (Debris / pool reuse), no leaks after 20 triggers.
- [ ] Particle budget respected; readable against background.

## Time target
Single effect < 5 min. Effect library (5+ presets) → one preset per pass.

## Mobile
No Studio. Build the effect as a single-file three.js HTML Artifact (CDN import map, button to trigger, preset JSON visible) to judge timing/layers, then write the Roblox version as a `.luau` module in the repo that constructs the emitters in code (`src/shared/VFX/<Name>.luau` with `play(cframe)`). Queue: `- [ ] YYYY-MM-DD playtest VFX <Name> in Studio, tune sizes/textures — mobile build`.
