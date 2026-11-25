// TikTok (or any page with a <video>) -> one PNG every STEP seconds + contact sheets + meta.json.
// Usage: node tools/refs/grab.mjs <url> [slug] [--step 0.5]
// Path A: read the item's playAddr from the page JSON, fetch the full mp4 with the page's cookies, ffmpeg exact frames.
// Path B (fallback, e.g. no playAddr): seek the <video> element and screenshot it every STEP s.
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const url = args.find(a => /^https?:/.test(a));
const stepI = args.indexOf('--step'); const STEP = stepI >= 0 ? +args[stepI + 1] : 0.5;
if (!url) { console.error('usage: node tools/refs/grab.mjs <url> [slug] [--step 0.5]'); process.exit(2); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../refs/tiktok');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, locale: 'en-US' });
const page = await ctx.newPage();
await page.goto(url, { timeout: 45000, waitUntil: 'domcontentloaded' });
const finalUrl = page.url(); // short links (vm./vt.) redirect to /@user/video/<id>
const id = (finalUrl.match(/video\/(\d+)/) || url.match(/(\d{15,})/) || [])[1] || 'video';
const slug = args.find(a => a !== url && !a.startsWith('--') && a !== String(STEP)) || id;
const dir = path.join(root, slug), fdir = path.join(dir, 'frames'), sdir = path.join(dir, 'sheets');
fs.rmSync(fdir, { recursive: true, force: true }); fs.mkdirSync(fdir, { recursive: true }); fs.mkdirSync(sdir, { recursive: true });

await page.waitForFunction(() => { const v = document.querySelector('video'); return v && v.readyState >= 1 && v.duration > 0; }, null, { timeout: 30000 })
  .catch(() => { throw new Error('no playable <video> after 30 s (login wall, captcha, region block or private video)'); });
const item = await page.evaluate(() => {
  const s = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
  try { const d = JSON.parse(s.textContent).__DEFAULT_SCOPE__['webapp.video-detail'].itemInfo.itemStruct;
    return { desc: d.desc, author: d.author?.uniqueId, music: d.music?.title, play: d.video?.playAddr, dl: d.video?.downloadAddr,
      w: d.video?.width, h: d.video?.height, dur: d.video?.duration, created: d.createTime };
  } catch { return null; }
});
const vdur = await page.evaluate(() => document.querySelector('video').duration);
const meta = { url, finalUrl, id, slug, step: STEP, grabbedAt: new Date().toISOString(), ...(item || {}), duration: vdur };
delete meta.play; delete meta.dl;

let method = 'B-seek-screenshot';
const mp4 = path.join(dir, 'video.mp4');
for (const src of [item?.play, item?.dl].filter(Boolean)) {
  try {
    // Fetch inside the page: the browser goes through the session proxy and carries TikTok's cookies;
    // page.request (Node side) bypasses the proxy and fails DNS in cloud sessions.
    const b64 = await page.evaluate(async u => {
      const r = await fetch(u, { credentials: 'include' }); if (!r.ok) return null;
      const blob = await r.blob();
      return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(',')[1]); fr.readAsDataURL(blob); });
    }, src);
    const buf = b64 ? Buffer.from(b64, 'base64') : null;
    if (buf && buf.length > 50000) { fs.writeFileSync(mp4, buf); method = 'A-mp4-ffmpeg'; break; }
  } catch {}
}
if (method.startsWith('A')) {
  await browser.close();
  // fps=STEP^-1 takes the frame nearest to t = 0, STEP, 2*STEP ... (start_time=0 pins the grid to 0)
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', `fps=${1 / STEP}:start_time=0:round=near`, path.join(fdir, 'f%04d.png')]);
  const pr = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames:format=duration', '-of', 'json', mp4]));
  Object.assign(meta, { width: pr.streams[0].width, height: pr.streams[0].height, srcFps: pr.streams[0].r_frame_rate, duration: +pr.format.duration });
} else {
  const v = page.locator('video').first();
  await page.evaluate(() => { const v = document.querySelector('video'); v.pause(); v.muted = true; document.querySelectorAll('[class*="Overlay"],[class*="Mask"]').forEach(e => e.style.display = 'none'); });
  for (let i = 0, t = 0; t <= vdur + 1e-6; i++, t = i * STEP) {
    // Wait for decoded data at the new time: a bare 'seeked' screenshots the loading spinner (seen 2026-11-25).
    await page.evaluate(t => new Promise(res => { const v = document.querySelector('video'); const end = Date.now() + 10000;
      const ready = () => (v.readyState >= 3 || Date.now() > end) ? res() : setTimeout(ready, 100);
      v.addEventListener('seeked', ready, { once: true }); v.currentTime = Math.min(t, v.duration - 0.01); }), t);
    await v.screenshot({ path: path.join(fdir, `f${String(i + 1).padStart(4, '0')}.png`) });
  }
  const wh = await page.evaluate(() => { const v = document.querySelector('video'); return [v.videoWidth, v.videoHeight]; });
  Object.assign(meta, { width: wh[0], height: wh[1] });
  await browser.close();
}
// Rename f0001.png -> f0001_t000.0s.png so every file carries its timestamp.
const files = fs.readdirSync(fdir).filter(f => /^f\d{4}\.png$/.test(f)).sort();
files.forEach((f, i) => fs.renameSync(path.join(fdir, f), path.join(fdir, `f${String(i + 1).padStart(4, '0')}_t${(i * STEP).toFixed(1).padStart(5, '0')}s.png`)));
// Contact sheets: 4x3 = 12 frames per sheet, each tile labelled with its time.
const list = path.join(dir, 'frames.txt');
fs.writeFileSync(list, fs.readdirSync(fdir).sort().map(f => `file '${path.join(fdir, f)}'\nduration ${STEP}`).join('\n') + '\n');
fs.readdirSync(sdir).forEach(f => fs.rmSync(path.join(sdir, f)));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-vf',
  `scale=300:-2,drawtext=text='%{eif\\:n*${STEP}\\:d}.%{eif\\:mod(n*${STEP * 10}\\,10)\\:d}s':x=6:y=6:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6,tile=4x3:padding=4:color=black`,
  '-fps_mode', 'passthrough', path.join(sdir, 'sheet%02d.jpg')]);
fs.rmSync(list);
meta.method = method; meta.frameCount = files.length; meta.expectedFrames = Math.floor(meta.duration / STEP) + 1;
meta.sheets = fs.readdirSync(sdir).length;
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
if (method.startsWith('B')) console.error('WARNING fallback B: frames are page screenshots (may include TikTok UI overlays); look at sheet01 before analysis');
console.log(JSON.stringify({ slug, method, duration: meta.duration, frames: meta.frameCount, expected: meta.expectedFrames, sheets: meta.sheets, size: `${meta.width}x${meta.height}`, dir: path.relative(process.cwd(), dir) }));
