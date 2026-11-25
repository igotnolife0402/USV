# @style: toon
# @model: disposable-vape, vape-pen | Toon vape props (builders registered into props.PROPS)
# @run: python3 vapes.py OUT --check
import math
import numpy as np
import props as P

FZ = (90, 0, 0)
BZ = (-90, 0, 0)


def tex(pat, base, dark, light, scale=2):
    return {"kind": "procedural", "pattern": pat, "colors": [base, dark, light], "scale": scale}


def rb(size, r, t, seg=2, uv=1.0):
    return P.box_uv(P.xf(P.rbox(size, r, seg), t=t), uv)


def disc(r, h, t, seg=16, bev=0.004, uv=None):
    """Round flat plug facing +Z, base at z=t.z."""
    m = P.lathe(P.fillet([(0, 0), (r, 0), (r, h), (0, h)], [0, bev, bev, 0], 1), seg)
    m = P.xf(m, t=t, r=FZ)
    return P.box_uv(m, uv) if uv else m


def ring(r_in, r_out, h, y, seg=48, bev=0.008):
    pr = [(r_in, y), (r_out, y), (r_out, y + h), (r_in, y + h)]
    return P.lathe(P.fillet(pr, bev, 1, closed=True), seg, closed=True)


def cyl(r, y0, y1, seg, bev, uv):
    pr = P.fillet([(0, y0), (r, y0), (r, y1), (0, y1)], [0, bev, bev, 0], 3)
    return P.box_uv(P.lathe(pr, seg), uv)


# ------------------------------------------------------------------ disposable
@P.prop("disposable-vape", "Disposable vape")
def disposable(rng):
    parts, T = [], {}
    A = parts.append
    T["grad-a"] = tex("gradient", "#ff6fb1", "#7b3dff", "#ffd1e8")
    T["grad-b"] = tex("gradient", "#46d6e8", "#2a5bd7", "#d4fbff")
    T["grip"] = tex("grip", "#26262e", "#101014", "#3a3a46", 4)
    T["noise"] = tex("noise", "#2b2b33", "#17171c", "#3c3c48", 3)
    T["brushed"] = tex("brushed", "#c9ced6", "#8d939c", "#eef1f5", 3)
    T["stripes"] = tex("stripes", "#fbfbfd", "#d6d9e2", "#ffffff", 6)

    # rubberised bottom cap, core, two-tone sleeve, shoulder
    A(P.part("cap", rb((0.55, 0.20, 0.33), 0.05, (0, 0.10, 0)), "#26262e", roughness=0.9, texture="grip"))
    A(P.part("core", rb((0.51, 0.07, 0.30), 0.03, (0, 0.6325, 0), 3), "#2b2b33", roughness=0.6, texture="noise"))
    A(P.part("sleeve-low", rb((0.54, 0.46, 0.32), 0.1, (0, 0.40, 0), 3, 0.9), "#ff6fb1", roughness=0.35, texture="grad-a"))
    A(P.part("sleeve-up", rb((0.54, 0.46, 0.32), 0.1, (0, 0.865, 0), 3, 0.9), "#46d6e8", roughness=0.35, texture="grad-b"))
    A(P.part("shoulder", rb((0.52, 0.12, 0.30), 0.05, (0, 1.14, 0)), "#e6e8ee", roughness=0.4, metalness=0.2, texture="brushed"))

    # contoured flat mouthpiece, oval outlet
    A(P.part("mouthpiece", rb((0.36, 0.16, 0.20), 0.07, (0, 1.24, 0), 3), "#26262e", roughness=0.5, texture="grip"))
    A(P.part("mouth-lip", rb((0.27, 0.05, 0.15), 0.02, (0, 1.325, 0)), "#3a3a46", roughness=0.5, texture="noise"))

    def oval(r, h, y):
        m = P.lathe(P.fillet([(0, 0), (r, 0), (r, h), (0, h)], [0, 0.004, 0.004, 0], 1), 24)
        return P.xf(m, t=(0, y, 0), s=(1.9, 1, 1.0))
    A(P.part("outlet-rim", P.box_uv(oval(0.062, 0.012, 1.345), 2), "#e6e8ee", metalness=0.4, roughness=0.35, texture="brushed"))
    A(P.part("outlet", oval(0.045, 0.02, 1.347), "#07070a", roughness=0.9))

    # label band: light panel, accent strips
    zf = 0.16
    A(P.part("label-panel", rb((0.40, 0.28, 0.03), 0.012, (0, 0.865, zf + 0.006)), "#fbfbfd", roughness=0.5, texture="stripes"))
    A(P.part("strip-top", rb((0.50, 0.025, 0.02), 0.008, (0, 1.055, zf + 0.004)), "#ffd45e", roughness=0.4, texture="brushed"))
    A(P.part("strip-low", rb((0.50, 0.025, 0.02), 0.008, (0, 0.665, zf + 0.004)), "#ffffff", roughness=0.4, texture="stripes"))
    A(P.part("strip-side", rb((0.02, 0.60, 0.02), 0.008, (0.2, 0.40, zf + 0.004)), "#ffd45e", roughness=0.4, texture="brushed"))

    # LED window and airflow pinholes on the cap front
    zc = 0.165
    A(P.part("led-bezel", rb((0.16, 0.06, 0.02), 0.012, (0, 0.10, zc + 0.004)), "#0e0e12", roughness=0.4, texture="noise"))
    A(P.part("led", rb((0.11, 0.03, 0.02), 0.01, (0, 0.10, zc + 0.012)), "#ff3d8b", emissive="#ff3d8b", emissiveIntensity=2.2))
    holes = [disc(0.013, 0.014, (sx * x, 0.10, zc - 0.002), seg=10) for sx in (-1, 1) for x in (0.14, 0.18, 0.22)]
    A(P.part("pinholes", P.merge(*holes), "#050507", roughness=0.9))

    # charging port on the back
    A(P.part("port-rim", rb((0.17, 0.07, 0.02), 0.014, (0, 0.10, -zc - 0.004)), "#c9ced6", metalness=0.7, roughness=0.3, texture="brushed"))
    A(P.part("port-slot", rb((0.12, 0.035, 0.02), 0.015, (0, 0.10, -zc - 0.012)), "#050507", roughness=0.9))
    P.ground(parts)
    return parts, T


