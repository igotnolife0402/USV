// Mesh plugin: polygon primitives and a mesh edit mode (select, transform, extrude, inset, bevel,
// loop cut, subdivide, Catmull-Clark, merge, delete, fill, normals, shading, mirror X, knife).
// Geometry ops are pure functions on a working mesh {v: flat xyz, f: [[i...]], uv: flat uv | null}, in plugins/meshops.js.
import * as THREE from 'three'
import { addIcons, isPhone } from '../core/ui.js'
import { toBufferGeometry } from '../core/model.js'
import { toM, toGeo, V3, add, sub, mul, dot, cross, len, norm, lerp, ek, setV, centroid, fnormal, halfEdges, edgesOf, mergeDist, int, PRIM, regionBoundary, extrude, extrudeEdges, inset, bevel, loopCut, subdivide, catmull, mergeCenter, del, fill, flip, recalc, knife, mirrorMap, placeVerts } from './meshops.js'
export { toM, toGeo, signedVolume, mergeDist, PRIM, regionBoundary, extrude, extrudeEdges, inset, bevel, loopCut, subdivide, catmull, mergeCenter, del, fill, flip, recalc, knife } from './meshops.js'

addIcons({
  mcube: 'M3 5l5-3 5 3v6l-5 3-5-3z M3 5l5 3 5-3 M8 8v6',
  msphere: 'M8 2a6 6 0 1 0 0 12A6 6 0 1 0 8 2 M2 8h12 M8 2c-3 3-3 9 0 12 M8 2c3 3 3 9 0 12',
  mico: 'M8 2l5.5 3v6L8 14l-5.5-3V5z M8 2L5.5 9h5z M2.5 5l3 4 M13.5 5l-3 4 M5.5 9L8 14l2.5-5',
  mcyl: 'M3 4a5 2 0 1 0 10 0a5 2 0 1 0-10 0 M3 4v8a5 2 0 0 0 10 0V4',
  mcone: 'M8 2l5 10a5 2 0 0 1-10 0z',
  mtorus: 'M1.5 8a6.5 4 0 1 0 13 0a6.5 4 0 1 0-13 0 M5.5 8a2.5 1.2 0 1 0 5 0a2.5 1.2 0 1 0-5 0',
  mplane: 'M2 10l6-4 6 4-6 4z',
  mgrid: 'M2 10l6-4 6 4-6 4z M5 8l6 4 M11 8l-6 4',
  editmesh: 'M3 3h10v10H3z M3 3l10 10 M3 3h.01 M13 13h.01',
  vsel: 'M3 13L8 3l5 10z M2 12h2v2H2z M7 2h2v2H7z M12 12h2v2h-2z',
  esel: 'M3 13L8 3l5 10z M5 7.5l-1-.5 M8 3l5 10',
  fsel: 'M3 13L8 3l5 10z M6 11l2-4 2 4z',
  extrude: 'M3 9h10v5H3z M5 9V5h6v4 M8 5V1 M6 3l2-2 2 2',
  inset: 'M2 2h12v12H2z M5 5h6v6H5z M2 2l3 3 M14 2l-3 3 M2 14l3-3 M14 14l-3-3',
  bevel: 'M2 14V6l4-4h8 M2 6h4V2',
  loopcut: 'M2 3h12v10H2z M8 1v14',
  subdiv: 'M2 2h12v12H2z M8 2v12 M2 8h12',
  msmooth: 'M3 13c0-6 4-10 10-10 M3 13h10V3',
  merge: 'M3 3l5 5-5 5 M13 3l-5 5 5 5 M8 8h.01',
  fill: 'M3 13L8 3l5 10z M5 11l3-6 3 6',
  flip: 'M8 2v12 M5 5L8 2l3 3 M3 8h10 M5 11l3 3 3-3',
  knife: 'M2 14L12 4l2 2-8 8z M12 4l2-2',
  mirrorx: 'M8 1v14 M6 4L2 8l4 4z M10 4l4 4-4 4z',
  shade: 'M8 2a6 6 0 1 0 0 12z',
  mdel: 'M3 4h10 M6 4V2h4v2 M4 4l1 10h6l1-10',
  gmove: 'M8 1v14 M1 8h14 M8 1L6 3 M8 1l2 2 M8 15l-2-2 M8 15l2-2 M1 8l2-2 M1 8l2 2 M15 8l-2-2 M15 8l-2 2',
  grot: 'M13 8a5 5 0 1 1-2-4 M11 1v3h3',
  gscale: 'M2 14l5-5 M2 9v5h5 M9 2h5v5 M14 2L9 7'
})

const CMD = {}
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }

const PRIMS = [['cube', 'Cube mesh', 'mcube', false], ['uvsphere', 'UV sphere', 'msphere', true], ['icosphere', 'Ico sphere', 'mico', true], ['cylinder', 'Cylinder mesh', 'mcyl', true], ['cone', 'Cone mesh', 'mcone', true], ['torus', 'Torus', 'mtorus', true], ['plane', 'Plane mesh', 'mplane', false], ['grid', 'Grid mesh', 'mgrid', false]]
for (const [k, label, ic, smooth] of PRIMS) CMD['mesh.' + k] = {
  label, icon: ic,
  run(app, a = {}) {
    const m = PRIM[k](a)
    let lo = Infinity; for (let i = 1; i < m.v.length; i += 3) lo = Math.min(lo, m.v[i])
    const o = { type: 'mesh', geo: app.geo.put(toGeo(m)), name: a.name || label.replace(' mesh', ''), pos: a.pos || [0, -lo, 0], smooth: a.smooth ?? smooth }
    if (a.color) o.color = a.color
    const id = app.add(o); app.select([id]); return id
  }
}

// ---------- edit mode state ----------
const E = { app: null, id: null, geoId: null, m: null, sel: 'vert', sv: new Set(), se: new Set(), sf: new Set(), mirror: false, mm: null, knife: { pts: [], nrm: [] }, gmode: 'translate', opts: { extrude: 0.5, inset: 0.2, bevel: 0.2, segments: 1, cuts: 1, level: 1, merge: 0.01 } }
const curMode = app => app.mode ?? app.state?.mode
const editing = app => curMode(app) === 'mesh' && E.id && E.m
const meshTarget = app => (app.selection || []).find(id => ['mesh', 'part'].includes(app.obj(id)?.type))

async function enterEdit(app, id) {
  const o = app.obj(id)
  if (!o) return false
  if (o.type === 'part') { await app.run('parts.toMesh', { ids: [id] }) }
  const g = app.obj(id).geo, geo = app.geo.peek(g) || await app.geo.get(g)
  if (!geo) { app.toast?.('Mesh data not loaded', 'danger'); return false }
  E.id = id; E.geoId = g; E.m = toM(geo); E.sv.clear(); E.se.clear(); E.sf.clear()
  if (!app.selection?.includes(id)) app.select?.([id])
  if (curMode(app) !== 'mesh') { entering = true; try { app.setMode('mesh') } finally { entering = false } }
  refresh(app)
  return true
}
function exitEdit(app) {
  E.id = null; E.m = null; E.geoId = null
  clearOverlay(app)
  if (curMode(app) === 'mesh') app.setMode('build')
}
// Write the working mesh as a new immutable geo (call inside a command or transact: one undo step).
function commit(app, label = 'Edit mesh') {
  const write = () => { const g = app.geo.put(toGeo(E.m)); E.geoId = g; app.set(E.id, { geo: g }); return g }
  const g = app.transact ? app.transact(label, write) : write()
  refresh(app)
  return g
}

