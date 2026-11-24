// Animate mode: clips, dope-sheet timeline, keys, playback, presets and imported GLB clips.
import * as THREE from 'three'
import { icon, addIcons, isPhone } from '../core/ui.js'

addIcons({
  'an-mode': 'M14 8a3.5 3.5 0 1 1-7 0a3.5 3.5 0 1 1 7 0M1.5 5.5H5M1 8h4M1.5 10.5H5',
  'an-play': 'M5 3.2v9.6L12.8 8z',
  'an-pause': 'M5.5 3.5v9M10.5 3.5v9',
  'an-stop': 'M4.5 4.5h7v7h-7z',
  'an-start': 'M3.5 3.5v9M12.5 3.5 6 8l6.5 4.5z',
  'an-end': 'M12.5 3.5v9M3.5 3.5 10 8l-6.5 4.5z',
  'an-prev': 'M6 4.5 2.5 8 6 11.5M11 5l3 3-3 3-3-3z',
  'an-next': 'M10 4.5l3.5 3.5-3.5 3.5M5 5l3 3-3 3-3-3z',
  'an-key': 'M8 2.5 13.5 8 8 13.5 2.5 8z',
  'an-rec': 'M8 3.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9z',
  'an-loop': 'M2.5 8V7a3 3 0 0 1 3-3h7M10.5 2l2 2-2 2M13.5 8v1a3 3 0 0 1-3 3h-7M5.5 10l-2 2 2 2',
  'an-plus': 'M8 3v10M3 8h10',
  'an-edit': 'M3 13l.8-3 6.7-6.7 2.2 2.2L6 12.2z',
  'an-dup': 'M5.5 5.5H13V13H5.5zM3 10.5V3h7.5',
  'an-trash': 'M2.5 4.5h11M6 4.5v-2h4v2M4 4.5l.8 9h6.4l.8-9',
  'an-more': 'M3.5 8h.01M8 8h.01M12.5 8h.01',
  'an-wand': 'M2.5 13.5 10 6M12 1.5v3M10.5 3h3M13.5 7v2M12.5 8h2M7 1.5v2M6 2.5h2',
  'an-fx': 'M8 1.5v3.5M8 11v3.5M1.5 8H5M11 8h3.5M3.6 3.6l2 2M10.4 10.4l2 2M12.4 3.6l-2 2M5.6 10.4l-2 2',
  'an-spin': 'M13 8a5 5 0 1 1-1.5-3.6M12 1.8v2.8H9.2',
  'an-bob': 'M8 2v12M5 5l3-3 3 3M5 11l3 3 3-3',
  'an-bounce': 'M2 13.5h12M3 13c.8-7 3.2-7 4 0 .7-4 2.6-4 3.3 0 .5-2 1.6-2 2 0',
  'an-pulse': 'M5.5 5.5h5v5h-5zM2 2l2.5 2.5M14 2l-2.5 2.5M2 14l2.5-2.5M14 14l-2.5-2.5',
  'an-walk': 'M9.5 2.5a1.2 1.2 0 1 1 0 .01M8.5 5.5 7 9.5l-2 4M8.5 5.5l1.2 4 1.8 4M8.5 5.5l-3 2M8.5 5.5 11 8',
  'an-wave': 'M7 3a1.2 1.2 0 1 1 0 .01M7 5.5V10l-2 4M7 10l2 4M7 6.5 4 9M7 6.5 10.5 3M12 1.5l1.5 1M13 4h1.5',
  'an-copy': 'M5.5 5.5H13V13H5.5zM3 10.5V3h7.5',
  'an-paste': 'M5.5 2.5h5v2h-5zM4.5 3.5H3v10h10v-10h-1.5',
  'an-ease': 'M2.5 13.5C8 13.5 8 2.5 13.5 2.5',
  'an-clip': 'M2.5 3.5h11v9h-11zM5.5 3.5v9M10.5 3.5v9'
})

const CH = ['pos', 'rot', 'scale', 'color', 'visible']
const XF = ['pos', 'rot', 'scale']
const CH_LABEL = { pos: 'Position', rot: 'Rotation', scale: 'Scale', color: 'Color', visible: 'Visible' }
const CH_COL = { pos: '#e5484d', rot: '#3fb950', scale: '#3d8bfd', color: '#ffa23a', visible: '#8b93a1' }
import { EASES, EASE, easeFn, isEase, sample, storyAt, mix, hexRGB, rgbHex } from './sample.js'
import { cinePass, CINE } from './cine.js'
export { EASE, easeFn, isEase, sample, storyAt }
const EASE_LABEL = { linear: 'Linear', ease: 'Ease in-out', smooth: 'Smooth (sine)', in: 'Ease in', out: 'Ease out', step: 'Constant', bounce: 'Bounce', elastic: 'Elastic' }
const D2R = Math.PI / 180
const SEP = '\u0001'

const add = (a, b) => a.map((v, i) => v + (b[i] || 0))
const mul = (a, b) => a.map((v, i) => v * (Array.isArray(b) ? b[i] : b))
const mk = (t, v, e) => e && e !== 'linear' ? [t, v, e] : [t, v]
const clone = c => JSON.parse(JSON.stringify(c))
const r4 = t => Math.round(t * 1e4) / 1e4
const ref = (id, ch, t) => id + SEP + ch + SEP + r4(t)
const ratio = (a, b) => Math.abs(b) > 1e-9 ? a / b : a

function normVal(ch, v) {
  if (ch === 'visible') return !!v
  if (ch === 'color') return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : '#ffffff'
  const d = ch === 'scale' ? 1 : 0
  return [0, 1, 2].map(i => { const x = +(Array.isArray(v) ? v[i] : v); return Number.isFinite(x) ? r4(x) : d })
}
function restVal(obj, ch) {
  if (ch === 'pos') return obj.pos || [0, 0, 0]
  if (ch === 'rot') return obj.rot || [0, 0, 0]
  if (ch === 'scale') return obj.scale || [1, 1, 1]
  if (ch === 'color') return obj.color || '#a3a2a5'
  return obj.visible !== false
}

// ---------- state ----------
let A = null
const S = {
  clip: null, playing: false, speed: 1, autokey: false, stopLoop: null, camFollow: true, camSaved: null,
  sel: new Set(), clipboard: null, open: new Set(), posed: new Set(), mix: null, ui: null, rows: null, hint: false
}
const anims = () => A?.scene?.anims || {}
const isModelRef = id => typeof id === 'string' && id.startsWith('m:')
function curId() {
  const a = anims()
  if (S.clip && (a[S.clip] || (isModelRef(S.clip) && modelClip(S.clip)))) return S.clip
  S.clip = Object.keys(a).find(k => a[k]) || null
  return S.clip
}
const cur = () => { const id = curId(); return id && !isModelRef(id) ? anims()[id] : null }
const fpsOf = c => Math.max(1, Math.min(240, Math.round(+c?.fps || 30)))
const lenOf = c => c ? Math.max(1 / fpsOf(c), +c.len || 2) : 2
function curLen() { const id = curId(); if (isModelRef(id)) return modelClip(id)?.clip.duration || 1; return lenOf(cur()) }
const curFps = () => isModelRef(curId()) ? 30 : fpsOf(cur())
const snap = (t, fps = curFps()) => r4(Math.round(t * fps) / fps)
const inMode = () => A?.mode === 'animate'
const active = () => inMode() || S.playing
const freshId = () => { let id; do id = 'a-' + Math.random().toString(36).slice(2, 7); while (anims()[id]); return id }

function ensureClip(app, name, len) {
  const id0 = curId()
  if (id0 && !isModelRef(id0) && anims()[id0]) return { id: id0, c: anims()[id0] }
  const id = freshId()
  const c = { name: name || 'Clip ' + (Object.keys(anims()).length + 1), len: len || 2, fps: 30, loop: true, tracks: {} }
  app.putAnim(id, c)
  S.clip = id
  return { id, c: anims()[id] || c }
}
function setKeyIn(c, id, ch, t, v, ease) {
  const tr = (c.tracks ||= {})[id] ||= {}
  const keys = tr[ch] ||= []
  const i = keys.findIndex(k => Math.abs(k[0] - t) < 1e-4)
  const e = ease !== undefined ? ease : i >= 0 ? keys[i][2] : undefined
  const k = mk(t, normVal(ch, v), e)
  if (i >= 0) keys[i] = k; else { keys.push(k); keys.sort((a, b) => a[0] - b[0]) }
}
function tidy(c) {
  for (const oid in c.tracks || {}) {
    const tr = c.tracks[oid]
    for (const ch in tr || {}) if (!tr[ch]?.length) delete tr[ch]
    if (!tr || !Object.keys(tr).length) delete c.tracks[oid]
  }
  return c
}
function eachKey(c, refs, fn) {
  for (const oid in c?.tracks || {}) {
    const tr = c.tracks[oid]
    for (const ch in tr || {}) (tr[ch] || []).forEach((k, i) => { if (refs.has(ref(oid, ch, k[0]))) fn(k, oid, ch, i) })
  }
}
const refsOf = (a = {}) => new Set(a.keys ? a.keys.map(k => ref(k.id, k.ch, k.t)) : S.sel)
function posedVal(c, id, ch, t) {
  const keys = c?.tracks?.[id]?.[ch]
  return keys?.length ? sample(keys, t, ch) : restVal(A.obj(id) || {}, ch)
}
function keyTimes() {
  const c = cur(), s = new Set()
  for (const oid in c?.tracks || {}) for (const ch in c.tracks[oid] || {}) for (const k of c.tracks[oid][ch] || []) s.add(r4(k[0]))
  return [...s].sort((a, b) => a - b)
}
function pruneSel() {
  if (!S.sel.size) return
  const c = cur(), live = new Set()
  for (const oid in c?.tracks || {}) for (const ch in c.tracks[oid] || {}) for (const k of c.tracks[oid][ch] || []) live.add(ref(oid, ch, k[0]))
  for (const r of [...S.sel]) if (!live.has(r)) S.sel.delete(r)
}

// ---------- imported model clips (read-only, AnimationMixer) ----------
function clipsOf(o) {
  const look = n => n && (n.animations?.length ? n.animations : n.userData?.animations?.length ? n.userData.animations : null)
  let c = look(o)
  if (c) return c
  for (const k of o.children || []) {
    if ((c = look(k))) return c
    for (const g of k.children || []) if ((c = look(g))) return c
  }
  return null
}
function modelClips() {
  const vp = A?.viewport, out = []
  if (!vp) return out
  for (const id of A.ids()) {
    const obj = A.obj(id)
    if (obj?.type !== 'model') continue
    const o = vp.objects.get(id), cl = o && clipsOf(o)
    if (cl) cl.forEach((clip, i) => out.push({ key: `m:${id}:${i}`, id, i, clip, name: `${obj.name || 'Model'}: ${clip.name || 'Clip ' + (i + 1)}` }))
  }
  return out
}
function modelClip(key) {
  const j = key.lastIndexOf(':'), id = key.slice(2, j), i = +key.slice(j + 1)
  const o = A?.viewport?.objects.get(id), cl = o && clipsOf(o), clip = cl?.[i]
  return clip ? { key, id, i, clip, o, name: `${A.obj(id)?.name || 'Model'}: ${clip.name || 'Clip ' + (i + 1)}` } : null
}
const timesCache = new WeakMap()
function modelTimes(clip) {
  let t = timesCache.get(clip)
  if (t) return t
  const s = new Set()
  for (const tr of clip.tracks) { for (const x of tr.times) s.add(Math.round(x * 30) / 30); if (s.size > 600) break }
  timesCache.set(clip, t = [...s].sort((a, b) => a - b))
  return t
}
function stopMix() {
  if (!S.mix) return
  S.mix.mixer.stopAllAction()
  S.mix.mixer.uncacheRoot(S.mix.root)
  S.mix = null
}

