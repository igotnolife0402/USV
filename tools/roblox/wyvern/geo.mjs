// Wyvern meshes from code: smooth swept tubes, domed joints, lofted head, membranes with sag.
// Each part is built in its ANCHOR's local frame (front joint at origin, -Z toward the nose, +Y up, +X right).
// Anchors: chain parts are their own anchor; wings/legs ride TorsoSeg2/TorsoSeg4; jaw and eyes ride Head.
import { BODY, TAIL_BLADE } from './spec.mjs';
import { V } from './motion.mjs';
const { add, sub, mul, dot, cross, norm, len, rotAxis } = V;
const TAU = Math.PI * 2;
const gauss = (x) => Math.exp(-x * x);
const SCALE_U = 0.8;           // u in [0, 0.8) = scale skin around the body; [0.82, 0.99] = ivory (spikes, horns, teeth, talons)
const ivoryU = (f) => 0.82 + 0.17 * Math.min(1, Math.max(0, f));

class Mesh {
  constructor(name, anchor, mat) { Object.assign(this, { name, anchor, mat, pos: [], nrm: [], uv: [], idx: [] }); }
  v(p, n, uv) { this.pos.push(p); this.nrm.push(norm(n)); this.uv.push(uv); return this.pos.length - 1; }
  tri(a, b, c) { // orient so the face agrees with its vertex normals (CCW from outside)
    const fn = cross(sub(this.pos[b], this.pos[a]), sub(this.pos[c], this.pos[a]));
    const vn = add(add(this.nrm[a], this.nrm[b]), this.nrm[c]);
    if (dot(fn, vn) < 0) this.idx.push(a, c, b); else this.idx.push(a, b, c);
  }
  // Grid of rows x cols from f(i, j) -> {p, uv}; cols wrap when ring=true. Normals from central differences,
  // flipped to agree with outward(p). Degenerate rows (tips) borrow the neighbouring row's normal.
  grid(rows, cols, f, ring, outward) {
    const P = [];
    for (let i = 0; i < rows; i++) { P.push([]); for (let j = 0; j < cols; j++) P[i].push(f(i, j)); }
    const at = (i, j) => P[Math.max(0, Math.min(rows - 1, i))][ring ? (j + cols) % cols : Math.max(0, Math.min(cols - 1, j))].p;
    const N = [];
    for (let i = 0; i < rows; i++) {
      N.push([]);
      for (let j = 0; j < cols; j++) {
        let n = cross(sub(at(i + 1, j), at(i - 1, j)), sub(at(i, j + 1), at(i, j - 1)));
        if (len(n) < 1e-9) n = N[i - 1]?.[j] ?? cross(sub(at(i + 2, j), at(i, j)), sub(at(i + 1, j + 1), at(i + 1, j - 1)));
        if (dot(n, outward(P[i][j].p)) < 0) n = mul(n, -1);
        N[i].push(norm(n));
      }
    }
    const id = [];
    const cc = ring ? cols + 1 : cols; // duplicate seam column for the UV wrap
    for (let i = 0; i < rows; i++) {
      id.push([]);
      for (let j = 0; j < cc; j++) {
        const jj = j % cols, q = P[i][jj];
        const uv = ring && j === cols ? [q.uvSeam ?? q.uv[0] + SCALE_U, q.uv[1]] : q.uv;
        id[i].push(this.v(q.p, N[i][jj], uv));
      }
    }
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cc - 1; j++) {
      const a = id[i][j], b = id[i][j + 1], c = id[i + 1][j], d = id[i + 1][j + 1];
      if (len(sub(this.pos[a], this.pos[b])) > 1e-7 || len(sub(this.pos[a], this.pos[c])) > 1e-7) this.tri(a, c, b);
      if (len(sub(this.pos[d], this.pos[b])) > 1e-7 || len(sub(this.pos[d], this.pos[c])) > 1e-7) this.tri(b, c, d);
    }
  }
}

