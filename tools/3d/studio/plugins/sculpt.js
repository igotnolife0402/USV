// Sculpt mode: Brush-based sculpting on mesh objects.
// three-mesh-bvh answers the surface hit and the vertex-in-sphere queries; a brush step moves only the
// touched vertices, refits only the BVH nodes it visited and recomputes only the normals around them.
// A stroke ends in one new geo id: one undo step per stroke.
import * as THREE from 'three'
// three-mesh-bvh (290 KB) loads on first sculpt, not at boot: most sessions never sculpt
let BVH = null, bvhLoad = null
const loadBVH = () => bvhLoad ||= import('three-mesh-bvh').then(m => { BVH = m; if (active) retarget() }, e => { bvhLoad = null; APP?.toast?.('Sculpt failed to load: ' + e.message, 'error'); throw e })
import { addIcons, isPhone } from '../core/ui.js'
import { toBufferGeometry, releaseGeometry } from '../core/model.js'

addIcons({
  sculpt: 'M2 13.5h12 M3.5 13.5c0-4.5 2-7 4.5-7s4.5 2.5 4.5 7 M8 6.5V2',
  'sc-draw': 'M1.5 12.5h3c1.2 0 1.6-5 3.5-5s2.3 5 3.5 5h3',
  'sc-clay': 'M1.5 13h13 M3.5 13c0-2 2-3.2 4.5-3.2s4.5 1.2 4.5 3.2 M5 9.8c0-1.6 1.3-2.8 3-2.8s3 1.2 3 2.8',
  'sc-smooth': 'M1.5 7c1.5-2.2 3-2.2 4.3 0s2.9 2.2 4.4 0 2.9-2.2 4.3 0 M1.5 12h13',
  'sc-grab': 'M1.5 13.5h4c1.2 0 1.6-5 2.5-8.5.9 3.5 1.3 8.5 2.5 8.5h4 M6 4 8 2l2 2',
  'sc-inflate': 'M8 5a3 3 0 1 0 0 6 3 3 0 1 0 0-6 M8 1.5v2 M8 12.5v2 M1.5 8h2 M12.5 8h2',
  'sc-flatten': 'M1.5 13h13 M3.5 10h9 M8 2v5.5 M6 5.5l2 2 2-2',
  'sc-pinch': 'M1.5 8h4 M3.5 6l2 2-2 2 M14.5 8h-4 M12.5 6l-2 2 2 2 M8 3v10',
  'sc-crease': 'M1.5 5h3.5L8 12.5 11 5h3.5',
  'sc-sym': 'M8 1.5v13 M6 4.5 2.5 8 6 11.5z M10 4.5 13.5 8 10 11.5z',
  'sc-invert': 'M2.5 5h4 M4.5 3v4 M9.5 11h4 M12.5 3.5 3.5 12.5',
  'sc-sub': 'M2.5 2.5h11v11h-11z M8 2.5v11 M2.5 8h11',
  'sc-remesh': 'M8 2.5 13.5 13h-11z M5.25 7.75h5.5 M8 13 5.25 7.75 M8 13l2.75-5.25',
  'sc-radius': 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 1 0 0-11 M8 8h5.5',
  'sc-strength': 'M3 13.5v-3 M6.5 13.5v-6 M10 13.5v-8.5 M13.5 13.5V2.5'
})

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }

// Brush table: label, shortcut, icon, one-line description shown in the panel.
const BR = {
  draw: { label: 'Draw', key: 'X', icon: 'sc-draw', tip: 'Raises the surface; Ctrl carves' },
  clay: { label: 'Clay', key: 'C', icon: 'sc-clay', tip: 'Builds flat clay layers' },
  smooth: { label: 'Smooth', key: 'S', icon: 'sc-smooth', tip: 'Evens out bumps; Ctrl sharpens' },
  grab: { label: 'Grab', key: 'G', icon: 'sc-grab', tip: 'Drags a region with the pointer' },
  inflate: { label: 'Inflate', key: 'I', icon: 'sc-inflate', tip: 'Swells along each normal' },
  flatten: { label: 'Flatten', key: 'Shift+T', icon: 'sc-flatten', tip: 'Presses toward the average plane' },
  pinch: { label: 'Pinch', key: 'P', icon: 'sc-pinch', tip: 'Pulls vertices to the brush centre' },
  crease: { label: 'Crease', key: 'Shift+C', icon: 'sc-crease', tip: 'Cuts a sharp groove; Ctrl ridges' }
}
const BRUSHES = Object.keys(BR)
const FALL = {
  smooth: t => { const u = 1 - t; return u * u * (3 - 2 * u) },
  sphere: t => Math.sqrt(Math.max(0, 1 - t * t)),
  root: t => Math.sqrt(Math.max(0, 1 - t)),
  sharp: t => (1 - t) * (1 - t),
  linear: t => 1 - t,
  constant: () => 1
}
const FALL_LABEL = { smooth: 'Smooth', sphere: 'Sphere', root: 'Root', sharp: 'Sharp', linear: 'Linear', constant: 'Constant' }
const DETAIL = [[5000, 'Low (5k tris)'], [20000, 'Medium (20k tris)'], [50000, 'High (50k tris)'], [100000, 'Very high (100k tris)']]
const MAX_TRIS = 400000
const SPACING = 0.12 // dab spacing as a fraction of the radius
const MAX_DABS = 16 // dabs per pointer event, so a fast flick stays one short step

const PREF_KEY = 'studio.sculpt.v1'
const cfg = loadCfg()
const stats = { steps: 0, total: 0, max: 0, last: 0, dabs: 0, build: 0, commit: 0, verts: 0 }

let APP = null, S = null, active = false, ring = null, stroke = null, lastPanelGeo = null
const loading = new Set()

function loadCfg () {
  const d = { brush: 'draw', radius: 56, strength: 0.5, invert: false, sym: true, falloff: 'smooth', detail: 20000 }
  try { const s = JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); if (s && typeof s === 'object') Object.assign(d, s) } catch {}
  if (!BR[d.brush]) d.brush = 'draw'
  if (!FALL[d.falloff]) d.falloff = 'smooth'
  return d
}
function saveCfg () { try { localStorage.setItem(PREF_KEY, JSON.stringify(cfg)) } catch {} }
function setCfg (patch) {
  Object.assign(cfg, patch)
  cfg.radius = Math.min(400, Math.max(4, Math.round(cfg.radius)))
  cfg.strength = Math.min(1, Math.max(0.01, Math.round(cfg.strength * 100) / 100))
  saveCfg(); styleRing(); APP?.ui?.refreshPanels?.()
}
const modeId = app => { const m = app.mode; return typeof m === 'string' ? m : m?.id }
const toolId = app => { const t = app.tool; return typeof t === 'string' ? t : t?.id }

