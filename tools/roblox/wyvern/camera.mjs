// Cinematic camera bake: clock -> story warp, camera pos/look/fov, flash and shake tables (one per clock sample).
// Same tables feed the Luau (gen-luau.mjs), the preview and test/sim.mjs. Spec: CAMERA in spec.mjs.
import { TUNE, CAMERA } from './spec.mjs';
import { pose, timeLookup, at, smooth, V } from './motion.mjs';

const C = CAMERA;
const { add, sub, mul, len } = V;
const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (u) => Math.min(1, Math.max(0, u));

// CSS cubic-bezier(x1,y1,x2,y2): solve x(t)=u by bisection, return y(t).
export function bez([x1, y1, x2, y2], u) {
  u = clamp01(u);
  const f = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (f(m, x1, x2) < u) lo = m; else hi = m; }
  return f((lo + hi) / 2, y1, y2);
}

const torsoAt = (B, t) => pose(B, t).parts.find((q) => q.name === 'TorsoSeg2').pos;

export function bakeCamera(B) {
  const T = TUNE.LOOP_LEN, DT = B.DT, NT = B.NT;
  // Payoff = story time where the flare channel peaks at the head.
  let tPay = 0, best = -1;
  for (let t = 0; t < T; t += 1 / 240) { const v = at(B, B.flare, timeLookup(B, B.sOfT, t, B.L), false); if (v > best) { best = v; tPay = t; } }

  // Story speed factor f(t): 1 -> slow into the payoff, back to 1 after it. Clock = integral of 1/(k f) + the hit-stop hold.
  const H = C.holdFrames / C.fps;
  const g = (t) => (t < tPay ? smooth((t - (tPay - 1.0)) / 1.0) : 1 - smooth((t - tPay) / C.slowOut));
  const f = (t) => 1 - (1 - C.slow) * g(t);
  const M = 9600, h = T / M, raw = [0];
  for (let i = 0; i < M; i++) raw.push(raw[i] + h * 0.5 * (1 / f(i * h) + 1 / f((i + 1) * h)));
  const k = raw[M] / (T - H);                       // clock total = raw/k + H = T exactly
  const iPay = Math.round(tPay / h); tPay = iPay * h; // snap so the hold sits on a grid point
  const clock = raw.map((v, i) => v / k + (i > iPay ? H : 0));
  const cPay = clock[iPay];

  // Invert: story time per clock sample (linear between fine grid points; flat during the hold).
  const warp = [];
  let j = 0;
  for (let q = 0; q <= NT; q++) {
    const c = q * DT;
    if (c >= cPay && c <= cPay + H) { warp.push(tPay); continue; }
    while (j < M - 1 && clock[j + 1] < c) j++;
    const c0 = clock[j], c1 = clock[j + 1] - (j === iPay ? H : 0);
    const cc = j === iPay ? c - H : c;              // the segment right after the hold resumes at cPay + H
    warp.push(Math.min(T, lerp(j * h, (j + 1) * h, clamp01((cc - c0) / Math.max(1e-12, c1 - c0)))));
  }
  warp[NT] = T;

  // Push curve p(c) on clock time.
  const c0 = cPay - C.build, c1 = cPay + H + C.hold;
  const push = (c) => {
    if (c < c0) return 0;
    if (c < cPay) return bez(C.pushEase, (c - c0) / C.build);
    if (c < c1) return 1 + C.holdDrift * smooth((c - cPay) / (c1 - cPay));
    return (1 + C.holdDrift) * (1 - bez(C.revealEase, (c - c1) / C.reveal));
  };
  const focus = torsoAt(B, tPay);
  const phi = Math.atan2(focus[0], focus[2]);        // payoff camera sits outside the wyvern, 25 deg round, player behind it
  const th0 = phi + 25 * Math.PI / 180 + 2 * Math.PI * cPay / T;
  const cF = Math.ceil(cPay / DT - 1e-9) * DT;       // flash/shake keyed on the first clock sample of the hit-stop, so the peak is a sample
  const flashAt = (c) => {
    const d = c - cF, fr = 1 / C.fps;
    if (d < -C.holdFrames * fr || d > 3) return 0;
    if (d <= 0) return C.dip * (d + C.holdFrames * fr) / (C.holdFrames * fr);
    if (d <= fr) return lerp(C.dip, C.flash, d / fr);
    return C.flash * Math.exp(-3 * (d - fr) / C.flashDecay);
  };

  const pos = [], look = [], fov = [], flash = [], shake = [], pushK = [];
  for (let q = 0; q <= NT; q++) {
    const c = q * DT, th = th0 - 2 * Math.PI * c / T;
    const base = [Math.sin(th) * C.radius, C.height + C.heightAmp * Math.sin(2 * Math.PI * C.heightCycles * c / T), Math.cos(th) * C.radius];
    const p = push(c), pc = clamp01(p);
    const P = add(base, mul(sub(focus, base), C.push * p));
    const baseLook = mul(torsoAt(B, warp[q]), 1 - C.lookPlayer);
    pos.push(P);
    look.push(add(baseLook, mul(sub(focus, baseLook), pc)));
    fov.push(C.fov * (1 - (1 - C.fovK) * pc));
    flash.push(flashAt(c));
    shake.push(c >= cF + 1 / C.fps - 1e-9 ? C.shake * len(sub(P, focus)) * Math.exp(-3 * (c - cF - 1 / C.fps) / C.shakeDecay) : 0);
    pushK.push(p);
  }
  return { tPay, cPay, cF, H, k, warp, pos, look, fov, flash, shake, push: pushK, focus };
}

// Lookups on clock time c: Catmull-Rom for smooth channels (pos/look/fov), linear for warp/flash/shake (keeps peaks and the hold exact).
export function camLinear(B, arr, c, period = 0) {
  const T = TUNE.LOOP_LEN, x = (((c % T) + T) % T) / B.DT, i = Math.floor(x), u = x - i;
  const a = arr[i], b = i + 1 <= B.NT ? arr[i + 1] : arr[1] + period;
  return a + (b - a) * u;
}
const axes = new WeakMap();                          // per-axis copies, built once per table
export function camVec(B, arr, c) {
  if (!axes.has(arr)) axes.set(arr, [0, 1, 2].map((k) => arr.map((v) => v[k])));
  return axes.get(arr).map((a) => timeLookup(B, a, c, 0));
}
export const storyTime = (B, cam, c) => camLinear(B, cam.warp, c, TUNE.LOOP_LEN);
