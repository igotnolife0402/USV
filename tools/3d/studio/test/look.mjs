// Look: the finished render (look.render) and the live toon view, judged by pixels. Ink outlines in toon only; ambient
// occlusion darkens creases but not open faces; `glow` draws a coloured halo just outside a part; speed caps for both.
const CAM = { pos: [5.5, 4.5, 7], target: [0, 1, 0] }

// in the page: render, decode the PNG, return what the check needs (pixels never cross into node)
const RENDER = async (A, w, h, opt = {}) => {
  const errs = [], ce = console.error; console.error = (...a) => { errs.push(a.map(e => e?.stack || String(e)).join(' ')); ce(...a) }
  let blob; try { blob = await A.run('look.render', { silent: true, w, h, ...opt }) } finally { console.error = ce }
  if (!(blob instanceof Blob)) throw new Error('look.render gave no PNG: ' + errs.join(' | ').slice(0, 600))
  const bm = await createImageBitmap(blob), c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height
  const g = c.getContext('2d'); g.drawImage(bm, 0, 0)
  if (window.__dump) (window.__pngs ||= []).push(await new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(blob) }))
  return { w: bm.width, h: bm.height, type: blob.type, px: g.getImageData(0, 0, bm.width, bm.height).data }
}
// screen px of a world point in a w x h render of the current camera
const PROJ = (A, w, h, p) => {
  const cam = A.viewport.camera.clone(); cam.aspect = w / h; cam.updateProjectionMatrix(); cam.updateMatrixWorld()   // the render does the same
  const v = A.viewport.camera.position.clone().set(...p).project(cam)
  return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h]
}

const inject = s => s.page.evaluate(`window.__R = ${RENDER}; window.__P = ${PROJ}; window.__dump = ${!!process.env.LOOK_DUMP}`)
// LOOK_DUMP=<folder>: write every render of a test there as <test>-<i>.png, to look at
const dump = async (s, name) => {
  if (!process.env.LOOK_DUMP) return
  const { writeFile, mkdir } = await import('node:fs/promises'); await mkdir(process.env.LOOK_DUMP, { recursive: true })
  const urls = await s.eval(() => { const u = window.__pngs || []; window.__pngs = []; return u })
  for (const [i, u] of urls.entries()) await writeFile(`${process.env.LOOK_DUMP}/${name}-${i}.png`, Buffer.from(u.split(',')[1], 'base64'))
}
// a 60-part scene: a baseplate and a grid of stacked bevel boxes
const SIXTY = () => {
  const A = window.studio.app, ids = [A.add({ type: 'part', shape: 'box', size: [40, 1, 40], color: '#5fa84a', pos: [0, -0.5, 0] })]
  const cols = ['#ff5a3c', '#ffd21f', '#3cb4ff', '#ff7ad9', '#7cff5a', '#ffffff']
  for (let i = 0; ids.length < 60; i++) {
    const x = (i % 6) * 3 - 7.5, z = Math.floor(i / 6) * 3 - 6, y = 0.8 + (i % 3 === 0 ? 1.6 : 0)
    ids.push(A.add({ type: 'part', shape: 'box', size: [1.6, 1.6, 1.6], bevel: 0.2, color: cols[i % 6], pos: [x, y, z] }))
  }
  return ids
}

