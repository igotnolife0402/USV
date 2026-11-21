// Mock of the artifact runtime (window.claude) for tests. Injected before the page runs.
// Config: window.__mockConfig = { latency: 30, persist: true, disable: ['db'], shared: false }.
// shared: pages of one browser context share one db (localStorage + BroadcastChannel), like the real runtime.
// Inspect from tests through window.__mock: docs, stats, external(path, patch|null, {set}), downloads, assets.
(() => {
  const cfg = Object.assign({ latency: 30, persist: true, disable: [] }, window.__mockConfig || {})
  const KEY = '__mock_docs'
  const LIMIT = 256 * 1024
  const ALLOWED = /\.(gif|png|jpe?g|webp|mp4|webm|mov|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip|fig)$/i
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v)
  const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v))
  const wait = (ms = cfg.latency) => new Promise(r => setTimeout(r, ms * (0.6 + Math.random() * 0.8)))
  const err = (code, message) => Object.assign(new Error(message), { code })
  const docs = new Map()
  const store = cfg.shared ? localStorage : sessionStorage
  try { const s = cfg.persist && store.getItem(KEY); if (s) for (const [k, v] of JSON.parse(s)) docs.set(k, v) } catch {}
  let saveT = 0
  const persist = () => { if (!cfg.persist) return; clearTimeout(saveT); saveT = setTimeout(() => { try { store.setItem(KEY, JSON.stringify([...docs])) } catch {} }, 50) }
  const bc = cfg.shared ? new BroadcastChannel('__mock_db') : null
  const share = path => bc?.postMessage({ path, value: docs.get(path) })
  const stats = { writes: 0, reads: 0, inFlight: new Map(), maxInFlight: 0, violations: [], rejected: 0, bytes: 0 }
  const subs = new Set()
  const locks = new Map()
  // nested objects merge, arrays replace, null is stored (the page compacts nulls)
  const merge = (t, p) => { for (const k in p) { if (isObj(p[k]) && isObj(t[k])) merge(t[k], p[k]); else t[k] = clone(p[k]) } return t }
  const snap = path => { const d = docs.get(path); return { id: path.split('/').pop(), ref: { path }, exists: d !== undefined, data: () => clone(d), metadata: { fromCache: false, hasPendingWrites: false } } }
  const notify = path => { for (const s of [...subs]) if (s.match(path)) setTimeout(() => subs.has(s) && s.emit(), 0) }
  if (bc) bc.onmessage = e => { const { path, value } = e.data; if (value === undefined) docs.delete(path); else docs.set(path, value); notify(path) }
  async function write(path, fn) {
    const n = (stats.inFlight.get(path) || 0) + 1
    stats.inFlight.set(path, n)
    if (n > stats.maxInFlight) stats.maxInFlight = n
    if (n > 1) stats.violations.push(path)
    try {
      await wait()
      const next = fn(clone(docs.get(path)))
      if (next !== undefined) {
        const size = JSON.stringify(next).length
        if (size > LIMIT) { stats.rejected++; throw err('resource_exhausted', 'Document is larger than 256 KiB') }
        stats.bytes += size
      }
      stats.writes++
      if (next === undefined) docs.delete(path); else docs.set(path, next)
      persist(); notify(path); share(path)
    } finally { stats.inFlight.set(path, stats.inFlight.get(path) - 1) }
  }
  function doc(path) {
    return {
      id: path.split('/').pop(), path,
      async get() { await wait(); stats.reads++; return snap(path) },
      set: d => write(path, () => clone(d)),
      update: p => write(path, cur => { if (cur === undefined) throw err('not_found', 'Document does not exist: ' + path); return merge(cur, p) }),
      delete: () => write(path, () => undefined),
      async acquire({ holder, ttlMs = 30000 } = {}) {
        await wait()
        const l = locks.get(path), t = Date.now()
        if (l && l.holder !== holder && l.until > t) return { acquired: false, holder: l.holder }
        locks.set(path, { holder, until: t + ttlMs })
        return { acquired: true, holder }
      },
      async release({ holder } = {}) { const l = locks.get(path); if (l && l.holder === holder) locks.delete(path); return { released: true } },
      onSnapshot(next, onErr) {
        const s = { match: p => p === path, emit: () => { try { next(snap(path)) } catch (e) { onErr?.(e) } } }
        subs.add(s); setTimeout(() => subs.has(s) && s.emit(), cfg.latency)
        return () => subs.delete(s)
      },
      collection: name => collection(path + '/' + name)
    }
  }
  function collection(col, q = { where: [], order: null, lim: 1000 }) {
    const run = () => {
      let list = [...docs.keys()].filter(k => k.startsWith(col + '/') && !k.slice(col.length + 1).includes('/')).map(snap)
      for (const [f, op, v] of q.where) list = list.filter(d => { const x = d.data()[f]; return op === '==' ? x === v : op === '!=' ? x !== v : op === 'in' ? v.includes(x) : true })
      if (q.order) { const [f, dir] = q.order; list.sort((a, b) => ((a.data()[f] ?? '') < (b.data()[f] ?? '') ? -1 : 1) * (dir === 'desc' ? -1 : 1)) }
      list = list.slice(0, q.lim)
      return { docs: list, size: list.length, empty: !list.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } }
    }
    return {
      path: col,
      doc: id => doc(col + '/' + (id || Math.random().toString(36).slice(2, 12))),
      add: async d => { const r = doc(col + '/' + Math.random().toString(36).slice(2, 12)); await r.set(d); return r },
      where: (f, op, v) => collection(col, { ...q, where: [...q.where, [f, op, v]] }),
      orderBy: (f, dir = 'asc') => collection(col, { ...q, order: [f, dir] }),
      limit: n => collection(col, { ...q, lim: n }),
      async get() { await wait(); stats.reads++; return run() },
      onSnapshot(next, onErr) {
        const s = { match: p => p.startsWith(col + '/') && !p.slice(col.length + 1).includes('/'), emit: () => { try { next(run()) } catch (e) { onErr?.(e) } } }
        subs.add(s); setTimeout(() => subs.has(s) && s.emit(), cfg.latency)
        return () => subs.delete(s)
      }
    }
  }
  const blobs = new Map()
  const assets = {
    async upload(blob, opts = {}) {
      await wait()
      const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
      blobs.set(id, new Blob([blob], { type: opts.type || blob.type || 'application/octet-stream' }))
      return { id, url: '/_blob/' + id, size: blob.size, type: opts.type || blob.type }
    },
    async list() { return [...blobs].map(([id, b]) => ({ id, size: b.size, type: b.type })) },
    async delete(id) { blobs.delete(id); return { deleted: true } }
  }
  const realFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    const m = /\/_blob\/([0-9a-f]{32})/.exec(url)
    if (m) return Promise.resolve(blobs.has(m[1]) ? new Response(blobs.get(m[1]), { headers: { 'content-type': blobs.get(m[1]).type } }) : new Response('not found', { status: 404 }))
    return realFetch(input, init)
  }
  const downloads = []
  const ns = {
    db: { doc, collection },
    assets,
    downloads: {
      async save({ filename, data } = {}) {
        await wait()
        if (!ALLOWED.test(String(filename))) throw err('invalid_argument', 'File type not allowed: ' + filename)
        const size = data instanceof Blob ? data.size : data?.byteLength ?? String(data ?? '').length
        downloads.push({ filename, size })
        return { status: 'saved', filename }
      }
    },
    user: { id: 'user-test', name: 'Test User', async get() { return { id: 'user-test', name: 'Test User' } } }
  }
  window.claude = { async use(name) { await wait(5); return cfg.disable.includes(name) ? null : ns[name] || null } }
  window.__mock = {
    cfg, docs, stats, downloads, blobs, locks,
    get: path => clone(docs.get(path)),
    keys: prefix => [...docs.keys()].filter(k => k.startsWith(prefix)),
    // An outside writer (another AI through the data tool): merge (or set) without the page's own write path.
    external(path, patch, { set = false } = {}) {
      if (patch === null) docs.delete(path)
      else docs.set(path, set ? clone(patch) : merge(clone(docs.get(path)) || {}, patch))
      persist(); notify(path); share(path)
      return Date.now()
    }
  }
})()
