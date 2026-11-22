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


def trim(b, pl, pts, r=0.011, off=None, mat='bronze'):
    b.tube(mat, pl.curve(pts, r + 0.0005 if off is None else off + r - 0.006), r, 10)


def rv(b, mat, c, N, r):
    b.rivet(mat, np.asarray(c, float) + nz(N) * r * 0.2, N, r)


def studs(b, pl, pts, r=0.03, mat='bronze'):
    for x, y in pts:
        p, n = pl.at(x, y); rv(b, mat, p, n, r)


def vial(b, c, d, h, r, n=18):
    """Glass canister: bronze caps, glass tube, glowing core."""
    d = nz(d); c = np.asarray(c, float); hc = 0.05; hg = h - 2 * hc
    b.lathe('bronze', c, d, [(0, 0), (r * 1.25, 0), (r * 1.25, hc * 0.7), (r * 1.0, hc), (r * 0.9, hc)], n)
    b.lathe('glass', c + d * hc * 0.9, d, [(0, 0), (r * 0.85, 0), (r, 0.03), (r, hg - 0.03), (r * 0.85, hg), (0, hg)], n)
    b.lathe('glow', c + d * hc, d, [(0, 0.02), (r * 0.5, 0.04), (r * 0.5, hg - 0.06), (0, hg - 0.03)], 16)
    b.lathe('bronze', c + d * (h - hc), d, [(r * 0.9, 0), (r * 1.0, 0), (r * 1.25, hc * 0.3), (r * 1.25, hc), (r * 0.6, hc * 1.25), (0, hc * 1.25)], n)


def fan(b, pivot, ang, length, mats, xoff, hw=0.045, front=True):
    """Radial fan wing on an outer side plane x ~ pivot.x: slim tapered plates spreading in the y-z plane."""
    for k, th in enumerate(ang):
        th = math.radians(th); c, s = math.cos(th), math.sin(th)
        V = np.array([0, s, c]) if front else np.array([0, s, -c])
        U = np.array([0, c, -s]) if front else np.array([0, -c, -s])
        ctr = np.asarray(pivot, float) + V * length / 2 + X * (xoff + 0.012 * k)
        b.plate(mats[k % len(mats)], ctr, U, V, hw, length / 2, 0.03, outline=('taper', 1.7), bulge=(0.01, 0.015),
                ridge=0.014, rim=0.016, nu=6, nv=7, rim_seg=2)


def boss(b, p, n, R):
    """Round cop sitting on ONE plate face at p (normal n): iron flange, plate boss, bronze rim, 8 ribs on the boss, gem in a bezel."""
    c = p - n * 0.008; u, v = perp(n)
    b.lathe('iron', c, n, [(0, 0), (R, 0), (R, 0.02), (R * 0.9, 0.045), (R * 0.78, 0.05), (0, 0.05)], 36)
    b.torus('bronze', c + n * 0.014, n, R - 0.004, 0.012, 36, 8)
    prof = [(0, 0.095), (0.36 * R, 0.085), (0.62 * R, 0.05), (0.72 * R, 0.01)]
    b.lathe('plate', c + n * 0.04, n, [(0, 0), (0.72 * R, 0), (0.72 * R, 0.01), (0.62 * R, 0.05), (0.36 * R, 0.085), (0, 0.095)], 32)
    for a in range(0, 360, 45):
        a = math.radians(a); d = u * math.cos(a) + v * math.sin(a)
        pts = [c + n * (0.04 + float(np.interp(r, [q[0] for q in prof][::-1], [q[1] for q in prof][::-1])) + 0.004) + d * r
               for r in np.linspace(0.2 * R, 0.68 * R, 6)]
        b.tube('bronze', pts, 0.007, 8)
    top = c + n * 0.131
    b.sphere('glow', top, 0.03, (1, 1, 0.7), 20, n, 0.5)
    b.torus('bronze', top, n, 0.037, 0.008, 24, 8)


