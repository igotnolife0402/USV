#!/usr/bin/env python3
"""Realistic two-storey brick + siding house (1 unit = 1 m), textured studio meshes, numpy only.

python3 house.py OUT [--check] [--preview]
8 x 6 m footprint (front +Z), stone plinth, brick ground floor, painted lap siding upper floor, 35 deg gable roof of
stepped shingle courses, chimney, gutters, 6-over-6 sash windows, panelled oak door, canopy, stone steps.
Writes OUT/geo/*.json, OUT/house.json, OUT/live/p<i>.json + m<i>.json (Umbrio stages: shell, roof, details).
--check: mesh check, detail floor (--class prop), attach (one piece), building z-fight. Exit 0 = all pass.
Every face layer is built edge to edge (walls split around openings, frames inside openings, no stacked trim),
so the 12 cm building z-fight band passes without `fix`.
"""
# @style: realistic
# @model: house | Realistic two-storey brick and siding house, 8 x 6 m footprint
# @run: python3 house.py OUT --check
import json
import math
import os
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P  # noqa: E402
import guns as G  # noqa: E402

NAME, TITLE, PID = "house", "House", "realistic-house"
A = math.radians(35)                     # roof pitch
HX, HZ, T = 4.0, 3.0, 0.25               # half footprint, wall thickness
Y_PL, Y_BR, Y_BD, Y_TOP = 0.45, 3.0, 3.18, 5.8   # plinth top, brick top, band top, wall plate
OVER, RX = 0.45, 4.35                    # eave overhang, roof half length
SH_B, SH_T, EXP = 0.17, 0.14, 0.2        # shingle course thickness at butt / top, exposure

BRICK, MORTAR, SIDING, TRIM = "#8E4A34", "#BDB5A6", "#D8D3C6", "#EEECE6"
STONE, SHING, OAK, METAL = "#8C877E", "#3A3C40", "#6B4A2E", "#5F6469"
STAGES = [  # Umbrio live build: part ids per stage
    ["plinth", "brick-front", "brick-back", "brick-left", "brick-right", "band",
     "siding-front", "siding-back", "siding-left", "siding-right", "gable-left", "gable-right"],
    ["roof-front", "roof-back", "ridge", "fascia", "barge", "soffit", "gutter", "downspout", "straps",
     "chimney", "chimney-cap", "flue-pots"],
    ["sills", "lintels", "frames-ground", "frames-upper", "sashes-ground", "sashes-upper", "glass-ground",
     "glass-upper", "door-frame", "door-leaf", "door-panels", "door-knob", "steps", "canopy-roof", "canopy-brackets"],
]


def box(x0, x1, y0, y1, z0, z1):
    v = [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    f = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]
    return P.orient(P.Mesh(v, f))


def fuv(m):
    """Split vertices per face; uv (metres) from the face's dominant normal axis, so textures keep real scale."""
    V, F, U = [], [], []
    for f in m.f:
        p = m.v[f]
        n = np.cross(p[1] - p[0], p[2] - p[0])
        ax = int(np.argmax(np.abs(n)))
        a, b = [(2, 1), (0, 2), (0, 1)][ax]
        F.append(list(range(len(V), len(V) + len(f))))
        V.extend(p)
        U.extend(p[:, [a, b]])
    return P.Mesh(V, F, U)


def ry(m, ang):
    return P.xf(m, r=(0, ang, 0))


def wall(L, y0, y1, w0, w1, ops):
    """Wall along local x (u) with rectangular openings (cu, width, ya, yb): panels edge to edge, no overlap."""
    ops = sorted(ops)
    out, u = [], -L / 2
    for cu, w, ya, yb in ops:
        a, b = cu - w / 2, cu + w / 2
        out.append(box(u, a, y0, y1, w0, w1))
        if ya > y0:
            out.append(box(a, b, y0, ya, w0, w1))
        if yb < y1:
            out.append(box(a, b, yb, y1, w0, w1))
        u = b
    out.append(box(u, L / 2, y0, y1, w0, w1))
    return P.merge(*out)


