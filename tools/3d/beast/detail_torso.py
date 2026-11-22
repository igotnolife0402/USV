"""Maximum-detail layer for TORSO, HIPS and TAIL (Chest / Hips segments). build(K) only adds pieces on top of the base."""
# @style: helper
import numpy as np, math

RC, RR = np.array((0.0, 13.9, 0.5)), np.array((2.3, 2.95, 1.95))     # ribcage ellipsoid (base layout)
WC, WR = np.array((0.0, 11.75, 0.3)), np.array((1.6, 1.35, 1.35))    # waist


def build(K):
    SP, np_, rng = K.SP, K.np, K.rng
    C, H = 'Chest', 'Hips'

    def tb(seg, pts, r, col, sides=6, per=4, tip=False, flat=1.0, tr=0.0, rf=None):
        V, F, UV = K.tube([np_.asarray(p, float) for p in pts], rf or (lambda t: r), sides=sides, per=per, tip=tip, flat=flat)
        K.emit(seg, V, F, UV, col, tr)

    def ball(seg, c, r, col, R=None):
        r = (r, r, r) if np_.isscalar(r) else r
        V, F, UV = K.blob(c, r, R, amp=0.0, lat=6, lon=10)
        K.emit(seg, V, F, UV, col)

    def spike(seg, b, t, r, col, sides=7):
        b, t = np_.asarray(b, float), np_.asarray(t, float); d = t - b
        sd = np_.cross(d, (0.13, 0.97, 0.2)); sd /= max(np_.linalg.norm(sd), 1e-9)
        tb(seg, [b, b + d * 0.55 + sd * np_.linalg.norm(d) * 0.05, t], r, col, sides=sides, per=3, tip=True)

    def rib_pt(d, s=1.05):                    # point on (slightly inflated) ribcage along unit-ish dir d
        d = np_.asarray(d, float); d = d / np_.linalg.norm(d); return RC + d * RR * s

    def front(x, y):                          # z of the front surface (ribcage or waist)
        z = -9.0
        for c, r in ((RC, RR), (WC, WR)):
            q = 1 - ((x - c[0]) / r[0]) ** 2 - ((y - c[1]) / r[1]) ** 2
            if q > 0: z = max(z, c[2] + r[2] * math.sqrt(q))
        return z

    def tilt(ax, ay, az):
        cx, sx, cy, sy, cz, sz = math.cos(ax), math.sin(ax), math.cos(ay), math.sin(ay), math.cos(az), math.sin(az)
        Rx = np_.array(((1, 0, 0), (0, cx, -sx), (0, sx, cx))); Ry = np_.array(((cy, 0, sy), (0, 1, 0), (-sy, 0, cy)))
        Rz = np_.array(((cz, -sz, 0), (sz, cz, 0), (0, 0, 1))); return Rz @ Ry @ Rx

    # ---------------- glowing core assembly ----------------
    cc = np_.array((0.0, 14.0, 2.55)); n = 10
    for i in range(n):
        a = i / n * 2 * math.pi; x, y = 1.0 * math.cos(a), 14.0 + 1.1 * math.sin(a)
        b = np_.array((x, y, front(x, y) + 0.02)); out = np_.array((math.cos(a), math.sin(a), 0.35)) * (0.75 + 0.2 * (i % 2))
        spike(C, b, b + out, 0.1, SP.HORN2 if i % 2 else SP.RIDGE)
        ball(C, b + (0, 0, 0.03), 0.09, SP.RIDGE)
        a2 = (i + 1) / n * 2 * math.pi; x2, y2 = 1.0 * math.cos(a2), 14.0 + 1.1 * math.sin(a2)
        tb(C, [b + (0, 0, 0.05), (b + np_.array((x2, y2, front(x2, y2) + 0.02))) / 2 + (0, 0, 0.18), (x2, y2, front(x2, y2) + 0.07)], 0.025, SP.VEIN, sides=5, per=3)   # filament
        tb(C, [cc + (x * 0.3, (y - 14) * 0.3, 0.1), (x * 0.7, 14 + (y - 14) * 0.7, front(x * 0.7, 14 + (y - 14) * 0.7) + 0.1)], 0.02, SP.CORE, sides=5, per=3)
    for i in range(6):                         # crystal shards fixed on the chest
        a = rng.uniform(0, 2 * math.pi); x, y = 1.9 * math.cos(a), 14.0 + 2.3 * math.sin(a); z = front(x, y)
        b = np_.array((x, y, z)); spike(C, b, b + np_.array((x * 0.35, 0.5 + 0.3 * rng.random(), 0.6)), 0.12, SP.CORE if i % 2 else SP.VEIN, sides=5)

    # ---------------- intercostal sinew + rib studs ----------------
    ys = (15.45, 14.75, 14.0, 13.25, 12.55)
    for s in (-1, 1):
        for i in range(4):
            wa, wb = 2.45 - 0.12 * i, 2.45 - 0.12 * (i + 1)
            for fx in (0.78, 1.0):
                pa = (s * wa * fx, ys[i] - (0.25 if fx < 1 else 0.55), 2.05 if fx < 1 else 0.6)
                pb = (s * wb * fx, ys[i + 1] - (0.25 if fx < 1 else 0.55), 2.05 if fx < 1 else 0.6)
                tb(C, [pa, (np_.array(pa) + pb) / 2 + (s * 0.04, 0, 0.03), pb], 0.05, SP.DARK, sides=6, per=3)
        for i in range(5):
            w = 2.45 - 0.12 * i
            for fx, z in ((0.78, 2.05), (1.0, 0.6)):
                ball(C, (s * w * fx, ys[i] - (0.25 if fx < 1 else 0.55) + 0.17, z + (0.12 if fx < 1 else 0)), 0.07, SP.HORN2)

    # ---------------- spine: discs, side processes ----------------
    for k in range(10):
        y = 16.6 - 0.6 * k; z = -1.15 + 0.08 * k
        V, F, UV = K.blob((0, y - 0.3, z + 0.08), (0.55, 0.13, 0.52), None, amp=0.0, lat=6, lon=12); K.emit(C, V, F, UV, SP.RIDGE)
        for s in (-1, 1):
            tb(C, [(s * 0.25, y - 0.05, z + 0.1), (s * 0.7, y - 0.1, z + 0.05), (s * 1.15, y - 0.25, z + 0.2)], 0.09, SP.HORN, sides=6, per=3, tip=True)
            ball(C, (s * 0.46, y - 0.3, z + 0.35), 0.07, SP.HORN2)
        ball(C, (0, y + 0.08, z - 0.28), 0.1, SP.VEIN if k % 3 == 0 else SP.HORN2)

    # ---------------- shoulder plates, trim, studs, clavicle spikes ----------------
    for s in (-1, 1):
        bc = np_.array((s * 3.4, 16.0, 1.35))
        for k in range(3):
            c = bc + (s * (0.15 + 0.3 * k), 0.78 - 0.08 * k + 0.05 * k, -0.12 * k)
            rad = (1.25 - 0.17 * k, 0.17, 1.12 - 0.12 * k); R = tilt(0.1, 0, -s * (0.25 + 0.25 * k))
            V, F, UV = K.blob(c, rad, R, amp=0.0, lat=8, lon=16); K.emit(C, V, F, UV, SP.HORN if k != 1 else SP.BODY2)
            ang = np_.linspace(0.3, 2 * math.pi - 0.3, 14); ring = []
            for a in ang: ring.append(c + R @ np_.array((rad[0] * 1.02 * math.cos(a), 0.05, rad[2] * 1.02 * math.sin(a))))
            tb(C, ring, 0.07, SP.RIDGE, sides=6, per=2)
            for a in ang[::2]: ball(C, c + R @ np_.array((rad[0] * 0.82 * math.cos(a), rad[1] + 0.03, rad[2] * 0.82 * math.sin(a))), 0.065, SP.HORN2)
        for j in range(2):
            b = (s * (1.3 + 0.8 * j), 16.35, 1.6 + 0.1 * j)
            spike(C, b, (s * (1.45 + 0.8 * j), 17.4 + 0.2 * j, 2.4 + 0.2 * j), 0.15 - 0.03 * j, SP.HORN)
        ball(C, (s * 2.0, 16.55, 1.6), 0.1, SP.HORN2)

    # ---------------- abdominal plates + grooves ----------------
    for row, y in enumerate((12.85, 12.25, 11.65, 11.05)):
        for s in (-1, 1):
            x = s * (0.46 + 0.05 * row); z = front(x, y)
            V, F, UV = K.blob((x, y, z - 0.04), (0.42 - 0.02 * row, 0.24, 0.17), tilt(0.1 * (row - 1.5) * 0.5, 0, 0), amp=0.0, lat=6, lon=12)
            K.emit(C, V, F, UV, SP.HORN if row % 2 else SP.RIDGE)
        tb(C, [(-1.0, y - 0.3, front(-1.0, y - 0.3) + 0.04), (0, y - 0.3, front(0, y - 0.3) + 0.06), (1.0, y - 0.3, front(1.0, y - 0.3) + 0.04)], 0.05, SP.DARK, sides=6, per=4)
    tb(C, [(0, 12.0, front(0, 12.0) + 0.1), (0, 11.0, front(0, 11.0) + 0.08)], 0.04, SP.VEIN, sides=5, per=4)

    # ---------------- glowing cracks, branching, chest + back ----------------
    def crack(d, depth, r):
        pts = [rib_pt(d, 1.045)]
        for _ in range(5):
            d = np_.asarray(d, float) + rng.normal(size=3) * 0.16 + np_.array((0, -0.03, 0)); d = d / np_.linalg.norm(d); pts.append(rib_pt(d, 1.045))
            if depth and rng.random() < 0.5: crack(d + rng.normal(size=3) * 0.25, depth - 1, r * 0.7)
        tb(C, pts, r, SP.VEIN, sides=5, per=3, tip=True)
    for d0 in ((0.5, 0.45, 1), (-0.5, 0.4, 1), (0.8, -0.1, 0.8), (-0.8, -0.2, 0.8), (0.2, -0.6, 1), (0.6, 0.3, -1), (-0.6, 0.2, -1), (0, -0.3, -1), (1, 0.1, -0.2), (-1, 0.1, -0.2)):
        crack(d0, 1, 0.05)

    # ---------------- pelvic girdle ----------------
    pc, pr = np_.array((0.0, 10.4, 0.1)), np_.array((1.95, 1.2, 1.55))
    ang = np_.linspace(math.pi * 0.95, math.pi * 2.0 + math.pi * 1.05, 16)      # open at the front like the skirt
    for off, rad, col in ((0.35, 0.1, SP.RIDGE), (-0.2, 0.08, SP.HORN)):
        ring = [pc + (pr[0] * 1.07 * math.cos(a), off, pr[2] * 1.07 * math.sin(a)) for a in ang if math.sin(a) < 0.9]
        tb(H, ring, rad, col, sides=7, per=3)
    for a in ang[::1]:
        if math.sin(a) < 0.8: ball(H, pc + (pr[0] * 1.1 * math.cos(a), 0.35 + 0.17, pr[2] * 1.1 * math.sin(a)), 0.075, SP.HORN2)
    for s in (-1, 1):
        V, F, UV = K.blob((s * 1.55, 10.9, 0.0), (0.7, 0.22, 0.85), tilt(0, 0, -s * 0.35), amp=0.0, lat=8, lon=14); K.emit(H, V, F, UV, SP.HORN)
        spike(H, (s * 2.15, 10.7, 0.1), (s * 2.9, 11.4, -0.1), 0.17, SP.HORN)
        for j in range(3):                                                    # studs on the pelvis skin (y from its ellipsoid)
            x, z = s * (1.1 + 0.3 * j), 0.55
            y = pc[1] + pr[1] * math.sqrt(max(0.0, 1 - (x / pr[0]) ** 2 - ((z - pc[2]) / pr[2]) ** 2)) - 0.02
            ball(H, (x, y, z), 0.07, SP.HORN2)

    # ---------------- tattered skirt edge ----------------
    for k in range(24):
        a = (k + 0.5) / 24 * 2 * math.pi
        if math.sin(a) > 0.8: continue
        x0, z0 = 1.8 * math.cos(a), 1.45 * math.sin(a); L = rng.uniform(1.2, 2.4); sw = rng.normal(size=2) * 0.25
        tb(H, [(x0, 10.05, z0), (x0 * 1.1 + sw[0], 10.05 - L * 0.5, z0 * 1.1 + sw[1]), (x0 * 1.2 + 2 * sw[0], 10.05 - L, z0 * 1.2 + 2 * sw[1])],
           0.2, SP.SMOKE2 if k % 2 else SP.SMOKE, sides=6, per=2, tip=True, flat=0.3, tr=0.25)

    # ---------------- tail: vertebra rings, barbed tip ----------------
    tail = [(0, 10.2, -1.2), (0, 9.0, -3.0), (0.6, 7.2, -4.6), (-0.4, 5.2, -5.8), (0.5, 3.4, -6.6), (0.0, 2.0, -7.3)]
    path = K.spline(tail, 60); T = np_.gradient(path, axis=0); T /= np_.linalg.norm(T, axis=1)[:, None]
    for m, f in enumerate(np_.linspace(0.06, 0.9, 11)):
        i = int(f * 59); p, t = path[i], T[i]; r = (0.75 - 0.5 * f) * (1 + 0.12 * math.sin(math.pi * f)) * 1.02
        a = np_.cross(t, (0, 0, 1) if abs(t[2]) < 0.9 else (1, 0, 0)); a /= np_.linalg.norm(a); b = np_.cross(t, a)
        ring = [p + (a * math.cos(q) + b * math.sin(q)) * r for q in np_.linspace(0, 2 * math.pi * 0.96, 14)]
        tb(H, ring, 0.07 - 0.003 * m, SP.RIDGE, sides=6, per=2)
        for q in (math.pi / 2, math.pi * 1.5): ball(H, p + (a * math.cos(q) + b * math.sin(q)) * (r + 0.04), 0.065 - 0.003 * m, SP.HORN2)
    for m, f in enumerate((0.5, 0.58, 0.66, 0.73, 0.8)):              # spikes stay on the tail body, not its tapering tip
        i = int(f * 59); p, t = path[i], T[i]; r = (0.75 - 0.5 * f) * 0.98
        a = np_.cross(t, (0, 0, 1) if abs(t[2]) < 0.9 else (1, 0, 0)); a /= np_.linalg.norm(a); b = np_.cross(t, a)
        for q in (0, math.pi * 2 / 3, math.pi * 4 / 3):
            dr = a * math.cos(q + m) + b * math.sin(q + m)
            spike(H, p + dr * r * 0.9, p + dr * (r + 0.55 - 0.05 * m) + t * 0.45, 0.1 - 0.01 * m, SP.HORN if m % 2 else SP.CLAW, sides=6)
    p = path[-1]
    for j, (dx, dz) in enumerate(((0.45, 0.2), (-0.45, 0.2), (0, -0.4))): spike(H, p, p + (dx, 0.5, -0.6 + dz), 0.1, SP.WISP, sides=5)
