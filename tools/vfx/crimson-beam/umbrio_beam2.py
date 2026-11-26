"""Crimson beam v2 for Umbrio (owner 2026-11-24: v1 'looks flat, the beam is just a linear line').
Volume and motion come from custom meshes + the physics flipbook, not plain cylinders:
plasma flipbook beam (kamehameha-beam:element=Ne, 2 layers), noise-displaced spinning core tube, 3 helix strands,
8 lightning arcs, spiky base crown, rippled shockwave rings, 30 ground spikes, streak sparks. Rune circle kept from v1.
Usage: python tools/vfx/crimson-beam/umbrio_beam2.py OUT --tex <tex-id> [--asset <hub asset id>] [--sheet <local sheet.webp for shots>]
Writes OUT/live/p.json, OUT/live/m.json, OUT/geo/*.json, OUT/tex/<tex-id>.json (hub doc), OUT/shots/tex/<tex-id>.json (data url, headless)."""
import base64, datetime, json, math, os, random, sys

arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
OUT = sys.argv[1]
TEX = arg('--tex', 't-cb-plasma')
rng = random.Random(11)
T = dict(pilot=1.2, impact=1.5, collapse=4.5, gone=5.5, len=7.0)
H = 420
C = dict(core='#fff2f2', inner='#ff2a3c', mid='#c4001a', outer='#5a0008', hot='#ff3300', cold='#300000', black='#000000')
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
    """Polygon tube along a polyline; radius per point (taper/noise). Frames from a stable reference axis."""
    verts, uvs, faces = [], [], []
    n = len(path)
    for i, p in enumerate(path):
        a, b = path[max(0, i - 1)], path[min(n - 1, i + 1)]
        t = [b[j] - a[j] for j in range(3)]; tl = math.sqrt(sum(x * x for x in t)) or 1; t = [x / tl for x in t]
        ref = [0, 1, 0] if abs(t[1]) < 0.9 else [1, 0, 0]
        u = [t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]]
        ul = math.sqrt(sum(x * x for x in u)) or 1; u = [x / ul for x in u]
        w = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]]
        for s in range(sides):
            an = 2 * math.pi * s / sides; r = radii[i] if isinstance(radii, list) else radii
            verts += r3([p[j] + (u[j] * math.cos(an) + w[j] * math.sin(an)) * r for j in range(3)])
            uvs += [round(s / sides, 3), round(i / (n - 1), 3)]
    for i in range(n - 1):
        for s in range(sides):
            a, b = i * sides + s, i * sides + (s + 1) % sides
            faces.append([a, b, b + sides, a + sides])
    if cap:
        faces.append(list(range(sides))[::-1]); faces.append([(n - 1) * sides + s for s in range(sides)])
    return {'verts': verts, 'faces': faces, 'uvs': uvs}


def ring_geo(r_out, width, ripple, seg=120, rows=6, seed=1):
    """Flat annulus with a rippled, thicker inner edge (shockwave front)."""
    nz = noise1(seed); verts, uvs, faces = [], [], []
    for i in range(rows + 1):
        f = i / rows; r = r_out - width * f
        for j in range(seg):
            a = 2 * math.pi * j / seg
            y = ripple * math.sin(math.pi * f) * (0.6 + 0.4 * nz(a * 6))
            verts += r3([math.cos(a) * r, y, math.sin(a) * r]); uvs += [round(j / seg, 3), round(f, 3)]
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


# ---------- reused v1 pieces: ground, crater, rune circle (owner: "the circle is really good") ----------
def ground_geo():
    radii = [0, 2, 4, 6, 8, 10, 13, 16, 18, 20, 22, 25, 29, 34, 40, 48, 58, 70, 85, 100, 120]; seg = 72
    verts, uvs, faces = [], [], []
    for r in radii:
        for j in range(seg):
            a = 2 * math.pi * j / seg; x, z = math.cos(a) * r, math.sin(a) * r
            y = -3.2 * math.exp(-r * r / 242) + 1.4 * math.exp(-((r - 21) / 4.5) ** 2) + (rng.random() - 0.5) * 0.35 * min(1, r / 10)
            verts += r3([x, y, z]); uvs += [round(x / 6, 3), round(z / 6, 3)]
    for i in range(len(radii) - 1):
        for j in range(seg):
            a, b = i * seg + j, i * seg + (j + 1) % seg
            faces.append([a, (i + 1) * seg + j, (i + 1) * seg + (j + 1) % seg, b])
    return {'verts': verts, 'faces': faces, 'uvs': uvs}


