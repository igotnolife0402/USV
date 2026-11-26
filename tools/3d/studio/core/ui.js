// Layout, menus, panels, bottom sheets, dialogs, command palette, toasts, icons, home page.
import { MENU_ORDER } from './app.js'
import { mountExplorer, corePanels, makeControls } from './panels.js'

// ---------- icons: 16 px line icons ----------
const P = {
  cube: 'M8 1.5 14 4.8v6.4L8 14.5 2 11.2V4.8z M2 4.8 8 8l6-3.2 M8 8v6.5',
  select: 'M3.5 2v10.5l2.7-2.6 1.9 4.3 1.9-.8-1.9-4.2h3.7z',
  move: 'M8 1.5v13 M1.5 8h13 M6 3.5l2-2 2 2 M6 12.5l2 2 2-2 M3.5 6l-2 2 2 2 M12.5 6l2 2-2 2',
  rotate: 'M13.5 8A5.5 5.5 0 1 1 11.9 4 M13.5 1.5V4.5h-3',
  scale: 'M2.5 8.5h5v5h-5z M7.5 8.5l6-6 M9.5 2.5h4v4',
  undo: 'M5.5 2.5 2.5 5.5l3 3 M2.5 5.5H10a3.5 3.5 0 0 1 0 7H6',
  redo: 'M10.5 2.5l3 3-3 3 M13.5 5.5H6a3.5 3.5 0 0 0 0 7h4',
  copy: 'M5.5 5.5h8v8h-8z M10.5 5.5v-3h-8v8h3',
  paste: 'M5.5 2.5h5v2h-5z M5.5 3.5h-2v10h9v-10h-2',
  cut: 'M4.5 13.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M11.5 13.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M5.8 10 12 2.5 M10.2 10 4 2.5',
  duplicate: 'M5.5 5.5h8v8h-8z M2.5 10.5v-8h8 M9.5 7.5v4 M7.5 9.5h4',
  trash: 'M2.5 4h11 M6 4V2.5h4V4 M3.8 4l.7 9.5h7l.7-9.5 M6.5 6.5v4.5 M9.5 6.5v4.5',
  group: 'M1.5 4.5v-3h3 M11.5 1.5h3v3 M14.5 11.5v3h-3 M4.5 14.5h-3v-3 M5 5h6v6H5z',
  ungroup: 'M1.5 4.5v-3h3 M11.5 1.5h3v3 M14.5 11.5v3h-3 M4.5 14.5h-3v-3 M4.5 4.5h3v3h-3z M8.5 8.5h3v3h-3z',
  eye: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  eyeOff: 'M2 2l12 12 M6.6 3.7A6 6 0 0 1 8 3.5c4 0 6.5 4.5 6.5 4.5a11 11 0 0 1-1.9 2.5 M4.2 4.9C2.5 6.1 1.5 8 1.5 8S4 12.5 8 12.5c1 0 1.9-.3 2.7-.7 M6.6 6.6a2 2 0 0 0 2.8 2.8',
  lock: 'M3.5 7.5h9v6h-9z M5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5',
  unlock: 'M3.5 7.5h9v6h-9z M5.5 7.5V5a2.5 2.5 0 0 1 4.8-1',
  magnet: 'M3 2.5v5a5 5 0 0 0 10 0v-5h-3v5a2 2 0 0 1-4 0v-5z M3 5h3 M10 5h3',
  globe: 'M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M1.5 8h13 M8 1.5C6 3.5 5.2 5.5 5.2 8S6 12.5 8 14.5 M8 1.5c2 2 2.8 4 2.8 6.5S10 12.5 8 14.5',
  local: 'M2.5 13.5v-11 M2.5 13.5h11 M2.5 13.5 9 7 M11 2.5l2.5 2.5-2.5 2.5',
  play: 'M4.5 2.5v11l9-5.5z',
  pause: 'M5 3v10 M11 3v10',
  plus: 'M8 2.5v11 M2.5 8h11',
  home: 'M2 7.5 8 2.5l6 5 M3.5 6.5v7h3.5v-4h2v4h3.5v-7',
  search: 'M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M10.6 10.6 14 14',
  more: 'M2.5 8a1 1 0 1 0 2 0 1 1 0 1 0-2 0 M7 8a1 1 0 1 0 2 0 1 1 0 1 0-2 0 M11.5 8a1 1 0 1 0 2 0 1 1 0 1 0-2 0',
  chevron: 'M4 6l4 4 4-4',
  chevronRight: 'M6 4l4 4-4 4',
  chevronLeft: 'M10 4 6 8l4 4',
  sphere: 'M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M1.5 8c0 1.6 2.9 2.8 6.5 2.8s6.5-1.2 6.5-2.8',
  cylinder: 'M2.5 4c0-1.1 2.5-2 5.5-2s5.5.9 5.5 2-2.5 2-5.5 2-5.5-.9-5.5-2z M2.5 4v8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V4',
  wedge: 'M1.5 13.5h13v-10z M14.5 3.5 12 2 1.5 12v1.5',
  cornerwedge: 'M2 13.5h9l3-3.5L8 2z M8 2l3 11.5',
  cone: 'M8 1.5 2.5 12 M8 1.5 13.5 12 M2.5 12c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2-2.5-2-5.5-2-5.5.9-5.5 2z',
  torus: 'M8 12.5c3.6 0 6.5-2 6.5-4.5S11.6 3.5 8 3.5 1.5 5.5 1.5 8s2.9 4.5 6.5 4.5z M5.3 7.6c.7.6 1.6.9 2.7.9s2-.3 2.7-.9 M6.3 8.2C6.8 7.6 7.4 7.3 8 7.3s1.2.3 1.7.9',
  plane: 'M1.5 10.5 5.5 5.5h9l-4 5z',
  capsule: 'M5 5.5a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0z',
  light: 'M6 12.5h4 M6.5 14.5h3 M8 1.5a4.5 4.5 0 0 0-2.5 8.2V11h5V9.7A4.5 4.5 0 0 0 8 1.5z',
  sun: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8 1v1.5 M8 13.5V15 M1 8h1.5 M13.5 8H15 M3 3l1 1 M12 12l1 1 M3 13l1-1 M12 4l1-1',
  camera: 'M1.5 5h3L6 3h4l1.5 2h3v8.5h-13z M8 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  grid: 'M1.5 1.5h13v13h-13z M1.5 6h13 M1.5 10h13 M6 1.5v13 M10 1.5v13',
  frame: 'M1.5 5V1.5H5 M11 1.5h3.5V5 M14.5 11v3.5H11 M5 14.5H1.5V11 M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  person: 'M8 7a2.75 2.75 0 1 0 0-5.5A2.75 2.75 0 0 0 8 7z M2.5 14.5a5.5 5.5 0 0 1 11 0',
  brush: 'M13.5 2.5 7.2 8.8 M7.2 8.8c-1.6-.2-3.2.6-3.2 2.5 0 1.4-1 2.2-2.5 2.2 3 1.2 6.6.4 7-2.2z',
  pen: 'M11 2.5l2.5 2.5L5 13.5H2.5V11z M9.5 4l2.5 2.5',
  mesh: 'M8 1.5 14 5v6l-6 3.5L2 11V5z M2 5l6 3.5L14 5 M8 8.5v6 M2 11l6-2.5 6 2.5',
  image: 'M1.5 2.5h13v11h-13z M1.5 11l4-4 3 3 2-2 4 4 M10.5 6.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  download: 'M8 2v8.5 M4.5 7 8 10.5 11.5 7 M2.5 12v2h11v-2',
  upload: 'M8 10.5V2 M4.5 5.5 8 2l3.5 3.5 M2.5 12v2h11v-2',
  close: 'M3.5 3.5l9 9 M12.5 3.5l-9 9',
  check: 'M3 8.5l3 3 7-7',
  menu: 'M2 4h12 M2 8h12 M2 12h12',
  layers: 'M8 1.5 14.5 5 8 8.5 1.5 5z M1.5 8 8 11.5 14.5 8 M1.5 11 8 14.5 14.5 11',
  sliders: 'M2 4h7 M12 4h2 M2 8h2 M7 8h7 M2 12h9 M9 2.5v3 M4 6.5v3 M11 10.5v3',
  keyboard: 'M1.5 3.5h13v9h-13z M4 6.5h1 M7 6.5h1 M10 6.5h1 M4.5 9.5h7',
  union: 'M1.5 1.5h8v5h5v8h-8v-5h-5z',
  negate: 'M1.5 1.5h8v8h-8z M6.5 9.5v5h8v-8h-5',
  intersect: 'M1.5 1.5h8v8h-8z M6.5 6.5h8v8h-8z M6.5 6.5h3v3h-3z',
  folder: 'M1.5 3.5h5L8 5h6.5v8.5h-13z',
  model: 'M2 9.5h5v5H2z M9 9.5h5v5H9z M5.5 2h5v5h-5z',
  orbit: 'M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M14.5 8c0 2-2.9 3.5-6.5 3.5S1.5 10 1.5 8 4.4 4.5 8 4.5c1.5 0 2.9.3 4 .7',
  align: 'M2 1.5v13 M2 4.5h8v3H2 M2 9.5h12v3H2',
  mirror: 'M8 1.5v13 M6 4 2 12h4z M10 4l4 8h-4z',
  array: 'M1.5 5.5h3v5h-3z M6.5 5.5h3v5h-3z M11.5 5.5h3v5h-3z',
  drop: 'M8 2v8.5 M5 7.5l3 3 3-3 M2.5 14h11',
  anchor: 'M8 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M8 4.5v10 M5 7h6 M2.5 9.5a5.5 5 0 0 0 11 0',
  color: 'M8 14.5a6.5 6.5 0 1 1 6.5-6.5c0 1.5-1.2 2.5-2.7 2.5H10a1.5 1.5 0 0 0-1 2.6c.6.6.3 1.4-1 1.4z M5 7h1 M8 4.5h1 M11 7h1',
  bookmark: 'M4 1.5h8v13l-4-3-4 3z',
  info: 'M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M8 7.5v4 M8 4.8v.4',
  warn: 'M8 1.8 14.8 13.5H1.2z M8 6.2v3.6 M8 11.6v.4',
  cloud: 'M4.5 12.5a3 3 0 0 1-.4-6A4.5 4.5 0 0 1 12.7 6a3.25 3.25 0 0 1-.7 6.5z',
  cloudOff: 'M2 2l12 12 M4.5 12.5a3 3 0 0 1-.6-6 M7 3.6A4.5 4.5 0 0 1 12.7 6a3.25 3.25 0 0 1 1.6 5.4 M11.3 12.5H4.5',
  stroke: 'M2 12c2-4 4-8 6-4s4 2 6-4',
  rig: 'M6 1.5h4v3H6z M4.5 5.5h7v5h-7z M2.5 5.5h1.5v5H2.5 M12 5.5h1.5v5H12 M5 11h2.5v3.5H5z M8.5 11H11v3.5H8.5z',
  text: 'M3 3.5h10 M8 3.5v9',
  dot: 'M7 8a1 1 0 1 0 2 0 1 1 0 1 0-2 0'
}
export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="${P[name] || P.dot}"/></svg>`
}
export const ICONS = Object.keys(P)
export function addIcons(map) { for (const k in map) if (!(k in P)) { P[k] = map[k]; ICONS.push(k) } } // plugins add 16 px stroke paths

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }
const keyText = k => (Array.isArray(k) ? k[0] : k) || ''
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} } }
export const isPhone = () => matchMedia('(max-width: 899px)').matches
function ago(t) {
  const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000)
  if (!isFinite(s)) return ''
  if (s < 60) return 'just now'
  const m = s / 60; if (m < 60) return Math.floor(m) + ' min ago'
  const hr = m / 60; if (hr < 24) return Math.floor(hr) + ' h ago'
  const d = hr / 24; if (d < 30) return Math.floor(d) + (Math.floor(d) === 1 ? ' day ago' : ' days ago')
  return new Date(t).toLocaleDateString()
}
// Key name for an event, matching command `key` strings like 'Ctrl+Shift+Z', 'Numpad1', 'Shift+?'.
export function comboOf(e) {
  const c = e.code || ''
  let k = c.startsWith('Key') ? c.slice(3) : c.startsWith('Digit') ? c.slice(5) : c
  if (c === 'Slash') k = e.shiftKey ? '?' : '/'
  if (c === 'NumpadDecimal') k = 'Numpad.'
  if (!c) k = e.key.length === 1 ? e.key.toUpperCase() : e.key
  const mods = []
  if (e.ctrlKey || e.metaKey) mods.push('Ctrl')
  if (e.altKey) mods.push('Alt')
  if (e.shiftKey) mods.push('Shift')
  return [...mods, k].join('+')
}

export function mountUI(app, root) {
  root.classList.add('st')
  root.innerHTML = `
  <div class="home" hidden></div>
  <div class="editor" hidden>
    <header class="topbar">
      <button class="ib t-home" title="All projects" aria-label="All projects">${icon('home')}</button>
      <nav class="menubar"></nav>
      <div class="modes" role="tablist"></div>
      <div class="t-title"><button class="t-mode" aria-label="Mode"><span class="t-pill"><span class="t-mi"></span><span class="t-ml"></span>${icon('chevron')}</span><span class="t-pn"></span></button><input class="pname" spellcheck="false" aria-label="Project name"><span class="chip save-chip"></span></div>
      <div class="t-right">
        <button class="ib t-snap" title="Snap to grid (Ctrl+Shift+S)" aria-label="Snap">${icon('magnet')}<span class="snapv mono"></span></button>
        <button class="ib t-space" title="World / local axes (Ctrl+L)" aria-label="Axes">${icon('globe')}</button>
        <span class="vsep"></span>
        <button class="ib t-undo" title="Undo (Ctrl+Z)" aria-label="Undo">${icon('undo')}</button>
        <button class="ib t-redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">${icon('redo')}</button>
        <button class="ib t-search" title="Command palette (Ctrl+K)" aria-label="Commands">${icon('search')}</button>
        <button class="ib t-more" title="Menu" aria-label="Menu">${icon('more')}</button>
      </div>
    </header>
    <div class="ptabs" role="tablist" aria-label="Open projects" hidden></div>
    <div class="workspace">
      <nav class="toolstrip"></nav>
      <main class="vp-wrap"><div class="vp"></div><div class="vp-label"></div></main>
      <aside class="sidebar">
        <div class="sheet-handle"><span></span></div>
        <div class="side-tabs"><button data-tab="explorer">${icon('layers')}Explorer</button><button data-tab="props">${icon('sliders')}Properties</button><button class="ib side-close" aria-label="Close">${icon('close')}</button></div>
        <section class="explorer"></section>
        <div class="splitter" title="Drag to resize"></div>
        <div class="side-scroll"></div>
      </aside>
    </div>
    <section class="dock" hidden><div class="dock-tabs"></div><div class="dock-body"></div></section>
    <footer class="statusbar"><span class="sb-sel"></span><span class="sb-hint"></span><span class="sb-stats mono"></span><span class="sb-store"></span></footer>
    <nav class="mobilebar"></nav>
  </div>
  <div class="layer"></div>`
  const $ = s => root.querySelector(s)
  const layer = $('.layer'), editor = $('.editor'), homeEl = $('.home')
  const ui = { root, icon, isPhone, layer }
  app.ui = ui
  ui.controls = makeControls(app)
  let uiState = ls.get('studio.ui', { split: 0.4, collapsed: {}, dock: 220, dockTab: null })
  const saveUI = () => ls.set('studio.ui', uiState)
  // Phone dock keeps its own height (default 40vh): 220 px left the timeline one row tall under its two toolbars.
  const DK = () => isPhone() ? 'dockPhone' : 'dock', dockH = () => uiState[DK()] ?? Math.round(innerHeight * 0.4)

  // ---------- toasts ----------
  const toasts = h('div', 'toasts'); layer.appendChild(toasts)
  ui.toast = (msg, kind = 'info') => {
    const t = h('div', 'toast ' + kind, icon({ ok: 'check', error: 'warn', warn: 'warn' }[kind] || 'info') + `<span>${esc(msg)}</span>`)
    t.setAttribute('role', kind === 'error' ? 'alert' : 'status')
    toasts.appendChild(t)
    while (toasts.children.length > 3) toasts.firstChild.remove()
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 200) }, kind === 'error' ? 6000 : 3500)
  }

  // ---------- dialogs ----------
  let dialogOpen = 0
  function modal({ title, body, fields = [], ok = 'OK', cancel = 'Cancel', danger = false, wide = false }) {
    return new Promise(resolve => {
      dialogOpen++
      const back = h('div', 'backdrop'), box = h('div', 'dialog' + (wide ? ' wide' : ''))
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true')
      box.innerHTML = `<div class="dlg-h">${esc(title)}</div>${body ? `<div class="dlg-b">${esc(body)}</div>` : ''}<form class="dlg-f"></form><div class="dlg-a">${cancel ? `<button class="btn" data-a="cancel">${esc(cancel)}</button>` : ''}<button class="btn ${danger ? 'danger' : 'primary'}" data-a="ok">${esc(ok)}</button></div>`
      const form = box.querySelector('form'), inputs = {}
      for (const f of fields) {
        const row = h('label', 'dlg-row')
        if (f.label) row.appendChild(h('span', '', esc(f.label)))
        let inp
        if (f.type === 'select') { inp = h('select', 'inp'); for (const o of f.options || []) { const v = typeof o === 'object' ? o.value : o, l = typeof o === 'object' ? o.label : o; const op = h('option', '', esc(l)); op.value = v; inp.appendChild(op) } inp.value = f.value ?? '' }
        else if (f.type === 'checkbox') { inp = h('input', 'chk'); inp.type = 'checkbox'; inp.checked = !!f.value; row.classList.add('inline') }
        else { inp = h('input', 'inp' + (f.type === 'number' ? ' mono' : '')); inp.type = f.type === 'number' ? 'text' : f.type || 'text'; if (f.type === 'number') inp.inputMode = 'decimal'; inp.value = f.value ?? ''; if (f.placeholder) inp.placeholder = f.placeholder; inp.spellcheck = false }
        inputs[f.key] = inp; row.appendChild(inp); form.appendChild(row)
      }
      const done = v => { dialogOpen--; back.remove(); document.removeEventListener('keydown', onKey, true); resolve(v) }
      const values = () => { const o = {}; for (const f of fields) { const i = inputs[f.key]; o[f.key] = f.type === 'checkbox' ? i.checked : f.type === 'number' ? (parseFloat(i.value) || 0) : i.value } return o }
      const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null) } }
      document.addEventListener('keydown', onKey, true)
      form.addEventListener('submit', e => { e.preventDefault(); done(values()) })
      form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName !== 'SELECT') { e.preventDefault(); done(values()) } })
      box.querySelector('[data-a=ok]').onclick = () => done(values())
      const c = box.querySelector('[data-a=cancel]'); if (c) c.onclick = () => done(null)
      back.addEventListener('pointerdown', e => { if (e.target === back) done(null) })
      back.appendChild(box); layer.appendChild(back)
      const first = form.querySelector('input,select')
      setTimeout(() => { (first || box.querySelector('[data-a=ok]')).focus(); first?.select?.() }, 0)
    })
  }
  ui.prompt = (title, value = '', o = {}) => modal({ title, ok: o.ok || 'OK', fields: [{ key: 'v', label: o.label, value }] }).then(r => r ? String(r.v).trim() || null : null)
  ui.confirm = (title, o = {}) => modal({ title, body: o.body, ok: o.ok || (o.danger ? 'Delete' : 'OK'), danger: o.danger }).then(r => !!r)
  ui.form = o => modal(o)
  ui.alert = (title, body) => modal({ title, body, cancel: null })

  // ---------- menus ----------
  let openMenu = null
  function resolveItems(items) {
    const out = []
    for (const it of items || []) {
      if (it === '-') { if (out.length && out[out.length - 1] !== '-') out.push('-'); continue }
      if (typeof it === 'string') {
        const c = app.commands.get(it)
        if (!c || c.hidden) continue
        let dis = false; try { dis = c.enabled ? !c.enabled(app, {}) : false } catch { dis = true }
        let chk; try { chk = c.checked ? !!c.checked(app) : undefined } catch {}
        out.push({ label: c.label, icon: c.icon, key: keyText(c.key), disabled: dis, checked: chk, run: () => app.exec(it), id: it })
      } else out.push(it)
    }
    while (out[out.length - 1] === '-') out.pop()
    while (out[0] === '-') out.shift()
    return out
  }
  function menuEl(list, cls = 'menu') {
    const m = h('div', cls); m.setAttribute('role', 'menu')
    for (const it of list) {
      if (it === '-') { m.appendChild(h('div', 'm-sep')); continue }
      const b = h('button', 'm-item' + (it.disabled ? ' disabled' : '') + (it.danger ? ' danger' : ''))
      b.setAttribute('role', it.checked !== undefined ? 'menuitemcheckbox' : 'menuitem')
      if (it.checked !== undefined) b.setAttribute('aria-checked', String(it.checked))
      if (it.id) b.dataset.cmd = it.id
      b.innerHTML = `<span class="m-ic">${it.checked ? icon('check') : it.icon ? icon(it.icon) : ''}</span><span class="m-l">${esc(it.label)}</span>${it.sub ? `<span class="m-k m-go">${icon('chevronRight')}</span>` : `<span class="m-k">${esc(it.key || '')}</span>`}`
      b.disabled = !!it.disabled
      b.addEventListener('click', () => { if (!it.keep) closeMenus(); it.run?.() })
      m.appendChild(b)
    }
    return m
  }
  function closeMenus() {
    if (openMenu) { openMenu.el.remove(); openMenu.btn?.classList.remove('open'); openMenu = null }
    layer.querySelectorAll('.sheet-wrap.menu-sheet').forEach(s => s.close?.())
  }
  ui.closeMenus = closeMenus
  function placeMenu(m, x, y, alignRight) {
    layer.appendChild(m)
    const r = m.getBoundingClientRect(), W = innerWidth, H = innerHeight
    let L = alignRight ? x - r.width : x, T = y
    if (L + r.width > W - 6) L = W - 6 - r.width
    if (T + r.height > H - 6) T = Math.max(6, y - r.height)
    m.style.left = Math.max(6, L) + 'px'; m.style.top = Math.max(6, T) + 'px'
  }
  ui.menu = (items, x, y, o = {}) => {
    closeMenus()
    const list = resolveItems(items)
    if (!list.length) return
    if (isPhone() || o.sheet) return ui.sheet({ title: o.title, items: list, cls: 'menu-sheet' })
    const m = menuEl(list)
    placeMenu(m, x, y)
    openMenu = { el: m, btn: o.btn }
    m.querySelector('.m-item:not(.disabled)')?.focus({ preventScroll: true })
  }
  ui.contextMenu = (x, y) => ui.menu(app.menus.get('Context') || [], x, y, { title: app.selection.length ? selLabel() : 'Scene' })
  document.addEventListener('pointerdown', e => { if (openMenu && !openMenu.el.contains(e.target) && !openMenu.btn?.contains(e.target)) closeMenus() }, true)
  addEventListener('blur', () => closeMenus())

  // ---------- bottom sheets (phone) ----------
  ui.sheet = ({ title, items, render, cls = '' }) => {
    const wrap = h('div', 'sheet-wrap ' + cls), back = h('div', 'sheet-back'), sh = h('div', 'sheet')
    sh.innerHTML = `<div class="sheet-handle"><span></span></div>${title ? `<div class="sheet-h">${esc(title)}</div>` : ''}`
    const body = h('div', 'sheet-b'); sh.appendChild(body)
    let cleanup = null
    const close = () => { if (!wrap.isConnected) return; cleanup?.(); wrap.classList.add('out'); setTimeout(() => wrap.remove(), 160) }
    wrap.close = close
    if (items) { const m = menuEl(resolveItems(items), 'menu sheet-menu'); m.addEventListener('click', e => { if (e.target.closest('.m-item')) close() }); body.appendChild(m) }
    if (render) cleanup = render(body, close) || null
    back.addEventListener('click', close)
    dragToClose(sh, close)
    wrap.append(back, sh); layer.appendChild(wrap)
    return close
  }
  function dragToClose(sh, close) {
    const hd = sh.querySelector('.sheet-handle')
    let y0 = null
    hd.addEventListener('pointerdown', e => { y0 = e.clientY; hd.setPointerCapture(e.pointerId) })
    hd.addEventListener('pointermove', e => { if (y0 !== null) sh.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)` })
    hd.addEventListener('pointerup', e => { if (y0 === null) return; const d = e.clientY - y0; y0 = null; sh.style.transform = ''; if (d > 60) close() })
    hd.addEventListener('click', () => { if (y0 === null) close() })
  }

  // ---------- menubar ----------
  const menubar = $('.menubar')
  function menuNames() {
    const extra = [...app.menus.keys()].filter(n => !MENU_ORDER.includes(n) && n !== 'Context'), v = MENU_ORDER.indexOf('View')
    const names = [...MENU_ORDER.slice(0, v), ...extra, ...MENU_ORDER.slice(v)] // plugin menus before View/Help
    return names.filter(n => resolveItems(app.menus.get(n)).length)
  }
  function buildMenubar() {
    menubar.innerHTML = ''
    for (const n of menuNames()) {
      const b = h('button', 'mb', esc(n)); b.dataset.menu = n
      const open = () => { const r = b.getBoundingClientRect(); ui.menu(app.menus.get(n), r.left, r.bottom + 2, { btn: b }); if (openMenu) b.classList.add('open') }
      b.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); if (openMenu?.btn === b) closeMenus(); else open() })
      b.addEventListener('pointerenter', () => { if (openMenu && openMenu.btn && openMenu.btn !== b) open() })
      b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); open() } })
      menubar.appendChild(b)
    }
  }
  // phone ••• menu: up to 8 category rows, each opens a sub-sheet with a back chevron
  const MORE_CATS = [['File', 'folder', ['File']], ['Edit', 'pen', ['Edit', 'Model']], ['Add', 'plus', ['Add']], ['Mesh', 'mesh', ['Mesh', 'Sculpt', 'Texture', 'Paint', 'Draw']], ['Animate', 'play', ['Animate']], ['View', 'eye', ['View']], ['Help', 'info', ['Help']]]
  function moreCats() {
    const names = menuNames(), known = new Set(MORE_CATS.flatMap(c => c[2]))
    const cats = MORE_CATS.map(([label, ic, ms]) => ({ label, icon: ic, menus: ms.filter(n => names.includes(n)) }))
    cats[1].menus.push(...names.filter(n => !known.has(n))) // other plugin menus fold into Edit
    return cats.filter(c => c.menus.length)
  }
  const modeList = () => [...app.modes.values()].sort((a, b) => a.order - b.order)
  const modeItems = () => modeList().map(m => ({ label: m.label, icon: m.icon || 'cube', checked: app.mode === m.id, run: () => app.setMode(m.id) }))
  $('.t-more').addEventListener('click', () => ui.sheet({
    title: 'Menu', cls: 'menu-sheet', render: el => {
      const hd = el.parentElement.querySelector('.sheet-h')
      const show = cat => {
        el.innerHTML = ''; el.scrollTop = 0
        hd.innerHTML = cat ? `<button class="ib sheet-bk" aria-label="Back">${icon('chevronLeft')}</button><span>${esc(cat.label)}</span>` : 'Menu'
        hd.classList.toggle('has-bk', !!cat)
        hd.querySelector('.sheet-bk')?.addEventListener('click', () => show(null))
        if (!cat) {
          const top = []
          if (app.modes.size > 1) top.push({ label: 'Mode', icon: app.modes.get(app.mode)?.icon || 'cube', sub: true, keep: true, run: () => show({ label: 'Mode', items: modeItems() }) })
          for (const c of moreCats()) top.push({ label: c.label, icon: c.icon, sub: true, keep: true, run: () => show(c) })
          el.appendChild(menuEl(top, 'menu sheet-menu')); return
        }
        if (cat.items) { el.appendChild(menuEl(cat.items, 'menu sheet-menu')); return }
        for (const n of cat.menus) {
          const sec = h('div', 'sheet-sec'); if (cat.menus.length > 1) sec.appendChild(h('div', 'sheet-sub', esc(n)))
          sec.appendChild(menuEl(resolveItems(app.menus.get(n)), 'menu sheet-menu')); el.appendChild(sec)
        }
      }
      show(null)
    }
  }))
  $('.t-mode').addEventListener('click', () => ui.sheet({ title: 'Mode', items: modeItems(), cls: 'menu-sheet' }))

  // ---------- modes ----------
  const modesEl = $('.modes')
  function buildModes() {
    const ms = [...app.modes.values()].sort((a, b) => a.order - b.order)
    modesEl.hidden = ms.length < 2
    modesEl.innerHTML = ms.map(m => `<button role="tab" data-mode="${esc(m.id)}" title="${esc(m.label)}" aria-label="${esc(m.label)}" aria-selected="${app.mode === m.id}">${icon(m.icon || 'cube')}<span>${esc(m.label)}</span></button>`).join('')
    const cur = app.modes.get(app.mode); $('.t-pill').hidden = ms.length < 2
    $('.t-mi').innerHTML = icon(cur?.icon || 'cube'); $('.t-ml').textContent = cur?.short || cur?.label || 'Build'; $('.t-mode').setAttribute('aria-label', 'Mode: ' + (cur?.label || 'Build'))
  }
  modesEl.addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) app.setMode(b.dataset.mode) })

  // ---------- tool strip + mobile bar ----------
  const strip = $('.toolstrip'), mbar = $('.mobilebar')
  function toolsForMode() {
    return [...app.tools.values()].filter(t => t.builtin ? (app.mode === 'build' || t.anyMode || app.modes.get(app.mode)?.gizmo) : (!t.mode || t.mode === app.mode)).sort((a, b) => (a.builtin === b.builtin ? 0 : a.builtin ? -1 : 1) || a.order - b.order)
  }
  function buildTools() {
    const ts = toolsForMode()
    strip.innerHTML = ts.map(t => `<button class="tb${app.tool === t.id ? ' on' : ''}" data-tool="${esc(t.id)}" title="${esc(t.label)}${t.key ? ' (' + esc(t.key) + ')' : ''}" aria-label="${esc(t.label)}" aria-pressed="${app.tool === t.id}">${icon(t.icon || 'dot')}</button>`).join('')
    // phone bar, at most 6 slots: 4 tools (the active one always shown), Add or More (overflow tools + Add), Panels
    const vis = ts.slice(0, 4), cur = ts.find(t => t.id === app.tool)
    if (cur && !vis.includes(cur)) vis[3] = cur
    phoneOver = ts.filter(t => !vis.includes(t))
    const add = app.menus.get('Add') && resolveItems(app.menus.get('Add')).length
    const mb = (act, ic, label, on) => `<button class="mbt${on ? ' on' : ''}" data-act="${act}" aria-label="${label}">${icon(ic)}<span>${label}</span></button>`
    mbar.innerHTML = vis.map(t => `<button class="mbt${app.tool === t.id ? ' on' : ''}" data-tool="${esc(t.id)}" aria-label="${esc(t.label)}">${icon(t.icon || 'dot')}<span>${esc(t.short || t.label.replace(/ tool$/, ''))}</span></button>`).join('') +
      (phoneOver.length ? mb('more', 'more', 'More') : add ? mb('add', 'plus', 'Add') : '') + mb('panels', 'layers', 'Panels', sidebar.classList.contains('open'))
  }
  let phoneOver = []
  const onToolClick = e => {
    const b = e.target.closest('button'); if (!b) return
    if (b.dataset.tool) { app.setTool(b.dataset.tool); return }
    const act = b.dataset.act
    if (act === 'add') ui.menu(app.menus.get('Add'), 0, 0, { sheet: true, title: 'Add' })
    else if (act === 'more') {
      const add = app.menus.get('Add') && resolveItems(app.menus.get('Add')).length
      ui.sheet({ title: 'More', cls: 'menu-sheet', items: [...phoneOver.map(t => ({ label: t.label, icon: t.icon || 'dot', checked: app.tool === t.id ? true : undefined, run: () => app.setTool(t.id) })), ...(add ? ['-', { label: 'Add', icon: 'plus', sub: true, run: () => ui.menu(app.menus.get('Add'), 0, 0, { sheet: true, title: 'Add' }) }] : [])] })
    } else if (act === 'panels') sidebar.classList.contains('open') ? closeSide() : openSide(sidebar.dataset.tab || (app.selection.length ? 'props' : 'explorer'))
    else if (act) openSide(act)
  }
  strip.addEventListener('click', onToolClick); mbar.addEventListener('click', onToolClick)

  // ---------- top bar ----------
  const pname = $('.pname'), saveChip = $('.save-chip')
  pname.addEventListener('change', () => { app.rename(pname.value); pname.blur() })
  pname.addEventListener('keydown', e => { if (e.key === 'Enter') pname.blur(); if (e.key === 'Escape') { pname.value = app.scene.name; pname.blur() } })
  $('.t-home').addEventListener('click', () => { location.hash = '#' })
  $('.t-undo').addEventListener('click', () => app.exec('edit.undo'))
  $('.t-redo').addEventListener('click', () => app.exec('edit.redo'))
  $('.t-search').addEventListener('click', () => ui.palette())
  $('.t-snap').addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect()
    ui.menu([{ label: app.prefs.snap ? 'Snap on' : 'Snap off', checked: app.prefs.snap, run: () => app.setPref('snap', !app.prefs.snap) }, '-',
      ...[0.25, 0.5, 1, 2, 4].map(v => ({ label: 'Move ' + v + ' stud' + (v === 1 ? '' : 's'), checked: app.prefs.moveSnap === v, run: () => { app.setPref('moveSnap', v); app.setPref('snap', true) } })), '-',
      ...[5, 15, 45, 90].map(v => ({ label: 'Rotate ' + v + '°', checked: app.prefs.rotSnap === v, run: () => { app.setPref('rotSnap', v); app.setPref('snap', true) } }))], r.left, r.bottom + 2, { btn: e.currentTarget, title: 'Snap' })
  })
  $('.t-space').addEventListener('click', () => app.exec('edit.space'))
  function updateTop() {
    if (document.activeElement !== pname) pname.value = app.scene.name
    $('.t-pn').textContent = app.scene.name
    $('.t-undo').disabled = !app.undoStack.length; $('.t-redo').disabled = !app.redoStack.length
    const sn = $('.t-snap'); sn.classList.toggle('on', !!app.prefs.snap); sn.querySelector('.snapv').textContent = app.prefs.snap ? app.prefs.moveSnap + ' · ' + app.prefs.rotSnap + '°' : 'Off'
    const sp = $('.t-space'); sp.innerHTML = icon(app.prefs.space === 'local' ? 'local' : 'globe') + `<span class="snapv">${app.prefs.space === 'local' ? 'Local' : 'World'}</span>`
  }
  function updateSave() {
    const st = app.store, mode = st?.mode, s = st?.status
    const [txt, cls] = s === 'error' ? ['Not saved', 'bad'] : mode === 'memory' ? ['Not saved', 'bad'] : s === 'saving' ? ['Saving…', 'busy'] : mode === 'local' ? ['Saved in this browser', 'warn'] : ['Saved', 'good']
    saveChip.className = 'chip save-chip ' + cls; saveChip.innerHTML = `<i></i>${txt}`
    saveChip.title = mode === 'memory' ? 'Storage is blocked: changes are lost when the page closes' : mode === 'local' ? 'Offline: saved in this browser only' : txt
    $('.sb-store').textContent = mode === 'cloud' ? 'Cloud sync' : mode === 'local' ? 'This browser only' : 'Not saved'
  }

  // ---------- sidebar: explorer + panels ----------
  const sidebar = $('.sidebar'), sideScroll = $('.side-scroll'), explorerEl = $('.explorer'), splitter = $('.splitter')
  const explorer = mountExplorer(app, explorerEl, ui)
  for (const p of corePanels) app.registerPanel(p)
  const applySplit = () => { explorerEl.style.flexBasis = Math.round(uiState.split * 100) + '%' }
  applySplit()
  splitter.addEventListener('pointerdown', e => {
    splitter.setPointerCapture(e.pointerId)
    const r = sidebar.getBoundingClientRect()
    const mv = ev => { uiState.split = Math.min(0.8, Math.max(0.12, (ev.clientY - r.top) / r.height)); applySplit() }
    const up = () => { splitter.removeEventListener('pointermove', mv); splitter.removeEventListener('pointerup', up); saveUI(); explorer.refresh() }
    splitter.addEventListener('pointermove', mv); splitter.addEventListener('pointerup', up)
  })
  function openSide(tab) {
    sidebar.dataset.tab = tab; sidebar.classList.add('open')
    for (const b of sidebar.querySelectorAll('.side-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === tab)
    mbar.querySelector('[data-act=panels]')?.classList.add('on')
    explorer.refresh()
    // phone sheet: keep the scene centre visible above it
    if (getComputedStyle(sidebar).position === 'fixed') app.viewport?.setInset(app.viewport.el.getBoundingClientRect().bottom - (innerHeight - sidebar.offsetHeight))
  }
  function closeSide() { sidebar.classList.remove('open'); mbar.querySelector('[data-act=panels]')?.classList.remove('on'); app.viewport?.setInset(0) }
  ui.openSide = openSide; ui.closeSide = closeSide
  sidebar.querySelector('.side-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.classList.contains('side-close')) closeSide(); else openSide(b.dataset.tab) })
  dragToClose(sidebar, closeSide)

  // Panels: {id, label, icon, mode?, where 'right'|'bottom', order, when?(app), render(el, app) -> cleanup?, refresh?(el, app, ev)}
  const live = new Map() // id -> {p, sec, body, cleanup}
  const dockEl = $('.dock'), dockTabs = $('.dock-tabs'), dockBody = $('.dock-body')
  function panelVisible(p) {
    if (p.mode && p.mode !== app.mode) return false
    try { return p.when ? !!p.when(app) : true } catch { return false }
  }
  function mountPanel(p, body) {
    let cleanup = null
    try { cleanup = p.render(body, app) || null } catch (e) { console.error(e); body.innerHTML = `<div class="p-err">${icon('warn')}Panel failed: ${esc(e.message)}</div>` }
    return cleanup
  }
  function syncPanels(ev) {
    const all = [...app.panels.values()].sort((a, b) => a.order - b.order)
    const right = all.filter(p => p.where !== 'bottom' && panelVisible(p))
    const bottom = all.filter(p => p.where === 'bottom' && panelVisible(p))
    const want = new Set([...right, ...bottom].map(p => p.id))
    for (const [id, l] of live) if (!want.has(id) || l.p !== app.panels.get(id)) { try { l.cleanup?.() } catch {} l.sec.remove(); live.delete(id) }
    let prev = null
    for (const p of right) {
      let l = live.get(p.id)
      if (!l) {
        const sec = h('section', 'sec' + (uiState.collapsed[p.id] ? ' closed' : ''))
        sec.dataset.panel = p.id
        const hd = h('button', 'sec-h', `${icon('chevron', 'car')}<span>${esc(p.label)}</span>`)
        hd.setAttribute('aria-expanded', String(!uiState.collapsed[p.id]))
        const body = h('div', 'sec-b')
        sec.append(hd, body)
        hd.addEventListener('click', () => { const c = sec.classList.toggle('closed'); hd.setAttribute('aria-expanded', String(!c)); uiState.collapsed[p.id] = c; saveUI() })
        l = { p, sec, body, cleanup: mountPanel(p, body) }
        live.set(p.id, l)
      } else if (ev) refreshPanel(l, ev)
      const ref = prev ? prev.nextSibling : sideScroll.firstChild
      if (l.sec !== ref) sideScroll.insertBefore(l.sec, ref)
      prev = l.sec
    }
    // bottom dock: tabs
    dockEl.hidden = !bottom.length
    editor.classList.toggle('has-dock', bottom.length > 0)
    if (bottom.length) {
      if (!bottom.some(p => p.id === uiState.dockTab)) uiState.dockTab = bottom[0].id
      dockTabs.innerHTML = bottom.map(p => `<button data-tab="${esc(p.id)}" class="${p.id === uiState.dockTab ? 'on' : ''}">${p.icon ? icon(p.icon) : ''}${esc(p.label)}</button>`).join('') + `<span class="grow"></span><button class="ib dock-min" aria-label="Collapse">${icon(uiState.dockMin ? 'chevron' : 'chevron', uiState.dockMin ? 'flip' : '')}</button>`
      dockEl.classList.toggle('min', !!uiState.dockMin)
      dockEl.style.height = uiState.dockMin ? '' : dockH() + 'px'
      for (const p of bottom) {
        let l = live.get(p.id)
        if (!l) { const sec = h('div', 'dock-pane'); const body = sec; l = { p, sec, body, cleanup: mountPanel(p, body) }; live.set(p.id, l); dockBody.appendChild(sec) }
        else if (ev) refreshPanel(l, ev)
        l.sec.hidden = p.id !== uiState.dockTab
      }
    }
  }
  function refreshPanel(l, ev) {
    if (l.p.refresh) { try { l.p.refresh(l.body, app, ev) } catch (e) { console.error(e) } }
    else if (ev.type === 'select' || ev.type === 'mode') { try { l.cleanup?.() } catch {} l.body.innerHTML = ''; l.cleanup = mountPanel(l.p, l.body) }
  }
  dockTabs.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    if (b.classList.contains('dock-min')) { uiState.dockMin = !uiState.dockMin; saveUI(); syncPanels(); return }
    uiState.dockTab = b.dataset.tab; uiState.dockMin = false; saveUI(); syncPanels()
  })
  dockTabs.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || uiState.dockMin) return
    const y0 = e.clientY, h0 = dockH()
    dockTabs.setPointerCapture(e.pointerId)
    const mv = ev => { uiState[DK()] = Math.max(120, Math.min(innerHeight * 0.6, h0 + y0 - ev.clientY)); dockEl.style.height = uiState[DK()] + 'px' }
    const up = () => { dockTabs.removeEventListener('pointermove', mv); dockTabs.removeEventListener('pointerup', up); saveUI() }
    dockTabs.addEventListener('pointermove', mv); dockTabs.addEventListener('pointerup', up)
  })
  ui.openPanel = id => {
    const p = app.panels.get(id); if (!p) return
    if (p.where === 'bottom') { uiState.dockTab = id; uiState.dockMin = false; syncPanels(); return }
    uiState.collapsed[id] = false; syncPanels()
    const l = live.get(id); if (!l) return
    l.sec.classList.remove('closed')
    if (isPhone()) openSide('props')
    l.sec.scrollIntoView({ block: 'nearest' })
  }
  ui.refreshPanels = () => syncPanels({ type: 'refresh' })

  // ---------- status bar + viewport label ----------
  const sbSel = $('.sb-sel'), sbHint = $('.sb-hint'), sbStats = $('.sb-stats'), vpLabel = $('.vp-label')
  const HINTS = {
    select: 'Click to select · Drag to move · Drag empty space to box select',
    move: 'Drag an arrow or plane to move', rotate: 'Drag a ring to rotate', scale: 'Drag a handle to resize'
  }
  function selLabel() {
    const s = app.selection
    if (!s.length) return ''
    if (s.length === 1) { const o = app.obj(s[0]); return o?.name || s[0] }
    return s.length + ' selected'
  }
  function updateStatus() {
    const s = app.selection
    sbSel.textContent = s.length ? (s.length === 1 ? selLabel() + ' · ' + (app.obj(s[0])?.type || '') : selLabel()) : app.ids().length + ' objects'
    const t = app.tools.get(app.tool)
    sbHint.textContent = t?.hint || HINTS[app.tool] || t?.label || ''
  }
  let statTxt = ''
  app.on('render', st => {
    const k = st.tris >= 1e6 ? (st.tris / 1e6).toFixed(2) + 'M' : st.tris >= 1e3 ? (st.tris / 1e3).toFixed(1) + 'k' : String(st.tris)
    const txt = k + ' tris · ' + st.calls + ' draws'
    if (txt !== statTxt) { statTxt = txt; sbStats.textContent = txt }
    const vp = app.viewport
    const view = vp.view === 'user' ? (vp.ortho ? 'User · Ortho' : 'Perspective') : vp.view[0].toUpperCase() + vp.view.slice(1) + (vp.ortho ? ' · Ortho' : '')
    if (vpLabel.textContent !== view) vpLabel.textContent = view
  })

  // ---------- palette ----------
  ui.palette = () => {
    if (layer.querySelector('.palette')) return
    closeMenus()
    const back = h('div', 'backdrop top'), box = h('div', 'palette')
    box.innerHTML = `<div class="pal-in">${icon('search')}<input placeholder="Type a command" spellcheck="false" aria-label="Search commands"></div><div class="pal-list" role="listbox"></div>`
    const inp = box.querySelector('input'), list = box.querySelector('.pal-list')
    let recent = ls.get('studio.recent', []), items = [], idx = 0
    const all = [...app.commands.values()].filter(c => !c.hidden && c.id !== 'help.palette')
    const menuOf = id => { for (const [n, l] of app.menus) if (n !== 'Context' && l.includes(id)) return n; return '' }
    const score = (q, s) => {
      s = s.toLowerCase(); if (!q) return 1
      const i = s.indexOf(q); if (i >= 0) return 100 - i + (i === 0 || s[i - 1] === ' ' ? 50 : 0)
      let j = 0, sc = 0, last = -2
      for (let k = 0; k < s.length && j < q.length; k++) if (s[k] === q[j]) { sc += k === last + 1 ? 3 : (k === 0 || s[k - 1] === ' ' || s[k - 1] === '.') ? 2 : 1; last = k; j++ }
      return j === q.length ? sc : 0
    }
    const draw = () => {
      const q = inp.value.trim().toLowerCase()
      items = all.map(c => ({ c, s: Math.max(score(q, c.label), score(q, c.id) * 0.8) + (!q && recent.includes(c.id) ? 200 - recent.indexOf(c.id) : 0) })).filter(x => x.s > 0)
      items.sort((a, b) => b.s - a.s || a.c.label.localeCompare(b.c.label))
      items = items.slice(0, 60)
      idx = Math.min(idx, Math.max(0, items.length - 1))
      list.innerHTML = items.length ? items.map(({ c }, i) => {
        let dis = false; try { dis = c.enabled ? !c.enabled(app, {}) : false } catch { dis = true }
        return `<button class="pal-item${i === idx ? ' on' : ''}${dis ? ' disabled' : ''}" data-i="${i}" role="option">${icon(c.icon || 'dot')}<span class="pal-l">${esc(c.label)}</span><span class="pal-m">${esc(menuOf(c.id))}</span><span class="m-k">${esc(keyText(c.key))}</span></button>`
      }).join('') : '<div class="pal-empty">No matching commands</div>'
      list.querySelector('.on')?.scrollIntoView({ block: 'nearest' })
    }
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey, true) }
    const runAt = i => {
      const it = items[i]; if (!it) return
      close()
      recent = [it.c.id, ...recent.filter(r => r !== it.c.id)].slice(0, 8); ls.set('studio.recent', recent)
      app.exec(it.c.id)
    }
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(items.length - 1, idx + 1); draw() }
      else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); draw() }
      else if (e.key === 'Enter') { e.preventDefault(); runAt(idx) }
    }
    document.addEventListener('keydown', onKey, true)
    inp.addEventListener('input', () => { idx = 0; draw() })
    list.addEventListener('click', e => { const b = e.target.closest('.pal-item'); if (b) runAt(+b.dataset.i) })
    back.addEventListener('pointerdown', e => { if (e.target === back) close() })
    back.appendChild(box); layer.appendChild(back)
    draw(); inp.focus()
  }

  // ---------- shortcuts sheet ----------
  ui.shortcuts = () => {
    const groups = new Map()
    for (const c of app.commands.values()) {
      if (!c.key || c.hidden) continue
      let g = 'Other'; for (const [n, l] of app.menus) if (n !== 'Context' && l.includes(c.id)) { g = n; break }
      if (c.id.startsWith('tool.')) g = 'Tools'
      if (!groups.has(g)) groups.set(g, []); groups.get(g).push(c)
    }
    const mouse = [['Select', 'Click'], ['Box select', 'Drag empty space'], ['Orbit', 'Right-drag or Alt+drag'], ['Pan', 'Middle-drag or Shift+right-drag'], ['Zoom', 'Wheel']]
    const html = `<div class="sc-grid">${[...groups].map(([g, cs]) => `<div class="sc-g"><div class="sc-h">${esc(g)}</div>${cs.map(c => `<div class="sc-r"><span>${esc(c.label)}</span><span class="kbd">${[].concat(c.key).map(esc).join(' / ')}</span></div>`).join('')}</div>`).join('')}<div class="sc-g"><div class="sc-h">Mouse</div>${mouse.map(([a, b]) => `<div class="sc-r"><span>${a}</span><span class="kbd">${b}</span></div>`).join('')}</div></div>`
    if (isPhone()) return ui.sheet({ title: 'Keyboard shortcuts', render: el => { el.innerHTML = html } })
    const back = h('div', 'backdrop'), box = h('div', 'dialog wide')
    box.innerHTML = `<div class="dlg-h">Keyboard shortcuts<button class="ib dlg-x" aria-label="Close">${icon('close')}</button></div><div class="dlg-scroll">${html}</div>`
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey, true) }
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    document.addEventListener('keydown', onKey, true)
    box.querySelector('.dlg-x').onclick = close
    back.addEventListener('pointerdown', e => { if (e.target === back) close() })
    back.appendChild(box); layer.appendChild(back)
  }

  // ---------- keyboard ----------
  let keymap = new Map()
  function buildKeys() {
    keymap = new Map()
    for (const c of app.commands.values()) for (const k of [].concat(c.key || [])) if (!keymap.has(k)) keymap.set(k, c.id); else if (!Array.isArray(keymap.get(k))) keymap.set(k, [keymap.get(k), c.id]); else keymap.get(k).push(c.id)
  }
  addEventListener('keydown', e => {
    if (editor.hidden || dialogOpen || layer.querySelector('.palette')) return
    const t = e.target
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) { if (e.key === 'Escape') t.blur(); return }
    if (e.key === 'Escape' && (openMenu || layer.querySelector('.sheet-wrap'))) { closeMenus(); layer.querySelectorAll('.sheet-wrap').forEach(s => s.close?.()); e.preventDefault(); return }
    if (e.repeat && !/^(Ctrl\+)?(Z|Y)$|Shift\+Z/.test(comboOf(e))) { if (keymap.has(comboOf(e))) e.preventDefault(); return }
    const combo = comboOf(e)
    let ids = keymap.get(combo)
    if (!ids) return
    ids = [].concat(ids).sort((a, b) => (app.commands.get(b)?.mode === app.mode) - (app.commands.get(a)?.mode === app.mode)) // commands of the current mode win
    const id = ids.find(i => { const c = app.commands.get(i); try { return !c.enabled || c.enabled(app, {}) } catch { return false } })
    if (!id && combo === 'Tab') { if (t === document.body || t?.tagName === 'CANVAS') e.preventDefault(); return } // keep focus in the viewport; panels keep Tab navigation
    e.preventDefault()
    if (id) app.exec(id)
  })

  // ---------- project tabs: the open project + every project an AI is building (meta.ai), so the owner watches it live ----------
  // meta.building: true from the AI's first write to its last, false when finished. Live = building and written in the last
  // 10 min (stages can be minutes apart); without the flag, written in the last 90 s. A finished build leaves the strip at once.
  const tabsEl = $('.ptabs'), age = p => Date.now() - (new Date(p.updated).getTime() || 0)   // ISO string or epoch ms
  const isLive = p => !!p.ai && p.building !== false && age(p) < (p.building ? 10 * 60e3 : 90e3)
  let tabsUnsub = null, tabList = [], seenAI = null
  function renderTabs() {
    const cur = app.projectId, tabs = tabList.filter(p => p.id === cur || isLive(p)).slice(0, 8)
    tabsEl.hidden = !tabs.some(isLive)
    if (!tabsEl.hidden) tabsEl.innerHTML = tabs.map(p => `<button class="ptab${p.id === cur ? ' cur' : ''}" role="tab" aria-selected="${p.id === cur}" data-id="${esc(p.id)}">${p.ai ? `<i class="${isLive(p) ? 'live' : ''}"></i>` : ''}<span>${esc(p.name)}</span>${p.ai ? '<b>AI</b>' : ''}</button>`).join('')
  }
  function watchTabs() {
    if (tabsUnsub || !app.store?.db) return
    tabsUnsub = app.store.listProjects(list => {
      const ai = list.filter(p => p.ai)
      if (seenAI) for (const p of ai) if (!seenAI.has(p.id) && isLive(p)) ui.toast('AI started "' + p.name + '": open its tab to watch', 'ok')
      seenAI = new Set(ai.map(p => p.id)); tabList = list; renderTabs()
    })
  }
  tabsEl.addEventListener('click', e => { const t = e.target.closest('.ptab'); if (t && t.dataset.id !== app.projectId) location.hash = '#' + t.dataset.id })
  setInterval(() => { if (!document.hidden) renderTabs() }, 15e3)

  // ---------- home page ----------
  let homeUnsub = null, homeList = null, picking = false
  const picked = new Set()   // multi-delete (owner 2026-11-26): pick cards, delete them in one go
  function renderHome(list) {
    homeList = list
    if (list) for (const id of [...picked]) if (!list.some(p => p.id === id)) picked.delete(id)
    const mode = app.store?.mode
    const banner = mode === 'local' ? `<div class="banner warn">${icon('cloudOff')}Offline: projects are saved in this browser only.</div>` : mode === 'memory' ? `<div class="banner bad">${icon('warn')}Not saved: storage is blocked, so projects are lost when this page closes.</div>` : ''
    homeEl.innerHTML = `<header class="h-top"><div class="brand">${icon('cube')}<span>Umbrio Sandbox</span></div><span class="grow"></span>${picking ? `<span class="mute h-cnt">${picked.size} selected</span><button class="btn h-all">${list && picked.size === list.length ? 'Clear' : 'Select all'}</button><button class="btn danger h-del"${picked.size ? '' : ' disabled'}>${icon('trash')}Delete${picked.size ? ' ' + picked.size : ''}</button><button class="btn h-cancel">Cancel</button>` : `${list?.length ? `<button class="btn h-sel">${icon('check')}Select</button>` : ''}<button class="btn primary h-new">${icon('plus')}New project</button>`}</header>
      <div class="h-main">${banner}<div class="h-title"><h1>Projects</h1><span class="mute">${list ? list.length : ''}</span></div>
      ${list === null ? '<div class="h-grid">' + '<div class="card skel"></div>'.repeat(4) + '</div>' : list.length ? `<div class="h-grid">${list.map(p => `<div class="card${picking ? ' pick' : ''}${picked.has(p.id) ? ' on' : ''}" data-id="${esc(p.id)}" tabindex="0" role="${picking ? 'checkbox' : 'link'}" ${picking ? 'aria-checked="' + picked.has(p.id) + '" ' : ''}aria-label="${picking ? 'Select' : 'Open'} ${esc(p.name)}">${picking ? `<span class="c-chk">${picked.has(p.id) ? icon('check') : ''}</span>` : ''}<div class="thumb">${p.thumb ? `<img src="${esc(p.thumb)}" alt="" loading="lazy">` : icon('cube', 'big')}</div><div class="c-b"><div class="c-t"><div class="c-n">${p.ai ? `<b class="c-ai${isLive(p) ? ' live' : ''}">AI</b>` : ''}${esc(p.name)}</div><div class="c-m"><span>${p.count ?? 0} object${p.count === 1 ? '' : 's'}</span><span class="c-a">${esc(ago(p.updated))}</span></div></div><button class="ib c-more" aria-label="Project actions">${icon('more')}</button></div></div>`).join('')}</div>`
        : `<div class="empty">${icon('cube', 'huge')}<h2>No projects yet</h2><p>Create a project to start building.</p><button class="btn primary h-new">${icon('plus')}New project</button></div>`}</div>`
  }
  async function newProject() {
    const name = await ui.prompt('New project', 'Untitled', { ok: 'Create', label: 'Name' })
    if (name) app.exec('file.new', { name })
  }
  homeEl.addEventListener('click', async e => {
    if (e.target.closest('.h-new')) return newProject()
    if (e.target.closest('.h-sel')) { picking = true; picked.clear(); return renderHome(homeList) }
    if (e.target.closest('.h-cancel')) { picking = false; picked.clear(); return renderHome(homeList) }
    if (e.target.closest('.h-all')) { if (homeList && picked.size === homeList.length) picked.clear(); else (homeList || []).forEach(p => picked.add(p.id)); return renderHome(homeList) }
    if (e.target.closest('.h-del')) return deletePicked()
    const card = e.target.closest('.card[data-id]'); if (!card) return
    const id = card.dataset.id, st = app.store
    if (picking) { picked.has(id) ? picked.delete(id) : picked.add(id); return renderHome(homeList) }
    if (e.target.closest('.c-more')) {
      const r = e.target.closest('.c-more').getBoundingClientRect()
      const name = card.querySelector('.c-n').textContent
      ui.menu([
        { label: 'Open', icon: 'chevronRight', run: () => { location.hash = '#' + id } },
        { label: 'Rename', icon: 'pen', run: async () => { const n = await ui.prompt('Rename project', name); if (n) st.renameProject(id, n).catch(err => ui.toast(err.message, 'error')) } },
        { label: 'Duplicate', icon: 'duplicate', run: () => st.duplicateProject(id).then(() => ui.toast('Duplicated ' + name, 'ok'), err => ui.toast(err.message, 'error')) }, '-',
        { label: 'Delete', icon: 'trash', danger: true, run: async () => { if (await ui.confirm('Delete "' + name + '"?', { body: 'This removes the project and its meshes and textures.', danger: true })) st.deleteProject(id).catch(err => ui.toast(err.message, 'error')) } }
      ], r.right - 180, r.bottom + 2, { title: name })
      return
    }
    location.hash = '#' + id
  })
  async function deletePicked() {
    const ids = [...picked], names = ids.map(id => homeList?.find(p => p.id === id)?.name || id)
    if (!ids.length || !await ui.confirm(`Delete ${ids.length} project${ids.length === 1 ? '' : 's'}?`, { body: names.slice(0, 8).join(', ') + (names.length > 8 ? ` and ${names.length - 8} more` : '') + '. This removes them with their meshes and textures.', danger: true })) return
    picking = false; renderHome(homeList)   // cards vanish as each meta doc goes; no waiting on the dialog
    ui.toast(`Deleting ${ids.length}…`)
    let ok = 0; const bad = await app.store.deleteProjects(ids, id => { ok++; picked.delete(id) })
    picking = picked.size > 0
    ui.toast(bad.length ? `Deleted ${ok}, ${bad.length} failed: ${bad[0]}` : `Deleted ${ok} project${ok === 1 ? '' : 's'}`, bad.length ? 'error' : 'ok')
    renderHome(homeList)
  }
  homeEl.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    if (!e.target.classList.contains('card')) return
    if (picking) { e.preventDefault(); e.target.click() } else if (e.key === 'Enter') location.hash = '#' + e.target.dataset.id
  })
  ui.showHome = () => {
    closeMenus(); closeSide()
    editor.hidden = true; homeEl.hidden = false
    picking = false; picked.clear()
    document.title = 'Umbrio Sandbox'
    watchTabs()
    if (!homeUnsub && app.store?.db) { renderHome(null); homeUnsub = app.store.listProjects(list => { if (!homeEl.hidden) renderHome(list) }) }
    else if (!app.store?.db) renderHome([])
  }
  ui.showEditor = () => {
    homeUnsub?.(); homeUnsub = null
    homeEl.hidden = true; editor.hidden = false
    closeMenus(); watchTabs(); renderTabs()
  }
  ui.viewportEl = () => $('.vp')

  // ---------- wiring ----------
  let regQueued = false
  app.on('registry', () => {
    if (regQueued) return
    regQueued = true
    queueMicrotask(() => { regQueued = false; buildMenubar(); buildModes(); buildTools(); buildKeys(); syncPanels(); updateStatus() })
  })
  app.on('project', () => { renderTabs(); updateTop(); updateStatus(); syncPanels({ type: 'project' }); document.title = app.scene.name + ' · Umbrio Sandbox' })
  app.on('change', ch => { if (ch.top.includes('name')) { updateTop(); document.title = app.scene.name + ' · Umbrio Sandbox' } updateStatus(); syncPanels({ type: 'change', ...ch }) })
  app.on('select', () => { updateStatus(); syncPanels({ type: 'select' }) })
  app.on('history', updateTop)
  app.on('prefs', updateTop)
  app.on('tool', () => { buildTools(); updateStatus() })
  app.on('mode', () => { buildModes(); buildTools(); syncPanels({ type: 'mode' }) })
  app.on('viewport', () => syncPanels({ type: 'refresh' }))
  app.on('time', t => syncPanels({ type: 'time', time: t }))
  app.on('save', updateSave)
  app.on('storage', () => { updateSave(); tabsUnsub?.(); tabsUnsub = null; watchTabs(); if (!homeEl.hidden) { homeUnsub?.(); homeUnsub = null; ui.showHome() } })
  buildMenubar(); buildModes(); buildTools(); buildKeys(); updateTop(); updateSave(); updateStatus()
  return ui
}
