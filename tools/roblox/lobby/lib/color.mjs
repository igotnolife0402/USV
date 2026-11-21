// Lightness jitter for repeated parts (Standard: repeated props vary by at least ±6% lightness).
const clamp = v => Math.max(0, Math.min(255, Math.round(v)))
export function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16), f = 1 + pct / 100
  const [r, g, b] = [n >> 16 & 255, n >> 8 & 255, n & 255].map(c => clamp(c * f))
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}
// Point on a circle in the XZ plane; deg 0 = +Z (towards the default camera side), clockwise seen from above.
export const polar = (r, deg, y = 0) => [r * Math.sin(deg * Math.PI / 180), y, r * Math.cos(deg * Math.PI / 180)]