// ---------- pose evaluation (Object3Ds only; scene data keeps the rest pose) ----------
function rest(o) { return o.userData.anRest || (o.userData.anRest = { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone(), v: o.visible }) }
function colorTargets(o) { return o.isLight ? [o] : o.material ? [o] : (o.children || []).filter(c => c.isMesh && c.material && !c.userData.helper) }
function setColor(o, hex) {
  for (const m of colorTargets(o)) {
    if (m.isLight) { if (!m.userData.anCol) m.userData.anCol = m.color.clone(); m.color.set(hex); continue }
    if (Array.isArray(m.material) || !m.material.color) continue
    if (m.material !== m.userData.anClone) { m.userData.anMat = m.material; m.material = m.userData.anClone = m.material.clone() }
    m.material.color.set(hex)
  }
}
function unColor(o) {
  for (const m of colorTargets(o)) {
    if (m.userData.anCol) { m.color.copy(m.userData.anCol); delete m.userData.anCol }
    if (m.userData.anClone) {
      if (m.material === m.userData.anClone) { m.material = m.userData.anMat; m.userData.anClone.dispose() }
      delete m.userData.anClone; delete m.userData.anMat
    }
  }
}
function poseObj(o, obj, tr, t) {
  const r = rest(o)
  const p = tr.pos?.length && sample(tr.pos, t, 'pos')
  const q = tr.rot?.length && sample(tr.rot, t, 'rot')
  const s = tr.scale?.length && sample(tr.scale, t, 'scale')
  if (p) o.position.fromArray(p); else o.position.copy(r.p)
  if (q) o.rotation.set(q[0] * D2R, q[1] * D2R, q[2] * D2R); else o.quaternion.copy(r.q)
  if (s) { const b = obj.scale || [1, 1, 1]; o.scale.set(r.s.x * ratio(s[0], b[0]), r.s.y * ratio(s[1], b[1]), r.s.z * ratio(s[2], b[2])) } else o.scale.copy(r.s)
  o.visible = tr.visible?.length ? r.v && !!sample(tr.visible, t, 'visible') : r.v
  if (tr.color?.length) setColor(o, sample(tr.color, t, 'color')); else unColor(o)
  // Light intensity track (2026-11-24, cine lighting): [[t, [n], ease]] (array like every channel, so lint/sample/tidy work) in the object's own intensity units (point/spot x6 like model.js).
  const L = o.userData.light
  if (L && tr.intensity?.length) { if (o.userData.anI == null) o.userData.anI = L.intensity; L.intensity = Math.max(0, sample(tr.intensity.map(q => [q[0], Array.isArray(q[1]) ? q[1] : [+q[1]], q[2]]), t, 'pos')[0]) * (L.isDirectionalLight ? 1 : 6) }
  else if (L && o.userData.anI != null) { L.intensity = o.userData.anI; delete o.userData.anI }
  o.updateMatrix()
}
function unpose(o) {
  const r = o.userData.anRest
  if (r) { o.position.copy(r.p); o.quaternion.copy(r.q); o.scale.copy(r.s); o.visible = r.v; o.updateMatrix(); delete o.userData.anRest }
  unColor(o)
  const L = o.userData.light
  if (L && o.userData.anI != null) { L.intensity = o.userData.anI; delete o.userData.anI }
}
// Clip camera (2026-11-24, cutscenes): clip.camera = {pos, target: [[t, [x,y,z], ease]], fov, shake: [[t, n, ease]]}, sampled like
// object tracks. While a clip with camera keys plays or is in Animate mode (and Follow camera is on) it drives the view; the
// view the user had is kept and put back when it stops driving. Shake = deterministic noise (amp in studs), so shots,
// video export and every replay match frame for frame.
const CAM_V = ['pos', 'target'], CAM_N = ['fov', 'shake']
export function camAt(c, t) {
  const k = c?.camera
  if (!k) return null
  const s = {}
  for (const ch of CAM_V) if (k[ch]?.length) s[ch] = sample(k[ch], t, 'pos')
  for (const ch of CAM_N) if (k[ch]?.length) s[ch] = sample(k[ch].map(q => [q[0], [+q[1]], q[2]]), t, 'pos')[0]
  if (!s.pos && !s.target && s.fov == null) return null
  const a = s.shake || 0
  if (a && s.pos) {
    const n = f => Math.sin(t * f * 6.2832) * 0.6 + Math.sin(t * f * 2.71 + 1.3) * 0.4
    s.pos = [s.pos[0] + a * n(17), s.pos[1] + a * n(23), s.pos[2] + a * n(29)]
  }
  delete s.shake
  return s
}
// Letterbox: clip.camera.bars = [[t, amount 0..1, ease]] (ratio clip.camera.barsRatio, default 2.39:1), drawn as a pass over
// the frame (vp.post), so the viewport, shots and the MP4 export all show them; amount 0 = none.
let BARS = null
function barsPass(vp) {
  if (BARS) return BARS
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), m = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false, depthWrite: false })
  const top = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), m), bot = top.clone(); sc.add(top, bot)
  BARS = { amount: 0, ratio: 2.39, fn(r) {
    if (!(BARS.amount > 0)) return
    const sz = r.getSize(new THREE.Vector2()), want = sz.x / BARS.ratio, h = Math.max(0, (sz.y - want) / 2 / sz.y * 2) * Math.min(1, BARS.amount)   // NDC height of one bar
    if (h <= 0) return
    top.scale.set(1, h, 1); top.position.set(0, 1 - h / 2, 0); bot.scale.set(1, h, 1); bot.position.set(0, -1 + h / 2, 0)
    const ac = r.autoClear; r.autoClear = false; r.render(sc, cam); r.autoClear = ac
  } }
  ;(vp.post ||= []).push((r) => BARS.fn(r))
  return BARS
}
// Flash: clip.camera.flash = [[t, amount -1..1, ease]], a full-frame pass like the bars: > 0 = white (impact flash),
// < 0 = black (the dark dip the owner's refs show right before every flash). Runs whenever the clip plays, Follow or not.
let FLASH = null
function flashPass(vp) {
  if (FLASH) return FLASH
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false })
  sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m))
  FLASH = { amount: 0, fn(r) {
    const a = Math.max(-1, Math.min(1, FLASH.amount))
    if (Math.abs(a) < 1e-3) return
    m.color.set(a > 0 ? 0xffffff : 0x000000); m.opacity = Math.abs(a)
    const ac = r.autoClear; r.autoClear = false; r.render(sc, cam); r.autoClear = ac
  } }
  ;(vp.post ||= []).push((r) => FLASH.fn(r))
  return FLASH
}
// Grade: clip.camera.grade = [[t, [exp, vig, tint], ease]], clip.camera.gradeTint = '#hex' (2026-11-24, cine lighting).
// exp < 0 darkens (black overlay), exp > 0 lifts (additive white); vig = radial edge darkening 0..1; tint = additive colour
// wash 0..1. A full-frame pass after the scene like flash/bars, so viewport, shots and MP4 export all match.
let GRADE = null
function gradePass(vp) {
  if (GRADE) return GRADE
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const U = { exp: { value: 0 }, vig: { value: 0 }, tint: { value: 0 }, col: { value: new THREE.Color(1, 1, 1) }, aspect: { value: 1 } }
  const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
  const dark = new THREE.ShaderMaterial({ uniforms: U, vertexShader: vs, transparent: true, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform float exp; uniform float vig; uniform float aspect; varying vec2 vUv; void main(){ vec2 d = (vUv - 0.5) * vec2(aspect, 1.0); float r = length(d) / length(vec2(aspect, 1.0) * 0.5); float a = clamp(max(0.0, -exp) + vig * smoothstep(0.45, 1.0, r), 0.0, 1.0); gl_FragColor = vec4(0.0, 0.0, 0.0, a); }' })
  const lift = new THREE.ShaderMaterial({ uniforms: U, vertexShader: vs, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    fragmentShader: 'uniform float exp; uniform float tint; uniform vec3 col; varying vec2 vUv; void main(){ vec2 d = vUv - 0.5; float c = 1.0 - 0.6 * dot(d, d) * 4.0; gl_FragColor = vec4(vec3(max(0.0, exp)) + col * tint * c, 1.0); }' })
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dark); sc.add(q)
  GRADE = { exp: 0, vig: 0, tint: 0, color: '#ffffff', fn(r) {
    if (Math.abs(GRADE.exp) < 1e-3 && GRADE.vig < 1e-3 && GRADE.tint < 1e-3) return
    const sz = r.getSize(new THREE.Vector2()); U.aspect.value = sz.x / Math.max(1, sz.y)
    U.exp.value = Math.max(-1, Math.min(1, GRADE.exp)); U.vig.value = Math.min(1, Math.max(0, GRADE.vig)); U.tint.value = Math.min(1, Math.max(0, GRADE.tint)); U.col.value.set(GRADE.color)
    const ac = r.autoClear; r.autoClear = false
    if (U.exp.value < 0 || U.vig.value > 0) { q.material = dark; r.render(sc, cam) }
    if (U.exp.value > 0 || U.tint.value > 0) { q.material = lift; r.render(sc, cam) }
    r.autoClear = ac
  } }
  // Before flash and bars: the grade is part of the image, the flash and letterbox sit on top of it.
  ;(vp.post ||= []).unshift((r) => GRADE.fn(r))
  return GRADE
}
export function gradeAt(c, t) {
  const gk = c?.camera?.grade
  if (!gk?.length) return null
  const v = sample(gk.map(q => [q[0], [0, 1, 2].map(i => +(Array.isArray(q[1]) ? q[1][i] : 0) || 0), q[2]]), t, 'pos')
  return { exp: v[0], vig: v[1], tint: v[2], color: c.camera.gradeTint || '#ffffff' }
}
function camDrive(vp, c, t) {
  const g = gradeAt(c, t)
  if (g || GRADE) Object.assign(gradePass(vp), g || { exp: 0, vig: 0, tint: 0 })
  const fk = c?.camera?.flash?.length ? c.camera.flash : null
  if (fk || FLASH) flashPass(vp).amount = fk ? sample(fk.map(q => [q[0], [+q[1]], q[2]]), t, 'pos')[0] : 0
  const bk = S.camFollow && c?.camera?.bars?.length ? c.camera.bars : null
  if (bk || BARS) { const b = barsPass(vp); b.amount = bk ? sample(bk.map(q => [q[0], [+q[1]], q[2]]), t, 'pos')[0] : 0; b.ratio = +c?.camera?.barsRatio || 2.39 }
  const s = S.camFollow && c ? camAt(c, t) : null
  if (s) {
    if (!S.camSaved) S.camSaved = vp.getCamera?.()
    vp.setCamera?.(s); return
  }
  if (S.camSaved) { const v = S.camSaved; S.camSaved = null; vp.setCamera?.(v) }
}
function evaluate(t = A?.time || 0, force = false) {
  const vp = A?.viewport
  if (!vp) return
  const id = curId(), on = force || active(), next = new Set()
  const c = on && id && !isModelRef(id) ? anims()[id] : null
  if (c) for (const oid in c.tracks || {}) {
    const o = vp.objects.get(oid), obj = A.obj(oid)
    if (!o || !obj || !c.tracks[oid]) continue
    poseObj(o, obj, c.tracks[oid], storyAt(c, t))
    next.add(oid)
  }
  for (const oid of S.posed) if (!next.has(oid)) { const o = vp.objects.get(oid); if (o) unpose(o) }
  S.posed = next
  camDrive(vp, c, storyAt(c, t))
  const m = on && isModelRef(id) ? modelClip(id) : null
  if (S.mix && (!m || S.mix.key !== m.key || S.mix.root !== m.o)) stopMix()
  if (m) {
    if (!S.mix) { const mixer = new THREE.AnimationMixer(m.o), action = mixer.clipAction(m.clip); action.play(); S.mix = { key: m.key, root: m.o, mixer, action } }
    S.mix.mixer.setTime(Math.min(t, Math.max(0, m.clip.duration - 1e-4)))
  }
  vp.shadowsDirty?.()
  if (!S.playing) vp.updateGizmo?.()
  vp.requestRender()
}
function restAll() {
  const vp = A?.viewport
  if (!vp) return
  for (const oid of S.posed) { const o = vp.objects.get(oid); if (o) unpose(o) }
  S.posed = new Set()
  stopMix()
  vp.requestRender()
}

// ---------- playback ----------
function play() {
  if (S.playing) return
  if (!curId()) { A.toast('Make a clip first', 'warn'); return }
  if ((A.time || 0) >= curLen() - 1e-4) A.setTime(0)
  S.playing = true
  let last = performance.now()
  S.stopLoop = A.viewport.loop(() => {
    if (!S.playing) return false
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000)
    last = now
    const L = curLen(), loop = isModelRef(curId()) || cur()?.loop !== false
    let t = (A.time || 0) + dt * S.speed
    if (t >= L) { if (loop) t %= L; else { t = L; S.playing = false } }
    A.setTime(t)
    if (!S.playing) { S.stopLoop = null; evaluate(); syncUI(); return false }
  })
  evaluate(); syncUI()
}
function pause() {
  if (!S.playing) return
  S.playing = false
  const s = S.stopLoop
  S.stopLoop = null
  s?.()
  evaluate(); syncUI()
}
function stop() { pause(); A.setTime(0) }