// The owner's reference thumbnails as scenes (look 'roblox'): a crowd of blocky R6 characters running on a green studded
// baseplate with a white-rimmed hero, and a backrooms corridor (yellowed textured walls and carpet, ceiling light panels,
// a dark figure behind the hero). LOOK_DUMP writes the renders; the art review compares them with the references.
const SCENES = () => {
  const A = window.studio.app
  const R6 = (at, c, o = {}) => {                 // torso 2x2x1, head, arms, legs 1x2x1; swing: run pose; faces +z
    const g = A.add({ type: 'group', name: o.name || 'R6', pos: at, rot: [0, o.yaw || 0, 0], scale: [o.s || 1, o.s || 1, o.s || 1], ...(o.glow ? { glow: o.glow } : {}) })
    const p = (size, pos, color, x = {}) => A.add({ type: 'part', shape: 'box', size, pos, color, bevel: 0.06, material: 'SmoothPlastic', parent: g, ...x })
    const w = o.swing ?? 25
    p([2, 2, 1], [0, 3, 0], c.torso)
    p([1.25, 1.25, 1.25], [0, 4.65, 0], c.head, { bevel: 0.28 })
    p([1, 2, 1], [-1.5, 3, 0], c.arms, { rot: [w, 0, 0] }); p([1, 2, 1], [1.5, 3, 0], c.arms, { rot: [-w, 0, 0] })
    p([1, 2, 1], [-0.5, 1, 0], c.legs, { rot: [-w, 0, 0] }); p([1, 2, 1], [0.5, 1, 0], c.legs, { rot: [w, 0, 0] })
    if (c.hair) p([1.4, 0.55, 1.4], [0, 5.3, -0.05], c.hair, { bevel: 0.2 })
    const eye = c.eyes || '#111111', glowEye = c.eyes ? { material: 'Neon' } : {}
    p([0.16, 0.32, 0.06], [-0.27, 4.78, 0.63], eye, glowEye); p([0.16, 0.32, 0.06], [0.27, 4.78, 0.63], eye, glowEye)
    return g
  }
  return {
    crowd() {
      A.putTexture('t-studs', { kind: 'procedural', pattern: 'studs', colors: ['#ffffff'], count: 1, scale: 1 })
      A.add({ type: 'part', shape: 'box', name: 'Baseplate', size: [256, 1, 256], pos: [0, -0.5, 0], color: '#2bc22b', texture: 't-studs' })   // README: Baseplate
      const noob = { head: '#f5cd30', torso: '#0d69ac', arms: '#f5cd30', legs: '#a4bd47' }, bacon = { head: '#f2c9a0', torso: '#1b1b1b', arms: '#f2c9a0', legs: '#2a3e5e', hair: '#a5542a' }
      R6([-8, 0, -4], noob, { yaw: 12 }); R6([-4.5, 0, -7.5], { ...noob, torso: '#c4281c' }, { yaw: 5 }); R6([-3.5, 0, -1.5], bacon, { yaw: 8 })
      R6([3.2, 0, -2], { head: '#f2c9a0', torso: '#d7d7d7', arms: '#f2c9a0', legs: '#1b1b1b' }, { yaw: -8 }); R6([0.6, 0, -9], { head: '#cfcfcf', torso: '#7b2fbe', arms: '#cfcfcf', legs: '#5b5b5b' })
      R6([5.5, 0, -8], bacon, { yaw: -6 }); R6([8.5, 0, -4], { head: '#f2c9a0', torso: '#f39c12', arms: '#f2c9a0', legs: '#2a3e5e', hair: '#a5542a' }, { yaw: -14 })
      R6([0, 0, 3], { head: '#f8f8f8', torso: '#1b1b1b', arms: '#f8f8f8', legs: '#232323', hair: '#a5542a' }, { glow: '#ffffff', swing: 18, name: 'Hero' })
      A.setEnv({ look: 'roblox', light: 'day', sun: [0.12, 1, -0.22], bg: '#bfe6ff', grid: false })
      return { pos: [0, 7.2, 15.5], target: [0, 2.6, -2.5], fov: 42 }
    },
    backrooms() {
      A.putTexture('t-carpet', { kind: 'procedural', pattern: 'fabric', colors: ['#6b6136', '#433b1e', '#867948'], count: 1, scale: 2 })
      A.putTexture('t-wall', { kind: 'procedural', pattern: 'clouds', colors: ['#9d965a', '#666033'], count: 3, scale: 12 })
      A.putTexture('t-ceil', { kind: 'procedural', pattern: 'tiles', colors: ['#958f6c', '#6a654a'], count: 1, scale: 4 })
      const part = (size, pos, color, x = {}) => A.add({ type: 'part', shape: 'box', size, pos, color, ...x })
      part([16, 1, 90], [0, -0.5, -35], '#ffffff', { texture: 't-carpet', material: 'Fabric' })
      part([1, 11, 90], [-8.5, 5.5, -35], '#ffffff', { texture: 't-wall' }); part([1, 11, 90], [8.5, 5.5, -35], '#ffffff', { texture: 't-wall' })
      part([16, 1, 90], [0, 11.5, -35], '#ffffff', { texture: 't-ceil' })
      for (const z of [-58, -40, -24]) part([1, 11, 6], [z === -40 ? -5 : 5, 5.5, z], '#ffffff', { texture: 't-wall' })    // pillars: depth
      for (let z = 4; z > -75; z -= 13) {
        part([2.4, 0.12, 5], [0, 10.95, z], '#fff3cf', { material: 'Neon' })
        A.add({ type: 'light', kind: 'point', pos: [0, 10, z], color: '#ffe7a8', intensity: z > -25 ? 2.2 : 1.6, range: 24, shadow: z > -25 })
      }
      R6([2.5, 0, -9], { head: '#1a1a1a', torso: '#141414', arms: '#141414', legs: '#141414', eyes: '#ff2020' }, { s: 1.7, swing: 40, name: 'Figure' })
      R6([-2, 0, 1], { head: '#f2c9a0', torso: '#1b1b1b', arms: '#f2c9a0', legs: '#232323', hair: '#8a4a22' }, { glow: '#ffffff', swing: 35, yaw: 10, name: 'Hero' })
      A.setEnv({ look: 'roblox', light: 'night', sun: [0.3, 1, 0.2], bg: '#0b0a06', grid: false })
      return { pos: [-1, 4.6, 13], target: [0.5, 4, -6] }
    }
  }
}

