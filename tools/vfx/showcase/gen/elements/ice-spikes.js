// PROMPT: Ice spike eruption. Seven crystal wedges stab up from the floor line in a fan, staggered 0.03 of life apart outward from the centre. The centre spike is tallest at 1.4R. Each wedge is a sharp triangle with a bright edge highlight. A frost ring spreads on the floor. From 45 % each spike shatters into 3 spinning shards that fall. Size 4/5, aggression 4/5, life 0.9 s.
const S = U.params(0.9), R = S.R, fy = R * 0.7, sr = U.rng(5)
for (let i = 0; i < 7; i++) {
  const f = (i - 3) / 3, t0 = Math.abs(i - 3) * 0.03, g = U.ease((t - t0) / 0.12), sh = Math.max(0, (t - 0.32) / 0.5)
  const H = R * (1.4 - 0.55 * Math.abs(f)) * sr.uniform(0.85, 1.05) * (1 + 0.2 * t), a = -U.PI / 2 + f * 0.55, bx = f * R * 0.55, w = R * 0.13 * (1 - 0.3 * Math.abs(f))
  if (g <= 0 || sh >= 1) continue
  const tx = bx + Math.cos(a) * H * g, ty = fy + Math.sin(a) * H * g, nx = -Math.sin(a) * w, ny = Math.cos(a) * w
  const wv = Math.max(0, 1 - sh / 0.3)
  if (wv > 0) { pen.poly([[bx - nx, fy - ny], [tx, ty], [bx + nx, fy + ny]], 0.55 * wv); pen.stroke([[bx + nx * 0.3, fy + ny * 0.3], [tx, ty]], 1.2, 0.3, wv) }
  if (sh > 0) for (let k = 0; k < 3; k++) {
    const u = (k + 0.5) / 3, cx = bx + (tx - bx) * u + (k - 1) * sh * R * 0.3, cy = fy + (ty - fy) * u + sh * sh * R * 0.9, s = w * (1 - u * 0.6) * (1 - sh * 0.5), r = a + sh * 3 + k
    pen.poly([[cx + Math.cos(r) * s * 1.8, cy + Math.sin(r) * s * 1.8], [cx + Math.cos(r + 2.3) * s, cy + Math.sin(r + 2.3) * s], [cx + Math.cos(r + 3.9) * s, cy + Math.sin(r + 3.9) * s]], 0.8 * Math.min(1, sh / 0.3) * (1 - sh))
  }
}
const fr = U.ease(t / 0.5), fw = 1.6 * (1 - t) + 0.3
pen.stroke(U.arc(R * (0.3 + 0.9 * fr), 0, U.TAU, { cy: fy, sq: 0.18, k: 64 }), fw, fw, 0.8 * (1 - t * 0.7))
return { motes: 10, moteR: R * 0.8 }
