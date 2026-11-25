import { THREE, seg, easeOut, backOut, bell, rng, softTex, puffTex, addMat, spriteMat, pool, billboards, streaks, dummy, arc, idle, clamp, canvasTex } from '../lib.js';

// Books attack: six orbiting grimoires, rune circle, page storm, spark burst, close into motes. Pure function of lt.
export function create(ctx) {
  const { scene, target } = ctx;
  const R = rng(606);
  const duration = 4.2;
  const HUE = new THREE.Color('#5ab0ff'), GOLD = new THREE.Color('#ffd36a');
  const COVERS = ['#5a1a1a', '#1a2a5a', '#2a4a2a', '#4a2a5a', '#5a3a12', '#1a1a1a'];
  const root = new THREE.Group(); scene.add(root);

  const bookPos = (i, t, out) => {
    const a = i * 1.047 + t * 0.8;
    return out.set(Math.cos(a) * 1.6, 1.6 + 0.2 * Math.sin(t * 2 + i), Math.sin(a) * 1.6);
  };

  // 1. books
  const pageMat = new THREE.MeshStandardMaterial({ color: '#f3ead2', roughness: 0.9 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#ffd36a', metalness: 0.8, roughness: 0.3 });
  const blockGeo = new THREE.BoxGeometry(0.42, 0.08, 0.3);
  const coverGeo = new THREE.BoxGeometry(0.44, 0.015, 0.32);
  const stripGeo = new THREE.BoxGeometry(0.44, 0.02, 0.01);
  const books = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(blockGeo, pageMat));
    const coverMat = new THREE.MeshStandardMaterial({ color: COVERS[i], roughness: 0.7 });
    const hinges = [];
    for (const sgn of [1, -1]) {
      const pivot = new THREE.Group(); pivot.position.set(-0.21, sgn * 0.0475, 0);
      const cv = new THREE.Mesh(coverGeo, coverMat); cv.position.x = 0.22;
      const s1 = new THREE.Mesh(stripGeo, goldMat); s1.position.set(0.22, 0, 0.155);
      const s2 = new THREE.Mesh(stripGeo, goldMat); s2.position.set(0.22, 0, -0.155);
      pivot.add(cv, s1, s2); g.add(pivot); hinges.push({ pivot, sgn });
    }
    g.visible = false; root.add(g);
    books.push({ g, hinges });
  }

  // 2. rune circle
  const R2 = Math.PI * 2;
  const runeTex = canvasTex(512, (g, s) => {
    const c = s / 2;
    g.clearRect(0, 0, s, s); g.strokeStyle = '#fff'; g.lineCap = 'round';
    g.lineWidth = 4; g.beginPath(); g.arc(c, c, 246, 0, R2); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.arc(c, c, 214, 0, R2); g.stroke();
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6;
      g.beginPath(); g.moveTo(c + Math.cos(a) * 214, c + Math.sin(a) * 214); g.lineTo(c + Math.cos(a) * 246, c + Math.sin(a) * 246); g.stroke();
    }
    g.lineWidth = 2.5;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, cx = c + Math.cos(a) * 160, cy = c + Math.sin(a) * 160;
      const n = Math.floor(R(3, 4.999));
      for (let q = 0; q < n; q++) {
        g.beginPath(); g.moveTo(cx + R(-10, 10), cy + R(-10, 10)); g.lineTo(cx + R(-10, 10), cy + R(-10, 10)); g.stroke();
      }
    }
  });
  const runeGeo = new THREE.PlaneGeometry(7, 7);
  const runeMatA = addMat({ map: runeTex, color: HUE, opacity: 0, side: THREE.DoubleSide });
  const runeMatB = addMat({ map: runeTex, color: GOLD, opacity: 0, side: THREE.DoubleSide });
  const runeA = new THREE.Group(), runeB = new THREE.Group();
  const rmA = new THREE.Mesh(runeGeo, runeMatA), rmB = new THREE.Mesh(runeGeo, runeMatB);
  rmA.rotation.x = rmB.rotation.x = -Math.PI / 2;
  runeA.add(rmA); runeB.add(rmB);
  runeA.position.set(target.x, 0.03, target.z); runeB.position.set(target.x, 0.04, target.z); runeB.scale.setScalar(0.55);
  runeA.visible = runeB.visible = false; root.add(runeA, runeB);

  // 3. pages
  const NP = 240;
  const pages = pool(scene, NP, new THREE.PlaneGeometry(0.18, 0.25),
    new THREE.MeshStandardMaterial({ color: '#f3ead2', roughness: 0.9, emissive: '#5ab0ff', emissiveIntensity: 0.25, side: THREE.DoubleSide }));
  const white = new THREE.Color('#fff');
  for (let i = 0; i < NP; i++) pages.setColorAt(i, white);
  pages.instanceColor.needsUpdate = true;
  const FLIGHT = 0.9;
  const pd = [];
  for (let p = 0; p < NP; p++) {
    const tl = 0.8 + 0.01 * p;
    const a = R(0, R2), r = 3 * Math.sqrt(R(0, 1));
    pd.push({
      tl, ta: tl + FLIGHT,
      start: bookPos(p % 6, tl, new THREE.Vector3()),
      end: new THREE.Vector3(target.x + Math.cos(a) * r, R(0.2, 3), target.z + Math.sin(a) * r),
      sign: R(0, 1) < 0.5 ? -1 : 1, rx0: R(0, R2), ry: R(0, R2), rz0: R(0, R2),
    });
  }

  // 4. burst streaks (3 per page)
  const NS = NP * 3;
  const sk = streaks(scene, NS);
  const sd = [];
  const qTmp = new THREE.Quaternion();
  const v3 = new THREE.Vector3();
  for (let i = 0; i < NS; i++) {
    v3.set(R(-1, 1), R(0, 1), R(-1, 1)).normalize();
    dummy.position.set(0, 0, 0); dummy.scale.setScalar(1); dummy.lookAt(v3); dummy.updateMatrix();
    qTmp.copy(dummy.quaternion);
    sd.push({ dir: v3.clone(), speed: R(3, 6), q: qTmp.clone(), gold: R(0, 1) < 1 / 3 });
  }
  const tc = new THREE.Color();
  for (let i = 0; i < NS; i++) { tc.copy(sd[i].gold ? GOLD : HUE); sk.setColorAt(i, tc); }
  sk.instanceColor.needsUpdate = true;
  const STREAK_LIFE = 0.35;

  // glows, trails, motes share one additive billboard mesh
  const bb = billboards(scene, 6 + 120 + NP);
  const motes = [];
  for (let b = 0; b < 6; b++) for (let m = 0; m < 20; m++) {
    const t0 = 3.6 + R(0, 0.2);
    motes.push({ b, t0, life: R(0.2, 0.4), off: new THREE.Vector3(R(-0.25, 0.25), R(-0.1, 0.1), R(-0.25, 0.25)), vy: R(0.8, 1.6),
      base: bookPos(b, t0, new THREE.Vector3()) });
  }

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const light = { color: HUE.clone(), intensity: 0, pos: new THREE.Vector3(target.x, target.y + 2, target.z) };
  const out = { light, exposure: 1, shake: 0 };

  function hideAll() {
    root.children.forEach(o => { o.visible = false; });
    dummy.scale.setScalar(0); dummy.position.set(0, 0, 0); dummy.updateMatrix();
    for (let i = 0; i < NP; i++) pages.setMatrixAt(i, dummy.matrix);
    for (let i = 0; i < NS; i++) sk.setMatrixAt(i, dummy.matrix);
    pages.instanceMatrix.needsUpdate = true; sk.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 6 + 120 + NP; i++) bb.hide(i);
    bb.commit();
  }

  function update(lt) {
    if (lt < 0 || lt > duration) { hideAll(); return idle(); }

    // books + glows
    const sOut = 1 - seg(lt, 3.6, 4.2);
    for (let i = 0; i < 6; i++) {
      const bk = books[i];
      const sc = easeOut(seg(lt, 0.05 * i, 0.4 + 0.05 * i)) * sOut;
      if (sc <= 0.001) { bk.g.visible = false; bb.hide(i); continue; }
      bookPos(i, lt, tmp);
      const a = i * 1.047 + lt * 0.8;
      bk.g.position.copy(tmp);
      bk.g.rotation.set(0, -(a + Math.PI / 2), 0.12 * Math.sin(lt * 1.5 + i));
      bk.g.scale.setScalar(sc);
      const open = 1.2 * easeOut(seg(lt, 0.3, 0.8)) * sOut;
      for (const h of bk.hinges) h.pivot.rotation.z = h.sgn * open;
      bk.g.visible = true;
      bb.set(i, tmp, 0.9 * sc, HUE, 0.5 * sc);
    }

    // rune circles
    const ro = easeOut(seg(lt, 0.6, 1.0)) * (1 - seg(lt, 3.4, 3.8));
    const runeOn = lt >= 0.6 && lt < 3.8;
    runeA.visible = runeB.visible = runeOn;
    runeMatA.opacity = runeMatB.opacity = ro;
    runeA.rotation.y = 0.6 * lt; runeB.rotation.y = -0.6 * lt;

    // pages + trails + burst streaks
    for (let p = 0; p < NP; p++) {
      const d = pd[p], dt = lt - d.tl;
      if (dt < 0 || lt >= d.ta) {
        dummy.scale.setScalar(0); dummy.position.set(0, 0, 0); bb.hide(126 + p);
      } else {
        const k = dt / FLIGHT;
        arc(d.start, d.end, 2, k, tmp);
        dummy.position.copy(tmp);
        dummy.rotation.set(d.rx0 + 9 * dt, d.ry, d.rz0 + 6 * dt * d.sign);
        dummy.scale.setScalar(1);
        arc(d.start, d.end, 2, seg(dt - 0.07, 0, FLIGHT), tmp2);
        bb.set(126 + p, tmp2, 0.15, HUE, 0.8);
      }
      dummy.updateMatrix(); pages.setMatrixAt(p, dummy.matrix);
      for (let s = 0; s < 3; s++) {
        const i = p * 3 + s, q = sd[i], sdt = lt - d.ta;
        if (sdt < 0 || sdt > STREAK_LIFE) { dummy.scale.setScalar(0); dummy.position.set(0, 0, 0); }
        else {
          const k = sdt / STREAK_LIFE;
          dummy.position.copy(d.end).addScaledVector(q.dir, q.speed * sdt);
          dummy.quaternion.copy(q.q);
          dummy.scale.set(1, 1, 0.55 * (1 - k) + 0.05);
        }
        dummy.updateMatrix(); sk.setMatrixAt(i, dummy.matrix);
      }
    }
    pages.instanceMatrix.needsUpdate = true; sk.instanceMatrix.needsUpdate = true;

    // closing motes
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i], dt = lt - m.t0;
      if (dt < 0 || dt > m.life) { bb.hide(6 + i); continue; }
      const k = dt / m.life;
      tmp.copy(m.base).add(m.off); tmp.y += m.vy * dt;
      bb.set(6 + i, tmp, 0.14, HUE, 0.9 * bell(k));
    }
    bb.commit();

    light.intensity = 10 + 10 * bell(seg(lt, 0.8, 3.4));
    out.exposure = (lt >= 2.6 && lt < 2.65) ? 1.25 : 1;
    out.shake = 0.2 * bell(seg(lt, 2.6, 3.4));
    return out;
  }

  return { duration, update };
}
