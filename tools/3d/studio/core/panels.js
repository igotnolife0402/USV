// Explorer tree (virtualized) and the core Properties and Scene panels.
import { SHAPES, MATERIALS } from './model.js'
import { icon } from './ui.js'

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const coarse = () => matchMedia('(pointer: coarse)').matches
const SHAPE_ICON = { box: 'cube', sphere: 'sphere', cylinder: 'cylinder', wedge: 'wedge', cornerwedge: 'cornerwedge', cone: 'cone', torus: 'torus', plane: 'plane', capsule: 'capsule' }
export const typeIcon = o => o.type === 'part' ? SHAPE_ICON[o.shape] || 'cube' : { group: 'model', mesh: 'mesh', light: o.kind === 'directional' ? 'sun' : 'light', stroke: 'stroke', model: 'folder' }[o.type] || 'dot'
const words = s => s.replace(/([a-z])([A-Z])/g, '$1 $2')

// ---------- Explorer ----------
export function mountExplorer(app, el, ui) {
  el.innerHTML = `<div class="ex-h"><span class="ex-t">Explorer</span><span class="ex-n mono"></span><label class="ex-f">${icon('search')}<input placeholder="Filter" spellcheck="false" autocomplete="off" aria-label="Filter objects"></label></div><div class="ex-list" tabindex="0" role="tree" aria-label="Objects" aria-multiselectable="true"><div class="ex-spacer"></div><div class="ex-rows"></div></div>`
  const list = el.querySelector('.ex-list'), spacer = el.querySelector('.ex-spacer'), rowsEl = el.querySelector('.ex-rows')
  const filterInp = el.querySelector('.ex-f input'), countEl = el.querySelector('.ex-n')
  const expanded = new Set()
  let flat = [], kids = new Map(), sigs = new Map(), filter = '', anchor = null, editing = null, pending = false, selfSelect = false, H = 24
  const sig = o => [o.name, o.parent, o.order, o.visible, o.locked, o.type, o.shape, o.kind].join('|')

  function rebuild() {
    pending = false
    const objs = app.scene.objects
    kids = new Map(); sigs = new Map()
    for (const id in objs) { const p = objs[id].parent || null; let a = kids.get(p); if (!a) kids.set(p, a = []); a.push(id); sigs.set(id, sig(objs[id])) }
    for (const a of kids.values()) a.sort((x, y) => (objs[x].order - objs[y].order) || (x < y ? -1 : 1))
    flat = []
    const q = filter.trim().toLowerCase()
    if (q) {
      const show = new Set()
      for (const id in objs) if ((objs[id].name || id).toLowerCase().includes(q)) { let c = id, g = 0; while (c && !show.has(c) && g++ < 64) { show.add(c); c = objs[c]?.parent } }
      walk(null, 0, show)
    } else walk(null, 0, null)
    const temps = flat.filter(r => app.isTemp(r.id)); flat = flat.filter(r => !app.isTemp(r.id))      // temporary models: their own section
    if (temps.length) { flat.push({ sec: 'temp' }); flat.push(...temps) }
    H = coarse() ? 44 : 24
    spacer.style.height = flat.length * H + 'px'
    countEl.textContent = String(Object.keys(objs).length)
    draw()
  }
  function walk(p, depth, show) {
    for (const id of kids.get(p) || []) {
      if (show && !show.has(id)) continue
      const has = !!kids.get(id)?.length
      flat.push({ id, depth, has })
      if (has && (show || expanded.has(id))) walk(id, depth + 1, show)
    }
  }
  function draw() {
    if (editing) return
    const objs = app.scene.objects
    if (!flat.length) {
      rowsEl.innerHTML = `<div class="ex-empty">${filter ? 'No objects match "' + esc(filter) + '"' : 'Empty scene. Add a part from the Add menu.'}</div>`
      return
    }
    const top = list.scrollTop, vh = list.clientHeight || 600
    const a = Math.max(0, Math.floor(top / H) - 10), b = Math.min(flat.length, Math.ceil((top + vh) / H) + 10)
    const sel = new Set(app.selection), drag = !coarse()
    let html = ''
    for (let i = a; i < b; i++) {
      const r = flat[i]
      if (r.sec) { html += `<div class="ex-sec" style="height:${H}px;display:flex;align-items:center;gap:6px;padding:0 8px;font-size:11px;opacity:.75;border-top:1px solid rgba(127,127,127,.25)"><b>Temporary models</b><span>not exported</span><button class="ib ex-tempeye" style="margin-left:auto" aria-label="Show or hide temporary models">${icon('eye')}</button></div>`; continue }
      const o = objs[r.id]
      if (!o) continue
      const hid = o.visible === false, lk = !!o.locked, open = r.has && (expanded.has(r.id) || !!filter)
      const dim = hid || app.isHidden(r.id)
      html += `<div class="ex-row${sel.has(r.id) ? ' sel' : ''}${dim ? ' dim' : ''}${lk ? ' lk' : ''}" role="treeitem" aria-level="${r.depth + 1}" aria-selected="${sel.has(r.id)}"${r.has ? ` aria-expanded="${open}"` : ''} data-id="${esc(r.id)}" data-i="${i}" draggable="${drag}" style="top:${i * H}px;padding-left:${4 + r.depth * 14}px"><span class="ex-car">${r.has ? icon(open ? 'chevron' : 'chevronRight') : ''}</span>${icon(typeIcon(o), 'ex-ic')}<span class="ex-name">${esc(o.name || r.id)}</span><button class="ex-b ex-eye${hid ? ' on' : ''}" tabindex="-1" aria-label="${hid ? 'Show' : 'Hide'}" title="${hid ? 'Show' : 'Hide'}">${icon(hid ? 'eyeOff' : 'eye')}</button><button class="ex-b ex-lock${lk ? ' on' : ''}" tabindex="-1" aria-label="${lk ? 'Unlock' : 'Lock'}" title="${lk ? 'Unlock' : 'Lock'}">${icon(lk ? 'lock' : 'unlock')}</button></div>`
    }
    rowsEl.innerHTML = html
  }
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(rebuild) } }
  let scrollQueued = false
  list.addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(() => { scrollQueued = false; draw() }) } }, { passive: true })
  filterInp.addEventListener('input', () => { filter = filterInp.value; list.scrollTop = 0; rebuild() })
  filterInp.addEventListener('keydown', e => { if (e.key === 'Escape') { filterInp.value = filter = ''; rebuild() } })

  function reveal(id) {
    let p = app.obj(id)?.parent, g = 0, changed = false
    while (p && g++ < 64) { if (!expanded.has(p)) { expanded.add(p); changed = true } p = app.obj(p)?.parent }
    if (changed) rebuild()
    const i = flat.findIndex(r => r.id === id)
    if (i < 0) return
    const top = i * H, vh = list.clientHeight
    if (top < list.scrollTop) list.scrollTop = top
    else if (top + H > list.scrollTop + vh) list.scrollTop = top + H - vh
  }
  const doSelect = (ids, opts) => { selfSelect = true; app.select(ids, opts); selfSelect = false }
  const rowOf = e => e.target.closest('.ex-row')
  rowsEl.addEventListener('click', e => { if (e.target.closest('.ex-tempeye')) { e.stopPropagation(); app.exec('temp.show') } }, true)
  function toggle(id) { expanded.has(id) ? expanded.delete(id) : expanded.add(id); rebuild() }
  function clickRow(e, row) {
    const id = row.dataset.id
    if (e.target.closest('.ex-car') && row.hasAttribute('aria-expanded')) return toggle(id)
    if (e.target.closest('.ex-eye')) { const o = app.obj(id); return app.transact(o.visible === false ? 'Show' : 'Hide', () => app.set(id, { visible: o.visible === false })) }
    if (e.target.closest('.ex-lock')) { const o = app.obj(id); return app.transact(o.locked ? 'Unlock' : 'Lock', () => app.set(id, { locked: !o.locked })) }
    if (e.shiftKey && anchor) {
      const a = flat.findIndex(r => r.id === anchor), b = +row.dataset.i
      if (a >= 0) { const ids = flat.slice(Math.min(a, b), Math.max(a, b) + 1).map(r => r.id); return doSelect(ids, { add: e.ctrlKey || e.metaKey }) }
    }
    anchor = id
    if (e.ctrlKey || e.metaKey) doSelect([id], { toggle: true })
    else doSelect([id])
  }
  rowsEl.addEventListener('click', e => { const row = rowOf(e); if (row && !editing) clickRow(e, row) })
  rowsEl.addEventListener('dblclick', e => { const row = rowOf(e); if (row && !e.target.closest('.ex-b,.ex-car')) rename(row.dataset.id) })
  list.addEventListener('click', e => { if (!rowOf(e) && e.target.closest('.ex-list') && !editing) doSelect([]) })
  rowsEl.addEventListener('contextmenu', e => {
    const row = rowOf(e); if (!row) return
    e.preventDefault()
    if (!app.selection.includes(row.dataset.id)) doSelect([row.dataset.id])
    ui.contextMenu(e.clientX, e.clientY)
  })
  // Touch: long-press opens the context menu.
  let lp = null
  rowsEl.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return
    const row = rowOf(e); if (!row) return
    const x = e.clientX, y = e.clientY
    lp = { x, y, t: setTimeout(() => { lp = null; if (!app.selection.includes(row.dataset.id)) doSelect([row.dataset.id]); ui.contextMenu(x, y); suppressClick = true }, 500) }
  })
  let suppressClick = false
  rowsEl.addEventListener('click', e => { if (suppressClick) { suppressClick = false; e.stopImmediatePropagation() } }, true)
  const cancelLp = e => { if (lp && (!e.clientX || Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8 || e.type !== 'pointermove')) { clearTimeout(lp.t); lp = null } }
  rowsEl.addEventListener('pointermove', cancelLp); rowsEl.addEventListener('pointerup', cancelLp); rowsEl.addEventListener('pointercancel', cancelLp)
  list.addEventListener('keydown', e => {
    if (editing) return
    const cur = app.selection[app.selection.length - 1]
    let i = flat.findIndex(r => r.id === cur)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); i = Math.max(0, Math.min(flat.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))); if (flat[i]) { anchor = flat[i].id; doSelect([flat[i].id]); reveal(flat[i].id) } }
    else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && flat[i]?.has) { e.preventDefault(); e.stopPropagation(); const open = expanded.has(cur); if ((e.key === 'ArrowRight') !== open) toggle(cur) }
    else if ((e.key === 'F2' || e.key === 'Enter') && cur) { e.preventDefault(); e.stopPropagation(); rename(cur) }
  })

  function rename(id) {
    reveal(id)
    const row = rowsEl.querySelector(`.ex-row[data-id="${CSS.escape(id)}"]`); if (!row) return
    const nameEl = row.querySelector('.ex-name'), inp = h('input', 'ex-edit')
    inp.value = app.obj(id)?.name || ''; inp.spellcheck = false
    nameEl.replaceWith(inp); editing = id
    inp.focus(); inp.select()
    const done = ok => {
      if (editing !== id) return
      editing = null
      const v = inp.value.trim().slice(0, 80)
      if (ok && v && v !== app.obj(id)?.name) app.transact('Rename', () => app.set(id, { name: v }))
      draw(); list.focus({ preventScroll: true })
    }
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') done(true); else if (e.key === 'Escape') done(false) })
    inp.addEventListener('blur', () => done(true))
  }
  ui.renameInExplorer = id => { if (ui.isPhone()) ui.openSide('explorer'); requestAnimationFrame(() => rename(id)) }

  // Drag and drop (desktop): onto the middle of a row = put inside it, top/bottom quarter = before/after it.
  let dragIds = null, dropRow = null, dropZone = null
  const clearDrop = () => { dropRow?.classList.remove('drop-into', 'drop-before', 'drop-after'); dropRow = null; dropZone = null; list.classList.remove('drop-root') }
  rowsEl.addEventListener('dragstart', e => {
    const row = rowOf(e); if (!row || editing) return e.preventDefault()
    if (!app.selection.includes(row.dataset.id)) doSelect([row.dataset.id])
    dragIds = app.topLevel(app.selection)
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', dragIds.map(id => app.obj(id)?.name).join(', ')) } catch {}
  })
  list.addEventListener('dragover', e => {
    if (!dragIds) return
    const row = rowOf(e)
    clearDrop()
    if (!row) { e.preventDefault(); list.classList.add('drop-root'); return }
    const id = row.dataset.id
    if (dragIds.includes(id) || dragIds.some(d => app.isAncestor(d, id))) return
    e.preventDefault()
    const r = row.getBoundingClientRect(), f = (e.clientY - r.top) / r.height
    dropZone = f < 0.25 ? 'before' : f > 0.75 ? 'after' : 'into'
    dropRow = row; row.classList.add('drop-' + dropZone)
  })
  list.addEventListener('dragleave', e => { if (!list.contains(e.relatedTarget)) clearDrop() })
  list.addEventListener('drop', e => {
    if (!dragIds) return
    e.preventDefault()
    const target = dropRow?.dataset.id || null, zone = dropZone
    clearDrop()
    moveTo(dragIds, target, zone)
    dragIds = null
  })
  rowsEl.addEventListener('dragend', () => { clearDrop(); dragIds = null })
  function moveTo(ids, targetId, zone) {
    const objs = app.scene.objects, t = targetId ? objs[targetId] : null
    let parent = null, index = Infinity
    if (t && zone === 'into') { parent = targetId; expanded.add(targetId) }
    else if (t) { parent = t.parent || null; const sibs = (kids.get(parent) || []).filter(i => !ids.includes(i)); index = sibs.indexOf(targetId) + (zone === 'after' ? 1 : 0) }
    ids = ids.filter(id => objs[id] && id !== parent && !(parent && app.isAncestor(id, parent)))
    if (!ids.length) return
    app.transact('Move in Explorer', () => {
      const moving = ids.filter(id => (objs[id].parent || null) !== parent)
      if (moving.length) app.reparent(moving, parent)
      const sibs = app.children(parent).filter(i => !ids.includes(i))
      sibs.splice(Math.min(index, sibs.length), 0, ...ids)
      sibs.forEach((id, i) => { if (app.obj(id).order !== i) app.set(id, { order: i }) })
    })
  }

  app.on('project', () => { expanded.clear(); filter = filterInp.value = ''; anchor = null; list.scrollTop = 0; schedule() })
  app.on('change', ch => {
    if (!ch.objects.length || pending) return
    const objs = app.scene.objects
    for (const id of ch.objects) { const o = objs[id]; if (o ? sigs.get(id) !== sig(o) : sigs.has(id)) return schedule() }
  })
  app.on('select', ids => {
    if (pending) return
    if (!selfSelect && ids.length) reveal(ids[ids.length - 1])
    draw()
  })
  addEventListener('resize', () => { if (!el.closest('[hidden]')) schedule() })
  schedule()
  return { el, refresh: schedule, rename, reveal }
}

