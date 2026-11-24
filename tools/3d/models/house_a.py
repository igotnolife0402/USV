import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as P
import guns as G

F0 = 0.47


def build(H):
    p = []
    B = H.box

    def cb(size, r, pos):
        return P.xf(P.cbox(size, r), t=pos)

    def leg(x, z, y0, y1, r):
        return H.cyl((x, y0, z), (x, y1, z), r)

    def sq(x, z, s, y0, y1):
        return B(x - s / 2, x + s / 2, y0, y1, z - s / 2, z + s / 2)

    # 1 sofa
    sofa = [B(1.15, 3.25, F0 + 0.12, F0 + 0.37, 0.4, 1.3),
            B(1.15, 3.25, F0 + 0.37, F0 + 0.85, 0.4, 0.6),
            B(1.15, 1.33, F0 + 0.12, F0 + 0.65, 0.4, 1.3),
            B(3.07, 3.25, F0 + 0.12, F0 + 0.65, 0.4, 1.3)]
    for x in (1.64, 2.2, 2.76):
        sofa.append(cb((0.58, 0.16, 0.66), 0.04, (x, F0 + 0.45, 0.95)))
        sofa.append(cb((0.58, 0.4, 0.16), 0.05, (x, F0 + 0.62, 0.68)))
    p.append(H.mk("liv-sofa", P.merge(*sofa), "#6E7378", "fabric"))
    p.append(H.mk("liv-sofa-legs", P.merge(*[leg(x, z, F0, F0 + 0.12, 0.025) for x in (1.22, 3.18) for z in (0.48, 1.22)]),
                  "#4A3324", "walnut"))

    # 2 coffee table
    cx0, cx1, cz0, cz1 = 1.65, 2.75, 1.45, 2.05
    t = [B(cx0, cx1, F0 + 0.38, F0 + 0.42, cz0, cz1),
         B(cx0 + 0.06, cx1 - 0.06, F0 + 0.1, F0 + 0.12, cz0 + 0.06, cz1 - 0.06)]
    for x in (cx0 + 0.04 + 0.0225, cx1 - 0.04 - 0.0225):
        for z in (cz0 + 0.04 + 0.0225, cz1 - 0.04 - 0.0225):
            t.append(sq(x, z, 0.045, F0, F0 + 0.38))
    p.append(H.mk("liv-coffee", P.merge(*t), "#5A3D28", "walnut"))

    # 3 rug
    p.append(H.mk("liv-rug", B(1.0, 3.4, F0, F0 + 0.012, 0.55, 2.25), "#8A5A44", "rug"))

    # 4 console
    c = [B(1.7, 3.3, F0 + 0.1, F0 + 0.5, 2.33, 2.73),
         B(1.72, 2.49, F0 + 0.12, F0 + 0.48, 2.312, 2.33),
         B(2.51, 3.28, F0 + 0.12, F0 + 0.48, 2.312, 2.33)]
    for x in (1.72, 3.28):
        for z in (2.35, 2.71):
            c.append(sq(x, z, 0.04, F0, F0 + 0.1))
    p.append(H.mk("liv-console", P.merge(*c), "#5A3D28", "walnut"))
    p.append(H.mk("liv-console-pulls", P.merge(*[H.cyl((x - 0.06, F0 + 0.44, 2.30), (x + 0.06, F0 + 0.44, 2.30), 0.006)
                                                 for x in (2.105, 2.895)]), "#B9BDC2", "metal"))

    # 5 armchair
    a = [B(-0.4, 0.4, F0 + 0.12, F0 + 0.4, -0.4, 0.4),
         B(-0.4, 0.4, F0 + 0.4, F0 + 0.9, -0.4, -0.22),
         B(-0.4, -0.28, F0 + 0.12, F0 + 0.62, -0.4, 0.4),
         B(0.28, 0.4, F0 + 0.12, F0 + 0.62, -0.4, 0.4),
         cb((0.54, 0.14, 0.58), 0.04, (0, F0 + 0.47, 0.05))]
    al = [leg(x, z, F0, F0 + 0.12, 0.022) for x in (-0.35, 0.35) for z in (-0.35, 0.35)]
    p.append(H.mk("liv-armchair", P.xf(P.merge(*a), r=(0, 90, 0), t=(-1.6, 0, 1.3)), "#7C6A58", "fabric"))
    p.append(H.mk("liv-armchair-legs", P.xf(P.merge(*al), r=(0, 90, 0), t=(-1.6, 0, 1.3)), "#4A3324", "walnut"))

    # 6 side table
    st = P.lathe([(0, F0), (0.18, F0), (0.18, F0 + 0.02), (0.03, F0 + 0.04), (0.025, F0 + 0.53),
                  (0.25, F0 + 0.53), (0.25, F0 + 0.56), (0, F0 + 0.56)], 24, False)
    p.append(H.mk("liv-sidetable", P.xf(st, t=(-1.6, 0, 2.05)), "#5A3D28", "walnut"))

    # 7 lamp
    base = P.lathe([(0, F0), (0.15, F0), (0.15, F0 + 0.02), (0.02, F0 + 0.03), (0, F0 + 0.03)], 24, False)
    lamp = P.merge(base, H.cyl((0, F0 + 0.03, 0), (0, F0 + 1.55, 0), 0.012))
    shade = P.lathe([(0, F0 + 1.5), (0.22, F0 + 1.5), (0.15, F0 + 1.8), (0, F0 + 1.8)], 24, False)
    p.append(H.mk("liv-lamp", P.xf(lamp, t=(-2.2, 0, 2.25)), "#2B2B2B", "metal"))
    p.append(H.mk("liv-lamp-shade", P.xf(shade, t=(-2.2, 0, 2.25)), "#E8DFC8", "linen"))

    # 8 bookshelf
    s = [B(-1.75, -1.73, F0, F0 + 1.9, 2.41, 2.73), B(-0.77, -0.75, F0, F0 + 1.9, 2.41, 2.73),
         B(-1.73, -0.77, F0 + 1.88, F0 + 1.9, 2.41, 2.71), B(-1.73, -0.77, F0, F0 + 0.08, 2.41, 2.71),
         B(-1.73, -0.77, F0, F0 + 1.9, 2.71, 2.73)]
    for y in (0.45, 0.85, 1.25, 1.6):
        s.append(B(-1.73, -0.77, F0 + y, F0 + y + 0.02, 2.41, 2.71))
    p.append(H.mk("liv-bookshelf", P.merge(*s), "#5A3D28", "walnut"))
    ws, hs = [0.03, 0.045, 0.025, 0.05, 0.035], [0.22, 0.26, 0.19, 0.24, 0.2]
    cols = ["#7A2E2A", "#2E4A6B", "#3E5A3A", "#C9B48A", "#2A2A2E"]
    books = [[] for _ in range(5)]
    n = 0
    for y in (0.08, 0.47, 0.87, 1.27):
        x = -1.73
        while x + ws[n % 5] <= -0.9:
            w = ws[n % 5]
            books[n % 5].append(B(x, x + w, F0 + y, F0 + y + hs[n % 5], 2.48, 2.68))
            x += w + 0.003
            n += 1
    for i in range(5):
        p.append(H.mk("liv-books-%d" % (i + 1), P.merge(*books[i]), cols[i], "oak"))

    # 9 dining table
    d = [B(1.9, 3.5, F0 + 0.72, F0 + 0.76, -1.85, -0.95)]
    for x in (1.9 + 0.06 + 0.035, 3.5 - 0.06 - 0.035):
        for z in (-1.85 + 0.06 + 0.035, -0.95 - 0.06 - 0.035):
            d.append(sq(x, z, 0.07, F0, F0 + 0.72))
    ya, yb = F0 + 0.64, F0 + 0.72
    d += [B(1.98, 3.42, ya, yb, -1.77, -1.745), B(1.98, 3.42, ya, yb, -1.155, -1.13),
          B(1.98, 2.005, ya, yb, -1.77, -1.13), B(3.395, 3.42, ya, yb, -1.77, -1.13)]
    p.append(H.mk("din-table", P.merge(*d), "#8A6440", "oak"))

    # 10 chairs
    ch, pads = [], []
    for xc in (2.3, 3.1):
        for zc, sg in ((-0.55, 1), (-2.25, -1)):
            ch.append(B(xc - 0.22, xc + 0.22, F0 + 0.43, F0 + 0.47, zc - 0.21, zc + 0.21))
            for dx in (-1, 1):
                for dz in (-1, 1):
                    ch.append(sq(xc + dx * 0.2025, zc + dz * 0.1925, 0.035, F0, F0 + 0.43))
            zb = zc + sg * 0.1925
            for dx in (-1, 1):
                ch.append(sq(xc + dx * 0.2025, zb, 0.035, F0 + 0.47, F0 + 0.92))
            for y in (0.6, 0.72, 0.84):
                ch.append(B(xc - 0.18, xc + 0.18, F0 + y - 0.025, F0 + y + 0.025, zb - 0.01, zb + 0.01))
            pads.append(cb((0.4, 0.04, 0.38), 0.015, (xc, F0 + 0.49, zc)))
    p.append(H.mk("din-chairs", P.merge(*ch), "#8A6440", "oak"))
    p.append(H.mk("din-pads", P.merge(*pads), "#7C6A58", "fabric"))
    return p
