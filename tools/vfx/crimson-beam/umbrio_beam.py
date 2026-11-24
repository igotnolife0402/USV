"""Crimson cataclysm beam as an Umbrio Sandbox scene (owner 2026-11-24: every VFX/animation build lives in Umbrio).
Writes hub db docs: OUT/live/p.json (projects/<id>), OUT/live/m.json (meta/<id>), OUT/geo/<gid>.json.
Usage: python tools/vfx/crimson-beam/umbrio_beam.py OUT [--id crimson-beam-1]
Umbrio has no animated camera, so shake + push-in animate the root group "World" (camera stays still)."""
import json, math, os, random, sys, datetime

OUT = sys.argv[1] if len(sys.argv) > 1 else '.worktrees/beam'
PID = sys.argv[sys.argv.index('--id') + 1] if '--id' in sys.argv else 'crimson-beam-1'
rng = random.Random(7)
T = dict(pilot=1.2, impact=1.5, collapse=4.5, gone=5.5, len=7.0)
R_BEAM = 12.0
C = dict(core='#fff2f2', inner='#ff2a3c', mid='#c4001a', outer='#5a0008', hot='#ff3300', cold='#300000', black='#000000')
objs, tracks, geos = {}, {}, {}


def k(t, v, e='linear'):
    return [round(t, 3), v, e]


def add(oid, o, **tr):
    o.setdefault('parent', 'world')
    objs[oid] = o
    if tr:
        tracks[oid] = tr


def r3(v):
    return [round(x, 3) for x in v]


# ---------- meshes ----------
def ground_geo():
    radii = [0, 2, 4, 6, 8, 10, 13, 16, 18, 20, 22, 25, 29, 34, 40, 48, 58, 70, 85, 100, 120]
    seg = 72
    verts, uvs, faces = [], [], []
    for r in radii:
        for j in range(seg):
            a = 2 * math.pi * j / seg
            x, z = math.cos(a) * r, math.sin(a) * r
            y = -3.2 * math.exp(-r * r / (2 * 11 ** 2)) + 1.4 * math.exp(-((r - 21) / 4.5) ** 2)
            y += (rng.random() - 0.5) * 0.35 * min(1, r / 10)
            verts += r3([x, y, z]); uvs += [round(x / 6, 3), round(z / 6, 3)]
    for i in range(len(radii) - 1):
        for j in range(seg):
            a, b = i * seg + j, i * seg + (j + 1) % seg
            c, d = (i + 1) * seg + (j + 1) % seg, (i + 1) * seg + j
            faces.append([a, d, c, b])
    return {'verts': verts, 'faces': faces, 'uvs': uvs}


def rock_geo(seed):
    g = random.Random(seed)
    lat, lon = 6, 9
    verts, uvs, faces = [], [], []
    rad = [[0.75 + g.random() * 0.45 for _ in range(lon)] for _ in range(lat + 1)]
    for i in range(lat + 1):
        th = math.pi * i / lat
        for j in range(lon):
            ph = 2 * math.pi * j / lon
            rr = rad[i][j] if 0 < i < lat else 0.85
            verts += r3([math.sin(th) * math.cos(ph) * rr, math.cos(th) * rr * 0.7, math.sin(th) * math.sin(ph) * rr])
            uvs += [round(j / lon, 3), round(i / lat, 3)]
    for i in range(lat):
        for j in range(lon):
            a, b = i * lon + j, i * lon + (j + 1) % lon
            faces.append([a, (i + 1) * lon + j, (i + 1) * lon + (j + 1) % lon, b])
    return {'verts': verts, 'faces': faces, 'uvs': uvs}


geos['g-cb-ground'] = ground_geo()
for s in range(4):
    geos[f'g-cb-rock{s}'] = rock_geo(100 + s)

textures = {
    't-cb-ground': {'kind': 'procedural', 'pattern': 'rock', 'colors': ['#140806', '#2e1812'], 'scale': 3, 'seed': 3},
    't-cb-rock': {'kind': 'procedural', 'pattern': 'rock', 'colors': ['#2a1812', '#5a3a30'], 'scale': 1.2, 'seed': 9},
}

