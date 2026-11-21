// App state, commands, undo/redo, events, plugin registry, window.studio, boot.
import * as THREE from 'three'
import { normalize, uid, worldMatrix, decompose, registerType, typeDefaults } from './model.js'
import { mountUI } from './ui.js'
import { createStore } from './store.js'

const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const PREFIX = { part: 'p', group: 'm', mesh: 'x', light: 'l', stroke: 's', model: 'o' }
const NAMES = { part: 'Part', group: 'Model', mesh: 'Mesh', light: 'Light', stroke: 'Stroke', model: 'Model' }
export const MENU_ORDER = ['File', 'Edit', 'Add', 'Mesh', 'Model', 'Animate', 'Sculpt', 'Texture', 'Paint', 'Draw', 'View', 'Help']

export function emptyScene(name = 'Untitled') {
  return { name, v: 1, objects: {}, anims: {}, textures: {}, env: { bg: '#1b1d22', grid: true, fog: null, light: 'studio' }, camera: { pos: [12, 9, 12], target: [0, 1, 0], fov: 50, ortho: false } }
}

export class App {
  constructor() {
    this.listeners = new Map()
    this.scene = emptyScene()
    this.projectId = null
    this.selection = []
    this.commands = new Map(); this.menus = new Map(); this.tools = new Map(); this.panels = new Map()
    this.modes = new Map(); this.importers = []; this.exporters = []; this.plugins = []
    this.undoStack = []; this.redoStack = []
    this.tx = null; this._dirty = new Map(); this._src = 'local'; this._flushQueued = false
    this.mode = 'build'; this.tool = 'select'; this.time = 0
    this.prefs = { snap: true, moveSnap: 1, rotSnap: 15, space: 'world', surfaceSnap: true }
    try { Object.assign(this.prefs, JSON.parse(localStorage.getItem('studio.prefs') || '{}')) } catch {}
    this.clipboard = null
    this.geo = blobStore(this, 'geo'); this.tex = blobStore(this, 'tex')
    this.viewport = null; this.ui = null; this.store = null
    this.registerMode({ id: 'build', label: 'Build', icon: 'cube', order: 0 })
    for (const [id, label, icon, key] of [['select', 'Select', 'select', 'Q'], ['move', 'Move', 'move', 'W'], ['rotate', 'Rotate', 'rotate', 'E'], ['scale', 'Scale', 'scale', 'R']])
      this.registerTool({ id, label, icon, key, builtin: true, order: ['select', 'move', 'rotate', 'scale'].indexOf(id) })
    coreCommands(this)
  }

  // ---------- events ----------
  on(ev, fn) { let s = this.listeners.get(ev); if (!s) this.listeners.set(ev, s = new Set()); s.add(fn); return () => s.delete(fn) }
  off(ev, fn) { this.listeners.get(ev)?.delete(fn) }
  emit(ev, data) { for (const fn of [...(this.listeners.get(ev) || [])]) { try { fn(data) } catch (e) { console.error(e) } } }
  toast(msg, kind) { this.ui?.toast ? this.ui.toast(msg, kind) : console.log(msg) }

  // ---------- reading ----------
  obj(id) { return this.scene.objects[id] || null }
  ids() { return Object.keys(this.scene.objects) }
  children(parent = null) {
    const o = this.scene.objects
    return Object.keys(o).filter(id => (o[id].parent || null) === parent).sort((a, b) => (o[a].order - o[b].order) || (a < b ? -1 : 1))
  }
  descendants(id) { const out = []; const walk = p => { for (const c of this.children(p)) { out.push(c); walk(c) } }; walk(id); return out }
  isAncestor(a, b) { let o = this.scene.objects[b], g = 0; while (o && o.parent && g++ < 64) { if (o.parent === a) return true; o = this.scene.objects[o.parent] } return false }
  topLevel(ids) { const set = new Set(ids.filter(id => this.scene.objects[id])); return [...set].filter(id => ![...set].some(a => a !== id && this.isAncestor(a, id))) }
  worldMatrix(id) { return worldMatrix(this.scene, id) }
  sceneData() { const s = clone(this.scene); return s }
  isTemp(id) { let o = id ? this.scene.objects[id] : null, g = 0; while (o && g++ < 64) { if (o.temp) return true; o = o.parent ? this.scene.objects[o.parent] : null } return false }   // temporary models never export
  isHidden(id) { let o = this.scene.objects[id], g = 0; while (o && g++ < 64) { if (o.visible === false) return true; o = o.parent ? this.scene.objects[o.parent] : null } return false }
  isLocked(id) { let o = this.scene.objects[id], g = 0; while (o && g++ < 64) { if (o.locked) return true; o = o.parent ? this.scene.objects[o.parent] : null } return false }

