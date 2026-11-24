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
