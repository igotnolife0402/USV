// Parts: insert primitives, the R6 dummy rig, colour/material, array, mirror, align, drop, and CSG (union / negate / intersect).
import * as THREE from 'three'
import { MATERIALS, SHAPES, uid, toBufferGeometry, fromBufferGeometry, partGeometry, releaseGeometry, computeBounds, decompose, patternPixels } from '../core/model.js'

// ---------- shapes ----------
const SHAPE_INFO = {
  box: { label: 'Block', size: [4, 1, 2], name: 'Part' },
  sphere: { label: 'Sphere', size: [2, 2, 2], name: 'Ball' },
  cylinder: { label: 'Cylinder', size: [2, 2, 2], name: 'Cylinder' },
  wedge: { label: 'Wedge', size: [4, 1, 2], name: 'Wedge' },
  cornerwedge: { label: 'Corner wedge', size: [2, 2, 2], name: 'CornerWedge' },
  cone: { label: 'Cone', size: [2, 2, 2], name: 'Cone' },
  torus: { label: 'Torus', size: [4, 1, 4], name: 'Torus' },
  plane: { label: 'Plane', size: [8, 0, 8], name: 'Plane' },
  capsule: { label: 'Capsule', size: [2, 4, 2], name: 'Capsule' }
}
// Roblox BrickColors most used in builds.
export const PALETTE = [
  ['#f2f3f3', 'White'], ['#e5e4df', 'Light stone grey'], ['#a3a2a5', 'Medium stone grey'], ['#635f62', 'Dark stone grey'], ['#1b2a35', 'Black'], ['#d7c59a', 'Brick yellow'], ['#cc8e69', 'Nougat'], ['#694028', 'Reddish brown'],
  ['#c4281c', 'Bright red'], ['#ff0000', 'Really red'], ['#da8541', 'Bright orange'], ['#f5cd30', 'Bright yellow'], ['#ffff00', 'New Yeller'], ['#a4bd47', 'Br. yellowish green'], ['#4b974b', 'Bright green'], ['#27462d', 'Earth green'],
  ['#00ff00', 'Lime green'], ['#008f9c', 'Bright bluish green'], ['#04afec', 'Cyan'], ['#0d69ac', 'Bright blue'], ['#0000ff', 'Really blue'], ['#6225d1', 'Royal purple'], ['#aa00aa', 'Magenta'], ['#ff66cc', 'Pink']
]
const BUILDABLE = new Set(['part', 'mesh'])
const r3 = v => Math.round(v * 1000) / 1000
const snapper = app => { const s = app.prefs.snap ? +app.prefs.moveSnap || 0 : 0; return v => s ? r3(Math.round(v / s) * s) : r3(v) }
const sel = (app, args) => (args.ids || (args.id ? [args.id] : app.selection)).filter(id => app.obj(id))
const selParts = (app, args = {}) => sel(app, args).flatMap(id => [id, ...app.descendants(id)]).filter(id => BUILDABLE.has(app.obj(id)?.type))
const hasSel = (app, a = {}) => sel(app, a).length > 0
const hasTwo = (app, a = {}) => app.topLevel(sel(app, a)).length > 1
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }

// ---------- world-space bounds from the scene data (no viewport needed) ----------
const _v = new THREE.Vector3()
function boundsOf(app, ids) {
  const b = new THREE.Box3()
  for (const id of ids) for (const d of [id, ...app.descendants(id)]) {
    const o = app.obj(d); if (!o) continue
    const m = app.worldMatrix(d)
    let min, max
    if (o.type === 'part') { const s = o.size || [1, 1, 1]; min = s.map(v => -v / 2); max = s.map(v => v / 2) }
    else if (o.type === 'mesh') { const g = o.geo && app.geo.peek(o.geo); if (!g?.verts?.length) continue; ({ min, max } = computeBounds(g)) }
    else if (o.type === 'group') continue
    else { b.expandByPoint(_v.setFromMatrixPosition(m)); continue }
    for (let i = 0; i < 8; i++) b.expandByPoint(_v.set(i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]).applyMatrix4(m))
  }
  return b
}
// Move a top-level object by a world-space offset (keeps its parent).
function nudge(app, id, d) {
  const o = app.obj(id), m = app.worldMatrix(id)
  m.elements[12] += d.x; m.elements[13] += d.y; m.elements[14] += d.z
  const pm = o.parent ? app.worldMatrix(o.parent).invert() : new THREE.Matrix4()
  const t = decompose(pm.multiply(m))
  app.set(id, { pos: t.pos.map(r3) })
}

