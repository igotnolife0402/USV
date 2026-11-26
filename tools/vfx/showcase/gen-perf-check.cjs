// Generator perf: THREE_DIR=<three 0.186.1> node tools/vfx/showcase/gen-perf-check.cjs [repo] -> paint ms per sheet (sum/max) + frame pacing; pre-rim baseline sum 562 ms.
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), repo = process.argv[2] || process.cwd(), TD = process.env.THREE_DIR
;(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), p = await b.newPage(), errs = []
p.on('pageerror', e => errs.push(e.message))
await p.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', r => { let f = path.join(TD, new URL(r.request().url()).pathname.replace('/npm/three@0.186.1/', '')); if (!fs.existsSync(f)) f = f.replace('.min.js', '.js'); r.fulfill({ path: f, contentType: 'text/javascript' }) })
await p.route('http://gen.test/**', r => { const f = path.join(repo, decodeURIComponent(new URL(r.request().url()).pathname.slice(1))); fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }) })
await p.goto('http://gen.test/tools/vfx/showcase/generator.html'); await p.waitForFunction(() => window.vfxgen?.spec, null, { timeout: 60000 }); await p.waitForTimeout(3000)
const ms = await p.evaluate(() => vfxgen.paintMs())
// frame pacing over 3 s of playback
const fr = await p.evaluate(() => new Promise(r => { const t = []; let last = performance.now(); const f = n => { t.push(n - last); last = n; if (t.length < 120) requestAnimationFrame(f); else r(t) }; requestAnimationFrame(f) }))
fr.sort((a, b) => a - b)
console.log('paint ms', ms.length, 'sum', ms.reduce((a, b) => a + b, 0), 'max', Math.max(...ms), '| frame median', fr[60].toFixed(1), 'p95', fr[114].toFixed(1), 'errors', errs.length); await b.close() })()
