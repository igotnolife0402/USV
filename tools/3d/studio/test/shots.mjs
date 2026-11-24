// Check an exported tab before it goes up (no-op unless SHOTS_TAB is set): SHOTS_TAB=<OUT/studio> SHOTS_AT="1,1.9,2.2"
// [SHOTS_CAM="x,y,z,tx,ty,tz"] [SHOTS_DEVICE=desktop] [SHOTS_RENDER=1: also render.png, 1920x1080] [SHOTS_VIDEO=1: also clip.mp4] [SHOTS_FPS=12: every frame (frames/f-XXXX.jpg) + one labelled sheet per second (sec-NN.jpg), for frame-by-frame reviews] node test/run.mjs shots -> one phone screenshot per clip time (shots-<t>.png) and shots.jpg (all of them).
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
export default async function (t) {
  const D = process.env.SHOTS_TAB
  if (!D) return
  await t.test('exported tab opens and plays: ' + D, async () => {
    const pid = 'shots', docs = {}
    for (const f of readdirSync(join(D, 'geo'))) docs[`projects/${pid}/geo/${f.replace('.json', '')}`] = JSON.parse(readFileSync(join(D, 'geo', f)))
    for (const [id, p] of Object.entries(JSON.parse(readFileSync(join(D, 'uploads.json'))))) docs[`projects/${pid}/tex/${id}`] = { kind: 'image', data: 'data:image/png;base64,' + readFileSync(p).toString('base64') }
    if (existsSync(join(D, 'tex'))) for (const f of readdirSync(join(D, 'tex'))) docs[`projects/${pid}/tex/${f.replace('.json', '')}`] = JSON.parse(readFileSync(join(D, 'tex', f)))   // palette etc. written as tex docs
    docs[`projects/${pid}`] = JSON.parse(readFileSync(join(D, 'project.json'))); docs[`meta/${pid}`] = JSON.parse(readFileSync(join(D, 'meta.json')))
    const s = await t.open({ device: process.env.SHOTS_DEVICE || 'phone' })
    await s.page.evaluate(d => { for (const [p, v] of Object.entries(d)) window.__mock.external(p, v, { set: true }) }, docs)
    await s.page.evaluate(id => { window.studio.open(id) }, pid)
    await s.page.waitForFunction(() => window.studio.app.loaded && window.studio.app.viewport, null, { timeout: 30000 })
    // the view: SHOTS_CAM if given, else the tab's saved scene camera (the 2026-11-24 duel raters judged a forced 7,5,9 view the
    // owner never sees); a clip camera track then drives every frame on its own
    const cam = process.env.SHOTS_CAM ? process.env.SHOTS_CAM.split(',').map(Number) : null
    await s.eval(c => { const A = window.studio.app; A.setMode('animate'); A.select([]); const sc = A.scene.camera || {}
      A.viewport.setCamera(c ? { pos: c.slice(0, 3), target: c.slice(3) } : { pos: sc.pos || [7, 5, 9], target: sc.target || [0, 3.2, 0], fov: sc.fov }) }, cam)
    await new Promise(r => setTimeout(r, 1200))
    const urls = []
    if (process.env.SHOTS_NEAR) await s.eval(n => { window.__shotsNear = n }, +process.env.SHOTS_NEAR)
    for (const at of (process.env.SHOTS_AT || '0').split(',').map(Number)) {
      await s.eval(x => window.studio.app.setTime(x), at); await new Promise(r => setTimeout(r, 500)); await s.shot(`shots-${at}.png`)
      if (process.env.SHOTS_DEPTH16) urls.push(await s.page.evaluate(async () => {     // a phone-grade 16-bit depth buffer
        const THREE = await import('three'), v = window.studio.app.viewport, r = v.renderer, c = r.domElement, w = c.width, h = c.height
        const rt = new THREE.WebGLRenderTarget(w, h, { depthTexture: new THREE.DepthTexture(w, h, THREE.UnsignedShortType), colorSpace: THREE.SRGBColorSpace, samples: 0 })
        v.render(); const nr = +(new URLSearchParams(location.hash.slice(1)).get('near') || 0) || window.__shotsNear
        if (nr) { v.camera.near = nr; v.camera.updateProjectionMatrix() }
        r.setRenderTarget(rt); r.render(v.scene, v.camera); const px = new Uint8Array(w * h * 4); r.readRenderTargetPixels(rt, 0, 0, w, h, px); r.setRenderTarget(null)
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'), im = g.createImageData(w, h)
        for (let y = 0; y < h; y++) im.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4)
        g.putImageData(im, 0, 0); rt.dispose(); return cv.toDataURL('image/jpeg', 0.85)
      }))
      if (process.env.SHOTS_DEPTH16) { const { writeFileSync, mkdirSync } = await import('node:fs'); mkdirSync(join(process.env.SCRATCH || '.', 'shots'), { recursive: true }); writeFileSync(join(process.env.SCRATCH || '.', 'shots', 'd16.jpg'), Buffer.from(urls[urls.length - 1].split(',')[1], 'base64')) }
      else urls.push(await s.eval(() => { const c = window.studio.app.viewport.renderer.domElement; window.studio.app.viewport.renderer.render(window.studio.app.viewport.scene, window.studio.app.viewport.camera); return c.toDataURL('image/jpeg', 0.85) }))
    }
    await s.page.evaluate(async list => {            // one small sheet of every moment, 4 per row, <= 1000 px wide: a look costs ~500 tokens, not 3000
      const ims = await Promise.all(list.map(u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u })))
      const k = Math.min(4, ims.length), w = Math.min(320, Math.floor(1000 / k) - 6), h = Math.round(w * ims[0].height / ims[0].width), c = document.createElement('canvas'); c.width = (w + 6) * k; c.height = (h + 6) * Math.ceil(ims.length / k)
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); ims.forEach((im, i) => g.drawImage(im, (i % k) * (w + 6), Math.floor(i / k) * (h + 6), w, h))
      window.__sheet = c.toDataURL('image/jpeg', 0.85)
    }, urls)
    const { writeFileSync, mkdirSync } = await import('node:fs'), out = join(process.env.SCRATCH || '.', 'shots')
    mkdirSync(out, { recursive: true }); writeFileSync(join(out, 'shots.jpg'), Buffer.from((await s.eval(() => window.__sheet)).split(',')[1], 'base64'))
    if (process.env.SHOTS_FPS) {                   // frame by frame for reviews: every frame at SHOTS_FPS, one labelled sheet per second
      const fps = +process.env.SHOTS_FPS || 12, fdir = join(out, 'frames'); mkdirSync(fdir, { recursive: true })
      const len = await s.eval(() => { const A = window.studio.app, c = A.scene.anims[A.anim?.clip] || Object.values(A.scene.anims)[0]; return +c?.len || 1 })
      const n = Math.round(len * fps) + 1, per = []
      for (let i = 0; i < n; i++) {
        const tt = Math.min(len, i / fps)
        const u = await s.eval(x => { const A = window.studio.app, v = A.viewport; A.setTime(x); v.renderer.render(v.scene, v.camera); return v.renderer.domElement.toDataURL('image/jpeg', 0.8) }, tt)
        const name = `f-${String(i).padStart(4, '0')}`; writeFileSync(join(fdir, name + '.jpg'), Buffer.from(u.split(',')[1], 'base64'))
        per.push([u, `${name}  ${tt.toFixed(2)} s`])
        if (per.length === fps || i === n - 1) {
          const sec = Math.floor((i - per.length + 1) / fps)
          const b64 = await s.page.evaluate(async list => {
            const ims = await Promise.all(list.map(([u]) => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = u })))
            const k = 4, w = Math.floor(1000 / k) - 6, h = Math.round(w * ims[0].height / ims[0].width), c = document.createElement('canvas')
            c.width = (w + 6) * k; c.height = (h + 6) * Math.ceil(ims.length / k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
            g.font = 'bold 13px sans-serif'
            ims.forEach((im, j) => { const x = (j % k) * (w + 6), y = Math.floor(j / k) * (h + 6); g.drawImage(im, x, y, w, h); g.fillStyle = '#000a'; g.fillRect(x, y, 150, 18); g.fillStyle = '#ff0'; g.fillText(list[j][1], x + 4, y + 13) })
            return c.toDataURL('image/jpeg', 0.85)
          }, per)
          writeFileSync(join(out, `sec-${String(sec).padStart(2, '0')}.jpg`), Buffer.from(b64.split(',')[1], 'base64')); per.length = 0
        }
      }
      console.log(`    frames ${n} at ${fps} fps, sheets ${Math.ceil(n / fps)} -> ${out}`)
    }
    if (process.env.SHOTS_RENDER) {                // the finished 1920x1080 render (look.render) too
      const b64 = await s.eval(async () => { const b = await window.studio.app.exec('look.render', { silent: true }); return await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b) }) })
      writeFileSync(join(out, 'render.png'), Buffer.from(b64.split(',')[1], 'base64'))
    }
    if (process.env.SHOTS_VIDEO) {                 // the whole clip as Export > Video (MP4) makes it
      const b64 = await s.eval(async () => { const r = await window.studio.app.io.exportTo({ format: 'mp4', to: 'data' }); return await new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(new Blob([r.data])) }) })
      writeFileSync(join(out, 'clip.mp4'), Buffer.from(b64.split(',')[1], 'base64'))
    }
    s.noErrors()
  })
}
