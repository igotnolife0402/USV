// Roblox: .rbxmx + Lua builder export (parts, models, lights, strokes, R6 rig with KeyframeSequences), .rbxmx/.rbxm import.
// Everything above "Plugin" is pure (no DOM): cli/studio.mjs imports these writers and readers too.
import * as THREE from 'three'
import * as M from '../core/model.js'

const D2R = Math.PI / 180, R2D = 180 / Math.PI

/* ---------- math: 3x3 row-major, frames {A, t} (affine) and {R, t} (rigid) ---------- */
export function eulerToMat([x = 0, y = 0, z = 0] = []) { // three.js Euler 'XYZ' (R = Rx * Ry * Rz)
  const a = Math.cos(x * D2R), b = Math.sin(x * D2R), c = Math.cos(y * D2R), d = Math.sin(y * D2R), e = Math.cos(z * D2R), f = Math.sin(z * D2R)
  const ae = a * e, af = a * f, be = b * e, bf = b * f
  return [c * e, -c * f, d, af + be * d, ae - bf * d, -b * c, bf - ae * d, be + af * d, a * c]
}
export function matToEuler(m) {
  const y = Math.asin(Math.max(-1, Math.min(1, m[2])))
  let x, z
  if (Math.abs(m[2]) < 0.9999999) { x = Math.atan2(-m[5], m[8]); z = Math.atan2(-m[1], m[0]) } else { x = Math.atan2(m[7], m[4]); z = 0 }
  return [x, y, z].map(v => Math.round(v * R2D * 1e4) / 1e4 || 0)
}
const mm = (a, b) => { const r = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return r }
const mv = (a, v) => [a[0] * v[0] + a[1] * v[1] + a[2] * v[2], a[3] * v[0] + a[4] * v[1] + a[5] * v[2], a[6] * v[0] + a[7] * v[1] + a[8] * v[2]]
const tp = a => [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]); return l > 1e-12 ? [v[0] / l, v[1] / l, v[2] / l] : null }
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]
const ID = { R: I3, t: [0, 0, 0] }
const fmul = (p, c) => ({ A: mm(p.A, c.A), t: add(mv(p.A, c.t), p.t) })
const rmul = (a, b) => ({ R: mm(a.R, b.R), t: add(mv(a.R, b.t), a.t) })
const rinv = a => { const R = tp(a.R), t = mv(R, a.t); return { R, t: [-t[0], -t[1], -t[2]] } }
function localFrame(o) {
  const R = eulerToMat(o.rot || [0, 0, 0]), s = o.scale || [1, 1, 1]
  return { A: R.map((v, i) => v * s[i % 3]), t: (o.pos || [0, 0, 0]).slice(0, 3) }
}
// Affine -> proper rotation + per-axis scale (a mirror keeps det +1 and carries the flip in s[2]).
export function rigid(f) {
  const A = f.A, c = [0, 1, 2].map(j => [A[j], A[3 + j], A[6 + j]]), s = c.map(v => Math.hypot(...v))
  const x = norm(c[0]) || [1, 0, 0]
  const y = norm(sub(c[1], x.map(v => v * dot(c[1], x)))) || norm(cross([0, 0, 1], x)) || [0, 1, 0]
  const z = cross(x, y)
  if (dot(z, c[2]) < 0) s[2] = -s[2]
  return { R: [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]], t: f.t.slice(), s }
}

/* ---------- scene helpers ---------- */
export const num = v => { const r = Math.round((+v || 0) * 1e6) / 1e6; return String(r === 0 ? 0 : r) }
const rgbOf = c => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); const v = m ? parseInt(m[1], 16) : 0xa3a2a5; return [v >> 16 & 255, v >> 8 & 255, v & 255] }
const hexOf = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const safeName = s => String(s || 'mesh').replace(/[^\w-]+/g, '_').slice(0, 40) || 'mesh'
function childMap(objs) {
  const m = new Map()
  for (const [id, o] of Object.entries(objs)) { if (!o) continue; const p = o.parent && objs[o.parent] ? o.parent : null; if (!m.has(p)) m.set(p, []); m.get(p).push(id) }
  for (const l of m.values()) l.sort((a, b) => (objs[a].order ?? 0) - (objs[b].order ?? 0))
  return m
}
const desc = (kids, id, out = [], seen = new Set()) => { for (const c of kids.get(id) || []) if (!seen.has(c)) { seen.add(c); out.push(c); desc(kids, c, out, seen) } return out }
function worldFn(objs, pose) {
  const memo = new Map()
  const w = id => {
    if (memo.has(id)) return memo.get(id)
    const o = objs[id]
    if (!o) return { A: I3, t: [0, 0, 0] }
    memo.set(id, { A: I3, t: [0, 0, 0] }) // cycle guard
    const v = pose ? { ...o, ...pose(id) } : o
    const f = o.parent && objs[o.parent] ? fmul(w(o.parent), localFrame(v)) : localFrame(v)
    memo.set(id, f)
    return f
  }
  return w
}

/* ---------- Roblox enums ---------- */
export const RBX_MATERIALS = { Plastic: 256, SmoothPlastic: 272, Neon: 288, Wood: 512, WoodPlanks: 528, Marble: 784, Basalt: 788, Slate: 800, CrackedLava: 804, Concrete: 816, Limestone: 820, Granite: 832, Pavement: 836, Brick: 848, Pebble: 864, Cobblestone: 880, Rock: 896, Sandstone: 912, CorrodedMetal: 1040, DiamondPlate: 1056, Foil: 1072, Metal: 1088, Grass: 1280, LeafyGrass: 1284, Sand: 1296, Fabric: 1312, Snow: 1328, Mud: 1344, Ground: 1360, Asphalt: 1376, Salt: 1392, Ice: 1536, Glacier: 1552, Glass: 1568, ForceField: 1584 }
const MAT_BY_TOKEN = Object.fromEntries(Object.entries(RBX_MATERIALS).map(([k, v]) => [v, k]))
const matOf = name => {
  if (RBX_MATERIALS[name]) return [name, RBX_MATERIALS[name]]
  const k = Object.keys(RBX_MATERIALS).find(m => m.toLowerCase() === String(name || '').toLowerCase().replace(/[^a-z]/g, ''))
  return k ? [k, RBX_MATERIALS[k]] : ['Plastic', 256]
}
const PT = { Ball: ['PartType', 'Ball', 0], Block: ['PartType', 'Block', 1], Cylinder: ['PartType', 'Cylinder', 2] }
const SMOOTH = ['SurfaceType', 'Smooth', 0]
const RZ90 = [0, -1, 0, 1, 0, 0, 0, 0, 1], RZM90 = [0, 1, 0, -1, 0, 0, 0, 0, 1]
// Roblox's CornerWedgePart tip is at (+X, +Y, -Z); Studio's is at (+X, +Y, +Z). Roblox frame = Studio frame * CW_TURN
// (a -90 deg turn about Y), and the X and Z sizes swap.
const CW_TURN = [0, 0, -1, 0, 1, 0, 1, 0, 0]
const near = (a, b) => Math.abs(a - b) <= 1e-3 * Math.max(1, Math.abs(a), Math.abs(b))

/* ---------- node tree (shared by the rbxmx and Lua writers) ---------- */
// node = {cls, props: [[luaName, type, value]], kids}; types: str bool num v3 cf rgb8 rgb enum ref
const node = (cls, name, props = [], kids = []) => ({ cls, props: [['Name', 'str', String(name ?? cls)], ...props], kids })
const note = text => node('StringValue', 'StudioNote', [['Value', 'str', text]])
const propOf = (n, k) => n.props.find(p => p[0] === k)
const setProp = (n, k, t, v) => { const p = propOf(n, k); if (p) p[2] = v; else n.props.push([k, t, v]) }
function baseProps(o, size, R, t) {
  const mat = matOf(o.material)
  return [['Size', 'v3', size], ['CFrame', 'cf', { R, t }], ['Color', 'rgb8', rgbOf(o.color)], ['Material', 'enum', ['Material', mat[0], mat[1]]],
    ['Transparency', 'num', Math.max(0, Math.min(1, +o.transparency || 0))], ['Anchored', 'bool', o.anchored !== false], ['CanCollide', 'bool', true],
    ['TopSurface', 'enum', SMOOTH], ['BottomSurface', 'enum', SMOOTH]]
}

// Scene -> Roblox node tree. opts: {ids, name, baseplate, getGeo(geoId), partGeo(shape, size), modelGeo(id)}
export function robloxModel(scene, opts = {}) {
  const objs = scene.objects || {}, kids = childMap(objs)
  const ctx = { objs, kids, scene, opts, world: worldFn(objs), meshes: [], notes: [], nodeOf: new Map(), rigs: new Set(), counts: { parts: 0, models: 0, meshes: 0, lights: 0, rigs: 0, anims: 0, skipped: 0 } }
  let roots = kids.get(null) || []
  if (opts.ids?.length) {
    const set = new Set(opts.ids.filter(id => objs[id]))
    roots = [...set].filter(id => { let p = objs[id].parent, n = 0; while (p && objs[p] && n++ < 1e4) { if (set.has(p)) return false; p = objs[p].parent } return true })
  }
  const root = node('Model', opts.name || scene.name || 'Umbrio Sandbox model')
  for (const id of roots) convert(ctx, id, root)
  if (opts.merge) mergeMeshes(ctx, root)
  ctx.meshes.forEach((me, i) => { me.key = 'UMB' + String(i + 1).padStart(5, '0'); me.node.mesh = me.key; propOf(me.node.kids.find(k => k.cls === 'StringValue' && propOf(k, 'Name')[2] === 'UmbrioMesh'), 'Value')[2] = me.key })
  ctx.counts.meshes = ctx.meshes.length
  if (opts.meshAssets) linkUploaded(root, ctx.meshes, opts.meshAssets)
  return { root, meshes: ctx.meshes, notes: ctx.notes, counts: ctx.counts }
}

function convert(ctx, id, parent) {
  const o = ctx.objs[id]
  if (!o || o.visible === false || o.shadowOnly) return   // shadow stand-ins are studio-only
  if (!ctx.opts.baseplate && o.type === 'part' && o.locked && /^baseplate$/i.test(o.name || '')) return
  const F = ctx.world(id), name = o.name || id
  if (o.type === 'group') {
    const n = node('Model', name)
    ctx.counts.models++
    parent.kids.push(n)
    ctx.nodeOf.set(id, n)
    for (const c of ctx.kids.get(id) || []) convert(ctx, c, n)
    const rig = rigOf(ctx, id)
    if (rig) rigify(ctx, id, n, rig)
    return
  }
  let n = null
  ctx.cur = id
  if (o.type === 'part') n = partNode(ctx, o, F, name)
  else if (o.type === 'mesh') n = meshNode(ctx, o, F, ctx.opts.getGeo?.(o.geo), name)
  else if (o.type === 'light') n = lightNode(ctx, o, F, name)
  else if (o.type === 'stroke') n = strokeNode(ctx, o, F, name)
  else if (o.type === 'model') n = meshNode(ctx, o, F, ctx.opts.modelGeo?.(id), name)
  else if (o.type === 'flipbook') n = flipNode(ctx, o, F, name)
  else { ctx.notes.push(`${name}: ${o.type} has no Roblox form, skipped`); ctx.counts.skipped++ }
  if (n) { parent.kids.push(n); ctx.nodeOf.set(id, n); if (n.entry) n.entry.parent = parent }
  for (const c of ctx.kids.get(id) || []) convert(ctx, c, parent) // Roblox parts do not carry children: they become siblings
}

function partNode(ctx, o, F, name) {
  const r = rigid(F), base = o.size || [4, 1, 2], sz = base.map((v, i) => Math.abs(v * r.s[i]))
  const shape = o.shape || 'box'
  let cls = 'Part', type = PT.Block, size = sz, R = r.R
  if (shape === 'box') { if (/truss/i.test(name)) cls = 'TrussPart' }
  else if (shape === 'plane') size = [sz[0], Math.max(sz[1], 0.05), sz[2]]
  else if (shape === 'wedge') cls = 'WedgePart'
  else if (shape === 'cornerwedge') { cls = 'CornerWedgePart'; R = mm(R, CW_TURN); size = [sz[2], sz[1], sz[0]] }
  else if (shape === 'sphere' && near(sz[0], sz[1]) && near(sz[1], sz[2])) type = PT.Ball
  else if (shape === 'cylinder' && near(sz[0], sz[2])) { type = PT.Cylinder; R = mm(R, RZ90); size = [sz[1], sz[0], sz[2]] } // Roblox cylinders run along X
  else return meshNode(ctx, o, F, ctx.opts.partGeo?.(shape, base), name) // cone, torus, capsule, stretched sphere or cylinder
  ctx.counts.parts++
  const n = node(cls, name, [...(cls === 'Part' ? [['Shape', 'enum', type]] : []), ...baseProps(o, size, R, r.t)])
  if (o.negate) n.kids.push(note('Umbrio Sandbox negative part: select it, press Negate, then Union it with the parts it cuts.'))
  return n
}

