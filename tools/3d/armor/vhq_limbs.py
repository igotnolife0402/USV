"""Venomreaver HQ limbs: vambraces + gauntlets (LV/RV), cuisses + knee cops + greaves (LG/RG), sabatons (LB/RB).
Left (+x) pieces are built, K.pair mirrors them. Frames: LV arm y -0.5..1.5 (hand end -0.5), LG leg y -1.15..0.85 (armour y > -0.45),
LB foot block y -0.34..0.36 z -0.56..0.44. build(stage, K) with stage 'arms' | 'legs'."""
import math
import numpy as np
from hq import H, X, Y, Z, rot, perp, bez, nz


QG = 0.5                                            # plate grid scale: balances detail vs the 60k-triangle stage budget


def ring(b, mat, y, h, hx=0.5, hz=0.5, cz=0.0, g=0.03, t=0.05, bl=0.05, sides='fbos', flare=0.0, rim=None, ridge=0.0,
         nu=16, nv=10, rs=4):
    """Four curved plates wrapped round a box section centred (0, y, cz): f front +z, b back, o outer +x, i inner -x.
    Inner faces clear the body by g everywhere (bulge bl across, 0.3*bl along)."""
    nu = max(6, round(nu * QG)); nv = max(2, round(nv * QG)); rs = max(2, rs - 1)
    bv = bl * 0.3; e = g + t / 2 + bl + bv; P = {}
    kw = dict(t=t, rim=rim or t / 2, nu=nu, nv=nv, rim_seg=rs, flare=flare)
    if 'f' in sides: P['f'] = b.plate(mat, (0, y, cz + hz + e), X, Y, hx + g + t / 2, h, bulge=(bl, bv), ridge=ridge, **kw)
    if 'b' in sides: P['b'] = b.plate(mat, (0, y, cz - hz - e), -X, Y, hx + g + t / 2, h, bulge=(bl, bv), **kw)
    if 'o' in sides: P['o'] = b.plate(mat, (hx + e, y, cz), -Z, Y, hz + g + t / 2, h, bulge=(bl, bv), **kw)
    if 'i' in sides: P['i'] = b.plate(mat, (-hx - e, y, cz), Z, Y, hz + g + t / 2, h, bulge=(bl, bv), **kw)
    return P


def trim(b, pl, pts, r=0.011, off=0.006, mat='bronze'):
    b.tube(mat, pl.curve(pts, off), r, 10)


def rv(b, mat, c, N, r):
    b.rivet(mat, c, N, r)


def studs(b, pl, pts, r=0.03, mat='bronze'):
    for x, y in pts:
        p, n = pl.at(x, y); rv(b, mat, p, n, r)


def vial(b, c, d, h, r, n=22):
    """Glass canister: bronze caps, glass tube, glowing core."""
    d = nz(d); c = np.asarray(c, float); hc = 0.05; hg = h - 2 * hc
    b.lathe('bronze', c, d, [(0, 0), (r * 1.25, 0), (r * 1.25, hc * 0.7), (r * 1.0, hc), (r * 0.9, hc)], n)
    b.lathe('glass', c + d * hc * 0.9, d, [(0, 0), (r * 0.85, 0), (r, 0.03), (r, hg - 0.03), (r * 0.85, hg), (0, hg)], n)
    b.lathe('glow', c + d * hc, d, [(0, 0.02), (r * 0.5, 0.04), (r * 0.5, hg - 0.06), (0, hg - 0.03)], 16)
    b.lathe('bronze', c + d * (h - hc), d, [(r * 0.9, 0), (r * 1.0, 0), (r * 1.25, hc * 0.3), (r * 1.25, hc), (r * 0.6, hc * 1.25), (0, hc * 1.25)], n)


def fan(b, pivot, ang, length, mats, xoff, sx, front):
    """Radial fan wing on an outer side plane x ~ pivot.x: slim tapered plates spreading in the y-z plane."""
    for k, th in enumerate(ang):
        th = math.radians(th); c, s = math.cos(th), math.sin(th)
        V = np.array([0, s, c]) if front else np.array([0, s, -c])
        U = np.array([0, c, -s]) if front else np.array([0, -c, -s])
        ctr = np.asarray(pivot, float) + V * length / 2 + X * (xoff + 0.012 * k)
        b.plate(mats[k % len(mats)], ctr, U, V, 0.065, length / 2, 0.03, outline=('taper', 1.7), bulge=(0.015, 0.02),
                ridge=0.018, rim=0.016, nu=6, nv=9, rim_seg=2)