// ---------- session: sculpt buffers for one mesh object ----------
function buildSession (id, geoId, data) {
  const t0 = performance.now()
  const nV = data.verts.length / 3
  const pos = new Float32Array(data.verts)
  let nT = 0
  for (const f of data.faces) nT += Math.max(0, f.length - 2)
  const idx = new Uint32Array(nT * 3)
  let k = 0
  for (const f of data.faces) for (let i = 1; i < f.length - 1; i++) { idx[k++] = f[0]; idx[k++] = f[i]; idx[k++] = f[i + 1] }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const nrm = new Float32Array(nV * 3)
  geom.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
  if (data.uvs && data.uvs.length === nV * 2) geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(data.uvs), 2))
  geom.setIndex(new THREE.BufferAttribute(idx, 1))
  const bvh = new BVH.MeshBVH(geom, { targetLeafSize: 10 }) // reorders the triangles of the index in place
  geom.boundsTree = bvh
  geom.userData.shared = true // core never disposes it; the session does
  geom.userData.noOutline = true // no selection outline over the sculpt (an edge pass on a dense mesh costs 100+ ms)
  const ix = geom.index.array
  // vertex -> triangles (CSR)
  const vtOff = new Uint32Array(nV + 1)
  for (let i = 0; i < ix.length; i++) vtOff[ix[i] + 1]++
  for (let v = 0; v < nV; v++) vtOff[v + 1] += vtOff[v]
  const vtList = new Uint32Array(ix.length), fill = vtOff.slice(0, nV)
  for (let i = 0; i < ix.length; i++) vtList[fill[ix[i]]++] = (i / 3) | 0
  // vertex -> unique neighbour vertices (CSR)
  const vvOff = new Uint32Array(nV + 1), tmp = new Uint32Array(ix.length * 2), mark = new Int32Array(nV).fill(-1)
  let p = 0
  for (let v = 0; v < nV; v++) {
    vvOff[v] = p
    for (let j = vtOff[v]; j < vtOff[v + 1]; j++) {
      const t = vtList[j] * 3
      for (let c = 0; c < 3; c++) { const u = ix[t + c]; if (u !== v && mark[u] !== v) { mark[u] = v; tmp[p++] = u } }
    }
  }
  vvOff[nV] = p
  const s = {
    id, geoId, nV, nT, pos, nrm, ix, geom, bvh, vtOff, vtList, vvOff, vvList: tmp.slice(0, p),
    faces: data.faces, uvs: data.uvs || null, src: data.verts, stale: false,
    qv: new Uint32Array(nV), qd: new Float32Array(nV), qw: new Float32Array(nV), tmp: new Float32Array(nV * 3),
    qStamp: new Uint32Array(nV), qId: 0, tStamp: new Uint32Array(nV), tId: 1, touched: new Uint32Array(nV), nTouched: 0,
    rStamp: new Uint32Array(nV), rId: 0, ring: new Uint32Array(nV), nodes: new Set(),
    gA: null, gB: null, gList: null, nG: 0, mesh: null, coreGeom: null
  }
  allNormals(s)
  geom.computeBoundingSphere(); geom.computeBoundingBox()
  stats.build = performance.now() - t0
  stats.verts = nV
  return s
}

function sameTopo (s, data) {
  if (data.verts.length !== s.nV * 3 || data.faces.length !== s.faces.length) return false
  if (data.faces === s.faces) return true
  for (let i = 0; i < data.faces.length; i++) {
    const a = data.faces[i], b = s.faces[i]
    if (a.length !== b.length) return false
    for (let j = 0; j < a.length; j++) if (a[j] !== b[j]) return false
  }
  return true
}

function reloadSession (s, data, geoId) {
  s.pos.set(data.verts)
  s.src = data.verts
  allNormals(s)
  s.bvh.refit()
  for (const a of [s.geom.attributes.position, s.geom.attributes.normal]) { a.clearUpdateRanges(); a.needsUpdate = true }
  s.geom.computeBoundingSphere(); s.geom.computeBoundingBox()
  s.geoId = geoId
  s.faces = data.faces
}

// The sculpt session for an object, or null while its geometry is still loading.
function sessionFor (id) {
  const o = APP.obj(id)
  if (!o || o.type !== 'mesh' || !o.geo) return null
  if (S && S.id === id && S.geoId === o.geo) return S
  const data = APP.geo.peek(o.geo)
  if (!data) {
    if (!loading.has(o.geo)) {
      loading.add(o.geo)
      APP.geo.get(o.geo).then(() => { loading.delete(o.geo); if (active) retarget() }, () => loading.delete(o.geo))
    }
    return null
  }
  if (S && S.id === id && sameTopo(S, data)) { reloadSession(S, data, o.geo); return S }
  if (!BVH) { loadBVH().catch(() => {}); return null }
  dropSession()
  S = buildSession(id, o.geo, data)
  return S
}

function dropSession () {
  if (!S) return
  detach()
  S.geom.dispose()
  S = null
}

function findMesh (o3d) {
  if (!o3d) return null
  if (o3d.isMesh) return o3d
  let r = null
  o3d.traverse(c => { if (!r && c.isMesh && !c.userData.helper) r = c })
  return r
}

// Show the sculpt buffers in place of the geometry core built, so every touched vertex is seen at once.
function attach () {
  const vp = APP.viewport
  if (!S || !active || !vp) return
  const m = findMesh(vp.objects.get(S.id))
  if (!m) return
  if (m.geometry !== S.geom) {
    if (S.coreGeom && S.coreGeom !== m.geometry && S.coreGeom !== S.geom) S.coreGeom.dispose()
    S.coreGeom = m.geometry
    S.stale = false
    m.geometry = S.geom
    vp.refreshOutlines?.(); vp.requestRender()
  }
  S.mesh = m
}
function detach () {
  if (!S) return
  const m = S.mesh
  const o = S.stale && APP.obj(S.id), data = o && APP.geo.peek(o.geo)
  if (m && m.geometry === S.geom && data) {
    // commits skipped core's rebuild: give core the geometry it would have built (it keeps triFace for picking)
    if (S.coreGeom) releaseGeometry(S.coreGeom)
    m.geometry = toBufferGeometry(data, { smooth: o.smooth })
    m.userData.geoKey = o.geo + '|' + o.smooth
    APP.viewport?.refreshOutlines?.(); APP.viewport?.requestRender()
  } else if (m && m.geometry === S.geom && S.coreGeom) { m.geometry = S.coreGeom; APP.viewport?.refreshOutlines?.(); APP.viewport?.requestRender() }
  S.mesh = null; S.coreGeom = null
}

function targetId () {
  const sel = APP.selection || []
  for (const id of sel) { const o = APP.obj(id); if (o && o.type === 'mesh') return id }
  return null
}
function retarget () {
  const id = active ? targetId() : null
  if (S && S.id !== id) detach()
  if (id) { sessionFor(id); attach() }
  APP.ui?.refreshPanels?.()
}

// ---------- geometry math ----------
function vertNormal (s, v) {
  const { pos, ix, vtOff, vtList, nrm } = s
  let nx = 0, ny = 0, nz = 0
  for (let j = vtOff[v], e = vtOff[v + 1]; j < e; j++) {
    const t = vtList[j] * 3, a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2]
    const wx = pos[c] - pos[a], wy = pos[c + 1] - pos[a + 1], wz = pos[c + 2] - pos[a + 2]
    nx += uy * wz - uz * wy; ny += uz * wx - ux * wz; nz += ux * wy - uy * wx
  }
  const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
  const o = v * 3
  nrm[o] = nx / l; nrm[o + 1] = ny / l; nrm[o + 2] = nz / l
}
function allNormals (s) { for (let v = 0; v < s.nV; v++) vertNormal(s, v) }

// Vertices inside a sphere (local space) into s.qv / s.qd (distance / radius). Visited BVH nodes go to s.nodes.
function query (s, cx, cy, cz, r) {
  const r2 = r * r, id = ++s.qId, { ix, pos, qStamp, qv, qd, nodes } = s
  let n = 0
  s.bvh.shapecast({
    intersectsBounds: (box, isLeaf, score, depth, nodeIndex) => {
      const { min, max } = box
      const dx = cx < min.x ? min.x - cx : cx > max.x ? cx - max.x : 0
      const dy = cy < min.y ? min.y - cy : cy > max.y ? cy - max.y : 0
      const dz = cz < min.z ? min.z - cz : cz > max.z ? cz - max.z : 0
      if (dx * dx + dy * dy + dz * dz > r2) return BVH.NOT_INTERSECTED
      nodes.add(nodeIndex)
      return BVH.INTERSECTED
    },
    intersectsRange: (offset, count) => {
      for (let t = offset * 3, e = (offset + count) * 3; t < e; t++) {
        const v = ix[t]
        if (qStamp[v] === id) continue
        qStamp[v] = id
        const o = v * 3, dx = pos[o] - cx, dy = pos[o + 1] - cy, dz = pos[o + 2] - cz, d2 = dx * dx + dy * dy + dz * dz
        if (d2 < r2) { qv[n] = v; qd[n] = Math.sqrt(d2) / r; n++ }
      }
      return false
    }
  })
  return n
}