CMD['mesh.edit'] = {
  label: 'Edit mesh', icon: 'editmesh', key: 'Tab', noUndo: true, mode: 'mesh',
  checked: app => curMode(app) === 'mesh',
  enabled: (app, a = {}) => curMode(app) === 'mesh' || !!(a.id ? app.obj(a.id) : meshTarget(app)),
  async run(app, a = {}) {
    if (curMode(app) === 'mesh' && !a.id) { exitEdit(app); return null }
    const id = a.id || meshTarget(app)
    await enterEdit(app, id)
    return id
  }
}

// ---------- edit UI: selection ----------
const SELC = 0xffa23a, VERTC = 0xc3c8d1, EDGEC = 0x0e1014, KNIFEC = 0x3fb950
const fkey = f => f.slice().sort((a, b) => a - b).join(',')
const faceEdges = f => f.map((a, i) => ek(a, f[(i + 1) % f.length]))
const curSet = () => ({ vert: E.sv, edge: E.se, face: E.sf })[E.sel]
const clearSel = () => { E.sv.clear(); E.se.clear(); E.sf.clear() }
// Verts covered by the selection in any select mode.
function activeVerts() {
  const s = new Set()
  if (!E.m) return s
  if (E.sel === 'vert') for (const i of E.sv) s.add(i)
  else if (E.sel === 'edge') for (const k of E.se) for (const x of k.split('_')) s.add(+x)
  else for (const fi of E.sf) for (const x of E.m.f[fi] || []) s.add(x)
  return s
}
// Faces fully covered by the selection.
function activeFaces() {
  if (!E.m) return []
  if (E.sel === 'face') return [...E.sf].filter(fi => E.m.f[fi])
  const vs = activeVerts(), es = E.sel === 'edge' ? E.se : null
  return [...E.m.f.keys()].filter(fi => { const f = E.m.f[fi]; return es ? faceEdges(f).every(k => es.has(k)) : f.every(x => vs.has(x)) })
}
function activeEdges() {
  if (!E.m) return []
  const all = edgesOf(E.m)
  if (E.sel === 'edge') return [...E.se].filter(k => all.has(k))
  const out = new Set(), vs = activeVerts()
  if (E.sel === 'face') { for (const fi of E.sf) if (E.m.f[fi]) faceEdges(E.m.f[fi]).forEach(k => out.add(k)) } else for (const [k, [a, b]] of all) if (vs.has(a) && vs.has(b)) out.add(k)
  return [...out]
}
function setSel(kind, ids, add = false) {
  if (kind) E.sel = kind
  if (!add) clearSel()
  const S = curSet()
  for (const x of ids || []) S.add(E.sel === 'edge' ? (Array.isArray(x) ? ek(x[0], x[1]) : String(x)) : +x)
}
// Change the select mode, converting the selection.
function switchSel(kind) {
  if (kind === E.sel || !E.m) { E.sel = kind; return }
  const ids = kind === 'vert' ? [...activeVerts()] : kind === 'edge' ? activeEdges() : activeFaces()
  setSel(kind, ids)
}
function validateSel() {
  if (!E.m) return
  const n = E.m.v.length / 3, ed = edgesOf(E.m)
  for (const i of [...E.sv]) if (!(i < n)) E.sv.delete(i)
  for (const k of [...E.se]) if (!ed.has(k)) E.se.delete(k)
  for (const fi of [...E.sf]) if (!E.m.f[fi]) E.sf.delete(fi)
}
// With mirror X on, add the mirrored partners of the given elements.
function withMirror(kind, ids) {
  if (!E.mirror || !E.m) return ids
  const mm = mirrorMap(E.m), out = new Set(ids)
  if (kind === 'vert') for (const i of ids) { const j = mm.get(+i); if (j !== undefined) out.add(j) }
  else if (kind === 'edge') { const ed = edgesOf(E.m); for (const k of ids) { const [a, b] = String(k).split('_').map(Number), x = mm.get(a), y = mm.get(b); if (x !== undefined && y !== undefined && ed.has(ek(x, y))) out.add(ek(x, y)) } }
  else { const fk = new Map(E.m.f.map((f, i) => [fkey(f), i])); for (const fi of ids) { const g = (E.m.f[fi] || []).map(x => mm.get(x)); if (g.length && g.every(x => x !== undefined)) { const j = fk.get(fkey(g)); if (j !== undefined) out.add(j) } } }
  return [...out]
}

// ---------- overlay: verts as points, edges as lines, selected faces tinted ----------
let overlay = null
function lift(mat, amt) {
  mat.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n\tgl_Position.z -= ' + amt.toFixed(5) + ' * gl_Position.w;') }
  mat.customProgramCacheKey = () => 'meshlift' + amt
  return mat
}
function clearOverlay(app) { if (overlay) { overlay.removeFromParent(); overlay.traverse(o => { o.geometry?.dispose(); o.material?.dispose() }); overlay = null } app?.viewport?.requestRender() }
function drawOverlay(app) {
  clearOverlay(app)
  const vp = app.viewport
  if (!vp || !editing(app)) return
  const m = E.m, n = m.v.length / 3, vs = activeVerts(), g = new THREE.Group(), phone = isPhone()
  g.name = 'mesh-edit-overlay'; g.matrixAutoUpdate = false; g.matrix.copy(app.worldMatrix(E.id)); g.matrixWorldNeedsUpdate = true
  const cU = new THREE.Color(VERTC), cS = new THREE.Color(SELC), cE = new THREE.Color(EDGEC)
  const buf = (pos, col) => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (col) b.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return b }
  const ep = [], ec = [], es = E.sel === 'edge' ? E.se : null
  for (const [k, [a, b]] of edgesOf(m)) { const c = (es ? es.has(k) : vs.has(a) && vs.has(b)) ? cS : cE; ep.push(m.v[3 * a], m.v[3 * a + 1], m.v[3 * a + 2], m.v[3 * b], m.v[3 * b + 1], m.v[3 * b + 2]); ec.push(c.r, c.g, c.b, c.r, c.g, c.b) }
  g.add(new THREE.LineSegments(buf(ep, ec), lift(new THREE.LineBasicMaterial({ vertexColors: true }), 4e-4)))
  const vc = []; for (let i = 0; i < n; i++) { const c = vs.has(i) ? cS : cU; vc.push(c.r, c.g, c.b) }
  g.add(new THREE.Points(buf(m.v, vc), lift(new THREE.PointsMaterial({ size: E.sel === 'vert' ? (phone ? 9 : 6) : 3, sizeAttenuation: false, vertexColors: true }), 6e-4)))
  if (E.sel === 'face') {
    const fp = [], fc = []
    m.f.forEach((f, fi) => { fp.push(...centroid(m, f)); const c = E.sf.has(fi) ? cS : cU; fc.push(c.r, c.g, c.b) })
    g.add(new THREE.Points(buf(fp, fc), lift(new THREE.PointsMaterial({ size: phone ? 8 : 5, sizeAttenuation: false, vertexColors: true }), 6e-4)))
  }
  const fs = activeFaces()
  if (fs.length) {
    const tp = []
    for (const fi of fs) { const f = m.f[fi]; for (let k = 1; k + 1 < f.length; k++) tp.push(...V3(m, f[0]), ...V3(m, f[k]), ...V3(m, f[k + 1])) }
    g.add(new THREE.Mesh(buf(tp), new THREE.MeshBasicMaterial({ color: SELC, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })))
  }
  if (E.knife.pts.length) {
    const kp = E.knife.pts.flat()
    const ln = new THREE.Line(buf(kp), new THREE.LineBasicMaterial({ color: KNIFEC, depthTest: false }))
    const kd = new THREE.Points(buf(kp), new THREE.PointsMaterial({ color: KNIFEC, size: phone ? 10 : 7, sizeAttenuation: false, depthTest: false }))
    ln.renderOrder = kd.renderOrder = 10; g.add(ln, kd)
  }
  g.traverse(o => { o.userData.helper = true; o.raycast = () => {} })
  vp.helpers.add(g); overlay = g
  vp.requestRender()
}
function refresh(app) { if (E.mirror && E.m) E.mm = mirrorMap(E.m); drawOverlay(app); placeGizmo(app) }
const notify = app => app.ui?.refreshPanels?.()