// Highest top of the visible parts overlapping a footprint at (x, z), or 0 (the ground).
function columnTop(app, x, z, size) {
  const hx = size[0] / 2 - 1e-4, hz = size[2] / 2 - 1e-4
  let top = 0
  for (const id of app.ids()) {
    if (app.isHidden(id) || !BUILDABLE.has(app.obj(id).type)) continue
    const b = boundsOf(app, [id])
    if (!b.isEmpty() && b.max.x > x - hx && b.min.x < x + hx && b.max.z > z - hz && b.min.z < z + hz) top = Math.max(top, b.max.y)
  }
  return top
}
// ---------- where new parts go: on the surface under the middle of the viewport ----------
function spawnPoint(app, size, rot) {
  const vp = app.viewport, snap = snapper(app)
  let p = null, n = new THREE.Vector3(0, 1, 0)
  if (vp) {
    const r = vp.canvas.getBoundingClientRect()
    if (r.width > 0) {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      const hit = vp.pick(cx, cy, { locked: true })
      if (hit && hit.distance < 400) { p = hit.point.clone(); if (hit.normal) n.copy(hit.normal) }
      else { const g = vp.ground(cx, cy, 0); if (g && g.distanceTo(vp.camera.position) < 300) p = g }
    }
  }
  if (!p) p = new THREE.Vector3(...(app.scene.camera?.target || [0, 0, 0])).setY(0)
  // a side or underside hit: stand on top of whatever is in that column instead (Roblox stacks new parts)
  if (n.y < 0.9) { const x = snap(p.x), z = snap(p.z); return [x, r3(columnTop(app, x, z, size) + size[1] / 2), z] }
  // half extent of the rotated box along the surface normal
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot.map(THREE.MathUtils.degToRad), 'XYZ'))
  const ln = n.clone().applyQuaternion(q.invert())
  const half = Math.abs(ln.x) * size[0] / 2 + Math.abs(ln.y) * size[1] / 2 + Math.abs(ln.z) * size[2] / 2
  const out = p.addScaledVector(n, half)
  const up = Math.abs(n.y) > 0.9
  return [up ? snap(out.x) : r3(out.x), r3(out.y), up ? snap(out.z) : r3(out.z)]
}

// Roblox and common names an AI may use for the same thing
const SHAPE_ALIAS = { block: 'box', part: 'box', cube: 'box', ball: 'sphere', corner: 'cornerwedge', cornerwedgepart: 'cornerwedge', wedgepart: 'wedge' }
const vec = v => Array.isArray(v) && v.length === 3 && v.every(x => Number.isFinite(+x)) ? v.map(Number) : null
// an explicit position always wins over surface placement
const posArg = a => vec(a.pos) || vec(a.position)
export function insertPart(app, args = {}) {
  const sh = String(args.shape || '').toLowerCase()
  const shape = SHAPES.includes(sh) ? sh : SHAPE_ALIAS[sh] || 'box'
  const info = SHAPE_INFO[shape]
  const size = vec(args.size) || [...info.size]
  const rot = vec(args.rot) || vec(args.rotation) || [0, 0, 0]
  const pos = posArg(args) || spawnPoint(app, size, rot)
  const o = { type: 'part', shape, size, pos, rot, name: args.name || info.name }
  for (const k of ['color', 'material', 'transparency', 'anchored', 'parent', 'texture']) if (args[k] !== undefined) o[k] = args[k]
  const id = app.add(o)
  if (args.select !== false) app.select([id])
  return id
}

