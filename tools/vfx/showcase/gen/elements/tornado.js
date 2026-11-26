// PROMPT: Wind tornado. A funnel of 10 stacked elliptical ring arcs, narrow at the floor and wide at the top, 1.75R tall. Every ring spins at its own phase and the whole column sways in a sine wave. Six debris streaks orbit the funnel. It builds bottom-up in 35 % of life and unwinds top-down from 55 %. Size 4/5, aggression 3/5, life 1.4 s.
const S = U.params(0.95), R = S.R, fy = R * 0.85, H = R * 1.75, up = U.ease(t / 0.35), un = Math.min(1, Math.max(0, t - 0.45) / 0.55)
const sway = f => Math.sin(t * 7 + f * 3) * R * 0.15 * f
for (let i = 0; i < 10; i++) {
  const f = i / 9, y = fy - H * f, rr = R * (0.08 + 0.62 * f * f + 0.1 * f), born = U.ease((up * 1.25 - f) / 0.25), gone = U.ease((un * 1.25 - (1 - f)) / 0.25), v = born * (1 - gone)
  if (v < 0.02) continue
  const ph = t * 14 + f * 2 + i
  pen.stroke(U.arc(rr * v, ph, ph + U.PI * 1.5, { cx: sway(f), cy: y, sq: 0.22, k: 32 }), 0.4, 2.4 * S.w * (0.5 + f * 0.6), v)
}
const dr = U.rng(10)
for (let i = 0; i < 6; i++) {
  const f = dr.uniform(0.2, 0.9), y = fy - H * f, rr = R * (0.2 + 0.7 * f), a = t * 10 + i * 1.7, v = Math.min(up, 1 - un) * dr.uniform(0.6, 1)
  if (v > 0.03) pen.stroke(U.arc(rr * 1.1, a, a + 0.5, { cx: sway(f), cy: y, sq: 0.22, k: 8 }), 0.3, 1.2, v)
}
return { motes: 6, moteR: R * 0.7 }
