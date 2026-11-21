// Texture plugin: surface settings, procedural and image textures, UV projection, PNG export.
// Texture defs live in scene.textures (see README): procedural {kind, pattern, colors, count, detail, seed, res, scale, offset, rot}
// or image {kind:'image', src:<tex-store id>, res, aspect, scale, offset, rot}. scale = studs per tile.
import * as THREE from 'three'
import { addIcons, icon } from '../core/ui.js'
import { MATERIALS } from '../core/model.js'

addIcons({
  texture: 'M2.5 2.5h11v11h-11z M2.5 6.2h11 M2.5 9.8h11 M6.2 2.5v3.7 M9.8 6.2v3.6 M6.2 9.8v3.7',
  uv: 'M2.5 2.5h4.5v4.5H2.5z M9 9h4.5v4.5H9z M7 4.7h2.3a2 2 0 0 1 2 2V9 M9 11.3H6.7a2 2 0 0 1-2-2V7'
})

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }
export const uid = p => p + Math.random().toString(36).slice(2, 8)
export const makeCanvas = (w, hh = w) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; c.getContext('2d', { willReadFrequently: true }); return c } // CPU canvas: fast pixel reads, no GPU readback
const hexRgb = s => { const n = parseInt(String(s || '#ffffff').slice(1, 7), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255] }
const fract = x => x - Math.floor(x)
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const pow2 = n => Math.min(1024, Math.max(64, 2 ** Math.round(Math.log2(Math.max(1, n)))))
const RES = [128, 256, 512, 1024, 2048]
const clampRes = n => RES.reduce((a, b) => Math.abs(b - n) < Math.abs(a - n) ? b : a, 256)

// ---------- seamless noise (periodic over one tile) ----------
function hash(x, y, s) { let k = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; k = Math.imul(k ^ (k >>> 13), 1274126177); k ^= k >>> 16; return (k >>> 0) / 4294967296 }
const md = (i, n) => i >= 0 ? (i < n ? i : i < 2 * n ? i - n : i % n) : i >= -n ? i + n : (i % n + n) % n // int index into [0, n) without slow float modulo
function vnoise(u, v, px, py, s) {
  const x = u * px, y = v * py, ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const x0 = md(ix, px), y0 = md(iy, py), x1 = x0 + 1 >= px ? 0 : x0 + 1, y1 = y0 + 1 >= py ? 0 : y0 + 1
  const a = hash(x0, y0, s), b = hash(x1, y0, s), c = hash(x0, y1, s), d = hash(x1, y1, s)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}