// ---------- presets ----------
function cyc(L, period, pat, fps) {
  const n = Math.max(1, Math.round(L / period)), P = L / n, keys = []
  for (let k = 0; k < n; k++) for (const [ph, v, e] of pat) keys.push(mk(snap(k * P + ph * P, fps), v, e))
  keys.push(mk(r4(L), pat[0][1]))
  return keys.filter((k, i) => i === 0 || k[0] > keys[i - 1][0] + 1e-6)
}
function joints(app, root) {
  const all = app.descendants?.(root) || []
  if (!all.length) return null
  const nm = x => (app.obj(x)?.name || '').toLowerCase().replace(/[\s_.-]+/g, '')
  const joint = x => {
    const o = app.obj(x)
    if (o?.type === 'group') return x
    const p = o?.parent
    return p && p !== root && app.obj(p)?.type === 'group' ? p : x
  }
  const pick = (...res) => { for (const re of res) { const x = all.find(i => re.test(nm(i))); if (x) return joint(x) } return null }
  const j = {
    root,
    la: pick(/^leftshoulder/, /^leftarm/, /^larm/, /leftarm/),
    ra: pick(/^rightshoulder/, /^rightarm/, /^rarm/, /rightarm/),
    ll: pick(/^lefthip/, /^leftleg/, /^lleg/, /leftleg/),
    rl: pick(/^righthip/, /^rightleg/, /^rleg/, /rightleg/)
  }
  return [j.la, j.ra, j.ll, j.rl].filter(Boolean).length >= 2 ? j : null
}
function findRig(app, id) {
  for (let p = id, g = 0; p && g < 40; p = app.obj(p)?.parent, g++) { const j = joints(app, p); if (j) return j }
  return null
}
const rotOf = id => A.obj(id)?.rot || [0, 0, 0]
// A rig limb that is a plain part turns about its top (shoulder / hip), not its centre: add pos keys that follow the rotation.
function pivotKeys(app, id, rk, fps) {
  const o = app.obj(id)
  if (!o || o.type === 'group' || !o.size || !rk?.length) return null
  const h = o.size[1] * (o.scale?.[1] ?? 1) / 2, e = new THREE.Euler(), v = new THREE.Vector3()
  const arm = r => { e.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ'); return v.set(0, -h, 0).applyEuler(e).toArray() }
  const piv = add(o.pos || [0, 0, 0], mul(arm(o.rot || [0, 0, 0]), -1)), at = r => add(piv, arm(r)).map(x => Math.round(x * 1e4) / 1e4)
  const out = []
  for (let i = 0; i < rk.length; i++) {
    const [t0, r0] = rk[i]
    out.push([t0, at(r0)])
    const nx = rk[i + 1]
    if (!nx) break
    const n = Math.ceil(Math.max(...nx[1].map((x, k) => Math.abs(x - r0[k]))) / 20)
    for (let s = 1; s < n; s++) { const t = snap(t0 + (nx[0] - t0) * s / n, fps); if (t > t0 + 1e-6 && t < nx[0] - 1e-6) out.push([t, at(sample(rk, t, 'rot'))]) }
  }
  return out.filter((k, i) => i === 0 || k[0] > out[i - 1][0] + 1e-6)
}
const PRESETS = {
  spin: { label: 'Spin', icon: 'an-spin', len: 2, make: (app, id, L) => ({ [id]: { rot: [[0, rotOf(id)], [r4(L), add(rotOf(id), [0, 360, 0])]] } }) },
  bob: { label: 'Bob (idle)', icon: 'an-bob', len: 2, make: (app, id, L, fps) => { const p = app.obj(id).pos || [0, 0, 0]; return { [id]: { pos: cyc(L, L, [[0, p, 'ease'], [0.5, add(p, [0, 0.5, 0]), 'ease']], fps) } } } },
  bounce: {
    label: 'Bounce', icon: 'an-bounce', len: 1,
    make: (app, id, L, fps) => {
      const o = app.obj(id), p = o.pos || [0, 0, 0], s = o.scale || [1, 1, 1], sq = mul(s, [1.15, 0.8, 1.15])
      return { [id]: {
        pos: cyc(L, L, [[0, p, 'out'], [0.5, add(p, [0, 2, 0]), 'in']], fps),
        scale: [[0, sq, 'out'], [snap(L * 0.15, fps), s], [snap(L * 0.85, fps), s, 'in'], [r4(L), sq]]
      } }
    }
  },
  pulse: { label: 'Pulse scale', icon: 'an-pulse', len: 1, make: (app, id, L, fps) => { const s = app.obj(id).scale || [1, 1, 1]; return { [id]: { scale: cyc(L, L, [[0, s, 'ease'], [0.5, mul(s, 1.25), 'ease']], fps) } } } },
  walk: {
    label: 'Walk cycle (rig)', icon: 'an-walk', len: 1, rig: true,
    make: (app, j, L, fps) => {
      const out = {}
      const swing = (id, amp) => { if (id) { const r = rotOf(id); out[id] = { rot: cyc(L, 1, [[0, add(r, [amp, 0, 0]), 'ease'], [0.5, add(r, [-amp, 0, 0]), 'ease']], fps) } } }
      swing(j.ll, 30); swing(j.rl, -30); swing(j.la, -24); swing(j.ra, 24)
      const p = app.obj(j.root).pos || [0, 0, 0], up = add(p, [0, 0.12, 0])
      out[j.root] = { pos: cyc(L, 1, [[0, p, 'ease'], [0.25, up, 'ease'], [0.5, p, 'ease'], [0.75, up, 'ease']], fps) }
      return out
    }
  },
  wave: {
    label: 'Wave (rig)', icon: 'an-wave', len: 2, rig: true,
    make: (app, j, L, fps) => {
      const arm = j.ra || j.la
      if (!arm) return null
      const side = (app.obj(arm).pos?.[0] ?? (arm === j.ra ? 1 : -1)) >= 0 ? 1 : -1, r = rotOf(arm)
      const z = d => add(r, [0, 0, side * d])
      const T = f => snap(L * f, fps)
      return { [arm]: { rot: [[0, r, 'ease'], [T(0.22), z(155), 'ease'], [T(0.36), z(125), 'ease'], [T(0.5), z(160), 'ease'], [T(0.64), z(125), 'ease'], [T(0.8), z(155), 'ease'], [r4(L), r]] } }
    }
  }
}
function runPreset(app, a, key) {
  const P = PRESETS[key]
  const ids = (a.ids || [...(app.selection || [])]).filter(id => app.obj(id) && !app.isLocked?.(id))
  if (!ids.length) throw new Error(P.rig ? 'Select a rig first (Add > Rig)' : 'Select an object first')
  const targets = []
  if (P.rig) {
    const seen = new Set()
    for (const id of ids) { const j = findRig(app, id); if (j && !seen.has(j.root)) { seen.add(j.root); targets.push(j) } }
    if (!targets.length) throw new Error('No rig joints found: select a rig made with Add > Rig')
  } else targets.push(...ids)
  if (app.mode !== 'animate') app.setMode?.('animate')
  const { id, c } = ensureClip(app, P.label.replace(/ \(.*\)$/, ''), a.len || P.len)
  const next = clone(c), L = lenOf(next), fps = fpsOf(next)
  next.tracks ||= {}
  let n = 0
  for (const tg of targets) {
    const tracks = P.make(app, tg, L, fps)
    for (const oid in tracks || {}) {
      const tr = tracks[oid]
      for (const ch in tr) tr[ch] = tr[ch].map(k => mk(k[0], normVal(ch, k[1]), k[2]))
      if (P.rig && tr.rot && !tr.pos) { const pk = pivotKeys(app, oid, tr.rot, fps); if (pk) tr.pos = pk }
      next.tracks[oid] = { ...(next.tracks[oid] || {}), ...tr }
      n++
    }
  }
  if (!n) throw new Error('Nothing to animate')
  app.putAnim(id, next)
  return id
}

// ---------- clips to THREE.AnimationClip (GLB export) ----------
function toClips(opts = {}) {
  const vp = A?.viewport, out = []
  let byId = null
  if (opts.root) { byId = new Map(); opts.root.traverse(o => { const k = o.userData?.id; if (k != null && !byId.has(k)) byId.set(k, o) }) }
  const node = id => byId ? byId.get(id) : vp?.objects.get(id)
  const q = new THREE.Quaternion(), e = new THREE.Euler()
  for (const [aid, a] of Object.entries(anims())) {
    if (!a) continue
    const fps = fpsOf(a), len = lenOf(a), n = Math.max(1, Math.round(len * fps))
    const times = new Float32Array(n + 1)
    for (let i = 0; i <= n; i++) times[i] = Math.min(len, i / fps)
    const tracks = []
    for (const [oid, tr] of Object.entries(a.tracks || {})) {
      const obj = A.obj(oid), o = node(oid)
      if (!obj || !tr || (byId && !o)) continue                   // not in the export copy (a temporary model)
      const nm = opts.nodeName ? opts.nodeName(oid) : o ? o.uuid : oid
      const bake = (ch, size, fn) => { const v = new Float32Array((n + 1) * size); for (let i = 0; i <= n; i++) v.set(fn(sample(tr[ch], storyAt(a, times[i]), ch)), i * size); return v }
      if (tr.pos?.length) tracks.push(new THREE.VectorKeyframeTrack(nm + '.position', times, bake('pos', 3, v => v)))
      if (tr.rot?.length) {
        let prev = null
        const v = bake('rot', 4, r => {
          e.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, o?.rotation.order || 'XYZ'); q.setFromEuler(e)
          if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w)
          prev = (prev || new THREE.Quaternion()).copy(q)
          return [q.x, q.y, q.z, q.w]
        })
        tracks.push(new THREE.QuaternionKeyframeTrack(nm + '.quaternion', times, v))
      }
      if (tr.scale?.length) {
        const b = obj.scale || [1, 1, 1], rs = o ? (o.userData.anRest?.s || o.scale) : null
        tracks.push(new THREE.VectorKeyframeTrack(nm + '.scale', times, bake('scale', 3, s => rs ? [rs.x * ratio(s[0], b[0]), rs.y * ratio(s[1], b[1]), rs.z * ratio(s[2], b[2])] : s)))
      }
      if (opts.all && tr.color?.length) { const c = new THREE.Color(); tracks.push(new THREE.ColorKeyframeTrack(nm + '.material.color', times, bake('color', 3, h => c.set(h).toArray()))) }
      if (opts.all && tr.visible?.length) tracks.push(new THREE.BooleanKeyframeTrack(nm + '.visible', Array.from(times), Array.from(times, t => !!sample(tr.visible, t, 'visible'))))
    }
    if (!tracks.length && !opts.empty) continue
    const clip = new THREE.AnimationClip(a.name || aid, len, tracks)
    clip.userData = { id: aid, loop: a.loop !== false, fps }
    out.push(clip)
  }
  return out
}

