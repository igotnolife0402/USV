"""Vape props A: pod-vape, box-mod. Original designs, no logos. Toon style."""
import numpy as np
import props as P


def cyl(r, h, y0=0.0, f=0.012, seg=32, rmod=None, t=(0, 0, 0), s=None, axis="y", prof=None):
    """Filleted cylinder (or custom (r,y) profile) from y0 up; axis y|z|x."""
    pts = prof if prof is not None else [(0, 0), (r, 0), (r, h), (0, h)]
    rad = np.full(len(pts), f)
    rad[[0, -1]] = 0
    m = P.lathe(P.fillet(pts, rad, 2), max(8, int(seg * 0.6)), rmod=rmod)
    if s is not None:
        m = P.xf(m, s=s)
    m = P.xf(m, t=(0, y0, 0))
    rot = {"y": None, "z": (90, 0, 0), "x": (0, 0, -90)}[axis]
    return P.xf(m, t=t, r=rot) if rot else P.xf(m, t=t)


def rb(size, r, t, seg=2):
    return P.xf(P.rbox(size, r, seg), t=t)


def tex(pid, mesh, color, key, sc=1.0, **kw):
    P.box_uv(mesh, sc)
    return P.part(pid, mesh, color, texture=key, **kw)


def T(pattern, base, dark, light, scale=3):
    return {"kind": "procedural", "pattern": pattern, "colors": [base, dark, light], "scale": scale}


def knurl(n, depth=0.012):
    return lambda th, Y, R: R * (1 + depth * np.sign(np.sin(th * n)) * (R > 0.02))


@P.prop("pod-vape", "Pod vape")
def pod_vape(rng):
    TEAL, DARK, GOLD, AMBER = "#2FB7A8", "#1B2430", "#E0B04A", "#FF9A3C"
    tx = {"brushed": T("brushed", TEAL, "#1E8277", "#7FE0D4", 4),
          "carbon": T("carbon", DARK, "#0B0F15", "#3A4658", 6),
          "grip": T("grip", "#F2F4F7", "#B7C0CC", "#FFFFFF", 5),
          "noise": T("noise", GOLD, "#A87D22", "#FFE08A", 5)}
    SX, SZ = 0.26, 0.12
    parts = []
    # body: oval, filleted, with base cap, collar and chamfer seams
    parts.append(tex("body", cyl(1, 0.7, 0.05, f=0.08, seg=48, s=(SX, 1, SZ)), TEAL, "brushed", 3,
                     roughness=0.45, metalness=0.25))
    parts.append(tex("base-cap", cyl(1, 0.1, 0.0, f=0.04, seg=48, s=(SX + 0.008, 1, SZ + 0.008)), DARK, "carbon", 3,
                     roughness=0.4))
    parts.append(tex("seam-ring", cyl(1, 0.03, 0.2, f=0.01, seg=48, s=(SX + 0.01, 1, SZ + 0.01)), "#16808A", "brushed", 3,
                     roughness=0.4, metalness=0.4))
    parts.append(tex("collar", cyl(1, 0.09, 0.66, f=0.03, seg=48, s=(SX + 0.012, 1, SZ + 0.012)), DARK, "carbon", 3,
                     roughness=0.35))
    # front plate with controls
    parts.append(tex("plate", rb((0.34, 0.4, 0.03), 0.012, (0, 0.42, 0.115)), DARK, "carbon", 4, roughness=0.3))
    parts.append(P.part("led-strip", rb((0.03, 0.3, 0.03), 0.012, (-0.12, 0.42, 0.14)), "#6CFFE9",
                        emissive="#35F2D8", emissiveIntensity=2.5))
    parts.append(tex("fire-ring", cyl(0.09, 0.03, 0.0, f=0.01, seg=32, axis="z", t=(0.03, 0.46, 0.125)),
                     "#C9CED6", "brushed", 3, metalness=0.7, roughness=0.3))
    parts.append(tex("fire-button", cyl(0.065, 0.055, 0.0, f=0.02, seg=32, axis="z", t=(0.03, 0.46, 0.125)),
                     "#F25C54", "grip", 3, roughness=0.5))
    parts.append(tex("airflow-slot", rb((0.2, 0.03, 0.04), 0.012, (0, 0.13, 0.12)), "#0B0F15", "carbon", 3,
                     roughness=0.6))
    parts.append(tex("slot-dots", P.merge(*[cyl(0.012, 0.03, 0.0, f=0.004, seg=10, axis="z",
                                                 t=(x, 0.28, 0.14)) for x in (-0.08, -0.03, 0.02, 0.07, 0.12)]),
                     "#8A94A3", "brushed", 3, metalness=0.5))
    parts.append(tex("usb-c", rb((0.13, 0.034, 0.07), 0.015, (0, 0.004, 0.0)), "#7B8594", "brushed", 3,
                     metalness=0.8, roughness=0.3))
    parts.append(tex("usb-slot", rb((0.09, 0.012, 0.03), 0.005, (0, -0.002, 0.0)), "#05070A", "carbon", 2))
    # pod seat: gold magnet contacts bridging the gap
    pins = P.merge(*[cyl(0.032, 0.09, 0.69, f=0.008, seg=16, t=(x, 0, 0)) for x in (-0.11, 0.11)])
    parts.append(tex("contacts", pins, GOLD, "noise", 3, metalness=0.85, roughness=0.3))
    # pod: base, glass, liquid, chimney, coil, mouthpiece
    parts.append(tex("pod-base", cyl(1, 0.07, 0.75, f=0.025, seg=48, s=(0.235, 1, 0.105)), "#E8ECF1", "grip", 3,
                     roughness=0.5))
    parts.append(P.part("pod-glass", cyl(1, 0.4, 0.8, f=0.07, seg=48, s=(0.228, 1, 0.098)), "#DDF4FF",
                        roughness=0.1, transparency=0.6))
    parts.append(P.part("liquid", cyl(1, 0.27, 0.84, f=0.05, seg=40, s=(0.198, 1, 0.07)), AMBER,
                        roughness=0.2, transparency=0.2))
    parts.append(tex("chimney", cyl(0.04, 0.4, 0.78, f=0.01, seg=20), "#C9CED6", "brushed", 3,
                     metalness=0.7, roughness=0.3))
    coil = P.merge(*[cyl(0.054, 0.012, y, f=0.004, seg=20) for y in np.linspace(0.84, 0.98, 6)])
    parts.append(tex("coil", coil, "#B6602B", "noise", 3, metalness=0.8, roughness=0.35))
    parts.append(tex("wick", rb((0.07, 0.05, 0.02), 0.008, (0, 0.82, 0.0)), "#F4EBD9", "grip", 3))
    parts.append(tex("mouthpiece", rb((0.34, 0.14, 0.17), 0.06, (0, 1.2, 0.0), seg=3), "#F2F4F7", "grip", 3,
                     roughness=0.45))
    parts.append(tex("mouth-hole", rb((0.15, 0.016, 0.03), 0.007, (0, 1.275, 0.0)), "#0B0F15", "carbon", 2))
    P.ground(parts)
    return parts, tx