def arms():
    global QG; QG = 0.42
    b = H()
    # --- upper arm: front lames only (the back and outer side are one elbow shell below), rerebrace, forearm
    for k, (y, m) in enumerate(((0.86, 'plate'), (0.70, 'iron'), (0.54, 'plate'))):
        ring(b, m, y, 0.065, g=0.025 + 0.016 * (2 - k), t=0.04, bl=0.04, flare=0.03, rim=0.02, sides='f', nu=12, nv=6)
    # elbow shell: back + outer faces, 0.50..0.90; cop on the back face, fan wing on the outer face, nothing crosses a seam
    E = ring(b, 'plate', 0.70, 0.2, g=0.035, t=0.05, bl=0.06, flare=0.0, rim=0.026, sides='bo', nu=14, nv=10)
    pb, nb = E['b'].at(0, 0); boss(b, pb, nb, 0.16)
    po, no = E['o'].at(0, 0)
    fan(b, po, (-36, -12, 12, 36), 0.2, ('plate', 'iron'), 0.01, 0.042, False)
    b.disc('bronze', po + X * 0.08, X, 0.05, 0.05, n=32); b.disc('iron', po + X * 0.115, X, 0.025, 0.04, n=24)
    pd, nd = E['b'].at(0.25, -E['b'].h)                  # glow drip hanging from the lower edge of the elbow shell
    b.drip('glow', pd - nd * 0.025, 0.07, 0.024)
    # rerebrace
    P = ring(b, 'plate', 1.14, 0.2, g=0.04, t=0.05, bl=0.06, flare=0.03, rim=0.026, ridge=0.025, nu=14, nv=10)
    f, o = P['f'], P['o']
    trim(b, f, [(x, 0.78 * f.h) for x in np.linspace(-0.45, 0.45, 9)], 0.011)
    trim(b, f, [(x, -0.76 * f.h) for x in np.linspace(-0.45, 0.45, 9)], 0.011)
    trim(b, f, [(0, y) for y in np.linspace(-0.6 * f.h, 0.6 * f.h, 6)], 0.007, 0.004, 'glow')
    studs(b, f, [(sx * 0.46, sy * 0.72 * f.h) for sx in (-1, 1) for sy in (-1, 1)], 0.028)
    studs(b, o, [(sx * 0.4, 0.0) for sx in (-1, 1)], 0.026)
    ring(b, 'bronze', 1.355, 0.02, g=0.04, t=0.035, bl=0.04, rim=0.02, nu=14, nv=3)
    ring(b, 'iron', 0.965, 0.03, g=0.05, t=0.035, bl=0.04, rim=0.02, nu=14, nv=3)
    # --- forearm shell
    P = ring(b, 'plate', 0.15, 0.27, g=0.03, t=0.05, bl=0.07, flare=0.03, rim=0.028, ridge=0.03, nu=18, nv=12)
    f, o = P['f'], P['o']
    trim(b, f, [(x, 0.8 * f.h) for x in np.linspace(-0.45, 0.45, 9)], 0.012)
    trim(b, f, [(x, -0.78 * f.h) for x in np.linspace(-0.45, 0.45, 9)], 0.012)
    trim(b, f, [(0, y) for y in np.linspace(-0.62 * f.h, 0.62 * f.h, 6)], 0.008, 0.004, 'glow')
    studs(b, f, [(sx * 0.46, sy * 0.76 * f.h) for sx in (-1, 1) for sy in (-1, 1)], 0.03)
    studs(b, o, [(sx * 0.4, 0.78 * o.h) for sx in (-1, 1)] + [(sx * 0.4, -0.78 * o.h) for sx in (-1, 1)], 0.026)
    ring(b, 'bronze', 0.445, 0.022, g=0.04, t=0.035, bl=0.04, rim=0.02, nu=14, nv=3, sides='fio')
    ring(b, 'bronze', -0.145, 0.022, g=0.04, t=0.035, bl=0.04, rim=0.02, nu=14, nv=3)
    # outer forearm spikes on the back half (z < 0); the vial owns the front half
    for (xx, yy, ln) in ((0.12, 0.06, 0.28), (0.26, -0.08, 0.22)):
        p, n = o.at(xx, yy, 0.0)
        rv(b, 'bronze', p, n, 0.05)
        b.horn('iron', bez(p, p + n * 0.1 + Y * 0.01, p + n * ln * 0.55 - Z * 0.06 + Y * 0.06, p + n * ln * 0.8 - Z * 0.2 + Y * 0.12, 6), 0.04, 0.0, 18, 0.9)
    # --- injector vial on the outer forearm (front half), brackets, hose to a bracket on the elbow shell
    vz = 0.22; pv, _ = o.at(-vz, 0.0); fx = pv[0]; vx = fx + 0.1
    vial(b, (vx, -0.1, vz), Y, 0.5, 0.075)
    for y in (0.0, 0.34):
        b.torus('bronze', (vx, y, vz), Y, 0.078, 0.014, 32, 10)
        b.rbox('bronze', (fx + 0.055, y, vz), (0.13, 0.05, 0.1), 0.015, seg=2)
    pe, _ = E['o'].at(-vz, -0.08); ex = pe[0]; ye = pe[1]
    b.tube('deep', bez((vx, 0.41, vz), (vx, 0.5, vz), (ex + 0.13, ye - 0.02, vz), (ex + 0.035, ye, vz), 10), 0.022, 14)
    b.rbox('bronze', (ex + 0.032, ye, vz), (0.06, 0.07, 0.07), 0.02, seg=2)
    # --- gauntlet: cuff, side/back hand guards, layered finger lames, bone claws
    P = ring(b, 'iron', -0.24, 0.075, g=0.05, t=0.045, bl=0.035, rim=0.026, nu=14, nv=6)
    studs(b, P['f'], [(sx * 0.4, 0.0) for sx in (-1, 1)], 0.028)
    ring(b, 'plate', -0.4, 0.105, g=0.02, t=0.04, bl=0.04, rim=0.022, sides='bo', nu=16, nv=10)
    for x in (-0.39, -0.13, 0.13, 0.39):
        for k in range(3):
            y = -0.335 - 0.065 * k
            b.plate('plate' if k % 2 == 0 else 'iron', (x, y, 0.5 + 0.02 + 0.02 + 0.014 * k), X, Y, 0.12, 0.048, 0.03, bulge=(0.02, 0.008),
                    ridge=0.012, flare=0.02, rim=0.016, nu=6, nv=3, rim_seg=2)
        b.horn('bone', bez((x, -0.46, 0.58), (x, -0.58, 0.64), (x, -0.7, 0.66), (x, -0.8, 0.8), 7), 0.055, 0.0, 20, 0.55)
    b.drip('glow', (0.26, -0.505, 0.575), 0.14, 0.026); b.drip('glow', (-0.26, -0.505, 0.575), 0.12, 0.022)
    return b


