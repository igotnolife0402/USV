// Text objects for thumbnails: type `text` draws styled words onto a card: font (Google Fonts, loaded on first use), a
// gradient fill (top to bottom), a thick outline, a drop shadow, a glow, italic skew. Fields: text ('\n' for lines),
// font, size (studs per line), fill [colours], stroke, strokeW (of the line height), shadow, shadowOff [x, y] (of the
// line height), glow, skew (deg), tilt (deg, roll on screen), face 'camera' | 'fixed' (fixed: lies in the object's XY
// plane, its front +Z), overlay (drawn over everything, never hidden), order (stacking among overlays). Thumbnail extras:
// outline2 (a second, outer outline: white rims like the big Roblox thumbnails), depth (3D extrusion, of the line height) in
// depthColor, bg {shape: circle|round|burst|lines|gauge, fill, border, borderW, w, h, rays, value} drawn behind (alone when
// text is ''), draw: 'shocked'|'scared'|'grin'|'cry' (a cartoon face decal). Hidden from picking like effects.
import * as THREE from 'three'

const FONTS = ['Luckiest Guy', 'Bangers', 'Lilita One', 'Titan One', 'Bungee']    // chunky display faces Roblox thumbnails use
const PX = 160                                                                      // canvas px per line
const card = new THREE.PlaneGeometry(1, 1)
const _q = new THREE.Quaternion(), _z = new THREE.Vector3(0, 0, 1), _r = new THREE.Quaternion()
const live = new Set()
let fontsAsked = false

function askFonts() {                    // one stylesheet, first time a text object is built (never at boot)
  if (fontsAsked) return
  fontsAsked = true
  try {
    const l = document.createElement('link'); l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?' + FONTS.map(f => 'family=' + f.replace(/ /g, '+')).join('&') + '&display=swap'
    l.onload = () => { for (const f of FONTS) document.fonts.load(`${PX}px "${f}"`).then(() => { for (const o of live) if (o.userData.tx.font === f) paint(o) }).catch(() => {}) }
    document.head.append(l)
  } catch {}
}

function spec(obj) {
  return { text: String(obj.text ?? 'TEXT'), font: obj.font || 'Luckiest Guy', size: +obj.size || 1, fill: [].concat(obj.fill || ['#ffffff']),
    stroke: obj.stroke ?? '#000000', strokeW: obj.strokeW ?? 0.12, shadow: obj.shadow ?? '#000000', shadowOff: obj.shadowOff || [0.05, 0.08],
    glow: obj.glow || null, skew: +obj.skew || 0, tilt: +obj.tilt || 0, face: obj.face || 'camera', overlay: obj.overlay !== false,
    outline2: obj.outline2 || null, outline2W: obj.outline2W ?? 0.07, depth: +obj.depth || 0, depthColor: obj.depthColor || null, bg: obj.bg || null,
    draw: obj.draw || null, order: +obj.order || 0 }
}