function touch (s, n) {
  const { qv, tStamp, touched } = s, id = s.tId
  for (let i = 0; i < n; i++) { const v = qv[i]; if (tStamp[v] !== id) { tStamp[v] = id; touched[s.nTouched++] = v } }
}

// One brush dab at local centre c. st = {brush, sign, strength, pressure, rL, falloff}
function dab (s, st, cx, cy, cz) {
  const r = st.rL, n = query(s, cx, cy, cz, r)
  if (!n) { s.nodes.clear(); return 0 }
  const { pos, nrm, qv, qd, qw } = s, fall = FALL[st.falloff] || FALL.smooth, k = st.strength * st.pressure, sign = st.sign
  let ax = 0, ay = 0, az = 0, px = 0, py = 0, pz = 0, ws = 0
  for (let i = 0; i < n; i++) {
    const o = qv[i] * 3, w = fall(qd[i])
    qw[i] = w * k
    ax += nrm[o] * w; ay += nrm[o + 1] * w; az += nrm[o + 2] * w
    px += pos[o] * w; py += pos[o + 1] * w; pz += pos[o + 2] * w; ws += w
  }
  const al = Math.sqrt(ax * ax + ay * ay + az * az)
  if (al > 1e-9) { ax /= al; ay /= al; az /= al } else { ax = 0; ay = 1; az = 0 }
  if (ws > 0) { px /= ws; py /= ws; pz /= ws } else { px = cx; py = cy; pz = cz }
  switch (st.brush) {
    case 'draw': {
      const d = sign * r * 0.06
      for (let i = 0; i < n; i++) { const o = qv[i] * 3, w = qw[i] * d; pos[o] += ax * w; pos[o + 1] += ay * w; pos[o + 2] += az * w }
      break
    }
    case 'inflate': {
      const d = sign * r * 0.05
      for (let i = 0; i < n; i++) { const o = qv[i] * 3, w = qw[i] * d; pos[o] += nrm[o] * w; pos[o + 1] += nrm[o + 1] * w; pos[o + 2] += nrm[o + 2] * w }
      break
    }
    case 'clay': {
      const off = sign * r * 0.08, qx = px + ax * off, qy = py + ay * off, qz = pz + az * off
      for (let i = 0; i < n; i++) {
        const o = qv[i] * 3, d = ((pos[o] - qx) * ax + (pos[o + 1] - qy) * ay + (pos[o + 2] - qz) * az) * sign
        if (d < 0) { const w = -d * sign * Math.min(1, qw[i] * 1.5); pos[o] += ax * w; pos[o + 1] += ay * w; pos[o + 2] += az * w }
      }
      break
    }
    case 'flatten': {
      const f = sign > 0 ? 1 : -0.5
      for (let i = 0; i < n; i++) {
        const o = qv[i] * 3, d = (pos[o] - px) * ax + (pos[o + 1] - py) * ay + (pos[o + 2] - pz) * az, w = -d * Math.min(1, qw[i]) * f
        pos[o] += ax * w; pos[o + 1] += ay * w; pos[o + 2] += az * w
      }
      break
    }
    case 'smooth': {
      const { vvOff, vvList, tmp } = s
      for (let i = 0; i < n; i++) {
        const v = qv[i]
        let sx = 0, sy = 0, sz = 0
        const b = vvOff[v], e = vvOff[v + 1]
        for (let j = b; j < e; j++) { const u = vvList[j] * 3; sx += pos[u]; sy += pos[u + 1]; sz += pos[u + 2] }
        const c = e - b || 1, o = v * 3
        tmp[i * 3] = sx / c - pos[o]; tmp[i * 3 + 1] = sy / c - pos[o + 1]; tmp[i * 3 + 2] = sz / c - pos[o + 2]
      }
      const f = sign > 0 ? 1 : -0.5
      for (let i = 0; i < n; i++) {
        const o = qv[i] * 3, w = Math.min(1, qw[i] * 1.6) * f
        pos[o] += tmp[i * 3] * w; pos[o + 1] += tmp[i * 3 + 1] * w; pos[o + 2] += tmp[i * 3 + 2] * w
      }
      break
    }
    case 'pinch':
    case 'crease': {
      const crease = st.brush === 'crease', pf = crease ? 0.25 : 0.3 * sign, d = crease ? -sign * r * 0.05 : 0
      for (let i = 0; i < n; i++) {
        const o = qv[i] * 3
        let tx = cx - pos[o], ty = cy - pos[o + 1], tz = cz - pos[o + 2]
        const dn = tx * ax + ty * ay + tz * az
        tx -= ax * dn; ty -= ay * dn; tz -= az * dn
        const w = qw[i]
        pos[o] += (tx * pf + ax * d) * w; pos[o + 1] += (ty * pf + ay * d) * w; pos[o + 2] += (tz * pf + az * d) * w
      }
      break
    }
  }
  touch(s, n)
  s.bvh.refit(s.nodes)
  s.nodes.clear()
  stats.dabs++
  return n
}

// Dab at c and, with X symmetry, at c mirrored over the object's local X = 0.
function dabSym (s, st, c) {
  dab(s, st, c.x, c.y, c.z)
  if (st.sym) dab(s, st, -c.x, c.y, c.z)
}

// Dabs every SPACING*r along from -> to (local), carrying the remainder between calls.
function walk (s, st, from, to, cap) {
  const dist = from.distanceTo(to)
  let sp = st.rL * SPACING
  if (cap && dist / sp > cap) sp = dist / cap
  let t = st.carry
  const c = new THREE.Vector3()
  while (t <= dist) { c.lerpVectors(from, to, dist > 0 ? t / dist : 0); dabSym(s, st, c); t += sp }
  st.carry = t - dist
}

// Recompute normals of touched vertices and their neighbours, then upload only that index range.
function finishStep (s) {
  if (!s.nTouched) { s.tId++; return }
  const { touched, vvOff, vvList, rStamp, ring: R } = s, id = ++s.rId
  let nR = 0, lo = Infinity, hi = -1
  for (let i = 0; i < s.nTouched; i++) {
    const v = touched[i]
    if (rStamp[v] !== id) { rStamp[v] = id; R[nR++] = v }
    for (let j = vvOff[v], e = vvOff[v + 1]; j < e; j++) { const u = vvList[j]; if (rStamp[u] !== id) { rStamp[u] = id; R[nR++] = u } }
  }
  for (let i = 0; i < nR; i++) { const v = R[i]; vertNormal(s, v); if (v < lo) lo = v; if (v > hi) hi = v }
  for (const a of [s.geom.attributes.position, s.geom.attributes.normal]) {
    a.clearUpdateRanges(); a.addUpdateRange(lo * 3, (hi - lo + 1) * 3); a.needsUpdate = true
  }
  s.nTouched = 0
  s.tId++
}

