// Interface mode: a Roblox-style GUI editor. Objects of type `gui` mirror Roblox's UI tree (ScreenGui > Frame / TextLabel /
// TextButton / ImageLabel) with UDim2 position and size, AnchorPoint, Rotation, UICorner, UIStroke, UIGradient, drop shadow,
// UIListLayout / UIGridLayout, plus animated backgrounds and the common Roblox UI VFX (float, pulse, spin, shine sweep, glow,
// rainbow, sparkles, wiggle, pop-in, hover grow, press squash, typewriter, count-up). It renders as live DOM over the 3D view
// on a phone / tablet / PC screen, so the scene shows behind the UI like in game. Everything is a normal scene object: it saves,
// syncs, undoes and can be driven by AIs (ui.add, ui.template) like the rest of Studio. Not drawn in the 3D view.
//
// Fields (all optional; units are Roblox pixels on the chosen device):
//   kind 'screen'|'frame'|'text'|'button'|'image'
//   p [xScale, xOffset, yScale, yOffset] position · s [...] size · a [ax, ay] anchor · r rotation°
//   bg colour · bga background transparency 0..1 · cr corner radius px · clip (ClipsDescendants)
//   stroke {c, t, a} · grad {stops [[t, colour]...], rot°, spin °/s} · shadow {c, a, x, y, b}
//   text, font, ts (size px), tc colour, tsk {c, t} text stroke, tds {c, y} hard text drop shadow, ta 'left'|'center'|'right', tsc (scale text to fit)
//   glyph (built-in icon: see GLYPHS) or img (tex-store id), it 'stretch'|'fit'|'crop'|'tile'|'slice', tile [w, h], slice px, ic tint, iga transparency
//   layout {type 'list'|'grid', dir 'v'|'h', gap, cell [w, h], align 'start'|'center'|'end', pad}
//   bgfx {type 'pattern'|'sunburst'|'particles', ...} · fx [{type, ...}]
import * as THREE from 'three'
import { addIcons, icon } from '../core/ui.js'

addIcons({
  ui: 'M2.5 3.5h11v9h-11z M2.5 6h11 M4.5 8.5h3 M4.5 10.5h5',
  sparkle: 'M8 2l1.3 3.7L13 7l-3.7 1.3L8 12l-1.3-3.7L3 7l3.7-1.3z M12.5 11.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z'
})

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const clone = v => JSON.parse(JSON.stringify(v))
const TAU = Math.PI * 2

