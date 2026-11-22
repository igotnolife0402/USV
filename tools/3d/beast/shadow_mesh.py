#!/usr/bin/env python3
"""Shadow monster, high-detail part build: the same layout as shadow_parts.py, but every part is its own custom mesh.
Limbs, horns, fingers, claws, ribs, fangs, veins, wisps and the tail are smooth swept tubes along curved paths (tapers,
muscle bulges, sinew ridges, horn rings, flattened sharp claws); skull, jaw, torso, joints and palms are sculpted blobs
with organic displacement. Skin, horn and claw surfaces carry procedural textures (rock skin, brushed horn). Glow parts
are Neon meshes. Rig + clip from rig.studio_doc (joint groups), so it animates like the other beasts.
Usage: python3 shadow_mesh.py <outdir>  -> <outdir>/project.json, meta.json, geo/<id>.json (one doc per mesh)."""
import json, math, os, sys, time
import numpy as np
import shadow_parts as SP
from rig import studio_doc
from shadow import SEG, ANIM, CAMS

PIV, SID = SP.PIV, SP.SID
GEO, OBJ = {}, {}
rng = np.random.default_rng(3)
TEX = {
    't-skin': {'kind': 'procedural', 'pattern': 'rock', 'colors': ['#251c39', '#120d1d', '#3a2c58'], 'count': 16, 'detail': 0.6, 'seed': 4, 'res': 512, 'scale': 1},
    't-skin2': {'kind': 'procedural', 'pattern': 'rock', 'colors': ['#2f2349', '#17111f', '#46366a'], 'count': 18, 'detail': 0.55, 'seed': 9, 'res': 512, 'scale': 1},
    't-ridge': {'kind': 'procedural', 'pattern': 'rock', 'colors': ['#3d2e5d', '#211833', '#56437e'], 'count': 18, 'detail': 0.5, 'seed': 2, 'res': 512, 'scale': 1},
    't-horn': {'kind': 'procedural', 'pattern': 'brushed', 'colors': ['#1d1827', '#0c0a11', '#3e3456'], 'count': 6, 'detail': 0.8, 'seed': 5, 'res': 512, 'scale': 1},
    't-dark': {'kind': 'procedural', 'pattern': 'rock', 'colors': ['#110c1a', '#07050b', '#22193a'], 'count': 14, 'detail': 0.55, 'seed': 11, 'res': 512, 'scale': 1},
    't-teeth': {'kind': 'procedural', 'pattern': 'brushed', 'colors': ['#d8cfe8', '#a89cc0', '#f1ebfa'], 'count': 5, 'detail': 0.5, 'seed': 12, 'res': 512, 'scale': 1},
    't-smoke': {'kind': 'procedural', 'pattern': 'fabric', 'colors': ['#2a2040', '#1a1428', '#45356a'], 'count': 10, 'detail': 0.4, 'seed': 13, 'res': 512, 'scale': 1},
    't-claw': {'kind': 'procedural', 'pattern': 'brushed', 'colors': ['#0f0c15', '#050407', '#2a2338'], 'count': 8, 'detail': 0.8, 'seed': 6, 'res': 512, 'scale': 1},
}
SURF = {SP.BODY: ('t-skin', 0.55), SP.BODY2: ('t-skin2', 0.5), SP.RIDGE: ('t-ridge', 0.45), SP.HORN: ('t-horn', 0.35), SP.HORN2: ('t-horn', 0.3), SP.CLAW: ('t-claw', 0.25), SP.DARK: ('t-dark', 0.6), SP.TEETH: ('t-teeth', 0.3), SP.SMOKE: ('t-smoke', 0.8), SP.SMOKE2: ('t-smoke', 0.8)}
GLOW = {SP.EYE, SP.CORE, SP.VEIN, SP.MOUTH, SP.WISP}

def emit(seg, V, F, UV, col, tr=0.0):
    V = np.asarray(V, float) - PIV[seg]; gid = f'sm{len(GEO):x}'
    GEO[gid] = {'verts': [round(float(x), 3) for x in V.reshape(-1)], 'faces': [list(map(int, f)) for f in F], 'uvs': [round(float(x), 3) for x in np.asarray(UV, float).reshape(-1)]}
    o = {'type': 'mesh', 'geo': gid, 'parent': SID[seg], 'pos': [0, 0, 0], 'smooth': True}
    if col in GLOW: o.update(color=col, material='Neon')
    elif col in SURF: t, r = SURF[col]; o.update(color='#ffffff', texture=t, rough=r)
    else: o.update(color=col, rough=0.5)
    if tr: o['transparency'] = tr
    OBJ[f'm{len(OBJ):x}'] = o