// R6 dummy: 6 parts in a group, standing on the spawn point, facing +Z.
function insertRig(app, args = {}) {
  // Roblox's default rig: Medium stone grey Plastic
  const color = args.color || '#a3a2a5'
  const base = posArg(args) || spawnPoint(app, [4, 5, 1], [0, 0, 0]).map((v, i) => i === 1 ? r3(v - 2.5) : v)
  const gid = app.add({ type: 'group', name: args.name || 'Dummy', pos: base })
  const P = (name, shape, size, pos, c = color) => app.add({ type: 'part', shape, name, size, pos, color: c, material: 'Plastic', parent: gid })
  P('Torso', 'box', [2, 2, 1], [0, 3, 0], args.torso || color)
  P('Head', 'cylinder', [1.25, 1.2, 1.25], [0, 4.6, 0], args.head || color)
  P('Left Arm', 'box', [1, 2, 1], [-1.5, 3, 0], args.arms || color)
  P('Right Arm', 'box', [1, 2, 1], [1.5, 3, 0], args.arms || color)
  P('Left Leg', 'box', [1, 2, 1], [-0.5, 1, 0], args.legs || color)
  P('Right Leg', 'box', [1, 2, 1], [0.5, 1, 0], args.legs || color)
  if (args.select !== false) app.select([gid])
  return gid
}

// ---------- CSG ----------
let csgLib = null
// three-bvh-csg 0.0.18 (latest) still passes three-mesh-bvh's deprecated maxLeafSize: drop that one warning
const loadCSG = () => csgLib || (csgLib = import('three-bvh-csg').then(m => {
  const prep = m.Brush.prototype.prepareGeometry
  m.Brush.prototype.prepareGeometry = function () { const w = console.warn; console.warn = (...a) => { if (!String(a[0]).includes('"maxLeafSize"')) w.apply(console, a) }; try { return prep.call(this) } finally { console.warn = w } }
  return m
}))
async function geometryOf(app, o) {
  if (o.type === 'part') { const g = partGeometry(o.shape, o.size, o.bevel); const c = g.clone(); releaseGeometry(g); return c }
  const data = o.geo && (app.geo.peek(o.geo) || await app.geo.get(o.geo))
  if (!data?.verts?.length) throw new Error((o.name || 'Mesh') + ' has no geometry')
  return toBufferGeometry(data, { smooth: o.smooth })
}
function prep(g) {
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k)
  if (!g.attributes.normal) g.computeVertexNormals()
  g.clearGroups()
  return g
}
// op: 'union' (negative parts are subtracted, like Roblox), 'intersect'
async function csg(app, args, op) {
  const ids = selParts(app, args).filter(id => !app.isHidden(id) || args.ids)
  if (ids.length < 2) throw new Error('Select at least 2 parts')
  const { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } = await loadCSG()
  const objs = ids.map(id => [id, app.obj(id)])
  const brushes = []
  for (const [id, o] of objs) {
    const b = new Brush(prep(await geometryOf(app, o)))
    b.matrixAutoUpdate = false; b.matrix.copy(app.worldMatrix(id)); b.matrixWorld.copy(b.matrix)
    brushes.push({ id, o, b, neg: op === 'union' && !!o.negate })
  }
  const pos = brushes.filter(x => !x.neg), neg = brushes.filter(x => x.neg)
  if (!pos.length) throw new Error('Every selected part is negative: make one positive first')
  const ev = new Evaluator(); ev.attributes = ['position', 'normal']; ev.useGroups = false
  let acc = pos[0].b
  for (const x of pos.slice(1)) acc = ev.evaluate(acc, x.b, op === 'intersect' ? INTERSECTION : ADDITION)
  for (const x of neg) acc = ev.evaluate(acc, x.b, SUBTRACTION)
  const g = acc.geometry
  g.applyMatrix4(acc.matrixWorld) // the evaluator leaves the result in the first brush's local frame
  if (!g.attributes.position?.count) throw new Error(op === 'intersect' ? 'The parts do not overlap' : 'Nothing is left after subtracting')
  // keep the result where the first part lived: same parent, origin at the bounds centre
  const first = pos[0].o, parent = objs.every(([, o]) => (o.parent || null) === (first.parent || null)) ? first.parent || null : null
  if (parent) g.applyMatrix4(app.worldMatrix(parent).invert())
  g.computeBoundingBox()
  const c = g.boundingBox.getCenter(new THREE.Vector3())
  g.translate(-c.x, -c.y, -c.z)
  const geo = fromBufferGeometry(g, { weld: true, quads: true })
  for (const x of brushes) x.b.geometry.dispose()
  g.dispose()
  const top = app.topLevel(sel(app, args))
  return app.transact(op === 'intersect' ? 'Intersect' : 'Union', () => {
    const gid = app.geo.put(geo)
    const id = app.add({ type: 'mesh', name: op === 'intersect' ? 'Intersection' : 'Union', geo: gid, parent, pos: [r3(c.x), r3(c.y), r3(c.z)], color: first.color, material: first.material, transparency: first.transparency || 0, texture: first.texture || null })
    app.remove(top.filter(t => app.obj(t)))
    app.select([id])
    return { id, geo: gid, faces: geo.faces.length }
  })
}

