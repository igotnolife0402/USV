# liquid — the VFX Generator (liquid simulation, layered sheets)

Particle liquid simulation (gravity, drag, cohesion/surface tension, PIC viscosity, floor splash) rendered as **4 stacked layers**:
`mist` (add) → `body` (normal, shaded metaball surface with specular + rim) → `drops` (normal, motion-stretched droplets) → `glow` (add).
Each layer is one 1024 px Grid8x8 sheet, 64 frames at 30 fps. Ends by thinning into droplets and a puddle, never a hard cut.

## Steps (target: under 1 minute total)
1. `python tools/vfx/liquid/liquid.py OUT <poison|water|blood|slime|lava> --check` (builds in ~2 s; fails if over 60 s, empty or choppy).
2. Look at `OUT/<preset>_preview.png` once (all layers composited).
3. Import into **Umbrio Sandbox** (Claude-Hub tile): add each `<preset>_<layer>.png` as a flipbook effect with the same start and size, in the manifest order (`OUT/<preset>.json`): mist, body, drops, glow. Blend per the manifest.
4. Animate tab → Effects list → drag the effect onto the part's row at the hit/equip frame.

Options: `--cell 128` (frame px; 256 for close-ups = 2048 px sheets), `--seed N` (new variation).
New look = a new preset dict (colours, shape `burst|splash|spray`, speed, gravity, cohesion), not new code.
Outputs go to a scratch folder, never the repo.

Checked 2026-11-21: `liquid.py OUT poison --check` 1.6 s, max_step_jump 0.09.
