"""Supernova Duel III (2026-11-24): v2's choreography and camera with every effect made new for this cutscene, ~5x as many.
Swing trails are generated from each swing's real blade-tip path (FK plane + circle fit -> slash/flame-arc/embers recipe, flat
card in the swing plane); every other sheet is a fresh recipe coloured by real emission lines (Kaito Ar cyan, Ren Li crimson,
supernova Na). No preset sheet from v1/v2 is reused.

  python3 build.py WORK     (needs WORK/A2 WORK/B2 WORK/out2 from supernova2/build.py; writes WORK/fx3, WORK/out3, spec3.json here)"""
# @style: helper
import json, math, os, subprocess, sys, hashlib
from concurrent.futures import ThreadPoolExecutor
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.dirname(HERE); sys.path.insert(0, D)
from fk import Tab, segdist, pdist

WORK = os.path.abspath(sys.argv[1]); VFX = os.path.join(D, '..', '..', '..', 'vfx', 'flipbook', 'vfx.py'); FX3 = os.path.join(WORK, 'fx3')
os.makedirs(FX3, exist_ok=True)
S2 = json.load(open(os.path.join(D, 'supernova2', 'spec2.json')))
T = Tab(f'{WORK}/out2/studio/project.json', f'{WORK}/out2/studio/geo')
EL = {'a': 'Ar', 'b': 'Li'}; K = {'a': (7000, 14000), 'b': (900, 1600)}          # emission line; flame-arc / ember kelvin
C = [('c1', 3.6, 'b', True), ('c2', 5.4, 'a', False), ('c3', 5.85, 'b', False), ('c4', 6.3, 'a', False), ('c5', 7.0, 'b', False), ('c6', 12.4, 'a', True)]
SWINGS = [(cid, t, att) for cid, t, att, _ in C] + [('flame', 9.05, 'b')]
R3 = lambda v: [round(float(x), 3) for x in v]


def euler_xyz(R):
    """three.js 'XYZ' Euler (degrees) of a rotation matrix (R = Rx Ry Rz, as fk.rot builds it)."""
    y = math.asin(max(-1, min(1, R[0, 2]))); x = math.atan2(-R[1, 2], R[2, 2]); z = math.atan2(-R[0, 1], R[0, 0])
    return [round(math.degrees(v), 2) for v in (x, y, z)]


def fit_swing(tag, t, t0=None, t1=None):
    """Trace the tip over [t0, t1] (default the strike, t-0.28..t), fit plane + circle (Kasa); recipe geometry + card placement."""
    t0 = t - 0.28 if t0 is None else t0; t1 = t if t1 is None else t1
    ts = np.linspace(t0, t1, 41); tip, base = [], []
    for tt in ts:
        b, q = T.blade(tag, tt); tip.append(q); base.append(b + (q - b) * 0.35)
    TP = np.array(tip); m = TP.mean(0); _, sv, Vt = np.linalg.svd(TP - m); e1, e2 = Vt[0], Vt[1]
    resid = float(np.abs((TP - m) @ Vt[2]).max())                                   # how far the tip leaves the plane
    xy = np.stack([(TP - m) @ e1, (TP - m) @ e2], 1)
    A = np.c_[2 * xy, np.ones(len(xy))]; cc = np.linalg.lstsq(A, (xy ** 2).sum(1), rcond=None)[0][:2]
    ang = lambda e1, e2, cc: np.unwrap(np.arctan2((TP - m) @ e2 - cc[1], (TP - m) @ e1 - cc[0]))
    ph = ang(e1, e2, cc)
    if ph[-1] > ph[0]: e1 = -e1; cc = np.array([-cc[0], cc[1]]); ph = ang(e1, e2, cc)   # the generator sweeps clockwise
    ctr = m + cc[0] * e1 + cc[1] * e2; Rt = float(np.linalg.norm(TP - ctr, axis=1).mean()); Rb = float(np.linalg.norm(np.array(base) - ctr, axis=1).mean())
    span = math.degrees(ph[0] - ph[-1]); life = round(t1 - t0 + 0.35, 3); size = round(3.6 * Rt, 2)
    prog = '_'.join(f'{(ph[0] - v) / max(ph[0] - ph[-1], 1e-6):.3f}' for v in ph[::4])
    geo = dict(start=round(math.degrees(ph[0]) % 360, 1), end=round((math.degrees(ph[0]) - span) % 360, 1), radius=round(Rt / size, 3),
               sweep=round((t1 - t0) / life * 64, 1), delay=0, cx=0.5, cy=0.5, prog=prog)
    W = round(0.5 * (Rt - Rb) / size, 3)
    X = e1 / np.linalg.norm(e1); Y = np.cross(e1, e2); Y /= np.linalg.norm(Y); Z = np.cross(X, Y)
    rot = euler_xyz(np.stack([X, Y, Z], 1))
    return dict(geo=geo, W=W, ctr=R3(ctr), size=size, rot=rot, life=life, t0=round(t0, 3), resid=resid, span=span)