// ---------- array / mirror / align / drop ----------
function arrayOf(app, args) {
  const ids = app.topLevel(sel(app, args)); if (!ids.length) throw new Error('Select something to repeat')
  const count = Math.max(1, Math.min(200, Math.round(args.count ?? 3)))
  let off = args.offset
  if (!Array.isArray(off)) { const b = boundsOf(app, ids), s = b.isEmpty() ? new THREE.Vector3(1, 1, 1) : b.getSize(new THREE.Vector3()); off = [r3(s.x), 0, 0] }
  const out = []
  let cur = ids
  for (let i = 0; i < count; i++) { cur = app.duplicate(cur, { offset: off, select: false }); out.push(...cur) }
  app.select([...ids, ...out])
  return out
}
const AX = { x: 0, y: 1, z: 2 }
function mirror(app, args) {
  const ids = app.topLevel(sel(app, args)); if (!ids.length) throw new Error('Select something to mirror')
  const ax = AX[args.axis] ?? 0
  const b = boundsOf(app, ids), c = b.isEmpty() ? 0 : b.getCenter(new THREE.Vector3()).getComponent(ax)
  const plane = args.at ?? (args.copy === false ? c : b.isEmpty() ? 0 : b.max.getComponent(ax))
  const targets = args.copy === false ? ids : app.duplicate(ids, { offset: [0, 0, 0], select: false })
  const R = new THREE.Matrix4().makeScale(ax === 0 ? -1 : 1, ax === 1 ? -1 : 1, ax === 2 ? -1 : 1)
  const S = new THREE.Matrix4().makeScale(-1, 1, 1) // shapes are symmetric across their own X
  for (const id of targets) {
    const o = app.obj(id), m = app.worldMatrix(id)
    const w = new THREE.Matrix4().makeTranslation(...[0, 1, 2].map(k => k === ax ? 2 * plane : 0)).multiply(R).multiply(m).multiply(S)
    const pm = o.parent ? app.worldMatrix(o.parent).invert() : new THREE.Matrix4()
    const t = decompose(pm.multiply(w))
    app.set(id, { pos: t.pos.map(r3), rot: t.rot.map(v => r3(v)) })
  }
  app.select(args.copy === false ? ids : [...ids, ...targets])
  return targets
}
function align(app, args) {
  const ids = app.topLevel(sel(app, args)); if (ids.length < 2) throw new Error('Select at least 2 objects')
  const ax = AX[args.axis || 'y'] ?? 1, to = args.to || 'min'
  const all = boundsOf(app, ids)
  const pick = b => to === 'max' ? b.max.getComponent(ax) : to === 'center' ? b.getCenter(_v).getComponent(ax) : b.min.getComponent(ax)
  const goal = pick(all)
  for (const id of ids) { const d = new THREE.Vector3(); d.setComponent(ax, goal - pick(boundsOf(app, [id]))); if (Math.abs(d.getComponent(ax)) > 1e-6) nudge(app, id, d) }
  return ids.length
}
// Drop each selected object straight down onto whatever is under it (or the ground at y = 0).
function drop(app, args) {
  const ids = app.topLevel(sel(app, args)).filter(id => !app.isLocked(id)); if (!ids.length) throw new Error('Select something to drop')
  const moving = new Set(ids.flatMap(id => [id, ...app.descendants(id)]))
  const others = app.ids().filter(id => !moving.has(id) && !app.isHidden(id) && BUILDABLE.has(app.obj(id).type)).map(id => boundsOf(app, [id])).filter(b => !b.isEmpty())
  const order = ids.map(id => [id, boundsOf(app, [id])]).sort((a, b) => a[1].min.y - b[1].min.y)
  for (const [id, b] of order) {
    let floor = 0
    for (const o of others) if (o.max.y <= b.min.y + 1e-4 && o.max.x > b.min.x + 1e-4 && o.min.x < b.max.x - 1e-4 && o.max.z > b.min.z + 1e-4 && o.min.z < b.max.z - 1e-4) floor = Math.max(floor, o.max.y)
    const dy = floor - b.min.y
    if (Math.abs(dy) > 1e-6) nudge(app, id, new THREE.Vector3(0, dy, 0))
    others.push(b.clone().translate(new THREE.Vector3(0, dy, 0)))
  }
  return ids.length
}
async function askArray(app) {
  const r = await app.ui.form({ title: 'Array', ok: 'Repeat', fields: [{ key: 'count', label: 'Copies', type: 'number', value: 3 }, { key: 'x', label: 'Offset X', type: 'number', value: r3(boundsOf(app, app.topLevel(app.selection)).getSize(new THREE.Vector3()).x || 1) }, { key: 'y', label: 'Offset Y', type: 'number', value: 0 }, { key: 'z', label: 'Offset Z', type: 'number', value: 0 }] })
  if (r) return app.run('parts.array', { count: r.count, offset: [r.x, r.y, r.z] })
}

