#!/usr/bin/env python3
"""Three more original blocky armor sets on the same R6 rig and groups as armor.py (see its docstring for the frames):
frost (Rimeguard: pale ice-steel knight, crystal clusters, cyan rime glow), solar (Dawnbringer: white-and-gold paladin,
sunburst emblems, feather wings, halo), storm (Storm Ronin: navy lacquer lamellar samurai, laced plates, kabuto with horns,
oni mask, lightning glow). Same solids, same fit, one stage per call, written straight into a live tab.

  python3 sets.py OUT <frost|solar|storm> <cuirass|pauldrons|arms|legs|helm>"""
import json, math, sys
import numpy as np
from solids import B, Kit, bez, rot, nz, X, Y, Z

OUT, SET, STAGE = sys.argv[1], sys.argv[2], sys.argv[3]
MATS = {
    'frost': {'plate': dict(color='#d3e4f1', metalness=0.82, roughness=0.2), 'steel': dict(color='#8098ae', metalness=0.9, roughness=0.3),
              'deep': dict(color='#263a55', metalness=0.3, roughness=0.6), 'silver': dict(color='#f1f6fb', metalness=1.0, roughness=0.14),
              'dark': dict(color='#111a25', metalness=0.3, roughness=0.65), 'ice': dict(color='#9fe6ff', metalness=0.05, roughness=0.06, transparency=0.18),
              'glow': dict(color='#5ff2ff', material='Neon')},
    'solar': {'plate': dict(color='#f3eee0', metalness=0.35, roughness=0.24), 'gold': dict(color='#e6b43a', metalness=1.0, roughness=0.2),
              'bronze': dict(color='#ad7230', metalness=1.0, roughness=0.32), 'cloth': dict(color='#1f3f8c', metalness=0.0, roughness=0.75),
              'dark': dict(color='#1d1813', metalness=0.3, roughness=0.6), 'glow': dict(color='#ffbf2e', material='Neon'),
              'sun': dict(color='#fff0a8', material='Neon')},
    'storm': {'lacquer': dict(color='#1d3a5e', metalness=0.45, roughness=0.22), 'black': dict(color='#101318', metalness=0.5, roughness=0.2),
              'lace': dict(color='#c8462b', metalness=0.0, roughness=0.7), 'brass': dict(color='#c99a3c', metalness=1.0, roughness=0.26),
              'teal': dict(color='#2a8a8c', metalness=0.2, roughness=0.5), 'bone': dict(color='#ece6d6', metalness=0.0, roughness=0.4),
              'dark': dict(color='#16161a', metalness=0.25, roughness=0.7), 'glow': dict(color='#86dcff', material='Neon')},
    'poison': {'plate': dict(color='#4d6b3c', metalness=0.7, roughness=0.32), 'iron': dict(color='#6b7466', metalness=0.85, roughness=0.38),
               'deep': dict(color='#16240f', metalness=0.3, roughness=0.6), 'bronze': dict(color='#a8b24e', metalness=0.92, roughness=0.36),
               'dark': dict(color='#0c100b', metalness=0.3, roughness=0.7), 'bone': dict(color='#d9d4b2', metalness=0.0, roughness=0.45),
               'glass': dict(color='#9dff5c', metalness=0.05, roughness=0.05, transparency=0.35), 'glow': dict(color='#7dff2a', material='Neon')}}
K = Kit(OUT, SET, MATS[SET])

def ngon(b, mat, base, d, r0, r1, h, n=6, up=None):          # n-sided frustum from base along d (a crystal column, a disc)
    d = nz(d); U = nz(np.cross(d, up if up is not None else (Z if abs(d[2]) < 0.9 else X))); N = np.cross(U, d); base = np.asarray(base, float)
    ring = lambda c, r: [c + (U * math.cos(2 * math.pi * i / n) + N * math.sin(2 * math.pi * i / n)) * r for i in range(n)]
    V = ring(base, r0) + ring(base + d * h, r1)
    b.solid(mat, V, [list(range(n)), list(range(n, 2 * n))] + [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)])
def crystal(b, base, d, h, r, mat='ice'):                    # hexagonal shard with a point
    d = nz(d); ngon(b, mat, base, d, r * 0.8, r, h * 0.7)
    tip = np.asarray(base, float) + d * h * 0.7; U = nz(np.cross(d, Z if abs(d[2]) < 0.9 else X)); N = np.cross(U, d)
    b.solid(mat, [tip + (U * math.cos(2 * math.pi * i / 6) + N * math.sin(2 * math.pi * i / 6)) * r for i in range(6)] + [tip + d * h * 0.3], [list(range(6))] + [[i, (i + 1) % 6, 6] for i in range(6)])
def disc(b, mat, c, N, r, t, n=12): ngon(b, mat, np.asarray(c, float) - nz(N) * t / 2, N, r, r, t, n)
def band(b, mat, c, w, d, h, t):                             # hollow rectangular band around a limb or the neck
    c = np.asarray(c, float)
    for dz in (-1, 1): b.box(mat, c + Z * dz * (d / 2 + t / 2), (w + 2 * t, h, t))
    for dx in (-1, 1): b.box(mat, c + X * dx * (w / 2 + t / 2), (t, h, d))
def feather(b, mat, c, U, V, N, l, w, t):                    # a long blade with a point, along U
    b.prism(mat, c, U, V, N, [(0, -w), (l * 0.75, -w * 0.8), (l, 0), (l * 0.75, w * 0.8), (0, w)], t)
def bolt(b, mat, pts, w, t, N=Z):                            # a zigzag of thin bars through pts (lightning)
    for a, c in zip(pts[:-1], pts[1:]):
        a, c = np.asarray(a, float), np.asarray(c, float); U = nz(c - a); V = nz(np.cross(N, U)); L = np.linalg.norm(c - a)
        b.prism(mat, (a + c) / 2, U, V, nz(N), [(-L / 2 - w / 2, -w / 2), (L / 2 + w / 2, -w / 2), (L / 2 + w / 2, w / 2), (-L / 2 - w / 2, w / 2)], t)
def lames(b, mats, c, w, h, d, n, step, tilt, trim=None, axis=Y):  # stacked overlapping plates stepping down
    for k in range(n):
        p = np.asarray(c, float) - Y * step * k
        b.box(mats[k % len(mats)], p, (w, h, d), (tilt, 0, 0))
        if trim: b.box(trim, p - Y * (h / 2 - 0.02) + Z * (d / 2 + 0.005) * np.sign(math.cos(math.radians(tilt))), (w + 0.02, 0.035, 0.03), (tilt, 0, 0))
def laced(b, plate, lace, c, w, h, rows, N=Z, U=X, t=0.06, cols=None, tilt=8):   # samurai lamellar: rows of plates with cord dots
    N, U = nz(N), nz(U); V = np.cross(N, U); c = np.asarray(c, float); dh = h / rows; cols = cols or max(2, int(w / 0.22))
    a = math.radians(tilt); V2 = V * math.cos(a) - N * math.sin(a); N2 = N * math.cos(a) + V * math.sin(a)
    for r in range(rows):
        p = c - V * (r + 0.5) * dh + N * 0.02 * r
        b.prism(plate, p, U, V2, N2, [(-w / 2, -dh * 0.58), (w / 2, -dh * 0.58), (w / 2, dh * 0.5), (-w / 2, dh * 0.5)], t)
        for i in range(cols):
            u = (i + 0.5) / cols * w - w / 2
            b.prism(lace, p + U * u + N2 * (t / 2 + 0.008), U, V2, N2, [(-0.018, -dh * 0.42), (0.018, -dh * 0.42), (0.018, dh * 0.42), (-0.018, dh * 0.42)], 0.016)
        b.prism(lace, p + N2 * (t / 2 + 0.006) - V2 * dh * 0.2, U, V2, N2, [(-w / 2, -0.012), (w / 2, -0.012), (w / 2, 0.012), (-w / 2, 0.012)], 0.012)

