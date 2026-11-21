#!/usr/bin/env python3
"""Shatter: a triangular crystal, a chrome ball shot at it, and on contact the crystal replaced by its own Voronoi pieces flying out.
Studio-native output (Y up, studs): every stage of a live build as project docs, one geo doc per mesh, ready db writes.

  python3 shatter.py OUT [--pieces 100] [--seed 3] [--name Crystal] [--fx crystal-burst.png --fx-asset <id>]

Writes OUT/geo/<id>.json, OUT/live/batchN.json (the live build: one ArtifactData batch per stage), OUT/project.json
(the finished scene), OUT/meta.json, OUT/info.json
(impact point, contact time, triangle counts). numpy only.
Physics: pieces are Voronoi cells of the convex crystal (each cell = the crystal clipped by the bisector planes to its
neighbour seeds: no gaps, no overlaps), seeds denser near the impact so pieces there are small; at contact each piece leaves
with an impulse away from the contact point that falls off with distance, plus the ball's push, under gravity, spinning at a
constant rate (torque-free); the ball keeps 30 % of its speed and drops."""
import json, math, os, sys
import numpy as np

a = sys.argv[1:]
OUT = a[0]
opt = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
N, SEED, NAME = opt('--pieces', 100), opt('--seed', 3), opt('--name', 'Crystal')
FX, FX_ASSET = opt('--fx', ''), opt('--fx-asset', '')
rng = np.random.default_rng(SEED)
os.makedirs(os.path.join(OUT, 'geo'), exist_ok=True)

# ---------------- the crystal: a tall triangular pyramid (owner: a clean triangle from every side) ----------------
def ring(y, r, rot=0.0):
    return [np.array([r * math.cos(math.radians(90 + rot + 120 * k)), y, r * math.sin(math.radians(90 + rot + 120 * k))]) for k in range(3)]
BASE = ring(0.0, 3.6); T = np.array([0.0, 10.0, 0.0])
FACES = [[BASE[0], BASE[1], BASE[2]]] + [[BASE[k], BASE[(k + 1) % 3], T] for k in range(3)]
CEN = np.mean([p for f in FACES for p in f], axis=0)
def orient(f):                                   # counter-clockwise seen from outside (three.js front faces)
    n = np.cross(f[1] - f[0], f[2] - f[0]); return f if n @ (np.mean(f, 0) - CEN) > 0 else f[::-1]
FACES = [orient(f) for f in FACES]
PLANES = [(np.cross(f[1] - f[0], f[2] - f[0]) / np.linalg.norm(np.cross(f[1] - f[0], f[2] - f[0])), f[0]) for f in FACES]
inside = lambda p: all(n @ (p - q) < -0.02 for n, q in PLANES)

# ---------------- Voronoi fracture by plane clipping ----------------
def clip(faces, n, d, eps=1e-7):
    """Keep the part of a convex polyhedron (list of CCW polygons) with n.p <= d; the cut gets a cap polygon."""
    out, cut = [], []
    for f in faces:
        res = []
        for i in range(len(f)):
            p, q = f[i], f[(i + 1) % len(f)]; dp, dq = n @ p - d, n @ q - d
            if dp <= eps: res.append(p)
            if abs(dp) <= eps: cut.append(p)
            if (dp < -eps < eps < dq) or (dq < -eps < eps < dp):
                x = p + (q - p) * (dp / (dp - dq)); res.append(x); cut.append(x)
        if len(res) >= 3: out.append(res)
    uniq = []
    for p in cut:
        if all(np.linalg.norm(p - u) > 1e-5 for u in uniq): uniq.append(p)
    if len(uniq) >= 3:
        c = np.mean(uniq, 0); e1 = uniq[0] - c; e1 /= np.linalg.norm(e1); e2 = np.cross(n, e1)
        uniq.sort(key=lambda p: math.atan2((p - c) @ e2, (p - c) @ e1))   # CCW seen from +n: the cap faces outward
        out.append(uniq)
    return out

BALL_DIR = np.array([1.0, -0.03, 0.02]); BALL_DIR /= np.linalg.norm(BALL_DIR)
def ray_in(o, d):                                # where a ray enters the convex crystal (slab test over its face planes)
    t0 = -1e9
    for n, q in PLANES:
        den = n @ d
        if den < 0: t0 = max(t0, (n @ (q - o)) / den)
    return o + d * t0