function face(g, W, kind) {               // cartoon face decal (black ink, Roblox thumbnail style), W x W canvas, transparent
  const ink = '#141414', L = W * 0.03; g.lineCap = g.lineJoin = 'round'
  const eye = (x, y, rx, ry, px, py, pr) => { g.fillStyle = '#fff'; g.strokeStyle = ink; g.lineWidth = L; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.stroke()
    g.fillStyle = ink; g.beginPath(); g.arc(x + px, y + py, pr, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + px - pr * 0.35, y + py - pr * 0.35, pr * 0.3, 0, 7); g.fill() }
  const brow = (x0, y0, x1, y1, bend) => { g.strokeStyle = ink; g.lineWidth = L * 1.3; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - bend, x1, y1); g.stroke() }
  const mouth = (x, y, rx, ry, teeth) => { g.fillStyle = '#5a0f12'; g.strokeStyle = ink; g.lineWidth = L; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill()
    g.save(); g.clip(); g.fillStyle = '#ff6f86'; g.beginPath(); g.ellipse(x, y + ry * 0.75, rx * 0.75, ry * 0.55, 0, 0, 7); g.fill()
    if (teeth) { g.fillStyle = '#fff'; g.fillRect(x - rx, y - ry, rx * 2, ry * 0.32) } g.restore(); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.stroke() }
  const c = W / 2
  if (kind === 'grin') { eye(c - W * 0.17, W * 0.38, W * 0.09, W * 0.1, 0, 0, W * 0.035); eye(c + W * 0.17, W * 0.38, W * 0.09, W * 0.1, 0, 0, W * 0.035)
    g.fillStyle = '#fff'; g.strokeStyle = ink; g.lineWidth = L; g.beginPath(); g.moveTo(c - W * 0.28, W * 0.6); g.quadraticCurveTo(c, W * 0.95, c + W * 0.28, W * 0.6); g.closePath(); g.fill(); g.stroke(); return }
  if (kind === 'cry') { brow(c - W * 0.3, W * 0.28, c - W * 0.08, W * 0.36, -W * 0.03); brow(c + W * 0.08, W * 0.36, c + W * 0.3, W * 0.28, -W * 0.03)
    g.strokeStyle = ink; g.lineWidth = L * 1.4; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(c + sx * W * 0.28, W * 0.4); g.lineTo(c + sx * W * 0.12, W * 0.45); g.lineTo(c + sx * W * 0.28, W * 0.5); g.stroke() }
    g.fillStyle = '#5fc8ff'; for (const sx of [-1, 1]) g.fillRect(c + sx * W * 0.2 - W * 0.03, W * 0.5, W * 0.06, W * 0.3)
    mouth(c, W * 0.72, W * 0.16, W * 0.09, true); return }
  const scared = kind === 'scared'                                                  // shocked (default) / scared: wide eyes, open mouth
  brow(c - W * 0.32, W * 0.2, c - W * 0.08, W * 0.17, W * 0.06); brow(c + W * 0.08, W * 0.17, c + W * 0.32, W * 0.2, W * 0.06)
  eye(c - W * 0.18, W * 0.38, W * 0.13, W * 0.15, 0, scared ? -W * 0.02 : W * 0.01, W * 0.04); eye(c + W * 0.18, W * 0.38, W * 0.13, W * 0.15, 0, scared ? -W * 0.02 : W * 0.01, W * 0.04)
  mouth(c, W * 0.72, W * (scared ? 0.17 : 0.13), W * (scared ? 0.11 : 0.15), scared)
}

function backdrop(g, b, x0, y0, w, h) {    // shapes behind the words: badge circles, rounded panels, sunbursts, speed lines, gauges
  const cx = x0 + w / 2, cy = y0 + h / 2, r = Math.min(w, h) / 2, bw = (b.borderW ?? 0.06) * PX
  g.save(); g.lineJoin = 'round'
  if (b.shape === 'burst' || b.shape === 'lines') {
    const n = b.rays || 18, cols = [].concat(b.fill || ['#ffd21f']), R = Math.hypot(w, h) / 2
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, da = Math.PI / n * (b.shape === 'lines' ? 0.12 : 0.55), r0 = b.shape === 'lines' ? R * 0.55 : 0
      const gr = g.createRadialGradient(cx, cy, r0, cx, cy, R); gr.addColorStop(0, cols[i % cols.length]); gr.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = gr; g.beginPath(); g.moveTo(cx + Math.cos(a - da) * r0, cy + Math.sin(a - da) * r0); g.lineTo(cx + Math.cos(a - da) * R, cy + Math.sin(a - da) * R)
      g.lineTo(cx + Math.cos(a + da) * R, cy + Math.sin(a + da) * R); g.lineTo(cx + Math.cos(a + da) * r0, cy + Math.sin(a + da) * r0); g.closePath(); g.fill()
    }
  } else {
    g.beginPath()
    if (b.shape === 'round') { if (g.roundRect) g.roundRect(x0 + bw, y0 + bw, w - 2 * bw, h - 2 * bw, Math.min(w, h) * 0.18); else g.rect(x0 + bw, y0 + bw, w - 2 * bw, h - 2 * bw) }
    else g.arc(cx, cy, r - bw, 0, Math.PI * 2)
    const f = [].concat(b.fill || ['#1b1d26']), gr = g.createLinearGradient(0, y0, 0, y0 + h); f.forEach((col, i) => gr.addColorStop(f.length > 1 ? i / (f.length - 1) : 0, col))
    g.fillStyle = gr; g.fill(); if (b.border) { g.strokeStyle = b.border; g.lineWidth = bw * 2; g.stroke() }
    if (b.shape === 'gauge') {                    // speedometer: ticks round the top, a red needle at `value` (0..1)
      g.strokeStyle = '#ffffff'; g.lineCap = 'round'
      for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.8 + 1.4 * i / 10); g.lineWidth = i % 5 ? r * 0.025 : r * 0.05; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72); g.lineTo(cx + Math.cos(a) * r * 0.84, cy + Math.sin(a) * r * 0.84); g.stroke() }
      const a = Math.PI * (0.8 + 1.4 * (b.value ?? 0.95)); g.strokeStyle = '#ff2a2a'; g.lineWidth = r * 0.07; g.beginPath(); g.moveTo(cx, cy + r * 0.35); g.lineTo(cx + Math.cos(a) * r * 0.78, cy + r * 0.35 + Math.sin(a) * r * 0.5); g.stroke()
    }
  }
  g.restore()
}

