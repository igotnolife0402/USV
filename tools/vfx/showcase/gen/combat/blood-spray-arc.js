// PROMPT: Directional blood spray from a heavy hit, flying right. Eighteen droplets leave in a cone: 5 large lead drops and 13 small ones, each with a short trailing streak. They follow gravity arcs and splat flat on the floor line where they land. A mist puff hangs at the wound. Size 3/5, aggression 5/5, life 0.8 s.
const S = U.params(0.9), R = S.R, ox = -R * 0.75, fy = R * 0.7, G = 1.6 * R, dr = U.rng(8)
for (let i = 0; i < 18; i++) {
  const a = dr.uniform(-0.55, 0.25), sp = dr.uniform(1.0, 2.1) * R, sz = i < 5 ? dr.uniform(3, 4.2) : dr.uniform(1.2, 2.6), t0 = dr.uniform(0, 0.06)
  const pos = q => [ox + Math.cos(a) * sp * q, Math.sin(a) * sp * q + G * q * q], q = Math.max(0, (t - t0) / 0.75)
  if (q <= 0) continue
  const b = Math.sin(a) * sp, qi = (-b + Math.sqrt(b * b + 4 * G * fy)) / (2 * G)
  if (q >= qi) { pen.poly(U.arc(sz * (1.2 + 0.6 * Math.min(1, (q - qi) * 8)), 0, U.TAU, { cx: pos(qi)[0], cy: fy, sq: 0.35, k: 14 }), 0.8 * (1 - Math.max(0, t - 0.7) / 0.3 * 0.5)); continue }
  const [x, y] = pos(q), [px, py] = pos(Math.max(0, q - 0.08)); pen.stroke([[px, py], [x, y]], 0.3, sz * (1 - q * 0.3), 1)
}
const m = Math.sin(U.PI * Math.min(1, t / 0.5)); pen.dot(ox + R * 0.15, 0, R * 0.3 * (0.4 + t), 0.35 * m)
return { motes: 5, moteR: R * 0.6 }