// ---------- commands ----------
const commands = {}
const SHAPE_KEYS = { box: 'Ctrl+1', sphere: 'Ctrl+2', cylinder: 'Ctrl+3', wedge: 'Ctrl+4' }
for (const s of SHAPES) commands['parts.' + s] = { label: SHAPE_INFO[s].label, icon: s, key: SHAPE_KEYS[s], run: (app, a) => insertPart(app, { ...a, shape: s }) }
Object.assign(commands, {
  'parts.insert': { label: 'Insert part', hidden: true, run: insertPart },
  'parts.block': { label: 'Block', icon: 'box', hidden: true, run: (app, a) => insertPart(app, { ...a, shape: 'box' }) },
  'parts.part': { label: 'Part', icon: 'box', hidden: true, run: (app, a) => insertPart(app, { ...a, shape: 'box' }) },
  'parts.ball': { label: 'Ball', icon: 'sphere', hidden: true, run: (app, a) => insertPart(app, { ...a, shape: 'sphere' }) },
  'parts.rig': { label: 'R6 dummy', icon: 'person', run: insertRig },
  'parts.color': { label: 'Set colour', hidden: true, enabled: hasSel, run(app, a) { const ids = selParts(app, a); for (const id of ids) app.set(id, { color: a.color }); return ids.length } },
  'parts.material': { label: 'Set material', hidden: true, enabled: hasSel, run(app, a) { if (!MATERIALS[a.material]) throw new Error('Unknown material: ' + a.material); const ids = selParts(app, a); for (const id of ids) app.set(id, { material: a.material }); return ids.length } },
  'parts.transparency': { label: 'Set transparency', hidden: true, enabled: hasSel, run(app, a) { const v = Math.max(0, Math.min(1, +a.value || 0)); const ids = selParts(app, a); for (const id of ids) app.set(id, { transparency: v }); return ids.length } },
  'parts.anchor': { label: 'Anchored', icon: 'anchor', enabled: hasSel, checked: app => { const ids = selParts(app); return ids.length > 0 && ids.every(id => app.obj(id).anchored !== false) }, run(app, a) { const ids = selParts(app, a); const v = a.value ?? !ids.every(id => app.obj(id).anchored !== false); for (const id of ids) app.set(id, { anchored: !!v }); return ids.length } },
  'csg.union': { label: 'Union', icon: 'union', key: 'Ctrl+Shift+U', enabled: (app, a = {}) => selParts(app, a).length > 1, run: (app, a) => csg(app, a, 'union') },
  'csg.intersect': { label: 'Intersect', icon: 'intersect', key: 'Ctrl+Alt+I', enabled: (app, a = {}) => selParts(app, a).length > 1, run: (app, a) => csg(app, a, 'intersect') },
  'csg.negate': { label: 'Negate', icon: 'negate', key: 'Ctrl+Alt+N', enabled: (app, a = {}) => selParts(app, a).some(id => app.obj(id).type === 'part'), checked: app => { const ids = selParts(app); return ids.length > 0 && ids.every(id => app.obj(id).negate) }, run(app, a) { const ids = selParts(app, a).filter(id => app.obj(id).type === 'part'); const v = a.value ?? !ids.every(id => app.obj(id).negate); for (const id of ids) app.set(id, { negate: !!v }); return ids.length } },
  'parts.toMesh': { label: 'Convert to mesh', icon: 'mesh', enabled: (app, a = {}) => sel(app, a).some(id => app.obj(id)?.type === 'part'), async run(app, a) {
    const ids = sel(app, a).filter(id => app.obj(id).type === 'part')
    // a painted part paints through its uv1 layout: the mesh keeps that layout as its uvs, so the paint stays put
    const geos = ids.map(id => { const o = app.obj(id), t = o.texture && app.scene.textures[o.texture], g = partGeometry(o.shape, o.size, o.bevel), geo = fromBufferGeometry(g, { weld: true, quads: true, uv: t?.uv1 ? 'uv1' : null }); releaseGeometry(g); return [id, o, geo, t] })
    return app.transact('Convert to mesh', () => geos.map(([id, o, geo, t]) => {
      const gid = app.geo.put(geo), patch = { type: 'mesh', geo: gid, shape: null, size: null, negate: null, smooth: o.shape !== 'box' && o.shape !== 'wedge' && o.shape !== 'cornerwedge' }
      if (t?.uv1) { const { uv1, ...rest } = t, shared = app.ids().some(j => j !== id && app.obj(j).texture === o.texture); patch.texture = shared ? uid('tx-paint-') : o.texture; app.putTexture(patch.texture, rest) }
      app.set(id, patch); return id
    }))
  } },
  'parts.array': { label: 'Array…', icon: 'array', enabled: hasSel, run(app, a) { if (a.count === undefined && !a.offset && app.ui?.form) { askArray(app); return null } return arrayOf(app, a) } },
  'parts.mirrorX': { label: 'Mirror X', icon: 'mirror', enabled: hasSel, run: (app, a) => mirror(app, { ...a, axis: 'x' }) },
  'parts.mirrorZ': { label: 'Mirror Z', icon: 'mirror', enabled: hasSel, run: (app, a) => mirror(app, { ...a, axis: 'z' }) },
  'parts.mirror': { label: 'Mirror', hidden: true, enabled: hasSel, run: mirror },
  'parts.align': { label: 'Align', hidden: true, enabled: hasTwo, run: align },
  'parts.alignBottom': { label: 'Align bottoms', icon: 'align', enabled: hasTwo, run: (app, a) => align(app, { ...a, axis: 'y', to: 'min' }) },
  'parts.alignCenterX': { label: 'Align centres X', icon: 'align', enabled: hasTwo, run: (app, a) => align(app, { ...a, axis: 'x', to: 'center' }) },
  'parts.alignCenterZ': { label: 'Align centres Z', icon: 'align', enabled: hasTwo, run: (app, a) => align(app, { ...a, axis: 'z', to: 'center' }) },
  'parts.drop': { label: 'Drop to surface', icon: 'drop', key: 'End', enabled: hasSel, run: drop }
})

