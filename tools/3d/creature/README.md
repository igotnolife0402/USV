# creature

Realistic animal from code: anatomy as smooth-blended shapes → mesh → painted fur → fur-shell render + Roblox GLB. Template: the tiger (owner-approved 2026-11-12). Needs only numpy, PIL, Playwright and three@0.186.1; no 3D modeling software, no pip installs.

## Steps
1. **Copy the template** to a scratch folder and run every step there (outputs never enter the vault). New animal = edit `geo.py` only: the anatomy block and `paint()`. Copy a new animal's `geo.py` back only if the owner wants it kept.
2. **Anatomy** (`geo.py`, "anatomy" section). World is metres, X forward, Y left, Z up, feet at Z=0. Each part is one line:
   - `U(Ell(centre, radii, rotation), k, 'group')` adds an ellipsoid; `U(Cone(a, b, r1, r2), k, 'group')` adds a round cone; `S(...)` carves.
   - `k` = blend width in metres (0.08-0.14 body, 0.02-0.05 face). Bigger = smoother join.
   - Build part by part: torso (3-4 ellipsoids), neck, head (`hp()` places points in head space; `RH` turns the head), ears, legs (`front_leg`/`hind_leg`: joints J, E, W, P per side), tail (`TAIL` list of x, y, z, radius).
   - Groups (`GROUPS`) drive fur length and paint per region. Grow `LO`, `HI` (field box) if the animal is bigger.
3. **Paint** (`paint(P, N)`): base colours via `srgb(r, g, b)`, belly/inner-leg white masks, stripes from `stripes_fn` (phase noise + band widths), nose and pads. Returns colour, fur length, comb direction.
4. **Scenery** (only when asked): ground, grass and foliage: `python3 tex.py` once per scratch folder (~70 s) and add `scene=1` to every render.
5. **Render mesh**: `python3 geo.py out` → `out/*.bin` + `meta.json` (surface nets at 6 mm, Taubin smoothing, eyes, whiskers).
6. **Preview**: `NODE_MODULES=<folder holding three> node render.js "w=640&h=400&shells=12&views=hero" preview` (headless Chromium; views `hero side front`). Look once, never loop.
7. **Final render**: `node render.js "w=2560&h=1600&shells=40&views=hero&depth=1" final`, then `python3 post.py final/hero.png final/hero_depth.png <focus m> final/<name>.jpg` (2x downsample, depth of field, vignette, grain, JPEG ≤400 KB). Focus m = camera-to-head distance (tiger 5.466).
8. **Roblox file**: `python3 glb.py final/<name>.glb` → ≤20k tris (QEM decimation), box-chart UVs, baked 1024 px texture, eye caps, 3.57 studs/m, feet at y=0. Tiger: 19,552 tris, 741 KB, 70 s.
9. **Open check** (crash check, not rating): `PAGE=glbview.html node render.js "" glbviews` loads the GLB like Roblox Studio (6 orbit views + tris/size). Fails only if it doesn't load.
10. Deliver `<name>.glb` + `<name>.jpg`: Roblox Studio → Import 3D → the .glb.

## Render options (`render.js` query)
`w h` size · `shells` fur layers (12 preview, 40 final) · `views` hero,side,front · `depth=1` depth pass for post.py · `scene=1` ground, grass and foliage (needs tex.py; off by default) · `grass=0` scene without grass · `dist fov tx exp cell` camera distance, lens, target x, exposure, fur cell size.

## Files
| File | Does |
|---|---|
| `geo.py` | anatomy, mesh, paint, render bins |
| `tex.py` | ground and foliage textures (only for `scene=1`) |
| `render.html` + `render.js` | three.js fur-shell render in headless Chromium |
| `post.py` | depth of field and final JPEG |
| `glb.py` | Roblox GLB (imports `geo.py`) |
| `glbview.html` | load check of the GLB |

## Known issues
- Final 2560 px render is the slowest step (CPU WebGL): render previews small, the final once. `render.js` uses Mesa llvmpipe when present (tiger preview 12.5 s → 5.2 s vs SwiftShader); `GL=swiftshader` forces the old one.
- `three` must be at `$NODE_MODULES/three` (or `node_modules/` here, gitignored); never commit it.
