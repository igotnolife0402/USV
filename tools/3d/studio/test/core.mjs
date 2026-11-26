// Core: scene model, home page projects, undo/redo, live sync with outside writers, ops queue, one write per doc, offline,
// per-object light culling (same picture) and lazy BVHs.
import { statSync } from 'node:fs'
import { join } from 'node:path'
export default async function (t) {
  await t.test('model: defaults, compact, polygon mesh round trip, every shape builds', async () => {
    const s = await t.open()
    const r = await s.eval(async () => {
      const M = await import('/core/model.js')
      const n = M.normalize({ type: 'part', shape: 'sphere', color: null })
      const c = M.compact({ ...n, color: '#ff0000' })
      const cube = { verts: [-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1], faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]], uvs: null }
      const bg = M.toBufferGeometry(cube)
      const back = M.fromBufferGeometry(bg, { weld: true, quads: true })
      const shapes = M.SHAPES.map(sh => { const g = M.partGeometry(sh, [2, 2, 2]); const tris = (g.index ? g.index.count : g.attributes.position.count) / 3; g.computeBoundingBox(); const b = g.boundingBox; M.releaseGeometry(g); return [sh, tris, +(b.max.y - b.min.y).toFixed(3)] })
      const root = M.buildScene({ objects: { a: { type: 'part', shape: 'box', pos: [1, 2, 3] }, g: { type: 'group', pos: [0, 1, 0] }, b: { type: 'part', parent: 'g', pos: [0, 1, 0] } } })
      const w = []; root.traverse(o => { if (o.name === 'b') { o.updateWorldMatrix(true, false); w.push(...o.matrixWorld.elements.slice(12, 15)) } })
      return { n, c, verts: back.verts.length / 3, faces: back.faces.length, faceSizes: back.faces.map(f => f.length), shapes, w, tris: bg.index ? bg.index.count / 3 : bg.attributes.position.count / 3 }
    })
    t.eq(r.n.color, '#a3a2a5', 'null color takes the default')
    t.eq(r.n.size, [4, 1, 2], 'default part size')
    t.eq(r.c, { type: 'part', shape: 'sphere', color: '#ff0000' }, 'compact keeps only changed fields')
    t.eq(r.tris, 12, 'cube quads triangulate')
    t.eq([r.verts, r.faces], [8, 6], 'weld + quad merge rebuilds the cube')
    t.ok(r.faceSizes.every(n => n === 4), 'all faces are quads')
    for (const [sh, tris, h] of r.shapes) { t.ok(tris >= 1, sh + ' has triangles'); t.ok(sh === 'plane' ? h < 0.01 : Math.abs(h - 2) < 0.01, sh + ' height is 2, got ' + h) }
    t.near(r.w, [0, 2, 0], 1e-6, 'child world position')
  })

  await t.test('boot: every module loaded at boot is modulepreloaded, and nothing preloaded goes unused', async () => {
    const s = await t.open()
    await s.eval(() => window.studio.app.loaded || new Promise(r => setTimeout(r, 300))) // the viewport prefetch lands after ready
    const r = await s.eval(() => ({
      loaded: performance.getEntriesByType('resource').map(e => e.name).filter(n => /\.js$/.test(n)),
      pre: [...document.querySelectorAll('link[rel=modulepreload]')].map(l => l.href)
    }))
    t.eq(r.loaded.filter(u => !r.pre.includes(u)), [], 'boot modules missing from index.html modulepreload (each costs a round trip on a phone)')
    t.eq(r.pre.filter(u => !r.loaded.includes(u)), [], 'preloaded but never loaded at boot (wasted bytes)')
    // CDN libraries load as jsDelivr's .min builds; only files with relative imports stay full (a .min copy would load them twice)
    t.eq(r.loaded.filter(u => u.includes('cdn.jsdelivr.net') && !u.endsWith('.min.js') && !/\/examples\/jsm\/lines\//.test(u)), [], 'CDN modules at boot without .min')
    // own code at boot has a cap: past it, a feature loads on first use (import() inside its command) instead of at boot
    const own = r.loaded.filter(u => u.startsWith(t.ORIGIN + '/')).map(u => statSync(join(t.ROOT, new URL(u).pathname)).size)
    const kb = Math.round(own.reduce((a, b) => a + b, 0) / 1024)
    t.log('boot: own code ' + kb + ' KB in ' + own.length + ' files')
    t.ok(kb <= 800, 'own code loaded at boot ' + kb + ' KB > 800 KB cap: lazy-load a feature with import(), or raise the cap on purpose')
    s.noErrors()
  })

  await t.test('home: create, list, rename, duplicate, delete', async () => {
    const s = await t.open()
    await s.waitFor(() => document.querySelector('.home .empty'))
    const ids = await s.eval(async () => { const st = window.studio.app.store; return [await st.createProject('Castle'), await st.createProject('Rocket ship')] })
    await s.waitFor(n => document.querySelectorAll('.home .card[data-id]').length === n, 2)
    await s.eval(([a]) => window.studio.app.store.renameProject(a, 'Castle keep'), ids)
    await s.waitFor(id => document.querySelector(`.card[data-id="${id}"] .c-n`)?.textContent === 'Castle keep', ids[0])
    const dup = await s.eval(([, b]) => window.studio.app.store.duplicateProject(b), ids)
    await s.waitFor(id => document.querySelector(`.card[data-id="${id}"] .c-n`)?.textContent === 'Rocket ship copy', dup)
    t.ok(await s.eval(id => !!window.__mock.get('projects/' + id), dup), 'duplicate has its own project doc')
    await s.eval(id => window.studio.app.store.deleteProject(id), dup)
    await s.waitFor(n => document.querySelectorAll('.home .card[data-id]').length === n, 2)
    t.ok(await s.eval(id => !window.__mock.get('projects/' + id) && !window.__mock.get('meta/' + id), dup), 'delete removes project and meta docs')
    // multi-delete (owner 2026-11-26): Select, pick 2 cards, Delete 2, confirm -> both gone, the other stays, picking ends
    const extra = await s.eval(async () => { const st = window.studio.app.store; return [await st.createProject('Tmp A'), await st.createProject('Tmp B')] })
    await s.waitFor(n => document.querySelectorAll('.home .card[data-id]').length === n, 4)
    await s.page.click('.h-top .h-sel')
    for (const id of extra) await s.page.click(`.card[data-id="${id}"]`)
    t.eq(await s.eval(() => document.querySelectorAll('.card.on').length), 2, 'two cards picked')
    t.ok(await s.eval(() => location.hash === '' || location.hash === '#'), 'picking a card does not open it')
    await s.page.click('.h-top .h-del')
    await s.page.click('.dlg-a [data-a="ok"]')
    await s.waitFor(n => document.querySelectorAll('.home .card[data-id]').length === n && !document.querySelector('.h-del'), 2)
    await s.waitFor(ids => ids.every(id => !window.__mock.get('projects/' + id) && !window.__mock.get('meta/' + id)), extra)   // cards go first (meta), docs follow in parallel
    await s.waitFor(ids => ids.every(id => !window.__mock.get('trash/' + id)), extra)   // finished deletes leave no trash marker
    // a delete cut short (trash marker + leftovers) is finished by the sweep; a project with no meta and no marker is kept
    const swept = await s.eval(async () => {
      const M = window.__mock, st = window.studio.app.store
      M.external('trash/cut-0a0a', { at: 'x' }, { set: true }); M.external('projects/cut-0a0a', { name: 'Cut', objects: {} }, { set: true })
      M.external('projects/cut-0a0a/geo/g1', { p: [] }, { set: true }); M.external('projects/keep-0a0b', { name: 'Keep', objects: {} }, { set: true })
      const n = await st.sweepTrash()
      return { n, gone: !M.get('trash/cut-0a0a') && !M.get('projects/cut-0a0a') && !M.get('projects/cut-0a0a/geo/g1'), kept: !!M.get('projects/keep-0a0b') }
    })
    t.ok(swept.n === 1 && swept.gone && swept.kept, 'sweepTrash finishes cut-short deletes only ' + JSON.stringify(swept))
    // the New project button opens the name dialog; Enter creates and opens it
    await s.page.click('.h-top .h-new')
    await s.page.waitForSelector('.dialog input')
    await s.page.fill('.dialog input', 'Lighthouse')
    await s.page.keyboard.press('Enter')
    await s.waitFor(() => window.studio.app.loaded && window.studio.app.scene.name === 'Lighthouse' && !document.querySelector('.editor').hidden)
    t.ok(/^#lighthouse-[0-9a-f]{4}$/.test(await s.eval(() => location.hash)), 'project page hash')
    t.eq(await s.eval(() => Object.values(window.studio.app.scene.objects).map(o => o.name)), ['Baseplate'], 'new project starts with a baseplate')
    s.noErrors()
  })

  await t.test('edit: undo, redo, group, ungroup, duplicate, delete', async () => {
    const s = await t.open()
    await s.project('Edits', { empty: true })
    const a = await s.run('parts.box', { pos: [0, 0.5, 0] }), b = await s.run('parts.sphere', { pos: [4, 1, 0] })
    t.eq(await s.eval(() => Object.keys(window.studio.app.scene.objects).length), 2)
    await s.run('edit.undo'); t.eq(await s.eval(() => Object.keys(window.studio.app.scene.objects)), [a], 'undo removes the sphere')
    await s.run('edit.redo'); t.eq(await s.eval(() => Object.keys(window.studio.app.scene.objects).length), 2, 'redo brings it back')
    await s.run('edit.set', { ids: [a], patch: { color: '#e5484d', pos: [1, 0.5, 2] } })
    t.eq(await s.eval(id => window.studio.app.obj(id).color, a), '#e5484d')
    await s.run('edit.undo'); t.eq(await s.eval(id => [window.studio.app.obj(id).color, window.studio.app.obj(id).pos], a), ['#a3a2a5', [0, 0.5, 0]], 'undo restores colour and position together')
    const g = await s.run('edit.group', { ids: [a, b] })
    const gi = await s.eval(g => { const A = window.studio.app; return { type: A.obj(g).type, kids: A.children(g).length, sel: A.selection } }, g)
    t.eq([gi.type, gi.kids, gi.sel], ['group', 2, [g]], 'group holds both parts and is selected')
    const wa = await s.eval(id => window.studio.app.worldMatrix(id).elements.slice(12, 15), b)
    t.near(wa, [4, 1, 0], 1e-6, 'grouping keeps world position')
    await s.run('edit.ungroup', { ids: [g] })
    t.ok(await s.eval(([g, a, b]) => !window.studio.app.obj(g) && !window.studio.app.obj(a).parent && !window.studio.app.obj(b).parent, [g, a, b]), 'ungroup frees the parts')
    const d = await s.run('edit.duplicate', { ids: [a] })
    t.eq(d.length, 1); t.ok(d[0] !== a, 'duplicate has a new id')
    await s.run('edit.delete', { ids: [a, b] })
    t.eq(await s.eval(() => Object.keys(window.studio.app.scene.objects)), d, 'delete leaves only the copy')
    s.noErrors()
  })

  await t.test('AI build tab: a new AI project shows as a live tab, tap opens it', async () => {
    const s = await t.open()
    await s.project('Mine', { empty: true })
    await s.eval(at => { window.__mock.external('projects/ai-city-0a1b', { name: 'AI City', v: 1, updated: at, objects: { g1: { type: 'part', shape: 'box', pos: [0, 1, 0], size: [2, 2, 2] } } }, { set: true }); window.__mock.external('meta/ai-city-0a1b', { name: 'AI City', updated: at, count: 1, ai: true }, { set: true }) }, new Date().toISOString())
    await s.waitFor(() => !!document.querySelector('.ptab[data-id="ai-city-0a1b"] i.live'), null, 2000)
    // an AI tool that stamps `updated` as epoch milliseconds must show live too (a number once hid a whole build)
    await s.eval(at => { window.__mock.external('projects/ai-orc-0a1c', { name: 'AI Orc', v: 1, updated: at, objects: {} }, { set: true }); window.__mock.external('meta/ai-orc-0a1c', { name: 'AI Orc', updated: at, count: 0, ai: true }, { set: true }) }, Date.now())
    await s.waitFor(() => !!document.querySelector('.ptab[data-id="ai-orc-0a1c"] i.live'), null, 2000)
    t.eq(await s.eval(() => document.querySelectorAll('.ptab').length), 3, 'tab strip holds the open project and both AI projects')
    // a build that says it is building stays live between slow stages; a finished one leaves the strip at once
    await s.eval(at => window.__mock.external('meta/ai-orc-0a1c', { name: 'AI Orc', updated: at, count: 0, ai: true, building: true }, { set: true }), new Date(Date.now() - 5 * 60e3).toISOString())
    await s.waitFor(() => !!document.querySelector('.ptab[data-id="ai-orc-0a1c"] i.live'), null, 2000)
    await s.eval(at => window.__mock.external('meta/ai-orc-0a1c', { name: 'AI Orc', updated: at, count: 0, ai: true, building: false }, { set: true }), new Date().toISOString())
    await s.waitFor(() => !document.querySelector('.ptab[data-id="ai-orc-0a1c"]'), null, 2000)
    t.eq(await s.eval(() => document.querySelectorAll('.ptab').length), 2, 'finished build leaves; the open project and the live build stay')
    await s.eval(() => document.querySelector('.ptab[data-id="ai-city-0a1b"]').click())
    await s.waitFor(() => window.studio.app.projectId === 'ai-city-0a1b' && !!window.studio.app.obj('g1'), null, 3000)
    t.ok(await s.eval(() => document.querySelector('.ptab.cur')?.dataset.id === 'ai-city-0a1b'), 'opened tab is marked current')
    await s.noErrors()
  })

  await t.test('sync: outside writes show live, one write per doc in flight', async () => {
    const s = await t.open()
    const pid = await s.project('Sync', { empty: true })
    // an AI adds and recolours objects with one db update while the page is open
    const t0 = await s.eval(pid => window.__mock.external('projects/' + pid, { objects: { ai1: { type: 'part', shape: 'box', pos: [0, 2, 0], size: [2, 2, 2], color: '#3fb950' } } }), pid)
    await s.waitFor(() => window.studio.app.viewport.objects.has('ai1'), null, 1000)
    const ms = await s.eval(t0 => Date.now() - t0, t0)
    t.ok(ms < 1000, 'outside object appears within 1 s (' + ms + ' ms)')
    t.log('outside write shown in', ms, 'ms')
    await s.eval(pid => window.__mock.external('projects/' + pid, { objects: { ai1: { color: '#e5484d' } } }), pid)
    await s.waitFor(() => window.studio.app.obj('ai1')?.color === '#e5484d', null, 1000)
    await s.eval(pid => window.__mock.external('projects/' + pid, { objects: { ai1: null } }), pid)
    await s.waitFor(() => !window.studio.app.obj('ai1') && !window.studio.app.viewport.objects.has('ai1'), null, 1000)
    // rapid local edits: many changes, never two writes on one doc at once, final doc matches the page
    await s.eval(async () => { const A = window.studio.app; for (let i = 0; i < 40; i++) { const id = A.run('parts.box', { pos: [i * 2, 0.5, 0], select: false }); A.run('edit.set', { ids: [id], patch: { color: '#3d8bfd' } }); if (i % 5 === 0) await new Promise(r => setTimeout(r, 37)) } await A.store.flush() })
    const st = await s.eval(pid => ({ max: window.__mock.stats.maxInFlight, v: window.__mock.stats.violations, n: Object.values(window.__mock.get('projects/' + pid).objects).filter(Boolean).length, writes: window.__mock.stats.writes }), pid)
    t.log('writes', st.writes, 'max in flight', st.max)
    t.ok(st.max <= 1, 'one write at a time per doc, got ' + st.max + ' on ' + st.v.join(','))
    t.eq(st.n, 40, 'db holds all 40 parts')
    t.ok(st.writes < 40, 'edits are batched (' + st.writes + ' writes for 80 changes)')
    s.noErrors()
  })

  await t.test('ops queue: a queued command runs and reports back', async () => {
    const s = await t.open()
    const pid = await s.project('Ops', { empty: true })
    await s.eval(pid => window.__mock.external(`projects/${pid}/ops/op1`, { cmd: 'parts.cylinder', args: { pos: [0, 1, 0], color: '#ffa23a' }, status: 'queued' }, { set: true }), pid)
    await s.waitFor(pid => window.__mock.get(`projects/${pid}/ops/op1`)?.status === 'done', pid)
    const op = await s.eval(pid => window.__mock.get(`projects/${pid}/ops/op1`), pid)
    t.ok(typeof op.result === 'string' && op.result.length > 0, 'result is the new id, got ' + JSON.stringify(op.result))
    t.eq(await s.eval(([pid, id]) => window.__mock.get('projects/' + pid).objects[id]?.color, [pid, op.result]), '#ffa23a', 'op result is saved')
    await s.eval(pid => window.__mock.external(`projects/${pid}/ops/op2`, { cmd: 'no.such', status: 'queued' }, { set: true }), pid)
    await s.waitFor(pid => window.__mock.get(`projects/${pid}/ops/op2`)?.status === 'error', pid)
    t.ok(/no\.such/i.test(await s.eval(pid => window.__mock.get(`projects/${pid}/ops/op2`).error, pid)), 'error names the bad command')
    s.noErrors()
  })

  await t.test('offline: no runtime saves in this browser and warns', async () => {
    const s = await t.open({ claude: false })
    t.eq(await s.eval(() => window.studio.app.store.mode), 'local')
    await s.page.waitForSelector('.home .banner.warn')
    const pid = await s.project('Offline', { empty: true })
    await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.eval(() => window.studio.app.store.flush())
    await s.page.reload()
    await s.waitFor(() => window.studio?.ready)
    await s.eval(id => window.studio.open(id), pid)
    await s.waitFor(() => window.studio.app.loaded && Object.keys(window.studio.app.scene.objects).length === 1)
    s.noErrors()
  })

  // light culling: unreachable lights skipped with the very same picture; dense meshes build their BVH on the first ray that reaches them
  await t.test('light culling: unreachable lights skipped, picture identical', async () => {
    const s = await t.open()
    await s.project('Lights', { empty: true })
    const r = await s.eval(async () => {
      const A = window.studio.app, v = A.viewport, gl = v.renderer.getContext()
      const ids = []
      // two rooms 60 m apart, each with its own short-range lights; one spot aimed at the left room only
      for (const x of [-30, 30]) {
        ids.push(A.add({ type: 'part', shape: 'box', size: [12, 0.5, 12], color: '#c8c2b8', pos: [x, -0.25, 0] }))
        ids.push(A.add({ type: 'part', shape: 'box', size: [12, 6, 0.5], color: '#b9b2a6', pos: [x, 3, -6] }))
        for (const dx of [-3, 3]) A.add({ type: 'light', kind: 'point', color: x < 0 ? '#ffb070' : '#80b0ff', intensity: 3, range: 10, pos: [x + dx, 3, 0] })
      }
      A.add({ type: 'light', kind: 'spot', intensity: 20, range: 30, angle: 20, pos: [-30, 12, 6], rot: [60, 0, 0] })
      A.add({ type: 'light', kind: 'point', intensity: 1, range: 0, pos: [0, 20, 0] })            // range 0: reaches everything
      A.select([]); v.setCamera({ pos: [0, 30, 45], target: [0, 0, -2] })
      const grab = () => { v.render(); const w = v.renderer.domElement.width, h = v.renderer.domElement.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return px }
      await new Promise(r => setTimeout(r, 300))
      v.lightCull.off = true; grab(); const a = grab()
      v.lightCull.off = false; grab(); const b = grab()
      let diff = 0, lit = 0; for (let i = 0; i < a.length; i++) { if (Math.abs(a[i] - b[i]) > 1) diff++; if (a[i] > 40) lit++ }
      const masks = ids.map(id => v.objects.get(id).userData.lm)
      return { diff, lit, masks }
    })
    t.eq(r.diff, 0, 'culled render differs from the full render')
    t.ok(r.lit > 1000, 'scene renders')
    const bits = x => { let n = 0; for (let i = 0; i < 31; i++) n += (x >> i) & 1; return n }
    // 5 point lights (4 short, 1 unlimited) and 1 spot: each room skips the other room's 2 points; only the left room gets the spot
    for (const [i, m] of r.masks.entries()) {
      t.ok(m, 'mask set for part ' + i)
      t.eq(bits(m[0]), 2, `part ${i} skips the 2 far point lights`)
      t.eq(bits(m[1]), i < 2 ? 0 : 1, `part ${i} spot skipped only in the right room`)
    }
    await s.noErrors()
  })

  await t.test('dense mesh: BVH built on the first ray that reaches it, not at load', async () => {
    const s = await t.open()
    await s.project('BVH', { empty: true })
    const r = await s.eval(async () => {
      const A = window.studio.app, v = A.viewport
      const n = 70, verts = [], faces = []                       // a 70x70 quad grid: 29k corners, over the 6000 threshold
      for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) verts.push(i / n * 4 - 2, Math.sin(i * 0.3) * 0.2, j / n * 4 - 2)
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i; faces.push([a, a + n + 1, a + n + 2, a + 1]) }
      const mk = x => { const gid = A.geo.put({ verts, faces, uvs: null }); return A.add({ type: 'mesh', geo: gid, pos: [x, 0, 0] }) }
      const near = mk(-3), far = mk(30)
      await new Promise(r => setTimeout(r, 500))
      const g = id => v.objects.get(id).geometry
      const before = [!!g(near).boundsTree, !!g(far).boundsTree]
      v.setCamera({ pos: [-3, 6, 0.01], target: [-3, 0, 0] }); v.render()
      const rect = v.canvas.getBoundingClientRect()
      const hit = v.pick ? v.pick(rect.left + rect.width / 2, rect.top + rect.height / 2) : null
      return { before, after: [!!g(near).boundsTree, !!g(far).boundsTree], hit: hit?.id || null, near }
    })
    t.eq(r.before.join(), 'false,false', 'no BVH at load')
    t.eq(r.after.join(), 'true,false', 'BVH only for the mesh the ray reached')
    t.eq(r.hit, r.near, 'pick still hits the mesh')
    await s.noErrors()
  })
}
