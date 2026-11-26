// PROMPT: Toxic creep. A wide, low fog bank spreads sideways along the ground from the centre to 1.5R each way in 40 % of life, only 0.3R tall, built from 14 overlapping flat puffs that are densest in the middle. Five thin wisps curl up out of it to -0.8R, each an S-curve that is thick at the bank and hair-thin at the tip, starting at staggered times. Small bubbles swell and pop along the top edge. From 55 % the bank thins and lifts slightly as it fades.
const S = U.params(0.95), R = S.R, gy = R * 0.6
const sp = Math.min(1, t / 0.4) ** 0.9, fade = Math.max(0, (t - 0.55) / 0.45), v = 1 - fade * 0.85, lift = fade * R * 0.1
const pr = U.rng(3)
for (let i = 0; i < 14; i++) {
  const f = i / 13 * 2 - 1, jx = pr.uniform(-4, 4), rs = pr.uniform(0.14, 0.22), jy = pr.uniform(-0.06, 0.04)
  pen.dot(f * R * 1.5 * sp + jx, gy - lift + jy * R, R * rs * (0.3 + 0.7 * sp) * (1 + 0.3 * fade), v * (0.5 + 0.3 * (1 - Math.abs(f))))
}
const wr = U.rng(5)
for (let j = 0; j < 5; j++) {
  const x0 = (j / 4 * 2 - 1) * R * 1.1 * sp + wr.uniform(-6, 6), ph = wr.uniform(0, U.TAU), d = wr.uniform(0.05, 0.2)
  const g = Math.min(1, Math.max(0, (t - d) / 0.45))
  if (g <= 0) continue
  const pts = U.linspace(0, 1, 14).map(s => [x0 + Math.sin(s * 5 + ph + t * 4) * R * 0.12 * s, gy - lift - s * R * (0.2 + 1.2 * g)])
  pen.stroke(pts, 0.4 + 2.2 * S.w * (1 - fade), 0.3, v * 0.8 * Math.min(1, g * 3))
}
const br = U.rng(11)
for (let b = 0; b < 8; b++) {
  const bx = br.uniform(-1.2, 1.2) * R * sp, bt = br.uniform(0.15, 0.7), q = (t - bt) / 0.12
  if (q > 0 && q < 1) pen.stroke(U.arc(R * 0.04 + q * R * 0.06, 0, U.TAU, { cx: bx, cy: gy - lift - R * 0.2, k: 16 }), 0.8, 0.8, (1 - q) * 0.8)
}
return { motes: 10 }
