#!/usr/bin/env python3
"""See-through gate for Studio projects: fails when you can see INSIDE a model (hole, missing side/bottom).

  python seethru.py check project.json geo/ [--res 160] [--fail 0.003]

Orthographic rays from 14 directions (6 axis + 8 diagonals); a pixel whose first hit is a BACK face
(normal pointing away from the camera) is see-through. Fails when back/hit pixels >= --fail.
Same inputs as zfight.py check (rotated objects are skipped there too). Exit 0 pass, 1 fail, 2 bad args."""
# @style: tool
# @run: python seethru.py check project.json geo/
import collections, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import zfight


def world_tris(docs, inst):
    A, B, C, own = [], [], [], []
    for gid, g in docs.items():
        V = np.asarray(g['verts'], float).reshape(-1, 3)
        tri = [(f[0], f[k], f[k + 1]) for f in g.get('faces', []) for k in range(1, len(f) - 1)]
        if not tri: continue
        T = np.asarray(tri, int)
        for s, p in inst[gid]:
            W = V * np.asarray(s) + np.asarray(p)
            a, b, c = W[T[:, 0]], W[T[:, 1]], W[T[:, 2]]
            if np.prod(s) < 0: b, c = c, b
            A.append(a); B.append(b); C.append(c); own += [gid] * len(T)
    if not A: return None
    return np.vstack(A), np.vstack(B), np.vstack(C), np.asarray(own)


def dirs():
    out = [np.array(v, float) for v in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1))]
    for x in (1, -1):
        for y in (1, -1):
            for z in (1, -1): out.append(np.array([x, y, z]) / np.sqrt(3))
    return out


def view(A, B, C, D, res):
    h = np.array([0, 1, 0.]) if abs(D[1]) < 0.9 else np.array([1, 0, 0.])
    u = np.cross(D, h); u /= np.linalg.norm(u); v = np.cross(D, u)
    P = [np.stack([X @ u, X @ v, X @ D], 1) for X in (A, B, C)]
    pts = np.vstack(P)
    lo, hi = pts[:, :2].min(0), pts[:, :2].max(0)
    cs = max((hi - lo).max(), 1e-9) * 1.04 / res
    o = (lo + hi) / 2 - cs * res / 2
    a, b, c = P
    d = (b[:, 0] - a[:, 0]) * (c[:, 1] - a[:, 1]) - (b[:, 1] - a[:, 1]) * (c[:, 0] - a[:, 0])
    ok = np.abs(d) > 1e-12
    allu = np.stack([a[:, 0], b[:, 0], c[:, 0]], 1); allv = np.stack([a[:, 1], b[:, 1], c[:, 1]], 1)
    i0 = np.maximum(np.ceil((allu.min(1) - o[0]) / cs - 0.5), 0).astype(int)
    i1 = np.minimum(np.floor((allu.max(1) - o[0]) / cs - 0.5), res - 1).astype(int)
    j0 = np.maximum(np.ceil((allv.min(1) - o[1]) / cs - 0.5), 0).astype(int)
    j1 = np.minimum(np.floor((allv.max(1) - o[1]) / cs - 0.5), res - 1).astype(int)
    ok &= (i1 >= i0) & (j1 >= j0)
    res_pix, res_z, res_t = [], [], []

    def cand(t, i, j):
        px = o[0] + (i + 0.5) * cs; py = o[1] + (j + 0.5) * cs
        at, bt, ct, dt = a[t], b[t], c[t], d[t]
        w1 = ((px - at[:, 0]) * (ct[:, 1] - at[:, 1]) - (py - at[:, 1]) * (ct[:, 0] - at[:, 0])) / dt
        w2 = ((bt[:, 0] - at[:, 0]) * (py - at[:, 1]) - (bt[:, 1] - at[:, 1]) * (px - at[:, 0])) / dt
        w0 = 1 - w1 - w2
        m = (w0 >= -1e-9) & (w1 >= -1e-9) & (w2 >= -1e-9)
        z = w0 * at[:, 2] + w1 * bt[:, 2] + w2 * ct[:, 2]
        res_pix.append((j * res + i)[m]); res_z.append(z[m]); res_t.append(t[m])

    nx, ny = i1 - i0 + 1, j1 - j0 + 1
    small = ok & (nx <= 8) & (ny <= 8)
    for di in range(8):
        for dj in range(8):
            t = np.nonzero(small & (nx > di) & (ny > dj))[0]
            if len(t): cand(t, i0[t] + di, j0[t] + dj)
    for t in np.nonzero(ok & ~small)[0]:
        ii, jj = np.meshgrid(np.arange(i0[t], i1[t] + 1), np.arange(j0[t], j1[t] + 1))
        ii, jj = ii.ravel(), jj.ravel()
        cand(np.full(len(ii), t), ii, jj)
    if not res_pix: return np.array([], int)
    pix, z, t = np.concatenate(res_pix), np.concatenate(res_z), np.concatenate(res_t)
    order = np.lexsort((z, pix)); pix, t = pix[order], t[order]
    first = np.concatenate([[True], pix[1:] != pix[:-1]])
    return t[first]


def main(argv):
    if len(argv) < 4 or argv[1] != 'check': print(__doc__); return 2
    res, fail = 160, 0.003
    try:
        rest = argv[4:]
        while rest:
            if rest[0] == '--res': res = int(rest[1])
            elif rest[0] == '--fail': fail = float(rest[1])
            else: raise ValueError(rest[0])
            rest = rest[2:]
    except (ValueError, IndexError): print(__doc__); return 2
    docs, inst, _ = zfight.load(argv[2], argv[3])
    T = world_tris(docs, inst)
    if T is None: print('no mesh triangles'); return 2
    A, B, C, own = T
    N = np.cross(B - A, C - A)
    tot_hit = tot_back = 0; worst = collections.Counter()
    for D in dirs():
        t = view(A, B, C, D, res)
        back = t[(N[t] @ D) > 0]
        wc = collections.Counter(own[back])
        tot_hit += len(t); tot_back += len(back); worst.update(wc)
        w = wc.most_common(1)
        print('view', np.round(D, 2).tolist(), 'hits', len(t), 'back', len(back),
              '(%.2f%%)' % (100 * len(back) / max(len(t), 1)), 'worst', (f'{w[0][0]} x{w[0][1]}' if w else '-'))
    frac = tot_back / max(tot_hit, 1)
    if frac < fail:
        # upload gate (owner 2026-11-24: gaps must never ship): hooks/pre-tool.mjs denies live geo writes not listed here
        import tempfile
        with open(os.path.join(tempfile.gettempdir(), 'umbrio-seethru-pass.txt'), 'a') as fh:
            fh.write(''.join(os.path.splitext(n)[0] + '\n' for n in sorted(docs)))
        print('SEETHRU PASS %.2f%%' % (frac * 100)); return 0
    print('SEETHRU FAIL %.2f%% (need < %.2f%%) worst: %s' % (frac * 100, fail * 100,
          ' '.join(f'{g}:{n}' for g, n in worst.most_common(5)))); return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
