#!/usr/bin/env python3
"""Shadow monster as a part build (owner default for models: many separate Studio parts, never one fused mesh or blocks).
~23 studs tall, rigged by the same SEG/ANIM as shadow.py (groups per joint, key-pose clip from rig.studio_doc).
Parts: spheres, capsules, cones, cylinders, wedges; Neon parts for the glow (eyes, mouth, core, cracks, veins, wisp tips).
Usage: python3 shadow_parts.py <outdir>  -> <outdir>/project.json + meta.json (one studio project doc, no geo docs)."""
import json, math, os, sys, time
import numpy as np
from rig import studio_doc
from shadow import SEG, ANIM, CAMS

PIV = {n: np.array(p, float) for n, _, p in SEG}
SID = {n: f'S{i}' for i, (n, _, _) in enumerate(SEG)}
BODY, BODY2, DARK, RIDGE = '#221a35', '#2c2145', '#110c1a', '#3b2d5a'
HORN, HORN2, CLAW = '#1b1724', '#4a3f66', '#0b0910'
EYE, CORE, VEIN, MOUTH, TEETH = '#c38dff', '#a764ff', '#7a3fe0', '#4a148f', '#d8cfe8'
SMOKE, SMOKE2, WISP = '#2a2040', '#3d2d60', '#9a6bff'
OBJ, rng = {}, np.random.default_rng(7)

def euler(R):
    """three.js 'XYZ' Euler (degrees) of rotation matrix R."""
    y = math.asin(max(-1.0, min(1.0, R[0, 2])))
    if abs(R[0, 2]) < 0.9999: x, z = math.atan2(-R[1, 2], R[2, 2]), math.atan2(-R[0, 1], R[0, 0])
    else: x, z = math.atan2(R[2, 1], R[1, 1]), 0.0
    return [round(math.degrees(v), 2) for v in (x, y, z)]

def align(d, roll=0.0):
    """Rotation taking +Y to direction d (then rolled about d by roll degrees)."""
    d = np.asarray(d, float); d = d / np.linalg.norm(d); y = np.array((0.0, 1.0, 0.0))
    v = np.cross(y, d); c = float(y @ d)
    if np.linalg.norm(v) < 1e-9: R = np.eye(3) if c > 0 else np.diag((1.0, -1.0, -1.0))
    else:
        K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]]); R = np.eye(3) + K + K @ K / (1 + c)
    if roll:
        a = math.radians(roll); k = d; K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
        R = (np.eye(3) + math.sin(a) * K + (1 - math.cos(a)) * K @ K) @ R
    return R

def rotz(deg): a = math.radians(deg); return np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1]])

def part(seg, shape, c, size, col, R=None, mat='SmoothPlastic', tr=0.0):
    o = {'type': 'part', 'shape': shape, 'parent': SID[seg], 'pos': [round(float(v), 3) for v in np.asarray(c, float) - PIV[seg]],
         'size': [round(float(v), 3) for v in size], 'color': col, 'material': mat}
    if R is not None:
        e = euler(R)
        if any(abs(v) > 0.01 for v in e): o['rot'] = e
    if tr: o['transparency'] = tr
    OBJ[f'p{len(OBJ):x}'] = o

def ell(seg, c, r, col, R=None, **k): part(seg, 'sphere', c, [2 * r[0], 2 * r[1], 2 * r[2]], col, R, **k)
def cap(seg, a, b, r, col, **k):
    a, b = np.asarray(a, float), np.asarray(b, float); L = np.linalg.norm(b - a)
    part(seg, 'capsule', (a + b) / 2, [2 * r, L + 2 * r, 2 * r], col, align(b - a), **k)
def cyl(seg, a, b, r, col, **k):
    a, b = np.asarray(a, float), np.asarray(b, float)
    part(seg, 'cylinder', (a + b) / 2, [2 * r, np.linalg.norm(b - a), 2 * r], col, align(b - a), **k)
