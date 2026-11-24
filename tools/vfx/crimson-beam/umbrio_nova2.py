"""Cyan Nova v2 (owner 6/10 on v1: "its a orb not crystal, looks 2d, rest underwhelming"):
hero 14 m crystal with cyan facet veins, 3D noise shells + arcs + orbit rings, thick helix-wrapped beams, spikes, big shocks.
v1 notes: Cyan Nova: Umbrio animation + VFX built on domains/vfx/anime-vfx-reference.md (owner 2026-11-24 "using what you learned").
Obsidian crystal charges a cyan sphere -> quiet dip -> 2-frame impact frame -> barrage of 7 plasma beams -> wide aftermath.
Rules used: desaturated base + one hue (cyan white core/body/deep edge), orange accent embers, tiny crystal vs huge sphere,
quiet->big->wide rhythm, one impact frame, effects light the ground, dark chip debris, shapes not showers, Dutch tilt.
Usage: python tools/vfx/crimson-beam/umbrio_nova.py OUT --charge-asset <id> --beam-asset <id> [--charge-sheet a.webp --beam-sheet b.webp]"""
import base64, datetime, json, math, os, random, sys

arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
OUT = sys.argv[1]
rng = random.Random(23)
T = dict(dip=2.5, hit=2.8, flash_end=2.87, collapse=5.5, gone=6.2, len=8.0)
C = dict(core='#e4fdfe', body='#73e0f1', edge='#2170c1', navy='#0c1a33', ember='#ffa040', black='#000000', ground='#1a1c22')
SPH = [0, 34, 0]
objs, tracks, geos = {}, {}, {}
r3 = lambda v: [round(x, 3) for x in v]
k = lambda t, v, e='linear': [round(t, 3), v, e]


def add(oid, o, **tr):
    o.setdefault('parent', 'world'); objs[oid] = o
    if tr: tracks[oid] = tr


def noise1(seed):
    g = random.Random(seed); ph = [g.random() * 6.283 for _ in range(4)]
    return lambda x: sum(math.sin(x * f + p) / f for f, p in zip((1, 2.3, 5.1, 9.7), ph)) / 1.7


def tube(path, radii, sides=8, cap=True):
    verts, uvs, faces, n = [], [], [], len(path)
    for i, p in enumerate(path):
        a, b = path[max(0, i - 1)], path[min(n - 1, i + 1)]
        t = [b[j] - a[j] for j in range(3)]; tl = math.sqrt(sum(x * x for x in t)) or 1; t = [x / tl for x in t]
        ref = [0, 1, 0] if abs(t[1]) < 0.9 else [1, 0, 0]
        u = [t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]]
        ul = math.sqrt(sum(x * x for x in u)) or 1; u = [x / ul for x in u]
        w = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]]
        r = radii[i] if isinstance(radii, list) else radii
        for s in range(sides):
            an = 2 * math.pi * s / sides
            verts += r3([p[j] + (u[j] * math.cos(an) + w[j] * math.sin(an)) * r for j in range(3)]); uvs += [round(s / sides, 3), round(i / (n - 1), 3)]
    for i in range(n - 1):
        for s in range(sides):
            a, b = i * sides + s, i * sides + (s + 1) % sides
            faces.append([a, b, b + sides, a + sides])
    if cap: faces += [list(range(sides))[::-1], [(n - 1) * sides + s for s in range(sides)]]
    return {'verts': verts, 'faces': faces, 'uvs': uvs}


def ring_geo(r_out, width, ripple, seg=96, rows=5, seed=1):
    nz = noise1(seed); verts, uvs, faces = [], [], []
    for i in range(rows + 1):
        f = i / rows; r = r_out - width * f
        for j in range(seg):
            a = 2 * math.pi * j / seg
            verts += r3([math.cos(a) * r, ripple * math.sin(math.pi * f) * (0.6 + 0.4 * nz(a * 6)), math.sin(a) * r]); uvs += [round(j / seg, 3), round(f, 3)]
    for i in range(rows):
        for j in range(seg):
            a, b = i * seg + j, i * seg + (j + 1) % seg
            faces.append([a, b, b + seg, a + seg])
    return {'verts': verts, 'faces': faces, 'uvs': uvs}


