"""Liquid VFX generator: a particle liquid simulation rendered as stacked flipbook layers (numpy + Pillow only).

Sim: particles with gravity, drag and SPH-like pressure/cohesion from a density grid (PIC velocity blend keeps the
sheet moving together), so a burst splashes, stretches into ligaments and breaks into droplets like real liquid.
Render, per frame, four layers that stack in Umbrio Sandbox (same start, same size):
  body    shaded metaball surface (normal from the density gradient: diffuse, specular, rim, inner glow)  blend normal
  drops   fast separated droplets, motion-stretched along velocity                                        blend normal
  mist    fine spray, soft and fading                                                                      blend add
  glow    wide bloom of the body in the liquid's emissive colour                                           blend add
Output: <out>/<name>_<layer>.png (8x8 grid, 64 frames), <name>_preview.png, <name>.json (manifest for import).

Usage: python liquid.py OUT [preset] [--cell 128] [--seed 1] [--check]
Presets: poison, water, blood, slime, lava.
"""
import json, math, os, sys, time
import numpy as np
from PIL import Image

PRESETS = {
    #           deep rgb               bright rgb            emissive rgb         shape     spread speed gravity cohesion n
    'poison': dict(deep=(0.05, 0.25, 0.02), bright=(0.55, 1.0, 0.15), glow=(0.35, 1.0, 0.1), shape='burst', spread=1.0, speed=1.0, g=0.55, coh=1.0, n=2600, bubbles=True),
    'water':  dict(deep=(0.02, 0.18, 0.45), bright=(0.55, 0.85, 1.0), glow=(0.2, 0.55, 1.0), shape='splash', spread=0.8, speed=1.1, g=0.8, coh=0.8, n=2600, bubbles=False),
    'blood':  dict(deep=(0.25, 0.0, 0.01), bright=(0.85, 0.08, 0.06), glow=(0.6, 0.02, 0.02), shape='spray', spread=0.6, speed=1.25, g=0.9, coh=1.1, n=2200, bubbles=False),
    'slime':  dict(deep=(0.2, 0.05, 0.35), bright=(0.85, 0.45, 1.0), glow=(0.7, 0.2, 1.0), shape='burst', spread=0.9, speed=0.8, g=0.5, coh=1.6, n=2600, bubbles=True),
    'lava':   dict(deep=(0.35, 0.03, 0.0), bright=(1.0, 0.62, 0.12), glow=(1.0, 0.35, 0.05), shape='splash', spread=0.7, speed=0.9, g=0.7, coh=1.4, n=2400, bubbles=False),
}
FRAMES, GRID, FPS, SUB = 64, 8, 30, 3


def emit(p, rng):
    n = p['n']
    if p['shape'] == 'burst':                       # radial blast from the centre
        a = rng.uniform(0, 2 * math.pi, n); s = rng.gamma(3.0, 0.33, n) * p['speed']
        vel = np.stack([np.cos(a), np.sin(a) * 0.8 + 0.6], 1) * s[:, None]
        pos = rng.normal(0, 0.02, (n, 2)) + [0.5, 0.45]
    elif p['shape'] == 'splash':                    # crown splash from an impact on the floor
        a = rng.uniform(0.15 * math.pi, 0.85 * math.pi, n); s = rng.gamma(4.0, 0.25, n) * p['speed']
        vel = np.stack([np.cos(a) * 1.2, np.sin(a) * 1.4], 1) * s[:, None]
        pos = np.stack([rng.normal(0.5, 0.04, n), rng.uniform(0.2, 0.24, n)], 1)
    else:                                           # spray: a directional jet
        a = rng.normal(0.25 * math.pi, 0.22 * p['spread'], n); s = rng.gamma(5.0, 0.22, n) * p['speed']
        vel = np.stack([np.cos(a), np.sin(a)], 1) * s[:, None]
        pos = rng.normal(0, 0.015, (n, 2)) + [0.25, 0.35]
    born = rng.uniform(0, 0.42, n) ** 1.6           # most liquid leaves in the first frames, a tail follows
    return pos.astype(np.float32), (vel * 0.9).astype(np.float32), born.astype(np.float32)


