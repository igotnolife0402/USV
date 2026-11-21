"""Venomreaver HQ torso pieces: cuirass (group CP) and pauldrons (LS/RS). build(stage, K) from venomreaver.py.
Frames: CP torso x+-1 y+-1 z+-0.5 (+z front); LS arm x -0.62..0.38, top y 0.08, z+-0.5 (torso side toward -x)."""
import math
import numpy as np
from hq import H, X, Y, Z, rot, perp, bez, nz

TAU = 2 * math.pi


def plate(b, *a, **k):
    k.setdefault('rim_seg', 4); return b.plate(*a, **k)


def frame(N):                                       # plate axes U, V (V ~ up) with U x V = N
    N = nz(N); U = nz(np.cross(Y, N)); return U, np.cross(N, U)


def vial(b, c, d, h, r, n=28):                      # glass vial: bronze caps, glass shell, thin glowing toxin core
    d = nz(d); c = np.asarray(c, float)
    b.lathe('glass', c, d, [(0, 0), (r * .6, h * .004), (r * .95, h * .03), (r, h * .08), (r, h * .92), (r * .95, h * .97), (r * .6, h * .996), (0, h)], n)
    b.lathe('glow', c + d * h * .1, d, [(0, 0), (r * .38, h * .006), (r * .46, h * .04), (r * .46, h * .6), (r * .3, h * .7), (0, h * .74)], 20)
    b.lathe('bronze', c, d, [(0, -.03 * h), (r * 1.12, -.03 * h), (r * 1.2, 0), (r * 1.2, .07 * h), (r * 1.02, .1 * h), (0, .1 * h)], n)
    b.lathe('bronze', c, d, [(0, .9 * h), (r * 1.02, .9 * h), (r * 1.2, .93 * h), (r * 1.2, h), (r * 1.1, 1.03 * h), (0, 1.03 * h)], n)


def loop_pts(pl, k=0.9, n=9, m=9):                  # closed path just inside a plate's outline, in plate coords (studs)
    sq = [(s, k) for s in np.linspace(-k, k, n)[:-1]] + [(k, v) for v in np.linspace(k, -k, m)[:-1]] + \
         [(s, -k) for s in np.linspace(k, -k, n)[:-1]] + [(-k, v) for v in np.linspace(-k, k, m)[:-1]]
    return [(s * pl.w * pl.hw(v), v * pl.h) for s, v in sq]


def trim(b, pl, k=0.93, r=0.013, mat='bronze'):
    b.tube(mat, pl.curve(loop_pts(pl, k, 8, 8), r * 0.3), r, 6, closed=True)


def edge(b, pl, r=0.011):                           # bronze bead along a lame's bottom edge
    b.tube('bronze', pl.curve([(s * pl.w, -0.9 * pl.h) for s in np.linspace(-0.93, 0.93, 12)], r * 0.3), r, 6)


def rvt(b, c, N, r=0.028, mat='bronze'):             # full 16-sided hq rivet
    b.rivet(mat, c, N, r)


def rivets(b, pl, pts, r=0.028, mat='bronze'):
    for x, y in pts:
        p, n = pl.at(x, y, 0.0); rvt(b, p, n, r, mat)


def rrect(hx, hz, rad, y, n=5):                     # rounded-rectangle path around Y
    P = []
    for sx, sz, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        for a in np.linspace(a0, a0 + 90, n + 1):
            P.append(np.array([sx * (hx - rad) + rad * math.cos(math.radians(a)), y, sz * (hz - rad) + rad * math.sin(math.radians(a))]))
    return P


