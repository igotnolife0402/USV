#!/usr/bin/env python3
"""Realistic generic compact hatchback (1 unit = 1 m, front +Z, up +Y, origin = wheelbase centre at ground).

python3 car.py OUT [--check]
4.30 x 1.80 x 1.45 m, wheelbase 2.63, track 1.55, 225/45R17 tyres. Body and cabin are lofted superellipse
sections; panels (doors, hood, hatch, bumpers, glass, lights) are solid patches sampled from the same surface and
offset outward, so they follow the curves without coplanar overlap. Wheel wells are pressed into the body loft.
Built from the /improve 45 car prompt (2026-11-23). Tinted glass is opaque, so there is no interior.
--check: mesh check, detail floor --class hero, zfight --prop on the last live stage.
"""
# @style: realistic
# @model: car | Realistic generic 4-door compact hatchback, 4.3 m
# @run: python3 car.py OUT --check
import json
import math
import os
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # props helpers live one level up
import props as P  # noqa: E402
import house as H  # noqa: E402  (fuv metre UVs, tex, mk)

NAME, TITLE = "car", "Hatchback"
PAINT, TRIM, GLASS, CHROME = "#2F6DB5", "#2A2A2A", "#1E2833", "#C8CCD0"
RUBBER, RIM, LENS, TAIL = "#3A3A3A", "#A8ADB3", "#E8EEF2", "#B0151A"
DISC, CALIPER, PLATE = "#6E6E6E", "#B02020", "#F2F2F2"
WB, TRACK, R_TYRE = 2.63, 1.55, 0.317
WHEELS = [(sx * TRACK / 2, R_TYRE, sz * WB / 2) for sz in (1, -1) for sx in (1, -1)]  # FR FL RR RL
WELL_R, WELL_X = 0.385, 0.62
NB, NC = 5.0, 4.0  # superellipse exponents: body, cabin

STAGES = [
    ["body", "cabin", "hood", "hatch", "bumper-f", "bumper-r", "door-fl", "door-fr", "door-rl", "door-rr",
     "skirt-l", "skirt-r", "liner-fr", "liner-fl", "liner-rr", "liner-rl"],
    ["windshield", "rear-glass", "win-fl", "win-fr", "win-rl", "win-rr", "grille", "head-l", "head-r", "tail-l",
     "tail-r", "fog-l", "fog-r", "mirror-l", "mirror-r", "handle-fl", "handle-fr", "handle-rl", "handle-rr",
     "plate-f", "plate-r", "exhaust", "wiper-l", "wiper-r", "antenna"],
    ["tyre-%s" % w for w in ("fr", "fl", "rr", "rl")] + ["rim-%s" % w for w in ("fr", "fl", "rr", "rl")]
    + ["disc-%s" % w for w in ("fr", "fl", "rr", "rl")] + ["caliper-%s" % w for w in ("fr", "fl", "rr", "rl")],
]


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
    return lerp(z, [-2.0, -1.85, -1.25, 0.25, 1.05], [0.98, 1.30, 1.43, 1.45, 0.98])


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


def press_wells(m):
    """Push body vertices inside each wheel-well circle in to |x| = WELL_X."""
    v = m.v
    for cx, cy, cz in WHEELS:
        d = np.hypot(v[:, 1] - cy, v[:, 2] - cz)
        hit = (d < WELL_R) & (np.sign(v[:, 0]) == np.sign(cx)) & (np.abs(v[:, 0]) > WELL_X)
        v[hit, 0] = np.sign(cx) * WELL_X
    return m


def arc_band(cx, cy, cz, r0, r1, x0, x1, na=24):
    A = np.linspace(-0.15, math.pi + 0.15, na)
    X = np.linspace(x0, x1, 3)
    grid = lambda r: np.array([[(x, cy + r * math.sin(a), cz + r * math.cos(a)) for a in A] for x in X])
    return solid(grid(r1), grid(r0))


def tube(r_in, r_out, L, seg=20):
    return P.lathe([(r_in, 0), (r_out, 0), (r_out, L), (r_in, L)], seg, True)


