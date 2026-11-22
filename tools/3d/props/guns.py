#!/usr/bin/env python3
"""Three original voxel-style guns as textured studio meshes (many separate parts, chunky chamfered blocks, numpy only).

python3 guns.py OUT [--check]
Writes OUT/geo/*.json, OUT/<gun>.json, OUT/studio/{project,meta,uploads}.json + geo/ (all three stacked, one tab)
and OUT/live/p<i>.json + m<i>.json (Umbrio live build: stage i = guns 1..i).
--check runs every gate: mesh check, detail floor (--class prop), prop-scale z-fight. Exit 0 = all pass.
"""
import json
import math
import os
import shutil
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P  # noqa: E402

NAMES = ["plasma-pistol", "assault-rifle", "sniper-rifle"]
TITLES = {"plasma-pistol": "Plasma Pistol", "assault-rifle": "Assault Rifle", "sniper-rifle": "Sniper Rifle"}
STACK = 3.4  # studs between guns in the shared tab


def B(x0, x1, y0, y1, z0, z1, r=0.035):
    """Chamfered block from extents (studs)."""
    return P.xf(P.cbox((x1 - x0, y1 - y0, z1 - z0), r), t=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))


def S(x0, x1, y0, y1, w, r=0.035):
    """Block centred on z = 0, width w."""
    return B(x0, x1, y0, y1, -w / 2, w / 2, r)


def pair(x0, x1, y0, y1, zin, zout, r=0.02):
    """Proud detail on both sides (z from zin to zout and mirrored)."""
    return P.merge(B(x0, x1, y0, y1, zin, zout, r), B(x0, x1, y0, y1, -zout, -zin, r))


def poly(pts, w, ch=0.035):
    """Convex outline in the (x, y) plane, extruded across z (width w, centred)."""
    pts = [(x, y) for x, y in pts]
    a = sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts)))
    if a > 0:  # need CCW in prism's (z, y) frame, which mirrors x
        pts = pts[::-1]
    return P.xf(P.prism(pts, w / 2, ch), r=(0, 90, 0))


def side(pts, z, th=0.06):
    """Thin plate of outline pts on both sides, centred at +-z (grip panels, checkering)."""
    m = poly(pts, th, 0.012)
    return P.merge(P.xf(m, t=(0, 0, z)), P.xf(m, t=(0, 0, -z)))


def tube(x0, x1, yc, prof, seg=16, zc=0.0):
    """Lathe along +X: prof = [(r, t)] with t in studs from x0; 16-sided by default."""
    pts = [(0, 0)] + list(prof) + [(0, x1 - x0)]
    m = P.lathe(pts, seg, False)
    return P.xf(m, r=(0, 0, -90), t=(x0, yc, zc))


def screws(points, z, r=0.045):
    """Hex screw heads on both sides at (x, y)."""
    heads = []
    for x, y in points:
        h = P.lathe([(0, 0), (r, 0), (r, 0.03), (0, 0.04)], 6, False)
        heads += [P.xf(h, r=(90, 0, 0), t=(x, y, -z)), P.xf(h, r=(-90, 0, 0), t=(x, y, z))]
    return P.merge(*heads)


def row(fn, xs):
    return P.merge(*[fn(x) for x in xs])


def tex(pat, cols, sc):
    return {"kind": "procedural", "pattern": pat, "colors": cols, "scale": sc}


def mk(pid, mesh, color, t=None, **kw):
    if t:
        P.box_uv(mesh, 3)
        kw["texture"] = t
    return P.part(pid, mesh, color, smooth=False, **kw)


def glow(pid, mesh, color):
    return P.part(pid, mesh, color, smooth=False, emissive=color, emissiveIntensity=2.2, roughness=0.3)


STEEL, GUNM, DARK = "#AEB4BD", "#3B4049", "#1E2127"


