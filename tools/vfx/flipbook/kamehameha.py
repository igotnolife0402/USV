"""Kamehameha-style energy wave from physics: a blue plasma beam and its charge sphere.

Colour is spectral, not picked: the envelope glows with singly ionised argon's emission lines (the argon-laser cyan) over a
Cherenkov continuum (Frank-Tamm, energy ~ lambda^-3), around a 15000 K blackbody core, all through the Wyman 2013 CIE fit
(measured: Cherenkov alone is a pale lavender-blue, so lines carry the cyan); film-like exposure
(1 - e^-E) then saturates blue first, then green, so bright plasma runs blue -> cyan -> white on its own.
Beam: optically thin, axisymmetric plasma column (projected Gaussian core + envelope: the Abel transform of a Gaussian is a
Gaussian), energy flowing along the axis in helical flux tubes (a vortex tube at constant pitch), stirred by fbm turbulence
advected with the flow; two-scale glare (lens PSF) adds the halo.
Charge: emitting plasma ball (limb-brightened shell + core, differentially rotating granulation, streamer corona) with
lightning grown by the dielectric breakdown model (Niemeyer-Pietronero-Wiesmann 1984: growth chance ~ |phi|^eta on a Laplace field).

  python3 kamehameha.py OUT --render 2048     # hi-res stills for renders: OUT/kamehameha-beam-hd.png, OUT/kamehameha-charge-hd.png
"""
import math, os, sys
import numpy as np
import img

F, FPS = 64, 24
WL = np.linspace(380, 780, 401)                      # 1 nm: emission lines need it


def _cmf():
    g = lambda x, mu, s1, s2: np.exp(-0.5 * ((x - mu) / np.where(x < mu, s1, s2)) ** 2)
    x = 1.056 * g(WL, 599.8, 37.9, 31.0) + 0.362 * g(WL, 442.0, 16.0, 26.7) - 0.065 * g(WL, 501.1, 20.4, 26.2)
    y = 0.821 * g(WL, 568.8, 46.9, 40.5) + 0.286 * g(WL, 530.9, 16.3, 31.1)
    z = 1.217 * g(WL, 437.0, 11.8, 36.0) + 0.681 * g(WL, 459.0, 26.0, 13.8)
    return x, y, z


def spectrum_rgb(power):
    """Linear sRGB (max channel 1, out-of-gamut clipped) of a spectral power distribution sampled on WL."""
    x, y, z = _cmf(); X, Y, Z = (x * power).sum(), (y * power).sum(), (z * power).sum()
    rgb = np.maximum([3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z], 0)
    return (rgb / rgb.max()).astype(np.float32)


# Ar II (singly ionised argon) lines, nm: relative strength (NIST-like): the argon-ion-laser cyan of a hot ionised envelope
AR2 = {434.8: 0.9, 440.1: 0.5, 454.5: 0.5, 457.9: 0.5, 465.8: 0.5, 472.7: 0.6, 476.5: 0.8, 480.6: 1.0, 484.8: 0.6, 488.0: 1.0,
       496.5: 0.6, 501.7: 0.4, 514.5: 0.8}
ION = spectrum_rgb(sum(w * np.exp(-0.5 * ((WL - l) / 0.6) ** 2) for l, w in AR2.items()))
CHER = spectrum_rgb(WL ** -3.0)                        # Cherenkov continuum (Frank-Tamm)
ENV = (0.7 * ION + 0.3 * CHER) / (0.7 * ION + 0.3 * CHER).max()   # envelope: line emission over a Cherenkov continuum
CORE = img.blackbody(np.array([15000.0]))[0]          # white-hot core
# emission lines by element, nm: relative strength (strongest visible lines): the colour of any glow is `element=` in a recipe
LINES = {'Ar': AR2, 'Ar-blue': {457.9: 0.6, 465.8: 0.7, 472.7: 0.8, 476.5: 1.0, 480.6: 0.9, 488.0: 1.0},
         'Ne': {585.2: 0.5, 614.3: 0.4, 640.2: 1.0, 650.6: 0.6, 659.9: 0.4, 692.9: 0.6, 703.2: 0.8}, 'H': {656.3: 1.0, 486.1: 0.25, 434.0: 0.08},
         'Cu': {510.6: 0.8, 515.3: 1.0, 521.8: 1.0}, 'Na': {589.0: 1.0, 589.6: 0.5}, 'Ba': {455.4: 0.6, 493.4: 0.5, 553.5: 1.0},
         'Sr': {460.7: 0.4, 640.8: 0.8, 650.4: 1.0}, 'K': {404.4: 1.0, 404.7: 0.6, 766.5: 0.7}, 'Li': {610.4: 0.3, 670.8: 1.0}, 'Hg': {404.7: 0.5, 435.8: 1.0, 546.1: 0.8}}


