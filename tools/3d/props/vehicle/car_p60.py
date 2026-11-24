#!/usr/bin/env python3
"""Realistic blue compact hatchback, hero grade, built from prompt 60 (1 unit = 1 m, front +Z, up +Y,
origin = wheelbase centre at ground).

python3 car_p60.py OUT [--check]
4.30 x 1.80 x 1.45 m, wheelbase 2.63, track 1.55, clearance 0.14, 225/45R17 tyres (dia 0.634, width 0.225).
Copy of car.py extended to the full part list: fenders, quarters, seam grooves, pillars, window trims, roof rails,
shark fin, projector headlights + DRL, amber inner tails, third brake light, 10-spoke rims with separate lugs,
caps, valve stems, vented discs, struts + springs, diffuser, underbody tray, tow hook cover, plate recesses.
Body and cabin are lofted superellipse sections; panels are solid patches sampled from the same surface and
offset so they straddle it (no coplanar overlap). Tinted glass is opaque, so there is no interior and no ground.
Parent tree: Car > Body, Glass, Lights, Mirrors, Wheels{FL,FR,RL,RR}, Underbody.
--check: mesh check, detail floor --class hero, zfight --prop on the last live stage.
"""
# @style: realistic
# @model: car60 | Realistic blue 4-door compact hatchback, hero grade, prompt 60
# @run: python3 car_p60.py OUT --check
import json
import math
import os
import re
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # props helpers live one level up
import props as P  # noqa: E402
import house as H  # noqa: E402  (fuv metre UVs, tex, mk)

NAME, TITLE = "car60", "Car"
PAINT, PAINT_D, TRIM, GLASS, CHROME = "#2F6DB5", "#2A63A6", "#2A2A2A", "#1E2833", "#C8CCD0"
RUBBER, RIM, LENS, TAIL, AMBER = "#3A3A3A", "#A8ADB3", "#E8EEF2", "#B0151A", "#E08A1E"
DISC, CALIPER, PLATE = "#6E6E6E", "#B02020", "#F2F2F2"
WB, TRACK, R_TYRE = 2.63, 1.55, 0.317
WHEELS = [(sx * TRACK / 2, R_TYRE, sz * WB / 2) for sz in (1, -1) for sx in (1, -1)]  # FR FL RR RL
WTAGS = ("fr", "fl", "rr", "rl")
WELL_R, WELL_X = 0.385, 0.62
NB, NC = 5.0, 4.0  # superellipse exponents: body, cabin
TOP = math.pi / 2

M_PAINT = dict(roughness=0.3, metalness=0.4)
M_GLASS = dict(roughness=0.05, metalness=0.1)
M_CHROME = dict(roughness=0.15, metalness=0.9)
M_TRIM = dict(roughness=0.8)


def lerp(z, zs, vs):
    return float(np.interp(z, zs, vs))


def se(t, n):
    c, s = np.cos(t), np.sin(t)
    return np.sign(c) * np.abs(c) ** (2 / n), np.sign(s) * np.abs(s) ** (2 / n)


def body_dims(z):
    zs = [-2.15, -2.0, -1.6, 0.9, 1.2, 1.9, 2.15]
    y1 = lerp(z, zs, [0.80, 0.95, 0.99, 0.98, 0.93, 0.80, 0.62])
    y0 = lerp(z, zs, [0.40, 0.24, 0.18, 0.16, 0.18, 0.22, 0.36])
    e = max(0.0, abs(z) - 1.72) / 0.43
    return y0, y1, 0.90 * (1 - 0.36 * e ** 2.5)


def body_sec(z, t):
    y0, y1, hw = body_dims(z)
    cx, sy = se(t, NB)
    return hw * cx, (y0 + y1) / 2 + (y1 - y0) / 2 * sy


def cab_top(z):
    # gentle roof slope into a steep (~52 deg) hatch glass, raked windshield
    return lerp(z, [-2.0, -1.96, -1.74, -1.45, 0.25, 1.05], [0.98, 1.08, 1.38, 1.44, 1.45, 0.98])


def cab_sec(z, t, yb=0.94):
    yt = cab_top(z)
    cx, sy = se(t, NC)
    y = (yb + yt) / 2 + (yt - yb) / 2 * sy
    return cx * (0.86 - 0.20 * (sy + 1) / 2), y


def frac_t(f, n):
    """Parameter t on the right side whose section height fraction is f in [-1, 1]."""
    return math.copysign(math.asin(min(1.0, abs(f)) ** (n / 2)), f)


def loft(sec, z0, z1, nz, nt):
    T = np.linspace(0, 2 * math.pi, nt, endpoint=False)
    rows = []
    for z in np.linspace(z0, z1, nz):
        x, y = sec(z, T)
        rows.append(np.column_stack([x, y, np.full(nt, z)]))
    G = np.array(rows)
    c0, c1 = G[0].mean(0), G[-1].mean(0)
    return P.grid_mesh(G, False, c0, c1)