@P.prop("plasma-pistol", "Plasma Pistol")
def pistol(rng):
    W = 0.62
    p = [
        mk("slide", S(0.6, 3.5, 1.72, 2.36, W), "#E9ECF0", "shell", roughness=0.45),
        mk("slide-top", S(1.0, 3.3, 2.36, 2.46, W - 0.24), "#D5DAE0", "shell", roughness=0.45),
        mk("serrations", row(lambda x: pair(x, x + 0.06, 1.82, 2.28, W / 2, W / 2 + 0.05), [0.75 + i * 0.1 for i in range(6)] + [2.9 + i * 0.1 for i in range(4)]),
           GUNM, "metal", metalness=0.6, roughness=0.4),
        mk("frame", S(0.6, 3.3, 1.36, 1.72, W - 0.06), DARK, "carbon", roughness=0.5),
        mk("rail", S(2.15, 3.25, 1.2, 1.36, W - 0.2), GUNM, "metal", metalness=0.6, roughness=0.4),
        mk("rail-teeth", row(lambda x: S(x, x + 0.07, 1.1, 1.2, W - 0.26, 0.015), [2.22 + i * 0.16 for i in range(7)]),
           DARK, "metal", metalness=0.5, roughness=0.5),
        glow("cells", pair(1.4, 3.2, 1.98, 2.1, W / 2, W / 2 + 0.06), "#3CE6FF"),
        mk("cell-frame", pair(1.32, 3.28, 1.92, 2.16, W / 2 - 0.02, W / 2 + 0.03), GUNM, "metal", metalness=0.6, roughness=0.4),
        mk("barrel", tube(3.5, 4.2, 2.02, [(0.15, 0), (0.15, 0.3), (0.13, 0.32), (0.13, 0.4), (0.15, 0.42), (0.15, 0.7)]),
           STEEL, "metal", metalness=0.8, roughness=0.3),
        glow("emitter", tube(4.2, 4.28, 2.02, [(0.17, 0), (0.17, 0.08)]), "#3CE6FF"),
        mk("front-sight", S(3.2, 3.36, 2.46, 2.6, 0.1), DARK, "metal", metalness=0.5),
        mk("rear-sight", S(0.72, 0.95, 2.36, 2.58, 0.34), DARK, "metal", metalness=0.5),
        mk("grip", poly([(0.68, 1.38), (1.5, 1.38), (1.22, 0.12), (0.36, 0.12)], W - 0.1), DARK, "carbon", roughness=0.6),
        mk("grip-panels", side([(0.8, 1.25), (1.38, 1.25), (1.16, 0.35), (0.56, 0.35)], (W - 0.1) / 2 + 0.02),
           "#2A2C31", "grip", roughness=0.9),
        mk("mag-base", S(0.28, 1.3, 0.0, 0.14, W - 0.04), GUNM, "metal", metalness=0.6, roughness=0.4),
        mk("guard", P.merge(S(1.15, 2.2, 0.86, 0.96, 0.22), S(2.1, 2.2, 0.96, 1.36, 0.22)), DARK, "carbon"),
        mk("trigger", poly([(1.62, 1.36), (1.76, 1.36), (1.74, 1.02), (1.66, 1.0)], 0.12, 0.015), STEEL, "metal", metalness=0.8),
        mk("vents", row(lambda x: S(x, x + 0.1, 2.46, 2.5, 0.3, 0.012), [1.25 + i * 0.2 for i in range(9)]), DARK, "carbon"),
        mk("comp", tube(3.46, 3.62, 2.02, [(0.22, 0), (0.24, 0.03), (0.24, 0.11), (0.22, 0.14)]), GUNM, "metal", metalness=0.7),
        mk("side-ribs", row(lambda x: pair(x, x + 0.05, 1.42, 1.66, (W - 0.06) / 2, (W - 0.06) / 2 + 0.05), [0.8 + i * 0.12 for i in range(8)]),
           GUNM, "metal", metalness=0.6),
        mk("hammer", S(0.48, 0.62, 1.9, 2.3, 0.22), GUNM, "metal", metalness=0.6),
        mk("screws", screws([(0.95, 0.5), (0.85, 1.1)], (W - 0.1) / 2 + 0.06), STEEL, "metal", metalness=0.8),
    ]
    P.ground(p)
    return p, {"shell": tex("noise", ["#E9ECF0", "#D3D8DE", "#F6F8FA"], 6),
               "carbon": tex("carbon", ["#22252C", "#111318", "#3A3F4B"], 4),
               "metal": tex("brushed", [STEEL, "#7E858F", "#E1E5EA"], 4),
               "grip": tex("grip", ["#303135", "#232427", "#45474D"], 8)}


