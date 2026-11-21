// Paint plugin: a Paint mode that paints straight onto the 3D surface (raycast -> uv -> canvas).
// The paint lives in an image texture def {kind:'image', paint:true, src, rev, ...}: src is one tex-store blob
// (saved debounced), rev changes with every stroke so undo/redo swap pixels from the in-memory history.
import * as THREE from 'three'
import { addIcons, icon, isPhone } from '../core/ui.js'
import { projectUV, imageEntry, uvBounds, makeCanvas, remember, snapshot, mem, imgs, encode, dataURL, uid } from './texture.js'

addIcons({
  eraser: 'M9.5 2.8l3.7 3.7-6.7 6.7H3.3l-0.9-0.9a1.5 1.5 0 0 1 0-2.1z M6.2 6.1l3.7 3.7 M6.5 13.2h7',
  bucket: 'M7 2.5l5.5 5.5-4.8 4.8a1.4 1.4 0 0 1-2 0L2.2 9.3a1.4 1.4 0 0 1 0-2L7 2.5z M2.6 8h9.6 M13.3 10.2s1.2 1.6 1.2 2.4a1.2 1.2 0 0 1-2.4 0c0-.8 1.2-2.4 1.2-2.4z',
  picker: 'M10.2 2.6a1.9 1.9 0 0 1 2.7 2.7l-1.6 1.6 0.8 0.8-1.1 1.1-3.8-3.8 1.1-1.1 0.8 0.8z M7.9 5.4l-5 5V13h2.6l5-5'
})

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }
const OK = o => o && (o.type === 'part' || o.type === 'mesh')
const tick = () => new Promise(r => setTimeout(r, 0))
const TOOLS = [['brush', 'Brush', 'brush', 'B'], ['eraser', 'Eraser', 'eraser', 'E'], ['fill', 'Fill', 'bucket', 'G'], ['picker', 'Picker', 'picker', 'I']]
const LS = 'studio.paint.v1'

// ---------- brush settings (per viewer) ----------
const S = { tool: 'brush', color: '#e8443a', size: 24, opacity: 1, hardness: 0.7, spacing: 0.15, pressure: true, mirror: false, res: 0 }
try { Object.assign(S, JSON.parse(localStorage.getItem(LS) || '{}')) } catch {}
const keep = () => { try { localStorage.setItem(LS, JSON.stringify(S)) } catch {} }
const defaultRes = () => S.res || (isPhone() ? 512 : 1024)
let panelUpd = null
const setS = patch => { Object.assign(S, patch); keep(); panelUpd?.() }

