#!/usr/bin/env python3
"""Blocky dragon armor for the studio's R6 rig: an original "ember wyrm" plate set built only from crisp low-poly solids
(boxes, chamfered octagons, shield-shaped scale tiles, stepped frustum horns, pyramid spikes and claws, triangular fins), with
glowing ember seams. Every piece sits on the rig's own part sizes, so it fits and follows the joints. One stage per call,
written straight into the live tab (owner: build live; maximum quality). numpy only.

  python3 armor.py OUT <cuirass|pauldrons|arms|legs|helm>

Writes OUT/geo/<id>.json (each <= 200 KB, split as needed) and OUT/<stage>.json ({"objects": ...} for an `update`). Groups
(already in the tab, the equip animation drives them): CP torso centre (0,3,0); LS/RS (+-0.12,0.02,0) and LV/RV (0,-1.4,0)
on the arm pivots (+-1.5,3.9); LG/RG (0,-0.85,0) and LB/RB (0,-1.66,0.06) on the hip pivots (+-0.5,2); HM (0,0.62,0) on the
neck (0,4). Rig: torso 2x2x1, arms and legs 1x2x1, head 1.2 cube, faces +z, the rig's right is -x. Left pieces are built,
right pieces are their mirror."""
import json, math, os, sys
import numpy as np
from solids import B, Kit, bez, rot, nz, X, Y, Z

OUT, STAGE = sys.argv[1], sys.argv[2]
MAT = {'plate': dict(color='#b3121b', metalness=0.72, roughness=0.3),
       'scale': dict(color='#d3232b', metalness=0.62, roughness=0.32),
       'deep': dict(color='#5e070d', metalness=0.6, roughness=0.42),
       'gold': dict(color='#d8a842', metalness=1.0, roughness=0.24),
       'dark': dict(color='#17100f', metalness=0.35, roughness=0.66),
       'bone': dict(color='#efe1ba', metalness=0.0, roughness=0.45),
       'horn': dict(color='#b79a62', metalness=0.1, roughness=0.5),
       'ember': dict(color='#ff5a14', material='Neon')}
K = Kit(OUT, 'dra', MAT)

