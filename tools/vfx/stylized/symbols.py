"""Owner 2026-11-24: 'you're repeating the same vfx. All should be a different shape, icon, symbol, whatever'.
batch.py reused ~30 shapes.py families, so rotations of the same ring/star read as repeats. This draws N effects whose SHAPES are
all different by construction: every cell is a different symbol glyph (misc symbols, dingbats, arrows, geometric, runes...) from the
fonts on the machine, kept only if it renders (no tofu box), is big enough, and its light correlates < MAXC with every kept one.
Each glyph is lit like the reference (coloured body + white-hot inner core + soft halo + 0-3 small glints), then pushed through
the SAME recolor() (gradient + pattern) as the reference whites.
  python3 symbols.py REF_UNUSED OUTDIR [N]  ->  OUTDIR/NNN_UXXXX_hue.png (256 px whites), OUTDIR/sheetK-color.png, gates"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import recolor as R
from style import blur
import importlib.util
_sp = importlib.util.spec_from_file_location('stylized_batch', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'batch.py'))
B = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(B)      # flipbook/ also has a batch.py on sys.path: load ours by path
white, HUES, CELL, COLS, ROWS = B.white, B.HUES, B.CELL, B.COLS, B.ROWS

MAXC, GLYPH = 0.80, 112
FONTS = ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
         '/usr/share/fonts/truetype/libreoffice/opens___.ttf']
# curated, no political/religious emblems, one recycle, no dice/trigram bars (owner 2026-11-24 saw clip-art: scissors x4, letters, arrows, phones): only magic / emblem / nature / game symbols
SKIP = set(range(0x260E, 0x2613)) | set(range(0x261A, 0x2620)) | set(range(0x2639, 0x263C)) | set(range(0x26A3, 0x26AA)) \
    | set(range(0x2701, 0x2713)) | set(range(0x2776, 0x2794)) | set(range(0x2794, 0x27B0)) | set(range(0x2714, 0x2717)) \
    | set(range(0x2690, 0x269C)) | set(range(0x26C0, 0x26FF)) | set(range(0x274F, 0x2776)) | set(range(0x2626, 0x262E)) | set(range(0x2630, 0x2638)) | set(range(0x2673, 0x267E)) | set(range(0x2680, 0x2690)) | {0x2638, 0x269D} | {0x2328, 0x2397, 0x2603, 0x2615, 0x2616, 0x2617, 0x267F}
RANGES = [(0x2600, 0x26FF), (0x2700, 0x27BF), (0x2B50, 0x2B59), (0x25C6, 0x25CF), (0x2740, 0x274B)]


def glyph_mask(ch, font):
    im = Image.new('L', (CELL * 2, CELL * 2)); ImageDraw.Draw(im).text((CELL, CELL), ch, 255, font=font, anchor='mm')
    bb = im.getbbox()
    if not bb: return None
    g = im.crop(bb); s = GLYPH / max(g.size); g = g.resize((max(1, int(g.size[0] * s)), max(1, int(g.size[1] * s))), Image.LANCZOS)
    out = Image.new('L', (CELL, CELL)); out.paste(g, ((CELL - g.size[0]) // 2, (CELL - g.size[1]) // 2))
    return np.asarray(out, np.float32) / 255


def candidates():
    """every renderable symbol, blocks interleaved so neighbours on a sheet come from different families"""
    fonts = [ImageFont.truetype(f, 200) for f in FONTS if os.path.exists(f)]
    tofu = [glyph_mask('\U000F0000', f) for f in fonts]
    per = []
    for a, b in RANGES:
        lst = []
        for cp in range(a, b + 1):
            if cp in SKIP: continue
            for f, t in zip(fonts, tofu):
                if f.getmask(chr(cp)).getbbox() is None: continue
                m = glyph_mask(chr(cp), f)
                if m is None or (t is not None and np.abs(m - t).mean() < .01): continue
                if not (.06 < (m > .5).mean() < .55): continue          # thin hairlines and solid blocks don't read as effects
                lst.append((cp, m)); break
        per.append(lst)
    syms = []
    while any(per):
        for lst in per:
            if lst: syms.append(lst.pop(0))
    proc = list(procedural())
    for k in range(max(len(syms), len(proc))):          # alternate font symbol / procedural sigil
        if k < len(syms): yield syms[k]
        if k < len(proc): yield proc[k]


def _e(d, c, R, pts, w=0):
    P = [(c + x * R, c + y * R) for x, y in pts]
    (d.line(P + P[:1], fill=255, width=w) if w else d.polygon(P, fill=255))


def _crescent(off):
    def f(d, c, R):
        d.ellipse([c - R, c - R, c + R, c + R], fill=255); o = off * R; d.ellipse([c - R + o, c - R - o * .3, c + R + o, c + R - o * .3], fill=0)
    return f


EMBLEMS = [
    _crescent(.35), _crescent(.6),
    lambda d, c, R: _e(d, c, R, [(0, -1), (.55, .2), (.35, .75), (0, .95), (-.35, .75), (-.55, .2)]),                        # droplet
    lambda d, c, R: _e(d, c, R, [(0, -1), (.3, -.35), (.6, -.55), (.55, .1), (.75, .45), (0, 1), (-.75, .45), (-.55, .1), (-.6, -.55), (-.3, -.35)]),  # flame
    lambda d, c, R: (_e(d, c, R, [(-1, 0), (-.5, -.5), (0, -.62), (.5, -.5), (1, 0), (.5, .5), (0, .62), (-.5, .5)], 6), d.ellipse([c - R * .3, c - R * .3, c + R * .3, c + R * .3], fill=255)),  # eye
    lambda d, c, R: (_e(d, c, R, [(-.7, -.35), (-.35, -.75), (.35, -.75), (.7, -.35), (0, .95)], 6), _e(d, c, R, [(-.7, -.35), (.7, -.35), (0, .95), (-.35, -.35), (0, -.75), (.35, -.35)], 4)),  # gem
    lambda d, c, R: _e(d, c, R, [(-.75, -.8), (0, -.95), (.75, -.8), (.7, .1), (0, .95), (-.7, .1)], 7),                   # shield
    lambda d, c, R: (_e(d, c, R, [(-.08, -1), (.08, -1), (.08, .35), (-.08, .35)]), _e(d, c, R, [(-.45, .35), (.45, .35), (.45, .47), (-.45, .47)]), _e(d, c, R, [(-.06, .47), (.06, .47), (.06, .85), (-.06, .85)]), d.ellipse([c - R * .12, c + R * .82, c + R * .12, c + R * 1.0], fill=255)),  # sword
    lambda d, c, R: (d.ellipse([c + R * .25, c - R * .65, c + R * .95, c + R * .05], fill=255), _e(d, c, R, [(.35, -.55), (-1, .95), (.85, -.05)])),  # comet
    lambda d, c, R: _e(d, c, R, [(-.9, .6), (-.9, -.4), (-.45, .05), (0, -.75), (.45, .05), (.9, -.4), (.9, .6)]),           # crown
    lambda d, c, R: (d.ellipse([c - R * .45, c - R * .45, c + R * .45, c + R * .45], fill=255), d.ellipse([c - R, c - R * .3, c + R, c + R * .3], outline=255, width=6)),  # planet
    lambda d, c, R: _e(d, c, R, [(-.6, -.95), (.6, -.95), (.08, 0), (.6, .95), (-.6, .95), (-.08, 0)]),                     # hourglass
    lambda d, c, R: _e(d, c, R, [(.2, -1), (-.55, .1), (-.05, .1), (-.3, 1), (.6, -.2), (.1, -.2), (.45, -1)]),             # bolt
    lambda d, c, R: _e(d, c, R, [(-1, -.2), (-.55, -.7), (-.1, -.45), (.3, -.9), (.6, -.35), (1, -.5), (.75, .25), (.1, .8), (-.4, .35)]),  # wing
    lambda d, c, R: [d.ellipse([c + R * x - R * .3, c + R * y - R * .3, c + R * x + R * .3, c + R * y + R * .3], outline=255, width=6) for x, y in ((0, -.55), (-.55, .4), (.55, .4))],  # trinity rings
    lambda d, c, R: (d.ellipse([c - R, c - R, c + R, c + R], outline=255, width=5), _e(d, c, R, [(0, -.95), (.82, .48), (-.82, .48)], 5)),  # sigil circle
    lambda d, c, R: (d.ellipse([c - R * .9, c - R * .9, c - R * .2, c - R * .2], outline=255, width=7), _e(d, c, R, [(-.35, -.4), (-.25, -.5), (.9, .65), (.8, .75)]), _e(d, c, R, [(.35, .25), (.55, .05), (.65, .15), (.45, .35)]), _e(d, c, R, [(.6, .5), (.8, .3), (.9, .4), (.7, .6)])),  # key
    lambda d, c, R: (_e(d, c, R, [(-.18, -1), (.18, -1), (.18, -.5), (.7, .1), (.6, .9), (-.6, .9), (-.7, .1), (-.18, -.5)], 6), _e(d, c, R, [(-.62, .25), (.62, .25), (.55, .82), (-.55, .82)])),  # potion
    lambda d, c, R: (_e(d, c, R, [(.75, -.95), (.35, -.4), (0, .2), (-.5, .7), (-.2, .1), (.1, -.5)]), d.line([(c - R * .85, c + R), (c + R * .7, c - R * .8)], fill=255, width=4)),  # feather
    lambda d, c, R: (_e(d, c, R, [(0, -1), (.5, -.55), (.6, .1), (.25, .65), (0, .8), (-.25, .65), (-.6, .1), (-.5, -.55)], 6), d.line([(c, c - R * .9), (c, c + R)], fill=255, width=4)),  # leaf
    lambda d, c, R: (d.pieslice([c - R, c - R * .8, c + R, c + R * .6], 180, 360, fill=255), _e(d, c, R, [(-.25, -.1), (.25, -.1), (.3, .95), (-.3, .95)])),  # mushroom
    lambda d, c, R: [d.ellipse([c + R * (x - r), c + R * (y - r), c + R * (x + r), c + R * (y + r)], fill=255) for x, y, r in ((0, .35, .45), (-.65, -.2, .2), (-.25, -.65, .2), (.25, -.65, .2), (.65, -.2, .2))],  # paw
    lambda d, c, R: [_e(d, c, R, [(-.75 + o, -.95), (-.6 + o, -.95), (.15 + o, .95), (0 + o, .95)]) for o in (-.15, .35, .85)],  # claw marks
    lambda d, c, R: (_e(d, c, R, [(-.7, -.1), (.7, -.1), (.7, .1), (-.7, .1)]), [d.ellipse([c + R * x - R * .2, c + R * y - R * .2, c + R * x + R * .2, c + R * y + R * .2], fill=255) for x in (-.75, .75) for y in (-.15, .15)]),  # bone
    lambda d, c, R: _e(d, c, R, [(0, -1), (.2, -.2), (1, 0), (.2, .2), (0, 1), (-.2, .2), (-1, 0), (-.2, -.2)]) if False else _e(d, c, R, [(.1, -1), (.25, -.25), (1, -.1), (.25, .25), (-.1, 1), (-.25, .25), (-1, .1), (-.25, -.25)]),  # shuriken
    lambda d, c, R: (d.ellipse([c - R, c - R * .55, c + R, c + R * .55], outline=255, width=6), d.ellipse([c - R * .12, c - R * .5, c + R * .12, c + R * .5], fill=255)),  # slit eye
    lambda d, c, R: d.line([(c + R * x, c + R * (.3 * np.sin(x * 6) - .2 * x)) for x in np.linspace(-1, 1, 60)] + [(c + R, c + R * .6), (c - R, c + R * .6)], fill=255, width=7),  # wave
    lambda d, c, R: (_e(d, c, R, [(0, -1), (.95, .8), (-.95, .8)], 6), d.ellipse([c - R * .35, c - R * .05, c + R * .35, c + R * .45], outline=255, width=5), d.ellipse([c - R * .1, c + R * .1, c + R * .1, c + R * .3], fill=255)),  # pyramid eye
    lambda d, c, R: (_e(d, c, R, [(0, -1), (.45, -.55), (.45, .55), (0, 1), (-.45, .55), (-.45, -.55)], 6), d.line([(c, c - R), (c, c + R)], fill=255, width=3)),  # crystal
    lambda d, c, R: (_crescent(.45)(d, c - R * .3, R * .7), _crescent(.45)(d, c + R * .3, R * .7)),  # twin moons
    lambda d, c, R: (_e(d, c, R, [(-.06, -1), (.06, -1), (.06, 1), (-.06, 1)]), d.pieslice([c - R * .1, c - R * .95, c + R * .9, c + R * .05], 270, 90, fill=255)),  # axe
    lambda d, c, R: [_e(d, c, R, [(x - .2, -.8), (x + .2, -.8), (x, .9)]) for x in (-.4, .4)],  # fangs
]


def procedural():
    """sigils no font has: superformula blooms (filled or hollow) and rose curves, each parameter set a different silhouette"""
    t = np.linspace(0, 2 * np.pi * 7, 6000); c = CELL / 2
    sets = [(m, n1, n2, n3) for m in (3, 4, 5, 6, 7, 8, 10, 12, 16) for n1, n2, n3 in ((.3, .3, .3), (1, 1, 1), (2, 7, 7), (.5, 1.7, 1.7), (8, 1, 8), (1.5, 4, 1))]
    for i, (m, n1, n2, n3) in enumerate(sets):
        th = np.linspace(0, 2 * np.pi, 1500)
        r = (np.abs(np.cos(m * th / 4)) ** n2 + np.abs(np.sin(m * th / 4)) ** n3) ** (-1 / n1); r = r / r.max() * GLYPH / 2
        im = Image.new('L', (CELL, CELL)); pts = list(zip(c + r * np.cos(th), c + r * np.sin(th)))
        d = ImageDraw.Draw(im)
        if i % 2: d.polygon(pts, fill=255)
        else: d.line(pts + pts[:1], fill=255, width=7)
        yield (0xE000 + i, np.asarray(im, np.float32) / 255)
    for i, (a, b) in enumerate([(1, 2), (2, 3), (3, 4), (1, 3)]):    # lissajous knots
        r = GLYPH / 2; th = np.linspace(0, 2 * np.pi, 3000)
        im = Image.new('L', (CELL, CELL)); ImageDraw.Draw(im).line(list(zip(c + r * np.sin(a * th + np.pi / 2), c + r * np.sin(b * th))), fill=255, width=5)
        yield (0xE200 + i, np.asarray(im, np.float32) / 255)
    for i, (k, ir) in enumerate([(k, ir) for k in (5, 8, 12, 16) for ir in (.22, .6)]):                            # star bursts
        th = np.linspace(0, 2 * np.pi, 2 * k, endpoint=False); r = np.where(np.arange(2 * k) % 2, ir, 1.0) * GLYPH / 2
        im = Image.new('L', (CELL, CELL)); pts = list(zip(c + r * np.cos(th), c + r * np.sin(th))); d = ImageDraw.Draw(im)
        if i % 3 == 1: d.line(pts + pts[:1], fill=255, width=6)
        else: d.polygon(pts, fill=255)
        yield (0xE400 + i, np.asarray(im, np.float32) / 255)
    for i, f in enumerate(EMBLEMS):                                   # hand-built game emblems fonts lack
        im = Image.new('L', (CELL, CELL)); f(ImageDraw.Draw(im), c, GLYPH / 2); yield (0xE500 + i, np.asarray(im, np.float32) / 255)
    for i, (arms, turns) in enumerate([(1, 3), (2, 2), (3, 1.2), (4, .8), (6, .6), (5, 1.5)]):                          # spirals
        im = Image.new('L', (CELL, CELL)); d = ImageDraw.Draw(im)
        for a in range(arms):
            th = np.linspace(0, 2 * np.pi * turns, 800); r = th / th.max() * GLYPH / 2; ph = 2 * np.pi * a / arms
            d.line(list(zip(c + r * np.cos(th + ph), c + r * np.sin(th + ph))), fill=255, width=6)
        yield (0xE300 + i, np.asarray(im, np.float32) / 255)
    for i, (p, q) in enumerate([(2, 1), (3, 1), (5, 1), (4, 1), (7, 1), (3, 2), (5, 2), (7, 2), (5, 3), (7, 3), (8, 3), (7, 4), (9, 4), (6, 5), (8, 5), (9, 2)]):
        k = p / q; r = np.cos(k * t[: int(6000 * q / 7) + 2] if q < 7 else t) * GLYPH / 2; tt = t[:len(r)]
        im = Image.new('L', (CELL, CELL)); ImageDraw.Draw(im).line(list(zip(c + r * np.cos(tt), c + r * np.sin(tt))), fill=255, width=5)
        yield (0xE100 + i, np.asarray(im, np.float32) / 255)


def light(m, rng):
    """reference lighting from one glyph: hue body, white core where the stroke is thick, halo, a few glints"""
    core = np.clip(blur(m, 2.5) - .55, 0, 1) / .45
    halo = blur(m, 6) * .7 + blur(m, 16) * .6 + blur(m, 30) * .35
    dots = np.zeros_like(m)
    for _ in range(rng.integers(0, 4)):
        y, x = rng.integers(15, CELL - 15, 2); r = rng.uniform(3, 7)
        yy, xx = np.mgrid[0:CELL, 0:CELL]; d = np.abs(xx - x) * np.abs(yy - y)
        dots += np.clip(1 - np.hypot(xx - x, yy - y) / r, 0, 1) ** 2 + np.clip(1 - d / (r * .6), 0, 1) * np.clip(1 - np.hypot(xx - x, yy - y) / (r * 2.5), 0, 1)
    body = np.clip(m * .85 + halo + dots * .8, 0, 1.3)
    return body, np.clip(core * .9 + dots * .5, 0, 1)


def main(out, n=200):
    os.makedirs(out, exist_ok=True)
    rng = np.random.default_rng(7); keep, cells = [], []
    for cp, m in candidates():
        v = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((32, 32)), np.float32).ravel(); v = (v - v.mean()) / (v.std() + 1e-6)
        if keep and max(float(v @ u) / v.size for u in keep) >= MAXC: continue
        keep.append(v); cells.append((cp, m))
        if len(cells) == n: break
    stats = dict(made=0, candidates_short=n - len(cells), max_corr=0.0, empty=0, sheets=[])
    K = np.array(keep); C = K @ K.T / K.shape[1]; np.fill_diagonal(C, 0); stats['max_corr'] = round(float(C.max()), 3)
    per = COLS * ROWS; names = list(HUES)
    for s in range((len(cells) + per - 1) // per):
        sheet = np.zeros((ROWS * CELL, COLS * CELL, 3), np.float32) + np.array([.05, .12, .18], np.float32); tags = []
        for j, (cp, m) in enumerate(cells[s * per:(s + 1) * per]):
            hue = names[(s * per + j) * 7 % len(names)]
            h = np.array([int(HUES[hue][k:k + 2], 16) for k in (1, 3, 5)], np.float32) / 255
            body, core = light(m, rng)
            px = np.clip(body[..., None] * h + core[..., None] * (1 - h), 0, 1)
            r_, c_ = divmod(j, COLS); sheet[r_ * CELL:(r_ + 1) * CELL, c_ * CELL:(c_ + 1) * CELL] = np.maximum(sheet[r_ * CELL:(r_ + 1) * CELL, c_ * CELL:(c_ + 1) * CELL], px)
            tags.append(f'U{cp:04X}_{hue}')
        col, Ls, *_ = R.recolor(sheet)
        Image.fromarray((col * 255 + .5).astype(np.uint8)).save(f'{out}/sheet{s}-color.png')
        stats['sheets'].append(R.gates(sheet, col, Ls))
        for j, tag in enumerate(tags):
            r_, c_ = divmod(j, COLS); Lc = Ls[r_ * CELL:(r_ + 1) * CELL, c_ * CELL:(c_ + 1) * CELL]
            if (Lc > .1).mean() < .02: stats['empty'] += 1
            white(Lc).save(f'{out}/{s * per + j:03d}_{tag}.png'); stats['made'] += 1
    print(stats)


if __name__ == '__main__':
    main(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 200)
