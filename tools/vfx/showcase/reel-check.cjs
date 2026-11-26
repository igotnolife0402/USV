// One-frame reel check (L-217): node tools/vfx/showcase/reel-check.cjs <repo> <out.jpg> -> default outline + console errors + one 480x270 frame at t 16.4.
const { chromium } = require('playwright'); const fs = require('fs')
;(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage(); const errs = []
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()))
await p.route('http://reel.test/**', r => { const u = new URL(r.request().url()).pathname.slice(1); r.fulfill({ path: require('path').join(process.argv[2], u === 'reel.html' ? 'tools/vfx/showcase/reel.html' : u) }) }); await p.goto('http://reel.test/reel.html'); await p.waitForFunction(() => window.reelInfo && window.reelFrame, null, { timeout: 30000 })
const info = await p.evaluate(() => ({ ol: window.reelInfo.OL ?? window.reelInfo.ol, btn: document.querySelector('#bOl')?.textContent }))
const d = await p.evaluate(() => window.reelFrame(16.4, 480, 270)); fs.writeFileSync(process.argv[3], Buffer.from(d.split(',')[1], 'base64'))
console.log(JSON.stringify(info), 'errors:', errs.length, errs.slice(0, 2)); await b.close() })()
