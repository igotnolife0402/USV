---
summary: Every voxel model template in tools/3d in one file: what, run command, functions and constants with line numbers. Generated; do not edit.
updated: 2026-11-24
status: current
---
# voxel models (6)
Read this file instead of opening templates. Then read only the line range you copy. Regenerate: `node tools/3d/styles/build.mjs`.

## Black Dragon | rigged block dragon, ~165-stud wingspan, flight loop and fire breath
- file: `tools/3d/beast/dragon.py` (173 lines)
- run: `python3 dragon.py <outdir>`
- api:
  - L29 def shape(g, stud)
- constants:
  - `L12 PAL = [None, ('Scale', '#0d0b12', 's'), ('Scale', '#16131e', 's'), ('Scale', '#211c2b', 's'), ('`
  - `L18 SEG = [('Torso', None, (0, 0, 0)), ('Neck1', 'Torso', (0, 1.8, 5.0)), ('Neck2', 'Neck1', (0, 3.3`
  - `L22 TAILN = 8`
  - `L27 PIV = {n: p for n, _, p in SEG}`
  - `L154 ANIM = {'len': 6.0, 'periods': {'F': 1.5, 'T': 3.0},`
  - `L168 CAMS = [{'ang': 125, 'dist': 200, 'y': 12, 'look': [0, 2, -8], 'studio_pos': [105, 44, 105], 'stu`

## Orc | rigged block orc brute with club, ~20 studs tall, roar and slam VFX
- file: `tools/3d/beast/orc.py` (250 lines)
- run: `python3 orc.py <outdir> --sheets <dir holding earth/, sand/, wind/ sheets>`
- api:
  - L32 def shape(g, stud)
  - L213 def sheet(id, layout, mode, life, light, orient, fps=None, frames=16)
- constants:
  - `L14 PAL = [None, ('Skin', '#4d6e2f', 's'), ('Skin', '#5b7f37', 's'), ('Skin', '#3f5c26', 's'), ('Ski`
  - `L20 SEG = [('Hips', None, (0, 9.6, 0)), ('Chest', 'Hips', (0, 11.2, 0.2)), ('Head', 'Chest', (0, 16.`
  - `L25 PIV = {n: p for n, _, p in SEG}`
  - `L28 CLUB_TIP = tuple(H + D * 10.0)`
  - `L216 IMPACT = sheet('earth/40-big-impact', 'Grid4x4', 'OneShot', 1.1, 0.0, 'FacingCamera')`
  - `L217 SPIKES = sheet('earth/16-spikes-heavy', 'Grid4x4', 'OneShot', 1.0, 0.0, 'FacingCamera')`
  - `L218 CRACKS = sheet('earth/11-ground-decal', 'Grid4x4', 'OneShot', 1.5, 0.0, 'VelocityPerpendicular')`
  - `L219 DUST = sheet('sand/17-cloud-puff-heavy', 'Grid4x4', 'OneShot', 1.2, 0.0, 'FacingCamera')`
  - `L220 ROAR = sheet('wind/04-shockwave', 'Grid8x8', 'OneShot', 0.6, 0.8, 'FacingCamera', frames=64)`
  - `L221 AURA = sheet('earth/09-aura', 'Grid4x4', 'Loop', 1.0, 0.0, 'FacingCamera', fps=16.0)`
  - `L223 ANIM = {'len': 6.0, 'periods': {'B': 3.0, 'L': 6.0},`
  - `L243 CAMS = [{'ang': 155, 'dist': 62, 'y': 15, 'look': [0, 10, -2], 'studio_pos': [26, 16, 42], 'studi`

## Shadow Monster | rigged smooth-meshed block shadow monster, ~23 studs tall
- file: `tools/3d/beast/shadow.py` (230 lines)
- run: `python3 shadow.py <outdir>`
- api:
  - L36 def zface(x, y)
  - L39 def zhead(x, y)
  - L44 def tendril(g, pts, r0, seg, rng, jit=0.25, col=SM, tip=SM2)
  - L49 def vein(g, a, b, r_axis, seg, rng, side, n=9, w=0.17, col=VEIN)
  - L59 def shape(g, stud)