def tyre():
    prof = [(0.214, -0.100), (0.285, -0.1125), (0.308, -0.106), (0.317, -0.092), (0.317, -0.052), (0.309, -0.050),
            (0.309, -0.040), (0.317, -0.038), (0.317, 0.038), (0.309, 0.040), (0.309, 0.050), (0.317, 0.052),
            (0.317, 0.092), (0.308, 0.106), (0.285, 0.1125), (0.214, 0.100)]

    def sipes(th, Y, R):  # tread blocks: lateral grooves 6 mm deep across the outer rows
        on = (R > 0.316) & (np.sin(th * 30) > 0.55)
        return np.where(on, R - 0.006, R)
    return P.lathe(prof, 60, True, sipes)


def rim():
    barrel = P.lathe([(0.19, -0.10), (0.216, -0.105), (0.223, -0.095), (0.21, -0.08), (0.21, 0.07),
                      (0.224, 0.085), (0.219, 0.096), (0.19, 0.09)], 40, True)
    hub = P.lathe([(0, 0.045), (0.072, 0.045), (0.078, 0.075), (0.062, 0.092), (0, 0.094)], 24, False)
    parts = [barrel, hub]
    for k in range(5):
        a = k * 72
        ra = math.radians(a)
        sp = P.rbox((0.16, 0.03, 0.05), 0.012, 1)
        parts.append(P.xf(sp, r=(0, a, 0), t=(0.135 * math.cos(ra), 0.072, -0.135 * math.sin(ra))))
        rb = math.radians(a + 36)
        nut = P.lathe([(0, 0.088), (0.012, 0.088), (0.012, 0.1), (0, 0.103)], 6, False)
        parts.append(P.xf(nut, t=(0.042 * math.cos(rb), 0, -0.042 * math.sin(rb))))
    return P.merge(*parts)


def at_wheel(m, w):
    cx, cy, cz = w
    return P.xf(m, r=(0, 0, -90 if cx > 0 else 90), t=(cx, cy, cz))


def slab_z(hw, hh, depth, x, y, z, face=1):
    """Rounded plate facing +Z (face=1) or -Z, standing depth - 0.01 proud of the cap at z."""
    m = P.rbox((2 * hw, 2 * hh, depth + 0.02), min(0.012, hh * 0.4), 1)
    return P.xf(m, t=(x, y, z + face * (depth / 2 - 0.01)))  # back face 2 cm inside the cap


