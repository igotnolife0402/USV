// Scene JSON <-> three.js objects, polygon mesh <-> BufferGeometry. No DOM: Node (CLI) imports this too.
import * as THREE from 'three'

export const SHAPES = ['box', 'sphere', 'cylinder', 'wedge', 'cornerwedge', 'cone', 'torus', 'plane', 'capsule']

// Roblox-style material presets. pattern = procedural detail map, tile = studs per texture repeat.
export const MATERIALS = {
  Plastic: { roughness: 0.62, metalness: 0 },
  SmoothPlastic: { roughness: 0.32, metalness: 0 },
  Wood: { roughness: 0.78, pattern: 'wood', tile: 4 },
  WoodPlanks: { roughness: 0.8, pattern: 'planks', tile: 4 },
  Brick: { roughness: 0.92, pattern: 'bricks', tile: 4 },
  Cobblestone: { roughness: 0.9, pattern: 'cobble', tile: 4 },
  Concrete: { roughness: 0.95, pattern: 'noise', tile: 6 },
  Slate: { roughness: 0.88, pattern: 'slate', tile: 6 },
  Granite: { roughness: 0.8, pattern: 'granite', tile: 4 },
  Marble: { roughness: 0.25, pattern: 'marble', tile: 8 },
  Sand: { roughness: 1, pattern: 'sand', tile: 3 },
  Grass: { roughness: 0.95, pattern: 'grass', tile: 3 },
  Fabric: { roughness: 1, pattern: 'fabric', tile: 2 },
  Metal: { roughness: 0.38, metalness: 0.85, pattern: 'brushed', tile: 4 },
  DiamondPlate: { roughness: 0.35, metalness: 0.85, pattern: 'diamond', tile: 2 },
  CorrodedMetal: { roughness: 0.7, metalness: 0.6, pattern: 'corroded', tile: 4 },
  Foil: { roughness: 0.18, metalness: 1 },
  Ice: { roughness: 0.08, metalness: 0, transparency: 0.25 },
  Glass: { roughness: 0.04, metalness: 0, transparency: 0.6 },
  Neon: { roughness: 0.5, metalness: 0, emissive: 1.6 },
  ForceField: { roughness: 0.2, metalness: 0, transparency: 0.55, emissive: 0.9 }
}

const COMMON = { name: '', parent: null, pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], visible: true, locked: false, order: 0 }
export const DEFAULTS = {
  common: COMMON,
  part: { shape: 'box', size: [4, 1, 2], color: '#a3a2a5', material: 'Plastic', texture: null, transparency: 0, anchored: true, negate: false },
  group: {},
  mesh: { geo: null, color: '#a3a2a5', material: 'Plastic', texture: null, transparency: 0, smooth: false, anchored: true },
  light: { kind: 'point', color: '#ffffff', intensity: 2, range: 16, angle: 45, shadow: false },
  stroke: { points: [], radius: 0.05, color: '#ffcc00' },
  model: { src: null, color: null }
}

const TYPES = new Map() // plugin types: name -> {build(obj, app, ctx), update(o3d, obj, app, ctx), defaults}
export function registerType(name, def) { TYPES.set(name, def) }
export function typeDefaults(type) { return { ...COMMON, ...(DEFAULTS[type] || TYPES.get(type)?.defaults || {}) } }

