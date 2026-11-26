// ugen.js: the library's sheet generator in the browser. A line-for-line port of the stylized unique.py (+ the Pen, arc, jag,
// ease, motes, noise, lit, light-split and white() it uses from actions.py / style.py / recolor.py / batch.py), so a sheet made here
// is drawn exactly like the 67 act- sheets in vfx/sheets: 160 px frames drawn at 2x with tapered disc strokes, lingering motes,
// noise erosion after 55 % of life, symbols.py lighting (core + 3 halos), navy-floor light split, radial edge fade, white Grid4x4
// 1024 px PNG (light = alpha). Claude writes the per-frame draw script; this file runs it 16 times and returns the sheet.
export const C = 160, SS = 2, F = 16, OUT = 256
const TAU = Math.PI * 2
export const ease = x => { x = Math.min(Math.max(x, 0), 1); return 1 - (1 - x) ** 3 }
const clip = (x, a, b) => x < a ? a : x > b ? b : x
export const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => n === 1 ? a : a + (b - a) * i / (n - 1))

// numpy default_rng stand-in (mulberry32): same API the elements use; reseeded every frame so particles keep their paths
export class RNG {
  constructor(seed) { this.s = (seed >>> 0) || 1 }
  random() { let t = this.s = (this.s + 0x6D2B79F5) >>> 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  uniform(a = 0, b = 1) { return a + (b - a) * this.random() }
  integers(a, b) { return a + Math.floor(this.random() * (b - a)) }
}

// actions.Pen: supersampled mask painter, frame px, centre 0,0; fills REPLACE the value (PIL semantics)
export class Pen {
  constructor() {
    this.cv = new OffscreenCanvas(C * SS, C * SS); this.x = this.cv.getContext('2d', { willReadFrequently: true })
    this.x.fillStyle = '#000'; this.x.fillRect(0, 0, C * SS, C * SS); this.ox = 0; this.oy = 0
  }
  P(x, y) { return [(x + this.ox + C / 2) * SS, (y + this.oy + C / 2) * SS] }
  fill(v) { const g = Math.round(255 * Math.min(v, 1)); this.x.fillStyle = `rgb(${g},${g},${g})` }
  dot(x, y, r, v = 1) {
    if (!(r > 0.2) || !(v > 0)) return
    const [a, b] = this.P(x, y); this.fill(v); this.x.beginPath(); this.x.arc(a, b, r * SS, 0, TAU); this.x.fill()
  }
  stroke(pts, w0, w1, v = 1) {                     // tapered stroke as a dense chain of discs (w = radius)
    if (pts.length < 2) return
    const L = [0]
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    const tot = L[L.length - 1] || 1, k = Math.max(2, Math.floor(tot * 1.5))
    let j = 0
    for (let i = 0; i <= k; i++) {
      const u = i / k * tot
      while (j < pts.length - 2 && L[j + 1] <= u) j++
      const f = (u - L[j]) / Math.max(L[j + 1] - L[j], 1e-6)
      this.dot(pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f, w0 + (w1 - w0) * (u / tot), v)
    }
  }
  poly(pts, v = 1) {
    if (pts.length < 3) return
    this.fill(v); this.x.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = this.P(x, y); i ? this.x.lineTo(a, b) : this.x.moveTo(a, b) }); this.x.closePath(); this.x.fill()
  }
  get(b = 0.6) {
    const s = new OffscreenCanvas(C, C), x = s.getContext('2d', { willReadFrequently: true })
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(this.cv, 0, 0, C, C)
    const d = x.getImageData(0, 0, C, C).data, m = new Float32Array(C * C)
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4] / 255
    return b ? blur(m, b) : m
  }
}