# ---------------------------------------------------------------- cuirass: group CP, torso x+-1 y+-1 z+-0.5
if STAGE == 'cuirass':
    b = B()
    b.box('dark', (0, 0, 0), (2.06, 2.02, 1.06))
    b.box('plate', (0, 0.45, 0.585), (1.96, 1.0, 0.12))                                   # breastplate
    for sx in (-1, 1):
        U, V, N = rot(-6, -sx * 10, 0)
        b.octa('scale', (sx * 0.5, 0.58, 0.69), U, V, N, 0.44, 0.3, 0.1, 0.25)           # pectorals
        b.octa('gold', (sx * 0.5, 0.58, 0.66), U, V, N, 0.48, 0.34, 0.06, 0.25)
        for k in range(3): b.box('deep', (sx * (0.52 - 0.02 * k), 0.66 - 0.13 * k, 0.75 + 0.008 * k), (0.62 - 0.12 * k, 0.025, 0.02), (-6, -sx * 10, sx * 6))
        b.tiles(['scale', 'deep'], (sx * 1.04, 0.86, 0), Z * -sx, Y, X * sx, 5, 10, 0.22, 0.17, 0.11, 0.1, 0.04)   # side scales
        b.prism('gold', (sx * 0.98, 0.45, 0.62), Y, Z, X, [(-0.5, -0.02), (0.5, -0.02), (0.5, 0.02), (-0.5, 0.02)], 0.06)
        for k in range(3):                                                               # emblem wings
            x0 = 0.24 + 0.15 * k
            b.prism('gold', (sx * x0, 0.46 + 0.05 * k, 0.8), X * sx, Y, Z, [(0, -0.07), (0.17, 0.02 + 0.03 * k), (0.02, 0.09)], 0.04)
        U, V, N = rot(0, sx * 18, 0)                                                     # back: shoulder blades
        b.octa('scale', (sx * 0.5, 0.55, -0.67), U, V, N, 0.42, 0.3, 0.08, 0.3)
        b.box('gold', (sx * 0.5, 0.24, -0.7), (0.8, 0.04, 0.05), (0, sx * 18, 0))
    b.prism('gold', (0, 0.4, 0.645), X, Z, Y, [(-0.07, -0.02), (0.07, -0.02), (0, 0.1)], 1.1)   # keel
    b.box('gold', (0, 0.48, 0.79), (0.36, 0.36, 0.05), (0, 0, 45)); b.box('ember', (0, 0.48, 0.82), (0.22, 0.22, 0.05), (0, 0, 45))
    b.box('deep', (0, 0.48, 0.835), (0.08, 0.08, 0.03), (0, 0, 45))
    for k in range(3):                                                                   # abdomen lames
        y = -0.12 - 0.25 * k; w = 1.86 - 0.1 * k
        b.box('ember', (0, y + 0.12, 0.6), (w - 0.25, 0.03, 0.03))
        b.box('plate' if k % 2 == 0 else 'scale', (0, y, 0.6), (w, 0.25, 0.1), (-8, 0, 0))
        b.box('gold', (0, y - 0.115, 0.67), (w, 0.04, 0.05), (-8, 0, 0))
        for sx in (-1, 1): b.box('gold', (sx * (w / 2 - 0.08), y, 0.66), (0.06, 0.06, 0.04), (0, 0, 45))
    b.box('plate', (0, 0.3, -0.585), (1.96, 1.3, 0.12))                                   # backplate
    b.tiles(['scale', 'deep'], (0, -0.42, -0.65), -X, Y, -Z, 9, 3, 0.22, 0.17, 0.11, 0.1, 0.04)
    b.box('deep', (0, 0.15, -0.66), (0.16, 1.5, 0.08))
    for k in range(6): b.spike('bone', (0, 0.82 - 0.27 * k, -0.68), (0, 0.5, -1), 0.34 - 0.03 * k, 0.07)
    b.box('plate', (0, 1.04, 0), (2.08, 0.1, 1.1))                                       # shoulder cap and collar
    for c, s_ in (((0, 1.17, 0.76), (1.64, 0.16, 0.12)), ((0, 1.17, -0.76), (1.64, 0.16, 0.12)), ((0.76, 1.17, 0), (0.12, 0.16, 1.64)), ((-0.76, 1.17, 0), (0.12, 0.16, 1.64))):
        b.box('scale', c, s_); b.box('gold', (c[0], 1.26, c[2]), (s_[0] + 0.02, 0.03, s_[2] + 0.02))
    for sx in (-1, 1): b.spike('bone', (sx * 0.5, 1.2, -0.8), (sx * 0.3, 1, -0.6), 0.32, 0.06)
    b.box('deep', (0, -0.9, 0), (2.12, 0.2, 1.12))                                       # belt
    b.box('gold', (0, -0.81, 0), (2.14, 0.03, 1.14)); b.box('gold', (0, -0.99, 0), (2.14, 0.03, 1.14))
    for x in (-0.85, -0.6, -0.35, 0.35, 0.6, 0.85): b.box('gold', (x, -0.9, 0.57), (0.06, 0.06, 0.04), (0, 0, 45))
    b.octa('gold', (0, -0.9, 0.6), X, Y, Z, 0.3, 0.2, 0.06); b.octa('plate', (0, -0.9, 0.64), X, Y, Z, 0.26, 0.17, 0.06)
    b.box('ember', (0, -0.9, 0.675), (0.32, 0.04, 0.02))
    for sx in (-1, 1): b.prism('gold', (sx * 0.24, -0.82, 0.65), X * sx, Y, Z, [(0, 0), (0.12, 0.12), (0.03, 0.02)], 0.04)
    U, V, N = rot(-6, 0, 0)                                                              # loin plate
    b.shield('plate', (0, -1.22, 0.58), U, V, N, 0.26, 0.26, 0.07); b.shield('gold', (0, -1.22, 0.55), U, V, N, 0.3, 0.3, 0.04)
    b.box('ember', (0, -1.16, 0.62), (0.03, 0.24, 0.02), (-6, 0, 0))
    K.emit('CP', b, 'Cuirass')

