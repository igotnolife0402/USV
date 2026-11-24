---
summary: Every helper model template in tools/3d in one file: what, run command, functions and constants with line numbers. Generated; do not edit.
updated: 2026-11-24
status: current
---
# helper models (16)
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

## shared mesh helpers (its own toon/lowpoly props are below the detail floor, 2026-11-24: barrel 0 textures; reference only) | traffic-cone, steering-wheel, dashboard, car-hood, road-sign, rock-1, rock-2, rock-3, cliff, tree, bush, cloud, palm-tree, crate, barrel | detailed Roblox-thumbnail props, 0.78 to 12 x 40 studs
- file: `tools/3d/models/props.py` (2018 lines)
- run: `python3 props.py OUT <name|all> [--seed N] [--style lowpoly|toon] --check`
- api:
  - L42 def unit(a)
  - L48 def rot(rx=0, ry=0, rz=0)
  - L72 def merge(*ms)
  - L83 def volume(m)
  - L92 def orient(m)
  - L99 def grid_mesh(P, wrap_rows=False, pole0=None, pole1=None)
  - L120 def dedupe(pts, closed=False, eps=2e-3)
  - L131 def fillet(pts, rad, n=4, closed=False)
  - L158 def lathe(profile, seg=32, closed=False, rmod=None)
  - L176 def frames(path, closed=False, ref=None)
  - L195 def sweep(path, rad, seg=16, closed=False, caps="round", ref=None,
  - L236 def rbox(size, r, seg=3, div=(1, 1, 1)
  - L271 def rrect(hw, hh, rad, n=6)
  - L281 def slab(hw, hh, depth, rad, bevel, nb=3, n=6)
  - L291 def outline3d(pts2, y=0.0)
  - L299 def icosphere(sub)
  - L359 def smoothstep(e0, e1, x)
  - L364 def facets(v, rng, k=7, depth=0.82, strength=0.85)
  - L381 def blob(rng, noise, center, radius, scale=(1, 1, 1)
  - L397 def box_uv(m, s=1.0)
  - L408 def part(pid, mesh, color, **kw)
  - L420 def prop(name, title)
  - L428 def cone_r(t)
  - L435 def band_profile(fn, t0, t1, proud=0.012, sink=0.01, n=5)
  - L450 def traffic_cone(rng)
  - L471 def torus_profile(R, r, n=16)
  - L476 def gauss_wrap(th, centers, w)
  - L485 def steering_wheel(rng)
  - L525 def dial(x, needle_deg)
  - L547 def vent()
  - L559 def dashboard(rng)
  - L623 def ground(parts, y=0.0)
  - L632 def car_hood(rng)
  - L672 def hex_bolt(r=0.05, h=0.04)
  - L682 def road_sign(rng)
  - L708 def rock_tex(key="rock", scale=3)
  - L712 def cubeish(n, p=0.55)
  - L717 def boulder(rng, noise, sub, scale, cube=0.0, rough=0.15, cuts=8, depth=0.8)
  - L729 def rock_prop(rng, scale, color)
  - L741 def rock1(rng)
  - L746 def rock2(rng)
  - L751 def rock3(rng)
  - L756 def cliff(rng)
  - L796 def blobs(rng, specs, sub=3, **kw)
  - L805 def flat_bottom(m, y, keep=0.2)
  - L811 def tree(rng)
  - L842 def bush(rng)
  - L852 def cloud(rng)
  - L865 def frond(base, az, L=3.2, W=0.42, rng=None)
  - L879 def palm_tree(rng)
  - L905 def wood_tex(scale=2)
  - L909 def nail(p, n)
  - L922 def crate(rng)
  - L966 def barrel(rng)
  - L1005 def low(name)
  - L1012 def face_normals(v, faces)
  - L1024 def flat(m, deg=9.9)
  - L1063 def face_uv(m, s=1.0)
  - L1088 def lptex(*keys)
  - L1093 def lpart(pid, mesh, color, tex=None, uv=1.0, **kw)
  - L1106 def ccw(idx, P, n)
  - L1115 def cbox(size, r=0.04)
  - L1148 def offset_poly(P, d)
  - L1158 def prism(poly, hw, ch=0.04)
  - L1170 def plane_cuts(v, rng, k, depth, snap=0.12)
  - L1187 def chunk(rng, sub, scale, jitter=0.15, cuts=4, cube=0.0, depth=0.8)
  - L1199 def ring_profile(r0, r1, y0, y1, out=0.012, sink=0.01, ch=0.006)
  - L1205 def box(size)
  - L1218 def ring_rect(r0, r1, y0, y1, ch=0.006)
  - L1223 def frame_ring(P2, outer, inner, z0, z1, ch=0.006)
  - L1230 def lp_nail(p, n, r=0.03)
  - L1240 def floor_cut(m, y)
  - L1247 def lp_cone(rng)
  - L1264 def lp_wheel(rng)
  - L1296 def lp_dial(deg)
  - L1310 def lp_vent()
  - L1320 def lp_dash(rng)
  - L1374 def lp_hood(rng)
  - L1412 def lp_sign(rng)
  - L1436 def lp_rock(rng, scale, color)
  - L1445 def lp_rock1(rng)
  - L1450 def lp_rock2(rng)
  - L1455 def lp_rock3(rng)
  - L1460 def lp_cliff(rng)
  - L1496 def clumps(rng, specs, jitter=0.1, cuts=2)
  - L1506 def lp_tree(rng)
  - L1526 def lp_bush(rng)
  - L1535 def lp_cloud(rng)
  - L1547 def lp_frond(base, az, L, W, rng)
  - L1558 def lp_palm(rng)
  - L1587 def lp_crate(rng)
  - L1625 def lp_barrel(rng)
  - L1650 def geo_doc(m)
  - L1659 def build(name, seed, style="lowpoly")
  - L1668 def split_mesh(m, max_tris=PART_TRIS, max_bytes=GEO_CAP - 8 * 1024)
  - L1690 def fit_parts(parts)
  - L1703 def write_prop(out, name, seed, style="lowpoly")
  - L1738 def check_mesh(gid, m, size)
  - L1765 def check_flat(gid, m)
  - L1780 def run(out, names, seed, check, preview, style="lowpoly", tri_cap=None)
  - L1833 def hexrgb(h)
  - L1837 def tris_of(m)
  - L1842 def shade_part(p, M)
  - L1868 def raster(V, C, ids, W, H)
  - L1920 def render(parts, W, H, az=32, el=20)
  - L1959 def label(img, text, x, y, s=3)
  - L1970 def write_png(path, img)
  - L1983 def contact_sheet(shots, path, tile=300, cols=5)
  - L1997 def main(argv=None)
- constants:
  - `L20 GEO_CAP = 225 * 1024  # studio doc limit (prompt cap 240 KB, guide 225 KB)`
  - `L21 TRI_CAP = None  # owner 2026-11-23: no detail limit on realistic builds; fit_parts splits what a doc`
  - `L22 PART_TRIS = 19000  # Roblox MeshPart cap: the real per-mesh limit, met by splitting, never by building`
  - `L23 LOW_TRI_CAP = 3000  # owner: low-poly props well under the toon ones`
  - `L24 FLAT_DEG = 20.0`
  - `L414 METAL = dict(color="#C9CED6", metalness=0.7, roughness=0.3)`
  - `L417 PROPS = {}`
  - `L481 FACE_Z = (90, 0, 0)  # lathe axis +Y -> +Z (front)`
  - `L705 ROCK = ("#D99A5E", "#C4854D")`
  - `L793 GREENS = ("#3FC24A", "#2FA83A")`
  - `L902 WOOD = ("#B9773E", "#A0632F")`
  - `L1002 LOW = {}`
  - ...5 more
