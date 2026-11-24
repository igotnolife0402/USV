"""Realistic 1.40 x 0.70 m butcher-block standing desk with walnut monitor riser and felt desk mat (1 unit = 1 m, Y up, origin = floor under desk centre, user at +Z)."""
# @style: realistic
# @model: standing desk, riser, mat | 1.40 x 0.70 m butcher-block standing desk, walnut monitor riser, felt desk mat
# @run: python3 setup.py OUT --check
import os, sys, math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # props helpers live one level up
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P  # noqa: E402
import house as H  # noqa: E402


def parts():
    p = []
    rb = lambda size, r, t, seg=2: P.xf(P.rbox(size, r, seg=seg), t=t)
    p.append(H.mk("desk-top", rb((1.40, 0.04, 0.70), 0.008, (0, 0.74, 0)), "#C9A270", "desk_oak", roughness=0.5))
    cols = P.merge(*[m for x in (0.58, -0.58) for m in (
        rb((0.08, 0.40, 0.06), 0.006, (x, 0.235, -0.05)),
        rb((0.07, 0.27, 0.05), 0.006, (x, 0.565, -0.05)))])
    p.append(H.mk("desk-columns", cols, "#ECECEA", "desk_white", roughness=0.45))
    feet = P.merge(*[rb((0.07, 0.04, 0.66), 0.012, (x, 0.02, -0.02)) for x in (0.58, -0.58)])
    p.append(H.mk("desk-feet", feet, "#ECECEA", "desk_white", roughness=0.45))
    caps = P.merge(*[rb((0.074, 0.042, 0.03), 0.01, (x, 0.02, z), 1) for x in (0.58, -0.58) for z in (-0.34, 0.30)])
    p.append(H.mk("desk-caps", caps, "#1A1A1A", "desk_black", roughness=0.45))
    frame = P.merge(*[rb((0.05, 0.03, 0.60), 0.004, (x, 0.705, 0), 1) for x in (0.58, -0.58)],
                    rb((1.10, 0.05, 0.05), 0.004, (0, 0.68, -0.05), 1))
    p.append(H.mk("desk-frame", frame, "#ECECEA", "desk_white", roughness=0.45))
    p.append(H.mk("desk-panel", rb((0.10, 0.025, 0.04), 0.004, (0.45, 0.705, 0.33), 1), "#1A1A1A", "desk_black", roughness=0.45))
    btn = P.merge(*[H.box(x0, x0 + 0.012, 0.70, 0.71, 0.348, 0.353) for x0 in (0.412, 0.432, 0.452, 0.472)])
    p.append(H.mk("desk-buttons", btn, "#3A3C40", "desk_black", roughness=0.45))
    p.append(H.mk("riser-top", rb((1.00, 0.022, 0.24), 0.004, (-0.12, 0.886, -0.22)), "#B07A45", "desk_walnut", roughness=0.45))
    legs = P.merge(*[rb((0.022, 0.12, 0.24), 0.003, (x, 0.818, -0.22)) for x in (-0.60, 0.36)])
    p.append(H.mk("riser-legs", legs, "#B07A45", "desk_walnut", roughness=0.45))
    p.append(H.mk("desk-mat", P.xf(P.rbox((0.80, 0.004, 0.34), 0.002, seg=1), t=(-0.08, 0.762, 0.13)), "#2A2C30", "desk_felt", roughness=0.95))
    return p, {"desk_oak": H.tex("planks", ["#C9A270", "#B88E5C", "#D8B585"], 0.7, count=6, detail=0.35),
               "desk_white": H.tex("noise", ["#ECECEA", "#E2E2E0"], 0.3, detail=0.15),
               "desk_black": H.tex("noise", ["#1A1A1A", "#242424"], 0.1, detail=0.2),
               "desk_walnut": H.tex("woodgrain", ["#B07A45", "#8C5A30", "#C9955E"], 0.6),
               "desk_felt": H.tex("fabric", ["#2A2C30", "#232528"], 0.05)}