kv = lambda d: ','.join(f'{a}={b}' for a, b in d.items())
REC, CARDS = {}, []
fits = {}
def split(sid, tag, t, t0, t1, depth=0):          # one planar arc per card: halve any piece that leaves its plane by >= 0.1
    f = fit_swing(tag, t, t0, t1)
    if f['resid'] < 0.1 or depth >= 3: return [(sid, tag, f)]
    m = (t0 + t1) / 2; return split(sid + 'a', tag, t, t0, m, depth + 1) + split(sid + 'b', tag, t, m, t1, depth + 1)
ARCS = [a for sid, t, tag in SWINGS for a in split(sid, tag, t, t - 0.28, t)]
SW_TAG = {}
for sid, tag, f in ARCS:
    fits[sid] = f; SW_TAG[sid] = tag; g = f['geo']; k0, k1 = K[tag]
    REC[f'sd3-trail-{sid}'] = (f"flame-arc:{kv({**g, 'width': round(f['W'] * 0.6, 3), 'k0': k0, 'k1': k1, 'k_ref': k1 * 1.1, 'density': 0.55})}"
                               f"+slash:{kv({**g, 'element': EL[tag], 'width': round(f['W'] * 0.45, 3), 'decay': 6, 'core': 1.2})}"
                               f"+embers:{kv({**g, 'n': 140, 'kelvin': k1, 'speed': 5, 'cool': 16, 'gravity': 0.07})}")
for tag in 'ab':
    e = EL[tag]
    REC[f'sd3-impact-{tag}'] = f'shock:element={e},width=0.05+glints:element={e},n=220,speed=4.5+slash:element={e},width=0.05'
    REC[f'sd3-aura-{tag}'] = f'kamehameha-charge:element={e}'
    REC[f'sd3-ring-{tag}'] = f'shock:element={e},width=0.04,core=0.6'
    REC[f'sd3-spark-{tag}'] = f'glints:element={e},n=300,gravity=0.12'
    REC[f'sd3-streak-{tag}'] = f'slash:element={e},start=200,end=160,radius=0.46,width=0.03,sweep=10,decay=8'
REC['sd3-dust'] = 'shock:element=Na,width=0.08,core=0.3'
REC['sd3-beam-a'] = 'kamehameha-beam:element=Ar'
REC['sd3-flash'] = 'shock:element=Na+glints:element=Na'
REC['sd3-nova'] = 'shock:element=Na,grow=0.5+glints:element=Na,n=400+kamehameha-charge:element=Na'
REC['sd3-smoke'] = 'explosion'


def build(item):
    name, rec = item
    if os.path.exists(os.path.join(FX3, name + '.png')): return name, 'cached'
    a = [sys.executable, VFX, FX3, rec, '--name', name] + (['--seed', '7'] if name == 'sd3-smoke' else [])
    r = subprocess.run(a, capture_output=True, text=True)
    return name, 'ok' if r.returncode == 0 else 'FAIL ' + (r.stderr.strip().splitlines() or ['?'])[-1][:160]
