"""Maximum-detail layer for arms, hands, legs and feet (adds pieces on top of shadow_parts base)."""


def build(K):
    np, SP = K.np, K.SP
    A = np.array

    def lerp(a, b, f): return a + (b - a) * f

    def frame(d):
        d = d / np.linalg.norm(d)
        h = A((0, 0, 1.0)) if abs(d[2]) < 0.9 else A((1.0, 0, 0))
        u = np.cross(h, d); u /= np.linalg.norm(u)
        return d, u, np.cross(d, u)

    def rot(d, u):                      # local Y = limb axis, local X = u
        d, u, n = frame(d)[0], frame(d)[1], frame(d)[2]
        return np.stack([u, d, n], 1)

    def stud(seg, c, r, col):
        K.emit(seg, *K.blob(c, r, None, amp=0.0, waves=1, lat=6, lon=8), col)

    def ring(seg, a, b, r, col, flat=1.0):
        K.emit(seg, *K.tube([a, b], lambda t: r, sides=10, per=2, flat=flat), col)

    def plate(seg, c, d, ln, w, th, col):
        K.emit(seg, *K.blob(c, (w, ln, th), rot(d, np.cross(d, A((0, 0, 1.0))) if abs(d[2]) < 0.9 else A((1.0, 0, 0))), amp=0.012, waves=4, lat=8, lon=12), col)

    def glow(seg, pts, r):
        K.emit(seg, *K.tube(pts, lambda t: r * (1 - 0.35 * t), sides=6, per=4, tip=True), SP.VEIN)

    def claw(seg, base, d, L, r, col):
        d = d / np.linalg.norm(d)
        K.emit(seg, *K.tube([base, base + d * L * 0.5 + A((0, -0.05, 0)), base + d * L + A((0, -0.2 * L, 0))],
                            lambda t: r * (1 - 0.85 * t), sides=6, per=4, tip=True), col)

    def limb(seg, a, b, rad, s, n_plates, col_plate, pa, pb, vein_n, spurs=False):
        """Guard plates, studs, tendons, veins along a->b; rad = (r0, r1)."""
        d = (b - a) / np.linalg.norm(b - a)
        _, u, n = frame(d)
        for i in range(n_plates):
            f = (i + 0.5) / n_plates
            r = rad[0] + (rad[1] - rad[0]) * f
            c = lerp(a, b, f)
            for ang, wd in ((0.0, 0.34), (2.1, 0.26), (-2.1, 0.26)):
                o = np.cos(ang) * n + np.sin(ang) * u
                if abs(ang) > 1: o = o * 1.0
                cc = c + o * (r + 0.03)
                plate(seg, cc, d + o * 0.05, (b - a).__abs__().sum() / n_plates * 0.5, wd * r * 1.4, 0.07, col_plate)
                if ang == 0.0:
                    stud(seg, cc + o * 0.07 + d * 0.18, 0.05, SP.HORN2)
                    stud(seg, cc + o * 0.07 - d * 0.18, 0.05, SP.HORN2)
            ring(seg, lerp(a, b, f - 0.5 / n_plates), lerp(a, b, f - 0.5 / n_plates + 0.035), r + 0.05, SP.RIDGE)
        for k in range(3):                                       # tendon cords
            ang = 1.2 + 0.8 * k - 1.2
            o = np.cos(ang) * n + np.sin(ang) * u
            pts = [lerp(a, b, f) + o * (rad[0] + (rad[1] - rad[0]) * f + 0.03) for f in (0.08, 0.35, 0.65, 0.92)]
            K.emit(seg, *K.tube(pts, lambda t: 0.05, sides=6, per=4), SP.DARK)
        for k in range(vein_n):                                  # branching veins
            ang = 0.5 + 1.1 * k
            o = np.cos(ang) * n + np.sin(ang) * u
            rr = lambda f: rad[0] + (rad[1] - rad[0]) * f + 0.04
            main = [lerp(a, b, f) + (o * (1 + 0.15 * np.sin(9 * f + k))) * rr(f) for f in (0.05, 0.3, 0.55, 0.8)]
            glow(seg, main, 0.055)
            m0 = main[1]
            o2 = np.cos(ang + 0.6) * n + np.sin(ang + 0.6) * u
            glow(seg, [m0, lerp(a, b, 0.42) + o2 * rr(0.42), lerp(a, b, 0.5) + (o2 * 1.1) * rr(0.5)], 0.04)
        if spurs:
            for f in (0.25, 0.4, 0.55, 0.7, 0.85):
                base = lerp(a, b, f) + A((s, 0.0, 0.0)) * (rad[0] + (rad[1] - rad[0]) * f + 0.02)
                K.emit(seg, *K.tube([base, base + A((s * 0.12, 0.05, -0.08)), base + A((s * 0.3, 0.25, -0.3))],
                                    lambda t: 0.09 * (1 - 0.9 * t), sides=6, per=3, tip=True), SP.HORN)

    def joint_cap(seg, c, s, r, front):
        """Layered bony cap with studs at elbow/knee."""
        f = front / np.linalg.norm(front)
        for i, (k, sc) in enumerate(((0.62, 0.6), (0.78, 0.45), (0.9, 0.3))):
            K.emit(seg, *K.blob(c + f * r * (0.55 + 0.17 * i), (r * sc * 1.05, r * sc * 0.9, r * 0.22), rot(f, A((0, 1.0, 0))) @ np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]]),
                               amp=0.015, waves=4, lat=8, lon=12), SP.HORN2 if i % 2 else SP.RIDGE)
        for k in range(8):
            a = k * np.pi / 4
            p = c + A((np.cos(a), np.sin(a), 0)) * r * 0.9 + A((0, 0, 0)) + f * r * 0.1
            stud(seg, p, 0.055, SP.HORN2)
        ring(seg, c - A((s, 0, 0)) * 0.0 + A((0, 0, -0.1)) - f * 0.0, c + A((0, 0, 0.05)), r + 0.04, SP.RIDGE, flat=0.6) if False else None

    for s, sd in ((-1, 'R'), (1, 'L')):
        UA, FA, HA = 'UpperArm' + sd, 'Forearm' + sd, 'Hand' + sd
        sh, el, wr = K.PIV[UA], K.PIV[FA], K.PIV[HA]
        # ---- upper arm
        limb(UA, lerp(sh, el, 0.12), lerp(sh, el, 0.92), (0.82, 0.62), s, 3, SP.BODY2, 0, 0, 2)
        # ---- elbow
        joint_cap(FA, el, s, 0.66, A((s * 0.3, 0.2, -1.0)))
        # ---- forearm guard
        limb(FA, lerp(el, wr, 0.12), lerp(el, wr, 0.9), (0.6, 0.46), s, 4, SP.BODY2, 0, 0, 3, spurs=True)
        for f in (0.93, 0.97):                                   # wrist bone rings
            ring(FA, lerp(el, wr, f), lerp(el, wr, f + 0.025), 0.5 - 0.02 * f, SP.HORN2)
        for k in range(6):
            a = k * np.pi / 3
            stud(FA, lerp(el, wr, 0.95) + A((np.cos(a), 0, np.sin(a))) * 0.5, 0.05, SP.HORN)
        # ---- hand
        hc = A((s * 5.6, 6.6, 3.3))
        plate(HA, hc + A((0, 0.1, 0.45)), A((0, 1.0, 0)), 0.5, 0.5, 0.06, SP.RIDGE)
        for k in range(3): stud(HA, hc + A((-0.3 + 0.3 * k, 0.45, 0.5)), 0.05, SP.HORN2)
        glow(HA, [hc + A((0, 0.7, -0.15)), hc + A((s * 0.1, 0.1, -0.52)), hc + A((s * 0.2, -0.4, -0.45))], 0.05)
        for x in np.linspace(-0.5, 0.5, 4):
            xx = hc[0] + x * 1.2
            p1 = A((xx + x * 0.3, 5.2, 4.05)); p2 = A((xx + x * 0.5, 4.1, 3.95)); p0 = A((xx, 6.3, 3.6))
            for p in (p0, p1, p2):
                K.emit(HA, *K.blob(p + A((0, 0, 0.17)), (0.2, 0.16, 0.1), None, amp=0.01, waves=3, lat=6, lon=10), SP.HORN2)
            plate(HA, lerp(p0, p1, 0.5) + A((0, 0, 0.19)), p1 - p0, 0.45, 0.1, 0.04, SP.RIDGE)
            plate(HA, lerp(p1, p2, 0.5) + A((0, 0, 0.19)), p2 - p1, 0.4, 0.1, 0.04, SP.RIDGE)
            claw(HA, p2 + A((x * 0.2, -1.0, 0.2)) , A((x * 0.2, -0.8, 0.9)), 0.9, 0.07, SP.CLAW)   # barb
            ring(HA, p2 + A((x * 0.02, -0.15, 0.0)), p2 + A((x * 0.04, -0.4, 0.04)), 0.19, SP.HORN)  # claw sheath
        t0 = hc + A((-s * 0.9, -1.1, 0.8))
        ring(HA, t0 + A((0, 0.1, 0)), t0 + A((-s * 0.02, -0.15, 0.1)), 0.17, SP.HORN)
        claw(HA, t0 + A((-s * 0.05, -0.5, 0.4)), A((0, -0.4, 0.9)), 0.8, 0.06, SP.CLAW)

        # ---- legs
        TH, SHN = 'Thigh' + sd, 'Shin' + sd
        hp, kn = K.PIV[TH], K.PIV[SHN]
        an = A((s * 2.15, 1.55, -0.2)); ft = A((s * 2.2, 0.45, 0.95))
        limb(TH, lerp(hp, kn, 0.15), lerp(hp, kn, 0.9), (1.0, 0.7), s, 3, SP.BODY2, 0, 0, 2)
        joint_cap(SHN, kn, s, 0.72, A((s * 0.1, 0.1, 1.0)))
        limb(SHN, lerp(kn, an, 0.12), lerp(kn, an, 0.9), (0.64, 0.48), s, 4, SP.BODY2, 0, 0, 3, spurs=True)
        for f in (0.94, 0.98):
            ring(SHN, lerp(kn, an, f), lerp(kn, an, f + 0.02), 0.52 - 0.04 * f, SP.HORN2)
        for k in range(6):
            a = k * np.pi / 3
            stud(SHN, lerp(kn, an, 0.96) + A((np.cos(a), 0, np.sin(a))) * 0.52, 0.05, SP.HORN)
        plate(SHN, A((s * 2.2, 0.82, 1.1)), A((0, 0.2, 1.0)), 0.75, 0.5, 0.06, SP.RIDGE)     # instep plate
        for k in range(4): stud(SHN, A((s * 2.2 + (k - 1.5) * 0.2, 0.9, 0.8 + 0.05 * abs(k - 1.5))), 0.05, SP.HORN2)
        glow(SHN, [A((s * 2.2, 0.95, 0.45)), A((s * 2.25, 0.95, 1.0)), A((s * 2.3, 0.85, 1.5))], 0.05)
        for dx in (-0.45, 0, 0.45):
            t0 = A((s * 2.2 + dx * 0.8, 0.45, 1.15)); t1 = A((s * 2.2 + dx * 1.5, 0.3, 2.1))
            K.emit(SHN, *K.blob(t0 + A((0, 0.2, 0.05)), (0.19, 0.12, 0.17), None, amp=0.01, waves=3, lat=6, lon=10), SP.HORN2)
            plate(SHN, lerp(t0, t1, 0.55) + A((0, 0.25, 0)), t1 - t0, 0.4, 0.14, 0.04, SP.RIDGE)
            ring(SHN, t1 + A((dx * 0.12, -0.03, 0.12)), t1 + A((dx * 0.2, -0.05, 0.3)), 0.19, SP.HORN)  # sheath
            claw(SHN, t1 + A((dx * 0.1, 0.05, 0.1)), A((dx * 0.3, -0.1, 1.0)), 0.55, 0.05, SP.CLAW)
        K.emit(SHN, *K.tube([A((s * 2.15, 0.75, -0.3)), A((s * 2.15, 0.4, -0.9)), A((s * 2.15, 0.08, -1.25))],
                            lambda t: 0.2 * (1 - 0.7 * t) + 0.02, sides=8, per=4, tip=True), SP.HORN2)
        claw(SHN, A((s * 2.35, 0.7, -0.35)), A((0.2 * s, -0.5, -0.8)), 0.8, 0.05, SP.CLAW)
