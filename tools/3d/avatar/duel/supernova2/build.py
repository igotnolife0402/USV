"""Supernova Duel v2 (2026-11-24): cinematic rebuild. Contact-solved clashes, clip camera (cuts, close-ups, shake), letterbox,
slow-mo authored in timing, per-fighter tinted fx at the FK contact points, FK gate.

  python3 build.py WORK      (WORK holds kitA/ kitB/ fx/ from the v1 build; writes WORK/A2 WORK/B2 WORK/out2 and spec2.json here)"""
# @style: helper
import json, math, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from fk import Tab, segdist, pdist

WORK = os.path.abspath(sys.argv[1]); AV = os.path.join(HERE, '..', '..', 'avatar.py'); DUEL = os.path.join(HERE, '..', 'duel.py')
CY, CR = 'cyan', 'crimson'
IK = lambda x, y, z, ex=-1.0: [[x, y, z], [ex, 0, -0.3]]
# bind poses: both wrists forward, blades meeting in front (aim = blade direction in the root frame: right -X, front -Y, up Z)
POSE_A = {
    'a_hi': {'base': 'saber_guard', 'ik': {'Right': IK(0.0, -0.75, 1.0)}, 'aim': [0, -0.6, 0.8]},
    'a_mid': {'base': 'saber_guard', 'ik': {'Right': IK(0.0, -0.8, 0.75)}, 'aim': [0, -0.9, 0.42]},
    'a_low': {'base': 'saber_guard', 'ik': {'Right': IK(0.0, -0.75, 0.6)}, 'aim': [0, -0.85, 0.35], 'RightKnee': [40, 0, 0], 'LeftKnee': [46, 0, 0]},
    'a_top': {'base': 'saber_guard', 'ik': {'Right': IK(0.0, -0.6, 1.35)}, 'aim': [0, -0.45, 0.9]},
    'a_breath': {'base': 'saber_guard', 'Waist': [4, 0, -8], 'Neck': [2, 0, 6]},
    'a_charge': {'base': 'charge2', 'ik': {'Right': IK(-0.18, 0.15, 0.5), 'Left': [[0.18, 0.15, 0.5], [1, 0, -0.3]]}},
    'a_kame': {'base': 'kamehameha', 'ik': {'Right': IK(-0.1, -0.85, 1.0), 'Left': [[0.1, -0.85, 1.0], [1, 0, -0.3]]}},
    'a_kame2': {'base': 'kamehameha2', 'ik': {'Right': IK(-0.1, -0.9, 0.95), 'Left': [[0.1, -0.9, 0.95], [1, 0, -0.3]]}},
    'a_hurt': {'base': 'saber_guard', 'Waist': [-26, 0, -14], 'Neck': [20, 0, 8]},
    'lie': {'base': 'ready', 'Root': [-88, 0, 0], 'Neck': [-10, 0, 0], 'RightShoulder': [-150, 0, 20], 'LeftShoulder': [-20, 0, -30]},
}
POSE_B = {
    'b_hi': {'base': 'gs_ready', 'ik': {'Right': IK(0.0, -0.75, 1.0)}, 'aim': [0, -0.6, 0.8]},
    'b_mid': {'base': 'gs_ready', 'ik': {'Right': IK(0.0, -0.8, 0.75)}, 'aim': [0, -0.9, 0.42]},
    'b_low': {'base': 'gs_ready', 'ik': {'Right': IK(0.0, -0.75, 0.6)}, 'aim': [0, -0.85, 0.35]},
    'b_slash': {'base': 'gs_ready', 'ik': {'Right': IK(0.0, -0.85, 0.7)}, 'aim': [0, -0.97, 0.2], 'Waist': [20, 0, -12]},
    'b_top': {'base': 'gs_strike', 'ik': {'Right': IK(0.0, -0.7, 1.4)}, 'aim': [0, -0.85, 0.25]},
    'b_breath': {'base': 'gs_ready', 'Waist': [8, 0, -4]},
    'b_mid2': {'base': 'gs_ready', 'ik': {'Right': IK(0.0, -0.85, 0.8)}, 'aim': [0, -0.9, 0.45], 'Waist': [12, 0, -6]},
    'b_hurt': {'base': 'gs_recover', 'Waist': [-24, 0, 10], 'Neck': [18, 0, -6]},
    'lie': POSE_A['lie'],
}
# contacts: id, t, A pose, B pose, attacker, defender-ready lead (s), hold after (hit-stop / slow-mo bind)
C = [('c1', 3.6, 'a_hi', 'b_hi', 'b', 0.15, 1.4), ('c2', 5.4, 'a_mid', 'b_mid', 'a', 0.15, 0.1), ('c3', 5.85, 'a_low', 'b_low', 'b', 0.15, 0.1),
     ('c4', 6.3, 'a_hi', 'b_hi', 'a', 0.15, 0.1), ('c5', 7.0, 'a_top', 'b_top', 'b', 0.15, 0.1), ('c6', 12.4, 'a_hi', 'b_hi', 'a', 0.1, 1.4)]
