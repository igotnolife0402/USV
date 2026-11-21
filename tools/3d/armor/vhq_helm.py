"""Venomreaver HQ helm: closed plague-mask helm. Skull = rounded-square (superellipse) rings under a domed top, curved mask plate with
centre ridge, two bezelled goggle lenses, long curved beak with bands and vent slits, cheek respirator canisters with hoses,
layered neck lames, crest of curved spikes, bronze trims, rivets, acid drips. Symmetric: details built per side."""
import math
import numpy as np
from hq import H, X, Y, Z, rot, perp, bez, nz

# skull profile (y, half-width a, exponent p): rounded square that encloses the head cube, then a domed top
_KEY = np.array([(-0.70, 0.655, 9), (-0.62, 0.66, 9), (-0.5, 0.67, 8), (-0.4, 0.715, 6), (-0.2, 0.76, 5), (-0.1, 0.775, 4.5), (0.2, 0.78, 4.2), (0.4, 0.775, 4.0), (0.5, 0.765, 3.8)])
_ylo = np.linspace(-0.70, 0.50, 21)
_phi = np.linspace(0, math.radians(87), 15)[1:]
YS = np.concatenate([_ylo, 0.50 + 0.5 * np.sin(_phi)])
AS = np.concatenate([np.interp(_ylo, _KEY[:, 0], _KEY[:, 1]), 0.765 * np.cos(_phi) ** 0.75])
PS = np.concatenate([np.interp(_ylo, _KEY[:, 0], _KEY[:, 2]), 3.8 - 1.8 * np.sin(_phi)])


def ap(y): return float(np.interp(y, YS, AS)), float(np.interp(y, YS, PS))


def sup(y, th, off=0.0):                            # point (+ off along the outward normal) on the skull at height y, angle th (0 = front, +x side positive)
    a, p = ap(y); s, c = math.sin(th), math.cos(th)
    x = a * np.sign(s) * abs(s) ** (2 / p); z = a * np.sign(c) * abs(c) ** (2 / p)
    n = nz((np.sign(x) * abs(x / a) ** (p - 1), 0, np.sign(z) * abs(z / a) ** (p - 1)))
    return np.array([x, y, z]) + n * off, n


def zs(y, x):                                       # skull front z at height y and |x|
    a, p = ap(y); return a * max(1 - (abs(x) / a) ** p, 1e-6) ** (1 / p)


def top_y(z):                                       # skull top height on the centre line at depth z
    m = YS >= 0.3; return float(np.interp(abs(z), AS[m][::-1], YS[m][::-1]))


