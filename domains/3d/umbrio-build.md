---
summary: One-read recipe for any Umbrio model build: template, units, textures, z-fight-safe layout, gates, write format
updated: 2026-11-22
status: current
---
# Umbrio build in one read (realistic models: house, furniture, props)

Why this note: the 2026-11-22 house run spent ~9 min reading 8 files (playbook, studio.md, for-ais.md, zfight README + source, texture.js, props.py, guns.py) to collect the facts below. Read only this, then write code.

## Template
- Building / big prop: copy `tools/3d/props/house.py` (realistic furnished 2-storey house, 110 parts: shell + `interior()` + crew furniture files house_a/b/c.py, each `build(H)` returning parts). Long patches: Write a scratchpad .py and run it; bash heredocs break on nested quotes (L-106). Hand-held: `tools/3d/props/shotgun.py`.
- Helpers already there: `box()` plain 6-quad box, `fuv()` per-face metre UVs (use it, never `P.box_uv`: that picks the axis from vertex position, wrong on long parts), `wall()` panels split around openings, `bars()` frame + muntins without overlaps, `window()`, `cyl(p0, p1, r)`, `slope_pt()`/`roof_side()` stepped shingle courses, `live()` stage files.
- From props.py: `P.prism(convex (z,y) poly, hw, ch)` extrudes along X (convex only; orient CCW by area sign), `P.lathe(profile, seg, False)` around +Y, `P.cbox(size, r)` chamfered box, `P.xf(m, t, r, s)` (negative scale flips faces), `P.merge`, `P.part(id, mesh, color, smooth=False, transparency=..)`. From guns.py: `G.tube(x0, x1, yc, prof)` along +X, `G.poly(pts (x,y), width)`, `G.attach(name)`.

## Crew speed
- /crew model builds: the first message spawns the 3 workers with a 3-line prep (read house.py helpers lines 1-200, wait for spec); specs follow by SendMessage. Designing all specs before spawning cost 155 s on 2026-11-22.

## Units and gates
- 1 unit = 1 m (zfight bands are metres: level < 1.5 cm, layered < 12 cm, fail at 0.5 m2; `--prop` only for hand-held).
- `python tools/3d/props/<gen>.py .worktrees/<build> --check` = mesh check (no total tri cap since 2026-11-23: `fit_parts` splits any mesh over 19k tris or the doc cap into -1/-2 parts, no triangle lost) + `detail.py --class prop` (>= 15 parts, textured >= 60 %, >= 4 colours, >= 3k tris) + attach + zfight on `OUT/live/p<last>.json`. house.py check takes ~5 s (attach dedupes samples per cell).
- Same-facing faces that overlap in projection within 12 cm fail, even hidden ones. Layout that passes first time: walls as panels around openings; frames, sashes, glass, sills, lintels INSIDE the opening (no ears past it); no shutters, corner boards, kick plates or trim laid on a face; stacked layers end where the next begins (plinth top → wall bottom). Nested parts (frame in reveal, sash in frame) still fail: the generator runs `zfight.py fix` (~2 s; since 2026-11-22 it also cuts textured faces, uvs kept) and copies `OUT/fix/geo` over `OUT/geo`, as house.py does. Glass `transparency >= 0.5` is ignored. Round tubes: 8/12-sided so no face is parallel to a wall.

## Furniture layout (owner 2026-11-22: overlaps + blocked windows)
- `tools/3d/props/clear.py` runs in house.py --check: no two furniture items overlap > 1 cm; nothing taller than sill + 5 cm within 25 cm of a window. Back wall is rotated 180: world x = -u in the window tables. Counter-height windows: sill >= counter top.
- Upload in 3 batches (shell+roof+openings, interior+ground furniture, upper furniture), not 6: each <= 50 writes.

## Textures (studio procedural, `scale` = metres per tile, `aspect` stretches v)
Patterns: bricks, planks, noise, clouds, checker, studs, grid, tiles, marble, gradient, stripes, camo, rock, woodgrain, brushed, fabric, asphalt, road, grass, sand, water, grip, carbon.
Real-scale picks: brick `bricks` count 2 scale 0.43 aspect 1.65 (215 x 65 mm); lap siding `planks` count 4 scale 0.8 (200 mm boards, horizontal on fuv uvs); shingles `bricks` dark, count 2 scale 0.66; stone `rock` 1.5; painted trim `woodgrain` light 1.2; oak `woodgrain` 0.9; metal `brushed` 1.0.

## Umbrio write (hub https://claude.ai/artifact/Bz8SnAVkhjyXgk79t8eadF)
- Fresh tab = new project id. Docs: `projects/<id>` (scene = `OUT/live/p<i>.json`), `meta/<id>` (`OUT/live/m<i>.json`, `building: true` until the last stage), geo `projects/<id>/geo/<gid>` (= `OUT/geo/<gid>.json`).
- One ArtifactData batch per stage: that stage's geo docs + project + meta (<= 50 writes, <= 1 MiB). Relative `file_path` under `.worktrees/` (scratchpad paths prompt the owner every write).
- Multi-piece models (crew): copy `tools/3d/props/setup/setup.py`: one `setup_<piece>.py` per worker exporting `parts() -> (parts, textures)`, one live stage per piece, gates in one run (2026-11-22: 28 parts, all gates first run after one texture round).
- Spec gate before sending: grid extents fit their opening (rows x pitch <= opening) and every part except glass has a texture key (detail needs >= 60 % textured).
- Quality target: [ref-quality.md](ref-quality.md) (owner reference photos, 8 rules). - Polish floor (owner 2026-11-22 "gaps, unpolished"): touching parts embed 2-5 mm, solid body under any key/button grid, `P.rbox`/`P.slab` rounded edges on visible slabs, displays get a lit `gradient` texture; zoom the `--preview` PNG (PIL crop x2) before upload and fix any gap seen.
- Mesh limits: `P.slab` rad >= 0.012 and bevel >= 0.004 with nb=2 (smaller exports degenerate faces); `P.rbox` seg=2 everywhere visible (owner 2026-11-23: max detail first; only hidden faces get cut at the end).
- Visual check: the built-in browser pane is signed out of claude.ai (sign-in wall), so the look is a queued PC step for the owner; never claim it.
- Read back with `out_dir` `.worktrees/hub` (never the scratchpad), count objects, run zfight on the read-back.
- Dark metal reads black in the Studio render (2026-11-23 blind test: every realistic iron helmet scored 3-5/10 on readability): iron/steel base colour >= #5a5a5a, metalness <= 0.7, give the darkest metal a lighter `brushed` highlight colour; check with the real render, `VIEWS_TAB=... node test/run.mjs views` (studio.md).