def solid(O, I):
    """Closed solid between an outer and inner grid [nj, ni, 3] (same layout)."""
    nj, ni, _ = O.shape
    o = lambda j, i: j * ni + i
    k = nj * ni
    q = lambda j, i: k + j * ni + i
    F = []
    for j in range(nj - 1):
        for i in range(ni - 1):
            F.append([o(j, i), o(j + 1, i), o(j + 1, i + 1), o(j, i + 1)])
            F.append([q(j, i + 1), q(j + 1, i + 1), q(j + 1, i), q(j, i)])
    J, L = nj - 1, ni - 1
    for i in range(ni - 1):
        F.append([o(0, i), o(0, i + 1), q(0, i + 1), q(0, i)])
        F.append([o(J, i + 1), o(J, i), q(J, i), q(J, i + 1)])
    for j in range(nj - 1):
        F.append([o(j + 1, 0), o(j, 0), q(j, 0), q(j + 1, 0)])
        F.append([o(j, L), o(j + 1, L), q(j + 1, L), q(j, L)])
    return P.orient(P.Mesh(np.concatenate([O.reshape(-1, 3), I.reshape(-1, 3)]), F))


def patch(sec, z0, z1, t0, t1, off, th, nz=10, nt=10):
    """Solid skin patch on a lofted surface, offset outward along the section normal."""
    T = np.linspace(t0, t1, nt)
    O, I = [], []
    for z in np.linspace(z0, z1, nz):
        x, y = sec(z, T)
        xa, ya = sec(z, T + 1e-3)
        xb, yb = sec(z, T - 1e-3)
        n = np.column_stack([ya - yb, -(xa - xb)])
        n /= np.linalg.norm(n, axis=1, keepdims=True)
        p = np.column_stack([x, y])
        O.append(np.column_stack([p + n * (off + th), np.full(nt, z)]))
        I.append(np.column_stack([p + n * off, np.full(nt, z)]))
    return solid(np.array(O), np.array(I))


def mirror_x(m):
    return P.xf(m, s=(-1, 1, 1))


def side_pair(sec, n, z0, z1, f0, f1, off, th, nz=10, nt=10):
    m = patch(sec, z0, z1, frac_t(f0, n), frac_t(f1, n), off, th, nz, nt)
    return mirror_x(m), m  # left, right


def t_pair(sec, z0, z1, t0, t1, off, th, nz=10, nt=4):
    m = patch(sec, z0, z1, t0, t1, off, th, nz, nt)
    return mirror_x(m), m


def sframe(sec, n, z, f):
    """Point and outward unit normal on the right side of a loft at height fraction f."""
    t = frac_t(f, n)
    pt = lambda zz, tt: np.array([float(np.ravel(v)[0]) for v in sec(zz, np.array([tt]))] + [zz])
    p = pt(z, t)
    Tt = pt(z, t + 1e-3) - pt(z, t - 1e-3)
    Tz = pt(z + 1e-3, t) - pt(z - 1e-3, t)
    N = np.cross(Tt, Tz)
    N /= np.linalg.norm(N)
    if N[0] < 0:
        N = -N
    return p, N


def place(m, p, N):
    """Map local +Y onto N and move the origin to p (right-handed frame, faces keep their winding)."""
    a = P.unit(np.asarray(N, float))
    b = np.cross(a, [0, 0, 1.0])
    b = P.unit(b if np.linalg.norm(b) > 1e-6 else np.cross(a, [1.0, 0, 0]))
    c = np.cross(b, a)
    v = m.v[:, :1] * b + m.v[:, 1:2] * a + m.v[:, 2:3] * c + p
    return P.Mesh(v, [f[:] for f in m.f], None if m.uv is None else m.uv.copy())


def press_wells(m):
    """Push body vertices inside each wheel-well circle in to |x| = WELL_X."""
    v = m.v
    for cx, cy, cz in WHEELS:
        d = np.hypot(v[:, 1] - cy, v[:, 2] - cz)
        hit = (d < WELL_R) & (np.sign(v[:, 0]) == np.sign(cx)) & (np.abs(v[:, 0]) > WELL_X)
        v[hit, 0] = np.sign(cx) * WELL_X
    return m


def arc_band(cx, cy, cz, r0, r1, x0, x1, na=32):
    A = np.linspace(-0.15, math.pi + 0.15, na)
    X = np.linspace(x0, x1, 3)
    grid = lambda r: np.array([[(x, cy + r * math.sin(a), cz + r * math.cos(a)) for a in A] for x in X])
    return solid(grid(r1), grid(r0))


def tube(r_in, r_out, L, seg=20):
    return P.lathe([(r_in, 0), (r_out, 0), (r_out, L), (r_in, L)], seg, True)


def disc_y(r, y0, y1, seg=20):
    """Solid disc along +Y with a small chamfer on the top face."""
    return P.lathe([(0, y0), (r, y0), (r, y1 - 0.003), (r - 0.003, y1), (0, y1)], seg, False)


