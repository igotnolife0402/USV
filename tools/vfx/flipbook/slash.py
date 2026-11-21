"""Sword swing from physics: what a camera sees of a glowing blade sweeping an arc, plus the sparks and fire it throws.

`slash`: the trail is the time-integrated emission of the swept blade (a long-exposure streak) with afterglow: a pixel the
blade crossed at time tau glows ~ e^-(t - tau)/decay, so the arc is brightest and thickest at the blade and thins and cools
toward its tail. The blade follows an eased swing (smoothstep in angle: accelerate, then brake), the crescent's outer edge is
crisp (the blade's edge), its inner side soft; a white-hot core (15000 K) rides the fresh edge and the body glows with an
element's emission lines (`element=Li` crimson). Speed streaks are fbm along the radius, smeared along the motion.
`embers`: ballistic sparks shed from the blade tip: launched along the swing tangent, quadratic-ish air drag, gravity,
Newtonian cooling, colour = blackbody(T), brightness ~ (T/T0)^4 (Stefan-Boltzmann), motion-blurred over each frame.
`flame-arc`: fire left in the blade's wake: fbm fuel along the swept band rising with buoyancy, temperature decaying with age;
colour = blackbody(k0 + k1 T), emission ~ density (K/k_ref)^4 (Kirchhoff + Stefan-Boltzmann), cool soot left behind.
All three share the swing (start/end angle, radius, sweep frames, delay), so they line up when stacked (`a+b+c+d`, README).
"""
import math
import numpy as np
import img
from kamehameha import element_rgb, CORE, F

S = 128


def _swing(start, end, sweep, delay, prog=''):
    """Blade angle (deg) at frame t, and the frame tau at which the blade crossed progress p (0..1) along the arc.
    `prog`: the real swing's progress at even times, '_'-joined (e.g. traced from an animation); default an eased swing."""
    span = (start - end) % 360 or 360
    u = np.linspace(0, 1, 2049); s = u * u * (3 - 2 * u)                     # eased swing: accelerate, then brake
    if prog:
        q = np.maximum.accumulate(np.clip([float(v) for v in str(prog).split('_')], 0, 1)); s = np.interp(u, np.linspace(0, 1, len(q)), q)
        s = s + u * 1e-6                                                         # strictly rising, so tau can invert it
    ang = lambda t: start - span * float(np.interp((t - delay) / sweep, u, s))
    tau = lambda p: delay + sweep * np.interp(p, s, u)
    return span, ang, tau


def _polar(cx, cy):
    y, x = np.mgrid[0:S, 0:S].astype(np.float32) + 0.5
    dx, dy = x - cx * S, cy * S - y                                            # y up
    return np.sqrt(dx * dx + dy * dy) / S, np.degrees(np.arctan2(dy, dx))


def _glow(lin, exposure, glare=1.0):
    lin = lin + glare * (img.blur(lin, 2) * 0.45 + img.blur(lin, 10) * 0.25)     # lens PSF: tight + wide glare
    disp = 1 - np.exp(-lin * exposure)
    A = np.clip(disp.max(-1) * 1.05, 0, 1)
    return disp * A[..., None], A


def _entry(life):
    return dict(FlipbookLayout='Grid8x8', FlipbookMode='OneShot', Lifetime=life, LightEmission=1, LightInfluence=0,
                SizeStuds=[10, 10], Orientation='FacingCamera')