def legs():
    global QG; QG = 0.35
    g = H()
    # --- cuisse 0.47..0.81 (trims route inside it), hem band, strap with buckle in the gap below it
    P = ring(g, 'plate', 0.64, 0.17, hx=0.44, g=0.03, t=0.05, bl=0.06, flare=0.03, rim=0.028, ridge=0.03, nu=18, nv=12)
    f, o = P['f'], P['o']
    trim(g, f, [(x, 0.8 * f.h) for x in np.linspace(-0.45, 0.45, 9)], 0.012)
    trim(g, f, [(x, -0.78 * f.h) for x in np.linspace(-0.45, 0.45, 9)], 0.012)
    trim(g, f, [(0, y) for y in np.linspace(-0.6 * f.h, 0.6 * f.h, 6)], 0.008, 0.004, 'glow')
    studs(g, f, [(sx * 0.46, sy * 0.62 * f.h) for sx in (-1, 1) for sy in (-1, 1)], 0.03)
    studs(g, o, [(sx * 0.4, 0.0) for sx in (-1, 1)], 0.026)
    ring(g, 'bronze', 0.83, 0.022, hx=0.44, g=0.04, t=0.035, bl=0.04, rim=0.02, nu=14, nv=3)
    Ps = ring(g, 'leather', 0.42, 0.024, hx=0.44, g=0.085, t=0.025, bl=0.06, rim=0.0125, nu=14, nv=3)
    p, n = Ps['f'].at(0.1, 0.0)
    g.rbox('bronze', p + n * 0.008, (0.12, 0.07, 0.03), 0.012, seg=2); g.rbox('deep', p + n * 0.024, (0.06, 0.04, 0.02), 0.008, seg=2)
    rv(g, 'bronze', p + n * 0.032, n, 0.014)
    q, m2 = Ps['f'].at(0.34, 0.0); rv(g, 'bronze', q, m2, 0.017)
    # --- knee: one shell (front + outer, deep sleeve behind) -0.05..0.37 carrying the cop and the fan wing
    ring(g, 'deep', 0.16, 0.21, hx=0.44, g=0.03, t=0.05, bl=0.06, rim=0.026, sides='b', nu=12, nv=6)
    K = ring(g, 'plate', 0.16, 0.21, hx=0.44, g=0.03, t=0.05, bl=0.06, flare=0.0, rim=0.026, sides='foi', nu=14, nv=8)
    pk, nk = K['f'].at(0, 0); boss(g, pk, nk, 0.17)
    po, _ = K['o'].at(0, 0)
    fan(g, po, (-36, -12, 12, 36), 0.19, ('plate', 'iron'), 0.01, 0.042, True)
    g.disc('bronze', po + X * 0.08, X, 0.05, 0.05, n=32)
    # --- greave shell -0.45..-0.05 with front ridge, calf vial behind the fan
    P = ring(g, 'plate', -0.25, 0.2, hx=0.44, g=0.03, t=0.05, bl=0.06, flare=0.035, rim=0.028, ridge=0.06, nu=20, nv=14, sides='fboi')
    f, o = P['f'], P['o']
    trim(g, f, [(x, 0.8 * f.h) for x in np.linspace(-0.45, 0.45, 9)], 0.012)
    trim(g, f, [(0, y) for y in np.linspace(-0.6 * f.h, 0.6 * f.h, 6)], 0.008, 0.004, 'glow')
    studs(g, f, [(sx * 0.46, sy * 0.76 * f.h) for sx in (-1, 1) for sy in (-1, 1)], 0.03)
    Pb = ring(g, 'bronze', -0.462, 0.02, hx=0.44, g=0.04, t=0.035, bl=0.04, rim=0.02, nu=14, nv=3)
    vz = -0.2; pv, _ = o.at(-vz, 0.0); fx = pv[0]; vx = fx + 0.1
    vial(g, (vx, -0.43, vz), Y, 0.36, 0.075)
    for y in (-0.37, -0.13):
        g.torus('bronze', (vx, y, vz), Y, 0.078, 0.014, 24, 8)
        g.rbox('bronze', (fx + 0.055, y, vz), (0.13, 0.05, 0.1), 0.015, seg=2)
    studs(g, o, [(sx * 0.4, 0.0) for sx in (-1, 1)], 0.026)
    pd, nd = Pb['f'].at(0.2, -Pb['f'].h)                 # drip from the lower edge of the greave
    g.drip('glow', pd - nd * 0.0175, 0.16, 0.028)
    return g


