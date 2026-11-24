"""Owner 2026-11-24: 'too many symbols ... we mostly need animated slashes, smashes, wind and all others; mix 70/30, 70 % overall vfx'.
N animated action effects as Roblox Grid4x4 flipbooks (16 frames, 1024 px, 256 px cells), lit like symbols.py and pushed through the
SAME recolor() so gradient + pattern match the reference; plus the most distinct K symbols picked from a symbols.py run.
Every effect is a kind (slash, x-slash, claw, spin, smash, slam, punch, star impact, gust, spiral gust, dash lines, tornado, explosion,
fire, lightning, splash, beam hit, magic burst, heal, dust, ice shatter, smoke) with random params; its peak frame must correlate
< MAXC with every kept one (redraw otherwise). Timing: grow 0-.25, peak, fade + noise erosion .6-1, lingering motes to the end.
  python3 actions.py SYM_DIR OUTDIR [N_ACTION] [N_SYMBOLS]  ->  OUTDIR/action/NNN_kind_hue.png (+ -color.png), OUTDIR/symbols/, stats"""
import sys, os, math, glob, shutil
import numpy as np
from PIL import Image, ImageDraw
import recolor as R
from style import blur, noise
import importlib.util
_d = os.path.dirname(os.path.abspath(__file__))
_sp = importlib.util.spec_from_file_location('stylized_symbols', os.path.join(_d, 'symbols.py'))
SY = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(SY)   # loads stylized batch.py by path too (flipbook/ shadows it)
HUES, white = SY.HUES, SY.white

C, SS, F, MAXC = 160, 2, 16, 0.85          # frame px, supersample, frames, uniqueness gate
FAM = {'slash': ['slash', 'xslash', 'claw', 'spin'], 'smash': ['smash', 'slam', 'punch', 'starhit'],
       'wind': ['gust', 'spiralgust', 'dash', 'tornado'],
       'other': ['explosion', 'fire', 'lightning', 'splash', 'beam', 'magic', 'heal', 'dust', 'ice', 'smoke']}
QUOTA = {'slash': .215, 'smash': .215, 'wind': .18, 'other': .39}      # 30 / 30 / 25 / 55 of 140


def ease(x): x = min(max(x, 0.0), 1.0); return 1 - (1 - x) ** 3


class Pen:
    """supersampled mask painter; coordinates in frame px, centre 0,0"""
    def __init__(s): s.im = Image.new('L', (C * SS, C * SS)); s.d = ImageDraw.Draw(s.im)
    def P(s, x, y): return ((x + C / 2) * SS, (y + C / 2) * SS)
    def dot(s, x, y, r, v=1.0):
        if r <= .2 or v <= 0: return
        (a, b) = s.P(x, y); s.d.ellipse([a - r * SS, b - r * SS, a + r * SS, b + r * SS], fill=int(255 * min(v, 1)))
    def stroke(s, pts, w0, w1, v=1.0):          # tapered stroke as a dense chain of discs (w = radius)
        if len(pts) < 2: return
        L = [0.0]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]): L.append(L[-1] + math.hypot(x1 - x0, y1 - y0))
        tot = L[-1] or 1; k = max(2, int(tot * 1.5))
        for i in range(k + 1):
            u = i / k * tot; j = min(np.searchsorted(L, u, side='right') - 1, len(pts) - 2); f = (u - L[j]) / max(L[j + 1] - L[j], 1e-6)
            x = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f; y = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f
            q = u / tot; s.dot(x, y, w0 + (w1 - w0) * q, v)
    def poly(s, pts, v=1.0): s.d.polygon([s.P(x, y) for x, y in pts], fill=int(255 * min(v, 1)))
    def get(s, b=.6):
        m = np.asarray(s.im.resize((C, C), Image.LANCZOS), np.float32) / 255
        return blur(m, b) if b else m


def arc(r, a0, a1, cx=0, cy=0, sq=1.0, rot=0.0, k=48):
    out = []
    for i in range(k + 1):
        a = a0 + (a1 - a0) * i / k; x, y = r * math.cos(a), r * math.sin(a) * sq
        out.append((cx + x * math.cos(rot) - y * math.sin(rot), cy + x * math.sin(rot) + y * math.cos(rot)))
    return out


