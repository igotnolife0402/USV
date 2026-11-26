// Bakes the closed head path, speed, frames and channels from spec.mjs, and poses the body at any time.
// Pure math, no deps: the preview, tests and gen-luau all use this so every output matches.
import { TUNE, BODY, TAIL_BLADE, MOVES, MOVE_FX } from './spec.mjs';

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, u) => a + (b - a) * u;
const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const rotAxis = (v, k, ang) => { // Rodrigues
  const c = Math.cos(ang), s = Math.sin(ang);
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
};
export const V = { add, sub, mul, dot, cross, len, norm, lerp3, rotAxis };
export const smooth = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));

// Centripetal Catmull-Rom on a closed list.
function catmull(P, n) {
  const out = [], tag = [], N = P.length;
  for (let i = 0; i < N; i++) {
    const p0 = P[(i - 1 + N) % N].p, p1 = P[i].p, p2 = P[(i + 1) % N].p, p3 = P[(i + 2) % N].p;
    const t01 = Math.pow(len(sub(p1, p0)), 0.5), t12 = Math.pow(len(sub(p2, p1)), 0.5), t23 = Math.pow(len(sub(p3, p2)), 0.5);
    const m1 = mul(add(sub(p2, p1), mul(sub(mul(sub(p1, p0), 1 / t01), mul(sub(p2, p0), 1 / (t01 + t12))), t12)), 1);
    const m2 = mul(add(sub(p2, p1), mul(sub(mul(sub(p3, p2), 1 / t23), mul(sub(p3, p1), 1 / (t12 + t23))), t12)), 1);
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      out.push(add(add(mul(p1, h00), mul(m1, h10)), add(mul(p2, h01), mul(m2, h11))));
      tag.push(P[i].move);
    }
  }
  return { out, tag };
}

// Resample a closed polyline at uniform arc length.
function resample(pts, tags, step) {
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) cum.push(cum[i - 1] + len(sub(pts[i % pts.length], pts[i - 1])));
  const L = cum.at(-1), n = Math.round(L / step), ds = L / n, P = [], T = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = k * ds;
    while (cum[j + 1] < s) j++;
    const u = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    P.push(lerp3(pts[j], pts[(j + 1) % pts.length], u)); T.push(tags[j]);
  }
  return { P, T, ds, L };
}

// Closed-loop box blur, repeated: removes kinks so curvature (and banking) is smooth.
function blurClosed(arr, rad, passes, isVec) {
  let a = arr;
  for (let p = 0; p < passes; p++) {
    const n = a.length, b = new Array(n);
    for (let i = 0; i < n; i++) {
      let acc = isVec ? [0, 0, 0] : 0;
      for (let k = -rad; k <= rad; k++) { const v = a[(i + k + n) % n]; acc = isVec ? add(acc, v) : acc + v; }
      b[i] = isVec ? mul(acc, 1 / (2 * rad + 1)) : acc / (2 * rad + 1);
    }
    a = b;
  }
  return a;
}