WIND = {'a': 'saber_windup', 'b': 'gs_windup2'}


def clips():
    A = [[0, 'saber_ready'], [1.4, 'saber_guard'], [2.6, 'a_breath'], [3.15, 'saber_guard']]
    B = [[0, 'gs_ready'], [1.6, 'b_breath'], [2.8, 'gs_ready']]
    for cid, t, pa, pb, att, lead, hold in C:
        for keys, mine, who in ((A, pa, 'a'), (B, pb, 'b')):
            if att == who: keys += [[t - 0.28, WIND[who], 'in'], [t, mine, 'out']]
            else: keys += [[t - lead - 0.2, mine], [t - lead, mine]]
            if att != who: keys.append([t, mine])
            keys.append([t + hold, mine, 'smooth'])
            if hold > 1: keys.insert(-1, [t + hold * 0.5, mine])          # slow-mo bind: a held push in the middle
    A += [[7.4, 'a_hurt'], [7.9, 'a_breath'], [8.4, 'saber_guard'], [8.7, 'a_charge'], [9.6, 'a_kame', 'out'], [10.8, 'a_kame2'], [11.9, 'a_kame'],
          [12.1, 'saber_guard']]
    B += [[7.4, 'gs_ready'], [7.9, 'b_breath'], [8.4, 'gs_ready'], [8.8, 'gs_windup2', 'in'], [9.05, 'b_slash', 'out'], [9.4, 'gs_ready'],
          [9.7, 'b_mid'], [10.8, 'b_mid2'], [11.9, 'b_mid'], [12.1, 'gs_ready']]
    for keys in (A, B): keys += [[13.8, keys[-1][1]], [14.2, 'a_hurt' if keys is A else 'b_hurt'], [14.7, 'lie'], [20.0, 'lie']]
    for keys in (A, B): keys.sort(key=lambda k: k[0])
    for keys in (A, B):                                                     # drop same-time duplicates (keep the last)
        seen = {}; [seen.__setitem__(round(k[0], 3), k) for k in keys]; keys[:] = sorted(seen.values(), key=lambda k: k[0])
    return A, B


def run(*a): r = subprocess.run([sys.executable, *a], capture_output=True, text=True); print((r.stdout + r.stderr).strip().splitlines()[-1][:200]); r.check_returncode()


A, B = clips()
for tag, keys, poses in (('A', A, POSE_A), ('B', B, POSE_B)):
    json.dump({'name': 'fight', 'poses': poses, 'keys': keys}, open(os.path.join(HERE, f'fight{tag}.json'), 'w'), indent=0)