def jag(rng, x0, y0, x1, y1, k, amp):
    pts = [(x0, y0)]
    for i in range(1, k):
        f = i / k; nx, ny = -(y1 - y0), x1 - x0; l = math.hypot(nx, ny) or 1; o = rng.uniform(-amp, amp)
        pts.append((x0 + (x1 - x0) * f + nx / l * o, y0 + (y1 - y0) * f + ny / l * o))
    return pts + [(x1, y1)]


def params(kind, rng):
    """random per-effect params; frames reuse them so the effect is one continuous motion"""
    p = dict(kind=kind, rot=rng.uniform(0, 2 * math.pi), seed=int(rng.integers(1 << 30)), sz=rng.uniform(.8, 1.0),
             n=int(rng.integers(2, 6)), sq=rng.uniform(.5, 1.0), w=rng.uniform(.7, 1.4), sweep=rng.uniform(1.6, 3.6),
             dirn=1 if rng.random() < .5 else -1, k=int(rng.integers(5, 13)), off=rng.uniform(-.25, .25))
    return p


def motes(pen, rng, cnt, t, rmax, spread=1.0, up=0.0, size=1.6):
    """lingering particles: born at the impact, drift out, shrink late; they carry the effect past the main shape's fade"""
    for i in range(cnt):
        a = rng.uniform(0, 2 * math.pi); sp = rng.uniform(.3, 1) * rmax * spread; r0 = rng.uniform(0, .3) * rmax
        d = r0 + sp * ease(t * 1.2); x, y = d * math.cos(a), d * math.sin(a) - up * t * t * rmax
        v = (1 - max(0, t - .55) / .45 * .85) * rng.uniform(.6, 1); pen.dot(x, y, size * rng.uniform(.6, 1.4) * (1.15 - .6 * t), v)


