// PROMPT: Earth fist slam. An impact flash hits the floor. Six jagged cracks race out across the ground (squashed into perspective) in 20 % of life. Nine five-sided rock chunks launch up in spinning parabolas and fall back. A dust shockwave ring rolls out along the floor. The cracks fade from 50 %. Size 4/5, aggression 5/5, life 1.0 s.
const S = U.params(0.95), R = S.R, fy = R * 0.45, cr = U.ease(t / 0.2), cf = 1 - Math.max(0, t - 0.5) / 0.5
for (let i = 0; i < 6; i++) {
  const a = i / 6 * U.TAU + 0.25, L = R * 1.05 * cr
  if (L > 2) pen.stroke(U.jag(U.rng(20 + i), 0, 0, Math.cos(a) * L, Math.sin(a) * L, 7, R * 0.08).map(([x, y]) => [x, fy + y * 0.28]), 2.4 * S.w * cf + 0.3, 0.3, cf)
}
const rr = U.rng(21), q = Math.max(0, (t - 0.03) / 0.85)
for (let i = 0; i < 9; i++) {
  const vx = rr.uniform(-1, 1) * R * 0.9, vy = rr.uniform(1.3, 2.2) * R, s = rr.uniform(3, 6.5), spin = rr.uniform(-6, 6), x = vx * q, y = fy - vy * q + 2.2 * R * q * q
  if (q <= 0 || y > fy + 2) continue
  const pts = []; for (let k = 0; k < 5; k++) { const aa = spin * q + k / 5 * U.TAU, m = 0.7 + 0.15 * ((k * 7 + i) % 3); pts.push([x + Math.cos(aa) * s * m, y + Math.sin(aa) * s * m]) }
  pen.poly(pts, 0.75)
}
const sw = t / 0.8; if (sw < 1) { const w = 3.5 * (1 - sw) + 0.4; pen.stroke(U.arc(R * (0.15 + 1.0 * U.ease(sw)), 0, U.TAU, { cy: fy, sq: 0.25, k: 72 }), w, w, 0.7 * (1 - sw * 0.5)) }
const fl = Math.max(0, 1 - t / 0.25); pen.dot(0, fy, R * 0.25 * fl + 0.3, fl)
return { motes: 10, moteR: R * 0.8 }