function fbm(u, v, px, py, oct, s, g = 0.5) { let t = 0, a = 1, n = 0; for (let o = 0; o < oct; o++) { t += a * vnoise(u, v, px << o, py << o, s + o * 131); n += a; a *= g } return t / n }
const tone = (o, A, k) => { o[0] = A[0] * k; o[1] = A[1] * k; o[2] = A[2] * k; return o }
const mix = (o, A, B, t, k = 1) => { t = clamp01(t); o[0] = (A[0] + (B[0] - A[0]) * t) * k; o[1] = (A[1] + (B[1] - A[1]) * t) * k; o[2] = (A[2] + (B[2] - A[2]) * t) * k; return o }
const ramp = (o, C, t, k = 1) => t < 0 ? mix(o, C[0], C[1], -t, k) : mix(o, C[0], C[2], t, k) // 3-tone: -1 dark, 0 base, +1 light
const wrap = d => d - Math.round(d) // shortest signed distance on a unit torus
// tileable Voronoi, n x n jittered cells -> VR = [cell id, distance to the nearest edge, edge normal x, y] in cell units
const VR = [0, 0, 0, 0], VC = new Map()
function vor(u, v, n, s) {
  let VP = VC.get(s * 4096 + n)
  if (!VP) { if (VC.size > 15) VC.clear(); VC.set(s * 4096 + n, VP = new Float32Array(n * n * 3)); for (let i = 0; i < n * n; i++) { const x = i % n, y = i / n | 0; VP[i * 3] = 0.1 + 0.8 * hash(x, y, s); VP[i * 3 + 1] = 0.1 + 0.8 * hash(x, y, s + 17); VP[i * 3 + 2] = hash(x, y, s + 29) } }
  const x = u * n, y = v * n, ix = Math.floor(x), iy = Math.floor(y); let f1 = 9, f2 = 9, id = 0, x1 = 0, y1 = 0, x2 = 0, y2 = 0
  for (let dy = -1; dy <= 1; dy++) {
    const cy = iy + dy, r = md(cy, n) * n
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx, j = (r + md(cx, n)) * 3, ex = cx + VP[j] - x, ey = cy + VP[j + 1] - y, d = ex * ex + ey * ey
      if (d < f1) { f2 = f1; x2 = x1; y2 = y1; f1 = d; x1 = ex; y1 = ey; id = VP[j + 2] } else if (d < f2) { f2 = d; x2 = ex; y2 = ey }
    }
  }
  const nx = x2 - x1, ny = y2 - y1, l = Math.sqrt(nx * nx + ny * ny) || 1
  VR[0] = id; VR[1] = ((x1 + x2) * nx + (y1 + y2) * ny) / (2 * l); VR[2] = nx / l; VR[3] = ny / l; return VR
}
// field: f(u, v, a, i) fills ch channels on a G x G grid (G <= 128), returned upsampled to the N x N draw (bilinear, wrapped)
function field(N, ch, f) {
  const G = Math.min(N, 128), a = new Float32Array(G * G * ch), T = [], X0 = new Int32Array(N), X1 = new Int32Array(N), FX = new Float64Array(N)
  for (let y = 0, i = 0; y < G; y++) for (let x = 0; x < G; x++, i += ch) f(x / G, y / G, a, i)
  for (let x = 0; x < N; x++) { const f = (x + 0.5) / N * G, i = Math.floor(f); X0[x] = md(i, G) * ch; X1[x] = md(i + 1, G) * ch; FX[x] = f - i }
  for (let c = 0; c < ch; c++) for (let y = 0, i = 0, O = T[c] = new Float32Array(N * N); y < N; y++) {
    const f = (y + 0.5) / N * G, j = Math.floor(f), fy = f - j, r0 = md(j, G) * G * ch + c, r1 = md(j + 1, G) * G * ch + c
    for (let x = 0; x < N; x++, i++) { const A = a[r0 + X0[x]], t = A + (a[r0 + X1[x]] - A) * FX[x], B = a[r1 + X0[x]]; O[i] = t + (B + (a[r1 + X1[x]] - B) * FX[x] - t) * fy }
  }
  return T
}
// nimg: fbm(u, v, px, py, oct, s, g) at every pixel centre of the N x N draw, built a row at a time (~10x cheaper than per pixel)
function nimg(p, k, px, py, oct, s, g = 0.5) {
  let A = p[k]; if (A) return A
  const N = p.N, K = new Int32Array(N), W = new Float64Array(N); let amp = 1, norm = 0
  A = p[k] = new Float32Array(N * N)
  for (let o = 0; o < oct; o++, norm += amp, amp *= g) {
    const qx = px << o, qy = py << o, so = s + o * 131, L = Float64Array.from({ length: qx * qy }, (_, i) => hash(i % qx, i / qx | 0, so)), col = new Float64Array(qx + 1)
    for (let x = 0; x < N; x++) { const f = (x + 0.5) / N * qx, i = Math.floor(f), t = f - i; K[x] = md(i, qx); W[x] = t * t * (3 - 2 * t) }
    for (let y = 0; y < N; y++) {
      const f = (y + 0.5) / N * qy, i = Math.floor(f), t = f - i, sy = t * t * (3 - 2 * t), y0 = md(i, qy), y1 = y0 + 1 >= qy ? 0 : y0 + 1
      for (let c = 0; c < qx; c++) { const a = L[y0 * qx + c]; col[c] = a + (L[y1 * qx + c] - a) * sy }
      col[qx] = col[0]
      for (let x = 0, i = y * N; x < N; x++, i++) { const c = K[x], a = col[c]; A[i] += amp * (a + (col[c + 1] - a) * W[x]) }
    }
  }
  if (norm !== 1) for (let i = 0; i < N * N; i++) A[i] /= norm
  return A
}
const RING = Float32Array.from({ length: 256 }, (_, i) => 0.3 - 1.25 * smooth(0.5, 0.86, i / 256) * (1 - smooth(0.88, 0.99, i / 256))) // wood ring: lit early wood, dark late-wood line
// ---------- patterns: px(u, v, params, colours, out) with u, v in [0,1) over one tile, v down ----------
export const PAT = {
  bricks: { label: 'Bricks', names: ['Brick', 'Mortar'], colors: ['#a0522d', '#d6cfc4'], count: 2, scale: 4, px(u, v, p, C, o) {
    const rows = 2 * Math.max(1, p.count | 0), cols = rows >> 1
    const y = v * rows, iy = Math.floor(y), fy = y - iy, x = u * cols + (iy & 1) * 0.5, ix = Math.floor(x), fx = x - ix
    const mw = 0.09, mx = mw * cols / rows, n = vnoise(u, v, 64, 64, p.seed)
    if (fy < mw || fx < mx) return tone(o, C[1], 0.84 + 0.16 * n)
    const r = hash(((ix % cols) + cols) % cols, iy % rows, p.seed) - 0.5
    const lip = Math.min(smooth(0, 0.14, fy - mw), smooth(0, 0.07, fx - mx))
    return tone(o, C[0], (1 + r * 0.7 * p.detail) * (0.88 + 0.2 * n) * (0.8 + 0.2 * lip))
  } },
  planks: { label: 'Planks', names: ['Wood', 'Grain'], colors: ['#b98a5e', '#7a5233'], count: 4, scale: 4, px(u, v, p, C, o) {
    const n = Math.max(1, p.count | 0), y = v * n, iy = Math.floor(y), fy = y - iy, x = fract(u + hash(iy, 3, p.seed))
    const g = fbm(u, v, 2, n * 12, 4, p.seed + iy)
    const ring = 0.5 + 0.5 * Math.sin((v * n * 6 + g * 4) * Math.PI * 2)
    const seam = fy < 0.04 || x < 0.008 ? 0.5 : fy < 0.08 ? 0.85 : 1
    return mix(o, C[0], C[1], (ring * 0.55 + g * 0.6 - 0.2) * p.detail * 2, (0.9 + 0.2 * hash(iy, 9, p.seed)) * seam)
  } },
  noise: { label: 'Noise', names: ['Dark', 'Light'], colors: ['#55595f', '#d2d4d8'], count: 4, scale: 4, px(u, v, p, C, o) {
    const n = Math.max(1, p.count | 0)
    return mix(o, C[0], C[1], (fbm(u, v, n, n, 5, p.seed, 0.3 + 0.4 * p.detail) - 0.5) * 2.4 + 0.5)
  } },
  clouds: { label: 'Clouds', names: ['Sky', 'Cloud'], colors: ['#4f8fd8', '#ffffff'], count: 3, scale: 16, px(u, v, p, C, o) {
    const n = Math.max(1, p.count | 0)
    return mix(o, C[0], C[1], smooth(0.6 - 0.25 * p.detail, 0.74, fbm(u, v, n, n, 6, p.seed, 0.55)))
  } },
  checker: { label: 'Checker', names: ['Colour A', 'Colour B'], colors: ['#f0f0f0', '#2d2f33'], count: 1, scale: 4, px(u, v, p, C, o) {
    const n = 2 * Math.max(1, p.count | 0)
    return tone(o, C[(Math.floor(u * n) + Math.floor(v * n)) & 1], 1)
  } },
  // the classic Roblox baseplate: one square tile per stud (count 1, scale 1 = 1 stud), a crisp groove and a bevel lit from the
  // top-left, a raised round stud (bright top, wall lit top-left and shaded bottom-right) and a soft shadow ring at its foot.
  // Values stay <= 1: the part colour tints it, so no highlight clips.
  studs: { label: 'Studs', names: ['Stud'], colors: ['#ffffff'], thumb: ['#a3a2a5'], count: 1, thumbCount: 3, scale: 1, res: 128, tint: true, px(u, v, p, C, o) {
    const n = Math.max(1, p.count | 0), fx = fract(u * n) - 0.5, fy = fract(v * n) - 0.5, r = Math.hypot(fx, fy)
    const aa = 1.2 * n / (p.res || 128), l = -(fx + fy) / (r * 1.4142 + 1e-6)   // l: +1 toward top-left (light)
    const e = 0.5 - Math.max(Math.abs(fx), Math.abs(fy)), side = Math.abs(fx) > Math.abs(fy) ? (fx < 0 ? 1 : -1) : (fy < 0 ? 1 : -1)
    let tile = 0.84 * (1 + 0.06 * side * (1 - smooth(0.025, 0.08, e))) * (0.5 + 0.5 * smooth(0.012, 0.012 + aa, e))
    tile *= 1 - 0.2 * (1 - smooth(0.29, 0.43, r - 0.04 * Math.min(0, l))) * (0.6 + 0.4 * Math.max(0, -l))
    const top = 0.93 + 0.05 * l * r / 0.25, wall = 0.8 + 0.2 * l
    const stud = top + (wall - top) * smooth(0.24, 0.24 + aa, r)
    const k = tile + (stud - tile) * (1 - smooth(0.3, 0.3 + aa, r))
    return tone(o, C[0], k * (0.985 + 0.03 * vnoise(u, v, 32, 32, p.seed)))
  } },
  grid: { label: 'Grid', names: ['Base', 'Lines'], colors: ['#3a3f47', '#a7b0ba'], count: 4, scale: 4, px(u, v, p, C, o) {
    const n = Math.max(1, p.count | 0), w = 0.02 + 0.07 * p.detail, fx = fract(u * n), fy = fract(v * n)
    return mix(o, C[1], C[0], smooth(w * 0.5, w, Math.min(fx, 1 - fx, fy, 1 - fy)))
  } },
  tiles: { label: 'Tiles', names: ['Tile', 'Grout'], colors: ['#dcd6c8', '#8a8478'], count: 2, scale: 4, px(u, v, p, C, o) {
    const n = Math.max(1, p.count | 0), x = u * n, y = v * n, ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, g = 0.035, b = 0.06
    if (Math.min(fx, 1 - fx, fy, 1 - fy) < g) return tone(o, C[1], 0.9 + 0.1 * vnoise(u, v, 64, 64, p.seed))
    let k = 1 + (hash(ix % n, iy % n, p.seed) - 0.5) * 0.5 * p.detail
    if (fx - g < b || fy - g < b) k *= 1.1; else if (1 - g - fx < b || 1 - g - fy < b) k *= 0.84
    return tone(o, C[0], k * (0.95 + 0.08 * vnoise(u, v, 32, 32, p.seed + 3)))
  } },
  marble: { label: 'Marble', names: ['Stone', 'Veins'], colors: ['#ecebe7', '#6f6a66'], count: 2, scale: 8, px(u, v, p, C, o) {
    const n = Math.max(1, p.count | 0), t = fbm(u, v, 4, 4, 5, p.seed, 0.55)
    const s = Math.abs(Math.sin(Math.PI * (u * n + v * n + t * (2 + 6 * p.detail))))
    return mix(o, C[0], C[1], Math.pow(1 - s, 7) * 0.95 + (t - 0.5) * 0.3 + 0.06)
  } },
  gradient: { label: 'Gradient', names: ['Top', 'Bottom'], colors: ['#8fd0ff', '#1d3f8f'], count: 1, scale: 8, px(u, v, p, C, o) {
    const n = Math.max(1, p.count | 0), dither = (hash(u * 4096 | 0, v * 4096 | 0, 5) - 0.5) / 128
    return mix(o, C[0], C[1], smooth(0, 1, fract(v * n)) + dither)
  } },
  stripes: { label: 'Stripes', names: ['Stripe', 'Gap'], colors: ['#f2c230', '#2b2b2b'], count: 4, scale: 4, px(u, v, p, C, o) {
    return tone(o, C[fract(u * Math.max(1, p.count | 0)) < 0.2 + 0.6 * p.detail ? 0 : 1], 1)
  } },
  camo: { label: 'Camo', names: ['Camo 1', 'Camo 2', 'Camo 3', 'Camo 4'], colors: ['#4b5320', '#6b7a3a', '#8a7a55', '#2e2a1f'], count: 3, scale: 8, px(u, v, p, C, o) {
    const n = Math.max(1, p.count | 0), a = fbm(u, v, n, n, 4, p.seed, 0.5), b = fbm(u, v, n * 2, n * 2, 3, p.seed + 7, 0.5)
    return tone(o, C[a < 0.44 ? 0 : a < 0.54 ? 1 : b > 0.56 ? 3 : 2], 1)
  } },
  // detail surfaces: tone(p, N) -> N x N tones (-1 dark, 0 base, +1 light; colours [base, dark, light]) in whole-image passes; over() paints extra colours
  rock: { label: 'Rock', names: ['Rock', 'Cracks', 'Light'], colors: ['#8e877c', '#3b362f', '#d8d0c2'], count: 3, scale: 8, tone(p, N) {
    const n = p.n, s = p.seed, k = p.k, w = 0.3 / n, c = 0.84 - 0.05 * p.detail
    const [E, T] = field(N, 2, (u, v, a, i) => { // [crack distance / crack mask, tone with a lit top-left bevel]
      const V = vor(u + w * (vnoise(u, v, 4, 4, s + 1) - 0.5), v + w * (vnoise(u, v, 4, 4, s + 2) - 0.5), n, s), m = smooth(0.2, 0.45, vnoise(u, v, n * 2, n * 2, s + 4)), e = V[1]
      a[i] = Math.min(1, e / (m + 0.01)); a[i + 1] = ((fbm(u, v, n * 2, n * 2, 3, s + 3) - 0.5) * 0.9 + (V[0] - 0.5) * 0.5 - 0.6 * (V[2] + V[3]) * m * (1 - smooth(0, 0.2, e))) * k
    }), H = nimg(p, 'chip', n * 9, n * 9, 1, s + 5)
    for (let i = 0; i < N * N; i++) {
      const t = H[i] > c ? Math.max(T[i] + 0.35, 0.5) : T[i] // light chips, then dark cracks
      T[i] = E[i] < 0.06 ? t + (-1 - t) * (1 - smooth(0.025, 0.06, E[i])) : t
    }
    return T
  } },
  woodgrain: { label: 'Wood grain', names: ['Wood', 'Grain', 'Light'], colors: ['#b8793f', '#6b3f1d', '#dfa46c'], count: 3, scale: 8, tone(p, N) {
    const n = p.n, s = p.seed, L = 4 * n, M = 8 * L, sc = 0.5 + p.detail, fb = Float64Array.from({ length: M + 1 }, (_, i) => hash(i % M, 5, s))
    const [W, K] = field(N, 2, (u, v, a, i) => { // [grain offset in lines (warp + knot swirls), knot core]
      let b = (fbm(u, v, 2, 4, 3, s) - 0.5) * 3, c = 0
      for (let j = 0; j < 2; j++) { const du = wrap(u - hash(j, 1, s)) / 0.17, dv = wrap(v - hash(j, 2, s)) / 0.075, d = du * du + dv * dv; if (d < 1) { b += 2.4 * (1 - d) * (1 - d); c = Math.max(c, smooth(0.12, 0.03, d)) } }
      a[i] = b; a[i + 1] = c
    })
    for (let y = 0, i = 0; y < N; y++) for (let x = 0, r = (y + 0.5) / N * L; x < N; x++, i++) {
      const g = r + W[i], q = g * 8, qi = Math.floor(q), q0 = md(qi, M), t = RING[((g - Math.floor(g)) * 256) | 0] + (fb[q0] + (fb[q0 + 1] - fb[q0]) * (q - qi) - 0.5) * 0.4 // rings + fine fibres along the grain
      W[i] = (t + (-1 - t) * K[i]) * sc
    }
    return W
  } },
  brushed: { label: 'Brushed metal', names: ['Metal', 'Dark', 'Sheen'], colors: ['#9aa3ad', '#59606a', '#f1f5fa'], count: 4, scale: 8, tone(p, N, T) {
    const n = p.n, s = p.seed, k = p.k, A = nimg(p, 'ba', 3, 48 * n, 1, s), B = nimg(p, 'bb', 8, 160 * n, 1, s + 1), P = 2 * Math.PI / N
    const S = Float64Array.from({ length: 2 * N }, (_, x) => (x < N ? Math.sin : Math.cos)(P * (x % N + 0.5)))
    for (let y = 0, i = 0; y < N; y++) { // streaks along u, long bright scratches, broad diagonal sheen 0.6 sin(2pi (u + v) + 1.2 sin 2pi v)
      const b = P * (y + 0.5) + 1.2 * Math.sin(P * (y + 0.5)), cb = 0.6 * Math.cos(b), sb = 0.6 * Math.sin(b)
      for (let x = 0; x < N; x++, i++) { const a = A[i]; T[i] = ((a - 0.5) * 0.6 + (B[i] - 0.5) * 0.4 + (a > 0.84 ? 0.5 : 0)) * k + S[x] * cb + S[N + x] * sb }
    }
    return T
  } },
  fabric: { label: 'Fabric', names: ['Warp', 'Gaps', 'Weft'], colors: ['#3d6fc2', '#1c3567', '#9dbcf0'], count: 2, thumbCount: 1, scale: 4, tone(p, N, O) {
    const T = 16 * p.n, s = p.seed, k = p.k, th = Float64Array.from({ length: 2 * T }, (_, i) => hash(i % T, i >= T ? 1 : 0, s)), U = nimg(p, 'fu', T, 5 * T, 1, s + 2), V = nimg(p, 'fv', 5 * T, T, 1, s + 2)
    for (let Y = 0, I = 0; Y < N; Y++) for (let X = 0, y = (Y + 0.5) / N * T + 0.5, j = Math.floor(y), fy = y - j; X < N; X++, I++) {
      const x = (X + 0.5) / N * T + 0.5, i = Math.floor(x), fx = x - i, up = (i + j) & 1, w = up ? fy : fx, l = up ? fx : fy, a = 4 * w * (1 - w), q = (2 * l - 1) * (2 * l - 1) // across-thread bulge, dip where it dives under
      const t = (a * (1 - 0.35 * q * q) - 0.75) * 1.1 + ((th[up ? T + md(j, T) : md(i, T)] - 0.5) * 0.3 + ((up ? U : V)[I] - 0.5) * 0.45) * k + (up ? 0.45 : 0)
      O[I] = a < 0.3 ? t + (-1 - t) * (1 - a / 0.3) : t
    }
    return O
  } },
  asphalt: { label: 'Asphalt', names: ['Asphalt', 'Tar', 'Stones'], colors: ['#4a4d53', '#26282c', '#9a9ea6'], count: 4, scale: 8, tone(p, N, T) {
    const n = p.n, s = p.seed, k = p.k, F = nimg(p, 'af', 3, 3, 3, s + 3), G = nimg(p, 'ag', 16 * n, 16 * n, 2, s, 0.45)
    for (let i = 0; i < N * N; i++) { // aggregate specks, tar, lighter worn patches
      const f = F[i], g = G[i], c = clamp01((f - 0.6) * 12.5)
      T[i] = ((f - 0.5) * 0.6 + 0.4 * c * c * (3 - 2 * c) + (g - 0.5) * 0.4 + (g > 0.7 ? 0.7 * clamp01((g - 0.7) * 20) : g < 0.29 ? -0.35 : 0)) * k
    }
    return T
  } },
  road: { label: 'Road', names: ['Asphalt', 'Tar', 'Stones', 'Centre line', 'Edge line'], colors: ['#4a4d53', '#26282c', '#9a9ea6', '#f4c430', '#f2f2ee'], count: 4, scale: 16, tone: (p, N, T) => PAT.asphalt.tone(p, N, T), over(p, C, d, N) {
    for (let y = 0; y < N; y++) { // dashed centre line, solid edge lines, paint worn through in spots
      const v = (y + 0.5) / N, e = Math.abs(wrap(v)), c = Math.abs(v - 0.5) < 0.03
      if (c || (e < 0.07 && e > 0.04)) for (let x = 0, i = y * N; x < N; x++, i++) {
        const u = (x + 0.5) / N; if (c && u - Math.floor(u * 2) / 2 >= 0.3) continue
        const a = (1 - smooth(0.7, 0.76, vnoise(u, v, 64, 64, p.seed + 9) * 0.7 + (p.af[i] - 0.5) * 0.4 + 0.2 * p.detail)) * 0.92, P = C[c ? 3 : 4]
        for (let j = 0; j < 3; j++) d[i * 4 + j] += (P[j] - d[i * 4 + j]) * a
      }
    }
  } },
  grass: { label: 'Grass', names: ['Grass', 'Shade', 'Tips'], colors: ['#4fae3c', '#1f5e1c', '#a5dc5c'], count: 3, scale: 8, thumbCount: 1, tone(p, N, T) { // blades rasterised back to front over darker ground clumps
    const G = 12 * p.n, s = p.seed, k = p.k, S = N / G, aa = 1 / S, c = nimg(p, 'gc', 3, 3, 2, s + 3)
    for (let i = 0; i < N * N; i++) T[i] = -0.85 + (c[i] - 0.5) * 0.8
    for (let cy = 0, b = 0; cy < G; cy++) for (let cx = 0; cx < G; cx++, b += 5) {
      const r = j => hash(b + j, 7, s), bx = cx + 0.1 + 0.8 * r(0), by = cy + r(1), L = 1 / (0.53 + 0.37 * r(2)), tilt = r(3) - 0.5, sh = (r(4) - 1.4) * 0.5 * k
      for (let py = Math.floor((by - L) * S), y1 = Math.ceil(by * S); py <= y1; py++) {
        const h = (by - (py + 0.5) / S) / L; if (h < 0 || h > 1) continue
        const xc = bx + tilt * h * h, w = 0.33 - 0.3 * h, row = md(py, N) * N, tone = sh + 1.15 * k * h
        for (let px = Math.floor((xc - w - aa) * S), x1 = Math.ceil((xc + w + aa) * S); px <= x1; px++) {
          const al = clamp01((w - Math.abs((px + 0.5) / S - xc)) / aa + 0.5), i = row + md(px, N)
          if (al > 0) T[i] += (tone + (c[i] - 0.5) * 0.96 - T[i]) * al
        }
      }
    }
    return T
  } },
  sand: { label: 'Sand', names: ['Sand', 'Shadow', 'Light'], colors: ['#e8c47c', '#bf9150', '#fcebbd'], count: 3, scale: 8, tone(p, N, T) {
    const n = p.n, s = p.seed, k = p.k, W = nimg(p, 'sw', 2, 3, 3, s)
    for (let y = 0, i = 0; y < N; y++) for (let x = 0; x < N; x++, i++) { // wind ripples (long lit slope, short shaded lee) + fine grains
      const w = W[i] - 0.5, r = (y + 0.5) / N * 3 * n + w * 2.5, f = r - Math.floor(r), g = hash(x, y, s)
      T[i] = (f < 0.72 ? -0.4 + f * 1.04 : 0.35 - (f - 0.72) * 2.68) * k * 1.15 + w * 0.5 + (g - 0.5) * 0.22 * k + (g > 0.97 ? -0.35 : g < 0.03 ? 0.35 : 0)
    }
    return T
  } },
  water: { label: 'Water', names: ['Water', 'Deep', 'Caustics'], colors: ['#2e8fdc', '#1a56a3', '#d2f4ff'], count: 3, scale: 8, tone(p, N) {
    const n = p.n, s = p.seed, w = 0.35 / n, kd = p.k, kc = 0.45 + 0.5 * p.detail
    const [A, T] = field(N, 2, (u, v, a, i) => { // [caustic web (2 warped cell layers), depth tone]
      const wu = u + w * (vnoise(u, v, 3, 3, s + 1) - 0.5), wv = v + w * (vnoise(u, v, 3, 3, s + 2) - 0.5), e = vor(wu, wv, n, s)[1]
      a[i] = 1 - smooth(0, 0.17, e) + 0.6 * (1 - smooth(0, 0.12, vor(wv + 0.31, wu + 0.57, n * 2, s + 7)[1])); a[i + 1] = (fbm(u, v, 2, 2, 3, s + 3) - 0.5) * 1.4
    })
    for (let i = 0; i < N * N; i++) { const t = T[i] * kd - 0.2 + A[i] * kc; T[i] = A[i] > 1.05 ? Math.max(t, 0.95) : t } // bright highlights where ripples cross
    return T
  } },
  grip: { label: 'Grip', names: ['Rubber', 'Grooves', 'Lit'], colors: ['#363a41', '#101214', '#77808c'], count: 6, scale: 2, tone(p, N, T) {
    const n = p.n, k = p.k
    for (let y = 0, i = 0; y < N; y++) for (let x = 0, v = (y + 0.5) / N; x < N; x++, i++) { // diamond knurl lit from the top left; tile edges fall mid-facet
      const u = (x + 0.5) / N, a = (u + v) * n + 0.5, b = (u - v) * n, fa = a - Math.floor(a) - 0.5, fb = b - Math.floor(b) - 0.5, A = Math.abs(fa), B = Math.abs(fb), h = 0.5 - Math.max(A, B)
      const t = (h > 0.36 ? 0.12 : A > B ? (fa < 0 ? 0.6 : -0.55) : fb > 0 ? 0.25 : -0.3) * k + (hash(x, y, p.seed) - 0.5) * 0.12
      T[i] = h < 0.08 ? t + (-1 - t) * (1 - smooth(0.04, 0.08, h)) : t
    }
    return T
  } },
  carbon: { label: 'Carbon fibre', names: ['Fibre', 'Dark', 'Sheen'], colors: ['#30353c', '#0c0d0f', '#8d99a8'], count: 3, scale: 2, tone(p, N, O) {
    const T = 8 * p.n, k = p.k
    for (let Y = 0, I = 0; Y < N; Y++) for (let X = 0, y = (Y + 0.5) / N * T + 0.5, j = Math.floor(y); X < N; X++, I++) { // 2/2 twill: tows lit by direction
      const x = (X + 0.5) / N * T + 0.5, i = Math.floor(x), up = ((i - j) & 3) < 2, w = up ? x - i : y - j, a = 4 * w * (1 - w)
      const t = (up ? 0.55 : -0.3) * k + (a - 0.75) * 0.6 + (hash(Math.floor((up ? x : y) * 12), up, p.seed) - 0.5) * 0.3 * k
      O[I] = a < 0.15 ? t + (-0.9 - t) * (1 - a / 0.15) : t
    }
    return O
  } }
}
export const PATTERNS = Object.keys(PAT)
const patParams = (t, P) => ({ count: Math.max(1, +(t.count ?? P.count) || 1), detail: clamp01(+(t.detail ?? 0.5)), seed: (+t.seed || 1) | 0 })

