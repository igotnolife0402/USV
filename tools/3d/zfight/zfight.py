#!/usr/bin/env python3
"""Z-fight gate for Studio projects: finds and fixes surfaces that flicker, on any build.

  python3 zfight.py check project.json geo/            report; exit 1 when the project would z-fight on a phone
  python3 zfight.py fix   project.json geo/ out/       write out/geo/*.json + out/project-patch.json (upload as NEW ids)

A pair z-fights when two faces face the same way, overlap, and lie closer than a phone's depth step (phones resolve
far coarser than desktops: layers even 4-12 cm apart flicker there). `fix`:
  1. separate: exactly level overlaps (< 1.5 cm) -> the smaller piece (a connected part of a geo doc) moves 1.5 cm out;
  2. cut: any face with a same-facing face less than 12 cm in front of it loses the covered part (convex difference),
     so nothing hidden stays under a rug, carpet, trim or panel. Shredded faces (books on a shelf back) are dropped
     when mostly hidden, else kept.
Works in world space over every mesh object (pos/scale of the object and its groups; rotated objects are skipped).
Mirrored objects that share a geo doc with an unmirrored one are cut only against their own doc."""
import collections, json, os, sys
import numpy as np

SEP, CUT, AREA_FAIL = 0.015, 0.12, 0.5          # metres, metres, m2 of fighting overlap that fails `check`


def load(project, gdir):
    proj = json.load(open(project)); objs = {k: o for k, o in proj['objects'].items() if o}
    def world(k):
        o = objs[k]; s = o.get('scale', [1, 1, 1]); p = o.get('pos', [0, 0, 0]); rot = o.get('rot') and any(o['rot'])
        if o.get('parent') in objs:
            ps, pp, pr = world(o['parent'])
            return [s[i] * ps[i] for i in range(3)], [pp[i] + ps[i] * p[i] for i in range(3)], pr or rot
        return s, p, rot
    docs, inst, refs = {}, collections.defaultdict(list), collections.defaultdict(list)
    global OBJS; OBJS = objs
    for k, o in objs.items():
        if o.get('type') != 'mesh' or not o.get('geo') or o.get('shadowOnly'): continue   # shadow stand-ins never draw colour
        if (o.get('transparency') or 0) >= 0.5: continue   # see-through glass hides nothing; cutting behind it would delete the liquid
        s, p, rot = world(k)
        if rot: print('skipped (rotated):', o.get('name', k)); continue
        f = os.path.join(gdir, o['geo'] + '.json')
        if not os.path.exists(f): print('missing geo doc:', o['geo']); continue
        if o['geo'] not in docs: docs[o['geo']] = json.load(open(f))
        inst[o['geo']].append((tuple(s), tuple(p))); refs[o['geo']].append(k)
    return docs, inst, refs


def compact(g):
    """Drop unused vertices and merge exact duplicates (same position and uv)."""
    V, U = g['verts'], g.get('uvs'); idx = {}; nv, nu, remap = [], [] if U is not None else None, {}
    for f in g['faces']:
        for v in f:
            if v in remap: continue
            key = (V[3 * v], V[3 * v + 1], V[3 * v + 2]) + ((U[2 * v], U[2 * v + 1]) if U is not None else ())
            if key not in idx:
                idx[key] = len(nv) // 3; nv += key[:3]
                if U is not None: nu += key[3:]
            remap[v] = idx[key]
    g['verts'] = nv; g['faces'] = [[remap[v] for v in f] for f in g['faces']]
    if U is not None: g['uvs'] = nu


def chunks(g, limit=200_000):
    """Split a doc into parts of <= limit bytes (Studio refuses geo docs over 240 KB)."""
    out, cur, size = [], [], 0
    for f in g['faces']:
        b = 30 * len(f)
        if cur and size + b > limit: out.append(cur); cur, size = [], 0
        cur.append(f); size += b
    if cur: out.append(cur)
    parts = []
    for fs in out:
        part = {'verts': g['verts'], 'faces': fs, 'uvs': g.get('uvs')}; compact(part); parts.append(part)
    return parts