def merge(parts):
    out = {'verts': [], 'faces': [], 'uvs': []}
    for g in parts:
        o = len(out['verts']) // 3
        out['verts'] += g['verts']; out['uvs'] += g['uvs']; out['faces'] += [[i + o for i in f] for f in g['faces']]
    return out


def crystal_geo(seed, h_top, h_bot, r, sides=7):
    """Faceted bipyramid with a jittered waist and a second facet ring: an obsidian shard, not a primitive."""
    g = random.Random(seed); verts, faces = [], []
    rings = [(0.0, r), (h_top * 0.35, r * 0.82)]
    for y, rr in rings:
        for s in range(sides):
            a = 2 * math.pi * s / sides + g.uniform(-0.12, 0.12)
            q = rr * g.uniform(0.85, 1.12); verts += r3([math.cos(a) * q, y + g.uniform(-0.15, 0.15) * r, math.sin(a) * q])
    top = len(verts) // 3; verts += r3([g.uniform(-0.1, 0.1) * r, h_top, g.uniform(-0.1, 0.1) * r])
    bot = top + 1; verts += [0, -h_bot, 0]
    for s in range(sides):
        a, b = s, (s + 1) % sides
        faces.append([a, b, sides + b, sides + a]); faces.append([sides + a, sides + b, top]); faces.append([b, a, bot])
    uvs = []
    for i in range(len(verts) // 3): uvs += [round(verts[i * 3] * 0.3, 3), round(verts[i * 3 + 1] * 0.3, 3)]
    return {'verts': verts, 'faces': faces, 'uvs': uvs}


def ground_geo():
    radii = [0, 3, 6, 9, 12, 16, 20, 25, 30, 36, 43, 52, 64, 80, 100, 125, 160]; seg = 72; verts, uvs, faces = [], [], []
    for r in radii:
        for j in range(seg):
            a = 2 * math.pi * j / seg; x, z = math.cos(a) * r, math.sin(a) * r
            verts += r3([x, (rng.random() - 0.5) * 0.4 * min(1, r / 8), z]); uvs += [round(x / 6, 3), round(z / 6, 3)]
    for i in range(len(radii) - 1):
        for j in range(seg):
            a, b = i * seg + j, i * seg + (j + 1) % seg
            faces.append([a, (i + 1) * seg + j, (i + 1) * seg + (j + 1) % seg, b])
    return {'verts': verts, 'faces': faces, 'uvs': uvs}


geos['g-nv-ground'] = ground_geo()
geos['g-nv-crystal'] = crystal_geo(5, 8.5, 5.0, 2.8)
for s in range(3): geos[f'g-nv-shard{s}'] = crystal_geo(40 + s, 1.1, 0.7, 0.35, sides=5)
for s in range(3): geos[f'g-nv-chip{s}'] = crystal_geo(80 + s, 0.5, 0.45, 0.45, sides=5)
geos['g-nv-ring'] = ring_geo(10, 1.4, 0.7, seed=3)
geos['g-nv-rune'] = ring_geo(14, 0.5, 0.05, seed=7)
textures = {'t-nv-ground': {'kind': 'procedural', 'pattern': 'rock', 'colors': ['#121318', '#24262e'], 'scale': 3, 'seed': 5},
            't-nv-obsidian': {'kind': 'procedural', 'pattern': 'marble', 'colors': ['#0b0c10', '#2a3140'], 'scale': 1.5, 'seed': 2}}

# ---------- World: Dutch tilt, impact shake, dolly back in the aftermath (Umbrio has no camera track) ----------
pos, t = [], 0.0
while t <= T['len'] + 1e-6:
    A = 0.05 if t < T['hit'] else 1.4 * math.exp(-(t - T['hit']) * 2.2) + (0.4 if t < T['collapse'] else 0.03)
    dolly = 0 if t < T['gone'] else -26 * (0.5 - 0.5 * math.cos(math.pi * min(1, (t - T['gone']) / (T['len'] - T['gone']))))
    push = 6 * min(1, t / T['dip'])                                       # slow push-in during the charge
    pos.append(k(t, r3([A * (rng.random() * 2 - 1), A * (rng.random() * 2 - 1) * 0.7, push + dolly]), 'smooth')); t += 0.05
add('world', {'type': 'group', 'name': 'World', 'parent': None, 'pos': [0, 0, 0], 'rot': [0, 0, 8]}, pos=pos)

blink = lambda base: [k(0, base, 'step'), k(T['hit'], C['black'], 'step'), k(T['flash_end'], base, 'step')]   # impact frame: solids go black
add('ground', {'type': 'mesh', 'name': 'Dark plain', 'geo': 'g-nv-ground', 'material': 'Slate', 'color': '#6a6e7a', 'texture': 't-nv-ground', 'smooth': True, 'pos': [0, 0, 0]},
    color=blink('#6a6e7a'))
add('rune', {'type': 'mesh', 'name': 'Rune ring', 'geo': 'g-nv-rune', 'material': 'Neon', 'color': C['black'], 'smooth': True, 'pos': [0, 0.15, 0]},
    color=[k(0, C['black']), k(2.0, C['edge'], 'in'), k(T['dip'], C['body']), k(T['hit'], C['black'], 'step'), k(T['flash_end'], C['body'], 'step'), k(T['gone'], C['navy'], 'out')])

# ---------- HERO CRYSTAL (owner v1: "its a orb not crystal"): 14 m faceted obsidian, cyan veins on every facet edge ----------
CR = dict(top=9.0, bot=5.0, r=3.6, sides=7)
geos['g-nv-crystal'] = crystal_geo(5, CR['top'], CR['bot'], CR['r'], CR['sides'])
cv = geos['g-nv-crystal']['verts']; V = lambda i: cv[i * 3:i * 3 + 3]
n7 = CR['sides']; apex, foot = 2 * n7, 2 * n7 + 1
vein_paths = []
for sd in range(n7):
    vein_paths.append([V(foot), V(sd), V(n7 + sd), V(apex)])           # foot -> waist -> facet ring -> tip
    vein_paths.append([V(sd), V((sd + 1) % n7)])                         # waist ring
veins = []
for pth in vein_paths:
    pts = []
    for a, b in zip(pth, pth[1:]):
        for q in range(4): pts.append([a[j] + (b[j] - a[j]) * q / 4 for j in range(3)])
    pts.append(pth[-1])
    pts = [[x * 1.015 for x in pt] for pt in pts]                        # 1.5 % proud of the faces
    veins.append(tube(pts, 0.11, sides=5))
geos['g-nv-veins'] = merge(veins)
CRY_Y = 13.0                                                              # crystal centre; tip at y 22
add('crystal_g', {'type': 'group', 'name': 'Crystal', 'pos': [0, CRY_Y, 0]},
    pos=[k(0, [0, CRY_Y - 1, 0]), k(T['dip'], [0, CRY_Y + 1, 0], 'smooth'), k(T['gone'], [0, CRY_Y + 0.5, 0], 'smooth'), k(T['len'], [0, CRY_Y, 0], 'smooth')],
    rot=[k(0, [0, 0, 0]), k(T['len'], [0, 70, 0])])
add('crystal', {'type': 'mesh', 'name': 'Obsidian crystal', 'geo': 'g-nv-crystal', 'parent': 'crystal_g', 'material': 'Marble', 'color': '#5a6680', 'texture': 't-nv-obsidian', 'smooth': False, 'pos': [0, 0, 0]},
    color=blink('#5a6680'))
add('veins', {'type': 'mesh', 'name': 'Crystal veins', 'geo': 'g-nv-veins', 'parent': 'crystal_g', 'material': 'Neon', 'color': C['edge'], 'smooth': True, 'pos': [0, 0, 0]},
    color=[k(0, '#0a2040'), k(T['dip'], C['body'], 'in'), k(T['hit'], C['black'], 'step'), k(T['flash_end'], C['core'], 'step'), k(T['collapse'], C['body']),
           k(T['gone'], '#ffffff', 'out'), k(T['gone'] + 0.3, C['body']), k(T['len'], C['edge'], 'out')])
for i in range(12):
    a = 360 * i / 12; rr = 5.5 + (i % 3) * 1.2
    add(f'shard{i}', {'type': 'mesh', 'name': f'Orbit shard {i + 1}', 'geo': f'g-nv-shard{i % 3}', 'parent': 'crystal_g', 'material': 'Marble', 'color': '#6a7894', 'texture': 't-nv-obsidian', 'smooth': False,
                      'pos': r3([math.cos(math.radians(a)) * rr, (i % 4 - 1.5) * 2.2, math.sin(math.radians(a)) * rr]), 'rot': [rng.uniform(-30, 30), a, rng.uniform(-20, 20)]},
        color=blink('#6a7894'))
for i in range(12):                                                       # cyan glints on the shard edges
    a = 360 * i / 12; rr = 5.5 + (i % 3) * 1.2
    add(f'glint{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Shard glint {i + 1}', 'parent': 'crystal_g', 'size': [0.35, 0.35, 0.35], 'material': 'Neon', 'color': C['body'],
                      'pos': r3([math.cos(math.radians(a)) * rr, (i % 4 - 1.5) * 2.2 + 0.9, math.sin(math.radians(a)) * rr])})

