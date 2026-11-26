"""Image helpers shared by every effect: blackbody colour, blur, Roblox-ready RGBA finish, sheet assembly and PNG encode."""
import math
import numpy as np
from PIL import Image


def blackbody_lut(t0=800.0, t1=40000.0, n=512):
    """Linear sRGB colour of a blackbody, max channel 1, on a log-spaced kelvin table (Planck x Wyman 2013 CIE fit)."""
    T = np.geomspace(t0, t1, n)
    wl = np.linspace(380, 780, 81)[:, None]
    g = lambda x, mu, s1, s2: np.exp(-0.5 * ((x - mu) / np.where(x < mu, s1, s2)) ** 2)
    xb = 1.056 * g(wl, 599.8, 37.9, 31.0) + 0.362 * g(wl, 442.0, 16.0, 26.7) - 0.065 * g(wl, 501.1, 20.4, 26.2)
    yb = 0.821 * g(wl, 568.8, 46.9, 40.5) + 0.286 * g(wl, 530.9, 16.3, 31.1)
    zb = 1.217 * g(wl, 437.0, 11.8, 36.0) + 0.681 * g(wl, 459.0, 26.0, 13.8)
    lm = wl * 1e-9
    B = 1 / (lm ** 5 * (np.exp(1.4388e-2 / (lm * T[None])) - 1))
    X, Y, Z = (xb * B).sum(0), (yb * B).sum(0), (zb * B).sum(0)
    rgb = np.maximum(np.stack([3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
                               0.0557 * X - 0.2040 * Y + 1.0570 * Z], -1), 0)
    return (rgb / rgb.max(-1, keepdims=True)).astype(np.float32), t0, t1


_BB = blackbody_lut()


def blackbody(T):
    """Colour for an array of kelvin temperatures (any shape) -> shape + (3,)."""
    lut, t0, t1 = _BB
    ti = np.clip(np.log(np.maximum(T, t0) / t0) / math.log(t1 / t0) * (len(lut) - 1), 0, len(lut) - 1)
    i0 = np.floor(ti).astype(np.int32); f = (ti - i0)[..., None].astype(np.float32)
    return lut[i0] * (1 - f) + lut[np.minimum(i0 + 1, len(lut) - 1)] * f


def blur(img, k):
    """Box blur of radius k over the first two axes, run twice (close to Gaussian); cumulative sums, edge-clamped."""
    for _ in range(2):
        for ax in (0, 1):
            p = np.concatenate([np.repeat(np.take(img, [0], ax), k + 1, ax), img, np.repeat(np.take(img, [-1], ax), k, ax)], ax)
            c = np.cumsum(p, ax, dtype=np.float32)
            img = (np.take(c, range(2 * k + 1, c.shape[ax]), ax) - np.take(c, range(0, c.shape[ax] - 2 * k - 1), ax)) / (2 * k + 1)
    return img


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def finish(C, A, edge=0.08, across=False):
    """Premultiplied float colour + alpha -> straight-alpha uint8 RGBA for Roblox.
    Fades the outer `edge` of the frame so nothing clips at the cell border, and bleeds colour into transparent pixels so
    texture filtering and mipmaps never pull in a dark fringe."""
    S = A.shape[0]
    t = (np.arange(S) + 0.5) / S
    e = smooth(0, edge, np.minimum(t, 1 - t))
    m = (e[:, None] * (np.ones_like(e) if across else e)[None, :]).astype(np.float32)   # across: rows only, so x tiles (beams)
    A = np.clip(A * m, 0, 1); C = C * m[..., None]
    w = A[..., None]
    b = blur(np.concatenate([C, w], -1), max(2, S // 24))
    flat = C.sum((0, 1)) / max(float(A.sum()), 1e-6)
    fill = np.where(b[..., 3:] > 0.01, b[..., :3] / np.maximum(b[..., 3:], 1e-6), flat)
    col = np.where(w > 0.03, C / np.maximum(w, 1e-6), fill)
    return (np.concatenate([np.clip(col, 0, 1), A[..., None]], -1) * 255 + 0.5).astype(np.uint8)


def sheet(frames, path):
    """Square grid of equal RGBA frames -> one PNG (zlib 9: lossless, smallest)."""
    g = int(round(math.sqrt(len(frames))))
    S = frames[0].shape[0]
    out = np.zeros((S * g, S * g, 4), np.uint8)
    for i, f in enumerate(frames):
        out[(i // g) * S:(i // g + 1) * S, (i % g) * S:(i % g + 1) * S] = f
    Image.fromarray(out, 'RGBA').save(path, compress_level=6)   # lossless; 9 took 0.72 s vs 0.13 s for +3% size (2026-11-24)
    return out


_LAT = np.random.default_rng(4321).random(1 << 16).astype(np.float32)


def vnoise(a, c, t, seed, pa, pt):
    """Value noise on a lattice, periodic in a (period pa cells) and t (period pt); smooth (cubic fade) in all three."""
    a0, c0, t0 = np.floor(a), np.floor(c), math.floor(t)
    fa, fc, ft = a - a0, c - c0, t - t0
    fa, fc, ft = fa * fa * (3 - 2 * fa), fc * fc * (3 - 2 * fc), ft * ft * (3 - 2 * ft)
    a0, c0 = a0.astype(np.int64), c0.astype(np.int64)
    out = []
    for it in (t0 % pt, (t0 + 1) % pt):
        h = lambda ia, ic: _LAT[((ia % pa) * 7919 + ic * 104729 + it * 3571 + seed * 977) & 0xFFFF]
        x0 = h(a0, c0) + (h(a0 + 1, c0) - h(a0, c0)) * fa
        x1 = h(a0, c0 + 1) + (h(a0 + 1, c0 + 1) - h(a0, c0 + 1)) * fa
        out.append(x0 + (x1 - x0) * fc)
    return out[0] + (out[1] - out[0]) * ft


def fbm(a, c, t, seed, oct=3, pa=4096, pt=4096):
    """Octaves of vnoise (each doubles frequency and keeps the periods), contrast-stretched to about 0..1."""
    s = tot = 0.0; amp = 0.5
    for o in range(oct):
        m = 1 << o
        s = s + amp * vnoise(a * m, c * m, t * m, seed + o * 101, pa * m, pt * m)
        tot += amp; amp *= 0.5
    return np.clip((s / tot - 0.5) * 2.0 + 0.5, 0, 1)