function paint(o) {
  const t = o.userData.tx, m = o.userData.card, lines = t.text ? t.text.split('\n') : []
  const c = document.createElement('canvas'), g = c.getContext('2d'), font = `${PX}px "${t.font}", Impact, "Arial Black", sans-serif`
  g.font = font
  const o2 = t.outline2 ? t.outline2W * PX : 0, sw = t.stroke ? t.strokeW * PX : 0, sh = t.shadow ? Math.hypot(...t.shadowOff) * PX : 0, gl = t.glow ? 0.35 * PX : 0
  const dp = t.depth * PX, sk = Math.tan(t.skew * Math.PI / 180), pad = Math.ceil(sw + o2 + sh + gl + dp + 8), lh = PX * 1.08
  const tw = lines.length ? Math.max(...lines.map(s => g.measureText(s).width)) + Math.abs(sk) * lh * lines.length : 0
  const bw = t.bg?.w ? t.bg.w * PX : 0, bh = t.bg?.h ? t.bg.h * PX : 0
  c.width = Math.ceil(Math.max(tw + 2 * pad, bw, t.draw ? 4 * PX : 0, 8)); c.height = Math.ceil(Math.max(lh * lines.length + 2 * pad, bh, t.draw ? 4 * PX : 0, 8))
  if (t.bg) backdrop(g, t.bg, 0, 0, c.width, c.height)
  if (t.draw) face(g, Math.min(c.width, c.height), t.draw)
  const top = (c.height - lh * lines.length) / 2 - (lines.length ? 0 : 0)
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.miterLimit = 2
  const each = (fn) => lines.forEach((s, i) => { const y = top + lh * (i + 0.5); g.save(); g.translate(c.width / 2, y); g.transform(1, 0, -sk, 1, 0, 0); fn(s, 0, PX * 0.04); g.restore() })
  if (t.glow) { g.save(); g.shadowColor = t.glow; g.shadowBlur = gl; g.fillStyle = t.glow; each((s, x, y) => { g.lineWidth = sw * 2; g.strokeStyle = t.glow; g.strokeText(s, x, y); g.fillText(s, x, y) }); g.restore() }
  if (t.outline2) { g.strokeStyle = t.outline2; g.lineWidth = (sw + o2) * 2; for (let k = 0; k <= Math.ceil(dp / 4); k++) { g.save(); g.translate(0, Math.min(k * 4, dp)); each((s, x, y) => g.strokeText(s, x, y)); g.restore() } }
  if (t.shadow) { g.save(); g.translate(t.shadowOff[0] * PX, t.shadowOff[1] * PX + dp); g.fillStyle = g.strokeStyle = t.shadow; g.lineWidth = sw * 2; each((s, x, y) => { if (sw) g.strokeText(s, x, y); g.fillText(s, x, y) }); g.restore() }
  if (dp) { g.fillStyle = g.strokeStyle = t.depthColor || t.stroke || '#000'; g.lineWidth = sw * 2; for (let k = Math.ceil(dp / 3); k > 0; k--) { g.save(); g.translate(0, Math.min(k * 3, dp)); each((s, x, y) => { if (sw) g.strokeText(s, x, y); g.fillText(s, x, y) }); g.restore() } }
  if (sw) { g.strokeStyle = t.stroke; g.lineWidth = sw * 2; each((s, x, y) => g.strokeText(s, x, y)) }
  const gr = g.createLinearGradient(0, -PX * 0.42, 0, PX * 0.46)                    // per line: top colour to bottom colour
  t.fill.forEach((col, i) => gr.addColorStop(t.fill.length > 1 ? i / (t.fill.length - 1) : 0, col))
  g.fillStyle = gr; each((s, x, y) => g.fillText(s, x, y))
  g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.28; g.fillStyle = '#ffffff'    // glossy top half, the Roblox plastic shine
  each((s, x, y) => { g.beginPath(); g.rect(-c.width, -PX * 0.5, 2 * c.width, PX * 0.42); g.clip(); g.fillText(s, x, y) }); g.restore()
  const old = m.material.map; m.material.map = new THREE.CanvasTexture(c); m.material.map.colorSpace = THREE.SRGBColorSpace; m.material.map.anisotropy = 4
  m.material.needsUpdate = true; old?.dispose()
  m.scale.set(t.size * c.width / lh, t.size * c.height / lh, 1)
  o.userData.app?.viewport?.requestRender?.()
}

