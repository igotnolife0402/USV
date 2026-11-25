import { THREE, seg, easeOut, easeIn, backOut, bell, rng, softTex, puffTex, addMat, spriteMat, pool, billboards, streaks, dummy, arc, idle, clamp, canvasTex } from '../lib.js';

// Rock attack: lava fissure, layered earth spikes, hurled boulders. Pure function of lt.
export function create(ctx) {
  const { scene, hand, target } = ctx;
  const R = rng(505);
  const duration = 4.2;
  const ROCK = new THREE.Color('#7d6e5c'), DARK = new THREE.Color('#3b332b');
  const LAVA = new THREE.Color('#ff8a3a'), DUST = new THREE.Color('#8a7a66');
  const root = new THREE.Group(); scene.add(root);

  // vertex jitter shared across duplicated seam vertices so the mesh stays closed
  const perturb = (geo, amt, tipY = null) => {
    const pos = geo.attributes.position; const seen = new Map();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (tipY !== null && y > tipY - 1e-4) continue;
      const key = x.toFixed(4) + ',' + y.toFixed(4) + ',' + z.toFixed(4);
      let o = seen.get(key);
      if (!o) { o = [R(-amt, amt), R(-amt, amt), R(-amt, amt)]; seen.set(key, o); }
      pos.setXYZ(i, x + o[0], y + o[1], z + o[2]);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };

  const start = new THREE.Vector3(0, 0, -1);
  const dir = new THREE.Vector3().subVectors(target, start); dir.y = 0;
  const lineLen = dir.length(); dir.normalize();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  const baseAng = Math.atan2(dir.x, dir.z);

  // particle lists (filled first, pools sized after)
  const chips = [], puffs = [];
  const chipBurst = (n, p, t0, upMin, upMax, outMin, outMax) => {
    for (let i = 0; i < n; i++) {
      const a = R(0, 6.2832), sp = R(outMin, outMax);
      chips.push({ ox: p.x, oy: p.y, oz: p.z, vx: Math.cos(a) * sp, vy: R(upMin, upMax), vz: Math.sin(a) * sp,
        t0, rx: R(-9, 9), ry: R(-9, 9), s: R(0.6, 1.6), c: R(0.55, 1.1) });
    }
  };
  const puffBurst = (n, p, t0, spd) => {
    for (let i = 0; i < n; i++) {
      const a = R(0, 6.2832), sp = R(0.3, spd);
      puffs.push({ ox: p.x + R(-0.3, 0.3), oy: p.y + 0.15, oz: p.z + R(-0.3, 0.3), vx: Math.cos(a) * sp, vy: R(0.3, 1.2), vz: Math.sin(a) * sp, t0 });
    }
  };

  // 1. fissure
  const fissMat = addMat({ color: LAVA, opacity: 1 });
  const fissGeo = new THREE.BoxGeometry(0.06, 0.02, 0.7);
  const cracks = [];
  for (let j = 0; j < 30; j++) {
    const d = (j / 29) * lineLen, side = R(-0.3, 0.3);
    const m = new THREE.Mesh(fissGeo, fissMat);
    m.position.set(start.x + dir.x * d + perp.x * side, 0.015, start.z + dir.z * d + perp.z * side);
    m.rotation.y = baseAng + R(-0.35, 0.35);
    m.visible = false; root.add(m); cracks.push(m);
  }

  // 2. spikes
  const rockMat = new THREE.MeshStandardMaterial({ color: ROCK, roughness: 0.95, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.95, flatShading: true });
  const spikes = [];
  for (let j = 0; j < 14; j++) {
    const d = 1.5 + j * 0.8, side = (j % 2 ? 1 : -1) * 0.6;
    const px = start.x + dir.x * d + perp.x * side, pz = start.z + dir.z * d + perp.z * side;
    const rad = R(0.35, 0.6), h = R(1.5, 4);
    const g1 = new THREE.ConeGeometry(rad, h, 7, 4); perturb(g1, 0.08, h / 2); g1.translate(0, h / 2, 0);
    const g2 = new THREE.ConeGeometry(rad * 0.8, h * 0.85, 7, 4); perturb(g2, 0.08, h * 0.85 / 2); g2.translate(0, h * 0.85 / 2, 0);
    const grp = new THREE.Group();
    const m1 = new THREE.Mesh(g1, rockMat);
    const m2 = new THREE.Mesh(g2, darkMat);
    m2.rotation.set(R(-0.12, 0.12), R(0, 6.2832), R(-0.12, 0.12));
    grp.add(m1, m2);
    grp.rotation.set(R(-0.3, 0.3), R(0, 6.2832), R(-0.3, 0.3));
    grp.position.set(px, -h, pz); grp.visible = false; root.add(grp);
    const ts = 0.3 + 0.06 * j;
    spikes.push({ grp, h, ts, px, pz });
    chipBurst(12, new THREE.Vector3(px, 0.1, pz), ts, 3, 6.5, 1, 3.5);
    puffBurst(6, new THREE.Vector3(px, 0, pz), ts, 2);
  }

  // 3. boulders
  const boulders = [];
  for (let b = 0; b < 5; b++) {
    const geo = new THREE.IcosahedronGeometry(R(0.6, 0.9), 2); perturb(geo, 0.12);
    const mesh = new THREE.Mesh(geo, rockMat); mesh.visible = false; root.add(mesh);
    const sx = (b % 2 ? 1 : -1) * 1.5;
    const lift = new THREE.Vector3(hand.x + sx, 4, hand.z + 1);
    const a = R(0, 6.2832), r = R(0.5, 2.5);
    const impact = new THREE.Vector3(target.x + Math.cos(a) * r, 0.5, target.z + Math.sin(a) * r);
    const decalMat = addMat({ color: LAVA, opacity: 0.6 });
    const decal = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), decalMat);
    decal.rotation.x = -Math.PI / 2; decal.position.set(impact.x, 0.03, impact.z); decal.visible = false; root.add(decal);
    const t0 = 1.5 + 0.3 * b, t1 = 1.9 + 0.3 * b, t2 = 2.3 + 0.3 * b;
    chipBurst(30, impact, t2, 3, 7, 1.5, 5);
    puffBurst(8, new THREE.Vector3(impact.x, 0, impact.z), t2, 2.5);
    boulders.push({ mesh, lift, impact, decal, decalMat, t0, t1, t2, spin: [R(0.5, 1.2), R(0.5, 1.2), R(0.3, 0.9)] });
  }

  // particle pools
  const chipPool = pool(scene, chips.length, new THREE.DodecahedronGeometry(0.06),
    new THREE.MeshStandardMaterial({ color: ROCK, roughness: 0.95, flatShading: true }));
  const col = new THREE.Color();
  chips.forEach((c, i) => { col.setScalar(c.c); chipPool.setColorAt(i, col); });
  chipPool.instanceColor.needsUpdate = true;
  const dust = billboards(scene, puffs.length, { map: puffTex, normal: true });

  const CHIP_LIFE = 0.9, PUFF_LIFE = 1.4;
  const tmp = new THREE.Vector3();
  const light = { color: new THREE.Color('#ff9a5a'), intensity: 0, pos: new THREE.Vector3(target.x, target.y + 2, target.z) };
  const out = { light, exposure: 1, shake: 0 };

  function hideAll() {
    root.children.forEach(o => { o.visible = false; });
    dummy.scale.setScalar(0); dummy.position.set(0, 0, 0); dummy.updateMatrix();
    for (let i = 0; i < chips.length; i++) chipPool.setMatrixAt(i, dummy.matrix);
    chipPool.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < puffs.length; i++) dust.hide(i);
    dust.commit();
  }

  function update(lt) {
    if (lt < 0 || lt > duration) { hideAll(); return idle(); }

    // fissure
    fissMat.opacity = 1 - seg(lt, 1.5, 3.5);
    for (let j = 0; j < cracks.length; j++) cracks[j].visible = lt >= 0.012 * j && fissMat.opacity > 0;

    // spikes
    for (const s of spikes) {
      if (lt < s.ts || lt >= duration) { s.grp.visible = false; continue; }
      const rise = backOut(seg(lt, s.ts, s.ts + 0.18));
      const sink = easeIn(seg(lt, 3.4, 4.2));
      s.grp.position.y = -s.h * (1 - rise) - s.h * sink;
      s.grp.visible = true;
    }

    // boulders
    let impactBell = 0, impactShake = 0;
    for (const b of boulders) {
      const dt = lt - b.t2;
      if (lt >= b.t0 && lt < b.t2) {
        if (lt < b.t1) tmp.set(b.lift.x, 4 * easeOut(seg(lt, b.t0, b.t1)), b.lift.z);
        else arc(b.lift, b.impact, 1.5, seg(lt, b.t1, b.t2), tmp);
        b.mesh.position.copy(tmp);
        b.mesh.rotation.set(lt * b.spin[0], lt * b.spin[1], lt * b.spin[2]);
        b.mesh.visible = true;
      } else b.mesh.visible = false;
      if (dt >= 0 && dt <= 1) { b.decal.visible = true; b.decalMat.opacity = 0.6 * (1 - dt); } else b.decal.visible = false;
      impactBell = Math.max(impactBell, bell(seg(lt, b.t2, b.t2 + 0.8)));
      impactShake = Math.max(impactShake, 0.9 * bell(seg(dt, 0, 0.35)));
    }

    // chips (ballistic, rest on ground, shrink out)
    for (let i = 0; i < chips.length; i++) {
      const c = chips[i], dt = lt - c.t0;
      if (dt < 0 || dt > CHIP_LIFE) { dummy.scale.setScalar(0); dummy.position.set(0, 0, 0); }
      else {
        const tg = (c.vy + Math.sqrt(c.vy * c.vy + 19.6 * Math.max(0, c.oy - 0.03))) / 9.8;
        const te = Math.min(dt, tg);
        const y = Math.max(0.03, c.oy + c.vy * te - 4.9 * te * te);
        dummy.position.set(c.ox + c.vx * te, y, c.oz + c.vz * te);
        dummy.rotation.set(c.rx * te, c.ry * te, 0);
        dummy.scale.setScalar(c.s * (1 - seg(dt, CHIP_LIFE * 0.6, CHIP_LIFE)));
      }
      dummy.updateMatrix(); chipPool.setMatrixAt(i, dummy.matrix);
    }
    chipPool.instanceMatrix.needsUpdate = true;

    // dust
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i], dt = lt - p.t0;
      if (dt < 0 || dt > PUFF_LIFE) { dust.hide(i); continue; }
      const k = dt / PUFF_LIFE;
      tmp.set(p.ox + p.vx * dt, p.oy + p.vy * dt, p.oz + p.vz * dt);
      dust.set(i, tmp, 1 + 2 * k, DUST, 0.45 * bell(k));
    }
    dust.commit();

    light.intensity = 6 + 14 * impactBell;
    out.exposure = 1 - 0.3 * seg(lt, 0, 0.3) + 0.3 * seg(lt, 0.3, 0.6); // dim before the first spike, recover as they erupt
    out.shake = clamp(Math.max(0.5 * bell(seg(lt, 0.3, 1.2)), impactShake));
    return out;
  }

  return { duration, update };
}
