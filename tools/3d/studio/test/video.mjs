// Video export: the current clip as an MP4 (ftyp box, every frame, clip timing), raw view restored afterwards, lazy load.
export default async function (t) {
  await t.test('mp4 export: valid file, all frames, view and time restored', async () => {
    const s = await t.open({ device: 'desktop' })
    await s.project('Video', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.run('anim.new', { name: 'Slide', len: 1, fps: 30 })
    await s.run('anim.key', { ids: [id], t: 0, channels: ['pos'], values: { pos: [0, 0.5, 0] } })
    await s.run('anim.key', { ids: [id], t: 1, channels: ['pos'], values: { pos: [4, 0.5, 0] } })
    const boot = await s.eval(() => performance.getEntriesByType('resource').some(e => /video\.js|mp4-muxer/.test(e.name)))
    t.ok(!boot, 'encoder code is not loaded at boot')
    const r = await s.eval(async () => {
      const A = window.studio.app; A.setTime(0.4); const t0 = performance.now()
      const out = await A.io.exportTo({ format: 'mp4', to: 'data' })
      return { ms: performance.now() - t0, box: new TextDecoder().decode(out.data.slice(4, 8)), bytes: out.data.length, name: out.filename,
               time: A.time, helpers: A.viewport.helpers.visible }
    })
    t.eq(r.box, 'ftyp', 'mp4 starts with an ftyp box')
    t.ok(r.bytes > 2000, 'video has data: ' + r.bytes + ' bytes')
    t.eq(r.name, 'Slide.mp4', 'named after the clip')
    t.near(r.time, 0.4, 1e-6, 'clip time restored')
    t.ok(r.helpers, 'grid and outlines shown again')
    t.ok(r.ms < 20000, `1 s clip encodes in ${Math.round(r.ms)} ms (< 20 s)`)
    s.noErrors()
  })
  await t.test('mp4: fast is the default; render quality goes through Render image at 1080p and is richer', async () => {
    const s = await t.open({ device: 'desktop' })
    await s.project('Video2', { empty: true })
    const id = await s.run('parts.box', { pos: [0, 0.5, 0] })
    await s.run('anim.new', { name: 'Tiny', len: 0.2, fps: 10 })
    await s.run('anim.key', { ids: [id], t: 0, channels: ['pos'], values: { pos: [0, 0.5, 0] } })
    await s.run('anim.key', { ids: [id], t: 0.2, channels: ['pos'], values: { pos: [2, 0.5, 0] } })
    const r = await s.eval(async () => {
      const A = window.studio.app, d = await A.io.exportTo({ format: 'mp4', to: 'data' }), q = await A.io.exportTo({ format: 'mp4', quality: 'render', to: 'data' })
      return { box: new TextDecoder().decode(q.data.slice(4, 8)), draft: d.data.length, render: q.data.length, helpers: A.viewport.helpers.visible }
    })
    t.eq(r.box, 'ftyp', 'render-quality mp4 is valid')
    t.ok(r.render > r.draft, `render file ${r.render} B is richer than the fast file ${r.draft} B`)
    t.ok(r.helpers, 'grid shown again')
    s.noErrors()
  })
}
