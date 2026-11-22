#!/usr/bin/env python3
"""Orc brute with a wooden club, ~20 studs tall, built in 0.125-stud blocks (detail of a huge build, final size).
Idle breathing + a wind-shockwave roar and an overhead club slam (earth impact, rock spikes, ground cracks, dust) every 5-9 s.
Effects are flipbook sheets from a VFX sheet library (metadata below; PNGs from --sheets DIR, built from that library).
Usage: python3 orc.py <outdir> --sheets <dir holding earth/, sand/, wind/ sheets>"""
# @style: voxel
# @model: Orc | rigged block orc brute with club, ~20 studs tall, roar and slam VFX
# @run: python3 orc.py <outdir> --sheets <dir holding earth/, sand/, wind/ sheets>
import sys
import numpy as np
from rig import make

SC, BLOCK = 1.0, 0.125
PAL = [None, ('Skin', '#4d6e2f', 's'), ('Skin', '#5b7f37', 's'), ('Skin', '#3f5c26', 's'), ('Skin', '#2b4019', 's'),
       ('Leather', '#5a3a22', 's'), ('Leather', '#6e4a2c', 's'), ('Leather', '#3a2414', 's'),
       ('Wood', '#7a5230', 's'), ('Wood', '#96693e', 's'), ('Wood', '#4f3320', 's'),
       ('Iron', '#6a6e75', 's'), ('Iron', '#3a3d43', 's'), ('Bone', '#e2d6b2', 's'), ('Hair', '#1b1714', 's'), ('Eye', '#ff7a1a', 'n')]
SK, SK2, SK3, SKD, LE, LE2, LED, WD, WD2, WDD, FE, FED, BONE, HAIR, EYE = range(1, 16)

SEG = [('Hips', None, (0, 9.6, 0)), ('Chest', 'Hips', (0, 11.2, 0.2)), ('Head', 'Chest', (0, 16.4, 1.4)), ('Jaw', 'Head', (0, 16.3, 2.4)),
       ('UpperArmR', 'Chest', (-4.3, 14.8, 0.6)), ('ForearmR', 'UpperArmR', (-5.3, 10.9, 1.0)), ('HandR', 'ForearmR', (-5.6, 7.4, 1.8)),
       ('UpperArmL', 'Chest', (4.3, 14.8, 0.6)), ('ForearmL', 'UpperArmL', (5.3, 10.9, 1.0)), ('HandL', 'ForearmL', (5.6, 7.4, 1.8)),
       ('ThighR', 'Hips', (-2.0, 9.0, 0.0)), ('ShinR', 'ThighR', (-2.3, 5.0, 0.7)),
       ('ThighL', 'Hips', (2.0, 9.0, 0.0)), ('ShinL', 'ThighL', (2.3, 5.0, 0.7))]
PIV = {n: p for n, _, p in SEG}
H = np.array((-5.65, 6.6, 2.0)); D = np.array((0, -0.55, 1.0)); D /= np.linalg.norm(D)       # club grip and direction
U = np.array((1.0, 0, 0)); Wv = np.cross(D, U)                                                 # club cross-section axes
CLUB_TIP = tuple(H + D * 10.0)
ring = lambda a: U * np.cos(a) + Wv * np.sin(a)
lerp = lambda a, b, f: tuple(a[j] + (b[j] - a[j]) * f for j in range(3))

