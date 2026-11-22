# @style: helper
# Usage: python3 post.py <hero.png> <hero_depth.png> <focus_m> <out.jpg>
# 2x downsample, depth-of-field from the depth pass, vignette, grain; JPEG kept under 400 KB.
import sys, io, numpy as np
from PIL import Image

src, dep, focus, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
s2l = lambda c: np.where(c <= 0.04045, c/12.92, ((c + 0.055)/1.055)**2.4)
l2s = lambda c: np.where(c <= 0.0031308, c*12.92, 1.055*np.clip(c, 0, None)**(1/2.4) - 0.055)

img = s2l(np.asarray(Image.open(src).convert('RGB'), np.float32)/255)
H, W = img.shape[0]//2, img.shape[1]//2
img = img[:2*H, :2*W].reshape(H, 2, W, 2, 3).mean((1, 3))                  # linear-light 2x2 average
d8 = np.asarray(Image.open(dep).convert('RGB'), np.float64)
d = (d8[..., 0]*65536 + d8[..., 1]*256 + d8[..., 2])/16777215*64
d = d[:2*H, :2*W].reshape(H, 2, W, 2).min((1, 3))                          # nearest sample keeps edges tight
d = np.maximum(d, 0.05)
coc = np.minimum(40*np.maximum(0, np.abs(1 - focus/d) - 0.2), 22)

R = 24
def disk(r):
    y, x = np.mgrid[-R:R+1, -R:R+1]; k = np.clip(r + 0.5 - np.hypot(x, y), 0, 1); return k/k.sum()
def conv(a, k):                                                             # FFT convolution, reflect-padded
    p = np.pad(a, ((R, R), (R, R)) + ((0, 0),)*(a.ndim - 2), mode='reflect')
    sh = p.shape[:2]
    kk = np.zeros(sh); kk[:k.shape[0], :k.shape[1]] = k; kk = np.roll(np.roll(kk, -R, 0), -R, 1)
    Kf = np.fft.rfft2(kk)
    f = np.fft.rfft2(p, axes=(0, 1))
    r = np.fft.irfft2(f*(Kf[..., None] if a.ndim == 3 else Kf), sh, axes=(0, 1))
    return r[R:R+a.shape[0], R:R+a.shape[1]]

levels = [0, 2, 4, 7, 11, 16, 22]
stack = [img]
for r in levels[1:]:
    w = np.clip((coc - 0.6*r)/(0.3*r) + 1, 0, 1)                            # sharp pixels don't bleed into blur
    num = conv(img*w[..., None], disk(r)); den = conv(w, disk(r))
    full = conv(img, disk(r))
    stack.append(np.where(den[..., None] > 1e-3, num/np.maximum(den, 1e-3)[..., None], full))
c = np.clip(coc, 0, levels[-1]); outl = np.zeros_like(img)
for i in range(len(levels) - 1):
    a, b = levels[i], levels[i+1]; t = np.clip((c - a)/(b - a), 0, 1)
    m = ((c >= a) & ((c < b) | (i == len(levels) - 2)))[..., None]
    outl = np.where(m, stack[i]*(1 - t[..., None]) + stack[i+1]*t[..., None], outl)

y, x = np.mgrid[0:H, 0:W]; rr = ((x - W/2)/(W/2))**2 + ((y - H/2)/(H/2))**2
outl *= (1 - 0.22*np.clip(rr - 0.15, 0, None))[..., None]                  # vignette
o = l2s(np.clip(outl, 0, 1))
o += np.random.default_rng(7).normal(0, 0.006, (H, W, 1))                 # mono film grain
im = Image.fromarray((np.clip(o, 0, 1)*255 + 0.5).astype(np.uint8))
for q in (92, 90, 88, 85, 82, 78, 74, 70):
    b = io.BytesIO(); im.save(b, 'JPEG', quality=q, optimize=True, progressive=True, subsampling=0 if q >= 88 else 2)
    if b.tell() <= 400*1024: break
open(out, 'wb').write(b.getvalue())
print(f'{W}x{H} q{q} {b.tell()/1024:.0f} KB  coc max {coc.max():.1f} tiger-zone coc {np.median(coc[int(H*0.3):int(H*0.7), int(W*0.25):int(W*0.75)]):.2f}')