# ---------------------------------------------------------------- pauldrons: LS local, arm x -0.62..0.38, top y 0.08, z+-0.5
if STAGE == 'pauldrons':
    b = B()
    b.box('deep', (-0.12, 0.12, 0), (1.12, 0.2, 1.12))
    for k in range(4):                                                                   # cascading lames, out and down
        U, V, N = rot(0, 0, -(16 + 9 * k)); w, d = 1.12 - 0.08 * k, 1.3 - 0.04 * k
        c = np.array([0.06 + 0.13 * k, 0.24 - 0.2 * k, 0])
        b.box('plate' if k % 2 == 0 else 'scale', c, (w, 0.16, d), (0, 0, -(16 + 9 * k)))
        e = c + U * (w / 2)
        b.prism('gold', e, N, V, U, [(-d / 2, -0.09), (d / 2, -0.09), (d / 2, 0.09), (-d / 2, 0.09)], 0.05)
        b.prism('ember', c + U * (w / 2 - 0.12) - V * 0.09, N, U, V, [(-d / 2 + 0.1, -0.015), (d / 2 - 0.1, -0.015), (d / 2 - 0.1, 0.015), (-d / 2 + 0.1, 0.015)], 0.03)
        for z in (-d / 2 + 0.03, d / 2 - 0.03): b.box('gold', c + N * z, (w * 0.9, 0.04, 0.04), (0, 0, -(16 + 9 * k)))
    U, V, N = rot(0, 0, -8)
    b.box('plate', (-0.08, 0.38, 0), (0.92, 0.14, 1.06), (0, 0, -8))                        # top plate, scaled
    b.tiles(['scale', 'deep'], (-0.08, 0.45, 0.42), U, -Z, V, 4, 5, 0.22, 0.18, 0.11, 0.11, 0.04, 10)
    b.box('gold', (-0.1, 0.5, 0), (0.08, 0.08, 1.08), (0, 0, -8))
    for k, (z, h) in enumerate(((0.3, 0.5), (0, 0.68), (-0.3, 0.5))):                   # crown spikes
        b.spike('bone', (0.08, 0.46, z), (0.4, 1, -0.2), h, 0.09)
        b.box('gold', (0.08, 0.47, z), (0.22, 0.04, 0.22), (0, 45, -8))
    for z in (-0.45, -0.15, 0.15, 0.45): b.spike('bone', (0.62, -0.38, z), (1, -0.35, 0), 0.26, 0.05)   # rim spikes
    K.pair('LS', 'RS', b, 'Pauldron')

# ---------------------------------------------------------------- arms: LV local, arm x+-0.5 y -0.5..1.5 z+-0.5
if STAGE == 'arms':
    b = B()
    b.box('dark', (0, 1.0, 0), (1.04, 0.92, 1.04))                                       # scaled undersleeve
    for o, U, N in (((0.52, 1.4, 0), -Z, X), ((0, 1.4, 0.52), X, Z), ((0, 1.4, -0.52), -X, -Z)):
        b.tiles(['deep', 'plate'], o, U, Y, N, 4, 5, 0.25, 0.17, 0.12, 0.1, 0.035)
    b.box('plate', (0, 0.52, 0), (1.1, 0.14, 1.1)); b.box('gold', (0, 0.52, 0), (1.12, 0.04, 1.12))     # couter
    b.octa('scale', (0, 0.52, -0.58), X, Y, -Z, 0.24, 0.2, 0.08); b.spike('bone', (0, 0.52, -0.62), (0, -0.2, -1), 0.34, 0.07)
    b.box('plate', (0, 0.17, 0), (1.12, 0.56, 1.12))                                     # vambrace
    for y in (0.43, -0.09): b.box('gold', (0, y, 0), (1.16, 0.05, 1.16))
    b.tiles(['scale', 'deep'], (0, 0.36, 0.57), X, Y, Z, 4, 3, 0.24, 0.16, 0.12, 0.1, 0.04)
    b.octa('gold', (0.57, 0.17, 0), Z, Y, X, 0.2, 0.2, 0.05); b.box('ember', (0.6, 0.17, 0), (0.03, 0.18, 0.18), (45, 0, 0))
    for k, y in enumerate((0.04, 0.18, 0.32)):                                           # dragon fins on the outer side
        b.prism('scale', (0.56, y, -0.2), X, Y, Z, [(0, -0.06), (0, 0.06), (0.3 - 0.05 * k, 0.16)], 0.05)
        b.prism('gold', (0.56, y, -0.24), X, Y, Z, [(0, -0.07), (0, 0.07), (0.32 - 0.05 * k, 0.18)], 0.02)
    b.box('deep', (0, -0.3, 0), (1.08, 0.4, 1.08))                                       # gauntlet
    b.box('gold', (0, -0.1, 0), (1.2, 0.06, 1.2))
    b.box('plate', (0, -0.2, 0.56), (0.9, 0.16, 0.08))
    for i, x in enumerate((-0.33, -0.11, 0.11, 0.33)):                                   # fingers and talons
        b.box('plate', (x, -0.38, 0.56), (0.18, 0.22, 0.08)); b.box('gold', (x, -0.28, 0.6), (0.14, 0.05, 0.04))
        b.spike('bone', (x, -0.48, 0.52), (0, -1, 0.45), 0.3, 0.06)
    b.box('plate', (-0.56, -0.32, 0.3), (0.08, 0.3, 0.2)); b.spike('bone', (-0.56, -0.47, 0.32), (-0.3, -1, 0.3), 0.24, 0.05)   # thumb
    b.box('plate', (0.57, -0.3, 0), (0.08, 0.34, 0.9)); b.spike('bone', (0.6, -0.22, 0), (1, -0.6, 0), 0.22, 0.05)
    K.pair('LV', 'RV', b, 'Vambrace')