export function drawPattern(t, N, canvas = makeCanvas(N)) {
  const P = PAT[t.pattern] || PAT.bricks, g = canvas.getContext('2d'), img = g.createImageData(N, N), d = img.data
  const C = P.colors.map((c, i) => hexRgb(t.colors?.[i] || c)), p = patParams(t, P), o = [0, 0, 0]
  p.N = N; p.n = Math.max(1, p.count | 0); p.k = 0.4 + 1.2 * p.detail // draw size, integer feature count, contrast
  if (P.tone) { // tone image -> colours through a 1024-step ramp table
    const T = P.tone(p, N, new Float32Array(N * N)), R = new Uint8ClampedArray(3072)
    for (let k = 0; k < 1024; k++) R.set(ramp(o, C, k / 511.5 - 1), k * 3)
    for (let i = 0, j = 0; i < N * N; i++, j += 4) { const t = T[i], k = t <= -1 ? 0 : t >= 1 ? 3069 : ((t + 1) * 511.5 | 0) * 3; d[j] = R[k]; d[j + 1] = R[k + 1]; d[j + 2] = R[k + 2]; d[j + 3] = 255 }
    P.over?.(p, C, d, N)
  } else for (let y = 0, i = 0; y < N; y++) { const v = (y + 0.5) / N; for (let x = 0; x < N; x++, i += 4) { P.px((x + 0.5) / N, v, p, C, o); d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; d[i + 3] = 255 } }
  g.putImageData(img, 0, 0)
  return canvas
}