def rock_geo(seed):
    g = random.Random(seed); lat, lon = 6, 9; verts, uvs, faces = [], [], []
    for i in range(lat + 1):
        th = math.pi * i / lat
        for j in range(lon):
            ph = 2 * math.pi * j / lon; rr = 0.75 + g.random() * 0.45 if 0 < i < lat else 0.85
            verts += r3([math.sin(th) * math.cos(ph) * rr, math.cos(th) * rr * 0.7, math.sin(th) * math.sin(ph) * rr])
            uvs += [round(j / lon, 3), round(i / lat, 3)]
    for i in range(lat):
        for j in range(lon):
            faces.append([i * lon + j, (i + 1) * lon + j, (i + 1) * lon + (j + 1) % lon, i * lon + (j + 1) % lon])
    return {'verts': verts, 'faces': faces, 'uvs': uvs}


geos['g-c2-ground'] = ground_geo()
for s in range(4): geos[f'g-c2-rock{s}'] = rock_geo(100 + s)
textures = {
    't-c2-ground': {'kind': 'procedural', 'pattern': 'rock', 'colors': ['#140806', '#2e1812'], 'scale': 3, 'seed': 3},
    't-c2-rock': {'kind': 'procedural', 'pattern': 'rock', 'colors': ['#2a1812', '#5a3a30'], 'scale': 1.2, 'seed': 9},
}

# root shake + push-in (no camera track in Umbrio)
shake, t = [], 0.0
while t <= T['len'] + 1e-6:
    A = 0.08 * t / T['pilot'] if t < T['pilot'] else 0.18 if t < T['impact'] else 1.6 * math.exp(-(t - T['impact']) * 2.5) + (0.3 if t < T['collapse'] else 0.04)
    if t > T['gone'] - 0.1: A += 0.7 * math.exp(-max(0, t - (T['gone'] - 0.1)) * 3)
    push = 0 if t < T['pilot'] else 22 * (0.5 - 0.5 * math.cos(math.pi * min(1, (t - T['pilot']) / (T['collapse'] - T['pilot']))))
    shake.append(k(t, r3([A * (rng.random() * 2 - 1), A * (rng.random() * 2 - 1) * 0.7, push]), 'smooth')); t += 0.05
add('world', {'type': 'group', 'name': 'World', 'parent': None, 'pos': [0, 0, 0]}, pos=shake)
add('ground', {'type': 'mesh', 'name': 'Scorched ground', 'geo': 'g-c2-ground', 'color': '#5a4038', 'material': 'Slate', 'texture': 't-c2-ground', 'smooth': True, 'pos': [0, 0, 0]})
add('crater', {'type': 'part', 'shape': 'sphere', 'name': 'Crater glow', 'size': [24, 1.2, 24], 'pos': [0, -2.6, 0], 'material': 'Neon', 'color': C['black']},
    color=[k(0, C['black']), k(T['impact'], C['black'], 'step'), k(T['impact'] + 0.1, C['hot']), k(T['gone'], C['hot']), k(T['len'], C['cold'], 'out')])
