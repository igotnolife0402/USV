// Draw: freehand 3D strokes (pen, finger, mouse), line / rectangle / circle helpers, eraser,
// and sketch to mesh (extrude with bevel, revolve). Strokes are README "stroke" objects:
// {type: 'stroke', points: [[x, y, z, w]], radius, color}; w scales the radius (pen pressure, taper).
import * as THREE from 'three'
import { icon, addIcons } from '../core/ui.js'
import { strokeGeometry } from '../core/model.js'

const V3 = THREE.Vector3
addIcons({
  'dr-draw': 'M2 11.5c1.6-5 3.6-7 5-4.6s2.6 4.3 5.5-2.9 M2 14.5h12',
  'dr-pen': 'M10.5 2.5l3 3L6 13H3v-3z M9 4l3 3',
  'dr-line': 'M4.7 11.3l6.6-6.6 M2 12.4a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0 M10.8 3.6a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0',
  'dr-rect': 'M2.5 4h11v8h-11z',
  'dr-circle': 'M2.5 8a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0',
  'dr-sketch': 'M3 12.5l1.2-7.5 5.3-2 4 4.5-2.5 5.5z',
  'dr-erase': 'M5.5 13.5h8 M2.9 9.6l6.2-6.2a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2L7.4 13.5H5.6l-2.7-2.7a.8.8 0 0 1 0-1.2z M6 6.5l4 4',
  'dr-extrude': 'M2.5 11L8 13.5 13.5 11 8 8.5z M8 1.5v5 M5.8 3.7L8 1.5l2.2 2.2',
  'dr-revolve': 'M8 1.5v13 M11.5 5.2c1.8.6 3 1.6 3 2.8 0 1.9-2.9 3.5-6.5 3.5S1.5 9.9 1.5 8c0-1.2 1.2-2.2 3-2.8 M3.2 3.6l1.3 1.6-1.9.8',
  'dr-clear': 'M3 4.5h10 M6.5 4.5V3h3v1.5 M4.5 4.5l.7 9h5.6l.7-9 M6.8 7v4 M9.2 7v4',
})

// ---------- settings (per viewer) ----------
const SWATCHES = ['#ffb347', '#ff5d5d', '#ffd84d', '#5ee08a', '#4cc9f0', '#3d8bfd', '#b07cff', '#ff7ac6', '#f2f2f2', '#2b2f36']
const KEY = 'studio.draw'
const S = { color: '#ffb347', width: 0.2, opacity: 1, smooth: 0.5, pressure: true, taper: true, place: 'surface',
  depth: 1, bevel: 0.1, segments: 32, angle: 360, axis: 'v', at: 'min', keep: false }
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')) } catch {}
const saveS = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch {} }

// ---------- math ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const rnd = (x, d) => { const k = 10 ** d; return Math.round(x * k) / k }
const dist = (a, b) => { let s = 0; for (let k = 0, n = Math.min(a.length, b.length, 3); k < n; k++) s += (a[k] - b[k]) ** 2; return Math.sqrt(s) }

function segDist(p, a, b, dims) {
  const n = Math.min(dims, p.length, a.length, b.length)
  let ab = 0, ap = 0
  for (let k = 0; k < n; k++) { const d = b[k] - a[k]; ab += d * d; ap += d * (p[k] - a[k]) }
  const t = ab > 0 ? clamp(ap / ab, 0, 1) : 0
  let s = 0
  for (let k = 0; k < n; k++) s += (p[k] - a[k] - t * (b[k] - a[k])) ** 2
  return Math.sqrt(s)
}
// Ramer-Douglas-Peucker: drop points closer than eps to the simplified line (keeps both ends).
function rdp(pts, eps, dims = 3) {
  const n = pts.length
  if (n < 3) return pts.slice()
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1
  const stack = [[0, n - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    let md = -1, mi = -1
    for (let i = a + 1; i < b; i++) { const d = segDist(pts[i], pts[a], pts[b], dims); if (d > md) { md = d; mi = i } }
    if (mi > 0 && md > eps) { keep[mi] = 1; stack.push([a, mi], [mi, b]) }
  }
  return pts.filter((_, i) => keep[i])
}
function rdpClosed(poly, eps) { // 2D polygon without a repeated end point
  if (poly.length < 4) return poly.slice()
  let far = 0, fd = -1
  poly.forEach((p, i) => { const d = dist(p, poly[0]); if (d > fd) { fd = d; far = i } })
  const a = rdp(poly.slice(0, far + 1), eps, 2), b = rdp(poly.slice(far).concat([poly[0]]), eps, 2)
  return a.concat(b.slice(1, -1))
}
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t
  return p1.map((_, k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3))
}
// Catmull-Rom through the points, re-sampled every `step` along the curve.
function resample(pts, step, closed) {
  let P = pts
  if (closed && P.length > 2 && dist(P[0], P[P.length - 1]) < 1e-6) P = P.slice(0, -1)
  const n = P.length
  if (n < 3) return pts.map(p => p.slice())
  const at = i => closed ? P[(i + n) % n] : P[clamp(i, 0, n - 1)]
  const segs = closed ? n : n - 1, dense = []
  for (let i = 0; i < segs; i++) {
    const a = at(i), b = at(i + 1), k = clamp(Math.ceil(dist(a, b) / step * 4), 1, 24)
    for (let j = 0; j < k; j++) dense.push(catmull(at(i - 1), a, b, at(i + 2), j / k))
  }
  dense.push((closed ? P[0] : P[n - 1]).slice())
  const out = [dense[0]]
  let acc = 0
  for (let i = 1; i < dense.length; i++) {
    acc += dist(dense[i - 1], dense[i])
    if (acc >= step) { out.push(dense[i]); acc = 0 }
  }
  const last = dense[dense.length - 1]
  if (out.length < 2 || dist(out[out.length - 1], last) > step * 0.35) out.push(last); else out[out.length - 1] = last
  return out
}
// Thin both ends of a stroke (mouse and finger strokes have no pressure).
function taper(pts, radius) {
  const n = pts.length
  if (n < 3) return
  const cum = [0]
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]))
  const L = cum[n - 1], T = Math.min(L * 0.2, radius * 10)
  if (T <= 0) return
  for (let i = 0; i < n; i++) {
    const e = Math.min(cum[i], L - cum[i])
    if (e < T) { const s = e / T; pts[i][3] *= 0.25 + 0.75 * s * (2 - s) }
  }
}
class OneEuro { // one-euro filter on screen pixels: steady when slow, responsive when fast
  constructor(minCutoff, beta) { this.mc = minCutoff; this.beta = beta; this.x = null; this.dx = 0; this.t = 0 }
  a(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt) }
  filter(v, t) {
    if (this.x === null) { this.x = v; this.t = t; return v }
    const dt = Math.max(1e-3, t - this.t); this.t = t
    this.dx += this.a(1, dt) * ((v - this.x) / dt - this.dx)
    this.x += this.a(this.mc + this.beta * Math.abs(this.dx), dt) * (v - this.x)
    return this.x
  }
}
const euro = () => new OneEuro(10 - 9.4 * S.smooth, 0.012)

