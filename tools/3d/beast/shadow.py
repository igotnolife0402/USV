#!/usr/bin/env python3
"""Shadow monster, ~22 studs tall, built in 0.125-stud blocks: gaunt hunched body of near-black shadow, four glowing eyes,
a glowing grin, a cracked glowing core, back-swept horns, long clawed arms, shadow wisps streaming off its back and a
tattered smoke skirt. Idle sway + breathing; every 5-9 s it lunges with a screech (jaw open, arms spread). No VFX (model only).
Usage: python3 shadow.py <outdir>"""
import sys
import numpy as np
from rig import make

SC, BLOCK = 1.0, 0.125
PAL = [None, ('Shadow', '#15111f', 's'), ('Shadow', '#1d1730', 's'), ('Shadow', '#0e0b16', 's'), ('Shadow', '#07060b', 's'),
       ('Smoke', '#2a2140', 's'), ('Smoke', '#3a2d58', 's'), ('Wisp', '#53407f', 's'),
       ('Horn', '#1b1724', 's'), ('Horn', '#2e2840', 's'), ('Claw', '#050408', 's'),
       ('Eye', '#d7bfff', 'n'), ('Core', '#8a4dff', 'n'), ('Teeth', '#efe6ff', 'n'), ('Mouth', '#2a0d4a', 's')]
SH, SH2, SH3, SHD, SM, SM2, WS, HO, HO2, CL, EYE, CORE, TEETH, MOUTH = range(1, 15)

SEG = [('Hips', None, (0, 10.6, 0)), ('Chest', 'Hips', (0, 12.2, 0.4)), ('Head', 'Chest', (0, 17.0, 3.0)), ('Jaw', 'Head', (0, 17.1, 4.0)),
       ('UpperArmR', 'Chest', (-3.7, 16.0, 1.5)), ('ForearmR', 'UpperArmR', (-5.0, 11.6, 2.2)), ('HandR', 'ForearmR', (-5.5, 7.0, 3.1)),
       ('UpperArmL', 'Chest', (3.7, 16.0, 1.5)), ('ForearmL', 'UpperArmL', (5.0, 11.6, 2.2)), ('HandL', 'ForearmL', (5.5, 7.0, 3.1)),
       ('ThighR', 'Hips', (-1.7, 10.2, 0.0)), ('ShinR', 'ThighR', (-2.0, 5.8, 1.5)),
       ('ThighL', 'Hips', (1.7, 10.2, 0.0)), ('ShinL', 'ThighL', (2.0, 5.8, 1.5))]
PIV = {n: p for n, _, p in SEG}
lerp = lambda a, b, f: tuple(a[j] + (b[j] - a[j]) * f for j in range(3))

def tendril(g, pts, r0, seg, rng, jit=0.25, col=SM, tip=WS):
    """Wavy tapering shadow wisp along pts (smoke body, pale wisp tip)."""
    pts = [tuple(np.add(p, rng.uniform(-jit, jit, 3) * (i > 0))) for i, p in enumerate(pts)]
    g.horn(pts, r0, col, seg, tip)

