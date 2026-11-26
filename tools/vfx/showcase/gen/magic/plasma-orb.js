// PROMPT: Plasma orb charge and release. For 50 % of life an orb grows to 0.32R with a wobbling surface of 3 re-rolled jagged loops, while 6 sparks spiral inward to feed it. Then it releases: the orb collapses, a nova ring blasts out, and 12 alternating long and short radial spikes shoot out and shrink. Size 4/5, aggression 4/5, life 1.0 s.
const S = U.params(0.95), R = S.R, ch = U.ease(t / 0.5), rel = Math.max(0, (t - 0.5) / 0.5), q = t / 0.5, ro = R * 0.32 * ch * (1 + 0.25 * q * q) * (1 - U.ease(rel / 0.4))
if (ro > 1) { pen.dot(0, 0, ro * 0.7, 0.8); const fl = Math.floor(t * 30); for (let k = 0; k < 3; k++) { const r = U.rng(60 + fl + k * 9), pts = []; for (let j = 0; j <= 24; j++) { const a = j / 24 * U.TAU, m = r.uniform(0.9, 1.12); pts.push([Math.cos(a) * ro * m, Math.sin(a) * ro * m]) } pen.stroke(pts, 1, 1, 0.9) } }
if (q < 1) for (let i = 0; i < 6; i++) { const a = i / 6 * U.TAU + q * q * 9, r = R * (1.05 - 0.75 * q * q), a2 = a - 0.5, r2 = r + R * 0.12; pen.stroke([[Math.cos(a2) * r2, Math.sin(a2) * r2], [Math.cos(a) * r, Math.sin(a) * r]], 0.3, 1.8, Math.min(1, q * 4) * (1 - q * 0.3)) }
if (rel > 0) {
  const k = Math.min(1, rel * 3), rr = R * (0.3 + 0.75 * U.ease(rel)), w = (4 * (1 - rel)) * k + 0.4
  pen.stroke(U.arc(rr, 0, U.TAU, { k: 80 }), w, w, 1 - rel * 0.5)
  for (let i = 0; i < 12; i++) { const a = i / 12 * U.TAU + 0.13, r0 = R * 0.25 + R * 0.5 * U.ease(rel), r1 = r0 + R * 0.4 * (1 - rel) * (i % 2 ? 0.6 : 1) * k; pen.stroke([[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]], 2 * (1 - rel) + 0.3, 0.3, 1 - rel * 0.6) }
}
return { motes: 10 }
