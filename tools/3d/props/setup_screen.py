"""Realistic desk setup pieces (1 unit = 1 m): 27 in monitor on riser, light bar, speakers, 75% keyboard, wrist rest, mouse.

Origin = floor under desk centre, desk mat top y=0.764, riser top y=0.897, user at +Z. parts() -> (parts, textures).
"""
# @style: realistic
# @model: monitor, light bar, speakers, keyboard, wrist rest, mouse | 27 in thin-bezel monitor on riser, 75% two-tone keyboard
# @run: python3 setup.py OUT --check
import os
import sys
import math

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P  # noqa: E402
import house as H  # noqa: E402


def rbox(s, r, c):
    return P.xf(P.rbox(s, r, seg=2), t=c)


def keys():
    norm, mods = [], []
    for r in range(6):
        z = 0.0675 + r * 0.0175
        for c in range(13):
            x = -0.3125 + c * 0.0235
            if r == 5 and 3 <= c <= 9:
                if c != 3:
                    continue
                box = H.box(x, -0.3125 + 9 * 0.0235 + 0.021, 0.782, 0.798, z, z + 0.0155)
                norm.append(box)
                continue
            box = H.box(x, x + 0.021, 0.782, 0.798, z, z + 0.0155)
            (mods if (r == 0 or c in (0, 12) or r == 5) else norm).append(box)
    return P.merge(*norm), P.merge(*mods)


def parts():
    tx = {
        "scr_alu": H.tex("brushed", ["#C8CCD2", "#A9AEB5", "#E2E5E8"], 0.3),
        "scr_plastic": H.tex("noise", ["#1C1D1F", "#26272A"], 0.2, detail=0.3),
        "scr_screen": H.tex("gradient", ["#F2B37A", "#7FA7D1", "#2F5F8F"], 0.4, detail=0.2),
        "scr_white": H.tex("noise", ["#EDEDEB", "#E3E3E1"], 0.2, detail=0.15),
        "scr_cone": H.tex("noise", ["#2A2B2E", "#1E1F21"], 0.02),
        "scr_cream": H.tex("noise", ["#E9E6DF", "#DDD9D0"], 0.2, detail=0.15),
        "scr_sage": H.tex("noise", ["#8DA889", "#7E9A7A"], 0.1, detail=0.15),
        "scr_walnut": H.tex("woodgrain", ["#B07A45", "#8C5A30", "#C9955E"], 0.6),
        "scr_rubber": H.tex("grip", ["#3A3C40", "#2A2B2E"], 0.004),
    }
    kn, km = keys()
    drivers = []
    for x in (-0.53, 0.29):
        drivers.append(H.cyl((x, 0.95, -0.166), (x, 0.95, -0.160), 0.035, 16))
        drivers.append(H.cyl((x, 1.015, -0.166), (x, 1.015, -0.160), 0.015, 16))
    p = [
        H.mk("mon-base", rbox((0.24, 0.012, 0.16), 0.04, (-0.12, 0.902, -0.20)), "#C8CCD2", "scr_alu",
             metalness=0.8, roughness=0.3),
        H.mk("mon-neck", rbox((0.045, 0.26, 0.025), 0.01, (-0.12, 1.03, -0.255)), "#C8CCD2", "scr_alu",
             metalness=0.8, roughness=0.3),
        H.mk("mon-back", P.xf(P.slab(0.24, 0.15, 0.03, 0.03, 0.012), t=(-0.12, 1.16, -0.235)), "#2A2B2E",
             "scr_plastic"),
        H.mk("mon-shell", P.xf(P.slab(0.3075, 0.18, 0.014, 0.016, 0.005, nb=2), t=(-0.12, 1.17, -0.212)), "#16171A",
             "scr_plastic", roughness=0.4),
        H.mk("mon-panel", H.box(-0.4225, 0.1825, 1.0, 1.344, -0.207, -0.205), "#7FA7D1", "scr_screen",
             roughness=0.2, emissive="#6E93BE", emissiveIntensity=0.35),
        H.mk("mon-lightbar", P.merge(H.cyl((-0.37, 1.365, -0.215), (0.13, 1.365, -0.215), 0.011, 12),
                                     H.box(-0.14, -0.10, 1.335, 1.37, -0.235, -0.20)), "#1C1D1F", "scr_plastic"),
        H.mk("speakers", P.merge(rbox((0.10, 0.15, 0.11), 0.012, (-0.53, 0.971, -0.22)),
                                 rbox((0.10, 0.15, 0.11), 0.012, (0.29, 0.971, -0.22))), "#EDEDEB", "scr_white",
             roughness=0.4),
        H.mk("spk-drivers", P.merge(*drivers), "#2A2B2E", "scr_cone"),
        H.mk("kb-case", rbox((0.33, 0.022, 0.125), 0.006, (-0.16, 0.775, 0.12)), "#E9E6DF", "scr_cream"),
        H.mk("kb-keys", kn, "#E9E6DF", "scr_cream", roughness=0.6),
        H.mk("kb-mods", km, "#8DA889", "scr_sage", roughness=0.6),
        H.mk("kb-rest", rbox((0.33, 0.016, 0.07), 0.008, (-0.16, 0.772, 0.225)), "#B07A45", "scr_walnut"),
        H.mk("mouse-body", P.xf(P.rbox((0.062, 0.036, 0.115), 0.02), t=(0.16, 0.782, 0.14)), "#EDEDEB",
             "scr_white"),
        H.mk("mouse-wheel", H.cyl((0.153, 0.80, 0.105), (0.167, 0.80, 0.105), 0.008, 12), "#3A3C40", "scr_rubber"),
    ]
    return p, tx