def bars(x0, x1, y0, y1, w, z0, z1, hs=(), vs=(), mw=0.022):
    """Rectangular frame of bar width w with horizontal bars at hs and vertical muntins at vs, no overlaps."""
    out = [box(x0, x0 + w, y0, y1, z0, z1), box(x1 - w, x1, y0, y1, z0, z1)]
    ys = [y0] + sorted(hs) + [y1]
    rails = [(y0, y0 + w)] + [(h - mw / 2 - (0.015 if i else 0), h + mw / 2 + (0.015 if i else 0))
                              for i, h in enumerate(hs)] + [(y1 - w, y1)]
    rails = [(a, b) for a, b in rails]
    for a, b in rails:
        out.append(box(x0 + w, x1 - w, a, b, z0, z1))
    rails.sort()
    for (_, top), (bot, _) in zip(rails, rails[1:]):
        for v in vs:
            out.append(box(v - mw / 2, v + mw / 2, top, bot, z0, z1))
    del ys
    return P.merge(*out)


def window(cu, w, ya, yb, wo, lintel):
    """Sash window in a wall opening (local coords, outside face at z = wo). Returns dict of part meshes."""
    a, b = cu - w / 2, cu + w / 2
    top = yb - 0.15 if lintel else yb
    fw, sw = 0.07, 0.05
    d = {"sill": box(a, b, ya, ya + 0.06, wo - T + 0.05, wo + 0.06),
         "frame": P.merge(box(a, a + fw, ya + 0.06, top, wo - 0.16, wo - 0.04),
                          box(b - fw, b, ya + 0.06, top, wo - 0.16, wo - 0.04),
                          box(a + fw, b - fw, top - fw, top, wo - 0.16, wo - 0.04),
                          box(a + fw, b - fw, ya + 0.06, ya + 0.06 + fw, wo - 0.16, wo - 0.04))}
    x0, x1, y0, y1 = a + fw, b - fw, ya + 0.06 + fw, top - fw
    mid = (y0 + y1) / 2
    cols = [x0 + (x1 - x0) * k / 3 for k in (1, 2)] if w > 0.8 else [(x0 + x1) / 2]
    d["sash"] = bars(x0, x1, y0, y1, sw, wo - 0.13, wo - 0.07, hs=[(y0 + mid) / 2, mid, (mid + y1) / 2], vs=cols)
    d["glass"] = box(x0 + 0.01, x1 - 0.01, y0 + 0.01, y1 - 0.01, wo - 0.104, wo - 0.096)
    if lintel:
        d["lintel"] = box(a, b, top, yb, wo - T, wo + 0.02)
    return d


# walls: (name, rotation, half length, outside offset)
SIDES = [("front", 0, HX - T, HZ), ("back", 180, HX - T, HZ), ("right", 90, HZ, HX), ("left", -90, HZ, HX)]
GROUND = {"front": [(-2.5, 1.2, 1.15, 2.75), (2.5, 1.2, 1.15, 2.75)], "back": [(-2.2, 1.2, 1.15, 2.75),
          (2.2, 1.2, 1.15, 2.75), (0.0, 0.7, 1.6, 2.75)], "right": [(-0.8, 1.0, 1.15, 2.75)], "left": [(-1.8, 1.0, 1.15, 2.75)]}
UPPER = {"front": [(-2.5, 1.1, 3.75, 5.15), (0.0, 1.1, 3.75, 5.15), (2.5, 1.1, 3.75, 5.15)],
         "back": [(-2.2, 1.1, 3.75, 5.15), (2.2, 1.1, 3.75, 5.15)],
         "right": [(0.0, 0.9, 3.85, 5.05)], "left": [(0.0, 0.9, 3.85, 5.05)]}
DOOR = (0.0, 1.0, Y_PL, 2.75)
F0, F1 = Y_PL + 0.02, Y_BD + 0.02          # finished floor tops (oak boards)
SX0, SX1, SZ0, SZ1 = -HX + T, -2.85, -0.9, 2.6   # stairwell (runs along the left wall, rising toward -z)
NR, GO = 15, 0.25                          # risers, going
RISE = (F1 - F0) / NR


