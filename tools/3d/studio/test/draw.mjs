// Draw plugin: pen strokes on surfaces, eraser, line/rectangle/circle helpers, sketch to mesh (extrude, revolve), undo.
const sleep = ms => new Promise(r => setTimeout(r, ms))
// World points -> client pixels through the live camera.
const scr = (s, pts) => s.eval(pts => { const vp = window.studio.app.viewport, V = vp.camera.position.constructor; return pts.map(p => { const q = vp.project(new V(p[0], p[1], p[2])); return [q.x, q.y] }) }, pts)
async function drag(s, pts, steps = 6) {
  const m = s.page.mouse
  await m.move(pts[0][0], pts[0][1]); await m.down()
  for (const p of pts.slice(1)) await m.move(p[0], p[1], { steps })
  await m.up()
}
const strokes = s => s.eval(() => { const A = window.studio.app; return A.ids().filter(id => A.obj(id).type === 'stroke') })
// An object with its points in world space.
const world = (s, id) => s.eval(id => {
  const A = window.studio.app, o = A.obj(id), m = A.worldMatrix(id), V = A.viewport.camera.position.constructor
  return { ...o, world: (o.points || []).map(p => new V(p[0], p[1], p[2]).applyMatrix4(m).toArray()) }
}, id)
// Mesh stats in world space: bounds, signed volume, faces, and whether every edge joins exactly 2 faces.
const meshStats = (s, id) => s.eval(id => {
  const A = window.studio.app, o = A.obj(id), g = A.geo.peek(o.geo), m = A.worldMatrix(id).elements
  const P = []
  for (let i = 0; i < g.verts.length; i += 3) { const [x, y, z] = [g.verts[i], g.verts[i + 1], g.verts[i + 2]]; P.push([m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]) }
  const lo = [0, 1, 2].map(k => Math.min(...P.map(p => p[k]))), hi = [0, 1, 2].map(k => Math.max(...P.map(p => p[k])))
  let vol = 0; const edges = new Map()
  for (const f of g.faces) {
    for (let i = 1; i < f.length - 1; i++) { const [a, b, c] = [P[f[0]], P[f[i]], P[f[i + 1]]]; vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6 }
    for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length], k = a < b ? a + ',' + b : b + ',' + a; edges.set(k, (edges.get(k) || 0) + 1) }
  }
  return { type: o.type, faces: g.faces.length, verts: P.length, lo, hi, size: hi.map((v, k) => v - lo[k]), vol, closed: [...edges.values()].every(n => n === 2), drawn: A.viewport.objects.has(id) }
}, id)

