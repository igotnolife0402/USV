// Toon look (scene env.look = 'toon'): the offline-render thumbnail style in the live view. Ink outlines: every solid mesh drawn
// again as its back faces pushed out along the normals by a fixed number of pixels (an inverted hull, one extra pass,
// no per-object copies); Standard view (no tone mapping) and a brighter environment (viewport.js). Bevel boxes
// (`bevel` on a box part) give the smooth normals the hull needs. Hero glow (`glow`, `glowWidth`): a coloured halo just
// outside an object's visible silhouette, under the ink, live and rendered. `look.render` renders the camera at 1920x1080
// with 4x MSAA: solid meshes, screen-space AO, glass/effects/text, ink, then bloom, halo, vibrance and contrast (the
// thumbnail tool's finish, on the GPU) with the sun's shadow map at 4096, and offers the PNG. AO and the big map: render only.
import * as THREE from 'three'

const outline = new THREE.ShaderMaterial({
  uniforms: { width: { value: 2.5 }, res: { value: new THREE.Vector2(1, 1) }, ink: { value: new THREE.Color('#160c12') }, alpha: { value: 1 } },
  vertexShader: `uniform float width; uniform vec2 res;
void main() {
  vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec4 n = projectionMatrix * vec4(normalize(normalMatrix * normal), 0.0);
  float l = length(n.xy); if (l > 1e-6) c.xy += n.xy / l * width * 2.0 / res * c.w;
  gl_Position = c;
}`,
  fragmentShader: `uniform vec3 ink; uniform float alpha; void main() { gl_FragColor = vec4(ink, alpha); }`,   // render: alpha 0 marks ink, so bloom never greys it
  side: THREE.BackSide
})
const solid = o => o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible && !o.userData.helper && o.material && !o.material.transparent && !o.material.isShaderMaterial && !o.material.isMeshBasicMaterial

const _size = new THREE.Vector2(), _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4()
// Runs a render with the scene and camera changed only for its length (layers, background, override, no shadow or matrix work:
// the main render just did both), then puts every setting back.
function over(r, scene, cam, layer, mat, fn) {
  const mask = cam.layers.mask, bg = scene.background, ov = scene.overrideMaterial, ac = r.autoClear, sh = r.shadowMap.autoUpdate, sn = r.shadowMap.needsUpdate, mw = scene.matrixWorldAutoUpdate
  if (layer != null) cam.layers.set(layer)
  scene.background = null; scene.overrideMaterial = mat; r.autoClear = false; r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = false; scene.matrixWorldAutoUpdate = false
  try { fn() } finally { cam.layers.mask = mask; scene.background = bg; scene.overrideMaterial = ov; r.autoClear = ac; r.shadowMap.autoUpdate = sh; r.shadowMap.needsUpdate = sn; scene.matrixWorldAutoUpdate = mw }
}
// Direct draws: one render of a one-object scene whose hook draws a list of [mesh, material] straight (no second walk, sort or
// light setup of the whole scene, no material swapped on a scene object): a third of the ink pass's cost.
const HOST = new THREE.Scene(), hostMesh = new THREE.Mesh(new THREE.BufferGeometry(), outline)
let ITEMS = []
hostMesh.frustumCulled = false; HOST.add(hostMesh)
hostMesh.onAfterRender = (r, _s, cam) => {
  _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse))
  for (const [o, m] of ITEMS) {
    if (o.frustumCulled && !o.isSkinnedMesh && !_frustum.intersectsObject(o)) continue
    o.modelViewMatrix.multiplyMatrices(cam.matrixWorldInverse, o.matrixWorld); o.normalMatrix.getNormalMatrix(o.modelViewMatrix)
    r.renderBufferDirect(cam, HOST, o.geometry, m, o, null)
  }
}
function direct(r, cam, items) { ITEMS = items; try { over(r, HOST, cam, null, null, () => r.render(HOST, cam)) } finally { ITEMS = [] } }
function inkPass(r, scene, cam, px, target, alpha = 1) {        // after a normal render: hull back faces, depth tested, over the picture
  const hulls = []; scene.traverseVisible(o => { if (solid(o)) hulls.push([o, outline]) })
  if (!hulls.length) return
  if (target) _size.set(target.width, target.height); else r.getDrawingBufferSize(_size)
  outline.uniforms.res.value.copy(_size); outline.uniforms.width.value = px; outline.uniforms.alpha.value = alpha
  direct(r, cam, hulls)
}