- constants:
  - `L16 PAL = [None, ('Shadow', '#221934', 's'), ('Shadow', '#3a2b56', 's'), ('Shadow', '#150f21', 's'),`
  - `L22 SEG = [('Hips', None, (0, 10.6, 0)), ('Chest', 'Hips', (0, 12.2, 0.4)), ('Head', 'Chest', (0, 17`
  - `L27 PIV = {n: p for n, _, p in SEG}`
  - `L206 ANIM = {'len': 6.0, 'periods': {'B': 3.0, 'L': 6.0, 'W': 1.5},`
  - `L224 CAMS = [{'ang': 155, 'dist': 60, 'y': 15, 'look': [0, 11, -1], 'studio_pos': [24, 16, 40], 'studi`

## plasma-pistol, assault-rifle, sniper-rifle | Three original voxel-style guns, chunky chamfered blocks
- file: `tools/3d/models/guns.py` (317 lines)
- run: `python3 guns.py OUT --check`
- api:
  - L40 def pair(x0, x1, y0, y1, zin, zout, r=0.02)
  - L45 def poly(pts, w, ch=0.035)
  - L54 def side(pts, z, th=0.06)
  - L60 def tube(x0, x1, yc, prof, seg=16, zc=0.0)
  - L67 def screws(points, z, r=0.045)
  - L76 def row(fn, xs)
  - L80 def tex(pat, cols, sc)
  - L91 def glow(pid, mesh, color)
  - L99 def pistol(rng)
  - L138 def rifle(rng)
  - L184 def sniper(rng)
  - L237 def combine(out)
  - L258 def attach(name, tol=0.05, step=0.1)
  - L295 def main(argv=None)
- constants:
  - `L25 NAMES = ["plasma-pistol", "assault-rifle", "sniper-rifle"]`
  - `L26 TITLES = {"plasma-pistol": "Plasma Pistol", "assault-rifle": "Assault Rifle", "sniper-rifle": "Snip`
  - `L27 STACK = 3.4  # studs between guns in the shared tab`

## tactical-shotgun | Voxel-look pump shotgun, textured studio meshes
- file: `tools/3d/models/shotgun.py` (101 lines)
- run: `python3 shotgun.py OUT --check`
- api:
  - L30 def shotgun(rng)
  - L69 def live(out)
  - L81 def main(argv=None)

## voxel city | 50x50-stud voxel city with roads, parks, trees, 1 voxel = 1 stud
- file: `tools/3d/voxel/city.py` (435 lines)
- run: `python3 city.py city.rbxmx [stage_dir]`
- api:
  - L20 def pal(kind, **cols)
  - L46 def group(name)
  - L50 def box(x0, x1, y0, y1, z0, z1, c)
  - L56 def put(x, y, z, c)
  - L57 def pick(names, p=None)
  - L58 def dist(x, z, cx, cz)
  - L60 def disk(cx, cz, r, y0, y1, c, r_in=-1.0)
  - L65 def blob(cx, cy, cz, rx, ry, rz, names, p=None)
  - L74 def tree(x, z, r=2.2, h=3, y=B, names=LEAF)
  - L78 def pine(x, z, y=B)
  - L149 def facade(x0, x1, z0, z1)
  - L154 def building(x0, x1, z0, z1, h, wall, style, glass, trim, base=B, shop='', awn=None, parapet=True, lobby=False)
  - L188 def stairs(x, z, y, wall)
  - L231 def house(x0, x1, z0, z1, wall, rf, rf2, door_x)
  - L284 def lamp(x, z, dx, dz)
  - L301 def car(x, z, d, body, taxi=False, L=5, bus=False)
  - L329 def greedy(K, order)
  - L351 def merged()
  - L361 def rbxmx(boxes, path)
  - L395 def studio(outdir, name='Voxel City')
- constants:
  - `L88 ROAD = lambda x, z: 18 <= x < 23 or 18 <= z < 23`
  - `L89 WALK = lambda x, z: (16 <= x < 25 or 16 <= z < 25) and not ROAD(x, z)`
  - `L114 PATCH = rng.random((W // 3 + 1, D // 3 + 1))`
  - `L359 KIND = {'s': (272, 0, 0), 'n': (288, 0, 0), 'g': (1568, .25, .2), 'w': (272, .3, .25)}   # Materi`
  - `L389 STAGES = [('Ground and roads', ['Ground', 'Roads', 'Sidewalks', 'Lots']), ('Park', ['Park']),`
  - `L393 MAT = {'n': 'Neon', 'g': 'Glass'}`
