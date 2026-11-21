#!/usr/bin/env python3
"""Ray-traced black hole (preset `black-hole` of vfx.py): Grid8x8, 64 looping frames at 24 fps (smooth).
Physics (units G = c = M = 1): Schwarzschild null geodesics (a = -3 M h^2 x / r^5, exact for light), a thin Novikov-Thorne
accretion disk from the ISCO (r = 6) outwards, Keplerian rotation, Doppler + gravitational shift g = sqrt(1 - 3/r) / (1 - Omega*lambda),
Doppler beaming g^3 * flux. The lensed far side of the disk and the shadow (radius 3*sqrt(3) = 5.196) come out of the ray trace.
Look (owner): purple-black palette, glossy filaments, soot lanes and a dark halo that swallow light, spiral arms that visibly
fall inward, a breathing photon ring."""
import math
import numpy as np
import img
from img import fbm, smooth as ss

S, SS, G = 128, 2, 8               # frame px, supersampling, grid (8x8 = 64 frames: smooth motion beats resolution)
INC = math.radians(73)             # observer 17 degrees above the disk plane: the far side arcs over the shadow, near side reads as a band
HALF = 14.5                        # frame half-width in M (tight: every feature gets more pixels)
R_IN, R_OUT = 6.0, 14.0            # ISCO to outer edge
D0 = 100.0                         # ray start distance
ENTRY = {'id': 'special/black-hole', 'element': 'special', 'shape': 'black-hole', 'style': 'base', 'file': 'special/black-hole.png',
         'size': 'L', 'sheetPx': S * G, 'framePx': S, 'frames': G * G, 'FlipbookLayout': 'Grid8x8', 'FlipbookMode': 'Loop',
         'FlipbookFramerate': 24.0, 'Lifetime': 2.667, 'LightEmission': 0.0, 'SizeStuds': [10, 25], 'Orientation': 'FacingCamera',
         'tileableX': False, 'LightInfluence': 0, 'note': 'ray-traced Schwarzschild black hole: lensed accretion disk, photon ring, shadow; LightEmission 0, set LightInfluence 0'}


def trace(n):
    """Trace n x n parallel rays from a distant observer. Returns per-ray disk crossings (front to back) and capture mask."""
    lin = (np.arange(n) + 0.5) / n * 2 - 1
    a, b = np.meshgrid(lin * HALF, -lin * HALF)          # image-plane impact coordinates (b up)
    a, b = a.ravel(), b.ravel()
    N = a.size
    cam = np.array([0.0, math.cos(INC), math.sin(INC)])  # disk normal is +y
    right, up = np.array([1.0, 0, 0]), np.array([0.0, math.sin(INC), -math.cos(INC)])
    x = cam * D0 + a[:, None] * right + b[:, None] * up
    v = np.broadcast_to(-cam, (N, 3)).copy()
    lam = -np.cross(x, v)[:, 1]                           # photon angular momentum about the disk axis (physical direction is -v)
    h2 = (np.cross(x, v) ** 2).sum(1)
    K = 3
    cr_r = np.zeros((K, N), np.float32); cr_psi = np.zeros((K, N), np.float32); nc = np.zeros(N, np.int8)
    captured = np.zeros(N, bool)
    act = np.arange(N)
    for _ in range(4000):
        if not act.size:
            break
        xa, va, hh = x[act], v[act], h2[act]
        r = np.sqrt((xa * xa).sum(1))
        dt = np.clip(0.04 * r * np.clip(r - 1.9, 0.05, 1.0), 0.004, 4.0)[:, None]   # fine near the horizon / photon sphere
        acc = -3.0 * hh[:, None] * xa / r[:, None] ** 5
        vh = va + 0.5 * dt * acc                                                      # velocity Verlet
        xn = xa + dt * vh
        rn = np.sqrt((xn * xn).sum(1))
        vn = vh + 0.5 * dt * (-3.0 * hh[:, None] * xn / rn[:, None] ** 5)
        y0, y1 = xa[:, 1], xn[:, 1]
        hit = (y0 * y1 < 0)
        if hit.any():
            f = (y0 / (y0 - y1))[:, None]
            xc = xa + f * (xn - xa)
            rc = np.sqrt(xc[:, 0] ** 2 + xc[:, 2] ** 2)
            ok = hit & (rc > 2.1) & (rc < R_OUT * 1.15) & (nc[act] < K)
            ids = act[ok]
            k = nc[ids]
            cr_r[k, ids] = rc[ok]; cr_psi[k, ids] = np.arctan2(xc[ok, 0], xc[ok, 2]); nc[ids] += 1
        x[act], v[act] = xn, vn
        cap = rn < 2.02
        esc = (rn > D0 * 1.05) & ((xn * vn).sum(1) > 0)
        captured[act[cap]] = True
        act = act[~(cap | esc)]
    return cr_r, cr_psi, nc, captured, lam


