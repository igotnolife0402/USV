// Procedural textures (RGBA byte arrays), shared by the GLB export and the preview.
// Scales atlas: u in [0, 0.8) = skin around the body (u 0 = spine top, 0.4 = belly), u >= 0.8 = ivory gradient.
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const PAL = { dark: hex('#1b2a33'), mid: hex('#2f4a52'), belly: hex('#8a9a8c'), ivory: hex('#d8cfb8'), ivoryDark: hex('#8f846c'), membrane: hex('#3c5f66') };
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function scales(W = 1024, H = 1024) {
  const color = new Uint8Array(W * H * 4), height = new Float32Array(W * H);
  const skinW = Math.round(W * 0.8), COLS = 14, ROWS = 36, cw = skinW / COLS, rh = H / ROWS;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    if (x >= skinW) { // ivory: base (dark) -> tip (pale), faint growth lines
      const f = (x - skinW) / (W - skinW), line = 0.06 * Math.sin(y * 0.35 + f * 9);
      const c = mix(PAL.ivoryDark, PAL.ivory, Math.min(1, f * 1.3)).map((v) => v * (1 + line));
      color.set([c[0], c[1], c[2], 255], o); height[y * W + x] = 0.5 + line; continue;
    }
    const u = x / skinW;                 // 0..1 around (0 top, 0.5 belly)
    const belly = sstep(0.36, 0.42, u) * (1 - sstep(0.58, 0.64, u));
    const flank = Math.sin(Math.PI * u) ** 1.2;
    // fish-scale grid: rows offset by half a column; tips point toward +v (the tail)
    let best = 1e9, bi = 0, bj = 0, lx = 0, ly = 0;
    const r0 = Math.floor(y / rh);
    for (let rr = r0 - 1; rr <= r0 + 1; rr++) {
      const off = (((rr % 2) + 2) % 2) * 0.5, c0 = Math.floor(x / cw - off);
      for (let cc = c0 - 1; cc <= c0 + 1; cc++) {
        const cx = (cc + off + 0.5) * cw, cy = (rr + 0.5) * rh;
        const dx = (x - cx) / (cw * 0.62), dy = (y - cy) / (rh * 1.15);
        const d = Math.hypot(dx, dy * (dy > 0 ? 0.85 : 1.25)) - dy * 0.25; // rounded front, pointed back
        if (d < best) { best = d; bi = ((cc % COLS) + COLS) % COLS; bj = ((rr % ROWS) + ROWS) % ROWS; lx = dx; ly = dy; }
      }
    }
    const jit = hash(bi, bj) - 0.5;
    const dome = Math.max(0, 1 - best);                 // 1 centre -> 0 rim
    const rim = sstep(0.78, 0.95, best);                // dark gap between scales
    let base = mix(PAL.dark, PAL.mid, flank * 0.9 + jit * 0.15);
    // belly plates: wide transverse bands
    const plateY = (y / (rh * 2)) % 1, plate = 1 - sstep(0.82, 0.97, plateY);
    const bellyC = mix(PAL.belly.map((v) => v * 0.78), PAL.belly, plate * (0.7 + 0.3 * (1 - plateY)));
    const keel = Math.exp(-((lx / 0.07) ** 2)) * dome * 0.25;  // raised centre ridge on each scale
    let c = mix(base.map((v) => v * (0.62 + 0.7 * dome - 0.14 * ly + keel)), base.map((v) => v * 0.25), sstep(0.6, 0.9, rim));
    c = mix(c, bellyC, belly);
    const glint = Math.max(0, -ly) * dome * 0.18 * (1 - belly);
    c = c.map((v) => Math.min(255, v + 255 * glint * 0.25));
    color.set([c[0], c[1], c[2], 255], o);
    height[y * W + x] = belly > 0.5 ? plate * 0.6 + 0.2 : (dome + keel) * (1 - rim) * 0.9;
  }
  // normal map from height (tangent space, wraps in both directions)
  const normal = new Uint8Array(W * H * 4), k = 2.2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const h = (xx, yy) => height[((yy + H) % H) * W + ((xx + W) % W)];
    const dx = (h(x + 1, y) - h(x - 1, y)) * k, dy = (h(x, y + 1) - h(x, y - 1)) * k;
    const l = Math.hypot(dx, dy, 1), o = (y * W + x) * 4;
    normal.set([(-dx / l * 0.5 + 0.5) * 255, (-dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255, 255], o);
  }
  return { W, H, color, normal };
}

// Membrane: translucent skin with veins radiating from the wrist side, darker edges.
export function membrane(W = 256, H = 256) {
  const color = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H, ang = Math.atan2(v - 0.15, u - 0.62), r = Math.hypot(u - 0.62, v - 0.15);
    const vein = Math.pow(Math.abs(Math.sin(ang * 9 + r * 6)), 40) * 0.5 + Math.pow(Math.abs(Math.sin(r * 28 + ang * 2)), 60) * 0.25;
    const mott = 0.06 * (hash(Math.floor(x / 6), Math.floor(y / 6)) - 0.5);
    const c = PAL.membrane.map((p) => p * (1 - vein * 0.45 + mott) + 18 * (1 - r));
    color.set([c[0], c[1], c[2], 217], (y * W + x) * 4); // alpha 0.85
  }
  return { W, H, color };
}
