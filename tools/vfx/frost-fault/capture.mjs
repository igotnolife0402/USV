// Render Frost Fault at exact times (every 0.1 s over one loop) into the same layout grab.mjs makes, so the
// reference-video tools (keep.py sheets, baseline.py) judge our own effect like a TikTok reference.
// Usage: node tools/vfx/frost-fault/capture.mjs <three-root> [outDir]
//   <three-root> = folder holding node_modules/three (CDN is routed there, so it works offline / in cloud sessions)
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname);
const three = path.resolve(process.argv[2] || '.', 'node_modules/three');
if (!process.argv[3]) { console.error('usage: capture.mjs <three-root> <outDir> (outDir in scratch, never the vault)'); process.exit(2); }
const out = path.resolve(process.argv[3]);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, 'all'), { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => {
  const rel = new URL(r.request().url()).pathname.replace('/npm/three@0.160.0/', '');
  r.fulfill({ path: path.join(three, rel), contentType: 'text/javascript' });
});
await page.goto('file://' + path.join(here, 'index.html') + '?t=0');
await page.waitForFunction(() => window.renderAt, null, { timeout: 30000 });
const loop = await page.evaluate(() => window.P.loop);
const step = 0.1; let n = 0;
for (let i = 0; i * step <= loop + 1e-6; i++, n++) {
  await page.evaluate(t => window.renderAt(t), i * step);
  await page.locator('canvas').screenshot({ path: path.join(out, 'all', `f${String(i + 1).padStart(5, '0')}.png`) });
}
await browser.close();
console.log(JSON.stringify({ frames: n, errors, out: path.relative(process.cwd(), out) }));
