// PROMPT: Black hole implosion. A tilted accretion ring shrinks from R to 0.22R over 70 % of life, getting thicker and brighter as it falls. Three spiral debris arms spin inward with accelerating rotation. The centre stays empty (the hole), with a thin bright event-horizon rim. At 72 % it collapses and pops one thin ring back outward. Size 4/5, aggression 3/5, life 1.2 s.
const S = U.params(0.95), R = S.R, c = Math.min(1, t / 0.7) ** 1.6, pop = Math.max(0, (t - 0.72) / 0.28), rr = R * (1 - 0.78 * c), o = { sq: 0.55, rot: -0.3, k: 80 }
if (pop <= 0) {
  pen.stroke(U.arc(rr, 0, U.TAU, o), 1 + 3.5 * c * S.w, 1 + 3.5 * c * S.w, 0.5 + 0.5 * c)
  for (let k = 0; k < 3; k++) {
    const pts = [], ph = k / 3 * U.TAU + 9 * t * t
    for (let j = 0; j <= 20; j++) { const f = j / 20, r = rr + (R * 1.1 - rr) * f * (1 - c), a = ph - f * 2.6; pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.7]) }
    if (1 - c > 0.03) pen.stroke(pts, 2.4 * S.w, 0.3, 1 - c * 0.6)
  }
  pen.stroke(U.arc(rr * 0.45 + 1, 0, U.TAU, { k: 48 }), 1.4, 1.4, c)
} else {
  const r2 = R * (0.2 + 0.95 * pop), w = 3 * (1 - pop) * Math.min(1, pop * 5) + 1
  pen.stroke(U.arc(r2, 0, U.TAU, o), w, w, 1 - pop * 0.6); pen.dot(0, 0, R * 0.12 * (1 - pop) + 0.3, 1 - pop)
}
return { motes: 12 }
