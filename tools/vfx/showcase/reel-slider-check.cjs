// Reel UI check: node tools/vfx/showcase/reel-slider-check.cjs <repo> <outdir> -> Width slider at 30/150 % (labels + 2 frames), 390 px UI strip, overflow + console errors.
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), [repo, out] = process.argv.slice(2)
;(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), p = await b.newPage({ viewport: { width: 390, height: 844 } }), errs = []
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()))
await p.route('http://reel.test/**', r => { const u = new URL(r.request().url()).pathname.slice(1); r.fulfill({ path: path.join(repo, u === 'reel.html' ? 'tools/vfx/showcase/reel.html' : u) }) })
await p.goto('http://reel.test/reel.html'); await p.waitForFunction(() => window.reelFrame, null, { timeout: 30000 })
const st = []; for (const v of [30, 150]) { await p.evaluate(v => { const s = document.getElementById('sOw'); s.value = v; s.dispatchEvent(new Event('input')) }, v)
  st.push(await p.evaluate(() => document.getElementById('vOw').textContent)); const d = await p.evaluate(() => window.reelFrame(16.4, 480, 270)); fs.writeFileSync(`${out}/w${v}.jpg`, Buffer.from(d.split(',')[1], 'base64')) }
await p.screenshot({ path: `${out}/ui390.jpg`, clip: { x: 0, y: 0, width: 390, height: 90 } })
const ov = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)
console.log('labels', st, 'overflow', ov, 'errors', errs.length, errs.slice(0, 2)); await b.close() })()
