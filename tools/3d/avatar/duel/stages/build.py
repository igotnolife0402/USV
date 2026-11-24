"""Crossing (2026-11-24): a new two-fighter sword fight built stage by stage, each stage written as its own Umbrio tab so the
owner can watch the process: s1 blocking -> s2 splines -> s3 impact frames -> (finish.mjs) s4 camera -> s5 lighting -> s6 VFX.
Rigs (Kaito saber, Ren greatsword) come from a built duel tab; poses, timing, contacts and effects are all new.
Arms and legs are placed by a small IK (Levenberg-Marquardt on the rig's own FK) from hand / blade / foot targets, never by
guessed Euler, so every clash is a real blade-on-blade contact (gate: <= 0.15 stud) and no blade passes through a torso.

  python3 build.py BASE_STUDIO WORK     (writes WORK/s1 s2 s3 s6pre + WORK/fx + WORK/beats.json; then node finish.mjs WORK)"""
# @style: helper
import json, math, os, sys, copy, subprocess
from concurrent.futures import ThreadPoolExecutor
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.dirname(HERE); sys.path.insert(0, D)
from fk import rot, Tab, segdist, pdist

BASE, WORK = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
VFX = os.path.join(D, '..', '..', '..', 'vfx', 'flipbook', 'vfx.py'); FX = os.path.join(WORK, 'fx'); os.makedirs(FX, exist_ok=True)
P0 = json.load(open(os.path.join(BASE, 'project.json')))
O = {k: v for k, v in P0['objects'].items() if k[:2] in ('a_', 'b_')}
LEN, FPS = 7.6, 60
FACE = {'a': 90, 'b': -90}
O['a_X0'].update(start=0, dur=LEN)                                  # the saber blade burns the whole clip
R3 = lambda v: [round(float(x), 3) for x in v]


def TRm(pos, r):
    M = np.eye(4); M[:3, :3] = rot(r); M[:3, 3] = pos; return M


def L(k, r=None): o = O[k]; return TRm(o.get('pos', [0, 0, 0]), o.get('rot', [0, 0, 0]) if r is None else r)


# blade in the hand frame: base point, unit direction, length (saber = beam flipbook along +X; greatsword = farthest steel vertex)
def blade_def(tag):
    if tag == 'a':
        M = L('a_X0'); return M[:3, 3], M[:3, :3] @ [1, 0, 0], O['a_X0']['length']
    g = np.array(json.load(open(os.path.join(BASE, 'geo', O['b_X0steel']['geo'] + '.json')))['verts']).reshape(-1, 3)
    v = g[np.linalg.norm(g, axis=1).argmax()]; return np.zeros(3), v / np.linalg.norm(v), float(np.linalg.norm(v))
BL = {t: blade_def(t) for t in 'ab'}


def lm(res, x0, lo, hi, it=60):
    """Damped Gauss-Newton with box bounds, numeric Jacobian (0.3 deg steps)."""
    x = np.array(x0, float); lam = 1e-2
    for _ in range(it):
        r = res(x); J = np.zeros((len(r), len(x)))
        for i in range(len(x)):
            d = np.zeros(len(x)); d[i] = 0.3; J[:, i] = (res(x + d) - r) / 0.3
        step = np.linalg.solve(J.T @ J + lam * np.eye(len(x)), -J.T @ r)
        xn = np.clip(x + step, lo, hi)
        if (res(xn) ** 2).sum() < (r ** 2).sum(): x, lam = xn, lam * 0.5
        else: lam *= 4
        if np.abs(step).max() < 1e-3: break
    return x, float(np.sqrt((res(x) ** 2).sum()))


def chain(tag, rots, names):
    M = np.eye(4)
    for n in names: M = M @ L(f'{tag}_J{n}', rots.get(n))
    return M


def loc(v): r, u, f = v; return np.array([-r, u, f], float)             # fighter-local (right, up, forward) -> rig root frame