# ---------- 3D ENERGY (owner v1: "it looks 2d"): noise-displaced shells + crawling arcs + tilted orbit rings, born at the crystal tip ----------
SPH[1] = CRY_Y + CR['top'] + 9.0                                         # centre 9 m above the tip: bottom shell touches it
def blob_geo(R, amp, seed, lat=16, lon=28):
    nzz = noise1(seed); verts, uvs, faces = [], [], []
    for i in range(lat + 1):
        th = math.pi * i / lat
        for j in range(lon):
            ph = 2 * math.pi * j / lon; rr = R * (1 + amp * nzz(th * 3 + ph * 2) * math.sin(th))
            verts += r3([math.sin(th) * math.cos(ph) * rr, math.cos(th) * rr, math.sin(th) * math.sin(ph) * rr]); uvs += [round(j / lon, 3), round(i / lat, 3)]
    for i in range(lat):
        for j in range(lon): faces.append([i * lon + j, (i + 1) * lon + j, (i + 1) * lon + (j + 1) % lon, i * lon + (j + 1) % lon])
    return {'verts': verts, 'faces': faces, 'uvs': uvs}
add('sphere_g', {'type': 'group', 'name': 'Nova energy', 'pos': SPH},
    scale=[k(0, [0.08, 0.08, 0.08]), k(T['dip'], [1, 1, 1], 'in'), k(2.6, [0.85, 0.85, 0.85], 'smooth'), k(2.7, [0.95, 0.95, 0.95], 'smooth'), k(T['hit'], [0.8, 0.8, 0.8], 'smooth'),
           k(3.0, [1.15, 1.15, 1.15], 'out'), k(T['collapse'], [1.05, 1.05, 1.05], 'smooth'), k(T['gone'], [0.02, 0.02, 0.02], 'in')])