with ThreadPoolExecutor(4) as ex:
    res = list(ex.map(build, REC.items()))
bad = [r for r in res if r[1].startswith('FAIL')]
print(f'sheets: {len(res)} ({sum(r[1] == "ok" for r in res)} built, {sum(r[1] == "cached" for r in res)} cached)'); [print(' ', *b) for b in bad]
if bad: sys.exit('Failed: sheets')
for n in REC:                                    # duel.py reads <preset>.json next to the sheet: write one per new sheet
    if not os.path.exists(os.path.join(FX3, n + '.json')): json.dump({'id': n, 'file': n + '.png', 'frames': 64, 'Lifetime': 0.6}, open(os.path.join(FX3, n + '.json'), 'w'))

# ---- cards -------------------------------------------------------------------------------------------------------------
fx = []
def add(p, t, pos, size, life=None, dur=None, **kw):
    if t < 0 or t >= 20: return
    e = dict(preset=p, t=round(t, 3), pos=R3(pos), size=round(size, 2), **kw)
    if dur is not None: e['dur'] = round(min(dur, 20 - t), 3)
    else: e['life'] = round(min(life or 0.4, 20 - t), 3)
    fx.append(e)
CP = {cid: segdist(*T.blade('a', t), *T.blade('b', t))[1] for cid, t, *_ in C}
chest = lambda tag, t: T.pos(f'{tag}_JUpperTorso', t)
feet = lambda tag, t: (T.pos(f'{tag}_JLeftFoot', t) + T.pos(f'{tag}_JRightFoot', t)) / 2
# 1 fitted swing trails + 2 afterimage echoes
for sid, f in fits.items():
    for k, (dt, sc) in enumerate(((0, 1), (0.04, 0.86), (0.08, 0.72))):
        add(f'sd3-trail-{sid}', f['t0'] + dt, f['ctr'], f['size'] * sc, life=f['life'], flat=True, rot=f['rot'])
# 2 contacts: impact, sparks both colours, flash, two rings
for cid, t, att, slow in C:
    p = CP[cid]; k = 3 if slow else 1
    add(f'sd3-impact-{att}', t, p, 6 if slow else 4.5, life=0.5 * k)
    add('sd3-spark-a', t + 0.01, p + [0, 0.1, 0.1], 3.2, life=0.45 * k); add('sd3-spark-b', t + 0.02, p + [0, -0.1, 0.1], 3.2, life=0.45 * k)
    add('sd3-flash', t, p + [0, 0, 0.2], 3.5 if slow else 2.6, life=0.16)
    add(f'sd3-ring-{att}', t, p, 4.5, life=0.4 * k); add(f'sd3-ring-{"b" if att == "a" else "a"}', t + 0.06, p, 3.4, life=0.4 * k)
# 3 auras (loops on the torso) + pulse rings every 0.4 s
for tag in 'ab':
    fx.append(dict(preset=f'sd3-aura-{tag}', t=0.0, dur=13.8, pos=[0, 0, 0], size=3.4, parent=f'{tag}_JUpperTorso'))
    for i in range(33): fx.append(dict(preset=f'sd3-ring-{tag}', t=round(0.2 + i * 0.4 + (0.2 if tag == 'b' else 0), 2), life=0.4, pos=[0, 0, 0], size=2.4, parent=f'{tag}_JLowerTorso'))
# 4 dash streaks (behind each fighter as it moves) at 3.0-3.6 and 12.0-12.4
for t0, t1 in ((3.0, 3.6), (12.0, 12.4)):
    for tag in 'ab':
        for t in np.linspace(t0 + (0.15 if tag == 'a' and t0 < 4 else 0), t1, 5): add(f'sd3-streak-{tag}', t, chest(tag, t), 2.6, life=0.22)