// ---------- timeline panel ----------
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }
const ic = name => { const v = icon(name); return typeof v === 'string' ? v : v?.outerHTML || '' }
const metrics = () => isPhone() ? { NW: 112, RH: 30, ROW: 34, R: 6.5, PAD: 12 } : { NW: 190, RH: 24, ROW: 22, R: 5, PAD: 10 }
const font = () => `${isPhone() ? 13 : 12}px Inter, system-ui, sans-serif`
const MONO = '11px "JetBrains Mono", ui-monospace, monospace'
function tx(t) { const u = S.ui, M = metrics(); return M.NW + M.PAD + (t - u.t0) * u.pps }
function xt(x) { const u = S.ui, M = metrics(); return (x - M.NW - M.PAD) / u.pps + u.t0 }
function readColors() {
  let cs = null
  try { cs = getComputedStyle(document.documentElement) } catch {}
  const v = (n, d) => (cs && cs.getPropertyValue(n).trim()) || d
  return {
    panel: v('--panel', '#202329'), panel2: v('--panel2', '#262a31'), line: v('--line', '#2f343c'), text: v('--text', '#d9dde4'),
    mute: v('--mute', '#8b93a1'), accent: v('--accent', '#3d8bfd'), select: v('--select', '#ffa23a'),
    selRow: 'rgba(61,139,253,.14)', chRow: 'rgba(0,0,0,.14)', grid: 'rgba(255,255,255,.05)', shade: 'rgba(0,0,0,.26)', span: 'rgba(217,221,228,.16)', sum: '#aeb5c0', fx: 'rgba(61,139,253,.28)'
  }
}
function buildRows() {
  const id = curId(), rows = []
  S.rows = rows
  if (!A || !id) return rows
  if (isModelRef(id)) { const m = modelClip(id); if (m) rows.push({ kind: 'model', id: m.id, depth: 0, name: m.name, clip: m.clip }); return rows }
  const tracks = anims()[id]?.tracks || {}, want = new Set()
  for (const oid in tracks) if (A.obj(oid)) want.add(oid)
  for (const oid in A.scene?.objects || {}) if (A.scene.objects[oid].type === 'flipbook') want.add(oid)   // effects: a bar to drag
  for (const oid of A.selection || []) if (A.obj(oid) && !A.isLocked?.(oid)) want.add(oid)
  const show = new Set(want)
  for (const oid of want) { let p = A.obj(oid)?.parent, g = 0; while (p && g++ < 64 && A.obj(p)) { show.add(p); p = A.obj(p).parent } }
  const kids = new Map()
  for (const oid of show) { const p = A.obj(oid)?.parent ?? null, k = show.has(p) ? p : null; if (!kids.has(k)) kids.set(k, []); kids.get(k).push(oid) }
  const ord = oid => A.obj(oid)?.order ?? 0
  const walk = (p, d) => {
    const list = kids.get(p)
    if (!list) return
    list.sort((a, b) => ord(a) - ord(b))
    for (const oid of list) {
      rows.push({ kind: 'obj', id: oid, depth: d })
      if (S.open.has(oid)) for (const ch of CH) rows.push({ kind: 'ch', id: oid, ch, depth: d + 1 })
      walk(oid, d + 1)
    }
  }
  walk(null, 0)
  return rows
}
function keysOfRow(row) {
  if (row.kind === 'model') return modelTimes(row.clip).map(t => ({ t, refs: [] }))
  const tr = cur()?.tracks?.[row.id] || {}
  if (row.kind === 'ch') return (tr[row.ch] || []).map(k => ({ t: k[0], ease: k[2], refs: [ref(row.id, row.ch, k[0])] }))
  const m = new Map(), all = cur()?.tracks || {}
  for (const oid of [row.id, ...(A.descendants?.(row.id) || [])]) for (const ch of CH) for (const k of all[oid]?.[ch] || []) {
    const kk = Math.round(k[0] * 1e4)
    let e = m.get(kk)
    if (!e) m.set(kk, e = { t: k[0], refs: [] })
    e.refs.push(ref(oid, ch, k[0]))
  }
  return [...m.values()].sort((a, b) => a.t - b.t)
}
function fxSpan(id) {             // an effect's playing window on the clip timeline
  const o = A.obj(id)
  if (!o || o.type !== 'flipbook') return null
  const t0 = +o.start || 0
  return { t0, t1: t0 + (o.loop ? +o.dur || 1 : +o.life || 1), loop: !!o.loop }
}
function fxAt(x, y) {
  const hit = rowAt(y), f = hit && hit.row.kind === 'obj' && fxSpan(hit.row.id)
  if (!f) return null
  const a = tx(f.t0), b = tx(f.t1)
  if (x < a - 4 || x > b + 6) return null
  return { id: hit.row.id, mode: x > b - 10 ? 'len' : 'move', f }
}
function rowAt(y) {
  const M = metrics(), i = Math.floor((y - M.RH + S.ui.sy) / M.ROW), rows = S.rows || buildRows()
  return y >= M.RH && rows[i] ? { row: rows[i], i } : null
}
function keyAt(x, y) {
  const hit = rowAt(y)
  if (!hit) return null
  let best = null, bd = metrics().R + 4
  for (const k of keysOfRow(hit.row)) { const d = Math.abs(tx(k.t) - x); if (d <= bd) { bd = d; best = k } }
  return best && { ...best, row: hit.row }
}
const clampScroll = v => { const u = S.ui, M = metrics(); return Math.max(0, Math.min(v, (S.rows || []).length * M.ROW - (u.h - M.RH) + 8)) }
function fit() {
  const u = S.ui, M = metrics()
  u.pps = Math.max(2, (u.w - M.NW - 2 * M.PAD) / curLen())
  u.t0 = 0
}
function ticks(fps, pps) {
  const ppf = pps / fps
  const minor = [1, 2, 5, 10, 15, 30, 60, 150, 300, 600, 1500, 3000].find(s => s * ppf >= 6) || 6000
  const cands = [1, 2, 5, 10, Math.round(fps / 2), fps, fps * 2, fps * 5, fps * 10, fps * 30, fps * 60].filter(v => v >= 1).sort((a, b) => a - b)
  return { minor, major: cands.find(s => s * ppf >= 56) || fps * 120 }
}
function diamond(g, x, y, r, fill, shape) {
  g.beginPath()
  if (shape === 'step') g.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6)
  else if (shape === 'round') g.arc(x, y, r * 0.85, 0, Math.PI * 2)
  else { g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath() }
  g.fillStyle = fill; g.fill()
  g.lineWidth = 1; g.strokeStyle = '#0d0f12'; g.stroke()
}
const shapeOf = e => !e || e === 'linear' ? 'diamond' : e === 'step' ? 'step' : 'round'
function ellipsize(g, s, w) {
  if (g.measureText(s).width <= w) return s
  while (s.length > 1 && g.measureText(s + '…').width > w) s = s.slice(0, -1)
  return s + '…'
}
function nameCell(g, r, y, M, C, on, tracked) {
  const x0 = 8 + r.depth * (isPhone() ? 10 : 12), cy = y + M.ROW / 2
  g.save(); g.beginPath(); g.rect(0, y, M.NW - 1, M.ROW); g.clip()
  g.fillStyle = on ? 'rgba(61,139,253,.10)' : C.panel2; g.fillRect(0, y, M.NW - 1, M.ROW - 1)
  g.font = font(); g.textBaseline = 'middle'; g.textAlign = 'left'
  if (r.kind === 'ch') {
    g.fillStyle = CH_COL[r.ch]; g.fillRect(x0 + 2, cy - 4, 3, 8)
    g.fillStyle = C.mute; g.fillText(CH_LABEL[r.ch], x0 + 10, cy)
  } else {
    if (r.kind === 'obj') {
      g.fillStyle = C.mute; g.beginPath()
      if (S.open.has(r.id)) { g.moveTo(x0, cy - 2); g.lineTo(x0 + 8, cy - 2); g.lineTo(x0 + 4, cy + 3) } else { g.moveTo(x0 + 2, cy - 4); g.lineTo(x0 + 7, cy); g.lineTo(x0 + 2, cy + 4) }
      g.closePath(); g.fill()
    }
    g.fillStyle = tracked || on ? C.text : C.mute
    g.fillText(ellipsize(g, r.name || A.obj(r.id)?.name || r.id, M.NW - x0 - 22), x0 + 14, cy)
  }
  g.restore()
}
function draw() {
  const u = S.ui
  if (!u || u.w < 2 || u.h < 2) return
  const g = u.g, M = metrics(), C = u.col, { NW, RH, ROW, R } = M
  g.setTransform(u.dpr, 0, 0, u.dpr, 0, 0)
  g.fillStyle = C.panel; g.fillRect(0, 0, u.w, u.h)
  const id = curId(), c = cur(), len = curLen(), fps = curFps()
  const rows = S.rows || buildRows()
  u.sy = clampScroll(u.sy)
  const selObj = new Set(A.selection || [])
  const xe = tx(len)
  if (xe < u.w) { g.fillStyle = C.shade; g.fillRect(Math.max(NW, xe), RH, u.w, u.h) }
  const tk = ticks(fps, u.pps)
  const f0 = Math.max(0, Math.floor(xt(NW) * fps)), f1 = Math.ceil(xt(u.w) * fps)
  g.fillStyle = C.grid
  for (let f = Math.ceil(f0 / tk.major) * tk.major; f <= f1; f += tk.major) g.fillRect(Math.round(tx(f / fps)), RH, 1, u.h - RH)
  const moving = u.drag?.kind === 'move' ? u.drag.dt : 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], y = RH + i * ROW - u.sy
    if (y + ROW <= RH || y >= u.h) continue
    const on = r.kind !== 'ch' && selObj.has(r.id)
    if (on) { g.fillStyle = C.selRow; g.fillRect(NW, y, u.w - NW, ROW) } else if (r.kind === 'ch') { g.fillStyle = C.chRow; g.fillRect(NW, y, u.w - NW, ROW) }
    g.fillStyle = C.line; g.fillRect(0, y + ROW - 1, u.w, 1)
    nameCell(g, r, y, M, C, on, r.kind === 'model' || !!c?.tracks?.[r.id])
    const ks = keysOfRow(r), cy = y + ROW / 2
    g.save(); g.beginPath(); g.rect(NW, y, u.w - NW, ROW); g.clip()
    const fb = r.kind === 'obj' && fxSpan(r.id)
    if (fb) {
      const d = u.drag?.kind === 'fx' && u.drag.id === r.id ? u.drag : null
      const t0 = fb.t0 + (d?.mode === 'move' ? d.dt : 0), t1 = Math.max(t0 + 1 / fps, fb.t1 + (d ? d.dt : 0))
      const a = tx(t0), b = tx(t1), bh = ROW - 8
      g.fillStyle = C.fx; g.strokeStyle = C.accent; g.lineWidth = 1
      g.beginPath(); if (g.roundRect) g.roundRect(a, y + 4, b - a, bh, 4); else g.rect(a, y + 4, b - a, bh); g.fill(); g.stroke()
      g.fillStyle = C.accent; g.fillRect(b - 4, y + 6, 2, bh - 4)
      g.font = font(); g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = C.text
      g.fillText(ellipsize(g, A.obj(r.id).name || 'Effect', Math.max(0, b - a - 14)), a + 6, cy)
    } else if (r.kind === 'obj') {         // a thin strip per effect inside, so the top rows show there are effects to scroll to
      for (const d of A.descendants?.(r.id) || []) { const f = fxSpan(d); if (f) { g.fillStyle = C.fx; g.fillRect(tx(f.t0), y + ROW - 5, tx(f.t1) - tx(f.t0), 3) } }
    }
    if (ks.length > 1) { g.fillStyle = C.span; const a = tx(ks[0].t), b = tx(ks[ks.length - 1].t); g.fillRect(a, cy - 1, b - a, 2) }
    for (const k of ks) {
      const s = k.refs.length > 0 && k.refs.some(x => S.sel.has(x))
      const x = tx(k.t + (s ? moving : 0))
      if (x < NW - R || x > u.w + R) continue
      diamond(g, x, cy, r.kind === 'ch' ? R : R + 0.5, s ? C.select : r.kind === 'ch' ? C.text : C.sum, r.kind === 'ch' ? shapeOf(k.ease) : 'diamond')
    }
    g.restore()
  }
  g.fillStyle = C.line; g.fillRect(NW - 1, 0, 1, u.h)
  if (!rows.length) {
    g.font = font(); g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = C.mute
    g.fillText(!id ? 'No clip yet. Press + for a new clip, or pick a preset.' : 'Select an object, then press Key (K).', NW + 14, RH + 20)
  }
  // ruler
  g.fillStyle = C.panel2; g.fillRect(0, 0, u.w, RH)
  g.fillStyle = C.line; g.fillRect(0, RH - 1, u.w, 1)
  g.font = font(); g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = C.mute
  const head = c ? (isPhone() ? `${fps} fps` : `${c.name || id} · ${fps} fps`) : isModelRef(id) ? 'Imported clip (read-only)' : 'Timeline'
  g.fillText(ellipsize(g, head, NW - 16), 8, RH / 2)
  g.save(); g.beginPath(); g.rect(NW, 0, u.w - NW, RH); g.clip()
  g.fillStyle = C.mute
  for (let f = Math.ceil(f0 / tk.minor) * tk.minor; f <= f1; f += tk.minor) g.fillRect(Math.round(tx(f / fps)), RH - 5, 1, 4)
  g.font = MONO
  for (let f = Math.ceil(f0 / tk.major) * tk.major; f <= f1; f += tk.major) {
    const x = Math.round(tx(f / fps))
    g.fillStyle = C.mute; g.fillRect(x, RH - 11, 1, 10)
    g.fillStyle = f % fps === 0 ? C.text : C.mute
    const lab = f % fps === 0 ? `${f / fps}s` : String(f)
    g.fillText(lab, Math.min(x + 4, u.w - g.measureText(lab).width - 3), RH / 2 - 2)
  }
  g.restore()
  // playhead
  const tnow = A.time || 0, xp = tx(tnow)
  if (xp >= NW - 1 && xp <= u.w + 1) {
    g.fillStyle = C.accent; g.fillRect(Math.round(xp) - 1, RH, 2, u.h - RH)
    g.font = MONO
    const lab = String(Math.round(tnow * fps)), w = g.measureText(lab).width + 12
    g.beginPath()
    if (g.roundRect) g.roundRect(xp - w / 2, 3, w, RH - 6, 4); else g.rect(xp - w / 2, 3, w, RH - 6)
    g.fill()
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.fillText(lab, xp, RH / 2)
  }
  if (u.drag?.kind === 'box') {
    const d = u.drag, x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1)
    g.fillStyle = 'rgba(61,139,253,.14)'; g.fillRect(x, y, Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0))
    g.strokeStyle = C.accent; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0))
  }
}
function resize() {
  const u = S.ui
  if (!u) return
  const r = u.body.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2)
  u.w = r.width; u.h = r.height; u.dpr = dpr
  u.cv.width = Math.max(1, Math.round(r.width * dpr)); u.cv.height = Math.max(1, Math.round(r.height * dpr))
  if (!u.zoomed) fit()
}
function updateTime() {
  const u = S.ui
  if (!u?.time) return
  const t = A.time || 0
  u.time.innerHTML = `<b>${t.toFixed(2)}s</b><i>f ${Math.round(t * curFps())}</i>`
}
function syncBar() {
  const u = S.ui
  if (!u) return
  const id = curId(), c = cur(), model = isModelRef(id)
  const list = Object.entries(anims()).filter(([, a]) => a).map(([k, a]) => [k, a.name || k])
  const mc = modelClips()
  const sig = JSON.stringify([list, mc.map(m => [m.key, m.name]), id])
  if (sig !== u.sig) {
    u.sig = sig
    u.sel.innerHTML = ''
    if (!list.length && !mc.length) { const o = h('option', '', 'No clips'); o.value = ''; u.sel.append(o) }
    for (const [k, n] of list) { const o = h('option'); o.value = k; o.textContent = n; u.sel.append(o) }
    if (mc.length) {
      const gr = h('optgroup'); gr.label = 'Imported (read-only)'
      for (const m of mc) { const o = h('option'); o.value = m.key; o.textContent = m.name; gr.append(o) }
      u.sel.append(gr)
    }
    u.sel.value = id || ''
  }
  const focus = document.activeElement
  if (u.len && focus !== u.len) u.len.value = c ? lenOf(c).toFixed(2) : model ? curLen().toFixed(2) : ''
  if (u.fps && focus !== u.fps) u.fps.value = c ? fpsOf(c) : model ? 30 : ''
  for (const b of [u.ren, u.dup, u.del, u.loop, u.len, u.fps, u.key]) if (b) b.disabled = !c && !(b === u.key && !model && !id)
  if (u.key) u.key.disabled = model
  u.loop?.classList.toggle('on', !!c && c.loop !== false)
  u.rec.classList.toggle('on', S.autokey)
  u.play.classList.toggle('on', S.playing)
  u.play.innerHTML = ic(S.playing ? 'an-pause' : 'an-play')
  u.play.title = (S.playing ? 'Pause' : 'Play') + ' (Space)'
  if (u.speed) u.speed.value = String(S.speed)
  updateTime()
}
function syncUI() { if (S.ui) { S.rows = null; syncBar(); draw() } }

