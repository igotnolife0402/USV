"""Owner 2026-11-24: 'save those as white and remake 200 more vfx in the exact same style, different shapes and unique'.
1) the reference's 62 effects -> one white texture each (white RGB, light as alpha), cut from recolor()'s light by sheet.py CELLS.
2) N new effects: shapes.py families (single + 2-family combos, random params, ref palette hues) drawn on 1600x800 navy sheets
   at the reference's cell scale, then pushed through the SAME recolor() so gradient + pattern match by construction.
   Every new cell is rejected and redrawn (cap 30, least-similar try kept) if its 32x32 light correlates > MAXC with any earlier one.
  python3 batch.py REF.jpg OUTDIR [N]  ->  OUTDIR/ref/*.png, OUTDIR/new/*.png (256 px whites), OUTDIR/new/sheetK-color.png, gates"""
import sys, os
import numpy as np
from PIL import Image
import recolor as R
import shapes as S
from sheet import CELLS
from style import Canvas

CELL, COLS, ROWS, OUT_PX, MAXC = 160, 10, 5, 256, 0.92
HUES = {'cyan': '#2ee6ff', 'blue': '#3d6bff', 'purple': '#9b3dff', 'magenta': '#ff3dd8', 'red': '#ff2f3f', 'orange': '#ff8a1f',
        'gold': '#ffc21f', 'yellow': '#f4ff3d', 'green': '#3dff6b', 'teal': '#1fffc2', 'white': '#ffffff'}
CIRCLES = ['star', 'sun', 'disc', 'rune', 'vortex', 'hexagram', 'shuriken', 'triskelion', 'cross', 'compass']
SINGLE = {'glint': S.big_glint, 'sparkle': S.glint, 'ring': S.ring, 'glintring': S.glint_ring, 'portal': S.portal, 'tornado': S.tornado,
          'orb': S.orb, 'cloud': S.cloud, 'bubbles': S.bubbles, 'fireball': S.fireball, 'lava': S.lava, 'sparkbox': S.sparkle_box,
          'goldring': S.gold_ring, 'wind': S.wind, 'cluster': S.cluster, 'sparks': S.sparks, 'runering': S.rune_ring,
          'slash': S.slash_glint, 'crosshair': S.crosshair}
for a in (2, 3, 4, 5): SINGLE[f'swirl{a}'] = (lambda a: lambda cv, x, y, n, h, r: S.swirl(cv, x, y, n, h, r, arms=a))(a)
for k in CIRCLES: SINGLE['circle-' + k] = (lambda k: lambda *a: S.magic_circle(*a, k))(k)
for k in ('heart', 'bolt', 'arrow', 'note', 'skull', 'clover'): SINGLE['icon-' + k] = (lambda k: lambda *a: S.icons(*a, k))(k)
BACK = ['ring', 'glintring', 'runering', 'orb', 'cloud', 'portal', 'goldring', 'tornado', 'bubbles', 'lava', 'wind', 'swirl4', 'cluster'] + ['circle-' + k for k in CIRCLES[::2]]   # combo underlays
FRONT = ['glint', 'sparkle', 'sparks', 'cluster', 'slash', 'crosshair', 'swirl3', 'fireball'] + ['icon-' + k for k in ('heart', 'bolt', 'skull', 'clover')]


def white(Lc):
    # cells cut from a sheet carry neighbour halo to their border; a radial fade keeps every texture edge at 0 (no square in Roblox)
    n = Lc.shape[0]; d = np.hypot(*np.meshgrid(np.linspace(-1, 1, n), np.linspace(-1, 1, n)))
    Lc = Lc * np.clip((1 - d) / .25, 0, 1) ** 1.5
    g = np.asarray(Image.fromarray((np.clip(Lc, 0, 1) * 255).astype(np.uint8)).resize((OUT_PX, OUT_PX), Image.LANCZOS))
    return Image.fromarray(np.dstack([np.full_like(g, 255)] * 3 + [g]))


def light(px):
    return np.clip((px.max(2) - .19) / .81, 0, 1)