// Meshes already uploaded (meshAssets: key -> {id, size, rot}, read back from the uploaded -meshes .fbx model, keys as that
// export numbered them): each placeholder becomes the finished MeshPart pointing at its mesh asset, so the .rbxmx imports
// whole, no link script. The importer's axis turn `rot` goes into the part's frame; joints holding the part absorb it in
// their C0/C1, so every pose and animation stays exactly as exported.
function linkUploaded(root, meshes, assets) {
  const turned = new Map()
  for (const me of meshes) {
    const up = assets[me.key]; if (!up) continue
    const n = me.node, cf = propOf(n, 'CFrame')[2]
    setProp(n, 'CFrame', 'cf', { R: mm(cf.R, up.rot), t: cf.t }); setProp(n, 'Size', 'v3', up.size)
    n.props.push(['MeshId', 'content', up.id], ['InitialSize', 'v3', up.size])
    n.kids = n.kids.filter(k => !(k.cls === 'StringValue' && propOf(k, 'Name')[2] === 'UmbrioMesh'))
    me.linked = n.linked = true; turned.set(n, up.rot)
  }
  const tp3 = R => [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]]
  const walk = n => {
    if (n.cls === 'Motor6D' || n.cls === 'Weld') for (const [part, c] of [['Part0', 'C0'], ['Part1', 'C1']]) {
      const rot = turned.get(propOf(n, part)?.[2]); if (!rot) continue
      const v = propOf(n, c)?.[2] || { R: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] }, T = tp3(rot)
      setProp(n, c, 'cf', { R: mm(T, v.R), t: [0, 1, 2].map(i => T[i * 3] * v.t[0] + T[i * 3 + 1] * v.t[1] + T[i * 3 + 2] * v.t[2]) })
    }
    n.kids.forEach(walk)
  }
  walk(root)
}

function meshNode(ctx, o, F, geo, name) {
  if (!geo?.verts?.length) { ctx.notes.push(`${name}: geometry not available, skipped`); ctx.counts.skipped++; return null }
  const r = rigid(F)
  if (ctx.opts.simplify) { geo = simplifyGeo(geo, r.s, o.smooth, ctx.opts.simplify); r.s = [1, 1, 1] }   // scale baked into the reduced mesh
  const v = geo.verts, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < v.length; i += 3) for (let j = 0; j < 3; j++) { const x = v[i + j] * r.s[j]; if (x < lo[j]) lo[j] = x; if (x > hi[j]) hi[j] = x }
  const c = [0, 1, 2].map(j => (lo[j] + hi[j]) / 2), size = [0, 1, 2].map(j => Math.max(0.05, hi[j] - lo[j]))
  // Roblox can't hold mesh geometry inside a model file (a MeshPart only points at an uploaded mesh asset), so every mesh
  // goes into one compressed .fbx, centred on this placeholder's frame, and link-meshes.lua swaps each one into place after a
  // single Import 3D. The key ties the .fbx mesh to its placeholder.
  const key = 'UMB' + String(ctx.meshes.length + 1).padStart(5, '0')
  const entry = { name, key, id: ctx.cur, geo, s: r.s, c, R: r.R, t: r.t, pos: add(mv(r.R, c), r.t), smooth: o.smooth, tris: (geo.faces || []).reduce((t, f) => t + Math.max(0, f.length - 2), 0) }
  ctx.meshes.push(entry)
  ctx.counts.meshes++
  const n = node('MeshPart', name, baseProps(o, size, r.R, entry.pos))
  n.mesh = key; n.entry = entry; entry.node = n
  n.kids.push(node('StringValue', 'UmbrioMesh', [['Value', 'str', key]]))
  return n
}

// Fewer triangles (opts.simplify = {S: meshoptimizer's MeshoptSimplifier, ratio, error}): the mesh is triangulated as the
// viewport draws it, scaled to studs, then edges collapse until `ratio` of its triangles are left or a surface would move more
// than `error` studs, whichever comes first. Flat walls lose nothing; curves and fine trim coarsen within the error. Corners
// with different palette colours count as seams, so colour borders stay put; sharp edges hold through the error limit.
// The simplifier's own error estimate misses folded flat panels and thin trim, so every result is measured against the
// original (both ways, at corners, edge midpoints and centres, through a BVH): over `tol` studs, it retries with more
// triangles, and keeps full detail if nothing passes.
export function simplifyGeo(geo, s, smooth, { S, BVH, ratio = 0.5, error = 0.05, tol = 0.1 }) {
  const bg = M.toBufferGeometry(geo, { smooth }), P = bg.attributes.position.array, N = bg.attributes.normal.array, U = bg.attributes.uv.array, n = P.length / 3
  const flip = s[0] * s[1] * s[2] < 0, seen = new Map(), pos = [], uv = []
  let idx = new Uint32Array(n)
  for (let i = 0; i < n; i++) {
    const x = P[i * 3] * s[0], y = P[i * 3 + 1] * s[1], z = P[i * 3 + 2] * s[2]
    const k = (smooth ? [x, y, z, N[i * 3], N[i * 3 + 1], N[i * 3 + 2], U[i * 2], U[i * 2 + 1]] : [x, y, z, U[i * 2], U[i * 2 + 1]]).map(q => Math.round(q * 1e4)).join(',')   // flat shading recomputes normals, so only colour borders are seams
    let j = seen.get(k); if (j === undefined) { j = pos.length / 3; seen.set(k, j); pos.push(x, y, z); uv.push(U[i * 2], U[i * 2 + 1]) }
    idx[flip ? i - (i % 3) + [0, 2, 1][i % 3] : i] = j
  }
  M.releaseGeometry?.(bg)
  // a corner shared by two palette colours is locked: colour borders (cobbles, trims, stripes) keep their exact shape
  const byPos = new Map(), lock = new Uint8Array(pos.length / 3)
  for (let j = 0; j < lock.length; j++) { const k = Math.round(pos[j * 3] * 1e4) + ',' + Math.round(pos[j * 3 + 1] * 1e4) + ',' + Math.round(pos[j * 3 + 2] * 1e4); const l = byPos.get(k); if (l) { l.push(j); for (const q of l) lock[q] = 1 } else byPos.set(k, [j]) }
  S.useExperimentalFeatures = true
  const fp = Float32Array.from(pos), fu = Float32Array.from(uv)
  { // zero-area faces (lines in the source) draw nothing: drop them before simplifying and measuring
    const keep = []
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3
      const ux = fp[b] - fp[a], uy = fp[b + 1] - fp[a + 1], uz = fp[b + 2] - fp[a + 2], wx = fp[c] - fp[a], wy = fp[c + 1] - fp[a + 1], wz = fp[c + 2] - fp[a + 2]
      if (Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx) > 1e-8) keep.push(idx[t], idx[t + 1], idx[t + 2])
    }
    idx = Uint32Array.from(keep)
  }
  const pack = out => {
    const map = new Map(), verts = [], uvs = [], faces = []
    const at = i => { let j = map.get(i); if (j === undefined) { j = verts.length / 3; map.set(i, j); verts.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); uvs.push(uv[i * 2], uv[i * 2 + 1]) } return j }
    for (let i = 0; i < out.length; i += 3) { const a = out[i], b = out[i + 1], c = out[i + 2]; if (a !== b && b !== c && a !== c) faces.push([at(a), at(b), at(c)]) }
    return { verts, faces, uvs }
  }
  const full = pack(idx)
  if (idx.length <= 3 || !BVH) return full
  const soup = ix => { const g = new THREE.BufferGeometry(), a = new Float32Array(ix.length * 3); for (let i = 0; i < ix.length; i++) { a[i * 3] = fp[ix[i] * 3]; a[i * 3 + 1] = fp[ix[i] * 3 + 1]; a[i * 3 + 2] = fp[ix[i] * 3 + 2] } g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g }
  const W = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [.5, .5, 0], [0, .5, .5], [.5, 0, .5], [1 / 3, 1 / 3, 1 / 3]], v = new THREE.Vector3(), hit = { point: new THREE.Vector3() }
  const far = (ix, bvh) => {                  // the farthest sample of mesh ix from the surface in bvh, stops early past tol
    for (let t = 0; t < ix.length; t += 3) for (const w of W) {
      const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3
      v.set(fp[a] * w[0] + fp[b] * w[1] + fp[c] * w[2], fp[a + 1] * w[0] + fp[b + 1] * w[1] + fp[c + 1] * w[2], fp[a + 2] * w[0] + fp[b + 2] * w[1] + fp[c + 2] * w[2])
      const h = bvh.closestPointToPoint(v, hit, tol, tol); if (!h || h.distance > tol) return Infinity     // the threshold only prunes the search: check the distance too
    }
    return 0
  }
  const origBvh = new BVH(soup(idx))
  for (const r of [ratio, ratio + (1 - ratio) / 3, ratio + (1 - ratio) * 2 / 3]) {
    const target = Math.max(3, Math.floor(n * r / 3) * 3)
    const [out] = S.simplifyWithAttributes(idx, fp, 3, fu, 2, [0.5, 0.5], lock, target, error, ['ErrorAbsolute', 'LockBorder'])
    if (out.length >= idx.length) return full
    if (far(idx, new BVH(soup(out))) === 0 && far(out, origBvh) === 0) return pack(out)
  }
  return full
}

// Fewest MeshParts: anchored meshes that look the same (texture, colour, material, transparency) join into world-space meshes
// of up to MERGE_TRIS triangles (Roblox's per-mesh cap is 20k), split by place so each piece stays compact. Rig limbs and loose
// (unanchored) meshes keep their own part. Hundreds of parts become a few dozen: one model, far fewer draw calls.
const MERGE_TRIS = 19000
function mergeMeshes(ctx, root) {
  const pools = new Map()
  for (const me of ctx.meshes) {
    const o = ctx.objs[me.id] || {}
    if (!me.parent || me.linked || propOf(me.node, 'Anchored')[2] === false || me.tris > MERGE_TRIS) continue   // an uploaded mesh keeps its own asset
    const k = [o.texture || '', o.color, o.material, +o.transparency || 0, +o.smooth || 0].join('|')
    if (!pools.has(k)) pools.set(k, []); pools.get(k).push(me)
  }
  const gone = new Set(), made = []
  const split = list => {
    const tot = list.reduce((a, m) => a + m.tris, 0)
    if (tot <= MERGE_TRIS || list.length < 2) return [list]
    const lo = [0, 1, 2].map(j => Math.min(...list.map(m => m.pos[j]))), hi = [0, 1, 2].map(j => Math.max(...list.map(m => m.pos[j])))
    const ax = [0, 1, 2].reduce((b, j) => hi[j] - lo[j] > hi[b] - lo[b] ? j : b, 0), sorted = [...list].sort((a, b) => a.pos[ax] - b.pos[ax])
    // as few pieces as the cap allows: k slabs along the longest side, each filled to about tot / k; an overfull slab splits again
    const k = Math.ceil(tot / MERGE_TRIS), out = []
    let cur = [], acc = 0
    for (const m of sorted) {
      if (cur.length && acc + m.tris > MERGE_TRIS) { out.push(cur); cur = []; acc = 0 }
      cur.push(m); acc += m.tris
      if (acc >= tot / k && out.length < k - 1) { out.push(cur); cur = []; acc = 0 }
    }
    if (cur.length) out.push(cur)
    return out
  }
  for (const list of pools.values()) for (const chunk of split(list)) {
    if (chunk.length < 2) continue
    const verts = [], faces = [], uvs = [], lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
    for (const me of chunk) {
      const v = me.geo.verts, base = verts.length / 3, flip = me.s[0] * me.s[1] * me.s[2] < 0, nv = v.length / 3
      for (let i = 0; i < v.length; i += 3) {
        const w = add(mv(me.R, [v[i] * me.s[0], v[i + 1] * me.s[1], v[i + 2] * me.s[2]]), me.t)
        verts.push(...w); for (let j = 0; j < 3; j++) { if (w[j] < lo[j]) lo[j] = w[j]; if (w[j] > hi[j]) hi[j] = w[j] }
      }
      const U = me.geo.uvs; for (let i = 0; i < nv * 2; i++) uvs.push(U && U.length >= nv * 2 ? U[i] : 0)
      for (const f of me.geo.faces || []) { const g = f.map(i => i + base); faces.push(flip ? g.reverse() : g) }
      gone.add(me); me.parent.kids = me.parent.kids.filter(k => k !== me.node)
    }
    const c = [0, 1, 2].map(j => (lo[j] + hi[j]) / 2), size = [0, 1, 2].map(j => Math.max(0.05, hi[j] - lo[j])), o0 = ctx.objs[chunk[0].id] || {}
    const entry = { name: `Mesh ${made.length + 1}`, id: chunk[0].id, geo: { verts, faces, uvs }, s: [1, 1, 1], c, R: I3, t: [0, 0, 0], pos: c, smooth: chunk[0].smooth, tris: chunk.reduce((a, m) => a + m.tris, 0), parent: root }
    entry.node = node('MeshPart', entry.name, baseProps(o0, size, I3, c), [node('StringValue', 'UmbrioMesh', [['Value', 'str', '']])])
    root.kids.push(entry.node); made.push(entry)
  }
  ctx.meshes = [...ctx.meshes.filter(m => !gone.has(m)), ...made]
  const prune = n => { n.kids = n.kids.filter(k => { if (k.cls === 'Model') { prune(k); return k.kids.length > 0 } return true }) }   // Models left empty go
  prune(root)
  let models = 0; const count = n => { for (const k of n.kids) if (k.cls === 'Model') { models++; count(k) } }; count(root); ctx.counts.models = models
}