// ---------- form controls (shared by panels; plugins get them as app.ui.controls) ----------
export function parseNum(s) {
  s = String(s ?? '').replace(/\s+/g, '').replace(/,/g, '.')
  let i = 0
  const num = () => {
    if (s[i] === '(') { i++; const v = add(); if (s[i] !== ')') throw 0; i++; return v }
    if (s[i] === '-') { i++; return -num() }
    if (s[i] === '+') { i++; return num() }
    const m = /^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(s.slice(i)); if (!m) throw 0
    i += m[0].length; return parseFloat(m[0])
  }
  const mul = () => { let v = num(); while (s[i] === '*' || s[i] === '/') { const op = s[i++], w = num(); v = op === '*' ? v * w : v / w } return v }
  const add = () => { let v = mul(); while (s[i] === '+' || s[i] === '-') { const op = s[i++], w = mul(); v = op === '+' ? v + w : v - w } return v }
  try { const v = add(); return i === s.length && isFinite(v) ? v : null } catch { return null }
}
export const fmt = (v, d = 3) => { if (typeof v !== 'number' || !isFinite(v)) return ''; const r = Math.round(v * 10 ** d) / 10 ** d; return String(Object.is(r, -0) ? 0 : r) }
const snapTo = (v, s) => s ? Math.round(v / s) * s : v

