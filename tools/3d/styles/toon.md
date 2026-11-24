---
summary: Every toon model template in tools/3d in one file: what, run command, functions and constants with line numbers. Generated; do not edit.
updated: 2026-11-24
status: current
---
# toon models (5)
Read this file instead of opening templates. Then read only the line range you copy. Regenerate: `node tools/3d/styles/build.mjs`.

## Roblox avatar | posed animated avatar from real catalog items (R15 meshes)
- file: `tools/3d/avatar/avatar.py` (629 lines)
- run: `python3 avatar.py KIT OUT [--name Bacon] [--skin #F2F3F3] [--pose wave|stand|kamehameha|saber_guard] [--clip kamehameha|lightsaber]`
- api:
  - L94 def blend(A, B, s, shoulder=(-0.92, 0, 1.65)
  - L108 def arc_keys(path, n=5)
  - L134 def composite(layers, path, color, tshirt=None)
  - L161 def rects(group)
  - L173 def box_uv(p, n, lo, hi, plo, phi, sl, rc)
  - L203 def mesh_obj(name, P, F, uvs, tex, rough=0.5)
  - L207 def box(c, sz)
  - L220 def head_mesh(w, bev, sides=48, seg=8)
  - L275 def pivot(part)
  - L283 def attach(o, part)
  - L325 def frame(x, pole)
  - L328 def ik_arm(side, target, pole)
  - L344 def set_pose(P)
  - L365 def grip()
  - L375 def srot(e)
  - L381 def cam_view()
  - L390 def studio_rig(cards=()
  - L618 def hand_point(side)
  - L623 def hands_aim()
- constants:
  - `L26 POSES = {'wave': {'Root': (0, 0, 8), 'Waist': (0, 0, -3), 'Neck': (2, -6, -3),`
  - `L48 STANCE = {'RightHip': (14, 8, 0), 'RightKnee': (16, 0, 0), 'RightAnkle': (-6, 0, 0), 'LeftHip': (-1`
  - `L64 GS_LEGS = {'RightHip': (16, 10, 0), 'RightKnee': (22, 0, 0), 'RightAnkle': (-8, 0, 0), 'LeftHip': (-`
  - `L65 GS_LOW = dict(GS_LEGS, RightKnee=(44, 0, 0), LeftKnee=(56, 0, 0), RightHip=(26, 12, 0), LeftHip=(-3`
  - `L80 CLIPS = {'kamehameha': [(0, 'ready'), (0.8, 'charge'), (2.4, 'charge2'), (2.75, 'kamehameha'), (4.`
  - `L86 EASES = {'linear': lambda x: x, 'smooth': lambda x: (1 - math.cos(math.pi * x)) / 2, 'in': lambda `
  - `L121 CLIP = opt('--clip', '')`
  - `L122 POSE = POSES[opt('--pose', 'wave')]`
  - `L125 FXDIR = os.path.dirname(os.path.abspath(opt('--fx', '.')))`
  - `L130 RIG = kit.get('rig', 'R15')`
  - `L131 COL = {k[:-6]: '#' + v.lstrip('#') for k, v in (kit.get('colors') or {}).items()}      # headCol`
  - `L154 TORSO = {'F': (231, 74, 128, 128), 'B': (427, 74, 128, 128), 'R': (165, 74, 64, 128), 'L': (361, 7`
  - ...14 more

## pod-vape, box-mod | Toon vape props, original designs, no logos
- file: `tools/3d/models/vapes/vape_a.py` (165 lines)
- run: `python3 vapes.py OUT --check`
- api:
  - L9 def cyl(r, h, y0=0.0, f=0.012, seg=32, rmod=None, t=(0, 0, 0)
  - L26 def tex(pid, mesh, color, key, sc=1.0, **kw)
  - L35 def knurl(n, depth=0.012)
  - L40 def pod_vape(rng)
  - L96 def box_mod(rng)

## disposable-vape, vape-pen | Toon vape props (builders registered into props.PROPS)
- file: `tools/3d/models/vapes/vape_b.py` (150 lines)
- run: `python3 vapes.py OUT --check`
- api:
  - L12 def tex(pat, base, dark, light, scale=2)
  - L20 def disc(r, h, t, seg=16, bev=0.004, uv=None)
  - L27 def ring(r_in, r_out, h, y, seg=48, bev=0.008)
  - L32 def cyl(r, y0, y1, seg, bev, uv)
  - L39 def disposable(rng)
  - L89 def vape_pen(rng)

## mech-mod | Toon mech-mod tube vape with rebuildable dripping atomiser
- file: `tools/3d/models/vapes/vape_c.py` (112 lines)
- run: `python3 vapes.py OUT --check`
- api:
  - L18 def knurl(n, y0, y1, amp=0.011)
  - L22 def radial(m, a, r, y)
  - L28 def mech_mod(rng)

## pod-vape, box-mod, disposable-vape, vape-pen, mech-mod | Five toon vape props in a row, 1.6 studs apart
- file: `tools/3d/models/vapes/vapes.py` (68 lines)
- run: `python3 vapes.py OUT --check`
- api:
  - L25 def combine(out)
  - L47 def main(argv=None)
- constants:
  - `L21 NAMES = ["pod-vape", "box-mod", "disposable-vape", "vape-pen", "mech-mod"]`
  - `L22 GAP = 1.6  # studs between vape centres`