def unshare(docs, inst, refs):
    """A doc drawn by several objects (mirrored copies) gets one copy per object, so each copy can be cut on its
    own. Returns the object -> new geo id changes for the project."""
    import copy
    moved = {}
    for gid in [g for g in docs if len(inst[g]) > 1]:
        for i in range(1, len(inst[gid])):
            nid = f'{gid}m{i}'; docs[nid] = copy.deepcopy(docs[gid]); inst[nid] = [inst[gid][i]]; refs[nid] = [refs[gid][i]]
            moved[refs[gid][i]] = nid
        inst[gid] = inst[gid][:1]; refs[gid] = refs[gid][:1]
    return moved


def faces(docs, inst):
    R = []                                          # (doc, face idx, normal_w, d, pts_w, scale)
    for gid, g in docs.items():
        V = np.asarray(g['verts'], float).reshape(-1, 3)
        for fi, f in enumerate(g['faces']):
            P = V[f]; n = np.zeros(3)
            for j in range(1, len(P) - 1): n += np.cross(P[j] - P[0], P[j + 1] - P[0])
            a = np.linalg.norm(n)
            if a < 0.01: continue
            n /= a
            for ii, (s, p) in enumerate(inst[gid]):
                S = np.asarray(s); W = P * S + p
                if np.prod(S) < 0: W = W[::-1]
                nw = n * S
                if nw[1] < -0.9 and W[:, 1].max() < 0.05: continue      # undersides on the ground
                R.append((gid, fi, nw, float(nw @ W[0]), W, S, ii))
    return R


def proj2(W, n):
    u = np.cross(n, [0, 1, 0] if abs(n[1]) < 0.9 else [1, 0, 0]); u /= np.linalg.norm(u); v = np.cross(n, u)
    return [(float(x), float(y)) for x, y in np.stack([W @ u, W @ v], 1)]


def area(p): return 0.5 * sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))
def ccw(p): return p if area(p) >= 0 else p[::-1]


def clip(subj, c):
    out = subj
    for i in range(len(c)):
        a, b = c[i], c[(i + 1) % len(c)]; inp, out = out, []
        if not inp: return []
        sd = lambda q: (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])
        for j in range(len(inp)):
            p, q = inp[j], inp[(j + 1) % len(inp)]; sp, sq = sd(p), sd(q)
            if sp >= 0: out.append(p)
            if (sp >= 0) != (sq >= 0): t = sp / (sp - sq); out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
    return out


def diff(poly, c):
    out, rest = [], poly
    for i in range(len(c)):
        a, b = c[i], c[(i + 1) % len(c)]
        sd = lambda q: (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])
        ins, outs = [], []
        for j in range(len(rest)):
            p, q = rest[j], rest[(j + 1) % len(rest)]; sp, sq = sd(p), sd(q)
            (ins if sp >= 0 else outs).append(p)
            if (sp >= 0) != (sq >= 0):
                t = sp / (sp - sq); x = (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t); ins.append(x); outs.append(x)
        if len(outs) >= 3 and abs(area(outs)) > 1e-6: out.append(outs)
        rest = ins
        if len(rest) < 3: break
    return out


def pairs(R, near):
    B = collections.defaultdict(list)
    for r in R: B[tuple(np.round(r[2], 2))].append(r)
    for key, L in B.items():
        if len(L) < 2: continue
        n0 = np.array(key, float); n0 /= np.linalg.norm(n0)
        L.sort(key=lambda r: r[3]); ds = [r[3] for r in L]; P2 = [ccw(proj2(r[4], n0)) for r in L]
        bb = [(min(x for x, _ in p), min(y for _, y in p), max(x for x, _ in p), max(y for _, y in p)) for p in P2]
        for i in range(len(L)):
            j = i + 1
            while j < len(L) and ds[j] - ds[i] < near:
                a, b = bb[i], bb[j]
                if (L[i][0], L[i][1]) != (L[j][0], L[j][1]) and a[0] < b[2] - 1e-3 and b[0] < a[2] - 1e-3 and a[1] < b[3] - 1e-3 and b[1] < a[3] - 1e-3:
                    c = clip(P2[i], P2[j]); ar = abs(area(c)) if len(c) >= 3 else 0
                    if ar > 0.005: yield L[i], L[j], n0, ar
                j += 1