// ---------- finished render: MSAA HDR frame -> outlines -> bloom -> grade -> PNG ----------
const QUAD = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), QCAM = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), QS = new THREE.Scene(); QS.add(QUAD)
const VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
const SRGB = `vec3 srgb(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }`
// AgX with a punchy filmic look (power 1.35, saturation 2.0: natural highlights, colour that stays bright) for the roblox look:
// the live view gets it as three's CustomToneMapping (patched below, before any shader compiles), the render through tm()
const AGX = `vec3 agxC(vec3 x) { vec3 x2 = x * x, x4 = x2 * x2; return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232; }
vec3 agxPunchy(vec3 c) {                       // exposed linear sRGB -> display-linear sRGB, three r186's AgX + the look
  c = mat3(0.6274, 0.0691, 0.0164, 0.3293, 0.9195, 0.0880, 0.0433, 0.0113, 0.8956) * c;
  c = mat3(0.856627153315983, 0.137318972929847, 0.11189821299995, 0.0951212405381588, 0.761241990602591, 0.0767994186031903, 0.0482516061458583, 0.101439036467562, 0.811302368396859) * c;
  c = agxC(clamp((log2(max(c, 1e-10)) + 12.47393) / 16.49999, 0.0, 1.0));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = l + 2.0 * (pow(max(c, 0.0), vec3(1.35)) - l);
  c = mat3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826, -0.11060664309660323, 1.157823702216272, -0.11060664309660294, -0.016493938717834573, -0.016493938717834257, 1.2519364065950405) * c;
  return clamp(mat3(1.6605, -0.1246, -0.0182, -0.5876, 1.1329, -0.1006, -0.0728, -0.0083, 1.1187) * pow(max(c, 0.0), vec3(2.2)), 0.0, 1.0);
}`
THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace('vec3 CustomToneMapping( vec3 color ) { return color; }', `${AGX}
vec3 CustomToneMapping( vec3 color ) { return agxPunchy( color * toneMappingExposure ); }`)
// the live view's tone mapping, so a render matches what the viewport shows: tone 0 none (toon: Standard view), 1 Neutral
// (normal look), 2 AgX Punchy (roblox look)
const toneId = r => r.toneMapping === THREE.NeutralToneMapping ? 1 : r.toneMapping === THREE.CustomToneMapping ? 2 : 0
const TONE = `uniform float tone, expo; ${AGX}
vec3 tm(vec3 c) {
  if (tone < 0.5) return c;
  c *= expo;
  if (tone > 1.5) return agxPunchy(c);
  float x = min(c.r, min(c.g, c.b)), o = x < 0.08 ? x - 6.25 * x * x : 0.04; c -= o;
  float p = max(c.r, max(c.g, c.b)); if (p < 0.76) return c; float d = 0.24, np = 1.0 - d * d / (p + d - 0.76); c *= np / p;
  return mix(c, vec3(np), 1.0 - 1.0 / (0.15 * (p - np) + 1.0)); }`
// Per look finish (render). roblox, the owner's thumbnail style: realistic light, no ink, stronger wider AO, light bloom,
// little vibrance, a thin rim glow, a vignette and a slight sharpen. normal keeps the toon numbers it always had.
const LOOKS = {
  toon: { ink: 4.5, aoR: 0.12, aoMax: 2.5, aoK: 0.72, bloom: 0.55, hdr: 0, vib: 0.22, con: 0.08, vig: 0, sharp: 0, glowW: 14, rim: 0, sig: 0.9 },
  roblox: { ink: 0, aoR: 0.16, aoMax: 3.5, aoK: 0.8, bloom: 0.45, hdr: 2.5, vib: 0.26, con: 0.06, vig: 0.22, sharp: 0.35, glowW: 6, rim: 1, sig: 0.6 }
}
LOOKS.normal = { ...LOOKS.toon, ink: 0 }
const lookOf = app => LOOKS[(app.scene.env || {}).look] || LOOKS.normal
// glow halo strength from blurred coverage: full at the silhouette, gone about glowWidth px out
// soft glow (toon) or, rim > 0.5, a clean thin stroke (roblox: the cut-out rim of the references)
const HALO = `uniform float rim;
vec3 halo(vec4 m, vec4 b) { float k = (rim > 0.5 ? smoothstep(0.05, 0.16, b.a) : pow(clamp(b.a * 3.0, 0.0, 1.0), 0.75)) * (1.0 - m.a); return b.rgb / max(b.a, 1e-4) * k; }`
const pass = (fs, u = {}) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: { t: { value: null }, t2: { value: null }, t3: { value: null }, dir: { value: new THREE.Vector2() }, tone: { value: 0 }, expo: { value: 1 }, rim: { value: 0 }, ...u }, depthTest: false, depthWrite: false })
// bloom source: toon/normal take what shows bright; hdr > 0 (roblox) only real highlights (lamps, neon, sun glints: light energy
// above hdr after exposure), so a lit white wall never haloes
const BRIGHT = pass(`uniform sampler2D t; uniform float hdr; varying vec2 vUv; ${SRGB} ${TONE}
void main() { vec3 c = texture2D(t, vUv).rgb, a = srgb(tm(c)); float l = dot(a, vec3(0.2126, 0.7152, 0.0722)), e = dot(c, vec3(0.2126, 0.7152, 0.0722)) * expo;
  gl_FragColor = vec4(a * (hdr > 0.0 ? smoothstep(hdr, hdr * 3.0, e) : clamp((l - 0.72) / 0.28, 0.0, 1.0)), 1.0); }`, { hdr: { value: 0 } })
