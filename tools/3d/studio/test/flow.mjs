// End to end: two pages with two projects, an ops queue of many commands, the README examples as written,
// a plugin dropped into a scratch copy, hand-made files in every import format, and input lag.
import { cp, rm, readFile, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const readme = async t => { const d = join(t.ROOT, 'docs'); return [await readFile(join(t.ROOT, 'README.md'), 'utf8'), ...await Promise.all((await readdir(d)).sort().map(f => readFile(join(d, f), 'utf8')))].join('\n') }   // README + docs/*.md
// Count an import's objects with their descendants.
const COUNT = ids => { const A = window.studio.app; return ids.reduce((n, id) => n + 1 + A.descendants(id).length, 0) }

export default async function (t) {
  await t.test('two pages, two projects: edits and outside writes land only in their own project', async () => {
    const s = await t.open({ claude: { shared: true } })
    const a = await s.project('Alpha', { empty: true })
    const p2 = await s.ctx.newPage(), err2 = []
    p2.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/GL Driver|GPU stall|\[\.WebGL-/.test(m.text())) err2.push(m.text()) })
    p2.on('pageerror', e => err2.push(String(e)))
    await p2.goto(t.ORIGIN + '/'); await p2.waitForFunction(() => window.studio?.ready); await p2.evaluate(() => window.studio.ready)
    const b = await p2.evaluate(async () => { const id = await window.studio.run('file.new', { name: 'Beta', empty: true }); await window.studio.open(id); return id })
    await p2.waitForFunction(() => window.studio.app.loaded && window.studio.app.viewport)
    t.ok(a !== b, 'two projects')
    const pa = await s.run('parts.box', { pos: [0, 0.5, 0], color: '#ff0000' })
    const pb = await p2.evaluate(() => window.studio.run('parts.sphere', { pos: [0, 1, 0], color: '#00ff00' }))
    await s.idle()
    // outside writes from the other page's runtime (shared db)
    await p2.evaluate(a => window.__mock.external('projects/' + a, { objects: { xa: { type: 'part', shape: 'box', pos: [3, 0.5, 0], color: '#0000ff' } } }), a)
    await s.eval(b => window.__mock.external('projects/' + b, { objects: { xb: { type: 'part', shape: 'cylinder', pos: [3, 1, 0], color: '#ffff00' } } }), b)
    await s.waitFor(() => window.studio.app.obj('xa'))
    await p2.waitForFunction(() => window.studio.app.obj('xb'))
    await new Promise(r => setTimeout(r, 400))
    const ids = pg => pg.evaluate(() => window.studio.app.ids().sort())
    t.eq(await ids(s.page), [pa, 'xa'].sort(), 'page A holds only Alpha objects')
    t.eq(await ids(p2), [pb, 'xb'].sort(), 'page B holds only Beta objects')
    const docs = await s.eval(([a, b]) => [Object.keys(window.__mock.get('projects/' + a).objects).sort(), Object.keys(window.__mock.get('projects/' + b).objects).sort()], [a, b])
    t.eq(docs, [[pa, 'xa'].sort(), [pb, 'xb'].sort()], 'saved docs stay separate')
    t.eq(await s.eval(() => window.studio.app.history?.undo?.length ?? null) !== 0, true, 'local edit is undoable')
    s.noErrors(); t.ok(!err2.length, 'page B console: ' + err2.slice(0, 3).join(' | '))
  })

  await t.test('ops queue: 7 different commands run in order and report back; a bad one errors alone', async () => {
    const s = await t.open()
    const pid = await s.project('Ops', { empty: true })
    await s.eval(pid => window.__mock.external('projects/' + pid, { objects: { a: { type: 'part', shape: 'box', pos: [0, 0.5, 0], size: [2, 1, 2] }, b: { type: 'part', shape: 'sphere', pos: [4, 1, 0], size: [2, 2, 2] } } }), pid)
    await s.waitFor(() => window.studio.app.obj('a') && window.studio.app.obj('b'))
    const ops = {
      o1: { cmd: 'parts.block', args: { pos: [0, 0.5, 6], color: '#e84d3d' } },
      o2: { cmd: 'parts.material', args: { ids: ['a'], material: 'Neon' } },
      o3: { cmd: 'parts.array', args: { ids: ['b'], count: 3, offset: [0, 0, 3] } },
      o4: { cmd: 'texture.procedural', args: { ids: ['a'], pattern: 'bricks' } },
      o5: { cmd: 'anim.spin', args: { ids: ['b'] } },
      o6: { cmd: 'no.such', args: {} },
      o7: { cmd: 'parts.ball', args: { position: [-4, 3, 0] } },
      o8: { cmd: 'roblox.lua', args: {} },
    }
    await s.eval(([pid, ops]) => { for (const [k, v] of Object.entries(ops)) window.__mock.external(`projects/${pid}/ops/${k}`, { ...v, status: 'queued' }, { set: true }) }, [pid, ops])
    await s.waitFor(pid => ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8'].every(k => ['done', 'error'].includes(window.__mock.get(`projects/${pid}/ops/${k}`)?.status)), pid, 15000)
    const r = await s.eval(pid => { const g = k => window.__mock.get(`projects/${pid}/ops/${k}`); const doc = window.__mock.get('projects/' + pid)
      return { st: ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8'].map(k => g(k).status), err: g('o6').error, o1: g('o1').result, o7: g('o7').result, lua: g('o8').result?.lua || '',
        doc, n: Object.keys(doc.objects).length } }, pid)
    t.eq(r.st, ['done', 'done', 'done', 'done', 'done', 'error', 'done', 'done'], 'statuses')
    t.ok(/Unknown command: no\.such/.test(r.err), 'error names the command: ' + r.err)
    t.eq(r.doc.objects[r.o1].color, '#e84d3d', 'block colour saved'); t.near(r.doc.objects[r.o1].pos, [0, 0.5, 6], 1e-6, 'block at its explicit pos')
    t.eq(r.doc.objects.a.material, 'Neon', 'material saved'); t.ok(r.doc.objects.a.texture && r.doc.textures[r.doc.objects.a.texture]?.pattern === 'bricks', 'texture saved')
    t.eq(r.n, 7, 'a, b, block, 2 array copies, ball, baseplate-free count')
    t.near(r.doc.objects[r.o7].pos, [-4, 3, 0], 1e-6, 'ball at position')
    const tracks = Object.values(r.doc.anims || {}).flatMap(c => Object.keys(c.tracks || {}))
    t.ok(tracks.includes('b'), 'spin clip tracks b: ' + tracks)
    t.ok((r.lua.match(/Instance\.new\("Part"\)/g) || []).length >= 6, 'lua builds the parts')
    s.noErrors()
  })

  await t.test('README "For AIs" examples and scene format work exactly as written', async () => {
    const md = await readme(t)
    const ex1 = JSON.parse(md.match(/`update` `projects\/<id>` with only the objects you change, e\.g\. `(\{.*?\}\}\})`/)[1])
    const ex2 = JSON.parse(md.match(/`set` `projects\/<id>\/ops\/<opId>` to `(\{.*?\})`/)[1])
    const ex5 = JSON.parse(md.match(/run op `io\.export` with `(\{.*?\})`/)[1])
    const scene = JSON.parse(md.match(/```json\n([\s\S]*?)```/)[1])
    const s = await t.open()
    const pid = await s.project('Readme', { empty: true })
    // 1: update with only the changed object
    await s.eval(([pid, ex]) => window.__mock.external('projects/' + pid, ex), [pid, ex1])
    await s.waitFor(() => window.studio.app.viewport.objects.has('p7'))
    t.eq(await s.eval(() => window.studio.app.obj('p7').color), '#e84d3d', 'p7 drawn live')
    // 2: csg.union op on a and b
    await s.eval(pid => window.__mock.external('projects/' + pid, { objects: { a: { type: 'part', shape: 'box', pos: [0, 1, 0], size: [2, 2, 2] }, b: { type: 'part', shape: 'sphere', pos: [1, 1.5, 0], size: [2, 2, 2] } } }), pid)
    await s.waitFor(() => window.studio.app.obj('a') && window.studio.app.obj('b'))
    await s.eval(([pid, op]) => window.__mock.external(`projects/${pid}/ops/u1`, op, { set: true }), [pid, ex2])
    await s.waitFor(pid => ['done', 'error'].includes(window.__mock.get(`projects/${pid}/ops/u1`)?.status), pid, 10000)
    const u = await s.eval(pid => { const op = window.__mock.get(`projects/${pid}/ops/u1`); const A = window.studio.app; return { op, a: !!A.obj('a'), b: !!A.obj('b'), type: A.obj(op.result?.id)?.type } }, pid)
    t.eq([u.op.status, u.a, u.b, u.type], ['done', false, false, 'mesh'], 'union replaced a and b with one mesh: ' + JSON.stringify(u.op))
    // 3: browser API
    const api = await s.eval(async () => { const st = window.studio; const id = await st.run('parts.box', {}); const sc = st.scene(); const cmds = st.commands()
      return { id: typeof id, objs: Object.keys(sc.objects).length, cmds: Array.isArray(cmds) ? cmds.length : Object.keys(cmds).length, open: typeof st.open } })
    t.ok(api.id === 'string' && api.objs === 3 && api.cmds > 100 && api.open === 'function', 'studio.run/scene/commands/open: ' + JSON.stringify(api))
    // 5: export op to assets
    await s.eval(([pid, args]) => window.__mock.external(`projects/${pid}/ops/x1`, { cmd: 'io.export', args, status: 'queued' }, { set: true }), [pid, ex5])
    await s.waitFor(pid => ['done', 'error'].includes(window.__mock.get(`projects/${pid}/ops/x1`)?.status), pid, 15000)
    const x = await s.eval(async pid => { const op = window.__mock.get(`projects/${pid}/ops/x1`); const b = op.result?.asset ? await (await fetch('/_blob/' + op.result.asset)).arrayBuffer() : null
      return { st: op.status, err: op.error, asset: op.result?.asset, magic: b ? new TextDecoder().decode(new Uint8Array(b, 0, 4)) : '' } }, pid)
    t.eq([x.st, x.magic], ['done', 'glTF'], 'glb asset readable by id: ' + JSON.stringify(x))
    // Scene format: the README document, with its geo and chair asset supplied
    scene.objects.chair.src.asset = x.asset
    const pid2 = await s.project('Castle', { empty: true })
    await s.eval(([pid, sc]) => {
      window.__mock.external(`projects/${pid}/geo/g-9a1c`, { verts: [-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 0, 1.5, 0], faces: [[0, 1, 2, 3], [0, 4, 1], [1, 4, 2], [2, 4, 3], [3, 4, 0]], uvs: null }, { set: true })
      window.__mock.external('projects/' + pid, sc, { set: true })
    }, [pid2, scene])
    await s.waitFor(() => ['base', 'tower', 'roof', 'sun', 'line1', 'chair'].every(id => window.studio.app.viewport.objects.has(id)), null, 15000)
    const sc = await s.eval(() => { const A = window.studio.app; return { anims: Object.keys(A.scene.anims), tex: Object.keys(A.scene.textures), name: A.scene.name, roof: A.viewport.objects.get('roof').geometry?.attributes.position.count || 0 } })
    t.eq([sc.anims, sc.tex, sc.name], [['wave'], ['t-bricks'], 'Castle'], 'anims, textures and name load')
    t.ok(sc.roof > 0, 'roof mesh geometry built')
    s.noErrors()
  })

  await t.test('plugin: README template dropped into a scratch copy with one line, then deleted', async () => {
    const md = await readme(t)
    const tpl = md.match(/Make `plugins\/<name>\.js`, add one line to `plugins\/index\.js`[^\n]*Template:\n```js\n([\s\S]*?)```/)[1]
    const copy = join(t.SCRATCH, 'plugin-copy')
    await rm(copy, { recursive: true, force: true })
    await cp(t.ROOT, copy, { recursive: true, filter: p => !p.includes('/test/') })
    await writeFile(join(copy, 'plugins/hello.js'), tpl)
    const idx = await readFile(join(copy, 'plugins/index.js'), 'utf8')
    await writeFile(join(copy, 'plugins/index.js'), idx.replace(/\n\]/, "\n  './hello.js',\n]"))
    try {
      const s = await t.open({ root: copy })
      await s.project('Hello', { empty: true })
      const r = await s.eval(async () => { const A = window.studio.app; const id = await window.studio.run('hello.cube'); return { color: A.obj(id).color, size: A.obj(id).size, menu: A.menus.get('Add').includes('hello.cube'), n: A.ids().length } })
      t.eq([r.color, r.size, r.menu, r.n], ['#3d8bfd', [1, 1, 1], true, 1], 'command, colour and Add menu')
      await s.page.mouse.click(720, 450); await s.page.keyboard.press('Escape')
      await s.page.keyboard.press('Shift+H')
      await s.waitFor(() => window.studio.app.ids().length === 2)
      await s.page.click('.menubar >> text=Add').catch(async () => { await s.page.getByText('Add', { exact: true }).first().click() })
      t.ok(await s.page.getByText('Add hello cube').first().isVisible(), 'menu item shown')
      s.noErrors()
    } finally { await rm(copy, { recursive: true, force: true }) }
    t.ok(!existsSync(copy), 'scratch copy deleted')
    t.ok(!existsSync(join(t.ROOT, 'plugins/hello.js')) && !(await readFile(join(t.ROOT, 'plugins/index.js'), 'utf8')).includes('hello'), 'tool folder untouched')
  })

  await t.test('imports: hand-made dae, wrl, amf, 3mf, vox, 3ds, fbx and obj files', async () => {
    const s = await t.open()
    await s.project('Formats', { empty: true })
    const r = await s.eval(async COUNT => {
      const count = (0, eval)('(' + COUNT + ')')
      const { zipSync, strToU8 } = await import('three/addons/libs/fflate.module.js')
      const files = {}
      files['tri.dae'] = `<?xml version="1.0" encoding="utf-8"?><COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1"><asset><unit name="meter" meter="1"/><up_axis>Y_UP</up_axis></asset><library_geometries><geometry id="g" name="Tri"><mesh><source id="g-pos"><float_array id="g-arr" count="9">0 0 0 1 0 0 0 1 0</float_array><technique_common><accessor source="#g-arr" count="3" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source><vertices id="g-v"><input semantic="POSITION" source="#g-pos"/></vertices><triangles count="1"><input semantic="VERTEX" source="#g-v" offset="0"/><p>0 1 2</p></triangles></mesh></geometry></library_geometries><library_visual_scenes><visual_scene id="s"><node id="n" name="Tri"><instance_geometry url="#g"/></node></visual_scene></library_visual_scenes><scene><instance_visual_scene url="#s"/></scene></COLLADA>`
      files['box.wrl'] = '#VRML V2.0 utf8\nShape { appearance Appearance { material Material { diffuseColor 1 0 0 } } geometry Box { size 2 2 2 } }\n'
      files['tet.amf'] = '<?xml version="1.0" encoding="UTF-8"?><amf unit="millimeter"><object id="0"><mesh><vertices>' + [[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 10]].map(([x, y, z]) => `<vertex><coordinates><x>${x}</x><y>${y}</y><z>${z}</z></coordinates></vertex>`).join('') + '</vertices><volume>' + [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]].map(([a, b, c]) => `<triangle><v1>${a}</v1><v2>${b}</v2><v3>${c}</v3></triangle>`).join('') + '</volume></mesh></object></amf>'
      const model = '<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="10" y="0" z="0"/><vertex x="0" y="10" z="0"/><vertex x="0" y="0" z="10"/></vertices><triangles><triangle v1="0" v2="2" v3="1"/><triangle v1="0" v2="1" v3="3"/><triangle v1="0" v2="3" v3="2"/><triangle v1="1" v2="2" v3="3"/></triangles></mesh></object></resources><build><item objectid="1"/></build></model>'
      files['tet.3mf'] = zipSync({ '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),
        '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
        '3D/3dmodel.model': strToU8(model) })
      // MagicaVoxel: 2x2x2 grid, 3 voxels
      const vox = []; const s32 = n => vox.push(n & 255, n >> 8 & 255, n >> 16 & 255, n >>> 24); const id = s => vox.push(...[...s].map(c => c.charCodeAt(0)))
      id('VOX '); s32(150); id('MAIN'); s32(0); s32(12 + 12 + 12 + 4 + 12)
      id('SIZE'); s32(12); s32(0); s32(2); s32(2); s32(2)
      id('XYZI'); s32(4 + 12); s32(0); s32(3); vox.push(0, 0, 0, 1, 1, 0, 0, 2, 0, 1, 1, 3)
      files['dots.vox'] = new Uint8Array(vox)
      // 3DS: MAIN > EDIT > OBJECT 'tri' > TRIMESH > (VERTICES, FACES)
      const chunk = (idn, ...parts) => { const body = parts.reduce((n, p) => n + p.byteLength, 0), out = new Uint8Array(6 + body), dv = new DataView(out.buffer); dv.setUint16(0, idn, true); dv.setUint32(2, 6 + body, true); let o = 6; for (const p of parts) { out.set(new Uint8Array(p.buffer || p), o); o += p.byteLength } return out }
      const verts = new DataView(new ArrayBuffer(2 + 36)); verts.setUint16(0, 3, true); [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((v, i) => verts.setFloat32(2 + i * 4, v, true))
      const faces = new DataView(new ArrayBuffer(2 + 8)); faces.setUint16(0, 1, true); [0, 1, 2, 0].forEach((v, i) => faces.setUint16(2 + i * 2, v, true))
      const ver = new DataView(new ArrayBuffer(4)); ver.setUint32(0, 3, true)
      files['tri.3ds'] = chunk(0x4D4D, chunk(0x0002, ver), chunk(0x3D3D, chunk(0x4000, new TextEncoder().encode('tri\0'), chunk(0x4100, chunk(0x4110, verts), chunk(0x4120, faces)))))
      files['tri.fbx'] = `; FBX 7.4.0 project file
FBXHeaderExtension:  {
	FBXHeaderVersion: 1003
	FBXVersion: 7400
}
GlobalSettings:  {
	Version: 1000
	Properties70:  {
		P: "UpAxis", "int", "Integer", "",1
		P: "UpAxisSign", "int", "Integer", "",1
		P: "FrontAxis", "int", "Integer", "",2
		P: "FrontAxisSign", "int", "Integer", "",1
		P: "CoordAxis", "int", "Integer", "",0
		P: "CoordAxisSign", "int", "Integer", "",1
		P: "UnitScaleFactor", "double", "Number", "",1
	}
}
Objects:  {
	Geometry: 100, "Geometry::Tri", "Mesh" {
		Vertices: *9 {
			a: 0,0,0,100,0,0,0,100,0
		}
		PolygonVertexIndex: *3 {
			a: 0,1,-3
		}
		GeometryVersion: 124
	}
	Model: 200, "Model::Tri", "Mesh" {
		Version: 232
		Properties70:  {
		}
	}
}
Connections:  {
	C: "OO",100,200
	C: "OO",200,0
}
`
      files['quad.obj'] = 'o Quad\nv 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4\n'
      const out = {}
      for (const [name, data] of Object.entries(files)) {
        try { const imp = await window.studio.run('io.import', { files: [new File([data], name)] })
          const A = window.studio.app, all = imp ? imp.ids.flatMap(id => [id, ...A.descendants(id)]) : []
          let tris = 0; for (const id of all) { const o = window.studio.app.viewport.objects.get(id); o?.traverse?.(m => { if (m.isMesh && m.geometry) { const g = m.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 } }) }
          out[name] = { n: imp ? count(imp.ids) : 0, tris }
        } catch (e) { out[name] = { err: String(e.message || e) } }
      }
      return out
    }, COUNT.toString())
    t.log(JSON.stringify(r))
    for (const [name, v] of Object.entries(r)) t.ok(!v.err && v.n >= 1 && v.tris >= 1, name + ' imports with triangles: ' + JSON.stringify(v))
    s.noErrors()
  })

  await t.test('no lag: 40 commands, a pointer drag and 120 orbit frames on a 300-part scene', async () => {
    const s = await t.open()
    await s.project('Lag', { empty: true })
    const m = await s.eval(async () => {
      const st = window.studio, A = st.app, vp = A.viewport
      A.transact('Fill', () => { for (let i = 0; i < 300; i++) A.add({ type: 'part', shape: i % 2 ? 'box' : 'sphere', pos: [(i % 20) * 2 - 20, 0.5 + Math.floor(i / 20) % 3, Math.floor(i / 60) * 2 - 5], size: [1, 1, 1], color: '#' + ((i * 2654435761) >>> 8 & 0xffffff).toString(16).padStart(6, '0') }) })
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const med = a => +a.sort((x, y) => x - y)[a.length >> 1].toFixed(2), p95 = a => +a.sort((x, y) => x - y)[Math.floor(a.length * 0.95)].toFixed(2)
      const cmds = []; for (let i = 0; i < 40; i++) { const t0 = performance.now(); await st.run(i % 2 ? 'parts.box' : 'parts.sphere', { pos: [i, 6, 8] }); cmds.push(performance.now() - t0) }
      // main-thread cost per frame (what the app controls) and the frame interval (dominated here by the software GPU)
      const cpu = [], gap = []; let last = performance.now()
      for (let i = 0; i < 120; i++) { vp.camera.position.applyAxisAngle(vp.camera.up, 0.03); vp.camera.lookAt(0, 0, 0); vp.requestRender(); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); cpu.push(vp.stats.lastMs); const now = performance.now(); gap.push(now - last); last = now }
      return { cmd: med(cmds), cmdP95: p95(cmds), renderCpu: med(cpu), renderCpuP95: p95(cpu), swGpuFrame: med(gap) }
    })
    // real pointer drag of one part across the floor
    const id = await s.run('parts.box', { pos: [0, 0.5, 12], size: [2, 1, 2], color: '#ffffff' })
    const c = await s.eval(id => { const A = window.studio.app, o = A.viewport.objects.get(id), w = o.position.clone(); const p = A.viewport.project(w); return [p.x, p.y] }, id)
    await s.page.mouse.click(c[0], c[1])
    const lt0 = await s.eval(() => { window.__lt = []; const po = new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)) }); po.observe({ type: 'longtask' }); window.__po = po; return performance.now() })
    await s.page.mouse.down(); const d0 = Date.now()
    for (let i = 1; i <= 30; i++) await s.page.mouse.move(c[0] + i * 6, c[1] - i * 2)
    await s.page.mouse.up(); const drag = (Date.now() - d0) / 30
    const lt = await s.eval(() => { window.__po.disconnect(); return window.__lt })
    t.log('lag', JSON.stringify({ ...m, dragMsPerMove: +drag.toFixed(1), longTasks: lt }))
    t.ok(m.cmd < 16 && m.cmdP95 < 50, 'command median under 16 ms, p95 under 50 ms: ' + m.cmd + ' / ' + m.cmdP95)
    t.ok(m.renderCpu < 8 && m.renderCpuP95 < 16, 'render main-thread median under 8 ms, p95 under 16 ms: ' + m.renderCpu + ' / ' + m.renderCpuP95)
    t.ok(lt.every(x => x < 200), 'no long task over 200 ms while dragging: ' + lt)
    t.ok(lt0 > 0, 'timer')
    s.noErrors()
  })
}