@P.prop("assault-rifle", "Assault Rifle")
def rifle(rng):
    W = 0.72
    OL, OLD, TAN = "#5E6B47", "#4A5537", "#BDA275"
    mag = [mk("mag", poly([(4.0, 1.38), (4.62, 1.38), (4.98, 0.14), (4.36, 0.14)], W - 0.24), "#26282D", "polymer", roughness=0.7),
           mk("mag-ribs", P.merge(*[pair(4.06 + t * 0.29, 4.5 + t * 0.29, 1.2 - t, 1.24 - t, (W - 0.24) / 2 - 0.01, (W - 0.24) / 2 + 0.04)
                                    for t in (0.2, 0.45, 0.7)]), "#1B1D21", "polymer"),
           mk("mag-base", poly([(4.3, 0.2), (5.04, 0.2), (5.06, 0.06), (4.32, 0.06)], W - 0.18), GUNM, "metal", metalness=0.6)]
    p = [
        mk("buttpad", S(0.0, 0.18, 1.0, 2.5, W - 0.06), "#17181B", "grip", roughness=0.9),
        mk("stock", poly([(0.18, 1.2), (1.9, 1.75), (1.9, 2.3), (0.18, 2.42)], W - 0.14), TAN, "tan", roughness=0.7),
        mk("stock-tube", tube(1.9, 2.4, 2.02, [(0.2, 0), (0.2, 0.5)]), DARK, "metal", metalness=0.6),
        mk("cheek", S(0.5, 1.7, 2.42, 2.52, W - 0.34), TAN, "tan", roughness=0.7),
        mk("receiver", S(2.4, 5.6, 1.4, 2.5, W), OL, "olive", roughness=0.6),
        mk("receiver-low", S(2.6, 5.4, 1.28, 1.42, W - 0.1), OLD, "olive", roughness=0.6),
        mk("port", pair(3.5, 4.6, 1.85, 2.2, W / 2, W / 2 + 0.05), "#24272C", "metal", metalness=0.5),
        mk("charging", S(2.3, 2.5, 2.2, 2.34, W + 0.16), STEEL, "metal", metalness=0.8),
        mk("handguard", S(5.6, 7.9, 1.5, 2.4, W - 0.04), OLD, "olive", roughness=0.6),
        mk("hg-slots", row(lambda x: pair(x, x + 0.28, 1.78, 2.06, (W - 0.04) / 2, (W - 0.04) / 2 + 0.05),
                           [5.8 + i * 0.42 for i in range(5)]), "#1C1E22", "polymer"),
        mk("barrel", tube(7.9, 9.0, 1.95, [(0.12, 0), (0.12, 1.1)]), STEEL, "metal", metalness=0.8, roughness=0.3),
        mk("brake", tube(9.0, 9.5, 1.95, [(0.18, 0), (0.18, 0.12), (0.15, 0.14), (0.15, 0.24), (0.18, 0.26),
                                         (0.18, 0.38), (0.15, 0.4), (0.15, 0.5)]), DARK, "metal", metalness=0.7),
        mk("gas-block", S(7.6, 7.9, 2.4, 2.86, 0.18), DARK, "metal", metalness=0.6),
        mk("rail", S(2.5, 7.8, 2.5, 2.62, W - 0.3), DARK, "metal", metalness=0.6),
        mk("rail-teeth", row(lambda x: S(x, x + 0.1, 2.62, 2.72, W - 0.34, 0.015), [2.6 + i * 0.22 for i in range(24)]),
           "#16171A", "metal", metalness=0.5),
        mk("sight-mounts", P.merge(S(3.0, 3.3, 2.72, 2.86, W - 0.3), S(4.3, 4.6, 2.72, 2.86, W - 0.3)), DARK, "metal"),
        mk("sight", S(2.9, 4.8, 2.86, 3.36, 0.42), "#2C3036", "metal", metalness=0.5),
        mk("sight-hood", S(4.6, 4.9, 2.8, 3.44, 0.5), "#1C1E22", "metal", metalness=0.5),
        P.part("sight-lens", S(2.86, 2.9, 2.96, 3.26, 0.3, 0.01), "#6FA8DC", smooth=False, transparency=0.5, roughness=0.05),
        glow("red-dot", S(4.86, 4.92, 3.06, 3.16, 0.1, 0.01), "#FF3B30"),
        mk("grip", poly([(2.7, 1.3), (3.25, 1.3), (2.95, 0.2), (2.4, 0.2)], W - 0.22), "#26282D", "grip", roughness=0.9),
        mk("guard", P.merge(S(2.95, 4.0, 0.92, 1.02, 0.2), S(3.9, 4.0, 1.02, 1.3, 0.2)), OLD, "olive"),
        mk("trigger", poly([(3.45, 1.3), (3.58, 1.3), (3.56, 1.02), (3.48, 1.0)], 0.12, 0.015), STEEL, "metal", metalness=0.8),
        mk("stripes", P.merge(pair(5.7, 7.8, 2.24, 2.32, (W - 0.04) / 2, (W - 0.04) / 2 + 0.05),
                              pair(0.6, 1.6, 2.08, 2.16, (W - 0.14) / 2, (W - 0.14) / 2 + 0.05)), "#F07A24", None, roughness=0.5),
        mk("screws", screws([(2.6, 2.3), (5.4, 2.3), (5.8, 2.25), (7.7, 2.25)], W / 2 + 0.04), STEEL, "metal", metalness=0.8),
        mk("sling", P.merge(S(0.6, 0.8, 1.2, 1.42, 0.12), S(7.2, 7.4, 1.36, 1.54, 0.12)), STEEL, "metal", metalness=0.8),
    ] + mag
    P.ground(p)
    return p, {"olive": tex("noise", [OL, OLD, "#6E7B55"], 5), "tan": tex("noise", [TAN, "#A68B5F", "#D2BA8E"], 5),
               "metal": tex("brushed", [STEEL, "#7E858F", "#E1E5EA"], 4), "grip": tex("grip", ["#303135", "#1E1F22", "#45474D"], 8),
               "polymer": tex("noise", ["#26282D", "#1B1D21", "#34373D"], 6)}


