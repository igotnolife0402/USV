// Interchange exports: Studio's own OBJ + MTL, binary FBX 7.4, Collada .dae and 3MF writers, plus STL, PLY and USDZ through three's exporters.
// All four read the export copy from io.js, bake each texture's tiling (and a painted part's uv1 layout) into the uvs,
// and bake the material colour into the texture, so every app shows what the viewport shows.
import * as THREE from 'three'
import { exportRoot, zipFiles, MIME, drawable, dataURLBytes, safe, toBytes } from './io.js'

const addon = p => import(`three/addons/${p}`)
const fname = (app, o, ext) => safe(o.name || app.scene?.name) + '.' + ext

const r6 = n => Math.round(n * 1e6) / 1e6 || 0
const xesc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]))
const srgb = m => { const o = { r: 1, g: 1, b: 1 }; m?.color?.getRGB?.(o, THREE.SRGBColorSpace); return [o.r, o.g, o.b] }
const hex = v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
const white = c => c.every(v => v > 0.999)
const opacity = m => m?.transparent ? Math.max(0, Math.min(1, m.opacity ?? 1)) : 1

// ---------- shared: meshes, materials, textures ----------
async function gather (app, o) {
  const { root } = await exportRoot(app, o)
  root.updateMatrixWorld(true)
  const list = [], taken = new Set()
  root.traverse(m => {
    const g = m.geometry, P = g?.attributes?.position
    if (!m.isMesh || !P?.count) return
    const arr = Array.isArray(m.material), mats = (arr ? m.material : [m.material]).map(x => x || new THREE.MeshStandardMaterial())
    const ix = g.index?.array, nt = Math.floor((ix ? ix.length : P.count) / 3), tri = new Uint32Array(nt * 3), slot = new Uint16Array(nt)
    for (let i = 0; i < nt * 3; i++) tri[i] = ix ? ix[i] : i
    if (arr) for (const gr of g.groups) for (let t = Math.floor(gr.start / 3), e = Math.min(nt, Math.floor((gr.start + gr.count) / 3)); t < e; t++) slot[t] = Math.min(mats.length - 1, gr.materialIndex || 0)
    // uvs as the texture samples them: its channel (uv1 for painted parts), offset/repeat/rotation, flipY
    const map = mats.find(x => x.map?.image)?.map, U = map?.channel === 1 && g.attributes.uv1 ? g.attributes.uv1 : g.attributes.uv
    let uv = null
    if (U) {
      uv = new Float32Array(P.count * 2); const q = new THREE.Vector2()
      if (map) map.updateMatrix()
      for (let i = 0; i < P.count; i++) { q.fromBufferAttribute(U, i); if (map) q.applyMatrix3(map.matrix); uv[i * 2] = q.x; uv[i * 2 + 1] = map && map.flipY === false ? 1 - q.y : q.y }
    }
    let N = g.attributes.normal
    if (!N) { const c = new THREE.BufferGeometry(); c.setAttribute('position', P); if (g.index) c.setIndex(g.index); c.computeVertexNormals(); N = c.attributes.normal }
    let name = safe(m.name || 'Mesh').replace(/\s+/g, '_'), k = 2
    while (taken.has(name)) name = safe(m.name || 'Mesh').replace(/\s+/g, '_') + '_' + k++
    taken.add(name)
    list.push({ name, P, N, uv, tri, slot, mats, M: m.matrixWorld })
  })
  if (!list.length) throw new Error('Nothing to export: no meshes in the scene')
  return { list, base: safe(o.name || app.scene?.name) }
}
// One entry per material: name, colour (white when the colour is baked into its texture), opacity, texture png.
function materials (list) {
  const mats = new Map(), pngs = new Map()
  for (const e of list) for (const m of e.mats) {
    if (mats.has(m)) continue
    const n = mats.size, c = srgb(m)
    let tex = null
    if (m.map?.image) {
      const key = m.map.image, ck = c.map(hex).join('')
      let byImg = pngs.get(key); if (!byImg) pngs.set(key, byImg = new Map())
      tex = byImg.get(ck)
      if (tex === undefined) {
        const cv = drawable(m.map.image, 2048)
        if (cv && !white(c)) { const x = cv.getContext('2d'); x.globalCompositeOperation = 'multiply'; x.fillStyle = '#' + ck; x.fillRect(0, 0, cv.width, cv.height); x.globalCompositeOperation = 'destination-in'; x.drawImage(drawable(m.map.image, 2048), 0, 0); x.globalCompositeOperation = 'source-over' }
        tex = cv ? { file: 'tex' + [...pngs.values()].reduce((a, b) => a + b.size, 0) + '.png', bytes: dataURLBytes(cv.toDataURL('image/png')), avg: average(cv) } : null
        byImg.set(ck, tex)
      }
    }
    const em = m.emissive && m.emissiveIntensity ? [m.emissive.r, m.emissive.g, m.emissive.b].map(v => v * m.emissiveIntensity) : [0, 0, 0]
    mats.set(m, { i: n, name: 'mat' + n + (m.name ? '_' + safe(m.name).replace(/\W+/g, '_') : ''), color: tex ? [1, 1, 1] : c, opacity: opacity(m), tex, rough: m.roughness ?? 0.5, metal: m.metalness ?? 0, emissive: em })
  }
  return mats
}
const texFiles = mats => { const f = {}; for (const m of mats.values()) if (m.tex) f[m.tex.file] = m.tex.bytes; return f }