for i, (R, tr, col, axis, spd) in enumerate([(6, 0.45, C['core'], 1, 200), (10, 0.72, C['body'], 0, -140), (14, 0.86, C['edge'], 2, 90)]):
    geos[f'g-nv-blob{i}'] = blob_geo(R, 0.12 + 0.05 * i, 30 + i)
    rot_end = [0, 0, 0]; rot_end[axis] = spd * T['gone']
    add(f'shell{i}', {'type': 'mesh', 'name': f'Energy shell {i + 1}', 'geo': f'g-nv-blob{i}', 'parent': 'sphere_g', 'material': 'ForceField', 'color': col, 'transparency': tr, 'smooth': True, 'pos': [0, 0, 0]},
        rot=[k(0, [0, 0, 0]), k(T['gone'], r3(rot_end))], visible=[k(0, True, 'step'), k(T['gone'], False, 'step')])
for i in range(8):                                                        # lightning crawling over the 10 m shell
    g = random.Random(60 + i); th0, ph0 = g.uniform(0.3, 2.8), g.uniform(0, 6.283); dth, dph = g.uniform(-1, 1), g.uniform(-1.4, 1.4); pts = []
    for q in range(10):
        f = q / 9; th, ph = th0 + dth * f, ph0 + dph * f; rr = 10.6 + g.uniform(-0.5, 0.9)
        pts.append([math.sin(th) * math.cos(ph) * rr, math.cos(th) * rr, math.sin(th) * math.sin(ph) * rr])
    geos[f'g-nv-arc{i}'] = tube(pts, [0.18 * (1 - 0.5 * q / 9) for q in range(10)], sides=4)
    vis = [k(0, False, 'step')]
    for _ in range(9):
        tf = round(0.6 + g.random() * (T['collapse'] - 0.6), 2)
        if not (T['dip'] <= tf <= T['flash_end']): vis += [k(tf, True, 'step'), k(tf + 0.08, False, 'step')]
    add(f'sarc{i}', {'type': 'mesh', 'name': f'Shell lightning {i + 1}', 'geo': f'g-nv-arc{i}', 'parent': 'sphere_g', 'material': 'Neon', 'color': '#d8fbff', 'smooth': False, 'pos': [0, 0, 0]},
        visible=[vis[0]] + sorted(vis[1:], key=lambda x: x[0]))