const area2 = poly => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1] } return s / 2 }
function convex(poly) {
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], c = poly[(i + 2) % n]
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) < -1e-9) return false
  }
  return true
}
// Cap of a CCW 2D polygon: one n-gon when convex, else ear-cut triangles (CCW).
function capFaces(poly, idx) {
  if (convex(poly)) return [idx.slice()]
  const tris = THREE.ShapeUtils.triangulateShape(poly.map(p => new THREE.Vector2(p[0], p[1])), [])
  return tris.map(([a, b, c]) => area2([poly[a], poly[b], poly[c]]) < 0 ? [idx[a], idx[c], idx[b]] : [idx[a], idx[b], idx[c]])
}
function insetPoly(poly, d) { // move each corner of a CCW polygon inward by d (mitred)
  if (!d) return poly.map(p => p.slice())
  const n = poly.length
  return poly.map((p, i) => {
    const a = poly[(i - 1 + n) % n], c = poly[(i + 1) % n]
    const e0 = [p[0] - a[0], p[1] - a[1]], e1 = [c[0] - p[0], c[1] - p[1]]
    const l0 = Math.hypot(...e0) || 1, l1 = Math.hypot(...e1) || 1
    const n0 = [-e0[1] / l0, e0[0] / l0], n1 = [-e1[1] / l1, e1[0] / l1]
    let m = [n0[0] + n1[0], n0[1] + n1[1]]
    const ml = Math.hypot(...m)
    m = ml < 1e-6 ? n0 : [m[0] / ml, m[1] / ml]
    const k = d / Math.max(0.35, m[0] * n0[0] + m[1] * n0[1])
    return [p[0] + m[0] * k, p[1] + m[1] * k]
  })
}
function newell(verts, f) {
  const n = new V3()
  for (let i = 0; i < f.length; i++) {
    const a = verts[f[i]], b = verts[f[(i + 1) % f.length]]
    n.x += (a.y - b.y) * (a.z + b.z); n.y += (a.z - b.z) * (a.x + b.x); n.z += (a.x - b.x) * (a.y + b.y)
  }
  return n
}
function volume(verts, faces) {
  let s = 0
  const c = new V3()
  for (const f of faces) for (let k = 1; k < f.length - 1; k++) s += verts[f[0]].dot(c.crossVectors(verts[f[k]], verts[f[k + 1]]))
  return s / 6
}
function axisSnap(n) {
  for (const k of ['x', 'y', 'z']) if (Math.abs(n[k]) > 0.995) { const s = Math.sign(n[k]); n.set(0, 0, 0); n[k] = s; break }
  return n
}
// Right-handed frame on a plane: u x v = n. Ground planes get u = +X, v = -Z.
function basis(n) {
  const v = Math.abs(n.y) > 0.9 ? new V3(0, 0, -1) : new V3(0, 1, 0)
  v.addScaledVector(n, -v.dot(n)).normalize()
  return { n, u: new V3().crossVectors(v, n), v }
}
// Best plane through the points (Newell), facing the camera; a straight line gets a camera-facing plane.
function fitPlane(pts, camera) {
  const o = new V3(), n = new V3(), box = new THREE.Box3()
  for (const p of pts) { o.add(p); box.expandByPoint(p) }
  o.divideScalar(pts.length)
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    n.x += (a.y - b.y) * (a.z + b.z); n.y += (a.z - b.z) * (a.x + b.x); n.z += (a.x - b.x) * (a.y + b.y)
  }
  const size = box.getSize(new V3()).length() || 1
  const eye = camera ? camera.position.clone() : o.clone().add(new V3(8, 10, 12))
  if (n.length() < 1e-4 * size * size) {
    const dir = pts[pts.length - 1].clone().sub(pts[0]).normalize()
    n.copy(eye).sub(o); n.addScaledVector(dir, -n.dot(dir))
    if (n.lengthSq() < 1e-10) n.set(0, 1, 0).addScaledVector(dir, -dir.y)
    if (n.lengthSq() < 1e-10) n.set(1, 0, 0)
  }
  n.normalize()
  if (n.dot(eye.sub(o)) < 0) n.negate()
  axisSnap(n)
  return { o, ...basis(n) }
}
const to2 = (p, f) => { const d = p.clone().sub(f.o); return [d.dot(f.u), d.dot(f.v)] }
const at3 = (f, a, b, c = 0) => f.o.clone().addScaledVector(f.u, a).addScaledVector(f.v, b).addScaledVector(f.n, c)

function finish(world, faces) { // world points -> geo data centred on its box, plus the object position
  faces = faces.map(f => f.filter((x, i) => x !== f[(i + 1) % f.length])).filter(f => new Set(f).size >= 3)
  const c = new THREE.Box3().setFromPoints(world).getCenter(new V3())
  const pos = [rnd(c.x, 3), rnd(c.y, 3), rnd(c.z, 3)], verts = []
  for (const p of world) verts.push(rnd(p.x - pos[0], 4), rnd(p.y - pos[1], 4), rnd(p.z - pos[2], 4))
  return { geo: { verts, faces, uvs: null }, pos }
}
const box2 = poly => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of poly) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]) } return [c - a, d - b] }

