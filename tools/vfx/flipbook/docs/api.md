# flipbook: adding a preset (API)

Preset signature, checks, helpers, the fluid sim, tweening, speed notes. Recipes: [recipes](recipes.md). Back to the [README](../README.md).

A preset is `def name(seed) -> (frames, entry, checks)`, registered in `PRESETS` in `vfx.py`:
- `frames`: list of 64 uint8 RGBA arrays (128, 128, 4) (`vfx.S`, `vfx.F`) from `img.finish(C, A)`, where `C` is premultiplied float colour (S, S, 3) and `A` alpha (S, S).
- `entry`: `FlipbookLayout` (`Grid8x8`), `FlipbookMode` (`OneShot`/`Loop`), `FlipbookFramerate` (loops), `Lifetime` (s), `LightEmission`, `LightInfluence`, `SizeStuds` [min, max], `Orientation` (`FacingCamera`/`VelocityParallel`/`VelocityPerpendicular`).
- `checks`: dict printed by `--check` (measured numbers, never opinions). `--check` adds `max_step_jump` for every preset: the biggest frame-to-frame step of motion over its neighbour, on frames with content and visible (premultiplied) colour, so an eased swing or a burst reads ~1.5 and a pop (something appearing whole) reads high (choppy above ~3; a 14-frame fast swing, lightning and the saber hum run near 2.5-3), and `thin_stroke_pct`: share of bright pixels in strokes under 3 px (hair-thin lines read badly; keep under ~10). Black hole went 19.6 → 9 with a 73° view, tighter frame, 3 px photon ring, broad filaments and a 1 px thick-disk blur.

Helpers:
- `img.finish(C, A, edge=0.08)` edge fade + colour bleed → RGBA uint8; `img.sheet(frames, path)`; `img.blackbody(kelvin)` → linear RGB; `img.smooth(e0, e1, x)`; `img.blur(img, k)`; `img.fbm(a, c, t, seed, oct, pa, pt)` value noise periodic in `a` (period `pa`) and `t` (period `pt`).
- `fluid.Sim(N, seed)`: fields `v` (3, N, N, N) as (vz, vy, vx), `rho` soot, `T` heat (1 ≈ 2400 K), `fuel`, `flame`; `turb` (curl-noise force field or None); `blast` = (shape, per-step strengths) extra expansion; `step(P)` with P keys `expand burn ignite heat soot buoy weight vort turb drag cool fade`. Walls are a sponge: gas fades 6 cells from the edge.
- `fluid.render(sim, S, P, flow=False)` → (C, A) or, with flow, (C, A, flow) where flow is (rows, cols) pixels per step averaged over what is visible; `fluid.tween(k0, k1, t)` → (C, A) in-between of two such keys; P keys `sigma shadow sun_slope k0 k1 k_ref glow_at glow flame flame_k smoke amb sun exposure`. Kelvin = `k0 + k1 * T`; emission ∝ absorption × (K / k_ref)⁴ (Kirchhoff + Stefan-Boltzmann).
- `fluid.noise_tile(N, seed, scale)` tileable 3D noise 0..1; `fluid.curl_noise(N, seed, scale)` divergence-free turbulence.

## Tweening
Only key frames are fully rendered; in-betweens are motion tweens (`fluid.tween`): explosion 44 s → 23 s with no alternating jumps. The black hole renders every frame (8 s) because its motion is exact and cheap; a tween there would only add ghosting.

## Speed notes (measured, 80³)
Sim step ~0.35 s (advection gathers ~60 %), render ~0.3 s/frame (shading on the grid, one batched matrix upsample, cumprod along z), PNG encode ~0.5 s. Semi-Lagrangian advection is unconditionally stable, so fewer, larger steps are the cheapest speed lever.

## Files
| File | Does |
|---|---|
| `vfx.py` | presets, CLI, checks, Lua library, overview |
| `fluid.py` | 3D fire/smoke sim + volume renderer |
| `blackhole.py` | ray-traced black hole |
| `kamehameha.py` | energy-wave beam + charge ball, hi-res stills |
| `slash.py` | sword swing trail, embers, wake fire |
| `burst.py` | impact bursts: shock wave, glints |
| `img.py` | finish, sheet, blackbody, blur, noise |
| `VFX.lua` | library entry + asset id → ParticleEmitter |
