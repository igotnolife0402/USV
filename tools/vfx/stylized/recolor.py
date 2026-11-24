"""Owner 2026-11-24: 'identical shape, white, but coloured to the reference WITH a strong gradient or cool pattern texture'.
Takes a reference VFX sheet, splits it into a WHITE sheet (the exact shapes as grey light + alpha, like the flipbook white sheets) and
recolours that white with a per-pixel hue field taken from the reference, pushed through a strong 2-hue gradient (deep shifted shade ->
hue -> shifted bright -> white-hot core) plus a pattern texture inside the body of every effect (voronoi cells, warped flow stripes,
hex lattice, rune rings; each effect gets its own by position). Halos stay smooth so glow reads clean.
  python3 recolor.py REF.jpg OUT_PREFIX   -> OUT_PREFIX-white.png, OUT_PREFIX-color.png, OUT_PREFIX-compare.png + gate numbers"""
import sys, colorsys
import numpy as np
from PIL import Image

SHIFT = 0.45      # radians of hue rotation across the gradient (~26 deg each way): strong but stays in the reference family
PAT = 0.22        # pattern depth inside effect bodies


def box(x, k):
    for ax in (0, 1):
        c = np.cumsum(np.pad(x, [(k + 1, k) if i == ax else (0, 0) for i in range(2)], mode='edge'), axis=ax)
        n = c.shape[ax]
        x = (np.take(c, range(2 * k + 1, n), axis=ax) - np.take(c, range(0, n - 2 * k - 1), axis=ax)) / (2 * k + 1)
    return x


def blur(x, k): return box(box(box(x, k), k), k)


def split(a):
    """reference RGB -> light L (0..1, the white sheet), whiteness W (core), hue angle field H, hue weight HW"""
    v, mn = a.max(2), a.min(2); s = (v - mn) / np.maximum(v, 1e-3)
    bg = np.percentile(v, 20)                                   # navy floor of the reference
    L = np.clip((v - bg) / (1 - bg), 0, 1)
    W = np.clip((mn - bg) / (1 - bg), 0, 1)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)
    w = ((s > .3) & (v > .35)).astype(np.float32) * s * v
    cx, cy, ww = blur(np.cos(h) * w, 6), blur(np.sin(h) * w, 6), blur(w, 6)
    return L, W, np.arctan2(cy, cx), np.clip(ww * 40, 0, 1), bg


def hue_rgb(H, sat, val):
    """angle field (same convention as split) -> RGB"""
    # inverse of atan2(sqrt3 (g-b), 2r-g-b): unit chroma vector
    c, s_ = np.cos(H), np.sin(H)
    r = (1 + 2 * c) / 3; g = (1 - c + np.sqrt(3) * s_) / 3; b = (1 - c - np.sqrt(3) * s_) / 3
    rgb = np.stack([r, g, b], -1); rgb = rgb - rgb.min(-1, keepdims=True); rgb = rgb / np.maximum(rgb.max(-1, keepdims=True), 1e-3)
    return (1 - sat[..., None] + sat[..., None] * rgb) * val[..., None]