def cuirass():
    b = H()
    # ---- breastplate: octa curved plate with ridge and rolled rim, sternum shield on top
    bp = plate(b, 'plate', (0, 0.45, 0.62), X, Y, 0.95, 0.5, 0.08, ('octa', 0.3), bulge=(0.1, 0.06), ridge=0.03, rim=0.045, nu=20, nv=14)
    trim(b, bp, 0.93, 0.014)
    rivets(b, bp, loop_pts(bp, 0.82, 4, 4))
    p0, n0 = bp.at(0, 0.06, 0)
    sp = plate(b, 'iron', p0 + n0 * 0.015, X, Y, 0.28, 0.36, 0.05, ('shield', 0.7), bulge=(0.04, 0.03), ridge=0.025, rim=0.03, nu=14, nv=14)
    trim(b, sp, 0.88, 0.009)
    for sx in (-1, 1):                              # filigree scrolls with a thin acid vein beside them
        ts = np.linspace(0, 1, 18)
        sc = [(sx * (0.34 + 0.5 * t), 0.2 - 0.3 * t + 0.06 * math.sin(TAU * t)) for t in ts]
        b.tube('bronze', bp.curve(sc, 0.003), 0.012, 8)
        b.tube('glow', bp.curve([(x, y - 0.05) for x, y in sc], 0.0), 0.008, 8)
        cu = [(sx * (0.5 + 0.1 * math.cos(a) * a / 5), 0.0 + 0.1 * math.sin(a) * a / 5) for a in np.linspace(0, 4.2, 14)]
        b.tube('bronze', bp.curve([(sx * 0.58 + (x - sx * 0.5) * 1.0, y + 0.06) for x, y in cu], 0.003), 0.01, 8)
    p, n = sp.at(0, 0.1, 0)                         # toxin gem: bronze bezel, glass lens, small glowing core
    b.torus('bronze', p, n, 0.075, 0.02, 30, 8); b.disc('glass', p + n * 0.01, n, 0.068, 0.04); b.disc('glow', p + n * 0.025, n, 0.032, 0.02)
    # ---- abdomen lames (upper overlaps lower), glow drips off a few edges
    a = math.radians(8); lames = []
    for k in range(4):
        N = nz(Z * math.cos(a) + Y * math.sin(a)); U, V = frame(N)
        pl = plate(b, 'plate' if k % 2 == 0 else 'iron', (0, -0.14 - 0.17 * k, 0.665 - 0.025 * k), U, V, 0.97 - 0.03 * k, 0.13, 0.06, 'rect',
                     bulge=(0.11, 0.0), rim=0.035, nu=22, nv=6)
        lames.append(pl); edge(b, pl)
    for k, x, l in ((0, -0.5, 0.2), (1, 0.28, 0.24), (2, -0.12, 0.14), (3, 0.6, 0.16)):
        b.drip('glow', lames[k].at(x, -0.93, 0)[0], l, 0.026)
    # ---- backplate, back lames, toxin tank
    bk = plate(b, 'plate', (0, 0.3, -0.62), -X, Y, 0.95, 0.65, 0.08, ('octa', 0.2), bulge=(0.1, 0.05), ridge=0.03, rim=0.045, nu=20, nv=14)
    trim(b, bk, 0.93, 0.014); rivets(b, bk, loop_pts(bk, 0.84, 4, 4))
    for k in range(3):
        N = nz(-Z * math.cos(a) + Y * math.sin(a)); U, V = frame(N)
        pl = plate(b, 'iron' if k % 2 == 0 else 'plate', (0, -0.47 - 0.17 * k, -0.665 + 0.025 * k), U, V, 0.95 - 0.03 * k, 0.13, 0.06, 'rect',
                     bulge=(0.11, 0.0), rim=0.035, nu=22, nv=6)
        edge(b, pl)
    tc = np.array([0, -0.28, -0.88]); h = 1.2
    vial(b, tc, Y, h, 0.2, 36)
    for y in (0.22, 0.6, 0.98):
        b.torus('bronze', tc + Y * y, Y, 0.215, 0.03, 36, 10)
    for y in (0.22, 0.98):                          # mounts tying the tank to the backplate
        b.rbox('iron', (0, tc[1] + y, -0.76), (0.34, 0.1, 0.2), 0.04)
    b.rbox('bronze', (0, tc[1] + h + 0.08, -0.88), (0.34, 0.1, 0.2), 0.04)
    for sx in (-1, 1):                              # small side canisters on the backplate
        vial(b, (sx * 0.68, -0.32, -0.7), Y, 0.8, 0.085, 24)
        b.torus('bronze', (sx * 0.68, 0.05, -0.7), Y, 0.1, 0.018, 24, 8)
        b.rbox('iron', (sx * 0.68, -0.05, -0.65), (0.14, 0.08, 0.12), 0.03)
    # ---- hoses from the tank manifold up over the shoulders into the collar
    for sx in (-1, 1):
        P = bez((sx * 0.09, 1.0, -0.88), (sx * 0.09, 1.45, -0.9), (sx * 0.95, 1.55, -0.55), (sx * 0.72, 1.1, -0.12), 28)
        b.tube('deep', P, 0.048, 20)
        for i in (0, 14, 28):
            b.torus('bronze', P[i], P[min(i + 1, 28)] - P[max(i - 1, 0)], 0.062, 0.017, 28, 10)
    # ---- gorget collar and shoulder yokes
    b.torus('plate', (0, 1.03, 0), Y, 0.72, 0.11, 40, 12, ell=(1.0, 0.74))
    b.torus('bronze', (0, 1.13, 0), Y, 0.7, 0.026, 40, 8, ell=(1.0, 0.74))
    b.torus('iron', (0, 0.94, 0), Y, 0.8, 0.07, 40, 10, ell=(1.0, 0.68))
    for sx in (-1, 1):
        yk = plate(b, 'plate', (sx * 0.8, 1.11, 0), Z, X, 0.45, 0.22, 0.06, 'oval', bulge=(0.08, 0.04), rim=0.035, nu=16, nv=12)
        trim(b, yk, 0.82, 0.01)
    # ---- belt, buckle with skull, belt vials
    b.rbox('iron', (0, -0.88, 0), (2.1, 0.22, 1.1), 0.08, seg=4)
    for y in (-0.82, -0.94): b.tube('bronze', rrect(1.054, 0.554, 0.09, y), 0.014, 8, closed=True)
    plate(b, 'bronze', (0, -0.88, 0.6), X, Y, 0.24, 0.16, 0.05, ('octa', 0.35), bulge=(0.03, 0.02), ridge=0.02, rim=0.03, nu=12, nv=10)
    b.sphere('bone', (0, -0.855, 0.66), 0.075, (1, 0.95, 0.8), 22)
    b.rbox('bone', (0, -0.925, 0.655), (0.095, 0.04, 0.07), 0.015)
    for sx in (-1, 1):
        b.disc('dark', (sx * 0.035, -0.85, 0.71), Z, 0.025, 0.02, n=16); b.sphere('glow', (sx * 0.035, -0.85, 0.72), 0.011, n=10)
        b.horn('bone', bez((sx * 0.028, -0.94, 0.69), (sx * 0.03, -0.97, 0.7), (sx * 0.03, -1.0, 0.71), (sx * 0.025, -1.04, 0.72), 6), 0.014, 0, 10)
    for sx in (-1, 1):
        vial(b, (sx * 0.64, -1.03, 0.61), Y, 0.36, 0.06, 20)
        b.torus('bronze', (sx * 0.64, -0.88, 0.61), Y, 0.07, 0.014, 20, 8)
    # ---- tasset: leather tongue with trim, plate cap, hip plates
    ts = plate(b, 'leather', (0, -1.42, 0.585), X, Y, 0.3, 0.46, 0.05, ('shield', 0.65), bulge=(0.06, 0.0), flare=0.07, rim=0.03, nu=14, nv=14)
    trim(b, ts, 0.88, 0.01); rivets(b, ts, [(0, 0.3), (0, 0.05)], 0.022)
    pc, nc = ts.at(0, 0.3, 0.0)
    plate(b, 'plate', (0, -1.1, 0.625), X, Y, 0.34, 0.15, 0.06, ('octa', 0.4), bulge=(0.05, 0.03), rim=0.035, nu=14, nv=8)
    for sx in (-1, 1):
        N = nz(Z * math.cos(math.radians(15)) + X * sx * math.sin(math.radians(15))); U, V = frame(N)
        hp = plate(b, 'plate', (sx * 0.7, -1.3, 0.6), U, V, 0.17, 0.34, 0.05, ('shield', 0.5), bulge=(0.05, 0.0), flare=0.05, rim=0.03, nu=12, nv=14)
        trim(b, hp, 0.86, 0.009)
    return b


