// TikTok video -> important frames (sampled every STEP s) + captions with timestamps + contact sheets + meta.json.
// Usage: node tools/refs/grab.mjs <url> [NN] [--step 0.1]   -> domains/vfx/refs/tiktok/<NN>-<author>/
// Path A: playAddr mp4 fetched INSIDE the page (browser = session proxy + TikTok cookies; Node fetch/page.request
//         bypass the proxy and fail DNS in cloud sessions), ffmpeg takes every STEP s, keep.py drops filler frames.
// Region-blocked items (statusCode 10231 cross_border_violation): retried once through the /player/v1/<id> embed.
// Path B (no mp4 reachable): seek the <video> and screenshot it; frames may carry player UI (WARNING printed).
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const url = args.find(a => /^https?:/.test(a));
const stepI = args.indexOf('--step'); const STEP = stepI >= 0 ? +args[stepI + 1] : 0.1;
const nn = args.find((a, i) => a !== url && !a.startsWith('--') && i !== stepI + 1);
if (!url) { console.error('usage: node tools/refs/grab.mjs <url> [NN] [--step 0.1]'); process.exit(2); }
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '../../domains/vfx/refs/tiktok');   // vault lint allows no new root folders

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 540, height: 960 }, locale: 'en-US' })).newPage();
await page.goto(url, { timeout: 45000, waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__'), null, { timeout: 20000 }).catch(() => {});
const finalUrl = page.url(); // vm./vt. short links redirect to /@user/video/<id>
const id = (finalUrl.match(/video\/(\d+)/) || [])[1];
const author = (finalUrl.match(/@([\w.\-]+)/) || [])[1] || 'unknown';
const slug = nn ? `${String(nn).padStart(2, '0')}-${author}` : `${author}-${id}`;
const dir = path.join(root, slug);
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(path.join(dir, 'all'), { recursive: true });

const item = await page.evaluate(() => {
  try {
    const vd = JSON.parse(document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__').textContent).__DEFAULT_SCOPE__['webapp.video-detail'];
    const d = vd.itemInfo?.itemStruct, v = d?.video || {};
    const subs = (v.subtitleInfos || []).filter(s => /webvtt/i.test(s.Format));
    const sub = subs.find(s => /^eng/i.test(s.LanguageCodeName)) || subs[0];
    return { status: vd.statusCode, statusMsg: vd.statusMsg, desc: d?.desc, author: d?.author?.uniqueId, music: d?.music?.title,
      hashtags: (d?.textExtra || []).map(t => t.hashtagName).filter(Boolean), stickers: (d?.stickersOnItem || []).flatMap(s => s.stickerText || []),
      created: d?.createTime, play: v.playAddr, dl: v.downloadAddr, subUrl: sub?.Url, subLang: sub?.LanguageCodeName, subSource: sub?.Source };
  } catch { return {}; }
});
const meta = { url, finalUrl, id, slug, step: STEP, grabbedAt: new Date().toISOString(), ...item };
delete meta.play; delete meta.dl; delete meta.subUrl;

// Download in the page; returns base64 or null.
const inPage = u => page.evaluate(async u => {
  try { const r = await fetch(u, { credentials: 'include' }); if (!r.ok) return null; const b = await r.blob();
    return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(',')[1]); fr.readAsDataURL(b); });
  } catch { return null; }
}, u);

// Captions: TikTok ASR/creator WebVTT -> cues.json [{start,end,text}]
const vttTime = s => s.split(':').reduce((a, x) => a * 60 + parseFloat(x), 0);
if (item.subUrl) {
  const b64 = await inPage(item.subUrl);
  if (b64) {
    const vtt = Buffer.from(b64, 'base64').toString('utf8');
    const cues = vtt.split(/\r?\n\r?\n/).map(b => b.split(/\r?\n/)).map(l => {
      const k = l.findIndex(x => x.includes('-->')); if (k < 0) return null;
      const [a, z] = l[k].split('-->').map(x => vttTime(x.trim().split(' ')[0]));
      return { start: a, end: z, text: l.slice(k + 1).join(' ').replace(/<[^>]+>/g, '').trim() };
    }).filter(c => c && c.text);
    fs.writeFileSync(path.join(dir, 'cues.json'), JSON.stringify(cues));
    meta.captions = `${cues.length} cues (${item.subLang}, ${item.subSource})`;
  }
}
if (!meta.captions) meta.captions = 'none';