def draw(p, t):
    """mask (C x C, 0..1) of effect p at time t in [0, 1]"""
    rng = np.random.default_rng(p['seed']); pen = Pen(); k = p['kind']; R0 = C * .4 * p['sz']; rot = p['rot']; w = p['w']
    g = ease(t / .25); fade = 1 - max(0, t - .6) / .4
    if k in ('slash', 'xslash', 'claw', 'spin'):
        cuts = {'slash': 1, 'xslash': 2, 'claw': 3 + p['n'] % 2, 'spin': 1}[k]
        for c in range(cuts):
            tt = t - c * .06; head = ease(tt / .3); tail = .8 * ease(max(0, tt - .38) / .62)      # full crescent visible ~.3-.45
            if head <= 0: continue
            if k == 'spin': a0, span = rot, 2 * math.pi * .95
            elif k == 'xslash': a0, span = rot + c * math.pi / 2, p['sweep'] * .7
            else: a0, span = rot, max(p['sweep'], 2.4)
            r = R0 * (1 - .14 * c) if k == 'claw' else R0
            off = (c - (cuts - 1) / 2) * R0 * .22 if k == 'claw' else 0
            s0, s1 = a0 + span * tail, a0 + span * head
            if s1 - s0 < .02: continue
            sq = p['sq'] if k != 'spin' else .45 + .5 * p['sq']
            pts = arc(r, s0, s1, 0, off, sq, rot * .3 if k == 'xslash' else 0)
            if p['dirn'] < 0: pts = [(-x, y) for x, y in pts]
            wd = (4 + 5 * (k in ('slash', 'spin'))) * w * (1 - .55 * tail)
            pen.stroke(pts, .5, wd, 1)                                   # crescent: thin tail, fat leading edge
            pen.stroke(arc(r * .86, s0 + (s1 - s0) * .35, s1, 0, off, sq, rot * .3 if k == 'xslash' else 0, 30) if p['dirn'] > 0 else
                       [(-x, y) for x, y in arc(r * .86, s0 + (s1 - s0) * .35, s1, 0, off, sq, rot * .3 if k == 'xslash' else 0, 30)], .3, wd * .35, .7)
            for q in range(10):                                          # sparks shed from the swept path, drift outward, linger
                u = rng.uniform(0, 1); a = a0 + span * u; born = .3 * u
                if tt < born: continue
                life = tt - born; rr = r * (1 + .35 * ease(life / .6) * rng.uniform(.4, 1)); x, y = rr * math.cos(a), off + rr * math.sin(a) * sq
                pen.dot(-x if p['dirn'] < 0 else x, y, rng.uniform(1.2, 2.4) * (1.1 - .5 * min(life / .7, 1)), 1 - .6 * min(life / .7, 1))
    elif k in ('smash', 'slam', 'punch', 'starhit'):
        sq = .38 if k == 'slam' else 1.0
        rr = R0 * (.2 + .8 * ease(t / .5)); th = 5 * w * (1 - ease(t / .7)) + .5
        pen.stroke(arc(rr, 0, 2 * math.pi, sq=sq, rot=rot if k != 'slam' else 0, k=72), th, th, fade)
        if k == 'smash' or k == 'slam':
            for i in range(p['k']):
                a = rot + i * 2 * math.pi / p['k'] + rng.uniform(-.2, .2); L = R0 * rng.uniform(.5, .95) * ease((t - .12) / .25)
                if L > 2: pen.stroke(jag(rng, 0, 0, L * math.cos(a), L * math.sin(a) * sq, 5, 4), 2.6 * w * fade, .4, fade)
        if k == 'punch' or k == 'starhit':
            spikes = p['k'] if k == 'punch' else 4 + p['n']
            pk = g * (1 - ease((t - .3) / .5))
            pts = []
            for i in range(spikes * 2):
                a = rot + math.pi * i / spikes; rad = R0 * (.85 if i % 2 == 0 else .3) * pk * (rng.uniform(.7, 1.1) if k == 'punch' else 1)
                pts.append((rad * math.cos(a), rad * math.sin(a)))
            if pk > .03: pen.poly(pts, 1)
        pen.dot(0, 0, R0 * .3 * g * (1 - ease(t / .5)), 1)
        motes(pen, rng, 14 + p['k'], t, R0 * (1.1 if k != 'slam' else .9), 1, up=.5 if k == 'slam' else 0, size=2.2)
    elif k in ('gust', 'spiralgust', 'dash', 'tornado'):
        if k == 'gust':
            for i in range(p['n'] + 2):
                y = (i / (p['n'] + 1) - .5) * R0 * 1.4 + rng.uniform(-6, 6); ph = rng.uniform(0, .25); bend = rng.uniform(-.5, .5) * R0 * .4
                hx = -R0 * 1.2 + 2.4 * R0 * ease((t - ph) / .65); tx = -R0 * 1.2 + 2.4 * R0 * ease((t - ph - .18) / .7)
                if hx - tx < 3: continue
                pts = [(x, y + bend * math.sin((x / R0 + 1) * 1.6)) for x in np.linspace(tx, hx, 24)]
                pts = [(x * math.cos(rot * .2) - yy * math.sin(rot * .2), x * math.sin(rot * .2) + yy * math.cos(rot * .2)) for x, yy in pts]
                pen.stroke(pts, .4, 2.6 * w * fade, fade)
        elif k in ('spiralgust', 'tornado'):
            arms = 2 + p['n'] % 3
            for a_ in range(arms):
                base = rot + a_ * 2 * math.pi / arms + t * 3.5 * p['dirn']; pts = []
                for i in range(40):
                    f = i / 39 * ease(t / .4); rad = R0 * (.15 + .85 * f) * (.9 + .2 * t)
                    if k == 'tornado': pts.append(((R0 * .2 + rad * .6) * math.cos(base + f * 6) , (f - .5) * R0 * 1.8))
                    else: pts.append((rad * math.cos(base + f * p['sweep'] * p['dirn']), rad * math.sin(base + f * p['sweep'] * p['dirn'])))
                pen.stroke(pts, .5, 2.4 * w * fade, fade)
        else:
            for i in range(p['k'] * 2):
                a = rot + rng.uniform(0, 2 * math.pi); ph = rng.uniform(0, .3); r1 = R0 * (1.25 - 1.0 * ease((t - ph) / .5)); r2 = r1 + R0 * rng.uniform(.2, .45) * fade
                if r1 < R0 * 1.2 and r2 > r1 + 2: pen.stroke([(r1 * math.cos(a), r1 * math.sin(a)), (r2 * math.cos(a), r2 * math.sin(a))], .4, 1.6 * w, fade)
        motes(pen, rng, 6 + p['k'] // 2, t, R0, .9, size=1.4)
    else:
        if k in ('explosion', 'dust', 'smoke'):
            cnt = 6 + p['k']
            for i in range(cnt):
                a = rng.uniform(0, 2 * math.pi); d = R0 * rng.uniform(.1, .6) * ease(t / .5); up = R0 * (.5 if k == 'smoke' else .15 if k == 'dust' else 0) * t
                y0 = R0 * .35 if k == 'dust' else 0
                pen.dot(d * math.cos(a), y0 + d * math.sin(a) * (.45 if k == 'dust' else 1) - up, R0 * rng.uniform(.18, .34) * (.3 + .7 * g) * (1 + .3 * t), .9 * fade + .1)
            motes(pen, rng, 10 + p['k'], t, R0 * 1.1, 1, size=2)
        elif k == 'fire':
            for i in range(p['k']):
                x = rng.uniform(-.55, .55) * R0; hgt = R0 * rng.uniform(.6, 1.3) * g * (1 - .35 * t); ph = rng.uniform(0, 6)
                pts = [(x + math.sin(ph + f * 5 + t * 9) * 6 * f, R0 * .6 - hgt * f) for f in np.linspace(0, 1, 16)]
                pen.stroke(pts, 7 * w * fade, .4, fade)
            motes(pen, rng, 12, t, R0, .8, up=1.2, size=1.5)
        elif k == 'lightning':
            fl = 1 if (int(t * 15) % 3 != 2 or t < .4) else .8
            pts = jag(rng, rng.uniform(-.3, .3) * R0, -R0 * 1.1, rng.uniform(-.3, .3) * R0, R0 * .6, 9, R0 * .18)
            n_ = max(2, int(len(pts) * ease(t / .15)))
            pen.stroke(pts[:n_], 2.6 * w * fade, 1.6 * w * fade, fl * fade)
            for b in range(p['n']):
                j = rng.integers(2, len(pts) - 2); x0, y0 = pts[j]
                if j < n_: pen.stroke(jag(rng, x0, y0, x0 + rng.uniform(-.5, .5) * R0, y0 + rng.uniform(.15, .45) * R0, 4, 6), 1.4 * fade, .3, fl * fade)
            pen.dot(pts[-1][0], pts[-1][1], R0 * .25 * g * (1 - ease(t / .6)), 1)
            motes(pen, rng, 10, max(0, t - .1), R0 * .6, 1, size=1.6)
        elif k == 'splash':
            for i in range(p['k'] + 4):
                a = -math.pi / 2 + rng.uniform(-1.1, 1.1); sp = R0 * rng.uniform(.6, 1.2); tt = t * 1.1
                x = math.cos(a) * sp * tt; y = R0 * .5 + math.sin(a) * sp * tt * 1.6 + R0 * 1.4 * tt * tt
                pen.dot(x, y, rng.uniform(2, 4.5) * (1.1 - .6 * t), fade * .9 + .1)
            pen.stroke(arc(R0 * (.2 + .7 * ease(t / .5)), 0, 2 * math.pi, 0, R0 * .5, .3, k=60), 3 * w * fade, 3 * w * fade, fade)
        elif k == 'beam':
            ln = R0 * 1.3 * ease(t / .32); y = R0 * p['off']
            pen.stroke([(-R0 * 1.25, y), (-R0 * 1.25 + ln, y)], 4 * w * fade, 4 * w * fade, fade)
            hx = -R0 * 1.25 + ln; pen.dot(hx, y, R0 * .3 * g * fade, 1)
            for i in range(p['k']):
                a = rng.uniform(-2.2, 2.2) + math.pi; L = R0 * rng.uniform(.2, .5) * g
                pen.stroke([(hx, y), (hx + L * math.cos(a), y + L * math.sin(a))], 1.8 * fade, .3, fade)
            motes(pen, rng, 8, t, R0 * .5, 1, size=1.6)
        elif k == 'magic':
            for i in range(p['k']):
                a = rot + i * 2 * math.pi / p['k'] + t * 1.5; rr = R0 * .75 * g
                pen.dot(rr * math.cos(a), rr * math.sin(a), 3.2 * w * fade, fade)
            for i in range(p['n'] + 3):
                a = rot + i * 2 * math.pi / (p['n'] + 3) - t; L = R0 * .55 * g * (1 - .5 * t)
                pen.stroke([(0, 0), (L * math.cos(a), L * math.sin(a))], 3 * w * fade, .3, fade)
            pen.dot(0, 0, R0 * .18 * g * fade, 1)
        elif k == 'heal':
            for i in range(p['k']):
                x = rng.uniform(-.7, .7) * R0; ph = rng.uniform(0, .4); y = R0 * .7 - R0 * 1.5 * ease((t - ph) / .6); s_ = rng.uniform(3, 7) * (1 - max(0, t - ph - .4))
                if t < ph or s_ <= .5: continue
                if i % 3 == 0: pen.stroke([(x - s_, y), (x + s_, y)], 1.4, 1.4); pen.stroke([(x, y - s_), (x, y + s_)], 1.4, 1.4)
                else: pen.dot(x, y, s_ * .4, 1)
            pen.stroke(arc(R0 * .8, 0, 2 * math.pi, 0, R0 * .6, .25, k=60), 2 * fade * g, 2 * fade * g, fade)
        elif k == 'ice':
            for i in range(p['k']):
                a = rot + rng.uniform(0, 2 * math.pi); d = R0 * (.05 + .8 * ease((t - .1) / .5)) * rng.uniform(.6, 1); s_ = rng.uniform(5, 11) * (1 - .5 * t) * g
                cx, cy = d * math.cos(a), d * math.sin(a); sp_ = a + t * rng.uniform(-3, 3)
                pen.poly([(cx + s_ * math.cos(sp_), cy + s_ * math.sin(sp_)), (cx + s_ * .35 * math.cos(sp_ + 2), cy + s_ * .35 * math.sin(sp_ + 2)),
                          (cx - s_ * .6 * math.cos(sp_), cy - s_ * .6 * math.sin(sp_)), (cx + s_ * .35 * math.cos(sp_ - 2), cy + s_ * .35 * math.sin(sp_ - 2))], fade)
            pen.dot(0, 0, R0 * .35 * (1 - ease(t / .3)), 1)
    m = pen.get()
    if t > .55:                                  # erode with noise instead of a plain fade: nothing vanishes clean
        e = (t - .55) / .45; nz = noise(C, 9, p['seed'] % 97)
        m = m * np.clip((nz - e * .8) / .25 + .15, 0, 1)
    return np.clip(m, 0, 1)


def lit(m, h):
    """symbols.py lighting without random glints (they would jump between frames)"""
    core = np.clip(blur(m, 2.5) - .55, 0, 1) / .45
    halo = blur(m, 6) * .7 + blur(m, 16) * .6 + blur(m, 30) * .35
    body = np.clip(m * .85 + halo, 0, 1.3)
    return np.clip(body[..., None] * h + np.clip(core * .9, 0, 1)[..., None] * (1 - h), 0, 1)


def vec(m):
    v = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((32, 32)), np.float32).ravel(); return (v - v.mean()) / (v.std() + 1e-6)


