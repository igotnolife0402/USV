// PROMPT: Acid geyser. A puddle swells on the floor line. At 8 % a thick goo column erupts straight up to 1.55R with a bulbous wobbling head. Twelve droplets arc out to both sides under gravity. From 40 % the column collapses back into the puddle, and 5 bubbles pop on the surface late. Size 4/5, aggression 3/5, life 1.0 s.
const S = U.params(0.9), R = S.R, fy = R * 0.75, sw = U.ease(t / 0.1)
const up = U.ease(Math.max(0, t - 0.08) / 0.22), down = U.ease(Math.max(0, t - 0.4) / 0.4), hgt = R * 1.55 * up * (1 - down), wx = R * 0.05 * Math.sin(t * 9)
if (hgt > 1) { pen.stroke([[0, fy], [wx, fy - hgt]], 5.5 * S.w, 4 * S.w, 1); pen.dot(wx, fy - hgt, 7 * S.w * (1 - 0.5 * down), 1) }
const dr = U.rng(3)
for (let i = 0; i < 12; i++) {
  const side = i % 2 ? 1 : -1, vx = side * dr.uniform(0.3, 0.9) * R, vy = dr.uniform(1.6, 2.6) * R, t0 = 0.12 + dr.uniform(0, 0.15), sz = dr.uniform(1.5, 3.2), q = (t - t0) / 0.6
  if (q > 0 && q < 1) { const y = fy - R * 0.6 * up - vy * q + 2.4 * R * q * q; if (y < fy) pen.dot(vx * q * 1.3, y, sz * (1 - q * 0.5), 1 - q * 0.4) }
}
const pw = R * (0.35 + 0.65 * U.ease(t / 0.5))
pen.poly(U.arc(pw, 0, U.TAU, { cy: fy, sq: 0.14, k: 40 }), 0.55 * sw)
const bb = U.rng(4)
for (let i = 0; i < 5; i++) { const bx = bb.uniform(-0.7, 0.7) * pw, t0 = 0.45 + bb.uniform(0, 0.35), q = (t - t0) / 0.2; if (q > 0 && q < 1) pen.stroke(U.arc(1.5 + 4 * q, 0, U.TAU, { cx: bx, cy: fy - 2 - 3 * q, k: 16 }), 0.8, 0.8, 1 - q) }
return { motes: 4, moteR: R * 0.6 }
