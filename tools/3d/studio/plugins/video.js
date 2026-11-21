// Export > Video (MP4): the current clip as a raw video, no grid, gizmo or outlines, for looking at.
// quality 'fast' (default): the live view, long side <= 1280 px, <= 30 fps, hardware H.264 at ~0.1 bit/pixel: seconds to export, ~1 MB.
// quality 'render': every frame through the studio's own Render image (look.js: 1920x1080, 4x MSAA, ambient occlusion, bloom,
// glow, effects), the clip's fps (<= 60), ~0.3 bit/pixel: minutes, several MB. Frames step exactly along the clip timeline, never
// real time, so a slow phone makes the same smooth video. H.264 by WebCodecs, muxed by mp4-muxer; both load on first use.
const MUXER = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/build/mp4-muxer.mjs'
const CODECS = ['avc1.640033', 'avc1.640028', 'avc1.4d0028', 'avc1.42001f']   // High 5.1 (1080p60), High 4.0, Main 4.0, Baseline 3.1 (720p) fallbacks
const yieldUI = () => new Promise(r => setTimeout(r, 0))

async function pickCodec (W, H, fps, bpp) {
  for (const hw of ['prefer-hardware', 'no-preference']) for (const codec of CODECS) {          // the phone's own encoder first: fast, cool, little battery
    const cfg = { codec, width: W, height: H, bitrate: Math.round(W * H * fps * bpp), framerate: fps, avc: { format: 'avc' }, latencyMode: 'quality', hardwareAcceleration: hw }
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg } catch {}
  }
  return null
}

export async function mp4 (app, o = {}) {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') throw new Error('This browser cannot encode video: needs iOS 16.4+, Safari 16.4+ or Chrome 94+')
  const vp = app.viewport, A = app.anim, id = A?.clip, clip = id && app.scene.anims?.[id]
  if (!vp) throw new Error('No viewport to record')
  if (!clip) throw new Error('No animation clip: make one in Animate, then export the video')
  const render = o.quality === 'render'
  const fps = Math.max(1, Math.min(render ? 60 : 30, Math.round(+o.fps || clip.fps || 30))), len = Math.max(1 / fps, +clip.len || 1), n = Math.max(1, Math.round(len * fps))
  const cv = vp.renderer.domElement
  let W, H
  if (render) { W = +o.w || 1920; H = +o.h || 1080 } else { const k = Math.min(1, 1280 / Math.max(cv.width, cv.height)); W = cv.width * k; H = cv.height * k }
  W = Math.max(2, Math.floor(W / 2) * 2); H = Math.max(2, Math.floor(H / 2) * 2)                  // H.264 wants even sides
  const bpp = render ? 0.32 : 0.1                                                                  // bits per pixel per frame: render 1080p60 ~ 40 Mbps cap, fast 720p30 ~ 2.8 Mbps
  let cfg = await pickCodec(W, H, fps, bpp)
  if (cfg?.codec === CODECS[3] && Math.max(W, H) > 1280) { const s = 1280 / Math.max(W, H); W = Math.floor(W * s / 2) * 2; H = Math.floor(H * s / 2) * 2; cfg = await pickCodec(W, H, fps, bpp) }
  if (!cfg) throw new Error('This browser has no H.264 encoder for ' + W + 'x' + H)
  const { Muxer, ArrayBufferTarget } = await import(MUXER)
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: fps }, fastStart: 'in-memory' })
  let failed = null
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { failed = e } })
  enc.configure(cfg)
  const frame = render ? null : Object.assign(document.createElement('canvas'), { width: W, height: H }), g = frame?.getContext('2d')
  const was = { t: app.time, playing: A.playing, helpers: vp.helpers.visible, gizmo: vp.gizmo?.visible }
  const temps = o.temp ? [] : app.ids().filter(id => app.obj(id)?.temp).map(id => vp.objects.get(id)).filter(x => x?.visible).map(x => [x, x.visible])   // temporary models are not in the video
  for (const [x] of temps) x.visible = false
  if (A.playing) A.pause()
  if (!render) { vp.helpers.visible = false; if (vp.gizmo) vp.gizmo.visible = false }                 // the render path hides these itself
  try {
    for (let i = 0; i < n; i++) {
      if (failed) throw failed
      app.setTime(i / fps)                                    // poses the rig and steps every flipbook synchronously
      let src
      if (render) src = await app.exec('look.render', { w: W, h: H, canvas: true, silent: true })
      else { vp.render(); g.drawImage(cv, 0, 0, W, H); src = frame }
      const f = new VideoFrame(src, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) })
      enc.encode(f, { keyFrame: i % (fps * 2) === 0 }); f.close()
      while (enc.encodeQueueSize > 3) await yieldUI()        // back-pressure: memory stays flat on long clips
      if (i % 5 === 0) { o.progress?.(i / n); await yieldUI() }
    }
    await enc.flush()
    if (failed) throw failed
  } finally {
    if (enc.state !== 'closed') enc.close()
    if (!render) { vp.helpers.visible = was.helpers; if (vp.gizmo) vp.gizmo.visible = was.gizmo }
    for (const [x, v] of temps) x.visible = v
    app.setTime(was.t); if (was.playing) A.play()
    vp.requestRender()
  }
  muxer.finalize()
  const name = String(clip.name || app.scene.name || 'clip').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'clip'
  return { filename: name + '.mp4', data: new Uint8Array(muxer.target.buffer), mime: 'video/mp4', frames: n, width: W, height: H, fps }
}
