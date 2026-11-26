// PROMPT: Electric dash, moving left to right. Three parallel speed lines sweep across in 22 % of life (a bright centre line and two dimmer side lines), with the tail chasing the head. Crackling jagged arcs re-roll around the path every frame. Afterimage dots fade along the trail, and a ring burst pops at the arrival point. Size 3/5, aggression 4/5, life 0.6 s.
const S = U.params(0.95), R = S.R, xa = -R * 0.95, xb = R * 0.75
const head = U.ease(t / 0.22), tail = U.ease(Math.max(0, t - 0.08) / 0.4), xh = xa + (xb - xa) * head, xt = xa + (xb - xa) * tail
if (xh - xt > 1) for (const o of [-1, 0, 1]) pen.stroke([[xt, o * R * 0.12], [xh, o * R * 0.12]], 0.3, (o ? 1.2 : 2.6) * S.w, o ? 0.7 : 1)
const fl = Math.floor(t * 32), v = Math.max(0, 1 - t / 0.6)
if (xh - xt >= 4 && v > 0.03) for (let i = 0; i < 3; i++) { const r = U.rng(40 + fl * 3 + i), x0 = xt + (xh - xt) * r.uniform(0, 0.5), x1 = Math.min(xh, x0 + R * r.uniform(0.3, 0.6)); pen.stroke(U.jag(r, x0, r.uniform(-1, 1) * R * 0.2, x1, r.uniform(-1, 1) * R * 0.2, 6, R * 0.1), 1.1 * v + 0.2, 0.3, v) }
for (let i = 0; i < 5; i++) { const f = i / 5, q = (t - f * 0.2) / 0.5; if (q > 0 && q < 1) pen.dot(xa + (xb - xa) * f, 0, R * 0.1 * (1 - q) + 0.3, 0.6 * (1 - q)) }
const b = (t - 0.2) / 0.55
if (b > 0 && b < 1) { pen.stroke(U.arc(R * (0.08 + 0.3 * U.ease(b)), 0, U.TAU, { cx: xb, k: 40 }), 2 * (1 - b) + 0.3, 2 * (1 - b) + 0.3, 1 - b); pen.dot(xb, 0, R * 0.16 * (1 - b) + 0.3, 1 - b) }
return { motes: 8, moteR: R * 0.6 }
