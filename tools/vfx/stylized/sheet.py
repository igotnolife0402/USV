"""Stylized VFX sheet (owner reference 2026-11-24): 7 rows, ~70 effects at the reference layout; hues sampled once from the reference.
  python3 sheet.py OUT.png [REF.jpg -> also writes OUT-compare.png and prints per-cell hue/sat match]"""
import sys, colorsys, numpy as np
from PIL import Image
from style import Canvas
import shapes as S

# (name, x, y, box) measured from ref2.jpeg (1600x900)
CELLS = [
 ('clouds',70,120,150),('smokering',212,112,140),('darksmoke',350,105,150),('bubbles',470,125,120),('tornado_gold',620,115,190),('tornado_ice',810,115,190),
 ('fireball1',1000,145,110),('fireball2',1120,140,110),('lava',1370,165,300),
 ('sparkbox',70,265,150),('goldring',212,265,150),('portal_purple',340,280,140),('portal_green',480,280,140),('portal_blue',620,285,140),('portal_green2',760,270,140),('clover',895,260,110),
 ('glint_cyan',1105,375,330),('glint_magenta',1285,375,330),('glint_green',1445,375,330),
 ('hearts',80,425,110),('bolts',205,425,110),('arrows',340,430,110),('notes',480,430,110),('skulls',605,420,110),('skullcloud',755,420,130),('wind',880,425,120),
 ('glintw1',75,560,90),('glintw2',205,560,90),('sparkcluster',335,565,110),('burstw',485,565,90),('ring_purple',615,565,130),('glint_purple',755,560,130),('glintring_orange',893,568,110),
 ('sparks',1020,565,90),('runering_orange',1155,565,100),('slashglint',1280,570,120),('bigstar',1410,565,150),('crosshair',1535,565,90),
 ('swirl_magenta',75,705,150),('swirl_goldgreen',210,705,150),('swirl_gold',345,700,150),('swirl_blue',480,705,150),
 ('orb_cyan',620,700,110),('orb_red',755,700,110),('orb_green',880,700,110),('orb_orange',1020,700,110),('orb_red2',1150,700,120),('orb_blue',1280,705,120),('orb_purple',1400,705,120),('orb_gold',1535,700,120),
] + [(f'circle{i}', x, 835, 140) for i, x in enumerate([70,205,345,485,620,760,885,1020,1150,1280,1410,1535])]
HUE = {'clouds': '#7fdbff', 'smokering': '#ffffff', 'darksmoke': '#ffffff', 'bubbles': '#73cdff', 'tornado_gold': '#ffb100', 'tornado_ice': '#78d6ff', 'fireball1': '#ff730c', 'fireball2': '#ff4100', 'lava': '#ff7e22', 'sparkbox': '#ffe027', 'goldring': '#ffba34', 'portal_purple': '#c349ff', 'portal_green': '#1aff58', 'portal_blue': '#139bff', 'portal_green2': '#5dff42', 'clover': '#6eff32', 'glint_cyan': '#2dd6ff', 'glint_magenta': '#bd58ff', 'glint_green': '#4cff67', 'hearts': '#ff2154', 'bolts': '#ffdd36', 'arrows': '#ff2904', 'notes': '#7e11ff', 'skulls': '#00ff11', 'skullcloud': '#da5dff', 'wind': '#75e9ff', 'glintw1': '#ffffff', 'glintw2': '#ffffff', 'sparkcluster': '#ffffff', 'burstw': '#ffffff', 'ring_purple': '#9d07ff', 'glint_purple': '#8b12ff', 'glintring_orange': '#ff9430', 'sparks': '#ffffff', 'runering_orange': '#ff9f2b', 'slashglint': '#ff9524', 'bigstar': '#ffffff', 'crosshair': '#0062ff', 'swirl_magenta': '#f545ff', 'swirl_goldgreen': '#fcff60', 'swirl_gold': '#ffc012', 'swirl_blue': '#009eff', 'orb_cyan': '#0ab0ff', 'orb_red': '#ff1b2c', 'orb_green': '#3fff4a', 'orb_orange': '#ffa032', 'orb_red2': '#ff0f18', 'orb_blue': '#0057ff', 'orb_purple': '#9618ff', 'orb_gold': '#ffad22', 'circle0': '#6bff3d', 'circle1': '#009bff', 'circle2': '#ff880d', 'circle3': '#ff3b02', 'circle4': '#ffad11', 'circle5': '#d737ff', 'circle6': '#00afff', 'circle7': '#6fff32', 'circle8': '#9725ff', 'circle9': '#ff2c41', 'circle10': '#ff9113', 'circle11': '#0097ff'}
KIND = ['star', 'star', 'sun', 'disc', 'rune', 'vortex', 'hexagram', 'shuriken', 'triskelion', 'cross', 'compass', 'hexagram']


