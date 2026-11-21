# Ground (near + far), ground normal map, grit detail and background foliage textures.
import numpy as np, time
from PIL import Image
rng = np.random.default_rng(7)
t0 = time.time()

def lat(n, N, seed, tile=False):
    """Smooth noise: random lattice n x n bicubic-upsampled to N x N, roughly in [-1, 1]."""
    r = np.random.default_rng(seed).standard_normal((n, n)).astype('f4')
    if tile:
        big = np.tile(r, (3, 3))
        im = Image.fromarray(big, 'F').resize((3*N, 3*N), Image.BICUBIC)
        return np.asarray(im)[N:2*N, N:2*N]
    return np.asarray(Image.fromarray(r, 'F').resize((N, N), Image.BICUBIC))

def fbm(n0, N, seed, oct=5, tile=False):
    s, a, tot = 0, 1.0, 0
    for o in range(oct):
        n = n0*2**o
        if n > N: break
        s = s + a*lat(n, N, seed + o, tile); tot += a; a *= 0.55
    return s/tot

def ss(a, b, x):
    t = np.clip((x - a)/(b - a), 0, 1); return t*t*(3 - 2*t)

def srgb2lin(c): c = np.asarray(c, 'f4'); return np.where(c <= 0.04045, c/12.92, ((c + 0.055)/1.055)**2.4)
def lin2srgb(c): c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c*12.92, 1.055*c**(1/2.4) - 0.055)
def save(a, name, q=92):
    im = Image.fromarray((lin2srgb(a)*255 + 0.5).astype('u1'))
    im.save(name, quality=q) if name.endswith('.jpg') else im.save(name)

def yc(X): return 0.10*np.sin(0.35*X) + 0.04*(np.sin(0.9*X + 0.5) - np.sin(0.5))
def hw(X): return 0.55 + 0.08*np.sin(0.7*X + 1.0)

DIRT = srgb2lin([0.58, 0.47, 0.34]); DIRT2 = srgb2lin([0.47, 0.37, 0.26]); DUST = srgb2lin([0.68, 0.58, 0.45])
SOIL = srgb2lin([0.30, 0.26, 0.17]); LITTER = srgb2lin([0.45, 0.36, 0.22]); MOSS = srgb2lin([0.26, 0.29, 0.14])