def tyre():
    prof = [(0.214, -0.100), (0.285, -0.1125), (0.308, -0.106), (0.317, -0.092), (0.317, -0.052), (0.309, -0.050),
            (0.309, -0.040), (0.317, -0.038), (0.317, 0.038), (0.309, 0.040), (0.309, 0.050), (0.317, 0.052),
            (0.317, 0.092), (0.308, 0.106), (0.285, 0.1125), (0.214, 0.100)]

    def sipes(th, Y, R):  # tread blocks: lateral sipes 6 mm deep across the outer rows, staggered
        on = (R > 0.316) & (np.sin(th * 36 + np.sign(Y) * 0.8) > 0.5)
        return np.where(on, R - 0.006, R)
    return P.lathe(prof, 108, True, sipes)


def tyre_ring():
    # raised sidewall lettering band on the outer (+Y) side, 12+ mm proud of the sidewall
    return P.lathe([(0.250, 0.100), (0.281, 0.104), (0.281, 0.124), (0.276, 0.127), (0.255, 0.126),
                    (0.250, 0.121)], 72, True)


def rim():
    barrel = P.lathe([(0.19, -0.10), (0.216, -0.105), (0.223, -0.095), (0.21, -0.08), (0.21, 0.07),
                      (0.224, 0.085), (0.219, 0.096), (0.19, 0.09)], 64, True)
    hub = P.lathe([(0, 0.045), (0.072, 0.045), (0.078, 0.075), (0.062, 0.092), (0, 0.094)], 30, False)
    parts = [barrel, hub]
    for k in range(10):  # 10 spokes, slightly dished outward toward the hub
        a = k * 36
        ra = math.radians(a)
        sp = P.rbox((0.155, 0.024, 0.030), 0.009, 2)
        parts.append(P.xf(sp, r=(0, a, -6), t=(0.138 * math.cos(ra), 0.074, -0.138 * math.sin(ra))))
    return P.merge(*parts)


def lug(k):
    rb = math.radians(k * 72 + 18)
    m = P.lathe([(0, 0.080), (0.012, 0.080), (0.012, 0.106), (0.008, 0.112), (0, 0.112)], 6, False)
    return P.xf(m, t=(0.052 * math.cos(rb), 0, -0.052 * math.sin(rb)))


def vented_disc():
    a = tube(0.07, 0.152, 0.008, 40)
    b = P.xf(a, t=(0, 0.016, 0))
    vanes = [P.xf(P.rbox((0.075, 0.010, 0.006), 0.002, 1), r=(0, k * 15, 0),
                  t=(0.112 * math.cos(math.radians(k * 15)), 0.012, -0.112 * math.sin(math.radians(k * 15))))
             for k in range(24)]
    hat = P.lathe([(0.07, 0.0), (0.08, 0.0), (0.08, 0.045), (0.07, 0.045)], 30, True)
    return P.xf(P.merge(a, b, hat, *vanes), t=(0, -0.045, 0))


def caliper(front):
    L = 0.15 if front else 0.11
    body = P.rbox((0.06, 0.07, L), 0.015, 2)
    bolt = P.xf(P.lathe([(0, 0), (0.01, 0), (0.01, 0.012), (0, 0.014)], 8, False), t=(0, 0.035, L / 2 - 0.025))
    bolt2 = P.xf(bolt, t=(0, 0, -(L - 0.05)))
    a = math.radians(30)
    return P.xf(P.merge(body, bolt, bolt2), r=(0, 30, 0), t=(-0.13 * math.cos(a), -0.02, 0.13 * math.sin(a)))


def valve():
    m = P.lathe([(0, 0.07), (0.006, 0.07), (0.006, 0.105), (0.0045, 0.11), (0.0045, 0.118), (0, 0.12)], 8, False)
    ra = math.radians(36 * 2 + 18)
    return P.xf(m, t=(0.203 * math.cos(ra), 0, -0.203 * math.sin(ra)))


def at_wheel(m, w):
    cx, cy, cz = w
    return P.xf(m, r=(0, 0, -90 if cx > 0 else 90), t=(cx, cy, cz))


def slab_z(hw, hh, depth, x, y, z, face=1, seg=2):
    """Rounded plate facing +Z (face=1) or -Z: back face 2 cm inside the cap at z, front face depth proud."""
    m = P.rbox((2 * hw, 2 * hh, depth + 0.02), min(0.012, hh * 0.4, hw * 0.4), seg)
    return P.xf(m, t=(x, y, z + face * (depth / 2 - 0.01)))


def badge(y, z, face=1):
    m = P.merge(disc_y(0.038, -0.03, 0.040, 32), P.lathe([(0.026, 0.038), (0.030, 0.038), (0.030, 0.052),
                                                          (0.026, 0.052)], 32, True))
    return P.xf(m, r=(90 * face, 0, 0), t=(0, y, z))


def spring(cx, cz, y0, y1, r=0.055):
    s = np.sign(cx)
    n = 220
    a = np.linspace(0, 2 * math.pi * 6, n)
    path = np.column_stack([s * 0.56 + r * np.cos(a), np.linspace(y0, y1, n), cz + r * np.sin(a)])
    return P.sweep(path, 0.008, 8, caps="round")


