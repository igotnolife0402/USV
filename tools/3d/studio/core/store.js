// Projects in the artifact db: live sync, ops queue, geometry/texture stores, offline fallback.
import { compact, normalize } from './model.js'

const TAB = 'tab-' + Math.random().toString(36).slice(2, 10)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v))
const isObj = v => v && typeof v === 'object' && !Array.isArray(v)
const now = () => new Date().toISOString()
const BIG = 240 * 1024

export function stripNulls(v) {
  if (!isObj(v)) return v
  const o = {}
  for (const k in v) if (v[k] !== null && v[k] !== undefined) o[k] = stripNulls(v[k])
  return o
}
// Patch that turns a into b with db update semantics (nested objects merge, null removes, arrays replace).
export function deepDiff(a, b) {
  if (b === undefined) return null
  if (!isObj(a) || !isObj(b)) return clone(b)
  const p = {}
  for (const k in b) if (!same(a[k], b[k])) p[k] = isObj(a[k]) && isObj(b[k]) ? deepDiff(a[k], b[k]) : clone(b[k])
  for (const k in a) if (!(k in b)) p[k] = null
  return p
}
export function applyPatch(t, p) {
  for (const k in p) {
    if (p[k] === null) delete t[k]
    else if (isObj(p[k]) && isObj(t[k])) applyPatch(t[k], p[k])
    else t[k] = clone(stripNulls(p[k]))
  }
  return t
}
function countNulls(v, n = 0) { if (!isObj(v)) return n; for (const k in v) n = v[k] === null ? n + 1 : countNulls(v[k], n); return n }

function use(name, ms = 10000) {
  const c = typeof window !== 'undefined' ? window.claude : null
  if (!c?.use) return Promise.resolve(null)
  return Promise.race([Promise.resolve().then(() => c.use(name)).catch(() => null), new Promise(r => setTimeout(() => r(null), ms))])
}

