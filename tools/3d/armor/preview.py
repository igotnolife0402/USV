"""Fast shaded preview of armor geo on the R6 rig (numpy + Pillow, painter's algorithm, smooth normals, 2x supersampled).
  python preview.py OUT out.png [--focus CP|LS|LV|LG|LB|HM] [--size 520] [--views front,q34,side,back]
Reads every OUT/*.json stage file (objects: geo, parent, color, material) and OUT/geo/*.json; the dark rig boxes show the fit.
A preview, not the final look: the hub/Studio render is the real check."""
import glob, json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw

args = sys.argv[1:]; OUT, PNG = args[0], args[1]
opt = {args[i][2:]: args[i + 1] for i in range(2, len(args) - 1) if args[i].startswith('--')}
SIZE = int(opt.get('size', 520)); FOCUS = opt.get('focus'); VIEWS = opt.get('views', 'front,q34,side,back').split(',')
GROUPS = {'CP': (0, 3, 0), 'HM': (0, 4.62, 0), 'LS': (1.62, 3.92, 0), 'LV': (1.5, 2.5, 0), 'LG': (0.5, 1.15, 0), 'LB': (0.5, 0.34, 0.06)}
for k in list(GROUPS):
    if k[0] == 'L': x, y, z = GROUPS[k]; GROUPS['R' + k[1:]] = (-x, y, z)
BODY = [((0, 3, 0), (2, 2, 1)), ((0, 4.6, 0), (1.2, 1.2, 1.2)), ((1.5, 3, 0), (1, 2, 1)), ((-1.5, 3, 0), (1, 2, 1)), ((0.5, 1, 0), (1, 2, 1)), ((-0.5, 1, 0), (1, 2, 1))]

tris, cols, emis = [], [], []
def add(V, F, col, em):
    V = np.asarray(V, float)
    for f in F:
        for i in range(1, len(f) - 1): tris.append((V[f[0]], V[f[i]], V[f[i + 1]])); cols.append(col); emis.append(em)

for st in glob.glob(os.path.join(OUT, '*.json')):
    for o in json.load(open(st)).get('objects', {}).values():
        if o.get('__delete__') or o.get('type') != 'mesh': continue
        if FOCUS and o['parent'] not in (FOCUS, 'R' + FOCUS[1:] if FOCUS[0] == 'L' else FOCUS): continue
        g = json.load(open(os.path.join(OUT, 'geo', o['geo'] + '.json'))); V = np.array(g['verts']).reshape(-1, 3) + GROUPS[o['parent']]
        c = o.get('color', '#888888'); col = np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], float) / 255
        add(V, g['faces'], col, o.get('material') == 'Neon')
for c, s in BODY:
    h = np.array(s) / 2; c = np.array(c, float); g = np.linspace(-1, 1, 13); P, F = [], []
    for ax in range(3):                             # boxes split into small quads so the depth sort stays right
        a1, a2 = [(1, 2), (2, 0), (0, 1)][ax]
        for sg in (1, -1):
            o = len(P)
            for u in g:
                for v in g: q = np.zeros(3); q[ax] = sg; q[a1] = u; q[a2] = v; P.append(c + h * q)
            for i in range(12):
                for j in range(12):
                    f = [o + i * 13 + j, o + (i + 1) * 13 + j, o + (i + 1) * 13 + j + 1, o + i * 13 + j + 1]; F.append(f if sg > 0 else f[::-1])
    add(P, F, np.array([0.22, 0.2, 0.24]), False)
T = np.array(tris); C = np.array(cols); E = np.array(emis)
FN = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); FN /= np.maximum(np.linalg.norm(FN, axis=1), 1e-12)[:, None]

def render(yaw, pitch=-12):
    a, b = math.radians(yaw), math.radians(pitch)
    Ry = np.array([[math.cos(a), 0, math.sin(a)], [0, 1, 0], [-math.sin(a), 0, math.cos(a)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(b), -math.sin(b)], [0, math.sin(b), math.cos(b)]]); R = Rx @ Ry
    P = T @ R.T; N = FN @ R.T
    keep = N[:, 2] > -1e-6                          # back-face cull (camera looks down -z)
    P, N, Cc, Ee = P[keep], N[keep], C[keep], E[keep]
    lo, hi = P.reshape(-1, 3).min(0), P.reshape(-1, 3).max(0); S = SIZE * 2
    sc = 0.9 * S / max(hi[0] - lo[0], hi[1] - lo[1]); mid = (lo + hi) / 2
    xy = np.stack([(P[..., 0] - mid[0]) * sc + S / 2, S / 2 - (P[..., 1] - mid[1]) * sc], -1)
    L = nz3(np.array([-0.45, 0.7, 0.6])); L2 = nz3(np.array([0.7, 0.2, -0.4]))
    dif = np.clip(N @ L, 0, 1); rim = np.clip(N @ L2, 0, 1) * 0.35; H = nz3(L + np.array([0, 0, 1.0]))
    spec = np.clip(N @ H, 0, 1) ** 40
    shade = Cc * (0.18 + 0.82 * dif[:, None] + rim[:, None]) + spec[:, None] * 0.55
    shade = np.where(Ee[:, None], np.clip(Cc * 1.25 + 0.15, 0, 1), shade)
    order = np.argsort(P[..., 2].mean(1))
    img = Image.new('RGB', (S, S), (238, 236, 232)); d = ImageDraw.Draw(img)
    for i in order:
        col = tuple(int(x) for x in np.clip(shade[i], 0, 1) * 255)
        d.polygon([tuple(p) for p in xy[i]], fill=col, outline=col)
    return img.resize((SIZE, SIZE), Image.LANCZOS)

def nz3(v): return v / np.linalg.norm(v)
YAW = {'front': 0, 'q34': -35, 'side': -90, 'back': 180, 'q34b': 145}
imgs = [render(YAW[v]) for v in VIEWS]
sheet = Image.new('RGB', (SIZE * len(imgs), SIZE)); [sheet.paste(im, (i * SIZE, 0)) for i, im in enumerate(imgs)]
sheet.save(PNG); print(json.dumps({'png': PNG, 'triangles': len(T), 'views': VIEWS}))
