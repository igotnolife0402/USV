"""Roblox avatar from real catalog items: a kit from catalog.py (R15 body meshes, accessories, shirt/pants templates, face)
-> the studio's own rig (a group per joint, meshes at rest under it), posed and animated; the studio renders it (owner: studio only, no outside 3D modeling software).

  python3 avatar.py KIT OUT [--name Bacon] [--skin #F2F3F3] [--pose wave|stand|kamehameha|saber_guard] [--clip kamehameha|lightsaber] [--fx fx.json] [--bg #hex]

Needs only numpy and pillow (3D maths in `vmath.py`). Writes
OUT/studio/{project,meta}.json + geo/*.json, OUT/studio/uploads.json, OUT/batches.json, OUT/writes.json; render it with the
studio's shots check (README). Poses use the rig frame (Z up, the avatar faces -Y, its right is -X) so every POSES entry stays as written."""
# @style: toon
# @model: Roblox avatar | posed animated avatar from real catalog items (R15 meshes)
# @run: python3 avatar.py KIT OUT [--name Bacon] [--skin #F2F3F3] [--pose wave|stand|kamehameha|saber_guard] [--clip kamehameha|lightsaber]
import math, os, sys, json, time
import numpy as np
from vmath import Vector, Matrix, Euler
from PIL import Image

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
KIT, OUT = os.path.abspath(args[0]), os.path.abspath(args[1])
opt = lambda k, d: type(d)(args[args.index(k) + 1]) if k in args else d
NAME, SKIN = opt('--name', 'Bacon'), opt('--skin', '#F2F3F3')  # BrickColor "White"
for sub in ('studio/geo', 'studio/tex', 'tex'): os.makedirs(os.path.join(OUT, sub), exist_ok=True)
kit = json.load(open(os.path.join(KIT, 'kit.json')))
R = math.radians

# ---------------- pose (rig frame: Z up, the avatar faces -Y, its right is -X; Euler XYZ degrees) ----------------
POSES = {'wave': {'Root': (0, 0, 8), 'Waist': (0, 0, -3), 'Neck': (2, -6, -3),
        'RightShoulder': (-10, 80, 0), 'RightElbow': (0, 88, 0), 'RightWrist': (0, 8, -90),       # waving
        'LeftShoulder': (-5, -8, 0), 'LeftElbow': (-18, 0, 0), 'LeftWrist': (0, 0, 0),
        'RightHip': (2, 3, 0), 'RightKnee': (4, 0, 0), 'RightAnkle': (-4, 0, 0),
        'LeftHip': (-3, -4, 0), 'LeftKnee': (5, 0, 0), 'LeftAnkle': (-3, 0, 0)},
         'kamehameha': {'Root': (0, 0, 62), 'Waist': (6, 0, 8), 'Neck': (-4, 0, -6),           # both palms forward, wide stance
                        'RightShoulder': (-82, 0, 14), 'RightElbow': (-6, 0, 0), 'LeftShoulder': (-82, 0, -14), 'LeftElbow': (-6, 0, 0),
                        'RightWrist': (-35, 0, 0), 'LeftWrist': (35, 0, 0),
                        'RightHip': (24, 12, 0), 'RightKnee': (8, 0, 0), 'RightAnkle': (-26, 0, 0),
                        'LeftHip': (-38, -10, 0), 'LeftKnee': (46, 0, 0), 'LeftAnkle': (-8, 0, 0)},
         'ready': {'Root': (0, 0, 40), 'Neck': (0, 0, -6), 'RightShoulder': (-3, 6, 0), 'LeftShoulder': (-3, -6, 0),
                   'RightElbow': (-12, 0, 0), 'LeftElbow': (-12, 0, 0), 'RightHip': (1, 3, 0), 'LeftHip': (-1, -3, 0)},
         'charge': {'Root': (0, 0, 40), 'Waist': (6, 0, -30), 'Neck': (0, 0, 24),          # cupped hands at the right hip, wound up
                    # ik: wrist target and elbow direction, in the root's frame (rig axes: right -X, front -Y, up Z)
                    'ik': {'Right': ((-1.0, 0.1, 0.35), (-0.6, 1, 0)), 'Left': ((-0.85, -0.25, 0.72), (0.7, 0.5, 0.3))},
                    'RightHip': (18, 14, 0), 'RightKnee': (30, 0, 0), 'RightAnkle': (-18, 0, 0),
                    'LeftHip': (-30, -12, 0), 'LeftKnee': (45, 0, 0), 'LeftAnkle': (-12, 0, 0)},
         'stand': {'Root': (0, 0, 22), 'Neck': (0, -3, -8), 'RightShoulder': (-4, 7, 0), 'LeftShoulder': (5, -6, 0),     # three-quarter, relaxed
                   'RightHip': (2, 2, 0), 'LeftHip': (-2, -2, 0), 'RightElbow': (-8, 0, 0), 'LeftElbow': (-10, 0, 0)}}
POSES['charge2'] = dict(POSES['charge'], Waist=(9, 0, -40), RightKnee=(36, 0, 0), LeftKnee=(54, 0, 0), LeftHip=(-35, -12, 0))
POSES['kamehameha2'] = dict(POSES['kamehameha'], Waist=(11, 0, 10), RightShoulder=(-86, 0, 12), LeftShoulder=(-86, 0, -12))
# saber: arms by Euler, the blade by `aim` (its direction in the root frame: right -X, front -Y, up Z), so it never guesses
STANCE = {'RightHip': (14, 8, 0), 'RightKnee': (16, 0, 0), 'RightAnkle': (-6, 0, 0), 'LeftHip': (-18, -8, 0), 'LeftKnee': (24, 0, 0), 'LeftAnkle': (-6, 0, 0)}
POSES.update({
    'saber_ready': dict(POSES['stand'], RightShoulder=(-20, 4, 0), RightElbow=(-50, 0, 0)),                                # hilt held low, blade off
    'saber_guard': dict(STANCE, Root=(0, 0, 35), Waist=(2, 0, -10), Neck=(0, 0, 8), RightShoulder=(-38, 0, 12), RightElbow=(-62, 0, 0),
                        LeftShoulder=(-34, 0, -28), LeftElbow=(-66, 0, 0), aim=(0, -0.25, 0.97)),                                                  # blade up in front
    'saber_windup': dict(STANCE, Root=(0, 0, 35), Waist=(-8, 0, 22), Neck=(4, 0, -10), RightShoulder=(-165, 0, 18), RightElbow=(-28, 0, 0),
                         LeftShoulder=(-120, 0, -24), LeftElbow=(-48, 0, 0), aim=(0.1, 0.8, 0.6)),                                                # overhead, blade behind
    'saber_slash': dict(STANCE, Root=(0, 0, 35), Waist=(22, 0, -16), Neck=(-10, 0, 10), RightShoulder=(-24, 0, 26), RightElbow=(-6, 0, 0),
                        aim=(0, -0.96, -0.28), LeftShoulder=(-14, 0, -18), LeftElbow=(-30, 0, 0), RightKnee=(30, 0, 0), LeftKnee=(36, 0, 0)),   # cut down
    'saber_low': dict(STANCE, Root=(0, 0, 35), Waist=(14, 0, 28), Neck=(-6, 0, -18), RightShoulder=(-34, 0, 48), RightElbow=(-24, 0, 0),
                      aim=(0.5, -0.8, -0.3), LeftShoulder=(-8, 0, -6), LeftElbow=(-20, 0, 0)),                               # low left, ready to rise
    'saber_high': dict(STANCE, Root=(0, 0, 35), Waist=(-4, 0, -30), Neck=(4, 0, 20), RightShoulder=(-150, 0, -36), RightElbow=(-10, 0, 0),
                       LeftShoulder=(-20, 0, -10), LeftElbow=(-30, 0, 0), aim=(-0.5, -0.3, 0.8))})                                                  # diagonal up, high right
# greatsword (heavy, two-handed): the right wrist by IK, the blade by `aim`, the left hand by `two_hand` (it grabs the grip
# below the right); weight reads from timing: a slow lift, a long wind-up with the tip sagging behind, a held beat, a fast cut
# that brakes into a low follow-through, then a slow recovery (README, Poses and clips)
GS_LEGS = {'RightHip': (16, 10, 0), 'RightKnee': (22, 0, 0), 'RightAnkle': (-8, 0, 0), 'LeftHip': (-22, -10, 0), 'LeftKnee': (30, 0, 0), 'LeftAnkle': (-8, 0, 0)}
GS_LOW = dict(GS_LEGS, RightKnee=(44, 0, 0), LeftKnee=(56, 0, 0), RightHip=(26, 12, 0), LeftHip=(-34, -12, 0))
POSES.update({
    'gs_ready': dict(GS_LEGS, Root=(0, 0, 30), Waist=(4, 0, -6), Neck=(0, 0, 4), two_hand=True,           # resting on the right shoulder
                     ik={'Right': ((-0.55, -0.6, 1.25), (-0.6, 0.2, -1))}, aim=(-0.25, 0.75, 0.6)),
    'gs_windup': dict(GS_LEGS, Root=(0, 0, 38), Waist=(-14, 0, 22), Neck=(8, 0, -14), two_hand=True,       # overhead, tip sagging behind
                      ik={'Right': ((-0.4, 0.1, 2.55), (-1, 0, 0.2))}, aim=(-0.1, 0.85, -0.5)),
    'gs_windup2': dict(GS_LEGS, Root=(0, 0, 40), Waist=(-18, 0, 26), Neck=(10, 0, -16), two_hand=True,     # the held beat before the cut
                       ik={'Right': ((-0.35, 0.28, 2.5), (-1, 0, 0.2))}, aim=(-0.1, 0.9, -0.6)),
    'gs_strike': dict(GS_LOW, Root=(0, 0, 28), Waist=(26, 0, -6), Neck=(-14, 0, 4), two_hand=True,         # the cut, mid-way down
                      ik={'Right': ((-0.2, -1.15, 1.0), (-1, 0, -0.3))}, aim=(0, -0.85, -0.5)),
    'gs_follow': dict(GS_LOW, Root=(0, 0, 22), Waist=(34, 0, -22), Neck=(-18, 0, 12), two_hand=True,       # braked low, tip near the ground
                      ik={'Right': ((0.3, -0.9, 0.2), (-0.5, 0.3, -1))}, aim=(0.4, -0.75, -0.5)),
    'gs_recover': dict(GS_LEGS, Root=(0, 0, 26), Waist=(14, 0, -10), Neck=(-6, 0, 6), two_hand=True,
                       ik={'Right': ((0.1, -0.95, 0.6), (-0.6, 0.2, -1))}, aim=(0.2, -0.85, -0.3))})