export const DEVICES = {
  phone: { label: 'Phone (landscape)', w: 844, h: 390 },
  phoneTall: { label: 'Phone (portrait)', w: 390, h: 844 },
  tablet: { label: 'Tablet', w: 1180, h: 820 },
  pc: { label: 'PC', w: 1920, h: 1080 }
}
// Roblox fonts -> closest Google Fonts face (weight); loaded on first use.
export const FONTS = {
  FredokaOne: ['Fredoka', 700], LuckiestGuy: ['Luckiest Guy', 400], Bangers: ['Bangers', 400], GothamBlack: ['Montserrat', 900],
  GothamBold: ['Montserrat', 700], Gotham: ['Montserrat', 500], TitanOne: ['Titan One', 400], LilitaOne: ['Lilita One', 400],
  BuilderSans: ['Nunito', 700], Arcade: ['Press Start 2P', 400], Creepster: ['Creepster', 400], PermanentMarker: ['Permanent Marker', 400], Oswald: ['Oswald', 600]
}
const fontsAsked = new Set()
function useFont(key) {
  const f = FONTS[key] || FONTS.FredokaOne
  if (!fontsAsked.has(f[0])) {
    fontsAsked.add(f[0])
    try { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${f[0].replace(/ /g, '+')}:wght@${f[1]}&display=swap`; document.head.append(l) } catch {}
  }
  return `font-family:"${f[0]}",system-ui,sans-serif;font-weight:${f[1]}`
}

// Built-in icons (flat colours + 2.5 px dark outline, the Roblox simulator style), as SVG.
const O = 'stroke="#1b1b1b" stroke-width="2.5" stroke-linejoin="round"'
export const GLYPHS = {
  coin: `<circle cx="24" cy="24" r="19" fill="#ffc93c" ${O}/><circle cx="24" cy="24" r="12" fill="#ffe27a" stroke="#d89a00" stroke-width="2"/><path d="M21 17h6v14h-6z" fill="#d89a00"/>`,
  gem: `<path d="M12 8h24l8 10-20 24L4 18z" fill="#4aa8ff" ${O}/><path d="M4 18h40M18 8l-4 10 10 24 10-24-4-10" fill="none" stroke="#1b1b1b" stroke-width="2"/><path d="M14 18l4-10h12l4 10z" fill="#9ad3ff"/>`,
  star: `<path d="M24 4l6 13 14 1-11 9 4 14-13-8-13 8 4-14L4 18l14-1z" fill="#ffd23f" ${O}/>`,
  heart: `<path d="M24 42S6 30 6 17a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 13-18 25-18 25z" fill="#ff4f6d" ${O}/>`,
  boot: `<path d="M14 6h12v20l14 6v10H8V30z" fill="#4fd17a" ${O}/><path d="M8 36h32" stroke="#1b1b1b" stroke-width="2.5"/><path d="M14 14h12" stroke="#2f9e47" stroke-width="3"/>`,
  clover: `<g fill="#3fdc6a" ${O}><circle cx="17" cy="17" r="8"/><circle cx="31" cy="17" r="8"/><circle cx="17" cy="31" r="8"/><circle cx="31" cy="31" r="8"/></g><path d="M24 24l8 18" stroke="#1f9a45" stroke-width="3" stroke-linecap="round"/>`,
  potion: `<path d="M19 5h10v10l10 14a10 10 0 0 1-8 16H17a10 10 0 0 1-8-16l10-14z" fill="#b46cff" ${O}/><path d="M12 31h24" stroke="#fff" stroke-opacity=".6" stroke-width="3"/><rect x="18" y="3" width="12" height="5" rx="1.5" fill="#c98a4a" ${O}/>`,
  shovel: `<path d="M22 4h4v22h-4z" fill="#a0683a" ${O}/><path d="M14 26h20v6a10 10 0 0 1-20 0z" fill="#ffd23f" ${O}/><rect x="18" y="2" width="12" height="6" rx="2" fill="#a0683a" ${O}/>`,
  rainbow: `<g fill="none" stroke-linecap="round" stroke-width="5"><path d="M6 38a18 18 0 0 1 36 0" stroke="#ff4f4f"/><path d="M12 38a12 12 0 0 1 24 0" stroke="#ffd23f"/><path d="M18 38a6 6 0 0 1 12 0" stroke="#4aa8ff"/></g>`,
  paw: `<g fill="#ffab6a" ${O}><ellipse cx="24" cy="31" rx="10" ry="8"/><circle cx="12" cy="20" r="4.5"/><circle cx="20" cy="13" r="4.5"/><circle cx="28" cy="13" r="4.5"/><circle cx="36" cy="20" r="4.5"/></g>`,
  gift: `<rect x="7" y="18" width="34" height="24" rx="3" fill="#ff5a7a" ${O}/><rect x="5" y="12" width="38" height="9" rx="2" fill="#ff7a94" ${O}/><path d="M24 12v30" stroke="#ffd23f" stroke-width="5"/><path d="M24 12c-4-8-12-6-9 0zM24 12c4-8 12-6 9 0z" fill="#ffd23f" ${O}/>`,
  lock: `<rect x="9" y="21" width="30" height="21" rx="4" fill="#ffc93c" ${O}/><path d="M15 21v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#1b1b1b" stroke-width="3"/>`,
  cart: `<path d="M4 8h7l5 22h22l4-16H14" fill="none" ${O}/><path d="M14 14h28l-4 16H16z" fill="#4fd17a" ${O}/><circle cx="19" cy="38" r="3.5" fill="#fff" ${O}/><circle cx="35" cy="38" r="3.5" fill="#fff" ${O}/>`
}
const glyphURL = k => GLYPHS[k] ? 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${GLYPHS[k]}</svg>`) : null

const DEF = { kind: 'frame', p: [0.5, 0, 0.5, 0], s: [0, 200, 0, 100], a: [0.5, 0.5], r: 0, bg: '#ffffff', bga: 0, cr: 12, clip: false,
  stroke: null, grad: null, shadow: null, text: '', font: 'FredokaOne', ts: 24, tc: '#ffffff', tsk: null, tds: null, ta: 'center', tsc: false,
  glyph: null, img: null, it: 'fit', tile: [64, 64], slice: 16, ic: '#ffffff', iga: 0, layout: null, bgfx: null, fx: [] }
const g = (o, k) => o[k] ?? DEF[k]

// ---------- effect catalogue (params: [key, label, kind, default, min, max, step]) ----------
export const FX = {
  float: { label: 'Float (bob)', params: [['amp', 'Height px', 'n', 8, 0, 60, 1], ['period', 'Seconds', 'n', 2.4, 0.2, 10, 0.1], ['phase', 'Phase', 'n', 0, 0, 1, 0.05]] },
  pulse: { label: 'Pulse (scale)', params: [['amp', 'Amount', 'n', 0.06, 0, 0.5, 0.01], ['period', 'Seconds', 'n', 1.2, 0.2, 10, 0.1]] },
  spin: { label: 'Spin', params: [['speed', 'Degrees / s', 'n', 30, -720, 720, 5]] },
  wiggle: { label: 'Wiggle (attention)', params: [['amp', 'Degrees', 'n', 8, 0, 45, 1], ['every', 'Every s', 'n', 3, 0.5, 20, 0.5]] },
  gloss: { label: 'Gloss highlight', params: [['alpha', 'Strength', 'n', 0.28, 0, 1, 0.02], ['angle', 'Angle', 'n', 20, -60, 60, 1]] },
  shine: { label: 'Shine sweep', params: [['dur', 'Sweep s', 'n', 1, 0.2, 5, 0.1], ['gap', 'Gap s', 'n', 2.5, 0, 20, 0.5], ['angle', 'Angle', 'n', 25, -80, 80, 1], ['width', 'Width %', 'n', 22, 5, 80, 1], ['alpha', 'Strength', 'n', 0.55, 0, 1, 0.05]] },
  glow: { label: 'Glow', params: [['c', 'Colour', 'c', '#ffe066'], ['size', 'Size px', 'n', 18, 0, 80, 1], ['pulse', 'Pulse s (0 = still)', 'n', 1.4, 0, 10, 0.1]] },
  rainbow: { label: 'Rainbow', params: [['speed', 'Degrees / s', 'n', 120, 10, 720, 10]] },
  sparkles: { label: 'Sparkles', params: [['count', 'Count', 'n', 6, 1, 30, 1], ['c', 'Colour', 'c', '#fff6b0'], ['size', 'Size px', 'n', 14, 4, 60, 1], ['period', 'Twinkle s', 'n', 1.6, 0.3, 6, 0.1]] },
  popin: { label: 'Pop in (open)', params: [['dur', 'Seconds', 'n', 0.45, 0.1, 2, 0.05], ['delay', 'Delay s', 'n', 0, 0, 5, 0.05]] },
  slidein: { label: 'Slide in (open)', params: [['dur', 'Seconds', 'n', 0.4, 0.1, 2, 0.05], ['delay', 'Delay s', 'n', 0, 0, 5, 0.05], ['from', 'From px (y)', 'n', 60, -600, 600, 10]] },
  hover: { label: 'Hover grow', params: [['scale', 'Scale', 'n', 1.08, 1, 1.5, 0.01]] },
  press: { label: 'Press squash', params: [['scale', 'Scale', 'n', 0.92, 0.5, 1, 0.01]] },
  typewriter: { label: 'Typewriter', params: [['cps', 'Letters / s', 'n', 35, 5, 200, 5], ['hold', 'Hold s', 'n', 2, 0, 10, 0.5]] },
  countup: { label: 'Count up', params: [['dur', 'Seconds', 'n', 1.2, 0.1, 10, 0.1], ['hold', 'Hold s', 'n', 2.5, 0, 20, 0.5]] }
}
export const BGFX = {
  pattern: { label: 'Scrolling pattern', params: [['shape', 'Shape', 's', 'stars', ['stars', 'dots', 'checker', 'stripes', 'hearts', 'diamonds', 'plus']], ['c', 'Pattern colour', 'c', '#ffffff'], ['alpha', 'Pattern strength', 'n', 0.18, 0, 1, 0.02], ['tile', 'Tile px', 'n', 64, 16, 256, 4], ['dx', 'Speed x', 'n', 20, -200, 200, 2], ['dy', 'Speed y', 'n', 20, -200, 200, 2], ['rot', 'Angle', 'n', 0, -45, 45, 1]] },
  sunburst: { label: 'Sunburst rays', params: [['rays', 'Rays', 'n', 16, 4, 48, 1], ['c', 'Ray colour', 'c', '#ffffff'], ['alpha', 'Strength', 'n', 0.25, 0, 1, 0.02], ['speed', 'Degrees / s', 'n', 12, -120, 120, 1], ['fade', 'Edge fade', 'n', 0.75, 0, 1, 0.05]] },
  particles: { label: 'Floating particles', params: [['count', 'Count', 'n', 24, 1, 120, 1], ['c', 'Colour', 'c', '#ffffff'], ['alpha', 'Strength', 'n', 0.6, 0, 1, 0.05], ['size', 'Size px', 'n', 8, 2, 40, 1], ['speed', 'Rise px / s', 'n', 30, -200, 200, 5], ['shape', 'Shape', 's', 'dot', ['dot', 'star', 'bubble']]] }
}
const fxDefaults = (cat, type) => Object.fromEntries(cat[type].params.map(p => [p[0], p[3]]))

// ---------- maths ----------
const backOut = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2)
const expoOut = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
const clamp01 = t => Math.max(0, Math.min(1, t))
const hexA = (hex, a) => { const n = parseInt(String(hex || '#ffffff').slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${(+a).toFixed(3)})` }
let seed = 1
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }

// Rect of a node inside its parent (Roblox rules: size = scale * parent + offset; position minus anchor * size).
function rectIn(o, pw, ph) {
  const s = g(o, 's'), p = g(o, 'p'), a = g(o, 'a')
  const w = Math.max(0, s[0] * pw + s[1]), hh = Math.max(0, s[2] * ph + s[3])
  return { x: p[0] * pw + p[1] - a[0] * w, y: p[2] * ph + p[3] - a[1] * hh, w, h: hh }
}
// Layout containers place children in order and ignore their Position (UIListLayout / UIGridLayout).
function layoutRects(lay, kids, pw, ph) {
  const pad = lay.pad ?? 8, gap = lay.gap ?? 8, out = new Map(), al = lay.align || 'center'
  if (lay.type === 'grid') {
    const [cw, ch] = lay.cell || [100, 100], cols = Math.max(1, Math.floor((pw - 2 * pad + gap) / (cw + gap)))
    const used = cols * cw + (cols - 1) * gap, x0 = al === 'start' ? pad : al === 'end' ? pw - pad - used : (pw - used) / 2
    kids.forEach(([id], i) => out.set(id, { x: x0 + (i % cols) * (cw + gap), y: pad + Math.floor(i / cols) * (ch + gap), w: cw, h: ch }))
  } else {
    const v = lay.dir !== 'h'
    let cur = pad
    const sizes = kids.map(([id, o]) => { const r = rectIn(o, pw - 2 * pad, ph - 2 * pad); return [id, r.w, r.h] })
    const total = sizes.reduce((n, [, w, hh]) => n + (v ? hh : w), 0) + gap * Math.max(0, sizes.length - 1)
    if (al === 'center') cur = ((v ? ph : pw) - total) / 2; else if (al === 'end') cur = (v ? ph : pw) - pad - total
    for (const [id, w, hh] of sizes) {
      const cross = v ? (pw - w) / 2 : (ph - hh) / 2
      out.set(id, v ? { x: cross, y: cur, w, h: hh } : { x: cur, y: cross, w, h: hh })
      cur += (v ? hh : w) + gap
    }
  }
  return out
}

// Procedural tile for scrolling pattern backgrounds (one PNG per shape/colour, cached).
const tiles = new Map()
function patternTile(shape, c, alpha, tile) {
  const key = [shape, c, alpha, tile].join('|')
  if (tiles.has(key)) return tiles.get(key)
  const N = Math.max(16, Math.round(tile)), cv = document.createElement('canvas'); cv.width = cv.height = N
  const x = cv.getContext('2d'); x.fillStyle = hexA(c, alpha); x.strokeStyle = hexA(c, alpha)
  const star = (cx, cy, r, k = 5) => { x.beginPath(); for (let i = 0; i < k * 2; i++) { const a = i * Math.PI / k - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) } x.closePath(); x.fill() }
  const m = N / 2
  if (shape === 'stars') { star(m * 0.5, m * 0.5, N * 0.16); star(m * 1.5, m * 1.5, N * 0.16) }
  else if (shape === 'dots') { for (const [px, py] of [[m * 0.5, m * 0.5], [m * 1.5, m * 1.5]]) { x.beginPath(); x.arc(px, py, N * 0.1, 0, TAU); x.fill() } }
  else if (shape === 'checker') { x.fillRect(0, 0, m, m); x.fillRect(m, m, m, m) }
  else if (shape === 'stripes') { x.beginPath(); x.moveTo(0, 0); x.lineTo(m * 0.5, 0); x.lineTo(N, m * 1.5); x.lineTo(N, N); x.lineTo(m * 1.5, N); x.lineTo(0, m * 0.5); x.closePath(); x.fill(); x.beginPath(); x.moveTo(m * 1.5, 0); x.lineTo(N, 0); x.lineTo(N, m * 0.5); x.closePath(); x.fill(); x.beginPath(); x.moveTo(0, m * 1.5); x.lineTo(m * 0.5, N); x.lineTo(0, N); x.closePath(); x.fill() }
  else if (shape === 'hearts') { for (const [cx, cy] of [[m * 0.5, m * 0.55], [m * 1.5, m * 1.55]]) { const r = N * 0.09; x.beginPath(); x.arc(cx - r, cy - r * 0.4, r, Math.PI, 0); x.arc(cx + r, cy - r * 0.4, r, Math.PI, 0); x.lineTo(cx, cy + r * 1.6); x.closePath(); x.fill() } }
  else if (shape === 'diamonds') { for (const [cx, cy] of [[m * 0.5, m * 0.5], [m * 1.5, m * 1.5]]) { const r = N * 0.14; x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r * 0.7, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r * 0.7, cy); x.closePath(); x.fill() } }
  else { for (const [cx, cy] of [[m * 0.5, m * 0.5], [m * 1.5, m * 1.5]]) { const r = N * 0.12, t = N * 0.04; x.fillRect(cx - r, cy - t, 2 * r, 2 * t); x.fillRect(cx - t, cy - r, 2 * t, 2 * r) } }
  const url = cv.toDataURL(); tiles.set(key, url); return url
}

const CSS = `
.uix{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none}
.uix[hidden]{display:none}
.uix-bar{display:flex;gap:6px;align-items:center;padding:8px 10px;flex-wrap:wrap;color:#e8edf5;font:12px system-ui,sans-serif;background:rgba(14,17,23,.85);position:relative;z-index:2}
.uix-bar select,.uix-bar button{font:inherit;color:inherit;background:#1c222c;border:1px solid #2f3846;border-radius:8px;padding:5px 9px;cursor:pointer}
.uix-bar button.on{background:#2b59d9;border-color:#2b59d9}
.uix-bar .grow{flex:1}
.uix-stage{flex:1;position:relative;overflow:hidden;min-height:0}
.uix-dev{position:absolute;left:0;top:0;transform-origin:0 0;outline:2px solid rgba(255,255,255,.35);box-shadow:0 0 0 100vmax rgba(10,12,16,.6);overflow:hidden}
.uix-dev.opaque{background:#3a4150}
.gx{position:absolute;box-sizing:border-box;transform-origin:50% 50%}
.gx-fill{position:absolute;inset:0;border-radius:inherit;pointer-events:none}
.gx-clip{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none}
.gx-t{position:absolute;inset:0;display:flex;align-items:center;padding:0 6px;line-height:1.05;white-space:pre-wrap;pointer-events:none;paint-order:stroke fill;overflow-wrap:anywhere}
.gx-img{position:absolute;inset:0;pointer-events:none;background-repeat:no-repeat;background-position:center}
.gx-sp{position:absolute;pointer-events:none;width:0;height:0}
.gx-sp i{position:absolute;left:0;top:0;transform:translate(-50%,-50%)}
.uix-sel{position:absolute;inset:0;pointer-events:none}
.uix-box{position:absolute;outline:1.5px solid #3d8bfd;outline-offset:0}
.uix-box.hov{outline:1px dashed rgba(61,139,253,.8)}
.uix-hd{position:absolute;width:10px;height:10px;margin:-5px 0 0 -5px;background:#fff;border:1.5px solid #3d8bfd;border-radius:2px;pointer-events:auto}
.uix-guide{position:absolute;background:#ff4fa3;pointer-events:none}
.uix-empty{position:absolute;inset:0;display:grid;place-items:center;color:#cfd6e2;font:14px system-ui,sans-serif;text-align:center;pointer-events:none}
`

// ---------- renderer ----------
function createEditor(app) {
  const st = { device: app.prefs.uiDevice || 'phone', play: false, playT0: 0, scale: 1, rects: new Map(), nodes: new Map(), hover: null, scene3d: app.prefs.ui3d !== false, raf: 0, images: new Map() }
  const style = h('style'); style.textContent = CSS; document.head.append(style)
  const root = h('div', 'uix'); root.hidden = true
  const bar = h('div', 'uix-bar'), stage = h('div', 'uix-stage'), dev = h('div', 'uix-dev'), sel = h('div', 'uix-sel')
  root.append(bar, stage); stage.append(dev); dev.append(sel)
  const empty = h('div', 'uix-empty', 'No interface yet.<br>Add a Screen, Frame, Button or a template from the Interface panel.')
  const mount = () => { const vp = app.ui?.viewportEl?.(); if (vp && root.parentNode !== vp) vp.append(root) }

  function buildBar() {
    bar.innerHTML = ''
    const ds = h('select'); ds.setAttribute('aria-label', 'Device')
    ds.innerHTML = Object.entries(DEVICES).map(([k, d]) => `<option value="${k}">${esc(d.label)} · ${d.w}×${d.h}</option>`).join('')
    ds.value = st.device; ds.onchange = () => { st.device = ds.value; app.setPref('uiDevice', st.device); fit(); render() }
    const play = h('button', st.play ? 'on' : '', `${icon(st.play ? 'pause' : 'play')}<span> ${st.play ? 'Stop' : 'Play'}</span>`)
    play.onclick = () => togglePlay()
    const s3 = h('button', st.scene3d ? 'on' : '', 'Game behind'); s3.title = 'Show the 3D scene behind the interface'
    s3.onclick = () => { st.scene3d = !st.scene3d; app.setPref('ui3d', st.scene3d); buildBar(); render() }
    const back = h('button', '', 'Back to Build'); back.onclick = () => app.setMode('build')
    bar.append(ds, play, s3, h('span', 'grow'), back)
  }
  function togglePlay(on = !st.play) { st.play = on; st.playT0 = performance.now(); buildBar(); render() }

  function fit() {
    const d = DEVICES[st.device] || DEVICES.phone, r = stage.getBoundingClientRect()
    st.scale = Math.max(0.05, Math.min((r.width - 24) / d.w, (r.height - 24) / d.h))
    dev.style.width = d.w + 'px'; dev.style.height = d.h + 'px'
    dev.style.transform = `translate(${(r.width - d.w * st.scale) / 2}px,${(r.height - d.h * st.scale) / 2}px) scale(${st.scale})`
  }

  const gui = () => app.ids().filter(id => app.obj(id)?.type === 'gui')
  const kids = id => app.children(id).filter(c => app.obj(c)?.type === 'gui')
  const roots = () => app.children(null).filter(c => app.obj(c)?.type === 'gui')

  function imageURL(id) {
    if (!id) return null
    if (st.images.has(id)) return st.images.get(id)
    st.images.set(id, null)
    app.tex.get(id).then(d => { if (d?.data) { st.images.set(id, d.data); render() } })
    return null
  }

  function paint(el, o) {
    const fill = el._fill, kind = g(o, 'kind'), bga = g(o, 'bga'), grad = g(o, 'grad')
    el.style.borderRadius = g(o, 'cr') + 'px'
    const shadows = []
    const sh = g(o, 'shadow'); if (sh) shadows.push(`${sh.x ?? 0}px ${sh.y ?? 4}px ${sh.b ?? 0}px ${hexA(sh.c || '#000000', sh.a ?? 0.35)}`)
    const sk = g(o, 'stroke'); if (sk && sk.t > 0) shadows.push(`0 0 0 ${sk.t}px ${hexA(sk.c || '#000000', 1 - (sk.a ?? 0))}`)
    el._baseShadow = shadows
    if (kind === 'screen') { fill.style.background = 'none'; return }
    fill.style.opacity = String(1 - bga)
    if (grad?.stops?.length) fill.style.background = `linear-gradient(${(grad.rot ?? 90) + 90}deg, ${grad.stops.map(([t, c]) => `${c} ${(t * 100).toFixed(1)}%`).join(', ')})`
    else fill.style.background = g(o, 'bg')
    // background effects layer
    const bfx = g(o, 'bgfx'); el._bg.innerHTML = ''; el._bgfx = null
    if (bfx && BGFX[bfx.type]) {
      const p = { ...fxDefaults(BGFX, bfx.type), ...bfx }
      if (p.type === 'pattern') {
        const d = h('div'); d.style.cssText = `position:absolute;inset:-${p.tile * 2}px;background-image:url(${patternTile(p.shape, p.c, p.alpha, p.tile)});background-size:${p.tile}px ${p.tile}px;transform:rotate(${p.rot}deg)`
        el._bg.append(d); el._bgfx = { p, d }
      } else if (p.type === 'sunburst') {
        const d = h('div'), n = Math.max(2, Math.round(p.rays)), step = 360 / n, half = step / 2
        d.style.cssText = `position:absolute;left:50%;top:50%;width:300%;aspect-ratio:1;translate:-50% -50%;background:repeating-conic-gradient(${hexA(p.c, p.alpha)} 0deg ${half}deg, transparent ${half}deg ${step}deg);-webkit-mask:radial-gradient(circle, #000 ${((1 - p.fade) * 30).toFixed(1)}%, transparent 34%);mask:radial-gradient(circle, #000 ${((1 - p.fade) * 30).toFixed(1)}%, transparent 34%)`
        el._bg.append(d); el._bgfx = { p, d }
      } else if (p.type === 'particles') {
        seed = 7; const ps = []
        for (let i = 0; i < p.count; i++) {
          const d = h('div'), sz = p.size * (0.6 + rnd() * 0.8)
          d.style.cssText = `position:absolute;left:0;top:0;width:${sz}px;height:${sz}px;border-radius:50%;` + (p.shape === 'bubble' ? `border:${Math.max(1, sz / 6)}px solid ${hexA(p.c, p.alpha)}` : p.shape === 'star' ? `background:${hexA(p.c, p.alpha)};clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%)` : `background:${hexA(p.c, p.alpha)}`)
          el._bg.append(d); ps.push({ d, x: rnd(), y: rnd(), sway: 6 + rnd() * 14, ph: rnd() * TAU, sp: 0.6 + rnd() * 0.8 })
        }
        el._bgfx = { p, ps }
      }
    }
    // text and image
    const t = el._t
    if (kind === 'text' || kind === 'button') {
      t.hidden = false
      const tsk = g(o, 'tsk'), ta = g(o, 'ta')
      t.style.cssText = `${useFont(g(o, 'font'))};font-size:${g(o, 'ts')}px;color:${g(o, 'tc')};justify-content:${ta === 'left' ? 'flex-start' : ta === 'right' ? 'flex-end' : 'center'};text-align:${ta}` + (tsk && tsk.t > 0 ? `;-webkit-text-stroke:${tsk.t * 2}px ${tsk.c || '#000000'}` : '')
      const tds = g(o, 'tds'); t._shadow = tds ? `0 ${tds.y ?? 3}px 0 ${tds.c || '#000000'}` : ''
      t.style.textShadow = t._shadow
      t.textContent = g(o, 'text')
    } else t.hidden = true
    const im = el._img
    if (g(o, 'glyph') || (kind === 'image' && g(o, 'img'))) {
      const url = g(o, 'img') ? imageURL(g(o, 'img')) : glyphURL(g(o, 'glyph')); im.hidden = !url
      if (url) {
        const it = g(o, 'it'), tile = g(o, 'tile'), sl = g(o, 'slice')
        im.style.cssText = `opacity:${1 - g(o, 'iga')};` + (it === 'slice' ? `border:${sl}px solid transparent;border-image:url(${url}) ${sl} fill / ${sl}px stretch;background:none`
          : `background-image:url(${url});background-size:${it === 'stretch' ? '100% 100%' : it === 'crop' ? 'cover' : it === 'tile' ? `${tile[0]}px ${tile[1]}px` : 'contain'};background-repeat:${it === 'tile' ? 'repeat' : 'no-repeat'}`)
        const tint = g(o, 'ic'); im.style.filter = tint && tint !== '#ffffff' ? `drop-shadow(0 0 0 ${tint})` : ''
      }
    } else im.hidden = true
    el.style.overflow = g(o, 'clip') ? 'hidden' : 'visible'
  }

  function node(id) {
    let el = st.nodes.get(id)
    if (!el) {
      el = h('div', 'gx'); el.dataset.id = id
      el._bg = h('div', 'gx-clip'); el._fill = h('div', 'gx-fill'); el._img = h('div', 'gx-img'); el._shine = h('div', 'gx-clip'); el._t = h('div', 'gx-t'); el._sp = h('div', 'gx-sp')
      el.append(el._fill, el._bg, el._img, el._shine, el._t, el._sp)
      st.nodes.set(id, el)
    }
    return el
  }

  function render() {
    mount()
    if (root.hidden) return
    fit()
    dev.classList.toggle('opaque', !st.scene3d)
    const seen = new Set()
    st.rects.clear()
    const d = DEVICES[st.device] || DEVICES.phone
    const place = (id, parentEl, pw, ph, ax, ay, rect) => {
      const o = app.obj(id); if (!o || o.visible === false) return
      seen.add(id)
      const el = node(id)
      if (el.parentNode !== parentEl) parentEl.append(el)
      const r = rect || (g(o, 'kind') === 'screen' ? { x: 0, y: 0, w: pw, h: ph } : rectIn(o, pw, ph))
      el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px'
      el.style.zIndex = String((o.order || 0) + 1)
      el._r = g(o, 'r'); el._o = o
      paint(el, o)
      fxSetup(el, o)
      st.rects.set(id, { x: ax + r.x, y: ay + r.y, w: r.w, h: r.h })
      const ks = kids(id), lay = g(o, 'layout')
      const lr = lay ? layoutRects(lay, ks.map(k => [k, app.obj(k)]), r.w, r.h) : null
      for (const k of ks) place(k, el, r.w, r.h, ax + r.x, ay + r.y, lr?.get(k))
    }
    for (const id of roots()) place(id, dev, d.w, d.h, 0, 0)
    for (const [id, el] of st.nodes) if (!seen.has(id)) { el.remove(); st.nodes.delete(id) }
    empty.hidden = seen.size > 0; if (!empty.parentNode) stage.append(empty)
    if (sel.parentNode !== dev || dev.lastChild !== sel) dev.append(sel)
    drawSelection()
    tick()
  }

  // ---------- effects ----------
  function fxSetup(el, o) {
    const fx = (g(o, 'fx') || []).filter(f => FX[f.type]).map(f => ({ ...fxDefaults(FX, f.type), ...f }))
    el._fx = fx
    el._shine.innerHTML = ''
    const sh = fx.find(f => f.type === 'shine')
    // Gloss: two tilted white bars clipped to the shape (the Figma "highlight" layers), static.
    const gl = fx.find(f => f.type === 'gloss')
    if (gl) for (const [l, w] of [[8, 16], [30, 6]]) { const b = h('div'); b.style.cssText = `position:absolute;top:-50%;bottom:-50%;left:${l}%;width:${w}%;background:${hexA('#ffffff', gl.alpha)};transform:skewX(${-gl.angle}deg)`; el._shine.append(b) }
    if (sh) { const b = h('div'); b.style.cssText = `position:absolute;top:-50%;bottom:-50%;width:${sh.width}%;left:0;background:linear-gradient(90deg,transparent,${hexA('#ffffff', sh.alpha)},transparent);transform:skewX(${-sh.angle}deg)`; el._shine.append(b); el._shineBar = b } else el._shineBar = null
    el._sp.innerHTML = ''
    const sp = fx.find(f => f.type === 'sparkles')
    if (sp) {
      seed = 11 + (o.order || 0); el._sparks = []
      for (let i = 0; i < sp.count; i++) {
        const s = h('i'); const sz = sp.size * (0.6 + rnd() * 0.7)
        s.style.cssText = `width:${sz}px;height:${sz}px;background:${sp.c};clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)`
        el._sp.append(s); el._sparks.push({ s, x: rnd(), y: rnd(), ph: rnd() })
      }
    } else el._sparks = null
    const tw = fx.find(f => f.type === 'typewriter' || f.type === 'countup')
    el._fullText = tw ? String(g(o, 'text')) : null
  }

  function tick() {
    cancelAnimationFrame(st.raf)
    if (root.hidden) return
    const now = performance.now(), t = now / 1000, tp = (now - st.playT0) / 1000
    for (const el of st.nodes.values()) {
      const fx = el._fx || [], o = el._o; if (!o) continue
      let ty = 0, sc = 1, rot = el._r || 0, op = 1, hue = 0
      const shadows = [...(el._baseShadow || [])]
      for (const f of fx) {
        if (f.type === 'float') ty += f.amp * Math.sin(TAU * (t / f.period + f.phase))
        else if (f.type === 'pulse') sc *= 1 + f.amp * (0.5 - 0.5 * Math.cos(TAU * t / f.period))
        else if (f.type === 'spin') rot += f.speed * t
        else if (f.type === 'wiggle') { const k = (t % f.every) / 0.5; if (k < 1) rot += f.amp * Math.sin(k * TAU * 2) * (1 - k) }
        else if (f.type === 'rainbow') hue = (t * f.speed) % 360
        else if (f.type === 'glow') { const a = f.pulse > 0 ? 0.55 + 0.45 * Math.sin(TAU * t / f.pulse) : 1; shadows.push(`0 0 ${f.size}px ${hexA(f.c, 0.9 * a)}`); if (el._t && !el._t.hidden) el._t.style.textShadow = [el._t._shadow, `0 0 ${f.size / 2}px ${hexA(f.c, a)}`].filter(Boolean).join(',') }
        else if (f.type === 'popin' && st.play) { const k = clamp01((tp - f.delay) / f.dur); sc *= k <= 0 ? 0 : backOut(k); }
        else if (f.type === 'slidein' && st.play) { const k = clamp01((tp - f.delay) / f.dur); ty += (1 - backOut(k)) * f.from; op *= Math.min(1, k * 3) }
        else if (f.type === 'hover' && st.play && st.hover === el.dataset.id) sc *= f.scale
        else if (f.type === 'press' && st.play && el._down) sc *= f.scale
        else if (f.type === 'shine' && el._shineBar) { const cyc = f.dur + f.gap, k = (t % cyc) / f.dur; el._shineBar.style.left = (k <= 1 ? -f.width + k * (100 + f.width * 2) : 200) + '%' }
        else if (f.type === 'typewriter' && el._fullText != null) { const n = el._fullText.length, cyc = n / f.cps + f.hold; el._t.textContent = el._fullText.slice(0, Math.min(n, Math.floor((t % cyc) * f.cps))) }
        else if (f.type === 'countup' && el._fullText != null) { const m = el._fullText.match(/-?[\d,.]+/); if (m) { const target = +m[0].replace(/,/g, ''), k = expoOut(clamp01((t % (f.dur + f.hold)) / f.dur)), v = Math.round(target * k); el._t.textContent = el._fullText.replace(m[0], v.toLocaleString('en-US')) } }
      }
      if (el._sparks) { const sp = fx.find(f => f.type === 'sparkles'); for (const s of el._sparks) { const k = (t / sp.period + s.ph) % 1, a = Math.sin(k * Math.PI); s.s.style.left = (s.x * 100) + '%'; s.s.style.top = (s.y * 100) + '%'; s.s.style.transform = `translate(-50%,-50%) scale(${a}) rotate(${k * 90}deg)`; s.s.style.opacity = String(a) } el._sp.style.cssText = 'position:absolute;inset:0;pointer-events:none' }
      const b = el._bgfx
      if (b?.p.type === 'pattern') b.d.style.backgroundPosition = `${(t * b.p.dx) % b.p.tile}px ${(t * b.p.dy) % b.p.tile}px`
      else if (b?.p.type === 'sunburst') b.d.style.rotate = ((t * b.p.speed) % 360) + 'deg'
      else if (b?.ps) { const w = el.offsetWidth || 1, hh = el.offsetHeight || 1; for (const q of b.ps) { const y = ((q.y * hh - t * b.p.speed * q.sp) % (hh + 40) + hh + 40) % (hh + 40) - 20; q.d.style.transform = `translate(${q.x * w + Math.sin(t * 1.3 + q.ph) * q.sway}px,${y}px)` } }
      const grad = g(o, 'grad'); if (grad?.spin) el._fill.style.background = `linear-gradient(${(grad.rot ?? 90) + 90 + t * grad.spin}deg, ${grad.stops.map(([s, c]) => `${c} ${(s * 100).toFixed(1)}%`).join(', ')})`
      el.style.transform = `translateY(${ty.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`
      el.style.opacity = String(op)
      el.style.boxShadow = shadows.join(',')
      el.style.filter = hue ? `hue-rotate(${hue.toFixed(1)}deg)` : ''
    }
    st.raf = requestAnimationFrame(tick)
  }

  // ---------- selection, drag, resize ----------
  function drawSelection() {
    sel.innerHTML = ''
    if (st.play) return
    const ids = app.selection.filter(id => app.obj(id)?.type === 'gui')
    for (const id of ids) {
      const r = st.rects.get(id); if (!r) continue
      const b = h('div', 'uix-box'); b.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;outline-width:${1.5 / st.scale}px`
      sel.append(b)
      if (ids.length === 1 && g(app.obj(id), 'kind') !== 'screen' && !parentLayout(id)) {
        for (const [hx, hy] of [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]]) {
          const d = h('div', 'uix-hd'); d.dataset.hx = hx; d.dataset.hy = hy
          d.style.cssText = `left:${r.x + hx * r.w}px;top:${r.y + hy * r.h}px;transform:scale(${1 / st.scale});cursor:${hx === 0.5 ? 'ns' : hy === 0.5 ? 'ew' : (hx === hy ? 'nwse' : 'nesw')}-resize`
          sel.append(d)
        }
      }
    }
    if (st.hover && !ids.includes(st.hover)) { const r = st.rects.get(st.hover); if (r) { const b = h('div', 'uix-box hov'); b.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`; sel.append(b) } }
  }
  const parentLayout = id => { const p = app.obj(id)?.parent; return p && app.obj(p)?.type === 'gui' && !!app.obj(p).layout }
  const pickId = e => { const el = e.target.closest?.('.gx'); return el ? el.dataset.id : null }

  dev.addEventListener('pointermove', e => {
    if (e.buttons) return
    const id = pickId(e)
    if (id !== st.hover) { st.hover = id; if (!st.play) drawSelection() }
  })
  dev.addEventListener('pointerleave', () => { st.hover = null; drawSelection() })
  dev.addEventListener('pointerdown', e => {
    if (st.play) { const el = e.target.closest('.gx'); if (el) { el._down = true; const up = () => { el._down = false; removeEventListener('pointerup', up) }; addEventListener('pointerup', up) } return }
    const hd = e.target.closest('.uix-hd')
    const id = hd ? app.selection[0] : pickId(e)
    if (!id) { app.select([]); return }
    e.preventDefault(); e.stopPropagation()
    if (!hd && !app.selection.includes(id)) app.select([id], { toggle: e.shiftKey })
    const o0 = clone(app.obj(id)), x0 = e.clientX, y0 = e.clientY, pr = st.rects.get(app.obj(id).parent) || { w: DEVICES[st.device].w, h: DEVICES[st.device].h, x: 0, y: 0 }
    if (!hd && (g(o0, 'kind') === 'screen' || parentLayout(id) || app.obj(id).locked)) return
    let moved = false
    dev.setPointerCapture(e.pointerId)
    const mv = ev => {
      const dx = (ev.clientX - x0) / st.scale, dy = (ev.clientY - y0) / st.scale
      if (!moved && Math.hypot(dx, dy) < 2) return
      if (!moved) { moved = true; app.begin(hd ? 'Resize UI' : 'Move UI') }
      const snap = v => ev.altKey ? v : Math.round(v)
      const p = [...g(o0, 'p')], s = [...g(o0, 's')], a = g(o0, 'a')
      guides.length = 0
      if (hd) {
        const hx = +hd.dataset.hx, hy = +hd.dataset.hy
        if (hx === 1) { s[1] = snap(s[1] + dx); p[1] = snap(p[1] + dx * a[0]) } else if (hx === 0) { s[1] = snap(s[1] - dx); p[1] = snap(p[1] + dx * (1 - a[0])) }
        if (hy === 1) { s[3] = snap(s[3] + dy); p[3] = snap(p[3] + dy * a[1]) } else if (hy === 0) { s[3] = snap(s[3] - dy); p[3] = snap(p[3] + dy * (1 - a[1])) }
        app.set(id, { s, p })
      } else {
        p[1] = snap(p[1] + dx); p[3] = snap(p[3] + dy)
        // snap the centre to the parent's centre lines (6 px)
        const r = rectIn({ ...o0, p }, pr.w, pr.h), cx = r.x + r.w / 2, cy = r.y + r.h / 2
        if (!ev.altKey && Math.abs(cx - pr.w / 2) < 6) { p[1] += pr.w / 2 - cx; guides.push(['v', pr.x + pr.w / 2, pr.y, pr.h]) }
        if (!ev.altKey && Math.abs(cy - pr.h / 2) < 6) { p[3] += pr.h / 2 - cy; guides.push(['h', pr.y + pr.h / 2, pr.x, pr.w]) }
        app.set(id, { p })
      }
    }
    const up = () => { dev.removeEventListener('pointermove', mv); dev.removeEventListener('pointerup', up); dev.removeEventListener('pointercancel', up); guides.length = 0; if (moved) app.end(); render() }
    dev.addEventListener('pointermove', mv); dev.addEventListener('pointerup', up); dev.addEventListener('pointercancel', up)
  })
  dev.addEventListener('dblclick', e => { const id = pickId(e); const o = id && app.obj(id); if (o && (o.kind === 'text' || o.kind === 'button')) app.ui?.openPanel?.('uiprops') })
  const guides = []
  const drawGuides = () => { for (const [k, at, from, len] of guides) { const d = h('div', 'uix-guide'); d.style.cssText = k === 'v' ? `left:${at}px;top:${from}px;width:${1 / st.scale}px;height:${len}px` : `top:${at}px;left:${from}px;height:${1 / st.scale}px;width:${len}px`; sel.append(d) } }

  addEventListener('keydown', e => {
    if (root.hidden || st.play || /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return
    const step = e.shiftKey ? 10 : 1, dir = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (!dir) return
    const ids = app.selection.filter(id => app.obj(id)?.type === 'gui' && app.obj(id).kind !== 'screen' && !parentLayout(id)); if (!ids.length) return
    e.preventDefault()
    app.transact('Nudge UI', () => { for (const id of ids) { const p = [...g(app.obj(id), 'p')]; p[1] += dir[0]; p[3] += dir[1]; app.set(id, { p }) } })
  })

  new ResizeObserver(() => { if (!root.hidden) render() }).observe(stage)
  const show = on => { mount(); root.hidden = !on; if (on) { buildBar(); render() } else cancelAnimationFrame(st.raf) }
  app.on('mode', ({ mode }) => show(mode === 'ui'))
  app.on('change', ch => { if (!root.hidden && (ch.objects.length || ch.top.length)) { render(); if (guides.length) drawGuides() } })
  app.on('select', () => { if (!root.hidden) drawSelection() })
  app.on('project', () => { st.images.clear(); for (const el of st.nodes.values()) el.remove(); st.nodes.clear(); if (!root.hidden) render() })
  app.on('tex', () => { if (!root.hidden) render() })
  return { st, render, togglePlay, show, get device() { return st.device }, setDevice(d) { if (DEVICES[d]) { st.device = d; app.setPref('uiDevice', d); buildBar(); render() } } }
}

// ---------- building blocks and templates ----------
const KIND_NAMES = { screen: 'ScreenGui', frame: 'Frame', text: 'TextLabel', button: 'TextButton', image: 'ImageLabel' }
const NEW = {
  screen: { p: [0, 0, 0, 0], s: [1, 0, 1, 0], a: [0, 0], bga: 1 },
  frame: { s: [0, 320, 0, 220], bg: '#2b3a55', cr: 10, stroke: { c: '#000000', t: 5, a: 0 } },
  text: { s: [0, 240, 0, 50], bga: 1, text: 'Label', ts: 36, tc: '#ffffff', tsk: { c: '#000000', t: 3 }, tds: { c: '#000000', y: 3 } },
  button: { s: [0, 200, 0, 64], bg: '#3ecf5a', grad: { stops: [[0, '#7cf08a'], [1, '#2fb54a']], rot: 90 }, cr: 14, stroke: { c: '#145c22', t: 3, a: 0 }, shadow: { c: '#145c22', a: 1, x: 0, y: 5, b: 0 }, text: 'BUY', ts: 30, tc: '#ffffff', tsk: { c: '#145c22', t: 2.5 }, fx: [{ type: 'hover' }, { type: 'press' }] },
  image: { s: [0, 120, 0, 120], bga: 1, it: 'fit' }
}
function containerFor(app, kind) {
  const sel = app.selection.map(id => [id, app.obj(id)]).find(([, o]) => o?.type === 'gui')
  if (sel) { const [id, o] = sel; if (o.kind === 'screen' || o.kind === 'frame' || kind === 'frame' && o.kind !== 'text') return id; if (o.parent && app.obj(o.parent)?.type === 'gui') return o.parent }
  const screen = app.children(null).find(id => app.obj(id)?.type === 'gui' && app.obj(id).kind === 'screen')
  return screen || (kind === 'screen' ? null : app.add({ type: 'gui', kind: 'screen', name: 'ScreenGui', ...NEW.screen }))
}
function screenOf(app) {
  let id = app.selection.find(i => app.obj(i)?.type === 'gui'), guard = 0
  while (id && app.obj(id)?.parent && app.obj(app.obj(id).parent)?.type === 'gui' && guard++ < 64) id = app.obj(id).parent
  if (id && app.obj(id).kind === 'screen') return id
  return app.children(null).find(i => app.obj(i)?.type === 'gui' && app.obj(i).kind === 'screen') || app.add({ type: 'gui', kind: 'screen', name: 'ScreenGui', ...NEW.screen })
}
function addGui(app, kind, fields = {}, parent) {
  if (kind !== 'screen' && parent === undefined) parent = containerFor(app, kind)
  return app.add({ type: 'gui', kind, name: fields.name || KIND_NAMES[kind], ...clone(NEW[kind] || {}), ...clone(fields), parent: kind === 'screen' ? null : parent })
}

// Game button the way top Roblox UI is layered: hard bottom shadow (darker shade, 0 blur), vertical gradient, thick dark
// stroke, a white top highlight band, outlined text, shine sweep, hover grow and press squash.
function button(app, parent, { text = 'PLAY', w = 220, hh = 70, top = '#7cf08a', bottom = '#2fb54a', dark = '#145c22', p = [0.5, 0, 0.5, 0], ts = 32, name, shine = true } = {}) {
  // Figma recipe (see Standards/Roblox UI.md): lip = darker copy 6 px down, face gradient within one hue, 3 px black outline,
  // ~10 px corners, white top band + tilted gloss bars, Fredoka text with a 3 px outline and a hard 3 px drop shadow.
  const b = addGui(app, 'button', { name: name || text + ' button', p, s: [0, w, 0, hh], bg: bottom, grad: { stops: [[0, top], [1, bottom]], rot: 90 }, cr: Math.min(14, Math.round(hh * 0.2)), stroke: { c: '#000000', t: 3, a: 0 }, shadow: { c: dark, a: 1, x: 0, y: 6, b: 0 }, text: '', fx: [{ type: 'hover' }, { type: 'press' }, { type: 'gloss' }, ...(shine ? [{ type: 'shine', gap: 2.5 }] : [])] }, parent)
  if (w >= 90) addGui(app, 'frame', { name: 'Highlight', p: [0.5, 0, 0, 4], a: [0.5, 0], s: [1, -12, 0.4, -4], bg: '#ffffff', bga: 0.75, cr: Math.min(10, Math.round(hh * 0.15)) }, b)
  addGui(app, 'text', { name: 'Label', p: [0.5, 0, 0.5, 0], s: [1, -12, 1, 0], text, ts, tc: '#ffffff', tsk: { c: '#000000', t: 3 }, tds: { c: '#000000', y: 3 }, font: 'FredokaOne' }, b)
  return b
}

const TEMPLATES = {
  shop: { label: 'Shop window', build(app, parent) {
    const scr = parent ?? addGui(app, 'screen', { name: 'ShopGui' })
    addGui(app, 'frame', { name: 'Dim', p: [0, 0, 0, 0], a: [0, 0], s: [1, 0, 1, 0], bg: '#000000', bga: 0.55, cr: 0 }, scr)
    const win = addGui(app, 'frame', { name: 'ShopWindow', s: [0, 620, 0, 360], bg: '#3a7bd5', grad: { stops: [[0, '#4fa3ff'], [1, '#2a5fc4']], rot: 90 }, cr: 22, stroke: { c: '#14306b', t: 4, a: 0 }, shadow: { c: '#0b1d44', a: 1, x: 0, y: 8, b: 0 }, clip: false, bgfx: { type: 'pattern', shape: 'stars', alpha: 0.12, tile: 56, dx: 14, dy: 14 }, fx: [{ type: 'popin', dur: 0.45 }] }, scr)
    const title = addGui(app, 'frame', { name: 'TitleBar', p: [0.5, 0, 0, -18], a: [0.5, 0], s: [0, 260, 0, 58], bg: '#ffcf3a', grad: { stops: [[0, '#ffe37a'], [1, '#ffb81f']], rot: 90 }, cr: 16, stroke: { c: '#8a5200', t: 4, a: 0 }, shadow: { c: '#8a5200', a: 1, x: 0, y: 5, b: 0 }, fx: [{ type: 'shine', gap: 3 }] }, win)
    addGui(app, 'text', { name: 'Title', p: [0.5, 0, 0.5, 0], s: [1, 0, 1, 0], text: 'SHOP', ts: 38, tsk: { c: '#8a5200', t: 3 }, font: 'LuckiestGuy' }, title)
    const close = button(app, win, { text: 'X', w: 52, hh: 52, top: '#ff7a7a', bottom: '#e23b3b', dark: '#7a1010', p: [1, 14, 0, -14], ts: 30, name: 'Close', shine: false })
    app.set(close, { a: [1, 0] })
    const grid = addGui(app, 'frame', { name: 'Items', p: [0.5, 0, 1, -18], a: [0.5, 1], s: [1, -36, 1, -78], bg: '#000000', bga: 0.78, cr: 16, layout: { type: 'grid', cell: [176, 124], gap: 12, pad: 12, align: 'center' } }, win)
    const items = [['Speed Boots', '250', '#7be08a', '#2f9e47', 'boot'], ['Lucky Clover', '400', '#9df27a', '#3aa52e', 'clover'], ['Mega Potion', '20', '#d38cff', '#7b3fd1', 'potion'], ['Golden Shovel', '2,000', '#ffd76a', '#d79a12', 'shovel'], ['Rainbow Trail', '60', '#7fd6ff', '#2f86e0', 'rainbow'], ['Pet Fox', '3,500', '#ffab6a', '#e0622f', 'paw']]
    items.forEach(([name, price, c1, c2, glyph], i) => {
      const card = addGui(app, 'frame', { name, bg: c2, grad: { stops: [[0, c1], [1, c2]], rot: 90 }, cr: 14, stroke: { c: '#ffffff', t: 3, a: 0.15 }, shadow: { c: '#000000', a: 0.35, x: 0, y: 5, b: 0 }, fx: [{ type: 'popin', dur: 0.35, delay: 0.25 + i * 0.06 }, { type: 'hover', scale: 1.05 }, ...(i === 3 ? [{ type: 'glow', c: '#fff07a', size: 16 }, { type: 'sparkles', count: 5 }] : [])] }, grid)
      addGui(app, 'image', { name: 'Icon', p: [0.5, 0, 0, 4], a: [0.5, 0], s: [0, 50, 0, 50], glyph, fx: [{ type: 'float', amp: 3, period: 2.2, phase: i * 0.15 }] }, card)
      addGui(app, 'text', { name: 'Name', p: [0.5, 0, 0, 55], a: [0.5, 0], s: [1, -8, 0, 22], text: name, ts: 18, tsk: { c: '#000000', t: 2 }, tds: { c: '#000000', y: 2 } }, card)
      const buy = addGui(app, 'button', { name: 'Buy', p: [0.5, 0, 1, -8], a: [0.5, 1], s: [0, 120, 0, 30], bg: '#2fb54a', grad: { stops: [[0, '#7cf08a'], [1, '#2fb54a']], rot: 90 }, cr: 9, stroke: { c: '#145c22', t: 2.5, a: 0 }, shadow: { c: '#145c22', a: 1, x: 0, y: 3, b: 0 }, text: price, ts: 18, tsk: { c: '#145c22', t: 2 }, fx: [{ type: 'hover' }, { type: 'press' }] }, card)
      void buy
    })
    const pill = TEMPLATES.currency.build(app, scr)
    app.set(pill, { p: [0, 24, 0, 24], a: [0, 0] })
    app.select([win])
    return scr
  } },
  button: { label: 'Game button', build(app, parent) { const b = button(app, parent ?? containerFor(app, 'button')); app.select([b]); return b } },
  currency: { label: 'Currency pill', build(app, parent) {
    const p = addGui(app, 'frame', { name: 'Coins', s: [0, 200, 0, 50], bg: '#1b2433', bga: 0.15, cr: 25, stroke: { c: '#000000', t: 3, a: 0.3 } }, parent ?? screenOf(app))
    addGui(app, 'image', { name: 'CoinIcon', p: [0, -6, 0.5, 0], a: [0, 0.5], s: [0, 58, 0, 58], glyph: 'coin', fx: [{ type: 'wiggle', amp: 10, every: 4 }] }, p)
    addGui(app, 'text', { name: 'Amount', p: [0, 58, 0.5, 0], a: [0, 0.5], s: [1, -66, 1, 0], text: '12,450', ts: 28, ta: 'left', tsk: { c: '#000000', t: 2 }, fx: [{ type: 'countup', dur: 1.2, hold: 3 }] }, p)
    const plus = button(app, p, { text: '+', w: 34, hh: 34, p: [1, 8, 0.5, 0], ts: 26, name: 'Add', shine: false }); app.set(plus, { a: [1, 0.5] })
    app.select([p]); return p
  } },
  notify: { label: 'Notification', build(app, parent) {
    const n = addGui(app, 'frame', { name: 'Notification', p: [0.5, 0, 0, 20], a: [0.5, 0], s: [0, 380, 0, 70], bg: '#1b2433', grad: { stops: [[0, '#2c3b56'], [1, '#18202e']], rot: 90 }, cr: 18, stroke: { c: '#ffd84a', t: 3, a: 0 }, shadow: { c: '#000000', a: 0.45, x: 0, y: 6, b: 10 }, fx: [{ type: 'slidein', from: -120, dur: 0.45 }] }, parent ?? screenOf(app))
    addGui(app, 'text', { name: 'Message', p: [0, 70, 0.5, 0], a: [0, 0.5], s: [1, -86, 1, 0], text: 'You unlocked a new pet!', ts: 24, ta: 'left', tsk: { c: '#000000', t: 1.5 }, fx: [{ type: 'typewriter', cps: 30, hold: 3 }] }, n)
    addGui(app, 'image', { name: 'Badge', p: [0, 10, 0.5, 0], a: [0, 0.5], s: [0, 52, 0, 52], glyph: 'gift', fx: [{ type: 'wiggle', amp: 14, every: 2 }, { type: 'sparkles', count: 4, size: 10 }] }, n)
    app.select([n]); return n
  } },
  background: { label: 'Animated background', build(app, parent) {
    const f = addGui(app, 'frame', { name: 'Background', p: [0, 0, 0, 0], a: [0, 0], s: [1, 0, 1, 0], cr: 0, bg: '#5b3bd6', grad: { stops: [[0, '#7b5cff'], [1, '#3a1fa8']], rot: 90 }, bgfx: { type: 'sunburst', rays: 18, alpha: 0.18, speed: 10 } }, parent ?? screenOf(app))
    const sp = addGui(app, 'frame', { name: 'Sparkle layer', p: [0, 0, 0, 0], a: [0, 0], s: [1, 0, 1, 0], cr: 0, bga: 1, bgfx: { type: 'particles', count: 30, shape: 'star', size: 10, speed: 24, alpha: 0.7 } }, f); void sp
    app.select([f]); return f
  } }
}

// ---------- properties panel ----------
function buildUIProps(el, app) {
  const C = app.ui.controls, ctls = []
  const put = (gp, c) => { gp.appendChild(c.el); ctls.push(c); return c }
  const ids = () => app.selection.filter(id => app.obj(id)?.type === 'gui')
  const read = k => () => { const vs = ids().map(id => g(app.obj(id), k)); return { v: vs[0], mixed: vs.some(v => JSON.stringify(v) !== JSON.stringify(vs[0])) } }
  const write = (k, map) => v => { for (const id of ids()) app.set(id, { [k]: map ? map(v, app.obj(id)) : v }) }
  const sub = (k, f) => () => { const o = app.obj(ids()[0]); const v = g(o, k); return { v: v ? v[f] : undefined, mixed: false } }
  const subW = (k, f, base) => v => { for (const id of ids()) { const cur = g(app.obj(id), k) || clone(base); app.set(id, { [k]: { ...cur, [f]: v } }) } }
  const o = app.obj(ids()[0]); if (!o) return { update() {} }
  const kind = g(o, 'kind')

  const g0 = C.group(el)
  put(g0, C.text('Name', { label: 'Rename', read: () => ({ v: o.name }), write: v => app.set(o && ids()[0], { name: v }) }))
  put(g0, C.info('Roblox class', () => KIND_NAMES[g(app.obj(ids()[0]) || o, 'kind')]))

  // UDim2 rows: 4 numbers (scale, offset, scale, offset)
  const udim = (label, k) => {
    const wrap = document.createElement('div'); wrap.className = 'vec3'; wrap.style.gridTemplateColumns = 'repeat(4,1fr)'
    const inps = ['X s', 'X px', 'Y s', 'Y px'].map((ph, i) => {
      const inp = document.createElement('input'); inp.className = 'inp num mono'; inp.title = label + ' ' + ph; inp.placeholder = ph; inp.inputMode = 'decimal'
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur() })
      inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (!isFinite(v)) return update(); app.transact('Edit ' + label.toLowerCase(), () => { for (const id of ids()) { const a = [...g(app.obj(id), k)]; a[i] = v; app.set(id, { [k]: a }) } }) })
      wrap.appendChild(inp); return inp
    })
    const update = () => { const cur = g(app.obj(ids()[0]) || o, k); inps.forEach((inp, i) => { if (document.activeElement !== inp) inp.value = +(+cur[i]).toFixed(i % 2 ? 1 : 3) }) }
    return { el: C.row(label, wrap, 'v3'), update }
  }
  if (kind !== 'screen') {
    const gl = C.group(el, 'Layout')
    put(gl, udim('Position', 'p'))
    put(gl, udim('Size', 's'))
    put(gl, C.select('Anchor', { options: [['0,0', 'Top left'], ['0.5,0', 'Top'], ['1,0', 'Top right'], ['0,0.5', 'Left'], ['0.5,0.5', 'Centre'], ['1,0.5', 'Right'], ['0,1', 'Bottom left'], ['0.5,1', 'Bottom'], ['1,1', 'Bottom right']].map(([value, label]) => ({ value, label })),
      read: () => ({ v: g(app.obj(ids()[0]) || o, 'a').join(',') }), write: v => { const a = v.split(',').map(Number); for (const id of ids()) app.set(id, { a }) } }))
    put(gl, C.number('Rotation', { step: 1, read: read('r'), write: write('r') }))
    put(gl, C.toggle('Clip children', { read: read('clip'), write: write('clip') }))

    const gf = C.group(el, 'Fill')
    put(gf, C.color('Colour', { read: read('bg'), write: write('bg') }))
    put(gf, C.slider('Transparency', { min: 0, max: 1, step: 0.01, read: read('bga'), write: write('bga') }))
    put(gf, C.toggle('Gradient', { read: () => ({ v: !!g(app.obj(ids()[0]) || o, 'grad') }), write: v => { for (const id of ids()) { const cur = app.obj(id); app.set(id, { grad: v ? { stops: [[0, '#ffffff'], [1, cur.bg || '#888888']], rot: 90 } : null }) } } }))
    if (g(o, 'grad')) {
      put(gf, C.color('Top colour', { read: () => ({ v: g(app.obj(ids()[0]) || o, 'grad')?.stops?.[0]?.[1] }), write: v => { for (const id of ids()) { const gr = clone(g(app.obj(id), 'grad')); gr.stops[0][1] = v; app.set(id, { grad: gr }) } } }))
      put(gf, C.color('Bottom colour', { read: () => ({ v: g(app.obj(ids()[0]) || o, 'grad')?.stops?.at(-1)?.[1] }), write: v => { for (const id of ids()) { const gr = clone(g(app.obj(id), 'grad')); gr.stops[gr.stops.length - 1][1] = v; app.set(id, { grad: gr }) } } }))
      put(gf, C.number('Gradient angle', { step: 5, read: sub('grad', 'rot'), write: subW('grad', 'rot') }))
      put(gf, C.number('Gradient spin °/s', { step: 5, read: sub('grad', 'spin'), write: subW('grad', 'spin') }))
    }
    put(gf, C.number('Corner radius', { step: 1, min: 0, read: read('cr'), write: write('cr') }))
    put(gf, C.toggle('Outline (UIStroke)', { read: () => ({ v: !!g(app.obj(ids()[0]) || o, 'stroke') }), write: v => { for (const id of ids()) app.set(id, { stroke: v ? { c: '#000000', t: 3, a: 0 } : null }) } }))
    if (g(o, 'stroke')) {
      put(gf, C.color('Outline colour', { read: sub('stroke', 'c'), write: subW('stroke', 'c') }))
      put(gf, C.number('Outline px', { step: 0.5, min: 0, read: sub('stroke', 't'), write: subW('stroke', 't') }))
    }
    put(gf, C.toggle('Drop shadow', { read: () => ({ v: !!g(app.obj(ids()[0]) || o, 'shadow') }), write: v => { for (const id of ids()) app.set(id, { shadow: v ? { c: '#000000', a: 0.4, x: 0, y: 5, b: 0 } : null }) } }))
    if (g(o, 'shadow')) {
      put(gf, C.color('Shadow colour', { read: sub('shadow', 'c'), write: subW('shadow', 'c') }))
      put(gf, C.number('Shadow y px', { step: 1, read: sub('shadow', 'y'), write: subW('shadow', 'y') }))
      put(gf, C.number('Shadow blur', { step: 1, min: 0, read: sub('shadow', 'b'), write: subW('shadow', 'b') }))
      put(gf, C.slider('Shadow strength', { min: 0, max: 1, step: 0.05, read: sub('shadow', 'a'), write: subW('shadow', 'a') }))
    }
  }
  if (kind === 'text' || kind === 'button') {
    const gt = C.group(el, 'Text')
    put(gt, C.text('Text', { read: read('text'), write: write('text') }))
    put(gt, C.select('Font', { options: Object.keys(FONTS), read: read('font'), write: write('font') }))
    put(gt, C.number('Text size', { step: 1, min: 4, read: read('ts'), write: write('ts') }))
    put(gt, C.color('Text colour', { read: read('tc'), write: write('tc') }))
    put(gt, C.select('Align', { options: ['left', 'center', 'right'], read: read('ta'), write: write('ta') }))
    put(gt, C.toggle('Text outline', { read: () => ({ v: !!g(app.obj(ids()[0]) || o, 'tsk') }), write: v => { for (const id of ids()) app.set(id, { tsk: v ? { c: '#000000', t: 2 } : null }) } }))
    if (g(o, 'tsk')) { put(gt, C.color('Outline colour ', { read: sub('tsk', 'c'), write: subW('tsk', 'c') })); put(gt, C.number('Outline width', { step: 0.5, min: 0, read: sub('tsk', 't'), write: subW('tsk', 't') })) }
  }
  if (kind === 'image') {
    const gi = C.group(el, 'Image')
    const row = document.createElement('div'); row.className = 'btn-row'
    const up = document.createElement('button'); up.className = 'btn sm'; up.innerHTML = icon('upload') + '<span>Upload image</span>'
    up.onclick = () => app.exec('ui.image', { ids: ids() })
    row.append(up); gi.append(row)
    put(gi, C.select('Built-in icon', { options: [{ value: '', label: 'None (uploaded image)' }, ...Object.keys(GLYPHS).map(k => ({ value: k, label: k }))], read: () => ({ v: g(app.obj(ids()[0]) || o, 'glyph') || '' }), write: v => { for (const id of ids()) app.set(id, { glyph: v || null }) } }))
    put(gi, C.select('Scale type', { options: [['fit', 'Fit'], ['crop', 'Crop'], ['stretch', 'Stretch'], ['tile', 'Tile'], ['slice', '9-slice']].map(([value, label]) => ({ value, label })), read: read('it'), write: write('it') }))
    put(gi, C.slider('Image transparency', { min: 0, max: 1, step: 0.01, read: read('iga'), write: write('iga') }))
    if (g(o, 'it') === 'slice') put(gi, C.number('Slice px', { step: 1, min: 1, read: read('slice'), write: write('slice') }))
  }
  if (kind === 'frame' || kind === 'screen') {
    const gy = C.group(el, 'Children layout')
    put(gy, C.select('Layout', { options: [['none', 'Free'], ['list-v', 'List (vertical)'], ['list-h', 'List (horizontal)'], ['grid', 'Grid']].map(([value, label]) => ({ value, label })),
      read: () => { const l = g(app.obj(ids()[0]) || o, 'layout'); return { v: !l ? 'none' : l.type === 'grid' ? 'grid' : 'list-' + (l.dir || 'v') } },
      write: v => { for (const id of ids()) { const cur = g(app.obj(id), 'layout') || {}; app.set(id, { layout: v === 'none' ? null : v === 'grid' ? { gap: 12, pad: 12, cell: [120, 120], align: 'center', ...cur, type: 'grid' } : { gap: 8, pad: 8, align: 'center', ...cur, type: 'list', dir: v.slice(5) } }) } } }))
    if (g(o, 'layout')) {
      put(gy, C.number('Gap px', { step: 1, min: 0, read: sub('layout', 'gap'), write: subW('layout', 'gap') }))
      put(gy, C.number('Padding px', { step: 1, min: 0, read: sub('layout', 'pad'), write: subW('layout', 'pad') }))
      put(gy, C.select('Align', { options: ['start', 'center', 'end'], read: sub('layout', 'align'), write: subW('layout', 'align') }))
    }
  }
  if (kind !== 'screen') {
    // background effect
    const gb = C.group(el, 'Animated background')
    put(gb, C.select('Background effect', { options: [{ value: 'none', label: 'None' }, ...Object.entries(BGFX).map(([value, d]) => ({ value, label: d.label }))],
      read: () => ({ v: g(app.obj(ids()[0]) || o, 'bgfx')?.type || 'none' }), write: v => { for (const id of ids()) app.set(id, { bgfx: v === 'none' ? null : { type: v, ...fxDefaults(BGFX, v) } }) } }))
    const bf = g(o, 'bgfx')
    if (bf && BGFX[bf.type]) for (const prm of BGFX[bf.type].params) put(gb, paramCtl(C, prm, () => g(app.obj(ids()[0]) || o, 'bgfx'), patch => { for (const id of ids()) app.set(id, { bgfx: { ...g(app.obj(id), 'bgfx'), ...patch } }) }))
    // effects list
    const ge = C.group(el, 'Effects')
    const fxs = g(o, 'fx') || []
    fxs.forEach((f, i) => {
      if (!FX[f.type]) return
      const hd = document.createElement('div'); hd.className = 'pr'
      hd.innerHTML = `<label class="pl"><b>${esc(FX[f.type].label)}</b></label>`
      const rm = document.createElement('button'); rm.className = 'btn sm'; rm.textContent = 'Remove'
      rm.onclick = () => app.transact('Remove effect', () => { for (const id of ids()) { const list = [...(g(app.obj(id), 'fx') || [])]; const j = list.findIndex(x => x.type === f.type); if (j >= 0) list.splice(j, 1); app.set(id, { fx: list }) } })
      hd.append(rm); ge.append(hd)
      for (const prm of FX[f.type].params) put(ge, paramCtl(C, prm, () => (g(app.obj(ids()[0]) || o, 'fx') || [])[i], patch => { for (const id of ids()) { const list = clone(g(app.obj(id), 'fx') || []); const j = list.findIndex(x => x.type === f.type); if (j >= 0) { list[j] = { ...list[j], ...patch }; app.set(id, { fx: list }) } } }))
    })
    put(ge, C.select('Add effect', { options: Object.entries(FX).filter(([k]) => !fxs.some(f => f.type === k)).map(([value, d]) => ({ value, label: d.label })), read: () => ({ v: '', mixed: true }),
      write: v => { for (const id of ids()) { const list = clone(g(app.obj(id), 'fx') || []); if (!list.some(x => x.type === v)) list.push({ type: v, ...fxDefaults(FX, v) }); app.set(id, { fx: list }) } } }))
  }
  const update = () => { for (const c of ctls) try { c.update() } catch {} }
  update()
  return { update, key: ids().join() + '|' + JSON.stringify([!!g(o, 'grad'), !!g(o, 'stroke'), !!g(o, 'shadow'), !!g(o, 'tsk'), g(o, 'layout')?.type, g(o, 'bgfx')?.type, (g(o, 'fx') || []).map(f => f.type), g(o, 'it')]) }
}
function paramCtl(C, [k, label, type, def, min, max, step], get, set) {
  const read = () => ({ v: get()?.[k] ?? def })
  if (type === 'c') return C.color(label, { read, write: v => set({ [k]: v }) })
  if (type === 's') return C.select(label, { options: min, read, write: v => set({ [k]: v }) })
  if (max !== undefined && max - min <= 2) return C.slider(label, { min, max, step, read, write: v => set({ [k]: v }) })
  return C.number(label, { step, min, max, read, write: v => set({ [k]: v }) })
}

let editor = null
const pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files?.[0] || null); i.click() })
async function imageData(file) {
  const bmp = await createImageBitmap(file), M = 1024, k = Math.min(1, M / Math.max(bmp.width, bmp.height))
  const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k)
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height)
  return { data: cv.toDataURL('image/png'), w: cv.width, h: cv.height }
}
const isGuiSel = app => app.selection.length > 0 && app.selection.every(id => app.obj(id)?.type === 'gui')