def slash(seed, prog='', element='Li', start=150, end=-35, radius=0.34, width=0.11, sweep=26, delay=2, decay=12, core=1.0,
          gain=1.0, exposure=1.6, cx=0.5, cy=0.6, life=0.6):
    span, ang, tau = _swing(start, end, sweep, delay, prog)
    rr, phi = _polar(cx, cy)
    p = ((start - phi) % 360) / span
    on = p <= 1.0
    p = np.clip(p, 0, 1)
    tp = tau(p)
    rgb = element_rgb(element)
    taper = 0.25 + 0.75 * np.sin(np.pi * np.clip(p, 0.02, 0.98)) ** 0.6         # crescent: thick mid-arc, pointed ends
    streak = img.fbm(rr * S / 3.0, p * 2.5, 0.0, seed, 3)                       # speed lines: vary across, smeared along
    frames = []
    for t in range(F):
        lin = 0
        for dt in (-0.33, 0.0, 0.33):                                           # motion blur: three sub-frames, so a fast sweep has no popping steps
            tt = t + dt; age = tt - tp
            g = np.exp(-np.maximum(age, 0) / decay) * img.smooth(-1.5, 0.5, age) * on
            g = g * img.smooth(F - 1, F - 14, tt)                               # fully gone by the last frame
            R = radius + 0.025 * np.maximum(age, 0) / decay                     # the air it lit drifts outward
            W = width * taper * (0.35 + 0.65 * np.sqrt(g + 1e-6))
            x = (rr - R) / np.maximum(W, 1e-4)
            band = img.smooth(-1.3, 0.55, x) ** 1.5 * img.smooth(1.0, 0.72, x)   # soft inside, crisp outer edge
            I = band * g * (0.7 + 0.6 * streak)
            hot = np.exp(-((x - 0.7) / 0.16) ** 2) * np.exp(-np.maximum(age, 0) / 3.0) * g * core
            lin = lin + (I[..., None] * rgb * 2.2 * gain + hot[..., None] * CORE * 3.0) / 3
        frames.append(img.finish(*_glow(lin, exposure)))
    return frames, _entry(life), dict(element_rgb=[round(float(c), 3) for c in rgb], sweep_frames=sweep)


def embers(seed, prog='', n=80, start=150, end=-35, radius=0.34, sweep=26, delay=2, speed=4.5, drag=0.9, gravity=0.14,
           kelvin=2600, cool=16, gain=1.0, exposure=1.4, cx=0.5, cy=0.6, life=0.6):
    n = int(n); rng = np.random.default_rng(seed)
    span, ang, tau = _swing(start, end, sweep, delay, prog)
    t0 = tau(rng.uniform(0.05, 0.95, n))                                        # shed along the swing
    a0 = np.radians(np.array([ang(t) for t in t0]))
    r0 = radius * S * rng.uniform(0.82, 1.06, n)
    pos = np.stack([cx * S + r0 * np.cos(a0), cy * S - r0 * np.sin(a0)], 1)       # screen px (y down)
    tang = np.stack([np.sin(a0), np.cos(a0)], 1)                                # clockwise tangent, screen coords
    radl = np.stack([np.cos(a0), -np.sin(a0)], 1)
    vel = speed * (tang * rng.uniform(0.4, 1.3, (n, 1)) + radl * rng.uniform(0.2, 1.0, (n, 1)) + rng.normal(0, 0.25, (n, 2)))
    T0 = kelvin * rng.uniform(0.8, 1.15, n)
    frames = []; sub = 6
    P, V = pos.copy(), vel.copy()
    for t in range(F):
        acc = np.zeros((S, S, 3), np.float32)
        for k in range(sub):                                                    # motion blur: sub-steps inside the frame
            tt = t + k / sub
            live = tt >= t0
            sp = np.linalg.norm(V, axis=1, keepdims=True)
            dV = -(1 - drag) * V * (0.6 + 0.4 * sp / speed) + np.array([0, gravity])  # air drag ~ v..v^2, gravity
            V = np.where(live[:, None], V + dV / sub, V); P = np.where(live[:, None], P + V / sub, P)
            age = np.maximum(tt - t0, 0)
            T = T0 * np.exp(-age / cool)                                        # Newtonian cooling
            b = (T / kelvin) ** 4 * live * img.smooth(F - 1, F - 10, tt)
            col = img.blackbody(T) * b[:, None] / sub
            ix, iy = P[:, 0] - 0.5, P[:, 1] - 0.5
            x0, y0 = np.floor(ix).astype(int), np.floor(iy).astype(int); fx, fy = ix - x0, iy - y0
            for ox, oy, w in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
                xx, yy = x0 + ox, y0 + oy; m = (xx >= 0) & (xx < S) & (yy >= 0) & (yy < S) & (b > 1e-4)
                np.add.at(acc, (yy[m], xx[m]), col[m] * w[m, None])
        lin = img.blur(acc, 2) * 4.0 * gain                                     # 3 px sparks (owner: no hair-thin strokes)
        frames.append(img.finish(*_glow(lin, exposure, 1.3)))
    return frames, _entry(life), dict(sparks=n)