// ---------- live display while dragging (swapped back before the commit) ----------
let live = null
function liveShow(app) {
  const o3 = app.viewport?.objects.get(E.id)
  if (o3?.isMesh) {
    if (!live) live = { geo: o3.geometry, key: o3.userData.geoKey }
    else if (o3.userData.geoKey === 'mesh-live') o3.geometry.dispose()
    o3.geometry = toBufferGeometry(toGeo(E.m), { smooth: app.obj(E.id)?.smooth })
    o3.userData.geoKey = 'mesh-live'
  }
  drawOverlay(app)
}
function liveEnd(app) {
  if (!live) return
  const o3 = app.viewport?.objects.get(E.id)
  if (o3 && o3.userData.geoKey === 'mesh-live') { o3.geometry.dispose(); o3.geometry = live.geo; o3.userData.geoKey = live.key }
  live = null
}

// ---------- picking in screen space ----------
function viewInfo(app) {
  const vp = app.viewport, cam = vp.camera, r = vp.canvas.getBoundingClientRect(), m = E.m, n = m.v.length / 3
  const W = app.worldMatrix(E.id), inv = W.clone().invert()
  cam.updateMatrixWorld()
  const PV = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).multiply(W), v = new THREE.Vector3()
  const proj = p => { v.set(p[0], p[1], p[2]).applyMatrix4(PV); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height] }
  const sx = new Float32Array(n), sy = new Float32Array(n)
  for (let i = 0; i < n; i++) { const p = proj(V3(m, i)); sx[i] = p[0]; sy[i] = p[1] }
  const he = halfEdges(m), closed = [...he.keys()].every(k => { const [a, b] = k.split(','); return he.has(b + ',' + a) })
  const camL = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld).applyMatrix4(inv)
  const dirL = cam.isOrthographicCamera ? new THREE.Vector3(0, 0, -1).transformDirection(cam.matrixWorld).transformDirection(inv) : null
  const front = new Uint8Array(m.f.length), vis = new Uint8Array(n)
  m.f.forEach((f, fi) => { const d = dirL ? [dirL.x, dirL.y, dirL.z] : sub(centroid(m, f), [camL.x, camL.y, camL.z]); if (!closed || dot(fnormal(m, f), d) < 0) { front[fi] = 1; for (const x of f) vis[x] = 1 } })
  return { vp, cam, W, inv, proj, sx, sy, he, front, vis }
}
// Is a local point hidden behind the displayed mesh?
function occludedP(I, pl) {
  const o3 = I.vp.objects.get(E.id)
  if (!o3) return false
  const P = new THREE.Vector3(pl[0], pl[1], pl[2]).applyMatrix4(I.W), nd = P.clone().project(I.cam), rc = new THREE.Raycaster()
  rc.setFromCamera(new THREE.Vector2(nd.x, nd.y), I.cam)
  const hit = rc.intersectObject(o3, !o3.isMesh)[0]
  if (!hit) return false
  const d = P.clone().sub(rc.ray.origin).dot(rc.ray.direction)
  return hit.distance < d - Math.max(1e-3, d * 2e-3)
}
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0; return [Math.hypot(px - ax - t * dx, py - ay - t * dy), t] }
// Nearest face hit by a world ray: {fi, p (local), n (local normal)}.
function rayFace(I, ray) {
  const r = ray.clone().applyMatrix4(I.inv), m = E.m, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), o = new THREE.Vector3()
  let best = null
  m.f.forEach((f, fi) => {
    a.fromArray(m.v, 3 * f[0])
    for (let k = 1; k + 1 < f.length; k++) { b.fromArray(m.v, 3 * f[k]); c.fromArray(m.v, 3 * f[k + 1]); const hp = r.intersectTriangle(a, b, c, false, o); if (hp) { const t = hp.distanceTo(r.origin); if (!best || t < best.t) best = { fi, t, p: [hp.x, hp.y, hp.z] } } }
  })
  if (best) best.n = fnormal(m, m.f[best.fi])
  return best
}
// The element under the pointer in the current select mode: {kind, id} or null.
function pickAt(app, cx, cy, ray) {
  if (!editing(app) || !app.viewport) return null
  const I = viewInfo(app), m = E.m, tol = isPhone() ? 24 : 12, c = []
  if (E.sel === 'vert') {
    for (let i = 0; i < I.sx.length; i++) if (I.vis[i]) { const d = Math.hypot(I.sx[i] - cx, I.sy[i] - cy); if (d < tol) c.push([d, i, V3(m, i)]) }
  } else if (E.sel === 'edge') {
    for (const [k, [a, b]] of edgesOf(m)) {
      const f1 = I.he.get(a + ',' + b), f2 = I.he.get(b + ',' + a)
      if (!((f1 !== undefined && I.front[f1]) || (f2 !== undefined && I.front[f2]))) continue
      const [d, t] = segDist(cx, cy, I.sx[a], I.sy[a], I.sx[b], I.sy[b])
      if (d < tol * 0.8) c.push([d, k, lerp(V3(m, a), V3(m, b), t)])
    }
  } else { const hit = rayFace(I, ray || I.vp.ray(cx, cy)); return hit ? { kind: 'face', id: hit.fi, hit } : null }
  c.sort((p, q) => p[0] - q[0])
  for (const [, id, p] of c.slice(0, 8)) if (!occludedP(I, p)) return { kind: E.sel, id }
  return null
}
function clickSelect(app, cx, cy, ray, add) {
  const p = pickAt(app, cx, cy, ray), S = curSet()
  if (!p) { if (!add) clearSel() } else if (add) { S.has(p.id) ? S.delete(p.id) : S.add(p.id) } else { clearSel(); S.add(p.id) }
  refresh(app); notify(app)
  return p
}
function boxSelect(app, x0, y0, x1, y1, add) {
  if (!editing(app)) return 0
  const I = viewInfo(app), m = E.m, lx = Math.min(x0, x1), hx = Math.max(x0, x1), ly = Math.min(y0, y1), hy = Math.max(y0, y1)
  const inP = p => p[0] >= lx && p[0] <= hx && p[1] >= ly && p[1] <= hy, inV = i => inP([I.sx[i], I.sy[i]])
  let ids = []
  if (E.sel === 'vert') { for (let i = 0; i < I.sx.length; i++) if (I.vis[i] && inV(i)) ids.push([i, V3(m, i)]) }
  else if (E.sel === 'edge') { for (const [k, [a, b]] of edgesOf(m)) if (I.vis[a] && I.vis[b] && inV(a) && inV(b)) ids.push([k, lerp(V3(m, a), V3(m, b), 0.5)]) }
  else m.f.forEach((f, fi) => { const c = centroid(m, f); if (I.front[fi] && inP(I.proj(c))) ids.push([fi, c]) })
  if (ids.length <= 3000) ids = ids.filter(([, p]) => !occludedP(I, p))
  setSel(null, ids.map(x => x[0]), add)
  refresh(app); notify(app)
  return ids.length
}