const BLUR = pass(`uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;
void main() { vec3 s = vec3(0.0); float w = 0.0;
  for (int i = -6; i <= 6; i++) { float k = exp(-float(i * i) / 18.0); s += texture2D(t, vUv + dir * float(i)).rgb * k; w += k; }
  gl_FragColor = vec4(s / w, 1.0); }`)
const GRADE = pass(`uniform sampler2D t, t2, t3, tGm, tGb; uniform float glow, bloom, vib, con, vig, sharp; uniform vec2 px; varying vec2 vUv; ${SRGB} ${TONE} ${HALO}
vec3 shown(vec2 uv) { return srgb(tm(texture2D(t, uv).rgb)); }
void main() {                                  // the thumbnail finish: sharpen, screen-blend bloom and halo (never over ink), vibrance on dull colours, contrast, vignette
  vec4 m = texture2D(t, vUv); vec3 a = srgb(tm(m.rgb)), g = texture2D(t2, vUv).rgb * 0.6 + texture2D(t3, vUv).rgb * 0.6;
  if (sharp > 0.0) a = clamp(a + (a - 0.25 * (shown(vUv + vec2(px.x, 0.0)) + shown(vUv - vec2(px.x, 0.0)) + shown(vUv + vec2(0.0, px.y)) + shown(vUv - vec2(0.0, px.y)))) * sharp, 0.0, 1.0);
  float bare = clamp(m.a, 0.0, 1.0);
  a = 1.0 - (1.0 - a) * (1.0 - clamp(g, 0.0, 1.0) * bloom * bare);
  if (glow > 0.5) a = 1.0 - (1.0 - a) * (1.0 - halo(texture2D(tGm, vUv), texture2D(tGb, vUv)) * bare);
  float mx = max(a.r, max(a.g, a.b)), av = (a.r + a.g + a.b) / 3.0;
  a = clamp(a + (a - av) * clamp(1.0 - (mx - av) * 2.5, 0.0, 1.0) * vib, 0.0, 1.0);
  a = a + (a - 0.5) * con * (1.0 - abs(a - 0.5) * 2.0);
  a *= 1.0 - vig * smoothstep(0.35, 1.0, length(vUv - 0.5) * 1.414);
  vec2 q = gl_FragCoord.xy;                    // triangular dither, +-1 level: 8-bit output never bands
  a += (fract(52.9829189 * fract(dot(q, vec2(0.06711056, 0.00583715)))) + fract(52.9829189 * fract(dot(q + 23.0, vec2(0.06711056, 0.00583715)))) - 1.0) / 255.0;
  gl_FragColor = vec4(a, 1.0); }`, { tGm: { value: null }, tGb: { value: null }, glow: { value: 0 }, bloom: { value: 0.55 }, vib: { value: 0.22 }, con: { value: 0.08 }, vig: { value: 0 }, sharp: { value: 0 }, px: { value: new THREE.Vector2() } })
function draw(r, mat, target, keep) { QUAD.material = mat; r.setRenderTarget(target); const ac = r.autoClear; if (keep) r.autoClear = false; r.render(QS, QCAM); r.autoClear = ac }
const blend = (m, src, dst) => Object.assign(m, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: src, blendDst: dst, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor })

// ---------- ambient occlusion (finished render only): normals + depth of the solid meshes -> 16-sample hemisphere SSAO ->
// depth-aware blur -> multiplied into the HDR frame before the transparent pass, ink and bloom ----------
const AO_LAYER = 8, LATE_LAYER = 9
const NORMALS = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide })
const KERNEL = Array.from({ length: 16 }, (_, i) => {        // cosine-weighted hemisphere (golden-angle spiral), lengths spread 0.15..1
  const u = (i + 0.5) / 16, r = Math.sqrt(u), a = i * 2.399963, k = ((i * 7) % 16 + 1) / 16
  return new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), Math.sqrt(1 - u)).multiplyScalar(0.15 + 0.85 * k * k)
})
const VIEWPOS = `uniform mat4 projInv; vec3 viewPos(vec2 uv, float d) { vec4 p = projInv * vec4(vec3(uv, d) * 2.0 - 1.0, 1.0); return p.xyz / p.w; }`
const SSAO = pass(`uniform sampler2D t, t2; uniform mat4 proj; uniform vec3 kernel[16]; uniform float radius; varying vec2 vUv; ${VIEWPOS}
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {                                  // t: normals (view space), t2: depth; out: visibility 1 = open
  float d = texture2D(t2, vUv).x;
  if (d >= 1.0) { gl_FragColor = vec4(1.0); return; }
  vec3 P = viewPos(vUv, d), N = normalize(texture2D(t, vUv).xyz * 2.0 - 1.0);
  float a = ign(gl_FragCoord.xy) * 6.2831853; vec3 rv = vec3(cos(a), sin(a), 0.5);
  vec3 T = rv - N * dot(rv, N); if (dot(T, T) < 1e-4) T = vec3(N.z, 0.0, -N.x); T = normalize(T);
  mat3 tbn = mat3(T, cross(N, T), N);
  P += N * radius * 0.02;
  float occ = 0.0;
  for (int i = 0; i < 16; i++) {
    vec3 S = P + tbn * kernel[i] * radius;
    vec4 q = proj * vec4(S, 1.0); vec2 uv = q.xy / q.w * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) continue;
    float sz = viewPos(uv, texture2D(t2, uv).x).z;
    occ += step(S.z + radius * 0.03, sz) * (1.0 - smoothstep(0.75 * radius, 1.25 * radius, sz - P.z));   // nothing from a part far in front (no dark halo behind it)
  }
  gl_FragColor = vec4(vec3(1.0 - occ / 16.0), 1.0);
}`, { proj: { value: new THREE.Matrix4() }, projInv: { value: new THREE.Matrix4() }, kernel: { value: KERNEL }, radius: { value: 1 } })
const AOBLUR = pass(`uniform sampler2D t, t2; uniform vec2 dir; varying vec2 vUv; ${VIEWPOS}
void main() {                                  // separable Gaussian that stops at depth jumps (silhouettes keep their edge)
  float z0 = viewPos(vUv, texture2D(t2, vUv).x).z, s = 0.0, w = 0.0;
  for (int i = -4; i <= 4; i++) {
    vec2 uv = vUv + dir * float(i); float z = viewPos(uv, texture2D(t2, uv).x).z;
    float k = exp(-float(i * i) / 10.0) * exp(-abs(z - z0) * 40.0 / abs(z0));
    s += texture2D(t, uv).r * k; w += k;
  }
  gl_FragColor = vec4(vec3(s / w), 1.0); }`, { projInv: { value: new THREE.Matrix4() } })