export function arc(r, a0, a1, o = {}) {
  const { cx = 0, cy = 0, sq = 1, rot = 0, k = 48 } = o, out = []
  for (let i = 0; i <= k; i++) {
    const a = a0 + (a1 - a0) * i / k, x = r * Math.cos(a), y = r * Math.sin(a) * sq
    out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)])
  }
  return out
}
export function jag(rng, x0, y0, x1, y1, k, amp) {
  const pts = [[x0, y0]]
  for (let i = 1; i < k; i++) {
    const f = i / k, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1, o = rng.uniform(-amp, amp)
    pts.push([x0 + (x1 - x0) * f + nx / l * o, y0 + (y1 - y0) * f + ny / l * o])
  }
  return [...pts, [x1, y1]]
}
// lingering particles: born at the impact, drift out, shrink late; they carry the effect past the main shape's fade
export function motes(pen, rng, cnt, t, rmax, spread = 1, up = 0, size = 1.6) {
  for (let i = 0; i < cnt; i++) {
    const a = rng.uniform(0, TAU), sp = rng.uniform(0.3, 1) * rmax * spread, r0 = rng.uniform(0, 0.3) * rmax, d = r0 + sp * ease(t * 1.2)
    const x = d * Math.cos(a), y = d * Math.sin(a) - up * t * t * rmax, v = (1 - Math.max(0, t - 0.55) / 0.45 * 0.85) * rng.uniform(0.6, 1)
    pen.dot(x, y, size * rng.uniform(0.6, 1.4) * (1.15 - 0.6 * t), v)
  }
}

// style.blur = PIL GaussianBlur(radius = sigma), separable, edge clamp
export function blur(m, r, n = C) {
  if (r <= 0) return m
  const R = Math.ceil(r * 3), k = new Float32Array(2 * R + 1); let s = 0
  for (let i = -R; i <= R; i++) s += k[i + R] = Math.exp(-i * i / (2 * r * r))
  for (let i = 0; i < k.length; i++) k[i] /= s
  const a = new Float32Array(n * n), o = new Float32Array(n * n)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let v = 0; for (let i = -R; i <= R; i++) v += k[i + R] * m[y * n + clip(x + i, 0, n - 1)]; a[y * n + x] = v }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let v = 0; for (let i = -R; i <= R; i++) v += k[i + R] * a[clip(y + i, 0, n - 1) * n + x]; o[y * n + x] = v }
  return o
}
// style.noise: 2-octave value noise, 0..1 (smooth upscale of a random grid)
const NZ = new Map()
export function noise(n, scale = 12, seed = 0) {
  const key = n + '|' + scale + '|' + seed
  if (NZ.has(key)) return NZ.get(key)
  const r = new RNG(seed * 7919 + 13), acc = new Float32Array(n * n)
  for (const [o, w] of [[scale, 0.65], [scale * 2.5, 0.35]]) {
    const k = Math.max(2, Math.floor(n / o)), g = Float32Array.from({ length: k * k }, () => r.random())
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {            // bicubic-smooth (smoothstep) sample, pixel-centre aligned like PIL resize
      const fx = clip((x + 0.5) * k / n - 0.5, 0, k - 1), fy = clip((y + 0.5) * k / n - 0.5, 0, k - 1)
      const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(k - 1, x0 + 1), y1 = Math.min(k - 1, y0 + 1)
      const u = (fx - x0) ** 2 * (3 - 2 * (fx - x0)), v = (fy - y0) ** 2 * (3 - 2 * (fy - y0))
      acc[y * n + x] += w * ((g[y0 * k + x0] * (1 - u) + g[y0 * k + x1] * u) * (1 - v) + (g[y1 * k + x0] * (1 - u) + g[y1 * k + x1] * u) * v)
    }
  }
  NZ.set(key, acc); return acc
}

