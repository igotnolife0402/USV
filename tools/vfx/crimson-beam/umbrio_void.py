"""Void Rift: black hole forms, accretion disk spins up, debris spirals in, squeeze, impact frame, burst (owner 2026-11-24 "another vfx, different").
Usage: python tools/vfx/crimson-beam/umbrio_void.py OUT"""
import base64, datetime, json, math, os, random, sys

arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
OUT = sys.argv[1]
rng = random.Random(23)
T = dict(open=1.5, squeeze=4.5, hit=4.8, flash_end=4.87, len=7.0)
C = dict(white='#f3e8ff', violet='#9a5cff', deep='#3a1080', rim='#7a3cff', orange='#ff9a3c', black='#000000')
CEN = [0, 25, 0]
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


# ---------- World: Dutch tilt 10 deg, push-in while it spins up, shake after the impact ----------
pos, t = [], 0.0
while t <= T['len'] + 1e-6:
    A = 0.04 if t < T['hit'] else 1.3 * math.exp(-(t - T['hit']) * 2.5) + 0.05
    push = 12 * min(1, t / T['squeeze'])
    pos.append(k(t, r3([A * (rng.random() * 2 - 1), A * (rng.random() * 2 - 1) * 0.7, push]), 'smooth')); t += 0.05
add('world', {'type': 'group', 'name': 'World', 'parent': None, 'pos': [0, 0, 0], 'rot': [0, 0, 10]}, pos=pos)
grow = [k(0, [0.05, 0.05, 0.05]), k(T['open'], [1, 1, 1], 'out'), k(T['squeeze'], [1.05, 1.05, 1.05], 'smooth'), k(T['hit'], [0.6, 0.6, 0.6], 'in'),
        k(T['flash_end'] + 0.1, [0.02, 0.02, 0.02], 'in')]

# ---------- singularity: solid black core + violet rim shells (real 3D noise meshes, no cards) ----------
add('rift', {'type': 'group', 'name': 'Rift', 'pos': CEN}, scale=grow)
# owner 2026-11-24 "the void orb has no gradient, no texture, like 1 layer": 8 nested layers, black centre -> violet -> lilac
# -> white photon ring + orange Doppler side; every shell textured and counter-rotating so the layers shear (visible depth)
ORB_TEX = {
    't-vr-shadow': {'kind': 'procedural', 'pattern': 'clouds', 'colors': ['#000000', '#1a0838'], 'scale': 3, 'seed': 4},
    't-vr-swirl': {'kind': 'procedural', 'pattern': 'marble', 'colors': ['#12052a', '#7a3cff'], 'scale': 4, 'seed': 6},
    't-vr-plasma': {'kind': 'procedural', 'pattern': 'clouds', 'colors': ['#5a20c0', '#f3e8ff'], 'scale': 3, 'seed': 8},
    't-vr-streak': {'kind': 'procedural', 'pattern': 'stripes', 'colors': ['#9a5cff', '#ffffff'], 'scale': 2, 'seed': 3},
}
add('core', {'type': 'part', 'shape': 'sphere', 'name': 'Singularity', 'parent': 'rift', 'size': [9, 9, 9], 'material': 'SmoothPlastic', 'color': C['black'], 'pos': [0, 0, 0]})
LAYERS = [  # name, radius, noise amp, colour, transparency, texture, spin axis, deg/s
    ('Shadow shell', 5.5, 0.03, '#2a1450', 0.15, 't-vr-shadow', 1, 60),
    ('Inner swirl', 6.5, 0.12, '#6a3ab0', 0.45, 't-vr-swirl', 0, -120),
    ('Plasma shell', 7.6, 0.15, '#b090ff', 0.65, 't-vr-plasma', 1, 200),
    ('Hot fringe', 8.6, 0.10, '#e0c8ff', 0.8, 't-vr-streak', 2, 150),
    ('Outer haze', 11.0, 0.06, C['deep'], 0.92, None, 1, -40),
]
for i, (nm, R, amp, col, tr, tex, axis, spd) in enumerate(LAYERS):
    geos[f'g-vr-orb{i}'] = blob_geo(R, amp, 70 + i)
    end = [0, 0, 0]; end[axis] = spd * T['hit']
    o = {'type': 'mesh', 'name': nm, 'geo': f'g-vr-orb{i}', 'parent': 'rift', 'material': 'ForceField', 'color': col, 'transparency': tr, 'smooth': True, 'pos': [0, 0, 0]}
    if tex: o['texture'] = tex
    add(f'orb{i}', o, rot=[k(0, [0, 0, 0]), k(T['hit'], r3(end))])