# ------------------------------------------------------------------ vape pen
@P.prop("vape-pen", "Vape pen")
def vape_pen(rng):
    parts, T = [], {}
    A = parts.append
    T["brushed"] = tex("brushed", "#c9ced6", "#8d939c", "#eef1f5", 3)
    T["grip"] = tex("grip", "#2a2d36", "#14161b", "#454957", 4)
    T["noise"] = tex("noise", "#1e2026", "#0f1013", "#32353d", 3)
    T["carbon"] = tex("carbon", "#22252c", "#101216", "#3a3e48", 3)
    T["liquid"] = tex("noise", "#ff9a3c", "#e0701a", "#ffc27a", 2)
    T["copper"] = tex("brushed", "#d98a4e", "#9c5a2a", "#f3b98a", 3)
    R = 0.165

    # knurled base cap with vent holes
    knurl = lambda th, Y, Rr: Rr * (1 + 0.035 * np.cos(th * 12) * (Rr > 0.1))
    base = P.lathe(P.fillet([(0, 0), (0.15, 0), (0.17, 0.02), (0.17, 0.14), (0, 0.14)], [0, 0.02, 0.02, 0.01, 0], 3),
                   48, rmod=knurl)
    A(P.part("base-cap", P.box_uv(base, 1.2), "#2a2d36", metalness=0.6, roughness=0.45, texture="grip"))
    vh = []
    for k in range(8):
        a = k * math.pi / 4 + math.pi / 8
        d = disc(0.016, 0.02, (0, 0, 0), seg=8)
        vh.append(P.xf(d, t=(0.17 * math.sin(a), 0.07, 0.17 * math.cos(a)), r=(90, math.degrees(a), 0)))
    A(P.part("vents", P.merge(*vh), "#050507", roughness=0.9))

    # brushed battery tube + accent band
    A(P.part("battery", cyl(R, 0.14, 0.67, 64, 0.0, 1.3), "#c9ced6", metalness=0.8, roughness=0.3, texture="brushed"))
    A(P.part("accent-band", P.box_uv(ring(R - 0.01, R + 0.012, 0.04, 0.5, 40, 0.006), 2), "#2fd0c4", metalness=0.4, roughness=0.35, texture="brushed"))

    # ring-lit fire button
    zr = R - 0.004
    A(P.part("btn-housing", disc(0.075, 0.03, (0, 0.38, zr), uv=2), "#14161b", roughness=0.5, texture="noise"))
    A(P.part("btn-glow", disc(0.063, 0.04, (0, 0.38, zr), seg=32), "#35e0d2", emissive="#35e0d2", emissiveIntensity=2.2))
    A(P.part("btn-ring", disc(0.052, 0.046, (0, 0.38, zr), seg=32, uv=2), "#14161b", roughness=0.5, texture="noise"))
    A(P.part("btn-cap", disc(0.04, 0.056, (0, 0.38, zr), seg=32, bev=0.012, uv=2), "#e6e8ee", metalness=0.8, roughness=0.25, texture="brushed"))

    # o-rings, 510 collar and threads
    orx = lambda y, r: ring(r - 0.014, r + 0.01, 0.026, y, 28, 0.011)
    A(P.part("o-rings", P.box_uv(P.merge(orx(0.655, 0.15), orx(0.805, 0.145), orx(1.065, 0.145)), 2), "#14161b", roughness=0.9, texture="noise"))
    A(P.part("collar", cyl(0.12, 0.66, 0.77, 48, 0.0, 2), "#c9ced6", metalness=0.85, roughness=0.25, texture="brushed"))
    th = [ring(0.115, 0.13, 0.014, 0.68 + 0.022 * i, 32, 0.005) for i in range(3)]
    A(P.part("threads", P.box_uv(P.merge(*th), 2), "#aab0b9", metalness=0.85, roughness=0.3, texture="brushed"))

    # tank base, glass with liquid, coil and centre post
    A(P.part("tank-base", cyl(R, 0.76, 0.84, 40, 0.015, 1.3), "#2a2d36", metalness=0.5, roughness=0.4, texture="carbon"))
    A(P.part("glass", ring(0.138, 0.15, 0.23, 0.84, 40, 0.005), "#cfeef5", roughness=0.05, transparency=0.6))
    A(P.part("liquid", cyl(0.132, 0.845, 1.0, 32, 0.03, 1.5), "#ff9a3c", roughness=0.2, transparency=0.35, texture="liquid"))
    A(P.part("post", cyl(0.03, 0.84, 1.07, 20, 0.008, 2), "#c9ced6", metalness=0.9, roughness=0.25, texture="brushed"))
    ys = np.linspace(0.85, 0.99, 28)
    helix = lambda th_, Y, Rr: Rr * (1 + 0.45 * (0.5 + 0.5 * np.sin(th_ + Y * 190)))
    coil = P.lathe([(0.032, y) for y in ys], 20, rmod=helix)
    A(P.part("coil", P.box_uv(coil, 3), "#d98a4e", metalness=0.9, roughness=0.3, texture="copper"))

    # top cap, tapered drip tip
    top = P.fillet([(0, 1.07), (R, 1.07), (R, 1.14), (0.1, 1.15), (0, 1.15)], [0, 0.015, 0.02, 0.02, 0], 2)
    A(P.part("top-cap", P.box_uv(P.lathe(top, 40), 1.3), "#c9ced6", metalness=0.8, roughness=0.3, texture="brushed"))
    tip = [(0, 1.14), (0.1, 1.14), (0.1, 1.18), (0.075, 1.22), (0.068, 1.3), (0.082, 1.32), (0.07, 1.345), (0, 1.345)]
    A(P.part("drip-tip", P.box_uv(P.lathe(P.fillet(tip, [0, 0.01, 0.02, 0.03, 0.02, 0.012, 0.008, 0], 2), 32), 2),
             "#2a2d36", roughness=0.5, texture="carbon"))
    A(P.part("tip-hole", P.xf(P.lathe([(0, 0), (0.038, 0), (0.038, 0.01), (0, 0.01)], 24), t=(0, 1.338, 0)), "#050507", roughness=0.9))
    A(P.part("tip-collar", P.box_uv(ring(0.07, 0.108, 0.02, 1.15, 32, 0.007), 2), "#2fd0c4", metalness=0.4, roughness=0.35, texture="brushed"))
    P.ground(parts)
    return parts, T
