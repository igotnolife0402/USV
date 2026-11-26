// Every-angle labeled sheet of an exported tab, rendered by the real Studio renderer (look.render: textures, PBR, AO),
// for blind ratings and visual checks. No-op unless VIEWS_TAB is set:
//   VIEWS_TAB=<dir with project.json meta.json geo/ [tex/] [uploads.json]> [VIEWS_OUT=<dir>] [VIEWS_FAST=1: viewport shots]
//   [VIEWS_YAW=180: model faces -Z] [VIEWS_ENV='{"light":"day","bg":"#7d8590"}': one shared light/background for fair comparisons]
//   node test/run.mjs views  ->  <VIEWS_OUT>/views.jpg (4x2, labeled) + view-<name>.png each
// Straight views are level (el 0): a tilted straight view reads as duplicated far parts (L-134).
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const VIEWS = [['FRONT', 0, 0], ['BACK', 180, 0], ['LEFT', 90, 0], ['RIGHT', -90, 0],
  ['3/4 FRONT', 35, 22], ['3/4 BACK', 215, 22], ['TOP', 0, 85], ['BELOW 3/4', 30, -28]]

export default async function (t) {
  const D = process.env.VIEWS_TAB
  if (!D) return
  await t.test('every-angle render: ' + D, async () => {
    const pid = 'views', docs = {}
    for (const f of readdirSync(join(D, 'geo'))) docs[`projects/${pid}/geo/${f.replace('.json', '')}`] = JSON.parse(readFileSync(join(D, 'geo', f)))
    if (existsSync(join(D, 'uploads.json'))) for (const [id, p] of Object.entries(JSON.parse(readFileSync(join(D, 'uploads.json'))))) docs[`projects/${pid}/tex/${id}`] = { kind: 'image', data: 'data:image/png;base64,' + readFileSync(p).toString('base64') }
    if (existsSync(join(D, 'tex'))) for (const f of readdirSync(join(D, 'tex'))) docs[`projects/${pid}/tex/${f.replace('.json', '')}`] = JSON.parse(readFileSync(join(D, 'tex', f)))
    docs[`projects/${pid}`] = JSON.parse(readFileSync(join(D, 'project.json'))); docs[`meta/${pid}`] = JSON.parse(readFileSync(join(D, 'meta.json')))
    // Same light for every model being compared (VIEWS_ENV='{"light":"day","bg":"#7d8590"}'): dark iron vanishes on the default dark scene
    if (process.env.VIEWS_ENV) docs[`projects/${pid}`].env = { ...(docs[`projects/${pid}`].env || {}), ...JSON.parse(process.env.VIEWS_ENV) }
    const s = await t.open({ device: 'desktop' })
    await s.page.evaluate(d => { for (const [p, v] of Object.entries(d)) window.__mock.external(p, v, { set: true }) }, docs)
    await s.page.evaluate(id => { window.studio.open(id) }, pid)
    await s.page.waitForFunction(() => window.studio.app.loaded && window.studio.app.viewport, null, { timeout: 30000 })
    await new Promise(r => setTimeout(r, 1500))   // procedural textures finish
    // VIEWS_RBXMX=1: dry-run the Roblox export (owner on phone, 2026-11-23): build the .rbxmx in memory, report, write nothing
    if (process.env.VIEWS_RBXMX) {
      const r = await s.eval(() => window.studio.app.exec('roblox.rbxmx', {}))
      const xml = r.xml || '', mp = (xml.match(/class="MeshPart"/g) || []).length
      // faces are polygons: an n-gon is n-2 triangles
      const tris = Object.entries(docs).filter(([k]) => k.includes('/geo/')).map(([, g]) => (g.faces || []).reduce((a, f) => a + f.length - 2, 0))
      const ok = await s.eval(x => !new DOMParser().parseFromString(x, 'application/xml').querySelector('parsererror'), xml)
      t.log(`rbxmx dry-run: ${xml.length} bytes, valid XML ${ok}, ${mp} MeshParts, max tris/part ${Math.max(0, ...tris)} (cap 20000), counts ${JSON.stringify(r.counts)} notes ${JSON.stringify(r.notes)}`)
      if (!ok) throw new Error('rbxmx dry-run XML does not parse')
      if (!xml.startsWith('<roblox') || !mp) throw new Error('rbxmx dry-run produced no MeshParts')
    }
    // Bounds from the tab's own geometry (scene-wide Box3 also catches the ground grid / sky and lands the camera km away)
    const proj = docs[`projects/${pid}`], lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]
    for (const o of Object.values(proj.objects || {})) {
      const g = o.geo && docs[`projects/${pid}/geo/${o.geo}`]
      if (!g || o.visible === false) continue
      // world = parent chain of pos/scale (rotations ignored: generators bake them into verts)
      let sc = (o.scale || [1, 1, 1]).slice(), p0 = (o.pos || [0, 0, 0]).slice()
      for (let q = proj.objects[o.parent]; q; q = proj.objects[q.parent]) {
        const qs = q.scale || [1, 1, 1], qp = q.pos || [0, 0, 0]
        for (let k = 0; k < 3; k++) { sc[k] *= qs[k]; p0[k] = p0[k] * qs[k] + qp[k] }
      }
      for (let i = 0; i < g.verts.length; i += 3) for (let k = 0; k < 3; k++) {
        const v = g.verts[i + k] * sc[k] + p0[k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v
      }
    }
    const box = { c: lo.map((v, k) => (v + hi[k]) / 2), r: Math.max(...hi.map((v, k) => v - lo[k])) }
    const out = process.env.VIEWS_OUT || join(process.env.SCRATCH || '.', 'views')
    mkdirSync(out, { recursive: true })
    const urls = []
    for (const [name, az, el] of VIEWS) {
      // VIEWS_YAW=180 when a model's face points -Z, so FRONT is its real front
      const a = (az + (+process.env.VIEWS_YAW || 0)) * Math.PI / 180, e = el * Math.PI / 180, d = box.r * 1.7
      const pos = [box.c[0] + d * Math.cos(e) * Math.sin(a), box.c[1] + d * Math.sin(e), box.c[2] + d * Math.cos(e) * Math.cos(a)]
      await s.eval(([p, c]) => { const A = window.studio.app; A.setMode('animate'); A.select([]); A.viewport.setCamera({ pos: p, target: c }) }, [pos, box.c])
      await new Promise(r => setTimeout(r, 400))
      const url = process.env.VIEWS_FAST
        ? await s.eval(() => { const v = window.studio.app.viewport; v.renderer.render(v.scene, v.camera); return v.renderer.domElement.toDataURL('image/png') })
        : await s.eval(async () => { const b = await window.studio.app.exec('look.render', { silent: true }); return await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b) }) })
      writeFileSync(join(out, `view-${name.replace(/[^\w]+/g, '-').toLowerCase()}.png`), Buffer.from(url.split(',')[1], 'base64'))
      urls.push([name, url])
    }
    const sheet = await s.page.evaluate(async list => {   // 4x2 sheet, centre-square crop of each render, label bar on every tile
      const ims = await Promise.all(list.map(([n, u]) => new Promise(r => { const i = new Image(); i.onload = () => r([n, i]); i.src = u })))
      const T = 480, c = document.createElement('canvas'); c.width = T * 4; c.height = T * 2
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
      ims.forEach(([n, im], k) => {
        const x = (k % 4) * T, y = Math.floor(k / 4) * T, sz = Math.min(im.width, im.height)
        g.drawImage(im, (im.width - sz) / 2, (im.height - sz) / 2, sz, sz, x, y, T, T)
        g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(x, y, T, 34); g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.fillText(n, x + 10, y + 25)
        g.strokeStyle = '#999'; g.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1)
      })
      return c.toDataURL('image/jpeg', 0.9)
    }, urls)
    writeFileSync(join(out, 'views.jpg'), Buffer.from(sheet.split(',')[1], 'base64'))
    s.noErrors()
  })
}