for i, (tilt, d, spd) in enumerate([(20, 30, 260), (60, 34, -200), (110, 38, 150)]):
    add(f'oring{i}', {'type': 'part', 'shape': 'torus', 'name': f'Orbit ring {i + 1}', 'parent': 'sphere_g', 'size': [d, 0.3, d], 'material': 'Neon', 'color': C['body'], 'pos': [0, 0, 0], 'rot': [tilt, 0, 0]},
        rot=[k(0, [tilt, 0, 0]), k(T['gone'], [tilt, spd * T['gone'], 0])], visible=[k(0, False, 'step'), k(0.8 + 0.3 * i, True, 'step'), k(T['gone'], False, 'step')])
add('sun', {'type': 'light', 'kind': 'point', 'name': 'Nova light', 'pos': SPH, 'color': C['black'], 'intensity': 40, 'range': 140},
    color=[k(0, '#0a1a22'), k(T['dip'], C['body'], 'in'), k(2.55, '#05080a'), k(T['hit'], '#05080a', 'step'), k(T['flash_end'], C['body'], 'step'), k(T['collapse'], C['body']), k(T['len'], '#04080f', 'out')])

# charge specks spiralling in (sparse: shapes, not showers)
for i in range(18):
    a0, r0, y0 = rng.random() * 6.283, 30 + rng.random() * 25, rng.uniform(-10, 25); t0 = rng.random() * 1.6; keys = []
    for j in range(7):
        f = j / 6; a = a0 + f * 2.5
        keys.append(k(t0 + f * 0.9, r3([SPH[0] + math.cos(a) * r0 * (1 - f), SPH[1] + (y0 - SPH[1] + 34) * (1 - f) * 0.4, SPH[2] + math.sin(a) * r0 * (1 - f)]), 'in'))
    add(f'speck{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Charge speck {i + 1}', 'size': [0.35, 0.35, 0.35], 'pos': keys[0][1], 'material': 'Neon', 'color': C['body']},
        pos=keys, visible=[k(0, False, 'step'), k(t0, True, 'step'), k(t0 + 0.9, False, 'step')])

# ---------- impact frame: white world for 2 frames ----------
# a small white sphere enclosing the camera: inside fog-near, so the whole frame goes white (a 700 m one was fogged to a grey gradient)
add('impact', {'type': 'part', 'shape': 'sphere', 'name': 'Impact frame', 'parent': None, 'size': [24, 24, 24], 'pos': [0, 6, 82], 'material': 'Neon', 'color': '#ffffff'},
    visible=[k(0, False, 'step'), k(T['hit'], True, 'step'), k(T['flash_end'], False, 'step')])