// ---------- the 33 elements of unique.py (el(pen, rng, t, S) draws at the pen origin; S: R radius, w width, n, k counts, sweep, sq squash)
const P2 = Math.PI / 2
export const EL = {
  crescent(pen, rng, t, S) {
    const head = ease(t / 0.4), tail = 0.8 * ease(Math.max(0, t - 0.26) / 0.74), a0 = Math.PI * 0.85, sp = Math.max(S.sweep, 2.2)
    const pts = arc(S.R, a0 + sp * tail, a0 + sp * head, { sq: S.sq })
    if (pts.length > 1 && head > tail + 0.01) pen.stroke(pts, 0.5, 8 * S.w * (1 - 0.5 * tail), 1)
  },
  claw(pen, rng, t, S) {
    for (let c = 0; c < 3 + S.n % 2; c++) {
      const tt = t - c * 0.05, head = ease(tt / 0.35), tail = 0.8 * ease(Math.max(0, tt - 0.25) / 0.7)
      if (head > tail + 0.01) pen.stroke(arc(S.R * 0.9, -2.4 + 1.6 * tail, -2.4 + 1.6 * head, { sq: 0.5 }).map(([x, y]) => [x, y + (c - 1.5) * S.R * 0.25]), 0.4, 3.5 * S.w, 1)
    }
  },
  xcut(pen, rng, t, S) {
    [0.75, 2.35].forEach((a, c) => {
      const tt = t - c * 0.1, L = S.R * 1.1 * ease(tt / 0.25), w = 4 * S.w * (1 - ease(Math.max(0, tt - 0.3) / 0.7))
      if (L > 2) pen.stroke([[-L * Math.cos(a), -L * Math.sin(a)], [L * Math.cos(a), L * Math.sin(a)]], 0.4, w + 0.3, 1)
    })
  },
  thrust(pen, rng, t, S) {
    const L = S.R * 1.25 * ease(t / 0.25), x0 = -S.R * 1.2 + S.R * 2.2 * ease(Math.max(0, t - 0.3) / 0.7)
    if (L > 2 && x0 < -S.R * 1.2 + L * 2) pen.stroke([[x0, 0], [-S.R * 1.2 + L * 2, 0]], 0.5, 5 * S.w, 1)
  },
  shock(pen, rng, t, S) { const r = S.R * (0.15 + 0.85 * ease(t / 0.5)), th = 5 * S.w * (1 - ease(t / 0.75)) + 0.4; pen.stroke(arc(r, 0, TAU, { k: 80 }), th, th, 1) },
  ground(pen, rng, t, S) { const r = S.R * (0.2 + 0.9 * ease(t / 0.5)), th = 4 * S.w * (1 - ease(t / 0.75)) + 0.4; pen.stroke(arc(r, 0, TAU, { sq: 0.3, k: 80 }), th, th, 1) },
  spikes(pen, rng, t, S) {
    const k = 4 + S.k % 9, pk = ease(t / 0.35) * (1 - 0.7 * ease(Math.max(0, t - 0.35) / 0.65)), pts = []
    for (let i = 0; i < 2 * k; i++) { const a = Math.PI * i / k, r = S.R * (i % 2 === 0 ? 0.9 : 0.25 + 0.1 * (S.n % 3)) * pk; pts.push([r * Math.cos(a), r * Math.sin(a)]) }
    if (pk > 0.03) pen.poly(pts, 1)
  },
  cracks(pen, rng, t, S) {
    for (let i = 0; i < S.k; i++) {
      const a = i * TAU / S.k + rng.uniform(-0.25, 0.25), L = S.R * rng.uniform(0.5, 1) * ease((t - 0.05) / 0.25)
      if (L > 2) pen.stroke(jag(rng, 0, 0, L * Math.cos(a), L * Math.sin(a), 5, 4), 2.5 * S.w, 0.3, 1)
    }
  },
  dashes(pen, rng, t, S) {
    for (let i = 0; i < S.k * 2; i++) {
      const a = rng.uniform(0, TAU), ph = rng.uniform(0, 0.3), r1 = S.R * (1.2 - ease((t - ph) / 0.5)), r2 = r1 + S.R * rng.uniform(0.2, 0.45)
      if (r1 < S.R * 1.15) pen.stroke([[r1 * Math.cos(a), r1 * Math.sin(a)], [r2 * Math.cos(a), r2 * Math.sin(a)]], 0.4, 1.7 * S.w, 1)
    }
  },
  spiral(pen, rng, t, S) {
    const arms = 2 + S.n % 3
    for (let j = 0; j < arms; j++) {
      const b = j * TAU / arms + t * 3
      pen.stroke(linspace(0, ease(t / 0.4), 36).map(f => [S.R * (0.1 + 0.9 * f) * Math.cos(b + f * S.sweep), S.R * (0.1 + 0.9 * f) * Math.sin(b + f * S.sweep)]), 0.5, 2.6 * S.w, 1)
    }
  },
  helix(pen, rng, t, S) {
    for (const j of [0, Math.PI]) pen.stroke(linspace(0, ease(t / 0.35), 40).map(f => [(S.R * 0.2 + S.R * 0.5 * f) * Math.cos(j + f * 7 + t * 6), (f - 0.5) * S.R * 1.9]), 0.5, 2.2 * S.w, 1)
  },
  streaks(pen, rng, t, S) {
    for (let i = 0; i < S.n + 2; i++) {
      const y = (i / (S.n + 1) - 0.5) * S.R * 1.3, ph = rng.uniform(0, 0.25)
      const hx = -S.R * 1.2 + 2.4 * S.R * ease((t - ph) / 0.6), tx = -S.R * 1.2 + 2.4 * S.R * ease((t - ph - 0.18) / 0.7)
      if (hx - tx > 3) pen.stroke(linspace(tx, hx, 20).map(x => [x, y + 6 * Math.sin(x / 14)]), 0.4, 2.4 * S.w, 1)
    }
  },
  waves(pen, rng, t, S) {
    for (let i = 0; i < 2 + S.n % 3; i++) {
      const y = (i - 1) * S.R * 0.35, L = ease(t / 0.45)
      pen.stroke(linspace(-S.R, -S.R + 2 * S.R * L, 40).map(x => [x, y + S.R * 0.15 * Math.sin(x / S.R * 6 + t * 8 + i)]), 1.6 * S.w, 1.6 * S.w, 1)
    }
  },
  puffs(pen, rng, t, S) {
    const g = ease(t / 0.4)
    for (let i = 0; i < 6 + Math.floor(S.k / 2); i++) { const a = rng.uniform(0, TAU), d = S.R * rng.uniform(0.1, 0.55) * g; pen.dot(d * Math.cos(a), d * Math.sin(a), S.R * rng.uniform(0.18, 0.32) * (0.3 + 0.7 * g), 0.9) }
  },
  flames(pen, rng, t, S) {
    const g = ease(t / 0.3)
    for (let i = 0; i < 3 + Math.floor(S.k / 2); i++) {
      const x = rng.uniform(-0.5, 0.5) * S.R, h = S.R * rng.uniform(0.7, 1.3) * g * (1 - 0.3 * t), ph = rng.uniform(0, 6)
      pen.stroke(linspace(0, 1, 16).map(f => [x + Math.sin(ph + f * 5 + t * 9) * 6 * f, S.R * 0.6 - h * f]), 6 * S.w, 0.4, 1)
    }
  },
  bolt(pen, rng, t, S) {
    const pts = jag(rng, 0, -S.R * 1.1, rng.uniform(-0.3, 0.3) * S.R, S.R * 0.7, 9, S.R * 0.2), n = Math.max(2, Math.floor(pts.length * ease(t / 0.2)))
    pen.stroke(pts.slice(0, n), 2.6 * S.w, 1.5 * S.w, 1)
  },
  fountain(pen, rng, t, S) {
    for (let i = 0; i < S.k + 6; i++) {
      const a = -P2 + rng.uniform(-1, 1), sp = S.R * rng.uniform(0.7, 1.2), x = Math.cos(a) * sp * t, y = S.R * 0.6 + Math.sin(a) * sp * t * 1.7 + S.R * 1.5 * t * t
      pen.dot(x, y, rng.uniform(2, 4) * (1.1 - 0.6 * t))
    }
  },
  beam(pen, rng, t, S) { const L = S.R * 2.4 * ease(t / 0.35); pen.stroke([[-S.R * 1.2, 0], [-S.R * 1.2 + L, 0]], 4 * S.w, 4 * S.w, 1); pen.dot(-S.R * 1.2 + L, 0, S.R * 0.22 * ease(t / 0.35), 1) },
  orbit(pen, rng, t, S) { for (let i = 0; i < S.k; i++) { const a = i * TAU / S.k + t * 2.5, r = S.R * 0.75 * ease(t / 0.3); pen.dot(r * Math.cos(a), r * Math.sin(a), 3 * S.w, 1) } },
  rise(pen, rng, t, S) {
    for (let i = 0; i < S.k + 2; i++) {
      const x = rng.uniform(-0.7, 0.7) * S.R, ph = rng.uniform(0, 0.4), y = S.R * 0.7 - S.R * 1.5 * ease((t - ph) / 0.6), s = rng.uniform(3, 6)
      if (t < ph) continue
      if (i % 2) { pen.stroke([[x - s, y], [x + s, y]], 1.3, 1.3); pen.stroke([[x, y - s], [x, y + s]], 1.3, 1.3) } else pen.dot(x, y, s * 0.4, 1)
    }
  },
  shards(pen, rng, t, S) {
    for (let i = 0; i < S.k; i++) {
      const a = rng.uniform(0, TAU), d = S.R * (0.05 + 0.85 * ease((t - 0.05) / 0.5)) * rng.uniform(0.6, 1), s = rng.uniform(5, 11) * ease(t / 0.2)
      const cx = d * Math.cos(a), cy = d * Math.sin(a), b = a + t * 2
      pen.poly([[cx + s * Math.cos(b), cy + s * Math.sin(b)], [cx + s * 0.3 * Math.cos(b + 2), cy + s * 0.3 * Math.sin(b + 2)], [cx - s * 0.6 * Math.cos(b), cy - s * 0.6 * Math.sin(b)], [cx + s * 0.3 * Math.cos(b - 2), cy + s * 0.3 * Math.sin(b - 2)]], 1)
    }
  },
  column(pen, rng, t, S) {
    for (let i = 0; i < 7 + S.n; i++) {
      const y = S.R * 0.7 - S.R * 1.6 * ease((t - i * 0.03) / 0.7) * (i + 1) / (8 + S.n)
      pen.dot(rng.uniform(-0.15, 0.15) * S.R * (1 + t), y, S.R * (0.12 + 0.05 * i) * ease(t / 0.3), 0.8)
    }
  },
  fan(pen, rng, t, S) {
    for (let i = 0; i < S.k; i++) {
      const a = -P2 + (i / Math.max(S.k - 1, 1) - 0.5) * S.sweep * 0.5, L = S.R * rng.uniform(0.7, 1.1) * ease(t / 0.3)
      if (L > 2) pen.stroke([[0, S.R * 0.5], [L * Math.cos(a), S.R * 0.5 + L * Math.sin(a)]], 2.4 * S.w, 0.3, 1)
    }
  },
  pillar(pen, rng, t, S) {
    const w = S.R * 0.22 * S.w * ease(t / 0.2) * (1 - 0.6 * ease(Math.max(0, t - 0.4) / 0.6)), h = S.R * 1.2
    if (w > 0.5) pen.poly([[-w, h], [w, h], [w * 0.4, -h], [-w * 0.4, -h]], 1)
  },
  faultline(pen, rng, t, S) {
    const L = S.R * 1.2 * ease(t / 0.3); pen.stroke(jag(rng, -L, S.R * 0.4, L, S.R * 0.4, 10, 5), 2.5 * S.w, 2.5 * S.w, 1)
    for (let i = 0; i < S.k; i++) { const x = rng.uniform(-1, 1) * L; pen.dot(x, S.R * 0.4 - S.R * 0.9 * t * (1 - t) * rng.uniform(1, 3), rng.uniform(2, 4)) }
  },
  comet(pen, rng, t, S) {
    const x = -S.R * 1.1 + S.R * 2.2 * ease(t / 0.6), y = -x * 0.5; pen.dot(x, y, S.R * 0.16 * S.w, 1)
    pen.stroke(linspace(1, 0, 12).map(f => [x - S.R * 0.7 * f, y + S.R * 0.35 * f]), 0.4, S.R * 0.14 * S.w, 0.8)
  },
  petals(pen, rng, t, S) {
    for (let i = 0; i < S.k; i++) {
      const a = i * TAU / S.k + t * 2, r = S.R * 0.8 * ease(t / 0.5), cx = r * Math.cos(a), cy = r * Math.sin(a)
      pen.stroke([[cx - 5 * Math.cos(a + 1.2), cy - 5 * Math.sin(a + 1.2)], [cx + 5 * Math.cos(a + 1.2), cy + 5 * Math.sin(a + 1.2)]], 3 * S.w, 0.5, 1)
    }
  },
  zigring(pen, rng, t, S) {
    const r = S.R * (0.3 + 0.6 * ease(t / 0.4)), k = 10 + 2 * S.n
    pen.stroke(Array.from({ length: k + 1 }, (_, i) => { const q = r * (i % 2 ? 1.12 : 0.88), a = i * TAU / k + t; return [q * Math.cos(a), q * Math.sin(a)] }), 1.8 * S.w, 1.8 * S.w, 1)
  },
  bubbles(pen, rng, t, S) {
    for (let i = 0; i < S.k; i++) {
      const x = rng.uniform(-0.6, 0.6) * S.R, y = S.R * 0.7 - S.R * 1.4 * ease((t - rng.uniform(0, 0.3)) / 0.7), r = rng.uniform(4, 9)
      pen.stroke(arc(r, 0, TAU, { cx: x, cy: y, k: 20 }), 1.2, 1.2)
    }
  },
  vortex(pen, rng, t, S) {
    for (let i = 0; i < 3; i++) { const f = (i / 3 + t * 1.5) % 1, r = S.R * (1 - f), w = 2 * S.w * (1 - f) + 0.3; pen.stroke(arc(r, 0, TAU, { sq: S.sq, k: 60 }), w, w, 1) }
  },
  sparkfall(pen, rng, t, S) {
    for (let i = 0; i < S.k + 4; i++) {
      const a = -P2 + rng.uniform(-1.3, 1.3), sp = S.R * rng.uniform(0.8, 1.3)
      pen.stroke(linspace(Math.max(0, t - 0.12), t, 5).map(tt => [Math.cos(a) * sp * tt, Math.sin(a) * sp * tt + S.R * 1.6 * tt * tt]), 0.3, 1.6, 1)
    }
  },
  polyshock(pen, rng, t, S) {
    const k = 3 + S.n % 4, r = S.R * (0.15 + 0.85 * ease(t / 0.5)), th = 4 * S.w * (1 - ease(t / 0.75)) + 0.4
    pen.stroke(Array.from({ length: k + 1 }, (_, i) => [r * Math.cos(i * TAU / k - P2), r * Math.sin(i * TAU / k - P2)]), th, th, 1)
  },
  dashring(pen, rng, t, S) {
    const r = S.R * 0.75 * ease(t / 0.3), k = 6 + S.n
    for (let i = 0; i < k; i++) { const a = i * TAU / k + t * 2; pen.stroke(arc(r, a, a + Math.PI / k * 0.9, { k: 8 }), 2.2 * S.w, 2.2 * S.w, 1) }
  }
}