# clips: [(seconds, pose[, ease of the segment it starts])], key poses tweened by the studio's animator (default smooth)
CLIPS = {'kamehameha': [(0, 'ready'), (0.8, 'charge'), (2.4, 'charge2'), (2.75, 'kamehameha'), (4.9, 'kamehameha2'), (5.7, 'ready')],
         'lightsaber': [(0, 'saber_ready'), (0.6, 'saber_guard'), (1.4, 'saber_guard'), (1.9, 'saber_windup'), (2.2, 'saber_slash'),
                        (2.8, 'saber_low'), (3.15, 'saber_high'), (3.8, 'saber_guard'), (4.6, 'saber_guard'), (5.2, 'saber_ready')],
         'greatsword': [(0, 'gs_ready'), (0.5, 'gs_ready'), (1.3, 'gs_windup', 'out')]}
POSES['gs_top'] = dict(GS_LEGS, Root=(0, 0, 34), Waist=(2, 0, 10), Neck=(0, 0, -4), two_hand=True,          # overhead, blade straight up
                       ik={'Right': ((-0.3, -0.45, 2.6), (-1, 0, 0.2))}, aim=(-0.05, -0.3, 0.95))
EASES = {'linear': lambda x: x, 'smooth': lambda x: (1 - math.cos(math.pi * x)) / 2, 'in': lambda x: x ** 3, 'out': lambda x: 1 - (1 - x) ** 3}

def _slerp(a, b, s):
    a, b = np.array(a, float), np.array(b, float); la, lb = np.linalg.norm(a), np.linalg.norm(b); ua, ub = a / la, b / lb
    w = math.acos(max(-1.0, min(1.0, float(ua @ ub))))
    u = ua if w < 1e-6 else (math.sin((1 - s) * w) * ua + math.sin(s * w) * ub) / math.sin(w)
    return tuple(u * (la + (lb - la) * s))

def blend(A, B, s, shoulder=(-0.92, 0, 1.65)):
    """A pose between two: joints lerp; the right wrist target turns about the shoulder and the blade's aim turns (slerp),
    so a fast cut stays a clean arc instead of cutting through the body."""
    P = {j: tuple(x + (y - x) * s for x, y in zip(A.get(j, (0, 0, 0)), B.get(j, (0, 0, 0)))) for j in set(A) | set(B)
         if j not in ('ik', 'aim', 'two_hand')}
    if 'aim' in A and 'aim' in B: P['aim'] = _slerp(A['aim'], B['aim'], s)
    if A.get('two_hand') or B.get('two_hand'): P['two_hand'] = True
    ik = {}
    for side in set(A.get('ik', {})) & set(B.get('ik', {})):
        (ta, pa), (tb, pb) = A['ik'][side], B['ik'][side]; S = np.array(shoulder) * (1 if side == 'Right' else [-1, 1, 1])
        ik[side] = (tuple(S + _slerp(np.array(ta) - S, np.array(tb) - S, s)), tuple(np.array(pa) + (np.array(pb) - np.array(pa)) * s))
    if ik: P['ik'] = ik
    return P

def arc_keys(path, n=5):
    """[(t, pose, ease), ...] -> clip keys with n solved in-betweens per segment (eased in time, linear between keys)."""
    out = []
    for (ta, a, e), (tb, b, _) in zip(path, path[1:]):
        for i in range(n):
            u = i / n; nm = f'{a}~{b}~{i}'
            if i: POSES[nm] = blend(POSES[a], POSES[b], EASES[e](u))
            out.append((round(ta + (tb - ta) * u, 4), a if not i else nm, 'linear'))
    return out

# the heavy cut, super quick (0.22 s at 60 fps): a held beat, then over the top (in), full speed down, braked into the follow-through (out)
CLIPS['greatsword'] += arc_keys([(1.75, 'gs_windup2', 'in'), (1.83, 'gs_top', 'linear'), (1.89, 'gs_strike', 'out'), (1.97, 'gs_follow', 'linear')], 6) + \
                       [(1.97, 'gs_follow'), (2.85, 'gs_recover'), (3.7, 'gs_ready'), (4.3, 'gs_ready')]
# Macarena emote (rebuilt 2026-11-24 after owner rejection): 103 BPM, 16 beats = 9.32 s loop. One hand moves per beat, the
# other holds; the moving arm snaps in 0.15 s, then holds. Wrists by IK in the root frame (right -X, front -Y, up Z; R shoulder
# at (-0.92, 0, 1.65), reach 0.67 + 0.80 = 1.47, every target <= 1.45). Knees dip on each hit, hips sway toward the moving arm,
# 3 hip rolls (beats 13-14), clap + hop (beat 15), landing in the exact frame-0 pose. Review every frame (playbook).
MAC_T = 60 / 103
def _legs(k, roll=0):                    # knee dip k deg, pelvis roll compensated so the feet stay flat
    return {'RightHip': (k * 0.5, -roll, 0), 'LeftHip': (k * 0.5, -roll, 0), 'RightKnee': (k, 0, 0), 'LeftKnee': (k, 0, 0),
            'RightAnkle': (-k * 0.5, 0, 0), 'LeftAnkle': (-k * 0.5, 0, 0)}
_mx = lambda v: (-v[0], v[1], v[2])     # right-side target/pole -> left side
MAC_HAND = {   # right side: (wrist target, elbow pole, wrist euler, left-side offset when this beat crosses over the right arm)
    'rest':      ((-1.05, -0.15, 0.35), (0, 1, 0), (0, 0, 0), None),
    'fwd_down':  ((-0.78, -1.40, 1.45), (-0.3, 0.2, -1), (0, 0, 90), None),    # +90: palm normal (hand +X) points down (probed)
    'fwd_up':    ((-0.78, -1.40, 1.45), (-0.3, 0.2, -1), (0, 0, -90), None),
    'shoulder':  ((0.30, -0.62, 1.40), (-0.4, -0.2, -1), (0, 0, 0), (0.08, -0.18, -0.08)),
    'head':      ((-0.45, 0.75, 2.55), (-1, 0.2, 0.3), (0, 0, 0), None),
    'front_hip': ((-0.10, -0.72, 0.62), (-1, 0, -0.3), (0, 0, 0), (-0.13, -0.12, 0.05)),   # belt height, below the shoulder cross
    'back_hip':  ((-0.70, 0.50, 0.48), (-0.6, 1, 0), (0, 0, 0), None),
    'up_side':   ((-1.25, -0.45, 2.15), (-1, 0, 0), (0, 0, 0), None),     # via key: hand travels outside the face to/from the head
    'down_side': ((-1.20, -0.50, 1.50), (-1, 0, 0), (0, 0, 0), None),     # via key: head -> front hip passes outside the chest
    'hip_side':  ((-1.25, 0.00, 0.55), (-1, 0.3, 0), (0, 0, 0), None),    # via key: front hip -> back pocket passes outside the thigh
    'clap':      ((-0.12, -0.75, 1.25), (-0.5, 0, -1), (0, 0, 0), None),
}
def _mac(r, l, k=4, sway=0, roll=0, waist=(0, 0, 0), neck=(0, 0, 0), shift=None, cross=False):
    P = dict(_legs(k, roll), Root=(0, roll, 0), Waist=waist, Neck=neck, shift=shift or (sway, 0, 0), ik={})
    for side, h, f in (('Right', r, lambda v: v), ('Left', l, _mx)):
        t, pole, w, off = MAC_HAND[h]; t = f(t)
        if side == 'Left' and off: t = (t[0] + off[0], t[1] + off[1], t[2] + off[2])   # left forearm over the right; always, or it jumps when the right moves on
        P['ik'][side] = (t, f(pole)); P[side + 'Wrist'] = w if side == 'Right' else (w[0], w[1], -w[2])
    return P
