// PROMPT: Fireball explosion. An anticipation flare pulses at the centre for 12 % of life. Nine overlapping billow lobes then balloon out to 1.1R, each a filled puff with a hotter rim, with a white-hot core at the centre. A shock ring breaks out at 12 %. The lobes rise and roll outward while the core cools. It ends as drifting embers. Size 5/5, aggression 5/5, life 1.0 s.
const S = U.params(0.95), R = S.R, pre = Math.sin(U.PI * Math.min(1, t / 0.12))
const g = U.ease(Math.max(0, t - 0.06) / 0.3), rise = Math.max(0, t - 0.3) * R * 0.5, fade = Math.max(0, (t - 0.35) / 0.65)
pen.dot(0, 0, R * 0.18 * pre + 0.3, pre)
const lr = U.rng(9)
for (let i = 0; i < 9; i++) {
  const a = i / 9 * U.TAU + lr.uniform(-0.3, 0.3), d = R * lr.uniform(0.35, 0.65) * g, rr = R * lr.uniform(0.28, 0.42) * g * (1 + 0.3 * fade)
  const v = (1 - fade * 0.75) * (0.55 + 0.45 * (1 - d / R)), cx = Math.cos(a) * d * (1 + 0.4 * fade), cy = Math.sin(a) * d * 0.8 - rise, w = 2 * S.w * (1 - fade) + 0.4
  if (g > 0.02) { pen.dot(cx, cy, rr, v * 0.55); pen.stroke(U.arc(rr * 0.8, 0, U.TAU, { cx, cy, k: 28 }), w, w, v) }
}
pen.dot(0, -rise * 0.5, R * 0.42 * g * (1 - fade) + 0.3, 1 - fade)
const sk = (t - 0.12) / 0.4
if (sk > 0 && sk < 1) pen.stroke(U.arc(R * (0.4 + 0.75 * U.ease(sk)), 0, U.TAU, { k: 80 }), 1.6 * (1 - sk) + 0.3, 1.6 * (1 - sk) + 0.3, 0.8 * (1 - sk))
return { motes: 16 }