export function bake() {
  const ctrl = [];
  MOVES.forEach((m, mi) => m.pts.forEach((p) => ctrl.push({ p, move: mi })));
  const cr = catmull(ctrl, 24);
  let r = resample(cr.out, cr.tag, 0.25);
  const sm = blurClosed(r.P, 6, 3, true);               // ~±4.5 stud smoothing
  r = resample(sm, r.T, TUNE.SAMPLE);
  const { P, T: tags, ds, L } = r, n = P.length;

  // Channels per sample, then blurred so every change ramps (sine-like after 3 box passes).
  const ch = (f) => blurClosed(tags.map((t) => f(MOVE_FX[MOVES[t].name], MOVES[t])), 6, 3, false);
  const mlen = MOVES.map((_, mi) => tags.filter((t) => t === mi).length * ds);
  let speed = ch((fx, m) => mlen[MOVES.indexOf(m)] / m.dur);
  const dash = ch((fx) => fx.dash || 0), flare = ch((fx) => fx.flare || 0), loopW = ch((fx) => fx.loop || 0);
  const fold = ch((fx) => (fx.wings === 'fold' ? 1 : 0)), spread = ch((fx) => (fx.wings === 'spread' ? 1 : 0));
  const glideW = ch((fx) => (fx.wings === 'glide' ? 1 : 0)), flapHz = ch((fx) => fx.flapHz || 1.2);

  // Normalise speed so one lap of the path takes LOOP_LEN.
  let T0 = 0; for (let i = 0; i < n; i++) T0 += ds / speed[i];
  const k = T0 / TUNE.LOOP_LEN; speed = speed.map((v) => v * k);
  const tAt = [0]; for (let i = 0; i < n; i++) tAt.push(tAt[i] + ds / speed[i]); // tAt[n] = LOOP_LEN

  // Barrel roll: extra roll as a function of s across the 'roll' move (body inherits it as it passes).
  const rollIdx = MOVES.findIndex((m) => m.name === 'roll');
  const rIs = tags.map((t, i) => (t === rollIdx ? i : -1)).filter((i) => i >= 0);
  const r0 = rIs[0], r1 = rIs.at(-1);
  const rollX = P.map((_, i) => (i >= r0 && i <= r1 ? smooth((i - r0) / (r1 - r0)) * MOVE_FX.roll.roll * Math.PI / 180 : 0));

  // Frames: tangent, lift-based up (centripetal + gravity), clamped bank outside the loop.
  const Tn = P.map((_, i) => norm(sub(P[(i + 1) % n], P[(i - 1 + n) % n])));
  const up = [];
  let prevRef = [0, 1, 0];
  for (let i = 0; i < n; i++) {
    const t = Tn[i], kap = mul(sub(Tn[(i + 1) % n], Tn[(i - 1 + n) % n]), 1 / (2 * ds)); // curvature vector
    const lift = add(mul(kap, speed[i] * speed[i]), [0, TUNE.G, 0]);
    let ref = sub([0, 1, 0], mul(t, t[1]));
    ref = len(ref) < 0.2 ? prevRef : norm(ref); prevRef = ref;
    let liftUp = sub(lift, mul(t, dot(lift, t)));
    liftUp = len(liftUp) < 1e-3 ? ref : norm(liftUp);
    // signed bank angle from ref to liftUp about t
    let ang = Math.atan2(dot(cross(ref, liftUp), t), dot(ref, liftUp));
    const max = TUNE.BANK_MAX * Math.PI / 180;
    const clamped = Math.max(-max, Math.min(max, ang));
    ang = lerp(clamped, ang, loopW[i]);
    up.push(rotAxis(ref, t, ang));
  }
  let upS = blurClosed(up, 3, 3, true).map((u, i) => norm(sub(u, mul(Tn[i], dot(u, Tn[i])))));
  upS = upS.map((u, i) => rotAxis(u, Tn[i], rollX[i]));

  // Wing flap phase over time, scaled to a whole number of cycles per loop (seamless).
  const DT = TUNE.BAKE_DT, NT = Math.round(TUNE.LOOP_LEN / DT);
  const sOfT = [], phase = [];
  let j = 0, ph = 0;
  for (let q = 0; q <= NT; q++) {
    const t = q * DT;
    while (j < n - 1 && tAt[j + 1] <= t) j++;
    const u = (t - tAt[j]) / (tAt[j + 1] - tAt[j]);
    sOfT.push((j + u) * ds);
    phase.push(ph);
    ph += 2 * Math.PI * flapHz[j] * (1 - fold[j]) * DT;
  }
  const cycles = Math.max(1, Math.round(ph / (2 * Math.PI)));
  const phK = (cycles * 2 * Math.PI) / ph;
  for (let q = 0; q <= NT; q++) phase[q] *= phK;

  return { n, ds, L, P, up: upS, tan: Tn, speed, dash, flare, fold, spread, glideW, loopW, sOfT, phase, DT, NT, cycles, moves: MOVES.map((m) => m.name), tags };
}

