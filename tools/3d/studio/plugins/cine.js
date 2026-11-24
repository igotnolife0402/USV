// Cinematic baseline pass (2026-11-24). The owner's reference clips (outshot darts, confetti cannon, Shenron loop, combo14),
// measured frame by frame, all share one shape: a slow eased push-in that speeds up into the payoff, time slowing down
// under it, a short dark dip right before a white flash, a frozen frame, a decaying shake, then a pull-back that settles
// but never fully stops. cinePass() writes that shape onto any clip in one call so it is the floor, not extra work.
// Numbers and the measurements behind them: domains/animation/cinematic-baseline.md. Pure (no DOM): cli and tests share it.
import { sample } from './sample.js'

// build: s of suspense before the payoff; push: share of the camera distance closed by the payoff; fov: fov factor at the
// payoff; slow: slowest warp slope; hold: hit-stop frames (story frozen); flash: white peak; dip: dark dip before it;
// shake: amplitude as a share of the camera distance; back: camera distance after the pull-back (share of the start);
// steps: escalating rumble steps during the build (confetti: 4 brightness steps 0.5 s apart).
export const CINE = {
  impact: { build: 1.6, push: 0.45, fov: 0.82, slow: 0.3, hold: 4, flash: 0.85, dip: 0.12, decay: 0.35, shake: 0.03, back: 0.9, steps: 0 },
  burst: { build: 2.5, push: 0.3, fov: 0.86, slow: 0.35, hold: 3, flash: 0.95, dip: 0.15, decay: 0.3, shake: 0.045, back: 1.1, steps: 4 },
  loop: { sweep: 360, keys: 16 }
}
const clone = o => o == null ? o : JSON.parse(JSON.stringify(o))
const r4 = v => Math.round(v * 1e4) / 1e4
const at = (F, P, k) => P.map((v, i) => r4(F[i] + (v - F[i]) * k))
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const num = ks => ks.map(q => [q[0], [+q[1]], q[2]])

// The camera at story time t: the clip's own camera keys, else the view the user framed.
function camState(cam, t, view) {
  const s = { pos: view.pos, target: view.target, fov: view.fov ?? 50 }
  if (cam?.pos?.length) s.pos = sample(cam.pos, t, 'pos')
  if (cam?.target?.length) s.target = sample(cam.target, t, 'pos')
  if (cam?.fov?.length) s.fov = sample(num(cam.fov), t, 'pos')[0]
  if (!s.pos || !s.target) throw new Error('cine needs a camera: frame the shot (or key the camera) first')
  return s
}
// Replace a channel's keys inside [t0, t1] with new ones; keys outside the window are the clip's own and stay.
function put(cam, ch, keys, t0, t1) {
  const kept = (cam[ch] || []).filter(k => k[0] < t0 - 1e-4 || k[0] > t1 + 1e-4)
  cam[ch] = [...kept, ...keys].sort((a, b) => a[0] - b[0])
}