# ---------------------------------------------------------------- sweeps
def spline(pts, n):
    P = [np.asarray(p, float) for p in pts]
    if len(P) == 2: return np.array([P[0] + (P[1] - P[0]) * t for t in np.linspace(0, 1, n)])
    P = [2 * P[0] - P[1]] + P + [2 * P[-1] - P[-2]]; seg = len(P) - 3; out = []
    for t in np.linspace(0, seg, n):
        i = min(int(t), seg - 1); u = t - i; p0, p1, p2, p3 = P[i:i + 4]
        out.append(0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return np.array(out)

def frames(C):
    T = np.gradient(C, axis=0); T /= np.linalg.norm(T, axis=1)[:, None]
    a = np.array((0.0, 0.0, 1.0)) if abs(T[0, 2]) < 0.9 else np.array((1.0, 0.0, 0.0))
    N = [np.cross(T[0], a)]; N[0] /= np.linalg.norm(N[0])
    for i in range(1, len(T)):
        n = N[-1] - T[i] * (N[-1] @ T[i]); N.append(n / max(np.linalg.norm(n), 1e-9))
    N = np.array(N); return T, N, np.cross(T, N)

def tube(pts, rfun, sides=14, per=7, tip=False, flat=1.0, ridge=None, cap=True):
    """Swept tube along a Catmull-Rom path; rfun(t) radius, ridge(theta, t) relative bump; tip ends in a point."""
    L = sum(np.linalg.norm(np.subtract(b, a)) for a, b in zip(pts, pts[1:])); n = max(5, int(L * per) + 2)
    C = spline(pts, n); T, N, B = frames(C); V, UV, F = [], [], []
    th = np.linspace(0, 2 * np.pi, sides, endpoint=False); rs = []
    for i, t in enumerate(np.linspace(0, 1, n)):
        r = rfun(t) * (max(0.0, 1 - t) ** 0.8 if tip else 1)
        rs.append(r)
        for j, a in enumerate(th):
            rr = r * (1 + (ridge(a, t) if ridge else 0))
            V.append(C[i] + (N[i] * math.cos(a) * flat + B[i] * math.sin(a)) * rr); UV.append((j / sides, t * L / 2.5))
    for i in range(n - 1):
        for j in range(sides):
            a, b = i * sides + j, i * sides + (j + 1) % sides
            F.append([a, b, b + sides, a + sides])
    if cap:                                                          # domed ends
        for end, (ci, d) in enumerate(((0, -T[0]), (n - 1, T[-1]))):
            if tip and end == 1: V.append(C[-1]); UV.append((0.5, L / 2.5)); k = len(V) - 1; F += [[(n - 1) * sides + j, (n - 1) * sides + (j + 1) % sides, k][::1] for j in range(sides)]; continue
            k = len(V); V.append(C[ci] + d * rs[ci] * 0.8); UV.append((0.5, 0))
            base = ci * sides
            F += [[base + (j + 1) % sides, base + j, k] if end == 0 else [base + j, base + (j + 1) % sides, k] for j in range(sides)]
    return np.array(V), F, UV

def blob(c, r, R=None, amp=0.035, waves=6, lat=18, lon=28):
    """Sculpted ellipsoid: organic displacement from a few random waves."""
    R = np.eye(3) if R is None else R; ks = rng.normal(size=(waves, 3)) * 2.2; ph = rng.uniform(0, 6.28, waves)
    V, UV, F = [], [], []
    for i in range(lat + 1):
        v = i / lat; phi = math.pi * v
        for j in range(lon + 1):
            u = j / lon; th = 2 * math.pi * u
            d = np.array((math.sin(phi) * math.cos(th), math.cos(phi), math.sin(phi) * math.sin(th)))
            disp = 1 + amp * float(np.sin(ks @ d + ph).sum()) / math.sqrt(waves)
            V.append(np.asarray(c, float) + R @ (d * np.asarray(r, float) * disp)); UV.append((u * 2, v))
    for i in range(lat):
        for j in range(lon):
            a = i * (lon + 1) + j; b = a + lon + 1
            F.append([a, a + 1, b + 1, b])
    return np.array(V), F, UV

# ---------------------------------------------------------------- the primitives shadow_parts.build() calls, as meshes
def m_ell(seg, c, r, col, R=None, mat=None, tr=0.0):
    small = max(r) < 0.3
    V, F, UV = blob(c, r, R, amp=0.0 if col in GLOW or small else 0.04, lat=10 if small else 18, lon=14 if small else 28)
    emit(seg, V, F, UV, col, tr)

def sinew(a, t): return 0.05 * math.cos(5 * a + 2 * t) + 0.025 * math.cos(11 * a)
def bulge(r0, r1): return lambda t: (r0 + (r1 - r0) * t) * (1 + 0.12 * math.sin(math.pi * t))

def m_cap(seg, a, b, r, col, mat=None, tr=0.0):
    glow = col in GLOW
    V, F, UV = tube([a, b], bulge(r, r * 0.92) if not glow else (lambda t: r), sides=8 if r < 0.12 else 14,
                    ridge=None if glow or r < 0.25 else sinew)
    emit(seg, V, F, UV, col, tr)

def m_cyl(seg, a, b, r, col, mat=None, tr=0.0):              # bands: a raised ridged ring
    V, F, UV = tube([a, b], lambda t: r * (1 + 0.06 * math.sin(math.pi * t)), sides=18, per=20, ridge=lambda a_, t: 0.04 * math.cos(9 * a_))
    emit(seg, V, F, UV, col, tr)

def m_cone(seg, base, tip, r, col, mat=None, tr=0.0):        # spikes and fangs: a slight hook, ring ridges on horn
    base, tip = np.asarray(base, float), np.asarray(tip, float); d = tip - base; L = np.linalg.norm(d)
    side = np.cross(d, (0.13, 0.97, 0.2)); side = side / max(np.linalg.norm(side), 1e-9)
    mid = base + d * 0.55 + side * L * 0.06
    ridge = (lambda a_, t: 0.07 * max(0.0, math.cos(t * 26))) if col in (SP.HORN, SP.HORN2) and L > 0.5 else None
    V, F, UV = tube([base, mid, tip], lambda t: r, sides=10 if r < 0.15 else 14, tip=True, ridge=ridge)
    emit(seg, V, F, UV, col, tr)

def m_chain(seg, pts, r0, r1, col, tip=None, tipcol=None, mat=None, tr=0.0):
    pts = [np.asarray(p, float) for p in pts]
    horn = col in (SP.HORN, SP.HORN2); claw = col == SP.CLAW; smoke = col in (SP.SMOKE, SP.SMOKE2)
    if horn: ridge = lambda a_, t: 0.08 * max(0.0, math.cos(t * 30)) + 0.03 * math.cos(3 * a_)
    elif smoke: ridge = lambda a_, t: 0.12 * math.sin(3 * a_ + t * 9)
    elif claw: ridge = None
    else: ridge = sinew
    rf = (lambda t: r0 + (r1 - r0) * t) if (horn or claw or smoke) else (lambda t: (r0 + (r1 - r0) * t) * (1 + 0.1 * math.sin(math.pi * t * 2) ** 2))
    if tip and tipcol and tipcol != col:                           # coloured tip (glowing wisp end, pale horn tip) as its own piece
        V, F, UV = tube(pts[:-1], rf, sides=12, ridge=ridge, flat=0.75 if claw else 1.0)
        emit(seg, V, F, UV, col, tr)
        V, F, UV = tube([pts[-2], pts[-1]], lambda t: r1 * 1.02, sides=12, tip=True, ridge=ridge if horn else None)
        emit(seg, V, F, UV, tipcol, tr if tipcol not in GLOW else 0.2)
    else:
        V, F, UV = tube(pts, rf, sides=12, tip=bool(tip), ridge=ridge, flat=0.7 if claw else 1.0)
        emit(seg, V, F, UV, col, tr)

SP.ell, SP.cap, SP.cyl, SP.cone, SP.chain = m_ell, m_cap, m_cyl, m_cone, m_chain

if __name__ == '__main__':
    out = (sys.argv[1:] or ['out'])[0]; pid = sys.argv[2] if len(sys.argv) > 2 else 'shadowmonster'
    os.makedirs(os.path.join(out, 'geo'), exist_ok=True)
    SP.build()
    doc = studio_doc('ShadowMonster', SEG, [None], 1.0, (0, 0, 0, 0, 0, 0), 1, [], ANIM, {}, CAMS[0])
    doc['objects'].update(OBJ); doc['textures'] = TEX
    doc['updated'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    # pack small meshes: one geo doc per mesh, written in batches of <= 900 KB / 45 docs
    sizes = {}
    for gid, g in GEO.items():
        t = json.dumps(g, separators=(',', ':')); sizes[gid] = len(t)
        open(os.path.join(out, 'geo', gid + '.json'), 'w').write(t)
    batches, cur, size = [], [], 0
    for gid, s in sizes.items():
        if cur and (size + s > 900_000 or len(cur) >= 45): batches.append(cur); cur, size = [], 0
        cur.append(gid); size += s
    batches.append(cur)
    txt = json.dumps(doc, separators=(',', ':')); open(os.path.join(out, 'project.json'), 'w').write(txt)
    json.dump({'name': 'ShadowMonster', 'updated': doc['updated'], 'count': len(doc['objects']), 'ai': True}, open(os.path.join(out, 'meta.json'), 'w'))
    json.dump(batches, open(os.path.join(out, 'batches.json'), 'w'))
    tris = sum(sum(len(f) - 2 for f in g['faces']) for g in GEO.values())
    print(f'{len(OBJ)} meshes, {tris} tris, geo {sum(sizes.values()) // 1000} KB (max doc {max(sizes.values()) // 1000} KB), {len(batches)} batches, project {len(txt) // 1000} KB')
