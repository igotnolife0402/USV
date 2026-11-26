// PROMPT: Mushroom blast. A white-hot ground flash at y = +0.75R swells over 10 % of life. A stem column climbs from the ground to -0.6R in 45 % of life, tapering from 0.32R wide at the base to 0.18R at the top and wobbling slightly. At its top a cap of 7 billows rolls outward into a 1.5R-wide dome, each billow a filled puff with a hotter rim. A flat ground ring races out to 1.2R and 0.18R tall. From 45 % the whole column cools, swells and thins into rising embers.
const S = U.params(0.95), R = S.R, gy = R * 0.75
const k = Math.min(1, t / 0.1), up = Math.min(1, t / 0.45), cool = Math.max(0, (t - 0.45) / 0.55), v = 1 - cool * 0.8
pen.dot(0, gy, R * 0.3 * k * (1 - cool) + 0.3, k * (1 - cool * 0.9))
const top = gy - (gy + R * 0.6) * up
for (let i = 0; i < 10; i++) {
  const f = i / 9, y = gy + (top - gy) * f, r = R * (0.32 - 0.14 * f) * (0.4 + 0.6 * up) * (1 + 0.2 * cool)
  pen.dot(Math.sin(i * 1.7 + t * 6) * R * 0.03, y, r, v * (0.45 + 0.3 * f))
}
const cr = U.rng(7), cw = R * 0.75 * up ** 1.3
for (let i = 0; i < 7; i++) {
  const a = -U.PI + i / 6 * U.PI + cr.uniform(-0.15, 0.15), sz = cr.uniform(0, 1)
  const dx = Math.cos(a) * cw, dy = top + Math.sin(a) * cw * 0.45, rr = R * (0.2 + 0.06 * sz) * (0.3 + 0.7 * up) * (1 + 0.3 * cool), w = 1.2 * (1 - cool) + 0.3
  if (up > 0.05) { pen.dot(dx, dy, rr, v * 0.6); pen.stroke(U.arc(rr * 0.8, 0, U.TAU, { cx: dx, cy: dy, k: 24 }), w, w, v) }
}
const rg = Math.min(1, t / 0.5)
pen.stroke(U.arc(R * (0.3 + 0.9 * rg), 0, U.TAU, { cy: gy, sq: 0.18, k: 72 }), 2 * (1 - rg) + 0.3, 2 * (1 - rg) + 0.3, 0.9 * (1 - rg * 0.8))
return { motes: 18 }