def shape(g, stud):
    rng = g.rng
    # ================= head =================
    Hd, Jw = 'Head', 'Jaw'
    for s in (-1, 1):
        g.box((s * 0.75 - 0.07, 17.78, 3.38), (s * 0.75 + 0.07, 17.97, 3.46), HAIR, Hd)                 # pupils, then glowing eyes in dark sockets
        g.box((s * 0.75 - 0.26, 17.7, 3.2), (s * 0.75 + 0.26, 18.05, 3.42), EYE, Hd)
        g.box((s * 0.75 - 0.42, 17.55, 3.05), (s * 0.75 + 0.42, 18.2, 3.36), SKD, Hd)
        g.box((s * 0.28 - 0.12, 16.85, 3.62), (s * 0.28 + 0.12, 17.05, 3.88), HAIR, Hd)                  # nostrils
        g.box((s * 0.75 - 0.08, 16.9, 3.2), (s * 0.75 + 0.08, 17.5, 3.45), HAIR, Hd, over=True)           # war paint
        g.box((s * 1.05 - 0.08, 16.95, 2.95), (s * 1.05 + 0.08, 17.45, 3.3), HAIR, Hd, over=True)
        g.ell((s * 1.3, 17.45, 2.75), (0.6, 0.35, 0.6), SK2, Hd)                                          # cheekbones
        g.spike((s * 1.6, 17.9, 1.4), (s * 3.7, 18.9, 0.35), 0.5, SK, Hd, SK3)                            # long ears, inner ear, rings
        g.spike((s * 1.75, 17.95, 1.55), (s * 3.3, 18.7, 0.65), 0.22, SK3, Hd, over=True)
        for x, y, z in ((2.3, 17.85, 1.0), (2.95, 18.2, 0.72)): g.ell((s * x, y, z), (0.12, 0.3, 0.3), FE, Hd)
        g.ell((s * 1.05, 16.85, 2.55), (0.95, 0.85, 0.95), SK, Hd)
    g.cap((0.35, 18.45, 3.5), (1.25, 17.25, 3.3), 0.08, 0.08, LE2, Hd, over=True)                         # scar
    for x in np.arange(-0.9, 0.95, 0.24): g.box((x - 0.08, 16.32, 3.38), (x + 0.08, 16.58, 3.58), BONE, Hd)  # upper teeth
    g.box((-1.1, 16.55, 3.1), (1.1, 16.75, 3.62), SK3, Hd)                                                  # upper lip
    g.box((-0.6, 16.85, 3.15), (0.6, 17.75, 3.88), SK3, Hd); g.box((-0.3, 17.6, 3.3), (0.3, 18.25, 3.7), SK3, Hd)   # nose
    g.ell((0, 16.72, 3.95), (0.26, 0.18, 0.1), FE, Hd)                                                        # nose ring
    for y in (18.52, 18.32): g.box((-1.4, y, 3.42), (1.4, y + 0.1, 3.55), SKD, Hd, over=True)               # furrowed brow
    g.box((-1.72, 18.15, 2.45), (1.72, 18.85, 3.52), SKD, Hd, where=lambda x, y, z: y < 18.85 - 0.25 * np.abs(x))
    for y in (19.0, 19.3): g.box((-0.9, y, 2.8), (0.9, y + 0.1, 3.0), SKD, Hd, over=True)                   # forehead wrinkles
    for k, z in enumerate(np.arange(2.9, -1.05, -0.25)):                                                     # mohawk strands
        for x in (-0.25, 0, 0.25):
            g.spike((x, 19.25 - 0.05 * k, z), (x * 1.6, 20.5 - 0.12 * k + rng.uniform(0, 0.5), z - 0.8), 0.16, HAIR, Hd)
    for k in range(9):                                                                                         # braid with an iron bead
        p = lerp((0, 18.9, -0.5), (0, 15.6, -1.9), k / 8); g.ell(p, (0.27, 0.22, 0.27), HAIR if k < 8 else FE, Hd)
    g.ell((0, 17.7, 1.5), (1.75, 1.95, 1.95), SK, Hd)
    # ---- jaw: underbite, curved tusks, lower teeth ----
    for s in (-1, 1):
        g.horn([(s * 0.85, 16.2, 3.55), (s * 1.0, 17.0, 3.78), (s * 1.25, 17.9, 3.88), (s * 1.12, 18.45, 3.62)], 0.34, BONE, Jw, BONE)
    for x in np.arange(-0.6, 0.65, 0.3): g.box((x - 0.08, 16.3, 3.45), (x + 0.08, 16.5, 3.62), BONE, Jw)
    g.box((-1.2, 16.15, 3.55), (1.2, 16.35, 3.86), SK3, Jw)
    g.box((-0.7, 15.0, 3.2), (0.7, 15.4, 3.8), SK2, Jw)
    g.box((-1.2, 15.3, 2.6), (1.2, 16.3, 3.85), SK, Jw); g.ell((0, 15.8, 2.6), (1.45, 0.75, 1.3), SK, Jw)

    # ================= chest =================
    C = 'Chest'
    for k, a in enumerate(np.linspace(-1.2, 1.2, 9)):                                                         # tooth necklace
        p = (1.6 * np.sin(a), 15.35, 1.0 + 1.55 * np.cos(a)); g.ell(p, (0.14, 0.14, 0.14), LED, C)
        g.spike(p, (p[0] * 1.1, 14.75, p[2] + 0.15), 0.14, BONE, C)
    for s in (-1, 1): g.cap((s * 0.7, 15.2, 1.95), (s * 0.4, 16.6, 2.3), 0.25, 0.25, SK2, C)                  # neck tendons
    g.cap((0, 15.4, 0.9), (0, 16.7, 1.3), 1.5, 1.5, SK, C)
    g.box((-0.08, 12.6, 2.9), (0.08, 15.0, 3.7), SKD, C)                                                       # pec groove, navel, spine groove
    g.box((-0.12, 10.25, 3.35), (0.12, 10.45, 3.6), HAIR, C)
    g.box((-0.08, 11.0, -3.2), (0.08, 15.5, -2.4), SKD, C)
    for y in (12.15, 11.45, 10.75):                                                                            # abs
        for s in (-1, 1): g.ell((s * 0.6, y, 3.3), (0.55, 0.3, 0.33), SK2, C)
    # strap with rivets and a buckle, front and back; spiked layered pauldron; fur on the right shoulder
    for a, b in (((-3.0, 15.3, 2.85), (2.8, 10.0, 3.3)), ((-3.0, 15.3, -2.45), (2.8, 10.0, -2.6))):
        for f in np.linspace(0.08, 0.92, 8): g.ell(lerp(a, b, f), (0.17, 0.17, 0.17), FE, C)
        m = lerp(a, b, 0.42); g.box((m[0] - 0.45, m[1] - 0.4, m[2] - 0.15), (m[0] + 0.45, m[1] + 0.4, m[2] + 0.25), FED, C)
        g.box((m[0] - 0.25, m[1] - 0.2, m[2] - 0.2), (m[0] + 0.25, m[1] + 0.2, m[2] + 0.3), LE2, C, over=True)
        g.cap(a, b, 0.5, 0.5, LED, C)
    for d in ((0.2, 2.2, 0), (1.5, 1.3, 0.9), (1.5, 1.3, -0.9), (-0.6, 1.8, 1.3), (-0.6, 1.8, -1.3), (1.9, 0.6, 0)):
        g.spike((4.3 + d[0] * 0.6, 16.6, 0.4 + d[2] * 0.6), (4.3 + d[0], 16.6 + d[1], 0.4 + d[2]), 0.32, FE, C, FED)
    for c, r, lo, col in (((4.3, 16.0, 0.4), (2.15, 1.3, 2.15), 15.3, FED), ((4.6, 15.4, 0.4), (2.05, 1.0, 2.05), 14.9, FE), ((4.9, 14.9, 0.4), (1.9, 0.9, 1.9), 14.5, FED)):
        for a in np.linspace(0, 2 * np.pi, 12, endpoint=False):
            g.ell((c[0] + r[0] * 0.97 * np.cos(a), lo + 0.12, c[2] + r[2] * 0.97 * np.sin(a)), (0.14, 0.14, 0.14), FE if col == FED else FED, C)
        g.ell(c, r, col, C, where=lambda x, y, z, lo=lo: y > lo)
    g.cap((2.8, 15.9, 2.45), (5.8, 14.3, 0.85), 0.2, 0.2, LED, C)
    for k in range(70):
        a = rng.uniform(0, 2 * np.pi); th = rng.uniform(0.1, 1.2); base = (-4.0 + 1.7 * np.sin(th) * np.cos(a), 14.95 + 1.6 * np.cos(th), 0.4 + 1.7 * np.sin(th) * np.sin(a))
        g.spike(base, (base[0] * 1.08 - 0.2, base[1] + 0.5, base[2] * 1.05), 0.15, HAIR if k % 3 else LE2, C)
    for c, r in [((0, 11.3, 1.0), (3.2, 2.2, 2.5)), ((0, 13.2, 0.3), (4.2, 3.0, 2.9)), ((-1.85, 13.85, 2.3), (1.95, 1.4, 1.05)), ((1.85, 13.85, 2.3), (1.95, 1.4, 1.05)),
                 ((0, 15.3, -0.6), (3.6, 1.6, 2.2)), ((-1.6, 14.2, -2.2), (1.3, 1.5, 0.6)), ((1.6, 14.2, -2.2), (1.3, 1.5, 0.6))]:
        g.ell(c, r, SK, C)
    g.ell((-4.0, 14.95, 0.4), (1.75, 1.65, 1.75), HAIR, C, where=lambda x, y, z: ((y > 15.15) & (y < 15.3)) | ((y > 14.55) & (y < 14.7)))   # tattoo bands
    for s in (-1, 1): g.ell((s * 4.0, 14.95, 0.4), (1.75, 1.65, 1.75), SK, C)

    # ================= hips: belt, buckle, pouches, trophy skull, loincloth, trousers =================
    Hp = 'Hips'
    g.ell((0, 9.45, 2.95), (0.45, 0.45, 0.2), BONE, Hp)
    for s in (-1, 1): g.box((s * 0.18 - 0.1, 9.45, 3.05), (s * 0.18 + 0.1, 9.65, 3.2), HAIR, Hp, over=True)
    g.box((-0.85, 8.7, 2.4), (0.85, 10.1, 2.95), FED, Hp)
    for s in (-1, 1):
        g.box((s * 3.1 - 0.3, 9.1, -0.9), (s * 3.1 + 0.3, 9.75, 0.9), FE, Hp)
        g.box((s * 3.05 - 0.55, 8.0, -0.6), (s * 3.05 + 0.55, 9.3, 0.6), LE2, Hp)                                   # pouch, flap, button
        g.box((s * 3.05 - 0.6, 8.9, -0.65), (s * 3.05 + 0.6, 9.35, 0.65), LED, Hp, over=True)
        g.ell((s * 3.62, 9.05, 0), (0.12, 0.14, 0.14), FE, Hp)
    g.ell((2.9, 7.9, 1.6), (0.55, 0.6, 0.55), BONE, Hp)                                                             # trophy skull
    for s in (-1, 1): g.box((2.9 + s * 0.2 - 0.12, 7.95, 2.0), (2.9 + s * 0.2 + 0.12, 8.2, 2.18), HAIR, Hp, over=True)
    g.cap((2.9, 8.5, 1.6), (2.9, 8.95, 1.9), 0.08, 0.08, LED, Hp)
    jag = lambda x, y, z: y > 5.9 + 0.6 * np.abs(np.sin(x * 2.3))
    for z0, z1 in ((1.95, 2.45), (-2.45, -1.95)):
        for x in (-0.7, 0, 0.7): g.box((x - 0.05, 5.6, z0 - 0.05), (x + 0.05, 8.8, z1 + 0.05), LE, Hp, where=jag)   # folds
        g.box((-1.55, 5.6, z0), (1.55, 9.0, z1), LE2, Hp, where=jag)
    g.box((0.4, 6.6, 2.4), (1.0, 7.2, 2.55), LE, Hp)                                                                  # patch + stitches
    for p in ((0.35, 6.6), (0.35, 7.2), (1.05, 6.6), (1.05, 7.2), (0.7, 6.55), (0.7, 7.25)): g.box((p[0] - 0.05, p[1] - 0.05, 2.5), (p[0] + 0.05, p[1] + 0.05, 2.6), HAIR, Hp)
    belt = lambda x, y, z: (x / 3.55) ** 2 + (z / 2.65) ** 2 <= 1
    for a in np.linspace(0, 2 * np.pi, 40, endpoint=False):                                                           # stitched belt edges
        for y in (8.9, 9.88): g.box((3.55 * np.cos(a) - 0.05, y, 2.65 * np.sin(a) - 0.05), (3.55 * np.cos(a) + 0.05, y + 0.07, 2.65 * np.sin(a) + 0.05), LE2, Hp)
    g.box((-3.6, 8.85, -2.7), (3.6, 9.95, 2.7), LED, Hp, where=belt)
    g.ell((0, 9.3, 0), (3.2, 1.8, 2.3), LE, Hp)

    # ================= arms =================
    for s, sd in ((-1, 'R'), (1, 'L')):
        UA, FA, HA = 'UpperArm' + sd, 'Forearm' + sd, 'Hand' + sd
        sh, el, wr = PIV[UA], PIV[FA], PIV[HA]
        g.cap(lerp(sh, el, 0.3), lerp(sh, el, 0.8), 0.09, 0.09, SK3, UA)                                             # veins sit on top
        g.cap(lerp(sh, el, 0.62), lerp(sh, el, 0.72), 1.33, 1.3, LED, UA)
        for a in np.linspace(0, 2 * np.pi, 8, endpoint=False): g.ell(np.add(lerp(sh, el, 0.67), (1.33 * np.cos(a), 0, 1.33 * np.sin(a))), (0.13, 0.13, 0.13), FE, UA)
        g.cap(sh, el, 1.5, 1.15, SK, UA)
        g.ell(np.add(lerp(sh, el, 0.5), (0, 0, 0.5)), (1.2, 1.5, 1.1), SK, UA)
        g.ell(np.add(lerp(sh, el, 0.5), (0, 0, -0.5)), (1.1, 1.3, 0.9), SK, UA)
        for i in range(4):                                                                                            # bracer lacing, studs, wrist wrap
            f0, f1 = 0.4 + 0.12 * i, 0.46 + 0.12 * i
            g.cap(np.add(lerp(el, wr, f0), (-0.3, 0, 1.3)), np.add(lerp(el, wr, f1), (0.3, 0, 1.3)), 0.07, 0.07, LED, FA)
            g.cap(np.add(lerp(el, wr, f0), (0.3, 0, 1.3)), np.add(lerp(el, wr, f1), (-0.3, 0, 1.3)), 0.07, 0.07, LED, FA)
        for f in (0.45, 0.62, 0.8):
            for a in np.linspace(0.6, 2 * np.pi - 0.6, 5): g.ell(np.add(lerp(el, wr, f), (1.3 * np.sin(a), 0, 1.25 * np.cos(a))), (0.19, 0.19, 0.19), FE, FA)
        g.cap(lerp(el, wr, 0.35), lerp(el, wr, 0.9), 1.32, 1.2, LE, FA)
        for f in (0.92, 0.97): g.cap(lerp(el, wr, f), lerp(el, wr, f + 0.025), 1.1, 1.1, LE2, FA)
        g.cap(el, wr, 1.2, 1.0, SK, FA)
        hc = (s * 5.65, 6.75, 2.0)
        for i, x in enumerate(np.linspace(-0.6, 0.6, 4)):                                                             # fingers, knuckles, nails
            xx = hc[0] + x
            if sd == 'R':
                pts = [(xx, 6.45, 2.75), (xx, 5.95, 2.95), (xx, 5.6, 2.55), (xx, 5.75, 2.1)]
            else:
                pts = [(xx, 6.3, 2.45), (xx, 5.45, 2.65), (xx, 4.9, 2.45)]
            for a, b in zip(pts, pts[1:]): g.cap(a, b, 0.23, 0.21, SK, HA)
            g.ell(pts[-1], (0.17, 0.17, 0.17), HAIR, HA, over=False)
            g.ell((xx, 6.55, 2.75), (0.22, 0.2, 0.2), SK2, HA)
        g.cap((hc[0] - s * 0.75, 6.7, 2.4), (hc[0] - s * 0.55, 6.25, 2.95), 0.26, 0.24, SK, HA)
        g.ell(hc, (0.9, 0.95, 0.95), SK, HA)

    # ================= club: pommel, spiral leather grip, knotted bark head, cracks, iron band, nails =================
    HR = 'HandR'
    r_at = lambda f: 0.8 + (1.6 - 0.8) * (f - 3.2) / 6.5
    for k in range(18):
        f = rng.uniform(4.0, 9.4); a = rng.uniform(0, 2 * np.pi); n = ring(a); p = H + D * f + n * r_at(f)
        if k % 4 == 0: g.ell(tuple(p), (0.45, 0.45, 0.45), WDD, HR)
        else: g.spike(tuple(p - n * 0.25), tuple(p + n * 0.75), 0.26, FE, HR, FED)
    for a in np.linspace(0, 2 * np.pi, 14, endpoint=False):
        g.ell(tuple(H + D * 9.15 + ring(a) * 1.64), (0.15, 0.15, 0.15), FE, HR)
    g.cap(tuple(H + D * 8.9), tuple(H + D * 9.4), 1.63, 1.65, FED, HR)
    for k in range(4):                                                                                                   # zigzag cracks
        f = rng.uniform(4.5, 8.0); a = rng.uniform(0, 2 * np.pi); pts = []
        for i in range(5):
            ff = f + i * 0.4; aa = a + (0.12 if i % 2 else -0.12); pts.append(tuple(H + D * ff + ring(aa) * r_at(ff) * 0.97))
        for p0, p1 in zip(pts, pts[1:]): g.cap(p0, p1, 0.1, 0.1, WDD, HR, over=True)
    for a in np.linspace(0, 2 * np.pi, 12, endpoint=False):                                                            # bark grooves
        g.cap(tuple(H + D * 3.4 + ring(a) * r_at(3.4) * 0.96), tuple(H + D * 9.6 + ring(a) * r_at(9.6) * 0.96), 0.09, 0.09, WDD, HR)
    g.cap(tuple(H + D * 3.2), tuple(H + D * 9.7), 0.8, 1.6, WD, HR)
    for i in range(16):
        t = -1.3 + i * 0.27; g.cap(tuple(H + D * t + ring(i * 0.9) * 0.48), tuple(H + D * (t + 0.27) + ring(i * 0.9 + 0.9) * 0.48), 0.1, 0.1, LE2, HR)
    g.cap(tuple(H - D * 1.6), tuple(H + D * 3.2), 0.45, 0.5, WD2, HR)
    g.ell(tuple(H - D * 1.75), (0.58, 0.58, 0.58), WDD, HR)

    # ================= legs =================
    for s, sd in ((-1, 'R'), (1, 'L')):
        TH, SH = 'Thigh' + sd, 'Shin' + sd
        hp, kn = PIV[TH], PIV[SH]; ft = (s * 2.3, 1.5, 0.3)
        for f in (0.25, 0.55, 0.8): g.cap(lerp(hp, kn, f), lerp(hp, kn, f + 0.02), 1.78 - 0.4 * f, 1.78 - 0.4 * f, LED, TH)   # trouser seams
        g.box((s * 2.2 - 0.5, 7.0, 1.55), (s * 2.2 + 0.5, 7.8, 1.75), LE2, TH)
        g.cap(hp, kn, 1.75, 1.35, LE, TH)
        for a in np.linspace(0, 2 * np.pi, 8, endpoint=False):
            g.ell((s * 2.35 + 0.85 * np.cos(a), 5.2 + 0.85 * np.sin(a), 2.2), (0.12, 0.12, 0.12), FE, SH)
        g.ell((s * 2.35, 5.2, 1.7), (1.0, 1.0, 0.55), FED, SH)
        g.cap((s * 2.3, 5.15, 0.6), (s * 2.3, 5.4, 0.6), 1.45, 1.45, LED, SH)
        for i in range(14):                                                                                             # spiral shin wraps
            t = i / 14; y0 = 4.5 - 2.4 * t
            g.cap((s * 2.3 + 1.33 * np.cos(i * 1.2), y0, 0.5 + 1.25 * np.sin(i * 1.2)), (s * 2.3 + 1.33 * np.cos(i * 1.2 + 1.2), y0 - 0.17, 0.5 + 1.25 * np.sin(i * 1.2 + 1.2)), 0.12, 0.12, LE2, SH)
        g.cap(kn, ft, 1.3, 1.1, SK, SH)
        for k in range(36):                                                                                             # fur cuff
            a = k / 36 * 2 * np.pi; base = (s * 2.3 + 1.45 * np.cos(a), 2.4, 0.4 + 1.4 * np.sin(a))
            g.spike(base, (s * 2.3 + 1.75 * np.cos(a), 1.75 + rng.uniform(-0.15, 0.15), 0.4 + 1.7 * np.sin(a)), 0.16, HAIR if k % 3 else LE2, SH)
        for i in range(4):                                                                                              # laces, toe cap, toe spikes, sole
            y = 1.45 - i * 0.22; g.cap((s * 2.3 - 0.45, y, 2.05 + i * 0.12), (s * 2.3 + 0.45, y - 0.1, 2.12 + i * 0.12), 0.06, 0.06, LE2, SH)
        for dx in (-0.55, 0, 0.55): g.spike((s * 2.3 + dx, 0.6, 2.85), (s * 2.3 + dx, 0.5, 3.45), 0.22, FED, SH)
        g.ell((s * 2.3, 0.8, 2.6), (1.0, 0.6, 0.5), FE, SH)
        g.box((s * 2.3 - 1.3, 0.0, -0.9), (s * 2.3 + 1.3, 0.25, 2.95), FED, SH)
        g.ell((s * 2.3, 0.85, 1.0), (1.3, 0.85, 1.95), LED, SH)

    g.chunky(body=[SK, LE, LE2, LED, WD], tones=[SK2, SK3, LE2, LED, WDD], rate=0.02, bites=0.04, sizes=(1, 1, 2, 2, 3, 4, 6))
    g.tiles({SK: (SK2, SK3), LE: (LE2, LED), WD: (WD2, WDD)}, None, size=6)

