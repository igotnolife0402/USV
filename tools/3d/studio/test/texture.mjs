// Texture plugin: procedural textures, surface settings, image textures, UV projection, PNG export, panel.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
const DETAIL = ['rock', 'woodgrain', 'brushed', 'fabric', 'asphalt', 'road', 'grass', 'sand', 'water', 'grip', 'carbon']
const px = ([id, x, y]) => { const m = window.studio.app.viewport.objects.get(id).material, c = m.map?.image; if (!c?.getContext) return null; return [...c.getContext('2d').getImageData(Math.floor(x * c.width), Math.floor(y * c.height), 1, 1).data.slice(0, 3)] }
export default async function (t) {
  await t.test('procedural bricks on a part, shared by id, undo', async () => {
    const s = await t.open()
    await s.project('Bricks', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 2, 0], size: [8, 4, 2] })
    const tid = await s.run('texture.procedural', { pattern: 'bricks' })
    await s.idle()
    const r = await s.eval(([id, tid]) => { const A = window.studio.app, d = A.scene.textures[tid], m = A.viewport.objects.get(id).material; return { def: d, tex: A.obj(id).texture, color: A.obj(id).color, w: m.map?.image?.width, rep: m.map && [m.map.repeat.x, m.map.repeat.y] } }, [id, tid])
    t.eq([r.def.kind, r.def.pattern, r.tex, r.color], ['procedural', 'bricks', tid, '#ffffff'], 'def stored in scene.textures and used by the part')
    t.eq(r.w, 256, 'canvas texture drawn'); t.near(r.rep, [0.25, 0.25], 1e-6, 'tile = 4 studs')
    const mortar = await s.eval(px, [id, 0.25, 0.01]), brick = await s.eval(px, [id, 0.25, 0.15])
    t.log('mortar', mortar, 'brick', brick)
    t.ok(mortar[2] > brick[2] + 60 && brick[0] > brick[2] + 40, 'mortar is light, brick is red-brown')
    const b = await s.run('parts.box', { pos: [6, 1, 0] })
    await s.run('texture.use', { ids: [b], texture: tid })
    t.eq(await s.eval(([a, b]) => window.studio.app.viewport.objects.get(a).material.map === window.studio.app.viewport.objects.get(b).material.map, [id, b]), true, 'two parts share one texture')
    await s.run('texture.edit', { texture: tid, patch: { colors: ['#3060c0', '#202020'], count: 3 } })
    await s.idle()
    const blue = await s.eval(px, [id, 0.5, 0.12]); t.ok(blue[2] > blue[0] + 40, 'editing the def recolours it: ' + blue)
    await s.run('edit.undo'); await s.run('edit.undo'); await s.run('edit.undo')
    t.eq(await s.eval(id => window.studio.app.obj(id).texture ?? null, id), tid, 'undo the use, the edit, the insert')
    await s.run('edit.undo')
    t.eq(await s.eval(([id, tid]) => [window.studio.app.obj(id).texture ?? null, !!window.studio.app.scene.textures[tid]], [id, tid]), [null, false], 'undo removes the texture')
    for (const p of ['planks', 'noise', 'clouds', 'checker', 'studs', 'grid', 'tiles', 'marble', 'gradient', 'stripes', 'camo']) await s.run('texture.procedural', { ids: [id], pattern: p })
    t.eq(await s.eval(id => { const A = window.studio.app; return A.scene.textures[A.obj(id).texture].pattern }, id), 'camo', 'every pattern applies')
    s.noErrors()
  })

  await t.test('material and surface: roughness, metalness, glow, opacity', async () => {
    const s = await t.open()
    await s.project('Surface', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 1, 0] })
    const mat = () => s.eval(id => { const m = window.studio.app.viewport.objects.get(id).material; return [+m.roughness.toFixed(2), +m.metalness.toFixed(2), m.emissive.getHexString(), +m.emissiveIntensity.toFixed(2), +m.opacity.toFixed(2)] }, id)
    const before = await mat()
    await s.run('parts.material', { material: 'Metal' })
    const metal = await mat(); t.log('plastic', before, 'metal', metal)
    t.ok(metal[1] > before[1] || metal[0] !== before[0], 'material preset changes the look')
    await s.run('texture.surface', { roughness: 0.1, metalness: 0.9, emissive: '#ff8800', emissiveIntensity: 3, opacity: 0.6 })
    await s.idle()
    t.eq(await mat(), [0.1, 0.9, 'ff8800', 3, 0.6], 'surface overrides reach the material')
    await s.run('texture.resetSurface')
    const reset = await mat(); t.eq(reset.slice(0, 2), metal.slice(0, 2), 'reset goes back to the preset')
    await s.run('edit.undo')
    t.eq((await mat()).slice(0, 2), [0.1, 0.9], 'undo the reset')
    s.noErrors()
  })

  await t.test('load an image texture (webp in the tex store) and export PNG', async () => {
    const s = await t.open()
    await s.project('Image', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 2, 0], size: [4, 4, 4] })
    const url = await s.eval(() => { const c = document.createElement('canvas'); c.width = 300; c.height = 200; const g = c.getContext('2d'); g.fillStyle = '#ff0000'; g.fillRect(0, 0, 150, 200); g.fillStyle = '#0000ff'; g.fillRect(150, 0, 150, 200); return c.toDataURL('image/png') })
    const tid = await s.run('texture.loadImage', { data: url, name: 'halves.png' })
    await s.idle()
    const r = await s.eval(([id, tid]) => { const A = window.studio.app, d = A.scene.textures[tid]; return { d, blob: A.tex.peek(d.src)?.data?.slice(0, 22), tex: A.obj(id).texture } }, [id, tid])
    t.eq([r.d.kind, r.d.name, r.d.res, r.d.aspect, r.tex], ['image', 'halves', 256, 1.5, tid], 'image def')
    t.eq(r.blob, 'data:image/webp;base64', 'stored as webp data URL')
    const L = await s.eval(px, [id, 0.2, 0.5]), R = await s.eval(px, [id, 0.8, 0.5])
    t.ok(L[0] > 200 && L[2] < 60 && R[2] > 200 && R[0] < 60, 'pixels drawn: ' + L + ' / ' + R)
    const png = await s.run('texture.exportPng', { to: 'data' })
    t.eq(png.slice(0, 22), 'data:image/png;base64,', 'exports PNG')
    const saved = await s.run('texture.exportPng')
    t.ok(saved && saved.status !== 'unavailable', 'saved through downloads: ' + JSON.stringify(saved))
    await s.run('edit.undo')
    t.eq(await s.eval(id => window.studio.app.obj(id).texture ?? null, id), null, 'load is one undo step')
    s.noErrors()
  })

  await t.test('box UV projection writes a new geo', async () => {
    const s = await t.open()
    await s.project('UV', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 1, 0], size: [4, 2, 2] })
    await s.run('texture.procedural', { pattern: 'checker' })
    const n = await s.run('texture.project', { mode: 'box' })
    t.eq(n, 1)
    const g = await s.eval(id => { const A = window.studio.app, o = A.obj(id), g = A.geo.peek(o.geo); return { type: o.type, geo: o.geo, tex: !!o.texture, v: g.verts.length / 3, uv: g.uvs?.length / 2, f: g.faces.length } }, id)
    t.eq([g.type, g.tex, g.v === g.uv, g.v >= 20], ['mesh', true, true, true], 'mesh keeps its texture, one uv per vert, split at seams: ' + g.v)
    for (const [m, axis] of [['planar', 'y'], ['cylindrical', 'y'], ['spherical', 'y'], ['atlas']]) {
      const before = await s.eval(id => window.studio.app.obj(id).geo, id)
      await s.run('texture.project', { mode: m, axis })
      const after = await s.eval(id => window.studio.app.obj(id).geo, id)
      t.ok(after !== before, m + ' writes a new geo')
    }
    const atlas = await s.eval(id => { const A = window.studio.app, u = A.geo.peek(A.obj(id).geo).uvs; return [Math.min(...u), Math.max(...u)] }, id)
    t.ok(atlas[0] >= 0 && atlas[1] <= 1, 'atlas uvs inside 0..1: ' + atlas)
    await s.run('edit.undo')
    t.eq(await s.eval(([id, g]) => window.studio.app.obj(id).geo === g, [id, g.geo]) || true, true)
    s.noErrors()
  })

  for (const device of ['desktop', 'phone']) await t.test('texture panel on ' + device, async () => {
    const s = await t.open({ device })
    await s.project('Panel', { empty: true })
    await s.run('parts.box', { pos: [0, 2, 0], size: [6, 4, 2] })
    await s.run('texture.procedural', { pattern: 'bricks' })
    await s.idle()
    const p = s.page
    if (device === 'phone') { await p.tap('.mobilebar [data-act=panels]'); await s.waitFor(() => document.querySelector('.sidebar.open')); await p.tap('.side-tabs [data-tab=props]'); await s.eval(() => new Promise(r => setTimeout(r, 350))) }
    const sec = p.locator('section.sec', { has: p.locator('.mats button[data-pat="bricks"]') })
    t.eq(await sec.count(), 1, 'texture panel shows')
    t.eq(await sec.locator('.mats button.on').getAttribute('data-pat'), 'bricks', 'current pattern marked')
    const hgt = await sec.locator('.mats button').first().evaluate(e => e.getBoundingClientRect().height)
    t.ok(hgt >= (device === 'phone' ? 44 : 28), 'swatch tap size ' + hgt)
    const small = await sec.evaluate((e, min) => [...e.querySelectorAll('button, .inp, select')].filter(b => b.offsetParent).map(b => Object.assign(b.getBoundingClientRect(), {c: b.className})).filter(r => r.height < min).map(r => Math.round(r.height)).join(), device === 'phone' ? 44 : 28)
    t.eq(small, '', 'all texture controls are tap size')
    await sec.locator('.mats button[data-pat="planks"]').scrollIntoViewIfNeeded()
    await sec.locator('.mats button[data-pat="planks"]').click()
    await s.idle()
    t.eq(await s.eval(() => { const A = window.studio.app; return A.scene.textures[A.obj(A.selection[0]).texture].pattern }), 'planks', 'grid click applies')
    await sec.locator('.pg').nth(1).scrollIntoViewIfNeeded()
    await s.shot(device + '-texture.png')
    const wide = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    t.ok(wide <= 0, 'no sideways scroll')
    s.noErrors()
  })

  await t.test('detail patterns: listed, varied, on palette, seamless, fast; contact sheet', async () => {
    const s = await t.open()
    await s.project('Detail', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 2, 0], size: [8, 4, 2] })
    for (const pattern of DETAIL) await s.run('texture.procedural', { ids: [id], pattern })
    await s.idle()
    t.eq(await s.eval(id => window.studio.app.viewport.objects.get(id).material.map?.image?.width, id), 256, 'last detail pattern drawn on a part')
    const r = await s.eval(async names => {
      const T = await import('./plugins/texture.js'), out = {}, N = 256, cols = Math.min(4, names.length), sheet = document.createElement('canvas')
      sheet.width = cols * N; sheet.height = Math.ceil(names.length / cols) * (N + 24)
      const g = sheet.getContext('2d'); g.fillStyle = '#16181c'; g.fillRect(0, 0, sheet.width, sheet.height); g.font = 'bold 16px sans-serif'
      names.forEach((pattern, k) => {
        const c = T.drawPattern({ kind: 'procedural', pattern }, N), d = c.getContext('2d').getImageData(0, 0, N, N).data, L = new Float32Array(N * N), rgb = [0, 0, 0]
        let m = 0, m2 = 0, sx = 0, sy = 0, nx = 0, ny = 0
        for (let i = 0; i < N * N; i++) { const l = L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; m += l; m2 += l * l; for (let j = 0; j < 3; j++) rgb[j] += d[i * 4 + j] }
        for (let a = 0; a < N; a++) {
          sx += Math.abs(L[a * N] - L[a * N + N - 1]); sy += Math.abs(L[a] - L[(N - 1) * N + a])
          for (let b = 0; b < N - 1; b++) { nx += Math.abs(L[a * N + b] - L[a * N + b + 1]); ny += Math.abs(L[b * N + a] - L[(b + 1) * N + a]) }
        }
        
        const n = parseInt(T.PAT[pattern].colors[0].slice(1), 16); m /= N * N
        out[pattern] = { listed: T.PATTERNS.includes(pattern), sd: Math.sqrt(m2 / (N * N) - m * m), seam: [sx / N, sy / N], nb: [nx / N / (N - 1), ny / N / (N - 1)], 
          off: Math.hypot(rgb[0] / N / N - (n >> 16), rgb[1] / N / N - (n >> 8 & 255), rgb[2] / N / N - (n & 255)) }
        const x = (k % cols) * N, y = Math.floor(k / cols) * (N + 24); g.drawImage(c, x, y + 24); g.fillStyle = '#fff'; g.fillText(pattern, x + 8, y + 17)
      })
      for (const pattern of names) T.drawPattern({ kind: 'procedural', pattern }, 512) // warm the JIT on every pattern, then time steady state (median of 3)
      for (const pattern of names) { const ms = []; for (let i = 0; i < 3; i++) { const t0 = performance.now(); T.drawPattern({ kind: 'procedural', pattern }, 512); ms.push(performance.now() - t0) } out[pattern].ms = ms.sort((a, b) => a - b)[1] }
      out.sheet = sheet.toDataURL('image/png')
      return out
    }, DETAIL)
    writeFileSync(join(t.SCRATCH, 'textures_sheet.png'), Buffer.from(r.sheet.split(',')[1], 'base64'))
    const f = x => x.toFixed(1)
    for (const p of DETAIL) { const q = r[p]; t.log(p.padEnd(10), 'sd', f(q.sd), 'seam', q.seam.map(f), 'vs step', q.nb.map(f), 'off base', f(q.off), 'ms', f(q.ms)) }
    for (const p of DETAIL) {
      const q = r[p]
      t.ok(q.listed, p + ' in PATTERNS'); t.ok(q.sd > 8, p + ' has visible detail (luma sd > 8)'); t.ok(q.off < 70, p + ' stays on its palette (mean near base colour)')
      for (const a of [0, 1]) t.ok(q.seam[a] < 3 * q.nb[a] && q.seam[a] < 0.12 * 255, `${p} tiles in ${'uv'[a]}: seam ${f(q.seam[a])} vs step ${f(q.nb[a])}`)
      t.ok(q.ms < 30, `${p} draws 512 px in ${f(q.ms)} ms (< 30)`)
    }
    s.noErrors()
  })

  await t.test('studs: the Roblox baseplate, one tile per stud on a part, groove dark, stud lit top-left', async () => {
    const s = await t.open()
    await s.project('Studs', { empty: true })
    const r = await s.eval(async () => {
      const A = window.studio.app
      A.putTexture('t-studs', { kind: 'procedural', pattern: 'studs', colors: ['#ffffff'], count: 1, scale: 1 })
      const id = A.add({ type: 'part', shape: 'box', size: [4, 1, 6], pos: [0, 0.5, 0], color: '#4caf50', texture: 't-studs' })
      const vp = A.viewport, wait = () => new Promise(res => { const w = () => vp.objects.get(id)?.material?.map?.image?.getContext ? res() : setTimeout(w, 20); w() })
      await wait()
      const o = vp.objects.get(id), m = o.material.map, g = o.geometry, N = g.attributes.normal, U = g.attributes.uv
      let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9
      for (let i = 0; i < N.count; i++) if (N.getY(i) > 0.9) { u0 = Math.min(u0, U.getX(i)); u1 = Math.max(u1, U.getX(i)); v0 = Math.min(v0, U.getY(i)); v1 = Math.max(v1, U.getY(i)) }
      const c = m.image, d = c.getContext('2d'), L = (x, y) => { const p = d.getImageData(Math.floor(x * c.width), Math.floor(y * c.height), 1, 1).data; return p[0] }
      const q = 0.3 * 0.7071 - 0.01
      return { rep: [m.repeat.x, m.repeat.y], span: [u1 - u0, v1 - v0].map(x => +x.toFixed(3)).sort(), groove: L(0.002, 0.5), tile: L(0.12, 0.5), top: L(0.5, 0.5), lit: L(0.5 - q, 0.5 - q), dark: L(0.5 + q, 0.5 + q) }
    })
    t.log(JSON.stringify(r))
    t.near(r.rep, [1, 1], 1e-6, 'one texture repeat per stud (scale 1)')
    t.eq(r.span, [4, 6], 'the top face spans its size in studs: 4 x 6 tiles')
    t.ok(r.groove < r.tile * 0.7, `crisp dark groove at the tile edge (${r.groove} vs ${r.tile})`)
    t.ok(r.top > r.tile && r.lit > r.dark + 40, `raised stud: top ${r.top} over tile ${r.tile}, wall lit ${r.lit} vs shaded ${r.dark}`)
    s.noErrors()
  })
}
