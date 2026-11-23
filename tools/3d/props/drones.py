#!/usr/bin/env python3
"""Two sci-fi drones built from two /improve prompts (A/B of the prompt flow).

drone-a = Sonnet-only prompt spec, drone-b = brief + Sonnet prompt spec. Same helpers and craft;
only the spec differs, so the models show what each prompt knew.

python3 drones.py OUT [--check] [--preview]
Writes OUT/<name>/geo, OUT/<name>/<name>.json, OUT/<name>/live/p1.json + m1.json per drone.
--check: mesh check, detail floor --class hero, zfight on each live project.
"""
# @style: realistic
# @model: drone-a | Sci-fi quad drone from the Sonnet-only prompt
# @model: drone-b | Sci-fi recon drone from the brief + Sonnet prompt
# @run: python3 drones.py OUT --check --preview
import json
import math
import os
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P  # noqa: E402
from guns import tex, mk, glow  # noqa: E402

DIAG = [(1, 1), (1, -1), (-1, 1), (-1, -1)]


def cyl(r, h, seg=24, y0=0.0):
    """Closed cylinder along +Y from y0 to y0 + h."""
    return P.lathe([(0, y0), (r, y0), (r, y0 + h), (0, y0 + h)], seg, False)


def ring(r_in, r_out, h, seg=40, bev=0.02):
    """Duct / guard ring: closed CCW (r, y) profile with chamfered lips."""
    b = min(bev, (r_out - r_in) / 3, h / 3)
    prof = [(r_in, -h / 2 + b), (r_in + b, -h / 2), (r_out - b, -h / 2), (r_out, -h / 2 + b),
            (r_out, h / 2 - b), (r_out - b, h / 2), (r_in + b, h / 2), (r_in, h / 2 - b)]
    return P.lathe(prof, seg, True)


def torus(R, r, seg=40):
    return P.lathe(P.torus_profile(R, r, 12), seg, True)


def ball(r, sub=3):
    m = P.icosphere(sub)
    return P.xf(m, s=r)


def blade(L, w, th, twist, r0=0.0):
    """Twisted rotor blade along +X from r0 to r0 + L: pitch twist washes out to the tip."""
    m = P.rbox((L, th, w), min(th, w) * 0.45, 1, (8, 1, 1))
    v = m.v.copy()
    t = (v[:, 0] + L / 2) / L  # 0 at root, 1 at tip
    ang = np.radians(twist * (1 - t))
    taper = 1 - 0.45 * t
    y, z = v[:, 1], v[:, 2] * taper
    v[:, 1] = y * np.cos(ang) - z * np.sin(ang)
    v[:, 2] = y * np.sin(ang) + z * np.cos(ang)
    v[:, 0] += L / 2 + r0
    m.v = v
    return m


def rotor(n, L, w, th, twist, hub_r):
    return P.merge(*[P.xf(blade(L, w, th, twist, hub_r * 0.8), r=(0, k * 360 / n, 0)) for k in range(n)])


def sweep(path, rad, seg=12):
    return P.sweep(np.asarray(path, float), rad, seg, caps="round")


def arm_path(x0, z0, x1, z1, y0, y1, n=6):
    return [(x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * i / (n - 1), z0 + (z1 - z0) * i / (n - 1)) for i in range(n)]


