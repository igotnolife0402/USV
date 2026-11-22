"""Low-poly convex solids for blocky armor: boxes, chamfered plates, shield scale tiles, frustums, stepped horns, pyramid spikes,
triangular fins, merged into one flat-shaded mesh per material per group, plus the writer that turns a group into studio geo docs
(each <= 200 KB) and mesh objects. numpy only; used by armor.py (the dragon set) and sets.py (the other sets)."""
# @style: helper
import json, math, os
import numpy as np

X, Y, Z = np.eye(3)
def nz(v): v = np.asarray(v, float); return v / np.linalg.norm(v)
def rot(rx=0, ry=0, rz=0):                         # three.js Euler XYZ: M = Rx Ry Rz
    a, b, c = map(math.radians, (rx, ry, rz))
    Rx = np.array([[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]])
    Ry = np.array([[math.cos(b), 0, math.sin(b)], [0, 1, 0], [-math.sin(b), 0, math.cos(b)]])
    Rz = np.array([[math.cos(c), -math.sin(c), 0], [math.sin(c), math.cos(c), 0], [0, 0, 1]])
    M = Rx @ Ry @ Rz; return M[:, 0], M[:, 1], M[:, 2]

class B:                                            # one group: a mesh per material
    def __init__(s): s.M = {}
    def solid(s, mat, V, F):                        # a convex solid: every face turned to point away from its centre
        V = [np.asarray(v, float) for v in V]; c = sum(V) / len(V); m = s.M.setdefault(mat, ([], [])); o = len(m[0])
        for f in F:
            for i in range(1, len(f) - 1):
                a, b, d = f[0], f[i], f[i + 1]
                n = np.cross(V[b] - V[a], V[d] - V[a])
                if np.dot(n, (V[a] + V[b] + V[d]) / 3 - c) < 0: b, d = d, b
                m[1].append([a + o, b + o, d + o])
        m[0].extend(V)
    def prism(s, mat, c, U, V, N, pts, t):          # 2D outline (convex) in the U-V plane, t thick along N
        c = np.asarray(c, float); k = len(pts)
        Vs = [c + U * x + V * y + N * h for h in (t / 2, -t / 2) for x, y in pts]
        F = [list(range(k)), list(range(k, 2 * k))] + [[i, (i + 1) % k, k + (i + 1) % k, k + i] for i in range(k)]
        s.solid(mat, Vs, F)
    def box(s, mat, c, size, r=(0, 0, 0)):
        U, V, N = rot(*r); w, h, d = (x / 2 for x in size)
        s.prism(mat, c, U, V, N, [(-w, -h), (w, -h), (w, h), (-w, h)], 2 * d)
    def octa(s, mat, c, U, V, N, w, h, t, ch=0.3):  # chamfered plate
        a, b = w * (1 - ch), h * (1 - ch)
        s.prism(mat, c, U, V, N, [(-a, -h), (a, -h), (w, -b), (w, b), (a, h), (-a, h), (-w, b), (-w, -b)], t)
    def shield(s, mat, c, U, V, N, w, h, t):        # a scale tile, point down
        s.prism(mat, c, U, V, N, [(-w, h), (w, h), (w, -0.15 * h), (0, -h), (-w, -0.15 * h)], t)
    def frustum(s, mat, c, U, V, N, w0, d0, w1, d1, h):   # square-ish taper from c along V
        c = np.asarray(c, float)
        Vs = [c + U * x + N * z for x, z in ((-w0, -d0), (w0, -d0), (w0, d0), (-w0, d0))] + \
             [c + V * h + U * x + N * z for x, z in ((-w1, -d1), (w1, -d1), (w1, d1), (-w1, d1))]
        s.solid(mat, Vs, [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
    def spike(s, mat, base, d, h, w):               # four-sided pyramid from base along d
        d = nz(d); U = nz(np.cross(d, Z if abs(d[2]) < 0.9 else X)); N = np.cross(U, d); b = np.asarray(base, float)
        Vs = [b + U * x + N * z for x, z in ((-w, -w), (w, -w), (w, w), (-w, w))] + [b + d * h]
        s.solid(mat, Vs, [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]])
    def tiles(s, mats, o, U, V, N, cols, rows, du, dv, w, h, t, tilt=14, skip=None):
        a = math.radians(tilt); V2 = V * math.cos(a) - N * math.sin(a); N2 = N * math.cos(a) + V * math.sin(a)
        for j in range(rows):
            off = du / 2 if j % 2 else 0
            for i in range(cols - (1 if j % 2 else 0)):
                u = (i - (cols - 1) / 2) * du + off
                if skip and skip(u, j): continue
                s.shield(mats[j % len(mats)], np.asarray(o, float) + U * u - V * j * dv + N * (t / 2 + h * math.sin(a)), U, V2, N2, w, h, t)
    def horn(s, P, w0, w1, mats=('horn', 'bone'), up=Y):    # stepped segments along a bezier, pyramid tip
        n = len(P) - 1
        for i in range(n):
            a, b = P[i], P[i + 1]; d = nz(b - a); U = nz(np.cross(d, up)); N = np.cross(U, d)
            r0, r1 = w0 + (w1 - w0) * i / n, w0 + (w1 - w0) * (i + 1) / n
            s.frustum(mats[i % 2], a, U, d, N, r0, r0, r1 * 1.04, r1 * 1.04, np.linalg.norm(b - a) * 1.02)
        s.spike('bone', P[-1], P[-1] - P[-2], w1 * 3.2, w1 * 1.04)
    def mirror(s):                                  # the right side: x flipped, faces reversed
        o = B()
        for k, (V, F) in s.M.items(): o.M[k] = ([v * np.array([-1, 1, 1]) for v in V], [[a, c, b] for a, b, c in F])
        return o

def bez(p0, p1, p2, p3, n):
    p0, p1, p2, p3 = map(lambda v: np.asarray(v, float), (p0, p1, p2, p3))
    return [(1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3 for t in np.linspace(0, 1, n + 1)]


class Kit:                                          # writes OUT/geo/<prefix>-<group>-<mat><k>.json and collects the objects
    def __init__(s, out, prefix, mat):
        s.out, s.prefix, s.mat, s.objs, s.docs = out, prefix, mat, {}, []
        os.makedirs(os.path.join(out, 'geo'), exist_ok=True)
    def emit(s, g, b, name):
        for mat, (V, F) in sorted(b.M.items()):
            parts = [F]
            size = lambda fs: len({v for f in fs for v in f}) * 22 + len(fs) * 16
            while any(size(p) > 200_000 for p in parts): parts = [q for p in parts for q in (p[:len(p) // 2], p[len(p) // 2:])]
            for k, fs in enumerate(parts):
                used = sorted({v for f in fs for v in f}); rm = {v: i for i, v in enumerate(used)}
                geo = {'verts': [round(float(x), 4) for v in used for x in V[v]], 'faces': [[rm[a], rm[b_], rm[c]] for a, b_, c in fs], 'uvs': [0] * (2 * len(used))}
                gid = f'{s.prefix}-{g.lower()}-{mat}{k}'; json.dump(geo, open(os.path.join(s.out, 'geo', gid + '.json'), 'w'), separators=(',', ':')); s.docs.append(gid)
                s.objs[f'{g}-{mat}{k}'] = dict(type='mesh', name=f'{name} {mat}', geo=gid, parent=g, pos=[0, 0, 0], rot=[0, 0, 0], smooth=False, **s.mat[mat])
    def pair(s, gl, gr, b, name): s.emit(gl, b, 'Left ' + name); s.emit(gr, b.mirror(), 'Right ' + name)
    def save(s, stage):
        json.dump({'objects': s.objs}, open(os.path.join(s.out, stage + '.json'), 'w'), separators=(',', ':'))
        tris = sum(len(json.load(open(os.path.join(s.out, 'geo', d + '.json')))['faces']) for d in s.docs)
        return {'stage': stage, 'objects': len(s.objs), 'geo_docs': s.docs, 'triangles': tris}