add('photon', {'type': 'part', 'shape': 'torus', 'name': 'Photon ring', 'parent': 'rift', 'size': [17.8, 0.35, 17.8], 'material': 'Neon', 'color': C['white'], 'pos': [0, 0, 0], 'rot': [90, 0, 0]},
    scale=[k(0, [1, 1, 1])] + [k(T['open'] + 0.35 * q, [1.04 if q % 2 else 0.97] * 3, 'smooth') for q in range(9)])
geos['g-vr-doppler'] = tube([[math.cos(a) * 9.2, math.sin(a) * 9.2, 0.25] for a in [math.pi * (0.55 + q / 24) for q in range(25)]], [0.2 + 0.35 * math.sin(math.pi * q / 24) for q in range(25)], sides=6, cap=False)
add('doppler', {'type': 'mesh', 'name': 'Doppler side (orange)', 'geo': 'g-vr-doppler', 'parent': 'rift', 'material': 'Neon', 'color': C['orange'], 'smooth': True, 'pos': [0, 0, 0]})
add('vlight', {'type': 'light', 'kind': 'point', 'name': 'Rift light', 'pos': CEN, 'color': C['black'], 'intensity': 35, 'range': 120},
    color=[k(0, C['black']), k(T['open'], C['violet'], 'in'), k(T['squeeze'], C['violet']), k(T['hit'], C['black'], 'step'), k(T['flash_end'], C['white'], 'step'), k(T['len'], '#100420', 'out')])

# ---------- accretion disk: 3 rippled ring meshes tilted 15 deg, each spinning at its own speed, orange inner edge ----------
add('disk', {'type': 'group', 'name': 'Accretion disk', 'pos': CEN, 'rot': [15, 0, 0]}, scale=grow)
for i, (ro, w, col, mat, tr, spd) in enumerate([(14, 5, C['white'], 'Neon', 0, 400), (22, 8, C['violet'], 'Neon', 0, 260), (32, 10, C['deep'], 'ForceField', 0.45, 180)]):
    geos[f'g-vr-disk{i}'] = ring_geo(ro, w, 0.9 + 0.4 * i, seg=120, rows=6, seed=80 + i)
    o = {'type': 'mesh', 'name': f'Disk band {i + 1}', 'geo': f'g-vr-disk{i}', 'parent': 'disk', 'material': mat, 'color': col, 'smooth': True, 'pos': [0, 0.3 * i, 0]}
    if tr: o['transparency'] = tr
    add(f'band{i}', o, rot=[k(0, [0, 0, 0]), k(T['hit'], [0, spd * T['hit'], 0])])
add('inner', {'type': 'part', 'shape': 'torus', 'name': 'Hot inner edge', 'parent': 'disk', 'size': [18.4, 0.6, 18.4], 'material': 'Neon', 'color': C['orange'], 'pos': [0, 0.1, 0]},
    rot=[k(0, [0, 0, 0]), k(T['hit'], [0, -500 * T['hit'], 0])])
