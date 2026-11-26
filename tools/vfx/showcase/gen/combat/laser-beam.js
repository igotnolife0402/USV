// PROMPT: Laser beam, firing right. A charge dot grows at the emitter for 20 % of life. The beam then shoots across in 8 %, with a thick pulsing core and two thin parallel sheath lines. A ring flares around the emitter as it fires. An impact splash of 7 sparks blooms at the far end. From 50 % the beam thins to nothing. Size 3/5, aggression 4/5, life 0.8 s.
const S = U.params(0.95), R = S.R, x0 = -R * 0.95, x1 = R * 0.95
const ch = Math.min(1, t / 0.22), fx = Math.min(1, Math.max(0, t - 0.17) / 0.2), fire = fx * fx * (3 - 2 * fx), off = U.ease(Math.max(0, t - 0.5) / 0.4)
const xe = x0 + (x1 - x0) * fire, w = 4.5 * S.w * (1 - off) * (1 + 0.18 * Math.sin(t * 60))
pen.dot(x0, 0, R * (0.06 + 0.22 * ch) * (1 - off) + 0.3, 1 - off * 0.8)
if (fire > 0 && w > 0.2) { pen.stroke([[x0, 0], [xe, 0]], w, w, 1); for (const s of [-1, 1]) pen.stroke([[x0, s * w * 2.2], [xe, s * w * 2.2]], 0.5 * (1 - off) + 0.2, 0.5 * (1 - off) + 0.2, 0.7 * (1 - off)) }
for (let i = 0; i < 5; i++) { const q = t / 0.24; if (q >= 1) break; const a = i / 5 * U.TAU + q * q * 6, r = R * (0.55 - 0.45 * q); pen.stroke([[x0 + Math.cos(a - 0.4) * (r + 4), Math.sin(a - 0.4) * (r + 4)], [x0 + Math.cos(a) * r, Math.sin(a) * r]], 0.3, 1.5, Math.min(1, q * 5)) }
const er = (t - 0.2) / 0.35
if (er > 0 && er < 1) pen.stroke(U.arc(R * (0.08 + 0.3 * U.ease(er)), 0, U.TAU, { cx: x0, sq: 1.6, k: 40 }), 1.6 * (1 - er) + 0.3, 1.6 * (1 - er) + 0.3, 1 - er)
const sp = (t - 0.26) / 0.6
if (sp > 0 && sp < 1) { const sr = U.rng(13); for (let i = 0; i < 7; i++) { const a = U.PI + sr.uniform(-1.2, 1.2), d = R * sr.uniform(0.2, 0.5) * U.ease(sp); pen.stroke([[x1 + Math.cos(a) * d * 0.4, Math.sin(a) * d * 0.4], [x1 + Math.cos(a) * d, Math.sin(a) * d]], 0.3, 1.3 * (1 - sp) + 0.2, 1 - sp) } pen.dot(x1, 0, R * 0.15 * (1 - sp) + 0.3, 1 - sp) }
return { motes: 6, moteR: R * 0.7 }