function menuAt(anchor, items, title) {
  const r = anchor?.getBoundingClientRect?.() || { left: innerWidth / 2, bottom: innerHeight / 2 }
  A.ui.menu(items, r.left, r.bottom, { title, sheet: isPhone() })
}
const cmdItem = id => { const d = A.commands?.get?.(id) || plugin.commands[id]; return { label: d.label, icon: d.icon, key: Array.isArray(d.key) ? d.key[0] : d.key, checked: d.checked?.(A), run: () => A.exec(id) } }
function presetMenu(anchor) { menuAt(anchor, ['anim.spin', 'anim.bob', 'anim.bounce', 'anim.pulse', '-', 'anim.walk', 'anim.wave'].map(x => x === '-' ? '-' : cmdItem(x)), 'Presets') }
function clipMenu(anchor) {
  const c = cur()
  const items = [cmdItem('anim.new')]
  if (c) items.push(cmdItem('anim.rename'), cmdItem('anim.duplicate'), cmdItem('anim.set'), cmdItem('anim.loop'), cmdItem('anim.delete'))
  items.push('-', cmdItem('anim.stop'), cmdItem('anim.end'), '-')
  for (const v of [0.5, 1, 2]) items.push({ label: `Speed ${v}×`, icon: 'an-play', checked: S.speed === v, run: () => A.exec('anim.speed', { speed: v }) })
  menuAt(anchor, items, c?.name || 'Clip')
}
function keyMenu(x, y) {
  const c = cur()
  if (!c) return
  const items = []
  if (S.sel.size) {
    const es = new Set()
    eachKey(c, S.sel, k => es.add(k[2] || 'linear'))
    for (const e of EASES) items.push({ label: EASE_LABEL[e], icon: 'an-ease', checked: es.size === 1 && es.has(e), run: () => A.exec('anim.ease', { ease: e }) })
    items.push('-', cmdItem('anim.copyKeys'))
  }
  if (S.clipboard?.length) items.push(cmdItem('anim.pasteKeys'))
  if (S.sel.size) items.push(cmdItem('anim.deleteKeys'))
  items.push('-', cmdItem('anim.key'), { label: 'Select all keys', icon: 'an-key', run: () => A.exec('anim.selectKeys', { all: true }) })
  A.ui.menu(items, x, y, { title: S.sel.size ? `${S.sel.size} key${S.sel.size > 1 ? 's' : ''}` : 'Keys', sheet: isPhone() })
}

function bindCanvas(u) {
  const cv = u.cv, pts = new Map()
  let lp = 0
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const scrub = x => { pause(); const t = Math.max(0, Math.min(curLen(), snap(xt(x)))); if (Math.abs(t - (A.time || 0)) > 1e-6) A.setTime(t) }
  const nameClick = (p, e) => {
    const hit = rowAt(p.y)
    if (!hit || hit.row.kind === 'ch') return
    const x0 = 8 + hit.row.depth * (isPhone() ? 10 : 12)
    if (hit.row.kind === 'obj' && p.x < x0 + 14) { S.open.has(hit.row.id) ? S.open.delete(hit.row.id) : S.open.add(hit.row.id); S.rows = null; draw(); return }
    A.select([hit.row.id], { add: e.shiftKey || e.ctrlKey || e.metaKey })
  }
  const boxPick = d => {
    const M = metrics(), x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1)
    S.sel = new Set(d.base)
    ;(S.rows || []).forEach((r, i) => {
      const y = M.RH + i * M.ROW - u.sy + M.ROW / 2
      if (y < y0 || y > y1) return
      for (const k of keysOfRow(r)) { const x = tx(k.t); if (x >= x0 && x <= x1) k.refs.forEach(s => S.sel.add(s)) }
    })
  }
  const down = e => {
    const p = pos(e)
    pts.set(e.pointerId, p)
    try { cv.setPointerCapture(e.pointerId) } catch {}
    if (pts.size === 2) {
      clearTimeout(lp)
      const [a, b] = [...pts.values()]
      u.drag = { kind: 'pinch', d0: Math.abs(a.x - b.x) + 1, pps0: u.pps, tc: xt((a.x + b.x) / 2), cx: (a.x + b.x) / 2 }
      return
    }
    if (pts.size > 2 || e.button === 2) return
    const M = metrics(), touch = e.pointerType !== 'mouse'
    if (e.button === 1) { e.preventDefault(); u.drag = { kind: 'pan', x0: p.x, y0: p.y, t0: u.t0, sy: u.sy, moved: true }; return }
    if (p.y < M.RH && p.x >= M.NW) { u.drag = { kind: 'scrub' }; scrub(p.x); return }
    if (p.x < M.NW) { u.drag = { kind: 'pan', x0: p.x, y0: p.y, t0: u.t0, sy: u.sy, moved: false, name: true, ev: e }; return }
    const k = !isModelRef(curId()) && keyAt(p.x, p.y), fx = !k && fxAt(p.x, p.y)
    if (fx) { A.select([fx.id]); u.drag = { kind: 'fx', id: fx.id, mode: fx.mode, f: fx.f, x0: p.x, dt: 0, moved: false }; draw(); return }
    if (k) {
      const all = k.refs.every(r => S.sel.has(r))
      if (e.shiftKey || e.ctrlKey || e.metaKey) { if (all) k.refs.forEach(r => S.sel.delete(r)); else k.refs.forEach(r => S.sel.add(r)) }
      else if (!all) { S.sel.clear(); k.refs.forEach(r => S.sel.add(r)) }
      u.drag = { kind: 'move', x0: p.x, dt: 0, moved: false }
      if (touch) { const cx = e.clientX, cy = e.clientY; lp = setTimeout(() => { if (u.drag?.kind === 'move' && !u.drag.moved) { u.drag = null; draw(); keyMenu(cx, cy) } }, 500) }
      draw()
      return
    }
    if (touch) {
      u.drag = { kind: 'pan', x0: p.x, y0: p.y, t0: u.t0, sy: u.sy, moved: false }
      const cx = e.clientX, cy = e.clientY
      lp = setTimeout(() => { if (u.drag?.kind === 'pan' && !u.drag.moved) { u.drag = null; keyMenu(cx, cy) } }, 500)
      return
    }
    u.drag = { kind: 'box', x0: p.x, y0: p.y, x1: p.x, y1: p.y, base: e.shiftKey || e.ctrlKey || e.metaKey ? new Set(S.sel) : new Set() }
    boxPick(u.drag); draw()
  }
  const move = e => {
    const p = pos(e)
    if (pts.has(e.pointerId)) pts.set(e.pointerId, p)
    const d = u.drag
    if (!d) { if (e.pointerType === 'mouse') { const M = metrics(); cv.style.cursor = p.y < M.RH && p.x > M.NW ? 'col-resize' : keyAt(p.x, p.y) ? 'ew-resize' : 'default' } return }
    if (d.kind === 'pinch') {
      if (pts.size < 2) return
      const [a, b] = [...pts.values()]
      u.pps = Math.max(2, Math.min(6000, d.pps0 * (Math.abs(a.x - b.x) + 1) / d.d0))
      u.t0 = Math.max(0, d.tc - (d.cx - metrics().NW - metrics().PAD) / u.pps); u.zoomed = true
      draw(); return
    }
    if (d.kind === 'scrub') return scrub(p.x)
    if (d.kind === 'fx') { const dx = p.x - d.x0; if (Math.abs(dx) > 3) d.moved = true; d.dt = d.moved ? Math.round(dx / u.pps * curFps()) / curFps() : 0; draw(); return }
    if (d.kind === 'move') {
      const dx = p.x - d.x0
      if (Math.abs(dx) > 3) { d.moved = true; clearTimeout(lp) }
      d.dt = d.moved ? Math.round(dx / u.pps * curFps()) / curFps() : 0
      draw(); return
    }
    if (d.kind === 'box') { d.x1 = p.x; d.y1 = p.y; boxPick(d); draw(); return }
    if (d.kind === 'pan') {
      const dx = p.x - d.x0, dy = p.y - d.y0
      if (!d.moved && Math.hypot(dx, dy) > 6) { d.moved = true; clearTimeout(lp) }
      if (!d.moved) return
      if (!d.name) { u.t0 = Math.max(0, d.t0 - dx / u.pps); u.zoomed = true }
      u.sy = clampScroll(d.sy - dy)
      draw()
    }
  }
  const up = e => {
    pts.delete(e.pointerId)
    clearTimeout(lp)
    const d = u.drag
    if (!d) return
    if (d.kind === 'pinch') { if (!pts.size) u.drag = null; return }
    u.drag = null
    if (e.type === 'pointerup') {
      if (d.kind === 'move' && d.dt) { A.exec('anim.moveKeys', { dt: d.dt }); return }
      if (d.kind === 'fx' && d.dt) {
        const t0 = Math.max(0, d.f.t0 + (d.mode === 'move' ? d.dt : 0)), len = Math.max(1 / curFps(), d.f.t1 - d.f.t0 + (d.mode === 'len' ? d.dt : 0))
        A.exec('vfx.time', { id: d.id, start: r4(t0), span: r4(len) }); return
      }
      if (d.kind === 'pan' && !d.moved) { if (d.name) nameClick(pos(e), d.ev); else { S.sel.clear() } }
    }
    draw()
  }
  const ctx = e => {
    e.preventDefault()
    if (e.pointerType && e.pointerType !== 'mouse') return
    const p = pos(e), k = !isModelRef(curId()) && p.x >= metrics().NW && keyAt(p.x, p.y)
    if (k && !k.refs.every(r => S.sel.has(r))) { S.sel.clear(); k.refs.forEach(r => S.sel.add(r)); draw() }
    keyMenu(e.clientX, e.clientY)
  }
  const wheel = e => {
    e.preventDefault()
    const p = pos(e), M = metrics()
    if (e.ctrlKey || e.metaKey) { const t = xt(p.x); u.pps = Math.max(2, Math.min(6000, u.pps * Math.exp(-e.deltaY * 0.0015))); u.t0 = Math.max(0, t - (p.x - M.NW - M.PAD) / u.pps); u.zoomed = true }
    else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { u.t0 = Math.max(0, u.t0 + (e.deltaX || e.deltaY) / u.pps); u.zoomed = true }
    else u.sy = clampScroll(u.sy + e.deltaY)
    draw()
  }
  cv.addEventListener('pointerdown', down)
  cv.addEventListener('pointermove', move)
  cv.addEventListener('pointerup', up)
  cv.addEventListener('pointercancel', up)
  cv.addEventListener('contextmenu', ctx)
  cv.addEventListener('wheel', wheel, { passive: false })
  cv.addEventListener('dblclick', () => { u.zoomed = false; fit(); draw() })
  return () => { clearTimeout(lp) }
}
function buildBar(u, ph) {
  const bar = u.bar, run = (id, a) => () => A.exec(id, a)
  const sel = u.sel = h('select', 'inp an-clip')
  sel.title = 'Clip'
  sel.onchange = () => { if (sel.value) A.exec('anim.select', { id: sel.value }) }
  const b = (name, title, fn, cls = '') => { const x = h('button', 'ib an-ib ' + cls, ic(name)); x.type = 'button'; x.title = title; x.setAttribute('aria-label', title); x.onclick = fn; return x }
  u.add = b('an-plus', 'New clip', run('anim.new'))
  u.ren = b('an-edit', 'Rename clip', run('anim.rename'))
  u.dup = b('an-dup', 'Duplicate clip', run('anim.duplicate'))
  u.del = b('an-trash', 'Delete clip', run('anim.delete'))
  u.loop = b('an-loop', 'Loop', run('anim.loop'))
  u.start = b('an-start', 'Jump to start (Shift+Left)', run('anim.start'))
  u.prev = b('an-prev', 'Previous key (Down)', run('anim.prevKey'))
  u.play = b('an-play', 'Play (Space)', run('anim.play'), 'an-playb')
  u.stop = b('an-stop', 'Stop', run('anim.stop'))
  u.next = b('an-next', 'Next key (Up)', run('anim.nextKey'))
  u.end = b('an-end', 'Jump to end (Shift+Right)', run('anim.end'))
  u.key = b('an-key', 'Key selected (K)', run('anim.key'))
  u.rec = b('an-rec', 'Auto-key: moves in Animate mode record keys', run('anim.autokey'), 'an-rec')
  u.cam = b('camera', 'Key camera: the current view becomes a camera key at the playhead', run('anim.camKey'))
  u.time = h('div', 'an-time')
  const sep = () => h('div', 'an-sep'), grow = () => h('div', 'an-grow')
  if (ph) {
    u.pre = b('an-wand', 'Presets', e => presetMenu(e.currentTarget))
    u.more = b('an-more', 'Clip options', e => clipMenu(e.currentTarget))
    const r1 = h('div', 'an-row'), r2 = h('div', 'an-row')
    r1.append(sel, u.time, u.add, u.more)
    u.fx = b('an-fx', 'Effects: drag one onto a row', run('vfx.library'))
    r2.append(u.start, u.prev, u.play, u.next, u.key, u.rec, u.cam, u.pre, u.fx)
    bar.append(r1, r2)
    return
  }
  const num = (label, title, key, step) => {
    const w = h('label', 'an-f'), i = h('input', 'inp num mono')
    w.title = title; i.type = 'number'; i.step = step; i.min = key === 'fps' ? '1' : '0.05'
    i.onchange = () => { const v = parseFloat(i.value); if (Number.isFinite(v)) A.exec('anim.set', { [key]: v }) }
    i.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') i.blur() }
    w.append(h('span', '', label), i)
    return [w, i]
  }
  const [lw, li] = num('Length', 'Clip length in seconds', 'len', '0.1')
  const [fw, fi] = num('FPS', 'Frames per second', 'fps', '1')
  u.len = li; u.fps = fi
  u.speed = h('select', 'inp an-speed')
  u.speed.title = 'Playback speed'
  for (const v of [0.25, 0.5, 1, 1.5, 2]) { const o = h('option', '', v + '×'); o.value = String(v); u.speed.append(o) }
  u.speed.onchange = () => A.exec('anim.speed', { speed: +u.speed.value })
  const pre = h('button', 'btn an-txt', ic('an-wand') + '<span>Presets</span>')
  pre.type = 'button'; pre.onclick = () => presetMenu(pre)
  const fxb = h('button', 'btn an-txt', ic('an-fx') + '<span>Effects</span>')
  fxb.type = 'button'; fxb.title = 'Effects: drag one onto a row'; fxb.onclick = () => A.exec('vfx.library')
  bar.append(sel, u.add, u.ren, u.dup, u.del, sep(), lw, fw, u.loop, grow(), u.start, u.prev, u.play, u.stop, u.next, u.end, u.speed, grow(), u.time, sep(), u.key, u.rec, u.cam, sep(), pre, fxb)
}
function renderPanel(el) {
  const ph = isPhone()
  el.innerHTML = ''
  const root = h('div', 'an-root' + (ph ? ' an-phone' : '')), bar = h('div', 'an-bar'), body = h('div', 'an-body'), cv = h('canvas', 'an-cv')
  body.append(cv); root.append(bar, body); el.append(root)
  const u = S.ui = { el, root, bar, body, cv, g: cv.getContext('2d'), w: 0, h: 0, dpr: 1, t0: 0, pps: 100, sy: 0, zoomed: false, col: readColors(), sig: '', drag: null }
  buildBar(u, ph)
  S.rows = null
  let ro = null
  try { ro = new ResizeObserver(() => { resize(); draw() }); ro.observe(body) } catch {}
  const off = bindCanvas(u)
  resize(); syncBar(); draw()
  return () => { ro?.disconnect(); off(); if (S.ui === u) S.ui = null }
}
function refreshPanel(el, app, ev) {
  if (!S.ui || S.ui.el !== el) return
  if (ev?.type === 'time') { updateTime(); draw(); return }
  if (ev?.type === 'project') { S.ui.zoomed = false; S.ui.col = readColors() }
  S.rows = null
  syncBar()
  if (!S.ui.zoomed) fit()
  draw()
}

