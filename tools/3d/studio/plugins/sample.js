// The animator's sampler, pure (THREE only, no DOM) so exporters and cli/studio.mjs share it with the viewport (2026-11-24).
import * as THREE from 'three'
export const EASES = ['linear', 'ease', 'smooth', 'in', 'out', 'step', 'bounce', 'elastic']
const D2R = Math.PI / 180
function outBounce(x) {
  const n = 7.5625, d = 2.75
  if (x < 1 / d) return n * x * x
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375
  return n * (x -= 2.625 / d) * x + 0.984375
}
export const EASE = {
  linear: x => x,
  ease: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  smooth: x => (1 - Math.cos(Math.PI * x)) / 2,   // sine in-out: keys on a wave's peaks replay the wave exactly
  in: x => x * x * x,
  out: x => 1 - Math.pow(1 - x, 3),
  step: () => 0,
  bounce: outBounce,
  elastic: x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1
}

export const hexRGB = h => { const n = parseInt(String(h || '#000000').slice(1, 7), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255] }
export const rgbHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
export function mix(a, b, e, ch) {
  if (ch === 'visible') return e >= 1 ? b : a
  if (ch === 'color') { const p = hexRGB(a), q = hexRGB(b); return rgbHex(p.map((v, i) => v + (q[i] - v) * e)) }
  return a.map((v, i) => v + ((b[i] ?? v) - v) * e)
}
// Custom eases: 'cubic:x1,y1,x2,y2' (CSS-style bezier); 'auto' (Catmull-Rom through the neighbouring keys: motion keeps its
// speed through a key instead of stopping at every one, the main cause of robotic clips, 2026-11-24).
function bezier(x1, y1, x2, y2) {
  const B = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  return x => { let t = x; for (let i = 0; i < 8; i++) { const d = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t; if (Math.abs(d) < 1e-6) break; t = Math.min(1, Math.max(0, t - (B(x1, x2, t) - x) / d)) } return B(y1, y2, t) }
}
const CUB = new Map()
export function easeFn(e) {
  if (EASE[e]) return EASE[e]
  if (typeof e === 'string' && e.startsWith('cubic:')) {
    if (!CUB.has(e)) { const p = e.slice(6).split(',').map(Number); CUB.set(e, p.length === 4 && p.every(Number.isFinite) ? bezier(...p) : EASE.linear) }
    return CUB.get(e)
  }
  return EASE.linear
}
export const isEase = e => EASES.includes(e) || e === 'auto' || (typeof e === 'string' && /^cubic:-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$/.test(e))
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _eu = new THREE.Euler()
function hermite(keys, lo, u) {               // 'auto': cubic Hermite, tangents from the neighbours (one-sided at the ends)
  const n = keys.length, k = i => keys[Math.max(0, Math.min(n - 1, i))], a = keys[lo], b = keys[lo + 1], h = b[0] - a[0]
  const tan = i => { const p = k(i - 1), q = k(i + 1), dt = q[0] - p[0]; return dt > 0 ? q[1].map((v, j) => (v - p[1][j]) / dt) : q[1].map(() => 0) }
  const m0 = tan(lo), m1 = tan(lo + 1), u2 = u * u, u3 = u2 * u
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2
  return a[1].map((v, j) => h00 * v + h10 * h * m0[j] + h01 * (b[1][j] ?? v) + h11 * h * m1[j])
}
// Sample one channel's keys [[t, value, ease?], ...] at time t (ease belongs to the segment's first key).
// rot: quaternion slerp along the shortest arc (Euler lerp cut limbs and blades through bodies); a segment turning >= 180 deg
// on any axis is an intentional spin and keeps the Euler lerp. Exports bake through this, so GLB/Roblox match the viewport.
export function sample(keys, t, ch) {
  const n = keys?.length
  if (!n) return undefined
  if (n === 1 || t <= keys[0][0]) return keys[0][1]
  if (t >= keys[n - 1][0]) return keys[n - 1][1]
  let lo = 0, hi = n - 1
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (keys[m][0] <= t) lo = m; else hi = m }
  const a = keys[lo], b = keys[hi], span = b[0] - a[0]
  const u = span > 0 ? (t - a[0]) / span : 1
  if (a[2] === 'auto' && Array.isArray(a[1]) && ch !== 'color' && ch !== 'visible') return hermite(keys, lo, u)
  const e = easeFn(a[2])(u)
  if (ch === 'rot' && Array.isArray(a[1]) && e > 0 && e < 1 && a[1].every((v, i) => Math.abs((b[1][i] ?? v) - v) < 180)) {
    _qa.setFromEuler(_eu.set(a[1][0] * D2R, a[1][1] * D2R, a[1][2] * D2R)); _qb.setFromEuler(_eu.set(b[1][0] * D2R, b[1][1] * D2R, b[1][2] * D2R))
    _eu.setFromQuaternion(_qa.slerp(_qb, e)); const r = [_eu.x / D2R, _eu.y / D2R, _eu.z / D2R]
    return r.map((v, i) => { const ref = a[1][i] + (b[1][i] - a[1][i]) * e; return v + 360 * Math.round((ref - v) / 360) })   // stay near the keyed range
  }
  return mix(a[1], b[1], e, ch)
}
// Time remap: clip.warp = [[clipT, storyT, ease]] (monotonic): tracks, camera and flipbooks run on story time, so slow-mo and
// speed ramps are keyed, not faked by stretching keys.
export function storyAt(c, t) { const w = c?.warp; return w?.length ? sample(w.map(k => [k[0], [k[1]], k[2]]), t, 'pos')[0] : t }