// Grab: weights are taken once at the stroke start; each move sets pos = start + delta * weight.
function grabStart (s, st, c) {
  if (!s.gA) { s.gA = new Float32Array(s.nV); s.gB = new Float32Array(s.nV); s.gList = new Uint32Array(s.nV) }
  const fall = FALL[st.falloff] || FALL.smooth, k = Math.min(1, st.strength * 2) * st.pressure, id = s.tId + 0x40000000
  s.nG = 0
  const add = (cx, cy, cz, arr) => {
    const n = query(s, cx, cy, cz, st.rL)
    for (let i = 0; i < n; i++) {
      const v = s.qv[i]
      arr[v] = fall(s.qd[i]) * k
      if (s.tStamp[v] !== id) { s.tStamp[v] = id; s.gList[s.nG++] = v }
    }
  }
  add(c.x, c.y, c.z, s.gA)
  if (st.sym) add(-c.x, c.y, c.z, s.gB)
  st.gNodes = new Set(s.nodes)
  s.nodes.clear()
}
function grabApply (s, st, d) {
  const { pos, gA, gB, gList, touched } = s, o0 = st.start
  for (let i = 0; i < s.nG; i++) {
    const v = gList[i], o = v * 3, a = gA[v], b = gB[v]
    pos[o] = o0[o] + d.x * (a - b); pos[o + 1] = o0[o + 1] + d.y * (a + b); pos[o + 2] = o0[o + 2] + d.z * (a + b)
    touched[i] = v
  }
  s.nTouched = s.nG
  s.bvh.refit(st.gNodes)
  stats.dabs++
}
function grabEnd (s) {
  for (let i = 0; i < s.nG; i++) { const v = s.gList[i]; s.gA[v] = 0; s.gB[v] = 0 }
  s.nG = 0
}

function commit (s, label, inRun) {
  const t0 = performance.now()
  const n = s.nV * 3, verts = new Array(n), pos = s.pos, src = s.src
  for (let i = 0; i < n; i++) {
    const p = pos[i], o = src ? src[i] : NaN
    if (p === Math.fround(o)) verts[i] = o // untouched: keep the exact value
    else { const x = Math.round(p * 1e4) / 1e4; pos[i] = x; verts[i] = x }
  }
  s.src = verts
  s.geom.computeBoundingSphere(); s.geom.computeBoundingBox()
  const g = APP.geo.put({ verts, faces: s.faces, uvs: s.uvs })
  s.geoId = g
  const patch = { geo: g }
  if (APP.obj(s.id)?.smooth !== true) patch.smooth = true
  // the sculpt buffers already show this geo: core skips its rebuild (setMesh compares geoKey)
  if (s.mesh && s.mesh.geometry === s.geom) { s.mesh.userData.geoKey = g + '|true'; s.stale = true }
  if (inRun) APP.set(s.id, patch)
  else APP.transact(label, () => APP.set(s.id, patch))
  attach()
  APP.viewport?.shadowsDirty?.()
  APP.viewport?.requestRender()
  stats.commit = performance.now() - t0
  return g
}

function note (ms) {
  stats.steps++; stats.total += ms; stats.last = ms
  if (ms > stats.max) stats.max = ms
}

// ---------- pointer strokes ----------
const _inv = new THREE.Matrix4(), _ray = new THREE.Ray(), _sc = new THREE.Vector3()
function matrixOf (s) {
  if (s.mesh) { s.mesh.updateWorldMatrix(true, false); return s.mesh.matrixWorld }
  return APP.worldMatrix(s.id)
}
function scaleOf (m) { _sc.setFromMatrixScale(m); return (Math.abs(_sc.x) + Math.abs(_sc.y) + Math.abs(_sc.z)) / 3 || 1 }
function cast (s, ray, mw) {
  if (!ray) return null
  _inv.copy(mw).invert()
  _ray.copy(ray).applyMatrix4(_inv)
  const hit = s.bvh.raycastFirst(_ray, THREE.DoubleSide)
  if (!hit) return null
  const local = hit.point.clone()
  const world = local.clone().applyMatrix4(mw)
  const normal = (hit.face?.normal ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0)).transformDirection(mw)
  return { local, world, normal }
}
// World size of `px` screen pixels at a world point.
function pxToWorld (p, px) {
  const vp = APP.viewport, cam = vp.camera
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).normalize()
  const a = vp.project(p.clone()), b = vp.project(p.clone().add(right))
  const ppu = Math.hypot(b.x - a.x, b.y - a.y)
  return ppu > 1e-6 ? px / ppu : 1
}

function makeRing () {
  const pts = []
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0)) }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mk = op => {
    const l = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: op, depthTest: false, depthWrite: false }))
    l.renderOrder = 999; l.userData.helper = true; l.raycast = () => {}
    return l
  }
  const g = new THREE.Group()
  g.userData.helper = true; g.visible = false; g.name = 'sculpt-cursor'
  const outer = mk(0.95), inner = mk(0.4)
  g.add(outer, inner)
  return { g, outer, inner, z: new THREE.Vector3(0, 0, 1) }
}
function styleRing (sign) {
  if (!ring) return
  const inv = sign === undefined ? cfg.invert : sign < 0
  ring.outer.material.color.set(inv ? '#e5484d' : '#ffffff')
  ring.inner.material.color.set(inv ? '#e5484d' : '#3d8bfd')
  ring.inner.scale.setScalar(Math.max(0.08, cfg.strength))
}
function showRing (hit, rW, sign) {
  if (!ring || !APP.viewport) return
  if (!ring.g.parent) APP.viewport.helpers.add(ring.g)
  ring.g.visible = !!hit
  if (hit) {
    ring.g.position.copy(hit.world).addScaledVector(hit.normal, rW * 0.01)
    ring.g.quaternion.setFromUnitVectors(ring.z, hit.normal)
    ring.g.scale.setScalar(rW)
    styleRing(sign)
  }
  APP.viewport.requestRender()
}
function hideRing () {
  if (ring && ring.g.visible) { ring.g.visible = false; APP.viewport?.requestRender() }
}

function onDown (ev) {
  if (ev.button !== undefined && ev.button !== 0) return false
  const id = targetId()
  if (!id) {
    if (ev.hit?.id) { APP.select([ev.hit.id]); return false }
    return false
  }
  const s = sessionFor(id)
  if (!s) { APP.toast?.('Loading mesh'); return false }
  attach()
  const mw = matrixOf(s), hit = cast(s, ev.ray, mw)
  if (!hit) {
    if (ev.hit?.id && ev.hit.id !== id) { const o = APP.obj(ev.hit.id); if (o && (o.type === 'mesh' || o.type === 'part')) { APP.select([ev.hit.id]); return false } }
    return false
  }
  const t0 = performance.now()
  const sc = scaleOf(mw), rW = pxToWorld(hit.world, cfg.radius)
  const pressure = ev.pointerType === 'pen' && ev.pressure > 0 ? ev.pressure : 1
  stroke = {
    brush: cfg.brush, sign: (!!ev.ctrl !== !!cfg.invert) ? -1 : 1, sym: cfg.sym, strength: cfg.strength, pressure,
    falloff: cfg.falloff, rL: rW / sc, rW, sc, mw: mw.clone(), start: s.pos.slice(), last: hit.local.clone(), carry: 0, moved: false
  }
  if (stroke.brush === 'grab') {
    grabStart(s, stroke, hit.local)
    stroke.p0 = hit.world.clone()
    const dir = new THREE.Vector3(); APP.viewport.camera.getWorldDirection(dir)
    stroke.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(dir, hit.world)
  } else {
    walk(s, stroke, hit.local, hit.local, 1)
    stroke.carry = stroke.rL * SPACING
    finishStep(s)
  }
  showRing(hit, rW, stroke.sign)
  note(performance.now() - t0)
  return true
}

function onMove (ev) {
  if (!stroke) return
  const s = S
  if (!s) return
  const t0 = performance.now()
  if (stroke.brush === 'grab') {
    const p = ev.ray && ev.ray.intersectPlane(stroke.plane, new THREE.Vector3())
    if (!p) return
    _inv.copy(stroke.mw).invert()
    const a = stroke.p0.clone().applyMatrix4(_inv), b = p.clone().applyMatrix4(_inv)
    grabApply(s, stroke, b.sub(a))
    finishStep(s)
    stroke.moved = true
    if (ring) { ring.g.position.copy(p); ring.g.visible = true }
  } else {
    const hit = cast(s, ev.ray, stroke.mw)
    if (!hit) { hideRing(); return }
    stroke.rL = pxToWorld(hit.world, cfg.radius) / stroke.sc
    walk(s, stroke, stroke.last, hit.local, MAX_DABS)
    stroke.last.copy(hit.local)
    finishStep(s)
    stroke.moved = true
    showRing(hit, stroke.rL * stroke.sc, stroke.sign)
  }
  note(performance.now() - t0)
  APP.viewport.requestRender()
}

