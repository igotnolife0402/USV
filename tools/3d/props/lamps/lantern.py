#!/usr/bin/env python3
"""Hurricane lantern, realistic (metres, origin at base centre), studio meshes.

python3 lantern.py OUT [--check] [--preview]
Writes OUT/geo/*.json, OUT/<NAME>.json, OUT/live/p<i>.json + m<i>.json (Umbrio stage build: body, globe+guards, cap+bail).
--check: mesh check, detail floor (--class prop), attach (lantern scale), prop z-fight. Exit 0 = all pass.
"""
# @style: realistic
# @model: hurricane-lantern | Realistic red-enamel hurricane lantern: tank, brass burner, glass globe, wire guards, bail
# @run: python3 lantern.py OUT --check
import json
import math
import os
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import props as P  # noqa: E402
import guns as G  # noqa: E402

NAME, TITLE = "hurricane-lantern", "Hurricane Lantern"
# palette: warm red enamel + brass + oiled wood, one accent (flame)
PAINT, PAINTD, PAINTL = "#8E2A1F", "#5E1A13", "#B8483A"
BRASS, BRASSD, BRASSL = "#B98A3E", "#7A5824", "#E8C27A"
STEEL, STEELD, STEELL = "#7C7F84", "#55585C", "#B4B8BE"
WOOD, WOODD, WOODL = "#7A4E2C", "#4E301A", "#A87548"
FLAME, FLAMEC = "#FF9A2E", "#FFB347"
# stages for the live build (part ids)
STAGES = [("tank", "foot-rim", "tank-seam", "fill-cap", "fill-spout", "burner", "wick-shaft", "wick-knob", "wick",
           "tube-clamps", "rivets", "lift-lever"),
          ("gallery", "globe", "globe-ring", "guard-wires", "guard-ring", "flame"),
          ("air-tubes", "hood", "vent", "cap-nut", "bail-ears", "bail", "grip")]


def L(prof, rad=0.0, seg=48, n=3, rmod=None, closed=False):
    """Lathe an (r, y) profile with filleted corners."""
    if rad:
        r = np.full(len(prof), rad) if np.ndim(rad) == 0 else np.asarray(rad, float)
        prof = P.fillet(prof, r, n, closed)
    return P.lathe(prof, seg, closed, rmod=rmod)


def ring(R, r, y, seg=48, n=12):
    return P.xf(P.lathe(P.torus_profile(R, r, n), seg, True), t=(0, y, 0))


def tx(pid, mesh, color, key, sc, **kw):
    P.box_uv(mesh, sc)
    return P.part(pid, mesh, color, texture=key, **kw)


def T(pattern, cols, scale):
    return {"kind": "procedural", "pattern": pattern, "colors": list(cols), "scale": scale}


def knurl(n, depth):
    return lambda th, Y, R: R * (1 + depth * np.sign(np.sin(th * n)) * (R > 0.004))


def globe_r(y):
    """Globe outer radius at height y (bulging chimney glass)."""
    t = np.clip((y - 0.088) / (0.262 - 0.088), 0, 1)
    return 0.036 + 0.034 * np.sin(math.pi * t) ** 1.2 + 0.004 * t