// ---------- OBJ + MTL ----------
async function objData (app, o) {
  const { list, base } = await gather(app, o), mats = materials(list)
  const out = ['# Umbrio Sandbox export', `mtllib ${base}.mtl`], v = new THREE.Vector3(), nm = new THREE.Matrix3()
  let vo = 1
  for (const e of list) {
    out.push('o ' + e.name)
    nm.getNormalMatrix(e.M)
    const { P, N, uv, tri, slot } = e, flip = e.M.determinant() < 0
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(e.M); out.push(`v ${r6(v.x)} ${r6(v.y)} ${r6(v.z)}`) }
    if (uv) for (let i = 0; i < P.count; i++) out.push(`vt ${r6(uv[i * 2])} ${r6(uv[i * 2 + 1])}`)
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); out.push(`vn ${r6(v.x)} ${r6(v.y)} ${r6(v.z)}`) }
    const ref = i => uv ? `${i + vo}/${i + vo}/${i + vo}` : `${i + vo}//${i + vo}`
    let cur = -1
    for (let t = 0; t < slot.length; t++) {
      if (slot[t] !== cur) { cur = slot[t]; out.push('usemtl ' + mats.get(e.mats[cur]).name) }
      const a = tri[t * 3], b = tri[t * 3 + 1], c = tri[t * 3 + 2]
      out.push(flip ? `f ${ref(a)} ${ref(c)} ${ref(b)}` : `f ${ref(a)} ${ref(b)} ${ref(c)}`)
    }
    vo += P.count
  }
  const mtl = ['# Umbrio Sandbox export']
  for (const m of mats.values()) {
    mtl.push('', 'newmtl ' + m.name, `Kd ${m.color.map(r6).join(' ')}`, 'Ka 0 0 0', `Ks ${r6(0.5 * (1 - m.rough))} ${r6(0.5 * (1 - m.rough))} ${r6(0.5 * (1 - m.rough))}`, `Ns ${Math.round(2 + 250 * (1 - m.rough) ** 2)}`, `d ${r6(m.opacity)}`, 'illum 2')
    if (m.emissive.some(x => x > 0)) mtl.push(`Ke ${m.emissive.map(r6).join(' ')}`)
    if (m.tex) mtl.push('map_Kd ' + m.tex.file)
  }
  const files = { [base + '.obj']: out.join('\n') + '\n', [base + '.mtl']: mtl.join('\n') + '\n', ...texFiles(mats) }
  return { filename: base + '.zip', data: await zipFiles(files), mime: MIME.zip }
}

