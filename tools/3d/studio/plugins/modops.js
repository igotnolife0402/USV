// Modify ops: Blender-style one-shot tools (deform, generate, clean up, UV, select) on the working mesh {v, f, uv}
// used by meshops.js. Pure, no DOM. Each op: run(m, sel, p) where sel = {verts: Set | null, faces: [] | null,
// edges: ['a_b'] | null, target: {v, f} | null}; null = nothing selected = whole mesh. Returns {kind, ids} for the
// new selection, or nothing. plugins/mesh.js registers every entry of MODOPS as the command mesh.<id>.
import { MODOPS } from './modlist.js'
import { V3, add, sub, mul, dot, cross, len, norm, lerp, ek, setV, fnormal, edgesOf, mergeDist, signedVolume, clean, quadSurf, outward, PRIM, extrude as extrudeRegion, subdivide } from './meshops.js'

const META = Object.fromEntries(MODOPS.map(o => [o.id, o]))
const nv = m => m.v.length / 3
const AX = { x: 0, y: 1, z: 2 }
const axi = a => AX[a] ?? 1
const others = i => [(i + 1) % 3, (i + 2) % 3]
const RAD = Math.PI / 180
const allV = m => [...Array(nv(m)).keys()]
const allF = m => [...m.f.keys()]
const vertsOf = (m, sel) => sel.verts && sel.verts.size ? [...sel.verts] : allV(m)
const facesOf = (m, sel) => sel.faces && sel.faces.length ? sel.faces : allF(m)
function addV(m, p, src = -1) {
  m.v.push(p[0], p[1], p[2])
  if (m.uv) m.uv.push(src >= 0 ? m.uv[2 * src] : 0, src >= 0 ? m.uv[2 * src + 1] : 0)
  return nv(m) - 1
}
// Seeded RNG (mulberry32): random ops repeat exactly for the same seed.
function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
function bbox(m, ids) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
  for (const i of ids) for (let k = 0; k < 3; k++) { const x = m.v[3 * i + k]; if (x < lo[k]) lo[k] = x; if (x > hi[k]) hi[k] = x }
  if (!ids.length) return { lo: [0, 0, 0], hi: [0, 0, 0], c: [0, 0, 0], s: [0, 0, 0] }
  return { lo, hi, c: lo.map((x, k) => (x + hi[k]) / 2), s: lo.map((x, k) => hi[k] - x) }
}
// Area-weighted vertex normals.
function vnormals(m) {
  const n = new Float64Array(m.v.length)
  for (const f of m.f) {
    let s = [0, 0, 0]
    for (let i = 0; i < f.length; i++) { const a = V3(m, f[i]), b = V3(m, f[(i + 1) % f.length]); s = add(s, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]) }
    for (const i of f) { n[3 * i] += s[0]; n[3 * i + 1] += s[1]; n[3 * i + 2] += s[2] }
  }
  return i => norm([n[3 * i], n[3 * i + 1], n[3 * i + 2]])
}
function neighbours(m) {
  const adj = Array.from({ length: nv(m) }, () => new Set())
  for (const f of m.f) f.forEach((a, k) => { const b = f[(k + 1) % f.length]; adj[a].add(b); adj[b].add(a) })
  return adj
}
// Edge key -> faces using it.
function edgeFaces(m, faces = allF(m)) {
  const map = new Map()
  for (const fi of faces) { const f = m.f[fi]; f.forEach((a, k) => { const key = ek(a, f[(k + 1) % f.length]); (map.get(key) || map.set(key, []).get(key)).push(fi) }) }
  return map
}
const faceArea = (m, f) => { let s = [0, 0, 0]; const a = V3(m, f[0]); for (let i = 1; i + 1 < f.length; i++) s = add(s, cross(sub(V3(m, f[i]), a), sub(V3(m, f[i + 1]), a))); return len(s) / 2 }
const faceC = (m, f) => mul(f.reduce((c, i) => add(c, V3(m, i)), [0, 0, 0]), 1 / f.length)
const rev = f => [f[0], ...f.slice(1).reverse()]
// Replace m.f by the kept faces plus new ones; returns the new indices of `added`.
function rebuild(m, drop, added = []) {
  const keep = m.f.filter((_, i) => !drop.has(i)), base = keep.length
  m.f = keep.concat(added)
  return added.map((_, i) => base + i)
}
// Boundary loops of a face region (directed as the region walks them); null when a loop branches.
function regionLoops(m, faces) {
  const dir = new Set(), next = new Map()
  for (const fi of faces) { const f = m.f[fi]; f.forEach((a, k) => dir.add(a + ',' + f[(k + 1) % f.length])) }
  for (const e of dir) { const [a, b] = e.split(',').map(Number); if (!dir.has(b + ',' + a)) { if (next.has(a)) return null; next.set(a, b) } }
  const loops = [], seen = new Set()
  for (const s of next.keys()) {
    if (seen.has(s)) continue
    const loop = []; let c = s
    while (!seen.has(c)) { seen.add(c); loop.push(c); c = next.get(c); if (c === undefined) return null }
    if (c !== s) return null
    loops.push(loop)
  }
  return loops
}
function mirrorCopy(m, ax, eps) {
  const n = nv(m), map = new Int32Array(n)
  for (let i = 0; i < n; i++) { const p = V3(m, i); if (Math.abs(p[ax]) <= eps) { p[ax] = 0; setV(m, i, p); map[i] = i } else { p[ax] = -p[ax]; map[i] = addV(m, p, i) } }
  const add = []
  for (const f of m.f) if (!f.every(i => map[i] === i)) add.push(rev(f.map(i => map[i])))
  m.f = m.f.concat(add)
}
// Split faces by the plane coord[ax] = off; returns verts on the plane.
function bisect(m, ax, off, clear) {
  const eps = 1e-6 * (Math.max(...bbox(m, allV(m)).s) || 1), d = i => m.v[3 * i + ax] - off, cut = new Map(), on = new Set()
  for (let i = 0; i < nv(m); i++) if (Math.abs(d(i)) <= eps) { m.v[3 * i + ax] = off; on.add(i) }
  const mid = (a, b) => {
    const k = ek(a, b)
    if (!cut.has(k)) { const t = d(a) / (d(a) - d(b)), i = addV(m, lerp(V3(m, a), V3(m, b), t), a); if (m.uv) { m.uv[2 * i] = m.uv[2 * a] + (m.uv[2 * b] - m.uv[2 * a]) * t; m.uv[2 * i + 1] = m.uv[2 * a + 1] + (m.uv[2 * b + 1] - m.uv[2 * a + 1]) * t } m.v[3 * i + ax] = off; cut.set(k, i); on.add(i) }
    return cut.get(k)
  }
  const out = []
  for (const f of m.f) {
    const s = f.map(i => on.has(i) ? 0 : Math.sign(d(i)))
    if (!s.some(x => x > 0) || !s.some(x => x < 0)) { out.push(f); continue }
    const P = [], N = []
    f.forEach((a, k) => {
      const b = f[(k + 1) % f.length], sa = s[k], sb = s[(k + 1) % f.length]
      if (sa >= 0) P.push(a); if (sa <= 0) N.push(a)
      if (sa * sb < 0) { const c = mid(a, b); P.push(c); N.push(c) }
    })
    if (P.length >= 3) out.push(P); if (N.length >= 3) out.push(N)
  }
  m.f = out
  if (clear) { const sg = clear === 'neg' ? -1 : 1; m.f = m.f.filter(f => !f.some(i => !on.has(i) && Math.sign(d(i)) === sg)) }
  return on
}
// 3D value noise, fbm in [-1, 1].
function hash3(x, y, z, s) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(s, 362437); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
function vnoise(x, y, z, s) {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), u = x - X, v = y - Y, w = z - Z, f = t => t * t * (3 - 2 * t), fu = f(u), fv = f(v), fw = f(w)
  const L = (a, b, t) => a + (b - a) * t, H = (i, j, k) => hash3(X + i, Y + j, Z + k, s)
  return L(L(L(H(0, 0, 0), H(1, 0, 0), fu), L(H(0, 1, 0), H(1, 1, 0), fu), fv), L(L(H(0, 0, 1), H(1, 0, 1), fu), L(H(0, 1, 1), H(1, 1, 1), fu), fv), fw)
}
function fbm(p, s, oct = 4) { let a = 0.5, t = 0, f = 1, n = 0; for (let o = 0; o < oct; o++) { n += a * vnoise(p[0] * f, p[1] * f, p[2] * f, s + o); t += a; a *= 0.5; f *= 2 } return (n / t) * 2 - 1 }
// Closest point on triangle (Ericson).
function closestTri(p, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap)
  if (d1 <= 0 && d2 <= 0) return a
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp)
  if (d3 >= 0 && d4 <= d3) return b
  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(a, mul(ab, d1 / (d1 - d3)))
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp)
  if (d6 >= 0 && d5 <= d6) return c
  const vb = d5 * d2 - d1 * d6
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(a, mul(ac, d2 / (d2 - d6)))
  const va = d3 * d6 - d5 * d4
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(b, mul(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))))
  const dn = 1 / (va + vb + vc)
  return add(a, add(mul(ab, vb * dn), mul(ac, vc * dn)))
}
// Incremental convex hull; returns triangles as indices into P, or null when P is flat.
export function hull(P) {
  const n = P.length; if (n < 4) return null
  const sz = Math.max(...bbox({ v: P.flat() }, [...Array(n).keys()]).s) || 1, eps = 1e-9 * sz
  let i0 = 0; for (let i = 1; i < n; i++) if (P[i][0] < P[i0][0]) i0 = i
  let i1 = -1, best = 0; for (let i = 0; i < n; i++) { const d = len(sub(P[i], P[i0])); if (d > best) { best = d; i1 = i } }
  if (i1 < 0) return null
  let i2 = -1; best = 0; for (let i = 0; i < n; i++) { const d = len(cross(sub(P[i1], P[i0]), sub(P[i], P[i0]))); if (d > best) { best = d; i2 = i } }
  if (i2 < 0) return null
  const pn = norm(cross(sub(P[i1], P[i0]), sub(P[i2], P[i0])))
  let i3 = -1; best = eps; for (let i = 0; i < n; i++) { const d = Math.abs(dot(pn, sub(P[i], P[i0]))); if (d > best) { best = d; i3 = i } }
  if (i3 < 0) return null
  const F = [], at = new Map(), cen = mul(add(add(P[i0], P[i1]), add(P[i2], P[i3])), 0.25)
  const mk = (a, b, c) => {
    const nn = norm(cross(sub(P[b], P[a]), sub(P[c], P[a])))
    if (dot(nn, sub(cen, P[a])) > 0) return mk(a, c, b)
    const f = { v: [a, b, c], n: nn, d: dot(nn, P[a]), on: true }; F.push(f)
    f.v.forEach((x, k) => at.set(x + ',' + f.v[(k + 1) % 3], f)); return f
  }
  mk(i0, i1, i2); mk(i0, i1, i3); mk(i0, i2, i3); mk(i1, i2, i3)
  const used = new Set([i0, i1, i2, i3])
  for (let p = 0; p < n; p++) {
    if (used.has(p)) continue
    const vis = F.filter(f => f.on && dot(f.n, P[p]) - f.d > eps)
    if (!vis.length) continue
    const hor = []
    for (const f of vis) f.on = false
    for (const f of vis) f.v.forEach((a, k) => { const b = f.v[(k + 1) % 3], t = at.get(b + ',' + a); if (t && t.on) hor.push([a, b]) })
    for (const [a, b] of hor) { const nn = norm(cross(sub(P[b], P[a]), sub(P[p], P[a]))), f = { v: [a, b, p], n: nn, d: dot(nn, P[a]), on: true }; F.push(f); f.v.forEach((x, k) => at.set(x + ',' + f.v[(k + 1) % 3], f)) }
  }
  return F.filter(f => f.on).map(f => f.v)
}
// Moves `ids` with fn(p, i) -> new p.
function deform(m, ids, fn) { const P = ids.map(i => fn(V3(m, i), i)); ids.forEach((i, k) => setV(m, i, P[k])) }
function smoothPass(m, ids, adj, f) {
  const P = ids.map(i => { const nb = [...adj[i]]; if (!nb.length) return V3(m, i); const c = mul(nb.reduce((s, j) => add(s, V3(m, j)), [0, 0, 0]), 1 / nb.length); return lerp(V3(m, i), c, f) })
  ids.forEach((i, k) => setV(m, i, P[k]))
}
// Area-preserving even offset per vertex.
function offsetDirs(m, faces) {
  const acc = new Map(), fn = faces.map(fi => fnormal(m, m.f[fi]))
  faces.forEach((fi, k) => { for (const i of m.f[fi]) { const a = acc.get(i) || [0, 0, 0]; acc.set(i, add(a, fn[k])) } })
  const out = new Map()
  for (const [i, s] of acc) {
    const d = norm(s); let mn = 1
    faces.forEach((fi, k) => { if (m.f[fi].includes(i)) mn = Math.min(mn, Math.max(0.35, dot(d, fn[k]))) })
    out.set(i, mul(d, 1 / mn))
  }
  return out
}
function solidify(m, faces, t, keepRegionSel) {
  const dirs = offsetDirs(m, faces), copy = new Map()
  for (const [i, d] of dirs) copy.set(i, addV(m, add(V3(m, i), mul(d, -t)), i))
  const added = faces.map(fi => rev(m.f[fi].map(i => copy.get(i))))
  const dir = new Set(); for (const fi of faces) { const f = m.f[fi]; f.forEach((a, k) => dir.add(a + ',' + f[(k + 1) % f.length])) }
  for (const fi of faces) { const f = m.f[fi]; f.forEach((a, k) => { const b = f[(k + 1) % f.length]; if (!dir.has(b + ',' + a)) added.push([b, a, copy.get(a), copy.get(b)]) }) }
  const base = m.f.length; m.f = m.f.concat(added)
  return keepRegionSel ? added.map((_, i) => base + i) : null
}
function insetEach(m, faces, frac, dist) {
  const drop = new Set(faces), added = [], inner = []
  for (const fi of faces) {
    const f = m.f[fi], c = faceC(m, f)
    const ins = f.map(i => { const p = V3(m, i), dd = len(sub(c, p)); const t = dist != null ? Math.min(0.45, dd > 1e-12 ? dist / dd : 0) : frac; return addV(m, lerp(p, c, t), i) })
    f.forEach((a, k) => { const b = f[(k + 1) % f.length]; added.push([a, b, ins[(k + 1) % f.length], ins[k]]) })
    inner.push(ins)
  }
  const ring = rebuild(m, drop, added.concat(inner))
  return { ring: ring.slice(0, added.length), inner: ring.slice(added.length) }
}
function spin(m, sel, p, height) {
  const faces = facesOf(m, sel), full = Math.abs(Math.abs(p.angle) - 360) < 1e-6, steps = Math.max(1, Math.round(p.steps)), A = p.angle * RAD, ax = axi(p.axis), [u, w] = others(ax)
  const c = [p.cx || 0, p.cy || 0, p.cz || 0], verts = [...new Set(faces.flatMap(fi => m.f[fi]))], loops = regionLoops(m, faces)
  if (!loops || !loops.length) throw new Error('Spin needs an open profile: select the faces to sweep')
  const ring = [new Map(verts.map(i => [i, i]))]
  for (let k = 1; k <= steps; k++) {
    if (full && k === steps) { ring.push(ring[0]); break }
    const th = A * k / steps, cs = Math.cos(th), sn = Math.sin(th), mp = new Map()
    for (const i of verts) { const q = sub(V3(m, i), c), r = [0, 0, 0]; r[u] = q[u] * cs - q[w] * sn; r[w] = q[u] * sn + q[w] * cs; r[ax] = q[ax] + height * k / steps; mp.set(i, addV(m, add(r, c), i)) }
    ring.push(mp)
  }
  const added = []
  for (const loop of loops) loop.forEach((a, j) => { const b = loop[(j + 1) % loop.length]; for (let k = 1; k <= steps; k++) added.push([ring[k - 1].get(a), ring[k - 1].get(b), ring[k].get(b), ring[k].get(a)]) })
  const drop = new Set(faces)
  if (!full) { for (const fi of faces) added.push(rev(m.f[fi]), m.f[fi].map(i => ring[steps].get(i))) }
  rebuild(m, drop, added); clean(m)
  if (!regionLoops(m, allF(m))?.length && signedVolume(m) < 0) m.f = m.f.map(rev)
}
function decimate(m, ratio) {
  const target = Math.max(4, Math.floor(m.f.length * ratio)), ids = allV(m), b = bbox(m, ids), big = Math.max(...b.s) || 1
  const run = (cell, apply) => {
    const key = new Map(), rep = new Int32Array(nv(m))
    for (const i of ids) { const k = Math.floor((m.v[3 * i] - b.lo[0]) / cell) + ',' + Math.floor((m.v[3 * i + 1] - b.lo[1]) / cell) + ',' + Math.floor((m.v[3 * i + 2] - b.lo[2]) / cell); if (!key.has(k)) key.set(k, i); rep[i] = key.get(k) }
    const seen = new Set(), F = []
    for (const f of m.f) { const g = f.map(i => rep[i]).filter((x, k, a) => x !== a[(k + 1) % a.length]); if (new Set(g).size < 3 || g.length !== new Set(g).size) continue; const s = [...g].sort((x, y) => x - y).join(','); if (seen.has(s)) continue; seen.add(s); F.push(g) }
    if (apply) {
      const sum = new Map()
      for (const i of ids) { const r = rep[i], s = sum.get(r) || [0, 0, 0, 0]; s[0] += m.v[3 * i]; s[1] += m.v[3 * i + 1]; s[2] += m.v[3 * i + 2]; s[3]++; sum.set(r, s) }
      for (const [r, s] of sum) setV(m, r, [s[0] / s[3], s[1] / s[3], s[2] / s[3]])
      m.f = F; clean(m)
    }
    return F.length
  }
  let lo = 0, hi = big
  for (let it = 0; it < 22; it++) { const mid = (lo + hi) / 2; if (run(mid) > target) lo = mid; else hi = mid }
  run(hi, true)
}
function project(m, mode, p) {
  const n = nv(m); if (!m.uv || m.uv.length !== n * 2) m.uv = new Array(n * 2).fill(0)
  const b = bbox(m, allV(m)), s = (p.scale || 1) / (Math.max(...b.s) || 1), vn = vnormals(m), ax = axi(p.axis), [u, w] = others(ax)
  for (let i = 0; i < n; i++) {
    const q = sub(V3(m, i), b.c); let U, W
    if (mode === 'box') { const nn = vn(i).map(Math.abs), k = nn[0] > nn[1] && nn[0] > nn[2] ? 0 : nn[1] > nn[2] ? 1 : 2, [a, c] = others(k); U = q[a] * s + 0.5; W = q[c] * s + 0.5 }
    else if (mode === 'planar') { U = q[u] * s + 0.5; W = q[w] * s + 0.5 }
    else if (mode === 'cylinder') { U = (Math.atan2(q[w], q[u]) / (2 * Math.PI) + 0.5) * (p.scale || 1); W = q[ax] * s + 0.5 }
    else { const r = len(q) || 1; U = (Math.atan2(q[w], q[u]) / (2 * Math.PI) + 0.5) * (p.scale || 1); W = (1 - Math.acos(Math.max(-1, Math.min(1, q[ax] / r))) / Math.PI) * (p.scale || 1) }
    m.uv[2 * i] = U; m.uv[2 * i + 1] = W
  }
}
const vsel = ids => ({ kind: 'vert', ids: [...ids] })
const fsel = ids => ({ kind: 'face', ids: [...ids] })
// Faces fully inside a vert set.
const facesIn = (m, vs) => allF(m).filter(fi => m.f[fi].every(i => vs.has(i)))