_SEQ = ['fwd_down', 'fwd_up', 'shoulder', 'head', 'front_hip', 'back_hip']
POSES['mac_ready'] = _mac('rest', 'rest', k=3)
CLIPS['macarena'] = [(0, 'mac_ready'), (round(MAC_T - 0.15, 3), 'mac_ready')]
r = l = 'rest'; prev_lean = 0
VIA = {'head': 'up_side', 'front_hip': 'down_side', 'back_hip': 'hip_side'}   # every cross-body move gets an outside via key
for b in range(12):                      # beats 1-12: one hand per beat, snap 0.15 s, hold the rest of the beat
    move = _SEQ[b // 2]
    if b % 2 == 0: r = move
    else: l = move
    side = 1 if b % 2 == 0 else -1       # right arm moving = sway toward -X
    cross = move in ('shoulder', 'front_hip') and b % 2 == 1
    lean = (10, 0, 0) if 'front_hip' in (r, l) else (0, 0, 0)   # keep the lean while a hand is still on the front hip (reach)
    hit, hold = f'mac_{b + 1}', f'mac_{b + 1}_hold'
    POSES[hit] = _mac(r, l, k=11, sway=-0.08 * side, waist=(lean[0] + 2, 0, 5 * side), neck=(4, 0, -3 * side), cross=cross)
    POSES[hold] = _mac(r, l, k=3, sway=-0.04 * side, waist=(lean[0], 0, 3 * side), neck=(0, 0, -2 * side), cross=cross)
    t = (b + 1) * MAC_T
    if move in VIA:                      # moving hand arcs outside face/chest/thigh, never through the body
        via = f'mac_{b + 1}_via'; vr, vl = ((VIA[move], l) if side == 1 else (r, VIA[move]))
        # full lean of before/after: half lean pushed the other hand (still on the front hip) out of reach
        POSES[via] = _mac(vr, vl, k=7, sway=-0.06 * side, waist=(max(lean[0], prev_lean) + 2, 0, 4 * side), cross=False)
        CLIPS['macarena'].append((round(t - 0.075, 3), via))
    prev_lean = lean[0]
    CLIPS['macarena'] += [(round(t, 3), hit, 'out'), (round(t + 0.25, 3), hold), (round(t + MAC_T - 0.15, 3), hold)]
for i in range(12):                      # beats 13-14: 3 hip rolls, hands in the back pockets
    a_ = i * math.pi / 2; nm = f'mac_roll{i}'
    x, y = 0.25 * math.cos(a_), 0.15 * math.sin(a_)   # 0.12 was invisible from the front camera (frame review)
    POSES[nm] = _mac('back_hip', 'back_hip', k=9, roll=-48 * x, waist=(0, 40 * x, -20 * y), shift=(x, y, 0))
    CLIPS['macarena'].append((round(13 * MAC_T + i * 2 * MAC_T / 12, 3), nm))
POSES['mac_crouch'] = _mac('back_hip', 'back_hip', k=22, waist=(6, 0, 0))                     # load for the hop
POSES['mac_clap'] = _mac('clap', 'clap', k=0, neck=(-6, 0, 0), shift=(0, 0, 0.25))           # "Hey!": clap in the air
POSES['mac_land'] = _mac('rest', 'rest', k=16, waist=(4, 0, 0))
CLIPS['macarena'] += [(round(14.85 * MAC_T, 3), 'mac_crouch', 'out'), (round(15.25 * MAC_T, 3), 'mac_clap', 'in'),
                      (round(15.6 * MAC_T, 3), 'mac_land', 'out'), (round(16 * MAC_T, 3), 'mac_ready')]
CLIP = opt('--clip', '')
POSE = POSES[opt('--pose', 'wave')]
BG = opt('--bg', '#0b0f1a')                       # studio sky behind effects
FX = json.load(open(opt('--fx', ''))) if '--fx' in args else None     # effect cards: README "Effects"
FXDIR = os.path.dirname(os.path.abspath(opt('--fx', '.')))

to_b = lambda p: Vector((-p[0], p[2], p[1]))        # Roblox (Y up, faces -Z, right +X) -> rig frame (Z up, faces -Y, right -X)

# ---------------- textures ----------------
RIG = kit.get('rig', 'R15')
COL = {k[:-6]: '#' + v.lstrip('#') for k, v in (kit.get('colors') or {}).items()}      # headColor3 -> head
skin = lambda part: COL.get(part, SKIN)

def composite(layers, path, color, tshirt=None):
    """Skin under the classic templates (pants first, shirt on top, as Roblox draws them); a T-shirt sits on the torso front."""
    im = Image.new('RGBA', (585, 559), color)
    for f in layers:
        if f: im.alpha_composite(Image.open(os.path.join(KIT, f)).convert('RGBA').resize((585, 559)))
    if tshirt: im.alpha_composite(Image.open(os.path.join(KIT, tshirt)).convert('RGBA').resize((128, 128), Image.LANCZOS), (231, 74))
    im.convert('RGB').save(path, optimize=True)

T = lambda n: os.path.join(OUT, 'tex', n + '.png')
composite([kit['pants'], kit['shirt']], T('torso'), skin('torso'), kit.get('tshirt'))
for side in ('right', 'left'):
    composite([kit['shirt']], T(side + 'arm'), skin(side + 'Arm')); composite([kit['pants']], T(side + 'leg'), skin(side + 'Leg'))
face = Image.new('RGBA', (256, 256), skin('head'))
if kit.get('face'): face.alpha_composite(Image.open(os.path.join(KIT, kit['face'])).convert('RGBA').resize((256, 256), Image.LANCZOS))
face.convert('RGB').save(T('face'))
for a in kit['accessories']:
    if a.get('texture'): Image.open(os.path.join(KIT, a['texture'])).convert('RGB').save(T('acc-' + a['mesh'].split('.')[0]))
    else: Image.new('RGB', (4, 4), '#a3a2a5').save(T('acc-' + a['mesh'].split('.')[0]))      # untextured: Roblox's medium grey

# classic template rectangles (x0 of each face; rows y): torso and the two limb blocks
TORSO = {'F': (231, 74, 128, 128), 'B': (427, 74, 128, 128), 'R': (165, 74, 64, 128), 'L': (361, 74, 64, 128), 'U': (231, 8, 128, 64), 'D': (231, 204, 128, 64)}
LIMB = {'Right': {'F': 217, 'R': 151, 'B': 85, 'L': 19}, 'Left': {'F': 308, 'L': 374, 'B': 440, 'R': 506}}
GROUP = {'UpperTorso': 'Torso', 'LowerTorso': 'Torso', 'Torso': 'Torso', 'RightArm': 'RightArm', 'LeftArm': 'LeftArm', 'RightLeg': 'RightLeg', 'LeftLeg': 'LeftLeg'}
for s in ('Right', 'Left'):
    for p in ('UpperArm', 'LowerArm', 'Hand'): GROUP[s + p] = s + 'Arm'
    for p in ('UpperLeg', 'LowerLeg', 'Foot'): GROUP[s + p] = s + 'Leg'

def rects(group):
    if group == 'Torso': return TORSO
    x = LIMB['Right' if group.startswith('Right') else 'Left']
    r = {k: (x[k], 355, 64, 128) for k in 'FBRL'}; r['U'] = (x['F'], 289, 64, 64); r['D'] = (x['F'], 485, 64, 64)
    return r

# Roblox's R15 composite gives each part a slice of the side strips (DevForum R15 limb/torso layouts): upper limb 46%,
# lower 34%, hand/foot 20%; upper torso 75%, lower 25%. Caps: U only on the top part, D only on the bottom one.
SLICE = {'Torso': (0, 1, 'UD'), 'RightArm': (0, 1, 'UD'), 'LeftArm': (0, 1, 'UD'), 'RightLeg': (0, 1, 'UD'), 'LeftLeg': (0, 1, 'UD'),   # R6: one box per limb
         'Upper': (0, 0.46, 'U'), 'Lower': (0.46, 0.80, ''), 'Hand': (0.80, 1, 'D'), 'Foot': (0.80, 1, 'D'), 'UpperTorso': (0, 0.75, 'U'), 'LowerTorso': (0.75, 1, 'D')}
slice_of = lambda name: SLICE.get(name) or SLICE[next(k for k in ('Upper', 'Lower', 'Hand', 'Foot') if k in name)]

def box_uv(p, n, lo, hi, plo, phi, sl, rc):
    """Classic clothing wraps a limb like a box: pick the face by the triangle normal, place the point inside it (Roblox frame).
    x and z come from the whole limb's box (lo, hi); height from the part's own box (plo, phi) into its slice of the strip."""
    xn, zn = ((p[i] - lo[i]) / max(hi[i] - lo[i], 1e-6) for i in (0, 2)); yn = (p[1] - plo[1]) / max(phi[1] - plo[1], 1e-6)
    s0, s1, caps = sl; down = s0 + (1 - yn) * (s1 - s0)          # 0 at the strip's top
    ax = max(range(3), key=lambda i: abs(n[i]))
    if ax == 1 and not ((n[1] > 0 and 'U' in caps and yn > 0.85) or (n[1] < 0 and 'D' in caps and yn < 0.12)):
        ax = 0 if abs(n[0]) > abs(n[2]) else 2                 # elbows, knees and the waist seam stay on the sides
    if ax == 2: f, a, b = ('F', 1 - xn, down) if n[2] < 0 else ('B', xn, down)
    elif ax == 0: f, a, b = ('R', 1 - zn, down) if n[0] > 0 else ('L', zn, down)
    else: f, a, b = ('U', 1 - xn, 1 - zn) if n[1] > 0 else ('D', 1 - xn, zn)
    x0, y0, w, h = rc[f]; ins = 1.0                                   # 1 px inset: bilinear filtering never reads the gap
    px = x0 + ins + min(max(a, 0), 1) * (w - 2 * ins); py = y0 + ins + min(max(b, 0), 1) * (h - 2 * ins)
    return (px / 585, 1 - py / 559)

# ---------------- scene: a minimal transform tree (a small object tree on numpy) ----------------
class Obj:
    """An empty (pivot) or a mesh: location + Euler XYZ rotation under a parent, world = parent @ parent_inverse @ local."""
    def __init__(s, name, P=None, F=None, uv=None, tex=None, rough=0.5):
        s.name, s.location, s.rotation_euler, s.parent, s.matrix_parent_inverse = name, Vector(), Euler(), None, Matrix.Identity(4)
        s.P = None if P is None else np.asarray(P, np.float64); s.F, s.uv, s.tex, s.rough = F, uv, tex, rough
    @property
    def matrix_world(s):
        M = Matrix.Translation(s.location) @ s.rotation_euler.to_matrix().to_4x4()
        return s.parent.matrix_world @ s.matrix_parent_inverse @ M if s.parent else M
    def world_verts(s):
        M = np.array(s.matrix_world); return s.P @ M[:3, :3].T + M[:3, 3]

objects = {}

def mesh_obj(name, P, F, uvs, tex, rough=0.5):
    """P: rig-frame verts; F: faces (tris or quads); uvs: per face corner."""
    o = Obj(name, P, F, uvs, tex, rough); objects[name] = o; return o

def box(c, sz):
    """R6 limb: a sharp box, one quad per face with its own corners (flat shading, clean UVs)."""
    P, F, N = [], [], []
    for ax in range(3):
        for sg in (-1, 1):
            u, v = [i for i in range(3) if i != ax]; base = len(P)
            for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                q = [0, 0, 0]; q[ax] = sg; q[u] = a; q[v] = b
                P.append([c[i] + q[i] * sz[i] / 2 for i in range(3)]); N.append([sg if i == ax else 0 for i in range(3)])
            f = [base, base + 1, base + 2, base + 3]; e1, e2 = (Vector(P[base + k]) - Vector(P[base]) for k in (1, 2))
            F.append(f if e1.cross(e2)[ax] * sg > 0 else f[::-1])          # counter-clockwise seen from outside: the normal picks the template face
    return P, F, N

def head_mesh(w, bev, sides=48, seg=8):
    """Classic head: a cylinder (axis Z, local) w wide and tall with its rims rounded by `bev` (quarter circles)."""
    r, h = w / 2, w / 2; prof = [(0.0, -h)]
    for cz, a0 in ((-h + bev, -90), (h - bev, 0)):                 # bottom rim arc, then top rim arc
        prof += [(r - bev + bev * math.cos(math.radians(a0 + 90 * k / seg)), cz + bev * math.sin(math.radians(a0 + 90 * k / seg))) for k in range(seg + 1)]
    prof.append((0.0, h))
    P, F = [], []
    for k in range(sides):
        t = 2 * math.pi * k / sides; P += [(pr * math.cos(t), pr * math.sin(t), pz) for pr, pz in prof]
    n = len(prof)
    for k in range(sides):
        a, b = k * n, ((k + 1) % sides) * n
        for j in range(n - 1): F.append([a + j, b + j, b + j + 1, a + j + 1])
    return P, F

TEXOF = {'Torso': 'torso', 'RightArm': 'rightarm', 'LeftArm': 'leftarm', 'RightLeg': 'rightleg', 'LeftLeg': 'leftleg'}
parts = {}
if RIG == 'R6':           # classic blocks: torso 2x2x1 at the origin, limbs 1x2x1; Motor6D pivots at the torso edges
    for n, c, sz in (('Torso', (0, 0, 0), (2, 2, 1)), ('RightArm', (1.5, 0, 0), (1, 2, 1)), ('LeftArm', (-1.5, 0, 0), (1, 2, 1)),
                     ('RightLeg', (0.5, -2, 0), (1, 2, 1)), ('LeftLeg', (-0.5, -2, 0), (1, 2, 1))):
        P, F, N = box(c, sz); parts[n] = {'name': n, 'P': P, 'F': F, 'N': N, 'cf': [list(c)], 'att': {}}
    JOINT = {'Torso': ('Root', None, [0, 0, 0]), 'Head': ('Neck', 'Torso', [0, 1, 0]),
             'RightArm': ('RightShoulder', 'Torso', [1, 0.5, 0]), 'LeftArm': ('LeftShoulder', 'Torso', [-1, 0.5, 0]),
             'RightLeg': ('RightHip', 'Torso', [1, -1, 0]), 'LeftLeg': ('LeftHip', 'Torso', [-1, -1, 0])}
    ATT = {'NeckAttachment': ('Torso', (0, 1, 0)), 'BodyFrontAttachment': ('Torso', (0, 0, -0.5)), 'BodyBackAttachment': ('Torso', (0, 0, 0.5)),
           'LeftCollarAttachment': ('Torso', (-1, 1, 0)), 'RightCollarAttachment': ('Torso', (1, 1, 0)), 'WaistFrontAttachment': ('Torso', (0, -1, -0.5)),
           'WaistCenterAttachment': ('Torso', (0, -1, 0)), 'WaistBackAttachment': ('Torso', (0, -1, 0.5)),
           'RightShoulderAttachment': ('RightArm', (1.5, 1, 0)), 'LeftShoulderAttachment': ('LeftArm', (-1.5, 1, 0)),
           'RightGripAttachment': ('RightArm', (1.5, -1, 0)), 'LeftGripAttachment': ('LeftArm', (-1.5, -1, 0)),
           'RightFootAttachment': ('RightLeg', (0.5, -3, 0)), 'LeftFootAttachment': ('LeftLeg', (-0.5, -3, 0))}
else:                     # R15 meshes, normalised to each MeshPart's size and placed at its CFrame
    for p in kit['parts']:
        m = json.load(open(os.path.join(KIT, p['mesh'])))
        lo = [min(v[i] for v in m['P']) for i in range(3)]; hi = [max(v[i] for v in m['P']) for i in range(3)]
        c = [(lo[i] + hi[i]) / 2 for i in range(3)]; s = [p['size'][i] / max(hi[i] - lo[i], 1e-6) for i in range(3)]
        P = [[(v[i] - c[i]) * s[i] + p['cf'][0][i] for i in range(3)] for v in m['P']]
        parts[p['name']] = dict(p, P=P, F=m['F'], N=m['N'], U=m['U'])
    pos = lambda part, att: [parts[part]['cf'][0][i] + parts[part]['att'][att][i] for i in range(3)]
    JOINT = {'LowerTorso': ('Root', None, pos('LowerTorso', 'RootRigAttachment')), 'UpperTorso': ('Waist', 'LowerTorso', pos('UpperTorso', 'WaistRigAttachment')),
             'Head': ('Neck', 'UpperTorso', pos('UpperTorso', 'NeckRigAttachment'))}
    for s in ('Right', 'Left'):
        JOINT[s + 'UpperArm'] = (s + 'Shoulder', 'UpperTorso', pos(s + 'UpperArm', s + 'ShoulderRigAttachment'))
        JOINT[s + 'LowerArm'] = (s + 'Elbow', s + 'UpperArm', pos(s + 'LowerArm', s + 'ElbowRigAttachment'))
        JOINT[s + 'Hand'] = (s + 'Wrist', s + 'LowerArm', pos(s + 'Hand', s + 'WristRigAttachment'))
        JOINT[s + 'UpperLeg'] = (s + 'Hip', 'LowerTorso', pos(s + 'UpperLeg', s + 'HipRigAttachment'))
        JOINT[s + 'LowerLeg'] = (s + 'Knee', s + 'UpperLeg', pos(s + 'LowerLeg', s + 'KneeRigAttachment'))
        JOINT[s + 'Foot'] = (s + 'Ankle', s + 'LowerLeg', pos(s + 'Foot', s + 'AnkleRigAttachment'))
    ATT = {a: (n, [p['cf'][0][i] + off[i] for i in range(3)]) for n, p in parts.items() for a, off in p['att'].items() if 'Rig' not in a}
glo, ghi = {}, {}
for n, p in parts.items():
    g = GROUP[n]
    for v in p['P']:
        glo[g] = [min(a, b) for a, b in zip(glo.get(g, v), v)]; ghi[g] = [max(a, b) for a, b in zip(ghi.get(g, v), v)]

piv = {}
def pivot(part):
    if part in piv: return piv[part]
    jn, parent, at = JOINT[part]
    e = Obj(jn); e.location = to_b(at)
    if parent:
        pe = pivot(parent); e.parent = pe; e.matrix_parent_inverse = pe.matrix_world.inverted()
    piv[part] = e; return e

def attach(o, part):
    pe = pivot(part); o.parent = pe; o.matrix_parent_inverse = pe.matrix_world.inverted()

for n, p in parts.items():
    g = GROUP[n]; rc = rects(g); uvs = []; sl = slice_of(n)
    plo = [min(v[i] for v in p['P']) for i in range(3)]; phi = [max(v[i] for v in p['P']) for i in range(3)]
    for f in p['F']:
        a, b, c = (Vector(p['P'][i]) for i in f[:3]); nrm = (b - a).cross(c - a)        # quads (R6 boxes) or triangles
        nrm = nrm.normalized() if nrm.length > 1e-9 else Vector((0, 0, -1))
        uvs.append([box_uv(p['P'][i], nrm, glo[g], ghi[g], plo, phi, sl, rc) for i in f])
    o = mesh_obj(n, [to_b(v) for v in p['P']], p['F'], uvs, TEXOF[g]); attach(o, n)

# classic head (R15 default 1.2 studs) with the face decal on its front; its neck joint sits 0.5 below its centre
HW, HB = 1.2, 0.24
FACE = 1.4      # the face image spans 1.4 studs, centred: Roblox's own thumbnail puts the Smile eyes 0.30 above centre, mouth 0.27 below
neck = JOINT['Head'][2]; hc = [neck[0], neck[1] + 0.5, neck[2]]
HEADLESS = kit.get('headless', False)
HP, HF = head_mesh(HW, HB)
huv = [[(0.5 + HP[i][0] / FACE, 0.5 + HP[i][2] / FACE) if HP[i][1] < 0 else (0.004, 0.004) for i in f] for f in HF]   # front is -Y
hd = mesh_obj('Head', HP, HF, huv, 'face'); hd.location = to_b(hc); attach(hd, 'Head')
if HEADLESS: objects.pop('Head')          # pivot stays: hair and hats still follow the neck

# accessories: Handle = part * bodyAttachment * handleAttachment^-1 (body attachments are unrotated; the handle's may tilt, e.g. a bat)
HEAD_ATT = {'HairAttachment': (0, 0.6, 0), 'HatAttachment': (0, 0.6, 0), 'FaceFrontAttachment': (0, 0, -0.6), 'FaceCenterAttachment': (0, 0, 0)}
for k, v in HEAD_ATT.items(): ATT[k] = ('Head', [hc[i] + v[i] for i in range(3)])
for a in kit['accessories']:
    m = json.load(open(os.path.join(KIT, a['mesh']))); part, bp = ATT.get(a['attachment'], ATT['HatAttachment'])
    r = a.get('att_rot') or (1, 0, 0, 0, 1, 0, 0, 0, 1); Rt = Matrix(((r[0], r[1], r[2]), (r[3], r[4], r[5]), (r[6], r[7], r[8]))).transposed()
    hp = Vector(bp) - Rt @ Vector(a['att_cf'])
    if a.get('meshpart') and a.get('size'):
        lo = [min(v[i] for v in m['P']) for i in range(3)]; hi = [max(v[i] for v in m['P']) for i in range(3)]
        loc = [[(v[i] - (lo[i] + hi[i]) / 2) * a['size'][i] / max(hi[i] - lo[i], 1e-6) for i in range(3)] for v in m['P']]
    else: loc = [[v[i] * a['scale'][i] + a['offset'][i] for i in range(3)] for v in m['P']]
    P = [hp + Rt @ Vector(v) for v in loc]
    o = mesh_obj(a['name'].replace(' ', ''), [to_b(v) for v in P], m['F'], [[tuple(m['U'][i]) for i in f] for f in m['F']], 'acc-' + a['mesh'].split('.')[0], 0.45)
    attach(o, part)

ROOT = 'Torso' if RIG == 'R6' else 'LowerTorso'; root = piv[ROOT]; ROOT_LOC = root.location.copy()
meshes = list(objects.values())
REST = {p: e.matrix_world.translation.copy() for p, e in piv.items()}          # every pivot unrotated here
REST_W = {o.name: o.matrix_world.copy() for o in meshes}

def frame(x, pole):
    x = x.normalized(); y = (pole - x * pole.dot(x)).normalized(); return Matrix((x, y, x.cross(y))).transposed()

def ik_arm(side, target, pole):
    """Two-bone IK: shoulder and elbow turn so the wrist reaches `target` with the elbow toward `pole` (world, rig frame)."""
    up, lo_, hd = (side + 'UpperArm', side + 'LowerArm', side + 'Hand') if RIG != 'R6' else (side + 'Arm', None, None)
    sp = piv[up]; S = sp.matrix_world.translation; Rp = sp.parent.matrix_world.to_3x3()
    back = Vector((0, 1, 0))                                       # at rest the arm hangs and its elbow points back
    if not lo_:                                                    # R6: one bone aims at the target
        d0 = Vector((0, 0, -1)); sp.rotation_euler = (Rp.transposed() @ frame(target - S, pole) @ frame(d0, back).transposed()).to_euler('XYZ'); return
    a, b = (REST[lo_] - REST[up]).length, (REST[hd] - REST[lo_]).length
    v = target - S; d = min(max(v.length, abs(a - b) + 1e-3), a + b - 1e-3); u = v.normalized()
    along = (a * a - b * b + d * d) / (2 * d); h = math.sqrt(max(a * a - along * along, 0))
    E = S + u * along + (pole - u * pole.dot(u)).normalized() * h; T = S + u * d
    Rs = frame(E - S, pole) @ frame(REST[lo_] - REST[up], back).transposed()
    Re = frame(T - E, pole) @ frame(REST[hd] - REST[lo_], back).transposed()
    sp.rotation_euler = (Rp.transposed() @ Rs).to_euler('XYZ')
    piv[lo_].rotation_euler = (Rs.transposed() @ Re).to_euler('XYZ')

def set_pose(P):
    """Pose by joint name (rig frame degrees; 'ik' places wrists, see POSES), then lift so the lowest point stands on
    the ground. -> (lo, hi)."""
    for part, e in piv.items(): e.rotation_euler = Euler(tuple(R(x) for x in P.get(JOINT[part][0], (0, 0, 0))))
    root.location = ROOT_LOC.copy()
    for side, (t, pole) in P.get('ik', {}).items():
        M = root.matrix_world; ik_arm(side, M @ Vector(t), M.to_3x3() @ Vector(pole))
    if 'aim' in P:                       # held blade: the right wrist turns so the grip (forward at rest) points along `aim` (root frame)
        e = piv['RightHand'] if RIG != 'R6' else piv['RightArm']; Rw = e.matrix_world.to_3x3().normalized()
        q = (Rw @ Vector((0, -1, 0))).rotation_difference((root.matrix_world.to_3x3() @ Vector(P['aim'])).normalized())
        e.rotation_euler = (e.parent.matrix_world.to_3x3().normalized().inverted() @ q.to_matrix() @ Rw).to_euler('XYZ')
    if P.get('two_hand') and RIG != 'R6':  # the left hand grabs the grip just below the right
        g, fwd = grip()
        ik_arm('Left', g - fwd * 0.5, root.matrix_world.to_3x3() @ Vector((0.8, 0.2, -0.6)))
    sx, sy, sz = P.get('shift', (0, 0, 0))   # root offset (root frame x/y; z = hop height above the ground)
    root.location += root.matrix_world.to_3x3() @ Vector((sx, sy, 0))
    W = np.concatenate([o.world_verts() for o in meshes]); lo, hi = Vector(W.min(0)), Vector(W.max(0))
    root.location.z -= lo.z - sz; hi.z -= lo.z - sz; lo.z = sz
    return lo, hi

HANDP = piv['RightHand'] if RIG != 'R6' else piv['RightArm']                 # rest: the grip at the right hand's centre, forward (-Y)
HANDM = objects['RightHand' if RIG != 'R6' else 'RightArm']
GRIP = HANDP.matrix_world.inverted() @ Vector(HANDM.world_verts().mean(0))
def grip():
    """World grip point and blade direction (the hand's forward) in the current pose."""
    M = HANDP.matrix_world; return M @ GRIP, (M.to_3x3().normalized() @ Vector((0, -1, 0))).normalized()

lo, hi = set_pose(POSE)

# ---------------- studio copy: the same meshes, Y up ----------------
CB = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))                     # rig frame (Z up, faces -Y) -> studio (Y up, faces +Z)
sv = lambda v: [round(v.x, 3), round(v.z, 3), round(-v.y, 3)]

