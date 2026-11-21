#!/usr/bin/env python3
"""Detailed cartoon 3D props for the studio (numpy only).

python3 props.py OUT <name|all> [--seed N] [--check] [--preview]
Writes OUT/geo/<geoId>.json per mesh and OUT/<name>.json per prop.
"""
import argparse
import json
import math
import os
import sys
import time
import zlib

import numpy as np

GEO_CAP = 225 * 1024  # studio doc limit (prompt cap 240 KB, guide 225 KB)
TRI_CAP = 12000
LOW_TRI_CAP = 3000  # owner: low-poly props well under the toon ones
FLAT_DEG = 20.0


# ---------------------------------------------------------------- mesh core
class Mesh:
    def __init__(self, verts, faces, uvs=None):
        self.v = np.asarray(verts, dtype=float).reshape(-1, 3)
        self.f = [list(map(int, f)) for f in faces]
        self.uv = None if uvs is None else np.asarray(uvs, float).reshape(-1, 2)

    def copy(self):
        return Mesh(self.v.copy(), [f[:] for f in self.f],
                    None if self.uv is None else self.uv.copy())

    def tris(self):
        return sum(len(f) - 2 for f in self.f)


def unit(a):
    a = np.asarray(a, float)
    n = np.linalg.norm(a, axis=-1, keepdims=True)
    return a / np.where(n < 1e-12, 1, n)