# ---------------------------------------------------------------- legs: LG local leg x+-0.5 y -1.15..0.85; LB local leg y -0.34..0.36, z -0.56..0.44
if STAGE == 'legs':
    g = B()
    g.box('dark', (0, 0.45, 0), (1.04, 0.8, 1.04))
    g.box('plate', (0, 0.42, 0), (1.08, 0.5, 1.08))                                      # cuisse
    for k in range(3):                                                                   # tasset lames
        y = 0.74 - 0.21 * k
        g.box('plate' if k % 2 == 0 else 'scale', (0, y, 0.58), (1.0 - 0.06 * k, 0.22, 0.08), (-10, 0, 0))
        g.box('gold', (0, y - 0.1, 0.63), (1.0 - 0.06 * k, 0.035, 0.04), (-10, 0, 0))
    g.box('ember', (0, 0.18, 0.565), (0.6, 0.03, 0.02))
    g.shield('gold', (0.58, 0.48, 0), Z, Y, X, 0.42, 0.4, 0.04); g.shield('plate', (0.61, 0.5, 0), Z, Y, X, 0.37, 0.35, 0.06)   # side tasset
    g.tiles(['scale', 'deep'], (0.645, 0.72, 0), -Z, Y, X, 3, 3, 0.2, 0.15, 0.1, 0.09, 0.03, 10)
    g.octa('gold', (0, -0.06, 0.58), X, Y, Z, 0.34, 0.3, 0.1); g.octa('plate', (0, -0.06, 0.63), X, Y, Z, 0.29, 0.25, 0.1)   # knee
    g.box('ember', (0, -0.06, 0.685), (0.12, 0.12, 0.02), (0, 0, 45))
    g.spike('bone', (0, -0.14, 0.66), (0, -0.25, 1), 0.3, 0.07)
    for sx in (-1, 1): g.prism('scale', (sx * 0.5, -0.06, 0.5), X * sx, Y, Z, [(0, -0.1), (0, 0.1), (0.2, 0.16)], 0.05)
    g.box('plate', (0, -0.5, 0), (1.1, 0.58, 1.1))                                       # greave
    g.box('gold', (0, -0.2, 0), (1.14, 0.04, 1.14))
    g.prism('gold', (0, -0.5, 0.55), X, Z, Y, [(-0.08, 0), (0.08, 0), (0, 0.11)], 0.56)
    g.tiles(['scale', 'deep'], (0, -0.28, -0.56), -X, Y, -Z, 4, 3, 0.24, 0.16, 0.12, 0.1, 0.035)
    g.tiles(['scale', 'deep'], (0.56, -0.28, 0), -Z, Y, X, 4, 3, 0.24, 0.16, 0.12, 0.1, 0.035)
    for k, y in enumerate((-0.62, -0.44)):                                               # calf fins
        g.prism('scale', (0.56, y, -0.25), X, Y, Z, [(0, -0.07), (0, 0.07), (0.28 - 0.04 * k, 0.2)], 0.05)
        g.prism('gold', (0.56, y, -0.29), X, Y, Z, [(0, -0.08), (0, 0.08), (0.3 - 0.04 * k, 0.22)], 0.02)
    K.pair('LG', 'RG', g, 'Greave')
    s = B()
    s.box('plate', (0, -0.02, -0.06), (1.14, 0.6, 1.14))                                 # boot
    s.box('gold', (0, 0.26, -0.06), (1.18, 0.05, 1.18)); s.box('deep', (0, 0.12, -0.06), (1.16, 0.06, 1.16))
    s.box('dark', (0, -0.3, 0.06), (1.18, 0.08, 1.42))
    s.box('plate', (0, -0.15, 0.6), (1.04, 0.24, 0.36)); s.box('scale', (0, -0.05, 0.56), (0.86, 0.1, 0.32), (-12, 0, 0))   # toe cap
    s.box('gold', (0, -0.04, 0.5), (0.9, 0.04, 0.04))
    for x in (-0.32, 0, 0.32): s.spike('bone', (x, -0.2, 0.76), (0, -0.4, 1), 0.24, 0.07)   # talons
    s.spike('bone', (0, -0.12, -0.62), (0, -0.3, -1), 0.3, 0.07)                          # heel spur
    s.prism('scale', (0.58, 0.05, -0.15), X, Y, Z, [(0, -0.12), (0, 0.12), (0.22, 0.24)], 0.05)   # ankle wing
    s.prism('gold', (0.58, 0.05, -0.19), X, Y, Z, [(0, -0.13), (0, 0.13), (0.24, 0.26)], 0.02)
    s.tiles(['scale', 'deep'], (0, 0.16, 0.5), X, Y, Z, 4, 2, 0.24, 0.15, 0.12, 0.1, 0.035)
    K.pair('LB', 'RB', s, 'Sabaton')