// Implementations by id; names, groups and params live in modlist.js (loaded at boot, this file loads on first use).
export const RUN = {}
const op = (id, run) => { if (!META[id]) throw new Error('modlist.js lacks ' + id); RUN[id] = run }

// ---------- deform ----------
op('toSphere', (m, sel, p) => { const ids = vertsOf(m, sel), b = bbox(m, ids), r = ids.reduce((s, i) => s + len(sub(V3(m, i), b.c)), 0) / (ids.length || 1); deform(m, ids, q => lerp(q, add(b.c, mul(norm(sub(q, b.c)), r)), p.factor)) })
op('cast', (m, sel, p) => {
  const ids = vertsOf(m, sel), b = bbox(m, ids), ax = axi(p.axis), [u, w] = others(ax)
  const meas = q => p.shape === 'cuboid' ? Math.max(...q.map(Math.abs)) : p.shape === 'cylinder' ? Math.hypot(q[u], q[w]) : len(q)
  const r = ids.reduce((s, i) => s + meas(sub(V3(m, i), b.c)), 0) / (ids.length || 1)
  deform(m, ids, q => { const d = sub(q, b.c), k = meas(d); if (k < 1e-12) return q; const t = d.slice(); if (p.shape === 'cylinder') { const s = r / k; t[u] *= s; t[w] *= s } else for (let j = 0; j < 3; j++) t[j] *= r / k; return lerp(q, add(b.c, t), p.factor) })
})
op('shear', (m, sel, p) => { const ids = vertsOf(m, sel), c = bbox(m, ids).c, a = axi(p.axis), g = axi(p.along); deform(m, ids, q => { q[a] += p.factor * (q[g] - c[g]); return q }) })
op('bend', (m, sel, p) => {
  const ids = vertsOf(m, sel), b = bbox(m, ids), a = axi(p.axis), t = axi(p.toward) === a ? others(a)[0] : axi(p.toward), A = p.angle * RAD
  if (Math.abs(A) < 1e-9 || b.s[a] < 1e-12) return
  const R = b.s[a] / A, o = b.lo[a]
  deform(m, ids, q => { const th = (q[a] - o) / R, d = R - (q[t] - b.c[t]); q[a] = o + d * Math.sin(th); q[t] = b.c[t] + R - d * Math.cos(th); return q })
})
op('twist', (m, sel, p) => { const ids = vertsOf(m, sel), b = bbox(m, ids), a = axi(p.axis), [u, w] = others(a); deform(m, ids, q => { const th = p.angle * RAD * ((q[a] - b.lo[a]) / (b.s[a] || 1) - 0.5), cs = Math.cos(th), sn = Math.sin(th), x = q[u] - b.c[u], z = q[w] - b.c[w]; q[u] = b.c[u] + x * cs - z * sn; q[w] = b.c[w] + x * sn + z * cs; return q }) })
op('taper', (m, sel, p) => { const ids = vertsOf(m, sel), b = bbox(m, ids), a = axi(p.axis); deform(m, ids, q => { const s = Math.max(0, 1 + p.factor * ((q[a] - b.lo[a]) / (b.s[a] || 1))); for (const k of others(a)) q[k] = b.c[k] + (q[k] - b.c[k]) * s; return q }) })
op('stretch', (m, sel, p) => { const ids = vertsOf(m, sel), c = bbox(m, ids).c, a = axi(p.axis), s = 1 + p.factor, r = 1 / Math.sqrt(Math.max(1e-6, s)); deform(m, ids, q => { for (let k = 0; k < 3; k++) q[k] = c[k] + (q[k] - c[k]) * (k === a ? s : r); return q }) })
op('warp', (m, sel, p) => {
  const ids = vertsOf(m, sel), b = bbox(m, ids), a = axi(p.axis), [u, w] = others(a), c = [p.cx, p.cy, p.cz], A = p.angle * RAD
  if (Math.abs(A) < 1e-9 || b.s[u] < 1e-12) return
  const R0 = Math.max(b.s[u] / Math.abs(A), Math.abs(b.c[w] - c[w]))
  deform(m, ids, q => { const ph = A * ((q[u] - b.lo[u]) / b.s[u] - 0.5), r = R0 + (q[w] - b.c[w]); q[u] = c[u] + r * Math.sin(ph); q[w] = c[w] + r * Math.cos(ph); return q })
})
op('wave', (m, sel, p) => {
  const ids = vertsOf(m, sel), c = bbox(m, ids).c, a = axi(p.axis), [u, w] = others(a)
  deform(m, ids, q => { const d = p.mode === 'ripple' ? Math.hypot(q[u] - c[u], q[w] - c[w]) : q[axi(p.mode)] - c[axi(p.mode)]; q[a] += p.amp * Math.sin(2 * Math.PI * d / p.length + p.phase * RAD); return q })
})
op('displace', (m, sel, p) => { const ids = vertsOf(m, sel), vn = vnormals(m); deform(m, ids, (q, i) => add(q, mul(vn(i), p.strength * fbm(mul(q, 1 / p.scale), p.seed | 0)))) })
op('randomize', (m, sel, p) => {
  const ids = vertsOf(m, sel), r = rng(p.seed), vn = vnormals(m)
  deform(m, ids, (q, i) => { let d; do { d = [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1] } while (len(d) > 1); const along = mul(vn(i), (r() * 2 - 1)); return add(q, mul(lerp(d, along, p.normal), p.amount)) })
})
op('shrinkFatten', (m, sel, p) => { const ids = vertsOf(m, sel), dirs = offsetDirs(m, facesOf(m, { faces: sel.verts ? facesIn(m, new Set(ids)) : null })), vn = vnormals(m); deform(m, ids, (q, i) => add(q, mul(dirs.get(i) || vn(i), p.dist))) })
op('pushPull', (m, sel, p) => { const ids = vertsOf(m, sel), c = bbox(m, ids).c; deform(m, ids, q => add(q, mul(norm(sub(q, c)), p.dist))) })
op('smoothVerts', (m, sel, p) => { const ids = vertsOf(m, sel), adj = neighbours(m); for (let k = 0; k < p.iter; k++) smoothPass(m, ids, adj, p.factor) })
op('smoothKeep', (m, sel, p) => { const ids = vertsOf(m, sel), adj = neighbours(m); for (let k = 0; k < p.iter; k++) { smoothPass(m, ids, adj, p.factor); smoothPass(m, ids, adj, -p.factor * 1.06) } })
op('flatten', (m, sel, p) => {
  const ids = vertsOf(m, sel), c = mul(ids.reduce((s, i) => add(s, V3(m, i)), [0, 0, 0]), 1 / (ids.length || 1)), vn = vnormals(m)
  const n = p.axis === 'auto' ? norm(ids.reduce((s, i) => add(s, vn(i)), [0, 0, 0])) : [0, 1, 2].map(k => +(k === axi(p.axis)))
  if (len(n) < 1e-9) return
  deform(m, ids, q => sub(q, mul(n, dot(sub(q, c), n) * p.factor)))
})
op('shrinkwrap', (m, sel, p) => {
  const T = sel.target; if (!T || !T.f.length) throw new Error('Shrinkwrap needs a target mesh: pass {target: <mesh object id>}')
  const tris = []; for (const f of T.f) for (let i = 1; i + 1 < f.length; i++) tris.push([V3(T, f[0]), V3(T, f[i]), V3(T, f[i + 1])])
  const tb = bbox(T, allV(T)), cell = (Math.max(...tb.s) || 1) / Math.max(4, Math.cbrt(tris.length) * 1.5), grid = new Map(), gk = (x, y, z) => x + ',' + y + ',' + z, ci = (x, k) => Math.floor((x - tb.lo[k]) / cell)
  tris.forEach((t, ti) => { const lo = [0, 1, 2].map(k => ci(Math.min(t[0][k], t[1][k], t[2][k]), k)), hi = [0, 1, 2].map(k => ci(Math.max(t[0][k], t[1][k], t[2][k]), k)); for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) { const k = gk(x, y, z); (grid.get(k) || grid.set(k, []).get(k)).push(ti) } })
  const maxR = Math.ceil((Math.max(...tb.s) + 1e-9) / cell) + 2
  deform(m, vertsOf(m, sel), q => {
    const c = [0, 1, 2].map(k => ci(q[k], k)); let best = null, bd = Infinity
    for (let r = 0; r <= maxR * 3; r++) {
      if (best && (r - 1) * cell > Math.sqrt(bd)) break
      for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) {
        if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) !== r) continue
        for (const ti of grid.get(gk(c[0] + x, c[1] + y, c[2] + z)) || []) { const t = tris[ti], h = closestTri(q, ...t), d = dot(sub(q, h), sub(q, h)); if (d < bd) { bd = d; best = [h, ti] } }
      }
    }
    if (!best) return q
    const t = tris[best[1]], n = norm(cross(sub(t[1], t[0]), sub(t[2], t[0])))
    return lerp(q, add(best[0], mul(n, p.offset)), p.factor)
  })
})