// ---- body cross-section: dorsal ridge, flatter belly, belly plate bulge ----
function section(th, z, plateLen) {
  const d = Math.atan2(Math.sin(th), Math.cos(th));            // -pi..pi, 0 = top
  const ridge = 0.07 * gauss(d / 0.22);
  const bellyW = gauss((Math.abs(d) - Math.PI) / 0.85);
  const plate = 0.03 * bellyW * Math.sin(Math.PI * ((z / plateLen) % 1)) ** 2;
  return { x: Math.sin(th) * (1 + ridge * 0.2), y: Math.cos(th) * (1 + ridge) * (Math.cos(th) < 0 ? 0.86 : 1), k: 1 + plate - 0.04 * bellyW };
}
// v coordinate that keeps scales square: dv/dz = SCALE_U / circumference
function vAt(dist) {
  let v = 0;
  for (const b of BODY) {
    const a = Math.max(b.front, Math.min(b.back, dist));
    if (a > b.front) v += (a - b.front) * SCALE_U / (TAU * (b.r0 + b.r1) / 2);
  }
  if (dist > BODY.at(-1).back) v += (dist - BODY.at(-1).back) * SCALE_U / (TAU * 0.4);
  return v;
}

function spike(m, base, dir, h, r, crv = 0.3) {
  // curved cone, base sunk 0.12 into the surface
  const side = norm(cross(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), up2 = norm(cross(side, dir));
  const rows = 6, cols = 10, b0 = sub(base, mul(dir, 0.12));
  m.grid(rows, cols, (i, j) => {
    const u = i / (rows - 1), th = (j / cols) * TAU, rr = r * (1 - u) ** 1.15;
    const c = add(add(b0, mul(dir, (h + 0.12) * u)), mul(up2, -crv * h * u * u));
    return { p: add(c, add(mul(side, Math.cos(th) * rr), mul(up2, Math.sin(th) * rr))), uv: [ivoryU(u), j / cols] };
  }, true, (p) => sub(p, add(b0, mul(dir, dot(sub(p, b0), dir)))));
}

// swept tube through points with radius list (Catmull-ish via linear + subdivision); uvMode 'scale' | 'ivory'
function sweep(m, pts, radii, opt = {}) {
  const cols = opt.cols ?? 14, sub_ = opt.sub ?? 4;
  const P = [], R = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < sub_; k++) {
    const u = k / sub_;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const u2 = u * u, u3 = u2 * u; // uniform Catmull-Rom
    P.push(mul(add(add(mul(p1, 2), mul(sub(p2, p0), u)), add(mul(add(sub(mul(p0, 2), mul(p1, 5)), sub(mul(p2, 4), p3)), u2), mul(add(sub(mul(p1, 3), p0), sub(p3, mul(p2, 3))), u3))), 0.5));
    R.push(radii[i] + (radii[i + 1] - radii[i]) * u);
  }
  P.push(pts.at(-1)); R.push(radii.at(-1));
  let ref = Math.abs(norm(sub(P[1], P[0]))[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const frames = P.map((p, i) => {
    const t = norm(sub(P[Math.min(P.length - 1, i + 1)], P[Math.max(0, i - 1)]));
    const sx = norm(cross(t, ref)), sy = norm(cross(sx, t)); ref = sy; return { t, sx, sy };
  });
  let acc = 0;
  m.grid(P.length, cols, (i, j) => {
    if (i > 0) acc = j === 0 ? acc + len(sub(P[i], P[i - 1])) : acc;
    const th = (j / cols) * TAU, f = frames[i], rr = R[i] * (opt.ring ? 1 + opt.ring * Math.sin(i * 1.7) : 1);
    const p = add(P[i], add(mul(f.sx, Math.cos(th) * rr), mul(f.sy, Math.sin(th) * rr)));
    const uv = opt.ivory ? [ivoryU(i / (P.length - 1)), j / cols] : [(j / cols) * SCALE_U, acc * SCALE_U / (TAU * Math.max(0.15, R[i]))];
    return { p, uv };
  }, true, (p) => { let best = 0, bd = 1e9; P.forEach((q, k) => { const d = len(sub(p, q)); if (d < bd) { bd = d; best = k; } }); return sub(p, P[best]); });
  if (opt.capStart) sphere(m, P[0], R[0] * 0.98, opt.ivory);
}

function sphere(m, c, r, ivory, sc = [1, 1, 1]) {
  m.grid(9, 14, (i, j) => {
    const ph = (i / 8) * Math.PI, th = (j / 14) * TAU;
    const p = add(c, [Math.sin(ph) * Math.sin(th) * r * sc[0], Math.cos(ph) * r * sc[1], Math.sin(ph) * Math.cos(th) * r * sc[2]]);
    return { p, uv: ivory ? [ivoryU(0.2), i / 8] : [(j / 14) * SCALE_U, i / 8 * 0.4] };
  }, true, (p) => sub(p, c));
}

// ---- spine segment ----
function segment(b, idx) {
  const m = new Mesh(b.name, b.name, 'scales');
  const L = b.len, cols = 30, rows = b.name.startsWith('Torso') ? 9 : 7;
  const r = (z) => b.r0 + (b.r1 - b.r0) * (0.5 - 0.5 * Math.cos(Math.PI * z / L));
  const ring = (z, rr, i, j) => {
    const th = (j / cols) * TAU, s = section(th, b.front + z, L);
    return { p: [s.x * rr * s.k, s.y * rr * s.k, z], uv: [(j / cols) * SCALE_U, vAt(b.front + z)] };
  };
  // front dome (sits inside the previous part, fills the joint on bends)
  const capRows = 5;
  m.grid(capRows, cols, (i, j) => {
    const a = (1 - i / (capRows - 1)) * Math.PI / 2;            // pi/2 (tip) -> 0 (rim)
    const q = ring(0, b.r0 * Math.cos(a), i, j);
    q.p[2] = -b.r0 * 0.85 * Math.sin(a);
    q.uv = [q.uv[0], vAt(b.front) - 0.02 * Math.sin(a)];
    return q;
  }, true, (p) => [p[0], p[1], Math.min(0, p[2])]);
  m.grid(rows, cols, (i, j) => ring(L * i / (rows - 1), r(L * i / (rows - 1)) * (1 + 0.025 * Math.sin(Math.PI * i / (rows - 1))), i, j),
    true, (p) => [p[0], p[1], 0]);
  // dorsal spikes: neck 1, torso 2, first 12 tail 1
  const n = b.name.startsWith('Torso') ? 2 : (b.name.startsWith('Neck') || (b.name.startsWith('Tail') && idx <= 12)) ? 1 : 0;
  for (let k = 0; k < n; k++) {
    const z = L * (n === 1 ? 0.45 : 0.25 + 0.5 * k), rr = r(z);
    const along = b.front + z, h = along < 22 ? 0.75 + 0.35 * Math.sin(Math.min(1, along / 22) * Math.PI) : 1.1 * Math.max(0.35, 1 - (along - 22) / 24);
    spike(m, [0, rr * 1.07 - 0.02, z], norm([0, 1, 0.75]), h, 0.16 + 0.12 * h, 0.25);
  }
  return m;
}

// ---- head (loft) + jaw + teeth + horns ----
const HEAD_ST = [ // z, half width, top, bottom, centre y
  [0.0, 0.16, 0.12, 0.08, -0.10], [0.35, 0.36, 0.28, 0.16, -0.06], [1.2, 0.52, 0.42, 0.2, 0.0], [2.2, 0.7, 0.6, 0.24, 0.08],
  [3.2, 0.92, 0.78, 0.3, 0.12], [4.2, 1.0, 0.88, 0.55, 0.05], [5.0, 1.0, 0.95, 0.86, 0.0]];
function headAt(z) {
  let i = 0; while (i < HEAD_ST.length - 2 && HEAD_ST[i + 1][0] < z) i++;
  const a = HEAD_ST[i], b = HEAD_ST[i + 1], u = Math.min(1, Math.max(0, (z - a[0]) / (b[0] - a[0]))), s = 0.5 - 0.5 * Math.cos(Math.PI * u);
  return a.map((v, k) => v + (b[k] - v) * s);
}
function head() {
  const m = new Mesh('Head', 'Head', 'scales'), cols = 32, rows = 22;
  m.grid(rows, cols, (i, j) => {
    const z = 5.0 * (i / (rows - 1)) ** 1.25, [, w, ht, hb, yc] = headAt(z), th = (j / cols) * TAU;
    const brow = 0.1 * gauss((z - 2.4) / 0.5) * gauss((Math.abs(Math.atan2(Math.sin(th), Math.cos(th))) - 0.75) / 0.3);
    const c = Math.cos(th), y = yc + (c >= 0 ? ht * (1 + brow) : hb) * c;
    return { p: [Math.sin(th) * w * (1 + brow * 0.5), y, z], uv: [(j / cols) * SCALE_U, z * SCALE_U / (TAU * 0.6)] };
  }, true, (p) => [p[0], p[1] - headAt(p[2])[4], 0]);
  sphere(m, [0, -0.1, 0.02], 0.12, false, [1.3, 0.8, 1]);       // nose tip cap
  // upper teeth along the lip, fangs at the front
  for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) {
    const z = 0.45 + k * 0.38, [, w, , hb, yc] = headAt(z), h = k === 0 ? 0.32 : 0.2 - k * 0.012;
    spike(m, [sx * w * 0.86, yc - hb * 0.82, z], norm([sx * 0.1, -1, 0.15]), h, 0.06 + h * 0.15, 0.1);
  }
  // brow spikes, horns (ringed, back-swept), cheek horns, crest
  for (const sx of [-1, 1]) {
    spike(m, [sx * 0.5, 0.6, 2.05], norm([sx * 0.4, 1, 0.8]), 0.5, 0.13, 0.25);
    spike(m, [sx * 0.62, 0.55, 2.6], norm([sx * 0.5, 0.9, 0.9]), 0.4, 0.11, 0.25);
    const hb = [sx * 0.52, 0.72, 3.85];
    sweep(m, [hb, add(hb, [sx * 0.22, 0.52, 0.85]), add(hb, [sx * 0.42, 0.78, 1.95]), add(hb, [sx * 0.4, 0.55, 3.05])], [0.3, 0.24, 0.13, 0.02], { ivory: true, ring: 0.06, cols: 12, capStart: true });
    const cb = [sx * 0.88, -0.02, 3.7];
    sweep(m, [cb, add(cb, [sx * 0.25, 0.08, 0.6]), add(cb, [sx * 0.32, 0.05, 1.25])], [0.17, 0.11, 0.02], { ivory: true, cols: 10, capStart: true });
  }
  for (let k = 0; k < 5; k++) { const z = 3.0 + k * 0.45, [, , ht, , yc] = headAt(z); spike(m, [0, yc + ht - 0.02, z], norm([0, 1, 0.9]), 0.32 + 0.05 * k, 0.12, 0.2); }
  return m;
}
export const JAW_HINGE = [0, -0.18, 4.15];
function jaw() {
  const m = new Mesh('Jaw', 'Head', 'scales'), cols = 18, rows = 14;
  m.grid(rows, cols, (i, j) => {
    const z = 0.3 + 4.0 * i / (rows - 1), [, w, , hb, yc] = headAt(z), th = Math.PI / 2 + (j / (cols - 1)) * Math.PI; // under-half
    const top = yc - hb * 0.85, depth = 0.18 + 0.32 * Math.min(1, z / 3.5);
    return { p: [Math.sin(th) * -w * 0.9, top + Math.cos(th) * depth, z], uv: [0.25 + (j / cols) * 0.3, z * SCALE_U / (TAU * 0.5)] };
  }, false, (p) => [p[0], p[1] + 0.2, 0]);
  // flat top (inside of mouth) closes the trough
  m.grid(rows, 2, (i, j) => { const z = 0.3 + 4.0 * i / (rows - 1), [, w, , hb, yc] = headAt(z); return { p: [(j ? 1 : -1) * w * 0.9, yc - hb * 0.85, z], uv: [0.4, 0.1] }; }, false, () => [0, 1, 0]);
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) {
    const z = 0.55 + k * 0.42, [, w, , hb, yc] = headAt(z), h = k === 0 ? 0.26 : 0.16;
    spike(m, [sx * w * 0.8, yc - hb * 0.85, z], norm([sx * 0.08, 1, 0.1]), h, 0.05 + h * 0.15, 0.08);
  }
  return m;
}
function eye(sx) {
  const m = new Mesh(sx > 0 ? 'EyeR' : 'EyeL', 'Head', 'eye'), z = 2.3, [, w, ht, , yc] = headAt(z);
  sphere(m, [sx * w * 0.8, yc + ht * 0.42, z], 0.2, false, [0.9, 0.75, 1.6]);
  return m;
}