# ---------------------------------------------------------------- helm: HM local, head x+-0.6 y -0.62..0.58 z+-0.6
if STAGE == 'helm':
    b = B()
    b.box('plate', (0, 0, 0), (1.34, 1.24, 1.34))
    b.box('plate', (0, 0.68, -0.04), (1.18, 0.14, 1.2)); b.box('gold', (0, 0.62, 0), (1.38, 0.04, 1.38))
    b.box('scale', (0, 0.32, 0.64), (1.44, 0.16, 0.26), (14, 0, 0))                          # brow
    b.box('gold', (0, 0.25, 0.77), (1.4, 0.03, 0.04))
    b.box('deep', (0, 0.13, 0.675), (1.08, 0.22, 0.04))
    for sx in (-1, 1):
        b.box('ember', (sx * 0.27, 0.13, 0.7), (0.34, 0.07, 0.04), (0, 0, sx * 14))          # slanted eyes
        b.box('scale', (sx * 0.7, -0.15, 0.08), (0.1, 0.74, 0.96))                            # cheek plates
        b.tiles(['scale', 'deep'], (sx * 0.75, 0.12, 0.08), Z * -sx, Y, X * sx, 4, 4, 0.22, 0.16, 0.11, 0.1, 0.035)
        b.box('gold', (sx * 0.755, -0.52, 0.08), (0.04, 0.04, 0.96))
        for k in range(3): b.prism('bone', (sx * 0.74, -0.2 - 0.15 * k, -0.3), Z * -1, Y, X * sx, [(0, -0.05), (0, 0.05), (0.26 - 0.05 * k, 0.06)], 0.04)
        b.horn(bez((sx * 0.6, 0.45, 0.1), (sx * 1.0, 0.75, -0.05), (sx * 1.15, 1.25, -0.45), (sx * 0.95, 1.6, -1.0), 8), 0.15, 0.05)
        b.horn(bez((sx * 0.6, 0.12, -0.2), (sx * 0.95, 0.1, -0.45), (sx * 1.05, 0.22, -0.8), (sx * 0.9, 0.42, -1.05), 5), 0.09, 0.035)
        b.box('gold', (sx * 0.66, 0.45, 0.1), (0.08, 0.34, 0.34))
    b.box('plate', (0, -0.12, 0.82), (0.9, 0.34, 0.36))                                   # snout
    b.box('scale', (0, 0.06, 0.84), (0.62, 0.12, 0.42), (-6, 0, 0))
    b.box('plate', (0, -0.06, 1.04), (0.52, 0.2, 0.16))
    for sx in (-1, 1): b.box('deep', (sx * 0.14, -0.02, 1.12), (0.08, 0.05, 0.02))
    b.spike('bone', (0, 0.1, 0.96), (0, 1, 0.5), 0.2, 0.05)
    for i, x in enumerate((-0.32, -0.16, 0, 0.16, 0.32)): b.spike('bone', (x, -0.27, 0.96), (0, -1, 0.15), 0.16 if i % 2 == 0 else 0.11, 0.04)
    for sx in (-1, 1): b.spike('bone', (sx * 0.42, -0.27, 0.72), (0, -1, 0), 0.18, 0.04)
    b.box('ember', (0, -0.33, 0.85), (0.8, 0.04, 0.2))                                    # fire in the mouth
    b.box('deep', (0, -0.48, 0.66), (1.0, 0.2, 0.3)); b.box('gold', (0, -0.39, 0.81), (1.0, 0.03, 0.04))
    for k in range(3): b.box('plate' if k % 2 == 0 else 'scale', (0, -0.18 - 0.18 * k, -0.72), (1.3, 0.2, 0.1), (10, 0, 0))   # neck guard
    b.box('gold', (0, 0.78, 0), (0.08, 0.06, 1.2))
    for k in range(5):                                                                    # crest fins
        z = 0.4 - 0.26 * k; h = 0.2 + 0.07 * k
        b.prism('scale', (0, 0.76, z), Z, Y, X, [(-0.11, 0), (0.12, 0), (-0.2, h)], 0.05)
        b.spike('bone', np.array([0, 0.76 + h, z - 0.2]), (0, 0.4, -1), 0.12, 0.025)
    K.emit('HM', b, 'Helm')

print(json.dumps(K.save(STAGE)))
