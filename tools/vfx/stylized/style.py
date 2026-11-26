"""Stylized mobile-game VFX look (owner reference 2026-11-24): a shape mask (0..1) is coloured through the same 5-step HSV ramp as the
flipbook bands (vfx.layer_colors: saturated darks -> hue -> white-hot core), textured with value noise, and sits in a soft halo of
its own hue. Everything is drawn with PIL at 2x and downsampled (anti-aliased edges); numpy does colour and compositing."""
import os, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'flipbook'))
import vfx  # noqa: E402  (layer_colors = the one gradient rule shared with VFX.lua and the preview)

SS = 2   # supersampling factor for shape masks


def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def ramp(hue):
    """5 stops darkest -> white for one hue; stop k sits at mask value k/4."""
    return np.array(vfx.layer_colors('s', [hexrgb(hue) if isinstance(hue, str) else hue]), np.float32) / 255


def colorize(m, hue, hot=1.0):
    """mask -> RGB through the ramp; hot < 1 keeps the white stop for the brightest pixels only."""
    st = ramp(hue); t = np.clip(m * hot, 0, 1) * 4
    i = np.clip(t.astype(int), 0, 3); f = (t - i)[..., None]
    return st[i] * (1 - f) + st[i + 1] * f


_rng = np.random.default_rng(7)
_NOISE = {}


def noise(n, scale=12, seed=0):
    """tileable-ish value noise, 2 octaves, 0..1"""
    key = (n, scale, seed)
    if key not in _NOISE:
        r = np.random.default_rng(seed)
        acc = np.zeros((n, n), np.float32)
        for o, w in ((scale, .65), (scale * 2.5, .35)):
            k = max(2, int(n / o))
            g = Image.fromarray((r.random((k, k)) * 255).astype(np.uint8)).resize((n, n), Image.BICUBIC)
            acc += w * np.asarray(g, np.float32) / 255
        _NOISE[key] = acc
    return _NOISE[key]


class Mask:
    """PIL canvas at SS x for one effect box of size n px; .get() returns a float mask n x n."""
    def __init__(self, n):
        self.n = n; self.im = Image.new('L', (n * SS, n * SS)); self.d = ImageDraw.Draw(self.im)

    def P(self, x, y): return ((self.n / 2 + x) * SS, (self.n / 2 + y) * SS)

    def ell(self, x, y, rx, ry, v=255, w=0):
        b = [*self.P(x - rx, y - ry), *self.P(x + rx, y + ry)]
        if w: self.d.ellipse(b, outline=v, width=max(1, int(w * SS)))
        else: self.d.ellipse(b, fill=v)

    def poly(self, pts, v=255): self.d.polygon([self.P(x, y) for x, y in pts], fill=v)

    def line(self, pts, v=255, w=2): self.d.line([self.P(x, y) for x, y in pts], fill=v, width=max(1, int(w * SS)), joint='curve')

    def arc(self, x, y, rx, ry, a0, a1, v=255, w=2):
        self.d.arc([*self.P(x - rx, y - ry), *self.P(x + rx, y + ry)], a0, a1, fill=v, width=max(1, int(w * SS)))

    def get(self, blur=0):
        im = self.im.filter(ImageFilter.GaussianBlur(blur * SS)) if blur else self.im
        return np.asarray(im.resize((self.n, self.n), Image.LANCZOS), np.float32) / 255


def blur(m, r):
    if r <= 0: return m
    im = Image.fromarray(np.clip(m * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255


class Canvas:
    def __init__(self, w, h, bg='#0d1f2d'):
        y = np.linspace(0, 1, h)[:, None, None]
        top, bot = np.array(hexrgb(bg), np.float32) / 255, np.array(hexrgb('#0a1822'), np.float32) / 255
        self.px = np.broadcast_to(top * (1 - y) + bot * y, (h, w, 3)).copy(); self.w, self.h = w, h

    def _slice(self, cx, cy, n):
        x0, y0 = int(cx - n // 2), int(cy - n // 2)
        sx0, sy0 = max(0, -x0), max(0, -y0)
        x1, y1 = min(self.w, x0 + n), min(self.h, y0 + n)
        return (slice(max(0, y0), y1), slice(max(0, x0), x1)), (slice(sy0, sy0 + y1 - max(0, y0)), slice(sx0, sx0 + x1 - max(0, x0)))

    def add(self, cx, cy, rgb):           # additive light (halos, glow); round falloff window so a halo never shows its square box
        n = rgb.shape[0]; d = np.hypot(*np.meshgrid(np.linspace(-1, 1, n), np.linspace(-1, 1, n))); win = np.clip((1 - d) / .45, 0, 1) ** 2
        a, b = self._slice(cx, cy, n); self.px[a] += (rgb * win[..., None])[b]

    def over(self, cx, cy, rgb, al):      # opaque-ish paint (shapes, clouds, smoke)
        a, b = self._slice(cx, cy, rgb.shape[0]); al = al[..., None][b]; self.px[a] = self.px[a] * (1 - al) + rgb[b] * al

    def save(self, path):
        Image.fromarray((np.clip(self.px, 0, 1) * 255 + .5).astype(np.uint8)).save(path)


def glow_fx(cv, cx, cy, m, hue, halo=0.6, halo_r=None, tex=0.25, hot=1.0, seed=0, core=0.0):
    """Standard stylized effect: textured mask coloured by ramp, painted over, plus a big same-hue halo added underneath."""
    n0 = m.shape[0]; p = n0 // 2; m = np.pad(m, p); n = m.shape[0]   # pad so the halo blur has room past the shape box
    if tex: m = m * (1 - tex + tex * noise(n, 10, seed))
    st = ramp(hue)
    hr = halo_r if halo_r is not None else n0 * 0.13   # ref halos reach ~1.5x the shape
    h = blur(m, hr)
    h = h / max(h.max(), 1e-3)
    cv.add(cx, cy, st[2] * (h * halo * 1.25)[..., None])
    if core:
        c = blur(m, n0 * .02) ** 3 * core
        m = np.clip(m + c, 0, 1)
    al = np.clip(m * 2.2, 0, 1)
    cv.over(cx, cy, colorize(m, hue, hot), al)
