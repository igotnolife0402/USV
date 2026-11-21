// Sculpt plugin: every brush moves vertices, smooth lowers roughness, X symmetry mirrors, undo restores,
// pointer and touch strokes in Sculpt mode (one undo step each), [ ] keys, remesh / subdivide of a part,
// measured ms per brush step on a 50k-triangle mesh, screenshots on desktop and phone.

// Add a UV sphere mesh made with app.geo.put (no mesh plugin). rings R, segments S: 2*S*(R-1) triangles.
const addSphere = (s, o = {}) => s.eval(o => {
  const A = window.studio.app, R = o.R || 32, S = o.S || 48, rad = o.rad || 2, verts = [], faces = []
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5 }
  const P = (x, y, z) => { const k = 1 + (o.noise ? rnd() * o.noise : 0); verts.push(+(x * rad * k).toFixed(5), +(y * rad * k).toFixed(5), +(z * rad * k).toFixed(5)) }
  P(0, 1, 0)
  for (let i = 1; i < R; i++) { const th = Math.PI * i / R; for (let j = 0; j < S; j++) { const ph = 2 * Math.PI * j / S; P(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)) } }
  P(0, -1, 0)
  const V = (i, j) => 1 + (i - 1) * S + (j % S), bot = 1 + (R - 1) * S
  for (let j = 0; j < S; j++) faces.push([0, V(1, j + 1), V(1, j)])
  for (let i = 1; i < R - 1; i++) for (let j = 0; j < S; j++) faces.push([V(i, j), V(i, j + 1), V(i + 1, j + 1), V(i + 1, j)])
  for (let j = 0; j < S; j++) faces.push([bot, V(R - 1, j), V(R - 1, j + 1)])
  const geo = A.geo.put({ verts, faces })
  const id = A.add({ type: 'mesh', name: o.name || 'Ball', geo, pos: o.pos || [0, 3, 0], smooth: true, color: '#bf9e80' })
  A.select([id])
  return id
}, o)
const vertsOf = (s, id) => s.eval(id => { const A = window.studio.app; return [...A.geo.peek(A.obj(id).geo).verts] }, id)
const stroke = (s, a) => s.run('sculpt.stroke', a)
// largest vertex move, and the max / min distance from the local origin
const diff = (a, b) => { let m = 0, sum = 0; for (let i = 0; i < a.length; i += 3) { const d = Math.hypot(b[i] - a[i], b[i + 1] - a[i + 1], b[i + 2] - a[i + 2]); m = Math.max(m, d); sum += d } return { max: m, sum } }
const radii = v => { let lo = 1e9, hi = 0; for (let i = 0; i < v.length; i += 3) { const r = Math.hypot(v[i], v[i + 1], v[i + 2]); lo = Math.min(lo, r); hi = Math.max(hi, r) } return [lo, hi] }
const maxY = v => { let m = -1e9; for (let i = 1; i < v.length; i += 3) m = Math.max(m, v[i]); return m }
// half-edges without a twin (0 = watertight)
const openEdges = (s, id) => s.eval(id => { const A = window.studio.app, g = A.geo.peek(A.obj(id).geo), he = new Set(); for (const f of g.faces) f.forEach((a, k) => he.add(a + ',' + f[(k + 1) % f.length])); let n = 0; for (const k of he) { const [a, b] = k.split(','); if (!he.has(b + ',' + a)) n++ } return n }, id)
const enterSculpt = async s => { await s.run('sculpt.mode'); await s.idle(); return s.eval(() => window.studio.app.mode) }
const screenOf = (s, id, p = [0, 0, 0]) => s.eval(([id, p]) => { const v = window.studio.app.viewport, V = v.camera.position.constructor, q = v.project(new V(...p).applyMatrix4(window.studio.app.worldMatrix(id))); return [q.x, q.y] }, [id, p])

