# tools/refs: reference videos → important frames + captions → analysis

Pipeline note (phases, worker spec, analysis template): [domains/vfx/reference-videos.md](../../domains/vfx/reference-videos.md).

```bash
node tools/refs/grab.mjs <tiktok-url> [NN] [--step 0.1]          # → domains/vfx/refs/tiktok/<NN>-<author>/
python3 -I tools/refs/keep.py domains/vfx/refs/tiktok/<dir> --sheets   # rebuild contact sheets only
```

Output per video: `frames/fNNNN_tSSS.Ss.png` (kept frames only, time in the name), `sheets/sheetNN.jpg` (24 tiles, time labels, red label = frames dropped before it, letterbox cropped), `transcript.md` (caption cues → nearest frame), `stats.csv` (change, motion, brightness, palette), `meta.json` (desc, hashtags, on-screen stickers, runs, cuts, crop). Frames, sheets, stats and video.mp4 are gitignored; meta.json, transcript.md and analysis.md are committed.

- Keep rule (keep.py): first/last frame, every caption start, and any frame that changed vs the LAST KEPT frame by mean RGB >= 0.02 or >= 1 % of pixels by > 0.08. Static stretches collapse to one frame; constant camera motion keeps almost everything.
- Path A: playAddr mp4 fetched inside the page (browser = session proxy + TikTok cookies; Node fetch/page.request fail DNS in cloud sessions), ffmpeg at 1/step fps.
- Region block (`cross_border_violation`): one retry through `/player/v1/<id>`; still blocked → reported, nothing saved.
- Path B (no mp4): seek + screenshot with a WARNING (frames may carry player UI).
- Cloud sessions need TikTok + CDN + caption hosts in the environment allowlist (added 2026-11-25).
- `python3 -I tools/refs/baseline.py <dir> --hit <s> --hue <deg>`: scores frames against the measurable rules in reference-videos.md (contrast dip, one hue, ground anchor, residue, cleanup, flash rate, wash). Checked on ref 07: 5/7, so it does not pass everything.
