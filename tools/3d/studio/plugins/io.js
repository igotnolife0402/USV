// Import and export: lazy three.js loaders, zip in and out, downloads and project assets.
import * as THREE from 'three'
import { icon, addIcons, isPhone } from '../core/ui.js'
import { fromBufferGeometry, MATERIALS } from '../core/model.js'

addIcons({
  'io-import': 'M8 2v8 M4.5 6.5 8 10l3.5-3.5 M2 10.5V14h12v-3.5',
  'io-export': 'M8 10V2 M4.5 5.5 8 2l3.5 3.5 M2 10.5V14h12v-3.5',
  'io-share': 'M8 1.5v8 M5 4.5 8 1.5l3 3 M5.5 7H3.5v7h9V7h-2',
  'io-render': 'M1.5 4.5h3l1.2-2h4.6l1.2 2h3v9h-13z M8 6.5a2.6 2.6 0 1 0 .01 0',
  'io-cube': 'M8 1.5 13.5 4.5v7L8 14.5l-5.5-3v-7z M2.5 4.5 8 7.5l5.5-3 M8 7.5v7',
  'io-image': 'M1.5 3h13v10h-13z M1.5 11 5 7.5l3 3 2-2 4.5 4.5 M10.5 5.5h.01',
  'io-code': 'M5.5 4 1.5 8l4 4 M10.5 4l4 4-4 4',
  'io-close': 'M4 4l8 8 M12 4l-8 8',
  'io-cloud': 'M4.5 12.5a3 3 0 0 1-.4-6A4 4 0 0 1 11.8 6a3.2 3.2 0 0 1-.3 6.5z',
})

const MODEL_EXT = ['glb', 'gltf', 'obj', 'fbx', 'stl', 'ply', 'dae', '3mf', '3ds', 'vox', 'wrl', 'vrml', 'amf', 'usdz', 'usda', 'usdc', 'svg']
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif']
const ZUP = ['stl', '3mf', 'amf', '3ds']
const VCOL = ['vox', 'ply', 'stl', '3mf', 'amf', 'wrl', 'vrml']
const MODEL_OK = ['glb', 'gltf', 'fbx', 'dae', 'obj', 'stl', 'ply', '3mf', '3ds', 'vox', 'wrl', 'vrml', 'amf', 'usdz']
const ALLOWED = new Set('gif png jpg jpeg webp mp4 webm mov txt json md docx pptx epub csv ttf html svg pdf xlsx zip fig'.split(' '))
const MIME = { glb: 'model/gltf-binary', gltf: 'model/gltf+json', obj: 'text/plain', mtl: 'text/plain', stl: 'model/stl', ply: 'application/octet-stream', usdz: 'model/vnd.usdz+zip', fbx: 'application/octet-stream', dae: 'model/vnd.collada+xml', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', '3mf': 'model/3mf', zip: 'application/zip' }
const INLINE_MAX = 200 * 1024   // base64 text kept inside the project doc (db docs max 256 KiB)
const TRI_WARN = 200000
const TEX_FLIPY = true          // Studio image textures upload with flipY (TextureLoader default)
const MISSING_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/58BAAQAAf+ZcQ2+AAAAAElFTkSuQmCC'

const L = p => import(`three/addons/${p}`)
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const ic = n => { const r = icon(n); return typeof r === 'string' ? r : (r?.outerHTML || '') }
const extOf = n => (String(n).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || ''
const baseOf = n => String(n).split(/[\\/]/).pop()
const stemOf = n => baseOf(n).replace(/\.[^.]+$/, '')
const safe = n => String(n || '').replace(/[\\/:*?"<>|#^[\]\u0000-\u001f]+/g, '').trim().slice(0, 80) || 'Scene'
const fmtBytes = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB'
const exts = x => [].concat(x?.ext || x?.exts || []).map(e => String(e).replace(/^\./, '').toLowerCase())
const r4 = n => Math.round(n * 1e4) / 1e4
const tick = () => new Promise(r => setTimeout(r, 0))
const V3 = THREE.Vector3

function dataURLBytes (u) {
  if (!u) return null
  const i = u.indexOf(','), meta = u.slice(5, i), body = u.slice(i + 1)
  if (!/;base64/i.test(meta)) return new TextEncoder().encode(decodeURIComponent(body))
  return b64Bytes(body)
}
function b64Bytes (b) { const s = atob(b); const a = new Uint8Array(s.length); for (let k = 0; k < s.length; k++) a[k] = s.charCodeAt(k); return a }
function bytesToB64 (bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s) }
async function toBytes (d) {
  if (d instanceof Uint8Array) return d
  if (d instanceof ArrayBuffer) return new Uint8Array(d)
  if (ArrayBuffer.isView(d)) return new Uint8Array(d.buffer, d.byteOffset, d.byteLength)
  if (d instanceof Blob) return new Uint8Array(await d.arrayBuffer())
  if (typeof d === 'string') return d.startsWith('data:') ? dataURLBytes(d) : new TextEncoder().encode(d)
  if (d && typeof d === 'object') return new TextEncoder().encode(JSON.stringify(d))
  return new Uint8Array(0)
}

// ---------- virtual files ----------
function vfile (x, path) {
  if (x && x.blob && x.name) return x
  const blob = x?.file || x
  const p = path || x?.path || blob.webkitRelativePath || blob.name || 'file'
  return { name: baseOf(p), path: p, ext: extOf(p), blob, buffer: () => blob.arrayBuffer(), text: () => blob.text() }
}
async function expand (files, depth = 0) {
  const out = []
  for (const f of files) {
    if (f.ext !== 'zip' || depth > 2) { out.push(f); continue }
    const { unzipSync } = await L('libs/fflate.module.js')
    const entries = unzipSync(new Uint8Array(await f.buffer()))
    const inner = []
    for (const [p, data] of Object.entries(entries)) {
      if (p.endsWith('/') || /(^|\/)(__MACOSX|\.)/.test(p)) continue
      inner.push(vfile(new Blob([data]), p))
    }
    out.push(...await expand(inner, depth + 1))
  }
  return out
}
function finder (files) {
  return url => {
    if (!url) return null
    let u = String(url).split(/[?#]/)[0]
    try { u = decodeURIComponent(u) } catch {}
    u = u.replace(/\\/g, '/').replace(/^(\.\/)+/, '').toLowerCase()
    return files.find(f => f.path.toLowerCase() === u) ||
      files.find(f => f.path.toLowerCase().endsWith('/' + u) || u.endsWith('/' + f.path.toLowerCase())) ||
      files.find(f => f.name.toLowerCase() === baseOf(u))
  }
}
function makeManager (find, warn) {
  const M = new THREE.LoadingManager(), urls = new Map()
  let pending = 0
  const s = M.itemStart.bind(M), e = M.itemEnd.bind(M)
  M.itemStart = u => { pending++; s(u) }
  M.itemEnd = u => { pending = Math.max(0, pending - 1); e(u) }
  M.setURLModifier(url => {
    if (/^(data|blob):/.test(url)) return url
    const f = find(url)
    if (!f) {
      if (/^https?:/.test(url)) return url
      warn.add('missing ' + baseOf(url))
      return IMAGE_EXT.includes(extOf(url)) || /\.(tga|dds|ktx2?|tif|tiff)$/i.test(url) ? MISSING_IMG : url
    }
    if (!urls.has(f)) urls.set(f, URL.createObjectURL(f.blob))
    return urls.get(f)
  })
  M.idle = async (ms = 15000) => { const t0 = performance.now(); while (pending > 0 && performance.now() - t0 < ms) await new Promise(r => setTimeout(r, 30)) }
  M.dispose = () => { urls.forEach(u => URL.revokeObjectURL(u)); urls.clear() }
  return M
}
function makeCtx (app, files) {
  const warn = new Set(), find = finder(files)
  let last = performance.now(), n = 0
  return {
    app, files, find, warn, tex: new Map(), skipped: 0, manager: makeManager(find, warn),
    key: () => 'k' + (n++),
    async yield () { if (performance.now() - last > 40) { await tick(); last = performance.now() } },
  }
}

// ---------- glTF packing (no network: external buffers and images go into one GLB) ----------
const IMG_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', ktx2: 'image/ktx2', gif: 'image/gif' }
const isGLB = buf => buf.byteLength > 12 && new DataView(buf).getUint32(0, true) === 0x46546C67
async function packGLB (json, ctx) {
  const chunks = []; let len = 0
  const add = bytes => { const off = len; chunks.push([off, bytes]); len = (len + bytes.length + 3) & ~3; return off }
  const bufOff = []
  for (const b of json.buffers || []) {
    let bytes
    if (!b.uri) bytes = new Uint8Array(b.byteLength || 0)
    else if (b.uri.startsWith('data:')) bytes = dataURLBytes(b.uri)
    else { const f = ctx.find(b.uri); if (!f) throw new Error('Missing file: ' + b.uri); bytes = new Uint8Array(await f.buffer()) }
    bufOff.push(add(bytes))
  }
  for (const v of json.bufferViews || []) {
    v.byteOffset = (v.byteOffset || 0) + (bufOff[v.buffer] || 0); v.buffer = 0
    const mo = v.extensions?.EXT_meshopt_compression || v.extensions?.KHR_meshopt_compression
    if (mo) { mo.byteOffset = (mo.byteOffset || 0) + (bufOff[mo.buffer] || 0); mo.buffer = 0 }
  }
  for (const im of json.images || []) {
    if (!im.uri || im.uri.startsWith('data:')) continue
    const f = ctx.find(im.uri); if (!f) continue
    const bytes = new Uint8Array(await f.buffer())
    json.bufferViews = json.bufferViews || []
    json.bufferViews.push({ buffer: 0, byteOffset: add(bytes), byteLength: bytes.length })
    im.bufferView = json.bufferViews.length - 1; im.mimeType = im.mimeType || IMG_MIME[f.ext] || 'image/png'; delete im.uri
  }
  if (len) json.buffers = [{ byteLength: len }]; else delete json.buffers
  const bin = new Uint8Array(len); for (const [o, b] of chunks) bin.set(b, o)
  const js = new TextEncoder().encode(JSON.stringify(json)), jl = (js.length + 3) & ~3
  const total = 20 + jl + (len ? 8 + len : 0)
  const out = new Uint8Array(total), dv = new DataView(out.buffer)
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true)
  dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true); out.set(js, 20)
  for (let i = 20 + js.length; i < 20 + jl; i++) out[i] = 0x20
  if (len) { const o = 20 + jl; dv.setUint32(o, len, true); dv.setUint32(o + 4, 0x004E4942, true); out.set(bin, o + 8) }
  return out.buffer
}

// ---------- loaders (each lazy) ----------
async function loadObject (f, ctx) {
  const M = ctx.manager, ext = f.ext
  switch (ext) {
    case 'glb': case 'gltf': {
      let buf = await f.buffer()
      if (!isGLB(buf)) buf = await packGLB(JSON.parse(new TextDecoder().decode(buf)), ctx)
      const { GLTFLoader } = await L('loaders/GLTFLoader.js')
      const loader = new GLTFLoader(M)
      try { const { MeshoptDecoder } = await L('libs/meshopt_decoder.module.js'); loader.setMeshoptDecoder(MeshoptDecoder) } catch {}
      loader.register(p => { p.textureLoader = new THREE.TextureLoader(p.options.manager); return { name: 'studio_img' } })
      const g = await new Promise((res, rej) => loader.parse(buf, '', res, rej))
      return { root: g.scene || g.scenes?.[0] || new THREE.Group(), animations: g.animations || [], bytes: new Uint8Array(buf), format: 'glb' }
    }
    case 'obj': {
      const { OBJLoader } = await L('loaders/OBJLoader.js')
      const loader = new OBJLoader(M), text = await f.text()
      const lib = (text.match(/^mtllib\s+(.+?)\s*$/m) || [])[1]
      const mtl = (lib && ctx.find(lib)) || ctx.files.find(x => x.ext === 'mtl')
      if (mtl) {
        const { MTLLoader } = await L('loaders/MTLLoader.js')
        const mc = new MTLLoader(M).parse(await mtl.text(), ''); mc.preload(); loader.setMaterials(mc)
      }
      return { root: loader.parse(text) }
    }
    case 'fbx': {
      const { FBXLoader } = await L('loaders/FBXLoader.js')
      const root = new FBXLoader(M).parse(await f.buffer(), '')
      return { root, animations: root.animations || [] }
    }
    case 'stl': {
      const { STLLoader } = await L('loaders/STLLoader.js')
      const geo = new STLLoader(M).parse(await f.buffer())
      const mat = new THREE.MeshStandardMaterial({ color: 0xa3a2a5, vertexColors: !!geo.hasColors })
      return { root: new THREE.Mesh(geo, mat) }
    }
    case 'ply': {
      const { PLYLoader } = await L('loaders/PLYLoader.js')
      const geo = new PLYLoader(M).parse(await f.buffer())
      if (!geo.index) throw new Error(f.name + ' is a point cloud: Studio imports surfaces only')
      return { root: new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: !!geo.attributes.color })) }
    }
    case 'dae': {
      const { ColladaLoader } = await L('loaders/ColladaLoader.js')
      const r = new ColladaLoader(M).parse(await f.text(), '')
      return { root: r.scene, animations: r.scene?.animations || [] } // r.animations is a deprecated getter that warns
    }
    case '3mf': { const { ThreeMFLoader } = await L('loaders/3MFLoader.js'); return { root: new ThreeMFLoader(M).parse(await f.buffer()) } }
    case '3ds': { const { TDSLoader } = await L('loaders/TDSLoader.js'); return { root: new TDSLoader(M).parse(await f.buffer(), '') } }
    case 'amf': { const { AMFLoader } = await L('loaders/AMFLoader.js'); return { root: new AMFLoader(M).parse(await f.buffer()) } }
    case 'wrl': case 'vrml': { const { VRMLLoader } = await L('loaders/VRMLLoader.js'); return { root: new VRMLLoader(M).parse(await f.text(), '') } }
    case 'vox': {
      const mod = await L('loaders/VOXLoader.js')
      const r = new mod.VOXLoader(M).parse(await f.buffer())
      const root = new THREE.Group()
      if (r?.isObject3D) root.add(r)
      else if (r?.scene) root.add(r.scene)
      else for (const c of (Array.isArray(r) ? r : r?.chunks || [])) root.add(mod.buildMesh ? mod.buildMesh(c) : new mod.VOXMesh(c)) // VOXMesh warns since r182
      return { root }
    }
    case 'usdz': case 'usda': case 'usdc': {
      const mod = await L('loaders/USDLoader.js') // USDZLoader is a deprecated alias that warns
      const Loader = mod.USDLoader
      const r = await new Loader(M).parse(await f.buffer())
      return { root: r?.scene || r }
    }
    case 'svg': return svgObject(f, ctx)
  }
  throw new Error('Unsupported file: ' + f.name)
}