def arms():
    b = H()
    # --- upper-arm lames (covered by the pauldron from y ~0.9)
    for k, (y, m) in enumerate(((0.86, 'plate'), (0.70, 'iron'), (0.54, 'plate'))):
        P = ring(b, m, y, 0.095, g=0.025 + 0.016 * (2 - k), t=0.04, bl=0.04, flare=0.03, rim=0.02, sides='fbos' if k < 2 else 'fos', nu=12, nv=6)
        studs(b, P['o'], [(-0.3, 0.0), (0.3, 0.0)], 0.022) if k == 1 else None
    # --- elbow cop: iron saucer, domed plate, bronze rim, gem, fan wing on the outer side
    b.sphere('iron', (0, 0.46, -0.515), 0.3, (1, 1, 0.42), 30, -Z, 0.5)
    b.sphere('plate', (0, 0.46, -0.545), 0.22, (1, 1, 0.8), 30, -Z, 0.5)
    b.torus('bronze', (0, 0.46, -0.52), Z, 0.3, 0.022, 32, 10)
    b.torus('bronze', (0, 0.46, -0.55), Z, 0.22, 0.016, 32, 10)
    b.sphere('glow', (0, 0.46, -0.715), 0.045, (1, 1, 0.7), 20, -Z)
    b.torus('bronze', (0, 0.46, -0.712), Z, 0.05, 0.013, 32, 10)
    for a in range(0, 360, 45):
        a = math.radians(a)
        pts = [np.array([0.2 * math.sin(al) * math.cos(a) * 1.0, 0.46 + 0.2 * math.sin(al) * math.sin(a), -0.545 - 0.176 * math.cos(al) - 0.012])
               for al in np.linspace(0.45, 1.4, 7)]
        b.tube('bronze', pts, 0.009, 8)
    fan(b, (0.6, 0.46, -0.1), (-48, -24, 0, 24, 48), 0.42, ('plate', 'iron'), 0.075, 1, False)
    b.disc('bronze', (0.64, 0.46, -0.1), X, 0.07, 0.05, n=36); b.disc('iron', (0.68, 0.46, -0.1), X, 0.035, 0.07, n=24)
    # --- forearm shell
    P = ring(b, 'plate', 0.15, 0.27, g=0.03, t=0.05, bl=0.07, flare=0.03, rim=0.028, ridge=0.03, nu=18, nv=12)
    f, o = P['f'], P['o']
    trim(b, f, [(x, 0.8 * f.h - 0.015 * (x / f.w) ** 2 * 0) for x in np.linspace(-0.45, 0.45, 9)], 0.012)
    trim(b, f, [(x, -0.78 * f.h) for x in np.linspace(-0.45, 0.45, 9)], 0.012)
    trim(b, f, [(0, y) for y in np.linspace(-0.62 * f.h, 0.62 * f.h, 6)], 0.008, 0.004, 'glow')
    studs(b, f, [(sx * 0.46, sy * 0.76 * f.h) for sx in (-1, 1) for sy in (-1, 1)], 0.03)
    studs(b, o, [(sx * 0.4, 0.78 * o.h) for sx in (-1, 1)] + [(sx * 0.4, -0.78 * o.h) for sx in (-1, 1)], 0.026)
    for y in (0.445, -0.145):
        ring(b, 'bronze', y, 0.022, g=0.04, t=0.035, bl=0.04, rim=0.02, nu=14, nv=3)
    # --- outer forearm spikes
    for (xx, yy, ln) in ((-0.42, 0.28, 0.25), (-0.2, 0.0, 0.3), (-0.5, -0.02, 0.2)):
        p, n = o.at(xx, yy, 0.0)
        rv(b, 'bronze', p, n, 0.058)
        b.horn('iron', bez(p, p + n * 0.1 + Y * 0.01, p + n * ln * 0.55 - Z * 0.06 + Y * 0.06, p + n * ln * 0.8 - Z * 0.2 + Y * 0.12, 6), 0.045, 0.0, 18, 0.9)
    # --- injector vial on the outer forearm (front half), brackets, hose to the upper-arm lames
    vx, vz = 0.77, 0.22
    vial(b, (vx, -0.1, vz), Y, 0.5, 0.075)
    for y in (0.0, 0.34):
        b.torus('bronze', (vx, y, vz), Y, 0.078, 0.014, 32, 10)
        b.rbox('bronze', (vx - 0.07, y, vz), (0.18, 0.05, 0.1), 0.015)
    b.tube('deep', bez((vx, 0.45, vz), (vx, 0.55, vz), (vx - 0.04, 0.62, vz - 0.04), (0.62, 0.64, vz - 0.06), 10), 0.022, 14)
    b.rbox('bronze', (0.63, 0.64, vz - 0.06), (0.07, 0.07, 0.07), 0.02)
    # --- gauntlet: cuff, side/back hand guards, layered finger lames, bone claws
    P = ring(b, 'iron', -0.24, 0.075, g=0.05, t=0.045, bl=0.035, rim=0.026, nu=14, nv=6)
    studs(b, P['f'], [(sx * 0.4, 0.0) for sx in (-1, 1)], 0.028)
    ring(b, 'plate', -0.4, 0.105, g=0.02, t=0.04, bl=0.04, rim=0.022, sides='bio', nu=16, nv=10)
    for x in (-0.39, -0.13, 0.13, 0.39):
        for k in range(3):
            y = -0.335 - 0.065 * k
            b.plate('plate' if k % 2 == 0 else 'iron', (x, y, 0.5 + 0.02 + 0.02 + 0.014 * k), X, Y, 0.12, 0.048, 0.03, bulge=(0.02, 0.008),
                    ridge=0.012, flare=0.02, rim=0.016, nu=6, nv=3, rim_seg=2)
        b.horn('bone', bez((x, -0.46, 0.58), (x, -0.58, 0.64), (x, -0.7, 0.66), (x, -0.8, 0.8), 7), 0.055, 0.0, 20, 0.55)
    b.drip('glow', (0.13, -0.5, 0.64), 0.2, 0.03); b.drip('glow', (-0.39, -0.5, 0.62), 0.13, 0.024)
    b.drip('glow', (0.1, 0.19, -0.66), 0.2, 0.03)
    return b