def flame_arc(seed, prog='', start=150, end=-35, radius=0.34, width=0.07, sweep=26, delay=2, rise=0.004, cool=9, k0=900, k1=1500,
              k_ref=1900, flame=1.0, smoke=(0.12, 0.03, 0.03), soot=0.35, density=1.0, exposure=1.3, cx=0.5, cy=0.6, life=0.6):
    span, ang, tau = _swing(start, end, sweep, delay, prog)
    rr, phi = _polar(cx, cy)
    p = ((start - phi) % 360) / span; on = (p <= 1) * img.smooth(1.0, 0.9, p) * img.smooth(0.0, 0.06, p)
    tp = tau(np.clip(p, 0, 1)); smoke = np.array(smoke, np.float32)
    arc = p * span * math.pi / 180 * radius * S / 7.0                           # lattice along the arc, ~7 px cells
    frames = []
    for t in range(F):
        age = np.maximum(t - tp, 0)
        lit = img.smooth(-1.0, 0.5, t - tp) * on * img.smooth(F - 1, F - 18, t)
        src = rr - radius - rise * age                                         # buoyant tongues lick outward from the blade path
        fuel = img.fbm((src * S - 1.2 * age) / 6.0, arc, t * 0.1, seed, 4)      # fbm carried out with the gas
        W = width * (0.7 + 0.07 * age)
        band = np.exp(-((src + 0.01) / W) ** 2)
        rho = np.clip(band * (fuel * 1.7 - 0.45), 0, None) * lit * density
        T = np.exp(-age / cool)
        K = k0 + k1 * T
        em = rho[..., None] * img.blackbody(K) * ((K / k_ref) ** 4)[..., None] * flame * 2.0
        disp = 1 - np.exp(-(em + img.blur(em, 3) * 0.4) * exposure)
        a_em = np.clip(disp.max(-1) * 1.05, 0, 1)
        a_sm = 1 - np.exp(-rho * soot * (1 - T) ** 2)                             # cooled gas is thin soot
        A = a_em + a_sm * (1 - a_em)
        C = disp * a_em[..., None] + smoke * (a_sm * (1 - a_em))[..., None]
        frames.append(img.finish(C, A))
    return frames, _entry(life), {}


# ---------------------------------------------------------------------------------------------------------------------------
# dragon: a fire dragon that rides the swing. Snake kinematics: every body joint follows the HEAD's own path, k * lag frames
# later (so the body is exactly the trail the head drew), with a travelling lateral wave. Built from signed distance fields:
# tapered-capsule body, skull with open jaws, swept horns, dorsal spikes, a flapping four-finger wing with membrane.
# Shaded as a fire spirit (the studio adds flipbooks): crimson body, lava cracks (ridged noise, hot at the head), a hot
# edge glow, a white-hot eye, a fire jet from the mouth; colour = blackbody(T) with T cooling along the body (Newtonian).
# After the blade stops the dragon keeps flying off along the tangent and dissolves (overshoot).
SS = 2


def _cap(px, py, a, b, ra, rb):
    """Signed distance and projection t to a tapered capsule from a to b (radius ra -> rb)."""
    ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / max(dx * dx + dy * dy, 1e-6), 0, 1)
    return np.hypot(px - (ax + t * dx), py - (ay + t * dy)) - (ra + (rb - ra) * t), t