IMPACT = ray_in(np.array([-20.0, 3.6, 0.3]), BALL_DIR)   # on the crystal's surface, where the ball arrives
seeds = []
while len(seeds) < N:
    p = np.array([rng.uniform(-3.6, 3.6), rng.uniform(0.05, 9.9), rng.uniform(-3.6, 3.6)])
    if inside(p) and rng.random() < 0.18 + 0.82 * math.exp(-np.linalg.norm(p - IMPACT) / 2.6): seeds.append(p)
seeds = np.array(seeds)
cells = []
for i, s in enumerate(seeds):
    f = [list(x) for x in FACES]
    for j in np.argsort(np.linalg.norm(seeds - s, axis=1))[1:]:       # every other seed: exact tiling, no overlaps
        n = seeds[j] - s; f = clip(f, n, n @ (s + seeds[j]) / 2)
        if not f: break
    if len(f) >= 4: cells.append(f)

def mesh(polys, origin):
    """Fan-triangulate CCW polygons into a studio geo doc, vertices relative to `origin`, every triangle facing outward."""
    V, F = [], []; c = np.mean([p for f in polys for p in f], 0)
    for f in polys:
        base = len(V); V += [p - origin for p in f]
        for k in range(1, len(f) - 1):
            t = [base, base + k, base + k + 1]
            if np.cross(V[t[1]] - V[t[0]], V[t[2]] - V[t[0]]) @ (np.mean([V[x] for x in t], 0) - (c - origin)) < 0: t = [t[0], t[2], t[1]]
            F.append(t)
    return {'verts': [round(float(x), 4) for v in V for x in v], 'faces': F, 'uvs': [0] * (2 * len(V))}

# ---------------- timing and motion ----------------
G, FPS, LEN = -30.0, 30, 4.2
T_LAUNCH, T_HIT = 0.8, 1.45
BALL_R = 0.75
BALL_HIT = IMPACT - BALL_DIR * BALL_R; BALL_START = BALL_HIT - BALL_DIR * 18.0
BALL_V = 18.0 / (T_HIT - T_LAUNCH)
r3 = lambda v: [round(float(x), 3) for x in v]
steps = [round(T_HIT + k * 0.1, 3) for k in range(int((LEN - T_HIT) / 0.1) + 1)] + [LEN]
steps = sorted(set(steps))

crystal_look = dict(color='#7fefff', metalness=0.45, roughness=0.03, transparency=0.12, emissive='#2ad4f0', emissiveIntensity=0.5, smooth=False)   # light cyan, mirror-smooth
objs = {'C0': {'type': 'group', 'name': NAME, 'parent': None, 'pos': [0, 0, 0]}}
geo_ids = []
gid = f'{NAME.lower()}-whole'; json.dump(mesh(FACES, np.zeros(3)), open(os.path.join(OUT, 'geo', gid + '.json'), 'w'), separators=(',', ':')); geo_ids.append(gid)
objs['CW'] = dict(type='mesh', name='Crystal (whole)', geo=gid, parent='C0', pos=[0, 0, 0], glow='#9ff8ff', glowWidth=18, **crystal_look)   # the cyan halo
tracks = {}
ball = dict(type='part', shape='sphere', name='Metal ball', temp=True, parent='C0', pos=r3(BALL_START), size=[2 * BALL_R] * 3, color='#f4f6fa', metalness=1.0, roughness=0.015)   # chrome: a mirror of the room
after = BALL_V * 0.3
bk = [[0, r3(BALL_START)], [T_LAUNCH, r3(BALL_START)], [T_HIT, r3(BALL_HIT)]] + \
     [[t, r3(BALL_HIT + BALL_DIR * after * (t - T_HIT) + np.array([0, 0.5 * G * (t - T_HIT) ** 2, 0]))] for t in steps[1:]]
pieces = {}
tris = 0
for i, c in enumerate(cells):
    cen = np.mean([p for f in c for p in f], 0); gid = f'{NAME.lower()}-p{i:03d}'
    m = mesh(c, cen); tris += len(m['faces'])
    json.dump(m, open(os.path.join(OUT, 'geo', gid + '.json'), 'w'), separators=(',', ':')); geo_ids.append(gid)
    away = cen - IMPACT; dist = np.linalg.norm(away); away /= max(dist, 1e-6)
    v = away * (13.0 * math.exp(-dist / 3.2) + 2.5) * rng.uniform(0.75, 1.3) + BALL_DIR * 5.0 * math.exp(-dist / 2.5) + np.array([0, rng.uniform(1, 4), 0])
    w = rng.normal(0, 1, 3); w = w / np.linalg.norm(w) * rng.uniform(220, 900)                 # deg/s, constant
    pid = f'P{i:03d}'
    pieces[pid] = dict(type='mesh', name=f'Shard {i + 1}', geo=gid, parent='C0', pos=r3(cen), **crystal_look)
    tracks[pid] = {'visible': [[0, False], [T_HIT, True]],
                   'pos': [[t, r3(cen + v * (t - T_HIT) + np.array([0, 0.5 * G * (t - T_HIT) ** 2, 0]))] for t in steps],
                   'rot': [[T_HIT, [0, 0, 0]], [LEN, r3(w * (LEN - T_HIT))]]}
