// Headless screenshots of a deterministic VFX page (?t=<sec>, sets window.__done) in a cloud session.
// jsDelivr is unreachable from headless Chromium here, so three@0.186.1 is served from a local npm copy.
// Usage: python3 -m http.server 8765 --bind 127.0.0.1 &  (repo root)
//        DEPS=<scratch>/deps/node_modules node tools/vfx/shots/shoot.cjs <page>.html <outDir> 0.8,1.6,3,6.5
const { chromium } = require('playwright');
const path = require('path');
const [page, out, times = '1'] = process.argv.slice(2);
const DEPS = path.join(process.env.DEPS || 'node_modules', 'three/');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errs = [];
  const jobs = times.split(',').map((t) => [960, 540, t]).concat([[390, 844, times.split(',').at(-2) || times]]);
  for (const [w, h, t] of jobs) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.route(/cdn\.jsdelivr\.net\/npm\/three@0\.186\.1\//, (r) =>
      r.fulfill({ path: DEPS + r.request().url().split('three@0.186.1/')[1], contentType: 'text/javascript' }));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`http://127.0.0.1:8765/${page}?t=${t}`);
    await p.waitForFunction(() => window.__done === true, null, { timeout: 60000 }).catch(() => errs.push('timeout t=' + t));
    const shown = await p.$eval('#err', (e) => e.textContent).catch(() => '');
    if (shown) errs.push(shown.slice(0, 300));
    await p.screenshot({ path: `${out}/${w}_${t}.png` });
    await p.close();
  }
  console.log('errors:', errs.length, errs.slice(0, 3).join(' | ').slice(0, 600));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
