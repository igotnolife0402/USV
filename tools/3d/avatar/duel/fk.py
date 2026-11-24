"""Forward kinematics over a studio tab (project.json + geo/): where every rig group, blade and body part is at clip time t,
sampled exactly like the studio (plugins/anim.js `sample`, three.js 'XYZ' Euler). Used by duel.py's choreography gate and solver.

  from fk import Tab;  T = Tab(project_json_path, geo_dir);  T.world('a_JHead', 3.6);  T.blade('a', 3.6) -> (base, tip)"""
# @style: helper
import json, math
import numpy as np

EASE = {'linear': lambda x: x, 'smooth': lambda x: (1 - math.cos(math.pi * x)) / 2, 'ease': lambda x: 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2,
        'in': lambda x: x ** 3, 'out': lambda x: 1 - (1 - x) ** 3, 'step': lambda x: 0.0}


def sample(ks, t):
    if t <= ks[0][0]: return ks[0][1]
    if t >= ks[-1][0]: return ks[-1][1]
    i = max(j for j in range(len(ks)) if ks[j][0] <= t); a, b = ks[i], ks[i + 1]
    e = EASE.get(a[2] if len(a) > 2 else 'linear', EASE['linear'])((t - a[0]) / (b[0] - a[0]))
    return [x + (y - x) * e for x, y in zip(a[1], b[1])]


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
        self.over = {}                                         # solver overrides: id -> fn(t, M) -> M

    def local(self, k, t):
        o = self.O[k]; tr = self.TR.get(k, {})
        p = sample(tr['pos'], t) if 'pos' in tr else o.get('pos', [0, 0, 0]); r = sample(tr['rot'], t) if 'rot' in tr else o.get('rot', [0, 0, 0])
        s = sample(tr['scale'], t) if 'scale' in tr else [1, 1, 1]
        M = np.eye(4); M[:3, :3] = rot(r) * np.array(s); M[:3, 3] = p
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