  // ---------- transactions ----------
  begin(label = 'Edit') { if (!this.tx) this.tx = { label, depth: 0, before: new Map(), sel: [...this.selection] }; this.tx.depth++; return this.tx }
  end(opts = {}) {
    const tx = this.tx
    if (!tx) return null
    if (opts.cancel) tx.cancelled = true
    if (--tx.depth > 0) return null
    this.tx = null
    if (tx.cancelled) { for (const [k, v] of tx.before) this._put(k, v); this.flush(); return null }
    const before = new Map(), after = new Map()
    for (const [k, v] of tx.before) { const now = this._get(k); if (!same(now, v)) { before.set(k, v); after.set(k, clone(now)) } }
    let rec = null
    if (before.size) {
      rec = { label: opts.label || tx.label, before, after, selBefore: tx.sel, selAfter: [...this.selection] }
      this.undoStack.push(rec); this.redoStack.length = 0
      if (this.undoStack.length > 200) this.undoStack.shift()
      this.emit('history')
    }
    this.flush()
    return rec
  }
  transact(label, fn) {
    this.begin(label)
    let r
    try { r = fn(this) } catch (e) { this.end({ cancel: true }); throw e }
    if (r && typeof r.then === 'function') return r.then(v => { this.end(); return v }, e => { this.end({ cancel: true }); throw e })
    this.end()
    return r
  }
  _auto(label, fn) { return this.tx ? fn() : this.transact(label, fn) }
  _get(k) {
    if (k === 'env' || k === 'camera' || k === 'name') return this.scene[k]
    const i = k.indexOf(':'); return this.scene[k.slice(0, i)]?.[k.slice(i + 1)]
  }
  _put(k, v, src) {
    if (k === 'env' || k === 'camera' || k === 'name') this.scene[k] = clone(v)
    else { const i = k.indexOf(':'), col = k.slice(0, i), id = k.slice(i + 1); if (v === undefined || v === null) delete this.scene[col][id]; else this.scene[col][id] = clone(v) }
    this._mark(k, src)
  }
  _touch(k) { if (this.tx && !this.tx.before.has(k)) this.tx.before.set(k, clone(this._get(k))); this._mark(k) }
  _mark(k, src = 'local') {
    if (this._dirty.size && this._src !== src) this.flush()
    this._src = src; this._dirty.set(k, true)
    if (!this._flushQueued) { this._flushQueued = true; queueMicrotask(() => { this._flushQueued = false; this.flush() }) }
  }
  // Emit 'change' for everything touched since the last flush.
  flush() {
    if (!this._dirty.size) return
    const ch = { objects: [], anims: [], textures: [], top: [], source: this._src, keys: [...this._dirty.keys()] }
    this._dirty.clear()
    for (const k of ch.keys) { const i = k.indexOf(':'); if (i < 0) ch.top.push(k); else ch[k.slice(0, i)].push(k.slice(i + 1)) }
    if (ch.objects.length && this.selection.some(id => !this.scene.objects[id])) { this.selection = this.selection.filter(id => this.scene.objects[id]); this.emit('select', this.selection) }
    this.emit('change', ch)
  }
  undo() { return this._history(this.undoStack, this.redoStack, 'before', 'selBefore') }
  redo() { return this._history(this.redoStack, this.undoStack, 'after', 'selAfter') }
  _history(from, to, side, sel) {
    if (this.tx) return false
    const rec = from.pop()
    if (!rec) return false
    for (const [k, v] of rec[side]) this._put(k, v, 'undo')
    to.push(rec)
    this.flush()
    this.selection = rec[sel].filter(id => this.scene.objects[id]); this.emit('select', this.selection)
    this.emit('history')
    return rec.label
  }