export default async function (t) {
  await t.test('pen: drag draws a stroke on the surface under the pointer; undo, redo; eraser tap deletes it', async () => {
    const s = await t.open()
    await s.project('Pen', { empty: true })
    await s.run('parts.box', { pos: [0, 0.5, 0], size: [8, 1, 8] })
    await s.run('draw.mode')
    t.eq(await s.eval(() => [window.studio.app.mode, window.studio.app.tool]), ['draw', 'draw.pen'], 'Draw mode opens with the pen')
    await s.idle()
    await drag(s, await scr(s, [[-2, 1, 1], [-1, 1, -0.5], [0, 1, 1], [1, 1, -0.5], [2, 1, 1]]))
    const ids = await strokes(s)
    t.eq(ids.length, 1, 'one stroke')
    const o = await world(s, ids[0])
    t.log('stroke points', o.points.length, 'radius', o.radius)
    t.eq(o.type, 'stroke'); t.near(o.radius, 0.1, 1e-6, 'radius = width / 2')
    t.ok(o.points.length >= 4 && o.points.every(p => p.length === 4), 'points are [x,y,z,w]')
    t.ok(o.world.every(p => Math.abs(p[1] - 1.11) < 0.02), 'sits on the box top, lifted by its radius: y ' + o.world.map(p => p[1].toFixed(3)).slice(0, 4))
    const xs = o.world.map(p => p[0])
    t.near([Math.min(...xs), Math.max(...xs)], [-2, 2], 0.3, 'follows the pointer from x -2 to 2')
    t.ok(o.points[0][3] < 1 && o.points[Math.floor(o.points.length / 2)][3] === 1, 'tapered ends: w ' + o.points[0][3])
    await s.run('edit.undo'); t.eq((await strokes(s)).length, 0, 'undo removes it')
    await s.run('edit.redo'); t.eq((await strokes(s)).length, 1, 'redo brings it back')
    await s.eval(() => window.studio.app.setTool('draw.erase'))
    const mid = (await scr(s, [o.world[Math.floor(o.world.length / 2)]]))[0]
    await s.page.mouse.click(mid[0], mid[1])
    t.eq((await strokes(s)).length, 0, 'eraser tap deletes the stroke')
    t.eq(await s.eval(() => Object.values(window.studio.app.scene.objects).filter(o => o.type === 'part').length), 1, 'the box is not erasable')
    await s.run('edit.undo'); t.eq((await strokes(s)).length, 1, 'undo restores the erased stroke')
    s.noErrors()
  })

  await t.test('line, rectangle and circle: commands and drag tools', async () => {
    const s = await t.open()
    await s.project('Shapes', { empty: true })
    const l = await world(s, await s.run('draw.line', { from: [0, 0.2, 0], to: [3, 0.2, 0] }))
    t.near(l.world, [[0, 0.2, 0], [3, 0.2, 0]], 1e-3, 'line: exactly its 2 end points')
    const c = await world(s, await s.run('draw.circle', { center: [0, 0.2, 0], radius: 2 }))
    t.eq(c.points.length, 49, 'circle: 48 segments, closed')
    t.near(c.world[0], c.world[48], 1e-3, 'circle closes')
    t.ok(c.world.every(p => Math.abs(Math.hypot(p[0], p[2]) - 2) < 0.01 && Math.abs(p[1] - 0.2) < 1e-3), 'circle: every point 2 from the centre')
    const r = await world(s, await s.run('draw.rect', { center: [0, 0.2, 0], size: [4, 2] }))
    t.eq(r.points.length, 5, 'rectangle: 4 corners, closed')
    t.near([Math.max(...r.world.map(p => p[0])) - Math.min(...r.world.map(p => p[0])), Math.max(...r.world.map(p => p[2])) - Math.min(...r.world.map(p => p[2]))], [4, 2], 1e-3, 'rectangle 4 x 2')
    await s.run('draw.mode'); await s.idle()
    await s.eval(() => window.studio.app.setTool('draw.circle'))
    const n0 = (await strokes(s)).length
    const cp = await scr(s, [[2, 0, 2], [3.5, 0, 2]])
    t.ok(cp.every(p => p[0] > 0 && p[0] < 1440 && p[1] > 0 && p[1] < 900), 'drag points on screen')
    await drag(s, cp)
    const ids = await strokes(s)
    t.eq(ids.length, n0 + 1, 'circle tool adds a stroke')
    const ct = await world(s, ids[ids.length - 1])
    const cx = ct.world.reduce((a, p) => a + p[0], 0) / ct.world.length, cz = ct.world.reduce((a, p) => a + p[2], 0) / ct.world.length
    t.ok(ct.world.every(p => Math.abs(Math.hypot(p[0] - 2, p[2] - 2) - 1.5) < 0.05), 'circle tool: radius 1.5 around (2, 2) on the ground: centre ' + [cx, cz].map(v => v.toFixed(2)))
    t.ok(ct.world.every(p => Math.abs(p[1] - 0.11) < 0.01), 'circle tool: lifted 0.11 above the ground')
    await s.eval(() => window.studio.app.setTool('draw.line'))
    await drag(s, await scr(s, [[-3, 0, -2], [-1, 0, -2]]))
    const lt = await world(s, (await strokes(s)).pop())
    t.eq(lt.points.length, 2, 'line tool: 2 points')
    t.near(Math.hypot(lt.world[1][0] - lt.world[0][0], lt.world[1][2] - lt.world[0][2]), 2, 0.05, 'line tool: 2 long')
    await s.eval(() => window.studio.app.setTool('draw.rect'))
    await drag(s, await scr(s, [[-3, 0, 1], [-1, 0, 2]]))
    const rt = await world(s, (await strokes(s)).pop())
    t.eq(rt.points.length, 5, 'rectangle tool: 4 corners, closed')
    await s.run('edit.undo')
    t.eq((await strokes(s)).length, n0 + 2, 'undo removes the last shape')
    await s.page.mouse.move(1000, 450)
    const keys = []
    for (const k of ['l', 'm', 'o', 's', 'x', 'b']) { await s.page.keyboard.press(k); keys.push(await s.eval(() => window.studio.app.tool)) }
    t.eq(keys, ['draw.line', 'draw.rect', 'draw.circle', 'draw.sketch', 'draw.erase', 'draw.pen'], 'tool keys L M O S X B')
    t.eq((await strokes(s)).length, n0 + 2, 'tool keys add nothing')
    s.noErrors()
  })

  await t.test('sketch to mesh: extrude with bevel, revolve open and closed profiles, undo', async () => {
    const s = await t.open()
    await s.project('Mesh', { empty: true })
    const c = await s.run('draw.circle', { center: [0, 0.11, 0], radius: 1.5 })
    const m = await s.run('draw.extrude', { ids: [c], depth: 2, bevel: 0.2 })
    const e = await meshStats(s, m)
    t.log('extrude', JSON.stringify({ faces: e.faces, verts: e.verts, vol: +e.vol.toFixed(3) }))
    t.eq([e.type, e.closed], ['mesh', true], 'extrude: a closed polygon mesh')
    t.ok(e.faces >= 48 * 6, 'extrude: side, bevel and cap faces: ' + e.faces)
    t.near(e.size, [3, 2, 3], 0.05, 'extrude: 3 wide, 2 tall')
    t.near(e.lo[1], 0, 0.02, 'extrude: base on the ground under the outline')
    t.ok(e.vol > 11 && e.vol < Math.PI * 1.5 * 1.5 * 2, 'extrude: positive volume, less than the unbevelled cylinder: ' + e.vol.toFixed(2))
    t.eq(await s.eval(id => !window.studio.app.obj(id), c), true, 'outline used up')
    await s.run('edit.undo')
    t.eq(await s.eval(([c, m]) => [!!window.studio.app.obj(c), !!window.studio.app.obj(m)], [c, m]), [true, false], 'one undo brings the outline back')
    const p = await s.run('draw.stroke', { points: [[1, 0, 0], [2, 0.5, 0], [1.5, 2, 0], [1, 3, 0]], smooth: false })
    const v = await meshStats(s, await s.run('draw.revolve', { ids: [p], segments: 24 }))
    t.log('revolve open', JSON.stringify({ faces: v.faces, verts: v.verts }))
    t.eq(v.type, 'mesh'); t.ok(v.faces >= 24 * 3, 'revolve: 3 bands x 24 faces: ' + v.faces)
    t.near(v.size, [2, 3, 2], 0.05, 'revolve: profile spun round its edge: 2 wide, 3 tall')
    const q = await s.run('draw.rect', { center: [3, 1.5, 0], size: [1, 2], normal: [0, 0, 1] })
    const w = await meshStats(s, await s.run('draw.revolve', { ids: [q], segments: 32 }))
    t.log('revolve closed', JSON.stringify({ faces: w.faces, verts: w.verts, vol: +w.vol.toFixed(3) }))
    t.eq(w.closed, true, 'revolved rectangle is watertight')
    t.near(w.vol, 16 * Math.sin(Math.PI / 16) * 2, 0.05, 'revolved rectangle = a 32-sided cylinder, radius 1, height 2: ' + w.vol.toFixed(3))
    t.ok(w.drawn && v.drawn, 'meshes drawn in the viewport')
    const half = await meshStats(s, await s.run('draw.revolve', { points: [[6, 0, 0], [7, 0, 0], [7, 1, 0], [6, 1, 0], [6, 0, 0]], segments: 16, angle: 180 }))
    t.eq(half.closed, true, 'half turn gets end caps')
    t.near(half.vol, 8 * Math.sin(Math.PI / 16) * 1, 0.05, 'half turn = half a 32-sided cylinder: ' + half.vol.toFixed(3))
    s.noErrors()
  })

  await t.test('desktop: sketch an outline on the baseplate, Extrude from the floating bar; screenshot', async () => {
    const s = await t.open()
    await s.project('Sketch')
    await s.run('draw.mode'); await s.idle()
    await s.eval(() => window.studio.app.setTool('draw.sketch'))
    const loop = []
    for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; loop.push([-2 + 1.6 * Math.cos(a), 0, 1.6 * Math.sin(a)]) }
    await drag(s, await scr(s, loop), 2)
    const ids = await strokes(s)
    t.eq(ids.length, 1, 'outline drawn')
    const o = await world(s, ids[0])
    t.near(o.world[0], o.world[o.world.length - 1], 1e-3, 'outline closes itself')
    t.eq(await s.eval(id => [...window.studio.app.selection], ids[0]), ids, 'outline selected')
    const bar = await s.eval(() => { const b = document.querySelector('.draw-bar'); return b && !b.hidden ? b.getBoundingClientRect().toJSON() : null })
    t.ok(bar && bar.width > 0, 'Extrude / Revolve bar shows for a selected outline')
    await s.page.click('.draw-bar .draw-btn.pri')
    const mesh = await s.eval(() => { const A = window.studio.app; return A.ids().find(id => A.obj(id).type === 'mesh') })
    const e = await meshStats(s, mesh)
    t.eq([e.type, e.closed], ['mesh', true], 'bar Extrude makes a closed mesh')
    t.ok(e.faces > 20, 'faces: ' + e.faces)
    t.ok(await s.eval(() => document.querySelector('.draw-bar').hidden === true), 'bar hides once the outline is used up (a mesh is selected)')
    await s.eval(() => window.studio.app.setTool('draw.pen'))
    await drag(s, await scr(s, [[1, 0, 2], [2, 0, 1], [3, 0, 2], [4, 0, 1]]))
    await s.run('draw.circle', { center: [2.5, 0.11, -2.5], radius: 1.2 })
    await s.run('draw.revolve', { points: [[2.6, 0, -2.5], [3.4, 0.4, -2.5], [3.1, 1.6, -2.5], [3.5, 2.6, -2.5]], select: false, color: '#5aa9ff' })
    await s.idle(); await sleep(300)
    const ui = await s.eval(() => {
      const p = [...document.querySelectorAll('.draw-tb')].filter(b => b.offsetParent)
      return { tools: p.length, on: document.querySelector('.draw-tb.on')?.textContent, minH: Math.min(...p.map(b => b.getBoundingClientRect().height)), over: document.documentElement.scrollWidth - innerWidth }
    })
    t.log('desktop ui', JSON.stringify(ui))
    t.eq([ui.tools, ui.on], [6, 'Pen'], 'panel shows the 6 tools, Pen active')
    t.ok(ui.minH >= 28 && ui.over <= 0, 'desktop targets ≥ 28 px, no sideways scroll')
    await s.shot('desktop-draw.png')
    s.noErrors()
  })

  await t.test('phone: finger stroke, 44 px panel controls; screenshot', async () => {
    const s = await t.open({ device: 'phone' })
    await s.project('Phone')
    await s.run('draw.mode'); await s.idle()
    const pts = await scr(s, [[-2, 0, 0], [-1, 0, 1], [0, 0, 0], [1, 0, 1], [2, 0, 0]])
    const cdp = await s.ctx.newCDPSession(s.page)
    const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p[0], y: p[1], id: 1, radiusX: 4, radiusY: 4, force: 0.5 }] : [] })
    await touch('touchStart', pts[0])
    for (let i = 1; i < pts.length; i++) for (let k = 1; k <= 6; k++) { const a = pts[i - 1], b = pts[i]; await touch('touchMove', [a[0] + (b[0] - a[0]) * k / 6, a[1] + (b[1] - a[1]) * k / 6]); await sleep(8) }
    await touch('touchEnd')
    const ids = await strokes(s)
    t.eq(ids.length, 1, 'finger drag draws a stroke')
    if (ids.length) {
      const o = await world(s, ids[0])
      t.ok(o.world.every(p => Math.abs(p[1] - 0.11) < 0.03), 'on the baseplate')
    }
    await s.eval(() => window.studio.app.ui.openPanel('draw'))
    await s.idle(); await sleep(400)
    const ui = await s.eval(() => {
      const els = [...document.querySelectorAll('.draw-tb, .draw-btn, .draw-sb, .draw-sw, .draw-col, .draw-tog, .draw-num')].filter(b => b.offsetParent)
      const small = els.map(b => [b.className, Math.round(b.getBoundingClientRect().height)]).filter(([, hh]) => hh < 44)
      return { n: els.length, small: small.slice(0, 5), over: document.documentElement.scrollWidth - innerWidth }
    })
    t.log('phone ui', JSON.stringify(ui))
    t.ok(ui.n > 10, 'draw panel open on phone: ' + ui.n + ' controls')
    t.eq(ui.small, [], 'every touch target ≥ 44 px')
    t.ok(ui.over <= 0, 'no sideways scroll')
    await s.shot('phone-draw.png')
    s.noErrors()
  })
}