// ---------- commands ----------
const needClip = () => { const c = cur(); if (!c) throw new Error('No clip: make one first'); return c }
function clipSet(app, id, c, a) {
  const next = clone(c)
  if (a.name != null && String(a.name).trim()) next.name = String(a.name).trim().slice(0, 60)
  if (a.len != null) { const v = +a.len; if (!(v > 0)) throw new Error('Length must be above 0'); next.len = r4(Math.min(600, Math.max(1 / fpsOf(next), v))) }
  if (a.fps != null) { const v = Math.round(+a.fps); if (!(v >= 1)) throw new Error('FPS must be 1 or more'); next.fps = Math.min(240, v) }
  if (a.loop != null) next.loop = !!a.loop
  app.putAnim(id, next)
}
const KEYS = { pos: 1, rot: 1, scale: 1, color: 1, visible: 1 }
const commands = {
  'anim.mode': { label: 'Animate mode', icon: 'an-mode', noUndo: true, run: app => app.setMode('animate') },
  'anim.new': {
    label: 'New clip', icon: 'an-plus',
    run(app, a = {}) {
      const id = a.id && !anims()[a.id] ? String(a.id) : freshId()
      app.putAnim(id, { name: a.name || 'Clip ' + (Object.keys(anims()).length + 1), len: +a.len > 0 ? +a.len : 2, fps: +a.fps >= 1 ? Math.round(+a.fps) : 30, loop: a.loop !== false, tracks: {} })
      S.clip = id; S.sel.clear()
      if (app.mode !== 'animate' && a.mode !== false) app.setMode?.('animate')
      app.setTime(0)
      return id
    }
  },
  'anim.rename': {
    label: 'Rename clip', icon: 'an-edit', enabled: () => !!cur(),
    async run(app, a = {}) {
      const id = a.id || curId(), c = anims()[id]
      if (!c) throw new Error('No clip')
      const name = a.name ?? await app.ui.prompt('Rename clip', c.name || id, { label: 'Name', ok: 'Rename' })
      if (!name || !String(name).trim()) return null
      app.transact('Rename clip', () => clipSet(app, id, anims()[id], { name }))
      return id
    }
  },
  'anim.duplicate': {
    label: 'Duplicate clip', icon: 'an-dup', enabled: () => !!cur(),
    run(app, a = {}) {
      const src = a.id || curId(), c = anims()[src]
      if (!c) throw new Error('No clip')
      const id = freshId(), next = clone(c)
      next.name = (c.name || src) + ' copy'
      app.putAnim(id, next)
      S.clip = id; S.sel.clear()
      return id
    }
  },
  'anim.delete': {
    label: 'Delete clip', icon: 'an-trash', enabled: () => !!cur(),
    run(app, a = {}) {
      const id = a.id || curId()
      if (!anims()[id]) throw new Error('No clip')
      app.putAnim(id, null)
      if (S.clip === id) S.clip = null
      S.sel.clear()
      return id
    }
  },
  'anim.select': {
    label: 'Choose clip', icon: 'an-clip', noUndo: true, hidden: true,
    run(app, a = {}) {
      const id = a.id
      if (!anims()[id] && !(isModelRef(id) && modelClip(id))) throw new Error('No such clip: ' + id)
      pause(); S.clip = id; S.sel.clear()
      if (S.ui) S.ui.zoomed = false
      if ((app.time || 0) > curLen()) app.setTime(0)
      evaluate(); syncUI()
      return id
    }
  },
  'anim.set': {
    label: 'Clip settings', icon: 'an-clip', enabled: () => !!cur(),
    async run(app, a = {}) {
      const id = a.id || curId(), c = anims()[id]
      if (!c) throw new Error('No clip')
      if (['name', 'len', 'fps', 'loop'].some(k => a[k] != null)) { clipSet(app, id, c, a); return id }
      const v = await app.ui.form({ title: 'Clip settings', ok: 'Apply', fields: [
        { key: 'name', label: 'Name', type: 'text', value: c.name || id },
        { key: 'len', label: 'Length (seconds)', type: 'number', value: lenOf(c) },
        { key: 'fps', label: 'Frames per second', type: 'number', value: fpsOf(c) },
        { key: 'loop', label: 'Loop', type: 'checkbox', value: c.loop !== false }
      ] })
      if (!v) return null
      app.transact('Clip settings', () => clipSet(app, id, anims()[id], v))
      return id
    }
  },
  'anim.loop': { label: 'Loop clip', icon: 'an-loop', enabled: () => !!cur(), checked: () => !!cur() && cur().loop !== false, run: app => { const c = needClip(); clipSet(app, curId(), c, { loop: c.loop === false }); return c.loop === false } },
  'anim.play': { label: 'Play / pause', icon: 'an-play', key: 'Space', mode: 'animate', noUndo: true, checked: () => S.playing, run: () => { S.playing ? pause() : play(); return S.playing } },
  'anim.pause': { label: 'Pause', icon: 'an-pause', noUndo: true, run: () => { pause(); return false } },
  'anim.stop': { label: 'Stop', icon: 'an-stop', noUndo: true, run: () => { stop(); return 0 } },
  'anim.start': { label: 'Jump to start', icon: 'an-start', key: 'Shift+ArrowLeft', mode: 'animate', noUndo: true, run: app => { pause(); app.setTime(0); return 0 } },
  'anim.end': { label: 'Jump to end', icon: 'an-end', key: 'Shift+ArrowRight', mode: 'animate', noUndo: true, run: app => { pause(); app.setTime(curLen()); return app.time } },
  'anim.prevKey': { label: 'Previous key', icon: 'an-prev', key: 'ArrowDown', mode: 'animate', noUndo: true, run: app => { pause(); const t = keyTimes().reverse().find(x => x < (app.time || 0) - 1e-4); if (t != null) app.setTime(t); return app.time } },
  'anim.nextKey': { label: 'Next key', icon: 'an-next', key: 'ArrowUp', mode: 'animate', noUndo: true, run: app => { pause(); const t = keyTimes().find(x => x > (app.time || 0) + 1e-4); if (t != null) app.setTime(t); return app.time } },
  'anim.prevFrame': { label: 'Previous frame', icon: 'an-prev', key: 'ArrowLeft', mode: 'animate', noUndo: true, run: app => { pause(); app.setTime(Math.max(0, snap((app.time || 0) - 1 / curFps()))); return app.time } },
  'anim.nextFrame': { label: 'Next frame', icon: 'an-next', key: 'ArrowRight', mode: 'animate', noUndo: true, run: app => { pause(); app.setTime(Math.min(curLen(), snap((app.time || 0) + 1 / curFps()))); return app.time } },
  'anim.time': {
    label: 'Go to frame', icon: 'an-clip', noUndo: true,
    async run(app, a = {}) {
      let t = a.t != null ? +a.t : a.frame != null ? +a.frame / curFps() : null
      if (t == null) { const f = await app.ui.prompt('Go to frame', String(Math.round((app.time || 0) * curFps())), { label: 'Frame', ok: 'Go' }); if (f == null) return app.time; t = +f / curFps() }
      if (!Number.isFinite(t)) throw new Error('Time must be a number')
      pause(); app.setTime(Math.max(0, t))
      return app.time
    }
  },
  'anim.speed': { label: 'Playback speed', icon: 'an-play', noUndo: true, run: (app, a = {}) => { const v = +a.speed; S.speed = v > 0 ? Math.min(8, v) : S.speed >= 2 ? 0.5 : S.speed * 2; syncUI(); return S.speed } },
  'anim.key': {
    label: 'Key selected', icon: 'an-key', key: 'K', mode: 'animate',
    run(app, a = {}) {
      if (isModelRef(curId())) throw new Error('Imported clips are read-only')
      const ids = (a.ids || [...(app.selection || [])]).filter(id => app.obj(id) && !app.isLocked?.(id))
      if (!ids.length) throw new Error('Select objects to key')
      const { id, c } = ensureClip(app)
      const t = snap(a.t ?? app.time ?? 0, fpsOf(c)), next = clone(c)
      for (const oid of ids) {
        const tr = c.tracks?.[oid] || {}
        const chs = a.channels || [...new Set([...XF, ...Object.keys(tr).filter(k => KEYS[k])])]
        for (const ch of chs) if (KEYS[ch]) setKeyIn(next, oid, ch, t, a.values?.[ch] ?? posedVal(c, oid, ch, t))
      }
      app.putAnim(id, next)
      return ids.length
    }
  },
  'anim.setKey': {
    label: 'Set key', icon: 'an-key',
    run(app, a = {}) {
      if (!app.obj(a.id)) throw new Error('Set key needs {id, ch, t, value}')
      if (!KEYS[a.ch]) throw new Error('Channel must be pos, rot, scale, color or visible')
      if (a.ease && !isEase(a.ease)) throw new Error('Unknown easing: ' + a.ease)
      const { id, c } = ensureClip(app), next = clone(c), t = snap(+a.t || 0, fpsOf(c))
      setKeyIn(next, a.id, a.ch, t, a.value ?? posedVal(c, a.id, a.ch, t), a.ease)
      app.putAnim(id, next)
      return t
    }
  },
  'anim.camKey': {
    label: 'Key camera', icon: 'camera', mode: 'animate',
    run(app, a = {}) {
      if (isModelRef(curId())) throw new Error('Imported clips are read-only')
      const vp = app.viewport, { id, c } = ensureClip(app)
      const t = snap(a.t ?? app.time ?? 0, fpsOf(c)), v = { ...(vp?.getCamera?.() || {}), ...(a.values || {}) }, next = clone(c), e = a.ease || 'smooth'
      const cam = next.camera ||= {}
      const put = (ch, val) => { const ks = (cam[ch] ||= []).filter(k => Math.abs(k[0] - t) > 1e-4); ks.push([t, val, e]); ks.sort((p, q) => p[0] - q[0]); cam[ch] = ks }
      for (const ch of a.channels || ['pos', 'target', 'fov', ...(a.values?.shake != null ? ['shake'] : [])]) if (v[ch] != null) put(ch, v[ch])
      app.putAnim(id, next)
      return t
    }
  },
  'anim.camClear': {
    label: 'Clear camera keys', icon: 'camera', enabled: () => !!cur()?.camera,
    run(app) { const id = curId(), c = anims()[id]; if (!c?.camera) return 0; const next = clone(c); delete next.camera; app.putAnim(id, next); return 1 }
  },
  'anim.camFollow': {
    label: 'Follow clip camera', icon: 'camera', noUndo: true, checked: () => S.camFollow,
    run: (app, a = {}) => { S.camFollow = a.on != null ? !!a.on : !S.camFollow; evaluate(); return S.camFollow }
  },
  // Two-bone IK (2026-11-24): place a hand/foot/blade by its world target; the bend side comes from the pole. Keys upper + lower.
  'anim.ik': {
    label: 'IK: place a limb', icon: 'an-key', mode: 'animate',
    run(app, a = {}) {
      const [ua, la, ea] = a.chain || [], vp = app.viewport, O = id => vp.objects.get(id)
      if (![ua, la, ea].every(id => O(id))) throw new Error('anim.ik needs chain: [upper, lower, end] object ids')
      const { id, c } = ensureClip(app), t = snap(a.t ?? app.time ?? 0, fpsOf(c)), next = clone(c)
      app.setTime?.(t); evaluate(t, true)
      const U = O(ua), L = O(la), E = O(ea), W = o => { o.updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld) }
      const pa = W(U), pb = W(L), pc = W(E), T = new THREE.Vector3(...a.target), l1 = pa.distanceTo(pb), l2 = pb.distanceTo(pc)
      let d = pa.distanceTo(T); const reach = d <= l1 + l2 - 1e-4 && d >= Math.abs(l1 - l2) + 1e-4
      d = Math.min(Math.max(d, Math.abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4)
      const u = T.clone().sub(pa).normalize(), pole = a.pole ? new THREE.Vector3(...a.pole) : pb.clone()
      let nrm = pole.clone().sub(pa); nrm.sub(u.clone().multiplyScalar(nrm.dot(u)))
      if (nrm.lengthSq() < 1e-9) nrm.set(0, 1, 0).sub(u.clone().multiplyScalar(u.y)); nrm.normalize()
      const cosA = Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))), elbow = pa.clone().add(u.multiplyScalar(l1 * cosA)).add(nrm.multiplyScalar(l1 * Math.sqrt(1 - cosA * cosA)))
      const aim = (o, from, to, dst) => {          // turn o (world) so the from->to bone points at dst, then store as its local rotation
        const q = new THREE.Quaternion().setFromUnitVectors(to.clone().sub(from).normalize(), dst.clone().sub(from).normalize())
        const wq = o.getWorldQuaternion(new THREE.Quaternion()), pq = o.parent ? o.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion()
        o.quaternion.copy(pq.invert().multiply(q.multiply(wq))); o.updateMatrixWorld(true)
      }
      aim(U, pa, pb, elbow); aim(L, W(L), W(E), T)
      const deg = o => { const e = new THREE.Euler().setFromQuaternion(o.quaternion, 'XYZ'); return [e.x / D2R, e.y / D2R, e.z / D2R] }
      setKeyIn(next, ua, 'rot', t, deg(U), a.ease); setKeyIn(next, la, 'rot', t, deg(L), a.ease)
      app.putAnim(id, next); evaluate(t, true)
      return { reached: reach, miss: +W(E).distanceTo(new THREE.Vector3(...a.target)).toFixed(4) }
    }
  },
  // Mirror a pose Left <-> Right by object name at t (rot [x,-y,-z], pos [-x,y,z] in the joint's own frame).
  'anim.mirror': {
    label: 'Mirror pose L/R', icon: 'an-key', mode: 'animate',
    run(app, a = {}) {
      const { id, c } = ensureClip(app), t = snap(a.t ?? app.time ?? 0, fpsOf(c)), next = clone(c), objs = app.scene.objects
      const byName = new Map(Object.entries(objs).map(([k, o]) => [o.name, k])), from = a.from || 'Left', to = from === 'Left' ? 'Right' : 'Left'
      let n = 0
      for (const [k, o] of Object.entries(objs)) {
        if (!o.name?.includes(from)) continue
        const dst = byName.get(o.name.replace(from, to)); if (!dst) continue
        const r = posedVal(c, k, 'rot', t), p = c.tracks?.[k]?.pos?.length ? posedVal(c, k, 'pos', t) : null
        setKeyIn(next, dst, 'rot', t, [r[0], -r[1], -r[2]]); if (p) setKeyIn(next, dst, 'pos', t, [-p[0], p[1], p[2]]); n++
      }
      app.putAnim(id, next); return n
    }
  },
  // Cinematic baseline (2026-11-24, owner refs measured frame by frame): one call adds the eased push-in, suspense slow-mo,
  // dark dip + white flash, hit-stop, decaying shake and settling pull-back (impact/burst) or a seamless orbit (loop).
  // Re-running replaces the previous pass; {off: true} restores the clip's own camera, warp and length.
  'anim.cine': {
    label: 'Cinematic pass', icon: 'camera', enabled: () => !!cur() && !isModelRef(curId()),
    run(app, a = {}) {
      const id = a.id || curId(), c = anims()[id]
      if (!c) throw new Error('Pick a clip first')
      if (isModelRef(id)) throw new Error('Imported clips are read-only')
      const next = cinePass(c, a, app.viewport?.getCamera?.() || {})
      app.putAnim(id, next); evaluate()
      return next.cine ? { kind: next.cine.kind, len: next.len, warp: next.cine.warp } : 0
    }
  },
  // Lint the current clip (read-only): the faults the 2026-11-24 duel critique found by hand, found in one call.
  'anim.lint': {
    label: 'Lint animation', icon: 'an-key', noUndo: true,
    run(app, a = {}) {
      const c = a.id ? anims()[a.id] : cur(); if (!c) return []
      const out = [], fps = fpsOf(c), len = lenOf(c), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(), e = new THREE.Euler()
      const quat = (q, r) => q.setFromEuler(e.set(r[0] * D2R, r[1] * D2R, r[2] * D2R))
      for (const [oid, tr] of Object.entries(c.tracks || {})) {
        const ks = tr.rot || []
        for (let i = 1; i < ks.length; i++) { const dv = Math.max(...ks[i][1].map((v, j) => Math.abs(v - ks[i - 1][1][j]))); if (dv > 120 && dv < 180) out.push({ type: 'euler-jump', id: oid, t: ks[i][0], value: +dv.toFixed(1) }) }
        if (ks.length >= 4 && ks.slice(0, -1).every(k => !k[2] || k[2] === 'smooth' || k[2] === 'linear')) out.push({ type: 'robotic', id: oid, t: ks[0][0], value: ks.length })
        if (ks.length > 1) { let last = -1
          for (let i = 1; i <= Math.round(len * fps); i++) {
            const t0 = storyAt(c, (i - 1) / fps), t1 = storyAt(c, i / fps), ang = quat(q0, sample(ks, t0, 'rot')).angleTo(quat(q1, sample(ks, t1, 'rot'))) / D2R
            if (ang > 60 && i / fps - last > 0.25) { last = i / fps; out.push({ type: 'pose-snap', id: oid, t: +(i / fps).toFixed(3), value: +ang.toFixed(1) }) }
          } }
      }
      // Baseline faults (2026-11-24, domains/animation/cinematic-baseline.md): motion that brakes to 0 mid-move, a camera
      // that stops at every key or never moves, a hit with no payoff, a loop that pops at the seam.
      const brakeEnd = e => e === 'smooth' || e === 'ease' || e === 'out', brakeStart = e => e === 'smooth' || e === 'ease' || e === 'in'
      for (const [oid, tr] of Object.entries(c.tracks || {})) for (const ch of ['pos', 'rot']) {
        const ks = tr[ch] || []
        for (let i = 1; i < ks.length - 1; i++) {
          const d1 = ks[i][1].map((v, j) => v - ks[i - 1][1][j]), d2 = ks[i + 1][1].map((v, j) => v - ks[i][1][j])
          const n1 = Math.hypot(...d1), n2 = Math.hypot(...d2), cos = n1 > 1e-3 && n2 > 1e-3 ? d1.reduce((s, v, j) => s + v * d2[j], 0) / (n1 * n2) : 0
          if (cos > 0.7 && brakeEnd(ks[i - 1][2]) && brakeStart(ks[i][2])) out.push({ type: 'motion-stop', id: oid, t: ks[i][0], value: ch })
        }
      }
      const cm = c.camera || {}
      for (const ch of ['pos', 'target', 'fov']) { const ks = cm[ch] || []
        if (ks.length >= 3 && ks.slice(0, -1).every(k => !k[2] || k[2] === 'linear' || k[2] === 'smooth')) out.push({ type: 'camera-robotic', id: 'camera', t: ks[0][0], value: ch }) }
      if (len >= 3 && Object.keys(c.tracks || {}).length && !cm.pos?.length && !cm.target?.length && !cm.fov?.length) out.push({ type: 'static-camera', id: 'camera', t: 0, value: len })
      const shk = cm.shake || [], top = Math.max(0, ...shk.map(k => +k[1]))
      for (let i = 0; i < shk.length; i++) { const v = +shk[i][1]
        if (v > 0 && v >= 0.5 * top && v >= +(shk[i - 1]?.[1] ?? 0) && v >= +(shk[i + 1]?.[1] ?? 0) && !(cm.flash || []).some(f => +f[1] > 0.3 && Math.abs(f[0] - shk[i][0]) <= 0.2)) out.push({ type: 'payoff-flat', id: 'camera', t: shk[i][0], value: v }) }
      if (c.loop !== false) {
        const s0 = storyAt(c, 0), s1 = storyAt(c, len), tol = { pos: 0.02, rot: 2, target: 0.02 }
        const gap = (ks, ch) => Math.max(...sample(ks, s0, ch).map((v, j) => Math.abs(v - sample(ks, s1, ch)[j])))
        for (const [oid, tr] of Object.entries(c.tracks || {})) for (const ch of ['pos', 'rot']) if (tr[ch]?.length > 1) { const g = gap(tr[ch], ch); if (g > tol[ch]) { out.push({ type: 'loop-seam', id: oid, t: len, value: +g.toFixed(3) }); break } }
        for (const ch of ['pos', 'target']) if (cm[ch]?.length > 1) { const g = gap(cm[ch], 'pos'); if (g > tol[ch]) out.push({ type: 'loop-seam', id: 'camera', t: len, value: +g.toFixed(3) }) }
      }
      const sig = t => JSON.stringify(Object.values(c.tracks || {}).map(tr => Object.entries(tr).map(([ch, k]) => k?.length ? sample(k, storyAt(c, t), ch) : 0)))
      let runStart = 0, prev = sig(0)
      for (let t = 0.1; t <= len + 1e-6; t += 0.1) { const s = sig(t); if (s !== prev) { if (t - 0.1 - runStart > 2) out.push({ type: 'dead-hold', id: '*', t: +runStart.toFixed(2), value: +(t - 0.1 - runStart).toFixed(2) }); runStart = t; prev = s } }
      if (len - runStart > 2 && c.loop === false) out.push({ type: 'dead-hold', id: '*', t: +runStart.toFixed(2), value: +(len - runStart).toFixed(2) })
      // Spacing + framing (2026-11-24, owner: "spacing"): rig roots (top-level objects with pos keys) closer than 0.8x reach
      // clip into each other; farther than 3x reach for > 1 s is dead air in a fight. The action (roots' midpoint + a.chest
      // studs up, default 0) outside the centre 60 % of a 16:9 frame for > 0.3 s is lost off-frame. reach = a.reach (default 2.2 studs).
      const roots = Object.entries(c.tracks || {}).filter(([oid, tr]) => tr.pos?.length && !A?.obj?.(oid)?.parent).map(([oid, tr]) => [oid, tr.pos])
      const reach = +a.reach || 2.2, chest = +a.chest || 0, step = 0.1, pc = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1e4), v3 = new THREE.Vector3()
      for (let i = 0; i < roots.length; i++) for (let j = i + 1; j < roots.length; j++) { let near = -1, far = -1
        for (let t = 0; t <= len + 1e-6; t += step) { const st = storyAt(c, t), p = sample(roots[i][1], st, 'pos'), q = sample(roots[j][1], st, 'pos'), d = Math.hypot(p[0] - q[0], p[2] - q[2])
          if (d < 0.8 * reach) { if (near < 0) { near = t; out.push({ type: 'spacing-close', id: roots[i][0] + '|' + roots[j][0], t: +t.toFixed(2), value: +d.toFixed(2) }) } } else near = -1
          if (d > 3 * reach) { if (far === -1) far = t; else if (far >= 0 && t - far > 1) { out.push({ type: 'spacing-far', id: roots[i][0] + '|' + roots[j][0], t: +far.toFixed(2), value: +d.toFixed(2) }); far = -2 } } else far = -1 } }
      if (roots.length && (cm.pos?.length || cm.target?.length)) { let off = -1
        for (let t = 0; t <= len + 1e-6; t += step) { const st = storyAt(c, t), s = camAt(c, st); if (!s?.pos || !s?.target) continue
          const m = [0, 1, 2].map(k => roots.reduce((n, r) => n + sample(r[1], st, 'pos')[k], 0) / roots.length); m[1] += chest
          pc.fov = s.fov || 50; pc.position.fromArray(s.pos); pc.lookAt(v3.fromArray(s.target)); pc.updateProjectionMatrix(); pc.updateMatrixWorld()
          const n = v3.fromArray(m).project(pc), outside = n.z > 1 || Math.abs(n.x) > 0.6 || Math.abs(n.y) > 0.6
          if (!outside) off = -1; else if (off === -1) off = t; else if (off >= 0 && t - off > 0.3) { out.push({ type: 'framing', id: 'camera', t: +off.toFixed(2), value: +Math.max(Math.abs(n.x), Math.abs(n.y)).toFixed(2) }); off = -2 } } }
      return out
    }
  },
  'anim.autokey': { label: 'Auto-key', icon: 'an-rec', noUndo: true, checked: () => S.autokey, run: (app, a = {}) => { S.autokey = a.on != null ? !!a.on : !S.autokey; syncUI(); return S.autokey } },
  'anim.deleteKeys': {
    label: 'Delete keys', icon: 'an-trash', key: ['Delete', 'Backspace'], mode: 'animate', enabled: (app, a) => !!cur() && (a.keys ? true : inMode() && S.sel.size > 0),
    run(app, a = {}) {
      const c = needClip(), refs = refsOf(a), next = clone(c)
      let n = 0
      for (const oid in next.tracks || {}) for (const ch in next.tracks[oid]) { const k0 = next.tracks[oid][ch] || []; const k1 = k0.filter(k => !refs.has(ref(oid, ch, k[0]))); n += k0.length - k1.length; next.tracks[oid][ch] = k1 }
      app.putAnim(curId(), tidy(next))
      S.sel.clear()
      return n
    }
  },
  'anim.copyKeys': {
    label: 'Copy keys', icon: 'an-copy', key: 'Ctrl+C', mode: 'animate', noUndo: true, enabled: () => !!cur() && inMode() && S.sel.size > 0,
    run(app) {
      const items = []
      let t0 = Infinity
      eachKey(cur(), S.sel, (k, oid, ch) => { items.push({ id: oid, ch, t: k[0], v: k[1], e: k[2] }); t0 = Math.min(t0, k[0]) })
      for (const x of items) x.t = r4(x.t - t0)
      S.clipboard = items
      app.toast(`Copied ${items.length} key${items.length === 1 ? '' : 's'}`)
      return items.length
    }
  },
  'anim.pasteKeys': {
    label: 'Paste keys', icon: 'an-paste', key: 'Ctrl+V', mode: 'animate', enabled: () => inMode() && !!S.clipboard?.length && !isModelRef(curId()),
    run(app, a = {}) {
      const items = S.clipboard
      if (!items?.length) throw new Error('Copy keys first')
      const { id, c } = ensureClip(app), next = clone(c), fps = fpsOf(c), t0 = snap(a.t ?? app.time ?? 0, fps)
      const src = [...new Set(items.map(x => x.id))], sel = [...(app.selection || [])].filter(x => app.obj(x))
      const map = src.length === 1 && sel.length === 1 ? { [src[0]]: sel[0] } : {}
      S.sel.clear()
      let n = 0
      for (const x of items) {
        const oid = map[x.id] || x.id
        if (!app.obj(oid)) continue
        const t = snap(t0 + x.t, fps)
        setKeyIn(next, oid, x.ch, t, x.v, x.e ?? null)
        S.sel.add(ref(oid, x.ch, t)); n++
      }
      app.putAnim(id, next)
      return n
    }
  },
  'anim.ease': {
    label: 'Set easing', icon: 'an-ease', enabled: (app, a) => !!cur() && refsOf(a).size > 0,
    run(app, a = {}) {
      if (!a.ease) { keyMenu(innerWidth / 2, innerHeight / 2); return null }
      if (!isEase(a.ease)) throw new Error('Easing must be one of ' + EASES.join(', ') + ', auto or cubic:x1,y1,x2,y2')
      const c = needClip(), next = clone(c)
      let n = 0
      eachKey(next, refsOf(a), (k, oid, ch, i) => { next.tracks[oid][ch][i] = mk(k[0], k[1], a.ease); n++ })
      app.putAnim(curId(), next)
      return n
    }
  },
  'anim.moveKeys': {
    label: 'Move keys', icon: 'an-key', hidden: true, enabled: (app, a) => !!cur() && refsOf(a).size > 0,
    run(app, a = {}) {
      const c = needClip(), refs = refsOf(a), fps = fpsOf(c), len = lenOf(c), dt = +a.dt || 0
      if (!dt) return 0
      const next = clone(c), nsel = new Set()
      for (const oid in next.tracks || {}) for (const ch in next.tracks[oid]) {
        const keys = next.tracks[oid][ch] || [], mv = [], stay = []
        for (const k of keys) (refs.has(ref(oid, ch, k[0])) ? mv : stay).push(k)
        if (!mv.length) continue
        for (const k of mv) { k[0] = Math.max(0, Math.min(len, snap(k[0] + dt, fps))); nsel.add(ref(oid, ch, k[0])) }
        const out = stay.filter(k => !mv.some(m => Math.abs(m[0] - k[0]) < 1e-4)).concat(mv).sort((x, y) => x[0] - y[0])
        next.tracks[oid][ch] = out.filter((k, i) => i === out.length - 1 || Math.abs(out[i + 1][0] - k[0]) > 1e-4)
      }
      app.putAnim(curId(), next)
      S.sel = nsel
      return nsel.size
    }
  },
  'anim.selectKeys': {
    label: 'Select keys', icon: 'an-key', noUndo: true, hidden: true,
    run(app, a = {}) {
      S.sel.clear()
      const c = cur()
      if (a.keys) for (const k of a.keys) S.sel.add(ref(k.id, k.ch, k.t))
      else if (a.all || a.ids || a.t != null) for (const oid in c?.tracks || {}) {
        if (a.ids && !a.ids.includes(oid)) continue
        for (const ch in c.tracks[oid]) for (const k of c.tracks[oid][ch] || []) if (a.t == null || Math.abs(k[0] - a.t) < 1e-4) S.sel.add(ref(oid, ch, k[0]))
      }
      draw()
      return S.sel.size
    }
  },
  'anim.clear': {
    label: 'Clear animation of selected', icon: 'an-trash', enabled: app => !!cur() && [...(app.selection || [])].some(id => cur().tracks?.[id]),
    run(app, a = {}) {
      const c = needClip(), next = clone(c), ids = a.ids || [...(app.selection || [])]
      for (const id of ids) delete next.tracks?.[id]
      app.putAnim(curId(), next)
      S.sel.clear()
      return ids.length
    }
  }
}
for (const [k, P] of Object.entries(PRESETS)) commands['anim.' + k] = { label: P.label, icon: P.icon, run: (app, a = {}) => runPreset(app, a, k) }

