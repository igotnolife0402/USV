// Generator rim check: node tools/vfx/showcase/gen-outline-check.cjs <repo> <outdir> -> rim slider 5/30/50/150 (150 must clamp to 50),
// px label + line height grow with it, stage frames at payoff per width, 390 px overflow, console errors.
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), [repo, out] = process.argv.slice(2)
;(async () => {
  const px = process.env.HTTPS_PROXY || process.env.https_proxy
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ...(px ? { proxy: { server: px } } : {}) })
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true }), p = await c.newPage(), errs = []
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()))
  await p.route('http://gen.test/**', r => { const u = decodeURIComponent(new URL(r.request().url()).pathname.slice(1)), f = path.join(repo, u); fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }) })
  // headless has no CDN tunnel: THREE_DIR=<node_modules/three of 0.186.1> serves the pinned build locally (min.js -> module.js)
  if (process.env.THREE_DIR) await p.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', r => { let u = new URL(r.request().url()).pathname.replace('/npm/three@0.186.1/', ''), f = path.join(process.env.THREE_DIR, u)
    if (!fs.existsSync(f)) f = f.replace('.min.js', '.js'); r.fulfill({ path: f, contentType: 'text/javascript' }) })
  await p.goto('http://gen.test/tools/vfx/showcase/generator.html'); await p.waitForFunction(() => window.vfxgen?.spec, null, { timeout: 60000 })
  const st = []
  for (const v of [5, 30, 50, 150]) {
    await p.evaluate(v => { const s = document.getElementById('sOw'); s.value = v; s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change')) }, v)
    await p.waitForTimeout(2500); await p.evaluate(() => vfxgen.seek(vfxgen.payoff() + 0.15)); await p.waitForTimeout(400)
    st.push(await p.evaluate(() => [document.getElementById('sOw').value, document.getElementById('vOw').textContent, document.getElementById('pxOw').textContent, getComputedStyle(document.getElementById('lOw')).height].join(' | ')))
    await (await p.$('#stage')).screenshot({ path: `${out}/g${v}.png` }); await (await p.$('#owBox')).screenshot({ path: `${out}/ui${v}.png` })
  }
  const ov = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  console.log(st.join('\n'), '\noverflow', ov, 'errors', errs.length, errs.slice(0, 3)); await b.close()
})()
