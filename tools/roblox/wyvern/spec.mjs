// One spec drives every output (preview, Luau bake, tests). Units: studs, seconds.
// Frame: player centre at origin, Y up, +Z = player's front (Roblox lookVector is -Z; gen-luau flips Z).

export const TUNE = { LOOP_LEN: 16, MIN_CLEAR: 9, BANK_MAX: 55, G: 120, SAMPLE: 1.0, BAKE_DT: 1 / 30 };

// Body layout, nose -> tail. len = chord length along the path; r0/r1 = radius at front/back.
export const BODY = (() => {
  const parts = [{ name: 'Head', len: 5, r0: 0.35, r1: 1.05 }];
  const neckR = [1.0, 1.05, 1.15, 1.3, 1.5, 1.75];
  for (let i = 0; i < 5; i++) parts.push({ name: `NeckSeg${i + 1}`, len: 1.6, r0: neckR[i], r1: neckR[i + 1] });
  const torsoR = [1.75, 2.0, 2.1, 2.0, 1.8];
  for (let i = 0; i < 4; i++) parts.push({ name: `TorsoSeg${i + 1}`, len: 2.25, r0: torsoR[i], r1: torsoR[i + 1] });
  for (let i = 0; i < 15; i++) {
    const a = i / 15, b = (i + 1) / 15;
    const r = (u) => 1.8 * Math.pow(1 - u, 1.35) + 0.25 * u; // 1.8 -> 0.25
    parts.push({ name: `TailSeg${i + 1}`, len: 24.5 / 15, r0: r(a), r1: r(b) });
  }
  let s = 0;
  for (const p of parts) { p.front = s; s += p.len; p.back = s; }
  return parts;
})();
export const TAIL_BLADE = 3.5;                     // past TailSeg15
export const BODY_LEN = BODY.at(-1).back + TAIL_BLADE; // 50
export const WING = { span: 34, shoulderSeg: 'TorsoSeg2', hipSeg: 'TorsoSeg4' };

// Closed head path, authored as named moves (sampled into Catmull-Rom control points).
const rad = Math.PI / 180;
const arc = (r, a0, a1, y0, y1, n, wob = 0) => Array.from({ length: n }, (_, i) => {
  const u = i / n, a = (a0 + (a1 - a0) * u) * rad;
  return [Math.sin(a) * r * (1 + wob * Math.sin(u * Math.PI * 2)), y0 + (y1 - y0) * u, Math.cos(a) * r];
});
const line = (p0, p1, n) => Array.from({ length: n }, (_, i) => p0.map((v, k) => v + (p1[k] - v) * (i / n)));
// Vertical loop behind the player: starts at its bottom moving +X, drifts -Z so it never meets itself.
const vloop = (x0, zc, yc, r, n) => Array.from({ length: n }, (_, i) => {
  const b = (i / n) * Math.PI * 2;
  return [x0 + Math.sin(b) * r, yc - Math.cos(b) * r, zc - 3 * (i / n)];
});

// dur = seconds the head spends on the move (sum 16); speed = move length / dur, then ramped.
// Orbit direction: angle a decreasing (back -> right -> front -> left -> back), pos = (sin a*r, y, cos a*r).
// Two laps in 16 s; a = 150 at t = 0 and -570 (same place) at the end.
export const MOVES = [
  { name: 'glide', dur: 3.6, pts: arc(32, 150, 45, 6, 10, 7, 0.1) },               // wide orbit, slight wobble
  { name: 'dash1', dur: 1.2, pts: line([20, 9, 24], [-20, 3, 15], 3) },            // dash across the front
  { name: 'swing', dur: 0.9, pts: arc(27, -62, -150, 2, 0, 4) },                   // left side to the back
  { name: 'loop',  dur: 1.6, pts: vloop(-3, -27, 11, 11, 11) },                    // loop-the-loop behind
  { name: 'roll',  dur: 2.3, pts: arc(28, 182, 100, -4, 3, 5, 0.06) },             // low rising corkscrew
  { name: 'flare', dur: 1.0, pts: [[25, 8, 4], [20, 13, 13], [12, 16, 17]] },      // pull up front-right, hover-flare
  { name: 'dash2', dur: 1.2, pts: line([10, 17, 28], [-29, 0, 6], 3) },           // diagonal dive across the front-left
  { name: 'weave', dur: 4.2, pts: Array.from({ length: 9 }, (_, i) => {           // close weave around the back
    const u = i / 9, a = (-112 - 92 * u) * rad, r = 25 + 4 * Math.sin(u * Math.PI * 3); // >= 21: the 17-stud wing on the inside must clear the player
    return [Math.sin(a) * r, 3 + 4 * Math.sin(u * Math.PI * 2), Math.cos(a) * r];
  }) },
];

// Per-move channels (blended along the path, so the body inherits them as it passes).
export const MOVE_FX = {
  glide: { wings: 'flap', flapHz: 1.6 },
  dash1: { wings: 'fold', dash: 1 },
  swing: { wings: 'flap', flapHz: 2.2 },
  loop:  { wings: 'flap', flapHz: 3.0, loop: 1 },
  roll:  { wings: 'glide', roll: 360 },
  flare: { wings: 'spread', flare: 1 },
  dash2: { wings: 'fold', dash: 1 },
  weave: { wings: 'flap', flapHz: 2.0 },
};