# lensing arcs: light bent over and under the hole (vertical half-loops around the core)
for i in range(6):
    R = 9 + i * 1.3; ph = i * 30
    pts = [[math.cos(math.radians(ph)) * R * math.cos(a), R * math.sin(a), math.sin(math.radians(ph)) * R * math.cos(a)] for a in [math.pi * q / 24 for q in range(25)]]
    geos[f'g-vr-lens{i}'] = tube(pts, [0.12 + 0.2 * math.sin(math.pi * q / 24) for q in range(25)], sides=5, cap=False)
    add(f'lens{i}', {'type': 'mesh', 'name': f'Lensing arc {i + 1}', 'geo': f'g-vr-lens{i}', 'parent': 'rift', 'material': 'Neon', 'color': C['violet'] if i % 2 else C['white'], 'smooth': True, 'pos': [0, 0, 0]},
        rot=[k(0, [0, 0, 0]), k(T['hit'], [0, 90 + 40 * i, 0])], visible=[k(0, False, 'step'), k(T['open'] * 0.6 + 0.1 * i, True, 'step'), k(T['flash_end'], False, 'step')])

# ---------- debris: 24 lit rocks on decaying spiral orbits in the disk plane (tiny vs the 64 m disk) ----------
for s in range(3): geos[f'g-vr-rock{s}'] = crystal_geo(90 + s, 0.8, 0.7, 0.7, sides=5)
for i in range(24):
    a0 = rng.random() * 6.283; r0 = 40 + rng.random() * 25; t0 = rng.random() * 1.2; t1 = T['squeeze'] - rng.random() * 1.2; keys, rot = [], []
    for q in range(16):
        f = q / 15; tt = t0 + (t1 - t0) * f; r = r0 * (1 - f) ** 1.6 + 4; a = a0 + 3.5 * f / max(0.15, (1 - f) ** 0.8)
        keys.append(k(tt, r3([math.cos(a) * r, rng.uniform(-1.5, 1.5) * (1 - f), math.sin(a) * r]))); rot.append(k(tt, r3([400 * f, 700 * f, 200 * f])))
    sc = 0.6 + rng.random() * 1.3
    add(f'rock{i}', {'type': 'mesh', 'name': f'Infalling rock {i + 1}', 'geo': f'g-vr-rock{i % 3}', 'parent': 'disk', 'material': 'Slate', 'color': '#8a7fa8', 'smooth': False, 'pos': keys[0][1]},
        pos=keys, rot=rot, scale=[k(0, [sc, sc, sc], 'step')], visible=[k(0, False, 'step'), k(t0, True, 'step'), k(t1, False, 'step')])
    add(f'rglow{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Rock glint {i + 1}', 'parent': 'disk', 'size': [0.4, 0.4, 0.4], 'material': 'Neon', 'color': C['orange'], 'pos': keys[0][1]},
        pos=keys, visible=[k(0, False, 'step'), k(t0, True, 'step'), k(t1, False, 'step')])

# ---------- impact frame + burst ----------
add('impact', {'type': 'part', 'shape': 'sphere', 'name': 'Impact frame', 'parent': None, 'size': [24, 24, 24], 'pos': [0, 6, 82], 'material': 'Neon', 'color': '#ffffff'},
    visible=[k(0, False, 'step'), k(T['hit'], True, 'step'), k(T['flash_end'], False, 'step')])
geos['g-vr-shock'] = ring_geo(10, 1.6, 1.2, seg=120, seed=91)
for oid, tmax, end, col in [('shock1', 1.4, 8.0, C['white']), ('shock2', 2.1, 6.0, C['violet'])]:
    add(oid, {'type': 'mesh', 'name': f'Shock ring {oid[-1]}', 'geo': 'g-vr-shock', 'parent': 'disk', 'material': 'Neon', 'color': col, 'smooth': True, 'pos': [0, 0, 0]},
        visible=[k(0, False, 'step'), k(T['flash_end'], True, 'step'), k(T['flash_end'] + tmax, False, 'step')],
        scale=[k(T['flash_end'], [0.1, 1, 0.1]), k(T['flash_end'] + tmax, [end, 1, end], 'out')], color=[k(T['flash_end'], col), k(T['flash_end'] + tmax, C['black'], 'in')])
