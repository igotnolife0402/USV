// Serves out/ over http, opens the preview in headless Chromium, renders loop time T and screenshots it.
// Usage: [NODE_MODULES=<dir holding three@0.160.0>] node test/shot.mjs <t> <out.png> [yaw pitch dist]   Exit 1 on console errors.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.join(here, '..', 'out');
const [t = '5', png = path.join(dir, 'shot.png'), yaw, pitch, dist] = process.argv.slice(2);
const srv = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/wyvern.html')); fs.readFile(f, (e, b) => { r.writeHead(e ? 404 : 200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(b); }); }).listen(0);
const port = srv.address().port, errs = [];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
// CDN is often blocked in cloud sessions: serve three@0.160.0 from $NODE_MODULES/three when present.
const nm = process.env.NODE_MODULES;
if (nm) await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', (r) => { const f = path.join(nm, 'three', r.request().url().split('three@0.160.0/')[1]); r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(f) }); });
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`http://localhost:${port}/wyvern.html`);
await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const info = await page.evaluate(([tt, y, p, d]) => window.__sim(tt, { yaw: y, pitch: p, dist: d }), [+t, yaw == null ? null : +yaw, pitch == null ? null : +pitch, dist ? +dist : null]);
await page.screenshot({ path: png });
console.log(JSON.stringify({ t: +t, info, errors: errs }));
await browser.close(); srv.close();
process.exit(errs.length ? 1 : 0);