# =============================================================================================== FROST: Rimeguard
def frost():
    if STAGE == 'cuirass':
        b = B(); b.box('dark', (0, 0, 0), (2.06, 2.02, 1.06))
        U, V, N = rot(-5, 0, 0); b.octa('plate', (0, 0.42, 0.6), U, V, N, 0.98, 0.56, 0.14, 0.22)          # breastplate
        b.octa('steel', (0, 0.42, 0.56), U, V, N, 1.02, 0.6, 0.06, 0.22)
        b.prism('silver', (0, 0.42, 0.68), X, Z, Y, [(-0.06, -0.02), (0.06, -0.02), (0, 0.08)], 1.0)     # medial ridge
        for a in (0, 60, 120):                                                                              # snowflake sigil
            b.box('silver', (0, 0.5, 0.74), (0.5, 0.05, 0.04), (0, 0, a))
            for s_ in (-1, 1):
                p = np.array([math.cos(math.radians(a)), math.sin(math.radians(a)), 0]) * 0.18 * s_ + np.array([0, 0.5, 0.75])
                b.box('silver', p, (0.12, 0.035, 0.03), (0, 0, a + 45)); b.box('silver', p, (0.12, 0.035, 0.03), (0, 0, a - 45))
        disc(b, 'glow', (0, 0.5, 0.77), Z, 0.07, 0.04, 6)
        for sx in (-1, 1):
            b.box('steel', (sx * 1.02, 0.3, 0), (0.1, 1.5, 0.98)); b.box('silver', (sx * 1.04, 0.3, 0.46), (0.06, 1.5, 0.05))
            lames(b, ['plate', 'steel'], (sx * 1.07, 0.85, 0), 0.08, 0.3, 0.9, 5, 0.27, 0)
            crystal(b, (sx * 0.62, 0.9, -0.62), (sx * 0.4, 1, -0.6), 0.5, 0.07); crystal(b, (sx * 0.4, 0.75, -0.64), (sx * 0.1, 1, -0.8), 0.36, 0.05)
        for k in range(3):                                                                                 # abdomen lames
            y = -0.08 - 0.23 * k; w = 1.8 - 0.08 * k
            b.box('steel' if k % 2 else 'plate', (0, y, 0.58), (w, 0.23, 0.1), (-8, 0, 0)); b.box('silver', (0, y - 0.1, 0.645), (w, 0.035, 0.04), (-8, 0, 0))
        b.box('glow', (0, -0.71, 0.6), (1.4, 0.025, 0.02))
        b.box('plate', (0, 0.3, -0.585), (1.96, 1.3, 0.12)); b.box('silver', (0, 0.3, -0.655), (0.08, 1.2, 0.03))
        lames(b, ['plate', 'steel'], (0, -0.42, -0.6), 1.9, 0.22, 0.1, 3, 0.18, 8, 'silver')
        b.box('plate', (0, 1.04, 0), (2.08, 0.1, 1.1)); band(b, 'steel', (0, 1.16, 0), 1.44, 1.44, 0.16, 0.1); band(b, 'silver', (0, 1.25, 0), 1.44, 1.44, 0.03, 0.12)
        b.box('steel', (0, -0.9, 0), (2.12, 0.2, 1.12)); b.box('silver', (0, -0.9, 0), (2.14, 0.04, 1.14))
        b.octa('silver', (0, -0.9, 0.6), X, Y, Z, 0.24, 0.17, 0.06); b.octa('plate', (0, -0.9, 0.64), X, Y, Z, 0.2, 0.13, 0.05); disc(b, 'glow', (0, -0.9, 0.67), Z, 0.05, 0.03, 6)
        b.box('deep', (0, -1.25, 0.56), (0.62, 0.5, 0.04)); b.prism('deep', (0, -1.55, 0.56), X, Y, Z, [(-0.31, 0.06), (0.31, 0.06), (0, -0.14)], 0.04)   # tabard
        b.box('silver', (0, -1.25, 0.585), (0.62, 0.03, 0.02)); b.box('silver', (0, -1.27, 0.585), (0.03, 0.4, 0.02))
        for sx in (-1, 1): b.box('silver', (sx * 0.31, -1.27, 0.57), (0.03, 0.56, 0.05))
        K.emit('CP', b, 'Cuirass')
    if STAGE == 'pauldrons':
        b = B(); b.box('dark', (-0.12, 0.12, 0), (1.12, 0.2, 1.12))
        for k, (w, h) in enumerate(((1.0, 0.18), (0.86, 0.16), (0.68, 0.14), (0.46, 0.12))):              # stepped dome
            b.box('plate' if k % 2 == 0 else 'steel', (-0.06 + 0.04 * k, 0.22 + 0.12 * k, 0), (w, h, w + 0.24))
            b.box('silver', (-0.06 + 0.04 * k, 0.22 + 0.12 * k - h / 2 + 0.02, 0), (w + 0.03, 0.035, w + 0.27))
        for k in range(3):                                                                                 # lames down the outside
            a = -(28 + 14 * k); U, V, N = rot(0, 0, a); c = np.array([0.42 + 0.08 * k, 0.06 - 0.2 * k, 0])
            b.box('plate' if k % 2 else 'steel', c, (0.5, 0.15, 1.24 - 0.06 * k), (0, 0, a))
            b.box('silver', c + U * 0.25, (0.05, 0.05, 1.26 - 0.06 * k), (0, 0, a))
        b.box('glow', (0.56, -0.12, 0), (0.03, 0.03, 1.1), (0, 0, -42))
        for d, h, r in (((0.2, 1, 0.1), 0.62, 0.09), ((0.6, 1, 0.35), 0.48, 0.07), ((0.55, 0.9, -0.4), 0.44, 0.07), ((0.1, 1, -0.3), 0.34, 0.05), ((0.9, 0.6, 0.0), 0.3, 0.05)):
            crystal(b, (0.08 + 0.1 * d[0], 0.6, 0.12 * d[2]), d, h, r)
        K.pair('LS', 'RS', b, 'Pauldron')
    if STAGE == 'arms':
        b = B(); b.box('deep', (0, 1.0, 0), (1.04, 0.92, 1.04))
        for y in (1.3, 1.05, 0.8): b.box('steel', (0, y, 0), (1.08, 0.1, 1.08))
        b.box('plate', (0, 0.52, 0), (1.1, 0.16, 1.1)); disc(b, 'steel', (0, 0.52, -0.6), -Z, 0.26, 0.08, 8); disc(b, 'plate', (0, 0.52, -0.64), -Z, 0.18, 0.06, 8)
        crystal(b, (0, 0.52, -0.66), (0, -0.2, -1), 0.26, 0.05)
        b.box('plate', (0, 0.17, 0), (1.12, 0.56, 1.12))
        for y in (0.43, -0.09): b.box('silver', (0, y, 0), (1.16, 0.05, 1.16))
        for sx in (-1, 1): b.prism('silver', (0.4 * sx, 0.17, 0.57), Y, Z, X, [(-0.25, 0), (0.25, 0), (0, 0.05)], 0.05)
        b.prism('steel', (0.57, 0.17, 0), Y, X, Z, [(-0.24, 0), (0.24, 0), (0, 0.06)], 0.5)
        b.box('glow', (0.6, 0.17, 0), (0.02, 0.4, 0.03))
        crystal(b, (0.56, 0.3, -0.25), (1, 0.5, -0.5), 0.3, 0.05); crystal(b, (0.56, 0.1, -0.3), (1, 0.1, -0.6), 0.22, 0.04)
        b.box('steel', (0, -0.3, 0), (1.08, 0.4, 1.08)); b.box('silver', (0, -0.1, 0), (1.18, 0.06, 1.18))
        for r in range(3):
            for i, x in enumerate((-0.33, -0.11, 0.11, 0.33)): b.box('plate' if r % 2 == 0 else 'steel', (x, -0.17 - 0.11 * r, 0.56 + 0.01 * r), (0.19, 0.1, 0.07))
        b.box('plate', (0.57, -0.3, 0), (0.08, 0.34, 0.9)); b.box('plate', (-0.56, -0.32, 0.3), (0.08, 0.3, 0.2))
        K.pair('LV', 'RV', b, 'Vambrace')
    if STAGE == 'legs':
        g = B(); g.box('deep', (0, 0.45, 0), (1.04, 0.8, 1.04)); g.box('plate', (0, 0.42, 0), (1.08, 0.5, 1.08))
        lames(g, ['plate', 'steel'], (0, 0.74, 0.58), 1.0, 0.22, 0.08, 3, 0.2, -10, 'silver')
        g.box('steel', (0.56, 0.42, 0), (0.08, 0.5, 0.9)); g.box('silver', (0.6, 0.42, 0), (0.03, 0.44, 0.04))
        disc(g, 'steel', (0, -0.06, 0.57), Z, 0.32, 0.1, 8); disc(g, 'plate', (0, -0.06, 0.63), Z, 0.24, 0.06, 8); disc(g, 'glow', (0, -0.06, 0.665), Z, 0.07, 0.02, 6)
        crystal(g, (0, -0.06, 0.66), (0, 0.3, 1), 0.24, 0.05)
        for sx in (-1, 1): g.box('steel', (sx * 0.5, -0.06, 0.38), (0.12, 0.3, 0.3), (0, sx * 30, 0))
        g.box('plate', (0, -0.5, 0), (1.1, 0.58, 1.1)); g.box('silver', (0, -0.2, 0), (1.14, 0.04, 1.14))
        g.prism('silver', (0, -0.5, 0.55), X, Z, Y, [(-0.07, 0), (0.07, 0), (0, 0.1)], 0.56); g.box('glow', (0, -0.5, 0.66), (0.02, 0.4, 0.02))
        crystal(g, (0.55, -0.45, -0.3), (1, 0.6, -0.6), 0.3, 0.05)
        K.pair('LG', 'RG', g, 'Greave')
        s = B(); s.box('plate', (0, -0.02, -0.06), (1.14, 0.6, 1.14)); s.box('silver', (0, 0.26, -0.06), (1.18, 0.05, 1.18))
        s.box('dark', (0, -0.3, 0.06), (1.18, 0.08, 1.42))
        for k in range(3): s.box('plate' if k % 2 == 0 else 'steel', (0, -0.1 - 0.04 * k, 0.5 + 0.12 * k), (1.0 - 0.18 * k, 0.24 - 0.04 * k, 0.16), (-16, 0, 0))
        s.spike('steel', (0, -0.2, 0.82), (0, -0.3, 1), 0.18, 0.08)
        s.box('silver', (0, 0.1, 0.5), (1.0, 0.04, 0.04)); crystal(s, (0.57, 0.05, -0.2), (1, 0.8, -0.4), 0.26, 0.05)
        K.pair('LB', 'RB', s, 'Sabaton')
    if STAGE == 'helm':
        b = B(); b.box('plate', (0, 0.02, 0), (1.34, 1.2, 1.34))
        b.box('steel', (0, -0.55, 0), (1.44, 0.14, 1.44)); b.box('silver', (0, -0.48, 0), (1.46, 0.03, 1.46))
        b.box('plate', (0, 0.66, 0), (1.2, 0.12, 1.2)); b.box('steel', (0, 0.75, 0), (1.0, 0.08, 1.0))
        b.box('silver', (0, 0.4, 0.68), (1.38, 0.08, 0.04))
        b.box('dark', (0, 0.18, 0.675), (1.06, 0.1, 0.03)); b.box('glow', (0, 0.18, 0.69), (1.0, 0.05, 0.02))     # T visor
        b.box('dark', (0, -0.05, 0.675), (0.1, 0.42, 0.03)); b.box('glow', (0, -0.05, 0.69), (0.05, 0.36, 0.02))
        b.prism('silver', (0, 0.0, 0.69), Y, Z, X, [(-0.55, 0), (0.55, 0), (0, 0.06)], 0.06)
        for sx in (-1, 1):
            for r in range(4):
                for i in range(2): b.box('dark', (sx * (0.24 + 0.1 * i), -0.18 - 0.08 * r, 0.675), (0.04, 0.03, 0.03))   # breaths
            b.box('steel', (sx * 0.7, -0.12, 0.2), (0.08, 0.8, 0.8)); b.box('silver', (sx * 0.74, -0.12, 0.2), (0.03, 0.8, 0.04))
        for d, h, r in (((0, 1, 0.2), 0.62, 0.09), ((0.4, 1, 0.1), 0.48, 0.07), ((-0.4, 1, 0.1), 0.48, 0.07), ((0.25, 1, -0.4), 0.4, 0.06), ((-0.25, 1, -0.4), 0.4, 0.06), ((0.6, 0.8, 0.3), 0.3, 0.05), ((-0.6, 0.8, 0.3), 0.3, 0.05)):
            crystal(b, (0.45 * d[0], 0.78, 0.4 * d[2]), d, h, r)                                           # ice crown
        lames(b, ['plate', 'steel'], (0, -0.2, -0.72), 1.3, 0.2, 0.1, 3, 0.17, 10, 'silver')
        K.emit('HM', b, 'Helm')

