"""3D fire/smoke simulation and volume renderer (numpy only).
Sim: incompressible flow on an N^3 grid; semi-Lagrangian trilinear advection of every field in one shared gather, exact
divergence-free projection in Fourier space, buoyancy from heat, vorticity confinement for curls, fuel that burns into
heat + soot. Render: orthographic along z; each z-slice is upsampled by two small matrix products, lit from above with
self-shadowing, fire glows by blackbody colour of its temperature."""
import math
import numpy as np
import img


class Sim:
    def __init__(self, N, seed):
        self.N = N
        self.rng = np.random.default_rng(seed)
        sh = (N, N, N)                                   # (z, y, x); y up
        self.v = np.zeros((3,) + sh, np.float32)         # velocity (vz, vy, vx) in cells per step
        self.rho = np.zeros(sh, np.float32)              # soot / smoke density
        self.T = np.zeros(sh, np.float32)                # temperature, 0 = ambient, 1 ~ 2000 K
        self.fuel = np.zeros(sh, np.float32)
        self.turb = None
        self.flame = np.zeros(sh, np.float32)
        self.blast, self.t = None, 0                      # (shape, per-step strengths): the initial detonation's swelling
        k = np.fft.fftfreq(N).astype(np.float32) * 2 * np.pi
        kr = np.fft.rfftfreq(N).astype(np.float32) * 2 * np.pi
        self.k = np.meshgrid(k, k, kr, indexing='ij')
        k2 = self.k[0] ** 2 + self.k[1] ** 2 + self.k[2] ** 2
        k2[0, 0, 0] = 1
        self.ik2 = 1 / k2
        g = np.arange(N, dtype=np.float32)
        self.Z, self.Y, self.X = np.meshgrid(g, g, g, indexing='ij')
        e = img.smooth(0, 6, np.minimum(g, N - 1 - g))      # sponge: gas fades out near the walls, so the periodic box never wraps
        self.sponge = (e[:, None, None] * e[None, :, None] * e[None, None, :]).astype(np.float32)

    def advect(self, fields, dt=1.0, v=None):
        """Trace every cell back along the flow (`v`, default the sim's) and sample all fields there at once (trilinear)."""
        N = self.N
        v = self.v if v is None else v
        p = [np.clip(c - dt * vc, 0, N - 1.001) for c, vc in zip((self.Z, self.Y, self.X), v)]
        i = [np.floor(q).astype(np.int32) for q in p]
        f = [q - ii for q, ii in zip(p, i)]
        st = np.stack(fields).reshape(len(fields), -1)
        base = (i[0] * N + i[1]) * N + i[2]
        out = 0
        for dz in (0, 1):
            wz = f[0] if dz else 1 - f[0]
            for dy in (0, 1):
                wzy = wz * (f[1] if dy else 1 - f[1])
                for dx in (0, 1):
                    w = wzy * (f[2] if dx else 1 - f[2])
                    out = out + st[:, (base + (dz * N + dy) * N + dx).ravel()] * w.ravel()
        return out.reshape((len(fields),) + self.rho.shape)

    def project(self, expand=None):
        """Make the flow divergence-free, except where `expand` (cells/step) says gas is being created: burning gas swells."""
        vh = [np.fft.rfftn(c) for c in self.v]
        div = sum(kc * vc for kc, vc in zip(self.k, vh)) * self.ik2
        if expand is not None:
            div = div + 1j * np.fft.rfftn(expand) * self.ik2
        self.v = np.stack([np.fft.irfftn(vc - kc * div, s=self.rho.shape) for kc, vc in zip(self.k, vh)]).astype(np.float32)

    def curl(self):
        vz, vy, vx = self.v
        d = lambda a, ax: (np.roll(a, -1, ax) - np.roll(a, 1, ax)) * 0.5
        return np.stack([d(vy, 2) - d(vx, 1), d(vx, 0) - d(vz, 2), d(vz, 1) - d(vy, 0)])   # (wz, wy, wx)

    def step(self, P):
        a = self.advect([self.v[0], self.v[1], self.v[2], self.rho, self.T, self.fuel])
        self.v, self.rho, self.T, self.fuel = a[:3], a[3], a[4], a[5]
        burn = np.minimum(self.fuel, P['burn'] * self.fuel * (self.T > P['ignite']))
        self.fuel -= burn
        self.flame = self.flame * 0.4 + burn                         # reaction zone, glows brightest
        self.T += burn * P['heat']
        self.rho += burn * P['soot']
        self.v[1] += P['buoy'] * self.T - P['weight'] * self.rho     # hot gas rises, soot sinks a little
        if self.turb is not None:                                    # small-scale stirring where the gas is hot
            self.v += self.turb * (P['turb'] * np.clip(self.T, 0, 1))[None]
        if P['vort']:
            w = self.curl()
            mag = np.sqrt((w ** 2).sum(0)) + 1e-6
            d = lambda a, ax: (np.roll(a, -1, ax) - np.roll(a, 1, ax)) * 0.5
            n = np.stack([d(mag, 0), d(mag, 1), d(mag, 2)])
            n /= np.sqrt((n ** 2).sum(0)) + 1e-6
            nz, ny, nx = n; wz, wy, wx = w
            self.v += P['vort'] * np.stack([ny * wx - nx * wy, nx * wz - nz * wx, nz * wy - ny * wz])
        self.v *= P['drag'] * self.sponge
        self.rho *= self.sponge; self.T *= self.sponge; self.fuel *= self.sponge
        self.T *= P['cool']
        self.rho *= P['fade']
        ex = burn * P['expand']
        if self.blast is not None and self.t < len(self.blast[1]):
            ex = ex + self.blast[0] * self.blast[1][self.t]
        self.t += 1
        self.project(ex)


