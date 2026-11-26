"""Stylized VFX shapes (owner reference sheet 2026-11-24). Each fx(cv, x, y, n, hue, rng) draws one effect centred at x, y in an n px box."""
import math
import numpy as np
from PIL import Image
from style import Mask, glow_fx, colorize, blur, ramp, noise, hexrgb


def star_pts(r, thin, k=4, rot=0.0, r2=None):
    pts = []
    for i in range(2 * k):
        a = rot + math.pi * i / k - math.pi / 2
        rr = r if i % 2 == 0 else (r2 if r2 is not None else r * thin)
        pts.append((rr * math.cos(a), rr * math.sin(a)))
    return pts


def squash(m, sy):
    """flatten a top-down mask into a ground ellipse (magic circles, portals)"""
    n = m.shape[0]; h = max(2, int(n * sy))
    s = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((n, h), Image.LANCZOS), np.float32) / 255
    out = np.zeros_like(m); y0 = (n - h) // 2; out[y0:y0 + h] = s; return out


def glint(cv, x, y, n, hue, rng, r=None, halo=.7, hr=None, thin=.13):
    r = r or n * .42; M = Mask(n)
    M.poly(star_pts(r, thin)); M.poly(star_pts(r * .45, .2, rot=math.pi / 4), 150)
    m = np.clip(M.get(.6) + Mask_disc(n, r * .16, 1.0), 0, 1)
    glow_fx(cv, x, y, m, hue, halo=halo, halo_r=hr or n * .12, tex=0, core=.8)


def Mask_disc(n, r, v=1.0, blur_r=None):
    M = Mask(n); M.ell(0, 0, r, r, int(255 * v)); return M.get(blur_r if blur_r is not None else r * .5)


def big_glint(cv, x, y, n, hue, rng):
    h = Mask_disc(n, n * .26, 1, n * .16)           # the huge soft bloom of the big star glints
    cv.add(x, y, ramp(hue)[2] * (h / h.max() * .55)[..., None])
    glint(cv, x, y, n, hue, rng, r=n * .2, halo=.5, hr=n * .05, thin=.11)


def ring(cv, x, y, n, hue, rng, dots=True):
    M = Mask(n); r = n * .2; M.ell(0, 0, r, r, 255, w=n * .025)
    if dots:
        for _ in range(14):
            a, d = rng.uniform(0, 6.28), rng.uniform(r * 1.2, n * .42); s = rng.uniform(1, 2.2)
            M.ell(d * math.cos(a), d * math.sin(a), s, s, 200)
    h = Mask_disc(n, n * .36, 1, n * .1); cv.add(x, y, ramp(hue)[1] * (h / h.max() * .45)[..., None])
    glow_fx(cv, x, y, M.get(.4), hue, halo=.5, tex=0)


def glint_ring(cv, x, y, n, hue, rng):
    M = Mask(n); r = n * .32; M.ell(0, 0, r, r, 120); M.ell(0, 0, r, r, 255, w=n * .05)
    glow_fx(cv, x, y, M.get(.8), hue, halo=.6, tex=.2, seed=3)
    glint(cv, x, y, n, '#fff6d0', rng, r=n * .3, halo=.3)


def portal(cv, x, y, n, hue, rng, h=.32):
    """cylinder portal: glowing ground ring + light column fading upward"""
    M = Mask(n); rx, ry = n * .4, n * .13; yb = n * .1
    for i in range(10):
        t = i / 9; M.ell(0, yb - t * n * h, rx, ry, int(170 * (1 - t) ** 1.6), w=0)
    M.ell(0, yb, rx, ry, 255, w=n * .045)
    m = M.get(1.0)
    for _ in range(8):   # sparkles rising
        sx, sy = rng.uniform(-rx, rx), rng.uniform(-n * .35, 0)
        D = Mask(n); D.poly([(sx + p[0], sy + p[1]) for p in star_pts(3.5, .2)]); m = np.maximum(m, D.get())
    glow_fx(cv, x, y, m, hue, halo=.6, tex=.25, seed=int(rng.integers(99)))


def tornado(cv, x, y, n, hue, rng):
    M = Mask(n)
    for i in range(18):
        t = i / 17; yy = -n * .38 + t * n * .72; rx = n * .36 * (1 - t) ** 1.15 + n * .03
        sx = math.sin(t * 5) * n * .03
        M.ell(sx, yy, rx, rx * .26, int(255 * (.55 + .45 * (1 - t))), w=n * (.022 - .01 * t))
    glow_fx(cv, x, y, M.get(.5), hue, halo=.55, tex=.2, seed=5)


