---
summary: Every helper model template in tools/3d in one file: what, run command, functions and constants with line numbers. Generated; do not edit.
updated: 2026-11-24
status: current
---
# helper models (19)
Read this file instead of opening templates. Then read only the line range you copy. Regenerate: `node tools/3d/styles/build.mjs`.

## hq.py
- file: `tools/3d/armor/hq.py` (378 lines)
- api:
  - L22 def rot(rx=0, ry=0, rz=0)
  - L30 def perp(d, up=None)
  - L36 def bez(p0, p1, p2, p3, n)
  - L290 def audit(out)
  - L360 def overlaps(out, depth=0.02, limit=40, groups=None)
- constants:
  - `L14 SMOOTH = 40                                         # degrees: faces closer than this shade smooth`
  - `L304 GROUPS = {'CP': (0, 3, 0), 'HM': (0, 4.62, 0), 'LS': (1.62, 3.92, 0), 'LV': (1.5, 2.5, 0), 'LG': (0`

## preview.py
- file: `tools/3d/armor/preview.py` (73 lines)
- api:
  - L19 def add(V, F, col, em)
  - L46 def render(yaw, pitch=-12)
  - L68 def nz3(v)
- constants:
  - `L12 SIZE = int(opt.get('size', 520)); FOCUS = opt.get('focus'); VIEWS = opt.get('views', 'front,q34,s`
  - `L13 GROUPS = {'CP': (0, 3, 0), 'HM': (0, 4.62, 0), 'LS': (1.62, 3.92, 0), 'LV': (1.5, 2.5, 0), 'LG': (0`
  - `L16 BODY = [((0, 3, 0), (2, 2, 1)), ((0, 4.6, 0), (1.2, 1.2, 1.2)), ((1.5, 3, 0), (1, 2, 1)), ((-1.5,`
  - `L69 YAW = {'front': 0, 'q34': -35, 'side': -90, 'back': 180, 'q34b': 145}`

## solids.py
- file: `tools/3d/armor/solids.py` (94 lines)
- api:
  - L10 def rot(rx=0, ry=0, rz=0)
  - L70 def bez(p0, p1, p2, p3, n)

## vhq_helm.py
- file: `tools/3d/armor/vhq_helm.py` (156 lines)
- api:
  - L21 def sup(y, th, off=0.0)
  - L32 def top_y(z)
  - L39 def build(stage, K)
- constants:
  - `L36 CAN_OFF = 0.0; MASK_PUSH = 0.08; GX = 0.36; GY = 0.18`

