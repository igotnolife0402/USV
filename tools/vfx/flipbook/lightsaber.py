"""Lightsaber blade from physics: a thin, optically thin plasma column seen from the side, for the studio's 3D beam
(flipbook shape 'beam': the frame is the side view, x along the blade, tiled seamlessly).

Colour is spectral: the sheath glows with an element's emission lines (default `Ar-blue`, 457.9-488.0 nm; `element=Ne` red, `Cu` green, ...) around
a white-hot core (blackbody 15000 K), through kamehameha.py's CIE fit; film-like exposure (1 - e^-E) saturates the core to
white and leaves the sheath blue. The column's projected emission is a Gaussian (Abel transform of a Gaussian), plus a
wide scattering halo and a two-scale lens glare. The hum is a power flicker (three whole-cycle tones, so it loops) and the
sheath shimmers with fbm carried along the blade one frame width per loop: periodic in x and in time.
"""
import math
import numpy as np
import img
from kamehameha import element_rgb, CORE, F, FPS


def blade_maps(S, t, seed, pad, core_w=0.045, sheath_w=0.12, hum_amp=1.0, shimmer=1.0):
    """Core and sheath intensity over an (S + 2 pad) wide strip, x periodic with period S, at frame t."""
    x = np.arange(-pad, S + pad, dtype=np.float32)[None, :] + 0.5; y = np.arange(S, dtype=np.float32)[:, None] + 0.5 - S / 2
    u = x - S / F * t; cell = 16; pa = S // cell; tt = t * 8 / F
    hum = 1 + hum_amp * sum(a * math.sin(2 * math.pi * (k * t / F) + p) for k, a, p in ((3, 0.035, 0.4), (7, 0.025, 1.9), (13, 0.015, 4.1)))
    wob = (img.fbm(u / (cell * 2), 0 * x + 5.0, tt, seed, 2, pa // 2, 8) - 0.5) * 0.012 * S          # the column barely moves
    yy = y - wob
    shim = img.fbm(u / cell, yy / cell, tt, seed + 7, 3, pa, 8)
    core = np.exp(-(yy / (core_w * S)) ** 2) * hum * (0.97 + 0.06 * (img.fbm(u / cell, 0 * x + 9.0, tt, seed + 3, 2, pa, 8) - 0.5))
    sheath = (np.exp(-(yy / (sheath_w * S)) ** 2) * (0.85 + 0.3 * shimmer * (shim - 0.5)) + 0.16 * np.exp(-(yy / (2.5 * sheath_w * S)) ** 2)) * hum
    return core, sheath


def shade(core, sheath, S, pad, sheath_rgb, exposure=1.7):
    lin = core[..., None] * CORE * 2.8 + sheath[..., None] * sheath_rgb * 1.6
    lin = lin + img.blur(lin, max(1, S // 40)) * 0.5 + img.blur(lin, max(2, S // 10)) * 0.3     # lens PSF: tight + wide glare
    lin = lin[:, pad:pad + S]                                                                    # crop: the glare stays periodic in x
    disp = 1 - np.exp(-lin * exposure)
    A = np.clip(disp.max(-1) * 1.05, 0, 1)
    return disp * A[..., None], A


def blade(seed, element='Ar-blue', core=0.045, sheath=0.12, hum=1.0, shimmer=1.0, exposure=1.7):
    S, pad = 128, 24; rgb = element_rgb(element)
    frames = [img.finish(*shade(*blade_maps(S, t, seed, pad, core, sheath, hum, shimmer), S, pad, rgb, exposure), across=True) for t in range(F)]
    a = np.stack(frames).astype(np.float32); st = np.abs(np.diff(a, axis=0)).mean((1, 2, 3))
    checks = dict(sheath_rgb=[round(float(c), 3) for c in rgb], core_rgb_15000K=[round(float(c), 3) for c in CORE],
                  loop_seam_vs_mean_step=round(float(np.abs(a[0] - a[-1]).mean() / st.mean()), 2),
                  x_seam_vs_neighbour=round(float(np.abs(a[:, :, 0] - a[:, :, -1]).mean() / max(np.abs(a[:, :, 1] - a[:, :, 0]).mean(), 1e-6)), 2))
    entry = dict(FlipbookLayout='Grid8x8', FlipbookMode='Loop', FlipbookFramerate=FPS, Lifetime=F / FPS, LightEmission=1,
                 LightInfluence=0, SizeStuds=[1, 1], Orientation='VelocityParallel')
    return frames, entry, checks