@P.prop("sniper-rifle", "Sniper Rifle")
def sniper(rng):
    W = 0.7
    WD, WDD = "#7E5232", "#5E3B22"
    p = [
        mk("buttpad", S(0.0, 0.2, 0.9, 2.5, W - 0.04), "#17181B", "grip", roughness=0.9),
        mk("stock-rear", poly([(0.2, 1.0), (1.4, 1.35), (1.4, 2.35), (0.2, 2.5)], W - 0.1), WD, "wood", roughness=0.6),
        mk("stock-mid", poly([(1.4, 1.35), (2.6, 1.55), (2.6, 2.3), (1.4, 2.35)], W - 0.14), WD, "wood", roughness=0.6),
        mk("thumb-bridge", S(2.0, 3.6, 1.95, 2.3, W - 0.22), WD, "wood", roughness=0.6),
        mk("grip", poly([(2.6, 1.95), (3.4, 1.95), (3.15, 0.75), (2.4, 0.75)], W - 0.18), WDD, "wood", roughness=0.6),
        mk("checkering", side([(2.66, 1.8), (3.28, 1.8), (3.1, 0.95), (2.55, 0.95)], (W - 0.18) / 2 + 0.02),
           "#3F2816", "grip", roughness=0.9),
        mk("cheek", S(0.6, 2.2, 2.35, 2.6, W - 0.3), WDD, "wood", roughness=0.6),
        mk("receiver", tube(3.6, 6.4, 2.15, [(0.3, 0), (0.3, 2.8)]), GUNM, "metal", metalness=0.7, roughness=0.35),
        mk("fore-end", S(3.6, 8.4, 1.62, 1.9, W - 0.08), WD, "wood", roughness=0.6),
        mk("bolt", P.merge(S(5.3, 5.7, 2.05, 2.25, 0.2), B(5.42, 5.56, 2.08, 2.2, 0.1, 0.62)), STEEL, "metal", metalness=0.85),
        mk("bolt-knob", B(5.36, 5.62, 2.0, 2.28, 0.62, 0.86), "#17181B", "grip"),
        mk("mag", S(4.6, 5.4, 1.0, 1.62, W - 0.3), "#1E2127", "carbon"),
        mk("guard", P.merge(S(3.1, 4.3, 1.18, 1.28, 0.2), S(4.2, 4.3, 1.28, 1.62, 0.2)), GUNM, "metal", metalness=0.6),
        mk("trigger", poly([(3.6, 1.62), (3.72, 1.62), (3.7, 1.32), (3.62, 1.3)], 0.12, 0.015), STEEL, "metal", metalness=0.8),
        mk("barrel", tube(6.4, 11.2, 2.15, [(0.16, 0), (0.16, 2.0), (0.13, 2.4), (0.13, 4.8)]), STEEL, "metal",
           metalness=0.8, roughness=0.3),
        mk("suppressor", tube(11.2, 13.4, 2.15, [(0.3, 0), (0.3, 2.2)]), "#1A1C20", "carbon"),
        mk("supp-rings", P.merge(*[tube(x, x + 0.1, 2.15, [(0.33, 0), (0.33, 0.1)]) for x in (11.4, 11.9, 12.4, 12.9)]),
           GUNM, "metal", metalness=0.7),
        mk("bipod-hinge", S(7.8, 8.2, 1.4, 1.62, 0.4), GUNM, "metal", metalness=0.6),
        mk("bipod-legs", P.merge(*[P.xf(S(0, 1.6, -0.05, 0.05, 0.08, 0.015), r=(0, 0, -8), t=(8.1, 1.42, z)) for z in (-0.16, 0.16)]),
           DARK, "metal", metalness=0.6),
        mk("bipod-feet", P.merge(*[B(9.55, 9.75, 1.12, 1.26, z - 0.06, z + 0.06) for z in (-0.16, 0.16)]), "#17181B", "grip"),
        mk("top-rail", P.merge(S(3.7, 6.3, 2.42, 2.5, 0.34), row(lambda x: S(x, x + 0.08, 2.5, 2.56, 0.3, 0.012),
                                                                [3.75 + i * 0.17 for i in range(15)])), DARK, "metal", metalness=0.6),
        mk("scope-bands", P.merge(*[tube(x, x + 0.08, 3.0, [(0.245, 0), (0.245, 0.08)]) for x in (3.6, 6.6)]),
           "#17181B", "metal", metalness=0.6),
        mk("scope-rings", P.merge(*[S(x, x + 0.26, 2.47, 2.82, 0.5) for x in (4.0, 5.9)]), "#17181B", "metal", metalness=0.6),
        mk("scope", tube(3.3, 6.9, 3.0, [(0.22, 0), (0.22, 3.6)]), "#2A2E35", "carbon"),
        mk("bell", tube(6.9, 7.8, 3.0, [(0.22, 0), (0.36, 0.4), (0.36, 0.9)]), "#2A2E35", "carbon"),
        mk("eyepiece", tube(2.7, 3.3, 3.0, [(0.3, 0), (0.3, 0.3), (0.22, 0.6)]), "#2A2E35", "carbon"),
        P.part("lens-front", tube(7.8, 7.84, 3.0, [(0.32, 0), (0.32, 0.04)]), "#6FA8DC", smooth=False, transparency=0.5,
               roughness=0.05),
        P.part("lens-rear", tube(2.66, 2.7, 3.0, [(0.26, 0), (0.26, 0.04)]), "#6FA8DC", smooth=False, transparency=0.5,
               roughness=0.05),
        mk("turrets", P.merge(P.xf(tube(0, 0.32, 0, [(0.12, 0), (0.12, 0.32)]), r=(0, 0, 90), t=(5.05, 3.18, 0)),
                              P.xf(tube(0, 0.32, 0, [(0.12, 0), (0.12, 0.32)]), r=(0, -90, 0), t=(5.05, 3.0, 0.18))),
           "#17181B", "metal", metalness=0.6),
        glow("marker", S(7.2, 7.6, 3.36, 3.42, 0.08, 0.01), "#FF3B30"),
        mk("screws", screws([(1.0, 1.9), (6.0, 1.78), (7.0, 1.78)], (W - 0.08) / 2 + 0.04), STEEL, "metal", metalness=0.8),
        mk("sling", P.merge(S(1.0, 1.2, 1.12, 1.32, 0.12), S(7.2, 7.4, 1.46, 1.66, 0.12)), STEEL, "metal", metalness=0.8),
    ]
    P.ground(p)
    return p, {"wood": tex("woodgrain", [WD, WDD, "#9A6A44"], 3), "metal": tex("brushed", [STEEL, "#7E858F", "#E1E5EA"], 4),
               "carbon": tex("carbon", ["#22252C", "#111318", "#3A3F4B"], 4),
               "grip": tex("grip", ["#303135", "#1E1F22", "#45474D"], 8)}