export default async function (t) {
  await t.test('every brush moves vertices the right way', async () => {
    const s = await t.open()
    await s.project('Brushes', { empty: true })
    const top = [[-0.6, 5, 0], [0, 5, 0], [0.6, 5, 0]]
    const want = {
      draw: (a, b) => radii(b)[1] > radii(a)[1] + 0.01,
      clay: (a, b) => diff(a, b).sum > 0.05,
      smooth: (a, b) => diff(a, b).max > 1e-4,
      grab: (a, b) => maxY(b) > maxY(a) + 0.3,
      inflate: (a, b) => radii(b)[1] > radii(a)[1] + 0.01,
      flatten: (a, b) => maxY(b) < maxY(a) - 0.005,
      pinch: (a, b) => diff(a, b).max > 1e-3,
      crease: (a, b) => radii(b)[0] < radii(a)[0] - 0.005
    }
    const out = []
    for (const brush of Object.keys(want)) {
      const id = await addSphere(s, { name: brush, pos: [0, 3, 0], R: 24, S: 32 })
      const a = await vertsOf(s, id)
      const pts = brush === 'grab' ? [[0, 5, 0], [0, 6, 0]] : top
      const r = await stroke(s, { id, brush, points: pts, radius: 0.9, strength: 0.7, symmetry: false })
      const b = await vertsOf(s, id)
      t.eq(b.length, a.length, brush + ' keeps the vertex count')
      t.ok(r.dabs > 0, brush + ' placed dabs')
      t.ok(want[brush](a, b), brush + ' moved vertices the right way: max move ' + diff(a, b).max.toFixed(4) + ', radius ' + radii(a).map(x => x.toFixed(3)) + ' -> ' + radii(b).map(x => x.toFixed(3)))
      out.push(brush + ' ' + diff(a, b).max.toFixed(3))
      await s.eval(id => window.studio.app.remove([id]), id)
    }
    // invert (Ctrl) carves instead of raising
    const id = await addSphere(s, { name: 'carve', R: 24, S: 32 })
    const a = await vertsOf(s, id)
    await stroke(s, { id, brush: 'draw', points: top, radius: 0.9, strength: 0.7, invert: true, symmetry: false })
    const b = await vertsOf(s, id)
    t.ok(radii(b)[0] < radii(a)[0] - 0.01 && radii(b)[1] <= radii(a)[1] + 1e-3, 'inverted draw carves: ' + radii(b))
    t.log('max move per brush:', out.join(', '))
    const loose = await s.eval(() => window.studio.commands().filter(c => c.id.startsWith('sculpt.') && !c.menu && !window.studio.app.commands.get(c.id).hidden).map(c => c.id))
    t.eq(loose, [], 'every visible sculpt command is in a menu')
    const noIcon = await s.eval(() => [...window.studio.app.commands.values()].filter(c => c.id.startsWith('sculpt.') && !c.icon).map(c => c.id))
    t.eq(noIcon, [], 'every sculpt command has an icon')
    s.noErrors()
  })

  await t.test('smooth lowers roughness', async () => {
    const s = await t.open()
    await s.project('Smooth', { empty: true })
    const id = await addSphere(s, { R: 40, S: 64, noise: 0.08 })
    // mean distance of each upper vertex from its neighbours' average
    const rough = () => s.eval(id => {
      const A = window.studio.app, g = A.geo.peek(A.obj(id).geo), v = g.verts, nb = new Map()
      for (const f of g.faces) f.forEach((a, k) => { const b = f[(k + 1) % f.length]; (nb.get(a) || nb.set(a, new Set()).get(a)).add(b); (nb.get(b) || nb.set(b, new Set()).get(b)).add(a) })
      let sum = 0, n = 0
      for (const [a, set] of nb) {
        if (v[a * 3 + 1] < 1.2) continue
        let x = 0, y = 0, z = 0
        for (const b of set) { x += v[b * 3]; y += v[b * 3 + 1]; z += v[b * 3 + 2] }
        const c = set.size
        sum += Math.hypot(x / c - v[a * 3], y / c - v[a * 3 + 1], z / c - v[a * 3 + 2]); n++
      }
      return sum / n
    }, id)
    const r0 = await rough()
    const pts = []
    for (let k = 0; k < 4; k++) for (let i = -4; i <= 4; i++) pts.push([i * 0.3, 5, (k - 1.5) * 0.35])
    await stroke(s, { id, brush: 'smooth', points: pts, radius: 1.3, strength: 1, symmetry: false })
    const r1 = await rough()
    t.log('roughness', r0.toFixed(4), '->', r1.toFixed(4), '(' + Math.round((1 - r1 / r0) * 100) + '% lower)')
    t.ok(r1 < r0 * 0.7, 'smooth cuts roughness by 30%+: ' + r0.toFixed(4) + ' -> ' + r1.toFixed(4))
    s.noErrors()
  })

  await t.test('X symmetry mirrors the stroke; off leaves the other side alone', async () => {
    const s = await t.open()
    await s.project('Mirror', { empty: true })
    const run = async symmetry => {
      const id = await addSphere(s, { name: 'sym' + symmetry, R: 32, S: 48 })
      const a = await vertsOf(s, id)
      await stroke(s, { id, brush: 'draw', points: [[1.2, 4.6, -0.3], [1.2, 4.6, 0.3]], radius: 0.8, strength: 0.8, symmetry })
      const b = await vertsOf(s, id)
      await s.eval(id => window.studio.app.remove([id]), id)
      return [a, b]
    }
    const [a, b] = await run(true)
    const key = (x, y, z) => [x, y, z].map(q => Math.round(q * 1000)).join(',')
    const at = new Map()
    for (let i = 0; i < a.length; i += 3) at.set(key(a[i], a[i + 1], a[i + 2]), i)
    let pairs = 0, worst = 0, plus = 0, minus = 0
    for (let i = 0; i < a.length; i += 3) {
      if (a[i] <= 0.01) continue
      const j = at.get(key(-a[i], a[i + 1], a[i + 2]))
      if (j === undefined) continue
      const d = [b[i] - a[i], b[i + 1] - a[i + 1], b[i + 2] - a[i + 2]], e = [b[j] - a[j], b[j + 1] - a[j + 1], b[j + 2] - a[j + 2]]
      worst = Math.max(worst, Math.abs(d[0] + e[0]), Math.abs(d[1] - e[1]), Math.abs(d[2] - e[2]))
      plus += Math.hypot(...d); minus += Math.hypot(...e); pairs++
    }
    t.ok(pairs > 500, 'mirror pairs found: ' + pairs)
    t.ok(plus > 0.1 && minus > 0.1, 'both sides moved: +x ' + plus.toFixed(3) + ', -x ' + minus.toFixed(3))
    t.ok(worst < 2e-3, 'mirrored moves match within 0.002: ' + worst.toFixed(5))
    const [c, d] = await run(false)
    let other = 0, near = 0
    for (let i = 0; i < c.length; i += 3) { const m = Math.hypot(d[i] - c[i], d[i + 1] - c[i + 1], d[i + 2] - c[i + 2]); if (c[i] < -0.01) other += m; else near += m }
    t.ok(near > 0.1 && other === 0, 'symmetry off: -x side unchanged (' + other + '), +x moved ' + near.toFixed(3))
    t.log('mirror pairs', pairs, 'worst mismatch', worst.toFixed(5))
    s.noErrors()
  })

  await t.test('undo restores, redo re-applies, session follows', async () => {
    const s = await t.open()
    await s.project('Undo', { empty: true })
    const id = await addSphere(s, { R: 24, S: 32 })
    t.eq(await enterSculpt(s), 'sculpt', 'sculpt mode on')
    const a = await vertsOf(s, id)
    const g0 = await s.eval(id => window.studio.app.obj(id).geo, id)
    const u0 = await s.eval(() => window.studio.app.undoStack.length)
    await stroke(s, { id, brush: 'inflate', points: [[0, 5, 0], [0.5, 4.9, 0]], radius: 1, strength: 0.8 })
    const b = await vertsOf(s, id)
    t.ok(diff(a, b).max > 0.01, 'stroke moved vertices')
    t.eq(await s.eval(() => window.studio.app.undoStack.length), u0 + 1, 'one undo step per stroke')
    await s.eval(() => window.studio.app.undo()); await s.idle()
    t.eq(await s.eval(id => window.studio.app.obj(id).geo, id), g0, 'undo puts the old geo back')
    t.eq(await vertsOf(s, id), a, 'undo restores every vertex')
    const sp = await s.eval(() => [...window.studio.app.sculpt.session().pos])
    t.ok(diff(a, sp).max < 1e-4, 'sculpt buffers follow undo: ' + diff(a, sp).max)
    await s.eval(() => window.studio.app.redo()); await s.idle()
    t.ok(diff(b, await vertsOf(s, id)).max < 1e-6, 'redo re-applies the stroke')
    // sculpt again, leave Sculpt mode: the viewport shows core's own geometry of the newest geo
    await stroke(s, { id, brush: 'draw', points: [[0, 5, 0]], radius: 1, strength: 0.8 })
    await s.run('sculpt.mode'); await s.idle()
    const shown = await s.eval(id => { const A = window.studio.app, o = A.obj(id), g = A.geo.peek(o.geo); let m; A.viewport.objects.get(id).traverse(c => { if (!m && c.isMesh) m = c }); m.geometry.computeBoundingBox(); let hi = -1e9; for (let i = 1; i < g.verts.length; i += 3) hi = Math.max(hi, g.verts[i]); return [A.mode, !!m.geometry.userData.triFace, m.userData.geoKey === o.geo + '|' + o.smooth, Math.abs(m.geometry.boundingBox.max.y - hi) < 1e-4] }, id)
    t.eq(shown, ['build', true, true, true], 'after Sculpt mode the viewport mesh is rebuilt from the newest geo')
    s.noErrors()
  })

  await t.test('desktop: pointer stroke, ring, [ ] keys, 50k-triangle speed, make a part sculptable; screenshot', async () => {
    const s = await t.open()
    await s.project('Sculpt desk', { empty: true })
    const id = await addSphere(s, { R: 128, S: 200, rad: 3, pos: [0, 3, 0], name: 'Head' })
    const tris = await s.eval(id => { const g = window.studio.app.geo.peek(window.studio.app.obj(id).geo); return g.faces.reduce((n, f) => n + f.length - 2, 0) }, id)
    t.ok(tris >= 50000, '50k-triangle mesh: ' + tris)
    await s.run('view.frame')
    t.eq(await enterSculpt(s), 'sculpt', 'sculpt mode on')
    t.eq(await s.eval(() => window.studio.app.tool), 'sculpt-draw', 'draw brush is the tool')
    const build = await s.eval(() => window.studio.app.sculpt.stats.build)
    await s.run('sculpt.set', { radius: 60, strength: 0.6, brush: 'draw', symmetry: true })
    // long tasks; core's autosave thumbnail (viewport.snapshot) is timed separately so it is not blamed on sculpt
    await s.eval(() => {
      window.__lt = []; window.__snap = []
      const vp = window.studio.app.viewport, snap = vp.snapshot.bind(vp)
      vp.snapshot = (...a) => { const t0 = performance.now(); try { return snap(...a) } finally { window.__snap.push([t0, performance.now()]) } }
      try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]) }).observe({ entryTypes: ['longtask'] }) } catch {}
      window.studio.app.sculpt.reset()
    })
    const [cx, cy] = await screenOf(s, id)
    const u0 = await s.eval(() => window.studio.app.undoStack.length)
    const a = await vertsOf(s, id)
    const p = s.page
    await p.mouse.move(cx + 40, cy - 60); await s.idle()
    t.ok(await s.eval(() => window.studio.app.sculpt.ring()?.visible), 'brush ring shows on hover')
    await p.mouse.down()
    for (let i = 1; i <= 24; i++) await p.mouse.move(cx + 40 + i * 4, cy - 60 + Math.sin(i / 4) * 30)
    await p.mouse.up(); await s.idle()
    const st = await s.eval(() => ({ ...window.studio.app.sculpt.stats }))
    const lt = await s.eval(() => { const own = [], snap = []; for (const [t0, d] of window.__lt) (window.__snap.some(([a, b]) => t0 < b + 5 && t0 + d > a - 5) ? snap : own).push(Math.round(d)); return { own, snap } })
    const b = await vertsOf(s, id)
    t.ok(diff(a, b).max > 0.01, 'pointer stroke moved vertices: ' + diff(a, b).max.toFixed(3))
    t.eq(await s.eval(() => window.studio.app.undoStack.length), u0 + 1, 'pointer stroke is one undo step')
    const avg = st.total / st.steps
    t.log(`50k tris (${tris}): build ${st.build.toFixed(1)} ms, step avg ${avg.toFixed(2)} ms, max ${st.max.toFixed(2)} ms over ${st.steps} steps, ${st.dabs} dabs, commit ${st.commit.toFixed(1)} ms, long tasks: sculpt ${JSON.stringify(lt.own)}, core autosave thumbnail ${JSON.stringify(lt.snap)}`)
    t.eq(lt.own.filter(d => d > 50), [], 'no sculpt long task over 50 ms during the stroke')
    t.ok(avg < 16 && st.max < 50, 'brush step under 16 ms avg / 50 ms max on 50k tris: ' + avg.toFixed(2) + ' / ' + st.max.toFixed(2))
    t.ok(build > 0, 'session built in ' + build.toFixed(1) + ' ms')
    // scripted stroke speed on the same mesh, per dab
    const sr = await stroke(s, { id, brush: 'clay', points: [[-1, 5.8, 0], [0, 6, 0], [1, 5.8, 0]], radius: 0.6, strength: 0.5 })
    t.log('scripted clay stroke: ' + sr.dabs + ' dabs, ' + sr.msPerDab + ' ms per dab')
    t.ok(sr.msPerDab < 5, 'dab under 5 ms on 50k tris: ' + sr.msPerDab)
    // ctrl inverts one stroke
    const c0 = await vertsOf(s, id)
    await p.keyboard.down('Control'); await p.mouse.move(cx - 30, cy + 20); await p.mouse.down(); await p.mouse.move(cx - 10, cy + 30, { steps: 6 }); await p.mouse.up(); await p.keyboard.up('Control'); await s.idle()
    const c1 = await vertsOf(s, id)
    t.ok(radii(c1)[0] < radii(c0)[0] - 1e-3, 'Ctrl stroke carves inward: min radius ' + radii(c0)[0].toFixed(3) + ' -> ' + radii(c1)[0].toFixed(3))
    // [ ] change the radius, brush keys switch brushes
    await p.mouse.move(cx, cy)
    const r0 = await s.eval(() => window.studio.app.sculpt.cfg.radius)
    await p.keyboard.press(']'); const r1 = await s.eval(() => window.studio.app.sculpt.cfg.radius)
    await p.keyboard.press('['); await p.keyboard.press('['); const r2 = await s.eval(() => window.studio.app.sculpt.cfg.radius)
    t.ok(r1 > r0 && r2 < r1, '[ ] resize the brush: ' + [r0, r1, r2].map(Math.round))
    await p.keyboard.press('S')
    t.eq(await s.eval(() => [window.studio.app.sculpt.cfg.brush, window.studio.app.tool]), ['smooth', 'sculpt-smooth'], 'S picks Smooth')
    await p.keyboard.press('X')
    t.eq(await s.eval(() => window.studio.app.sculpt.cfg.brush), 'draw', 'X picks Draw')
    // panel: brush grid and sliders
    const pan = await s.eval(() => { const e = document.querySelector('[data-panel=sculpt]'); return e ? [e.querySelectorAll('.sculpt-b').length, e.querySelectorAll('input[type=range]').length, e.querySelector('.sculpt-b.on')?.dataset.brush] : null })
    t.eq(pan, [8, 2, 'draw'], 'panel shows 8 brushes, 2 sliders, Draw on')
    await p.click('[data-panel=sculpt] .sculpt-b[data-brush=inflate]')
    t.eq(await s.eval(() => window.studio.app.tool), 'sculpt-inflate', 'panel button picks the brush')
    await p.click('[data-panel=sculpt] .sculpt-b[data-brush=draw]')
    await p.mouse.move(cx + 20, cy - 40); await s.idle()
    const lines = await s.eval(id => { let m; window.studio.app.viewport.objects.get(id).traverse(c => { if (!m && c.isMesh && !c.userData.helper) m = c }); return m.children.filter(c => c.isLineSegments2).length }, id)
    t.eq(lines, 0, 'no selection outline drawn over the mesh being sculpted')
    await s.shot('desktop-sculpt.png')
    // a box part becomes sculptable from the panel
    await s.run('sculpt.mode'); await s.idle()
    const box = await s.run('parts.box', { pos: [8, 2, 0], size: [3, 3, 3] })
    await s.eval(id => window.studio.app.select([id]), box)
    await enterSculpt(s)
    await s.run('sculpt.set', { detail: 5000 })
    await s.idle()
    await p.click('[data-panel=sculpt] .sculpt-wide')
    await s.idle()
    const bo = await s.eval(id => { const A = window.studio.app, o = A.obj(id), g = A.geo.peek(o.geo); return [o.type, g.faces.reduce((n, f) => n + f.length - 2, 0)] }, box)
    t.ok(bo[0] === 'mesh' && bo[1] >= 3500 && bo[1] <= 20000, 'Make sculptable turns the box into a dense mesh: ' + bo)
    t.eq(await openEdges(s, box), 0, 'remeshed box is watertight')
    s.noErrors()
  })

  await t.test('remesh and subdivide: cube to sculptable, watertight, counts', async () => {
    const s = await t.open()
    await s.project('Topo', { empty: true })
    const a = await s.run('parts.box', { pos: [0, 2, 0], size: [2, 2, 2] })
    const r = await s.run('sculpt.subdivide', { ids: [a], levels: 2 })
    t.eq([r.tris, await openEdges(s, a)], [192, 0], 'box subdivided twice: 96 quads, watertight')
    const b = await s.run('parts.box', { pos: [5, 2, 0], size: [2, 2, 2] })
    const m = await s.run('sculpt.remesh', { ids: [b], tris: 20000 })
    t.ok(m.tris >= 20000 / 2.5 && m.tris <= 20000 * 2.5, 'remesh asked for 20k tris lands within 2.5x (edge splits come in 4x steps): ' + m.tris)
    t.eq(await openEdges(s, b), 0, 'remeshed box is watertight')
    const v0 = await vertsOf(s, b)
    await stroke(s, { id: b, brush: 'draw', points: [[5, 3, 0]], radius: 0.6, strength: 1 })
    t.ok(diff(v0, await vertsOf(s, b)).max > 0.01, 'remeshed cube takes a sculpt stroke')
    const c = await addSphere(s, { pos: [-5, 2, 0], R: 8, S: 12, rad: 1 })
    const sm = await s.run('sculpt.subdivide', { ids: [c], smooth: true })
    t.eq([sm.tris, await openEdges(s, c)], [24 * 6 + 72 * 8, 0], 'smooth subdivide of a sphere: each tri -> 3 quads, each quad -> 4, watertight')
    s.noErrors()
  })

  await t.test('phone: touch stroke sculpts, 44 px brush buttons; screenshot', async () => {
    const s = await t.open({ device: 'phone' })
    await s.project('Sculpt phone', { empty: true })
    const id = await addSphere(s, { R: 64, S: 96, rad: 2.5, pos: [0, 2.5, 0] })
    await s.run('view.frame')
    t.eq(await enterSculpt(s), 'sculpt', 'sculpt mode on')
    await s.run('sculpt.set', { radius: 40, strength: 0.7, brush: 'draw' })
    await s.idle()
    const [cx, cy] = await screenOf(s, id)
    const a = await vertsOf(s, id)
    const cdp = await s.page.context().newCDPSession(s.page)
    const tp = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(cx - 30, cy - 30) })
    for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(cx - 30 + i * 5, cy - 30 + i * 2) })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await s.idle()
    const b = await vertsOf(s, id)
    t.ok(diff(a, b).max > 0.01, 'one-finger touch stroke sculpts: ' + diff(a, b).max.toFixed(3))
    const sw = await s.eval(() => document.documentElement.scrollWidth <= innerWidth)
    t.ok(sw, 'no sideways scroll')
    await s.page.tap('.mobilebar [data-act=panels]').catch(() => {})
    await s.waitFor(() => document.querySelector('.sidebar.open')).catch(() => {})
    await s.page.tap('.side-tabs [data-tab=props]').catch(() => {})
    await s.eval(() => new Promise(r => setTimeout(r, 350)))
    const small = await s.eval(() => [...document.querySelectorAll('[data-panel=sculpt] button, [data-panel=sculpt] select')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return [b.className, Math.round(r.width), Math.round(r.height)] }).filter(([, w, h]) => w < 44 || h < 44))
    const shown = await s.eval(() => !!document.querySelector('.sidebar.open [data-panel=sculpt] .sculpt-b'))
    t.ok(shown, 'sculpt panel opens in the phone sheet')
    t.eq(small, [], 'sculpt buttons are 44 px+ on phone')
    await s.shot('phone-sculpt.png')
    s.noErrors()
  })

  await t.test('autosave thumbnail on 50k tris: async read blocks under 20 ms and matches the sync picture', async () => {
    const s = await t.open()
    await s.project('Thumb speed', { empty: true })
    await addSphere(s, { R: 128, S: 200, rad: 3, pos: [0, 3, 0], name: 'Head' })
    await s.run('view.frame'); await s.idle()
    const r = await s.eval(async () => {
      const vp = window.studio.app.viewport, ms = []
      const px = u => new Promise(res => { const im = new Image(); im.onload = () => { const k = document.createElement('canvas'); k.width = 320; k.height = 200; const x = k.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); res([60, 100, 160, 220, 260].map(X => [...x.getImageData(X, 100, 1, 1).data].slice(0, 3))) }; im.src = u })
      let au = null
      for (let i = 0; i < 3; i++) { const t0 = performance.now(), p = vp.snapshot({ w: 320, h: 200, type: 'image/png', async: true }); ms.push(Math.round(performance.now() - t0)); au = await p }
      const su = vp.snapshot({ w: 320, h: 200, type: 'image/png' })
      const a = await px(au), b = await px(su)
      return { ms, diff: Math.max(...a.flatMap((c, i) => c.map((v, j) => Math.abs(v - b[i][j])))), lit: b.some(c => c[0] + c[1] + c[2] > 200) }
    })
    t.log('async thumbnail main-thread ms: ' + JSON.stringify(r.ms) + ', max channel diff vs sync ' + r.diff)
    // offscreen target + async read: about 1 ms; resizing the canvas instead waited 65-250 ms for the GPU
    t.ok(Math.max(...r.ms) < 20, 'async snapshot blocks under 20 ms: ' + JSON.stringify(r.ms))
    t.ok(r.lit && r.diff <= 3, 'async picture matches the sync one (diff ' + r.diff + ')')
    s.noErrors()
  })
}
