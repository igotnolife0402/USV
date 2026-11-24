#!/usr/bin/env python3
"""Roblox flipbook VFX: python3 vfx.py OUT <preset|preset:key=v,key=v|a+b+c+d|all> [--name ID] [--seed N] [--check]   (README "Recipes", "Layers")
Writes OUT/<preset>.png (one 1024 px sheet), OUT/<preset>.json (its emitter settings) and OUT/VFXLibrary.lua (all built
presets, for VFX.lua). --check also writes OUT/<preset>.jpg (sheet over a dark and a light sky), prints timing and the
preset's own checks, and fails any preset over 60 s (owner's cap; VFX_NO_CAP=1 skips it on slow CI runners)."""
import sys, os, json, time, math
import numpy as np
import img, fluid, blackhole, kamehameha, lightsaber, slash, burst

S, F = 128, 64   # frame px, frames: 8x8 grid -> 1024 px sheet (Roblox max); 64 frames keep motion smooth


def explosion(seed):
    """Fireball that bursts, burns out into a rising mushroom of soot. One-shot, 64 frames."""
    N, steps = 80, 36
    P = dict(expand=1.4, burn=0.12, ignite=0.15, heat=0.8, soot=0.8, buoy=0.09, weight=0.004, vort=0.45, turb=0.16, drag=0.965, cool=0.945, fade=0.996,
             sigma=0.7, shadow=1.0, k0=700, k1=1700, k_ref=2000, glow_at=0.12, glow=0.5, flame=6.0, flame_k=500, smoke=(0.30, 0.28, 0.26), amb=0.3, sun=0.9, exposure=1.0)
    sim = fluid.Sim(N, seed)
    c = np.array([N / 2, N * 0.36, N / 2], np.float32)
    d = np.stack([sim.Z - c[0], sim.Y - c[1], sim.X - c[2]])
    r = np.sqrt((d ** 2).sum(0)) + 1e-3
    lump = fluid.noise_tile(N, seed)                       # uneven charge: the fireball never reads as a sphere
    pockets = fluid.noise_tile(N, seed + 3, 10)            # fuel pockets: patchy burning, bright filaments
    R0 = N * 0.14
    sim.turb = fluid.curl_noise(N, seed + 7, 8)
    core = img.smooth(R0, R0 * 0.6, r * (0.75 + 0.5 * lump))
    sim.fuel = (core * (0.3 + 1.4 * pockets ** 2) * (0.6 + 0.8 * lump)).astype(np.float32)
    sim.T = (core * 1.2).astype(np.float32)
    sim.flame = (core * 0.25).astype(np.float32)          # the detonation flash
    sim.v = sim.turb * (1.2 * core)[None]                 # the charge is already churning when it goes off
    sim.blast = (core * (0.7 + 0.6 * lump)).astype(np.float32), [1.3, 1.0, 0.7, 0.45, 0.25, 0.12]
    when = [steps * (f / (F - 1)) ** 1.25 for f in range(F)]     # eased: the burst is fast, the cloud slow
    keys = [fluid.render(sim, S, P, flow=True)]                 # key frames: one real render per sim step
    for s in range(steps):
        sim.step(P)
        keys.append(fluid.render(sim, S, P, flow=True))
    frames = []
    for w in when:                                              # every other frame is a motion tween between two keys
        s = min(int(w), steps - 1); t = w - s
        C, A = keys[s][:2] if t < 1e-3 else keys[s + 1][:2] if t > 1 - 1e-3 else fluid.tween(keys[s], keys[s + 1], t)
        frames.append(img.finish(C, A))
    entry = dict(FlipbookLayout='Grid8x8', FlipbookMode='OneShot', Lifetime=2.0, LightEmission=0.3, LightInfluence=0,
                 SizeStuds=[8, 20], Orientation='FacingCamera')
    return frames, entry, {}


PRESETS = {'explosion': explosion, 'black-hole': blackhole.black_hole,
           'kamehameha-charge': kamehameha.charge, 'kamehameha-beam': kamehameha.beam,
           'lightsaber-blade': lightsaber.blade, 'slash': slash.slash, 'embers': slash.embers, 'flame-arc': slash.flame_arc,
           'dragon': slash.dragon, 'shock': burst.shock, 'glints': burst.glints}
