// PROMPT: Katana iaido draw cut. One razor crescent sweeps 200 degrees from left, over the top, to right in the first 25 % of life. It is 7 px thick at the head and needle-thin at the tail, tilted slightly. A hairline afterimage trails behind it. At the end of the cut a cross-shaped glint flashes on the blade's exit point. Eight dust motes linger. Size 3/5, aggression 4/5, life 0.5 s.
const S = U.params(0.95, { w: 1.1 }), R = S.R, a0 = Math.PI * 0.95, sp = 3.5, o = { sq: 0.42, rot: -0.15 }
const head = U.ease(t / 0.25), tail = 0.85 * U.ease(Math.max(0, t - 0.12) / 0.6)
if (head > tail + 0.01) pen.stroke(U.arc(R, a0 + sp * tail, a0 + sp * head, o), 0.3, 7 * S.w * (1 - 0.6 * tail), 1)
const h2 = U.ease(Math.max(0, t - 0.06) / 0.25), t2 = 0.9 * U.ease(Math.max(0, t - 0.1) / 0.45)
if (h2 > t2 + 0.01) pen.stroke(U.arc(R * 0.86, a0 + sp * t2, a0 + sp * h2, o), 0.2, 1.6, 0.55)
const g = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.2) / 0.45)))
if (g > 0.02) { const L = R * 0.5 * g, gx = R * 0.62, gy = R * 0.12; pen.stroke([[gx - L, gy], [gx + L * 0.5, gy]], 0.2, 1.4 * g, g); pen.stroke([[gx, gy - L * 0.6], [gx, gy + L * 0.6]], 0.2, 1.0 * g, g * 0.8) }
return { motes: 8, moteR: R * 0.9 }