def srot(e):
    """A pivot's rotation (rig frame, in its parent's frame) -> studio Euler degrees (three.js 'XYZ' = Rx Ry Rz = order 'ZYX' here)."""
    eu = (CB @ e.rotation_euler.to_matrix() @ CB.transposed()).to_euler('ZYX')
    return [round(math.degrees(a), 2) for a in (eu.x, eu.y, eu.z)]

SWING_VIEW = {}
def cam_view():
    """Studio camera: the avatar's front three-quarter; with effects, side-on so the aim runs left to right on screen;
    with a swing trail, square to the cut (30 deg off its plane's normal, toward the avatar's front), so the arc reads whole."""
    if SWING_VIEW: return SWING_VIEW
    if not FX: return {'fov': 50, 'ortho': False, 'pos': [5.5, 4.2, 10.5], 'target': [0, 2.8, 0]}
    t = ((lo + hi) / 2 + HANDS + AIM * 2.5) / 2; a = Vector((AIM.x, AIM.y, 0)).normalized()
    look = Vector((0, 0, 1)).cross(a)                            # rig frame: camera looks along up x aim, so screen-right = aim
    return {'fov': 50, 'ortho': False, 'pos': sv(t - look * 15 + Vector((0, 0, 1.2))), 'target': sv(t)}

