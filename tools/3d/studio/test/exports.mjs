// Export a real tab to every format and check each file (no-op unless EXPORT_TAB is set, like shots):
// EXPORT_TAB=<dir with geo/, project.json, meta.json, uploads.json> node test/run.mjs exports -> <SCRATCH>/exports/<name>.<ext> + report.json
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
export default async function (t) {
  const D = process.env.EXPORT_TAB
  if (!D) return
  await t.test('every exporter writes a file that loads back: ' + D, async () => {
    const pid = 'exports', docs = {}
    for (const f of readdirSync(join(D, 'geo'))) docs[`projects/${pid}/geo/${f.replace('.json', '')}`] = JSON.parse(readFileSync(join(D, 'geo', f)))
    if (existsSync(join(D, 'uploads.json'))) for (const [id, p] of Object.entries(JSON.parse(readFileSync(join(D, 'uploads.json'))))) docs[`projects/${pid}/tex/${id}`] = { kind: 'image', data: 'data:image/png;base64,' + readFileSync(p).toString('base64') }
    docs[`projects/${pid}`] = JSON.parse(readFileSync(join(D, 'project.json'))); docs[`meta/${pid}`] = { name: 'exports', updated: '2026-01-01T00:00:00Z' }
    const s = await t.open({ device: 'desktop' })
    await s.page.evaluate(d => { for (const [p, v] of Object.entries(d)) window.__mock.external(p, v, { set: true }) }, docs)
    await s.page.evaluate(id => { window.studio.open(id) }, pid)
    await s.page.waitForFunction(() => window.studio.app.loaded && window.studio.app.viewport, null, { timeout: 30000 })
    await new Promise(r => setTimeout(r, 1500))
    if (process.env.EXPORT_DEBUG) t.log(JSON.stringify(await s.eval(async () => {
      const A = window.studio.app, c = (await A.anim.toClips()) || []
      const names = []; A.viewport.scene.traverse(o => { if (names.length < 12 && o.name) names.push(o.name + '|' + (o.userData?.studioId || '')) })
      return { clips: c.length, tracks: c[0]?.tracks.length, first: c[0]?.tracks.slice(0, 6).map(x => x.name), names }
    })))
    const out = join(process.env.SCRATCH || '.', 'exports'); mkdirSync(out, { recursive: true })
    if (process.env.EXPORT_MESH_ASSETS) {   // the .rbxmx with uploaded mesh ids already in its MeshParts (no placeholders)
      const rd = k => process.env[k] ? JSON.parse(readFileSync(process.env[k], 'utf8')) : undefined
      const args = { meshAssets: rd('EXPORT_MESH_ASSETS'), textureAssets: rd('EXPORT_TEX_ASSETS'), animAssets: rd('EXPORT_ANIM_ASSETS') }
      const r = await s.eval(a => window.studio.app.exec('roblox.rbxmx', a), args)
      writeFileSync(join(out, 'linked.rbxmx'), r.xml); t.log(`linked.rbxmx ${r.xml.length} bytes, counts ${JSON.stringify(r.counts)} notes ${JSON.stringify(r.notes)}`)
      const a = await s.eval(a => window.studio.app.exec('roblox.rbxmx', a), { ...args, animOnly: true })
      writeFileSync(join(out, 'anim.rbxmx'), a.xml); t.log(`anim.rbxmx ${a.xml.length} bytes`)
    }
    const fmts = (process.env.EXPORT_FORMATS || 'glb,gltf,fbx,dae,obj,stl,ply,3mf,usdz,json,rbxmx,lua').split(',')
    const report = {}
    for (const f of fmts) {
      const r = await s.eval(async fmt => {
        try {
          const x = await window.studio.app.io.exportTo({ format: fmt, to: 'data' })
          const b = x.data; let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000))
          return { filename: x.filename, bytes: x.bytes, b64: btoa(s) }
        } catch (e) { return { error: String(e?.message || e) } }
      }, f)
      if (r.error) { report[f] = { error: r.error }; t.log(`${f}: ERROR ${r.error}`); continue }
      writeFileSync(join(out, r.filename), Buffer.from(r.b64, 'base64'))
      report[f] = { file: r.filename, bytes: r.bytes }
      t.log(`${f}: ${r.filename} ${r.bytes} bytes`)
    }
    // Load each 3D file back with three.js loaders and count meshes, animations and tracks that hit a node.
    for (const f of ['glb', 'gltf', 'fbx', 'dae']) {
      if (!report[f]?.file) continue
      const b64 = readFileSync(join(out, report[f].file)).toString('base64')
      report[f].reload = await s.eval(async ([fmt, data]) => {
        const THREE = await import('three'), bin = Uint8Array.from(atob(data), c => c.charCodeAt(0)).buffer
        const L = p => import('three/addons/' + p)
        let root, clips = []
        try {
          if (fmt === 'glb' || fmt === 'gltf') { const { GLTFLoader } = await L('loaders/GLTFLoader.js'); const g = await new GLTFLoader().parseAsync(fmt === 'glb' ? bin : new TextDecoder().decode(bin), ''); root = g.scene; clips = g.animations }
          if (fmt === 'fbx') { const { FBXLoader } = await L('loaders/FBXLoader.js'); root = new FBXLoader().parse(bin, ''); clips = root.animations || [] }
          if (fmt === 'dae') { const { ColladaLoader } = await L('loaders/ColladaLoader.js'); const c = new ColladaLoader().parse(new TextDecoder().decode(bin), ''); root = c.scene; clips = c.scene?.animations || c.animations || [] }
        } catch (e) { return { error: String(e?.message || e) } }
        let meshes = 0, grey = 0; const names = new Set()
        root.traverse(o => { names.add(o.name); names.add(o.uuid); if (o.isMesh) { meshes++; const m = [].concat(o.material)[0]; if (m?.color && m.color.r === m.color.g && m.color.g === m.color.b) grey++ } })
        let tracks = 0, hit = 0
        for (const c of clips) for (const tr of c.tracks) { tracks++; const node = THREE.PropertyBinding.parseTrackName(tr.name).nodeName; if (names.has(node)) hit++ }
        return { meshes, greyMeshes: grey, clips: clips.length, tracks, tracksHitNode: hit }
      }, [f, b64])
      t.log(`${f} reload: ${JSON.stringify(report[f].reload)}`)
    }
    writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 1))
  })
}