// ---- wings (right side; left mirrors x). Coordinates in TorsoSeg2 local. ----
export const WING_PTS = {
  S: [1.3, 0.9, 0.4], B: [1.1, 0.5, 4.6], E: [5.8, 1.3, -1.6], W: [11.4, 1.8, -0.4],
  F1: [17.0, 2.0, 2.2], F2: [15.4, 1.6, 7.6], F3: [11.0, 1.3, 10.6], X: [5.6, 1.0, 7.2],
};
const mir = (p, sx) => [p[0] * sx, p[1], p[2]];
function membrane(m, tris, sx, sagSet) {
  // each tri subdivided n x n; sag pulls the panel down between bones; double-sided with 0.1 thickness
  const n = 6, up = [0, 1, 0];
  for (const [ti, [a, b, c]] of tris.entries()) {
    const sag = sagSet.has(ti) ? 0.55 * len(sub(b, c)) / 6 : 0;
    const P = (i, j) => { // i along a->b, j along a->c (barycentric)
      const wb = i / n, wc = j / n, wa = 1 - wb - wc;
      const p = add(add(mul(a, wa), mul(b, wb)), mul(c, wc));
      return add(p, mul(up, -sag * 4 * wb * wc));
    };
    for (const side of [1, -1]) {
      const base = m.pos.length, idmap = {};
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
        const p = P(i, j), du = sub(P(Math.min(n, i + 1), j), P(Math.max(0, i - 1), j)), dv = sub(P(i, Math.min(n, j + 1)), P(i, Math.max(0, j - 1)));
        let nn = norm(cross(du, dv)); if (dot(nn, up) < 0) nn = mul(nn, -1); nn = mul(nn, side);
        idmap[i + ',' + j] = m.v(add(p, mul(nn, 0.05)), nn, [p[0] * sx / 18, p[2] / 12 + 0.2]);
      }
      for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
        m.tri(idmap[i + ',' + j], idmap[(i + 1) + ',' + j], idmap[i + ',' + (j + 1)]);
        if (j < n - i - 1) m.tri(idmap[(i + 1) + ',' + j], idmap[(i + 1) + ',' + (j + 1)], idmap[i + ',' + (j + 1)]);
      }
      void base;
    }
  }
}
function wing(sx) {
  const s = sx > 0 ? 'R' : 'L', W = Object.fromEntries(Object.entries(WING_PTS).map(([k, p]) => [k, mir(p, sx)]));
  const toward = (p, q, f) => add(p, mul(sub(q, p), f));
  const scal = (p, q, f) => toward(add(mul(p, 0.5), mul(q, 0.5)), W.W, f);
  const m12 = scal(W.F1, W.F2, 0.22), m23 = scal(W.F2, W.F3, 0.22), m3x = scal(W.F3, W.X, 0.18), mxb = toward(add(mul(W.X, 0.5), mul(W.B, 0.5)), W.S, 0.18);
  const innerBone = new Mesh(`Wing${s}Inner`, 'TorsoSeg2', 'scales');
  sphere(innerBone, W.S, 0.6, false);
  sweep(innerBone, [W.S, toward(W.S, W.E, 0.5), W.E], [0.46, 0.36, 0.33], { cols: 14 });
  const innerMem = new Mesh(`Wing${s}InnerMem`, 'TorsoSeg2', 'membrane');
  membrane(innerMem, [[W.S, W.E, W.X], [W.S, W.X, mxb], [W.S, mxb, W.B]], sx, new Set([1, 2]));
  const outerBone = new Mesh(`Wing${s}Outer`, 'TorsoSeg2', 'scales');
  sphere(outerBone, W.E, 0.4, false);
  sweep(outerBone, [W.E, toward(W.E, W.W, 0.5), W.W], [0.33, 0.27, 0.25], { cols: 14 });
  sphere(outerBone, W.W, 0.32, false);
  const bow = (a, b, k) => add(toward(a, b, 0.5), [0, 0.15, -k]);
  sweep(outerBone, [W.W, bow(W.W, W.F1, 0.35), W.F1], [0.22, 0.14, 0.04], { cols: 10 });
  sweep(outerBone, [W.W, bow(W.W, W.F2, 0.25), W.F2], [0.19, 0.12, 0.04], { cols: 10 });
  sweep(outerBone, [W.W, bow(W.W, W.F3, 0.2), W.F3], [0.17, 0.11, 0.04], { cols: 10 });
  sweep(outerBone, [W.W, add(W.W, [sx * 0.15, 0.35, -0.6]), add(W.W, [sx * 0.2, 0.25, -1.25])], [0.15, 0.09, 0.01], { cols: 10, ivory: true }); // thumb claw
  const outerMem = new Mesh(`Wing${s}OuterMem`, 'TorsoSeg2', 'membrane');
  membrane(outerMem, [[W.W, W.F1, m12], [W.W, m12, W.F2], [W.W, W.F2, m23], [W.W, m23, W.F3], [W.W, W.F3, m3x], [W.W, m3x, W.X], [W.W, W.X, W.E]], sx, new Set([0, 1, 2, 3, 4, 5]));
  return [innerBone, innerMem, outerBone, outerMem];
}

