// Headless check of the whole loop (pure math, same code as the preview and the Luau bake).
// Pass: body/wing clearance from the player, seamless loop (pos + velocity), no joint gaps, tri caps.
import { TUNE, BODY } from '../spec.mjs';
import { bake, pose, wingAngles, wingAxes, V } from '../motion.mjs';
import { build, WING_PTS } from '../geo.mjs';
const B = bake(), parts = build();
const fail = [];
const toWorld = (pp, q) => { const z = V.mul(pp.look, -1), x = V.cross(pp.up, z); return V.add(pp.pos, V.add(V.add(V.mul(x, q[0]), V.mul(pp.up, q[1])), V.mul(z, q[2]))); };
let minBody = 1e9, minWing = 1e9, maxGap = 0, at = '', wat = '';
const wlog = [];
const fps = 60;
for (let f = 0; f < TUNE.LOOP_LEN * fps; f++) {
  const t = f / fps, P = pose(B, t), seg2 = P.parts.find((q) => q.name === 'TorsoSeg2'), wa = wingAngles(P);
  P.parts.forEach((q, i) => {
    for (const v of [q.pos, q.back]) { const d = V.len(v); if (d < minBody) { minBody = d; at = `${t.toFixed(2)}s ${q.name}`; } }
    if (i > 0) maxGap = Math.max(maxGap, V.len(V.sub(P.parts[i - 1].back, q.pos)));
  });
  for (const sx of [1, -1]) {
    const ax = wingAxes(WING_PTS, sx), m = (k) => [WING_PTS[k][0] * sx, WING_PTS[k][1], WING_PTS[k][2]];
    for (const k of ['F1', 'F2', 'F3', 'W']) {
      let p = V.sub(m(k), ax.E); p = V.add(ax.E, V.rotAxis(p, ax.ko, wa.outer));
      p = V.add(ax.S, V.rotAxis(V.sub(p, ax.S), ax.ki, wa.inner));
      const dw = V.len(toWorld(seg2, p)); if (dw < minWing) { minWing = dw; wat = `${t.toFixed(2)}s ${k}${sx} ${B.moves[B.tags[Math.floor(P.sHead / B.ds) % B.n]]}`; }
    }
  }
}
const e = 1e-3, a = pose(B, 0), b = pose(B, TUNE.LOOP_LEN - 1e-9);
const seam = Math.max(...a.parts.map((q, i) => V.len(V.sub(q.pos, b.parts[i].pos))));
// one-sided velocities just after 0 and just before LOOP_LEN (no wrap used): equal when the loop is C1
const v0 = V.mul(V.sub(pose(B, 2 * e).parts[0].pos, pose(B, e).parts[0].pos), 1 / e);
const v1 = V.mul(V.sub(pose(B, TUNE.LOOP_LEN - e).parts[0].pos, pose(B, TUNE.LOOP_LEN - 2 * e).parts[0].pos), 1 / e);
const velD = V.len(V.sub(v0, v1)) / V.len(v0);
const len = BODY.at(-1).back + 3.5, thick = Math.max(...parts.filter((p) => /Seg/.test(p.name)).map((p) => p.size[0]));
const maxTri = Math.max(...parts.map((p) => p.tris));
const row = (k, v, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${k}: ${v}`); if (!ok) fail.push(k); };
row('body clearance >= 12 (MIN_CLEAR 9 + radius)', `${minBody.toFixed(2)} at ${at}`, minBody >= 12);
row('wingtip clearance >= 4', `${minWing.toFixed(2)} at ${wat}`, minWing >= 4);
row('loop seam pos < 0.01', seam.toExponential(2), seam < 0.01);
row('loop seam velocity < 1%', (velD * 100).toFixed(3) + '%', velD < 0.01);
row('max joint gap < 0.05', maxGap.toExponential(2), maxGap < 0.05);
row('length 50 / max thickness', `${len} / ${thick.toFixed(2)} (ratio ${(len / thick).toFixed(1)})`, Math.abs(len - 50) < 0.01 && len / thick > 10);
row('parts <= 60, tris/part <= 19k', `${parts.length} parts, max ${maxTri}`, parts.length <= 60 && maxTri <= 19000);
console.log(`speed ${Math.min(...B.speed).toFixed(1)}-${Math.max(...B.speed).toFixed(1)} studs/s, flap cycles ${B.cycles}, path ${B.L.toFixed(0)} studs`);
process.exit(fail.length ? 1 : 0);
