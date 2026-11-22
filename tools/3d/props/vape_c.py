"""Mech-mod vape: tube mod + rebuildable dripping atomiser (original design)."""
import math

import numpy as np

import props as P

STEEL, BRASS, DARK = "#B9C0CA", "#C99B4A", "#1E2026"


def L(pts, rad, seg=48, closed=False, **kw):
    return P.lathe(P.fillet(pts, rad, 1, closed), seg, closed, **kw)


def knurl(n, y0, y1, amp=0.011):
    return lambda th, Y, R: R * (1 + amp * np.cos(th * n) * ((Y > y0 + 0.014) & (Y < y1 - 0.014)))


def radial(m, a, r, y):
    """Place a +Z-facing mesh on the cylinder at angle a (rad), radius r, height y."""
    return P.xf(m, r=(0, math.degrees(a), 0), t=(r * math.sin(a), y, r * math.cos(a)))


@P.prop("mech-mod", "Mech mod")
def mech_mod(rng):
    A, T = 0.74, 1.135  # airflow ring bottom, drip tip base
    # --- tube with engraved grooves
    pr, rd = [(0, 0.08), (0.18, 0.08)], [0, 0.012]
    for g in (0.165, 0.19, 0.575, 0.628):
        pr += [(0.18, g - 0.008), (0.172, g - 0.004), (0.172, g + 0.004), (0.18, g + 0.008)]
        rd += [0] * 4
    pr += [(0.18, 0.64), (0, 0.64)]
    rd += [0.01, 0]
    tube = P.box_uv(L(pr, rd, 40), 2)
    sleeve = P.box_uv(L([(0.17, 0.24), (0.195, 0.24), (0.195, 0.46), (0.17, 0.46)], 0.011, 40, True), 2)
    bands = P.merge(*[L([(0.17, y - 0.009), (0.192, y - 0.009), (0.192, y + 0.009), (0.17, y + 0.009)],
                        0, 40, True) for y in (0.222, 0.47)])
    kn = P.box_uv(L([(0.17, 0.48), (0.205, 0.48), (0.205, 0.56), (0.17, 0.56)], 0.012, 64, True,
                    rmod=knurl(16, 0.48, 0.56)), 2)
    lock = P.box_uv(L([(0.17, 0.06), (0.19, 0.06), (0.19, 0.14), (0.17, 0.14)], 0.012, 64, True,
                      rmod=knurl(18, 0.06, 0.14, 0.01)), 2)
    btn = P.box_uv(L([(0, 0), (0.07, 0), (0.1, 0.03), (0.1, 0.09), (0, 0.09)], [0, 0.02, 0.02, 0.01, 0], 40), 2)
    cap = P.box_uv(L([(0, 0.64), (0.2, 0.64), (0.2, 0.7), (0, 0.7)], [0, 0.015, 0.015, 0], 40), 2)
    pin = P.box_uv(L([(0, 0.69), (0.045, 0.69), (0.045, 0.745), (0, 0.745)], [0, 0, 0.006, 0], 24), 2)
    vents = P.merge(*[radial(P.xf(L([(0, 0), (0.014, 0), (0.014, 0.012), (0, 0.016)], [0, 0, 0.004, 0], 12),
                                  r=(90, 0, 0)), a, 0.176, 0.60)
                      for a in np.arange(6) * math.pi / 3 + 0.3])
    # --- atomiser
    ring = P.box_uv(L([(0.17, A), (0.215, A), (0.215, A + 0.08), (0.17, A + 0.08)], 0.012, 40, True), 2)
    slots = P.merge(*[radial(P.rbox((0.09, 0.025, 0.02), 0.008, 1), a, 0.2175, A + 0.04)
                      for a in np.arange(4) * math.pi / 2 + math.pi / 4])
    deck = P.box_uv(L([(0, 0.80), (0.195, 0.80), (0.195, 0.87), (0.16, 0.87), (0.13, 0.845), (0, 0.845)],
                      [0, 0, 0.008, 0.01, 0.015, 0], 40), 2)
    juice = L([(0, 0.842), (0.11, 0.842), (0.11, 0.852), (0, 0.857)], [0, 0, 0.006, 0], 32)
    posts, coils, wicks = [], [], []
    for zc in (-0.06, 0.06):
        for sx in (-1, 1):
            posts.append(P.xf(L([(0, 0.84), (0.04, 0.84), (0.04, 0.96), (0.03, 0.975), (0, 0.975)],
                                [0, 0, 0.01, 0.01, 0], 16), t=(sx * 0.11, 0, zc)))
        t = np.linspace(0, 1, 44)
        ph = 2 * math.pi * 6 * t + 0.4
        path = np.column_stack([-0.105 + 0.21 * t, 0.93 + 0.034 * np.cos(ph), zc + 0.034 * np.sin(ph)])
        coils.append(P.sweep(path, 0.0085, 5))
        wp = np.array([(-0.14, 0.865), (-0.11, 0.915), (-0.05, 0.93), (0.05, 0.93), (0.11, 0.915), (0.14, 0.865)])
        wp = np.column_stack([wp[:, 0], wp[:, 1], np.full(6, zc)])
        wicks.append(P.box_uv(P.sweep(wp, 0.022, 10), 6))
    posts = P.box_uv(P.merge(*posts), 2)
    pillars = P.box_uv(P.merge(*[P.sweep([(0.185 * math.cos(a), y, 0.185 * math.sin(a)) for y in (0.8, 0.93, 1.07)],
                                         0.028, 12, caps="flat")
                                 for a in np.arange(6) * math.pi / 3 + math.pi / 6]), 2)
    ucap = P.box_uv(L([(0, 1.06), (0.215, 1.06), (0.215, 1.115), (0.17, 1.142), (0, 1.142)],
                      [0, 0.012, 0.02, 0.02, 0], 40), 2)
    d = lambda y: T + y
    tip = L([(0.058, d(0)), (0.11, d(0)), (0.11, d(0.04)), (0.078, d(0.07)), (0.078, d(0.16)),
             (0.098, d(0.19)), (0.098, d(0.225)), (0.058, d(0.225))],
            [0, 0.006, 0.012, 0.012, 0.012, 0.014, 0.006, 0.006], 28, True)
    oring = L(P.torus_profile(0.082, 0.012, 8) + (0, d(0.115)), 0, 28, True)
    parts = [
        P.part("tube", tube, STEEL, texture="steel", roughness=0.35, metalness=0.75),
        P.part("grip", sleeve, "#2F6FA8", texture="wood", roughness=0.45, metalness=0.1),
        P.part("bands", bands, BRASS, texture="brass", roughness=0.3, metalness=0.8),
        P.part("knurl", kn, STEEL, texture="steel", roughness=0.4, metalness=0.75),
        P.part("lockring", lock, BRASS, texture="brass", roughness=0.35, metalness=0.8),
        P.part("button", btn, "#22252C", texture="carbon", roughness=0.4, metalness=0.3),
        P.part("vents", vents, DARK, roughness=0.8),
        P.part("topcap", cap, "#22252C", texture="carbon", roughness=0.4, metalness=0.3),
        P.part("pin", pin, BRASS, texture="brass", roughness=0.3, metalness=0.85),
        P.part("airflow", ring, BRASS, texture="brass", roughness=0.35, metalness=0.8),
        P.part("airslots", slots, DARK, roughness=0.8),
        P.part("deck", deck, STEEL, texture="steel", roughness=0.35, metalness=0.75),
        P.part("juice", juice, "#E8A53A", roughness=0.1, transparency=0.5),
        P.part("posts", posts, BRASS, texture="brass", roughness=0.3, metalness=0.85),
        P.part("coils", P.merge(*coils), "#D9A441", texture="brass", roughness=0.3, metalness=0.8),
        P.part("wicks", P.merge(*wicks), "#F2EBDD", texture="cotton", roughness=0.95),
        P.part("pillars", pillars, STEEL, texture="steel", roughness=0.35, metalness=0.75),
        P.part("atomcap", ucap, STEEL, texture="steel", roughness=0.35, metalness=0.75),
        P.part("driptip", tip, "#6B3FA0", roughness=0.25),
        P.part("oring", oring, "#D8402F", roughness=0.6),
    ]
    P.ground(parts)
    tx = lambda pat, cols, sc: {"kind": "procedural", "pattern": pat, "colors": cols, "scale": sc}
    return parts, {
        "steel": tx("brushed", [STEEL, "#8A919C", "#E3E7EC"], 4),
        "brass": tx("brushed", [BRASS, "#8F6A28", "#E8C27A"], 4),
        "wood": tx("woodgrain", ["#2F6FA8", "#183B63", "#7FB3E0"], 3),
        "carbon": tx("carbon", ["#22252C", "#111318", "#3A3F4B"], 3),
        "cotton": tx("fabric", ["#F2EBDD", "#CFC4AE", "#FFFFFF"], 5),
    }