// unique.params: one element's shape parameters; s = size (primary 0.8-0.95, partner 0.65-0.85), o overrides any field
export function params(rng, s = 0.9, o = {}) {
  return { R: C * 0.4 * s, w: rng.uniform(0.7, 1.4), n: rng.integers(1, 7), k: rng.integers(5, 13), sweep: rng.uniform(1.8, 3.6), sq: rng.uniform(0.45, 1), ...o }
}

// unique.draw around the script: fresh RNG per frame (paths persist), script draws, motes, noise erosion after 55 % of life
function frame(fn, seed, t) {
  let maxR = 0
  const pen = new Pen(), rng = new RNG(seed), prng = new RNG(seed + 7)   // params come from their own stream, like unique.params, so rng feeds only the shapes + motes
  const U = { C, EL, ease, arc, jag, linspace, motes, params: (s, o) => { const q = params(prng, s, o); maxR = Math.max(maxR, q.R); return q }, rng: k => new RNG(seed + 1 + k), at: (x, y) => { pen.ox = x; pen.oy = y }, PI: Math.PI, TAU }
  const r = fn(pen, rng, t, U) || {}
  pen.ox = pen.oy = 0
  if (r.motes !== false) motes(pen, rng, r.motes ?? 6, t, r.moteR ?? (maxR || C * 0.36), 0.9, 0, 1.3)
  let m = pen.get()
  if (t > 0.55) { const e = (t - 0.55) / 0.45, nz = noise(C, 9, seed % 97); m = m.map((v, i) => v * clip((nz[i] - e * 0.8) / 0.25 + 0.15, 0, 1)) }
  return m.map(v => clip(v, 0, 1))
}