// AO goes in where it shows: a multiplier on the displayed colour (a plain HDR multiply vanished on lit white, 3.0 * 0.8 still
// clips to white). Toon: clamp (what the Standard view shows anyway) then darken; normal look: lower the Neutral curve's peak.
const COPY = pass(`uniform sampler2D t; varying vec2 vUv; void main() { gl_FragColor = texture2D(t, vUv); }`)
const AOMIX = pass(`uniform sampler2D t, t2; uniform float aoK; varying vec2 vUv; ${SRGB} ${TONE}
float shownL(vec3 c) { return dot(srgb(tm(c)), vec3(0.2126, 0.7152, 0.0722)); }
void main() {                                  // t: the frame so far, t2: blurred visibility
  vec4 c = texture2D(t, vUv); float o = 1.0 - texture2D(t2, vUv).r;
  float f = 1.0 - aoK * smoothstep(0.04, 0.5, o);   // open faces (o < 0.04) untouched; a 90-degree crease ~ x0.3
  if (f < 0.999) {
    if (tone < 0.5) c.rgb = min(c.rgb, vec3(1.0)) * pow(f, 2.2);   // Standard view: x f on screen = x f^2.2 in linear light
    else {                                     // a tone curve: less light, by however much shows f darker (bisection in stops)
      float want = shownL(c.rgb) * f, lo = -10.0, hi = 0.0;
      for (int i = 0; i < 10; i++) { float mid = 0.5 * (lo + hi); if (shownL(c.rgb * exp2(mid)) > want) hi = mid; else lo = mid; }
      c.rgb *= exp2(0.5 * (lo + hi));
    }
  }
  gl_FragColor = c; }`, { aoK: { value: 0.72 } })

// ---------- hero glow: `glow: "#ffd21f"` (+ `glowWidth`, px at 1080p) on any object -> a coloured halo just outside its
// silhouette, under the ink. Glow meshes drawn flat in their colour into a mask, blurred small, screened on outside the mask. ----------
const GLOW_MATS = new Map()
const glowMat = c => { let m = GLOW_MATS.get(c); if (!m) GLOW_MATS.set(c, m = new THREE.MeshBasicMaterial({ color: new THREE.Color().setStyle(c, THREE.LinearSRGBColorSpace), fog: false, side: THREE.DoubleSide })); return m }   // raw sRGB numbers: mixed on screen
let GLOW_IDS = null                              // [[id, colour, width]]; rebuilt on the first frame after any change, so a frame never walks the scene
function glowList(app) {
  if (!GLOW_IDS) { GLOW_IDS = []; for (const [id, d] of Object.entries(app.scene.objects || {})) if (d?.glow && d.type !== 'text' && d.visible !== false) GLOW_IDS.push([id, String(d.glow), +d.glowWidth > 0 ? +d.glowWidth : 0]) }
  const out = [], objs = app.viewport.objects, dw = lookOf(app).glowW          // no glowWidth: the look's (toon 14, roblox a thin 6)
  for (const [id, c, w] of GLOW_IDS) { const o3 = objs?.get(id); if (o3) out.push([o3, c, w || dw]) }
  return out
}
const DOWN4 = pass(`uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;   // 4 bilinear taps: a 4x4 box, so a moving edge never flickers
void main() { gl_FragColor = 0.25 * (texture2D(t, vUv + dir * vec2(-1.0, -1.0)) + texture2D(t, vUv + dir * vec2(1.0, -1.0)) + texture2D(t, vUv + dir * vec2(-1.0, 1.0)) + texture2D(t, vUv + dir * vec2(1.0, 1.0))); }`)
const GBLUR = pass(`uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;
void main() { vec4 s = vec4(0.0); float w = 0.0;
  for (int i = -6; i <= 6; i++) { float k = exp(-float(i * i) / 18.0); s += texture2D(t, vUv + dir * float(i)) * k; w += k; }
  gl_FragColor = s / w; }`)
