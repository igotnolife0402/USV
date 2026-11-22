#!/usr/bin/env python3
"""Shadow monster, ~23 studs tall, smooth skin (rig.make smooth=True; painted in 0.125-stud blocks, meshed smooth).
Gaunt hunched body of living shadow: a long skull split by a glowing crescent grin of fangs, six slit eyes, back-swept horns,
a cracked glowing core feeding purple veins down the limbs, ribs, spine spikes, shadow wisps rising off the back and
shoulders with faint glowing tips, a tattered smoke skirt, a spiked tail, long clawed hands and clawed feet.
Idle sway + breathing; every 5-9 s it lunges with a screech (jaw open, arms spread). No VFX (model only).
Usage: python3 shadow.py <outdir>"""
import sys
import numpy as np
from rig import make

SC, BLOCK = 1.0, 0.125
PAL = [None, ('Shadow', '#221934', 's'), ('Shadow', '#3a2b56', 's'), ('Shadow', '#150f21', 's'), ('Shadow', '#08060d', 's'),
       ('Smoke', '#241a36', 's'), ('Smoke', '#3b2b5c', 's'), ('Wisp', '#9a6bff', 'n'),
       ('Horn', '#16121e', 's'), ('Horn', '#3a3150', 's'), ('Claw', '#0a0810', 's'),
       ('Eye', '#c38dff', 'n'), ('Core', '#a764ff', 'n'), ('Teeth', '#d6cbe8', 's'), ('Mouth', '#6c25d6', 'n'), ('Vein', '#7a3fe0', 'n')]
SH, SH2, SH3, SHD, SM, SM2, WS, HO, HO2, CL, EYE, CORE, TEETH, MOUTH, VEIN = range(1, 16)

SEG = [('Hips', None, (0, 10.6, 0)), ('Chest', 'Hips', (0, 12.2, 0.4)), ('Head', 'Chest', (0, 17.2, 2.4)), ('Jaw', 'Head', (0, 17.6, 3.4)),
       ('UpperArmR', 'Chest', (-3.7, 16.0, 1.5)), ('ForearmR', 'UpperArmR', (-5.0, 11.6, 2.2)), ('HandR', 'ForearmR', (-5.5, 7.0, 3.1)),
       ('UpperArmL', 'Chest', (3.7, 16.0, 1.5)), ('ForearmL', 'UpperArmL', (5.0, 11.6, 2.2)), ('HandL', 'ForearmL', (5.5, 7.0, 3.1)),
       ('ThighR', 'Hips', (-1.7, 10.2, 0.0)), ('ShinR', 'ThighR', (-2.0, 5.8, 1.5)),
       ('ThighL', 'Hips', (1.7, 10.2, 0.0)), ('ShinL', 'ThighL', (2.0, 5.8, 1.5))]
PIV = {n: p for n, _, p in SEG}
lerp = lambda a, b, f: tuple(a[j] + (b[j] - a[j]) * f for j in range(3))

# face: skull + muzzle ellipsoids; the grin is a crescent between two parabolas on the muzzle front
SKULL, SKR = (0, 18.55, 3.0), (1.35, 1.25, 2.05)
FACE, FR = (0, 17.6, 4.1), (1.3, 0.85, 1.5)
y_up = lambda x: 17.74 + 0.23 * x ** 2
y_mid = lambda x: 17.5 + 0.28 * x ** 2
y_lo = lambda x: 17.32 + 0.33 * x ** 2
def zface(x, y):
    q = 1 - (x / FR[0]) ** 2 - ((y - FACE[1]) / FR[1]) ** 2
    return FACE[2] + FR[2] * np.sqrt(np.maximum(q, 0))
def zhead(x, y):
    q = 1 - (x / SKR[0]) ** 2 - ((y - SKULL[1]) / SKR[1]) ** 2
    return np.maximum(zface(x, y), SKULL[2] + SKR[2] * np.sqrt(np.maximum(q, 0)) * (q > 0))
in_face = lambda x, y, z: ((x / FR[0]) ** 2 + ((y - FACE[1]) / FR[1]) ** 2 + ((z - FACE[2]) / FR[2]) ** 2) <= 1

