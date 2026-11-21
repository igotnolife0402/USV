#!/usr/bin/env node
// Studio headless CLI: check, describe and export a Studio scene without a browser.
//   node cli/studio.mjs validate <scene.json>
//   node cli/studio.mjs info <scene.json> [--json]
//   node cli/studio.mjs export <scene.json> <out.(glb|gltf|obj|stl|ply|rbxmx|lua)> [--geo-dir dir] [--baseplate]
// Mesh geometry comes from the scene's own "geo" map (Studio scene .json export) or --geo-dir (<geoId>.json files).
// Needs three@0.186.1 in a scratch folder, never in the vault: `npm i three@0.186.1`, then NODE_PATH=<folder>/node_modules.
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join, resolve, extname, basename, delimiter } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as nodeModule from 'node:module'

const HERE = dirname(fileURLToPath(import.meta.url))
const FORMATS = ['glb', 'gltf', 'obj', 'stl', 'ply', 'rbxmx', 'lua']
const USAGE = `Studio CLI
  node cli/studio.mjs validate <scene.json>              check a scene; exit 1 on errors
  node cli/studio.mjs info <scene.json> [--json]         counts, bounds, triangles, animations
  node cli/studio.mjs export <scene.json> <out.${FORMATS.join('|')}> [--geo-dir dir] [--baseplate]
Needs three@0.186.1: npm i three@0.186.1 in a scratch folder, then set NODE_PATH=<folder>/node_modules.`

/* ---------- "three" for Node: NODE_PATH, then node_modules above the current folder or this tool ---------- */
function findDeps() {
  const c = (process.env.NODE_PATH || '').split(delimiter).filter(Boolean)
  for (const start of [process.cwd(), HERE]) for (let d = start; ; d = dirname(d)) { c.push(join(d, 'node_modules')); if (dirname(d) === d) break }
  return c.map(p => resolve(p)).find(p => existsSync(join(p, 'three/package.json')))
}
function hookThree() {
  const deps = findDeps()
  if (!deps) throw new Error('three not found. ' + USAGE.split('\n').pop())
  const map = s => s === 'three' ? join(deps, 'three/build/three.module.js')
    : s.startsWith('three/addons/') ? join(deps, 'three/examples/jsm', s.slice(13))
    : s.startsWith('three/examples/jsm/') ? join(deps, 'three', s.slice(6)) : null
  const resolveHook = (spec, ctx, next) => { const f = map(spec); return f ? { url: pathToFileURL(f).href, shortCircuit: true } : next(spec, ctx) }
  if (nodeModule.registerHooks) nodeModule.registerHooks({ resolve: resolveHook })
  else nodeModule.register('data:text/javascript,' + encodeURIComponent(`const map=${map.toString().replace('deps', JSON.stringify(deps)).replace(/deps/g, JSON.stringify(deps))};import{join}from'node:path';import{pathToFileURL}from'node:url';export async function resolve(s,c,n){const f=map(s);return f?{url:pathToFileURL(f).href,shortCircuit:true}:n(s,c)}`))
  return deps
}
// GLTFExporter reads blobs with FileReader and PLYExporter waits a frame; Node has neither.
function polyfill() {
  globalThis.requestAnimationFrame ??= cb => setTimeout(() => cb(performance.now()), 0)
  if (globalThis.FileReader) return
  globalThis.FileReader = class {
    _done(r) { this.result = r; this.readyState = 2; const ev = { target: this }; this.onload?.(ev); this.onloadend?.(ev) }
    readAsArrayBuffer(b) { b.arrayBuffer().then(r => this._done(r)) }
    readAsDataURL(b) { b.arrayBuffer().then(r => this._done(`data:${b.type || 'application/octet-stream'};base64,${Buffer.from(r).toString('base64')}`)) }
  }
}