// Catmull-Rom sample of a closed per-stud array at arc length s (C1, so no kinks between samples).
const cr1 = (a, b, c, d, u) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
export function at(B, arr, s, isVec) {
  const x = (((s % B.L) + B.L) % B.L) / B.ds, i = Math.floor(x) % B.n, u = x - Math.floor(x), n = B.n;
  const a = arr[(i - 1 + n) % n], b = arr[i], c = arr[(i + 1) % n], d = arr[(i + 2) % n];
  return isVec ? [0, 1, 2].map((k) => cr1(a[k], b[k], c[k], d[k], u)) : cr1(a, b, c, d, u);
}
// Catmull-Rom on a time table of NT+1 samples over one loop; period = value gained per loop (L for s, 2pi*cycles for phase).
export function timeLookup(B, arr, t, period = 0) {
  const T = TUNE.LOOP_LEN, x = (((t % T) + T) % T) / B.DT, i = Math.floor(x), u = x - i, N = B.NT;
  const g = (k) => (k < 0 ? arr[k + N] - period : k > N ? arr[k - N] + period : arr[k]);
  return cr1(g(i - 1), g(i), g(i + 1), g(i + 2), u);
}
// Tail sway: lateral offset by distance from the nose; zero up to the hips, 1.1 stud at the tip.
const SWAY_CYCLES = 8;
function sway(dist, t) {
  const a = smooth((dist - 15) / (BODY.at(-1).back + TAIL_BLADE - 15)) * 1.1;
  return a * Math.sin(2 * Math.PI * SWAY_CYCLES * t / TUNE.LOOP_LEN - dist * 0.16);
}
export function joint(B, sHead, dist, t) {
  const s = sHead - dist, p = at(B, B.P, s, true), up = norm(at(B, B.up, s, true)), tan = norm(at(B, B.tan, s, true));
  const side = norm(cross(tan, up));
  return { p: add(p, mul(side, sway(dist, t))), up };
}

// Pose at time t: each part -> { name, pos (front joint), look (unit, toward the nose), up }.
export function pose(B, t) {
  const sHead = timeLookup(B, B.sOfT, t, B.L);
  const chain = [...BODY.map((b) => ({ name: b.name, front: b.front, back: b.back })), { name: 'TailBlade', front: BODY.at(-1).back, back: BODY.at(-1).back + TAIL_BLADE }];
  const parts = chain.map((c) => {
    const f = joint(B, sHead, c.front, t), b = joint(B, sHead, c.back, t);
    const look = norm(sub(f.p, b.p));
    const up = norm(sub(add(f.up, b.up), mul(look, dot(add(f.up, b.up), look))));
    return { name: c.name, pos: f.p, back: b.p, look, up };
  });
  const ch = (arr) => at(B, arr, sHead, false);
  const ph = timeLookup(B, B.phase, t, B.cycles * 2 * Math.PI);
  return { t, sHead, parts, dash: ch(B.dash), flare: ch(B.flare), fold: ch(B.fold), spread: ch(B.spread), glide: ch(B.glideW), phase: ph, speed: ch(B.speed) };
}

// ---- wings + jaw (angles in radians; + = raise for inner, + = fold up/over for outer) ----
const D = Math.PI / 180;
export function wingAngles(p) {
  const amp = (32 - 28 * p.glide) * (1 - p.spread) + 3 * p.spread;
  const bias = 4 + 12 * p.spread;
  let inner = (bias + amp * Math.sin(p.phase)) * D;
  let outer = 0.45 * amp * Math.sin(p.phase - 0.9) * D - 6 * p.spread * D;
  inner = inner + (-70 * D - inner) * p.fold;
  outer = outer + (155 * D - outer) * p.fold;
  return { inner, outer };
}
export const jawAngle = (p) => (28 * p.flare + 2 + 2 * Math.sin(p.t * Math.PI / 2)) * D;

// Axes in TorsoSeg2 local for side sx (+1 right, -1 left): inner flaps about S->B, outer folds about E->X.
// Signs chosen so a positive angle lifts the wrist (W) upward.
export function wingAxes(WP, sx) {
  const m = (q) => [q[0] * sx, q[1], q[2]];
  const S = m(WP.S), B = m(WP.B), E = m(WP.E), X = m(WP.X), W = m(WP.W);
  let ki = norm(sub(B, S)), ko = norm(sub(X, E));
  if (rotAxis(sub(W, S), ki, 0.1)[1] < sub(W, S)[1]) ki = mul(ki, -1);
  if (rotAxis(sub(W, E), ko, 0.1)[1] < sub(W, E)[1]) ko = mul(ko, -1);
  return { S, E, ki, ko };
}