def tendril(g, pts, r0, seg, rng, jit=0.25, col=SM, tip=SM2):
    """Wavy tapering shadow wisp along pts."""
    pts = [tuple(np.add(p, rng.uniform(-jit, jit, 3) * (i > 0))) for i, p in enumerate(pts)]
    g.horn(pts, r0, col, seg, tip)

def vein(g, a, b, r_axis, seg, rng, side, n=9, w=0.17, col=VEIN):
    """Wavy glowing vein on the skin of a limb running a -> b (axis radius r_axis(f)), on the side 'side' (unit-ish vector)."""
    a, b = np.array(a, float), np.array(b, float); d = b - a; d /= np.linalg.norm(d)
    s = np.array(side, float); s -= d * (s @ d); s /= np.linalg.norm(s); t = np.cross(d, s)
    ph = rng.uniform(0, 6.28); pts = []
    for i in range(n + 1):
        f = i / n; ang = 0.45 * np.sin(ph + f * 5.0)
        pts.append(tuple(a + (b - a) * f + (s * np.cos(ang) + t * np.sin(ang)) * r_axis(f) * 0.97))
    for i, (p, q) in enumerate(zip(pts, pts[1:])): g.cap(p, q, w * (1 - 0.4 * i / n), w * (1 - 0.4 * (i + 1) / n), col, seg)

