import { THREE, seg, easeOut, backOut, bell, rng, softTex, puffTex, addMat, spriteMat, pool, billboards, streaks, dummy, arc, idle, clamp } from '../lib.js';

export function create(ctx) {
  const { scene, hand, target } = ctx;
  const R = rng(202);
  const duration = 4.0;
  const HUE = new THREE.Color('#ff7a1a'), CORE = new THREE.Color('#fff2c0'), DEEP = new THREE.Color('#a01e00'), SMOKE = new THREE.Color('#2a2422'), GOLD = new THREE.Color('#ffd23a');
  const NE = 40, NF = 6, NTR = 20, NJ = 320, NR = 24;
  const oE = 0, oC = NE, oG = oC + NF, oT = oG + NF, oJ = oT + NF * NTR, oR = oJ + NJ, TOTAL = oR + NR;
  const bb = billboards(scene, TOTAL);
  const smoke = billboards(scene, 40, { map: puffTex, normal: true });
  const NS = 140;
  const sp = streaks(scene, NS);

  const eA = [], eR = [];
  for (let i = 0; i < NE; i++) { eA.push(R(0, Math.PI * 2)); eR.push(R(1.0, 1.5)); }
  const ends = [];
  for (let i = 0; i < NF; i++) { const a = R(0, Math.PI * 2), r = 2 * Math.sqrt(R()); ends.push(new THREE.Vector3(target.x + Math.cos(a) * r, 0.5, target.z + Math.sin(a) * r)); }
  const sparks = [];
  for (let i = 0; i < NS; i++) {
    const a = R(0, Math.PI * 2), el = R(0.9, 1.45), sp0 = R(6, 12);
    sparks.push({ v: new THREE.Vector3(Math.cos(a) * Math.cos(el) * sp0, Math.sin(el) * sp0, Math.sin(a) * Math.cos(el) * sp0), t0: 1.6 + R(0, 1.6), life: R(0.3, 0.9), sp: sp0, gold: R() < 0.1 });
  }
  const smk = [];
  for (let i = 0; i < 40; i++) { const a = R(0, Math.PI * 2), r = 3 * Math.sqrt(R()); smk.push({ x: target.x + Math.cos(a) * r, z: target.z + Math.sin(a) * r }); }
  const light = { color: HUE.clone(), intensity: 0, pos: new THREE.Vector3(target.x, target.y + 2, target.z) };
  const P = new THREE.Vector3(), Q = new THREE.Vector3(), C = new THREE.Color(), V = new THREE.Vector3();

  function update(lt) {
    if (lt < 0 || lt > duration) {
      for (let i = 0; i < TOTAL; i++) bb.hide(i);
      for (let i = 0; i < 40; i++) smoke.hide(i);
      for (let i = 0; i < NS; i++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); sp.setMatrixAt(i, dummy.matrix); }
      sp.instanceMatrix.needsUpdate = true; bb.commit(); smoke.commit();
      return idle();
    }
    // embers
    const cs = seg(lt, 0, 0.4);
    for (let i = 0; i < NE; i++) {
      if (lt >= 0.4) { bb.hide(oE + i); continue; }
      const k = clamp((cs - (i / NE) * 0.3) / 0.7);
      const r = eR[i] * (1 - k), a = eA[i] + 5 * k;
      P.set(hand.x + Math.cos(a) * r, hand.y + Math.sin(a * 1.3) * r * 0.5, hand.z + Math.sin(a) * r);
      bb.set(oE + i, P, 0.08, C.copy(HUE).lerp(CORE, k), 0.9 * bell(clamp(k * 0.9 + 0.05)));
    }
    // fireballs
    let barrage = false;
    for (let i = 0; i < NF; i++) {
      const k = (lt - (0.4 + 0.2 * i)) / 0.45;
      const fly = k >= 0 && k <= 1;
      if (fly) barrage = true;
      if (fly) {
        P.lerpVectors(hand, ends[i], k);
        bb.set(oC + i, P, 0.5, CORE, 1); bb.set(oG + i, P, 1.6, HUE, 0.7);
      } else { bb.hide(oC + i); bb.hide(oG + i); }
      for (let j = 0; j < NTR; j++) {
        const kj = k - 0.025 * j, idx = oT + i * NTR + j;
        if (!fly || kj < 0) { bb.hide(idx); continue; }
        Q.lerpVectors(hand, ends[i], kj);
        const f = j / NTR;
        if (f < 0.5) C.copy(CORE).lerp(HUE, f * 2); else C.copy(HUE).lerp(DEEP, (f - 0.5) * 2);
        bb.set(idx, Q, 0.45 - 0.35 * f, C, 0.8 * (1 - f));
      }
    }
    // tornado
    const rise = easeOut(seg(lt, 1.6, 2.0)), collapse = seg(lt, 3.2, 3.8);
    for (let j = 0; j < NJ; j++) {
      if (lt < 1.6 || lt > 3.8) { bb.hide(oJ + j); continue; }
      const y = (j / NJ) * 8 * rise, h = y / 8;
      const r = (0.5 + 2.0 * h) * (1 - 0.7 * collapse), a = j * 0.35 + 4 * (lt - 1.6);
      P.set(target.x + Math.cos(a) * r, y, target.z + Math.sin(a) * r);
      if (h < 0.5) C.copy(CORE).lerp(HUE, h * 2); else C.copy(HUE).lerp(DEEP, (h - 0.5) * 2);
      bb.set(oJ + j, P, 0.7 - 0.4 * h, C, 0.32 * (1 - collapse));
    }
    // ground ring
    for (let j = 0; j < NR; j++) {
      const u = seg(lt, 1.6, 3.9);
      if (u <= 0 || u >= 1) { bb.hide(oR + j); continue; }
      const a = (j / NR) * Math.PI * 2;
      P.set(target.x + Math.cos(a) * 2.6, 0.4, target.z + Math.sin(a) * 2.6);
      bb.set(oR + j, P, 1.2 * (0.8 + 0.2 * Math.sin(lt * 20 + j)), HUE, bell(u));
    }
    // sparks
    for (let i = 0; i < NS; i++) {
      const s = sparks[i], dt = lt - s.t0;
      if (lt < 1.6 || dt < 0 || dt > s.life) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); sp.setMatrixAt(i, dummy.matrix); continue; }
      const dk = (1 - Math.exp(-3 * dt)) / 3;
      P.set(target.x + s.v.x * dk, 0.3 + s.v.y * dk - 0.5 * 4 * dt * dt, target.z + s.v.z * dk);
      const vy = s.v.y * Math.exp(-3 * dt) - 4 * dt;
      V.set(s.v.x * Math.exp(-3 * dt), vy, s.v.z * Math.exp(-3 * dt));
      dummy.position.copy(P); dummy.scale.set(1, 1, 0.2 + 0.05 * s.sp);
      dummy.lookAt(P.x + V.x, P.y + V.y, P.z + V.z); dummy.updateMatrix();
      sp.setMatrixAt(i, dummy.matrix);
      C.copy(s.gold ? GOLD : CORE).lerp(s.gold ? GOLD : HUE, dt / s.life);
      sp.setColorAt(i, C);
    }
    sp.instanceMatrix.needsUpdate = true; if (sp.instanceColor) sp.instanceColor.needsUpdate = true;
    // smoke
    for (let j = 0; j < 40; j++) {
      const s0 = 3.0 + 0.01 * j, u = seg(lt, s0, 4.0);
      if (u <= 0 || u >= 1) { smoke.hide(j); continue; }
      P.set(smk[j].x, 0.5 + (lt - s0), smk[j].z);
      smoke.set(j, P, 2 + 2 * u, SMOKE, 0.5 * bell(u));
    }
    bb.commit(); smoke.commit();
    light.intensity = 30 * bell(seg(lt, 1.55, 2.4)) + (barrage ? 6 : 0);
    const exposure = (lt >= 1.6 && lt < 1.66) ? 1.35 : (lt < 0.4 ? 1 - 0.45 * cs : 1);
    return { light, exposure, shake: 0.8 * bell(seg(lt, 1.6, 2.2)) };
  }
  return { duration, update };
}
