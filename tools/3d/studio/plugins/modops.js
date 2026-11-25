// Modify ops: Blender-style one-shot tools (deform, generate, clean up, UV, select) on the working mesh {v, f, uv}
// used by meshops.js. Pure, no DOM. Each op: run(m, sel, p) where sel = {verts: Set | null, faces: [] | null,
// edges: ['a_b'] | null, target: {v, f} | null}; null = nothing selected = whole mesh. Returns {kind, ids} for the
// new selection, or nothing. plugins/mesh.js registers every entry of MODOPS as the command mesh.<id>.
import { MODOPS } from './modlist.js'
import { V3, add, sub, mul, dot, cross, len, norm, lerp, ek, setV, fnormal, edgesOf, mergeDist, signedVolume, clean } from './meshops.js'

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
op('decimate', (m, sel, p) => decimate(m, p.ratio))
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

for (const o of MODOPS) if (!RUN[o.id]) throw new Error('modops.js lacks ' + o.id)