// ---------- tools: select (click, shift-add, box) and knife ----------
let drag = null, lastPtr = null
const selectTool = {
  id: 'mesh-select', label: 'Select elements', short: 'Select', icon: 'vsel', mode: 'mesh', order: 1,
  onDown(ev, app) {
    if (!editing(app)) return false
    const touch = ev.pointerType === 'touch'
    if (touch && !pickAt(app, ev.clientX, ev.clientY, ev.ray)) return false // a finger on empty space orbits
    drag = { x: ev.clientX, y: ev.clientY, add: ev.shift || ev.ctrl || touch, touch, box: null }
    return true
  },
  onMove(ev) {
    if (!drag) return
    if (!drag.box) { if (drag.touch || Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 4) return; drag.box = document.body.appendChild(h('div', 'mesh-box')) }
    const s = drag.box.style
    s.left = Math.min(drag.x, ev.clientX) + 'px'; s.top = Math.min(drag.y, ev.clientY) + 'px'; s.width = Math.abs(ev.clientX - drag.x) + 'px'; s.height = Math.abs(ev.clientY - drag.y) + 'px'
  },
  onUp(ev, app) {
    const d = drag; drag = null
    if (!d) return
    if (d.box) { d.box.remove(); boxSelect(app, d.x, d.y, ev.clientX, ev.clientY, d.add) } else clickSelect(app, d.x, d.y, null, d.add)
  },
  onCancel() { drag?.box?.remove(); drag = null }
}
const knifeTool = {
  id: 'mesh-knife', label: 'Knife', icon: 'knife', mode: 'mesh', order: 2,
  onActivate(app) { E.knife = { pts: [], nrm: [] }; refresh(app); notify(app) },
  onDeactivate(app) { E.knife = { pts: [], nrm: [] }; refresh(app); notify(app) },
  onDown(ev, app) {
    if (!editing(app)) return false
    const I = viewInfo(app), hit = rayFace(I, ev.ray)
    if (!hit) return ev.pointerType !== 'touch'
    let p = hit.p, best = isPhone() ? 18 : 9
    const f = E.m.f[hit.fi]
    for (const i of f) { const d = Math.hypot(I.sx[i] - ev.clientX, I.sy[i] - ev.clientY); if (d < best) { best = d; p = V3(E.m, i) } }
    if (p === hit.p) f.forEach((a, k) => { const b = f[(k + 1) % f.length], [d, t] = segDist(ev.clientX, ev.clientY, I.sx[a], I.sy[a], I.sx[b], I.sy[b]); if (d < best) { best = d; p = lerp(V3(E.m, a), V3(E.m, b), t) } }) // snap to the nearest edge
    E.knife.pts.push(p); E.knife.nrm.push(hit.n)
    drawOverlay(app); notify(app)
    return true
  }
}

// ---------- gizmo on a proxy at the selection centre ----------
let proxy = null, gzHooked = false, gz = null
const GZT = { 'mesh-move': 'translate', 'mesh-rotate': 'rotate', 'mesh-scale': 'scale' }
function placeGizmo(app) {
  const vp = app.viewport, tc = vp?.gizmo
  if (!tc) return
  const vs = editing(app) && !modal ? activeVerts() : new Set()
  if (!vs.size || !GZT[app.tool]) {
    if (tc.object && (tc.object === proxy || curMode(app) === 'mesh')) tc.detach()
    vp.requestRender(); return
  }
  if (!proxy) { proxy = new THREE.Object3D(); proxy.name = 'mesh-pivot'; proxy.userData.helper = true }
  if (proxy.parent !== vp.helpers) vp.helpers.add(proxy)
  hookGizmo(app, tc)
  if (!gz) { const c = centroid(E.m, [...vs]); proxy.position.set(c[0], c[1], c[2]).applyMatrix4(app.worldMatrix(E.id)); proxy.quaternion.identity(); proxy.scale.set(1, 1, 1); proxy.updateMatrixWorld(true) }
  if (tc.object !== proxy) tc.attach(proxy)
  if (tc.mode !== GZT[app.tool]) tc.setMode(GZT[app.tool])
  vp.requestRender()
}
function hookGizmo(app, tc) {
  if (gzHooked) return
  gzHooked = true
  tc.addEventListener('mouseDown', () => {
    if (tc.object !== proxy || !editing(app)) return
    proxy.updateMatrixWorld(true)
    const W = app.worldMatrix(E.id)
    gz = { base: new Map([...activeVerts()].map(i => [i, V3(E.m, i)])), start: proxy.matrixWorld.clone().invert(), W, inv: W.clone().invert(), snap: E.m.v.slice(), moved: false }
  })
  tc.addEventListener('objectChange', () => {
    if (!gz || tc.object !== proxy) return
    proxy.updateMatrixWorld(true)
    const L = gz.inv.clone().multiply(proxy.matrixWorld).multiply(gz.start).multiply(gz.W), v = new THREE.Vector3(), pos = new Map()
    for (const [i, p] of gz.base) { v.set(p[0], p[1], p[2]).applyMatrix4(L); pos.set(i, [v.x, v.y, v.z]) }
    E.m.v = gz.snap.slice()
    placeVerts(E.m, pos, E.mirror, E.mm || mirrorMap(E.m))
    gz.moved = true
    liveShow(app)
  })
  tc.addEventListener('mouseUp', () => {
    const g = gz; gz = null
    if (!g || tc.object !== proxy) return
    liveEnd(app)
    if (g.moved) commit(app, { translate: 'Move vertices', rotate: 'Rotate vertices', scale: 'Scale vertices' }[tc.mode] || 'Transform vertices'); else refresh(app)
    notify(app)
  })
}

