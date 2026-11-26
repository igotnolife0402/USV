const S = U.params(0.95), R = S.R
// 6 bolts crawl inward from the rim and feed the core
const inT = U.ease(t / 0.35), bf = Math.max(0, 1 - Math.max(0, t - 0.28) / 0.3)
for (let i = 0; i < 6; i++) {
  const a = i / 6 * U.TAU + 0.3, r1 = R * 1.05, r0 = R * (1.05 - 0.85 * inT)
  if (bf > 0.02 && r1 - r0 > 2) pen.stroke(U.jag(U.rng(i), Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r0, Math.sin(a) * r0, 9, R * 0.07), 0.6, 2.2 * S.w * bf, bf)
}
// core swells, then collapses into the ring
const core = Math.sin(Math.PI * Math.min(1, t / 0.62))
pen.dot(0, 0, R * 0.24 * core + 0.4, core)
// nova ring
const rt = Math.max(0, (t - 0.22) / 0.78)
if (rt > 0) { const rr = R * (0.18 + 0.9 * U.ease(rt)), w = 5 * S.w * (1 - rt) * Math.min(1, rt * 6) + 0.4; pen.stroke(U.arc(rr, 0, U.TAU, { k: 96 }), w, w, 1 - rt * 0.5) }
// 3 spiral arms whirl out with the ring
for (let k = 0; k < 3; k++) {
  const ph = k / 3 * U.TAU + t * 4, pts = [], g = U.ease(t * 1.3)
  for (let j = 0; j <= 24; j++) { const f = j / 24, rr = R * 0.95 * g * f, a = ph + f * 2.4; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]) }
  if (g > 0.05) pen.stroke(pts, 0.4, 3 * S.w * (1 - t) + 0.3, Math.max(0.1, 1 - t))
}
return { motes: 14 }
