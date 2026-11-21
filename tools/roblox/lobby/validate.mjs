// Checks a generated Studio project against the lobby spec (domains/roblox/maps.md). CLI: node lobby/validate.mjs [path] (exit 1 on failure).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SHAPES, MATERIALS, LIGHT_KINDS } from './lib/scene.mjs'
import { toWorld, descendants } from './lib/world.mjs'

// Numbers from domains/roblox/maps.md summarises them; this file is the source of truth.
// bytes: Studio refuses to save a project document over 256 KB; geo docs hold the mass-repeated meshes.
export const LIMITS = { objects: 6000, lights: 24, shadows: 4, bytes: 230 * 1024, geoBytes: 230 * 1024 }
export const FLOORS = {
  hero: { parts: 250, materials: 4, shapes: 3, levels: 3, emblemParts: 8, effects: 2, bevelOver: 4, bevelMin: 0.1, minSpan: 75, roundNames: /orb|ball|bead|dome/i },
  scene: { effects: 3, detailPerArea: 60, walkCell: 12, terrainCell: 32, propParts: 6, shades: 3, shadeMinUses: 10 },
  walkHalf: 150
}
const TYPES = ['part', 'group', 'light', 'text', 'flipbook', 'mesh']
const isVec3 = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)

export function checkSchema(p) {
  const errs = [], objs = p.objects || {}
  if (p.v !== 1) errs.push('project.v must be 1')
  if (!p.name) errs.push('project.name missing')
  for (const [id, o] of Object.entries(objs)) {
    if (!TYPES.includes(o.type)) { errs.push(`${id}: unknown type ${o.type}`); continue }
    if (o.temp) errs.push(`${id}: temp objects are never exported`)
    for (const k of ['pos', 'rot', 'scale', 'size']) if (k in o && !isVec3(o[k])) errs.push(`${id}: ${k} must be 3 numbers`)
    if (o.type === 'part') {
      if (o.shape && !SHAPES.includes(o.shape)) errs.push(`${id}: unknown shape ${o.shape}`)
      if (o.material && !MATERIALS.includes(o.material)) errs.push(`${id}: unknown material ${o.material}`)
      if (o.size && o.size.some(v => v <= 0)) errs.push(`${id}: size must be positive`)
    }
    if (o.type === 'light' && o.kind && !LIGHT_KINDS.includes(o.kind)) errs.push(`${id}: unknown light kind ${o.kind}`)
    if (o.type === 'mesh') {
      if (typeof o.geo !== 'string') errs.push(`${id}: mesh needs a geo id`)
      else if (p.geos && !p.geos[o.geo]) errs.push(`${id}: geo ${o.geo} missing`)
      if (o.material && !MATERIALS.includes(o.material)) errs.push(`${id}: unknown material ${o.material}`)
    }
    if (o.color && !/^#[0-9a-f]{6}$/i.test(o.color)) errs.push(`${id}: bad color ${o.color}`)
    if (o.parent != null && !(o.parent in objs)) errs.push(`${id}: missing parent ${o.parent}`)
  }
  // Studio walks parents up to 64 deep; a cycle would hang worldMatrix, so reject it here.
  for (const id of Object.keys(objs)) {
    const seen = new Set([id]); let cur = objs[id]
    while (cur && cur.parent != null) {
      if (seen.has(cur.parent)) { errs.push(`${id}: parent cycle`); break }
      seen.add(cur.parent); cur = objs[cur.parent]
    }
  }
  return errs
}

// The project document as Studio stores it (geos live in their own docs, so they are not part of its size).
const docOf = p => { const { geos, ...doc } = p; return doc }
export function checkBudget(p, limits = LIMITS) {
  const errs = [], objs = Object.values(p.objects || {})
  for (const [gid, g] of Object.entries(p.geos || {})) {
    const b = Buffer.byteLength(JSON.stringify(g)), n = g.verts.length / 3
    if (b > limits.geoBytes) errs.push(`geo ${gid}: ${b} bytes > ${limits.geoBytes}`)
    if (g.faces.some(f => f.some(i => i < 0 || i >= n))) errs.push(`geo ${gid}: face index out of range`)
  }
  const lights = objs.filter(o => o.type === 'light'), shadows = lights.filter(o => o.shadow)
  const bytes = Buffer.byteLength(JSON.stringify(docOf(p)))
  if (objs.length > limits.objects) errs.push(`objects ${objs.length} > ${limits.objects}`)
  if (lights.length > limits.lights) errs.push(`lights ${lights.length} > ${limits.lights}`)
  if (shadows.length > limits.shadows) errs.push(`shadow lights ${shadows.length} > ${limits.shadows}`)
  if (bytes > limits.bytes) errs.push(`document ${bytes} bytes > ${limits.bytes}`)
  return errs
}


const partsUnder = (objs, id) => descendants(objs, id).filter(d => objs[d].type === 'part')
const animated = p => { const s = new Set(); for (const c of Object.values(p.anims || {})) for (const id in c.tracks || {}) s.add(id); return s }
function effectKinds(p, ids) {
  const objs = p.objects, anim = animated(p), k = new Set()
  for (const id of ids) {
    const o = objs[id]
    if (o.type === 'light') k.add('light')
    if (o.type === 'flipbook') k.add('vfx')
    if (o.type === 'part' && (o.material === 'Neon' || o.material === 'ForceField')) k.add('neon')
    if (anim.has(id)) k.add('animation')
  }
  return k
}

// Hero pieces: groups tagged 'hero' (spawn, centrepiece, gates...). domains/roblox/maps.md, "Detail floors".
export function checkHeroes(p, F = FLOORS.hero) {
  const errs = [], objs = p.objects || {}
  for (const [id, g] of Object.entries(objs).filter(([, o]) => o.tag === 'hero')) {
    const n = g.name || id, all = descendants(objs, id), parts = all.filter(d => objs[d].type === 'part')
    const mats = new Set(parts.map(d => objs[d].material || 'Plastic')), shapes = new Set(parts.map(d => objs[d].shape || 'box'))
    const levels = new Set(parts.map(d => Math.round(toWorld(objs, d)[1] + (objs[d].size?.[1] ?? 1) / 2)))
    if (parts.length < F.parts) errs.push(`${n}: ${parts.length} parts < ${F.parts}`)
    if (mats.size < F.materials) errs.push(`${n}: ${mats.size} materials < ${F.materials}`)
    if (shapes.size < F.shapes) errs.push(`${n}: ${shapes.size} shape types < ${F.shapes}`)
    if (levels.size < F.levels) errs.push(`${n}: ${levels.size} height levels < ${F.levels}`)
    const emblem = all.some(d => objs[d].type === 'text') ||
      all.some(d => objs[d].type === 'group' && /emblem|logo/i.test(objs[d].name || '') && partsUnder(objs, d).length >= F.emblemParts)
    if (!emblem) errs.push(`${n}: no emblem group (>= ${F.emblemParts} parts) or text sign`)
    const fx = effectKinds(p, [id, ...all])
    if (fx.size < F.effects) errs.push(`${n}: ${fx.size} effect kinds (${[...fx].join(', ') || 'none'}) < ${F.effects}`)
    // Size: the widest footprint across the piece (spawn and centrepiece must read at lobby scale).
    if (g.minSpan !== false && F.minSpan) {
      const xs = parts.map(d => toWorld(objs, d)[0]), zs = parts.map(d => toWorld(objs, d)[2])
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs))
      if (parts.length && span < F.minSpan * 0.9) errs.push(`${n}: ${span.toFixed(0)} studs wide < ${F.minSpan}`)
    }
    for (const d of parts) {
      const o = objs[d]
      if (o.shape === 'sphere' && !F.roundNames.test(o.name || '')) errs.push(`${n}/${o.name || d}: plain sphere as a detail (model it, or name it orb/ball/bead/dome)`)
      const dims = [...(o.size || [4, 1, 2])].sort((a, b) => a - b), strip = dims[1] <= 0.5
      if ((o.shape || 'box') === 'box' && dims[2] > F.bevelOver && !(o.bevel >= F.bevelMin) && !strip && !/trim/i.test(o.name || ''))
        errs.push(`${n}/${o.name || d}: box over ${F.bevelOver} studs needs bevel >= ${F.bevelMin} or to be a strip (two sides <= 0.5)`)
    }
  }
  return errs
}