@P.prop(NAME, TITLE)
def lantern(rng):
    p = []
    # ---- fount (fuel tank): pressed steel, red enamel, rolled seam, stamped foot rim
    tank = [(0, 0.006), (0.062, 0.006), (0.082, 0.014), (0.091, 0.03), (0.088, 0.046), (0.074, 0.058),
            (0.046, 0.066), (0, 0.068)]
    p.append(tx("tank", L(tank, 0.006, 64), PAINT, "paint", 6, roughness=0.45, metalness=0.25))
    p.append(tx("foot-rim", L([(0.064, 0.0), (0.077, 0.0), (0.083, 0.004), (0.083, 0.012), (0.064, 0.012)],
                              [0, 0.002, 0.002, 0.002, 0], 64, 2, closed=True), PAINTD, "paint", 6,
                roughness=0.5, metalness=0.25))
    p.append(tx("tank-seam", ring(0.0905, 0.0032, 0.03, 64), PAINTL, "paint", 6, roughness=0.4, metalness=0.3))
    # filler cap on the shoulder (knurled brass) + its spout collar
    sp = P.xf(L([(0, 0), (0.011, 0), (0.011, 0.012), (0, 0.012)], 0.0015, 24), r=(0, 0, -28), t=(0.064, 0.052, 0))
    p.append(tx("fill-spout", sp, BRASSD, "brass", 40, roughness=0.35, metalness=0.6))
    cap = P.xf(L([(0, 0), (0.0135, 0), (0.0135, 0.009), (0.008, 0.012), (0, 0.012)], 0, 32,
                 rmod=knurl(24, 0.05)), r=(0, 0, -28), t=(0.0685, 0.06, 0))
    p.append(tx("fill-cap", cap, BRASS, "brass", 40, roughness=0.3, metalness=0.65))
    # ---- burner: brass, flared skirt, perforated deck (ridged), wick tube
    burner = [(0, 0.06), (0.042, 0.06), (0.044, 0.066), (0.036, 0.072), (0.034, 0.082), (0.026, 0.088),
              (0, 0.088)]
    p.append(tx("burner", L(burner, 0.002, 64, rmod=lambda th, Y, R: R * (1 + 0.04 * (np.cos(th * 18) > 0.6) * (Y > 0.072) * (Y < 0.081))),
                BRASS, "brass", 40, roughness=0.3, metalness=0.65))
    shaft = P.sweep([(0.02, 0.075, 0.0), (0.05, 0.075, 0.0), (0.066, 0.075, 0.0)], 0.0022, 12, caps="flat")
    p.append(tx("wick-shaft", shaft, BRASSD, "brass", 40, roughness=0.35, metalness=0.6))
    knob = P.xf(L([(0, 0), (0.012, 0), (0.012, 0.004), (0.009, 0.007), (0, 0.007)], 0.001, 32, rmod=knurl(20, 0.06)),
                r=(0, 0, -90), t=(0.063, 0.075, 0))
    p.append(tx("wick-knob", knob, BRASSL, "brass", 40, roughness=0.3, metalness=0.65))
    wick = P.xf(P.cbox((0.014, 0.012, 0.004), 0.0012), t=(0, 0.0915, 0))
    p.append(tx("wick", wick, "#3A332C", "wick", 60, roughness=0.95))
    fl = [(0, 0.094), (0.0045, 0.097), (0.0075, 0.104), (0.0068, 0.113), (0.0035, 0.123), (0, 0.131)]
    p.append(P.part("flame", L(fl, 0, 16), FLAME, emissive=FLAMEC, emissiveIntensity=2.2, roughness=0.9))
    # ---- globe gallery (brass seat with crimped lip) and the glass chimney
    gal = [(0.031, 0.082), (0.05, 0.082), (0.052, 0.086), (0.05, 0.098), (0.046, 0.1), (0.031, 0.094)]
    p.append(tx("gallery", L(gal, 0.0015, 64, 2, rmod=lambda th, Y, R: R * (1 + 0.025 * np.sin(th * 32) * (Y > 0.094)), closed=True),
                BRASS, "brass", 40, roughness=0.3, metalness=0.65))
    ys = np.linspace(0.09, 0.262, 22)
    outer = [(float(globe_r(y)), float(y)) for y in ys]
    inner = [(float(globe_r(y)) - 0.0022, float(y)) for y in ys[::-1]]
    p.append(P.part("globe", P.lathe(outer + inner, 64, True), "#E6EEF0", transparency=0.62, roughness=0.05,
                    metalness=0.0))
    gr = [(0.035, 0.252), (0.05, 0.252), (0.051, 0.262), (0.035, 0.27)]
    p.append(tx("globe-ring", L(gr, 0.0015, 64, 2, closed=True), BRASSD, "brass", 40, roughness=0.35, metalness=0.6))
    # ---- wire guards: four bowed wires + one equator ring, steel
    wires = []
    for a in (45, 135, 225, 315):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        path = []
        for y in np.linspace(0.094, 0.258, 16):
            r = float(globe_r(y)) + 0.0085
            r = min(r, 0.047 + (y - 0.094) * 0.6, 0.047 + (0.258 - y) * 0.6)
            path.append((r * c, y, r * s))
        wires.append(P.sweep(path, 0.0019, 8, caps="flat"))
    p.append(tx("guard-wires", P.merge(*wires), STEEL, "steel", 60, roughness=0.4, metalness=0.6))
    p.append(tx("guard-ring", ring(float(globe_r(0.17)) + 0.0085, 0.0021, 0.17, 64, 8), STEELD, "steel", 60,
                roughness=0.45, metalness=0.6))
    # ---- air tubes (hollow frame of a hurricane lantern): tank shoulder up to the hood
    tubes, clamps, rivets, ears = [], [], [], []
    for sx in (1, -1):
        path = [(sx * 0.07, 0.054, 0), (sx * 0.088, 0.062, 0), (sx * 0.1, 0.082, 0)]
        path += [(sx * 0.1, y, 0) for y in np.linspace(0.1, 0.262, 8)]
        path += [(sx * 0.094, 0.282, 0), (sx * 0.078, 0.294, 0), (sx * 0.058, 0.299, 0)]
        tubes.append(P.sweep(P.fillet(path, 0.01, 4), 0.0058, 16, caps="flat"))
        clamps.append(P.xf(P.rbox((0.018, 0.016, 0.02), 0.003, 2), r=(0, 0, sx * 28), t=(sx * 0.079, 0.056, 0)))
        rivets.append(P.xf(L([(0, 0), (0.0032, 0), (0.0028, 0.002), (0, 0.003)], 0, 16), r=(0, 0, -sx * 62),
                           t=(sx * 0.0855, 0.0593, 0)))
        ears.append(P.xf(P.lathe(P.torus_profile(0.0068, 0.0019, 8), 24, True), r=(0, 0, 90), t=(sx * 0.1065, 0.236, 0)))
    p.append(tx("air-tubes", P.merge(*tubes), PAINT, "paint", 6, roughness=0.45, metalness=0.25))
    p.append(tx("tube-clamps", P.merge(*clamps), PAINTD, "paint", 6, roughness=0.5, metalness=0.25))
    p.append(tx("rivets", P.merge(*rivets), BRASSL, "brass", 40, roughness=0.3, metalness=0.65))
    p.append(tx("bail-ears", P.merge(*ears), STEELL, "steel", 60, roughness=0.35, metalness=0.6))
    # ---- hood (chimney cap) with louvred vent and top nut
    hood = [(0, 0.262), (0.032, 0.262), (0.062, 0.268), (0.066, 0.276), (0.058, 0.29), (0.04, 0.304), (0.024, 0.31), (0, 0.311)]
    p.append(tx("hood", L(hood, 0.003, 64), PAINT, "paint", 6, roughness=0.45, metalness=0.25))
    vent = [(0, 0.306), (0.022, 0.306), (0.022, 0.322), (0.017, 0.327), (0, 0.328)]
    p.append(tx("vent", L(vent, 0.0015, 48, rmod=lambda th, Y, R: R * (1 + 0.12 * (np.cos(th * 12) > 0.3) * (Y > 0.309) * (Y < 0.32))),
                STEEL, "steel", 60, roughness=0.4, metalness=0.6))
    nut = [(0, 0.326), (0.009, 0.326), (0.009, 0.333), (0.005, 0.336), (0, 0.337)]
    p.append(tx("cap-nut", L(nut, 0.001, 6), BRASSD, "brass", 40, roughness=0.35, metalness=0.6))
    # ---- bail handle (spring steel wire) through the ears, wooden grip at the top
    bail = [(0.1065 * math.cos(t), 0.236 + 0.19 * math.sin(t) ** 0.9, 0.0) for t in np.linspace(0.03, math.pi - 0.03, 28)]
    bail = [(0.1065, 0.226, 0.0)] + bail + [(-0.1065, 0.226, 0.0)]
    p.append(tx("bail", P.sweep(bail, 0.0024, 8, caps="flat"), STEELD, "steel", 60, roughness=0.4, metalness=0.6))
    gp = [(0, -0.036), (0.006, -0.036), (0.0105, -0.028), (0.0115, 0.0), (0.0105, 0.028), (0.006, 0.036), (0, 0.036)]
    top = 0.236 + 0.19
    p.append(tx("grip", P.xf(L(gp, [0, 0, 0.003, 0, 0.003, 0, 0], 24, 2), r=(0, 0, 90), t=(0, top, 0)), WOOD, "wood", 30, roughness=0.6))
    # ---- globe lift lever: wire from the gallery down the back to a thumb tab at the tank shoulder
    lev = [(0, 0.09, -0.046), (0, 0.092, -0.06), (0, 0.08, -0.072), (0, 0.064, -0.08), (0, 0.058, -0.083)]
    tab = P.xf(P.cbox((0.016, 0.004, 0.012), 0.0012), r=(28, 0, 0), t=(0, 0.06, -0.086))
    p.append(tx("lift-lever", P.merge(P.sweep(lev, 0.002, 8, caps="flat"), tab), STEEL, "steel", 60,
                roughness=0.4, metalness=0.6))
    P.ground(p)
    tex = {"paint": T("noise", (PAINT, PAINTD, PAINTL), 0.06), "brass": T("brushed", (BRASS, BRASSD, BRASSL), 0.04),
           "steel": T("brushed", (STEEL, STEELD, STEELL), 0.05), "wood": T("woodgrain", (WOOD, WOODD, WOODL), 0.05),
           "wick": T("fabric", ("#3A332C", "#1E1A16", "#5A5048"), 0.02)}
    return p, tex