// ---------- generate ----------
op('solidify', (m, sel, p) => { solidify(m, facesOf(m, sel), p.thickness) })
op('wireframe', (m, sel, p) => {
  const faces = facesOf(m, sel), { ring, inner } = insetEach(m, faces, 0, p.thickness)
  const innerSet = new Set(inner), map = new Map(); let k = 0
  m.f = m.f.filter((_, i) => { if (innerSet.has(i)) return false; map.set(i, k++); return true })
  clean(m); solidify(m, ring.map(i => map.get(i)), p.thickness)
})
op('triangulate', (m, sel) => {
  const faces = new Set(facesOf(m, sel)), out = []
  m.f.forEach((f, fi) => {
    if (!faces.has(fi) || f.length === 3) { out.push(f); return }
    if (f.length === 4) { const d0 = len(sub(V3(m, f[0]), V3(m, f[2]))), d1 = len(sub(V3(m, f[1]), V3(m, f[3]))); if (d0 <= d1) out.push([f[0], f[1], f[2]], [f[0], f[2], f[3]]); else out.push([f[1], f[2], f[3]], [f[1], f[3], f[0]]); return }
    for (let i = 1; i + 1 < f.length; i++) out.push([f[0], f[i], f[i + 1]])
  })
  m.f = out
})
op('trisToQuads', (m, sel, p) => {
  const faces = facesOf(m, sel).filter(fi => m.f[fi].length === 3), he = new Map(), cand = []
  for (const fi of faces) { const f = m.f[fi]; f.forEach((a, k) => he.set(a + ',' + f[(k + 1) % 3], fi)) }
  for (const fi of faces) {
    const f = m.f[fi]
    for (let k = 0; k < 3; k++) {
      const x = f[k], y = f[(k + 1) % 3], gi = he.get(y + ',' + x); if (gi === undefined || gi <= fi) continue
      const g = m.f[gi], pv = f[(k + 2) % 3], qv = g.find(i => i !== x && i !== y), quad = [x, qv, y, pv]
      const n1 = fnormal(m, f), n2 = fnormal(m, g), ang = Math.acos(Math.max(-1, Math.min(1, dot(n1, n2)))) / RAD
      if (ang > p.angle) continue
      const n = norm(add(n1, n2)); let convex = true
      for (let j = 0; j < 4; j++) { const a = V3(m, quad[j]), b = V3(m, quad[(j + 1) % 4]), c = V3(m, quad[(j + 2) % 4]); if (dot(cross(sub(b, a), sub(c, b)), n) <= 1e-12) convex = false }
      if (!convex) continue
      const e = [0, 1, 2, 3].map(j => len(sub(V3(m, quad[j]), V3(m, quad[(j + 1) % 4])))), sq = Math.max(...e) / (Math.min(...e) || 1e-12)
      cand.push([ang + sq * 2, fi, gi, quad])
    }
  }
  cand.sort((a, b) => a[0] - b[0])
  const used = new Set(), added = []
  for (const [, fi, gi, q] of cand) { if (used.has(fi) || used.has(gi)) continue; used.add(fi); used.add(gi); added.push(q) }
  return fsel(rebuild(m, used, added))
})
op('poke', (m, sel, p) => {
  const faces = facesOf(m, sel), added = [], cs = []
  for (const fi of faces) { const f = m.f[fi], c = addV(m, add(faceC(m, f), mul(fnormal(m, f), p.offset)), f[0]); cs.push(c); if (m.uv) { m.uv[2 * c] = f.reduce((s, i) => s + m.uv[2 * i], 0) / f.length; m.uv[2 * c + 1] = f.reduce((s, i) => s + m.uv[2 * i + 1], 0) / f.length } f.forEach((a, k) => added.push([a, f[(k + 1) % f.length], c])) }
  rebuild(m, new Set(faces), added); return vsel(cs)
})
op('extrudeEach', (m, sel, p) => {
  const faces = facesOf(m, sel), added = [], tops = []
  for (const fi of faces) { const f = m.f[fi], n = mul(fnormal(m, f), p.dist), top = f.map(i => addV(m, add(V3(m, i), n), i)); f.forEach((a, k) => added.push([a, f[(k + 1) % f.length], top[(k + 1) % f.length], top[k]])); tops.push(top) }
  const ids = rebuild(m, new Set(faces), added.concat(tops)); return fsel(ids.slice(added.length))
})
op('insetEach', (m, sel, p) => fsel(insetEach(m, facesOf(m, sel), p.amount).inner))
op('duplicate', (m, sel, p) => {
  const faces = facesOf(m, sel), map = new Map(), o = [p.dx, p.dy, p.dz], base = m.f.length
  for (const fi of faces) for (const i of m.f[fi]) if (!map.has(i)) map.set(i, addV(m, add(V3(m, i), o), i))
  m.f = m.f.concat(faces.map(fi => m.f[fi].map(i => map.get(i)))); return fsel(faces.map((_, k) => base + k))
})
op('bridge', (m, sel) => {
  const faces = sel.faces || []; if (faces.length !== 2) throw new Error('Select exactly 2 faces to bridge')
  const L1 = m.f[faces[0]], L2 = m.f[faces[1]], n = L1.length; if (L2.length !== n) throw new Error('Bridge needs 2 faces with the same corner count')
  let bk = 0, bd = Infinity
  for (let k = 0; k < n; k++) { let d = 0; for (let i = 0; i < n; i++) d += len(sub(V3(m, L1[i]), V3(m, L2[((k - i) % n + n) % n]))); if (d < bd) { bd = d; bk = k } }
  const at = i => L2[((bk - i) % n + n) % n], added = []
  for (let i = 0; i < n; i++) added.push([L1[i], L1[(i + 1) % n], at(i + 1), at(i)])
  return fsel(rebuild(m, new Set(faces), added))
})
op('spin', (m, sel, p) => spin(m, sel, p, 0))
op('screw', (m, sel, p) => spin(m, sel, p, p.height))
op('array', (m, sel, p) => {
  const faces = facesOf(m, sel), vs = [...new Set(faces.flatMap(fi => m.f[fi]))], b = bbox(m, vs), off = [p.rx * b.s[0], p.ry * b.s[1], p.rz * b.s[2]], src = faces.map(fi => m.f[fi])
  for (let k = 1; k < Math.round(p.count); k++) { const map = new Map(vs.map(i => [i, addV(m, add(V3(m, i), mul(off, k)), i)])); for (const f of src) m.f.push(f.map(i => map.get(i))) }
  if (p.merge === 'yes') mergeDist(m, 1e-5 * (Math.max(...b.s) || 1))
})
op('mirror', (m, sel, p) => { const b = bbox(m, allV(m)); mirrorCopy(m, axi(p.axis), 1e-5 * (Math.max(...b.s) || 1)) })
op('symmetrize', (m, sel, p) => { const a = axi(p.axis), b = bbox(m, allV(m)); bisect(m, a, 0, p.dir === '+' ? 'neg' : 'pos'); clean(m); mirrorCopy(m, a, 1e-5 * (Math.max(...b.s) || 1)) })
op('bisect', (m, sel, p) => { const on = bisect(m, axi(p.axis), p.offset, p.clear === 'none' ? null : p.clear), keep = [...on]; const map = clean(m); return vsel(keep.map(i => map[i]).filter(i => i >= 0)) })
op('convexHull', (m, sel) => {
  const ids = vertsOf(m, sel), H = hull(ids.map(i => V3(m, i))); if (!H) throw new Error('Convex hull needs 4+ points that are not flat')
  if (sel.verts && sel.verts.size) { const map = new Map(); const base = m.f.length; for (const t of H) m.f.push(t.map(j => map.get(ids[j]) ?? map.set(ids[j], addV(m, V3(m, ids[j]), ids[j])).get(ids[j]))); return fsel(H.map((_, k) => base + k)) }
  m.f = H.map(t => t.map(j => ids[j])); clean(m)
})
op('fillHoles', m => {
  const dir = new Set(); for (const f of m.f) f.forEach((a, k) => dir.add(a + ',' + f[(k + 1) % f.length]))
  const next = new Map(); for (const e of dir) { const [a, b] = e.split(',').map(Number); if (!dir.has(b + ',' + a) && !next.has(b)) next.set(b, a) }
  const seen = new Set(), added = []
  for (const s of next.keys()) { if (seen.has(s)) continue; const loop = []; let c = s; while (c !== undefined && !seen.has(c)) { seen.add(c); loop.push(c); c = next.get(c) } if (c === s && loop.length >= 3) added.push(loop) }
  return fsel(rebuild(m, new Set(), added))
})