// Whole scene: domains/roblox/maps.md, "Detail floors".
export function checkScene(p, F = FLOORS.scene, half = FLOORS.walkHalf) {
  const errs = [], objs = p.objects || {}, ids = Object.keys(objs)
  const fx = effectKinds(p, ids)
  if (fx.size < F.effects) errs.push(`scene: ${fx.size} effect kinds (${[...fx].join(', ') || 'none'}) < ${F.effects}`)
  const W = Object.fromEntries(ids.filter(id => objs[id].type === 'part').map(id => [id, toWorld(objs, id)]))
  const isGround = id => objs[id].tag === 'walk' || objs[id].tag === 'terrain'
  const meshPieces = area => Object.values(objs).filter(o => o.type === 'mesh' && o.area === area).reduce((n, o) => n + (o.pieces || 0), 0)
  const detail = ids.filter(id => W[id] && !isGround(id) && Math.abs(W[id][0]) <= half && Math.abs(W[id][2]) <= half).length + meshPieces('walk')
  const need = Math.ceil((2 * half) ** 2 / F.detailPerArea)
  if (detail < need) errs.push(`scene: ${detail} detail parts in the walkable area < ${need}`)
  // Slab rule: big flat parts need things on top; tagged ground uses its own cell size, untagged slabs the walk cell.
  for (const id of ids.filter(id => W[id] && (objs[id].shape || 'box') === 'box')) {
    const o = objs[id], [sx, sy, sz] = o.size || [4, 1, 2]
    if (sx <= 8 || sz <= 8) continue
    const top = W[id][1] + sy / 2, [cx, , cz] = W[id]
    let on = o.tag === 'walk' ? meshPieces('walk') : o.tag === 'terrain' ? meshPieces('terrain') : 0
    for (const q of ids) {
      if (q === id || !W[q] || isGround(q)) continue
      const [x, y, z] = W[q], hy = (objs[q].size?.[1] ?? 1) / 2
      if (o.tag === 'terrain' && Math.abs(x) <= half && Math.abs(z) <= half) continue
      if (Math.abs(x - cx) <= sx / 2 && Math.abs(z - cz) <= sz / 2 && y - hy >= top - 0.6 && y - hy <= top + 1.5) on++
    }
    const cell = o.tag === 'terrain' ? F.terrainCell : F.walkCell
    // Terrain under the lobby is covered by the lobby lawn, so only its outer ring counts.
    const area = o.tag === 'terrain' ? Math.max(0, sx * sz - (2 * half) ** 2) : sx * sz
    const want = Math.ceil(area / (cell * cell))
    if (on < want) errs.push(`${o.name || id}: plain slab ${sx}x${sz} has ${on} parts on top < ${want}`)
  }
  for (const [id, g] of Object.entries(objs).filter(([, o]) => o.tag === 'prop')) {
    const n = partsUnder(objs, id).length
    if (n < F.propParts) errs.push(`${g.name || id}: prop has ${n} parts < ${F.propParts}`)
  }
  const fam = {}
  for (const o of Object.values(objs)) if (o.type === 'part') (fam[o.material || 'Plastic'] ||= []).push(o.color || '#a3a2a5')
  for (const [m, cols] of Object.entries(fam)) if (cols.length >= F.shadeMinUses && new Set(cols).size < F.shades) errs.push(`${m}: ${new Set(cols).size} shades over ${cols.length} parts < ${F.shades}`)
  return errs
}