// ---------- panels ----------
const insertPanel = {
  id: 'insert', label: 'Insert', icon: 'plus', order: 60,
  render(el, app) {
    const g = h('div', 'ins-grid')
    for (const s of [...SHAPES, 'rig']) {
      const cmd = s === 'rig' ? 'parts.rig' : 'parts.' + s, c = app.commands.get(cmd)
      const b = h('button', 'ins', `${app.ui.icon(c.icon)}<span>${s === 'cornerwedge' ? 'Corner' : s === 'rig' ? 'Dummy' : c.label}</span>`)
      b.title = c.label + (c.key ? ' (' + [].concat(c.key)[0] + ')' : ''); b.dataset.cmd = cmd
      b.addEventListener('click', () => { app.exec(cmd); if (app.ui.isPhone()) app.ui.closeSide() })
      g.appendChild(b)
    }
    el.appendChild(g)
  }
}
const swatchCache = new Map()
function materialSwatch(name, color) {
  const key = name + color
  if (swatchCache.has(key)) return swatchCache.get(key)
  const m = MATERIALS[name] || {}, N = 32, cv = document.createElement('canvas'); cv.width = cv.height = N
  const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N)
  const px = m.pattern ? patternPixels(m.pattern, N) : null
  const c = new THREE.Color(color), lin = [c.r, c.g, c.b].map(v => v * 255)
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = (j * N + i) * 4, g = px ? px[k] / 255 : 1, shade = 1.08 - 0.28 * (j / N) + (m.metalness ? 0.25 * Math.sin(i / N * 3) : 0)
    for (let q = 0; q < 3; q++) img.data[k + q] = Math.min(255, (name === 'Neon' ? lin[q] * 1.25 : lin[q]) * g * shade)
    img.data[k + 3] = name === 'Glass' || name === 'ForceField' ? 150 : 255
  }
  ctx.putImageData(img, 0, 0)
  const url = cv.toDataURL()
  if (swatchCache.size > 200) swatchCache.clear()
  swatchCache.set(key, url)
  return url
}
const words = s => s.replace(/([a-z])([A-Z])/g, '$1 $2')
const appearancePanel = {
  id: 'appearance', label: 'Colour and material', icon: 'color', order: 20,
  when: app => app.selection.some(id => BUILDABLE.has(app.obj(id)?.type) || app.obj(id)?.type === 'group'),
  render(el, app) {
    const sw = h('div', 'swatches'), mats = h('div', 'mats')
    for (const [hex, name] of PALETTE) { const b = h('button', 'swatch'); b.style.background = hex; b.title = name; b.dataset.color = hex; b.setAttribute('aria-label', name); sw.appendChild(b) }
    sw.addEventListener('click', e => { const b = e.target.closest('.swatch'); if (b) app.exec('parts.color', { color: b.dataset.color }) })
    for (const m of Object.keys(MATERIALS)) { const b = h('button', 'mat', `<img alt="" width="32" height="32"><span>${words(m)}</span>`); b.dataset.mat = m; b.title = words(m); mats.appendChild(b) }
    mats.addEventListener('click', e => { const b = e.target.closest('.mat'); if (b) app.exec('parts.material', { material: b.dataset.mat }) })
    el.append(h('div', 'pg-h', 'Colour'), sw, h('div', 'pg-h', 'Material'), mats)
    el._upd = () => {
      const ps = selParts(app).map(id => app.obj(id))
      const col = ps[0]?.color || '#a3a2a5', mat = ps.every(p => p.material === ps[0]?.material) ? ps[0]?.material : null, c = ps.every(p => p.color === col) ? col : null
      for (const b of sw.children) b.classList.toggle('on', b.dataset.color === c)
      for (const b of mats.children) { b.classList.toggle('on', b.dataset.mat === mat); const img = b.firstChild, src = materialSwatch(b.dataset.mat, col); if (img.getAttribute('src') !== src) img.src = src }
    }
    el._upd()
  },
  refresh(el, app, ev) {
    if (ev.type === 'time' || (ev.type === 'change' && !ev.objects.some(id => app.selection.includes(id) || app.selection.some(s => app.isAncestor(s, id))))) return
    el._upd?.()
  }
}

export default {
  id: 'parts', name: 'Parts',
  commands,
  menus: {
    Add: [...SHAPES.map(s => 'parts.' + s), '-', 'parts.rig'],
    Model: ['csg.union', 'csg.negate', 'csg.intersect', '-', 'parts.toMesh', '-', 'parts.array', 'parts.mirrorX', 'parts.mirrorZ', '-', 'parts.alignBottom', 'parts.alignCenterX', 'parts.alignCenterZ', 'parts.drop', '-', 'parts.anchor'],
    Context: ['-', 'csg.union', 'csg.negate', 'parts.drop']
  },
  panels: [appearancePanel, insertPanel]
}