  // ---------- mutations (each is undoable; outside a transaction it is its own step) ----------
  add(obj) {
    return this._auto('Add ' + (obj.name || NAMES[obj.type] || obj.type), () => {
      const type = obj.type || 'part'
      const id = obj.id && !this.scene.objects[obj.id] ? String(obj.id) : uid(PREFIX[type] || 'o')
      const o = clone(obj); delete o.id; o.type = type
      if (o.parent && !this.scene.objects[o.parent]) o.parent = null
      if (o.order === undefined || o.order === null) o.order = this.nextOrder(o.parent || null)
      if (!o.name) o.name = NAMES[type] || type
      this._touch('objects:' + id)
      this.scene.objects[id] = normalize(o)
      return id
    })
  }
  nextOrder(parent) { let m = -1; for (const id of this.children(parent)) m = Math.max(m, this.scene.objects[id].order || 0); return m + 1 }
  set(id, patch) {
    return this._auto('Edit', () => {
      const cur = this.scene.objects[id]
      if (!cur) return false
      const next = { ...cur }
      for (const k in patch) if (k !== 'id' && patch[k] !== undefined) next[k] = clone(patch[k])
      if (next.parent && (next.parent === id || this.isAncestor(id, next.parent) || !this.scene.objects[next.parent])) next.parent = cur.parent
      const n = normalize(next)
      if (same(n, cur)) return true
      this._touch('objects:' + id)
      this.scene.objects[id] = n
      return true
    })
  }
  // Many objects at once: {id: patch | null}
  update(map) { return this._auto('Edit', () => { for (const id in map) map[id] === null ? this.remove([id]) : this.scene.objects[id] ? this.set(id, map[id]) : this.add({ ...map[id], id }) }) }
  remove(ids) {
    ids = [].concat(ids || []).filter(id => this.scene.objects[id])
    if (!ids.length) return 0
    return this._auto('Delete', () => {
      const all = new Set()
      for (const id of ids) { all.add(id); for (const d of this.descendants(id)) all.add(d) }
      for (const id of all) { this._touch('objects:' + id); delete this.scene.objects[id] }
      const sel = this.selection.filter(id => !all.has(id))
      if (sel.length !== this.selection.length) { this.selection = sel; this.emit('select', sel) }
      return all.size
    })
  }
  putAnim(id, anim) { return this._auto('Animation', () => { this._touch('anims:' + id); if (anim) this.scene.anims[id] = clone(anim); else delete this.scene.anims[id]; return id }) }
  patchAnim(id, patch) { const a = this.scene.anims[id]; return a ? this.putAnim(id, { ...a, ...patch }) : false }
  putTexture(id, tex) { return this._auto('Texture', () => { this._touch('textures:' + id); if (tex) this.scene.textures[id] = clone(tex); else delete this.scene.textures[id]; return id }) }
  setEnv(patch) { return this._auto('Environment', () => { const n = { ...this.scene.env, ...patch }; if (same(n, this.scene.env)) return; this._touch('env'); this.scene.env = clone(n) }) }
  setCamera(patch) { return this._auto('Camera', () => { const n = { ...this.scene.camera, ...patch }; if (same(n, this.scene.camera)) return; this._touch('camera'); this.scene.camera = clone(n) }) }
  rename(name) { name = String(name || '').trim().slice(0, 80) || 'Untitled'; return this._auto('Rename project', () => { if (name === this.scene.name) return; this._touch('name'); this.scene.name = name }) }

