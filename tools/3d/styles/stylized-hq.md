---
summary: Every stylized-hq model template in tools/3d in one file: what, run command, functions and constants with line numbers. Generated; do not edit.
updated: 2026-11-24
status: current
---
# stylized-hq models (2)
Read this file instead of opening templates. Then read only the line range you copy. Regenerate: `node tools/3d/styles/build.mjs`.

## Shadow Monster HQ | shadow monster, custom swept-tube meshes with textures, ~23 studs tall
- file: `tools/3d/beast/shadow_mesh.py` (231 lines)
- run: `python3 shadow_mesh.py <outdir>`
- api:
  - L31 def emit(seg, V, F, UV, col, tr=0.0)
  - L35 def attach_check(tol=0.12, snap_size=0.45)
  - L68 def finalize(prefix='sx', max_tris=12000, max_verts=4200)
  - L91 def kit()
  - L97 def spline(pts, n)
  - L106 def frames(C)
  - L114 def tube(pts, rfun, sides=14, per=7, tip=False, flat=1.0, ridge=None, cap=True)
  - L137 def blob(c, r, R=None, amp=0.035, waves=6, lat=18, lon=28)
  - L155 def m_ell(seg, c, r, col, R=None, mat=None, tr=0.0)
  - L160 def sinew(a, t)
  - L161 def bulge(r0, r1)
  - L163 def m_cap(seg, a, b, r, col, mat=None, tr=0.0)
  - L169 def m_cyl(seg, a, b, r, col, mat=None, tr=0.0)
  - L173 def m_cone(seg, base, tip, r, col, mat=None, tr=0.0)
  - L181 def m_chain(seg, pts, r0, r1, col, tip=None, tipcol=None, mat=None, tr=0.0)
- constants:
  - `L20 TEX = {`
  - `L27 SURF = {SP.BODY: ('t-skin', 0.55), SP.BODY2: ('t-skin2', 0.5), SP.RIDGE: ('t-ridge', 0.45), SP.HO`
  - `L28 GLOW = {SP.EYE, SP.CORE, SP.VEIN, SP.MOUTH, SP.WISP}`
  - `L30 PEND = []`

## Shadow Monster parts | shadow monster from separate primitive Studio parts, ~23 studs tall
- file: `tools/3d/beast/shadow_parts.py` (241 lines)
- run: `python3 shadow_parts.py <outdir>`
- api:
  - L22 def euler(R)
  - L29 def align(d, roll=0.0)
  - L41 def rotz(deg)
  - L43 def part(seg, shape, c, size, col, R=None, mat='SmoothPlastic', tr=0.0)
  - L52 def ell(seg, c, r, col, R=None, **k)
  - L53 def cap(seg, a, b, r, col, **k)
  - L56 def cyl(seg, a, b, r, col, **k)
  - L59 def cone(seg, base, tip, r, col, **k)
  - L62 def chain(seg, pts, r0, r1, col, tip=None, tipcol=None, **k)
  - L70 def on_limb(a, b, f, r, side)
  - L75 def vein(seg, a, b, r0, r1, side, n=6)
  - L81 def wisp(seg, base, d, L, r, tipglow)
  - L86 def back_z(x, y)
  - L94 def build()
- constants:
  - `L14 PIV = {n: np.array(p, float) for n, _, p in SEG}`
  - `L15 SID = {n: f'S{i}' for i, (n, _, _) in enumerate(SEG)}`
