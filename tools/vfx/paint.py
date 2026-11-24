"""Paint a white vfx/ sheet at use time (never stored back in vfx/: the library stays white). Rules: vfx/README.md.
Gradient map: each pixel's light (alpha) picks a colour on the ramp, so the bright core stays white-hot and the faint edges
take the deepest hue. Optional texture overlay breaks up flat areas (noise, cells, streaks), tiled across every frame.
  python3 tools/vfx/paint.py vfx/sheets/<slug>.png OUT.png --ramp fire [--tex noise|cells|streaks] [--tex-amt .35] [--grid 8]
  --ramp: a preset name or hex stops low->high light, e.g. "#3a0a5e,#9b3dff,#e9d6ff,#ffffff" """
import sys, argparse
import numpy as np
from PIL import Image

RAMPS = {   # edge (faint) -> core (bright); last stop near white = white-hot core
    'fire': '#7a1010,#ff4a12,#ffa21f,#ffe7a0,#ffffff', 'ice': '#123a8a,#2f8cff,#7fd8ff,#dff8ff,#ffffff',
    'electric': '#3a1a9e,#6a5cff,#6ac8ff,#e0f6ff,#ffffff', 'poison': '#1f4a12,#3fa22a,#9be04a,#e6ffc0,#ffffff',
    'holy': '#8a5a00,#ffb21f,#ffe066,#fff8d6,#ffffff', 'void': '#12001f,#3a0a5e,#7a2fd0,#c79bff,#f2e6ff',
    'blood': '#2a0006,#7a0010,#c41a22,#ff6a5a,#ffd6d0', 'wind': '#5f8a96,#9fd2d8,#d6f2f0,#f4fffd,#ffffff',
}


def ramp(spec, n=256):
    hx = [h.strip().lstrip('#') for h in RAMPS.get(spec, spec).split(',')]
    c = np.array([[int(h[i:i + 2], 16) for i in (0, 2, 4)] for h in hx], np.float32) / 255
    x = np.linspace(0, 1, len(c)); t = np.linspace(0, 1, n)
    return np.stack([np.interp(t, x, c[:, k]) for k in range(3)], 1)


def texture(kind, size, rng):
    if kind == 'noise':   # 3-octave value noise
        out = np.zeros((size, size), np.float32)
        for o, w in ((8, .5), (16, .3), (32, .2)):
            g = rng.random((o, o)).astype(np.float32); out += w * np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC), np.float32) / 255
        return out
    if kind == 'cells':   # Worley-style cells: bright rims
        p = rng.random((24, 2)) * size; yy, xx = np.mgrid[:size, :size]
        d = np.sort(np.stack([np.hypot(xx - a, yy - b) for a, b in p]), 0); return np.clip((d[1] - d[0]) / (size / 12), 0, 1)
    if kind == 'streaks':  # radial-ish speed streaks
        g = rng.random((size, 4)).astype(np.float32); return np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC), np.float32) / 255
    raise SystemExit('tex must be noise|cells|streaks')


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--ramp', default='fire')
    ap.add_argument('--tex'); ap.add_argument('--tex-amt', type=float, default=.35); ap.add_argument('--grid', type=int, default=1); ap.add_argument('--seed', type=int, default=1)
    a = ap.parse_args()
    im = Image.open(a.src).convert('RGBA'); L = np.asarray(im, np.float32)[..., 3] / 255
    if a.tex:
        cell = L.shape[0] // a.grid; t = texture(a.tex, cell, np.random.default_rng(a.seed))
        t = np.tile(t, (a.grid, a.grid))[:L.shape[0], :L.shape[1]]
        L = L * (1 - a.tex_amt + a.tex_amt * 2 * t).clip(0, 1.4); L = L.clip(0, 1)   # breaks flat areas, keeps the silhouette
    lut = ramp(a.ramp); rgb = lut[(L * 255).astype(int)]
    alpha = np.clip(L * 1.15, 0, 1)
    Image.fromarray((np.dstack([rgb, alpha]) * 255 + .5).astype(np.uint8), 'RGBA').save(a.out)
    print({'out': a.out, 'ramp': a.ramp, 'tex': a.tex})


if __name__ == '__main__':
    main()
