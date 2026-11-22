---
summary: One-read recipe for any Umbrio model build: template, units, textures, z-fight-safe layout, gates, write format
updated: 2026-11-22
status: current
---
# Umbrio build in one read (realistic models: house, furniture, props)

Why this note: the 2026-11-22 house run spent ~9 min reading 8 files (playbook, studio.md, for-ais.md, zfight README + source, texture.js, props.py, guns.py) to collect the facts below. Read only this, then write code.

## Template
- Building / big prop: copy `tools/3d/props/house.py` (realistic 2-storey house, 39 parts). Hand-held: `tools/3d/props/shotgun.py`.
- Helpers already there: `box()` plain 6-quad box, `fuv()` per-face metre UVs (use it, never `P.box_uv`: that picks the axis from vertex position, wrong on long parts), `wall()` panels split around openings, `bars()` frame + muntins without overlaps, `window()`, `cyl(p0, p1, r)`, `slope_pt()`/`roof_side()` stepped shingle courses, `live()` stage files.
- From props.py: `P.prism(convex (z,y) poly, hw, ch)` extrudes along X (convex only; orient CCW by area sign), `P.lathe(profile, seg, False)` around +Y, `P.cbox(size, r)` chamfered box, `P.xf(m, t, r, s)` (negative scale flips faces), `P.merge`, `P.part(id, mesh, color, smooth=False, transparency=..)`. From guns.py: `G.tube(x0, x1, yc, prof)` along +X, `G.poly(pts (x,y), width)`, `G.attach(name)`.

## Units and gates
- 1 unit = 1 m (zfight bands are metres: level < 1.5 cm, layered < 12 cm, fail at 0.5 m2; `--prop` only for hand-held).
- `python tools/3d/props/<gen>.py .worktrees/<build> --check` = mesh check (TRI_CAP 12k per prop) + `detail.py --class prop` (>= 15 parts, textured >= 60 %, >= 4 colours, >= 3k tris) + attach + zfight on `OUT/live/p<last>.json`. house.py check takes ~5 s (attach dedupes samples per cell).
- Same-facing faces that overlap in projection within 12 cm fail, even hidden ones. Layout that passes first time: walls as panels around openings; frames, sashes, glass, sills, lintels INSIDE the opening (no ears past it); no shutters, corner boards, kick plates or trim laid on a face; stacked layers end where the next begins (plinth top → wall bottom). Nested parts (frame in reveal, sash in frame) still fail: the generator runs `zfight.py fix` (~2 s; since 2026-11-22 it also cuts textured faces, uvs kept) and copies `OUT/fix/geo` over `OUT/geo`, as house.py does. Glass `transparency >= 0.5` is ignored. Round tubes: 8/12-sided so no face is parallel to a wall.

## Textures (studio procedural, `scale` = metres per tile, `aspect` stretches v)
Patterns: bricks, planks, noise, clouds, checker, studs, grid, tiles, marble, gradient, stripes, camo, rock, woodgrain, brushed, fabric, asphalt, road, grass, sand, water, grip, carbon.
Real-scale picks: brick `bricks` count 2 scale 0.43 aspect 1.65 (215 x 65 mm); lap siding `planks` count 4 scale 0.8 (200 mm boards, horizontal on fuv uvs); shingles `bricks` dark, count 2 scale 0.66; stone `rock` 1.5; painted trim `woodgrain` light 1.2; oak `woodgrain` 0.9; metal `brushed` 1.0.

## Umbrio write (hub https://claude.ai/artifact/Bz8SnAVkhjyXgk79t8eadF)
- Fresh tab = new project id. Docs: `projects/<id>` (scene = `OUT/live/p<i>.json`), `meta/<id>` (`OUT/live/m<i>.json`, `building: true` until the last stage), geo `projects/<id>/geo/<gid>` (= `OUT/geo/<gid>.json`).
- One ArtifactData batch per stage: that stage's geo docs + project + meta (<= 50 writes, <= 1 MiB). Relative `file_path` under `.worktrees/` (scratchpad paths prompt the owner every write).
- Read back with `out_dir` `.worktrees/hub` (never the scratchpad), count objects, run zfight on the read-back.