const GLOWMIX = blend(pass(`uniform sampler2D t, t2; varying vec2 vUv; ${HALO}
void main() { gl_FragColor = vec4(halo(texture2D(t, vUv), texture2D(t2, vUv)), 1.0); }`), THREE.OneFactor, THREE.OneMinusSrcColorFactor)   // screen: 1-(1-a)(1-g)
// Draws the glow mask of `list` into `mask` (cleared) and leaves the blurred halo in `A` (B is scratch); scale: px per 1080p px.
const reach = (list, scale, sig) => Math.max(...list.map(g => g[2])) * scale * sig * 3     // 3 sigma: where the halo has faded out
// Only the glow meshes' visible pixels: whatever opaque could stand in front (nearer than the hero's far side) goes first as
// depth only, so a hero behind a wall never haloes through it.
const DEPTH = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }), _sph = new THREE.Sphere()
// The mesh's bounding sphere in view space -> [near z, far z, x0, y0, x1, y1] (z, and NDC bounds from the sphere's exact
// tangents), null: unknown or around the camera (always drawn).
function viewSphere(o, cam) {
  if (o.isSkinnedMesh || o.isInstancedMesh || o.isBatchedMesh) return null
  if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere()
  _sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld).center.applyMatrix4(cam.matrixWorldInverse)
  const { x, y, z } = _sph.center, rad = _sph.radius, e = cam.projectionMatrix.elements, out = [z + rad, z - rad]
  if (!cam.isPerspectiveCamera) return out.concat([(x - rad) * e[0] + e[12], (y - rad) * e[5] + e[13], (x + rad) * e[0] + e[12], (y + rad) * e[5] + e[13]])
  const d = -z, q = d * d - rad * rad
  if (d - rad <= cam.near || q <= 0) return null
  const tx = rad * Math.sqrt(x * x + q), ty = rad * Math.sqrt(y * y + q)
  return out.concat([(x * d - tx) / q * e[0], (y * d - ty) / q * e[5], (x * d + tx) / q * e[0], (y * d + ty) / q * e[5]])
}
function glowMask(r, scene, cam, list, mask, A, B, scale, sig) {
  const items = [], mine = new Set(), H = [Infinity, Infinity, Infinity, -Infinity, -Infinity]   // hero: far z, NDC box
  let known = true
  for (const [o3, c] of list) {
    const m = glowMat(c)
    o3.traverseVisible(o => {
      if (!o.isMesh) return
      items.push([o, m]); mine.add(o); const v = viewSphere(o, cam)
      if (!v) { known = false; return }
      H[0] = Math.min(H[0], v[1]); H[1] = Math.min(H[1], v[2]); H[2] = Math.min(H[2], v[3]); H[3] = Math.max(H[3], v[4]); H[4] = Math.max(H[4], v[5])
    })
  }
  const occ = []                                 // only what can cover the hero: nearer than its far side, overlapping it on screen
  scene.traverseVisible(o => {
    if (!o.isMesh || mine.has(o) || o.userData.helper || mats(o).some(m => m.transparent || !m.visible || !m.depthWrite)) return
    const v = known && viewSphere(o, cam)
    if (!v || (v[0] > H[0] && v[2] < H[3] && v[4] > H[1] && v[3] < H[4] && v[5] > H[2])) occ.push([o, DEPTH])
  })
  const cc = r.getClearColor(_cc), ca = r.getClearAlpha()
  r.setRenderTarget(mask); r.setClearColor(0x000000, 0); r.clear(); r.setClearColor(cc, ca)
  direct(r, cam, occ.concat(items))
  const k = mask.width / A.width, wpx = Math.max(...list.map(g => g[2])) * scale          // sigma: toon 0.9 x width (~40% at glowWidth px), roblox rim 0.6
  DOWN4.uniforms.t.value = mask.texture; DOWN4.uniforms.dir.value.set(k / 4 / mask.width, k / 4 / mask.height); draw(r, DOWN4, A)
  const st = wpx * sig / k / 3
  GBLUR.uniforms.t.value = A.texture; GBLUR.uniforms.dir.value.set(st / A.width, 0); draw(r, GBLUR, B)
  GBLUR.uniforms.t.value = B.texture; GBLUR.uniforms.dir.value.set(0, st / A.height); draw(r, GBLUR, A)
}
const _cc = new THREE.Color()
const LIVE = {}            // live glow targets, kept while glow objects exist, resized with the canvas
function liveGlow(app, r, scene, cam) {
  const list = glowList(app)
  if (!list.length) { if (LIVE.mask) { for (const k of ['mask', 'A', 'B']) LIVE[k].dispose(); LIVE.mask = null } return }
  r.getDrawingBufferSize(_size); const w = Math.max(4, _size.x), h = Math.max(4, _size.y), q = [Math.ceil(w / 4), Math.ceil(h / 4)]
  if (!LIVE.mask) { LIVE.mask = new THREE.WebGLRenderTarget(w, h); LIVE.A = new THREE.WebGLRenderTarget(...q); LIVE.B = new THREE.WebGLRenderTarget(...q) }
  else if (LIVE.mask.width !== w || LIVE.mask.height !== h) { LIVE.mask.setSize(w, h); LIVE.A.setSize(...q); LIVE.B.setSize(...q) }
  const prev = r.getRenderTarget()
  const L = lookOf(app)
  glowMask(r, scene, cam, list, LIVE.mask, LIVE.A, LIVE.B, h / 1080, L.sig)
  GLOWMIX.uniforms.t.value = LIVE.mask.texture; GLOWMIX.uniforms.t2.value = LIVE.A.texture; GLOWMIX.uniforms.rim.value = L.rim
  // the full-screen mix only where the halo can be: the glow objects' screen box plus its reach (iPhone: ~3M px saved per frame)
  const rect = prev ? null : screenRect(list, cam, w, h, reach(list, h / 1080, L.sig) + 4), pr = r.getPixelRatio()
  if (rect) { r.setScissorTest(true); r.setScissor(rect[0] / pr, rect[1] / pr, rect[2] / pr, rect[3] / pr) }
  try { draw(r, GLOWMIX, prev, true) } finally { if (rect) { r.setScissorTest(false); r.setScissor(0, 0, w / pr, h / pr) } }
}
const _box3 = new THREE.Box3(), _v3 = new THREE.Vector3()
function screenRect(list, cam, w, h, pad) {      // drawing-buffer px, bottom-left origin; null: use the whole screen
  _box3.makeEmpty()
  for (const [o3] of list) { let skin = false; o3.traverseVisible(o => { skin ||= o.isSkinnedMesh }); if (skin) return null; _box3.expandByObject(o3) }   // a skinned box lags its pose
  if (_box3.isEmpty()) return null
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i < 8; i++) {
    _v3.set(i & 1 ? _box3.max.x : _box3.min.x, i & 2 ? _box3.max.y : _box3.min.y, i & 4 ? _box3.max.z : _box3.min.z).applyMatrix4(cam.matrixWorldInverse)
    if (cam.isPerspectiveCamera && _v3.z > -cam.near) return null
    _v3.applyMatrix4(cam.projectionMatrix)
    x0 = Math.min(x0, _v3.x); x1 = Math.max(x1, _v3.x); y0 = Math.min(y0, _v3.y); y1 = Math.max(y1, _v3.y)
  }
  const X0 = Math.max(0, Math.floor((x0 + 1) / 2 * w - pad)), Y0 = Math.max(0, Math.floor((y0 + 1) / 2 * h - pad))
  const X1 = Math.min(w, Math.ceil((x1 + 1) / 2 * w + pad)), Y1 = Math.min(h, Math.ceil((y1 + 1) / 2 * h + pad))
  return X1 > X0 && Y1 > Y0 ? [X0, Y0, X1 - X0, Y1 - Y0] : [0, 0, 0, 0]
}

