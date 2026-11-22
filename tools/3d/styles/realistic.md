---
summary: Every realistic model template in tools/3d in one file: what, run command, functions and constants with line numbers. Generated; do not edit.
updated: 2026-11-22
status: current
---
# realistic models (7)
Read this file instead of opening templates. Then read only the line range you copy. Regenerate: `node tools/3d/styles/build.mjs`.

## tiger | Realistic SDF-anatomy tiger with painted stripes and fur, ~3.57 studs per metre
- file: `tools/3d/creature/geo.py` (477 lines)
- run: `python3 geo.py out`
- api:
  - L53 def smin(a, b, k)
  - L60 def point_field(P)
  - L125 def front_leg(s, dxe, dxw, dxp)
  - L135 def hind_leg(s, dxk, dxh, dxp)
  - L160 def grid_field(h)
  - L175 def group_dists(P)
  - L183 def surface_nets(F, xs, ys, zs)
  - L223 def neighbors(Q, n)
  - L227 def taubin(Vt, E, it, lam=0.5, mu=-0.53)
  - L236 def project(Vt, it=2, eps=0.0015)
  - L243 def tris_of(Q, Vt)
  - L248 def vnormals(Vt, T)
  - L255 def build(h, smooth)
  - L265 def hash3(i, j, k)
  - L270 def vnoise(P, f, seed)
  - L280 def fbm(P, f, seed, o=3)
  - L284 def sstep(a, b, x)
  - L286 def band(ph, w, aa=0.045)
  - L289 def srgb(*c)
  - L295 def tail_param(P)
  - L306 def stripes_fn(ph, t, P, w0, seed)
  - L323 def paint(P, N)
  - L440 def to_gl(P)
  - L443 def eye_world()
- constants:
  - `L10 OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'`
  - `L57 OPS = []  # (op, prim, k, group)`
  - `L102 EYE_R = 0.019`
  - `L112 EYES = []`
  - `L151 TAIL = A([(-0.78, 0, 0.85, .07), (-0.94, 0, 0.79, .06), (-1.07, 0.01, 0.66, .053), (-1.15, 0.025,`
  - `L156 GROUPS = ['body', 'neck', 'head', 'ear', 'fleg', 'hleg', 'tail']`

## tiger-glb | Roblox-ready tiger GLB, <=20k tris, 1024 texture, 3.57 studs/m
- file: `tools/3d/creature/glb.py` (261 lines)
- run: `python3 glb.py final/tiger.glb`
- api:
  - L20 def qem(V, F, target)
  - L76 def eye_cap(c, d, rings=6, seg=16, tmax=78)
  - L118 def components(lab)
  - L153 def pack(s)
- constants:
  - `L9 OUTF = sys.argv[2] if len(sys.argv) > 2 else 'final/tiger.glb'`
  - `L93 EYEC = geo.eye_world()`
  - `L103 DIRS = np.array([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1.0]])`
  - `L113 EYE_LAB = 6`

## house | Realistic two-storey brick and siding house, 8 x 6 m footprint
- file: `tools/3d/props/house.py` (355 lines)
- run: `python3 house.py OUT --check`
- api:
  - L47 def box(x0, x1, y0, y1, z0, z1)
  - L53 def fuv(m)
  - L71 def wall(L, y0, y1, w0, w1, ops)
  - L87 def bars(x0, x1, y0, y1, w, z0, z1, hs=()
  - L104 def window(cu, w, ya, yb, wo, lintel)
  - L134 def deck_y(z)
  - L138 def slope_pt(s, o)
  - L143 def roof_side()
  - L163 def cyl(p0, p1, r, seg=8)
  - L181 def tex(pat, cols, sc, **kw)
  - L195 def house(rng)
  - L310 def live(out)
  - L329 def main(argv=None)
- constants:
  - `L37 STAGES = [  # Umbrio live build: part ids per stage`
  - `L125 SIDES = [("front", 0, HX - T, HZ), ("back", 180, HX - T, HZ), ("right", 90, HZ, HX), ("left", -90,`
  - `L126 GROUND = {"front": [(-2.5, 1.2, 1.15, 2.75), (2.5, 1.2, 1.15, 2.75)], "back": [(-2.2, 1.2, 1.15, 2.`
  - `L128 UPPER = {"front": [(-2.5, 1.1, 3.75, 5.15), (0.0, 1.1, 3.75, 5.15), (2.5, 1.1, 3.75, 5.15)],`
  - `L131 DOOR = (0.0, 1.0, Y_PL, 2.75)`

## computer-setup | desk + monitor + keyboard + mouse + PC tower, 1.40 x 0.70 m desk
- file: `tools/3d/props/setup.py` (89 lines)
- run: `python3 setup.py OUT --check`
- api:
  - L30 def setup(rng)
  - L45 def live(out)
  - L64 def main(argv=None)
- constants:
  - `L25 PIECES = [setup_desk, setup_tower, setup_screen]   # one Umbrio live stage per piece, in this order`
  - `L26 STAGES = []`

## desk | 1.40 x 0.70 m oak desk on black steel frame
- file: `tools/3d/props/setup_desk.py` (34 lines)
- run: `python3 setup.py OUT --check`
- api:
  - L15 def parts()

## monitor, keyboard, mouse | 27 in monitor on stand, TKL keyboard, mouse
- file: `tools/3d/props/setup_screen.py` (76 lines)
- run: `python3 setup.py OUT --check`
- api:
  - L19 def frame_xy(x0, x1, y0, y1, z0, z1, wl, wr, wt, wb)
  - L26 def frame_xz(x0, x1, y0, y1, z0, z1, w)
  - L32 def keys()
  - L47 def parts()

## pc-tower | mid tower, tempered glass side, 3 fans, GPU
- file: `tools/3d/props/setup_tower.py` (51 lines)
- run: `python3 setup.py OUT --check`
- api:
  - L13 def parts()