def ground(N, half, seed, detail):
    c = (np.arange(N, dtype='f4') + 0.5)/N*2*half - half
    X = c[:, None] + np.zeros((1, N), 'f4')      # rows -> world X
    Y = np.zeros((N, 1), 'f4') + c[None, :]      # cols -> world Y
    sc = 2*half  # metres covered
    def F(cyc, s, o=5): return fbm(max(2, int(sc/cyc)), N, seed + s, o)
    e = F(1.2, 1)*0.10 + F(0.25, 2)*0.035
    dY = np.abs(Y - yc(X)) + e
    p = ss(hw(X) + 0.10, hw(X) - 0.06, dY)                     # path weight
    trod = ss(hw(X)*0.9, hw(X)*0.2, dY)                          # trampled centre
    n1, n2, n3 = F(2.0, 3), F(0.4, 4), F(0.08, 5, 3)
    dirt = DIRT + (DIRT2 - DIRT)*ss(-0.3, 0.6, n1)[..., None]
    dirt = dirt + (DUST - dirt)*(0.45*trod*ss(-0.2, 0.5, n2))[..., None]
    soil = SOIL + (LITTER - SOIL)*ss(-0.4, 0.5, n2)[..., None]
    soil = soil + (MOSS - soil)*(0.5*ss(0.1, 0.6, n1))[..., None]
    col = soil + (dirt - soil)*p[..., None]
    col = col*(1 + 0.18*n3)[..., None]
    hgt = (0.004*n2 + 0.0015*n3)*(0.4 + 0.6*p)
    if detail:
        tx = sc/N  # metres per texel
        def stamp(cx, cy, rad):
            r0, r1 = int((cx - rad + half)/tx), int((cx + rad + half)/tx) + 2
            c0, c1 = int((cy - rad + half)/tx), int((cy + rad + half)/tx) + 2
            r0, c0 = max(r0, 0), max(c0, 0); r1, c1 = min(r1, N), min(c1, N)
            if r1 <= r0 or c1 <= c0: return None
            return (slice(r0, r1), slice(c0, c1)), X[r0:r1, c0:c1] - cx, Y[r0:r1, c0:c1] - cy
        r = np.random.default_rng(seed + 50)
        # pebbles: dense on the path, sparse off it
        npb = int(9000*(half/6)**2)
        for _ in range(npb):
            x, y = r.uniform(-half, half, 2)
            on = abs(y - yc(x)) < hw(x) + 0.05
            if not on and r.random() > 0.15: continue
            rad = 0.004*np.exp(r.exponential(0.55)); rad = min(rad, 0.035)
            st = stamp(x, y, rad*1.3)
            if st is None: continue
            sl, dx, dy = st; a = r.uniform(0, np.pi); ca, sa = np.cos(a), np.sin(a)
            u, v = (dx*ca + dy*sa)/rad, (-dx*sa + dy*ca)/(rad*r.uniform(0.55, 0.9))
            d2 = u*u + v*v; m = ss(1.0, 0.8, d2)
            if not m.any(): continue
            pc = srgb2lin([0.55, 0.52, 0.47])*r.uniform(0.6, 1.15) + srgb2lin([0.05, 0.02, -0.02])*r.uniform(-1, 1)
            col[sl] = col[sl]*(1 - m[..., None]) + pc*m[..., None]*(0.9 + 0.1*n3[sl][..., None])
            hgt[sl] = np.maximum(hgt[sl], rad*0.55*np.sqrt(np.clip(1 - d2, 0, 1)))
        # fallen dry leaves (more at the path edges and in the grass)
        for _ in range(int(1400*(half/6)**2)):
            x, y = r.uniform(-half, half, 2)
            dd = abs(y - yc(x)) - hw(x)
            if dd < -0.25 and r.random() > 0.25: continue
            L = r.uniform(0.03, 0.11); Wd = L*r.uniform(0.3, 0.45)
            st = stamp(x, y, L*0.6)
            if st is None: continue
            sl, dx, dy = st; a = r.uniform(0, np.pi*2); ca, sa = np.cos(a), np.sin(a)
            u, v = (dx*ca + dy*sa)/(L/2), (-dx*sa + dy*ca)/(Wd/2)
            prof = np.clip(1 - u*u, 0, 1)**0.8*(1 - 0.25*np.clip(u, 0, 1))
            m = ss(1.0, 0.85, np.abs(v)/np.maximum(prof, 1e-3))*(np.abs(u) < 1)
            if not m.any(): continue
            lc = [srgb2lin([0.55, 0.36, 0.17]), srgb2lin([0.62, 0.48, 0.26]), srgb2lin([0.40, 0.27, 0.14]), srgb2lin([0.50, 0.44, 0.24])][r.integers(4)]
            lc = lc*r.uniform(0.75, 1.1)*(1 - 0.35*ss(0.06, 0.0, np.abs(v)))[..., None]
            col[sl] = col[sl]*(1 - m[..., None]) + lc*m[..., None]
            hgt[sl] = np.maximum(hgt[sl], hgt[sl]*(1 - m) + m*(0.0015 + 0.002*np.abs(u)))
        # twigs
        for _ in range(int(260*(half/6)**2)):
            x, y = r.uniform(-half, half, 2)
            L = r.uniform(0.05, 0.35); wd = r.uniform(0.003, 0.009)
            st = stamp(x, y, L/2 + 0.01)
            if st is None: continue
            sl, dx, dy = st; a = r.uniform(0, np.pi); ca, sa = np.cos(a), np.sin(a)
            u, v = dx*ca + dy*sa, -dx*sa + dy*ca
            v = v - 0.06*L*np.sin(u/L*3)
            m = ss(wd, wd*0.5, np.abs(v))*ss(L/2, L/2 - 0.005, np.abs(u))
            if not m.any(): continue
            tc = srgb2lin([0.36, 0.28, 0.20])*r.uniform(0.6, 1.2)
            col[sl] = col[sl]*(1 - m[..., None]) + tc*m[..., None]
            hgt[sl] = np.maximum(hgt[sl], m*wd*0.8)
        # tiger pugmarks behind the walking tiger (walks toward +X), single file, alternating sides
        for k in range(10):
            x = -1.15 - 0.62*k + r.normal(0, 0.03); side = 1 if k % 2 else -1
            y = yc(x) + side*0.11 + r.normal(0, 0.015)
            st = stamp(x, y, 0.09)
            if st is None: continue
            sl, dx, dy = st; a = r.normal(0, 0.08); ca, sa = np.cos(a), np.sin(a)
            u, v = dx*ca + dy*sa, -dx*sa + dy*ca                    # u forward
            pad = ((u + 0.012)/0.036)**2 + (v/0.047)**2 + 0.35*np.clip(-(u + 0.012)/0.036, 0, 1)*np.abs(v)/0.047
            dep = ss(1.15, 0.85, pad)
            for tu, tv in ((0.045, -0.040), (0.062, -0.014), (0.062, 0.014), (0.045, 0.040)):
                dep = np.maximum(dep, ss(1.15, 0.8, ((u - tu)/0.017)**2 + ((v - tv)/0.014)**2))
            rim = ss(1.0, 0.0, np.abs(pad - 1.35))*0.25
            hgt[sl] = hgt[sl] - 0.007*dep + 0.0012*rim
            col[sl] = col[sl]*(1 - 0.18*dep)[..., None]
    return np.clip(col, 0, 1), hgt