def legs():
    g = H()
    # --- cuisse shell + hem bands + lames
    P = ring(g, 'plate', 0.57, 0.24, g=0.03, t=0.05, bl=0.06, flare=0.03, rim=0.028, ridge=0.03, nu=18, nv=12)
    f, o = P['f'], P['o']
    trim(g, f, [(x, 0.8 * f.h) for x in np.linspace(-0.45, 0.45, 9)], 0.012)
    trim(g, f, [(x, -0.78 * f.h) for x in np.linspace(-0.45, 0.45, 9)], 0.012)
    trim(g, f, [(0, y) for y in np.linspace(-0.6 * f.h, 0.6 * f.h, 6)], 0.008, 0.004, 'glow')
    studs(g, f, [(sx * 0.46, sy * 0.74 * f.h) for sx in (-1, 1) for sy in (-1, 1)], 0.03)
    studs(g, o, [(sx * 0.4, sy * 0.74 * o.h) for sx in (-1, 1) for sy in (-1, 1)], 0.026)
    ring(g, 'bronze', 0.83, 0.022, g=0.04, t=0.035, bl=0.04, rim=0.02, nu=14, nv=3)
    for k, (y, m) in enumerate(((0.28, 'iron'), (0.185, 'plate'))):
        ring(g, m, y, 0.055, g=0.035 + 0.012 * (1 - k), t=0.04, bl=0.04, flare=0.03, rim=0.02, nu=14, nv=6)
    # --- straps with bronze buckles
    for y in (0.45, -0.36):
        Ps = ring(g, 'leather', y, 0.032, g=0.085, t=0.025, bl=0.06, rim=0.0125, nu=14, nv=3)
        p, n = Ps['f'].at(0.1, 0.0)
        g.rbox('bronze', p + n * 0.012, (0.13, 0.11, 0.035), 0.012); g.rbox('deep', p + n * 0.03, (0.07, 0.065, 0.02), 0.008)
        rv(g, 'bronze', p + n * 0.04, n, 0.018)
        for dx in (0.3, 0.38):
            q, m2 = Ps['f'].at(dx, 0.0); rv(g, 'bronze', q, m2, 0.017)
    # --- knee: sleeve, domed cop with ribs, gem, spike, radial fan wing
    ring(g, 'deep', 0.115, 0.07, g=0.02, t=0.04, bl=0.01, rim=0.02, nu=12, nv=4)
    g.sphere('iron', (0, 0.12, 0.505), 0.34, (1, 1, 0.38), 32, Z, 0.5)
    g.sphere('plate', (0, 0.12, 0.535), 0.26, (1, 1, 0.62), 32, Z, 0.5)
    g.torus('bronze', (0, 0.12, 0.51), Z, 0.34, 0.022, 32, 10)
    g.torus('bronze', (0, 0.12, 0.54), Z, 0.26, 0.017, 32, 10)
    for a in range(0, 360, 45):
        a = math.radians(a)
        pts = [np.array([0.26 * math.sin(al) * math.cos(a), 0.12 + 0.26 * math.sin(al) * math.sin(a), 0.535 + 0.161 * math.cos(al) + 0.011])
               for al in np.linspace(0.5, 1.5, 7)]
        g.tube('bronze', pts, 0.009, 8)
    g.sphere('glow', (0, 0.12, 0.69), 0.06, (1, 1, 0.7), 20, Z)
    g.torus('bronze', (0, 0.12, 0.688), Z, 0.065, 0.015, 32, 10)
    g.horn('iron', bez((0, 0.36, 0.62), (0, 0.5, 0.66), (0, 0.58, 0.72), (0, 0.64, 0.84), 7), 0.06, 0.0, 20, 0.8)
    fan(g, (0.62, 0.12, 0.0), (-55, -27, 0, 27, 55), 0.4, ('plate', 'iron'), 0.075, 1, True)
    g.disc('bronze', (0.65, 0.12, 0.0), X, 0.07, 0.05, n=36)
    # --- greave shell with front ridge, calf vial
    P = ring(g, 'plate', -0.2, 0.25, g=0.03, t=0.05, bl=0.06, flare=0.035, rim=0.028, ridge=0.06, nu=20, nv=14)
    f, o = P['f'], P['o']
    trim(g, f, [(x, 0.8 * f.h) for x in np.linspace(-0.45, 0.45, 9)], 0.012)
    trim(g, f, [(0, y) for y in np.linspace(-0.6 * f.h, 0.6 * f.h, 6)], 0.008, 0.004, 'glow')
    studs(g, f, [(sx * 0.46, sy * 0.76 * f.h) for sx in (-1, 1) for sy in (-1, 1)], 0.03)
    for y in (0.065, -0.462):
        ring(g, 'bronze', y, 0.02, g=0.04, t=0.035, bl=0.04, rim=0.02, nu=14, nv=3)
    vx, vz = 0.78, 0.1
    vial(g, (vx, -0.4, vz), Y, 0.46, 0.08)
    for y in (-0.34, -0.04):
        g.torus('bronze', (vx, y, vz), Y, 0.083, 0.014, 32, 10)
        g.rbox('bronze', (vx - 0.07, y, vz), (0.18, 0.05, 0.1), 0.015)
    g.tube('deep', bez((vx, 0.07, vz), (vx, 0.15, vz), (0.74, 0.2, vz - 0.02), (0.67, 0.2, vz - 0.04), 10), 0.022, 14)
    trim(g, o, [(x, 0.78 * o.h) for x in np.linspace(-0.45, 0.45, 9)], 0.011)
    trim(g, o, [(x, -0.78 * o.h) for x in np.linspace(-0.45, 0.45, 9)], 0.011)
    studs(g, o, [(sx * 0.4, sy * 0.76 * o.h) for sx in (-1, 1) for sy in (-1, 1)], 0.026)
    trim(g, f, [(sx * 0.62 * f.w, y) for sx in (-1, 1) for y in np.linspace(-0.7 * f.h, 0.7 * f.h, 7)][::1] if False else [(0.28 * f.w + 0.0 * y, y) for y in np.linspace(-0.7 * f.h, 0.7 * f.h, 7)], 0.009)
    trim(g, f, [(-0.28 * f.w, y) for y in np.linspace(-0.7 * f.h, 0.7 * f.h, 7)], 0.009)
    g.drip('glow', (0.2, -0.46, 0.6), 0.18, 0.03)
    g.drip('glow', (-0.3, 0.07, 0.62), 0.14, 0.026)
    return g