// Closed outline (world points) -> solid: side quads, rounded bevel rings, n-gon or ear-cut caps.
export function extrudeOutline(world, { depth = 1, bevel = 0, bevelSegments = 3, lift = 0 } = {}, camera) {
  const pts = world.slice()
  if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-4) pts.pop()
  if (pts.length < 3) throw new Error('Draw a closed outline first')
  const f = fitPlane(pts, camera)
  if (lift) f.o.addScaledVector(f.n, -lift)
  let poly = pts.map(p => to2(p, f))
  const [w, h] = box2(poly)
  poly = rdpClosed(poly, Math.hypot(w, h) * 0.002)
  if (poly.length < 3 || Math.abs(area2(poly)) < 1e-6) throw new Error('The outline is too small to extrude')
  if (area2(poly) < 0) poly.reverse()
  depth = Math.max(0.01, +depth || 1)
  const b = clamp(+bevel || 0, 0, Math.min(depth * 0.49, Math.min(w, h) * 0.24))
  const bs = b > 1e-4 ? clamp(Math.round(bevelSegments), 1, 8) : 0
  const rings = []
  if (bs) {
    for (let k = 0; k <= bs; k++) { const t = k / bs * Math.PI / 2; rings.push([b * (1 - Math.sin(t)), b * (1 - Math.cos(t))]) }
    for (let k = bs; k >= 0; k--) { const t = k / bs * Math.PI / 2; rings.push([b * (1 - Math.sin(t)), depth - b * (1 - Math.cos(t))]) }
  } else rings.push([0, 0], [0, depth])
  const n = poly.length, verts = [], faces = [], polys = []
  for (const [ins, z] of rings) { const rp = insetPoly(poly, ins); polys.push(rp); for (const p of rp) verts.push(at3(f, p[0], p[1], z)) }
  for (let r = 0; r < rings.length - 1; r++) for (let j = 0; j < n; j++) {
    const j1 = (j + 1) % n
    faces.push([r * n + j, r * n + j1, (r + 1) * n + j1, (r + 1) * n + j])
  }
  const ring = r => Array.from({ length: n }, (_, j) => r * n + j)
  for (const fc of capFaces(polys[0], ring(0))) faces.push(fc.reverse())
  for (const fc of capFaces(polys[rings.length - 1], ring(rings.length - 1))) faces.push(fc)
  if (volume(verts, faces) < 0) faces.forEach(fc => fc.reverse())
  return finish(verts, faces)
}

// Outline or profile (world points) -> lathe around an axis in its plane: 'v' (up in the sketch) or 'u'.
export function revolveOutline(world, { segments = 32, angle = 360, axis = 'v', at = 'min', closed } = {}, camera) {
  const pts = world.slice()
  if (pts.length < 2) throw new Error('Draw a profile first')
  const size = new THREE.Box3().setFromPoints(pts).getSize(new V3()).length() || 1
  const ends = pts[0].distanceTo(pts[pts.length - 1])
  if (closed === undefined) closed = pts.length > 3 && ends < size * 0.02
  if (closed && pts.length > 3 && ends < size * 0.02) pts.pop()
  const f = fitPlane(pts, camera)
  let prof = pts.map(p => to2(p, f))
  prof = closed ? rdpClosed(prof, size * 0.002) : rdp(prof, size * 0.002, 2)
  const A = axis === 'u' ? f.u : f.v, R0 = axis === 'u' ? f.v : f.u, N = f.n
  const ra = prof.map(p => axis === 'u' ? p[1] : p[0]), ha = prof.map(p => axis === 'u' ? p[0] : p[1])
  const lo = Math.min(...ra), hi = Math.max(...ra)
  let r0 = lo, sgn = 1
  if (typeof at === 'number') { r0 = at; sgn = (lo + hi) / 2 >= at ? 1 : -1 } else if (at === 'max') { r0 = hi; sgn = -1 } else if (at === 'center') r0 = (lo + hi) / 2
  const R = R0.clone().multiplyScalar(sgn)
  const P = prof.map((_, i) => [Math.abs(ra[i] - r0), ha[i]])
  if (closed && area2(P) < 0) P.reverse()
  if (P.every(p => p[0] < 1e-4)) throw new Error('The profile lies on the axis')
  const S = clamp(Math.round(+segments || 32), 3, 128), full = angle >= 359.99
  const ang = THREE.MathUtils.degToRad(clamp(+angle || 360, 1, 360)), cols = full ? S : S + 1
  const base = f.o.clone().addScaledVector(R0, r0), verts = [], idx = []
  for (const [r, h] of P) {
    const c = base.clone().addScaledVector(A, h)
    if (r < 1e-4) { verts.push(c); idx.push(new Array(cols).fill(verts.length - 1)); continue }
    const row = []
    for (let j = 0; j < cols; j++) {
      const t = ang * j / S
      row.push(verts.length); verts.push(c.clone().addScaledVector(R, r * Math.cos(t)).addScaledVector(N, r * Math.sin(t)))
    }
    idx.push(row)
  }
  const right = new V3().crossVectors(R, A).dot(N) > 0, m = P.length, faces = []
  for (let i = 0; i < (closed ? m : m - 1); i++) {
    const i1 = (i + 1) % m
    for (let j = 0; j < S; j++) {
      const j1 = full ? (j + 1) % S : j + 1, q = [idx[i][j], idx[i1][j], idx[i1][j1], idx[i][j1]]
      faces.push(right ? q : q.reverse())
    }
  }
  if (closed && !full) for (const [col, sign] of [[0, -1], [S, 1]]) {
    const t = ang * col / S, want = R.clone().multiplyScalar(-Math.sin(t)).addScaledVector(N, Math.cos(t)).multiplyScalar(sign)
    const cap = capFaces(P, idx.map(row => row[col])), nn = new V3()
    for (const fc of cap) nn.add(newell(verts, fc))
    for (const fc of cap) faces.push(nn.dot(want) < 0 ? fc.reverse() : fc)
  }
  if (closed) { if (volume(verts, faces) < 0) faces.forEach(fc => fc.reverse()) } else {
    let s = 0
    for (const fc of faces) {
      const c = new V3(); fc.forEach(i => c.add(verts[i])); c.divideScalar(fc.length).sub(base)
      c.addScaledVector(A, -c.dot(A)); s += newell(verts, fc).dot(c)
    }
    if (s < 0) faces.forEach(fc => fc.reverse())
  }
  return finish(verts, faces)
}

// ---------- scene helpers ----------
let APP = null, st = null, preview = null, bar = null, curTool = null, panelEl = null

const selIds = app => Array.from(app.selection || [])
function strokeIds(app, a = {}) { return (a.ids || selIds(app)).filter(id => app.obj(id)?.type === 'stroke') }
function strokeWorld(app, id) {
  const o = app.obj(id), m = app.worldMatrix(id)
  return (o.points || []).map(p => new V3(p[0], p[1], p[2]).applyMatrix4(m))
}
function sources(app, a = {}) {
  if (a.points) return [{ pts: a.points.map(p => new V3(+p[0], +p[1], +p[2])) }]
  return strokeIds(app, a).map(id => ({ id, obj: app.obj(id), pts: strokeWorld(app, id) }))
}
const allStrokes = app => app.ids().filter(id => app.obj(id)?.type === 'stroke')
function defCenter(app) {
  const t = app.viewport?.orbit?.target
  return [t ? rnd(t.x, 2) : 0, rnd(S.width / 2 + 0.01, 3), t ? rnd(t.z, 2) : 0]
}

