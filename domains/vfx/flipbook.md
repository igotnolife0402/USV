---
summary: Physics flipbook sheets (tools/vfx/flipbook): owner rules, 4-layer stacks, recipes, smoothness checks, Roblox emitter use
updated: 2026-11-21
status: current
triggers: [flipbook, sheet, effect sheet, kamehameha, black hole, lightsaber, slash, embers, dragon vfx, flame arc, shock, glints, crystal burst, recipe, stack, layers]
---
# Flipbook sheets (physics, not painted)

Tool: [tools/vfx/flipbook](tools/vfx/flipbook/README.md) (python3 + numpy + Pillow). Presets and physics: [presets](tools/vfx/flipbook/docs/presets.md); params and stacks: [recipes](tools/vfx/flipbook/docs/recipes.md); writing a preset: [API](tools/vfx/flipbook/docs/api.md). Ported from the old vault 2026-11-21.

## Owner rules (never drop)
1. From physics (sims, ray tracing, particles), never painted. Start from the generator API.
2. Every effect = 4 stacked layers, each with its own role (body, afterimage/halo, hot core, particles), not one look x4: `vfx.py OUT 'a+b+c+d' --name ID --check`. A good stack goes in `STACKS` in `vfx.py` so `all` rebuilds it pixel-identically.
3. A new effect is a recipe of existing presets (`preset:key=v,key=v`). Only a new kind of physics gets code (new preset function, params documented in recipes).
4. Colour is always `element=` (real emission lines): `Ar` cyan, `Ar-blue` blue, `Ne` red, `H` red-pink, `Sr` red, `Li` crimson, `Na` yellow, `Cu` green, `Ba` yellow-green, `Hg` violet-blue, `K` violet.
5. Nothing disappears clean: the end erodes into drifting, cooling particles/ash that linger; leave frames for them. Stacks fade the cell border (`edge=0.07`) so nothing cuts at the cell edge.
6. The hero layer reads: supporting layers (crescent, wake) stay dim under it.
7. Beams are 3D volumes (`shape: "beam"`), never camera-facing cards (cards turn with the screen).
8. The purple `PACK` presets belong to the dragon creature only: never on other creatures.
9. Outputs go to a scratch folder, never into the repo. Every preset builds in < 60 s on 4 cores (`--check` fails otherwise; `VFX_NO_CAP=1` only for slow CI).

## Checks (`--check` prints measured numbers, never opinions)
| Check | Pass | Notes |
|---|---|---|
| Frames | 64 (Grid8x8, 1024 px sheet, 128 px cells) | Roblox max sheet size; 64 frames keep motion smooth |
| `max_step_jump` | < ~3 | Biggest frame step vs its neighbours on visible frames. Eased swing/burst ~1.5; a pop reads high. Fast swing, lightning, saber hum sit at 2.5-3 by design |
| `thin_stroke_pct` | < ~10 | Share of bright pixels in strokes < 3 px at 128 px; hair-thin lines read badly |
| Seconds | < 60 | Owner cap |
| Loop seam | seam step < mean frame step (ratio < 1) | `black-hole --check` also prints shadow radius vs 3√3 M (5.193 vs 5.196) |
| Look | once, `OUT/<preset>.jpg` over dark AND light sky | Straight alpha + colour bleed: no dark fringes |

## Speed levers (measured, 80³ fluid)
- Render key frames only; in-betweens are flow-warped motion tweens (`fluid.tween`): explosion 44 s → 23 s. Exact cheap motion (black hole) renders every frame: tweens there only ghost.
- Semi-Lagrangian advection is unconditionally stable: fewer, larger sim steps are the cheapest lever.

## PC (/pc)
1. `python3 tools/vfx/flipbook/vfx.py <scratch> <preset|recipe|stack> --check`; `all` also writes `overview.jpg`.
2. Look once at the jpg on both skies; fix until checks pass (3-try cap).
3. Roblox: upload PNG (Studio MCP or Creator Hub), paste the id into `VFXLibrary.lua` `AssetId`, put [VFX.lua](tools/vfx/flipbook/VFX.lua) beside it, `VFX.make("explosion", part):Emit(1)` (one-shot) or `.Enabled = true` (loop). Loops: each particle lives 4 cycles with fade in/out so two overlap and the loop never pops.
4. 8x8 sheets need `FlipbookLayout = Grid8x8`: a helper hard-coded to 4x4 (old kit `ElementVFX.make`) shows quarter frames; use VFX.lua's emitter.
5. Hi-res stills: `python3 tools/vfx/flipbook/kamehameha.py OUT --render 2048`.

## Mobile fallback (/mobile)
- Cloud session with python3 + numpy + Pillow: build and check there exactly as on PC (no Studio upload).
- Otherwise: write the recipe string and the `STACKS` edit in the repo, preview the look as a canvas Artifact (playbook), queue `- [ ] YYYY-MM-DD python3 tools/vfx/flipbook/vfx.py OUT <recipe> --check, upload PNG, set AssetId — mobile vfx` in [queue/pc.md](queue/pc.md).
