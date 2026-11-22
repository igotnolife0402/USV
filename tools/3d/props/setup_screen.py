"""Realistic desk setup pieces (1 unit = 1 m): 27 in monitor on stand, TKL keyboard, mouse.

Origin = floor under desk centre, desk top surface y=0.75, user at +Z. parts() -> (parts, textures).
"""
# @style: realistic
# @model: monitor, keyboard, mouse | 27 in monitor on stand, TKL keyboard, mouse
# @run: python3 setup.py OUT --check
import os
import sys
import math

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P  # noqa: E402
import house as H  # noqa: E402


def frame_xy(x0, x1, y0, y1, z0, z1, wl, wr, wt, wb):
    """Four bars, no overlaps: full-height sides, top/bottom between them."""
    return P.merge(
        H.box(x0, x0 + wl, y0, y1, z0, z1), H.box(x1 - wr, x1, y0, y1, z0, z1),
        H.box(x0 + wl, x1 - wr, y1 - wt, y1, z0, z1), H.box(x0 + wl, x1 - wr, y0, y0 + wb, z0, z1))


def frame_xz(x0, x1, y0, y1, z0, z1, w):
    return P.merge(
        H.box(x0, x0 + w, y0, y1, z0, z1), H.box(x1 - w, x1, y0, y1, z0, z1),
        H.box(x0 + w, x1 - w, y0, y1, z1 - w, z1), H.box(x0 + w, x1 - w, y0, y1, z0, z0 + w))


def keys():
    out = []
    cw, cd, px, pz = 0.0225, 0.0165, 0.0254, 0.0175
    for r in range(6):
        z = 0.083 + r * pz
        for c in range(15):
            x = -0.256 + c * px
            if r == 5 and 4 <= c <= 10:
                if c == 4:
                    out.append(H.box(x, -0.256 + 10 * px + cw, 0.768, 0.784, z, z + cd))
                continue
            out.append(H.box(x, x + cw, 0.768, 0.784, z, z + cd))
    return P.merge(*out)


def parts():
    tx = {
        "scr_metal": H.tex("brushed", ["#2A2B2E", "#1F2023", "#4A4D52"], 1.0),
        "scr_plastic": H.tex("noise", ["#1C1D1F", "#26272A"], 0.2, detail=0.3),
        "scr_rubber": H.tex("grip", ["#3A3C40", "#2A2B2E"], 0.004),
        "scr_screen": H.tex("gradient", ["#0D1424", "#1E3456", "#3A5F8C"], 0.6, detail=0.2),
        "scr_keys": H.tex("noise", ["#3A3C40", "#323438"], 0.1, detail=0.2),
    }
    p = [
        H.mk("mon-base", P.xf(P.rbox((0.26, 0.014, 0.19), 0.007), t=(0, 0.757, -0.19)), "#2A2B2E", "scr_metal",
             metalness=0.5, roughness=0.35),
        H.mk("mon-neck", P.xf(P.rbox((0.05, 0.30, 0.035), 0.008), t=(0, 0.905, -0.215)), "#2A2B2E", "scr_metal",
             metalness=0.5),
        H.mk("mon-back", P.xf(P.slab(0.20, 0.13, 0.035, 0.02, 0.01), t=(0, 1.07, -0.185)), "#1C1D1F", "scr_plastic",
             roughness=0.6),
        H.mk("mon-bezel", frame_xy(-0.3075, 0.3075, 0.89, 1.255, -0.167, -0.147, 0.006, 0.006, 0.006, 0.022),
             "#151618", "scr_plastic", roughness=0.5),
        H.mk("mon-panel", H.box(-0.3015, 0.3015, 0.912, 1.249, -0.167, -0.152), "#16223A", "scr_screen",
             roughness=0.15, metalness=0.1),
        H.mk("kb-case", P.xf(P.rbox((0.44, 0.022, 0.13), 0.005, seg=2), t=(-0.05, 0.763, 0.135)), "#2A2B2E", "scr_metal",
             metalness=0.4),
        H.mk("kb-keys", keys(), "#3A3C40", "scr_keys", roughness=0.7),
        H.mk("kb-feet", P.merge(*[H.box(x, x + 0.02, 0.750, 0.752, z, z + 0.01)
                                  for x in (-0.27, 0.15) for z in (0.07, 0.19)]), "#111111", None),
        H.mk("mouse-body", P.xf(P.rbox((0.064, 0.038, 0.118), 0.018), t=(0.34, 0.769, 0.14)), "#232427",
             "scr_plastic", roughness=0.55),
        H.mk("mouse-wheel", H.cyl((0.333, 0.786, 0.105), (0.347, 0.786, 0.105), 0.009, 12), "#3A3C40", "scr_rubber",
             roughness=0.8),
    ]
    return p, tx