export default {
  id: 'ui', name: 'Interface',
  init(app) { editor = createEditor(app); app.uiEditor = editor; if (app.mode === 'ui') editor.show(true) },
  modes: [{ id: 'ui', label: 'Interface', icon: 'ui', order: 60 }],
  types: {
    gui: {
      defaults: { kind: 'frame', p: DEF.p, s: DEF.s, a: DEF.a },
      build() { const o = new THREE.Group(); o.userData.helper = true; return o },   // UI lives in the Interface view, not in 3D
      update(o3d) { return o3d }
    }
  },
  commands: {
    'ui.add': { label: 'Add UI element', icon: 'ui', run(app, a = {}) {
      const kind = a.kind || 'frame'; if (!NEW[kind]) throw new Error('kind must be screen, frame, text, button or image')
      return app.transact('Add ' + KIND_NAMES[kind], () => { const id = addGui(app, kind, a.fields || {}, a.parent); if (a.select !== false) app.select([id]); if (app.mode !== 'ui') app.setMode('ui'); return id })
    } },
    'ui.template': { label: 'Add UI template', icon: 'sparkle', run(app, a = {}) {
      const t = TEMPLATES[a.name || 'shop']; if (!t) throw new Error('template must be one of ' + Object.keys(TEMPLATES).join(', '))
      return app.transact('Add ' + t.label, () => { const id = t.build(app, a.parent); if (app.mode !== 'ui') app.setMode('ui'); return id })
    } },
    'ui.image': { label: 'Upload UI image…', icon: 'image', async run(app, a = {}) {
      const file = a.file || await pickFile('image/*'); if (!file) return null
      const { data, w, h: hh } = await imageData(file), src = app.tex.put({ kind: 'image', data })
      return app.transact('Upload UI image', () => {
        let ids = (a.ids || app.selection).filter(id => app.obj(id)?.type === 'gui' && app.obj(id).kind === 'image')
        if (!ids.length) ids = [addGui(app, 'image', { name: String(file.name || 'Image').replace(/\.[a-z0-9]+$/i, '').slice(0, 40), s: [0, Math.min(300, w), 0, Math.min(300, w) * hh / w] })]
        for (const id of ids) app.set(id, { img: src })
        app.select(ids); return src
      })
    } },
    'ui.play': { label: 'Play interface animations', icon: 'play', noUndo: true, run: (app, a = {}) => editor?.togglePlay(a.on) },
    'ui.device': { label: 'Interface device', noUndo: true, hidden: true, run: (app, a = {}) => editor?.setDevice(a.device) },
    'ui.open': { label: 'Interface editor', icon: 'ui', noUndo: true, run: app => app.setMode('ui') }
  },
  menus: { Add: ['-', 'ui.open'] },
  panels: [
    { id: 'uitools', label: 'Interface', icon: 'ui', order: 2, mode: 'ui', render(el, app) {
      const C = app.ui.controls
      const g1 = C.group(el, 'Add')
      const row = (items, gp) => { const r = document.createElement('div'); r.className = 'btn-row'; for (const [label, ic, fn] of items) { const b = document.createElement('button'); b.className = 'btn sm'; b.innerHTML = icon(ic) + '<span>' + esc(label) + '</span>'; b.onclick = fn; r.append(b) } gp.append(r) }
      row([['Screen', 'frame', () => app.exec('ui.add', { kind: 'screen' })], ['Frame', 'plane', () => app.exec('ui.add', { kind: 'frame' })], ['Text', 'text', () => app.exec('ui.add', { kind: 'text' })], ['Button', 'dot', () => app.exec('ui.add', { kind: 'button' })], ['Image', 'image', () => app.exec('ui.image')]], g1)
      const g2 = C.group(el, 'Templates')
      row(Object.entries(TEMPLATES).map(([k, t]) => [t.label, 'sparkle', () => app.exec('ui.template', { name: k })]), g2)
      const g3 = C.group(el, 'Tips')
      g3.insertAdjacentHTML('beforeend', '<div class="mute" style="font-size:12px;line-height:1.45;padding:2px 2px 6px">Click to select, drag to move (snaps to the centre; hold Alt to stop snapping), drag the handles to resize, arrows nudge (Shift = 10 px). Play runs pop-ins and hover and press. Children of a list or grid frame are placed by the layout.</div>')
    } },
    { id: 'uiprops', label: 'UI properties', icon: 'sliders', order: 8, when: isGuiSel, render(el, app) { el._p = buildUIProps(el, app); return () => { el._p = null } },
      refresh(el, app, ev) { if (ev.type === 'time') return; const p = el._p; const ref = () => { el.innerHTML = ''; el._p = buildUIProps(el, app) }; if (!p) return ref(); const n = buildKey(app); if (n !== p.key || ev.type === 'select' || ev.type === 'project') ref(); else p.update() } }
  ]
}
function buildKey(app) {
  const ids = app.selection.filter(id => app.obj(id)?.type === 'gui'), o = app.obj(ids[0]); if (!o) return ''
  return ids.join() + '|' + JSON.stringify([!!g(o, 'grad'), !!g(o, 'stroke'), !!g(o, 'shadow'), !!g(o, 'tsk'), g(o, 'layout')?.type, g(o, 'bgfx')?.type, (g(o, 'fx') || []).map(f => f.type), g(o, 'it')])
}