// World points [[x,y,z,w?]] -> stroke object (smoothed, simplified, centred on its own position).
function makeStroke(app, a) {
  const radius = clamp(+(a.radius ?? (a.width ?? S.width) / 2) || 0.1, 0.005, 5)
  let pts = (a.points || []).map(p => [+p[0], +p[1], +p[2], p[3] == null ? 1 : +p[3]])
  if (pts.length < 2) throw new Error('A stroke needs at least 2 points')
  if (pts.some(p => p.some(x => !Number.isFinite(x)))) throw new Error('Stroke points must be numbers')
  const closed = !!a.closed
  if (closed && dist(pts[0], pts[pts.length - 1]) > 1e-6) pts.push(pts[0].slice())
  if ((a.smooth ?? true) && pts.length > 2) pts = resample(pts, clamp(radius * 0.8, 0.01, 0.5), closed)
  if (a.taper && !closed) taper(pts, radius)
  if (pts.length > 2) pts = rdp(pts.map(p => [p[0], p[1], p[2], p[3] * radius]), Math.max(0.002, radius * 0.06), 4).map(p => [p[0], p[1], p[2], p[3] / radius])
  const c = [0, 1, 2].map(k => pts.reduce((s, p) => s + p[k], 0) / pts.length)
  const pos = c.map(x => rnd(x, 3)), d = radius < 0.15 ? 3 : 2
  const obj = { type: 'stroke', name: a.name || 'Stroke', pos,
    points: pts.map(p => [rnd(p[0] - pos[0], d), rnd(p[1] - pos[1], d), rnd(p[2] - pos[2], d), rnd(p[3], 2)]),
    radius: rnd(radius, 4), color: a.color || S.color }
  const op = clamp(+(a.opacity ?? S.opacity), 0.05, 1)
  if (op < 1) obj.transparency = rnd(1 - op, 2)
  const id = app.add(obj)
  if (a.select) app.select([id])
  return id
}
function planeFrame(normal) { return basis(axisSnap(new V3(...(normal || [0, 1, 0])).normalize())) }
function rectPoints(center, size, normal) {
  const f = planeFrame(normal), c = new V3(...center), [w, h] = size
  return [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([a, b]) => c.clone().addScaledVector(f.u, a * w / 2).addScaledVector(f.v, b * h / 2).toArray())
}
function circlePoints(center, r, normal, seg = 48) {
  const f = planeFrame(normal), c = new V3(...center), out = []
  for (let i = 0; i <= seg; i++) { const t = i / seg * Math.PI * 2; out.push(c.clone().addScaledVector(f.u, r * Math.cos(t)).addScaledVector(f.v, r * Math.sin(t)).toArray()) }
  return out
}
const vec = (v, d) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite) ? v.map(Number) : d

// ---------- pointer placement ----------
const cam = () => APP.viewport.camera
const camDir = () => cam().getWorldDirection(new V3())
function rayAt(x, y) { const r = APP.viewport.ray(x, y); return r.ray || r }
function surfaceHit(x, y) {
  let h = null
  try { h = APP.viewport.pick(x, y, { locked: true, filter: id => APP.obj(id)?.type !== 'stroke' }) } catch { h = null }
  if (!h || !h.point) return null
  const n = h.normal ? h.normal.clone() : h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new V3(0, 1, 0)
  if (n.dot(rayAt(x, y).direction) > 0) n.negate()
  return { point: h.point.clone(), n: n.normalize() }
}
const groundPlane = y => new THREE.Plane(new V3(0, 1, 0), -y)
function depthAt(x, y) { // view depth for a camera-facing plane: the surface, else the ground, else the orbit target
  const d = camDir(), c = cam().position
  const h = surfaceHit(x, y)
  if (h) return h.point.sub(c).dot(d)
  const g = rayAt(x, y).intersectPlane(groundPlane(0), new V3())
  if (g && g.distanceTo(c) < 400) return g.sub(c).dot(d)
  const t = APP.viewport.orbit?.target
  return t ? Math.max(1, t.clone().sub(c).dot(d)) : 10
}
function viewPlane(depth) { const d = camDir(); return new THREE.Plane().setFromNormalAndCoplanarPoint(d, cam().position.clone().addScaledVector(d, depth)) }
function penPoint(x, y, w) {
  const r = S.width / 2 * w, ray = rayAt(x, y)
  if (S.place === 'surface') {
    const h = surfaceHit(x, y)
    if (h) { st.depth = h.point.clone().sub(cam().position).dot(camDir()); return h.point.addScaledVector(h.n, r + 0.01) }
  }
  if (S.place === 'ground') { const g = ray.intersectPlane(groundPlane(r + 0.01), new V3()); if (g) return g }
  if (st.depth == null) st.depth = depthAt(x, y)
  return ray.intersectPlane(viewPlane(st.depth), new V3())
}
// Fixed plane for shapes and outlines: the surface under the pointer, else the ground, else facing the camera.
function shapePlane(x, y) {
  const ray = rayAt(x, y), off = S.width / 2 + 0.01
  let n = null, p = null
  if (S.place === 'surface') { const h = surfaceHit(x, y); if (h) { n = h.n; p = h.point } }
  if (!p && S.place !== 'view') {
    const g = ray.intersectPlane(groundPlane(0), new V3())
    if (g && g.distanceTo(ray.origin) < 400) { n = new V3(0, 1, 0); p = g }
  }
  if (!p) { n = camDir().negate(); p = ray.intersectPlane(viewPlane(depthAt(x, y)), new V3()) || ray.at(10, new V3()) }
  axisSnap(n)
  const f = basis(n), plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p)
  return { ...f, o: p.clone().addScaledVector(n, off), plane, off }
}
// Pointer -> point on the shape's surface plane, lifted by the brush radius (so it lands right under the pointer).
const onPlane = (pl, x, y) => { const p = rayAt(x, y).intersectPlane(pl.plane, new V3()); return p && p.addScaledVector(pl.n, pl.off) }
const primary = ev => !ev.alt && !(ev.pointerType === 'mouse' && ev.button !== 0)
const now = ev => (ev.native?.timeStamp ?? performance.now()) / 1000