# near ground: +-6 m, 4096^2 (2.9 mm/texel), with normal map
col, hgt = ground(4096, 6.0, 100, True)
save(col, 'ground.jpg', 93)
tx = 12/4096
du = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1))/(2*tx)        # +u = +cols
dv = (np.roll(hgt, 1, 0) - np.roll(hgt, -1, 0))/(2*tx)        # +v = -rows (flipY)
n = np.stack([-du, -dv, np.ones_like(du)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
Image.fromarray(((n*0.5 + 0.5)*255 + 0.5).astype('u1')).save('groundn.png')
print('near ground', round(time.time() - t0, 1))
# far ground: +-48 m, 2048^2, no small detail
col, _ = ground(2048, 48.0, 100, False)
col = np.asarray(Image.fromarray((lin2srgb(col)*255).astype('u1')).resize((2048, 2048)))
Image.fromarray(col).save('groundfar.jpg', quality=90)
# grit detail (tileable, linear data, mean 0.5): 1024^2 tiled every 0.6 m
g = 0.5 + 0.11*fbm(64, 1024, 300, 4, True) + 0.05*lat(512, 1024, 310, True)
Image.fromarray((np.clip(g, 0, 1)*255).astype('u1')).convert('RGB').save('detail.jpg', quality=92)
print('far + detail', round(time.time() - t0, 1))

# background foliage band: 4096 x 1024 covers 360 deg x 8 m (v up)
Wb, Hb = 4096, 1024
yy = (Hb - 1 - np.arange(Hb, dtype='f4'))[:, None]/Hb*8 - 0.5   # metres above ground per row
uu = np.arange(Wb, dtype='f4')[None, :]/Wb
haze_lo, haze_hi, sky = srgb2lin([0.58, 0.55, 0.40]), srgb2lin([0.50, 0.53, 0.38]), srgb2lin([0.80, 0.80, 0.70])
bg = haze_lo + (haze_hi - haze_lo)*ss(0, 3, yy)[..., None] + np.zeros((Hb, Wb, 3), 'f4')
def lat2(nx, ny, seed):
    rr = np.random.default_rng(seed).standard_normal((ny, nx)).astype('f4')
    rr = np.concatenate([rr, rr[:, :1]], 1)
    im = np.asarray(Image.fromarray(rr, 'F').resize((Wb + Wb//nx, Hb), Image.BICUBIC))
    return im[:, :Wb]
def fb2(nx, ny, seed, o=5):
    s, a, t = 0, 1.0, 0
    for k in range(o): s = s + a*lat2(nx*2**k, ny*2**k, seed + k); t += a; a *= 0.55
    return s/t
def over(c, m): global bg; bg = bg*(1 - m[..., None]) + c*m[..., None]
far = fb2(40, 6, 400); over(srgb2lin([0.36, 0.42, 0.26]), 0.75*ss(-0.1, 0.25, far + 0.5*ss(1.2, 5.0, yy) - 0.35*ss(5.5, 7.5, yy)))
rb = np.random.default_rng(401)
def trunks(n, wmin, wmax, c, top, seed):
    r = np.random.default_rng(seed)
    for _ in range(n):
        x0 = r.uniform(0, 1); wd = r.uniform(wmin, wmax)/Wb; lean = r.normal(0, 0.004)
        xc = x0 + lean*yy/8 + 0.002*fb2(4, 8, seed + int(x0*1e4) % 997, 2)[:, :1]*0
        d = np.abs(((uu - xc + 0.5) % 1) - 0.5)
        m = ss(wd/2, wd/2*0.7, d)*ss(top, top - 1.0, yy)
        bark = 1 + 0.15*np.sin(yy*40 + x0*50)*0
        shade = 0.75 + 0.35*np.clip((uu - xc)/wd + 0.5, 0, 1)
        over(c*shade[..., None], m)
trunks(110, 6, 18, srgb2lin([0.50, 0.48, 0.40]), 9, 410)
mid = fb2(64, 10, 420)
over(srgb2lin([0.20, 0.28, 0.12]), ss(0.05, 0.3, mid + 0.6*ss(2.5, 0.3, yy) - 0.2))
hl = fb2(160, 30, 430, 3)
over(srgb2lin([0.55, 0.60, 0.25]), 0.8*ss(0.35, 0.6, hl)*ss(0.05, 0.3, mid + 0.6*ss(2.5, 0.3, yy) - 0.2))
trunks(28, 22, 60, srgb2lin([0.24, 0.20, 0.16]), 9, 440)
bush = fb2(90, 8, 450)
over(srgb2lin([0.11, 0.16, 0.06]), ss(-0.05, 0.25, bush + ss(1.6, 0.2, yy) - 0.55))
over(srgb2lin([0.45, 0.52, 0.18]), 0.7*ss(0.4, 0.62, fb2(220, 20, 460, 3))*ss(-0.05, 0.25, bush + ss(1.6, 0.2, yy) - 0.55))
# sun flecks through the canopy (turn into bokeh after the depth blur)
for _ in range(0):
    x, y = rb.uniform(0, Wb), rb.uniform(0, Hb*0.75); rad = rb.uniform(1.5, 5)
    r0, r1, c0, c1 = int(y - rad - 1), int(y + rad + 2), int(x - rad - 1), int(x + rad + 2)
    if r0 < 0 or c0 < 0 or r1 > Hb or c1 > Wb: continue
    Y_, X_ = np.mgrid[r0:r1, c0:c1]; m = ss(rad, rad*0.6, np.hypot(Y_ - y, X_ - x))
    bg[r0:r1, c0:c1] = bg[r0:r1, c0:c1]*(1 - m[..., None]) + srgb2lin([0.95, 0.88, 0.55])*rb.uniform(0.35, 0.6)*m[..., None]
save(bg, 'foliage.jpg', 90)
print('foliage', round(time.time() - t0, 1))