def group_of(gid):
    k = gid[len(NAME) + 1:]
    w = re.search(r"-(fl|fr|rl|rr)(-|$)", k)
    if k.startswith(("tyre", "ring", "rim", "lug", "cap", "valve", "disc", "caliper")) and w:
        return "wheel-" + w.group(1)
    if k.startswith(("windshield", "rear-glass", "win-")):
        return "glass"
    if k.startswith("mirror"):
        return "mirrors"
    if k.startswith(("head", "proj", "drl", "tail", "amber", "third", "indic", "fog-l", "fog-r", "plate-light")):
        return "lights"
    if k.startswith(("tray", "diffuser", "fin", "exhaust", "strut", "spring", "tow")):
        return "underbody"
    return "body"


GROUPS = [("body", "Body", None), ("glass", "Glass", None), ("lights", "Lights", None),
          ("mirrors", "Mirrors", None), ("wheels", "Wheels", None), ("wheel-fl", "FL", "wheels"),
          ("wheel-fr", "FR", "wheels"), ("wheel-rl", "RL", "wheels"), ("wheel-rr", "RR", "wheels"),
          ("underbody", "Underbody", None)]
STAGE_OF = {"body": 0, "underbody": 0, "glass": 1, "lights": 1, "mirrors": 1}


@P.prop(NAME, TITLE)
def car(rng):
    tex = H.tex
    p = []
    add = lambda pid, m, col, t=None, **kw: p.append(H.mk(pid, m, col, t, **kw))
    lr = lambda base, pair, col, t, **kw: [add(base + "-" + s, m, col, t, **kw) for s, m in zip("lr", pair)]

    # ---- body shell + cabin roof: big smooth lofts (box UVs keep shared vertices)
    for pid, m in (("body", press_wells(loft(body_sec, -2.15, 2.15, 120, 72))),
                   ("cabin", loft(cab_sec, -2.0, 1.05, 72, 48))):
        P.box_uv(m, 1.0)
        p.append(P.part(pid, m, PAINT, smooth=True, texture="paint", **M_PAINT))

    # ---- painted panels
    add("hood", patch(body_sec, 1.02, 1.95, TOP - 1.2, TOP + 1.2, -0.02, 0.035, 16, 24), PAINT, "paint", **M_PAINT)
    hatch = P.merge(patch(cab_sec, -1.71, -1.62, TOP - 0.95, TOP + 0.95, -0.02, 0.04, 6, 20),       # spoiler lip
                    patch(cab_sec, -2.04, -1.958, TOP - 1.3, TOP + 1.3, -0.02, 0.035, 4, 20),     # glass base
                    patch(body_sec, -2.12, -1.98, TOP - 0.75, TOP + 0.75, -0.02, 0.035, 8, 20))    # tailgate top
    add("hatch", hatch, PAINT, "paint", **M_PAINT)
    lo0, lo1 = math.pi + 0.05, 2 * math.pi - 0.05
    add("bumper-f", patch(body_sec, 1.80, 2.15, lo0, lo1, -0.02, 0.04, 12, 36), TRIM, "dust", **M_TRIM)
    add("bumper-r", patch(body_sec, -2.15, -1.80, lo0, lo1, -0.04, 0.07, 12, 36), TRIM, "dust", **M_TRIM)
    for tag, z0, z1 in (("f", 0.02, 0.92), ("r", -0.92, -0.02)):
        lr("door-" + tag, side_pair(body_sec, NB, z0, z1, -0.55, 0.85, -0.02, 0.035, 16, 16), PAINT, "paint",
           **M_PAINT)
    lr("fender", side_pair(body_sec, NB, 0.96, 1.86, 0.45, 0.64, -0.02, 0.035, 16, 6), PAINT, "paint", **M_PAINT)
    lr("quarter", side_pair(body_sec, NB, -1.90, -0.96, 0.45, 0.85, -0.02, 0.035, 16, 8), PAINT, "paint",
       **M_PAINT)
    lr("skirt", side_pair(body_sec, NB, -0.92, 0.92, -0.97, -0.62, -0.02, 0.04, 16, 6), TRIM, "dust", **M_TRIM)
    for (cx, cy, cz), w in zip(WHEELS, WTAGS):
        s = np.sign(cx)
        add("liner-" + w, arc_band(cx, cy, cz, WELL_R - 0.025, WELL_R - 0.01, s * (WELL_X - 0.01), s * 0.86),
            TRIM, "trim", **M_TRIM)
    # seam grooves: dark strips in the panel gaps, 12 mm above the body, below the panel faces
    for nm, z0, z1 in (("seam-a", 0.925, 0.955), ("seam-b", -0.015, 0.015), ("seam-c", -0.955, -0.925)):
        lr(nm, side_pair(body_sec, NB, z0, z1, -0.55, 0.85, -0.03, 0.042, 3, 16), TRIM, "trim", **M_TRIM)
    lr("seam-hood", t_pair(body_sec, 1.02, 1.90, 0.338, 0.366, -0.03, 0.042, 16, 3), TRIM, "trim", **M_TRIM)
    add("cowl", patch(body_sec, 0.96, 1.015, TOP - 1.1, TOP + 1.1, 0.0, 0.03, 4, 24), TRIM, "trim", **M_TRIM)
    fuel = patch(body_sec, -1.45, -1.30, frac_t(0.56, NB), frac_t(0.74, NB), -0.005, 0.035, 6, 6)
    add("fuel-door", fuel, PAINT_D, "paint", **M_PAINT)

    # ---- glass, pillars, window trims, roof
    add("windshield", patch(cab_sec, 0.30, 1.00, TOP - 0.95, TOP + 0.95, -0.02, 0.035, 14, 20), GLASS, "glass",
        **M_GLASS)
    add("rear-glass", patch(cab_sec, -1.95, -1.76, TOP - 0.95, TOP + 0.95, -0.02, 0.035, 8, 20), GLASS, "glass",
        **M_GLASS)
    wins = (("f", 0.08, 0.86), ("r", -1.15, -0.08), ("q", -1.58, -1.22))
    for tag, z0, z1 in wins:
        lr("win-" + tag, side_pair(cab_sec, NC, z0, z1, -0.45, 0.72, -0.02, 0.035, 12, 10), GLASS, "glass",
           **M_GLASS)
        lr("trim-" + tag, side_pair(cab_sec, NC, z0, min(z1, 0.80), -0.58, -0.47, -0.02, 0.035, 12, 2), CHROME, "chrome",
           **M_CHROME)
    lr("pillar-a", side_pair(cab_sec, NC, 0.875, 1.0, -0.45, 0.72, -0.02, 0.035, 6, 10), TRIM, "gloss",
       roughness=0.3)
    lr("pillar-b", side_pair(cab_sec, NC, -0.075, 0.075, -0.45, 0.72, -0.02, 0.035, 4, 10), TRIM, "gloss",
       roughness=0.3)
    cl, cr = side_pair(cab_sec, NC, -1.205, -1.165, -0.45, 0.72, -0.02, 0.035, 3, 10)
    cl2, cr2 = side_pair(cab_sec, NC, -1.90, -1.60, -0.45, 0.72, -0.02, 0.035, 8, 10)
    lr("pillar-c", (P.merge(cl, cl2), P.merge(cr, cr2)), PAINT, "paint", **M_PAINT)
    lr("rail", t_pair(cab_sec, -1.25, 0.25, frac_t(0.88, NC), frac_t(0.93, NC), -0.01, 0.045, 24, 4), TRIM,
       "trim", roughness=0.5, metalness=0.3)
    fin = P.prism(np.array([(-0.10, 0.0), (0.09, 0.0), (0.06, 0.03), (-0.07, 0.065), (-0.10, 0.06)]), 0.03, 0.008)
    add("antenna", P.xf(fin, t=(0, cab_top(-1.05) - 0.012, -1.05)), PAINT_D, "paint", **M_PAINT)

    # ---- wipers (arms ride 1.2+ cm above the blades)
    for side, x in (("l", -0.36), ("r", 0.14)):
        z, y = 0.955, cab_top(0.955) + 0.03
        add("wiper-blade-" + side, P.xf(P.rbox((0.50, 0.016, 0.024), 0.006, 2), r=(0, 8, 0), t=(x + 0.25, y, z)),
            TRIM, "trim", **M_TRIM)
        arm = P.merge(P.rbox((0.48, 0.012, 0.016), 0.005, 2),
                      P.xf(P.lathe([(0, -0.02), (0.018, -0.02), (0.018, 0.01), (0, 0.012)], 12, False), t=(-0.24, -0.01, 0)))
        add("wiper-arm-" + side, P.xf(arm, r=(0, 12, 0), t=(x + 0.25, y + 0.028, z + 0.01)), TRIM, "trim", **M_TRIM)
    zr = -1.875
    yr = cab_top(zr)
    nrm = np.array([0, 0.62, -0.78])
    c = np.array([0, yr, zr]) + nrm * 0.035
    rw = P.merge(P.rbox((0.42, 0.016, 0.022), 0.006, 2),
                 P.xf(P.rbox((0.30, 0.010, 0.014), 0.004, 2), t=(0.05, 0.014, 0)),
                 P.xf(P.lathe([(0, -0.03), (0.02, -0.03), (0.02, 0.022), (0, 0.025)], 12, False), t=(-0.15, 0, 0)))
    add("wiper-rear", place(rw, c, nrm), TRIM, "trim", **M_TRIM)

    # ---- front fascia (cap face at z = 2.15)
    add("grille-upper", slab_z(0.30, 0.045, 0.02, 0, 0.565, 2.15), TRIM, "grille", roughness=0.5)
    for k, x in enumerate((-0.23, -0.15, -0.07, 0.07, 0.15, 0.23)):
        add("grille-bar-%d" % (k + 1), slab_z(0.007, 0.04, 0.035, x, 0.565, 2.15), CHROME, "chrome", **M_CHROME)
    add("badge-f", badge(0.565, 2.15), CHROME, "chrome", **M_CHROME)
    add("grille-lower", slab_z(0.34, 0.04, 0.035, 0, 0.33, 2.13), TRIM, "grille", roughness=0.6)
    add("plate-recess-f", slab_z(0.28, 0.06, 0.012, 0, 0.455, 2.15), TRIM, "trim", **M_TRIM)
    add("plate-f", slab_z(0.26, 0.055, 0.028, 0, 0.455, 2.15), PLATE, "plate", roughness=0.5)
    for side, x in (("l", -0.40), ("r", 0.40)):
        add("fog-bezel-" + side, slab_z(0.075, 0.04, 0.015, x, 0.43, 2.15), TRIM, "gloss", roughness=0.3)
        add("fog-" + side, P.xf(disc_y(0.03, -0.03, 0.03, 24), r=(90, 0, 0), t=(x, 0.43, 2.15)), LENS, "lens",
            roughness=0.1)
    # headlights: housing frame, lens, 2 projectors, emissive DRL strip
    lr("head-housing", side_pair(body_sec, NB, 1.89, 2.13, 0.25, 0.62, -0.04, 0.05, 8, 10), TRIM, "gloss",
       roughness=0.3)
    lr("head-lens", side_pair(body_sec, NB, 1.91, 2.11, 0.30, 0.58, -0.02, 0.045, 8, 10), LENS, "lens",
       roughness=0.1, metalness=0.1)
    lr("drl", side_pair(body_sec, NB, 1.92, 2.10, 0.255, 0.29, -0.03, 0.055, 8, 3), "#F4F8FF", "lens",
       roughness=0.1, emissive="#DDEBFF", emissiveIntensity=1.2)
    proj = P.merge(P.lathe([(0, -0.03), (0.032, -0.03), (0.032, 0.040), (0.028, 0.045), (0.022, 0.045),
                            (0.020, 0.040), (0, 0.042)], 24, False))
    for k, z in enumerate((2.06, 1.97)):
        pt, N = sframe(body_sec, NB, z, 0.44)
        pr = place(proj, pt, N)
        add("proj-%d-r" % (k + 1), pr, "#D8DEE4", "chrome", **M_CHROME)
        add("proj-%d-l" % (k + 1), mirror_x(pr), "#D8DEE4", "chrome", **M_CHROME)
    lr("indicator", side_pair(body_sec, NB, 1.75, 1.82, 0.30, 0.38, -0.02, 0.045, 4, 4), AMBER, "amber",
       roughness=0.2, emissive=AMBER, emissiveIntensity=0.3)

    # ---- rear fascia (cap face at z = -2.15)
    lr("tail", side_pair(body_sec, NB, -2.12, -1.95, 0.35, 0.86, -0.02, 0.035, 8, 10), TAIL, "tail",
       roughness=0.2, emissive=TAIL, emissiveIntensity=0.25)
    for side, s in (("l", -1), ("r", 1)):
        last = p[-2 if side == "l" else -1]
        last["mesh"] = H.fuv(P.merge(last["mesh"], slab_z(0.12, 0.06, 0.015, s * 0.44, 0.70, -2.15, -1)))
    for side, s in (("l", -1), ("r", 1)):
        add("amber-" + side, slab_z(0.05, 0.025, 0.03, s * 0.46, 0.70, -2.15, -1), AMBER, "amber",
            roughness=0.2, emissive=AMBER, emissiveIntensity=0.2)
    add("third-brake", P.rbox((0.30, 0.03, 0.05), 0.008, 2), TAIL, "tail", roughness=0.2, emissive=TAIL,
        emissiveIntensity=0.5)
    p[-1]["mesh"] = H.fuv(P.xf(P.rbox((0.30, 0.03, 0.05), 0.008, 2), t=(0, cab_top(-1.775) + 0.035, -1.775)))
    add("plate-recess-r", slab_z(0.28, 0.06, 0.012, 0, 0.58, -2.15, -1), TRIM, "trim", **M_TRIM)
    add("plate-r", slab_z(0.26, 0.055, 0.028, 0, 0.58, -2.15, -1), PLATE, "plate", roughness=0.5)
    add("plate-light", slab_z(0.04, 0.008, 0.015, 0, 0.655, -2.15, -1, 1), LENS, "lens", roughness=0.1,
        emissive="#FFFFFF", emissiveIntensity=0.4)
    add("badge-r", badge(0.73, -2.15, -1), CHROME, "chrome", **M_CHROME)
    add("tow-cover", slab_z(0.03, 0.02, 0.015, -0.40, 0.44, -2.15, -1), TRIM, "dust", **M_TRIM)

    # ---- mirrors: housing, glass, arm
    for side, s in (("l", -1), ("r", 1)):
        add("mirror-housing-" + side, P.xf(P.rbox((0.16, 0.12, 0.10), 0.03, 2), t=(s * 0.90, 1.04, 0.84)),
            PAINT, "paint", **M_PAINT)
        add("mirror-glass-" + side, P.xf(P.rbox((0.13, 0.09, 0.02), 0.008, 2), t=(s * 0.905, 1.04, 0.785)),
            CHROME, "chrome", **M_CHROME)
        add("mirror-arm-" + side, P.xf(P.rbox((0.10, 0.04, 0.06), 0.012, 2), t=(s * 0.80, 1.00, 0.86)),
            TRIM, "trim", **M_TRIM)
    # door handles
    y0, y1, hw = body_dims(0.5)
    fy = (0.86 - (y0 + y1) / 2) / ((y1 - y0) / 2)
    hx = body_sec(0.5, np.array([frac_t(fy, NB)]))[0][0] + 0.03
    for tag, z in (("f", 0.55), ("r", -0.38)):
        for side, s in (("l", -1), ("r", 1)):
            add("handle-%s%s" % (tag, side), P.xf(P.rbox((0.03, 0.028, 0.17), 0.012, 2), t=(s * hx, 0.86, z)),
                CHROME, "chrome", **M_CHROME)

    # ---- underbody
    add("tray", P.rbox((1.20, 0.02, 2.30), 0.008, 2), TRIM, "dust", **M_TRIM)
    p[-1]["mesh"] = H.fuv(P.xf(P.rbox((1.20, 0.03, 2.30), 0.008, 2), t=(0, 0.16, 0)))
    add("diffuser", patch(body_sec, -2.12, -1.86, 1.5 * math.pi - 0.45, 1.5 * math.pi + 0.45, -0.07, 0.12, 8, 16),
        TRIM, "trim", roughness=0.6)
    for k, x in enumerate((-0.27, -0.09, 0.09, 0.27)):
        add("fin-%d" % (k + 1), P.xf(P.rbox((0.012, 0.06, 0.24), 0.004, 2), t=(x, 0.24, -2.0)), TRIM, "trim",
            roughness=0.6)
    add("exhaust", P.xf(P.merge(tube(0.03, 0.038, 0.20, 24), tube(0.038, 0.042, 0.02, 24)), r=(90, 0, 0),
                        t=(0.45, 0.28, -2.20)), CHROME, "chrome", **M_CHROME)
    for (cx, cy, cz), w in zip(WHEELS, WTAGS):
        s = np.sign(cx)
        add("strut-" + w, P.xf(disc_y(0.025, 0.0, 0.42, 16), t=(s * 0.56, 0.36, cz)), DISC, "disc", roughness=0.5,
            metalness=0.7)
        add("spring-" + w, spring(cx, cz, 0.50, 0.74), "#3A4048", "trim", roughness=0.5, metalness=0.5)

    # ---- wheels
    for w, tag in zip(WHEELS, WTAGS):
        add("tyre-" + tag, at_wheel(tyre(), w), RUBBER, "rubber", roughness=0.9)
        add("ring-" + tag, at_wheel(tyre_ring(), w), "#353535", "rubber", roughness=0.85)
        add("rim-" + tag, at_wheel(rim(), w), RIM, "rim", roughness=0.3, metalness=0.7)
        for k in range(5):
            add("lug-%s-%d" % (tag, k + 1), at_wheel(lug(k), w), CHROME, "chrome", **M_CHROME)
        add("cap-" + tag, at_wheel(disc_y(0.035, 0.088, 0.110, 24), w), "#2A2A2A", "gloss", roughness=0.3,
            metalness=0.4)
        add("valve-" + tag, at_wheel(valve(), w), RUBBER, "rubber", roughness=0.9)
        add("disc-" + tag, at_wheel(vented_disc(), w), DISC, "disc", roughness=0.5, metalness=0.7)
        add("caliper-" + tag, at_wheel(caliper(tag[0] == "f"), w), CALIPER, "caliper", roughness=0.5,
            metalness=0.3)

    return p, {
        "paint": tex("noise", [PAINT, PAINT_D, "#3A7AC2"], 0.6, detail=0.15),
        "trim": tex("noise", [TRIM, "#222222", "#343434"], 0.4, detail=0.3),
        "dust": tex("noise", [TRIM, "#4A4640", "#6B655B"], 0.25, detail=0.7),      # dusty sills + lower bumper
        "gloss": tex("noise", [TRIM, "#1A1A1A", "#3C3C3C"], 0.8, detail=0.1),
        "glass": tex("noise", [GLASS, "#16202A", "#2C3A47"], 0.8, detail=0.2),
        "lens": tex("gradient", [LENS, "#C9D3DA", "#FFFFFF"], 0.3),
        "tail": tex("stripes", [TAIL, "#8A0F13", "#D02A2E"], 0.1),
        "amber": tex("stripes", [AMBER, "#B86A10", "#F4A640"], 0.08),
        "grille": tex("grid", [TRIM, "#121212", "#3A3A3A"], 0.05),
        "plate": tex("noise", [PLATE, "#E2E2E2"], 0.3, detail=0.1),
        "chrome": tex("brushed", [CHROME, "#9DA2A8", "#E4E7EA"], 0.5),
        "rubber": tex("grip", [RUBBER, "#2E2E2E", "#454545"], 0.2),
        "rim": tex("brushed", [RIM, "#7E7A74", "#C4C8CC"], 0.4),                 # brake dust in the dark tone
        "disc": tex("brushed", [DISC, "#5E5E5E", "#8A8A8A"], 0.2),
        "caliper": tex("noise", [CALIPER, "#901818", "#C43030"], 0.3, detail=0.2),
    }