def jump(ms):
    """flipbook/vfx.py metric: a pop = one frame step many times its neighbour (pass < ~3)"""
    st = np.array([np.abs(ms[i + 1] - ms[i]).mean() for i in range(len(ms) - 1)]); mass = np.array([m.mean() for m in ms])
    act = np.array([max(mass[i], mass[i + 1]) >= .05 * mass.max() for i in range(len(st))]); sa = st[act] if act.any() else st
    fl = .25 * np.median(sa); return round(float(max([max(sa[i], sa[i + 1]) / max(min(sa[i], sa[i + 1]), fl) for i in range(len(sa) - 1)] or [1.0])), 2)


def pick_symbols(sym_dir, k):
    fs = sorted(glob.glob(f'{sym_dir}/[0-9]*.png')); V = np.array([vec(np.asarray(Image.open(f).split()[-1], np.float32) / 255) for f in fs])
    Cm = V @ V.T / V.shape[1]; chosen = [0]
    while len(chosen) < min(k, len(fs)):                          # farthest-first: always add the symbol least like any chosen one
        mx = Cm[:, chosen].max(1); mx[chosen] = 9; chosen.append(int(mx.argmin()))
    return [fs[i] for i in sorted(chosen)], round(float(max(Cm[i, j] for i in chosen for j in chosen if i != j)), 3)