function onUp () {
  if (!stroke) return
  const s = S, st = stroke
  stroke = null
  if (!s) return
  if (st.brush === 'grab') grabEnd(s)
  commit(s, 'Sculpt ' + BR[st.brush].label)
  if (isPhone()) hideRing()
}

function onCancel () {
  if (!stroke) return
  const s = S, st = stroke
  stroke = null
  if (!s) return
  if (st.brush === 'grab') grabEnd(s)
  s.pos.set(st.start)
  allNormals(s)
  s.bvh.refit()
  for (const a of [s.geom.attributes.position, s.geom.attributes.normal]) { a.clearUpdateRanges(); a.needsUpdate = true }
  hideRing()
  APP.viewport?.requestRender()
}

function onHover (ev) {
  if (stroke || !active) return
  const id = targetId()
  const s = id && S && S.id === id ? S : null
  if (!s) { hideRing(); return }
  const mw = matrixOf(s), hit = cast(s, ev.ray, mw)
  if (!hit) { hideRing(); return }
  showRing(hit, pxToWorld(hit.world, cfg.radius), (!!ev.ctrl !== !!cfg.invert) ? -1 : 1)
}

// ---------- scripted strokes (AIs, tests) ----------
function scriptStroke (app, s, a, inRun) {
  const mw = s.mesh ? matrixOf(s) : app.worldMatrix(s.id)
  const inv = mw.clone().invert(), sc = scaleOf(mw)
  const brush = BR[a.brush] ? a.brush : cfg.brush
  let pts = (a.points || []).map(p => new THREE.Vector3(+p[0] || 0, +p[1] || 0, +p[2] || 0).applyMatrix4(inv))
  if (!pts.length) throw new Error('Sculpt stroke needs points: [[x,y,z], ...]')
  if (a.snap !== false) {
    pts = pts.map((p, i) => { if (brush === 'grab' && i) return p; const r = s.bvh.closestPointToPoint(p, {}); return r && r.point ? r.point.clone() : p })
  }
  const st = {
    brush, sign: a.invert ? -1 : 1, sym: a.symmetry === undefined ? cfg.sym : !!a.symmetry,
    strength: a.strength === undefined ? cfg.strength : Math.min(1, Math.max(0, +a.strength)), pressure: 1,
    falloff: FALL[a.falloff] ? a.falloff : cfg.falloff, rL: (a.radius > 0 ? +a.radius : 1) / sc, carry: 0, start: s.pos.slice()
  }
  const t0 = performance.now(), d0 = stats.dabs
  if (brush === 'grab') {
    grabStart(s, st, pts[0])
    const d = pts[pts.length - 1].clone().sub(pts[0])
    grabApply(s, st, d)
    finishStep(s)
    grabEnd(s)
  } else {
    walk(s, st, pts[0], pts[0], 1)
    st.carry = st.rL * SPACING
    finishStep(s)
    for (let i = 1; i < pts.length; i++) { walk(s, st, pts[i - 1], pts[i], 0); finishStep(s) }
  }
  const ms = performance.now() - t0, dabs = stats.dabs - d0
  const geo = commit(s, 'Sculpt ' + BR[brush].label, inRun)
  return { geo, dabs, ms: Math.round(ms * 100) / 100, msPerDab: dabs ? Math.round(ms / dabs * 1000) / 1000 : 0 }
}

// ---------- topology tools: weld, subdivide, remesh ----------
function weld (verts, faces, uvs) {
  const n = verts.length / 3, map = new Int32Array(n), keyTo = new Map(), out = [], ou = uvs && uvs.length === n * 2 ? [] : null
  let merged = false
  for (let i = 0; i < n; i++) {
    const x = verts[i * 3], y = verts[i * 3 + 1], z = verts[i * 3 + 2]
    const key = Math.round(x * 1e4) + ',' + Math.round(y * 1e4) + ',' + Math.round(z * 1e4)
    let j = keyTo.get(key)
    if (j === undefined) { j = out.length / 3; keyTo.set(key, j); out.push(x, y, z); if (ou) ou.push(uvs[i * 2], uvs[i * 2 + 1]) } else merged = true
    map[i] = j
  }
  const f2 = []
  for (const f of faces) {
    const g = []
    for (const v of f) { const m = map[v]; if (!g.includes(m)) g.push(m) }
    if (g.length >= 3) f2.push(g)
  }
  return { verts: out, faces: f2, uvs: merged ? null : ou }
}

function triCount (faces) { let n = 0; for (const f of faces) n += f.length - 2; return n }

function subdivide (geo, smooth) {
  const w = weld(geo.verts, geo.faces, geo.uvs)
  const P = w.verts, F = w.faces, UV = w.uvs
  const est = smooth ? F.reduce((a, f) => a + f.length * 2, 0) : F.reduce((a, f) => a + (f.length === 3 ? 4 : f.length * 2), 0)
  if (est > MAX_TRIS) throw new Error('Too dense: ' + est + ' triangles (limit ' + MAX_TRIS + ')')
  const nV0 = P.length / 3, V = P.slice(), U = UV ? UV.slice() : null
  const edgeKey = new Map(), eA = [], eB = [], eM = [], eN = [], eF = []
  const center = new Int32Array(F.length).fill(-1)
  const addV = (x, y, z, u, v) => { V.push(x, y, z); if (U) U.push(u, v); return V.length / 3 - 1 }
  F.forEach((f, fi) => {
    if (smooth || f.length > 3) {
      let x = 0, y = 0, z = 0, u = 0, v = 0
      for (const i of f) { x += P[i * 3]; y += P[i * 3 + 1]; z += P[i * 3 + 2]; if (U) { u += UV[i * 2]; v += UV[i * 2 + 1] } }
      const n = f.length
      center[fi] = addV(x / n, y / n, z / n, u / n, v / n)
    }
  })
  const mid = (a, b, fi) => {
    const k = a < b ? a * 4194304 + b : b * 4194304 + a
    let e = edgeKey.get(k)
    if (e === undefined) {
      e = eA.length; edgeKey.set(k, e); eA.push(a); eB.push(b); eN.push(0); eF.push([0, 0, 0])
      eM.push(addV((P[a * 3] + P[b * 3]) / 2, (P[a * 3 + 1] + P[b * 3 + 1]) / 2, (P[a * 3 + 2] + P[b * 3 + 2]) / 2,
        U ? (UV[a * 2] + UV[b * 2]) / 2 : 0, U ? (UV[a * 2 + 1] + UV[b * 2 + 1]) / 2 : 0))
    }
    eN[e]++
    if (center[fi] >= 0) { const c = center[fi] * 3, s = eF[e]; s[0] += V[c]; s[1] += V[c + 1]; s[2] += V[c + 2] }
    return eM[e]
  }
  const out = []
  F.forEach((f, fi) => {
    const n = f.length, m = []
    for (let i = 0; i < n; i++) m.push(mid(f[i], f[(i + 1) % n], fi))
    if (!smooth && n === 3) {
      out.push([f[0], m[0], m[2]], [m[0], f[1], m[1]], [m[2], m[1], f[2]], [m[0], m[1], m[2]])
    } else {
      const c = center[fi]
      for (let i = 0; i < n; i++) out.push([f[i], m[i], c, m[(i + n - 1) % n]])
    }
  })
  if (smooth) {
    // Catmull-Clark: edge points, then vertex points (boundary vertices stay put).
    const fs = new Float64Array(nV0 * 3), fc = new Uint32Array(nV0), rs = new Float64Array(nV0 * 3), rc = new Uint32Array(nV0), bnd = new Uint8Array(nV0)
    F.forEach((f, fi) => { const c = center[fi] * 3; for (const i of f) { fs[i * 3] += V[c]; fs[i * 3 + 1] += V[c + 1]; fs[i * 3 + 2] += V[c + 2]; fc[i]++ } })
    for (let e = 0; e < eA.length; e++) {
      const a = eA[e], b = eB[e], m = eM[e] * 3
      for (const i of [a, b]) { rs[i * 3] += V[m]; rs[i * 3 + 1] += V[m + 1]; rs[i * 3 + 2] += V[m + 2]; rc[i]++ }
      if (eN[e] === 2) {
        const s = eF[e]
        V[m] = (P[a * 3] + P[b * 3] + s[0]) / 4; V[m + 1] = (P[a * 3 + 1] + P[b * 3 + 1] + s[1]) / 4; V[m + 2] = (P[a * 3 + 2] + P[b * 3 + 2] + s[2]) / 4
      } else { bnd[a] = 1; bnd[b] = 1 }
    }
    for (let i = 0; i < nV0; i++) {
      if (bnd[i] || !fc[i] || !rc[i]) continue
      const n = rc[i]
      for (let c = 0; c < 3; c++) V[i * 3 + c] = (fs[i * 3 + c] / fc[i] + 2 * rs[i * 3 + c] / rc[i] + (n - 3) * P[i * 3 + c]) / n
    }
  }
  return { verts: V, faces: out, uvs: U }
}