// ---------- binary FBX 7.4 ----------
// Node = [name, props, children]; props are [type, value]: I int32, D double, L int64, S string, R bytes, C bool, d/i arrays.
const FILE_ID = [0x28, 0xb3, 0x2a, 0xeb, 0xb6, 0x24, 0xcc, 0xc2, 0xbf, 0xc8, 0xb0, 0x2a, 0xa9, 0x2b, 0xfc, 0xf1] // pairs with the fixed CreationTime and footer (as 3D modeling software writes)
const FOOT_ID = [0xfa, 0xbc, 0xab, 0x09, 0xd0, 0xc8, 0xd4, 0x66, 0xb1, 0x76, 0xfb, 0x83, 0x1c, 0xf7, 0x26, 0x7e]
const FOOT_END = [0xf8, 0x5a, 0x8c, 0x6a, 0xde, 0xf5, 0xd9, 0x7e, 0xec, 0xe9, 0x0c, 0xe3, 0x75, 0x8f, 0x29, 0x0b]
function fbxBinary (top) {
  const te = new TextEncoder()
  const prep = n => { n[1] = n[1].map(([t, v]) => [t, t === 'S' ? te.encode(v) : v]); n[2] = n[2] || []; n[2].forEach(prep) }
  const psize = ([t, v]) => t === 'C' ? 2 : t === 'I' ? 5 : t === 'D' || t === 'L' ? 9 : t === 'S' || t === 'R' ? 5 + v.length : 13 + v.length * (t === 'd' ? 8 : 4)
  const size = (n, last) => {
    n.pl = n[1].reduce((a, p) => a + psize(p), 0)
    let s = 13 + n[0].length + n.pl
    if (n[2].length) s += n[2].reduce((a, c, i) => a + size(c, i === n[2].length - 1), 0) + 13
    else if (!n[1].length && !last) s += 13   // empty node: null record unless last (FBX SDK layout)
    n.sz = s; return s
  }
  top.forEach(prep)
  const body = 27 + top.reduce((a, n, i) => a + size(n, i === top.length - 1), 0) + 13
  const pad = ((body + 20 + 15) & ~15) - (body + 20) || 16
  const buf = new ArrayBuffer(body + 20 + pad + 140), dv = new DataView(buf), u8 = new Uint8Array(buf)
  let o = 0
  for (const ch of 'Kaydara FBX Binary  \0\x1a\0') u8[o++] = ch.charCodeAt(0)
  dv.setUint32(o, 7400, true); o += 4
  const w = (n, last) => {
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
      else {
        const b = t === 'd' ? 8 : 4
        dv.setUint32(o, v.length, true); dv.setUint32(o + 4, 0, true); dv.setUint32(o + 8, v.length * b, true); o += 12
        if (t === 'd') for (let i = 0; i < v.length; i++, o += 8) dv.setFloat64(o, v[i], true)
        else for (let i = 0; i < v.length; i++, o += 4) dv.setInt32(o, v[i], true)
      }
    }
    n[2].forEach((c, i) => w(c, i === n[2].length - 1))
    o = end   // the null record (zeros) closes a child list or an empty node
  }
  top.forEach((n, i) => w(n, i === top.length - 1))
  o += 13
  u8.set(FOOT_ID, o); o += 20 + pad
  dv.setUint32(o, 7400, true); o += 124
  u8.set(FOOT_END, o)
  return u8
}
async function fbxData (app, o) {
  const { list, base } = await gather(app, o), mats = materials(list)
  let next = 1000000
  const id = () => ++next
  const S = v => ['S', v], I = v => ['I', v], D = v => ['D', v], L = v => ['L', v]
  const N = (name, props = [], kids = []) => [name, props, kids], one = (name, p) => N(name, [p])
  const P = (n, t, l, f, ...v) => N('P', [S(n), S(t), S(l), S(f), ...v])
  const P70 = (...ps) => N('Properties70', [], ps)
  const v3 = a => a.map(D)
  const objects = [], links = [], matId = new Map(), count = { Model: 0, Geometry: 0, Material: 0, Texture: 0, Video: 0 }
  for (const m of mats.values()) {
    const mid = id(); matId.set(m, mid); count.Material++
    const spec = 0.5 * (1 - m.rough)
    const props = [P('ShadingModel', 'KString', '', '', S('Phong')), P('DiffuseColor', 'Color', '', 'A', ...v3(m.color)), P('DiffuseFactor', 'Number', '', 'A', D(1)),
      P('SpecularColor', 'Color', '', 'A', ...v3([spec, spec, spec])), P('SpecularFactor', 'Number', '', 'A', D(1)), P('Shininess', 'Number', '', 'A', D(2 + 250 * (1 - m.rough) ** 2)),
      P('EmissiveColor', 'Color', '', 'A', ...v3(m.emissive)), P('EmissiveFactor', 'Number', '', 'A', D(1)), P('Opacity', 'Number', '', 'A', D(m.opacity))]
    if (m.opacity < 1) props.push(P('TransparencyFactor', 'Number', '', 'A', D(1 - m.opacity)))
    objects.push(N('Material', [L(mid), S(m.name + '\0\x01Material'), S('')], [one('Version', I(102)), one('ShadingModel', S('phong')), one('MultiLayer', I(0)), P70(...props)]))
    if (m.tex) {
      const tid = id(), vid = id(), f = m.tex.file; count.Texture++; count.Video++
      objects.push(N('Video', [L(vid), S(f + '\0\x01Video'), S('Clip')], [one('Type', S('Clip')), P70(P('Path', 'KString', 'XRefUrl', '', S(f))), one('UseMipMap', I(0)), one('Filename', S(f)), one('RelativeFilename', S(f)), one('Content', ['R', m.tex.bytes])]))
      objects.push(N('Texture', [L(tid), S(f + '\0\x01Texture'), S('')], [one('Type', S('TextureVideoClip')), one('Version', I(202)), one('TextureName', S(f + '\0\x01Texture')),
        P70(P('UseMaterial', 'bool', '', '', I(1))), one('Media', S(f + '\0\x01Video')), one('FileName', S(f)), one('RelativeFilename', S(f)),
        N('ModelUVTranslation', [D(0), D(0)]), N('ModelUVScaling', [D(1), D(1)]), one('Texture_Alpha_Source', S('None')), N('Cropping', [I(0), I(0), I(0), I(0)])]))
      links.push(['OO', vid, tid], ['OP', tid, mid, 'DiffuseColor'])
    }
  }
  const t = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), eu = new THREE.Euler(), deg = 180 / Math.PI
  for (const e of list) {
    const gid = id(), mid = id(); count.Geometry++; count.Model++
    // weld corners at one position into one control point, so edges connect; normals and uvs stay per corner
    const keys = new Map(), remap = new Int32Array(e.P.count), verts = []
    for (let i = 0; i < e.P.count; i++) {
      const x = e.P.getX(i), y = e.P.getY(i), z = e.P.getZ(i), k = Math.round(x * 1e5) + ',' + Math.round(y * 1e5) + ',' + Math.round(z * 1e5)
      let vi = keys.get(k); if (vi === undefined) { vi = verts.length / 3; keys.set(k, vi); verts.push(x, y, z) }
      remap[i] = vi
    }
    const nt = e.slot.length, pvi = new Int32Array(nt * 3), nrm = new Float64Array(nt * 9), uv = e.uv ? new Float64Array(nt * 6) : null, uvi = new Int32Array(nt * 3)
    for (let c = 0; c < nt * 3; c++) {
      const i = e.tri[c]
      pvi[c] = c % 3 === 2 ? ~remap[i] : remap[i]
      nrm[c * 3] = e.N.getX(i); nrm[c * 3 + 1] = e.N.getY(i); nrm[c * 3 + 2] = e.N.getZ(i)
      if (uv) { uv[c * 2] = e.uv[i * 2]; uv[c * 2 + 1] = e.uv[i * 2 + 1] }
      uvi[c] = c
    }
    const used = [...new Set(e.slot)].sort((a, b) => a - b), local = new Map(used.map((k, i) => [k, i]))
    const layer = [N('Version', [I(100)]), N('LayerElement', [], [one('Type', S('LayerElementNormal')), one('TypedIndex', I(0))]), N('LayerElement', [], [one('Type', S('LayerElementMaterial')), one('TypedIndex', I(0))])]
    const geo = [one('GeometryVersion', I(124)), one('Vertices', ['d', verts]), one('PolygonVertexIndex', ['i', pvi]),
      N('LayerElementNormal', [I(0)], [one('Version', I(102)), one('Name', S('')), one('MappingInformationType', S('ByPolygonVertex')), one('ReferenceInformationType', S('Direct')), one('Normals', ['d', nrm])]),
      N('LayerElementMaterial', [I(0)], [one('Version', I(101)), one('Name', S('')), one('MappingInformationType', S(used.length > 1 ? 'ByPolygon' : 'AllSame')), one('ReferenceInformationType', S('IndexToDirect')),
        one('Materials', ['i', used.length > 1 ? Int32Array.from(e.slot, k => local.get(k)) : [0]])])]
    if (uv) {
      geo.push(N('LayerElementUV', [I(0)], [one('Version', I(101)), one('Name', S('UVMap')), one('MappingInformationType', S('ByPolygonVertex')), one('ReferenceInformationType', S('IndexToDirect')), one('UV', ['d', uv]), one('UVIndex', ['i', uvi])]))
      layer.push(N('LayerElement', [], [one('Type', S('LayerElementUV')), one('TypedIndex', I(0))]))
    }
    geo.push(N('Layer', [I(0)], layer))
    objects.push(N('Geometry', [L(gid), S(e.name + '\0\x01Geometry'), S('Mesh')], geo))
    e.M.decompose(t, q, s); eu.setFromQuaternion(q, 'ZYX')   // FBX eEulerXYZ applies X, then Y, then Z
    objects.push(N('Model', [L(mid), S(e.name + '\0\x01Model'), S('Mesh')], [one('Version', I(232)),
      P70(P('Lcl Translation', 'Lcl Translation', '', 'A', D(t.x), D(t.y), D(t.z)), P('Lcl Rotation', 'Lcl Rotation', '', 'A', D(eu.x * deg), D(eu.y * deg), D(eu.z * deg)),
        P('Lcl Scaling', 'Lcl Scaling', '', 'A', D(s.x), D(s.y), D(s.z)), P('DefaultAttributeIndex', 'int', 'Integer', '', I(0)), P('InheritType', 'enum', '', '', I(1))),
      one('Shading', ['C', true]), one('Culling', S('CullingOff'))]))
    links.push(['OO', mid, 0], ['OO', gid, mid], ...used.map(k => ['OO', matId.get(mats.get(e.mats[k])), mid]))
  }
  const now = new Date(), stamp = [['Year', now.getFullYear()], ['Month', now.getMonth() + 1], ['Day', now.getDate()], ['Hour', now.getHours()], ['Minute', now.getMinutes()], ['Second', now.getSeconds()], ['Millisecond', now.getMilliseconds()]]
  const gi = (n, v) => P(n, 'int', 'Integer', '', I(v))
  const types = Object.entries(count).filter(([, n]) => n)
  const top = [
    N('FBXHeaderExtension', [], [one('FBXHeaderVersion', I(1003)), one('FBXVersion', I(7400)), one('EncryptionType', I(0)),
      N('CreationTimeStamp', [], [one('Version', I(1000)), ...stamp.map(([k, v]) => one(k, I(v)))]), one('Creator', S('Umbrio Sandbox'))]),
    one('FileId', ['R', new Uint8Array(FILE_ID)]), one('CreationTime', S('1970-01-01 10:00:00:000')), one('Creator', S('Umbrio Sandbox')),
    N('GlobalSettings', [], [one('Version', I(1000)), P70(gi('UpAxis', 1), gi('UpAxisSign', 1), gi('FrontAxis', 2), gi('FrontAxisSign', 1), gi('CoordAxis', 0), gi('CoordAxisSign', 1),
      gi('OriginalUpAxis', 1), gi('OriginalUpAxisSign', 1), P('UnitScaleFactor', 'double', 'Number', '', D(100)), P('OriginalUnitScaleFactor', 'double', 'Number', '', D(100)))]),   // 1 unit = 1 m, as glTF
    N('Documents', [], [one('Count', I(1)), N('Document', [L(id()), S(''), S('Scene')], [P70(P('SourceObject', 'object', '', ''), P('ActiveAnimStackName', 'KString', '', '', S(''))), one('RootNode', L(0))])]),
    N('References'),
    N('Definitions', [], [one('Version', I(100)), one('Count', I(1 + types.reduce((a, [, n]) => a + n, 0))), N('ObjectType', [S('GlobalSettings')], [one('Count', I(1))]),
      ...types.map(([k, n]) => N('ObjectType', [S(k)], [one('Count', I(n))]))]),
    N('Objects', [], objects),
    N('Connections', [], links.map(([k, a, b, p]) => N('C', p ? [S(k), L(a), L(b), S(p)] : [S(k), L(a), L(b)]))),
  ]
  return { filename: base + '.fbx', data: fbxBinary(top), mime: MIME.fbx }
}