geos['g-vr-streak'] = tube([[x, 0, 0] for x in (0, 8, 16, 24, 32)], [0.9, 0.7, 0.5, 0.3, 0.05], sides=6)
for i in range(12):
    yaw = 360 * i / 12 + rng.uniform(-10, 10); pitch = rng.uniform(-35, 35); t0 = T['flash_end'] + rng.random() * 0.15
    add(f'streak{i}', {'type': 'mesh', 'name': f'Spaghetti streak {i + 1}', 'geo': 'g-vr-streak', 'material': 'Neon', 'color': C['white'] if i % 3 == 0 else C['violet'], 'smooth': True,
                       'pos': CEN, 'rot': [0, round(yaw, 1), round(pitch, 1)]},
        scale=[k(t0, [0.05, 1, 1]), k(t0 + 0.5, [2.2, 1, 1], 'out'), k(T['len'], [3.0, 0.3, 0.3], 'out')],
        visible=[k(0, False, 'step'), k(t0, True, 'step')], color=[k(t0, C['white']), k(T['len'], C['deep'], 'in')])
for i in range(30):
    a, el = rng.random() * 6.283, rng.uniform(-0.6, 0.6); sp = 25 + rng.random() * 30; t0 = T['flash_end'] + rng.random() * 0.4
    d = [math.cos(a) * math.cos(el), math.sin(el), math.sin(a) * math.cos(el)]
    add(f'ember{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Ember {i + 1}', 'size': [0.35, 0.35, 0.35], 'material': 'Neon', 'color': C['orange'], 'pos': CEN},
        pos=[k(t0, CEN), k(T['len'], r3([CEN[j] + d[j] * sp for j in range(3)]), 'out')], visible=[k(0, False, 'step'), k(t0, True, 'step')],
        color=[k(t0, C['orange']), k(T['len'], '#40102a')])

# ---------- v3 (owner 2026-11-24 "quality horrible" vs an Interstellar-style reference): the hero is the physics ray-traced
# black hole (VFX Generator black-hole preset, BH_FRAME_PX=512 BH_GRID=4, tinted pink-white), replacing the primitive orb + disk.
if '--hero-bh' in sys.argv:
    for oid in [o for o in list(objs) if o.split('_')[0].rstrip('0123456789') in ('core', 'orb', 'photon', 'doppler', 'band', 'inner', 'lens', 'rock', 'rglow')]:
        objs.pop(oid); tracks.pop(oid, None)
    for g in [g for g in list(geos) if g.split('-')[2].rstrip('0123456789') in ('orb', 'doppler', 'disk', 'lens', 'rock')]: geos.pop(g)
    ORB_TEX.clear(); ORB_TEX['t-vr-bh'] = {'asset': arg('--hero-bh')}
    add('bh', {'type': 'flipbook', 'name': 'Ray-traced black hole', 'parent': 'rift', 'tex': 't-vr-bh', 'grid': 4, 'frames': 16, 'fps': 8, 'loop': True, 'life': 2.0,
               'start': 0, 'dur': T['flash_end'] + 0.1, 'size': 70, 'blend': 'normal', 'pos': [0, 0, 0]})
    sg = random.Random(5)
    for i in range(160):                                  # star field far behind (reference has stars)
        add(f'star{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Star {i + 1}', 'parent': None, 'size': [s_ := round(sg.uniform(0.25, 0.9), 2)] * 3, 'material': 'Neon',
                         'color': sg.choice(['#ffffff', '#ffe8f0', '#e8ecff', '#fff4e0']), 'pos': r3([sg.uniform(-260, 260), sg.uniform(-120, 200), sg.uniform(-320, -180)])})

