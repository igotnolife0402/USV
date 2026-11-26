// VFX reel capture (owner 2026-11-26: 20 s showcase). Renders tools/vfx/showcase/reel.html headlessly (SwiftShader WebGL2).
//   node tools/vfx/showcase/reel-capture.cjs . OUTDIR peaks   -> 20 small JPEG frames (1 per 1 s shot, near the peak) for one contact-sheet check
//   node tools/vfx/showcase/reel-capture.cjs . OUTDIR styles  -> outline styles x 5 shots + the 3 HUD layouts (compare grid)
//   node tools/vfx/showcase/reel-capture.cjs . OUTDIR all     -> 600 frames 1280x720 @30fps, then:
//   ffmpeg -framerate 30 -i OUTDIR/f%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 18 tools/vfx/showcase/out/vfx-reel-20s.mp4 (gitignored)
const { chromium } = require('playwright'), fs = require('fs'), path = require('path')
const [repo, out, mode] = process.argv.slice(2)
;(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), p = await b.newPage()
  const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(e.message))
  await p.route('http://reel.test/**', r => { const u = new URL(r.request().url()).pathname.slice(1)
    r.fulfill({ path: path.join(repo, u === 'reel.html' ? 'tools/vfx/showcase/reel.html' : u) }) })
  await p.goto('http://reel.test/reel.html?cap'); await p.evaluate(() => window.reelReady)
  if (mode === 'styles') { // outline x shot grid + HUD variants, one JPEG each: s-<ol>-<shot>.jpg, h-<hud>.jpg
    const { OL, HUD } = await p.evaluate(() => window.reelInfo), shots = [5.35, 9.4, 10.45, 16.4, 18.3]
    for (const ol of OL) for (const t of shots) { const d = await p.evaluate(([o, t]) => { window.reelStyle(o, 'bar'); return window.reelFrame(t, 480, 270) }, [ol, t]); fs.writeFileSync(path.join(out, `s-${ol}-${t}.jpg`), Buffer.from(d.split(',')[1], 'base64')) }
    for (const h of HUD) { const d = await p.evaluate(h => { window.reelStyle('none', h); return window.reelFrame(18.4, 640, 360) }, h); fs.writeFileSync(path.join(out, `h-${h}.jpg`), Buffer.from(d.split(',')[1], 'base64')) }
    console.log(JSON.stringify({ errs, err: await p.evaluate(() => document.getElementById('err').textContent) })); return b.close()
  }
  const ts = mode === 'peaks' ? [...Array(20)].map((_, i) => i + .3) : [...Array(600)].map((_, i) => i / 30)
  for (const [i, t] of ts.entries()) {
    const d = await p.evaluate(([t, w, h]) => window.reelFrame(t, w, h), [t, mode === 'peaks' ? 640 : 1280, mode === 'peaks' ? 360 : 720])
    fs.writeFileSync(path.join(out, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(d.split(',')[1], 'base64'))
  }
  const err = await p.evaluate(() => document.getElementById('err').textContent)
  console.log(JSON.stringify({ frames: ts.length, errs, err })); await b.close()
})()