// ---------- texture hook: scene.textures def -> cached CanvasTexture ----------
export const procs = new Map() // def id -> {key, canvas, tex}
export const imgs = new Map() // def id -> {canvas, tex, src, drawn}
export const mem = new Map() // tex-store id -> canvas (recent images and paint snapshots, small LRU)
export function remember(id, canvas) { mem.delete(id); mem.set(id, canvas); while (mem.size > 6) mem.delete(mem.keys().next().value) }
function newTex(canvas) { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.userData.shared = true; return t }
function xform(tex, t) {
  const s = Math.max(1e-3, +t.scale || 4), o = t.offset || [0, 0]
  tex.repeat.set(1 / s, (+t.aspect || 1) / s); tex.offset.set(+o[0] || 0, +o[1] || 0); tex.rotation = (+t.rot || 0) * Math.PI / 180; tex.channel = t.uv1 ? 1 : 0 // painted parts: the uv1 layout
}
function procTexture(id, t) {
  const P = PAT[t.pattern], N = clampRes(t.res || P.res || 256), key = JSON.stringify([t.pattern, t.colors, t.count, t.detail, t.seed, N])
  let e = procs.get(id)
  if (!e || e.canvas.width !== N) { e?.tex.dispose(); const canvas = makeCanvas(N); e = { key: null, canvas, tex: newTex(canvas) }; procs.set(id, e) }
  if (e.key !== key) { drawPattern(t, N, e.canvas); e.key = key; e.tex.needsUpdate = true }
  xform(e.tex, t)
  return e.tex
}
export const snaps = new Map() // 'src#rev' -> webp Blob: paint history kept in memory for undo
export function snapshot(key, blob) { snaps.delete(key); snaps.set(key, blob); while (snaps.size > 60) snaps.delete(snaps.keys().next().value) }
export function imageEntry(app, id, t) {
  const N = clampRes(t.res || 1024)
  let e = imgs.get(id)
  if (!e || e.canvas.width !== N) {
    const old = e, canvas = makeCanvas(N)
    e = { canvas, tex: newTex(canvas), src: undefined, drawn: false, ok: false, wait: null }
    if (old) { canvas.getContext('2d').drawImage(old.canvas, 0, 0, N, N); e.drawn = true; old.tex.dispose() }
    imgs.set(id, e)
  }
  const src = t.src === undefined ? (t.data ? '#data' : id) : t.src, key = t.rev ? src + '#' + t.rev : src
  if (e.src !== key) { e.src = key; fillFrom(app, e, t, src, key) }
  xform(e.tex, t)
  return e
}
// Fill an entry's canvas: from memory (recent images, paint history), else the tex store. Keeps old pixels while loading.
function fillFrom(app, e, t, src, key) {
  const g = e.canvas.getContext('2d'), N = e.canvas.width
  const done = () => { e.drawn = true; e.tex.needsUpdate = true; app.viewport?.requestRender?.() }
  const draw = im => { g.clearRect(0, 0, N, N); g.drawImage(im, 0, 0, N, N); e.ok = true; done() }
  e.ok = false; e.wait = null
  if (mem.has(key)) return draw(mem.get(key))
  if (!e.drawn || !src) { g.fillStyle = t.base || '#ffffff'; g.fillRect(0, 0, N, N); done() }
  if (!src) return
  const load = async () => {
    let im
    if (snaps.has(key)) im = await createImageBitmap(snaps.get(key))
    else {
      const data = src === '#data' ? t.data : (app.tex.peek(src) || await app.tex.get(src).catch(() => null))?.data
      if (!data) return
      im = new Image(); im.src = data; await im.decode()
    }
    if (e.src === key) draw(im)
  }
  e.wait = load().catch(() => app.toast('Could not read texture image', 'error'))
}
export function installHook(app) {
  if (app._texHook) return
  app._texHook = true
  const prev = app.textureFor
  app.textureFor = (id, t) => {
    if (t?.kind === 'procedural' && PAT[t.pattern]) return procTexture(id, t)
    if (t && (t.kind === 'image' || t.kind === 'paint' || t.data)) return imageEntry(app, id, t).tex
    return prev ? prev(id, t) : undefined
  }
  app.on('tex', ev => { for (const [id, e] of imgs) if (!e.ok && e.src?.split('#')[0] === ev?.id && app.scene.textures[id]) { e.src = undefined; imageEntry(app, id, app.scene.textures[id]); app.viewport?.requestRender?.() } })
  app.on('project', () => { procs.clear(); imgs.clear() })
}
// The canvas behind a texture def (built on demand).
export function canvasOf(app, tid) {
  const t = app.scene.textures[tid]
  if (!t) return null
  if (t.kind === 'procedural' && PAT[t.pattern]) { procTexture(tid, t); return procs.get(tid).canvas }
  return imageEntry(app, tid, t).canvas
}
// Encode a canvas to a Blob in a worker (keeps the page smooth); falls back to canvas.toBlob.
let worker = null, wseq = 0
const waiting = new Map()
function encWorker() {
  if (worker !== null) return worker
  try {
    const src = 'onmessage=async e=>{const{n,bm,type,q}=e.data;try{const o=new OffscreenCanvas(bm.width,bm.height);o.getContext("2d").drawImage(bm,0,0);bm.close();postMessage({n,blob:await o.convertToBlob({type,quality:q})})}catch(err){postMessage({n,err:String(err)})}}'
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
    worker = new Worker(url); URL.revokeObjectURL(url)
    worker.onmessage = e => { const w = waiting.get(e.data.n); waiting.delete(e.data.n); if (!w) return; if (e.data.blob) w.res(e.data.blob); else w.fallback() }
    worker.onerror = () => { for (const w of waiting.values()) w.fallback(); waiting.clear(); worker.terminate(); worker = false }
  } catch { worker = false }
  return worker
}
const toBlob = (canvas, type, q) => new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Could not encode image')), type, q))
export async function encode(canvas, type = 'image/webp', q = 0.9) {
  const w = typeof OffscreenCanvas === 'function' && encWorker()
  if (!w) return toBlob(canvas, type, q)
  const bm = await createImageBitmap(canvas), n = ++wseq
  return new Promise((res, rej) => { waiting.set(n, { res, fallback: () => toBlob(canvas, type, q).then(res, rej) }); w.postMessage({ n, bm, type, q }, [bm]) })
}
export const dataURL = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob) })

