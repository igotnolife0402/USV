// VFX: flipbook sheets play on the clip's timeline; dynamic resolution keeps heavy playback smooth and restores full sharpness after.
// Animate tab: a parent row sums its children's keys; effects are timeline bars; the Effects list drags onto a row.
export default async function (t) {
  await t.test('flipbook: hidden outside its window, right frame inside it, decal lies flat', async () => {
    const s = await t.open()
    await s.project('FX', { empty: true })
    const r = await s.eval(async () => {
      const A = window.studio.app
      // a 4x4 sheet: frame i is a solid colour with red = i * 16
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')
      for (let i = 0; i < 16; i++) { g.fillStyle = `rgb(${i * 16},40,200)`; g.fillRect((i % 4) * 16, Math.floor(i / 4) * 16, 16, 16) }
      const tex = A.tex.put({ kind: 'image', data: c.toDataURL('image/png') })
      const id = A.add({ type: 'flipbook', tex, grid: 4, frames: 16, life: 1, start: 1, size: 6, pos: [0, 3, 0] })
      const deco = A.add({ type: 'flipbook', tex, grid: 4, frames: 16, life: 1, start: 0, size: 6, flat: true, pos: [0, 0.1, 0] })
      const vp = A.viewport, card = () => vp.objects.get(id).userData.card
      await new Promise(res => { const w = () => card().material.map ? res() : setTimeout(w, 20); w() })
      const out = {}
      for (const tt of [0.5, 1.53, 2.5]) { A.setTime(tt); out[tt] = { on: card().visible, off: card().material.map.offset.toArray().map(v => +v.toFixed(3)) } }
      A.setTime(0.2); const d = vp.objects.get(deco).userData.card
      out.decal = { on: d.visible, normalY: +d.geometry.attributes.normal.getY(0).toFixed(2) }
      return out
    }).catch(e => ({ err: String(e) }))
    t.ok(!r.err, r.err)
    t.eq([r[0.5].on, r[1.53].on, r[2.5].on], [false, true, false], 'visible only from start to start + life')
    t.eq(r[1.53].off, [0, 0.25], 'frame 8 of 16 at 0.53 s into a 1 s life (column 0, row 2 from the top)')
    t.ok(r.decal.on && r.decal.normalY === 1, 'decal shows at 0.2 s, facing up')
    s.noErrors()
  })

  await t.test('beam: a 3D volume that keeps its direction from every view; end-on it is a disk (owner: "beam is 2d")', async () => {
    const s = await t.open()
    await s.project('Beam', { empty: true })
    const r = await s.eval(async () => {
      const A = window.studio.app, vp = A.viewport
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')
      for (let i = 0; i < 16; i++) {          // each frame: a red band across the middle, fading to clear at the top and bottom
        const x = (i % 4) * 16, y = Math.floor(i / 4) * 16, gr = g.createLinearGradient(0, y, 0, y + 16)
        gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(0.5, 'rgba(255,0,0,1)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, 16, 16)
      }
      const tex = A.tex.put({ kind: 'image', data: c.toDataURL('image/png') })
      const id = A.add({ type: 'flipbook', shape: 'beam', tex, grid: 4, frames: 16, loop: true, dur: 10, fps: 16, size: 2, length: 12, pos: [0, 3, 0] })
      A.select([]); A.setTime(1)
      const m = () => vp.objects.get(id).userData.card
      await new Promise(res => { const w = () => m().material.uniforms?.map.value ? res() : setTimeout(w, 20); w() })
      const look = (pos, target) => {
        vp.setCamera({ pos, target }); vp.renderer.render(vp.scene, vp.camera)
        const cv = vp.renderer.domElement, W = 240, H = Math.round(W * cv.height / cv.width), k = document.createElement('canvas'); k.width = W; k.height = H
        const x = k.getContext('2d'); x.drawImage(cv, 0, 0, W, H); const d = x.getImageData(0, 0, W, H).data
        const P = q => { const v = new (vp.camera.position.constructor)(...q).project(vp.camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H] }
        const p0 = P([0, 3, 0]), p1 = P([12, 3, 0])
        let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const p = (j * W + i) * 4; if (d[p] - Math.max(d[p + 1], d[p + 2]) > 80) { n++; sx += i; sy += j; sxx += i * i; syy += j * j; sxy += i * j } }
        const mx = sx / n, my = sy / n, a = sxx / n - mx * mx, b = syy / n - my * my, cc = sxy / n - mx * my
        const l1 = (a + b) / 2 + Math.sqrt(((a - b) / 2) ** 2 + cc * cc), l2 = (a + b) / 2 - Math.sqrt(((a - b) / 2) ** 2 + cc * cc)
        const deg = v => (v * 180 / Math.PI + 180) % 180
        return { n, got: +deg(0.5 * Math.atan2(2 * cc, a - b)).toFixed(1), want: +deg(Math.atan2(p1[1] - p0[1], p1[0] - p0[0])).toFixed(1), ratio: +(l1 / Math.max(l2, 1e-6)).toFixed(2), centre: [+mx.toFixed(1), +my.toFixed(1)], start: p0.map(v => +v.toFixed(1)) }
      }
      return { side: look([6, 3, 26], [6, 3, 0]), tilt: look([-5, 15, 9], [6, 3, 0]), end: look([-22, 3, 0.01], [0, 3, 0]) }
    }).catch(e => ({ err: String(e) }))
    t.ok(!r.err, r.err)
    const off = v => Math.min(Math.abs(v.got - v.want), 180 - Math.abs(v.got - v.want))
    t.ok(r.side.n > 200 && off(r.side) < 4 && r.side.ratio > 6, 'side view: a long band along the beam: ' + JSON.stringify(r.side))
    t.ok(Math.min(r.tilt.want, 180 - r.tilt.want) > 15, 'the tilted view puts the beam off the screen horizontal: ' + JSON.stringify(r.tilt))
    t.ok(r.tilt.n > 100 && off(r.tilt) < 6, 'tilted view: still along the beam, not turned to the screen: ' + JSON.stringify(r.tilt))
    t.ok(r.end.n > 50 && r.end.ratio < 1.6 && Math.hypot(r.end.centre[0] - r.end.start[0], r.end.centre[1] - r.end.start[1]) < 6, 'end-on: a round disk on the axis: ' + JSON.stringify(r.end))
    s.noErrors()
  })

  await t.test('beam edge and seams: no lit line along it; looking down it, no seam across it', async () => {
    const zlib = await import('node:zlib'), S = 1024, raw = Buffer.alloc(S * (S * 4 + 1))
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {         // 8x8 frames of 128 px: a glow band over a faint haze, brighter on top, straight alpha, colour bled everywhere
      const v = ((y % 128) + 0.5) / 128, o = y * (S * 4 + 1) + 1 + x * 4
      raw[o] = 200; raw[o + 1] = 220; raw[o + 2] = 255; raw[o + 3] = Math.round(255 * (0.06 + 0.94 * Math.exp(-(((v - 0.5) / 0.18) ** 2)) * (0.45 + 0.55 * (v < 0.25 ? 0 : v > 0.75 ? 1 : (3 - 2 * (2 * v - 0.5)) * (2 * v - 0.5) ** 2))))
    }
    const chunk = (k, d) => { const l = Buffer.alloc(4), c = Buffer.alloc(4), b = Buffer.concat([Buffer.from(k), d]); l.writeUInt32BE(d.length); c.writeUInt32BE(zlib.crc32(b)); return Buffer.concat([l, b, c]) }
    const hdr = Buffer.alloc(13); hdr.writeUInt32BE(S, 0); hdr.writeUInt32BE(S, 4); hdr[8] = 8; hdr[9] = 6
    const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
    const s = await t.open({ device: 'phone' })
    await s.project('Beam edge', { empty: true })
    const r = await s.eval(async data => {
      const A = window.studio.app, vp = A.viewport, tex = A.tex.put({ kind: 'image', data })
      const id = A.add({ type: 'flipbook', shape: 'beam', tex, grid: 8, frames: 64, loop: true, dur: 10, fps: 24, size: 3.6, length: 15, blend: 'add', pos: [0, 3, 0] })
      A.select([]); A.setTime(1); vp.grid.visible = false
      const m = vp.objects.get(id).userData.card
      await new Promise(res => { const w = () => m.material.uniforms?.map.value ? res() : setTimeout(w, 20); w() })
      vp.setCamera({ pos: [7.5, 4, 18], target: [7.5, 3, 0] })
      const grab = () => { vp.renderer.render(vp.scene, vp.camera); const c = vp.renderer.domElement, k = document.createElement('canvas'); k.width = c.width; k.height = c.height; const g = k.getContext('2d'); g.drawImage(c, 0, 0); return g.getImageData(0, 0, c.width, c.height) }
      const a = grab(); m.visible = false; const b = grab(); m.visible = true
      const W = a.width, H = a.height, P = q => { const v = new (vp.camera.position.constructor)(...q).project(vp.camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H] }
      const c = P([7.5, 3, 0]), Rpx = Math.abs(P([7.5, 4.8, 0])[1] - c[1]), x0 = P([4, 3, 0])[0], x1 = P([11, 3, 0])[0]
      let band = 0, core = 0
      for (let j = 0; j < H; j++) for (let i = Math.round(x0); i < x1; i++) {
        const p = (j * W + i) * 4, d = a.data[p + 2] - b.data[p + 2], e = Math.abs(j - c[1]) / Rpx
        if (e > 0.97 && e < 1.06 && d > 12) band++
        if (e < 0.2) core = Math.max(core, d)
      }
      vp.setCamera({ pos: [22, 5, 5], target: [0, 3, 0] })             // near the axis: the across-the-beam direction swings over the screen
      const a2 = grab(); m.visible = false; const b2 = grab(); m.visible = true
      let jump = 0
      for (let j = 1; j < H; j++) for (let i = 1; i < W; i++) {
        const p = (j * W + i) * 4, d = a2.data[p + 2] - b2.data[p + 2]
        if (d < 20) continue
        const l = a2.data[p - 2] - b2.data[p - 2], u = a2.data[p - W * 4 + 2] - b2.data[p - W * 4 + 2]
        if (l >= 20) jump = Math.max(jump, Math.abs(d - l)); if (u >= 20) jump = Math.max(jump, Math.abs(d - u))
      }
      return { band, core, jump, Rpx: Math.round(Rpx) }
    }, 'data:image/png;base64,' + png.toString('base64')).catch(e => ({ err: String(e) }))
    t.ok(!r.err, r.err)
    t.ok(r.core > 100 && r.band === 0, 'bright core, nothing lit at the edge: ' + JSON.stringify(r))
    t.ok(r.jump < 12, 'looking down the beam: smooth, no seam (a per-pixel sign flipped the sheet): ' + JSON.stringify(r))
    s.noErrors()
  })

  await t.test('dynamic resolution: slow continuous frames draw fewer pixels, full sharpness when playback stops', async () => {
    const s = await t.open({ device: 'phone' })
    await s.project('Heavy', { empty: true })
    const r = await s.eval(async () => {
      const vp = window.studio.app.viewport, full = vp.stats.dpr
      let n = 0, low = 9
      vp.loop(() => { low = Math.min(low, vp.stats.dpr || 9); const t0 = performance.now(); while (performance.now() - t0 < 40) {} return ++n < 60 })   // 40 ms frames
      await new Promise(res => { const w = () => n >= 60 ? res() : setTimeout(w, 50); w() })
      await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)))
      vp.requestRender(); await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)))
      return { full, low, after: vp.stats.dpr }
    })
    t.log(JSON.stringify(r))
    t.ok(r.low < 2, 'pixel ratio drops while frames take 40 ms: ' + r.low)
    t.eq(r.after, 2, 'full pixel ratio (2 on a phone) once nothing plays')
    s.noErrors()
  })

  await t.test('shadow stand-in: casts but is never drawn, picked or exported; the dense mesh stops casting', async () => {
    const s = await t.open()
    await s.project('Proxy', { empty: true })
    const r = await s.eval(async () => {
      const A = window.studio.app, vp = A.viewport
      vp.requestRender(); await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); const base = vp.stats.tris   // grid and helpers
      const geo = A.geo.put({ verts: [-1, 0, -1, 1, 0, -1, 1, 2, -1, -1, 2, -1, -1, 0, 1, 1, 0, 1, 1, 2, 1, -1, 2, 1], faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]], uvs: null })
      const dense = A.add({ type: 'mesh', geo, castShadow: false, pos: [0, 0, 0], color: '#cc3333' })
      const proxy = A.add({ type: 'mesh', geo, shadowOnly: true, pos: [0, 0, 0] })
      await new Promise(res => setTimeout(res, 300))
      const d = vp.objects.get(dense), p = vp.objects.get(proxy)
      const hit = vp.pick ? vp.pick(innerWidth / 2, innerHeight / 2) : null
      const rb = await A.run('roblox.rbxmx', {})
      const xml = typeof rb === 'string' ? rb : rb?.xml || ''
      return { dCast: d.castShadow, pCast: p.castShadow, pColor: p.material.colorWrite, pDepth: p.material.depthWrite, hitId: hit?.id || null, proxy, dense, tris: await (async () => { const frame = async dirty => { if (dirty) vp.shadowsDirty(); vp.requestRender(); await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); return vp.stats.tris }; await new Promise(res => setTimeout(res, 800)); await frame(false); const view = await frame(false); return [await frame(true) - base, view - base] })(),
               parts: (xml.match(/<Item class="(Part|MeshPart)"/g) || []).length }
    })
    t.log(JSON.stringify(r))
    t.eq([r.dCast, r.pCast, r.pColor, r.pDepth], [false, true, false, false], 'dense mesh casts none, stand-in casts and draws nothing')
    t.ok(r.hitId !== r.proxy, 'a click never lands on the stand-in')
    t.eq(r.tris, [24, 12], 'shadow pass draws the stand-in (12), the view draws only the dense mesh (12)')
    t.eq(r.parts, 1, 'Roblox export holds the dense mesh only')
    s.noErrors()
  })

  const sheetTex = A => {        // a 4x4 sheet: frame i is a solid colour
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')
    for (let i = 0; i < 16; i++) { g.fillStyle = `rgb(${i * 16},80,220)`; g.fillRect((i % 4) * 16, Math.floor(i / 4) * 16, 16, 16) }
    return A.tex.put({ kind: 'image', data: c.toDataURL('image/png') })
  }
  const drag = async (s, a, b) => { await s.page.mouse.move(a.x, a.y); await s.page.mouse.down(); for (let i = 1; i <= 8; i++) await s.page.mouse.move(a.x + (b.x - a.x) * i / 8, a.y + (b.y - a.y) * i / 8); await s.page.mouse.up(); await s.idle() }

  await t.test('timeline: a folded parent row shows its children\'s keys; dragging one moves the whole pose', async () => {
    const s = await t.open()
    await s.project('Rig', { empty: true })
    const ids = await s.eval(() => {
      const A = window.studio.app, g = A.add({ type: 'group', name: 'Body' }), arm = A.add({ type: 'part', name: 'Arm', parent: g, pos: [1, 1, 0] })
      A.putAnim('c1', { name: 'Clip', len: 3, fps: 30, tracks: { [arm]: { rot: [[0, [0, 0, 0], 'smooth'], [1, [0, 60, 0], 'smooth']] } } })
      A.setMode('animate'); A.select([]); return { g, arm }
    })
    await s.idle(); await new Promise(r => setTimeout(r, 300))
    const a = await s.eval(i => window.studio.app.timelineAt(1, i), ids.g), b = await s.eval(i => window.studio.app.timelineAt(1.5, i), ids.g)
    t.ok(a && b, 'the group has a row: ' + JSON.stringify(a))
    await drag(s, a, b)
    const keys = await s.eval(i => window.studio.app.scene.anims.c1.tracks[i].rot.map(k => k[0]), ids.arm)
    t.eq(keys, [0, 1.5], 'the child key moved with its parent row\'s summary key')
    s.noErrors()
  })

  await t.test('phone timeline: four rows fit under its toolbars (owner saw one)', async () => {
    const s = await t.open({ device: 'phone' })
    await s.project('Rows', { empty: true })
    const last = await s.eval(() => {
      const A = window.studio.app; let p = null, id
      for (let i = 0; i < 4; i++) { id = A.add({ type: 'part', name: 'P' + i, parent: p }); p = id }
      A.putAnim('c1', { name: 'Clip', len: 2, fps: 30, tracks: { [id]: { rot: [[0, [0, 0, 0], 'smooth'], [1, [0, 60, 0], 'smooth']] } } })
      A.setMode('animate'); A.select([]); return id
    })
    await s.idle(); await new Promise(r => setTimeout(r, 300))
    const r = await s.eval(i => { const a = window.studio.app.timelineAt(1, i), b = q => document.querySelector(q).getBoundingClientRect().bottom; return { y: a?.y, cv: b('.dock-pane:not([hidden]) canvas'), dock: b('.dock') } }, last)
    t.ok(r.cv <= r.dock + 1, 'the timeline fits its dock, nothing hidden below: ' + JSON.stringify(r))
    t.ok(r.y && r.y < r.cv - 8, 'the 4th row is on screen: ' + JSON.stringify(r))
    s.noErrors()
  })

  await t.test('effect bar: drag it to move when it plays, drag its right edge to stretch it', async () => {
    const s = await t.open()
    await s.project('FX timing', { empty: true })
    const id = await s.eval(sheetTex => {
      const A = window.studio.app, tex = (0, eval)('(' + sheetTex + ')')(A)
      A.putAnim('c1', { name: 'Clip', len: 4, fps: 30, tracks: {} })
      const f = A.add({ type: 'flipbook', name: 'Spark', tex, grid: 4, frames: 16, life: 1, start: 0.5, size: 2 }); A.setMode('animate'); return f
    }, sheetTex.toString())
    await s.idle(); await new Promise(r => setTimeout(r, 300))
    await drag(s, await s.eval(i => window.studio.app.timelineAt(1.0, i), id), await s.eval(i => window.studio.app.timelineAt(1.5, i), id))
    t.eq(await s.eval(i => window.studio.app.obj(i).start, id), 1, 'bar body: start 0.5 -> 1.0 s')
    const e = await s.eval(i => window.studio.app.timelineAt(2.0, i), id)
    await drag(s, { x: e.x - 3, y: e.y }, await s.eval(i => window.studio.app.timelineAt(2.5, i), id))
    const o = await s.eval(i => window.studio.app.obj(i), id)
    t.eq([o.start, o.life], [1, 1.5], 'right edge: plays 1.5 s, same start')
    s.noErrors()
  })

  await t.test('effects list: drag one onto a row: it plays from that time, riding that part', async () => {
    const s = await t.open()
    await s.project('FX drop', { empty: true })
    const ids = await s.eval(sheetTex => {
      const A = window.studio.app, tex = (0, eval)('(' + sheetTex + ')')(A)
      const hand = A.add({ type: 'part', name: 'Hand', pos: [2, 1, 0] })
      A.putAnim('c1', { name: 'Clip', len: 4, fps: 30, tracks: { [hand]: { pos: [[0, [2, 1, 0]], [2, [3, 1, 0]]] } } })
      A.add({ type: 'flipbook', name: 'Spark', tex, grid: 4, frames: 16, loop: true, dur: 1, fps: 16, size: 2, start: 0 }); A.setMode('animate'); A.select([])
      return { hand, tex }
    }, sheetTex.toString())
    await s.idle(); await new Promise(r => setTimeout(r, 300))
    await s.run('vfx.library')
    await s.page.waitForSelector('.vfx-it', { timeout: 3000 }); await new Promise(r => setTimeout(r, 450))      // the sheet slides in
    const it = await s.eval(() => { const r = document.querySelector('.vfx-it').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
    const n0 = await s.eval(() => Object.keys(window.studio.app.scene.objects).length)
    await drag(s, it, await s.eval(i => window.studio.app.timelineAt(2, i), ids.hand))
    const made = await s.eval(n => { const A = window.studio.app, all = Object.entries(A.scene.objects); return all.length > n ? all[all.length - 1][1] : null }, n0)
    t.ok(made && made.type === 'flipbook', 'a new effect: ' + JSON.stringify(made && { type: made.type, parent: made.parent, start: made.start }))
    t.eq([made.parent, made.start, made.tex], [ids.hand, 2, ids.tex], 'rides the Hand, plays from 2 s, same sheet')
    await new Promise(r => setTimeout(r, 250))                                                          // 160 ms close animation
    t.ok(!(await s.eval(() => document.querySelector('.vfx-sheet'))), 'the list closes after the drop')
    s.noErrors()
  })

  await t.test('effects list: hub library of hundreds loads thumbs lazily, search + kind chips filter, static symbols centre', async () => {
    const s = await t.open()
    await s.project('FX lib', { empty: true })
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64')
    let hits = 0; await s.page.route('**/_blob/**', r => { hits++; r.fulfill({ status: 200, contentType: 'image/png', body: png }) })
    await s.eval(async () => {
      const db = window.studio.app.store.db
      for (let i = 0; i < 120; i++) await db.doc('vfx/k' + String(i).padStart(3, '0')).set(i % 2 ? { name: 'Glyph ' + i, asset: 'a' + i, grid: 1, frames: 1, kind: 'symbol' } : { name: 'Burst ' + i, asset: 'a' + i, grid: 8, frames: 64, kind: 'flipbook' })
      window.studio.app.setMode('animate')
    })
    await s.run('vfx.library')
    await s.page.waitForFunction(() => document.querySelectorAll('.vfx-it').length >= 120, null, { timeout: 7000 }); await new Promise(r => setTimeout(r, 450))
    const r = await s.eval(() => { const p = [...document.querySelectorAll('.vfx-pic')]; return { n: p.length, loaded: p.filter(x => x.style.backgroundImage).length, pos: p.find(x => x.nextSibling.textContent.startsWith('Glyph') && x.style.backgroundImage)?.style.backgroundPosition } })
    t.ok(r.loaded > 0 && r.loaded < r.n / 2, `only on-screen thumbs load: ${r.loaded} of ${r.n}`)
    t.eq(r.pos, '50% 50%', 'grid 1 symbol thumb is centred, not NaN')
    t.ok(hits < 60, `sheets fetched on open: ${hits} of 120`)
    await s.eval(() => { const q = document.querySelector('.vfx-q'); q.value = 'burst 1'; q.dispatchEvent(new Event('input')) })
    t.eq(await s.eval(() => [...document.querySelectorAll('.vfx-it')].filter(x => !x.hidden).length), 15, 'search "burst 1": Burst 10-18 and 100-118, evens only')
    await s.eval(() => { const q = document.querySelector('.vfx-q'); q.value = ''; q.dispatchEvent(new Event('input')); [...document.querySelectorAll('.vfx-chip')].find(c => c.textContent === 'Symbol').click() })
    t.eq(await s.eval(() => [...document.querySelectorAll('.vfx-it')].filter(x => !x.hidden).length), 60, 'Symbol chip shows the 60 symbols')
    s.noErrors()
  })
}
