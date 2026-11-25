# tools/refs: reference videos → frames → measurements

Pipeline note (phases, sub-agent spec, analysis template): [domains/vfx/reference-videos.md](../../domains/vfx/reference-videos.md).

```bash
node tools/refs/grab.mjs <tiktok-url> [slug] [--step 0.5]   # → refs/tiktok/<slug>/{frames,sheets,meta.json,video.mp4}
python3 -I tools/refs/stats.py refs/tiktok/<slug>           # → stats.csv + cuts / peak motion / palette summary
```

- Path A (default): reads the item's playAddr from the page JSON, downloads the mp4 **inside the page** (browser = session proxy + TikTok cookies), ffmpeg takes the frame nearest each 0.5 s. Clean frames, native size, no UI.
- Path B (fallback): seeks the `<video>` and screenshots it; prints a WARNING because frames can carry TikTok UI. Look at `sheet01.jpg` before trusting it.
- Frames: `frames/f0001_t000.0s.png` (time in the name). Sheets: 4x3 = 12 frames = 6 s each, time-labelled.
- Binaries are gitignored; `meta.json` and `analysis.md` are committed.
- Cloud session needs TikTok + CDN hosts in the environment allowlist (added 2026-11-25). Node-side `fetch`/`page.request` bypass the proxy (ENOTFOUND): only the browser can reach them.
