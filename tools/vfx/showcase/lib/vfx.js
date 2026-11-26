// Flipbook effects: object type `flipbook` plays a VFX sprite sheet (grid of frames) on the clip's timeline, as a camera-facing
// card, a flat ground decal or a 3D beam. Fields: tex (tex-store id of the sheet), grid (4 = 4x4), frames, life (s per play), start (clip
// time), loop (+ dur, fps), size (studs), blend ('add' | 'normal'), flat (lies on the ground), shape 'beam' (+ length, speed). Hidden
// outside its time window. A beam is a glowing volume along its local +X (size = diameter): it keeps its direction from every view,
// end-on it is a disk. Each pixel's ray meets the cylinder analytically; the sheet frame is its side view (v = offset from the axis,
// tiled along the length with two cross-faded taps, so no seams), brightened by path length (a thin glowing gas). `speed` (studs/s)
// shoots it out at the start of its window and draws it back at the end; 0 shows it whole.
// The Animate tab times them: each effect is a bar on the timeline (drag it, stretch its right edge), and the Effects list
// (this project's sheets + the hub's shared `vfx` library) drags onto a row: the effect then plays from that time, riding that part.
import * as THREE from 'three'

const sheets = new Map()                 // tex id -> {tex, ready}
const live = new Set()                   // flipbook roots
let APP = null
const card = new THREE.PlaneGeometry(1, 1)
const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
const box = new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0, 0)     // a beam's bounds: x 0..1 (length), y and z -0.5..0.5 (diameter)
const BEAM_VS = `varying vec3 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const BEAM_FS = `uniform sampler2D map; uniform vec4 frame; uniform vec3 origin, axis, bu, bv; uniform vec3 up; uniform float R, L, inset, add, texels, pxA, pxB;
varying vec3 vW;
// explicit mip level: screen derivatives break at the fract() wrap and beside discarded pixels (bright 1 px lines at the edge)
vec4 tap(float u, float v, float lod) { vec2 q = clamp(vec2(u, v), inset, 1.0 - inset); vec4 c = textureLod(map, frame.xy + q * frame.zw, lod); return vec4(c.rgb * c.a, c.a); }
vec4 side(float x, float v, float lod) { float u = x / (2.0 * R), f = fract(u), w = 1.0 - abs(2.0 * f - 1.0); return w * tap(f, v, lod) + (1.0 - w) * tap(fract(u + 0.5), v, lod); }
void main() {
  vec3 d = normalize(vW - cameraPosition), q = cameraPosition - origin;
  vec3 o = vec3(dot(q, axis), dot(q, bu), dot(q, bv)), r = vec3(dot(d, axis), dot(d, bu), dot(d, bv));
  float a = dot(r.yz, r.yz), b = dot(o.yz, r.yz), c = dot(o.yz, o.yz) - R * R, t0 = -1e9, t1 = 1e9;
  if (a > 1e-7) { float h = b * b - a * c; if (h <= 0.0) discard; h = sqrt(h); t0 = (-b - h) / a; t1 = (-b + h) / a; }
  else if (c > 0.0) discard;
  if (abs(r.x) > 1e-6) { float s0 = -o.x / r.x, s1 = (L - o.x) / r.x; t0 = max(t0, min(s0, s1)); t1 = min(t1, max(s0, s1)); }
  else if (o.x < 0.0 || o.x > L) discard;
  t0 = max(t0, 0.0);
  if (t1 <= t0) discard;
  float tm = 0.5 * (t0 + t1), x = o.x + tm * r.x, sa = sqrt(a);
  vec2 pm = o.yz + tm * r.yz;                                            // the ray's offset from the axis mid-chord
  float m = length(pm) / R, sv = dot(pm, vec2(dot(up, bu), dot(up, bv))) / R;   // radius; signed offset toward the screen's top (linear: no seam)
  float w = smoothstep(0.12, 0.35, sa);                                  // end-on: by radius, a round disk
  float lod = log2(max((tm * pxA + pxB) * texels / (2.0 * R), 1e-3)) + 0.5 * log2(1.0 / max(sa, 0.25));   // + along-axis foreshortening
  vec4 col = mix(side(x, 0.5 + 0.5 * m, lod), side(x, 0.5 + 0.5 * sv, lod), w);
  float k = clamp((t1 - t0) / max(2.0 * R * sqrt(max(1.0 - m * m, 0.0)), 0.02 * R), 0.0, 4.0);
  k *= smoothstep(0.0, 0.5 * R, x) * smoothstep(L, L - R, x) * smoothstep(1.0, 0.9, m);   // soft ends and rim
  vec3 rgb = col.rgb / max(col.a, 1e-4);
  gl_FragColor = vec4(rgb, add > 0.5 ? col.a * k : min(col.a * k, 1.0));
  #include <colorspace_fragment>
}`
function beamMat() {
  return new THREE.ShaderMaterial({ vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false, side: THREE.BackSide, toneMapped: false,
    uniforms: { map: { value: null }, frame: { value: new THREE.Vector4(0, 0, 1, 1) }, origin: { value: new THREE.Vector3() }, axis: { value: new THREE.Vector3(1, 0, 0) },
      bu: { value: new THREE.Vector3(0, 1, 0) }, bv: { value: new THREE.Vector3(0, 0, 1) }, up: { value: new THREE.Vector3(0, 1, 0) }, R: { value: 0.5 }, L: { value: 1 }, inset: { value: 0.004 }, add: { value: 1 }, texels: { value: 128 }, pxA: { value: 0.001 }, pxB: { value: 0 } } })
}
const mapOf = m => m.material.isShaderMaterial ? m.material.uniforms.map.value : m.material.map
const _q = new THREE.Quaternion(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3()

function sheet(app, id) {
  let e = sheets.get(id)
  if (e) return e
  e = { tex: null, ready: false }; sheets.set(id, e)
  app.tex.get(id).then(d => {
    if (d?.asset && !d.data) d = { data: '/_blob/' + d.asset }      // sheets stored as hub assets
    if (!d?.data) return
    const img = new Image()
    img.onload = () => {
      e.tex = new THREE.Texture(img); e.tex.colorSpace = THREE.SRGBColorSpace; e.tex.needsUpdate = true; e.ready = true
      for (const o of live) if (o.userData.fb?.tex === id) bind(o)
      frameAll(app.anim?.story ? app.anim.story(app.time || 0) : (app.time || 0))
    }
    img.src = d.data
  }).catch(() => {})
  return e
}

function bind(o) {
  const fb = o.userData.fb, e = sheet(APP, fb.tex), m = o.userData.card
  if (!e.ready) return
  if (m.material.isShaderMaterial) {                       // a beam reads the shared sheet and picks its frame itself
    const U = m.material.uniforms, px = Math.max(1, e.tex.image?.width || 128) / fb.grid; U.map.value = e.tex; U.inset.value = 0.5 / px; U.texels.value = px; return
  }
  if (!m.material.map || m.material.map.source !== e.tex.source) {
    m.material.map?.dispose()
    const t = e.tex.clone(); t.repeat.set(1 / fb.grid, 1 / fb.grid); t.needsUpdate = true      // clones share one GPU upload
    m.material.map = t; m.material.needsUpdate = true
  }
}

function frame(o, t) {
  const fb = o.userData.fb, m = o.userData.card, rel = t - fb.start, dur = fb.loop ? fb.dur : fb.life
  const on = rel >= 0 && rel < dur && !!mapOf(m)
  m.visible = on
  if (!on) return
  const n = fb.frames, i = fb.loop ? Math.floor(rel * fb.fps) % n : Math.min(n - 1, Math.floor(rel / fb.life * n))
  const ox = (i % fb.grid) / fb.grid, oy = 1 - (Math.floor(i / fb.grid) + 1) / fb.grid
  if (m.material.isShaderMaterial) { m.material.uniforms.frame.value.set(ox, oy, 1 / fb.grid, 1 / fb.grid); fb.grown = fb.speed > 0 ? Math.min(1, fb.speed * Math.min(rel, dur - rel) / fb.length) : 1 }   // out at the start, back in at the end
  else m.material.map.offset.set(ox, oy)
}

function frameAll(t) {
  let any = false
  for (const o of [...live]) { if (!o.parent) { live.delete(o); continue } frame(o, t); any = true }
  if (any) APP?.viewport?.requestRender?.()            // scenes without flipbooks cost nothing
}

function setup(o, obj) {
  const fb = { tex: obj.tex, grid: obj.grid || 4, frames: obj.frames || 16, life: obj.life || 1, start: obj.start || 0, loop: !!obj.loop,
    dur: obj.dur || 1, fps: obj.fps || 16, size: obj.size || 4, blend: obj.blend, flat: !!obj.flat,
    beam: obj.shape === 'beam', length: Math.max(0.01, +obj.length || 10), speed: Math.max(0, +obj.speed || 0), grown: 1 }
  const prev = o.userData.fb, m = o.userData.card
  o.userData.fb = fb
  if (prev ? prev.beam !== fb.beam : fb.beam) {
    const old = m.material; m.material = fb.beam ? beamMat() : new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
    if (!old.isShaderMaterial) old.map?.dispose()
    old.dispose()
  }
  m.geometry = fb.beam ? box : fb.flat ? flat : card
  if (fb.beam) m.scale.set(fb.length, fb.size, fb.size); else m.scale.setScalar(fb.size)
  m.material.blending = fb.blend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending
  if (fb.beam) m.material.uniforms.add.value = fb.blend === 'add' ? 1 : 0
  else if (prev?.tex !== fb.tex || prev?.grid !== fb.grid) { m.material.map?.dispose(); m.material.map = null }
  if (fb.tex) bind(o)
  frame(o, APP?.time || 0)
}

const SPAN = e => e.loop ? (+e.dur || +e.frames / (+e.fps || 24)) : (+e.life || 1)
const KEYS = ['grid', 'frames', 'life', 'loop', 'dur', 'fps', 'size', 'blend', 'flat', 'shape', 'length', 'speed']
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }

let SHARED = null                        // the hub's library: db collection `vfx`, docs {name, asset, grid, frames, fps, loop, life, dur, size, blend}
function shared(app) {
  if (SHARED) return SHARED
  SHARED = new Promise(res => {
    let stop = null
    try {
      stop = app.store?.db?.collection('vfx').onSnapshot(qs => { res(qs.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.asset && e.name)); try { stop?.() } catch {} }, () => res([]))
    } catch { res([]) }
    setTimeout(() => res([]), 6000)
  })
  return SHARED
}
function projectFx(app) {                // effects already in this project, one per sheet
  const seen = new Map()
  for (const o of Object.values(app.scene?.objects || {})) if (o.type === 'flipbook' && o.tex && !seen.has(o.tex))
    seen.set(o.tex, { name: (o.name || 'Effect').replace(/\s*\d+$/, '').replace(/^FX\s*/i, '') || 'Effect', tex: o.tex, ...Object.fromEntries(KEYS.filter(k => o[k] !== undefined).map(k => [k, o[k]])) })
  return [...seen.values()]
}
function thumb(app, e, el) {             // a frame a third of the way in, from the sheet itself
  const g = +e.grid || 4, i = Math.floor((+e.frames || g * g) / 3), x = g > 1 ? (i % g) / (g - 1) * 100 : 50, y = g > 1 ? Math.floor(i / g) / (g - 1) * 100 : 50   // grid 1 = a static symbol
  const set = url => { el.style.backgroundImage = `url("${url}")`; el.style.backgroundSize = `${g * 100}% ${g * 100}%`; el.style.backgroundPosition = `${x}% ${y}%` }
  if (e.asset) set('/_blob/' + e.asset)
  else app.tex.get(e.tex).then(d => d && set(d.data || (d.asset ? '/_blob/' + d.asset : ''))).catch(() => {})
}
function addFx(app, e, at) {
  const t = at?.t ?? (app.time || 0), sel = (app.selection || []).filter(id => app.obj(id))
  let parent = at && 'id' in at ? at.id : sel[0] || null
  if (parent && app.obj(parent)?.type === 'flipbook') parent = app.obj(parent).parent || null      // dropped on an effect: beside it
  return app.exec('vfx.add', { ...e, start: t, parent })
}
function library(app) {
  app.ui.sheet({ title: 'Effects', cls: 'vfx-sheet', render(body, close) {
    body.append(h('div', 'vfx-hint mute', 'Drag onto a timeline row: it plays from there and rides that part. Tap: at the playhead, on the selection.'))
    // the hub library holds hundreds of full sheets: thumbs load only when scrolled into view, search + kind chips narrow the list
    const bar = h('div', 'vfx-bar'), q = h('input', 'vfx-q'), list = h('div', 'vfx-list'); q.type = 'search'; q.placeholder = 'Search effects'
    let kind = '', all = []
    const chips = ['', 'flipbook', 'action', 'symbol'].map(k => { const c = h('button', 'vfx-chip'); c.type = 'button'; c.textContent = k ? k[0].toUpperCase() + k.slice(1) : 'All'; c.onclick = () => { kind = k; chips.forEach(x => x.classList.toggle('on', x === c)); show() }; return c })
    chips[0].classList.add('on'); bar.append(q, ...chips); body.append(bar, list)
    const show = () => { const t = q.value.trim().toLowerCase(); for (const [it, e] of all) it.hidden = (kind && (e.kind || 'flipbook') !== kind) || (t && !e.name.toLowerCase().includes(t)) }
    q.addEventListener('input', show)
    const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => { for (const x of es) if (x.isIntersecting) { io.unobserve(x.target); x.target._load() } }, { rootMargin: '200px' }) : null
    const fill = items => {
      for (const e of items) {
        const it = h('button', 'vfx-it'), pic = h('div', 'vfx-pic'), lab = h('div', 'vfx-lab')
        it.type = 'button'; lab.textContent = e.name; it.append(pic, lab); list.append(it); all.push([it, e])
        if (io) { pic._load = () => thumb(app, e, pic); io.observe(pic) } else thumb(app, e, pic)
        let drag = null
        // tracked on the window: the list turns see-through (pointer-events off) mid-drag, which would drop an element's capture
        it.addEventListener('pointerdown', ev => {
          drag = { x: ev.clientX, y: ev.clientY, on: false, pid: ev.pointerId }
          addEventListener('pointermove', move); addEventListener('pointerup', end); addEventListener('pointercancel', end)
        })
        const move = ev => {
          if (!drag || ev.pointerId !== drag.pid) return
          if (!drag.on && Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) > 8) {
            drag.on = true; drag.g = h('div', 'vfx-ghost'); thumb(app, e, drag.g); document.body.append(drag.g)
            const w = body.closest('.sheet-wrap'); if (w) w.classList.add('vfx-dragging')      // see-through while dragging: the timeline shows below
          }
          if (drag.on) { drag.g.style.left = ev.clientX - 28 + 'px'; drag.g.style.top = ev.clientY - 28 + 'px' }
        }
        const end = ev => {
          if (!drag || ev.pointerId !== drag.pid) return
          removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end)
          const d = drag; drag = null; d.g?.remove()
          if (!d.on) { if (ev.type === 'pointerup') { close(); addFx(app, e) } return }
          close()
          if (ev.type !== 'pointerup') return
          const at = app.timelineDrop?.(ev.clientX, ev.clientY)
          if (at) addFx(app, e, at)
          else if (document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.vp')) addFx(app, e)
        }
      }
    }
    const own = projectFx(app); fill(own)
    shared(app).then(lib => { const have = new Set(own.map(e => e.tex)); fill(lib.filter(e => !have.has('fx-' + e.id)).map(e => ({ ...e, tex: 'fx-' + e.id }))); show(); if (!list.children.length) list.append(h('div', 'mute', 'No effects yet: build some with the VFX generator.')) })
  } })
}
const CSS = `.vfx-hint{font-size:12px;margin:0 4px 10px}.vfx-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px}
.vfx-it{display:flex;flex-direction:column;gap:6px;padding:6px;border:1px solid var(--line);border-radius:var(--r,8px);background:var(--panel2);color:var(--text);touch-action:none;cursor:grab;font:inherit}
.vfx-bar{display:flex;flex-wrap:wrap;gap:6px;margin:0 4px 10px}.vfx-q{flex:1 1 140px;min-width:0;padding:6px 8px;border:1px solid var(--line);border-radius:var(--r,8px);background:var(--panel2);color:var(--text);font:inherit}
.vfx-it[hidden]{display:none}.vfx-chip{padding:4px 10px;border:1px solid var(--line);border-radius:999px;background:none;color:var(--text);font:inherit;font-size:12px}.vfx-chip.on{background:var(--panel2);border-color:var(--accent,#6aa0ff)}
.vfx-pic,.vfx-ghost{aspect-ratio:1;border-radius:6px;background-color:#0b0f1a;background-repeat:no-repeat}
.vfx-lab{font-size:12px;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vfx-ghost{position:fixed;width:56px;z-index:2147483600;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.45)}
.sheet-wrap.vfx-dragging{opacity:.12;pointer-events:none}`

export default {
  id: 'vfx', name: 'VFX',
  commands: {
    'vfx.library': { label: 'Effects', icon: 'an-fx', noUndo: true, run: app => library(app) },
    'vfx.add': {
      label: 'Add effect', hidden: true,
      run(app, a = {}) {   // {tex, asset?, start, parent, name, grid, frames, fps, loop, life, dur, size, blend}
        if (!a.tex) throw new Error('vfx.add needs a sheet (tex)')
        return app.transact('Add effect', () => {
          if (a.asset && !app.tex.peek(a.tex)) app.tex.put({ asset: a.asset }, a.tex)
          const o = { type: 'flipbook', name: a.name || 'Effect', tex: a.tex, parent: a.parent || null, pos: a.pos || [0, 0, 0], start: +a.start || 0 }
          for (const k of KEYS) if (a[k] !== undefined) o[k] = a[k]
          if (o.loop && o.dur === undefined) o.dur = SPAN(o)
          const id = app.add(o); app.select([id]); return id
        })
      }
    },
    'vfx.time': {
      label: 'Time effect', hidden: true,
      run(app, a = {}) { const o = app.obj(a.id); if (!o) return; app.set(a.id, o.loop ? { start: a.start, dur: a.span } : { start: a.start, life: a.span }) }
    }
  },
  types: {
    flipbook: {
      defaults: { tex: null, grid: 4, frames: 16, life: 1, start: 0, loop: false, dur: 1, fps: 16, size: 4, blend: 'normal', flat: false, shape: 'card', length: 10, speed: 0 },
      build(obj, app) {
        APP = app
        const o = new THREE.Group()
        const m = new THREE.Mesh(card, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }))
        m.raycast = () => {}                                    // effects never block a click
        m.castShadow = m.receiveShadow = false
        m.userData.helper = false
        m.onBeforeRender = (r, s, cam) => {                     // camera-facing card (decals stay flat); a beam sends its frame in world space
          const fb = o.userData.fb
          if (fb.beam) {
            const U = m.material.uniforms, e = m.matrixWorld.elements
            U.origin.value.setFromMatrixPosition(m.matrixWorld)
            U.axis.value.set(e[0], e[1], e[2]); const len = U.axis.value.length(); U.axis.value.divideScalar(len || 1)
            U.bu.value.set(e[4], e[5], e[6]); const dia = U.bu.value.length(); U.bu.value.divideScalar(dia || 1)
            U.bv.value.crossVectors(U.axis.value, U.bu.value).normalize(); U.bu.value.crossVectors(U.bv.value, U.axis.value)
            U.R.value = 0.5 * dia; U.L.value = len * fb.grown
            const c = _a.copy(U.origin.value).addScaledVector(U.axis.value, 0.5 * U.L.value).sub(cam.position), up = U.up.value.crossVectors(U.axis.value, c).normalize()
            const cu = _b.set(0, 1, 0).applyQuaternion(cam.quaternion), cr = _c.set(1, 0, 0).applyQuaternion(cam.quaternion), f = up.dot(cu)   // across the beam, toward the screen's top
            if ((Math.abs(f) > 0.1 ? f : up.dot(cr)) < 0) up.negate()
            const rt = r.getRenderTarget(), H = rt ? rt.height : r.getContext().drawingBufferHeight      // world size of a pixel, for the mip level
            if (cam.isPerspectiveCamera) { U.pxA.value = 2 * Math.tan(cam.fov * Math.PI / 360) / (cam.zoom || 1) / H; U.pxB.value = 0 }
            else { U.pxA.value = 0; U.pxB.value = (cam.top - cam.bottom) / (cam.zoom || 1) / H }
            return
          }
          if (fb.flat) return
          m.parent.getWorldQuaternion(_q).invert(); m.quaternion.copy(_q.multiply(cam.quaternion))
          m.updateMatrix(); m.matrixWorld.multiplyMatrices(m.parent.matrixWorld, m.matrix)   // the renderer reads matrixWorld right after this
        }
        o.add(m); o.userData.card = m
        live.add(o); setup(o, obj)
        return o
      },
      update(o3d, obj) { setup(o3d, obj); return o3d }
    }
  },
  init(app) {
    APP = app; app.on('time', t => frameAll(app.anim?.story ? app.anim.story(t) : t))
    try { if (!document.getElementById('pl-vfx')) { const st = document.createElement('style'); st.id = 'pl-vfx'; st.textContent = CSS; document.head.append(st) } } catch {}
  }
}