# Named stacks: 4 layered recipes, bottom first (owner: one effect = 4 layers, it reads livelier). `vfx.py OUT <name>` builds one.
STACKS = {'dragon-swing': 'flame-arc:radius=0.3,width=0.04,k0=700,k1=1100,k_ref=1300,density=0.55,flame=1.1'
                          '+dragon:radius=0.3,scale=1.55,overshoot=26,gain=1.35'
                          '+slash:radius=0.3,width=0.03,decay=6,gain=0.55,core=1.2'
                          '+embers:radius=0.3,n=150,kelvin=2300,speed=5,cool=18,gravity=0.07,gain=2',
          # fire sword slash: flame body, dim orange halo, white-hot crisp edge (hero), cooling embers that linger
          'fire-slash': 'flame-arc:width=0.08,k0=750,k1=1200,k_ref=1400,density=0.9,flame=1.2,soot=0.4'
                        '+slash:element=Na,width=0.13,decay=14,core=0,gain=0.3'
                        '+slash:element=Na,width=0.035,decay=6,core=1.6,gain=1.0'
                        '+embers:n=180,kelvin=2400,speed=5,cool=20,gravity=0.06,drag=0.92,gain=1.8',
          # glass or crystal breaking: wave + flash, big fast glints, fine glints, slow lingering dust
          'crystal-burst': 'shock:grow=0.32,width=0.045,core=1.2'
                           '+glints:n=90,speed=4.2,size=1,shine=40,life_f=26,gain=1.3'
                           '+glints:n=220,speed=2.6,size=1,shine=80,life_f=34,gain=1.0'
                           '+glints:n=160,speed=0.9,size=1,shine=20,life_f=70,gravity=0.015,drag=0.97,gain=0.55'}
CAP_S = 60