def swirl(cv, x, y, n, hue, rng, arms=3):
    M = Mask(n)
    for a0 in range(arms):
        pts = [((n * .38) * (k / 60) ** .8 * math.cos(a0 * 2 * math.pi / arms + k * .12),
                (n * .38) * (k / 60) ** .8 * math.sin(a0 * 2 * math.pi / arms + k * .12)) for k in range(4, 61)]
        for w, v in ((n * .09, 120), (n * .035, 255)): M.line(pts, v, w)
    M.ell(0, 0, n * .07, n * .07, 255, w=n * .02)
    h = Mask_disc(n, n * .38, 1, n * .08); cv.add(x, y, ramp(hue)[1] * (h / h.max() * .5)[..., None])
    glow_fx(cv, x, y, M.get(1.2), hue, halo=.5, tex=.35, seed=11)


def lightning(M, rng, r0, r1, k=6, w=1.6, v=255):
    a = rng.uniform(0, 6.28); pts = []
    for i in range(k):
        rr = rng.uniform(r0, r1); a += rng.uniform(.25, .6); pts.append((rr * math.cos(a), rr * math.sin(a)))
    M.line(pts, v, w)


def orb(cv, x, y, n, hue, rng):
    M = Mask(n)
    for _ in range(5): lightning(M, rng, n * .1, n * .34, w=n * .022)
    m = np.maximum(M.get(.3), Mask_disc(n, n * .12, 1, n * .06) / .6)
    glow_fx(cv, x, y, np.clip(m, 0, 1), hue, halo=.75, halo_r=n * .1, tex=0, core=1)


def magic_circle(cv, x, y, n, hue, rng, kind):
    M = Mask(n); R = n * .44
    M.ell(0, 0, R, R, 255, w=n * .035); M.ell(0, 0, R * .78, R * .78, 200, w=n * .015)
    if kind == 'star': M.poly(star_pts(R * .62, .42, 5))
    elif kind == 'hexagram':
        for rot in (0, math.pi):
            p = [(R * .7 * math.cos(rot + math.pi / 2 + i * 2 * math.pi / 3), R * .7 * math.sin(rot + math.pi / 2 + i * 2 * math.pi / 3)) for i in range(3)]
            M.line(p + p[:1], 255, n * .02)
    elif kind == 'sun':
        for i in range(12): a = i * math.pi / 6; M.line([(0, 0), (R * .75 * math.cos(a), R * .75 * math.sin(a))], 230, n * .04)
        M.ell(0, 0, R * .2, R * .2, 255)
    elif kind == 'disc': M.ell(0, 0, R * .78, R * .78, 210); M.ell(0, 0, R * .4, R * .4, 255)
    elif kind == 'rune':
        for i in range(16): a = i * math.pi / 8; M.ell(R * .89 * math.cos(a), R * .89 * math.sin(a), 2, 2, 255)
        M.poly(star_pts(R * .4, .3)); M.ell(0, 0, R * .6, R * .6, 90)
    elif kind == 'vortex':
        for i in range(4): M.arc(0, 0, R * .6, R * .6, i * 90, i * 90 + 60, 255, n * .07)
        M.ell(0, 0, R * .3, R * .3, 0); M.ell(0, 0, R * .3, R * .3, 255, w=n * .03)
    elif kind in ('shuriken', 'star4'):
        M.poly(star_pts(R * .7, .3, 4, rot=math.pi / 8))
        for i in range(4): M.arc(0, 0, R * 1.05, R * 1.05, i * 90, i * 90 + 40, 255, n * .06)
    elif kind == 'triskelion':
        for i in range(3):
            a = i * 2 * math.pi / 3; M.arc(R * .25 * math.cos(a), R * .25 * math.sin(a), R * .4, R * .4, math.degrees(a), math.degrees(a) + 150, 255, n * .06)
    elif kind == 'cross':
        for i in range(4):
            a = i * math.pi / 2 + math.pi / 4; M.ell(R * .3 * math.cos(a), R * .3 * math.sin(a), R * .22, R * .22, 255, w=n * .04)
    elif kind == 'compass':
        M.poly(star_pts(R * .7, .18)); M.poly(star_pts(R * .4, .2, rot=math.pi / 4), 180)
    m = squash(M.get(.4), .62)
    glow_fx(cv, x, y, m, hue, halo=.55, halo_r=n * .06, tex=.2, seed=17)


