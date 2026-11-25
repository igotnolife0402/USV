"""Keep only the important frames of a grabbed video, map captions to frames, build contact sheets.
Usage (grab.mjs calls it): python3 -I tools/refs/keep.py domains/vfx/refs/tiktok/<dir> <step>
        Rebuild sheets only (frames/ already kept, no all/): python3 -I tools/refs/keep.py domains/vfx/refs/tiktok/<dir> --sheets
Input:  <dir>/all/f%05d.png (every frame at <step> s), optional <dir>/cues.json [{start,end,text}]
Output: <dir>/frames/fNNNN_tSSS.Ss.png (kept only), sheets/sheetNN.jpg (24 tiles), transcript.md, stats.csv,
        keep.json (kept/total/runs/cuts/palette) for meta.json. <dir>/all is deleted.
Keep rule: first + last frame, every caption start, and any frame whose change vs the LAST KEPT frame passes
MEAN (mean abs RGB) or AREA (share of pixels changed > 0.08); slow drifts get sampled once they add up."""
import csv, json, re, shutil, sys, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

MEAN, AREA, CUT = 0.02, 0.01, 0.15   # tuned 2026-11-25; CUT = hard cut measured 0.20-0.33 on a montage
d = pathlib.Path(sys.argv[1]); out = d / 'frames'