export default async function (t) {
  await t.test('roblox look: crowd and backrooms reference scenes render clean (under 8 s, dithered, no errors)', async () => {
    for (const name of ['crowd', 'backrooms']) {
      const s = await t.open({ device: 'desktop' })
      await s.project(name, { empty: true }); await inject(s)
      const r = await s.eval(async ([src, name]) => {
        const A = window.studio.app, cam = (0, eval)(src)()[name]()
        await A.viewport.setCamera(cam); await new Promise(res => setTimeout(res, 300))
        const t0 = performance.now(), im = await window.__R(A, 1920, 1080), sec = (performance.now() - t0) / 1000
        // banding: the longest run of one exact colour along rows of smooth shading (dither breaks gradients into noise)
        let run = 0
        for (const y of [60, 540, 1020]) { let k = 1; for (let x = 1; x < 1920; x++) { const i = (y * 1920 + x) * 4, j = i - 4; k = im.px[i] === im.px[j] && im.px[i + 1] === im.px[j + 1] && im.px[i + 2] === im.px[j + 2] ? k + 1 : 1; run = Math.max(run, k) } }
        return { sec, run }
      }, [`(${SCENES})`, name]).catch(e => ({ err: String(e) }))
      t.ok(!r.err, r.err); await dump(s, 'ref-' + name)
      t.log(`${name}: ${r.sec?.toFixed(2)} s, longest flat run ${r.run} px`)
      t.ok(r.sec < 8, `${name} renders under 8 s (${r.sec?.toFixed(2)} s)`)
      t.ok(r.run < 40 || process.env.LOOK_DUMP, `${name}: no flat bands (longest identical run ${r.run} px)`)
      s.noErrors()
    }
  })

  await t.test('toon look draws ink along the silhouette; normal and roblox looks none; roblox is AgX Punchy live', async () => {
    const s = await t.open({ device: 'desktop' })
    await s.project('Ink', { empty: true }); await inject(s)
    const r = await s.eval(async cam => {
      const A = window.studio.app
      A.add({ type: 'part', shape: 'box', size: [2, 2, 2], bevel: 0.3, color: '#ffffff', pos: [0, 1, 0] })
      await A.viewport.setCamera(cam)
      const count = ({ w, h, px }) => {   // dark pixels with a bright pixel within 8 px: ink on the silhouette
        const L = i => 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]
        let n = 0
        for (let y = 8; y < h - 8; y++) for (let x = 8; x < w - 8; x++) {
          if (L((y * w + x) * 4) > 70) continue
          let near = false
          for (let d = 1; d <= 8 && !near; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) if (L(((y + dy) * w + x + dx) * 4) > 170) near = true
          if (near) n++
        }
        return n
      }
      A.setEnv({ look: null, bg: '#e8eef7' }); const normal = count(await window.__R(A, 960, 540))
      A.setEnv({ look: 'toon', bg: '#e8eef7' }); const toon = count(await window.__R(A, 960, 540))
      A.setEnv({ look: 'roblox', bg: '#e8eef7' }); await new Promise(res => setTimeout(res, 30))
      const tone = [A.viewport.renderer.toneMapping, A.viewport.renderer.toneMappingExposure], roblox = count(await window.__R(A, 960, 540))
      return { normal, toon, roblox, tone, fov: A.viewport.camera.fov }
    }, CAM).catch(e => ({ err: String(e) }))
    t.ok(!r.err, r.err); await dump(s, 'ink')
    t.log(`ink pixels at 960x540: toon ${r.toon}, normal ${r.normal}, roblox ${r.roblox} (fov ${r.fov}); roblox live tone mapping ${r.tone}`)
    t.ok(r.toon > 400, `toon draws a closed ink line (${r.toon} px)`)
    t.ok(r.normal < 20, `normal look draws no ink (${r.normal} px)`)
    t.ok(r.roblox < 20, `roblox look draws no ink (${r.roblox} px)`)
    t.eq(r.tone[0], 5, 'live roblox look: AgX Punchy (THREE.CustomToneMapping = 5, curve from look.js)')
    t.ok(r.tone[1] > 1, `live roblox look: exposure raised (${r.tone[1]})`)
    s.noErrors()
  })

  await t.test('ambient occlusion darkens the inner corner of two boxes, open faces keep their colour (normal and roblox looks)', async () => {
    const s = await t.open({ device: 'desktop' })
    await s.project('Crease', { empty: true }); await inject(s)
    const r = await s.eval(async () => {
      const A = window.studio.app, W = 960, H = 540
      A.add({ type: 'part', shape: 'box', size: [8, 1, 8], color: '#ffffff', pos: [0, 0.5, 0] })     // floor, top at y 1
      A.add({ type: 'part', shape: 'box', size: [8, 5, 1], color: '#ffffff', pos: [0, 3.5, -3.5] })  // wall, front at z -3
      A.setEnv({ look: null, bg: '#e8eef7' })
      await A.viewport.setCamera({ pos: [4, 6, 9], target: [0, 1.5, -1] })
      const at = (im, p) => {             // mean luminance of a 7x7 patch around a world point
        const [cx, cy] = window.__P(A, W, H, p); let s = 0
        for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const i = ((Math.round(cy) + y) * W + Math.round(cx) + x) * 4; s += 0.2126 * im.px[i] + 0.7152 * im.px[i + 1] + 0.0722 * im.px[i + 2] }
        return s / 49
      }
      const P = { corner: [0.5, 1.06, -2.94], floor: [0.5, 1, 2], wall: [1.5, 5, -3] }, out = {}
      for (const look of [null, 'roblox']) {
        A.setEnv({ look, bg: '#e8eef7' }); await new Promise(res => setTimeout(res, 30))
        const on = await window.__R(A, W, H), off = await window.__R(A, W, H, { ao: false }), o = out[look || 'normal'] = {}
        for (const k in P) o[k] = [at(on, P[k]), at(off, P[k])]
      }
      return out
    }).catch(e => ({ err: String(e) }))
    t.ok(!r.err, r.err); await dump(s, 'crease')
    for (const look of ['normal', 'roblox']) {
      const R = r[look], q = k => R[k][0] / R[k][1]
      t.log(`${look}: luminance AO on/off: corner ${R.corner.map(Math.round)} (x${q('corner').toFixed(2)}), floor ${R.floor.map(Math.round)} (x${q('floor').toFixed(2)}), wall ${R.wall.map(Math.round)} (x${q('wall').toFixed(2)})`)
      t.ok(q('corner') <= 0.85, `${look}: corner at least 15% darker with AO (x${q('corner').toFixed(2)})`)
      t.ok(q('floor') >= 0.96 && q('wall') >= 0.96, `${look}: open faces within 4% of no AO`)
    }
    s.noErrors()
  })

  await t.test('glow: a magenta halo in a ring just outside the part, none far away, ink stays on top; live view too', async () => {
    const s = await t.open({ device: 'desktop' })
    await s.project('Glow', { empty: true }); await inject(s)
    const r = await s.eval(async cam => {
      const A = window.studio.app, vp = A.viewport, W = 960, H = 540
      const id = A.add({ type: 'part', shape: 'box', size: [2, 2, 2], bevel: 0.3, color: '#3cb4ff', pos: [0, 1, 0], glow: '#ff00ff' })
      A.setEnv({ look: 'toon' })
      await vp.setCamera(cam)
      const mag = (p, i) => p[i] - p[i + 1] > 50 && p[i + 2] - p[i + 1] > 50
      const on = await window.__R(A, W, H)
      A.transact('no glow', () => A.set(id, { glow: null })); await new Promise(res => setTimeout(res, 50))
      const off = await window.__R(A, W, H)
      // distance (px) from the part as drawn without glow (part + ink: anything off the background), two-pass chamfer
      const D = new Float32Array(W * H), bg = off.px.slice(0, 3)
      for (let i = 0; i < W * H; i++) D[i] = Math.abs(off.px[i * 4] - bg[0]) + Math.abs(off.px[i * 4 + 1] - bg[1]) + Math.abs(off.px[i * 4 + 2] - bg[2]) > 24 ? 0 : 1e9
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (x) D[i] = Math.min(D[i], D[i - 1] + 1); if (y) D[i] = Math.min(D[i], D[i - W] + 1, x ? D[i - W - 1] + 1.414 : 1e9, x < W - 1 ? D[i - W + 1] + 1.414 : 1e9) }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (x < W - 1) D[i] = Math.min(D[i], D[i + 1] + 1); if (y < H - 1) D[i] = Math.min(D[i], D[i + W] + 1, x < W - 1 ? D[i + W + 1] + 1.414 : 1e9, x ? D[i + W - 1] + 1.414 : 1e9) }
      let ring = 0, ringN = 0, far = 0, farN = 0, inside = 0, insideN = 0
      for (let i = 0; i < W * H; i++) {
        const m = mag(on.px, i * 4) && !mag(off.px, i * 4)
        if (D[i] >= 1 && D[i] <= 6) { ring += m; ringN++ }           // 7 px = glowWidth 14 at 1080p, scaled to 540
        else if (D[i] > 30) { far += m; farN++ }
        else if ([0, 4, -4, 4 * W, -4 * W].every(d => off.px[(i + d) * 4 + 2] > 180 && off.px[(i + d) * 4] < 150)) { inside += Math.abs(on.px[i * 4] - off.px[i * 4]) + Math.abs(on.px[i * 4 + 2] - off.px[i * 4 + 2]); insideN++ }   // the blue part, 4 px in
      }
      const inkKept = (a, b) => {       // ink of render a (dark, a blue part pixel within 3 px): how much is still dark in b
        let n = 0, k = 0
        for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
          const i = (y * W + x) * 4; if (a[i] + a[i + 1] + a[i + 2] > 60) continue
          let blue = false; for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) { const j = i + (dy * W + dx) * 4; if (a[j + 2] > 180 && a[j] < 150) blue = true }
          if (blue) { n++; k += b[i] + b[i + 1] + b[i + 2] < 90 }
        }
        return [k, n]
      }
      // live view: read the canvas in the same task as the frame
      const live = async glow => {
        A.transact('glow', () => A.set(id, { glow })); await new Promise(res => setTimeout(res, 50))
        vp.render(); const gl = vp.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, p = new Uint8Array(w * h * 4)
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, p); let n = 0; for (let i = 0; i < p.length; i += 4) n += mag(p, i); return n
      }
      const liveOff = await live(null), liveOn = await live('#ff00ff')
      // roblox look: the same glow as a thin rim (default glowWidth 6): there, but narrower than toon's, nothing past 12 px
      A.transact('glow', () => A.set(id, { glow: '#ff00ff' })); A.setEnv({ look: 'roblox' }); await new Promise(res => setTimeout(res, 50))
      const rb = await window.__R(A, W, H); let rim = 0, rimFar = 0, toonN = 0
      for (let i = 0; i < W * H; i++) { const m = mag(rb.px, i * 4); rim += m; if (D[i] > 12) rimFar += m; toonN += mag(on.px, i * 4) }
      A.setEnv({ look: 'toon' })
      // behind a wall: no halo shows through it
      const wall = A.add({ type: 'part', shape: 'box', size: [8, 6, 0.5], color: '#30343a', pos: [3, 2, 4] })
      const hidden = await window.__R(A, W, H); let through = 0
      for (let i = 0; i < W * H * 4; i += 4) through += mag(hidden.px, i)
      return { rim, rimFar, toonN, through, ring: ring / ringN, far, farN, inside: inside / insideN, ink: inkKept(off.px, on.px), liveOn, liveOff }
    }, CAM).catch(e => ({ err: String(e) }))
    t.ok(!r.err, r.err); await dump(s, 'glow')
    t.log(`halo: ${(r.ring * 100).toFixed(0)}% of the 1-6 px ring magenta, ${r.far} of ${r.farN} px beyond 30 px; part change ${r.inside?.toFixed(2)}; ink kept ${r.ink?.[0]} of ${r.ink?.[1]} px; live ${r.liveOn} vs ${r.liveOff} px; through a wall ${r.through} px`)
    t.ok(r.ring > 0.6, `halo all round, just outside (${(r.ring * 100).toFixed(0)}% of the ring)`)
    t.ok(r.far === 0, `no halo far away (${r.far} px)`)
    t.ok(r.inside < 2, `the part itself unchanged (${r.inside?.toFixed(2)})`)
    t.ok(r.ink[1] > 200 && r.ink[0] >= r.ink[1] * 0.95, `ink stays over the halo (${r.ink[0]} of ${r.ink[1]} px)`)
    t.ok(r.through === 0, `no halo through a wall in front (${r.through} px)`)
    t.ok(r.rim > 200 && r.rim < r.toonN * 0.8 && r.rimFar === 0, `roblox look: a thinner rim (${r.rim} px vs toon ${r.toonN}, ${r.rimFar} past 12 px)`)
    t.ok(r.liveOn > 300 && r.liveOff === 0, `live view draws the halo (${r.liveOn} px, ${r.liveOff} without)`)
    s.noErrors()
  })

  await t.test('phone: live toon view draws the halo (scissored, phone pixel ratio) and ink without errors', async () => {
    const s = await t.open({ device: 'phone' })
    await s.project('Phone', { empty: true })
    const r = await s.eval(async cam => {
      const A = window.studio.app, vp = A.viewport
      A.add({ type: 'part', shape: 'box', size: [2, 2, 2], bevel: 0.3, color: '#3cb4ff', pos: [0, 1, 0], glow: '#ff00ff', glowWidth: 20 })
      A.setEnv({ look: 'toon' }); await vp.setCamera(cam); await new Promise(res => setTimeout(res, 50))
      vp.render(); const gl = vp.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, p = new Uint8Array(w * h * 4)
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, p)
      let n = 0, ink = 0; for (let i = 0; i < p.length; i += 4) { n += p[i] - p[i + 1] > 50 && p[i + 2] - p[i + 1] > 50; ink += p[i] + p[i + 1] + p[i + 2] < 60 }
      return { n, ink, dpr: vp.renderer.getPixelRatio() }
    }, CAM).catch(e => ({ err: String(e) }))
    t.ok(!r.err, r.err)
    t.log(`phone (dpr ${r.dpr}): ${r.n} halo px, ${r.ink} ink px`)
    t.ok(r.n > 1000 && r.ink > 500, 'halo and ink on the phone canvas')
    s.noErrors()
  })

  await t.test('speed caps: 1920x1080 PNG of 60 parts under 8 s; live toon frame within 1.5x of normal, hero glow under 1 ms', async () => {
    const s = await t.open({ device: 'desktop' })
    await s.project('Sixty', { empty: true }); await inject(s)
    const r = await s.eval(async src => {
      const A = window.studio.app, vp = A.viewport
      const ids = (0, eval)(src)()
      await vp.setCamera({ pos: [18, 14, 22], target: [0, 1, 0] })
      const two = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)))
      const frames = async (n, ms) => { for (let i = 0; i < n; i++) { const k = vp.stats.renders; vp.requestRender(); await two(); if (ms && vp.stats.renders > k) ms.push(vp.stats.lastMs) } }
      // trimmed mean: the page clock ticks in 0.1 ms steps with jitter, a median of ~1 ms frames sticks to a step
      const med = ms => { ms.sort((a, b) => a - b); const k = ms.slice(ms.length / 5, ms.length - ms.length / 5); return k.reduce((a, b) => a + b, 0) / k.length }, N = [], T = []
      const G = [], hero = ids[25], glow = g => A.transact('glow', () => A.set(hero, { glow: g }))
      for (let round = 0; round < 4; round++) {      // interleaved, warm frames dropped: one slow moment can't decide it
        A.setEnv({ look: null }); await frames(3); await frames(8, N)
        A.setEnv({ look: 'toon' }); await frames(3); await frames(8, T)
        glow('#ffd21f'); await frames(3); await frames(8, G); glow(null)
      }
      const normal = med(N), toon = med(T), toonGlow = med(G)
      glow('#ffd21f'); await frames(2)
      // everything the render changes for its length comes back: layers, materials, the sun's shadow map, the target
      const state = () => { const l = []; vp.scene.traverse(o => { l.push(o.layers.mask); for (const m of [].concat(o.material || [])) l.push(m.colorWrite, m.depthWrite, m.visible) }); return JSON.stringify([l, vp.sun.shadow.mapSize.x, vp.sun.shadow.radius, vp.scene.overrideMaterial, vp.renderer.getRenderTarget(), vp.renderer.autoClear]) }
      const before = state(), t0 = performance.now(), im = await window.__R(A, 1920, 1080), sec = (performance.now() - t0) / 1000
      const restored = state() === before
      A.setEnv({ look: 'roblox' }); await frames(3)
      const t1 = performance.now(), rim = await window.__R(A, 1920, 1080), secR = (performance.now() - t1) / 1000
      return { n: ids.length, normal, toon, toonGlow, sec, secR, rw: [rim.w, rim.h], w: im.w, h: im.h, type: im.type, restored }
    }, `(${SIXTY})`).catch(e => ({ err: String(e) }))
    t.ok(!r.err, r.err); await dump(s, 'sixty')
    t.log(`60 parts: render ${r.sec?.toFixed(2)} s (roblox ${r.secR?.toFixed(2)} s); live frame normal ${r.normal?.toFixed(2)} ms, toon ${r.toon?.toFixed(2)} ms (x${(r.toon / r.normal).toFixed(2)}), toon + glow ${r.toonGlow?.toFixed(2)} ms (x${(r.toonGlow / r.normal).toFixed(2)})`)
    t.eq(r.n, 60, '60 parts')
    t.eq([r.w, r.h, r.type], [1920, 1080, 'image/png'], 'a 1920x1080 PNG')
    t.ok(r.sec < 8, `render under 8 s (${r.sec?.toFixed(2)} s)`)
    t.ok(r.secR < 8 && r.rw[0] === 1920 && r.rw[1] === 1080, `roblox look render under 8 s (${r.secR?.toFixed(2)} s)`)
    t.ok(r.toon <= r.normal * 1.5, `live toon frame within 1.5x of normal (${(r.toon / r.normal).toFixed(2)}x)`)
    // the glow's own cost against toon, same interleaved loop (a ratio to the ~0.8 ms normal frame swung 1.1-2.2x on clock noise)
    t.ok(r.toonGlow - r.toon < 1, `live hero glow adds under 1 ms a frame (${(r.toonGlow - r.toon).toFixed(2)} ms)`)
    t.ok(r.restored, 'the render puts back layers, materials, shadow map and target')
    s.noErrors()
  })
}