# ---------- root: shake + push-in ----------
shake = []
t = 0.0
while t <= T['len'] + 1e-6:
    if t < T['pilot']:
        A = 0.08 * t / T['pilot']
    elif t < T['impact']:
        A = 0.18
    else:
        A = 1.6 * math.exp(-(t - T['impact']) * 2.5) + (0.3 if t < T['collapse'] else 0.04)
        if t > T['gone'] - 0.1:
            A += 0.7 * math.exp(-max(0, t - (T['gone'] - 0.1)) * 3)
    push = 0 if t < T['pilot'] else 22 * (0.5 - 0.5 * math.cos(math.pi * min(1, (t - T['pilot']) / (T['collapse'] - T['pilot']))))
    shake.append(k(t, r3([A * (rng.random() * 2 - 1), A * (rng.random() * 2 - 1) * 0.7, push]), 'smooth'))
    t += 0.05
add('world', {'type': 'group', 'name': 'World', 'parent': None, 'pos': [0, 0, 0]}, pos=shake)

# ---------- ground ----------
add('ground', {'type': 'mesh', 'name': 'Scorched ground', 'geo': 'g-cb-ground', 'color': '#5a4038', 'material': 'Slate',
               'texture': 't-cb-ground', 'smooth': True, 'pos': [0, 0, 0]})
add('crater', {'type': 'part', 'shape': 'sphere', 'name': 'Crater glow', 'size': [24, 1.2, 24], 'pos': [0, -2.6, 0], 'material': 'Neon', 'color': C['black']},
    color=[k(0, C['black']), k(T['impact'], C['black'], 'step'), k(T['impact'] + 0.1, C['hot']), k(T['gone'], C['hot']), k(T['len'], C['cold'], 'out')])

# rune circle: two rings + 24 glyph bars, glow in during anticipation, burn off after impact
rune_col = [k(0, C['black']), k(1.0, C['inner'], 'in'), k(T['impact'], '#ff8090'), k(T['impact'] + 0.5, C['black'], 'out')]
add('rune1', {'type': 'part', 'shape': 'torus', 'name': 'Rune ring inner', 'size': [40, 0.5, 40], 'pos': [0, 0.35, 0], 'material': 'Neon', 'color': C['black']}, color=rune_col)
add('rune2', {'type': 'part', 'shape': 'torus', 'name': 'Rune ring outer', 'size': [54, 0.35, 54], 'pos': [0, 0.35, 0], 'material': 'Neon', 'color': C['black']}, color=rune_col)
for i in range(24):
    a = 360 * i / 24
    rr = 23.5
    add(f'glyph{i}', {'type': 'part', 'shape': 'box', 'name': f'Rune glyph {i + 1}', 'size': [0.35, 0.12, 2.2 if i % 3 else 3.2],
                      'pos': r3([math.cos(math.radians(a)) * rr, 0.4, math.sin(math.radians(a)) * rr]), 'rot': [0, round(-a, 2), 0],
                      'material': 'Neon', 'color': C['black']}, color=rune_col)

# ---------- sky vortex (rotating crimson cloud rings) ----------
for i, (d, y, c, sp) in enumerate([(60, 78, C['mid'], 40), (120, 88, C['outer'], -28), (190, 98, '#3a0006', 18), (270, 110, '#2a0006', -12)]):
    vcol = [k(0, '#000000'), k(T['pilot'], c, 'in'), k(T['gone'], c), k(T['len'], '#100002', 'out')]
    add(f'vortex{i}', {'type': 'part', 'shape': 'torus', 'name': f'Vortex ring {i + 1}', 'size': [d, d * 0.18, d], 'pos': [0, y, 0],
                       'material': 'ForceField', 'color': '#000000'},
        rot=[k(0, [0, 0, 0]), k(T['len'], [0, sp * T['len'], 0])], color=vcol)

# ---------- beam ----------
H = 420
add('pilot', {'type': 'part', 'shape': 'cylinder', 'name': 'Pilot beam', 'size': [0.6, H, 0.6], 'pos': [0, H / 2 + H, 0], 'material': 'Neon', 'color': C['core']},
    visible=[k(0, False, 'step'), k(T['pilot'], True, 'step'), k(T['impact'] + 0.05, False, 'step')],
    pos=[k(0, [0, H * 1.5, 0]), k(T['pilot'], [0, H * 1.5, 0]), k(T['impact'], [0, H / 2, 0])])