def add_groups(out):
    """Rewrite OUT/NAME.json with the parent tree Car > Body, Glass, Lights, Mirrors, Wheels{..}, Underbody."""
    path = os.path.join(out, NAME + ".json")
    d = json.load(open(path))
    root = d["root"]
    objs = {root: d["objects"][root]}
    for g, title, parent in GROUPS:
        objs[NAME + "-g-" + g] = {"type": "group", "name": title, "parent": NAME + "-g-" + parent if parent else root,
                                  "pos": [0, 0, 0], "rot": [0, 0, 0], "scale": [1, 1, 1]}
    for k, o in d["objects"].items():
        if k == root:
            continue
        o["parent"] = NAME + "-g-" + group_of(k)
        objs[k] = o
    d["objects"] = objs
    json.dump(d, open(path, "w"), separators=(",", ":"))
    return d


def live(out, d):
    t = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    root = d["root"]
    os.makedirs(os.path.join(out, "live"), exist_ok=True)
    groups = [k for k in d["objects"] if k.startswith(NAME + "-g-")]
    stages = [[], [], []]
    for k in d["objects"]:
        if k == root or k in groups:
            continue
        stages[STAGE_OF.get(group_of(k), 2)].append(k)
    objs = {root: d["objects"][root]}
    objs.update({k: d["objects"][k] for k in groups})
    for i, ids in enumerate(stages):
        objs.update({k: d["objects"][k] for k in ids})
        doc = {"name": TITLE, "v": 1, "updated": t, "objects": dict(objs), "textures": d["textures"], "anims": {},
               "camera": {"pos": [6, 3, 7], "target": [0, 0.7, 0], "fov": 50, "ortho": False}}
        json.dump(doc, open(os.path.join(out, "live", "p%d.json" % (i + 1)), "w"), separators=(",", ":"))
        json.dump({"name": TITLE, "updated": t, "count": len(objs) - 1 - len(groups), "ai": True,
                   "building": i < len(stages) - 1},
                  open(os.path.join(out, "live", "m%d.json" % (i + 1)), "w"), separators=(",", ":"))
    missing = set(d["objects"]) - set(objs)
    assert not missing, "parts not in any stage: %s" % sorted(missing)
    return os.path.join(out, "live", "p%d.json" % len(stages))