/* ---------- scene loading ---------- */
function readJson(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch (e) { throw new Error(`${file}: ${e.code === 'ENOENT' ? 'file not found' : e.message}`) }
}
function geoSource(scene, geoDir) {
  const inline = scene.geo && typeof scene.geo === 'object' ? scene.geo : {}, cache = new Map()
  return id => {
    if (!id) return null
    if (cache.has(id)) return cache.get(id)
    let g = inline[id] || null
    if (!g && geoDir) for (const f of [join(geoDir, id + '.json'), join(geoDir, id)]) if (existsSync(f) && statSync(f).isFile()) { try { g = JSON.parse(readFileSync(f, 'utf8')) } catch {} break }
    if (g && !Array.isArray(g.verts)) g = null
    cache.set(id, g)
    return g
  }
}

/* ---------- validate (no three needed) ---------- */
const TYPES = ['part', 'group', 'mesh', 'light', 'stroke', 'model']
const SHAPE_LIST = ['box', 'sphere', 'cylinder', 'wedge', 'cornerwedge', 'cone', 'torus', 'plane', 'capsule']
const EASES = ['linear', 'ease', 'in', 'out', 'step', 'bounce', 'elastic']
const CHANNELS = ['pos', 'rot', 'scale', 'color', 'visible']
const isNum = v => typeof v === 'number' && Number.isFinite(v)
const isVec = (v, n = 3) => Array.isArray(v) && v.length === n && v.every(isNum)
const isColor = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
export function validate(scene, { getGeo, materials } = {}) {
  const errors = [], warnings = []
  const err = (p, m) => errors.push(`${p}: ${m}`), warn = (p, m) => warnings.push(`${p}: ${m}`)
  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) return { errors: ['scene: not a JSON object'], warnings }
  const objs = scene.objects
  if (!objs || typeof objs !== 'object' || Array.isArray(objs)) { err('objects', 'missing or not an object keyed by id'); return { errors, warnings } }
  if (scene.name !== undefined && typeof scene.name !== 'string') err('name', 'must be text')
  for (const [id, o] of Object.entries(objs)) {
    const p = `objects.${id}`
    if (o === null) continue // a deleted object; the page compacts it
    if (typeof o !== 'object' || Array.isArray(o)) { err(p, 'must be an object or null'); continue }
    if (!TYPES.includes(o.type)) { (typeof o.type === 'string' ? warn : err)(p + '.type', `${JSON.stringify(o.type)} is not one of ${TYPES.join(', ')}`); continue }
    for (const k of ['pos', 'rot', 'scale']) if (o[k] !== undefined && !isVec(o[k])) err(`${p}.${k}`, 'must be [x, y, z] numbers')
    if (o.color !== undefined && !isColor(o.color)) err(p + '.color', `${JSON.stringify(o.color)} is not #rrggbb`)
    if (o.transparency !== undefined && !(isNum(o.transparency) && o.transparency >= 0 && o.transparency <= 1)) err(p + '.transparency', 'must be 0..1')
    if (o.material !== undefined && materials && !materials.includes(o.material)) warn(p + '.material', `${JSON.stringify(o.material)} is unknown; Plastic is used`)
    if (o.name !== undefined && typeof o.name !== 'string') err(p + '.name', 'must be text')
    if (o.parent != null) {
      if (!objs[o.parent]) err(p + '.parent', `${JSON.stringify(o.parent)} does not exist`)
      else { let q = o.parent, n = 0; while (q && objs[q] && n++ < 1e5) { if (q === id) { err(p + '.parent', 'parent loop'); break } q = objs[q].parent } }
    }
    if (o.type === 'part') {
      if (o.shape !== undefined && !SHAPE_LIST.includes(o.shape)) err(p + '.shape', `${JSON.stringify(o.shape)} is not one of ${SHAPE_LIST.join(', ')}`)
      if (o.size !== undefined && !(isVec(o.size) && o.size.every(v => v >= 0))) err(p + '.size', 'must be [x, y, z] numbers >= 0')
    } else if (o.type === 'mesh') {
      if (typeof o.geo !== 'string' || !o.geo) err(p + '.geo', 'a mesh needs a geo id')
      else if (getGeo) {
        const g = getGeo(o.geo)
        if (!g) warn(p + '.geo', `${o.geo} not found (scene "geo" map or --geo-dir); the mesh is skipped on export`)
        else if (g.verts.length % 3 || !Array.isArray(g.faces) || g.faces.some(f => !Array.isArray(f) || f.length < 3 || f.some(i => !Number.isInteger(i) || i < 0 || i * 3 >= g.verts.length))) err(p + '.geo', `${o.geo} has bad verts or faces`)
      }
    } else if (o.type === 'light') {
      if (o.kind !== undefined && !['point', 'spot', 'directional'].includes(o.kind)) err(p + '.kind', 'must be point, spot or directional')
      for (const k of ['intensity', 'range', 'angle']) if (o[k] !== undefined && !isNum(o[k])) err(`${p}.${k}`, 'must be a number')
    } else if (o.type === 'stroke') {
      if (!Array.isArray(o.points) || o.points.length < 2 || o.points.some(q => !Array.isArray(q) || q.length < 3 || q.some(v => !isNum(v)))) err(p + '.points', 'needs 2+ points [x, y, z, width?]')
    } else if (o.type === 'model' && !o.src) warn(p + '.src', 'a model needs src')
  }
  const anims = scene.anims || {}
  if (typeof anims !== 'object' || Array.isArray(anims)) err('anims', 'must be an object keyed by id')
  else for (const [aid, a] of Object.entries(anims)) {
    const p = `anims.${aid}`
    if (a === null) continue
    if (typeof a !== 'object') { err(p, 'must be an object'); continue }
    if (a.len !== undefined && !(isNum(a.len) && a.len >= 0)) err(p + '.len', 'must be seconds >= 0')
    if (a.fps !== undefined && !(isNum(a.fps) && a.fps > 0)) err(p + '.fps', 'must be > 0')
    for (const [oid, tr] of Object.entries(a.tracks || {})) {
      if (!objs[oid]) warn(`${p}.tracks.${oid}`, 'object does not exist')
      if (!tr || typeof tr !== 'object') continue
      for (const [ch, keys] of Object.entries(tr)) {
        const q = `${p}.tracks.${oid}.${ch}`
        if (!CHANNELS.includes(ch)) { err(q, `channel must be one of ${CHANNELS.join(', ')}`); continue }
        if (!Array.isArray(keys)) { err(q, 'must be a list of [time, value, ease?]'); continue }
        let last = -Infinity
        keys.forEach((k, i) => {
          if (!Array.isArray(k) || !isNum(k[0]) || k[0] < 0) return err(`${q}[${i}]`, 'must be [time >= 0, value, ease?]')
          if (k[0] < last) err(`${q}[${i}]`, 'times must go up')
          last = k[0]
          const v = k[1], ok = ch === 'color' ? isColor(v) : ch === 'visible' ? typeof v === 'boolean' : isVec(v)
          if (!ok) err(`${q}[${i}]`, `bad ${ch} value ${JSON.stringify(v)}`)
          if (k[2] !== undefined && k[2] !== null && !EASES.includes(k[2])) err(`${q}[${i}]`, `ease must be one of ${EASES.join(', ')}`)
        })
      }
    }
  }
  if (scene.camera) for (const k of ['pos', 'target']) if (scene.camera[k] !== undefined && !isVec(scene.camera[k])) err('camera.' + k, 'must be [x, y, z] numbers')
  if (scene.env?.bg !== undefined && scene.env.bg !== null && !isColor(scene.env.bg)) err('env.bg', 'must be #rrggbb')
  return { errors, warnings }
}