// ---------- UV projection (writes a new geo with per-vertex uvs; studs, or 0..1 for the paint atlas) ----------
export const PROJECTIONS = [['box', 'Box'], ['planar', 'Planar'], ['cylindrical', 'Cylindrical'], ['spherical', 'Spherical'], ['atlas', 'Unwrap (paint atlas)']]
export function projectUV(geo, mode = 'box', axis = 'y') {
  const V = geo.verts, F = geo.faces, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < V.length; i += 3) for (let k = 0; k < 3; k++) { if (V[i + k] < lo[k]) lo[k] = V[i + k]; if (V[i + k] > hi[k]) hi[k] = V[i + k] }
  const mid = [0, 1, 2].map(k => (lo[k] + hi[k]) / 2), size = [0, 1, 2].map(k => Math.max(1e-6, hi[k] - lo[k])), big = Math.max(...size)
  const A = Math.max(0, 'xyz'.indexOf(axis)), B = (A + 1) % 3, Cx = (A + 2) % 3
  const R = Math.max(size[B], size[Cx]) / 2, circ = mode === 'spherical' ? Math.PI * big : 2 * Math.PI * R
  const verts = [], uvs = [], faces = [], keys = new Map()
  const vert = (vi, u, v) => {
    const k = vi + ',' + u.toFixed(5) + ',' + v.toFixed(5)
    let j = keys.get(k)
    if (j === undefined) { j = verts.length / 3; keys.set(k, j); verts.push(V[vi * 3], V[vi * 3 + 1], V[vi * 3 + 2]); uvs.push(+u.toFixed(5), +v.toFixed(5)) }
    return j
  }
  const pad = 0.012, cell = 1 / 3, ks = (cell - 2 * pad) / big
  for (const f of F) {
    let nx = 0, ny = 0, nz = 0
    for (let i = 0; i < f.length; i++) { const a = f[i] * 3, b = f[(i + 1) % f.length] * 3; nx += (V[a + 1] - V[b + 1]) * (V[a + 2] + V[b + 2]); ny += (V[a + 2] - V[b + 2]) * (V[a] + V[b]); nz += (V[a] - V[b]) * (V[a + 1] + V[b + 1]) }
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz), dom = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2
    const sg = [Math.sign(nx) || 1, Math.sign(ny) || 1, Math.sign(nz) || 1][dom]
    const uv = f.map(vi => {
      const p = [V[vi * 3], V[vi * 3 + 1], V[vi * 3 + 2]], [x, y, z] = p
      if (mode === 'planar') return A === 1 ? [x, -z] : A === 0 ? [z, y] : [x, y]
      if (mode === 'cylindrical') return [Math.atan2(p[Cx] - mid[Cx], p[B] - mid[B]) / (2 * Math.PI) * circ, p[A]]
      if (mode === 'spherical') { const d = p.map((c, k) => c - mid[k]), r = Math.hypot(...d) || 1; return [Math.atan2(d[Cx], d[B]) / (2 * Math.PI) * circ, Math.asin(Math.max(-1, Math.min(1, d[A] / r))) * big / 2] }
      if (mode === 'atlas') {
        const c = dom * 2 + (sg > 0 ? 0 : 1)
        const [a, b] = dom === 0 ? [sg > 0 ? hi[2] - z : z - lo[2], y - lo[1]] : dom === 1 ? [x - lo[0], sg > 0 ? hi[2] - z : z - lo[2]] : [sg > 0 ? x - lo[0] : hi[0] - x, y - lo[1]]
        return [(c % 3) * cell + pad + a * ks, Math.floor(c / 3) * cell + pad + b * ks]
      }
      return dom === 0 ? [z * sg, y] : dom === 1 ? [x, -z * sg] : [-x * sg, y]
    })
    if ((mode === 'cylindrical' || mode === 'spherical') && uv.length) { // seam: keep one face on one side of the wrap
      const us = uv.map(q => q[0])
      if (Math.max(...us) - Math.min(...us) > circ / 2) for (const q of uv) if (q[0] < 0) q[0] += circ
    }
    faces.push(f.map((vi, i) => vert(vi, uv[i][0], uv[i][1])))
  }
  return { ...geo, verts, faces, uvs }
}
// UV extent of a THREE geometry: {u0, v0, w, h}
export function uvBounds(geometry, ch = 0) {
  const uv = geometry?.attributes?.[ch ? 'uv1' : 'uv']
  if (!uv || !uv.count) return null
  let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity
  for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v }
  return { u0, v0, w: Math.max(1e-6, u1 - u0), h: Math.max(1e-6, v1 - v0) }
}