def patterns(h, w, L):
    """four texture families; which one an effect gets is picked by a coarse hash of its position (stable per effect)"""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    rng = np.random.default_rng(3)
    # voronoi cells (cracked crystal / energy cells)
    pts = rng.random((900, 2)) * [w, h]; d1 = np.full((h, w), 1e9, np.float32); d2 = d1.copy()
    gx, gy = (pts[:, 0] // 40).astype(int), (pts[:, 1] // 40).astype(int)
    for px, py in pts:
        d = (x - px) ** 2 + (y - py) ** 2
        m = d < d1; d2 = np.where(m, d1, np.minimum(d2, d)); d1 = np.where(m, d, d1)
    vor = np.clip((np.sqrt(d2) - np.sqrt(d1)) / 6, 0, 1)                    # 0 on cell edges
    # warped flow stripes (energy currents)
    n = blur(rng.random((h, w)).astype(np.float32), 10); n = (n - n.min()) / (n.max() - n.min())
    flow = .5 + .5 * np.sin((x * .9 + y * .5) * .12 + n * 18)
    # hex lattice (arcane)
    q = x * .16; r_ = y * .16 * 1.1547
    hexv = np.abs(np.sin(q) * np.sin(r_ + q * .5) * np.sin(r_ - q * .5)); hexv = np.clip(hexv * 4, 0, 1)
    # concentric rune rings around each effect's light centroid (blurred L peak)
    Lb = blur(L, 25); gy_, gx_ = np.gradient(Lb)
    rings = .5 + .5 * np.sin(np.hypot(gx_, gy_) * 0 + (blur(L, 3) * 30))
    sel = ((x // 130).astype(int) * 7 + (y // 135).astype(int) * 3) % 4
    wts = [blur((sel == i).astype(np.float32), 22) for i in range(4)]     # soft blend: no hard seams through an effect
    return (sum(w_ * p_ for w_, p_ in zip(wts, [vor, flow, hexv, rings])) / np.maximum(sum(wts), 1e-3)).astype(np.float32)


def recolor(a):
    L, W, H, HW, bg = split(a)
    h, w = L.shape
    t = np.clip(.75 * L + .35 * W, 0, 1)                         # gradient position: light, pushed up by white cores
    body = np.clip((L - .35) / .3, 0, 1) * (1 - np.clip((W - .55) / .3, 0, 1))   # pattern lives in the coloured body, not halo or core
    p = patterns(h, w, L)
    t = np.clip(t + PAT * (p - .5) * body, 0, 1)
    Hs = H + SHIFT * (t - .5) * 2                                # strong hue gradient: shade side rotates one way, bright side the other
    sat = HW * np.clip(1.15 - t ** 3 * 1.1, 0, 1)                # saturated body, desaturates to white only at the hot core
    val = np.clip(.25 + 1.1 * t, 0, 1) * (1 - .35 * PAT * (1 - p) * body)
    col = hue_rgb(Hs, sat, val)
    col = np.where(HW[..., None] > .02, col, np.repeat((np.clip(.3 + .9 * t, 0, 1) * (1 - .2 * (1 - p) * body))[..., None], 3, -1) * [.92, .97, 1.0])
    al = np.clip(L * 1.35, 0, 1)[..., None]
    base = np.array([.024, .125, .192], np.float32)
    return np.clip(base * (1 - al) + col * al, 0, 1), L, W, H, HW


def gates(a, out, L):
    """shape identity (light correlation) + gradient strength (hue spread inside each lit effect) + hue family match"""
    Lo = np.clip((out.max(2) - .19) / .81, 0, 1)
    corr = float(np.corrcoef(L.ravel(), Lo.ravel())[0, 1])
    def hue(img):
        v, mn = img.max(2), img.min(2); s = (v - mn) / np.maximum(v, 1e-3)
        r, g, b = img[..., 0], img[..., 1], img[..., 2]; return np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)), s, v
    hr, sr, vr = hue(a); ho, so, vo = hue(out)
    m = (sr > .35) & (vr > .45) & (so > .2)
    dh = np.abs((hr - ho + 180) % 360 - 180)[m]
    spread = []
    for y0 in range(0, 900, 150):
        for x0 in range(0, 1600, 133):
            mm = m[y0:y0 + 150, x0:x0 + 133]
            if mm.sum() > 200: spread.append(float(np.percentile(ho[y0:y0 + 150, x0:x0 + 133][mm], 90) - np.percentile(ho[y0:y0 + 150, x0:x0 + 133][mm], 10)))
    return dict(shape_corr=round(corr, 3), hue_family_deg=round(float(np.median(dh)), 1), gradient_spread_deg=round(float(np.median(spread)), 1))


if __name__ == '__main__':
    ref, pre = sys.argv[1], sys.argv[2]
    a = np.asarray(Image.open(ref).convert('RGB'), np.float32) / 255
    out, L, W, H, HW = recolor(a)
    g = (L * 255).astype(np.uint8)
    Image.fromarray(np.dstack([np.full_like(g, 255), np.full_like(g, 255), np.full_like(g, 255), g])).save(pre + '-white.png')
    Image.fromarray((out * 255 + .5).astype(np.uint8)).save(pre + '-color.png')
    side = Image.new('RGB', (a.shape[1], a.shape[0] * 2)); side.paste(Image.open(ref).convert('RGB'), (0, 0)); side.paste(Image.open(pre + '-color.png'), (0, a.shape[0]))
    side.resize((a.shape[1] // 2, a.shape[0])).save(pre + '-compare.png')
    print(gates(a, out, L))