tracks['CW'] = {'visible': [[0, True], [T_HIT, False]]}

def scene(objects=None, anims=None):
    return {'v': 1, 'name': NAME, 'objects': objects or {}, 'anims': anims or {}, 'textures': {},
            'env': {'bg': '#0b0f1a', 'grid': True, 'fog': None, 'light': 'studio'},
            'camera': {'fov': 45, 'ortho': False, 'pos': [8.0, 6.0, 20.0], 'target': [0.3, 4.0, 0.0]}, 'updated': '2026-11-18T00:00:00Z'}
clip = lambda tr: {'shatter': {'name': 'Shatter', 'len': LEN, 'fps': FPS, 'loop': True, 'tracks': tr}}
# live build (owner): straight into the tab, one db batch per stage, never piece by piece and never built elsewhere and imported.
# Batch 1: the empty tab, the crystal, the ball and its flight. Batches 2-4: geo docs + those pieces on the crystal (<= 50 writes
# per batch); the last also starts the shatter motion and the effect. Each batch is a list of ArtifactData writes, IFV = pin.
ids = sorted(pieces); per = 45
P = lambda name: os.path.join(OUT, 'live', name)
os.makedirs(os.path.join(OUT, 'live'), exist_ok=True)
def put(name, data): json.dump(data, open(P(name), 'w'), separators=(',', ':')); return P(name)
def geo_w(g): return {'op': 'set', 'collection': f'projects/<id>/geo', 'doc_id': g, 'file_path': os.path.join(os.path.abspath(OUT), 'geo', g + '.json')}
def proj_w(op, f): return {'op': op, 'collection': 'projects', 'doc_id': '<id>', 'file_path': os.path.abspath(f), 'if_version': 'IFV'}
batches = [[geo_w(f'{NAME.lower()}-whole'),
            proj_w('set', put('1-scene.json', scene({'C0': objs['C0'], 'CW': objs['CW'], 'B0': ball}, clip({'B0': {'pos': bk}, 'CW': tracks['CW']}))))]]
for k in range(0, len(ids), per):
    chunk = ids[k:k + per]; last = k + per >= len(ids)
    data = {'objects': {i: pieces[i] for i in chunk}}
    if last:
        data['anims'] = clip({'B0': {'pos': bk}, **tracks})
        if FX:
            life = 1.4; tid = 'fx-' + os.path.splitext(os.path.basename(FX))[0]
            data['objects']['FX'] = dict(type='flipbook', name='Crystal burst', tex=tid, grid=8, frames=64, life=life, loop=False, fps=round(64 / life, 2),
                                         blend='add', parent='C0', pos=r3(IMPACT + np.array([-0.4, 0, 0])), size=11, start=T_HIT, dur=life)
    batches.append([geo_w(pieces[i]['geo']) for i in chunk] + [proj_w('update', put(f'{len(batches) + 1}-pieces.json', data))])
for n, b in enumerate(batches, 1): json.dump(b, open(P(f'batch{n}.json'), 'w'), indent=0)
live = batches
fx_obj = json.load(open(batches[-1][-1]['file_path']))['objects'].get('FX')
final = scene({**objs, 'B0': ball, **pieces, **({'FX': fx_obj} if fx_obj else {})}, clip({'B0': {'pos': bk}, **tracks}))
json.dump(final, open(os.path.join(OUT, 'project.json'), 'w'), separators=(',', ':'))     # the same scene in one doc, for the shots check
info = {'pieces': len(cells), 'piece_triangles': tris, 'impact': r3(IMPACT), 'contact_s': T_HIT, 'clip_s': LEN, 'geo_docs': len(geo_ids),
        'live_batches': [len(b) for b in batches], 'project_kb': os.path.getsize(os.path.join(OUT, 'project.json')) // 1000}
json.dump(info, open(os.path.join(OUT, 'info.json'), 'w'), indent=1)
print(json.dumps(info))
