"""Forward kinematics over a studio tab (project.json + geo/): where every rig group, blade and body part is at clip time t,
sampled exactly like the studio (plugins/anim.js `sample`, three.js 'XYZ' Euler). Used by duel.py's choreography gate and solver.

  from fk import Tab;  T = Tab(project_json_path, geo_dir);  T.world('a_JHead', 3.6);  T.blade('a', 3.6) -> (base, tip)"""
# @style: helper
import json, math
import numpy as np

EASE = {'linear': lambda x: x, 'smooth': lambda x: (1 - math.cos(math.pi * x)) / 2, 'ease': lambda x: 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2,
        'in': lambda x: x ** 3, 'out': lambda x: 1 - (1 - x) ** 3, 'step': lambda x: 0.0}


def _bezier(x1, y1, x2, y2):
    B = lambda a, b, t: 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
    def f(x):
        t = x
        for _ in range(8):
            d = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t
            if abs(d) < 1e-6: break
            t = min(1, max(0, t - (B(x1, x2, t) - x) / d))
        return B(y1, y2, t)
    return f


def ease_fn(e):
    if e in EASE: return EASE[e]
    if isinstance(e, str) and e.startswith('cubic:'): return _bezier(*map(float, e[6:].split(',')))
    return EASE['linear']


def _quat(e):                                     # three.js 'XYZ' Euler degrees -> quaternion (x, y, z, w)
    x, y, z = [math.radians(v) / 2 for v in e]
    c1, c2, c3, s1, s2, s3 = math.cos(x), math.cos(y), math.cos(z), math.sin(x), math.sin(y), math.sin(z)
    return np.array([s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3])


def _slerp(a, b, u):
    d = float(np.dot(a, b))
    if d < 0: b, d = -b, -d
    if d > 0.9995: q = a + (b - a) * u; return q / np.linalg.norm(q)
    th = math.acos(d); return (math.sin((1 - u) * th) * a + math.sin(u * th) * b) / math.sin(th)


def _qmat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def sample(ks, t, ch=None):
    """The studio sampler (plugins/sample.js): per-segment ease ('auto' = Hermite through neighbours, 'cubic:...'), rot slerp unless a
    segment turns >= 180 deg on an axis (then Euler lerp). rot returns a 3x3 matrix when slerped (caller handles both)."""
    if t <= ks[0][0]: return ks[0][1]
    if t >= ks[-1][0]: return ks[-1][1]
    i = max(j for j in range(len(ks)) if ks[j][0] <= t); a, b = ks[i], ks[i + 1]; h = b[0] - a[0]; u = (t - a[0]) / h
    ea = a[2] if len(a) > 2 else 'linear'
    if ea == 'auto':
        k = lambda j: ks[max(0, min(len(ks) - 1, j))]
        def tan(j):
            p, q = k(j - 1), k(j + 1); dt = q[0] - p[0]
            return [(qv - pv) / dt if dt > 0 else 0 for pv, qv in zip(p[1], q[1])]
        m0, m1 = tan(i), tan(i + 1); u2, u3 = u * u, u ** 3
        return [(2 * u3 - 3 * u2 + 1) * x + (u3 - 2 * u2 + u) * h * m0[j] + (-2 * u3 + 3 * u2) * y + (u3 - u2) * h * m1[j] for j, (x, y) in enumerate(zip(a[1], b[1]))]
    e = ease_fn(ea)(u)
    if ch == 'rot' and 0 < e < 1 and all(abs(y - x) < 180 for x, y in zip(a[1], b[1])):
        return ('mat', _qmat(_slerp(_quat(a[1]), _quat(b[1]), e)))
    return [x + (y - x) * e for x, y in zip(a[1], b[1])]


def story(warp, t):
    return sample([[k[0], [k[1]], k[2] if len(k) > 2 else 'linear'] for k in warp], t)[0] if warp else t


def rot(e):
    x, y, z = [math.radians(v) for v in e]
    cx, sx, cy, sy, cz, sz = math.cos(x), math.sin(x), math.cos(y), math.sin(y), math.cos(z), math.sin(z)
    return np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]]) @ np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]) @ np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])


def segdist(p1, q1, p2, q2):
    """Closest distance between two segments and the midpoint of the closest pair (dense grid: robust for near-parallel blades)."""
    s = np.linspace(0, 1, 61)[:, None]; A = p1 + (q1 - p1) * s; B = p2 + (q2 - p2) * s
    d = np.linalg.norm(A[:, None, :] - B[None, :, :], axis=2); i, j = np.unravel_index(d.argmin(), d.shape)
    return float(d[i, j]), (A[i] + B[j]) / 2


def pdist(p, a, b):
    ab = b - a; s = np.clip(np.dot(p - a, ab) / max(np.dot(ab, ab), 1e-9), 0, 1); return float(np.linalg.norm(p - (a + ab * s)))


class Tab:
    def __init__(self, project, geo):
        D = json.load(open(project)) if isinstance(project, str) else project
        self.O, self.TR, self.geo, self._g = D['objects'], D['anims']['fight']['tracks'], geo, {}
        self.warp = D['anims']['fight'].get('warp')
        self.over = {}                                         # solver overrides: id -> fn(t, M) -> M

    def local(self, k, t):
        o = self.O[k]; tr = self.TR.get(k, {}); t = story(self.warp, t)
        p = sample(tr['pos'], t) if 'pos' in tr else o.get('pos', [0, 0, 0]); r = sample(tr['rot'], t, 'rot') if 'rot' in tr else o.get('rot', [0, 0, 0])
        s = sample(tr['scale'], t) if 'scale' in tr else [1, 1, 1]
        R = r[1] if isinstance(r, tuple) else rot(r)
        M = np.eye(4); M[:3, :3] = R * np.array(s); M[:3, 3] = p
        return self.over[k](t, M) if k in self.over else M

    def world(self, k, t):
        M = self.local(k, t); p = self.O[k].get('parent')
        return self.world(p, t) @ M if p else M

    def pos(self, k, t): return self.world(k, t)[:3, 3].copy()

    def verts(self, k, t):
        g = self.O[k]['geo']
        if g not in self._g: self._g[g] = np.array(json.load(open(f'{self.geo}/{g}.json'))['verts']).reshape(-1, 3)
        M = self.world(k, t); return (M[:3, :3] @ self._g[g].T).T + M[:3, 3]

    def blade(self, tag, t):
        """(base, tip) of a fighter's weapon: a beam flipbook (saber) runs `length` along local +X; a mesh blade (greatsword) is
        hand pivot -> its farthest steel vertex."""
        beam = next((k for k, o in self.O.items() if k.startswith(tag + '_') and o.get('shape') == 'beam' and o.get('parent')), None)
        if beam:
            M = self.world(beam, t); return M[:3, 3].copy(), (M @ [self.O[beam]['length'], 0, 0, 1])[:3]
        k = next(k for k, o in self.O.items() if k.startswith(tag + '_') and o.get('geo', '').endswith('greatsword-steel'))
        W = self.verts(k, t); h = self.pos(self.O[k]['parent'], t); return h, W[np.linalg.norm(W - h, axis=1).argmax()]

    def lowest(self, tag, t):
        return min(float(self.verts(k, t)[:, 1].min()) for k, o in self.O.items() if k.startswith(tag + '_') and o['type'] == 'mesh'
                   and not any(w in o.get('name', '') for w in ('Accessory', 'Hair', 'sword', 'Sword')))