async function svgObject (f, ctx) {
  const { SVGLoader } = await L('loaders/SVGLoader.js')
  const data = new SVGLoader().parse(await f.text())
  const group = new THREE.Group(); let i = 0
  for (const p of data.paths) {
    const st = p.userData?.style || {}
    if (st.fill === 'none' || st.fill === 'transparent') { ctx.skipped++; continue }
    const shapes = p.toShapes(); if (!shapes.length) continue
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 8 })
    const op = (st.fillOpacity ?? 1) * (st.opacity ?? 1)
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: p.color, opacity: op, transparent: op < 1, roughness: 0.6 }))
    m.name = p.userData?.node?.id || 'Path ' + (i + 1)
    m.position.z = i++ * 0.05
    group.add(m)
  }
  if (!group.children.length) throw new Error(f.name + ' has no filled shapes')
  const box = new THREE.Box3().setFromObject(group), size = box.getSize(new V3)
  const s = 8 / Math.max(size.x, size.y, 1e-6)
  group.scale.set(s, -s, 0.4)
  group.position.set(-(box.min.x + size.x / 2) * s, box.max.y * s, 0)
  const root = new THREE.Group(); root.add(group)
  return { root }
}

// ---------- geometry conversion ----------
function pickAttr (a, s, n, at) {
  const out = new Float32Array(n * s)
  for (let i = 0; i < n; i++) { const v = at(i); out[i * s] = a.getX(v); if (s > 1) out[i * s + 1] = a.getY(v); if (s > 2) out[i * s + 2] = a.getZ(v) }
  return new THREE.BufferAttribute(out, s)
}
function cleanGeometry (src, gr) {
  const pos = src.attributes.position, idx = src.index, keys = ['position', 'normal', 'uv', 'color']
  const g = new THREE.BufferGeometry()
  let start = 0, end = idx ? idx.count : pos.count
  if (gr) { start = gr.start; end = Math.min(end, gr.start + gr.count) }
  if (end - start < 3) return null
  if (idx) {
    const map = new Int32Array(pos.count).fill(-1), order = [], ni = new Uint32Array(end - start)
    for (let i = start; i < end; i++) { const v = idx.getX(i); if (map[v] < 0) { map[v] = order.length; order.push(v) } ni[i - start] = map[v] }
    for (const k of keys) { const a = src.attributes[k]; if (a) g.setAttribute(k, pickAttr(a, k === 'color' ? 3 : Math.min(a.itemSize, 3), order.length, i => order[i])) }
    g.setIndex(new THREE.BufferAttribute(ni, 1))
  } else {
    for (const k of keys) { const a = src.attributes[k]; if (a) g.setAttribute(k, pickAttr(a, k === 'color' ? 3 : Math.min(a.itemSize, 3), end - start, i => start + i)) }
  }
  return g
}
function flipWinding (g) {
  if (g.index) { const a = g.index.array; for (let i = 0; i + 2 < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t } return }
  for (const k in g.attributes) {
    const at = g.attributes[k], s = at.itemSize, arr = at.array
    for (let i = 0; i + 2 < at.count; i += 3) for (let j = 0; j < s; j++) { const x = arr[(i + 1) * s + j]; arr[(i + 1) * s + j] = arr[(i + 2) * s + j]; arr[(i + 2) * s + j] = x }
  }
}
function fixUV (uv, t) {
  const needM = t.repeat.x !== 1 || t.repeat.y !== 1 || t.offset.x || t.offset.y || t.rotation
  const flip = t.flipY === false && TEX_FLIPY
  if (!needM && !flip) return
  if (needM) t.updateMatrix()
  const v = new THREE.Vector2()
  for (let i = 0; i < uv.count; i++) { v.fromBufferAttribute(uv, i); if (needM) v.applyMatrix3(t.matrix); if (flip) v.y = 1 - v.y; uv.setXY(i, v.x, v.y) }
}
function isSmooth (g) {
  const n = g.attributes.normal, p = g.attributes.position; if (!n) return false
  const idx = g.index, tri = Math.floor((idx ? idx.count : p.count) / 3), step = Math.max(1, Math.floor(tri / 3000))
  const a = new V3(), b = new V3(), c = new V3(), fn = new V3(), e = new V3(), vn = new V3()
  let curved = 0, tot = 0
  for (let t = 0; t < tri; t += step) {
    const ii = [t * 3, t * 3 + 1, t * 3 + 2].map(k => idx ? idx.getX(k) : k)
    a.fromBufferAttribute(p, ii[0]); b.fromBufferAttribute(p, ii[1]); c.fromBufferAttribute(p, ii[2])
    fn.subVectors(c, b).cross(e.subVectors(a, b)); if (fn.lengthSq() < 1e-20) continue
    fn.normalize()
    for (const i of ii) { vn.fromBufferAttribute(n, i); if (!vn.lengthSq()) continue; vn.normalize(); tot++; if (vn.dot(fn) < 0.996) curved++ }
  }
  return tot > 0 && curved / tot > 0.25
}
function subTris (src, tris) {
  const g = new THREE.BufferGeometry()
  for (const k of ['position', 'normal', 'uv']) {
    const a = src.attributes[k]; if (!a) continue
    const s = a.itemSize, out = new Float32Array(tris.length * 3 * s); let o = 0
    for (const t of tris) for (let v = 0; v < 3; v++) for (let j = 0; j < s; j++) out[o++] = a.array[(t * 3 + v) * s + j]
    g.setAttribute(k, new THREE.BufferAttribute(out, s))
  }
  return g
}
function splitByColor (g, baseHex, max = 24) {
  const base = new THREE.Color(baseHex || '#ffffff')
  const src = g.index ? g.toNonIndexed() : g
  const col = src.attributes.color, tri = src.attributes.position.count / 3
  const buckets = new Map(), cc = new THREE.Color()
  for (let t = 0; t < tri; t++) {
    cc.setRGB(col.getX(t * 3), col.getY(t * 3), col.getZ(t * 3)).multiply(base)
    const k = cc.getHexString(); let b = buckets.get(k); if (!b) buckets.set(k, b = []); b.push(t)
  }
  let keys = [...buckets.keys()]
  if (keys.length > max) {
    keys.sort((a, b) => buckets.get(b).length - buckets.get(a).length)
    const keep = keys.slice(0, max), kc = keep.map(k => new THREE.Color('#' + k))
    for (const k of keys.slice(max)) {
      const c = new THREE.Color('#' + k); let bi = 0, bd = Infinity
      kc.forEach((x, i) => { const d = (x.r - c.r) ** 2 + (x.g - c.g) ** 2 + (x.b - c.b) ** 2; if (d < bd) { bd = d; bi = i } })
      const dst = buckets.get(keep[bi]); for (const t of buckets.get(k)) dst.push(t)
    }
    keys = keep
  }
  return keys.map(k => ({ g: subTris(src, buckets.get(k)), color: '#' + k }))
}
function countTris (root) {
  let n = 0
  root.traverse(o => { const g = o.isMesh && o.geometry; if (g?.attributes?.position) n += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1) })
  return Math.round(n)
}
const hasSkin = root => { let s = false; root.traverse(o => { if (o.isSkinnedMesh) s = true }); return s }

