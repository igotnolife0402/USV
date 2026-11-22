"""Cottage roof: chevron slab, shingle rows, ridge cap, white barge boards."""
import numpy as np

import props as P

TILE, TILE2, RIDGE, WHITE = "#C2483A", "#A83A2F", "#8E2F26", "#FFFFFF"
ANG = 33.42  # slope angle, rise 0.66 per run


def prism(zy, x0, x1):
    """Extrude a (z, y) outline along X from x0 to x1 (closed, oriented)."""
    zy = np.asarray(zy, float)
    n = len(zy)
    v = np.vstack([np.column_stack([np.full(n, x0), zy[:, 1], zy[:, 0]]),
                   np.column_stack([np.full(n, x1), zy[:, 1], zy[:, 0]])])
    f = [list(range(n))[::-1], list(range(n, 2 * n))]
    f += [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    return P.orient(P.Mesh(v, f))


@P.prop("house-roof", "House roof")
def house_roof(rng):
    slab = P.box_uv(prism([(6.0, 5.74), (6.0, 6.14), (0, 10.1), (-6.0, 6.14), (-6.0, 5.74), (0, 9.7)],
                          -6.8, 6.8), 0.5)
    rows = []
    for t in np.arange(9) * 0.1 + 0.06:
        for sz in (1, -1):
            c = (0, 6.14 + 3.96 * t + 0.03 * 0.834, sz * (6 - 6 * t + 0.03 * 0.551))
            rows.append(P.xf(P.rbox((13.6, 0.12, 0.5), 0.04, 2), r=(sz * ANG, 0, 0), t=c))
    rows = P.box_uv(P.merge(*rows), 0.5)
    ridge = P.sweep(np.array([(-7.15, 10.1, 0), (7.15, 10.1, 0)]), 0.22, 12, caps="flat")
    bz = [(6.1, 5.64), (6.1, 6.2), (0, 10.22), (-6.1, 6.2), (-6.1, 5.64), (0, 9.6)]
    barge = P.merge(prism(bz, 6.8, 7.0), prism(bz, -7.0, -6.8))
    parts = [
        P.part("roof", slab, TILE, texture="tiles", roughness=0.8),
        P.part("shingles", rows, TILE2, texture="tiles", roughness=0.8),
        P.part("ridge", ridge, RIDGE, roughness=0.7),
        P.part("barge", barge, WHITE, roughness=0.6),
    ]
    tx = lambda pat, cols, sc: {"kind": "procedural", "pattern": pat, "colors": cols, "scale": sc}
    return parts, {"tiles": tx("planks", [TILE, "#8E2F26", "#D9675A"], 3)}
