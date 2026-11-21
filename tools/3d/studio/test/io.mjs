// IO plugin: import and export round trips, downloads (zip wrapper), assets, export dialog, big-model warning.
const meshCount = ids => {
  const A = window.studio.app, all = new Set()
  for (const id of ids) { all.add(id); for (const d of A.descendants(id)) all.add(d) }
  return [...all].filter(id => ['mesh', 'part'].includes(A.obj(id)?.type)).length
}
export default async function (t) {
  await t.test('glb round trip keeps the object count', async () => {
    const s = await t.open()
    await s.project('GLB', { empty: true })
    for (const x of [-3, 0, 3]) await s.run('parts.box', { pos: [x, 0.5, 0] })
    await s.run('parts.color', { color: '#ff0000' })
    const r = await s.eval(async mc => {
      const A = window.studio.app, before = A.ids().length
      const out = await A.io.exportTo({ format: 'glb', to: 'data' })
      const magic = new TextDecoder().decode(out.data.slice(0, 4))
      const imp = await window.studio.run('io.import', { files: [new File([out.data], 'scene.glb')] })
      return { before, magic, bytes: out.bytes, meshes: (0, eval)('(' + mc + ')')(imp.ids), after: A.ids().length }
    }, meshCount.toString())
    t.eq(r.magic, 'glTF', 'binary glTF header')
    t.ok(r.bytes > 1000, 'glb has data')
    t.eq(r.meshes, 3, 'three meshes come back')
    s.noErrors()
  })

  await t.test('obj + mtl round trip through a zip, colours kept; zip import unpacks', async () => {
    const s = await t.open()
    await s.project('OBJ', { empty: true })
    await s.run('parts.box', { pos: [0, 0.5, 0] }); await s.run('parts.color', { color: '#00ff00' })
    await s.run('parts.box', { pos: [3, 0.5, 0] }); await s.run('parts.color', { color: '#0000ff' })
    const r = await s.eval(async mc => {
      const A = window.studio.app, count = (0, eval)('(' + mc + ')')
      const out = await A.io.exportTo({ format: 'obj', to: 'data' })
      const { unzipSync, zipSync, strToU8 } = await import('three/addons/libs/fflate.module.js')
      const names = Object.keys(unzipSync(out.data)).sort()
      const imp = await window.studio.run('io.import', { files: [new File([out.data], 'scene.zip')] })
      const ids = [...new Set(imp.ids.flatMap(id => [id, ...A.descendants(id)]))].filter(id => A.obj(id).type === 'mesh')
      const colors = ids.map(id => A.obj(id).color).sort()
      const stl = (await A.io.exportTo({ format: 'stl', to: 'data', text: true })).data
      const two = zipSync({ 'a/one.stl': stl, 'b/two.stl': stl, '__MACOSX/._one.stl': strToU8('junk') })
      const imp2 = await window.studio.run('io.import', { files: [new File([two], 'pair.zip')] })
      return { names, meshes: count(imp.ids), colors, zipped: imp2.count, zippedMeshes: count(imp2.ids) }
    }, meshCount.toString())
    t.ok(r.names.some(n => n.endsWith('.obj')) && r.names.some(n => n.endsWith('.mtl')), 'zip holds .obj and .mtl: ' + r.names)
    t.eq(r.meshes, 2, 'two meshes back')
    t.eq(r.colors, ['#0000ff', '#00ff00'], 'material colours from the mtl')
    t.eq(r.zipped, 2, 'two files unpacked from the zip, junk skipped')
    t.ok(r.zippedMeshes >= 2, 'zip import made meshes')
    s.noErrors()
  })

  await t.test('stl, ply, usdz, gltf and studio json exports are not empty', async () => {
    const s = await t.open()
    await s.project('Formats', { empty: true })
    await s.run('parts.box', { pos: [0, 0.5, 0] }); await s.run('parts.sphere', { pos: [3, 1, 0] })
    const r = await s.eval(async () => {
      const A = window.studio.app, o = {}
      for (const f of ['stl', 'ply', 'usdz', 'gltf', 'json']) {
        const x = await A.io.exportTo({ format: f, to: 'data' })
        o[f] = { bytes: x.bytes, head: new TextDecoder().decode(x.data.slice(0, 4)), name: x.filename }
      }
      const tri = new DataView((await A.io.exportTo({ format: 'stl', to: 'data' })).data.buffer).getUint32(80, true)
      return { o, tri }
    })
    t.ok(r.o.stl.bytes > 84 && r.tri > 12, 'binary stl with triangles: ' + r.tri)
    t.eq(r.o.ply.head, 'ply\n', 'ply header')
    t.eq(r.o.usdz.head.slice(0, 2), 'PK', 'usdz is a zip package')
    t.ok(r.o.usdz.bytes > 500 && r.o.ply.bytes > 200, 'usdz and ply have data')
    t.ok(r.o.gltf.head.startsWith('{'), 'gltf text json')
    t.ok(r.o.json.bytes > 200, 'studio json has data')
    s.noErrors()
  })

  await t.test('downloads: png saved, glb wrapped in a zip; assets return an id', async () => {
    const s = await t.open()
    await s.project('Save', { empty: true })
    await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.idle()
    const r = await s.eval(async () => {
      const A = window.studio.app
      const png = await window.studio.run('io.export', { format: 'png', to: 'download', scale: 2 })
      const glb = await window.studio.run('io.export', { format: 'glb', to: 'download' })
      const as = await window.studio.run('io.export', { format: 'stl', to: 'assets' })
      const blob = await (await fetch('/_blob/' + as.asset)).blob()
      const tr = await A.io.exportTo({ format: 'png', to: 'data', transparent: true, w: 200, h: 120 })
      const im = await createImageBitmap(new Blob([tr.data], { type: 'image/png' }))
      const c = new OffscreenCanvas(im.width, im.height).getContext('2d'); c.drawImage(im, 0, 0)
      const px = c.getImageData(0, 0, im.width, im.height).data
      let clear = 0, solid = 0
      for (let i = 3; i < px.length; i += 4) { if (px[i] === 0) clear++; else if (px[i] === 255) solid++ }
      return { png, glb, as, blobSize: blob.size, dl: window.__mock.downloads, clear, solid, size: [im.width, im.height] }
    })
    t.ok(r.dl.some(d => d.filename.endsWith('.png') && d.size > 1000), 'png in downloads: ' + JSON.stringify(r.dl))
    t.ok(r.dl.some(d => /\.zip$/.test(d.filename)) && r.glb.filename.endsWith('.zip'), 'glb went out inside a zip')
    t.ok(!r.dl.some(d => d.filename.endsWith('.glb')), 'no bare .glb download')
    t.ok(/^[0-9a-f]{32}$/.test(r.as.asset) && r.as.filename.endsWith('.stl'), 'asset id and filename')
    t.eq(r.blobSize, r.as.bytes, 'asset holds the whole file')
    t.eq(r.size, [200, 120], 'png size')
    t.ok(r.clear > 1000 && r.solid > 100, `transparent background, solid part (${r.clear} clear, ${r.solid} solid)`)
    s.noErrors()
  })

  await t.test('animated glb becomes one model object that loads', async () => {
    const s = await t.open()
    await s.project('Model', { empty: true })
    const r = await s.eval(async () => {
      const A = window.studio.app, THREE = await import('three')
      const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js')
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff8800 })); m.name = 'Spinner'
      const clip = new THREE.AnimationClip('spin', 1, [new THREE.VectorKeyframeTrack('Spinner.position', [0, 1], [0, 0, 0, 0, 2, 0])])
      const root = new THREE.Scene(); root.add(m)
      const bin = await new GLTFExporter().parseAsync(root, { binary: true, animations: [clip] })
      const imp = await window.studio.run('io.import', { files: [new File([bin], 'spinner.glb')] })
      const o = A.obj(imp.ids[0])
      await new Promise(r => setTimeout(r, 400))
      const v = A.viewport.objects.get(imp.ids[0])
      let meshes = 0; v?.traverse(c => { if (c.isMesh && !c.userData.helper) meshes++ })
      return { type: o.type, fmt: o.src?.format, inline: !!o.src?.data, clips: (v?.children.find(c => c.userData.modelContent)?.animations || []).map(c => c.name), meshes }
    })
    t.eq([r.type, r.fmt, r.inline], ['model', 'glb', true], 'model object with inline glb')
    t.ok(r.meshes >= 1, 'model drawn in the viewport')
    t.eq(r.clips, ['spin'], 'clip kept for the anim plugin')
    s.noErrors()
  })

  await t.test('image import makes a textured plane; big model asks first', async () => {
    const s = await t.open()
    await s.project('Img', { empty: true })
    const r = await s.eval(async () => {
      const A = window.studio.app, c = new OffscreenCanvas(64, 32), x = c.getContext('2d')
      x.fillStyle = '#e33'; x.fillRect(0, 0, 64, 32)
      const png = await c.convertToBlob({ type: 'image/png' })
      const imp = await window.studio.run('io.import', { files: [new File([png], 'red.png')] })
      const o = A.obj(imp.ids[0]), g = A.geo.peek(o.geo)
      return { type: o.type, tex: !!o.texture, faces: g?.faces?.length }
    })
    t.eq([r.type, r.tex], ['mesh', true], 'image plane with texture')
    t.ok(r.faces >= 1, 'plane has faces')
    const p = s.eval(async () => {
      const THREE = await import('three'), { STLExporter } = await import('three/addons/exporters/STLExporter.js')
      const bin = new STLExporter().parse(new THREE.Mesh(new THREE.SphereGeometry(1, 400, 260)), { binary: true })
      window.__big = window.studio.run('io.import', { files: [new File([bin], 'big.stl')] })
    })
    await p
    await s.waitFor(() => document.querySelector('.io-dlg .io-ch'), null, 20000)
    const msg = await s.eval(() => document.querySelector('.io-dlg').textContent)
    t.ok(/triangles/.test(msg) && /200,000/.test(msg), 'warning names the triangle count')
    await s.eval(() => [...document.querySelectorAll('.io-dlg .io-btn')].find(b => b.textContent === 'Cancel').click())
    t.eq(await s.eval(() => window.__big), null, 'cancel imports nothing')
    s.noErrors()
  })

  await t.test('gltf, ply, stl, usdz, studio json and svg import back', async () => {
    const s = await t.open()
    await s.project('Back', { empty: true })
    await s.run('parts.box', { pos: [0, 0.5, 0] }); await s.run('parts.sphere', { pos: [3, 1, 0] })
    const r = await s.eval(async mc => {
      const A = window.studio.app, count = (0, eval)('(' + mc + ')'), o = {}
      const out = {}
      for (const f of ['json', 'gltf', 'ply', 'stl', 'usdz']) out[f] = await A.io.exportTo({ format: f, to: 'data' })
      for (const f of ['json', 'gltf', 'ply', 'stl', 'usdz']) {
        const x = out[f]
        const imp = await window.studio.run('io.import', { files: [new File([x.data], 'back.' + f)] })
        o[f] = imp ? (f === 'json' ? imp.ids.length : count(imp.ids)) : 0
      }
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="40" fill="#3366ff"/><circle cx="50" cy="75" r="20" fill="#ff3366"/></svg>'
      const imp = await window.studio.run('io.import', { files: [new File([svg], 'logo.svg')] })
      o.svg = count(imp.ids)
      return o
    }, meshCount.toString())
    t.eq([r.gltf, r.json], [2, 2], 'gltf text and studio json keep both objects')
    t.ok(r.ply >= 1 && r.stl >= 1, 'ply and stl import as meshes'); t.eq(r.usdz, 2, 'usdz imports both meshes')
    t.ok(r.svg >= 1, 'svg extrudes to meshes: ' + r.svg)
    s.noErrors()
  })

  for (const device of ['desktop', 'phone']) {
    await t.test(`export dialog lists every exporter (${device})`, async () => {
      const s = await t.open({ device })
      await s.project('Dialog ' + device, { empty: true })
      await s.run('parts.box', { pos: [0, 0.5, 0] })
      const list = () => s.eval(async () => {
        await window.studio.run('io.export')
        await new Promise(r => setTimeout(r, 300))
        const btns = [...document.querySelectorAll('.io-dlg .io-fmt')].map(b => b.textContent)
        return { want: window.studio.app.exporters.map(e => e.label), btns }
      })
      let r = await list()
      t.ok(['glTF binary', 'glTF text', 'FBX', 'OBJ + MTL', 'Collada', 'STL', 'PLY', '3MF', 'USDZ'].every((l, i) => r.btns[i]?.includes(l)), 'model formats in shelf order: ' + r.btns)
      await s.eval(() => [...document.querySelectorAll('.io-dlg .io-fmt')].find(b => b.textContent.includes('glTF binary')).click())
      await s.idle()
      await s.shot(`${device}-export.png`)   // before the test-only format below joins the shelf
      t.eq(await s.eval(() => getComputedStyle(document.querySelector('.io-dlg')).outlineStyle), 'none', 'no focus ring drawn around the whole dialog')
      const hints = await s.eval(() => Object.fromEntries(['STL', 'PNG render', 'OBJ'].map(l => { [...document.querySelectorAll('.io-dlg .io-fmt')].find(b => b.textContent.includes(l)).click(); return [l, document.querySelector('.io-dlg .io-hint').textContent] })))
      t.ok(/Downloads as \.zip/.test(hints.STL) && !/Downloads as/.test(hints['PNG render']) && (hints.OBJ.match(/\.zip/g) || []).length === 1, 'hint says when a download is zipped: ' + JSON.stringify(hints))
      await s.eval(() => { document.querySelector('.io-dlg .io-ib').click(); window.studio.app.registerExporter({ ext: 'xyz', label: 'Test format', save: async () => ({ filename: 'a.xyz', data: 'hello' }) }) })
      r = await list()
      t.eq(r.btns.length, r.want.length, `one button per exporter (${r.btns})`)
      t.ok(r.want.every(l => r.btns.some(b => b.includes(l))), 'every label shown, plugin formats too')
      const st = await s.eval(async () => {
        [...document.querySelectorAll('.io-dlg .io-fmt')].find(b => b.textContent.includes('Test format')).click()
        const dl = [...document.querySelectorAll('.io-dlg .io-btn')].find(b => b.textContent.includes('Download'))
        dl.click(); await new Promise(r => setTimeout(r, 600))
        return { dl: window.__mock.downloads, open: !!document.querySelector('.io-dlg') }
      })
      t.ok(st.dl.some(d => d.filename === 'a.zip' || d.filename.endsWith('.zip')), 'foreign exporter saved through the dialog (zip-wrapped): ' + JSON.stringify(st.dl))
      s.noErrors()
    })
  }

  await t.test('share sheet goes first when the browser can share files; a refused tap keeps the file for the next tap', async () => {
    const s = await t.open({ device: 'phone' })
    await s.project('Share', { empty: true })
    await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.eval(() => {
      window.__shared = []; let refuse = 1
      navigator.canShare = d => !!d?.files?.length
      navigator.share = async d => { if (refuse-- > 0) throw new DOMException('no tap', 'NotAllowedError'); window.__shared.push(...d.files.map(f => ({ name: f.name, type: f.type, size: f.size }))) }
    })
    await s.run('io.export', {})
    await s.waitFor(() => document.querySelector('.io-dlg .io-fmt'))
    const ui = await s.eval(async () => {
      [...document.querySelectorAll('.io-dlg .io-fmt')].find(b => b.textContent.includes('STL')).click()
      const btn = document.querySelector('.io-dlg .io-btn.pri'), out = { label: btn.textContent, hint: document.querySelector('.io-dlg .io-hint').textContent }
      btn.click(); await new Promise(r => setTimeout(r, 800))
      out.st = document.querySelector('.io-dlg .io-st')?.textContent; out.first = window.__shared.length
      document.querySelector('.io-dlg .io-btn.pri').click(); await new Promise(r => setTimeout(r, 400))
      out.shared = window.__shared; out.open = !!document.querySelector('.io-dlg'); out.dl = (window.__mock.downloads || []).length
      return out
    })
    t.ok(/Share/.test(ui.label) && !/zip/.test(ui.hint), 'button says Share, no zip in the hint: ' + ui.label + ' | ' + ui.hint)
    t.ok(ui.first === 0 && /ready: tap Share/.test(ui.st), 'refused share keeps the file: ' + ui.st)
    t.eq(ui.shared.map(f => [f.name, f.type]), [['Share.stl', 'model/stl']], 'second tap shares the real .stl with its type')
    t.ok(ui.shared[0].size > 84 && !ui.open && ui.dl === 0, 'dialog closed, nothing zipped or downloaded')
    s.noErrors()
  })

  await t.test('fbx, collada and 3mf export real files that import back with colours', async () => {
    const s = await t.open()
    await s.project('Interchange', { empty: true })
    await s.run('parts.box', { pos: [-2, 0.5, 0] }); await s.run('parts.color', { color: '#ff0000' })
    await s.run('parts.sphere', { pos: [2, 1, 0] }); await s.run('parts.color', { color: '#0000ff' })
    const r = await s.eval(async mc => {
      const A = window.studio.app, count = (0, eval)('(' + mc + ')'), o = {}
      for (const f of ['fbx', 'dae', '3mf']) {
        const x = await A.io.exportTo({ format: f, to: 'data' })
        const imp = await window.studio.run('io.import', { files: [new File([x.data], x.filename)] })
        const ids = [...new Set(imp.ids.flatMap(id => [id, ...A.descendants(id)]))].filter(id => A.obj(id).type === 'mesh')
        const box = ids.map(id => A.viewport.objects.get(id)).map(m => { m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld); return [b.min.y, b.max.y].map(v => Math.round(v * 100) / 100) })
        o[f] = { name: x.filename, bytes: x.bytes, head: new TextDecoder().decode(x.data.slice(0, 18)), meshes: count(imp.ids), colors: ids.map(id => A.obj(id).color).sort(), box }
        A.remove(imp.ids)
      }
      return o
    }, meshCount.toString())
    t.ok(r.fbx.head.startsWith('Kaydara FBX Binary') && r.fbx.name.endsWith('.fbx'), 'binary fbx header: ' + r.fbx.head)
    t.ok(r.dae.head.startsWith('<?xml') && r.dae.name.endsWith('.dae'), 'collada xml: ' + r.dae.head)
    t.ok(r.dae.head.startsWith('<?xml') && r['3mf'].head.startsWith('PK') && r['3mf'].name.endsWith('.3mf'), '3mf is a zip package')
    for (const f of ['fbx', 'dae', '3mf']) t.eq(r[f].meshes, 2, f + ' brings back both meshes')
    for (const f of ['fbx', 'dae', '3mf']) t.eq(r[f].colors, ['#0000ff', '#ff0000'], f + ' keeps the colours')
    t.ok(['fbx', 'dae', '3mf'].every(f => r[f].box.every(([lo]) => Math.abs(lo) < 0.02)), 'objects stand on the ground after the trip: ' + JSON.stringify([r.fbx.box, r.dae.box, r['3mf'].box]))
    s.noErrors()
  })

  await t.test('obj of a painted part: uvs from the paint layout, paint baked into map_Kd', async () => {
    const s = await t.open()
    await s.project('PaintObj', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 2, 0], size: [4, 4, 4] })
    await s.run('parts.color', { color: '#3060ff' })
    await s.eval(() => { const v = window.studio.app.viewport; v.setCamera({ pos: [0, 2, 12], target: [0, 2, 0] }); v.requestRender() })
    await s.run('paint.mode'); await s.idle()
    const pt = await s.eval(id => { const A = window.studio.app, m = A.viewport.objects.get(id), p = A.viewport.project(m.position.clone().set(0, 2, 2)); return [p.x, p.y] }, id)
    await s.run('paint.stroke', { color: '#ff0000', size: 40, opacity: 1, hardness: 1, points: [pt] })
    const r = await s.eval(async () => {
      const A = window.studio.app, out = await A.io.exportTo({ format: 'obj', to: 'data' })
      const { unzipSync } = await import('three/addons/libs/fflate.module.js')
      const z = unzipSync(out.data), names = Object.keys(z), obj = new TextDecoder().decode(z[names.find(n => n.endsWith('.obj'))]), mtl = new TextDecoder().decode(z[names.find(n => n.endsWith('.mtl'))])
      const png = names.find(n => n.endsWith('.png')), bmp = await createImageBitmap(new Blob([z[png]], { type: 'image/png' }))
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bmp, 0, 0)
      const L = obj.split('\n'), vt = L.filter(l => l.startsWith('vt ')).map(l => l.split(' ').slice(1).map(Number)), vn = L.filter(l => l.startsWith('vn ')).map(l => l.split(' ').slice(1).map(Number))
      const at = side => {   // centre of the faces whose normal is +z / -z, through their vt
        const f = L.filter(l => l.startsWith('f ')).map(l => l.split(' ').slice(1).map(c => c.split('/').map(Number))).filter(f => Math.sign(vn[f[0][2] - 1][2]) === side && Math.abs(vn[f[0][2] - 1][2]) > 0.9)
        const us = f.flat().map(c => vt[c[1] - 1]), u = us.reduce((a, b) => a + b[0], 0) / us.length, v = us.reduce((a, b) => a + b[1], 0) / us.length
        return [...x.getImageData(Math.floor(u * c.width), Math.floor((1 - v) * c.height), 1, 1).data.slice(0, 3)]
      }
      return { names, vt: vt.length, kd: mtl.match(/Kd .*/)?.[0], map: mtl.match(/map_Kd .*/)?.[0], front: at(1), back: at(-1), size: [c.width, c.height] }
    })
    t.ok(r.vt >= 24 && /\.png$/.test(r.map) && r.kd === 'Kd 1 1 1', 'vt written, map_Kd set, colour baked so Kd is white: ' + JSON.stringify([r.vt, r.map, r.kd, r.names]))
    t.ok(r.front[0] > 200 && r.front[2] < 80, 'front face centre reads the red paint: ' + r.front)
    t.ok(r.back[2] > 200 && r.back[0] < 120, 'back face centre reads the blue part colour: ' + r.back)
    s.noErrors()
  })

  await t.test('no downloads: dialog shows the size and offers project assets', async () => {
    const s = await t.open({ claude: { disable: ['downloads'] } })
    await s.project('NoDl', { empty: true })
    await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.run('io.export', {})
    await s.waitFor(() => document.querySelector('.io-dlg .io-fmt'))
    await s.eval(() => [...document.querySelectorAll('.io-dlg .io-fmt')].find(b => b.textContent.includes('STL')).click())
    await s.eval(() => [...document.querySelectorAll('.io-dlg .io-btn')].find(b => b.textContent.includes('Download'))?.click())
    await new Promise(r => setTimeout(r, 800))
    const r = await s.eval(() => ({ st: document.querySelector('.io-dlg .io-st')?.textContent || '', assets: !![...document.querySelectorAll('.io-dlg .io-btn')].find(b => /project/i.test(b.textContent) && !b.disabled) }))
    t.ok(/\d+(\.\d+)?\s?(B|KB|MB)/.test(r.st), 'size shown: ' + r.st)
    t.ok(r.assets, 'save to project offered')
    const res = await s.run('io.export', { format: 'stl', to: 'download' })
    t.ok(res.unavailable && res.bytes > 84, 'op reports unavailable with size')
    s.noErrors()
  })

  await t.test('temporary models: own Explorer section, left out of glb, scene json, rbxmx and video', async () => {
    const s = await t.open({ device: 'desktop' })
    await s.project('Arena', { empty: true })
    const keep = await s.run('parts.box', { pos: [0, 0.5, 0] })
    const ball = await s.run('temp.ball')
    await s.run('temp.sword')
    await s.run('anim.new', { name: 'Throw', len: 0.3, fps: 10 })
    await s.run('anim.key', { ids: [ball], t: 0, channels: ['pos'], values: { pos: [-8, 2, 0] } })
    await s.run('anim.key', { ids: [ball], t: 0.3, channels: ['pos'], values: { pos: [0, 2, 0] } })
    const r = await s.eval(async ({ keep, ball }) => {
      const A = window.studio.app, before = A.ids().length
      const sec = !!document.querySelector('.ex-sec'), rows = [...document.querySelectorAll('.ex-row')].map(e => e.dataset.id)
      const glb = await A.io.exportTo({ format: 'glb', to: 'data' })
      const dv = new DataView(glb.data.buffer, glb.data.byteOffset), jl = dv.getUint32(12, true)       // the glTF JSON chunk: node names
      const gj = JSON.parse(new TextDecoder().decode(glb.data.slice(20, 20 + jl))), names = (gj.nodes || []).map(n => n.name || '')
      const meshes = { keep: names.some(n => /box|part/i.test(n)), temp: names.filter(n => /^Temp_|^Temp |Blade|Guard|Grip/.test(n)), clipTracks: (gj.animations || []).reduce((a, c) => a + c.channels.length, 0) }
      const js = JSON.parse(new TextDecoder().decode((await A.io.exportTo({ format: 'json', to: 'data' })).data))
      const rx = await A.exec('roblox.rbxmx', {}), rbx = typeof rx === 'string' ? rx : (rx?.xml || JSON.stringify(rx))
      const vid = await A.io.exportTo({ format: 'mp4', to: 'data' })
      return { before, sec, tempAfterKeep: rows.indexOf(ball) > rows.indexOf(keep), meshes, jsonIds: Object.keys(js.objects || js.scene?.objects || {}),
               rbxHasBall: /Temp ball|Temp sword|Blade/.test(rbx), rbxHasKeep: /<Item class="Part"/.test(rbx), vid: vid.data.length, ballShown: A.viewport.objects.get(ball).visible }
    }, { keep, ball })
    t.ok(r.sec, 'Explorer has a Temporary models section')
    t.ok(r.tempAfterKeep, 'temporary models are listed below the real scene')
    t.ok(r.meshes.keep && !r.meshes.temp.length, 'glb carries the real box, not the ball or sword: ' + JSON.stringify(r.meshes))
    t.eq(r.meshes.clipTracks, 0, "the ball's animation track is left out too")
    t.ok(!r.jsonIds.includes(ball) && r.jsonIds.includes(keep), 'scene .json leaves the temporary ball out')
    t.ok(r.rbxHasKeep && !r.rbxHasBall, 'Roblox export has the box, not the temporary models')
    t.ok(r.vid > 1000 && r.ballShown, 'video exports and the ball shows again afterwards')
    const shown = await s.eval(async () => { const A = window.studio.app; await A.exec('temp.show'); return A.ids().filter(id => A.obj(id).temp && !A.isTemp(A.obj(id).parent)).map(id => A.obj(id).visible) })
    t.ok(shown.every(v => v === false), 'the section toggle hides every temporary model')
    s.noErrors()
  })
}