def shape(g, stud):
    rng = g.rng
    Hd, Jw = 'Head', 'Jaw'
    # ================= eyes: three slanted pairs, deep sockets =================
    for s in (-1, 1):
        for (x0, x1, y0, y1, r) in ((0.25, 0.85, 18.48, 18.7, 0.15), (0.74, 1.08, 18.98, 19.12, 0.1), (0.66, 0.98, 18.2, 18.3, 0.08)):
            pts = [(s * (x0 + (x1 - x0) * f), y0 + (y1 - y0) * f) for f in np.linspace(0, 1, 6)]          # slanted slit eyes on the skin
            for k, ((xa, ya), (xb, yb)) in enumerate(zip(pts, pts[1:])):
                ra, rb = r * (1 - 0.3 * k / 5), r * (1 - 0.3 * (k + 1) / 5)
                za, zb = float(zhead(abs(xa), ya)), float(zhead(abs(xb), yb))
                g.cap((xa, ya, za - 0.03), (xb, yb, zb - 0.03), ra, rb, EYE, Hd)
                g.cap((xa, ya, za - 0.26), (xb, yb, zb - 0.26), ra + 0.12, rb + 0.12, SHD, Hd)
        g.cap((s * 0.12, 18.98, float(zhead(0.12, 18.98)) - 0.05), (s * 1.3, 19.05, float(zhead(1.0, 19.05)) - 0.1), 0.24, 0.16, SH2, Hd)   # overhanging brow ridge
    # ================= the grin: glowing crescent mouth lined with fangs =================
    mouth = lambda x, y, z: in_face(x, y, z) & (np.abs(x) < 1.22) & (y < y_up(x)) & (y > y_lo(x)) & (z > FACE[2] - 0.3)
    g.box((-1.5, 17.2, 3.7), (1.5, 18.3, 5.5), MOUTH, Hd, where=lambda x, y, z: mouth(x, y, z) & (y >= y_mid(x)))
    g.box((-1.5, 17.2, 3.7), (1.5, 18.3, 5.5), MOUTH, Jw, where=lambda x, y, z: mouth(x, y, z) & (y < y_mid(x)))
    g.ell(FACE, FR, SH, Jw, where=lambda x, y, z: y < y_mid(x))                               # lower face = jaw
    for s in (-1, 1): g.spike((s * 0.5, 16.85, 4.6), (s * 0.7, 16.2, 4.4), 0.12, HO, Jw, HO2)  # chin barbs
    g.spike((0, 16.75, 4.4), (0, 16.0, 4.2), 0.13, HO, Jw, HO2)
    g.ell(FACE, FR, SH, Hd)
    # ================= skull: horns, crown, cheek spurs =================
    for s in (-1, 1):
        g.horn([(s * 0.9, 19.4, 3.4), (s * 1.6, 20.5, 2.3), (s * 2.1, 21.2, 0.6), (s * 2.0, 21.0, -1.2), (s * 1.6, 20.2, -2.5)], 0.46, HO, Hd, HO2, ring=SH2)
        g.horn([(s * 1.35, 18.8, 2.6), (s * 2.2, 18.9, 1.6), (s * 2.6, 18.5, 0.4)], 0.26, HO, Hd, HO2)   # temple horns
        g.spike((s * 1.35, 17.8, 3.4), (s * 2.5, 18.0, 2.4), 0.22, HO, Hd, HO2)                         # cheek spurs
        g.ell((s * 1.05, 17.95, 4.25), (0.45, 0.35, 0.55), SH3, Hd, over=True, where=lambda x, y, z, s=s: ~in_face(x, y, z) | (z < 4.9))  # sunken cheeks
    for k, z in enumerate(np.arange(4.2, 0.6, -0.4)):
        g.spike((0, 19.75 - 0.1 * k, z), (0, 20.5 - 0.06 * k, z - 0.65), 0.2 - 0.009 * k, HO, Hd, HO2)
    g.ell(SKULL, SKR, SH, Hd)
    g.ell((0, 18.9, 1.6), (1.15, 1.05, 1.3), SH, Hd)

    # ================= chest: glowing core, cracks, ribs, spine, collar spikes, back wisps =================
    C = 'Chest'
    core = (0, 14.0, 2.6)
    g.ell(core, (0.5, 0.6, 0.35), CORE, C)
    for a in np.linspace(0, 2 * np.pi, 8, endpoint=False):                                  # cracks spread from the core over the torso
        pts = [core]
        for i in range(1, 6):
            r = 0.5 + 0.45 * i; aa = a + rng.uniform(-0.3, 0.3)
            x, y = r * np.cos(aa), 14.0 + r * np.sin(aa) * 1.15
            z = 0.5 + 2.32 * np.sqrt(max(0.0, 1 - (x / 2.45) ** 2 - ((y - 13.9) / 3.05) ** 2))
            pts.append((x, y, z))
        for i, (q0, q1) in enumerate(zip(pts, pts[1:])): g.cap(q0, q1, 0.13 - 0.017 * i, 0.11 - 0.017 * i, CORE if i < 2 else VEIN, C)
    g.ell(core, (0.85, 0.95, 0.45), SHD, C)
    for i, y in enumerate((15.5, 14.8, 14.05, 13.3, 12.6)):                                  # ribs
        w = 2.45 - 0.12 * i
        for s in (-1, 1):
            pts = [(s * 0.6, y, 2.6 - 0.05 * i), (s * w * 0.75, y - 0.25, 2.15), (s * w, y - 0.55, 0.6), (s * w * 0.85, y - 0.75, -0.9)]
            for q0, q1 in zip(pts, pts[1:]): g.cap(q0, q1, 0.24, 0.21, SH2, C)
    g.cap((0, 12.0, 2.35), (0, 15.8, 2.5), 0.36, 0.33, SH2, C)                               # sternum
    for k in range(10):                                                                     # spine knobs + dorsal spikes
        y = 16.6 - 0.6 * k; z = -1.15 + 0.08 * k
        g.spike((0, y, z), (0, y + 0.6, z - 1.3 - 0.5 * np.sin(k * 0.6)), 0.27 - 0.016 * k, HO, C, HO2)
        g.ell((0, y, z + 0.15), (0.45, 0.32, 0.4), SH2, C)
    for s in (-1, 1):                                                                       # collarbones, shoulder spikes
        g.cap((s * 0.3, 16.4, 1.8), (s * 3.3, 16.3, 1.3), 0.3, 0.26, SH2, C)
        for d in ((0.3, 1.9, -0.4), (0.9, 1.3, -1.0), (-0.4, 1.6, -1.2), (1.2, 0.6, 0.2)):
            g.spike((s * 3.5, 16.6, 1.2), (s * (3.5 + d[0]), 16.6 + d[1], 1.2 + d[2]), 0.3, HO, C, HO2)
    for k in range(44):                                                                     # shadow wisps rising off the back and shoulders
        x = rng.uniform(-3.4, 3.4); y = rng.uniform(12.5, 16.8); z = -1.0 - 0.35 * (1 - min(1, abs(x) / 2.6))
        L = rng.uniform(2.2, 4.6); sw = rng.uniform(-0.8, 0.8)
        tendril(g, [(x, y, z), (x * 1.1 + sw * 0.4, y + L * 0.4, z - L * 0.35), (x * 1.2 + sw, y + L * 0.8, z - L * 0.5),
                    (x * 1.25 + sw * 1.4, y + L * 1.12, z - L * 0.42)], rng.uniform(0.2, 0.36), C, rng,
                col=SM if k % 3 else SH2, tip=WS if k % 3 == 0 else SM2)
    g.cap((0, 15.6, 1.2), (0, 17.6, 2.6), 0.78, 0.62, SH, C)                                 # neck, thrust forward
    for c, r in (((0, 13.9, 0.5), (2.35, 3.0, 2.0)), ((0, 15.6, 0.6), (3.2, 1.25, 1.75)), ((0, 11.7, 0.3), (1.65, 1.4, 1.4))):
        g.ell(c, r, SH, C)
    for s in (-1, 1): g.ell((s * 3.4, 16.0, 1.35), (1.0, 0.95, 1.0), SH, C)

    # ================= hips: pelvis, tattered smoke skirt, spiked tail =================
    Hp = 'Hips'
    for k in range(52):
        a = k / 52 * 2 * np.pi + rng.uniform(-0.05, 0.05)
        if np.sin(a) > 0.9: continue                                                        # gap at the front
        x0, z0 = 1.9 * np.cos(a), 1.55 * np.sin(a); L = rng.uniform(2.8, 5.2)
        tendril(g, [(x0, 10.2, z0), (x0 * 1.15, 10.2 - L * 0.35, z0 * 1.15), (x0 * 1.25, 10.2 - L * 0.7, z0 * 1.25),
                    (x0 * 1.3, 10.2 - L, z0 * 1.3 - 0.25)], rng.uniform(0.24, 0.34), Hp, rng, jit=0.2,
                col=SM if k % 2 else SH2, tip=WS if k % 4 == 0 else SM2)
    tail = [(0, 10.2, -1.2), (0, 9.0, -3.0), (0.6, 7.2, -4.6), (-0.4, 5.2, -5.8), (0.5, 3.4, -6.6), (0.0, 2.0, -7.2)]
    for k, f in enumerate(np.linspace(0.08, 0.75, 7)):                                     # tail spikes
        i = int(f * (len(tail) - 1)); p = lerp(tail[i], tail[i + 1], f * (len(tail) - 1) - i)
        g.spike(p, (p[0], p[1] + 1.0 - 0.09 * k, p[2] - 0.6), 0.22 - 0.02 * k, HO, Hp, HO2)
    g.horn(tail, 0.8, SH, Hp, WS, ring=SH2)
    g.ell((0, 10.4, 0.1), (1.95, 1.2, 1.55), SH, Hp)
    for s in (-1, 1): g.ell((s * 1.45, 10.3, 0.0), (0.8, 0.8, 0.8), SH2, Hp)

    # ================= arms: sinew, glowing veins, elbow spikes, trailing wisps, long clawed hands =================
    for s, sd in ((-1, 'R'), (1, 'L')):
        UA, FA, HA = 'UpperArm' + sd, 'Forearm' + sd, 'Hand' + sd
        sh, el, wr = PIV[UA], PIV[FA], PIV[HA]
        vein(g, lerp(sh, el, 0.1), lerp(sh, el, 0.95), lambda f: 0.85 - 0.3 * f, UA, rng, (s, 0, 0.4))
        vein(g, lerp(el, wr, 0.05), lerp(el, wr, 0.92), lambda f: 0.62 - 0.22 * f, FA, rng, (s, 0, 0.5))
        vein(g, lerp(el, wr, 0.1), lerp(el, wr, 0.85), lambda f: 0.6 - 0.2 * f, FA, rng, (0, 0, 1))
        for f in (0.3, 0.55): g.cap(lerp(sh, el, f), lerp(sh, el, f + 0.04), 0.74, 0.7, SH2, UA)
        g.cap(sh, el, 0.88, 0.55, SH, UA)
        g.ell(lerp(sh, el, 0.35), (0.9, 1.25, 0.85), SH, UA)
        g.spike(np.add(el, (0, 0.2, -0.3)), np.add(el, (s * 0.3, 1.0, -2.1)), 0.34, HO, FA, HO2)     # elbow spike
        for k in range(6):                                                                  # wisps trailing off the forearm
            f = 0.12 + 0.14 * k; p = np.add(lerp(el, wr, f), (s * 0.35, 0, -0.35))
            tendril(g, [tuple(p), tuple(np.add(p, (s * 0.6, -0.4, -0.9))), tuple(np.add(p, (s * 1.0, -0.6, -1.7))), tuple(np.add(p, (s * 1.3, -0.5, -2.5)))],
                    0.22, FA, rng, jit=0.15, tip=WS if k % 2 else SM2)
        for f in (0.7, 0.76): g.cap(lerp(el, wr, f), lerp(el, wr, f + 0.03), 0.56, 0.56, SH2, FA)
        g.cap(el, wr, 0.62, 0.45, SH, FA)
        g.ell(lerp(el, wr, 0.3), (0.68, 1.15, 0.68), SH, FA)
        hc = (s * 5.6, 6.6, 3.3)
        for i, x in enumerate(np.linspace(-0.5, 0.5, 4)):                                   # long fingers, knuckles, hooked claws
            xx = hc[0] + x * 1.2
            pts = [(xx, 6.3, 3.6), (xx + x * 0.3, 5.2, 4.05), (xx + x * 0.5, 4.1, 3.95)]
            for q0, q1 in zip(pts, pts[1:]): g.cap(q0, q1, 0.19, 0.15, SH, HA)
            for q in pts[:2]: g.ell(q, (0.21, 0.21, 0.21), SH2, HA)
            g.horn([pts[-1], (pts[-1][0] + x * 0.2, 3.1, 4.15), (pts[-1][0] + x * 0.25, 2.3, 4.75), (pts[-1][0] + x * 0.25, 1.95, 5.3)], 0.16, CL, HA, CL)
        g.cap((hc[0] - s * 0.5, 6.5, 3.4), (hc[0] - s * 0.9, 5.5, 4.1), 0.18, 0.14, SH, HA)      # thumb + claw
        g.horn([(hc[0] - s * 0.9, 5.5, 4.1), (hc[0] - s * 1.0, 4.8, 4.6), (hc[0] - s * 0.95, 4.4, 5.1)], 0.13, CL, HA, CL)
        g.ell(hc, (0.68, 0.72, 0.5), SH, HA)

    # ================= legs: veins, knee spikes, clawed feet joined to the shin =================
    for s, sd in ((-1, 'R'), (1, 'L')):
        TH, SHN = 'Thigh' + sd, 'Shin' + sd
        hp, kn = PIV[TH], PIV[SHN]; an = (s * 2.15, 1.55, -0.2); ft = (s * 2.2, 0.45, 0.9)
        vein(g, lerp(hp, kn, 0.15), lerp(hp, kn, 0.95), lambda f: 1.05 - 0.35 * f, TH, rng, (s, 0, 0.6))
        vein(g, lerp(kn, an, 0.05), lerp(kn, an, 0.9), lambda f: 0.62 - 0.18 * f, SHN, rng, (s * 0.5, 0, 1))
        g.spike(np.add(kn, (0, 0.2, 0.3)), np.add(kn, (s * 0.2, 1.2, 1.5)), 0.3, HO, SHN, HO2)        # knee spike
        g.cap(hp, kn, 1.05, 0.68, SH, TH)
        g.ell(lerp(hp, kn, 0.4), (1.05, 1.5, 1.05), SH, TH)
        for f in (0.35, 0.6): g.cap(lerp(kn, an, f), lerp(kn, an, f + 0.04), 0.58, 0.55, SH2, SHN)
        g.cap(kn, an, 0.66, 0.46, SH, SHN)
        g.ell(an, (0.52, 0.5, 0.52), SH2, SHN)                                              # ankle knob
        g.cap(an, ft, 0.5, 0.44, SH, SHN)                                                   # foot, one piece with the shin
        g.ell((s * 2.2, 0.5, 1.2), (0.62, 0.42, 0.75), SH, SHN)
        for dx in (-0.45, 0, 0.45):                                                          # toes + claws
            t0 = (s * 2.2 + dx * 0.8, 0.45, 1.1); t1 = (s * 2.2 + dx * 1.5, 0.3, 2.1)
            g.cap(t0, t1, 0.27, 0.2, SH, SHN)
            g.ell(t1, (0.21, 0.19, 0.21), SH2, SHN)
            g.horn([t1, (t1[0] + dx * 0.2, 0.28, 2.6), (t1[0] + dx * 0.3, 0.08, 3.0)], 0.16, CL, SHN, CL)
        g.horn([(s * 2.15, 0.7, -0.3), (s * 2.15, 0.35, -0.9), (s * 2.15, 0.05, -1.2)], 0.17, CL, SHN, CL)   # heel claw
    # ---- open the grin: carve the mouth gap out of the skin, then hang real fangs in it ----
    sl, X, Y, Z = g.win((-1.4, 17.0, 3.4), (1.4, 18.5, 5.8))
    gap = (np.abs(X) < 1.12) & (Y < y_up(X) - 0.04) & (Y > y_lo(X) + 0.04) & (Z > zface(X, Y) - 0.42) & in_face(X, Y, Z + 0.3)
    g.C[sl][gap] = 0; g.S[sl][gap] = 0
    for x in np.linspace(-1.0, 1.0, 11):                                                      # upper fangs hang into the gap
        ln = 0.46 - 0.2 * abs(x); z = float(zface(x, y_up(x))) - 0.2
        g.spike((x, y_up(x) + 0.08, z), (x * 0.98, y_up(x) - ln, z + 0.06), 0.1, TEETH, Hd)
    for x in np.linspace(-0.92, 0.92, 10):                                                    # lower fangs stand up into it
        ln = 0.38 - 0.18 * abs(x); z = float(zface(x, y_lo(x))) - 0.2
        g.spike((x, y_lo(x) - 0.08, z), (x * 0.98, y_lo(x) + ln, z + 0.06), 0.09, TEETH, Jw)