# Flipbook sheets used (metadata from the sheet library's entries; PNGs come from --sheets)
def sheet(id, layout, mode, life, light, orient, fps=None, frames=16):
    return {'id': id, 'file': id + '.png', 'FlipbookLayout': layout, 'FlipbookMode': mode, 'FlipbookFramerate': fps, 'Lifetime': life,
            'LightEmission': light, 'Orientation': orient, 'frames': frames}
IMPACT = sheet('earth/40-big-impact', 'Grid4x4', 'OneShot', 1.1, 0.0, 'FacingCamera')
SPIKES = sheet('earth/16-spikes-heavy', 'Grid4x4', 'OneShot', 1.0, 0.0, 'FacingCamera')
CRACKS = sheet('earth/11-ground-decal', 'Grid4x4', 'OneShot', 1.5, 0.0, 'VelocityPerpendicular')
DUST = sheet('sand/17-cloud-puff-heavy', 'Grid4x4', 'OneShot', 1.2, 0.0, 'FacingCamera')
ROAR = sheet('wind/04-shockwave', 'Grid8x8', 'OneShot', 0.6, 0.8, 'FacingCamera', frames=64)
AURA = sheet('earth/09-aura', 'Grid4x4', 'Loop', 1.0, 0.0, 'FacingCamera', fps=16.0)