def preview(sheet, path):
    from PIL import Image
    im = Image.fromarray(sheet, 'RGBA')
    tiles = []
    for col in ((8, 10, 16, 255), (150, 175, 210, 255)):
        bg = Image.new('RGBA', im.size, col); bg.alpha_composite(im); tiles.append(bg.convert('RGB'))
    out = Image.new('RGB', (im.width * 2, im.height)); out.paste(tiles[0], (0, 0)); out.paste(tiles[1], (im.width, 0))
    out.resize((out.width // 2, out.height // 2), Image.LANCZOS).save(path, quality=88)


def recipe(spec):
    """'preset' or 'preset:key=value,key=value' (a new effect is a recipe of a preset's params, never new code) -> (fn, kwargs, id).
    Values: numbers or names (element=Ne); the id is the recipe with ':' '=' ',' turned into '-'."""
    name, _, rest = spec.partition(':'); kw = {}
    for part in filter(None, rest.split(',')):
        k, v = part.split('=')
        try: kw[k] = float(v)
        except ValueError: kw[k] = v
    return PRESETS[name], kw, spec.replace(':', '-').replace('=', '-').replace(',', '-').replace('+', '_')


def stack(layers):
    """Layers (bottom first) of straight-alpha uint8 frames -> one, by premultiplied 'over' per frame (owner: effects are 4 layers)."""
    out = []
    for fr in zip(*layers):
        C = np.zeros(fr[0].shape[:2] + (3,), np.float32); A = np.zeros(fr[0].shape[:2], np.float32)
        for f in fr:
            a = f[..., 3].astype(np.float32) / 255; c = f[..., :3].astype(np.float32) / 255 * a[..., None]
            C = c + C * (1 - a[..., None]); A = a + A * (1 - a)
        out.append(img.finish(C, A, edge=0.07))
    return out


def build(out, spec, seed, check, name=None):
    t0 = time.time()
    if spec in STACKS: name, spec = name or spec, STACKS[spec]
    parts = [recipe(s) for s in spec.split('+')]
    runs = [fn(seed + i * 17, **kw) for i, (fn, kw, _) in enumerate(parts)]
    name = name or '_'.join(p[2] for p in parts)
    frames = runs[0][0] if len(runs) == 1 else stack([r[0] for r in runs])
    entry = dict(runs[0][1], Lifetime=max(r[1]['Lifetime'] for r in runs))
    checks = {k: v for r in runs for k, v in r[2].items()}
    if len(runs) > 1: checks['layers'] = len(runs)
    sh = img.sheet(frames, os.path.join(out, name + '.png'))
    entry = dict(id=name, file=name + '.png', frames=len(frames), framePx=frames[0].shape[0], sheetPx=sh.shape[0], **entry)
    json.dump(entry, open(os.path.join(out, name + '.json'), 'w'), indent=1)
    dt = time.time() - t0
    if check:
        a = np.stack(frames).astype(np.float32)
        v = np.concatenate([a[..., :3] * a[..., 3:] / 255, a[..., 3:]], -1)       # what is seen: colour under alpha 0 is invisible
        st = np.array([np.abs(v[i + 1] - v[i]).mean() for i in range(len(v) - 1)])
        mass = v[..., 3].mean((1, 2)); act = np.array([max(mass[i], mass[i + 1]) >= 0.05 * mass.max() for i in range(len(st))])   # frames with content only
        sa = st[act] if act.any() else st; floor = 0.25 * np.median(sa)
        jump = max([max(sa[i], sa[i + 1]) / max(min(sa[i], sa[i + 1]), floor) for i in range(len(sa) - 1)] or [1.0])    # a pop: one step many times its neighbour
        checks = dict(checks, max_step_jump=round(float(jump), 2),                                                      # smooth motion (loops, eased swings, bursts): under ~2.5
                      thin_stroke_pct=thin_pct(a))                                                          # bold lines: keep under ~10
        preview(sh, os.path.join(out, name + '.jpg'))
        print(json.dumps({'preset': name, 'seconds': round(dt, 1), 'png_kb': os.path.getsize(os.path.join(out, name + '.png')) // 1000, **checks}))
    return entry, dt


def overview(out, ids, cell=128):
    """One image of every preset: a row each, frames 0/21/42/63 over a dark sky."""
    from PIL import Image
    im = Image.new('RGB', (cell * 4, cell * len(ids)), (8, 10, 16))
    for r, i in enumerate(ids):
        sh = Image.open(os.path.join(out, i + '.png')).convert('RGBA'); g = 8; S = sh.width // g
        for c, f in enumerate((0, 21, 42, 63)):
            fr = sh.crop(((f % g) * S, (f // g) * S, (f % g + 1) * S, (f // g + 1) * S)).resize((cell, cell), Image.LANCZOS)
            bg = Image.new('RGBA', fr.size, (8, 10, 16, 255)); bg.alpha_composite(fr); im.paste(bg.convert('RGB'), (c * cell, r * cell))
    im.save(os.path.join(out, 'overview.jpg'), quality=88)


def thin_pct(a):
    """Share of bright pixels in strokes under 3 px wide (they vanish under a 3x3 opening), over all frames."""
    lum = (a[..., :3].max(-1) * a[..., 3] / 65025) > 0.25
    def f3(m, op):
        p = np.pad(m, ((0, 0), (1, 1), (1, 1)), mode='edge'); out = m.copy()
        for dy in (0, 1, 2):
            for dx in (0, 1, 2):
                out = op(out, p[:, dy:dy + m.shape[1], dx:dx + m.shape[2]])
        return out
    thin = lum & ~f3(f3(lum, np.minimum), np.maximum)
    return round(float(thin.sum() / max(lum.sum(), 1) * 100), 1)


def lua(v):
    if v is None: return 'nil'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return repr(v)
    if isinstance(v, (list, tuple)): return '{' + ', '.join(lua(x) for x in v) + '}'
    return '"' + str(v).replace('"', '\\"') + '"'


if __name__ == '__main__':
    a = sys.argv[1:]
    out, which = a[0], a[1]
    seed = int(a[a.index('--seed') + 1]) if '--seed' in a else 1
    os.makedirs(out, exist_ok=True)
    slow = []
    for n in ([*PRESETS, *STACKS] if which == 'all' else [which]):
        e, dt = build(out, n, seed, '--check' in a, a[a.index('--name') + 1] if '--name' in a else None)
        if dt > CAP_S:
            slow.append(f'{n} {dt:.0f}s')
    lib = [json.load(open(os.path.join(out, f))) for f in sorted(os.listdir(out)) if f.endswith('.json')]
    rows = [f'\t["{e["id"]}"] = {{ ' + ', '.join(f'{k} = {lua(v)}' for k, v in e.items()) + ', AssetId = 0 },' for e in lib]
    open(os.path.join(out, 'VFXLibrary.lua'), 'w').write('-- Generated by vfx.py. Upload each PNG and paste its id into AssetId.\nreturn {\n' + '\n'.join(rows) + '\n}\n')
    if '--check' in a and which == 'all':
        overview(out, [e['id'] for e in lib])
    if slow and '--check' in a and not os.environ.get('VFX_NO_CAP'):
        sys.exit('Failed: over the 60 s cap: ' + ', '.join(slow))