## vhq_limbs.py
- file: `tools/3d/armor/vhq_limbs.py` (221 lines)
- api:
  - L13 def ring(b, mat, y, h, hx=0.5, hz=0.5, cz=0.0, g=0.03, t=0.05, bl=0.05, sides='fbos', flare=0.0, rim=None, ridge=0.0,
  - L27 def trim(b, pl, pts, r=0.011, off=None, mat='bronze')
  - L35 def studs(b, pl, pts, r=0.03, mat='bronze')
  - L40 def vial(b, c, d, h, r, n=18)
  - L49 def fan(b, pivot, ang, length, mats, xoff, hw=0.045, front=True)
  - L60 def boss(b, p, n, R)
  - L77 def arms()
  - L139 def legs()
  - L181 def sabaton()
  - L215 def build(stage, K)

## vhq_torso.py
- file: `tools/3d/armor/vhq_torso.py` (186 lines)
- api:
  - L11 def plate(b, *a, **k)
  - L15 def frame(N)
  - L19 def vial(b, c, d, h, r, n=28)
  - L27 def loop_pts(pl, k=0.9, n=9, m=9)
  - L33 def trim(b, pl, k=0.93, r=0.013, mat='bronze')
  - L37 def edge(b, pl, r=0.011)
  - L41 def rvt(b, c, N, r=0.028, mat='bronze')
  - L45 def rivets(b, pl, pts, r=0.028, mat='bronze')
  - L50 def rrect(hx, hz, rad, y, n=5)
  - L58 def cuirass()
  - L143 def pauldron()
  - L182 def build(stage, K)
- constants:
  - `L8 TAU = 2 * math.pi`

## catalog.py
- file: `tools/3d/avatar/catalog.py` (133 lines)
- api:
  - L18 def get(url, tries=4)
  - L29 def asset(kit, aid, ext)
  - L35 def image(kit, aid)
  - L48 def mesh(kit, aid)
  - L57 def body(kit, aid, folder='R15ArtistIntent')
  - L70 def accessory(kit, aid)
  - L82 def post(url, obj)
  - L91 def user(kit, name)
  - L112 def refs(kit, ids)
- constants:
  - `L87 LAYERED = ('ShirtAccessory', 'PantsAccessory', 'JacketAccessory', 'SweaterAccessory', 'ShortsAccesso`

## faces.py
- file: `tools/3d/avatar/faces.py` (55 lines)
- api:
  - L14 def face(kind='shocked', skin='#f2f3f3', S=512)

## rbx.py
- file: `tools/3d/avatar/rbx.py` (176 lines)
- api:
  - L10 def lz4_block(src, size)
  - L42 def read_model(data)
  - L121 def asset_id(url)
  - L125 def read_mesh(data)

## vmath.py
- file: `tools/3d/avatar/vmath.py` (97 lines)
- api:
  - L9 class Vector(np.ndarray)

## detail_head.py
- file: `tools/3d/beast/detail_head.py` (140 lines)
- api:
  - L4 def build(K)

## detail_limbs.py
- file: `tools/3d/beast/detail_limbs.py` (143 lines)
- api:
  - L5 def build(K)

## detail_torso.py
- file: `tools/3d/beast/detail_torso.py` (155 lines)
- api:
  - L9 def build(K)

## hub_batches.py
- file: `tools/3d/beast/hub_batches.py` (21 lines)

## rig.py
- file: `tools/3d/beast/rig.py` (779 lines)
- api:
  - L127 def greedy(K, order=(2, 0, 1)
  - L144 def smooth_quads(C, S, segs, bounds, V, NEON, step=1, sigma=0.8, level=0.42, glow_level=0.22, sleeve=2, reach=1.1)
  - L190 def faces(K, SEGK)
  - L221 def window(b, a, e, rin, rout)
  - L227 def evalpose(anim, t, b)
  - L241 def ease(u)
  - L243 def key_poses(anim, tol_rot=1.5, tol_pos=0.05, dt=1 / 240)
  - L288 def lua_val(v)
  - L296 def esc(s)
  - L306 def rbx_doc(*items)
  - L317 def CSEQ(k, keys)
  - L318 def NSEQ(k, keys)
  - L321 def TEX(k, u)
  - L352 def flipbook(p)
  - L364 def make(name, segs, pal, bounds, sc, shape, anim, fx, out, cams, glow=('Glow', 'GlowCore')
  - L499 def studio_mesh(name, segs, pal, sc, bounds, V, quads, GL, anim, fx, cam, partdoc, PNG, out, limit=430_000, sheets_dir=None, proxy=None, smooth=False)
  - L594 def b36(i)
  - L600 def studio_doc(name, segs, pal, sc, bounds, V, boxes, anim, fx, cam, fxcols=None)
- constants:
  - `L332 PACK = {`
  - `L350 GRID = {'Grid2x2': (1, 2), 'Grid4x4': (2, 4), 'Grid8x8': (3, 8)}`
  - `L351 ORIENT = {'FacingCamera': 0, 'FacingCameraWorldUp': 1, 'VelocityParallel': 2, 'VelocityPerpendicula`
  - `L648 RIG_LUA = '''-- %(name)s rig: turns the imported meshes into one animated assembly (runs once on the`
  - `L716 ANIM_LUA = '''-- __NAME__ animation: idle loop + an action every few seconds, with its VFX. Runs on e`

## stamp.py
- file: `tools/3d/beast/stamp.py` (24 lines)

## post.py
- file: `tools/3d/creature/post.py` (55 lines)
- api:
  - L21 def disk(r)
  - L23 def conv(a, k)

## tex.py
- file: `tools/3d/creature/tex.py` (195 lines)
- api:
  - L8 def lat(n, N, seed, tile=False)
  - L17 def fbm(n0, N, seed, oct=5, tile=False)
  - L28 def srgb2lin(c)
  - L29 def lin2srgb(c)
  - L30 def save(a, name, q=92)
  - L40 def ground(N, half, seed, detail)
  - L155 def lat2(nx, ny, seed)
  - L160 def fb2(nx, ny, seed, o=5)
  - L164 def over(c, m)
  - L167 def trunks(n, wmin, wmax, c, top, seed)
- constants:
  - `L37 DIRT = srgb2lin([0.58, 0.47, 0.34]); DIRT2 = srgb2lin([0.47, 0.37, 0.26]); DUST = srgb2lin([0.68,`
  - `L38 SOIL = srgb2lin([0.30, 0.26, 0.17]); LITTER = srgb2lin([0.45, 0.36, 0.22]); MOSS = srgb2lin([0.26`

## detail.py
- file: `tools/3d/detail/detail.py` (101 lines)
- api:
  - L14 def bad(msg)
  - L18 def load_json(p)
  - L25 def measure(project, gdir, floor)
  - L70 def main()
- constants:
  - `L9 HERE = os.path.dirname(os.path.abspath(__file__))`
  - `L10 EST = {'box': 12, 'wedge': 8}          # other shapes (sphere/capsule/cylinder/cone/torus) = 200`
  - `L11 EST_DEFAULT = 200`