// c = clip, o = {payoff, build?, kind?, focus?, sweep?, reframe?, off?}, view = {pos, target, fov} of the viewport (used on the
// first run, or again with reframe: true). Returns the new clip.
// Idempotent: the clip's pre-cine camera, warp and length live in c.cine.base and are restored before every run.
export function cinePass(c, o = {}, view = {}) {
  const base = clone(c.cine?.base) || { camera: clone(c.camera) ?? null, warp: clone(c.warp) ?? null, len: c.len }
  // The framing is kept with the base: on a re-run the viewport shows the clip's cine camera, not the shot the user framed.
  if (!c.cine || o.reframe) base.view = view.pos && view.target ? { pos: view.pos, target: view.target, fov: view.fov ?? 50 } : base.view || {}
  view = base.view || view
  const next = clone(c)
  next.len = base.len
  if (base.camera) next.camera = clone(base.camera); else delete next.camera
  if (base.warp) next.warp = clone(base.warp); else delete next.warp
  delete next.cine
  if (o.off) return next
  const kind = o.kind || 'impact'
  if (!CINE[kind]) throw new Error(`cine kind is impact, burst or loop (got ${kind})`)
  // Any preset number can be overridden per clip (2026-11-24 duel: a shot that starts close pushed 45 % into an occluding arm;
  // push 0.2 kept both fighters in frame).
  const K = { ...CINE[kind] }
  for (const k of Object.keys(K)) if (k !== 'build' && Number.isFinite(+o[k]) && o[k] !== null && o[k] !== '') K[k] = +o[k]
  const len = +base.len || 2, fps = +c.fps || 30, cam = next.camera ||= {}
  if (kind === 'loop') return loopPass(next, K, o, view, base)

  const p = +o.payoff
  if (!(p > 0 && p < len)) throw new Error(`cine payoff must be inside the clip (0..${len} s), got ${o.payoff}`)
  const b = Math.min(+o.build || K.build, p), T0 = r4(p - b)
  const s0 = camState(base.camera, T0, view), F = o.focus || s0.target, P0 = s0.pos, d = dist(P0, F), f0 = s0.fov
  const tEnd = len, A = r4(K.shake * d), rem = len - p, hold = r4(Math.min(0.5, rem * 0.4)), th = r4(p + hold), reveal = rem - hold >= 1
  const Pin = at(F, P0, 1 - K.push), Phold = at(F, P0, (1 - K.push) * 0.97), Pback = at(F, P0, K.back), fin = r4(f0 * K.fov)
  // Push-in: creeps, then accelerates into the payoff (cubic ease-in with a fast end). After the flash the camera stays on
  // the close-up and keeps drifting in (outshot holds the board ~1 s), then reveals with a long eased pull-back.
  // Measured 2026-11-24: an instant pull-back under the flash read as a jump cut (frame 56 -> 57 of the 12 fps sheet), and a
  // 0.6 s reveal on a steep ease halved the subject in one frame; the reveal needs >= 1 s and an even in-out ease.
  const EV = 'cubic:0.42,0,0.58,1'
  put(cam, 'pos', [[T0, P0, 'cubic:0.4,0,0.9,0.6'], [p, Pin, 'out'], [th, Phold, EV], [tEnd, reveal ? Pback : at(F, P0, (1 - K.push) * 0.95)]], T0, tEnd)
  put(cam, 'target', [[T0, F, 'smooth'], [tEnd, F]], T0, tEnd)
  put(cam, 'fov', [[T0, f0, 'cubic:0.4,0,0.9,0.6'], [p, fin, 'out'], [th, r4(fin * 0.98), EV], [tEnd, reveal ? f0 : r4(fin * 0.96)]], T0, tEnd)
  // Shake: nothing during the build for an impact; a burst rumbles in escalating steps; both kick on the payoff and decay.
  const sh = [[T0, 0, 'step']]
  for (let i = 1; i <= K.steps; i++) sh.push([r4(T0 + b * i / (K.steps + 1)), r4(A * 0.12 * i), 'step'])
  sh.push([p, A, 'out'], [r4(Math.min(tEnd, p + 0.4)), 0])
  put(cam, 'shake', sh, T0, tEnd)
  // Flash: a dark dip over the last ~4 frames (both refs dim before the flash), a white peak held by the hit-stop, fast decay.
  const dipT = r4(p - 4 / fps)
  put(cam, 'flash', [[r4(Math.max(T0, dipT - 2 / fps)), 0, 'in'], [dipT, -K.dip, 'linear'], [r4(p - 0.5 / fps), -K.dip, 'linear'], [p, K.flash, 'out'], [r4(Math.min(tEnd, p + K.decay)), 0]], T0, tEnd)

  // Warp (clip time -> story time): speed 1 -> 0.6 -> slow into the payoff, frozen for `hold` frames, 0.5 back up to 1.
  // A clip that already has its own warp keeps it (two time remaps would fight): reported in cine.warp.
  let warp = 'kept'
  if (!base.warp?.length) {
    const a = p - 0.55 * b, m = a + 0.15 * b, q = Math.min(len, p + 0.25), w = [[0, 0]]
    let ct = 0, st = 0
    const seg = (s1, slope) => { if (s1 <= st + 1e-6) return; ct += (s1 - st) / slope; st = s1; w.push([r4(ct), r4(st)]) }
    seg(a, 1); seg(m, 0.6); seg(p, K.slow)
    ct += K.hold / fps; w.push([r4(ct), r4(p)])
    seg(q, 0.5); seg(len, 1)
    next.warp = w; next.len = r4(ct); warp = 'cine'
  }
  next.cine = { kind, payoff: p, build: b, warp, base }
  return next
}

// Loop: one full orbit around the subject at an even speed, keyed with neighbours past both ends so the seam has no kink
// (Shenron loop: continuous motion, nothing ever stops, the first frame = the last frame).
function loopPass(next, K, o, view, base) {
  const len = +base.len || 2, s = camState(base.camera, 0, view), F = o.focus || s.target, P = s.pos
  const r = Math.hypot(P[0] - F[0], P[2] - F[2]), y = P[1], a0 = Math.atan2(P[2] - F[2], P[0] - F[0]), sweep = (o.sweep ?? K.sweep) * Math.PI / 180, n = K.keys
  const ks = []
  for (let i = -1; i <= n + 1; i++) { const u = i / n, a = a0 + sweep * u; ks.push([r4(len * u), [r4(F[0] + r * Math.cos(a)), r4(y), r4(F[2] + r * Math.sin(a))], 'auto']) }
  next.camera.pos = ks
  next.camera.target = [[0, F, 'auto'], [len, F]]
  next.cine = { kind: 'loop', sweep: o.sweep ?? K.sweep, warp: 'none', base }
  return next
}