// ---------- live preview (a helper tube; never saved) ----------
function showPreview(pts, radius) {
  const vp = APP.viewport
  if (!preview) {
    preview = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.55 }))
    preview.userData.helper = true
    vp.helpers.add(preview)
  }
  preview.material.color.set(S.color)
  preview.material.transparent = S.opacity < 1
  preview.material.opacity = S.opacity
  if (pts.length >= 2) {
    const g = strokeGeometry(pts, radius)
    preview.geometry.dispose(); preview.geometry = g; preview.visible = true
  } else preview.visible = false
  vp.requestRender()
}
function hidePreview() {
  if (!preview) return
  preview.removeFromParent(); preview.geometry.dispose(); preview.material.dispose(); preview = null
  APP.viewport?.requestRender()
}
function cancel() {
  if (st?.kind === 'erase') for (const id of st.hit) { const o = APP.viewport?.objects.get(id); if (o) o.visible = true }
  st = null; hidePreview(); updateBar()
}

// ---------- tools ----------
const penTool = {
  onDown(ev) {
    if (!primary(ev)) return false
    st = { kind: 'pen', pts: [], fx: euro(), fy: euro(), depth: null, pressure: S.pressure && ev.pointerType === 'pen' }
    penAdd(ev)
    return true
  },
  onMove(ev) { if (st?.kind !== 'pen') return; penAdd(ev); showPreview(st.pts, S.width / 2) },
  onUp(ev) {
    if (st?.kind !== 'pen') return
    penAdd(ev, true)
    const s = st; st = null; hidePreview()
    if (s.pts.length < 2) return
    APP.exec('draw.stroke', { points: s.pts, width: S.width, color: S.color, opacity: S.opacity, smooth: true, taper: S.taper && !s.pressure })
  },
  onCancel() { cancel() },
}
function penAdd(ev, final) {
  let x = ev.clientX, y = ev.clientY
  if (S.smooth > 0) { const t = now(ev); x = st.fx.filter(x, t); y = st.fy.filter(y, t) }
  if (st.sx !== undefined && Math.hypot(x - st.sx, y - st.sy) < (final ? 0.5 : 2)) return
  const w = st.pressure ? clamp(0.2 + (ev.pressure || 0.5) * 1.2, 0.15, 1.6) : 1
  const p = penPoint(x, y, w)
  if (!p) return
  st.sx = x; st.sy = y
  st.pts.push([p.x, p.y, p.z, w])
}

function shapeTool(kind) {
  const pts = () => {
    const f = st.pl, a = to2(st.a, f), b = to2(st.b, f)
    if (kind === 'sketch') return st.pts
    if (kind === 'line') {
      let du = b[0] - a[0], dv = b[1] - a[1]
      if (st.shift) { const L = Math.hypot(du, dv), t = Math.round(Math.atan2(dv, du) / (Math.PI / 12)) * Math.PI / 12; du = L * Math.cos(t); dv = L * Math.sin(t) }
      return [st.a.toArray(), at3(f, a[0] + du, a[1] + dv).toArray()]
    }
    if (kind === 'rect') {
      let du = b[0] - a[0], dv = b[1] - a[1]
      if (st.shift) { const m = Math.max(Math.abs(du), Math.abs(dv)); du = Math.sign(du || 1) * m; dv = Math.sign(dv || 1) * m }
      return rectPoints(at3(f, a[0] + du / 2, a[1] + dv / 2).toArray(), [Math.abs(du), Math.abs(dv)], f.n.toArray())
    }
    return circlePoints(st.a.toArray(), Math.hypot(b[0] - a[0], b[1] - a[1]), f.n.toArray())
  }
  return {
    onDown(ev) {
      if (!primary(ev)) return false
      const pl = shapePlane(ev.clientX, ev.clientY)
      const a = onPlane(pl, ev.clientX, ev.clientY) || pl.o.clone()
      st = { kind, pl, a, b: a.clone(), pts: [[a.x, a.y, a.z, 1]], fx: euro(), fy: euro(), shift: ev.shift }
      st.fx.filter(ev.clientX, now(ev)); st.fy.filter(ev.clientY, now(ev))
      return true
    },
    onMove(ev) {
      if (st?.kind !== kind) return
      let x = ev.clientX, y = ev.clientY
      if (kind === 'sketch' && S.smooth > 0) { const t = now(ev); x = st.fx.filter(x, t); y = st.fy.filter(y, t) }
      const b = onPlane(st.pl, x, y)
      if (!b) return
      st.b = b; st.shift = ev.shift
      if (kind === 'sketch') { const l = st.pts[st.pts.length - 1]; if (dist(l, b.toArray()) > S.width * 0.25) st.pts.push([b.x, b.y, b.z, 1]) }
      const p = pts()
      showPreview(kind === 'sketch' && p.length > 2 ? p.concat([p[0]]) : p, S.width / 2)
    },
    onUp(ev) {
      if (st?.kind !== kind) return
      const s = st, p = pts(), f = s.pl
      st = null; hidePreview()
      const a = to2(s.a, f), b = to2(s.b, f), span = Math.hypot(b[0] - a[0], b[1] - a[1])
      const common = { width: S.width, color: S.color, opacity: S.opacity }
      if (kind === 'sketch') {
        if (p.length < 4) return
        APP.exec('draw.stroke', { ...common, points: p, closed: true, smooth: true, name: 'Outline', select: true })
      } else if (span < Math.max(0.05, S.width)) return
      else if (kind === 'line') APP.exec('draw.line', { ...common, from: p[0], to: p[1] })
      else if (kind === 'rect') {
        const u = p.slice(0, 4).map(q => to2(new V3(...q), f)), w = box2(u)
        const c = new V3(...p[0]).add(new V3(...p[2])).multiplyScalar(0.5)
        APP.exec('draw.rect', { ...common, center: c.toArray(), size: w, normal: f.n.toArray(), select: true })
      } else APP.exec('draw.circle', { ...common, center: s.a.toArray(), radius: span, normal: f.n.toArray(), select: true })
    },
    onCancel() { cancel() },
  }
}

