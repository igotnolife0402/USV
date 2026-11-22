---
summary: Every tool model template in tools/3d in one file: what, run command, functions and constants with line numbers. Generated; do not edit.
updated: 2026-11-22
status: current
---
# tool models (2)
Read this file instead of opening templates. Then read only the line range you copy. Regenerate: `node tools/3d/styles/build.mjs`.

## stamp.py
- file: `tools/3d/voxel/stamp.py` (14 lines)
- run: `python3 stamp.py <stage number> [thumb.jpg]`

## zfight.py
- file: `tools/3d/zfight/zfight.py` (285 lines)
- run: `python3 zfight.py check project.json geo/`
- api:
  - L23 def load(project, gdir)
  - L45 def compact(g)
  - L60 def chunks(g, limit=200_000)
  - L74 def unshare(docs, inst, refs)
  - L87 def faces(docs, inst)
  - L106 def proj2(W, n)
  - L111 def area(p)
  - L112 def ccw(p)
  - L115 def clip(subj, c)
  - L128 def diff(poly, c)
  - L145 def pairs(R, near)
  - L163 def check(docs, inst)
  - L176 def components(g)
  - L188 def fix(docs, inst)
