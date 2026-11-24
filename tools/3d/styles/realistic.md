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
- file: `tools/3d/props/house.py` (453 lines)
- run: `python3 house.py OUT --check`
- api:
  - L47 def box(x0, x1, y0, y1, z0, z1)
  - L53 def fuv(m)
  - L71 def wall(L, y0, y1, w0, w1, ops)
  - L87 def bars(x0, x1, y0, y1, w, z0, z1, hs=()
  - L104 def window(cu, w, ya, yb, wo, lintel)
  - L138 def interior()
  - L205 def deck_y(z)
  - L209 def slope_pt(s, o)
  - L214 def roof_side()
  - L234 def cyl(p0, p1, r, seg=8)
  - L252 def tex(pat, cols, sc, **kw)
  - L266 def house(rng)
  - L395 def live(out)
  - L424 def main(argv=None)
- constants:
  - `L37 STAGES = [  # Umbrio live build: part ids per stage`
  - `L125 SIDES = [("front", 0, HX - T, HZ), ("back", 180, HX - T, HZ), ("right", 90, HZ, HX), ("left", -90,`
  - `L126 GROUND = {"front": [(-2.5, 1.2, 1.15, 2.75), (2.5, 1.2, 1.15, 2.75)], "back": [(-2.6, 1.2, 1.15, 2.`
  - `L128 UPPER = {"front": [(-2.5, 1.1, 3.75, 5.15), (0.0, 1.1, 3.75, 5.15), (2.5, 1.1, 3.75, 5.15)],`
  - `L131 DOOR = (0.0, 1.0, Y_PL, 2.75)`
  - `L135 RISE = (F1 - F0) / NR`

## computer-setup | desk + monitor + keyboard + mouse + PC tower, 1.40 x 0.70 m desk
- file: `tools/3d/props/setup/setup.py` (89 lines)
- run: `python3 setup.py OUT --check`
- api:
  - L30 def setup(rng)
  - L45 def live(out)
  - L64 def main(argv=None)
- constants:
  - `L25 PIECES = [setup_desk, setup_tower, setup_screen]   # one Umbrio live stage per piece, in this order`
  - `L26 STAGES = []`

## standing desk, riser, mat | 1.40 x 0.70 m butcher-block standing desk, walnut monitor riser, felt desk mat
- file: `tools/3d/props/setup/setup_desk.py` (40 lines)
- run: `python3 setup.py OUT --check`
- api:
  - L13 def parts()

## monitor, light bar, speakers, keyboard, wrist rest, mouse | 27 in thin-bezel monitor on riser, 75% two-tone keyboard
- file: `tools/3d/props/setup/setup_screen.py` (83 lines)
- run: `python3 setup.py OUT --check`
- api:
  - L19 def rbox(s, r, c)
  - L23 def keys()
  - L40 def parts()

## pc-tower, plant | glass-front RGB tower on the desk, potted plant
- file: `tools/3d/props/setup/setup_tower.py` (82 lines)
- run: `python3 setup.py OUT --check`
- api:
  - L13 def parts()