const eraseTool = {
  onDown(ev) {
    if (!primary(ev)) return false
    st = { kind: 'erase', hit: new Set(), cands: screenStrokes(), tol: ev.pointerType === 'mouse' ? 10 : 22 }
    eraseAt(ev)
    return true
  },
  onMove(ev) { if (st?.kind === 'erase') eraseAt(ev) },
  onUp() {
    if (st?.kind !== 'erase') return
    const ids = [...st.hit]
    cancel()
    if (ids.length) APP.exec('draw.erase', { ids })
  },
  onCancel() { cancel() },
}
function screenStrokes() { // each visible stroke as a screen-space polyline
  const vp = APP.viewport, out = []
  for (const id of allStrokes(APP)) {
    if (APP.isHidden?.(id) || APP.isLocked?.(id)) continue
    const o = APP.obj(id), m = APP.worldMatrix(id), step = Math.max(1, Math.ceil((o.points?.length || 0) / 200)), s = []
    for (let i = 0; i < o.points.length; i += step) {
      const p = vp.project(new V3(o.points[i][0], o.points[i][1], o.points[i][2]).applyMatrix4(m))
      if (p.z < 1) s.push([p.x, p.y])
    }
    if (s.length) out.push({ id, s })
  }
  return out
}
function eraseAt(ev) {
  const q = [ev.clientX, ev.clientY]
  for (const c of st.cands) {
    if (st.hit.has(c.id)) continue
    let best = c.s.length === 1 ? dist(q, c.s[0]) : Infinity
    for (let i = 1; i < c.s.length && best > st.tol; i++) best = Math.min(best, segDist(q, c.s[i - 1], c.s[i], 2))
    if (best <= st.tol) {
      st.hit.add(c.id)
      const o = APP.viewport.objects.get(c.id)
      if (o) { o.visible = false; APP.viewport.requestRender() }
    }
  }
}

// ---------- UI: panel and the floating sketch bar ----------
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }
// [tool id, short label, icon, key, long label]. Core dispatches only command keys, so each tool also gets a command.
const TOOLS = [['draw.pen', 'Pen', 'dr-pen', 'B', 'Pen'], ['draw.line', 'Line', 'dr-line', 'L', 'Line'], ['draw.rect', 'Rect', 'dr-rect', 'M', 'Rectangle'],
  ['draw.circle', 'Circle', 'dr-circle', 'O', 'Circle'], ['draw.sketch', 'Outline', 'dr-sketch', 'S', 'Outline'], ['draw.erase', 'Eraser', 'dr-erase', 'X', 'Eraser']]
const toolCmds = Object.fromEntries(TOOLS.map(([id, , ic, key, label]) => [id.replace('draw.', 'draw.tool.'), { label: label + ' tool', icon: ic, key, mode: 'draw', noUndo: true,
  enabled: app => app.mode === 'draw', checked: app => app.tool === id, run(app) { app.setTool(id) } }]))

function sec(title, ...kids) {
  const s = h('div', 'sec'), b = h('div', 'sec-b')
  s.append(h('div', 'sec-h', title), b); b.append(...kids)
  return s
}
function row(label, ...kids) { const r = h('div', 'draw-row'); r.append(h('label', 'draw-lab', label), ...kids); return r }
function segCtl(options, get, set) {
  const el = h('div', 'draw-seg')
  for (const [v, label] of options) {
    const b = h('button', 'draw-sb', label); b.type = 'button'; b.dataset.v = v
    b.onclick = () => { set(v); el.querySelectorAll('.draw-sb').forEach(x => x.classList.toggle('on', x.dataset.v === String(get()))) }
    b.classList.toggle('on', String(v) === String(get()))
    el.append(b)
  }
  return el
}
function sliderCtl(label, { min, max, step, get, set, fmt, toS = v => v, fromS = v => v }) {
  const inp = h('input', 'draw-rng'); Object.assign(inp, { type: 'range', min, max, step }); inp.value = fromS(get())
  const out = h('span', 'draw-val', fmt(get()))
  inp.oninput = () => { set(toS(+inp.value)); out.textContent = fmt(get()); saveS() }
  return row(label, inp, out)
}
function toggleCtl(label, key) {
  const b = h('button', 'draw-tog' + (S[key] ? ' on' : ''), '<i></i>'); b.type = 'button'; b.setAttribute('aria-pressed', S[key])
  b.onclick = () => { S[key] = !S[key]; saveS(); b.classList.toggle('on', S[key]); b.setAttribute('aria-pressed', S[key]) }
  return row(label, b)
}
function numCtl(label, key, step, min, max) {
  const inp = h('input', 'draw-num'); Object.assign(inp, { type: 'number', step, min, max, inputMode: 'decimal' }); inp.value = S[key]
  inp.onchange = () => { const v = parseFloat(inp.value); if (Number.isFinite(v)) { S[key] = clamp(v, min, max); saveS() } inp.value = S[key] }
  return row(label, inp)
}
function btn(label, ic, fn, cls = '') { const b = h('button', 'draw-btn ' + cls, icon(ic) + `<span>${label}</span>`); b.type = 'button'; b.onclick = fn; return b }