// ---------- materials and textures ----------
let MATN
const matNames = () => MATN || (MATN = Array.isArray(MATERIALS) ? MATERIALS.map(m => typeof m === 'string' ? m : m?.name).filter(Boolean) : Object.keys(MATERIALS || {}))
const pickMat = n => matNames().includes(n) ? n : null
function drawable (img, max) {
  const w0 = img?.width || img?.naturalWidth || img?.videoWidth, h0 = img?.height || img?.naturalHeight || img?.videoHeight
  if (!w0 || !h0) return null
  const s = Math.min(1, max / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * s)), hh = Math.max(1, Math.round(h0 * s))
  const cv = document.createElement('canvas'); cv.width = w; cv.height = hh
  const cx = cv.getContext('2d')
  if (img.data && typeof HTMLImageElement !== 'undefined' && !(img instanceof HTMLImageElement)) {
    if (!(img.data instanceof Uint8Array || img.data instanceof Uint8ClampedArray) || img.data.length !== w0 * h0 * 4) return null
    const tmp = document.createElement('canvas'); tmp.width = w0; tmp.height = h0
    tmp.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(img.data), w0, h0), 0, 0)
    cx.drawImage(tmp, 0, 0, w, hh)
  } else cx.drawImage(img, 0, 0, w, hh)
  return cv
}
function imageURL (img, max = 1024, type = 'image/webp') {
  const cv = drawable(img, max); if (!cv) return null
  const u = cv.toDataURL(type, 0.85)
  return u.startsWith('data:' + type) ? u : cv.toDataURL('image/png')
}
function texToStore (app, t, ctx) {
  const img = t.image
  if (ctx.tex.has(img)) return ctx.tex.get(img)
  let id = null
  try { const data = imageURL(img); if (data) id = app.tex.put({ kind: 'image', data }) } catch { ctx.warn.add('a texture could not be read') }
  ctx.tex.set(img, id); return id
}
function matInfo (app, m, ctx) {
  const r = { color: '#ffffff', material: pickMat('Plastic') }
  if (!m) return r
  if (m.color) r.color = '#' + m.color.getHexString()
  const op = m.opacity ?? 1
  if (m.transparent && op < 1) r.transparency = Math.round((1 - op) * 100) / 100
  const em = m.emissive ? Math.max(m.emissive.r, m.emissive.g, m.emissive.b) * (m.emissiveIntensity ?? 1) : 0
  if (em > 0.4 && !m.emissiveMap) { r.material = pickMat('Neon') || r.material; if (r.color === '#000000') r.color = '#' + m.emissive.getHexString() }
  else if ((m.transmission || 0) > 0.3 || ((r.transparency || 0) > 0.3 && (m.roughness ?? 1) < 0.35)) r.material = pickMat('Glass') || r.material
  else if ((m.metalness || 0) > 0.5) r.material = pickMat('Metal') || r.material
  else if (m.roughness !== undefined && m.roughness < 0.4) r.material = pickMat('SmoothPlastic') || r.material
  if (m.map?.image) { const id = texToStore(app, m.map, ctx); if (id) r.texture = id }
  if (!r.material) delete r.material
  return r
}

// ---------- plans: objects to add, built before one undo step ----------
async function meshNodes (app, loaded, ctx, label) {
  let root = loaded.root
  if (loaded.zUp) { const w = new THREE.Group(); w.rotation.x = -Math.PI / 2; w.add(root); root = w }
  root.updateMatrixWorld(true)
  const meshes = [], lights = []
  const walk = o => { if (o.visible === false || o.userData?.shadowOnly) return; if (o.isMesh) meshes.push(o); else if (o.isLight) lights.push(o); else if (o.isPoints || o.isLine) ctx.skipped++; o.children.forEach(walk) }
  walk(root)
  const items = [], im = new THREE.Matrix4()
  for (const mesh of meshes) {
    const src = mesh.geometry; if (!src?.attributes?.position) continue
    const count = mesh.isInstancedMesh ? Math.min(mesh.count, 500) : 1
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const groups = Array.isArray(mesh.material) && src.groups.length ? src.groups : [null]
    for (let k = 0; k < count; k++) {
      const m4 = mesh.matrixWorld.clone()
      if (mesh.isInstancedMesh) { mesh.getMatrixAt(k, im); m4.multiply(im) }
      for (const gr of groups) {
        const mat = gr ? mats[gr.materialIndex || 0] : mats[0]
        const g = cleanGeometry(src, gr); if (!g) continue
        g.applyMatrix4(m4)
        if (m4.determinant() < 0) flipWinding(g)
        const info = matInfo(app, mat, ctx)
        if (mat?.map && g.attributes.uv) fixUV(g.attributes.uv, mat.map)
        const useCol = g.attributes.color && (mat?.vertexColors || ctx.vcolors)
        const pieces = useCol ? splitByColor(g, info.color) : [{ g, color: info.color }]
        const name = mesh.name || mesh.parent?.name || label
        pieces.forEach((p, i) => items.push({ g: p.g, name: pieces.length > 1 ? `${name} ${i + 1}` : name, info: { ...info, color: p.color } }))
        await ctx.yield()
      }
    }
  }
  const nodes = [], many = items.length + lights.length > 1, gk = ctx.key()
  if (many) nodes.push({ key: gk, obj: { type: 'group', name: label } })
  const parent = many ? gk : null
  for (const it of items) {
    const g = it.g
    if (g.attributes.color) g.deleteAttribute('color')
    const smooth = isSmooth(g)
    if (g.attributes.normal) g.deleteAttribute('normal')
    g.computeBoundingBox()
    const c = g.boundingBox.getCenter(new V3())
    g.translate(-c.x, -c.y, -c.z)
    const data = fromBufferGeometry(g, { weld: true, quads: true })
    g.dispose()
    nodes.push({ key: ctx.key(), parent, geoData: data, obj: { type: 'mesh', name: it.name, pos: [r4(c.x), r4(c.y), r4(c.z)], smooth, ...it.info } })
    await ctx.yield()
  }
  const p = new V3()
  for (const l of lights) {
    const kind = l.isDirectionalLight ? 'directional' : l.isSpotLight ? 'spot' : l.isPointLight ? 'point' : null
    if (!kind) continue
    l.getWorldPosition(p)
    const o = { type: 'light', kind, name: l.name || 'Light', pos: [r4(p.x), r4(p.y), r4(p.z)], color: '#' + l.color.getHexString(), intensity: r4(Math.min(50, l.intensity)) }
    if (l.distance) o.range = r4(l.distance)
    if (l.isSpotLight) o.angle = Math.round(THREE.MathUtils.radToDeg(l.angle))
    nodes.push({ key: ctx.key(), parent, obj: o })
  }
  return nodes
}