// ---------- modal drag (extrude along the normal): move to set, click or release to confirm ----------
let modal = null
function hint(app, text) {
  let el = app.viewport?.el?.querySelector('.mesh-hint')
  if (!text) { el?.remove(); return }
  if (!el && app.viewport?.el) el = app.viewport.el.appendChild(h('div', 'mesh-hint'))
  if (el) el.textContent = text
}
function startModal(app, o) {
  const I = viewInfo(app), p0 = I.proj(o.center), p1 = I.proj(add(o.center, o.normal))
  let ax = [p1[0] - p0[0], p1[1] - p0[1]]
  if (Math.hypot(ax[0], ax[1]) < 3) ax = [0, -80]
  const L2 = ax[0] * ax[0] + ax[1] * ax[1], base = E.m.v.slice(), tip = isPhone() ? 'drag, then lift to confirm' : 'move, click to confirm, right-click to cancel'
  const st = modal = { start: lastPtr ? [lastPtr.x, lastPtr.y] : p0, d: 0, touch: false }
  const setD = (x, y) => {
    st.d = ((x - st.start[0]) * ax[0] + (y - st.start[1]) * ax[1]) / L2
    E.m.v = base.slice()
    for (const [i, dir] of o.dirs) setV(E.m, i, add(V3(E.m, i), mul(dir, st.d)))
    liveShow(app); hint(app, o.label + ' ' + st.d.toFixed(2) + ' · ' + tip)
  }
  const stop = e => { e.preventDefault(); e.stopPropagation() }
  const finish = ok => {
    removeEventListener('pointermove', mv, true); removeEventListener('pointerdown', dn, true); removeEventListener('pointerup', up, true); removeEventListener('keydown', key, true)
    modal = null; hint(app, null); liveEnd(app)
    if (ok) commit(app, o.label); else { E.m = o.undo; refresh(app) }
    notify(app)
  }
  const mv = e => { if (st.touch || e.pointerType !== 'touch') setD(e.clientX, e.clientY) }
  const dn = e => { stop(e); if (e.pointerType === 'touch') { st.touch = true; st.start = [e.clientX, e.clientY]; return } finish(e.button !== 2) }
  const up = e => { if (st.touch) { stop(e); finish(true) } }
  const key = e => { if (e.key === 'Escape') { stop(e); finish(false) } else if (e.key === 'Enter') { stop(e); finish(true) } }
  addEventListener('pointermove', mv, true); addEventListener('pointerdown', dn, true); addEventListener('pointerup', up, true); addEventListener('keydown', key, true)
  st.finish = finish
  liveShow(app); placeGizmo(app); hint(app, o.label + ' 0.00 · ' + tip)
  return st
}

// ---------- commands: pass {id} plus explicit verts/edges/faces (AIs, tests), or use the current selection ----------
function ensure(app, a = {}) {
  const id = a.id || E.id, o = id && app.obj(id)
  if (!o || o.type !== 'mesh') throw new Error('Select a mesh to edit')
  if (id !== E.id || !E.m || o.geo !== E.geoId) {
    const geo = app.geo.peek(o.geo)
    if (!geo) throw new Error('Mesh data not loaded')
    if (id !== E.id) clearSel()
    E.id = id; E.geoId = o.geo; E.m = toM(geo); validateSel()
  }
  return E.m
}
const edgeKeys = list => list.map(e => Array.isArray(e) ? ek(+e[0], +e[1]) : String(e))
const argVerts = a => withMirror('vert', a.verts ? a.verts.map(Number) : [...activeVerts()])
const argFaces = a => withMirror('face', a.faces ? a.faces.map(Number) : activeFaces())
const argEdges = a => withMirror('edge', a.edges ? edgeKeys(a.edges) : activeEdges())
const need = (x, what) => { if (!x.length) throw new Error('Select ' + what + ' first'); return x }
const avail = (app, a = {}) => !!a.id || !!editing(app)
const def = (id, o) => { CMD[id] = { mode: 'mesh', enabled: avail, ...o } }
const stats = g => ({ geo: g, verts: E.m.v.length / 3, faces: E.m.f.length })
function done(app, label, kind, ids) {
  if (kind) setSel(kind, ids); else clearSel()
  validateSel()
  const g = commit(app, label); notify(app)
  return stats(g)
}
const shown = app => { refresh(app); notify(app); return [...curSet()] }
function camLocal(app) {
  const cam = app.viewport?.camera
  if (!cam) return [0, 1e3, 0]
  const v = cam.position.clone().applyMatrix4(app.worldMatrix(E.id).clone().invert()); return [v.x, v.y, v.z]
}
function linked(m, seeds) {
  const adj = new Map(), link = (a, b) => (adj.get(a) || adj.set(a, []).get(a)).push(b)
  for (const f of m.f) f.forEach((a, k) => { const b = f[(k + 1) % f.length]; link(a, b); link(b, a) })
  const seen = new Set(seeds), st = [...seeds]
  while (st.length) for (const y of adj.get(st.pop()) || []) if (!seen.has(y)) { seen.add(y); st.push(y) }
  return seen
}
const allOf = kind => kind === 'vert' ? [...Array(E.m.v.length / 3).keys()] : kind === 'edge' ? [...edgesOf(E.m).keys()] : [...E.m.f.keys()]
const ofVerts = (kind, vs) => kind === 'vert' ? [...vs] : kind === 'edge' ? [...edgesOf(E.m)].filter(([, [a, b]]) => vs.has(a) && vs.has(b)).map(([k]) => k) : [...E.m.f.keys()].filter(fi => E.m.f[fi].every(x => vs.has(x)))

// selection
for (const [k, label, icon, key] of [['vert', 'Vertex select', 'vsel', '1'], ['edge', 'Edge select', 'esel', '2'], ['face', 'Face select', 'fsel', '3']]) {
  def('mesh.sel' + k[0].toUpperCase() + k.slice(1), { label, icon, key, noUndo: true, checked: app => !!editing(app) && E.sel === k, run(app, a = {}) { ensure(app, a); switchSel(k); shown(app); return k } })
}
def('mesh.select', {
  label: 'Select elements', icon: 'vsel', noUndo: true,
  run(app, a = {}) {
    ensure(app, a)
    const kind = a.mode || (a.faces ? 'face' : a.edges ? 'edge' : a.verts ? 'vert' : E.sel)
    setSel(kind, (kind === 'face' ? a.faces : kind === 'edge' ? a.edges : a.verts) || [], !!a.add); validateSel()
    return shown(app)
  }
})
def('mesh.selectAll', { label: 'Select all elements', icon: 'vsel', key: 'A', noUndo: true, run(app, a = {}) { ensure(app, a); setSel(E.sel, allOf(E.sel)); return shown(app).length } })
def('mesh.deselectAll', { label: 'Deselect all elements', icon: 'vsel', key: 'Alt+A', noUndo: true, run(app, a = {}) { ensure(app, a); clearSel(); return shown(app).length } })
def('mesh.selectLinked', {
  label: 'Select linked', icon: 'fsel', key: 'L', noUndo: true,
  run(app, a = {}) { ensure(app, a); const seeds = a.verts ? a.verts.map(Number) : [...activeVerts()]; setSel(E.sel, ofVerts(E.sel, linked(E.m, need(seeds, 'an element')))); return shown(app).length }
})

