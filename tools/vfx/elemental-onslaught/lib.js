// Shared contract for every attack module (attacks/<name>.js). Keep this file the single source of helpers.
//
// CONTRACT
//   export function create(ctx) -> { duration, update(lt) }
//   ctx = { scene, hand: THREE.Vector3 (caster's casting hand, world), target: THREE.Vector3 (centre of the hit zone),
//           cam: THREE.Camera }
//   World: caster at the origin facing -Z, ground y = 0, units ≈ metres. target = (0, 0, -12), hit zone radius 4.
//   update(lt): lt = seconds since this attack started; may be < 0 or > duration → everything hidden (scale 0 /
//     visible=false). MUST be a pure function of lt (no state carried between calls) so any frame renders exactly.
//   update returns { light: { color: THREE.Color, intensity, pos: THREE.Vector3 }, exposure, shake }
//     exposure = multiplier on the grade (1 = neutral, 0.4 = dim before a hit, 1.4 = flash), shake = 0..1.
//   Budget per attack: <= 800 instances, <= 4 custom ShaderMaterials, no textures loaded from files.
//   Colour rule: one dominant hue + white-hot core (+ one rare accent). Nothing vanishes clean: fade into wisps,
//   shards or embers. Hide everything at lt < 0 and lt > duration.
import * as THREE from 'three';
export { THREE };

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));          // 0..1 progress of t through [a, b]
export const easeOut = x => 1 - Math.pow(1 - x, 3);
export const easeIn = x => x * x * x;
export const backOut = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
export const bell = x => (x <= 0 || x >= 1) ? 0 : Math.sin(Math.PI * x); // 0 → 1 → 0 over life
export function rng(seed) { let s = seed % 2147483647 || 1; return (a = 0, b = 1) => a + (b - a) * ((s = (s * 16807) % 2147483647) / 2147483647); }

export function canvasTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const softTex = canvasTex(64, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, '#fff'); r.addColorStop(0.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
});
// puffy cloud/smoke sprite (several soft blobs), for normal-blended smoke and gas
export const puffTex = canvasTex(128, (g, s) => {
  const R = rng(11);
  for (let i = 0; i < 9; i++) { const x = s / 2 + R(-22, 22), y = s / 2 + R(-22, 22), r = R(18, 34);
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
});
// additive unlit material for glows, sparks, cores
export const addMat = (o = {}) => new THREE.MeshBasicMaterial({ color: '#fff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, ...o });
// sprite material: additive by default, pass { blending: THREE.NormalBlending, map: puffTex } for smoke
export const spriteMat = (o = {}) => new THREE.SpriteMaterial({ map: softTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, ...o });
// fixed instanced pool; per-instance colour via setColorAt. Hide an instance with scale 0.
export function pool(scene, n, geo, mat) {
  const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false;
  for (let i = 0; i < n; i++) m.setColorAt(i, new THREE.Color(0, 0, 0));
  scene.add(m); return m;
}
// camera-facing soft particles as one InstancedMesh of quads (cheaper than many Sprites):
// set(i, pos, size, color, alpha) then commit(). Additive unless normal = true (smoke/gas).
export function billboards(scene, n, { map = softTex, normal = false } = {}) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: map } }, transparent: true, depthWrite: false,
    blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending,
    vertexShader: `attribute vec4 aCol; varying vec4 vCol; varying vec2 vUv;
      void main(){ vUv = uv; vCol = aCol; vec3 c = instanceMatrix[3].xyz; float s = length(instanceMatrix[0].xyz);
        vec4 mv = viewMatrix * vec4(c, 1.0); mv.xy += position.xy * s; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; varying vec4 vCol; varying vec2 vUv;
      void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(vCol.rgb * t.rgb, t.a * vCol.a); }`,
  });
  const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const col = new Float32Array(n * 4); const attr = new THREE.InstancedBufferAttribute(col, 4); attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aCol', attr); scene.add(m);
  const M = new THREE.Matrix4();
  return {
    mesh: m,
    set(i, pos, size, color, alpha = 1) { M.makeScale(size, size, size); M.setPosition(pos); m.setMatrixAt(i, M); color.toArray(col, i * 4); col[i * 4 + 3] = alpha; },
    hide(i) { M.makeScale(0, 0, 0); m.setMatrixAt(i, M); col[i * 4 + 3] = 0; },
    commit() { m.instanceMatrix.needsUpdate = true; attr.needsUpdate = true; },
  };
}
// streak sparks oriented along velocity: pool of unit boxes stretched on Z
export function streaks(scene, n, width = 0.02) {
  const g = new THREE.BoxGeometry(width, width, 1); g.translate(0, 0, -0.5);
  return pool(scene, n, g, addMat());
}
export const dummy = new THREE.Object3D();
export const tmpV = new THREE.Vector3();
// point on a parabolic arc from a to b with apex height h, k in 0..1
export function arc(a, b, h, k, out = new THREE.Vector3()) { out.lerpVectors(a, b, k); out.y += 4 * h * k * (1 - k); return out; }
// standard "nothing" return for update when inactive
export const idle = () => ({ light: { color: new THREE.Color(0, 0, 0), intensity: 0, pos: new THREE.Vector3() }, exposure: 1, shake: 0 });