function renderPanel(el, app) {
  panelEl = el
  el.innerHTML = ''
  const tools = h('div', 'draw-tools')
  for (const [id, label, ic] of TOOLS) {
    const b = h('button', 'draw-tb', icon(ic) + `<span>${label}</span>`); b.type = 'button'; b.dataset.tool = id; b.title = label
    b.onclick = () => app.setTool(id)
    tools.append(b)
  }
  const sw = h('div', 'draw-sws')
  const col = h('input', 'draw-col'); col.type = 'color'; col.value = S.color; col.title = 'Custom colour'
  const pickColor = c => { S.color = c; col.value = c; saveS(); sw.querySelectorAll('.draw-sw').forEach(x => x.classList.toggle('on', x.dataset.c === c)) }
  for (const c of SWATCHES) { const s = h('button', 'draw-sw'); s.type = 'button'; s.dataset.c = c; s.style.background = c; s.title = c; s.onclick = () => pickColor(c); sw.append(s) }
  col.oninput = () => pickColor(col.value)
  sw.append(col)
  pickColor(S.color)
  const lg = Math.log(100)
  el.append(
    sec('Tool', tools),
    sec('Brush', sw,
      sliderCtl('Width', { min: 0, max: 100, step: 1, get: () => S.width, set: v => { S.width = v }, fmt: v => v.toFixed(2),
        toS: x => rnd(0.02 * Math.exp(lg * x / 100), 3), fromS: v => Math.round(Math.log(v / 0.02) / lg * 100) }),
      sliderCtl('Opacity', { min: 0.1, max: 1, step: 0.05, get: () => S.opacity, set: v => { S.opacity = v }, fmt: v => Math.round(v * 100) + '%' }),
      sliderCtl('Smoothing', { min: 0, max: 1, step: 0.05, get: () => S.smooth, set: v => { S.smooth = v }, fmt: v => Math.round(v * 100) + '%' }),
      toggleCtl('Pressure', 'pressure'), toggleCtl('Taper ends', 'taper'),
      row('Place on', segCtl([['surface', 'Surface'], ['view', 'View'], ['ground', 'Ground']], () => S.place, v => { S.place = v; saveS() }))),
    sec('Sketch to mesh',
      h('div', 'draw-hint mute', 'Select an outline drawn with Outline, Rect or Circle.'),
      numCtl('Depth', 'depth', 0.1, 0.01, 1000), numCtl('Bevel', 'bevel', 0.05, 0, 100),
      btn('Extrude', 'dr-extrude', () => app.exec('draw.extrude', {}), 'pri draw-act'),
      numCtl('Segments', 'segments', 1, 3, 128), numCtl('Angle', 'angle', 15, 1, 360),
      row('Axis', segCtl([['v', 'Vertical'], ['u', 'Horizontal']], () => S.axis, v => { S.axis = v; saveS() })),
      row('Axis at', segCtl([['min', 'Edge'], ['center', 'Centre'], ['max', 'Far edge']], () => S.at, v => { S.at = v; saveS() })),
      btn('Revolve', 'dr-revolve', () => app.exec('draw.revolve', {}), 'draw-act'),
      toggleCtl('Keep outline', 'keep')),
    sec('Strokes', h('div', 'draw-count mono mute'), btn('Clear all strokes', 'dr-clear', () => app.exec('draw.clear', {}), 'danger')))
  syncPanel()
}
function syncPanel() {
  const el = panelEl
  if (!el || !el.isConnected || !APP) return
  el.querySelectorAll('.draw-tb').forEach(b => b.classList.toggle('on', b.dataset.tool === curTool))
  const sel = strokeIds(APP).length > 0
  el.querySelectorAll('.draw-act').forEach(b => { b.disabled = !sel })
  const hint = el.querySelector('.draw-hint'); if (hint) hint.hidden = sel
  const n = allStrokes(APP).length, c = el.querySelector('.draw-count')
  if (c) c.textContent = n === 1 ? '1 stroke' : `${n} strokes`
}
function canvasEl() { const vp = APP.viewport; return vp?.renderer?.domElement || vp?.canvas || document.querySelector('canvas') }
function updateBar() {
  if (!APP) return
  if (!bar) {
    bar = h('div', 'draw-bar'); bar.hidden = true
    bar.append(btn('Extrude', 'dr-extrude', () => APP.exec('draw.extrude', {}), 'pri'), btn('Revolve', 'dr-revolve', () => APP.exec('draw.revolve', {})))
    document.body.append(bar)
  }
  const show = APP.mode === 'draw' && !st && strokeIds(APP).length > 0
  if (show) {
    const cv = canvasEl(), r = cv ? cv.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth }
    bar.style.left = Math.round(r.left + r.width / 2) + 'px'
    bar.style.top = Math.round(r.top + 12) + 'px'
  }
  bar.hidden = !show
}

const CSS = `
.draw-row{display:flex;align-items:center;gap:8px;min-height:var(--h,28px);margin:2px 0}
.draw-lab{flex:0 0 76px;color:var(--mute);font-size:12px}
.draw-val{flex:0 0 40px;text-align:right;font:11px 'JetBrains Mono',ui-monospace,monospace;color:var(--text)}
.draw-rng{flex:1;min-width:0;accent-color:var(--accent);height:var(--h,28px);margin:0}
.draw-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.draw-tb{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:44px;border:1px solid var(--line);border-radius:var(--r,6px);background:var(--panel2);color:var(--text);font:500 11px Inter,system-ui,sans-serif;cursor:pointer}
.draw-tb:hover{background:var(--hover,#2c3038)}
.draw-tb.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 22%,var(--panel2));color:#fff}
.draw-sws{display:flex;flex-wrap:wrap;gap:5px;margin:2px 0 6px}
.draw-sw{width:22px;height:22px;border-radius:50%;border:2px solid var(--panel);box-shadow:0 0 0 1px var(--line);cursor:pointer;padding:0}
.draw-sw.on{box-shadow:0 0 0 2px var(--accent)}
.draw-col{width:22px;height:22px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer}
.draw-col::-webkit-color-swatch-wrapper{padding:0}.draw-col::-webkit-color-swatch{border:1px dashed var(--mute);border-radius:50%}
.draw-seg{flex:1;display:flex;background:var(--field,#14161a);border:1px solid var(--line);border-radius:var(--r,6px);padding:2px;gap:2px;min-width:0}
.draw-sb{flex:1;min-width:0;height:calc(var(--h,28px) - 6px);border:0;border-radius:4px;background:none;color:var(--mute);font:500 11px Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.draw-sb.on{background:var(--panel2);color:var(--text);box-shadow:0 0 0 1px var(--line)}
.draw-tog{width:34px;height:20px;border-radius:10px;border:1px solid var(--line);background:var(--field,#14161a);position:relative;cursor:pointer;padding:0}
.draw-tog i{position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:var(--mute);transition:transform .12s}
.draw-tog.on{background:var(--accent);border-color:var(--accent)}.draw-tog.on i{transform:translateX(14px);background:#fff}
.draw-num{flex:1;min-width:0;height:var(--h,28px);box-sizing:border-box;background:var(--field,#14161a);border:1px solid var(--line);border-radius:var(--r,6px);color:var(--text);padding:0 8px;font:12px 'JetBrains Mono',ui-monospace,monospace}
.draw-num:focus{outline:none;border-color:var(--accent)}
.draw-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;height:var(--h,28px);margin:4px 0 8px;border:1px solid var(--line);border-radius:var(--r,6px);background:var(--panel2);color:var(--text);font:500 12px Inter,system-ui,sans-serif;cursor:pointer}
.draw-btn:hover:not(:disabled){background:var(--hover,#2c3038)}
.draw-btn.pri{background:var(--accent);border-color:var(--accent);color:#fff}
.draw-btn.danger{color:var(--danger)}
.draw-btn:disabled{opacity:.45;cursor:default}
.draw-hint{font-size:12px;margin:0 0 6px;line-height:1.4}
.draw-count{font-size:11px;margin:2px 0 4px}
.draw-bar{position:fixed;z-index:20;transform:translateX(-50%);display:flex;gap:4px;padding:4px;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.45)}
.draw-bar[hidden]{display:none}
.draw-bar .draw-btn{width:auto;margin:0;padding:0 12px;border:0}
@media (pointer:coarse){.draw-tb,.draw-btn,.draw-num,.draw-rng,.draw-row{min-height:44px}.draw-seg{padding:0;gap:0}.draw-sb{height:44px}.draw-sws{gap:6px}.draw-sw,.draw-col{width:44px;height:44px}.draw-tog{width:60px;height:44px;border-radius:22px}.draw-tog i{left:3px;top:3px;width:36px;height:36px}.draw-tog.on i{transform:translateX(16px)}.draw-bar .draw-btn{height:44px;padding:0 16px;font-size:13px}}
`