// extrude: with no args from a key or button, drag along the normal; {dist} applies at once
def('mesh.extrude', {
  label: 'Extrude', icon: 'extrude', key: 'E',
  run(app, a = {}) {
    ensure(app, a)
    const interactive = !Object.keys(a).length && !!editing(app) && !modal
    const dist = interactive ? 0 : +(a.dist ?? E.opts.extrude), undo = interactive ? toM(toGeo(E.m)) : null
    const faces = a.faces ? argFaces(a) : a.edges ? [] : argFaces({})
    let r, kind
    if (faces.length) { r = extrude(E.m, faces, dist); kind = 'face' } else { r = extrudeEdges(E.m, need(argEdges(a), 'faces or edges'), dist); kind = 'edge' }
    const sk = E.sel === 'vert' ? 'vert' : kind, ids = sk === 'vert' ? r.verts : kind === 'face' ? r.faces : r.edges
    if (!interactive) return done(app, 'Extrude', sk, ids)
    setSel(sk, ids); validateSel()
    let n = [0, 0, 0]; for (const d of r.dirs.values()) n = add(n, d)
    n = len(n) > 1e-9 ? norm(n) : [0, 1, 0]
    startModal(app, { label: 'Extrude', dirs: r.dirs, center: centroid(E.m, r.verts), normal: n, undo })
    notify(app)
    return { modal: true, faces: E.m.f.length }
  }
})
def('mesh.inset', {
  label: 'Inset faces', icon: 'inset', key: 'I',
  run(app, a = {}) { ensure(app, a); const r = inset(E.m, need(argFaces(a), 'faces'), +(a.amount ?? E.opts.inset)); return done(app, 'Inset faces', E.sel === 'vert' ? null : 'face', r) }
})
def('mesh.bevel', {
  label: 'Bevel', icon: 'bevel', key: 'Ctrl+B',
  run(app, a = {}) {
    ensure(app, a)
    const edges = a.edges ? argEdges(a) : a.faces ? regionBoundary(E.m, argFaces(a)) : E.sel === 'face' ? regionBoundary(E.m, argFaces({})) : argEdges({})
    const n = bevel(E.m, need(edges, 'edges or faces'), +(a.width ?? E.opts.bevel), int(a.segments, E.opts.segments, 1, 16))
    if (!n) throw new Error('Bevel needs edges shared by two faces')
    return done(app, 'Bevel', null)
  }
})
def('mesh.loopcut', {
  label: 'Loop cut', icon: 'loopcut', key: 'Ctrl+R',
  run(app, a = {}) {
    ensure(app, a)
    let e = a.edge ? edgeKeys([a.edge])[0] : activeEdges()[0]
    if (!e && lastPtr && editing(app)) { const p = pickAt(app, lastPtr.x, lastPtr.y, null); if (p?.kind === 'edge') e = p.id }
    if (!e) throw new Error('Pick an edge to cut across')
    const [x, y] = String(e).split('_').map(Number), r = loopCut(E.m, x, y, int(a.cuts, E.opts.cuts, 1, 32))
    if (!r.length) throw new Error('Loop cut needs an edge between quads')
    return done(app, 'Loop cut', 'edge', r)
  }
})
def('mesh.subdivide', {
  label: 'Subdivide', icon: 'subdiv',
  run(app, a = {}) { ensure(app, a); const f = argFaces(a); subdivide(E.m, f.length ? f : [...E.m.f.keys()]); return done(app, 'Subdivide', null) }
})
def('mesh.smooth', {
  label: 'Subdivision smooth', icon: 'msmooth',
  run(app, a = {}) { ensure(app, a); catmull(E.m, int(a.level, E.opts.level, 1, 2)); return done(app, 'Subdivision smooth', null) }
})
def('mesh.mergeDist', {
  label: 'Merge by distance', icon: 'merge', key: 'M',
  run(app, a = {}) { ensure(app, a); const vs = argVerts(a), n = mergeDist(E.m, +(a.dist ?? E.opts.merge), vs.length > 1 ? new Set(vs) : null); const r = done(app, 'Merge by distance', null); app.toast?.(n + ' vertices merged'); return { ...r, removed: n } }
})
def('mesh.mergeCenter', {
  label: 'Merge at center', icon: 'merge', key: 'Alt+M',
  run(app, a = {}) { ensure(app, a); const k = mergeCenter(E.m, argVerts(a)); if (k < 0) throw new Error('Select 2 or more vertices'); return done(app, 'Merge at center', 'vert', [k]) }
})
def('mesh.delete', {
  label: 'Delete elements', icon: 'mdel', key: ['X', 'Delete', 'Backspace'],
  run(app, a = {}) {
    ensure(app, a)
    const what = a.what || (a.faces ? 'face' : a.edges ? 'edge' : a.verts ? 'vert' : E.sel)
    del(E.m, what, need(what === 'face' ? argFaces(a) : what === 'edge' ? argEdges(a) : argVerts(a), 'elements'))
    return done(app, 'Delete elements', null)
  }
})
def('mesh.fill', {
  label: 'Fill', icon: 'fill', key: 'F',
  run(app, a = {}) { ensure(app, a); const fi = fill(E.m, argVerts(a)); if (fi < 0) throw new Error('Select 3 or more open-edge vertices'); return done(app, 'Fill', E.sel === 'face' ? 'face' : null, [fi]) }
})
def('mesh.flip', {
  label: 'Flip normals', icon: 'flip',
  run(app, a = {}) { ensure(app, a); const f = argFaces(a); flip(E.m, f.length ? f : [...E.m.f.keys()]); return done(app, 'Flip normals', E.sel === 'face' ? 'face' : null, f) }
})
def('mesh.recalc', { label: 'Recalculate normals outside', icon: 'flip', key: 'Shift+N', run(app, a = {}) { ensure(app, a); recalc(E.m); return done(app, 'Recalculate normals', null) } })
for (const [k, label, on] of [['shadeSmooth', 'Shade smooth', true], ['shadeFlat', 'Shade flat', false]]) {
  def('mesh.' + k, { label, icon: 'shade', checked: app => !!E.id && !!app.obj(E.id)?.smooth === on, run(app, a = {}) { ensure(app, a); app.set(E.id, { smooth: on }); notify(app); return on } })
}
def('mesh.mirrorX', { label: 'Mirror X editing', icon: 'mirrorx', noUndo: true, checked: () => E.mirror, run(app, a = {}) { ensure(app, a); E.mirror = a.on ?? !E.mirror; E.mm = null; refresh(app); notify(app); return E.mirror } })

// knife: K starts the tool (click points, Enter cuts); {points:[[x,y,z],…], normal?} cuts at once
function knifeCut(app, pts, normal) {
  if (pts.length < 2) throw new Error('Knife needs 2 or more points')
  const n = normal || norm(sub(camLocal(app), centroid({ v: pts.flat() }, pts.map((_, i) => i))))
  const cut = knife(E.m, pts, n)
  if (!cut) throw new Error('Knife line does not cross the mesh')
  E.knife = { pts: [], nrm: [] }
  const r = done(app, 'Knife', null)
  return { ...r, cut }
}
def('mesh.knife', {
  label: 'Knife', icon: 'knife', key: 'K',
  run(app, a = {}) { ensure(app, a); if (a.points) return knifeCut(app, a.points, a.normal); app.setTool('mesh-knife'); return null }
})
def('mesh.knifeApply', {
  label: 'Apply knife cut', icon: 'knife', key: 'Enter',
  enabled: (app, a = {}) => avail(app, a) && E.knife.pts.length > 1,
  run(app) { ensure(app); const r = knifeCut(app, E.knife.pts); if (app.tool === 'mesh-knife') app.setTool('mesh-select'); return r }
})

// numeric transform in the mesh's own space: {verts?, move:[x,y,z], rotate:[x,y,z] deg, scale: n | [x,y,z], center?}
def('mesh.transform', {
  label: 'Transform vertices', icon: 'gmove',
  run(app, a = {}) {
    ensure(app, a)
    const vs = need(a.verts ? a.verts.map(Number) : [...activeVerts()], 'vertices'), c = a.center || centroid(E.m, vs), mv = a.move || [0, 0, 0]
    const s = typeof a.scale === 'number' ? [a.scale, a.scale, a.scale] : a.scale || [1, 1, 1], r = (a.rotate || [0, 0, 0]).map(x => x * Math.PI / 180)
    const M = new THREE.Matrix4().compose(new THREE.Vector3(c[0] + mv[0], c[1] + mv[1], c[2] + mv[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2])), new THREE.Vector3(s[0], s[1], s[2])).multiply(new THREE.Matrix4().makeTranslation(-c[0], -c[1], -c[2]))
    const v = new THREE.Vector3(), pos = new Map()
    for (const i of vs) { v.set(...V3(E.m, i)).applyMatrix4(M); pos.set(i, [v.x, v.y, v.z]) }
    placeVerts(E.m, pos, E.mirror, mirrorMap(E.m))
    const g = commit(app, 'Transform vertices'); notify(app)
    return stats(g)
  }
})
for (const [k, label, icon, key, gm] of [['gMove', 'Move elements', 'gmove', 'G', 'move'], ['gRotate', 'Rotate elements', 'grot', 'R', 'rotate'], ['gScale', 'Scale elements', 'gscale', 'S', 'scale']]) {
  def('mesh.' + k, { label, icon, key, noUndo: true, checked: app => !!editing(app) && app.tool === 'mesh-' + gm, run(app) { app.setTool('mesh-' + gm); return gm } })
}