const modelCache = new Map()
async function modelNodes (app, f, loaded, ctx, label) {
  let bytes, format
  if (ctx.files.length === 1 && MODEL_OK.includes(f.ext) && f.ext !== 'gltf') { bytes = loaded.bytes || new Uint8Array(await f.buffer()); format = loaded.format || f.ext }
  else if (loaded.bytes) { bytes = loaded.bytes; format = 'glb' }
  else {
    const { GLTFExporter } = await L('exporters/GLTFExporter.js')
    bytes = new Uint8Array(await new GLTFExporter().parseAsync(loaded.root, { binary: true, animations: loaded.animations || [] })); format = 'glb'
  }
  const name = stemOf(f.name) + '.' + format
  let src = null
  const b64len = Math.ceil(bytes.length / 3) * 4
  if (b64len < INLINE_MAX) src = { data: 'data:' + (MIME[format] || 'application/octet-stream') + ';base64,' + bytesToB64(bytes), format, name }
  else {
    const up = await upload(app, bytes, MIME[format]).catch(() => null)
    if (up) src = { asset: up.id, format, name }
  }
  if (!src) return null
  modelCache.set(srcKey(src), Promise.resolve({ root: loaded.root, animations: loaded.animations || [] }))
  return [{ key: ctx.key(), obj: { type: 'model', name: label, src, pos: [0, 0, 0] } }]
}
const srcKey = src => src.asset || src.url || src.data
async function loadModelSrc (app, src) {
  const key = srcKey(src)
  if (!modelCache.has(key)) {
    const p = (async () => {
      let bytes
      if (src.data) bytes = dataURLBytes(src.data)
      else {
        const r = await fetch(src.url || '/_blob/' + src.asset)
        if (!r.ok) throw new Error('Model file not found')
        bytes = new Uint8Array(await r.arrayBuffer())
      }
      const f = vfile(new Blob([bytes]), src.name || 'model.' + (src.format || 'glb'))
      if (src.format && f.ext !== src.format) { f.ext = src.format }
      const ctx = makeCtx(app, [f])
      const r = await loadObject(f, ctx); await ctx.manager.idle(); ctx.manager.dispose()
      return { root: r.root, animations: r.animations || [] }
    })()
    modelCache.set(key, p)
    p.catch(() => modelCache.delete(key))
  }
  const r = await modelCache.get(key)
  const { clone } = await L('utils/SkeletonUtils.js')
  const o = clone(r.root)
  o.animations = r.animations; o.userData.clips = r.animations
  return o
}

function studioNodes (app, data, ctx) {
  const objs = data.objects || {}
  for (const [gid, g] of Object.entries(data.geo || {})) if (g && !app.geo.peek(gid)) app.geo.put(g, gid)
  for (const [tid, t] of Object.entries(data.tex || {})) if (t && !app.tex.peek(tid)) app.tex.put(t, tid)
  const nodes = [], done = new Set()
  const visit = id => {
    if (done.has(id) || !objs[id]) return
    done.add(id)
    const o = objs[id], par = o.parent && objs[o.parent] ? o.parent : null
    if (par) visit(par)
    const obj = { ...o }; delete obj.parent; delete obj.id
    nodes.push({ key: id, parent: par, obj })
  }
  Object.keys(objs).forEach(visit)
  const textures = data.textures || {}, anims = data.anims || {}
  const after = idOf => {
    for (const [tid, t] of Object.entries(textures)) if (!app.scene?.textures?.[tid]) { try { app.putTexture(tid, t) } catch {} }
    for (const [aid, a] of Object.entries(anims)) {
      if (!a) continue
      const tracks = {}
      for (const [oid, tr] of Object.entries(a.tracks || {})) if (idOf[oid]) tracks[idOf[oid]] = tr
      if (!Object.keys(tracks).length) continue
      try { app.putAnim(app.scene?.anims?.[aid] ? aid + '-' + Math.random().toString(36).slice(2, 6) : aid, { ...a, tracks }) } catch {}
    }
  }
  return { nodes, after }
}

function applyNodes (app, nodes, label, afters = []) {
  const tops = []
  app.transact(label, () => {
    const idOf = {}
    for (const n of nodes) {
      const o = { ...n.obj }
      if (n.geoData) o.geo = app.geo.put(n.geoData)
      if (n.parent != null && idOf[n.parent]) o.parent = idOf[n.parent]
      const id = app.add(o); idOf[n.key] = id
      if (!o.parent) tops.push(id)
    }
    for (const a of afters) a(idOf)
  })
  return tops
}

// ---------- progress ----------
function progress () {
  let el = null, txt = '', frac = 0, gone = false
  const show = () => {
    if (gone || el) return
    el = h('div', 'io-prog', '<div class="io-prog-t"><span></span><b></b></div><div class="io-bar"><i></i></div>')
    document.body.appendChild(el); paint()
  }
  const paint = () => { if (!el) return; el.querySelector('span').textContent = txt; el.querySelector('b').textContent = Math.round(frac * 100) + '%'; el.querySelector('i').style.width = Math.round(frac * 100) + '%' }
  const t = setTimeout(show, 150)
  return { set (s, f) { txt = s; frac = Math.max(0, Math.min(1, f)); paint() }, done () { gone = true; clearTimeout(t); el?.remove() } }
}

// ---------- import ----------
function foreignImporter (app, ext) {
  const list = Array.isArray(app.importers) ? app.importers : Object.values(app.importers || {})
  return list.find(i => !i.io && exts(i).includes(ext))
}
async function argFile (a) {
  let bytes
  if (a.data) bytes = String(a.data).startsWith('data:') ? dataURLBytes(a.data) : b64Bytes(a.data)
  else {
    const r = await fetch(a.url || '/_blob/' + a.asset)
    if (!r.ok) throw new Error('Could not read ' + (a.url || a.asset))
    bytes = new Uint8Array(await r.arrayBuffer())
  }
  return new File([bytes], a.name || 'import.' + (a.format || 'glb'))
}

async function importFiles (app, input, opts = {}) {
  const prog = progress()
  try {
    prog.set('Reading files', 0)
    const all = await expand(input.map(x => vfile(x)))
    let mains = all.filter(f => MODEL_EXT.includes(f.ext) || f.ext === 'json' || foreignImporter(app, f.ext))
    if (!mains.length) {
      const imgs = all.filter(f => IMAGE_EXT.includes(f.ext))
      if (imgs.length) return await importImages(app, imgs, opts, prog)
      throw new Error('Nothing to import. Studio reads glb, gltf, obj, fbx, stl, ply, dae, 3mf, 3ds, vox, wrl, amf, usdz, svg, json, zip and images')
    }
    if (mains.some(f => f.ext === 'gltf' || f.ext === 'glb')) mains = mains.filter(f => !(f.ext === 'json' && all.some(g => g.ext === 'gltf')))
    const ctx = makeCtx(app, all)
    const loaded = [], nodes = [], afters = [], foreignIds = []
    let tris = 0
    for (const [i, f] of mains.entries()) {
      prog.set('Reading ' + f.name, i / mains.length * 0.4)
      const fi = foreignImporter(app, f.ext)
      if (fi && !MODEL_EXT.includes(f.ext) && f.ext !== 'json') { const r = await fi.load(new File([f.blob], f.name), app); if (r) foreignIds.push(...[].concat(r.ids || r)); continue }
      if (f.ext === 'json') {
        const data = JSON.parse(await f.text())
        if (data?.objects) { const s = studioNodes(app, data, ctx); nodes.push(...s.nodes); afters.push(s.after); continue }
        if (!data?.asset?.version) throw new Error(f.name + ' is not a Studio scene')
        f.ext = 'gltf'
      }
      const r = await loadObject(f, ctx)
      await ctx.manager.idle()
      r.zUp = ZUP.includes(f.ext)
      r.tris = countTris(r.root)
      r.animated = (r.animations?.length > 0) || hasSkin(r.root)
      tris += r.tris
      loaded.push([f, r])
      await tick()
    }
    let as = opts.as
    if (tris > TRI_WARN && !opts.yes && !as) {
      const canModel = loaded.every(([f]) => MODEL_OK.includes(f.ext))
      const choice = await ask('Large model', `${tris.toLocaleString('en-US')} triangles. Over ${TRI_WARN.toLocaleString('en-US')} slows the editor, most of all on phones. Reduce it in a modelling app first, or import it now.`, [
        canModel && { value: 'model', label: 'Import as one model', hint: 'Fast to draw, not editable as a mesh', icon: 'io-cube' },
        { value: 'mesh', label: 'Import as editable meshes', hint: 'Every part editable, slower', icon: 'io-import' },
      ].filter(Boolean))
      if (!choice) return null
      as = choice
    }
    for (const [i, [f, r]] of loaded.entries()) {
      prog.set('Converting ' + f.name, 0.4 + i / loaded.length * 0.55)
      ctx.vcolors = VCOL.includes(f.ext)
      const label = opts.name || stemOf(f.name)
      let part = null
      if (as === 'model' || (r.animated && as !== 'mesh')) {
        part = await modelNodes(app, f, r, ctx, label)
        if (!part) ctx.warn.add(r.animated ? 'file too big to keep its animation without project assets: imported as still meshes' : 'project assets unavailable: imported as meshes')
      }
      if (!part) part = await meshNodes(app, r, ctx, label)
      nodes.push(...part)
    }
    ctx.manager.dispose()
    prog.set('Adding to scene', 0.97)
    let ids = foreignIds
    if (nodes.length) {
      const label = mains.length === 1 ? 'Import ' + mains[0].name : `Import ${mains.length} files`
      ids = ids.concat(applyNodes(app, nodes, label, afters))
    }
    if (ids.length && opts.select !== false) { try { app.select(ids) } catch {} ; app.viewport?.frame?.(ids, 400) }
    const warn = [...ctx.warn]
    if (ctx.skipped) warn.push(`${ctx.skipped} lines or points skipped`)
    const msg = `Imported ${nodes.length} object${nodes.length === 1 ? '' : 's'}` + (warn.length ? ' · ' + warn.slice(0, 2).join(' · ') : '')
    if (!opts.quiet) app.toast(msg, warn.length ? 'warn' : undefined)
    return { ids, count: nodes.length, tris, warnings: warn }
  } finally { prog.done() }
}