def live(out):
    t = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    d = json.load(open(os.path.join(out, NAME + ".json")))
    root = d["root"]
    os.makedirs(os.path.join(out, "live"), exist_ok=True)
    objs = {root: d["objects"][root]}
    for i, ids in enumerate(STAGES):
        for k in d["objects"]:   # fit_parts may split a mesh into -1/-2: keep the prefix match
            if any(k == NAME + "-" + s or k.startswith(NAME + "-" + s + "-") for s in ids):
                objs[k] = d["objects"][k]
        doc = {"name": TITLE, "v": 1, "updated": t, "objects": dict(objs), "textures": d["textures"], "anims": {},
               "camera": {"pos": [0.45, 0.35, 0.6], "target": [0, 0.19, 0], "fov": 45, "ortho": False}}
        json.dump(doc, open(os.path.join(out, "live", "p%d.json" % (i + 1)), "w"), separators=(",", ":"))
        json.dump({"name": TITLE, "updated": t, "count": len(objs) - 1, "ai": True, "building": i < len(STAGES) - 1},
                  open(os.path.join(out, "live", "m%d.json" % (i + 1)), "w"), separators=(",", ":"))
    missing = set(d["objects"]) - set(objs)
    assert not missing, "parts not in any stage: %s" % sorted(missing)
    return os.path.join(out, "live", "p%d.json" % len(STAGES))


def main(argv=None):
    a = sys.argv[1:] if argv is None else argv
    if not a:
        sys.exit(__doc__)
    out = a[0]
    os.makedirs(out, exist_ok=True)
    rc = P.run(out, [NAME], 7, "--check" in a, "--preview" in a, "toon")
    proj = live(out)
    if "--check" in a:
        here = os.path.dirname(os.path.abspath(__file__))
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "..", "detail", "detail.py"), "check",
                               os.path.join(out, NAME + ".json"), os.path.join(out, "geo"), "--class", "prop"])
        rc |= G.attach(NAME, tol=0.002, step=0.004)   # lantern scale (metres): 2-6 mm gaps fail
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "..", "zfight", "zfight.py"), "check",
                               proj, os.path.join(out, "geo"), "--prop"])
    return rc


if __name__ == "__main__":
    sys.exit(main())
