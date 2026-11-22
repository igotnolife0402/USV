"""Cottage body: foundation, walls, gable attic, corner posts, chimney, porch deck."""
import numpy as np

import props as P

CREAM, STONE, WHITE, BRICK, WOOD = "#F2E6D0", "#8C8F96", "#FFFFFF", "#A34A3A", "#B9773E"


def prism(zy, x0, x1):
    """Extrude a (z, y) outline along X from x0 to x1 (closed, oriented)."""
    zy = np.asarray(zy, float)
    n = len(zy)
    v = np.vstack([np.column_stack([np.full(n, x0), zy[:, 1], zy[:, 0]]),
                   np.column_stack([np.full(n, x1), zy[:, 1], zy[:, 0]])])
    f = [list(range(n))[::-1], list(range(n, 2 * n))]
    f += [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    return P.orient(P.Mesh(v, f))


def B(size, t, r=0.06, seg=3):
    return P.xf(P.rbox(size, r, seg), t=t)


@P.prop("house-body", "House body")
def house_body(rng):
    found = P.box_uv(B((12.8, 0.6, 10.8), (0, 0.3, 0), 0.1), 0.5)
    walls = P.box_uv(B((12, 6, 10), (0, 3.6, 0), 0.05, 2), 0.5)
    gable = P.box_uv(prism([(-5, 6.5), (5, 6.5), (0, 9.9)], -6, 6), 0.5)
    posts = P.merge(*[B((0.5, 6, 0.5), (sx * 6, 3.6, sz * 5)) for sx in (-1, 1) for sz in (-1, 1)])
    chim = P.box_uv(B((1.4, 5, 1.4), (3.5, 9.5, -1.8)), 1)
    ccap = B((1.7, 0.3, 1.7), (3.5, 12.15, -1.8), 0.05)
    deck = P.box_uv(B((5, 0.4, 2.2), (0, 0.4, 6.1)), 1)
    step = P.box_uv(B((3, 0.2, 0.8), (0, 0.1, 7.6), 0.04), 1)
    parts = [
        P.part("foundation", P.merge(found, step), STONE, texture="stone", roughness=0.9),
        P.part("walls", P.merge(walls, gable), CREAM, texture="plaster", roughness=0.85),
        P.part("posts", posts, WHITE, roughness=0.6),
        P.part("chimney", chim, BRICK, texture="brick", roughness=0.9),
        P.part("chimcap", ccap, "#5A5E66", roughness=0.7),
        P.part("deck", deck, WOOD, texture="wood", roughness=0.7),
    ]
    tx = lambda pat, cols, sc: {"kind": "procedural", "pattern": pat, "colors": cols, "scale": sc}
    return parts, {
        "stone": tx("noise", [STONE, "#6E727A", "#A9ACB3"], 3),
        "plaster": tx("noise", [CREAM, "#E3D4BA", "#FBF3E4"], 6),
        "brick": tx("planks", [BRICK, "#7E3328", "#C0604E"], 4),
        "wood": tx("woodgrain", [WOOD, "#8A5428", "#D59A5E"], 3),
    }
