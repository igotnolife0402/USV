"""Impact bursts from physics, for something hard breaking (glass, crystal, ice).

`shock`: the contact flash and blast wave. A point release of energy drives a shell whose radius grows as t^(2/5)
(Sedov-Taylor), its glow falling as the energy spreads over the shell (~ t^-6/5); a white-hot core (15000 K) flashes and
cools with a 2-frame rise so nothing pops. Colour: an element's emission lines (`element=Ar-blue` default).
`glints`: tumbling mirror flakes thrown from the contact: ballistic (drag, gravity), each flake a tiny flat mirror whose
normal turns at a constant rate; it flares only when that normal bisects the light and the eye (specular lobe
(n.h)^shininess), so the cloud twinkles the way real glass dust does; tinted by the crystal's colour, white at the peak.
Both start at frame `delay` (the contact) and leave lingering dust to the last frame.
"""
import math
import numpy as np
import img
from kamehameha import element_rgb, CORE, F
from slash import _glow, _entry

S = 128


def shock(seed, element='Ar-blue', delay=1, r0=0.05, grow=0.3, width=0.05, ring=1.0, core=1.0, gain=1.0, exposure=1.5, life=1.4, attack=3.0):
    y, x = np.mgrid[0:S, 0:S].astype(np.float32) + 0.5; r = np.hypot(x - S / 2, y - S / 2) / S
    rgb = element_rgb(element); ang = np.arctan2(y - S / 2, x - S / 2)
    rough = img.fbm(ang / (2 * math.pi) * 16, r * 10, 0.0, seed, 3, pa=16)        # the shell is torn, not a perfect ring
    frames = []
    for t in range(F):
        a = t - delay
        if a < -0.5: frames.append(img.finish(np.zeros((S, S, 3), np.float32), np.zeros((S, S), np.float32))); continue
        rise = img.smooth(-0.5, attack - 0.5, a); tt = max(a, 0) + 1.0   # attack: frames to full; 2.5 popped (jump 3.65-3.96), 3.0 = 2.4-2.5 (2026-11-24)
        R = r0 + grow * (tt / F) ** 0.4 * (0.92 + 0.16 * rough)                    # Sedov-Taylor: R ~ t^(2/5)
        W = width * (1 + tt / 18)
        shell = np.exp(-((r - R) / W) ** 2) * tt ** -1.2 * 3.0 * ring
        flash = np.exp(-(r / (0.05 + 0.004 * tt)) ** 2) * math.exp(-max(a, 0) / 3.5) * core
        fade = img.smooth(F - 1, F - 20, t)
        lin = (shell[..., None] * rgb * 2.0 + flash[..., None] * CORE * 4.0) * rise * fade * gain
        frames.append(img.finish(*_glow(lin, exposure)))
    return frames, _entry(life), dict(element_rgb=[round(float(c), 3) for c in rgb])


def glints(seed, n=180, element='Ar-blue', delay=1, speed=3.2, drag=0.94, gravity=0.06, spin=0.35, shine=60, life_f=40,
           size=1, gain=1.0, exposure=1.4, spread=1.0, life=1.4, attack=0.8):
    n = int(n); rng = np.random.default_rng(seed + 11)
    rgb = element_rgb(element); tint = 0.55 * rgb + 0.45
    ang = rng.uniform(0, 2 * math.pi, n); sp = speed * rng.uniform(0.25, 1.0, n) ** 0.6 * spread
    P = np.stack([np.full(n, S / 2.0), np.full(n, S / 2.0)], 1) + rng.normal(0, 1.2, (n, 2))
    V = np.stack([np.cos(ang) * sp, np.sin(ang) * sp - 0.6 * speed * rng.uniform(0, 1, n)], 1)       # most fly out, some up
    nrm = rng.normal(0, 1, (n, 3)); nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
    ax = rng.normal(0, 1, (n, 3)); ax /= np.linalg.norm(ax, axis=1, keepdims=True); w = spin * rng.uniform(0.4, 1.6, n)
    H = np.array([-0.35, -0.5, 1.0]); H /= np.linalg.norm(H)                                          # half vector: light upper left, eye +z
    lf = life_f * rng.uniform(0.6, 1.4, n)
    frames = []; sub = 3
    for t in range(F):
        acc = np.zeros((S, S, 3), np.float32)
        for q in range(sub):
            tt = t + q / sub - delay
            if tt < 0: continue
            V *= drag ** (1 / sub); V[:, 1] += gravity / sub; P += V / sub
            th = w * tt; c, s = np.cos(th)[:, None], np.sin(th)[:, None]
            nt = nrm * c + np.cross(ax, nrm) * s + ax * (ax * nrm).sum(1, keepdims=True) * (1 - c)       # Rodrigues: the flake turns
            spec = np.abs(nt @ H) ** shine                                                                 # both faces mirror
            b = (spec * 3.0 + 0.06) * np.exp(-tt / lf) * img.smooth(-0.5, attack, tt) * img.smooth(F - 1, F - 10, t + q / sub)
            col = (tint[None] * (1 - spec[:, None]) + spec[:, None]) * b[:, None] / sub
            ix, iy = P[:, 0] - 0.5, P[:, 1] - 0.5; x0, y0 = np.floor(ix).astype(int), np.floor(iy).astype(int); fx, fy = ix - x0, iy - y0
            for ox, oy, wt in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
                xx, yy = x0 + ox, y0 + oy; m = (xx >= 0) & (xx < S) & (yy >= 0) & (yy < S)
                np.add.at(acc, (yy[m], xx[m]), col[m] * wt[m, None])
        lin = img.blur(acc, int(size) + 1) * (6.0 + 3 * size) * gain                 # flakes >= 3 px (no hair-thin strokes)
        frames.append(img.finish(*_glow(lin, exposure, 1.2)))
    return frames, _entry(life), dict(flakes=n)