// ---------- gizmo tools: select-like tools that also show the move / rotate / scale gizmo ----------
const gizmoTool = (id, label, icon, order) => ({ ...selectTool, id, label, icon, order, onActivate(app) { refresh(app); notify(app) } })
const moveTool = gizmoTool('mesh-move', 'Move', 'gmove', 1.1), rotateTool = gizmoTool('mesh-rotate', 'Rotate', 'grot', 1.2), scaleTool = gizmoTool('mesh-scale', 'Scale', 'gscale', 1.3)
knifeTool.order = 2

// ---------- panel ----------
const OPS = [
  ['mesh.extrude', 'Extrude', () => ({ dist: E.opts.extrude })], ['mesh.inset', 'Inset', () => ({ amount: E.opts.inset })], ['mesh.bevel', 'Bevel', () => ({ width: E.opts.bevel, segments: E.opts.segments })], ['mesh.loopcut', 'Loop cut', () => ({ cuts: E.opts.cuts })],
  ['mesh.subdivide', 'Subdivide'], ['mesh.smooth', 'Smooth', () => ({ level: E.opts.level })], ['mesh.knife', 'Knife'], ['mesh.fill', 'Fill'],
  ['mesh.mergeDist', 'Merge', () => ({ dist: E.opts.merge })], ['mesh.mergeCenter', 'To centre'], ['mesh.delete', 'Delete'], ['mesh.mirrorX', 'Mirror X'],
  ['mesh.flip', 'Flip'], ['mesh.recalc', 'Outside'], ['mesh.shadeSmooth', 'Smooth sh.'], ['mesh.shadeFlat', 'Flat sh.']
]
const OPTS = [['extrude', 'Extrude', 0.1], ['inset', 'Inset', 0.05, 0], ['bevel', 'Bevel', 0.05, 0], ['segments', 'Segments', 1, 1], ['cuts', 'Cuts', 1, 1], ['level', 'Smooth lvl', 1, 1], ['merge', 'Merge dist', 0.01, 0]]
const num = (cls, step, value) => { const i = h('input', 'mesh-num' + (cls ? ' ' + cls : '')); i.type = 'number'; i.step = step; i.value = value; return i }
const panel = {
  id: 'mesh-edit', label: 'Mesh edit', icon: 'editmesh', mode: 'mesh', where: 'right', order: 5,
  render(el, app) {
    const ic = n => app.ui.icon(n), cmd = id => app.commands.get(id), keyOf = c => c.key ? ' (' + [].concat(c.key)[0] + ')' : ''
    const seg = h('div', 'mesh-seg')
    for (const [k, id, label] of [['vert', 'mesh.selVert', 'Vertex'], ['edge', 'mesh.selEdge', 'Edge'], ['face', 'mesh.selFace', 'Face']]) {
      const b = h('button', '', ic(cmd(id).icon) + '<span>' + label + '</span>'); b.dataset.cmd = id; b.dataset.k = k; b.title = cmd(id).label + keyOf(cmd(id)); seg.appendChild(b)
    }
    seg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) app.exec(b.dataset.cmd) })
    const info = h('div', 'mesh-info')
    const xyz = h('div', 'mesh-xyz', '<span></span><b class="x">X</b><b class="y">Y</b><b class="z">Z</b>')
    const row = (label, kind, step, v) => { xyz.appendChild(h('span', '', label)); return [0, 1, 2].map(i => { const inp = num('', step, v); inp.dataset.kind = kind; inp.dataset.i = i; inp.setAttribute('aria-label', label + ' ' + 'XYZ'[i]); xyz.appendChild(inp); return inp }) }
    const med = row('Median', 'move', 0.1, ''), rot = row('Rotate°', 'rotate', 15, 0), scl = row('Scale', 'scale', 0.1, 1)
    xyz.addEventListener('change', e => {
      const inp = e.target.closest('input'), v = parseFloat(inp?.value)
      if (!inp || !isFinite(v) || !E.m) { el._upd(); return }
      const kind = inp.dataset.kind, i = +inp.dataset.i, vec = kind === 'scale' ? [1, 1, 1] : [0, 0, 0]
      if (kind === 'move') vec[i] = v - centroid(E.m, [...activeVerts()])[i]; else { vec[i] = v; inp.value = kind === 'scale' ? 1 : 0 }
      app.exec('mesh.transform', { [kind]: vec }); el._upd()
    })
    const ops = h('div', 'mesh-ops'), argOf = new Map()
    for (const [id, label, args] of OPS) {
      const c = cmd(id), b = h('button', 'mesh-op', ic(c.icon) + '<span>' + label + '</span>'); b.dataset.cmd = id; b.title = c.label + keyOf(c); argOf.set(id, args); ops.appendChild(b)
    }
    ops.addEventListener('click', e => { const b = e.target.closest('button'); if (b) app.exec(b.dataset.cmd, argOf.get(b.dataset.cmd)?.()) })
    const opts = h('div', 'mesh-opts')
    for (const [k, label, step, min] of OPTS) {
      const l = h('label', '', '<span>' + label + '</span>'), inp = num('', step, E.opts[k]); if (min !== undefined) inp.min = min
      inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (isFinite(v)) E.opts[k] = min !== undefined ? Math.max(min, v) : v; inp.value = E.opts[k] })
      l.appendChild(inp); opts.appendChild(l)
    }
    const kn = h('div', 'mesh-kn', '<span></span>'), apply = h('button', 'mesh-op mesh-go', ic('knife') + '<span>Cut</span>'), cancel = h('button', 'mesh-op', ic('close') + '<span>Cancel</span>')
    apply.addEventListener('click', () => app.exec('mesh.knifeApply')); cancel.addEventListener('click', () => app.setTool('mesh-select'))
    kn.append(apply, cancel)
    el.append(seg, info, kn, h('div', 'pg-h', 'Selection'), xyz, h('div', 'pg-h', 'Operations'), ops, h('div', 'pg-h', 'Settings'), opts)
    el._upd = () => {
      if (!E.m) return
      for (const b of seg.children) b.classList.toggle('on', b.dataset.k === E.sel)
      const vs = activeVerts(), c = vs.size ? centroid(E.m, [...vs]) : null
      info.textContent = `${E.m.v.length / 3} verts · ${E.m.f.length} faces · ${curSet().size} selected`
      med.forEach((inp, i) => { inp.disabled = !c; if (document.activeElement !== inp) inp.value = c ? +c[i].toFixed(3) : '' })
      for (const inp of [...rot, ...scl]) inp.disabled = !c
      for (const b of ops.children) { let on = false; try { on = !!cmd(b.dataset.cmd).checked?.(app) } catch {} b.classList.toggle('on', on) }
      kn.hidden = app.tool !== 'mesh-knife'
      kn.firstChild.textContent = 'Knife: ' + E.knife.pts.length + ' points' + (E.knife.pts.length < 2 ? ' · tap the mesh' : '')
      apply.disabled = E.knife.pts.length < 2
    }
    el._upd()
  },
  refresh(el, app, ev) { if (ev?.type !== 'time') el._upd?.() }
}

