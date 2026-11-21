"""Max-quality armor kit: smooth, curved, bevelled solids instead of solids.py's flat low-poly blocks. Lathes (rings, lenses,
vials, rivet domes, drips), swept tubes (hoses, horns, fangs, trims along curves), rounded boxes, tori, curved shell plates with
rolled rims and centre ridges, bevelled extrusions. Every piece is a closed welded quad mesh with outward faces; the writer marks
meshes smooth by angle (SMOOTH degrees), so curves shade smooth and creases stay crisp. Same rig frames, groups and geo/object
contract as solids.Kit, so the hub, Studio and Roblox exporters work unchanged. numpy only.

Frames (from armor.py): CP torso x+-1 y+-1 z+-0.5; LS arm x -0.62..0.38, top y 0.08; LV arm x+-0.5 y -0.5..1.5; LG leg x+-0.5
y -1.15..0.85; LB foot y -0.34..0.36 z -0.56..0.44; HM head x+-0.6 y -0.62..0.58 z+-0.6. +z faces forward, left side is +x."""
import json, math, os
import numpy as np

X, Y, Z = np.eye(3)
SMOOTH = 40                                         # degrees: faces closer than this shade smooth


def nz(v):
    v = np.asarray(v, float); n = np.linalg.norm(v)
    return v / n if n > 1e-12 else v


def rot(rx=0, ry=0, rz=0):                          # three.js Euler XYZ: M = Rx Ry Rz; returns the rotated X, Y, Z axes
    a, b, c = map(math.radians, (rx, ry, rz))
    Rx = np.array([[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]])
    Ry = np.array([[math.cos(b), 0, math.sin(b)], [0, 1, 0], [-math.sin(b), 0, math.cos(b)]])
    Rz = np.array([[math.cos(c), -math.sin(c), 0], [math.sin(c), math.cos(c), 0], [0, 0, 1]])
    M = Rx @ Ry @ Rz; return M[:, 0], M[:, 1], M[:, 2]


def perp(d, up=None):                               # two unit axes perpendicular to d
    d = nz(d); up = Y if up is None else nz(up)
    if abs(np.dot(d, up)) > 0.95: up = Z if abs(d[2]) < 0.9 else X
    U = nz(np.cross(up, d)); return U, np.cross(d, U)