# =============================================================================================== SOLAR: Dawnbringer
def solar():
    if STAGE == 'cuirass':
        b = B(); b.box('dark', (0, 0, 0), (2.06, 2.02, 1.06))
        U, V, N = rot(-4, 0, 0); b.octa('plate', (0, 0.4, 0.6), U, V, N, 0.98, 0.58, 0.14, 0.2); b.octa('gold', (0, 0.4, 0.56), U, V, N, 1.02, 0.62, 0.06, 0.2)
        disc(b, 'gold', (0, 0.48, 0.71), Z, 0.22, 0.05, 12); disc(b, 'bronze', (0, 0.48, 0.74), Z, 0.15, 0.04, 12); disc(b, 'sun', (0, 0.48, 0.765), Z, 0.08, 0.03, 12)
        for i in range(12):                                                                                # sunburst rays
            a = 2 * math.pi * i / 12; dir_ = np.array([math.cos(a), math.sin(a), 0]); l = 0.3 if i % 2 == 0 else 0.2
            b.prism('gold', np.array([0, 0.48, 0.72]) + dir_ * 0.22, dir_, np.cross(Z, dir_), Z, [(0, -0.04), (l, 0), (0, 0.04)], 0.03)
        for sx in (-1, 1):
            b.prism('gold', (sx * 0.55, 0.78, 0.68), X * sx, Y, Z, [(-0.35, -0.03), (0.38, -0.03), (0.38, 0.03), (-0.35, 0.03)], 0.04)   # filigree
            b.box('gold', (sx * 0.85, 0.42, 0.66), (0.04, 0.6, 0.04)); b.box('plate', (sx * 1.03, 0.3, 0), (0.08, 1.5, 0.98)); b.box('gold', (sx * 1.07, 0.3, 0), (0.02, 1.4, 0.06))
        for k in range(3):
            y = -0.1 - 0.23 * k; w = 1.8 - 0.08 * k
            b.box('plate', (0, y, 0.58), (w, 0.23, 0.1), (-8, 0, 0)); b.box('gold', (0, y - 0.1, 0.645), (w, 0.035, 0.04), (-8, 0, 0))
        b.box('plate', (0, 0.3, -0.585), (1.96, 1.3, 0.12)); disc(b, 'gold', (0, 0.4, -0.66), -Z, 0.18, 0.04, 12)
        for sx in (-1, 1):                                                                                 # folded back wings
            for k in range(5):
                a = 70 - 13 * k; U = np.array([sx * math.cos(math.radians(a)), math.sin(math.radians(a)), 0]); V = np.cross(-Z, U) * sx
                feather(b, 'gold' if k % 2 == 0 else 'bronze', np.array([sx * 0.12, 0.45, -0.68 - 0.012 * k]), U, V, -Z, 0.75 - 0.08 * k, 0.07, 0.03)
        b.box('plate', (0, 1.04, 0), (2.08, 0.1, 1.1)); band(b, 'gold', (0, 1.15, 0), 1.44, 1.44, 0.14, 0.08)
        b.box('cloth', (0, -0.9, 0), (2.12, 0.2, 1.12)); b.box('gold', (0, -0.81, 0), (2.14, 0.03, 1.14)); b.box('gold', (0, -0.99, 0), (2.14, 0.03, 1.14))
        disc(b, 'gold', (0, -0.9, 0.6), Z, 0.15, 0.06, 12); disc(b, 'glow', (0, -0.9, 0.64), Z, 0.07, 0.03, 12)
        b.box('cloth', (0, -1.3, 0.56), (0.7, 0.6, 0.04)); b.prism('cloth', (0, -1.64, 0.56), X, Y, Z, [(-0.35, 0.04), (0.35, 0.04), (0, -0.16)], 0.04)
        for sx in (-1, 1): b.box('gold', (sx * 0.35, -1.32, 0.57), (0.03, 0.66, 0.05))
        disc(b, 'gold', (0, -1.25, 0.59), Z, 0.12, 0.03, 12); disc(b, 'glow', (0, -1.25, 0.61), Z, 0.05, 0.02, 12)
        K.emit('CP', b, 'Cuirass')
    if STAGE == 'pauldrons':
        b = B(); b.box('dark', (-0.12, 0.12, 0), (1.12, 0.2, 1.12))
        b.box('plate', (-0.06, 0.3, 0), (1.0, 0.24, 1.24)); b.box('gold', (-0.06, 0.2, 0), (1.03, 0.04, 1.27))
        for k in range(4):                                                                                 # feather lames
            a = -(20 + 10 * k); U, V, N = rot(0, 0, a); c = np.array([0.3 + 0.1 * k, 0.18 - 0.17 * k, 0])
            b.prism('plate', c, U, N, V, [(-0.3, -0.62 + 0.04 * k), (0.25, -0.62 + 0.04 * k), (0.38, 0), (0.25, 0.62 - 0.04 * k), (-0.3, 0.62 - 0.04 * k)], 0.12)
            b.prism('gold', c + V * 0.01, U, N, V, [(0.22, -0.64 + 0.04 * k), (0.27, -0.64 + 0.04 * k), (0.41, 0), (0.27, 0.64 - 0.04 * k), (0.22, 0.64 - 0.04 * k)], 0.13)
        disc(b, 'gold', (0.1, 0.43, 0.0), Y, 0.2, 0.04, 12); disc(b, 'glow', (0.1, 0.46, 0), Y, 0.09, 0.03, 12)
        for k in range(4):                                                                                 # winged crest
            U = nz([0.35 + 0.08 * k, 1, -0.5 - 0.25 * k]); V = nz(np.cross(X, U))
            feather(b, 'gold' if k % 2 == 0 else 'bronze', np.array([0.0, 0.42, 0.25 - 0.13 * k]), U, V, np.cross(U, V), 0.8 - 0.1 * k, 0.07, 0.03)
        K.pair('LS', 'RS', b, 'Pauldron')
    if STAGE == 'arms':
        b = B(); b.box('cloth', (0, 1.0, 0), (1.04, 0.92, 1.04))
        for y in (1.25, 0.8): b.box('gold', (0, y, 0), (1.07, 0.04, 1.07))
        b.box('plate', (0, 0.52, 0), (1.1, 0.16, 1.1)); disc(b, 'gold', (0, 0.52, -0.58), -Z, 0.22, 0.06, 12); b.spike('gold', (0, 0.52, -0.6), (0, 0, -1), 0.22, 0.06)
        b.box('plate', (0, 0.17, 0), (1.12, 0.56, 1.12))
        for y in (0.43, -0.09): b.box('gold', (0, y, 0), (1.16, 0.05, 1.16))
        disc(b, 'gold', (0.58, 0.17, 0), X, 0.17, 0.04, 12); disc(b, 'glow', (0.61, 0.17, 0), X, 0.08, 0.03, 12)
        for i in range(8):
            a = 2 * math.pi * i / 8; d = np.array([0, math.sin(a), math.cos(a)])
            b.prism('gold', np.array([0.59, 0.17, 0]) + d * 0.17, d, np.cross(X, d), X, [(0, -0.03), (0.1, 0), (0, 0.03)], 0.02)
        b.box('plate', (0, -0.08, 0), (1.26, 0.12, 1.26)); b.box('gold', (0, -0.13, 0), (1.28, 0.03, 1.28))        # flared cuff
        b.box('dark', (0, -0.32, 0), (1.06, 0.38, 1.06))
        for x in (-0.33, -0.11, 0.11, 0.33): b.box('gold', (x, -0.28, 0.55), (0.18, 0.1, 0.07)); b.box('plate', (x, -0.42, 0.55), (0.17, 0.14, 0.06))
        K.pair('LV', 'RV', b, 'Vambrace')
    if STAGE == 'legs':
        g = B(); g.box('cloth', (0, 0.45, 0), (1.04, 0.8, 1.04)); g.box('plate', (0, 0.42, 0), (1.08, 0.5, 1.08))
        lames(g, ['plate'], (0, 0.74, 0.58), 1.0, 0.22, 0.08, 3, 0.2, -10, 'gold')
        disc(g, 'gold', (0, -0.06, 0.57), Z, 0.28, 0.08, 12); disc(g, 'bronze', (0, -0.06, 0.62), Z, 0.18, 0.04, 12); disc(g, 'sun', (0, -0.06, 0.65), Z, 0.08, 0.02, 12)
        for i in range(8):
            a = 2 * math.pi * i / 8; d = np.array([math.cos(a), math.sin(a), 0])
            g.prism('gold', np.array([0, -0.06, 0.6]) + d * 0.27, d, np.cross(Z, d), Z, [(0, -0.04), (0.12, 0), (0, 0.04)], 0.03)
        g.box('plate', (0, -0.5, 0), (1.1, 0.58, 1.1)); g.box('gold', (0, -0.2, 0), (1.14, 0.04, 1.14))
        g.prism('gold', (0, -0.5, 0.55), X, Z, Y, [(-0.07, 0), (0.07, 0), (0, 0.1)], 0.56)
        for k in range(3):                                                                                 # calf wings
            U = nz([1, 0.6 - 0.25 * k, -0.6]); V = nz(np.cross(Z, U))
            feather(g, 'gold' if k % 2 == 0 else 'bronze', np.array([0.55, -0.35 - 0.12 * k, -0.2]), U, V, np.cross(U, V), 0.46 - 0.08 * k, 0.06, 0.03)
        K.pair('LG', 'RG', g, 'Greave')
        s = B(); s.box('plate', (0, -0.02, -0.06), (1.14, 0.6, 1.14)); s.box('gold', (0, 0.26, -0.06), (1.18, 0.05, 1.18)); s.box('dark', (0, -0.3, 0.06), (1.18, 0.08, 1.42))
        s.box('gold', (0, -0.14, 0.58), (1.04, 0.26, 0.34)); s.box('plate', (0, -0.04, 0.54), (0.86, 0.1, 0.3), (-12, 0, 0))
        disc(s, 'gold', (0, 0.1, 0.52), Z, 0.12, 0.04, 12); disc(s, 'glow', (0, 0.1, 0.55), Z, 0.05, 0.02, 12)
        for k in range(2):
            U = nz([1, 0.8 - 0.3 * k, -0.5]); V = nz(np.cross(Z, U))
            feather(s, 'gold', np.array([0.57, 0.08 - 0.12 * k, -0.15]), U, V, np.cross(U, V), 0.34 - 0.06 * k, 0.05, 0.03)
        K.pair('LB', 'RB', s, 'Sabaton')
    if STAGE == 'helm':
        b = B(); b.box('plate', (0, 0.02, 0), (1.34, 1.2, 1.34)); b.box('plate', (0, 0.66, 0), (1.18, 0.12, 1.18))
        b.box('gold', (0, -0.55, 0), (1.44, 0.12, 1.44)); b.box('gold', (0, 0.6, 0), (1.38, 0.04, 1.38))
        b.box('gold', (0, 0.0, 0.69), (1.0, 1.0, 0.04))                                                     # face plate, cross slit
        b.box('dark', (0, 0.16, 0.71), (0.86, 0.1, 0.02)); b.box('glow', (0, 0.16, 0.72), (0.8, 0.05, 0.02))
        b.box('dark', (0, -0.08, 0.71), (0.1, 0.5, 0.02)); b.box('glow', (0, -0.08, 0.72), (0.05, 0.44, 0.02))
        b.prism('plate', (0, 0.42, 0.72), X, Y, Z, [(-0.5, -0.06), (0.5, -0.06), (0.4, 0.06), (0, 0.14), (-0.4, 0.06)], 0.05)
        disc(b, 'sun', (0, 0.44, 0.76), Z, 0.06, 0.03, 12)
        for sx in (-1, 1):                                                                                  # side wings
            for k in range(5):
                a = math.radians(20 + 14 * k); U = nz([sx * 0.35, math.sin(a), -math.cos(a)]); V = nz(np.cross(X * sx, U))
                feather(b, 'gold' if k % 2 == 0 else 'bronze', np.array([sx * 0.7, 0.15 + 0.03 * k, 0.1 - 0.04 * k]), U, V, np.cross(U, V), 0.95 - 0.1 * k, 0.07, 0.035)
            b.box('gold', (sx * 0.7, 0.15, 0.1), (0.08, 0.36, 0.36), (45, 0, 0))
        for i in range(14):                                                                                 # halo with rays
            a = math.pi * (i / 13); d = np.array([math.cos(a), math.sin(a), 0]); c = np.array([0, 0.25, -0.88]) + d * 0.95
            b.box('sun', c, (0.24, 0.07, 0.05), (0, 0, math.degrees(a) + 90))
            if i % 2 == 0: b.prism('glow', c + d * 0.04, d, np.cross(Z, d), Z, [(0, -0.04), (0.2, 0), (0, 0.04)], 0.03)
        lames(b, ['plate'], (0, -0.2, -0.72), 1.3, 0.2, 0.1, 3, 0.17, 10, 'gold')
        K.emit('HM', b, 'Helm')