def main(sym_dir, out, n=140, ns=60):
    os.makedirs(out + '/action', exist_ok=True); os.makedirs(out + '/symbols', exist_ok=True)
    rng = np.random.default_rng(1124); names = list(HUES); kinds = []
    for fam, q in QUOTA.items(): kinds += [FAM[fam][i % len(FAM[fam])] for i in range(round(n * q))]
    kinds = (kinds + FAM['other'])[:n]
    st = dict(made=0, redraws=0, max_corr=0.0, empty_frames=0, max_step_jump=0.0, colour_gates=[])
    keep = []; bg = np.array([.05, .12, .18], np.float32)
    for i, kind in enumerate(kinds):
        best = None
        for tr in range(25):
            p = params(kind, rng); v = vec(draw(p, .3)); c = max((float(v @ u) / v.size for u in keep), default=0)
            if best is None or c < best[0]: best = (c, p, v)
            if c < MAXC: break
            st['redraws'] += 1
        c, p, v = best; keep.append(v); st['max_corr'] = max(st['max_corr'], round(c, 3))
        hue = names[(i * 7) % len(names)]; h = np.array([int(HUES[hue][j:j + 2], 16) for j in (1, 3, 5)], np.float32) / 255
        sheet = np.zeros((4 * C, 4 * C, 3), np.float32) + bg; ms = []
        for f in range(F):
            m = draw(p, .05 + .95 * f / (F - 1)); r_, c_ = divmod(f, 4); ms.append(m)     # t starts at .05: frame 1 is never blank
            sheet[r_ * C:(r_ + 1) * C, c_ * C:(c_ + 1) * C] = np.maximum(bg, lit(m, h))
            if m.max() < .05: st['empty_frames'] += 1
        j = jump(ms); st['max_step_jump'] = max(st['max_step_jump'], j)
        if j >= 3: st.setdefault('jumpy', []).append(f'{i}:{kind}:{j}')
        col, Ls, *_ = R.recolor(sheet)
        if i % 20 == 0: st['colour_gates'].append(R.gates(sheet, col, Ls))
        wsheet = Image.new('RGBA', (1024, 1024)); csheet = Image.fromarray((col * 255 + .5).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS)
        for f in range(F):
            r_, c_ = divmod(f, 4); wsheet.paste(white(Ls[r_ * C:(r_ + 1) * C, c_ * C:(c_ + 1) * C]), (c_ * 256, r_ * 256))
        wsheet.save(f'{out}/action/{i:03d}_{kind}_{hue}.png'); csheet.save(f'{out}/action/{i:03d}_{kind}_{hue}-color.png'); st['made'] += 1
    picks, st['symbols_max_corr'] = pick_symbols(sym_dir, ns)
    for f in picks: shutil.copy(f, f'{out}/symbols/')
    for f in glob.glob(f'{sym_dir}/sheet*-color.png'): shutil.copy(f, f'{out}/symbols/')
    st['symbols'] = len(picks); print(st)


if __name__ == '__main__':
    a = sys.argv; main(a[1], a[2], int(a[3]) if len(a) > 3 else 140, int(a[4]) if len(a) > 4 else 60)