def interior():
    """Plaster linings, oak floors, ceiling, upstairs partition + doorway, stair with rails (finished interior)."""
    p, I = [], HX - T
    pl = {"ground": [], "upper": []}
    for key, table, y0, y1 in (("ground", GROUND, F0, Y_BR), ("upper", UPPER, F1, Y_TOP)):
        for n, ang, L, wo in SIDES:
            ops = table[n] + ([DOOR] if n == "front" and key == "ground" else [])
            Ln = 2 * (L - 0.02) if n in ("front", "back") else 2 * (HZ - T)
            pl[key].append(ry(wall(Ln, y0, y1, wo - T - 0.02, wo - T, ops), ang))
    p.append(mk("plaster-ground", P.merge(*pl["ground"]), "#EDE9E1", "plaster", roughness=0.9))
    p.append(mk("plaster-upper", P.merge(*pl["upper"]), "#EDE9E1", "plaster", roughness=0.9))
    p.append(mk("ceiling", box(-I, I, Y_TOP, Y_TOP + 0.06, -HZ + T, HZ - T), "#F3F1EC", "plaster", roughness=0.9))
    i2, zi = I - 0.02, HZ - T - 0.02
    p.append(mk("floor-ground", box(-i2, i2, Y_PL, F0, -zi, zi), "#A07850", "floor", roughness=0.55))
    p.append(mk("floor-upper", P.merge(box(SX1, 0.75, Y_BD, F1, -zi, zi), box(-i2, SX1, Y_BD, F1, -zi, SZ0),
                                       box(-i2, SX1, Y_BD, F1, SZ1, zi)), "#A07850", "floor", roughness=0.55))
    # partition x 0.75..0.85 with a doorway z 1.6..2.5, door leaf swung open into the bedroom
    p.append(mk("partition", ry(wall(2 * zi, F1, Y_TOP, 0.75, 0.85, [(-2.05, 0.9, F1, F1 + 2.05)]), 90),
                "#EDE9E1", "plaster", roughness=0.9))
    p.append(mk("int-door-frame", P.merge(box(0.74, 0.86, F1, F1 + 2.05, 1.6, 1.66), box(0.74, 0.86, F1, F1 + 2.05, 2.44, 2.5),
                                          box(0.74, 0.86, F1 + 1.99, F1 + 2.05, 1.66, 2.44)), TRIM, "trim", roughness=0.45))
    p.append(mk("int-door", box(-0.04, 0.73, F1 + 0.01, F1 + 1.98, 2.39, 2.43), "#E9E7E2", "trim", roughness=0.45))
    knob = P.lathe([(0, 0), (0.03, 0), (0.03, 0.008), (0.01, 0.012), (0.009, 0.035), (0.026, 0.045), (0.025, 0.06), (0, 0.065)], 16, False)
    p.append(P.part("int-door-knob", P.merge(P.xf(knob, r=(-90, 0, 0), t=(0.05, F1 + 1.0, 2.43)),
                                             P.xf(knob, r=(90, 0, 0), t=(0.05, F1 + 1.0, 2.39))),
                    "#B08D57", smooth=True, metalness=0.85, roughness=0.3))
    # stair: solid painted steps, oak treads with nosing, stringer, newels, handrail, balusters; guard upstairs
    x0, x1 = -i2, SX1 - 0.02
    steps, treads, bal = [], [], []
    for i in range(NR - 1):
        zf, zb, top = SZ1 - i * GO, SZ1 - (i + 1) * GO, F0 + (i + 1) * RISE
        steps.append(box(x0, x1, F0, top - 0.03, zb, zf))
        treads.append(box(x0, x1 + 0.01, top - 0.03, top, zb, zf + 0.025))
    p.append(mk("stair-steps", P.merge(*steps), "#E9E7E2", "trim", roughness=0.5))
    p.append(mk("stair-treads", P.merge(*treads), "#8A6440", "oak", roughness=0.5))
    k = RISE / GO

    def yt(z):
        return F0 + RISE + (SZ1 - z) * k + 0.06
    q = [(SZ1, yt(SZ1)), (SZ1, yt(SZ1) - 0.32), (SZ0, yt(SZ0) - 0.32), (SZ0, yt(SZ0))]
    if sum(q[i][0] * q[i - 1][1] - q[i - 1][0] * q[i][1] for i in range(4)) < 0:
        q = q[::-1]
    p.append(mk("stair-stringer", P.xf(P.prism(q, 0.02, 0.004), t=(SX1, 0, 0)), "#E9E7E2", "trim", roughness=0.5))
    xr, rh = SX1, 0.9
    newel = [box(xr - 0.045, xr + 0.045, F0, F0 + 1.05, SZ1 - 0.12, SZ1 - 0.03)]
    rail = [cyl((xr, yt(SZ1 - 0.08) + rh - 0.06, SZ1 - 0.08), (xr, yt(0.2) + rh - 0.06, 0.2), 0.03, 12)]
    for i in range(NR - 2):
        zc = SZ1 - (i + 0.5) * GO - 0.15
        if zc < 0.25:
            break
        top = F0 + (i + 1) * RISE
        bal.append(box(xr - 0.015, xr + 0.015, top, yt(zc) + rh - 0.08, zc - 0.015, zc + 0.015))
    # upstairs guard along the stairwell edge x = SX1 (z 0.2..SZ1) and z = SZ1 (x -I..SX1)
    gy = F1 + 0.95
    newel += [box(xr - 0.045, xr + 0.045, F1, gy + 0.05, SZ1 - 0.045, SZ1 + 0.045),
              box(xr - 0.045, xr + 0.045, yt(0.2) - 0.3, gy + 0.05, 0.155, 0.245)]
    rail += [cyl((xr, gy, 0.245), (xr, gy, SZ1 - 0.045), 0.03, 12), cyl((xr - 0.045, gy, SZ1), (-i2, gy, SZ1), 0.03, 12)]
    for zc in np.arange(0.4, SZ1 - 0.1, 0.13):
        bal.append(box(xr - 0.015, xr + 0.015, F1, gy - 0.02, zc - 0.015, zc + 0.015))
    for xc in np.arange(SX1 - 0.15, -i2 + 0.05, -0.13):
        bal.append(box(xc - 0.015, xc + 0.015, F1, gy - 0.02, SZ1 - 0.015, SZ1 + 0.015))
    p.append(mk("stair-newels", P.merge(*newel), "#8A6440", "oak", roughness=0.5))
    p.append(mk("stair-rails", P.merge(*rail), "#8A6440", "oak", roughness=0.45))
    p.append(mk("stair-balusters", P.merge(*bal), "#E9E7E2", "trim", roughness=0.5))
    return p


