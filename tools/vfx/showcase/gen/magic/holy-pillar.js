// PROMPT: Holy light pillar. A vertical beam 0.32R wide drops from the top and lands on the floor in 12 % of life, with a brighter inner core a third of its width. A halo ellipse spreads out on the floor where it lands. Four cross-shaped glints rise along the beam, alternating sides. From 35 % the beam narrows to a thread, and from 50 % it fades from the bottom up. Size 3/5, aggression 2/5, life 1.2 s.
const S = U.params(0.9), R = S.R, fy = R * 0.8, top = -R * 1.3
const land = Math.min(1, t / 0.25), w = R * 0.32 * (1 - U.ease(Math.max(0, t - 0.25) / 0.65)) + 0.5, fadeB = U.ease(Math.max(0, t - 0.5) / 0.45)
const yy = Math.min(top + (fy - top) * land, fy - (fy - top) * fadeB)
if (yy > top + 1) { pen.stroke([[0, top], [0, yy]], w, w, 0.75); pen.stroke([[0, top], [0, yy]], w * 0.35, w * 0.35, 1) }
const h = Math.max(0, (t - 0.1) / 0.8), hw = 2.2 * (1 - h) + 0.3
if (h > 0) pen.stroke(U.arc(R * (0.3 + 0.75 * U.ease(h)), 0, U.TAU, { cy: fy, sq: 0.2, k: 64 }), hw, hw, 1 - h * 0.6)
for (let i = 0; i < 4; i++) {
  const q = (t - 0.15 - i * 0.08) / 0.5
  if (q > 0 && q < 1) { const gy = fy - (fy - top) * 0.85 * q, gx = (i % 2 ? 1 : -1) * R * 0.22, s = R * 0.12 * Math.sin(U.PI * q); pen.stroke([[gx - s, gy], [gx + s, gy]], 0.3, 0.9, 1); pen.stroke([[gx, gy - s * 1.4], [gx, gy + s * 1.4]], 0.3, 0.9, 1) }
}
return { motes: 8, moteR: R * 0.7 }
