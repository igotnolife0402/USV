# Usage: python3 glb.py [out.glb]  — Roblox-ready tiger: QEM-decimated mesh (<=20k tris), box-chart UVs, baked 1024 texture, one GLB.
import sys, io, json, heapq, struct, time, numpy as np
from PIL import Image, ImageDraw
sys.argv = [sys.argv[0], 'out'] + sys.argv[1:]          # geo.py reads argv[1] as its out dir
import geo
OUTF = sys.argv[2] if len(sys.argv) > 2 else 'final/tiger.glb'
t0 = time.time(); lap = lambda m: print(f'{m}  {time.time() - t0:.1f}s', flush=True)
MAIN_TRIS, TEX, PAD, STUDS = 19200, 1024, 4, 3.57         # 1 stud = 0.28 m

# ---------- 1. dense mesh ----------
Vt, Q4 = geo.build(0.011, 6); T = geo.tris_of(Q4, Vt)
vol = np.einsum('ij,ij->i', Vt[T[:, 0]], np.cross(Vt[T[:, 1]], Vt[T[:, 2]])).sum()/6
if vol < 0: T = T[:, ::-1].copy()                          # outward winding
lap(f'dense {len(Vt)} v {len(T)} t vol {abs(vol):.3f} m3')

# ---------- 2. QEM decimation ----------
def qem(V, F, target):
    V = V.copy(); nv = len(V)
    p0, p1, p2 = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    n = np.cross(p1 - p0, p2 - p0); a = np.linalg.norm(n, axis=1); n /= np.maximum(a, 1e-15)[:, None]
    pl = np.c_[n, -(n*p0).sum(1)]
    K = (a/2)[:, None, None]*pl[:, :, None]*pl[:, None, :]
    Qm = np.zeros((nv, 4, 4))
    for c in range(3): np.add.at(Qm, F[:, c], K)
    F = F.tolist(); falive = [True]*len(F); valive = [True]*nv; stamp = [0]*nv
    vf = [set() for _ in range(nv)]
    for i, f in enumerate(F):
        for w in f: vf[w].add(i)
    def nbrs(u): return {w for f in vf[u] for w in F[f]} - {u}
    def best(u, v):
        Qs = Qm[u] + Qm[v]; A3, b = Qs[:3, :3], Qs[:3, 3]
        cands = [V[u], V[v], (V[u] + V[v])/2]
        if np.linalg.cond(A3) < 1e7:
            x = np.linalg.solve(A3, -b)
            if np.linalg.norm(x - cands[2]) < 2*np.linalg.norm(V[u] - V[v]): cands.append(x)
        cs = [(float(np.r_[x, 1] @ Qs @ np.r_[x, 1]), i) for i, x in enumerate(cands)]
        c, i = min(cs); return max(c, 0.0), cands[i]
    heap = []
    E = {(min(a, b), max(a, b)) for f in F for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0]))}
    for u, v in E: heap.append((best(u, v)[0], u, v, 0, 0))
    heapq.heapify(heap); nf = len(F)
    while nf > target and heap:
        _, u, v, su, sv = heapq.heappop(heap)
        if not (valive[u] and valive[v]) or stamp[u] != su or stamp[v] != sv: continue
        shared = vf[u] & vf[v]
        if len(shared) != 2 or len(nbrs(u) & nbrs(v)) != 2: continue
        c, p = best(u, v); ok = True
        for f in (vf[u] | vf[v]) - shared:                   # reject flips and slivers
            q = [V[w] for w in F[f]]; q2 = [p if w in (u, v) else V[w] for w in F[f]]
            no = np.cross(q[1] - q[0], q[2] - q[0]); nn = np.cross(q2[1] - q2[0], q2[2] - q2[0])
            la, lb = np.linalg.norm(no), np.linalg.norm(nn)
            e2 = max(np.sum((q2[1] - q2[0])**2), np.sum((q2[2] - q2[1])**2), np.sum((q2[0] - q2[2])**2))
            if lb < 1e-12 or no @ nn < 0.2*la*lb or lb < 0.08*e2: ok = False; break
        if not ok: continue
        V[u] = p; Qm[u] += Qm[v]; stamp[u] += 1; valive[v] = False
        for f in shared:
            falive[f] = False
            for w in F[f]: vf[w].discard(f)
        for f in vf[v]:
            F[f] = [u if w == v else w for w in F[f]]; vf[u].add(f)
        vf[v] = set(); nf -= 2
        for w in nbrs(u):
            a_, b_ = min(u, w), max(u, w)
            heapq.heappush(heap, (best(a_, b_)[0], a_, b_, stamp[a_], stamp[b_]))
    F = np.array([f for f, al in zip(F, falive) if al]); used = np.unique(F)
    remap = np.full(nv, -1); remap[used] = np.arange(len(used))
    return V[used], remap[F]
