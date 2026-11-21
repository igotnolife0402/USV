// Roblox plugin (.rbxmx / .lua export, R6 KeyframeSequence, .rbxmx import) and the headless CLI (cli/studio.mjs).
import { spawnSync } from 'node:child_process'
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const num = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g'))].map(m => +m[1])
const items = (xml, cls) => (xml.match(new RegExp(`<Item class="${cls}"`, 'g')) || []).length

export default async function (t) {
  const scratch = join(t.SHOTS, '..', 'roblox-cli')
  let sceneFile = null

  await t.test('rbxmx: parts by class, 90° Y turn gives R02 = 1, groups become Models, meshes become MeshPart notes', async () => {
    const s = await t.open()
    await s.project('Rbx', { empty: true })
    const a = await s.run('parts.box', { pos: [0, 1, 0], size: [4, 2, 2], rot: [0, 90, 0] })
    await s.run('parts.color', { ids: [a], color: '#ff0000' }); await s.run('parts.material', { ids: [a], material: 'Neon' })
    const w = await s.run('parts.wedge', { pos: [6, 1, 0] }), c = await s.run('parts.cornerwedge', { pos: [-6, 1, 0] })
    const cy = await s.run('parts.cylinder', { pos: [0, 1, 6] }), b = await s.run('parts.sphere', { pos: [3, 1, 6] })
    const g = await s.eval(([cy, b]) => window.studio.app.exec('edit.group', { ids: [cy, b] }), [cy, b])
    const r = await s.run('roblox.rbxmx')
    t.eq([items(r.xml, 'Part'), items(r.xml, 'WedgePart'), items(r.xml, 'CornerWedgePart'), items(r.xml, 'Model')], [3, 1, 1, 2], 'Part ×3 (box, cylinder, ball), Wedge, CornerWedge, Model ×2 (root + group)')
    t.eq(r.counts.parts, 5, 'counts 5 parts')
    const first = r.xml.slice(r.xml.indexOf('<Item class="Part"'))
    const R = ['R00', 'R01', 'R02', 'R20'].map(k => num(first, k)[0])
    t.near(R, [0, 0, 1, -1], 1e-6, '90° Y: R00 0, R01 0, R02 1, R20 -1')
    t.ok(/<Color3uint8 name="Color3uint8">4294901760<\/Color3uint8>/.test(first), 'red as Color3uint8 0xFFFF0000')
    t.ok(/<token name="Material">288<\/token>/.test(first), 'Neon material token 288')
    t.ok(/<bool name="Anchored">true<\/bool>/.test(first) && /<float name="Transparency">0<\/float>/.test(first) && /<string name="Name">Part<\/string>/.test(first), 'Anchored, Transparency, Name')
    // A mesh (CSG union) becomes a MeshPart placeholder with an OBJ in the zip.
    const u = await s.run('csg.union', { ids: [w, c] })
    const r2 = await s.run('roblox.rbxmx')
    t.eq([items(r2.xml, 'MeshPart'), r2.meshes.length, r2.counts.meshes], [1, 1, 1], 'mesh → 1 MeshPart + 1 OBJ')
    t.ok(/meshes\/.+\.obj/.test(r2.meshes[0]) && r2.xml.includes('Placeholder for'), 'MeshPart carries a note naming its OBJ')
    const zip = await s.eval(async () => { const x = await window.studio.app.io.exportTo({ format: 'rbxmx', to: 'data' }); const { unzipSync } = await import('three/addons/libs/fflate.module.js'); const z = unzipSync(new Uint8Array(x.data instanceof Blob ? await x.data.arrayBuffer() : x.data)); return { name: x.filename, files: Object.keys(z).sort(), obj: new TextDecoder().decode(z[Object.keys(z).find(k => k.endsWith('.obj'))]).split('\n').filter(l => l.startsWith('f ')).length } })
    t.log('zip', JSON.stringify(zip))
    t.ok(zip.files.some(f => f.endsWith('.rbxmx')) && zip.files.includes('README.txt') && zip.files.some(f => /^meshes\/.+\.obj$/.test(f)), 'io exporter lists rbxmx: zip has .rbxmx, README, meshes/*.obj')
    t.ok(zip.obj > 0, 'OBJ has faces: ' + zip.obj)
    t.ok(u && g, 'group and union made')
    s.noErrors()
  })

  await t.test('rbxmx import: parts, shapes, positions and turns come back; io imports .rbxmx', async () => {
    const s = await t.open()
    await s.project('RbxIn', { empty: true })
    const src = [
      { shape: 'box', pos: [0, 1, 0], size: [4, 2, 2], rot: [0, 90, 0] },
      { shape: 'wedge', pos: [6, 1, 0], size: [2, 2, 4], rot: [0, 0, 0] },
      { shape: 'cornerwedge', pos: [-6, 1, 0], size: [2, 3, 4], rot: [0, 30, 0] },
      { shape: 'cylinder', pos: [0, 1, 6], size: [2, 5, 2], rot: [0, 0, 0] },
      { shape: 'sphere', pos: [3, 1, 6], size: [3, 3, 3], rot: [0, 0, 0] },
    ]
    for (const p of src) await s.run('parts.' + p.shape, p)
    const { xml } = await s.run('roblox.rbxmx')
    await s.run('file.new', { name: 'Back', empty: true }).then(id => s.eval(id => window.studio.open(id), id))
    await s.waitFor(() => window.studio.app.loaded && window.studio.app.viewport && !Object.values(window.studio.app.scene.objects).some(Boolean), null, 15000)
    const top = await s.run('roblox.import', { text: xml })
    const back = await s.eval(top => { const A = window.studio.app; return A.descendants(top[0]).map(id => A.obj(id)).filter(o => o.type === 'part').map(o => ({ shape: o.shape, pos: o.pos, size: o.size, rot: o.rot })) }, top)
    t.eq(back.map(o => o.shape), src.map(o => o.shape), 'shapes')
    for (let i = 0; i < src.length; i++) {
      t.near(back[i].pos, src[i].pos, 1e-3, src[i].shape + ' pos')
      t.near(back[i].size, src[i].size, 1e-3, src[i].shape + ' size')
      t.near(back[i].rot, src[i].rot, 1e-3, src[i].shape + ' rot')
    }
    const viaIo = await s.eval(async xml => { const r = await window.studio.run('io.import', { files: [new File([xml], 'build.rbxmx')] }); const A = window.studio.app; const ids = r?.ids || r || []; return ids.flatMap(id => [id, ...A.descendants(id)]).filter(id => A.obj(id).type === 'part').length }, xml)
    t.eq(viaIo, 5, 'io.import of a .rbxmx file gives 5 parts')
    s.noErrors()
  })

  await t.test('lua builder: Instance.new lines, groups as Models, meshes skipped with a comment', async () => {
    const s = await t.open()
    await s.project('Lua', { empty: true })
    const a = await s.run('parts.box', { pos: [0, 1, 0] }), b = await s.run('parts.box', { pos: [3, 1, 0] })
    await s.eval(ids => window.studio.app.exec('edit.group', { ids }), [a, b])
    const w = await s.run('parts.wedge', { pos: [0, 1, 5] }), c = await s.run('parts.cornerwedge', { pos: [3, 1, 5] })
    await s.run('csg.union', { ids: [w, c] })
    const { lua, counts } = await s.run('roblox.lua')
    const lines = lua.split('\n')
    t.eq(lines.filter(l => l.includes('Instance.new("Part")')).length, 2, '2 Part lines')
    t.eq(lines.filter(l => l.includes('Instance.new("Model")')).length, 2, 'root + group Models')
    t.ok(lines.some(l => /^-- mesh skipped: /.test(l)), 'mesh skipped with a comment')
    t.ok(/CFrame\.new\(/.test(lua) && /Color3\.fromRGB\(/.test(lua) && /Parent = workspace/.test(lua), 'CFrame, colour, parented to workspace')
    t.eq(counts.parts, 2, 'counts')
    s.noErrors()
  })

  await t.test('R6 walk animation → KeyframeSequence with Poses named by limb', async () => {
    const s = await t.open()
    await s.project('R6', { empty: true })
    const rig = await s.run('parts.rig', { pos: [0, 0, 0] })
    await s.run('anim.walk', { ids: [rig] })
    const r = await s.run('roblox.rbxmx')
    const ks = items(r.xml, 'KeyframeSequence'), kf = items(r.xml, 'Keyframe'), poses = [...new Set([...r.xml.matchAll(/<Item class="Pose"[^>]*>\s*<Properties>\s*<string name="Name">([^<]+)</g)].map(m => m[1]))].sort()
    t.log('KeyframeSequence', ks, 'Keyframes', kf, 'poses', poses.join(', '))
    t.eq(ks, 1, '1 KeyframeSequence')
    t.ok(kf >= 2, 'keyframes: ' + kf)
    t.ok(['HumanoidRootPart', 'Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'].every(n => poses.includes(n)), 'poses named by limb')
    t.ok(r.xml.includes('<CoordinateFrame name="CFrame">') && /<bool name="Loop">true<\/bool>/.test(r.xml), 'pose CFrames, looping')
    t.eq(r.counts.anims, 1, 'counts 1 animation')
    // Hand a real page scene to the CLI test below.
    const parts = await s.run('parts.box', { pos: [8, 0.5, 0] })
    const w = await s.run('parts.wedge', { pos: [8, 1, 4] }), c = await s.run('parts.cornerwedge', { pos: [8, 1, 8] })
    await s.run('csg.union', { ids: [w, c] })
    const json = await s.eval(async () => { const x = await window.studio.app.io.exportTo({ format: 'json', to: 'data' }); return typeof x.data === 'string' ? x.data : await new Blob([x.data]).text() })
    await mkdir(scratch, { recursive: true })
    sceneFile = join(scratch, 'page-scene.json'); await writeFile(sceneFile, json)
    t.ok(parts && JSON.parse(json).objects, 'page scene saved for the CLI')
    s.noErrors()
  })

  await t.test('CLI: validate, info and export to every format run without error', async () => {
    const cli = join(t.ROOT, 'cli/studio.mjs'), env = { ...process.env, NODE_PATH: t.DEPS }
    const run = (...a) => { const r = spawnSync(process.execPath, [cli, ...a], { env, encoding: 'utf8', timeout: 60000 }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') } }
    t.ok(sceneFile, 'page scene from the previous test')
    let r = run('validate', sceneFile)
    t.eq(r.code, 0, 'validate exit 0: ' + r.out.trim().split('\n').pop())
    r = run('info', sceneFile, '--json')
    t.eq(r.code, 0, 'info exit 0')
    const inf = JSON.parse(r.out)
    t.log('info', JSON.stringify({ objects: inf.objects, tris: inf.tris, size: inf.bounds?.size, anims: inf.anims.length }))
    t.ok(inf.objects >= 9 && inf.tris > 0 && inf.anims.length === 1, 'info counts objects, triangles, animations')
    const bad = join(scratch, 'bad.json')
    await writeFile(bad, JSON.stringify({ objects: { a: { type: 'part', shape: 'blob', pos: [0, 'x', 0], parent: 'zz' } } }))
    r = run('validate', bad)
    t.ok(r.code === 1 && /shape/.test(r.out) && /pos/.test(r.out) && /parent/.test(r.out), 'validate catches bad shape, pos, parent (exit 1)')
    for (const f of ['glb', 'gltf', 'obj', 'stl', 'ply', 'rbxmx', 'lua']) {
      const out = join(scratch, 'out', 'scene.' + f)
      r = run('export', sceneFile, out)
      const size = await stat(out).then(x => x.size, () => 0)
      t.ok(r.code === 0 && size > 100, `export .${f}: exit ${r.code}, ${size} bytes ${r.code ? r.out : ''}`)
    }
    const glb = await readFile(join(scratch, 'out', 'scene.glb'))
    t.eq([glb.toString('latin1', 0, 4), glb.readUInt32LE(8)], ['glTF', glb.length], 'GLB header and length')
    const xml = await readFile(join(scratch, 'out', 'scene.rbxmx'), 'utf8')
    t.ok(items(xml, 'KeyframeSequence') === 1 && items(xml, 'MeshPart') === 1, 'CLI rbxmx has the walk KeyframeSequence and the MeshPart')
    t.ok(await stat(join(scratch, 'out', 'meshes')).then(x => x.isDirectory(), () => false), 'CLI writes meshes/*.obj next to the .rbxmx')
    t.ok(/Instance\.new\("Part"\)/.test(await readFile(join(scratch, 'out', 'scene.lua'), 'utf8')), 'CLI lua has Instance.new lines')
  })

  for (const device of ['desktop', 'phone']) await t.test(`${device}: Roblox commands and export dialog; screenshot`, async () => {
    const s = await t.open({ device })
    await s.project('Shot', { empty: true })
    const rig = await s.run('parts.rig', { pos: [0, 0, 0] })
    await s.run('parts.wedge', { pos: [4, 1, 0] }); await s.run('parts.cornerwedge', { pos: [-4, 1, 0] })
    t.ok(rig, 'rig')
    const labels = await s.eval(() => [...window.studio.app.commands].filter(([k]) => k.startsWith('roblox.')).map(([, c]) => c.label))
    t.ok(labels.includes('Export Roblox model (.rbxmx)') && labels.includes('Import Roblox model (.rbxmx)'), 'commands registered')
    await s.run('io.export')
    await s.idle(); await new Promise(r => setTimeout(r, 400))
    const ui = await s.eval(() => ({ text: document.body.innerText, over: document.documentElement.scrollWidth - innerWidth }))
    t.ok(/Roblox/.test(ui.text) && /rbxmx|Roblox model/i.test(ui.text), 'export dialog lists the Roblox group')
    t.ok(ui.over <= 0, 'no sideways scroll')
    const tiles = await s.eval(() => [...document.querySelectorAll('button')].filter(b => /^Roblox (model|script)/.test(b.innerText.trim())).map(b => { const l = [...b.querySelectorAll('*')].find(e => e.children.length === 0 && /^Roblox/.test(e.textContent)); return { text: b.innerText.trim(), cut: l ? l.scrollWidth > l.clientWidth + 1 : false } }))
    t.log('tiles', JSON.stringify(tiles))
    t.ok(tiles.length === 2 && tiles.every(x => !x.cut), 'Roblox tiles show their full names')
    await s.eval(() => [...document.querySelectorAll('button')].find(b => /^Roblox model/.test(b.innerText.trim()))?.click())
    await s.idle()
    t.ok(/Drag into Roblox Studio/.test(await s.eval(() => document.body.innerText)), 'picking Roblox model shows its hint')
    await s.shot(`${device}-roblox.png`)
    s.noErrors()
  })
}