const clone = v => (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v

// Fill missing/null fields with defaults (returns a new object; unknown fields are kept).
export function normalize(obj) {
  const d = typeDefaults(obj.type)
  const out = {}
  for (const k in d) out[k] = (obj[k] === undefined || obj[k] === null) ? clone(d[k]) : obj[k]
  for (const k in obj) if (!(k in out) && obj[k] !== null && obj[k] !== undefined) out[k] = obj[k]
  out.type = obj.type
  return out
}

// Drop fields equal to their default (what is written to the db).
export function compact(obj) {
  const d = typeDefaults(obj.type)
  const out = { type: obj.type }
  for (const k in obj) {
    if (k === 'type' || obj[k] === undefined || obj[k] === null) continue
    if (k in d && JSON.stringify(obj[k]) === JSON.stringify(d[k])) continue
    out[k] = obj[k]
  }
  return out
}

let seq = 0
export function uid(prefix = 'p') {
  seq = (seq + 1) % 1296
  return prefix + Date.now().toString(36).slice(-4) + Math.floor(Math.random() * 1296).toString(36).padStart(2, '0') + seq.toString(36).padStart(2, '0')
}

// ---------- transforms ----------
const D2R = Math.PI / 180
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3()
export function localMatrix(obj, m = new THREE.Matrix4()) {
  const p = obj.pos || [0, 0, 0], r = obj.rot || [0, 0, 0], s = obj.scale || [1, 1, 1]
  _e.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ')
  return m.compose(_v.set(p[0], p[1], p[2]), _q.setFromEuler(_e), _s.set(s[0], s[1], s[2]))
}
export function worldMatrix(scene, id, m = new THREE.Matrix4()) {
  m.identity()
  const chain = []
  let o = scene.objects[id], guard = 0
  while (o && guard++ < 64) { chain.push(o); o = o.parent ? scene.objects[o.parent] : null }
  const t = new THREE.Matrix4()
  for (let i = chain.length - 1; i >= 0; i--) m.multiply(localMatrix(chain[i], t))
  return m
}
const r4 = v => Math.round(v * 1e4) / 1e4 || 0
export function decompose(m) {
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3()
  m.decompose(p, q, s)
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
  return { pos: [r4(p.x), r4(p.y), r4(p.z)], rot: [r4(e.x / D2R), r4(e.y / D2R), r4(e.z / D2R)], scale: [r4(s.x), r4(s.y), r4(s.z)] }
}
export function applyTransform(o3d, obj) {
  const p = obj.pos || COMMON.pos, r = obj.rot || COMMON.rot, s = obj.scale || COMMON.scale
  o3d.position.set(p[0], p[1], p[2])
  o3d.rotation.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ')
  o3d.scale.set(s[0] || 1e-4, s[1] || 1e-4, s[2] || 1e-4)
  o3d.visible = obj.visible !== false
}

// ---------- polygon mesh -> BufferGeometry ----------
// geo = {verts:[x,y,z...], faces:[[a,b,c,...]...], uvs:[u,v...]|null}; smooth: false | true | angle in degrees.
export function toBufferGeometry(geo, opts = {}) {
  const V = geo.verts, F = geo.faces, UV = geo.uvs
  const smooth = opts.smooth === true ? 180 : (+opts.smooth || 0)
  const tris = [], triFace = [], fn = []
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3()
  for (let f = 0; f < F.length; f++) {
    const face = F[f]
    if (!face || face.length < 3) { fn.push(0, 1, 0); continue }
    // Newell normal
    n.set(0, 0, 0)
    for (let i = 0; i < face.length; i++) {
      const p = face[i] * 3, q = face[(i + 1) % face.length] * 3
      n.x += (V[p + 1] - V[q + 1]) * (V[p + 2] + V[q + 2])
      n.y += (V[p + 2] - V[q + 2]) * (V[p] + V[q])
      n.z += (V[p] - V[q]) * (V[p + 1] + V[q + 1])
    }
    n.normalize()
    fn.push(n.x, n.y, n.z)
    let local
    if (face.length === 3) local = [[0, 1, 2]]
    else if (face.length === 4) {
      a.fromArray(V, face[0] * 3); c.fromArray(V, face[2] * 3)
      const d02 = a.distanceToSquared(c)
      a.fromArray(V, face[1] * 3); c.fromArray(V, face[3] * 3)
      local = d02 <= a.distanceToSquared(c) ? [[0, 1, 2], [0, 2, 3]] : [[0, 1, 3], [1, 2, 3]]
    } else {
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z)
      const [i0, i1] = az >= ax && az >= ay ? [0, 1] : ax >= ay ? [1, 2] : [2, 0]
      const contour = face.map(vi => new THREE.Vector2(V[vi * 3 + i0], V[vi * 3 + i1]))
      local = THREE.ShapeUtils.triangulateShape(contour, [])
    }
    for (const t of local) {
      a.fromArray(V, face[t[0]] * 3); b.fromArray(V, face[t[1]] * 3); c.fromArray(V, face[t[2]] * 3)
      b.sub(a); c.sub(a); b.cross(c)
      if (b.dot(n) < 0) tris.push(face[t[0]], face[t[2]], face[t[1]])
      else tris.push(face[t[0]], face[t[1]], face[t[2]])
      triFace.push(f)
    }
  }
  const count = tris.length
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2)
  // vertex -> faces adjacency for smoothing
  // uv seams split verts that share a position: smooth across them (by position), as 3D modeling software does
  let adj = null, at = vi => vi
  if (smooth > 0) {
    adj = new Map()
    if (UV && UV.length) { const m = new Map(), c = new Int32Array(V.length / 3); for (let i = 0; i < c.length; i++) { const k = Math.round(V[i * 3] * 1e5) + ',' + Math.round(V[i * 3 + 1] * 1e5) + ',' + Math.round(V[i * 3 + 2] * 1e5); let j = m.get(k); if (j === undefined) m.set(k, j = i); c[i] = j } at = vi => c[vi] }
    for (let f = 0; f < F.length; f++) for (const vi of F[f] || []) { let l = adj.get(at(vi)); if (!l) adj.set(at(vi), l = []); l.push(f) }
  }
  const cosT = Math.cos(Math.min(smooth, 180) * D2R)
  for (let i = 0; i < count; i++) {
    const vi = tris[i], f = triFace[(i / 3) | 0]
    pos[i * 3] = V[vi * 3]; pos[i * 3 + 1] = V[vi * 3 + 1]; pos[i * 3 + 2] = V[vi * 3 + 2]
    let nx = fn[f * 3], ny = fn[f * 3 + 1], nz = fn[f * 3 + 2]
    if (adj) {
      let sx = 0, sy = 0, sz = 0
      for (const g of adj.get(at(vi))) {
        const gx = fn[g * 3], gy = fn[g * 3 + 1], gz = fn[g * 3 + 2]
        if (smooth >= 180 || gx * nx + gy * ny + gz * nz >= cosT) { sx += gx; sy += gy; sz += gz }
      }
      const l = Math.hypot(sx, sy, sz) || 1
      nx = sx / l; ny = sy / l; nz = sz / l
    }
    nor[i * 3] = nx; nor[i * 3 + 1] = ny; nor[i * 3 + 2] = nz
    if (UV && UV.length >= (vi + 1) * 2) { uv[i * 2] = UV[vi * 2]; uv[i * 2 + 1] = UV[vi * 2 + 1] }
    else { // box projection in studs, axis from the face normal
      const fx = Math.abs(fn[f * 3]), fy = Math.abs(fn[f * 3 + 1]), fz = Math.abs(fn[f * 3 + 2])
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]
      if (fx >= fy && fx >= fz) { uv[i * 2] = z * Math.sign(fn[f * 3] || 1); uv[i * 2 + 1] = y }
      else if (fy >= fz) { uv[i * 2] = x; uv[i * 2 + 1] = z * -Math.sign(fn[f * 3 + 1] || 1) }
      else { uv[i * 2] = x * -Math.sign(fn[f * 3 + 2] || 1); uv[i * 2 + 1] = y }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.userData.triFace = Uint32Array.from(triFace)
  g.computeBoundingBox(); g.computeBoundingSphere()
  return g
}