const CSS = `
.an-root{display:flex;flex-direction:column;height:100%;min-height:190px;background:var(--panel);color:var(--text);font:12px Inter,system-ui,sans-serif;user-select:none;-webkit-user-select:none}
.an-bar{display:flex;align-items:center;gap:4px;padding:4px 8px;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none;flex:none}
.an-bar::-webkit-scrollbar{display:none}
.an-bar>*{flex:none}
.an-sep{width:1px;height:18px;background:var(--line);margin:0 4px}
.an-grow{flex:1 1 auto!important;min-width:6px}
.an-bar .an-clip{width:160px}
.an-bar .an-speed{width:64px}
.an-f{display:flex;align-items:center;gap:5px;color:var(--mute);margin-right:4px}
.an-bar .an-f input{width:56px;text-align:right}
.an-ib.on{color:var(--accent);background:color-mix(in srgb,var(--accent) 18%,transparent)}
.an-ib.an-rec.on{color:var(--danger);background:color-mix(in srgb,var(--danger) 16%,transparent)}
.an-ib.an-rec.on svg *{fill:var(--danger)}
.an-ib.an-playb.on{color:var(--ok);background:color-mix(in srgb,var(--ok) 16%,transparent)}
.an-ib:disabled{opacity:.4;pointer-events:none}
.an-time{font:12px "JetBrains Mono",ui-monospace,monospace;min-width:104px;text-align:center;color:var(--text);white-space:nowrap}
.an-time b{font-weight:500}
.an-time i{font-style:normal;color:var(--mute);margin-left:8px}
.an-txt{display:flex;align-items:center;gap:6px}
.an-body{position:relative;flex:1 1 auto;min-height:0;overflow:hidden}
.an-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none}
.an-phone .an-bar{flex-direction:column;align-items:stretch;overflow:visible;padding:6px max(12px,env(safe-area-inset-right)) 6px max(12px,env(safe-area-inset-left));gap:6px}
.an-phone .an-row{display:flex;align-items:center;gap:4px;justify-content:space-between}
.an-phone .an-ib{width:44px;height:44px;min-width:44px;flex:none}
.an-phone .an-bar .an-clip{flex:1 1 auto;width:auto;min-width:0;height:44px;font-size:14px}
.an-phone .an-time{min-width:86px;font-size:13px}
`