// ---------- helpers ----------
const copyCanvas = c => { const d = makeCanvas(c.width, c.height); d.getContext('2d').drawImage(c, 0, 0); return d }
const blobId = () => 't-' + Math.random().toString(16).slice(2, 10).padEnd(8, '0')
const rgba = (hex, a) => { const n = parseInt(String(hex).slice(1, 7), 16) || 0; return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})` }
const bases = new Map() // texture id -> canvas the eraser reveals (this session; else the def's base colour)
const _v2 = new THREE.Vector2(), _ray = new THREE.Raycaster()

// uv -> canvas pixel through the texture's own transform (tiling, offset, rotation, flipY)
const uvOf = (tex, hit) => tex?.channel ? hit?.uv1 : hit?.uv // parts paint through their own uv1 layout
function uvPx(e, uv) { e.tex.updateMatrix(); _v2.copy(uv); e.tex.transformUv(_v2); return [_v2.x * e.canvas.width, _v2.y * e.canvas.height] }
// canvas pixels per world unit at the hit face
function density(e, mesh, hit) {
  const g = mesh.geometry, P = g.attributes.position, U = g.attributes[e.tex.channel ? 'uv1' : 'uv'], f = hit.face
  if (!f || !U) return e.canvas.width / 8
  const w = [f.a, f.b, f.c].map(i => new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld))
  e.tex.updateMatrix()
  const q = [f.a, f.b, f.c].map(i => new THREE.Vector2().fromBufferAttribute(U, i).applyMatrix3(e.tex.matrix).multiplyScalar(e.canvas.width))
  const wa = new THREE.Vector3().crossVectors(w[1].clone().sub(w[0]), w[2].clone().sub(w[0])).length()
  const ua = Math.abs((q[1].x - q[0].x) * (q[2].y - q[0].y) - (q[2].x - q[0].x) * (q[1].y - q[0].y))
  return wa > 1e-9 && ua > 1e-9 ? Math.sqrt(ua / wa) : e.canvas.width / 8
}
function worldPerPx(vp, hit) {
  const cam = vp.camera, H = vp.canvas.clientHeight || 600
  if (cam.isOrthographicCamera) return (cam.top - cam.bottom) / cam.zoom / H
  return 2 * hit.distance * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) / H
}
// the mirrored point on the other side of the object's local X
function mirrorHit(mesh, hit) {
  const inv = mesh.matrixWorld.clone().invert(), p = hit.point.clone().applyMatrix4(inv), n = (hit.face?.normal || new THREE.Vector3(0, 0, 1)).clone()
  if (Math.abs(p.x) < 1e-4) return null
  p.x = -p.x; n.x = -n.x
  const d = 0.02 + 0.01 * (mesh.geometry.boundingSphere?.radius || 1)
  const o = p.clone().addScaledVector(n, d).applyMatrix4(mesh.matrixWorld), dir = n.clone().negate().transformDirection(mesh.matrixWorld)
  _ray.set(o, dir); _ray.near = 0; _ray.far = d * 4
  return _ray.intersectObject(mesh, false)[0] || null
}

// ---------- target preparation: uvs and a paint texture ----------
// bake a part's current texture (its studs uvs) into the uv1 paint canvas, one triangle at a time
function bakeTris(g, N, geo, map, b, sc, color) {
  map.updateMatrix()
  const P = geo.attributes.position, U = geo.attributes.uv, U1 = geo.attributes.uv1, I = geo.index, n = I ? I.count : P.count, W = map.image.width, H = map.image.height, pat = g.createPattern(map.image, 'repeat'), q = new THREE.Vector2()
  const src = i => { q.fromBufferAttribute(U, i).applyMatrix3(map.matrix); return [q.x * W, (map.flipY ? 1 - q.y : q.y) * H] }
  const dst = i => [(U1.getX(i) - b.u0) / sc * N, (1 - (U1.getY(i) - b.v0) / sc) * N]
  for (let t = 0; t + 2 < n; t += 3) {
    const v = [0, 1, 2].map(k => I ? I.getX(t + k) : t + k), s = v.map(src), d = v.map(dst)
    const [[x0, y0], [x1, y1], [x2, y2]] = s, det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
    if (Math.abs(det) < 1e-9) continue
    // affine src -> dst through the three corners
    const A = [[x1 - x0, x2 - x0], [y1 - y0, y2 - y0]], inv = [[A[1][1] / det, -A[0][1] / det], [-A[1][0] / det, A[0][0] / det]]
    const du = [d[1][0] - d[0][0], d[2][0] - d[0][0]], dv = [d[1][1] - d[0][1], d[2][1] - d[0][1]]
    const a = du[0] * inv[0][0] + du[1] * inv[1][0], c = du[0] * inv[0][1] + du[1] * inv[1][1], bb = dv[0] * inv[0][0] + dv[1] * inv[1][0], dd = dv[0] * inv[0][1] + dv[1] * inv[1][1]
    const cx = (d[0][0] + d[1][0] + d[2][0]) / 3, cy = (d[0][1] + d[1][1] + d[2][1]) / 3, grow = p => [p[0] + Math.sign(p[0] - cx), p[1] + Math.sign(p[1] - cy)] // 1 px past the edge: no seams
    g.save(); g.beginPath(); d.map(grow).forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip()
    g.setTransform(a, bb, c, dd, d[0][0] - a * x0 - c * y0, d[0][1] - bb * x0 - dd * y0)
    g.fillStyle = pat; g.fillRect(Math.min(x0, x1, x2) - 2, Math.min(y0, y1, y2) - 2, Math.max(x0, x1, x2) - Math.min(x0, x1, x2) + 4, Math.max(y0, y1, y2) - Math.min(y0, y1, y2) + 4)
    g.restore()
  }
  g.globalCompositeOperation = 'multiply'; g.fillStyle = color || '#ffffff'; g.fillRect(0, 0, N, N); g.globalCompositeOperation = 'source-over'
}
async function prep(app, id) {
  const vp = app.viewport
  let o = app.obj(id)
  if (o.type === 'mesh') {
    const g = app.geo.peek(o.geo) || await app.geo.get(o.geo)
    if (g?.verts && !(g.uvs && g.uvs.length)) { app.set(id, { geo: app.geo.put(projectUV(g, 'atlas')) }); await tick() } // auto unwrap
  }
  o = app.obj(id)
  let tid = o.texture, t = tid && app.scene.textures[tid]
  if (!t?.paint) {
    await tick()
    const mesh = vp.objects.get(id), N = defaultRes(), cv = makeCanvas(N), g = cv.getContext('2d')
    const ch = mesh?.geometry?.attributes?.uv1 ? 1 : 0, b = (!ch && uvBounds(mesh?.geometry)) || { u0: 0, v0: 0, w: 1, h: 1 }, sc = Math.max(b.w, b.h)
    g.fillStyle = o.color || '#a3a2a5'; g.fillRect(0, 0, N, N)
    const map = t && mesh?.material?.map
    if (ch && map?.image?.width) bakeTris(g, N, mesh.geometry, map, b, sc, o.color)
    else if (map?.image?.width) { // bake the current texture so painting starts from what is shown
      map.updateMatrix()
      const e = map.matrix.elements, Wo = map.image.width, Ho = map.image.height, s = sc / N, V = b.v0 + sc
      const T00 = Wo * e[0] * s, T01 = -Wo * e[3] * s, T10 = -Ho * e[1] * s, T11 = Ho * e[4] * s
      const t0 = Wo * (e[0] * b.u0 + e[3] * V + e[6]), t1 = Ho * (1 - e[1] * b.u0 - e[4] * V - e[7]), det = T00 * T11 - T01 * T10
      if (Math.abs(det) > 1e-12) {
        const a = T11 / det, c = -T01 / det, bb = -T10 / det, d = T00 / det, pat = g.createPattern(map.image, 'repeat')
        pat.setTransform(new DOMMatrix([a, bb, c, d, -(a * t0 + c * t1), -(bb * t0 + d * t1)]))
        g.fillStyle = pat; g.fillRect(0, 0, N, N)
        g.globalCompositeOperation = 'multiply'; g.fillStyle = o.color || '#ffffff'; g.fillRect(0, 0, N, N); g.globalCompositeOperation = 'source-over'
      }
    }
    tid = uid('tx-paint-')
    const src = blobId()
    remember(src + '#1', cv); bases.set(tid, cv)
    app.putTexture(tid, { kind: 'image', paint: true, name: 'Paint', src, rev: 1, res: N, aspect: 1, scale: +sc.toFixed(5), offset: [+(-b.u0 / sc).toFixed(5), +(-b.v0 / sc).toFixed(5)], rot: 0, base: o.color || '#a3a2a5', ...(ch ? { uv1: 1 } : {}) })
    app.set(id, { texture: tid, color: '#ffffff' })
    await tick()
  }
  const e = imageEntry(app, tid, app.scene.textures[tid])
  if (e.wait) await e.wait
  const mesh = vp.objects.get(id)
  if (!mesh?.geometry?.attributes?.uv) throw new Error('This object has no surface to paint')
  return { tid, e, mesh }
}

// ---------- strokes ----------
let st = null
function startStroke(app, id, x, y, p) {
  if (st) return st.ready
  app.begin('Paint stroke')
  const s = st = { app, id, tool: S.tool, pts: [[x, y, p]], last: null, dirty: null, done: false }
  s.ready = prep(app, id).then(r => {
    if (st !== s) return
    Object.assign(s, r)
    const N = r.e.canvas.width
    s.snap = copyCanvas(r.e.canvas); s.mask = makeCanvas(N); s.tmp = makeCanvas(N)
    s.mg = s.mask.getContext('2d'); s.ctx = r.e.canvas.getContext('2d')
    if (s.tool === 'eraser') { const b = bases.get(r.tid); s.base = b && b.width === N ? b : null }
    if (s.tool === 'fill') fill(s, s.pts[0])
    else for (const q of s.pts.splice(0)) stepTo(s, q)
  }).catch(err => { app.toast(err.message || String(err), 'error'); cancelStroke(app) })
  return s.ready
}
function moveStroke(x, y, p) { const s = st; if (!s || s.tool === 'fill') return; if (!s.e) s.pts.push([x, y, p]); else stepTo(s, [x, y, p]) }
async function endStroke(app) {
  const s = st
  if (!s) return
  await s.ready
  if (st !== s) return
  st = null
  if (!s.e || !s.dirty) { app.end({ cancel: !s.e }); return }
  const t = app.scene.textures[s.tid], rev = (t.rev || 1) + 1, key = t.src + '#' + rev, copy = copyCanvas(s.e.canvas)
  remember(key, copy); s.e.src = key
  app.putTexture(s.tid, { ...t, rev })
  app.end()
  encode(copy).then(b => snapshot(key, b)).catch(() => {})
  saveSoon(app)
}
function cancelStroke(app) {
  const s = st
  st = null
  if (!s) return
  if (s.e && s.snap) { s.ctx.clearRect(0, 0, s.snap.width, s.snap.height); s.ctx.drawImage(s.snap, 0, 0); s.e.tex.needsUpdate = true; app.viewport.requestRender() }
  app.end({ cancel: true })
}
// dabs from the last point to q, spaced along the screen path
function stepTo(s, q) {
  const vp = s.app.viewport, press = S.pressure ? q[2] : 1, step = Math.max(1, S.spacing * 2 * S.size * (0.25 + 0.75 * press))
  if (!s.last) { dabAt(s, q[0], q[1], press); s.last = q; return composite(s) }
  const dx = q[0] - s.last[0], dy = q[1] - s.last[1], L = Math.hypot(dx, dy)
  if (L < step) return
  const n = Math.min(48, Math.floor(L / step))
  for (let i = 1; i <= n; i++) { const k = i * step / L; dabAt(s, s.last[0] + dx * k, s.last[1] + dy * k, press) }
  const k = n * step / L
  s.last = [s.last[0] + dx * k, s.last[1] + dy * k, q[2]]
  composite(s)
  vp.requestRender()
}
function dabAt(s, x, y, press) {
  const hit = s.app.viewport.pick(x, y, { objects: [s.mesh] })
  if (!uvOf(s.e.tex, hit)) return
  dab(s, hit, press)
  if (S.mirror) { const m = mirrorHit(s.mesh, hit); if (uvOf(s.e.tex, m)) { m.distance = hit.distance; dab(s, m, press) } }
}
function dab(s, hit, press) {
  const [cx, cy] = uvPx(s.e, uvOf(s.e.tex, hit)), N = s.e.canvas.width
  const r = Math.max(1, Math.min(N / 2, S.size * (S.pressure ? 0.25 + 0.75 * press : 1) * worldPerPx(s.app.viewport, hit) * density(s.e, s.mesh, hit)))
  const g = s.mg, a = S.pressure ? Math.min(1, 0.2 + press) : 1, col = s.tool === 'eraser' ? '#ffffff' : S.color
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r)
  grad.addColorStop(0, rgba(col, a)); grad.addColorStop(Math.min(0.999, S.hardness), rgba(col, a)); grad.addColorStop(1, rgba(col, 0))
  g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill()
  const d = s.dirty, x0 = Math.floor(cx - r - 1), y0 = Math.floor(cy - r - 1), x1 = Math.ceil(cx + r + 1), y1 = Math.ceil(cy + r + 1)
  s.dirty = d ? [Math.min(d[0], x0), Math.min(d[1], y0), Math.max(d[2], x1), Math.max(d[3], y1)] : [x0, y0, x1, y1]
  s.cur = s.cur ? [Math.min(s.cur[0], x0), Math.min(s.cur[1], y0), Math.max(s.cur[2], x1), Math.max(s.cur[3], y1)] : [x0, y0, x1, y1]
}
// redraw only the changed rectangle: snapshot + stroke mask at the brush opacity
function composite(s) {
  if (!s.cur) return
  const N = s.e.canvas.width, x = Math.max(0, s.cur[0]), y = Math.max(0, s.cur[1]), w = Math.min(N, s.cur[2]) - x, hh = Math.min(N, s.cur[3]) - y
  s.cur = null
  if (w <= 0 || hh <= 0) return
  const c = s.ctx
  c.globalAlpha = 1; c.clearRect(x, y, w, hh); c.drawImage(s.snap, x, y, w, hh, x, y, w, hh)
  c.globalAlpha = S.opacity
  if (s.tool === 'eraser') {
    const tg = s.tmp.getContext('2d')
    tg.globalCompositeOperation = 'source-over'; tg.clearRect(x, y, w, hh)
    if (s.base) tg.drawImage(s.base, x, y, w, hh, x, y, w, hh); else { tg.fillStyle = s.app.scene.textures[s.tid]?.base || '#a3a2a5'; tg.fillRect(x, y, w, hh) }
    tg.globalCompositeOperation = 'destination-in'; tg.drawImage(s.mask, x, y, w, hh, x, y, w, hh); tg.globalCompositeOperation = 'source-over'
    c.drawImage(s.tmp, x, y, w, hh, x, y, w, hh)
  } else c.drawImage(s.mask, x, y, w, hh, x, y, w, hh)
  c.globalAlpha = 1
  s.e.tex.needsUpdate = true
  s.app.viewport.requestRender()
}
// flood fill from the touched pixel (colour tolerance 32)
function fill(s, q) {
  const hit = s.app.viewport.pick(q[0], q[1], { objects: [s.mesh] })
  if (!uvOf(s.e.tex, hit)) return
  const N = s.e.canvas.width, [fx, fy] = uvPx(s.e, uvOf(s.e.tex, hit)).map(v => Math.min(N - 1, Math.max(0, Math.floor(v))))
  const img = s.ctx.getImageData(0, 0, N, N), d = img.data, i0 = (fy * N + fx) * 4, R = d[i0], G = d[i0 + 1], B = d[i0 + 2]
  const n = parseInt(S.color.slice(1, 7), 16), a = S.opacity, cr = n >> 16 & 255, cg = n >> 8 & 255, cb = n & 255
  const seen = new Uint8Array(N * N), near = i => Math.abs(d[i] - R) <= 32 && Math.abs(d[i + 1] - G) <= 32 && Math.abs(d[i + 2] - B) <= 32
  const stack = [fx, fy]
  let x0 = N, y0 = N, x1 = 0, y1 = 0
  while (stack.length) {
    const y = stack.pop(), x = stack.pop()
    let l = x
    while (l > 0 && !seen[y * N + l - 1] && near((y * N + l - 1) * 4)) l--
    let up = false, dn = false
    for (let k = l; k < N && !seen[y * N + k] && near((y * N + k) * 4); k++) {
      seen[y * N + k] = 1
      if (y > 0) { const ok = !seen[(y - 1) * N + k] && near(((y - 1) * N + k) * 4); if (ok && !up) stack.push(k, y - 1); up = ok }
      if (y < N - 1) { const ok = !seen[(y + 1) * N + k] && near(((y + 1) * N + k) * 4); if (ok && !dn) stack.push(k, y + 1); dn = ok }
      if (k < x0) x0 = k; if (k > x1) x1 = k
    }
    if (y < y0) y0 = y; if (y > y1) y1 = y
  }
  for (let i = 0, p = 0; i < seen.length; i++, p += 4) if (seen[i]) { d[p] += (cr - d[p]) * a; d[p + 1] += (cg - d[p + 1]) * a; d[p + 2] += (cb - d[p + 2]) * a }
  s.ctx.putImageData(img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1)
  s.dirty = [x0, y0, x1, y1]
  s.e.tex.needsUpdate = true; s.app.viewport.requestRender()
}
// eyedropper: the colour shown at the touched point (texture pixel times object colour)
function pick(app, x, y) {
  const hit = app.viewport.pick(x, y), o = hit && app.obj(hit.id)
  if (!OK(o)) return null
  let c = [255, 255, 255]
  const map = hit.object?.material?.map, img = map?.image
  if (img?.getContext && uvOf(map, hit)) {
    map.updateMatrix(); _v2.copy(uvOf(map, hit)); map.transformUv(_v2)
    c = [...img.getContext('2d').getImageData(Math.min(img.width - 1, Math.floor(_v2.x * img.width)), Math.min(img.height - 1, Math.floor(_v2.y * img.height)), 1, 1).data.slice(0, 3)]
  }
  const n = parseInt(String(o.color || '#ffffff').slice(1, 7), 16)
  const m = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v, i) => Math.round(v * c[i] / 255))
  const hex = '#' + m.map(v => v.toString(16).padStart(2, '0')).join('')
  setS({ color: hex })
  return hex
}

// ---------- debounced save of each paint texture's current pixels to its tex-store blob ----------
const saved = new Map()
let saveTimer = 0, saveApp = null
function saveSoon(app, ms = 800) { saveApp = app; clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, ms) }
async function saveNow() {
  const app = saveApp
  saveTimer = 0
  if (!app) return
  for (const [tid, t] of Object.entries(app.scene.textures)) {
    if (!t?.paint || !t.src) continue
    const key = t.src + '#' + (t.rev || 1), e = imgs.get(tid)
    if (saved.get(t.src) === key) continue
    const cv = mem.get(key) || (e?.src === key && e.ok ? e.canvas : null)
    if (!cv) continue
    try { app.tex.put({ kind: 'image', data: await dataURL(await encode(cv)) }, t.src); saved.set(t.src, key) } catch (err) { app.toast('Could not save paint: ' + (err.message || err), 'error') }
  }
}

// ---------- brush ring ----------
let ring = null
function showRing(x, y, show = true) {
  if (!ring) { ring = h('div'); ring.style.cssText = 'position:fixed;z-index:30;pointer-events:none;border:1.5px solid rgba(255,255,255,.85);box-shadow:0 0 0 1px rgba(0,0,0,.55);border-radius:50%;display:none'; document.body.appendChild(ring) }
  if (!show) { ring.style.display = 'none'; return }
  const r = S.size
  Object.assign(ring.style, { display: 'block', left: x - r + 'px', top: y - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px' })
}

// ---------- tools ----------
const tool = ([id, label, ic]) => ({
  id: 'paint.' + id, label, icon: ic, mode: 'paint', order: TOOLS.findIndex(t => t[0] === id) + 1,
  onActivate() { S.tool = id; keep(); panelUpd?.() },
  onDeactivate() { showRing(0, 0, false) },
  onHover(ev) { if (id !== 'fill' && id !== 'picker' && ev.pointerType !== 'touch') showRing(ev.clientX, ev.clientY); else showRing(0, 0, false) },
  onDown(ev) {
    if (ev.button !== 0 || ev.alt) return false
    const app = ev.vp?.app || this.app, o = ev.hit && app.obj(ev.hit.id)
    if (!OK(o) || app.isLocked?.(ev.hit.id)) return false
    if (id === 'picker') { pick(app, ev.clientX, ev.clientY); return true }
    S.tool = id
    startStroke(app, ev.hit.id, ev.clientX, ev.clientY, ev.pointerType === 'pen' ? ev.pressure || 0.5 : 1)
    return true
  },
  onMove(ev) { if (id !== 'fill' && ev.pointerType !== 'touch') showRing(ev.clientX, ev.clientY); moveStroke(ev.clientX, ev.clientY, ev.pointerType === 'pen' ? ev.pressure || 0.5 : 1) },
  onUp() { const app = st?.app; if (app) endStroke(app) },
  onCancel() { const app = st?.app; if (app) cancelStroke(app); showRing(0, 0, false) }
})
const tools = TOOLS.map(tool)

// ---------- commands ----------
const inPaint = app => app.mode === 'paint'
const commands = {
  'paint.mode': { label: 'Paint mode', icon: 'brush', noUndo: true, checked: inPaint, run: app => app.setMode(inPaint(app) ? 'build' : 'paint') },
  'paint.symmetry': { label: 'Mirror X', icon: 'mirror', key: 'Shift+X', mode: 'paint', noUndo: true, checked: () => S.mirror, run: () => setS({ mirror: !S.mirror }) },
  'paint.bigger': { label: 'Bigger brush', icon: 'plus', key: 'BracketRight', mode: 'paint', noUndo: true, run: () => setS({ size: Math.min(200, Math.round(S.size * 1.25)) }) },
  'paint.smaller': { label: 'Smaller brush', icon: 'dot', key: 'BracketLeft', mode: 'paint', noUndo: true, run: () => setS({ size: Math.max(1, Math.round(S.size / 1.25)) }) },
  'paint.settings': { label: 'Brush settings', hidden: true, noUndo: true, run: (app, a = {}) => { setS(Object.fromEntries(Object.entries(a).filter(([k]) => k in S))); return { ...S } } },
  // points: [[clientX, clientY, pressure?], ...] in page pixels; tool/colour/size etc. optional. One undo step.
  'paint.stroke': { label: 'Paint stroke', icon: 'brush', hidden: true, noUndo: true, async run(app, a = {}) {
    const pts = a.points || []
    if (!pts.length) throw new Error('No points')
    const keepS = { ...S }
    Object.assign(S, Object.fromEntries(Object.entries(a).filter(([k]) => k in S && k !== 'points')))
    try {
      if (S.tool === 'picker') { const c = pick(app, pts[0][0], pts[0][1]); if (c) keepS.color = c; return c }
      const hit = app.viewport.pick(pts[0][0], pts[0][1]), o = hit && app.obj(hit.id)
      if (!OK(o)) throw new Error('Nothing to paint there')
      startStroke(app, hit.id, pts[0][0], pts[0][1], pts[0][2] ?? 1)
      await st?.ready
      for (const q of pts.slice(1)) moveStroke(q[0], q[1], q[2] ?? 1)
      await endStroke(app)
      return app.obj(hit.id).texture
    } finally { if (a.keep !== true) Object.assign(S, keepS) }
  } },
  'paint.save': { label: 'Save paint now', icon: 'download', hidden: true, noUndo: true, run: async app => { saveApp = app; clearTimeout(saveTimer); await saveNow(); return saved.size } }
}
for (const [id, label, ic, key] of TOOLS) commands['paint.' + id] = { label: id === 'picker' ? 'Eyedropper' : label, icon: ic, key, mode: 'paint', noUndo: true, checked: app => app.tool === 'paint.' + id, run: app => { if (!inPaint(app)) app.setMode('paint'); app.setTool('paint.' + id) } }

// ---------- panel ----------
function build(el, app) {
  el.innerHTML = ''
  const C = app.ui.controls, ups = []
  const put = (g, c) => { g.appendChild(c.el); ups.push(c.update); return c }
  const sv = k => () => ({ v: S[k] }), sw = k => v => setS({ [k]: v })
  const seg = h('div', 'pt-tools')
  seg.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:4px 0 10px'
  for (const [id, label, ic] of TOOLS) { const b = h('button', 'btn', icon(ic) + '<span>' + label + '</span>'); b.type = 'button'; b.dataset.tool = id; b.title = id === 'picker' ? 'Eyedropper: pick a colour from the model' : label; b.addEventListener('click', () => app.exec('paint.' + id)); seg.appendChild(b) }
  el.appendChild(seg)
  const g = C.group(el, 'Brush')
  put(g, C.color('Colour', { read: sv('color'), write: sw('color') }))
  put(g, C.slider('Size', { min: 1, max: 200, step: 1, read: sv('size'), write: v => setS({ size: Math.round(v) }) }))
  put(g, C.slider('Opacity', { min: 0.05, max: 1, step: 0.05, read: sv('opacity'), write: sw('opacity') }))
  put(g, C.slider('Hardness', { min: 0, max: 1, step: 0.05, read: sv('hardness'), write: sw('hardness') }))
  put(g, C.slider('Spacing', { min: 0.05, max: 1, step: 0.05, read: sv('spacing'), write: sw('spacing') }))
  put(g, C.toggle('Pen pressure', { read: sv('pressure'), write: sw('pressure') }))
  put(g, C.toggle('Mirror X', { read: sv('mirror'), write: sw('mirror') }))
  const g2 = C.group(el, 'Canvas')
  put(g2, C.select('New canvas', { options: [512, 1024, 2048].map(v => ({ value: String(v), label: v + ' px' })), read: () => ({ v: String(defaultRes()) }), write: v => setS({ res: +v }) }))
  const row = h('div', 'btn-row'), ex = h('button', 'btn', icon('download') + '<span>Export PNG</span>')
  ex.type = 'button'; ex.addEventListener('click', () => app.exec('texture.exportPng')); row.appendChild(ex); g2.appendChild(row)
  const upd = () => { for (const u of ups) u(); for (const b of seg.children) b.classList.toggle('primary', 'paint.' + b.dataset.tool === app.tool) }
  el._upd = upd; panelUpd = upd; upd()
  return () => { if (panelUpd === upd) panelUpd = null }
}
const panel = { id: 'paint', label: 'Paint', icon: 'brush', mode: 'paint', where: 'right', order: 5, render: build, refresh(el) { el._upd?.() } }

export default {
  id: 'paint', name: 'Paint',
  commands,
  menus: { View: ['-', 'paint.mode'], Paint: ['paint.brush', 'paint.eraser', 'paint.fill', 'paint.picker', '-', 'paint.symmetry', 'paint.bigger', 'paint.smaller', '-', 'texture.exportPng'] },
  modes: [{ id: 'paint', label: 'Paint', icon: 'brush', order: 40, gizmo: false }],
  tools, panels: [panel], importers: [], exporters: [], types: {},
  init(app) {
    for (const t of tools) t.app = app
    app.on('mode', ({ mode, prev }) => {
      if (mode === 'paint') { app.setTool('paint.' + (S.tool || 'brush')); app.viewport?.requestRender?.() }
      else if (prev === 'paint') { if (st) cancelStroke(app); showRing(0, 0, false); if (saveTimer) { clearTimeout(saveTimer); saveApp = app; saveNow() } }
    })
    app.on('tool', () => panelUpd?.())
    app.on('history', () => { if (Object.values(app.scene.textures).some(t => t?.paint)) saveSoon(app) })
  }
}