async function importImages (app, imgs, opts, prog) {
  const sel = (app.selection || []).filter(id => { const o = app.obj(id); return o && (o.type === 'part' || o.type === 'mesh') })
  let as = opts.as || (opts.target ? 'texture' : null)
  if (!as) {
    if (!sel.length || opts.yes) as = 'plane'
    else {
      as = await ask('Use image', null, [
        { value: 'texture', label: 'Texture on selection', hint: `Apply to ${sel.length} selected object${sel.length === 1 ? '' : 's'}`, icon: 'io-image' },
        { value: 'plane', label: 'Image plane', hint: 'New upright plane with the picture', icon: 'io-cube' },
      ])
      if (!as) return null
    }
  }
  const made = []
  for (const [i, f] of imgs.entries()) {
    prog.set('Reading ' + f.name, i / imgs.length)
    const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f.blob) })
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Could not read image ' + f.name)); im.src = url })
    const data = imageURL(img, 1024)
    made.push({ f, tid: app.tex.put({ kind: 'image', data }), w: img.naturalWidth, h: img.naturalHeight })
  }
  if (as === 'texture') {
    const ids = opts.target ? [opts.target] : sel
    app.transact('Apply image', () => { for (const id of ids) app.set(id, { texture: made[0].tid }) })
    if (!opts.quiet) app.toast('Image applied to ' + ids.length + ' object' + (ids.length === 1 ? '' : 's'))
    return { ids, count: 0, texture: made[0].tid }
  }
  const nodes = []; let x = 0
  for (const m of made) {
    const asp = m.w / m.h, W = asp >= 1 ? 6 : 6 * asp, H = W / asp
    const geoData = { verts: [-W / 2, -H / 2, 0, W / 2, -H / 2, 0, W / 2, H / 2, 0, -W / 2, H / 2, 0], faces: [[0, 1, 2, 3], [3, 2, 1, 0]], uvs: [0, 0, 1, 0, 1, 1, 0, 1] }
    nodes.push({ key: 'i' + nodes.length, geoData, obj: { type: 'mesh', name: stemOf(m.f.name), pos: [r4(x + W / 2), r4(H / 2), 0], color: '#ffffff', material: pickMat('SmoothPlastic') || pickMat('Plastic') || undefined, texture: m.tid, smooth: false } })
    x += W + 1
  }
  const off = x > 0 ? (x - 1) / 2 : 0
  for (const n of nodes) n.obj.pos[0] = r4(n.obj.pos[0] - off)
  const ids = applyNodes(app, nodes, nodes.length === 1 ? 'Import image' : 'Import images')
  try { app.select(ids) } catch {}
  app.viewport?.frame?.(ids, 400)
  if (!opts.quiet) app.toast(`Imported ${ids.length} image${ids.length === 1 ? '' : 's'}`)
  return { ids, count: ids.length }
}

let picker = null
function pickFiles (app) {
  picker?.remove()
  const inp = picker = h('input')
  inp.type = 'file'; inp.multiple = true
  inp.accept = [...MODEL_EXT, 'json', 'zip', 'bin', 'mtl', ...IMAGE_EXT, ...foreignExts(app)].map(e => '.' + e).join(',')
  inp.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
  inp.onchange = () => { const files = [...inp.files]; inp.remove(); if (files.length) app.exec('io.import', { files }) }
  inp.addEventListener('cancel', () => inp.remove())
  document.body.appendChild(inp)
  inp.click()
}
const foreignExts = app => (Array.isArray(app.importers) ? app.importers : Object.values(app.importers || {})).filter(i => !i.io).flatMap(exts)

// ---------- export ----------
async function exportRoot (app, o = {}) {
  const vp = app.viewport; if (!vp) throw new Error('Open a project first')
  const { clone } = await L('utils/SkeletonUtils.js')
  const ids = o.selection ? [...(app.selection || [])] : app.ids()
  if (o.selection && !ids.length) throw new Error('Nothing selected: select objects or turn off Selected only')
  const set = new Set()
  for (const id of ids) { if (app.isTemp?.(id)) continue; set.add(id); for (const d of app.descendants(id) || []) if (!app.isTemp?.(d)) set.add(d) }   // temporary models never export
  const o3s = new Map()
  for (const id of set) { const x = vp.objects.get(id); if (x) o3s.set(x, id) }
  const root = new THREE.Group(); root.name = safe(o.name || app.scene?.name)
  const names = new Map()
  for (const [x, id] of o3s) {
    let p = x.parent, covered = false
    while (p) { if (o3s.has(p)) { covered = true; break } p = p.parent }
    if (covered || x.visible === false || app.isHidden?.(id)) continue
    x.updateWorldMatrix(true, true)
    const stash = [], cut = []
    x.traverse(n => { const tid = n.userData?.id; if (tid != null && tid !== id && app.isTemp?.(tid) && n.parent) cut.push([n, n.parent, n.parent.children.indexOf(n)]) })
    for (const [n, p] of cut) p.remove(n)                                                 // a temporary child leaves the copy, then comes back
    x.traverse(n => { stash.push([n, n.userData]); n.userData = n.userData?.helper ? { helper: true } : n.userData?.shadowOnly ? { shadowOnly: true } : {} })
    let c
    try { c = clone(x) } finally { for (const [n, u] of stash) n.userData = u; for (const [n, p, i] of cut.reverse()) { p.children.splice(i, 0, n); n.parent = p } }
    syncCopy(x, c, o3s, app, names)
    x.matrixWorld.decompose(c.position, c.quaternion, c.scale)
    root.add(c)
  }
  if (!root.children.length) throw new Error('Nothing to export')
  root.updateMatrixWorld(true)
  return { root, names }
}
function syncCopy (a, b, o3s, app, names) {
  b.uuid = a.uuid
  const id = o3s.get(a)
  if (id) { const d = app.obj(id); names.set(a.name, a.uuid); names.set(id, a.uuid); if (d?.name) b.name = d.name; b.userData = { studioId: id } }
  const kids = b.children.slice()
  a.children.forEach((ac, i) => {
    const bc = kids[i]; if (!bc) return
    if (ac.userData?.helper || ac.userData?.shadowOnly || ac.visible === false) { b.remove(bc); return }
    syncCopy(ac, bc, o3s, app, names)
  })
}
async function clipsFor (app, o, names) {
  if (o.anims === false || !app.anim?.toClips) return []
  let clips = []
  try { clips = (await app.anim.toClips()) || [] } catch { return [] }
  return clips.map(c => {
    const k = c.clone()
    k.tracks = k.tracks.filter(tr => names.has(tr.name.slice(0, tr.name.indexOf('.'))))   // a node not in the copy (temporary, hidden) has no track
    for (const tr of k.tracks) { const dot = tr.name.indexOf('.'), node = tr.name.slice(0, dot); tr.name = names.get(node) + tr.name.slice(dot) }
    return k
  })
}
const fname = (app, o, ext) => safe(o.name || app.scene?.name) + '.' + ext
async function zipFiles (files) {
  const { zipSync, strToU8 } = await L('libs/fflate.module.js')
  const m = {}; for (const [k, v] of Object.entries(files)) m[k] = typeof v === 'string' ? strToU8(v) : await toBytes(v)
  return zipSync(m)
}
async function gltfData (app, o, binary) {
  const { root, names } = await exportRoot(app, o)
  const { GLTFExporter } = await L('exporters/GLTFExporter.js')
  const animations = await clipsFor(app, o, names)
  const r = await new GLTFExporter().parseAsync(root, { binary, animations, onlyVisible: true, maxTextureSize: 2048 })
  return binary ? new Uint8Array(r) : JSON.stringify(r)
}
async function jsonData (app, o) {
  const sc = app.sceneData()
  let objects = Object.fromEntries(Object.entries(sc.objects || {}).filter(([id]) => !app.isTemp?.(id))), anims = sc.anims || {}   // temporary models never export
  anims = Object.fromEntries(Object.entries(anims).map(([k, a]) => [k, a && { ...a, tracks: Object.fromEntries(Object.entries(a.tracks || {}).filter(([id]) => objects[id])) }]))
  if (o.selection) {
    const sel = app.selection || []
    if (!sel.length) throw new Error('Nothing selected: select objects or turn off Selected only')
    const keep = new Set(); for (const id of sel) { keep.add(id); for (const d of app.descendants(id) || []) keep.add(d) }
    objects = Object.fromEntries(Object.entries(objects).filter(([id]) => keep.has(id)).map(([id, ob]) => [id, ob && ob.parent && !keep.has(ob.parent) ? { ...ob, parent: null } : ob]))
    anims = Object.fromEntries(Object.entries(anims).map(([k, a]) => [k, { ...a, tracks: Object.fromEntries(Object.entries(a?.tracks || {}).filter(([id]) => keep.has(id))) }]).filter(([, a]) => Object.keys(a.tracks).length))
  }
  const geo = {}, tex = {}, proc = sc.textures || {}
  for (const ob of Object.values(objects)) {
    if (ob?.geo && !geo[ob.geo]) { try { const g = await app.geo.get(ob.geo); if (g) geo[ob.geo] = g } catch {} }
    if (ob?.texture && !proc[ob.texture] && !tex[ob.texture]) { try { const t = await app.tex.get(ob.texture); if (t) tex[ob.texture] = t } catch {} }
  }
  const out = { studio: 1, name: sc.name, v: sc.v || 1, objects, anims, textures: proc, env: sc.env, camera: sc.camera, geo, tex }
  return { filename: safe(o.name || sc.name) + '.json', data: JSON.stringify(out), mime: MIME.json }
}
function pixels (url) {
  return new Promise((res, rej) => {
    const im = new Image()
    im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); res(x.getImageData(0, 0, c.width, c.height)) }
    im.onerror = () => rej(new Error('Could not read the render')); im.src = url
  })
}
async function pngData (app, o) {
  const vp = app.viewport; if (!vp) throw new Error('Open a project first')
  const cv = vp.renderer?.domElement || document.querySelector('canvas')
  const scale = Math.max(0.25, Math.min(4, +o.scale || 1))
  const w = Math.round((o.w || cv?.clientWidth || 1280) * scale), hh = Math.round((o.h || cv?.clientHeight || 720) * scale)
  let data
  if (o.transparent && vp.scene) {
    // Render on black and on white; the difference gives exact alpha, antialiased edges included.
    const bg = vp.scene.background, shot = c => { vp.scene.background = new THREE.Color(c); return vp.snapshot({ w, h: hh, type: 'image/png' }) }
    let a, b
    try { a = shot(0x000000); b = shot(0xffffff) } finally { vp.scene.background = bg; vp.requestRender?.() }
    const [da, db] = await Promise.all([a, b].map(pixels))
    const out = new ImageData(w, hh), A = da.data, B = db.data, O = out.data
    for (let i = 0; i < O.length; i += 4) {
      const al = Math.max(0, Math.min(255, 255 - ((B[i] - A[i]) + (B[i + 1] - A[i + 1]) + (B[i + 2] - A[i + 2])) / 3))
      O[i + 3] = al
      if (al) for (let k = 0; k < 3; k++) O[i + k] = Math.min(255, Math.round(A[i + k] * 255 / al))
    }
    const cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = hh; cv2.getContext('2d').putImageData(out, 0, 0)
    data = dataURLBytes(cv2.toDataURL('image/png'))
  } else data = dataURLBytes(await vp.snapshot({ w, h: hh, type: 'image/png' }))
  if (!data?.length) throw new Error('Could not capture the view')
  return { filename: fname(app, o, 'png'), data, mime: MIME.png, w, h: hh }
}

