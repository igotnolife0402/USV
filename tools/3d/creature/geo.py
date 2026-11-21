"""Tiger by hand: signed-distance anatomy -> surface-nets meshes, painted stripes.
Writes: render mesh (bins + meta.json) for render.html, and tiger.glb (Roblox-ready, <=20k tris, one texture).
World: metres, X forward, Y left, Z up. glTF/three: x=Y, y=Z, z=X."""
import numpy as np, json, sys, os, struct, io
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'
os.makedirs(OUT, exist_ok=True)
A = np.array
def V(*a): return A(a, float)
def rx(d):
    a = np.radians(d); c, s = np.cos(a), np.sin(a); return A([[1, 0, 0], [0, c, -s], [0, s, c]])
def ry(d):
    a = np.radians(d); c, s = np.cos(a), np.sin(a); return A([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def rz(d):
    a = np.radians(d); c, s = np.cos(a), np.sin(a); return A([[c, -s, 0], [s, c, 0], [0, 0, 1]])

# ---------------- primitives ----------------
class Ell:
    def __init__(s, c, r, R=None):
        s.c, s.r, s.R = V(*c), V(*r), R
        e = s.r.max(); s.lo, s.hi = s.c - e, s.c + e
    def __call__(s, X, Y, Z):
        x, y, z = X - s.c[0], Y - s.c[1], Z - s.c[2]
        if s.R is not None:
            R = s.R
            x, y, z = (R[0, 0]*x + R[1, 0]*y + R[2, 0]*z, R[0, 1]*x + R[1, 1]*y + R[2, 1]*z, R[0, 2]*x + R[1, 2]*y + R[2, 2]*z)
        a, b, c = s.r
        k0 = np.sqrt((x/a)**2 + (y/b)**2 + (z/c)**2)
        k1 = np.sqrt((x/a/a)**2 + (y/b/b)**2 + (z/c/c)**2)
        return k0*(k0 - 1)/np.maximum(k1, 1e-9)

class Cone:  # round cone a(r1) -> b(r2)
    def __init__(s, a, b, r1, r2):
        s.a, s.b, s.r1, s.r2 = V(*a), V(*b), r1, r2
        m = max(r1, r2); s.lo, s.hi = np.minimum(s.a, s.b) - m, np.maximum(s.a, s.b) + m
        s.ba = s.b - s.a; s.l2 = s.ba @ s.ba; s.rr = r1 - r2; s.a2 = s.l2 - s.rr**2; s.il2 = 1/s.l2
    def __call__(s, X, Y, Z):
        px, py, pz = X - s.a[0], Y - s.a[1], Z - s.a[2]
        bx, by, bz = s.ba; l2 = s.l2
        y = px*bx + py*by + pz*bz; z = y - l2
        qx, qy, qz = px*l2 - bx*y, py*l2 - by*y, pz*l2 - bz*y
        x2 = qx*qx + qy*qy + qz*qz; y2 = y*y*l2; z2 = z*z*l2
        k = np.sign(s.rr)*s.rr*s.rr*x2
        d1 = np.sqrt(x2 + z2)*s.il2 - s.r2
        d2 = np.sqrt(x2 + y2)*s.il2 - s.r1
        d3 = (np.sqrt(np.maximum(x2*s.a2*s.il2, 0)) + y*s.rr)*s.il2 - s.r1
        return np.where(np.sign(z)*s.a2*z2 > k, d1, np.where(np.sign(y)*s.a2*y2 < k, d2, d3))

def smin(a, b, k):
    h = np.maximum(k - np.abs(a - b), 0)/k
    return np.minimum(a, b) - h*h*k*0.25

OPS = []  # (op, prim, k, group)
def U(p, k, g): OPS.append(('u', p, k, g))
def S(p, k, g): OPS.append(('s', p, k, g))
def point_field(P):
    X, Y, Z = P[:, 0], P[:, 1], P[:, 2]
    F = np.full(len(P), 1.0)
    for op, p, k, g in OPS:
        d = p(X, Y, Z)
        F = smin(F, d, k) if op == 'u' else -smin(-F, d, k)
    return F

# ---------------- anatomy ----------------
H = V(1.10, 0, 0.90)                 # head origin (cranium centre)
RH = rz(18) @ ry(7)                   # head turned toward camera side (+Y), nose slightly down
def hp(p): return tuple(H + RH @ V(*p))
def hR(R=None): return RH if R is None else RH @ R

# torso
U(Ell((0.36, 0, 0.70), (0.40, 0.245, 0.265)), 0.12, 'body')
for s in (1, -1): U(Ell((0.52, s*0.14, 0.80), (0.20, 0.075, 0.10), ry(55)), 0.10, 'body')
U(Ell((-0.12, 0, 0.70), (0.40, 0.215, 0.225)), 0.14, 'body')
U(Ell((-0.28, 0, 0.56), (0.24, 0.16, 0.09)), 0.10, 'body')
U(Ell((-0.55, 0, 0.735), (0.29, 0.215, 0.215)), 0.14, 'body')
U(Cone((0.45, 0, 0.90), (0.0, 0, 0.862), 0.075, 0.07), 0.08, 'body')
U(Cone((0.0, 0, 0.862), (-0.60, 0, 0.875), 0.07, 0.075), 0.08, 'body')
U(Ell((0.66, 0, 0.58), (0.16, 0.17, 0.15)), 0.10, 'body')
# neck + throat
U(Cone((0.62, 0, 0.78), hp((-0.08, 0, -0.03)), 0.22, 0.165), 0.10, 'neck')
U(Ell((0.86, 0, 0.70), (0.16, 0.13, 0.12)), 0.08, 'neck')
# head (local frame)
U(Ell(hp((0, 0, 0)), (0.15, 0.12, 0.115), hR()), 0.06, 'head')
U(Ell(hp((0.075, 0, 0.035)), (0.10, 0.105, 0.075), hR()), 0.035, 'head')
for s in (1, -1):
    U(Ell(hp((-0.03, s*0.095, -0.055)), (0.11, 0.095, 0.105), hR()), 0.04, 'head')
    U(Ell(hp((0.08, s*0.075, -0.05)), (0.09, 0.07, 0.075), hR()), 0.035, 'head')
U(Ell(hp((0.17, 0, -0.035)), (0.10, 0.085, 0.07), hR()), 0.04, 'head')
for s in (1, -1): U(Ell(hp((0.195, s*0.042, -0.058)), (0.07, 0.05, 0.05), hR()), 0.025, 'head')
U(Cone(hp((0.06, 0, 0.03)), hp((0.245, 0, 0.0)), 0.055, 0.04), 0.03, 'head')
U(Ell(hp((0.258, 0, -0.006)), (0.022, 0.032, 0.019), hR()), 0.012, 'head')
U(Ell(hp((0.13, 0, -0.11)), (0.11, 0.06, 0.04), hR()), 0.03, 'head')
U(Ell(hp((0.20, 0, -0.10)), (0.045, 0.042, 0.03), hR()), 0.02, 'head')
for s in (1, -1):
    U(Ell(hp((0.115, s*0.055, 0.05)), (0.04, 0.03, 0.018), hR()), 0.02, 'head')
    U(Ell(hp((-0.075, s*0.095, 0.105)), (0.022, 0.05, 0.055), hR(rz(s*20) @ rx(-s*15))), 0.025, 'ear')
    S(Ell(hp((-0.058, s*0.097, 0.112)), (0.012, 0.034, 0.04), hR(rz(s*20) @ rx(-s*15))), 0.01, 'ear')
EYE_R = 0.019
def _surf(p0, d):  # first surface crossing marching from inside p0 along d
    t = 0.0
    while t < 0.1 and point_field((p0 + t*d)[None])[0] < 0: t += 0.002
    a, b = max(t - 0.002, 0.0), t
    for _ in range(20):
        m = (a + b)/2
        if point_field((p0 + m*d)[None])[0] < 0: a = m
        else: b = m
    return p0 + b*d
EYES = []
for s in (1, -1):
    dl = V(1, 0.3*s, 0.05); dl /= np.linalg.norm(dl)
    hl = V(0, s, 0) - (V(0, s, 0) @ dl)*dl; hl /= np.linalg.norm(hl)
    ul = V(0, 0, 1) - (V(0, 0, 1) @ dl)*dl - (V(0, 0, 1) @ hl)*hl; ul /= np.linalg.norm(ul)
    c10, s10 = np.cos(np.radians(10)), np.sin(np.radians(10))
    hl, ul = c10*hl + s10*ul, -s10*hl + c10*ul        # almond tilted: outer corner up
    d = RH @ dl
    ps = _surf(H + RH @ (V(0.128, s*0.06, 0.022) - 0.03*dl), d)
    EYES.append({'ps': ps, 'd': d, 'h': RH @ hl, 'u': RH @ ul, 'psl': (ps - H) @ RH, 'hl': hl, 'ul': ul, 'dl': dl})
    S(Ell(ps - 0.002*d, (0.014, 0.019, 0.012), np.stack([d, RH @ hl, RH @ ul], 1)), 0.008, 'head')

# legs
def front_leg(s, dxe, dxw, dxp):
    J, E = V(0.60, s*0.165, 0.64), V(0.42 + dxe, s*0.165, 0.43)
    W, P = V(0.49 + dxw, s*0.155, 0.12), V(0.555 + dxp, s*0.155, 0.052)
    U(Cone(J, E, 0.125, 0.095), 0.08, 'fleg')
    U(Ell((0.47 + dxe*0.5, s*0.17, 0.55), (0.13, 0.085, 0.14)), 0.06, 'fleg')
    U(Cone(E, W, 0.09, 0.062), 0.04, 'fleg')
    U(Ell(E + 0.3*(W - E) + V(0.02, 0, 0), (0.075, 0.068, 0.12)), 0.04, 'fleg')
    U(Ell(P, (0.095, 0.072, 0.052)), 0.035, 'fleg')
    for t, o in zip((-0.048, -0.016, 0.016, 0.048), (0.062, 0.074, 0.074, 0.062)):
        U(Ell(P + V(o, s*t, -0.022), (0.034, 0.03, 0.03)), 0.015, 'fleg')
def hind_leg(s, dxk, dxh, dxp):
    Hp, K = V(-0.56, s*0.16, 0.70), V(-0.36 + dxk, s*0.17, 0.43)
    Hk, P = V(-0.63 + dxh, s*0.15, 0.24), V(-0.57 + dxp, s*0.15, 0.048)
    U(Ell((-0.50 + dxk*0.4, s*0.165, 0.58), (0.20, 0.115, 0.22), ry(-20)), 0.08, 'hleg')
    U(Cone(Hp, K, 0.14, 0.095), 0.08, 'hleg')
    U(Cone(K, Hk, 0.085, 0.052), 0.04, 'hleg')
    U(Ell(K + 0.35*(Hk - K) + V(-0.035, 0, 0), (0.07, 0.06, 0.10)), 0.04, 'hleg')
    U(Cone(Hk, P + V(0, 0, 0.03), 0.05, 0.05), 0.03, 'hleg')
    U(Ell(Hk + V(-0.03, 0, 0.01), (0.035, 0.035, 0.04)), 0.02, 'hleg')
    U(Ell(P, (0.09, 0.066, 0.048)), 0.03, 'hleg')
    for t, o in zip((-0.044, -0.015, 0.015, 0.044), (0.056, 0.066, 0.066, 0.056)):
        U(Ell(P + V(o, s*t, -0.02), (0.031, 0.028, 0.028)), 0.015, 'hleg')
front_leg(1, 0.04, 0.12, 0.13); front_leg(-1, -0.03, -0.10, -0.11)
hind_leg(1, -0.04, -0.10, -0.12); hind_leg(-1, 0.05, 0.10, 0.12)

# tail
TAIL = A([(-0.78, 0, 0.85, .07), (-0.94, 0, 0.79, .06), (-1.07, 0.01, 0.66, .053), (-1.15, 0.025, 0.50, .049),
          (-1.19, 0.04, 0.35, .047), (-1.20, 0.06, 0.22, .046), (-1.25, 0.08, 0.13, .046), (-1.34, 0.09, 0.105, .045),
          (-1.42, 0.09, 0.14, .042), (-1.46, 0.085, 0.19, .038)])
for i in range(len(TAIL) - 1):
    U(Cone(TAIL[i, :3], TAIL[i + 1, :3], TAIL[i, 3], TAIL[i + 1, 3]), 0.08 if i == 0 else 0.03, 'tail')
GROUPS = ['body', 'neck', 'head', 'ear', 'fleg', 'hleg', 'tail']

# ---------------- field evaluation ----------------
LO, HI = V(-1.56, -0.42, -0.012), V(1.50, 0.42, 1.22)
def grid_field(h):
    xs, ys, zs = [np.arange(LO[i], HI[i] + h, h) for i in range(3)]
    F = np.full((len(xs), len(ys), len(zs)), 1.0)
    for op, p, k, g in OPS:
        m = k + 3*h
        sl = []
        for i, ax in enumerate((xs, ys, zs)):
            a = max(int(np.floor((p.lo[i] - m - LO[i])/h)), 0); b = min(int(np.ceil((p.hi[i] + m - LO[i])/h)) + 1, len(ax))
            sl.append(slice(a, b))
        if any(s.start >= s.stop for s in sl): continue
        d = p(xs[sl[0]][:, None, None], ys[sl[1]][None, :, None], zs[sl[2]][None, None, :])
        sub = F[sl[0], sl[1], sl[2]]
        F[sl[0], sl[1], sl[2]] = smin(sub, d, k) if op == 'u' else -smin(-sub, d, k)
    return F, xs, ys, zs

def group_dists(P):
    X, Y, Z = P[:, 0], P[:, 1], P[:, 2]
    D = {g: np.full(len(P), 9.0) for g in GROUPS}
    for op, p, k, g in OPS:
        if op == 'u': D[g] = np.minimum(D[g], p(X, Y, Z))
    return D

# ---------------- surface nets ----------------
def surface_nets(F, xs, ys, zs):
    h = xs[1] - xs[0]; nx, ny, nz = F.shape
    inside = F < 0
    ncell = (nx - 1)*(ny - 1)*(nz - 1)
    def cid(i, j, k): return (i*(ny - 1) + j)*(nz - 1) + k
    sx = np.zeros(ncell); sy = np.zeros(ncell); sz = np.zeros(ncell); cnt = np.zeros(ncell)
    quads = []
    for ax in range(3):
        sl0 = [slice(None)]*3; sl1 = [slice(None)]*3
        sl0[ax] = slice(0, -1); sl1[ax] = slice(1, None)
        cr = inside[tuple(sl0)] != inside[tuple(sl1)]
        I, J, K = np.nonzero(cr)
        idx = [I, J, K]
        f0 = F[tuple(sl0)][cr]; f1 = F[tuple(sl1)][cr]
        t = f0/(f0 - f1)
        pt = [xs[I], ys[J], zs[K]]; pt[ax] = pt[ax] + t*h
        b, c = (ax + 1) % 3, (ax + 2) % 3
        cells = []
        for db, dc in ((-1, -1), (0, -1), (0, 0), (-1, 0)):
            q = [I.copy(), J.copy(), K.copy()]; q[b] = q[b] + db; q[c] = q[c] + dc
            cells.append(q)
        lim = (nx - 1, ny - 1, nz - 1)
        ok = np.ones(len(I), bool)
        for q in cells:
            for a in range(3): ok &= (q[a] >= 0) & (q[a] < lim[a])
        for q in cells:
            ci = cid(*[qq[ok] for qq in q])
            for arr, w in ((sx, pt[0][ok]), (sy, pt[1][ok]), (sz, pt[2][ok])):
                arr += np.bincount(ci, weights=w, minlength=ncell)
            cnt += np.bincount(ci, minlength=ncell)
        qc = np.stack([cid(*[qq[ok] for qq in q]) for q in cells], 1)
        flip = ~inside[tuple(sl0)][cr][ok]
        qc[flip] = qc[flip][:, ::-1]
        quads.append(qc)
    act = cnt > 0
    vid = np.full(ncell, -1, np.int64); vid[act] = np.arange(act.sum())
    Vt = np.stack([sx[act], sy[act], sz[act]], 1)/cnt[act][:, None]
    Q = vid[np.concatenate(quads)]
    return Vt, Q

def neighbors(Q, n):
    e = np.concatenate([Q[:, [0, 1]], Q[:, [1, 2]], Q[:, [2, 3]], Q[:, [3, 0]]])
    e = np.unique(np.sort(e, 1), axis=0)
    return e
def taubin(Vt, E, it, lam=0.5, mu=-0.53):
    n = len(Vt); deg = np.bincount(E.ravel(), minlength=n).astype(float)
    for _ in range(it):
        for f in (lam, mu):
            s = np.zeros_like(Vt)
            for a in range(3):
                s[:, a] = np.bincount(E[:, 0], Vt[E[:, 1], a], n) + np.bincount(E[:, 1], Vt[E[:, 0], a], n)
            Vt = Vt + f*(s/np.maximum(deg, 1)[:, None] - Vt)
    return Vt
def project(Vt, it=2, eps=0.0015):
    for _ in range(it):
        f = point_field(Vt)
        g = np.stack([(point_field(Vt + eps*np.eye(3)[a]) - point_field(Vt - eps*np.eye(3)[a]))/(2*eps) for a in range(3)], 1)
        gg = np.maximum((g*g).sum(1), 0.25)
        Vt = Vt - (f/gg)[:, None]*g
    return Vt
def tris_of(Q, Vt):
    d02 = np.linalg.norm(Vt[Q[:, 0]] - Vt[Q[:, 2]], axis=1); d13 = np.linalg.norm(Vt[Q[:, 1]] - Vt[Q[:, 3]], axis=1)
    a = d02 <= d13
    T = np.concatenate([np.where(a[:, None], Q[:, [0, 1, 2]], Q[:, [0, 1, 3]]), np.where(a[:, None], Q[:, [0, 2, 3]], Q[:, [1, 2, 3]])])
    return T
def vnormals(Vt, T):
    fn = np.cross(Vt[T[:, 1]] - Vt[T[:, 0]], Vt[T[:, 2]] - Vt[T[:, 0]])
    N = np.zeros_like(Vt)
    for c in range(3):
        for a in range(3): N[:, a] += np.bincount(T[:, c], fn[:, a], len(Vt))
    return N/np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)

def build(h, smooth):
    F, xs, ys, zs = grid_field(h)
    Vt, Q = surface_nets(F, xs, ys, zs)
    E = neighbors(Q, len(Vt))
    Vt = taubin(Vt, E, smooth)
    Vt = project(Vt)
    Vt = taubin(Vt, E, 1)
    return Vt, Q

# ---------------- paint ----------------
def hash3(i, j, k):
    h = (i*73856093) ^ (j*19349663) ^ (k*83492791)
    h = ((h ^ (h >> 13))*1274126177) & 0xffffffff
    h = h ^ (h >> 16)
    return (h & 0xffffff)/float(0xffffff)
def vnoise(P, f, seed):
    p = P*f + seed*17.31
    i = np.floor(p).astype(np.int64); t = p - i; u = t*t*(3 - 2*t)
    r = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (u[:, 0] if dx else 1 - u[:, 0])*(u[:, 1] if dy else 1 - u[:, 1])*(u[:, 2] if dz else 1 - u[:, 2])
                r = r + w*hash3(i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz + seed*1013)
    return r*2 - 1
def fbm(P, f, seed, o=3):
    s = 0; a = 1; t = 0
    for k in range(o): s = s + a*vnoise(P, f*2**k, seed + k*7); t += a; a *= 0.5
    return s/t
def sstep(a, b, x):
    t = np.clip((x - a)/(b - a), 0, 1); return t*t*(3 - 2*t)
def band(ph, w, aa=0.045):
    d = np.abs(ph - np.floor(ph) - 0.5)
    return 1 - sstep(w*0.5 - aa, w*0.5 + aa, d)
def srgb(*c):
    c = A(c, float)/255; return np.where(c <= 0.04045, c/12.92, ((c + 0.055)/1.055)**2.4)
C_DEEP, C_LIGHT, C_BACK = srgb(190, 88, 24), srgb(224, 132, 52), srgb(160, 68, 18)
C_CREAM, C_WHITE, C_BLACK = srgb(236, 208, 168), srgb(242, 238, 228), srgb(20, 16, 14)
C_NOSE, C_PAD = srgb(196, 128, 116), srgb(40, 30, 28)

def tail_param(P):
    best = np.full(len(P), 9.0); s = np.zeros(len(P)); acc = 0
    seg = np.linalg.norm(np.diff(TAIL[:, :3], axis=0), axis=1)
    for i in range(len(TAIL) - 1):
        a, b = TAIL[i, :3], TAIL[i + 1, :3]; ba = b - a
        t = np.clip(((P - a) @ ba)/(ba @ ba), 0, 1)
        d = np.linalg.norm(P - (a + t[:, None]*ba), axis=1)
        m = d < best; best[m] = d[m]; s[m] = acc + t[m]*seg[i]
        acc += seg[i]
    return s, acc

def stripes_fn(ph, t, P, w0, seed):
    """Stripes along phase ph; t = 0 at the spine, rising down the side. Each stripe has its own width, length, fork and taper."""
    ph = ph + 0.035*fbm(P, 22.0, seed + 2, 2)
    k = np.floor(ph).astype(np.int64); dd = np.abs(ph - k - 0.5); z0 = np.zeros_like(k)
    r1, r2, r3, r4 = (hash3(k, z0 + j, z0 + seed) for j in range(4))
    w = w0*(0.45 + 1.0*r1)
    fs = 0.25 + 0.35*r3
    split = (r2 > 0.55)*sstep(fs, fs + 0.15, t)
    dd = np.abs(dd - 0.15*split); w = w*(1 - 0.45*split)
    tend = 0.4 + 0.6*r4
    present = sstep(tend + 0.08, tend - 0.08, t + 0.12*fbm(P, 4.0, seed + 4))
    w = w*np.clip(1 - np.clip(t/tend, 0, 2)**1.5, 0, 1)
    brk = sstep(-0.4, -0.15, fbm(P, 5.0, seed + 1))
    stripe = sstep(w/2 + 0.03, w/2 - 0.03, dd)*sstep(0.0, 0.08, w)*present*brk
    dash = sstep(0.065, 0.035, 0.5 - dd)*sstep(0.45, 0.65, fbm(P, 9.0, seed + 3))*sstep(1.1, 0.8, t)
    return np.clip(np.maximum(stripe, dash), 0, 1)

def paint(P, N):
    """Linear RGB per point + fur length + comb direction."""
    n = len(P); x, y, z = P[:, 0], P[:, 1], P[:, 2]
    D = group_dists(P); Dm = np.min([D[g] for g in GROUPS], 0)
    W = {g: np.exp(-(D[g] - Dm)/0.012) for g in GROUPS}
    ws = sum(W.values()); W = {g: W[g]/ws for g in GROUPS}
    n1, n2, n3, n4 = fbm(P, 3.0, 1), fbm(P, 7.0, 2), fbm(P, 5.0, 3), fbm(P, 4.0, 4)
    # base orange, darker along the spine
    base = C_DEEP + (C_LIGHT - C_DEEP)*np.clip(0.5 + 0.45*fbm(P, 2.2, 9), 0, 1)[:, None]
    dors = sstep(0.84, 0.97, z)*(W['body'] + W['neck'])*sstep(0.6, 0.95, N[:, 2])
    base = base + (C_BACK - base)*(0.6*dors)[:, None]
    # whiteness
    side = np.sign(y + 1e-9); inner = -N[:, 1]*side
    wb = sstep(0.25, 1.15, (0.60 - z)/0.08 - N[:, 2]*1.2)
    wn = sstep(0.3, 1.2, (0.74 - z)/0.06 - N[:, 2]*1.3 + 0.6*sstep(0.6, 1.0, N[:, 0]))
    lat = sstep(0.55, 0.9, np.abs(N[:, 1]))            # side-facing fur stays orange
    wb = wb*(1 - 0.6*lat); wn = wn*(1 - 0.8*lat)
    wl = sstep(0.15, 0.6, inner)*sstep(0.62, 0.40, z)
    s_t, tl = tail_param(P)
    wt = sstep(-0.2, -0.6, N[:, 2])*sstep(0.45, 0.2, s_t)*0.8
    white = W['body']*wb + W['neck']*wn + (W['fleg'] + W['hleg'])*wl + W['tail']*wt
    # stripes: torso / neck
    Pw = P + 0.035*np.stack([fbm(P, 2.5, 31), fbm(P, 2.5, 32), fbm(P, 2.5, 33)], 1)
    xw, zw = Pw[:, 0], Pw[:, 2]
    slant = -0.15*np.tanh((xw - 0.15)/0.35)
    ph = (xw + slant*(0.95 - zw))/0.072 + 1.0*fbm(P, 1.1, 11) + 0.35*fbm(P, 4.5, 12) + 0.12*fbm(P, 11.0, 14)
    st_b = stripes_fn(ph, (0.93 - z)/0.48, P, 0.32, 40)
    # front legs: torso pattern up high, bars on the back/inner side low
    lowm = sstep(-0.15, 0.45, -N[:, 0]*0.9 + 0.25*sstep(0.1, 0.6, inner))*sstep(0.12, 0.2, z)
    st_fl = band((z + 0.02*n1)/0.072, 0.20 + 0.08*n2)*lowm*sstep(-0.5, -0.2, n3)
    t_up = sstep(0.42, 0.56, z)
    st_f = t_up*st_b + (1 - t_up)*st_fl
    # hind legs: diagonal thigh stripes, bars low on the back
    st_th = stripes_fn((zw*0.75 - xw*0.65)/0.075 + 1.0*fbm(P, 1.1, 13), np.clip((0.78 - z)/0.4, 0, 1.2), P, 0.30, 50)
    st_hl = band((z + 0.015*n1)/0.06, 0.22)*sstep(-0.1, 0.5, -N[:, 0] + 0.1)*sstep(0.1, 0.18, z)
    t_up2 = sstep(0.30, 0.42, z)
    st_h = t_up2*st_th*(1 - 0.7*sstep(0.3, 0.7, inner)) + (1 - t_up2)*st_hl
    # tail rings, black tip
    st_tl = band(s_t/0.085 + 0.25*n1, 0.36 + 0.1*n2)
    st_tl = np.where(s_t < 0.3, st_tl*sstep(-0.3, 0.2, N[:, 2]), st_tl)
    st_tl = np.maximum(st_tl, sstep(tl - 0.13, tl - 0.09, s_t))
    # head (local frame)
    L = (P - H) @ RH; Ln = N @ RH
    hx, hy, hz = L[:, 0], L[:, 1], L[:, 2]; ay = np.abs(hy)
    z_b = 0.004 + 0.5*(ay - 0.04)                      # muzzle white rises toward the cheeks, bridge stays orange
    wh = sstep(0.12, 0.15, hx)*sstep(0.005, -0.005, hz - z_b)
    wh = np.maximum(wh, sstep(-0.075, -0.095, hz))
    wh = np.maximum(wh, sstep(0.04, 0.07, ay)*sstep(-0.035, -0.06, hz)*sstep(0.13, 0.08, hx))
    ec = EYES[0]['psl'] + V(-0.015, 0.003, 0.032)       # white spot above each eye
    e_spot = ((hx - ec[0])/0.026)**2 + ((ay - ec[1])/0.02)**2 + ((hz - ec[2])/0.016)**2
    wh = np.maximum(wh, sstep(1.0, 0.6, e_spot))
    fore = sstep(0.0, 0.04, hz)*sstep(-0.12, -0.06, hx)*sstep(0.3, 0.6, Ln[:, 2])
    bars = band((hx + 0.012*n1)/0.03, 0.30)*sstep(0.06, 0.035, ay + 0.4*np.maximum(-hx, 0))
    arcs = band(np.sqrt((hx - 0.11)**2 + (ay*1.1)**2)/0.028 + 0.2*n2, 0.28)*sstep(0.035, 0.05, ay)*sstep(0.0, 0.03, -hx + 0.05)
    cheek = band((0.6*hx - 0.8*hz + 0.01*n1)/0.042, 0.32)*sstep(0.055, 0.075, ay)*sstep(0.10, 0.06, hx)*sstep(0.04, 0.0, hz)
    eyeliner = 0; qmin = 9.0
    for E in EYES:                                      # almond eye opening: q = 1 at its edge
        rel = P - E['ps']; dep = sstep(0.03, 0.02, np.abs(rel @ E['d']))
        q = np.sqrt(((rel @ E['h'])/0.019)**2 + ((rel @ E['u'])/0.012)**2)
        eyeliner = np.maximum(eyeliner, sstep(1.38, 1.22, q)*dep); qmin = np.minimum(qmin, np.where(dep > 0, q, 9.0))
    seg_a = EYES[0]['psl'] + 0.019*EYES[0]['hl']; seg_b = seg_a + V(-0.07, 0.035, -0.03)
    def segd(Lp, a, b):
        ba = b - a; t = np.clip(((Lp - a) @ ba)/(ba @ ba), 0, 1); return np.linalg.norm(Lp - (a + t[:, None]*ba), axis=1)
    Lm = L.copy(); Lm[:, 1] = ay
    eline = sstep(0.008, 0.004, segd(Lm, seg_a, seg_b))
    lipz = -0.074 - 0.9*(0.22 - hx).clip(0)**2
    lip = sstep(0.0065, 0.003, np.abs(hz - lipz))*sstep(0.06, 0.08, hx)*sstep(0.26, 0.24, hx)*sstep(0.003, 0.008, ay)
    phil = sstep(0.0045, 0.002, ay)*sstep(0.205, 0.22, hx)*sstep(-0.08, -0.07, hz)*sstep(-0.025, -0.035, hz)
    pad = sstep(0.155, 0.165, hx)*sstep(0.235, 0.225, hx)*sstep(-0.078, -0.07, hz)*sstep(-0.035, -0.042, hz)*sstep(0.02, 0.03, ay)
    dots = pad*sstep(0.13, 0.07, ((hx/0.0125) % 1 - 0.5)**2 + ((hz/0.011) % 1 - 0.5)**2)
    st_hd = np.clip(fore*np.maximum(bars, arcs) + cheek, 0, 1)*(1 - sstep(1.0, 0.6, e_spot))*(1 - wh*sstep(0.12, 0.16, hx))
    hblack = np.clip(np.maximum.reduce([eyeliner, eline, lip, phil, dots]), 0, 1)
    ny_, nz_ = ay/0.031, (hz + 0.026)/0.036              # nose leather: trapezoid, wide on top
    edge = np.maximum(0.7*(ny_ - (0.35 + 0.65*nz_)), nz_ - 1)
    nose = sstep(0.06, -0.02, edge)*sstep(0.235, 0.25, hx)*sstep(-0.1, 0.25, Ln[:, 0])
    nrim = nose*sstep(-0.10, -0.03, edge)
    nrim = np.maximum(nrim, nose*sstep(0.007, 0.004, np.linalg.norm(Lm - V(0.275, 0.013, -0.012), axis=1)))
    # ears: black back with white spot, pale inside
    eb = sstep(0.0, -0.3, Ln[:, 0]); eL = (P - H) @ RH; eL[:, 1] = np.abs(eL[:, 1])
    espot = sstep(0.024, 0.016, np.linalg.norm(eL - V(-0.09, 0.105, 0.105), axis=1))
    cav = sstep(0.032, 0.02, np.linalg.norm(eL - V(-0.058, 0.097, 0.112), axis=1))   # white tufts only inside the ear cup
    ear_white = np.maximum(cav*sstep(-0.1, 0.3, Ln[:, 0])*0.9, eb*espot)
    ear_black = eb*(1 - espot)
    wg = W['head']
    white = white + wg*wh + W['ear']*ear_white
    stripes = W['body']*st_b + W['neck']*st_b*sstep(0.5, 0.2, wn) + W['fleg']*st_f + W['hleg']*st_h + W['tail']*st_tl + wg*st_hd + W['ear']*ear_black
    stripes = np.clip(stripes*(1 - 0.75*sstep(0.6, 1.0, white)*(W['body'] + W['neck'])), 0, 1)
    white = np.clip(white, 0, 1)
    col = base + (C_CREAM - base)*sstep(0.0, 0.55, white)[:, None]
    col = col + (C_WHITE - col)*sstep(0.45, 1.0, white)[:, None]
    paws = (W['fleg'] + W['hleg'])*sstep(0.13, 0.07, z)
    col = col + (C_CREAM - col)*(0.5*paws)[:, None]
    col = col + (C_BLACK - col)*np.clip(stripes, 0, 1)[:, None]
    col = col + (C_BLACK - col)*(wg*hblack)[:, None]
    col = col + (C_NOSE - col)*(wg*nose)[:, None]
    col = col + (C_PAD - col)*(wg*nrim + paws*sstep(0.014, 0.006, z))[:, None]
    col = col*(1 + 0.06*fbm(P, 40.0, 21))[:, None]
    # fur length (m) and comb direction
    flen = 0.020*W['body'] + 0.028*W['neck'] + 0.010*W['fleg'] + 0.012*W['hleg'] + 0.015*W['tail'] + 0.006*W['ear']
    flen = flen + W['body']*0.016*sstep(0.62, 0.50, z) + W['neck']*0.02*sstep(0.75, 0.62, z)
    hlen = 0.005 + 0.03*sstep(0.04, 0.09, ay)*sstep(0.08, 0.0, hx)*sstep(0.0, -0.06, hz) + 0.004*sstep(0.12, 0.0, hx)
    flen = flen + wg*hlen + (W['fleg'] + W['hleg'])*0.006*sstep(0.45, 0.65, z)
    flen = flen*(1 - 0.5*(W['fleg'] + W['hleg'])*sstep(0.14, 0.06, z))
    flen = flen*(1 - 0.85*wg*sstep(2.0, 1.2, qmin))*(1 - 0.9*wg*nose)
    comb = (W['body'] + W['neck'])[:, None]*V(-1, 0, -0.35) + (W['fleg'] + W['hleg'])[:, None]*V(-0.25, 0, -1)
    comb = comb + (wg + W['ear'])[:, None]*((RH @ V(-1, 0, -0.1))[None, :] + (RH @ V(0, 1, 0))[None, :]*(0.5*np.sign(hy)*sstep(0.04, 0.08, ay))[:, None])
    tdir = np.zeros_like(P)
    for i in range(len(TAIL) - 1):
        a, b = TAIL[i, :3], TAIL[i + 1, :3]; d = (b - a)/np.linalg.norm(b - a)
        t = np.clip(((P - a) @ (b - a))/((b - a) @ (b - a)), 0, 1)
        dist = np.linalg.norm(P - (a + t[:, None]*(b - a)), axis=1)
        tdir += np.exp(-dist/0.02)[:, None]*d
    comb = comb + W['tail'][:, None]*tdir/np.maximum(np.linalg.norm(tdir, axis=1, keepdims=True), 1e-9)
    comb = comb - (comb*N).sum(1, keepdims=True)*N
    comb = comb/np.maximum(np.linalg.norm(comb, axis=1, keepdims=True), 1e-9)
    return np.clip(col, 0, 1), flen, comb

def to_gl(P): return np.stack([P[:, 1], P[:, 2], P[:, 0]], 1)

# eyes (world centre, gaze dir)
def eye_world():
    out = []
    return [(E['ps'] - E['d']*(EYE_R + 0.003), E['d']) for E in EYES]

if __name__ == '__main__':
    import time; t0 = time.time()
    # ---- render mesh ----
    Vt, Q = build(0.006, 6)
    T = tris_of(Q, Vt); Nv = vnormals(Vt, T)
    col, flen, comb = paint(Vt, Nv)
    print('render mesh', len(Vt), 'verts', len(T), 'tris', round(time.time() - t0, 1), 's')
    to_gl(Vt).astype('<f4').tofile(f'{OUT}/pos.bin'); to_gl(Nv).astype('<f4').tofile(f'{OUT}/nrm.bin')
    col.astype('<f4').tofile(f'{OUT}/col.bin'); T.astype('<u4').tofile(f'{OUT}/idx.bin')
    np.concatenate([to_gl(comb), flen[:, None]], 1).astype('<f4').tofile(f'{OUT}/fur.bin')
    eyes = eye_world(); print('eye psl', [np.round(E['psl'], 4).tolist() for E in EYES])
    meta = {'nv': len(Vt), 'nt': len(T), 'eyes': [{'c': to_gl(c[None])[0].tolist(), 'd': to_gl(d[None])[0].tolist(), 'r': EYE_R} for c, d in eyes],
            'head': to_gl(H[None])[0].tolist(), 'headR': RH.tolist()}
    # whisker roots: points on the whisker pads, fanning out
    wh = []
    rng = np.random.default_rng(3)
    for s in (1, -1):
        for r in range(4):
            for c in range(4):
                Lp = V(0.17 + 0.016*c, s*0.075, -0.045 - 0.009*r)
                p = H + RH @ Lp
                for _ in range(3):  # pull onto surface
                    f = point_field(p[None])[0]
                    g = A([(point_field((p + 1e-3*np.eye(3)[a])[None])[0] - f)/1e-3 for a in range(3)])
                    p = p - f*g/max(g @ g, 0.25)
                d = RH @ V(0.25 - 0.18*c + rng.normal(0, 0.05), s*1.0, 0.1 - 0.12*r + rng.normal(0, 0.04))
                wh.append({'p': to_gl(p[None])[0].tolist(), 'd': to_gl((d/np.linalg.norm(d))[None])[0].tolist(), 'l': float(0.09 + 0.02*c + 0.01*r + rng.normal(0, 0.008))})
    meta['whiskers'] = wh
    json.dump(meta, open(f'{OUT}/meta.json', 'w'))
    print('render data written', round(time.time() - t0, 1), 's')
