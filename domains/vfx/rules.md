---
summary: Applied lesson rules for vfx (from lessons.md); read with the playbook before any vfx task.
updated: 2026-11-24
status: current
---
# VFX rules (applied lessons)
- Flipbook effect = 4 stacked recipes; `vfx.py --check` must show max_step_jump < ~3 and thin_stroke_pct < ~10, built to scratch (L-041)
- New effect = a recipe of existing presets; only new physics gets code (L-042)
- 8x8 sheets need FlipbookLayout Grid8x8, never a helper hard-coded to 4x4 (L-043)
- Effects never vanish cleanly: they erode into lingering embers or ash (L-044)
- for any VFX build invoke the vfx skill first and follow its done-check, even when writing a new generator (L-050)
- match the sim to where the effect plays (air vs floor); flipbook cards are front-lit and translucent, never baked side light (L-054)
- Hit-stops freeze flipbooks (they run on story time): a card born on a hit pre-rolls ~12% of its life so the freeze holds its peak, never its blank first frame (L-162, `tools/3d/avatar/duel/stages/build.py` card()).
- Every sheet ships white (greyscale, alpha kept); colour comes from the scene (VFX.make theme / emitter Color), never baked in, unless the owner asks for `--color` (owner 2026-11-24)
- Variant libraries: `batch.py` (recipes x seeds, 4-process pool, per-PNG verify, reseed on fail); never hand-pick seeds
