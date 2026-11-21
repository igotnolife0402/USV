# flipbook: recipes and layers

A new effect is a preset's params, never new code; every effect is 4 stacked recipes. Back to the [README](../README.md).

## Recipes: a new effect is a preset's params, never new code (owner)
`python3 vfx.py OUT 'preset:key=value,key=value' --check` (id: the recipe with `:=,` as `-`). Colour is always `element=` (real emission lines, `kamehameha.LINES`): `Ar` cyan, `Ar-blue` blue, `Ne` red, `H` red-pink, `Sr` red, `Li` crimson, `Na` yellow, `Cu` green, `Ba` yellow-green, `Hg` violet-blue, `K` violet.
- `lightsaber-blade`: `element` (Ar-blue), `core` 0.045 and `sheath` 0.12 (widths, frame heights), `hum` 1 and `shimmer` 1 (amounts), `exposure` 1.7. Red saber: `lightsaber-blade:element=Ne`.
- `kamehameha-beam`, `kamehameha-charge`: `element` (default Ar II + Cherenkov). Red ball: `kamehameha-charge:element=Ne`.
- `slash`, `embers`, `flame-arc` share the swing (`prog`: the real swing's progress at even times, `_`-joined, e.g. traced from an animation; default an eased swing): `start` 150 / `end` -35 (deg, clockwise), `radius` 0.34, `sweep` 26 and `delay` 2 (frames), `cx` 0.5 / `cy` 0.6; `slash`: `element` (Li), `width`, `decay`, `core`, `gain`; `embers`: `n`, `speed`, `drag`, `gravity`, `kelvin`, `cool`, `gain`; `flame-arc`: `k0 k1 k_ref width rise cool density flame soot`.
- `dragon` (new kind of code, `slash.py`): a fire dragon riding the swing. Params: the swing's (`start end radius sweep delay cx cy prog`), `scale` 1.5-2.1 (head and body size), `n` 24 joints, `lag` 0.5 frames per joint, `amp` wave, `flap`, `overshoot` 26 deg (flies on past the end), `gain`, `sparks` 260 / `ash` 70 / `rise` / `linger`: it never vanishes clean: a noise front erodes the body with a white-hot edge, and the shed embers (blackbody T cooling, brightness ~ T^4, buoyant, wobbling) and dim ash flakes drift up and linger to the last frame. Stacks fade the frame border over 7 % (`edge=0.07`) so nothing cuts hard at the cell edge. Snake kinematics: every joint follows the head's own path `k*lag` frames later; SDF body, skull with open jaws, horns, spikes, a flapping four-finger wing; crimson body, lava cracks, hot edge, white-hot eye, mouth fire; ~6 s.
- Only a new kind of physics needs code (a new preset function, its params documented here).

## Layers: every effect is 4 stacked recipes (owner: livelier than one)
`python3 vfx.py OUT 'a+b+c+d' --name ID --check`: each recipe builds 64 frames, then they are composited bottom-first (premultiplied over) into one sheet; the first layer's emitter settings, the longest Lifetime. Save a good stack in `STACKS` (`vfx.py`) so `vfx.py OUT <name>` and `all` rebuild it pixel-identically.
- `crystal-burst` (in `STACKS`): `shock` (blast wave + flash) + big fast `glints` + fine `glints` + slow lingering `glints` dust; ~5 s, max_step_jump 2.95. For glass, crystal and ice breaking (shatter tool).
- `dragon-swing` (in `STACKS`, `vfx.py OUT dragon-swing`): `flame-arc` wake + `dragon` + crisp `slash` + `embers`, default swing; the avatar tool writes the same stack fitted to a real clip (`OUT/swing-recipe.txt`).
- Layer ideas: a body, an afterimage/halo, a hot core, particles; give each a role, don't repeat one look 4 times.

Hi-res stills for renders: `python3 kamehameha.py OUT --render 2048` → `kamehameha-beam-hd.png` (2048 x 512, the bulb where it leaves the hands at the left) and `kamehameha-charge-hd.png` (768 px). Measured: Cherenkov alone is a pale lavender-blue (0.43, 0.55, 1.0 linear), so the Ar II lines carry the cyan (0.0, 0.22, 1.0).

`black-hole --check` prints shadow radius vs 3√3 M (5.193 vs 5.196), which side Doppler brightens, motion % per frame and loop seam vs mean frame step (<1 = no pop).
