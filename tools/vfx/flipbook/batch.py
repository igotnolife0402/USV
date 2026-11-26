"""Build a library of white flipbook sheets in parallel, then verify every one (2026-11-24, owner: 100 white VFX, faster, same quality).
  python3 batch.py OUT [--jobs 4] [--only shock,slash] [--color] [--bands 5[,10]]
OUT gets <family>-vNN.png/.json/.jpg, VFXLibrary.lua and batch.json (seconds + checks per sheet). Exit 1 if any sheet fails.
A variant is a recipe (preset params + seed), never new code: 10 families x 10 variants, v01 = the tuned default."""
import io, json, os, sys, time, contextlib
from concurrent.futures import ProcessPoolExecutor
os.environ.setdefault('OMP_NUM_THREADS', '1')          # one numpy thread per worker: the pool owns the cores
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import vfx  # noqa: E402

def spread(i, lo, hi):
    """Variant i (0..9) -> value spread evenly lo..hi, v01 (i=0) in the middle so the default stays the default."""
    order = [4, 0, 9, 2, 7, 5, 1, 8, 3, 6][i]
    return round(lo + (hi - lo) * order / 9, 3)

def fam(n, make):
    return [make(i) for i in range(n)]

# family -> 10 specs. Ranges stay inside each preset's tuned window (tested 2026-11-24: wider ranges failed the gate:
# glints size=1 / speed 4 thin 10-15 %, flame-arc cool k0<900 thin 10-16 %, slash width .08 jump 4.2, shock grow .24 jump 4.2).
FAMILIES = {
    'shock': fam(10, lambda i: f'shock:grow={spread(i, .27, .38)},width={spread(9 - i, .035, .065)},core={spread(i, .8, 1.2)}'),
    'glints': fam(10, lambda i: f'glints:size=2,n={int(spread(i, 150, 240))},speed={spread(9 - i, 2.4, 3.4)},spin={spread(i, .2, .5)}'),
    'slash': fam(10, lambda i: f'slash:radius={spread(i, .29, .39)},width={spread(9 - i, .095, .13)},start={int(spread(i, 135, 165))},end={int(spread(9 - i, -42, -24))}'),
    'embers': fam(10, lambda i: f'embers:n={int(spread(i, 85, 150))},speed={spread(9 - i, 3.6, 5.4)},gravity={spread(i, .08, .18)}'),
    'flame-arc': fam(10, lambda i: f'flame-arc:radius={spread(i, .3, .37)},k0={int(spread(9 - i, 950, 1100))},k1={int(spread(i, 1600, 1800))},rise={spread(i, .003, .005)}'),
    'explosion': fam(10, lambda i: 'explosion'),
    'kamehameha-charge': fam(10, lambda i: 'kamehameha-charge'),
    'lightsaber-blade': fam(10, lambda i: f'lightsaber-blade:core={spread(i, .035, .055)},sheath={spread(9 - i, .1, .14)},shimmer={spread(i, .7, 1.3)}'),
    'dragon-swing': fam(10, lambda i: vfx.STACKS['dragon-swing'].replace('scale=1.55', f'scale={spread(i, 1.4, 1.7)}').replace('overshoot=26', f'overshoot={int(spread(9 - i, 18, 32))}')),
    'crystal-burst': fam(10, lambda i: vfx.STACKS['crystal-burst'].replace('speed=4.2', f'speed={spread(i, 3.6, 4.8)}').replace('grow=0.32', f'grow={spread(9 - i, .28, .36)}')),
}
SLOW_FIRST = ['explosion', 'dragon-swing']             # longest jobs start first so the pool drains evenly
JOBS = [(f'{f}-v{i + 1:02d}', spec, 1 + i * 7) for f in sorted(FAMILIES, key=lambda f: f not in SLOW_FIRST)
        for i, spec in enumerate(FAMILIES[f])]

TRIES = 3   # a seed whose sparks happen to pop (one bright twinkle, one long arc) is rebuilt on the next seed; same recipe

def one(job):
    name, spec, seed, out, color, nb = job
    for k in range(TRIES):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            _, dt = vfx.build(out, spec, seed + 1000 * k, True, name, color, nb)
        line = [l for l in buf.getvalue().splitlines() if l.startswith('{')][-1]
        r = verify(out, dict(json.loads(line), id=name, spec=spec, seed=seed + 1000 * k, seconds=round(dt, 1), tries=k + 1), color)
        if not r['fail']: break
    return r