def deck_y(z):
    return Y_TOP + (HZ - abs(z)) * math.tan(A)


def slope_pt(s, o):
    """Front roof slope point (z, y): s along the slope from the wall line, o out along the normal from the deck."""
    return (HZ - s * math.cos(A) + o * math.sin(A), Y_TOP + s * math.sin(A) + o * math.cos(A))


def roof_side():
    s0, sr = -OVER / math.cos(A), HZ / math.cos(A)
    out, s = [], s0
    while s < sr - 1e-6:
        e = min(s + EXP, sr)
        last = e >= sr - 1e-6 or sr - e < 0.06
        if last:
            e = sr
            tz = 0.0
            ty = slope_pt((HZ + SH_T * math.sin(A)) / math.cos(A), SH_T)[1]
            q = [slope_pt(s, 0), (0.0, deck_y(0)), (tz, ty), slope_pt(s, SH_B)]
        else:
            q = [slope_pt(s, 0), slope_pt(e, 0), slope_pt(e, SH_T), slope_pt(s, SH_B)]
        if sum(q[i][0] * q[i - 1][1] - q[i - 1][0] * q[i][1] for i in range(4)) < 0:
            q = q[::-1]
        out.append(P.prism(q, RX, 0.01))
        s = e
    return P.merge(*out)


def cyl(p0, p1, r, seg=8):
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    L = np.linalg.norm(p1 - p0)
    m = P.lathe([(0, 0), (r, 0), (r, L), (0, L)], seg, False)
    d = (p1 - p0) / L
    y = np.array([0.0, 1.0, 0.0])
    k = np.cross(y, d)
    s, c = np.linalg.norm(k), float(y @ d)
    if s < 1e-9:
        R = np.eye(3) if c > 0 else np.diag([1.0, -1.0, -1.0])
    else:
        k /= s
        K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
        R = np.eye(3) + s * K + (1 - c) * K @ K
    m.v = m.v @ R.T + p0
    return P.orient(m)