// Flipbook effect -> an invisible holder part with a ParticleEmitter playing the same sheet (Grid8x8/4x4/2x2, one particle
// of the card's size). Sheet image ids come from opts.textureAssets (tex id -> rbxassetid of the uploaded image). Rate 0: the
// model's UmbrioPlay script Emits it at its StartTime on the animation; in a rig the holder rides its limb like armor does.
const FLIP_GRID = { 2: ['Grid2x2', 1], 4: ['Grid4x4', 2], 8: ['Grid8x8', 3] }
function flipNode(ctx, o, F, name) {
  const r = rigid(F), img = ctx.opts.textureAssets?.[o.tex], g = FLIP_GRID[o.grid || 4] || FLIP_GRID[4], size = Math.max(0.1, (o.size ?? 8) * (Math.abs(r.s[0]) + Math.abs(r.s[1])) / 2)
  if (!img) { ctx.notes.push(`${name}: flipbook sheet ${o.tex} not uploaded (opts.textureAssets), skipped`); ctx.counts.skipped++; return null }
  const life = +(o.loop ? o.dur : o.life) || 1   // ZOffset below: drawn over the body it bursts from, like the Sandbox card
  const pe = node('ParticleEmitter', name, [['Texture', 'content', img], ['FlipbookLayout', 'enum', ['ParticleFlipbookLayout', g[0], g[1]]],
    ['FlipbookMode', 'enum', ['ParticleFlipbookMode', o.loop ? 'Loop' : 'OneShot', o.loop ? 0 : 1]], ['Lifetime', 'nrange', [life, life]], ['Rate', 'num', 0],
    ['Speed', 'nrange', [0, 0]], ['Size', 'nseq', size], ['LightEmission', 'num', o.blend === 'add' ? 1 : 0], ['LightInfluence', 'num', 0],
    ['LockedToPart', 'bool', true], ['Enabled', 'bool', true], ['ZOffset', 'num', Math.min(4, size * 0.35)]], [node('NumberValue', 'StartTime', [['Value', 'num', +o.start || 0]])])
  ctx.counts.effects = (ctx.counts.effects || 0) + 1
  return node('Part', name, [['Shape', 'enum', PT.Block], ['Size', 'v3', [0.2, 0.2, 0.2]], ['CFrame', 'cf', { R: r.R, t: r.t }], ['Transparency', 'num', 1],
    ['Anchored', 'bool', true], ['CanCollide', 'bool', false], ['CanQuery', 'bool', false], ['CanTouch', 'bool', false], ['Massless', 'bool', true], ['CastShadow', 'bool', false]], [pe])
}

function lightNode(ctx, o, F, name) {
  if (o.kind === 'directional') { ctx.notes.push(`${name}: directional light skipped (Roblox uses Lighting for the sun)`); ctx.counts.skipped++; return null }
  const r = rigid(F)
  ctx.counts.lights++
  const L = node(o.kind === 'spot' ? 'SpotLight' : 'PointLight', 'Light', [['Color', 'rgb', rgbOf(o.color || '#ffffff')], ['Brightness', 'num', o.intensity ?? 2], ['Range', 'num', Math.min(60, o.range ?? 16)], ['Shadows', 'bool', !!o.shadow]])
  if (o.kind === 'spot') L.props.push(['Angle', 'num', Math.min(180, o.angle ?? 45)], ['Face', 'enum', ['NormalId', 'Bottom', 4]])
  return node('Part', name, [['Shape', 'enum', PT.Block], ['Size', 'v3', [1, 1, 1]], ['CFrame', 'cf', { R: r.R, t: r.t }], ['Transparency', 'num', 1], ['Anchored', 'bool', true], ['CanCollide', 'bool', false]], [L])
}

function strokeNode(ctx, o, F, name) {
  const pts = (o.points || []).filter(p => p?.length >= 3), rad = o.radius ?? 0.05, r = rigid(F)
  if (pts.length < 2) return null
  const m = node('Model', name), step = Math.max(1, Math.ceil((pts.length - 1) / 200)), k = (Math.abs(r.s[0]) + Math.abs(r.s[1]) + Math.abs(r.s[2])) / 3
  const P = p => add(mv(F.A, p), F.t)
  for (let i = 0; i < pts.length - 1; i += step) {
    const pa = pts[i], pb = pts[Math.min(i + step, pts.length - 1)], a = P(pa), b = P(pb), d = sub(b, a), len = Math.hypot(...d)
    if (len < 1e-6) continue
    const x = d.map(v => v / len), z = norm(cross(x, Math.abs(x[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0])), y = cross(z, x)
    const w = Math.max(0.02, 2 * rad * k * ((pa[3] ?? 1) + (pb[3] ?? 1)) / 2)
    m.kids.push(node('Part', 'Segment', [['Shape', 'enum', PT.Cylinder], ...baseProps({ ...o, material: o.material || 'SmoothPlastic' }, [len, w, w], [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]], a.map((v, j) => v + d[j] / 2))]))
    ctx.counts.parts++
  }
  return m
}

/* ---------- R6 rig: HumanoidRootPart, Humanoid, Motor6Ds and KeyframeSequences ---------- */
const LIMB = { torso: 'Torso', head: 'Head', leftarm: 'Left Arm', rightarm: 'Right Arm', leftleg: 'Left Leg', rightleg: 'Right Leg' }
const limbName = n => LIMB[String(n || '').toLowerCase().replace(/[^a-z]/g, '')]
const JOINT = { Head: 'Neck', 'Left Arm': 'Left Shoulder', 'Right Arm': 'Right Shoulder', 'Left Leg': 'Left Hip', 'Right Leg': 'Right Hip' }
const R_NECK = [-1, 0, 0, 0, 0, 1, 0, 1, 0], R_RIGHT = [0, 0, 1, 0, 1, 0, -1, 0, 0], R_LEFT = [0, 0, -1, 0, 1, 0, 1, 0, 0]
const ROOT = { R: R_NECK, t: [0, 0, 0] }
// Roblox's PoseEasingDirection In/Out are swapped against normal easing names.
const POSE_EASE = { linear: ['Linear', 0, 'In', 0], step: ['Constant', 1, 'In', 0], ease: ['Cubic', 3, 'InOut', 2], smooth: ['Cubic', 3, 'InOut', 2], in: ['Cubic', 3, 'Out', 1], out: ['Cubic', 3, 'In', 0], bounce: ['Bounce', 4, 'In', 0], elastic: ['Elastic', 2, 'In', 0] }

function rigOf(ctx, gid) {
  const found = {}, all = desc(ctx.kids, gid)
  if (all.some(d => ctx.rigs.has(d))) return null // the innermost group is the rig
  for (const id of all) { const o = ctx.objs[id], k = limbName(o?.name); if (k && !found[k] && (o.type === 'part' || o.type === 'mesh') && o.visible !== false) found[k] = id }
  return Object.keys(found).length === 6 ? found : null
}

function rigify(ctx, gid, model, rig) {
  const nodes = {}
  for (const k in rig) { nodes[k] = ctx.nodeOf.get(rig[k]); if (!nodes[k] || !propOf(nodes[k], 'CFrame')) return }
  ctx.rigs.add(gid)
  ctx.counts.rigs++
  const fr = n => propOf(n, 'CFrame')[2], T = fr(nodes.Torso), tsz = propOf(nodes.Torso, 'Size')[2]
  const hrp = node('Part', 'HumanoidRootPart', [['Shape', 'enum', PT.Block], ['Size', 'v3', tsz.slice()], ['CFrame', 'cf', { R: T.R, t: T.t }], ['Transparency', 'num', 1], ['Anchored', 'bool', true], ['CanCollide', 'bool', false]])
  model.kids.unshift(hrp)
  for (const k in nodes) { setProp(nodes[k], 'Anchored', 'bool', false); setProp(nodes[k], 'Name', 'str', k) }   // Poses find limbs by exact R6 name ("Left Arm", not "Left arm")
  model.kids.push(node('Humanoid', 'Humanoid', [['RigType', 'enum', ['HumanoidRigType', 'R6', 0]]]))
  model.props.push(['PrimaryPart', 'ref', hrp])
  hrp.kids.push(node('Motor6D', 'RootJoint', [['Part0', 'ref', hrp], ['Part1', 'ref', nodes.Torso], ['C0', 'cf', ROOT], ['C1', 'cf', ROOT], ['MaxVelocity', 'num', 0.1]]))
  const C0 = {}
  for (const k of Object.keys(JOINT)) {
    const L = fr(nodes[k]), rel = rmul(rinv(T), L).t, side = rel[0] >= 0 ? 1 : -1
    const c0 = k === 'Head' ? { R: R_NECK, t: [0, tsz[1] / 2, 0] } : { R: side > 0 ? R_RIGHT : R_LEFT, t: [side * tsz[0] / 2, k.endsWith('Arm') ? tsz[1] / 4 : -tsz[1] / 2, 0] }
    C0[k] = c0
    nodes.Torso.kids.push(node('Motor6D', JOINT[k], [['Part0', 'ref', nodes.Torso], ['Part1', 'ref', nodes[k]], ['C0', 'cf', c0], ['C1', 'cf', rmul(rinv(L), rmul(T, c0))], ['MaxVelocity', 'num', 0.1]]))
  }
  // Everything else in the rig (armor, gear, eyes) rides the limb whose joint group holds it: a Motor6D to that limb,
  // unanchored, so it follows every animation instead of floating where it was built.
  const limbOf = {}; for (const k in rig) limbOf[ctx.objs[rig[k]]?.parent] ??= k
  const extra = [], taken = new Set(['HumanoidRootPart', ...Object.keys(rig)])
  for (const id of desc(ctx.kids, gid)) {
    const n = ctx.nodeOf.get(id)
    if (!n || Object.values(rig).includes(id) || !/Part$/.test(n.cls) || !propOf(n, 'CFrame')) continue
    let p = ctx.objs[id]?.parent, k = null
    while (p && p !== ctx.objs[gid]?.parent && !k) { k = limbOf[p] || null; p = ctx.objs[p]?.parent }
    k = k || 'Torso'
    const nm = propOf(n, 'Name'); let u = nm[2], i = 2   // poses find their part by name: names in a rig must be unique
    while (taken.has(u)) u = `${nm[2]} ${i++}`
    nm[2] = u; taken.add(u)
    const c0 = rmul(rinv(fr(nodes[k])), fr(n))
    setProp(n, 'Anchored', 'bool', false)
    nodes[k].kids.push(node('Motor6D', u, [['Part0', 'ref', nodes[k]], ['Part1', 'ref', n], ['C0', 'cf', c0], ['C1', 'cf', ID], ['MaxVelocity', 'num', 0.1]]))
    extra.push({ id, k, n, c0 })
  }
  // Show/hide keys (Roblox poses can't carry them): each part gets ShowAt / HideAt from the first visibility track on it or a
  // group above it; UmbrioPlay hides it until ShowAt (pieces appear one at a time) and hides it at HideAt (the head under the helm).
  const firstAnim = Object.values(ctx.scene.anims || {}).find(Boolean)
  if (firstAnim) for (const id of [...Object.values(rig), ...extra.map(e => e.id)]) {
    const n = ctx.nodeOf.get(id); let vis = null
    for (let p = id; p && !vis; p = ctx.objs[p]?.parent) vis = firstAnim.tracks?.[p]?.visible || null
    if (!n || !vis?.length) continue
    const on = t => { let v = true; for (const k of vis) if (k[0] <= t + 1e-6) v = !!k[1]; return v }
    const flip = vis.find(k => !!k[1] !== on(0))
    if (!flip) continue
    n.kids.push(node('NumberValue', on(0) ? 'HideAt' : 'ShowAt', [['Value', 'num', flip[0]]]))
  }
  const seqs = []
  for (const [aid, a] of Object.entries(ctx.scene.anims || {})) { const s = a && keyframeSeq(ctx, a, aid, gid, rig, nodes, C0, extra); if (s) seqs.push(s) }
  const anims = ctx.opts.animAssets || {}, playable = seqs.filter(q => anims[propOf(q, 'Name')[2]])
  for (const q of playable) model.kids.push(node('Animation', propOf(q, 'Name')[2], [['AnimationId', 'content', anims[propOf(q, 'Name')[2]]]]))
  if (playable.length) model.kids.push(node('Script', 'UmbrioPlay', [['Source', 'src', PLAY_LUA]]))
  if (seqs.length) { model.kids.push(node('ObjectValue', 'AnimSaves', [['Value', 'ref', null]], seqs)); ctx.counts.anims += seqs.length }
}

