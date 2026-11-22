"""Realistic 1.40 x 0.70 m oak desk on a black steel frame (1 unit = 1 m, Y up, origin = floor under desk centre, user at +Z)."""
# @style: realistic
# @model: desk | 1.40 x 0.70 m oak desk on black steel frame
# @run: python3 setup.py OUT --check
import os, sys, math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P  # noqa: E402
import house as H  # noqa: E402

STEEL, BLACK = "#2B2D30", "#141516"


def parts():
    p = []
    p.append(H.mk("desk-top", P.xf(P.rbox((1.40, 0.03, 0.70), 0.006, seg=2), t=(0, 0.735, 0)), "#7A5536", "desk_oak", roughness=0.55))
    pts = [(sx * 0.64, sz * 0.29) for sx in (1, -1) for sz in (1, -1)]
    legs = P.merge(*[P.xf(P.rbox((0.05, 0.628, 0.05), 0.006, seg=2), t=(x, 0.326, z)) for x, z in pts])
    p.append(H.mk("desk-legs", legs, STEEL, "desk_steel", metalness=0.6, roughness=0.4))
    ap = [H.box(-0.62, 0.62, 0.64, 0.722, sz * 0.29 - 0.015, sz * 0.29 + 0.015) for sz in (1, -1)]
    ap += [H.box(sx * 0.64 - 0.015, sx * 0.64 + 0.015, 0.64, 0.722, -0.265, 0.265) for sx in (1, -1)]
    p.append(H.mk("desk-apron", P.merge(*ap), STEEL, "desk_steel", metalness=0.6, roughness=0.4))
    feet = P.merge(*[H.cyl((x, 0, z), (x, 0.012, z), 0.022, 12) for x, z in pts])
    p.append(H.mk("desk-feet", feet, BLACK, "desk_rubber", roughness=0.9))
    tray = P.merge(H.box(-0.45, 0.45, 0.60, 0.605, -0.28, -0.18),
                   H.box(-0.45, 0.45, 0.605, 0.722, -0.285, -0.28),
                   H.box(-0.45, 0.45, 0.605, 0.63, -0.185, -0.18))
    p.append(H.mk("desk-tray", tray, STEEL, "desk_steel", metalness=0.6, roughness=0.4))
    p.append(H.mk("desk-grommet", H.cyl((0.45, 0.745, -0.28), (0.45, 0.751, -0.28), 0.03, 12), "#1A1A1C", "desk_rubber"))
    return p, {"desk_oak": H.tex("woodgrain", ["#7A5536", "#5A3B22", "#9A7350"], 0.9),
               "desk_steel": H.tex("brushed", ["#2B2D30", "#1E2022", "#4A4E53"], 1.0),
               "desk_rubber": H.tex("noise", ["#141516", "#1E1F21"], 0.05, detail=0.3)}