# 5 dust rings: dash pushes, every contact, the slide, the landings
for t, tags in ((3.0, 'b'), (3.15, 'a'), (3.6, 'ab'), (5.4, 'ab'), (5.85, 'ab'), (6.3, 'ab'), (7.0, 'ab'), (7.2, 'a'), (7.45, 'a'), (12.0, 'ab'), (12.4, 'ab'), (14.7, 'ab')):
    for tag in tags:
        q = feet(tag, t); add('sd3-dust', t, [q[0], 0.03, q[2]], 3.2 if t == 14.7 else 2.4, life=0.6, flat=True)
# 6 debris sparks through the exchange
for i, t in enumerate(np.arange(5.0, 7.4, 0.15)):
    m = (chest('a', t) + chest('b', t)) / 2 + [0, 0.3, 0.2]; add(f'sd3-spark-{"ab"[i % 2]}', t, m, 2.2, life=0.3)
# 7 charge, beam, crimson orb, struggle
hc = (T.pos('a_JRightHand', 9.6) + T.pos('a_JLeftHand', 9.6)) / 2; bx = T.pos('b_A0', 9.6)[0]; col = np.array([(hc[0] + bx) / 2 - 0.3, hc[1], 0])
fx.append(dict(preset='sd3-aura-a', t=8.7, dur=0.9, pos=R3((T.pos('a_JRightHand', 9.0) + T.pos('a_JLeftHand', 9.0)) / 2), size=2.4))
for i in range(6): add('sd3-ring-a', 8.7 + i * 0.15, (T.pos('a_JRightHand', 8.7 + i * 0.15) + T.pos('a_JLeftHand', 8.7 + i * 0.15)) / 2, 2.0, life=0.3)
fx.append(dict(preset='sd3-beam-a', t=9.6, dur=2.3, pos=R3(hc), size=2.5, shape='beam', length=round(float(col[0] - hc[0]), 2), speed=24))
fx.append(dict(preset='sd3-aura-b', t=9.75, dur=2.15, pos=R3(col), size=2.8, move=[[9.75, R3([bx - 0.6, col[1], 0])], [10.3, R3(col)], [11.0, R3(col - [0.4, 0, 0])], [11.9, R3(col)]]))
for i, t in enumerate(np.arange(9.6, 12.0, 0.2)):
    add('sd3-flash', t, col + [0, 0, 0.3], 2.4, life=0.15); add(f'sd3-spark-{"ab"[i % 2]}', t + 0.1, col + [0.2 * (-1) ** i, 0.3, 0.2], 2.6, life=0.3)
# 8 lock: energy merge, then the supernova
p6 = CP['c6']
fx.append(dict(preset='sd3-aura-b', t=12.8, dur=1.0, pos=R3(p6), size=3, grow=[[12.8, 0.2], [13.6, 1.2], [13.8, 0.2]]))
fx.append(dict(preset='sd3-aura-a', t=12.85, dur=0.95, pos=R3(p6 + [0, 0, 0.1]), size=3, grow=[[12.85, 0.2], [13.6, 1.2], [13.8, 0.2]]))
add('sd3-flash', 13.8, [0, 3.2, 0.8], 12, life=0.3)
add('sd3-nova', 13.85, [0, 3, 0], 18, life=2.2)
add('sd3-smoke', 13.95, [0, 2.6, -0.4], 15, life=2.4)
add('sd3-dust', 13.9, [0, 0.03, 0], 24, life=1.6, flat=True)
for i, (tt, sz) in enumerate(((13.85, 14), (13.95, 18), (14.1, 22))): add(f'sd3-ring-{"ab"[i % 2]}', tt, [0, 3, -0.2], sz, life=0.8)
for i in range(8):
    a_ = i * math.pi / 4; add(f'sd3-spark-{"ab"[i % 2]}', 13.9 + 0.03 * i, [3.2 * math.cos(a_), 3 + 2.2 * math.sin(a_), 0.4], 4, life=0.8)