/* ---------- three-based work ---------- */
async function libs() {
  hookThree()
  polyfill()
  const THREE = await import('three')
  const M = await import('../core/model.js')
  const R = await import('../plugins/roblox.js')
  return { THREE, M, R }
}
function buildThree(L, scene, getGeo, notes) {
  const objects = {}
  for (const [id, o] of Object.entries(scene.objects || {})) {
    if (!o) continue
    if (o.type === 'mesh' && !getGeo(o.geo)) { notes.push(`${o.name || id}: geometry ${o.geo} not found, skipped`); continue }
    if (o.type === 'model') notes.push(`${o.name || id}: imported models need the browser, skipped`)
    objects[id] = o
  }
  for (const [id, o] of Object.entries(objects)) if (o.parent && !objects[o.parent]) objects[id] = { ...o, parent: null }
  const root = L.M.buildScene({ ...scene, objects }, { getGeo, getTexture: () => undefined, loadModel: () => null })
  const hidden = []
  root.traverse(o => { if (o.visible === false && o !== root) hidden.push(o) })
  for (const o of hidden) o.parent?.remove(o)
  let stripped = 0
  root.traverse(o => {
    for (const m of [].concat(o.material || [])) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'aoMap', 'emissiveMap', 'alphaMap']) if (m[k]) { m[k] = null; stripped++ }
  })
  if (stripped) notes.push('textures are left out of headless exports (export from the page to keep them)')
  root.name = scene.name || 'Studio scene'
  root.updateMatrixWorld(true)
  return root
}
function stats(L, root) {
  let tris = 0, meshes = 0
  root.traverse(o => { if (o.isMesh && o.geometry) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position?.count || 0) / 3 } })
  const box = new L.THREE.Box3().setFromObject(root)
  return { meshes, tris: Math.round(tris), bounds: box.isEmpty() ? null : { min: box.min.toArray().map(r3), max: box.max.toArray().map(r3), size: box.getSize(new L.THREE.Vector3()).toArray().map(r3) } }
}
const r3 = v => Math.round(v * 1000) / 1000

