// PROMPT: Shadow tendrils. Five tentacles whip out from a dark core in 35 % of life. Each is a tapered sine-wave stroke whose wave travels outward, with the amplitude growing toward the tip and the tips curling alternately left and right. From 50 % they retract to a quarter of their length, leaving wisps. Size 4/5, aggression 3/5, life 1.0 s.
const S = U.params(0.95), R = S.R, grow = U.ease(t / 0.35), ret = U.ease(Math.max(0, t - 0.5) / 0.45)
for (let k = 0; k < 5; k++) {
  const a0 = k / 5 * U.TAU - U.PI / 2, L = R * (1.0 - 0.15 * (k % 2)) * grow * (1 - 0.75 * ret), amp = R * 0.16 * (0.4 + grow), pts = []
  for (let j = 0; j <= 28; j++) {
    const f = j / 28, d = L * f, wv = Math.sin(f * 7 - t * 12 + k) * amp * f, a = a0 + (f > 0.8 ? (f - 0.8) * 4.5 : 0) * (k % 2 ? 1 : -1)
    pts.push([Math.cos(a) * d - Math.sin(a0) * wv, Math.sin(a) * d + Math.cos(a0) * wv])
  }
  if (L > 2) pen.stroke(pts, 4.5 * S.w * (1 - ret * 0.6), 0.3, 1 - ret * 0.5)
}
pen.dot(0, 0, R * 0.2 * grow * (1 - ret) + 0.3, 0.8 * (1 - ret))
return { motes: 10, moteR: R }