for oid, name, dia, mat, col, tr in [('core', 'Beam core', 9, 'Neon', C['core'], 0), ('inner', 'Beam inner', R_BEAM * 2, 'Neon', C['inner'], 0.45),
                                  ('mid', 'Beam mid', R_BEAM * 2.8, 'ForceField', C['mid'], 0.75), ('outer', 'Beam haze', R_BEAM * 4, 'ForceField', C['outer'], 0.88)]:
    thin = 0.6 / dia
    add(oid, {'type': 'part', 'shape': 'cylinder', 'name': name, 'size': [dia, H, dia], 'pos': [0, H / 2, 0], 'material': mat, 'color': col, 'transparency': tr},
        visible=[k(0, False, 'step'), k(T['impact'], True, 'step'), k(T['gone'], False, 'step')],
        scale=[k(T['impact'], [thin, 1, thin]), k(T['impact'] + 0.15, [1.08, 1, 1.08], 'out'), k(T['impact'] + 0.4, [1, 1, 1], 'smooth'),
               k(3.0, [1.04, 1, 1.04], 'smooth'), k(T['collapse'], [1, 1, 1], 'smooth'), k(T['gone'], [0.01, 1, 0.01], 'in')])

# energy rings sliding down the beam, 6 staggered loops over the sustain
for i in range(6):
    keys, vis = [], [k(0, False, 'step')]
    t0 = T['impact'] + 0.1 + i * 0.25
    y0 = 300
    t = t0
    while t < T['collapse']:
        keys += [k(t, [0, y0, 0], 'step'), k(min(t + 1.5, T['collapse']), [0, y0 - 300 * min(1.5, T['collapse'] - t) / 1.5, 0])]
        t += 1.5
    vis += [k(t0, True, 'step'), k(T['collapse'], False, 'step')]
    add(f'ring{i}', {'type': 'part', 'shape': 'torus', 'name': f'Energy ring {i + 1}', 'size': [R_BEAM * 3.2, 0.5, R_BEAM * 3.2], 'pos': [0, y0, 0],
                     'material': 'Neon', 'color': C['inner']}, pos=keys, visible=vis)

# ---------- impact: shockwaves, flash disc, lights ----------
for oid, name, tmax, end, col in [('shock1', 'Shockwave fast', 1.2, 240, '#ff8090'), ('shock2', 'Shockwave dust', 2.5, 160, C['mid'])]:
    add(oid, {'type': 'part', 'shape': 'torus', 'name': name, 'size': [end, 1.2, end], 'pos': [0, 0.6, 0], 'material': 'Neon', 'color': col},
        visible=[k(0, False, 'step'), k(T['impact'], True, 'step'), k(T['impact'] + tmax, False, 'step')],
        scale=[k(T['impact'], [0.04, 1, 0.04]), k(T['impact'] + tmax, [1, 1, 1], 'out')],
        color=[k(T['impact'], col), k(T['impact'] + tmax, C['black'], 'in')])
add('flash', {'type': 'part', 'shape': 'sphere', 'name': 'Impact flash', 'size': [30, 30, 30], 'pos': [0, 4, 0], 'material': 'Neon', 'color': C['core']},
    visible=[k(0, False, 'step'), k(T['impact'], True, 'step'), k(T['impact'] + 0.18, False, 'step')],
    scale=[k(T['impact'], [0.2, 0.2, 0.2]), k(T['impact'] + 0.18, [2.2, 0.8, 2.2], 'out')])
for i, (p, rng_) in enumerate([([0, 8, 0], 120), ([0, 40, 0], 160), ([0, 3, 30], 60)]):
    add(f'light{i}', {'type': 'light', 'kind': 'point', 'name': f'Beam light {i + 1}', 'pos': p, 'color': C['black'], 'intensity': 30, 'range': rng_},
        color=[k(0, C['black']), k(T['pilot'], '#400008'), k(T['impact'], C['inner'], 'out'), k(T['gone'], C['inner']), k(T['len'], '#200004', 'out')])