# ---------------------------------------------------------------- drone A (Sonnet-only prompt)
@P.prop("drone-a", "Drone A (Sonnet-only prompt)")
def drone_a(rng):
    PRI, SEC, ACC, TRIM, DARK = "#2B2F36", "#5A626E", "#00E5FF", "#A8B0BA", "#0E1013"
    hull_t, sec_t, dark_t = "hull", "sec", "dark"
    p = [
        mk("hull-core", P.rbox((3.0, 1.2, 4.0), 0.3, 2), PRI, hull_t, metalness=0.8, roughness=0.45),
        mk("top-canopy", P.xf(P.rbox((2.4, 0.6, 3.2), 0.25, 2), t=(0, 0.85, 0)), PRI, hull_t, metalness=0.8, roughness=0.45),
        mk("belly-plate", P.xf(P.rbox((2.6, 0.4, 3.4), 0.15, 2), t=(0, -0.75, 0)), SEC, sec_t, metalness=0.9, roughness=0.35),
    ]
    # arms 3.2 long on the diagonals from the hull edge; motor at the tip
    tip = 1.3 + 3.2 / math.sqrt(2) * 0.85
    for i, (sx, sz) in enumerate(DIAG):
        cx, cz = sx * tip, sz * tip
        p.append(mk("arm-%d" % i, sweep(arm_path(sx * 1.0, sz * 1.4, cx, cz, 0.0, 0.25), np.linspace(0.25, 0.17, 6)),
                    PRI, hull_t, metalness=0.8, roughness=0.45))
        p.append(mk("motor-%d" % i, P.xf(cyl(0.45, 0.7), t=(cx, -0.1, cz)), SEC, sec_t, metalness=0.9, roughness=0.35))
        p.append(mk("rotor-hub-%d" % i, P.xf(cyl(0.175, 0.2), t=(cx, 0.6, cz)), TRIM, sec_t, metalness=0.95, roughness=0.25))
        for k in range(2):
            p.append(mk("blade-%d-%d" % (i, k), P.xf(blade(1.1, 0.35, 0.05, 14, 0.0), r=(0, k * 180 + i * 37, 0), t=(cx, 0.7, cz)),
                        DARK, dark_t, roughness=0.8))
        p.append(glow("guard-ring-%d" % i, P.xf(torus(1.24, 0.06), t=(cx, 0.7, cz)), ACC))
        p.append(glow("led-strip-%d" % i, P.xf(P.rbox((0.1, 0.1, 0.6), 0.03, 1), r=(0, 45 * sx * sz, 0),
                                                  t=(sx * 1.9, 0.48, sz * 2.4)), ACC))
        p.append(mk("landing-leg-%d" % i, P.xf(P.rbox((0.15, 1.0, 0.15), 0.05, 1), t=(sx * 1.1, -1.25, sz * 1.4)),
                    SEC, sec_t, metalness=0.9, roughness=0.35))
    p.append(mk("gimbal-mount", P.xf(P.rbox((0.8, 0.6, 0.8), 0.12, 1), t=(0, -0.95, 1.6)), SEC, sec_t, metalness=0.9))
    p.append(mk("camera-lens", P.merge(P.xf(ball(0.3), t=(0, -1.35, 1.75)),
                                         P.xf(cyl(0.16, 0.2), r=(90, 0, 0), t=(0, -1.35, 2.15))), DARK, dark_t, roughness=0.2))
    for k, x in enumerate((-0.6, 0.6)):
        p.append(mk("vent-grille-%d" % k, P.xf(P.rbox((0.8, 0.05, 0.6), 0.02, 1), t=(x, 1.17, -0.6)), DARK, dark_t))
    P.ground(p)
    return p, {
        hull_t: tex("brushed", [PRI, "#20242A", "#3A3F48"], 2),
        sec_t: tex("brushed", [SEC, "#454C56", "#7A828E"], 3),
        dark_t: tex("carbon", [DARK, "#060708", "#22262C"], 6),
    }


