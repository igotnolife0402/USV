# voxel

Voxel build for Roblox from code: a 3D grid of colours → greedy-merged anchored Parts in a `.rbxmx` (1 voxel = 1 stud), built live in a studio tab, plus one preview render. Template: the 50×50 city (2026-11-13). Needs only numpy, PIL, Playwright and three@0.186.1; no installs.

## Steps
1. **Copy this folder** to a scratch folder and run every step there (outputs never enter the vault).
   The city template's streets and props are for city requests.
2. **Layout** (`city.py`): grid `W, H, D` in studs. Colours = `pal(kind, name=(r, g, b))` (kind `s` plastic, `n` neon, `g` glass, `w` water). Shapes: `box`, `put`, `disk`, `blob`, `tree`, `pine`, `building`, `house`, `car`, `lamp`. `group(name)` starts a Model; `STAGES` sets the live build order.
3. **Vary colour per window, patch or stripe, never per voxel**: random per-voxel shades blocked merging (3,338 parts, studio doc 309 KB); patterns gave 2,243 parts, largest stage 204 KB.
4. **Build**: `python3 city.py city.rbxmx stages` → `city.rbxmx` + `stages/stage1..7.json` (each under 250 KB, the studio doc limit). City: 20,923 voxels → 2,243 Parts, 20 Models, 1.46 MB, 3 s.
5. **Live build in the hub's 3D studio** (steps: [studio note](../../../domains/3d/studio.md)): per stage `python3 stamp.py <i>` (last stage: `python3 stamp.py 7 thumb.jpg`, a 320×240 JPEG), then one Artifact data `batch` on the hub URL: `set` `meta/<id>` from `live/m<i>.json` and `projects/<id>` from `live/p<i>.json`, with `if_version` after the first stage.
6. **Render**: `NODE_MODULES=<folder holding three> PAGE=view.html node render.js "w=2560&h=1920" final` (headless Chromium, ~40 s), then PIL `resize((1280, 960), LANCZOS)` → JPEG q90 (≤400 KB). Look once.
7. Deliver `city.rbxmx` + the JPG: Roblox Studio → drag the file in, or Model → Insert from File.

## Render options (`view.html` query)
`w h` size · `fov` lens (22) · `az el` camera angle (225, 35) · `ty` target height (17) · `dist` camera distance (auto: whole build in frame) · `sunaz sunel` sun angle (150, 52) · `exp` exposure (1.05) · `file` rbxmx to load.

## Files
| File | Does |
|---|---|
| `city.py` | layout, greedy merge, `.rbxmx`, studio stages |
| `stamp.py` | stage → live project + tab docs |
| `view.html` + `render.js` | loads the `.rbxmx` itself (open check) and renders it: sun shadows, ambient occlusion, glass, neon |

## Known issues
- `three` must be at `$NODE_MODULES/three` (or `node_modules/` here, gitignored); never commit it.
- `render.js` uses Mesa llvmpipe when present (several times faster than SwiftShader); `GL=swiftshader` forces the old one.
- three 0.186 has no `PCFSoftShadowMap`: use `PCFShadowMap`.

## Small voxel props
`python3 guns.py OUT` (template for hand-held voxel items): 3 guns at 0.2 stud/voxel, one Model each, gate = one connected body per item.