def studio_rig(cards=(), keys=None):
    """The avatar as the studio's own rig: a group per joint (at its pivot), meshes at rest under them, so the studio's
    animator poses it. The render pose becomes the groups' rotations; `keys` [(t, pose)] adds a smooth key-pose clip;
    `cards` become flipbook objects (follow the hands or stay in the world, shown in a time window, optional grow)."""
    objs = {'A0': {'type': 'group', 'name': NAME, 'parent': None, 'pos': [0, 0, 0]}}; files = []; texs = set()
    part_of = {e.name: part for part, e in piv.items()}
    for part, (jn, parent, at) in JOINT.items():
        objs['J' + part] = {'type': 'group', 'name': jn, 'parent': 'J' + parent if parent else 'A0', 'pos': sv(REST[part] - (REST[parent] if parent else Vector())), 'rot': [0, 0, 0]}
    for i, o in enumerate(meshes):
        part = part_of[o.parent.name]; W = REST_W[o.name]; st = {'texture': o.tex, 'roughness': o.rough}; texs.add(o.tex)
        verts, uvs, faces, key = [], [], [], {}
        tris = [(f[0], f[j], f[j + 1], o.uv[fi][0], o.uv[fi][j], o.uv[fi][j + 1]) for fi, f in enumerate(o.F) for j in range(1, len(f) - 1)]
        for tri in tris:
            f = []
            for vi, tuv in zip(tri[:3], tri[3:]):
                p = sv(W @ Vector(o.P[vi]) - REST[part]); uv = tuple(round(float(c), 4) for c in tuv)
                k = (*p, *uv)                                                  # weld by position + UV: smooth shading in the studio
                if k not in key: key[k] = len(verts) // 3; verts += p; uvs += list(uv)
                f.append(key[k])
            if len(set(f)) == 3: faces.append(f)
        def emit(fs, tag):                       # the studio caps a doc at 250 KB
            used = sorted({v for f in fs for v in f}); rm = {v: j for j, v in enumerate(used)}
            g = {'verts': [verts[v * 3 + c] for v in used for c in range(3)], 'faces': [[rm[v] for v in f] for f in fs], 'uvs': [uvs[v * 2 + c] for v in used for c in range(2)]}
            txt = json.dumps(g, separators=(',', ':'))
            if len(txt) > 220_000: h = len(fs) // 2; emit(fs[:h], tag + 'a'); emit(fs[h:], tag + 'b'); return
            gid = f'{NAME.lower()}-{o.name.lower()}{tag}'
            open(os.path.join(OUT, 'studio', 'geo', gid + '.json'), 'w').write(txt)
            objs[f'M{i}{tag}'] = {'type': 'mesh', 'name': o.name, 'geo': gid, 'parent': 'J' + part, 'pos': [0, 0, 0], 'color': '#ffffff', 'smooth': True,
                                  'roughness': st['roughness'], 'texture': 't-' + st['texture']}
            files.append(gid)
        emit(faces, '')
    def pose_vals(P):
        set_pose(P); return {p: srot(e) for p, e in piv.items()}, sv(root.matrix_world.translation)
    rots, rp = pose_vals(POSE)
    for p, r in rots.items(): objs['J' + p]['rot'] = r
    objs['J' + ROOT]['pos'] = rp
    tracks, anims = {}, {}
    if keys:
        vals = [(kk[0], *pose_vals(POSES[kk[1]]), kk[2] if len(kk) > 2 else 'smooth') for kk in keys]
        for p in piv:
            ks = [[t, v[p], e] for t, v, _, e in vals]
            if any(k[1] != ks[0][1] for k in ks): tracks.setdefault('J' + p, {})['rot'] = ks
        tracks.setdefault('J' + ROOT, {})['pos'] = [[t, q, e] for t, _, q, e in vals]
    uploads, k = {}, 0
    EASE = {'linear': lambda x: x, 'ease': lambda x: 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2, 'smooth': lambda x: (1 - math.cos(math.pi * x)) / 2,
            'in': lambda x: x ** 3, 'out': lambda x: 1 - (1 - x) ** 3}
    def sample(ks, t):                   # the studio's own key sampling (plugins/anim.js `sample`): per-channel lerp, ease of the segment's first key
        if t <= ks[0][0]: return ks[0][1]
        if t >= ks[-1][0]: return ks[-1][1]
        i = max(j for j in range(len(ks)) if ks[j][0] <= t); a, b = ks[i], ks[i + 1]
        e = EASE.get(a[2] if len(a) > 2 else 'linear', EASE['linear'])((t - a[0]) / (b[0] - a[0]))
        return [x + (y - x) * e for x, y in zip(a[1], b[1])]
    def pose_at(t):                      # put the rig where the studio will show it at clip time t
        for p, e in piv.items():
            tr = tracks.get('J' + p, {}).get('rot'); r = sample(tr, t) if tr else objs['J' + p]['rot']
            e.rotation_euler = (CB.transposed() @ Euler([math.radians(v) for v in r], 'ZYX').to_matrix() @ CB).to_euler('XYZ')
        q = sample(tracks['J' + ROOT]['pos'], t); root.location = Vector((q[0], -q[2], q[1]))
    blade = None
    for c in cards:                      # held swords (no sheet), then flipbook effects
        if c.get('kind') == 'greatsword':    # heavy two-handed DRAGON sword (blade-local axes: x across, y thick, z along the blade)
            par = 'J' + part_of[HANDP.name]; g = CB @ GRIP; L, Wd, Th = c.get('length', 4.6), c.get('width', 0.62), c.get('thick', 0.16)
            at = lambda d, dx=0, dy=0: [round(v, 3) for v in g + Vector((dx, dy, d))]; z0 = 0.55
            P3 = lambda x, y, z: Vector((x, y, z))
            def along(d):                    # studio Euler (three.js XYZ) turning a part's local +Y onto direction d
                Y = Vector(d).normalized(); X = Y.cross(Vector((0, 1, 0)) if abs(Y.y) < 0.9 else Vector((1, 0, 0))).normalized()
                e = Matrix((X, Y, X.cross(Y))).transposed().to_euler('ZYX'); return [round(math.degrees(a), 2) for a in (e.x, e.y, e.z)]
            def spike(p0, p1, r, **look):    # a cone from p0 (base) to p1 (tip), blade-local
                p0, p1 = P3(*p0), P3(*p1); d = p1 - p0
                return dict(type='part', shape='cone', parent=par, pos=[round(v, 3) for v in g + (p0 + p1) / 2], rot=along(d), size=[round(2 * r, 3), round(d.length, 3), round(2 * r, 3)], **look)
            def blade_geo(wfun, t0, u0=0.0, u1=1.0, n=64, tooth=0.0):
                """Diamond cross-section; wfun(u) = width; `tooth`: dragon-tooth serration on the spine edge (-x), sawtooth every 1/9."""
                V, Fc = [], []
                for ii in range(n + 1):
                    u = u0 + (u1 - u0) * ii / n; w = wfun(u); tt = t0 * (1 - 0.45 * u)
                    sv_ = tooth * ((u * 9) % 1) ** 0.7 if 0.1 < u < 0.74 else 0.0
                    xl, xr = -w / 2 - sv_, w / 2
                    V += [list(g + Vector(v)) for v in ((xr, 0, z0 + L * u), (0, tt / 2, z0 + L * u), (xl, 0, z0 + L * u), (0, -tt / 2, z0 + L * u))]
                for ii in range(n):
                    a, b = 4 * ii, 4 * ii + 4
                    for q in range(4): Fc += [[a + q, b + (q + 1) % 4, b + q], [a + q, a + (q + 1) % 4, b + (q + 1) % 4]]
                Fc += [[0, 1, 2], [0, 2, 3]]
                return {'verts': [round(x, 4) for v in V for x in v], 'faces': Fc, 'uvs': [0] * (2 * len(V))}
            fang = lambda u: Wd * (1 - 0.62 * u ** 1.5) * min(1, (1 - u) / 0.12) * (0.82 + 0.18 * min(1, u / 0.1))     # wide shoulder, narrowing to a fang point
            def wing_geo(sd):                # bat wing, scalloped between the finger tips: fan from its centre, both faces
                ring = [(0.26, 0.44), (0.28, 0.72), (0.58, 1.08), (0.8, 0.72), (1.08, 0.94), (1.18, 0.58), (1.5, 0.6), (1.3, 0.3), (1.58, 0.0), (0.95, 0.12), (0.3, 0.2)]
                c = (0.78, 0.5); V = [list(g + P3(sd * c[0], 0, c[1] + 0.5 - 0.5))] + [list(g + P3(sd * x, 0, z)) for x, z in ring]; Fc = []
                for ii in range(len(ring)):
                    a, b = 1 + ii, 1 + (ii + 1) % len(ring); Fc += [[0, a, b], [0, b, a]]
                return {'verts': [round(x, 4) for v in V for x in v], 'faces': Fc, 'uvs': [0] * (2 * len(V))}
            for tag, geo, look in (('steel', blade_geo(fang, Th, tooth=0.1), dict(color='#2c2f37', metalness=0.9, roughness=0.3)),
                                   ('edge', blade_geo(lambda u: fang(u) + 0.1, 0.03, tooth=0.1), dict(color='#e0162e', material='Neon')),
                                   ('vein', blade_geo(lambda u: 0.07 * (1 - 0.5 * u), Th * 1.35, 0.1, 0.86, 40), dict(color='#ff4a2a', material='Neon')),
                                   ('wingR', wing_geo(1), dict(color='#5a0a18', metalness=0.45, roughness=0.4)),
                                   ('wingL', wing_geo(-1), dict(color='#5a0a18', metalness=0.45, roughness=0.4))):
                gid = f'{NAME.lower()}-greatsword-{tag}'; open(os.path.join(OUT, 'studio', 'geo', gid + '.json'), 'w').write(json.dumps(geo, separators=(',', ':')))
                files.append(gid); objs[f'X{k}{tag}'] = dict(type='mesh', name='Dragon sword ' + tag, geo=gid, parent=par, pos=[0, 0, 0], smooth=False, **look)
            gold = dict(color='#d0a02e', metalness=1.0, roughness=0.28); dark = dict(color='#5a3a10', metalness=0.9, roughness=0.4)
            glow = dict(color='#ff2a2a', material='Neon')
            objs[f'X{k}g'] = dict(type='part', shape='cylinder', parent=par, name='Grip (dragon hide)', rot=[90, 0, 0], pos=at(-0.25), size=[0.26, 1.4, 0.26], color='#3c0710', metalness=0.1, roughness=0.8)
            for ri, rz in enumerate((-0.82, -0.4, 0.02)):
                objs[f'X{k}rg{ri}'] = dict(type='part', shape='cylinder', parent=par, name='Grip ring', rot=[90, 0, 0], pos=at(rz), size=[0.31, 0.07, 0.31], **gold)
            # head guard: the blade comes out of a dragon's open mouth; jaws flank it, fangs, swept horns, glowing eyes
            hp = dict(type='part', parent=par, **gold)
            objs[f'X{k}sk'] = dict(hp, shape='box', name='Dragon skull', pos=at(0.34), size=[0.56, 0.4, 0.5])
            for sy, nm in ((1, 'upper'), (-1, 'lower')):
                objs[f'X{k}j{nm}'] = dict(hp, shape='box', name=f'Dragon {nm} jaw', pos=at(0.78, 0, 0.17 * sy), rot=[round(-9 * sy, 1), 0, 0], size=[0.5, 0.1, 0.5])
                for fx in (-1, 1):
                    objs[f'X{k}f{nm}{fx}'] = spike((0.2 * fx, 0.12 * sy, 1.0), (0.2 * fx, 0.08 * sy, 1.3), 0.06, color='#f2eee0', metalness=0.2, roughness=0.3)
                    objs[f'X{k}e{nm}{fx}'] = dict(type='part', shape='sphere', parent=par, name='Dragon eye', pos=at(0.5, 0.17 * fx, 0.22 * sy), size=[0.1, 0.1, 0.1], **glow)
            for fx in (-1, 1):
                objs[f'X{k}h1{fx}'] = spike((0.24 * fx, 0.0, 0.52), (0.68 * fx, 0.04, 0.08), 0.1, **dark)
                objs[f'X{k}h2{fx}'] = spike((0.2 * fx, 0.0, 0.4), (0.46 * fx, 0.02, -0.08), 0.06, **dark)
            # wing bones (leading edge fingers), gold, over the membrane meshes
            for sd in (1, -1):
                for fi, tip in enumerate(((0.58, 1.08), (1.08, 0.94), (1.5, 0.6), (1.58, 0.0))):
                    objs[f'X{k}wb{sd}{fi}'] = spike((0.26 * sd, 0.0, 0.5), (tip[0] * sd, 0.0, tip[1]), 0.045, **gold)
            # claw pommel: a glowing orb gripped by three talons
            objs[f'X{k}p'] = dict(type='part', shape='sphere', parent=par, name='Dragon orb', pos=at(-1.1), size=[0.34, 0.34, 0.34], **glow)
            for ti in range(3):
                ph = ti * 2 * math.pi / 3 + 0.5; cx_, cy_ = math.cos(ph), math.sin(ph)
                objs[f'X{k}t{ti}'] = spike((0.13 * cx_, 0.13 * cy_, -1.38), (0.15 * cx_, 0.15 * cy_, -0.86), 0.075, **gold)
            blade = (z0, z0 + L); k += 1; continue
        sh = c.get('sheet')
        if not sh: continue
        if c.get('kind') == 'swing':         # the slash trail traced from the real blade path: a flat card in the swing plane (README, Swing trail)
            t0, t1 = c['show']; z0, z1 = blade or (0.55, 0.55 + c.get('length', 4.6)); n = 40
            tip, base = [], []
            for i in range(n + 1):
                pose_at(t0 + (t1 - t0) * i / n); gp, fw = grip(); tip.append(np.array(gp + fw * z1)); base.append(np.array(gp + fw * (z0 + 0.35 * (z1 - z0))))
            TP = np.array(tip); m = TP.mean(0); _, _, Vt = np.linalg.svd(TP - m); e1, e2 = Vt[0], Vt[1]
            xy = np.stack([(TP - m) @ e1, (TP - m) @ e2], 1)                           # circle fit in the plane (Kasa)
            A = np.c_[2 * xy, np.ones(len(xy))]; sol = np.linalg.lstsq(A, (xy ** 2).sum(1), rcond=None)[0]; cc = sol[:2]
            ang = lambda e1, e2: np.unwrap(np.arctan2((TP - m) @ e2 - cc[1], (TP - m) @ e1 - cc[0]))
            ph = ang(e1, e2)
            if ph[-1] > ph[0]: e1 = -e1; cc = np.array([-cc[0], cc[1]]); ph = ang(e1, e2)   # the generator sweeps clockwise
            ctr = m + cc[0] * e1 + cc[1] * e2; Rt = float(np.linalg.norm(TP - ctr, axis=1).mean()); Rb = float(np.linalg.norm(np.array(base) - ctr, axis=1).mean())
            life = round(t1 - t0 + c.get('fade', 0.6), 3); size = round(3.6 * Rt, 2); span = math.degrees(ph[0] - ph[-1])
            prog = '_'.join(f'{(ph[0] - v) / (ph[0] - ph[-1]):.3f}' for v in ph[::4])
            geo = dict(start=round(math.degrees(ph[0]) % 360, 1), end=round((math.degrees(ph[0]) - span) % 360, 1), radius=round(Rt / size, 3),
                       sweep=round((t1 - t0) / life * 64, 1), delay=0, cx=0.5, cy=0.5, prog=prog)
            W = round(0.5 * (Rt - Rb) / size, 3); kv = lambda **o: ','.join(f'{a}={b}' for a, b in {**geo, **o}.items())
            rec = (f"flame-arc:{kv(width=round(W * 0.6, 3), k0=700, k1=1100, k_ref=1300, density=0.55, flame=1.1)}+dragon:{kv(radius=round(Rt / size * 1.0, 3), scale=1.55, overshoot=26, gain=1.35)}"
                   f"+slash:{kv(width=round(W * 0.45, 3), decay=6, gain=0.55, core=1.2)}+embers:{kv(n=150, kelvin=2300, speed=5, cool=18, gravity=0.07, gain=2)}")
            open(os.path.join(OUT, 'swing-recipe.txt'), 'w').write(rec + '\n')
            print(f'swing: plane fit {span:.0f} deg, tip radius {Rt:.2f}, life {life} s -> build the sheet: vfx.py OUT "$(cat OUT/swing-recipe.txt)" --name {os.path.splitext(sh["file"])[0]}')
            X, Y = Vector(CB @ Vector(e1)), Vector(CB @ Vector(np.cross(e1, e2))); Z = X.cross(Y)
            nv = Y.copy() if Y.z >= 0 else -Y; side = Vector((0, 0, 1)) - nv * nv.z; side = side.normalized() if side.length > 1e-6 else Vector((1, 0, 0))
            view = (nv * math.cos(math.radians(30)) + side * math.sin(math.radians(30))).normalized(); tgt = Vector(sv(Vector(ctr))) * 0.6 + Vector(sv((lo + hi) / 2)) * 0.4
            SWING_VIEW.update(fov=50, ortho=False, pos=[round(v, 2) for v in tgt + view * 2.9 * Rt + Vector((0, 1.0, 0))], target=[round(v, 2) for v in tgt])
            eu = Matrix((X, Y, Z)).transposed().to_euler('ZYX')
            tid = 'fx-' + os.path.splitext(os.path.basename(sh['file']))[0]; uploads[tid] = os.path.join(FXDIR, sh['file'])
            objs[f'X{k}'] = dict(type='flipbook', name='FX swing trail', tex=tid, grid=8, frames=64, life=life, loop=False, fps=round(64 / life, 2), blend='add',
                                 flat=True, parent='A0', pos=sv(Vector(ctr)), rot=[round(math.degrees(a), 2) for a in (eu.x, eu.y, eu.z)], size=size, start=t0, dur=life)
            k += 1; continue
        tid = 'fx-' + os.path.splitext(os.path.basename(sh['file']))[0]; uploads[tid] = os.path.join(FXDIR, sh['file'])
        set_pose(POSES[c.get('pose')] if c.get('pose') else POSE); hands, aim = hands_aim()
        t0, t1 = c.get('show', [0, keys[-1][0] if keys else 1])
        base = dict(type='flipbook', tex=tid, grid=sh.get('grid', 8), frames=sh.get('frames', 64), loop=True, fps=sh['fps'],
                    life=sh['frames'] / sh['fps'], blend='add')
        if c.get('kind') == 'blade':       # a saber in the right hand: hilt parts and a 3D blade along the grip (forward at rest)
            hn = 'RightHand' if RIG != 'R6' else 'RightArm'; hp = piv[hn]; set_pose({})
            ho = objects[hn]; vs = [Vector(v) for v in ho.world_verts()]
            g = Vector(sv(sum(vs, Vector()) / len(vs) - hp.matrix_world.translation)); ax = Vector((0, 0, 1)); Lh = c.get('hilt', 1.1)
            at = lambda d: [round(v, 3) for v in g + ax * d]; par = 'J' + part_of[hp.name]
            metal = dict(type='part', shape='cylinder', parent=par, rot=[90, 0, 0], color='#c9ced6', metalness=0.9, roughness=0.28)
            objs[f'X{k}h'] = dict(metal, name='Saber hilt', pos=at(0.15), size=[0.24, Lh, 0.24])
            objs[f'X{k}g'] = dict(metal, name='Saber grip', pos=at(0.02), size=[0.28, 0.5, 0.28], color='#1c1f25', metalness=0.2, roughness=0.7)
            objs[f'X{k}e'] = dict(metal, name='Saber emitter', pos=at(0.15 + Lh / 2 - 0.06), size=[0.3, 0.12, 0.3], color='#8f959e')
            if c.get('style') == 'dragon':  # dragon hilt: gold guard with horns swept toward the blade, crimson grip, ruby eye and pommel
                gold = dict(metal, color='#d4a433', metalness=1.0, roughness=0.3); top = 0.15 + Lh / 2
                def along(d):               # studio Euler (three.js XYZ) that turns a part's local +Y onto direction d
                    Y = Vector(d).normalized(); X = Y.cross(Vector((0, 1, 0)) if abs(Y.y) < 0.9 else Vector((1, 0, 0))).normalized()
                    e = Matrix((X, Y, X.cross(Y))).transposed().to_euler('ZYX'); return [round(math.degrees(a), 2) for a in (e.x, e.y, e.z)]
                objs[f'X{k}w'] = dict(gold, name='Dragon guard', shape='box', rot=[0, 0, 0], pos=at(top), size=[1.0, 0.2, 0.18])
                for sd in (1, -1):
                    objs[f'X{k}w{sd}'] = dict(gold, name='Dragon horn', shape='cone', pos=[round(v, 3) for v in g + Vector((0.62 * sd, 0, top + 0.12))],
                                             rot=along((sd, 0, 0.9)), size=[0.2, 0.55, 0.2])
                objs[f'X{k}r'] = dict(gold, name='Dragon eye', shape='sphere', rot=[0, 0, 0], pos=[round(v, 3) for v in g + Vector((0, -0.12, top))],
                                      size=[0.17, 0.17, 0.17], color='#b0102a', metalness=0.3, roughness=0.15)
                objs[f'X{k}p'] = dict(gold, name='Dragon pommel', shape='sphere', rot=[0, 0, 0], pos=at(0.15 - Lh / 2 - 0.08), size=[0.3, 0.3, 0.3])
                objs[f'X{k}h']['color'] = '#5a0c14'; objs[f'X{k}h']['metalness'] = 0.2; objs[f'X{k}h']['roughness'] = 0.6   # wrapped grip
            objs[f'X{k}'] = dict(base, name='FX blade', parent=par, shape='beam', pos=at(0.15 + Lh / 2), rot=[0, -90, 0], size=c['size'],
                                 length=c['length'], speed=c.get('speed', 18), start=t0, dur=round(t1 - t0, 3)); k += 1
        elif c.get('kind') == 'beam':      # one 3D beam volume (studio shape 'beam', its local +X along the aim), shooting out from the hands
            X = (CB @ aim).normalized(); Z = X.cross(Vector((0, 1, 0)))
            Z = Z.normalized() if Z.length > 1e-6 else Vector((0, 0, 1)); eu = Matrix((X, Z.cross(X), Z)).transposed().to_euler('ZYX')
            objs[f'X{k}'] = dict(base, name='FX beam', parent='A0', shape='beam', pos=sv(hands + aim * c.get('start', 0)),
                                 rot=[round(math.degrees(a), 2) for a in (eu.x, eu.y, eu.z)], size=c['width'], length=c['length'],
                                 speed=c.get('speed', 60), start=t0, dur=round(t1 - t0, 3)); k += 1
        else:
            fid = f'X{k}'; k += 1
            if c.get('follow') == 'hands':  # rides on the right hand: offset held in that hand's own frame
                hp = piv[('Right' + 'Hand') if RIG != 'R6' else 'RightArm']; Rw = hp.matrix_world.to_3x3()
                off = CB @ (Rw.transposed() @ (hands + aim * c.get('start', 0.0) - hp.matrix_world.translation))
                objs[fid] = dict(base, name='FX orb', parent='J' + part_of[hp.name], pos=[round(x, 3) for x in off], size=c['size'], start=t0, dur=round(t1 - t0, 3))
            else: objs[fid] = dict(base, name=f'FX {k}', parent='A0', pos=sv(hands + aim * c.get('start', 0.0)), size=c['size'], start=t0, dur=round(t1 - t0, 3))
            if c.get('grow'): tracks.setdefault(fid, {})['scale'] = [[t, [g, g, g], 'smooth'] for t, g in c['grow']]
    if tracks: anims[CLIP or 'clip'] = {'name': (CLIP or 'clip').title(), 'len': keys[-1][0] if keys else 1, 'fps': 60, 'loop': True, 'tracks': tracks}
    set_pose(POSE)
    textures = {}
    for t in sorted(texs):               # every image goes up as a hub asset (db docs hold data, not files): tex/<t> = {"asset": id}
        im = Image.open(T(t)); uploads[t] = T(t)
        textures['t-' + t] = {'kind': 'image', 'src': t, 'name': t, 'res': max(im.size), 'scale': 1, 'offset': [0, 0]}
    json.dump(uploads, open(os.path.join(OUT, 'studio', 'uploads.json'), 'w'), indent=1)
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    doc = {'v': 1, 'name': NAME, 'objects': objs, 'anims': anims, 'textures': textures,
           'env': {'bg': BG if FX else '#ffffff', 'fog': None, 'grid': True, 'light': 'night'},       # glow adds light: it needs a dark sky
           'camera': cam_view(), 'updated': now}
    json.dump(doc, open(os.path.join(OUT, 'studio', 'project.json'), 'w'), separators=(',', ':'))
    json.dump({'name': NAME, 'updated': now, 'count': len(objs), 'ai': True}, open(os.path.join(OUT, 'studio', 'meta.json'), 'w'))
    sz = lambda g: os.path.getsize(os.path.join(OUT, 'studio', 'geo', g + '.json'))
    batches, cur, n = [], [], 0          # <= 45 writes and ~700 KB per db batch; project + meta last, so the tab opens complete
    items = [['geo', g, sz(g)] for g in files] + [['tex', t, 40] for t in sorted(uploads)]
    for kind, g, b in items:
        if cur and (n + b > 700_000 or len(cur) >= 45): batches.append(cur); cur, n = [], 0
        cur.append([kind, g]); n += b
    batches.append(cur + [['project'], ['meta']])
    json.dump(batches, open(os.path.join(OUT, 'batches.json'), 'w'))
    pid = NAME.lower().replace(' ', '-') + '-' + time.strftime('%H%M'); st = os.path.join(OUT, 'studio')     # ready ArtifactData batch entries
    ent = lambda w: ({'op': 'set', 'collection': f'projects/{pid}/geo', 'doc_id': w[1], 'file_path': f'{st}/geo/{w[1]}.json'} if w[0] == 'geo' else
                     {'op': 'set', 'collection': f'projects/{pid}/tex', 'doc_id': w[1], 'data': {'asset': '<upload id of ' + w[1] + '>'}} if w[0] == 'tex' else
                     {'op': 'set', 'collection': 'projects' if w[0] == 'project' else 'meta', 'doc_id': pid, 'file_path': f'{st}/{w[0]}.json'})
    json.dump([[ent(w) for w in b] for b in batches], open(os.path.join(OUT, 'writes.json'), 'w'))
    tris = sum(len(json.load(open(os.path.join(OUT, 'studio', 'geo', g + '.json')))['faces']) for g in files)
    print(f'studio: {len(files)} meshes, {tris} triangles, {sum(len(v.get("rot", [])) for v in tracks.values())} rotation keys, {len(batches)} batches')


# effects: where the hands are and where the arms point (generic: the far end of each arm chain)
def hand_point(side):
    end = objects.get(side + 'Hand') or objects[side + 'Arm']
    sh = piv[side + ('UpperArm' if RIG != 'R6' else 'Arm')].matrix_world.translation
    vs = [Vector(v) for v in end.world_verts()]; vs.sort(key=lambda w: -(w - sh).length)
    far = vs[:max(1, len(vs) // 7)]; return sum(far, Vector()) / len(far), sh
def hands_aim():
    (hr, sr), (hl, sl) = hand_point('Right'), hand_point('Left'); h = (hr + hl) / 2
    return h, (h - (sr + sl) / 2).normalized()
if FX: HANDS, AIM = hands_aim()

if __name__ == '__main__': studio_rig(FX.get('cards', []) if FX else (), CLIPS.get(CLIP))