def upsample_matrix(n, m):
    """m x n linear interpolation matrix: cell centres of n -> m."""
    x = (np.arange(m) + 0.5) * n / m - 0.5
    x0 = np.clip(np.floor(x).astype(int), 0, n - 1); x1 = np.clip(x0 + 1, 0, n - 1); f = np.clip(x - np.floor(x), 0, 1)
    U = np.zeros((m, n), np.float32)
    U[np.arange(m), x0] += 1 - f; U[np.arange(m), x1] += f
    return U


def render(sim, S, P, flow=False):
    """Volume -> premultiplied colour + alpha, S x S. Shading runs on the sim grid; only the shaded fields are upsampled
    (one batched matrix product), then composited front to back along z. y up in the volume = up in the image."""
    N = sim.N
    rho, T = np.maximum(sim.rho, 0), sim.T
    sig = P['sigma']
    tau = sun_depth(rho * sig, P.get('sun_slope', 0.5))                       # optical depth towards the sun (above, to the left)
    lit = P['amb'] + P['sun'] * np.exp(-tau * P['shadow'])
    a = 1 - np.exp(-rho * sig)
    K = P['k0'] + P['k1'] * np.clip(T, 0, 1.4)                               # sim temperature -> kelvin
    hot = img.smooth(P['glow_at'], P['glow_at'] * 2.5, T)                   # gas below this is just warm smoke
    # radiative transfer: a cell emits in proportion to how much it absorbs (Kirchhoff) times T^4 (Stefan-Boltzmann);
    # the thin reaction zone where fuel is burning right now adds the brightest light
    power = hot * (K / P['k_ref']) ** 4 * (a * P['glow'] + sim.flame * P['flame'])
    glow = img.blackbody(K + P['flame_k'] * np.clip(sim.flame * 8, 0, 1)) * power[..., None]   # (z, y, x, 3)
    smoke = np.array(P['smoke'], np.float32)
    nf = 7 if flow else 5
    f = [a, a * lit, glow[..., 0], glow[..., 1], glow[..., 2]] + ([sim.v[1], sim.v[2]] if flow else [])
    f = np.stack(f).reshape(nf * N, N, N)
    U = upsample_matrix(N, S)
    f = np.matmul(np.matmul(U, f), U.T).reshape(nf, N, S, S)[:, :, ::-1]     # (field, z, S, S); flip so +y is image-up
    a, al, g = np.clip(f[0], 0, 1), f[1], f[2:5].transpose(1, 2, 3, 0)
    trans = np.cumprod(1 - a, 0)
    tprev = np.concatenate([np.ones((1, S, S), np.float32), trans[:-1]], 0)
    if flow:                                                                  # screen motion: velocity averaged over what you see
        w = tprev * (a + np.clip(g.max(-1), 0, 1))
        ws = w.sum(0) + 1e-6
        fl = np.stack([-(w * f[5]).sum(0) / ws, (w * f[6]).sum(0) / ws]) * (S / N)   # (rows, cols) pixels per step
    E = (tprev[..., None] * g).sum(0)                                         # emitted light reaching the camera
    C = (tprev * al).sum(0)[..., None] * smoke + E
    A = 1 - trans[-1]
    C = 1 - np.exp(-C * P['exposure'])                                        # film-like: hot cores burn out to yellow-white
    ae = 1 - np.exp(-E.max(-1) * P['exposure'] * 1.5)                         # fire glows: emitted light counts as coverage
    A = 1 - (1 - A) * (1 - ae)
    C = np.minimum(C, A[..., None])
    if flow:
        return C.astype(np.float32), A.astype(np.float32), fl.astype(np.float32)
    return C.astype(np.float32), A.astype(np.float32)