  // Move objects under a new parent, keeping where they are in the world.
  reparent(ids, parent = null) {
    return this._auto('Reparent', () => {
      if (parent && !this.scene.objects[parent]) parent = null
      const Pinv = parent ? this.worldMatrix(parent).invert() : new THREE.Matrix4()
      let order = this.nextOrder(parent)
      for (const id of [].concat(ids)) {
        const o = this.scene.objects[id]
        if (!o || id === parent || (parent && this.isAncestor(id, parent)) || (o.parent || null) === parent) continue
        const t = decompose(Pinv.clone().multiply(this.worldMatrix(id)))
        this.set(id, { parent, ...t, order: order++ })
      }
    })
  }
  group(ids = this.selection) {
    ids = this.topLevel(ids)
    if (!ids.length) return null
    return this._auto('Group', () => {
      const parents = new Set(ids.map(i => this.scene.objects[i].parent || null))
      const parent = parents.size === 1 ? [...parents][0] : null
      const c = new THREE.Vector3(), v = new THREE.Vector3()
      for (const id of ids) c.add(v.setFromMatrixPosition(this.worldMatrix(id)))
      c.divideScalar(ids.length)
      if (parent) c.applyMatrix4(this.worldMatrix(parent).invert())
      const order = Math.min(...ids.map(i => this.scene.objects[i].order || 0))
      const r = x => Math.round(x * 1e4) / 1e4
      const gid = this.add({ type: 'group', name: 'Model', parent, pos: [r(c.x), r(c.y), r(c.z)], order })
      this.reparent(ids, gid)
      this.select([gid])
      return gid
    })
  }
  ungroup(id) {
    const g = this.scene.objects[id]
    if (!g) return []
    return this._auto('Ungroup', () => {
      const kids = this.children(id)
      this.reparent(kids, g.parent || null)
      this.remove([id])
      this.select(kids)
      return kids
    })
  }
  // Copies of objects (with their children), in place. Returns the new root ids.
  duplicate(ids = this.selection, opts = {}) {
    ids = this.topLevel(ids)
    if (!ids.length) return []
    return this._auto('Duplicate', () => {
      const out = []
      const copy = (id, parent, root) => {
        const o = clone(this.scene.objects[id])
        const nid = uid(PREFIX[o.type] || 'o')
        o.parent = parent
        if (root) { o.order = this.nextOrder(parent); if (opts.offset) o.pos = o.pos.map((p, i) => Math.round((p + opts.offset[i]) * 1e4) / 1e4) }
        this._touch('objects:' + nid); this.scene.objects[nid] = o
        for (const c of this.children(id)) copy(c, nid, false)
        return nid
      }
      for (const id of ids) out.push(copy(id, this.scene.objects[id].parent || null, true))
      if (opts.select !== false) this.select(out)
      return out
    })
  }
  copy(ids = this.selection) {
    ids = this.topLevel(ids)
    if (!ids.length) return 0
    const items = []
    const walk = (id, parentKey, root) => {
      const o = clone(this.scene.objects[id]); const key = 'k' + items.length
      if (root) Object.assign(o, decompose(this.worldMatrix(id)))
      items.push({ key, parentKey, o })
      for (const c of this.children(id)) walk(c, key, false)
    }
    for (const id of ids) walk(id, null, true)
    this.clipboard = items
    try { localStorage.setItem('studio.clip', JSON.stringify(items)) } catch {}
    return ids.length
  }
  paste(parent = null) {
    let items = this.clipboard
    if (!items) { try { items = JSON.parse(localStorage.getItem('studio.clip') || 'null') } catch {} }
    if (!items?.length) return []
    return this._auto('Paste', () => {
      const map = new Map(), out = []
      for (const it of items) {
        const o = clone(it.o)
        o.parent = it.parentKey ? map.get(it.parentKey) : parent
        if (!it.parentKey) o.order = undefined
        const id = this.add(o)
        map.set(it.key, id)
        if (!it.parentKey) out.push(id)
      }
      this.select(out)
      return out
    })
  }

  // ---------- selection, mode, tool, time ----------
  select(ids, opts = {}) {
    ids = [].concat(ids || []).filter(id => this.scene.objects[id])
    let next
    if (opts.toggle) { next = [...this.selection]; for (const id of ids) { const i = next.indexOf(id); i >= 0 ? next.splice(i, 1) : next.push(id) } }
    else if (opts.add) next = [...new Set([...this.selection, ...ids])]
    else next = [...new Set(ids)]
    if (same(next, this.selection)) return
    this.selection = next
    this.emit('select', next)
  }
  registerMode(m) { this.modes.set(m.id, { order: 50, ...m }); this.emit('registry', 'modes') }
  setMode(id) { if (!this.modes.has(id) || id === this.mode) return; const prev = this.mode; this.mode = id; const t = this.tools.get(this.tool); if (t && t.mode && t.mode !== id) this.setTool('select'); this.emit('mode', { mode: id, prev }) }
  registerTool(t) { this.tools.set(t.id, { order: 50, ...t }); this.emit('registry', 'tools') }
  setTool(id) { if (!this.tools.has(id) || id === this.tool) return; const prev = this.tools.get(this.tool); prev?.onDeactivate?.(this); this.tool = id; this.tools.get(id).onActivate?.(this); this.emit('tool', id) }
  setTime(t) { t = Math.max(0, +t || 0); if (t === this.time) return; this.time = t; this.emit('time', t) }
  setPref(k, v) { this.prefs[k] = v; try { localStorage.setItem('studio.prefs', JSON.stringify(this.prefs)) } catch {}; this.emit('prefs', { [k]: v }) }

