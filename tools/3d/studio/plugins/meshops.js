// Mesh ops: pure functions on a working mesh {v: flat xyz, f: [[i...]], uv: flat uv | null} and the polygon primitives.
// No DOM and no app state: plugins/mesh.js holds the edit mode, UI and commands that call these.

// ---------- working mesh helpers ----------
export const toM = g => ({ v: Array.from(g.verts), f: g.faces.map(f => Array.from(f)), uv: g.uvs && g.uvs.length === (g.verts.length / 3) * 2 ? Array.from(g.uvs) : null })
export const toGeo = m => ({ verts: m.v.slice(), faces: m.f.map(f => f.slice()), uvs: m.uv ? m.uv.slice() : null })
const V3 = (m, i) => [m.v[3 * i], m.v[3 * i + 1], m.v[3 * i + 2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const len = a => Math.hypot(a[0], a[1], a[2])
const norm = a => { const l = len(a); return l > 1e-12 ? mul(a, 1 / l) : [0, 0, 0] }
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const ek = (a, b) => a < b ? a + '_' + b : b + '_' + a
// New vertex at p; uv blended from src verts with weights w.
function addV(m, p, src, w) {
  m.v.push(p[0], p[1], p[2])
  if (m.uv) { let u = 0, t = 0; if (src) src.forEach((s, i) => { u += m.uv[2 * s] * w[i]; t += m.uv[2 * s + 1] * w[i] }); m.uv.push(u, t) }
  return m.v.length / 3 - 1
}
const setV = (m, i, p) => { m.v[3 * i] = p[0]; m.v[3 * i + 1] = p[1]; m.v[3 * i + 2] = p[2] }
const centroid = (m, ids) => { let c = [0, 0, 0]; for (const i of ids) c = add(c, V3(m, i)); return ids.length ? mul(c, 1 / ids.length) : c }
// Newell normal of a polygon.
function fnormal(m, f) {
  let n = [0, 0, 0]
  for (let i = 0; i < f.length; i++) { const a = V3(m, f[i]), b = V3(m, f[(i + 1) % f.length]); n = add(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]) }
  return norm(n)
}
// Drop repeated corners, faces under 3 corners and unused verts.
function clean(m) {
  m.f = m.f.map(f => f.filter((x, i) => x !== f[(i + 1) % f.length])).filter(f => f.length >= 3 && new Set(f).size >= 3)
  const n = m.v.length / 3, used = new Int32Array(n).fill(-1), v = [], uv = m.uv ? [] : null
  for (const f of m.f) for (const i of f) used[i] = 0
  for (let i = 0; i < n; i++) if (used[i] === 0) { used[i] = v.length / 3; v.push(m.v[3 * i], m.v[3 * i + 1], m.v[3 * i + 2]); if (uv) uv.push(m.uv[2 * i], m.uv[2 * i + 1]) }
  m.f = m.f.map(f => f.map(i => used[i])); m.v = v; m.uv = uv
  return used
}
// Half-edge map "a,b" -> face index.
function halfEdges(m) { const he = new Map(); m.f.forEach((f, fi) => f.forEach((a, i) => he.set(a + ',' + f[(i + 1) % f.length], fi))); return he }
function edgesOf(m) { const s = new Map(); m.f.forEach(f => f.forEach((a, i) => { const b = f[(i + 1) % f.length], k = ek(a, b); if (!s.has(k)) s.set(k, [Math.min(a, b), Math.max(a, b)]) })); return s }
export function signedVolume(m) { let vol = 0; for (const f of m.f) { const a = V3(m, f[0]); for (let i = 1; i + 1 < f.length; i++) vol += dot(a, cross(V3(m, f[i]), V3(m, f[i + 1]))) } return vol / 6 }

// Merge verts closer than dist (only those in `only` when given).
export function mergeDist(m, dist = 1e-4, only = null) {
  const n = m.v.length / 3, map = new Int32Array(n), cell = Math.max(dist, 1e-7), grid = new Map(), d2 = dist * dist
  for (let i = 0; i < n; i++) {
    map[i] = i
    if (only && !only.has(i)) continue
    const x = m.v[3 * i], y = m.v[3 * i + 1], z = m.v[3 * i + 2], cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell)
    let hit = -1
    for (let a = -1; a <= 1 && hit < 0; a++) for (let b = -1; b <= 1 && hit < 0; b++) for (let c = -1; c <= 1 && hit < 0; c++) {
      const l = grid.get((cx + a) + ',' + (cy + b) + ',' + (cz + c)); if (!l) continue
      for (const j of l) { const dx = m.v[3 * j] - x, dy = m.v[3 * j + 1] - y, dz = m.v[3 * j + 2] - z; if (dx * dx + dy * dy + dz * dz <= d2) { hit = j; break } }
    }
    if (hit >= 0) map[i] = hit
    else { const k = cx + ',' + cy + ',' + cz; (grid.get(k) || grid.set(k, []).get(k)).push(i) }
  }
  const before = n
  m.f = m.f.map(f => f.map(i => map[i]))
  clean(m)
  return before - m.v.length / 3
}
const flipAll = m => { m.f = m.f.map(f => [f[0], ...f.slice(1).reverse()]); return m }
const outward = m => signedVolume(m) < 0 ? flipAll(m) : m

