// PROMPT: Cataclysm finale, the reel's payoff. Eight flickering bolts crawl in from the rim and feed a swelling white core. At 25 % of life the core detonates into two staggered shock rings (thick, then thin), 16 alternating long and short radial rays, and 4 spiral arms whirling out. Ten heavy debris chunks fly out and drop. Full frame. Size 5/5, aggression 5/5, life 1.4 s.
const S = U.params(1.0), R = S.R, inT = U.ease(t / 0.3), bf = Math.max(0, 1 - Math.max(0, t - 0.25) / 0.2), fl = Math.floor(t * 24)
for (let i = 0; i < 8; i++) { const a = i / 8 * U.TAU + 0.2, r1 = R * 1.1, r0 = R * (1.1 - 0.95 * inT); if (bf > 0.02 && r1 - r0 > 2) pen.stroke(U.jag(U.rng(70 + i + fl * 8), Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r0, Math.sin(a) * r0, 8, R * 0.07), 0.5, 2 * S.w * bf + 0.2, bf) }
const core = Math.sin(U.PI * Math.min(1, t / 0.55)); pen.dot(0, 0, R * 0.3 * core + 0.4, core)
for (const [d, w0] of [[0.25, 6], [0.36, 3]]) { const q = (t - d) / (1 - d); if (q > 0) { const w = w0 * S.w * (1 - q) * Math.min(1, q * 6) + 0.4; pen.stroke(U.arc(R * (0.2 + 0.95 * U.ease(q)), 0, U.TAU, { k: 96 }), w, w, 1 - q * 0.5) } }
const rq = (t - 0.27) / 0.5
if (rq > 0 && rq < 1) for (let i = 0; i < 16; i++) { const a = i / 16 * U.TAU, r0 = R * (0.2 + 0.4 * U.ease(rq)), r1 = r0 + R * (i % 2 ? 0.35 : 0.6) * Math.min(1, rq * 5) * (1 - rq) + 0.5; pen.stroke([[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]], 1.8 * (1 - rq) + 0.3, 0.3, 1 - rq * 0.5) }
const g = U.ease(Math.max(0, t - 0.2) * 1.5)
if (g > 0.05) for (let k = 0; k < 4; k++) { const ph = k / 4 * U.TAU + t * 5, pts = []; for (let j = 0; j <= 24; j++) { const f = j / 24, rr = R * 0.95 * g * f, a = ph + f * 2.6; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]) } pen.stroke(pts, 0.4, 2.6 * S.w * (1 - t) + 0.3, Math.max(0.1, 1 - t)) }
const dr = U.rng(77), q = Math.max(0, (t - 0.25) / 0.75)
for (let i = 0; i < 10; i++) { const a = dr.uniform(0, U.TAU), sp = dr.uniform(0.7, 1.1) * R, s = dr.uniform(2, 4); if (q > 0) pen.dot(Math.cos(a) * sp * U.ease(q), Math.sin(a) * sp * U.ease(q) + q * q * R * 0.3, s * (1 - q * 0.5), 1 - q * 0.5) }
return { motes: 18 }