def sabaton():
    s = H(); cz = -0.06
    # sole, side and back shell, front lames, toe cap
    s.rbox('dark', (0, -0.355, 0.22), (1.12, 0.07, 1.6), 0.03)
    ring(s, 'bronze', 0.33, 0.022, cz=cz, g=0.04, t=0.035, bl=0.04, rim=0.02, nu=14, nv=3)
    ring(s, 'iron', -0.22, 0.12, cz=cz, g=0.025, t=0.045, bl=0.04, rim=0.024, sides='boi', nu=14, nv=6)
    P = ring(s, 'plate', 0.1, 0.19, cz=cz, g=0.03, t=0.05, bl=0.05, rim=0.027, flare=0.03, sides='boi', nu=16, nv=10)
    o = P['o']
    studs(s, o, [(sx * 0.36, sy * 0.7 * o.h) for sx in (-1, 1) for sy in (-1, 1)], 0.026)
    for k, (y, m) in enumerate(((0.265, 'plate'), (0.14, 'iron'), (0.015, 'plate'), (-0.11, 'iron'), (-0.235, 'plate'))):
        Pk = ring(s, m, y, 0.075, cz=cz, g=0.02 + 0.012 * (4 - k), t=0.04, bl=0.04, rim=0.022, flare=0.025, sides='f', nu=14, nv=6)
        if k == 0: trim(s, Pk['f'], [(x, 0.82 * Pk['f'].h) for x in np.linspace(-0.45, 0.45, 9)], 0.01)
    tc = s.plate('plate', (0, -0.15, 0.68), X, -Z, 0.5, 0.36, 0.05, outline=('shield', 0.6), bulge=(0.19, 0.09), ridge=0.05, rim=0.028,
                 nu=16, nv=12, rim_seg=3)
    trim(s, tc, [(0, v * tc.h) for v in np.linspace(-0.8, 0.6, 8)], 0.008, 0.003, 'glow')
    for sg in (-1, 1):
        trim(s, tc, [(sg * 0.8 * tc.w * tc.hw(v), v * tc.h) for v in np.linspace(-0.75, 0.75, 9)], 0.011)
    studs(s, tc, [(sg * 0.38, 0.55 * tc.h) for sg in (-1, 1)], 0.028)
    p, n = tc.at(0, -0.97 * tc.h)
    s.horn('iron', bez(p - Z * 0.02, p + Z * 0.08, p + Z * 0.17 + Y * 0.03, p + Z * 0.28 + Y * 0.09, 6), 0.05, 0.0, 20, 0.75)
    # heel spur + side spur
    s.horn('iron', bez((0, -0.08, -0.6), (0, -0.12, -0.74), (0, -0.2, -0.86), (0, -0.36, -0.94), 7), 0.07, 0.0, 20, 0.8)
    rv(s, 'bronze', (0, -0.08, -0.67), -Z, 0.065)
    p, n = o.at(0.1, 0.0)
    rv(s, 'bronze', p, n, 0.05)
    s.horn('iron', bez(p, p + n * 0.1, p + n * 0.15 - Z * 0.07 + Y * 0.04, p + n * 0.2 - Z * 0.17 + Y * 0.09, 6), 0.045, 0.0, 18, 0.9)
    s.drip('glow', (0.2, -0.3, 0.8), 0.14, 0.026)
    return s


def build(stage, K):
    if stage == 'arms':
        K.pair('LV', 'RV', arms(), 'Vambrace')
    elif stage == 'legs':
        K.pair('LG', 'RG', legs(), 'Greave')
        K.pair('LB', 'RB', sabaton(), 'Sabaton')