ANIM = {'len': 6.0, 'periods': {'B': 3.0, 'L': 6.0, 'W': 1.5},
        'action': {'every': [5, 9], 'first': 2.0, 'len': 2.4,
                   'phases': {'lunge': [0.3, 1.5, 0.35, 0.6], 'screech': [0.45, 1.4, 0.2, 0.4]}},
        'joints': {
            'Hips': {'pos': {'y': [[0.15, 'B', 0], ['lunge', -0.7]], 'z': [['lunge', 1.2]]}, 'rot': {'z': [[2, 'L', 0]]}},
            'Chest': {'rot': {'x': [[2, 'B', 0], ['lunge', 14]], 'y': [[4, 'L', 0.3]]}},
            'Head': {'rot': {'x': [[3, 'B', 1], ['screech', -24]], 'y': [[10, 'L', 0.6]], 'z': [[4, 'W', 0]]}},
            'Jaw': {'rot': {'x': [[2, 'B', 0.5], ['screech', 30], [2]]}},
            'UpperArmR': {'rot': {'x': [[4, 'B', 0.3], ['lunge', -45]], 'z': [['lunge', -55], [3, 'L', 0]]}},
            'ForearmR': {'rot': {'x': [[3, 'B', 0.5], ['lunge', -35]]}},
            'HandR': {'rot': {'x': [[5, 'W', 0], ['lunge', -25]]}},
            'UpperArmL': {'rot': {'x': [[4, 'B', 0.8], ['lunge', -45]], 'z': [['lunge', 55], [3, 'L', 0.5]]}},
            'ForearmL': {'rot': {'x': [[3, 'B', 1.0], ['lunge', -35]]}},
            'HandL': {'rot': {'x': [[5, 'W', 0.5], ['lunge', -25]]}},
            'ThighR': {'rot': {'x': [['lunge', -22]]}}, 'ShinR': {'rot': {'x': [['lunge', 28]]}},
            'ThighL': {'rot': {'x': [['lunge', 8]]}}, 'ShinL': {'rot': {'x': [['lunge', 12]]}}},
        'fx': []}
FX = {}
CAMS = [{'ang': 155, 'dist': 60, 'y': 15, 'look': [0, 11, -1], 'studio_pos': [24, 16, 40], 'studio_target': [0, 11, 2]},
        {'ang': 235, 'dist': 54, 'y': 19, 'look': [0, 11, -1]}]

if __name__ == '__main__':
    out = (sys.argv[1:] or ['out'])[0]
    make('ShadowMonster', SEG, PAL, (-9.5, 9.5, -0.5, 22.5, -8.5, 7), SC, shape, ANIM, FX, out, CAMS, block=BLOCK, smooth=True)