// ---------- Collada 1.4.1 ----------
async function daeData (app, o) {
  const { list, base } = await gather(app, o), mats = materials(list)
  const f = a => Array.from(a, r6).join(' '), col = (c, a = 1) => `<color>${f(c)} ${r6(a)}</color>`
  const images = [], effects = [], materialsX = [], geos = [], nodes = []
  for (const m of mats.values()) {
    const fx = 'fx' + m.i
    let diffuse = col(m.color), params = ''
    if (m.tex) {
      const im = 'img' + m.i
      images.push(`<image id="${im}" name="${im}"><init_from>${xesc(m.tex.file)}</init_from></image>`)
      params = `<newparam sid="${im}-surface"><surface type="2D"><init_from>${im}</init_from></surface></newparam><newparam sid="${im}-sampler"><sampler2D><source>${im}-surface</source></sampler2D></newparam>`
      diffuse = `<texture texture="${im}-sampler" texcoord="UVMap"/>`
    }
    const sp = 0.5 * (1 - m.rough)
    effects.push(`<effect id="${fx}"><profile_COMMON>${params}<technique sid="common"><phong><emission>${col(m.emissive)}</emission><diffuse>${diffuse}</diffuse><specular>${col([sp, sp, sp])}</specular><shininess><float>${r6(2 + 250 * (1 - m.rough) ** 2)}</float></shininess><transparency><float>${r6(m.opacity)}</float></transparency></phong></technique></profile_COMMON></effect>`)
    materialsX.push(`<material id="${m.name}-material" name="${xesc(m.name)}"><instance_effect url="#${fx}"/></material>`)
  }
  list.forEach((e, gi) => {
    const g = 'geo' + gi, n = e.P.count, src = (sfx, arr, names) => `<source id="${g}-${sfx}"><float_array id="${g}-${sfx}-array" count="${arr.length}">${f(arr)}</float_array><technique_common><accessor source="#${g}-${sfx}-array" count="${arr.length / names.length}" stride="${names.length}">${names.map(p => `<param name="${p}" type="float"/>`).join('')}</accessor></technique_common></source>`
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { pos[i * 3] = e.P.getX(i); pos[i * 3 + 1] = e.P.getY(i); pos[i * 3 + 2] = e.P.getZ(i); nor[i * 3] = e.N.getX(i); nor[i * 3 + 1] = e.N.getY(i); nor[i * 3 + 2] = e.N.getZ(i) }
    const ins = `<input semantic="VERTEX" source="#${g}-vertices" offset="0"/><input semantic="NORMAL" source="#${g}-normals" offset="0"/>` + (e.uv ? `<input semantic="TEXCOORD" source="#${g}-uvs" offset="0" set="0"/>` : '')
    const runs = new Map()
    for (let t = 0; t < e.slot.length; t++) { const k = e.slot[t]; if (!runs.has(k)) runs.set(k, []); runs.get(k).push(e.tri[t * 3], e.tri[t * 3 + 1], e.tri[t * 3 + 2]) }
    const tris = [...runs].map(([k, p]) => `<triangles material="m${k}" count="${p.length / 3}">${ins}<p>${p.join(' ')}</p></triangles>`).join('')
    geos.push(`<geometry id="${g}" name="${xesc(e.name)}"><mesh>${src('positions', pos, ['X', 'Y', 'Z'])}${src('normals', nor, ['X', 'Y', 'Z'])}${e.uv ? src('uvs', e.uv, ['S', 'T']) : ''}<vertices id="${g}-vertices"><input semantic="POSITION" source="#${g}-positions"/></vertices>${tris}</mesh></geometry>`)
    const me = e.M.elements, rows = [0, 1, 2, 3].flatMap(r => [0, 1, 2, 3].map(c => me[c * 4 + r]))
    const bind = [...runs.keys()].map(k => `<instance_material symbol="m${k}" target="#${mats.get(e.mats[k]).name}-material"><bind_vertex_input semantic="UVMap" input_semantic="TEXCOORD" input_set="0"/></instance_material>`).join('')
    nodes.push(`<node id="node${gi}" name="${xesc(e.name)}" type="NODE"><matrix sid="transform">${f(rows)}</matrix><instance_geometry url="#${g}" name="${xesc(e.name)}"><bind_material><technique_common>${bind}</technique_common></bind_material></instance_geometry></node>`)
  })
  const at = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
<asset><contributor><authoring_tool>Umbrio Sandbox</authoring_tool></contributor><created>${at}</created><modified>${at}</modified><unit name="meter" meter="1"/><up_axis>Y_UP</up_axis></asset>
${images.length ? `<library_images>${images.join('')}</library_images>\n` : ''}<library_effects>${effects.join('\n')}</library_effects>
<library_materials>${materialsX.join('')}</library_materials>
<library_geometries>${geos.join('\n')}</library_geometries>
<library_visual_scenes><visual_scene id="Scene" name="${xesc(base)}">${nodes.join('\n')}</visual_scene></library_visual_scenes>
<scene><instance_visual_scene url="#Scene"/></scene>
</COLLADA>
`
  const tf = texFiles(mats)
  if (!Object.keys(tf).length) return { filename: base + '.dae', data: xml, mime: MIME.dae }
  return { filename: base + '.zip', data: await zipFiles({ [base + '.dae']: xml, ...tf }), mime: MIME.zip }   // textures sit beside the .dae
}

// ---------- 3MF (3D printing: Z up, millimetres, one object per mesh, colours per triangle) ----------
async function threeMFData (app, o) {
  const { list, base } = await gather(app, o), mats = materials(list)
  const v = new THREE.Vector3(), objs = [], items = []
  const baseMats = [...mats.values()].map(m => `<base name="${xesc(m.name)}" displaycolor="#${(m.tex ? m.tex.avg : m.color).map(hex).join('')}${m.opacity < 1 ? hex(m.opacity) : ''}"/>`)
  list.forEach((e, k) => {
    const keys = new Map(), remap = new Int32Array(e.P.count), vx = []
    for (let i = 0; i < e.P.count; i++) {
      v.fromBufferAttribute(e.P, i).applyMatrix4(e.M)
      const x = r6(v.x), y = r6(-v.z), z = r6(v.y), key = x + ',' + y + ',' + z   // Y up -> Z up, as the STL export
      let vi = keys.get(key); if (vi === undefined) { vi = vx.length; keys.set(key, vi); vx.push(`<vertex x="${x}" y="${y}" z="${z}"/>`) }
      remap[i] = vi
    }
    const flip = e.M.determinant() < 0, tris = []
    for (let t = 0; t < e.slot.length; t++) {
      const a = remap[e.tri[t * 3]], b = remap[e.tri[t * 3 + 1]], c = remap[e.tri[t * 3 + 2]]
      if (a === b || b === c || a === c) continue
      tris.push(`<triangle v1="${a}" v2="${flip ? c : b}" v3="${flip ? b : c}" pid="1" p1="${mats.get(e.mats[e.slot[t]]).i}"/>`)
    }
    if (!tris.length) return
    const oid = k + 2
    objs.push(`<object id="${oid}" name="${xesc(e.name)}" type="model" pid="1" pindex="${mats.get(e.mats[0]).i}"><mesh><vertices>${vx.join('')}</vertices><triangles>${tris.join('')}</triangles></mesh></object>`)
    items.push(`<item objectid="${oid}"/>`)
  })
  if (!objs.length) throw new Error('Nothing to export: no solid triangles')
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">${xesc(base)}</metadata><metadata name="Application">Umbrio Sandbox</metadata>
<resources><basematerials id="1">${baseMats.join('')}</basematerials>
${objs.join('\n')}
</resources>
<build>${items.join('')}</build>
</model>
`
  const files = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>\n',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>\n',
    '3D/3dmodel.model': model,
  }
  return { filename: base + '.3mf', data: await zipFiles(files), mime: MIME['3mf'] }
}
async function stlData (app, o) {
  const { root } = await exportRoot(app, o)
  root.rotation.x = Math.PI / 2; root.updateMatrixWorld(true)   // Y-up to Z-up for slicers
  const { STLExporter } = await addon('exporters/STLExporter.js')
  const r = new STLExporter().parse(root, { binary: !o.text })
  return { filename: fname(app, o, 'stl'), data: o.text ? r : new Uint8Array(r.buffer, r.byteOffset, r.byteLength), mime: MIME.stl }
}
async function plyData (app, o) {
  const { root } = await exportRoot(app, o)
  const { PLYExporter } = await addon('exporters/PLYExporter.js')
  const ex = new PLYExporter()
  const r = await new Promise(res => { const out = ex.parse(root, res, { binary: !o.text }); if (out) res(out) })
  return { filename: fname(app, o, 'ply'), data: typeof r === 'string' ? r : new Uint8Array(r), mime: MIME.ply }
}
async function usdzData (app, o) {
  const { root } = await exportRoot(app, o)
  const std = m => !m || m.isMeshStandardMaterial ? m : new THREE.MeshStandardMaterial({ color: m.color || 0xffffff, map: m.map || null, transparent: !!m.transparent, opacity: m.opacity ?? 1 })
  root.traverse(m => { if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map(std) : std(m.material) })
  const { USDZExporter } = await addon('exporters/USDZExporter.js')
  const ex = new USDZExporter()
  const data = ex.parseAsync ? await ex.parseAsync(root, { quickLookCompatible: true }) : await new Promise((res, rej) => ex.parse(root, res, rej, {}))
  return { filename: fname(app, o, 'usdz'), data: await toBytes(data), mime: MIME.usdz }
}
// A textured material prints in its texture's average colour (3MF core has one colour per triangle).
function average (cv) {
  const c = document.createElement('canvas'); c.width = c.height = 16
  const x = c.getContext('2d'); x.drawImage(cv, 0, 0, 16, 16)
  const d = x.getImageData(0, 0, 16, 16).data, t = [0, 0, 0, 0]
  for (let i = 0; i < d.length; i += 4) { const a = d[i + 3]; t[0] += d[i] * a; t[1] += d[i + 1] * a; t[2] += d[i + 2] * a; t[3] += a }
  return t[3] ? [t[0], t[1], t[2]].map(v => v / t[3] / 255) : [1, 1, 1]
}