def tex(pat, cols, sc, **kw):
    d = {"kind": "procedural", "pattern": pat, "colors": cols, "scale": sc, "detail": 0.6, "seed": 3}
    d.update(kw)
    return d


def mk(pid, mesh, color, t=None, **kw):
    if t:
        mesh = fuv(mesh)
        kw["texture"] = t
    return P.part(pid, mesh, color, smooth=False, **kw)


@P.prop(NAME, TITLE)
def house(rng):
    p, W = [], {}
    p.append(mk("plinth", box(-HX - 0.06, HX + 0.06, 0, Y_PL, -HZ - 0.06, HZ + 0.06), STONE, "stone", roughness=0.9))
    for n, ang, L, wo in SIDES:
        g = GROUND[n] + ([DOOR] if n == "front" else [])
        p.append(mk("brick-" + n, ry(wall(2 * L, Y_PL, Y_BR, wo - T, wo, g), ang), BRICK, "brick", roughness=0.85))
    bx, bz = HX + 0.05, HZ + 0.05   # floor band = upper floor slab, with the stairwell cut out
    p.append(mk("band", P.merge(box(-bx, SX0, Y_BR, Y_BD, -bz, bz), box(SX1, bx, Y_BR, Y_BD, -bz, bz),
                                box(SX0, SX1, Y_BR, Y_BD, -bz, SZ0), box(SX0, SX1, Y_BR, Y_BD, SZ1, bz)), TRIM, "trim", roughness=0.5))
    for n, ang, L, wo in SIDES:
        p.append(mk("siding-" + n, ry(wall(2 * L, Y_BD, Y_TOP, wo - T, wo, UPPER[n]), ang), SIDING, "siding", roughness=0.6))
    tri = [(-HZ, Y_TOP), (HZ, Y_TOP), (0.0, deck_y(0))]
    for n, sx in (("right", 1), ("left", -1)):
        p.append(mk("gable-" + n, P.xf(P.prism(tri[::-1] if sx < 0 else tri, T / 2, 0.004), t=(sx * (HX - T / 2), 0, 0)),
                    SIDING, "siding", roughness=0.6))
    # roof
    rf = roof_side()
    p.append(mk("roof-front", rf, SHING, "shingle", roughness=0.95))
    p.append(mk("roof-back", P.xf(rf, s=(1, 1, -1)), SHING, "shingle", roughness=0.95))
    yr = deck_y(0) + SH_T / math.cos(A)
    p.append(mk("ridge", G.tube(-RX - 0.15, RX + 0.15, yr - 0.03, [(0.13, 0), (0.13, 2 * RX + 0.3)], seg=12),
                SHING, "shingle", roughness=0.9))
    ye = deck_y(HZ + OVER)
    fas = box(-RX + 0.07, RX - 0.07, ye - 0.22, ye, HZ + OVER - 0.04, HZ + OVER)
    p.append(mk("fascia", P.merge(fas, P.xf(fas, s=(1, 1, -1))), TRIM, "trim", roughness=0.5))
    bq = [(HZ + OVER, ye), (0.0, deck_y(0)), (0.0, deck_y(0) - 0.22), (HZ + OVER, ye - 0.22)]
    bq = bq[::-1]  # CCW in (z, y)
    bf = P.prism(bq, 0.02, 0.004)
    barge = [P.xf(bf, t=(sx * (RX - 0.05), 0, 0)) for sx in (1, -1)]
    barge += [P.xf(m, s=(1, 1, -1)) for m in barge]
    p.append(mk("barge", P.merge(*barge), TRIM, "trim", roughness=0.5))
    sof = box(-HX, HX, ye - 0.24, ye - 0.22, HZ, HZ + OVER - 0.04)
    p.append(mk("soffit", P.merge(sof, P.xf(sof, s=(1, 1, -1))), TRIM, "trim", roughness=0.5))
    zf = HZ + OVER
    gq = [(zf, ye - 0.04), (zf, ye - 0.2), (zf + 0.06, ye - 0.23), (zf + 0.16, ye - 0.18), (zf + 0.18, ye - 0.04)]
    if sum(gq[i][0] * gq[i - 1][1] - gq[i - 1][0] * gq[i][1] for i in range(5)) < 0:
        gq = gq[::-1]
    gut = P.prism(gq, RX + 0.03, 0.01)
    p.append(mk("gutter", P.merge(gut, P.xf(gut, s=(1, 1, -1))), METAL, "metal", metalness=0.6, roughness=0.4))
    dz, yb_ = HZ + 0.1, ye - 0.22
    ds = []
    for sx in (1, -1):
        x = sx * (HX - 0.15)
        ds += [cyl((x, yb_ + 0.02, zf + 0.09), (x, yb_ - 0.35, dz), 0.04), cyl((x, yb_ - 0.35, dz), (x, 0.3, dz), 0.04),
               cyl((x, 0.3, dz), (x, 0.12, dz + 0.25), 0.04)]
    ds = [P.merge(*ds[i:i + 3]) for i in (0, 3)]
    dsp = P.merge(*ds)
    p.append(mk("downspout", P.merge(dsp, P.xf(dsp, s=(1, 1, -1))), METAL, "metal", metalness=0.6, roughness=0.4))
    st = [box(sx * (HX - 0.15) - 0.05, sx * (HX - 0.15) + 0.05, y, y + 0.03, HZ, dz + 0.045)
          for sx in (1, -1) for y in (1.0, 2.2, 3.6, 4.8)]
    st = P.merge(*st)
    p.append(mk("straps", P.merge(st, P.xf(st, s=(1, 1, -1))), METAL, "metal", metalness=0.6, roughness=0.4))
    p.append(mk("chimney", box(2.5, 3.2, 6.4, 9.0, -1.6, -0.9), BRICK, "brick", roughness=0.85))
    p.append(mk("chimney-cap", box(2.42, 3.28, 9.0, 9.1, -1.68, -0.82), STONE, "stone", roughness=0.9))
    pot = P.lathe([(0, 0), (0.1, 0), (0.1, 0.04), (0.085, 0.06), (0.085, 0.3), (0.095, 0.32), (0.095, 0.36),
                   (0.06, 0.36), (0.06, 0.12), (0, 0.12)], 16, False)
    p.append(mk("flue-pots", P.merge(P.xf(pot, t=(2.68, 9.1, -1.25)), P.xf(pot, t=(3.02, 9.1, -1.25))),
                "#9C5B3E", "clay", roughness=0.8))
    # windows
    for key, table, lintel in (("ground", GROUND, True), ("upper", UPPER, False)):
        for n, ang, L, wo in SIDES:
            for o in table[n]:
                for k, m in window(*o, wo, lintel).items():
                    W.setdefault((k, key), []).append(ry(m, ang))
    p.append(mk("sills", P.merge(*W[("sill", "ground")], *W[("sill", "upper")]), STONE, "stone", roughness=0.85))
    # door (opening x -0.5..0.5, y Y_PL..2.75, lintel 2.6..2.75)
    a, b, top, wo = -0.5, 0.5, 2.6, HZ
    lint = W[("lintel", "ground")] + [box(a, b, top, 2.75, wo - T, wo + 0.02)]
    p.append(mk("lintels", P.merge(*lint), STONE, "stone", roughness=0.85))
    for key in ("ground", "upper"):
        p.append(mk("frames-" + key, P.merge(*W[("frame", key)]), TRIM, "trim", roughness=0.45))
        p.append(mk("sashes-" + key, P.merge(*W[("sash", key)]), TRIM, "trim", roughness=0.45))
        p.append(P.part("glass-" + key, P.merge(*W[("glass", key)]), "#7E97A6", smooth=False, transparency=0.55,
                        roughness=0.05, metalness=0.1))
    fw = 0.08
    p.append(mk("door-frame", P.merge(box(a, a + fw, Y_PL, top, wo - 0.17, wo - 0.01), box(b - fw, b, Y_PL, top, wo - 0.17, wo - 0.01),
                                      box(a + fw, b - fw, top - fw, top, wo - 0.17, wo - 0.01)), TRIM, "trim", roughness=0.45))
    x0, x1, y0, y1 = a + fw, b - fw, Y_PL + 0.01, top - fw
    zs, zp = (wo - 0.13, wo - 0.08), (wo - 0.115, wo - 0.095)
    st_, tr, lr, br, mm = 0.13, 0.13, 0.18, 0.22, 0.1
    yl = 1.35
    xm = (x0 + x1) / 2
    leaf = [box(x0, x0 + st_, y0, y1, *zs), box(x1 - st_, x1, y0, y1, *zs), box(x0 + st_, x1 - st_, y1 - tr, y1, *zs),
            box(x0 + st_, x1 - st_, yl - lr / 2, yl + lr / 2, *zs), box(x0 + st_, x1 - st_, y0, y0 + br, *zs),
            box(xm - mm / 2, xm + mm / 2, y0 + br, yl - lr / 2, *zs), box(xm - mm / 2, xm + mm / 2, yl + lr / 2, y1 - tr, *zs)]
    p.append(mk("door-leaf", P.merge(*leaf), OAK, "oak", roughness=0.5))
    pan = []
    for (pa, pb) in ((x0 + st_, xm - mm / 2), (xm + mm / 2, x1 - st_)):
        for (qa, qb) in ((y0 + br, yl - lr / 2), (yl + lr / 2, y1 - tr)):
            pan.append(P.xf(P.cbox((pb - pa, qb - qa, zp[1] - zp[0]), 0.008), t=((pa + pb) / 2, (qa + qb) / 2, sum(zp) / 2)))
    p.append(mk("door-panels", P.merge(*pan), OAK, "oak", roughness=0.5))
    knob = P.lathe([(0, 0), (0.035, 0), (0.035, 0.008), (0.012, 0.014), (0.01, 0.04), (0.028, 0.05), (0.03, 0.065),
                    (0.018, 0.078), (0, 0.08)], 16, False)
    p.append(P.part("door-knob", P.xf(knob, r=(-90, 0, 0), t=(x1 - st_ / 2, 1.05, zs[1])), "#C8A04A", smooth=True,
                    metalness=0.85, roughness=0.3))
    p.append(mk("steps", P.merge(box(-0.8, 0.8, 0, 0.225, HZ + 0.06, HZ + 0.62), box(-0.8, 0.8, 0.225, Y_PL, HZ + 0.06, HZ + 0.34)),
                STONE, "stone", roughness=0.9))
    # door canopy: gabled hood on two knee brackets
    ca, cw, ce, cd = math.radians(28), 0.85, 2.88, 0.75
    cr = ce + cw * math.tan(ca)
    half = [(-cw - 0.04, ce - 0.02), (0.0, cr - 0.02), (0.0, cr + 0.09), (-cw - 0.04, ce + 0.09)]
    hm = G.poly(half, cd)
    hm = P.xf(hm, t=(0, 0, wo + cd / 2))
    p.append(mk("canopy-roof", P.merge(hm, P.xf(hm, s=(-1, 1, 1))), SHING, "shingle", roughness=0.9))
    ybk = ce - 0.02 + (cw + 0.04 - 0.72) * math.tan(ca) + 0.02
    br_ = P.prism([(wo + 0.6, ybk), (wo, ybk), (wo, ybk - 0.55)], 0.04, 0.006)
    p.append(mk("canopy-brackets", P.merge(P.xf(br_, t=(0.72, 0, 0)), P.xf(br_, t=(-0.72, 0, 0))), OAK, "oak", roughness=0.6))
    p += interior()
    import house_a, house_b, house_c  # noqa: E401  furniture (crew-built): living/dining, kitchen/bath, bedroom
    for m in (house_a, house_b, house_c):
        p += m.build(sys.modules[__name__])
    return p, {"brick": tex("bricks", [BRICK, MORTAR], 0.43, count=2, aspect=1.65),
               "siding": tex("planks", [SIDING, "#B9B2A2"], 0.8, count=4, detail=0.3),
               "trim": tex("woodgrain", [TRIM, "#CFCBC2", "#FAFAF8"], 1.2, detail=0.25),
               "stone": tex("rock", [STONE, "#4A463F", "#C9C2B5"], 1.5),
               "shingle": tex("bricks", [SHING, "#1F2023"], 0.66, count=2, aspect=1.0),
               "metal": tex("brushed", [METAL, "#45494E", "#A9AEB3"], 1.0),
               "oak": tex("woodgrain", [OAK, "#4A311C", "#8A6440"], 0.9),
               "clay": tex("noise", ["#9C5B3E", "#7A4430"], 0.5),
               "plaster": tex("noise", ["#EDE9E1", "#DCD7CD"], 1.0, detail=0.2),
               "floor": tex("planks", ["#A07850", "#6E4E30"], 0.6, count=4),
               "fabric": tex("fabric", ["#6E7378", "#4E5257", "#8F949A"], 0.3),
               "linen": tex("fabric", ["#EFECE6", "#D8D3C9", "#FFFFFF"], 0.3, detail=0.2),
               "walnut": tex("woodgrain", ["#5A3D28", "#3A2618", "#7A5538"], 0.6),
               "marble": tex("marble", ["#E8E5DF", "#9A958E"], 0.8),
               "tile": tex("tiles", ["#E6E4DF", "#B5B0A8"], 1.2, count=4),
               "rug": tex("fabric", ["#8A5A44", "#5C3A2C", "#C9A27E"], 0.4)}