def check(docs, inst):
    R = faces(docs, inst); level = layered = 0.0; worst = collections.Counter()
    for A, B, n, ar in pairs(R, CUT):
        if B[3] - A[3] < SEP: level += ar
        else: layered += ar
        worst[(A[0], B[0])] += ar
    print(f'level overlaps (< {SEP * 100:.1f} cm): {level:.2f} m2 · layered (< {CUT * 100:.0f} cm): {layered:.2f} m2')
    for (a, b), ar in worst.most_common(8): print(f'  {ar:8.2f} m2  {a} | {b}')
    ok = level + layered < AREA_FAIL
    print('PASS' if ok else f'FAIL: over {AREA_FAIL} m2 of surfaces will z-fight on a phone; run `fix`')
    return ok


def components(g):
    """Connected pieces of a geo doc (faces sharing vertices): the unit the separator moves."""
    par = list(range(len(g['verts']) // 3))
    def find(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for f in g['faces']:
        r = find(f[0])
        for v in f[1:]: par[find(v)] = r
    return [find(f[0]) for f in g['faces']]


def fix(docs, inst):
    # 1. separate level overlaps: move the smaller piece out along the shared normal
    for _ in range(3):
        R = faces(docs, inst); comp = {gid: components(g) for gid, g in docs.items()}
        size = {gid: collections.Counter(c) for gid, c in comp.items()}
        want = {}
        for A, B, n, ar in pairs(R, SEP):
            a = (A[0], comp[A[0]][A[1]]); b = (B[0], comp[B[0]][B[1]])
            if a == b: continue
            late, base = (A, B) if size[A[0]][a[1]] < size[B[0]][b[1]] else (B, A)
            gap = late[3] - base[3]
            step = SEP - gap if gap >= -0.002 else -(SEP + gap)
            d = n * step * late[5]; k = (late[0], comp[late[0]][late[1]]); cur = want.get(k, np.zeros(3))
            want[k] = np.where(np.abs(d) > np.abs(cur), d, cur)
        if not want: break
        for (gid, c), d in want.items():
            g = docs[gid]; V = np.asarray(g['verts'], float).reshape(-1, 3)
            vs = {v for f, cc in zip(g['faces'], comp[gid]) if cc == c for v in f}
            for v in vs: V[v] += d
            g['verts'] = [round(float(x), 3) for x in V.ravel()]
        print(f'  separated {len(want)} pieces')
    # 2. cut hidden faces (same doc, or docs that share every instance)
    R = faces(docs, inst); per = collections.defaultdict(lambda: collections.defaultdict(list))
    for A, B, n, ar in pairs(R, CUT):
        if B[3] - A[3] < 0.0005 and (A[0], A[1]) > (B[0], B[1]): A, B = B, A     # level duplicates: one fixed winner
        s, p = inst[A[0]][A[6]]; S = np.asarray(s); F = (B[4] - p) * S          # the cover in the back doc's own frame
        if np.prod(S) < 0: F = F[::-1]
        per[(A[0], A[1])][A[6]].append(F)
    cover = {}
    for k, by in per.items():                    # a doc drawn several times (mirrored copies) is cut only where
        n_inst = len(inst[k[0]])                 # every copy has the same cover
        key = lambda F: tuple(sorted(tuple(np.round(q, 2)) for q in F))
        common = set(key(F) for F in by.get(0, []))
        for ii in range(1, n_inst): common &= set(key(F) for F in by.get(ii, []))
        fr = [F for F in by.get(0, []) if key(F) in common]
        if fr: cover[k] = fr
    cut = dropped = 0
    for k in cover: cover[k] = list({id(x): x for x in cover[k]}.values())
    for (gid, fi), fronts in cover.items():
        g = docs[gid]; V = np.asarray(g['verts'], float).reshape(-1, 3); f = g['faces'][fi]; P = V[f]
        uvs = g.get('uvs'); uv = None
        if uvs:
            uu = {(uvs[2 * v], uvs[2 * v + 1]) for v in f}
            if len(uu) != 1: continue                # a real texture mapping: leave it whole
            uv = uu.pop()
        n = np.zeros(3)
        for j in range(1, len(P) - 1): n += np.cross(P[j] - P[0], P[j + 1] - P[0])
        n /= np.linalg.norm(n); u = np.cross(n, [0, 1, 0] if abs(n[1]) < 0.9 else [1, 0, 0]); u /= np.linalg.norm(u); w = np.cross(n, u); o = P[0]
        to2 = lambda Q: [(float((q - o) @ u), float((q - o) @ w)) for q in Q]
        cur = [to2(P)]; a0 = area(cur[0])
        if a0 <= 0: continue
        lim = max(64, a0 / 1.0)                  # pieces a face may become (1 per m2): no sliver storms
        for fc in sorted((ccw(to2(F)) for F in fronts), key=lambda q: -abs(area(q))):   # big covers first
            nxt = [x for pc in cur for x in diff(pc, fc)]
            if len(nxt) > lim: break                  # shredding into slivers: stop here, small covers stay
            cur = nxt
            if not cur: break
        if len(cur) > lim and sum(abs(area(c)) for c in cur) < 0.3 * a0: cur = []
        new = []
        for pc in cur:
            idx = []
            for x, y in pc:
                q = o + x * u + y * w; idx.append(len(g['verts']) // 3); g['verts'] += [round(float(c), 3) for c in q]
                if uvs is not None: uvs += list(uv)
            new.append(idx)
        g['faces'][fi] = None; g['faces'] += new; cut += 1; dropped += not new
    for g in docs.values(): g['faces'] = [f for f in g['faces'] if f is not None]
    print(f'  cut {cut} hidden faces ({dropped} removed whole)')


if __name__ == '__main__':
    if '--prop' in sys.argv:   # hand-held prop seen from ~3 studs: 16-bit depth step there is ~2.3 mm (z^2 / (near * 65536), near 2% of orbit)
        sys.argv.remove('--prop'); SEP, CUT, AREA_FAIL = 0.004, 0.01, 0.02   # ~2 and ~4 depth steps
    if len(sys.argv) < 4 or sys.argv[1] not in ('check', 'fix'): print(__doc__); sys.exit(2)
    cmd, project, gdir = sys.argv[1:4]
    docs, inst, refs = load(project, gdir)
    if cmd == 'check': sys.exit(0 if check(docs, inst) else 1)
    if cmd == 'fix':
        out = sys.argv[4]; os.makedirs(out, exist_ok=True)
        moved = unshare(docs, inst, refs)
        if moved: print(f'  {len(moved)} mirrored objects get their own geo docs (project-patch.json)')
        for _ in range(3):
            fix(docs, inst)
            if check(docs, inst): break
        os.makedirs(os.path.join(out, 'geo'), exist_ok=True)
        patch = {}                                    # object key -> full object (geo repointed; extra parts added)
        for gid, g in docs.items():
            compact(g); parts = [g] if len(json.dumps(g)) <= 220_000 else chunks(g)
            for i, part in enumerate(parts):
                pid = gid if i == 0 else f'{gid}p{i}'
                json.dump(part, open(os.path.join(out, 'geo', pid + '.json'), 'w'), separators=(',', ':'))
                for k in refs[gid]:
                    o = dict(OBJS[k], geo=pid)
                    if i: o['name'] = f"{o.get('name', k)} +{i}"
                    patch[k if i == 0 else f'{k}p{i}'] = o
        json.dump({'objects': patch}, open(os.path.join(out, 'project-patch.json'), 'w'), separators=(',', ':'))
        print('wrote', len(docs), 'geo docs to', out, '(upload them under new ids: geometry is immutable)')