// ---------- commands ----------
const OK = o => o && (o.type === 'part' || o.type === 'mesh')
export const targets = (app, a = {}) => [].concat(a.ids || app.selection).filter(id => OK(app.obj(id)))
const need = (app, a) => { const ids = targets(app, a); if (!ids.length) throw new Error('Select a part or mesh first'); return ids }
const has = (app, a) => targets(app, a).length > 0
const hasTex = (app, a = {}) => !!(a.texture || targets(app, a).some(id => app.obj(id).texture))
const exclusive = (app, tid, ids) => app.ids().every(id => app.obj(id).texture !== tid || ids.includes(id))
const edit = (app, tid, patch) => { const t = tid && app.scene.textures[tid]; if (!t) return; app.putTexture(tid, { ...t, ...(typeof patch === 'function' ? patch(t) : patch) }) }
const sizeOf = o => Math.max(1, ...(o.size || [4]).map(Number))

function pickFile(accept) {
  return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.addEventListener('change', () => res(i.files?.[0] || null)); i.addEventListener('cancel', () => res(null)); i.click() })
}
async function decode(src) {
  if (src instanceof ArrayBuffer || ArrayBuffer.isView(src)) src = new Blob([src])
  if (src instanceof Blob) return createImageBitmap(src)
  const im = new Image(); im.src = String(src); await im.decode(); return im
}