@P.prop(NAME, TITLE)
def car(rng):
    tex = H.tex
    p = []
    add = lambda pid, m, col, t=None, **kw: p.append(H.mk(pid, m, col, t, **kw))
    paint = dict(roughness=0.35, metalness=0.4)
    glass = dict(roughness=0.05, metalness=0.3)

    # big smooth lofts: box UVs keep shared vertices (fuv splits per face and passed the 225 KB geo cap 3x)
    for pid, m in (("body", press_wells(loft(body_sec, -2.15, 2.15, 76, 52))), ("cabin", loft(cab_sec, -2.0, 1.05, 36, 36))):
        P.box_uv(m, 1.0)
        p.append(P.part(pid, m, PAINT, smooth=True, texture="paint", **paint))
    top = math.pi / 2
    add("hood", patch(body_sec, 1.02, 1.95, top - 1.2, top + 1.2, -0.02, 0.035, 10, 16), PAINT, "paint", **paint)
    add("hatch", patch(cab_sec, -1.995, -1.885, top - 1.3, top + 1.3, -0.05, 0.085, 10, 16), PAINT, "paint", **paint)
    lo0, lo1 = math.pi + 0.05, 2 * math.pi - 0.05
    add("bumper-f", patch(body_sec, 1.80, 2.15, lo0, lo1, -0.02, 0.04, 8, 24), TRIM, "trim", roughness=0.7)
    add("bumper-r", patch(body_sec, -2.15, -1.80, lo0, lo1, -0.04, 0.07, 8, 24), TRIM, "trim", roughness=0.7)
    for tag, z0, z1 in (("f", 0.02, 0.92), ("r", -0.92, -0.02)):
        l, r = side_pair(body_sec, NB, z0, z1, -0.55, 0.85, -0.02, 0.035, 10, 10)
        add("door-%sl" % tag, l, PAINT, "paint", **paint)
        add("door-%sr" % tag, r, PAINT, "paint", **paint)
    l, r = side_pair(body_sec, NB, -0.92, 0.92, -0.97, -0.62, -0.02, 0.04, 12, 6)
    add("skirt-l", l, TRIM, "trim", roughness=0.7)
    add("skirt-r", r, TRIM, "trim", roughness=0.7)
    for (cx, cy, cz), w in zip(WHEELS, ("fr", "fl", "rr", "rl")):
        s = np.sign(cx)
        add("liner-" + w, arc_band(cx, cy, cz, WELL_R - 0.025, WELL_R - 0.01, s * (WELL_X - 0.01), s * 0.86),
            TRIM, "trim", roughness=0.8)

    # glass + lights + trim
    add("windshield", patch(cab_sec, 0.30, 1.00, top - 0.95, top + 0.95, -0.02, 0.035, 10, 14), GLASS, "glass", **glass)
    add("rear-glass", patch(cab_sec, -1.86, -1.36, top - 1.0, top + 1.0, -0.02, 0.035, 8, 14), GLASS, "glass", **glass)
    for tag, z0, z1 in (("f", 0.08, 0.86), ("r", -1.15, -0.08)):
        l, r = side_pair(cab_sec, NC, z0, z1, -0.45, 0.72, -0.02, 0.035, 10, 8)
        add("win-%sl" % tag, l, GLASS, "glass", **glass)
        add("win-%sr" % tag, r, GLASS, "glass", **glass)
    l, r = side_pair(body_sec, NB, 1.90, 2.11, 0.30, 0.82, -0.02, 0.035, 6, 8)
    add("head-l", l, LENS, "lens", roughness=0.05, metalness=0.2)
    add("head-r", r, LENS, "lens", roughness=0.05, metalness=0.2)
    l, r = side_pair(body_sec, NB, -2.12, -1.95, 0.35, 0.86, -0.02, 0.035, 6, 8)
    add("tail-l", l, TAIL, "tail", roughness=0.2, emissive=TAIL, emissiveIntensity=0.25)
    add("tail-r", r, TAIL, "tail", roughness=0.2, emissive=TAIL, emissiveIntensity=0.25)
    add("grille", slab_z(0.36, 0.075, 0.03, 0, 0.53, 2.15), TRIM, "grille", roughness=0.6)
    add("plate-f", slab_z(0.26, 0.055, 0.012, 0, 0.42, 2.15), PLATE, "plate", roughness=0.6)
    add("plate-r", slab_z(0.26, 0.055, 0.012, 0, 0.58, -2.15, -1), PLATE, "plate", roughness=0.6)
    for nm, x in (("fog-l", -0.40), ("fog-r", 0.40)):
        add(nm, slab_z(0.06, 0.03, 0.02, x, 0.43, 2.15), LENS, "lens", roughness=0.05)
    add("exhaust", P.xf(tube(0.03, 0.038, 0.14), r=(90, 0, 0), t=(0.45, 0.27, -2.02)), CHROME, "chrome",
        roughness=0.15, metalness=0.9)
    for nm, s in (("mirror-l", -1), ("mirror-r", 1)):
        m = P.merge(P.rbox((0.20, 0.12, 0.10), 0.03, 1),
                    P.xf(P.rbox((0.10, 0.03, 0.05), 0.01, 1), t=(-s * 0.12, -0.03, 0.0)))
        add(nm, P.xf(m, t=(s * 0.96, 1.04, 0.84)), PAINT, "paint", **paint)
    y0, y1, hw = body_dims(0.5)
    fy = (0.86 - (y0 + y1) / 2) / ((y1 - y0) / 2)
    hx = body_sec(0.5, np.array([frac_t(fy, NB)]))[0][0] + 0.015 + 0.015
    for tag, z in (("f", 0.55), ("r", -0.38)):
        for side, s in (("l", -1), ("r", 1)):
            add("handle-%s%s" % (tag, side), P.xf(P.rbox((0.03, 0.028, 0.17), 0.012, 1), t=(s * hx, 0.86, z)),
                CHROME, "chrome", roughness=0.15, metalness=0.9)
    for nm, x in (("wiper-l", -0.38), ("wiper-r", 0.12)):
        add(nm, P.xf(P.rbox((0.52, 0.016, 0.024), 0.006, 1), r=(0, 8, 0), t=(x + 0.26, 1.02, 0.93)), TRIM, "trim")
    add("antenna", P.xf(P.lathe([(0, 0), (0.012, 0), (0.004, 0.2), (0, 0.2)], 8, False), r=(-35, 0, 0),
                        t=(0, cab_top(-1.0) - 0.01, -1.0)), TRIM, "trim")

    # wheels
    for w, tag in zip(WHEELS, ("fr", "fl", "rr", "rl")):
        add("tyre-" + tag, at_wheel(tyre(), w), RUBBER, "rubber", roughness=0.9)
        add("rim-" + tag, at_wheel(rim(), w), RIM, "rim", roughness=0.3, metalness=0.8)
        add("disc-" + tag, at_wheel(P.xf(tube(0.07, 0.152, 0.024, 32), t=(0, -0.03, 0)), w), DISC, "disc",
            roughness=0.5, metalness=0.7)
        L = 0.15 if tag[0] == "f" else 0.11
        cal = P.xf(P.rbox((0.06, 0.07, L), 0.015, 1), r=(0, 30, 0), t=(-0.13 * math.cos(math.radians(30)), -0.018,
                                                                       0.13 * math.sin(math.radians(30))))
        add("caliper-" + tag, at_wheel(cal, w), CALIPER, "caliper", roughness=0.4)

    return p, {
        "paint": tex("noise", [PAINT, "#2A63A6", "#3A7AC2"], 0.6, detail=0.15),
        "trim": tex("noise", [TRIM, "#222222", "#343434"], 0.4, detail=0.3),
        "glass": tex("noise", [GLASS, "#16202A", "#2C3A47"], 0.8, detail=0.2),
        "lens": tex("gradient", [LENS, "#C9D3DA", "#FFFFFF"], 0.3),
        "tail": tex("stripes", [TAIL, "#8A0F13", "#D02A2E"], 0.1),
        "grille": tex("grid", [TRIM, "#121212", "#3A3A3A"], 0.05),
        "plate": tex("noise", [PLATE, "#E2E2E2"], 0.3, detail=0.1),
        "chrome": tex("brushed", [CHROME, "#9DA2A8", "#E4E7EA"], 0.5),
        "rubber": tex("grip", [RUBBER, "#2E2E2E", "#454545"], 0.2),
        "rim": tex("brushed", [RIM, "#8E949A", "#C4C8CC"], 0.4),
        "disc": tex("brushed", [DISC, "#5E5E5E", "#8A8A8A"], 0.2),
        "caliper": tex("noise", [CALIPER, "#901818", "#C43030"], 0.3, detail=0.2),
    }


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
               "camera": {"pos": [6, 3, 7], "target": [0, 0.7, 0], "fov": 50, "ortho": False}}
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
    here = os.path.dirname(os.path.abspath(__file__))
    # whole car = 57 meshes; the 19k Roblox limit is per mesh (floor.json max_tris_per_mesh), not per model
    rc = P.run(out, [NAME], 7, "--check" in a, False, "toon", tri_cap=40000)
    proj = live(out)
    # panel inner faces sit 5 mm inside the body: cut those hidden faces (ids kept) so the phone depth check passes
    fx = os.path.join(out, "fix")
    rc |= subprocess.call([sys.executable, os.path.join(here, "..", "..", "zfight", "zfight.py"), "fix", proj,
                           os.path.join(out, "geo"), fx, "--prop"], stdout=subprocess.DEVNULL)
    for f in os.listdir(os.path.join(fx, "geo")):
        if f in (NAME + "-body.json", NAME + "-cabin.json"):
            continue  # cut smooth lofts lost their box UVs (rendered white, 2026-11-23); the panels' cuts suffice
        os.replace(os.path.join(fx, "geo", f), os.path.join(out, "geo", f))
    if "--check" in a:
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "..", "detail", "detail.py"), "check",
                               os.path.join(out, NAME + ".json"), os.path.join(out, "geo"), "--class", "hero"])
        rc |= subprocess.call([sys.executable, os.path.join(here, "..", "..", "zfight", "zfight.py"), "check",
                               proj, os.path.join(out, "geo"), "--prop"])
    return rc


if __name__ == "__main__":
    sys.exit(main())
