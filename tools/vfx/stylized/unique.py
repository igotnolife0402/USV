"""Owner 2026-11-24 (3rd time): 'these are identical too ... none of the same shape, all unique'. actions.py drew N random variants
of 22 kinds, so every smash was ring + centre burst: same silhouette, different noise. This builds each effect from a GRAMMAR of
33 distinct elements: effect = primary element + optional secondary element of another class, in its own layout. Rules:
  - every unordered pair is used once; each element appears in at most ~2n/27+1 effects, each big-outline FRAME element only once
    (ring + anything reads as 'the ring one'); partner drawn at 65-85 % size so both shapes read;
  - silhouette gate: peak + early + late frames, blurred (what the eye sees, not the noise), compared in 8 rotations x mirror,
    corr < MAXC with every kept effect (rotated copies are the same effect: the game rotates textures itself).
Same timing, lighting, recolor and outputs as actions.py (Grid4x4 white + colour PNG sheets, GIFs via gifs.py); rendering runs in a Pool.
  python3 unique.py SYM_DIR OUTDIR [140] [60]"""
import sys, os, math, glob, shutil
import numpy as np
from multiprocessing import Pool
from PIL import Image
import recolor as R
from style import blur, noise
import actions as A
from actions import Pen, arc, jag, ease, C, F

MAXC = 0.66                       # 0.78 let claw+rise / claw+petals through (same 3-claw read); 0.66 rejects them


def _p(pen, ox, oy): pen.ox, pen.oy = ox, oy


# ---- elements: el(pen, rng, t, S) draws at pen origin; S: R radius, w width, n, k counts, sweep, sq squash, ph phase
def crescent(pen, rng, t, S):
    head = ease(t / .4); tail = .8 * ease(max(0, t - .26) / .74); a0, sp = math.pi * .85, max(S['sweep'], 2.2)
    pts = arc(S['R'], a0 + sp * tail, a0 + sp * head, sq=S['sq'])
    if len(pts) > 1 and head > tail + .01: pen.stroke(pts, .5, 8 * S['w'] * (1 - .5 * tail), 1)
def claw(pen, rng, t, S):
    for c in range(3 + S['n'] % 2):
        tt = t - c * .05; head = ease(tt / .35); tail = .8 * ease(max(0, tt - .25) / .7)
        if head > tail + .01: pen.stroke([(x, y + (c - 1.5) * S['R'] * .25) for x, y in arc(S['R'] * .9, -2.4 + 1.6 * tail, -2.4 + 1.6 * head, sq=.5)], .4, 3.5 * S['w'], 1)
def xcut(pen, rng, t, S):
    for c, a in enumerate((.75, 2.35)):
        tt = t - c * .1; L = S['R'] * 1.1 * ease(tt / .25); w = 4 * S['w'] * (1 - ease(max(0, tt - .3) / .7))
        if L > 2: pen.stroke([(-L * math.cos(a), -L * math.sin(a)), (L * math.cos(a), L * math.sin(a))], .4, w + .3, 1)
def thrust(pen, rng, t, S):
    L = S['R'] * 1.25 * ease(t / .25); x0 = -S['R'] * 1.2 + S['R'] * 2.2 * ease(max(0, t - .3) / .7)
    if L > 2 and x0 < -S['R'] * 1.2 + L * 2: pen.stroke([(x0, 0), (-S['R'] * 1.2 + L * 2, 0)], .5, 5 * S['w'], 1)
def shock(pen, rng, t, S):
    r = S['R'] * (.15 + .85 * ease(t / .5)); th = 5 * S['w'] * (1 - ease(t / .75)) + .4; pen.stroke(arc(r, 0, 2 * math.pi, k=80), th, th, 1)
def ground(pen, rng, t, S):
    r = S['R'] * (.2 + .9 * ease(t / .5)); th = 4 * S['w'] * (1 - ease(t / .75)) + .4; pen.stroke(arc(r, 0, 2 * math.pi, sq=.3, k=80), th, th, 1)
def spikes(pen, rng, t, S):
    k = 4 + S['k'] % 9; pk = ease(t / .35) * (1 - .7 * ease(max(0, t - .35) / .65)); pts = []
    for i in range(2 * k):
        a = math.pi * i / k; r = S['R'] * (.9 if i % 2 == 0 else .25 + .1 * (S['n'] % 3)) * pk; pts.append((r * math.cos(a), r * math.sin(a)))
    if pk > .03: pen.poly(pts, 1)
