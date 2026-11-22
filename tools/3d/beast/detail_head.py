"""Maximum-detail layer for the Shadow Monster head and jaw (adds pieces on top of shadow_parts.build())."""

def build(K):
    np, math, SP = K.np, K.math, K.SP
    Hd, Jw = 'Head', 'Jaw'
    sq = lambda v: math.sqrt(max(0.0, v))

    def tb(seg, pts, r, col, sides=6, per=8, tip=False, tr=0.0):
        rf = r if callable(r) else (lambda t, r=r: r)
        V, F, UV = K.tube(pts, rf, sides=sides, per=per, tip=tip)
        K.emit(seg, V, F, UV, col, tr)

    def bl(seg, c, r, col, amp=0.0):
        V, F, UV = K.blob(c, r, None, amp=amp, lat=8, lon=12)
        K.emit(seg, V, F, UV, col)

    def spike(seg, a, b, r, col, sides=6):
        a, b = np.asarray(a, float), np.asarray(b, float)
        tb(seg, [a, (a + b) / 2 + (b - a) * 0.0, b], r, col, sides=sides, per=3, tip=True)

    skull_z = lambda x, y: 3.0 + 2.0 * sq(1 - (x / 1.35) ** 2 - ((y - 18.55) / 1.25) ** 2)
    skull_x = lambda y, z: 1.35 * sq(1 - ((y - 18.55) / 1.25) ** 2 - ((z - 3.0) / 2.0) ** 2)
    def top_y(z):
        a = 18.55 + 1.25 * sq(1 - ((z - 3.0) / 2.0) ** 2) if abs(z - 3) < 2 else 0
        b = 18.95 + 1.0 * sq(1 - ((z - 1.6) / 1.2) ** 2) if abs(z - 1.6) < 1.2 else 0
        return max(a, b)

    # ---- eyes: glowing Neon rims + dark socket rims
    for s in (-1, 1):
        for (cx, cy, cz, ang, ga, gb, sa, sb, sc, scz, sides) in (
                (0.58, 18.6, 4.82, 22, 0.42, 0.17, 0.52, 0.27, (0.46, 0.22, 0.16), 4.72, 6),
                (0.95, 19.02, 4.38, 30, 0.25, 0.11, 0.33, 0.18, (0.27, 0.14, 0.12), 4.3, 6)):
            th = math.radians(-s * ang); c, sn = math.cos(th), math.sin(th)
            def ring(a, b, glow):
                pts = []
                for p in np.linspace(0, 2 * math.pi * 0.97, 14):
                    lx, ly = a * math.cos(p), b * math.sin(p)
                    x, y = s * cx + lx * c - ly * sn, cy + lx * sn + ly * c
                    z = skull_z(x, y)
                    k = 1 - (lx / sc[0]) ** 2 - (ly / sc[1]) ** 2
                    if k > 0: z = max(z, scz + sc[2] * sq(k))
                    pts.append((x, y, z + (0.03 if glow else 0.05)))
                return pts
            tb(Hd, ring(ga, gb, True), 0.028 if ga > 0.3 else 0.022, SP.EYE, sides=sides, per=14)
            tb(Hd, ring(sa, sb, False), 0.05 if sa > 0.4 else 0.04, SP.DARK, sides=sides, per=10)

    # ---- brow plates + studs, cheek plates, scars
    for s in (-1, 1):
        for k, f in enumerate(np.linspace(0.12, 0.88, 5)):
            p = np.array((s * 0.15, 18.92, 4.92)) * (1 - f) + np.array((s * 1.15, 19.02, 4.35)) * f
            bl(Hd, p + (0, 0.1, 0.02), (0.2, 0.065, 0.17), SP.DARK if k % 2 == 0 else SP.RIDGE)
            bl(Hd, p + (0, 0.16, 0.0), (0.045, 0.04, 0.045), SP.HORN2)
        for k, (y, z) in enumerate(((18.75, 3.1), (18.5, 3.5), (18.25, 3.9), (18.05, 4.25))):
            bl(Hd, (s * (skull_x(y, z) + 0.0), y, z), (0.09, 0.2, 0.34), SP.DARK if k % 2 else SP.RIDGE)
            bl(Hd, (s * (skull_x(y, z) + 0.08), y, z + 0.1), (0.04, 0.04, 0.04), SP.HORN2)
        # scars: thin ridge grooves
        pts = [(s * (0.95 - 0.16 * i), 19.45 - 0.14 * i, 0) for i in range(5)]
        tb(Hd, [(x, y, skull_z(x, y) + 0.02) for x, y, _ in pts], 0.022, SP.RIDGE, per=10)
        for i in range(3):
            x, y = s * (0.7 - 0.1 * i), 19.3 - 0.1 * i - 0.0
            x2, y2 = x - s * 0.1, y + 0.2
            tb(Hd, [(x, y, skull_z(x, y) + 0.015), (x2, y2, skull_z(x2, y2) + 0.015)], 0.014, SP.RIDGE, sides=6, per=6)
        pts = [(s * (skull_x(y, z) + 0.01), y, z) for y, z in ((18.9, 2.6), (18.65, 3.0), (18.45, 3.4), (18.3, 3.7))]
        tb(Hd, pts, 0.02, SP.DARK, per=10)

    # ---- crest over the skull: plates between the crown spikes + side ridges
    for k in range(14):
        z = 4.1 - 0.23 * k - 0.22 * (k % 2) * 0.0
        z += 0.22 if k % 2 else 0.0
        y = top_y(z)
        if y <= 0: continue
        bl(Hd, (0, y + 0.0, z), (0.13 - 0.004 * k, 0.1, 0.22), SP.DARK if k % 2 else SP.HORN2)
    for s in (-1, 1):
        pts = []
        for z in np.linspace(4.0, 1.2, 8):
            x = 0.34 * s; yy = top_y(z) - 0.02
            pts.append((x, yy - 0.03 - 0.03 * (x / 1.35) ** 2 * 6, z))
        # keep the side ridge on the surface: lower y by the ellipsoid drop at x
        pts = [(x, (18.55 + 1.25 * sq(1 - (x / 1.35) ** 2 - ((z - 3) / 2) ** 2)) if abs(z - 3) < 2 else y, z) for x, y, z in pts]
        pts = [(x, max(y, top_y(z) - 0.1) + 0.0, z) for x, y, z in pts]
        tb(Hd, [(x, y + 0.02, z) for x, y, z in pts], 0.04, SP.RIDGE, per=6)

    # ---- horns: segmented bands, barbs
    def horn(s, pts, r0, r1, tfs, barbs, col):
        C = K.spline(pts, 60); T = np.gradient(C, axis=0); T /= np.linalg.norm(T, axis=1)[:, None]
        for t in tfs:
            i = int(t * 59); r = (r0 + (r1 - r0) * t) * 1.12 + 0.03
            u = np.cross(T[i], (0, 1, 0)); u /= np.linalg.norm(u); v = np.cross(T[i], u)
            ring = [C[i] + (u * math.cos(a) + v * math.sin(a)) * r for a in np.linspace(0, 2 * math.pi * 0.97, 11)]
            tb(Hd, ring, 0.04, col, sides=6, per=7)
        for j, t in enumerate(barbs):
            i = int(t * 59); r = (r0 + (r1 - r0) * t)
            d = (0, 1, 0) if j % 2 == 0 else (s, 0.2, 0)
            d = np.array(d, float); d = d - T[i] * (d @ T[i])
            if np.linalg.norm(d) < 0.3: continue
            d /= np.linalg.norm(d)
            spike(Hd, C[i] + d * r * 0.9, C[i] + d * (r + 0.32 - 0.1 * t) - T[i] * 0.12, 0.07 * (1 - 0.4 * t), SP.HORN2, sides=6)
    for s in (-1, 1):
        gp = [(s * 0.85, 19.45, 3.5), (s * 1.55, 20.5, 2.4), (s * 2.05, 21.15, 0.7), (s * 1.95, 21.0, -1.1)]
        horn(s, gp, 0.42, 0.22, (0.08, 0.17, 0.26, 0.34, 0.64, 0.74, 0.84, 0.93), (0.22, 0.3, 0.6, 0.7, 0.8, 0.9), SP.HORN2)
        sp = [(s * 1.25, 18.85, 2.6), (s * 2.1, 18.95, 1.7), (s * 2.55, 18.55, 0.5)]
        horn(s, sp, 0.22, 0.12, (0.15, 0.3, 0.45, 0.6), (0.35, 0.55), SP.HORN2)

    # ---- nostril ridges
    for s in (-1, 1):
        nz = lambda x, y: 5.15 + 0.4 * sq(1 - (x / 0.55) ** 2 - ((y - 18.25) / 0.32) ** 2)
        for pp in (((0.1, 18.55), (0.28, 18.55), (0.42, 18.45)), ((0.1, 18.3), (0.26, 18.22), (0.4, 18.2))):
            tb(Hd, [(s * x, y, nz(s * x, y) + 0.02) for x, y in pp], 0.03, SP.RIDGE, sides=6, per=10)

    # ---- teeth: gum ridges + inner fang rows
    ang = np.radians(np.linspace(-66, 66, 15))
    tb(Hd, [(1.02 * math.sin(t), 17.67, 4.2 + 1.18 * math.cos(t)) for t in ang], 0.06, SP.RIDGE, sides=7, per=7)
    ang = np.radians(np.linspace(-58, 58, 13))
    tb(Jw, [(0.95 * math.sin(t), 17.27, 4.15 + 1.1 * math.cos(t)) for t in ang], 0.055, SP.RIDGE, sides=7, per=7)
    for a in np.linspace(-50, 50, 9):
        t = math.radians(a); x, z = 0.82 * math.sin(t), 4.2 + 0.98 * math.cos(t); ln = 0.24 - 0.09 * abs(t)
        spike(Hd, (x, 17.66, z), (x * 0.98, 17.66 - ln, z + 0.01), 0.05, SP.TEETH, sides=6)
    for a in np.linspace(-45, 45, 8):
        t = math.radians(a); x, z = 0.78 * math.sin(t), 4.15 + 0.93 * math.cos(t); ln = 0.22 - 0.08 * abs(t)
        spike(Jw, (x, 17.28, z), (x * 0.98, 17.28 + ln, z + 0.01), 0.048, SP.TEETH, sides=6)

    # ---- jaw line and chin spikes
    jc, jr = np.array((0, 17.05, 4.1)), np.array((1.0, 0.38, 1.25))
    for s in (-1, 1):
        for k, az in enumerate((38, 62, 88, 114, 140)):
            a, el = math.radians(az), math.radians(30 + 8 * (k % 2))
            d = np.array((s * math.cos(el) * math.sin(a), -math.sin(el), math.cos(el) * math.cos(a)))
            n = d / jr; n /= np.linalg.norm(n); p = jc + jr * d
            spike(Jw, p - n * 0.04, p + n * (0.34 - 0.04 * k), 0.07 - 0.005 * k, SP.HORN2, sides=7)
    for sx in (-0.25, 0.25):
        d = np.array((sx, -0.75, 0.62)); d /= np.linalg.norm(d); n = d / jr; n /= np.linalg.norm(n); p = jc + jr * d
        spike(Jw, p - n * 0.04, p + n * 0.3, 0.06, SP.HORN2, sides=7)
    bl(Jw, (0, 16.7, 4.55), (0.28, 0.09, 0.16), SP.DARK)

    # ---- subtle glowing drips from the grin
    for x, ln in ((0.4, 0.55), (-0.62, 0.38)):
        tb(Hd, [(x, 17.45, 5.1), (x, 17.25, 5.31), (x, 17.0 - ln + 0.35, 5.36)], lambda t: 0.04 * (1 - 0.3 * t), SP.MOUTH, sides=6, per=8)
        bl(Hd, (x, 16.62 - ln + 0.55, 5.36), (0.055, 0.075, 0.055), SP.MOUTH)
