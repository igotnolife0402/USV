// node video.mjs <outdir> [seconds=12] [fps=24]  ->  <outdir>/<Name>.mp4 (needs ffmpeg, NODE_MODULES with three@0.186.1)
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
// NODE_TOOLS = folder whose node_modules has playwright (cloud default /opt/node-tools); CHROME = browser exe on PC
const { chromium } = createRequire((process.env.NODE_TOOLS || '/opt/node-tools') + '/')('playwright');
const [OUTD = 'out', SEC = '12', FPS = '24'] = process.argv.slice(2), DIR = path.dirname(fileURLToPath(import.meta.url)), DEPS = process.env.NODE_MODULES || path.join(DIR, 'node_modules');
const OUTA = path.resolve(OUTD), frames = path.join(OUTA, 'frames'); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
const MESA = ['/usr/lib/x86_64-linux-gnu/libEGL_mesa.so.0', '/usr/lib/aarch64-linux-gnu/libEGL_mesa.so.0'].some(f => fs.existsSync(f));
const gl = process.env.GL || (MESA ? 'llvmpipe' : 'swiftshader');
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', ...(gl === 'llvmpipe' ? ['--use-angle=gl-egl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']), '--ignore-gpu-blocklist', '--disable-gpu-watchdog'], env: { ...process.env, EGL_PLATFORM: 'surfaceless' } });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('pageerror', e.message)); p.on('console', m => m.type() === 'error' && console.log('console', m.text()));
await p.route('http://t/**', r => { const u = decodeURIComponent(new URL(r.request().url()).pathname);
  const f = u.startsWith('/three/') ? path.join(DEPS, u) : u.startsWith('/out/') ? path.join(OUTA, u.slice(5)) : path.join(DIR, u);
  if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: 'nf' });
  r.fulfill({ status: 200, contentType: { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }) });
await p.goto('http://t/video.html?out=out'); await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
const N = Math.round(+SEC * +FPS), t0 = Date.now(), rig = JSON.parse(fs.readFileSync(path.join(OUTA, 'rig.json')));
for (let i = 0; i < N; i++) {
  const t = i / +FPS, cam = Math.floor(t / (+SEC / rig.cams.length));
  const url = await p.evaluate(([t, c]) => window.frame(t, c), [t, cam]);
  fs.writeFileSync(path.join(frames, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
}
await b.close();
const mp4 = path.join(OUTA, rig.name + '.mp4');
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', FPS, '-i', path.join(frames, 'f%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4]);
console.log(`${mp4}: ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s (${gl})`);