def splat(pos, w, res):
    """Bilinear scatter of weights onto a res x res grid (y up -> image rows flipped later)."""
    g = np.zeros((res, res), np.float32)
    x = np.clip(pos[:, 0] * res - 0.5, 0, res - 1.001); y = np.clip(pos[:, 1] * res - 0.5, 0, res - 1.001)
    x0, y0 = x.astype(np.int32), y.astype(np.int32); fx, fy = x - x0, y - y0
    for dx, dy, k in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        np.add.at(g, (y0 + dy, x0 + dx), w * k)
    return g


def sample(g, pos):
    res = g.shape[0]
    x = np.clip(pos[:, 0] * res - 0.5, 0, res - 1.001); y = np.clip(pos[:, 1] * res - 0.5, 0, res - 1.001)
    x0, y0 = x.astype(np.int32), y.astype(np.int32); fx, fy = x - x0, y - y0
    return (g[y0, x0] * (1 - fx) * (1 - fy) + g[y0, x0 + 1] * fx * (1 - fy) + g[y0 + 1, x0] * (1 - fx) * fy + g[y0 + 1, x0 + 1] * fx * fy)


def blur(a, k):
    for _ in range(2):
        for ax in (0, 1):
            p = np.concatenate([np.repeat(np.take(a, [0], ax), k + 1, ax), a, np.repeat(np.take(a, [-1], ax), k, ax)], ax)
            c = np.cumsum(p, ax, dtype=np.float32)
            a = (np.take(c, range(2 * k + 1, c.shape[ax]), ax) - np.take(c, range(0, c.shape[ax] - 2 * k - 1), ax)) / (2 * k + 1)
    return a


def simulate(p, seed):
    rng = np.random.default_rng(seed)
    pos, vel, born = emit(p, rng)
    R, dt = 48, 1.0 / (FPS * SUB)
    rest = p['n'] / (R * R) * 6.0
    out = []
    for f in range(FRAMES):
        t = f / FPS
        for _ in range(SUB):
            alive = born <= t
            pa, va = pos[alive], vel[alive]
            if len(pa):
                rho = blur(splat(pa, np.ones(len(pa), np.float32), R), 2)
                gy, gx = np.gradient(rho)
                # cohesion: a gentle pull up the density gradient keeps sheets and ligaments together (surface tension)
                grad = np.stack([sample(gx, pa), sample(gy, pa)], 1)
                grad /= (np.linalg.norm(grad, axis=1, keepdims=True) + 1e-3)
                dens = sample(rho, pa)
                pull = grad * (p['coh'] * 0.35 * np.clip(1.0 - dens / (rest + 1e-6), 0, 1))[:, None]
                # PIC blend: neighbours share velocity (viscous, sheets stay coherent)
                mvx = blur(splat(pa, va[:, 0], R), 2) / (rho + 1e-3); mvy = blur(splat(pa, va[:, 1], R), 2) / (rho + 1e-3)
                pic = np.stack([sample(mvx, pa), sample(mvy, pa)], 1)
                va = va * 0.92 + pic * 0.08 + pull * dt
                va[:, 1] -= p['g'] * dt * 1.6
                va *= (1 - 0.2 * dt)
                pa = pa + va * dt * 0.8
                floor = pa[:, 1] < 0.08                 # bounce + spread on the ground
                va[floor, 1] = np.abs(va[floor, 1]) * 0.25; va[floor, 0] *= 0.85; pa[floor, 1] = 0.08
                pos[alive], vel[alive] = pa, va
        alive = (born <= t) & (pos[:, 0] > 0.01) & (pos[:, 0] < 0.99) & (pos[:, 1] < 0.99)   # off-frame drops leave, never pile on the edge
        out.append((pos[alive].copy(), vel[alive].copy()))
    return out