const EXPORTERS = [
  { ext: 'glb', rank: 1, label: 'glTF binary', hint: 'Best for 3D modeling software, Unity, Godot and the web. Keeps animation.', anims: true, io: true, save: async (app, o) => ({ filename: fname(app, o, 'glb'), data: await gltfData(app, o, true), mime: MIME.glb }) },
  { ext: 'gltf', rank: 2, label: 'glTF text', hint: 'Readable JSON with the data inside.', anims: true, io: true, save: async (app, o) => ({ filename: fname(app, o, 'gltf'), data: await gltfData(app, o, false), mime: MIME.gltf }) },
  { ext: 'json', label: 'Studio scene', group: 'Scene and image', hint: 'Everything, including meshes and textures. Imports back into Studio.', io: true, save: jsonData },
  { ext: 'png', label: 'PNG render', group: 'Scene and image', hint: 'Picture of the current view.', png: true, noSelection: true, io: true, save: pngData },
]
const IMPORTERS = [
  { ext: ['glb', 'gltf'], label: 'glTF' }, { ext: ['obj'], label: 'OBJ + MTL' }, { ext: ['fbx'], label: 'FBX' },
  { ext: ['stl'], label: 'STL' }, { ext: ['ply'], label: 'PLY' }, { ext: ['dae'], label: 'Collada' },
  { ext: ['3mf'], label: '3MF' }, { ext: ['3ds'], label: '3DS' }, { ext: ['vox'], label: 'MagicaVoxel' },
  { ext: ['wrl', 'vrml'], label: 'VRML' }, { ext: ['amf'], label: 'AMF' }, { ext: ['usdz', 'usda', 'usdc'], label: 'USD' },
  { ext: ['svg'], label: 'SVG (extruded)' }, { ext: ['json'], label: 'Studio scene' }, { ext: ['zip'], label: 'Zip of files' },
  { ext: IMAGE_EXT, label: 'Image' },
].map(i => ({ ...i, io: true, load: (file, app) => importFiles(app, [file]) }))

function exporterList (app) {
  const all = Array.isArray(app.exporters) ? app.exporters : Object.values(app.exporters || {})
  return all.map((ex, i) => {
    const ext = exts(ex)[0] || 'bin'
    return { ex, ext, key: ext + ':' + i, label: ex.label || ext.toUpperCase(), hint: ex.hint || '', group: ex.group || groupOf(ext, ex), rank: ex.rank ?? 100 + i }
  }).sort((a, b) => a.rank - b.rank)   // plugins add formats in load order; rank sets the shelf order
}
function groupOf (ext, ex) {
  if (/^(rbx|lua|luau)/.test(ext) || /roblox/i.test(ex.label || '')) return 'Roblox'
  if (['json', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'pdf'].includes(ext)) return 'Scene and image'
  return '3D models'
}
const fmtIcon = ext => ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext) ? 'io-image' : ['json', 'lua', 'luau', 'rbxmx', 'rbxm', 'txt'].includes(ext) ? 'io-code' : 'io-cube'

async function exportData (app, o = {}) {
  const list = exporterList(app)
  const it = (o.key && list.find(x => x.key === o.key)) || list.find(x => x.ext === String(o.format || '').toLowerCase().replace(/^\./, ''))
  if (!it) throw new Error('Unknown export format: ' + o.format + '. Formats: ' + list.map(x => x.ext).join(', '))
  const r = await it.ex.save(app, o)
  if (r === undefined || r === null) return null
  if (r && typeof r === 'object' && r.data !== undefined && (r.filename || r.name)) return { filename: r.filename || r.name, data: r.data, mime: r.mime || r.type || MIME[it.ext] }
  return { filename: fname(app, o, it.ext), data: r, mime: MIME[it.ext] }
}
async function upload (app, bytes, mime) {
  if (!app.store?.upload) return null
  const r = await app.store.upload(new Blob([bytes], { type: mime || 'application/octet-stream' }), mime || 'application/octet-stream')
  return r && r.id ? r : null
}
async function canDownload (app) {
  try {
    const s = app.store
    if (s && 'canDownload' in s) return !!(typeof s.canDownload === 'function' ? await s.canDownload() : s.canDownload)
    if (s && 'downloads' in s) return !!s.downloads
    return !!(await window.claude?.use?.('downloads'))
  } catch { return false }
}
async function saveDownload (app, filename, bytes) {
  let name = filename, data = bytes
  if (!ALLOWED.has(extOf(name))) { data = await zipFiles({ [name]: bytes }); name = stemOf(name) + '.zip' }
  const r = await app.store.download(name, data)
  return { filename: name, bytes: data.length, status: r?.status || 'saved' }
}
async function exportTo (app, o = {}) {
  const r = await exportData(app, o)
  if (!r) return { done: true }
  const bytes = await toBytes(r.data)
  if (!bytes.length) throw new Error('Export produced an empty file')
  if (o.to === 'data') return { filename: r.filename, bytes: bytes.length, data: bytes, mime: r.mime }
  if (o.to === 'assets') {
    const up = await upload(app, bytes, r.mime)
    if (!up) throw new Error('Project assets are not available here')
    return { asset: up.id, url: up.url, filename: r.filename, bytes: bytes.length }
  }
  if (!(await canDownload(app))) return { filename: r.filename, bytes: bytes.length, unavailable: true }
  const d = await saveDownload(app, r.filename, bytes)
  return { filename: d.filename, bytes: d.bytes, inner: d.filename !== r.filename ? r.filename : undefined }
}

// ---------- dialogs ----------
let openDlg = null
function modal (title, build, cls = '') {
  openDlg?.close()
  const back = h('div', 'io-back' + (isPhone() ? ' io-phone' : ''))
  const dlg = h('div', 'io-dlg ' + cls); dlg.tabIndex = -1; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-label', title)
  const hd = h('div', 'io-hd', `<span class="io-ti">${esc(title)}</span>`)
  const x = h('button', 'io-ib', ic('io-close')); x.title = 'Close'; x.setAttribute('aria-label', 'Close'); hd.appendChild(x)
  const bd = h('div', 'io-bd'), ft = h('div', 'io-ft')
  dlg.append(hd, bd, ft); back.appendChild(dlg); document.body.appendChild(back)
  let done; const result = new Promise(r => { done = r })
  const api = { el: dlg, bd, ft, result, enter: null, close (v = null) { if (!back.isConnected) return; back.remove(); if (openDlg === api) openDlg = null; done(v) } }
  x.onclick = () => api.close()
  back.addEventListener('pointerdown', e => { if (e.target === back) api.close() })
  back.addEventListener('keydown', e => {
    e.stopPropagation()
    if (e.key === 'Escape') { e.preventDefault(); api.close() } else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && api.enter) { e.preventDefault(); api.enter() }
  })
  back.addEventListener('keyup', e => e.stopPropagation())
  openDlg = api
  build(api)
  setTimeout(() => { if (!dlg.contains(document.activeElement)) dlg.focus() }, 0)
  return api
}
function ask (title, body, choices) {
  return modal(title, api => {
    if (body) api.bd.appendChild(h('div', 'io-msg', esc(body)))
    const list = h('div', 'io-choice')
    for (const c of choices) {
      const b = h('button', 'io-ch', `${c.icon ? ic(c.icon) : ''}<span><b>${esc(c.label)}</b><small>${esc(c.hint || '')}</small></span>`)
      b.dataset.value = c.value; b.onclick = () => api.close(c.value); list.appendChild(b)
    }
    api.bd.appendChild(list)
    const cancel = h('button', 'io-btn', 'Cancel'); cancel.onclick = () => api.close()
    api.ft.append(h('span', 'io-st'), cancel)
  }, 'io-small').result
}
function lastFormat (v) {
  try { if (v) localStorage.setItem('studio.io.format', v); else return localStorage.getItem('studio.io.format') } catch {}
  return null
}

