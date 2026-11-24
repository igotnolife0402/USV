// Anim plugin: clips, keys, scrubbing, playback, presets on the R6 rig, undo, auto-key, timeline UI, toClips (GLB export).
const clipOf = s => s.eval(() => { const a = window.studio.app; return a.scene.anims[a.anim.clip] || null })
const sleep = ms => new Promise(r => setTimeout(r, ms))

export default async function (t) {
  await t.test('smooth ease: key poses on a wave\'s peaks replay the sine exactly (few keys, no per-frame keys)', async () => {
    const s = await t.open()
    await s.project('Smooth', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 0.5, 0] })
    const cid = await s.run('anim.new', { name: 'Wave', len: 2, fps: 30 })
    const r = await s.eval(([id, cid]) => {
      const A = window.studio.app
      A.patchAnim(cid, { tracks: { [id]: { rot: [[0, [30, 0, 0], 'smooth'], [0.5, [-30, 0, 0], 'smooth'], [1, [30, 0, 0], 'smooth']] } } })
      const out = []
      for (const tt of [0.1, 0.25, 0.4, 0.7]) { A.setTime(tt); out.push([+(A.viewport.objects.get(id).rotation.x * 180 / Math.PI).toFixed(3), +(30 * Math.cos(2 * Math.PI * tt)).toFixed(3)]) }
      return out
    }, [id, cid])
    for (const [got, want] of r) t.near(got, want, 0.01, 'eased value = 30 cos(2 pi t)')
    s.noErrors()
  })

  await t.test('clip camera: keyed pos/target/fov drive the view mid-clip, shake 0 is exact, Follow off and leaving Animate restore the view', async () => {
    const s = await t.open()
    await s.project('Cam', { empty: true })
    await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.run('anim.mode')
    const cid = await s.run('anim.new', { name: 'Shot', len: 2, fps: 30 })
    const r = await s.eval(cid => {
      const A = window.studio.app, vp = A.viewport, run = (c, a) => A.exec(c, a)
      vp.setCamera({ pos: [9, 9, 9], target: [0, 0, 0], fov: 50 }); const user = vp.getCamera()
      A.setTime(0); run('anim.camKey', { values: { pos: [0, 2, 10], target: [0, 1, 0], fov: 40, shake: 0 } })
      A.setTime(2); run('anim.camKey', { values: { pos: [10, 2, 0], target: [0, 3, 0], fov: 60, shake: 0 } })
      A.setTime(1); const mid = vp.getCamera()
      const keys = A.scene.anims[cid].camera
      run('anim.camFollow', { on: false }); const off = vp.getCamera()
      run('anim.camFollow', { on: true }); A.setTime(1)
      A.setMode('build'); const back = vp.getCamera()
      return { mid, off, back, user, n: keys.pos.length, fovKeys: keys.fov.length }
    }, cid)
    t.eq(r.n, 2, 'two pos keys'); t.eq(r.fovKeys, 2, 'fov keyed')
    t.near(r.mid.pos[0], 5, 0.01, 'smooth midpoint x'); t.near(r.mid.pos[2], 5, 0.01, 'smooth midpoint z'); t.near(r.mid.target[1], 2, 0.01, 'target midpoint')
    t.near(r.mid.fov, 50, 0.01, 'fov midpoint')
    t.near(r.off.pos[0], r.user.pos[0], 0.01, 'Follow off puts the user view back'); t.near(r.back.pos[1], r.user.pos[1], 0.01, 'leaving Animate puts the user view back')
    s.noErrors()
  })

  await t.test('clip letterbox: camera.bars keyed 0 -> 1 draws black bars top and bottom at 2.39:1, none at amount 0', async () => {
    const s = await t.open({ device: 'desktop' })
    await s.project('Bars', { empty: true })
    await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.run('anim.mode')
    const cid = await s.run('anim.new', { name: 'Bars', len: 2, fps: 30 })
    const r = await s.eval(cid => {
      const A = window.studio.app, vp = A.viewport, cv = vp.renderer.domElement
      A.scene.env.bg = '#ffffff'
      A.patchAnim(cid, { camera: { bars: [[0, 0, 'linear'], [1, 1, 'linear']] } })
      const px = t => { A.setTime(t); vp.render(); const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0)
        const at = y => [...g.getImageData(Math.floor(cv.width / 2), y, 1, 1).data].slice(0, 3)
        const want = cv.width / 2.39, bar = Math.max(0, (cv.height - want) / 2)
        return { top: at(2), bottom: at(cv.height - 3), mid: at(Math.floor(cv.height / 2)), bar, w: cv.width, h: cv.height } }
      return { on: px(1.5), off: px(0) }
    }, cid)
    t.ok(r.on.bar > 4, 'canvas is taller than 2.39:1 ' + JSON.stringify(r.on))
    t.ok(r.on.top.every(v => v < 8) && r.on.bottom.every(v => v < 8), 'black bars at amount 1 ' + JSON.stringify(r.on))
    t.ok(r.off.top.some(v => v > 16), 'no bar at amount 0 (sky shows) ' + JSON.stringify(r.off.top))
    s.noErrors()
  })

  await t.test('clip + keys at 0 s and 1 s: scrubbing to 0.5 s interpolates, rest pose stays', async () => {
    const s = await t.open()
    await s.project('Anim', { empty: true })
    await s.run('anim.mode')
    t.eq(await s.eval(() => window.studio.app.mode), 'animate', 'animate mode')
    const id = await s.run('parts.box', { pos: [0, 0.5, 0] })
    const cid = await s.run('anim.new', { name: 'Slide', len: 2, fps: 30 })
    t.eq(await s.eval(() => window.studio.app.anim.clip), cid, 'new clip is current')
    await s.run('anim.key', { ids: [id], t: 0, channels: ['pos'] })
    await s.run('anim.setKey', { id, ch: 'pos', t: 1, value: [10, 0.5, 0] })
    const c = await clipOf(s)
    t.eq(c.tracks[id].pos, [[0, [0, 0.5, 0]], [1, [10, 0.5, 0]]], 'two pos keys in the README format')
    const r = await s.eval(id => { const a = window.studio.app; a.setTime(0.5); return { x: a.viewport.objects.get(id).position.x, pos: a.obj(id).pos } }, id)
    t.near(r.x, 5, 1e-3, 'Object3D at the midpoint')
    t.eq(r.pos, [0, 0.5, 0], 'scene object keeps its rest pose')
    t.near(await s.eval(id => window.studio.app.poseOf(id).pos[0], id), 5, 1e-3, 'poseOf gives the posed value')
    await s.run('anim.ease', { ease: 'step', keys: [{ id, ch: 'pos', t: 0 }] })
    t.near(await s.eval(id => { const a = window.studio.app; a.setTime(0.75); return a.viewport.objects.get(id).position.x }, id), 0, 1e-3, 'step easing holds the first key')
    // core may do a trailing render after a change, later on a slow software GPU: wait until renders settle (max 3 s), then expect none
    let r0 = await s.eval(() => window.studio.app.viewport.stats.renders)
    for (let i = 0; i < 6; i++) { await sleep(600); const r = await s.eval(() => window.studio.app.viewport.stats.renders); if (r === r0) break; r0 = r }   // 600 ms quiet: the sync echo re-poses once ~1 s after an edit
    await sleep(400)
    t.eq(await s.eval(() => window.studio.app.viewport.stats.renders), r0, 'no renders while idle (on demand)')
    await s.eval(() => window.studio.app.setMode('build'))
    t.near(await s.eval(id => window.studio.app.viewport.objects.get(id).position.x, id), 0, 1e-3, 'leaving Animate restores the rest pose')
    s.noErrors()
  })

  await t.test('play advances time, pause stops the loop, Space and K keys', async () => {
    const s = await t.open()
    await s.project('Play', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.run('anim.mode')
    await s.run('anim.spin', { ids: [id] })
    await s.eval(() => { window.__lt = []; try { new PerformanceObserver(l => window.__lt.push(...l.getEntries().map(e => e.duration))).observe({ type: 'longtask' }) } catch {} })
    await s.run('anim.play')
    await sleep(400)
    const lt = await s.eval(() => window.__lt)
    t.log('long tasks while playing (ms)', JSON.stringify(lt))
    t.ok(!lt.some(d => d > 50), 'no long task over 50 ms while playing')
    const p = await s.eval(() => ({ t: window.studio.app.time, playing: window.studio.app.anim.playing }))
    t.ok(p.playing && p.t > 0.15, 'time moved while playing: ' + p.t.toFixed(3))
    const rot = await s.eval(id => window.studio.app.viewport.objects.get(id).rotation.y, id)
    t.ok(Math.abs(rot) > 0.05, 'spin turns the box: ' + rot.toFixed(3))
    await s.run('anim.pause')
    await s.idle()
    const r0 = await s.eval(() => [window.studio.app.time, window.studio.app.viewport.stats.renders])
    await sleep(250)
    const r1 = await s.eval(() => [window.studio.app.time, window.studio.app.viewport.stats.renders])
    t.eq(r1, r0, 'paused: time and render count stand still')
    await s.page.mouse.click(720, 300)
    await s.eval(id => window.studio.app.select([id]), id)
    await s.page.keyboard.press('Space')
    await sleep(150)
    t.ok(await s.eval(() => window.studio.app.anim.playing), 'Space plays')
    await s.page.keyboard.press('Space')
    t.ok(!(await s.eval(() => window.studio.app.anim.playing)), 'Space pauses')
    await s.eval(() => window.studio.app.setTime(1.5))
    await s.page.keyboard.press('k')
    const c = await clipOf(s)
    t.ok(c.tracks[id].pos?.some(k => Math.abs(k[0] - 1.5) < 1e-3), 'K keyed the selection at the playhead')
    t.ok(c.tracks[id].rot?.some(k => Math.abs(k[0] - 1.5) < 1e-3), 'K keys rotation too')
    s.noErrors()
  })

  await t.test('walk and wave presets write rot tracks on the R6 joints; limbs pivot at the top', async () => {
    const s = await t.open()
    await s.project('Walk', { empty: true })
    const rig = await s.run('parts.rig', { pos: [0, 0, 0] })
    const kid = await s.eval(id => Object.fromEntries(window.studio.app.children(id).map(k => [window.studio.app.obj(k).name, k])), rig)
    await s.run('anim.walk', { ids: [rig] })
    const c = await clipOf(s)
    const limbs = ['Left Arm', 'Right Arm', 'Left Leg', 'Right Leg']
    t.eq(limbs.map(n => !!c.tracks[kid[n]]?.rot?.length), [true, true, true, true], 'rot track on each limb')
    t.ok(c.tracks[rig]?.pos?.length >= 4, 'root bobs')
    t.eq(await s.eval(() => window.studio.app.mode), 'animate', 'preset opens Animate')
    const m = await s.eval(id => {
      const a = window.studio.app, o = a.viewport.objects.get(id), V = o.position.constructor
      a.setTime(0); a.anim.evaluate(0); o.updateWorldMatrix(true, false)
      const top = o.localToWorld(new V(0, 1, 0)).toArray(), rx = o.rotation.x
      return { top, rx }
    }, kid['Left Leg'])
    t.ok(Math.abs(m.rx) > 0.4, 'leg swung: ' + m.rx.toFixed(2) + ' rad')
    t.near(m.top, [-0.5, 2, 0], 0.06, 'hip stays put while the leg swings')
    await s.run('anim.new', { name: 'Hi' })
    await s.run('anim.wave', { ids: [kid['Torso']] })
    const w = await clipOf(s)
    t.ok(w.tracks[kid['Right Arm']]?.rot?.length >= 5, 'wave keys the right arm')
    const up = await s.eval(id => { const a = window.studio.app; a.setTime(1); const o = a.viewport.objects.get(id); o.updateWorldMatrix(true, false); return o.localToWorld(new o.position.constructor(0, -1, 0)).y }, kid['Right Arm'])
    t.ok(up > 4.8, 'hand raised above the shoulder: y ' + up.toFixed(2))
    t.eq(await s.eval(id => window.studio.app.obj(id).rot, kid['Right Arm']), [0, 0, 0], 'rig rest pose untouched')
    s.noErrors()
  })

  await t.test('undo removes keys; delete, move, copy and paste keys; clip ops', async () => {
    const s = await t.open()
    await s.project('Undo', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.run('anim.mode')
    await s.run('anim.new', { name: 'A', len: 2 })
    await s.run('anim.key', { ids: [id], t: 0, channels: ['pos'] })
    await s.run('anim.setKey', { id, ch: 'pos', t: 1, value: [4, 0.5, 0] })
    t.eq((await clipOf(s)).tracks[id].pos.length, 2)
    await s.run('edit.undo')
    t.eq((await clipOf(s)).tracks[id].pos.length, 1, 'undo removed the 1 s key')
    await s.run('edit.undo')
    t.ok(!(await clipOf(s))?.tracks?.[id]?.pos?.length, 'undo removed the 0 s key')
    await s.run('edit.redo'); await s.run('edit.redo')
    await s.run('anim.selectKeys', { keys: [{ id, ch: 'pos', t: 1 }] })
    await s.run('anim.moveKeys', { dt: 0.5 })
    t.eq((await clipOf(s)).tracks[id].pos.map(k => k[0]), [0, 1.5], 'moved key 0.5 s later')
    await s.run('anim.copyKeys')
    await s.eval(() => window.studio.app.setTime(1.8))
    await s.run('anim.pasteKeys')
    t.eq((await clipOf(s)).tracks[id].pos.map(k => k[0]), [0, 1.5, 1.8], 'paste at the playhead')
    await s.run('anim.selectKeys', { keys: [{ id, ch: 'pos', t: 1.8 }] })
    await s.run('anim.deleteKeys')
    t.eq((await clipOf(s)).tracks[id].pos.map(k => k[0]), [0, 1.5], 'deleted')
    const d = await s.run('anim.duplicate')
    await s.run('anim.set', { name: 'Copy', len: 3, fps: 24, loop: false })
    t.eq(await s.eval(d => { const c = window.studio.app.scene.anims[d]; return [c.name, c.len, c.fps, c.loop] }, d), ['Copy', 3, 24, false], 'duplicate + set')
    await s.run('anim.delete')
    t.ok(!(await s.eval(d => window.studio.app.scene.anims[d], d)), 'clip deleted')
    s.noErrors()
  })

  await t.test('auto-key: a gizmo move in Animate records a key at the playhead', async () => {
    const s = await t.open()
    await s.project('Auto', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.run('anim.mode')
    t.ok(!(await s.eval(id => window.studio.app.onTransform([[id, { pos: [3, 0.5, 0] }]], 'Move'), id)), 'auto-key off: edit goes to the scene')
    await s.run('anim.autokey', { on: true })
    await s.eval(() => window.studio.app.setTime(0.5))
    const took = await s.eval(id => window.studio.app.onTransform([[id, { pos: [3, 2, 0] }]], 'Move'), id)
    t.ok(took, 'hook took the edit')
    const c = await clipOf(s)
    t.ok(c.tracks[id].pos.some(k => Math.abs(k[0] - 0.5) < 1e-3 && Math.abs(k[1][1] - 2) < 1e-3), 'key at 0.5 s')
    t.eq(await s.eval(id => window.studio.app.obj(id).pos, id), [0, 0.5, 0], 'scene object not moved')
    await s.run('edit.undo')
    t.ok(!(await clipOf(s))?.tracks?.[id]?.pos?.some(k => Math.abs(k[0] - 0.5) < 1e-3), 'one undo removes the auto key')
    s.noErrors()
  })

  await t.test('toClips: THREE.AnimationClip per clip with tracks; GLTFExporter takes them', async () => {
    const s = await t.open()
    await s.project('Export', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.run('anim.bounce', { ids: [id] })
    await s.run('anim.new', { name: 'Tint' })
    await s.run('anim.setKey', { id, ch: 'color', t: 0, value: '#ff0000' })
    await s.run('anim.setKey', { id, ch: 'color', t: 1, value: '#0000ff' })
    const r = await s.eval(() => window.studio.app.anim.toClips().map(c => ({ name: c.name, dur: c.duration, tracks: c.tracks.map(k => k.name.split('.').pop()), n: c.tracks[0]?.times.length })))
    t.log('clips', JSON.stringify(r))
    t.ok(r.length === 1 && r[0].tracks.includes('position') && r[0].tracks.includes('scale'), 'bounce clip has position + scale tracks (colour-only clip skipped by default)')
    const all = await s.eval(() => window.studio.app.anim.toClips({ all: true }).map(c => c.tracks.map(k => k.name.split('.').slice(1).join('.'))))
    t.ok(all.some(x => x.includes('material.color')), 'all: true adds colour tracks')
    await s.run('edit.select', { ids: [] }) // the selection outline is a ShaderMaterial helper, not part of the model
    const glb = await s.eval(async () => {
      try {
        const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js')
        const a = window.studio.app
        const out = await new GLTFExporter().parseAsync(a.viewport.world, { binary: false, animations: a.anim.toClips() })
        return { n: out.animations?.length || 0, ch: out.animations?.[0]?.channels?.length || 0 }
      } catch (e) { return { err: String(e.message || e) } }
    })
    t.log('gltf', JSON.stringify(glb))
    if (!glb.err) t.ok(glb.n === 1 && glb.ch >= 2, 'GLTF has the animation with channels')
    s.noErrors()
  })

  await t.test('imported model clips play through AnimationMixer, listed read-only', async () => {
    const s = await t.open({ allowErrors: ['404', 'Model file not found'] }) // the stand-in model has no real asset
    await s.project('Model', { empty: true })
    await s.run('anim.mode')
    const r = await s.eval(async () => {
      const a = window.studio.app, THREE = await import('three')
      const id = a.add({ type: 'model', name: 'Bot', src: { asset: 'test' } })
      await new Promise(r => setTimeout(r, 100))
      const o = a.viewport.objects.get(id), m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial())
      m.name = 'Spinner'; o.add(m) // stands in for a loaded GLB scene
      o.animations = [new THREE.AnimationClip('Run', 2, [new THREE.VectorKeyframeTrack('Spinner.position', [0, 2], [0, 0, 0, 8, 0, 0])])]
      const list = a.anim.modelClips().map(c => c.key)
      await window.studio.run('anim.select', { id: list[0] })
      a.setTime(1)
      const x = m.position.x
      const opts = [...document.querySelectorAll('.an-clip option')].map(o => o.textContent)
      let err = ''; try { await window.studio.run('anim.key', { ids: [id] }) } catch (e) { err = e.message }
      return { list, x, opts, err, clip: a.anim.clip }
    })
    t.log(JSON.stringify(r))
    t.eq(r.list.length, 1, 'model clip found')
    t.near(r.x, 4, 1e-3, 'mixer poses the model at 1 s')
    t.ok(r.opts.some(o => /Bot: Run/.test(o)), 'clip dropdown lists the imported clip')
    t.ok(/read-only/i.test(r.err), 'imported clips are read-only')
    s.noErrors()
  })

  await t.test('timeline UI: click a key, drag it 15 frames, ease menu; desktop screenshot', async () => {
    const s = await t.open()
    await s.project('Timeline', { empty: true })
    const rig = await s.run('parts.rig', { pos: [0, 0, 0] })
    await s.run('anim.walk', { ids: [rig] })
    const box = await s.run('parts.box', { pos: [6, 0.5, 0], color: '#e5484d' })
    await s.run('anim.bob', { ids: [box] })
    await s.eval(r => window.studio.app.select([r]), rig)
    await s.eval(() => window.studio.app.setTime(0.5))
    await s.idle()
    const cv = await s.eval(() => { const c = document.querySelector('.an-cv'); if (!c) return null; const b = c.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height } })
    t.ok(cv && cv.w > 600 && cv.h > 80, 'timeline canvas laid out: ' + JSON.stringify(cv))
    const bar = await s.eval(() => { const b = document.querySelector('.an-bar'), r = b.getBoundingClientRect(), k = [...b.querySelectorAll('button,select,input')]; return { clip: document.querySelector('.an-clip').getBoundingClientRect().width, n: k.length, inside: k.filter(e => { const q = e.getBoundingClientRect(); return q.width > 0 && q.right <= r.right + 1 }).length, minH: Math.min(...k.map(e => e.getBoundingClientRect().height)) } })
    t.log('desktop bar', JSON.stringify(bar))
    t.ok(bar.clip <= 200 && bar.inside === bar.n, 'whole clip bar fits on one row')
    t.ok(bar.minH >= 26, '28 px desktop controls: ' + bar.minH)
    // first row = the rig group; its pos key at 0 s sits at x = NW + PAD (desktop 190 + 10)
    const y = cv.y + 24 + 11, x0 = cv.x + 200
    await s.page.mouse.click(x0, y)
    t.ok((await s.eval(() => window.studio.app.anim.selectedKeys.length)) >= 1, 'click selects the key column')
    const sel = await s.eval(() => window.studio.app.anim.selectedKeys.length)
    const pps = (cv.w - 190 - 20) / 1 // walk clip is 1 s long
    await s.page.mouse.move(x0, y); await s.page.mouse.down()
    await s.page.mouse.move(x0 + pps * 0.25, y, { steps: 6 }); await s.page.mouse.move(x0 + pps * 0.5, y, { steps: 6 })
    await s.page.mouse.up()
    const times = await s.eval(r => window.studio.app.scene.anims[window.studio.app.anim.clip].tracks[r].pos.map(k => k[0]), rig)
    t.ok(times.includes(0.5), 'dragged key snapped to 0.5 s (frame 15): ' + JSON.stringify(times))
    await s.run('edit.undo')
    const back = await s.eval(r => window.studio.app.scene.anims[window.studio.app.anim.clip].tracks[r].pos.map(k => k[0]), rig)
    t.ok(back.includes(0), 'undo puts the drag back')
    t.log('selected by click', sel)
    await s.page.mouse.click(x0, y, { button: 'right' })
    await s.idle()
    t.ok(await s.eval(() => [...document.querySelectorAll('.m-item')].some(b => /Bounce/.test(b.textContent))), 'key menu lists easings')
    await s.page.keyboard.press('Escape')
    // box select over the Left Arm and Right Arm rows from 0.1 s to 0.6 s, then Delete removes keys, not objects
    await s.page.mouse.move(x0 + pps * 0.1, cv.y + 24 + 22 + 2); await s.page.mouse.down()
    await s.page.mouse.move(x0 + pps * 0.6, cv.y + 24 + 66 - 2, { steps: 8 }); await s.page.mouse.up()
    const boxed = await s.eval(() => window.studio.app.anim.selectedKeys.map(k => k.split('\u0001')))
    t.log('box', boxed.length)
    t.ok(boxed.length >= 4 && boxed.every(k => +k[2] > 0.09 && +k[2] < 0.61), 'box select picks keys inside the box only')
    const n0 = await s.eval(() => Object.keys(window.studio.app.scene.objects).length)
    await s.page.keyboard.press('Delete')
    const after = await s.eval(([ids]) => ({ n: Object.keys(window.studio.app.scene.objects).length, left: ids.filter(([id, ch, t]) => window.studio.app.scene.anims[window.studio.app.anim.clip].tracks[id]?.[ch]?.some(k => Math.abs(k[0] - t) < 1e-4)).length }), [boxed])
    t.eq([after.n, after.left], [n0, 0], 'Delete removed the boxed keys and kept the objects')
    await s.page.keyboard.press('Control+z')
    t.eq(await s.eval(([ids]) => ids.filter(([id, ch, t]) => window.studio.app.scene.anims[window.studio.app.anim.clip].tracks[id]?.[ch]?.some(k => Math.abs(k[0] - t) < 1e-4)).length, [boxed]), boxed.length, 'Ctrl+Z brings the keys back')
    await s.eval(() => window.studio.app.setTime(0.3))
    await s.idle()
    await s.shot('desktop-anim.png')
    s.noErrors()
  })

  await t.test('phone: Timeline sheet with 44 px controls; screenshot', async () => {
    const s = await t.open({ device: 'phone' })
    await s.project('Phone', { empty: true })
    const rig = await s.run('parts.rig', { pos: [0, 0, 0] })
    await s.run('anim.walk', { ids: [rig] })
    await s.eval(() => window.studio.app.setTime(0.3))
    await s.idle(); await sleep(400)
    const ui = await s.eval(() => {
      const r = document.querySelector('.an-root'), cv = document.querySelector('.an-cv')
      const bs = [...document.querySelectorAll('.an-bar button')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect())
      const vis = x => !!x && x.getBoundingClientRect().height > 0
      return { root: vis(r), cv: cv ? cv.getBoundingClientRect().height : 0, minH: Math.min(...bs.map(b => b.height)), n: bs.length, over: document.documentElement.scrollWidth - innerWidth }
    })
    t.log('phone ui', JSON.stringify(ui))
    t.ok(ui.root && ui.cv > 60, 'timeline visible on phone')
    t.ok(ui.minH >= 44, 'touch targets ≥ 44 px: ' + ui.minH)
    t.ok(ui.over <= 0, 'no sideways scroll')
    await s.shot('phone-anim.png')
    s.noErrors()
  })

  await t.test('quality sampler: rot slerps (spins keep Euler), auto passes through keys without stopping, cubic ease, warp slow-mo', async () => {
    const s = await t.open()
    await s.project('Sampler', { empty: true })
    const r = await s.eval(async () => {
      const THREE = await import('three'), { sample, easeFn } = window.studio.app.anim, D = Math.PI / 180
      const a = [0, 0, 0], b = [0, 90, 90], mid = sample([[0, a], [1, b]], 0.5, 'rot')
      const qa = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)), qb = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 90 * D, 90 * D))
      const want = qa.clone().slerp(qb, 0.5), got = new THREE.Quaternion().setFromEuler(new THREE.Euler(mid[0] * D, mid[1] * D, mid[2] * D))
      const spin = sample([[0, [0, 0, 0]], [1, [0, 360, 0]]], 0.5, 'rot')
      const K = [[0, [0], 'auto'], [1, [1], 'auto'], [2, [3], 'auto'], [3, [4]]]
      const v = (t, h = 1e-3) => (sample(K, t + h, 'pos')[0] - sample(K, t - h, 'pos')[0]) / (2 * h)
      const cub = easeFn('cubic:0.42,0,0.58,1'), sm = easeFn('ease')
      return { err: got.angleTo(want) / D, spin: spin[1], through: [sample(K, 1, 'pos')[0], sample(K, 2, 'pos')[0]], vmid: v(1), vend: v(2.5),
               cub: [cub(0.25), cub(0.5), cub(0.75)], sm: sm(0.5) }
    })
    t.ok(r.err < 0.5, 'slerp midpoint within 0.5 deg: ' + r.err)
    t.near(r.spin, 180, 0.01, 'a 360 spin keeps the Euler path')
    t.near(r.through, [1, 3], 1e-6, 'auto passes through its keys')
    t.ok(Math.abs(r.vmid) > 0.5, 'auto keeps speed through the middle key: ' + r.vmid)
    t.near(r.cub[1], 0.5, 0.01, 'cubic ease is symmetric'); t.ok(r.cub[0] < 0.25 && r.cub[2] > 0.75, 'cubic ease in-out shape')
    const w = await s.eval(() => {
      const A = window.studio.app, id = A.addPart ? null : null
      return null
    })
    const id = await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.run('anim.mode')
    const cid = await s.run('anim.new', { name: 'Warp', len: 2, fps: 30 })
    const pos = await s.eval(([id, cid]) => {
      const A = window.studio.app
      A.patchAnim(cid, { tracks: { [id]: { pos: [[0, [0, 0.5, 0]], [2, [4, 0.5, 0]]] } }, warp: [[0, 0], [1, 0.25], [2, 2]] })
      A.setTime(1); const x1 = A.viewport.objects.get(id).position.x
      A.setTime(0.5); const xh = A.viewport.objects.get(id).position.x
      return { x1, xh, story: A.anim.story(1) }
    }, [id, cid])
    t.near(pos.story, 0.25, 1e-6, 'story time at clip 1 s'); t.near(pos.x1, 0.5, 1e-3, 'object at story 0.25 s (slow-mo)'); t.near(pos.xh, 0.25, 1e-3, 'half-speed ramp')
    s.noErrors()
  })

  await t.test('rigging: two-bone IK lands the hand on its target, mirror copies L->R, lint flags jumps and dead holds', async () => {
    const s = await t.open()
    await s.project('Rig', { empty: true })
    await s.run('anim.mode')
    const r = await s.eval(async () => {
      const A = window.studio.app, add = o => A.exec('parts.box', o)
      // a chain: shoulder group at (0,3,0), elbow group 1 stud down, wrist group 1 stud further
      const sh = A.add({ type: 'group', name: 'LeftShoulder', pos: [0, 3, 0], rot: [0, 0, 0] })
      const el = A.add({ type: 'group', name: 'LeftElbow', parent: sh, pos: [0, -1, 0], rot: [0, 0, 0] })
      const wr = A.add({ type: 'group', name: 'LeftWrist', parent: el, pos: [0, -1, 0], rot: [0, 0, 0] })
      const rs = A.add({ type: 'group', name: 'RightShoulder', pos: [2, 3, 0], rot: [0, 0, 0] })
      const cid = A.exec('anim.new', { name: 'IK', len: 6, fps: 30 }); A.setTime(1)
      const ik = A.exec('anim.ik', { chain: [sh, el, wr], target: [1.2, 2.4, 0.3], pole: [0, 3, 2], t: 1 })
      const n = A.exec('anim.mirror', { t: 1 })
      const c = A.scene.anims[A.anim.clip]
      const mir = [c.tracks[sh].rot.at(-1)[1], c.tracks[rs]?.rot?.at(-1)?.[1]]
      // a bad clip: a 170 deg jump, then a 3 s hold
      A.patchAnim(A.anim.clip, { loop: false, tracks: { ...c.tracks, [el]: { rot: [[0, [0, 0, 0]], [0.05, [170, 0, 0]], [1, [170, 0, 0]]] } } })
      const bad = A.exec('anim.lint')
      return { ik, mir, n, types: [...new Set(bad.map(i => i.type))], bad: bad.slice(0, 4) }
    })
    t.ok(r.ik.reached && r.ik.miss < 0.01, 'IK end on target: ' + JSON.stringify(r.ik))
    t.ok(r.n >= 1, 'mirror wrote the right side'); t.near(r.mir[1], [r.mir[0][0], -r.mir[0][1], -r.mir[0][2]], 1e-3, 'mirrored rot = [x,-y,-z]')
    t.ok(r.types.includes('euler-jump') && r.types.includes('dead-hold') && r.types.includes('pose-snap'), 'lint flags jump, snap, hold: ' + JSON.stringify(r.bad))
    const clean = await s.eval(() => { const A = window.studio.app, c = A.exec('anim.new', { name: 'Clean', len: 2, fps: 30 }); const o = Object.keys(A.scene.objects)[0]
      A.patchAnim(A.anim.clip, { tracks: { [o]: { rot: [[0, [0, 0, 0], 'auto'], [1, [0, 40, 0], 'auto'], [2, [0, 0, 0]]] } } }); return A.exec('anim.lint') })
    t.eq(clean, [], 'a clean clip lints to 0 issues')
    s.noErrors()
  })

  await t.test('cinematic baseline: anim.cine adds eased push-in, slow-mo into the payoff, dip + flash, hit-stop, shake, settle; idempotent; lints clean', async () => {
    const s = await t.open({ device: 'desktop' })
    await s.project('Cine', { empty: true })
    await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.run('anim.mode')
    const r = await s.eval(() => {
      const A = window.studio.app, vp = A.viewport, cv = vp.renderer.domElement, o = Object.keys(A.scene.objects)[0]
      A.scene.env.bg = '#808080'
      const cid = A.exec('anim.new', { name: 'Hit', len: 4, fps: 30 })
      A.patchAnim(cid, { loop: false, tracks: { [o]: { pos: [[0, [0, 0.5, 0], 'auto'], [2.5, [0, 0.5, 3], 'auto'], [4, [0, 0.5, 3.4]]] } } })
      vp.setCamera({ pos: [8, 3, 8], target: [0, 0.5, 1.5], fov: 45 })
      const res = A.exec('anim.cine', { payoff: 2.5 })
      const c = A.scene.anims[cid], w = c.warp, cam = c.camera
      const slopes = w.slice(1).map((k, i) => (k[1] - w[i][1]) / (k[0] - w[i][0]))
      const pc = w.find(k => Math.abs(k[1] - 2.5) < 1e-4)[0]
      const luma = t => { A.setTime(t); vp.render(); const g = document.createElement('canvas'); g.width = cv.width; g.height = cv.height; const x = g.getContext('2d', { willReadFrequently: true }); x.drawImage(cv, 0, 0)
        const d = x.getImageData(4, 4, 1, 1).data; return (d[0] + d[1] + d[2]) / 3 }
      const lum = { before: luma(0.5), dip: luma(pc - 0.2), peak: luma(pc + 0.02), after: luma(c.len - 0.1) }
      const once = JSON.stringify(A.scene.anims[cid]); A.exec('anim.cine', { payoff: 2.5 }); const twice = JSON.stringify(A.scene.anims[cid])
      const lint = A.exec('anim.lint')
      // per-call override: push 0.2 closes 20 % of the distance instead of 45 % (camera at the payoff stays farther out)
      const dAt = () => { const k = A.scene.anims[cid].camera.pos.find(q => Math.abs(q[0] - 2.5) < 1e-4)[1]; return Math.hypot(k[0], k[1] - 0.5, k[2] - 1.5) }
      const d45 = dAt(); A.exec('anim.cine', { payoff: 2.5, push: 0.2 }); const d20 = dAt(); A.exec('anim.cine', { payoff: 2.5 })
      A.exec('anim.cine', { off: true }); const off = A.scene.anims[cid]
      return { res, len: c.len, storyEnd: w.at(-1)[1], minSlope: Math.min(...slopes.filter(v => v > 0)), holdFrames: Math.round(slopes.reduce((n, v, i) => v === 0 ? n + (w[i + 1][0] - w[i][0]) * 30 : n, 0)),
        posEases: cam.pos.map(k => k[2] || 'linear'), nPos: cam.pos.length, flash: cam.flash.map(k => +k[1]), shake: cam.shake.map(k => +k[1]), lum, same: once === twice, lint, push: [d45, d20],
        off: { len: off.len, warp: off.warp, camera: off.camera, cine: off.cine } }
    })
    t.ok(r.len > 4 && r.storyEnd === 4, 'slow-mo stretches the clip, story length kept: ' + r.len)
    t.ok(r.minSlope <= 0.35, 'warp slows to <= 0.35x into the payoff: ' + r.minSlope)
    t.eq(r.holdFrames, 4, 'hit-stop freezes 4 frames')
    t.ok(r.nPos >= 3 && r.posEases.slice(0, -1).every(e => e !== 'linear' && e !== 'smooth'), 'camera push-in keys are eased, never stop-start: ' + r.posEases)
    t.ok(Math.min(...r.flash) < 0 && Math.max(...r.flash) >= 0.8, 'dark dip then white flash: ' + r.flash)
    t.ok(Math.max(...r.shake) > 0 && r.shake.at(-1) === 0, 'shake kicks and decays to 0')
    t.ok(r.lum.dip < r.lum.before * 0.92 && r.lum.peak > r.lum.before + 60 && Math.abs(r.lum.after - r.lum.before) < 6, 'frame dims, flashes, settles: ' + JSON.stringify(r.lum))
    t.ok(r.same, 're-running anim.cine replaces its own keys (idempotent)')
    t.eq(r.lint, [], 'a cine clip lints to 0 issues')
    t.ok(r.push[1] > r.push[0] * 1.3, 'push override keeps the camera farther out: ' + r.push.map(v => v.toFixed(2)))
    t.ok(r.off.len === 4 && !r.off.warp && !r.off.camera && !r.off.cine, 'off restores the clip: ' + JSON.stringify(r.off))
    s.noErrors()
  })

  await t.test('baseline lint: motion-stop, camera-robotic, payoff-flat, loop-seam, static-camera; cine loop orbit has no seam', async () => {
    const s = await t.open()
    await s.project('Lint2', { empty: true })
    await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.run('anim.mode')
    const r = await s.eval(() => {
      const A = window.studio.app, o = Object.keys(A.scene.objects)[0], vp = A.viewport
      const a = A.exec('anim.new', { name: 'Bad', len: 2, fps: 30 })
      A.patchAnim(a, { tracks: { [o]: { pos: [[0, [0, 0, 0], 'smooth'], [1, [1, 0, 0], 'smooth'], [2, [2, 0, 0]]] } },
        camera: { pos: [[0, [5, 2, 5], 'smooth'], [1, [4, 2, 4], 'smooth'], [2, [3, 2, 3]]], target: [[0, [0, 0, 0]]], shake: [[0.9, 0, 'step'], [1, 0.2, 'out'], [1.4, 0]] } })
      const bad = [...new Set(A.exec('anim.lint').map(i => i.type))]
      A.exec('anim.new', { name: 'Still', len: 3, fps: 30 }); A.patchAnim(A.anim.clip, { tracks: { [o]: { rot: [[0, [0, 0, 0], 'auto'], [1.5, [0, 30, 0], 'auto'], [3, [0, 0, 0]]] } } })
      const still = A.exec('anim.lint').map(i => i.type)
      vp.setCamera({ pos: [6, 3, 0], target: [0, 0.5, 0], fov: 45 }); A.exec('anim.cine', { kind: 'loop' })
      const c = A.scene.anims[A.anim.clip], at = t => window.studio.anim?.camAt?.(c, t)
      return { bad, still, after: A.exec('anim.lint').map(i => i.type), n: c.camera.pos.length }
    })
    for (const k of ['motion-stop', 'camera-robotic', 'payoff-flat', 'loop-seam']) t.ok(r.bad.includes(k), k + ' flagged: ' + r.bad)
    t.eq(r.still, ['static-camera'], 'a 3 s clip with no camera move is flagged')
    t.eq(r.after, [], 'cine loop: orbit keys, seamless, lints clean')
    t.ok(r.n >= 16, 'orbit keyed with >= 16 auto keys')
    s.noErrors()
  })
  await t.test('cine v2: grade darkens + vignettes the build and tints the payoff; light intensity track; cineLights; spacing + framing lint', async () => {
    const s = await t.open({ device: 'desktop' })
    await s.project('Cine2', { empty: true })
    const a = await s.run('parts.box', { pos: [0, 0.5, 0] }), b = await s.run('parts.box', { pos: [3, 0.5, 0] })
    await s.run('anim.mode')
    const r = await s.eval(async ([a, b]) => {
      const A = window.studio.app, vp = A.viewport, cv = vp.renderer.domElement
      A.scene.env.bg = '#808080'
      const cid = A.exec('anim.new', { name: 'Hit', len: 4, fps: 30 })
      A.patchAnim(cid, { loop: false, tracks: { [a]: { pos: [[0, [0, 0.5, 0], 'auto'], [2.5, [0, 0.5, 2], 'auto'], [4, [0, 0.5, 2.4]]] } } })
      vp.setCamera({ pos: [8, 3, 8], target: [0, 0.5, 1.5], fov: 45 })
      A.exec('anim.cine', { payoff: 2.5, tint: '#ff2020' })
      const c = A.scene.anims[cid], pc = c.warp.find(k => Math.abs(k[1] - 2.5) < 1e-4)[0]
      const px = (t, x, y) => { A.setTime(t); vp.render(); const g = document.createElement('canvas'); g.width = cv.width; g.height = cv.height; const q = g.getContext('2d', { willReadFrequently: true }); q.drawImage(cv, 0, 0)
        const d = q.getImageData(Math.round(x * (cv.width - 1)), Math.round(y * (cv.height - 1)), 1, 1).data; return [d[0], d[1], d[2]] }
      const corner = { before: px(0.3, 0.01, 0.01), dip: px(pc - 0.2, 0.01, 0.01), end: px(c.len - 0.05, 0.01, 0.01) }, mid = px(pc - 0.2, 0.5, 0.15)
      const clipAt = st => { const w = c.warp, i = w.findIndex(k => k[1] >= st), a0 = w[i - 1], b0 = w[i]; return a0[0] + (st - a0[1]) / (b0[1] - a0[1]) * (b0[0] - a0[0]) }   // warp inverse
      const peak = px(clipAt(2.85), 0.5, 0.15)
      // light intensity track: a point light keyed 0 -> 8 -> 0 drives the three.js light, and is restored when the clip stops
      const lid = A.add({ type: 'light', kind: 'point', name: 'L', pos: [0, 3, 2], color: '#ffffff', intensity: 1, range: 12 })
      A.patchAnim(cid, { tracks: { ...A.scene.anims[cid].tracks, [lid]: { intensity: [[0, [0], 'linear'], [1, [8], 'linear'], [2, [0]]] } } })
      const L = () => vp.objects.get(lid).userData.light.intensity
      A.setTime(0); const i0 = L(); A.setTime(clipAt(1)); const i1 = L()
      const { cineLights } = await import(new URL('plugins/cine.js', location.href).href)
      const cl = cineLights({ [a]: A.scene.objects[a] }, c, { impacts: [{ t: 1, at: [0, 2, 0] }, { t: 2.5, at: [0, 2, 1], payoff: true }], rims: [{ parent: a, color: '#49c6ff' }] })
      const again = cineLights(cl.objects, cl.clip, { impacts: [{ t: 1, at: [0, 2, 0] }] })
      // spacing + framing: two roots 0.5 apart for 1 s, then 12 apart for 2 s; a camera that looks away from them
      const sid = A.exec('anim.new', { name: 'Space', len: 4, fps: 30 })
      A.patchAnim(sid, { loop: false, tracks: { [a]: { pos: [[0, [0, 0.5, 0], 'step'], [1.5, [-6, 0.5, 0], 'step'], [4, [-6, 0.5, 0]]] }, [b]: { pos: [[0, [0.5, 0.5, 0], 'step'], [1.5, [6, 0.5, 0], 'step'], [4, [6, 0.5, 0]]] } },
        camera: { pos: [[0, [0, 3, 12], 'auto'], [4, [0, 3, 12]]], target: [[0, [0, 2, 0], 'auto'], [2, [0, 2, 0], 'auto'], [2.6, [30, 2, 0], 'auto'], [4, [30, 2, 0]]] } })
      const sp = A.exec('anim.lint', { id: sid }).map(i => i.type)
      A.exec('anim.mode')
      return { grade: c.camera.grade.length, tint: c.camera.gradeTint, corner, mid, peak, i0, i1, rest: L(), lint: A.exec('anim.lint', { id: cid }).map(i => i.type),
        lights: Object.keys(cl.objects).filter(k => k.startsWith('cine_')), rimKeys: cl.clip.tracks.cine_R0.intensity.length, payPeak: cl.clip.tracks.cine_L1.intensity[1][1][0],
        againLights: Object.keys(again.objects).filter(k => k.startsWith('cine_')), sp }
    }, [a, b])
    const lum = p => (p[0] + p[1] + p[2]) / 3
    t.ok(r.grade >= 4 && r.tint === '#ff2020', 'cine writes grade keys + the tint: ' + r.grade + ' ' + r.tint)
    t.ok(lum(r.corner.dip) < lum(r.corner.before) * 0.75, 'build: corners darken (vignette + exposure dip): ' + JSON.stringify(r.corner))
    t.ok(Math.abs(lum(r.corner.end) - lum(r.corner.before)) < 6, 'grade settles back to neutral: ' + JSON.stringify(r.corner))
    t.ok(r.peak[0] - r.peak[2] > r.corner.before[0] - r.corner.before[2] + 15, 'after the flash: frame keeps a wash of the element colour with the element colour: ' + JSON.stringify(r.peak))
    t.ok(r.i0 < 0.01 && r.i1 > 40 && Math.abs(r.rest - 6) < 0.01, 'intensity track drives the light (x6 point units) and restores it: ' + [r.i0, r.i1, r.rest])
    t.eq(r.lint, [], 'a cine v2 clip still lints clean')
    t.eq(r.lights, ['cine_L0', 'cine_L1', 'cine_R0'], 'cineLights adds an impact light per hit and a rim light')
    t.ok(r.rimKeys === 7 && r.payPeak === 15, 'rim pulses on both impacts, payoff light 3x: ' + r.rimKeys + ' ' + r.payPeak)
    t.eq(r.againLights, ['cine_L0'], 're-running cineLights replaces its own lights')
    for (const k of ['spacing-close', 'spacing-far', 'framing']) t.ok(r.sp.includes(k), k + ' flagged: ' + r.sp)
    s.noErrors()
  })
}