def cracks(pen, rng, t, S):
    for i in range(S['k']):
        a = i * 2 * math.pi / S['k'] + rng.uniform(-.25, .25); L = S['R'] * rng.uniform(.5, 1) * ease((t - .05) / .25)
        if L > 2: pen.stroke(jag(rng, 0, 0, L * math.cos(a), L * math.sin(a), 5, 4), 2.5 * S['w'], .3, 1)
def dashes(pen, rng, t, S):
    for i in range(S['k'] * 2):
        a = rng.uniform(0, 2 * math.pi); ph = rng.uniform(0, .3); r1 = S['R'] * (1.2 - ease((t - ph) / .5)); r2 = r1 + S['R'] * rng.uniform(.2, .45)
        if r1 < S['R'] * 1.15: pen.stroke([(r1 * math.cos(a), r1 * math.sin(a)), (r2 * math.cos(a), r2 * math.sin(a))], .4, 1.7 * S['w'], 1)
def spiral(pen, rng, t, S):
    arms = 2 + S['n'] % 3
    for j in range(arms):
        b = j * 2 * math.pi / arms + t * 3; pts = [(S['R'] * (.1 + .9 * f) * math.cos(b + f * S['sweep']), S['R'] * (.1 + .9 * f) * math.sin(b + f * S['sweep'])) for f in np.linspace(0, ease(t / .4), 36)]
        pen.stroke(pts, .5, 2.6 * S['w'], 1)
def helix(pen, rng, t, S):
    for j in (0, math.pi):
        pts = [((S['R'] * .2 + S['R'] * .5 * f) * math.cos(j + f * 7 + t * 6), (f - .5) * S['R'] * 1.9) for f in np.linspace(0, ease(t / .35), 40)]
        pen.stroke(pts, .5, 2.2 * S['w'], 1)
def streaks(pen, rng, t, S):
    for i in range(S['n'] + 2):
        y = (i / (S['n'] + 1) - .5) * S['R'] * 1.3; ph = rng.uniform(0, .25)
        hx = -S['R'] * 1.2 + 2.4 * S['R'] * ease((t - ph) / .6); tx = -S['R'] * 1.2 + 2.4 * S['R'] * ease((t - ph - .18) / .7)
        if hx - tx > 3: pen.stroke([(x, y + 6 * math.sin(x / 14)) for x in np.linspace(tx, hx, 20)], .4, 2.4 * S['w'], 1)
def waves(pen, rng, t, S):
    for i in range(2 + S['n'] % 3):
        y = (i - 1) * S['R'] * .35; L = ease(t / .45)
        pen.stroke([(x, y + S['R'] * .15 * math.sin(x / S['R'] * 6 + t * 8 + i)) for x in np.linspace(-S['R'], -S['R'] + 2 * S['R'] * L, 40)], 1.6 * S['w'], 1.6 * S['w'], 1)