// ---------- clean up ----------
op('dissolveFaces', (m, sel) => {
  const faces = sel.faces || []; if (faces.length < 2) throw new Error('Select 2+ connected faces')
  const loops = regionLoops(m, faces); if (!loops || loops.length !== 1) throw new Error('Faces must form one region without holes')
  return fsel(rebuild(m, new Set(faces), [loops[0]]))
})
// Union-find over faces joined across `join(edgeKey, fa, fb)`; each group with one boundary loop becomes an ngon.
function dissolveGroups(m, join) {
  const par = allF(m), find = x => { while (par[x] !== x) x = par[x] = par[par[x]]; return x }
  for (const [k, fs] of edgeFaces(m)) if (fs.length === 2 && join(k, fs[0], fs[1])) par[find(fs[0])] = find(fs[1])
  const groups = new Map(); for (const fi of allF(m)) { const r = find(fi); (groups.get(r) || groups.set(r, []).get(r)).push(fi) }
  const drop = new Set(), added = []
  for (const g of groups.values()) { if (g.length < 2) continue; const L = regionLoops(m, g); if (L && L.length === 1 && L[0].length >= 3) { g.forEach(fi => drop.add(fi)); added.push(L[0]) } }
  const ids = rebuild(m, drop, added); clean(m); return fsel(ids)
}
op('dissolveEdges', (m, sel) => { const es = new Set(sel.edges || []); if (!es.size) throw new Error('Select edges to dissolve'); return dissolveGroups(m, k => es.has(k)) })
op('limitedDissolve', (m, sel, p) => { const fn = m.f.map(f => fnormal(m, f)), c = Math.cos(p.angle * RAD), only = sel.faces && sel.faces.length ? new Set(sel.faces) : null; return dissolveGroups(m, (k, a, b) => (!only || (only.has(a) && only.has(b))) && dot(fn[a], fn[b]) >= c) })
op('edgeSplit', (m, sel, p) => {
  const fn = m.f.map(f => fnormal(m, f)), c = Math.cos(p.angle * RAD), corner = [], par = []
  m.f.forEach((f, fi) => { corner[fi] = f.map(() => par.push(par.length) - 1) })
  const find = x => { while (par[x] !== x) x = par[x] = par[par[x]]; return x }, at = (fi, v) => corner[fi][m.f[fi].indexOf(v)]
  for (const [k, fs] of edgeFaces(m)) { if (fs.length !== 2 || dot(fn[fs[0]], fn[fs[1]]) < c) continue; const [a, b] = k.split('_').map(Number); par[find(at(fs[0], a))] = find(at(fs[1], a)); par[find(at(fs[0], b))] = find(at(fs[1], b)) }
  const first = new Map(), newId = new Map()
  m.f = m.f.map((f, fi) => f.map((v, k) => { const r = find(corner[fi][k]), key = v + ':' + r; if (!first.has(v)) { first.set(v, r); return v } if (first.get(v) === r) return v; if (!newId.has(key)) newId.set(key, addV(m, V3(m, v), v)); return newId.get(key) }))
})
op('splitFaces', (m, sel) => {
  const faces = sel.faces || []; if (!faces.length) throw new Error('Select faces to split off'); const S = new Set(faces), outside = new Set()
  m.f.forEach((f, fi) => { if (!S.has(fi)) f.forEach(i => outside.add(i)) })
  const map = new Map(); for (const fi of faces) m.f[fi] = m.f[fi].map(i => outside.has(i) ? (map.get(i) ?? map.set(i, addV(m, V3(m, i), i)).get(i)) : i)
  return fsel(faces)
})
op('removeIslands', (m, sel, p) => {
  const par = allV(m), find = x => { while (par[x] !== x) x = par[x] = par[par[x]]; return x }
  for (const f of m.f) for (let k = 1; k < f.length; k++) par[find(f[k])] = find(f[0])
  const cnt = new Map(); for (const f of m.f) { const r = find(f[0]); cnt.set(r, (cnt.get(r) || 0) + 1) }
  m.f = m.f.filter(f => cnt.get(find(f[0])) >= p.faces); clean(m)
})
op('cleanUp', (m, sel, p) => {
  mergeDist(m, p.dist); const b = bbox(m, allV(m)), eps = 1e-12 * (Math.max(...b.s) || 1) ** 2, seen = new Set()
  m.f = m.f.filter(f => { const k = [...f].sort((a, b) => a - b).join(','); if (seen.has(k) || faceArea(m, f) <= eps) return false; seen.add(k); return true }); clean(m)
})