def fx(name):
    if name.startswith('circle'): return lambda *a: S.magic_circle(*a, KIND[int(name[6:])])
    if name.startswith('portal'): return S.portal
    if name.startswith('tornado'): return S.tornado
    if name.startswith('fireball'): return S.fireball
    if name.startswith('glint_') and name != 'glint_purple': return S.big_glint
    if name.startswith('swirl'): return S.swirl
    if name.startswith('orb'): return S.orb
    return {'clouds': S.cloud, 'smokering': lambda cv, x, y, n, h, r: S.cloud(cv, x, y, n, h, r, ring_r=n * .27, cnt=12),
            'darksmoke': lambda cv, x, y, n, h, r: S.cloud(cv, x, y, n, h, r, dark=True, cnt=7), 'bubbles': S.bubbles, 'lava': S.lava,
            'sparkbox': S.sparkle_box, 'goldring': S.gold_ring, 'clover': lambda *a: S.icons(*a, 'clover'),
            'hearts': lambda *a: S.icons(*a, 'heart'), 'bolts': lambda *a: S.icons(*a, 'bolt'), 'arrows': lambda *a: S.icons(*a, 'arrow'),
            'notes': lambda *a: S.icons(*a, 'note'), 'skulls': lambda *a: S.icons(*a, 'skull'),
            'skullcloud': lambda cv, x, y, n, h, r: (S.cloud(cv, x, y, n, h, r, cnt=6), S.icons(cv, x, y, n, h, r, 'skull')), 'wind': S.wind,
            'glintw1': S.glint, 'glintw2': lambda cv, x, y, n, h, r: (S.ring(cv, x, y, n, h, r, dots=False), S.glint(cv, x, y, n, h, r, r=n * .3)),
            'sparkcluster': S.cluster, 'burstw': lambda *a: S.cluster(*a, k=2, burst=True), 'ring_purple': S.ring,
            'glint_purple': lambda cv, x, y, n, h, r: S.big_glint(cv, x, y, n, h, r), 'glintring_orange': S.glint_ring, 'sparks': S.sparks,
            'runering_orange': S.rune_ring, 'slashglint': S.slash_glint, 'bigstar': lambda cv, x, y, n, h, r: S.glint(cv, x, y, n, h, r, thin=.2),
            'crosshair': S.crosshair}[name]


def build(out):
    cv = Canvas(1600, 900)
    for i, (name, x, y, n) in enumerate(sorted(CELLS, key=lambda c: -c[3])):   # big halos first so small effects sit on top
        fx(name)(cv, x, y, n, HUE[name], np.random.default_rng(i + 1))
    cv.save(out)


def compare(out, ref):
    a = np.asarray(Image.open(ref).convert('RGB').resize((1600, 900)), np.float32) / 255; b = np.asarray(Image.open(out), np.float32) / 255
    bad = []
    for name, x, y, n in CELLS:
        r = max(20, n // 3); st = []
        for img in (a, b):
            p = img[y - r:y + r, x - r:x + r].reshape(-1, 3); mx, mn = p.max(1), p.min(1); s = (mx - mn) / np.maximum(mx, 1e-3)
            m = (mx > .45) & (s > .35)
            if m.sum() < 10: st.append(None); continue
            c = (p[m] * (s[m] * mx[m])[:, None]).sum(0); st.append((colorsys.rgb_to_hsv(*(c / c.max()))[0] * 360, float(s[mx > .35].mean())))
        if st[0] is None or st[1] is None:
            if (st[0] is None) != (st[1] is None): bad.append(f'{name}: lit {"ours" if st[0] is None else "ref"} only')
            continue
        dh = abs((st[0][0] - st[1][0] + 180) % 360 - 180); ds = abs(st[0][1] - st[1][1])
        if dh >= 20 or ds >= .1: bad.append(f'{name}: dh {dh:.0f} ds {ds:.2f}')
    side = Image.new('RGB', (1600, 1800)); side.paste(Image.open(ref).convert('RGB').resize((1600, 900)), (0, 0)); side.paste(Image.open(out), (0, 900))
    side.resize((800, 900)).save(out.replace('.png', '-compare.png'))
    print(f'{len(CELLS) - len(bad)}/{len(CELLS)} cells match (hue < 20 deg, sat < 0.1)'); [print('  ', b) for b in bad]


if __name__ == '__main__':
    build(sys.argv[1])
    if len(sys.argv) > 2: compare(sys.argv[1], sys.argv[2])
