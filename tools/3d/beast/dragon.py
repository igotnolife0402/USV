#!/usr/bin/env python3
"""Black dragon from the owner's concept sheet: ~165-stud wingspan, flight loop + purple fire breath every 5-9 s.
Usage: python3 dragon.py <outdir>"""
import math, sys
import numpy as np
from rig import make

SC = 3.0                                   # design unit -> studs
PAL = [None, ('Scale', '#0d0b12', 's'), ('Scale', '#16131e', 's'), ('Scale', '#211c2b', 's'), ('Ridge', '#342c42', 's'),
       ('Membrane', '#1c1429', 's'), ('Membrane', '#2e2148', 's'), ('Membrane', '#4b3780', 's'), ('Membrane', '#7a5fbd', 's'),
       ('Glow', '#a24dff', 'n'), ('GlowCore', '#e4c8ff', 'n'), ('Bone', '#d9d1e8', 's'), ('Claw', '#2c1f45', 's'), ('Plate', '#2a2436', 's'),
       ('Vein', '#140e1f', 's')]
BLK, DRK, SC3, RDG, M1, M2, M3, M4, GLOW, CORE, BONE, CLAW, PLT, VEIN = range(1, 15)

SEG = [('Torso', None, (0, 0, 0)), ('Neck1', 'Torso', (0, 1.8, 5.0)), ('Neck2', 'Neck1', (0, 3.3, 7.1)), ('Neck3', 'Neck2', (0, 4.7, 8.9)),
       ('Head', 'Neck3', (0, 6.0, 10.6)), ('Jaw', 'Head', (0, 5.3, 11.4)),
       ('WingR', 'Torso', (-2.3, 2.3, 2.4)), ('WingTipR', 'WingR', (-13.6, 5.2, 2.4)),     # facing +Z, -X is the dragon's right
       ('WingL', 'Torso', (2.3, 2.3, 2.4)), ('WingTipL', 'WingL', (13.6, 5.2, 2.4))]
TAILN = 8
TP = [(0, 0.3, -5.6)]
for k in range(TAILN):
    a = k / (TAILN - 1); x, y, z = TP[-1]; TP.append((0, y - 0.35 + 0.75 * a * a, z - (2.9 - 0.12 * k)))
for k in range(TAILN): SEG.append((f'Tail{k + 1}', 'Torso' if k == 0 else f'Tail{k}', TP[k]))
PIV = {n: p for n, _, p in SEG}