def combine(out):
    t = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    objs, txs = {}, {}
    os.makedirs(os.path.join(out, "live"), exist_ok=True)
    for i, n in enumerate(NAMES):
        d = json.load(open(os.path.join(out, n + ".json")))
        d["objects"][d["root"]]["pos"] = [-d["objects"][d["root"]].get("pos", [0])[0], (2 - i) * STACK, 0]
        objs.update(d["objects"])
        txs.update(d.get("textures", {}))
        doc = {"name": "Voxel Guns", "v": 1, "updated": t, "objects": dict(objs), "textures": dict(txs), "anims": {},
               "camera": {"pos": [5, 6, 16], "target": [5, 4, 0], "fov": 50, "ortho": False}}
        meta = {"name": "Voxel Guns", "updated": t, "count": len(objs), "ai": True}
        json.dump(doc, open(os.path.join(out, "live", "p%d.json" % (i + 1)), "w"), separators=(",", ":"))
        json.dump(meta, open(os.path.join(out, "live", "m%d.json" % (i + 1)), "w"), separators=(",", ":"))
    tab = os.path.join(out, "studio")
    os.makedirs(tab, exist_ok=True)
    shutil.copytree(os.path.join(out, "geo"), os.path.join(tab, "geo"), dirs_exist_ok=True)
    for f, d in (("project.json", doc), ("uploads.json", {}), ("meta.json", dict(meta, building=False))):
        json.dump(d, open(os.path.join(tab, f), "w"), separators=(",", ":"))