def cone(seg, base, tip, r, col, **k):
    base, tip = np.asarray(base, float), np.asarray(tip, float)
    part(seg, 'cone', (base + tip) / 2, [2 * r, np.linalg.norm(tip - base), 2 * r], col, align(tip - base), **k)
def chain(seg, pts, r0, r1, col, tip=None, tipcol=None, **k):
    """Tapering limb/horn/wisp: capsules along pts, a cone at the end."""
    pts = [np.asarray(p, float) for p in pts]; n = len(pts) - 1
    for i in range(n - (1 if tip else 0)):
        cap(seg, pts[i], pts[i + 1], r0 + (r1 - r0) * i / max(1, n - 1), col, **k)
    if tip: cone(seg, pts[-2], pts[-1], r1 * 1.05, tipcol or col, **({} if tipcol in (WISP, EYE, CORE, VEIN) else k), **({'mat': 'Neon'} if tipcol in (WISP, EYE, CORE, VEIN) else {}))
lerp = lambda a, b, f: np.asarray(a, float) + (np.asarray(b, float) - np.asarray(a, float)) * f

def on_limb(a, b, f, r, side):
    a, b = np.asarray(a, float), np.asarray(b, float); d = (b - a) / np.linalg.norm(b - a)
    s = np.asarray(side, float); s = s - d * (s @ d); s /= np.linalg.norm(s)
    return a + (b - a) * f + s * r

def vein(seg, a, b, r0, r1, side, n=6):
    a, b = np.asarray(a, float), np.asarray(b, float); d = (b - a) / np.linalg.norm(b - a)
    s = np.asarray(side, float); s = s - d * (s @ d); s /= np.linalg.norm(s); t = np.cross(d, s); ph = rng.uniform(0, 6.28)
    pts = [a + (b - a) * (i / n) + (s * math.cos(0.5 * math.sin(ph + i)) + t * math.sin(0.5 * math.sin(ph + i))) * (r0 + (r1 - r0) * i / n) for i in range(n + 1)]
    for p, q in zip(pts, pts[1:]): cap(seg, p, q, 0.07, VEIN, mat='Neon')

def wisp(seg, base, d, L, r, tipglow):
    d = np.asarray(d, float); d /= np.linalg.norm(d); side = np.cross(d, (0.3, 1, 0.2)); side /= np.linalg.norm(side)
    pts = [np.asarray(base, float) + d * L * f + side * 0.35 * math.sin(f * 5 + rng.uniform(0, 6)) * f for f in (0, 0.3, 0.55, 0.8, 1.0)]
    chain(seg, pts, r, r * 0.45, SMOKE if rng.random() < 0.6 else SMOKE2, tip=True, tipcol=WISP if tipglow else SMOKE2, tr=0.12)

def back_z(x, y):
    """Back surface (most negative z) of the torso ellipsoids at (x, y); wisps and back pieces root here."""
    zs = []
    for c, r in (((0, 13.9, 0.5), (2.3, 2.95, 1.95)), ((0, 15.6, 0.6), (3.15, 1.2, 1.7)), ((0, 11.75, 0.3), (1.6, 1.35, 1.35))):
        q = 1 - ((x - c[0]) / r[0]) ** 2 - ((y - c[1]) / r[1]) ** 2
        if q > 0: zs.append(c[2] - r[2] * math.sqrt(q))
    return min(zs) if zs else 0.0

