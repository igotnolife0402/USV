"""Stylized look grid (owner reference 2026-11-24): each sheet's 5 band textures x layer_colors x BRIGHT + its -glow halo on navy, one hue per
effect, the frame with the most hued (not white) light. Same compositing as the preview. python3 grid.py BATCH_OUT [grid.png]"""
import sys, json, numpy as np
from PIL import Image
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import vfx
R = sys.argv[1].rstrip('/') + '/'
HUE = {'shock': (0, 200, 255), 'glints': (255, 200, 60), 'slash': (255, 50, 200), 'embers': (255, 90, 30), 'flame-arc': (60, 255, 110),
       'explosion': (255, 60, 40), 'kamehameha-charge': (40, 120, 255), 'lightsaber-blade': (170, 70, 255), 'dragon-swing': (0, 230, 200), 'crystal-burst': (120, 160, 255)}
NAVY = np.array([10, 22, 40], np.float32) / 255
C, UP = 128, 2
def cell(id, f):
    e = json.load(open(R + id + '.json')); b = e['bands']['5']
    cols = vfx.layer_colors(id, [HUE[id.rsplit('-v', 1)[0]]])
    def fr(p): a = np.asarray(Image.open(R + p).convert('RGBA'), np.float32) / 255; y, x = divmod(f, 8); return a[y*C:(y+1)*C, x*C:(x+1)*C]
    out = np.broadcast_to(NAVY, (C, C, 3)).copy()
    g = fr(e['glow'])[..., 3:] * .55; hc = np.array(cols[2]) / 255
    out = out * (1 - g) + hc * g                      # halo pass first, like the preview
    for k, (p, top) in enumerate(zip(b['files'], b['tops'])):
        t = fr(p); a = t[..., 3:]; col = np.array(cols[k]) / 255 * vfx.BRIGHT[k]
        out = out * (1 - a) + col * t[..., :1] * top * a
    return np.clip(out, 0, 1)
def peak(id):  # most hued light: max-light frames are white blobs, the reference shows the shape in colour with a small hot core
    def score(f):
        o = cell(id, f); mx, mn = o.max(2), o.min(2)
        return float(((mx > .35) & (mn < .85) & ((mx - mn) / np.maximum(mx, 1e-3) > .4)).sum()) - 3 * float((mn > .85).sum())
    return max(range(4, 60, 2), key=score)
ids = [k + '-v01' for k in HUE]
im = Image.new('RGB', (5 * C * UP, 2 * C * UP))
for i, id in enumerate(ids):
    c = Image.fromarray((cell(id, peak(id)) * 255).astype(np.uint8)).resize((C * UP, C * UP), Image.BICUBIC)
    im.paste(c, ((i % 5) * C * UP, (i // 5) * C * UP))
im.save(sys.argv[2] if len(sys.argv) > 2 else 'grid.png')
h = np.asarray(im.convert('HSV'), np.float32) / 255; rgb = np.asarray(im, np.float32)
lit = h[..., 2] > .35
print('lit sat', round(float(h[..., 1][lit].mean()), 2), 'near-white %', round(float((rgb.min(2) > 216).mean() * 100), 2), 'lit %', round(float(lit.mean() * 100), 1))