ANIM = {'len': 6.0, 'periods': {'B': 3.0, 'L': 6.0},
        'action': {'every': [5, 9], 'first': 2.0, 'len': 2.6,
                   'phases': {'raise': [0.45, 0.95, 0.45, 0.12], 'slam': [1.07, 1.45, 0.12, 0.7], 'roar': [0.35, 0.95, 0.3, 0.2]}},
        'joints': {
            'Hips': {'pos': {'y': [[0.12, 'B', 0], ['slam', -0.9]]}, 'rot': {'x': [['slam', 8]]}},
            'Chest': {'rot': {'x': [[1.5, 'B', 0], ['raise', -14], ['slam', 24]], 'y': [['raise', -10], ['slam', 6]]}},
            'Head': {'rot': {'x': [[2, 'B', 1], ['roar', -20], ['slam', -8]], 'y': [[8, 'L', 0]]}},
            'Jaw': {'rot': {'x': [[2, 'B', 0.5], ['roar', 30], [3]]}},
            'UpperArmR': {'rot': {'x': [[3, 'B', 0.3], ['raise', -170], ['slam', -60]], 'z': [['raise', -10]]}},
            'ForearmR': {'rot': {'x': [['raise', -60], ['slam', -15]]}},
            'HandR': {'rot': {'x': [['raise', -15], ['slam', 20]]}},
            'UpperArmL': {'rot': {'x': [[3, 'B', 0.8], ['raise', -45], ['slam', -25]], 'z': [['raise', 15], [4, 'B', 0.8]]}},
            'ForearmL': {'rot': {'x': [['raise', -50], ['slam', -20]]}},
            'ThighR': {'rot': {'x': [['slam', -25]]}}, 'ShinR': {'rot': {'x': [['slam', 30]]}},
            'ThighL': {'rot': {'x': [['slam', -10]]}}, 'ShinL': {'rot': {'x': [['slam', 15]]}}},
        'fx': [{'att': 'MouthFX', 'burst': 0.45}, {'att': 'AuraFX', 'on': 0.3, 'off': 1.2}, {'att': 'ClubFX', 'burst': 1.07}]}