const EASE = {
  linear: u => u, ease: u => u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2, smooth: u => (1 - Math.cos(Math.PI * u)) / 2, in: u => u * u * u, out: u => 1 - (1 - u) ** 3,
  bounce: u => { const n = 7.5625, d = 2.75; return u < 1 / d ? n * u * u : u < 2 / d ? n * (u -= 1.5 / d) * u + 0.75 : u < 2.5 / d ? n * (u -= 2.25 / d) * u + 0.9375 : n * (u -= 2.625 / d) * u + 0.984375 },
  elastic: u => u === 0 || u === 1 ? u : 2 ** (-10 * u) * Math.sin((u * 10 - 0.75) * (2 * Math.PI / 3)) + 1
}
export function sampleTrack(keys, t) {
  if (!keys?.length) return undefined
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0, e] = keys[i], [t1, v1] = keys[i + 1]
    if (t >= t1) continue
    if (e === 'step') return v0
    const u = (EASE[e] || EASE.linear)((t - t0) / ((t1 - t0) || 1))
    return Array.isArray(v0) ? v0.map((x, j) => x + ((v1?.[j] ?? x) - x) * u) : typeof v0 === 'number' ? v0 + (v1 - v0) * u : u < 1 ? v0 : v1
  }
  return keys[keys.length - 1][1]
}
const sampleObj = (tr, t) => { if (!tr) return undefined; const v = {}; for (const ch of ['pos', 'rot', 'scale']) if (tr[ch]?.length) v[ch] = sampleTrack(tr[ch], t); return v }
const easeAt = (tr, t) => { let e = 'linear'; for (const ch of ['rot', 'pos']) for (const k of tr?.[ch] || []) if (k[0] <= t + 1e-6) e = k[2] || 'linear'; return e }

function keyframeSeq(ctx, a, aid, gid, rig, nodes, C0, extra = []) {
  const tracks = a.tracks || {}, involved = new Set([gid, ...desc(ctx.kids, gid)])
  const used = Object.keys(tracks).filter(id => involved.has(id) && tracks[id])
  if (!used.length) return null
  const times = new Set([0])
  if (+a.len > 0) times.add(+a.len)
  for (const id of used) for (const ch of Object.values(tracks[id])) if (Array.isArray(ch)) for (const k of ch) if (Number.isFinite(+k?.[0])) times.add(+k[0])
  const rest = {}, off = {}
  for (const k in rig) { rest[k] = propOf(nodes[k], 'CFrame')[2]; const o = rigid(ctx.world(rig[k])); off[k] = rmul(rinv({ R: o.R, t: o.t }), rest[k]) }
  for (const e of extra) { const o = rigid(ctx.world(e.id)); e.off = rmul(rinv({ R: o.R, t: o.t }), propOf(e.n, 'CFrame')[2]) }
  const seq = node('KeyframeSequence', a.name || aid, [['Loop', 'bool', a.loop !== false], ['Priority', 'enum', ['AnimationPriority', 'Action', 2]]])
  const pose = (name, cf, e = 'linear') => { const p = POSE_EASE[e] || POSE_EASE.linear; return node('Pose', name, [['CFrame', 'cf', cf], ['EasingDirection', 'enum', ['PoseEasingDirection', p[2], p[3]]], ['EasingStyle', 'enum', ['PoseEasingStyle', p[0], p[1]]], ['Weight', 'num', 1]]) }
  for (const t of [...times].sort((x, y) => x - y)) {
    const pw = worldFn(ctx.objs, id => sampleObj(tracks[id], t)), P = {}
    for (const k in rig) { const o = rigid(pw(rig[k])); P[k] = rmul({ R: o.R, t: o.t }, off[k]) }
    const Tr = rest.Torso, Tp = P.Torso
    const torso = pose('Torso', rmul(rinv(ROOT), rmul(rmul(rinv(Tr), Tp), ROOT)), easeAt(tracks[rig.Torso] || tracks[gid], t))
    const limbPose = { Torso: torso }
    for (const k of Object.keys(JOINT)) {
      const D = rmul(rmul(rinv(Tp), P[k]), rinv(rmul(rinv(Tr), rest[k])))
      torso.kids.push(limbPose[k] = pose(k, rmul(rinv(C0[k]), rmul(D, C0[k])), easeAt(tracks[rig[k]], t)))
    }
    for (const e of extra) {   // armor and gear: their own moves (fly in, bob) relative to the limb they ride
      const o = rigid(pw(e.id)), W = rmul({ R: o.R, t: o.t }, e.off)
      let tr = null; for (let p = e.id; p && !tr; p = ctx.objs[p]?.parent) tr = tracks[p] || null
      limbPose[e.k].kids.push(pose(propOf(e.n, 'Name')[2], rmul(rinv(e.c0), rmul(rinv(P[e.k]), W)), easeAt(tr, t)))
    }
    seq.kids.push(node('Keyframe', 'Keyframe', [['Time', 'num', t]], [node('Pose', 'HumanoidRootPart', [['CFrame', 'cf', ID], ['Weight', 'num', 1]], [torso])]))
  }
  return seq
}