// ---------- local db (IndexedDB, memory fallback) with the same calls the store uses ----------
class LocalDB {
  static async open() {
    const db = new LocalDB()
    try {
      db.idb = await new Promise((res, rej) => { const r = indexedDB.open('studio-local', 1); r.onupgradeneeded = () => r.result.createObjectStore('docs'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
      await new Promise((res, rej) => {
        const st = db.idb.transaction('docs').objectStore('docs'), keys = st.getAllKeys(), vals = st.getAll()
        vals.onsuccess = () => { keys.result.forEach((k, i) => db.docs.set(k, vals.result[i])); res() }
        vals.onerror = () => rej(vals.error)
      })
      db.persistent = true
    } catch (e) { db.idb = null; db.persistent = false }
    return db
  }
  constructor() { this.docs = new Map(); this.subs = new Set() }
  _snap(path) { const d = this.docs.get(path); return { id: path.split('/').pop(), exists: d !== undefined, data: () => clone(d), metadata: { fromCache: false, hasPendingWrites: false } } }
  _write(path, data) {
    if (data === undefined) this.docs.delete(path); else this.docs.set(path, data)
    let done = Promise.resolve()
    try {
      if (this.idb) {
        const tx = this.idb.transaction('docs', 'readwrite'), st = tx.objectStore('docs')
        data === undefined ? st.delete(path) : st.put(data, path)
        done = new Promise(r => { tx.oncomplete = tx.onerror = tx.onabort = () => r() }) // resolve once on disk: a reload right after a save keeps it
      }
    } catch { this.idb = null; this.persistent = false }
    for (const s of [...this.subs]) if (s.path === path || (s.col && path.startsWith(s.col + '/') && !path.slice(s.col.length + 1).includes('/'))) queueMicrotask(() => s.emit())
    return done
  }
  doc(path) {
    const db = this
    return {
      path, id: path.split('/').pop(),
      get: async () => db._snap(path),
      set: async d => db._write(path, stripNulls(clone(d))),
      update: async p => { const cur = db.docs.get(path); if (cur === undefined) throw Object.assign(new Error('Document does not exist'), { code: 'invalid_argument' }); return db._write(path, applyPatch(clone(cur), p)) },
      delete: async () => db._write(path, undefined),
      acquire: async () => ({ acquired: true }),
      onSnapshot(next) { const s = { path, emit: () => next(db._snap(path)) }; db.subs.add(s); queueMicrotask(() => db.subs.has(s) && s.emit()); return () => db.subs.delete(s) },
      collection: name => db.collection(path + '/' + name)
    }
  }
  collection(col, q = { where: [], order: null, lim: 1000 }) {
    const db = this
    const run = () => {
      let docs = [...db.docs.keys()].filter(k => k.startsWith(col + '/') && !k.slice(col.length + 1).includes('/')).map(k => db._snap(k))
      for (const [f, op, v] of q.where) docs = docs.filter(d => { const x = d.data()[f]; return op === '==' ? x === v : op === '!=' ? x !== v : true })
      if (q.order) { const [f, dir] = q.order; docs.sort((a, b) => ((a.data()[f] ?? '') < (b.data()[f] ?? '') ? -1 : 1) * (dir === 'desc' ? -1 : 1)) }
      docs = docs.slice(0, q.lim)
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } }
    }
    return {
      path: col,
      doc: id => db.doc(col + '/' + (id || Math.random().toString(36).slice(2, 12))),
      add: async d => { const r = db.doc(col + '/' + Math.random().toString(36).slice(2, 12)); await r.set(d); return r },
      where: (f, op, v) => db.collection(col, { ...q, where: [...q.where, [f, op, v]] }),
      orderBy: (f, dir = 'asc') => db.collection(col, { ...q, order: [f, dir] }),
      limit: n => db.collection(col, { ...q, lim: n }),
      get: async () => run(),
      onSnapshot(next) { const s = { col, emit: () => next(run()) }; db.subs.add(s); queueMicrotask(() => db.subs.has(s) && s.emit()); return () => db.subs.delete(s) }
    }
  }
}

export function createStore(app) { return new Store(app) }

class Store {
  constructor(app) {
    this.app = app; this.mode = 'memory'; this.status = 'saved'
    this.db = null; this.assets = null; this.downloads = null; this.user = null
    this.pid = null; this.remote = null; this.remoteExists = false; this.seen = new Map(); this.recheck = new Set()
    this.keys = new Set(); this.inflight = new Set(); this.timer = 0; this.first = 0; this.busy = false; this.retry = 0
    this.unsubs = []; this.ops = new Set(); this.opChain = Promise.resolve()
    this.blobWrites = new Map()
    app.on('change', ch => this.onChange(ch))
    app.geo.backend = { put: (id, d) => this.putBlob('geo', id, d), get: id => this.getBlob('geo', id) }
    app.tex.backend = { put: (id, d) => this.putBlob('tex', id, d), get: id => this.getBlob('tex', id) }
    if (typeof addEventListener === 'function') {
      addEventListener('pagehide', () => this.flush())
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.flush() })
    }
  }
  async init() {
    const [db, assets, downloads, user] = await Promise.all(['db', 'assets', 'downloads', 'user'].map(n => use(n)))
    Object.assign(this, { assets, downloads, user })
    if (db) { this.db = db; this.mode = 'cloud' }
    else { this.db = await LocalDB.open(); this.mode = this.db.persistent ? 'local' : 'memory' }
    this.app.emit('storage', this.mode)
    return this.mode
  }
  setStatus(s) { if (s === this.status) return; this.status = s; this.app.emit('save', s) }
  ref(path) { return this.db.doc(path) }

  // ---------- project list ----------
  listProjects(cb) {
    let q = this.db.collection('meta')
    try { q = q.orderBy('updated', 'desc').limit(200) } catch {}
    return q.onSnapshot(qs => cb(qs.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.name !== undefined)), e => { console.warn(e); this.app.toast('Could not load projects: ' + (e.message || e.code), 'error'); cb([]) })
  }
  newId(name) {
    let slug = String(name || 'project').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'project'
    if (/^(settings|sidebar|customize|upgrade|downloads|comment)$/.test(slug)) slug += '-x'
    return slug + '-' + Math.random().toString(16).slice(2, 6).padEnd(4, '0')
  }
  async createProject(name = 'Untitled', data = null) {
    const id = this.newId(name), t = now()
    const doc = { name, v: 1, updated: t, objects: {}, anims: {}, textures: {}, env: { bg: '#1b1d22', grid: true, fog: null, light: 'studio' }, camera: { pos: [12, 9, 12], target: [0, 1, 0], fov: 50, ortho: false }, ...(data || {}) }
    doc.name = name
    await this.ref('projects/' + id).set(stripNulls(doc))
    await this.ref('meta/' + id).set({ name, updated: t, count: Object.keys(doc.objects || {}).length })
    return id
  }
  async renameProject(id, name) {
    name = String(name || '').trim().slice(0, 80) || 'Untitled'
    if (id === this.pid) { this.app.rename(name); return }
    await this.ref('projects/' + id).update({ name, updated: now() })
    await this.ref('meta/' + id).update({ name, updated: now() }).catch(() => this.ref('meta/' + id).set({ name, updated: now(), count: 0 }))
  }
  async subDocs(id, kind) { try { return (await this.db.collection(`projects/${id}/${kind}`).get()).docs } catch { return [] } }
  async duplicateProject(id) {
    if (id === this.pid) await this.flush()
    const snap = await this.ref('projects/' + id).get()
    if (!snap.exists) throw new Error('Project not found')
    const data = stripNulls(snap.data())
    const name = (data.name || 'Untitled') + ' copy'
    const nid = await this.createProject(name, { ...data, name })
    for (const kind of ['geo', 'tex']) for (const d of await this.subDocs(id, kind)) await this.ref(`projects/${nid}/${kind}/${d.id}`).set(d.data())
    const m = await this.ref('meta/' + id).get()
    if (m.exists && m.data().thumb) await this.ref('meta/' + nid).update({ thumb: m.data().thumb, count: Object.keys(data.objects || {}).length })
    return nid
  }
  async deleteProject(id) {
    if (id === this.pid) { this.closeProject(true); this.app.closeProject() }
    for (const kind of ['geo', 'tex', 'ops']) for (const d of await this.subDocs(id, kind)) await this.ref(`projects/${id}/${kind}/${d.id}`).delete().catch(() => {})
    await this.ref('projects/' + id).delete()
    await this.ref('meta/' + id).delete()
  }

  // ---------- open project ----------
  openProject(id) {
    this.closeProject()
    this.pid = id; this.remote = null; this.seen.clear(); this.recheck.clear()
    const ref = this.ref('projects/' + id)
    return new Promise(resolve => {
      let first = true
      const unsub = ref.onSnapshot(snap => {
        if (this.pid !== id) return
        if (!snap.exists) {
          this.remoteExists = false
          if (first) { first = false; this.app.toast('Project not found', 'error'); this.pid = null; resolve(false) }
          else if (!this.keys.size && !this.inflight.size) { this.app.toast('This project was deleted', 'error'); location.hash = '#' }
          return
        }
        this.remoteExists = true
        const raw = snap.data()
        this.remote = stripNulls(raw)
        if (first) {
          first = false
          for (const col of ['objects', 'anims', 'textures']) for (const k in this.remote[col] || {}) this.seen.set(col + ':' + k, JSON.stringify(this.remote[col][k]))
          this.app.loadScene(this.remote, id)
          for (const o of Object.values(this.app.scene.objects)) if (o.geo) this.app.geo.get(o.geo)
          this.ensureMeta(id)
          this.setStatus(this.mode === 'cloud' ? 'saved' : this.mode)
          resolve(true)
        } else this.reconcile()
        if (countNulls(raw) > 50 && !this.keys.size && !this.inflight.size) this.compactDoc()
      }, e => { console.warn(e); this.app.toast('Sync stopped: ' + (e.message || e.code), 'error'); this.setStatus('error'); if (first) { first = false; resolve(false) } })
      this.unsubs.push(unsub)
      this.watchOps(id)
    })
  }
  closeProject(drop) {
    if (this.pid) { if (this.thumbDue && !drop && document.visibilityState !== 'hidden') this.snapThumb(this.pid, true); this.flush() } // leaving before the 4 s timer still leaves a thumbnail
    for (const u of this.unsubs) { try { u() } catch {} }
    this.unsubs = []; this.pid = null; this.remote = null
    clearTimeout(this.metaTimer); clearTimeout(this.thumbTimer); this.thumbDue = false
  }
  async ensureMeta(id) {
    try {
      const m = await this.ref('meta/' + id).get()
      if (!m.exists) await this.ref('meta/' + id).set({ name: this.app.scene.name, updated: now(), count: Object.keys(this.app.scene.objects).length })
    } catch {}
  }
  busyKey(k) { return this.keys.has(k) || this.inflight.has(k) || !!this.app.tx?.before.has(k) }
  // Apply db changes made elsewhere (AIs, other tabs) that are not waiting to be written from here.
  reconcile() {
    const d = this.remote, app = this.app
    if (!d) return
    const changes = { objects: {}, anims: {}, textures: {} }
    let any = false
    for (const col of ['objects', 'anims', 'textures']) {
      const r = d[col] || {}, l = app.scene[col]
      for (const id in r) {
        const k = col + ':' + id, js = JSON.stringify(r[id])
        if (this.seen.get(k) === js && !this.recheck.has(k)) continue
        if (this.busyKey(k)) { this.recheck.add(k); continue }
        this.seen.set(k, js); this.recheck.delete(k)
        const rv = col === 'objects' ? (r[id]?.type ? normalize(r[id]) : null) : r[id]
        if (!same(rv, l[id])) { changes[col][id] = r[id]; any = true }
      }
      for (const id in l) if (!(id in r)) {
        const k = col + ':' + id
        if (this.busyKey(k)) continue
        if (!this.seen.has(k) && !this.recheck.has(k)) continue // never reached the db: still being written
        this.seen.delete(k); this.recheck.delete(k)
        changes[col][id] = null; any = true
      }
    }
    for (const k of ['env', 'camera', 'name']) if (d[k] !== undefined && !this.busyKey(k) && !same(d[k], app.scene[k])) { changes[k] = d[k]; any = true }
    if (any) app.applyRemote(changes)
  }

  // ---------- writing ----------
  onChange(ch) {
    if (!this.pid || ch.source === 'remote' || ch.source === 'load') return
    for (const k of ch.keys) this.keys.add(k)
    this.schedule()
    this.scheduleMeta(ch)
  }
  schedule(delay = 300) {
    if (!this.keys.size) return
    this.setStatus('saving')
    const t = Date.now()
    if (!this.first) this.first = t
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.send(), Math.max(0, Math.min(delay, this.first + 1500 - t)))
  }
  localValue(k) {
    const v = this.app._get(k)
    if (v === undefined) return undefined
    return k.startsWith('objects:') ? compact(v) : clone(v)
  }
  remoteValue(k) { const d = this.remote || {}; if (!k.includes(':')) return d[k]; const i = k.indexOf(':'); return d[k.slice(0, i)]?.[k.slice(i + 1)] }
  buildPatch(keys) {
    const patch = {}
    for (const k of keys) {
      const l = this.localValue(k), r = this.remoteValue(k)
      if (same(l, r)) continue
      const val = l === undefined ? null : deepDiff(r, l)
      if (!k.includes(':')) patch[k] = val
      else { const i = k.indexOf(':'), col = k.slice(0, i); (patch[col] = patch[col] || {})[k.slice(i + 1)] = val }
    }
    return patch
  }
  fullDoc() {
    const s = this.app.scene, objects = {}
    for (const id in s.objects) objects[id] = compact(s.objects[id])
    return { name: s.name, v: 1, updated: now(), objects, anims: clone(s.anims), textures: clone(s.textures), env: clone(s.env), camera: clone(s.camera) }
  }
  async send() {
    if (this.busy || !this.keys.size || !this.pid) return
    clearTimeout(this.timer); this.first = 0
    const pid = this.pid, keys = [...this.keys]
    this.keys.clear(); for (const k of keys) this.inflight.add(k)
    this.busy = true
    const ref = this.ref('projects/' + pid)
    let ok = true
    try {
      const patch = this.buildPatch(keys)
      if (Object.keys(patch).length) {
        patch.updated = now()
        const size = JSON.stringify(this.remote || {}).length + JSON.stringify(patch).length
        if (size > 250 * 1024) throw Object.assign(new Error('Project is too big to save (256 KB limit). Join parts into meshes or delete some.'), { code: 'resource_exhausted' })
        if (this.remoteExists) await ref.update(patch)
        else { const full = this.fullDoc(); await ref.set(full); this.remote = stripNulls(full); this.remoteExists = true }
        if (this.remote && this.pid === pid) {
          applyPatch(this.remote, patch)
          for (const k of keys) { const v = this.remoteValue(k); if (k.includes(':')) v === undefined ? this.seen.delete(k) : this.seen.set(k, JSON.stringify(v)) }
        }
        if (size > 230 * 1024 && !this.warned) { this.warned = true; this.app.toast('Project is near the 256 KB save limit', 'warn') }
      }
      this.retry = 0
    } catch (e) {
      ok = false
      if (this.pid === pid) for (const k of keys) this.keys.add(k)
      if (e.code === 'invalid_argument' && /exist/i.test(e.message || '')) { this.remoteExists = false; this.retry++ }
      if (e.code === 'unavailable' || (e.code === 'invalid_argument' && this.retry < 3) || (!e.code && this.retry < 5)) {
        this.retry++
        clearTimeout(this.timer); this.timer = setTimeout(() => this.send(), Math.min(30000, 500 * 2 ** this.retry))
      } else {
        this.setStatus('error'); this.app.toast('Not saved: ' + (e.message || e.code), 'error')
      }
    } finally {
      for (const k of keys) this.inflight.delete(k)
      this.busy = false
    }
    if (this.pid !== pid) return
    if (ok) this.reconcile()
    if (this.keys.size) { if (ok) this.send() }
    else if (ok) this.setStatus(this.mode === 'cloud' ? 'saved' : this.mode)
    this.app.emit('saved', pid)
  }
  async compactDoc() {
    if (this.compacting) return
    this.compacting = true
    try { const full = this.fullDoc(); await this.ref('projects/' + this.pid).set(full) } catch (e) { console.warn(e) } finally { this.compacting = false }
  }
  // ---------- ops queue: commands queued by AIs in projects/<id>/ops ----------
  watchOps(pid) {
    let q = this.db.collection(`projects/${pid}/ops`)
    try { q = q.where('status', '==', 'queued') } catch {}
    const unsub = q.onSnapshot(qs => {
      for (const d of qs.docs) {
        if (this.ops.has(d.id) || d.data()?.status !== 'queued') continue
        this.ops.add(d.id)
        this.opChain = this.opChain.then(() => this.runOp(pid, d.id)).catch(e => console.warn(e))
      }
    }, e => console.warn('ops queue', e))
    this.unsubs.push(unsub)
  }
  async runOp(pid, opId) {
    if (this.pid !== pid) { this.ops.delete(opId); return }
    const ref = this.ref(`projects/${pid}/ops/${opId}`)
    try {
      if (ref.acquire) { const l = await ref.acquire({ holder: TAB, ttlMs: 60000 }); if (!l?.acquired) return }
      const snap = await ref.get(), op = snap.exists ? snap.data() : null
      if (!op || op.status !== 'queued') return
      await ref.update({ status: 'running', by: TAB, started: now() })
      let out
      try {
        let r = await this.app.run(String(op.cmd || ''), op.args || {})
        await this.flush()
        r = r == null ? {} : JSON.parse(JSON.stringify(r))
        if (JSON.stringify(r)?.length > 50000) r = { truncated: true }
        out = { status: 'done', result: r, finished: now() }
      } catch (e) { out = { status: 'error', error: String(e?.message || e), finished: now() } }
      await ref.update(out)
    } catch (e) { console.warn('op', opId, e) }
  }
  // Write everything now (before leaving a page or project).
  async flush() {
    clearTimeout(this.timer)
    if (this.metaPending) this.writeMeta()
    while (this.pid && (this.keys.size || this.busy)) {
      if (this.busy) await new Promise(r => setTimeout(r, 20))
      else await this.send()
      if (this.status === 'error') break
    }
    await this.metaQ
  }
  scheduleMeta(ch) {
    this.metaPending = true
    clearTimeout(this.metaTimer)
    this.metaTimer = setTimeout(() => this.writeMeta(), 2000)
    if (ch.objects.length || ch.top.includes('env')) { clearTimeout(this.thumbTimer); this.thumbDue = true; this.thumbTimer = setTimeout(() => this.writeThumb(), 4000) }
  }
  writeMeta() {
    if (!this.pid) return
    this.metaPending = false
    const pid = this.pid, m = { name: this.app.scene.name, updated: now(), count: Object.keys(this.app.scene.objects).length }
    const ref = this.ref('meta/' + pid)
    return this.metaWrite(() => ref.update(m).catch(() => ref.set(m)))
  }
  // meta docs get one write at a time (the db allows one in flight per doc)
  metaWrite(fn) { return (this.metaQ = (this.metaQ || Promise.resolve()).then(fn).catch(e => console.warn(e))) }
  writeThumb(tries = 0) {
    const vp = this.app.viewport, pid = this.pid
    if (!vp || !pid || document.visibilityState === 'hidden') return
    const go = () => {
      if (this.pid !== pid) return
      if (vp.busy?.() && tries < 20) return void setTimeout(() => this.writeThumb(tries + 1), 500) // never stall a drag: reading pixels back waits for the GPU
      this.snapThumb(pid)
    }
    typeof requestIdleCallback === 'function' ? requestIdleCallback(go, { timeout: 2000 }) : setTimeout(go, 50)
  }
  snapThumb(pid, atOnce) { // atOnce: leaving, so read the pixels at once (async reads wait on a GPU fence instead of the main thread)
    this.thumbDue = false
    const vp = this.app.viewport
    if (vp) Promise.resolve(vp.snapshot({ w: 320, h: 200, type: 'image/webp', quality: 0.72, async: !atOnce })).then(thumb => {
      if (!thumb || thumb.length >= 60000) return
      const ref = this.ref('meta/' + pid); this.metaWrite(() => ref.update({ thumb }).catch(() => ref.set({ name: this.app.scene.name, updated: now(), count: Object.keys(this.app.scene.objects).length, thumb })))
    })
  }

  // ---------- geometry and texture docs ----------
  putBlob(kind, id, data) {
    const pid = this.pid
    if (!pid) return
    const p = (async () => {
      let body = data
      const json = JSON.stringify(data)
      if (json.length > BIG) {
        if (!this.assets) throw new Error('Mesh too big to save without the assets store')
        const a = await this.assets.upload(new Blob([json], { type: 'application/json' }), { type: 'application/json' })
        body = { asset: a.id }
      }
      await this.ref(`projects/${pid}/${kind}/${id}`).set(body)
    })().catch(e => { console.warn(e); this.app.toast('Could not save ' + (kind === 'geo' ? 'mesh' : 'texture') + ': ' + (e.message || e.code), 'error') })
    this.blobWrites.set(id, p)
    p.finally(() => this.blobWrites.delete(id))
    return p
  }
  async getBlob(kind, id) {
    const pid = this.pid
    if (!pid) return null
    await this.blobWrites.get(id)
    const ref = this.ref(`projects/${pid}/${kind}/${id}`)
    let snap = await ref.get()
    if (!snap.exists) { // an AI may write it a moment later
      snap = await new Promise(res => {
        let done = false
        const stop = ref.onSnapshot(s => { if (s.exists && !done) { done = true; stop?.(); res(s) } }, () => {})
        setTimeout(() => { if (!done) { done = true; stop?.(); res(null) } }, 30000)
      })
      if (!snap) return null
    }
    let d = snap.data()
    if (d && d.asset && !d.verts && !d.data) {
      const r = await fetch('/_blob/' + d.asset)
      d = kind === 'geo' || r.headers.get('content-type')?.includes('json') ? await r.json() : { kind: 'image', data: await blobToDataURL(await r.blob()) }
    }
    return d
  }

  // ---------- files ----------
  async download(filename, data) {
    if (!this.downloads) { this.app.toast('Downloads are not available here', 'error'); return { status: 'unavailable' } }
    try { const r = await this.downloads.save({ filename, data }); this.app.toast('Saved ' + filename, 'ok'); return r }
    catch (e) { const msg = e.code === 'declined' ? 'Download cancelled' : 'Download failed: ' + (e.message || e.code); this.app.toast(msg, e.code === 'declined' ? 'info' : 'error'); return { status: e.code || 'error' } }
  }
  async upload(blob, type) {
    if (!this.assets) throw new Error('File storage is not available here')
    return this.assets.upload(blob, type ? { type } : undefined)
  }
}
function blobToDataURL(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b) }) }
