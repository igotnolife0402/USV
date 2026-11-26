// PROMPT: Chain lightning. A jagged bolt jumps left to right through 4 nodes. Each hop takes 0.08 of life, with the next hop starting 0.09 later. A burst ring flashes at each node the moment the bolt arrives, and each segment throws one forked branch. Bolts re-jag every frame so they flicker, then thin and die from the first node to the last. Size 4/5, aggression 5/5, life 0.6 s.
const S = U.params(0.95), R = S.R, N = [[-R, R * 0.2], [-R * 0.35, -R * 0.35], [R * 0.3, R * 0.25], [R * 0.95, -R * 0.2]], fl = Math.floor(t * 30)
for (let i = 0; i < 3; i++) {
  const ta = i * 0.09, p = U.ease((t - ta) / 0.08), v = Math.max(0, 1 - Math.max(0, t - ta - 0.12) / 0.45)
  if (p <= 0 || v <= 0.02) continue
  const [x0, y0] = N[i], [x1, y1] = N[i + 1], x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p
  pen.stroke(U.jag(U.rng(i * 50 + fl), x0, y0, x, y, 10, R * 0.09), 2.6 * S.w * v, 1.8 * S.w * v + 0.3, v)
  const fr = U.rng(i * 50 + fl + 7), mx = (x0 + x) / 2, my = (y0 + y) / 2, fa = fr.uniform(0, U.TAU)
  pen.stroke(U.jag(fr, mx, my, mx + Math.cos(fa) * R * 0.35 * p, my + Math.sin(fa) * R * 0.35 * p, 5, R * 0.06), 1.2 * v, 0.3, v * 0.8)
}
for (let i = 0; i < 4; i++) {
  const ta = i ? i * 0.09 - 0.01 : 0, q = (t - ta) / 0.35
  if (q > 0 && q < 1) { const rr = R * 0.1 + R * 0.25 * U.ease(q); pen.stroke(U.arc(rr, 0, U.TAU, { cx: N[i][0], cy: N[i][1], k: 40 }), 2 * (1 - q) + 0.3, 2 * (1 - q) + 0.3, 1 - q); pen.dot(N[i][0], N[i][1], R * 0.1 * (1 - q) + 0.3, 1 - q) }
}
return { motes: 10 }