// actions.lit (symbols.py lighting, cyan like mix3 cell 0) over the navy backdrop, then recolor.split's light: L = (max channel - p20) / (1 - p20)
const HUE = [0x2e / 255, 0xe6 / 255, 1], BG = [0.05, 0.12, 0.18]
function value(m) {
  const b25 = blur(m, 2.5), h6 = blur(m, 6), h16 = blur(m, 16), h30 = blur(m, 30), v = new Float32Array(C * C)
  for (let i = 0; i < v.length; i++) {
    const core = clip(clip(b25[i] - 0.55, 0, 1) / 0.45 * 0.9, 0, 1), body = clip(m[i] * 0.85 + h6[i] * 0.7 + h16[i] * 0.6 + h30[i] * 0.35, 0, 1.3)
    let mx = 0
    for (let c = 0; c < 3; c++) mx = Math.max(mx, BG[c], clip(body * HUE[c] + core * (1 - HUE[c]), 0, 1))
    v[i] = mx
  }
  return v
}

// actions.jump: a pop = one frame step many times its neighbour (pass < ~3)
export function jump(ms) {
  const st = [], mass = ms.map(m => m.reduce((a, b) => a + b, 0) / m.length)
  for (let i = 0; i < ms.length - 1; i++) { let s = 0; for (let j = 0; j < ms[i].length; j++) s += Math.abs(ms[i + 1][j] - ms[i][j]); st.push(s / ms[i].length) }
  const mmax = Math.max(...mass), act = st.map((_, i) => Math.max(mass[i], mass[i + 1]) >= 0.05 * mmax), sa0 = st.filter((_, i) => act[i]), sa = sa0.length ? sa0 : st
  const med = [...sa].sort((a, b) => a - b)[Math.floor(sa.length / 2)], fl = 0.25 * med; let worst = 1
  for (let i = 0; i < sa.length - 1; i++) worst = Math.max(worst, Math.max(sa[i], sa[i + 1]) / Math.max(Math.min(sa[i], sa[i + 1]), fl))
  return Math.round(worst * 100) / 100
}