// The share sheet (Save to Files, AirDrop, apps) keeps the real file type, so it goes first where it works:
// always on touch devices, and on desktop for types a download would have to zip.
function shareFor (it) {
  const ext = it.ex.zip ? 'zip' : it.ext
  try {
    if (!navigator.canShare?.({ files: [new File([new Uint8Array(1)], 'x.' + ext, { type: MIME[ext] || 'application/octet-stream' })] })) return false
  } catch { return false }
  return isPhone() || matchMedia('(pointer:coarse)').matches || !ALLOWED.has(ext)
}
function openExport (app, init = {}) {
  const list = exporterList(app)
  if (!list.length) { app.toast('No export formats are registered', 'error'); return }
  let cur = list.find(x => x.ext === init.format) || list.find(x => x.ext === lastFormat()) || list[0]
  const nsel = (app.selection || []).length
  const st = { selection: init.selection ?? false, anims: true, text: false, scale: 1, transparent: false, name: safe(init.name || app.scene?.name) }
  return modal('Export', api => {
    const groups = new Map(), btns = new Map()
    for (const it of list) { if (!groups.has(it.group)) groups.set(it.group, []); groups.get(it.group).push(it) }
    for (const [g, items] of groups) {
      const sec = h('div', 'io-sec'); sec.appendChild(h('div', 'io-gt', esc(g)))
      const grid = h('div', 'io-fmts')
      for (const it of items) {
        const b = h('button', 'io-fmt', `${ic(fmtIcon(it.ext))}<span class="io-fl">${esc(it.label)}</span><span class="io-fe">.${esc(it.ext)}</span>`)
        b.dataset.ext = it.ext; b.dataset.key = it.key; b.title = it.hint || it.label
        b.onclick = () => { cur = it; sync() }
        btns.set(it, b); grid.appendChild(b)
      }
      sec.appendChild(grid); api.bd.appendChild(sec)
    }
    const hint = h('div', 'io-hint'); api.bd.appendChild(hint)
    const opts = h('div', 'io-opts'), rows = {}
    const sw = (key, label) => {
      const r = h('label', 'io-row', `<span>${esc(label)}</span><span class="io-sw"><input type="checkbox"><i></i></span>`)
      const inp = r.querySelector('input'); inp.checked = !!st[key]; inp.dataset.key = key
      inp.onchange = () => { st[key] = inp.checked; ready = null }
      rows[key] = r; opts.appendChild(r); return inp
    }
    const selInp = sw('selection', nsel ? `Selected only (${nsel})` : 'Selected only')
    if (!nsel) { selInp.disabled = true; selInp.checked = st.selection = false; rows.selection.classList.add('off') }
    sw('anims', app.anim ? 'Include animations' : 'Include animations (none in scene)')
    sw('text', 'Text format (ASCII)')
    sw('transparent', 'Transparent background')
    const sc = h('div', 'io-row', '<span>Size</span>'), seg = h('div', 'io-seg')
    for (const v of [1, 2]) { const b = h('button', '', v + 'x'); b.dataset.scale = v; b.onclick = () => { st.scale = v; sync() }; seg.appendChild(b) }
    sc.appendChild(seg); rows.scale = sc; opts.appendChild(sc)
    const nm = h('div', 'io-row io-name', '<span>File name</span>'), ni = h('input', 'io-inp')
    ni.value = st.name; ni.spellcheck = false; ni.setAttribute('aria-label', 'File name'); ni.oninput = () => { st.name = ni.value; ready = null }
    nm.appendChild(ni); opts.appendChild(nm)
    api.bd.appendChild(opts)
    const status = h('span', 'io-st')
    const toAssets = h('button', 'io-btn', ic('io-cloud') + '<span>Save to project</span>'); toAssets.title = 'Save to project assets and get an asset id'
    const toDl = h('button', 'io-btn pri', ic('io-export') + '<span>Download</span>')
    api.ft.append(status, toAssets, toDl)
    const say = (t, k = '') => { status.textContent = t; status.className = 'io-st ' + k; status.title = t }
    let ready = null   // a shared file kept after a refused share, so the next tap shares at once
    function sync () {
      btns.forEach((b, it) => b.classList.toggle('on', it === cur))
      ready = null
      const share = shareFor(cur), zips = !share && (cur.ex.zip || !ALLOWED.has(cur.ext))
      hint.textContent = cur.hint + (zips && !/\.zip/.test(cur.hint) ? ' Downloads as .zip.' : '')
      toDl.innerHTML = share ? ic('io-share') + '<span>Share</span>' : ic('io-export') + '<span>Download</span>'
      toDl.title = share ? 'Share or save to Files as .' + (cur.ex.zip ? 'zip' : cur.ext) : 'Download'
      rows.anims.hidden = !cur.ex.anims
      rows.text.hidden = !cur.ex.text
      rows.transparent.hidden = rows.scale.hidden = !cur.ex.png
      rows.selection.hidden = !!cur.ex.noSelection
      seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.scale === st.scale))
      lastFormat(cur.ext)
    }
    let busy = false
    async function go (to) {
      if (busy) return
      busy = true; toDl.disabled = toAssets.disabled = true; say('Exporting ' + cur.label + '…')
      const args = { key: cur.key, format: cur.ext, selection: st.selection, anims: st.anims, text: st.text, scale: st.scale, transparent: st.transparent, name: st.name }
      try {
        if (to === 'share') {
          let f = ready
          if (!f) {
            const d = await exportTo(app, { ...args, to: 'data' })
            if (d.done) { api.close(d); return }
            f = new File([d.data], d.filename, { type: d.mime || MIME[extOf(d.filename)] || 'application/octet-stream' })
          }
          try {
            await navigator.share({ files: [f] })
            api.close({ filename: f.name, bytes: f.size, shared: true }); app.toast(`Shared ${f.name} · ${fmtBytes(f.size)}`); return
          } catch (e) {
            if (e?.name === 'AbortError') { ready = f; say('Share cancelled'); return }
            if (e?.name === 'NotAllowedError' && !ready) { ready = f; say(`${f.name} ready: tap Share`); return }   // the tap expired while exporting
            ready = null; to = 'download'   // sharing failed: download instead (zipped when the format needs it)
          }
        }
        const r = await exportTo(app, { ...args, to })
        if (r.done) { api.close(r); return }
        if (r.unavailable) { say(`${r.filename} · ${fmtBytes(r.bytes)}. Downloads are off here: save to project instead`, 'err'); toAssets.classList.add('pri'); return }
        api.close(r)
        app.toast(to === 'assets' ? `Saved to project assets · ${fmtBytes(r.bytes)} · ${r.asset}` : `Saved ${r.filename} · ${fmtBytes(r.bytes)}`)
      } catch (e) { say(e?.message || String(e), 'err') } finally { busy = false; if (toDl.isConnected) toDl.disabled = toAssets.disabled = false }
    }
    toDl.onclick = api.enter = () => go(shareFor(cur) ? 'share' : 'download'); toAssets.onclick = () => go('assets')
    sync()
    canDownload(app).then(ok => { if (!ok && toDl.isConnected && !shareFor(cur)) { say('Downloads are off here: save to project instead'); toAssets.classList.add('pri'); toDl.classList.remove('pri') } })
  }, 'io-export')
}