def warp(img_, fl, t):
    """Sample `img_` (S, S, ch) at x - t * flow (bilinear, edge-clamped): the picture carried t of a step along its motion."""
    S = img_.shape[0]
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    y = np.clip(yy - t * fl[0], 0, S - 1.001); x = np.clip(xx - t * fl[1], 0, S - 1.001)
    y0, x0 = y.astype(np.int32), x.astype(np.int32); fy, fx = (y - y0)[..., None], (x - x0)[..., None]
    q = lambda a, b: img_[a, b]
    return (q(y0, x0) * (1 - fx) + q(y0, x0 + 1) * fx) * (1 - fy) + (q(y0 + 1, x0) * (1 - fx) + q(y0 + 1, x0 + 1) * fx) * fy


def tween(k0, k1, t):
    """In-between of key renders k0, k1 = (C, A, flow) at fraction t, like an animator's tween but motion-aware: k0 pushed
    forward along its flow, k1 pulled back along its own, blended. Works on premultiplied colour, so edges stay clean."""
    a = warp(np.concatenate([k0[0], k0[1][..., None]], -1), k0[2], t)
    b = warp(np.concatenate([k1[0], k1[1][..., None]], -1), k1[2], -(1 - t))
    m = a * (1 - t) + b * t
    return m[..., :3], m[..., 3]


def sun_depth(ext, slope):
    """Optical depth from each cell towards a sun above and to the left: march down from the top layer, each layer
    receiving the one above shifted by `slope` cells in x (fractional shift = linear blend of two rolls)."""
    tau = np.zeros_like(ext)
    acc = np.zeros_like(ext[:, 0])
    for y in range(ext.shape[1] - 1, -1, -1):
        tau[:, y] = acc + ext[:, y] * 0.5
        acc = acc + ext[:, y]
        acc = (1 - slope) * acc + slope * np.roll(acc, 1, 1)
    return tau


def curl_noise(N, seed, scale):
    """Divergence-free tileable turbulence (curl of three noise fields), shape (3, N, N, N), ~unit strength."""
    p = [noise_tile(N, seed + i, scale) for i in range(3)]
    d = lambda q, ax: (np.roll(q, -1, ax) - np.roll(q, 1, ax)) * 0.5
    c = np.stack([d(p[1], 2) - d(p[2], 1), d(p[2], 0) - d(p[0], 2), d(p[0], 1) - d(p[1], 0)])
    return (c / (np.abs(c).mean() * 1.6 + 1e-6)).astype(np.float32)


def noise_tile(n, seed, scale=4):
    """Tileable 3D value noise, 2 octaves (scale and 2x scale lattice cells across), values ~0..1, shape (n, n, n)."""
    rng = np.random.default_rng(seed)
    out = 0
    for o, amp in ((scale, 0.65), (scale * 2, 0.35)):
        lat = rng.random((o, o, o)).astype(np.float32)
        U = upsample_matrix_periodic(o, n)
        out = out + amp * np.einsum('az,bc,dx,zcx->abd', U, U, U, lat, optimize=True)
    return out


def upsample_matrix_periodic(n, m):
    x = np.arange(m) * n / m
    x0 = np.floor(x).astype(int) % n; x1 = (x0 + 1) % n; f = x - np.floor(x)
    f = f * f * (3 - 2 * f)
    U = np.zeros((m, n), np.float32)
    U[np.arange(m), x0] += 1 - f; U[np.arange(m), x1] += f
    return U