export default {
  id: 'export', name: 'More export formats',
  exporters: [
    { ext: 'fbx', label: 'FBX', rank: 3, hint: 'Unity, Unreal, Maya and other 3D modeling software. Meshes, colours and textures; no animation.', io: true, save: fbxData },
    { ext: 'obj', label: 'OBJ + MTL', rank: 4, zip: true, hint: 'Works almost everywhere. Colours, textures and paint; no animation. Holds the .obj, .mtl and textures.', io: true, save: objData },
    { ext: 'dae', label: 'Collada', rank: 5, hint: 'Older apps and SketchUp. Meshes, colours and textures; textures come in a .zip beside it.', io: true, save: daeData },
    { ext: 'stl', label: 'STL', rank: 6, hint: '3D printing. Shape only, Z up.', text: true, io: true, save: stlData },
    { ext: 'ply', label: 'PLY', rank: 7, hint: 'Shape for scanners and point tools.', text: true, io: true, save: plyData },
    { ext: '3mf', label: '3MF', rank: 8, hint: '3D printing with colours (Bambu, Prusa, Cura). Z up, 1 unit = 1 mm.', io: true, save: threeMFData },
    { ext: 'usdz', label: 'USDZ', rank: 9, hint: 'iPhone and iPad AR Quick Look.', io: true, save: usdzData },
    { ext: 'mp4', label: 'Video (MP4, fast)', group: 'Video', rank: 10, hint: 'The current animation as the view looks, up to 1280 px and 30 fps: exports in seconds, about 1 MB.', io: true,
      save: async (app, o) => (await import('./video.js')).mp4(app, o) },   // encoder + muxer load only when used
    { ext: 'mp4', label: 'Video (MP4, 1080p render)', group: 'Video', rank: 11, hint: 'Every frame through Render image: 1920x1080, anti-aliased, ambient occlusion, bloom, effects. Slow: minutes.', io: true,
      save: async (app, o) => (await import('./video.js')).mp4(app, { ...o, quality: 'render' }) },
  ],
  commands: {}, menus: {}, modes: [], tools: [], panels: [],
}