export const RULES = { schema: checkSchema, budget: checkBudget, heroes: checkHeroes, scene: checkScene }

export function validate(p) {
  const errors = []
  for (const [name, rule] of Object.entries(RULES)) for (const e of rule(p)) errors.push(`[${name}] ${e}`)
  const objs = Object.values(p.objects || {})
  const stats = { objects: objs.length, lights: objs.filter(o => o.type === 'light').length, bytes: Buffer.byteLength(JSON.stringify(docOf(p))),
    geos: Object.keys(p.geos || {}).length, pieces: objs.reduce((n, o) => n + (o.pieces || 0), 0) }
  return { ok: !errors.length, errors, stats }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2] || new URL('./out/studio-lobby.json', import.meta.url)
  const proj = JSON.parse(readFileSync(path, 'utf8'))
  try { proj.geos = JSON.parse(readFileSync(new URL('./out/geos.json', import.meta.url), 'utf8')) } catch {}
  const { ok, errors, stats } = validate(proj)
  console.log(`objects ${stats.objects} · lights ${stats.lights} · doc ${(stats.bytes / 1024).toFixed(1)} KB · ${stats.geos} meshes holding ${stats.pieces} pieces`)
  for (const e of errors) console.error('FAIL ' + e)
  console.log(ok ? 'PASS' : `FAIL (${errors.length})`)
  process.exit(ok ? 0 : 1)
}