def content_box(ims):
    """Letterboxed reels (16:9 footage inside 9:16 + caption text in the bars): the content band = rows where most
    pixels are non-black in the median sampled frame, then columns inside that band. Returns None if no real bars."""
    smp = np.median(np.stack([np.asarray(ims[k], dtype=np.float32).max(axis=2) / 255 > 0.05
                              for k in range(0, len(ims), max(1, len(ims) // 12))]), axis=0)
    rows = np.where(smp.mean(axis=1) > 0.5)[0]
    if not len(rows): return None
    band = smp[rows[0]:rows[-1] + 1]; cols = np.where(band.mean(axis=0) > 0.5)[0]
    if not len(cols): return None
    box = (int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1)
    return box if (box[2] - box[0]) * (box[3] - box[1]) < 0.9 * ims[0].width * ims[0].height else None


def build_sheets(kept):
    """24 tiles per sheet with a time label; red label = first frame after a gap (filler frames dropped before it)."""
    sd = d / 'sheets'; shutil.rmtree(sd, ignore_errors=True); sd.mkdir()
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 18)
    ims = [Image.open(out / n).convert('RGB') for _, _, n in kept]
    box = content_box(ims)
    if box: ims = [im.crop(box) for im in ims]   # frames on disk stay uncropped
    cw, ch = ims[0].size; C = 6 if ch >= cw else 4; R = 24 // C; W = 200 if ch >= cw else 300; H = round(W * ch / cw)
    for s in range(0, len(kept), 24):
        sheet = Image.new('RGB', (C * W + (C - 1) * 4, R * H + (R - 1) * 4), 'black'); dr = ImageDraw.Draw(sheet)
        for j, ((i, t, _), im) in enumerate(zip(kept[s:s + 24], ims[s:s + 24])):
            x, y = (j % C) * (W + 4), (j // C) * (H + 4)
            sheet.paste(im.resize((W, H)), (x, y))
            gap = s + j > 0 and kept[s + j - 1][0] != i - 1
            dr.rectangle([x, y, x + 78, y + 22], fill=(170, 0, 0) if gap else (0, 0, 0)); dr.text((x + 4, y + 2), f'{t:.1f}s', font=font, fill='white')
        sheet.save(sd / f'sheet{s // 24 + 1:02d}.jpg', quality=88)
    return box, len(list(sd.iterdir()))


if len(sys.argv) > 2 and sys.argv[2] == '--sheets':
    kept = [(int(m[1]) - 1, float(m[2]), p.name) for p in sorted(out.glob('f*.png')) if (m := re.match(r'f(\d+)_t([\d.]+)s', p.name))]
    box, n = build_sheets(kept); print(json.dumps({'sheets': n, 'crop': box})); sys.exit()

step = float(sys.argv[2]) if len(sys.argv) > 2 else 0.1
src = sorted((d / 'all').glob('f*.png'))
if not src: sys.exit(f'no frames in {d}/all')
cues = json.loads((d / 'cues.json').read_text()) if (d / 'cues.json').exists() else []
cue_idx = {round(c['start'] / step) for c in cues}

def thumb(p):
    im = Image.open(p).convert('RGB'); im.thumbnail((270, 480)); return im

shutil.rmtree(out, ignore_errors=True); out.mkdir()
kept, last, prev, rows, pal = [], None, None, [], {}
for i, p in enumerate(src):
    im = thumb(p); a = np.asarray(im, dtype=np.float32) / 255
    vs_last = np.abs(a - last) if last is not None else None
    mean = float(vs_last.mean()) if vs_last is not None else 1.0
    area = float((vs_last.max(axis=2) > 0.08).mean()) if vs_last is not None else 1.0
    motion = float(np.abs(a - prev).mean()) if prev is not None else 0.0
    prev = a
    if not (i == 0 or i == len(src) - 1 or i in cue_idx or mean >= MEAN or area >= AREA):
        continue
    t = i * step; name = f'f{i + 1:04d}_t{t:05.1f}s.png'
    shutil.copy2(p, out / name); kept.append((i, t, name)); last = a
    rows.append(dict(t=round(t, 1), file=name, change=round(mean, 3), area=round(area, 3), motion=round(motion, 3)))

box, nsheets = build_sheets(kept)
# colour stats on the content band only (letterbox black would dominate the palette)
for r in rows:
    im = Image.open(out / r['file']).convert('RGB')
    if box: im = im.crop(box)
    im.thumbnail((200, 200)); a = np.asarray(im, dtype=np.float32) / 255; hsv = np.asarray(im.convert('HSV'), dtype=np.float32) / 255
    q = im.quantize(4, method=Image.Quantize.MEDIANCUT); cols = q.getpalette()[:12]
    top = ['#%02x%02x%02x' % tuple(cols[k * 3:k * 3 + 3]) for _, k in sorted(q.getcolors(), reverse=True)]
    for c in top[:2]: pal[c] = pal.get(c, 0) + 1
    r.update(bright=round(float(a.mean()), 3), sat=round(float(hsv[..., 1].mean()), 3), palette=' '.join(top))
with open(d / 'stats.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)

runs, start = [], kept[0]   # stretches of consecutive kept frames (step-by-step sequences)
for a_, b_ in zip(kept, kept[1:] + [None]):
    if b_ is None or b_[0] != a_[0] + 1:
        runs.append([round(start[1], 1), round(a_[1], 1)]); start = b_
head = ['---', f'summary: TikTok captions for {d.name} with the nearest kept frame per cue', f'updated: {__import__("datetime").date.today()}', 'status: current', '---']
lines = head + (['# Transcript (TikTok captions)', ''] if cues else ['# Transcript', '', 'No captions on this video.'])
for c in cues:
    near = min(kept, key=lambda k: abs(k[1] - c['start']))[2]
    lines.append(f"- {c['start']:.1f}-{c['end']:.1f}s → `{near}`: {c['text']}")
(d / 'transcript.md').write_text('\n'.join(lines) + '\n')
cuts = [r['t'] for r in rows if r['motion'] > CUT]
summary = dict(kept=len(kept), total=len(src), dropped=len(src) - len(kept), runs=runs, cuts=cuts, crop=box,
               palette=[c for c, _ in sorted(pal.items(), key=lambda x: -x[1])[:8]], sheets=nsheets, cues=len(cues))
(d / 'keep.json').write_text(json.dumps(summary))
shutil.rmtree(d / 'all')
print(json.dumps({k: summary[k] for k in ('kept', 'total', 'sheets', 'cues')} | {'runs': len(runs), 'cuts': len(cuts)}))
