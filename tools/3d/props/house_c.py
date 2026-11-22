"""Cottage trim: front door, six shuttered windows, porch posts and porch roof."""
import props as P

WHITE, GLASS, SHUT, DOOR, BRASS = "#FFFFFF", "#9FD6F0", "#3E7D4F", "#2F6FA8", "#C99B4A"


def B(size, t, r=0.04, seg=2):
    return P.xf(P.rbox(size, r, seg), t=t)


def window():
    """One window built facing +Z with the wall surface at z=0, centred on the origin."""
    frame = P.merge(B((1.9, 0.2, 0.3), (0, 0.95, 0.05)), B((1.9, 0.2, 0.3), (0, -0.95, 0.05)),
                    B((0.2, 2.1, 0.3), (0.85, 0, 0.05)), B((0.2, 2.1, 0.3), (-0.85, 0, 0.05)),
                    B((0.12, 1.7, 0.08), (0, 0, 0.12), 0.03), B((1.5, 0.12, 0.08), (0, 0, 0.12), 0.03),
                    B((2.2, 0.18, 0.5), (0, -1.14, 0.2)))
    glass = B((1.5, 1.7, 0.2), (0, 0, 0), 0.03)
    shut = P.merge(B((0.7, 2.1, 0.2), (1.35, 0, 0.05)), B((0.7, 2.1, 0.2), (-1.35, 0, 0.05)))
    return frame, glass, shut


SPOTS = [((3.6, 3.9, 5), 0), ((-3.6, 3.9, 5), 0), ((3.6, 3.9, -5), 180), ((-3.6, 3.9, -5), 180),
         ((6, 3.9, 0), 90), ((-6, 3.9, 0), -90)]


@P.prop("house-trim", "House trim")
def house_trim(rng):
    fr, gl, sh = [], [], []
    for t, ry in SPOTS:
        for lst, m in zip((fr, gl, sh), window()):
            lst.append(P.xf(m, r=(0, ry, 0), t=t))
    dframe = B((2.0, 3.4, 0.3), (0, 2.3, 5.05), 0.05)
    door = P.merge(B((1.6, 3.1, 0.2), (0, 2.15, 5.15), 0.05),
                   B((1.1, 1.1, 0.06), (0, 2.9, 5.27), 0.03), B((1.1, 1.1, 0.06), (0, 1.45, 5.27), 0.03))
    knob = B((0.16, 0.16, 0.16), (0.55, 2.1, 5.32), 0.07, 3)
    posts = P.merge(B((0.3, 4.0, 0.3), (1.5, 2.6, 6.8), 0.05), B((0.3, 4.0, 0.3), (-1.5, 2.6, 6.8), 0.05))
    awning = P.box_uv(B((3.6, 0.25, 2.6), (0, 4.725, 6.2), 0.06, 3), 1)
    parts = [
        P.part("frames", P.merge(*fr, dframe, posts), WHITE, roughness=0.6),
        P.part("glass", P.merge(*gl), GLASS, roughness=0.1, metalness=0.2),
        P.part("shutters", P.merge(*sh), SHUT, roughness=0.7),
        P.part("door", door, DOOR, roughness=0.5),
        P.part("knob", knob, BRASS, roughness=0.3, metalness=0.8),
        P.part("awning", awning, "#C2483A", texture="tiles", roughness=0.8),
    ]
    tx = lambda pat, cols, sc: {"kind": "procedural", "pattern": pat, "colors": cols, "scale": sc}
    return parts, {"tiles": tx("planks", ["#C2483A", "#8E2F26", "#D9675A"], 3)}