def attach(name, tol=0.05, step=0.035):
    """No floating or gapped pieces: dense surface samples of every part must form ONE cluster (gaps > tol fail)."""
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    from scipy.spatial import cKDTree
    pts = []
    for p in P.PROPS[name][1](None)[0]:
        m = p["mesh"]
        for f in m.f:
            for k in range(1, len(f) - 1):
                a, b, c = m.v[f[0]], m.v[f[k]], m.v[f[k + 1]]
                n = max(1, int(math.ceil(max(np.linalg.norm(b - a), np.linalg.norm(c - a), np.linalg.norm(c - b)) / step)))
                i, j = np.meshgrid(np.arange(n + 1), np.arange(n + 1))
                keep = i + j <= n
                pts.append(a + np.outer(i[keep] / n, b - a) + np.outer(j[keep] / n, c - a))
    V = np.unique(np.round(np.vstack(pts), 4), axis=0)
    pr = cKDTree(V).query_pairs(tol, output_type="ndarray")
    k, lab = connected_components(coo_matrix((np.ones(len(pr)), (pr[:, 0], pr[:, 1])), shape=(len(V), len(V))), directed=False)
    big = np.bincount(lab).argmax()
    for r in set(lab.tolist()) - {big}:
        print("ATTACH FAIL %s: piece at %s detached" % (name, np.round(V[lab == r].mean(0), 2).tolist()))
    print("ATTACH %s %s (%d pieces, %d samples)" % ("PASS" if k == 1 else "FAIL", name, k, len(V)))
    return int(k != 1)


def main(argv=None):
    a = sys.argv[1:] if argv is None else argv
    if not a:
        sys.exit(__doc__)
    out = a[0]
    os.makedirs(out, exist_ok=True)
    rc = P.run(out, NAMES, 7, "--check" in a, False, "toon")
    combine(out)
    if "--check" in a:
        here = os.path.dirname(os.path.abspath(__file__))
        for n in NAMES:
            rc |= subprocess.call([sys.executable, os.path.join(here, "..", "detail", "detail.py"), "check",
                                   os.path.join(out, n + ".json"), os.path.join(out, "geo"), "--class", "prop"])
        for n in NAMES:
            rc |= attach(n)
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "zfight", "zfight.py"), "check",
                               os.path.join(out, "studio", "project.json"), os.path.join(out, "studio", "geo"), "--prop"])
    return rc


if __name__ == "__main__":
    sys.exit(main())