def sabaton():
    """Armoured boot on the foot block (x +-0.5, y -0.34..0.36, z -0.56..0.44, toe +z): outline sole + raised heel, rounded closed toe
    dome (ends 0.15 past the block), 3 shingled instep lames stepping down onto it, side/heel shell, ankle cuff, rivets, heel spur."""
    s = H(); cz = -0.06
    zs = np.linspace(-0.649, 0.589, 60)

    def wid(z):                                        # half-width of the sole outline
        if z < -0.45: return 0.56 * math.sqrt(max(1 - ((-0.45 - z) / 0.2) ** 2, 0.0)) ** 0.7
        if z < 0.05: return 0.56 + 0.04 * (z + 0.45) / 0.5
        return 0.60 * max(1 - ((z - 0.05) / 0.54) ** 2.4, 0.0) ** 0.42
    pts = [(0.09 + wid(z), z) for z in zs] + [(0.09 - wid(z), z) for z in zs[::-1]]
    s.extrude('dark', (0, -0.355, 0), X, Z, pts, 0.07, bevel=0.025, seg=3)
    s.rbox('dark', (0, -0.285, -0.42), (0.9, 0.075, 0.4), 0.03, seg=2)           # raised heel block
    # side / heel shell + cuff
    ring(s, 'bronze', 0.33, 0.022, hx=0.44, cz=cz, g=0.04, t=0.035, bl=0.04, rim=0.02, nu=14, nv=3)
    Pi = ring(s, 'iron', -0.17, 0.09, hx=0.44, cz=cz, g=0.025, t=0.045, bl=0.04, rim=0.024, sides='boi', nu=14, nv=6)
    P = ring(s, 'plate', 0.12, 0.17, hx=0.44, cz=cz, g=0.03, t=0.05, bl=0.05, rim=0.027, flare=0.03, sides='boi', nu=16, nv=10)
    o = P['o']
    studs(s, o, [(sx * 0.36, 0.55 * o.h) for sx in (-1, 1)], 0.026)
    # toe dome (inside the shell, front tip 0.59) + shingled instep lames riding down onto it
    s.sphere('plate', (0, -0.31, 0.25), 0.34, (1.38, 0.76, 1.0), 36, Y, 0.5)
    for k, (y, z, al, m) in enumerate(((0.19, 0.46, 12, 'plate'), (0.06, 0.48, 18, 'iron'), (-0.06, 0.50, 26, 'plate'))):
        a = math.radians(al); V = np.array([0, math.cos(a), -math.sin(a)])
        Pk = s.plate(m, (0, y, z), X, V, 0.46, 0.11, 0.04, bulge=(0.07, 0.01), ridge=0.02, rim=0.022, nu=12, nv=4, rim_seg=3)
        for sg in (-1, 1):
            p, n = Pk.at(sg * 0.34, 0.0); rv(s, 'bronze', p, n, 0.024)
        if k == 1:
            p, n = Pk.at(0, 0.0); rv(s, 'glow', p, n, 0.03)
    # heel spur rooted on the back plate
    p, n = Pi['b'].at(0, 0.0)
    s.horn('iron', bez(p - n * 0.01, p + n * 0.04, p + n * 0.1 - Y * 0.03, p + n * 0.16 - Y * 0.1, 6), 0.035, 0.0, 18, 0.8)
    return s


def build(stage, K):
    if stage == 'arms':
        K.pair('LV', 'RV', arms(), 'Vambrace')
    elif stage == 'legs':
        K.pair('LG', 'RG', legs(), 'Greave')
        K.pair('LB', 'RB', sabaton(), 'Sabaton')