// BufferGeometry -> polygon mesh: weld by position, merge coplanar convex triangle pairs into quads.
// opts.uv names a uv attribute to keep (a painted part's 'uv1'): verts weld only where position and uv both match.
export function fromBufferGeometry(bg, opts = {}) {
  const weld = opts.weld !== false, quads = opts.quads !== false
  const P = bg.attributes.position, idx = bg.index ? bg.index.array : null, UA = opts.uv ? bg.attributes[opts.uv] : null
  const n = idx ? idx.length : P.count
  const verts = [], uvs = UA ? [] : null, map = new Map(), remap = new Int32Array(P.count)
  const eps = opts.eps || 1e-5
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i)
    if (weld) {
      const k = Math.round(x / eps) + ',' + Math.round(y / eps) + ',' + Math.round(z / eps) + (UA ? '|' + Math.round(UA.getX(i) / eps) + ',' + Math.round(UA.getY(i) / eps) : '')
      let vi = map.get(k)
      if (vi === undefined) { vi = verts.length / 3; map.set(k, vi); verts.push(r6(x), r6(y), r6(z)); if (UA) uvs.push(r6(UA.getX(i)), r6(UA.getY(i))) }
      remap[i] = vi
    } else { remap[i] = verts.length / 3; verts.push(r6(x), r6(y), r6(z)); if (UA) uvs.push(r6(UA.getX(i)), r6(UA.getY(i))) }
  }
  const tris = []
  for (let i = 0; i + 2 < n; i += 3) {
    const a = remap[idx ? idx[i] : i], b = remap[idx ? idx[i + 1] : i + 1], c = remap[idx ? idx[i + 2] : i + 2]
    if (a === b || b === c || a === c) continue
    tris.push([a, b, c])
  }
  const tn = tris.map(t => triNormal(verts, t))
  const faces = []
  if (!quads) return { verts, faces: tris.filter((t, i) => tn[i]), uvs }
  const edges = new Map()
  tris.forEach((t, i) => { for (let e = 0; e < 3; e++) { const k = ekey(t[e], t[(e + 1) % 3]); const l = edges.get(k); if (l) l.push(i); else edges.set(k, [i]) } })
  const used = new Uint8Array(tris.length)
  for (let i = 0; i < tris.length; i++) {
    if (used[i]) continue
    const t = tris[i]
    if (!tn[i]) { used[i] = 1; continue }
    // try the longest edge first (the diagonal of a split quad)
    const order = [0, 1, 2].sort((p, q) => elen(verts, t[(q)], t[(q + 1) % 3]) - elen(verts, t[p], t[(p + 1) % 3]))
    let merged = false
    for (const e of order) {
      const a = t[e], b = t[(e + 1) % 3], c = t[(e + 2) % 3]
      const l = edges.get(ekey(a, b))
      if (!l || l.length !== 2) continue
      const j = l[0] === i ? l[1] : l[0]
      if (used[j] || !tn[j]) continue
      const nj = tn[j], ni = tn[i]
      if (ni[0] * nj[0] + ni[1] * nj[1] + ni[2] * nj[2] < 0.99999) continue
      const u = tris[j], d = u.find(v => v !== a && v !== b)
      const quad = [c, a, d, b]
      if (!convex(verts, quad, ni)) continue
      faces.push(quad); used[i] = used[j] = 1; merged = true; break
    }
    if (!merged) { faces.push(t); used[i] = 1 }
  }
  return { verts, faces, uvs }
}
const r6 = v => Math.round(v * 1e6) / 1e6
const ekey = (a, b) => a < b ? a + '_' + b : b + '_' + a
const elen = (V, a, b) => (V[a * 3] - V[b * 3]) ** 2 + (V[a * 3 + 1] - V[b * 3 + 1]) ** 2 + (V[a * 3 + 2] - V[b * 3 + 2]) ** 2
function triNormal(V, t) {
  const ax = V[t[1] * 3] - V[t[0] * 3], ay = V[t[1] * 3 + 1] - V[t[0] * 3 + 1], az = V[t[1] * 3 + 2] - V[t[0] * 3 + 2]
  const bx = V[t[2] * 3] - V[t[0] * 3], by = V[t[2] * 3 + 1] - V[t[0] * 3 + 1], bz = V[t[2] * 3 + 2] - V[t[0] * 3 + 2]
  const x = ay * bz - az * by, y = az * bx - ax * bz, z = ax * by - ay * bx, l = Math.hypot(x, y, z)
  return l < 1e-12 ? null : [x / l, y / l, z / l]
}
function convex(V, q, n) {
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4]
    const t = triNormal(V, [a, b, c])
    if (!t || t[0] * n[0] + t[1] * n[1] + t[2] * n[2] < 1e-6) return false
  }
  return true
}

export function computeBounds(geo) {
  const V = geo.verts, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < V.length; i += 3) for (let k = 0; k < 3; k++) { if (V[i + k] < min[k]) min[k] = V[i + k]; if (V[i + k] > max[k]) max[k] = V[i + k] }
  return { min, max }
}

