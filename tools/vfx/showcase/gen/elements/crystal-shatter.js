// PROMPT: Crystal shatter. A hexagonal crystal (0.5R) cracks with 6 lines racing from its centre to its corners in 20 % of life. A cross glint flashes. From 18 % it blows apart into 12 triangle shards that fly out radially, spinning in alternating directions and dropping slightly, each with a bright leading edge. Size 3/5, aggression 4/5, life 1.0 s.
const S = U.params(0.9), R = S.R, hex = U.arc(R * 0.5, U.PI / 6, U.PI / 6 + U.TAU, { k: 6 }).slice(0, 6)
const crack = Math.min(1, t / 0.24), gs = 0.4 + 0.6 * Math.min(1, t / 0.3), bx = Math.min(1, Math.max(0, t - 0.2) / 0.6), blow = bx * bx * (3 - 2 * bx), fade = Math.max(0, (t - 0.45) / 0.55)
if (blow <= 0.02) { pen.poly(hex.map(([x, y]) => [x * gs, y * gs]), 0.5); for (let i = 0; i < 6; i++) pen.stroke([[0, 0], [hex[i][0] * crack * gs, hex[i][1] * crack * gs]], 1.4, 0.4, 1) }
else for (let i = 0; i < 12; i++) {
  const w = i >> 1, h = i & 1, A = hex[w], B = hex[(w + 1) % 6], M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], tri = h ? [[0, 0], A, M] : [[0, 0], M, B]
  const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3, d = 1 + 2.2 * blow, sp = (h ? 1 : -1) * (2 + w % 3) * blow, sc = 1 - 0.4 * fade
  const pts = tri.map(([x, y]) => { const dx = (x - cx) * sc, dy = (y - cy) * sc; return [cx * d + dx * Math.cos(sp) - dy * Math.sin(sp), cy * d + blow * blow * R * 0.4 + dx * Math.sin(sp) + dy * Math.cos(sp)] })
  pen.poly(pts, 0.6 * (1 - fade)); pen.stroke([pts[1], pts[2]], 0.9, 0.9, 1 - fade)
}
const g = Math.sin(U.PI * Math.min(1, Math.max(0, (t - 0.12) / 0.3)))
if (g > 0.02) { const L = R * 0.6 * g; pen.stroke([[-L, 0], [L, 0]], 0.3, 1.5 * g, g); pen.stroke([[0, -L], [0, L]], 0.3, 1.5 * g, g) }
return { motes: 12 }