const CSS = `.mesh-box{position:fixed;border:1px dashed var(--accent);background:rgba(61,139,253,.08);pointer-events:none;z-index:60}
.mesh-hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:rgba(23,25,29,.92);border:1px solid var(--line);border-radius:var(--r);padding:6px 10px;font:12px/1.3 'JetBrains Mono',monospace;color:var(--text);pointer-events:none;z-index:5;white-space:nowrap}
.mesh-seg{display:flex;gap:2px;background:var(--field);border:1px solid var(--line);border-radius:var(--r);padding:2px}
.mesh-seg button{flex:1;height:calc(var(--h) - 4px);display:flex;align-items:center;justify-content:center;gap:6px;border-radius:4px;color:var(--mute);font-size:12px}
.mesh-seg button.on{background:var(--panel2);color:var(--text);box-shadow:inset 0 0 0 1px var(--select)}
.mesh-seg .ic,.mesh-op .ic{width:16px;height:16px}
.mesh-info{font:11px 'JetBrains Mono',monospace;color:var(--mute);margin:7px 0 2px}
.mesh-xyz{display:grid;grid-template-columns:56px repeat(3,minmax(0,1fr));gap:4px;align-items:center}
.mesh-xyz>span{font-size:11px;color:var(--mute)}
.mesh-xyz b{font:600 11px Inter,sans-serif;text-align:center}.mesh-xyz .x{color:#e5484d}.mesh-xyz .y{color:#3fb950}.mesh-xyz .z{color:#3d8bfd}
.mesh-num{height:var(--h);min-width:0;width:100%;background:var(--field);border:1px solid var(--line);border-radius:var(--r);color:var(--text);font:12px 'JetBrains Mono',monospace;padding:0 6px}
.mesh-num:focus{border-color:var(--accent);outline:none}.mesh-num:disabled{opacity:.45}
.mesh-ops{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
.mesh-op{height:calc(var(--h) + 18px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:var(--r);background:var(--panel2);border:1px solid var(--line);font-size:11px;color:#c5cad3;white-space:nowrap;overflow:hidden}
.mesh-op:hover{border-color:var(--accent);color:var(--text)}.mesh-op.on{border-color:var(--select);color:var(--text)}.mesh-op:disabled{opacity:.4;pointer-events:none}
.mesh-opts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 8px}
.mesh-opts label{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--mute)}.mesh-opts label span{width:60px;flex:none}
.mesh-kn{display:grid;grid-template-columns:1fr 70px 70px;gap:4px;align-items:center;margin:8px 0 2px;font-size:12px;color:#3fb950}.mesh-kn[hidden]{display:none}
.mesh-go{border-color:#3fb950}`

// ---------- wiring ----------
let entering = false
function resetEdit(app) {
  liveEnd(app); modal?.finish(false); clearOverlay(app)
  const tc = app.viewport?.gizmo
  if (tc && proxy && tc.object === proxy) tc.detach()
  E.id = E.m = E.geoId = null; E.mm = null; clearSel(); E.knife = { pts: [], nrm: [] }
  app.viewport?.requestRender()
}
const TOOLMAP = { select: 'mesh-select', move: 'mesh-move', rotate: 'mesh-rotate', scale: 'mesh-scale' }

export default {
  id: 'mesh', name: 'Mesh',
  commands: CMD,
  menus: {
    Add: ['-', ...PRIMS.map(p => 'mesh.' + p[0])],
    Mesh: ['mesh.edit', '-', 'mesh.selVert', 'mesh.selEdge', 'mesh.selFace', 'mesh.selectAll', 'mesh.deselectAll', 'mesh.selectLinked', '-', 'mesh.gMove', 'mesh.gRotate', 'mesh.gScale', 'mesh.mirrorX', '-',
      'mesh.extrude', 'mesh.inset', 'mesh.bevel', 'mesh.loopcut', 'mesh.knife', 'mesh.knifeApply', '-', 'mesh.subdivide', 'mesh.smooth', '-', 'mesh.mergeDist', 'mesh.mergeCenter', 'mesh.fill', 'mesh.delete', '-',
      'mesh.flip', 'mesh.recalc', 'mesh.shadeSmooth', 'mesh.shadeFlat'],
    Model: ['-', 'mesh.edit'],
    Context: ['-', 'mesh.edit', 'mesh.extrude', 'mesh.inset', 'mesh.bevel', 'mesh.loopcut', 'mesh.subdivide', 'mesh.mergeCenter', 'mesh.delete']
  },
  modes: [{ id: 'mesh', label: 'Edit mesh', short: 'Mesh', icon: 'editmesh', order: 20, ownGizmo: true }],
  tools: [selectTool, moveTool, rotateTool, scaleTool, knifeTool],
  panels: [panel], importers: [], exporters: [], types: {},
  init(app) {
    E.app = app
    if (!document.getElementById('pl-mesh')) { const st = document.createElement('style'); st.id = 'pl-mesh'; st.textContent = CSS; document.head.appendChild(st) }
    addEventListener('pointermove', e => { lastPtr = { x: e.clientX, y: e.clientY } }, { passive: true, capture: true })
    app.on('mode', ({ mode, prev } = {}) => {
      if (mode === 'mesh') {
        if (!TOOLMAP[app.tool] && !app.tool?.startsWith('mesh-')) app.setTool('mesh-select')
        else if (TOOLMAP[app.tool]) app.setTool(TOOLMAP[app.tool])
        if (entering) return
        const t = meshTarget(app)
        if (E.id && app.obj(E.id)?.type === 'mesh' && (!t || t === E.id)) { ensure(app); refresh(app); notify(app); return }
        if (!t) { app.toast?.('Select a mesh or part to edit', 'warn'); app.setMode(prev && prev !== 'mesh' ? prev : 'build'); return }
        enterEdit(app, t).then(ok => { if (!ok && curMode(app) === 'mesh') app.setMode('build'); notify(app) }, e => { app.toast?.(e.message || String(e), 'error'); app.setMode('build') })
      } else if (prev === 'mesh') resetEdit(app)
    })
    app.on('tool', id => {
      if (curMode(app) !== 'mesh') return
      if (TOOLMAP[id]) { app.setTool(TOOLMAP[id]); return }
      refresh(app); notify(app)
    })
    app.on('change', ch => {
      if (!E.id || (ch?.objects && !ch.objects.includes(E.id))) return
      const o = app.obj(E.id)
      if (!o || o.type !== 'mesh') { if (curMode(app) === 'mesh') app.setMode('build'); else resetEdit(app); return }
      if (o.geo !== E.geoId && !gz && !modal) { const g = app.geo.peek(o.geo); if (g) { E.geoId = o.geo; E.m = toM(g); validateSel() } }
      if (editing(app)) refresh(app)
    })
    app.on('select', sel => { if (curMode(app) === 'mesh' && E.id && !(sel || app.selection).includes(E.id)) app.select([E.id]) })
    app.on('project', () => { if (curMode(app) === 'mesh') app.setMode('build'); else resetEdit(app) })
  }
}