def pauldron():
    b = H(); cx, A, Hc = -0.06, 0.6, 0.44; ell = (0.92, 1.0)
    r0 = lambda h: A * math.sqrt(max(1 - (h / Hc) ** 2, 0))
    hbs = [0.0, 0.1, 0.2]; sc = [1.0, 1.045, 1.09]; c0 = np.array([cx, 0.0, 0.0]); U, N = perp(Y)
    for hb, s in zip(hbs, sc):                      # three hollow domed lames, each wider than the one below
        hs = np.linspace(hb, hb + 0.17, 8)
        loop = [(r0(h) * s, h) for h in hs] + [(r0(h) * s - 0.045, h) for h in hs[::-1]]
        R = [[c0 + Y * h + U * (r * ell[0] * math.cos(t)) + N * (r * ell[1] * math.sin(t)) for t in np.linspace(0, TAU, 44, endpoint=False)] for r, h in loop]
        b.rings('plate' if hb != 0.1 else 'iron', R, closed=True)
        b.torus('bronze', c0 + Y * (hb + 0.004), Y, (r0(hb) * s - 0.008), 0.014, 44, 10, ell=ell)
    hc = 0.29; s = 1.135; th0 = math.acos(hc / Hc)
    b.lathe('plate', c0, Y, [(0, Hc)] + [(A * s * math.sin(t), Hc * math.cos(t)) for t in np.linspace(0.12, th0, 9)], 44, ell)
    b.torus('bronze', c0 + Y * (hc + 0.004), Y, r0(hc) * s - 0.008, 0.014, 44, 10, ell=ell)
    b.torus('glow', c0 + Y * (hc - 0.012), Y, r0(hc) * 1.1, 0.011, 44, 6, ell=ell)       # thin acid seam
    # vial on top, tilted out, with bronze collar
    dx = 0.18; top = Hc * math.sqrt(1 - (dx / (A * s * ell[0])) ** 2); d = nz((0.35, 1, 0.1)); vb = np.array([cx + dx, top - 0.05, 0.0])
    vial(b, vb, d, 0.5, 0.075, 24); b.torus('bronze', vb + d * 0.04, d, 0.1, 0.02, 24, 8)
    # curved spikes with bronze rings
    for th in (-60, -5, 55):
        t = math.radians(th); rv = np.array([math.cos(t), 0, math.sin(t)]); h = 0.17
        pt = np.array([cx + r0(h) * 1.045 * ell[0] * math.cos(t), h, r0(h) * 1.045 * ell[1] * math.sin(t)]) - rv * 0.03
        P = bez(pt, pt + rv * .14 + Y * .08, pt + rv * .3 + Y * .2, pt + rv * .42 + Y * .42, 14)
        b.horn('iron', P, 0.07, 0, 20, rings_mat='bronze')
    # rivets round the middle lame
    for th, h, sk in [(th, hb + 0.06, sk) for hb, sk in zip(hbs, sc) for th in np.linspace(-150, 150, 9)]:
        t = math.radians(th); rr = r0(h) * sk
        p = np.array([cx + rr * ell[0] * math.cos(t), h, rr * ell[1] * math.sin(t)]); rvt(b, p, nz((math.cos(t), 0.35, math.sin(t))), 0.024)
    # outer arm-side lames hanging below the dome (curved around the arm)
    for k, (y, hh, cxx) in enumerate(((-0.17, 0.17, 0.465), (-0.42, 0.14, 0.45))):
        pl = plate(b, 'iron' if k else 'plate', (cxx, y, 0), Y, Z, hh, 0.43, 0.05, 'rect', bulge=(0.015, 0.09), rim=0.03, nu=8, nv=14)
        trim(b, pl, 0.84, 0.01)
    for tz, l in ((-0.3, 0.2), (0.05, 0.14), (0.3, 0.22)):
        b.drip('glow', (0.46, -0.52, tz), l, 0.026)
    return b


def build(stage, K):
    if stage == 'cuirass': K.emit('CP', cuirass(), 'Cuirass')
    elif stage == 'pauldrons': K.pair('LS', 'RS', pauldron(), 'Pauldron')
    else: raise ValueError(stage)
