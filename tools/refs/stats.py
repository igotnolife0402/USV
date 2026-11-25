"""Per-frame numbers for a grabbed video, so analysis starts from measurements, not guesses.
Usage: python3 -I tools/refs/stats.py refs/tiktok/<slug>
Writes <slug>/stats.csv and prints a short summary: cuts, peak-motion and peak-brightness moments, palette."""
import csv, sys, pathlib
import numpy as np
from PIL import Image

d = pathlib.Path(sys.argv[1]); frames = sorted((d / 'frames').glob('f*.png'))
if not frames: sys.exit(f'no frames in {d}/frames')
rows, prev, pal = [], None, {}
for f in frames:
    im = Image.open(f).convert('RGB'); im.thumbnail((160, 160)); a = np.asarray(im, dtype=np.float32) / 255
    hsv = np.asarray(im.convert('HSV'), dtype=np.float32) / 255
    diff = float(np.abs(a - prev).mean()) if prev is not None and prev.shape == a.shape else 0.0
    # 4 dominant colours per frame (median-cut), hex, most frequent first
    q = im.quantize(4, method=Image.Quantize.MEDIANCUT); cols = q.getpalette()[:12]; counts = sorted(q.getcolors(), reverse=True)
    top = ['#%02x%02x%02x' % tuple(cols[i * 3:i * 3 + 3]) for _, i in counts]
    for c in top[:2]: pal[c] = pal.get(c, 0) + 1
    t = float(f.stem.split('_t')[1].rstrip('s'))
    rows.append(dict(t=t, bright=round(float(a.mean()), 3), sat=round(float(hsv[..., 1].mean()), 3),
                     hue=round(float(hsv[..., 0].mean()) * 360), motion=round(diff, 3), palette=' '.join(top)))
    prev = a
with open(d / 'stats.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
m = np.array([r['motion'] for r in rows]); thr = 0.15  # mean abs RGB change; hard cuts measured 0.20-0.33 (2026-11-25); smooth-motion level not measured yet, tune on the first real ref
print(f'{len(rows)} frames, {rows[-1]["t"]} s | cuts (motion>{thr:.2f}): {[r["t"] for r in rows if r["motion"] > thr]}')
print('top motion t:', [r['t'] for r in sorted(rows, key=lambda r: -r['motion'])[:5]], '| brightest t:', [r['t'] for r in sorted(rows, key=lambda r: -r['bright'])[:3]])
print('palette (most common):', ' '.join(c for c, _ in sorted(pal.items(), key=lambda x: -x[1])[:8]))