// ---------- UV ----------
op('uvBox', (m, sel, p) => project(m, 'box', p))
op('uvPlanar', (m, sel, p) => project(m, 'planar', p))
op('uvCylinder', (m, sel, p) => project(m, 'cylinder', p))
op('uvSphere', (m, sel, p) => project(m, 'sphere', p))

// ---------- select (no undo step; returns the new selection) ----------
const sop = op
sop('selectMore', (m, sel) => { const vs = new Set(sel.verts || []); const out = new Set(vs); for (const f of m.f) if (f.some(i => vs.has(i))) f.forEach(i => out.add(i)); return vsel(out) })
sop('selectLess', (m, sel) => { const vs = new Set(sel.verts || []), adj = neighbours(m); return vsel([...vs].filter(i => [...adj[i]].every(j => vs.has(j)))) })
sop('selectInvert', (m, sel) => { const vs = new Set(sel.verts || []); return vsel(allV(m).filter(i => !vs.has(i))) })
sop('selectRandom', (m, sel, p) => { const r = rng(p.seed); return fsel(allF(m).filter(() => r() < p.ratio)) })
sop('selectNonManifold', m => { const out = new Set(); for (const [k, fs] of edgeFaces(m)) if (fs.length !== 2) k.split('_').forEach(i => out.add(+i)); return vsel(out) })
sop('selectBoundary', (m, sel) => { const faces = sel.faces && sel.faces.length ? sel.faces : allF(m), out = new Set(); for (const [k, fs] of edgeFaces(m, faces)) if (fs.length === 1) k.split('_').forEach(i => out.add(+i)); return vsel(out) })
sop('selectSharp', (m, sel, p) => { const c = Math.cos(p.angle * RAD), out = new Set(); for (const [k, fs] of edgeFaces(m)) if (fs.length === 2 && dot(fnormal(m, m.f[fs[0]]), fnormal(m, m.f[fs[1]])) < c) k.split('_').forEach(i => out.add(+i)); return vsel(out) })
sop('selectLinkedFlat', (m, sel, p) => {
  const seeds = sel.faces || []; if (!seeds.length) throw new Error('Select a face first')
  const c = Math.cos(p.angle * RAD), fn = m.f.map(f => fnormal(m, f)), ef = edgeFaces(m), seen = new Set(seeds), st = [...seeds]
  while (st.length) { const fi = st.pop(), f = m.f[fi]; f.forEach((a, k) => { for (const g of ef.get(ek(a, f[(k + 1) % f.length])) || []) if (!seen.has(g) && dot(fn[fi], fn[g]) >= c) { seen.add(g); st.push(g) } }) }
  return fsel(seen)
})
sop('selectSimilarNormal', (m, sel, p) => { const seeds = sel.faces || []; if (!seeds.length) throw new Error('Select a face first'); const n = norm(seeds.reduce((s, fi) => add(s, fnormal(m, m.f[fi])), [0, 0, 0])), c = Math.cos(p.angle * RAD); return fsel(allF(m).filter(fi => dot(fnormal(m, m.f[fi]), n) >= c)) })
sop('selectSide', (m, sel, p) => { const a = axi(p.axis), s = p.side === '+' ? 1 : -1, eps = 1e-6; return vsel(allV(m).filter(i => m.v[3 * i + a] * s > eps)) })
sop('selectLoop', (m, sel) => {
  const e = (sel.edges || [])[0]; if (!e) throw new Error('Select an edge first')
  const adj = neighbours(m), F = m.f.map(f => new Set(f)), ef = edgeFaces(m), out = new Set(String(e).split('_').map(Number))
  const step = (a, b) => { if (adj[b].size !== 4) return -1; const fs = (ef.get(ek(a, b)) || []).map(fi => F[fi]); const c = [...adj[b]].filter(x => x !== a && !fs.some(s => s.has(x))); return c.length === 1 ? c[0] : -1 }
  const [x, y] = [...out]
  for (const [a0, b0] of [[x, y], [y, x]]) { let a = a0, b = b0; for (let g = 0; g < 100000; g++) { const c = step(a, b); if (c < 0 || out.has(c)) break; out.add(c); a = b; b = c } }
  return vsel(out)
})

