// PROMPT: Rifle muzzle flash, side view, firing right. Five flame petals fan out from the barrel tip in the first 8 % of life, the centre petal 1.5R long and the outer ones 0.75R; a white-hot core sits at the muzzle. Everything is gone by 38 %. Six thin sparks streak forward. A three-lobe smoke puff then curls up and to the right. Size 2/5, aggression 4/5, life 0.4 s.
const S = U.params(0.8), R = S.R, ox = -R * 0.7
const fl = Math.min(1, t / 0.08) * Math.max(0, 1 - Math.max(0, t - 0.08) / 0.3)
for (let i = 0; i < 5; i++) {
  const a = (i - 2) * 0.42, L = R * (i === 2 ? 1.5 : 0.75) * U.ease(t / 0.1)
  if (fl > 0.02) pen.stroke([[ox, 0], [ox + Math.cos(a) * L, Math.sin(a) * L]], 4.5 * S.w * fl, 0.3, fl)
}
pen.dot(ox + R * 0.1, 0, R * 0.2 * fl + 0.3, fl)
const sr = U.rng(1)
for (let i = 0; i < 6; i++) {
  const a = sr.uniform(-0.35, 0.35), sp = sr.uniform(1.2, 1.9) * R, d0 = sp * U.ease(t / 0.35), d1 = sp * U.ease(Math.max(0, t - 0.06) / 0.35), v = Math.max(0, 1 - t / 0.55)
  if (v > 0.02 && d0 - d1 > 0.5) pen.stroke([[ox + Math.cos(a) * d1, Math.sin(a) * d1], [ox + Math.cos(a) * d0, Math.sin(a) * d0]], 0.4, 1.1, v)
}
const sm = Math.max(0, (t - 0.06) / 0.94)
if (sm > 0) for (let i = 0; i < 3; i++) {
  const ph = i / 3 * U.TAU + sm * 2.5, rr = R * (0.12 + 0.3 * U.ease(sm)), cx = ox + R * 0.45 + R * 0.6 * sm, cy = -R * 0.7 * sm * sm
  pen.dot(cx + Math.cos(ph) * rr * 0.6, cy + Math.sin(ph) * rr * 0.4, R * 0.17 * (0.5 + sm), 0.4 * (1 - sm * 0.7) * Math.min(1, sm * 4))
}
return { motes: 5, moteR: R * 0.8 }