rune_col = [k(0, C['black']), k(1.0, C['inner'], 'in'), k(T['impact'], '#ff8090'), k(T['impact'] + 0.5, C['black'], 'out')]
add('rune1', {'type': 'part', 'shape': 'torus', 'name': 'Rune ring inner', 'size': [40, 0.5, 40], 'pos': [0, 0.35, 0], 'material': 'Neon', 'color': C['black']}, color=rune_col)
add('rune2', {'type': 'part', 'shape': 'torus', 'name': 'Rune ring outer', 'size': [54, 0.35, 54], 'pos': [0, 0.35, 0], 'material': 'Neon', 'color': C['black']}, color=rune_col)
for i in range(24):
    a = 360 * i / 24
    add(f'glyph{i}', {'type': 'part', 'shape': 'box', 'name': f'Rune glyph {i + 1}', 'size': [0.35, 0.12, 2.2 if i % 3 else 3.2],
                      'pos': r3([math.cos(math.radians(a)) * 23.5, 0.4, math.sin(math.radians(a)) * 23.5]), 'rot': [0, round(-a, 2), 0], 'material': 'Neon', 'color': C['black']}, color=rune_col)
for i, (d, y, c, sp) in enumerate([(60, 78, C['mid'], 40), (120, 88, C['outer'], -28), (190, 98, '#3a0006', 18), (270, 110, '#2a0006', -12)]):
    add(f'vortex{i}', {'type': 'part', 'shape': 'torus', 'name': f'Vortex ring {i + 1}', 'size': [d, d * 0.18, d], 'pos': [0, y, 0], 'material': 'ForceField', 'color': '#000000'},
        rot=[k(0, [0, 0, 0]), k(T['len'], [0, sp * T['len'], 0])], color=[k(0, '#000000'), k(T['pilot'], c, 'in'), k(T['gone'], c), k(T['len'], '#100002', 'out')])

beam_on = [k(0, False, 'step'), k(T['impact'], True, 'step'), k(T['gone'], False, 'step')]
beam_scale = [k(T['impact'], [0.05, 1, 0.05]), k(T['impact'] + 0.15, [1.1, 1, 1.1], 'out'), k(T['impact'] + 0.4, [1, 1, 1], 'smooth'),
              k(3.0, [1.06, 1, 1.06], 'smooth'), k(T['collapse'], [1, 1, 1], 'smooth'), k(T['gone'], [0.02, 1, 0.02], 'in')]

# ---------- plasma flipbook beams: pilot shoots down from the sky, then two thick layers ----------
fb = {'type': 'flipbook', 'tex': TEX, 'grid': 8, 'frames': 64, 'fps': 24, 'loop': True, 'blend': 'add', 'shape': 'beam', 'length': H}
add('fb_pilot', dict(fb, name='Pilot plasma', size=3, pos=[0, H, 0], rot=[0, 0, -90], start=T['pilot'], dur=T['impact'] - T['pilot'] + 0.05, life=2.667, speed=H / 0.3))
add('fb_main', dict(fb, name='Plasma beam', size=30, pos=[0, 0, 0], rot=[0, 0, 90], start=T['impact'], dur=T['gone'] - T['impact'], life=2.667))
add('fb_outer', dict(fb, name='Plasma halo', size=48, fps=16, pos=[0, 0, 0], rot=[0, 90, 90], start=T['impact'] + 0.03, dur=T['gone'] - T['impact'] - 0.2, life=4.0))