# =============================================================================================== STORM: Storm Ronin
def storm():
    if STAGE == 'cuirass':
        b = B(); b.box('dark', (0, 0, 0), (2.06, 2.02, 1.06))
        b.box('black', (0, 0.72, 0.58), (1.96, 0.5, 0.1)); b.box('brass', (0, 0.98, 0.6), (1.98, 0.05, 0.12))      # munaita
        laced(b, 'lacquer', 'lace', (0, 0.48, 0.64), 1.96, 1.3, 6)                                          # front do
        laced(b, 'lacquer', 'lace', (0, 0.48, -0.64), 1.96, 1.3, 6, N=-Z, U=-X)
        for sx in (-1, 1): laced(b, 'lacquer', 'lace', (sx * 1.06, 0.48, 0), 1.0, 1.3, 6, N=X * sx, U=-Z * sx, cols=4)
        bolt(b, 'glow', [(-0.2, 0.9, 0.7), (0.08, 0.6, 0.7), (-0.06, 0.55, 0.7), (0.18, 0.22, 0.7)], 0.05, 0.03)
        for sx in (-1, 1): disc(b, 'brass', (sx * 0.6, 0.72, 0.64), Z, 0.1, 0.03, 8); disc(b, 'black', (sx * 0.6, 0.72, 0.66), Z, 0.05, 0.02, 8)
        b.box('teal', (0, -0.88, 0), (2.14, 0.26, 1.14)); b.box('lace', (0, -0.88, 0), (2.16, 0.04, 1.16))     # obi and knot
        b.box('teal', (0.42, -0.9, 0.6), (0.22, 0.2, 0.1), (0, 0, 20)); b.box('teal', (0.52, -1.12, 0.6), (0.1, 0.32, 0.05), (0, 0, 12)); b.box('teal', (0.36, -1.1, 0.6), (0.1, 0.28, 0.05), (0, 0, -10))
        for sx in (-1, 1): laced(b, 'lacquer', 'lace', (sx * 1.08, -1.0, 0), 0.9, 0.6, 3, N=X * sx, U=-Z * sx, cols=4, tilt=14)   # side kusazuri
        laced(b, 'lacquer', 'lace', (0, -1.0, -0.62), 1.6, 0.6, 3, N=-Z, U=-X, tilt=14)
        b.box('black', (0, 1.04, 0), (2.08, 0.1, 1.1)); band(b, 'lacquer', (0, 1.14, 0), 1.44, 1.44, 0.12, 0.08); band(b, 'brass', (0, 1.21, 0), 1.44, 1.44, 0.03, 0.09)
        K.emit('CP', b, 'Do')
    if STAGE == 'pauldrons':
        b = B(); b.box('black', (-0.12, 0.14, 0), (1.12, 0.16, 1.12)); b.box('brass', (-0.12, 0.23, 0), (1.14, 0.04, 1.14))
        b.box('brass', (0.5, 0.22, 0), (0.08, 0.08, 1.24), (0, 0, -12))                                   # kanmuri bar
        laced(b, 'lacquer', 'lace', (0.52, 0.18, 0), 1.22, 1.15, 5, N=nz([1, 0.2, 0]), U=-Z, cols=5, tilt=6)     # sode
        for z in (-0.5, 0.5): disc(b, 'brass', (0.56, 0.2, z), X, 0.05, 0.03, 8)
        bolt(b, 'glow', [(0.62, 0.0, 0.3), (0.62, -0.25, 0.05), (0.62, -0.3, 0.15), (0.62, -0.62, -0.15)], 0.04, 0.03, N=X)
        K.pair('LS', 'RS', b, 'Sode')
    if STAGE == 'arms':
        b = B(); b.box('dark', (0, 0.6, 0), (1.04, 1.8, 1.04))                                              # kote sleeve
        for o, U, N in (((0.53, 1.3, 0), -Z, X), ((0, 1.3, 0.53), X, Z), ((0, 1.3, -0.53), -X, -Z)):
            for r in range(4):
                for i in range(3 if r % 2 else 4): b.prism('black', np.asarray(o) + U * (-0.33 + 0.22 * i + (0.11 if r % 2 else 0)) - Y * 0.18 * r, U, Y, N, [(-0.08, -0.06), (0.08, -0.06), (0.08, 0.06), (-0.08, 0.06)], 0.03)
        b.box('lacquer', (0, 0.52, 0), (1.08, 0.12, 1.08)); disc(b, 'brass', (0, 0.52, -0.56), -Z, 0.14, 0.05, 8)
        b.box('lacquer', (0, 0.17, 0), (1.1, 0.56, 1.1))
        for y in (0.43, -0.09): b.box('brass', (0, y, 0), (1.14, 0.04, 1.14))
        for x in (-0.3, 0, 0.3): b.box('black', (x, 0.17, 0.56), (0.16, 0.46, 0.04)); b.box('lace', (x, 0.17, 0.585), (0.03, 0.4, 0.02))
        disc(b, 'brass', (0.57, 0.17, 0), X, 0.14, 0.04, 8); b.box('glow', (0.6, 0.17, 0), (0.02, 0.09, 0.09), (45, 0, 0))
        b.box('black', (0, -0.3, 0), (1.08, 0.4, 1.08)); b.box('lacquer', (0, -0.28, 0.56), (0.9, 0.32, 0.06)); disc(b, 'brass', (0, -0.28, 0.6), Z, 0.09, 0.03, 8)
        b.box('black', (-0.56, -0.32, 0.3), (0.08, 0.3, 0.2))
        K.pair('LV', 'RV', b, 'Kote')
    if STAGE == 'legs':
        g = B(); g.box('dark', (0, 0.2, 0), (1.04, 1.3, 1.04))
        laced(g, 'lacquer', 'lace', (0, 0.84, 0.58), 1.02, 0.7, 4, tilt=12)                                 # front kusazuri
        for r in range(3):                                                                                  # haidate plates
            for i in range(3 if r % 2 else 4): g.box('black', (-0.36 + 0.24 * i + (0.12 if r % 2 else 0), 0.06 - 0.12 * r, 0.54), (0.18, 0.09, 0.04))
        g.box('lacquer', (0, -0.08, 0.56), (0.7, 0.28, 0.1)); disc(g, 'brass', (0, -0.08, 0.62), Z, 0.1, 0.04, 8)
        g.box('dark', (0, -0.5, 0), (1.06, 0.6, 1.06))
        for x in (-0.33, 0, 0.33): g.box('lacquer', (x, -0.5, 0.56), (0.28, 0.56, 0.06)); g.box('brass', (x, -0.5, 0.6), (0.04, 0.5, 0.02))   # suneate splints
        for y in (-0.26, -0.74): g.box('brass', (0, y, 0.57), (1.0, 0.04, 0.06))
        bolt(g, 'glow', [(0.57, -0.25, 0.2), (0.57, -0.45, -0.05), (0.57, -0.5, 0.08), (0.57, -0.75, -0.15)], 0.04, 0.03, N=X)
        g.box('lacquer', (0.56, -0.5, 0), (0.06, 0.56, 0.6))
        K.pair('LG', 'RG', g, 'Haidate')
        s = B(); s.box('dark', (0, -0.05, -0.06), (1.12, 0.54, 1.12)); s.box('black', (0, -0.3, 0.06), (1.16, 0.08, 1.4))
        s.box('dark', (0, -0.15, 0.58), (1.02, 0.22, 0.34)); s.box('dark', (0, -0.15, 0.82), (0.32, 0.18, 0.14))    # split toe
        s.box('lacquer', (0, 0.0, 0.5), (1.0, 0.2, 0.1), (-20, 0, 0)); s.box('brass', (0, 0.18, -0.06), (1.16, 0.04, 1.16))
        for k in range(3): s.box('lace', (0, 0.1 - 0.12 * k, 0.53), (0.6, 0.03, 0.03))
        K.pair('LB', 'RB', s, 'Tabi')
    if STAGE == 'helm':
        b = B(); b.box('dark', (0, -0.05, 0), (1.3, 1.1, 1.3))
        for k, (w, h) in enumerate(((1.36, 0.2), (1.24, 0.16), (1.06, 0.14), (0.78, 0.12))):                 # stepped bowl
            b.box('black' if k % 2 == 0 else 'lacquer', (0, 0.42 + 0.14 * k, -0.04), (w, h, w))
        for i in range(8):                                                                                  # suji ridges
            a = 2 * math.pi * i / 8; d = np.array([math.cos(a), 0, math.sin(a)])
            b.box('brass', np.array([0, 0.62, -0.04]) + d * 0.4, (0.04, 0.3, 0.42), (0, -math.degrees(a), 0))
        disc(b, 'brass', (0, 0.88, -0.04), Y, 0.1, 0.06, 8)
        for k in range(4):                                                                                  # shikoro
            for sx in (-1, 1): b.box('lacquer' if k % 2 == 0 else 'black', (sx * (0.72 + 0.05 * k), 0.28 - 0.17 * k, -0.15), (0.1, 0.18, 1.1 + 0.08 * k), (0, 0, sx * (10 + 4 * k)))
            b.box('lacquer' if k % 2 == 0 else 'black', (0, 0.28 - 0.17 * k, -0.74 - 0.05 * k), (1.5 + 0.12 * k, 0.18, 0.1), (-(10 + 4 * k), 0, 0))
            b.box('lace', (0, 0.2 - 0.17 * k, -0.8 - 0.05 * k), (1.5 + 0.12 * k, 0.03, 0.03), (-(10 + 4 * k), 0, 0))
        for sx in (-1, 1): b.box('lacquer', (sx * 0.7, 0.3, 0.45), (0.3, 0.3, 0.06), (0, sx * 50, 0)); disc(b, 'brass', (sx * 0.76, 0.3, 0.5), nz([sx, 0, 0.8]), 0.06, 0.03, 8)
        b.box('brass', (0, 0.4, 0.66), (1.2, 0.08, 0.1))                                                     # mabizashi brim
        for sx in (-1, 1):                                                                                   # kuwagata horns
            pts = bez((sx * 0.14, 0.44, 0.7), (sx * 0.35, 0.8, 0.8), (sx * 0.65, 1.2, 0.75), (sx * 0.72, 1.7, 0.6), 6)
            for a, c in zip(pts[:-1], pts[1:]):
                U = nz(c - a); V = nz(np.cross(Z, U)); L = np.linalg.norm(c - a)
                b.prism('brass', (a + c) / 2, U, V, Z, [(-L / 2 - 0.02, -0.06), (L / 2 + 0.02, -0.05), (L / 2 + 0.02, 0.05), (-L / 2 - 0.02, 0.06)], 0.04)
            b.spike('brass', pts[-1], pts[-1] - pts[-2], 0.18, 0.05)
        bolt(b, 'glow', [(0.06, 1.3, 0.72), (-0.1, 1.0, 0.72), (0.08, 0.95, 0.72), (-0.05, 0.48, 0.72)], 0.06, 0.04)   # maedate bolt
        b.box('black', (0, -0.15, 0.66), (1.06, 0.72, 0.08))                                                 # oni menpo
        for sx in (-1, 1):
            b.box('black', (sx * 0.24, 0.2, 0.72), (0.36, 0.08, 0.06), (0, 0, -sx * 18)); b.box('glow', (sx * 0.24, 0.12, 0.71), (0.22, 0.05, 0.02), (0, 0, -sx * 12))
            b.box('bone', (sx * 0.28, -0.12, 0.74), (0.04, 0.16, 0.02), (0, 0, sx * 30))                      # whiskers
        b.prism('black', (0, -0.02, 0.74), X, Y, Z, [(-0.1, -0.12), (0.1, -0.12), (0, 0.12)], 0.12)
        b.box('glow', (0, -0.3, 0.71), (0.5, 0.05, 0.02))
        for i, x in enumerate((-0.2, -0.07, 0.07, 0.2)): b.spike('bone', (x, -0.27, 0.72), (0, -1, 0.2), 0.1, 0.03)
        for sx in (-1, 1): b.spike('bone', (sx * 0.24, -0.33, 0.72), (0, 1, 0.2), 0.12, 0.03)
        laced(b, 'lacquer', 'lace', (0, -0.48, 0.66), 1.0, 0.3, 2, tilt=10)                                 # yodare-kake
        K.emit('HM', b, 'Kabuto')