def _tri(px, py, A, B, C):
    s1 = (px - B[0]) * (A[1] - B[1]) - (A[0] - B[0]) * (py - B[1])
    s2 = (px - C[0]) * (B[1] - C[1]) - (B[0] - C[0]) * (py - C[1])
    s3 = (px - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (py - A[1])
    neg = (s1 < 0) | (s2 < 0) | (s3 < 0); pos = (s1 > 0) | (s2 > 0) | (s3 > 0)
    return ~(neg & pos)


def dragon(seed, prog='', start=150, end=-35, radius=0.34, sweep=26, delay=2, cx=0.5, cy=0.6, n=24, lag=0.5, amp=2.6,
           scale=1.0, flap=1.0, overshoot=30, gain=1.0, exposure=1.3, life=0.7, sparks=260, ash=70, rise=0.32, linger=1.0):
    """After the blade stops the body erodes (noise front, hot edge) and sheds `sparks` embers plus `ash` flakes that drift up on
    buoyancy and curl-like wobble, cool (Newtonian, brightness ~ T^4) and linger to the last frame (`linger` scales their life)."""
    n = int(n); G = S * SS; u = scale * SS
    span, ang, tau = _swing(start, end, sweep, delay, prog); tend = delay + sweep
    ys = np.arange(G, dtype=np.float32)[:, None] + 0.5; xs = np.arange(G, dtype=np.float32)[None, :] + 0.5
    y, x = np.mgrid[0:G, 0:G].astype(np.float32) + 0.5
    rng = np.random.default_rng(seed + 31)

    def joint(t, k):
        """Position (G px), forward and outward unit vectors and body radius of joint k at frame t (snake: the head's path, k*lag later)."""
        tt = t - k * lag; over = 1 - math.exp(-max(tt - tend, 0) / 4.0)
        th = math.radians(ang(tt) - overshoot * over); Rr = radius * G * (1 + 0.2 * over)
        tx, ty = math.sin(th), math.cos(th); nx, ny = math.cos(th), -math.sin(th)       # clockwise tangent, outward normal (image y down)
        wave = amp * u * (0.3 + 0.7 * min(k / 6.0, 1.0)) * math.sin(0.62 * k - 0.85 * t)
        r = u * (1.0 + 3.3 * (1 - k / n) ** 0.8 * (0.82 + 0.18 * min(k, 3) / 3))
        return (cx * G + Rr * math.cos(th) + nx * wave, cy * G - Rr * math.sin(th) + ny * wave), (tx, ty), (nx, ny), (r if tt >= delay - 0.5 else 0.0)

    # particles: born from random body points while the dragon erodes, then free
    M = int(sparks) + int(ash); tb = rng.uniform(tend - 2, tend + 24, M); kk = rng.integers(0, n, M)
    isash = np.arange(M) >= int(sparks)
    px = np.zeros(M, np.float32); py = np.zeros(M, np.float32); vx = np.zeros(M, np.float32); vy = np.zeros(M, np.float32)
    T0 = np.where(isash, 1100, rng.uniform(1700, 2600, M)) * rng.uniform(0.85, 1.1, M); ph = rng.uniform(0, 6.28, M)
    tau_c = np.where(isash, 30.0, rng.uniform(10, 22, M)) * linger; born = np.zeros(M, bool)
    sub = 4
    frames = []
    for t in range(F):
        dp = img.smooth(tend + 1, tend + 22, t)
        lin = np.zeros((G, G, 3), np.float32)
        if t >= delay - 0.5 and dp < 1:
            P, T, N, R = [], [], [], []
            for k in range(n + 1):
                p_, t_, n_, r_ = joint(t, k); P.append(p_); T.append(t_); N.append(n_); R.append(r_)
            best = np.full((G, G), 1e3, np.float32); bk = np.zeros((G, G), np.float32)
            for k in range(n):
                if R[k] <= 0: continue
                d, tp = _cap(xs, ys, P[k], P[k + 1], R[k], R[k + 1])
                m = d < best; best = np.where(m, d, best); bk = np.where(m, k + tp, bk)
            sdf = best
            H, TH, NH = P[0], np.array(T[0]), np.array(N[0])
            a = (xs - H[0]) * TH[0] + (ys - H[1]) * TH[1]; b = (xs - H[0]) * NH[0] + (ys - H[1]) * NH[1]
            at = lambda aa, bb: (H[0] + TH[0] * aa * u + NH[0] * bb * u, H[1] + TH[1] * aa * u + NH[1] * bb * u)
            gape = math.radians(26 + 10 * math.sin(0.5 * t))
            parts = [_cap(xs, ys, at(-4, 0), at(4, 0), 4.6 * u, 3.0 * u)[0],                                    # skull
                     _cap(xs, ys, at(3, 0.4), at(11, 0.2), 2.7 * u, 1.7 * u)[0],                                # upper jaw / snout
                     _cap(xs, ys, at(2, -1.4), at(2 + 8.5 * math.cos(gape), -1.4 - 8.5 * math.sin(gape)), 1.9 * u, 1.1 * u)[0],   # lower jaw, open
                     _cap(xs, ys, at(-2, 3.2), at(-9, 7.5), 1.7 * u, 1.1 * u)[0], _cap(xs, ys, at(-9, 7.5), at(-15, 6.0), 1.1 * u, 0.5 * u)[0],   # horn
                     _cap(xs, ys, at(-1, -3.2), at(-8, -5.0), 1.4 * u, 0.8 * u)[0]]                             # lower horn / chin spike
            for p in parts: sdf = np.minimum(sdf, p)
            for k in range(3, n - 4, 3):                                                                         # dorsal spikes
                if R[k] <= 0: continue
                sp = (P[k][0] + N[k][0] * (R[k] + 3.6 * u), P[k][1] + N[k][1] * (R[k] + 3.6 * u))
                sdf = np.minimum(sdf, _cap(xs, ys, (P[k][0] + N[k][0] * R[k] * 0.4, P[k][1] + N[k][1] * R[k] * 0.4), sp, 1.5 * u, 0.4 * u)[0])
            kw = 7; Sw = np.array(P[kw]); Tw, Nw = np.array(T[kw]), np.array(N[kw])      # wing: four finger bones, swept back, flapping, membrane
            mem = np.zeros((G, G), bool); bones = np.full((G, G), 1e3, np.float32)
            if R[kw] > 0:
                beat = flap * 24 * math.sin(2 * math.pi * t / 22.0 + 0.6)
                tips = []
                for al, ln in ((14, 18), (42, 21), (70, 19), (98, 12)):
                    aa = math.radians(al + beat * (0.6 + al / 130)); dv = Nw * math.cos(aa) - Tw * math.sin(aa)
                    tips.append(Sw + dv * ln * u * (0.9 + 0.1 * math.cos(math.radians(beat * 2))))
                for i in range(3): mem |= _tri(xs, ys, Sw, tips[i], tips[i + 1])
                for tp_ in tips: bones = np.minimum(bones, _cap(xs, ys, Sw, tp_, 1.9 * u, 0.9 * u)[0])
            inside = img.smooth(0.7 * u, -0.7 * u, sdf)
            heat = np.exp(-bk / (0.5 * n)) * (1 - 0.5 * dp)
            crack = np.clip(1 - np.abs(2 * img.fbm(bk * 0.9, b / u * 0.5 + seed, 0.0, seed, 3) - 1) * 3.2, 0, 1) ** 2
            edge = np.exp(-(sdf / (1.0 * u)) ** 2)
            kel = 900 + 1500 * heat
            lin = inside[..., None] * (np.array([0.55, 0.035, 0.05], np.float32) * (0.35 + 0.5 * heat)[..., None]) \
                + (inside * crack)[..., None] * img.blackbody(kel) * (0.8 + 1.4 * heat)[..., None] \
                + edge[..., None] * img.blackbody(1300 + 1500 * heat)[..., :] * (0.6 + 0.9 * heat)[..., None]
            wm = (mem & (sdf > 0)) * 1.0; bn = img.smooth(0.8 * u, -0.8 * u, bones)
            lin = lin + wm[..., None] * np.array([0.9, 0.09, 0.05], np.float32) * (0.55 + 0.45 * heat.max())[..., None] * 0.85 + bn[..., None] * img.blackbody(np.full((G, G), 1500.0)) * 0.9
            ex, ey = at(2.5, 2.2); lin = lin + np.exp(-((xs - ex) ** 2 + (ys - ey) ** 2) / (1.1 * u) ** 2)[..., None] * np.array([3.0, 2.6, 2.2], np.float32) * (1 - dp)   # eye
            mx0 = 9.0; jet = np.clip((a / u - mx0) / 3.0, 0, 1)                                                 # fire from the mouth
            w = (1.3 + 0.28 * np.maximum(a / u - mx0, 0)) * u
            flame = np.exp(-(b / w) ** 2) * np.exp(-np.maximum(a / u - mx0, 0) / 13.0) * jet * img.fbm(a / (3 * u) - t * 0.6, b / (3 * u), t * 0.1, seed + 5, 3)
            lin = lin + flame[..., None] * img.blackbody(1500 + 1800 * np.exp(-np.maximum(a / u - mx0, 0) / 10.0)) * 3.4 * (1 - dp)
            if dp > 0:                                                    # erosion: a noise front eats the body, its edge burns hot
                nz = img.fbm(x / (7.0 * SS) + 0.0 * t, y / (7.0 * SS) - 0.045 * t, 0.0, seed + 9, 3)
                thr = dp * 1.12 - 0.06; keep = img.smooth(thr, thr + 0.05, nz)
                front = np.exp(-((nz - thr - 0.04) / 0.045) ** 2) * np.maximum(inside, wm * 0.7)
                lin = lin * keep[..., None] + front[..., None] * img.blackbody(np.full((G, G), 1900.0)) * 1.8
            lin = lin * gain * img.smooth(delay - 0.5, delay + 6.0, t)           # the dragon fades in as it forms, never pops in whole
        lin = lin.reshape(S, SS, S, SS, 3).mean((1, 3))                                                       # supersample down
        # shed particles: born on the body, buoyant, wobbling, cooling; they outlive the dragon
        acc = np.zeros((S, S, 3), np.float32); sm = np.zeros((S, S), np.float32)
        nb = (~born) & (t >= tb)
        for i in np.nonzero(nb)[0]:
            (jx, jy), tg, nm, r_ = joint(tb[i], int(kk[i])); o = rng.normal(0, max(r_, u) * 0.7)
            px[i] = (jx + nm[0] * o) / SS; py[i] = (jy + nm[1] * o) / SS
            sp0 = rng.uniform(0.5, 2.2); vx[i] = tg[0] * sp0 * 0.5 + nm[0] * rng.normal(0, 0.6); vy[i] = tg[1] * sp0 * 0.5 + nm[1] * rng.normal(0, 0.6)
        born |= nb
        live = born.copy()
        for q in range(sub):
            ft = t + q / sub; age = np.maximum(ft - tb, 0)
            vx *= 1 - 0.035 / sub; vy *= 1 - 0.035 / sub                                                      # air drag
            vy -= (rise * np.where(isash, 0.5, 1.0)) / sub                                                     # buoyancy: hot gas climbs (image y up = -y)
            vx += (0.07 * np.sin(0.21 * py + 0.31 * ft + ph) + 0.03 * np.sin(0.8 * ft + ph)) / sub              # curl-like wobble
            vy += (0.05 * np.cos(0.17 * px + 0.27 * ft + 2 * ph)) / sub
            px = np.where(live, px + vx / sub, px); py = np.where(live, py + vy / sub, py)
            Tn = T0 * np.exp(-age / tau_c); bright = np.where(isash, 0.35, (Tn / 2600) ** 4 * 3.0) * live * img.smooth(F - 1, F - 9, ft)
            col = img.blackbody(Tn) * bright[:, None] / sub
            ix, iy = px - 0.5, py - 0.5; x0, y0 = np.floor(ix).astype(int), np.floor(iy).astype(int); fx, fy = ix - x0, iy - y0
            for ox, oy, wgt in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
                xx, yy = x0 + ox, y0 + oy; m = (xx >= 0) & (xx < S) & (yy >= 0) & (yy < S) & (bright > 1e-3)
                np.add.at(acc, (yy[m], xx[m]), col[m] * wgt[m, None])
                a_ = (0.5 * isash * live * img.smooth(F - 1, F - 12, ft) * np.exp(-age / (60.0 * linger)) / sub)[m] * wgt[m]
                np.add.at(sm, (yy[m], xx[m]), a_)
        lin = lin + img.blur(acc, 1) * 8.0 * gain
        C, A = _glow(lin, exposure, 0.9)
        smoke = img.blur(sm[..., None], 1)[..., 0] * 1.6                                                    # ash flakes: dim red, see-through
        A2 = np.clip(A + smoke * (1 - A), 0, 1); C = C + (A2 - A)[..., None] * np.array([0.30, 0.06, 0.05], np.float32)
        frames.append(img.finish(C, A2))
    return frames, _entry(life), dict(dragon_joints=n, wing_fingers=4, dragon_sparks=int(sparks), ash=int(ash))