# ---------- spinning noise core (alive surface) ----------
nz = noise1(5)
ys = [i * 6 for i in range(H // 6 + 1)]
# owner 2026-11-24: "the white middle looks pretty bad" -> no solid white tube; a thin translucent hot-red core lets the plasma flipbook carry the centre
geos['g-c2-core2'] = tube([[0, y, 0] for y in ys], [2.2 + 0.6 * nz(y * 0.09) + 0.5 * math.exp(-y / 8) * 3 for y in ys], sides=24)
add('core', {'type': 'mesh', 'name': 'Beam core', 'geo': 'g-c2-core2', 'material': 'ForceField', 'color': '#ff3a4c', 'transparency': 0.35, 'smooth': True, 'pos': [0, 0, 0]},
    visible=beam_on, scale=beam_scale, rot=[k(T['impact'], [0, 0, 0]), k(T['gone'], [0, 1440, 0])])
geos['g-c2-haze'] = tube([[0, y, 0] for y in ys], [21 + 2.5 * nz(y * 0.05 + 3) for y in ys], sides=32)
add('haze', {'type': 'mesh', 'name': 'Beam haze', 'geo': 'g-c2-haze', 'material': 'ForceField', 'color': C['outer'], 'transparency': 0.9, 'smooth': True, 'pos': [0, 0, 0]},
    visible=beam_on, scale=beam_scale, rot=[k(T['impact'], [0, 0, 0]), k(T['gone'], [0, -720, 0])])

# ---------- helix strands ----------
for i in range(3):
    r0, turns, ph = 14 + i * 2, 5 - i, i * 2.094
    pts = [[math.cos(ph + turns * 6.283 * y / H) * r0 * (1 + 0.35 * math.exp(-y / 25)), y, math.sin(ph + turns * 6.283 * y / H) * r0 * (1 + 0.35 * math.exp(-y / 25))]
           for y in [j * 3.0 for j in range(int(H / 3) + 1)]]
    geos[f'g-c2-helix{i}'] = tube(pts, [0.9 * (1 - 0.6 * j / len(pts)) + 0.2 for j in range(len(pts))], sides=6)
    sp = 360 * (1 if i % 2 == 0 else -1) * (1 + 0.3 * i)
    add(f'helix{i}', {'type': 'mesh', 'name': f'Helix strand {i + 1}', 'geo': f'g-c2-helix{i}', 'material': 'Neon', 'color': C['inner'] if i != 1 else '#ff6070', 'smooth': True, 'pos': [0, 0, 0]},
        visible=[k(0, False, 'step'), k(T['impact'] + 0.08, True, 'step'), k(T['collapse'] + 0.6, False, 'step')], scale=beam_scale,
        rot=[k(T['impact'], [0, 0, 0]), k(T['collapse'] + 0.6, [0, round(sp * (T['collapse'] + 0.6 - T['impact']), 1), 0])])

# ---------- energy rings (kept, thinner) ----------
for i in range(6):
    t0 = T['impact'] + 0.1 + i * 0.25; keys, t = [], t0
    while t < T['collapse']:
        keys += [k(t, [0, 300, 0], 'step'), k(min(t + 1.5, T['collapse']), [0, 300 - 300 * min(1.5, T['collapse'] - t) / 1.5, 0])]; t += 1.5
    add(f'ring{i}', {'type': 'part', 'shape': 'torus', 'name': f'Energy ring {i + 1}', 'size': [36 + (i % 3) * 6, 0.35, 36 + (i % 3) * 6], 'pos': [0, 300, 0], 'material': 'Neon', 'color': C['inner']},
        pos=keys, visible=[k(0, False, 'step'), k(t0, True, 'step'), k(T['collapse'], False, 'step')])

# ---------- lightning arcs: jagged tubes from the beam to the ground, flicker on and off ----------
for i in range(8):
    a = rng.random() * 6.283; y0 = 4 + rng.random() * 30; r1 = 22 + rng.random() * 16
    p0 = [math.cos(a) * 12, y0, math.sin(a) * 12]; p1 = [math.cos(a + rng.uniform(-0.4, 0.4)) * r1, 0.3, math.sin(a + rng.uniform(-0.4, 0.4)) * r1]
    pts = []
    for j in range(13):
        f = j / 12; jit = 0 if j in (0, 12) else rng.uniform(2, 5)
        pts.append([p0[0] + (p1[0] - p0[0]) * f + rng.uniform(-1, 1) * jit, p0[1] + (p1[1] - p0[1]) * f + math.sin(f * math.pi) * 6 + rng.uniform(-1, 1) * jit * 0.6,
                    p0[2] + (p1[2] - p0[2]) * f + rng.uniform(-1, 1) * jit])
    geos[f'g-c2-arc{i}'] = tube(pts, [0.35 * (1 - 0.5 * j / 12) for j in range(13)], sides=5)
    vis = [k(0, False, 'step')]
    for _ in range(5):
        tf = round(T['impact'] + rng.random() * (T['collapse'] - T['impact']), 2); vis += [k(tf, True, 'step'), k(tf + 0.07, False, 'step')]
    vis = [vis[0]] + sorted(vis[1:], key=lambda x: x[0])
    add(f'arc{i}', {'type': 'mesh', 'name': f'Lightning arc {i + 1}', 'geo': f'g-c2-arc{i}', 'material': 'Neon', 'color': '#ffd8dc', 'smooth': False, 'pos': [0, 0, 0]}, visible=vis)

# ---------- base crown: 20 curved spikes erupting around the impact ----------
spikes = []
for j in range(20):
    a = 6.283 * j / 20 + rng.uniform(-0.08, 0.08); h = 6 + rng.random() * 8; lean = 4 + rng.random() * 5
    pts = [[math.cos(a) * (10 + lean * (f ** 1.5)), h * f, math.sin(a) * (10 + lean * (f ** 1.5))] for f in [q / 6 for q in range(7)]]
    spikes.append(tube(pts, [1.3 * (1 - q / 6) + 0.05 for q in range(7)], sides=5))
geos['g-c2-crown'] = merge(spikes)
add('crown', {'type': 'mesh', 'name': 'Impact crown', 'geo': 'g-c2-crown', 'material': 'Neon', 'color': '#ff4a5a', 'smooth': True, 'pos': [0, 0, 0]},
    visible=beam_on, scale=[k(T['impact'], [0.4, 0.05, 0.4]), k(T['impact'] + 0.12, [1.25, 1.3, 1.25], 'out')] + [k(T['impact'] + 0.3 + 0.2 * q, [1, 0.85 + 0.25 * (q % 2), 1], 'smooth') for q in range(15)] + [k(T['gone'], [0.3, 0.05, 0.3], 'in')])

# ---------- shockwaves: rippled rings + a dust wall ----------
geos['g-c2-shock'] = ring_geo(10, 1.2, 0.8, seed=2)
geos['g-c2-shock2'] = ring_geo(10, 2.5, 1.6, seed=4)
for oid, gid, name, tmax, end, col in [('shock1', 'g-c2-shock', 'Shockwave front', 1.2, 24, '#ff8090'), ('shock2', 'g-c2-shock2', 'Shockwave dust', 2.5, 16, C['mid'])]:
    add(oid, {'type': 'mesh', 'name': name, 'geo': gid, 'material': 'Neon', 'color': col, 'smooth': True, 'pos': [0, 0.4, 0]},
        visible=[k(0, False, 'step'), k(T['impact'], True, 'step'), k(T['impact'] + tmax, False, 'step')],
        scale=[k(T['impact'], [0.1, 1, 0.1]), k(T['impact'] + tmax, [end, 1, end], 'out')], color=[k(T['impact'], col), k(T['impact'] + tmax, C['black'], 'in')])
geos['g-c2-wall'] = tube([[0, y, 0] for y in (0, 2, 4, 6, 8)], [10, 10.4, 10.2, 9.8, 9.2], sides=64, cap=False)
add('wall', {'type': 'mesh', 'name': 'Dust wall', 'geo': 'g-c2-wall', 'material': 'ForceField', 'color': '#5a1018', 'transparency': 0.6, 'smooth': True, 'pos': [0, 0, 0]},
    visible=[k(0, False, 'step'), k(T['impact'] + 0.05, True, 'step'), k(T['impact'] + 2.6, False, 'step')],
    scale=[k(T['impact'] + 0.05, [0.3, 0.2, 0.3]), k(T['impact'] + 2.6, [13, 1.6, 13], 'out')], color=[k(T['impact'], '#5a1018'), k(T['impact'] + 2.6, C['black'], 'in')])
add('flash', {'type': 'part', 'shape': 'sphere', 'name': 'Impact flash', 'size': [30, 30, 30], 'pos': [0, 4, 0], 'material': 'Neon', 'color': C['core']},
    visible=[k(0, False, 'step'), k(T['impact'], True, 'step'), k(T['impact'] + 0.18, False, 'step')], scale=[k(T['impact'], [0.2, 0.2, 0.2]), k(T['impact'] + 0.18, [2.2, 0.8, 2.2], 'out')])
for i, (p, rr) in enumerate([([0, 8, 0], 120), ([0, 40, 0], 160), ([0, 3, 30], 60)]):
    add(f'light{i}', {'type': 'light', 'kind': 'point', 'name': f'Beam light {i + 1}', 'pos': p, 'color': C['black'], 'intensity': 30, 'range': rr},
        color=[k(0, C['black']), k(T['pilot'], '#400008'), k(T['impact'], C['inner'], 'out'), k(T['gone'], C['inner']), k(T['len'], '#200004', 'out')])

# ---------- ground spikes: 30 tapered rock shards erupt at impact (pivot at the base) ----------
for v in range(6):
    g = random.Random(300 + v); h = 1.0
    pts = [[g.uniform(-0.05, 0.05) * q, h * q / 5, g.uniform(-0.05, 0.05) * q] for q in range(6)]
    geos[f'g-c2-shard{v}'] = tube(pts, [0.32 * (1 - q / 5) + 0.02 for q in range(6)], sides=5)
for i in range(30):
    a = rng.random() * 6.283; r = 15 + rng.random() * 30; h = 4 + rng.random() * 9; w = 0.8 + rng.random() * 1.4
    te = T['impact'] + (r - 12) / 180 + rng.random() * 0.05            # rides the shockwave front outward
    tilt = round(rng.uniform(10, 35), 1)
    add(f'shard{i}', {'type': 'mesh', 'name': f'Ground spike {i + 1}', 'geo': f'g-c2-shard{i % 6}', 'material': 'Slate', 'color': '#ffffff', 'texture': 't-c2-rock', 'smooth': False,
                      'pos': r3([math.cos(a) * r, -0.5, math.sin(a) * r]), 'rot': [0, round(-math.degrees(a), 1), -tilt]},
        scale=[k(0, [w, 0.01, w], 'step'), k(te, [w, 0.01, w]), k(te + 0.25, [w, h * 1.1, w], 'out'), k(te + 0.45, [w, h, w], 'smooth')],
        visible=[k(0, False, 'step'), k(te, True, 'step')])

# ---------- debris (v1 ballistic rocks) ----------
G = -40.0
for i in range(40):
    a = rng.random() * 6.283; r0, out, up = 9 + rng.random() * 8, 18 + rng.random() * 45, 20 + rng.random() * 45
    t0 = T['impact'] + rng.random() * (0.25 if i < 28 else 2.5); s = 0.5 + rng.random() ** 2 * 2.6; tl = 2 * up / -G
    pos, rot, spin, tt = [k(0, r3([math.cos(a) * r0, -2, math.sin(a) * r0]), 'step')], [], [rng.uniform(-400, 400) for _ in range(3)], 0.0
    while tt <= tl + 0.1:
        ta = min(tt, tl); rr = r0 + out * ta
        pos.append(k(t0 + tt, r3([math.cos(a) * rr, max(0, up * ta + 0.5 * G * ta * ta) + s * 0.35, math.sin(a) * rr]))); rot.append(k(t0 + tt, r3([v * ta for v in spin]))); tt += 0.1
    add(f'rock{i}', {'type': 'mesh', 'name': f'Debris {i + 1}', 'geo': f'g-c2-rock{i % 4}', 'color': '#ffffff', 'material': 'Slate', 'texture': 't-c2-rock', 'smooth': False, 'pos': pos[0][1]},
        pos=pos, rot=rot, scale=[k(0, [s * 1.3, s, s * 1.1], 'step')], visible=[k(0, False, 'step'), k(t0, True, 'step')])

# ---------- streak sparks: thin tapered streaks aimed along their launch direction ----------
geos['g-c2-streak'] = tube([[0, 0, 0], [0, 1.2, 0], [0, 2.4, 0]], [0.16, 0.1, 0.02], sides=5)
for i in range(48):
    a = rng.random() * 6.283; t0 = T['impact'] + rng.random() * 2.8
    out, up, life = 30 + rng.random() * 60, 25 + rng.random() * 50, 0.7 + rng.random() * 0.7
    tilt = math.degrees(math.atan2(out, up)); keys = []
    for j in range(9):
        ta = life * j / 8; rr = 11 + out * ta
        keys.append(k(t0 + ta, r3([math.cos(a) * rr, max(0.2, up * ta + 0.5 * G * ta * ta), math.sin(a) * rr])))
    add(f'spark{i}', {'type': 'mesh', 'name': f'Spark streak {i + 1}', 'geo': 'g-c2-streak', 'material': 'Neon', 'color': '#ffd0c0', 'smooth': True,
                      'pos': keys[0][1], 'rot': [0, round(-math.degrees(a), 1), round(-tilt, 1)]},
        pos=keys, scale=[k(t0, [1, 1.6, 1]), k(t0 + life, [0.6, 0.5, 0.6])], visible=[k(0, False, 'step'), k(t0, True, 'step'), k(t0 + life, False, 'step')],
        color=[k(t0, '#ffd0c0'), k(t0 + life, C['inner'])])
for i in range(24):
    a, r = rng.random() * 6.283, rng.random() * 25; t0 = T['collapse'] - 0.2 + rng.random() * 2.0; x, z = math.cos(a) * r, math.sin(a) * r
    add(f'ember{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Ember {i + 1}', 'size': [0.3, 0.3, 0.3], 'pos': r3([x, 0.5, z]), 'material': 'Neon', 'color': '#ffb070'},
        pos=[k(t0, r3([x, 0.5, z])), k(T['len'], r3([x + rng.uniform(-3, 3), 8 + rng.random() * 14, z + rng.uniform(-3, 3)]), 'out')],
        visible=[k(0, False, 'step'), k(t0, True, 'step')], color=[k(t0, '#ffb070'), k(T['len'], C['mid'])])

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
project = {'name': 'Crimson Beam v2', 'v': 1, 'updated': now, 'objects': objs,
           'anims': {'strike': {'name': 'Strike', 'len': T['len'], 'fps': 30, 'loop': True, 'tracks': tracks}}, 'textures': textures,
           'env': {'bg': '#0a0003', 'grid': False, 'fog': {'color': '#0a0003', 'near': 120, 'far': 520}, 'light': 'night'},
           'camera': {'pos': [0, 7, 78], 'target': [0, 24, 0], 'fov': 55, 'ortho': False}}
meta = {'name': 'Crimson Beam v2', 'updated': now, 'count': len(objs), 'ai': True, 'building': False}
for d in ('live', 'geo', 'tex', 'shots/tex'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
dump = lambda o, p: json.dump(o, open(p, 'w'), separators=(',', ':'))
dump(project, f'{OUT}/live/p.json'); dump(meta, f'{OUT}/live/m.json')
for gid, g in geos.items(): dump(g, f'{OUT}/geo/{gid}.json')
if arg('--asset'): dump({'asset': arg('--asset')}, f'{OUT}/tex/{TEX}.json')
if arg('--sheet'): dump({'kind': 'image', 'data': 'data:image/webp;base64,' + base64.b64encode(open(arg('--sheet'), 'rb').read()).decode()}, f'{OUT}/shots/tex/{TEX}.json')
sizes = {f: os.path.getsize(f'{OUT}/{f}') for f in ['live/p.json'] + [f'geo/{g}.json' for g in geos]}
print(json.dumps({'objects': len(objs), 'tracks': len(tracks), 'geos': len(geos), 'max_kb': round(max(sizes.values()) / 1024, 1), 'project_kb': round(sizes['live/p.json'] / 1024, 1)}))
assert max(sizes.values()) < 225 * 1024, 'doc over 225 KB'