def element_rgb(name):
    """Linear sRGB of an element's emission lines (`LINES`), max channel 1."""
    return spectrum_rgb(sum(w * np.exp(-0.5 * ((WL - l) / 0.6) ** 2) for l, w in LINES[name].items()))


def shade(core, env, H, exposure=1.6, envc=None):
    """Emission (core, envelope intensity maps) -> premultiplied colour + alpha, with glare and film-like exposure."""
    lin = core[..., None] * CORE * 2.4 + env[..., None] * (ENV if envc is None else envc) * 1.7
    lin = lin + img.blur(lin, max(1, H // 40)) * 0.45 + img.blur(lin, max(2, H // 12)) * 0.28    # lens PSF: tight + wide glare
    disp = 1 - np.exp(-lin * exposure)
    A = np.clip(disp.max(-1) * 1.05, 0, 1)
    return disp * A[..., None], A


def beam_maps(W, H, t, seed, source=False, period=256, cell=16, tubes=5, lead=0):
    """Intensity maps of a beam running +x across a W x H image at frame t; seamless over F frames (flow period `period` px)."""
    x = np.arange(W, dtype=np.float32)[None, :] + 0.5; y = np.arange(H, dtype=np.float32)[:, None] + 0.5 - H / 2
    v = period / F; u = x - v * t                                      # coordinate carried with the flow
    pa = period // cell; R0 = 0.16 * H
    Rx = R0 * (0.62 + 0.38 * img.smooth(lead, lead + 0.3 * W, x)) if source else R0 + 0 * x
    tt = t * 8 / F                                                      # noise time, period 8 lattice steps per loop
    wob = (img.fbm(u / (cell * 2), 0 * x + 3.0, tt, seed, 2, pa // 2, 8) - 0.5) * 0.35 * R0
    yy = y - wob
    rag = img.fbm(u / (cell * 0.5), yy / (cell * 0.5), tt, seed + 7, 3, pa * 2, 8)       # ragged plasma edge
    core = np.exp(-(yy / (0.42 * Rx)) ** 2) * (0.85 + 0.3 * (img.fbm(u / cell, 0 * x + 9.0, tt, seed + 3, 2, pa, 8) - 0.5))
    env = np.exp(-(yy / (1.05 * Rx)) ** 2) * (0.55 + 0.75 * (rag - 0.5)) + 0.25 * np.exp(-(yy / (1.9 * Rx)) ** 2)
    k = 2 * math.pi * 2 / period                                       # two helix turns per flow period
    for i in range(tubes):
        th = k * u + 2 * math.pi * i / tubes
        yi = 0.62 * Rx * np.cos(th); front = 0.75 + 0.25 * np.sin(th)
        flick = 0.6 + 0.8 * img.fbm(u / cell, 0 * x + 20.0 + i, tt, seed + 11 + i, 2, pa, 8)
        env = env + 0.55 * front * flick * np.exp(-((yy - yi) / (0.13 * Rx)) ** 2)
    if source:            # the bulb where it leaves the hands, `lead` px in, so its glare fades out inside the image
        x0 = lead + 1.15 * R0; d = np.hypot(x - x0, y); on = img.smooth(x0 - 0.6 * R0, x0 + 0.4 * R0, x)
        core = core * on + 1.4 * np.exp(-(d / (0.9 * R0)) ** 2); env = env * on + 0.9 * np.exp(-(d / (1.7 * R0)) ** 2)
    return core.astype(np.float32), env.astype(np.float32)


def dbm(G, seed, r_in, r_out, eta=2.6, steps=420):
    """Dielectric breakdown: grow one discharge from the ball surface toward a far electrode. Returns the cluster mask."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[:G, :G] - G / 2 + 0.5; rr = np.hypot(xx, yy)
    ball, far = rr <= r_in, rr >= r_out
    a = rng.uniform(0, 2 * math.pi); sx, sy = int(G / 2 + (r_in + 1) * math.cos(a)), int(G / 2 + (r_in + 1) * math.sin(a))
    cl = np.zeros((G, G), bool); cl[sy, sx] = True
    phi = np.clip((rr - r_in) / (r_out - r_in), 0, 1)
    for _ in range(steps):
        for _ in range(8):                                             # Jacobi relaxation, warm-started
            phi[1:-1, 1:-1] = 0.25 * (phi[:-2, 1:-1] + phi[2:, 1:-1] + phi[1:-1, :-2] + phi[1:-1, 2:])
            phi[ball | cl] = 0; phi[far] = 1
        nb = np.zeros_like(cl); nb[1:] |= cl[:-1]; nb[:-1] |= cl[1:]; nb[:, 1:] |= cl[:, :-1]; nb[:, :-1] |= cl[:, 1:]
        cand = np.flatnonzero(nb & ~cl & ~ball & ~far)
        if not len(cand): break
        w = np.maximum(phi.ravel()[cand], 1e-9) ** eta
        c = rng.choice(cand, p=w / w.sum()); cl.ravel()[c] = True
        if rr.ravel()[c] >= r_out - 2: break
    return cl


def box_dim(mask):
    """Box-counting fractal dimension of a mask (DBM in 2D: ~1.7 at eta 1, lower as eta grows)."""
    G = mask.shape[0]; ns, ss = [], []
    for s in (2, 4, 8, 16):
        m = mask[:G // s * s, :G // s * s].reshape(G // s, s, G // s, s).any((1, 3)); ns.append(m.sum()); ss.append(s)
    return float(-np.polyfit(np.log(ss), np.log(np.maximum(ns, 1)), 1)[0])


def charge_maps(S, t, seed, arcs):
    """Plasma ball with granulation, corona and the arcs alive at frame t."""
    yy, xx = np.mgrid[:S, :S].astype(np.float32) - S / 2 + 0.5; rho = np.hypot(xx, yy); ang = np.arctan2(yy, xx)
    r0 = 0.2 * S; inside = rho < r0
    z = np.sqrt(np.maximum(r0 * r0 - rho * rho, 0)) / r0
    tt = t * 8 / F; c = rho / (r0 / 4)
    # differential rotation that still loops: two layers turning 2 and 1 whole revolutions per loop, blended by radius
    g_in = img.fbm(ang / (2 * math.pi) * 12 + 24 * t / F, c, tt, seed, 3, 12, 8)
    g_out = img.fbm(ang / (2 * math.pi) * 12 + 12 * t / F, c, tt, seed + 1, 3, 12, 8)
    gran = g_in + (g_out - g_in) * img.smooth(0.3, 1.0, rho / r0)
    soft = img.smooth(1.08, 0.86, rho / r0)                                         # plasma has no hard surface
    shell = np.clip(0.18 / np.maximum(z, 0.22), 0, 0.82) * soft                        # limb-brightened shell
    core = z ** 1.5 * (0.9 + 0.5 * (gran - 0.5)) * 1.3
    out = np.maximum(rho - r0, 0) / r0
    streak = img.fbm(ang / (2 * math.pi) * 16, out * 3, tt, seed + 5, 2, 16, 8)
    env = shell * (0.7 + 0.6 * gran) + np.exp(-out / 0.22) * (0.35 + 0.9 * streak) * (~inside | (z < 0.4)) + 0.3 * np.exp(-out / 0.8)
    for cl, born in arcs:
        up = S // cl.shape[0]
        age = (t - born) % F
        if age < len(LIFE):
            m = np.kron(cl.astype(np.float32), np.ones((up, up), np.float32))
            m = img.blur(m, max(1, S // 96)) * 2.2 * LIFE[age]
            core = core + m * 0.8; env = env + img.blur(m, max(2, S // 24)) * 1.4
    return core.astype(np.float32), env.astype(np.float32)


LIFE = (0.5, 1.0, 0.8, 0.58, 0.38, 0.2)       # an arc's brightness by age (frames): strike, then decay; 3 alive at once


def make_arcs(S, seed, n=32, at=None):
    """n arcs born every 2 frames; `at`: only those alive at that frame (hi-res stills)."""
    G = S // 2 if S <= 256 else S // 4
    born = [(i * 2) % F for i in range(n)]
    return [(dbm(G, seed * 100 + i, 0.2 * G, 0.47 * G), b) for i, b in enumerate(born) if at is None or (at - b) % F < len(LIFE)]


def _frames(maps, S, seed, envc=None):
    out = []
    for t in range(F):
        core, env = maps(t)
        C, A = shade(core, env, S, envc=envc)
        out.append(img.finish(C, A))
    return out


def charge(seed, element=None):
    S = 128; arcs = make_arcs(S, seed)
    frames = _frames(lambda t: charge_maps(S, t, seed, arcs), S, seed, element and element_rgb(element))
    a = np.stack(frames).astype(np.float32); st = np.abs(np.diff(a, axis=0)).mean((1, 2, 3))
    checks = dict(ar2_lines_rgb=[round(float(c), 3) for c in ION], cherenkov_rgb=[round(float(c), 3) for c in CHER], envelope_rgb=[round(float(c), 3) for c in ENV], core_rgb_15000K=[round(float(c), 3) for c in CORE],
                  arc_fractal_dim=round(float(np.mean([box_dim(c) for c, _ in arcs])), 2),
                  loop_seam_vs_mean_step=round(float(np.abs(a[0] - a[-1]).mean() / st.mean()), 2))
    entry = dict(FlipbookLayout='Grid8x8', FlipbookMode='Loop', FlipbookFramerate=FPS, Lifetime=F / FPS, LightEmission=1,
                 LightInfluence=0, SizeStuds=[3, 3.5], Orientation='FacingCamera')
    return frames, entry, checks


def beam(seed, element=None):
    S = 128
    frames = _frames(lambda t: beam_maps(S, S, t, seed), S, seed, element and element_rgb(element))
    a = np.stack(frames).astype(np.float32); st = np.abs(np.diff(a, axis=0)).mean((1, 2, 3))
    checks = dict(loop_seam_vs_mean_step=round(float(np.abs(a[0] - a[-1]).mean() / st.mean()), 2),
                  flow_px_per_frame=256 / F)
    entry = dict(FlipbookLayout='Grid8x8', FlipbookMode='Loop', FlipbookFramerate=FPS, Lifetime=F / FPS, LightEmission=1,
                 LightInfluence=0, SizeStuds=[6, 6], Orientation='VelocityParallel')
    return frames, entry, checks


def still(C, A):
    """Premultiplied colour + alpha of any shape -> straight-alpha RGBA uint8 (colour bled into clear pixels, no dark fringe)."""
    w = A[..., None]; b = img.blur(np.concatenate([C, w], -1), 4)
    fill = np.where(b[..., 3:] > 0.01, b[..., :3] / np.maximum(b[..., 3:], 1e-6), C.sum((0, 1)) / max(float(A.sum()), 1e-6))
    col = np.where(w > 0.03, C / np.maximum(w, 1e-6), fill)
    return (np.concatenate([np.clip(col, 0, 1), np.clip(A, 0, 1)[..., None]], -1) * 255 + 0.5).astype(np.uint8)


def render(out, W, seed=7, t=11):
    """Hi-res stills (straight-alpha RGBA PNG) of one frame, for compositing into renders."""
    from PIL import Image
    H = W // 4
    C, A = shade(*beam_maps(W, H, t, seed, source=True, period=W // 2, cell=max(16, W // 64), lead=W // 12), H)
    Image.fromarray(still(C, A)).save(os.path.join(out, 'kamehameha-beam-hd.png'), optimize=True)
    S = (W * 3 // 8) // 4 * 4
    C, A = shade(*charge_maps(S, t, seed, make_arcs(S, seed, at=t)), S)
    Image.fromarray(img.finish(C, A)).save(os.path.join(out, 'kamehameha-charge-hd.png'), optimize=True)


if __name__ == '__main__':
    o = sys.argv[1]; os.makedirs(o, exist_ok=True)
    render(o, int(sys.argv[sys.argv.index('--render') + 1]) if '--render' in sys.argv else 2048)
    print('wrote', o)