const mats = o => Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
const late = m => m.transparent || m.isShaderMaterial || m.isMeshBasicMaterial || m.alphaTest > 0 || !(m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial || m.isMeshToonMaterial || m.isMeshMatcapMaterial || m.isMeshNormalMaterial)
// Sorts the drawn scene: solid lit meshes take AO (layer 8), everything else (glass, effects, text, unlit, lines) draws after it
// (layer 9), so AO never greys a flipbook, a text card or the glow of a beam. Returns the undo.
function split(scene, cam) {
  const ao = [], lt = [], lights = [], lateMats = new Set(), hide = new Set(), kept = new Map()
  scene.traverseVisible(o => {
    if (o.isLight) return lights.push(o)
    if (!o.layers.test(cam.layers) || !(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return
    const ms = mats(o), lm = ms.filter(m => o.isMesh ? late(m) : true)
    if (!lm.length && o.isMesh && !o.userData.helper) return ao.push(o)
    lt.push(o); for (const m of lm) lateMats.add(m)
    for (const m of ms) if (!lm.includes(m)) hide.add(m)
  })
  for (const o of ao) o.layers.enable(AO_LAYER)
  for (const o of [...lt, ...lights]) o.layers.enable(LATE_LAYER)
  return {
    ao: ao.length, late: lt.length,
    solidOnly(on) { for (const m of lateMats) { if (on) { kept.set(m, [m.colorWrite, m.depthWrite]); m.colorWrite = m.depthWrite = false } else [m.colorWrite, m.depthWrite] = kept.get(m) } },
    lateOnly(on) { for (const m of hide) { if (on) { kept.set(m, m.visible); m.visible = false } else m.visible = kept.get(m) } },
    undo() { for (const o of ao) o.layers.disable(AO_LAYER); for (const o of [...lt, ...lights]) o.layers.disable(LATE_LAYER) }
  }
}
function aoPass(r, scene, cam, w, h, main, vp, L) {
  const nd = new THREE.WebGLRenderTarget(w, h, { depthTexture: new THREE.DepthTexture(w, h) }), A = new THREE.WebGLRenderTarget(w, h), B = new THREE.WebGLRenderTarget(w, h)
  const snap = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType })
  const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha()
  try {
    r.setRenderTarget(nd); r.setClearColor(0x8080ff, 1); r.clear(); r.setClearColor(cc, ca)
    over(r, scene, cam, AO_LAYER, NORMALS, () => r.render(scene, cam))
    // radius in studs: a share of the view distance, so a close-up and a wide map both get creases a few studs deep at most
    const dist = cam.isPerspectiveCamera ? cam.position.distanceTo(vp.orbit?.target || new THREE.Vector3()) : (cam.top - cam.bottom) / cam.zoom * 0.6
    SSAO.uniforms.t.value = nd.texture; SSAO.uniforms.t2.value = nd.depthTexture
    SSAO.uniforms.proj.value.copy(cam.projectionMatrix); SSAO.uniforms.projInv.value.copy(cam.projectionMatrixInverse); SSAO.uniforms.radius.value = Math.min(L.aoMax, Math.max(0.4, dist * L.aoR))
    draw(r, SSAO, A)
    AOBLUR.uniforms.projInv.value.copy(cam.projectionMatrixInverse); AOBLUR.uniforms.t2.value = nd.depthTexture
    const k = Math.max(1, h / 1080) * 1.5
    AOBLUR.uniforms.t.value = A.texture; AOBLUR.uniforms.dir.value.set(k / w, 0); draw(r, AOBLUR, B)
    AOBLUR.uniforms.t.value = B.texture; AOBLUR.uniforms.dir.value.set(0, k / h); draw(r, AOBLUR, A)
    // the frame is copied out first, then written back AO'd: main keeps its depth for the transparent pass and the ink
    COPY.uniforms.t.value = main.texture; draw(r, COPY, snap)
    AOMIX.uniforms.t.value = snap.texture; AOMIX.uniforms.t2.value = A.texture
    AOMIX.uniforms.tone.value = toneId(r); AOMIX.uniforms.expo.value = r.toneMappingExposure; AOMIX.uniforms.aoK.value = L.aoK
    draw(r, AOMIX, main, true)
  } finally { nd.depthTexture.dispose(); for (const t of [nd, A, B, snap]) t.dispose() }
}