def shape(g, stud):
    V, rng, T = g.V, g.rng, 'Torso'
    horn = lambda pts, r0, seg: g.horn(pts, r0, DRK, seg, RDG, ring=RDG)
    # ---- torso, legs, spike rows ----
    band = lambda x, y, z: (np.floor(z / (V * 3)).astype(int) % 2 == 0) & (y < -1.0) & (np.abs(x) < 1.6)
    BODY = [((0, 0.6, 3.0), (2.8, 2.6, 3.1)), ((0, 0.1, -0.6), (2.5, 2.3, 4.2)), ((0, 0.2, -4.2), (2.1, 1.9, 2.4))]
    for c, r in BODY: g.ell(c, r, PLT, T, where=band)
    for c, r in BODY + [((-2.1, 1.5, 2.8), (1.25, 1.15, 1.45)), ((2.1, 1.5, 2.8), (1.25, 1.15, 1.45))]: g.ell(c, r, BLK, T)
    for s in (-1, 1):
        g.ell((s * 1.5, -0.6, 4.9), (0.9, 1.2, 0.9), DRK, T)
        g.cap((s * 2.1, -0.2, 3.6), (s * 2.6, -1.9, 5.6), 1.0, 0.75, BLK, T); g.cap((s * 2.6, -1.9, 5.6), (s * 2.5, -2.5, 7.5), 0.75, 0.55, DRK, T)
        for k in range(3): g.spike((s * 2.6, -1.6 + 0.05 * k, 5.9 + 0.5 * k), (s * 2.9, -1.0, 5.3 + 0.5 * k), 0.17, DRK, T, RDG)
        g.ell((s * 2.5, -2.75, 8.0), (0.8, 0.42, 0.85), BLK, T)
        for dx in (-0.5, -0.17, 0.17, 0.5):
            g.cap((s * 2.5 + dx, -2.8, 8.4), (s * 2.5 + dx * 1.2, -3.0, 8.9), 0.17, 0.15, BLK, T)
            g.spike((s * 2.5 + dx * 1.2, -3.0, 8.9), (s * 2.5 + dx * 1.35, -3.7, 9.4), 0.17, CLAW, T, GLOW)
        g.ell((s * 2.1, -0.5, -4.1), (1.2, 1.7, 1.7), BLK, T)
        g.cap((s * 2.3, -1.5, -4.9), (s * 2.35, -2.3, -7.6), 0.8, 0.52, DRK, T)
        for k in range(3): g.spike((s * 2.35, -1.3 - 0.25 * k, -5.4 - 0.7 * k), (s * 2.5, -0.6 - 0.25 * k, -6.0 - 0.7 * k), 0.17, DRK, T, RDG)
        g.cap((s * 2.35, -2.4, -7.8), (s * 2.35, -2.5, -9.0), 0.48, 0.4, BLK, T)
        for dx in (-0.4, 0, 0.4): g.spike((s * 2.35 + dx, -2.55, -9.2), (s * 2.35 + dx * 1.3, -2.9, -10.3), 0.2, CLAW, T, GLOW)
        for z in np.arange(4.6, -4.8, -0.85):
            yy = 1.2 + 0.6 * math.exp(-((z - 2.6) / 3) ** 2); g.spike((s * 1.6, yy, z), (s * 2.35, yy + 0.7, z - 0.6), 0.24, DRK, T, RDG)
    for k, z in enumerate(np.arange(5.0, -6.2, -0.55)):
        top = 2.3 + 1.1 * math.exp(-((z - 2.4) / 3.5) ** 2) - 0.3; h = (1.5 + 0.9 * math.sin(math.pi * (k + 1) / 22)) * (1.0 if k % 2 == 0 else 0.6)
        g.spike((0, top, z), (0, top + h, z - 0.9 * h), 0.5 if k % 2 == 0 else 0.34, DRK, T, RDG)
    # ---- neck ----
    path = [(0, 0.9, 3.8), PIV['Neck1'], PIV['Neck2'], PIV['Neck3'], PIV['Head']]; rads = [2.1, 1.9, 1.7, 1.5, 1.35]
    for i in range(4):
        a, b = path[i], path[i + 1]; seg = ['Torso', 'Neck1', 'Neck2', 'Neck3'][i]
        und = lambda x, y, z, t, a=a, b=b, r=rads[i]: (y < a[1] + (b[1] - a[1]) * t - r * 0.45) & (np.abs(x) < 1.0) & (np.floor((y + z) / (V * 3)).astype(int) % 2 == 0)
        g.cap(a, b, rads[i], rads[i + 1], PLT, seg, where=und); g.cap(a, b, rads[i], rads[i + 1], BLK, seg)
        for f in (0.2, 0.55, 0.85):
            p = [a[j] + (b[j] - a[j]) * f for j in range(3)]; r = rads[i] + (rads[i + 1] - rads[i]) * f; h = 1.3 if f == 0.55 else 0.8
            g.spike((0, p[1] + r * 0.75, p[2]), (0, p[1] + r + h, p[2] - h), 0.4 if f == 0.55 else 0.28, DRK, seg, RDG)
            for s in (-1, 1): g.spike((s * r * 0.6, p[1] + r * 0.55, p[2] + 0.2), (s * (r * 0.6 + 0.6), p[1] + r + 0.35, p[2] - 0.5), 0.18, DRK, seg, RDG)
    # ---- head ----
    H, J = 'Head', 'Jaw'
    g.ell((0, 6.55, 11.7), (1.7, 1.4, 1.95), BLK, H)
    snout = lambda x, y, z: (z > 12.2) & (z < 16.0) & (y > 5.55) & (y < 7.0 - (z - 12.2) * 0.17) & (np.abs(x) < 1.18 - (z - 12.2) * 0.1)
    g.box((-1.3, 5.4, 12.0), (1.3, 7.1, 16.1), DRK, H, where=lambda x, y, z: snout(x, y, z) & (y > 6.62 - (z - 12.2) * 0.17))
    g.box((-1.3, 5.4, 12.0), (1.3, 7.1, 16.1), BLK, H, where=snout)
    g.box((-1.3, 5.4, 12.0), (1.3, 7.1, 16.1), RDG, H, over=True, where=lambda x, y, z: snout(x, y, z) & (y > 6.8 - (z - 12.2) * 0.17) & (np.abs(x) < 0.25))
    for s in (-1, 1):
        g.box((s * 0.95 - 0.55, 7.05, 11.5), (s * 0.95 + 0.55, 7.65, 13.5), RDG, H)
        for k in range(3): g.spike((s * (0.9 + 0.25 * k), 7.5, 12.9 - 0.45 * k), (s * (1.2 + 0.35 * k), 8.3, 12.4 - 0.5 * k), 0.17, DRK, H, RDG)
        g.box((s * 1.25 - 0.3, 6.6, 12.35), (s * 1.25 + 0.3, 7.05, 13.45), GLOW, H, True)
        g.box((s * 1.36 - 0.18, 6.75, 12.75), (s * 1.36 + 0.18, 6.95, 13.1), CORE, H, True)
        g.box((s * 0.55 - 0.22, 6.45, 15.35), (s * 0.55 + 0.22, 6.8, 15.9), GLOW, H, True)
        horn([(s * 0.85, 7.6, 11.6), (s * 1.3, 8.8, 10.3), (s * 1.8, 9.9, 8.6), (s * 2.1, 10.5, 7.0), (s * 2.15, 10.6, 6.0)], 0.68, H)
        horn([(s * 1.35, 7.25, 11.0), (s * 2.2, 8.0, 9.9), (s * 2.9, 8.5, 8.5), (s * 3.2, 8.6, 7.6)], 0.46, H)
        horn([(s * 1.55, 6.5, 10.9), (s * 2.5, 6.7, 9.8), (s * 3.3, 6.6, 8.7)], 0.38, H)
        horn([(s * 1.45, 5.9, 11.4), (s * 2.3, 5.5, 10.4), (s * 2.9, 5.1, 9.6)], 0.28, H)
        for z0 in np.arange(12.5, 15.9, 0.34):
            L = 0.75 if abs(z0 - 14.9) < 0.2 or abs(z0 - 12.85) < 0.2 else 0.42; xx = s * (1.0 - (z0 - 12.2) * 0.1)
            g.spike((xx, 5.62, z0), (xx, 5.62 - L, z0), 0.14, BONE, H)
        g.box((s * 0.6 - 0.45, 5.5, 12.4), (s * 0.6 + 0.45, 5.8, 15.5), GLOW, H, True)
    horn([(0, 7.85, 11.4), (0, 9.1, 10.2), (0, 10.6, 8.6), (0, 11.2, 7.4)], 0.55, H)
    horn([(0, 7.6, 12.8), (0, 8.7, 11.8), (0, 9.2, 11.0)], 0.32, H)
    g.spike((0, 6.9, 15.6), (0, 7.8, 15.0), 0.22, DRK, H, RDG)
    jaw = lambda x, y, z: (z > 11.0) & (z < 15.5) & (y > 4.55) & (y < 5.45) & (np.abs(x) < 1.02 - (z - 11.0) * 0.08)
    jl, jh = (-1.1, 4.4, 10.9), (1.1, 5.6, 15.6)
    g.box(jl, jh, DRK, J, where=lambda x, y, z: jaw(x, y, z) & (y < 4.95)); g.box(jl, jh, BLK, J, where=jaw)
    g.box(jl, jh, GLOW, J, over=True, where=lambda x, y, z: jaw(x, y, z) & (y > 5.12) & (np.abs(x) < 0.6) & (z > 11.6) & (z < 15.0))
    g.box(jl, jh, CORE, J, over=True, where=lambda x, y, z: jaw(x, y, z) & (y > 5.12) & (np.abs(x) < 0.25) & (z > 12.2) & (z < 14.4))
    for s in (-1, 1):
        for z0 in np.arange(12.2, 15.3, 0.34):
            L = 0.6 if abs(z0 - 14.6) < 0.2 else 0.36; xx = s * (0.88 - (z0 - 11.0) * 0.08); g.spike((xx, 5.4, z0), (xx, 5.4 + L, z0), 0.14, BONE, J)
        for k in range(3): g.spike((s * 0.95, 4.7, 11.4 + 0.9 * k), (s * (1.9 - 0.3 * k), 3.9 + 0.2 * k, 10.4 + 0.9 * k), 0.24 - 0.04 * k, DRK, J, RDG)
    # ---- wings: bones, knuckles, spikes, membrane with veins, scalloped and torn trailing edge ----
    for s in (-1, 1):
        w1, w2 = ('WingR', 'WingTipR') if s < 0 else ('WingL', 'WingTipL')
        Sh, E, W = (s * 2.3, 2.3, 2.4), (s * 7.2, 4.2, 1.2), (s * 13.6, 5.2, 2.4)
        tips = [(s * 26.5, 4.6, -1.2), (s * 24.4, 3.2, -9.0), (s * 19.4, 2.2, -13.2), (s * 13.6, 1.7, -12.4)]
        back = (s * 6.0, 1.4, -8.2); bp = [(s * 2.5, 1.6, -1.5), (s * 2.2, 1.2, -4.6)]
        bones = [(Sh, E, 0.62, 0.5, w1), (E, W, 0.5, 0.42, w1)] + [(W, t, 0.38, 0.13, w2) for t in tips]
        for a, b, r0, r1, seg in bones: g.cap(a, b, r0, r1, BLK if seg == w1 else DRK, seg)
        g.ell(E, (0.65, 0.6, 0.65), DRK, w1); g.ell(W, (0.68, 0.6, 0.68), DRK, w2)
        g.spike(E, (s * 7.4, 5.4, 0.2), 0.32, DRK, w1, RDG); g.spike(W, (s * 14.3, 6.3, 4.0), 0.38, DRK, w2, GLOW)
        for f in (0.25, 0.5, 0.75):
            p = [Sh[j] + (E[j] - Sh[j]) * f for j in range(3)]; g.spike((p[0], p[1] + 0.4, p[2]), (p[0] + s * 0.25, p[1] + 1.3, p[2] - 0.5), 0.22, DRK, w1, RDG)
            p = [E[j] + (W[j] - E[j]) * f for j in range(3)]; g.spike((p[0], p[1] + 0.35, p[2]), (p[0] + s * 0.25, p[1] + 1.1, p[2] - 0.4), 0.2, DRK, w1, RDG)
        for t in tips:
            for f in (0.35, 0.7): g.ell([W[j] + (t[j] - W[j]) * f for j in range(3)], (0.3, 0.28, 0.3), DRK, w2)
            g.spike(t, (t[0] + s * 0.8, t[1] - 0.3, t[2] - 1.0), 0.24, CLAW, w2, GLOW)
        cuts = []
        for a, b in [(tips[0], tips[1]), (tips[1], tips[2]), (tips[2], tips[3]), (tips[3], back)]:
            a, b = np.array(a), np.array(b); m = (a + b) / 2; L = np.linalg.norm(b - a)
            e = (b - a)[[0, 2]] / L; nr = np.array([-e[1], e[0]])
            if nr @ (np.array([W[0], W[2]]) - m[[0, 2]]) < 0: nr = -nr
            cx, cz = m[[0, 2]] - nr * 0.6 * L
            cuts.append(lambda x, y, z, cx=cx, cz=cz, R=0.72 * L: (x - cx) ** 2 + (z - cz) ** 2 < R * R)
            for _ in range(int(L * 1.2)):
                q = a + (b - a) * rng.uniform(0.15, 0.85); hr = rng.uniform(0.18, 0.4); qq = np.array([q[0], q[2]]) + nr * rng.uniform(0.25, 0.9)
                cuts.append(lambda x, y, z, qx=qq[0], qz=qq[1], R=hr: (x - qx) ** 2 + (z - qz) ** 2 < R * R)
        def colfn(x, y, z, shp, bones=bones, W=W, E=E, tips=tips, back=back):
            dmin = np.full(shp, 99.0, np.float32); veins = np.zeros(shp, bool)
            for a, b, *_ in bones: dmin = np.minimum(dmin, g.segd(a, b, x, y, z)[1])
            for a in (W, E):
                for t in tips + [back]:
                    mid = [(a[j] + t[j]) / 2 for j in range(3)]; veins |= g.segd(a, [(mid[j] + t[j]) / 2 for j in range(3)], x, y, z)[1] < V * 0.6
            patch = rng.random((shp[0] // 3 + 2, shp[1] // 3 + 2, shp[2] // 3 + 2)).astype(np.float32)
            ii = np.indices(shp); shade = dmin / 3.4 + (patch[ii[0] // 3, ii[1] // 3, ii[2] // 3] - 0.5) * 0.45
            col = np.where(shade < 0.3, M1, np.where(shade < 0.7, M2, np.where(shade < 1.1, M3, M4))).astype(np.uint8)
            col[veins & (shade > 0.3)] = VEIN
            return col
        tris = [(Sh, E, bp[0]), (E, bp[0], bp[1]), (E, W, bp[1]), (W, tips[3], bp[1]), (tips[3], bp[1], back),
                (W, tips[0], tips[1]), (W, tips[1], tips[2]), (W, tips[2], tips[3])]
        g.sheet(tris, colfn, lambda x, y, z, w1=w1, w2=w2: {w1: np.abs(x) < 13.4, w2: np.abs(x) >= 13.4}, cuts)
    # ---- tail ----
    for k in range(TAILN):
        a, b = TP[k], TP[k + 1]; seg = f'Tail{k + 1}'; r0, r1 = 1.75 - k * 0.19, 1.75 - (k + 1) * 0.19
        und = lambda x, y, z, t, a=a, b=b, r=r0: (y < a[1] + (b[1] - a[1]) * t - r * 0.45) & (np.abs(x) < 0.85) & (np.floor(z / (V * 3)).astype(int) % 2 == 0)
        g.cap(a, b, r0, r1, PLT, seg, where=und); g.cap(a, b, r0, r1, BLK, seg)
        for f in (0.15, 0.5, 0.85):
            p = [a[j] + (b[j] - a[j]) * f for j in range(3)]; r = r0 + (r1 - r0) * f; big = f == 0.5; h = (1.6 if big else 0.9) - k * 0.1
            g.spike((0, p[1] + r * 0.75, p[2] + 0.3), (0, p[1] + r + h, p[2] - 0.9 * h), (0.38 if big else 0.26) - k * 0.02, DRK, seg, GLOW if k >= 5 and big else RDG)
            for s in (-1, 1): g.spike((s * r * 0.7, p[1] + r * 0.35, p[2]), (s * (r + 0.55), p[1] + r * 0.6, p[2] - 0.7), 0.18, DRK, seg, RDG)
    tip = TP[-1]
    for d in [(0, 0.5, -2.8), (-1.5, 0.2, -1.9), (1.5, 0.2, -1.9), (0, 1.7, -1.7), (0, -1.1, -1.8), (-0.9, 1.1, -1.6), (0.9, 1.1, -1.6)]:
        g.spike(tip, (tip[0] + d[0], tip[1] + d[1], tip[2] + d[2]), 0.42, DRK, f'Tail{TAILN}', GLOW)
    g.chunky(body=[BLK, DRK, SC3, PLT, RDG], tones=[BLK, DRK, SC3, RDG], rate=0.045, bites=0.10)
    g.tiles({BLK: (DRK, SC3)}, None, size=3)

hpi = math.pi / 2
ANIM = {'len': 6.0, 'periods': {'F': 1.5, 'T': 3.0},
        'action': {'every': [5, 9], 'first': 3.4, 'len': 2.4,
                   'phases': {'wind': [0.15, 0.45, 0.15, 0.15], 'fire': [0.75, 1.9, 0.25, 0.25], 'jaw': [0.55, 2.0, 0.2, 0.2]}},
        'joints': {'Torso': {'rot': {'x': [[3, 'F', 0]], 'z': [[2, 'T', 0]]}, 'pos': {'y': [[0.7 * SC, 'F', hpi]]}},
                   'Neck1': {'rot': {'x': [[-4, 'F', 1], ['wind', -8], ['fire', 6]]}}, 'Neck2': {'rot': {'x': [[-3, 'F', 1.3], ['wind', -6], ['fire', 5]]}},
                   'Neck3': {'rot': {'x': [[-2, 'F', 1.6], ['wind', -6], ['fire', 4]]}}, 'Head': {'rot': {'x': [[3, 'F', 1.9], ['wind', -8], ['fire', -10]]}},
                   'Jaw': {'rot': {'x': [['jaw', 34]]}},
                   'WingR': {'rot': {'y': [[-4, 'F', hpi]], 'z': [[38, 'F', hpi], [-4]]}}, 'WingTipR': {'rot': {'z': [[26, 'F', hpi - 0.9], [6]]}},
                   'WingL': {'rot': {'y': [[4, 'F', hpi]], 'z': [[-38, 'F', hpi], [4]]}}, 'WingTipL': {'rot': {'z': [[-26, 'F', hpi - 0.9], [-6]]}},
                   **{f'Tail{k + 1}': {'rot': {'x': [[4, 'F', -0.55 * k]], 'y': [[9, 'T', -0.6 * k]]}} for k in range(TAILN)}},
        'fx': [{'att': 'MouthFX', 'on': 0.75, 'off': 1.9}]}
FX = {'MouthFX': {'seg': 'Head', 'pos': (0, 5.5, 16.0), 'pack': ['FireBreath', 'FireCore', 'Embers', 'Smoke', 'FireLight']},
      'EyesFX': {'seg': 'Head', 'pos': (0, 6.8, 12.9), 'pack': ['EyeGlow']},
      'AuraFX': {'seg': 'Torso', 'pos': (0, 0, 0), 'pack': ['Aura', 'AuraLight']}}
CAMS = [{'ang': 125, 'dist': 200, 'y': 12, 'look': [0, 2, -8], 'studio_pos': [105, 44, 105], 'studio_target': [0, 0, -9]},
        {'ang': 210, 'dist': 215, 'y': 49, 'look': [0, 2, -8]}]

if __name__ == '__main__':
    make('BlackDragon', SEG, PAL, (-30, 30, -7, 15, -35, 21), SC, shape, ANIM, FX, sys.argv[1] if len(sys.argv) > 1 else 'out', CAMS, fx_scale=3.0)