fxA = {'frame_len': 5.5, 'cards': [{'kind': 'blade', 'sheet': {'file': 'lightsaber-blade.png', 'grid': 8, 'frames': 64, 'fps': 24}, 'length': 4.2, 'size': 0.9, 'speed': 18, 'show': [0.8, 14.2]}]}
json.dump(fxA, open(os.path.join(WORK, 'fx', 'fxA2.json'), 'w')); json.dump({'cards': [{'kind': 'greatsword', 'length': 4.6}]}, open(os.path.join(WORK, 'fx', 'fxB2.json'), 'w'))
os.chdir(os.path.dirname(AV))
run(AV, f'{WORK}/kitA', f'{WORK}/A2', '--name', 'Kaito', '--pose', 'saber_ready', '--clipfile', os.path.join(HERE, 'fightA.json'), '--fx', f'{WORK}/fx/fxA2.json')
run(AV, f'{WORK}/kitB', f'{WORK}/B2', '--name', 'Ren', '--pose', 'gs_ready', '--clipfile', os.path.join(HERE, 'fightB.json'), '--fx', f'{WORK}/fx/fxB2.json')

# ---- paths: wide standoff, staggered dash, contacts at solved gaps, slide, beam range, final dash, thrown, lying -----------
GAP = {c[0]: 3.6 for c in C}; DY = {c[0]: 0 for c in C}; DZ = {c[0]: 0.0 for c in C}; DROP = {'a': 0.0, 'b': 0.0}


def paths():
    pa = [[0, [-4.6, 0, 0]], [3.15, [-4.6, 0, 0]]]; pb = [[0, [4.6, 0, 0]], [3.0, [4.6, 0, 0]]]; ya = [[0, 90]]; yb = [[0, -90]]
    for cid, t, *_ , hold in C:
        g, dy, dz = GAP[cid], DY[cid], DZ[cid]
        for p, y, sx, y0 in ((pa, ya, -1, 90), (pb, yb, 1, -90)):
            z = dz if sx > 0 else 0
            if cid == 'c6': p.append([t - 0.15, [sx * g / 2, 0, z]])
            elif cid == 'c1': p.append([t - (0.12 if sx < 0 else 0.25), [sx * g / 2, 0, z], 'out'])
            p += [[t, [sx * g / 2, 0, z]], [t + hold, [sx * g / 2, 0, z]]]
            y += [[t - 0.1, y0 + (dy if sx > 0 else 0)], [t + hold, y0 + (dy if sx > 0 else 0)]]
        if cid == 'c5':                                                   # Kaito blocks the overhead and slides back 3 studs
            pa += [[7.45, [-g / 2 - 3, 0, 0], 'out'], [8.4, [-g / 2 - 3, 0, 0]], [12.1, [-g / 2 - 3, 0, 0]]]
            pb += [[7.45, [g / 2 + 0.5, 0, 0]], [8.4, [g / 2 + 0.5, 0, 0]], [12.1, [g / 2 + 0.5, 0, 0]]]
    ga = GAP['c6'] / 2
    pa += [[14.2, [-ga - 2.0, 1.2, 0]], [14.7, [-ga - 4.0, -DROP['a'], 0], 'out'], [20, [-ga - 4.0, -DROP['a'], 0]]]
    pb += [[14.2, [ga + 2.0, 1.2, 0]], [14.7, [ga + 4.0, -DROP['b'], 0], 'out'], [20, [ga + 4.0, -DROP['b'], 0]]]
    for p in (pa, pb, ya, yb): p.sort(key=lambda k: k[0])
    return pa, pb, ya, yb


