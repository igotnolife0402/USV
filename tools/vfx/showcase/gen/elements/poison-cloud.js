// PROMPT: Poison cloud. Seven soft puffs inflate one after another over the first 25 % of life into a low lumpy cloud bank, each puff with a brighter top rim. The bank drifts right and sags slowly. Six surface bubbles swell and pop late. Lingering and calm. Size 3/5, aggression 1/5, life 1.6 s.
const S = U.params(0.9), R = S.R, pr = U.rng(11), drift = t * R * 0.2, sag = t * t * R * 0.12
for (let i = 0; i < 7; i++) {
  const cx = (i - 3) * R * 0.27 + pr.uniform(-4, 4) + drift, cy = pr.uniform(-0.25, 0.1) * R + Math.abs(i - 3) * R * 0.06 + sag, rmax = R * pr.uniform(0.26, 0.38), t0 = pr.uniform(0, 0.25)
  const g = U.ease((t - t0) / 0.3), v = 0.55 * g * (1 - Math.max(0, t - 0.6) / 0.4 * 0.6)
  if (g < 0.02) continue
  pen.dot(cx, cy, rmax * g * (0.9 + 0.1 * Math.sin(t * 8 + i)), v); pen.stroke(U.arc(rmax * g * 0.95, U.PI * 1.05, U.PI * 1.95, { cx, cy, k: 18 }), 1.2, 1.2, Math.min(1, v * 1.4))
}
const bb = U.rng(12)
for (let i = 0; i < 6; i++) { const bx = bb.uniform(-0.8, 0.8) * R + drift, by = bb.uniform(-0.45, -0.15) * R + sag, t0 = 0.25 + bb.uniform(0, 0.5), q = (t - t0) / 0.18; if (q > 0 && q < 1) pen.stroke(U.arc(1.5 + 5 * q, 0, U.TAU, { cx: bx, cy: by, k: 16 }), 0.9, 0.9, 1 - q) }
return { motes: 8, moteR: R * 0.9 }