# ---------- barrage: 7 plasma beams from the sphere to the ground, each hit lights + cracks + throws chips ----------
G = -40.0
for i in range(7):
    a = -2.6 + i * (5.2 / 6) + rng.uniform(-0.15, 0.15); r = 20 + rng.random() * 25
    tgt = [math.cos(a) * r, 0, math.sin(a) * r]
    d = [tgt[j] - SPH[j] for j in range(3)]; L = math.sqrt(sum(x * x for x in d)); u = [x / L for x in d]
    rz = math.degrees(math.asin(u[1])); ry = math.degrees(math.atan2(-u[2], u[0]))   # local +X -> beam direction
    t0 = T['flash_end'] + i * 0.18; land = t0 + 0.12
    add(f'beam{i}', {'type': 'flipbook', 'name': f'Plasma beam {i + 1}', 'tex': 't-nv-beam', 'grid': 8, 'frames': 64, 'fps': 24, 'loop': True, 'life': 2.667,
                     'start': t0, 'dur': T['collapse'] - t0, 'size': 8 + rng.random() * 4, 'blend': 'add', 'shape': 'beam', 'length': round(L, 2), 'speed': round(L / 0.12, 1),
                     'pos': SPH, 'rot': [0, round(ry, 2), round(rz, 2)]})
    hp = []
    for q in range(61):
        f = q / 60; ang = f * 6.283 * 5 + i; c = [SPH[j] + d[j] * f for j in range(3)]
        side = [-u[2], 0, u[0]]; sl = math.sqrt(side[0] ** 2 + side[2] ** 2) or 1; side = [x / sl for x in side]
        up2 = [u[1] * side[2] - u[2] * side[1], u[2] * side[0] - u[0] * side[2], u[0] * side[1] - u[1] * side[0]]
        rad = 3.2 * (1 - 0.4 * f)
        hp.append([c[j] + (side[j] * math.cos(ang) + up2[j] * math.sin(ang)) * rad for j in range(3)])
    geos[f'g-nv-helix{i}'] = tube(hp, 0.28, sides=5)
    add(f'helix{i}', {'type': 'mesh', 'name': f'Beam helix {i + 1}', 'geo': f'g-nv-helix{i}', 'material': 'Neon', 'color': '#a8f4ff', 'smooth': True, 'pos': [0, 0, 0]},
        visible=[k(0, False, 'step'), k(land, True, 'step'), k(T['collapse'], False, 'step')])
    add(f'hit{i}', {'type': 'mesh', 'name': f'Hit ring {i + 1}', 'geo': 'g-nv-ring', 'material': 'Neon', 'color': C['core'], 'smooth': True, 'pos': r3([tgt[0], 0.2, tgt[2]])},
        visible=[k(0, False, 'step'), k(land, True, 'step'), k(land + 1.0, False, 'step')], scale=[k(land, [0.05, 1, 0.05]), k(land + 1.0, [1.4, 1, 1.4], 'out')],
        color=[k(land, C['core']), k(land + 1.0, C['black'], 'in')])
    add(f'glow{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Crater glow {i + 1}', 'size': [9, 0.8, 9], 'pos': r3([tgt[0], -0.2, tgt[2]]), 'material': 'Neon', 'color': C['black']},
        color=[k(0, C['black'], 'step'), k(land, C['body'], 'step'), k(T['collapse'], C['body']), k(T['len'], C['navy'], 'out')])
    add(f'hlight{i}', {'type': 'light', 'kind': 'point', 'name': f'Hit light {i + 1}', 'pos': r3([tgt[0], 3, tgt[2]]), 'color': C['black'], 'intensity': 25, 'range': 30},
        color=[k(0, C['black'], 'step'), k(land, C['body'], 'step'), k(T['collapse'], C['edge']), k(T['len'], '#000408', 'out')])
    for c in range(5):                                                    # dark angular chips thrown from the hit
        ca = rng.random() * 6.283; out, up, s = 8 + rng.random() * 16, 14 + rng.random() * 22, 0.4 + rng.random() * 0.9
        tl = 2 * up / -G; keys, rot, tt = [], [], 0.0; spin = [rng.uniform(-500, 500) for _ in range(3)]
        while tt <= tl + 0.1:
            ta = min(tt, tl)
            keys.append(k(land + tt, r3([tgt[0] + math.cos(ca) * out * ta, max(0, up * ta + 0.5 * G * ta * ta) + s * 0.3, tgt[2] + math.sin(ca) * out * ta])))
            rot.append(k(land + tt, r3([v * ta for v in spin]))); tt += 0.1
        add(f'chip{i}_{c}', {'type': 'mesh', 'name': f'Rock chip {i + 1}.{c + 1}', 'geo': f'g-nv-chip{c % 3}', 'material': 'Slate', 'color': '#4a4e58', 'texture': 't-nv-ground', 'smooth': False, 'pos': keys[0][1]},
            pos=keys, rot=rot, scale=[k(0, [s, s, s], 'step')], visible=[k(0, False, 'step'), k(land, True, 'step')])
    add(f'smoke{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Smoke {i + 1}', 'size': [10, 6, 10], 'pos': r3([tgt[0], 2, tgt[2]]), 'material': 'ForceField', 'color': '#1c2028', 'transparency': 0.9},
        visible=[k(0, False, 'step'), k(land + 0.3, True, 'step')], scale=[k(land + 0.3, [0.3, 0.2, 0.3]), k(T['len'], [1.6, 1.0, 1.6], 'out')],
        pos=[k(land + 0.3, r3([tgt[0], 2, tgt[2]])), k(T['len'], r3([tgt[0], 9, tgt[2]]), 'out')])