# ---------------------------------------------------------------- drone B (brief + Sonnet prompt)
@P.prop("drone-b", "Drone B (brief + Sonnet prompt)")
def drone_b(rng):
    WHITE, GREY, CARB, ORNG, LENS, CYAN = "#E6E8EB", "#6B7280", "#1C1F24", "#FF7A1A", "#0A0C10", "#3FD8FF"
    D = 2.24  # duct centre offset on x and z (6.2 overall width, duct outer r 0.86)
    p = [
        # lozenge hull: rounded box, nose and tail pinched
        mk("core-hull", P.xf(P.rbox((2.6, 0.9, 3.2), 0.38, 2), s=(1, 1, 1)), WHITE, "shell", roughness=0.35, metalness=0.1),
        mk("top-canopy", P.xf(P.slab(0.9, 1.1, 0.25, 0.35, 0.06, 2), r=(-90, 0, 0), t=(0, 0.5, -0.05)), GREY, "panel",
           roughness=0.5, metalness=0.6),
        mk("battery-pack", P.xf(P.rbox((1.2, 0.5, 1.6), 0.08, 1), t=(0, -0.68, -0.2)), CARB, "carbon", roughness=0.6, metalness=0.2),
        mk("gimbal-yoke", P.merge(P.xf(P.rbox((0.7, 0.1, 0.3), 0.03, 1), t=(0, -0.48, 1.25)),
                                   P.xf(P.rbox((0.08, 0.55, 0.3), 0.03, 1), t=(-0.33, -0.73, 1.25)),
                                   P.xf(P.rbox((0.08, 0.55, 0.3), 0.03, 1), t=(0.33, -0.73, 1.25))), GREY, "panel", metalness=0.6),
        mk("sensor-ball", P.xf(ball(0.29), t=(0, -0.88, 1.27)), WHITE, "shell", roughness=0.35),
        mk("lens-main", P.xf(cyl(0.12, 0.08), r=(90, 0, 0), t=(0.08, -0.88, 1.6)), LENS, "lens", roughness=0.1),
        mk("lens-ir", P.xf(cyl(0.07, 0.08), r=(90, 0, 0), t=(-0.12, -0.8, 1.58)), LENS, "lens", roughness=0.1),
    ]
    for k, sx in enumerate((-1, 1)):
        path = [(sx * 0.45, -0.9, -0.6), (sx * 0.6, -1.15, -0.6), (sx * 0.75, -1.3, -0.9),
                (sx * 0.75, -1.33, 0.0), (sx * 0.75, -1.3, 0.9), (sx * 0.6, -1.15, 0.6), (sx * 0.45, -0.9, 0.6)]
        p.append(mk("landing-skid-%d" % k, sweep(path, 0.04, 10), CARB, "carbon", roughness=0.6))
        p.append(mk("antenna-%d" % k, P.xf(cyl(0.02, 0.6, 8), r=(-15, 0, sx * 12), t=(sx * 0.35, 0.56, -1.0)), GREY, "panel",
                    metalness=0.6))
        p.append(mk("hull-stripe-%d" % k, P.xf(P.rbox((0.04, 0.12, 2.2), 0.015, 1), t=(sx * 1.31, 0.05, 0)), ORNG, "accent"))
    for i, (sx, sz) in enumerate(DIAG):
        cx, cz = sx * D, sz * D
        p += [
            mk("arm-%d" % i, sweep(arm_path(sx * 0.7, sz * 0.7, cx - sx * 0.62, cz - sz * 0.62, 0.05, 0.12), np.linspace(0.175, 0.12, 6)),
               CARB, "carbon", roughness=0.6),
            mk("arm-tip-band-%d" % i, P.xf(cyl(0.135, 0.14, 16), r=(0, 0, 90), t=(0, 0, 0)), ORNG, "accent"),
            mk("fan-duct-%d" % i, P.xf(ring(0.68, 0.8, 0.4), t=(cx, 0.12, cz)), WHITE, "shell", roughness=0.35),
            mk("motor-hub-%d" % i, P.xf(cyl(0.2, 0.3), t=(cx, -0.08, cz)), GREY, "panel", metalness=0.6),
            mk("rotor-%d" % i, P.xf(rotor(3, 0.5, 0.16, 0.03, 18, 0.2), r=(0, i * 23, 0), t=(cx, 0.24, cz)), CARB, "carbon"),
            mk("duct-struts-%d" % i, P.merge(*[P.xf(P.rbox((0.7, 0.06, 0.06), 0.02, 1), r=(0, a, 0),
                                                    t=(cx + math.cos(math.radians(-a)) * 0.45, 0.0, cz + math.sin(math.radians(-a)) * 0.45))
                                               for a in (90, 210, 330)]), GREY, "panel", metalness=0.6),
            glow("status-light-%d" % i, P.xf(P.rbox((0.1, 0.05, 0.3), 0.025, 1), r=(0, 45 * sx * sz, 0),
                                             t=(sx * 0.95, 0.47, sz * 0.95)), CYAN),
            glow("thruster-glow-%d" % i, P.xf(torus(0.66, 0.03), t=(cx, -0.07, cz)), CYAN),
        ]
        # band sits on the arm near the duct: move it there along the diagonal
        band = p[-7]
        dirn = np.array([sx, 0, sz]) / math.sqrt(2)
        pos = np.array([cx, 0.115, cz]) - dirn * 0.78
        band["mesh"] = P.xf(cyl(0.135, 0.14, 16), r=(0, -math.degrees(math.atan2(sz, sx)), 0), t=(0, 0, 0))
        band["mesh"] = P.xf(P.xf(cyl(0.135, 0.14, 16, -0.07), r=(0, 0, 90)), r=(0, -math.degrees(math.atan2(sz, sx)), 0), t=pos)
        P.box_uv(band["mesh"], 3)
    P.ground(p)
    return p, {
        "shell": tex("noise", [WHITE, "#CDD1D6", "#F4F5F7"], 2),
        "panel": tex("brushed", [GREY, "#555C68", "#8A919C"], 3),
        "carbon": tex("carbon", [CARB, "#121418", "#2C3038"], 6),
        "accent": tex("stripes", [ORNG, "#E0600C", "#FF9A4D"], 1),
        "lens": tex("gradient", [LENS, "#000000", "#1E2A3A"], 1),
    }