const plugin = {
  id: 'anim', name: 'Animation',
  commands,
  menus: {
    Animate: ['anim.mode', '-', 'anim.new', 'anim.rename', 'anim.duplicate', 'anim.set', 'anim.loop', 'anim.delete', '-',
      'anim.play', 'anim.stop', 'anim.start', 'anim.end', 'anim.prevKey', 'anim.nextKey', 'anim.time', 'anim.speed', '-',
      'anim.key', 'anim.autokey', 'anim.copyKeys', 'anim.pasteKeys', 'anim.deleteKeys', 'anim.clear', '-',
      'anim.camKey', 'anim.camFollow', 'anim.camClear', 'anim.cine', '-', 'anim.ik', 'anim.mirror', 'anim.lint', '-',
      'anim.spin', 'anim.bob', 'anim.bounce', 'anim.pulse', 'anim.walk', 'anim.wave']
  },
  modes: [{ id: 'animate', label: 'Animate', icon: 'an-mode', order: 20, gizmo: true }],
  tools: [],
  panels: [{ id: 'timeline', label: 'Timeline', icon: 'an-clip', mode: 'animate', where: 'bottom', order: 10, render: renderPanel, refresh: refreshPanel }],
  importers: [], exporters: [], types: {},
  init(app) {
    A = app
    try { if (!document.getElementById('pl-anim')) { const st = document.createElement('style'); st.id = 'pl-anim'; st.textContent = CSS; document.head.append(st) } } catch {}
    app.on('time', () => evaluate())
    app.on('change', () => { S.rows = null; pruneSel(); evaluate() })
    app.on('select', () => { S.rows = null })
    app.on('mode', () => { evaluate(); syncUI() })
    app.on('synced', ids => {
      const vp = app.viewport
      for (const id of Array.isArray(ids) ? ids : ids ? [...ids] : []) {
        const o = vp?.objects.get(id)
        if (!o) continue
        delete o.userData.anRest
        for (const m of colorTargets(o)) if (m.userData.anClone && m.material !== m.userData.anClone) { delete m.userData.anClone; delete m.userData.anMat }
      }
      evaluate()
    })
    app.on('project', () => { pause(); stopMix(); S.clip = null; S.sel.clear(); S.posed = new Set(); S.rows = null; S.hint = false })
    app.timelineDrop = (cx, cy) => {
      const u = S.ui
      if (!u?.cv?.isConnected) return null
      const r = u.cv.getBoundingClientRect(), x = cx - r.left, y = cy - r.top, M = metrics()
      if (x < 0 || y < 0 || x > r.width || y > r.height) return null
      const t = x >= M.NW ? Math.max(0, Math.min(curLen(), snap(xt(x)))) : (app.time || 0)
      return { t, id: rowAt(y)?.row?.id || null }
    }
    app.timelineAt = (t, id) => {
      const u = S.ui
      if (!u?.cv) return null
      const r = u.cv.getBoundingClientRect(), M = metrics(), i = (S.rows || buildRows()).findIndex(w => w.id === id && w.kind !== 'ch')
      return i < 0 ? null : { x: r.left + tx(t), y: r.top + M.RH + i * M.ROW - u.sy + M.ROW / 2 }
    }
    app.poseOf = id => {
      const obj = app.obj(id), tr = active() ? cur()?.tracks?.[id] : null
      if (!obj || !tr) return obj
      const out = { ...obj }, t = app.time || 0
      for (const ch of XF) if (tr[ch]?.length) out[ch] = sample(tr[ch], t, ch)
      return out
    }
    app.onTransform = (vals, label) => {
      if (!inMode() || isModelRef(curId())) return false
      if (!S.autokey) {
        if (!S.hint && vals.some(([id]) => cur()?.tracks?.[id])) { S.hint = true; app.toast('Auto-key is off: that moved the rest pose. Turn on Auto-key or press K.', 'info') }
        return false
      }
      app.transact(label || 'Key transform', () => {
        const { id, c } = ensureClip(app), next = clone(c), t = snap(app.time || 0, fpsOf(c))
        for (const [oid, v] of vals) for (const ch of XF) if (v?.[ch]) setKeyIn(next, oid, ch, t, v[ch])
        app.putAnim(id, next)
      })
      return true
    }
    app.anim = {
      toClips, sample, EASE, easeFn, story: t => storyAt(cur(), t ?? app.time ?? 0),
      evaluate: t => evaluate(t ?? app.time ?? 0, true),
      rest: restAll, play, pause, stop,
      get playing() { return S.playing },
      get clip() { return curId() },
      get selectedKeys() { return [...S.sel] },
      modelClips
    }
  }
}
export default plugin