def main(argv=None):
    a = sys.argv[1:] if argv is None else argv
    if not a:
        sys.exit(__doc__)
    out = a[0]
    os.makedirs(out, exist_ok=True)
    here = os.path.dirname(os.path.abspath(__file__))
    # owner rule: no detail limit; fit_parts splits any mesh over 19k tris, so no total cap here
    rc = P.run(out, [NAME], 7, "--check" in a, False, "toon", tri_cap=None)
    proj = live(out, add_groups(out))
    # panel inner faces sit inside the body: cut those hidden faces (ids kept) so the phone depth check passes
    fx = os.path.join(out, "fix")
    rc |= subprocess.call([sys.executable, os.path.join(here, "..", "..", "zfight", "zfight.py"), "fix", proj,
                           os.path.join(out, "geo"), fx, "--prop"], stdout=subprocess.DEVNULL)
    for f in os.listdir(os.path.join(fx, "geo")):
        if f in (NAME + "-body.json", NAME + "-cabin.json"):
            continue  # cut smooth lofts lose their box UVs (rendered white, 2026-11-23); the panels' cuts suffice
        os.replace(os.path.join(fx, "geo", f), os.path.join(out, "geo", f))
    if "--check" in a:
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "..", "detail", "detail.py"), "check",
                               os.path.join(out, NAME + ".json"), os.path.join(out, "geo"), "--class", "hero"])
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "..", "zfight", "zfight.py"), "check",
                               proj, os.path.join(out, "geo"), "--prop"])
        rc |= bounds_check(out)
    return rc


def bounds_check(out, want=(1.80, 1.45, 4.30), tol=0.10):
    gdir = os.path.join(out, "geo")
    v = np.concatenate([np.array(json.load(open(os.path.join(gdir, f)))["verts"], float).reshape(-1, 3)
                        for f in os.listdir(gdir)])
    size = v.max(0) - v.min(0)
    ok = all(abs(s - w) <= tol * w for s, w in zip(size, want))
    print("%s bounds %.2f x %.2f x %.2f m (want %s within %d%%)" % ("PASS" if ok else "FAIL", *size,
                                                                   " x ".join(map(str, want)), tol * 100))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
