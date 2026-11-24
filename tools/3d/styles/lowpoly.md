---
summary: Every lowpoly model template in tools/3d in one file: what, run command, functions and constants with line numbers. Generated; do not edit.
updated: 2026-11-24
status: current
---
# lowpoly models (1)
Read this file instead of opening templates. Then read only the line range you copy. Regenerate: `node tools/3d/styles/build.mjs`.

## Crystal (triangular pyramid), chrome ball, Voronoi shatter pieces | crystal shattered by a ball, live studio stages
- file: `tools/3d/shatter/shatter.py` (165 lines)
- run: `python3 shatter.py OUT [--pieces 100] [--seed 3] [--name Crystal]`
- api:
  - L29 def ring(y, r, rot=0.0)
  - L34 def orient(f)
  - L41 def clip(faces, n, d, eps=1e-7)
  - L63 def ray_in(o, d)
  - L83 def mesh(polys, origin)
  - L130 def scene(objects=None, anims=None)
  - L141 def put(name, data)
  - L142 def geo_w(g)
  - L143 def proj_w(op, f)
- constants:
  - `L21 OUT = a[0]`
  - `L31 BASE = ring(0.0, 3.6); T = np.array([0.0, 10.0, 0.0])`
  - `L32 FACES = [[BASE[0], BASE[1], BASE[2]]] + [[BASE[k], BASE[(k + 1) % 3], T] for k in range(3)]`
  - `L33 CEN = np.mean([p for f in FACES for p in f], axis=0)`
  - `L36 FACES = [orient(f) for f in FACES]`
  - `L37 PLANES = [(np.cross(f[1] - f[0], f[2] - f[0]) / np.linalg.norm(np.cross(f[1] - f[0], f[2] - f[0])),`
  - `L62 BALL_DIR = np.array([1.0, -0.03, 0.02]); BALL_DIR /= np.linalg.norm(BALL_DIR)`
  - `L69 IMPACT = ray_in(np.array([-20.0, 3.6, 0.3]), BALL_DIR)   # on the crystal's surface, where the ball`
  - `L97 BALL_R = 0.75`
  - `L98 BALL_HIT = IMPACT - BALL_DIR * BALL_R; BALL_START = BALL_HIT - BALL_DIR * 18.0`
  - `L99 BALL_V = 18.0 / (T_HIT - T_LAUNCH)`