# ---------------------------------------------------------------- drone C (Fable 5.2 medium prompt)
@P.prop("drone-c", "Drone C (Fable medium prompt)")
def drone_c(rng):
    PRI, SEC, ACC, TRIM, DARK, GLASS, EMI = "#2B2F36", "#8A9099", "#E8622A", "#C9CED6", "#0E1013", "#10202B", "#35D6FF"
    D = 2.9  # duct centre on x and z: 8.0 overall, duct outer r 1.1
    hull = P.rbox((3.6, 1.0, 4.4), 0.08, 2, (4, 2, 6))
    v = hull.v
    front = np.clip(-v[:, 2] / 2.2, 0, 1)  # front faces -Z: wedge thins toward the nose
    v[:, 1] = v[:, 1] * (1 - 0.4 * front) - 0.15 * front
    hull.v = v
    p = [
        mk("hull-core", hull, PRI, "armor", roughness=0.45, metalness=0.7),
        mk("top-armor-plate", P.xf(P.slab(1.5, 1.7, 0.2, 0.25, 0.05, 2), r=(-90, 0, 0), t=(0, 0.58, 0.3)), PRI, "armor",
           roughness=0.45, metalness=0.7),
        mk("canopy", P.xf(ball(1.0), s=(0.8, 0.5, 1.0), t=(0, 0.68, 0.4)), GLASS, "glass", roughness=0.08, metalness=0.3),
        mk("sensor-pod", P.merge(P.xf(ball(0.42), t=(0, -0.1, -2.35)),
                                  P.xf(ring(0.42, 0.5, 0.16, 32), r=(90, 0, 0), t=(0, -0.1, -2.3))), SEC, "metal",
           roughness=0.35, metalness=0.85),
        glow("sensor-eye", P.xf(cyl(0.3, 0.1, 32), r=(90, 0, 0), t=(0, -0.1, -2.7)), EMI),
    ]
    for k, sx in enumerate((-1, 1)):
        path = [(sx * 0.8, -0.45, -1.2), (sx * 1.0, -0.9, -1.3), (sx * 1.1, -1.25, -1.5),
                (sx * 1.1, -1.28, 0.0), (sx * 1.1, -1.25, 1.5), (sx * 1.0, -0.9, 1.3), (sx * 0.8, -0.45, 1.2)]
        p.append(mk("landing-skid-%d" % k, sweep(path, 0.1, 10), SEC, "metal", roughness=0.35, metalness=0.85))
        slats = P.merge(*[P.xf(P.rbox((0.1, 0.05, 1.2), 0.02, 1), r=(-20, 0, 0), t=(0, -0.2 + j * 0.1, 0)) for j in range(5)])
        p.append(mk("side-vent-%d" % k, P.xf(slats, t=(sx * 1.83, 0.05, 0.6)), DARK, "dark", roughness=0.8))
        rod = P.merge(cyl(0.08, 0.1, 8), P.xf(P.lathe([(0, 0), (0.04, 0), (0.015, 0.9), (0, 0.9)], 8), t=(0, 0.1, 0)))
        p.append(mk("antenna-%d" % k, P.xf(rod, t=(sx * 0.6, 0.66, 1.5)), TRIM, "metal", roughness=0.25, metalness=0.9))
        p.append(mk("hull-stripe-%d" % k, P.xf(P.rbox((0.04, 0.12, 2.6), 0.015, 1), t=(sx * 1.82, 0.32, 0.2)), ACC, "accent"))
    for i, (sx, sz) in enumerate(DIAG):
        cx, cz = sx * D, sz * D
        yaw = -math.degrees(math.atan2(sz, sx))
        p += [
            mk("arm-%d" % i, sweep(arm_path(sx * 1.5, sz * 1.9, cx - sx * 0.72, cz - sz * 0.72, 0.0, 0.05),
                                   np.linspace(0.24, 0.17, 6)), SEC, "metal", roughness=0.35, metalness=0.85),
            mk("duct-ring-%d" % i, P.xf(ring(0.95, 1.1, 0.7, 48, 0.05), t=(cx, 0.05, cz)), PRI, "armor", roughness=0.45, metalness=0.7),
            mk("motor-hub-%d" % i, P.xf(cyl(0.25, 0.6), t=(cx, -0.3, cz)), TRIM, "metal", roughness=0.25, metalness=0.9),
            mk("duct-lip-mark-%d" % i, P.xf(P.rbox((0.3, 0.04, 0.12), 0.015, 1), r=(0, yaw + 180, 0),
                                            t=(cx - sx * 0.73, 0.41, cz - sz * 0.73)), ACC, "accent"),
            # one strip per hull edge: right, left, rear, front-top
            glow("status-strip-%d" % i, P.xf(P.rbox((0.08, 0.08, 1.4), 0.03, 1), r=(0, (0, 0, 90, 90)[i], 0),
                                             t=((1.84, 0.12, 0.9), (-1.84, 0.12, 0.9), (0, 0.12, 2.24), (0, -0.05, -2.1))[i]), EMI),
        ]
        for k in range(3):
            a = k * 120 + i * 17
            p.append(mk("rotor-blade-%d-%d" % (i, k), P.xf(blade(0.65, 0.25, 0.06, 16, 0.2), r=(0, a, 0), t=(cx, 0.15, cz)),
                        DARK, "dark", roughness=0.8))
            p.append(mk("duct-spoke-%d-%d" % (i, k), P.xf(P.rbox((0.7, 0.08, 0.1), 0.02, 1), r=(0, a + 60, 0),
                                                         t=(cx + math.cos(math.radians(-(a + 60))) * 0.6, -0.15,
                                                            cz + math.sin(math.radians(-(a + 60))) * 0.6)), SEC, "metal",
                        roughness=0.35, metalness=0.85))
    hexb = P.lathe([(0, 0), (0.05, 0), (0.05, 0.04), (0, 0.05)], 6, False)
    spots = [(x, 0.69, z) for x in (-1.3, 1.3) for z in (-1.2, 1.8)]
    for sx, sz in DIAG:
        for t in (0.25, 0.55):
            spots += [(sx * (1.5 + (D - 0.72 - 1.5) * t) + sz * 0.0, 0.25, sz * (1.9 + (D - 0.72 - 1.9) * t))]
        spots += [(sx * 1.55, 0.25, sz * 1.95)]
    spots += [(sx * 1.1, -1.2, z) for sx in (-1, 1) for z in (-0.8, 0.8)]
    spots += [(sx * 0.9, 0.69, -0.9) for sx in (-1, 1)]
    for k, s in enumerate(spots[:24]):
        p.append(mk("bolt-%02d" % k, P.xf(hexb, t=s), SEC, "metal", roughness=0.35, metalness=0.85))
    P.ground(p)
    return p, {
        "armor": tex("brushed", [PRI, "#20242A", "#3A3F48"], 2),
        "metal": tex("brushed", [SEC, "#6E747D", "#A9AFB7"], 3),
        "dark": tex("carbon", [DARK, "#060708", "#22262C"], 6),
        "accent": tex("stripes", [ACC, "#C24E1E", "#FF8A55"], 1),
        "glass": tex("gradient", [GLASS, "#05090D", "#2A4456"], 1),
    }