@P.prop("box-mod", "Box mod")
def box_mod(rng):
    BLK, STEEL, GOLD, AMBER, RED = "#262B36", "#C9CED6", "#E0B04A", "#FF9A3C", "#E8483E"
    tx = {"brushed": T("brushed", STEEL, "#8E96A3", "#EEF1F5", 4),
          "carbon": T("carbon", "#171A21", "#07080B", "#454E60", 6),
          "grip": T("grip", RED, "#9E2A22", "#FF8A80", 5),
          "noise": T("noise", GOLD, "#A87D22", "#FFE08A", 5),
          "stripes": T("stripes", BLK, "#161A22", "#4B5568", 6)}
    W, D, H = 0.72, 0.36, 0.6
    zf = D / 2
    parts = []
    parts.append(tex("body", rb((W, H, D), 0.09, (0, H / 2, 0.0), seg=3), "#3A4660", "stripes", 3,
                     roughness=0.45, metalness=0.3))
    side = [rb((0.03, 0.44, 0.24), 0.012, (s * (W / 2 + 0.005), 0.3, 0.0)) for s in (-1, 1)]
    parts.append(tex("side-panels", P.merge(*side), "#171A21", "carbon", 4, roughness=0.3))
    bolts = [cyl(0.022, 0.03, 0.0, f=0.006, seg=12, axis="x", t=(s * (W / 2 + 0.005), 0.3 + dy, dz))
             for s in (-1, 1) for dy in (-0.17, 0.17) for dz in (-0.09, 0.09)]
    parts.append(tex("panel-bolts", P.merge(*bolts), GOLD, "noise", 3, metalness=0.85, roughness=0.3))
    parts.append(tex("bottom-foot", rb((W - 0.1, 0.04, D - 0.06), 0.015, (0, 0.018, 0.0)), BLK, "carbon", 3))
    # front controls
    parts.append(tex("bezel", rb((0.34, 0.2, 0.03), 0.02, (-0.1, 0.44, zf)), BLK, "carbon", 4, roughness=0.3))
    parts.append(P.part("screen", rb((0.27, 0.13, 0.02), 0.012, (-0.1, 0.44, zf + 0.018)), "#7DF3FF",
                        emissive="#35D8F0", emissiveIntensity=2.2))
    digits = [rb((0.035, 0.065, 0.012), 0.004, (-0.18 + 0.065 * i, 0.44, zf + 0.032)) for i in range(3)]
    parts.append(P.part("digits", P.merge(*digits), "#063A44", roughness=0.4))
    parts.append(tex("fire-ring", cyl(0.105, 0.03, 0.0, f=0.01, seg=36, axis="z", t=(0.205, 0.44, zf - 0.02)),
                     STEEL, "brushed", 3, metalness=0.75, roughness=0.3))
    parts.append(tex("fire-button", cyl(0.08, 0.05, 0.0, f=0.02, seg=32, axis="z", t=(0.205, 0.44, zf - 0.02)),
                     RED, "grip", 3, roughness=0.5))
    parts.append(tex("pm-buttons", P.merge(rb((0.085, 0.07, 0.03), 0.015, (-0.2, 0.26, zf)),
                                           rb((0.085, 0.07, 0.03), 0.015, (-0.07, 0.26, zf))),
                     "#555F73", "stripes", 3, roughness=0.5))
    glyph = P.merge(rb((0.045, 0.01, 0.012), 0.003, (-0.2, 0.26, zf + 0.02)),
                    rb((0.01, 0.045, 0.012), 0.003, (-0.2, 0.26, zf + 0.02)),
                    rb((0.045, 0.01, 0.012), 0.003, (-0.07, 0.26, zf + 0.02)))
    parts.append(tex("pm-glyphs", glyph, "#F2F4F7", "grip", 2))
    parts.append(tex("usb-port", rb((0.14, 0.05, 0.03), 0.02, (0.2, 0.15, zf)), "#0B0F15", "carbon", 3))
    parts.append(tex("usb-tongue", rb((0.09, 0.012, 0.012), 0.004, (0.2, 0.15, zf + 0.012)), "#9AA3B2", "brushed", 2,
                     metalness=0.8))
    # 510 plate + tank
    parts.append(tex("plate-510", cyl(0.23, 0.045, H - 0.01, f=0.014, seg=48), STEEL, "brushed", 3,
                     metalness=0.75, roughness=0.3))
    parts.append(tex("pin-510", cyl(0.05, 0.04, H + 0.03, f=0.012, seg=24), GOLD, "noise", 3, metalness=0.85,
                     roughness=0.3))
    y0 = H + 0.03
    parts.append(tex("tank-base", cyl(0.205, 0.07, y0, f=0.014, seg=48, rmod=knurl(24, 0.01)),
                     "#2B303B", "carbon", 3, metalness=0.5, roughness=0.4))
    notch = lambda th, Y, R: R * (1 - 0.1 * (np.cos(th * 6) > 0.8) * (R > 0.02))
    parts.append(tex("airflow-ring", cyl(0.2, 0.075, y0 + 0.07, f=0.01, seg=48, rmod=notch),
                     STEEL, "brushed", 3, metalness=0.75, roughness=0.3))
    parts.append(tex("air-core", cyl(0.17, 0.07, y0 + 0.072, f=0.005, seg=24), "#07080B", "carbon", 2))
    gy = y0 + 0.145
    gprof = [(0, 0), (0.18, 0), (0.195, 0.1), (0.195, 0.24), (0.18, 0.34), (0, 0.34)]
    parts.append(P.part("glass", cyl(0, 0, gy, f=0.03, seg=48, prof=gprof), "#DDF4FF", roughness=0.1,
                        transparency=0.6))
    parts.append(P.part("liquid", cyl(0.16, 0.22, gy + 0.03, f=0.04, seg=36), AMBER, roughness=0.2,
                        transparency=0.2))
    parts.append(tex("chimney", cyl(0.05, 0.36, gy - 0.01, f=0.01, seg=20), STEEL, "brushed", 3,
                     metalness=0.7, roughness=0.3))
    parts.append(tex("top-cap", cyl(0.205, 0.075, gy + 0.335, f=0.015, seg=48, rmod=knurl(24, 0.01)),
                     "#2B303B", "carbon", 3, metalness=0.5, roughness=0.4))
    ty = gy + 0.41
    tip = [(0, 0), (0.12, 0), (0.115, 0.05), (0.13, 0.12), (0.17, 0.15), (0, 0.15)]
    parts.append(tex("drip-tip", cyl(0, 0, ty, f=0.03, seg=40, prof=tip), "#10161E", "grip", 3, roughness=0.25))
    parts.append(tex("tip-rim", cyl(0.145, 0.02, ty + 0.145, f=0.006, seg=40,
                                    prof=[(0, 0), (0.178, 0), (0.178, 0.02), (0, 0.02)]),
                     RED, "grip", 3, roughness=0.4))
    parts.append(P.part("tip-hole", cyl(0.07, 0.01, ty + 0.162, f=0.003, seg=24), "#020304", roughness=0.8))
    P.ground(parts)
    return parts, tx