def live(out):
    t = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    d = json.load(open(os.path.join(out, NAME + ".json")))
    root = d["root"]
    os.makedirs(os.path.join(out, "live"), exist_ok=True)
    objs = {root: d["objects"][root]}
    for i, ids in enumerate(STAGES):
        for k in ids:
            objs[NAME + "-" + k] = d["objects"][NAME + "-" + k]
        doc = {"name": TITLE, "v": 1, "updated": t, "objects": dict(objs), "textures": d["textures"], "anims": {},
               "camera": {"pos": [11, 6, 13], "target": [0, 3.5, 0], "fov": 50, "ortho": False}}
        json.dump(doc, open(os.path.join(out, "live", "p%d.json" % (i + 1)), "w"), separators=(",", ":"))
        json.dump({"name": TITLE, "updated": t, "count": len(objs) - 1, "ai": True, "building": True},
                  open(os.path.join(out, "live", "m%d.json" % (i + 1)), "w"), separators=(",", ":"))
    rest = [k for k in d["objects"] if k not in objs]
    pres = [("plaster", "ceiling", "floor", "partition", "int-", "stair"), ("liv-", "din-", "kit-"), ("bath-", "bed-")]
    for i, pre in enumerate(pres, len(STAGES)):
        for k in rest:
            if k[len(NAME) + 1:].startswith(pre):
                objs[k] = d["objects"][k]
        doc = dict(doc, objects=dict(objs))
        json.dump(doc, open(os.path.join(out, "live", "p%d.json" % (i + 1)), "w"), separators=(",", ":"))
        json.dump({"name": TITLE, "updated": t, "count": len(objs) - 1, "ai": True, "building": i < len(STAGES) + 2},
                  open(os.path.join(out, "live", "m%d.json" % (i + 1)), "w"), separators=(",", ":"))
    missing = set(d["objects"]) - set(objs)
    assert not missing, "parts not in any stage: %s" % sorted(missing)
    return os.path.join(out, "live", "p%d.json" % (len(STAGES) + len(pres)))