def puffs(pen, rng, t, S):
    g = ease(t / .4)
    for i in range(6 + S['k'] // 2):
        a = rng.uniform(0, 2 * math.pi); d = S['R'] * rng.uniform(.1, .55) * g; pen.dot(d * math.cos(a), d * math.sin(a), S['R'] * rng.uniform(.18, .32) * (.3 + .7 * g), .9)
def flames(pen, rng, t, S):
    g = ease(t / .3)
    for i in range(3 + S['k'] // 2):
        x = rng.uniform(-.5, .5) * S['R']; h = S['R'] * rng.uniform(.7, 1.3) * g * (1 - .3 * t); ph = rng.uniform(0, 6)
        pen.stroke([(x + math.sin(ph + f * 5 + t * 9) * 6 * f, S['R'] * .6 - h * f) for f in np.linspace(0, 1, 16)], 6 * S['w'], .4, 1)
def bolt(pen, rng, t, S):
    pts = jag(rng, 0, -S['R'] * 1.1, rng.uniform(-.3, .3) * S['R'], S['R'] * .7, 9, S['R'] * .2); n = max(2, int(len(pts) * ease(t / .2)))
    pen.stroke(pts[:n], 2.6 * S['w'], 1.5 * S['w'], 1)
def fountain(pen, rng, t, S):
    for i in range(S['k'] + 6):
        a = -math.pi / 2 + rng.uniform(-1, 1); sp = S['R'] * rng.uniform(.7, 1.2); x = math.cos(a) * sp * t; y = S['R'] * .6 + math.sin(a) * sp * t * 1.7 + S['R'] * 1.5 * t * t
        pen.dot(x, y, rng.uniform(2, 4) * (1.1 - .6 * t))
def beam(pen, rng, t, S):
    L = S['R'] * 2.4 * ease(t / .35); pen.stroke([(-S['R'] * 1.2, 0), (-S['R'] * 1.2 + L, 0)], 4 * S['w'], 4 * S['w'], 1); pen.dot(-S['R'] * 1.2 + L, 0, S['R'] * .22 * ease(t / .35), 1)
def orbit(pen, rng, t, S):
    for i in range(S['k']):
        a = i * 2 * math.pi / S['k'] + t * 2.5; r = S['R'] * .75 * ease(t / .3); pen.dot(r * math.cos(a), r * math.sin(a), 3 * S['w'], 1)
def rise(pen, rng, t, S):
    for i in range(S['k'] + 2):
        x = rng.uniform(-.7, .7) * S['R']; ph = rng.uniform(0, .4); y = S['R'] * .7 - S['R'] * 1.5 * ease((t - ph) / .6); s = rng.uniform(3, 6)
        if t < ph: continue
        if i % 2: pen.stroke([(x - s, y), (x + s, y)], 1.3, 1.3); pen.stroke([(x, y - s), (x, y + s)], 1.3, 1.3)
        else: pen.dot(x, y, s * .4, 1)
def shards(pen, rng, t, S):
    for i in range(S['k']):
        a = rng.uniform(0, 2 * math.pi); d = S['R'] * (.05 + .85 * ease((t - .05) / .5)) * rng.uniform(.6, 1); s = rng.uniform(5, 11) * ease(t / .2)
        cx, cy = d * math.cos(a), d * math.sin(a); b = a + t * 2
        pen.poly([(cx + s * math.cos(b), cy + s * math.sin(b)), (cx + s * .3 * math.cos(b + 2), cy + s * .3 * math.sin(b + 2)), (cx - s * .6 * math.cos(b), cy - s * .6 * math.sin(b)), (cx + s * .3 * math.cos(b - 2), cy + s * .3 * math.sin(b - 2))], 1)
def column(pen, rng, t, S):
    for i in range(7 + S['n']):
        y = S['R'] * .7 - S['R'] * 1.6 * ease((t - i * .03) / .7) * (i + 1) / (8 + S['n']); pen.dot(rng.uniform(-.15, .15) * S['R'] * (1 + t), y, S['R'] * (.12 + .05 * i) * ease(t / .3), .8)
def fan(pen, rng, t, S):
    for i in range(S['k']):
        a = -math.pi / 2 + (i / max(S['k'] - 1, 1) - .5) * S['sweep'] * .5; L = S['R'] * rng.uniform(.7, 1.1) * ease(t / .3)
        if L > 2: pen.stroke([(0, S['R'] * .5), (L * math.cos(a), S['R'] * .5 + L * math.sin(a))], 2.4 * S['w'], .3, 1)
def pillar(pen, rng, t, S):
    w = S['R'] * .22 * S['w'] * ease(t / .2) * (1 - .6 * ease(max(0, t - .4) / .6)); h = S['R'] * 1.2
    if w > .5: pen.poly([(-w, h), (w, h), (w * .4, -h), (-w * .4, -h)], 1)
def faultline(pen, rng, t, S):
    L = S['R'] * 1.2 * ease(t / .3); pen.stroke(jag(rng, -L, S['R'] * .4, L, S['R'] * .4, 10, 5), 2.5 * S['w'], 2.5 * S['w'], 1)
    for i in range(S['k']):
        x = rng.uniform(-1, 1) * L; pen.dot(x, S['R'] * .4 - S['R'] * .9 * t * (1 - t) * rng.uniform(1, 3), rng.uniform(2, 4))
def comet(pen, rng, t, S):
    x = -S['R'] * 1.1 + S['R'] * 2.2 * ease(t / .6); y = -x * .5; pen.dot(x, y, S['R'] * .16 * S['w'], 1)
    pen.stroke([(x - S['R'] * .7 * f, y + S['R'] * .35 * f) for f in np.linspace(1, 0, 12)], .4, S['R'] * .14 * S['w'], .8)
def petals(pen, rng, t, S):
    for i in range(S['k']):
        a = i * 2 * math.pi / S['k'] + t * 2; r = S['R'] * .8 * ease(t / .5); cx, cy = r * math.cos(a), r * math.sin(a)
        pen.stroke([(cx - 5 * math.cos(a + 1.2), cy - 5 * math.sin(a + 1.2)), (cx + 5 * math.cos(a + 1.2), cy + 5 * math.sin(a + 1.2))], 3 * S['w'], .5, 1)
def zigring(pen, rng, t, S):
    r = S['R'] * (.3 + .6 * ease(t / .4)); k = 10 + 2 * S['n']
    pen.stroke([((r * (1.12 if i % 2 else .88)) * math.cos(i * 2 * math.pi / k + t), (r * (1.12 if i % 2 else .88)) * math.sin(i * 2 * math.pi / k + t)) for i in range(k + 1)], 1.8 * S['w'], 1.8 * S['w'], 1)
def bubbles(pen, rng, t, S):
    for i in range(S['k']):
        x = rng.uniform(-.6, .6) * S['R']; y = S['R'] * .7 - S['R'] * 1.4 * ease((t - rng.uniform(0, .3)) / .7); r = rng.uniform(4, 9)
        pen.stroke(arc(r, 0, 2 * math.pi, x, y, k=20), 1.2, 1.2)
def vortex(pen, rng, t, S):
    for i in range(3):
        f = (i / 3 + t * 1.5) % 1; r = S['R'] * (1 - f); pen.stroke(arc(r, 0, 2 * math.pi, sq=S['sq'], k=60), 2 * S['w'] * (1 - f) + .3, 2 * S['w'] * (1 - f) + .3, 1)
def sparkfall(pen, rng, t, S):
    for i in range(S['k'] + 4):
        a = -math.pi / 2 + rng.uniform(-1.3, 1.3); sp = S['R'] * rng.uniform(.8, 1.3); pts = []
        for tt in np.linspace(max(0, t - .12), t, 5): pts.append((math.cos(a) * sp * tt, math.sin(a) * sp * tt + S['R'] * 1.6 * tt * tt))
        pen.stroke(pts, .3, 1.6, 1)
def polyshock(pen, rng, t, S):
    k = 3 + S['n'] % 4; r = S['R'] * (.15 + .85 * ease(t / .5)); th = 4 * S['w'] * (1 - ease(t / .75)) + .4
    pen.stroke([(r * math.cos(i * 2 * math.pi / k - math.pi / 2), r * math.sin(i * 2 * math.pi / k - math.pi / 2)) for i in range(k + 1)], th, th, 1)
def dashring(pen, rng, t, S):
    r = S['R'] * .75 * ease(t / .3); k = 6 + S['n']
    for i in range(k):
        a = i * 2 * math.pi / k + t * 2; pen.stroke(arc(r, a, a + math.pi / k * .9, k=8), 2.2 * S['w'], 2.2 * S['w'], 1)

EL = {f.__name__: f for f in (crescent, claw, xcut, thrust, shock, ground, spikes, cracks, dashes, spiral, helix, streaks, waves, puffs, flames, bolt,
      fountain, beam, orbit, rise, shards, column, fan, pillar, faultline, comet, petals, zigring, bubbles, vortex, sparkfall, polyshock, dashring)}
FRAME = {'shock', 'ground', 'vortex', 'zigring', 'polyshock', 'dashring'}   # big outlines: ring + anything reads as 'the ring one' (owner 3rd complaint), so each frame is used ONCE
ACTION = ['crescent', 'claw', 'xcut', 'thrust', 'shock', 'ground', 'spikes', 'cracks', 'dashes', 'spiral', 'helix', 'streaks', 'waves', 'faultline', 'polyshock']


def params(rng, prim, sec):
    S = lambda s: dict(R=C * .4 * s, w=rng.uniform(.7, 1.4), n=int(rng.integers(1, 7)), k=int(rng.integers(5, 13)), sweep=rng.uniform(1.8, 3.6), sq=rng.uniform(.45, 1.0))
    lay = rng.choice(['centre', 'side', 'stack'])                                   # partner is near full size so BOTH shapes read
    return dict(prim=prim, sec=sec, seed=int(rng.integers(1 << 30)), S1=S(rng.uniform(.8, .95)), S2=S(rng.uniform(.65, .85)), lay=str(lay))


def draw(p, t):
    rng = np.random.default_rng(p['seed']); pen = Pen(); pen.ox = pen.oy = 0
    if p['sec']:
        d = {'centre': (0, 0), 'side': (C * .18, 0), 'stack': (0, C * .2)}[p['lay']]
        _p(pen, *d); EL[p['sec']](pen, np.random.default_rng(p['seed'] + 1), t, p['S2']); _p(pen, -d[0], -d[1])
    else: _p(pen, 0, 0)
    EL[p['prim']](pen, rng, t, p['S1'])
    A.motes(pen, rng, 6, t, p['S1']['R'], .9, size=1.3)
    m = pen.get()
    if t > .55: e = (t - .55) / .45; m = m * np.clip((noise(C, 9, p['seed'] % 97) - e * .8) / .25 + .15, 0, 1)
    return np.clip(m, 0, 1)


def sig(m):
    """what the eye compares: blurred silhouette at 24 px, 8 rotations x mirror"""
    im = Image.fromarray((blur(m, 3) * 255).astype(np.uint8)); out = []
    for a in range(0, 360, 45):
        r = im.rotate(a, Image.BILINEAR)
        for q in (r, r.transpose(Image.FLIP_LEFT_RIGHT)):
            v = np.asarray(q.resize((24, 24), Image.BILINEAR), np.float32).ravel(); out.append((v - v.mean()) / (v.std() + 1e-6))
    return np.array(out)


def signature(p): return np.concatenate([sig(draw(p, t))[0] for t in (.15, .35, .6)])


def corr(p_sigs, keep):
    if not keep: return 0.0
    K = np.array(keep); best = 0.0
    for r in range(16):
        v = np.concatenate([s[r] for s in p_sigs]); best = max(best, float((K @ v).max()) / v.size)
    return best


def render(job):
    i, p, hue, out = job; h = np.array([int(A.HUES[hue][j:j + 2], 16) for j in (1, 3, 5)], np.float32) / 255; bg = np.array([.05, .12, .18], np.float32)
    sheet = np.zeros((4 * C, 4 * C, 3), np.float32) + bg; ms = []
    for f in range(F):
        m = draw(p, .05 + .95 * f / (F - 1)); r_, c_ = divmod(f, 4); ms.append(m); sheet[r_ * C:(r_ + 1) * C, c_ * C:(c_ + 1) * C] = np.maximum(bg, A.lit(m, h))
    col, Ls, *_ = R.recolor(sheet); name = f"{i:03d}_{p['prim']}{'+' + p['sec'] if p['sec'] else ''}_{hue}"
    ws = Image.new('RGBA', (1024, 1024))
    for f in range(F):
        r_, c_ = divmod(f, 4); ws.paste(A.white(Ls[r_ * C:(r_ + 1) * C, c_ * C:(c_ + 1) * C]), (c_ * 256, r_ * 256))
    ws.save(f'{out}/action/{name}.png')   # white only (owner 2026-11-24): the game colours it; colour previews wasted time and space
    return dict(empty=sum(m.max() < .05 for m in ms), jump=A.jump(ms))


def main(sym_dir, out, n=140, ns=60):
    os.makedirs(out + '/action', exist_ok=True); os.makedirs(out + '/symbols', exist_ok=True)
    rng = np.random.default_rng(1125); names = list(A.HUES); keep, chosen = [], []
    els = list(EL); pairs = [(a, None) for a in els] + [(a, b) for i, a in enumerate(els) for b in els[i + 1:]]; rng.shuffle(pairs)   # unordered: a+b == b+a
    pairs.sort(key=lambda ab: (ab[0] not in ACTION and ab[1] not in ACTION) * .5 + rng.random() * .8)   # bias to slash/smash/wind elements
    cap = math.ceil(2 * n / (len(els) - len(FRAME))) + 1; use = {}
    st = dict(tried=0, rejected=0, max_corr=0.0)
    for a, b in pairs:
        if len(chosen) == n: break
        ab = [e for e in (a, b) if e]
        if any(use.get(e, 0) >= (1 if e in FRAME else cap) for e in ab): continue
        p = params(rng, a, b); st['tried'] += 1
        if (draw(p, .35) > .35).mean() < .03: st['rejected'] += 1; continue   # sparse dot scatters all read as the same faint cloud
        ss = [sig(draw(p, t)) for t in (.15, .35, .6)]; c = corr(ss, keep)
        if c >= MAXC: st['rejected'] += 1; continue
        keep.append(np.concatenate([s[0] for s in ss])); chosen.append(p); [use.__setitem__(e, use.get(e, 0) + 1) for e in ab]; st['max_corr'] = max(st['max_corr'], round(c, 3))
    st['made'] = len(chosen); st['short'] = n - len(chosen)
    with Pool(os.cpu_count()) as pool: rs = pool.map(render, [(i, p, names[(i * 7) % len(names)], out) for i, p in enumerate(chosen)])
    st['empty_frames'] = int(sum(r['empty'] for r in rs)); st['jumpy'] = [f'{i}:{r["jump"]}' for i, r in enumerate(rs) if r['jump'] >= 3]
    picks, st['symbols_max_corr'] = A.pick_symbols(sym_dir, ns)
    for f in picks: shutil.copy(f, f'{out}/symbols/')
    st['symbols'] = len(picks); print(st)


if __name__ == '__main__':
    a = sys.argv; main(a[1], a[2], int(a[3]) if len(a) > 3 else 140, int(a[4]) if len(a) > 4 else 60)