def draw(rng, i):
    """one new cell: alternate single families (all of them, in shuffled order) with 2-family combos"""
    hue = list(HUES)[rng.integers(len(HUES))]
    cv = Canvas(CELL, CELL); c = CELL // 2
    if i % 2 == 0 and rng.random() < .7:
        fam = list(SINGLE)[(i // 2) % len(SINGLE)]
        SINGLE[fam](cv, c, c, int(CELL * rng.uniform(.82, .95)), HUES[hue], rng)
    else:
        b, f = BACK[rng.integers(len(BACK))], FRONT[rng.integers(len(FRONT))]; fam = f'{b}+{f}'
        SINGLE[b](cv, c, c, int(CELL * .92), HUES[hue], rng)
        h2 = HUES[hue] if rng.random() < .6 else HUES[list(HUES)[rng.integers(len(HUES))]]      # 40 %: one accent hue
        SINGLE[f](cv, c, c, int(CELL * rng.uniform(.45, .62)), h2, rng)
    return vary(cv.px, rng), f'{fam}_{hue}'


def vary(px, rng):
    """same family drawn twice is often the same picture (icons, circles ignore rng): rotate, squash and mirror the light so
    every cell is its own shape; the navy background is subtracted first so it never rotates in"""
    bg = Canvas(CELL, CELL).px; d = np.clip(px - bg, 0, None)
    ims = [Image.fromarray((d[..., k] * 255).clip(0, 255).astype(np.uint8)) for k in range(3)]
    ang, sx, sy, fl = rng.uniform(0, 360), rng.uniform(.85, 1.05), rng.uniform(.85, 1.05) if rng.random() < .75 else rng.uniform(.55, .8), rng.random() < .5
    out = []
    for im in ims:
        im = im.rotate(ang, Image.BICUBIC)
        w_, h_ = int(CELL * sx), int(CELL * sy); im = im.resize((w_, h_), Image.LANCZOS)
        can = Image.new('L', (CELL, CELL)); can.paste(im, ((CELL - w_) // 2, (CELL - h_) // 2))
        out.append(np.asarray(can.transpose(Image.FLIP_LEFT_RIGHT) if fl else can, np.float32) / 255)
    return bg + np.stack(out, -1)


def main(ref, out, n=200):
    os.makedirs(out + '/ref', exist_ok=True); os.makedirs(out + '/new', exist_ok=True)
    a = np.asarray(Image.open(ref).convert('RGB'), np.float32) / 255
    _, L, *_ = R.recolor(a)
    for k, (name, x, y, box) in enumerate(CELLS):
        h = box // 2; Lc = np.zeros((box, box), np.float32)
        y0, x0 = max(0, y - h), max(0, x - h); sub = L[y0:y + h, x0:x + h]
        Lc[y0 - (y - h):y0 - (y - h) + sub.shape[0], x0 - (x - h):x0 - (x - h) + sub.shape[1]] = sub
        white(Lc).save(f'{out}/ref/{k:02d}_{name}.png')
    rng = np.random.default_rng(2026); keep, stats = [], dict(made=0, redraws=0, empty=0, max_corr=0.0, sheets=[])
    per = COLS * ROWS
    for s in range((n + per - 1) // per):
        sheet = np.zeros((ROWS * CELL, COLS * CELL, 3), np.float32); names = []
        for j in range(min(per, n - s * per)):
            i = s * per + j
            best = None
            for t in range(30):                                   # keep the least-similar try if none clears MAXC
                px_, name_ = draw(rng, i + t)
                v_ = np.asarray(Image.fromarray((light(px_) * 255).astype(np.uint8)).resize((32, 32)), np.float32).ravel()
                v_ = (v_ - v_.mean()) / (v_.std() + 1e-6)
                c_ = max((float(v_ @ u) / v_.size for u in keep), default=0)
                if best is None or c_ < best[0]: best = (c_, px_, name_, v_)
                if c_ < MAXC: break
                stats['redraws'] += 1
            c, px, name, v = best
            keep.append(v); stats['max_corr'] = max(stats['max_corr'], round(c, 3))
            r_, c_ = divmod(j, COLS); sheet[r_ * CELL:(r_ + 1) * CELL, c_ * CELL:(c_ + 1) * CELL] = px; names.append(name)
        col, Ls, *_ = R.recolor(np.clip(sheet, 0, 1))
        Image.fromarray((col * 255 + .5).astype(np.uint8)).save(f'{out}/new/sheet{s}-color.png')
        stats['sheets'].append(R.gates(np.clip(sheet, 0, 1), col, Ls))
        for j, name in enumerate(names):
            r_, c_ = divmod(j, COLS); Lc = Ls[r_ * CELL:(r_ + 1) * CELL, c_ * CELL:(c_ + 1) * CELL]
            if (Lc > .1).mean() < .02: stats['empty'] += 1
            white(Lc).save(f'{out}/new/{s * per + j:03d}_{name}.png'); stats['made'] += 1
    print(stats)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 200)