# ---------- aftermath: a few orange embers (the one complementary accent) ----------
for i in range(14):
    a, r = rng.random() * 6.283, 15 + rng.random() * 30; t0 = T['collapse'] - 0.3 + rng.random() * 1.5; x, z = math.cos(a) * r, math.sin(a) * r
    add(f'ember{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Ember {i + 1}', 'size': [0.3, 0.3, 0.3], 'pos': r3([x, 0.5, z]), 'material': 'Neon', 'color': C['ember']},
        pos=[k(t0, r3([x, 0.5, z])), k(T['len'], r3([x + rng.uniform(-3, 3), 6 + rng.random() * 12, z + rng.uniform(-3, 3)]), 'out')],
        visible=[k(0, False, 'step'), k(t0, True, 'step')], color=[k(t0, C['ember']), k(T['len'], '#6a2a10')])

# ---------- bigger payoff (owner v1: "rest is underwhelming") ----------
geos['g-nv-bigshock'] = ring_geo(10, 1.2, 1.0, seed=9)
for oid, tmax, end, col in [('bshock1', 1.3, 9.5, C['core']), ('bshock2', 2.6, 7.0, C['edge'])]:
    add(oid, {'type': 'mesh', 'name': f'Shockwave {oid[-1]}', 'geo': 'g-nv-bigshock', 'material': 'Neon', 'color': col, 'smooth': True, 'pos': [0, 0.3, 0]},
        visible=[k(0, False, 'step'), k(T['flash_end'], True, 'step'), k(T['flash_end'] + tmax, False, 'step')],
        scale=[k(T['flash_end'], [0.1, 1, 0.1]), k(T['flash_end'] + tmax, [end, 1, end], 'out')], color=[k(T['flash_end'], col), k(T['flash_end'] + tmax, C['black'], 'in')])
geos['g-nv-wall'] = tube([[0, y, 0] for y in (0, 2, 4, 6, 9)], [10, 10.4, 10.2, 9.8, 9.0], sides=64, cap=False)
add('wall', {'type': 'mesh', 'name': 'Dust wall', 'geo': 'g-nv-wall', 'material': 'ForceField', 'color': '#2a3a4a', 'transparency': 0.7, 'smooth': True, 'pos': [0, 0, 0]},
    visible=[k(0, False, 'step'), k(T['flash_end'], True, 'step'), k(T['flash_end'] + 2.6, False, 'step')],
    scale=[k(T['flash_end'], [0.3, 0.2, 0.3]), k(T['flash_end'] + 2.6, [8, 1.5, 8], 'out')], color=[k(T['flash_end'], '#2a3a4a'), k(T['flash_end'] + 2.6, C['black'], 'in')])
for v in range(4):
    g = random.Random(300 + v); pts = [[g.uniform(-0.05, 0.05) * q, q / 5, g.uniform(-0.05, 0.05) * q] for q in range(6)]
    geos[f'g-nv-spike{v}'] = tube(pts, [0.32 * (1 - q / 5) + 0.02 for q in range(6)], sides=5)
for i in range(30):
    a = rng.random() * 6.283; r = 16 + rng.random() * 40; h = 4 + rng.random() * 10; w = 0.9 + rng.random() * 1.5
    te = T['flash_end'] + r / 75 + rng.random() * 0.05
    add(f'spike{i}', {'type': 'mesh', 'name': f'Ground spike {i + 1}', 'geo': f'g-nv-spike{i % 4}', 'material': 'Slate', 'color': '#6a6e7a', 'texture': 't-nv-ground', 'smooth': False,
                      'pos': r3([math.cos(a) * r, -0.5, math.sin(a) * r]), 'rot': [0, round(-math.degrees(a), 1), -round(rng.uniform(10, 35), 1)]},
        scale=[k(0, [w, 0.01, w], 'step'), k(te, [w, 0.01, w]), k(te + 0.25, [w, h * 1.1, w], 'out'), k(te + 0.45, [w, h, w], 'smooth')],
        visible=[k(0, False, 'step'), k(te, True, 'step')])
