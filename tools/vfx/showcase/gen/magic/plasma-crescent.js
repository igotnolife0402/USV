// PROMPT: Plasma crescent. A thick crescent blade of plasma (outer radius 0.9R, 0.28R thick at its middle, tapering to sharp points) grows to a 140 degree span in 20 % of life while sweeping around the centre, fast at first and slowing smoothly. Its leading tip is a white-hot dot. Three thinner echo crescents trail behind at 0.75R, 0.6R and 1.05R, offset back by 25 to 45 degrees. From 50 % the crescent widens and dissolves into a ring of motes.
const S = U.params(0.95), R = S.R
const span = 2.44 * Math.min(1, t / 0.2), a1 = -U.PI * 0.9 + 3.0 * (1 - (1 - t) ** 2), dis = Math.max(0, (t - 0.5) / 0.5), v = 1 - dis * 0.8
const cres = (r, a, sp, th, vv) => {
  const s = U.linspace(0, 1, 24), out = s.map(q => { const b = a - sp + sp * q; return [Math.cos(b) * r, Math.sin(b) * r] })
  const inn = s.slice().reverse().map(q => { const b = a - sp + sp * q, rr = r - th * Math.sin(U.PI * q); return [Math.cos(b) * rr, Math.sin(b) * rr] })
  if (sp > 0.02) pen.poly(out.concat(inn), vv)
}
const th = R * 0.28 * (1 + 0.6 * dis)
cres(R * 0.9, a1, span, th, v)
for (const [rr, off, vv] of [[0.75, -0.44, 0.5], [0.6, -0.8, 0.35], [1.05, -0.3, 0.4]]) cres(R * rr, a1 + off, span * 0.7, th * 0.4, v * vv)
pen.dot(Math.cos(a1) * R * 0.85, Math.sin(a1) * R * 0.85, R * 0.07 * (1 - dis) + 0.3, 1)
return { motes: 16 }