SPEC = os.path.join(HERE, 'spec2.json')
def spec(fx=(), cam=None):
    pa, pb, ya, yb = paths()
    s = {'name': 'Supernova Duel II', 'env': {'bg': '#1b2130', 'light': 'night', 'grid': False, 'fog': None}, 'len': 20.0, 'max_beat': 2.0, 'still_from': 14.7, 'camera': {'fov': 45, 'ortho': False, 'pos': [0, 3, 16], 'target': [0, 2.5, 0]},
         'fxdir': '$WORK/fx', 'fx': list(fx),
         'fighters': [{'dir': '$WORK/A2', 'tag': 'a', 'clip': 'fightA.json', 'yaw': 90, 'path': pa, 'yaw_path': ya, 'tint': '#bcd6ee',
                       'extra': [{'match': 'X0', 'ch': 'scale', 'keys': [[0, [1, 1, 1]], [8.4, [0.001, 0.001, 0.001]], [12.1, [1, 1, 1]], [14.2, [0.001, 0.001, 0.001]]]}]},
                      {'dir': '$WORK/B2', 'tag': 'b', 'clip': 'fightB.json', 'yaw': -90, 'path': pb, 'yaw_path': yb, 'tint': '#eebcbc'}]}
    if cam: s['camera_keys'] = cam
    json.dump(s, open(SPEC, 'w'), indent=1); return s


def merge(out='out2'):
    run(DUEL, SPEC, f'{WORK}/{out}', '--work', WORK)
    return Tab(f'{WORK}/{out}/studio/project.json', f'{WORK}/{out}/studio/geo')


def contact_eval(T, t):
    a0, a1 = T.blade('a', t); b0, b1 = T.blade('b', t); d, m = segdist(a0, a1, b0, b1)
    cl = min(np.linalg.norm(m - T.pos('a_JUpperTorso', t)), np.linalg.norm(m - T.pos('b_JUpperTorso', t)))
    return d, m, cl, min(a1[1], b1[1])


# ---- solve every contact: gap (3.2-4.2) and Ren's yaw (+-24 deg) so the blades meet outside both torsos --------------------
spec(); T = merge()
def score(T, t, g, dz, dy):
    def oa(tt, M):
        M = M.copy(); M[0, 3] = -g / 2; return M
    def ob(tt, M):
        M = M.copy(); M[0, 3] = g / 2; M[2, 3] = dz; r = math.radians(-90 + dy); M[:3, :3] = np.array([[math.cos(r), 0, math.sin(r)], [0, 1, 0], [-math.sin(r), 0, math.cos(r)]]); return M
    T.over = {'a_A0': oa, 'b_A0': ob}; d, m, cl, tip = contact_eval(T, t); T.over = {}
    return d + (0 if cl >= 0.6 else 5) + (0 if tip >= 0.05 else 5) + 0.004 * abs(dy) + 0.02 * abs(dz), d, cl
for cid, t, *_ in C:                       # coarse-to-fine pattern search over gap, Ren's sidestep z and yaw
    x = [3.6, -1.5, 0.0]; lo, hi = [3.2, -3.0, -20], [4.2, 1.0, 20]; best = score(T, t, *x); step = [0.3, 0.6, 8]
    while step[0] > 0.02:
        moved = False
        for k in range(3):
            for sg in (-1, 1):
                y = list(x); y[k] = min(hi[k], max(lo[k], y[k] + sg * step[k])); r = score(T, t, *y)
                if r[0] < best[0] - 1e-4: x, best, moved = y, r, True
        if not moved: step = [v / 2 for v in step]
    GAP[cid], DZ[cid], DY[cid] = round(x[0], 2), round(x[1], 2), round(x[2], 1)
    print(f'{cid} t={t}: gap {GAP[cid]} z {DZ[cid]:+.2f} yaw {DY[cid]:+.1f} -> blade dist {best[1]:.3f}, contact-torso {best[2]:.2f}')
spec(); T = merge()
for tag in 'ab':                                                           # lying bodies touch the ground
    DROP[tag] = round(T.lowest(tag, 16.0) - 0.03, 3)
spec(); T = merge()
CP = {cid: contact_eval(T, t)[1].round(3).tolist() for cid, t, *_ in C}
head = lambda tag, t: T.pos(f'{tag}_JHead', t).round(2).tolist()
hand = lambda t: ((T.pos('a_JRightHand', t) + T.pos('a_JLeftHand', t)) / 2).round(2).tolist()