const commands = {
  'texture.procedural': { label: 'Procedural texture', icon: 'texture', enabled: has, run(app, a = {}) {
    const ids = need(app, a), pattern = PAT[a.pattern] ? a.pattern : 'bricks', P = PAT[pattern]
    const o = app.obj(ids[0]), cur = o.texture ? app.scene.textures[o.texture] : null
    const tid = a.id || (cur && cur.kind === 'procedural' && exclusive(app, o.texture, ids) ? o.texture : uid('tx-'))
    const def = { kind: 'procedural', pattern, name: P.label, colors: (a.colors || P.colors).slice(0, P.colors.length), count: a.count ?? P.count, detail: a.detail ?? 0.5, seed: a.seed ?? 1, scale: a.scale ?? P.scale, offset: a.offset || cur?.offset || [0, 0], rot: a.rot ?? cur?.rot ?? 0 }
    if (a.res || P.res) def.res = a.res || P.res
    app.putTexture(tid, def)
    for (const id of ids) app.set(id, P.tint ? { texture: tid } : { texture: tid, color: '#ffffff' })
    return tid
  } },
  'texture.loadImage': { label: 'Load image texture…', icon: 'image', enabled: has, async run(app, a = {}) {
    const ids = targets(app, a)
    let file = a.file || a.data || a.url
    if (!file) { file = await pickFile('image/*'); if (!file) return null }
    const im = await decode(file), w = im.width || 1, hh = im.height || 1, N = a.res ? clampRes(a.res) : pow2(Math.max(w, hh))
    const cv = makeCanvas(N); cv.getContext('2d').drawImage(im, 0, 0, N, N); im.close?.()
    const data = await dataURL(await encode(cv))
    const src = app.tex.put({ kind: 'image', data })
    remember(src, cv)
    const tid = uid('tx-'), name = String(a.name || file.name || 'Image').replace(/\.[a-z0-9]+$/i, '').slice(0, 40)
    return app.transact('Load image texture', () => {
      app.putTexture(tid, { kind: 'image', name, src, res: N, aspect: +(w / hh).toFixed(4), scale: a.scale ?? (ids.length ? sizeOf(app.obj(ids[0])) : 4), offset: [0, 0], rot: 0 })
      for (const id of ids) app.set(id, { texture: tid, color: '#ffffff' })
      return tid
    })
  } },
  'texture.use': { label: 'Use texture', hidden: true, enabled: has, run(app, a = {}) {
    const ids = need(app, a), t = a.texture ? app.scene.textures[a.texture] : null
    if (a.texture && !t) throw new Error('Unknown texture: ' + a.texture)
    for (const id of ids) app.set(id, { texture: a.texture || null })
    return ids.length
  } },
  'texture.edit': { label: 'Edit texture', hidden: true, enabled: hasTex, run(app, a = {}) {
    const tid = a.texture || app.obj(targets(app, a)[0])?.texture
    if (!tid || !app.scene.textures[tid]) throw new Error('No texture to edit')
    edit(app, tid, a.patch || {}); return tid
  } },
  'texture.remove': { label: 'Remove texture', icon: 'trash', enabled: hasTex, run(app, a = {}) {
    const ids = need(app, a), gone = new Set()
    for (const id of ids) {
      const o = app.obj(id), t = o.texture && app.scene.textures[o.texture]
      if (!t) continue
      gone.add(o.texture)
      const patch = { texture: null }
      if (o.color === '#ffffff' && t.kind === 'procedural' && !PAT[t.pattern]?.tint && t.colors?.[0]) patch.color = t.colors[0]
      app.set(id, patch)
    }
    for (const tid of gone) if (!app.ids().some(id => app.obj(id).texture === tid)) app.putTexture(tid, null)
    return gone.size
  } },
  'texture.surface': { label: 'Set surface', hidden: true, enabled: has, run(app, a = {}) {
    const ids = need(app, a), patch = {}
    for (const k of ['color', 'roughness', 'metalness', 'emissive', 'emissiveIntensity', 'transparency']) if (k in a) patch[k] = a[k]
    if ('opacity' in a) patch.transparency = +(1 - a.opacity).toFixed(3)
    for (const id of ids) app.set(id, patch)
    return ids.length
  } },
  'texture.resetSurface': { label: 'Reset surface', icon: 'undo', enabled: has, run(app, a = {}) {
    const ids = need(app, a)
    for (const id of ids) app.set(id, { roughness: null, metalness: null, emissive: null, emissiveIntensity: null })
    return ids.length
  } },
  'texture.project': { label: 'UV projection', icon: 'uv', enabled: has, async run(app, a = {}) {
    const ids = need(app, a), mode = PROJECTIONS.some(p => p[0] === a.mode) ? a.mode : 'box', axis = 'xyz'.includes(a.axis || '-') ? a.axis : 'y'
    return app.transact('UV projection', async () => {
      const parts = ids.filter(id => app.obj(id).type === 'part')
      if (parts.length) await app.run('parts.toMesh', { ids: parts })
      let n = 0
      for (const id of ids) {
        const o = app.obj(id)
        if (o?.type !== 'mesh' || !o.geo) continue
        const geo = app.geo.peek(o.geo) || await app.geo.get(o.geo)
        if (!geo?.verts) continue
        app.set(id, { geo: app.geo.put(projectUV(geo, mode, axis)) }); n++
      }
      if (!n) throw new Error('Nothing to project')
      return n
    })
  } },
  'texture.exportPng': { label: 'Export texture as PNG', icon: 'download', noUndo: true, enabled: hasTex, async run(app, a = {}) {
    const tid = a.texture || targets(app, a).map(id => app.obj(id).texture).find(Boolean), t = tid && app.scene.textures[tid]
    if (!t) throw new Error('No texture to export')
    const blob = await encode(canvasOf(app, tid), 'image/png')
    if (a.to === 'data') return dataURL(blob)
    return app.store.download((t.name || t.pattern || 'texture').replace(/[^\w-]+/g, '-') + '.png', blob)
  } }
}

// ---------- panel ----------
const thumbs = new Map()
function thumb(key) {
  if (thumbs.has(key)) return thumbs.get(key)
  let c
  if (PAT[key]) { const P = PAT[key]; c = drawPattern({ pattern: key, colors: P.thumb, count: P.thumbCount ?? P.count }, 64) } else {
    c = makeCanvas(64); const g = c.getContext('2d'); g.fillStyle = '#1a1c21'; g.fillRect(0, 0, 64, 64); g.lineWidth = 4; g.lineCap = g.lineJoin = 'round'; g.strokeStyle = '#8b93a1'
    if (key === 'none') { g.beginPath(); g.moveTo(16, 48); g.lineTo(48, 16); g.stroke() } else { g.strokeRect(12, 14, 40, 36); g.beginPath(); g.moveTo(14, 46); g.lineTo(28, 30); g.lineTo(38, 40); g.lineTo(44, 34); g.lineTo(52, 44); g.stroke(); g.beginPath(); g.arc(42, 24, 4, 0, 7); g.stroke() }
  }
  const url = c.toDataURL('image/png'); thumbs.set(key, url); return url
}
const sig = app => { const ids = targets(app), o = app.obj(ids[0]), t = o?.texture && app.scene.textures[o.texture]; return [ids.join(','), ids.map(id => app.obj(id).type).join(), o?.texture, t?.kind, t?.pattern, Object.keys(app.scene.textures).length].join('|') }