// ---------- quality decimate: quadric edge collapse (Garland-Heckbert) with flip and link checks ----------
function decimateQEM(m, ratio) {
  m.f = m.f.flatMap(f => f.length === 3 ? [f] : f.slice(1, -1).map((_, i) => [f[0], f[i + 1], f[i + 2]]))
  const n = nv(m), Q = new Float64Array(n * 10), vf = Array.from({ length: n }, () => new Set()), dead = new Uint8Array(m.f.length), gone = new Uint8Array(n), ver = new Uint32Array(n)
  const addQ = (i, a, b, c, d, w) => { const o = i * 10; Q[o] += a * a * w; Q[o + 1] += a * b * w; Q[o + 2] += a * c * w; Q[o + 3] += a * d * w; Q[o + 4] += b * b * w; Q[o + 5] += b * c * w; Q[o + 6] += b * d * w; Q[o + 7] += c * c * w; Q[o + 8] += c * d * w; Q[o + 9] += d * d * w }
  const big = Math.max(...bbox(m, allV(m)).s) || 1
  m.f.forEach((f, fi) => {
    const a = V3(m, f[0]), cr = cross(sub(V3(m, f[1]), a), sub(V3(m, f[2]), a)), ar = len(cr); if (ar < 1e-20) return
    const nn = mul(cr, 1 / ar), d = -dot(nn, a); for (const i of f) { addQ(i, nn[0], nn[1], nn[2], d, ar); vf[i].add(fi) }
  })
  m.f.forEach((f, fi) => { if (!vf[f[0]].has(fi)) for (const i of f) vf[i].add(fi) })
  // open borders keep their outline: a stiff plane through each border edge, perpendicular to its face
  for (const [k, fs] of edgeFaces(m)) if (fs.length === 1) { const [a, b] = k.split('_').map(Number), e = sub(V3(m, b), V3(m, a)), nn = norm(cross(e, fnormal(m, m.f[fs[0]]))), d = -dot(nn, V3(m, a)), w = dot(e, e) * 100; addQ(a, nn[0], nn[1], nn[2], d, w); addQ(b, nn[0], nn[1], nn[2], d, w) }
  const err = (o1, o2, p) => { let e = 0; const q = j => Q[o1 + j] + Q[o2 + j], [x, y, z] = p; e = q(0) * x * x + 2 * q(1) * x * y + 2 * q(2) * x * z + 2 * q(3) * x + q(4) * y * y + 2 * q(5) * y * z + 2 * q(6) * y + q(7) * z * z + 2 * q(8) * z + q(9); return e }
  const best = (i, j) => { const a = V3(m, i), b = V3(m, j), c = lerp(a, b, 0.5); let bp = c, be = err(i * 10, j * 10, c); for (const p of [a, b]) { const e = err(i * 10, j * 10, p); if (e < be - 1e-15 * big) { be = e; bp = p } } return [be, bp] }
  const H = [], push = x => { H.push(x); let i = H.length - 1; while (i) { const p = (i - 1) >> 1; if (H[p][0] <= H[i][0]) break; [H[p], H[i]] = [H[i], H[p]]; i = p } }
  const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < H.length && H[l][0] < H[s][0]) s = l; if (r < H.length && H[r][0] < H[s][0]) s = r; if (s === i) break; [H[s], H[i]] = [H[i], H[s]]; i = s } } return top }
  const nb = i => { const s = new Set(); for (const fi of vf[i]) for (const x of m.f[fi]) if (x !== i) s.add(x); return s }
  const queue = (i, j) => { const [e, p] = best(i, j); push([e, i, j, ver[i], ver[j], p]) }
  for (const k of edgeFaces(m).keys()) { const [a, b] = k.split('_').map(Number); queue(a, b) }
  let alive = m.f.length - [...dead].filter(Boolean).length; const target = Math.max(4, Math.floor(alive * ratio))
  while (alive > target && H.length) {
    const [, i, j, vi, vj, p] = pop()
    if (gone[i] || gone[j] || ver[i] !== vi || ver[j] !== vj) continue
    const ni = nb(i), nj = nb(j); if (!ni.has(j)) continue
    let common = 0; for (const x of ni) if (nj.has(x)) common++
    if (common > 2) continue
    let flips = false
    for (const fi of [...vf[i], ...vf[j]]) { const f = m.f[fi]; if (f.includes(i) && f.includes(j)) continue; const g = f.map(x => x === i || x === j ? -1 : x), P3 = g.map((x, k) => x < 0 ? p : V3(m, f[k])), n0 = fnormal(m, f), n1 = norm(cross(sub(P3[1], P3[0]), sub(P3[2], P3[0]))); if (dot(n0, n1) < 0.2) { flips = true; break } }
    if (flips) continue
    for (const fi of vf[j]) { const f = m.f[fi]; if (f.includes(i)) { dead[fi] = 1; alive--; for (const x of f) if (x !== j) vf[x].delete(fi) } else { m.f[fi] = f.map(x => x === j ? i : x); vf[i].add(fi) } }
    for (const fi of [...vf[i]]) if (dead[fi]) vf[i].delete(fi)
    gone[j] = 1; vf[j].clear(); setV(m, i, p); for (let k = 0; k < 10; k++) Q[i * 10 + k] += Q[j * 10 + k]; ver[i]++
    for (const x of nb(i)) queue(i, x)
  }
  m.f = m.f.filter((_, fi) => !dead[fi]); clean(m)
}
op('decimate', (m, sel, p) => p.method === 'fast' ? decimate(m, p.ratio) : decimateQEM(m, p.ratio))
// ---------- more edit tools ----------
op('autoSmooth', (m, sel, p) => { RUN.edgeSplit(m, sel, { angle: p.angle }); return { smooth: true } })
op('connect', (m, sel) => {
  const vs = sel.verts; if (!vs || vs.size < 2) throw new Error('Select 2 vertices on one face')
  const out = [], made = []
  for (const f of m.f) { const k = f.map((x, i) => vs.has(x) ? i : -1).filter(i => i >= 0); if (k.length !== 2 || (k[1] - k[0] === 1) || (k[0] === 0 && k[1] === f.length - 1)) { out.push(f); continue } out.push(f.slice(k[0], k[1] + 1), [...f.slice(k[1]), ...f.slice(0, k[0] + 1)]); made.push(ek(f[k[0]], f[k[1]])) }
  if (!made.length) throw new Error('Select 2 vertices that share a face but no edge')
  m.f = out; return { kind: 'edge', ids: made }
})
op('makeCircle', (m, sel, p) => {
  const vs = sel.verts; if (!vs || vs.size < 3) throw new Error('Select a loop of 3+ vertices')
  const adj = neighbours(m), done = new Set(); let n = 0
  for (const s0 of vs) {
    if (done.has(s0)) continue
    const loop = [s0]; done.add(s0); let c = s0
    for (;;) { const nx = [...adj[c]].find(x => vs.has(x) && !done.has(x)); if (nx === undefined) break; loop.push(nx); done.add(nx); c = nx }
    if (loop.length < 3) continue
    const P = loop.map(i => V3(m, i)), ctr = mul(P.reduce(add, [0, 0, 0]), 1 / P.length)
    let nn = [0, 0, 0]; for (let i = 0; i < P.length; i++) nn = add(nn, cross(sub(P[i], ctr), sub(P[(i + 1) % P.length], ctr))); nn = norm(nn)
    const r = P.reduce((s, q) => s + len(sub(q, ctr)), 0) / P.length, u = norm(sub(P[0], add(ctr, mul(nn, dot(sub(P[0], ctr), nn))))), w = cross(nn, u)
    loop.forEach((i, k) => { const th = 2 * Math.PI * k / loop.length; setV(m, i, lerp(P[k], add(ctr, add(mul(u, r * Math.cos(th)), mul(w, r * Math.sin(th)))), p.factor)) }); n++
  }
  if (!n) throw new Error('Selected vertices do not form a loop')
})
op('greeble', (m, sel, p) => {
  const faces = facesOf(m, sel), r = rng(p.seed), drop = new Set(), added = []
  for (const fi of faces) {
    if (r() > p.amount) continue
    const f = m.f[fi], c = faceC(m, f), nn = fnormal(m, f), t = 0.12 + r() * 0.3, d = p.depth * (0.3 + 0.7 * r()) * (r() < p.inward ? -1 : 1)
    const ins = f.map(i => addV(m, lerp(V3(m, i), c, t), i)), top = ins.map(i => addV(m, add(V3(m, i), mul(nn, d)), i))
    f.forEach((a, k) => { const k1 = (k + 1) % f.length; added.push([a, f[k1], ins[k1], ins[k]], [ins[k], ins[k1], top[k1], top[k]]) })
    added.push(top); drop.add(fi)
  }
  return fsel(rebuild(m, drop, added))
})
op('extrudeRepeat', (m, sel, p) => {
  const faces = sel.faces && sel.faces.length ? sel.faces : null; if (!faces) throw new Error('Select faces to extrude')
  for (let k = 0; k < Math.round(p.count); k++) {
    extrudeRegion(m, faces, p.dist)
    const vs = [...new Set(faces.flatMap(fi => m.f[fi]))], c = mul(vs.reduce((s, i) => add(s, V3(m, i)), [0, 0, 0]), 1 / vs.length), ax = norm(faces.reduce((s, fi) => add(s, fnormal(m, m.f[fi])), [0, 0, 0])), th = p.twist * RAD, cs = Math.cos(th), sn = Math.sin(th)
    deform(m, vs, q => { let v = mul(sub(q, c), p.scale); const dd = dot(v, ax); v = add(add(mul(v, cs), mul(cross(ax, v), sn)), mul(ax, dd * (1 - cs))); return add(c, v) })
  }
  return fsel(faces)
})
op('snapSymmetry', (m, sel, p) => {
  const a = axi(p.axis), b = bbox(m, allV(m)), tol = (Math.max(...b.s) || 1) * p.tol, cell = tol, grid = new Map(), key = q => q.map(x => Math.floor(x / cell)).join(',')
  for (const i of allV(m)) { const k = key(V3(m, i)); (grid.get(k) || grid.set(k, []).get(k)).push(i) }
  let n = 0
  for (const i of allV(m)) {
    const q = V3(m, i); if (Math.abs(q[a]) <= tol) { q[a] = 0; setV(m, i, q); n++; continue }
    if (q[a] < 0) continue
    const t = q.slice(); t[a] = -t[a]; const c = t.map(x => Math.floor(x / cell)); let bj = -1, bd = tol * tol
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) for (const j of grid.get((c[0] + x) + ',' + (c[1] + y) + ',' + (c[2] + z)) || []) { const d = sub(V3(m, j), t), dd = dot(d, d); if (dd <= bd) { bd = dd; bj = j } }
    if (bj < 0) continue
    const avg = lerp(q, (() => { const w = V3(m, bj); w[a] = -w[a]; return w })(), 0.5), mir = avg.slice(); mir[a] = -mir[a]; setV(m, i, avg); setV(m, bj, mir); n++
  }
  return n ? undefined : undefined
})
op('fractal', (m, sel, p) => {
  const faces = facesOf(m, sel), before = nv(m); subdivide(m, faces)
  const r = rng(p.seed), vn = vnormals(m), b = bbox(m, allV(m)), amp = p.amount * (Math.max(...b.s) || 1)
  deform(m, [...Array(nv(m) - before).keys()].map(k => before + k), (q, i) => add(q, mul(vn(i), (r() * 2 - 1) * amp)))
})
op('bulge', (m, sel, p) => {
  const ids = vertsOf(m, sel), c = p.center === 'origin' ? [0, 0, 0] : bbox(m, ids).c, R = p.radius
  deform(m, ids, q => { const d = sub(q, c), l = len(d); if (l >= R || l < 1e-12) return q; const t = 1 - l / R; return add(q, mul(d, p.strength * t * t * (3 - 2 * t) / l * R * 0.5)) })
})

