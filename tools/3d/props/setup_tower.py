"""Mid-tower PC: steel shell, mesh front, tempered glass left side, 3 front fans, motherboard, GPU, PSU shroud, feet, IO."""
# @style: realistic
# @model: pc-tower | mid tower, tempered glass side, 3 fans, GPU
# @run: python3 setup.py OUT --check
import os, sys, math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P
import house as H


def parts():
    box, cyl = H.box, H.cyl
    p = []
    shell = P.merge(box(0.38, 0.60, 0.484, 0.49, -0.22, 0.24),
                    box(0.38, 0.60, 0.02, 0.026, -0.22, 0.24),
                    box(0.38, 0.60, 0.026, 0.484, -0.22, -0.214),
                    box(0.594, 0.60, 0.026, 0.484, -0.214, 0.234))
    p.append(H.mk("pc-shell", shell, "#18191B", "pc_steel", metalness=0.6, roughness=0.35))
    p.append(H.mk("pc-front", P.xf(P.rbox((0.22, 0.464, 0.012), 0.004, seg=2), t=(0.49, 0.256, 0.236)),
                  "#202124", "pc_mesh", roughness=0.8))
    bw = 0.012
    x0, x1, y0, y1, z0, z1 = 0.38, 0.386, 0.026, 0.484, -0.214, 0.234
    frame = P.merge(box(x0, x1, y0, y1, z0, z0 + bw),
                    box(x0, x1, y0, y1, z1 - bw, z1),
                    box(x0, x1, y1 - bw, y1, z0 + bw, z1 - bw),
                    box(x0, x1, y0, y0 + bw, z0 + bw, z1 - bw))
    p.append(H.mk("pc-glass-frame", frame, "#18191B", "pc_steel"))
    p.append(P.part("pc-glass", box(0.381, 0.385, 0.038, 0.472, -0.202, 0.222), "#9FB4C8", smooth=False,
                    transparency=0.35, roughness=0.05, metalness=0.1))
    ys = (0.12, 0.25, 0.38)
    p.append(H.mk("pc-fans", P.merge(*[cyl((0.49, y, 0.215), (0.49, y, 0.23), 0.058, 12) for y in ys]),
                  "#202124", "pc_plastic", roughness=0.7))
    p.append(H.mk("pc-fan-hubs", P.merge(*[cyl((0.49, y, 0.212), (0.49, y, 0.215), 0.02, 12) for y in ys]),
                  "#2E3136", None))
    p.append(H.mk("pc-mobo", box(0.585, 0.594, 0.10, 0.46, -0.19, 0.12), "#1E2A22", "pc_pcb", roughness=0.6))
    p.append(H.mk("pc-gpu", box(0.50, 0.585, 0.20, 0.32, -0.19, 0.10), "#2E3136", "pc_steel", metalness=0.5))
    p.append(H.mk("pc-cooler", box(0.50, 0.585, 0.33, 0.43, -0.10, 0.0), "#B8BCC2", "pc_alu",
                  metalness=0.8, roughness=0.3))
    p.append(H.mk("pc-ram", P.merge(*[box(0.565, 0.585, 0.32, 0.45, z, z + 0.006)
                                      for z in (0.02, 0.032, 0.044, 0.056)]),
                  "#2B2D30", "pc_steel", metalness=0.5))
    p.append(H.mk("pc-rear-fan", cyl((0.49, 0.38, -0.214), (0.49, 0.38, -0.200), 0.055, 12),
                  "#202124", "pc_plastic", roughness=0.7))
    p.append(H.mk("pc-psu-shroud", box(0.386, 0.594, 0.026, 0.10, -0.214, 0.10), "#18191B", "pc_steel"))
    p.append(H.mk("pc-feet", P.merge(*[box(x - 0.015, x + 0.015, 0.0, 0.02, z - 0.015, z + 0.015)
                                       for x in (0.40, 0.58) for z in (-0.20, 0.22)]),
                  "#111111", "pc_plastic", roughness=0.9))
    p.append(H.mk("pc-power", cyl((0.49, 0.487, 0.20), (0.49, 0.493, 0.20), 0.008, 12), "#C8CCD0", None,
                  metalness=0.7))
    p.append(H.mk("pc-io", P.merge(box(0.45, 0.465, 0.488, 0.4915, 0.17, 0.18),
                                   box(0.515, 0.53, 0.488, 0.4915, 0.17, 0.18)), "#0A0A0A", None))
    t = {"pc_steel": H.tex("brushed", ["#18191B", "#101112", "#34373B"], 1.0),
         "pc_mesh": H.tex("grid", ["#202124", "#0E0E0F"], 0.01, detail=0.4),
         "pc_alu": H.tex("brushed", ["#B8BCC2", "#8E9399", "#D6D9DD"], 0.3),
         "pc_pcb": H.tex("noise", ["#1E2A22", "#14201A"], 0.3),
         "pc_plastic": H.tex("noise", ["#202124", "#18191B"], 0.05, detail=0.3)}
    return p, t
