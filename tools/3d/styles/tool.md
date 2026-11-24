---
summary: Every tool model template in tools/3d in one file: what, run command, functions and constants with line numbers. Generated; do not edit.
updated: 2026-11-24
status: current
---
# tool models (3)
Read this file instead of opening templates. Then read only the line range you copy. Regenerate: `node tools/3d/styles/build.mjs`.

## stamp.py
- file: `tools/3d/voxel/stamp.py` (14 lines)
- run: `python3 stamp.py <stage number> [thumb.jpg]`

## seethru.py
- file: `tools/3d/zfight/seethru.py` (120 lines)
- run: `python seethru.py check project.json geo/`
- api:
  - L17 def world_tris(docs, inst)
  - L33 def dirs()
  - L41 def view(A, B, C, D, res)
  - L87 def main(argv)

## zfight.py
- file: `tools/3d/zfight/zfight.py` (340 lines)
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
  - L113 def inset(p, d)
  - L138 def clip(subj, c)
  - L151 def diff(poly, c)
  - L168 def pairs(R, near)
  - L186 def check(docs, inst)
  - L199 def components(g)
  - L211 def fix(docs, inst)
- constants:
  - `L19 EXACT = ()   # geo id prefixes cut exactly (`--exact house-`): building shells whose wall layers a`
