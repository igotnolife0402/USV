// PROMPT: Healing aura. A ground circle draws itself clockwise in 40 % of life. A softer inner ring breathes in and out once. Eight plus-shaped motes float gently up from the circle, fading in and out. Slow and calm, nothing sharp. Size 3/5, aggression 1/5, life 1.6 s.
const S = U.params(0.9), R = S.R, fy = R * 0.55, dr = U.ease(t / 0.4), fade = Math.max(0, (t - 0.6) / 0.4), w = 1.8 * (1 - fade) + 0.3
if (dr > 0.01) pen.stroke(U.arc(R * 0.95, -U.PI / 2, -U.PI / 2 + U.TAU * dr, { cy: fy, sq: 0.28, k: 80 }), w, w, 0.9 * (1 - fade * 0.6))
const br = Math.sin(U.PI * Math.min(1, t / 0.8)); pen.stroke(U.arc(R * (0.55 + 0.15 * br), 0, U.TAU, { cy: fy, sq: 0.28, k: 64 }), 3 * br + 0.3, 3 * br + 0.3, 0.45 * br)
const pr = U.rng(17)
for (let i = 0; i < 8; i++) {
  const x = pr.uniform(-0.8, 0.8) * R, t0 = pr.uniform(0.05, 0.4), q = (t - t0) / 0.6
  if (q <= 0 || q >= 1) continue
  const y = fy - R * 1.3 * U.ease(q), s = R * 0.07 * Math.sin(U.PI * q) + 0.5, v = Math.sin(U.PI * q)
  pen.stroke([[x - s, y], [x + s, y]], 1, 1, v); pen.stroke([[x, y - s], [x, y + s]], 1, 1, v)
}
return { motes: 4, moteR: R * 0.6 }