def shade(dens, p, cell, life):
    """Metaball body: alpha from density, normal from its gradient, light from the upper left."""
    a = np.clip((dens - 0.35) / 0.5, 0, 1); a = a * a * (3 - 2 * a)
    gy, gx = np.gradient(blur(dens, max(1, cell // 64)))
    nz = np.full_like(dens, 0.35); n = np.stack([-gx, gy, nz], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True) + 1e-6
    L = np.array([-0.45, 0.6, 0.66], np.float32); L /= np.linalg.norm(L)
    diff = np.clip((n * L).sum(-1), 0, 1)
    H = L + np.array([0, 0, 1], np.float32); H /= np.linalg.norm(H)
    spec = np.clip((n * H).sum(-1), 0, 1) ** 40
    thick = np.clip(dens / 2.5, 0, 1)
    col = np.array(p['deep'])[None, None] * (0.5 + thick[..., None]) + np.array(p['bright'])[None, None] * (diff[..., None] * (1 - thick[..., None] * 0.6))
    col = col + spec[..., None] * 0.9 + np.array(p['glow'])[None, None] * (1 - thick[..., None]) * 0.25 * a[..., None]
    return np.concatenate([np.clip(col, 0, 1), (a * life)[..., None]], -1)


def render(frames, p, cell, seed):
    rng = np.random.default_rng(seed + 7)
    layers = {k: [] for k in ('body', 'drops', 'mist', 'glow')}
    for i, (pos, vel) in enumerate(frames):
        life = 1.0 - max(0.0, (i - FRAMES * 0.72) / (FRAMES * 0.28)) ** 1.5      # ends by thinning into drops/mist, never a cut
        if len(pos) == 0:
            for k in layers: layers[k].append(np.zeros((cell, cell, 4), np.float32))
            continue
        local = sample(blur(splat(pos, np.ones(len(pos), np.float32), 48), 1), pos)
        dense = local > np.percentile(local, 30)
        d = blur(splat(pos[dense], np.ones(dense.sum(), np.float32), cell), max(1, cell // 40)) * (cell / 128) ** 2 * 0.9
        body = shade(d[::-1], p, cell, life)
        # drops: separated fast particles, streaked along their velocity
        sep = ~dense
        dp = np.zeros((cell, cell), np.float32)
        for s in np.linspace(0, 1, 5):
            dp += splat(pos[sep] - vel[sep] * s * 0.025, np.ones(sep.sum(), np.float32), cell)
        dp = blur(dp, max(1, cell // 128)) * 1.8
        da = np.clip(dp, 0, 1)[::-1] * life
        dcol = np.broadcast_to(np.array(p['bright'], np.float32), (cell, cell, 3)) * (0.75 + 0.25 * da[..., None])
        drops = np.concatenate([dcol, da[..., None]], -1)
        # mist: fine spray jittered around fast particles, fading
        fast = np.linalg.norm(vel, axis=1) > np.percentile(np.linalg.norm(vel, axis=1), 60)
        mp = pos[fast] + rng.normal(0, 0.012, (fast.sum(), 2)).astype(np.float32)
        m = blur(splat(mp, np.ones(len(mp), np.float32), cell), max(2, cell // 32))[::-1] * (cell / 128) ** 2 * 0.25 * life
        mist = np.concatenate([np.broadcast_to(np.array(p['glow'], np.float32), (cell, cell, 3)), np.clip(m, 0, 0.6)[..., None]], -1)
        # glow: wide bloom of the body
        gl = blur(body[..., 3], max(3, cell // 14)) * 0.55
        glow = np.concatenate([np.broadcast_to(np.array(p['glow'], np.float32), (cell, cell, 3)), gl[..., None]], -1)
        if p.get('bubbles'):                         # toxic bubbles popping on the surface
            b = rng.random((cell, cell)) < 0.0015 * (body[..., 3] > 0.6)
            ring = blur(b.astype(np.float32), 1) * 6
            body[..., :3] = np.clip(body[..., :3] + ring[..., None] * np.array(p['bright']) * 0.6, 0, 1)
        for k, v in (('body', body), ('drops', drops), ('mist', mist), ('glow', glow)): layers[k].append(v)
    return layers


def sheet(frames, path):
    cell = frames[0].shape[0]
    out = np.zeros((cell * GRID, cell * GRID, 4), np.uint8)
    for i, f in enumerate(frames):
        r, c = divmod(i, GRID)
        rgba = np.clip(f, 0, 1)
        out[r * cell:(r + 1) * cell, c * cell:(c + 1) * cell] = (rgba * 255 + 0.5).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(path, compress_level=6)


def composite(layers):
    """Stack layers like the Sandbox does (normal over, add on top) for a preview."""
    out = []
    for i in range(FRAMES):
        rgb = np.zeros(layers['body'][i].shape[:2] + (3,), np.float32)
        for k in ('mist', 'body', 'drops'):
            L = layers[k][i]; a = L[..., 3:]
            rgb = rgb + L[..., :3] * a if k == 'mist' else rgb * (1 - a) + L[..., :3] * a
        rgb = rgb + layers['glow'][i][..., :3] * layers['glow'][i][..., 3:]
        out.append(np.concatenate([np.clip(rgb, 0, 1), np.ones(rgb.shape[:2] + (1,), np.float32)], -1))
    return out


def build(out, preset='poison', cell=128, seed=1):
    t0 = time.time()
    p = PRESETS[preset]
    os.makedirs(out, exist_ok=True)
    layers = render(simulate(p, seed), p, cell, seed)
    files = []
    for k, blend in (('mist', 'add'), ('body', 'normal'), ('drops', 'normal'), ('glow', 'add')):
        f = f'{preset}_{k}.png'; sheet(layers[k], os.path.join(out, f)); files.append({'file': f, 'layer': k, 'blend': blend})
    sheet(composite(layers), os.path.join(out, f'{preset}_preview.png'))
    alpha = np.array([[fr[..., 3].mean() for fr in layers[k]] for k in ('body', 'drops')])
    manifest = {'name': f'liquid {preset}', 'preset': preset, 'grid': GRID, 'frames': FRAMES, 'fps': FPS, 'life': round(FRAMES / FPS, 3),
                'cell': cell, 'layers': files,
                'import': 'Umbrio Sandbox: add each sheet as a flipbook effect with the same start and size, in this order (mist, body, drops, glow); drag onto the animation row.'}
    with open(os.path.join(out, f'{preset}.json'), 'w') as fh: json.dump(manifest, fh, indent=2)
    stats = {'seconds': round(time.time() - t0, 1), 'empty_frames': int((alpha.sum(0) < 1e-4).sum()),
             'max_step_jump': round(float(np.abs(np.diff(alpha, axis=1)).max() / (alpha.max() + 1e-6)), 3)}
    return manifest, stats


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(1)
    opt = lambda n, d: type(d)(a[a.index(n) + 1]) if n in a else d
    pos = [x for i, x in enumerate(a) if not x.startswith('--') and (i == 0 or not a[i - 1].startswith('--'))]
    preset = pos[1] if len(pos) > 1 else 'poison'
    if preset not in PRESETS: print(f'unknown preset {preset}; have {", ".join(PRESETS)}'); sys.exit(1)
    m, s = build(pos[0], preset, opt('--cell', 128), opt('--seed', 1))
    print(json.dumps({'out': pos[0], **s, 'layers': [l['file'] for l in m['layers']]}))
    if '--check' in a and (s['seconds'] > 60 or s['empty_frames'] > 2 or s['max_step_jump'] > 0.5):
        print('CHECK FAILED: over 60 s, empty frames or choppy motion'); sys.exit(2)
