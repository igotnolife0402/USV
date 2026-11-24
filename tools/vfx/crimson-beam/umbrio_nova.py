"""Cyan Nova: Umbrio animation + VFX built on domains/vfx/anime-vfx-reference.md (owner 2026-11-24 "using what you learned").
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
    A = 0.05 if t < T['hit'] else 1.4 * math.exp(-(t - T['hit']) * 2.2) + (0.25 if t < T['collapse'] else 0.03)
    dolly = 0 if t < T['gone'] else -26 * (0.5 - 0.5 * math.cos(math.pi * min(1, (t - T['gone']) / (T['len'] - T['gone']))))
    push = 6 * min(1, t / T['dip'])                                       # slow push-in during the charge
    pos.append(k(t, r3([A * (rng.random() * 2 - 1), A * (rng.random() * 2 - 1) * 0.7, push + dolly]), 'smooth')); t += 0.05
add('world', {'type': 'group', 'name': 'World', 'parent': None, 'pos': [0, 0, 0], 'rot': [0, 0, 8]}, pos=pos)

blink = lambda base: [k(0, base, 'step'), k(T['hit'], C['black'], 'step'), k(T['flash_end'], base, 'step')]   # impact frame: solids go black
add('ground', {'type': 'mesh', 'name': 'Dark plain', 'geo': 'g-nv-ground', 'material': 'Slate', 'color': '#6a6e7a', 'texture': 't-nv-ground', 'smooth': True, 'pos': [0, 0, 0]},
    color=blink('#6a6e7a'))
add('rune', {'type': 'mesh', 'name': 'Rune ring', 'geo': 'g-nv-rune', 'material': 'Neon', 'color': C['black'], 'smooth': True, 'pos': [0, 0.15, 0]},
    color=[k(0, C['black']), k(2.0, C['edge'], 'in'), k(T['dip'], C['body']), k(T['hit'], C['black'], 'step'), k(T['flash_end'], C['body'], 'step'), k(T['gone'], C['navy'], 'out')])

# crystal monolith rises under the sphere, with orbiting shards
add('crystal_g', {'type': 'group', 'name': 'Crystal', 'pos': [0, 9, 0]}, pos=[k(0, [0, 9, 0]), k(T['dip'], [0, 11, 0], 'smooth'), k(T['len'], [0, 10.5, 0], 'smooth')],
    rot=[k(0, [0, 0, 0]), k(T['len'], [0, 90, 0])])
add('crystal', {'type': 'mesh', 'name': 'Obsidian monolith', 'geo': 'g-nv-crystal', 'parent': 'crystal_g', 'material': 'Marble', 'color': '#3a4256', 'texture': 't-nv-obsidian', 'smooth': False, 'pos': [0, 0, 0]},
    color=blink('#3a4256'))
for i in range(8):
    a = 360 * i / 8; rr = 3.2 + (i % 2) * 0.8
    add(f'shard{i}', {'type': 'mesh', 'name': f'Orbit shard {i + 1}', 'geo': f'g-nv-shard{i % 3}', 'parent': 'crystal_g', 'material': 'Marble', 'color': '#3a4256', 'texture': 't-nv-obsidian', 'smooth': False,
                      'pos': r3([math.cos(math.radians(a)) * rr, (i % 3 - 1) * 1.2, math.sin(math.radians(a)) * rr]), 'rot': [rng.uniform(-30, 30), a, rng.uniform(-20, 20)]},
        color=blink('#3a4256'))

# ---------- sphere: plasma charge card inside a growing group + translucent glow shell ----------
add('sphere_g', {'type': 'group', 'name': 'Nova sphere', 'pos': SPH},
    scale=[k(0, [0.1, 0.1, 0.1]), k(T['dip'], [1, 1, 1], 'in'), k(2.6, [0.85, 0.85, 0.85], 'smooth'), k(2.7, [0.95, 0.95, 0.95], 'smooth'), k(T['hit'], [0.8, 0.8, 0.8], 'smooth'),
           k(3.0, [1.15, 1.15, 1.15], 'out'), k(T['collapse'], [1.05, 1.05, 1.05], 'smooth'), k(T['gone'], [0.02, 0.02, 0.02], 'in')])
add('fb_sphere', {'type': 'flipbook', 'name': 'Plasma sphere', 'parent': 'sphere_g', 'tex': 't-nv-charge', 'grid': 8, 'frames': 64, 'fps': 24, 'loop': True, 'life': 2.667,
                  'start': 0, 'dur': T['gone'], 'size': 34, 'blend': 'add', 'pos': [0, 0, 0]})
add('shell', {'type': 'part', 'shape': 'sphere', 'name': 'Glow shell', 'parent': 'sphere_g', 'size': [24, 24, 24], 'pos': [0, 0, 0], 'material': 'ForceField', 'color': C['edge'], 'transparency': 0.7},
    visible=[k(0, True, 'step'), k(T['gone'], False, 'step')])
add('core', {'type': 'part', 'shape': 'sphere', 'name': 'Hot core', 'parent': 'sphere_g', 'size': [7, 7, 7], 'pos': [0, 0, 0], 'material': 'ForceField', 'color': C['core'], 'transparency': 0.3},
    visible=[k(0, True, 'step'), k(T['gone'], False, 'step')])
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
                     'start': t0, 'dur': T['collapse'] - t0, 'size': 4.5 + rng.random() * 2, 'blend': 'add', 'shape': 'beam', 'length': round(L, 2), 'speed': round(L / 0.12, 1),
                     'pos': SPH, 'rot': [0, round(ry, 2), round(rz, 2)]})
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

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
project = {'name': 'Cyan Nova', 'v': 1, 'updated': now, 'objects': objs, 'anims': {'nova': {'name': 'Nova', 'len': T['len'], 'fps': 30, 'loop': True, 'tracks': tracks}},
           'textures': textures, 'env': {'bg': '#07080c', 'grid': False, 'fog': {'color': '#07080c', 'near': 110, 'far': 420}, 'light': 'night'},
           'camera': {'pos': [0, 6, 82], 'target': [0, 22, 0], 'fov': 55, 'ortho': False}}
meta = {'name': 'Cyan Nova', 'updated': now, 'count': len(objs), 'ai': True, 'building': False}
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