// ---------- drag and drop ----------
async function dropFiles (dt) {
  const entries = [...(dt.items || [])].map(i => i.webkitGetAsEntry?.()).filter(Boolean)
  if (!entries.length || entries.every(e => e.isFile)) return [...dt.files]
  const out = []
  const walk = async (e, path) => {
    if (e.isFile) { const f = await new Promise((res, rej) => e.file(res, rej)); out.push({ file: f, path: path + f.name }) }
    else if (e.isDirectory) {
      const rd = e.createReader(); let batch
      do { batch = await new Promise((res, rej) => rd.readEntries(res, rej)); for (const c of batch) await walk(c, path + e.name + '/') } while (batch.length)
    }
  }
  for (const e of entries) await walk(e, '')
  return out
}
function setupDrop (app) {
  const ov = h('div', 'io-drop', `<div>${ic('io-import')}<span>Drop to import</span><small>glb · gltf · obj · fbx · stl · zip · images…</small></div>`)
  document.body.appendChild(ov)
  const isFiles = e => [...(e.dataTransfer?.types || [])].includes('Files')
  let hideT = 0
  window.addEventListener('dragover', e => { if (!isFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; ov.classList.add('on'); clearTimeout(hideT); hideT = setTimeout(() => ov.classList.remove('on'), 400) })
  window.addEventListener('drop', async e => {
    if (!isFiles(e)) return
    e.preventDefault(); ov.classList.remove('on')
    const files = await dropFiles(e.dataTransfer)
    if (!files.length) return
    const args = { files }
    const onlyImgs = files.every(f => IMAGE_EXT.includes(extOf(f.path || f.name)))
    if (onlyImgs && app.viewport?.pick) {
      try { const hit = app.viewport.pick(e.clientX, e.clientY); const o = hit?.id && app.obj(hit.id); if (o && (o.type === 'part' || o.type === 'mesh') && !app.isLocked?.(hit.id)) args.target = hit.id } catch {}
    }
    app.exec('io.import', args)
  })
}

const CSS = `
.io-back{position:fixed;inset:0;z-index:950;background:rgba(8,9,11,.55);display:flex;align-items:center;justify-content:center;padding:16px;animation:io-in .12s ease-out}
@keyframes io-in{from{opacity:0}}
.io-dlg{width:min(560px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;background:var(--panel,#202329);border:1px solid var(--line,#2f343c);border-radius:10px;box-shadow:0 24px 64px rgba(0,0,0,.5);color:var(--text,#d9dde4);font:12px/1.4 Inter,system-ui,sans-serif;outline:none;overflow:hidden}
.io-dlg:focus-visible{outline:none}
.io-dlg.io-small{width:min(420px,100%)}
.io-hd{display:flex;align-items:center;gap:8px;height:40px;flex:none;padding:0 6px 0 14px;border-bottom:1px solid var(--line,#2f343c);font-weight:600;font-size:13px}
.io-ti{flex:1}
.io-bd{padding:12px 14px;overflow:auto;display:flex;flex-direction:column;gap:12px}
.io-gt{font-size:11px;color:var(--mute,#8b93a1);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;font-weight:600}
.io-fmts{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.io-fmt{display:flex;align-items:center;gap:8px;height:30px;min-width:0;padding:0 8px;background:var(--panel2,#262a31);border:1px solid transparent;border-radius:6px;color:var(--text,#d9dde4);font:inherit;cursor:pointer;text-align:left}
.io-fmt:hover{border-color:var(--line,#2f343c)}
.io-fmt.on{border-color:var(--accent,#3d8bfd);background:color-mix(in srgb,var(--accent,#3d8bfd) 16%,var(--panel2,#262a31))}
.io-fmt svg,.io-btn svg,.io-ib svg,.io-ch svg,.io-drop svg{width:16px;height:16px;flex:none}
.io-fmt svg{color:var(--mute,#8b93a1)}.io-fmt.on svg{color:var(--accent,#3d8bfd)}
.io-fl{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.io-fe{font:11px 'JetBrains Mono',ui-monospace,monospace;color:var(--mute,#8b93a1)}
.io-hint,.io-msg{color:var(--mute,#8b93a1);min-height:17px}
.io-msg{color:var(--text,#d9dde4)}
.io-opts{display:flex;flex-direction:column;border:1px solid var(--line,#2f343c);border-radius:6px;overflow:hidden}
.io-row{display:flex;align-items:center;gap:10px;min-height:32px;padding:0 10px;border-top:1px solid var(--line,#2f343c);cursor:pointer}
.io-row:first-child,.io-row[hidden]+.io-row{border-top:0}.io-row[hidden]{display:none}
.io-row>span:first-child{flex:1}
.io-row.off{opacity:.45;cursor:default}
.io-sw{position:relative;width:28px;height:16px;flex:none}
.io-sw input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer;z-index:1}
.io-sw i{position:absolute;inset:0;border-radius:8px;background:var(--line,#2f343c);transition:background .12s}
.io-sw i::after{content:'';position:absolute;left:2px;top:2px;width:12px;height:12px;border-radius:50%;background:var(--text,#d9dde4);transition:transform .12s}
.io-sw input:checked+i{background:var(--accent,#3d8bfd)}
.io-sw input:checked+i::after{transform:translateX(12px)}
.io-sw input:focus-visible+i{outline:2px solid var(--accent,#3d8bfd);outline-offset:2px}
.io-seg{display:flex;background:var(--bg,#17191d);border-radius:6px;padding:2px;gap:2px}
.io-seg button{height:22px;min-width:40px;border:0;border-radius:4px;background:none;color:var(--mute,#8b93a1);font:12px 'JetBrains Mono',ui-monospace,monospace;cursor:pointer}
.io-seg button.on{background:var(--panel2,#262a31);color:var(--text,#d9dde4)}
.io-name{cursor:default}
.io-inp{height:24px;flex:0 1 220px;min-width:0;background:var(--field,var(--bg,#17191d));border:1px solid var(--line,#2f343c);border-radius:5px;color:var(--text,#d9dde4);font:inherit;padding:0 8px}
.io-inp:focus{outline:none;border-color:var(--accent,#3d8bfd)}
.io-ft{display:flex;align-items:center;gap:8px;flex:none;padding:10px 14px;border-top:1px solid var(--line,#2f343c)}
.io-st{flex:1;min-width:0;color:var(--mute,#8b93a1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.io-st.err{color:var(--danger,#e5484d)}.io-st.ok{color:var(--ok,#3fb950)}
.io-btn{height:28px;padding:0 12px;border-radius:6px;border:1px solid var(--line,#2f343c);background:var(--panel2,#262a31);color:var(--text,#d9dde4);font:inherit;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
.io-btn:hover{border-color:#414854}
.io-btn.pri{background:var(--accent,#3d8bfd);border-color:var(--accent,#3d8bfd);color:#fff}
.io-btn:disabled{opacity:.5;cursor:default}
.io-ib{width:28px;height:28px;display:grid;place-items:center;border:0;background:none;color:var(--mute,#8b93a1);border-radius:6px;cursor:pointer}
.io-ib:hover{background:var(--panel2,#262a31);color:var(--text,#d9dde4)}
.io-choice{display:flex;flex-direction:column;gap:6px}
.io-ch{display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--panel2,#262a31);border:1px solid var(--line,#2f343c);border-radius:8px;color:var(--text,#d9dde4);font:inherit;text-align:left;cursor:pointer}
.io-ch:hover{border-color:var(--accent,#3d8bfd)}
.io-ch svg{color:var(--accent,#3d8bfd)}
.io-ch span{display:flex;flex-direction:column;gap:2px}.io-ch b{font-weight:600}.io-ch small{color:var(--mute,#8b93a1);font-size:12px}
.io-prog{position:fixed;left:50%;bottom:calc(72px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:940;width:min(320px,calc(100vw - 32px));background:var(--panel,#202329);border:1px solid var(--line,#2f343c);border-radius:8px;padding:10px 12px;box-shadow:0 12px 32px rgba(0,0,0,.45);font:12px Inter,system-ui,sans-serif;color:var(--text,#d9dde4)}
.io-prog-t{display:flex;gap:8px;margin-bottom:7px}.io-prog-t span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.io-prog-t b{font:500 11px 'JetBrains Mono',ui-monospace,monospace;color:var(--mute,#8b93a1)}
.io-bar{height:4px;background:var(--bg,#17191d);border-radius:2px;overflow:hidden}.io-bar i{display:block;height:100%;width:0;background:var(--accent,#3d8bfd);transition:width .15s}
.io-drop{position:fixed;inset:8px;z-index:930;pointer-events:none;display:none;align-items:center;justify-content:center;border:2px dashed var(--accent,#3d8bfd);border-radius:12px;background:color-mix(in srgb,var(--accent,#3d8bfd) 8%,transparent)}
.io-drop.on{display:flex}
.io-drop>div{display:grid;grid-template-columns:16px auto;column-gap:8px;row-gap:2px;align-items:center;background:var(--panel,#202329);border:1px solid var(--line,#2f343c);padding:12px 16px;border-radius:8px;color:var(--text,#d9dde4);font:600 13px Inter,system-ui,sans-serif}
.io-drop svg{color:var(--accent,#3d8bfd)}.io-drop small{grid-column:2;color:var(--mute,#8b93a1);font-weight:400;font-size:12px}
.io-phone.io-back{align-items:flex-end;padding:0}
.io-phone .io-dlg{width:100%;max-height:88vh;border-radius:14px 14px 0 0;border-bottom:0;font-size:13px}
.io-phone .io-hd{height:48px;padding-left:max(16px,env(safe-area-inset-left))}
.io-phone .io-bd{padding:12px max(16px,env(safe-area-inset-right)) 12px max(16px,env(safe-area-inset-left))}
.io-phone .io-fmts{grid-template-columns:1fr 1fr;gap:6px}
.io-phone .io-fmt,.io-phone .io-row,.io-phone .io-btn,.io-phone .io-ch{min-height:44px}
.io-phone .io-fmt{height:44px}.io-phone .io-inp{height:36px;flex-basis:180px;font-size:16px}
.io-phone .io-ib{width:44px;height:44px}
.io-phone .io-sw{width:40px;height:24px}.io-phone .io-sw i{border-radius:12px}.io-phone .io-sw i::after{width:20px;height:20px}.io-phone .io-sw input:checked+i::after{transform:translateX(16px)}
.io-phone .io-seg button{height:36px;min-width:52px}
.io-phone .io-ft{flex-wrap:wrap;padding:10px max(16px,env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
.io-phone .io-st{flex-basis:100%;white-space:normal}.io-phone .io-st:empty{display:none}
.io-phone .io-btn{flex:1}
`

export { exportRoot, zipFiles, MIME, drawable, dataURLBytes, safe, toBytes }
export default {
  id: 'io', name: 'Import and export',
  commands: {
    'io.import': {
      label: 'Import…', icon: 'io-import', key: 'Ctrl+I', noUndo: true,
      run (app, args = {}) {
        if (args.files?.length) return importFiles(app, [...args.files], args)
        if (args.asset || args.url || args.data) return argFile(args).then(f => importFiles(app, [f], args))
        pickFiles(app)
      },
    },
    'io.export': {
      label: 'Export…', icon: 'io-export', key: 'Ctrl+Shift+E', noUndo: true,
      run (app, args = {}) {
        if (!args.format) { openExport(app, args); return }
        return exportTo(app, args)
      },
    },
    'io.render': {
      label: 'Render image…', icon: 'io-render', noUndo: true,
      run (app, args = {}) {
        if (!args.to) { openExport(app, { ...args, format: 'png' }); return }
        return exportTo(app, { ...args, format: 'png' })
      },
    },
  },
  menus: { File: ['-', 'io.import', 'io.export', 'io.render'] },
  modes: [], tools: [], panels: [],
  importers: IMPORTERS,
  exporters: EXPORTERS,
  types: {},
  init (app) {
    if (!document.getElementById('pl-io')) { const s = h('style'); s.id = 'pl-io'; s.textContent = CSS; document.head.appendChild(s) }
    setupDrop(app)
    const prev = app.loadModel
    app.loadModel = (src, obj) => (src && (src.data || src.asset || src.url)) ? loadModelSrc(app, src) : prev?.call(app, src, obj)
    app.io = {
      importFiles: (files, opts) => importFiles(app, files, opts),
      exportData: (format, opts = {}) => exportData(app, { ...opts, format }),
      exportTo: o => exportTo(app, o),
      openExport: o => openExport(app, o || {}),
      formats: () => exporterList(app).map(x => ({ ext: x.ext, label: x.label, group: x.group })),
      packGLB: (json, files) => packGLB(json, makeCtx(app, files.map(f => vfile(f)))),
    }
  },
}
