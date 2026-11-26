// PROMPT: Meteor impact. A burning rock streaks in diagonally from the upper left with a long tapering tail and hits the floor centre at 30 % of life. On impact a blast dome bulges up, a flat ground shock ring races out, and 10 debris chunks spray up in arcs. The dome fades from 44 %. Size 5/5, aggression 5/5, life 1.2 s.
const S = U.params(0.95), R = S.R, fy = R * 0.6, fall = Math.min(1, t / 0.3), hx = -R * 1.2 + R * 1.2 * fall, hy = -R * 1.2 + (fy + R * 1.2) * fall
if (t < 0.3) { const ang = Math.atan2(fy + R * 1.2, R * 1.2), tl = R * 0.9; pen.stroke([[hx - Math.cos(ang) * tl, hy - Math.sin(ang) * tl], [hx, hy]], 0.3, 5 * S.w, 1); pen.dot(hx, hy, 5.5 * S.w, 1) }
const q = (t - 0.3) / 0.7
if (q > 0) {
  const dome = U.ease(q / 0.5), df = Math.max(0, (q - 0.2) / 0.8), w = 3.5 * (1 - q) + 0.4
  pen.poly(U.arc(R * 0.75 * dome + 1, U.PI, U.TAU, { cy: fy, k: 36 }), 0.8 * (1 - df))
  pen.stroke(U.arc(R * (0.2 + 1.0 * U.ease(q)), 0, U.TAU, { cy: fy, sq: 0.18, k: 72 }), w, w, 1 - q * 0.5)
  const dr = U.rng(15)
  for (let i = 0; i < 10; i++) { const a = -U.PI / 2 + dr.uniform(-1.1, 1.1), sp = dr.uniform(0.8, 1.5) * R, s = dr.uniform(1.4, 3), y = fy + Math.sin(a) * sp * q + 1.5 * R * q * q; if (y < fy) pen.dot(Math.cos(a) * sp * q, y, s * (1 - q * 0.5), 1 - q * 0.4) }
}
return { motes: 12, moteR: R * 0.8 }