def verify(out, r, color):
    """Outside checks on the written PNG, not on what the builder believes it wrote."""
    a = np.asarray(Image.open(os.path.join(out, r['id'] + '.png')).convert('RGBA')).astype(np.float32) / 255
    vis = a[..., 3] > 0.05
    rgb = a[..., :3][vis]
    sat = float((rgb.max(1) - rgb.min(1)).mean()) if len(rgb) else 1.0
    bad = []
    if not color and sat >= 0.02: bad.append(f'saturation {sat:.3f}')
    if not vis.any(): bad.append('no alpha')
    if a.shape[:2] != (1024, 1024): bad.append(f'sheet {a.shape[:2]}')
    if r.get('max_step_jump', 0) >= 3: bad.append(f"step jump {r['max_step_jump']}")
    if r.get('thin_stroke_pct', 0) >= 10: bad.append(f"thin {r['thin_stroke_pct']}")
    if r['seconds'] > vfx.CAP_S: bad.append(f"{r['seconds']} s")
    if not color:   # band textures must rebuild the sheet: sum_k grey_k*top_k*alpha_k ~= grey*alpha, sum_k alpha_k ~= alpha
        e = json.load(open(os.path.join(out, r['id'] + '.json')))
        for n, b in e['bands'].items():
            lum, al = np.zeros(a.shape[:2], np.float32), np.zeros(a.shape[:2], np.float32)
            mass = []
            for f, top in zip(b['files'], b['tops']):
                t = np.asarray(Image.open(os.path.join(out, f)).convert('RGBA')).astype(np.float32) / 255
                lum += t[..., 0] * top * t[..., 3]; al += t[..., 3]; mass.append(float(t[..., 3].sum()))
            el = float(np.abs(lum - a[..., 0] * a[..., 3])[vis].mean() * 255); ea = float(np.abs(al - a[..., 3])[vis].mean() * 255)
            r = dict(r, **{f'band{n}_err': round(max(el, ea), 2), f'band{n}_minshare': round(min(mass) / max(sum(mass), 1e-6), 3)})
            if max(el, ea) > 2: bad.append(f'bands{n} rebuild err {max(el, ea):.2f}/255')
            if min(mass) / max(sum(mass), 1e-6) < 0.01: bad.append(f'bands{n} empty layer')
        if e.get('glow'):   # halo must cover more than the sheet (that is its job) and not be empty
            lit = a[..., 0] * a[..., 3] > 8 / 255   # where the sheet gives light (faint alpha haze is not light)
            g = np.asarray(Image.open(os.path.join(out, e['glow'])).convert('RGBA'))[..., 3] > 8
            r = dict(r, glow_spread=round(float(g.sum() / max(lit.sum(), 1)), 2))
            if g.sum() < 1.1 * lit.sum(): bad.append(f"glow spread {r['glow_spread']}")
    return dict(r, saturation=round(sat, 4), visible_pct=round(float(vis.mean() * 100), 1), fail=bad)

if __name__ == '__main__':
    a = sys.argv[1:]
    out = os.path.abspath(a[0]); os.makedirs(out, exist_ok=True)
    n = int(a[a.index('--jobs') + 1]) if '--jobs' in a else 4
    only = a[a.index('--only') + 1].split(',') if '--only' in a else None
    color = '--color' in a
    nb = tuple(int(x) for x in a[a.index('--bands') + 1].split(',')) if '--bands' in a else (5,)
    jobs = [(nm, sp, sd, out, color, nb) for nm, sp, sd in JOBS if not only or nm.rsplit('-v', 1)[0] in only]
    t0 = time.time()
    with ProcessPoolExecutor(n) as ex:
        res = list(ex.map(one, jobs))
    wall = time.time() - t0
    vfx.library(out)
    fails = [r for r in res if r['fail']]
    json.dump(dict(wall=round(wall, 1), jobs=n, sheets=res), open(os.path.join(out, 'batch.json'), 'w'), indent=1)
    cpu = sum(r['seconds'] for r in res)
    print(f'{len(res)} sheets  wall {wall:.0f} s  ({wall / len(res):.1f} s each, serial sum {cpu:.0f} s)  reseeded {sum(r["tries"] > 1 for r in res)}  '
          f'max {max(r["seconds"] for r in res)} s  fails {len(fails)}')
    for r in fails: print('  FAIL', r['id'], '; '.join(r['fail']))
    sys.exit(1 if fails else 0)