function surfaceArea (P, T) {
  let A = 0
  for (let i = 0; i < T.length; i += 3) {
    const a = T[i] * 3, b = T[i + 1] * 3, c = T[i + 2] * 3
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2]
    const x = uy * wz - uz * wy, y = uz * wx - ux * wz, z = ux * wy - uy * wx
    A += Math.sqrt(x * x + y * y + z * z) / 2
  }
  return A
}

// Remesh to a target edge length: split every edge longer than `len` at its midpoint until none is left.
// Both triangles of an edge see the same split, so the result stays watertight.
function remesh (geo, opts = {}) {
  const w = weld(geo.verts, geo.faces, geo.uvs)
  const P = w.verts, U = w.uvs ? w.uvs.slice() : null
  let T = []
  for (const f of w.faces) for (let i = 1; i < f.length - 1; i++) T.push(f[0], f[i], f[i + 1])
  const area = surfaceArea(P, T)
  const want = Math.min(MAX_TRIS, Math.max(200, opts.tris || cfg.detail))
  const len = opts.density > 0 ? +opts.density : Math.sqrt(area / (0.3 * want))
  const L2 = len * len
  let capped = false
  for (let iter = 0; iter < 24; iter++) {
    const em = new Map(), marks = new Float64Array(T.length)
    let any = false, grow = 0
    for (let i = 0; i < T.length; i += 3) {
      let k = 0
      for (let c = 0; c < 3; c++) {
        const a = T[i + c], b = T[i + (c + 1) % 3], key = a < b ? a * 4194304 + b : b * 4194304 + a
        let m = em.get(key)
        if (m === undefined) {
          const dx = P[a * 3] - P[b * 3], dy = P[a * 3 + 1] - P[b * 3 + 1], dz = P[a * 3 + 2] - P[b * 3 + 2]
          m = dx * dx + dy * dy + dz * dz > L2 ? -2 : -1
          em.set(key, m)
        }
        marks[i + c] = key
        if (m === -2) { any = true; k++ }
      }
      grow += k
    }
    if (!any) break
    if (T.length / 3 + grow > MAX_TRIS) { capped = true; break }
    const midOf = key => {
      let m = em.get(key)
      if (m === -2) {
        const a = Math.floor(key / 4194304), b = key - a * 4194304
        m = P.length / 3
        P.push((P[a * 3] + P[b * 3]) / 2, (P[a * 3 + 1] + P[b * 3 + 1]) / 2, (P[a * 3 + 2] + P[b * 3 + 2]) / 2)
        if (U) U.push((U[a * 2] + U[b * 2]) / 2, (U[a * 2 + 1] + U[b * 2 + 1]) / 2)
        em.set(key, m)
      }
      return m
    }
    const N = []
    for (let i = 0; i < T.length; i += 3) {
      const a = T[i], b = T[i + 1], c = T[i + 2]
      const ka = em.get(marks[i]), kb = em.get(marks[i + 1]), kc = em.get(marks[i + 2])
      const ma = ka === -1 ? -1 : midOf(marks[i]), mb = kb === -1 ? -1 : midOf(marks[i + 1]), mc = kc === -1 ? -1 : midOf(marks[i + 2])
      const n = (ma >= 0) + (mb >= 0) + (mc >= 0)
      if (n === 0) N.push(a, b, c)
      else if (n === 3) N.push(a, ma, mc, ma, b, mb, mc, mb, c, ma, mb, mc)
      else if (n === 1) {
        if (ma >= 0) N.push(a, ma, c, ma, b, c)
        else if (mb >= 0) N.push(a, b, mb, a, mb, c)
        else N.push(a, b, mc, mc, b, c)
      } else if (mc < 0) N.push(ma, b, mb, a, ma, mb, a, mb, c)
      else if (ma < 0) N.push(mb, c, mc, a, b, mb, a, mb, mc)
      else N.push(a, ma, mc, ma, b, c, ma, c, mc)
    }
    T = N
  }
  const faces = []
  for (let i = 0; i < T.length; i += 3) faces.push([T[i], T[i + 1], T[i + 2]])
  return { geo: { verts: P, faces, uvs: U }, len, capped }
}

// Ids of mesh objects for a topology command; parts are turned into meshes first.
function meshIds (app, args) {
  const ids = (args.ids || app.selection || []).filter(id => app.obj(id))
  const out = []
  for (const id of ids) {
    const o = app.obj(id)
    if (o.type === 'mesh') { out.push(id); continue }
    if (o.type !== 'part') continue
    const r = app.run('parts.toMesh', { ids: [id] })
    if (app.obj(id)?.type !== 'mesh' && r && typeof r.then === 'function') throw new Error('Part is still converting; try again')
    if (app.obj(id)?.type === 'mesh') out.push(id)
    else if (typeof r === 'string' && app.obj(r)?.type === 'mesh') out.push(r)
    else if (Array.isArray(r)) for (const x of r) { if (app.obj(x)?.type === 'mesh') out.push(x) }
  }
  if (!out.length) throw new Error('Select a mesh or part')
  return out
}

function topoCommand (app, args, fn) {
  const ids = meshIds(app, args)
  const res = []
  for (const id of ids) {
    const o = app.obj(id), data = app.geo.peek(o.geo)
    if (!data) throw new Error('Mesh data is still loading')
    const geo = fn(data)
    const g = app.geo.put(geo)
    app.set(id, { geo: g, smooth: true })
    res.push({ id, geo: g, verts: geo.verts.length / 3, tris: triCount(geo.faces) })
  }
  if (!args.ids) app.select(ids)
  if (active) setTimeout(retarget, 0)
  return res.length === 1 ? res[0] : res
}