async function renderImage(app, w = 1920, h = 1080, opt = {}) {
  const vp = app.viewport, r = vp.renderer, scene = vp.scene, cam = vp.camera.clone(), L = lookOf(app)
  if (cam.isPerspectiveCamera) cam.aspect = w / h; else { const k = (cam.top - cam.bottom) / 2; cam.left = -k * w / h; cam.right = k * w / h }
  cam.updateProjectionMatrix()
  const hidden = []; for (const o of [vp.helpers, vp.gizmo, vp.grid]) if (o?.visible) { o.visible = false; hidden.push(o) }
  vp.world.traverse(c => { if ((c.userData.lightHelper || c.userData.helper) && c.visible) { c.visible = false; hidden.push(c) } })
  const HDR = { type: THREE.HalfFloatType }, main = new THREE.WebGLRenderTarget(w, h, { ...HDR, samples: 4 })
  const a1 = new THREE.WebGLRenderTarget(w / 2, h / 2, HDR), b1 = new THREE.WebGLRenderTarget(w / 2, h / 2, HDR), a2 = new THREE.WebGLRenderTarget(w / 8, h / 8, HDR), b2 = new THREE.WebGLRenderTarget(w / 8, h / 8, HDR)
  const out = new THREE.WebGLRenderTarget(w, h)
  const prevRT = r.getRenderTarget(), prevTone = r.toneMapping
  // shadows like the reference renders: the sun's map at 4096 (crisp contacts), other shadow lights at 2048, a wider soft filter
  // (r186's PCF: Vogel disk, radius in texels; it has no PCFSoftShadowMap). A cube map can't resize: dropped, rebuilt.
  const shadowed = []
  scene.traverseVisible(l => { if (l.isLight && l.castShadow && l.shadow) shadowed.push([l, l.shadow.mapSize.clone(), l.shadow.radius]) })
  const remap = (l, n, rad) => { if (l.shadow.mapSize.x === n && l.shadow.radius === rad) return; if (!l.isDirectionalLight && l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null } l.shadow.mapSize.set(n, n); l.shadow.radius = rad }
  for (const [l] of shadowed) remap(l, l === vp.sun || l.isDirectionalLight ? 4096 : 2048, l.isDirectionalLight ? 2.5 : 3)
  const sp = split(scene, cam)
  let gm, ga, gb
  try {
    r.setRenderTarget(main); r.clear()
    sp.solidOnly(true); r.shadowMap.needsUpdate = true
    try { r.render(scene, cam) } finally { sp.solidOnly(false) }
    if (opt.ao !== false && sp.ao) aoPass(r, scene, cam, w, h, main, vp, L)
    if (sp.late) { r.setRenderTarget(main); sp.lateOnly(true); try { over(r, scene, cam, LATE_LAYER, null, () => r.render(scene, cam)) } finally { sp.lateOnly(false) } }
    if (L.ink) inkPass(r, scene, cam, L.ink * h / 1080, main, 0)
    for (const m of [BRIGHT, GRADE]) { m.uniforms.tone.value = toneId(r); m.uniforms.expo.value = r.toneMappingExposure }
    const G = GRADE.uniforms; G.bloom.value = L.bloom; G.vib.value = L.vib; G.con.value = L.con; G.vig.value = L.vig; G.sharp.value = L.sharp; G.rim.value = L.rim; BRIGHT.uniforms.hdr.value = L.hdr; G.px.value.set(1 / w, 1 / h)
    BRIGHT.uniforms.t.value = main.texture; draw(r, BRIGHT, a1)
    for (const [A, B, s] of [[a1, b1, 2], [a2, b2, 1]]) {
      if (A === a2) { BLUR.uniforms.t.value = a1.texture; BLUR.uniforms.dir.value.set(0, 0); draw(r, BLUR, a2) }      // downsample
      BLUR.uniforms.t.value = A.texture; BLUR.uniforms.dir.value.set(s / A.width, 0); draw(r, BLUR, B)
      BLUR.uniforms.t.value = B.texture; BLUR.uniforms.dir.value.set(0, s / A.height); draw(r, BLUR, A)
    }
    const glows = glowList(app)
    GRADE.uniforms.glow.value = glows.length ? 1 : 0
    if (glows.length) {
      gm = new THREE.WebGLRenderTarget(w, h); ga = new THREE.WebGLRenderTarget(w / 2, h / 2); gb = new THREE.WebGLRenderTarget(w / 2, h / 2)
      glowMask(r, scene, cam, glows, gm, ga, gb, h / 1080, L.sig); GRADE.uniforms.tGm.value = gm.texture; GRADE.uniforms.tGb.value = ga.texture
    }
    GRADE.uniforms.t.value = main.texture; GRADE.uniforms.t2.value = a1.texture; GRADE.uniforms.t3.value = a2.texture; draw(r, GRADE, out)
    const px = new Uint8Array(w * h * 4)
    if (r.readRenderTargetPixelsAsync) await r.readRenderTargetPixelsAsync(out, 0, 0, w, h, px); else r.readRenderTargetPixels(out, 0, 0, w, h, px)
    const im = new ImageData(w, h), row = w * 4
    for (let y = 0; y < h; y++) im.data.set(px.subarray((h - 1 - y) * row, (h - y) * row), y * row)
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(im, 0, 0)
    if (opt.canvas) return c                       // video export: the frame itself, no PNG round trip
    return await new Promise(res => c.toBlob(res, 'image/png'))
  } finally {
    sp.undo()
    for (const [l, m, rad] of shadowed) remap(l, m.x, rad)
    if (shadowed.length) vp.shadowsDirty?.()
    r.setRenderTarget(prevRT); r.toneMapping = prevTone
    for (const o of hidden) o.visible = true
    for (const t of [main, a1, b1, a2, b2, out, gm, ga, gb]) t?.dispose()
    vp.requestRender?.()
  }
}