def icons(cv, x, y, n, hue, rng, kind):
    pool = Mask_disc(n, n * .3, 1, n * .1); pool = squash(pool, .5); pool = np.roll(pool, int(n * .18), 0)
    cv.add(x, y, ramp(hue)[1] * (pool / max(pool.max(), 1e-3) * .55)[..., None])
    M = Mask(n); spots = [(-.2, -.05, 1), (.12, -.18, .8), (.22, .02, .9), (-.02, .12, 1.1), (-.28, .2, .7)]
    for sx, sy, s in spots:
        cx, cy, k = sx * n, sy * n, n * .07 * s
        if kind == 'heart': M.ell(cx - k * .5, cy - k * .3, k * .55, k * .55); M.ell(cx + k * .5, cy - k * .3, k * .55, k * .55); M.poly([(cx - k * 1.05, cy - k * .1), (cx + k * 1.05, cy - k * .1), (cx, cy + k * 1.1)])
        elif kind == 'bolt': M.poly([(cx + k * .3, cy - k * 1.2), (cx - k * .6, cy + k * .1), (cx, cy + k * .1), (cx - k * .3, cy + k * 1.2), (cx + k * .6, cy - k * .2), (cx, cy - k * .2)])
        elif kind == 'arrow': M.poly([(cx, cy - k * 1.1), (cx - k * .8, cy), (cx - k * .3, cy), (cx - k * .3, cy + k), (cx + k * .3, cy + k), (cx + k * .3, cy), (cx + k * .8, cy)])
        elif kind == 'note': M.ell(cx - k * .4, cy + k * .6, k * .45, k * .35); M.line([(cx, cy + k * .6), (cx, cy - k), (cx + k * .7, cy - k * .5)], 255, k * .25)
        elif kind == 'skull':
            M.ell(cx, cy - k * .2, k * .8, k * .75); M.poly([(cx - k * .45, cy + k * .3), (cx + k * .45, cy + k * .3), (cx + k * .4, cy + k * .85), (cx - k * .4, cy + k * .85)])
            M.ell(cx - k * .32, cy - k * .15, k * .2, k * .22, 0); M.ell(cx + k * .32, cy - k * .15, k * .2, k * .22, 0)
        elif kind == 'clover':
            for a in range(4): M.ell(cx + k * .5 * math.cos(a * 1.57), cy + k * .5 * math.sin(a * 1.57), k * .45, k * .45)
    glow_fx(cv, x, y, M.get(.2), hue, halo=.45, tex=.15, hot=.75)


def puffs(n, rng, cnt, spread, rmin, rmax, ring_r=0):
    M = Mask(n); out = []
    for i in range(cnt):
        if ring_r: a = i * 2 * math.pi / cnt; cx, cy = ring_r * math.cos(a), ring_r * math.sin(a)
        else: cx, cy = rng.normal(0, spread), rng.normal(0, spread * .7)
        r = rng.uniform(rmin, rmax); M.ell(cx, cy, r, r); out.append((cx, cy, r))
    return M, out


def cloud(cv, x, y, n, hue, rng, ring_r=0, dark=False, cnt=9):
    M, P = puffs(n, rng, cnt, n * .17, n * .08, n * .15, ring_r)
    if ring_r: M.ell(0, 0, ring_r * .55, ring_r * .55, 0)
    m = M.get(.4)
    shade = np.clip(1 - blur(m, n * .05) * .9 + m * .55, 0, 1)        # puffs shade darker toward their centres, toon-style
    shade = shade * (.85 + .15 * noise(n, 8, 21))
    col = (np.array([.36, .38, .42]) * (.6 + .5 * shade[..., None])) if dark else colorize(.45 + .55 * shade, hue)
    edge = np.clip(m - blur(m, 1.5), 0, 1)[..., None]
    if not dark: col = col * (1 - edge) + np.array(hexrgb(hue)) / 255 * edge
    cv.over(x, y, col, np.clip(m * 1.6, 0, 1))


def bubbles(cv, x, y, n, hue, rng):
    M = Mask(n)
    for _ in range(11):
        cx, cy, r = rng.normal(0, n * .15), rng.normal(0, n * .15), rng.uniform(n * .03, n * .08)
        M.ell(cx, cy, r, r, 255, w=1.6); M.ell(cx - r * .35, cy - r * .35, r * .22, r * .22, 255)
    glow_fx(cv, x, y, M.get(.2), hue, halo=.35, tex=0)


def fireball(cv, x, y, n, hue, rng):
    M = Mask(n); r = n * .2
    M.ell(0, n * .08, r, r * 1.1, 160); M.poly([(-r * .9, n * .02), (r * .9, n * .02), (rng.uniform(-3, 3), -n * .32)], 160)
    M.ell(0, n * .1, r * .55, r * .6, 255)
    m = M.get(2.0) * (.75 + .25 * noise(n, 6, int(rng.integers(99))))
    sm = Mask(n); sm.ell(0, -n * .38, n * .07, n * .12, 255); cv.over(x, y, np.full((n, n, 3), .08, np.float32), sm.get(4) * .7)
    glow_fx(cv, x, y, np.clip(m * 1.15, 0, 1), hue, halo=.6, tex=0, core=.9)


