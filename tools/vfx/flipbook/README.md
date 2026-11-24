# flipbook

Roblox flipbook VFX made from physics, not painted: a 3D fire/smoke fluid sim and a ray-traced black hole. Each effect is one 1024 px sheet (Grid8x8: 64 frames of 128 px, so motion is smooth), straight alpha with colour bleed (no dark fringes), lossless PNG at zlib 6. **Sheets are white (greyscale) by default** (owner 2026-11-24): the scene colours them, so one sheet serves every theme; `--color` keeps the physical colours.numpy + Pillow only. Cap: every preset builds in under 60 s on 4 cores (`--check` fails otherwise).

## Steps
1. **Build** to a scratch folder (outputs never enter the vault): `python3 tools/vfx/flipbook/vfx.py OUT explosion --check` (one) or `python3 tools/vfx/flipbook/vfx.py OUT all --check` (every preset, plus `OUT/overview.jpg`).
   Writes `OUT/<preset>.png`, `OUT/<preset>.json` (emitter settings), `OUT/VFXLibrary.lua`; `--check` adds `OUT/<preset>.jpg` (sheet over dark and light sky) and prints seconds + the preset's own checks.
2. **Look once** at `<preset>.jpg` on both skies.
3. **Roblox**: upload the PNG, paste its id into `VFXLibrary.lua` (`AssetId`), put `VFX.lua` beside it, then `VFX.make("explosion", part):Emit(1)` (one-shot) or `VFX.make("black-hole", part).Enabled = true` (loop).
4. **Themes**: `VFX.make(id, part, studs, "fire")` (fire, ice, poison, void, holy, blood or any Color3); `VFX.recolor(e, theme)` later. Color multiplies the texture, with a white flash for the first 12 % of each particle. A per-pixel white-hot core needs a baked copy (`tint.py`).
5. **Library batch** (many sheets, fast): `python3 tools/vfx/flipbook/batch.py OUT [--jobs 4] [--only shock,slash]` builds 10 families x 10 recipe variants (`<family>-vNN`) on a process pool, verifies each PNG (saturation < 0.02, alpha, 1024 px, max_step_jump < 3, thin_stroke_pct < 10, < 60 s), rebuilds a failing sheet on a new seed (max 3 tries), and writes `batch.json` + `VFXLibrary.lua`. Measured 2026-11-24: 100 sheets, 0 fails, 102 s wall on 4 cores (377 s serial; explosion is 22 s of it each).
6. **Phone (/mobile)**: if the cloud session has python3 + numpy + Pillow, build there. Else save the recipe string with the task and queue the build in [queue/pc.md](../../../queue/pc.md) (`- [ ] YYYY-MM-DD python3 tools/vfx/flipbook/vfx.py OUT <recipe> --check — mobile vfx`). The old vault published PNGs as a GitHub release via a `vfx` workflow; NEW has no such workflow.

## Docs (open only the one you need)
| Need | Doc |
|---|---|
| What every preset makes, with its physics and build time | [presets](docs/presets.md) |
| A new effect from params (`preset:key=v`), the 4-layer stacks, `dragon-swing` | [recipes](docs/recipes.md) |
| Writing a preset: signature, checks, helpers, fluid sim, speed notes, files | [API](docs/api.md) |