def build(stage, K):
    b = H(); TH = np.linspace(0, 2 * math.pi, 64, endpoint=False)
    # ---------- skull
    R = [[sup(y, t)[0] for t in TH] for y in YS]
    b.rings('plate', R)
    b.tube('bronze', [sup(-0.64, t, 0.0)[0] for t in TH], 0.026, 10, closed=True)           # collar rim
    b.tube('bronze', [sup(0.665, t, 0.02)[0] for t in np.radians(np.linspace(-112, 112, 28))], 0.03, 10)   # brow band
    for t in np.radians(np.linspace(-108, 108, 7)):
        p, n = sup(0.665, t, 0.04); b.rivet('bronze', p, n, 0.024)
    for t in np.radians(np.linspace(-150, 150, 9)):                                            # lower seam rivets
        if abs(t) < math.radians(40) or abs(abs(t) - math.pi / 2) < math.radians(18): continue
        p, n = sup(-0.55, t, 0.0); b.rivet('bronze', p, n, 0.022)
    for th in (-130, -75, 75, 130):                                                              # dome ribs
        pts = [sup(y, math.radians(th), 0.018)[0] for y in np.linspace(0.6, 0.95, 9)]
        b.tube('iron', pts, [0.026, 0.026, 0.026, 0.024, 0.022, 0.02, 0.016, 0.012, 0.006], 10)
    # ---------- crest: comb ridge + curved spikes
    zs_ = np.linspace(0.58, -0.66, 20); b.tube('iron', [np.array([0, top_y(z) + 0.01, z]) for z in zs_], [0.045] * 20, 12, 1.3)
    for k, (z, L) in enumerate(zip((0.45, 0.22, -0.02, -0.26, -0.5), (0.34, 0.46, 0.52, 0.46, 0.36))):
        B0 = np.array([0, top_y(z) - 0.02, z]); bk = L * (0.25 + 0.14 * k)
        P = bez(B0, B0 + [0, L * 0.45, -0.02], B0 + [0, L * 0.8, -bk * 0.3], B0 + [0, L * 0.88, -bk], 14)
        b.horn('dark', P, 0.062, 0.0, 16, 1.8)
        b.torus('bronze', B0 + [0, 0.05, 0], Y, 0.07, 0.02, 28, 8, ell=(1, 1.8))
    # ---------- mask plate (curved, ridge, rolled rim)
    MH = 0.45; mp = b.plate('iron', (0, 0.0, 0.82), X, Y, 0.646, MH, 0.05, lambda v: 0.5 + 0.25 * (v + 1), bulge=(0.15, 0.09), ridge=0.05, rim=0.03, nu=24, nv=18)
    b.tube('bronze', mp.curve([(x, -MH * 0.9) for x in np.linspace(-0.24, 0.24, 10)], 0.0), 0.012, 8)
    for sx in (-1, 1):
        for v in np.linspace(-0.85, -0.3, 3):
            p, n = mp.at(sx * (0.646 * mp.hw(v) - 0.05), v * MH); b.rivet('bronze', p, n, 0.026)
        b.tube('bronze', mp.curve([(sx * (0.646 * mp.hw(v) - 0.09), v * MH) for v in np.linspace(-0.9, 0.0, 14)], 0.0), 0.014, 8)
    # brow plate
    yb = 0.56; wb = 0.55; cz = ap(yb)[0] + 0.07
    bp = b.plate('plate', (0, yb, cz), X, Y, wb, 0.085, 0.05, 'rect', bulge=(max(cz - zs(yb, wb) - 0.05, 0.02), 0.0), rim=0.03, nu=22, nv=6)
    b.tube('bronze', bp.curve([(x, 0) for x in np.linspace(-wb * 0.9, wb * 0.9, 16)], 0.0), 0.014, 8)
    for x in np.linspace(-0.4, 0.4, 5):
        if abs(x) < 0.05: continue
        p, n = bp.at(x, -0.042); b.rivet('bronze', p, n, 0.02)
    # ---------- goggles
    for sx in (-1, 1):
        P0, n0 = mp.at(sx * 0.32, 0.18); N = nz(n0 + X * sx * 0.22); U, W = perp(N)
        c = P0 - N * 0.03
        b.disc('bronze', c, N, 0.27, 0.16, 0.05)                                                  # bezel (front at +0.05)
        b.disc('dark', c + N * 0.05, N, 0.2, 0.04, 0.012)
        b.disc('glass', c + N * 0.07, N, 0.17, 0.04, 0.02)
        b.disc('glow', c + N * 0.092, N, 0.075, 0.02, 0.008)
        for a in np.linspace(0, 2 * math.pi, 6, endpoint=False):
            b.rivet('bronze', c + N * 0.058 + (U * math.cos(a) + W * math.sin(a)) * 0.23, N, 0.022)
    # ---------- beak (respirator snout)
    P = bez((0, -0.12, 0.8), (0, -0.12, 1.2), (0, -0.3, 1.55), (0, -0.7, 1.62), 24)
    m = len(P); rr = [0.17 * (1 - i / (m - 1)) ** 0.85 + 0.05 for i in range(m)]
    b.tube('plate', P, rr, 22, 0.85)
    T = [nz(P[min(i + 1, m - 1)] - P[max(i - 1, 0)]) for i in range(m)]
    for i in (5, 11, 17, 23):
        b.torus('bronze', P[i], T[i], rr[i] * 1.03, 0.026, 32, 9, ell=(1, 0.85))
    b.torus('bronze', P[m - 1] - T[m - 1] * 0.0, T[m - 1], rr[m - 1] * 1.0, 0.02, 20, 8, ell=(1, 0.85))
    for sx in (-1, 1):
        for i in (4, 5, 6, 11, 12, 13, 18, 19, 20):
            S = nz(np.cross(Y, T[i])) * sx; Vv = np.cross(T[i], S)
            b.rbox('glow', P[i] + S * rr[i] * 0.97, (0.012, rr[i] * 1.1, 0.03), 0.005, frame=(T[i], Vv, S), seg=1)
    b.drip('glass', (0, -0.715, 1.62), 0.26, 0.03)
    # ---------- canisters + hoses
    for sx in (-1, 1):
        base, n = sup(-0.3, sx * math.radians(52), 0.0); d = nz(n + Z * 0.5 - Y * 0.12); c = base - d * 0.03
        b.lathe('bronze', c, d, [(0, 0), (0.16, 0), (0.17, 0.02), (0.17, 0.07), (0.14, 0.09), (0, 0.09)], 28)
        b.lathe('glass', c, d, [(0, 0.08), (0.12, 0.08), (0.135, 0.12), (0.135, 0.31), (0.12, 0.35), (0.09, 0.37), (0, 0.37)], 28)
        b.lathe('glow', c, d, [(0, 0.1), (0.06, 0.1), (0.06, 0.33), (0.035, 0.35), (0, 0.35)], 20)
        b.lathe('bronze', c, d, [(0, 0.34), (0.12, 0.34), (0.15, 0.36), (0.15, 0.41), (0.12, 0.44), (0.07, 0.46), (0.06, 0.49), (0, 0.49)], 28)
        for h in (0.18, 0.27): b.torus('bronze', c + d * h, d, 0.135, 0.017, 28, 8)
        end = c + d * 0.48
        P = bez(end, end + d * 0.25, (sx * 0.85, -0.25, -0.3), (sx * 0.6, -0.57, -0.7), 26)
        b.tube('deep', P, 0.05, 10)
        TT = [nz(P[min(i + 1, 26)] - P[max(i - 1, 0)]) for i in range(27)]
        for i in (3, 14): b.torus('bronze', P[i], TT[i], 0.055, 0.016, 20, 8)
        b.drip('glass', c + d * 0.2 + Y * -0.135, 0.12, 0.022)
    # ---------- ear discs
    for sx in (-1, 1):
        p, n = sup(0.0, sx * math.radians(97), 0.0); U, W = perp(n)
        b.disc('iron', p + n * 0.02, n, 0.2, 0.06, 0.02); b.torus('bronze', p + n * 0.045, n, 0.2, 0.028, 32, 8)
        b.disc('bronze', p + n * 0.07, n, 0.07, 0.04, 0.015)
        for a in np.linspace(0, 2 * math.pi, 4, endpoint=False):
            b.rivet('bronze', p + n * 0.05 + (U * math.cos(a) + W * math.sin(a)) * 0.13, n, 0.022)
    # ---------- neck guard lames
    mats = ['plate', 'iron', 'plate', 'iron', 'plate']
    for k in range(5):
        y = -0.02 - 0.136 * k; w = 0.72 - 0.02 * k; cz = ap(y)[0] + (0.065 + 0.012 * (4 - k) if k < 3 else 0.012 + 0.004 * (4 - k))
        lp = b.plate(mats[k], (0, y, -cz), -X, Y, w, 0.1, 0.05, 'rect', bulge=(max(cz - zs(y, w) - 0.045, 0.02), 0.0), flare=0.05 if k < 3 else 0.0, rim=0.03, nu=24, nv=6, rim_seg=4)
        b.tube('bronze', lp.curve([(x, -0.075) for x in np.linspace(-w * 0.88, w * 0.88, 16)], 0.0), 0.014, 8)
        for x in (-0.3, 0.3):
            p, n = lp.at(x * w / 0.72 * 0.95, 0.02); b.rivet('bronze', p, n, 0.022)
    # ---------- bone spike tips + leather straps under the neck guard
    for k, (z, L) in enumerate(zip((0.45, 0.22, -0.02, -0.26, -0.5), (0.34, 0.46, 0.52, 0.46, 0.36))):
        B0 = np.array([0, top_y(z) - 0.02, z]); bk = L * (0.25 + 0.14 * k)
        P = bez(B0, B0 + [0, L * 0.45, -0.02], B0 + [0, L * 0.8, -bk * 0.3], B0 + [0, L * 0.88, -bk], 14)
        b.horn('bone', P[10:], 0.026, 0.0, 12, 1.8)
    for sx in (-1, 1):
        for x in (0.18, 0.46):
            y0 = -0.62; zz = -(ap(y0)[0] * 0.98)
            b.rbox('leather', (sx * x, -0.64, zz - 0.02), (0.07, 0.1, 0.03), 0.012)
    K.emit('HM', b, 'Helm')
    ext = max(np.abs(v[[0, 2]]).max() for k_, m in b.M.items() if k_ not in ('glass', 'glow') for v in m[0] if v[1] < -0.5 and v[2] < 0.8 and abs(v[0]) < 0.85)
    low = min(v[1] for m in b.M.values() for v in m[0] if v[2] < 0.8 and abs(v[0]) < 0.85)
    print('helm neck clearance: lowest y %.3f (>= -0.7), max |x|,|z| at y<-0.5 %.3f (<= 0.75; beak, drips, canisters/glass excluded)' % (low, ext))
