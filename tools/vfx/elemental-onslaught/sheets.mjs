// Umbrio import step 1: render every attack + the finale as an 8x8 flipbook sheet (2048 px, 256 px cells, black = transparent
// under Umbrio's "add" blend), one fixed camera so all cards line up. Writes <out>/sheets/<id>.webp + sheets.json.
// Usage: node tools/vfx/elemental-onslaught/sheets.mjs <three-root> <outDir>
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname);
if (process.argv.length < 4) { console.error('usage: sheets.mjs <three-root> <outDir>'); process.exit(2); }
const three = path.resolve(process.argv[2], 'node_modules/three'), out = path.resolve(process.argv[3]);
fs.mkdirSync(path.join(out, 'sheets', 'frames'), { recursive: true });
const server = http.createServer((q, r) => {
  const f = path.join(here, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(here) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => r.fulfill({ path: path.join(three, new URL(r.request().url()).pathname.replace('/npm/three@0.160.0/', '')), contentType: 'text/javascript' }));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?t=0`);
await page.waitForFunction(() => window.renderAt, null, { timeout: 60000 });
await page.evaluate(() => { window.SHEET = true; document.getElementById('ui').style.display = 'none'; document.getElementById('name').style.display = 'none'; });
const TL = await page.evaluate(() => window.TIMELINE);
const jobs = TL.segments.map((s, i) => ({ id: 'fx-eo-' + s.name.toLowerCase().replace(/\s+/g, '-'), name: s.name, at: s.at, life: (TL.segments[i + 1]?.at ?? TL.finale) - s.at }));
jobs.push({ id: 'fx-eo-convergence', name: 'Convergence', at: TL.finale, life: TL.end - TL.finale });
for (const j of jobs) {
  const dir = path.join(out, 'sheets', 'frames', j.id); fs.mkdirSync(dir, { recursive: true });
  for (let k = 0; k < 64; k++) {
    await page.evaluate(t => window.renderAt(t), j.at + (k + 0.5) * j.life / 64);
    await page.screenshot({ path: path.join(dir, `f${String(k).padStart(2, '0')}.png`) });
  }
  execFileSync('python3', ['-I', '-c', `
import sys, glob
from PIL import Image
fs = sorted(glob.glob(sys.argv[1] + '/f*.png')); S = Image.new('RGB', (2048, 2048))
for k, f in enumerate(fs): S.paste(Image.open(f).convert('RGB').resize((256, 256), Image.LANCZOS), ((k % 8) * 256, (k // 8) * 256))
S.save(sys.argv[2], 'WEBP', quality=82)`, dir, path.join(out, 'sheets', j.id + '.webp')]);
  j.kb = Math.round(fs.statSync(path.join(out, 'sheets', j.id + '.webp')).size / 1024);
}
await browser.close(); server.close();
fs.writeFileSync(path.join(out, 'sheets.json'), JSON.stringify({ jobs, center: [0, 2.2, -8.5], size: 16 }, null, 1));
console.log(JSON.stringify({ errors, jobs: jobs.map(j => [j.id, j.at, +j.life.toFixed(2), j.kb + 'KB']) }));