def main(argv=None):
    a = sys.argv[1:] if argv is None else argv
    if not a:
        sys.exit(__doc__)
    out = a[0]
    os.makedirs(out, exist_ok=True)
    P.TRI_CAP = 60000  # whole furnished house, not a hand prop
    rc = P.run(out, [NAME], 7, "--check" in a, "--preview" in a, "toon")
    proj = live(out)
    here = os.path.dirname(os.path.abspath(__file__))
    # nested frames/sashes/reveals leave hidden same-facing faces < 12 cm apart: cut them (~2 s), keep ids (fresh tab)
    fx = os.path.join(out, "fix")
    rc |= subprocess.call([sys.executable, os.path.join(here, "..", "zfight", "zfight.py"), "fix", proj,
                           os.path.join(out, "geo"), fx], stdout=subprocess.DEVNULL)
    for f in os.listdir(os.path.join(fx, "geo")):
        os.replace(os.path.join(fx, "geo", f), os.path.join(out, "geo", f))
    if "--check" in a:
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "detail", "detail.py"), "check",
                               os.path.join(out, NAME + ".json"), os.path.join(out, "geo"), "--class", "prop"])
        rc |= G.attach(NAME)
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "zfight", "zfight.py"), "check",
                               proj, os.path.join(out, "geo")])
    return rc


if __name__ == "__main__":
    sys.exit(main())