function build(el, app) {
  el.innerHTML = ''; el._sig = sig(app)
  const C = app.ui.controls, ups = []
  const ids = () => targets(app), first = () => app.obj(ids()[0])
  const tid = () => first()?.texture || null, def = () => (tid() && app.scene.textures[tid()]) || null
  const rd = f => () => { const vs = ids().map(id => f(app.obj(id))); return { v: vs[0], mixed: vs.some(v => v !== vs[0]) } }
  const wr = f => v => { for (const id of ids()) app.set(id, f(v, app.obj(id))) }
  const dv = (k, d) => () => ({ v: def()?.[k] ?? d })
  const de = (f) => v => edit(app, tid(), f(v))
  const put = (g, c) => { g.appendChild(c.el); ups.push(c.update); return c }
  const btns = (g, list) => { const r = h('div', 'btn-row'); for (const [label, ic, fn] of list) { const b = h('button', 'btn', icon(ic) + '<span>' + label + '</span>'); b.type = 'button'; b.addEventListener('click', fn); r.appendChild(b) } g.appendChild(r); return r }
  const pre = o => MATERIALS[o.material] || MATERIALS.Plastic
  const num = x => +(+x).toFixed(2)

  const g1 = C.group(el, 'Surface')
  put(g1, C.color('Colour', { read: rd(o => o.color), write: wr(v => ({ color: v })) }))
  put(g1, C.slider('Roughness', { min: 0, max: 1, step: 0.01, read: rd(o => num(o.roughness ?? pre(o).roughness ?? 0.6)), write: wr(v => ({ roughness: v })) }))
  put(g1, C.slider('Metalness', { min: 0, max: 1, step: 0.01, read: rd(o => num(o.metalness ?? pre(o).metalness ?? 0)), write: wr(v => ({ metalness: v })) }))
  put(g1, C.color('Glow colour', { read: rd(o => o.emissive || '#000000'), write: wr((v, o) => ({ emissive: v, emissiveIntensity: o.emissiveIntensity ?? 1 })) }))
  put(g1, C.slider('Glow', { min: 0, max: 10, step: 0.1, read: rd(o => o.emissive ? num(o.emissiveIntensity ?? 1) : 0), write: wr((v, o) => ({ emissiveIntensity: v, emissive: o.emissive || '#ffffff' })) }))
  put(g1, C.slider('Opacity', { min: 0, max: 1, step: 0.01, read: rd(o => num(1 - (o.transparency || 0))), write: wr(v => ({ transparency: num(1 - v) })) }))
  btns(g1, [['Reset surface', 'undo', () => app.exec('texture.resetSurface')]])

  const g2 = C.group(el, 'Texture'), grid = h('div', 'mats')
  for (const k of ['none', ...PATTERNS, 'image']) {
    const label = k === 'none' ? 'None' : k === 'image' ? 'Image…' : PAT[k].label
    const b = h('button', 'mat', `<img alt="" width="32" height="32" src="${thumb(k)}"><span>${label}</span>`); b.type = 'button'; b.dataset.pat = k; b.title = label; grid.appendChild(b)
  }
  grid.addEventListener('click', e => {
    const k = e.target.closest('.mat')?.dataset.pat
    if (k === 'none') app.exec('texture.remove'); else if (k === 'image') app.exec('texture.loadImage'); else if (k) app.exec('texture.procedural', { pattern: k })
  })
  g2.appendChild(grid)
  const t = def()
  if (t?.kind === 'procedural' && PAT[t.pattern]) {
    const P = PAT[t.pattern]
    P.colors.forEach((c, i) => put(g2, C.color(P.names[i], { read: () => ({ v: def()?.colors?.[i] || c }), write: de(v => d => { const cs = P.colors.map((x, j) => d.colors?.[j] || x); cs[i] = v; return { colors: cs } }) })))
    put(g2, C.slider('Count', { min: 1, max: 16, step: 1, read: dv('count', P.count), write: de(v => ({ count: Math.round(v) })) }))
    put(g2, C.slider('Detail', { min: 0, max: 1, step: 0.05, read: dv('detail', 0.5), write: de(v => ({ detail: v })) }))
    put(g2, C.number('Seed', { step: 1, min: 1, digits: 0, read: dv('seed', 1), write: de(v => ({ seed: Math.max(1, Math.round(v)) })) }))
    put(g2, C.select('Resolution', { options: [128, 256, 512, 1024].map(v => ({ value: String(v), label: v + ' px' })), read: () => ({ v: String(def()?.res || P.res || 256) }), write: de(v => ({ res: +v })) }))
  }
  if (t) {
    put(g2, C.slider('Tile size', { min: 0.25, max: 64, step: 0.25, read: dv('scale', 4), write: de(v => ({ scale: v })) }))
    put(g2, C.slider('Offset U', { min: -1, max: 1, step: 0.01, read: () => ({ v: def()?.offset?.[0] || 0 }), write: de(v => d => ({ offset: [v, d.offset?.[1] || 0] })) }))
    put(g2, C.slider('Offset V', { min: -1, max: 1, step: 0.01, read: () => ({ v: def()?.offset?.[1] || 0 }), write: de(v => d => ({ offset: [d.offset?.[0] || 0, v] })) }))
    put(g2, C.slider('Rotation', { min: -180, max: 180, step: 1, read: dv('rot', 0), write: de(v => ({ rot: v })) }))
  }
  const shared = Object.entries(app.scene.textures)
  if (shared.length) put(g2, C.select('Shared', { options: [{ value: '', label: 'None' }, ...shared.map(([id, d]) => ({ value: id, label: (d.name || d.pattern || 'Texture') + ' ' + id.slice(-4) }))], read: rd(o => o.texture || ''), write: wr(v => ({ texture: v || null })) }))
  btns(g2, [['Load image', 'upload', () => app.exec('texture.loadImage')], ...(t ? [['Export PNG', 'download', () => app.exec('texture.exportPng')], ['Remove', 'trash', () => app.exec('texture.remove')]] : [])])

  if (ids().some(id => app.obj(id).type === 'mesh')) {
    const g3 = C.group(el, 'UV projection'), st = { mode: 'box', axis: 'y' }
    put(g3, C.select('Projection', { options: PROJECTIONS.map(([value, label]) => ({ value, label })), read: () => ({ v: st.mode }), write: v => { st.mode = v } }))
    put(g3, C.select('Axis', { options: ['x', 'y', 'z'].map(v => ({ value: v, label: v.toUpperCase() })), read: () => ({ v: st.axis }), write: v => { st.axis = v } }))
    btns(g3, [['Apply projection', 'uv', () => app.exec('texture.project', { ...st })]])
  }
  el._upd = () => {
    for (const u of ups) u()
    const k = def()?.kind === 'procedural' ? def().pattern : def() ? 'image' : 'none'
    for (const b of grid.children) b.classList.toggle('on', b.dataset.pat === k)
  }
  el._upd()
}

const panel = {
  id: 'texture', label: 'Texture', icon: 'texture', where: 'right', order: 22,
  when: app => targets(app).length > 0,
  render(el, app) { build(el, app) },
  refresh(el, app) { if (el._sig !== sig(app)) build(el, app); else el._upd?.() }
}

export default {
  id: 'texture', name: 'Texture',
  commands,
  menus: { Model: ['-', 'texture.procedural', 'texture.loadImage', 'texture.project', 'texture.exportPng', 'texture.remove'], Context: ['texture.loadImage'] },
  modes: [], tools: [], panels: [panel], importers: [], exporters: [], types: {},
  init(app) { installHook(app) }
}