def bez(p0, p1, p2, p3, n):                         # cubic bezier, n segments (n+1 points)
    p0, p1, p2, p3 = (np.asarray(p, float) for p in (p0, p1, p2, p3))
    return [(1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3 for t in np.linspace(0, 1, n + 1)]


def _newell(V, f):
    n = np.zeros(3)
    for i in range(len(f)):
        p, q = V[f[i]], V[f[(i + 1) % len(f)]]
        n += np.array([(p[1] - q[1]) * (p[2] + q[2]), (p[2] - q[2]) * (p[0] + q[0]), (p[0] - q[0]) * (p[1] + q[1])])
    return n


def _volume(V, F):
    s = 0.0
    for f in F:
        for i in range(1, len(f) - 1): s += np.dot(V[f[0]], np.cross(V[f[i]], V[f[i + 1]]))
    return s


def _strip(F, a, b, k, closed=True):                # quads between two loops of k points starting at index a and b
    for j in range(k if closed else k - 1):
        j1 = (j + 1) % k; F.append([a + j, a + j1, b + j1, b + j])


class H:                                            # one group: a mesh per material
    def __init__(s): s.M = {}; s.P = {}             # P: face index where each piece starts (docs split between pieces)

    def add(s, mat, V, F, check=True):              # a closed piece; flipped as a whole if its signed volume is inward
        V = [np.asarray(v, float) for v in V]
        if check and _volume(V, F) < 0: F = [f[::-1] for f in F]
        m = s.M.setdefault(mat, ([], [])); o = len(m[0]); s.P.setdefault(mat, []).append(len(m[1]))
        m[0].extend(V); m[1].extend([[i + o for i in f] for f in F])

    def rings(s, mat, R, cap0=True, cap1=True, closed=False):   # loops of equal length -> a tube; closed joins last to first
        k = len(R[0]); V = [p for r in R for p in r]; F = []
        for i in range(len(R) - (0 if closed else 1)): _strip(F, i * k, ((i + 1) % len(R)) * k, k)
        if not closed:
            for r, cap, last in ((R[0], cap0, False), (R[-1], cap1, True)):
                if not cap or np.ptp(np.asarray(r), axis=0).max() < 1e-6: continue
                c = len(V); V.append(np.mean(r, axis=0)); base = (len(R) - 1) * k if last else 0
                for j in range(k):
                    j1 = (j + 1) % k; F.append([c, base + j, base + j1] if last else [c, base + j1, base + j])
        s.add(mat, V, F)

    # ---------- round things
    def lathe(s, mat, c, d, prof, n=40, ell=(1, 1), up=None, spin=0):
        """Surface of revolution along d from c: prof = [(radius, height), ...]; ell scales the two cross axes (oval)."""
        c = np.asarray(c, float); d = nz(d); U, N = perp(d, up); t = np.linspace(0, 2 * math.pi, n, endpoint=False) + math.radians(spin)
        R = [[c + d * h + U * (r * ell[0] * math.cos(a)) + N * (r * ell[1] * math.sin(a)) for a in t] for r, h in prof]
        s.rings(mat, R)

    def disc(s, mat, c, N, r, t, bevel=None, n=40):  # coin / lens with a rounded edge, centred on c, facing N
        b = min(t / 2, r * 0.3) if bevel is None else bevel; a = np.linspace(0, math.pi / 2, 4)
        prof = [(0, -t / 2)] + [(r - b + b * math.sin(x), -t / 2 + b - b * math.cos(x)) for x in a] + \
               [(r - b + b * math.cos(x), t / 2 - b + b * math.sin(x)) for x in a] + [(0, t / 2)]
        s.lathe(mat, c, N, prof, n)

    def sphere(s, mat, c, r, scale=(1, 1, 1), n=32, axis=Y, cut=0.0):   # cut>0 keeps only above -r+cut*2r (a dome)
        a0 = math.acos(1 - 2 * cut) if cut > 0 else math.pi
        prof = [(r * math.sin(a), r * math.cos(a)) for a in np.linspace(a0, 0, n // 2 + 1)]
        c = np.asarray(c, float); d = nz(axis); U, N = perp(d); t = np.linspace(0, 2 * math.pi, n, endpoint=False)
        S = np.array(scale, float)
        R = [[c + (d * h + U * (rr * math.cos(x)) + N * (rr * math.sin(x))) * S for x in t] for rr, h in prof]
        s.rings(mat, R)

    def rivet(s, mat, c, N, r=0.035):               # domed rivet head with a flange
        s.lathe(mat, np.asarray(c, float) - nz(N) * r * 0.2, N,
                [(0, 0), (r * 1.15, 0), (r * 1.15, r * 0.2), (r, r * 0.3)] + [(r * math.cos(a), r * 0.3 + r * 0.6 * math.sin(a)) for a in np.linspace(0.3, math.pi / 2, 5)], 16)

    def torus(s, mat, c, N, R, r, n=48, m=14, ell=(1, 1)):   # ring of radius R, tube radius r, around axis N
        c = np.asarray(c, float); N = nz(N); U, W = perp(N); rings = []
        for a in np.linspace(0, 2 * math.pi, n, endpoint=False):
            o = U * math.cos(a) * R * ell[0] + W * math.sin(a) * R * ell[1]; e = nz(o)
            rings.append([c + o + e * r * math.cos(b) + N * r * math.sin(b) for b in np.linspace(0, 2 * math.pi, m, endpoint=False)])
        s.rings(mat, rings, closed=True)

    def tube(s, mat, P, r, n=18, flat=1.0, up=None, cap=True, closed=False):
        """Sweep along points P; r = number or list (one per point; 0 = sharp tip); flat squashes the cross-section (blades,
        fangs); frames are parallel-transported, so the tube never twists."""
        P = [np.asarray(p, float) for p in P]; r = list(r) if hasattr(r, '__len__') else [r] * len(P)
        T = [nz(P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]) for i in range(len(P))]
        if closed: T = [nz(P[(i + 1) % len(P)] - P[i - 1]) for i in range(len(P))]
        U, _ = perp(T[0], up); R = []
        for i, p in enumerate(P):
            if i: U = nz(U - T[i] * np.dot(U, T[i]))
            W = np.cross(T[i], U)
            R.append([p + U * (r[i] * math.cos(a)) + W * (r[i] * flat * math.sin(a)) for a in np.linspace(0, 2 * math.pi, n, endpoint=False)])
        s.rings(mat, R, cap, cap, closed)

    def horn(s, mat, P, r0, r1=0.0, n=20, flat=1.0, rings_mat=None, every=3):   # tapering curved horn / fang, optional ridge rings
        k = len(P); r = [r0 + (r1 - r0) * (i / (k - 1)) ** 1.2 for i in range(k)]; s.tube(mat, P, r, n, flat)
        if rings_mat:
            for i in range(1, k - 2, every):
                d = nz(P[i + 1] - P[i - 1]); s.torus(rings_mat, P[i], d, r[i] * 1.0, r[i] * 0.16, 28, 8, ell=(1, flat))

    def drip(s, mat, c, l, w):                      # a liquid bead hanging from c and a tapering drop under it
        prof = [(0, 0), (w * 0.8, -w * 0.15), (w, -w * 0.6), (w * 0.75, -w * 1.2), (w * 0.45, -l * 0.55), (w * 0.62, -l * 0.8),
                (w * 0.55, -l * 0.92), (w * 0.3, -l * 0.99), (0, -l)]
        s.lathe(mat, c, Y, prof, 20)

    # ---------- boxes and plates
    def rbox(s, mat, c, size, r=0.03, rot_=(0, 0, 0), seg=3, frame=None):
        """Box with rounded edges and corners of radius r (smooth highlights instead of a hard CG edge)."""
        h = np.asarray(size, float) / 2; r = min(r, *(h * 0.999)); e = h - r
        U, Vv, N = frame if frame is not None else rot(*rot_); M = np.stack([U, Vv, N], 1); c = np.asarray(c, float)
        vals = lambda a: sorted(set([-h[a] + r - r * math.cos(t) for t in np.linspace(0, math.pi / 2, seg + 1)] +
                                    [h[a] - r + r * math.cos(t) for t in np.linspace(0, math.pi / 2, seg + 1)]))
        V, F = [], []
        for ax in range(3):
            a1, a2 = [(1, 2), (2, 0), (0, 1)][ax]
            for sg in (1, -1):
                A, B = (vals(a1), vals(a2)) if sg > 0 else (vals(a2), vals(a1)); i1, i2 = (a1, a2) if sg > 0 else (a2, a1)
                o = len(V)
                for u in A:
                    for v in B:
                        p = np.zeros(3); p[ax] = sg * h[ax]; p[i1] = u; p[i2] = v
                        q = np.clip(p, -e, e); dv = p - q
                        V.append(c + M @ (q + nz(dv) * r if np.linalg.norm(dv) > 1e-9 else p))
                nb = len(B)
                for i in range(len(A) - 1):
                    for j in range(nb - 1): F.append([o + i * nb + j, o + (i + 1) * nb + j, o + (i + 1) * nb + j + 1, o + i * nb + j + 1])
        s.add(mat, V, F)

    def plate(s, mat, c, U, V, w, h, t, outline='rect', bulge=(0.0, 0.0), ridge=0.0, flare=0.0, rim=None, nu=20, nv=16, rim_seg=6):
        """Curved armour plate centred at c, spanning U (half-width w) and V (half-height h), bulging toward N = U x V.
        outline: 'rect' | ('octa', chamfer 0..1) | ('shield', point depth 0..1) | ('taper', top/bottom width ratio) | 'oval' | fn(v)->0..1
        bulge = (sag across, sag down) in studs at the edges (a barrel / dome); ridge = height of a sharp centre crease;
        flare = the bottom edge kicks outward by this much; rim = rolled-edge bead radius (>= t/2) or None (just rounded).
        Returns Plate(at=(x, y, off) -> point, normal) to place rivets, trims and gems on the curved face."""
        c = np.asarray(c, float); U = nz(U); V = nz(V); N = np.cross(U, V)
        if callable(outline): hw = outline
        elif outline == 'rect': hw = lambda v: 1.0
        elif outline == 'oval': hw = lambda v: max(math.sqrt(max(1 - v * v, 0)), 0.18)
        elif outline[0] == 'octa': ch = outline[1]; hw = lambda v: 1 - ch * max(0, abs(v) - (1 - ch)) / ch if ch else 1
        elif outline[0] == 'shield': pd = outline[1]; hw = lambda v: 1.0 if v > -1 + 2 * pd * 0.5 else max(0.04, (v + 1) / (pd))
        elif outline[0] == 'taper': tk = outline[1]; hw = lambda v, tk=tk: 1 + (tk - 1) * (v + 1) / 2
        else: raise ValueError(outline)

        def surf(x, y):                             # x, y in studs on the plate
            u, v = x / w, y / h
            z = -bulge[0] * u * u - bulge[1] * v * v + ridge * max(0.0, 1 - abs(u) * 4) * 1.0 + flare * max(0.0, -v) ** 2
            return c + U * x + V * y + N * z

        def nrm(x, y):
            e = 1e-4; return nz(np.cross(surf(x + e, y) - surf(x - e, y), surf(x, y + e) - surf(x, y - e)))

        S = np.linspace(-1, 1, nu + 1); Vs = np.linspace(-1, 1, nv + 1)
        if ridge: S = np.unique(np.concatenate([S, [-0.25, 0, 0.25]]))
        grid = [[(si * w * hw(vi), vi * h) for si in S] for vi in Vs]     # [row v][col s]
        nr, nc = len(Vs), len(S)
        front = [surf(x, y) + nrm(x, y) * t / 2 for row in grid for x, y in row]
        back = [surf(x, y) - nrm(x, y) * t / 2 for row in grid for x, y in row]
        Vt = front + back; F = []; nb = len(front)
        for i in range(nr - 1):
            for j in range(nc - 1):
                a = i * nc + j; q = [a, a + 1, a + nc + 1, a + nc]; F.append(q); F.append([nb + x for x in q[::-1]])
        loop = [(0, j) for j in range(nc)] + [(i, nc - 1) for i in range(1, nr)] + [(nr - 1, j) for j in range(nc - 2, -1, -1)] + [(i, 0) for i in range(nr - 2, 0, -1)]
        k = len(loop); rb = max(t / 2, rim or 0); loops = [[i * nc + j for i, j in loop]]
        mid = len(Vt)
        for phi in np.linspace(0, math.pi, rim_seg + 2)[1:-1]:
            for li, (i, j) in enumerate(loop):
                x, y = grid[i][j]; p = surf(x, y); n = nrm(x, y)
                a, b = loop[li - 1], loop[(li + 1) % k]; tdir = nz(surf(*grid[b[0]][b[1]]) - surf(*grid[a[0]][a[1]]))
                o = nz(np.cross(tdir, n)); o = o if np.dot(o, p - c) >= 0 else -o
                Vt.append(p + n * rb * math.cos(phi) + o * rb * math.sin(phi))
        nl = rim_seg
        for m in range(nl): loops.append([mid + m * k + li for li in range(k)])
        loops.append([nb + i * nc + j for i, j in loop])
        RF = []
        for m in range(len(loops) - 1):
            A, B = loops[m], loops[m + 1]
            for li in range(k): RF.append([A[li], A[(li + 1) % k], B[(li + 1) % k], B[li]])
        if np.dot(_newell(Vt, F[0]), N) < 0: F = [f[::-1] for f in F]    # front faces point along N
        fe = {(f[i], f[(i + 1) % len(f)]) for f in F for i in range(len(f))}
        if (RF[0][0], RF[0][1]) in fe: RF = [f[::-1] for f in RF]           # rim winding matches the faces it joins
        s.add(mat, Vt, F + RF, check=False)
        return Plate(surf, nrm, t, w, h, hw)

    def extrude(s, mat, c, U, V, pts, t, bevel=0.012, seg=3):
        """Flat 2D outline (points in U-V, star-shaped around its centroid) extruded t thick along U x V with a rounded bevel."""
        c = np.asarray(c, float); U = nz(U); V = nz(V); N = np.cross(U, V); P = np.asarray(pts, float)
        if 0.5 * np.sum(P[:, 0] * np.roll(P[:, 1], -1) - np.roll(P[:, 0], -1) * P[:, 1]) < 0: P = P[::-1]
        k = len(P); E = np.roll(P, -1, 0) - P; En = np.stack([E[:, 1], -E[:, 0]], 1); En /= np.linalg.norm(En, axis=1)[:, None]
        Vn = En + np.roll(En, 1, 0); Vn /= np.maximum(np.linalg.norm(Vn, axis=1), 1e-9)[:, None]
        Vn /= np.maximum(np.sum(Vn * En, 1), 0.3)[:, None]                 # miter length
        b = min(bevel, t / 2 * 0.95); R = []
        prof = [(-(t / 2), -b)] + [(-(t / 2) + b - b * math.cos(a), -b + b * math.sin(a)) for a in np.linspace(0, math.pi / 2, seg + 1)[1:]] + \
               [(t / 2 - b + b * math.sin(a), -b + b * math.cos(a)) for a in np.linspace(0, math.pi / 2, seg + 1)[:-1]] + [(t / 2, -b)]
        for z, off in prof: R.append([c + U * (p[0] + n[0] * off) + V * (p[1] + n[1] * off) + N * z for p, n in zip(P, Vn)])
        s.rings(mat, R)

    def mirror(s):                                  # the right side: x flipped, faces reversed
        o = H(); o.P = {k: list(v) for k, v in s.P.items()}
        for k, (V, F) in s.M.items(): o.M[k] = ([v * np.array([-1, 1, 1]) for v in V], [f[::-1] for f in F])
        return o


class Plate:                                        # handle on a curved plate: at(x, y, off) -> (point on the front face + off, normal)
    def __init__(s, surf, nrm, t, w, h, hw): s.surf, s.nrm, s.t, s.w, s.h, s.hw = surf, nrm, t, w, h, hw
    def at(s, x, y, off=0.0):
        n = s.nrm(x, y); return s.surf(x, y) + n * (s.t / 2 + off), n
    def curve(s, pts, off=0.0):                     # a polyline drawn on the face (for trims / glowing seams)
        return [s.at(x, y, off)[0] for x, y in pts]


class Kit:                                          # writes OUT/geo/<prefix>-<group>-<mat><k>.json (<= 200 KB each) and the objects
    def __init__(s, out, prefix, mat, smooth=SMOOTH):
        s.out, s.prefix, s.mat, s.smooth, s.objs, s.docs = out, prefix, mat, smooth, {}, []
        os.makedirs(os.path.join(out, 'geo'), exist_ok=True)

    def emit(s, g, b, name):
        for mat, (V, F) in sorted(b.M.items()):
            key = {}; W = []; remap = []
            for v in V:                             # weld equal positions (4 decimals): smaller docs, smoothing across seams
                kk = tuple(round(float(x), 4) for x in v)
                if kk not in key: key[kk] = len(W); W.append(kk)
                remap.append(key[kk])
            starts = b.P.get(mat, [0]) + [len(F)]; pieces = []   # whole pieces only, so no doc ends with a cut (open) piece
            for p0, p1 in zip(starts, starts[1:]):
                FF = []
                for f in F[p0:p1]:
                    q = []
                    for v in f:
                        if not q or remap[v] != q[-1]: q.append(remap[v])
                    if len(q) > 1 and q[0] == q[-1]: q.pop()
                    if len(set(q)) >= 3: FF.append(q)
                pieces.append(FF)
            size = lambda fs: len({v for f in fs for v in f}) * 24 + sum(len(f) * 6 + 2 for f in fs)
            parts, cur, cs = [], [], 0
            for pc in pieces:
                z = size(pc)
                if cur and cs + z > 190_000: parts.append(cur); cur, cs = [], 0
                cur = cur + pc; cs += z
            if cur: parts.append(cur)
            for k, fs in enumerate(parts):
                used = sorted({v for f in fs for v in f}); rm = {v: i for i, v in enumerate(used)}
                geo = {'verts': [x for v in used for x in W[v]], 'faces': [[rm[v] for v in f] for f in fs], 'uvs': [0] * (2 * len(used))}
                gid = f'{s.prefix}-{g.lower()}-{mat}{k}'
                with open(os.path.join(s.out, 'geo', gid + '.json'), 'w') as fh: json.dump(geo, fh, separators=(',', ':'))
                s.docs.append(gid)
                s.objs[f'{g}-{mat}{k}'] = dict(type='mesh', name=f'{name} {mat}', geo=gid, parent=g, pos=[0, 0, 0], rot=[0, 0, 0],
                                               smooth=s.smooth, **s.mat[mat])

    def pair(s, gl, gr, b, name): s.emit(gl, b, 'Left ' + name); s.emit(gr, b.mirror(), 'Right ' + name)

    def save(s, stage):
        with open(os.path.join(s.out, stage + '.json'), 'w') as fh: json.dump({'objects': s.objs}, fh, separators=(',', ':'))
        tris = 0; kb = 0
        for d in s.docs:
            p = os.path.join(s.out, 'geo', d + '.json'); g = json.load(open(p)); tris += sum(len(f) - 2 for f in g['faces']); kb += os.path.getsize(p) / 1024
        return {'stage': stage, 'objects': len(s.objs), 'geo_docs': len(s.docs), 'triangles': tris, 'kb': round(kb)}


def audit(out):
    """Mesh health of every geo doc in OUT/geo: open edges (holes), edges used twice in one direction (flipped faces) and
    non-finite verts. Pieces may touch or overlap; they must each be closed and consistently wound. Returns {doc: problems}."""
    bad = {}
    for p in sorted(os.listdir(os.path.join(out, 'geo'))):
        g = json.load(open(os.path.join(out, 'geo', p))); E = {}
        for f in g['faces']:
            for i in range(len(f)): e = (f[i], f[(i + 1) % len(f)]); E[e] = E.get(e, 0) + 1
        flip = sum(1 for e, n in E.items() if n > 1); hole = sum(1 for (a, b) in E if (b, a) not in E)
        nan = int(not np.all(np.isfinite(g['verts'])))
        if flip or hole or nan: bad[p] = dict(open_edges=hole, flipped=flip, nan=nan)
    return bad


if __name__ == '__main__':                          # python hq.py OUT -> mesh audit
    import sys; r = audit(sys.argv[1]); print(json.dumps(r or 'clean'))