// ---------- part geometry (shared, ref-counted) ----------
const geoCache = new Map()
function polyShape(kind, w, h, d) {
  const x = w / 2, y = h / 2, z = d / 2
  if (kind === 'box') return { verts: [-x, -y, -z, x, -y, -z, x, y, -z, -x, y, -z, -x, -y, z, x, -y, z, x, y, z, -x, y, z], faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [0, 1, 5, 4], [3, 7, 6, 2]] }
  if (kind === 'wedge') return { verts: [-x, -y, -z, x, -y, -z, -x, -y, z, x, -y, z, -x, y, z, x, y, z], faces: [[0, 1, 3, 2], [2, 3, 5, 4], [0, 4, 5, 1], [0, 2, 4], [1, 5, 3]] }
  // cornerwedge: square base, apex above the back-right corner (+X, +Z)
  return { verts: [-x, -y, -z, x, -y, -z, x, -y, z, -x, -y, z, x, y, z], faces: [[0, 1, 2, 3], [1, 4, 2], [2, 4, 3], [0, 4, 1], [0, 3, 4]] }
}
function roundedBox(sx, sy, sz, r) {     // bevel: every vertex pushed onto a box of radius-r rounded edges (smooth normals, toon outlines close)
  r = Math.min(r, sx / 2, sy / 2, sz / 2) * 0.999
  const g = new THREE.BoxGeometry(sx, sy, sz, 7, 7, 7), P = g.attributes.position, N = g.attributes.normal, p = new THREE.Vector3(), q = new THREE.Vector3(), h = [sx / 2 - r, sy / 2 - r, sz / 2 - r]
  for (let i = 0; i < P.count; i++) {
    p.fromBufferAttribute(P, i); q.set(Math.max(-h[0], Math.min(h[0], p.x)), Math.max(-h[1], Math.min(h[1], p.y)), Math.max(-h[2], Math.min(h[2], p.z)))
    const n = p.sub(q); n.lengthSq() < 1e-12 ? n.fromBufferAttribute(N, i) : n.normalize(); N.setXYZ(i, n.x, n.y, n.z); P.setXYZ(i, q.x + n.x * r, q.y + n.y * r, q.z + n.z * r)
  }
  scaleUV(g, Math.max(sx, sz), Math.max(sy, sz))
  return g
}
function makePartGeometry(shape, size, bevel = 0) {
  const sx = Math.max(size[0], 0.001), sy = Math.max(size[1], 0.001), sz = Math.max(size[2], 0.001)
  let g
  if (shape === 'box' && bevel > 0) { g = roundedBox(sx, sy, sz, bevel); g.computeBoundingBox(); g.computeBoundingSphere(); paintUV1(g); return g }
  switch (shape) {
    case 'sphere': g = new THREE.SphereGeometry(0.5, 32, 18); scaleUV(g, Math.PI * Math.max(sx, sz), Math.PI * sy / 2); g.scale(sx, sy, sz); break
    case 'cylinder': g = new THREE.CylinderGeometry(0.5, 0.5, 1, 32, 1); scaleUV(g, Math.PI * sx, sy); g.scale(sx, sy, sz); break
    case 'cone': g = new THREE.ConeGeometry(0.5, 1, 32, 1); scaleUV(g, Math.PI * sx, sy); g.scale(sx, sy, sz); break
    case 'torus': {
      const r = sy / 2, R = Math.max(sx / 2 - r, 0.001)
      g = new THREE.TorusGeometry(R, r, 16, 48); g.rotateX(-Math.PI / 2); scaleUV(g, Math.PI * sx, Math.PI * sy); g.scale(1, 1, sz / sx); break
    }
    case 'plane': g = new THREE.PlaneGeometry(sx, sz); g.rotateX(-Math.PI / 2); scaleUV(g, sx, sz); break
    case 'capsule': {
      const r = Math.min(sx, sz) / 2, len = Math.max(sy - 2 * r, 0)
      g = new THREE.CapsuleGeometry(r, len, 8, 32, 1); scaleUV(g, Math.PI * 2 * r, sy); g.scale(sx / (2 * r), 1, sz / (2 * r)); break
    }
    case 'wedge': case 'cornerwedge': g = toBufferGeometry(polyShape(shape, sx, sy, sz)); break
    default: g = toBufferGeometry(polyShape('box', sx, sy, sz))
  }
  g.computeBoundingBox(); g.computeBoundingSphere(); paintUV1(g)
  return g
}
// uv1 = paint layout: part uvs repeat on every face (studs), so paint gets one where no two faces share a spot
function paintUV1(g) {
  const P = g.attributes.position, U = g.attributes.uv, N = g.attributes.normal, out = new Float32Array(P.count * 2), pad = 0.012, lo = g.boundingBox.min, hi = g.boundingBox.max
  const put = (i, c, cell, a, b, k) => { out[i * 2] = (c % (1 / cell | 0)) * cell + pad + a * k; out[i * 2 + 1] = Math.floor(c / (1 / cell | 0)) * cell + pad + b * k }
  if (!g.index) { // flat faces (box, wedges): 6 cells by the face's main direction, in studs
    const k = (1 / 3 - 2 * pad) / Math.max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z, 1e-6), p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], e1 = new THREE.Vector3(), e2 = new THREE.Vector3()
    for (let t = 0; t + 2 < P.count; t += 3) {
      for (let j = 0; j < 3; j++) p[j].fromBufferAttribute(P, t + j)
      const n = e1.subVectors(p[1], p[0]).cross(e2.subVectors(p[2], p[0])), ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z)
      const dom = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2, sg = (dom === 0 ? n.x : dom === 1 ? n.y : n.z) > 0 ? 1 : -1, c = dom * 2 + (sg > 0 ? 0 : 1)
      for (let j = 0; j < 3; j++) {
        const { x, y, z } = p[j]
        const [a, b] = dom === 0 ? [sg > 0 ? hi.z - z : z - lo.z, y - lo.y] : dom === 1 ? [x - lo.x, sg > 0 ? hi.z - z : z - lo.z] : [sg > 0 ? x - lo.x : hi.x - x, y - lo.y]
        put(t + j, c, 1 / 3, a, b, k)
      }
    }
  } else { // curved parts: one cell per group (cylinder and cone caps sit apart from the side); flat caps laid out by x, z
    const I = g.index, G = g.groups.length > 1 ? g.groups : [{ start: 0, count: I.count }], cols = Math.ceil(Math.sqrt(G.length)), cell = 1 / cols
    G.forEach((gr, gi) => {
      const cap = G.length > 1 && Math.abs(N.getY(I.getX(gr.start))) > 0.999, ab = i => cap ? [P.getX(i), P.getZ(i)] : [U.getX(i), U.getY(i)]
      let a0 = Infinity, b0 = Infinity, a1 = -Infinity, b1 = -Infinity
      for (let j = gr.start; j < gr.start + gr.count; j++) { const [a, b] = ab(I.getX(j)); a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b) }
      const k = (cell - 2 * pad) / Math.max(a1 - a0, b1 - b0, 1e-6)
      for (let j = gr.start; j < gr.start + gr.count; j++) { const i = I.getX(j), [a, b] = ab(i); put(i, gi, cell, a - a0, b - b0, k) }
    })
  }
  g.setAttribute('uv1', new THREE.BufferAttribute(out, 2))
}
function scaleUV(g, su, sv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv) }
export function partGeometry(shape, size, bevel = 0) {
  const key = shape + '|' + size.map(v => +(+v).toFixed(4)).join(',') + (bevel > 0 ? '|b' + (+bevel).toFixed(4) : '')
  let e = geoCache.get(key)
  if (!e) { e = { g: makePartGeometry(shape, size, +bevel || 0), n: 0 }; e.g.userData.cacheKey = key; geoCache.set(key, e) }
  e.n++
  return e.g
}
export function releaseGeometry(g) {
  if (!g) return
  const key = g.userData.cacheKey
  if (key) { const e = geoCache.get(key); if (e && --e.n <= 0) { geoCache.delete(key); g.dispose(); g.boundsTree && g.disposeBoundsTree?.() } }
  else if (!g.userData.shared) g.dispose()
}