def rot(rx=0, ry=0, rz=0):
    """Rotation matrix, degrees, X applied first, then Y, then Z."""
    x, y, z = np.radians([rx, ry, rz])
    Rx = np.array([[1, 0, 0], [0, math.cos(x), -math.sin(x)], [0, math.sin(x), math.cos(x)]])
    Ry = np.array([[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]])
    Rz = np.array([[math.cos(z), -math.sin(z), 0], [math.sin(z), math.cos(z), 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def xf(m, t=(0, 0, 0), r=None, s=None):
    """Scale, then rotate (degrees XYZ), then translate. Returns a new mesh."""
    m = m.copy()
    v = m.v
    if s is not None:
        s = np.broadcast_to(np.asarray(s, float), (3,))
        v = v * s
        if np.prod(s) < 0:
            m.f = [f[::-1] for f in m.f]
    if r is not None:
        v = v @ rot(*r).T
    m.v = v + np.asarray(t, float)
    return m


def merge(*ms):
    vs, fs, off = [], [], 0
    uv = all(m.uv is not None for m in ms)
    for m in ms:
        vs.append(m.v)
        fs += [[i + off for i in f] for f in m.f]
        off += len(m.v)
    return Mesh(np.concatenate(vs), fs,
                np.concatenate([m.uv for m in ms]) if uv else None)


def volume(m):
    v, tot = m.v, 0.0
    for f in m.f:
        a = v[f[0]]
        for k in range(1, len(f) - 1):
            tot += np.dot(a, np.cross(v[f[k]], v[f[k + 1]]))
    return tot / 6


def orient(m):
    """Closed mesh: make faces counter-clockwise from outside."""
    if volume(m) < 0:
        m.f = [f[::-1] for f in m.f]
    return m


def grid_mesh(P, wrap_rows=False, pole0=None, pole1=None):
    """Rows j x columns i (columns wrap). Optional poles fan the end rows."""
    P = np.asarray(P, float)
    nj, ni, _ = P.shape
    j = np.arange(nj if wrap_rows else nj - 1)[:, None]
    i = np.arange(ni)[None, :]
    ix = lambda jj, ii: (jj % nj) * ni + (ii % ni)
    q = np.stack([ix(j, i), ix(j + 1, i), ix(j + 1, i + 1), ix(j, i + 1)], -1)
    faces = q.reshape(-1, 4).tolist()
    verts = [P.reshape(-1, 3)]
    k = nj * ni
    if pole0 is not None:
        verts.append(np.asarray(pole0, float)[None])
        faces += [[k, ix(0, a), ix(0, a + 1)] for a in range(ni)]
        k += 1
    if pole1 is not None:
        verts.append(np.asarray(pole1, float)[None])
        faces += [[ix(nj - 1, a), k, ix(nj - 1, a + 1)] for a in range(ni)]
    return Mesh(np.concatenate(verts), faces)


def dedupe(pts, closed=False, eps=2e-3):
    pts = np.asarray(pts, float)
    keep = [pts[0]]
    for p in pts[1:]:
        if np.linalg.norm(p - keep[-1]) > eps:
            keep.append(p)
    if closed and len(keep) > 2 and np.linalg.norm(keep[-1] - keep[0]) <= eps:
        keep.pop()
    return np.array(keep)


def fillet(pts, rad, n=4, closed=False):
    """Round every corner of a polyline with a quadratic arc of radius ~rad."""
    pts = np.asarray(pts, float)
    m = len(pts)
    rad = np.broadcast_to(np.asarray(rad, float), (m,))
    out = []
    for k in range(m):
        P = pts[k]
        if not closed and k in (0, m - 1) or rad[k] <= 0:
            out.append(P)
            continue
        A, B = pts[k - 1], pts[(k + 1) % m]
        ua, ub = A - P, B - P
        la, lb = np.linalg.norm(ua), np.linalg.norm(ub)
        fa = 1.0 if (not closed and k - 1 == 0) or rad[k - 1] <= 0 else 0.5
        fb = 1.0 if (not closed and k + 1 == m - 1) or rad[(k + 1) % m] <= 0 else 0.5
        d = min(rad[k], fa * la, fb * lb)
        ua, ub = ua / la, ub / lb
        if abs(ua[0] * ub[1] - ua[1] * ub[0]) < 1e-6 if len(P) == 2 else False:
            out.append(P)
            continue
        p0, p2 = P + ua * d, P + ub * d
        for t in np.linspace(0, 1, n + 1):
            out.append((1 - t) ** 2 * p0 + 2 * (1 - t) * t * P + t * t * p2)
    return dedupe(out, closed)


def lathe(profile, seg=32, closed=False, rmod=None):
    """Spin an (r, y) profile around +Y. Open profile: start at the bottom
    axis, go out, up and back in. Closed profile: counter-clockwise."""
    pr = np.asarray(profile, float)
    pole0 = pole1 = None
    if not closed and pr[0, 0] < 1e-6:
        pole0, pr = (0, pr[0, 1], 0), pr[1:]
    if not closed and pr[-1, 0] < 1e-6:
        pole1, pr = (0, pr[-1, 1], 0), pr[:-1]
    th = np.arange(seg) * 2 * math.pi / seg
    R = np.repeat(pr[:, :1], seg, 1)
    Y = np.repeat(pr[:, 1:2], seg, 1)
    if rmod is not None:
        R = rmod(th[None, :], Y, R)
    P = np.stack([R * np.cos(th), Y, R * np.sin(th)], -1)
    return orient(grid_mesh(P, closed, pole0, pole1))


def frames(path, closed=False, ref=None):
    p = np.asarray(path, float)
    if closed:
        T = unit(np.roll(p, -1, 0) - np.roll(p, 1, 0))
    else:
        T = unit(np.gradient(p, axis=0))
    N = np.zeros_like(T)
    if ref is not None:
        ref = np.asarray(ref, float)
        N = unit(ref - (T @ ref)[:, None] * T)
    else:
        a = np.array([0, 0, 1.0]) if abs(T[0, 2]) < 0.9 else np.array([1.0, 0, 0])
        N[0] = unit(a - T[0].dot(a) * T[0])
        for k in range(1, len(p)):
            n = N[k - 1] - T[k].dot(N[k - 1]) * T[k]
            N[k] = unit(n)
    return T, N, np.cross(N, T)


def sweep(path, rad, seg=16, closed=False, caps="round", ref=None,
          shape=None, cap_n=4):
    """Tube along a path. rad: scalar, (n,), (n,2) [rN, rB] or (n,seg)."""
    p = np.asarray(path, float)
    n = len(p)
    T, N, B = frames(p, closed, ref)
    th = np.arange(seg) * 2 * math.pi / seg
    sh = np.stack([np.cos(th), np.sin(th)], -1) if shape is None else np.asarray(shape, float)
    sh = np.broadcast_to(sh, (n,) + sh.shape[-2:])
    seg = sh.shape[-2]
    rad = np.asarray(rad, float)
    if rad.ndim == 0:
        rN = rB = np.full((n, 1), float(rad))
    elif rad.ndim == 1:
        rN = rB = rad[:, None]
    elif rad.shape[1] == 2:
        rN, rB = rad[:, :1], rad[:, 1:]
    else:
        rN = rB = rad
    a = sh[..., 0] * rN
    b = sh[..., 1] * rB
    P = p[:, None] + a[..., None] * N[:, None] + b[..., None] * B[:, None]
    pole0 = pole1 = None
    if not closed and caps == "round":
        r0 = float(np.mean(np.abs(np.stack([a[0], b[0]])))) * 1.3
        r1 = float(np.mean(np.abs(np.stack([a[-1], b[-1]])))) * 1.3
        pre, post = [], []
        for k in range(cap_n - 1, 0, -1):
            ph = k * math.pi / 2 / cap_n
            pre.append(p[0] - T[0] * r0 * math.sin(ph) + math.cos(ph) * (P[0] - p[0]))
        for k in range(1, cap_n):
            ph = k * math.pi / 2 / cap_n
            post.append(p[-1] + T[-1] * r1 * math.sin(ph) + math.cos(ph) * (P[-1] - p[-1]))
        P = np.concatenate([np.array(pre).reshape(-1, seg, 3), P,
                            np.array(post).reshape(-1, seg, 3)])
        pole0, pole1 = p[0] - T[0] * r0, p[-1] + T[-1] * r1
    elif not closed and caps == "flat":
        pole0, pole1 = P[0].mean(0), P[-1].mean(0)
    return orient(grid_mesh(P, closed, pole0, pole1))


def rbox(size, r, seg=3, div=(1, 1, 1)):
    """Box with every edge rounded to radius r (smooth, welded)."""
    h = np.asarray(size, float) / 2
    r = min(r, 0.999 * h.min())
    co = []
    for a in range(3):
        inner = np.linspace(-(h[a] - r), h[a] - r, div[a] + 1)
        if h[a] - r < 2e-3:
            inner = np.zeros(1)
        bev = (h[a] - r) + r * np.tan(np.arange(1, seg + 1) * math.pi / 4 / seg)
        co.append(np.concatenate([-bev[::-1], inner, bev]))
    pts, faces = [], []
    for a, u, v in ((0, 1, 2), (1, 2, 0), (2, 0, 1)):
        for s in (1, -1):
            uu, vv = (u, v) if s > 0 else (v, u)
            cu, cv = co[uu], co[vv]
            G = np.zeros((len(cu), len(cv), 3))
            G[..., a] = s * h[a]
            G[..., uu] = cu[:, None]
            G[..., vv] = cv[None, :]
            base = sum(len(x) for x in pts)
            pts.append(G.reshape(-1, 3))
            nv = len(cv)
            for i in range(len(cu) - 1):
                for j in range(nv - 1):
                    k = base + i * nv + j
                    faces.append([k, k + nv, k + nv + 1, k + 1])
    pts = np.concatenate(pts)
    key, inv = np.unique(np.round(pts, 7), axis=0, return_inverse=True)
    inv = inv.ravel()
    q = np.clip(key, -(h - r), h - r)
    v = q + r * unit(key - q)
    return orient(Mesh(v, [[int(inv[i]) for i in f] for f in faces]))


def rrect(hw, hh, rad, n=6):
    """Rounded-rectangle outline, CCW in XY. Returns points, outward normals."""
    pts, nrm = [], []
    for cx, cy, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        for a in np.radians(np.linspace(a0, a0 + 90, n + 1)):
            nrm.append((math.cos(a), math.sin(a)))
            pts.append((cx * (hw - rad) + rad * math.cos(a), cy * (hh - rad) + rad * math.sin(a)))
    return np.array(pts), np.array(nrm)


def slab(hw, hh, depth, rad, bevel, nb=3, n=6):
    """Rounded-rectangle board in XY, front face +Z, bevelled edges."""
    pts, nrm = rrect(hw, hh, rad, n)
    d = depth / 2
    prof = fillet([(-bevel, -d), (0, -d), (0, d), (-bevel, d)], bevel, nb)
    rows = [np.column_stack([pts + o * nrm, np.full(len(pts), z)]) for o, z in prof]
    P = np.array(rows)
    return orient(grid_mesh(P, False, P[0].mean(0), P[-1].mean(0)))


def outline3d(pts2, y=0.0):
    """XY outline -> horizontal XZ path at height y (front edge = +Z)."""
    return np.column_stack([pts2[:, 0], np.full(len(pts2), y), -pts2[:, 1]])


_ICO = {}


def icosphere(sub):
    if sub in _ICO:
        return _ICO[sub].copy()
    t = (1 + 5 ** 0.5) / 2
    v = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t),
         (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    f = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9),
         (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8), (3, 9, 4), (3, 4, 2),
         (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10),
         (8, 6, 7), (9, 8, 1)]
    v = [np.array(p) / np.linalg.norm(p) for p in v]
    for _ in range(sub):
        cache, nf = {}, []

        def mid(a, b):
            k = (a, b) if a < b else (b, a)
            if k not in cache:
                cache[k] = len(v)
                v.append(unit(v[a] + v[b]))
            return cache[k]
        for a, b, c in f:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
            nf += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
        f = nf
    m = orient(Mesh(np.array(v), f))
    _ICO[sub] = m
    return m.copy()


class Noise:
    """Smooth 3D value noise in [-1, 1] with fbm."""

    def __init__(self, rng):
        self.tab = rng.uniform(-1, 1, 4096)
        self.off = rng.uniform(0, 64, 3)

    def __call__(self, p):
        p = np.asarray(p, float) + self.off
        i = np.floor(p).astype(np.int64)
        f = p - i
        u = f * f * (3 - 2 * f)

        def h(dx, dy, dz):
            x, y, z = i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz
            return self.tab[((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & 4095]
        L = lambda a, b, t: a + (b - a) * t
        x0 = L(h(0, 0, 0), h(1, 0, 0), u[:, 0]), L(h(0, 1, 0), h(1, 1, 0), u[:, 0])
        x1 = L(h(0, 0, 1), h(1, 0, 1), u[:, 0]), L(h(0, 1, 1), h(1, 1, 1), u[:, 0])
        return L(L(x0[0], x0[1], u[:, 1]), L(x1[0], x1[1], u[:, 1]), u[:, 2])

    def fbm(self, p, octaves=4):
        p = np.asarray(p, float)
        tot, amp, norm = 0.0, 1.0, 0.0
        for o in range(octaves):
            tot = tot + amp * self(p * (2 ** o) + o * 17.3)
            norm += amp
            amp *= 0.5
        return tot / norm


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def facets(v, rng, k=7, depth=0.82, strength=0.85):
    """Cartoon-rock flats: push vertices beyond planes (around + top) onto them."""
    c = v.mean(0)
    az = (np.arange(k) + rng.uniform(-0.3, 0.3, k)) * 2 * math.pi / k
    el = np.radians(rng.uniform(-15, 50, k))
    ns = np.column_stack([np.cos(el) * np.cos(az), np.sin(el), np.cos(el) * np.sin(az)])
    top = math.radians(rng.uniform(72, 90))
    ta = rng.uniform(0, 2 * math.pi)
    ns = np.vstack([ns, [math.cos(top) * math.cos(ta), math.sin(top), math.cos(top) * math.sin(ta)]])
    for n in ns:
        d = (v - c) @ n
        cut = np.quantile(d, depth)
        over = np.maximum(d - cut, 0)
        v = v - strength * over[:, None] * n
    return v


def blob(rng, noise, center, radius, scale=(1, 1, 1), sub=3, lump=0.1,
         puffs=9, puff=0.16, width=0.82, flat=None):
    """Puffy cartoon blob (foliage, cloud, bush): lumps + round puffs."""
    m = icosphere(sub)
    n = m.v
    d = 1 + lump * noise.fbm(n * 1.7 + rng.uniform(0, 50, 3), 3)
    for dv in unit(rng.normal(size=(puffs, 3))):
        d = d + puff * rng.uniform(0.6, 1.0) * smoothstep(width, 1.0, n @ dv)
    v = n * d[:, None] * radius * np.asarray(scale, float)
    if flat is not None:
        lo = -flat * radius * scale[1]
        v[:, 1] = np.where(v[:, 1] < lo, lo + (v[:, 1] - lo) * 0.25, v[:, 1])
    m.v = v + np.asarray(center, float)
    return m


def box_uv(m, s=1.0):
    """Per-vertex uvs from the dominant axis plane (fine for noise/planks)."""
    v = m.v
    c = v - v.mean(0)
    ax = np.argmax(np.abs(unit(c)), 1)
    u = np.where(ax == 0, v[:, 2], v[:, 0])
    w = np.where(ax == 1, v[:, 2], v[:, 1])
    m.uv = np.column_stack([u, w]) * s
    return m


def part(pid, mesh, color, **kw):
    d = {"id": pid, "mesh": mesh, "color": color}
    d.update(kw)
    return d


METAL = dict(color="#C9CED6", metalness=0.7, roughness=0.3)


PROPS = {}


def prop(name, title):
    def deco(fn):
        PROPS[name] = (title, fn)
        return fn
    return deco


# ---------------------------------------------------------------- props
def cone_r(t):
    """Traffic cone body radius/height at t in [0,1] (slightly concave)."""
    y = 0.16 + t * (1.0 - 0.16)
    r = 0.265 + (0.068 - 0.265) * (1 - (1 - t) ** 1.3)
    return r, y


def band_profile(fn, t0, t1, proud=0.012, sink=0.01, n=5):
    """Closed (r, y) ring hugging the curve fn(t) between t0 and t1."""
    ts = np.linspace(t0, t1, n)
    pts = np.array([fn(t) for t in ts])
    d = np.gradient(pts, axis=0)
    nr = unit(np.column_stack([d[:, 1], -d[:, 0]]))
    outer = pts + nr * proud
    inner = (pts - nr * sink)[[-1, 0]]
    loop = np.concatenate([outer, inner])
    rad = np.zeros(len(loop))
    rad[[0, n - 1, n, n + 1]] = proud * 0.7
    return fillet(loop, rad, 2, closed=True)


@prop("traffic-cone", "Traffic cone")
def traffic_cone(rng):
    base = xf(slab(0.39, 0.39, 0.09, 0.12, 0.03, nb=3, n=6), t=(0, 0.045, 0), r=(-90, 0, 0))
    lp, _ = rrect(0.355, 0.355, 0.085, 6)
    lip = sweep(outline3d(lp, 0.09), np.full((len(lp), 2), (0.024, 0.02)), 10,
                closed=True, ref=(0, 1, 0))
    body = [(0, 0.08), (0.33, 0.08), (0.325, 0.115), (0.285, 0.14)]
    body += [cone_r(t) for t in np.linspace(0, 1, 16)]
    body += [(0.08, 1.07), (0.04, 1.07), (0.038, 1.02), (0, 1.02)]
    rad = np.full(len(body), 0.0)
    rad[[1, 2, 3]] = (0.02, 0.025, 0.03)
    rad[-4:-1] = (0.022, 0.018, 0.01)
    body = lathe(fillet(body, rad, 3), 48)
    bands = merge(lathe(band_profile(cone_r, 0.30, 0.45), 48, closed=True),
                  lathe(band_profile(cone_r, 0.58, 0.68), 48, closed=True))
    return [part("body", body, "#FF6A00", roughness=0.45),
            part("bands", bands, "#FFFFFF", roughness=0.25,
                 emissive="#FFFFFF", emissiveIntensity=0.12),
            part("base", merge(base, lip), "#E25500", roughness=0.55)], None



def torus_profile(R, r, n=16):
    v = np.arange(n) * 2 * math.pi / n
    return np.column_stack([R + r * np.cos(v), r * np.sin(v)])


def gauss_wrap(th, centers, w):
    d = (th[..., None] - np.asarray(centers)[None] + math.pi) % (2 * math.pi) - math.pi
    return np.exp(-(d / w) ** 2).sum(-1)


FACE_Z = (90, 0, 0)  # lathe axis +Y -> +Z (front)


@prop("steering-wheel", "Steering wheel")
def steering_wheel(rng):
    R0, r0 = 0.72, 0.085
    grips = -np.radians(15 + 30 * np.arange(12))

    def bumps(th, Y, R):
        inner = np.clip((R0 - R) / r0, 0, 1) ** 2
        return R - 0.03 * inner * gauss_wrap(th[0], grips, 0.075)[None]
    rim = xf(lathe(torus_profile(R0, r0, 14), 144, closed=True, rmod=bumps), r=FACE_Z)
    ph = np.radians(np.linspace(84, 96, 9))
    ramp = 1 + 0.08 * smoothstep(0, 0.35, 0.5 - np.abs(np.linspace(-0.5, 0.5, 9)))
    mark = sweep(np.column_stack([R0 * np.cos(ph), R0 * np.sin(ph), 0 * ph]),
                 r0 * ramp, 16, caps="flat")
    spokes = []
    for a, w0, w1 in ((0, 0.11, 0.07), (180, 0.11, 0.07), (270, 0.15, 0.09)):
        s = np.linspace(0, 1, 8)
        rr = 0.18 + s * 0.52
        d = np.array([math.cos(math.radians(a)), math.sin(math.radians(a))])
        path = np.column_stack([rr * d[0], rr * d[1], -0.05 * (1 - s) ** 2])
        rad = np.column_stack([np.full(8, 0.045), w0 + (w1 - w0) * s])
        spokes.append(sweep(path, rad, 16, ref=(0, 0, 1)))
    hub = [(0, -0.12), (0.25, -0.12), (0.27, -0.06), (0.27, 0.03), (0.22, 0.07), (0, 0.07)]
    hub = xf(lathe(fillet(hub, [0, 0.03, 0.03, 0.04, 0.03, 0], 3), 48), r=FACE_Z)
    disc = [(0, 0.06), (0.12, 0.06), (0.12, 0.095), (0, 0.095)]
    disc = xf(lathe(fillet(disc, [0, 0.012, 0.012, 0], 3), 40), r=FACE_Z)
    ring = xf(lathe(torus_profile(0.133, 0.014, 10), 40, closed=True), t=(0, 0, 0.078), r=FACE_Z)
    star = lambda th, Y, R: R * np.where(np.round(th / (math.pi / 5)) % 2 == 0, 1.0, 0.42)
    star = xf(lathe([(0, 0.09), (0.075, 0.09), (0.075, 0.108), (0, 0.112)], 10, rmod=star),
              r=(90, 0, -90 + 18))
    col = [(0, -0.62), (0.1, -0.62), (0.1, -0.26), (0.15, -0.2), (0.15, -0.1), (0, -0.1)]
    col = xf(lathe(fillet(col, [0, 0.02, 0.03, 0.03, 0.03, 0], 3), 32), r=FACE_Z)
    return [part("rim", rim, "#2B2F3A", roughness=0.7),
            part("mark", mark, "#F21D2B", roughness=0.5),
            part("spokes", merge(*spokes), **METAL),
            part("hub", hub, "#3A3F4B", roughness=0.6),
            part("logo", disc, "#F21D2B", roughness=0.3),
            part("ring", ring, **METAL),
            part("star", star, "#FFC83D", roughness=0.35, metalness=0.4, smooth=False),
            part("column", col, "#23262E", roughness=0.7)], None


def dial(x, needle_deg):
    """Gauge: white face, chrome ring, ticks, red needle, cap (local +Z)."""
    face = xf(lathe(fillet([(0, 0.04), (0.235, 0.04), (0.235, 0.085), (0, 0.085)],
                           [0, 0.012, 0.012, 0], 2), 32), r=FACE_Z)
    ring = xf(lathe(torus_profile(0.245, 0.035, 8), 32, closed=True), t=(0, 0, 0.085), r=FACE_Z)
    ticks = []
    for k, a in enumerate(np.radians(np.linspace(225, -45, 7))):
        d = np.array([math.cos(a), math.sin(a), 0])
        r0 = 0.15 if k % 3 == 0 else 0.17
        ticks.append(sweep([d * r0 + (0, 0, 0.088), d * 0.205 + (0, 0, 0.088)],
                           np.array([[0.008, 0.012]] * 2), 6, caps="flat", ref=(0, 0, 1)))
    a = math.radians(needle_deg)
    s = np.linspace(-0.03, 0.17, 6)
    needle = sweep(np.column_stack([s * math.cos(a), s * math.sin(a), np.full(6, 0.1)]),
                   np.column_stack([np.full(6, 0.008), np.linspace(0.016, 0.005, 6)]), 8,
                   ref=(0, 0, 1))
    cap = xf(lathe(fillet([(0, 0.09), (0.035, 0.09), (0.035, 0.11), (0, 0.118)],
                          [0, 0.008, 0.008, 0], 2), 20), r=FACE_Z)
    out = dict(face=face, ring=ring, ticks=merge(*ticks), needle=needle, cap=cap)
    return {k: xf(m, t=(x, 0, 0)) for k, m in out.items()}


def vent():
    """Round air vent facing +Z: chrome ring, dark cup, tilted slats, tab."""
    ring = xf(lathe(torus_profile(0.205, 0.04, 8), 32, closed=True), t=(0, 0, 0.03), r=FACE_Z)
    cup = [(0, -0.06), (0.2, -0.06), (0.2, 0.03), (0.17, 0.03), (0, -0.02)]
    cup = xf(lathe(fillet(cup, [0, 0.015, 0.012, 0.03, 0], 2), 28), r=FACE_Z)
    slats = [xf(rbox((2 * math.sqrt(0.185 ** 2 - y * y), 0.026, 0.075), 0.012, 1),
                t=(0, y, 0.0), r=(-25, 0, 0)) for y in (-0.105, -0.035, 0.035, 0.105)]
    tab = xf(rbox((0.06, 0.1, 0.05), 0.02, 1), t=(0, 0, 0.04))
    return dict(ring=ring, cup=cup, slats=merge(*slats), tab=tab)


@prop("dashboard", "Dashboard")
def dashboard(rng):
    HW, HY, HZ = 2.5, 0.6, 0.65
    fz = lambda x: HZ - 0.15 * (x / HW) ** 2
    shell = rbox((2 * HW, 2 * HY, 2 * HZ), 0.16, 3, (12, 3, 4))
    v = shell.v
    top = np.clip(v[:, 1] / HY, 0, 1) ** 2
    v[:, 1] += 0.08 * (1 - (v[:, 0] / HW) ** 2) * top + HY
    v[:, 2] += fz(v[:, 0]) - HZ
    bulge = lambda x: 0.08 * (1 - (x / HW) ** 2)
    xs = np.linspace(-2.42, 2.42, 17)
    lip = sweep(np.column_stack([xs, 2 * HY - 0.05 + bulge(xs), fz(xs) - 0.07]),
                np.column_stack([np.full(17, 0.07), np.full(17, 0.15)]), 12, ref=(0, 1, 0))

    def on(m, x, y, dz=0.0):
        return xf(m, r=(0, math.degrees(math.atan(0.3 * x / HW ** 2)), 0), t=(x, y, fz(x) + dz))
    pal = dict(dark="#16181E", shell="#3E4658", trim="#5A6680", slat="#596378")
    P = {k: [] for k in ("shell", "trim", "dark", "chrome", "white", "red", "slat", "screen", "ui")}
    P["shell"].append(shell)
    P["trim"].append(lip)
    # gauge cluster
    cx, cy = -1.0, 0.6
    P["dark"].append(on(slab(0.82, 0.33, 0.06, 0.2, 0.025), cx, cy, 0.0))
    hood = rbox((1.8, 0.13, 0.34), 0.06, 2, (8, 1, 1))
    hood.v[:, 1] -= 0.1 * (hood.v[:, 0] / 0.9) ** 4
    hood.v[:, 2] -= 0.08 * (hood.v[:, 0] / 0.9) ** 2
    P["trim"].append(on(hood, cx, cy + 0.37, 0.12))
    for x, a in ((-0.37, 150), (0.37, 70)):
        d = dial(x, a)
        P["white"].append(on(d["face"], cx + x, cy))
        P["chrome"] += [on(d["ring"], cx + x, cy), on(d["cap"], cx + x, cy)]
        P["dark"].append(on(d["ticks"], cx + x, cy))
        P["red"].append(on(d["needle"], cx + x, cy))
    # centre screen
    sx, sy = 0.5, 0.66
    P["dark"].append(on(slab(0.58, 0.34, 0.08, 0.08, 0.03), sx, sy, 0.03))
    P["screen"].append(on(slab(0.52, 0.28, 0.02, 0.05, 0.008), sx, sy, 0.075))
    for k, (w, y) in enumerate(((0.6, 0.12), (0.42, 0.0), (0.5, -0.12))):
        P["ui"].append(on(rbox((w, 0.06, 0.016), 0.008, 1), sx - 0.38 + w / 2, sy + y, 0.09))
    # air vents
    for x in (-2.1, 2.1):
        d = vent()
        P["chrome"] += [on(d["ring"], x, 0.72), on(d["tab"], x, 0.72)]
        P["dark"].append(on(d["cup"], x, 0.72))
        P["slat"].append(on(d["slats"], x, 0.72))
    # glovebox seam (inset strip) + handle
    gx, gy = 1.62, 0.3
    o, _ = rrect(0.6, 0.17, 0.1, 5)
    seam = np.column_stack([o[:, 0] + gx, o[:, 1] + gy, fz(o[:, 0] + gx) - 0.012])
    P["dark"].append(sweep(seam, 0.018, 8, closed=True, ref=(0, 0, 1)))
    P["chrome"].append(on(rbox((0.36, 0.06, 0.06), 0.025, 2), gx, gy + 0.08, 0.02))
    return [part("shell", merge(*P["shell"]), pal["shell"], roughness=0.75),
            part("trim", merge(*P["trim"]), pal["trim"], roughness=0.6),
            part("dark", merge(*P["dark"]), pal["dark"], roughness=0.5),
            part("chrome", merge(*P["chrome"]), **METAL),
            part("dials", merge(*P["white"]), "#F4F6FA", roughness=0.4),
            part("needles", merge(*P["red"]), "#F21D2B", roughness=0.4,
                 emissive="#F21D2B", emissiveIntensity=0.3),
            part("slats", merge(*P["slat"]), pal["slat"], roughness=0.6),
            part("screen", merge(*P["screen"]), "#3FB6FF", roughness=0.2,
                 emissive="#3FB6FF", emissiveIntensity=0.8),
            part("ui", merge(*P["ui"]), "#D9F6FF", roughness=0.2,
                 emissive="#D9F6FF", emissiveIntensity=0.9)], None


def ground(parts, y=0.0):
    """Shift all part meshes so the lowest point sits at y."""
    lo = min(p["mesh"].v[:, 1].min() for p in parts)
    for p in parts:
        p["mesh"].v[:, 1] += y - lo
    return parts


@prop("car-hood", "Car hood")
def car_hood(rng):
    HX, HZ = 2.0, 1.75
    hood = rbox((2 * HX, 0.3, 2 * HZ), 0.14, 3, (24, 1, 14))
    v = hood.v
    xn, zn = v[:, 0] / HX, v[:, 2] / HZ
    top = smoothstep(-0.05, 0.12, v[:, 1])

    def lift(xn, zn):
        y = 0.22 * (1 - xn ** 2) * (1 - 0.3 * zn ** 2) - 0.16 * ((zn + 1) / 2) ** 2
        return y - 0.1 * np.clip((np.abs(xn) - 0.82) / 0.18, 0, 1) ** 2
    brow = sum(np.exp(-((xn - c) / 0.2) ** 2) for c in (-0.65, 0.65)) * smoothstep(0.55, 0.98, zn)
    bulge = np.exp(-(xn / 0.3) ** 4) * smoothstep(1.0, 0.35, zn) * smoothstep(-1.02, -0.8, zn)
    v[:, 1] += lift(xn, zn) + top * (0.14 * bulge + 0.27 * brow)
    lights = {"cup": [], "ring": [], "lens": []}
    for sx in (-1, 1):
        x = sx * 1.3
        y = float(lift(np.array(x / HX), np.array(1.0))) + 0.02
        place = lambda m: xf(m, r=(0, sx * 8, 0), t=(x, y, HZ - 0.08))
        cup = [(0, -0.2), (0.34, -0.2), (0.36, 0.0), (0.34, 0.08), (0, 0.08)]
        lights["cup"].append(place(xf(lathe(fillet(cup, [0, 0.05, 0.06, 0.05, 0], 3), 40), r=FACE_Z)))
        lights["ring"].append(place(xf(lathe(torus_profile(0.3, 0.045, 10), 40, closed=True),
                                       t=(0, 0, 0.09), r=FACE_Z)))
        a = np.linspace(0, math.pi / 2, 9)
        lens = [(0, 0.06)] + [(0.28 * math.cos(t), 0.06 + 0.13 * math.sin(t)) for t in a]
        lens = np.array(lens)
        lens[0, 0], lens[1, 0] = 0, 0.28
        lights["lens"].append(place(xf(lathe(dedupe(lens), 40), r=FACE_Z)))
    badge = [(0, 0), (0.15, 0), (0.15, 0.03), (0, 0.045)]
    zb = HZ - 0.32
    yb = float(lift(np.array(0.0), np.array(zb / HZ))) + 0.15 + 0.14 * float(smoothstep(1.0, 0.35, zb / HZ))
    badge = xf(lathe(fillet(badge, [0, 0.015, 0.015, 0], 2), 28), s=(1, 1, 0.6), r=(14, 0, 0),
               t=(0, yb - 0.01, zb))
    parts = [part("panel", hood, "#2A7DFF", roughness=0.3, metalness=0.2),
             part("lamp-cups", merge(*lights["cup"]), "#2A7DFF", roughness=0.3, metalness=0.2),
             part("rings", merge(*(lights["ring"] + [badge])), **METAL),
             part("lenses", merge(*lights["lens"]), "#FFF6C9", roughness=0.15,
                  emissive="#FFF1A8", emissiveIntensity=0.6)]
    return ground(parts), None


def hex_bolt(r=0.05, h=0.04):
    """Hex bolt head on a washer, facing +Z (flat-shaded head)."""
    head = [(0, 0.008), (r, 0.008), (r, h * 0.6), (r * 0.72, h), (0, h * 1.05)]
    head = xf(lathe(head, 6), r=(90, 0, 0))
    washer = xf(lathe(fillet([(0, 0), (r * 1.35, 0), (r * 1.35, 0.012), (0, 0.012)],
                             [0, 0.005, 0.005, 0], 1), 20), r=FACE_Z)
    return head, washer


@prop("road-sign", "Road sign")
def road_sign(rng):
    Y, PZ, PR = 2.7, -0.14, 0.085
    board = xf(slab(1.3, 0.45, 0.08, 0.2, 0.03, 3, 8), t=(0, Y, 0))
    o, _ = rrect(1.21, 0.36, 0.11, 8)
    rim = sweep(np.column_stack([o[:, 0], o[:, 1] + Y, np.full(len(o), 0.04)]),
                np.full((len(o), 2), (0.032, 0.045)), 10, closed=True, ref=(0, 0, 1))
    post = [(0, 0), (PR, 0), (PR, 3.02), (0.05, 3.08), (0, 3.09)]
    post = xf(lathe(fillet(post, [0, 0.01, 0.04, 0.03, 0], 3), 24), t=(0, 0, PZ))
    band = [(PR - 0.01, -0.08), (PR + 0.03, -0.08), (PR + 0.03, 0.08), (PR - 0.01, 0.08)]
    bands = [xf(lathe(fillet(band, 0.018, 2, closed=True), 24, closed=True), t=(0, y, PZ))
             for y in (Y - 0.22, Y + 0.22)]
    plate = xf(rbox((0.2, 0.62, 0.07), 0.025, 2), t=(0, Y, -0.065))
    heads, washers = [], []
    for y in (Y - 0.22, Y + 0.22):
        h, w = hex_bolt()
        heads.append(xf(h, t=(0, y, 0.04), r=(0, 0, 0)))
        washers.append(xf(w, t=(0, y, 0.04)))
    return [part("board", board, "#F21D2B", roughness=0.4),
            part("rim", rim, "#FFFFFF", roughness=0.3),
            part("post", merge(post, *bands, plate, *washers), **METAL),
            part("bolts", merge(*heads), smooth=False, **METAL)], None


ROCK = ("#D99A5E", "#C4854D")


def rock_tex(key="rock", scale=3):
    return {key: {"kind": "procedural", "pattern": "noise", "colors": list(ROCK), "scale": scale}}


def cubeish(n, p=0.55):
    """Push unit-sphere points toward a rounded cube (chunky boulders)."""
    return np.sign(n) * np.abs(n) ** p


def boulder(rng, noise, sub, scale, cube=0.0, rough=0.15, cuts=8, depth=0.8):
    m = icosphere(sub)
    n = m.v
    base = unit(cubeish(n, 1 - cube)) * np.linalg.norm(cubeish(n, 1 - cube), axis=1, keepdims=True)
    d = 1 + rough * noise.fbm(n * 1.4 + rng.uniform(0, 40, 3), 4)
    v = base * d[:, None]
    v = facets(v, rng, k=cuts, depth=depth, strength=0.8)
    lo, hi = v.min(0), v.max(0)
    m.v = ((v - (lo + hi) / 2) * 2 / (hi - lo)) * np.asarray(scale, float)
    return m


def rock_prop(rng, scale, color):
    noise = Noise(rng)
    m = boulder(rng, noise, 4, scale, cube=0.2, rough=0.1, cuts=7, depth=0.86)
    v = m.v
    floor = v[:, 1].min() + 0.18 * (v[:, 1].max() - v[:, 1].min())
    v[:, 1] = np.where(v[:, 1] < floor, floor + (v[:, 1] - floor) * 0.12, v[:, 1])
    m.v = xf(m, r=(0, rng.uniform(0, 360), 0)).v
    box_uv(m, 0.5)
    return ground([part("stone", m, color, roughness=0.85, texture="rock")]), rock_tex()


@prop("rock-1", "Rock 1")
def rock1(rng):
    return rock_prop(rng, (1.0, 0.72, 0.85), ROCK[0])


@prop("rock-2", "Rock 2")
def rock2(rng):
    return rock_prop(rng, (0.78, 1.0, 0.75), ROCK[1])


@prop("rock-3", "Rock 3")
def rock3(rng):
    return rock_prop(rng, (1.15, 0.5, 0.95), "#CF9055")


@prop("cliff", "Cliff")
def cliff(rng):
    noise = Noise(rng)
    chunks, y, rxz = [[], []], 0.0, 6.0
    for k in range(6):
        h = rng.uniform(7.2, 8.2)
        rxz = 5.3 * (1 - 0.035 * k) * rng.uniform(0.95, 1.04)
        m = boulder(rng, noise, 3, (rxz, h * 0.62, rxz * rng.uniform(0.85, 1.0)),
                    cube=0.7, rough=0.08, cuts=7, depth=0.86)
        m = xf(m, r=(rng.uniform(-4, 4), rng.uniform(0, 360), rng.uniform(-4, 4)),
               t=(rng.uniform(-0.4, 0.4), y + h * 0.5, rng.uniform(-0.4, 0.4)))
        chunks[k % 2].append(m)
        last = m
        a = rng.uniform(0, 2 * math.pi)
        rs = rxz * rng.uniform(0.5, 0.6)
        side = boulder(rng, noise, 2, (rs, rs * rng.uniform(0.8, 1.1), rs), cube=0.4,
                       rough=0.08, cuts=6, depth=0.8)
        side = xf(side, r=(0, rng.uniform(0, 360), 0),
                  t=(math.cos(a) * rxz * 0.62, y + h * rng.uniform(0.3, 0.7), math.sin(a) * rxz * 0.62))
        chunks[(k + 1) % 2].append(side)
        y += h * 0.76
    top, cx, cz = last.v[:, 1].max(), last.v[:, 0].mean(), last.v[:, 2].mean()
    g = icosphere(3)
    n = g.v
    th = np.arctan2(n[:, 2], n[:, 0])
    c = cubeish(n, 0.7)
    v = c * (rxz * 1.14, 1.1, rxz * 1.14)
    v[:, 1] += 0.35 * noise.fbm(n * 2.2 + 9, 3) * smoothstep(-0.2, 0.6, n[:, 1])
    lobes = (0.5 + 0.5 * np.cos(9 * th + 2.5 * noise(n * 1.5 + 30))) ** 3
    v[:, 1] -= (2.4 * lobes + 0.4) * smoothstep(0.25, -0.5, n[:, 1])
    g.v = v + (cx, top - 0.3, cz)
    a, b = merge(*chunks[0]), merge(*chunks[1])
    box_uv(a, 0.15), box_uv(b, 0.15)
    return [part("rock-a", a, ROCK[0], roughness=0.85, texture="rock"),
            part("rock-b", b, ROCK[1], roughness=0.85, texture="rock"),
            part("grass", g, "#5ED13E", roughness=0.8)], rock_tex(scale=0.6)


GREENS = ("#3FC24A", "#2FA83A")


def blobs(rng, specs, sub=3, **kw):
    """specs: [(center, radius, scale)] -> two merged meshes (alternate greens)."""
    noise = Noise(rng)
    out = [[], []]
    for k, (c, r, sc) in enumerate(specs):
        out[k % 2].append(blob(rng, noise, c, r, sc, sub, **kw))
    return [merge(*o) for o in out if o]


def flat_bottom(m, y, keep=0.2):
    m.v[:, 1] = np.where(m.v[:, 1] < y, y + (m.v[:, 1] - y) * keep, m.v[:, 1])
    return m


@prop("tree", "Tree")
def tree(rng):
    H, n, seg = 3.1, 16, 24
    s = np.linspace(0, 1, n)
    bend = rng.uniform(0.18, 0.3) * rng.choice([-1, 1])
    path = np.column_stack([bend * np.sin(s * math.pi * 0.8), s * H - 0.05, 0.08 * np.sin(s * math.pi)])
    th = np.arange(seg) * 2 * math.pi / seg
    r = 0.36 * (1 - 0.35 * s) + 0.26 * np.exp(-s / 0.08)
    roots = 0.4 * np.exp(-s / 0.1)[:, None] * np.maximum(0, np.cos(5 * th + rng.uniform(0, 6)))[None] ** 1.2
    bark = 0.035 * np.cos(11 * th[None] + 2.5 * s[:, None])
    trunk = sweep(path, r[:, None] * (1 + roots + bark), seg, caps="flat")
    top = path[-1]
    branches = []
    for k, (t, a) in enumerate(((0.62, 30), (0.78, 200))):
        p0 = path[int(t * (n - 1))]
        d = np.array([math.cos(math.radians(a)), 0, math.sin(math.radians(a))])
        u = np.linspace(0, 1, 7)[:, None]
        bp = p0 + d * (u * 1.1) + np.array([0, 1, 0]) * (u * 0.9 + 0.2 * u * u)
        branches.append(sweep(bp, np.linspace(0.12, 0.05, 7), 12))
    c = top + (0, 0.9, 0)
    specs = [(c, 1.7, (1, 0.85, 1)),
             (c + (1.25, -0.55, 0.35), 1.25, (1, 0.9, 1)),
             (c + (-1.2, -0.45, -0.35), 1.3, (1, 0.9, 1)),
             (c + (0.15, 1.0, -0.25), 1.15, (1, 0.9, 1)),
             (c + (0.1, -0.35, 1.15), 1.1, (1, 0.9, 1))]
    fa, fb = blobs(rng, specs, lump=0.08, puffs=10, puff=0.14)
    return [part("trunk", merge(trunk, *branches), "#9A5F30", roughness=0.85),
            part("leaves-a", fa, GREENS[0], roughness=0.75),
            part("leaves-b", fb, GREENS[1], roughness=0.75)], None


@prop("bush", "Bush")
def bush(rng):
    specs = [((0, 0.75, 0), 0.9, (1, 0.85, 1)), ((-0.85, 0.55, 0.15), 0.7, (1, 0.9, 1)),
             ((0.88, 0.55, -0.1), 0.72, (1, 0.9, 1)), ((0.1, 0.5, 0.78), 0.62, (1, 0.9, 1)),
             ((-0.2, 0.55, -0.72), 0.66, (1, 0.9, 1))]
    fa, fb = blobs(rng, specs, lump=0.08, puffs=8, puff=0.16)
    return ground([part("leaves-a", flat_bottom(fa, 0.12), GREENS[0], roughness=0.75),
                   part("leaves-b", flat_bottom(fb, 0.12), GREENS[1], roughness=0.75)]), None


@prop("cloud", "Cloud")
def cloud(rng):
    noise = Noise(rng)
    specs = [((0, 1.2, 0), 1.6), ((-1.75, 0.8, 0.1), 1.2), ((1.85, 0.85, -0.1), 1.25),
             ((-0.75, 1.95, -0.2), 1.1), ((0.85, 1.85, 0.2), 1.15), ((0.2, 1.0, -0.95), 1.1),
             ((3.0, 0.55, 0.15), 0.8)]
    ms = [flat_bottom(blob(rng, noise, c, r, (1, 0.9, 1), 3, lump=0.05, puffs=6, puff=0.12),
                      0.25, 0.15) for c, r in specs]
    return ground([part("puffs", merge(*ms[:4]), "#FFFFFF", roughness=0.9,
                        emissive="#FFFFFF", emissiveIntensity=0.15),
                   part("puffs-back", merge(*ms[4:]), "#EEF4FF", roughness=0.9,
                        emissive="#EEF4FF", emissiveIntensity=0.1)]), None


def frond(base, az, L=3.2, W=0.42, rng=None):
    u = np.linspace(0, 1, 16)
    d = np.array([math.cos(az), 0, math.sin(az)])
    droop = rng.uniform(1.7, 2.2)
    path = base + d[None] * (L * u)[:, None] + np.array([0, 1, 0]) * (0.75 * u - droop * u * u)[:, None]
    w = W * (0.12 + 0.88 * np.sin(math.pi * u) ** 0.6) * (0.78 + 0.22 * np.abs(np.sin(math.pi * 6 * u)))
    b = np.linspace(-1, 1, 7)
    a = -0.35 * np.abs(b)
    top = np.column_stack([a + 0.07, b])
    bot = np.column_stack([a - 0.07, b])[::-1][1:-1]
    return sweep(path, w, closed=False, ref=(0, 1, 0), shape=np.vstack([top, bot]), cap_n=3)


@prop("palm-tree", "Palm tree")
def palm_tree(rng):
    n, seg, H = 64, 16, 6.4
    s = np.linspace(0, 1, n)
    path = np.column_stack([1.1 * s ** 2, s * H - 0.05, 0.15 * s ** 2])
    frac = (s * 11) % 1
    r = 0.27 * (1 - 0.3 * s) * (1 + 0.13 * frac ** 3) + 0.22 * np.exp(-s / 0.04)
    trunk = sweep(path, r, seg, caps="flat")
    top = path[-1] + (0, 0.1, 0)
    fr = [[], []]
    for k in range(6):
        az = k * math.pi / 3 + rng.uniform(-0.2, 0.2)
        fr[k % 2].append(frond(top, az, rng.uniform(2.9, 3.4), 0.56, rng))
    noise = Noise(rng)
    crown = blob(rng, noise, top + (0, -0.05, 0), 0.42, (1, 0.8, 1), 3, lump=0.05, puffs=5, puff=0.1)
    nuts = [xf(icosphere(2), s=0.21, t=top + (0.3 * math.cos(a), -0.38, 0.3 * math.sin(a)))
            for a in np.radians([20, 140, 260])]
    return [part("trunk", trunk, "#B9773E", roughness=0.85),
            part("fronds-a", merge(*fr[0]), GREENS[0], roughness=0.7),
            part("fronds-b", merge(*fr[1]), GREENS[1], roughness=0.7),
            part("crown", crown, "#2FA83A", roughness=0.8),
            part("coconuts", merge(*nuts), "#6B4423", roughness=0.7)], None


WOOD = ("#B9773E", "#A0632F")


def wood_tex(scale=2):
    return {"wood": {"kind": "procedural", "pattern": "planks", "colors": list(WOOD), "scale": scale}}


def nail(p, n):
    """Round nail head at p facing unit axis n."""
    m = lathe(fillet([(0, -0.01), (0.032, -0.01), (0.032, 0.008), (0, 0.022)], [0, 0, 0.012, 0], 2), 8)
    a = np.asarray(n, float)
    if abs(a[1]) > 0.9:
        m = xf(m, s=(1, np.sign(a[1]), 1))
    else:
        m = xf(m, r=(90, 0, 0))
        m = xf(m, r=(0, math.degrees(math.atan2(a[0], a[2])), 0))
    return xf(m, t=p)


@prop("crate", "Crate")
def crate(rng):
    S, F, G = 1.5, 0.16, 0.035
    h, e = S / 2, S / 2 - F / 2
    frame = []
    for a in range(3):
        for s1 in (-1, 1):
            for s2 in (-1, 1):
                size = [F, F, F]
                size[a] = S if a == 0 else S - 2 * F + 0.02
                pos = [0, 0, 0]
                o = [b for b in range(3) if b != a]
                pos[o[0]], pos[o[1]] = s1 * e, s2 * e
                frame.append(xf(rbox(size, 0.035, 2), t=pos))
    span = S - 2 * F
    pw = (span - 2 * G) / 3
    planks, nails = [], []
    for ax in range(3):
        for sg in (-1, 1):
            along = 0 if ax != 0 else 2
            across = [b for b in range(3) if b not in (ax, along)][0]
            for k in range(3):
                size, pos = [0, 0, 0], [0, 0, 0]
                size[ax], size[along], size[across] = 0.06, span + 0.04, pw
                pos[ax] = sg * (h - 0.05)
                pos[across] = -span / 2 + pw / 2 + k * (pw + G)
                planks.append(xf(rbox(size, 0.022, 2), t=pos))
                for t in (-0.42, 0.42):
                    q = list(pos)
                    q[ax] = sg * (h - 0.02)
                    q[along] = t
                    nv = [0, 0, 0]
                    nv[ax] = sg
                    nails.append(nail(q, nv))
    core = rbox((S - 0.14,) * 3, 0.05, 1)
    frame, planks = merge(*frame), merge(*planks)
    box_uv(frame, 0.6), box_uv(planks, 0.6)
    parts = [part("planks", planks, WOOD[0], roughness=0.8, texture="wood"),
             part("frame", frame, "#9E5F2C", roughness=0.8, texture="wood"),
             part("core", core, "#5A3A1E", roughness=0.9),
             part("nails", merge(*nails), "#8A9099", metalness=0.7, roughness=0.35)]
    return ground(parts), wood_tex()


@prop("barrel", "Barrel")
def barrel(rng):
    H, RM, RE, NS = 1.6, 0.62, 0.5, 16
    ry = lambda y: RE + (RM - RE) * (1 - ((y - H / 2) / (H / 2)) ** 2)
    side = [(ry(y), y) for y in np.linspace(0, H, 15)]
    prof = [(0, 0.07), (RE - 0.035, 0.07), (RE - 0.035, -0.0)] + side + \
           [(RE - 0.035, H), (RE - 0.035, H - 0.07), (0, H - 0.07)]
    rad = np.zeros(len(prof))
    rad[[1, 2, -3, -2]] = 0.012
    prof = fillet(prof, rad, 2)

    def staves(th, Y, R):
        on = (R > RE - 0.02) & (Y > 0.005) & (Y < H - 0.005)
        x = (th * NS / (2 * math.pi)) % 1
        gro = np.exp(-((np.minimum(x, 1 - x)) / 0.07) ** 2)
        return R * (1 + on * (0.012 * np.sin(math.pi * x) - 0.03 * gro))
    body = lathe(prof, NS * 6, rmod=staves)
    box_uv(body, 0.8)
    hoops, rivets = [], []
    for y in (0.3, H - 0.3):
        r = ry(y)
        hp = [(r - 0.015, y - 0.055), (r + 0.03, y - 0.055), (r + 0.03, y + 0.055), (r - 0.015, y + 0.055)]
        hoops.append(lathe(fillet(hp, 0.014, 2, closed=True), 64, closed=True))
        for a in np.arange(6) * math.pi / 3 + 0.26:
            d = np.array([math.cos(a), 0, math.sin(a)])
            m = xf(lathe([(0, 0), (0.022, 0), (0.022, 0.006), (0, 0.02)], 8), r=(90, 0, 0))
            rivets.append(xf(m, r=(0, math.degrees(math.atan2(d[0], d[2])), 0), t=d * (r + 0.028) + (0, y, 0)))
    bung = xf(lathe(fillet([(0, 0), (0.07, 0), (0.07, 0.03), (0, 0.035)], [0, 0, 0.012, 0], 2), 16),
              r=(90, 0, 0), t=(0, H / 2, RM - 0.012))
    return [part("staves", body, WOOD[0], roughness=0.8, texture="wood"),
            part("hoops", merge(*hoops, *rivets), "#6E7682", metalness=0.7, roughness=0.35),
            part("bung", bung, "#7A4A22", roughness=0.8)], wood_tex(3)


# ---------------------------------------------------------------- low-poly style
# Roblox look: few segments, flat-shaded facets (vertices split per facet),
# small crisp chamfers, chunky plane-cut polyhedra, natural colours, textures.
LOW = {}


def low(name):
    def deco(fn):
        LOW[name] = fn
        return fn
    return deco


def face_normals(v, faces):
    """Newell normals (unit) for polygons."""
    out = np.zeros((len(faces), 3))
    for i, f in enumerate(faces):
        p = v[f]
        q = np.roll(p, -1, 0)
        out[i] = (((p[:, 1] - q[:, 1]) * (p[:, 2] + q[:, 2])).sum(),
                  ((p[:, 2] - q[:, 2]) * (p[:, 0] + q[:, 0])).sum(),
                  ((p[:, 0] - q[:, 0]) * (p[:, 1] + q[:, 1])).sum())
    return out


def flat(m, deg=9.9):
    """Per-face normals: drop collapsed faces, split every vertex whose facets
    differ by more than deg from the facet that claimed it (pairwise < 2*deg)."""
    vr = np.round(m.v, 3)
    faces, lim2 = [], math.cos(math.radians(2))
    for f in m.f:
        if len(set(f)) != len(f):
            continue
        if len(f) > 3:
            p = vr[f]
            ns = np.cross(p[1:-1] - p[0], p[2:] - p[0])
            ns = unit(ns[np.linalg.norm(ns, axis=1) > 1e-9])
            if len(ns) > 1 and (ns @ ns.T).min() < lim2:
                faces += [[f[0], f[k], f[k + 1]] for k in range(1, len(f) - 1)]
                continue
        faces.append(f)
    raw = face_normals(vr, faces)
    ok = np.linalg.norm(raw, axis=1) > 2e-6
    faces = [f for f, k in zip(faces, ok) if k]
    fn = unit(raw[ok])
    lim = math.cos(math.radians(deg))
    seen, nv, nuv, nf = {}, [], [], []
    for f, n in zip(faces, fn):
        g = []
        for vi in f:
            for cn, ni in seen.setdefault(vi, []):
                if cn @ n >= lim:
                    g.append(ni)
                    break
            else:
                seen[vi].append((n, len(nv)))
                g.append(len(nv))
                nv.append(m.v[vi])
                if m.uv is not None:
                    nuv.append(m.uv[vi])
        nf.append(g)
    return Mesh(np.array(nv), nf, np.array(nuv) if m.uv is not None else None)


def face_uv(m, s=1.0):
    """Box-projected uvs per facet (flat meshes: no stretch across facets)."""
    fn = unit(face_normals(np.round(m.v, 3), m.f))
    vn = np.zeros_like(m.v)
    for f, n in zip(m.f, fn):
        vn[f] += n
    ax = np.argmax(np.abs(vn), 1)
    v = m.v
    m.uv = np.column_stack([np.where(ax == 0, v[:, 2], v[:, 0]),
                            np.where(ax == 1, v[:, 2], v[:, 1])]) * s
    return m


LPTEX = {
    "wood": ("woodgrain", ["#B5824F", "#946538"], 2),
    "bark": ("woodgrain", ["#7B5434", "#5F3F25"], 2),
    "rock": ("rock", ["#B08D6A", "#8C6F52"], 2),
    "metal": ("brushed", ["#BFC4CA", "#9EA4AB"], 3),
    "grass": ("grass", ["#6CB547", "#559A36"], 2),
    "palm": ("woodgrain", ["#A57A4E", "#86603B"], 2),
    "grip": ("grip", ["#303135", "#232427"], 6),
    "carbon": ("carbon", ["#4A4F58", "#363A41"], 6),
}


def lptex(*keys):
    return {k: {"kind": "procedural", "pattern": LPTEX[k][0], "colors": list(LPTEX[k][1]),
                "scale": LPTEX[k][2]} for k in keys}


def lpart(pid, mesh, color, tex=None, uv=1.0, **kw):
    """Low-poly part: flat shaded, split per facet, optional textured uvs."""
    m = flat(mesh)
    d = part(pid, m, color, smooth=False, **kw)
    if tex:
        face_uv(m, uv)
        d["texture"] = tex
    return d


LPMETAL = dict(color="#B4BAC1", metalness=0.7, roughness=0.35)


def ccw(idx, P, n):
    """Order a convex face's vertex ids counter-clockwise around normal n."""
    c = P[idx].mean(0)
    e1 = unit(np.cross(n, [0.0, 1.0, 0.0]) if abs(n[1]) < 0.9 else np.cross(n, [1.0, 0, 0]))
    e2 = np.cross(n, e1)
    d = P[idx] - c
    return [idx[k] for k in np.argsort(np.arctan2(d @ e2, d @ e1))]


def cbox(size, r=0.04):
    """Box with small crisp chamfers on every edge: 6 faces, 12 strips, 8 corners (44 tris)."""
    h = np.asarray(size, float) / 2
    r = min(r, 0.45 * h.min())
    ids, P = {}, []

    def vid(s, a):
        if (s, a) not in ids:
            p = [s[i] * (h[i] - r) for i in range(3)]
            p[a] = s[a] * h[a]
            ids[(s, a)] = len(P)
            P.append(p)
        return ids[(s, a)]
    C = [(x, y, z) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    groups = []
    for a in range(3):
        for sa in (-1, 1):
            groups.append([vid(c, a) for c in C if c[a] == sa])
        b, c2 = [i for i in range(3) if i != a]
        for sb in (-1, 1):
            for sc in (-1, 1):
                g = []
                for sa in (-1, 1):
                    s = [0, 0, 0]
                    s[a], s[b], s[c2] = sa, sb, sc
                    g += [vid(tuple(s), b), vid(tuple(s), c2)]
                groups.append(g)
    groups += [[vid(c, 0), vid(c, 1), vid(c, 2)] for c in C]
    P = np.array(P, float)
    faces = [ccw(g, P, unit(P[g].mean(0))) for g in groups]
    return orient(Mesh(P, faces))


def offset_poly(P, d):
    """Inset a convex counter-clockwise 2D polygon by d (mitred)."""
    P = np.asarray(P, float)
    e0 = unit(P - np.roll(P, 1, 0))
    e1 = unit(np.roll(P, -1, 0) - P)
    n0 = np.column_stack([-e0[:, 1], e0[:, 0]])
    n1 = np.column_stack([-e1[:, 1], e1[:, 0]])
    return P + d * (n0 + n1) / (1 + (n0 * n1).sum(1))[:, None]


def prism(poly, hw, ch=0.04):
    """Extrude a convex CCW (z, y) polygon along X from -hw to hw, chamfered ends."""
    poly = np.asarray(poly, float)
    rows = [(-hw, offset_poly(poly, ch)), (-hw + ch, poly), (hw - ch, poly), (hw, offset_poly(poly, ch))]
    m = len(poly)
    V = np.concatenate([np.column_stack([np.full(m, x), p[:, 1], p[:, 0]]) for x, p in rows])
    faces = [[j * m + i, (j + 1) * m + i, (j + 1) * m + (i + 1) % m, j * m + (i + 1) % m]
             for j in range(3) for i in range(m)]
    faces += [list(range(m)), list(range(4 * m - 1, 3 * m - 1, -1))]
    return orient(Mesh(V, faces))


def plane_cuts(v, rng, k, depth, snap=0.12):
    """Exact flat cuts (around + top). Vertices just under a cut snap onto it,
    so no thin near-coplanar sliver facets survive next to the cut face."""
    c = v.mean(0)
    az = (np.arange(k) + rng.uniform(-0.3, 0.3, k)) * 2 * math.pi / k
    el = np.radians(rng.uniform(-15, 50, k))
    ns = np.column_stack([np.cos(el) * np.cos(az), np.sin(el), np.cos(el) * np.sin(az)])
    ns = np.vstack([ns, [0.15, 1.0, 0.1]])
    for n in unit(ns):
        d = (v - c) @ n
        cut = np.quantile(d, depth)
        span = d.max() - d.min()
        hit = d > cut - snap * span
        v = v - np.where(hit, d - cut, 0)[:, None] * n
    return v


def chunk(rng, sub, scale, jitter=0.15, cuts=4, cube=0.0, depth=0.8):
    """Chunky faceted polyhedron: jittered icosphere + exact plane cuts."""
    n = icosphere(sub)
    p = cubeish(n.v, 1 - cube) if cube else n.v
    v = p * (1 + rng.uniform(-jitter, jitter, (len(p), 1)))
    if cuts:
        v = plane_cuts(v, rng, cuts, depth)
    lo, hi = v.min(0), v.max(0)
    n.v = ((v - (lo + hi) / 2) * 2 / (hi - lo)) * np.asarray(scale, float)
    return n


def ring_profile(r0, r1, y0, y1, out=0.012, sink=0.01, ch=0.006):
    """Closed (r, y) band hugging a straight slope from (r0, y0) to (r1, y1)."""
    pts = [(r0 - sink, y0), (r0 + out, y0), (r1 + out, y1), (r1 - sink, y1)]
    return fillet(pts, [0, ch, ch, 0], 1, closed=True)


def box(size):
    """Plain box (tiny parts: ticks, seams, bars)."""
    h = np.asarray(size, float) / 2
    P = np.array([(x, y, z) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)], float) * h
    faces = []
    for a in range(3):
        for s in (-1, 1):
            n = np.zeros(3)
            n[a] = s
            faces.append(ccw([i for i in range(8) if np.sign(P[i, a]) == s], P, n))
    return Mesh(P, faces)


def ring_rect(r0, r1, y0, y1, ch=0.006):
    """Closed (r, y) rectangle for lathe hoops/rings, chamfered corners."""
    return fillet([(r0, y0), (r1, y0), (r1, y1), (r0, y1)], ch, 1, closed=True)


def frame_ring(P2, outer, inner, z0, z1, ch=0.006):
    """Raised flat border along a CCW XY outline, from inset outer to inset inner."""
    rows = [(outer, z0), (outer, z1 - ch), (outer + ch, z1), (inner - ch, z1), (inner, z1 - ch), (inner, z0)]
    P = np.array([np.column_stack([offset_poly(P2, d), np.full(len(P2), z)]) for d, z in rows])
    return orient(grid_mesh(P, True))


def lp_nail(p, n, r=0.03):
    m = lathe([(0, -0.012), (r, -0.012), (r, 0.006), (r * 0.55, 0.016), (0, 0.016)], 6)
    a = np.asarray(n, float)
    if abs(a[1]) > 0.9:
        m = xf(m, s=(1, np.sign(a[1]), 1))
    else:
        m = xf(xf(m, r=(90, 0, 0)), r=(0, math.degrees(math.atan2(a[0], a[2])), 0))
    return xf(m, t=p)


def floor_cut(m, y):
    """Project everything below y onto the plane y (exact flat, grounded base)."""
    m.v[:, 1] = np.maximum(m.v[:, 1], y)
    return m


@low("traffic-cone")
def lp_cone(rng):
    base = xf(cbox((0.8, 0.08, 0.8), 0.03), t=(0, 0.04, 0))
    sq, _ = rrect(0.4, 0.4, 0.05, 1)
    lip = xf(frame_ring(sq, 0.025, 0.07, 0.07, 0.105, 0.008), r=(-90, 0, 0))
    knots = [(0.265, 0.15), (0.172, 0.56), (0.068, 1.0)]
    ry = lambda y: float(np.interp(y, [k[1] for k in knots], [k[0] for k in knots]))
    prof = [(0, 0.075), (0.3, 0.075), (0.3, 0.11)] + knots + [(0.078, 1.035), (0.05, 1.055), (0, 1.04)]
    body = lathe(prof, 16)
    bands = merge(*[lathe(ring_profile(ry(a), ry(b), a, b), 16, closed=True)
                    for a, b in ((0.34, 0.47), (0.66, 0.76))])
    return [lpart("body", body, "#EE7430", roughness=0.55),
            lpart("bands", bands, "#F2F2EE", roughness=0.3,
                  emissive="#FFFFFF", emissiveIntensity=0.08),
            lpart("base", merge(base, lip), "#3A3A3E", roughness=0.8)], None


@low("steering-wheel")
def lp_wheel(rng):
    R0, r0 = 0.72, 0.085
    grips = -np.radians(20 + 45 * np.arange(8))

    def bumps(th, Y, R):
        inner = np.clip((R0 - R) / r0, 0, 1) ** 2
        return R - 0.025 * inner * gauss_wrap(th[0], grips, 0.09)[None]
    rim = xf(lathe(torus_profile(R0, r0, 8), 40, closed=True, rmod=bumps), r=FACE_Z)
    ph = np.radians(np.linspace(84, 96, 3))
    mark = sweep(np.column_stack([R0 * np.cos(ph), R0 * np.sin(ph), 0 * ph]), r0 * 1.12, 8, caps="flat")
    spokes = [xf(xf(cbox((0.54, w, 0.08), 0.025), t=(0.44, 0, -0.03)), r=(0, 0, a))
              for a, w in ((0, 0.16), (180, 0.16), (270, 0.21))]
    hub = xf(lathe(fillet([(0, -0.12), (0.27, -0.12), (0.27, 0.04), (0, 0.04)], [0, 0.03, 0.03, 0], 1), 16),
             r=FACE_Z)
    disc = xf(lathe(fillet([(0, 0.03), (0.13, 0.03), (0.13, 0.07), (0, 0.07)], [0, 0, 0.012, 0], 1), 16),
              r=FACE_Z)
    ring = xf(lathe(ring_rect(0.128, 0.152, 0.035, 0.066), 16, closed=True), r=FACE_Z)
    star = lambda th, Y, R: R * np.where(np.round(th / (math.pi / 5)) % 2 == 0, 1.0, 0.42)
    star = xf(lathe([(0, 0.066), (0.08, 0.066), (0.08, 0.082), (0, 0.086)], 10, rmod=star),
              r=(90, 0, -90 + 18))
    col = [(0, -0.62), (0.1, -0.62), (0.1, -0.26), (0.15, -0.2), (0.15, -0.1), (0, -0.1)]
    col = xf(lathe(fillet(col, [0, 0.02, 0, 0.02, 0.02, 0], 1), 8), r=FACE_Z)
    return ground([lpart("rim", rim, "#2C2D31", "grip", 4, roughness=0.75),
                   lpart("mark", mark, "#C8343B", roughness=0.6),
                   lpart("spokes", merge(*spokes), tex="metal", uv=3, **LPMETAL),
                   lpart("hub", hub, "#3B3E45", roughness=0.6),
                   lpart("logo", disc, "#C8343B", roughness=0.35),
                   lpart("ring", ring, tex="metal", uv=3, **LPMETAL),
                   lpart("star", star, "#E3B341", roughness=0.35, metalness=0.4),
                   lpart("column", col, "#26282D", roughness=0.7)]), lptex("grip", "metal")


def lp_dial(deg):
    face = xf(lathe(fillet([(0, 0.01), (0.165, 0.01), (0.165, 0.045), (0, 0.045)], [0, 0, 0.008, 0], 1), 16),
              r=FACE_Z)
    ring = xf(lathe(ring_rect(0.16, 0.19, 0.01, 0.065), 16, closed=True), r=FACE_Z)
    ticks = []
    for k, a in enumerate(np.linspace(225, -45, 7)):
        L = 0.045 if k % 3 == 0 else 0.03
        rc, ar = 0.152 - L / 2, math.radians(a)
        ticks.append(xf(box((0.012, L, 0.01)), r=(0, 0, a - 90), t=(rc * math.cos(ar), rc * math.sin(ar), 0.048)))
    needle = xf(xf(box((0.016, 0.14, 0.01)), t=(0, 0.05, 0.058)), r=(0, 0, deg - 90))
    cap = xf(lathe([(0, 0.05), (0.025, 0.05), (0.025, 0.066), (0, 0.072)], 8), r=FACE_Z)
    return dict(face=face, ring=ring, ticks=merge(*ticks), needle=needle, cap=cap)


def lp_vent():
    ring = xf(lathe(ring_rect(0.16, 0.195, 0.0, 0.05, 0.008), 16, closed=True), r=FACE_Z)
    cup = xf(lathe([(0, -0.03), (0.165, -0.03), (0.165, 0.015), (0.15, 0.015), (0, -0.01)], 16), r=FACE_Z)
    slats = [xf(cbox((2 * math.sqrt(0.157 ** 2 - y * y), 0.024, 0.045), 0.006), t=(0, y, 0), r=(-25, 0, 0))
             for y in (-0.09, 0, 0.09)]
    tab = xf(cbox((0.05, 0.08, 0.04), 0.01), t=(0, 0, 0.025))
    return dict(ring=ring, cup=cup, slats=merge(*slats), tab=tab)


@low("dashboard")
def lp_dash(rng):
    HW = 2.5
    prof = [(-0.65, 0), (0.42, 0), (0.58, 0.55), (0.64, 1.08), (0.55, 1.24), (-0.65, 1.34)]
    shell = prism(fillet(prof, 0.05, 1, closed=True), HW, 0.05)
    tu, tl = 0.06 / 0.53, 0.16 / 0.55

    def up(m, x, y, dz=0.0):
        return xf(m, r=(math.degrees(math.atan(tu)), 0, 0), t=(x, y, 0.58 + tu * (y - 0.55) + dz))

    def lo(m, x, y, dz=0.0):
        return xf(m, r=(math.degrees(math.atan(tl)), 0, 0), t=(x, y, 0.42 + tl * y + dz))
    P = {k: [] for k in ("trim", "dark", "chrome", "white", "red", "slat", "screen", "ui")}
    yc = 0.815
    P["trim"].append(xf(cbox((4.96, 0.09, 0.26), 0.03), t=(0, 1.2, 0.56)))
    cx = -1.0
    P["dark"].append(up(cbox((1.64, 0.4, 0.04), 0.015), cx, yc))
    P["trim"].append(up(cbox((1.76, 0.07, 0.26), 0.025), cx, 1.06, 0.08))
    for sx in (-1, 1):
        P["trim"].append(up(cbox((0.06, 0.26, 0.24), 0.02), cx + sx * 0.85, 0.92, 0.07))
    for x, a in ((-0.38, 150), (0.38, 70)):
        d = lp_dial(a)
        P["white"].append(up(d["face"], cx + x, yc))
        P["chrome"] += [up(d["ring"], cx + x, yc), up(d["cap"], cx + x, yc)]
        P["dark"].append(up(d["ticks"], cx + x, yc))
        P["red"].append(up(d["needle"], cx + x, yc))
    sx_ = 0.5
    P["dark"].append(up(cbox((1.16, 0.42, 0.06), 0.02), sx_, yc, 0.01))
    P["screen"].append(up(cbox((1.04, 0.32, 0.02), 0.008), sx_, yc, 0.04))
    for w, y in ((0.6, 0.09), (0.42, 0.0), (0.5, -0.09)):
        P["ui"].append(up(box((w, 0.035, 0.008)), sx_ - 0.4 + w / 2, yc + y, 0.053))
    for x in (-2.12, 2.12):
        d = lp_vent()
        P["chrome"] += [up(d["ring"], x, yc), up(d["tab"], x, yc)]
        P["dark"].append(up(d["cup"], x, yc))
        P["slat"].append(up(d["slats"], x, yc))
    gx, gy = 1.62, 0.27
    for w, h, x, y in ((1.2, 0.018, 0, 0.15), (1.2, 0.018, 0, -0.15), (0.018, 0.3, 0.6, 0), (0.018, 0.3, -0.6, 0)):
        P["dark"].append(lo(box((w, h, 0.012)), gx + x, gy + y))
    P["chrome"].append(lo(cbox((0.3, 0.05, 0.05), 0.015), gx, gy + 0.09, 0.015))
    return ground([lpart("shell", shell, "#43474F", roughness=0.8),
                   lpart("trim", merge(*P["trim"]), "#545A64", "carbon", 3, roughness=0.5),
                   lpart("dark", merge(*P["dark"]), "#1C1E22", roughness=0.6),
                   lpart("chrome", merge(*P["chrome"]), tex="metal", uv=3, **LPMETAL),
                   lpart("dials", merge(*P["white"]), "#EEF0F2", roughness=0.4),
                   lpart("needles", merge(*P["red"]), "#D9363E", roughness=0.4,
                         emissive="#D9363E", emissiveIntensity=0.3),
                   lpart("slats", merge(*P["slat"]), "#5A606B", roughness=0.6),
                   lpart("screen", merge(*P["screen"]), "#4BA8E0", roughness=0.2,
                         emissive="#4BA8E0", emissiveIntensity=0.8),
                   lpart("ui", merge(*P["ui"]), "#E0F4FF", roughness=0.2,
                         emissive="#E0F4FF", emissiveIntensity=0.9)]), lptex("carbon", "metal")


@low("car-hood")
def lp_hood(rng):
    HX, HZ = 2.0, 1.75
    hood = rbox((2 * HX, 0.26, 2 * HZ), 0.05, 1, (8, 1, 7))
    v = hood.v
    xn, zn = v[:, 0] / HX, v[:, 2] / HZ
    top = (v[:, 1] > 0).astype(float)

    def lift(xn, zn):
        y = 0.14 * (1 - xn ** 2) * (1 - 0.3 * zn ** 2) - 0.14 * ((zn + 1) / 2) ** 2
        return y - 0.08 * np.clip((np.abs(xn) - 0.82) / 0.18, 0, 1) ** 2
    brow = sum(np.exp(-((xn - c) / 0.2) ** 2) for c in (-0.65, 0.65)) * smoothstep(0.55, 0.98, zn)
    bulge = np.clip((0.45 - np.abs(xn)) / 0.2, 0, 1) * smoothstep(1.0, 0.35, zn) * smoothstep(-1.02, -0.8, zn)
    v[:, 1] += lift(xn, zn) + top * (0.16 * bulge + 0.27 * brow)
    L = {"cup": [], "ring": [], "lens": []}
    for sx in (-1, 1):
        x = sx * 1.3
        y = float(lift(np.array(x / HX), np.array(1.0))) + 0.02
        T = dict(r=(0, sx * 8, 0), t=(x, y, HZ - 0.08))
        cup = fillet([(0, -0.18), (0.32, -0.18), (0.34, 0.0), (0.32, 0.07), (0, 0.07)], [0, 0.03, 0.03, 0.03, 0], 1)
        L["cup"].append(xf(xf(lathe(cup, 16), r=FACE_Z), **T))
        L["ring"].append(xf(xf(lathe(ring_rect(0.26, 0.32, 0.06, 0.11, 0.01), 16, closed=True), r=FACE_Z), **T))
        lens = [(0, 0.07), (0.265, 0.07), (0.25, 0.125), (0.17, 0.165), (0, 0.18)]
        L["lens"].append(xf(xf(lathe(lens, 16), r=FACE_Z), **T))
    zs = np.unique(np.round(v[:, 2], 4))
    zb = zs[np.argmin(np.abs(zs - (HZ - 0.5)))]
    pick = lambda z: v[(np.abs(v[:, 0]) < 1e-6) & (np.abs(v[:, 2] - z) < 1e-4), 1].max()
    za, zc = zs[np.searchsorted(zs, zb) - 1], zs[np.searchsorted(zs, zb) + 1]
    tilt = math.degrees(math.atan((pick(za) - pick(zc)) / (zc - za)))
    badge = lathe(fillet([(0, -0.02), (0.15, -0.02), (0.15, 0.025), (0, 0.04)], [0, 0, 0.015, 0], 1), 8)
    badge = xf(badge, s=(1, 1, 0.6), r=(tilt, 0, 0), t=(0, pick(zb), zb))
    return ground([lpart("panel", hood, "#3A6FCF", roughness=0.35, metalness=0.3),
                   lpart("lamp-cups", merge(*L["cup"]), "#3A6FCF", roughness=0.35, metalness=0.3),
                   lpart("rings", merge(*(L["ring"] + [badge])), tex="metal", uv=3, **LPMETAL),
                   lpart("lenses", merge(*L["lens"]), "#FFF3D0", roughness=0.15,
                         emissive="#FFF1B0", emissiveIntensity=0.6)]), lptex("metal")


@low("road-sign")
def lp_sign(rng):
    Y, PZ, PR = 2.7, -0.14, 0.085
    board = xf(slab(1.3, 0.45, 0.08, 0.12, 0.025, 1, 1), t=(0, Y, 0))
    o, _ = rrect(1.3, 0.45, 0.12, 1)
    rim = xf(frame_ring(o, 0.05, 0.12, 0.03, 0.065, 0.008), t=(0, Y, 0))
    post = xf(lathe([(0, 0), (PR, 0), (PR, 3.04), (0.05, 3.09), (0, 3.09)], 8), t=(0, 0, PZ))
    bands = [xf(lathe(ring_rect(PR - 0.01, PR + 0.025, -0.07, 0.07, 0.01), 8, closed=True), t=(0, y, PZ))
             for y in (Y - 0.22, Y + 0.22)]
    plate = xf(cbox((0.2, 0.62, 0.06), 0.015), t=(0, Y, -0.065))
    heads, washers = [], []
    for y in (Y - 0.22, Y + 0.22):
        h = lathe([(0, 0.008), (0.05, 0.008), (0.05, 0.026), (0.036, 0.04), (0, 0.042)], 6)
        heads.append(xf(h, r=(90, 0, 0), t=(0, y, 0.036)))
        w = lathe(fillet([(0, 0), (0.068, 0), (0.068, 0.012), (0, 0.012)], [0, 0, 0.004, 0], 1), 8)
        washers.append(xf(w, r=FACE_Z, t=(0, y, 0.035)))
    return ground([lpart("board", board, "#C8282F", roughness=0.45),
                   lpart("rim", rim, "#F2F2F2", roughness=0.35),
                   lpart("post", merge(post, *bands, plate, *washers), tex="metal", uv=3, **LPMETAL),
                   lpart("bolts", merge(*heads), tex="metal", uv=3, **LPMETAL)]), lptex("metal")


LPROCK = ("#B08D6A", "#9C7D60", "#A98667")


def lp_rock(rng, scale, color):
    m = chunk(rng, 1, scale, jitter=0.14, cuts=5, cube=0.2, depth=0.8)
    m = xf(m, r=(0, rng.uniform(0, 360), 0))
    lo, hi = m.v[:, 1].min(), m.v[:, 1].max()
    floor_cut(m, lo + 0.15 * (hi - lo))
    return ground([lpart("stone", m, color, "rock", 0.8, roughness=0.9)]), lptex("rock")


@low("rock-1")
def lp_rock1(rng):
    return lp_rock(rng, (1.0, 0.72, 0.85), LPROCK[0])


@low("rock-2")
def lp_rock2(rng):
    return lp_rock(rng, (0.78, 1.0, 0.75), LPROCK[1])


@low("rock-3")
def lp_rock3(rng):
    return lp_rock(rng, (1.15, 0.5, 0.95), LPROCK[2])


@low("cliff")
def lp_cliff(rng):
    chunks, y = [[], []], 0.0
    for k in range(6):
        h = rng.uniform(7.2, 8.2)
        rxz = 5.3 * (1 - 0.035 * k) * rng.uniform(0.95, 1.04)
        m = chunk(rng, 1, (rxz, h * 0.6, rxz * rng.uniform(0.85, 1.0)), jitter=0.08, cuts=4, cube=0.55,
                  depth=0.85)
        last = xf(m, r=(0, rng.uniform(0, 360), 0),
                  t=(rng.uniform(-0.4, 0.4), y + h * 0.5, rng.uniform(-0.4, 0.4)))
        chunks[k % 2].append(last)
        a = rng.uniform(0, 2 * math.pi)
        rs = rxz * rng.uniform(0.5, 0.6)
        side = chunk(rng, 1, (rs, rs * rng.uniform(0.8, 1.1), rs), jitter=0.1, cuts=3, cube=0.4)
        chunks[(k + 1) % 2].append(xf(side, r=(0, rng.uniform(0, 360), 0),
                                      t=(math.cos(a) * rxz * 0.62, y + h * rng.uniform(0.3, 0.7),
                                         math.sin(a) * rxz * 0.62)))
        y += h * 0.76
    top, cx, cz = last.v[:, 1].max(), last.v[:, 0].mean(), last.v[:, 2].mean()
    R, seg = rxz * 1.12, 16
    th = np.arange(seg) * 2 * math.pi / seg + rng.uniform(0, 1)
    teeth = np.where(np.arange(seg) % 2 == 0, rng.uniform(0.7, 1.7, seg), rng.uniform(0.0, 0.25, seg))
    ring = lambda r, yy: np.column_stack([cx + r * np.cos(th), yy, cz + r * np.sin(th)])
    P = np.array([ring(R * 0.6, np.full(seg, top - 1.6)), ring(R * 1.03, top - 0.5 - teeth),
                  ring(R, np.full(seg, top + 0.15)), ring(R * 0.82, top + 0.45 + rng.uniform(0, 0.15, seg))])
    grass = orient(grid_mesh(P, False, (cx, top - 1.8, cz), (cx, top + 0.55, cz)))
    a, b = merge(*chunks[0]), merge(*chunks[1])
    base = min(a.v[:, 1].min(), b.v[:, 1].min()) + 0.5
    floor_cut(a, base), floor_cut(b, base)
    return ground([lpart("rock-a", a, LPROCK[0], "rock", 0.15, roughness=0.9),
                   lpart("rock-b", b, LPROCK[1], "rock", 0.15, roughness=0.9),
                   lpart("grass", grass, "#6CB547", "grass", 0.3, roughness=0.85)]), lptex("rock", "grass")


LPGREEN = ("#5AA845", "#47913A")


def clumps(rng, specs, jitter=0.1, cuts=2):
    """Faceted foliage/cloud clumps, alternating into two meshes."""
    out = [[], []]
    for k, (c, sc) in enumerate(specs):
        m = chunk(rng, 1, sc, jitter=jitter, cuts=cuts, depth=0.88)
        out[k % 2].append(xf(m, r=(0, rng.uniform(0, 360), 0), t=c))
    return [merge(*o) for o in out]


@low("tree")
def lp_tree(rng):
    seg = 6
    bend = rng.uniform(0.15, 0.25) * rng.choice([-1, 1])
    ys = np.array([0, 0.45, 1.3, 2.2, 3.1])
    path = np.column_stack([bend * np.sin(ys / 3.1 * math.pi * 0.8), ys, 0.06 * np.sin(ys / 3.1 * math.pi)])
    rad = np.array([0.5, 0.33, 0.28, 0.23, 0.19])[:, None] * np.ones(seg)
    rad[0] *= np.where(np.arange(seg) % 2 == 0, 1.18, 0.82)
    trunk = sweep(path, rad, seg, caps="flat")
    p0 = path[3]
    branch = sweep([p0, p0 + (0.55, 0.45, 0.15), p0 + (0.95, 1.05, 0.25)], [0.11, 0.08, 0.06], 5, caps="flat")
    c = np.array([path[-1, 0], 4.15, path[-1, 2]])
    specs = [(c, (1.8, 1.45, 1.7)), (c + (-1.25, -0.45, 0.25), (1.25, 1.05, 1.2)),
             (c + (1.2, -0.35, -0.3), (1.3, 1.1, 1.2)), (c + (0.15, 1.05, -0.15), (1.2, 1.0, 1.15))]
    fa, fb = clumps(rng, specs)
    return ground([lpart("trunk", merge(trunk, branch), "#7B5434", "bark", 1.5, roughness=0.9),
                   lpart("leaves-a", fa, LPGREEN[0], roughness=0.8),
                   lpart("leaves-b", fb, LPGREEN[1], roughness=0.8)]), lptex("bark")


@low("bush")
def lp_bush(rng):
    specs = [((0, 0.75, 0), (1.05, 0.8, 0.95)), ((-0.85, 0.55, 0.2), (0.75, 0.6, 0.7)),
             ((0.85, 0.55, -0.15), (0.8, 0.62, 0.75)), ((0.1, 0.5, 0.75), (0.6, 0.5, 0.55))]
    fa, fb = clumps(rng, specs)
    return ground([lpart("leaves-a", floor_cut(fa, 0.1), LPGREEN[0], roughness=0.8),
                   lpart("leaves-b", floor_cut(fb, 0.1), LPGREEN[1], roughness=0.8)]), None


@low("cloud")
def lp_cloud(rng):
    specs = [((0, 1.2, 0), (1.7, 1.3, 1.5)), ((-1.8, 0.85, 0.1), (1.2, 0.95, 1.1)),
             ((1.9, 0.9, -0.1), (1.3, 1.0, 1.15)), ((-0.6, 1.9, -0.25), (1.1, 0.9, 1.0)),
             ((0.9, 1.8, 0.3), (1.15, 0.95, 1.05))]
    ms = [floor_cut(xf(chunk(rng, 1, sc, jitter=0.04, cuts=0), r=(0, rng.uniform(0, 360), 0), t=c), 0.3)
          for c, sc in specs]
    return ground([lpart("puffs", merge(*ms[:3]), "#F4F6F9", roughness=0.9,
                         emissive="#FFFFFF", emissiveIntensity=0.1),
                   lpart("puffs-back", merge(*ms[3:]), "#E4EAF1", roughness=0.9,
                         emissive="#FFFFFF", emissiveIntensity=0.06)]), None


def lp_frond(base, az, L, W, rng):
    u = np.linspace(0, 1, 9)
    d = np.array([math.cos(az), 0, math.sin(az)])
    droop = rng.uniform(1.8, 2.3)
    path = base + d[None] * (L * u)[:, None] + np.array([0, 1, 0]) * (0.7 * u - droop * u * u)[:, None]
    w = W * (0.15 + 0.85 * np.sin(math.pi * u) ** 0.7) * np.where(np.arange(9) % 2 == 0, 1.0, 0.72)
    shape = [(0.05, 0), (-0.28, 1), (-0.12, 0), (-0.28, -1)]
    return sweep(path, w, ref=(0, 1, 0), shape=shape, caps="flat")


@low("palm-tree")
def lp_palm(rng):
    H, NSEG = 6.4, 9
    p = lambda s: np.array([1.1 * s * s, H * s - 0.02, 0.15 * s * s])
    rr = lambda s: 0.25 * (1 - 0.3 * s)
    pts, rad = [p(0), p(0.035)], [0.42, 0.3]
    for k in range(NSEG):
        s0, s1 = k / NSEG, (k + 1) / NSEG - 0.012
        if k:
            pts.append(p(s0))
            rad.append(rr(s0) * 0.92)
        pts.append(p(s1))
        rad.append(rr(s0) * 1.12)
    trunk = sweep(np.array(pts), np.array(rad), 6, caps="flat")
    top = p(1.0) + (0, 0.05, 0)
    fr = [[], []]
    for k in range(6):
        az = k * math.pi / 3 + rng.uniform(-0.2, 0.2)
        fr[k % 2].append(lp_frond(top, az, rng.uniform(2.9, 3.4), 0.58, rng))
    crown = xf(chunk(rng, 1, (0.42, 0.34, 0.42), jitter=0.08, cuts=0), t=top)
    nuts = [xf(icosphere(1), s=0.21, t=top + (0.3 * math.cos(a), -0.36, 0.3 * math.sin(a)))
            for a in np.radians([20, 140, 260])]
    return ground([lpart("trunk", trunk, "#A57A4E", "palm", 1.5, roughness=0.85),
                   lpart("fronds-a", merge(*fr[0]), LPGREEN[0], roughness=0.75),
                   lpart("fronds-b", merge(*fr[1]), LPGREEN[1], roughness=0.75),
                   lpart("crown", crown, "#47913A", roughness=0.8),
                   lpart("coconuts", merge(*nuts), "#6B4423", roughness=0.7)]), lptex("palm")


@low("crate")
def lp_crate(rng):
    S, F, G = 1.5, 0.16, 0.035
    h, e = S / 2, S / 2 - F / 2
    frame = []
    for a in range(3):
        for s1 in (-1, 1):
            for s2 in (-1, 1):
                size = [F, F, F]
                size[a] = S if a == 0 else S - 2 * F + 0.02
                pos = [0, 0, 0]
                o = [b for b in range(3) if b != a]
                pos[o[0]], pos[o[1]] = s1 * e, s2 * e
                frame.append(xf(cbox(size, 0.025), t=pos))
    span = S - 2 * F
    pw = (span - 2 * G) / 3
    planks, nails = [], []
    for ax in range(3):
        for sg in (-1, 1):
            along = 0 if ax != 0 else 2
            across = [b for b in range(3) if b not in (ax, along)][0]
            for k in range(3):
                size, pos = [0, 0, 0], [0, 0, 0]
                size[ax], size[along], size[across] = 0.06, span + 0.04, pw
                pos[ax] = sg * (h - 0.05)
                pos[across] = -span / 2 + pw / 2 + k * (pw + G)
                planks.append(xf(cbox(size, 0.018), t=pos))
                for t in (-0.42, 0.42):
                    q, nv = list(pos), [0, 0, 0]
                    q[ax], q[along], nv[ax] = sg * (h - 0.02), t, sg
                    nails.append(lp_nail(q, nv))
    core = box((S - 0.14,) * 3)
    return ground([lpart("planks", merge(*planks), "#B5824F", "wood", 1.2, roughness=0.8),
                   lpart("frame", merge(*frame), "#946538", "wood", 1.2, roughness=0.8),
                   lpart("core", core, "#3E2A1A", roughness=0.95),
                   lpart("nails", merge(*nails), "#8F959C", metalness=0.7, roughness=0.35)]), lptex("wood")


@low("barrel")
def lp_barrel(rng):
    H, RM, RE, NS = 1.6, 0.62, 0.5, 12
    ry = lambda y: RE + (RM - RE) * (1 - ((y - H / 2) / (H / 2)) ** 2)
    prof = [(0, 0.07), (RE - 0.04, 0.07), (RE - 0.04, 0.0)] + [(ry(y), y) for y in np.linspace(0, H, 5)] + \
           [(RE - 0.04, H), (RE - 0.04, H - 0.07), (0, H - 0.07)]

    def staves(th, Y, R):
        side = (R > RE - 0.02) & (Y > 0.005) & (Y < H - 0.005)
        seam = np.round(th / (math.pi / NS)) % 2 == 1
        return R * (1 - 0.018 * (side & seam))
    body = lathe(prof, 2 * NS, rmod=staves)
    hoops, rivets = [], []
    for y in (0.32, H - 0.32):
        r = ry(y)
        hoops.append(lathe(ring_rect(r - 0.012, r + 0.03, y - 0.055, y + 0.055, 0.01), 2 * NS, closed=True))
        for a in (np.arange(6) * 2 + 0.0) * math.pi / 6 + math.pi / NS * 0:
            d = np.array([math.cos(a), 0, math.sin(a)])
            rivets.append(lp_nail(d * (r + 0.026) + (0, y, 0), d, 0.022))
    bung = xf(lathe(fillet([(0, 0), (0.07, 0), (0.07, 0.03), (0, 0.035)], [0, 0, 0.01, 0], 1), 8),
              r=(90, 0, 0), t=(0, H / 2, RM - 0.012))
    return ground([lpart("staves", body, "#B5824F", "wood", 1.5, roughness=0.8),
                   lpart("hoops", merge(*hoops, *rivets), "#5E646C", "metal", 3, metalness=0.7, roughness=0.4),
                   lpart("bung", bung, "#6E4423", roughness=0.8)]), lptex("wood", "metal")

# ---------------------------------------------------------------- writers
def geo_doc(m):
    v = np.round(m.v, 3)
    v[v == 0] = 0.0
    doc = {"verts": [float(x) for x in v.ravel()], "faces": m.f,
           "uvs": None if m.uv is None else
           [float(x) for x in np.round(m.uv, 3).ravel()]}
    return json.dumps(doc, separators=(",", ":")).replace(".0,", ",")


def build(name, seed, style="lowpoly"):
    title, fn = PROPS[name]
    if style == "lowpoly":
        fn = LOW[name]
    rng = np.random.default_rng([seed, zlib.crc32(name.encode())])
    parts, textures = fn(rng)
    return title, parts, textures


def write_prop(out, name, seed, style="lowpoly"):
    title, parts, textures = build(name, seed, style)
    gdir = os.path.join(out, "geo")
    os.makedirs(gdir, exist_ok=True)
    root = name + "-root"
    objs = {root: {"type": "group", "name": title, "parent": None,
                   "pos": [0, 0, 0], "rot": [0, 0, 0], "scale": [1, 1, 1]}}
    stats = []
    for p in parts:
        gid = name + "-" + p["id"]
        txt = geo_doc(p["mesh"])
        with open(os.path.join(gdir, gid + ".json"), "w") as fh:
            fh.write(txt)
        o = {"type": "mesh", "name": p.get("name", p["id"]), "geo": gid,
             "parent": root, "pos": [0, 0, 0], "color": p["color"],
             "smooth": p.get("smooth", True),
             "roughness": p.get("roughness", 0.6),
             "metalness": p.get("metalness", 0.0)}
        for k in ("emissive", "emissiveIntensity"):
            if k in p:
                o[k] = p[k]
        if "texture" in p:
            o["texture"] = name + "-" + p["texture"]
        objs[gid] = o
        stats.append((gid, p["mesh"], len(txt.encode())))
    doc = {"name": title, "objects": objs, "root": root}
    if textures:
        doc["textures"] = {name + "-" + k: t for k, t in textures.items()}
    with open(os.path.join(out, name + ".json"), "w") as fh:
        json.dump(doc, fh, separators=(",", ":"))
    return title, parts, stats


# ---------------------------------------------------------------- checks
def check_mesh(gid, m, size):
    errs = []
    n = len(m.v)
    if not np.all(np.isfinite(m.v)):
        errs.append(gid + ": non-finite vertex")
    vr = np.round(m.v, 3)
    for i, f in enumerate(m.f):
        if len(f) < 3:
            errs.append("%s: face %d has %d verts" % (gid, i, len(f)))
            continue
        if min(f) < 0 or max(f) >= n:
            errs.append("%s: face %d index out of range" % (gid, i))
            continue
        if len(set(f)) != len(f):
            errs.append("%s: face %d repeats a vertex" % (gid, i))
            continue
        p = vr[f]
        a = np.cross(p[1:-1] - p[0], p[2:] - p[0]).sum(0)
        if np.linalg.norm(a) < 1e-7:
            errs.append("%s: face %d degenerate" % (gid, i))
    if m.uv is not None and len(m.uv) != n:
        errs.append(gid + ": uv count mismatch")
    if size > GEO_CAP:
        errs.append("%s: %d KB over cap" % (gid, size // 1024))
    return errs


def check_flat(gid, m):
    """Flat-shaded mesh: no vertex shared by facets more than FLAT_DEG apart."""
    fn = unit(face_normals(np.round(m.v, 3), m.f))
    inc = {}
    for fi, f in enumerate(m.f):
        for vi in f:
            inc.setdefault(vi, []).append(fi)
    lim, bad = math.cos(math.radians(FLAT_DEG)), 0
    for fl in inc.values():
        if len(fl) > 1:
            N = fn[fl]
            bad += (N @ N.T).min() < lim
    return ["%s: %d vertices shared by facets > %g deg apart" % (gid, bad, FLAT_DEG)] if bad else []


def run(out, names, seed, check, preview, style="lowpoly"):
    t0 = time.time()
    errs, rows, shots = [], [], []
    for name in names:
        title, parts, stats = write_prop(out, name, seed, style)
        tris = sum(m.tris() for _, m, _ in stats)
        kb = sum(s for _, _, s in stats) / 1024
        if check:
            cap = LOW_TRI_CAP if style == "lowpoly" else TRI_CAP
            for (gid, m, s), p in zip(stats, parts):
                errs += check_mesh(gid, m, s)
                if style == "lowpoly":
                    errs += check_flat(gid, m)
                    if p.get("smooth", True):
                        errs.append(gid + ": low-poly mesh must be flat shaded")
            if tris > cap:
                errs.append("%s: %d tris over cap %d" % (name, tris, cap))
        rows.append((name, len(parts), tris, kb))
        shots.append((name, parts))
    dt = time.time() - t0
    print("%-16s %5s %7s %8s" % ("prop", "parts", "tris", "KB"))
    for r in rows:
        print("%-16s %5d %7d %8.1f" % r)
    print("%d props, %.1f s, style %s" % (len(rows), dt, style))
    if check and dt > 20:
        errs.append("took %.1f s (cap 20)" % dt)
    if preview:
        path = os.path.join(out, "preview.png" if style == "toon" else "preview_lowpoly.png")
        contact_sheet(shots, path)
        print("preview:", path)
    if check:
        for e in errs:
            print("FAIL", e)
        print("check: " + ("FAILED (%d)" % len(errs) if errs else "ok"))
        return 1 if errs else 0
    return 0


# ---------------------------------------------------------------- preview
FONT = {
    "a": ".#. #.# ### #.# #.#", "b": "##. #.# ##. #.# ##.", "c": ".## #.. #.. #.. .##",
    "d": "##. #.# #.# #.# ##.", "e": "### #.. ##. #.. ###", "f": "### #.. ##. #.. #..",
    "g": ".## #.. #.# #.# .##", "h": "#.# #.# ### #.# #.#", "i": "### .#. .#. .#. ###",
    "k": "#.# #.# ##. #.# #.#", "l": "#.. #.. #.. #.. ###", "m": "#.# ### ### #.# #.#",
    "n": "##. #.# #.# #.# #.#", "o": ".#. #.# #.# #.# .#.", "p": "##. #.# ##. #.. #..",
    "r": "##. #.# ##. #.# #.#", "s": ".## #.. .#. ..# ##.", "t": "### .#. .#. .#. .#.",
    "u": "#.# #.# #.# #.# ###", "v": "#.# #.# #.# #.# .#.", "w": "#.# #.# ### ### #.#",
    "y": "#.# #.# .#. .#. .#.", "1": ".#. ##. .#. .#. ###", "2": "##. ..# .#. #.. ###",
    "3": "##. ..# .#. ..# ##.", "-": "... ... ### ... ...",
}


def hexrgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float) / 255


def tris_of(m):
    T = [(f[0], f[k], f[k + 1]) for f in m.f for k in range(1, len(f) - 1)]
    return np.array(T, dtype=np.int64)


def shade_part(p, M):
    """Vertex colours (camera space, lambert + spec + emissive) per triangle corner."""
    m = p["mesh"]
    v = m.v @ M.T
    T = tris_of(m)
    fn = np.cross(v[T[:, 1]] - v[T[:, 0]], v[T[:, 2]] - v[T[:, 0]])
    if p.get("smooth", True):
        vn = np.zeros_like(v)
        for k in range(3):
            np.add.at(vn, T[:, k], fn)
        N = unit(vn)[T]
    else:
        N = np.repeat(unit(fn)[:, None], 3, 1)
    L = unit(np.array([-0.45, 0.75, 0.5]))
    H = unit(L + np.array([0, 0, 1.0]))
    lam = np.clip(N @ L, 0, 1)
    met = p.get("metalness", 0)
    base = hexrgb(p["color"])
    col = base * (0.38 + 0.62 * lam[..., None]) * (1 - 0.25 * met)
    spec = np.clip(N @ H, 0, 1) ** (40 * (1.05 - p.get("roughness", 0.6))) * (0.15 + 0.6 * met)
    col = col + spec[..., None]
    if "emissive" in p:
        col = col + hexrgb(p["emissive"]) * p.get("emissiveIntensity", 1) * 0.6
    return v[T], np.clip(col, 0, 1)


def raster(V, C, ids, W, H):
    """Z-buffer rasterise screen triangles V (n,3,3: x,y,depth)."""
    x, y = V[..., 0], V[..., 1]
    area = (x[:, 1] - x[:, 0]) * (y[:, 2] - y[:, 0]) - (y[:, 1] - y[:, 0]) * (x[:, 2] - x[:, 0])
    keep = area < -1e-9
    V, C, ids, area = V[keep], C[keep], ids[keep], area[keep]
    x, y = V[..., 0], V[..., 1]
    x0 = np.clip(np.floor(x.min(1)), 0, W - 1).astype(int)
    y0 = np.clip(np.floor(y.min(1)), 0, H - 1).astype(int)
    x1 = np.clip(np.ceil(x.max(1)), 0, W - 1).astype(int)
    y1 = np.clip(np.ceil(y.max(1)), 0, H - 1).astype(int)
    size = np.maximum(x1 - x0, y1 - y0) + 1
    fp, fz, fc, fi = [], [], [], []
    S = 1
    while (size > S // 2).any() and S <= 4096:
        sel = np.nonzero((size <= S) & (size > S // 2))[0]
        g = np.arange(S)
        gx, gy = [a.ravel() for a in np.meshgrid(g, g)]
        step = max(1, 2_000_000 // (S * S))
        for c in range(0, len(sel), step):
            s = sel[c:c + step]
            px = x0[s, None] + gx[None]
            py = y0[s, None] + gy[None]
            cx, cy = px + 0.5, py + 0.5
            X, Y = x[s], y[s]
            e = lambda a, b: ((X[:, b, None] - X[:, a, None]) * (cy - Y[:, a, None])
                              - (Y[:, b, None] - Y[:, a, None]) * (cx - X[:, a, None]))
            A = area[s, None]
            w0, w1, w2 = e(1, 2) / A, e(2, 0) / A, e(0, 1) / A
            ok = (w0 >= 0) & (w1 >= 0) & (w2 >= 0) & (px < W) & (py < H)
            r, k = np.nonzero(ok)
            if not len(r):
                continue
            ww = np.stack([w0[r, k], w1[r, k], w2[r, k]], 1)
            ss = s[r]
            fp.append(py[r, k] * W + px[r, k])
            fz.append((ww * V[ss, :, 2]).sum(1))
            fc.append(np.einsum("nk,nkc->nc", ww, C[ss]))
            fi.append(ids[ss])
        S *= 2
    img = np.zeros((H * W, 3))
    zb = np.full(H * W, -np.inf)
    ib = np.full(H * W, -1)
    if fp:
        fp, fz, fc, fi = map(np.concatenate, (fp, fz, fc, fi))
        o = np.lexsort((-fz, fp))
        u, first = np.unique(fp[o], return_index=True)
        w = o[first]
        img[u], zb[u], ib[u] = fc[w], fz[w], fi[w]
    return img.reshape(H, W, 3), zb.reshape(H, W), ib.reshape(H, W)


def render(parts, W, H, az=32, el=20):
    M = rot(el, 0, 0) @ rot(0, -az, 0)
    allv = np.concatenate([p["mesh"].v for p in parts]) @ M.T
    lo, hi = allv.min(0), allv.max(0)
    sc = 0.8 * min(W / max(hi[0] - lo[0], 1e-6), H / max(hi[1] - lo[1], 1e-6))
    mid = (lo + hi) / 2
    Vs, Cs, Is = [], [], []
    for k, p in enumerate(parts):
        V, C = shade_part(p, M)
        V = V.copy()
        V[..., 0] = (V[..., 0] - mid[0]) * sc + W / 2
        V[..., 1] = H * 0.47 - (V[..., 1] - mid[1]) * sc
        V[..., 2] = V[..., 2] * sc
        Vs.append(V)
        Cs.append(C)
        Is.append(np.full(len(V), k))
    img, zb, ib = raster(np.concatenate(Vs), np.concatenate(Cs), np.concatenate(Is), W, H)
    zb = np.where(np.isfinite(zb), zb, -1e9)
    edge = np.zeros((H, W), bool)
    for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
        a = ib[max(0, -dy):H - max(0, dy), max(0, -dx):W - max(0, dx)]
        b = ib[max(0, dy):, max(0, dx):W + min(0, dx)][:a.shape[0], :a.shape[1]]
        za = zb[max(0, -dy):H - max(0, dy), max(0, -dx):W - max(0, dx)]
        zb2 = zb[max(0, dy):, max(0, dx):W + min(0, dx)][:a.shape[0], :a.shape[1]]
        jump = (a != b) | (np.abs(za - zb2) > 0.05 * W)
        ys, xs = np.nonzero(jump)
        y0, x0 = max(0, -dy), max(0, -dx)
        edge[ys + y0, xs + x0] = True
        edge[ys + y0 + dy, xs + x0 + dx] = True
    cover = ib >= 0
    sil = cover.copy()
    for _ in range(2):
        sil = sil | np.roll(sil, 1, 0) | np.roll(sil, -1, 0) | np.roll(sil, 1, 1) | np.roll(sil, -1, 1)
    bg = np.array([0.91, 0.94, 0.97])
    out = np.where(cover[..., None], img, bg)
    out[(sil & ~cover) | (edge & (cover | sil))] = 0.05
    return out


def label(img, text, x, y, s=3):
    for ch in text:
        g = FONT.get(ch)
        if g:
            for r, row in enumerate(g.split()):
                for c, b in enumerate(row):
                    if b == "#":
                        img[y + r * s:y + (r + 1) * s, x + c * s:x + (c + 1) * s] = 0.1
        x += 4 * s


def write_png(path, img):
    import struct
    import zlib
    a = (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
    h, w, _ = a.shape
    raw = b"".join(b"\x00" + a[r].tobytes() for r in range(h))
    ch = lambda t, d: (struct.pack(">I", len(d)) + t + d
                       + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF))
    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                 + ch(b"IDAT", zlib.compress(raw, 9)) + ch(b"IEND", b""))


def contact_sheet(shots, path, tile=300, cols=5):
    rows = (len(shots) + cols - 1) // cols
    sheet = np.ones((rows * tile, cols * tile, 3)) * 0.91
    for k, (name, parts) in enumerate(shots):
        big = render(parts, tile * 2, tile * 2)
        small = big.reshape(tile, 2, tile, 2, 3).mean((1, 3))
        label(small, name, 8, tile - 22)
        r, c = divmod(k, cols)
        sheet[r * tile:(r + 1) * tile, c * tile:(c + 1) * tile] = small
        sheet[r * tile:(r + 1) * tile, c * tile] = 0.7
        sheet[r * tile, c * tile:(c + 1) * tile] = 0.7
    write_png(path, sheet)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out")
    ap.add_argument("name", help="prop name or all")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--style", choices=("lowpoly", "toon"), default="lowpoly",
                    help="lowpoly (default): crisp faceted Roblox look; toon: bubbly")
    a = ap.parse_args(argv)
    have = sorted(PROPS) if a.style == "toon" else sorted(LOW)
    names = have if a.name == "all" else [a.name]
    for n in names:
        if n not in have:
            sys.exit("unknown prop %s; have: %s" % (n, ", ".join(have)))
    os.makedirs(a.out, exist_ok=True)
    return run(a.out, names, a.seed, a.check, a.preview, a.style)


if __name__ == "__main__":
    sys.exit(main())