# ---- fx at the solved contacts; attacker's colour leads, the defender's answers; supernova white -----------------------------
fx = [dict(preset='embers', t=0, dur=13.8, pos=[0, 1.2, -1.5], size=9),
      dict(preset='glints', variant=CY, t=2.2, life=0.35, pos=head('a', 2.2), size=1.2), dict(preset='glints', variant=CR, t=2.7, life=0.35, pos=head('b', 2.7), size=1.2)]
for cid, t, pa, pb, att, lead, hold in C:
    p = CP[cid]; slow = hold > 1; ca, cd = (CY, CR) if att == 'a' else (CR, CY)
    fx += [dict(preset='slash', variant=ca, t=t, life=1.2 if slow else 0.4, pos=p, size=6 if slow else 4.5),
           dict(preset='slash', variant=cd, t=t + 0.03, life=1.0 if slow else 0.35, pos=[p[0], p[1] + 0.2, p[2] + 0.05], size=5 if slow else 3.5),
           dict(preset='glints', t=t, life=0.9 if slow else 0.3, pos=[p[0], p[1], p[2] + 0.1], size=3 if slow else 2.2),
           dict(preset='shock', variant=ca, t=t, life=1.2 if slow else 0.45, pos=[p[0], p[1], p[2] - 0.05], size=5 if slow else 3.5)]
    if slow: fx.append(dict(preset='embers', variant=ca, t=t + 0.1, life=1.2, pos=p, size=3.5))
c5 = CP['c5']; ax = -GAP['c5'] / 2
fx += [dict(preset='explosion', t=7.0, life=0.9, pos=c5, size=4.5),
       dict(preset='shock', t=7.02, life=0.8, pos=[ax, 0.03, 0], size=4, flat=True),
       dict(preset='embers', t=7.05, life=0.8, pos=[ax - 1.5, 0.4, 0], size=3)]
hc = hand(9.6); bx = GAP['c5'] / 2 + 0.5
col = [round((hc[0] + bx) / 2 - 0.3, 2), hc[1], 0]
fx += [dict(preset='kamehameha-charge', variant=CY, t=8.7, dur=0.9, pos=hand(9.0), size=2.2),
       dict(preset='flame-arc', variant=CR, t=8.95, life=0.6, pos=[bx - 1.0, 3.0, 0.2], size=5, move=[[8.95, [bx - 1.0, 3.0, 0.2]], [9.55, [hc[0] + 1.2, 3.0, 0.2]]]),
       dict(preset='kamehameha-beam', variant=CY, t=9.6, dur=2.3, pos=hc, size=2.5, shape='beam', length=round(col[0] - hc[0], 2), speed=24),
       dict(preset='black-hole', t=9.75, dur=2.15, pos=col, size=2.6, move=[[9.75, [bx - 0.6, col[1], 0]], [10.3, col], [11.0, [col[0] - 0.4, col[1], 0]], [11.9, col]],
            grow=[[9.75, 0.5], [10.3, 1], [11.9, 1.3]])]
fx += [dict(preset='glints', t=tt, life=0.3, pos=[col[0], col[1], 0.3], size=3) for tt in (10.35, 10.9, 11.45)]
fx += [dict(preset='shock', variant=CY, t=11.55, life=0.5, pos=[col[0], col[1], -0.05], size=4)]
c6 = CP['c6']
fx += [dict(preset='black-hole', t=12.8, dur=1.0, pos=c6, size=3, grow=[[12.8, 0.1], [13.6, 1.0], [13.8, 0.2]]),
       dict(preset='glints', t=13.8, life=0.4, pos=[c6[0], c6[1], 0.5], size=7),
       dict(preset='explosion', t=13.85, life=2.2, pos=[0, 3, 0], size=18),
       dict(preset='glints', t=13.85, life=0.5, pos=[0, 3.2, 0.8], size=11),
       dict(preset='shock', t=13.85, life=1.6, pos=[0, 0.03, 0], size=24, flat=True),
       dict(preset='embers', t=15.6, dur=4.4, pos=[0, 0.8, 0], size=10),
       dict(preset='embers', variant=CY, t=16.0, dur=4.0, pos=[-GAP['c6'] / 2 - 4, 0.6, 0], size=6),
       dict(preset='embers', variant=CR, t=16.2, dur=3.8, pos=[GAP['c6'] / 2 + 4, 0.6, 0], size=6)]