Vd, Td = qem(Vt, T, MAIN_TRIS)
lap(f'decimated {len(Vd)} v {len(Td)} t')
Nd = geo.vnormals(Vd, Td)

# ---------- 3. eye caps ----------
def eye_cap(c, d, rings=6, seg=16, tmax=78):
    e1 = np.cross(d, [0, 0, 1.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(d, e1)
    P = [c + geo.EYE_R*d]
    for r in range(1, rings + 1):
        th = np.radians(tmax*r/rings)
        for j in range(seg):
            ph = 2*np.pi*j/seg; P.append(c + geo.EYE_R*(np.cos(th)*d + np.sin(th)*(np.cos(ph)*e1 + np.sin(ph)*e2)))
    P = np.array(P); T_ = []
    for j in range(seg): T_.append([0, 1 + j, 1 + (j + 1) % seg])
    for r in range(rings - 1):
        a0, b0 = 1 + r*seg, 1 + (r + 1)*seg
        for j in range(seg):
            j1 = (j + 1) % seg; T_ += [[a0 + j, b0 + j, b0 + j1], [a0 + j, b0 + j1, a0 + j1]]
    T_ = np.array(T_)
    fn = np.cross(P[T_[:, 1]] - P[T_[:, 0]], P[T_[:, 2]] - P[T_[:, 0]])
    flip = np.einsum('ij,ij->i', fn, P[T_].mean(1) - c) < 0; T_[flip] = T_[flip][:, ::-1]
    return P, T_, (P - c)/geo.EYE_R, np.c_[(P - c) @ e1, (P - c) @ e2]
EYEC = geo.eye_world()
Vall, Tall, Nall = [Vd], [Td], [Nd]; eye_uv = []; base = len(Vd); eye_tri0 = len(Td)
for c, d in EYEC:
    P, T_, N_, uv = eye_cap(c, d); Vall.append(P); Tall.append(T_ + base); Nall.append(N_); eye_uv.append((base, len(P), uv)); base += len(P)
V = np.concatenate(Vall); Tm = np.concatenate(Tall); N = np.concatenate(Nall)
lap(f'with eyes {len(V)} v {len(Tm)} t')

# ---------- 4. charts (box projection, split at borders) ----------
nt = len(Tm); fn = np.cross(V[Tm[:, 1]] - V[Tm[:, 0]], V[Tm[:, 2]] - V[Tm[:, 0]])
fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-15)
DIRS = np.array([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1.0]])
ek = np.sort(np.concatenate([Tm[:, [0, 1]], Tm[:, [1, 2]], Tm[:, [2, 0]]]), 1); ef = np.tile(np.arange(nt), 3)
o = np.lexsort((ek[:, 1], ek[:, 0])); ek, ef = ek[o], ef[o]
same = np.all(ek[1:] == ek[:-1], 1); adj = np.c_[ef[:-1][same], ef[1:][same]]
fs = fn.copy()
for _ in range(3):
    acc = fs.copy(); np.add.at(acc, adj[:, 0], fs[adj[:, 1]]); np.add.at(acc, adj[:, 1], fs[adj[:, 0]])
    fs = acc/np.linalg.norm(acc, axis=1, keepdims=True)
