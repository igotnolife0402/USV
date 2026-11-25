import { THREE, seg, easeOut, backOut, bell, rng, softTex, puffTex, addMat, spriteMat, pool, billboards, streaks, dummy, arc, idle, clamp } from '../lib.js';

export function create(ctx) {
  const { scene, hand, target } = ctx;
  const R = rng(101);
  const duration = 4.0;
  const HUE = new THREE.Color('#7dff3a'), DEEP = new THREE.Color('#2a6b10'), CORE = new THREE.Color('#eaffd0'), ACC = new THREE.Color('#b04aff'), GAS = new THREE.Color('#3d8a20');
  const NM = 50, NO = 12, NT = 10, ND = 16;
  const bb = billboards(scene, NM + NO * 2 + NO * NT + NO * ND + 40);
  const gas = billboards(scene, 36, { map: puffTex, normal: true });
  const oM = 0, oC = NM, oG = oC + NO, oT = oG + NO, oD = oT + NO * NT, oB = oD + NO * ND;

  const moteA = [], moteR = [];
  for (let i = 0; i < NM; i++) { moteA.push(R(0, Math.PI * 2)); moteR.push(R(1.2, 1.5)); }
  const imp = [], launch = [], tI = [];
  for (let i = 0; i < NO; i++) {
    const a = R(0, Math.PI * 2), r = 3.5 * Math.sqrt(R());
    imp.push(new THREE.Vector3(target.x + Math.cos(a) * r, 0, target.z + Math.sin(a) * r));
    launch.push(0.6 + 0.15 * i); tI.push(0.6 + 0.15 * i + 0.7);
  }
  const drops = [];
  for (let i = 0; i < NO; i++) for (let d = 0; d < ND; d++) drops.push({ v: new THREE.Vector3(R(-2, 2), R(3, 5), R(-2, 2)), acc: R() < 0.1 });
  const gasP = [];
  for (let i = 0; i < 36; i++) { const a = R(0, Math.PI * 2), r = 4 * Math.sqrt(R()); gasP.push({ x: target.x + Math.cos(a) * r, z: target.z + Math.sin(a) * r, y0: R(0, 0.5) }); }
  const bub = [];
  for (let i = 0; i < 40; i++) { const c = Math.floor(R(0, NO)) % NO; bub.push({ c, ox: R(-0.8, 0.8), oz: R(-0.8, 0.8), start: 1.3 + R(0, 1.7) }); }
  const decals = [];
  for (let i = 0; i < NO; i++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 32), addMat({ color: HUE.clone(), opacity: 0 }));
    m.rotation.x = -Math.PI / 2; m.position.set(imp[i].x, 0.02, imp[i].z); m.visible = false; scene.add(m); decals.push(m);
  }
  const light = { color: HUE.clone(), intensity: 0, pos: new THREE.Vector3(target.x, target.y + 1, target.z) };
  const P = new THREE.Vector3(), Q = new THREE.Vector3(), C = new THREE.Color();
  const handArc = (i, k, out) => arc(hand, imp[i], 2.5, clamp(k), out);

  function update(lt) {
    if (lt < 0 || lt > duration) {
      for (let i = 0; i < NM + NO * 2 + NO * NT + NO * ND + 40; i++) bb.hide(i);
      for (let i = 0; i < 36; i++) gas.hide(i);
      bb.commit(); gas.commit(); decals.forEach(m => (m.visible = false));
      return idle();
    }
    // charge motes
    const cs = seg(lt, 0, 0.6);
    for (let i = 0; i < NM; i++) {
      if (lt >= 0.6) { bb.hide(oM + i); continue; }
      const k = clamp(cs * 1.0 - (i / NM) * 0.3) / 0.7 > 1 ? 1 : clamp(cs - (i / NM) * 0.3) / 0.7;
      const r = moteR[i] * (1 - k), a = moteA[i] + 5 * k;
      P.set(hand.x + Math.cos(a) * r, hand.y + Math.sin(a * 1.3) * r * 0.5, hand.z + Math.sin(a) * r);
      bb.set(oM + i, P, 0.12, HUE, 0.9 * bell(clamp(k * 0.9 + 0.05)));
    }
    // orbs, trails, droplets
    let lightI = 0, shakeI = 0;
    for (let i = 0; i < NO; i++) {
      const k = (lt - launch[i]) / 0.7;
      const flying = k >= 0 && k <= 1;
      if (flying) {
        handArc(i, k, P);
        bb.set(oC + i, P, 0.35, CORE, 1); bb.set(oG + i, P, 1.1, HUE, 0.6);
      } else { bb.hide(oC + i); bb.hide(oG + i); }
      for (let j = 0; j < NT; j++) {
        const kj = k - 0.03 * j;
        if (!flying || kj < 0) { bb.hide(oT + i * NT + j); continue; }
        handArc(i, kj, Q);
        bb.set(oT + i * NT + j, Q, 0.25 * (1 - j / NT), HUE, 0.5 * (1 - j / NT));
      }
      const dt = lt - tI[i];
      for (let d = 0; d < ND; d++) {
        const dr = drops[i * ND + d], idx = oD + i * ND + d;
        if (dt < 0 || dt > 0.6) { bb.hide(idx); continue; }
        P.set(imp[i].x + dr.v.x * dt, Math.max(0.02, dr.v.y * dt - 0.5 * 9.8 * dt * dt), imp[i].z + dr.v.z * dt);
        bb.set(idx, P, 0.08, dr.acc ? ACC : HUE, 1 - dt / 0.6);
      }
      const m = decals[i];
      if (dt >= 0 && dt <= 4) {
        const s = 1.2 * easeOut(seg(dt, 0, 0.25));
        m.visible = s > 0.001; m.scale.set(s, s, s); m.material.opacity = 0.8 * (1 - seg(dt, 0.3, 2.2));
        if (dt > 2.2) m.visible = false;
      } else m.visible = false;
      const bl = bell(seg(lt, tI[i], tI[i] + 0.3));
      lightI += 8 * bl; shakeI = Math.max(shakeI, bl);
    }
    // gas
    for (let i = 0; i < 36; i++) {
      const s0 = 1.0 + 0.03 * i, u = seg(lt, s0, s0 + 2.6);
      if (u <= 0 || u >= 1) { gas.hide(i); continue; }
      P.set(gasP[i].x, gasP[i].y0 + 0.4 * (lt - s0), gasP[i].z);
      gas.set(i, P, 2 + 3 * u, GAS, 0.35 * bell(u));
    }
    // bubbles
    for (let i = 0; i < 40; i++) {
      const b = bub[i], u = (lt - b.start) / 0.8, idx = oB + i;
      if (u <= 0 || u >= 1 || lt > 3.8 || lt < 1.3) { bb.hide(idx); continue; }
      P.set(imp[b.c].x + b.ox, 0.1 + 0.6 * (lt - b.start), imp[b.c].z + b.oz);
      bb.set(idx, P, 0.1 + 0.15 * u, HUE, 0.8 * bell(u));
    }
    bb.commit(); gas.commit();
    light.intensity = Math.min(25, lightI);
    return { light, exposure: lt < 0.6 ? 1 - 0.4 * cs : 1, shake: 0.3 * shakeI };
  }
  return { duration, update };
}