function setup(o, obj) {
  const prev = o.userData.tx, t = spec(obj), m = o.userData.card
  o.userData.tx = t
  m.material.depthTest = !t.overlay; m.renderOrder = (t.overlay ? 20 : 0) + t.order
  if (!prev || ['text', 'font', 'size', 'fill', 'stroke', 'strokeW', 'shadow', 'shadowOff', 'glow', 'skew', 'outline2', 'outline2W', 'depth', 'depthColor', 'bg', 'draw'].some(k => JSON.stringify(prev[k]) !== JSON.stringify(t[k]))) paint(o)
}

export default {
  id: 'text', name: 'Text',
  commands: {
    'text.add': {
      label: 'Text', icon: 'type',
      run(app, a = {}) {   // {text, font, size, fill, ...}: at the view's centre, facing the camera
        return app.transact('Add text', () => { const id = app.add({ type: 'text', name: a.text || 'Text', pos: a.pos || [0, 3, 0], ...a }); app.select([id]); return id })
      }
    }
  },
  types: {
    text: {
      defaults: { text: 'TEXT', font: 'Luckiest Guy', size: 1, fill: ['#fff36b', '#ff9a1f'], stroke: '#000000', strokeW: 0.12, shadow: '#000000',
        shadowOff: [0.05, 0.08], glow: null, skew: 0, tilt: 0, face: 'camera', overlay: true },
      build(obj, app) {
        askFonts()
        const o = new THREE.Group(), m = new THREE.Mesh(card, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }))
        m.raycast = () => {}; m.castShadow = m.receiveShadow = false
        m.onBeforeRender = (r, s, cam) => {                     // camera-facing, then rolled by `tilt` on screen
          const t = o.userData.tx
          if (t.face !== 'camera') { m.quaternion.setFromAxisAngle(_z, t.tilt * Math.PI / 180) }
          else { m.parent.getWorldQuaternion(_q).invert(); m.quaternion.copy(_q.multiply(cam.quaternion)).multiply(_r.setFromAxisAngle(_z, t.tilt * Math.PI / 180)) }
          m.updateMatrix(); m.matrixWorld.multiplyMatrices(m.parent.matrixWorld, m.matrix)
        }
        o.add(m); o.userData.card = m; o.userData.app = app
        live.add(o); setup(o, obj)
        return o
      },
      update(o3d, obj) { setup(o3d, obj); return o3d }
    }
  }
}
