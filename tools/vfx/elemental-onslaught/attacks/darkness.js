import { THREE, seg, easeOut, easeIn, bell, rng, puffTex, addMat, billboards, idle } from '../lib.js';

export function create(ctx) {
  const { scene, target, cam } = ctx;
  const R = rng(303);
  const HUE = new THREE.Color('#7a2cff'), BLACK = new THREE.Color('#050008'), CORE = new THREE.Color('#e8d8ff'), WISP = new THREE.Color('#3a1060');
  const duration = 4.0;
  const root = new THREE.Group(); scene.add(root);
  const voidC = target.clone().add(new THREE.Vector3(0, 2, 0));

  // 2. tendrils
  const tend = [];
  for (let i = 0; i < 8; i++) {
    const a = i * 0.785;
    const start = new THREE.Vector3(Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2);
    const b = R(0, Math.PI * 2), rr = R(0.5, 1.5);
    const end = new THREE.Vector3(target.x + Math.cos(b) * rr, 0.5, target.z + Math.sin(b) * rr);
    const m1 = start.clone().lerp(end, 0.38).add(new THREE.Vector3(R(-1.5, 1.5), 0, R(-1.5, 1.5))); m1.y = R(1, 3);
    const m2 = start.clone().lerp(end, 0.68).add(new THREE.Vector3(R(-1.5, 1.5), 0, R(-1.5, 1.5))); m2.y = R(1, 3);
    const curve = new THREE.CatmullRomCurve3([start, m1, m2, end]);
    const gb = new THREE.TubeGeometry(curve, 80, 0.12, 6);
    const gg = new THREE.TubeGeometry(curve, 80, 0.16, 6);
    const mb = new THREE.Mesh(gb, new THREE.MeshBasicMaterial({ color: BLACK }));
    const mg = new THREE.Mesh(gg, addMat({ color: HUE, opacity: 0.5 }));
    mb.frustumCulled = mg.frustumCulled = false; mb.visible = mg.visible = false;
    root.add(mb, mg);
    tend.push({ gb, gg, mb, mg, nb: gb.index.count, ng: gg.index.count });
  }

  // 3. void sphere
  const voidMat = new THREE.ShaderMaterial({
    uniforms: { uHue: { value: HUE }, uBlack: { value: BLACK } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uHue; uniform vec3 uBlack; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5); gl_FragColor = vec4(mix(uBlack, uHue * 2.0, f), 1.0); }`,
    depthWrite: true,
  });
  const voidMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), voidMat);
  voidMesh.position.copy(voidC); voidMesh.visible = false; root.add(voidMesh);

  // 4. inward motes
  const NM = 160;
  const motes = billboards(scene, NM);
  const mdir = [];
  for (let i = 0; i < NM; i++) {
    const u = R(-1, 1), t = R(0, Math.PI * 2), s = Math.sqrt(1 - u * u);
    mdir.push(new THREE.Vector3(s * Math.cos(t), u, s * Math.sin(t)));
  }

  // 5. rings
  const ringGeo = new THREE.RingGeometry(0.9, 1, 64);
  const ringFlat = new THREE.Mesh(ringGeo.clone().rotateX(-Math.PI / 2), addMat({ color: HUE, opacity: 1, side: THREE.DoubleSide }));
  ringFlat.position.set(target.x, 0.05, target.z);
  const ringVert = new THREE.Mesh(ringGeo, addMat({ color: HUE, opacity: 1, side: THREE.DoubleSide }));
  ringVert.position.copy(voidC);
  ringFlat.visible = ringVert.visible = false; root.add(ringFlat, ringVert);

  // 6. residue
  const NW = 60, NR = 50;
  const wisps = billboards(scene, NW, { map: puffTex, normal: true });
  const embers = billboards(scene, NR);
  const wd = [], ed = [];
  for (let i = 0; i < NW; i++) {
    const a = R(0, Math.PI * 2), r = 3.2 * Math.sqrt(R(0, 1)), s = 2.9 + R(0, 0.3);
    wd.push({ p: new THREE.Vector3(target.x + Math.cos(a) * r, R(0.2, 1), target.z + Math.sin(a) * r), s, life: Math.min(R(0.8, 1.1), 4.0 - s), size: R(1.2, 2.2) });
  }
  for (let i = 0; i < NR; i++) {
    const a = R(0, Math.PI * 2), r = 3.5 * Math.sqrt(R(0, 1)), s = 2.85 + R(0, 0.4);
    ed.push({ p: new THREE.Vector3(target.x + Math.cos(a) * r, R(0.1, 1.5), target.z + Math.sin(a) * r), s, life: Math.min(R(0.7, 1.1), 4.0 - s), drift: R(0.4, 0.9) });
  }

  const tmp = new THREE.Vector3(), col = new THREE.Color();
  const light = { color: HUE.clone(), intensity: 0, pos: voidC.clone() };

  function hideAll() {
    for (const t of tend) t.mb.visible = t.mg.visible = false;
    voidMesh.visible = ringFlat.visible = ringVert.visible = false;
    for (let i = 0; i < NM; i++) motes.hide(i); motes.commit();
    for (let i = 0; i < NW; i++) wisps.hide(i); wisps.commit();
    for (let i = 0; i < NR; i++) embers.hide(i); embers.commit();
  }

  function update(lt) {
    if (lt < 0 || lt > duration) { hideAll(); return idle(); }

    // tendrils
    for (let i = 0; i < 8; i++) {
      const t = tend[i];
      const vis = lt <= 3.4;
      t.mb.visible = t.mg.visible = vis;
      if (vis) {
        const f = easeOut(seg(lt, 0.05 * i, 0.9 + 0.05 * i)) * (1 - seg(lt, 2.9, 3.4));
        t.gb.setDrawRange(0, Math.floor(t.nb * f / 3) * 3);
        t.gg.setDrawRange(0, Math.floor(t.ng * f / 3) * 3);
      }
    }

    // void
    const vOn = lt >= 1.0 && lt <= 2.8;
    voidMesh.visible = vOn;
    if (vOn) {
      const s = 2.5 * easeOut(seg(lt, 1.0, 1.4)) * (1 + 0.05 * Math.sin(lt * 12)) * (1 - easeIn(seg(lt, 2.6, 2.8)));
      voidMesh.scale.setScalar(Math.max(s, 0.0001));
    }

    // inward motes
    for (let i = 0; i < NM; i++) {
      if (!vOn) { motes.hide(i); continue; }
      const k = ((lt - 1.0) / 0.8 + i / NM) % 1;
      tmp.copy(mdir[i]).multiplyScalar(5 * (1 - k)).add(voidC);
      col.copy(HUE).lerp(CORE, k);
      motes.set(i, tmp, 0.1, col, bell(k));
    }
    motes.commit();

    // rings
    const rOn = lt >= 2.8 && lt <= 3.2;
    ringFlat.visible = ringVert.visible = rOn;
    if (rOn) {
      const u = seg(lt, 2.8, 3.2), s = Math.max(9 * easeOut(u), 0.0001);
      ringFlat.scale.setScalar(s); ringVert.scale.setScalar(s);
      ringFlat.material.opacity = ringVert.material.opacity = 1 - u;
      ringVert.lookAt(cam.position);
    }

    // residue
    for (let i = 0; i < NW; i++) {
      const w = wd[i], u = seg(lt, w.s, w.s + w.life);
      if (lt < w.s || lt > w.s + w.life) { wisps.hide(i); continue; }
      tmp.copy(w.p); tmp.y += 0.8 * (lt - w.s);
      wisps.set(i, tmp, w.size * (0.8 + 0.5 * u), WISP, 0.4 * bell(u));
    }
    wisps.commit();
    for (let i = 0; i < NR; i++) {
      const e = ed[i], u = seg(lt, e.s, e.s + e.life);
      if (lt < e.s || lt > e.s + e.life) { embers.hide(i); continue; }
      tmp.copy(e.p); tmp.y += e.drift * (lt - e.s);
      col.copy(CORE).lerp(HUE, u);
      embers.set(i, tmp, 0.08, col, bell(u));
    }
    embers.commit();

    // light, grade, shake
    light.intensity = (vOn ? 12 : 0) + 40 * bell(seg(lt, 2.8, 3.1));
    let exposure;
    if (lt < 1.0) exposure = 1 - 0.6 * seg(lt, 0, 0.9);
    else if (lt < 2.8) exposure = 0.55;
    else if (lt < 2.86) exposure = 1.5;
    else exposure = 0.55 + 0.45 * seg(lt, 2.86, 3.6);
    return { light, exposure, shake: 0.6 * bell(seg(lt, 2.8, 3.2)) };
  }

  return { duration, update };
}