export default {
  id: 'look', name: 'Look',
  commands: {
    'look.render': {
      label: 'Render image', icon: 'camera', noUndo: true,
      async run(app, a = {}) {
        const blob = await renderImage(app, a.w || 1920, a.h || 1080, a)
        if (a.canvas) return blob
        const url = URL.createObjectURL(blob), name = (app.scene.name || 'render').replace(/[^\w-]+/g, '-') + '.png'
        if (a.silent) return blob
        app.ui.sheet({ title: 'Render', render(body) {
          const img = document.createElement('img'); img.src = url; img.style.cssText = 'width:100%;border-radius:8px;display:block'
          const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = 'Save PNG'; b.style.marginTop = '10px'
          b.onclick = () => app.store?.download?.(name, blob); body.append(img, b)
        } })
        return blob
      }
    },
    'look.toon': { label: 'Toon look', run: app => app.setEnv({ look: (app.scene.env || {}).look === 'toon' ? null : 'toon' }) }
  },
  init(app) {
    const hook = () => {
      const vp = app.viewport
      if (!vp) return setTimeout(hook, 50)
      for (const ev of ['change', 'project']) app.on(ev, () => { GLOW_IDS = null })
      vp.post.push((r, scene, cam) => {        // halo first, so the ink lies over it
        liveGlow(app, r, scene, cam)
        if ((app.scene.env || {}).look === 'toon') inkPass(r, scene, cam, 2.2 * r.getPixelRatio(), null)
      })
    }
    hook()
  }
}