def lava(cv, x, y, n, hue, rng):
    h = Mask_disc(n, n * .35, 1, n * .12); cv.add(x, y, ramp(hue)[1] * (h / h.max() * .5)[..., None])
    M = Mask(n); M.ell(0, n * .05, n * .2, n * .07, 255); m = M.get(2) * (.7 + .3 * noise(n, 6, 4))
    glow_fx(cv, x, y, m, hue, halo=.4, tex=0, core=.6)
    R = Mask(n)
    for _ in range(8):
        cx, cy, k = rng.uniform(-n * .17, n * .17), rng.uniform(-n * .07, n * .02), rng.uniform(n * .02, n * .04)
        R.poly([(cx + k * math.cos(a) * rng.uniform(.7, 1.2), cy + k * .7 * math.sin(a)) for a in np.linspace(0, 6.2, 7)])
    r = R.get(.3); cv.over(x, y, np.dstack([.30 * np.ones_like(r), .17 * np.ones_like(r), .12 * np.ones_like(r)]), r)


def sparkle_box(cv, x, y, n, hue, rng):
    M = Mask(n); M.poly([(-n * .3, -n * .25), (n * .3, -n * .25), (n * .32, n * .32), (-n * .32, n * .32)], 110)
    m = M.get(6)
    for _ in range(9):
        D = Mask(n); cx, cy = rng.uniform(-n * .35, n * .35), rng.uniform(-n * .35, n * .3)
        D.poly([(cx + p[0], cy + p[1]) for p in star_pts(rng.uniform(4, 9), .25)]); m = np.maximum(m, D.get(.3))
    glow_fx(cv, x, y, m, hue, halo=.7, halo_r=n * .12, tex=.3, seed=8)


def gold_ring(cv, x, y, n, hue, rng):
    M = Mask(n); r = n * .4; M.ell(0, 0, r, r, 255, w=n * .035)
    for i in range(4): yy = n * (.05 + i * .07); M.ell(0, yy, r * (.75 - i * .12), r * .2, 140 - 25 * i, w=2)
    glow_fx(cv, x, y, M.get(.4), hue, halo=.6, tex=0)


def wind(cv, x, y, n, hue, rng):
    M = Mask(n)
    for i in range(4): M.arc(rng.uniform(-3, 3), -n * .18 + i * n * .12, n * .36 - i * 3, n * .1, 200, 520, 255, n * .03)
    glow_fx(cv, x, y, M.get(.4), hue, halo=.3, tex=0, hot=.6)


def cluster(cv, x, y, n, hue, rng, k=6, burst=False):
    M = Mask(n)
    if burst: M.poly(star_pts(n * .38, .25, 8)); M.poly(star_pts(n * .25, .3, 7, rot=.3), 200)
    for _ in range(k):
        cx, cy = rng.uniform(-n * .35, n * .35), rng.uniform(-n * .35, n * .35)
        M.poly([(cx + p[0], cy + p[1]) for p in star_pts(rng.uniform(2.5, 6), .25)])
    glow_fx(cv, x, y, M.get(.4), hue, halo=.45, tex=0, core=.6)


def sparks(cv, x, y, n, hue, rng):
    M = Mask(n)
    for _ in range(4):
        a = rng.uniform(-2.6, -.4); d = rng.uniform(n * .15, n * .4); M.line([(0, 0), (d * math.cos(a), d * math.sin(a))], 255, 1.8)
    for _ in range(4):
        cx, cy = rng.uniform(-n * .4, n * .4), rng.uniform(-n * .4, n * .4); M.poly([(cx + p[0], cy + p[1]) for p in star_pts(5, .25)])
    glow_fx(cv, x, y, M.get(.3), hue, halo=.4, tex=0)


def rune_ring(cv, x, y, n, hue, rng):
    M = Mask(n); r = n * .3
    for a in (20, 140, 260): M.arc(0, 0, r, r, a, a + 90, 255, n * .06)
    M.poly([(0, -n * .1), (-n * .08, n * .06), (n * .08, n * .06)])
    glow_fx(cv, x, y, M.get(.4), hue, halo=.55, tex=.2, seed=2)


def slash_glint(cv, x, y, n, hue, rng):
    M = Mask(n); L = n * .45
    M.poly([(-L * .7, L * .7), (-2, -2), (L * .7, -L * .7), (2, 2)]); m = M.get(.6)
    cv.over(x, y, colorize(m, hue), np.clip(m * 2, 0, 1))
    glint(cv, x, y, n, hue, rng, r=n * .22, halo=.6)


def crosshair(cv, x, y, n, hue, rng):
    M = Mask(n); r = n * .3; M.ell(0, 0, r, r, 255, w=2)
    for a in range(4): t = a * math.pi / 2; M.line([(r * .6 * math.cos(t), r * .6 * math.sin(t)), (r * 1.3 * math.cos(t), r * 1.3 * math.sin(t))], 255, 2)
    m = M.get(.2)
    glow_fx(cv, x, y, m, hue, halo=.6, tex=0)
    glint(cv, x, y, n, hue, rng, r=n * .12, halo=.3)
