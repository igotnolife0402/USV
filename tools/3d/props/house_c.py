import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P
import guns as G


def build(H):
    F1 = 3.20
    B = H.box
    p = []

    def add(i, parts, col, tex, **kw):
        p.append(H.mk(i, P.merge(*parts), col, tex, **kw))

    # 1 frame + headboard
    y0, y1 = F1 + 0.15, F1 + 0.4
    legs = [B(x - 0.035, x + 0.035, F1, F1 + 0.4, z - 0.035, z + 0.035)
            for x in (-1.975, -0.425) for z in (-2.615, -0.585)]
    add("bed-frame", [B(-2.0, -1.95, y0, y1, -2.65, -0.55), B(-0.45, -0.4, y0, y1, -2.65, -0.55),
                      B(-2.0, -0.4, y0, y1, -0.6, -0.55)] + legs, "#8A6440", "oak")
    add("bed-headboard", [B(-2.05, -0.35, F1, F1 + 1.15, -2.73, -2.65),
                          P.xf(P.cbox((1.6, 0.7, 0.06), 0.03), t=(-1.2, F1 + 0.75, -2.62))], "#5E6670", "fabric")
    # 2 bedding
    add("bed-mattress", [P.xf(P.cbox((1.56, 0.24, 2.0), 0.05), t=(-1.2, F1 + 0.47, -1.6))], "#F2F0EB", "linen")
    add("bed-duvet", [P.xf(P.cbox((1.66, 0.08, 1.55), 0.04), t=(-1.2, F1 + 0.6, -1.33))], "#C9D3DC", "linen")
    add("bed-pillows", [P.xf(P.cbox((0.62, 0.15, 0.4), 0.06), t=(x, F1 + 0.66, -2.35)) for x in (-1.6, -0.8)],
        "#FFFFFF", "linen")
    add("bed-throw", [P.xf(P.cbox((1.68, 0.04, 0.45), 0.015), t=(-1.2, F1 + 0.66, -0.85))], "#7C6A58", "fabric")
    # 3 nightstands
    cxs = (-2.35, -0.05)
    ns, kn = [], []
    for cx in cxs:
        ns.append(B(cx - 0.225, cx + 0.225, F1, F1 + 0.55, -2.73, -2.33))
        ns.append(B(cx - 0.2, cx + 0.2, F1 + 0.32, F1 + 0.5, -2.33, -2.315))
        knob = P.lathe([(0, 0), (0.015, 0), (0.015, 0.015), (0.008, 0.025), (0, 0.025)], 12, False)
        kn.append(P.xf(knob, t=(cx, F1 + 0.41, -2.315), r=(-90, 0, 0)))
    add("bed-nightstands", ns, "#5A3D28", "walnut")
    add("bed-knobs", kn, "#B08D57", "metal", metalness=0.8)
    # 4 lamps
    base = [(0, F1 + 0.55), (0.07, F1 + 0.55), (0.07, F1 + 0.57), (0.015, F1 + 0.58), (0.012, F1 + 0.85), (0, F1 + 0.85)]
    shade = [(0, F1 + 0.8), (0.14, F1 + 0.8), (0.1, F1 + 1.0), (0, F1 + 1.0)]
    add("bed-lamps", [P.xf(P.lathe(base, 24, False), t=(cx, 0, -2.53)) for cx in cxs], "#2B2B2B", "metal")
    add("bed-lamp-shades", [P.xf(P.lathe(shade, 24, False), t=(cx, 0, -2.53)) for cx in cxs], "#E8DFC8", "linen")
    # 5 wardrobe
    add("bed-wardrobe", [B(0.15, 0.75, F1, F1 + 2.1, 0.2, 1.4),
                         B(0.132, 0.15, F1 + 0.08, F1 + 2.02, 0.205, 0.798),
                         B(0.132, 0.15, F1 + 0.08, F1 + 2.02, 0.802, 1.395),
                         B(0.12, 0.75, F1 + 2.1, F1 + 2.15, 0.17, 1.43)], "#5A3D28", "walnut")
    hs = []
    for z in (0.76, 0.84):
        hs.append(H.cyl((0.11, F1 + 0.9, z), (0.11, F1 + 1.3, z), 0.008))
        for y in (F1 + 0.95, F1 + 1.25):
            hs.append(H.cyl((0.11, y, z), (0.132, y, z), 0.008))
    add("bed-wardrobe-handles", hs, "#B08D57", "metal", metalness=0.8)
    # 6 rug
    add("bed-rug", [B(-2.4, 0.0, F1, F1 + 0.012, -1.8, 0.2)], "#8A5A44", "rug")
    # 7 bench
    add("bed-bench", [P.xf(P.cbox((1.2, 0.12, 0.4), 0.03), t=(-1.2, F1 + 0.4, -0.3))], "#7C6A58", "fabric")
    bl = [B(x - 0.02, x + 0.02, F1, F1 + 0.3, z - 0.02, z + 0.02)
          for x in (-1.78, -0.62) for z in (-0.48, -0.12)]
    add("bed-bench-legs", [B(-1.8, -0.6, F1 + 0.3, F1 + 0.34, -0.5, -0.1)] + bl, "#8A6440", "oak")
    return p