// ---------- plugin ----------
const tool = (id, label, ic, key, order, impl) => ({ id, label, icon: ic, key, mode: 'draw', order, ...impl,
  onActivate() { curTool = id; syncPanel() }, onDeactivate() { cancel(); if (curTool === id) curTool = null; syncPanel() } })

export default {
  id: 'draw', name: 'Draw',
  commands: {
    'draw.mode': { label: 'Draw mode', icon: 'dr-draw', noUndo: true, checked: app => app.mode === 'draw',
      run(app) { app.setMode(app.mode === 'draw' ? 'build' : 'draw') } },
    ...toolCmds,
    'draw.stroke': { label: 'Add stroke', icon: 'dr-pen',
      run(app, a = {}) {
        if (!a.points) { const c = defCenter(app); a = { ...a, points: [[c[0] - 2, c[1], c[2]], [c[0], c[1] + 1, c[2]], [c[0] + 2, c[1], c[2]]] } }
        return makeStroke(app, a)
      } },
    'draw.line': { label: 'Add line', icon: 'dr-line',
      run(app, a = {}) {
        const c = defCenter(app), from = vec(a.from, [c[0] - 2, c[1], c[2]]), to = vec(a.to, [c[0] + 2, c[1], c[2]])
        return makeStroke(app, { ...a, points: [from, to], smooth: false, taper: false, name: a.name || 'Line' })
      } },
    'draw.rect': { label: 'Add rectangle outline', icon: 'dr-rect',
      run(app, a = {}) {
        const size = Array.isArray(a.size) ? [+a.size[0] || 4, +(a.size[1] ?? a.size[0]) || 4] : [4, 4]
        return makeStroke(app, { ...a, points: rectPoints(vec(a.center, defCenter(app)), size, vec(a.normal, [0, 1, 0])), closed: true, smooth: false, taper: false, name: a.name || 'Rectangle' })
      } },
    'draw.circle': { label: 'Add circle outline', icon: 'dr-circle',
      run(app, a = {}) {
        const r = Math.max(0.01, +a.radius || 2), seg = clamp(Math.round(+a.segments || 48), 3, 256)
        return makeStroke(app, { ...a, radius: undefined, points: circlePoints(vec(a.center, defCenter(app)), r, vec(a.normal, [0, 1, 0]), seg), closed: true, smooth: false, taper: false, name: a.name || 'Circle' })
      } },
    'draw.erase': { label: 'Erase strokes', icon: 'dr-erase', enabled: (app, a = {}) => strokeIds(app, a).length > 0,
      run(app, a = {}) { const ids = strokeIds(app, a); if (ids.length) app.remove(ids); return ids.length } },
    'draw.clear': { label: 'Clear all strokes', icon: 'dr-clear', enabled: app => allStrokes(app).length > 0,
      run(app) { const ids = allStrokes(app); if (ids.length) app.remove(ids); return ids.length } },
    'draw.extrude': { label: 'Extrude outline', icon: 'dr-extrude', enabled: (app, a = {}) => !!a.points || strokeIds(app, a).length > 0,
      run(app, a = {}) {
        const src = sources(app, a)
        if (!src.length) throw new Error('Select an outline stroke first')
        const out = []
        for (const s of src) {
          const r = extrudeOutline(s.pts, { depth: a.depth ?? S.depth, bevel: a.bevel ?? S.bevel, bevelSegments: a.bevelSegments ?? 3,
            lift: s.obj ? (s.obj.radius || 0) + 0.01 : 0 }, app.viewport?.camera)
          out.push(app.add({ type: 'mesh', name: a.name || 'Extrude', geo: app.geo.put(r.geo), pos: r.pos, color: a.color || s.obj?.color || S.color, smooth: false }))
        }
        const ids = src.filter(s => s.id).map(s => s.id)
        if (!(a.keep ?? S.keep) && ids.length) app.remove(ids)
        if (a.select !== false) app.select(out)
        return out.length === 1 ? out[0] : out
      } },
    'draw.revolve': { label: 'Revolve outline', icon: 'dr-revolve', enabled: (app, a = {}) => !!a.points || strokeIds(app, a).length > 0,
      run(app, a = {}) {
        const src = sources(app, a)
        if (!src.length) throw new Error('Select a profile stroke first')
        const out = []
        for (const s of src) {
          const r = revolveOutline(s.pts, { segments: a.segments ?? S.segments, angle: a.angle ?? S.angle, axis: a.axis ?? S.axis, at: a.at ?? S.at, closed: a.closed }, app.viewport?.camera)
          out.push(app.add({ type: 'mesh', name: a.name || 'Revolve', geo: app.geo.put(r.geo), pos: r.pos, color: a.color || s.obj?.color || S.color, smooth: true }))
        }
        const ids = src.filter(s => s.id).map(s => s.id)
        if (!(a.keep ?? S.keep) && ids.length) app.remove(ids)
        if (a.select !== false) app.select(out)
        return out.length === 1 ? out[0] : out
      } },
  },
  menus: {
    Draw: ['draw.mode', '-', ...Object.keys(toolCmds), '-', 'draw.line', 'draw.rect', 'draw.circle', '-', 'draw.extrude', 'draw.revolve', '-', 'draw.erase', 'draw.clear'],
    Model: ['-', 'draw.extrude', 'draw.revolve'],
  },
  modes: [{ id: 'draw', label: 'Draw', icon: 'dr-draw', order: 30 }],
  tools: TOOLS.map(([id, label, ic, key], i) => tool(id, label, ic, key, i + 1,
    [penTool, shapeTool('line'), shapeTool('rect'), shapeTool('circle'), shapeTool('sketch'), eraseTool][i])),
  panels: [{ id: 'draw', label: 'Draw', icon: 'dr-draw', mode: 'draw', where: 'right', order: 5,
    render: (el, app) => renderPanel(el, app),
    refresh: (el, app, ev) => { if (ev?.type === 'mode' || ev?.type === 'project' || el !== panelEl) renderPanel(el, app); else syncPanel() } }],
  importers: [], exporters: [], types: {},
  init(app) {
    APP = app
    if (!document.getElementById('pl-draw')) { const s = h('style'); s.id = 'pl-draw'; s.textContent = CSS; document.head.append(s) }
    app.on('select', () => { syncPanel(); updateBar() })
    app.on('change', () => { syncPanel(); updateBar() })
    app.on('project', () => { cancel() })
    app.on('mode', () => {
      if (app.mode === 'draw') { if (!curTool) app.setTool('draw.pen') } else cancel()
      updateBar()
    })
  },
}