def pose(tag, k, prev=None):
    """One key: k holds root (x, z, yaw, drop), torso, head, feet, right hand + blade, left arm. Returns (rots, rootpos, rootrot, info)."""
    yaw = FACE[tag] + k['yaw']; Rr = rot([0, yaw, 0]); rp = np.array([k['x'], -k['drop'], k['z']])
    w2l = lambda W: Rr.T @ (np.array(W, float) - rp)
    rots = {'LowerTorso': [k['lean'], k['hips'], 0], 'UpperTorso': list(k['chest']), 'Head': list(k['head'])}
    # right arm: hand target + blade direction (dir in fighter frame, a world point it passes through, or a world tip point)
    # 'dir': hand target + blade direction; 'thru': blade must pass a world point (hand target soft); 'tip': tip on a world point
    H = loc(k['hand']); kind = k['blade'][0]; base, bd, blen = BL[tag]; Cp = None
    if kind == 'dir': Dv = loc(k['blade'][1]); wh, wd = 1.0, 1.6
    elif kind == 'thru': Cp = w2l(k['blade'][1]); Dv = Cp - H; wh, wd = 0.3, 0.2
    else: Cp = w2l(k['blade'][1]); Dv = loc(k['blade'][2]); wh, wd = 0.25, 0.5
    Dv = Dv / np.linalg.norm(Dv)
    arm = ['LowerTorso', 'UpperTorso', 'RightUpperArm', 'RightLowerArm', 'RightHand']
    def res_r(x):
        rr = {**rots, 'RightUpperArm': x[0:3], 'RightLowerArm': [x[3], 0, 0], 'RightHand': x[4:7]}
        M = chain(tag, rr, arm); h = M[:3, 3]; d = M[:3, :3] @ bd
        out = [wh * (h - H), wd * (d - Dv), 0.002 * (x - X0R)]
        if kind == 'thru':
            v = Cp - (h + M[:3, :3] @ base); a = v @ d; out.append(3 * (v - a * d)); out.append([3 * max(0, 1.0 - a), 3 * max(0, a - blen + 0.4)])
        elif kind == 'tip': out.append(3 * (h + M[:3, :3] @ (base + bd * blen) - Cp))
        return np.concatenate([np.ravel(o) for o in out])
    X0R = np.array(prev['xr'] if prev else [-40, 0, 0, -60, 0, 0, 0], float)
    xr, er = lm(res_r, X0R, [-210, -95, -110, -150, -85, -85, -85], [80, 95, 110, -4, 85, 85, 85])
    rots.update(RightUpperArm=list(xr[0:3]), RightLowerArm=[xr[3], 0, 0], RightHand=list(xr[4:7]))
    Mh = chain(tag, rots, arm); hand = Mh[:3, 3]; bdir = Mh[:3, :3] @ BL[tag][1]
    # left arm: guard by the chest, two-handed grip below the right hand, or a free target
    la = k['larm']
    T = loc((-0.3, 3.15, 0.55)) if la == 'guard' else hand - bdir * 0.38 if la == 'grip' else loc(la)
    larm = ['LowerTorso', 'UpperTorso', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand']
    X0L = np.array(prev['xl'] if prev else [-40, 0, 0, -60], float)
    def res_l(x):
        M = chain(tag, {**rots, 'LeftUpperArm': x[0:3], 'LeftLowerArm': [x[3], 0, 0]}, larm); return np.r_[M[:3, 3] - T, 0.001 * (x - X0L)]
    xl, el = lm(res_l, X0L, [-210, -95, -110, -150], [80, 95, 110, -4])
    rots.update(LeftUpperArm=list(xl[0:3]), LeftLowerArm=[xl[3], 0, 0], LeftHand=[0, 0, 0])
    # legs: ankle on the ground (ground is y = drop in the root frame), foot flat
    xs = {}
    for side, ft in (('Left', k['feet'][0]), ('Right', k['feet'][1])):
        A = loc((ft[1], 0.504 + k['drop'], ft[0])); A[1] = 0.504 + k['drop']
        names = ['LowerTorso', f'{side}UpperLeg', f'{side}LowerLeg', f'{side}Foot']
        X0 = np.array(prev['x' + side] if prev else [-10, 0, 0, 15, -5], float)
        def res_g(x):
            rr = {**rots, f'{side}UpperLeg': x[0:3], f'{side}LowerLeg': [x[3], 0, 0], f'{side}Foot': [x[4], 0, 0]}
            M = chain(tag, rr, names); up = M[:3, :3] @ [0, 1, 0]
            return np.r_[M[:3, 3] - A, 2 * up[[0, 2]], 0.004 * (x - X0)]
        xg, eg = lm(res_g, X0, [-120, -40, -40, 0, -60], [60, 40, 40, 150, 60])
        rots.update({f'{side}UpperLeg': list(xg[0:3]), f'{side}LowerLeg': [xg[3], 0, 0], f'{side}Foot': [xg[4], 0, 0]}); xs['x' + side] = xg
    info = dict(xr=xr, xl=xl, **xs, err=max(er, el), er=er, el=el, hand=hand, bdir=bdir)
    return {n: R3(v) for n, v in rots.items()}, R3(rp), [0, round(yaw, 2), 0], info


# ---- choreography (story seconds). Each key inherits what it does not set from the key before. --------------------------
GUARD = dict(x=0, z=0, yaw=0, drop=0.12, hips=25, lean=4, chest=(4, -15, 0), head=(0, 10, 0), feet=((0.55, -0.25), (-0.45, 0.3)),
             larm='guard')
C1, C3, C4 = (-0.15, 4.05, 0.1), (0.05, 4.2, -0.35), (0.2, 4.15, -0.35)        # clash points (world)
G = (-1.9, 0.05, 0.15)                                                         # Ren's smash: blade tip into the ground
A = [  # Kaito: quick saber, comes in twice, ducks, finishes with a rising cut through Ren's guard and runs past
    {**GUARD, **dict(t=0.0, x=-3.75, hand=(0.15, 3.0, 0.85), blade=('dir', (-0.15, 0.8, 0.6)))},
    dict(t=0.55, drop=0.17, chest=(7, -15, 0)),
    dict(t=0.95, x=-4.05, drop=0.45, lean=12, chest=(8, -38, 0), hand=(0.85, 2.6, -0.2), blade=('dir', (0.35, 0.25, -0.9)),
         larm=(-0.45, 3.0, 0.75), feet=((0.75, -0.25), (-0.6, 0.3))),
    dict(t=1.35, x=-3.4, drop=0.38, lean=24, hand=(0.85, 2.75, -0.1)),
    dict(t=1.6, x=-2.05, drop=0.3, lean=14, chest=(5, -20, 0), hand=(0.75, 3.1, 0.45), blade=('dir', (0.45, 0.85, 0.25)),
         feet=((1.0, -0.25), (-0.75, 0.3))),
    dict(t=1.75, x=-1.95, drop=0.32, lean=10, chest=(4, 8, 0), hand=(0.05, 3.2, 1.0), blade=('thru', C1), contact='c1'),
    dict(t=2.15, x=-2.5, drop=0.22, lean=-4, chest=(0, 18, 0), hand=(-0.3, 3.5, 0.75), blade=('dir', (-0.55, 0.75, 0.35)),
         feet=((0.55, -0.25), (-0.5, 0.3)), larm='guard'),
    dict(t=2.45, x=-2.35, z=-0.45, drop=0.3, lean=8, chest=(6, 5, -8), hand=(0.15, 3.1, 0.7), blade=('dir', (-0.15, 0.85, 0.5))),
    dict(t=2.7, x=-2.1, z=-1.4, drop=0.55, lean=14, chest=(10, 0, -12), head=(0, 25, 0), hand=(0.35, 3.2, 0.4), blade=('dir', (-0.25, 0.9, -0.2))),
    dict(t=3.05, x=-2.15, z=-1.05, drop=0.42, chest=(6, -28, 0), head=(0, 12, 0), hand=(0.55, 2.9, -0.15), blade=('dir', (0.55, 0.6, -0.55))),
    dict(t=3.35, x=-1.75, z=-0.85, drop=0.36, lean=14, chest=(6, 18, 0), hand=(0.05, 3.25, 1.0), blade=('thru', C3), contact='c3'),
    dict(t=3.75, x=-2.15, z=-0.65, drop=0.2, lean=-8, chest=(-5, 28, 6), hand=(-0.25, 4.0, 0.55), blade=('dir', (-0.35, 0.9, -0.2))),
    dict(t=4.05, x=-2.15, z=-0.35, drop=0.5, lean=20, chest=(8, 5, 0), head=(0, 5, 0), hand=(0.45, 2.8, 0.2), blade=('dir', (0.4, 0.6, -0.65))),
    dict(t=4.3, x=-2.1, z=-0.25, drop=1.15, lean=34, chest=(14, 0, 0), head=(-12, 0, 0), hand=(0.55, 2.0, 0.35), blade=('dir', (0.15, 0.2, -0.95)),
         feet=((0.85, -0.45), (-0.8, 0.45)), larm=(-0.5, 2.3, 0.7)),
    dict(t=4.75, x=-2.3, drop=1.0, lean=30, chest=(12, 32, 0), head=(-8, -20, 0), hand=(-0.65, 2.2, -0.35), blade=('dir', (-0.35, -0.05, -0.95)),
         larm=(0.3, 2.6, 0.5)),
    dict(t=5.05, drop=1.06, lean=32, chest=(13, 36, 0)),
    dict(t=5.2, x=-1.6, z=-0.55, drop=0.7, lean=34, hand=(-0.7, 2.9, 0.05), blade=('dir', (-0.55, 0.35, -0.75)), feet=((1.0, -0.3), (-0.8, 0.35))),
    dict(t=5.3, x=-1.25, z=-0.75, drop=0.5, lean=16, chest=(6, 12, 0), head=(0, 5, 0), hand=(0.05, 3.15, 1.0), blade=('thru', C4), contact='c4'),
    dict(t=5.65, x=2.3, z=-1.5, drop=0.42, lean=10, chest=(2, 30, 0), hand=(-0.3, 4.1, 0.35), blade=('dir', (-0.45, 0.75, -0.5)),
         feet=((0.7, -0.3), (-0.7, 0.35)), larm=(0.5, 3.0, 0.2)),
    dict(t=6.1, x=3.9, z=-1.5, drop=0.32, lean=4, chest=(2, 10, 0), head=(0, -55, 0), hand=(-0.2, 2.8, 0.4), blade=('dir', (-0.75, -0.3, 0.4))),
    dict(t=7.0, drop=0.13, chest=(0, -8, 0), head=(0, -48, 0), hand=(-0.25, 2.4, 0.35), blade=('dir', (-0.7, -0.36, 0.45)), larm=(0.55, 2.4, 0.0),
         feet=((0.4, -0.3), (-0.35, 0.3))),
    dict(t=LEN, drop=0.11, chest=(2, -6, 0), head=(0, -52, 0)),
]
B = [  # Ren: heavy two-handed greatsword, blocks, smashes the ground, spins over Kaito's head, guard breaks, falls to a knee
    {**GUARD, **dict(t=0.0, x=2.75, hand=(0.2, 2.7, 0.7), blade=('dir', (-0.1, 0.85, 0.5)), larm='grip')},
    dict(t=0.55, drop=0.16, chest=(6, -15, 0)),
    dict(t=0.95, x=2.7, drop=0.2),
    dict(t=1.4, x=2.15, drop=0.22, chest=(4, 8, 0), hand=(0.35, 3.0, 0.75), blade=('dir', (-0.45, 0.85, 0.25)), feet=((0.7, -0.25), (-0.55, 0.3))),
    dict(t=1.75, x=2.0, drop=0.25, hand=(0.15, 3.0, 0.85), blade=('thru', C1), contact='c1'),
    dict(t=2.15, x=1.9, drop=0.2, hand=(0.2, 3.1, 0.8), blade=('dir', (0.2, 0.85, 0.4))),
    dict(t=2.35, x=1.95, drop=0.14, lean=-12, chest=(-12, 0, 0), head=(-8, 10, 0), hand=(0.15, 4.4, -0.1), blade=('dir', (0.0, 0.35, -0.94))),
    dict(t=2.62, x=1.5, drop=0.3, lean=8, chest=(4, 0, 0), head=(0, 10, 0), hand=(0.1, 4.4, 0.85), blade=('dir', (0.0, 0.95, 0.3)), feet=((0.9, -0.25), (-0.6, 0.3))),
    dict(t=2.75, x=1.3, drop=0.55, lean=26, chest=(14, 0, 0), head=(10, 0, 0), hand=(0.1, 2.9, 1.0), blade=('tip', G, (0.0, -0.45, 0.89)), contact='g'),
    dict(t=3.1, x=1.25, drop=0.32, lean=10, chest=(5, 0, 0), head=(0, 10, 0), hand=(0.1, 2.6, 0.95), blade=('dir', (-0.2, 0.5, 0.85))),
    dict(t=3.35, x=1.15, drop=0.26, chest=(2, -10, 0), hand=(0.1, 3.2, 0.9), blade=('thru', C3), contact='c3'),
    dict(t=3.75, hand=(0.0, 4.1, 0.6), blade=('dir', (0.5, 0.8, 0.1))),
    dict(t=3.95, x=1.2, drop=0.25, hips=10, chest=(0, -48, 0), hand=(0.85, 3.8, -0.2), blade=('dir', (0.9, 0.15, -0.4))),
    dict(t=4.3, x=1.0, z=-0.1, drop=0.3, chest=(0, 10, 0), hand=(-0.15, 4.4, 1.0), blade=('dir', (-0.72, 0.08, 0.68))),
    dict(t=4.55, chest=(0, 42, 0), hand=(-0.9, 4.1, 0.25), blade=('dir', (-0.8, 0.1, -0.55))),
    dict(t=4.85, x=1.2, z=0, lean=10, hips=25, chest=(5, 28, 0), hand=(-0.45, 3.4, 0.6), blade=('dir', (-0.6, 0.6, 0.5))),
    dict(t=5.15, chest=(4, 0, 0), hand=(0.15, 3.15, 0.8), blade=('dir', (-0.3, 0.85, 0.4))),
    dict(t=5.3, x=1.25, drop=0.3, chest=(4, -5, 0), hand=(0.1, 3.2, 0.75), blade=('thru', C4), contact='c4'),
    dict(t=5.6, x=1.75, z=0.45, yaw=40, drop=0.42, lean=-18, chest=(-14, 28, 10), head=(-15, 0, 0), hand=(0.6, 3.6, 0.35),
         blade=('dir', (0.45, 0.85, -0.2)), larm=(-0.9, 3.4, -0.2)),
    dict(t=5.95, x=1.5, z=0.8, yaw=68, drop=0.7, lean=-4, chest=(-4, 38, 14), head=(-5, 10, 0), hand=(0.75, 2.6, 0.4), blade=('dir', (0.35, -0.1, 0.93))),
    dict(t=6.15, x=1.4, z=0.85, yaw=72, drop=1.0, hand=(0.5, 2.7, 0.85), blade=('tip', (-0.95, 0.45, 5.4), (0.1, -0.3, 0.9))),
    dict(t=6.23, x=1.37, z=0.88, yaw=74, drop=1.15, hand=(0.45, 2.65, 0.88), blade=('tip', (-0.65, 0.3, 5.55), (0.1, -0.4, 0.9))),
    dict(t=6.3, x=1.35, z=0.9, yaw=75, drop=1.25, lean=24, chest=(18, 20, 10), head=(15, 5, 0), hand=(0.4, 2.6, 0.9),
         blade=('tip', (-0.35, 0.1, 5.7), (0.1, -0.42, 0.9)), larm='grip', feet=((0.5, -0.3), (-1.0, 0.3))),
    dict(t=6.6, drop=1.3, lean=30, chest=(24, 24, 12), head=(24, 0, 0)),
    dict(t=LEN, drop=1.28, lean=28, chest=(22, 24, 12), head=(20, 6, 0)),
]

# spacing pass (first stills, 2026-11-24): heads were 2.9-3.3 apart at the clashes and the bodies read as overlapping; push both
# fighters 0.45 apart through the exchange (contacts stay on the same world points, the soft-hand IK re-reaches them)
for k in A:
    if 1.6 <= k['t'] <= 5.3 and 'x' in k: k['x'] = round(k['x'] - 0.45, 3)
for k in B:
    if 1.4 <= k['t'] <= 5.3 and 'x' in k and k.get('contact') != 'g': k['x'] = round(k['x'] + 0.45, 3)


def expand(keys):
    out, cur = [], {}
    for k in keys: cur = {**cur, **{a: b for a, b in k.items() if a != 'contact'}}; out.append({**cur, 'contact': k.get('contact')})
    return out


POSES, ERR = {}, []
NUM = ('x', 'z', 'yaw', 'drop', 'hips', 'lean')
def mid(k0, k1, i0, i1):
    """An in-between key half way: numbers and tuples averaged, hand + blade direction from the two solved poses (arc_keys rule:
    a fast cut gets in-betweens, never one big Euler jump; the IK then solves the arc instead of flipping a joint branch)."""
    m = {a: round((k0[a] + k1[a]) / 2, 4) for a in NUM}
    for a in ('chest', 'head'): m[a] = tuple((np.array(k0[a]) + np.array(k1[a])) / 2)
    m['feet'] = tuple(tuple((np.array(f0) + np.array(f1)) / 2) for f0, f1 in zip(k0['feet'], k1['feet']))
    m['larm'] = k1['larm'] if isinstance(k1['larm'], str) or isinstance(k0['larm'], str) else tuple((np.array(k0['larm']) + np.array(k1['larm'])) / 2)
    d = i0['bdir'] + i1['bdir']; d = d / np.linalg.norm(d) if np.linalg.norm(d) > 0.2 else np.cross(i0['bdir'], [0, 1, 0]) + i0['bdir']
    m.update(t=round((k0['t'] + k1['t']) / 2, 4), hand=tuple(loc((i0['hand'] + i1['hand']) / 2)), blade=('dir', tuple(loc(d / np.linalg.norm(d)))), contact=None)
    return m
def jump(r0, r1): return max(abs(a - b) for j in JOINTS for a, b in zip(r0[j], r1[j]))
JOINTS = ['LowerTorso', 'UpperTorso', 'Head', 'RightUpperArm', 'RightLowerArm', 'RightHand', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand',
          'LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot', 'RightUpperLeg', 'RightLowerLeg', 'RightFoot']
NMID = 0
for tag, keys in (('a', A), ('b', B)):
    prev = None; POSES[tag] = []; INFO = []
    for k in expand(keys):
        r, rp, rr, info = pose(tag, k, prev)
        for depth in range(2):                                     # up to 3 in-betweens per segment
            if not POSES[tag] or jump(POSES[tag][-1][1], r) <= 90: break
            k0, i0 = POSES[tag][-1][0], INFO[-1]
            km = mid(k0, k, i0, info); rm, rpm, rrm, im = pose(tag, km, i0)
            POSES[tag].append((km, rm, rpm, rrm, im['err'])); INFO.append(im); NMID += 1
            alt = pose(tag, k, im)                                 # re-solve from the in-between; keep it unless it fits worse
            if alt[3]['err'] < info['err'] + 0.1: r, rp, rr, info = alt
        prev = info; POSES[tag].append((k, r, rp, rr, info['err'])); INFO.append(info)
        ERR.append((round(info['er'], 2), round(info['el'], 2), tag, k['t']))
def near(e, ref):                                              # same rotation, Euler triple closest to ref (XYZ twin + 360 wraps)
    w = lambda v, r: v + 360 * round((r - v) / 360)
    c = [[w(v, r) for v, r in zip(x, ref)] for x in (e, (e[0] + 180, 180 - e[1], e[2] + 180))]
    return tuple(round(v, 3) for v in min(c, key=lambda x: sum(abs(v - r) for v, r in zip(x, ref))))
for P in POSES.values():                                      # kills fake euler-jumps: both triples are one pose
    for i in range(1, len(P)):
        for j in JOINTS: P[i][1][j] = near(P[i][1][j], P[i - 1][1][j])
print('in-between keys', NMID, 'max joint step', max(round(jump(P[i][1], P[i + 1][1]), 1) for P in POSES.values() for i in range(len(P) - 1)))
print('IK worst (right, left, tag, t):', sorted(ERR)[-6:], sorted(ERR, key=lambda e: e[1])[-4:])
worst = max(e for tag in 'ab' for *_, e in POSES[tag]); print(f'IK keys {sum(len(v) for v in POSES.values())}, worst residual {worst:.3f}')

LAG = {'RightLowerArm': 1, 'RightHand': 2, 'LeftLowerArm': 1, 'LeftHand': 2, 'Head': 3}     # overlap: children trail the parent (frames)


def tracks(stage):
    """s1 = stepped key poses; s2+ = auto eases through motion, whip-in strikes, braked follow-through, overlap on children."""
    T = {}
    for tag in 'ab':
        P = POSES[tag]
        def ease(i):
            if stage == 1: return 'step'
            if i + 1 < len(P) and P[i + 1][0]['contact']: return 'cubic:0.7,0,1,0.6'       # strike: whips into the contact
            if P[i][0]['contact']: return 'out'                                            # follow-through brakes
            return 'auto'
        T[f'{tag}_A0'] = {'pos': [[k['t'], rp, ease(i)] for i, (k, r, rp, rr, e) in enumerate(P)],
                          'rot': [[k['t'], rr, ease(i)] for i, (k, r, rp, rr, e) in enumerate(P)]}
        for j in JOINTS:
            ks = []
            for i, (k, r, *_rest) in enumerate(P):
                t = k['t']
                if stage >= 2 and j in LAG and 0 < i < len(P) - 1 and not k['contact'] and k['blade'][0] != 'tip': t = round(t + LAG[j] / FPS, 4)
                ks.append([t, r[j], ease(i)])
            T[f'{tag}_J{j}'] = {'rot': ks}
    return T


CONTACTS = {}
for tag in 'ab':
    for k, *_ in POSES[tag]:
        if k['contact']: CONTACTS[k['contact']] = k['t']
PAY = CONTACTS['c4']; CLASH = sorted(t for c, t in CONTACTS.items() if c != 'c4')


def project(stage, fx=(), warp=None, camera=None):
    p = {k: v for k, v in P0.items() if k not in ('objects', 'anims')}
    p['name'] = f'Crossing s{stage}'; p['objects'] = copy.deepcopy(O); p['camera'] = {'fov': 40, 'ortho': False, 'pos': [0, 3.4, 14], 'target': [0, 2.9, 0]}
    p['env'] = {'bg': '#1d2333', 'light': 'night', 'grid': False, 'fog': None}
    for i, f in enumerate(fx): p['objects'][f'fx{i:03d}'] = f
    c = {'name': 'fight', 'len': LEN, 'fps': FPS, 'loop': False, 'tracks': tracks(min(stage, 2))}
    c['camera'] = camera or {'pos': [[0, [0, 3.4, 14], 'linear'], [LEN, [0, 3.4, 14]]], 'target': [[0, [0, 2.9, 0], 'linear'], [LEN, [0, 2.9, 0]]],
                             'fov': [[0, [40], 'linear'], [LEN, [40]]]}
    if warp: c['warp'] = warp; c['len'] = warp[-1][0]
    p['anims'] = {'fight': c}; return p


# s3: impact frames on every clash (0.12 s freeze, 0.5x recoil for 0.15 story-s), a white pop and a shake kick per clash
FREEZE, SLOW = 0.12, 0.15
def hitstop_warp(times):
    out, off = [[0, 0]], 0
    for t in sorted(times):
        out.append([round(t + off, 4), t]); off += FREEZE; out.append([round(t + off, 4), t])
        off += SLOW; out.append([round(t + SLOW + off, 4), round(t + SLOW, 4)])
    out.append([round(LEN + off, 4), LEN]); return out
HIT = CLASH + [PAY]
S3CAM = {**project(1)['anims']['fight']['camera'],
         'shake': sorted([kk for t in HIT for kk in ([round(t - 1e-3, 4), 0, 'linear'], [t, 0.09 if t != PAY else 0.16, 'out'], [round(t + 0.3, 4), 0, 'linear'])]),
         'flash': sorted([kk for t in CLASH for kk in ([round(t - 1e-3, 4), 0, 'linear'], [t, 0.22, 'out'], [round(t + 0.14, 4), 0, 'linear'])])}

# ---- gates: contacts, blades vs torsos, feet ------------------------------------------------------------------------------
def write(name, p, up):
    d = os.path.join(WORK, name); os.makedirs(d, exist_ok=True)
    json.dump(p, open(os.path.join(d, 'project.json'), 'w'))
    json.dump({'name': p['name'], 'updated': '2026-11-24T00:00:00Z', 'count': len(p['objects']), 'ai': True}, open(os.path.join(d, 'meta.json'), 'w'))
    json.dump(up, open(os.path.join(d, 'uploads.json'), 'w'), indent=1)
    g = os.path.join(d, 'geo')
    if not os.path.islink(g): os.symlink(os.path.realpath(os.path.join(BASE, 'geo')), g)
    return d

UP0 = {k: v for k, v in json.load(open(os.path.join(BASE, 'uploads.json'))).items() if not k.startswith('fx-sd3')}
d2 = write('s2', project(2), UP0)
T2 = Tab(os.path.join(d2, 'project.json'), os.path.join(d2, 'geo'))
fails = []
for c, t in CONTACTS.items():
    if c == 'g': continue
    dd = segdist(*T2.blade('a', t), *T2.blade('b', t))[0]
    if dd > 0.15: fails.append(f'{c} blades {dd:.2f} apart')
tip_g = T2.blade('b', CONTACTS['g'])[1]
if not -0.45 < tip_g[1] < 0.25: fails.append(f'smash tip at y {tip_g[1]:.2f}')
through = []
for t in np.arange(0, LEN, 1 / FPS):                                         # every frame: blade vs the other's torso and head
    for me, other in (('a', 'b'), ('b', 'a')):
        b0, b1 = T2.blade(me, t)
        for j, rad in (('UpperTorso', 0.75), ('Head', 0.55), ('LowerTorso', 0.65)):
            q = T2.pos(f'{other}_J{j}', t) + ([0, 0.7, 0] if j == 'UpperTorso' else [0, 0.5, 0] if j == 'Head' else [0, 0, 0])
            if pdist(q, b0, b1) < rad: through.append((round(float(t), 2), me, j))
if through:
    spans = []
    for t, me, j in through:
        if spans and spans[-1][1] == me and spans[-1][2] == j and t - spans[-1][3] < 0.05: spans[-1][3] = t
        else: spans.append([t, me, j, t])
    fails.append(f'{len(through)} blade-through frames: ' + ', '.join(f'{m}->{j} {a}-{b}' for a, m, j, b in spans))
low = min((T2.blade(t, tt)[1][1], round(float(tt), 2), t) for t in 'ab' for tt in np.arange(0, LEN, 1 / FPS) if abs(tt - CONTACTS['g']) > 0.4)
if low[0] < -0.05: fails.append(f'blade tip under the ground {low}')
print('contacts', {c: round(t, 2) for c, t in CONTACTS.items()}, 'GATE ' + ('PASS' if not fails else 'FAIL: ' + '; '.join(fails)))
json.dump({'payoff': PAY, 'clashes': CLASH, 'len': LEN, 'contacts': {c: R3(segdist(*T2.blade('a', t), *T2.blade('b', t))[1]) if c != 'g' else R3(tip_g) for c, t in CONTACTS.items()},
           'times': CONTACTS, 'gate': fails}, open(os.path.join(WORK, 'beats.json'), 'w'), indent=1)
if '--gate-only' in sys.argv: sys.exit(1 if fails else 0)
write('s1', project(1), UP0)
write('s3', project(3, warp=hitstop_warp(HIT), camera=S3CAM), UP0)

# ---- s6: VFX. Fresh sheets (nf-*, seed 11) from the physics generator, every card placed from the s2 motion ----------------
EL = {'a': 'Ar', 'b': 'Li'}; K = {'a': (7000, 14000), 'b': (900, 1600)}
T = T2
def euler_xyz(R):
    y = math.asin(max(-1, min(1, R[0, 2]))); x = math.atan2(-R[1, 2], R[2, 2]); z = math.atan2(-R[0, 1], R[0, 0])
    return [round(math.degrees(v), 2) for v in (x, y, z)]


def fit_swing(tag, t0, t1):
    """Trace the tip over [t0, t1], fit plane + circle (Kasa): the slash recipe's arc and the card that lays it on the swing."""
    TP = np.array([T.blade(tag, tt)[1] for tt in np.linspace(t0, t1, 41)])
    BP = np.array([(lambda b: b[0] + (b[1] - b[0]) * 0.35)(T.blade(tag, tt)) for tt in np.linspace(t0, t1, 41)])
    m = TP.mean(0); _, sv, Vt = np.linalg.svd(TP - m); e1, e2 = Vt[0], Vt[1]; resid = float(np.abs((TP - m) @ Vt[2]).max())
    xy = np.stack([(TP - m) @ e1, (TP - m) @ e2], 1); cc = np.linalg.lstsq(np.c_[2 * xy, np.ones(len(xy))], (xy ** 2).sum(1), rcond=None)[0][:2]
    ang = lambda e1, e2, cc: np.unwrap(np.arctan2((TP - m) @ e2 - cc[1], (TP - m) @ e1 - cc[0]))
    ph = ang(e1, e2, cc)
    if ph[-1] > ph[0]: e1 = -e1; cc = np.array([-cc[0], cc[1]]); ph = ang(e1, e2, cc)
    ctr = m + cc[0] * e1 + cc[1] * e2; Rt = float(np.linalg.norm(TP - ctr, axis=1).mean()); Rb = float(np.linalg.norm(BP - ctr, axis=1).mean())
    span = math.degrees(ph[0] - ph[-1]); life = round(t1 - t0 + 0.35, 3); size = round(3.6 * Rt, 2)
    prog = '_'.join(f'{(ph[0] - v) / max(ph[0] - ph[-1], 1e-6):.3f}' for v in ph[::4])
    geo = dict(start=round(math.degrees(ph[0]) % 360, 1), end=round((math.degrees(ph[0]) - span) % 360, 1), radius=round(Rt / size, 3),
               sweep=round((t1 - t0) / life * 64, 1), delay=0, cx=0.5, cy=0.5, prog=prog)
    X = e1 / np.linalg.norm(e1); Y = np.cross(e1, e2); Y /= np.linalg.norm(Y); Z = np.cross(X, Y)
    return dict(geo=geo, W=round(0.5 * (Rt - Rb) / size, 3), ctr=R3(ctr), size=size, rot=euler_xyz(np.stack([X, Y, Z], 1)), life=life,
                t0=round(t0, 3), resid=resid, span=span)


def split(sid, tag, t0, t1, depth=0):               # one planar arc per card: halve a piece that leaves its plane by >= 0.1
    f = fit_swing(tag, t0, t1)
    if f['resid'] < 0.1 or depth >= 3: return [(sid, tag, f)]
    m = (t0 + t1) / 2; return split(sid + 'a', tag, t0, m, depth + 1) + split(sid + 'b', tag, m, t1, depth + 1)
SWINGS = [('c1', 'a', 1.6, 1.75), ('g', 'b', 2.5, 2.75), ('c3', 'a', 3.12, 3.35), ('spin', 'b', 3.95, 4.55), ('c4', 'a', 5.15, 5.3), ('c4f', 'a', 5.3, 5.62)]
kv = lambda d: ','.join(f'{a}={b}' for a, b in d.items())
REC, fits = {}, {}
for sid, tag, f in [a for s in SWINGS for a in split(*s)]:
    fits[sid] = (tag, f); g = f['geo']; k0, k1 = K[tag]
    REC[f'nf-trail-{sid}'] = (f"flame-arc:{kv({**g, 'width': round(f['W'] * 0.6, 3), 'k0': k0, 'k1': k1, 'k_ref': k1 * 1.1, 'density': 0.55})}"
                              f"+slash:{kv({**g, 'element': EL[tag], 'width': round(f['W'] * 0.45, 3), 'decay': 6, 'core': 1.2})}"
                              f"+embers:{kv({**g, 'n': 140, 'kelvin': k1, 'speed': 5, 'cool': 16, 'gravity': 0.07})}")
for tag in 'ab':
    e = EL[tag]
    REC[f'nf-impact-{tag}'] = f'shock:element={e},width=0.05+glints:element={e},n=240,speed=5+slash:element={e},width=0.05'
    REC[f'nf-ring-{tag}'] = f'shock:element={e},width=0.04,core=0.6'
    REC[f'nf-spark-{tag}'] = f'glints:element={e},n=300,gravity=0.12'
    REC[f'nf-streak-{tag}'] = f'slash:element={e},start=200,end=160,radius=0.46,width=0.03,sweep=10,decay=8'
REC['nf-aura-a'] = 'kamehameha-charge:element=Ar'
REC['nf-flash'] = 'shock:element=Na+glints:element=Na'
REC['nf-dust'] = 'shock:element=Na,width=0.08,core=0.3'
REC['nf-burst'] = 'shock:element=Na,grow=0.5+glints:element=Na,n=400+kamehameha-charge:element=Ar'
REC['nf-smoke'] = 'explosion'


def build_sheet(item):
    name, rec = item
    if os.path.exists(os.path.join(FX, name + '.png')): return name, 'cached'
    r = subprocess.run([sys.executable, VFX, FX, rec, '--name', name, '--seed', '11'], capture_output=True, text=True)
    return name, 'ok' if r.returncode == 0 else 'FAIL ' + (r.stderr.strip().splitlines() or ['?'])[-1][:160]
with ThreadPoolExecutor(4) as ex: res = list(ex.map(build_sheet, REC.items()))
bad = [r for r in res if r[1].startswith('FAIL')]
print(f'sheets {len(res)}: {sum(r[1] == "ok" for r in res)} built, {sum(r[1] == "cached" for r in res)} cached'); [print(' ', *b) for b in bad]
if bad: sys.exit('Failed: sheets')

FXO = []
def card(p, t, pos, size, life=0.4, flat=False, rot=None, parent=None, loop=False, dur=None, blend='add'):
    if t < 0 or t >= LEN: return
    # flipbooks run on story time, so a hit-stop freezes them: a card born on a hit would hold its blank first frame through the
    # freeze (owner 2026-11-24: "not seeing any vfx"). Pre-roll it so the freeze holds the card at its peak (~12% of life).
    if not loop and any(abs(t - h) < 0.035 for h in HIT): t = max(0.0, t - 0.12 * life)
    life = round(min(life, LEN - t), 3); o = dict(type='flipbook', name=f'FX {p} {t:.2f}', tex='fx-' + p, grid=8, frames=64, parent=parent,
        pos=R3(pos), rot=rot or [0, 0, 0], size=round(size, 2), start=round(float(t), 3), life=life, loop=loop, dur=round(dur or life, 3),
        fps=24 if loop else round(64 / life, 2), blend=blend, flat=flat)
    FXO.append(o)
chest = lambda tag, t: T.pos(f'{tag}_JUpperTorso', t) + [0, 0.6, 0]
feet = lambda tag, t: (T.pos(f'{tag}_JLeftFoot', t) + T.pos(f'{tag}_JRightFoot', t)) / 2
CP = {c: np.array(segdist(*T.blade('a', t), *T.blade('b', t))[1]) for c, t in CONTACTS.items() if c != 'g'}
# 1 fitted swing trails + 2 afterimage echoes (the payoff swing gets brighter, bigger echoes)
for sid, (tag, f) in fits.items():
    for dt, sc in ((0, 1), (0.04, 0.86), (0.08, 0.72)): card(f'nf-trail-{sid}', f['t0'] + dt, f['ctr'], f['size'] * sc, life=f['life'], flat=True, rot=f['rot'])
# 2 clashes: impact in the attacker's colour, sparks of both, a white flash, two rings
for c in ('c1', 'c3'):
    t, p = CONTACTS[c], CP[c]
    card('nf-impact-a', t, p, 4.6, life=0.5); card('nf-spark-a', t + 0.01, p + [0, 0.1, 0.1], 3.2, life=0.45)
    card('nf-spark-b', t + 0.02, p + [0, -0.1, 0.1], 3.2, life=0.45); card('nf-flash', t, p + [0, 0, 0.2], 2.6, life=0.16)
    card('nf-ring-a', t, p, 4.4, life=0.4); card('nf-ring-b', t + 0.06, p, 3.3, life=0.4)
# 3 ground smash: crimson impact on the floor, a flat dust ring, debris smoke, sparks thrown up
tg, q = CONTACTS['g'], np.array(T.blade('b', CONTACTS['g'])[1]); q[1] = 0.05
card('nf-impact-b', tg, q + [0, 0.4, 0], 4.2, life=0.5); card('nf-dust', tg, [q[0], 0.04, q[2]], 5.0, life=0.8, flat=True, rot=[0, 0, 0])
card('nf-smoke', tg + 0.03, q + [0, 0.8, 0], 5.5, life=1.4, blend='normal'); card('nf-spark-b', tg + 0.02, q + [0, 0.7, 0.2], 3.6, life=0.5)
card('nf-ring-b', tg, q + [0, 0.15, 0], 3.6, life=0.4, flat=True, rot=[0, 0, 0])
# 4 near miss: a red streak right over Kaito's ducked head
card('nf-streak-b', 4.28, T.pos('a_JHead', 4.3) + [0, 1.2, 0], 3.4, life=0.25)
# 5 charge: a cyan aura gathers on the sword hand, three tightening rings
card('nf-aura-a', 4.7, [0, 0, 0], 2.6, parent='a_JRightHand', loop=True, dur=0.6)
for i in range(3): card('nf-ring-a', 4.75 + i * 0.15, T.pos('a_JRightHand', 4.75 + i * 0.15), 2.4 - 0.5 * i, life=0.3)
# 6 payoff: the guard breaks - flash, burst, three expanding rings, radial sparks, smoke, floor dust
tp, p = CONTACTS['c4'], CP['c4']
card('nf-flash', tp, p + [0, 0, 0.3], 9, life=0.25); card('nf-burst', tp + 0.02, p, 13, life=1.6); card('nf-impact-a', tp, p, 7, life=0.6)
for i, (dt, sz) in enumerate(((0, 8), (0.08, 11), (0.18, 14))): card(f'nf-ring-{"ab"[i % 2]}', tp + dt, p, sz, life=0.7)
for i in range(8):
    a_ = i * math.pi / 4; card(f'nf-spark-{"ab"[i % 2]}', tp + 0.02 * i, p + [2.4 * math.cos(a_), 1.8 * math.sin(a_), 0.3], 3.4, life=0.7)
card('nf-smoke', tp + 0.1, p + [0, -0.6, -0.4], 10, life=2.0, blend='normal'); card('nf-dust', tp + 0.05, [p[0], 0.04, p[2]], 9, life=1.2, flat=True, rot=[0, 0, 0])
# 7 dash streaks behind the moving fighter
for t0, t1, tag in ((1.35, 1.72, 'a'), (5.2, 5.6, 'a'), (2.5, 2.72, 'b')):
    for t in np.linspace(t0, t1, 4): card(f'nf-streak-{tag}', t, chest(tag, t), 2.4, life=0.22)
# 8 dust at every foot plant and the fall
for t, tag, sz in ((1.6, 'a', 2.4), (1.75, 'b', 2.2), (2.72, 'a', 2.6), (3.35, 'a', 2.2), (4.3, 'a', 2.8), (5.3, 'a', 2.6), (6.1, 'a', 3.0), (6.3, 'b', 4.0)):
    q = feet(tag, t); card('nf-dust', t, [q[0], 0.04, q[2]], sz, life=0.6, flat=True, rot=[0, 0, 0])
# 9 aftermath: embers drift off Ren, smoke thins
for i in range(6): card(f'nf-spark-{"ba"[i % 2]}', 6.2 + i * 0.22, chest('b', 6.5) + [0.4 * (-1) ** i, 0.3 + 0.15 * i, 0.4], 2.0, life=0.8)
print('fx cards', len(FXO), 'trail arcs', len(fits))
UP6 = {**UP0, **{'fx-' + n: os.path.join(FX, n + '.png') for n in REC}}
p6 = project(3, warp=hitstop_warp(HIT), camera=S3CAM); p6['name'] = 'Crossing s6pre'
for i, o in enumerate(FXO): p6['objects'][f'fx{i:03d}'] = o
write('s6pre', p6, UP6)