// ---------- panel ----------
function renderPanel (el, app) {
  el.innerHTML = ''
  const sec = title => { const b = h('div', 'sculpt-sec'); b.append(h('div', 'sculpt-h', title)); el.append(b); return b }
  const ic = n => app.ui?.icon ? app.ui.icon(n) : ''
  // Brushes
  const b1 = sec('Brush')
  const grid = h('div', 'sculpt-grid')
  for (const b of BRUSHES) {
    const d = BR[b], btn = h('button', 'sculpt-b' + (cfg.brush === b ? ' on' : ''))
    btn.type = 'button'
    btn.title = d.label + ' (' + d.key + '): ' + d.tip
    btn.dataset.brush = b
    btn.innerHTML = ic(d.icon) + '<span>' + d.label + '</span>'
    btn.onclick = () => app.exec('sculpt.' + b)
    grid.append(btn)
  }
  b1.append(grid, h('div', 'sculpt-tip mute', BR[cfg.brush].tip))
  // Settings
  const b2 = sec('Settings')
  const slider = (label, min, max, step, get, set, show, keys) => {
    const row = h('div', 'sculpt-row')
    const lab = h('label', 'sculpt-lab', label)
    const inp = h('input', 'range grow'); inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = get()
    const pct = v => inp.style.setProperty('--p', ((v - min) / (max - min) * 100).toFixed(1) + '%')
    pct(get())
    inp.setAttribute('aria-label', label)
    const val = h('span', 'mono sculpt-val', show(get()))
    inp.oninput = () => { set(+inp.value); val.textContent = show(+inp.value); pct(+inp.value) }
    row.append(lab, inp, val)
    if (keys) row.title = keys
    return row
  }
  b2.append(slider('Radius', 4, 300, 1, () => cfg.radius, v => setCfg({ radius: v }), v => Math.round(v) + ' px', '[ smaller, ] bigger'))
  b2.append(slider('Strength', 0.01, 1, 0.01, () => cfg.strength, v => setCfg({ strength: v }), v => (+v).toFixed(2), 'Shift+[ weaker, Shift+] stronger'))
  const fr = h('div', 'sculpt-row')
  const fsel = h('select', 'inp grow'); fsel.setAttribute('aria-label', 'Falloff')
  for (const k of Object.keys(FALL)) { const op = h('option', '', FALL_LABEL[k]); op.value = k; if (cfg.falloff === k) op.selected = true; fsel.append(op) }
  fsel.onchange = () => setCfg({ falloff: fsel.value })
  fr.append(h('label', 'sculpt-lab', 'Falloff'), fsel)
  b2.append(fr)
  const tg = h('div', 'sculpt-toggles')
  const tog = (label, icn, on, cmd, keyTip) => {
    const t = h('button', 'sculpt-t' + (on ? ' on' : ''), ic(icn) + '<span>' + label + '</span>')
    t.type = 'button'; t.title = keyTip; t.setAttribute('aria-pressed', on ? 'true' : 'false')
    t.onclick = () => app.exec(cmd)
    return t
  }
  tg.append(tog('Invert', 'sc-invert', cfg.invert, 'sculpt.invert', 'Hold Ctrl to invert one stroke'))
  tg.append(tog('X symmetry', 'sc-sym', cfg.sym, 'sculpt.symmetry', 'Shift+X'))
  b2.append(tg)
  // Mesh
  const b3 = sec('Mesh')
  const sel = (app.selection || []).map(id => app.obj(id)).filter(Boolean)
  const id = targetId(), o = id && app.obj(id)
  const detailRow = () => {
    const r = h('div', 'sculpt-row')
    const ds = h('select', 'inp grow'); ds.setAttribute('aria-label', 'Remesh detail')
    for (const [n, l] of DETAIL) { const op = h('option', '', l); op.value = n; if (cfg.detail === n) op.selected = true; ds.append(op) }
    ds.onchange = () => setCfg({ detail: +ds.value })
    r.append(h('label', 'sculpt-lab', 'Detail'), ds)
    return r
  }
  if (o) {
    const s = S && S.id === id ? S : null
    const data = s ? null : app.geo.peek(o.geo)
    const nv = s ? s.nV : data ? data.verts.length / 3 : 0, nt = s ? s.nT : data ? triCount(data.faces) : 0
    lastPanelGeo = o.geo
    b3.append(h('div', 'sculpt-info', '<span class="grow">' + esc(o.name || 'Mesh') + '</span><span class="mono mute">' + fmtN(nv) + ' verts · ' + fmtN(nt) + ' tris</span>'))
    if (nt && nt < 2000) b3.append(h('div', 'sculpt-tip', 'Few triangles: remesh or subdivide so brushes have detail to move.'))
    b3.append(detailRow())
    const br = h('div', 'btn-row')
    const bt = (label, icn, cmd, args) => { const b = h('button', 'btn grow', ic(icn) + '<span>' + label + '</span>'); b.type = 'button'; b.onclick = () => app.exec(cmd, args); return b }
    br.append(bt('Remesh', 'sc-remesh', 'sculpt.remesh'), bt('Subdivide', 'sc-sub', 'sculpt.subdivide'))
    b3.append(br)
    if (stats.steps) b3.append(h('div', 'sculpt-tip mono mute', 'Step ' + stats.last.toFixed(1) + ' ms · avg ' + (stats.total / stats.steps).toFixed(1) + ' ms'))
  } else if (sel.some(x => x.type === 'part')) {
    lastPanelGeo = null
    b3.append(h('div', 'sculpt-tip', 'Parts have too few faces to sculpt. Make it a dense mesh first.'))
    b3.append(detailRow())
    const b = h('button', 'btn grow sculpt-wide', ic('sc-remesh') + '<span>Make sculptable</span>'); b.type = 'button'
    b.onclick = () => app.exec('sculpt.remesh')
    b3.append(b)
  } else {
    lastPanelGeo = null
    b3.append(h('div', 'sculpt-tip', 'Tap a mesh or part to sculpt it.'))
  }
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const fmtN = n => n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : String(n)

const CSS = `
.sculpt-h{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin:12px 0 6px}
.sculpt-sec:first-child .sculpt-h{margin-top:2px}
.sculpt-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.sculpt-b{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;height:48px;padding:0;border:1px solid var(--line);border-radius:var(--r,6px);background:var(--panel2);color:var(--text);font:inherit;font-size:11px;cursor:pointer}
.sculpt-b:hover{background:var(--hover,#2d323a)}
.sculpt-b.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 22%,var(--panel2));color:#fff}
.sculpt-b svg,.sculpt-t svg,.sculpt-wide svg{width:16px;height:16px;flex:none}
.sculpt-row{display:flex;align-items:center;gap:8px;min-height:var(--h,28px);margin:2px 0}
.sculpt-lab{width:62px;flex:none;color:var(--mute);font-size:12px}
.sculpt-val{width:52px;flex:none;text-align:right;font-size:11px;color:var(--text)}
.sculpt-row input[type=range]{min-width:0}
.sculpt-toggles{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px}
.sculpt-t{display:flex;align-items:center;justify-content:center;gap:6px;height:var(--h,28px);border:1px solid var(--line);border-radius:var(--r,6px);background:var(--panel2);color:var(--mute);font:inherit;font-size:12px;cursor:pointer}
.sculpt-t.on{color:#fff;border-color:var(--accent);background:color-mix(in srgb,var(--accent) 22%,var(--panel2))}
.sculpt-info{display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:4px}
.sculpt-tip{font-size:11px;color:var(--mute);margin:4px 0;line-height:1.4}
.sculpt-wide{width:100%;display:flex;align-items:center;justify-content:center;gap:6px}
.sculpt-b span,.sculpt-t span{white-space:nowrap}
@media (pointer:coarse){.sculpt-b{height:56px}.sculpt-t{height:44px}.sculpt-row{min-height:44px}}
`

// ---------- plugin ----------
const brushCommands = {}
for (const b of BRUSHES) {
  brushCommands['sculpt.' + b] = {
    label: BR[b].label + ' brush', icon: BR[b].icon, key: BR[b].key, mode: 'sculpt', noUndo: true,
    enabled: () => active,
    checked: () => cfg.brush === b,
    run (app) { setCfg({ brush: b }); if (toolId(app) !== 'sculpt-' + b) app.setTool('sculpt-' + b); return b }
  }
}

const sculptTools = BRUSHES.map((b, i) => ({
  id: 'sculpt-' + b, label: BR[b].label, icon: BR[b].icon, mode: 'sculpt', order: i,
  onActivate () { if (cfg.brush !== b) setCfg({ brush: b }) },
  onDeactivate () { onCancel(); hideRing() },
  onDown, onMove, onUp, onCancel, onHover
}))

export default {
  id: 'sculpt',
  name: 'Sculpt',
  modes: [{ id: 'sculpt', label: 'Sculpt', icon: 'sculpt', order: 30 }],
  tools: sculptTools,
  commands: {
    'sculpt.mode': {
      label: 'Sculpt mode', icon: 'sculpt', noUndo: true, checked: () => active,
      run (app) { app.setMode(active ? 'build' : 'sculpt'); return active }
    },
    ...brushCommands,
    'sculpt.brush': {
      label: 'Pick brush', icon: 'sc-draw', noUndo: true, hidden: true,
      run (app, a = {}) { if (!BR[a.brush]) throw new Error('Brush is one of ' + BRUSHES.join(', ')); setCfg({ brush: a.brush }); if (active) app.setTool('sculpt-' + a.brush); return a.brush }
    },
    'sculpt.radiusUp': { label: 'Bigger brush', icon: 'sc-radius', key: 'BracketRight', mode: 'sculpt', noUndo: true, run () { setCfg({ radius: cfg.radius * 1.15 + 1 }); return cfg.radius } },
    'sculpt.radiusDown': { label: 'Smaller brush', icon: 'sc-radius', key: 'BracketLeft', mode: 'sculpt', noUndo: true, run () { setCfg({ radius: cfg.radius / 1.15 - 1 }); return cfg.radius } },
    'sculpt.strengthUp': { label: 'Stronger brush', icon: 'sc-strength', key: 'Shift+BracketRight', mode: 'sculpt', noUndo: true, run () { setCfg({ strength: cfg.strength + 0.05 }); return cfg.strength } },
    'sculpt.strengthDown': { label: 'Weaker brush', icon: 'sc-strength', key: 'Shift+BracketLeft', mode: 'sculpt', noUndo: true, run () { setCfg({ strength: cfg.strength - 0.05 }); return cfg.strength } },
    'sculpt.invert': { label: 'Invert brush', icon: 'sc-invert', noUndo: true, checked: () => cfg.invert, run () { setCfg({ invert: !cfg.invert }); return cfg.invert } },
    'sculpt.symmetry': { label: 'X symmetry', icon: 'sc-sym', key: 'Shift+X', mode: 'sculpt', noUndo: true, checked: () => cfg.sym, run () { setCfg({ sym: !cfg.sym }); return cfg.sym } },
    'sculpt.set': {
      label: 'Brush settings', icon: 'sculpt', noUndo: true, hidden: true,
      run (app, a = {}) {
        const p = {}
        if (BR[a.brush]) p.brush = a.brush
        if (a.radius > 0) p.radius = +a.radius
        if (a.strength !== undefined) p.strength = +a.strength
        if (a.invert !== undefined) p.invert = !!a.invert
        if (a.symmetry !== undefined) p.sym = !!a.symmetry
        if (FALL[a.falloff]) p.falloff = a.falloff
        if (a.detail > 0) p.detail = +a.detail
        setCfg(p)
        if (p.brush && active) app.setTool('sculpt-' + p.brush)
        return { ...cfg }
      }
    },
    'sculpt.subdivide': {
      label: 'Subdivide for sculpt', icon: 'sc-sub',
      run (app, a = {}) {
        const levels = Math.max(1, Math.min(4, a.levels | 0 || 1))
        return topoCommand(app, a, d => { let g = d; for (let i = 0; i < levels; i++) g = subdivide(g, !!a.smooth); return g })
      }
    },
    'sculpt.remesh': {
      label: 'Remesh density', icon: 'sc-remesh',
      run (app, a = {}) {
        let info = null
        const r = topoCommand(app, a, d => { const m = remesh(d, { tris: a.tris, density: a.density }); info = m; return m.geo })
        if (info?.capped) app.toast?.('Remesh stopped at ' + MAX_TRIS / 1000 + 'k triangles')
        return r
      }
    },
    'sculpt.stroke': {
      label: 'Sculpt stroke', icon: 'sc-draw', hidden: true,
      run (app, a = {}) {
        const id = a.id || targetId()
        const o = id && app.obj(id)
        if (!o || o.type !== 'mesh') throw new Error('Sculpt stroke needs a mesh object id')
        if (!app.geo.peek(o.geo) || !BVH) {
          return Promise.all([app.geo.get(o.geo), loadBVH()]).then(() => {
            let r
            app.transact('Sculpt stroke', () => { r = scriptStroke(app, sessionFor(id), a, true) })
            return r
          })
        }
        return scriptStroke(app, sessionFor(id), a, true)
      }
    }
  },
  menus: {
    Sculpt: ['sculpt.mode', '-', ...BRUSHES.map(b => 'sculpt.' + b), '-', 'sculpt.radiusUp', 'sculpt.radiusDown', 'sculpt.strengthUp', 'sculpt.strengthDown', 'sculpt.invert', 'sculpt.symmetry', '-', 'sculpt.remesh', 'sculpt.subdivide'],
    Model: ['sculpt.mode', 'sculpt.remesh', 'sculpt.subdivide'],
    Context: ['sculpt.mode']
  },
  panels: [{
    id: 'sculpt', label: 'Sculpt', icon: 'sculpt', mode: 'sculpt', where: 'right', order: 5,
    render (el, app) { renderPanel(el, app) },
    refresh (el, app, ev) {
      if (ev && ev.type === 'change') {
        const id = targetId(), o = id && app.obj(id)
        if ((o ? o.geo : null) === lastPanelGeo) return
      }
      if (ev && ev.type === 'time') return
      renderPanel(el, app)
    }
  }],
  importers: [],
  exporters: [],
  types: {},
  init (app) {
    APP = app
    try {
      if (!document.getElementById('pl-sculpt')) { const st = document.createElement('style'); st.id = 'pl-sculpt'; st.textContent = CSS; document.head.append(st) }
    } catch {}
    ring = makeRing()
    styleRing()
    app.sculpt = {
      cfg, stats, BRUSHES,
      session: () => S,
      ring: () => ring && ring.g,
      reset () { Object.assign(stats, { steps: 0, total: 0, max: 0, last: 0, dabs: 0 }) },
      subdivide, remesh, weld
    }
    app.on('mode', () => {
      const m = modeId(app)
      if (m === 'sculpt' && !active) {
        active = true
        const t = toolId(app)
        if (!t || !String(t).startsWith('sculpt-')) app.setTool('sculpt-' + cfg.brush)
        retarget()
      } else if (m !== 'sculpt' && active) {
        onCancel()
        active = false
        hideRing()
        detach()
        const t = toolId(app)
        if (t && String(t).startsWith('sculpt-')) app.setTool('select')
      }
    })
    app.on('select', () => { if (active) retarget() })
    app.on('change', () => {
      if (!S) return
      const o = app.obj(S.id)
      if (!o || o.type !== 'mesh') { dropSession(); return }
      if (o.geo !== S.geoId && !stroke) { if (active) retarget(); else dropSession() }
    })
    app.on('synced', () => { if (active && S) attach() })
    app.on('render', () => { if (active && S && S.mesh && S.mesh.geometry !== S.geom) attach() })
    app.on('project', () => { stroke = null; dropSession(); active = modeId(app) === 'sculpt'; if (active) retarget() })
    app.on('viewport', () => { if (ring && ring.g.parent) ring.g.parent.remove(ring.g) })
  }
}