lab = np.argmax(fs @ DIRS.T, 1); raw = np.argmax(fn @ DIRS.T, 1)
lab = np.where(np.einsum('ij,ij->i', fn, DIRS[lab]) < 0.25, raw, lab)
EYE_LAB = 6
eye_of_tri = np.full(nt, -1)
for k, (b0, nvk, _) in enumerate(eye_uv):
    m = (Tm[:, 0] >= b0) & (Tm[:, 0] < b0 + nvk); eye_of_tri[m] = k
lab[eye_of_tri >= 0] = EYE_LAB + eye_of_tri[eye_of_tri >= 0]
def components(lab):
    par = list(range(nt))
    def find(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for a, b in adj[lab[adj[:, 0]] == lab[adj[:, 1]]].tolist():
        ra, rb = find(a), find(b)
        if ra != rb: par[ra] = rb
    r = np.array([find(i) for i in range(nt)]); return np.unique(r, return_inverse=True)[1]
comp = components(lab)
for _ in range(2):                                         # fold tiny charts into a neighbour when the projection still faces it
    cnt = np.bincount(comp); small = cnt[comp] < 12
    for a, b in adj.tolist():
        for x, y in ((a, b), (b, a)):
            if small[x] and not small[y] and lab[x] < EYE_LAB and lab[y] < EYE_LAB and fn[x] @ DIRS[lab[y]] > 0.3: lab[x] = lab[y]
    comp = components(lab)
nch = comp.max() + 1
# split vertices per chart
key = Tm.ravel()*nch + np.repeat(comp, 3); uk, inv = np.unique(key, return_inverse=True)
vid = uk//nch; cid = uk % nch; Tn = inv.reshape(-1, 3)
Vs, Ns = V[vid], N[vid]
AX = {0: (1, 2), 1: (1, 2), 2: (0, 2), 3: (0, 2), 4: (0, 1), 5: (0, 1)}
chlab = np.zeros(nch, int); chlab[comp] = lab
UV = np.zeros((len(Vs), 2))
for ch in range(nch):
    m = cid == ch; L = chlab[ch]
    if L >= EYE_LAB:
        b0, nvk, uv = eye_uv[L - EYE_LAB]; UV[m] = uv[vid[m] - b0]
    else:
        a0, a1 = AX[L]; UV[m] = Vs[m][:, [a0, a1]]
# texel density: eyes x5, head x1.6
dens = np.ones(nch); cen = np.zeros((nch, 3)); np.add.at(cen, cid, Vs); cen /= np.bincount(cid, minlength=nch)[:, None]
dens[np.linalg.norm(cen - geo.H, axis=1) < 0.24] = 1.6; dens[chlab >= EYE_LAB] = 5.0
lo = np.full((nch, 2), 1e9); hi = np.full((nch, 2), -1e9)
np.minimum.at(lo, cid, UV); np.maximum.at(hi, cid, UV); ext = (hi - lo)*dens[:, None]
def pack(s):
    order = np.argsort(-ext[:, 1]); x = y = PAD; rowh = 0; pos = np.zeros((nch, 2))
    for ch in order:
        w, h = ext[ch]*s + PAD
        if x + w > TEX - PAD: x, y, rowh = PAD, y + rowh, 0
        pos[ch] = (x, y); x += w; rowh = max(rowh, h)
    return pos, y + rowh <= TEX - PAD
lo_s, hi_s = 50.0, 3000.0
for _ in range(30):
    mid = (lo_s + hi_s)/2
    if pack(mid)[1]: lo_s = mid
    else: hi_s = mid
S = lo_s; pos, _ = pack(S)
PX = (UV - lo[cid])*(dens[cid]*S)[:, None] + pos[cid]      # texel coords
lap(f'{nch} charts, {S:.0f} px/m ({1000/S:.1f} mm/texel body)')

# ---------- 5. bake texture ----------
img = Image.new('I', (TEX, TEX), 0); dr = ImageDraw.Draw(img)
for i, t in enumerate(Tn.tolist()): dr.polygon([tuple(PX[j]) for j in t], fill=i + 1)
tid = np.asarray(img, np.int64) - 1
# overlap check: rasterise again in reverse order and count texels whose owner changes beyond edges
img2 = Image.new('I', (TEX, TEX), 0); dr2 = ImageDraw.Draw(img2)
for i in range(len(Tn) - 1, -1, -1): dr2.polygon([tuple(PX[j]) for j in Tn[i]], fill=i + 1)
tid2 = np.asarray(img2, np.int64) - 1
ys, xs = np.nonzero(tid >= 0); t = tid[ys, xs]
a, b, c = PX[Tn[t, 0]], PX[Tn[t, 1]], PX[Tn[t, 2]]; p = np.c_[xs + 0.5, ys + 0.5]
den = (b[:, 1] - c[:, 1])*(a[:, 0] - c[:, 0]) + (c[:, 0] - b[:, 0])*(a[:, 1] - c[:, 1])
den = np.where(np.abs(den) < 1e-12, 1e-12, den)
w0 = ((b[:, 1] - c[:, 1])*(p[:, 0] - c[:, 0]) + (c[:, 0] - b[:, 0])*(p[:, 1] - c[:, 1]))/den
w1 = ((c[:, 1] - a[:, 1])*(p[:, 0] - c[:, 0]) + (a[:, 0] - c[:, 0])*(p[:, 1] - c[:, 1]))/den
W = np.clip(np.c_[w0, w1, 1 - w0 - w1], -0.5, 1.5)
P = np.einsum('ij,ijk->ik', W, Vs[Tn[t]]); Nn = np.einsum('ij,ijk->ik', W, Ns[Tn[t]]); Nn /= np.linalg.norm(Nn, axis=1, keepdims=True)
tri_chart = cid[Tn[:, 0]]; tl = chlab[tri_chart[t]]; eye_k = np.where(tl >= EYE_LAB, tl - EYE_LAB, -1)
body = eye_k < 0
col = np.zeros((len(t), 3))
cb, flen, comb = geo.paint(P[body], Nn[body])
# fur grain: streaks stretched along the comb direction
Pb = P[body]; cpar = np.einsum('ij,ij->i', Pb, comb)[:, None]
grain = geo.vnoise(Pb*160 - comb*cpar*140, 1.0, 21)*0.6 + geo.vnoise(Pb*320 - comb*cpar*290, 1.0, 22)*0.4
cb = cb*(1 + 0.11*grain)[:, None]
# ambient occlusion from the distance field
occ = 0
for i, hh in enumerate((0.008, 0.016, 0.03, 0.055, 0.09)):
    occ = occ + 0.6**i*np.clip((hh - geo.point_field(Pb + Nn[body]*hh))/hh, 0, 1)
ao = 1 - occ/sum(0.6**i for i in range(5))
cb = cb*(0.5 + 0.5*np.clip(ao, 0, 1)**1.3)[:, None]
col[body] = cb
lap(f'painted {body.sum()} texels')
# eyes: amber iris, round pupil, catchlight
for k, (c, d) in enumerate(EYEC):
    m = eye_k == k
    if not m.any(): continue
    dv = P[m] - c; dv /= np.linalg.norm(dv, axis=1, keepdims=True)
    th = np.degrees(np.arccos(np.clip(dv @ d, -1, 1)))
    e1 = np.cross(d, [0, 0, 1.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(d, e1)
    ph = np.arctan2(dv @ e2, dv @ e1)
    iris = geo.srgb(214, 160, 40)*(1 - 0.45*geo.sstep(30, 46, th))[:, None]
    iris = iris*(1 + 0.18*np.sin(ph*23 + 3*np.sin(ph*7)))[:, None]*(1 + 0.25*geo.sstep(26, 14, th))[:, None]
    e = np.where(th[:, None] < 13, geo.srgb(6, 5, 5), np.where(th[:, None] < 47, iris, geo.srgb(36, 24, 16)))
    e = np.where(((th > 45) & (th < 50))[:, None], geo.srgb(30, 20, 10), e)
    up = np.cos(np.radians(24))*d + np.sin(np.radians(24))*np.array([0, 0, 1.0]); up /= np.linalg.norm(up)
    hl = np.degrees(np.arccos(np.clip(dv @ up, -1, 1)))
    e = e + (0.9 - e)*geo.sstep(6, 3.5, hl)[:, None]
    col[m] = e
lin = np.zeros((TEX, TEX, 3)); filled = np.zeros((TEX, TEX), bool)
lin[ys, xs] = col; filled[ys, xs] = True
ovl = int(((tid != tid2) & (tid >= 0)).sum())
# gutter dilation: average filled neighbours outward, then the mean colour
for _ in range(10):
    acc = np.zeros_like(lin); n = np.zeros((TEX, TEX))
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        acc += np.roll(lin*filled[..., None], (dy, dx), (0, 1)); n += np.roll(filled, (dy, dx), (0, 1))
    grow = (~filled) & (n > 0); lin[grow] = acc[grow]/n[grow][:, None]; filled |= grow
lin[~filled] = col.mean(0)
srgb = np.where(lin <= 0.0031308, lin*12.92, 1.055*np.clip(lin, 0, None)**(1/2.4) - 0.055)
tex = Image.fromarray((np.clip(srgb, 0, 1)*255 + 0.5).astype(np.uint8))
jb = io.BytesIO(); tex.save(jb, 'JPEG', quality=90, optimize=True, subsampling=0); jpg = jb.getvalue()
tex.save('final/tiger_tex.png')
lap(f'texture {len(jpg)//1024} KB, edge texels differing between draw orders {ovl}')

# ---------- 6. GLB ----------
G = geo.to_gl(Vs)*STUDS; Gn = geo.to_gl(Ns)
G -= [(G[:, 0].min() + G[:, 0].max())/2, G[:, 1].min(), (G[:, 2].min() + G[:, 2].max())/2]
uvn = PX/TEX
pos_b = G.astype('<f4').tobytes(); nrm_b = Gn.astype('<f4').tobytes(); uv_b = uvn.astype('<f4').tobytes()
idx = Tn.astype('<u2' if len(Vs) < 65536 else '<u4'); idx_b = idx.tobytes()
blob = b''; views = []
for data, tgt in ((pos_b, 34962), (nrm_b, 34962), (uv_b, 34962), (idx_b, 34963), (jpg, None)):
    off = len(blob); blob += data + b'\0'*((-len(data)) % 4)
    v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
    if tgt: v['target'] = tgt
    views.append(v)
gj = {'asset': {'version': '2.0', 'generator': 'tiger glb.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}],
      'nodes': [{'mesh': 0, 'name': 'Tiger'}],
      'meshes': [{'name': 'Tiger', 'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2}, 'indices': 3, 'material': 0}]}],
      'materials': [{'name': 'TigerFur', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0.0, 'roughnessFactor': 0.85}}],
      'textures': [{'source': 0, 'sampler': 0}], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}],
      'images': [{'bufferView': 4, 'mimeType': 'image/jpeg'}],
      'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': len(G), 'type': 'VEC3', 'min': G.min(0).tolist(), 'max': G.max(0).tolist()},
                    {'bufferView': 1, 'componentType': 5126, 'count': len(G), 'type': 'VEC3'},
                    {'bufferView': 2, 'componentType': 5126, 'count': len(G), 'type': 'VEC2'},
                    {'bufferView': 3, 'componentType': 5123 if idx.dtype == np.dtype('<u2') else 5125, 'count': idx.size, 'type': 'SCALAR'}],
      'bufferViews': views, 'buffers': [{'byteLength': len(blob)}]}
js = json.dumps(gj, separators=(',', ':')).encode(); js += b' '*((-len(js)) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + blob
open(OUTF, 'wb').write(glb)
sz = G.max(0) - G.min(0)
lap(f'{OUTF}: {len(Tn)} tris, {len(Vs)} verts, {len(glb)/1024:.0f} KB, size {sz.round(2).tolist()} studs (w,h,l)')