def live(out, name, title):
    t = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    d = json.load(open(os.path.join(out, name + ".json")))
    os.makedirs(os.path.join(out, "live"), exist_ok=True)
    doc = {"name": title, "v": 1, "updated": t, "objects": d["objects"], "textures": d.get("textures", {}), "anims": {},
           "camera": {"pos": [7, 5, 9], "target": [0, 1, 0], "fov": 50, "ortho": False}}
    json.dump(doc, open(os.path.join(out, "live", "p1.json"), "w"), separators=(",", ":"))
    json.dump({"name": title, "updated": t, "count": len(d["objects"]), "ai": True, "building": False},
              open(os.path.join(out, "live", "m1.json"), "w"), separators=(",", ":"))
    return os.path.join(out, "live", "p1.json")


def main(argv=None):
    a = sys.argv[1:] if argv is None else argv
    if not a:
        sys.exit(__doc__)
    here = os.path.dirname(os.path.abspath(__file__))
    rc = 0
    for name in ("drone-a", "drone-b", "drone-c"):
        out = os.path.join(a[0], name)
        os.makedirs(out, exist_ok=True)
        rc |= P.run(out, [name], 7, "--check" in a, "--preview" in a, "toon", tri_cap=19000)
        proj = live(out, name, P.PROPS[name][0])
        if "--check" in a:
            rc |= subprocess.call([sys.executable, os.path.join(here, "..", "detail", "detail.py"), "check",
                                   os.path.join(out, name + ".json"), os.path.join(out, "geo"), "--class", "hero"])
            rc |= subprocess.call([sys.executable, os.path.join(here, "..", "zfight", "zfight.py"), "check",
                                   proj, os.path.join(out, "geo"), "--prop"])
    return rc


if __name__ == "__main__":
    sys.exit(main())
