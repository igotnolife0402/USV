---
summary: Stylized mobile-game VFX sheet generator (owner reference 2026-11-24): toon shapes + flipbook HSV ramp + same-hue halos
updated: 2026-11-24
status: current
---
# tools/vfx/stylized
`python3 sheet.py OUT.png [REF.jpg]`: 62 effects at the owner reference layout in about 1 s; with REF it also writes OUT-compare.png and prints the per-cell hue/sat match.
- style.py: `colorize` uses the same 5-step ramp as `flipbook/vfx.layer_colors`; `glow_fx` = textured mask + padded halo; `Canvas.add` round window (no square halo edges).
- shapes.py: glint, big_glint, ring, portal, tornado, swirl, orb, magic_circle (11 kinds), icons, cloud, bubbles, fireball, lava, sparkle_box, wind, cluster, sparks, rune_ring, slash_glint, crosshair.
- First run 2026-11-24: 31/62 cells within hue 20 deg + sat 0.1. Weak: tornado/portal fill (ours = lines), big-glint softness, swirl saturation, white glints.
- Reference recreation: extract the image from the session jsonl to scratch, sample hues per cell, check with `sheet.py OUT REF` (L-177).

## recolor.py (2026-11-24, owner: identical shapes + strong gradient/pattern)
`python3 recolor.py REF.jpg OUT_PREFIX` → `-white.png` (exact ref shapes as white light + alpha), `-color.png` (ref hues, ±26° hue-shift gradient to a white core, per-effect pattern: voronoi / flow stripes / hex / rune rings, soft-blended), `-compare.png`. Gates printed: shape_corr ≥ 0.95, hue_family ≤ 20°, gradient_spread ≥ 30° (last: 0.963 / 9.2 / 51.6). Use this, not sheet.py, when shapes must match a reference.

## batch.py (2026-11-24, owner: save the 62 as white + 200 more, same style, unique)
`python3 batch.py REF.jpg OUTDIR [N]` (~65 s) → `OUTDIR/ref/` 62 whites (256 px, white RGB, light = alpha, radial edge fade), `OUTDIR/new/` N whites + `sheetK-color.png`. New cells = shapes.py families or back+front combos, random rotate/squash/mirror, ref palette hues, all through the same `recolor()`. Gates: uniqueness (32x32 light corr ≤ 0.92, 30 tries, least-similar kept), empty 0, per sheet gradient ≥ 30°, hue ≤ 20°. Last: 200 made, max corr 0.92, gradient 32-41°.

## symbols.py (2026-11-24, owner: "all should be a different shape icon symbol")
`python3 symbols.py - OUTDIR [N]` → N whites `NNN_UXXXX_hue.png` + `sheetK-color.png`, same recolor() style. Every cell is a different silhouette: curated Unicode symbol ranges (DejaVu/OpenSymbol, tofu + clip-art filtered by SKIP) interleaved with procedural superformula / emblem / star / lissajous / spiral / rose shapes; corr gate MAXC 0.80 on 32×32 light. Last run: 200 made, max_corr 0.799, 0 empty, gradient 45-48°, all 4 sheets viewed.

## actions.py (2026-11-24, owner: "mostly animated slashes, smashes, wind and all others; 70/30 with symbols")
`python3 actions.py SYM_DIR OUTDIR [140] [60]` (~7 min) → `OUTDIR/action/NNN_kind_hue.png` white Grid4x4 flipbooks (16 frames, 1024 px) + `-color.png`, `OUTDIR/symbols/` the 60 most distinct symbols.py whites (farthest-first pick). 22 kinds: slash, x-slash, claw, spin, smash, slam, punch, star hit, gust, spiral gust, dash lines, tornado, explosion, fire, lightning, splash, beam hit, magic, heal, dust, ice, smoke; quota 30/30/25/55. Timing grow 0-.25, peak, noise erosion .55-1, lingering motes. Gates: peak-frame corr < 0.85, `max_step_jump` (flipbook/vfx.py metric) < ~3, empty frames.

## gifs.py (2026-11-24, owner: "save them as gifs")
`python3 gifs.py OUTDIR/action GIFDIR [50]` (~25 s for 140) → one looping 16-frame 256 px GIF per effect: `colour/` on the navy backdrop, `white/` white-on-black (GIF alpha is 1-bit, so glow cannot be transparent; use additive/screen). Roblox ParticleEmitter still needs the Grid4x4 PNG sheet.