# ---- camera: hard cuts ('step' on the key before a cut), push-ins, orbit, shake on impacts, bars ---------------------------
def V(*a): return [round(float(x), 2) for x in a]
ha, hb = head('a', 2.2), head('b', 2.7); p1 = CP['c1']; p6 = CP['c6']
K = {'pos': [], 'target': [], 'fov': [], 'shake': [[0, 0, 'linear']], 'bars': [[0, 0, 'smooth'], [0.6, 1, 'linear'], [20, 1]]}
def shot(t, pos, tgt, fov, ease='smooth'):
    for ch, v in (('pos', pos), ('target', tgt), ('fov', fov)):
        if K[ch] and K[ch][-1][0] < t - 1e-3: K[ch].append([round(t - 0.001, 3), K[ch][-1][1], 'step'])   # hold the old shot to the cut
        K[ch].append([t, v, ease])
def move(t, pos, tgt, fov):
    for ch, v in (('pos', pos), ('target', tgt), ('fov', fov)): K[ch].append([t, v, 'smooth'])
def shake(t, amp, decay):
    K['shake'] += [[round(t - 0.01, 3), 0, 'linear'], [t, amp, 'out'], [round(t + decay, 3), 0, 'linear']]
shot(0, V(0, 3.2, 17), V(0, 2.6, 0), 45); move(2.0, V(0, 3.0, 12.5), V(0, 2.8, 0), 38)
shot(2.0, V(ha[0] + 3.4, ha[1] + 0.3, 2.0), V(ha[0], ha[1] + 0.15, ha[2]), 30); move(2.5, V(ha[0] + 3.0, ha[1] + 0.25, 1.7), V(ha[0], ha[1] + 0.15, ha[2]), 28)
shot(2.5, V(hb[0] - 3.4, hb[1] + 0.3, 2.0), V(hb[0], hb[1] + 0.15, hb[2]), 30); move(3.0, V(hb[0] - 3.0, hb[1] + 0.25, 1.7), V(hb[0], hb[1] + 0.15, hb[2]), 28)
shot(3.0, V(0.5, 0.6, 7.5), V(0, 3.2, 0), 52); move(3.6, V(0.2, 0.7, 6.5), V(0, 3.4, 0), 50)
shot(3.6, V(p1[0], p1[1] + 0.3, 4.0), V(*p1), 36); move(4.3, V(p1[0] + 1.8, p1[1] + 0.6, 3.5), V(*p1), 34); move(5.0, V(p1[0] + 2.8, p1[1] + 0.9, 2.6), V(*p1), 32)
shake(3.6, 0.15, 0.8)
shot(5.0, V(0, 3.2, 9.5), V(0, 3.0, 0), 40); move(6.6, V(-0.8, 3.0, 8.5), V(0, 3.0, 0), 40)
for cid in ('c2', 'c3', 'c4'): shake([c for c in C if c[0] == cid][0][1], 0.08, 0.25)
shot(6.6, V(1.2, 4.2, 7.5), V(0, 3.2, 0), 42); move(7.0, V(0.8, 4.0, 7.0), V(*CP['c5']), 42); move(7.4, V(ax - 1.0, 2.8, 6.5), V(ax - 2.2, 2.6, 0), 44)
shake(7.0, 0.14, 0.4)
shot(7.4, V(0, 4.2, 16), V(-0.8, 2.6, 0), 42); move(8.4, V(-0.6, 3.6, 12.5), V(-0.8, 2.8, 0), 40)
shot(8.4, V(ax - 0.2, 1.1, 3.2), V(ax - 2.8, 3.0, 0), 42); move(9.0, V(ax - 0.5, 1.0, 2.8), V(ax - 2.8, 3.1, 0), 40)
shot(9.0, V(bx - 2.6, 2.2, 4.8), V(bx - 0.5, 3.0, 0), 44); move(9.6, V(bx - 3.2, 2.4, 5.2), V(bx - 1.5, 3.0, 0), 44)
shot(9.6, V(col[0], 3.4, 13.5), V(col[0], 3.0, 0), 40); move(12.0, V(col[0], 3.2, 11.5), V(col[0], 3.0, 0), 38)
K['shake'] += [[9.6, 0.05, 'linear'], [11.9, 0.2, 'linear'], [12.0, 0, 'step']]
shot(12.0, V(p6[0], p6[1] + 0.4, 5.5), V(p6[0], p6[1], 0), 34); move(13.8, V(p6[0] + 1.0, p6[1] + 0.3, 4.0), V(p6[0], p6[1], 0), 30)
shot(13.8, V(0, 3.6, 7), V(0, 3, 0), 50); move(14.6, V(0, 5.5, 17), V(0, 2.5, 0), 54); move(16.0, V(0, 6.5, 24), V(0, 2, 0), 52)
shake(13.8, 0.4, 1.7)
shot(16.0, V(4, 11, 15), V(0, 0.3, 0), 45); move(20.0, V(5, 13, 19), V(0, 0.3, 0), 45)
K['shake'].sort(key=lambda k: k[0])
al = math.atan2(DZ['c1'], GAP['c1']); cb, sb = math.cos(-al), math.sin(-al); pv = np.array([0, 0, DZ['c1'] / 2])
def rY(v):
    d = np.array(v) - pv; return V(*(pv + [d[0] * cb + d[2] * sb, d[1], -d[0] * sb + d[2] * cb]))