async function exportScene(scene, out, opts) {
  const fmt = extname(out).slice(1).toLowerCase()
  if (!FORMATS.includes(fmt)) throw new Error(`Unknown format .${fmt}: use ${FORMATS.map(f => '.' + f).join(' ')}`)
  const L = await libs(), getGeo = geoSource(scene, opts.geoDir), notes = [], files = []
  mkdirSync(dirname(resolve(out)), { recursive: true })
  const write = (f, data) => { writeFileSync(f, typeof data === 'string' ? data : Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data.buffer ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : data)); files.push(f) }
  if (fmt === 'rbxmx' || fmt === 'lua') {
    const ro = { ...L.R.exportCtx(getGeo), baseplate: !!opts.baseplate }
    const res = fmt === 'lua' ? L.R.toLua(scene, ro) : L.R.toRbxmx(scene, ro)
    write(out, fmt === 'lua' ? res.lua : res.xml)
    if (fmt === 'rbxmx') for (const m of res.meshes) { const f = join(dirname(resolve(out)), m.file); mkdirSync(dirname(f), { recursive: true }); write(f, m.text) }
    notes.push(...res.notes)
    return { format: fmt, files, counts: res.counts, notes }
  }
  const root = buildThree(L, scene, getGeo, notes)
  let data
  if (fmt === 'glb' || fmt === 'gltf') {
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js')
    const r = await new GLTFExporter().parseAsync(root, { binary: fmt === 'glb', onlyVisible: true })
    data = fmt === 'glb' ? r : JSON.stringify(r)
  } else if (fmt === 'obj') {
    const { OBJExporter } = await import('three/addons/exporters/OBJExporter.js')
    data = `# ${scene.name || 'Studio scene'}: exported by Studio CLI (studs, Y up)\n` + new OBJExporter().parse(root)
  } else if (fmt === 'stl') {
    const { STLExporter } = await import('three/addons/exporters/STLExporter.js')
    data = new STLExporter().parse(root, { binary: true })
  } else if (fmt === 'ply') {
    const { PLYExporter } = await import('three/addons/exporters/PLYExporter.js')
    data = await new Promise(res => new PLYExporter().parse(root, res, { binary: true }))
  }
  write(out, data)
  return { format: fmt, files, ...stats(L, root), notes }
}