// compile Claude's script: the body of (pen, rng, t, U) => { ... }
export function compile(code) {
  let fn
  try { fn = new Function('pen', 'rng', 't', 'U', code) } catch (e) { throw new Error('script does not compile: ' + e.message) }
  return fn
}

// the sheet: 16 frames at t = .05 + .95 f / 15, Grid4x4, 256 px cells, radial edge fade (batch.white), white RGB, light = alpha
export async function makeSheet(code, seed = 1125) {
  const fn = typeof code === 'function' ? code : compile(code), ms = []
  for (let f = 0; f < F; f++) {
    try { ms.push(frame(fn, seed, 0.05 + 0.95 * f / (F - 1))) } catch (e) { throw new Error(`script failed at frame ${f}: ${e.message}`) }
    if (f % 4 === 3) await new Promise(r => setTimeout(r))       // keep the page responsive
  }
  const vs = ms.map(value), all = new Float32Array(F * C * C); vs.forEach((v, i) => all.set(v, i * C * C))
  const bg = Float32Array.from(all.filter((_, i) => i % 7 === 0)).sort()[Math.floor(all.length / 7 * 0.2)]
  const fade = new Float32Array(C * C)
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { const d = Math.hypot(-1 + 2 * x / (C - 1), -1 + 2 * y / (C - 1)); fade[y * C + x] = clip((1 - d) / 0.25, 0, 1) ** 1.5 }
  const sheet = new OffscreenCanvas(4 * OUT, 4 * OUT), sx = sheet.getContext('2d'), cell = new OffscreenCanvas(C, C), cx = cell.getContext('2d')
  sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high'
  let empty = 0
  vs.forEach((v, f) => {
    const id = cx.createImageData(C, C); let peak = 0
    for (let i = 0; i < v.length; i++) { const L = clip((v[i] - bg) / (1 - bg), 0, 1) * fade[i]; peak = Math.max(peak, L); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = Math.round(L * 255) }
    if (ms[f].reduce((a, b) => Math.max(a, b), 0) < 0.05) empty++
    cx.putImageData(id, 0, 0); sx.drawImage(cell, (f % 4) * OUT, Math.floor(f / 4) * OUT, OUT, OUT)
  })
  const blob = await sheet.convertToBlob({ type: 'image/png' })
  return { blob, url: URL.createObjectURL(blob), empty, jump: jump(ms) }
}