def build():
    Hd, Jw, C, Hp = 'Head', 'Jaw', 'Chest', 'Hips'
    # ================= head =================
    ell(Hd, (0, 18.55, 3.0), (1.35, 1.25, 2.0), BODY)                              # skull
    ell(Hd, (0, 18.95, 1.6), (1.1, 1.0, 1.2), BODY)                                # back of the skull
    ell(Hd, (0, 17.95, 4.3), (1.15, 0.5, 1.3), BODY2)                              # upper muzzle
    ell(Hd, (0, 18.25, 5.15), (0.55, 0.32, 0.4), BODY2)                            # snout tip
    for s in (-1, 1):
        cap(Hd, (s * 0.12, 18.42, 5.45), (s * 0.3, 18.35, 5.3), 0.05, DARK)        # nostril slits
        ell(Hd, (s * 1.02, 17.95, 4.05), (0.42, 0.38, 0.6), DARK)                  # sunken cheeks
        # eyes: slanted Neon slits in dark sockets, a smaller pair above
        R = rotz(-s * 22)
        ell(Hd, (s * 0.58, 18.6, 4.82), (0.36, 0.13, 0.12), EYE, R, mat='Neon')
        ell(Hd, (s * 0.58, 18.6, 4.72), (0.46, 0.22, 0.16), DARK, R)
        ell(Hd, (s * 0.95, 19.02, 4.38), (0.2, 0.08, 0.08), EYE, rotz(-s * 30), mat='Neon')
        ell(Hd, (s * 0.95, 19.02, 4.3), (0.27, 0.14, 0.12), DARK, rotz(-s * 30))
        cap(Hd, (s * 0.15, 18.92, 4.92), (s * 1.15, 19.02, 4.35), 0.15, RIDGE)    # overhanging brow
        chain(Hd, [(s * 0.85, 19.45, 3.5), (s * 1.55, 20.5, 2.4), (s * 2.05, 21.15, 0.7), (s * 1.95, 21.0, -1.1), (s * 1.55, 20.25, -2.4)],
              0.42, 0.2, HORN, tip=True, tipcol=HORN2, mat='Slate')                # great horns
        for f in (0.2, 0.4, 0.6): ell(Hd, lerp((s * 1.55, 20.5, 2.4), (s * 2.05, 21.15, 0.7), f), (0.38, 0.38, 0.38), HORN2, mat='Slate')  # horn rings
        chain(Hd, [(s * 1.25, 18.85, 2.6), (s * 2.1, 18.95, 1.7), (s * 2.55, 18.55, 0.5)], 0.22, 0.12, HORN, tip=True, tipcol=HORN2, mat='Slate')
        cone(Hd, (s * 1.25, 17.95, 3.4), (s * 2.45, 18.05, 2.5), 0.2, HORN, mat='Slate')   # cheek spurs
    for k in range(8):                                                             # crown spikes
        z = 4.0 - 0.45 * k; y = 19.7 - 0.09 * k
        cone(Hd, (0, y - 0.1, z), (0, y + 0.55 - 0.03 * k, z - 0.55), 0.18 - 0.01 * k, HORN, mat='Slate')
    # the grin: a glowing gap between muzzle and jaw, fangs hanging into it
    ell(Hd, (0, 17.48, 4.2), (1.05, 0.28, 1.22), MOUTH, mat='Neon')
    for a in np.linspace(-62, 62, 11):
        t = math.radians(a); x, z = 1.02 * math.sin(t), 4.2 + 1.18 * math.cos(t); ln = 0.42 - 0.15 * abs(t)
        cone(Hd, (x, 17.62, z), (x * 0.98, 17.62 - ln, z + 0.02), 0.075, TEETH)
    for a in np.linspace(-55, 55, 10):
        t = math.radians(a); x, z = 0.95 * math.sin(t), 4.15 + 1.1 * math.cos(t); ln = 0.34 - 0.12 * abs(t)
        cone(Jw, (x, 17.3, z), (x * 0.98, 17.3 + ln, z + 0.02), 0.07, TEETH)
    ell(Jw, (0, 17.05, 4.1), (1.0, 0.38, 1.25), BODY2)                             # jaw
    ell(Jw, (0, 16.95, 3.3), (0.85, 0.42, 0.8), BODY)
    for s in (-1, 0, 1): cone(Jw, (s * 0.45, 16.8, 4.6 - 0.15 * abs(s)), (s * 0.6, 16.15, 4.45), 0.12, HORN, mat='Slate')   # chin barbs

    # ================= torso =================
    chain(C, [(0, 15.5, 1.2), (0, 16.5, 1.8), (0, 17.4, 2.5)], 0.72, 0.62, BODY)    # neck
    for f in (0.3, 0.6): ell(C, lerp((0, 15.5, 1.2), (0, 17.4, 2.5), f) + (0, 0, -0.55), (0.3, 0.25, 0.3), RIDGE)
    ell(C, (0, 13.9, 0.5), (2.3, 2.95, 1.95), BODY)                                # ribcage
    ell(C, (0, 15.6, 0.6), (3.15, 1.2, 1.7), BODY)                                 # shoulders
    ell(C, (0, 11.75, 0.3), (1.6, 1.35, 1.35), BODY2)                              # waist
    for s in (-1, 1): ell(C, (s * 1.0, 15.0, 1.95), (1.0, 0.75, 0.45), BODY2)     # pecs
    ell(C, (0, 14.0, 2.42), (0.72, 0.85, 0.3), DARK)                               # core socket
    ell(C, (0, 14.0, 2.55), (0.46, 0.56, 0.25), CORE, mat='Neon')                  # glowing core
    for a in np.linspace(0, 2 * np.pi, 8, endpoint=False):                         # cracks spreading over the chest
        pts = []
        for i in range(5):
            r = 0.5 + 0.48 * i; aa = a + rng.uniform(-0.25, 0.25); x, y = r * math.cos(aa), 14.0 + r * math.sin(aa) * 1.15
            z = 0.5 + 2.0 * math.sqrt(max(0.0, 1 - (x / 2.35) ** 2 - ((y - 13.9) / 3.0) ** 2)) + 0.03
            pts.append((x, y, z))
        for i, (p, q) in enumerate(zip(pts, pts[1:])): cap(C, p, q, 0.075 - 0.012 * i, CORE if i < 2 else VEIN, mat='Neon')
    for i, y in enumerate((15.45, 14.75, 14.0, 13.25, 12.55)):                     # ribs
        w = 2.45 - 0.12 * i
        for s in (-1, 1):
            pts = [(s * 0.6, y, 2.45 - 0.05 * i), (s * w * 0.78, y - 0.25, 2.05), (s * w, y - 0.55, 0.6), (s * w * 0.85, y - 0.75, -0.9)]
            for p, q in zip(pts, pts[1:]): cap(C, p, q, 0.19, RIDGE)
    cap(C, (0, 12.1, 2.3), (0, 15.7, 2.45), 0.28, RIDGE)                            # sternum
    for k in range(10):                                                            # spine knobs + dorsal spikes
        y = 16.6 - 0.6 * k; z = -1.15 + 0.08 * k
        ell(C, (0, y, z + 0.1), (0.42, 0.3, 0.38), RIDGE)
        cone(C, (0, y, z), (0, y + 0.6, z - 1.3 - 0.5 * math.sin(k * 0.6)), 0.26 - 0.015 * k, HORN, mat='Slate')
    for s in (-1, 1):
        cap(C, (s * 0.3, 16.35, 1.8), (s * 3.2, 16.25, 1.3), 0.24, RIDGE)            # collarbones
        ell(C, (s * 3.4, 16.0, 1.35), (1.0, 0.95, 1.0), BODY)                       # shoulder balls
        for d in ((0.3, 1.9, -0.4), (0.9, 1.3, -1.0), (-0.4, 1.6, -1.2), (1.2, 0.6, 0.2)):
            cone(C, (s * 3.5, 16.6, 1.2), (s * (3.5 + d[0]), 16.6 + d[1], 1.2 + d[2]), 0.28, HORN, mat='Slate')
    for k in range(36):                                                            # shadow wisps rising off the back and shoulders
        x, y = rng.uniform(-2.4, 2.4), rng.uniform(12.6, 16.4)
        z = back_z(x, y) + 0.12                                                  # rooted in the back skin, never floating
        wisp(C, (x, y, z), (x * 0.18, 1.0, -0.7), rng.uniform(2.2, 4.4), rng.uniform(0.2, 0.32), k % 3 == 0)

    # ================= hips: pelvis, smoke skirt, tail =================
    ell(Hp, (0, 10.4, 0.1), (1.95, 1.2, 1.55), BODY)
    for s in (-1, 1): ell(Hp, (s * 1.45, 10.3, 0.0), (0.8, 0.8, 0.8), BODY2)
    for k in range(30):
        a = k / 30 * 2 * np.pi
        if math.sin(a) > 0.85: continue                                            # open at the front
        x0, z0 = 1.85 * math.cos(a), 1.5 * math.sin(a)
        wisp(Hp, (x0, 10.0, z0), (x0 * 0.15, -1.0, z0 * 0.15), rng.uniform(2.8, 4.8), rng.uniform(0.22, 0.3), k % 5 == 0)
    tail = [(0, 10.2, -1.2), (0, 9.0, -3.0), (0.6, 7.2, -4.6), (-0.4, 5.2, -5.8), (0.5, 3.4, -6.6), (0.0, 2.0, -7.3)]
    chain(Hp, tail, 0.75, 0.25, BODY, tip=True, tipcol=WISP)
    for k, f in enumerate(np.linspace(0.08, 0.75, 7)):
        i = int(f * (len(tail) - 1)); p = lerp(tail[i], tail[i + 1], f * (len(tail) - 1) - i)
        cone(Hp, p, p + (0, 1.0 - 0.09 * k, -0.6), 0.22 - 0.02 * k, HORN, mat='Slate')

    # ================= arms =================
    for s, sd in ((-1, 'R'), (1, 'L')):
        UA, FA, HA = 'UpperArm' + sd, 'Forearm' + sd, 'Hand' + sd
        sh, el, wr = PIV[UA], PIV[FA], PIV[HA]
        chain(UA, [sh, lerp(sh, el, 0.5), el], 0.82, 0.6, BODY)
        ell(UA, lerp(sh, el, 0.35), (0.92, 1.25, 0.88), BODY)                      # biceps
        for f in (0.3, 0.55): cyl(UA, lerp(sh, el, f), lerp(sh, el, f + 0.04), 0.82 - 0.2 * f, RIDGE)   # sinew bands
        vein(UA, lerp(sh, el, 0.1), lerp(sh, el, 0.95), 0.92, 0.6, (s, 0, 0.4))
        ell(FA, el, (0.66, 0.66, 0.66), BODY2)                                     # elbow
        cone(FA, el + (0, 0.2, -0.3), el + (s * 0.3, 1.0, -2.1), 0.3, HORN, mat='Slate')
        chain(FA, [el, lerp(el, wr, 0.5), wr], 0.6, 0.44, BODY)
        ell(FA, lerp(el, wr, 0.3), (0.7, 1.15, 0.7), BODY)
        for f in (0.7, 0.78): cyl(FA, lerp(el, wr, f), lerp(el, wr, f + 0.03), 0.52, RIDGE)
        vein(FA, lerp(el, wr, 0.05), lerp(el, wr, 0.9), 0.7, 0.48, (s, 0, 0.5))
        vein(FA, lerp(el, wr, 0.1), lerp(el, wr, 0.85), 0.66, 0.46, (0, 0, 1))
        for k in range(4):
            wisp(FA, on_limb(el, wr, 0.15 + 0.18 * k, 0.45, (s, 0, -1)), (s * 0.5, -0.3, -1.0), rng.uniform(1.6, 2.6), 0.2, k % 2 == 0)
        hc = np.array((s * 5.6, 6.6, 3.3))
        ell(HA, hc, (0.68, 0.75, 0.5), BODY)                                       # palm
        for i, x in enumerate(np.linspace(-0.5, 0.5, 4)):                          # long fingers, knuckles, hooked claws
            xx = hc[0] + x * 1.2
            pts = [np.array((xx, 6.3, 3.6)), np.array((xx + x * 0.3, 5.2, 4.05)), np.array((xx + x * 0.5, 4.1, 3.95))]
            for p, q in zip(pts, pts[1:]): cap(HA, p, q, 0.17, BODY)
            for p in pts: ell(HA, p, (0.21, 0.21, 0.21), BODY2)
            chain(HA, [pts[-1], pts[-1] + (x * 0.2, -1.0, 0.2), pts[-1] + (x * 0.25, -1.8, 0.8), pts[-1] + (x * 0.25, -2.15, 1.35)], 0.15, 0.08, CLAW, tip=True, mat='Slate')
        cap(HA, hc + (-s * 0.5, -0.1, 0.1), hc + (-s * 0.9, -1.1, 0.8), 0.16, BODY)  # thumb + claw
        chain(HA, [hc + (-s * 0.9, -1.1, 0.8), hc + (-s * 1.0, -1.8, 1.3), hc + (-s * 0.95, -2.2, 1.8)], 0.13, 0.07, CLAW, tip=True, mat='Slate')

    # ================= legs =================
    for s, sd in ((-1, 'R'), (1, 'L')):
        TH, SHN = 'Thigh' + sd, 'Shin' + sd
        hp, kn = PIV[TH], PIV[SHN]; an = np.array((s * 2.15, 1.55, -0.2)); ft = np.array((s * 2.2, 0.45, 0.95))
        chain(TH, [hp, lerp(hp, kn, 0.5), kn], 1.0, 0.68, BODY)
        ell(TH, lerp(hp, kn, 0.4), (1.05, 1.5, 1.05), BODY)
        vein(TH, lerp(hp, kn, 0.15), lerp(hp, kn, 0.95), 1.1, 0.72, (s, 0, 0.6))
        ell(SHN, kn, (0.72, 0.72, 0.72), BODY2)                                    # knee
        cone(SHN, kn + (0, 0.2, 0.3), kn + (s * 0.2, 1.2, 1.5), 0.28, HORN, mat='Slate')
        chain(SHN, [kn, lerp(kn, an, 0.5), an], 0.64, 0.46, BODY)
        for f in (0.35, 0.6): cyl(SHN, lerp(kn, an, f), lerp(kn, an, f + 0.04), 0.6, RIDGE)
        vein(SHN, lerp(kn, an, 0.05), lerp(kn, an, 0.9), 0.66, 0.48, (s * 0.5, 0, 1))
        ell(SHN, an, (0.55, 0.52, 0.55), BODY2)                                    # ankle
        cap(SHN, an, ft, 0.46, BODY)                                               # foot
        ell(SHN, (s * 2.2, 0.5, 1.2), (0.65, 0.42, 0.78), BODY)
        for dx in (-0.45, 0, 0.45):                                                # toes + claws
            t0 = np.array((s * 2.2 + dx * 0.8, 0.45, 1.15)); t1 = np.array((s * 2.2 + dx * 1.5, 0.3, 2.1))
            cap(SHN, t0, t1, 0.24, BODY)
            ell(SHN, t1, (0.24, 0.22, 0.24), BODY2)
            chain(SHN, [t1, t1 + (dx * 0.2, 0.0, 0.5), t1 + (dx * 0.3, -0.22, 0.95)], 0.16, 0.08, CLAW, tip=True, mat='Slate')
        chain(SHN, [np.array((s * 2.15, 0.75, -0.3)), np.array((s * 2.15, 0.4, -0.9)), np.array((s * 2.15, 0.08, -1.25))], 0.17, 0.08, CLAW, tip=True, mat='Slate')

if __name__ == '__main__':
    out = (sys.argv[1:] or ['out'])[0]; os.makedirs(out, exist_ok=True)
    build()
    doc = studio_doc('ShadowMonster', SEG, [None], 1.0, (0, 0, 0, 0, 0, 0), 1, [], ANIM, {}, CAMS[0])
    doc['objects'].update(OBJ)
    doc['updated'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    txt = json.dumps(doc, separators=(',', ':'))
    open(os.path.join(out, 'project.json'), 'w').write(txt)
    json.dump({'name': 'ShadowMonster', 'updated': doc['updated'], 'count': len(doc['objects']), 'ai': True}, open(os.path.join(out, 'meta.json'), 'w'))
    print(f'{len(OBJ)} parts, project {len(txt) // 1000} KB')