async function info(scene, opts) {
  const objs = Object.entries(scene.objects || {}).filter(([, o]) => o)
  const byType = {}, shapes = {}
  for (const [, o] of objs) { byType[o.type] = (byType[o.type] || 0) + 1; if (o.type === 'part') shapes[o.shape || 'box'] = (shapes[o.shape || 'box'] || 0) + 1 }
  const anims = Object.entries(scene.anims || {}).filter(([, a]) => a).map(([id, a]) => ({ id, name: a.name || id, len: a.len ?? 0, fps: a.fps ?? 30, loop: a.loop !== false, tracks: Object.keys(a.tracks || {}).length }))
  const out = { name: scene.name || '(no name)', objects: objs.length, byType, shapes, anims, textures: Object.keys(scene.textures || {}).length, notes: [] }
  const L = await libs(), getGeo = geoSource(scene, opts.geoDir)
  Object.assign(out, stats(L, buildThree(L, scene, getGeo, out.notes)))
  return out
}

/* ---------- command line ---------- */
function parseArgs(argv) {
  const pos = [], o = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--geo-dir') o.geoDir = argv[++i]
    else if (a === '--json') o.json = true
    else if (a === '--baseplate') o.baseplate = true
    else if (a === '-h' || a === '--help') o.help = true
    else if (a.startsWith('--')) throw new Error('Unknown option ' + a)
    else pos.push(a)
  }
  return { pos, o }
}
async function main(argv) {
  const { pos, o } = parseArgs(argv), [cmd, file, out] = pos
  if (o.help || !cmd) { console.log(USAGE); return 0 }
  if (!['validate', 'info', 'export'].includes(cmd)) throw new Error(`Unknown command ${cmd}\n${USAGE}`)
  if (!file) throw new Error(`${cmd} needs a scene file\n${USAGE}`)
  const scene = readJson(file)
  if (cmd === 'validate') {
    const r = validate(scene, { getGeo: geoSource(scene || {}, o.geoDir), materials: null })
    for (const e of r.errors) console.log('error   ' + e)
    for (const w of r.warnings) console.log('warning ' + w)
    const n = Object.values(scene?.objects || {}).filter(Boolean).length, a = Object.keys(scene?.anims || {}).length
    console.log(r.errors.length ? `INVALID: ${r.errors.length} errors, ${r.warnings.length} warnings` : `OK: ${scene.name || basename(file)}: ${n} objects, ${a} animations, ${r.warnings.length} warnings`)
    return r.errors.length ? 1 : 0
  }
  const v = validate(scene)
  if (v.errors.length) { for (const e of v.errors) console.log('error   ' + e); console.log('Fix these first (node cli/studio.mjs validate).'); return 1 }
  if (cmd === 'info') {
    const r = await info(scene, o)
    if (o.json) { console.log(JSON.stringify(r, null, 1)); return 0 }
    const kv = (k, v) => console.log(k.padEnd(11) + v)
    kv('Name', r.name)
    kv('Objects', `${r.objects} (${Object.entries(r.byType).map(([k, n]) => `${n} ${k}`).join(', ') || 'none'})`)
    if (Object.keys(r.shapes).length) kv('Parts', Object.entries(r.shapes).map(([k, n]) => `${n} ${k}`).join(', '))
    kv('Triangles', `${r.tris} in ${r.meshes} meshes`)
    kv('Bounds', r.bounds ? `${r.bounds.size.join(' x ')} studs, min ${r.bounds.min.join(' ')}, max ${r.bounds.max.join(' ')}` : 'empty')
    kv('Animations', r.anims.length ? r.anims.map(a => `${a.name} (${a.len} s, ${a.tracks} tracks${a.loop ? ', loop' : ''})`).join('; ') : 'none')
    kv('Textures', r.textures)
    for (const n of r.notes) console.log('note       ' + n)
    return 0
  }
  if (!out) throw new Error(`export needs an output file\n${USAGE}`)
  const r = await exportScene(scene, out, o)
  for (const f of r.files) console.log(`wrote ${f} (${statSync(f).size} bytes)`)
  if (r.counts) console.log(Object.entries(r.counts).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ') || 'nothing exported')
  else console.log(`${r.meshes} meshes, ${r.tris} triangles`)
  for (const n of r.notes) console.log('note  ' + n)
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code }, e => { console.error('Error: ' + (e?.message || e)); process.exitCode = 1 })
}
