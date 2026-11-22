import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P
import guns as G

F0, F1 = 0.47, 3.20


def build(H):
    p = []
    B, C, M = H.box, H.cyl, P.merge

    def disc(r, y0, y1, x, z, seg=24):
        return P.xf(P.lathe([(0, y0), (r, y0), (r, y1), (0, y1)], seg, False), t=(x, 0, z))

    # KITCHEN
    p.append(H.mk("kit-cabinets", B(-2.75, 1.15, F0 + 0.1, F0 + 0.86, -2.73, -2.17), "#E9E7E2", "trim"))
    p.append(P.part("kit-plinth", B(-2.75, 1.15, F0, F0 + 0.1, -2.73, -2.22), "#2A2A2A", smooth=False))
    doors, handles = [], []
    for i in range(5):
        x0 = -2.75 + 0.65 * i + 0.002
        x1 = -2.75 + 0.65 * (i + 1) - 0.002
        if i == 4:
            x1 = 0.196
        doors.append(B(x0, x1, F0 + 0.12, F0 + 0.84, -2.17, -2.152))
        cx = (x0 + x1) / 2
        handles.append(C((cx - 0.07, F0 + 0.8, -2.135), (cx + 0.07, F0 + 0.8, -2.135), 0.006))
    p.append(H.mk("kit-doors", M(*doors), "#DAD7D0", "trim"))
    p.append(H.mk("kit-handles", M(*handles), "#B9BDC2", "metal", metalness=0.8))
    p.append(H.mk("kit-counter", M(
        B(-2.78, -1.0, F0 + 0.86, F0 + 0.9, -2.73, -2.12),
        B(-0.4, 1.18, F0 + 0.86, F0 + 0.9, -2.73, -2.12),
        B(-1.0, -0.4, F0 + 0.86, F0 + 0.9, -2.73, -2.6),
        B(-1.0, -0.4, F0 + 0.86, F0 + 0.9, -2.2, -2.12)), "#E4E1DA", "marble"))
    y0, y1 = F0 + 0.68, F0 + 0.905
    p.append(H.mk("kit-sink", M(
        B(-1.0, -0.985, y0, y1, -2.6, -2.2), B(-0.415, -0.4, y0, y1, -2.6, -2.2),
        B(-0.985, -0.415, y0, y1, -2.6, -2.585), B(-0.985, -0.415, y0, y1, -2.215, -2.2),
        B(-0.985, -0.415, F0 + 0.67, F0 + 0.68, -2.585, -2.215),
        C((-0.7, F0 + 0.9, -2.65), (-0.7, F0 + 1.22, -2.65), 0.015),
        C((-0.7, F0 + 1.2, -2.65), (-0.7, F0 + 1.2, -2.42), 0.015),
        C((-0.7, F0 + 1.2, -2.42), (-0.7, F0 + 1.12, -2.42), 0.015),
        C((-0.78, F0 + 0.9, -2.65), (-0.78, F0 + 0.96, -2.65), 0.01),
        C((-0.62, F0 + 0.9, -2.65), (-0.62, F0 + 0.96, -2.65), 0.01)), "#C9CED6", "metal", metalness=0.8))
    p.append(P.part("kit-cooktop", B(0.2, 0.8, F0 + 0.9, F0 + 0.908, -2.65, -2.2), "#111316", smooth=False, roughness=0.1))
    yb = F0 + 0.908
    p.append(P.part("kit-burners", M(
        disc(0.08, yb, yb + 0.004, 0.35, -2.53), disc(0.08, yb, yb + 0.004, 0.65, -2.53),
        disc(0.06, yb, yb + 0.004, 0.35, -2.32), disc(0.06, yb, yb + 0.004, 0.65, -2.32)), "#3A3D42", smooth=False))
    p.append(H.mk("kit-oven", M(
        B(0.2, 0.8, F0 + 0.15, F0 + 0.78, -2.17, -2.145),
        C((0.25, F0 + 0.72, -2.11), (0.75, F0 + 0.72, -2.11), 0.01),
        C((0.25, F0 + 0.72, -2.145), (0.25, F0 + 0.72, -2.11), 0.01),
        C((0.75, F0 + 0.72, -2.145), (0.75, F0 + 0.72, -2.11), 0.01)), "#2B2E33", "metal"))
    p.append(P.part("kit-oven-window", B(0.28, 0.72, F0 + 0.3, F0 + 0.62, -2.145, -2.14), "#0C0D10", smooth=False))
    p.append(H.mk("kit-fridge", M(
        B(1.25, 2.0, F0, F0 + 1.85, -2.73, -2.1),
        B(1.26, 1.99, F0 + 0.02, F0 + 0.66, -2.1, -2.07),
        B(1.26, 1.99, F0 + 0.67, F0 + 1.83, -2.1, -2.07)), "#B9BDC2", "metal", metalness=0.6))
    fh = []
    for a, b in ((0.25, 0.6), (0.95, 1.45)):
        fh.append(C((1.33, F0 + a, -2.03), (1.33, F0 + b, -2.03), 0.012))
        for y in (a + 0.03, b - 0.03):
            fh.append(C((1.33, F0 + y, -2.07), (1.33, F0 + y, -2.03), 0.008))
    p.append(H.mk("kit-fridge-handles", M(*fh), "#D7DADF", "metal"))

    # BATHROOM
    p.append(H.mk("bath-tiles", B(0.85, 3.73, F1, F1 + 0.01, -2.73, 2.73), "#E6E4DF", "tile"))
    ya, yt = F1 + 0.01, F1 + 0.55
    p.append(P.part("bath-tub", M(
        B(2.0, 3.73, ya, yt, -2.73, -2.66), B(2.0, 3.73, ya, yt, -2.07, -2.0),
        B(2.0, 2.07, ya, yt, -2.66, -2.07), B(3.66, 3.73, ya, yt, -2.66, -2.07),
        B(2.07, 3.66, ya, F1 + 0.08, -2.66, -2.07)), "#F2F2F0", smooth=False, roughness=0.2))
    chrome = [C((2.85, F1 + 0.62, -2.73), (2.85, F1 + 0.62, -2.6), 0.02),
              C((2.75, F1 + 0.62, -2.73), (2.75, F1 + 0.62, -2.66), 0.015),
              C((2.95, F1 + 0.62, -2.73), (2.95, F1 + 0.62, -2.66), 0.015),
              C((3.68, F1 + 0.86, 1.4), (3.68, F1 + 1.15, 1.4), 0.015),
              C((3.68, F1 + 1.15, 1.4), (3.52, F1 + 1.15, 1.4), 0.015)]
    p.append(P.part("bath-chrome", M(*chrome), "#D7DADF", smooth=False, metalness=0.9, roughness=0.15))
    sc, tr = (1, 1, 1.3), (1.4, 0, -2.28)
    bowl = P.xf(P.lathe([(0, F1), (0.12, F1), (0.14, F1 + 0.2), (0.19, F1 + 0.4), (0, F1 + 0.4)], 24, False), t=tr, s=sc)
    seat = P.xf(P.lathe([(0.12, F1 + 0.4), (0.19, F1 + 0.4), (0.19, F1 + 0.43), (0.12, F1 + 0.43)], 24, True), t=tr, s=sc)
    p.append(P.part("bath-toilet", M(
        B(1.21, 1.59, F1 + 0.42, F1 + 0.82, -2.73, -2.55), bowl, seat,
        disc(0.02, F1 + 0.82, F1 + 0.83, 1.4, -2.64)), "#F4F4F2", smooth=False, roughness=0.2))
    p.append(H.mk("bath-vanity", M(
        B(3.18, 3.73, F1 + 0.01, F1 + 0.82, 1.0, 1.8),
        B(3.162, 3.18, F1 + 0.01, F1 + 0.82, 1.0, 1.398),
        B(3.162, 3.18, F1 + 0.01, F1 + 0.82, 1.402, 1.8)), "#5A3D28", "walnut"))
    p.append(H.mk("bath-vanity-top", B(3.15, 3.73, F1 + 0.82, F1 + 0.86, 0.98, 1.82), "#E4E1DA", "marble"))
    p.append(P.part("bath-basin", P.xf(P.lathe([(0, F1 + 0.86), (0.12, F1 + 0.86), (0.2, F1 + 1.0), (0.18, F1 + 1.0),
                                               (0.11, F1 + 0.88), (0, F1 + 0.88)], 32, False), t=(3.42, 0, 1.4)),
                    "#F4F4F2", smooth=False, roughness=0.2))
    p.append(P.part("bath-mirror", B(3.71, 3.73, F1 + 1.1, F1 + 1.9, 1.05, 1.75), "#C8D0D6", smooth=False,
                    metalness=1, roughness=0.05))
    p.append(H.mk("bath-mirror-frame", M(
        B(3.69, 3.73, F1 + 1.06, F1 + 1.1, 1.01, 1.79), B(3.69, 3.73, F1 + 1.9, F1 + 1.94, 1.01, 1.79),
        B(3.69, 3.73, F1 + 1.1, F1 + 1.9, 1.01, 1.05), B(3.69, 3.73, F1 + 1.1, F1 + 1.9, 1.75, 1.79)),
        "#5A3D28", "walnut"))
    return p