# ---------- v4 anime house style (owner 2026-11-24: "make it look like the reference but in the other style", "CLEARER GRADIENTS",
# max detail): reference structure (black shadow, lensed arc over the top, disk band in front, bright Doppler side, stars)
# drawn as cel bands. Every gradient = stacked bands with 2-colour `gradient` textures: 8 clear steps white -> navy.
if '--anime' in sys.argv:
    for oid in [o for o in list(objs) if o.split('_')[0].rstrip('0123456789') in ('core', 'orb', 'photon', 'doppler', 'band', 'inner', 'lens')]:
        objs.pop(oid); tracks.pop(oid, None)
    for g in [g for g in list(geos) if g.split('-')[2].rstrip('0123456789') in ('orb', 'doppler', 'disk', 'lens')]: geos.pop(g)
    ORB_TEX.clear()
    STEPS = ['#ffffff', '#ffd0f0', '#ff7ad9', '#e040ff', '#c02cff', '#7a1ee0', '#4a0f8a', '#1a0640']
    for i in range(len(STEPS) - 1):
        ORB_TEX[f't-va-g{i}'] = {'kind': 'procedural', 'pattern': 'gradient', 'colors': [STEPS[i], STEPS[i + 1]], 'count': 1, 'scale': 1}
    add('core', {'type': 'part', 'shape': 'sphere', 'name': 'Shadow', 'parent': 'rift', 'size': [17, 17, 17], 'material': 'SmoothPlastic', 'color': C['black'], 'pos': [0, 0, 0]})
    # photon ring: 4 cel tori facing the camera, hard steps white -> pink -> magenta -> deep violet
    for i, (d, tb, col) in enumerate([(18.4, 0.7, STEPS[0]), (19.8, 0.8, STEPS[2]), (21.4, 0.9, STEPS[4]), (23.2, 1.0, STEPS[6])]):
        add(f'photon{i}', {'type': 'part', 'shape': 'torus', 'name': f'Photon ring {i + 1}', 'parent': 'rift', 'size': [d, tb, d], 'material': 'Neon', 'color': col, 'pos': [0, 0, -0.2 * i], 'rot': [90, 0, 0]},
            scale=[k(0, [1, 1, 1])] + [k(T['open'] + 0.3 * q + 0.07 * i, [1.03 if q % 2 else 0.98] * 3, 'smooth') for q in range(10)])
    # disk: 5 abutting gradient bands r 11 -> 41 (inner band shares the next band's edge, no overlap), inner spins fastest
    for i in range(5):
        geos[f'g-va-disk{i}'] = ring_geo(11 + 6 * (i + 1), 6, 0.5 + 0.35 * i, seg=144, rows=6, seed=120 + i)
        add(f'band{i}', {'type': 'mesh', 'name': f'Disk band {i + 1}', 'geo': f'g-va-disk{i}', 'parent': 'disk', 'material': 'Neon', 'color': '#ffffff', 'texture': f't-va-g{i + 1 if i else 0}', 'smooth': True, 'pos': [0, 0.08 * i, 0]},
            rot=[k(0, [0, 0, 0]), k(T['hit'], [0, (420 - 70 * i) * T['hit'], 0])])
    # anime speed lines riding the disk
    for i in range(16):
        g = random.Random(200 + i); r = g.uniform(13, 39); a0 = g.uniform(0, 6.283); span = g.uniform(0.5, 1.2)
        pts = [[math.cos(a0 + span * q / 12) * r, 0.9 + 0.2 * (i % 3), math.sin(a0 + span * q / 12) * r] for q in range(13)]
        geos[f'g-va-speed{i}'] = tube(pts, [0.06 + 0.16 * math.sin(math.pi * q / 12) for q in range(13)], sides=4, cap=False)
        add(f'speed{i}', {'type': 'mesh', 'name': f'Speed line {i + 1}', 'geo': f'g-va-speed{i}', 'parent': 'disk', 'material': 'Neon', 'color': STEPS[1 + i % 3], 'smooth': True, 'pos': [0, 0, 0]},
            rot=[k(0, [0, 0, 0]), k(T['hit'], [0, (520 - 8 * r) * T['hit'], 0])], visible=[k(0, False, 'step'), k(T['open'] * 0.8, True, 'step'), k(T['flash_end'], False, 'step')])
    # lensed disk image: 5 stacked half-arcs over the top (the far side of the disk bent by gravity) + 3 under it, same steps
    for i in range(8):
        over = i < 5; R = (12.5 + 1.1 * i) if over else (12.2 + 1.0 * (i - 5)); col = STEPS[i if over else (i - 5) * 2 + 1]
        a0, a1 = (0.08, 0.92) if over else (1.12, 1.88)
        pts = [[math.cos(math.pi * (a0 + (a1 - a0) * q / 28)) * R * 1.25, math.sin(math.pi * (a0 + (a1 - a0) * q / 28)) * R, 0.3] for q in range(29)]
        geos[f'g-va-lens{i}'] = tube(pts, [0.25 + (0.55 if over else 0.3) * math.sin(math.pi * q / 28) for q in range(29)], sides=5, cap=False)
        add(f'lens{i}', {'type': 'mesh', 'name': f'Lensed arc {i + 1}', 'geo': f'g-va-lens{i}', 'parent': 'rift', 'material': 'Neon', 'color': col, 'smooth': True, 'pos': [0, 0, -0.6]})
    # Doppler bright side: the approaching (left) side of the disk burns white-pink
    for i, (col, w) in enumerate([(STEPS[0], 0.9), (STEPS[1], 0.6)]):
        pts = [[-math.cos(math.radians(a)) * (12 + 5 * i), 0.6 + 0.3 * i, math.sin(math.radians(a)) * (12 + 5 * i)] for a in range(-55, 56, 5)]
        geos[f'g-va-dop{i}'] = tube(pts, [w * (0.3 + 0.7 * math.sin(math.pi * q / (len(pts) - 1))) for q in range(len(pts))], sides=5, cap=False)
        add(f'doppler{i}', {'type': 'mesh', 'name': f'Doppler side {i + 1}', 'geo': f'g-va-dop{i}', 'parent': 'disk', 'material': 'Neon', 'color': col, 'smooth': True, 'pos': [0, 0, 0]})
    # stars + 12 four-point sparkles
    sg = random.Random(5)
    for i in range(160):
        sz = round(sg.uniform(0.25, 0.9), 2)
        add(f'star{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Star {i + 1}', 'parent': None, 'size': [sz] * 3, 'material': 'Neon',
                         'color': sg.choice(['#ffffff', '#ffe8f6', '#e8e4ff']), 'pos': r3([sg.uniform(-260, 260), sg.uniform(-120, 200), sg.uniform(-320, -180)])})
    for i in range(12):
        p0 = r3([sg.uniform(-150, 150), sg.uniform(-40, 120), sg.uniform(-200, -140)]); L = sg.uniform(3, 6)
        for j, rot in enumerate(([0, 0, 0], [0, 0, 90])):
            add(f'spark{i}_{j}', {'type': 'part', 'shape': 'box', 'name': f'Sparkle {i + 1}.{j + 1}', 'parent': None, 'size': [L, 0.18, 0.18], 'material': 'Neon', 'color': '#ffe0f6', 'pos': p0, 'rot': rot},
                scale=[k(0, [1, 1, 1])] + [k(0.4 + 0.6 * q + 0.1 * i, [0.4 if q % 2 else 1.0, 1, 1], 'smooth') for q in range(10)])

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
project = {'name': 'Void Rift', 'v': 1, 'updated': now, 'objects': objs, 'anims': {'rift': {'name': 'Rift', 'len': T['len'], 'fps': 30, 'loop': True, 'tracks': tracks}},
           'textures': ORB_TEX, 'env': {'bg': '#05040a', 'grid': False, 'fog': {'color': '#05040a', 'near': 120, 'far': 400}, 'light': 'night'},
           'camera': {'pos': [0, 6, 82], 'target': [0, 22, 0], 'fov': 55, 'ortho': False}}
meta = {'name': 'Void Rift', 'updated': now, 'count': len(objs), 'ai': True, 'building': False}
for d in ('live', 'geo'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
dump = lambda o, p: json.dump(o, open(p, 'w'), separators=(',', ':'))
dump(project, f'{OUT}/live/p.json'); dump(meta, f'{OUT}/live/m.json')
for gid, g in geos.items(): dump(g, f'{OUT}/geo/{gid}.json')
print(json.dumps({'objects': len(objs), 'tracks': len(tracks), 'geos': len(geos), 'project_kb': round(os.path.getsize(f'{OUT}/live/p.json') / 1024, 1)}))
