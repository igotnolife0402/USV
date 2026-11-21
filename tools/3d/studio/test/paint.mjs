// Paint plugin: paint on the 3D surface, one undo step per stroke, fill / eyedropper / eraser / mirror / pressure, auto UVs, panel.
// screen point on the object's face that looks at the camera (local z side), at (u, v) in -1..1 of its box
const face = ([id, u, v]) => { const A = window.studio.app, m = A.viewport.objects.get(id), g = m.geometry; g.computeBoundingBox(); const b = g.boundingBox, c = m.worldToLocal(A.viewport.camera.position.clone()), P = b.min.clone().lerp(b.max, 0.5); P.x += u * (b.max.x - b.min.x) / 2; P.y += v * (b.max.y - b.min.y) / 2; P.z = c.z > 0 ? b.max.z : b.min.z; const p = A.viewport.project(m.localToWorld(P)); return [p.x, p.y] }
// pixels of the object's texture near rgb (tol per channel); with neg: pixels NOT near it
const count = ([id, rgb, tol = 40, neg = false]) => { const c = window.studio.app.viewport.objects.get(id).material.map?.image; if (!c?.getContext) return -1; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if ((Math.abs(d[i] - rgb[0]) < tol && Math.abs(d[i + 1] - rgb[1]) < tol && Math.abs(d[i + 2] - rgb[2]) < tol) !== neg) n++; return n }
// colour-matching pixels inside each box face's spot of the paint canvas (by the face's direction), from the part's uv1 layout
const perFace = ([id, rgb, tol = 40]) => {
  const m = window.studio.app.viewport.objects.get(id), g = m.geometry, map = m.material.map, c = map.image, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv1
  if (!U || !c?.getContext) return null
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, q = map.offset.clone(), R = {}
  map.updateMatrix()
  for (let i = 0; i < P.count; i++) {
    const n = [N.getX(i), N.getY(i), N.getZ(i)], k = n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs))), key = (n[k] > 0 ? '+' : '-') + 'xyz'[k]
    q.set(U.getX(i), U.getY(i)); map.transformUv(q)
    const r = R[key] ||= [1e9, 1e9, -1e9, -1e9], x = q.x * c.width, y = q.y * c.height
    r[0] = Math.min(r[0], x); r[1] = Math.min(r[1], y); r[2] = Math.max(r[2], x); r[3] = Math.max(r[3], y)
  }
  const out = { channel: map.channel }
  for (const [key, [x0, y0, x1, y1]] of Object.entries(R)) {
    let n = 0
    for (let y = Math.ceil(y0) + 2; y < y1 - 2; y++) for (let x = Math.ceil(x0) + 2; x < x1 - 2; x++) { const j = (y * c.width + x) * 4; if (Math.abs(d[j] - rgb[0]) < tol && Math.abs(d[j + 1] - rgb[1]) < tol && Math.abs(d[j + 2] - rgb[2]) < tol) n++ }
    out[key] = n
  }
  return out
}
const def = id => { const A = window.studio.app, o = A.obj(id); return o.texture ? { ...A.scene.textures[o.texture], id: o.texture, color: o.color } : { id: null, color: o.color } }
async function setup(t, opts = {}) {
  const s = await t.open(opts)
  await s.project('Paint', { empty: true })
  const id = await s.run('parts.box', { pos: [0, 2, 0], size: [6, 4, 6] })
  await s.eval(() => { const v = window.studio.app.viewport; v.setCamera({ pos: [3, 5, 14], target: [0, 2, 0] }); v.requestRender() })
  await s.run('paint.mode')
  await s.run('paint.settings', { color: '#e8443a', size: 18, opacity: 1, hardness: 0.8, spacing: 0.15, mirror: false, pressure: true })
  await s.idle()
  return { s, id }
}
export default async function (t) {
  await t.test('mouse stroke paints the surface, each stroke is one undo step, saves webp', async () => {
    const { s, id } = await setup(t)
    t.eq(await s.eval(() => [window.studio.app.mode, window.studio.app.tool]), ['paint', 'paint.brush'], 'paint mode starts with the brush')
    const p = s.page, line = async (u0, v0, u1, v1) => {
      const a = await s.eval(face, [id, u0, v0]), b = await s.eval(face, [id, u1, v1])
      await p.mouse.move(a[0], a[1]); await p.mouse.down()
      for (let i = 1; i <= 16; i++) await p.mouse.move(a[0] + (b[0] - a[0]) * i / 16, a[1] + (b[1] - a[1]) * i / 16)
      await p.mouse.up()
    }
    const u0 = await s.eval(() => window.studio.app.undoStack.length)
    await line(-0.6, 0.3, 0.6, 0.3)
    await s.waitFor(id => { const A = window.studio.app, d = A.scene.textures[A.obj(id).texture]; return d?.paint && d.rev === 2 && !A.tx }, id)
    await s.idle()
    const d1 = await s.eval(def, id)
    t.eq([d1.kind, d1.paint, d1.res, d1.rev, d1.color, d1.base], ['image', true, 1024, 2, '#ffffff', '#a3a2a5'], 'paint texture made at 1024 px, base colour kept')
    const red1 = await s.eval(count, [id, [232, 68, 58]])
    t.ok(red1 > 1500, 'stroke changed pixels: ' + red1)
    const faces = await s.eval(perFace, [id, [232, 68, 58]])
    t.log('red per face', JSON.stringify(faces))
    t.ok(faces && faces['+z'] > 1000 && Object.entries(faces).every(([k, n]) => k === '+z' || k === 'channel' || n === 0) && faces.channel === 1, 'the stroke lands only on the face it was drawn on: ' + JSON.stringify(faces))
    t.eq(await s.eval(() => window.studio.app.undoStack.length) - u0, 1, 'first stroke is one undo step')
    await s.run('paint.settings', { color: '#3050e0' })
    await line(-0.5, -0.4, 0.5, -0.4)
    await s.waitFor(id => { const A = window.studio.app; return A.scene.textures[A.obj(id).texture]?.rev === 3 && !A.tx }, id)
    await s.idle()
    const blue = await s.eval(count, [id, [48, 80, 224]])
    t.ok(blue > 1500, 'second stroke: ' + blue)
    t.eq(await s.eval(() => window.studio.app.undoStack.length) - u0, 2, 'second stroke is one more undo step')
    await s.run('paint.save')
    t.eq(await s.eval(id => { const A = window.studio.app; return A.tex.peek(A.scene.textures[A.obj(id).texture].src)?.data?.slice(0, 22) }, id), 'data:image/webp;base64', 'saved to the tex store as webp')
    await s.run('edit.undo'); await s.idle()
    t.eq([await s.eval(count, [id, [48, 80, 224]]), await s.eval(count, [id, [232, 68, 58]])], [0, red1], 'undo removes only the last stroke')
    await s.run('edit.undo'); await s.idle()
    t.eq(await s.eval(def, id), { id: null, color: '#a3a2a5' }, 'undo the first stroke removes the paint texture')
    await s.run('edit.redo'); await s.run('edit.redo'); await s.idle()
    await s.waitFor(([id, n]) => { const c = window.studio.app.viewport.objects.get(id).material.map?.image; return c?.getContext && c.getContext('2d').getImageData(0, 0, c.width, c.height).data.length && true }, [id, 0])
    t.ok(await s.eval(count, [id, [48, 80, 224]]) > 1500, 'redo brings the strokes back')
    s.noErrors()
  })

  await t.test('fill, eyedropper, eraser, mirror X and pen pressure', async () => {
    const { s, id } = await setup(t)
    const at = (u, v) => s.eval(face, [id, u, v])
    const [x, y] = await at(0, 0)
    await s.run('paint.stroke', { tool: 'fill', color: '#20c040', points: [[x, y]] })
    const N = (await s.eval(def, id)).res, green = await s.eval(count, [id, [32, 192, 64], 8])
    t.ok(green > 0.95 * N * N, 'fill bucket floods the plain canvas: ' + green + ' / ' + N * N)
    t.eq(await s.run('paint.stroke', { tool: 'picker', points: [[x, y]] }), '#20c040', 'eyedropper reads the painted colour')
    t.eq((await s.run('paint.settings')).color, '#20c040', 'eyedropper sets the brush colour')
    const changed = () => s.eval(count, [id, [32, 192, 64], 40, true])
    const a = await at(-0.5, 0.5), b = await at(0.5, 0.5)
    await s.run('paint.stroke', { tool: 'eraser', size: 24, points: [a, [(a[0] + b[0]) / 2, a[1]], b] })
    const grey = await s.eval(count, [id, [163, 162, 165], 12])
    t.ok(grey > 1500, 'eraser shows the base colour again: ' + grey)
    const c0 = await changed(), p1 = await at(-0.5, -0.5)
    await s.run('paint.stroke', { color: '#ff00ff', size: 30, points: [[p1[0], p1[1], 0.1]] })
    const c1 = await changed(), p2 = await at(0.5, -0.5)
    await s.run('paint.stroke', { color: '#ff00ff', size: 30, points: [[p2[0], p2[1], 1]] })
    const c2 = await changed()
    t.log('light pen', c1 - c0, 'full pen', c2 - c1)
    t.ok(c2 - c1 > 3 * (c1 - c0) && c1 > c0, 'harder pen press paints a bigger dab')
    const p3 = await at(0.45, -0.05)
    await s.run('paint.stroke', { color: '#ffff00', size: 20, mirror: false, points: [p3] })
    const single = await s.eval(count, [id, [255, 255, 0]])
    await s.run('edit.undo'); await s.idle()
    t.eq(await s.eval(count, [id, [255, 255, 0]]), 0, 'undo the dab')
    await s.run('paint.stroke', { color: '#ffff00', size: 20, mirror: true, points: [p3] })
    const both = await s.eval(count, [id, [255, 255, 0]])
    t.log('single', single, 'mirrored', both)
    t.ok(both > 1.7 * single && single > 100, 'mirror X paints the other side too')
    s.noErrors()
  })

  await t.test('painting a brick part keeps the bricks on every face', async () => {
    const { s, id } = await setup(t)
    await s.run('paint.mode')
    await s.run('texture.procedural', { ids: [id], pattern: 'bricks' })
    await s.run('paint.mode')
    const [x, y] = await s.eval(face, [id, 0, 0])
    await s.run('paint.stroke', { points: [[x - 40, y], [x, y], [x + 40, y]] })
    await s.waitFor(id => { const A = window.studio.app, d = A.scene.textures[A.obj(id).texture]; return d?.paint && d.rev >= 2 && !A.tx }, id)
    // every face's spot holds both light mortar and red-brown brick pixels, not a flat fill
    const mortar = await s.eval(perFace, [id, [197, 190, 180], 30]), brick = await s.eval(perFace, [id, [136, 70, 38], 30])
    t.log('mortar', JSON.stringify(mortar), 'brick', JSON.stringify(brick))
    t.ok(['+x', '-x', '+y', '-y', '+z', '-z'].every(k => mortar[k] > 200 && brick[k] > 1000), 'bricks baked on all 6 faces')
    s.noErrors()
  })

  await t.test('a painted part turned into a mesh keeps its paint in place, smooth across uv seams', async () => {
    const { s, id } = await setup(t)
    const ball = await s.run('parts.sphere', { pos: [9, 2, 0], size: [4, 4, 4] })
    await s.eval(() => { const v = window.studio.app.viewport; v.setCamera({ pos: [5, 5, 18], target: [4, 2, 0] }); v.requestRender() }); await s.idle()
    for (const o of [id, ball]) {
      const [x, y] = await s.eval(face, [o, 0, 0])
      await s.run('paint.stroke', { points: [[x - 25, y], [x, y], [x + 25, y]] })
      await s.waitFor(o => { const A = window.studio.app, d = A.scene.textures[A.obj(o).texture]; return d?.paint && d.uv1 && d.rev >= 2 && !A.tx }, o)
    }
    // rendered colour at the stroke and at an unpainted spot, read from a full-size snapshot
    const look = ([o, spots]) => new Promise(res => {
      const A = window.studio.app, v = A.viewport, cv = v.renderer.domElement, r = cv.getBoundingClientRect(), im = new Image()
      im.onload = () => { const c = document.createElement('canvas'); c.width = r.width; c.height = r.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); res(spots.map(([sx, sy]) => [...x.getImageData(Math.round(sx - r.left), Math.round(sy - r.top), 1, 1).data.slice(0, 3)])) }
      im.src = v.snapshot({ w: r.width, h: r.height, type: 'image/png' })
    })
    const spots = [await s.eval(face, [id, 0, 0]), await s.eval(face, [id, 0.6, 0.6]), await s.eval(face, [ball, 0, 0])]
    const before = await s.eval(look, [id, spots])
    await s.run('paint.mode') // back to build mode before converting
    await s.run('parts.toMesh', { ids: [id, ball] }); await s.idle()
    await s.waitFor(([a, b]) => [a, b].every(o => window.studio.app.viewport.objects.get(o)?.material?.map?.image?.width), [id, ball])
    const after = await s.eval(look, [id, spots])
    t.log('before', JSON.stringify(before), 'after', JSON.stringify(after))
    const red = p => p[0] > 170 && p[1] < 120 && p[2] < 110
    t.ok(red(before[0]) && red(before[2]), 'stroke shows on the part and the ball')
    t.ok(red(after[0]) && red(after[2]), 'stroke still shows on both meshes')
    t.ok(!red(after[1]) && after[1].every((c, k) => Math.abs(c - before[1][k]) < 24), 'unpainted spot unchanged: ' + after[1])
    const info = await s.eval(ids => ids.map(o => { const A = window.studio.app, ob = A.obj(o), g = A.geo.peek(ob.geo), t = A.scene.textures[ob.texture]; return [ob.type, !!t?.paint, !!t?.uv1, g.uvs?.length / 2 === g.verts.length / 3] }), [id, ball])
    t.eq(info, [['mesh', true, false, true], ['mesh', true, false, true]], 'meshes keep the paint texture on their own uvs')
    // smooth ball: verts split on uv seams share one normal
    const crease = await s.eval(o => { const g = window.studio.app.viewport.objects.get(o).geometry, P = g.attributes.position, N = g.attributes.normal, m = new Map(); let worst = 0; for (let i = 0; i < P.count; i++) { const k = [P.getX(i), P.getY(i), P.getZ(i)].map(v => Math.round(v * 1e4)).join(), n = [N.getX(i), N.getY(i), N.getZ(i)], q = m.get(k); if (q) worst = Math.max(worst, Math.hypot(q[0] - n[0], q[1] - n[1], q[2] - n[2])); else m.set(k, n) } return worst }, ball)
    t.ok(crease < 1e-3, 'no crease along uv seams: ' + crease)
    await s.run('edit.undo'); await s.idle()
    t.eq(await s.eval(ids => ids.map(o => { const A = window.studio.app; return [A.obj(o).type, !!A.scene.textures[A.obj(o).texture]?.uv1] }), [id, ball]), [['part', true], ['part', true]], 'undo gives back the painted parts')
    s.noErrors()
  })

  await t.test('mesh without UVs gets auto UVs before painting', async () => {
    const { s, id } = await setup(t)
    await s.run('parts.toMesh', { ids: [id] })
    await s.eval(id => { const A = window.studio.app, g = A.geo.peek(A.obj(id).geo), n = { ...g }; delete n.uvs; A.set(id, { geo: A.geo.put(n) }) }, id)
    await s.idle()
    t.eq(await s.eval(id => { const A = window.studio.app; return [A.obj(id).type, !!A.geo.peek(A.obj(id).geo).uvs] }, id), ['mesh', false], 'mesh has no UVs')
    const [x, y] = await s.eval(face, [id, 0, 0])
    await s.run('paint.stroke', { points: [[x - 30, y], [x + 30, y]] })
    await s.idle()
    const r = await s.eval(id => { const A = window.studio.app, g = A.geo.peek(A.obj(id).geo); return [g.uvs?.length / 2 === g.verts.length / 3, !!A.scene.textures[A.obj(id).texture]?.paint] }, id)
    t.eq(r, [true, true], 'auto UVs written and painted')
    t.ok(await s.eval(count, [id, [232, 68, 58]]) > 300, 'mesh got paint')
    s.noErrors()
  })

  for (const device of ['desktop', 'phone']) await t.test('paint panel and keys on ' + device, async () => {
    const { s, id } = await setup(t, { device })
    const p = s.page, [x, y] = await s.eval(face, [id, 0, 0.2])
    if (device === 'phone') await p.touchscreen.tap(x, y)
    else { await p.mouse.move(x - 80, y); await p.mouse.down(); for (let i = 1; i <= 16; i++) await p.mouse.move(x - 80 + i * 10, y + 20 * Math.sin(i / 3)); await p.mouse.up() }
    await s.waitFor(id => { const A = window.studio.app; return A.scene.textures[A.obj(id).texture]?.rev >= 2 && !A.tx }, id)
    await s.idle()
    t.eq((await s.eval(def, id)).res, device === 'phone' ? 512 : 1024, 'canvas size for ' + device)
    t.ok(await s.eval(count, [id, [232, 68, 58]]) > (device === 'phone' ? 30 : 1000), device === 'phone' ? 'tap paints a dab' : 'drag paints')
    if (device === 'desktop') {
      await p.mouse.move(x, y + 30)
      await p.keyboard.press('e'); t.eq(await s.eval(() => window.studio.app.tool), 'paint.eraser', 'E picks the eraser in paint mode')
      await p.keyboard.press('b'); t.eq(await s.eval(() => window.studio.app.tool), 'paint.brush', 'B picks the brush')
      await p.keyboard.press(']'); t.eq((await s.run('paint.settings')).size, 23, '] makes the brush bigger')
    }
    if (device === 'phone') { await p.tap('.mobilebar [data-act=panels]'); await s.waitFor(() => document.querySelector('.sidebar.open')); await p.tap('.side-tabs [data-tab=props]'); await s.eval(() => new Promise(r => setTimeout(r, 350))) }
    const sec = p.locator('section.sec', { has: p.locator('button[data-tool="eraser"]') })
    t.eq(await sec.count(), 1, 'paint panel shows')
    t.eq(await sec.locator('button.primary').getAttribute('data-tool'), 'brush', 'active tool marked')
    const small = await sec.evaluate((e, min) => [...e.querySelectorAll('button, .inp, select, input')].filter(b => b.offsetParent && b.type !== 'range' && b.type !== 'color').map(b => b.getBoundingClientRect()).filter(r => r.height < min).map(r => Math.round(r.height)).join(), device === 'phone' ? 44 : 28)
    t.eq(small, '', 'all paint controls are tap size')
    await sec.locator('button[data-tool="fill"]').click()
    t.eq(await s.eval(() => window.studio.app.tool), 'paint.fill', 'panel button switches tool')
    await sec.locator('button[data-tool="brush"]').click()
    await s.shot(device + '-paint.png')
    t.ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'no sideways scroll')
    await s.run('paint.mode'); await s.idle()
    t.eq(await s.eval(() => window.studio.app.mode), 'build', 'leave paint mode')
    s.noErrors()
  })
}