// ---- legs (tucked), TorsoSeg4 local ----
function leg(sx) {
  const m = new Mesh(sx > 0 ? 'LegR' : 'LegL', 'TorsoSeg4', 'scales');
  const H = [sx * 1.25, -0.85, 1.0], K = [sx * 1.6, -1.85, 2.7], A = [sx * 1.35, -1.55, 4.9], F = [sx * 1.3, -1.7, 6.1];
  sphere(m, H, 0.78, false);
  sweep(m, [H, add(mul(H, 0.5), mul(K, 0.5)), K], [0.68, 0.58, 0.42], { cols: 16 });
  sphere(m, K, 0.42, false);
  sweep(m, [K, add(mul(K, 0.5), mul(A, 0.5)), A], [0.38, 0.3, 0.25], { cols: 14 });
  sweep(m, [A, F], [0.25, 0.2], { cols: 12, capStart: true });
  for (const dx of [-0.28, 0, 0.28]) sweep(m, [F, add(F, [sx * dx * 0.6 + dx, -0.15, 0.55]), add(F, [dx * 1.2, -0.6, 0.85])], [0.13, 0.08, 0.01], { cols: 10, ivory: true });
  return m;
}

// ---- tail blade (TailBlade anchor: front joint at origin) ----
function tailBlade() {
  const m = new Mesh('TailBlade', 'TailBlade', 'scales'), cols = 24, rows = 14, L = TAIL_BLADE, r0 = BODY.at(-1).r1;
  m.grid(4, cols, (i, j) => { const a = (1 - i / 3) * Math.PI / 2, th = (j / cols) * TAU; return { p: [Math.sin(th) * r0 * Math.cos(a), Math.cos(th) * r0 * Math.cos(a), -r0 * 0.85 * Math.sin(a)], uv: [(j / cols) * SCALE_U, vAt(BODY.at(-1).back)] }; }, true, (p) => [p[0], p[1], 0]);
  m.grid(rows, cols, (i, j) => {
    const z = L * i / (rows - 1), u = z / L, th = (j / cols) * TAU;
    const w = Math.max(r0, 1.35 * Math.sin(Math.PI * Math.min(1, u / 0.42) / 2) * (u < 0.42 ? 1 : (1 - u) / 0.58)) * (i === rows - 1 ? 0 : 1);
    const t = Math.max(0.04, r0 * (1 - u) + 0.05) * (i === rows - 1 ? 0 : 1);
    const edge = Math.abs(Math.sin(th)) ** 4;
    return { p: [Math.sin(th) * Math.max(w, 0.0), Math.cos(th) * t, z], uv: edge > 0.8 ? [ivoryU(0.6), u] : [(j / cols) * SCALE_U, vAt(BODY.at(-1).back + z)], uvSeam: SCALE_U };
  }, true, (p) => [p[0], p[1], 0]);
  for (const sx of [-1, 1]) sweep(m, [[sx * 0.5, 0, 0.9], [sx * 1.05, 0.02, 1.5], [sx * 1.35, 0, 2.3]], [0.12, 0.08, 0.01], { ivory: true, cols: 8 });
  return m;
}

export function build() {
  const parts = [head(), jaw(), eye(-1), eye(1)];
  BODY.forEach((b, i) => { if (i > 0) parts.push(segment(b, i - 9)); });
  parts.push(tailBlade(), ...wing(1), ...wing(-1), leg(1), leg(-1));
  for (const p of parts) {
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const q of p.pos) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q[k]); hi[k] = Math.max(hi[k], q[k]); }
    p.center = mul(add(lo, hi), 0.5); p.size = sub(hi, lo); p.tris = p.idx.length / 3;
  }
  return parts;
}
// Rest (straight) offset of each anchor along +Z, for the GLB layout.
export const ANCHOR_REST = Object.fromEntries([...BODY.map((b) => [b.name, b.front]), ['TailBlade', BODY.at(-1).back]]);
