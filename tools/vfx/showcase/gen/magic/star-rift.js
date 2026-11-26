// PROMPT: Star rift. A four-point star tears open from a white-hot point: the vertical spikes (1.0R up, 0.9R down) and horizontal spikes (0.75R each side) shoot out in 18 % of life, each a sharp tapered diamond blade widest at the centre. Four shorter diagonal spikes (0.8R) follow from 10 % to 30 %. A thin square ring, rotated 45 degrees, expands behind them to 1.1R. From 40 % the spikes thin toward hair lines, the centre collapses with one last pulse and 20 motes drift out.
const S = U.params(0.95), R = S.R
const o = Math.min(1, t / 0.18) ** 0.8, o2 = Math.min(1, Math.max(0, (t - 0.1) / 0.2)), thin = Math.max(0, (t - 0.4) / 0.6), v = 1 - thin * 0.7
const blade = (a, L, w, vv) => { const c = Math.cos(a), s = Math.sin(a); pen.poly([[c * L, s * L], [-s * w, c * w], [-c * w * 1.5, -s * w * 1.5], [s * w, -c * w]], vv) }
for (const [a, L] of [[-U.PI / 2, 1.0], [U.PI / 2, 0.9], [0, 0.75], [U.PI, 0.75]]) blade(a, R * L * o * (1 + 0.1 * thin) + 0.5, R * 0.09 * (1 - thin * 0.85) + 0.4, v)
for (let i = 0; i < 4; i++) blade(U.PI / 4 + i * U.PI / 2, R * 0.8 * o2 + 0.5, R * 0.05 * (1 - thin * 0.85) * o2 + 0.3, v * 0.8)
const rg = Math.min(1, Math.max(0, (t - 0.05) / 0.5))
pen.stroke(U.arc(R * (0.2 + 0.9 * rg), 0, U.TAU, { rot: U.PI / 4, k: 5 }), 1.4 * (1 - rg) + 0.3, 1.4 * (1 - rg) + 0.3, 0.8 * (1 - rg * 0.7))
const pulse = Math.sin(U.PI * Math.min(1, Math.max(0, (t - 0.7) / 0.3)))
pen.dot(0, 0, R * 0.16 * (1 - thin) + R * 0.08 * pulse + 0.3, 1)
return { motes: 20 }