for ch in ('pos', 'target'):
    for k in K[ch]:
        if 3.0 <= k[0] < 7.4 or 12.0 <= k[0] < 13.8: k[1] = rY(k[1])

spec(fx, K); T = merge()

# ---- gate -------------------------------------------------------------------------------------------------------------------
fails = []
for cid, t, *_ in C:
    d, m, cl, tip = contact_eval(T, t)
    if d > 0.15: fails.append(f'{cid} blades {d:.2f} apart')
    if cl < 0.6: fails.append(f'{cid} contact {cl:.2f} from a torso')
    g = GAP[cid]
    if not 3.2 <= g <= 4.2: fails.append(f'{cid} gap {g}')
thru = tips = 0; n = 0; TT, TP = [], []
for t in np.arange(1.0, 13.8, 0.05):
    n += 1
    for tag, opp in (('a', 'b'), ('b', 'a')):
        p, q = T.blade(tag, t)
        if tag == 'a' and 8.4 <= t < 12.1: continue                       # saber hidden for the charge/beam
        if pdist(T.pos(f'{opp}_JUpperTorso', t), p, q) < 0.6: thru += 1; TT.append(f'{tag}{t:.2f}')
        if q[1] < 0.05: tips += 1; TP.append(f'{tag}{t:.2f}')
if thru: fails.append(f'blade through torso {thru} samples {TT[:8]}')
if tips: fails.append(f'blade tip under ground {tips} samples {TP[:8]}')
for tag in 'ab':
    lo = T.lowest(tag, 17.0)
    if not -0.05 <= lo <= 0.2: fails.append(f'{tag} lying lowest point {lo:.2f}')
pal = [np.linalg.norm(T.pos('a_JRightHand', t) - T.pos('a_JLeftHand', t)) for t in (9.6, 10.8, 11.9)]
if max(pal) > 0.5: fails.append(f'palms {max(pal):.2f} apart during the beam')
print('contacts', {c: CP[c] for c in CP}); print('gaps', GAP, 'yaw', DY)
print('GATE ' + ('PASS' if not fails else 'FAIL: ' + '; '.join(fails)))