  // ---------- registry ----------
  registerCommand(id, def) { this.commands.set(id, { id, label: id, ...def }); if (def.menu) this.registerMenu(def.menu, [id]); this.emit('registry', 'commands') }
  registerMenu(name, items) {
    let m = this.menus.get(name)
    if (!m) this.menus.set(name, m = [])
    for (const it of items) if (it === '-' || !m.includes(it)) m.push(it)
    this.emit('registry', 'menus')
  }
  registerPanel(p) { this.panels.set(p.id, { order: 50, where: 'right', ...p }); this.emit('registry', 'panels') }
  registerImporter(i) { this.importers.push(i) }
  registerExporter(e) { this.exporters.push(e) }
  // Run a command as one undo step. Async commands should wrap their late mutations in app.transact.
  run(id, args = {}) {
    const c = this.commands.get(id)
    if (!c) throw new Error('Unknown command: ' + id + this.suggest(id))
    if (c.enabled && !c.enabled(this, args)) throw new Error('Not available now: ' + c.label)
    if (c.noUndo) return c.run(this, args || {})
    this.begin(c.label)
    let r
    try { r = c.run(this, args || {}) } catch (e) { this.end({ cancel: true }); throw e }
    this.end()
    return r
  }
  // ' Did you mean a, b?' for a mistyped command id (AIs read this from op errors)
  suggest(id) {
    const q = String(id).toLowerCase(), tail = q.split('.').pop()
    const lev = (a, b) => { let p = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { const c = [i]; for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] !== b[j - 1])); p = c } return p[b.length] }
    const near = [...this.commands.keys()].map(k => { const l = k.toLowerCase(), t = l.split('.').pop()
      const d = Math.min(lev(tail, t), lev(q, l)), sub = tail.length > 2 && (t.startsWith(tail) || l.includes(tail))
      return { k, d: sub ? 0.5 : d, ok: sub || d <= Math.max(1, Math.floor(tail.length / 3)) } }).filter(x => x.ok).sort((a, b) => a.d - b.d).map(x => x.k)
    return near.length ? ' (did you mean ' + near.slice(0, 4).join(', ') + '?)' : ''
  }
  // Same as run, but errors become a toast (for buttons and keys).
  exec(id, args) {
    try { const r = this.run(id, args); if (r && r.catch) r.catch(e => this.toast(e.message || String(e), 'error')); return r } catch (e) { this.toast(e.message || String(e), 'error') }
  }
  async loadPlugins(list) {
    const base = new URL('../plugins/index.js', import.meta.url)
    if (!list) list = (await import('../plugins/index.js')).default
    const mods = await Promise.all(list.map(p => import(new URL(p, base).href).then(m => m.default, e => { console.warn('Plugin failed to load: ' + p, e); this.toast('Plugin failed to load: ' + p, 'error'); return null })))
    for (const p of mods) if (p) this.use(p)
    await Promise.all(mods.filter(p => p?.init).map(p => Promise.resolve().then(() => p.init(this)).catch(e => { console.warn('Plugin init failed: ' + p.id, e); this.toast('Plugin failed: ' + (p.name || p.id), 'error') })))
    this.emit('registry', 'plugins')
  }
  use(p) {
    this.plugins.push(p)
    for (const [id, def] of Object.entries(p.commands || {})) this.registerCommand(id, { ...def, plugin: p.id })
    for (const [name, items] of Object.entries(p.menus || {})) this.registerMenu(name, items)
    for (const m of p.modes || []) this.registerMode(m)
    for (const t of p.tools || []) this.registerTool({ ...t, plugin: p.id })
    for (const pn of p.panels || []) this.registerPanel({ ...pn, plugin: p.id })
    for (const i of p.importers || []) this.registerImporter(i)
    for (const e of p.exporters || []) this.registerExporter(e)
    for (const [name, def] of Object.entries(p.types || {})) registerType(name, def)
  }

  // ---------- projects ----------
  loadScene(data, id = this.projectId) {
    const s = emptyScene(data?.name || 'Untitled')
    if (data) {
      for (const k of ['env', 'camera']) if (data[k]) s[k] = { ...s[k], ...clone(data[k]) }
      for (const [oid, o] of Object.entries(data.objects || {})) if (o && o.type) s.objects[oid] = normalize(clone(o))
      for (const [aid, a] of Object.entries(data.anims || {})) if (a) s.anims[aid] = clone(a)
      for (const [tid, t] of Object.entries(data.textures || {})) if (t) s.textures[tid] = clone(t)
    }
    for (const oid in s.objects) { const p = s.objects[oid].parent; if (p && !s.objects[p]) s.objects[oid].parent = null }
    this.scene = s; this.projectId = id
    this.selection = []; this.undoStack = []; this.redoStack = []; this.tx = null; this._dirty.clear()
    this.time = 0
    this.emit('project', { id })
    this.emit('select', [])
    this.emit('history')
  }
  // Changes that came from the db (another tab or an AI). Not undoable.
  applyRemote(d) {
    this.flush()
    for (const col of ['objects', 'anims', 'textures']) for (const [id, v] of Object.entries(d[col] || {})) {
      const val = v && col === 'objects' ? (v.type ? normalize(v) : null) : v
      if (!same(val ?? undefined, this.scene[col][id])) this._put(col + ':' + id, val ?? undefined, 'remote')
    }
    for (const k of ['env', 'camera', 'name']) if (d[k] !== undefined && !same(d[k], this.scene[k])) this._put(k, d[k], 'remote')
    this.flush()
  }
  closeProject() { this.projectId = null; this.loadScene(null, null) }
}