last = T['flash_end'] + 6 * 0.18 + 0.12
add('flash2', {'type': 'part', 'shape': 'sphere', 'name': 'Final hit flash', 'size': [26, 18, 26], 'pos': [0, 6, 0], 'material': 'Neon', 'color': C['core']},
    visible=[k(0, False, 'step'), k(last, True, 'step'), k(last + 0.12, False, 'step')], scale=[k(last, [0.3, 0.3, 0.3]), k(last + 0.12, [1.6, 1.0, 1.6], 'out')])
for i in range(6):                                                        # the spent crystal sheds lit fragments
    a = 6.283 * i / 6; out, up = 6 + rng.random() * 6, 6 + rng.random() * 8; t0 = T['gone'] + rng.random() * 0.3
    tl = (up + math.sqrt(up * up + 2 * 40 * (CRY_Y + 4))) / 40; keys, rot, tt = [], [], 0.0; spin = [rng.uniform(-300, 300) for _ in range(3)]
    while tt <= tl + 0.1:
        ta = min(tt, tl)
        keys.append(k(t0 + tt, r3([math.cos(a) * (3 + out * ta), max(0.6, CRY_Y + 4 + up * ta - 20 * ta * ta), math.sin(a) * (3 + out * ta)]))); rot.append(k(t0 + tt, r3([v * ta for v in spin]))); tt += 0.1
    add(f'frag{i}', {'type': 'mesh', 'name': f'Crystal fragment {i + 1}', 'geo': f'g-nv-shard{i % 3}', 'material': 'Marble', 'color': '#6a7894', 'texture': 't-nv-obsidian', 'smooth': False, 'pos': keys[0][1]},
        pos=keys, rot=rot, scale=[k(0, [1.8, 1.8, 1.8], 'step')], visible=[k(0, False, 'step'), k(t0, True, 'step')])
    add(f'fglow{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Fragment glow {i + 1}', 'size': [0.5, 0.5, 0.5], 'material': 'Neon', 'color': C['body'], 'pos': keys[0][1]},
        pos=keys, visible=[k(0, False, 'step'), k(t0, True, 'step')], color=[k(t0, C['core']), k(T['len'], C['edge'])])

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
project = {'name': 'Cyan Nova v2', 'v': 1, 'updated': now, 'objects': objs, 'anims': {'nova': {'name': 'Nova', 'len': T['len'], 'fps': 30, 'loop': True, 'tracks': tracks}},
           'textures': textures, 'env': {'bg': '#07080c', 'grid': False, 'fog': {'color': '#07080c', 'near': 110, 'far': 420}, 'light': 'night'},
           'camera': {'pos': [0, 6, 82], 'target': [0, 22, 0], 'fov': 55, 'ortho': False}}
meta = {'name': 'Cyan Nova v2', 'updated': now, 'count': len(objs), 'ai': True, 'building': False}
for d in ('live', 'geo', 'tex', 'shots/tex'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
dump = lambda o, p: json.dump(o, open(p, 'w'), separators=(',', ':'))
dump(project, f'{OUT}/live/p.json'); dump(meta, f'{OUT}/live/m.json')
for gid, g in geos.items(): dump(g, f'{OUT}/geo/{gid}.json')
for tex, a, sh in (('t-nv-charge', '--charge-asset', '--charge-sheet'), ('t-nv-beam', '--beam-asset', '--beam-sheet')):
    if arg(a): dump({'asset': arg(a)}, f'{OUT}/tex/{tex}.json')
    if arg(sh): dump({'kind': 'image', 'data': 'data:image/webp;base64,' + base64.b64encode(open(arg(sh), 'rb').read()).decode()}, f'{OUT}/shots/tex/{tex}.json')
sizes = {f: os.path.getsize(f'{OUT}/{f}') for f in ['live/p.json'] + [f'geo/{g}.json' for g in geos]}
print(json.dumps({'objects': len(objs), 'tracks': len(tracks), 'geos': len(geos), 'project_kb': round(sizes['live/p.json'] / 1024, 1)}))
assert max(sizes.values()) < 225 * 1024, 'doc over 225 KB'