// Every control: create(opts) -> {el, update()}. read() -> {v, mixed}; write(v) is called inside a transaction.
export function makeControls(app) {
  const live = (label, fn) => { let open = false, t = 0; return { start() { if (!open) { open = true; app.begin(label) } clearTimeout(t); t = setTimeout(this.stop, 4000) }, set(v) { this.start(); fn(v) }, stop: () => { clearTimeout(t); if (open) { open = false; app.end() } } } }
  const once = (label, fn) => v => app.transact(label, () => fn(v))
  function row(label, ctl, cls = '') { const r = h('div', 'pr ' + cls); const l = h('label', 'pl', esc(label)); r.append(l, ctl); return r }
  function numInput(o) {
    const inp = h('input', 'inp num mono'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.spellcheck = false; inp.autocomplete = 'off'
    if (o.title) inp.title = o.title
    const clamp = v => Math.min(o.max ?? Infinity, Math.max(o.min ?? -Infinity, v))
    inp.addEventListener('focus', () => setTimeout(() => inp.select(), 0))
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); else if (e.key === 'Escape') { inp.value = inp.dataset.v || ''; inp.blur() } })
    inp.addEventListener('change', () => { const v = parseNum(inp.value); if (v === null) { inp.value = inp.dataset.v || ''; return } once(o.label || 'Edit', o.write)(clamp(v)) })
    const update = () => { if (document.activeElement === inp) return; const r = o.read(); const s = r.mixed ? '' : fmt(r.v, o.digits ?? 3); inp.value = s; inp.dataset.v = s; inp.placeholder = r.mixed ? '—' : '' }
    return { el: inp, update, clamp }
  }
  // Drag a label sideways to change a number (Shift = fine). One undo step per drag.
  function scrub(handle, o) {
    handle.classList.add('scrub')
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0) return
      e.preventDefault()
      handle.setPointerCapture(e.pointerId)
      const x0 = e.clientX; let base = null
      const tx = live(o.label || 'Edit', () => {})
      const mv = ev => {
        const dx = ev.clientX - x0
        if (!base && Math.abs(dx) < 3) return
        if (!base) { base = o.start(); tx.start() }
        const f = ev.shiftKey ? 0.1 : 1
        o.apply(base, dx * o.step * f, o.step * f)
      }
      const up = () => { handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); if (base) tx.stop(); else o.click?.() }
      handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up)
    })
  }
  return {
    row, live, once,
    number(label, o) { const n = numInput({ label: 'Edit ' + label.toLowerCase(), ...o }); const r = row(label, n.el); scrub(r.querySelector('.pl'), { label: 'Edit ' + label.toLowerCase(), step: o.step || 0.1, start: () => o.read().v ?? 0, apply: (b, d, s) => o.write(n.clamp(+fmt(snapTo(b + d, s)))), click: () => n.el.focus() }); return { el: r, update: n.update } },
    // vec3 over the selection: get(obj) -> [x,y,z]; set(obj, arr) -> patch
    vec3(label, o) {
      const wrap = h('div', 'vec3'), ups = []
      const sel = () => app.selection.map(id => [id, app.obj(id)]).filter(x => x[1])
      ;['X', 'Y', 'Z'].forEach((ax, i) => {
        const cell = h('div', 'v3c'), tag = h('span', 'ax ax' + ax.toLowerCase(), ax)
        const read = () => { const vs = sel().map(([, ob]) => o.get(ob)[i]); return { v: vs[0], mixed: vs.some(v => Math.abs(v - vs[0]) > 1e-6) } }
        const write = v => { for (const [id, ob] of sel()) { const a = [...o.get(ob)]; a[i] = v; app.set(id, o.set(ob, a)) } }
        const n = numInput({ label: 'Edit ' + label.toLowerCase(), read, write, min: o.min, title: label + ' ' + ax })
        scrub(tag, {
          label: 'Edit ' + label.toLowerCase(), step: o.step,
          start: () => new Map(sel().map(([id, ob]) => [id, [...o.get(ob)]])),
          apply: (base, d, s) => { for (const [id, a0] of base) { const ob = app.obj(id); if (!ob) continue; const a = [...a0]; a[i] = n.clamp(+fmt(snapTo(a0[i] + d, s))); app.set(id, o.set(ob, a)) } },
          click: () => n.el.focus()
        })
        cell.append(tag, n.el); wrap.appendChild(cell); ups.push(n.update)
      })
      return { el: row(label, wrap, 'v3'), update: () => ups.forEach(u => u()) }
    },
    text(label, o) {
      const inp = h('input', 'inp'); inp.spellcheck = false; inp.autocomplete = 'off'; if (o.placeholder) inp.placeholder = o.placeholder
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); else if (e.key === 'Escape') { inp.value = inp.dataset.v; inp.blur() } })
      inp.addEventListener('change', () => { const v = inp.value.trim(); if (v) once(o.label || 'Edit ' + label.toLowerCase(), o.write)(v.slice(0, 80)); else inp.value = inp.dataset.v })
      const update = () => { if (document.activeElement === inp) return; const r = o.read(); inp.value = inp.dataset.v = r.mixed ? '' : r.v ?? ''; inp.placeholder = r.mixed ? '—' : o.placeholder || '' }
      return { el: row(label, inp), update }
    },
    color(label, o) {
      const wrap = h('div', 'colr'), sw = h('input', 'sw'), hex = h('input', 'inp mono hex')
      sw.type = 'color'; sw.setAttribute('aria-label', label); hex.spellcheck = false; hex.maxLength = 7
      const tx = live('Edit ' + label.toLowerCase(), o.write)
      sw.addEventListener('input', () => { tx.set(sw.value); hex.value = sw.value })
      sw.addEventListener('change', () => tx.stop()); sw.addEventListener('blur', () => tx.stop())
      hex.addEventListener('keydown', e => { if (e.key === 'Enter') hex.blur() })
      hex.addEventListener('change', () => {
        let v = hex.value.trim().toLowerCase(); if (!v.startsWith('#')) v = '#' + v
        if (/^#[0-9a-f]{3}$/.test(v)) v = '#' + [...v.slice(1)].map(c => c + c).join('')
        if (/^#[0-9a-f]{6}$/.test(v)) once('Edit ' + label.toLowerCase(), o.write)(v); else update(true)
      })
      wrap.append(sw, hex)
      const update = force => { const r = o.read(); if (force || document.activeElement !== hex) hex.value = r.mixed ? '' : r.v || ''; hex.placeholder = r.mixed ? '—' : ''; if (!r.mixed && /^#[0-9a-f]{6}$/i.test(r.v)) sw.value = r.v /* a colour input warns on anything but #rrggbb */; wrap.classList.toggle('mixed', !!r.mixed) }
      return { el: row(label, wrap), update }
    },
    select(label, o) {
      const s = h('select', 'inp'); s.setAttribute('aria-label', label)
      const opts = o.options.map(x => typeof x === 'object' ? x : { value: x, label: x })
      s.innerHTML = `<option value="" disabled hidden>—</option>` + opts.map(x => `<option value="${esc(x.value)}">${esc(x.label)}</option>`).join('')
      s.addEventListener('change', () => { const x = opts.find(q => String(q.value) === s.value); if (x) once(o.label || 'Edit ' + label.toLowerCase(), o.write)(x.value) })
      const update = () => { const r = o.read(); s.value = r.mixed ? '' : String(r.v ?? '') }
      return { el: row(label, s), update }
    },
    toggle(label, o) {
      const b = h('button', 'tog'); b.setAttribute('role', 'switch'); b.setAttribute('aria-label', label); b.innerHTML = '<i></i>'
      b.addEventListener('click', () => { const r = o.read(); once(o.label || (r.v && !r.mixed ? 'Turn off ' : 'Turn on ') + label.toLowerCase(), o.write)(r.mixed ? true : !r.v) })
      const update = () => { const r = o.read(); b.setAttribute('aria-checked', r.mixed ? 'mixed' : String(!!r.v)) }
      return { el: row(label, b, 'tg'), update }
    },
    slider(label, o) {
      const wrap = h('div', 'sld'), r = h('input', 'range'), n = numInput({ label: 'Edit ' + label.toLowerCase(), ...o })
      r.type = 'range'; r.min = o.min ?? 0; r.max = o.max ?? 1; r.step = o.step ?? 0.01; r.setAttribute('aria-label', label)
      const tx = live('Edit ' + label.toLowerCase(), o.write)
      r.addEventListener('input', () => { tx.set(+r.value); n.el.value = fmt(+r.value, 2) })
      r.addEventListener('change', () => tx.stop()); r.addEventListener('pointerup', () => tx.stop())
      wrap.append(r, n.el)
      const update = () => { n.update(); const v = o.read(); r.value = v.mixed ? (o.min ?? 0) : v.v ?? 0; r.style.setProperty('--p', (((+r.value) - r.min) / (r.max - r.min) * 100) + '%') }
      r.addEventListener('input', () => r.style.setProperty('--p', (((+r.value) - r.min) / (r.max - r.min) * 100) + '%'))
      return { el: row(label, wrap), update }
    },
    info(label, read) { const s = h('span', 'pinfo mono'); return { el: row(label, s), update: () => { s.textContent = read() } } },
    group(el, title) { const g = h('div', 'pg'); if (title) g.appendChild(h('div', 'pg-h', esc(title))); el.appendChild(g); return g }
  }
}

// ---------- Properties ----------
const all = (app, get) => { const vs = app.selection.map(id => app.obj(id)).filter(Boolean).map(get); return { v: vs[0], mixed: vs.some(v => !same(v, vs[0])) } }
const setAll = (app, patch) => { for (const id of app.selection) if (app.obj(id)) app.set(id, typeof patch === 'function' ? patch(app.obj(id)) : patch) }
const structKey = app => app.selection.map(id => { const o = app.obj(id); return o ? o.type + (o.type === 'light' ? o.kind : '') : '' }).join() + '|' + Object.keys(app.scene.textures).join() + '|' + (app.selection.length > 1)
const MAT_OPTS = Object.keys(MATERIALS).map(m => ({ value: m, label: words(m) }))
const SHAPE_NAMES = { box: 'Block', sphere: 'Ball', cylinder: 'Cylinder', wedge: 'Wedge', cornerwedge: 'Corner wedge', cone: 'Cone', torus: 'Torus', plane: 'Plane', capsule: 'Capsule' }

function buildProps(el, app) {
  const C = makeControls(app), ctls = []
  const add = (g, c) => { g.appendChild(c.el); ctls.push(c); return c }
  const objs = app.selection.map(id => app.obj(id)).filter(Boolean)
  const types = new Set(objs.map(o => o.type)), only = t => types.size === 1 && types.has(t)
  const one = objs.length === 1
  const head = h('div', 'p-head')
  const badge = h('span', 'p-type')
  head.appendChild(badge)
  el.appendChild(head)
  const g0 = C.group(el)
  add(g0, C.text('Name', { label: 'Rename', read: () => all(app, o => o.name), write: v => setAll(app, { name: v }) }))
  const updHead = () => {
    const os = app.selection.map(id => app.obj(id)).filter(Boolean)
    const o = os[0]
    badge.innerHTML = one && o ? `${icon(typeIcon(o))}<span>${esc(o.type === 'part' ? SHAPE_NAMES[o.shape] || 'Part' : words(o.type[0].toUpperCase() + o.type.slice(1)))}</span><span class="mute mono">${esc(app.selection[0])}</span>` : `${icon('layers')}<span>${os.length} objects</span>`
  }
  ctls.push({ update: updHead })

  const gt = C.group(el, 'Transform')
  add(gt, C.vec3('Position', { step: 0.05, get: o => o.pos, set: (o, a) => ({ pos: a }) }))
  add(gt, C.vec3('Rotation', { step: 1, get: o => o.rot, set: (o, a) => ({ rot: a.map(v => ((v + 180) % 360 + 360) % 360 - 180) }) }))
  if (only('part')) add(gt, C.vec3('Size', { step: 0.05, min: 0, get: o => o.size, set: (o, a) => ({ size: a }) }))
  else add(gt, C.vec3('Scale', { step: 0.01, get: o => o.scale, set: (o, a) => ({ scale: a }) }))

  if ([...types].every(t => t === 'part' || t === 'mesh')) {
    const ga = C.group(el, 'Appearance')
    add(ga, C.color('Colour', { read: () => all(app, o => o.color), write: v => setAll(app, { color: v }) }))
    add(ga, C.select('Material', { options: MAT_OPTS, read: () => all(app, o => o.material), write: v => setAll(app, { material: v }) }))
    add(ga, C.slider('Transparency', { min: 0, max: 1, step: 0.01, digits: 2, read: () => all(app, o => o.transparency), write: v => setAll(app, { transparency: v }) }))
    const tex = Object.entries(app.scene.textures)
    if (tex.length) add(ga, C.select('Texture', { options: [{ value: '', label: 'None' }, ...tex.map(([id, t]) => ({ value: id, label: t.name || id }))], read: () => all(app, o => o.texture || ''), write: v => setAll(app, { texture: v || null }) }))
  }
  if (only('part')) {
    const gp = C.group(el, 'Part')
    add(gp, C.select('Shape', { options: SHAPES.map(s => ({ value: s, label: SHAPE_NAMES[s] })), label: 'Change shape', read: () => all(app, o => o.shape), write: v => setAll(app, { shape: v }) }))
    add(gp, C.toggle('Anchored', { read: () => all(app, o => o.anchored), write: v => setAll(app, { anchored: v }) }))
    add(gp, C.toggle('Negative', { read: () => all(app, o => o.negate), write: v => setAll(app, { negate: v }) }))
  }
  if (only('mesh')) {
    const gm = C.group(el, 'Mesh')
    add(gm, C.toggle('Smooth shading', { read: () => all(app, o => o.smooth), write: v => setAll(app, { smooth: v }) }))
    if (one) add(gm, C.info('Geometry', () => { const g = app.geo.peek(objs[0].geo); return g ? `${(g.verts.length / 3).toLocaleString()} verts · ${g.faces.length.toLocaleString()} faces` : 'Loading…' }))
  }
  if (only('light')) {
    const gl = C.group(el, 'Light')
    const kind = objs[0].kind
    add(gl, C.select('Type', { options: [{ value: 'point', label: 'Point' }, { value: 'spot', label: 'Spot' }, { value: 'directional', label: 'Sun' }], read: () => all(app, o => o.kind), write: v => setAll(app, { kind: v }) }))
    add(gl, C.color('Colour', { read: () => all(app, o => o.color), write: v => setAll(app, { color: v }) }))
    add(gl, C.number('Brightness', { min: 0, max: 100, step: 0.05, read: () => all(app, o => o.intensity), write: v => setAll(app, { intensity: v }) }))
    if (kind !== 'directional') add(gl, C.number('Range', { min: 0, max: 1000, step: 0.25, read: () => all(app, o => o.range), write: v => setAll(app, { range: v }) }))
    if (kind === 'spot') add(gl, C.number('Angle', { min: 1, max: 89, step: 0.5, read: () => all(app, o => o.angle), write: v => setAll(app, { angle: v }) }))
    add(gl, C.toggle('Shadows', { read: () => all(app, o => o.shadow), write: v => setAll(app, { shadow: v }) }))
  }
  if (only('stroke')) {
    const gs = C.group(el, 'Stroke')
    add(gs, C.color('Colour', { read: () => all(app, o => o.color), write: v => setAll(app, { color: v }) }))
    add(gs, C.number('Thickness', { min: 0.005, max: 10, step: 0.005, read: () => all(app, o => o.radius), write: v => setAll(app, { radius: v }) }))
    if (one) add(gs, C.info('Points', () => String(app.obj(app.selection[0])?.points?.length ?? 0)))
  }
  const gv = C.group(el, 'Behaviour')
  add(gv, C.toggle('Visible', { read: () => all(app, o => o.visible !== false), write: v => setAll(app, { visible: v }) }))
  add(gv, C.toggle('Locked', { read: () => all(app, o => !!o.locked), write: v => setAll(app, { locked: v }) }))
  const update = () => { for (const c of ctls) try { c.update() } catch (e) { console.warn(e) } }
  update()
  return { key: structKey(app), update, destroy() {} }
}

const propsPanel = {
  id: 'props', label: 'Properties', icon: 'sliders', order: 10, when: a => a.selection.length > 0 && !a.selection.every(id => a.obj(id)?.type === 'gui'),
  render(el, app) { el._p = buildProps(el, app); return () => { el._p = null } },
  refresh(el, app, ev) {
    if (ev.type === 'change' && !ev.objects.some(id => app.selection.includes(id)) && !ev.textures.length) return
    if (ev.type === 'time') return
    const p = el._p
    if (!p || p.key !== structKey(app) || ev.type === 'project' || ev.type === 'refresh') { el.innerHTML = ''; el._p = buildProps(el, app) } else p.update()
  }
}

// ---------- Scene (shown when nothing is selected) ----------
const LIGHT_OPTS = [{ value: 'studio', label: 'Studio' }, { value: 'day', label: 'Daylight' }, { value: 'sunset', label: 'Sunset' }, { value: 'night', label: 'Night' }]
function buildScene(el, app) {
  const C = makeControls(app), ctls = []
  const add = (g, c) => { g.appendChild(c.el); ctls.push(c); return c }
  const env = () => app.scene.env
  const g = C.group(el)
  add(g, C.info('Objects', () => { const n = app.ids().length; return n.toLocaleString() + (n === 1 ? ' object' : ' objects') }))
  add(g, C.color('Background', { read: () => ({ v: env().bg }), write: v => app.setEnv({ bg: v }) }))
  add(g, C.select('Lighting', { options: LIGHT_OPTS, read: () => ({ v: env().light || 'studio' }), write: v => app.setEnv({ light: v }) }))
  add(g, C.select('Look', { options: [{ value: 'normal', label: 'Normal' }, { value: 'toon', label: 'Toon (cartoon)' }, { value: 'roblox', label: 'Roblox (realistic)' }], read: () => ({ v: env().look || 'normal' }), write: v => app.setEnv({ look: v === 'normal' ? null : v }) }))
  add(g, C.toggle('Grid', { read: () => ({ v: env().grid !== false }), write: v => app.setEnv({ grid: v }) }))
  add(g, C.toggle('Fog', { read: () => ({ v: !!env().fog }), write: v => app.setEnv({ fog: v ? { near: 40, far: 300 } : null }) }))
  if (env().fog) {
    add(g, C.number('Fog start', { min: 0, step: 1, read: () => ({ v: env().fog?.near ?? 40 }), write: v => app.setEnv({ fog: { ...env().fog, near: v } }) }))
    add(g, C.number('Fog end', { min: 1, step: 1, read: () => ({ v: env().fog?.far ?? 300 }), write: v => app.setEnv({ fog: { ...env().fog, far: v } }) }))
  }
  const update = () => ctls.forEach(c => c.update())
  update()
  return { fog: !!env().fog, update }
}
const scenePanel = {
  id: 'scene', label: 'Scene', icon: 'globe', order: 10, when: a => !a.selection.length,
  render(el, app) { el._s = buildScene(el, app) },
  refresh(el, app, ev) {
    if (ev.type === 'change' && !ev.top.includes('env') && !ev.objects.length) return
    if (ev.type === 'time') return
    if (!el._s || el._s.fog !== !!app.scene.env.fog || ev.type === 'project') { el.innerHTML = ''; el._s = buildScene(el, app) } else el._s.update()
  }
}

export const corePanels = [propsPanel, scenePanel]
