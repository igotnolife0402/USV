# detail.py: detail-floor gate for Studio projects

Why: models must clear a measurable detail floor (custom meshes, textures, many parts), not a few plain primitives.
Thresholds and metric definitions live only in `floor.json` (read at runtime); this script never copies the numbers.

## Steps
1. Build the project (Studio project doc with `objects`, top level or under `scene`) and its `geo/` dir (`<geoId>.json`).
2. `python detail.py check <project.json> <geo_dir> [--class prop|hero|scene] [--json]` (default class hero).
3. Fix every FAIL line, re-run until `DETAIL PASS`. Exit 0 pass, 1 fail, 2 bad input.

Notes: parts = part|mesh objects (no lights/groups, transparency < 0.95, no temp/shadowOnly). Part-shape tris are
estimated (box 12, wedge 8, others 200) and flagged. Mesh size for `same_size_ratio` = geo bbox x scale.
Also checks each geo doc <= `max_tris_per_mesh` and that every geo doc exists.

## Example output
```
PASS parts 476 (need >= 40)
PASS mesh_ratio 1.0 (need >= 0.6)
FAIL textured_ratio 0.647 (need >= 0.7)
PASS colors 10 (need >= 6)
PASS surfaces 7 (need >= 3)
PASS tris 175912 (need >= 15000)
PASS same_size_ratio 0.05 (need <= 0.25)
PASS max_mesh_tris 1608 (need <= 19000)
PASS missing_geo 0 (need == 0)
DETAIL FAIL: textured_ratio
```
(Real run on tools/3d/beast/shadow_mesh.py output, 2026-11-22.)