# purple palette: deep space violet -> electric purple -> magenta-pink -> white-hot (intensity 0..1)
PAL = np.array([[0.0, 0.0, 0.0], [0.10, 0.02, 0.22], [0.36, 0.08, 0.72], [0.72, 0.28, 1.0], [1.0, 0.62, 1.0], [1.0, 0.95, 1.0]], np.float32)
PAL_AT = np.array([0.0, 0.12, 0.35, 0.6, 0.82, 1.0], np.float32)
# seamless rotation: each layer is an m-fold pattern that turns 1/m of a revolution per loop, so the loop closes exactly;
# inner layers use fewer folds -> they spin faster, like the real disk (differential rotation without a crossfade)
LAYERS = ((2, 4.0, 5.0, 9.0), (3, 6.0, 7.0, 11.5), (5, 9.0, 10.0, 99.0))   # (folds, cells per fold, blend in r, blend out r)
WIND = -2.4                        # log-spiral winding (negative: arms drift inward as they turn = matter falling in)


def palette(x):
    x = np.clip(x, 0, 1)
    return np.stack([np.interp(x, PAL_AT, PAL[:, c]) for c in range(3)], -1).astype(np.float32)


def frames(geo):
    cr_r, cr_psi, nc, captured, lam = geo
    n = S * SS
    K, N = cr_r.shape
    valid = np.arange(K)[:, None] < nc[None]
    ki, ni = np.nonzero(valid)                                               # only rays that actually cross the disk
    r, psi = cr_r[ki, ni], cr_psi[ki, ni]
    rk = np.maximum(r, R_IN)
    om = rk ** -1.5
    g = np.sqrt(np.clip(1 - 3 / rk, 1e-4, 1)) / np.maximum(1 - om * lam[ni], 0.05)
    nt = lambda q: q ** -3 * np.clip(1 - np.sqrt(np.clip(R_IN / q, 0, 1)), 0, 1)
    flux = nt(rk) / nt(np.linspace(R_IN, 40, 4000)).max()
    plunge = r < R_IN
    flux = np.where(plunge, 0.25 * ss(2.2, R_IN, r) ** 1.5, flux)            # infalling streams glow down to the horizon
    beam = (g ** 3 * flux).astype(np.float32)                                # Doppler beaming keeps one side blazing
    fade = (ss(2.2, 2.8, r) * (1 - ss(R_OUT * 0.6, R_OUT * 0.95, r))).astype(np.float32)   # gone before the frame edge
    wl = []
    for m, cells, r0, r1 in LAYERS:
        w_in = ss(r0 - 2.5, r0, r) if r0 > 5.5 and m != LAYERS[0][0] else np.ones_like(r)
        wl.append(w_in * (1 - ss(r1, r1 + 2.5, r)))
    wsum = np.maximum(sum(wl), 1e-6); wl = [w / wsum for w in wl]
    lin = (np.arange(n) + 0.5) / n * 2 - 1
    bx, by = np.meshgrid(lin * HALF, -lin * HALF)
    bimp = np.sqrt(bx ** 2 + by ** 2).ravel()                                # image-plane distance from the hole (M)
    b_c = 3 * math.sqrt(3)
    ring = np.exp(-((bimp - b_c * 1.03) / 0.6) ** 2).astype(np.float32)      # photon ring: light orbiting at r = 3M (drawn >= 3 px wide)
    aura = (0.92 * np.exp(-np.clip(bimp - b_c, 0, None) / 3.2) * (bimp > b_c * 0.98)).astype(np.float32)
    PT = 4
    out = []
    for f in range(G * G):
        u = f / (G * G)
        dens = 0; ridge = 0; lane = 0
        for (m, cells, _, _), w in zip(LAYERS, wl):
            a = (m * (psi + WIND * np.log(np.maximum(r, 1.5))) / (2 * math.pi) - u) * cells   # turns 1/m rev per loop
            pa = int(cells)                                                          # one period per fold: shifting by one period per loop closes it
            big = fbm(a, r * 0.9, u * PT, 11 + m, 3, pa, PT)
            fine = fbm(a * 2, r * 1.6, u * PT, 23 + m, 2, pa * 2, PT)
            dark = fbm(a * 2, r * 1.8, u * PT, 37 + m, 2, pa * 2, PT)
            dens = dens + w * (big - 0.5)
            ridge = ridge + w * (1 - np.abs(2 * fine - 1)) ** 3                     # broad glossy filaments: the "reflective" sheen
            lane = lane + w * ss(0.58, 0.78, dark)                                  # soot lanes that swallow the glow
        d = np.clip(0.75 + 1.3 * dens, 0.05, 1.8)
        I = beam * fade * d * (1 - 0.85 * lane) * 1.6 + beam * fade * ridge * 2.2
        tone = 1 - np.exp(-I)
        col = palette(tone)
        a_em = np.clip(fade * np.minimum(d, 1) * np.clip(tone * 1.6, 0, 1), 0, 1)
        a_dk = fade * lane * 0.85                                                   # dark lanes are opaque and black
        opac = np.where(plunge, 0.35, 0.9)
        C = np.zeros((N, 3), np.float32); A = np.zeros(N, np.float32); tr = np.ones(N, np.float32)
        for k in range(K):                                                         # front-to-back over disk crossings
            sel = ki == k
            idx = ni[sel]
            ak = np.zeros(N, np.float32); dk = np.zeros(N, np.float32); ck = np.zeros((N, 3), np.float32); ok = np.zeros(N, np.float32)
            ak[idx] = a_em[sel]; dk[idx] = a_dk[sel]; ck[idx] = col[sel]; ok[idx] = (opac * fade)[sel]
            C += tr[:, None] * ak[:, None] * ck
            A += tr * np.clip(ak + dk, 0, 1)
            tr *= 1 - np.clip(ok + dk, 0, 1)
        pulse = 0.65 + 0.35 * math.sin(2 * math.pi * u) ** 2                       # the ring breathes once per loop
        rc = ring * pulse * (0.55 + 0.45 * np.clip(bx.ravel() / -HALF * 3 + 0.5, 0, 1))   # brighter on the approaching side
        C += tr[:, None] * rc[:, None] * palette(np.full(N, 0.9))
        A += tr * np.clip(rc, 0, 1); tr *= 1 - np.clip(rc, 0, 1)
        A = np.minimum(1, A + tr * captured)                                        # the shadow: pure black
        tr = tr * (1 - captured)
        A = A + tr * aura * (0.9 + 0.1 * math.cos(2 * math.pi * u))                 # light-sucking halo darkens what is behind
        C = C.reshape(n, n, 3); A = A.reshape(n, n)
        hot = C * ss(0.5, 1.0, C.max(-1))[..., None]
        C = img.blur(C, 1); A = img.blur(A[..., None], 1)[..., 0]                   # thick-disk softness: no sub-pixel slivers
        halo = img.blur(hot, max(2, n // 32)) * 0.6                                 # violet bloom
        C = C + halo * (1 - A[..., None]); A = A + np.minimum(1, halo.max(-1) * 1.2) * (1 - A)
        C = np.minimum(C, A[..., None])
        C = C.reshape(S, SS, S, SS, 3).mean((1, 3)); A = A.reshape(S, SS, S, SS).mean((1, 3))
        out.append(img.finish(C.astype(np.float32), A.astype(np.float32)))
    return out


def check(geo, fr):
    """Outside judge: physics numbers + loop seam, printed."""
    cr_r, cr_psi, nc, captured, lam = geo
    n = S * SS
    px = (2 * HALF / n) ** 2
    rs = math.sqrt(captured.sum() * px / math.pi)
    a = np.stack(fr).astype(np.float32)
    lum = (a[..., :3] * a[..., 3:] / 255).mean(-1)
    left, right = lum[:, :, :S // 2].sum(), lum[:, :, S // 2:].sum()
    steps = [np.abs(a[i] - a[(i + 1) % len(a)]).mean() for i in range(len(a))]
    vis = float((a[..., :3] * a[..., 3:] / 255).mean())
    return {'shadow_radius_M': round(float(rs), 3), 'theory': round(3 * math.sqrt(3), 3), 'disk_rays_with_2plus_images': int((nc >= 2).sum()),
            'doppler_bright_side': 'left' if left > right else 'right', 'brightness_ratio': round(float(max(left, right) / max(min(left, right), 1e-9)), 2),
            'motion_pct_per_frame': round(float(np.mean(steps)) / max(vis, 1e-6) * 100, 1),
            'loop_seam_vs_mean_step': round(float(steps[-1] / (sum(steps[:-1]) / (len(steps) - 1))), 2)}


def black_hole(seed):
    geo = trace(S * SS)
    fr = frames(geo)
    entry = {k: ENTRY[k] for k in ('FlipbookLayout', 'FlipbookMode', 'FlipbookFramerate', 'Lifetime', 'LightEmission',
                                   'LightInfluence', 'SizeStuds', 'Orientation')}
    return fr, entry, check(geo, fr)