# ---------- debris (ballistic, keys every 0.1 s, lands and stays) ----------
G = -40.0
for i in range(40):
    a = rng.random() * 2 * math.pi
    r0, out, up = 9 + rng.random() * 8, 18 + rng.random() * 45, 20 + rng.random() * 45
    t0 = T['impact'] + rng.random() * (0.25 if i < 28 else 2.5)
    s = 0.5 + rng.random() ** 2 * 2.6
    tl = 2 * up / -G
    pos, rot = [k(0, r3([math.cos(a) * r0, -2, math.sin(a) * r0]), 'step')], []
    spin = [rng.uniform(-400, 400) for _ in range(3)]
    tt = 0.0
    while tt <= tl + 0.1:
        ta = min(tt, tl)
        rr = r0 + out * ta
        pos.append(k(t0 + tt, r3([math.cos(a) * rr, max(0, up * ta + 0.5 * G * ta * ta) + s * 0.35, math.sin(a) * rr])))
        rot.append(k(t0 + tt, r3([v * ta for v in spin])))
        tt += 0.1
    add(f'rock{i}', {'type': 'mesh', 'name': f'Debris {i + 1}', 'geo': f'g-cb-rock{i % 4}', 'color': '#ffffff', 'material': 'Slate',
                     'texture': 't-cb-rock', 'smooth': False, 'size': [s * 1.3, s, s * 1.1], 'pos': pos[0][1]},
        pos=pos, rot=rot, visible=[k(0, False, 'step'), k(t0, True, 'step')])

# ---------- sparks + embers (small Neon spheres) ----------
for i in range(36):
    a = rng.random() * 2 * math.pi
    t0 = T['impact'] + rng.random() * 2.8
    out, up, life = 30 + rng.random() * 60, 25 + rng.random() * 50, 0.8 + rng.random() * 0.8
    keys = []
    for j in range(9):
        ta = life * j / 8
        rr = 11 + out * ta
        keys.append(k(t0 + ta, r3([math.cos(a) * rr, max(0.2, up * ta + 0.5 * G * ta * ta), math.sin(a) * rr])))
    add(f'spark{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Spark {i + 1}', 'size': [0.45, 0.45, 0.45], 'pos': keys[0][1], 'material': 'Neon', 'color': '#ffd0c0'},
        pos=keys, visible=[k(0, False, 'step'), k(t0, True, 'step'), k(t0 + life, False, 'step')],
        color=[k(t0, '#ffd0c0'), k(t0 + life, C['inner'])])
for i in range(24):
    a, r = rng.random() * 2 * math.pi, rng.random() * 25
    t0 = T['collapse'] - 0.2 + rng.random() * 2.0
    x, z = math.cos(a) * r, math.sin(a) * r
    add(f'ember{i}', {'type': 'part', 'shape': 'sphere', 'name': f'Ember {i + 1}', 'size': [0.3, 0.3, 0.3], 'pos': r3([x, 0.5, z]), 'material': 'Neon', 'color': '#ffb070'},
        pos=[k(t0, r3([x, 0.5, z])), k(T['len'], r3([x + rng.uniform(-3, 3), 8 + rng.random() * 14, z + rng.uniform(-3, 3)]), 'out')],
        visible=[k(0, False, 'step'), k(t0, True, 'step')], color=[k(t0, '#ffb070'), k(T['len'], C['mid'])])

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
project = {'name': 'Crimson Beam', 'v': 1, 'updated': now, 'objects': objs,
           'anims': {'strike': {'name': 'Strike', 'len': T['len'], 'fps': 30, 'loop': True, 'tracks': tracks}},
           'textures': textures, 'env': {'bg': '#0a0003', 'grid': False, 'fog': {'color': '#0a0003', 'near': 120, 'far': 520}, 'light': 'night'},
           'camera': {'pos': [0, 7, 78], 'target': [0, 24, 0], 'fov': 55, 'ortho': False}}
meta = {'name': 'Crimson Beam', 'updated': now, 'count': len(objs), 'ai': True, 'building': False}
os.makedirs(f'{OUT}/live', exist_ok=True); os.makedirs(f'{OUT}/geo', exist_ok=True)
json.dump(project, open(f'{OUT}/live/p.json', 'w'), separators=(',', ':'))
json.dump(meta, open(f'{OUT}/live/m.json', 'w'), separators=(',', ':'))
for gid, g in geos.items():
    json.dump(g, open(f'{OUT}/geo/{gid}.json', 'w'), separators=(',', ':'))
sizes = {f: os.path.getsize(f'{OUT}/{f}') for f in ['live/p.json'] + [f'geo/{g}.json' for g in geos]}
print(json.dumps({'id': PID, 'objects': len(objs), 'tracks': len(tracks), 'kb': {f: round(s / 1024, 1) for f, s in sizes.items()}}))
assert max(sizes.values()) < 225 * 1024, 'doc over 225 KB'
