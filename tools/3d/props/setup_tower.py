"""Glass-front RGB gaming tower standing on the desk: steel shell, tempered glass front and left side, 3 RGB fans, motherboard, GPU, PSU shroud, feet, IO, plus a small potted plant."""
# @style: realistic
# @model: pc-tower, plant | glass-front RGB tower on the desk, potted plant
# @run: python3 setup.py OUT --check
import os, sys, math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P
import house as H


def parts():
    box, cyl = H.box, H.cyl
    p = []
    glass = dict(smooth=False, transparency=0.4, roughness=0.05, metalness=0.1)
    p.append(H.mk("pc-shell", P.merge(box(0.47, 0.68, 1.224, 1.23, -0.33, 0.13),
                                      box(0.47, 0.68, 0.78, 0.786, -0.33, 0.13),
                                      box(0.47, 0.68, 0.786, 1.224, -0.33, -0.324),
                                      box(0.674, 0.68, 0.786, 1.224, -0.324, 0.124)),
                  "#141518", "pc_steel", metalness=0.6, roughness=0.35))
    b = 0.01
    x0, x1, y0, y1 = 0.47, 0.68, 0.786, 1.224
    z0, z1 = 0.124, 0.13
    p.append(H.mk("pc-front-frame", P.merge(box(x0, x1, y0, y0 + b, z0, z1),
                                            box(x0, x1, y1 - b, y1, z0, z1),
                                            box(x0, x0 + b, y0 + b, y1 - b, z0, z1),
                                            box(x1 - b, x1, y0 + b, y1 - b, z0, z1)),
                  "#141518", "pc_steel"))
    p.append(P.part("pc-front-glass", box(0.481, 0.669, 0.797, 1.213, 0.126, 0.129), "#2A3038", **glass))
    sx0, sx1 = 0.47, 0.476
    sz0, sz1 = -0.324, 0.124
    p.append(H.mk("pc-side-frame", P.merge(box(sx0, sx1, y0, y0 + b, sz0, sz1),
                                           box(sx0, sx1, y1 - b, y1, sz0, sz1),
                                           box(sx0, sx1, y0 + b, y1 - b, sz0, sz0 + b),
                                           box(sx0, sx1, y0 + b, y1 - b, sz1 - b, sz1)),
                  "#141518", "pc_steel"))
    p.append(P.part("pc-side-glass", box(0.471, 0.475, 0.797, 1.213, -0.313, 0.113), "#2A3038", **glass))
    ys = (0.88, 1.005, 1.13)
    fx = 0.575
    p.append(H.mk("pc-fan-frames", P.merge(*[cyl((fx, y, 0.10), (fx, y, 0.118), 0.065, 16) for y in ys]),
                  "#1A1B1E", "pc_plastic"))
    ring = P.lathe([(0.045, 0), (0.062, 0), (0.062, 0.004), (0.045, 0.004)], 24, True)
    p.append(H.mk("pc-rgb", P.merge(*[P.xf(ring, r=(90, 0, 0), t=(fx, y, 0.123)) for y in ys]),
                  "#4FC8FF", "pc_plastic", emissive="#4FC8FF", emissiveIntensity=0.9))
    blade = H.box(0.02, 0.046, -0.008, 0.008, -0.002, 0.002)
    p.append(H.mk("pc-blades", P.merge(*[P.xf(blade, r=(0, 0, k * 360 / 7 + 15), t=(fx, y, 0.11))
                                         for y in ys for k in range(7)]),
                  "#2A2B2F", "pc_plastic"))
    p.append(H.mk("pc-hubs", P.merge(*[cyl((fx, y, 0.10), (fx, y, 0.121), 0.02, 16) for y in ys]),
                  "#1A1B1E", "pc_plastic"))
    p.append(H.mk("pc-mobo", box(0.66, 0.674, 0.86, 1.20, -0.30, 0.0), "#1E2A22", "pc_pcb"))
    p.append(H.mk("pc-gpu", box(0.50, 0.661, 0.93, 0.99, -0.30, 0.0), "#2E3136", "pc_steel"))
    p.append(H.mk("pc-cooler", box(0.60, 0.661, 1.04, 1.14, -0.20, -0.10), "#B8BCC2", "pc_alu",
                  metalness=0.8))
    p.append(H.mk("pc-ram", P.merge(*[box(0.645, 0.661, 1.04, 1.17, z, z + 0.006)
                                      for z in (-0.05, -0.038, -0.026, -0.014)]),
                  "#2B2D30", "pc_steel"))
    p.append(H.mk("pc-psu-shroud", box(0.476, 0.674, 0.786, 0.85, -0.324, 0.10), "#141518", "pc_steel"))
    p.append(H.mk("pc-feet", P.merge(*[box(x - 0.015, x + 0.015, 0.758, 0.782, z - 0.015, z + 0.015)
                                       for x in (0.49, 0.66) for z in (-0.31, 0.11)]),
                  "#111111", "pc_plastic"))
    p.append(H.mk("pc-io", P.merge(box(0.53, 0.545, 1.229, 1.233, 0.09, 0.10),
                                   box(0.555, 0.57, 1.229, 1.233, 0.09, 0.10)), "#0A0A0A", "pc_steel"))
    p.append(H.mk("pc-power", cyl((0.62, 1.229, 0.095), (0.62, 1.234, 0.095), 0.008, 16), "#C8CCD0", "pc_alu"))
    p.append(H.mk("plant-pot", P.xf(P.lathe([(0, 0), (0.045, 0), (0.055, 0.10), (0.05, 0.10), (0.041, 0.006),
                                             (0, 0.006)], 24, False), t=(-0.60, 0.758, 0.12)),
                  "#EDEDEB", "pc_ceramic"))
    p.append(H.mk("plant-soil", cyl((-0.60, 0.84, 0.12), (-0.60, 0.85, 0.12), 0.049, 24), "#3B2A1E", "pc_soil"))
    leaf = P.xf(P.rbox((0.024, 0.004, 0.09), 0.0019, seg=1), t=(0, 0, 0.045))
    p.append(H.mk("plant-leaves", P.merge(*[P.xf(leaf, r=(-40 - (k % 3) * 12, k * 40, 0), t=(-0.60, 0.85, 0.12))
                                            for k in range(9)]),
                  "#4E8A3E", "pc_leaf"))
    t = {"pc_steel": H.tex("brushed", ["#141518", "#0E0F11", "#2E3135"], 1.0),
         "pc_plastic": H.tex("noise", ["#1A1B1E", "#222327"], 0.05, detail=0.3),
         "pc_pcb": H.tex("noise", ["#1E2A22", "#14201A"], 0.3),
         "pc_alu": H.tex("brushed", ["#B8BCC2", "#8E9399", "#D6D9DD"], 0.3),
         "pc_ceramic": H.tex("noise", ["#EDEDEB", "#E1E1DE"], 0.1, detail=0.15),
         "pc_soil": H.tex("noise", ["#3B2A1E", "#2A1D14"], 0.02, detail=0.6),
         "pc_leaf": H.tex("noise", ["#4E8A3E", "#3F7332", "#6AA352"], 0.05, detail=0.3)}
    return p, t