// Content-addressed blob stores for geometry and textures; store.js plugs in the db backend.
function blobStore(app, kind) {
  const cache = new Map(), waiting = new Map()
  return {
    kind, cache, backend: null,
    put(data, id) {
      id = id || (kind === 'geo' ? 'g-' : 't-') + Math.random().toString(16).slice(2, 10).padEnd(8, '0')
      cache.set(id, data)
      this.backend?.put(id, data)
      return id
    },
    peek(id) { return cache.get(id) || null },
    get(id) {
      if (cache.has(id)) return Promise.resolve(cache.get(id))
      if (!this.backend) return Promise.resolve(null)
      let p = waiting.get(id)
      if (!p) {
        p = this.backend.get(id).then(d => { waiting.delete(id); if (d) { cache.set(id, d); app.emit(kind, { id }) } return d || null }, e => { waiting.delete(id); console.warn(e); return null })
        waiting.set(id, p)
      }
      return p
    }
  }
}

function coreCommands(app) {
  const sel = () => app.selection
  const need = (a, args = {}) => [].concat(args.ids || args.id || app.selection).length > 0
  const C = (id, def) => app.registerCommand(id, def)
  C('edit.undo', { label: 'Undo', key: 'Ctrl+Z', icon: 'undo', noUndo: true, run: a => a.undo() })
  C('edit.redo', { label: 'Redo', key: ['Ctrl+Shift+Z', 'Ctrl+Y'], icon: 'redo', noUndo: true, run: a => a.redo() })
  C('edit.copy', { label: 'Copy', key: 'Ctrl+C', icon: 'copy', noUndo: true, enabled: need, run: a => a.copy() })
  C('edit.cut', { label: 'Cut', key: 'Ctrl+X', enabled: need, run: a => { a.copy(); a.remove(sel()) } })
  C('edit.paste', { label: 'Paste', key: 'Ctrl+V', run: a => a.paste() })
  C('edit.duplicate', { label: 'Duplicate', key: 'Ctrl+D', icon: 'duplicate', enabled: need, run: (a, args) => a.duplicate(args.ids || sel(), { offset: args.offset }) })
  C('edit.delete', { label: 'Delete', key: ['Delete', 'Backspace'], icon: 'trash', enabled: need, run: (a, args) => a.remove(args.ids || sel()) })
  C('edit.selectAll', { label: 'Select all', key: 'Ctrl+A', noUndo: true, run: a => a.select(a.children(null).filter(id => !a.isHidden(id) && !a.isLocked(id))) })
  C('edit.selectNone', { label: 'Select none', key: 'Escape', noUndo: true, run: a => a.select([]) })
  C('edit.select', { label: 'Select objects', hidden: true, noUndo: true, run: (a, args) => { a.select(args.ids || [], args); return a.selection } })
  C('edit.group', { label: 'Group', key: 'Ctrl+G', icon: 'group', enabled: need, run: (a, args) => a.group(args.ids || sel()) })
  C('edit.ungroup', { label: 'Ungroup', key: 'Ctrl+Shift+G', enabled: (a, args = {}) => [].concat(args.ids || app.selection).some(id => app.obj(id)?.type === 'group'), run: (a, args) => [].concat(args.ids || sel()).filter(id => a.obj(id)?.type === 'group').flatMap(id => a.ungroup(id)) })
  C('edit.hide', { label: 'Hide / show', key: 'H', icon: 'eye', enabled: need, run: (a, args) => { const ids = args.ids || sel(); const show = ids.every(id => a.obj(id)?.visible === false); for (const id of ids) a.set(id, { visible: show }) } })
  C('edit.unhideAll', { label: 'Show all', key: 'Alt+H', run: a => { for (const id of a.ids()) if (a.obj(id).visible === false) a.set(id, { visible: true }) } })
  C('edit.lock', { label: 'Lock / unlock', key: 'L', icon: 'lock', enabled: need, run: (a, args) => { const ids = args.ids || sel(); const lock = !ids.every(id => a.obj(id)?.locked); for (const id of ids) a.set(id, { locked: lock }); if (lock) a.select([]) } })
  C('edit.set', { label: 'Set object fields', hidden: true, run: (a, args) => { for (const id of [].concat(args.ids || args.id || sel())) a.set(id, args.patch || {}) } })
  C('edit.add', { label: 'Add object', hidden: true, run: (a, args) => { const id = a.add(args.obj || args); if (args.select !== false) a.select([id]); return id } })
  C('edit.reparent', { label: 'Move into', hidden: true, run: (a, args) => a.reparent(args.ids || sel(), args.parent || null) })
  C('edit.snap', { label: 'Snap to grid', key: 'Ctrl+Shift+S', icon: 'magnet', noUndo: true, checked: a => a.prefs.snap, run: a => a.setPref('snap', !a.prefs.snap) })
  C('edit.space', { label: 'Local / world axes', key: 'Ctrl+L', icon: 'globe', noUndo: true, checked: a => a.prefs.space === 'local', run: a => a.setPref('space', a.prefs.space === 'local' ? 'world' : 'local') })
  for (const t of ['select', 'move', 'rotate', 'scale']) C('tool.' + t, { label: t[0].toUpperCase() + t.slice(1) + ' tool', key: { select: 'Q', move: 'W', rotate: 'E', scale: 'R' }[t], icon: t, noUndo: true, run: a => a.setTool(t) })
  C('mode.toggleEdit', { label: 'Toggle mesh edit', key: 'Tab', noUndo: true, enabled: a => a.modes.has('mesh'), run: a => a.setMode(a.mode === 'mesh' ? 'build' : 'mesh') })
  C('mode.set', { label: 'Switch mode', hidden: true, noUndo: true, run: (a, args) => a.setMode(args.mode) })
  C('play', { label: 'Play / pause', key: 'Space', icon: 'play', noUndo: true, enabled: a => a.commands.has('anim.play'), run: (a, args) => a.run('anim.play', args) })
  C('file.new', { label: 'New project', icon: 'plus', noUndo: true, run: async (a, args) => { const id = await a.store.createProject(args.name || 'Untitled', args.empty ? null : { objects: { baseplate: { type: 'part', shape: 'box', name: 'Baseplate', size: [64, 1, 64], pos: [0, -0.5, 0], color: '#5b5f66', locked: true, order: 0 } } }); if (args.open !== false) location.hash = '#' + id; return id } })
  C('file.home', { label: 'All projects', icon: 'home', noUndo: true, run: () => { location.hash = '#' } })
  C('file.rename', { label: 'Rename project', run: async (a, args) => { const name = args.name ?? await a.ui?.prompt('Rename project', a.scene.name); if (name) a.rename(name) } })
  C('file.duplicate', { label: 'Duplicate project', noUndo: true, run: async a => { const id = await a.store.duplicateProject(a.projectId); location.hash = '#' + id; return id } })
  C('help.palette', { label: 'Command palette', key: 'Ctrl+K', icon: 'search', noUndo: true, run: a => a.ui?.palette() })
  C('help.shortcuts', { label: 'Keyboard shortcuts', key: 'Shift+?', noUndo: true, run: a => a.ui?.shortcuts() })
  app.registerMenu('File', ['file.new', 'file.rename', 'file.duplicate', '-', 'file.home'])
  app.registerMenu('Edit', ['edit.undo', 'edit.redo', '-', 'edit.cut', 'edit.copy', 'edit.paste', 'edit.duplicate', 'edit.delete', '-', 'edit.selectAll', 'edit.selectNone', '-', 'edit.group', 'edit.ungroup', 'edit.hide', 'edit.unhideAll', 'edit.lock', '-', 'edit.snap', 'edit.space'])
  app.registerMenu('Context', ['edit.copy', 'edit.paste', 'edit.duplicate', 'edit.delete', '-', 'edit.group', 'edit.ungroup', 'edit.hide', 'edit.lock'])
  app.registerMenu('Help', ['help.palette', 'help.shortcuts'])
}

