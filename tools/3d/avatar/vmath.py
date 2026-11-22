"""Small 3D maths for the avatar rig, numpy only: Vector, Matrix (3x3 / 4x4) and Euler (XYZ or ZYX order).
Conventions: Euler order 'XYZ' = Rz @ Ry @ Rx (X applied first), 'ZYX' = Rx @ Ry @ Rz; matrices act on column vectors; a 4x4 acting
on a Vector treats it as a point (w = 1). to_euler returns the one of the two solutions with the smaller sum of angles."""
# @style: helper
import math
import numpy as np


class Vector(np.ndarray):
    def __new__(cls, data=(0.0, 0.0, 0.0)):
        return np.asarray(data, dtype=np.float64).view(cls)

    x = property(lambda s: float(s[0]), lambda s, v: s.__setitem__(0, v))
    y = property(lambda s: float(s[1]), lambda s, v: s.__setitem__(1, v))
    z = property(lambda s: float(s[2]), lambda s, v: s.__setitem__(2, v))
    length = property(lambda s: float(np.linalg.norm(s)))

    def normalized(self):
        n = self.length
        return Vector(np.asarray(self) / n) if n > 1e-12 else Vector(np.zeros_like(np.asarray(self)))

    def cross(self, o): return Vector(np.cross(np.asarray(self), np.asarray(o)))
    def dot(self, o): return float(np.dot(np.asarray(self), np.asarray(o)))

    def rotation_difference(self, o):
        """The rotation (as an object with to_matrix) that turns this direction onto `o`."""
        a, b = self.normalized(), Vector(o).normalized(); c = a.dot(b); ax = a.cross(b); s = ax.length
        if s < 1e-9:
            if c > 0: return _Rot(np.eye(3))
            p = a.cross(Vector((1, 0, 0)) if abs(a.x) < 0.9 else Vector((0, 1, 0))).normalized(); return _Rot(2 * np.outer(p, p) - np.eye(3))
        k = np.asarray(ax) / s; K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
        return _Rot(np.eye(3) + K * s + K @ K * (1 - c))


class _Rot:
    def __init__(self, m): self.m = np.asarray(m, float)
    def to_matrix(self): return Matrix(self.m)


class Matrix:
    def __init__(self, rows=None):
        self.m = np.eye(4) if rows is None else np.array([np.asarray(r, float) for r in rows], dtype=np.float64)

    @staticmethod
    def Identity(n=4): return Matrix(np.eye(n))

    @staticmethod
    def Translation(v):
        m = np.eye(4); m[:3, 3] = np.asarray(v, float); return Matrix(m)

    def __array__(self, dtype=None, copy=None): return self.m if dtype is None else self.m.astype(dtype)
    def __getitem__(self, i): return self.m[i]
    def __matmul__(self, o):
        if isinstance(o, Matrix): return Matrix(self.m @ o.m)
        v = np.asarray(o, float)
        if self.m.shape[0] == 4 and v.shape == (3,): return Vector((self.m @ np.append(v, 1.0))[:3])
        return Vector(self.m @ v)

    def transposed(self): return Matrix(self.m.T)
    def inverted(self): return Matrix(np.linalg.inv(self.m))
    def to_3x3(self): return Matrix(self.m[:3, :3].copy())
    def to_4x4(self):
        if self.m.shape == (4, 4): return Matrix(self.m.copy())
        o = np.eye(4); o[:3, :3] = self.m; return Matrix(o)
    def copy(self): return Matrix(self.m.copy())
    def normalized(self):
        n = np.linalg.norm(self.m, axis=0); n[n < 1e-12] = 1; return Matrix(self.m / n)     # unit columns
    translation = property(lambda s: Vector(s.m[:3, 3].copy()))

    def to_euler(self, order='XYZ'):
        R = self.m[:3, :3]
        if order == 'XYZ':                                    # R = Rz(c) Ry(b) Rx(a)
            cb = math.hypot(R[0, 0], R[1, 0])
            if cb > 1e-6:
                s1 = (math.atan2(R[2, 1], R[2, 2]), math.atan2(-R[2, 0], cb), math.atan2(R[1, 0], R[0, 0]))
                s2 = (math.atan2(-R[2, 1], -R[2, 2]), math.atan2(-R[2, 0], -cb), math.atan2(-R[1, 0], -R[0, 0]))
            else: s1 = s2 = (math.atan2(-R[1, 2], R[1, 1]), math.atan2(-R[2, 0], cb), 0.0)
            a, b, c = min(s1, s2, key=lambda t: sum(abs(v) for v in t)); return Euler((a, b, c), 'XYZ')
        cy = math.hypot(R[0, 0], R[0, 1])                      # 'ZYX': R = Rx(x) Ry(y) Rz(z)
        if cy > 1e-6:
            s1 = (math.atan2(-R[1, 2], R[2, 2]), math.atan2(R[0, 2], cy), math.atan2(-R[0, 1], R[0, 0]))
            s2 = (math.atan2(R[1, 2], -R[2, 2]), math.atan2(R[0, 2], -cy), math.atan2(R[0, 1], -R[0, 0]))
        else: s1 = s2 = (math.atan2(R[2, 1], R[1, 1]), math.atan2(R[0, 2], cy), 0.0)
        return Euler(min(s1, s2, key=lambda t: sum(abs(v) for v in t)), 'ZYX')


class Euler:
    def __init__(self, angles=(0.0, 0.0, 0.0), order='XYZ'):
        self.x, self.y, self.z = (float(v) for v in angles); self.order = order

    def to_matrix(self):
        def rot(ax, a):
            c, s = math.cos(a), math.sin(a)
            return np.array({'x': [[1, 0, 0], [0, c, -s], [0, s, c]], 'y': [[c, 0, s], [0, 1, 0], [-s, 0, c]], 'z': [[c, -s, 0], [s, c, 0], [0, 0, 1]]}[ax], float)
        X, Y, Z = rot('x', self.x), rot('y', self.y), rot('z', self.z)
        return Matrix(Z @ Y @ X if self.order == 'XYZ' else X @ Y @ Z)