// ---------- primitives (studs, centred, faces CCW from outside) ----------
function quadSurf(V, F, fn, nu, nv) {
  const base = V.length / 3, id = (i, j) => base + j * (nu + 1) + i
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const p = fn(i / nu, j / nv); V.push(p[0], p[1], p[2]) }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) F.push([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)])
}
const int = (x, d, lo = 1, hi = 256) => Math.max(lo, Math.min(hi, Math.round(+x || d)))
export const PRIM = {
  cube(a = {}) {
    const s = +a.size || 2, n = int(a.seg, 1, 1, 64), V = [], F = []
    const sides = [[[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]]
    for (const [nn, u, w] of sides) quadSurf(V, F, (x, y) => add(add(mul(nn, s / 2), mul(u, (x - 0.5) * s)), mul(w, (y - 0.5) * s)), n, n)
    const m = { v: V, f: F, uv: null }; mergeDist(m, s * 1e-5); return m
  },
  plane(a = {}) { const s = +a.size || 2, V = [], F = []; quadSurf(V, F, (x, y) => [(x - 0.5) * s, 0, -(y - 0.5) * s], 1, 1); return { v: V, f: F, uv: null } },
  grid(a = {}) { const s = +a.size || 4, nx = int(a.x ?? a.seg, 8), ny = int(a.y ?? a.seg, 8), V = [], F = []; quadSurf(V, F, (x, y) => [(x - 0.5) * s, 0, -(y - 0.5) * s], nx, ny); return { v: V, f: F, uv: null } },
  uvsphere(a = {}) {
    const r = +a.radius || 1, seg = int(a.seg, 16, 3), rings = int(a.rings, 8, 2), V = [0, r, 0], F = []
    for (let k = 1; k < rings; k++) { const ph = Math.PI * k / rings; for (let j = 0; j < seg; j++) { const th = 2 * Math.PI * j / seg; V.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), -r * Math.sin(ph) * Math.sin(th)) } }
    V.push(0, -r, 0)
    const bot = V.length / 3 - 1, R = (k, j) => 1 + (k - 1) * seg + (j % seg)
    for (let j = 0; j < seg; j++) F.push([0, R(1, j), R(1, j + 1)])
    for (let k = 1; k < rings - 1; k++) for (let j = 0; j < seg; j++) F.push([R(k, j), R(k + 1, j), R(k + 1, j + 1), R(k, j + 1)])
    for (let j = 0; j < seg; j++) F.push([bot, R(rings - 1, j + 1), R(rings - 1, j)])
    return outward({ v: V, f: F, uv: null })
  },
  icosphere(a = {}) {
    const r = +a.radius || 1, sub = int(a.sub ?? a.seg, 1, 0, 5), t = (1 + Math.sqrt(5)) / 2
    let V = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1]
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
    for (let s = 0; s < sub; s++) {
      const mid = new Map(), m = { v: V }, M = (a, b) => { const k = ek(a, b); if (!mid.has(k)) { mid.set(k, V.length / 3); const p = lerp(V3(m, a), V3(m, b), 0.5); V.push(p[0], p[1], p[2]) } return mid.get(k) }
      F = F.flatMap(([a, b, c]) => { const ab = M(a, b), bc = M(b, c), ca = M(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]] })
    }
    const m = { v: V, f: F, uv: null }
    for (let i = 0; i < V.length / 3; i++) setV(m, i, mul(norm(V3(m, i)), r))
    return outward(m)
  },
  cylinder(a = {}) {
    const r = +a.radius || 1, hh = +a.height || 2, seg = int(a.seg, 16, 3), hs = int(a.hseg, 1), V = [], F = [], R = (k, j) => k * seg + (j % seg)
    for (let k = 0; k <= hs; k++) for (let j = 0; j < seg; j++) { const th = 2 * Math.PI * j / seg; V.push(r * Math.cos(th), -hh / 2 + hh * k / hs, -r * Math.sin(th)) }
    for (let k = 0; k < hs; k++) for (let j = 0; j < seg; j++) F.push([R(k, j), R(k, j + 1), R(k + 1, j + 1), R(k + 1, j)])
    F.push([...Array(seg).keys()].map(j => R(hs, j)), [...Array(seg).keys()].map(j => R(0, seg - 1 - j)))
    return outward({ v: V, f: F, uv: null })
  },
  cone(a = {}) {
    const r = +a.radius || 1, hh = +a.height || 2, seg = int(a.seg, 16, 3), V = [], F = []
    for (let j = 0; j < seg; j++) { const th = 2 * Math.PI * j / seg; V.push(r * Math.cos(th), -hh / 2, -r * Math.sin(th)) }
    V.push(0, hh / 2, 0)
    for (let j = 0; j < seg; j++) F.push([j, (j + 1) % seg, seg])
    F.push([...Array(seg).keys()].map(j => seg - 1 - j))
    return outward({ v: V, f: F, uv: null })
  },
  torus(a = {}) {
    const R0 = +a.radius || 1, r = +a.tube || 0.35, seg = int(a.seg, 24, 3), ts = int(a.tubeSeg, 12, 3), V = [], F = [], P = (i, j) => (i % seg) * ts + (j % ts)
    for (let i = 0; i < seg; i++) for (let j = 0; j < ts; j++) { const th = 2 * Math.PI * i / seg, ph = 2 * Math.PI * j / ts, q = R0 + r * Math.cos(ph); V.push(q * Math.cos(th), r * Math.sin(ph), -q * Math.sin(th)) }
    for (let i = 0; i < seg; i++) for (let j = 0; j < ts; j++) F.push([P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)])
    return outward({ v: V, f: F, uv: null })
  }
}
// ---------- geometry ops (pure; mutate the working mesh m) ----------
const revF = f => [f[0], ...f.slice(1).reverse()]
const clamp1 = x => Math.max(-1, Math.min(1, x))
export function regionBoundary(m, faces) {
  const c = new Map()
  for (const i of faces) { const f = m.f[i]; f.forEach((a, k) => { const key = ek(a, f[(k + 1) % f.length]); c.set(key, (c.get(key) || 0) + 1) }) }
  return [...c].filter(([, n]) => n === 1).map(([k]) => k)
}
// Extrude a face region along its normals. Returns {faces (same indices, moved), verts, dirs: Map vert -> offset per unit}.
export function extrude(m, faces, dist = 1) {
  const fs = new Set(faces), he = new Set(), vn = new Map()
  for (const fi of fs) { const f = m.f[fi], n = fnormal(m, f); f.forEach((a, k) => { he.add(a + ',' + f[(k + 1) % f.length]); (vn.get(a) || vn.set(a, []).get(a)).push(n) }) }
  const nv = new Map(), dirs = new Map()
  for (const [v, ns] of vn) {
    const d = norm(ns.reduce(add, [0, 0, 0])), shell = 1 / Math.max(0.3, Math.min(...ns.map(n => dot(d, n))))
    const i = addV(m, add(V3(m, v), mul(d, dist * shell)), [v], [1]); nv.set(v, i); dirs.set(i, mul(d, shell))
  }
  const side = []
  for (const fi of fs) { const f = m.f[fi]; f.forEach((a, k) => { const b = f[(k + 1) % f.length]; if (!he.has(b + ',' + a)) side.push([a, b, nv.get(b), nv.get(a)]) }) }
  for (const fi of fs) m.f[fi] = m.f[fi].map(v => nv.get(v))
  m.f.push(...side)
  const map = clean(m), d2 = new Map()
  for (const [i, d] of dirs) d2.set(map[i], d)
  return { faces: [...fs], verts: [...d2.keys()], dirs: d2 }
}
// Extrude edges into quads (open borders grow outward in their face's plane).
export function extrudeEdges(m, edges, dist = 1) {
  const he = halfEdges(m), nv = new Map(), dirs = new Map(), out = []
  const vd = new Map()
  for (const k of edges) {
    const [a, b] = k.split('_').map(Number), fi = he.get(a + ',' + b) ?? he.get(b + ',' + a)
    let d = [0, 1, 0]
    if (fi !== undefined) { const f = m.f[fi], i = f.indexOf(a), fwd = f[(i + 1) % f.length] === b, e = fwd ? sub(V3(m, b), V3(m, a)) : sub(V3(m, a), V3(m, b)); d = norm(cross(e, fnormal(m, f))) }
    for (const v of [a, b]) vd.set(v, add(vd.get(v) || [0, 0, 0], d))
  }
  for (const [v, d] of vd) { const u = norm(d), i = addV(m, add(V3(m, v), mul(u, dist)), [v], [1]); nv.set(v, i); dirs.set(i, u) }
  for (const k of edges) {
    const [a, b] = k.split('_').map(Number), fwd = he.has(a + ',' + b)
    m.f.push(fwd ? [b, a, nv.get(a), nv.get(b)] : [a, b, nv.get(b), nv.get(a)])
    out.push(ek(nv.get(a), nv.get(b)))
  }
  return { edges: out, verts: [...nv.values()], dirs }
}
// Inset each face individually by `amount` studs.
export function inset(m, faces, amount = 0.2) {
  for (const fi of faces) {
    const f = m.f[fi], n = f.length, c = centroid(m, f), nw = []
    for (let k = 0; k < n; k++) {
      const v = V3(m, f[k]), dp = norm(sub(V3(m, f[(k + n - 1) % n]), v)), dq = norm(sub(V3(m, f[(k + 1) % n]), v)), toC = sub(c, v)
      let dir = len(add(dp, dq)) < 1e-6 ? norm(toC) : norm(add(dp, dq))
      if (dot(dir, toC) < 0) dir = mul(dir, -1)
      const d = Math.min(amount / Math.max(Math.sin(Math.acos(clamp1(dot(dp, dq))) / 2), 0.05), len(toC) * 0.98)
      nw.push(addV(m, add(v, mul(dir, d)), [f[k]], [1]))
    }
    for (let k = 0; k < n; k++) m.f.push([f[k], f[(k + 1) % n], nw[(k + 1) % n], nw[k]])
    m.f[fi] = nw
  }
  return faces
}
// Bevel edges (edge keys "a_b") with `segs` segments; corners are capped with n-gons.
export function bevel(m, edgeKeys, width = 0.2, segs = 1) {
  const he = halfEdges(m), sel = new Set()
  for (const k of edgeKeys) { const [a, b] = k.split('_').map(Number); if (he.has(a + ',' + b) && he.has(b + ',' + a)) sel.add(ek(a, b)) }
  if (!sel.size) return 0
  const isSel = (a, b) => sel.has(ek(a, b)), touched = new Set(), cache = new Map(), origin = new Map(), nOld = m.v.length / 3
  for (const k of sel) for (const x of k.split('_')) touched.add(+x)
  const mk = (p, v) => { const i = addV(m, p, [v], [1]); origin.set(i, v); return i }
  const slide = (v, to) => { const key = 's' + v + ',' + to; if (!cache.has(key)) { const pv = V3(m, v), d = sub(V3(m, to), pv), L = len(d) || 1; cache.set(key, mk(add(pv, mul(d, Math.min(width, L * 0.49) / L)), v)) } return cache.get(key) }
  const bis = (fi, v, p, n) => {
    const key = 'b' + fi + ',' + v
    if (!cache.has(key)) { const pv = V3(m, v), ep = sub(V3(m, p), pv), en = sub(V3(m, n), pv), dp = norm(ep), dn = norm(en), w = Math.min(width, Math.min(len(ep), len(en)) * 0.49), half = Math.acos(clamp1(dot(dp, dn))) / 2; cache.set(key, mk(add(pv, mul(norm(add(dp, dn)), w / Math.max(Math.sin(half), 0.05))), v)) }
    return cache.get(key)
  }
  const corners = m.f.map((f, fi) => f.map((v, k) => {
    if (!touched.has(v)) return [v]
    const p = f[(k + f.length - 1) % f.length], n = f[(k + 1) % f.length], ep = isSel(p, v), en = isSel(v, n)
    if (ep && en) return [bis(fi, v, p, n)]
    if (ep) return [slide(v, n)]
    if (en) return [slide(v, p)]
    let pS = false, nS = false
    const fp = he.get(v + ',' + p), fn = he.get(n + ',' + v)
    if (fp !== undefined) { const g = m.f[fp], i = g.indexOf(v); pS = isSel(g[(i + g.length - 1) % g.length], v) }
    if (fn !== undefined) { const g = m.f[fn], i = g.indexOf(v); nS = isSel(v, g[(i + 1) % g.length]) }
    const out = []
    if (pS) out.push(slide(v, p))
    if (!(pS && nS)) out.push(v)
    if (nS) out.push(slide(v, n))
    return out
  }))
  const nf = corners.map(c => c.flat())
  const prof = (x1, x2, v, other) => {
    if (segs <= 1) return [x1, x2]
    const pv = V3(m, v), u = norm(sub(V3(m, other), pv)), a = V3(m, x1), b = V3(m, x2), c = add(pv, mul(u, (dot(sub(a, pv), u) + dot(sub(b, pv), u)) / 2)), pts = [x1]
    for (let s = 1; s < segs; s++) { const t = s / segs; pts.push(mk(add(add(mul(a, (1 - t) * (1 - t)), mul(c, 2 * (1 - t) * t)), mul(b, t * t)), v)) }
    pts.push(x2); return pts
  }
  for (const k of sel) {
    const [a, b] = k.split('_').map(Number), F1 = he.get(a + ',' + b), F2 = he.get(b + ',' + a), g1 = m.f[F1], g2 = m.f[F2]
    const A = prof(corners[F1][g1.indexOf(a)][0], corners[F2][g2.indexOf(a)][0], a, b), B = prof(corners[F1][g1.indexOf(b)][0], corners[F2][g2.indexOf(b)][0], b, a)
    for (let s = 0; s + 1 < A.length; s++) nf.push([B[s], A[s], A[s + 1], B[s + 1]])
  }
  // cap the holes left at bevelled corners
  const org = i => i < nOld ? i : origin.get(i), hs = new Set(), next = new Map()
  nf.forEach(f => f.forEach((a, k) => hs.add(a + ',' + f[(k + 1) % f.length])))
  nf.forEach(f => f.forEach((a, k) => { const b = f[(k + 1) % f.length]; if (!hs.has(b + ',' + a) && org(a) === org(b) && touched.has(org(a))) next.set(b, a) }))
  const done = new Set()
  for (const s of next.keys()) {
    if (done.has(s)) continue
    const loop = [s]; done.add(s); let x = next.get(s)
    while (x !== undefined && x !== s && !done.has(x) && loop.length < 512) { loop.push(x); done.add(x); x = next.get(x) }
    if (x === s && loop.length >= 3) nf.push(loop)
  }
  m.f = nf; clean(m)
  return sel.size
}
// Loop cut through the quad ring that crosses edge a-b. Returns the new loop's edge keys.
export function loopCut(m, a, b, cuts = 1, at = null) {
  const he = halfEdges(m), facesOf = (x, y) => [he.get(x + ',' + y), he.get(y + ',' + x)].filter(f => f !== undefined)
  if (!facesOf(a, b).length) return []
  const dirOf = new Map([[ek(a, b), [a, b]]]), ring = [], seen = new Set()
  const opp = (fi, u, v) => { const f = m.f[fi], i = f.indexOf(u); return f[(i + 1) % 4] === v ? [f[(i + 3) % 4], f[(i + 2) % 4]] : [f[(i + 1) % 4], f[(i + 2) % 4]] }
  for (const f0 of facesOf(a, b)) {
    let fi = f0, u = a, v = b
    while (fi !== undefined && !seen.has(fi) && m.f[fi].length === 4) {
      seen.add(fi)
      const [d, c] = opp(fi, u, v); ring.push([fi, u, v, d, c])
      if (dirOf.has(ek(d, c))) break
      dirOf.set(ek(d, c), [d, c])
      fi = facesOf(d, c).find(x => x !== fi); u = d; v = c
    }
  }
  const n = Math.max(1, Math.min(64, cuts | 0)), ts = at != null && n === 1 ? [Math.max(0.01, Math.min(0.99, at))] : [...Array(n)].map((_, i) => (i + 1) / (n + 1))
  const pts = new Map()
  for (const [key, [x, y]] of dirOf) pts.set(key, ts.map(t => addV(m, lerp(V3(m, x), V3(m, y), t), [x, y], [1 - t, t])))
  const along = (x, y) => { const key = ek(x, y), p = pts.get(key); return dirOf.get(key)[0] === x ? p : [...p].reverse() }
  const inRing = new Set(ring.map(r => r[0])), out = [], loopE = []
  m.f.forEach((f, fi) => { if (inRing.has(fi)) return; const g = []; f.forEach((x, k) => { g.push(x); const y = f[(k + 1) % f.length]; if (dirOf.has(ek(x, y))) g.push(...along(x, y)) }); out.push(g) })
  for (const [fi, u, v, d, c] of ring) {
    const f = m.f[fi], A = [u, ...along(u, v), v], B = [d, ...along(d, c), c], fwd = f[(f.indexOf(u) + 1) % 4] === v
    for (let s = 0; s + 1 < A.length; s++) out.push(fwd ? [A[s], A[s + 1], B[s + 1], B[s]] : [A[s + 1], A[s], B[s], B[s + 1]])
    for (let s = 1; s + 1 < A.length; s++) loopE.push([A[s], B[s]])
  }
  m.f = out
  const map = clean(m)
  return loopE.map(([x, y]) => ek(map[x], map[y]))
}
// Simple subdivide of the given faces (neighbours get the edge midpoints, no T-junctions).
export function subdivide(m, faces) {
  const fs = new Set(faces), mid = new Map(), out = []
  const M = (a, b) => { const k = ek(a, b); if (!mid.has(k)) mid.set(k, addV(m, lerp(V3(m, a), V3(m, b), 0.5), [a, b], [0.5, 0.5])); return mid.get(k) }
  for (const fi of fs) { const f = m.f[fi]; f.forEach((a, k) => M(a, f[(k + 1) % f.length])) }
  m.f.forEach((f, fi) => {
    const n = f.length
    if (!fs.has(fi)) { const g = []; f.forEach((a, k) => { g.push(a); const x = mid.get(ek(a, f[(k + 1) % n])); if (x !== undefined) g.push(x) }); out.push(g); return }
    if (n === 3) { const [a, b, c] = f, ab = M(a, b), bc = M(b, c), ca = M(c, a); out.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]); return }
    const c = addV(m, centroid(m, f), f, f.map(() => 1 / n))
    for (let k = 0; k < n; k++) out.push([f[k], M(f[k], f[(k + 1) % n]), c, M(f[(k + n - 1) % n], f[k])])
  })
  m.f = out
}
// Catmull-Clark subdivision surface, `levels` times (borders use the crease rule).
export function catmull(m, levels = 1) {
  for (let L = 0; L < levels; L++) {
    const nv = m.v.length / 3, F = m.f, fp = F.map(f => centroid(m, f)), edges = new Map(), vf = Array.from({ length: nv }, () => []), ve = Array.from({ length: nv }, () => [])
    F.forEach((f, fi) => f.forEach((a, k) => { const b = f[(k + 1) % f.length], key = ek(a, b); let e = edges.get(key); if (!e) { edges.set(key, e = { a, b, faces: [] }); ve[a].push(e); ve[b].push(e) } e.faces.push(fi); vf[a].push(fi) }))
    const V = [], UV = m.uv ? [] : null, uvAvg = ids => { let u = 0, t = 0; for (const i of ids) { u += m.uv[2 * i]; t += m.uv[2 * i + 1] } return [u / ids.length, t / ids.length] }
    for (let i = 0; i < nv; i++) {
      const P = V3(m, i), bnd = ve[i].filter(e => e.faces.length !== 2), k = ve[i].length
      let p = P
      if (bnd.length === 2) { const o = bnd.map(e => V3(m, e.a === i ? e.b : e.a)); p = add(mul(P, 0.75), mul(add(o[0], o[1]), 0.125)) }
      else if (!bnd.length && k >= 3) {
        const Fa = mul(vf[i].reduce((s, fi) => add(s, fp[fi]), [0, 0, 0]), 1 / vf[i].length), Ra = mul(ve[i].reduce((s, e) => add(s, lerp(V3(m, e.a), V3(m, e.b), 0.5)), [0, 0, 0]), 1 / k)
        p = mul(add(add(Fa, mul(Ra, 2)), mul(P, k - 3)), 1 / k)
      }
      V.push(p[0], p[1], p[2]); if (UV) UV.push(m.uv[2 * i], m.uv[2 * i + 1])
    }
    const fid = F.map((f, fi) => { V.push(...fp[fi]); if (UV) UV.push(...uvAvg(f)); return V.length / 3 - 1 })
    const eid = new Map()
    for (const [key, e] of edges) {
      let p = lerp(V3(m, e.a), V3(m, e.b), 0.5)
      if (e.faces.length === 2) p = mul(add(add(V3(m, e.a), V3(m, e.b)), add(fp[e.faces[0]], fp[e.faces[1]])), 0.25)
      V.push(...p); if (UV) UV.push(...uvAvg([e.a, e.b])); eid.set(key, V.length / 3 - 1)
    }
    m.f = F.flatMap((f, fi) => f.map((a, k) => [a, eid.get(ek(a, f[(k + 1) % f.length])), fid[fi], eid.get(ek(f[(k + f.length - 1) % f.length], a))]))
    m.v = V; m.uv = UV
  }
}
export function mergeCenter(m, verts) {
  const ids = [...verts]; if (ids.length < 2) return -1
  const s = new Set(ids), keep = ids[0]; setV(m, keep, centroid(m, ids))
  m.f = m.f.map(f => f.map(i => s.has(i) ? keep : i))
  return clean(m)[keep]
}
export function del(m, what, ids) {
  const s = new Set(ids)
  if (what === 'face') m.f = m.f.filter((_, i) => !s.has(i))
  else if (what === 'edge') m.f = m.f.filter(f => !f.some((a, k) => s.has(ek(a, f[(k + 1) % f.length]))))
  else m.f = m.f.filter(f => !f.some(a => s.has(a)))
  clean(m)
}
// New face through the given verts: follows open borders when they form a loop, else sorts them around their plane.
export function fill(m, verts) {
  const ids = [...new Set(verts)]; if (ids.length < 3) return -1
  const he = halfEdges(m), s = new Set(ids), next = new Map()
  for (const k of he.keys()) { const [a, b] = k.split(',').map(Number); if (s.has(a) && s.has(b) && !he.has(b + ',' + a)) next.set(b, a) }
  let loop = null
  if (next.size === ids.length) { loop = [ids[0]]; let x = next.get(ids[0]); while (x !== undefined && x !== ids[0] && loop.length <= ids.length) { loop.push(x); x = next.get(x) } if (loop.length !== ids.length || x !== ids[0]) loop = null }
  if (!loop) {
    const c = centroid(m, ids), p0 = V3(m, ids[0])
    let p1 = p0, n = [0, 0, 0]
    for (const i of ids) if (len(sub(V3(m, i), p0)) > len(sub(p1, p0))) p1 = V3(m, i)
    for (const i of ids) { const x = cross(sub(p1, p0), sub(V3(m, i), p0)); if (len(x) > len(n)) n = x }
    n = norm(n); const u = norm(sub(p1, c)), w = cross(n, u)
    loop = ids.slice().sort((a, b) => { const pa = sub(V3(m, a), c), pb = sub(V3(m, b), c); return Math.atan2(dot(pa, w), dot(pa, u)) - Math.atan2(dot(pb, w), dot(pb, u)) })
    const same = loop.some((a, k) => he.has(a + ',' + loop[(k + 1) % loop.length])), opp = loop.some((a, k) => he.has(loop[(k + 1) % loop.length] + ',' + a))
    const all = [...Array(m.v.length / 3).keys()], mc = centroid(m, all)
    if (same || (!opp && dot(fnormal(m, loop), sub(c, mc)) < -1e-9)) loop = revF(loop)
  }
  m.f.push(loop); return m.f.length - 1
}
export function flip(m, faces) { for (const fi of faces) m.f[fi] = revF(m.f[fi]) }
// Make winding consistent across each connected piece, then point it outward.
export function recalc(m) {
  const F = m.f, comp = new Int32Array(F.length).fill(-1), ef = new Map()
  F.forEach((f, fi) => f.forEach((a, k) => { const key = ek(a, f[(k + 1) % f.length]); (ef.get(key) || ef.set(key, []).get(key)).push(fi) }))
  const has = (fi, a, b) => { const f = F[fi], i = f.indexOf(a); return i >= 0 && f[(i + 1) % f.length] === b }
  for (let s = 0, c = 0; s < F.length; s++) {
    if (comp[s] >= 0) continue
    const q = [s], mem = [s]; comp[s] = c
    while (q.length) {
      const fi = q.pop(), f = F[fi]
      for (let k = 0; k < f.length; k++) {
        const a = f[k], b = f[(k + 1) % f.length]
        for (const g of ef.get(ek(a, b))) { if (comp[g] >= 0) continue; if (has(g, a, b)) F[g] = revF(F[g]); comp[g] = c; mem.push(g); q.push(g) }
      }
    }
    let vol = 0; for (const fi of mem) { const f = F[fi], a = V3(m, f[0]); for (let i = 1; i + 1 < f.length; i++) vol += dot(a, cross(V3(m, f[i]), V3(m, f[i + 1]))) }
    if (vol < -1e-12) for (const fi of mem) F[fi] = revF(F[fi])
    c++
  }
}
// Knife: cut faces along the path pts (local points) seen along `normal`; each face the path crosses is split.
export function knife(m, pts, normal) {
  let cut = 0
  for (let i = 0; i + 1 < pts.length; i++) cut += knifeSeg(m, pts[i], pts[i + 1], normal)
  return cut
}
function knifeSeg(m, p1, p2, n0) {
  const d = sub(p2, p1), L = len(d), nr = norm(n0 || [0, 1, 0]), N = norm(cross(d, nr))
  if (L < 1e-9 || len(N) < 1e-9) return 0
  const eps = 1e-7, tol = Math.max(L * 0.5, 0.05), plans = [], cv = new Map()
  m.f.forEach((f, fi) => {
    if (dot(fnormal(m, f), nr) < 0.1) return
    const s = f.map(i => dot(sub(V3(m, i), p1), N)), X = []
    for (let k = 0; k < f.length; k++) {
      const a = s[k], b = s[(k + 1) % f.length], j = f[(k + 1) % f.length]
      if (Math.abs(a) <= eps) X.push({ at: f[k], k, p: V3(m, f[k]) })
      else if (Math.abs(b) > eps && (a > 0) !== (b > 0)) { const t = a / (a - b); X.push({ e: [f[k], j], t, k, p: lerp(V3(m, f[k]), V3(m, j), t) }) }
    }
    if (X.length !== 2) return
    if (X[0].at !== undefined && X[1].at !== undefined && (Math.abs(X[0].k - X[1].k) === 1 || Math.abs(X[0].k - X[1].k) === f.length - 1)) return
    const u1 = dot(sub(X[0].p, p1), d) / (L * L), u2 = dot(sub(X[1].p, p1), d) / (L * L)
    if (Math.min(1, Math.max(u1, u2)) - Math.max(0, Math.min(u1, u2)) < 1e-3) return // the segment must run inside this face, not just touch its edge
    if (Math.min(Math.abs(dot(sub(X[0].p, p1), nr)), Math.abs(dot(sub(X[1].p, p1), nr))) > tol) return
    plans.push({ fi, X })
  })
  if (!plans.length) return 0
  const vid = x => { if (x.at !== undefined) return x.at; const k = ek(...x.e); if (!cv.has(k)) cv.set(k, addV(m, x.p, x.e, [1 - x.t, x.t])); return cv.get(k) }
  for (const pl of plans) pl.ids = pl.X.map(vid)
  m.f = m.f.map(f => { const g = []; f.forEach((a, k) => { g.push(a); const x = cv.get(ek(a, f[(k + 1) % f.length])); if (x !== undefined) g.push(x) }); return g })
  const extra = []
  for (const { fi, ids: [x, y] } of plans) {
    const f = m.f[fi], i = f.indexOf(x), j = f.indexOf(y); if (i < 0 || j < 0) continue
    const A = [], B = []
    for (let k = i; ; k = (k + 1) % f.length) { A.push(f[k]); if (k === j) break }
    for (let k = j; ; k = (k + 1) % f.length) { B.push(f[k]); if (k === i) break }
    if (A.length < 3 || B.length < 3) continue
    m.f[fi] = A; extra.push(B)
  }
  m.f.push(...extra)
  return plans.length
}
// Vertex -> its X mirror (x negated) within eps, for symmetric editing.
function mirrorMap(m, eps = 1e-4) {
  const n = m.v.length / 3, key = (x, y, z) => Math.round(x / eps) + ',' + Math.round(y / eps) + ',' + Math.round(z / eps), idx = new Map(), out = new Map()
  for (let i = 0; i < n; i++) idx.set(key(m.v[3 * i], m.v[3 * i + 1], m.v[3 * i + 2]), i)
  for (let i = 0; i < n; i++) { const j = idx.get(key(-m.v[3 * i], m.v[3 * i + 1], m.v[3 * i + 2])); if (j !== undefined) out.set(i, j) }
  return out
}
// Move verts to new positions (Map i -> [x,y,z]); with mirror on, partners follow mirrored.
function placeVerts(m, pos, mirror, mm) {
  for (const [i, p] of pos) setV(m, i, p)
  if (!mirror) return
  for (const [i, p] of pos) { const j = mm.get(i); if (j === undefined) continue; if (j === i) setV(m, i, [0, p[1], p[2]]); else if (!pos.has(j)) setV(m, j, [-p[0], p[1], p[2]]) }
}

export { V3, add, sub, mul, dot, cross, len, norm, lerp, ek, addV, setV, centroid, fnormal, clean, halfEdges, edgesOf, flipAll, outward, quadSurf, int, revF, clamp1, knifeSeg, mirrorMap, placeVerts }