def shape(g, stud):
    rng = g.rng
    # ================= head: long skull, four eyes, glowing grin, horns, crown spikes =================
    Hd, Jw = 'Head', 'Jaw'
    for s in (-1, 1):
        g.ell((s * 0.62, 18.15, 5.35), (0.32, 0.2, 0.14), EYE, Hd)                                          # main eyes, slanted sockets
        g.ell((s * 0.62, 18.15, 5.2), (0.48, 0.32, 0.28), SHD, Hd)
        g.ell((s * 0.98, 18.75, 4.95), (0.18, 0.12, 0.1), EYE, Hd)                                          # small upper eyes
        g.ell((s * 0.98, 18.75, 4.85), (0.3, 0.22, 0.22), SHD, Hd)
        g.box((s * 0.62 - 0.55, 18.42, 4.9), (s * 0.62 + 0.55, 18.55, 5.45), SH3, Hd)                       # brow ridge
        g.horn([(s * 0.85, 19.1, 3.6), (s * 1.55, 20.2, 2.4), (s * 1.95, 20.7, 0.7), (s * 1.85, 20.4, -1.0), (s * 1.5, 19.6, -2.1)],
               0.42, HO, Hd, HO2, ring=HO2)                         # ridged back-swept horns
        g.spike((s * 1.35, 18.2, 3.2), (s * 2.6, 18.6, 2.2), 0.24, HO, Hd, HO2)                             # cheek spurs
        g.ell((s * 1.0, 17.55, 4.4), (0.55, 0.45, 0.8), SH3, Hd)                                            # gaunt hollow cheeks
    for k, z in enumerate(np.arange(4.3, 1.0, -0.42)):                                                      # crown spikes along the skull ridge
        g.spike((0, 19.25 - 0.08 * k, z), (0, 19.95 - 0.04 * k, z - 0.6), 0.18 - 0.008 * k, HO, Hd, HO2)
    for x in np.linspace(-1.1, 1.1, 11):                                                                    # upper fangs (glowing grin)
        ln = 0.42 - 0.18 * abs(x)
        g.spike((x * 1.0, 17.3, 4.95 + 0.55 * np.cos(x * 1.3) - 0.5), (x * 0.98, 17.3 - ln, 5.0 + 0.55 * np.cos(x * 1.3) - 0.5), 0.07, TEETH, Hd)
    g.box((-1.25, 17.1, 3.6), (1.25, 17.35, 5.05), MOUTH, Hd, where=lambda x, y, z: z < 4.45 + 0.6 * np.cos(x * 1.3))   # mouth roof
    g.ell((0, 17.65, 4.5), (0.85, 0.55, 1.2), SH, Hd)                                                       # snout
    g.ell((0, 18.2, 3.2), (1.35, 1.25, 1.75), SH, Hd)                                                       # skull
    g.ell((0, 18.7, 2.0), (1.15, 1.0, 1.4), SH, Hd)
    # ---- jaw: long lower fangs, mouth floor, chin barbs ----
    for x in np.linspace(-1.0, 1.0, 10):
        ln = 0.36 - 0.15 * abs(x)
        g.spike((x, 16.85, 4.85 + 0.5 * np.cos(x * 1.3) - 0.5), (x * 0.97, 16.85 + ln, 4.9 + 0.5 * np.cos(x * 1.3) - 0.5), 0.065, TEETH, Jw)
    g.box((-1.15, 16.75, 3.7), (1.15, 16.95, 4.95), MOUTH, Jw, where=lambda x, y, z: z < 4.35 + 0.55 * np.cos(x * 1.3))
    for s in (-1, 0, 1): g.spike((s * 0.45, 16.25, 4.3), (s * 0.6, 15.5, 4.1), 0.12, HO, Jw, HO2)
    g.cap((0, 16.5, 3.4), (0, 16.6, 4.6), 0.95, 0.6, SH, Jw, where=lambda x, y, z, t=None: y < 16.95)

    # ================= chest: gaunt ribs, cracked glowing core, collar spikes, spine, shadow wisps =================
    C = 'Chest'
    core = (0, 14.0, 2.75)
    g.ell(core, (0.45, 0.55, 0.3), CORE, C)
    for a in np.linspace(0, 2 * np.pi, 7, endpoint=False):                                                 # cracks radiating from the core
        p0 = core; pts = [p0]
        for i in range(1, 5):
            r = 0.45 + 0.42 * i; aa = a + rng.uniform(-0.25, 0.25)
            x, y = r * np.cos(aa), 14.0 + r * np.sin(aa) * 1.15
            z = 0.4 + 2.35 * np.sqrt(max(0.0, 1 - (x / 2.6) ** 2 - ((y - 14.0) / 3.2) ** 2))
            pts.append((x, y, z))
        for i, (q0, q1) in enumerate(zip(pts, pts[1:])): g.cap(q0, q1, 0.09 - 0.015 * i, 0.075 - 0.015 * i, CORE, C)
    g.ell(core, (0.75, 0.85, 0.42), SHD, C)                                                                 # dark rim round the core
    for i, y in enumerate((15.4, 14.7, 13.95, 13.2, 12.5)):                                                 # ribs over a sunken torso
        w = 2.35 - 0.12 * i
        for s in (-1, 1):
            pts = [(s * 0.55, y, 2.55 - 0.05 * i), (s * w * 0.75, y - 0.25, 2.1), (s * w, y - 0.55, 0.6), (s * w * 0.85, y - 0.75, -0.9)]
            for q0, q1 in zip(pts, pts[1:]): g.cap(q0, q1, 0.2, 0.18, SH2, C)
    g.cap((0, 12.0, 2.3), (0, 15.8, 2.45), 0.32, 0.3, SH2, C)                                               # sternum
    for k in range(9):                                                                                      # spine knobs + dorsal spikes
        y = 16.4 - 0.62 * k; z = -1.1 + 0.08 * k
        g.spike((0, y, z), (0, y + 0.5, z - 1.0 - 0.4 * np.sin(k * 0.6)), 0.24 - 0.015 * k, HO, C, HO2)
        g.ell((0, y, z + 0.15), (0.4, 0.3, 0.35), SH2, C)
    for s in (-1, 1):                                                                                       # collarbones, shoulder spikes
        g.cap((s * 0.3, 16.4, 1.7), (s * 3.3, 16.3, 1.3), 0.25, 0.22, SH2, C)
        for d in ((0.3, 1.6, -0.4), (0.9, 1.1, -0.9), (-0.4, 1.3, -1.1)):
            g.spike((s * 3.5, 16.6, 1.2), (s * (3.5 + d[0]), 16.6 + d[1], 1.2 + d[2]), 0.26, HO, C, HO2)
    for k in range(34):                                                                                     # shadow wisps streaming up off the back
        x = rng.uniform(-2.6, 2.6); y = rng.uniform(12.5, 16.5); z = -1.0 - 0.3 * (1 - abs(x) / 2.6)
        L = rng.uniform(1.8, 3.8); sw = rng.uniform(-0.6, 0.6)
        tendril(g, [(x, y, z), (x * 1.1 + sw * 0.4, y + L * 0.4, z - L * 0.35), (x * 1.2 + sw, y + L * 0.8, z - L * 0.5),
                    (x * 1.25 + sw * 1.4, y + L * 1.1, z - L * 0.45)], rng.uniform(0.16, 0.3), C, rng, col=SM if k % 3 else SH2)
    g.cap((0, 15.6, 1.2), (0, 17.2, 2.4), 0.75, 0.6, SH, C)                                                 # neck, thrust forward
    for c, r in (((0, 13.9, 0.5), (2.35, 3.0, 2.0)), ((0, 15.6, 0.6), (3.2, 1.25, 1.75)), ((0, 11.7, 0.3), (1.65, 1.4, 1.4))):
        g.ell(c, r, SH, C)
    for s in (-1, 1): g.ell((s * 3.4, 16.0, 1.35), (0.95, 0.9, 0.95), SH, C)

    # ================= hips: pelvis + tattered smoke skirt + long tail =================
    Hp = 'Hips'
    for k in range(46):                                                                                     # tattered smoke strands hang to the knees
        a = k / 46 * 2 * np.pi + rng.uniform(-0.05, 0.05)
        if abs(np.sin(a)) > 0.92 and np.sin(a) > 0: continue                                                # gap at the front
        x0, z0 = 1.85 * np.cos(a), 1.5 * np.sin(a)
        L = rng.uniform(2.6, 4.8)
        tendril(g, [(x0, 10.1, z0), (x0 * 1.15, 10.1 - L * 0.35, z0 * 1.15), (x0 * 1.25, 10.1 - L * 0.7, z0 * 1.25),
                    (x0 * 1.3, 10.1 - L, z0 * 1.3 - 0.2)], rng.uniform(0.22, 0.32), Hp, rng, jit=0.18, col=SM if k % 2 else SH2, tip=SM2 if k % 3 else WS)
    tail = [(0, 10.2, -1.2), (0, 9.0, -3.0), (0.6, 7.2, -4.6), (-0.4, 5.2, -5.8), (0.5, 3.4, -6.6), (0.0, 2.0, -7.2)]
    g.horn(tail, 0.75, SH, Hp, WS, ring=SH2)
    for k, f in enumerate(np.linspace(0.08, 0.7, 6)):                                                       # tail spikes
        i = int(f * (len(tail) - 1)); p = lerp(tail[i], tail[i + 1], f * (len(tail) - 1) - i)
        g.spike(p, (p[0], p[1] + 0.9 - 0.08 * k, p[2] - 0.5), 0.2 - 0.02 * k, HO, Hp, HO2)
    g.ell((0, 10.4, 0.1), (1.9, 1.15, 1.5), SH, Hp)
    for s in (-1, 1): g.ell((s * 1.45, 10.3, 0.0), (0.75, 0.75, 0.75), SH2, Hp)

    # ================= arms: bony, elbow spikes, trailing wisps, long clawed fingers =================
    for s, sd in ((-1, 'R'), (1, 'L')):
        UA, FA, HA = 'UpperArm' + sd, 'Forearm' + sd, 'Hand' + sd
        sh, el, wr = PIV[UA], PIV[FA], PIV[HA]
        for f in (0.3, 0.55): g.cap(lerp(sh, el, f), lerp(sh, el, f + 0.04), 0.66, 0.62, SH2, UA)          # sinew bands
        g.cap(sh, el, 0.8, 0.5, SH, UA)
        g.ell(lerp(sh, el, 0.35), (0.85, 1.2, 0.8), SH, UA)
        g.spike(np.add(el, (0, 0.2, -0.3)), np.add(el, (s * 0.3, 0.9, -1.9)), 0.3, HO, FA, HO2)             # elbow spike
        for k in range(5):                                                                                  # wisps trailing off the forearm
            f = 0.15 + 0.16 * k; p = np.add(lerp(el, wr, f), (s * 0.35, 0, -0.35))
            tendril(g, [tuple(p), tuple(np.add(p, (s * 0.6, -0.4, -0.9))), tuple(np.add(p, (s * 1.0, -0.6, -1.7))), tuple(np.add(p, (s * 1.3, -0.5, -2.4)))],
                    0.2, FA, rng, jit=0.15)
        for f in (0.7, 0.76): g.cap(lerp(el, wr, f), lerp(el, wr, f + 0.03), 0.5, 0.5, SH2, FA)
        g.cap(el, wr, 0.55, 0.38, SH, FA)
        g.ell(lerp(el, wr, 0.3), (0.62, 1.1, 0.62), SH, FA)
        hc = (s * 5.6, 6.6, 3.3)
        for i, x in enumerate(np.linspace(-0.45, 0.45, 4)):                                                 # long fingers, knuckles, claws
            xx = hc[0] + x * 1.2 + s * 0.1 * i
            pts = [(xx, 6.3, 3.6), (xx + x * 0.3, 5.3, 4.0), (xx + x * 0.5, 4.3, 3.9)]
            for q0, q1 in zip(pts, pts[1:]): g.cap(q0, q1, 0.15, 0.12, SH, HA)
            for q in pts[:2]: g.ell(q, (0.17, 0.17, 0.17), SH2, HA)
            g.horn([pts[-1], (pts[-1][0] + x * 0.2, 3.3, 4.1), (pts[-1][0] + x * 0.2, 2.6, 4.6)], 0.13, CL, HA, CL)
        g.cap((hc[0] - s * 0.5, 6.5, 3.4), (hc[0] - s * 0.85, 5.6, 4.0), 0.14, 0.11, SH, HA)                # thumb + claw
        g.spike((hc[0] - s * 0.85, 5.6, 4.0), (hc[0] - s * 0.95, 4.9, 4.5), 0.1, CL, HA)
        g.ell(hc, (0.6, 0.65, 0.42), SH, HA)

    # ================= legs: thin, backward knee spikes, three clawed toes =================
    for s, sd in ((-1, 'R'), (1, 'L')):
        TH, SHN = 'Thigh' + sd, 'Shin' + sd
        hp, kn = PIV[TH], PIV[SHN]; an = (s * 2.15, 1.6, -0.3); ft = (s * 2.2, 0.35, 0.9)
        g.spike(np.add(kn, (0, 0.2, 0.3)), np.add(kn, (s * 0.2, 1.1, 1.3)), 0.26, HO, SHN, HO2)             # knee spike
        g.cap(hp, kn, 0.95, 0.6, SH, TH)
        g.ell(lerp(hp, kn, 0.4), (0.95, 1.4, 0.95), SH, TH)
        for f in (0.35, 0.6): g.cap(lerp(kn, an, f), lerp(kn, an, f + 0.04), 0.5, 0.48, SH2, SHN)
        g.cap(kn, an, 0.55, 0.38, SH, SHN)
        g.cap(an, ft, 0.4, 0.35, SH, SHN)
        for dx in (-0.4, 0, 0.4):                                                                           # toes + claws
            t0 = (s * 2.2 + dx, 0.35, 0.9); t1 = (s * 2.2 + dx * 1.5, 0.25, 1.9)
            g.cap(t0, t1, 0.2, 0.15, SH, SHN)
            g.horn([t1, (t1[0] + dx * 0.2, 0.2, 2.45), (t1[0] + dx * 0.3, 0.0, 2.85)], 0.13, CL, SHN, CL)
        g.spike((s * 2.15, 0.6, -0.4), (s * 2.15, 0.15, -1.1), 0.16, CL, SHN)                               # heel claw

    g.chunky(body=[SH, SM], tones=[SH2, SH3, SHD], rate=0.025, bites=0.05, sizes=(1, 1, 2, 2, 3, 4))
    g.tiles({SH: (SH2, SH3)}, None, size=6)

ANIM = {'len': 6.0, 'periods': {'B': 3.0, 'L': 6.0, 'W': 1.5},
        'action': {'every': [5, 9], 'first': 2.0, 'len': 2.4,
                   'phases': {'lunge': [0.3, 1.5, 0.35, 0.6], 'screech': [0.45, 1.4, 0.2, 0.4]}},
        'joints': {
            'Hips': {'pos': {'y': [[0.15, 'B', 0], ['lunge', -0.7]], 'z': [['lunge', 1.2]]}, 'rot': {'z': [[2, 'L', 0]]}},
            'Chest': {'rot': {'x': [[2, 'B', 0], ['lunge', 14]], 'y': [[4, 'L', 0.3]]}},
            'Head': {'rot': {'x': [[3, 'B', 1], ['screech', -24]], 'y': [[10, 'L', 0.6]], 'z': [[4, 'W', 0]]}},
            'Jaw': {'rot': {'x': [[2, 'B', 0.5], ['screech', 38], [3]]}},
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
    make('ShadowMonster', SEG, PAL, (-9.5, 9.5, -0.5, 22, -8.5, 7), SC, shape, ANIM, FX, out, CAMS, block=BLOCK)