// ---------- procedural pattern maps (pure JS, no canvas) ----------
const texCache = new Map()
function hash(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
function vnoise(x, y, p, s) { // tileable value noise, period p
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const m = k => ((k % p) + p) % p
  const a = hash(m(xi), m(yi), s), b = hash(m(xi + 1), m(yi), s), c = hash(m(xi), m(yi + 1), s), d = hash(m(xi + 1), m(yi + 1), s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x, y, p, oct = 4, s = 0) { let t = 0, amp = 0.5, f = 1; for (let i = 0; i < oct; i++) { t += amp * vnoise(x * f, y * f, p * f, s + i); amp *= 0.5; f *= 2 } return t / (1 - Math.pow(0.5, oct)) }
// Returns a Uint8Array RGBA (size x size) of grey detail around 1.0 (multiplied with the part colour).
export function patternPixels(pattern, size = 128) {
  const N = size, px = new Uint8Array(N * N * 4)
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = i / N, v = j / N
    let g = 1
    switch (pattern) {
      case 'noise': g = 0.82 + 0.18 * fbm(u * 8, v * 8, 8, 4); break
      case 'sand': g = 0.84 + 0.1 * fbm(u * 16, v * 16, 16, 3) + 0.08 * hash(i, j, 3); break
      case 'grass': g = 0.72 + 0.2 * fbm(u * 6, v * 6, 6, 3) + 0.14 * (hash(i, j, 9) > 0.8 ? 1 : 0); break
      case 'granite': { const s = hash(i, j, 5); g = 0.78 + 0.16 * fbm(u * 10, v * 10, 10, 3) - (s > 0.92 ? 0.3 : 0) + (s < 0.05 ? 0.15 : 0); break }
      case 'slate': g = 0.7 + 0.3 * fbm(u * 4, v * 4, 4, 5, 2) - (Math.abs(fbm(u * 3, v * 3, 3, 3, 7) - 0.5) < 0.02 ? 0.25 : 0); break
      case 'marble': g = 0.86 + 0.14 * Math.pow(Math.abs(Math.sin((u * 2 + fbm(u * 4, v * 4, 4, 5, 3) * 1.6) * Math.PI * 2)), 0.25) - 0.04; break
      case 'wood': { const w = fbm(u * 2, v * 16, 2, 3, 4); g = 0.76 + 0.2 * Math.pow(Math.abs(Math.sin((v * 6 + w * 2) * Math.PI)), 0.6); break }
      case 'planks': {
        const row = Math.floor(v * 4), off = hash(row, 0, 11) * 0.7, uu = (u + off) % 1
        const gap = (v * 4 % 1) < 0.04 || (uu * 1.25 % 1) < 0.02
        g = gap ? 0.45 : 0.78 + 0.18 * Math.abs(Math.sin((v * 24 + fbm(uu * 3, v * 3, 3, 3, row) * 3) * Math.PI)) - 0.08 * hash(row, Math.floor(uu * 1.25), 2); break
      }
      case 'bricks': {
        const rows = 8, row = Math.floor(v * rows), uu = (u * 4 + (row % 2) * 0.5) % 4, vv = v * rows % 1
        const mortar = vv < 0.12 || (uu % 1) < 0.05
        g = mortar ? 0.62 : 0.82 + 0.12 * hash(Math.floor(uu), row, 1) + 0.06 * fbm(u * 16, v * 16, 16, 2); break
      }
      case 'cobble': { // tileable voronoi
        const cells = 5, x = u * cells, y = v * cells; let d1 = 9, d2 = 9, id = 0
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const cx = Math.floor(x) + ox, cy = Math.floor(y) + oy, m = k => ((k % cells) + cells) % cells
          const px2 = cx + hash(m(cx), m(cy), 4), py2 = cy + hash(m(cx), m(cy), 8), d = Math.hypot(x - px2, y - py2)
          if (d < d1) { d2 = d1; d1 = d; id = hash(m(cx), m(cy), 6) } else if (d < d2) d2 = d
        }
        g = (d2 - d1) < 0.08 ? 0.5 : 0.76 + 0.16 * id + 0.06 * fbm(u * 12, v * 12, 12, 2); break
      }
      case 'fabric': g = 0.84 + 0.1 * ((Math.floor(u * 32) + Math.floor(v * 32)) % 2) + 0.06 * hash(i, j, 2); break
      case 'brushed': g = 0.86 + 0.1 * vnoise(u * 2, v * 96, 2, 1) + 0.04 * hash(0, j, 4); break
      case 'diamond': {
        const x = (u * 4) % 1, y = (v * 4) % 1, a = Math.abs((x + y) % 1 - 0.5), b = Math.abs((x - y + 1) % 1 - 0.5)
        const bump = ((Math.floor(u * 4) + Math.floor(v * 4)) % 2 ? a : b) < 0.08
        g = bump ? 1 : 0.8 + 0.06 * hash(i, j, 1); break
      }
      case 'corroded': { const r = fbm(u * 5, v * 5, 5, 5, 8); g = r > 0.6 ? 0.55 + 0.2 * r : 0.85 + 0.1 * fbm(u * 20, v * 20, 20, 2); break }
      default: g = 1
    }
    const k = (j * N + i) * 4, c = Math.max(0, Math.min(255, Math.round(g * 255)))
    px[k] = px[k + 1] = px[k + 2] = c; px[k + 3] = 255
  }
  return px
}
// THREE.DataTexture for a pattern (cached). colorSpace srgb for map use.
export function patternTexture(pattern, tile = 4, size = 128) {
  const key = pattern + '|' + tile
  let t = texCache.get(key)
  if (t) return t
  t = new THREE.DataTexture(patternPixels(pattern, size), size, size, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true
  t.anisotropy = 4
  t.colorSpace = THREE.SRGBColorSpace
  t.repeat.set(1 / tile, 1 / tile)
  t.needsUpdate = true
  t.userData.shared = true
  texCache.set(key, t)
  return t
}

// ---------- shared materials (ref-counted) ----------
const matCache = new Map()
export function materialFor(spec, ctx = {}) {
  const preset = MATERIALS[spec.material] || MATERIALS.Plastic
  const transparency = Math.max(spec.transparency || 0, preset.transparency || 0)
  const negate = !!spec.negate
  const key = [spec.color, spec.material, transparency, negate, spec.texture || '', spec.side || 0, [spec.rough, spec.metal, spec.emissive, spec.glow].join(',')].join('|')
  let e = matCache.get(key)
  if (!e) {
    const m = new THREE.MeshStandardMaterial({ color: negate ? '#ff4b4b' : (spec.color || '#a3a2a5'), roughness: preset.roughness, metalness: preset.metalness || 0 })
    if (negate) { m.transparent = true; m.opacity = 0.38; m.depthWrite = false }
    else if (transparency > 0) { m.transparent = true; m.opacity = 1 - Math.min(transparency, 1); m.depthWrite = transparency < 0.5 }
    // Neon: lit colour + own colour, not tone-mapped, so it glows in the part colour (tone mapping washed it to white)
    if (preset.emissive && !negate) { m.emissive.set(spec.color || '#ffffff'); m.emissiveIntensity = 1; m.toneMapped = false }
    if (spec.rough != null) m.roughness = spec.rough
    if (spec.metal != null) m.metalness = spec.metal
    if (spec.emissive && !negate) { m.emissive.set(spec.emissive); m.emissiveIntensity = spec.glow ?? 1 }
    const custom = spec.texture && ctx.getTexture ? ctx.getTexture(spec.texture) : null
    if (custom) m.map = custom
    else if (preset.pattern && !negate) m.map = patternTexture(preset.pattern, preset.tile || 4)
    if (spec.side) m.side = THREE.DoubleSide
    m.userData.cacheKey = key
    e = { m, n: 0 }
    matCache.set(key, e)
  }
  e.n++
  return e.m
}
export function releaseMaterial(m) {
  if (!m) return
  const key = m.userData?.cacheKey
  if (key) { const e = matCache.get(key); if (e && --e.n <= 0) { matCache.delete(key); m.dispose() } }
  else m.dispose()
}
// Drop cached materials using a texture id (after a texture changes).
export function invalidateTexture(texId) {
  for (const [k, e] of matCache) if (k.split('|')[4] === texId) { e.m.map = null; e.m.needsUpdate = true; matCache.delete(k) }
}

// ---------- stroke tube ----------
export function strokeGeometry(points, radius = 0.05) {
  const pts = (points || []).filter(p => Array.isArray(p) && p.length >= 3)
  if (pts.length < 2) {
    const g = new THREE.SphereGeometry(radius * (pts[0]?.[3] ?? 1) || 0.05, 12, 8)
    if (pts[0]) g.translate(pts[0][0], pts[0][1], pts[0][2])
    return g
  }
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal')
  const segs = Math.min(600, Math.max(8, (pts.length - 1) * 6)), radial = 8
  const frames = curve.computeFrenetFrames(segs, false)
  const pos = [], nor = [], uv = [], index = []
  const P = new THREE.Vector3(), N = new THREE.Vector3()
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    curve.getPointAt(t, P)
    const f = t * (pts.length - 1), k = Math.min(Math.floor(f), pts.length - 2), w = (pts[k][3] ?? 1) * (1 - (f - k)) + (pts[k + 1][3] ?? 1) * (f - k)
    const r = Math.max(radius * w, 1e-4)
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2, s = Math.sin(a), c = -Math.cos(a)
      N.set(0, 0, 0).addScaledVector(frames.normals[i], c).addScaledVector(frames.binormals[i], s).normalize()
      pos.push(P.x + r * N.x, P.y + r * N.y, P.z + r * N.z); nor.push(N.x, N.y, N.z); uv.push(t, j / radial)
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1
    index.push(a, b, a + 1, b, b + 1, a + 1)
  }
  // round caps
  for (const end of [0, 1]) {
    const p = pts[end ? pts.length - 1 : 0], r = Math.max(radius * (p[3] ?? 1), 1e-4)
    const base = pos.length / 3, cap = new THREE.SphereGeometry(r, radial, 6)
    const cp = cap.attributes.position, cn = cap.attributes.normal
    for (let i = 0; i < cp.count; i++) { pos.push(cp.getX(i) + p[0], cp.getY(i) + p[1], cp.getZ(i) + p[2]); nor.push(cn.getX(i), cn.getY(i), cn.getZ(i)); uv.push(end, 0) }
    for (const v of cap.index.array) index.push(base + v)
    cap.dispose()
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(index)
  g.computeBoundingBox(); g.computeBoundingSphere()
  return g
}

// ---------- objects ----------
function partSig(o) { return o.shape + '|' + (o.size || []).join(',') + '|' + (o.bevel || 0) }
function matSpec(o) { return { color: o.color, material: o.material, transparency: o.transparency, negate: o.negate, texture: o.texture, side: o.shape === 'plane' ? 1 : 0, rough: o.roughness, metal: o.metalness, emissive: o.emissive, glow: o.emissiveIntensity } }
const matSig = o => JSON.stringify(matSpec(o))
const helperMat = new THREE.MeshBasicMaterial({ color: '#ffd166', toneMapped: false })
helperMat.userData.shared = true

// shadowOnly: an invisible stand-in that only casts a shadow (a light proxy for a dense mesh); castShadow: false stops one casting
const shadowOnlyMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
shadowOnlyMat.userData.shared = true
const noRaycast = () => {}
// the main pass calls onBeforeRender, the shadow pass only onBeforeShadow: an empty draw range here keeps a stand-in out of every
// view render (three tests layers against the view camera even for shadows, so layers can't do this)
const skipDraw = (r, s, c, geo) => geo.setDrawRange(0, 0), fullDraw = (r, s, c, geo) => geo.setDrawRange(0, Infinity)
function setMesh(mesh, o, ctx, geoKey, makeGeo) {
  if (mesh.userData.geoKey !== geoKey) {
    const old = mesh.geometry
    mesh.geometry = makeGeo()
    if (old && mesh.userData.geoKey !== undefined) releaseGeometry(old)
    mesh.userData.geoKey = geoKey
  }
  const ms = o.shadowOnly ? 'shadowOnly' : matSig(o)
  if (mesh.userData.matKey !== ms) {
    const old = mesh.material
    mesh.material = o.shadowOnly ? shadowOnlyMat : materialFor(matSpec(o), ctx)
    if (old && mesh.userData.matKey !== undefined && mesh.userData.matKey !== 'shadowOnly') releaseMaterial(old)
    mesh.userData.matKey = ms
  }
  mesh.userData.shadowOnly = !!o.shadowOnly
  mesh.castShadow = !!o.shadowOnly || o.castShadow !== false
  mesh.receiveShadow = !o.shadowOnly
  if (o.shadowOnly) { mesh.onBeforeRender = skipDraw; mesh.onAfterRender = fullDraw }
  else if (mesh.onBeforeRender === skipDraw) { delete mesh.onBeforeRender; delete mesh.onAfterRender }
  if (o.shadowOnly) mesh.raycast = noRaycast; else if (mesh.raycast === noRaycast) delete mesh.raycast
}

export function buildObject(raw, ctx = {}) {
  const obj = raw.shape !== undefined || raw.visible !== undefined ? raw : normalize(raw)
  let o3d
  const custom = TYPES.get(obj.type)
  if (custom) o3d = custom.build(obj, ctx.app || ctx, ctx) || new THREE.Group()
  else if (obj.type === 'part' || obj.type === 'mesh' || obj.type === 'stroke') {
    o3d = new THREE.Mesh()
    o3d.castShadow = o3d.receiveShadow = true
    o3d.userData.geoKey = undefined; o3d.userData.matKey = undefined
  } else if (obj.type === 'light') {
    o3d = new THREE.Group()
  } else {
    o3d = new THREE.Group() // group, model, unknown
  }
  o3d.userData.id = obj.id
  o3d.userData.type = obj.type
  return updateObject(o3d, obj, ctx)
}

// Update in place when possible; returns the object to use (a new one only when the type changed).
export function updateObject(o3d, raw, ctx = {}) {
  const obj = normalize(raw)
  if (o3d.userData.type !== obj.type) { const n = buildObject({ ...obj, id: o3d.userData.id }, ctx); return n }
  const custom = TYPES.get(obj.type)
  if (custom) {
    const r = custom.update ? custom.update(o3d, obj, ctx.app || ctx, ctx) : null
    const out = r && r.isObject3D ? r : o3d
    applyTransform(out, obj); out.userData.id = o3d.userData.id; out.userData.type = obj.type
    return out
  }
  switch (obj.type) {
    case 'part': setMesh(o3d, obj, ctx, partSig(obj), () => partGeometry(obj.shape, obj.size, obj.bevel)); break
    case 'mesh': {
      const geo = obj.geo && ctx.getGeo ? ctx.getGeo(obj.geo) : null
      const key = (geo ? obj.geo : 'none') + '|' + obj.smooth
      if (!geo && obj.geo && ctx.needGeo) ctx.needGeo(obj.geo, o3d.userData.id)
      setMesh(o3d, obj, ctx, key, () => geo ? toBufferGeometry(geo, { smooth: obj.smooth }) : placeholderGeometry())
      break
    }
    case 'stroke': {
      const key = JSON.stringify(obj.points) + '|' + obj.radius
      setMesh(o3d, { ...obj, material: 'SmoothPlastic' }, ctx, key, () => strokeGeometry(obj.points, obj.radius))
      o3d.castShadow = false
      break
    }
    case 'light': buildLight(o3d, obj); break
    case 'model': {
      const key = JSON.stringify(obj.src)
      if (o3d.userData.srcKey !== key) {
        o3d.userData.srcKey = key
        for (const c of [...o3d.children]) if (c.userData.modelContent) { o3d.remove(c); disposeTree(c) }
        if (obj.src && ctx.loadModel) {
          Promise.resolve(ctx.loadModel(obj.src, obj)).then(content => {
            if (!content || o3d.userData.srcKey !== key) return
            content.userData.modelContent = true
            content.traverse(c => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; c.userData.modelPart = true } })
            o3d.add(content); ctx.onAsync?.(o3d)
          }).catch(e => ctx.onError?.(e))
        }
      }
      break
    }
  }
  applyTransform(o3d, obj)
  return o3d
}
let placeholder = null
function placeholderGeometry() {
  if (!placeholder) { placeholder = new THREE.BoxGeometry(0.001, 0.001, 0.001); placeholder.userData.shared = true }
  return placeholder
}
function buildLight(g, o) {
  const key = o.kind + '|' + o.shadow
  let light = g.userData.light
  if (!light || g.userData.lightKey !== key) {
    if (light) { g.remove(light); light.dispose?.(); if (light.target) g.remove(light.target) }
    light = o.kind === 'directional' ? new THREE.DirectionalLight() : o.kind === 'spot' ? new THREE.SpotLight() : new THREE.PointLight()
    if (light.target) { light.target.position.set(0, -1, 0); g.add(light.target) }
    if (o.kind === 'directional') { light.target.position.set(-o.pos[0], -o.pos[1], -o.pos[2]) }
    light.castShadow = !!o.shadow
    if (light.castShadow) { light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -0.0005 }
    g.add(light)
    g.userData.light = light; g.userData.lightKey = key
    if (!g.userData.helperMesh) {
      const h = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), helperMat)
      h.userData.helper = true; h.userData.lightHelper = true
      g.add(h); g.userData.helperMesh = h
    }
  }
  light.color.set(o.color)
  if (o.kind === 'directional') { light.intensity = o.intensity; light.target.position.set(-o.pos[0], -o.pos[1], -o.pos[2]) }
  else { light.intensity = o.intensity * 6; light.distance = o.range; light.decay = 1.2 }
  if (o.kind === 'spot') light.angle = Math.min(o.angle, 89) * D2R
}

