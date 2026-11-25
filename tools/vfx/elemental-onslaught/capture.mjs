// Render the cinematic at exact times into <out>/all/f%05d.png (grab.mjs layout) for tools/refs/keep.py + baseline.py.
// Usage: node tools/vfx/elemental-onslaught/capture.mjs <three-root> <outDir> [--step 0.1] [--from 0] [--to END]
//   <three-root> holds node_modules/three@0.160.0; the CDN is routed there and the page is served from a local
//   http server (ES modules do not load from file://).
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? +args[i + 1] : d; };
if (args.length < 2) { console.error('usage: capture.mjs <three-root> <outDir> [--step 0.1] [--from 0] [--to END]'); process.exit(2); }
const three = path.resolve(args[0], 'node_modules/three'), out = path.resolve(args[1]);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, 'all'), { recursive: true });

const server = http.createServer((q, r) => {
  const f = path.join(here, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(here) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': f.endsWith('.js') || f.endsWith('.mjs') ? 'text/javascript' : 'text/html' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => r.fulfill({ path: path.join(three, new URL(r.request().url()).pathname.replace('/npm/three@0.160.0/', '')), contentType: 'text/javascript' }));
await page.goto(`http://127.0.0.1:${port}/index.html?t=0`);
await page.waitForFunction(() => window.renderAt, null, { timeout: 60000 }).catch(() => {});
if (errors.length) { console.log(JSON.stringify({ errors })); await browser.close(); server.close(); process.exit(1); }
const end = await page.evaluate(() => window.TIMELINE.end);
const step = opt('--step', 0.1), from = opt('--from', 0), to = opt('--to', end);
const t0 = Date.now(); let n = 0;
for (let i = 0; from + i * step <= to + 1e-6; i++, n++) {
  await page.evaluate(t => window.renderAt(t), from + i * step);
  await page.screenshot({ path: path.join(out, 'all', `f${String(i + 1).padStart(5, '0')}.png`) });
}
await browser.close(); server.close();
console.log(JSON.stringify({ frames: n, secs: Math.round((Date.now() - t0) / 1000), errors }));
