import { THREE, seg, easeOut, bell, rng, addMat, billboards, streaks, dummy, idle } from '../lib.js';

export function create(ctx) {
  const { scene, hand, target } = ctx;
  const R = rng(404);
  const HUE = new THREE.Color('#ffd98a'), CORE = new THREE.Color('#ffffff'), PALE = new THREE.Color('#fff6dc');
  const duration = 4.0;
  const root = new THREE.Group(); scene.add(root);
  const zonePt = (y) => { const a = R(0, Math.PI * 2), r = 4 * Math.sqrt(R(0, 1)); return new THREE.Vector3(target.x + Math.cos(a) * r, y, target.z + Math.sin(a) * r); };

  // 1. halo
  const halo = new THREE.Group(); halo.position.copy(hand).add(new THREE.Vector3(0, 0.5, 0.6)); halo.visible = false; root.add(halo);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.03, 8, 96), addMat({ color: HUE }));
  halo.add(torus);
  const rayMat = addMat({ color: PALE });
  const rayGeo = new THREE.BoxGeometry(0.02, 1, 0.02); rayGeo.translate(0, 0.5, 0);
  for (let i = 0; i < 12; i++) {
    const r = new THREE.Mesh(rayGeo, rayMat); r.scale.set(1, 1.5, 1); r.rotation.z = i * Math.PI * 2 / 12; halo.add(r);
  }

  // 2. pillars
  const coreGeo = new THREE.CylinderGeometry(1, 1, 20, 24, 1, true); coreGeo.translate(0, 10, 0);
  const ringGeo = new THREE.RingGeometry(0.6, 0.75, 48); ringGeo.rotateX(-Math.PI / 2);
  const pillars = [];
  for (let i = 0; i < 7; i++) {
    const c = i < 6 ? new THREE.Vector3(target.x + Math.cos(i * Math.PI / 3) * 3, 0, target.z + Math.sin(i * Math.PI / 3) * 3) : new THREE.Vector3(target.x, 0, target.z);
    const core = new THREE.Mesh(coreGeo, addMat({ color: CORE, opacity: 0.9, side: THREE.DoubleSide }));
    const glow = new THREE.Mesh(coreGeo, addMat({ color: HUE, opacity: 0.25, side: THREE.DoubleSide }));
    const ring = new THREE.Mesh(ringGeo, addMat({ color: HUE, side: THREE.DoubleSide }));
    core.position.copy(c); glow.position.copy(c); ring.position.set(c.x, 0.05, c.z);
    core.visible = glow.visible = ring.visible = false;
    root.add(core, glow, ring);
    pillars.push({ core, glow, ring, s: 0.5 + 0.25 * i });
  }

  // 3. spears
  const NS = 40;
  const spearGeo = new THREE.OctahedronGeometry(0.12); spearGeo.scale(1, 8, 1);
  const spears = new THREE.InstancedMesh(spearGeo, addMat({ color: CORE }), NS);
  spears.instanceMatrix.setUsage(THREE.DynamicDrawUsage); spears.frustumCulled = false; root.add(spears);
  const glows = billboards(scene, NS);
  const sparks = streaks(scene, NS * 8);
  const white = new THREE.Color(1, 1, 1);
  for (let i = 0; i < NS * 8; i++) sparks.setColorAt(i, white);
  sparks.instanceColor.needsUpdate = true;
  const sp = [];
  for (let k = 0; k < NS; k++) {
    const p = zonePt(0), t0 = 1.0 + 0.05 * k, vs = [];
    for (let j = 0; j < 8; j++) {
      const ang = R(0, Math.PI * 2), el = R(0.2, 0.9), v = R(3, 7);
      vs.push(new THREE.Vector3(Math.cos(ang) * Math.cos(el) * v, Math.sin(el) * v, Math.sin(ang) * Math.cos(el) * v));
    }
    sp.push({ p, t0, tHit: t0 + 15 / 25, vs });
  }

  // 4. sparkle motes
  const NK = 140;
  const motes = billboards(scene, NK);
  const mo = [];
  for (let i = 0; i < NK; i++) mo.push({ p: zonePt(R(0, 6)), size: R(0.06, 0.12), c: R(0, 1) < 0.5 ? PALE : CORE });

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const light = { color: HUE.clone(), intensity: 0, pos: target.clone().add(new THREE.Vector3(0, 4, 0)) };

  function hideAll() {
    halo.visible = false;
    for (const p of pillars) p.core.visible = p.glow.visible = p.ring.visible = false;
    dummy.position.set(0, 0, 0); dummy.scale.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    for (let i = 0; i < NS; i++) { spears.setMatrixAt(i, dummy.matrix); glows.hide(i); }
    spears.instanceMatrix.needsUpdate = true; glows.commit();
    for (let i = 0; i < NS * 8; i++) sparks.setMatrixAt(i, dummy.matrix);
    sparks.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < NK; i++) motes.hide(i); motes.commit();
  }

  function update(lt) {
    if (lt < 0 || lt > duration) { hideAll(); return idle(); }

    // halo
    halo.visible = true;
    halo.scale.setScalar(Math.max(easeOut(seg(lt, 0, 0.4)), 0.0001));
    const hf = 1 - seg(lt, 3.5, 4.0);
    torus.material.opacity = hf; rayMat.opacity = hf;

    // pillars
    const pf = 1 - seg(lt, 2.4, 2.9);
    let flash = false;
    for (const p of pillars) {
      const on = lt >= p.s && lt <= 2.9;
      p.core.visible = p.glow.visible = on;
      if (on) {
        const r = Math.max(easeOut(seg(lt, p.s, p.s + 0.12)) * (0.35 - 0.3 * seg(lt, p.s + 0.12, p.s + 0.72)), 0.0001);
        p.core.scale.set(r, 1, r); p.glow.scale.set(r * 3, 1, r * 3);
        p.core.material.opacity = 0.9 * pf; p.glow.material.opacity = 0.25 * pf;
      }
      const ron = lt >= p.s && lt <= p.s + 0.5;
      p.ring.visible = ron;
      if (ron) {
        const u = seg(lt, p.s, p.s + 0.5);
        p.ring.scale.setScalar(Math.max(4 * easeOut(u), 0.0001));
        p.ring.material.opacity = 1 - u;
      }
      if (lt >= p.s && lt < p.s + 0.06) flash = true;
    }

    // spears
    dummy.rotation.set(0, 0, 0);
    for (let k = 0; k < NS; k++) {
      const s = sp[k];
      if (lt >= s.t0 && lt < s.tHit) {
        const y = 15 - 25 * (lt - s.t0);
        dummy.position.set(s.p.x, y, s.p.z); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
        spears.setMatrixAt(k, dummy.matrix);
        tmp.set(s.p.x, y, s.p.z); glows.set(k, tmp, 0.8, HUE, 0.8);
      } else {
        dummy.position.set(0, 0, 0); dummy.scale.set(0, 0, 0); dummy.updateMatrix();
        spears.setMatrixAt(k, dummy.matrix); glows.hide(k);
      }
      const u = lt - s.tHit, burst = u >= 0 && u <= 0.3;
      for (let j = 0; j < 8; j++) {
        if (!burst) { dummy.position.set(0, 0, 0); dummy.scale.set(0, 0, 0); dummy.updateMatrix(); sparks.setMatrixAt(k * 8 + j, dummy.matrix); continue; }
        const v = s.vs[j];
        tmp.set(s.p.x + v.x * u, Math.max(0, v.y * u - 4.9 * u * u), s.p.z + v.z * u);
        tmp2.set(v.x, v.y - 9.8 * u, v.z).add(tmp);
        dummy.position.copy(tmp); dummy.lookAt(tmp2);
        dummy.scale.set(1, 1, 0.05 + 0.4 * (1 - u / 0.3)); dummy.updateMatrix();
        sparks.setMatrixAt(k * 8 + j, dummy.matrix);
      }
    }
    spears.instanceMatrix.needsUpdate = true; glows.commit(); sparks.instanceMatrix.needsUpdate = true;

    // sparkle motes
    for (let i = 0; i < NK; i++) {
      if (lt < 0.5) { motes.hide(i); continue; }
      const m = mo[i];
      tmp.copy(m.p); tmp.y += 0.25 * (lt - 0.5);
      motes.set(i, tmp, m.size, m.c, bell((lt * 0.7 + i * 0.37) % 1));
    }
    motes.commit();

    // light, grade, shake
    light.intensity = 20 + 15 * bell(seg(lt, 0.5, 2.8));
    let exposure = 1 + 0.2 * bell(seg(lt, 0.3, 3.5));
    if (lt < 0.5) exposure = Math.max(exposure, 1 + 0.25 * seg(lt, 0, 0.6));
    if ((lt >= 0.5 && lt < 0.56) || flash) exposure = 1.25;
    return { light, exposure, shake: 0.25 * bell(seg(lt, 1.0, 3.0)) };
  }

  return { duration, update };
}