FX = {'MouthFX': {'seg': 'Head', 'pos': (0, 16.2, 4.3), 'pack': [{'sheet': ROAR, 'size': 8, 'count': 1}]},
      'AuraFX': {'seg': 'Hips', 'pos': (0, 6.5, 0.3), 'pack': [{'sheet': AURA, 'size': 16}]},
      'ClubFX': {'seg': 'HandR', 'pos': CLUB_TIP, 'pack': [{'sheet': IMPACT, 'size': 18, 'count': 1}, {'sheet': SPIKES, 'size': 10, 'count': 1},
                                                          {'sheet': CRACKS, 'size': 14, 'count': 1}, {'sheet': DUST, 'size': 10, 'count': 3}]}}
CAMS = [{'ang': 155, 'dist': 62, 'y': 15, 'look': [0, 10, -2], 'studio_pos': [26, 16, 42], 'studio_target': [0, 10, 3]},
        {'ang': 235, 'dist': 56, 'y': 19, 'look': [0, 10, -2]}]

if __name__ == '__main__':
    a = sys.argv[1:]; sheets = a[a.index('--sheets') + 1] if '--sheets' in a else 'sheets'
    out = [x for x in a if not x.startswith('--') and x != sheets][0] if a else 'out'
    make('Orc', SEG, PAL, (-10, 10, -0.5, 23, -6, 14.5), SC, shape, ANIM, FX, out, CAMS, block=BLOCK, fx_lib_dir=sheets)
