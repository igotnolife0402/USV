"""Rigged block creatures: shapes -> 0.5-stud blocks (mixed-size chunks on the skin) -> one mesh per joint segment.
A creature file (dragon.py, orc.py) defines SEG, PAL, shape(g), ANIM, FX and calls make(...). See README.md.
Outputs into the out dir: <Name>.glb (meshes), <Name>Kit.rbxmx (rig + animation + VFX pack), rig.json (video.html),
project.json + meta.json (studio tab copy, coarser blocks to fit its 250 KB doc), palette.png."""
import io, json, math, os, struct, time
import numpy as np
from PIL import Image

# ---------------------------------------------------------------- shapes
class Grid:
    """Paint shapes into a block grid. Units: design units (1 unit = sc studs). Each block has a colour and a segment."""
    def __init__(s, bounds, stud, sc, segs, seed=11):
        s.V = stud / sc; s.B = bounds; s.SI = {n: i + 1 for i, (n, _, _) in enumerate(segs)}
        X0, X1, Y0, Y1, Z0, Z1 = bounds
        s.N = (int((X1 - X0) / s.V), int((Y1 - Y0) / s.V), int((Z1 - Z0) / s.V))
        s.ax = [lo + (np.arange(n, dtype=np.float32) + .5) * s.V for lo, n in zip((X0, Y0, Z0), s.N)]
        s.C = np.zeros(s.N, np.uint8); s.S = np.zeros(s.N, np.uint8); s.rng = np.random.default_rng(seed)

    def win(s, lo, hi):
        o = (s.B[0], s.B[2], s.B[4])
        sl = tuple(slice(max(0, int((l - oo) / s.V) - 1), min(n, int((h - oo) / s.V) + 2)) for l, h, oo, n in zip(lo, hi, o, s.N))
        return sl, s.ax[0][sl[0]][:, None, None], s.ax[1][sl[1]][None, :, None], s.ax[2][sl[2]][None, None, :]

    def put(s, sl, m, col, seg, over=False):
        c, g = s.C[sl], s.S[sl]
        m = np.broadcast_to(m, c.shape) & (True if over else (c == 0))
        c[m] = col; g[m] = s.SI[seg]

    @staticmethod
    def segd(a, b, x, y, z):
        d = [b[i] - a[i] for i in range(3)]; L2 = sum(v * v for v in d) or 1e-9
        t = np.clip(((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L2, 0, 1)
        return t, np.sqrt((x - a[0] - t * d[0]) ** 2 + (y - a[1] - t * d[1]) ** 2 + (z - a[2] - t * d[2]) ** 2)

    def ell(s, c, r, col, seg, over=False, where=None):
        sl, x, y, z = s.win([c[i] - r[i] for i in range(3)], [c[i] + r[i] for i in range(3)])
        m = ((x - c[0]) / r[0]) ** 2 + ((y - c[1]) / r[1]) ** 2 + ((z - c[2]) / r[2]) ** 2 <= 1
        if where is not None: m = m & where(x, y, z)
        s.put(sl, m, col, seg, over)

    def cap(s, a, b, r0, r1, col, seg, over=False, where=None):
        R = max(r0, r1)
        sl, x, y, z = s.win([min(a[i], b[i]) - R for i in range(3)], [max(a[i], b[i]) + R for i in range(3)])
        t, d = s.segd(a, b, x, y, z); m = d <= r0 + (r1 - r0) * t
        if where is not None: m = m & where(x, y, z, t)
        s.put(sl, m, col, seg, over)

    def spike(s, base, tip, r, col, seg, tipcol=None, over=False):
        sl, x, y, z = s.win([min(base[i], tip[i]) - r for i in range(3)], [max(base[i], tip[i]) + r for i in range(3)])
        t, d = s.segd(base, tip, x, y, z); m = d <= r * (1 - t) + s.V * 0.35
        s.put(sl, m, col, seg, over)
        if tipcol: s.put(sl, m & (t > 0.7), tipcol, seg, True)

    def horn(s, pts, r0, col, seg, tipcol, ring=None):
        n = len(pts) - 1
        for i in range(n):
            ra, rb = r0 * (1 - i / n), r0 * (1 - (i + 1) / n)
            s.cap(pts[i], pts[i + 1], ra + s.V * .3, rb + s.V * .3, col if i < n - 1 else tipcol, seg)
            if i and ring: s.cap(pts[i], pts[i], ra + s.V * .6, ra + s.V * .6, ring, seg)

    def box(s, lo, hi, col, seg, over=False, where=None):
        sl, x, y, z = s.win(lo, hi)
        m = (x >= lo[0]) & (x <= hi[0]) & (y >= lo[1]) & (y <= hi[1]) & (z >= lo[2]) & (z <= hi[2])
        if where is not None: m = m & where(x, y, z)
        s.put(sl, m, col, seg, over)

    def sheet(s, tris, colfn, segfn, cuts=()):
        """Thin membrane through 3D triangles (one block thick). colfn(x,y,z,mask)->colour grid; segfn(x,y,z)->bool per
        segment name dict; cuts: callables (x,y,z)->bool of blocks to remove (torn edges)."""
        lo = [min(p[i] for t in tris for p in t) - 1 for i in range(3)]; hi = [max(p[i] for t in tris for p in t) + 1 for i in range(3)]
        sl, x, y, z = s.win(lo, hi); shp = s.C[sl].shape
        xb, yb, zb = (np.broadcast_to(v, shp) for v in (x, y, z)); mem = np.zeros(shp, bool)
        for a, b, c in tris:
            a, b, c = map(np.array, (a, b, c)); n = np.cross(b - a, c - a); n /= np.linalg.norm(n)
            u, v = b - a, c - a; uu, uv, vv = u @ u, u @ v, v @ v; den = uu * vv - uv * uv
            Px, Py, Pz = xb - a[0], yb - a[1], zb - a[2]
            dn = Px * n[0] + Py * n[1] + Pz * n[2]; pu = Px * u[0] + Py * u[1] + Pz * u[2]; pv = Px * v[0] + Py * v[1] + Pz * v[2]
            l1 = (vv * pu - uv * pv) / den; l2 = (uu * pv - uv * pu) / den
            mem |= (np.abs(dn) <= s.V * 0.55) & (l1 >= -0.01) & (l2 >= -0.01) & (l1 + l2 <= 1.01)
        for cut in cuts: mem &= ~cut(xb, yb, zb)
        col = colfn(x, y, z, shp)
        for seg, part in segfn(xb, yb, zb).items():
            m = mem & part & (s.C[sl] == 0)
            s.C[sl][m] = col[m]; s.S[sl][m] = s.SI[seg]

    def chunky(s, body, tones, rate=0.045, bites=0.10, sizes=(1, 1, 2, 2, 2, 3, 3, 4, 5)):
        """The sheet look: blocks of 1-5 sizes stuck on the skin, and small bites taken out, so no surface is smooth."""
        C, S, N, rng = s.C, s.S, s.N, s.rng
        solid = C > 0; bodyc = np.isin(C, body)
        nb = sum(np.roll(solid, sh, a).astype(np.uint8) for a in range(3) for sh in (1, -1))
        cand = np.argwhere(solid & bodyc & (nb < 6)); pick = cand[rng.random(len(cand)) < rate]
        dirs = [(0, 1, 0), (1, 0, 0), (-1, 0, 0), (0, 0, 1), (0, 0, -1), (0, -1, 0)]
        for i, j, k in pick:
            for dx, dy, dz in dirs:
                a, b, c = i + dx, j + dy, k + dz
                if 0 <= a < N[0] and 0 <= b < N[1] and 0 <= c < N[2] and C[a, b, c] == 0: break
            else: continue
            sz = [int(rng.choice(sizes)) for _ in range(3)]; dep = int(rng.choice([1, 1, 2, 2, 3]) if max(sizes) > 3 else rng.choice([1, 1, 2]))
            lo = [i - sz[0] // 2, j - sz[1] // 2, k - sz[2] // 2]; hi = [lo[0] + sz[0], lo[1] + sz[1], lo[2] + sz[2]]
            for ax, d in enumerate((dx, dy, dz)):
                if d > 0: lo[ax], hi[ax] = (i, j, k)[ax] + 1, (i, j, k)[ax] + 1 + dep
                if d < 0: lo[ax], hi[ax] = (i, j, k)[ax] - dep, (i, j, k)[ax]
            sl = tuple(slice(max(0, l), min(n, h)) for l, h, n in zip(lo, hi, N))
            col = C[i, j, k] if rng.random() < 0.5 else int(rng.choice(tones))
            cc, ss = C[sl], S[sl]; m = cc == 0; cc[m] = col; ss[m] = S[i, j, k]
        solid = C > 0
        nb = sum(np.roll(solid, sh, a).astype(np.uint8) for a in range(3) for sh in (1, -1))
        thick = solid & np.isin(C, body) & (nb >= 4) & (nb < 6)
        q = rng.random((N[0] // 2 + 1, N[1] // 2 + 1, N[2] // 2 + 1)) < bites
        ii = np.indices(C.shape, dtype=np.int16)
        bite = thick & q[ii[0] // 2, ii[1] // 2, ii[2] // 2]; C[bite] = 0; S[bite] = 0

    def tiles(s, base, tones, size=3):
        """Staggered tiles of tone on the skin (per tile, never per block, so faces still merge)."""
        C = s.C; solid = C > 0; surf = np.zeros_like(solid)
        for a in range(3):
            for sh in (1, -1): surf |= solid & np.roll(~solid, sh, a)
        ii = np.indices(C.shape, dtype=np.int16)
        tz = (ii[2] + (ii[1] // size % 2)) // size; tx = (ii[0] + (ii[2] // size % 2)) // size; ty = ii[1] // size
        h = (tx.astype(np.int64) * 73856093 ^ ty.astype(np.int64) * 19349663 ^ tz.astype(np.int64) * 83492791) % 1000 / 1000.0
        for b, (t1, t2) in base.items():
            skin = surf & (C == b)
            C[skin & (h > 0.5)] = t1; C[skin & (h > 0.84)] = t2

# ---------------------------------------------------------------- greedy merges
def greedy(K, order=(2, 0, 1)):
    Kt = K.transpose(order); done = np.zeros(Kt.shape, bool); out = []
    A, Bn, Cc = Kt.shape
    for c, b, a in np.argwhere(Kt.transpose(2, 1, 0) > 0):
        if done[a, b, c]: continue
        k = Kt[a, b, c]; a1 = a + 1
        while a1 < A and Kt[a1, b, c] == k and not done[a1, b, c]: a1 += 1
        b1 = b + 1
        while b1 < Bn and (Kt[a:a1, b1, c] == k).all() and not done[a:a1, b1, c].any(): b1 += 1
        c1 = c + 1
        while c1 < Cc and (Kt[a:a1, b:b1, c1] == k).all() and not done[a:a1, b:b1, c1].any(): c1 += 1
        done[a:a1, b:b1, c:c1] = True
        lo, hi = [0] * 3, [0] * 3
        for ax, (l, h) in zip(order, ((a, a1), (b, b1), (c, c1))): lo[ax], hi[ax] = int(l), int(h)
        out.append((int(k), lo, hi))
    return out

def faces(K, SEGK):
    """Exposed faces (neighbour is air or another segment), greedy-merged per colour+segment, as grid-corner quads."""
    quads = {}
    for a in range(3):
        u, v = (a + 1) % 3, (a + 2) % 3
        for sg in (1, -1):
            nb = np.zeros_like(SEGK)
            src = tuple(slice(1, None) if i == a else slice(None) for i in range(3)); dst = tuple(slice(0, -1) if i == a else slice(None) for i in range(3))
            if sg > 0: nb[dst] = SEGK[src]
            else: nb[src] = SEGK[dst]
            F = np.where((K > 0) & (nb != SEGK), K, 0)
            Ft = np.moveaxis(F, (a, u, v), (0, 1, 2))
            for i in np.nonzero(Ft.reshape(Ft.shape[0], -1).any(1))[0]:
                sl = Ft[i]; done = np.zeros(sl.shape, bool)
                for p, q in np.argwhere(sl):
                    if done[p, q]: continue
                    k = sl[p, q]; p1 = p + 1
                    while p1 < sl.shape[0] and sl[p1, q] == k and not done[p1, q]: p1 += 1
                    q1 = q + 1
                    while q1 < sl.shape[1] and (sl[p:p1, q1] == k).all() and not done[p:p1, q1].any(): q1 += 1
                    done[p:p1, q:q1] = True
                    plane = i + (1 if sg > 0 else 0); cs = []
                    for pu, pv in ((p, q), (p1, q), (p1, q1), (p, q1)):
                        c3 = [0, 0, 0]; c3[a] = plane; c3[u] = pu; c3[v] = pv; cs.append(c3)
                    quads.setdefault(int(k >> 8), []).append((cs[::-1] if sg < 0 else cs, a, sg, int(k & 255)))
    return quads

# ---------------------------------------------------------------- animation spec (shared by Python, Lua and JS)
# ANIM = {'len': loop s, 'periods': {name: s}, 'action': {'every': [a, b], 'first': s, 'len': s, 'phases': {name: [a, b, in, out]}},
#         'joints': {seg: {'rot': {'x': terms, ...}, 'pos': {'y': terms}}}, 'fx': [{'att', 'on', 'off'} | {'att', 'burst', 'count'}]}
# term: [amp, period, phase] = amp*sin(2 pi t/period + phase) | [phase_name, amp] = amp*window | [const]
def window(b, a, e, rin, rout):                        # sine-shaped ramps: a smooth tween between the rest and the action pose
    if b <= a - rin or b >= e + rout: return 0.0
    if b < a: return ease((b - a + rin) / rin)
    if b > e: return ease(1 - (b - e) / rout)
    return 1.0

def evalpose(anim, t, b):
    P = anim['periods']; W = {k: (window(b, *v) if b is not None else 0.0) for k, v in anim['action']['phases'].items()}
    def term(tr):
        if isinstance(tr[0], str): return tr[1] * W[tr[0]]
        if len(tr) == 1: return tr[0]
        per = P[tr[1]] if isinstance(tr[1], str) else tr[1]
        return tr[0] * math.sin(2 * math.pi * t / per + tr[2])
    out = {}
    for j, ch in anim['joints'].items():
        rot = [sum(term(x) for x in ch.get('rot', {}).get(a, [])) for a in 'xyz']
        pos = [sum(term(x) for x in ch.get('pos', {}).get(a, [])) for a in 'xyz']
        out[j] = (rot, pos)
    return out

def ease(u): return (1 - math.cos(math.pi * u)) / 2                          # the studio's 'smooth' (sine in-out)

def key_poses(anim, tol_rot=1.5, tol_pos=0.05, dt=1 / 240):
    """Per joint and channel (rot, pos): the fewest key poses whose 'smooth' tweens stay within tol of the exact motion.
    Starts from the turning points (each axis's peaks and troughs, the action window corners), adds the worst-fitting moment
    until every tween fits, then drops any key the fit doesn't need. Returns {joint: {'rot': [(t, xyz)], 'pos': [(t, xyz)]}}."""
    L, act = anim['len'], anim['action']; n = int(round(L / dt))
    ts = np.linspace(0, L, n + 1)
    samples = [evalpose(anim, t, (t - act['first']) if act['first'] <= t <= act['first'] + act['len'] else None) for t in ts]
    def corners(terms):                                  # window corners of the action phases this channel uses
        used = {tr[0] for ax in terms.values() for tr in ax if isinstance(tr[0], str)}
        return {act['first'] + x for name in used for ph in [act['phases'][name]] for x in (ph[0] - ph[2], ph[0], ph[1], ph[1] + ph[3]) if 0 <= act['first'] + x <= L}
    U = {}
    def fit(Y, tol, cs):
        if np.abs(Y - Y[0]).max() <= tol: return [0, n]           # constant: two keys
        keys = {0, n}
        d = np.diff(Y, axis=0)
        for a in range(Y.shape[1]):
            sg = np.sign(np.where(np.abs(d[:, a]) < 1e-9, 0, d[:, a])); nz = np.nonzero(sg)[0]
            for i0, i1 in zip(nz, nz[1:]):
                if sg[i0] != sg[i1]: keys.add(int(i1))
        keys.update(int(round(c / dt)) for c in cs)
        def worst(ks):
            ks = sorted(ks); bad = (0.0, None)
            for i0, i1 in zip(ks, ks[1:]):
                m = i1 - i0
                if m < 2: continue
                u = U.get(m)
                if u is None: u = U[m] = np.array([ease(k / m) for k in range(1, m)])
                e = np.abs(Y[i0] + (Y[i1] - Y[i0]) * u[:, None] - Y[i0 + 1:i1]).max(1); k = int(e.argmax())
                if e[k] > bad[0]: bad = (float(e[k]), i0 + 1 + k)
            return bad
        while True:
            e, i = worst(keys)
            if e <= tol or i is None: break
            keys.add(i)
        for k in sorted(keys - {0, n}):
            if worst(keys - {k})[0] <= tol: keys.discard(k)
        return sorted(keys)
    out = {}
    for j in anim['joints']:
        R = np.array([sm[j][0] for sm in samples]); P = np.array([sm[j][1] for sm in samples])
        ch = anim['joints'][j]
        out[j] = {'rot': [(round(float(ts[k]), 3), [round(float(v), 2) for v in R[k]]) for k in fit(R, tol_rot, corners(ch.get('rot', {})))]}
        if np.abs(P).max() > 1e-9: out[j]['pos'] = [(round(float(ts[k]), 3), [round(float(v), 3) for v in P[k]]) for k in fit(P, tol_pos, corners(ch.get('pos', {})))]
    return out

def lua_val(v):
    if isinstance(v, dict): return '{' + ', '.join(f'["{k}"] = {lua_val(x)}' for k, x in v.items()) + '}'
    if isinstance(v, (list, tuple)): return '{' + ', '.join(lua_val(x) for x in v) + '}'
    if isinstance(v, str): return '"' + v + '"'
    if isinstance(v, bool): return 'true' if v else 'false'
    return f'{v:.6g}' if isinstance(v, float) else str(v)

# ---------------------------------------------------------------- Roblox XML
def esc(s): return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
class Node:
    n = 0
    def __init__(s, cls, name, props=(), kids=None):
        Node.n += 1; s.ref = f'RBX{Node.n:08X}'; s.cls, s.name, s.props, s.kids = cls, name, list(props), kids or []
    def xml(s, out, d=1):
        t = '\t' * d
        out.append(f'{t}<Item class="{s.cls}" referent="{s.ref}"><Properties><string name="Name">{esc(s.name)}</string>' + ''.join(s.props) + '</Properties>')
        for k in s.kids: k.xml(out, d + 1)
        out.append(f'{t}</Item>')
def rbx_doc(*items):
    out = ['<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
           'xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">', '<External>null</External>', '<External>nil</External>']
    for i in items: i.xml(out)
    out.append('</roblox>'); return '\n'.join(out) + '\n'
B = lambda k, v: f'<bool name="{k}">{"true" if v else "false"}</bool>'
F = lambda k, v: f'<float name="{k}">{v:.6g}</float>'
TK = lambda k, v: f'<token name="{k}">{v}</token>'
V3 = lambda k, v: f'<Vector3 name="{k}"><X>{v[0]:.6g}</X><Y>{v[1]:.6g}</Y><Z>{v[2]:.6g}</Z></Vector3>'
def CF(name, p): return f'<CoordinateFrame name="{name}"><X>{p[0]:.6g}</X><Y>{p[1]:.6g}</Y><Z>{p[2]:.6g}</Z><R00>1</R00><R01>0</R01><R02>0</R02><R10>0</R10><R11>1</R11><R12>0</R12><R20>0</R20><R21>0</R21><R22>1</R22></CoordinateFrame>'
def C3(k, h): return f'<Color3 name="{k}"><R>{int(h[1:3], 16) / 255:.4f}</R><G>{int(h[3:5], 16) / 255:.4f}</G><B>{int(h[5:7], 16) / 255:.4f}</B></Color3>'
def CSEQ(k, keys): return f'<ColorSequence name="{k}">' + ' '.join(f'{t:g} {int(h[1:3], 16) / 255:.4f} {int(h[3:5], 16) / 255:.4f} {int(h[5:7], 16) / 255:.4f} 0' for t, h in keys) + ' </ColorSequence>'
def NSEQ(k, keys): return f'<NumberSequence name="{k}">' + ' '.join(f'{t:g} {v:g} {e:g}' for t, v, e in keys) + ' </NumberSequence>'
def NR(k, a, b): return f'<NumberRange name="{k}">{a:g} {b:g} </NumberRange>'
def V2(k, a, b): return f'<Vector2 name="{k}"><X>{a:g}</X><Y>{b:g}</Y></Vector2>'
def TEX(k, u): return f'<Content name="{k}"><url>{u}</url></Content>'

# ---------------------------------------------------------------- VFX pack (purple energy; k scales sizes and speeds)
def _em(name, tex, color, size, transp, life, speed, spread, rate, on, **kw):
    pr = [B('Enabled', on), TEX('Texture', 'rbxasset://textures/particles/' + tex), CSEQ('Color', color), NSEQ('Size', size), NSEQ('Transparency', transp),
          NR('Lifetime', *life), NR('Speed', *speed), V2('SpreadAngle', spread, spread), F('Rate', rate), F('LightEmission', kw.get('emit', 1)),
          F('LightInfluence', kw.get('influence', 0)), NR('Rotation', 0, 360), NR('RotSpeed', *kw.get('spin', (-120, 120))), F('Drag', kw.get('drag', 1)),
          TK('EmissionDirection', kw.get('dir', 5)), V3('Acceleration', kw.get('acc', (0, 0, 0))), F('ZOffset', kw.get('z', 0)), F('Brightness', kw.get('bright', 1))]
    if 'shape' in kw: pr += [TK('Shape', kw['shape']), TK('ShapeInOut', 0), TK('ShapeStyle', 1)]   # 1 Sphere, outward, from the surface
    return Node('ParticleEmitter', name, pr)
def _light(name, color, bright, rng, on): return Node('PointLight', name, [B('Enabled', on), C3('Color', color), F('Brightness', bright), F('Range', min(60, rng)), B('Shadows', False)])
PACK = {
    'FireBreath': lambda k: _em('FireBreath', 'fire_main.dds', [(0, '#f0dcff'), (0.25, '#b366ff'), (0.7, '#6a1fd6'), (1, '#2a0b5c')], [(0, 0.8 * k, 0), (0.3, 2.6 * k, 0.4 * k), (1, 5.5 * k, k)], [(0, 0.15, 0), (0.7, 0.35, 0), (1, 1, 0)], (0.45, 0.7), (38 * k, 48 * k), 9, 260, False, drag=1.5, z=1, bright=2),
    'FireCore': lambda k: _em('FireCore', 'fire_main.dds', [(0, '#ffffff'), (0.5, '#e2c2ff'), (1, '#a24dff')], [(0, 0.5 * k, 0), (1, 2.2 * k, 0.3 * k)], [(0, 0, 0), (1, 1, 0)], (0.25, 0.35), (45 * k, 55 * k), 4, 180, False, z=2, bright=3),
    'Embers': lambda k: _em('Embers', 'sparkles_main.dds', [(0, '#e4c8ff'), (1, '#8a3dff')], [(0, 0.35 * k, 0.15 * k), (1, 0.1 * k, 0)], [(0, 0, 0), (1, 1, 0)], (0.8, 1.4), (25 * k, 40 * k), 22, 90, False, acc=(0, 4 * k, 0), drag=2),
    'Smoke': lambda k: _em('Smoke', 'smoke_main.dds', [(0, '#4a2a7a'), (1, '#140a24')], [(0, 2 * k, 0), (1, 7 * k, k)], [(0, 0.6, 0), (1, 1, 0)], (0.9, 1.3), (22 * k, 30 * k), 14, 30, False, emit=0, influence=0.3, spin=(-40, 40), drag=2.5),
    'FireLight': lambda k: _light('FireLight', '#a24dff', 6, 20 * k, False),
    'Aura': lambda k: _em('Aura', 'sparkles_main.dds', [(0, '#c58cff'), (1, '#6a1fd6')], [(0, 0, 0), (0.2, 0.4 * k, 0.13 * k), (1, 0, 0)], [(0, 0.2, 0), (1, 1, 0)], (1.5, 2.5), (k, 2.7 * k), 180, 40, True, acc=(0, 1.3 * k, 0), drag=0.5),
    'AuraLight': lambda k: _light('AuraLight', '#7a3dff', 0.6, 10 * k, True),
    'EyeGlow': lambda k: _light('EyeGlow', '#a24dff', 2, 5 * k, True),
    'ImpactBurst': lambda k: _em('ImpactBurst', 'fire_main.dds', [(0, '#f0dcff'), (0.3, '#b366ff'), (1, '#3a0f80')], [(0, 1.2 * k, 0.3 * k), (1, 4 * k, k)], [(0, 0.1, 0), (1, 1, 0)], (0.35, 0.6), (18 * k, 30 * k), 0, 0, False, drag=4, shape=1, bright=2),
    'ImpactDust': lambda k: _em('ImpactDust', 'smoke_main.dds', [(0, '#5a3c8a'), (1, '#1c1230')], [(0, 1.5 * k, 0), (1, 6 * k, k)], [(0, 0.45, 0), (1, 1, 0)], (0.9, 1.5), (10 * k, 18 * k), 0, 0, False, emit=0, influence=0.4, drag=3, shape=1),
    'ImpactSparks': lambda k: _em('ImpactSparks', 'sparkles_main.dds', [(0, '#ffffff'), (1, '#9b4dff')], [(0, 0.35 * k, 0), (1, 0.1 * k, 0)], [(0, 0, 0), (1, 1, 0)], (0.5, 0.9), (25 * k, 45 * k), 0, 0, False, acc=(0, -30 * k, 0), drag=1, shape=1),
    'ImpactLight': lambda k: _light('ImpactLight', '#b366ff', 8, 20 * k, False),
}

# ---------------------------------------------------------------- flipbook effects from a sheet library
# pack item {'sheet': library entry (id, file, FlipbookLayout, FlipbookMode, FlipbookFramerate, Lifetime, LightEmission, Orientation),
#            'size': studs, 'count': particles per burst}. The texture id comes from the kit's SheetAssetIds at run time.
GRID = {'Grid2x2': (1, 2), 'Grid4x4': (2, 4), 'Grid8x8': (3, 8)}
ORIENT = {'FacingCamera': 0, 'FacingCameraWorldUp': 1, 'VelocityParallel': 2, 'VelocityPerpendicular': 3}
def flipbook(p):
    e = p['sheet']; loop = e['FlipbookMode'] == 'Loop'; life = e['Lifetime'] * (4 if loop else 1)
    pr = [B('Enabled', False), TEX('Texture', ''), TK('FlipbookLayout', GRID[e['FlipbookLayout']][0]), TK('FlipbookMode', 0 if loop else 1),
          NR('Lifetime', life, life), NSEQ('Size', [(0, p['size'], 0), (1, p['size'], 0)]), F('LightEmission', e['LightEmission']),
          F('LightInfluence', 0 if e['LightEmission'] > 0.3 else 1), TK('Orientation', ORIENT[e['Orientation']]),
          NR('Speed', 0, 0) if e['Orientation'] == 'FacingCamera' else NR('Speed', 0.01, 0.01), NR('Rotation', 0, 0), NR('RotSpeed', 0, 0),
          F('Rate', 2 / life if loop else 0), B('LockedToPart', loop), TK('EmissionDirection', 1), F('ZOffset', p.get('z', 0))]
    if loop:
        pr += [NR('FlipbookFramerate', e['FlipbookFramerate'], e['FlipbookFramerate']), B('FlipbookStartRandom', True), NSEQ('Transparency', [(0, 1, 0), (0.2, 0, 0), (0.8, 0, 0), (1, 1, 0)])]
    return Node('ParticleEmitter', e['id'], pr, [Node('NumberValue', 'Burst', [F('Value', p.get('count', 1))])])

# ---------------------------------------------------------------- the build
def make(name, segs, pal, bounds, sc, shape, anim, fx, out, cams, glow=('Glow', 'GlowCore'), fx_scale=1.0, studio_cam=None, block=0.5, fx_lib_dir=None):
    """segs: [(seg, parent, pivot design)], pal: [None, (name, '#hex', 's'|'n'), ...], shape(g, stud): paints into Grid g,
    anim: spec above (degrees in the design frame: Y up, faces +Z), fx: {attachment: {'seg', 'pos' design, 'pack': [preset names]}}."""
    os.makedirs(out, exist_ok=True); t0 = time.time()
    PIV = {n: p for n, _, p in segs}
    def build(stud):
        g = Grid(bounds, stud, sc, segs); shape(g, stud); return g
    to_rb = lambda p: (-p[0] * sc, p[1] * sc, -p[2] * sc)          # Roblox: model faces -Z
    PRB = {n: to_rb(p) for n, p in PIV.items()}
    NEON = {i for i, e in enumerate(pal) if e and e[2] == 'n'}

    # ---- mesh (0.5-stud blocks) ----
    g = build(block); C, S, V = g.C, g.S, g.V
    X0, _, Y0, _, Z0, _ = bounds
    gpos = lambda c: (X0 + c[0] * V, Y0 + c[1] * V, Z0 + c[2] * V)
    meshc = (C > 0) & ~np.isin(C, list(NEON))
    K = np.where(meshc, C.astype(np.uint16) | (S.astype(np.uint16) << 8), 0).astype(np.uint16)
    quads = faces(K, np.where(meshc, S, 0))
    NP = 16
    pimg = Image.new('RGB', (NP * 8, 8))
    for i, e in enumerate(pal):
        if e: pimg.paste(tuple(int(e[1][j:j + 2], 16) for j in (1, 3, 5)), (i * 8, 0, i * 8 + 8, 8))
    pb = io.BytesIO(); pimg.save(pb, 'PNG'); PNG = pb.getvalue(); pimg.save(os.path.join(out, 'palette.png'))
    chunks = []
    for si, qs in sorted(quads.items()):
        seg = segs[si - 1][0]
        for ci in range(0, len(qs), 9500):                         # <= 19k triangles per MeshPart
            P, Nn, UV, I = [], [], [], []
            for cs, a, sg, col in qs[ci:ci + 9500]:
                b = len(P); n = [0.0, 0.0, 0.0]; n[a] = float(sg); n = [-n[0], n[1], -n[2]]
                for c in cs: P.append(to_rb(gpos(c))); Nn.append(n); UV.append(((col + 0.5) / NP, 0.5))
                I += [b, b + 1, b + 2, b, b + 2, b + 3]
            chunks.append((seg if ci == 0 else f'{seg}_{ci // 9500 + 1}', seg, np.array(P, np.float32), np.array(Nn, np.float32), np.array(UV, np.float32), np.array(I, np.uint32)))
    blob = bytearray(); views, acc, meshes, nodes, INFO = [], [], [], [], {}
    def view(data, tgt=None):
        off = len(blob); blob.extend(data + b'\0' * ((-len(data)) % 4))
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if tgt: v['target'] = tgt
        views.append(v); return len(views) - 1
    for mname, seg, P, Nn, UV, I in chunks:
        a0 = len(acc)
        acc += [{'bufferView': view(P.tobytes(), 34962), 'componentType': 5126, 'count': len(P), 'type': 'VEC3', 'min': P.min(0).tolist(), 'max': P.max(0).tolist()},
                {'bufferView': view(Nn.tobytes(), 34962), 'componentType': 5126, 'count': len(P), 'type': 'VEC3'},
                {'bufferView': view(UV.tobytes(), 34962), 'componentType': 5126, 'count': len(P), 'type': 'VEC2'},
                {'bufferView': view(I.tobytes(), 34963), 'componentType': 5125, 'count': len(I), 'type': 'SCALAR'}]
        meshes.append({'name': mname, 'primitives': [{'attributes': {'POSITION': a0, 'NORMAL': a0 + 1, 'TEXCOORD_0': a0 + 2}, 'indices': a0 + 3, 'material': 0}]})
        nodes.append({'mesh': len(meshes) - 1, 'name': mname})
        lo, hi = P.min(0), P.max(0); ctr = (lo + hi) / 2
        INFO[mname] = {'seg': seg, 'tris': len(I) // 3, 'size': (hi - lo).tolist(), 'off': (np.array(PRB[seg]) - ctr).tolist()}
    img = view(PNG)
    gj = {'asset': {'version': '2.0', 'generator': 'beast rig.py'}, 'scene': 0, 'scenes': [{'name': name, 'nodes': list(range(len(nodes)))}],
          'nodes': nodes, 'meshes': meshes, 'materials': [{'name': name + 'Palette', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0.0, 'roughnessFactor': 0.8}}],
          'textures': [{'source': 0, 'sampler': 0}], 'samplers': [{'magFilter': 9728, 'minFilter': 9728, 'wrapS': 33071, 'wrapT': 33071}],
          'images': [{'bufferView': img, 'mimeType': 'image/png'}], 'accessors': acc, 'bufferViews': views, 'buffers': [{'byteLength': len(blob)}]}
    js = json.dumps(gj, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
    open(os.path.join(out, name + '.glb'), 'wb').write(glb)
    tris = sum(i['tris'] for i in INFO.values())
    print(f'{name}.glb: {len(chunks)} meshes, {tris} tris (max {max(i["tris"] for i in INFO.values())}/mesh), {len(glb) // 1024} KB, {int((C > 0).sum())} blocks')

    # ---- glow blocks: Neon parts (a mesh texture can't glow) ----
    G = np.where(np.isin(C, list(NEON)), C.astype(np.uint16) | (S.astype(np.uint16) << 8), 0).astype(np.uint16)
    GL = []
    for k, lo, hi in greedy(G):
        seg = segs[(k >> 8) - 1][0]; c = to_rb(gpos([(lo[i] + hi[i]) / 2 for i in range(3)]))
        GL.append((seg, [round(c[j] - PRB[seg][j], 3) for j in range(3)], [round((hi[i] - lo[i]) * V * sc, 3) for i in range(3)], pal[k & 255][1]))

    # ---- rig.json for video.html ----
    FXRB = {a: {'seg': f['seg'], 'pos': [round(v, 3) for v in np.subtract(to_rb(f['pos']), PRB[f['seg']])], 'pack': f['pack']} for a, f in fx.items()}
    lo = np.min([c[2].min(0) for c in chunks], 0); hi = np.max([c[2].max(0) for c in chunks], 0)
    fx_lib = fx_lib_dir
    json.dump({'name': name, 'segments': [{'name': n, 'parent': p, 'pivot': PRB[n]} for n, p, _ in segs], 'meshes': INFO, 'glow': GL,
               'fx': FXRB, 'anim': anim, 'cams': cams, 'bounds': [lo.tolist(), hi.tolist()], 'k': fx_scale},
              open(os.path.join(out, 'rig.json'), 'w'))

    # ---- Roblox kit ----
    sheets = sorted({p['sheet']['file'] for f in fx.values() for p in f['pack'] if isinstance(p, dict)})
    fxf = Node('Folder', 'FX', [], [Node('Attachment', a, [CF('CFrame', f['pos'])], [PACK[p](fx_scale) if isinstance(p, str) else flipbook(p) for p in f['pack']]) for a, f in FXRB.items()])
    ids = Node('Folder', 'SheetAssetIds', [], [Node('StringValue', sh, ['<string name="Value"></string>']) for sh in sheets])
    for sh in sheets:                                   # the sheets the kit uses travel with it (upload them, paste ids)
        src = os.path.join(fx_lib, sh); dst = os.path.join(out, 'sheets', sh)
        os.makedirs(os.path.dirname(dst), exist_ok=True); open(dst, 'wb').write(open(src, 'rb').read())
    lv = lambda v: 'Vector3.new(%s)' % ', '.join(f'{x:.4g}' for x in v)
    rig_lua = RIG_LUA % dict(name=name,
        parent=', '.join(f'{n} = "{p}"' for n, p, _ in segs if p), order=', '.join(f'"{n}"' for n, _, _ in segs),
        off=', '.join(f'["{n}"] = {lv(i["off"])}' for n, i in INFO.items()), size=', '.join(f'["{n}"] = {lv(i["size"])}' for n, i in INFO.items()),
        glow=', '.join('{"%s", %s, %s, "%s"}' % (q[0], lv(q[1]), lv(q[2]), q[3]) for q in GL),
        fxhost=', '.join(f'{a} = "{f["seg"]}"' for a, f in FXRB.items()), root=segs[0][0])
    anim_lua = ANIM_LUA.replace('__SPEC__', lua_val(anim)).replace('__NAME__', name)
    kit = Node('Model', name + 'Kit', [], [fxf, ids,
        Node('Script', 'Rig', [TK('RunContext', 1), B('Disabled', False), f'<ProtectedString name="Source"><![CDATA[{rig_lua}]]></ProtectedString>']),
        Node('Script', 'Animator', [TK('RunContext', 2), B('Disabled', False), f'<ProtectedString name="Source"><![CDATA[{anim_lua}]]></ProtectedString>'])])
    open(os.path.join(out, name + 'Kit.rbxmx'), 'w').write(rbx_doc(kit))

    # ---- studio copy: coarsest blocks that fit 245 KB, same clip ----
    fxcols = {}
    for a, f in fx.items():                               # VFX stand-in colours: each sheet's mean, lighter and darker
        cols = []
        for it in f['pack']:
            if isinstance(it, dict) and fx_lib_dir:
                px = np.asarray(Image.open(os.path.join(fx_lib_dir, it['sheet']['file'])).convert('RGBA').resize((128, 128))).reshape(-1, 4).astype(float)
                px = px[px[:, 3] > 80][:, :3]
                if len(px): m = px.mean(0); cols += ['#%02x%02x%02x' % tuple(np.clip(m * k, 0, 255).astype(int)) for k in (0.8, 1.0, 1.25)]
        fxcols[a] = cols or ['#a24dff', '#c58cff', '#7432e0', '#e4c8ff']
    for stud in (0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5):   # finest that fits the 245 KB doc
        gs = build(stud)
        Ks = gs.C.astype(np.uint16) | (gs.S.astype(np.uint16) << 8)
        bx = greedy(Ks)
        doc = studio_doc(name, segs, pal, sc, bounds, gs.V, bx, anim, fx, studio_cam or cams[0], fxcols)
        txt = json.dumps(doc, separators=(',', ':'))
        if len(txt) < 245_000: break
    open(os.path.join(out, 'project.json'), 'w').write(txt)
    json.dump({'name': name, 'updated': doc['updated'], 'count': len(doc['objects']), 'ai': True}, open(os.path.join(out, 'meta.json'), 'w'))
    # live build stages for the studio tab: bottom-up bands of blocks, then the animation and effects
    os.makedirs(os.path.join(out, 'stages'), exist_ok=True)
    ys = sorted(lo[1] for _, lo, _ in bx); cuts = [ys[int(len(ys) * q)] for q in (0.25, 0.5, 0.75)] + [10 ** 9]
    groups = {k: o for k, o in doc['objects'].items() if o['type'] == 'group' and not k.startswith('FX')}
    for si, cut in enumerate(cuts):
        objs = dict(groups)
        for i, (_, lo, _) in enumerate(bx):
            if lo[1] < cut: objs[b36(i)] = doc['objects'][b36(i)]
        st = dict(doc, objects=objs, anims={})
        open(os.path.join(out, 'stages', f'stage{si + 1}.json'), 'w').write(json.dumps(st, separators=(',', ':')))
    open(os.path.join(out, 'stages', f'stage{len(cuts) + 1}.json'), 'w').write(txt)
    print(f'kit + rig.json written; studio copy {stud}-stud blocks, {len(bx)} parts, {len(txt) // 1000} KB; {time.time() - t0:.0f} s')
    gp = build(block * 2); mp = (gp.C > 0) & ~np.isin(gp.C, list(NEON))     # shadow stand-in: 2x blocks, faces without colour
    pquads = faces(np.where(mp, gp.S.astype(np.uint16) << 8, 0).astype(np.uint16), np.where(mp, gp.S, 0))
    studio_mesh(name, segs, pal, sc, bounds, V, quads, GL, anim, fx, studio_cam or cams[0], doc, PNG, out, sheets_dir=fx_lib_dir, proxy=(pquads, gp.V))

def studio_mesh(name, segs, pal, sc, bounds, V, quads, GL, anim, fx, cam, partdoc, PNG, out, limit=430_000, sheets_dir=None, proxy=None):   # estimate units (~2x bytes)
    """The exact export in the studio: one mesh object per segment chunk (palette texture, flat faces), geometry in the
    project's geo store (<= 225 KB per doc), glow blocks as Neon parts, plus the same clip and VFX stand-ins as the part copy.
    Writes out/studio/: project.json, geo/<id>.json, tex/pal.json and plan.json (live-build batches, bottom-up by segment)."""
    import base64
    X0, _, Y0, _, Z0, _ = bounds; NP = 16; d = os.path.join(out, 'studio')
    for sub in ('geo', 'tex'): os.makedirs(os.path.join(d, sub), exist_ok=True)
    PIV = {n: tuple(v * sc for v in p) for n, _, p in segs}; sid = {n: f'S{i}' for i, (n, _, _) in enumerate(segs)}
    objs = {k: o for k, o in partdoc['objects'].items() if o['type'] == 'group' or k.startswith('F')}   # segment groups + VFX stand-ins
    geos = {}                                          # seg -> [geo ids]
    for si, qs in sorted(quads.items()):
        seg = segs[si - 1][0]; px, py, pz = PIV[seg]; chunk = None
        def flush():
            if chunk and chunk['faces']:
                gid = f'{name.lower()}-{seg.lower()}-{len(geos.get(seg, []))}'
                json.dump({'verts': chunk['verts'], 'faces': chunk['faces'], 'uvs': chunk['uvs']}, open(os.path.join(d, 'geo', gid + '.json'), 'w'), separators=(',', ':'))
                geos.setdefault(seg, []).append(gid)
        for cs, a, sg, col in qs:
            if chunk is None or chunk['size'] > limit:
                flush(); chunk = {'verts': [], 'faces': [], 'uvs': [], 'map': {}, 'size': 0}
            f = []
            for c in cs:
                p = (round((X0 + c[0] * V) * sc - px, 4), round((Y0 + c[1] * V) * sc - py, 4), round((Z0 + c[2] * V) * sc - pz, 4))
                key = p + (col,); vi = chunk['map'].get(key)
                if vi is None:
                    vi = len(chunk['verts']) // 3; chunk['map'][key] = vi; chunk['verts'] += list(p); chunk['uvs'] += [round((col + 0.5) / NP, 5), 0.5]
                    chunk['size'] += len(str(p)) + 12
                f.append(vi)
            chunk['faces'].append(f); chunk['size'] += len(str(f))
        flush()
    shadow = proxy is not None
    for seg, ids in geos.items():
        for gid in ids: objs['M' + gid.split('-', 1)[1].replace('-', '')] = {'type': 'mesh', 'name': seg, 'geo': gid, 'parent': sid[seg], 'pos': [0, 0, 0], 'color': '#ffffff', 'texture': 't-pal', 'smooth': False,
                                                                       **({'castShadow': False} if shadow else {})}
    pgeos = {}
    if shadow:                                         # the shadow comes from a 2x-coarser stand-in: the per-frame shadow pass draws ~1/4 of the triangles
        pq, pV = proxy
        for si, qs in sorted(pq.items()):
            seg = segs[si - 1][0]; px, py, pz = PIV[seg]; verts, faces_, vmap = [], [], {}
            for cs, a, sg, col in qs:
                f = []
                for c in cs:
                    p = (round((X0 + c[0] * pV) * sc - px, 4), round((Y0 + c[1] * pV) * sc - py, 4), round((Z0 + c[2] * pV) * sc - pz, 4))
                    vi = vmap.get(p)
                    if vi is None: vi = vmap[p] = len(verts) // 3; verts += list(p)
                    f.append(vi)
                faces_.append(f)
            for k in range(0, len(faces_), 9000):
                part = faces_[k:k + 9000]; used = sorted({i for f in part for i in f}); remap = {v: j for j, v in enumerate(used)}
                gid = f'{name.lower()}-shadow-{seg.lower()}-{k // 9000}'
                json.dump({'verts': [verts[i * 3 + j] for i in used for j in range(3)], 'faces': [[remap[i] for i in f] for f in part], 'uvs': None},
                          open(os.path.join(d, 'geo', gid + '.json'), 'w'), separators=(',', ':'))
                pgeos.setdefault(seg, []).append(gid)
                objs['P' + gid.split('-', 2)[2].replace('-', '')] = {'type': 'mesh', 'name': seg + ' shadow', 'geo': gid, 'parent': sid[seg], 'pos': [0, 0, 0], 'shadowOnly': True, 'smooth': False}
    to_design = lambda q: (-q[0], q[1], -q[2])          # glow offsets come in the Roblox frame
    for i, (seg, pos, size, col) in enumerate(GL):
        objs[f'G{i}'] = {'type': 'part', 'parent': sid[seg], 'pos': [round(v, 3) for v in to_design(pos)], 'size': size, 'color': col, 'material': 'Neon'}
    big = Image.open(io.BytesIO(PNG)).resize((NP * 64, 64), Image.NEAREST); bb = io.BytesIO(); big.save(bb, 'PNG')
    json.dump({'kind': 'image', 'data': 'data:image/png;base64,' + base64.b64encode(bb.getvalue()).decode()}, open(os.path.join(d, 'tex', 'pal.json'), 'w'))
    import base64 as b64
    uploads = {}
    for f in fx.values():
        for it in f['pack']:
            if not isinstance(it, dict): continue
            tid = 'fx-' + it['sheet']['id'].replace('/', '-'); src = os.path.join(sheets_dir or '', it['sheet']['file'])
            if os.path.getsize(src) <= 170_000:
                json.dump({'kind': 'image', 'data': 'data:image/png;base64,' + b64.b64encode(open(src, 'rb').read()).decode()}, open(os.path.join(d, 'tex', tid + '.json'), 'w'))
            else: uploads[tid] = os.path.abspath(src)
    json.dump(uploads, open(os.path.join(d, 'uploads.json'), 'w'), indent=1)   # upload these to the hub's assets, then tex/<id> = {"asset": id}
    doc = dict(partdoc, objects=objs, textures={'t-pal': {'kind': 'image', 'src': 'pal', 'name': 'palette', 'res': 1024, 'scale': 1, 'offset': [0, 0]}})   # scale 1: the studio's default 4 tiles it
    open(os.path.join(d, 'project.json'), 'w').write(json.dumps(doc, separators=(',', ':')))
    # live plan: stage = segments bottom-up by pivot height; each batch <= 4 geo docs (the batch limit is 1 MiB)
    order = sorted({seg for seg in geos}, key=lambda n: PIV[n][1])
    bands = [order[i:i + max(1, len(order) // 5)] for i in range(0, len(order), max(1, len(order) // 5))]
    plan, shown = [], set()
    base = {k: o for k, o in objs.items() if o['type'] == 'group'}
    for band in bands:
        gids = [g for seg in band for g in geos[seg] + pgeos.get(seg, [])]
        for i in range(0, len(gids), 4):
            part = gids[i:i + 4]; shown.update(part)
            o = dict(base); o.update({k: v for k, v in objs.items() if v['type'] == 'mesh' and v['geo'] in shown})
            plan.append({'geo': part, 'objects': o, 'anim': False})
    plan.append({'geo': [], 'objects': objs, 'anim': True})
    for i, st in enumerate(plan):
        sd = dict(doc, objects=st['objects'], anims=doc['anims'] if st['anim'] else {})
        open(os.path.join(d, f'stage{i + 1}.json'), 'w').write(json.dumps(sd, separators=(',', ':')))
    json.dump([{'stage': i + 1, 'geo': st['geo']} for i, st in enumerate(plan)], open(os.path.join(d, 'plan.json'), 'w'), indent=1)
    sizes = [os.path.getsize(os.path.join(d, 'geo', g + '.json')) for ids in geos.values() for g in ids]
    print(f'studio mesh copy: {sum(len(v) for v in geos.values())} + {sum(len(v) for v in pgeos.values())} shadow geo docs (max {max(sizes) // 1000} KB), {len(plan)} live stages, project {len(json.dumps(doc)) // 1000} KB')

def b36(i):
    s = ''
    while True:
        s = '0123456789abcdefghijklmnopqrstuvwxyz'[i % 36] + s; i //= 36
        if not i: return s

def studio_doc(name, segs, pal, sc, bounds, V, boxes, anim, fx, cam, fxcols=None):
    X0, _, Y0, _, Z0, _ = bounds
    PIV = {n: tuple(v * sc for v in p) for n, _, p in segs}
    sid = {n: f'S{i}' for i, (n, _, _) in enumerate(segs)}
    objs = {}
    for n, par, _ in segs:
        pp = PIV[par] if par else (0, 0, 0)
        objs[sid[n]] = {'type': 'group', 'name': n if par else name, 'parent': sid[par] if par else None, 'pos': [round(PIV[n][j] - pp[j], 3) for j in range(3)]}
    for i, (k, lo, hi) in enumerate(boxes):
        col, seg = k & 255, segs[(k >> 8) - 1][0]
        c = [((X0, Y0, Z0)[j] + (lo[j] + hi[j]) / 2 * V) * sc for j in range(3)]
        o = {'type': 'part', 'parent': sid[seg], 'pos': [round(c[j] - PIV[seg][j], 2) for j in range(3)], 'size': [round((hi[j] - lo[j]) * V * sc, 3) for j in range(3)], 'color': pal[col][1]}
        if pal[col][2] == 'n': o['material'] = 'Neon'
        objs[b36(i)] = o
    tracks = {}; L = anim['len']; act = anim['action']
    for n, ch in key_poses(anim).items():                 # key poses + smooth tweens, not a key per frame
        tr = tracks.setdefault(sid[n], {})
        tr['rot'] = [[t, v, 'smooth'] for t, v in ch['rot']]
        if 'pos' in ch:
            base = objs[sid[n]]['pos']; tr['pos'] = [[t, [round(base[j] + v[j], 3) for j in range(3)], 'smooth'] for t, v in ch['pos']]   # pos terms are studs
    # VFX stand-in: neon cubes at each event's attachment, shown while it is on (studio has no particles)
    rr = np.random.default_rng(5)
    for e_i, ev in enumerate(anim['fx']):
        f = fx[ev['att']]; gid = f'FX{e_i}'; on = act['first'] + ev.get('on', ev.get('burst', 0)); off = act['first'] + ev.get('off', ev.get('burst', 0) + 0.45)
        objs[gid] = {'type': 'group', 'name': ev['att'], 'visible': False, 'parent': sid[f['seg']], 'pos': [round((f['pos'][j] - [p for n, _, p in segs if n == f['seg']][0][j]) * sc, 2) for j in range(3)]}
        stream = 'on' in ev
        flips = [it for it in f['pack'] if isinstance(it, dict)]
        if flips:                                          # the real effect sheets, played by the studio's flipbook type
            objs[gid]['visible'] = True
            for k, it in enumerate(flips):
                e = it['sheet']; loop = e['FlipbookMode'] == 'Loop'
                for c in range(it.get('count', 1) if not loop else 1):
                    objs[f'F{e_i}x{k}c{c}'] = {'type': 'flipbook', 'parent': gid, 'tex': 'fx-' + e['id'].replace('/', '-'), 'grid': GRID[e['FlipbookLayout']][1],
                        'frames': e.get('frames', GRID[e['FlipbookLayout']][1] ** 2), 'life': e['Lifetime'], 'start': round(on, 3), 'loop': loop,
                        'dur': round(off - on, 3), 'fps': e.get('FlipbookFramerate') or 16, 'size': it['size'], 'flat': e['Orientation'] == 'VelocityPerpendicular',
                        'blend': 'add' if e['LightEmission'] > 0.3 else 'normal', 'pos': [round(float(rr.uniform(-1, 1)) * it['size'] * 0.12 * (c > 0), 2), 0, round(float(rr.uniform(-1, 1)) * it['size'] * 0.12 * (c > 0), 2)]}
            continue
        for i in range(14):
            z = float(rr.uniform(0.5, 12)) if stream else 0; r = (0.3 + z * 0.18) if stream else 2.5
            objs[f'F{e_i}x{i}'] = {'type': 'part', 'parent': gid, 'pos': [round(float(rr.uniform(-r, r)), 2), round(float(rr.uniform(-r, r)) + (0 if stream else 1), 2), round(z * sc, 2)],
                                  'size': [round(float(rr.uniform(0.6, 1.6)) * sc, 2)] * 3, 'color': str(rr.choice((fxcols or {}).get(ev['att']) or ['#a24dff', '#c58cff', '#7432e0', '#e4c8ff'])), 'material': 'Neon', 'transparency': 0.15}
        tracks[gid] = {'visible': [[0, False, 'step'], [round(on, 2), True, 'step'], [round(off, 2), False, 'step']],
                       'scale': [[0, [0.2] * 3], [round(on, 2), [0.2] * 3, 'out'], [round(on + 0.2, 2), [1, 1, 1]], [round(off, 2), [1.15] * 3], [L, [0.2] * 3]]}
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())       # ISO: the studio reads dates, not epoch numbers
    return {'name': name, 'v': 1, 'updated': now, 'objects': objs, 'anims': {'loop': {'name': name + ' loop', 'len': L, 'fps': 30, 'loop': True, 'tracks': tracks}},
            'textures': {}, 'env': {'bg': '#e9e7ee', 'grid': False, 'fog': None, 'light': 'studio'},
            'camera': {'pos': cam['studio_pos'], 'target': cam['studio_target'], 'fov': 50, 'ortho': False}}

RIG_LUA = '''-- %(name)s rig: turns the imported meshes into one animated assembly (runs once on the server).
-- Put this kit inside the model the 3D Importer made from %(name)s.glb, then press Play.
local kit = script.Parent
local model = kit.Parent
local PARENT = {%(parent)s}
local ORDER = {%(order)s}
local OFF = {%(off)s}     -- joint pivot relative to each mesh's centre (studs, as exported)
local SIZE = {%(size)s}   -- exported mesh sizes, to undo any import scaling
local GLOW = {%(glow)s}
local FXHOST = {%(fxhost)s}
local ROOT = "%(root)s"

local meshes = {}
for _, d in model:GetDescendants() do
	if d:IsA("BasePart") and OFF[d.Name] and not d:IsDescendantOf(kit) then meshes[d.Name] = d end
end
assert(meshes[ROOT], "Kit: no " .. ROOT .. " mesh found. Put the kit inside the imported model.")
local s = meshes[ROOT].Size.Magnitude / SIZE[ROOT].Magnitude
local pivot = {}
for n, m in meshes do pivot[n] = m.CFrame.Position + m.CFrame:VectorToWorldSpace(OFF[n] * s) end
local root = Instance.new("Part")
root.Name = "RigRoot"; root.Anchored = true; root.CanCollide = false; root.CanQuery = false; root.CanTouch = false
root.Transparency = 1; root.Size = Vector3.new(2, 2, 2); root.CFrame = CFrame.new(pivot[ROOT]); root.Parent = model
model.PrimaryPart = root
for _, seg in ORDER do
	local m = meshes[seg]
	local p0 = PARENT[seg] and meshes[PARENT[seg]] or root
	if m and p0 then
		local j = Instance.new("Motor6D")
		j.Name = seg; j.Part0 = p0; j.Part1 = m
		local at = CFrame.new(pivot[seg])
		j.C0 = p0.CFrame:ToObjectSpace(at); j.C1 = m.CFrame:ToObjectSpace(at)
		j.Parent = p0
	end
end
for n, m in meshes do
	local base = string.split(n, "_")[1]
	if base ~= n and meshes[base] then local w = Instance.new("WeldConstraint"); w.Part0 = meshes[base]; w.Part1 = m; w.Parent = m end
end
for _, g in GLOW do
	local host = meshes[g[1]]
	if host then
		local p = Instance.new("Part")
		p.Name = "Glow"; p.Material = Enum.Material.Neon; p.Color = Color3.fromHex(g[4]); p.Size = g[3] * s
		p.CanCollide = false; p.CanQuery = false; p.CanTouch = false; p.Massless = true; p.CastShadow = false
		p.CFrame = CFrame.new(pivot[g[1]] + g[2] * s)
		local w = Instance.new("WeldConstraint"); w.Part0 = host; w.Part1 = p; w.Parent = p
		p.Parent = model
	end
end
local missing = {}
for _, v in (kit:FindFirstChild("SheetAssetIds") or Instance.new("Folder")):GetChildren() do
	local id, em = v.Value, string.gsub(v.Name, "%%.png$", "")
	for _, e in kit.FX:GetDescendants() do
		if e:IsA("ParticleEmitter") and e.Name == em then
			if id ~= "" then e.Texture = if string.match(id, "^%%d+$") then "rbxassetid://" .. id else id else table.insert(missing, v.Name) end
		end
	end
end
if #missing > 0 then warn("Kit: upload these VFX sheets and paste their asset ids into SheetAssetIds: " .. table.concat(missing, ", ")) end
for n, hostName in FXHOST do
	local a, host = kit.FX:FindFirstChild(n), meshes[hostName]
	if a and host then local wpos = pivot[hostName] + a.CFrame.Position * s; a.Parent = host; a.CFrame = host.CFrame:ToObjectSpace(CFrame.new(wpos)) end
end
for _, m in meshes do m.Anchored = false; m.CanCollide = false; m.CanQuery = false; m.CanTouch = false; m.Massless = true end
model:SetAttribute("RigReady", true)
'''

ANIM_LUA = '''-- __NAME__ animation: idle loop + an action every few seconds, with its VFX. Runs on each player's client
-- (smooth, no network cost). All motion is the SPEC table: [amp, period, phase] sines, ["phase", amp] action windows.
local RunService = game:GetService("RunService")
local model = script.Parent.Parent
while not model:GetAttribute("RigReady") do model:GetAttributeChangedSignal("RigReady"):Wait() end
local SPEC = __SPEC__
local motors, att = {}, {}
for _, d in model:GetDescendants() do
	if d:IsA("Motor6D") then motors[d.Name] = d elseif d:IsA("Attachment") then att[d.Name] = d end
end
local function sm(u) return (1 - math.cos(math.pi * u)) / 2 end   -- sine-shaped ramps, as in the studio clip and the video
local function window(b, a, e, rin, rout)
	if b <= a - rin or b >= e + rout then return 0 end
	if b < a then return sm((b - a + rin) / rin) end
	if b > e then return sm(1 - (b - e) / rout) end
	return 1
end
local function setFx(name, on)
	local a = att[name]; if not a then return end
	for _, e in a:GetChildren() do if e:IsA("ParticleEmitter") or e:IsA("Light") then e.Enabled = on end end
end
local function burst(name, n)
	local a = att[name]; if not a then return end
	for _, e in a:GetChildren() do
		if e:IsA("ParticleEmitter") then local b = e:FindFirstChild("Burst"); e:Emit(if b then b.Value else n) elseif e:IsA("Light") then e.Enabled = true; task.delay(0.25, function() e.Enabled = false end) end
	end
end
local rad, sin, pi = math.rad, math.sin, math.pi
local clock, nextAct, actStart, fired = 0, SPEC.action.first, nil, {}
local W = {}
local function term(tr, t)
	if type(tr[1]) == "string" then return tr[2] * (W[tr[1]] or 0) end
	if #tr == 1 then return tr[1] end
	local per = type(tr[2]) == "string" and SPEC.periods[tr[2]] or tr[2]
	return tr[1] * sin(2 * pi * t / per + tr[3])
end
local function sum(list, t) local v = 0; if list then for _, tr in list do v += term(tr, t) end end; return v end
RunService.PreSimulation:Connect(function(dt)
	clock += dt
	local t = clock
	if not actStart and t >= nextAct then actStart = t; fired = {} end
	local b = actStart and (t - actStart) or nil
	for name, ph in SPEC.action.phases do W[name] = b and window(b, ph[1], ph[2], ph[3], ph[4]) or 0 end
	if b then
		for i, ev in SPEC.fx do
			if ev.on then setFx(ev.att, b >= ev.on and b < ev.off)
			elseif ev.burst and b >= ev.burst and not fired[i] then fired[i] = true; burst(ev.att, ev.count or 40) end
		end
		if b > SPEC.action.len then
			actStart = nil
			nextAct = t + SPEC.action.every[1] + math.random() * (SPEC.action.every[2] - SPEC.action.every[1])
		end
	end
	for name, ch in SPEC.joints do
		local m = motors[name]
		if m then
			local r, p = ch.rot or {}, ch.pos or {}
			-- design frame faces +Z; the model faces -Z in Roblox, so X and Z flip
			m.Transform = CFrame.new(-sum(p.x, t), sum(p.y, t), -sum(p.z, t)) * CFrame.Angles(rad(-sum(r.x, t)), rad(sum(r.y, t)), rad(-sum(r.z, t)))
		end
	end
end)
'''
