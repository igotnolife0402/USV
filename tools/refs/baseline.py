"""Score a frame folder (our own effect or a reference) against the measurable rules in
domains/vfx/reference-videos.md. Needs frames/ from keep.py (names carry the time).
Usage: python3 -I tools/refs/baseline.py <dir> --hit 0.5 --hue 195 [--end 3.0]
Prints one PASS/FAIL line per rule with the measured numbers. Rules needing judgment (cel style, layering)
are listed as LOOK: the brain decides those from the contact sheet."""
import argparse, pathlib, re, sys
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument('dir'); ap.add_argument('--hit', type=float, required=True)
ap.add_argument('--hue', type=float, required=True); ap.add_argument('--end', type=float)
a = ap.parse_args(); d = pathlib.Path(a.dir) / 'frames'
fr = sorted((float(m[1]), p) for p in d.glob('f*.png') if (m := re.search(r'_t([\d.]+)s', p.name)))
if not fr: sys.exit(f'no frames in {d}')
T = np.array([t for t, _ in fr])
def load(p):
    im = Image.open(p).convert('RGB'); im.thumbnail((180, 320))
    rgb = np.asarray(im, dtype=np.float32) / 255; hsv = np.asarray(im.convert('HSV'), dtype=np.float32) / 255
    return rgb, hsv
data = [load(p) for _, p in fr]
B = np.array([rgb.mean() for rgb, _ in data])
def near(t): return int(np.argmin(np.abs(T - t)))
def hue_px(hsv, centre, width):
    h = hsv[..., 0] * 360; m = (hsv[..., 1] > 0.3) & (hsv[..., 2] > 0.25)
    dh = np.minimum(np.abs(h - centre), 360 - np.abs(h - centre)); return m, m & (dh <= width)
res = []
# 1 contrast before the hit: darkest frame in the last 0.3 s before the hit is below the start, and the hit is far brighter
pre = [i for i, t in enumerate(T) if a.hit - 0.3 <= t < a.hit]; post = [i for i, t in enumerate(T) if a.hit <= t <= a.hit + 0.3]
dip, peak = B[pre].min() if pre else B[0], B[post].max() if post else 0
res.append(('1 contrast before hit', peak >= 2 * dip and peak - dip >= 0.15, f'dip {dip:.3f} → peak {peak:.3f} (need peak ≥ 2× dip, +0.15)'))
# 2 one hue (+ small accent): saturated pixels within ±30° of the main hue over the whole effect
sat = hit = 0
for _, hsv in data:
    m, h = hue_px(hsv, a.hue, 30); sat += m.sum(); hit += h.sum()
share = hit / max(sat, 1)
res.append(('2 one dominant hue', share >= 0.8, f'{share:.0%} of saturated pixels within ±30° of {a.hue:.0f}° (need ≥ 80 %)'))
# 6 ground anchor: after the hit, the lower 40 % of the frame holds hue light (cracks/pad)
i = near(a.hit + 0.4); rgb, hsv = data[i]; low = hsv[int(hsv.shape[0] * 0.6):]
_, h = hue_px(low, a.hue, 30); g = h.mean()
res.append(('6 ground anchor', g >= 0.02, f'{g:.1%} of the lower 40 % is lit in-hue at t={T[i]:.1f} (need ≥ 2 %)'))
# 4 nothing vanishes clean: residue (in-hue pixels) still present well after the main body is gone
i = near(a.hit + 1.4); _, h = hue_px(data[i][1], a.hue, 30); r = h.mean()
res.append(('4 lingering residue', r >= 0.002, f'{r:.2%} in-hue at t={T[i]:.1f} (need ≥ 0.2 %)'))
# cleanup: the last frame returns to the opening frame's brightness (loops/ends clean)
end = near(a.end) if a.end else len(T) - 1
res.append(('cleanup at end', abs(B[end] - B[0]) <= 0.03, f'brightness start {B[0]:.3f} vs end {B[end]:.3f} (need Δ ≤ 0.03)'))
# flash rate: big brightness jumps (≥ +0.15 frame to frame) must stay ≤ 3 per second
jumps = [T[k] for k in range(1, len(T)) if B[k] - B[k - 1] >= 0.15]
dur = max(T[-1] - T[0], 1e-6); rate = len(jumps) / dur
res.append(('flash ≤ 3 Hz', rate <= 3 and all(j2 - j1 >= 1 / 3 for j1, j2 in zip(jumps, jumps[1:])), f'{len(jumps)} flash(es) at {jumps}'))
# whiteout length: frames nearly blown out (mean > 0.75) should be a 1-2 frame hit, not a long wash
blown = int((B > 0.75).sum())
res.append(('hit, not a wash', blown <= 2, f'{blown} blown-out frame(s) (need ≤ 2)'))
for name, ok, why in res: print(f"{'PASS' if ok else 'FAIL'}  {name}: {why}")
print('LOOK  3 cel/toon shapes, 5 re-rolled sustain, 7 themed props, 12 crack+dome, 13 wipes: judge from the sheet')
print(f'score {sum(ok for _, ok, _ in res)}/{len(res)}')