let method = null, mp4 = path.join(dir, 'video.mp4');
for (const src of [item.play, item.dl].filter(Boolean)) {
  const b64 = await inPage(src); const buf = b64 && Buffer.from(b64, 'base64');
  if (buf && buf.length > 50000) { fs.writeFileSync(mp4, buf); method = 'A-mp4'; break; }
}
if (!method && id) { // region block or no playAddr: the embed player sometimes serves it
  await page.goto(`https://www.tiktok.com/player/v1/${id}?autoplay=0&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0`, { timeout: 45000 });
  const ok = await page.waitForFunction(() => { const v = document.querySelector('video'); return v && v.readyState >= 1 && v.duration > 0; }, null, { timeout: 20000 }).then(() => true).catch(() => false);
  if (ok) {
    const src = await page.evaluate(() => document.querySelector('video').currentSrc);
    if (/^https?:/.test(src)) { const b64 = await inPage(src); const buf = b64 && Buffer.from(b64, 'base64');
      if (buf && buf.length > 50000) { fs.writeFileSync(mp4, buf); method = 'A-mp4-embed'; } }
    if (!method) method = 'B-seek-screenshot';
  }
}
if (!method) {
  await browser.close(); fs.rmSync(dir, { recursive: true, force: true });
  console.log(JSON.stringify({ slug, error: `no playable video (${item.statusMsg || 'no item data'}, status ${item.status})` })); process.exit(1);
}
if (method.startsWith('A')) {
  await browser.close();
  // fps=1/STEP picks the frame nearest each t = 0, STEP, 2*STEP ...
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', `fps=${1 / STEP}:start_time=0:round=near`, path.join(dir, 'all', 'f%05d.png')]);
  const pr = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate:format=duration', '-of', 'json', mp4]));
  Object.assign(meta, { width: pr.streams[0].width, height: pr.streams[0].height, srcFps: pr.streams[0].r_frame_rate, duration: +pr.format.duration });
} else {
  const v = page.locator('video').first(); const dur = await page.evaluate(() => { const v = document.querySelector('video'); v.pause(); v.muted = true; return v.duration; });
  for (let i = 0; i * STEP <= dur + 1e-6; i++) {
    // wait for decoded data at the new time: a bare 'seeked' screenshots the loading spinner (seen 2026-11-25)
    await page.evaluate(t => new Promise(res => { const v = document.querySelector('video'); const end = Date.now() + 10000;
      const ready = () => (v.readyState >= 3 || Date.now() > end) ? res() : setTimeout(ready, 50);
      v.addEventListener('seeked', ready, { once: true }); v.currentTime = Math.min(t, v.duration - 0.01); }), i * STEP);
    await v.screenshot({ path: path.join(dir, 'all', `f${String(i + 1).padStart(5, '0')}.png`) });
  }
  Object.assign(meta, { duration: dur });
  await browser.close();
  console.error('WARNING fallback B: frames are player screenshots (may include UI); look at sheet01 before analysis');
}
const out = execFileSync('python3', ['-I', path.join(here, 'keep.py'), dir, String(STEP)]).toString().trim();
Object.assign(meta, JSON.parse(fs.readFileSync(path.join(dir, 'keep.json'))), { method });
fs.rmSync(path.join(dir, 'keep.json')); fs.rmSync(path.join(dir, 'cues.json'), { force: true });
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
console.log(JSON.stringify({ slug, method, duration: +(+meta.duration).toFixed(1), captions: meta.captions, ...JSON.parse(out), dir: path.relative(process.cwd(), dir) }));