/* ---------- writers ---------- */
const XNAME = { Shape: 'shape', Size: 'size' }
const esc = s => String(s).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const R_KEYS = ['R00', 'R01', 'R02', 'R10', 'R11', 'R12', 'R20', 'R21', 'R22']
function xmlProp([k, t, v], ref) {
  const n = t === 'nseq' || t === 'nrange' ? k : XNAME[k] || k   // only BasePart's Size/Shape use the lowercase XML names
  switch (t) {
    case 'str': return `<string name="${n}">${esc(v)}</string>`
    case 'bool': return `<bool name="${n}">${!!v}</bool>`
    case 'num': return `<float name="${n}">${num(v)}</float>`
    case 'v3': return `<Vector3 name="${n}"><X>${num(v[0])}</X><Y>${num(v[1])}</Y><Z>${num(v[2])}</Z></Vector3>`
    case 'cf': return `<CoordinateFrame name="${n}"><X>${num(v.t[0])}</X><Y>${num(v.t[1])}</Y><Z>${num(v.t[2])}</Z>${R_KEYS.map((r, i) => `<${r}>${num(v.R[i])}</${r}>`).join('')}</CoordinateFrame>`
    case 'rgb8': return `<Color3uint8 name="Color3uint8">${0xff000000 + v[0] * 65536 + v[1] * 256 + v[2]}</Color3uint8>`
    case 'rgb': return `<Color3 name="${n}"><R>${num(v[0] / 255)}</R><G>${num(v[1] / 255)}</G><B>${num(v[2] / 255)}</B></Color3>`
    case 'enum': return `<token name="${n}">${v[2]}</token>`
    case 'ref': return `<Ref name="${n}">${v ? ref(v) : 'null'}</Ref>`
    case 'content': return `<Content name="${n}"><url>${esc(v)}</url></Content>`
    case 'nrange': return `<NumberRange name="${n}">${num(v[0])} ${num(v[1])} </NumberRange>`
    case 'nseq': return `<NumberSequence name="${n}">0 ${num(v)} 0 1 ${num(v)} 0 </NumberSequence>`
    case 'src': return `<ProtectedString name="${n}"><![CDATA[${String(v).replace(/]]>/g, ']]]]><![CDATA[>')}]]></ProtectedString>`
  }
  return ''
}
export function writeRbxmx(root) {
  const refs = new Map()
  const ref = n => { if (!refs.has(n)) refs.set(n, 'RBX' + (refs.size + 1).toString(16).toUpperCase().padStart(32, '0')); return refs.get(n) }
  const out = ['<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">', '\t<External>null</External>', '\t<External>nil</External>']
  const walk = (n, d) => {
    const tab = '\t'.repeat(d)
    out.push(`${tab}<Item class="${n.cls}" referent="${ref(n)}">`, `${tab}\t<Properties>`)
    for (const p of n.props) out.push(`${tab}\t\t${xmlProp(p, ref)}`)
    out.push(`${tab}\t</Properties>`)
    for (const c of n.kids) walk(c, d + 1)
    out.push(`${tab}</Item>`)
  }
  for (const n of Array.isArray(root) ? root : [root]) walk(n, 1)
  out.push('</roblox>')
  return out.join('\n') + '\n'
}
const luaStr = s => '"' + String(s).replace(/[\\"]/g, '\\$&').replace(/[\x00-\x1f\x7f]/g, c => '\\' + String(c.charCodeAt(0)).padStart(3, '0')) + '"'
function luaVal(t, v) {
  switch (t) {
    case 'str': return luaStr(v)
    case 'bool': return String(!!v)
    case 'num': return num(v)
    case 'v3': return `Vector3.new(${v.map(num).join(', ')})`
    case 'cf': return `CFrame.new(${[...v.t, ...v.R].map(num).join(', ')})`
    case 'rgb8': case 'rgb': return `Color3.fromRGB(${v.join(', ')})`
    case 'enum': return v[0] === 'Material' ? `M(${luaStr(v[1])})` : `Enum.${v[0]}.${v[1]}`
  }
  return 'nil'
}
export function writeLua(root, counts = {}) {
  const L = [
    `-- ${String(root.props[0][2]).replace(/[\r\n]/g, ' ')}: Roblox Studio builder made by Studio (${counts.parts || 0} parts).`,
    '-- Paste into View > Command Bar and press Enter. Meshes are skipped (export Roblox model for the meshes .fbx).',
    'local I = {}',
    'local function M(n) local ok, m = pcall(function() return Enum.Material[n] end) return ok and m or Enum.Material.Plastic end',
    'local o']
  const idx = new Map(), late = []
  const emit = (n, parent) => {
    if (n.cls === 'MeshPart') { L.push(`-- mesh skipped: ${String(propOf(n, 'Name')[2]).replace(/[\r\n]/g, ' ')} (${n.mesh || 'no file'})`); return }
    const s = [`o = Instance.new("${n.cls}")`]
    for (const [k, t, v] of n.props) { if (t === 'ref') late.push([n, k, v]); else s.push(`o.${k} = ${luaVal(t, v)}`) }
    idx.set(n, idx.size + 1)
    s.push(`I[${idx.size}] = o`)
    if (parent) s.push(`o.Parent = I[${idx.get(parent)}]`)
    L.push(s.join(' '))
    for (const c of n.kids) emit(c, n)
  }
  emit(root, null)
  for (const [n, k, v] of late) if (!v || idx.has(v)) L.push(`I[${idx.get(n)}].${k} = ${v ? `I[${idx.get(v)}]` : 'nil'}`)
  L.push('I[1].Parent = workspace', 'game:GetService("Selection"):Set({I[1]})',
    'pcall(function() game:GetService("ChangeHistoryService"):SetWaypoint("Umbrio Sandbox build") end)', `print("Umbrio Sandbox: built " .. I[1].Name .. " (${idx.size} instances)")`)
  return L.join('\n') + '\n'
}
export function toObj(geo, name = 'mesh', s = [1, 1, 1]) {
  const v = geo.verts, uv = geo.uvs, L = [`# Umbrio Sandbox mesh: ${String(name).replace(/[\r\n]/g, ' ')}`, `o ${safeName(name)}`]
  for (let i = 0; i < v.length; i += 3) L.push(`v ${num(v[i] * s[0])} ${num(v[i + 1] * s[1])} ${num(v[i + 2] * s[2])}`)
  const hasUv = uv && uv.length / 2 === v.length / 3
  if (hasUv) for (let i = 0; i < uv.length; i += 2) L.push(`vt ${num(uv[i])} ${num(uv[i + 1])}`)
  const flip = s[0] * s[1] * s[2] < 0
  for (const f of geo.faces || []) L.push('f ' + (flip ? [...f].reverse() : f).map(i => hasUv ? `${i + 1}/${i + 1}` : i + 1).join(' '))
  return L.join('\n') + '\n'
}
// All placeholder meshes as one binary glTF, each a node named by its key at the origin, vertices in its placeholder's frame
// (object scale baked, centred on the placeholder). look(mesh) -> {color: [r,g,b] 0..1 sRGB, image: key, uv(u, v) -> [u, v]}
// with glTF's top-left uv origin; images: {key: PNG bytes}.
const RB_TRI_LIMIT = 20000                       // Studio's 3D importer refuses (or decimates) a single mesh above this
const FBX_MAX = 19e6                             // Roblox caps an upload around 20 MB: a bigger build splits into the fewest files under it
// Meshes -> k runs of about equal triangle count, in order.
export function splitMeshes(meshes, k) {
  if (k <= 1) return [meshes]
  const total = meshes.reduce((a, m) => a + m.tris, 0), out = [[]]; let n = 0
  for (const m of meshes) { if (n >= total / k * out.length && out.length < k && out[out.length - 1].length) out.push([]); out[out.length - 1].push(m); n += m.tris }
  return out
}
export const meshFile = (name, i, n) => n > 1 ? `${name}-meshes-${i + 1}.fbx` : `${name}-meshes.fbx`
// One mesh as welded triangle arrays in its placeholder's frame: object scale baked, centred, normals unit length, uvs in
// a top-left origin (look.uv maps them), zero-area triangles dropped. null when nothing is left.
function meshArrays(me, Lk) {
  const bg = M.toBufferGeometry(me.geo, { smooth: me.smooth }), P = bg.attributes.position.array, N = bg.attributes.normal.array, U = bg.attributes.uv.array
  const s = me.s, c = me.c, flip = s[0] * s[1] * s[2] < 0, n = P.length / 3
  const seen = new Map(), pos = [], nor = [], uv = [], idx = new Uint32Array(n)
  for (let i = 0; i < n; i++) {
    const x = P[i * 3] * s[0] - c[0], y = P[i * 3 + 1] * s[1] - c[1], z = P[i * 3 + 2] * s[2] - c[2]
    let nx = N[i * 3] / s[0], ny = N[i * 3 + 1] / s[1], nz = N[i * 3 + 2] / s[2]; const l = Math.hypot(nx, ny, nz)
    if (l > 1e-9) { nx /= l; ny /= l; nz /= l } else { nx = 0; ny = 1; nz = 0 }        // a zero-area face has no normal
    const [u, v] = Lk.uv ? Lk.uv(U[i * 2], U[i * 2 + 1]) : [U[i * 2], 1 - U[i * 2 + 1]]
    const k = [x, y, z, nx, ny, nz, u, v].map(q => Math.round(q * 1e5)).join(',')
    let j = seen.get(k)
    if (j === undefined) { j = pos.length / 3; seen.set(k, j); pos.push(x, y, z); nor.push(nx, ny, nz); uv.push(u, v) }
    idx[i] = j
  }
  const tri = [], face = [], TF = bg.userData.triFace
  for (let i = 0; i < n; i += 3) { const a = idx[i], b = idx[flip ? i + 2 : i + 1], d = idx[flip ? i + 1 : i + 2]; if (a !== b && b !== d && a !== d) { tri.push(a, b, d); face.push(TF ? TF[i / 3] : i / 3) } }
  M.releaseGeometry?.(bg)
  return tri.length ? { pos, nor, uv, tri, face, Lk } : null
}
// One binary FBX 7.4 holding every placeholder mesh: a Model per mesh named by its key at the origin, its triangles in the
// placeholder's frame. Arrays are zlib-compressed (FBX array encoding 1, what 3D modeling software writes), so a whole
// build fits one Import 3D. deflate: bytes -> zlib bytes (fflate's zlibSync); uvs come back to FBX's bottom-left origin.
// world: true writes each mesh at its place in the build (named after it, no marker cubes), so Import 3D alone gives the
// assembled model; false keeps every mesh at the origin for link-meshes.lua.
export function toFbx(meshes, look = () => ({}), images = {}, deflate = null, world = false) {
  const te = new TextEncoder()
  let next = 1000000
  const id = () => ++next
  const S = v => ['S', v], I = v => ['I', v], D = v => ['D', v], L = v => ['L', v]
  const N = (name, props = [], kids = []) => [name, props, kids], one = (name, p) => N(name, [p])
  const P = (n, t, l, f, ...v) => N('P', [S(n), S(t), S(l), S(f), ...v])
  const P70 = (...ps) => N('Properties70', [], ps)
  const objects = [], links = [], matKey = new Map(), texOf = new Map(), count = { Model: 0, Geometry: 0, Material: 0, Texture: 0, Video: 0 }
  const material = Lk => {
    const col = Lk.color || [1, 1, 1], k = col.join(',') + '|' + (Lk.image ?? '')
    if (matKey.has(k)) return matKey.get(k)
    const mid = id(), name = 'M' + matKey.size; count.Material++
    objects.push(N('Material', [L(mid), S(name + '\0\x01Material'), S('')], [one('Version', I(102)), one('ShadingModel', S('phong')), one('MultiLayer', I(0)),
      P70(P('ShadingModel', 'KString', '', '', S('Phong')), P('DiffuseColor', 'Color', '', 'A', ...col.map(D)), P('DiffuseFactor', 'Number', '', 'A', D(1)),
        P('SpecularColor', 'Color', '', 'A', D(0.1), D(0.1), D(0.1)), P('Shininess', 'Number', '', 'A', D(8)), P('Opacity', 'Number', '', 'A', D(1)))]))
    if (Lk.image != null && images[Lk.image]) {
      let tid = texOf.get(Lk.image)
      if (!tid) {
        tid = id(); const vid = id(), f = `palette${texOf.size + 1}.png`; count.Texture++; count.Video++; texOf.set(Lk.image, tid)
        objects.push(N('Video', [L(vid), S(f + '\0\x01Video'), S('Clip')], [one('Type', S('Clip')), P70(P('Path', 'KString', 'XRefUrl', '', S(f))), one('UseMipMap', I(0)), one('Filename', S(f)), one('RelativeFilename', S(f)), one('Content', ['R', images[Lk.image]])]))
        objects.push(N('Texture', [L(tid), S(f + '\0\x01Texture'), S('')], [one('Type', S('TextureVideoClip')), one('Version', I(202)), one('TextureName', S(f + '\0\x01Texture')),
          P70(P('UseMaterial', 'bool', '', '', I(1))), one('Media', S(f + '\0\x01Video')), one('FileName', S(f)), one('RelativeFilename', S(f)),
          N('ModelUVTranslation', [D(0), D(0)]), N('ModelUVScaling', [D(1), D(1)]), one('Texture_Alpha_Source', S('None')), N('Cropping', [I(0), I(0), I(0), I(0)])]))
        links.push(['OO', vid, tid])
      }
      links.push(['OP', tid, mid, 'DiffuseColor'])
    }
    matKey.set(k, mid)
    return mid
  }
  const CUBE = { verts: [-.5, -.5, -.5, .5, -.5, -.5, .5, .5, -.5, -.5, .5, -.5, -.5, -.5, .5, .5, -.5, .5, .5, .5, .5, -.5, .5, .5],
    faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]] }
  const cal = [['UMBCAL0', [0, 0, 0]], ['UMBCALX', [CAL_L, 0, 0]], ['UMBCALY', [0, CAL_L, 0]], ['UMBCALZ', [0, 0, CAL_L]]]
    .map(([key, o]) => ({ key, geo: CUBE, s: [1, 1, 1], c: o.map(v => -v), cal: true }))
  const names = new Map(), uniq = n => { const b = String(n || 'Mesh').replace(/[\x00-\x1f]/g, ' ').slice(0, 60); const k = (names.get(b) || 0) + 1; names.set(b, k); return k > 1 ? `${b} ${k}` : b }
  for (const me of world ? meshes : [...meshes, ...cal]) {
    const a = meshArrays(me, me.cal ? {} : (look(me) || {}))
    if (!a) continue
    const { pos, nor, uv, tri, face, Lk } = a
    // the two triangles of a quad face go back to the quad (4 corners, not 6): the importer splits it again
    const poly = []
    for (let t = 0; t < face.length; t++) {
      const A = tri.slice(t * 3, t * 3 + 3)
      if (t + 1 < face.length && face[t + 1] === face[t] && face[t + 2] !== face[t]) {
        const B = tri.slice(t * 3 + 3, t * 3 + 6), sh = A.filter(v => B.includes(v))
        if (sh.length === 2) {
          const r = A.findIndex(v => !sh.includes(v)), [p0, p1, p2] = [A[r], A[(r + 1) % 3], A[(r + 2) % 3]], q = B.find(v => !sh.includes(v))
          // B must run p2 -> p1 the other way round the shared edge (same winding), or the quad would fold
          const bi = B.indexOf(p2); if (B[(bi + 1) % 3] === p1 && splitsBothWays(pos, p0, p1, q, p2)) { poly.push([p0, p1, q, p2]); t++; continue }
        }
      }
      poly.push(A)
    }
    const nt = poly.reduce((k, p) => k + p.length, 0)
    // control points weld by position only (normals and uvs stay per corner), so edges connect
    const keys = new Map(), remap = new Int32Array(pos.length / 3), verts = []
    for (let i = 0; i < remap.length; i++) {
      const k = Math.round(pos[i * 3] * 1e5) + ',' + Math.round(pos[i * 3 + 1] * 1e5) + ',' + Math.round(pos[i * 3 + 2] * 1e5)
      let v = keys.get(k); if (v === undefined) { v = verts.length / 3; keys.set(k, v); verts.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]) }
      remap[i] = v
    }
    const pvi = new Int32Array(nt), nrm = new Float64Array(nt * 3), uvi = new Int32Array(nt)
    let c = 0
    for (const p of poly) for (let j = 0; j < p.length; j++, c++) {
      const i = p[j]
      pvi[c] = j === p.length - 1 ? ~remap[i] : remap[i]
      nrm[c * 3] = Math.fround(nor[i * 3]); nrm[c * 3 + 1] = Math.fround(nor[i * 3 + 1]); nrm[c * 3 + 2] = Math.fround(nor[i * 3 + 2])
      uvi[c] = i
    }
    // uvs dedupe to their distinct values (a palette has few): the per-corner index then repeats and packs small
    const uvKey = new Map(), uvList = [], uvOf = new Int32Array(uv.length / 2)
    for (let i = 0; i < uvOf.length; i++) {
      const u = Math.fround(uv[i * 2]), v = Math.fround(1 - uv[i * 2 + 1]), k = u + ',' + v
      let j = uvKey.get(k); if (j === undefined) { j = uvList.length / 2; uvKey.set(k, j); uvList.push(u, v) }
      uvOf[i] = j
    }
    for (let c = 0; c < uvi.length; c++) uvi[c] = uvOf[uvi[c]]
    const fuv = Float64Array.from(uvList)
    const gid = id(), mid = id(); count.Geometry++; count.Model++
    const label = world ? uniq(me.name) : me.key
    objects.push(N('Geometry', [L(gid), S(label + '\0\x01Geometry'), S('Mesh')], [one('GeometryVersion', I(124)), one('Vertices', ['d', Float64Array.from(verts, Math.fround)]), one('PolygonVertexIndex', ['i', pvi]),
      N('LayerElementNormal', [I(0)], [one('Version', I(102)), one('Name', S('')), one('MappingInformationType', S('ByPolygonVertex')), one('ReferenceInformationType', S('Direct')), one('Normals', ['d', nrm])]),
      N('LayerElementUV', [I(0)], [one('Version', I(101)), one('Name', S('UVMap')), one('MappingInformationType', S('ByPolygonVertex')), one('ReferenceInformationType', S('IndexToDirect')), one('UV', ['d', fuv]), one('UVIndex', ['i', uvi])]),
      N('LayerElementMaterial', [I(0)], [one('Version', I(101)), one('Name', S('')), one('MappingInformationType', S('AllSame')), one('ReferenceInformationType', S('IndexToDirect')), one('Materials', ['i', Int32Array.of(0)])]),
      N('Layer', [I(0)], [N('Version', [I(100)]), ...['Normal', 'UV', 'Material'].map(t => N('LayerElement', [], [one('Type', S('LayerElement' + t)), one('TypedIndex', I(0))]))])]))
    // placed: the mesh's frame (FBX eEulerXYZ turns X, then Y, then Z: three's 'ZYX' order)
    let tr = [0, 0, 0], rot = [0, 0, 0]
    if (world && me.pos) {
      tr = me.pos
      const R3 = me.R || I3, e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().set(R3[0], R3[1], R3[2], 0, R3[3], R3[4], R3[5], 0, R3[6], R3[7], R3[8], 0, 0, 0, 0, 1), 'ZYX')
      rot = [e.x, e.y, e.z].map(v => v * R2D)
    }
    objects.push(N('Model', [L(mid), S(label + '\0\x01Model'), S('Mesh')], [one('Version', I(232)),
      P70(P('Lcl Translation', 'Lcl Translation', '', 'A', ...tr.map(D)), P('Lcl Rotation', 'Lcl Rotation', '', 'A', ...rot.map(D)), P('DefaultAttributeIndex', 'int', 'Integer', '', I(0)), P('InheritType', 'enum', '', '', I(1))),
      one('Shading', ['C', true]), one('Culling', S('CullingOff'))]))
    links.push(['OO', mid, 0], ['OO', gid, mid], ['OO', material(Lk), mid])
  }
  const gi = (n, v) => P(n, 'int', 'Integer', '', I(v)), types = Object.entries(count).filter(([, n]) => n)
  const top = [
    N('FBXHeaderExtension', [], [one('FBXHeaderVersion', I(1003)), one('FBXVersion', I(7400)), one('EncryptionType', I(0)),
      N('CreationTimeStamp', [], [one('Version', I(1000)), ...['Year', 'Month', 'Day', 'Hour', 'Minute', 'Second', 'Millisecond'].map((k, i) => one(k, I([2026, 1, 1, 0, 0, 0, 0][i])))]), one('Creator', S('Umbrio Sandbox'))]),
    one('FileId', ['R', new Uint8Array(FBX_FILE_ID)]), one('CreationTime', S('1970-01-01 10:00:00:000')), one('Creator', S('Umbrio Sandbox')),
    N('GlobalSettings', [], [one('Version', I(1000)), P70(gi('UpAxis', 1), gi('UpAxisSign', 1), gi('FrontAxis', 2), gi('FrontAxisSign', 1), gi('CoordAxis', 0), gi('CoordAxisSign', 1),
      gi('OriginalUpAxis', 1), gi('OriginalUpAxisSign', 1), P('UnitScaleFactor', 'double', 'Number', '', D(100)), P('OriginalUnitScaleFactor', 'double', 'Number', '', D(100)))]),
    N('Documents', [], [one('Count', I(1)), N('Document', [L(id()), S(''), S('Scene')], [P70(P('SourceObject', 'object', '', ''), P('ActiveAnimStackName', 'KString', '', '', S(''))), one('RootNode', L(0))])]),
    N('References'),
    N('Definitions', [], [one('Version', I(100)), one('Count', I(1 + types.reduce((a, [, n]) => a + n, 0))), N('ObjectType', [S('GlobalSettings')], [one('Count', I(1))]),
      ...types.map(([k, n]) => N('ObjectType', [S(k)], [one('Count', I(n))]))]),
    N('Objects', [], objects),
    N('Connections', [], links.map(([k, a, b, p]) => N('C', p ? [S(k), L(a), L(b), S(p)] : [S(k), L(a), L(b)])))
  ]
  return fbxWrite(top, te, deflate)
}
const FBX_FILE_ID = [0x28, 0xb3, 0x2a, 0xeb, 0xb6, 0x24, 0xcc, 0xc2, 0xbf, 0xc8, 0xb0, 0x2a, 0xa9, 0x2b, 0xfc, 0xf1]
const FBX_FOOT_ID = [0xfa, 0xbc, 0xab, 0x09, 0xd0, 0xc8, 0xd4, 0x66, 0xb1, 0x76, 0xfb, 0x83, 0x1c, 0xf7, 0x26, 0x7e]
const FBX_FOOT_END = [0xf8, 0x5a, 0x8c, 0x6a, 0xde, 0xf5, 0xd9, 0x7e, 0xec, 0xe9, 0x0c, 0xe3, 0x75, 0x8f, 0x29, 0x0b]
// A flat, convex quad: both diagonals give the same surface, so however the importer splits it the shape stays.
function splitsBothWays(P, a, b, c, d) {
  const v = i => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], A = v(a), B = v(b), C = v(c), Dd = v(d)
  const n = (x, y, z) => norm(cross(sub(y, x), sub(z, x)))
  const t = [n(A, B, C), n(A, C, Dd), n(A, B, Dd), n(B, C, Dd)]
  if (t.some(x => !x)) return false
  return t.every(x => dot(x, t[0]) > 0.9999)
}
// Node = [name, props, kids]; props [type, value]: I int32, D double, L int64, S string, R bytes, C bool, d Float64Array, i Int32Array.
function fbxWrite(top, te, deflate) {
  const prep = n => {
    n[1] = n[1].map(([t, v]) => {
      if (t === 'S') return [t, te.encode(v)]
      if (t !== 'd' && t !== 'i') return [t, v]
      const raw = new Uint8Array(v.buffer, v.byteOffset, v.byteLength), z = deflate && raw.length > 128 ? deflate(raw) : null
      return [t, { n: v.length, enc: z ? 1 : 0, bytes: z || raw }]
    })
    n[2] = n[2] || []; n[2].forEach(prep)
  }
  const psize = ([t, v]) => t === 'C' ? 2 : t === 'I' ? 5 : t === 'D' || t === 'L' ? 9 : t === 'S' || t === 'R' ? 5 + v.length : 13 + v.bytes.length
  const size = (n, last) => {
    n.pl = n[1].reduce((a, p) => a + psize(p), 0)
    let s = 13 + n[0].length + n.pl
    if (n[2].length) s += n[2].reduce((a, c, i) => a + size(c, i === n[2].length - 1), 0) + 13
    else if (!n[1].length && !last) s += 13
    n.sz = s; return s
  }
  top.forEach(prep)
  const body = 27 + top.reduce((a, n, i) => a + size(n, i === top.length - 1), 0) + 13
  const pad = ((body + 20 + 15) & ~15) - (body + 20) || 16
  const buf = new ArrayBuffer(body + 20 + pad + 140), dv = new DataView(buf), u8 = new Uint8Array(buf)
  let o = 0
  for (const ch of 'Kaydara FBX Binary  \0\x1a\0') u8[o++] = ch.charCodeAt(0)
  dv.setUint32(o, 7400, true); o += 4
  const w = n => {
    const end = o + n.sz
    dv.setUint32(o, end, true); dv.setUint32(o + 4, n[1].length, true); dv.setUint32(o + 8, n.pl, true); u8[o + 12] = n[0].length; o += 13
    for (const ch of n[0]) u8[o++] = ch.charCodeAt(0)
    for (const [t, v] of n[1]) {
      u8[o++] = t.charCodeAt(0)
      if (t === 'C') u8[o++] = v ? 1 : 0
      else if (t === 'I') { dv.setInt32(o, v, true); o += 4 }
      else if (t === 'D') { dv.setFloat64(o, v, true); o += 8 }
      else if (t === 'L') { dv.setBigInt64(o, BigInt(v), true); o += 8 }
      else if (t === 'S' || t === 'R') { dv.setUint32(o, v.length, true); u8.set(v, o + 4); o += 4 + v.length }
      else { dv.setUint32(o, v.n, true); dv.setUint32(o + 4, v.enc, true); dv.setUint32(o + 8, v.bytes.length, true); u8.set(v.bytes, o + 12); o += 12 + v.bytes.length }
    }
    n[2].forEach(w)
    o = end
  }
  top.forEach(w)
  o += 13
  u8.set(FBX_FOOT_ID, o); o += 20 + pad
  dv.setUint32(o, 7400, true); o += 124
  u8.set(FBX_FOOT_END, o)
  return u8
}
// Studio Command Bar script: after File > Import 3D of the meshes .fbx, moves every imported mesh into its placeholder (frame, size,
// colour, material, name, parent) and removes the placeholder and the leftover import model.
export const CAL_L = 64                    // studs between the calibration cubes in the .fbx
export const LINK_LUA = `-- Umbrio Sandbox: put the meshes from the -meshes .fbx into the placeholders of the inserted .rbxmx model.
-- 1. Insert the .rbxmx (right-click Workspace > Insert from File).  2. File > Import 3D the -meshes .fbx > Import.
-- 3. View > Command Bar, paste this whole file, press Enter. Run it again any time: it only touches unlinked placeholders.
-- The importer may turn the file's axes and change its units. Four marker cubes (UMBCAL0/X/Y/Z, ${CAL_L} studs apart in the
-- file) show exactly how, and every mesh gets that turn and scale undone before it goes into its placeholder.
local L = ${CAL_L}
local SMALL = 6                 -- studs: meshes smaller than this get box collision (and under 2 studs, no shadow)
local function tagOf(inst, pat)
	while inst and inst ~= workspace do
		local k = string.match(inst.Name, pat) if k then return k end
		inst = inst.Parent
	end
end
local holders, meshes, cal, roots = {}, {}, {}, {}
for _, d in ipairs(workspace:GetDescendants()) do
	if d:IsA("StringValue") and d.Name == "UmbrioMesh" and d.Parent and d.Parent:IsA("BasePart") then holders[#holders + 1] = d.Parent
	elseif d:IsA("BasePart") and not d:FindFirstChild("UmbrioMesh") then
		local c = tagOf(d, "^UMBCAL([0XYZ])")
		if c then if not cal[c] then cal[c] = d end
		else
			local k = d:IsA("MeshPart") and tagOf(d, "^(UMB%d%d%d%d%d)")
			if k and not meshes[k] then meshes[k] = d end
		end
	end
end
-- file axes -> Studio: Q (a turn) and s (unit scale), from where the importer put the marker cubes
local Q, s, calOk = CFrame.identity, nil, false
if cal["0"] and cal.X and cal.Y and cal.Z then
	local p0 = cal["0"].Position
	local cx, cy, cz = (cal.X.Position - p0) / L, (cal.Y.Position - p0) / L, (cal.Z.Position - p0) / L
	local sc = (cx.Magnitude + cy.Magnitude + cz.Magnitude) / 3
	if sc > 1e-6 then
		local function snap(v)        -- axis conversions are 90 degree turns: snap to the nearest axis when that close
			v = v.Unit
			for _, a in ipairs({ Vector3.xAxis, Vector3.yAxis, Vector3.zAxis }) do
				if math.abs(v:Dot(a)) > 0.99 then return a * math.sign(v:Dot(a)) end
			end
			return v
		end
		local x, y, z = snap(cx), snap(cy), snap(cz)
		if x:Cross(y):Dot(z) > 0.99 then Q, s, calOk = CFrame.fromMatrix(Vector3.zero, x, y, z), sc, true
		else warn("Umbrio: the importer mirrored the file; meshes are placed without the fix and may look flipped") end
	end
else warn("Umbrio: marker cubes UMBCAL0/X/Y/Z not found (import the -meshes .fbx unchanged); fitting meshes to placeholder size instead") end
local done, missing = 0, {}
for _, h in ipairs(holders) do
	local k = h.UmbrioMesh.Value
	local m = meshes[k]
	if m then
		local top = m while top.Parent and top.Parent ~= workspace do top = top.Parent end
		roots[top] = true
		m.Parent = h.Parent
		m.Name = h.Name
		if calOk then
			local turn = m.CFrame.Rotation
			m.Size = m.Size / s
			m.CFrame = CFrame.new(h.Position) * h.CFrame.Rotation * Q:Inverse() * turn
		else m.Size, m.CFrame = h.Size, h.CFrame end
		m.Color, m.Material, m.Transparency = h.Color, h.Material, h.Transparency
		m.Anchored, m.CanCollide = h.Anchored, h.CanCollide
		-- speed: detail lowers its triangles with distance; small pieces (books, candles, trim) get box collision and no shadow
		pcall(function() m.RenderFidelity = Enum.RenderFidelity.Automatic end)
		local big = math.max(m.Size.X, m.Size.Y, m.Size.Z)
		if big < SMALL then
			pcall(function() m.CollisionFidelity = Enum.CollisionFidelity.Box end)
			if big < SMALL / 3 then m.CastShadow = false end
		end
		for _, c in ipairs(h:GetChildren()) do if c.Name ~= "UmbrioMesh" then c.Parent = m end end
		local rig = h:FindFirstAncestorWhichIsA("Model")       -- joints that hold this piece now hold the mesh
		if rig then
			for _, j in ipairs(rig:GetDescendants()) do
				if j:IsA("JointInstance") or j:IsA("WeldConstraint") then
					if j.Part0 == h then j.Part0 = m end
					if j.Part1 == h then j.Part1 = m end
				end
			end
			if rig.PrimaryPart == h then rig.PrimaryPart = m end
		end
		h:Destroy() done = done + 1
	else missing[#missing + 1] = k end
end
for _, c in pairs(cal) do local top = c while top.Parent and top.Parent ~= workspace do top = top.Parent end roots[top] = true c:Destroy() end
for r in pairs(roots) do if r.Parent == workspace and not r:FindFirstChildWhichIsA("BasePart", true) then r:Destroy() end end
pcall(function() game:GetService("Selection"):Set({}) end)   -- hundreds of selected meshes make Studio crawl
pcall(function() game:GetService("ChangeHistoryService"):SetWaypoint("Umbrio link meshes") end)
print(("Umbrio: linked %d of %d meshes%s"):format(done, #holders, calOk and (" (import scale %.4g)"):format(s) or ""))
if #missing > 0 then warn("Umbrio: no imported mesh for " .. table.concat(missing, ", ", 1, math.min(#missing, 20)) .. (#missing > 20 and " ..." or "")) end
`
const findCls = (n, c) => n.cls === c ? n : n.kids.reduce((f, k) => f || findCls(k, c), null)
// animOnly: just the first KeyframeSequence, as an .rbxmx to upload as an Animation asset (then pass its id as animAssets).
export function toRbxmx(scene, opts = {}) { const m = robloxModel(scene, opts); return { ...m, xml: writeRbxmx(opts.animOnly ? findCls(m.root, 'KeyframeSequence') || m.root : m.root) } }
// The model plays its own equip animation and fires its effects at their StartTime, every loop. Delete it to drive both yourself.
export const PLAY_LUA = `--!strict
-- Umbrio Sandbox: plays this model's animation, shows each piece at its equip time and fires the particle effects in time with it.
local model = script.Parent
local humanoid = model:FindFirstChildOfClass("Humanoid") :: Humanoid
local animation = model:FindFirstChildOfClass("Animation") :: Animation
if not humanoid or not animation then return end
local animator = humanoid:FindFirstChildOfClass("Animator") or Instance.new("Animator")
animator.Parent = humanoid
local track = animator:LoadAnimation(animation)
local function visibility()
	for _, p in model:GetDescendants() do
		if p:IsA("BasePart") then
			local show = p:FindFirstChild("ShowAt") :: NumberValue?
			local hide = p:FindFirstChild("HideAt") :: NumberValue?
			if show or hide then
				local base = p:GetAttribute("UmbrioTransparency")
				if base == nil then base = p.Transparency p:SetAttribute("UmbrioTransparency", base) end
				p.Transparency = if show then 1 else base
				if show then task.delay(show.Value, function() p.Transparency = base end) end
				if hide then task.delay(hide.Value, function() p.Transparency = 1 end) end
			end
		end
	end
end
local function effects()
	for _, e in model:GetDescendants() do
		if e:IsA("ParticleEmitter") then
			local t = e:FindFirstChild("StartTime") :: NumberValue?
			task.delay(t and t.Value or 0, function() e:Emit(1) end)
		end
	end
end
visibility()
track:Play()
effects()
track.DidLoop:Connect(function() visibility() effects() end)
`
export function toLua(scene, opts = {}) { const m = robloxModel(scene, opts); return { ...m, lua: writeLua(m.root, m.counts) } }
export function importReadme(name, res) {
  const many = res.meshFiles.length > 1
  return [`${name}: Roblox export from Umbrio Sandbox (${res.counts.meshes} meshes, ${res.meshes.reduce((a, m) => a + m.tris, 0)} triangles)`, '',
    `You need Roblox Studio on a computer (Windows or Mac). No scripts.`, '',
    many ? `1. Home tab > Import 3D. Pick ${res.meshFiles[0]}, press Import. Repeat for ${res.meshFiles.slice(1).join(', ')} (the build is split so each upload stays under Roblox's size limit).`
      : `1. Home tab > Import 3D (or File > Import 3D). Pick ${res.meshFiles[0]}, press Import once. That's it: one model with every mesh already in place.`,
    `   Do not upload the meshes one by one: the single Import uploads all of them together.`,
    `   If it comes in lying on its side or the wrong size, open the import settings before pressing Import and set World Up to Y (Front -Z) and the unit to Studs.`,
    ...(res.extras ? [`2. Optional, for the lights${res.counts.parts ? ' and plain parts' : ''}: right-click Workspace > Insert from File, pick ${res.extras}. It uses the same coordinates as the build; if the imported model was moved, move both together.`] : []),
    ...(res.big?.length ? [`Over ${RB_TRI_LIMIT} triangles, Studio may simplify: ${res.big.join(', ')}.`] : []),
    '', ...res.notes.map(n => '- ' + n)].join('\n') + '\n'
}
export function exportReadme(name, res) {
  return [`${name}: Roblox export from Umbrio Sandbox`, '',
    `1. Roblox Studio: right-click Workspace > Insert from File, pick ${safeName(name)}.rbxmx (${res.counts.parts} parts, ${res.counts.models} models).`,
    ...(res.counts.meshes ? [res.meshFiles?.length > 1 ? `2. All ${res.counts.meshes} meshes are in ${res.meshFiles.join(', ')} (one file would pass Roblox's upload size limit): File > Import 3D each one and press Import.`
        : `2. All ${res.counts.meshes} meshes are in ONE file, ${res.meshFiles?.[0] || 'the meshes .fbx'}. In Studio: Home tab > Import 3D (or File > Import 3D), pick that file, press Import once. Studio uploads every mesh in it together. Do not upload meshes one by one (Asset Manager, Bulk Import or the Creator Dashboard): that is the slow way and is not needed.`,
      `3. View > Command Bar: paste link-meshes.lua and press Enter. Each imported mesh moves into its placeholder in ${safeName(name)}.rbxmx (position, size, colour, material) and the placeholders go away.`,
      ...(res.big?.length ? [`   Over ${RB_TRI_LIMIT} triangles, Studio may refuse or simplify: ${res.big.join(', ')}.`] : [])] : ['2. No meshes: nothing else to import.']),
    res.counts.anims ? `${res.counts.meshes ? 4 : 3}. ${res.counts.anims} animations are KeyframeSequences in the rig's AnimSaves: select the rig and open the Animation Editor. Armor and gear are Motor6D'd to their limb and animate with it; Roblox poses carry position and turn only, so scale pops and show/hide keys are not in the Roblox clip.` : '',
    '', ...res.notes.map(n => '- ' + n)].filter((l, i, a) => l || a[i - 1]).join('\n') + '\n'
}