# =============================================================================================== POISON: Venomreaver
def vial(b, c, d, h, r):                                     # glass canister: iron caps, glass tube, glowing toxin core
    d = nz(d); c = np.asarray(c, float)
    ngon(b, 'iron', c, d, r * 1.15, r * 1.15, h * 0.14, 8); ngon(b, 'glass', c + d * h * 0.14, d, r, r, h * 0.72, 8)
    ngon(b, 'glow', c + d * h * 0.18, d, r * 0.62, r * 0.62, h * 0.5, 8); ngon(b, 'iron', c + d * h * 0.86, d, r * 1.15, r * 0.8, h * 0.14, 8)
def drip(b, c, l, w):                                        # acid running off an edge: a bead and a tapering drop
    c = np.asarray(c, float); ngon(b, 'glow', c, -Y, w, w * 0.8, w * 0.8, 6); b.spike('glow', c - Y * w * 0.8, -Y, l, w * 0.8)
def rivets(b, a, c, n, s=0.045):
    for t in np.linspace(0, 1, n): b.box('bronze', np.asarray(a, float) * (1 - t) + np.asarray(c, float) * t, (s, s, 0.03))

def poison():
    if STAGE == 'cuirass':
        b = B(); b.box('dark', (0, 0, 0), (2.06, 2.02, 1.06))
        U, V, N = rot(-6, 0, 0); b.octa('plate', (0, 0.4, 0.6), U, V, N, 0.98, 0.58, 0.14, 0.25)          # breastplate
        b.octa('iron', (0, 0.4, 0.56), U, V, N, 1.02, 0.62, 0.06, 0.25)
        for sx in (-1, 1):                                                                                  # ribbed plague ribs
            for k in range(3): b.box('deep', (sx * 0.5, 0.62 - 0.2 * k, 0.69), (0.5 - 0.06 * k, 0.07, 0.04), (0, 0, sx * (12 + 6 * k)))
            b.box('glow', (sx * 0.5, 0.52, 0.705), (0.38, 0.025, 0.02), (0, 0, sx * 15))
        b.octa('bronze', (0, 0.42, 0.72), X, Y, Z, 0.26, 0.3, 0.05); disc(b, 'glass', (0, 0.42, 0.76), Z, 0.17, 0.06, 8)    # toxin core
        disc(b, 'glow', (0, 0.42, 0.79), Z, 0.11, 0.04, 8); drip(b, (0, 0.1, 0.74), 0.22, 0.035)
        for sx in (-1, 1):
            b.box('iron', (sx * 1.02, 0.3, 0), (0.1, 1.5, 0.98)); rivets(b, (sx * 1.07, 0.95, 0.4), (sx * 1.07, -0.35, 0.4), 5)
            vial(b, (sx * 1.1, -0.35, -0.25), (0, 1, 0), 0.75, 0.11)                                     # side canisters
            b.box('bronze', (sx * 1.1, 0.0, -0.25), (0.28, 0.06, 0.28))
            b.spike('iron', (sx * 0.55, 0.95, -0.55), (sx * 0.3, 1, -0.6), 0.36, 0.07)
        for k in range(3):                                                                                   # abdomen lames, acid seams
            y = -0.1 - 0.23 * k; w = 1.8 - 0.1 * k
            b.box('iron' if k % 2 else 'plate', (0, y, 0.58), (w, 0.23, 0.1), (-8, 0, 0)); b.box('glow', (0, y - 0.11, 0.62), (w * 0.8, 0.02, 0.03), (-8, 0, 0))
        for x, l in ((-0.6, 0.18), (-0.2, 0.28), (0.35, 0.22), (0.7, 0.14)): drip(b, (x, -0.8, 0.62), l, 0.03)
        b.box('plate', (0, 0.3, -0.585), (1.96, 1.3, 0.12))                                                 # backplate + tank
        vial(b, (0, -0.35, -0.75), (0, 1, 0), 1.2, 0.2); b.box('iron', (0, 0.3, -0.68), (0.6, 0.08, 0.2)); b.box('iron', (0, -0.2, -0.68), (0.6, 0.08, 0.2))
        for sx in (-1, 1): ngon(b, 'iron', (sx * 0.1, 0.9, -0.75), (sx * 0.4, 1, 0.3), 0.04, 0.035, 0.6, 6)     # hoses up to the helm
        b.box('plate', (0, 1.04, 0), (2.08, 0.1, 1.1)); band(b, 'iron', (0, 1.16, 0), 1.44, 1.44, 0.16, 0.1); band(b, 'bronze', (0, 1.25, 0), 1.44, 1.44, 0.03, 0.12)
        b.box('iron', (0, -0.9, 0), (2.12, 0.2, 1.12)); b.box('bronze', (0, -0.9, 0), (2.14, 0.04, 1.14))  # belt
        for x in (-0.55, 0.55): vial(b, (x, -1.0, 0.62), (0, 1, 0), 0.32, 0.07)
        b.octa('bronze', (0, -0.9, 0.6), X, Y, Z, 0.26, 0.18, 0.06); b.octa('deep', (0, -0.9, 0.64), X, Y, Z, 0.2, 0.13, 0.05)
        for sx in (-1, 1): b.spike('bone', (sx * 0.08, -0.86, 0.67), (sx * 0.2, -1, 0.3), 0.14, 0.03)      # skull-buckle fangs
        disc(b, 'glow', (-0.07, -0.86, 0.67), Z, 0.03, 0.02, 6); disc(b, 'glow', (0.07, -0.86, 0.67), Z, 0.03, 0.02, 6)
        b.box('deep', (0, -1.25, 0.56), (0.62, 0.5, 0.04)); b.prism('deep', (0, -1.55, 0.56), X, Y, Z, [(-0.31, 0.06), (0.31, 0.06), (0.1, -0.1), (-0.05, -0.18)], 0.04)
        b.box('glow', (0, -1.3, 0.585), (0.02, 0.4, 0.02))
        K.emit('CP', b, 'Cuirass')
    if STAGE == 'pauldrons':
        b = B(); b.box('dark', (-0.12, 0.12, 0), (1.12, 0.2, 1.12))
        for k, (w, h) in enumerate(((1.02, 0.18), (0.86, 0.16), (0.66, 0.14))):
            b.box('plate' if k % 2 == 0 else 'iron', (-0.06 + 0.05 * k, 0.22 + 0.13 * k, 0), (w, h, w + 0.24))
            b.box('bronze', (-0.06 + 0.05 * k, 0.22 + 0.13 * k - h / 2 + 0.02, 0), (w + 0.03, 0.035, w + 0.27))
        for k in range(3):
            a = -(28 + 14 * k); c = np.array([0.42 + 0.08 * k, 0.06 - 0.2 * k, 0])
            b.box('plate' if k % 2 else 'iron', c, (0.5, 0.15, 1.24 - 0.06 * k), (0, 0, a)); b.box('glow', c + np.array([0.12, -0.1, 0]), (0.03, 0.03, 1.1 - 0.06 * k), (0, 0, a))
        vial(b, (0.12, 0.55, 0.05), (0.5, 1, 0.1), 0.6, 0.12)                                                 # shoulder vial
        for p, d, h in (((0.0, 0.62, -0.32), (0.2, 1, -0.5), 0.5), ((0.3, 0.5, 0.36), (0.6, 0.9, 0.4), 0.42), ((0.35, 0.5, -0.36), (0.6, 0.9, -0.5), 0.38)):
            b.spike('iron', p, d, h, 0.08); b.spike('glow', np.asarray(p) + nz(d) * h * 0.55, d, h * 0.3, 0.035)
        for z in (-0.4, 0.0, 0.35): drip(b, (0.62, -0.32, z), 0.2, 0.03)
        K.pair('LS', 'RS', b, 'Pauldron')
    if STAGE == 'arms':
        b = B(); b.box('deep', (0, 1.0, 0), (1.04, 0.92, 1.04))
        for y in (1.3, 1.05, 0.8): b.box('iron', (0, y, 0), (1.08, 0.1, 1.08))
        b.box('plate', (0, 0.52, 0), (1.1, 0.16, 1.1)); disc(b, 'iron', (0, 0.52, -0.6), -Z, 0.26, 0.08, 8); disc(b, 'glow', (0, 0.52, -0.645), -Z, 0.1, 0.04, 8)
        b.box('plate', (0, 0.17, 0), (1.12, 0.56, 1.12))
        for y in (0.43, -0.09): b.box('bronze', (0, y, 0), (1.16, 0.05, 1.16))
        vial(b, (0.6, -0.05, 0), (0, 1, 0), 0.44, 0.09)                                                    # injector on the forearm
        for k in range(3): b.spike('iron', (0.56, 0.32 - 0.12 * k, -0.35), (1, 0.4, -0.5), 0.26, 0.05)
        b.box('glow', (0, 0.17, 0.57), (0.6, 0.025, 0.02))
        b.box('iron', (0, -0.3, 0), (1.08, 0.4, 1.08)); b.box('bronze', (0, -0.1, 0), (1.18, 0.06, 1.18))
        for r in range(3):
            for i, x in enumerate((-0.33, -0.11, 0.11, 0.33)): b.box('plate' if r % 2 == 0 else 'iron', (x, -0.17 - 0.11 * r, 0.56 + 0.01 * r), (0.19, 0.1, 0.07))
        for x in (-0.33, -0.11, 0.11, 0.33): b.spike('bone', (x, -0.48, 0.56), (0, -1, 0.5), 0.16, 0.035)     # claw tips
        drip(b, (0.2, -0.5, 0.45), 0.24, 0.03)
        K.pair('LV', 'RV', b, 'Vambrace')
    if STAGE == 'legs':
        g = B(); g.box('deep', (0, 0.45, 0), (1.04, 0.8, 1.04)); g.box('plate', (0, 0.42, 0), (1.08, 0.5, 1.08))
        lames(g, ['plate', 'iron'], (0, 0.74, 0.58), 1.0, 0.22, 0.08, 3, 0.2, -10, 'bronze')
        vial(g, (0.6, 0.2, 0.0), (0, 1, 0), 0.5, 0.09)
        disc(g, 'iron', (0, -0.06, 0.57), Z, 0.32, 0.1, 8); disc(g, 'plate', (0, -0.06, 0.63), Z, 0.24, 0.06, 8); disc(g, 'glow', (0, -0.06, 0.665), Z, 0.08, 0.02, 8)
        g.spike('iron', (0, -0.06, 0.68), (0, 0.2, 1), 0.3, 0.07)
        g.box('plate', (0, -0.5, 0), (1.1, 0.58, 1.1)); g.box('bronze', (0, -0.2, 0), (1.14, 0.04, 1.14))
        g.prism('bronze', (0, -0.5, 0.55), X, Z, Y, [(-0.07, 0), (0.07, 0), (0, 0.1)], 0.56); g.box('glow', (0, -0.5, 0.66), (0.02, 0.4, 0.02))
        for z in (-0.3, 0.3): drip(g, (0.57, -0.78, z), 0.18, 0.03)
        K.pair('LG', 'RG', g, 'Greave')
        s = B(); s.box('plate', (0, -0.02, -0.06), (1.14, 0.6, 1.14)); s.box('bronze', (0, 0.26, -0.06), (1.18, 0.05, 1.18))
        s.box('dark', (0, -0.3, 0.06), (1.18, 0.08, 1.42))
        for k in range(3): s.box('plate' if k % 2 == 0 else 'iron', (0, -0.1 - 0.04 * k, 0.5 + 0.12 * k), (1.0 - 0.18 * k, 0.24 - 0.04 * k, 0.16), (-16, 0, 0))
        s.spike('iron', (0, -0.2, 0.82), (0, -0.3, 1), 0.2, 0.08); s.box('glow', (0, 0.08, 0.52), (0.8, 0.025, 0.025))
        s.spike('iron', (0.55, 0.05, -0.3), (1, 0.5, -0.5), 0.24, 0.05)
        K.pair('LB', 'RB', s, 'Sabaton')
    if STAGE == 'helm':
        b = B(); b.box('plate', (0, 0.06, 0), (1.34, 1.16, 1.34))                                            # plague-mask helm
        b.box('iron', (0, -0.55, 0), (1.44, 0.14, 1.44)); b.box('bronze', (0, -0.48, 0), (1.46, 0.03, 1.46))
        b.box('plate', (0, 0.68, -0.05), (1.2, 0.12, 1.2)); b.box('iron', (0, 0.78, -0.08), (0.9, 0.1, 0.9))
        for sx in (-1, 1):                                                                                    # round glowing lenses
            disc(b, 'bronze', (sx * 0.3, 0.22, 0.69), Z, 0.22, 0.06, 10); disc(b, 'dark', (sx * 0.3, 0.22, 0.715), Z, 0.17, 0.03, 10)
            disc(b, 'glass', (sx * 0.3, 0.22, 0.73), Z, 0.15, 0.03, 10); disc(b, 'glow', (sx * 0.3, 0.22, 0.745), Z, 0.08, 0.02, 10)
            vial(b, (sx * 0.5, -0.38, 0.72), (sx * 0.8, -0.3, 0.6), 0.42, 0.11)                            # respirator canisters
            b.box('iron', (sx * 0.7, -0.05, 0.2), (0.08, 0.8, 0.8)); rivets(b, (sx * 0.745, 0.25, 0.5), (sx * 0.745, -0.35, 0.5), 4)
        b.frustum('iron', (0, -0.15, 0.68), X, Z, Y, 0.18, 0.16, 0.1, 0.09, 0.32)                          # snout filter
        disc(b, 'bronze', (0, -0.15, 1.02), Z, 0.12, 0.04, 8)
        for k in range(3): b.box('glow', (0, -0.21 + 0.06 * k, 1.045), (0.14, 0.018, 0.01))
        for p, d, h in (((0, 0.85, 0.1), (0, 1, 0.2), 0.55), ((0.25, 0.82, -0.2), (0.4, 1, -0.4), 0.45), ((-0.25, 0.82, -0.2), (-0.4, 1, -0.4), 0.45), ((0, 0.8, -0.45), (0, 0.8, -1), 0.4)):
            b.spike('iron', p, d, h, 0.09); b.spike('glow', np.asarray(p) + nz(d) * h * 0.5, d, h * 0.35, 0.04)
        lames(b, ['plate', 'iron'], (0, -0.2, -0.72), 1.3, 0.2, 0.1, 3, 0.17, 10, 'bronze')
        drip(b, (0.28, 0.0, 0.7), 0.16, 0.025)
        K.emit('HM', b, 'Helm')

{'frost': frost, 'solar': solar, 'storm': storm, 'poison': poison}[SET]()
print(json.dumps(K.save(STAGE)))