const PROJECT_ID = /^[A-Za-z0-9-]{1,64}$/
const RESERVED = new Set(['settings', 'sidebar', 'customize', 'upgrade', 'downloads'])
export function validProjectId(id) { return PROJECT_ID.test(id) && !RESERVED.has(id.toLowerCase()) && !/^comment-/i.test(id) }

let viewportModule = null
export async function boot(root = document.getElementById('app')) {
  const app = new App()
  let readyResolve
  const ready = new Promise(r => { readyResolve = r })
  let openWaiters = []
  window.studio = {
    app, ready,
    run: (cmd, args) => Promise.resolve().then(() => app.run(cmd, args)),
    commands: () => [...app.commands.values()].map(c => ({ id: c.id, label: c.label, key: c.key || null, menu: [...app.menus].filter(([, l]) => l.includes(c.id)).map(([n]) => n)[0] || null })),
    scene: () => app.sceneData(),
    selection: () => [...app.selection],
    select: ids => app.select(ids),
    open: id => new Promise(res => { if (!id) { location.hash = '#'; return res(null) } if (app.projectId === id && app.loaded) return res(id); openWaiters.push({ id, res }); location.hash = '#' + id })
  }
  viewportModule = import('./viewport.js') // starts loading while the home page renders
  mountUI(app, root)
  app.store = createStore(app)
  await Promise.all([app.loadPlugins(), app.store.init()])
  const route = async () => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''))
    if (!id || !validProjectId(id)) { if (app.projectId) { app.store.closeProject(); app.closeProject() } app.loaded = false; app.ui.showHome(); return }
    if (id === app.projectId && app.loaded) return
    if (app.projectId) app.store.closeProject()
    app.loaded = false
    app.ui.showEditor()
    if (!app.viewport) {
      const { createViewport } = await viewportModule
      app.viewport = createViewport(app, app.ui.viewportEl())
      app.emit('viewport', app.viewport)
    }
    const ok = await app.store.openProject(id)
    if (!ok) { location.hash = '#'; return }
    app.loaded = true
    app.emit('opened', id)
    openWaiters = openWaiters.filter(w => { if (w.id === id) { w.res(id); return false } return true })
  }
  addEventListener('hashchange', route)
  await route()
  readyResolve(true)
  return app
}