for i in range(6): add('sd3-flash', 14.0 + 0.12 * i, [(-1) ** i * 1.5, 2.5 + 0.3 * i, 0.6], 5, life=0.2)
# 9 aftermath: smoke drifts, embers near the bodies
for i in range(5): add('sd3-smoke', 15.6 + i * 0.8, [(-1) ** i * 0.8, 1.4 + 0.2 * i, -0.6], 8, life=2.4)
for tag in 'ab':
    for i in range(6):
        q = T.pos(f'{tag}_JUpperTorso', 17); add(f'sd3-spark-{tag}', 15.8 + i * 0.6, q + [0.3 * (-1) ** i, 0.6, 0.3], 2.2, life=0.7)
# 10 cover fast pose snaps: joint angular speed > 60 deg/frame (60 fps) -> a 3-frame flash at the fighter's chest, camera side
def ang_speed(tag, t, dt=1 / 60):
    best = 0
    for j in ('JRightUpperArm', 'JRightLowerArm', 'JUpperTorso', 'JLeftUpperArm'):
        R0 = T.world(f'{tag}_{j}', t)[:3, :3]; R1 = T.world(f'{tag}_{j}', t + dt)[:3, :3]
        c = (np.trace(R0.T @ R1) - 1) / 2; best = max(best, math.degrees(math.acos(max(-1, min(1, c)))))
    return best
snaps, last = [], {}
for t in np.arange(0.5, 14.6, 1 / 60):
    for tag in 'ab':
        if ang_speed(tag, t) > 60 and t - last.get(tag, -9) > 0.25:
            last[tag] = t; snaps.append((round(float(t), 3), tag)); add(f'sd3-spark-{tag}', t, chest(tag, t) + [0, 0.4, 0.6], 2.6, life=0.08)
print('pose snaps covered', len(snaps), snaps[:10])

# ---- spec, merge, gate ----------------------------------------------------------------------------------------------------
S3 = dict(S2, name='Supernova Duel III', fxdir='$WORK/fx3', fx=fx)
for fgt in S3['fighters']: fgt['clip'] = os.path.join('..', 'supernova2', os.path.basename(fgt['clip']))
SPEC = os.path.join(HERE, 'spec3.json'); json.dump(S3, open(SPEC, 'w'), indent=1)
os.chdir(os.path.dirname(os.path.join(D, '..', 'avatar.py')))
r = subprocess.run([sys.executable, os.path.join(D, 'duel.py'), SPEC, f'{WORK}/out3', '--work', WORK], capture_output=True, text=True)
print((r.stdout + r.stderr).strip().splitlines()[-1][:220]); r.check_returncode()
P = json.load(open(f'{WORK}/out3/studio/project.json')); objs = P['objects']; n_fx = sum(o['type'] == 'flipbook' and o.get('name') != 'FX blade' for o in objs.values())
old = {hashlib.md5(open(os.path.join(WORK, 'fx', f), 'rb').read()).hexdigest() for f in os.listdir(os.path.join(WORK, 'fx')) if f.endswith('.png')}
used = {o['tex'] for o in objs.values() if o['type'] == 'flipbook'}
up = json.load(open(f'{WORK}/out3/studio/uploads.json'))
reused = [t for t in used if t in up and t != 'fx-a-lightsaber-blade' and hashlib.md5(open(up[t], 'rb').read()).hexdigest() in old]
fails = []
if not 245 <= n_fx <= 300: fails.append(f'{n_fx} effects (want 245-300)')
if reused: fails.append(f'reused v1/v2 sheets {reused}')
if len(REC) > 40: fails.append(f'{len(REC)} sheets')
for sid, f in fits.items():
    if f['resid'] >= 0.1: fails.append(f'trail {sid} leaves its plane by {f["resid"]:.2f}')
T3 = Tab(P, f'{WORK}/out3/studio/geo')
for cid, t, *_ in C:
    d = segdist(*T3.blade('a', t), *T3.blade('b', t))[0]
    if d > 0.15: fails.append(f'{cid} blades {d:.2f} apart')
print('trail plane residuals', {k: round(v['resid'], 3) for k, v in fits.items()}, 'spans', {k: round(v['span']) for k, v in fits.items()})
print(f'effects {n_fx}, sheets {len(REC)} new; GATE ' + ('PASS' if not fails else 'FAIL: ' + '; '.join(fails)))