export function disposeObject(o3d) {
  if (o3d.isMesh) {
    if (o3d.userData.geoKey !== undefined) releaseGeometry(o3d.geometry)
    if (o3d.userData.matKey !== undefined) releaseMaterial(o3d.material)
  }
}
export function disposeTree(o3d) {
  o3d.traverse(c => {
    if (c.isMesh && c.userData.geoKey === undefined && !c.userData.helper) {
      c.geometry?.dispose?.()
      for (const m of [].concat(c.material || [])) { if (!m.userData?.shared && !m.userData?.cacheKey) { m.map?.dispose?.(); m.dispose?.() } }
    }
  })
}

// Whole scene as a three.js Group (CLI export, thumbnails). ctx: {getGeo, getTexture, loadModel}
export function buildScene(scene, ctx = {}) {
  const root = new THREE.Group(), made = new Map()
  const objs = scene.objects || {}
  for (const id in objs) { const o = objs[id]; if (!o) continue; const t = buildObject({ ...normalize(o), id }, ctx); t.name = o.name || id; made.set(id, t) }
  const ids = Object.keys(objs).filter(id => objs[id]).sort((a, b) => (objs[a].order || 0) - (objs[b].order || 0))
  for (const id of ids) { const p = objs[id].parent; (p && made.get(p) || root).add(made.get(id)) }
  root.updateMatrixWorld(true)
  return root
}