/* ---------- readers: XML (.rbxmx, XML .rbxm) ---------- */
const unesc = s => s.indexOf('&') < 0 ? s : s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" })[e.toLowerCase()])
export function parseXml(s) {
  const root = { tag: '', attrs: {}, kids: [], text: '' }, st = [root]
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<[?!][^>]*>|<\/([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g
  let m
  while ((m = re.exec(s))) {
    const top = st[st.length - 1]
    if (m[1] !== undefined) top.text += m[1]
    else if (m[2]) { if (st.length > 1) st.pop() }
    else if (m[3]) {
      const attrs = {}
      for (const a of (m[4] || '').matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = unesc(a[2] ?? a[3])
      const el = { tag: m[3], attrs, kids: [], text: '' }
      top.kids.push(el)
      if (!m[5]) st.push(el)
    } else if (m[6] !== undefined) top.text += unesc(m[6])
  }
  return root
}
const u32rgb = v => { v = Number(v) % 16777216; return [Math.floor(v / 65536) & 255, Math.floor(v / 256) & 255, v & 255] }
function xmlVal(k) {
  const c = tag => { const e = k.kids.find(x => x.tag === tag); return e ? +e.text || 0 : 0 }
  switch (k.tag) {
    case 'Vector3': return [c('X'), c('Y'), c('Z')]
    case 'CoordinateFrame': case 'CFrame': { const R = R_KEYS.map(c); return { t: [c('X'), c('Y'), c('Z')], R: R.some(v => v) ? R : I3 } }
    case 'Color3': return k.kids.length ? [c('R'), c('G'), c('B')].map(v => v * 255) : u32rgb(k.text)
    case 'Color3uint8': return u32rgb(k.text)
    case 'bool': return k.text.trim() === 'true'
    case 'float': case 'double': case 'int': case 'int64': case 'token': case 'BrickColor': return +k.text
    default: return k.text
  }
}
function xmlItems(el) {
  return el.kids.filter(k => k.tag === 'Item').map(it => {
    const props = {}
    for (const p of it.kids.find(k => k.tag === 'Properties')?.kids || []) if (p.attrs.name) props[p.attrs.name.toLowerCase()] = xmlVal(p)
    return { cls: it.attrs.class, props, kids: xmlItems(it) }
  })
}
export function parseRbxmx(text) {
  const root = parseXml(text), rb = root.kids.find(k => k.tag === 'roblox')
  if (!rb) throw new Error('Not a Roblox XML model (no <roblox> root)')
  return xmlItems(rb)
}
// Bytes or text -> item list [{cls, props (lower-case names), kids}]
export function readRoblox(data) {
  if (typeof data === 'string') return parseRbxmx(data)
  const b = data instanceof Uint8Array ? data : new Uint8Array(data)
  if (String.fromCharCode(...b.subarray(0, 8)) === '<roblox!') return readBinary(b)
  return parseRbxmx(new TextDecoder().decode(b))
}
function readBinary() { throw new Error('Binary .rbxm is not supported yet: in Roblox Studio use Save to File and pick .rbxmx') }

/* ---------- items -> scene objects ---------- */
const BRICK = { 1: '#f2f3f3', 5: '#d7c59a', 18: '#cc8e69', 21: '#c4281c', 23: '#0d69ac', 24: '#f5cd30', 26: '#1b2a35', 28: '#287f47', 37: '#4b974b', 102: '#6e99ca', 106: '#da8541', 119: '#a4bd47', 141: '#27462d', 192: '#694028', 194: '#a3a2a5', 199: '#635f62', 208: '#e5e4df', 217: '#7c5c46', 1001: '#f8f8f8', 1003: '#111111', 1004: '#ff0000', 1009: '#ffff00', 1010: '#0000ff' }
const PART_CLS = new Set(['Part', 'WedgePart', 'CornerWedgePart', 'TrussPart', 'SpawnLocation', 'Seat', 'VehicleSeat', 'SkateboardPlatform', 'MeshPart', 'UnionOperation', 'NegateOperation', 'IntersectOperation', 'PartOperation', 'FlagStand', 'Platform'])
const GROUP_CLS = new Set(['Model', 'Folder', 'Tool', 'Accessory', 'Accoutrement', 'Hat', 'Workspace', 'WorldModel', 'Actor'])
const round = (v, d = 1e5) => Math.round(v * d) / d || 0
// -> [{key, parent, obj}] in creation order; parents point at earlier keys. opts.materials limits material names.
export function fromRbxItems(list, opts = {}) {
  const out = [], mats = opts.materials ? new Set(opts.materials) : null
  let k = 0
  const walk = (it, parent) => {
    const p = it.props, name = p.name || it.cls
    if (PART_CLS.has(it.cls)) {
      const cf = p.cframe || p.coordinateframe || { t: [0, 0, 0], R: I3 }
      let size = (p.size || [4, 1, 2]).map(v => round(Math.abs(v))), R = cf.R, shape = 'box'
      const s = it.cls === 'Part' ? p.shape ?? 1 : -1
      if (it.cls === 'WedgePart' || s === 3) shape = 'wedge'
      else if (it.cls === 'CornerWedgePart' || s === 4) { shape = 'cornerwedge'; R = mm(R, tp(CW_TURN)); size = [size[2], size[1], size[0]] }
      else if (s === 0) { shape = 'sphere'; size = [size[0], size[0], size[0]] }
      else if (s === 2) { shape = 'cylinder'; R = mm(R, RZM90); size = [size[1], size[0], size[2]] }
      const rgb = p.color3uint8 || (Array.isArray(p.color) ? p.color : null)
      let mat = MAT_BY_TOKEN[p.material] || 'Plastic'
      if (mats && !mats.has(mat)) mat = mats.has('Plastic') ? 'Plastic' : [...mats][0]
      const key = 'r' + ++k
      const obj = { type: 'part', shape, name: it.cls === 'MeshPart' || /Operation$/.test(it.cls) ? `${name} (${it.cls})` : name, pos: cf.t.map(v => round(v)), rot: matToEuler(R), size,
        color: rgb ? hexOf(rgb) : BRICK[p.brickcolor] || '#a3a2a5', material: mat, transparency: round(Math.max(0, Math.min(1, p.transparency || 0)), 1e3), anchored: p.anchored !== false }
      out.push({ key, parent, obj })
      for (const c of it.kids) {
        if (!/^(PointLight|SpotLight|SurfaceLight)$/.test(c.cls)) { walk(c, parent); continue }
        const q = c.props
        out.push({ key: 'r' + ++k, parent, obj: { type: 'light', kind: c.cls === 'PointLight' ? 'point' : 'spot', name: q.name || c.cls, pos: obj.pos.slice(), rot: obj.rot.slice(), color: Array.isArray(q.color) ? hexOf(q.color) : '#ffffff', intensity: round(q.brightness ?? 1, 1e3), range: round(q.range ?? 8, 1e3), ...(c.cls !== 'PointLight' ? { angle: round(q.angle ?? 90, 1e3) } : {}), shadow: !!q.shadows } })
      }
    } else if (GROUP_CLS.has(it.cls)) {
      const key = 'r' + ++k, at = out.length
      out.push({ key, parent, obj: { type: 'group', name } })
      it.kids.forEach(c => walk(c, key))
      if (out.length === at + 1) out.pop() // empty group
    } else it.kids.forEach(c => walk(c, parent))
  }
  list.forEach(it => walk(it, null))
  return out
}

/* ---------- glue for app and CLI ---------- */
const matNames = () => { const m = M.MATERIALS; return Array.isArray(m) ? m.map(x => typeof x === 'string' ? x : x?.name).filter(Boolean) : Object.keys(m || {}) }
export function exportCtx(getGeo) {
  return {
    getGeo,
    partGeo(shape, size) {
      const bg = M.partGeometry(shape, size)
      try { return M.fromBufferGeometry(bg, { weld: true, quads: true }) } finally { M.releaseGeometry?.(bg) }
    }
  }
}

/* ---------- Plugin ---------- */
const ICONS = {
  'rbx-brick': 'M2 5.5 8 2.5l6 3v5l-6 3-6-3z M2 5.5 8 8.5l6-3 M8 8.5v5',
  'rbx-script': 'M3 2.5h7l3 3v8H3z M10 2.5v3h3 M5.5 8.5 4.5 10l1 1.5 M10.5 8.5l1 1.5-1 1.5 M8.5 8l-1 4',
  'rbx-in': 'M2 10.5v3h12v-3 M8 2.5v8 M5 7.5l3 3 3-3'
}
async function preload(app, scene) {
  await Promise.all(Object.values(scene.objects || {}).filter(o => o?.type === 'mesh' && o.geo && !app.geo.peek(o.geo)).map(o => app.geo.get(o.geo).catch(() => null)))
}
async function build(app, fmt, args = {}) {
  const full = app.sceneData ? app.sceneData() : app.scene
  const objects = Object.fromEntries(Object.entries(full.objects || {}).filter(([id]) => !app.isTemp?.(id)))     // temporary models never export
  const scene = { ...full, objects, anims: Object.fromEntries(Object.entries(full.anims || {}).map(([k, a]) => [k, a && { ...a, tracks: Object.fromEntries(Object.entries(a.tracks || {}).filter(([id]) => objects[id])) }])) }
  await preload(app, scene)
  const ids = args.ids || (args.selected || args.selection ? [...(app.selection || [])] : null)
  const detail = args.detail ?? 0.5                     // share of triangles kept; 1 = full detail
  let simplify = null
  if (fmt !== 'lua' && detail < 1) {
    try {
      const [{ MeshoptSimplifier: S }, { MeshBVH: BVH }] = await Promise.all([import('https://cdn.jsdelivr.net/npm/meshoptimizer@0.22.0/meshopt_simplifier.module.js'), import('three-mesh-bvh')])
      await S.ready; simplify = { S, BVH, ratio: detail, error: args.detailError ?? 0.05, tol: args.detailTol ?? 0.1 }
    }
    catch (e) { app.toast?.('Polygon reduction unavailable (' + e.message + '): exporting full detail', 'error') }
  }
  const opts = { ...exportCtx(id => app.geo.peek(id)), ids, baseplate: !!args.baseplate, merge: args.separate !== true, simplify, meshAssets: args.meshAssets, textureAssets: args.textureAssets, animAssets: args.animAssets, animOnly: args.animOnly }
  return fmt === 'lua' ? toLua(scene, opts) : toRbxmx(scene, opts)
}
// Each mesh's look as the viewport draws it: material colour, its texture (PNG, shared) and the texture's uv transform.
async function fbxFor(app, meshes, world = false) {
  try {      // an image texture shows plain white until its picture has loaded: wait for those, or the export bakes the white
    const T = await import('./texture.js'), tids = new Set(meshes.map(m => app.obj?.(m.id)?.texture).filter(Boolean))
    await Promise.all([...tids].map(tid => { const t = app.scene.textures?.[tid]; return t && (t.kind === 'image' || t.kind === 'paint' || t.data) ? T.imageEntry?.(app, tid, t)?.wait : null }))
  } catch {}
  const images = {}, byImg = new Map(), pending = []
  const lookOf = new Map()
  for (const me of meshes) {
    let mat = null
    app.viewport?.objects?.get(me.id)?.traverse?.(n => { if (!mat && n.isMesh) mat = Array.isArray(n.material) ? n.material[0] : n.material })
    const c = { r: 1, g: 1, b: 1 }; mat?.color?.getRGB?.(c, 'srgb')
    const L = { color: [c.r, c.g, c.b] }, map = mat?.map
    if (map?.image) {
      let k = byImg.get(map.image)
      if (k === undefined) {
        k = byImg.size; byImg.set(map.image, k)
        const cv = drawImage(map.image)
        if (cv) pending.push(new Promise(res => cv.toBlob(b => b ? b.arrayBuffer().then(a => { images[k] = new Uint8Array(a); res() }) : res(), 'image/png')))
      }
      map.updateMatrix(); const e = map.matrix.elements, fy = map.flipY !== false
      L.image = k
      L.uv = (u, v) => { const x = e[0] * u + e[3] * v + e[6], y = e[1] * u + e[4] * v + e[7]; return [x, fy ? 1 - y : y] }
    }
    lookOf.set(me, L)
  }
  await Promise.all(pending)
  const { zlibSync } = await import('three/addons/libs/fflate.module.js'), deflate = b => zlibSync(b, { level: 6 })
  const one = toFbx(meshes, me => lookOf.get(me), images, deflate, world)
  if (one.length <= FBX_MAX) return [one]
  return splitMeshes(meshes, Math.ceil(one.length / FBX_MAX * 1.1)).map(g => toFbx(g, me => lookOf.get(me), images, deflate, world))
}
function drawImage(img) {
  const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight
  if (!w || !h || typeof document === 'undefined') return null
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const g = cv.getContext('2d')
  if (img.data) { const d = img.data instanceof Uint8ClampedArray ? img.data : new Uint8ClampedArray(img.data.buffer || img.data); if (d.length !== w * h * 4) return null; g.putImageData(new ImageData(d, w, h), 0, 0) }
  else g.drawImage(img, 0, 0)
  return cv
}
async function zipFiles(files) {
  const { zipSync, strToU8 } = await import('three/addons/libs/fflate.module.js')
  const z = {}
  for (const [k, v] of Object.entries(files)) z[k] = typeof v === 'string' ? strToU8(v) : v
  return zipSync(z, { level: 6 })
}
async function packFor(app, fmt, args = {}) {
  const res = await build(app, fmt, args), name = safeName(app.scene?.name || 'Umbrio Sandbox model')
  const files = {}
  if (fmt === 'lua') files[name + '.lua'] = res.lua
  else if (!args.link && !args.meshAssets && res.meshes.length && !res.counts.rigs) {   // a rig needs its meshes in placeholders (joints, animation): link mode
    // default: no script. One .fbx holds the whole build already in place, so Import 3D alone gives the finished model;
    // what an .fbx can't carry (lights, plain parts, rigs) goes in a small .rbxmx at the same coordinates.
    const fbxs = await fbxFor(app, res.meshes, true)
    res.meshFiles = fbxs.map((_, i) => fbxs.length > 1 ? `${name}-${i + 1}.fbx` : `${name}.fbx`)
    fbxs.forEach((f, i) => { files[res.meshFiles[i]] = f })
    const holders = new Set(res.meshes.map(m => m.node))
    const strip = n => { n.kids = n.kids.filter(k => !holders.has(k)); n.kids.forEach(strip); n.kids = n.kids.filter(k => k.cls !== 'Model' || k.kids.length) }
    strip(res.root)
    if (res.root.kids.length) { res.extras = `${name}-lights-and-parts.rbxmx`; files[res.extras] = writeRbxmx(res.root) }
    res.big = res.meshes.filter(m => m.tris > RB_TRI_LIMIT).map(m => `${m.name} (${m.tris})`)
    files['README.txt'] = importReadme(name, res)
    return { res, filename: `${name}-roblox.zip`, data: await zipFiles(files) }
  }
  else {
    files[name + '.rbxmx'] = res.xml
    if (res.meshes.some(m => !m.linked)) {
      const fbxs = await fbxFor(app, res.meshes)
      fbxs.forEach((f, i) => { files[meshFile(name, i, fbxs.length)] = f })
      files['link-meshes.lua'] = LINK_LUA
      res.meshFiles = fbxs.map((_, i) => meshFile(name, i, fbxs.length))
    }
    res.big = res.meshes.filter(m => m.tris > RB_TRI_LIMIT).map(m => `${m.name} (${m.tris})`)
  }
  files['README.txt'] = fmt === 'lua' ? `Paste ${name}.lua into Roblox Studio's Command Bar (View > Command Bar) and press Enter.\n${res.notes.map(n => '- ' + n).join('\n')}\n` : exportReadme(name, res)
  return { res, filename: `${name}-roblox-${fmt}.zip`, data: await zipFiles(files) }
}
async function exportTo(app, fmt, args = {}) {
  const { res, filename, data } = await packFor(app, fmt, args)
  const out = { filename, bytes: data.length, counts: res.counts, notes: res.notes }
  if (args.to === 'assets') out.asset = (await app.store.upload(new Blob([data], { type: 'application/zip' }), 'application/zip'))?.id
  else if (args.download !== false) await app.store.download(filename, data)
  app.toast?.(`Roblox export: ${res.counts.parts} parts${res.counts.meshes ? `, ${res.counts.meshes} meshes` : ''}${res.counts.anims ? `, ${res.counts.anims} animations` : ''}`, 'ok')
  return out
}
function addItems(app, list, label = 'Import Roblox model') {
  const entries = fromRbxItems(list, { materials: matNames() })
  if (!entries.length) throw new Error('No parts found in this Roblox file')
  const map = {}
  app.transact(label, () => { for (const e of entries) map[e.key] = app.add({ ...e.obj, parent: e.parent ? map[e.parent] : null }) })
  const top = entries.filter(e => !e.parent).map(e => map[e.key])
  app.select(top)
  app.viewport?.frame?.(top, 400)
  app.toast?.(`Imported ${entries.filter(e => e.obj.type === 'part').length} Roblox parts`, 'ok')
  return top
}
async function importFile(app, file) { return addItems(app, readRoblox(new Uint8Array(await file.arrayBuffer())), 'Import ' + (file.name || 'Roblox model')) }
function pickFile(app) {
  return new Promise((resolve, reject) => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = '.rbxmx,.rbxm,.xml'
    inp.onchange = () => { const f = inp.files?.[0]; if (f) importFile(app, f).then(resolve, e => { app.toast?.(e.message, 'error'); reject(e) }); else resolve(null) }
    inp.click()
  })
}

export default {
  id: 'roblox', name: 'Roblox',
  commands: {
    'roblox.export': { label: 'Export Roblox model (.rbxmx)', icon: 'rbx-brick', noUndo: true, run: (app, a = {}) => exportTo(app, 'rbxmx', a) },
    'roblox.exportLua': { label: 'Export Roblox build script (.lua)', icon: 'rbx-script', noUndo: true, run: (app, a = {}) => exportTo(app, 'lua', a) },
    'roblox.import': { label: 'Import Roblox model (.rbxmx)', icon: 'rbx-in', run: (app, a = {}) => a.text ? addItems(app, readRoblox(a.text)) : pickFile(app) },
    'roblox.rbxmx': { label: 'Roblox model as text', icon: 'rbx-brick', hidden: true, noUndo: true, run: async (app, a = {}) => { const r = await build(app, 'rbxmx', a); return { xml: r.xml, counts: r.counts, notes: r.notes, meshes: r.meshes.map(m => m.key) } } },
    'roblox.lua': { label: 'Roblox build script as text', icon: 'rbx-script', hidden: true, noUndo: true, run: async (app, a = {}) => { const r = await build(app, 'lua', a); return { lua: r.lua, counts: r.counts, notes: r.notes } } }
  },
  menus: { File: ['-', 'roblox.import', 'roblox.export', 'roblox.exportLua'] },
  modes: [], tools: [], panels: [], types: {},
  importers: [{ ext: ['rbxmx', 'rbxm'], label: 'Roblox model', load: (file, app) => importFile(app, file) }],
  exporters: [
    { ext: 'rbxmx', label: 'Roblox model', hint: 'Roblox Studio: parts, Models, R6 animations. All meshes come in one .fbx (one Import 3D) plus a script that puts them in place.', save: async (app, opts = {}) => { const p = await packFor(app, 'rbxmx', opts); return { filename: p.filename, data: p.data } } },
    { ext: 'lua', label: 'Roblox script', hint: 'Paste into Roblox Studio\'s Command Bar to build the parts. Meshes are skipped.', save: async (app, opts = {}) => { const p = await packFor(app, 'lua', opts); return { filename: p.filename, data: p.data } } }
  ],
  async init(app) {
    try { (await import('../core/ui.js')).addIcons?.(ICONS) } catch {}
  }
}
