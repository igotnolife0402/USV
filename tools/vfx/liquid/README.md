# liquid — the VFX Generator (liquid simulation, layered sheets)

Particle liquid simulation (gravity, drag, cohesion/surface tension, PIC viscosity, floor splash) rendered as **4 stacked layers**:
`mist` (add) → `body` (normal, shaded metaball surface with specular + rim) → `drops` (normal, motion-stretched droplets) → `glow` (add).
Each layer is one 2048 px Grid8x8 sheet (256 px frames), 64 frames at 30 fps. Ends by thinning into droplets and a puddle, never a hard cut.

## Steps (target: under 1 minute total)
1. `python tools/vfx/liquid/liquid.py OUT <poison|water|blood|slime|lava> --check` (builds in ~7 s; fails if over 60 s, empty or choppy).
2. Look at `OUT/<preset>_preview.png` once (all layers composited).
3. Import into **Umbrio Sandbox** (Claude-Hub tile): add each `<preset>_<layer>.png` as a flipbook effect with the same start and size, in the manifest order (`OUT/<preset>.json`): mist, body, drops, glow. Blend per the manifest.
4. Animate tab → Effects list → drag the effect onto the part's row at the hit/equip frame.

Options: `--air` (mid-air burst: no floor, half gravity, radial; use it for anything on a body or in the air, never the floor splash), `--cell 256` default (128 = 1024 px sheets for small or far effects), `--seed N` (new variation).
New look = a new preset dict (colours, shape `burst|splash|spray`, speed, gravity, cohesion), not new code.
Outputs go to a scratch folder, never the repo.

Checked 2026-11-21: `liquid.py OUT poison --check` 7.1 s at 256 px, max_step_jump 0.10. Droplets are shaded like the body (highlight + fresnel rim), pools get fixed-noise ripples.

Shading (2026-11-21, owner: "looked like a layer on top, lighting weird"): lit from the camera, not a side light, mostly self-lit, thin liquid translucent, soft edges, 3-frame fade in. A baked side light fights the scene light on a camera-facing card.