// ---------- add: new mesh objects (Shift+A shapes beyond the basics) ----------
function lathe(prof, seg, closed) {
  const V = [], F = [], ids = prof.map(([r, y]) => { if (r <= 1e-9) { V.push(0, y, 0); return [V.length / 3 - 1] } const b = V.length / 3; for (let j = 0; j < seg; j++) { const th = 2 * Math.PI * j / seg; V.push(r * Math.cos(th), y, -r * Math.sin(th)) } return [...Array(seg).keys()].map(j => b + j) })
  const pairs = prof.map((_, k) => [k, k + 1]).slice(0, closed ? prof.length : prof.length - 1).map(([a, b]) => [a, b % prof.length])
  for (const [a, b] of pairs) { const A = ids[a], B = ids[b]; for (let j = 0; j < seg; j++) { const j1 = (j + 1) % seg; if (A.length > 1 && B.length > 1) F.push([A[j], A[j1], B[j1], B[j]]); else if (A.length === 1 && B.length > 1) F.push([A[0], B[j1], B[j]]); else if (B.length === 1 && A.length > 1) F.push([A[j], A[j1], B[0]]) } }
  return outward({ v: V, f: F, uv: null })
}
function sweep(P, r, sides, closed) {
  const N = P.length, T = P.map((_, i) => norm(sub(P[closed ? (i + 1) % N : Math.min(N - 1, i + 1)], P[closed ? (i - 1 + N) % N : Math.max(0, i - 1)])))
  const rot = (v, k, a) => { const c = Math.cos(a), s = Math.sin(a); return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))) }
  const a0 = Math.abs(T[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], Nn = [norm(sub(a0, mul(T[0], dot(a0, T[0]))))]
  for (let i = 1; i < N; i++) Nn.push(norm(sub(Nn[i - 1], mul(T[i], dot(Nn[i - 1], T[i])))))
  if (closed) { const e = norm(sub(Nn[N - 1], mul(T[0], dot(Nn[N - 1], T[0])))), ang = Math.atan2(dot(cross(e, Nn[0]), T[0]), dot(e, Nn[0])); for (let i = 0; i < N; i++) Nn[i] = rot(Nn[i], T[i], ang * i / N) }
  const V = [], F = []
  for (let i = 0; i < N; i++) { const B = cross(T[i], Nn[i]); for (let s = 0; s < sides; s++) { const th = 2 * Math.PI * s / sides, q = add(P[i], add(mul(Nn[i], r * Math.cos(th)), mul(B, r * Math.sin(th)))); V.push(q[0], q[1], q[2]) } }
  for (let i = 0; i < (closed ? N : N - 1); i++) { const i1 = (i + 1) % N; for (let s = 0; s < sides; s++) { const s1 = (s + 1) % sides; F.push([i * sides + s, i * sides + s1, i1 * sides + s1, i1 * sides + s]) } }
  if (!closed) { F.push([...Array(sides).keys()].reverse(), [...Array(sides).keys()].map(s => (N - 1) * sides + s)) }
  return outward({ v: V, f: F, uv: null })
}
function slab(outline, t, hole) {
  let A = 0; outline.forEach(([x, z], i) => { const [x1, z1] = outline[(i + 1) % outline.length]; A += x * z1 - x1 * z })
  if (A > 0) outline = outline.slice().reverse() // walls and caps below assume this winding
  const N = outline.length, V = [], F = [], at = (x, y, z) => (V.push(x, y, z), V.length / 3 - 1)
  const Ot = outline.map(([x, z]) => at(x, t / 2, z)), Ob = outline.map(([x, z]) => at(x, -t / 2, z))
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; F.push([Ob[i], Ob[j], Ot[j], Ot[i]]) }
  if (hole) {
    const It = outline.map(([x, z]) => { const a = Math.atan2(z, x); return at(hole * Math.cos(a), t / 2, hole * Math.sin(a)) }), Ib = outline.map(([x, z]) => { const a = Math.atan2(z, x); return at(hole * Math.cos(a), -t / 2, hole * Math.sin(a)) })
    for (let i = 0; i < N; i++) { const j = (i + 1) % N; F.push([Ot[i], Ot[j], It[j], It[i]], [Ob[j], Ob[i], Ib[i], Ib[j]], [It[i], It[j], Ib[j], Ib[i]]) }
  } else { F.push(Ot.slice(), Ob.slice().reverse()) }
  return outward({ v: V, f: F, uv: null })
}
const ADD = {
  quadSphere: p => { const m = PRIM.cube({ seg: p.seg }); for (let i = 0; i < nv(m); i++) setV(m, i, mul(norm(V3(m, i)), p.radius)); return m },
  roundedCube: p => {
    const h = [p.sx / 2, p.sy / 2, p.sz / 2], r = Math.min(p.radius, ...h.map(x => x * 0.999)), cs = Math.round(p.seg), V = [], F = []
    const axis = k => { const e = h[k] - r, band = [...Array(cs + 1).keys()].map(j => e + r * Math.tan(Math.PI / 4 * j / cs)), mid = [...Array(3).keys()].map(j => -e + 2 * e * j / 2); return [...band.slice(1).reverse().map(x => -x), ...mid, ...band.slice(1)] }
    const L = [0, 1, 2].map(axis), sides = [[0, 1, 2, 1], [0, 1, 2, -1], [1, 2, 0, 1], [1, 2, 0, -1], [2, 0, 1, 1], [2, 0, 1, -1]]
    for (const [nk, uk, wk, sg] of sides) quadSurf(V, F, (x, y) => { const q = [0, 0, 0], Lu = L[uk], Lw = L[wk]; q[nk] = sg * h[nk]; q[uk] = Lu[Math.round(x * (Lu.length - 1))]; q[wk] = Lw[Math.round(y * (Lw.length - 1))]; const inn = q.map((v, k) => Math.max(-(h[k] - r), Math.min(h[k] - r, v))), d = norm(sub(q, inn)); return add(inn, mul(d, r)) }, L[uk].length - 1, L[wk].length - 1)
    const m = { v: V, f: F, uv: null }; mergeDist(m, 1e-6 * Math.max(...h))
    m.f = m.f.map(f => dot(fnormal(m, f), faceC(m, f)) < 0 ? rev(f) : f) // convex: every face points away from the centre
    return m
  },
  capsule: p => { const r = p.radius, hh = Math.max(0, p.height / 2 - r), q = Math.round(p.rings), pr = [[0, -hh - r]]; for (let k = 1; k <= q; k++) { const a = -Math.PI / 2 + Math.PI / 2 * k / q; pr.push([r * Math.cos(a), -hh + r * Math.sin(a)]) } for (let k = 0; k < q; k++) { const a = Math.PI / 2 * k / q; pr.push([r * Math.cos(a), hh + r * Math.sin(a)]) } pr.push([0, hh + r]); return lathe(pr, Math.round(p.seg)) },
  tube: p => { const ri = Math.min(p.inner, p.radius * 0.99), y = p.height / 2; return lathe([[ri, -y], [p.radius, -y], [p.radius, y], [ri, y]], Math.round(p.seg), true) },
  dome: p => { const q = Math.round(p.rings), pr = [[0, 0]]; for (let k = 0; k <= q; k++) { const a = Math.PI / 2 * k / q; pr.push([p.radius * Math.cos(a), p.radius * Math.sin(a)]) } pr[pr.length - 1][0] = 0; return lathe(pr, Math.round(p.seg)) },
  wedge: p => { const x = p.sx / 2, y = p.sy, z = p.sz / 2; return outward({ v: [-x, 0, -z, x, 0, -z, x, 0, z, -x, 0, z, -x, y, -z, x, y, -z], f: [[0, 1, 2, 3], [0, 4, 5, 1], [3, 2, 5, 4], [0, 3, 4], [1, 5, 2]], uv: null }) },
  gear: p => { const T = Math.round(p.teeth), r = p.radius, R = r + p.depth, pts = []; for (let t = 0; t < T; t++) for (const [f, rr] of [[0, r], [0.2, R], [0.45, R], [0.65, r]]) { const a = 2 * Math.PI * (t + f) / T; pts.push([rr * Math.cos(a), -rr * Math.sin(a)]) } return slab(pts, p.thickness, p.hole > 0 ? Math.min(p.hole, r * 0.9) : 0) },
  star: p => { const K = Math.round(p.points), pts = []; for (let i = 0; i < 2 * K; i++) { const a = Math.PI * i / K, rr = i % 2 ? p.inner : p.radius; pts.push([rr * Math.sin(a), -rr * Math.cos(a)]) } return slab(pts, p.thickness, 0) },
  spring: p => { const n = Math.round(p.turns * p.seg), P = []; for (let i = 0; i <= n; i++) { const a = 2 * Math.PI * i / p.seg; P.push([p.radius * Math.cos(a), -p.height / 2 + p.height * i / n, -p.radius * Math.sin(a)]) } return sweep(P, p.wire, Math.round(p.sides), false) },
  torusKnot: p => { const n = Math.round(p.seg), P = []; for (let i = 0; i < n; i++) { const t = 2 * Math.PI * i / n, rr = p.radius * (2 + Math.cos(p.q * t)) / 3; P.push([rr * Math.cos(p.p * t), p.radius * Math.sin(p.q * t) / 3, rr * Math.sin(p.p * t)]) } return sweep(P, p.tube, Math.round(p.sides), true) },
  chainLink: p => { const r = p.radius, L = p.length / 2, P = [], q = 12; for (let k = 0; k < q; k++) { const a = Math.PI * k / q; P.push([L + r * Math.sin(a), 0, r * Math.cos(a)]) } for (let k = 0; k < q; k++) { const a = Math.PI * k / q; P.push([-L - r * Math.sin(a), 0, -r * Math.cos(a)]) } return sweep(P, p.wire, Math.round(p.sides), true) },
  pipe: p => { const P = (p.points && p.points.length >= 2 ? p.points : [[0, 0, 0], [0, 1, 0], [1, 2, 0], [2, 2, 0]]).map(q => q.map(Number)), out = [P[0]]; for (let i = 1; i < P.length; i++) { const steps = Math.max(1, Math.round(p.smooth)); for (let k = 1; k <= steps; k++) out.push(lerp(P[i - 1], P[i], k / steps)) } return sweep(out, p.radius, Math.round(p.sides), false) },
  rock: p => { const m = PRIM.icosphere({ radius: 1, sub: Math.round(p.detail) }); for (let i = 0; i < nv(m); i++) { const q = V3(m, i), n = fbm(mul(q, 1.6), p.seed | 0, 5), ridge = 1 - Math.abs(fbm(mul(q, 3.1), (p.seed | 0) + 9, 3)); setV(m, i, mul([q[0], q[1] * p.flat, q[2]], p.radius * (1 + p.rough * (0.7 * n + 0.3 * ridge - 0.15)))) } return m }
}
for (const [id, fn] of Object.entries(ADD)) op(id, (m, sel, p) => fn(p))

for (const o of MODOPS) if (!RUN[o.id]) throw new Error('modops.js lacks ' + o.id)
