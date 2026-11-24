"""Recolour a flipbook sheet to one hue (additive glow keeps its shape): luminance -> black..hue..white ramp, alpha kept.

  python3 tint.py SHEET.png OUT.png '#3ad7ff' [--core 0.75]   (core: luminance above which it turns white-hot)"""
# @style: helper
import sys
import numpy as np
from PIL import Image

src, out, hexc = sys.argv[1:4]
core = float(sys.argv[sys.argv.index('--core') + 1]) if '--core' in sys.argv else 0.75
im = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32) / 255
c = np.array([int(hexc[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255
L = (im[..., :3] * [0.299, 0.587, 0.114]).sum(-1, keepdims=True)
lo = np.clip(L / core, 0, 1) * c                                      # dark -> hue
hi = np.clip((L - core) / (1 - core), 0, 1)                           # hue -> white-hot core
rgb = lo * (1 - hi) + hi
Image.fromarray((np.concatenate([rgb, im[..., 3:]], -1) * 255).astype(np.uint8)).save(out)
print(out)
