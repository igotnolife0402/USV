// Renderer, camera, controls, gizmo, picking, selection outlines. Renders on demand only.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { buildObject, updateObject, disposeObject, disposeTree, decompose, invalidateTexture, patternTexture } from './model.js'

const D2R = Math.PI / 180
const SEL = '#ffa23a', HOVER = '#3d8bfd'
const LIGHTS = {
  studio: { sky: '#dfe6f2', ground: '#3b3631', hemi: 0.9, sun: '#fff4e5', sunI: 2.4, dir: [0.55, 1, 0.38], env: 0.45 },
  day: { sky: '#bcd8ff', ground: '#5a5040', hemi: 0.8, sun: '#fff1d6', sunI: 3.4, dir: [0.4, 1, 0.25], env: 0.35 },
  sunset: { sky: '#ffb38a', ground: '#3a2a35', hemi: 0.7, sun: '#ff9a5a', sunI: 2.4, dir: [0.9, 0.35, 0.2], env: 0.3 },
  night: { sky: '#4a5a8a', ground: '#101018', hemi: 0.45, sun: '#9fb4ff', sunI: 0.8, dir: [-0.3, 1, 0.5], env: 0.12 }
}
const VIEWS = { front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0], top: [0, 1, 0.0001], bottom: [0, -1, 0.0001], iso: [1, 0.8, 1] }

export function createViewport(app, el) {
  const touch = matchMedia('(pointer: coarse)').matches
  const phone = () => el.clientWidth < 700 || touch
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.shadowMap.autoUpdate = false
  const canvas = renderer.domElement
  canvas.className = 'vp-canvas'
  canvas.tabIndex = 0
  el.appendChild(canvas)

  const scene = new THREE.Scene()
  const world = new THREE.Group(); world.name = 'world'
  const helpers = new THREE.Group(); helpers.name = 'helpers'
  scene.add(world, helpers)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  const hemi = new THREE.HemisphereLight('#dfe6f2', '#3b3631', 0.9)
  const sun = new THREE.DirectionalLight('#fff4e5', 2.4)
  sun.castShadow = true
  const sm = phone() ? 1024 : 2048
  sun.shadow.mapSize.set(sm, sm); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02
  scene.add(hemi, sun, sun.target)

  // ---------- cameras ----------
  const persp = new THREE.PerspectiveCamera(50, 1, 0.1, 5000)
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 5000)
  let camera = persp
  persp.position.set(12, 9, 12)
  const tc = new TransformControls(camera, canvas)
  const gizmo = tc.getHelper()
  gizmo.name = 'gizmo'
  scene.add(gizmo)
  const orbit = new OrbitControls(camera, canvas)
  orbit.mouseButtons = { LEFT: -1, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }
  orbit.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
  orbit.zoomToCursor = true
  orbit.screenSpacePanning = true
  orbit.enableDamping = false
  orbit.rotateSpeed = 0.8
  orbit.target.set(0, 1, 0)
  orbit.update()

  // ---------- grid ----------
  const gridMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    uniforms: { uFade: { value: 120 }, uCam: { value: new THREE.Vector3() }, uMinor: { value: new THREE.Color('#6b7280') }, uMajor: { value: new THREE.Color('#8b93a1') } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uFade; uniform vec3 uCam, uMinor, uMajor; varying vec3 vW;
      float ln(vec2 p, float s){ vec2 c = p / s; vec2 w = fwidth(c); vec2 g = abs(fract(c - 0.5) - 0.5) / max(w, 1e-4); return 1.0 - min(min(g.x, g.y), 1.0); }
      void main(){
        vec2 p = vW.xz; float d = length(vW - uCam);
        float fade = 1.0 - smoothstep(uFade * 0.3, uFade, d);
        float mf = 1.0 - smoothstep(uFade * 0.08, uFade * 0.35, d);
        float mi = ln(p, 1.0) * 0.28 * mf, ma = ln(p, 10.0) * 0.55;
        vec2 fw = max(fwidth(p), 1e-4);
        float ax = 1.0 - min(abs(p.y) / (fw.y * 1.5), 1.0), az = 1.0 - min(abs(p.x) / (fw.x * 1.5), 1.0);
        vec3 col = mix(uMinor, uMajor, step(mi, ma)); float a = max(mi, ma);
        if (ax > 0.0) { col = mix(col, vec3(0.90, 0.30, 0.32), ax); a = max(a, ax * 0.9); }
        if (az > 0.0) { col = mix(col, vec3(0.30, 0.52, 0.95), az); a = max(a, az * 0.9); }
        a *= fade; if (a < 0.01) discard;
        gl_FragColor = vec4(col, a);
      }`
  })
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), gridMat)
  grid.position.y = 0.002; grid.renderOrder = -1; grid.frustumCulled = false
  grid.raycast = () => {}
  helpers.add(grid)

  // ---------- objects ----------
  const objects = new Map()
  const texCache = new Map()
  const vp = {
    app, el, canvas, renderer, scene, world, helpers, orbit, gizmo: tc, objects, sun, hemi, grid, touch,
    get camera() { return camera }, get ortho() { return camera === ortho },
    stats: { renders: 0, lastMs: 0, tris: 0, calls: 0, frames: 0 },
    loadModel: null, textureFor: null, tool: null, post: []
  }
  const ctx = {
    app,
    getGeo: id => app.geo.peek(id),
    needGeo: id => { app.geo.get(id) },
    getTexture: id => textureFor(id),
    loadModel: (src, obj) => (app.loadModel || vp.loadModel)?.(src, obj),
    onAsync: () => { refreshOutlines(); shadowsDirty(); requestRender() },
    onError: e => { console.warn(e); app.toast('Could not load model: ' + (e.message || e), 'error') }
  }
  function textureFor(id) {
    const t = app.scene.textures[id]
    const hook = app.textureFor || vp.textureFor
    if (hook) { const r = hook(id, t); if (r !== undefined) return r }
    if (!t) return null
    const key = id + '|' + JSON.stringify(t)
    if (texCache.has(key)) return texCache.get(key)
    let tex = null
    if (t.kind === 'procedural' && t.pattern) tex = patternTexture(t.pattern, t.scale || 4)
    else {
      const data = t.data || app.tex.peek(id)?.data
      if (!data && (t.asset || t.kind === 'image')) app.tex.get(id)
      if (data) {
        tex = new THREE.TextureLoader().load(data, () => { invalidateTexture(id); for (const oid of app.ids()) if (app.obj(oid).texture === id) syncIds([oid], true); requestRender() })
        tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(1 / (t.scale || 4), 1 / (t.scale || 4))
      }
    }
    if (tex) texCache.set(key, tex)
    return tex
  }

  function removeO3d(o) {
    for (const c of [...o.children]) if (c.userData.id && objects.get(c.userData.id) === c) world.add(c)
    o.removeFromParent()
    for (const c of [...o.children]) if (c.userData.modelContent) disposeTree(c)
    disposeObject(o)
  }
  function syncIds(ids, force) {
    const touched = []
    for (const id of ids) {
      const o = app.obj(id), cur = objects.get(id)
      if (!o) { if (cur) { removeO3d(cur); objects.delete(id) } continue }
      const raw = { ...o, id }
      if (!cur) { objects.set(id, buildObject(raw, ctx)); touched.push(id); continue }
      if (force) { cur.userData.matKey = cur.userData.matKey === undefined ? undefined : '?'; if (o.type === 'mesh') cur.userData.geoKey = cur.userData.geoKey === undefined ? undefined : '?' }
      const n = updateObject(cur, raw, ctx)
      if (n !== cur) {
        for (const c of [...cur.children]) if (c.userData.id && objects.get(c.userData.id) === c) n.add(c)
        const par = cur.parent
        removeO3d(cur)
        objects.set(id, n)
        if (par) par.add(n)
      }
      touched.push(id)
    }
    for (const id of touched) {
      const o = app.obj(id), o3d = objects.get(id)
      const par = (o.parent && objects.get(o.parent)) || world
      if (o3d.parent !== par) par.add(o3d)
    }
    for (const id of touched) { const o3d = objects.get(id); if (o3d.isMesh && o3d.geometry?.index === null && o3d.geometry.attributes.position?.count > 6000) ensureBVH(o3d) }
    if (touched.length) app.emit('synced', touched) // objects were reset to their rest pose (anim re-applies its pose)
  }
  function rebuildAll() {
    for (const o of objects.values()) removeO3d(o)
    objects.clear(); texCache.clear()
    syncIds(app.ids())
  }
  // a dense mesh gets a BVH, built the first time a ray reaches its bounds (not at load: a 300-mesh build spent seconds on
  // trees for meshes nobody ever clicked)
  let bvh = null, bvhMod = null
  const _bs = new THREE.Sphere()
  function lazyRaycast(rc, hits) {
    const g = this.geometry
    if (!g.boundsTree && bvhMod) {
      if (!g.boundingSphere) g.computeBoundingSphere()
      _bs.copy(g.boundingSphere).applyMatrix4(this.matrixWorld)
      if (!rc.ray.intersectsSphere(_bs)) return
      g.computeBoundsTree()
    }
    return (g.boundsTree && bvhMod ? bvhMod.acceleratedRaycast : THREE.Mesh.prototype.raycast).call(this, rc, hits)
  }
  function ensureBVH(mesh) {
    if (mesh.geometry.boundsTree || mesh.raycast === lazyRaycast) return
    mesh.raycast = lazyRaycast
    ;(bvh ||= import('three-mesh-bvh')).then(m => {
      if (!THREE.BufferGeometry.prototype.computeBoundsTree) { THREE.BufferGeometry.prototype.computeBoundsTree = m.computeBoundsTree; THREE.BufferGeometry.prototype.disposeBoundsTree = m.disposeBoundsTree }
      bvhMod = m
    }).catch(e => console.warn('BVH unavailable', e))
  }

  // ---------- per-object light culling ----------
  // three shades every pixel with every light; a 150 m build with 24 lights pays for all 24 everywhere. A point or spot light with a
  // range adds exactly zero past it (three's cutoff), so each mesh gets a bit mask of the lights whose range (and spot cone) can reach
  // its bounding sphere and the shader skips the rest with a uniform branch: the same picture, a fraction of the light cost.
  // Masks depend on world positions only (any camera, shots and exports included) and are rebuilt on every render of this scene.
  const LM = 31                                                  // lights at index >= 31 of a kind are never skipped
  const lmChunk = THREE.ShaderChunk.lights_fragment_begin
    .replace('pointLight = pointLights[ i ];', 'if ( UNROLLED_LOOP_INDEX >= ' + LM + ' || ( lmPointOff & ( 1 << UNROLLED_LOOP_INDEX ) ) == 0 ) {\n\t\tpointLight = pointLights[ i ];')
    .replace('spotLight = spotLights[ i ];', 'if ( UNROLLED_LOOP_INDEX >= ' + LM + ' || ( lmSpotOff & ( 1 << UNROLLED_LOOP_INDEX ) ) == 0 ) {\n\t\tspotLight = spotLights[ i ];')
  const lmBody = lmChunk.split('#pragma unroll_loop_end')
  // close the branch at the end of the point and spot loop bodies (the first two unrolled loops)
  const lmFrag = lmBody.length > 2 && lmChunk !== THREE.ShaderChunk.lights_fragment_begin
    ? lmBody.map((s, i) => i < 2 ? s.replace(/\}\s*$/, '}\n\t}\n\t') : s).join('#pragma unroll_loop_end') : null
  const lmMats = new WeakSet(), _ls = new THREE.Sphere(), _ld = new THREE.Vector3(), _lu = new THREE.Vector3()
  // the off-masks are plain program uniforms (0 = every light on, also before the first set), sent right after three sends the
  // object's modelMatrix: three re-sends material uniforms only on a material switch, so this is the one per-object hook
  let lmCur = null
  function lmProgram(pr) {
    pr.__lm = true
    const U = pr.getUniforms()
    if (!U.map.lmPointOff && !U.map.lmSpotOff) return
    const set = U.setValue
    U.setValue = function (gl, name, v, tex) {
      set.call(this, gl, name, v, tex)
      if (name !== 'modelMatrix') return
      const k = lmCur?.userData.lm
      this.map.lmPointOff?.setValue(gl, k ? k[0] : 0); this.map.lmSpotOff?.setValue(gl, k ? k[1] : 0)
    }
  }
  function lmInstall(m) {
    lmMats.add(m)
    if (!lmFrag || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshToonMaterial)) return
    const prev = m.onBeforeCompile, prevRender = m.onBeforeRender
    const own = m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : null
    const prevKey = own || (() => prev.toString())
    m.onBeforeCompile = function (sh, r) {
      prev.call(this, sh, r)
      if (!sh.fragmentShader.includes('#include <lights_fragment_begin>')) return
      sh.fragmentShader = sh.fragmentShader.replace('#include <lights_pars_begin>', '#include <lights_pars_begin>\nuniform int lmPointOff;\nuniform int lmSpotOff;')
        .replace('#include <lights_fragment_begin>', lmFrag)
    }
    m.customProgramCacheKey = () => prevKey() + '|lm2'
    m.onBeforeRender = function (r, s, c, g, obj, grp) {
      prevRender.call(this, r, s, c, g, obj, grp)
      lmCur = obj
      const pr = r.properties.get(this).currentProgram
      if (pr && !pr.__lm) lmProgram(pr)
    }
    m.needsUpdate = true
  }
  const lmAll = n => n >= 31 ? 0x7fffffff : (1 << n) - 1
  function sphereInCone(S, apex, dir, cosA, sinA) {      // sphere vs infinite cone (Eberly)
    _lu.copy(apex).addScaledVector(dir, -S.radius / Math.max(sinA, 1e-4))
    _ld.subVectors(S.center, _lu)
    if (dir.dot(_ld) < _ld.length() * cosA) return false
    _ld.subVectors(S.center, apex)
    return -dir.dot(_ld) < _ld.length() * sinA || _ld.length() <= S.radius
  }
  const lmPoints = [], lmSpots = []
  scene.onBeforeRender = (r, s, cam) => {
    // light order as three builds its uniform arrays: visible scene order (camera layers), then shadow-casting / textured first
    const all = [], meshes = []
    ;(function walk(o) {
      if (!o.visible) return
      if (o.layers.test(cam.layers)) { if (o.isLight) all.push(o); else if (o.isMesh) meshes.push(o) }
      for (const c of o.children) walk(c)
    })(scene)
    all.sort((a, b) => (b.castShadow ? 2 : 0) - (a.castShadow ? 2 : 0) + (b.map ? 1 : 0) - (a.map ? 1 : 0))
    lmPoints.length = lmSpots.length = 0
    for (const l of all) {
      if (l.isPointLight) lmPoints.push(l)
      else if (l.isSpotLight) lmSpots.push(l)
    }
    const np = Math.min(lmPoints.length, LM), ns = Math.min(lmSpots.length, LM)
    const pp = [], sp = []
    for (let i = 0; i < np; i++) { const l = lmPoints[i]; pp.push(l.distance > 0 ? l.getWorldPosition(new THREE.Vector3()) : null) }
    for (let i = 0; i < ns; i++) {
      const l = lmSpots[i]; l.target.updateMatrixWorld()
      const p = l.getWorldPosition(new THREE.Vector3()), d = l.target.getWorldPosition(new THREE.Vector3()).sub(p).normalize()
      sp.push({ p, d, R: l.distance > 0 ? l.distance : Infinity, cos: Math.cos(l.angle), sin: Math.sin(l.angle) })
    }
    for (const m of meshes) {
      if (vp.lightCull.off) { m.userData.lm = null; continue }
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) if (mat && !lmMats.has(mat)) lmInstall(mat)
      const g = m.geometry
      if (!g || m.isSkinnedMesh || m.isInstancedMesh || m.isBatchedMesh || g.morphAttributes?.position || !g.attributes.position) { m.userData.lm = null; continue }
      if (!g.boundingSphere) g.computeBoundingSphere()
      _ls.copy(g.boundingSphere).applyMatrix4(m.matrixWorld)
      if (!Number.isFinite(_ls.radius)) { m.userData.lm = null; continue }
      let mp = 0, ms = 0
      for (let i = 0; i < np; i++) if (!pp[i] || pp[i].distanceTo(_ls.center) <= lmPoints[i].distance + _ls.radius) mp |= 1 << i
      for (let i = 0; i < ns; i++) {
        const L = sp[i]
        if (L.p.distanceTo(_ls.center) <= L.R + _ls.radius && sphereInCone(_ls, L.p, L.d, L.cos, L.sin)) ms |= 1 << i
      }
      mp = ~mp & lmAll(np); ms = ~ms & lmAll(ns)               // the shader takes the lights to skip
      const k = m.userData.lm
      if (k) { k[0] = mp; k[1] = ms } else m.userData.lm = [mp, ms]
    }
  }
  vp.lightCull = { off: false, masks: () => [...objects.values()].map(o => o.userData.lm) }

  // ---------- render on demand ----------
  let pending = false, needShadow = true
  const loops = new Set()
  let lastT = 0
  function requestRender() { if (!pending) { pending = true; requestAnimationFrame(tick) } }
  function shadowsDirty() { needShadow = true }
  // dynamic resolution: while something plays and frames come slow (a phone GPU on a dense mesh), draw fewer pixels;
  // back to full sharpness as soon as it stops
  const fullDpr = Math.min(devicePixelRatio || 1, 2)
  let frameEma = 0, slowFrames = 0
  function adaptResolution(ms) {
    frameEma = frameEma ? frameEma * 0.85 + ms * 0.15 : ms
    if (frameEma > 28 && renderer.getPixelRatio() > 1) {
      if (++slowFrames > 15) { renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.25)); slowFrames = 0; frameEma = 0 }
    } else slowFrames = 0
  }
  function tick(t) {
    pending = false
    if (loops.size && lastT) adaptResolution(t - lastT)
    const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 1 / 60
    lastT = loops.size ? t : 0
    for (const fn of [...loops]) { let keep; try { keep = fn(dt, t) } catch (e) { console.error(e); keep = false } if (keep === false) loops.delete(fn) }
    if (!loops.size && renderer.getPixelRatio() < fullDpr) { renderer.setPixelRatio(fullDpr); frameEma = slowFrames = 0 }
    render()
    vp.stats.dpr = renderer.getPixelRatio()
    if (loops.size) requestRender()
  }
  // depth range fitted to the view every frame: near grows with the orbit distance, so depth stays precise from a
  // close-up to a whole cathedral (fixed 0.1..5000 z-fought surfaces a few cm apart); far follows any zoom-out
  function fitClip() {
    if (camera !== persp) return
    const d = persp.position.distanceTo(orbit.target)
    // phones can have a coarse depth buffer, so near is as far out as a view allows: 2% of the orbit distance; flying
    // keeps its target close, so there it comes from the scene size (0.6 for a 150 m build, 0.05 for a small prop)
    const near = flyStop ? Math.min(0.6, Math.max(0.05, sceneR * 0.004)) : Math.min(10, Math.max(0.01, d * 0.02))
    const far = Math.max(5000, d * 40, sceneR * 40)
    if (Math.abs(persp.near - near) > near * 0.02 || persp.far !== far) { persp.near = near; persp.far = far; persp.updateProjectionMatrix() }
  }
  function render() {
    const t0 = performance.now()
    fitClip()
    gridMat.uniforms.uCam.value.copy(camera.position)
    gridMat.uniforms.uFade.value = Math.max(80, camera.position.distanceTo(orbit.target) * (camera === ortho ? 2 : 6) / (camera === ortho ? camera.zoom : 1))
    if (needShadow) { renderer.shadowMap.needsUpdate = true; needShadow = false }
    renderer.getSize(_res); for (const m of LINE_MATS) m.resolution.copy(_res)
    renderer.render(scene, camera)
    for (const f of vp.post) f(renderer, scene, camera)                   // extra passes over the frame (toon outlines)
    const s = vp.stats
    s.lastMs = performance.now() - t0; s.renders++; s.tris = renderer.info.render.triangles; s.calls = renderer.info.render.calls
    updateAxes()
    app.emit('render', s)
  }
  vp.requestRender = requestRender
  vp.render = render
  vp.shadowsDirty = () => { needShadow = true; requestRender() }
  vp.loop = fn => { loops.add(fn); lastT = 0; requestRender(); return () => loops.delete(fn) }

  // ---------- size ----------
  function resize() {
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight)
    renderer.setSize(w, h, false)
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
    persp.aspect = w / h; persp.updateProjectionMatrix()
    fitOrtho()
    applyInset()
    requestRender()
  }
  // a phone bottom sheet covers the lower part: shift the view so the camera target sits in the middle of what stays visible
  let inset = 0, insetStop = null
  function applyInset() {
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight)
    for (const c of [persp, ortho]) { if (inset > 0.5) c.setViewOffset(w, h, 0, inset / 2, w, h); else c.clearViewOffset() }
  }
  vp.setInset = (px = 0, duration = 220) => {
    px = Math.max(0, Math.min(px, el.clientHeight * 0.8))
    insetStop?.(); insetStop = null
    const from = inset, t0 = performance.now()
    if (!duration || from === px) { inset = px; applyInset(); requestRender(); return }
    insetStop = vp.loop(() => {
      const k = Math.min(1, (performance.now() - t0) / duration), e = 1 - (1 - k) ** 3
      inset = from + (px - from) * e; applyInset()
      if (k >= 1) { insetStop?.(); insetStop = null }
    })
  }
  function fitOrtho() {
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight)
    const d = orthoDist || 20, hh = d * Math.tan(persp.fov * D2R / 2)
    ortho.left = -hh * w / h; ortho.right = hh * w / h; ortho.top = hh; ortho.bottom = -hh
    ortho.updateProjectionMatrix()
  }
  let orthoDist = 20
  new ResizeObserver(resize).observe(el)
  resize()

  // ---------- environment ----------
  function applyEnv() {
    const e = app.scene.env || {}
    scene.background = new THREE.Color(e.bg || '#1b1d22')
    const L = LIGHTS[e.light] || LIGHTS.studio
    hemi.color.set(L.sky); hemi.groundColor.set(L.ground); hemi.intensity = L.hemi * (e.look === 'roblox' ? 0.55 : 1)   // roblox: less fill, shadows read
    sun.color.set(L.sun); sun.intensity = L.sunI
    scene.environmentIntensity = L.env * (e.look === 'toon' ? 1.6 : e.look === 'roblox' ? 0.7 : 1)
    // toon: Standard view, full saturation; roblox: AgX with the Punchy look (Custom: plugins/look.js sets the curve), a little brighter
    renderer.toneMapping = e.look === 'toon' ? THREE.NoToneMapping : e.look === 'roblox' ? THREE.CustomToneMapping : THREE.NeutralToneMapping
    renderer.toneMappingExposure = e.look === 'roblox' ? 3.1 : 1
    sunDir.set(...(e.sun || L.dir)).normalize()
    grid.visible = e.grid !== false
    scene.fog = e.fog ? new THREE.Fog(e.fog.color || e.bg || '#1b1d22', e.fog.near ?? 40, e.fog.far ?? 300) : null
    fitShadow()
  }
  const sunDir = new THREE.Vector3(0.55, 1, 0.38).normalize()
  const _box = new THREE.Box3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3()
  let sceneR = 20, flyStop = null, flyBusy = false, shadowSig = ''
  function fitShadow() {
    _box.makeEmpty()
    for (const c of world.children) if (c.visible) _box.expandByObject(c)
    let center = new THREE.Vector3(), r = 20
    if (!_box.isEmpty()) { _box.getCenter(center); sceneR = Math.max(0.5, _box.getSize(_v).length() / 2); r = Math.min(600, Math.max(12, sceneR)) }
    // a big baseplate spreads the map thin: keep its texels where the camera looks
    const near = camera === persp ? Math.max(12, camera.position.distanceTo(orbit.target) * 1.3) : r
    if (near < r) { r = near; center.copy(orbit.target) }
    // orbiting re-fits after every stop: re-draw the shadow map only when its box changed (a 300k-face build costs a full pass)
    const sig = [center.x, center.y, center.z, r, sunDir.x, sunDir.y, sunDir.z].map(x => x.toFixed(3)).join()
    if (sig === shadowSig) return
    shadowSig = sig
    sun.target.position.copy(center)
    sun.position.copy(center).addScaledVector(sunDir, r * 2)
    const c = sun.shadow.camera
    c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.near = 0.1; c.far = r * 4
    c.updateProjectionMatrix()
    sun.shadow.normalBias = 0.02 * Math.max(1, r / 40)
    needShadow = true
  }
  let fitTimer = 0
  const fitSoon = () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => { fitShadow(); requestRender() }, 120) }

  // ---------- selection outlines ----------
  // fat lines: width in CSS px, so outlines stay visible on 3x phone screens (plain GL lines are 1 device px)
  const lineMat = new LineMaterial({ color: SEL, linewidth: 2, depthTest: true, toneMapped: false })
  const lineBack = new LineMaterial({ color: SEL, linewidth: 1, depthTest: false, transparent: true, opacity: 0.3, toneMapped: false })
  const hoverMat = new LineMaterial({ color: HOVER, linewidth: 1.5, depthTest: false, transparent: true, opacity: 0.9, toneMapped: false })
  const LINE_MATS = [lineMat, lineBack, hoverMat], _res = new THREE.Vector2()
  let outlineObjs = [], hoverObjs = [], hoverId = null
  const BOX_EDGES = [0, 1, 1, 3, 3, 2, 2, 0, 4, 5, 5, 7, 7, 6, 6, 4, 0, 4, 1, 5, 2, 6, 3, 7]
  function boxLineGeo(b) {
    const p = []
    for (const i of BOX_EDGES) p.push(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  }
  function edgesFor(mesh, obj) {
    const g = mesh.geometry
    if (!g?.attributes?.position) return null
    const round = obj && (obj.type === 'part' ? /sphere|torus|capsule/.test(obj.shape) : obj.type === 'mesh' && obj.smooth) // organic surfaces: a box reads better than stray crease edges
    if (g.userData.noOutline) return null // e.g. sculpt buffers: no outline over the surface being sculpted
    if (round || obj?.type === 'stroke' || g.attributes.position.count > 150000) { if (!g.boundingBox) g.computeBoundingBox(); return boxLineGeo(g.boundingBox) }
    const e = new THREE.EdgesGeometry(g, 30)
    if (e.attributes.position.count) return e
    e.dispose(); if (!g.boundingBox) g.computeBoundingBox(); return boxLineGeo(g.boundingBox) // smooth meshes have no sharp edge: box instead of no outline
  }
  function addLines(src, parent, mats, list) {
    const geo = new LineSegmentsGeometry().fromEdgesGeometry(src); src.dispose()
    for (const m of mats) {
      const l = new LineSegments2(geo, m)
      l.userData.helper = true; l.raycast = () => {}; l.renderOrder = m.depthTest ? 5 : 6
      parent.add(l); list.push(l)
    }
  }
  function outline(id, mats, list) {
    const o3d = objects.get(id), obj = app.obj(id)
    if (!o3d || !obj) return
    if (obj.type === 'group' || obj.type === 'model' || o3d.userData.custom) {
      o3d.updateWorldMatrix(true, true)
      _box.makeEmpty()
      o3d.traverse(c => { if (c.isMesh && !c.userData.helper && c.visible) { if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); _box.union(_v.set(0, 0, 0) && c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld)) } })
      if (_box.isEmpty()) _box.setFromCenterAndSize(_v.setFromMatrixPosition(o3d.matrixWorld), _v2.set(1, 1, 1))
      _box.expandByScalar(0.04)
      addLines(boxLineGeo(_box), helpers, mats, list)
      return
    }
    const target = obj.type === 'light' ? o3d.userData.helperMesh : o3d
    if (!target?.isMesh) return
    const geo = edgesFor(target, obj)
    if (geo) addLines(geo, target, mats, list)
  }
  function clearLines(list) { for (const l of list) { l.removeFromParent(); l.geometry.dispose() } list.length = 0 }
  function refreshOutlines() {
    clearLines(outlineObjs)
    const sel = app.selection
    if (sel.length <= 400) for (const id of sel) outline(id, [lineMat, lineBack], outlineObjs)
    setHover(hoverId, true)
    requestRender()
  }
  function setHover(id, force) {
    if (id === hoverId && !force) return
    hoverId = id
    clearLines(hoverObjs)
    if (id && !app.selection.includes(id)) outline(id, [hoverMat], hoverObjs)
    requestRender()
  }
  vp.refreshOutlines = refreshOutlines

  // ---------- gizmo ----------
  const pivot = new THREE.Object3D(); pivot.name = 'pivot'
  scene.add(pivot)
  let gizmoTargets = [], dragStart = null
  function selectable(id) { return app.obj(id) && !app.isLocked(id) && !app.isHidden(id) }
  function updateGizmo() {
    if (app.modes.get(app.mode)?.ownGizmo) return // the mode drives the gizmo itself
    const t = app.tools.get(app.tool)
    const mode = { move: 'translate', rotate: 'rotate', scale: 'scale' }[app.tool]
    gizmoTargets = app.topLevel(app.selection).filter(selectable)
    if (!mode || !t?.builtin || !gizmoTargets.length || app.mode !== 'build' && !t.anyMode && !app.modes.get(app.mode)?.gizmo) { tc.detach(); requestRender(); return }
    tc.setMode(mode)
    placePivot()
    if (tc.object !== pivot) tc.attach(pivot)
    const snap = app.prefs.snap
    tc.setTranslationSnap(snap ? app.prefs.moveSnap : null)
    tc.setRotationSnap(snap ? app.prefs.rotSnap * D2R : null)
    tc.setScaleSnap(null)
    tc.setSpace(mode === 'scale' ? 'local' : app.prefs.space)
    tc.setSize(touch ? 1.6 : 1)
    requestRender()
  }
  vp.updateGizmo = updateGizmo
  function placePivot() {
    pivot.scale.set(1, 1, 1)
    if (gizmoTargets.length === 1) {
      const o3d = objects.get(gizmoTargets[0])
      if (!o3d) return
      o3d.updateWorldMatrix(true, false)
      o3d.matrixWorld.decompose(pivot.position, pivot.quaternion, _v)
    } else {
      _box.makeEmpty()
      for (const id of gizmoTargets) { const o = objects.get(id); if (o) _box.expandByObject(o) }
      _box.getCenter(pivot.position); pivot.quaternion.identity()
    }
    pivot.updateMatrixWorld(true)
  }
  // TransformControls snaps the absolute position, so a drag from 0.5 jumps to 0 or 1; snap the drag delta instead
  let moveStep = 0, tcStart = null
  const _tq = new THREE.Quaternion()
  tc.setTranslationSnap = v => { moveStep = v || 0 }
  tc.addEventListener('mouseDown', () => { const o = tc.object; if (o) { o.updateMatrixWorld(true); tcStart = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld) } })
  tc.addEventListener('objectChange', () => {
    const o = tc.object, ax = tc.axis || ''
    if (!moveStep || !tcStart || !o || tc.mode !== 'translate') return
    o.updateMatrixWorld(true)
    const loc = tc.space === 'local' && ax !== 'XYZ' ? o.getWorldQuaternion(_tq) : _tq.identity()
    const d = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).sub(tcStart).applyQuaternion(loc.clone().invert())
    for (const k of 'xyz') if (ax.includes(k.toUpperCase())) d[k] = Math.round(d[k] / moveStep) * moveStep
    const w = d.applyQuaternion(loc).add(tcStart)
    o.position.copy(o.parent ? o.parent.worldToLocal(w) : w); o.updateMatrixWorld(true)
  })
  tc.addEventListener('dragging-changed', e => { orbit.enabled = !e.value })
  tc.addEventListener('change', requestRender)
  tc.addEventListener('mouseDown', () => {
    if (tc.object !== pivot) return // a plugin attached the gizmo to its own pivot (mesh edit)
    pivot.updateMatrixWorld(true)
    dragStart = { P0inv: pivot.matrixWorld.clone().invert(), items: gizmoTargets.map(id => { const o3d = objects.get(id); o3d.updateWorldMatrix(true, false); return { id, o3d, W0: o3d.matrixWorld.clone(), parentInv: (o3d.parent || world).matrixWorld.clone().invert(), obj: JSON.parse(JSON.stringify(app.poseOf?.(id) || app.obj(id))) } }) }
  })
  const _m = new THREE.Matrix4()
  function liveValues(it) {
    const D = _m.multiplyMatrices(pivot.matrixWorld, dragStart.P0inv)
    const local = new THREE.Matrix4().multiplyMatrices(it.parentInv, D.clone().multiply(it.W0))
    const t = decompose(local), o = it.obj
    if (tc.mode === 'scale' && (o.type === 'part')) {
      const ratio = t.scale.map((s, i) => s / (o.scale[i] || 1))
      const step = app.prefs.snap ? app.prefs.moveSnap : 0
      t.size = o.size.map((v, i) => { let n = v * ratio[i]; if (step) n = Math.max(step, Math.round(n / step) * step); return Math.round(Math.max(0.05, n) * 1e4) / 1e4 })
      t.scale = o.scale
    }
    if (tc.mode === 'translate') { t.rot = o.rot; t.scale = o.scale }
    if (tc.mode === 'rotate') t.scale = o.scale
    return t
  }
  tc.addEventListener('objectChange', () => {
    if (!dragStart) return
    for (const it of dragStart.items) {
      const t = liveValues(it)
      const raw = { ...it.obj, ...t, id: it.id }
      const n = updateObject(it.o3d, raw, ctx)
      if (n !== it.o3d) { it.o3d = n; objects.set(it.id, n) }
    }
    if (gizmoTargets.length > 1 || app.selection.some(id => app.obj(id)?.type === 'group')) refreshOutlines()
    else if (tc.mode === 'scale') refreshOutlines()
    shadowsDirty()
  })
  tc.addEventListener('mouseUp', () => {
    if (!dragStart) return
    const items = dragStart.items
    const vals = items.map(it => [it.id, liveValues(it)])
    dragStart = null
    const label = { translate: 'Move', rotate: 'Rotate', scale: 'Resize' }[tc.mode]
    if (app.onTransform?.(vals, label)) { placePivot(); return } // a plugin (anim) took the edit, e.g. as keys
    app.transact(label, () => { for (const [id, t] of vals) app.set(id, t) })
    placePivot()
  })

  // ---------- picking ----------
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  function toNdc(x, y, out = ndc) { const r = canvas.getBoundingClientRect(); return out.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1) }
  function idOf(o) { while (o) { const id = o.userData.id; if (id && objects.get(id) === o) return id; o = o.parent } return null }
  function visibleChain(o) { while (o) { if (!o.visible) return false; o = o.parent } return true }
  const _n3 = new THREE.Matrix3()
  function hitInfo(h, id) {
    const normal = h.face ? h.face.normal.clone().applyMatrix3(_n3.getNormalMatrix(h.object.matrixWorld)).normalize() : null
    return { id, point: h.point, normal, object: h.object, face: h.face, faceIndex: h.faceIndex, distance: h.distance, uv: h.uv, uv1: h.uv1 }
  }
  // Nearest object under client point (x, y). opts: {locked, filter(id, hit), objects}
  function pick(x, y, opts = {}) {
    raycaster.setFromCamera(toNdc(x, y), camera)
    const hits = raycaster.intersectObjects(opts.objects || world.children, true)
    for (const h of hits) {
      if (h.object.userData.helper && !h.object.userData.lightHelper) continue
      if (!visibleChain(h.object)) continue
      const id = idOf(h.object)
      if (!id || app.isHidden(id) || (!opts.locked && app.isLocked(id))) continue
      if (opts.filter && !opts.filter(id, h)) continue
      return hitInfo(h, id)
    }
    return null
  }
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  function ground(x, y, h = 0) { raycaster.setFromCamera(toNdc(x, y), camera); groundPlane.constant = -h; return raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3()) }
  // Which object a click selects: top-level first, then one level deeper per click inside a selected group.
  function clickTarget(id) {
    const chain = []
    for (let c = id, g = 0; c && g < 64; g++) { chain.unshift(c); c = app.obj(c)?.parent || null }
    const sel = new Set(app.selection)
    let k = -1
    chain.forEach((c, i) => { if (sel.has(c) || app.selection.some(s => app.isAncestor(c, s))) k = i })
    if (k < 0) return chain[0]
    if (sel.has(chain[k])) return chain[Math.min(k + 1, chain.length - 1)]
    return chain[Math.min(k + 1, chain.length - 1)]
  }
  vp.pick = pick; vp.ground = ground; vp.idOf = idOf; vp.clickTarget = clickTarget
  vp.ndc = (x, y) => toNdc(x, y, new THREE.Vector2())
  vp.ray = (x, y) => { raycaster.setFromCamera(toNdc(x, y), camera); return raycaster.ray.clone() }
  vp.project = v => { const p = v.clone().project(camera), r = canvas.getBoundingClientRect(); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height, z: p.z } }
  vp.objectOf = id => objects.get(id) || null

  // ---------- pointer input ----------
  let gesture = null, hoverQueued = false, lastMove = null
  const pointers = new Map()
  vp.busy = () => pointers.size > 0 // a button or finger is down: idle work (thumbnails) waits
  function toolEvent(e, hit) {
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, clientX: e.clientX, clientY: e.clientY, ndc: vp.ndc(e.clientX, e.clientY), ray: vp.ray(e.clientX, e.clientY), hit: hit === undefined ? pick(e.clientX, e.clientY) : hit, button: e.button, pointerId: e.pointerId, pointerType: e.pointerType, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, pressure: e.pressure || (e.pointerType === 'mouse' ? 1 : 0.5), native: e, vp }
  }
  function activeTool() { const t = app.tools.get(app.tool); return t && !t.builtin && (t.onDown || t.onMove) ? t : null }
  el.addEventListener('pointerdown', e => {
    if (e.target !== canvas) return
    canvas.focus({ preventScroll: true })
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    app.ui?.closeMenus?.()
    if (pointers.size > 1) { // second finger: pinch/pan wins
      if (gesture?.kind === 'drag') cancelDrag()
      if (gesture?.kind === 'tool') { gesture.tool.onCancel?.(toolEvent(e, null)); orbit.enabled = true }
      clearTimeout(gesture?.timer); gesture = null
      return
    }
    if (e.altKey && e.button === 0) { orbit.mouseButtons.LEFT = THREE.MOUSE.ROTATE; gesture = { kind: 'orbit' }; return }
    if (tc.object && tc.enabled && e.button === 0) {
      tc.pointerHover(toNdc(e.clientX, e.clientY, new THREE.Vector2()))
      // the centre handle moves like the Roblox drag: flat on XZ from the start height, delta snapped, resting on the surface
      if (tc.axis === 'XYZ' && tc.mode === 'translate' && tc.object === pivot && gizmoTargets.length) {
        e.stopPropagation(); e.preventDefault()
        startDrag({ id: e.pointerId, x: e.clientX, y: e.clientY, hit: { id: gizmoTargets[0], point: pivot.getWorldPosition(new THREE.Vector3()) }, shift: false }, e)
        return
      }
      if (tc.axis !== null) { gesture = { kind: 'gizmo' }; return }
    }
    const tool = activeTool()
    if (tool && tool.onDown && e.button === 0) {
      const ev = toolEvent(e)
      if (tool.onDown(ev, app) === true) { orbit.enabled = false; gesture = { kind: 'tool', tool, id: e.pointerId }; return }
    }
    const hit = e.button === 1 ? null : pick(e.clientX, e.clientY)
    gesture = { kind: 'pending', button: e.button, x: e.clientX, y: e.clientY, hit, touch: e.pointerType === 'touch', shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, id: e.pointerId }
    if (gesture.touch) {
      const tgt = hit && clickTarget(hit.id)
      if (hit && (app.selection.includes(tgt) || app.selection.includes(hit.id)) && !app.isLocked(hit.id)) { orbit.enabled = false; gesture.dragOk = true }
      gesture.timer = setTimeout(() => { if (gesture?.kind === 'pending') { const g = gesture; gesture = null; orbit.enabled = true; cancelOrbit(); contextAt(g.x, g.y, g.hit) } }, 500)
    }
  }, true)
  function cancelOrbit() { canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })) }
  addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (!gesture) { if (e.target === canvas && e.pointerType === 'mouse' && !e.buttons) hoverAt(e); return }
    const g = gesture
    if (g.kind === 'tool' && e.pointerId === g.id) { g.tool.onMove?.(toolEvent(e), app); return }
    if (g.kind === 'pending' && e.pointerId === g.id) {
      const d = Math.hypot(e.clientX - g.x, e.clientY - g.y)
      if (d < (g.touch ? 10 : 4)) return
      clearTimeout(g.timer)
      if (g.button === 0 && !g.touch) {
        if (g.hit) startDrag(g, e)
        else startBox(g)
      } else if (g.touch && g.dragOk) startDrag(g, e)
      else gesture = { kind: 'orbit' }
    }
    if (gesture?.kind === 'drag' && e.pointerId === gesture.id) moveDrag(e)
    if (gesture?.kind === 'box') moveBox(e)
  })
  const endPointer = e => {
    pointers.delete(e.pointerId)
    const g = gesture
    if (!g) return
    if (g.kind === 'orbit' || g.kind === 'gizmo') { if (!pointers.size) { orbit.mouseButtons.LEFT = -1; orbit.enabled = !tc.dragging; gesture = null } return }
    if (g.id !== undefined && e.pointerId !== g.id) return
    gesture = null
    clearTimeout(g.timer)
    orbit.enabled = true
    if (g.kind === 'tool') { if (e.type === 'pointercancel') g.tool.onCancel?.(toolEvent(e, null), app); else g.tool.onUp?.(toolEvent(e), app); return }
    if (g.kind === 'drag') { e.type === 'pointercancel' ? cancelDrag(g) : endDrag(g); return }
    if (g.kind === 'box') { endBox(g, e); return }
    if (g.kind === 'pending' && e.type !== 'pointercancel') {
      if (g.button === 2) { contextAt(g.x, g.y, g.hit); return }
      if (g.button !== 0) return
      clickSelect(g.hit, g)
    }
  }
  addEventListener('pointerup', endPointer)
  addEventListener('pointercancel', endPointer)
  canvas.addEventListener('contextmenu', e => e.preventDefault())
  canvas.addEventListener('dblclick', e => {
    const hit = pick(e.clientX, e.clientY)
    if (hit && app.obj(hit.id)) { app.select([hit.id]); vp.frame([hit.id]) }
  })
  canvas.addEventListener('pointerleave', () => setHover(null))

  function clickSelect(hit, g) {
    if (!hit) { if (!g.shift && !g.ctrl) app.select([]); return }
    const id = clickTarget(hit.id)
    if (g.ctrl) app.select([id], { toggle: true })
    else if (g.shift) app.select([id], { add: true })
    else app.select([id])
  }
  function contextAt(x, y, hit) {
    if (hit) { const id = clickTarget(hit.id); if (!app.selection.includes(id) && !app.selection.includes(hit.id)) app.select([id]) }
    app.ui?.contextMenu?.(x, y, hit)
  }
  function hoverAt(e) {
    lastMove = e
    if (hoverQueued) return
    hoverQueued = true
    requestAnimationFrame(() => {
      hoverQueued = false
      const ev = lastMove
      const tool = activeTool()
      if (tool?.onHover) { tool.onHover(toolEvent(ev), app); return }
      if (tc.dragging) return
      const hit = pick(ev.clientX, ev.clientY)
      setHover(hit ? clickTarget(hit.id) : null)
      canvas.style.cursor = hit ? 'pointer' : ''
    })
  }

  // drag-move objects (Roblox dragger): the selection rests on the surface under the pointer and the grabbed
  // point stays under it; side faces push it out along the normal; empty sky falls back to a flat plane.
  function startDrag(g, e) {
    const id = clickTarget(g.hit.id)
    if (!app.selection.includes(id) && !app.selection.includes(g.hit.id)) app.select([id], g.shift ? { add: true } : {})
    const ids = app.topLevel(app.selection).filter(selectable)
    if (!ids.length) { gesture = null; orbit.enabled = true; return }
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -g.hit.point.y)
    raycaster.setFromCamera(toNdc(g.x, g.y), camera)
    const p0 = raycaster.ray.intersectPlane(plane, new THREE.Vector3()) || g.hit.point.clone()
    const box0 = new THREE.Box3()
    const items = ids.map(id => { const o3d = objects.get(id); o3d.updateWorldMatrix(true, true); o3d.traverse(c => { if (c.isMesh && !c.userData.helper && c.visible) { if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); box0.union(_box.copy(c.geometry.boundingBox).applyMatrix4(c.matrixWorld)) } }); return { id, o3d, w0: new THREE.Vector3().setFromMatrixPosition(o3d.matrixWorld), parentInv: (o3d.parent || world).matrixWorld.clone().invert(), obj: app.obj(id) } })
    if (box0.isEmpty()) box0.setFromCenterAndSize(items[0].w0, new THREE.Vector3(1, 1, 1))
    const c0 = box0.getCenter(new THREE.Vector3()), size = box0.getSize(new THREE.Vector3())
    const notDragged = hid => !ids.some(d => d === hid || app.isAncestor(d, hid))
    gesture = { kind: 'drag', id: g.id, plane, p0, items, delta: new THREE.Vector3(), box0, c0, size, grab: g.hit.point.clone().sub(c0), notDragged, surface: app.prefs.surfaceSnap !== false }
    orbit.enabled = false
    setHover(null)
  }
  const _down = new THREE.Vector3(0, -1, 0), _o = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3()
  // highest surface (not the dragged objects) under a footprint, cast down from y top; -Infinity when none
  function floorUnder(cx, cz, hx, hz, top, keep) {
    let best = -Infinity
    for (const [dx, dz] of [[0, 0], [-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) {
      raycaster.set(_o.set(cx + dx, top, cz + dz), _down)
      for (const h of raycaster.intersectObjects(world.children, true)) {
        if (h.object.userData.helper || !visibleChain(h.object)) continue
        const hid = idOf(h.object)
        if (!hid || app.isHidden(hid) || !keep(hid)) continue
        if (h.point.y > best) best = h.point.y
        break
      }
    }
    return best
  }
  function surfaceDelta(g, e, d) {
    const hit = pick(e.clientX, e.clientY, { locked: true, filter: g.notDragged })
    if (!hit || !hit.normal || hit.distance > 3000) return false
    const n = hit.normal, S = g.size, snap = app.prefs.snap ? app.prefs.moveSnap || 1 : 0
    const sn = (v, k) => snap && Math.abs(n[k]) < 0.5 ? Math.round(v / snap) * snap : v
    if (n.y > 0.5) {
      // keep the grabbed point on the pointer ray at its height above the surface, then rest on the footprint's top
      const gy = g.grab.y + S.y / 2
      raycaster.setFromCamera(toNdc(e.clientX, e.clientY), camera)
      const P = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -(hit.point.y + gy)), _t) || _t.copy(hit.point)
      d.x = sn(P.x - g.grab.x - g.c0.x, 'x'); d.z = sn(P.z - g.grab.z - g.c0.z, 'z')
      const fl = floorUnder(g.c0.x + d.x, g.c0.z + d.z, S.x * 0.45, S.z * 0.45, hit.point.y + S.y + 0.05, g.notDragged)
      d.y = (fl > -Infinity ? Math.max(fl, hit.point.y) : hit.point.y) - g.box0.min.y
    } else {
      // a wall or the underside: sit against it, the grab point's offset along the face kept
      const half = Math.abs(n.x) * S.x / 2 + Math.abs(n.y) * S.y / 2 + Math.abs(n.z) * S.z / 2
      _c.copy(g.grab).addScaledVector(n, -g.grab.dot(n))
      _c.subVectors(hit.point, _c).addScaledVector(n, half)
      d.set(sn(_c.x - g.c0.x, 'x'), sn(_c.y - g.c0.y, 'y'), sn(_c.z - g.c0.z, 'z'))
    }
    return true
  }
  function moveDrag(e) {
    const g = gesture, d = g.delta
    if (!(g.surface && surfaceDelta(g, e, d))) {
      raycaster.setFromCamera(toNdc(e.clientX, e.clientY), camera)
      const p = raycaster.ray.intersectPlane(g.plane, _v)
      if (!p) return
      d.subVectors(p, g.p0)
      if (app.prefs.snap) { const s = app.prefs.moveSnap || 1; d.x = Math.round(d.x / s) * s; d.z = Math.round(d.z / s) * s }
      d.y = 0
    }
    for (const it of g.items) { const w = it.w0.clone().add(d).applyMatrix4(it.parentInv); it.o3d.position.copy(w) }
    placePivot(); if (app.selection.some(id => app.obj(id)?.type === 'group')) refreshOutlines()
    shadowsDirty(); requestRender()
  }
  function endDrag(g) {
    const d = g.delta
    orbit.enabled = true
    if (d.lengthSq() < 1e-10) { syncIds(g.items.map(i => i.id)); requestRender(); return }
    const r = x => Math.round(x * 1e4) / 1e4
    const vals = g.items.map(it => { const w = it.w0.clone().add(d).applyMatrix4(it.parentInv); return [it.id, { pos: [r(w.x), r(w.y), r(w.z)] }] })
    if (app.onTransform?.(vals, 'Move')) { requestRender(); return }
    app.transact('Move', () => { for (const [id, t] of vals) app.set(id, t) })
  }
  function cancelDrag(g = gesture) { if (g?.items) syncIds(g.items.map(i => i.id)); gesture = null; orbit.enabled = true; requestRender() }

  // box select
  const boxEl = document.createElement('div'); boxEl.className = 'vp-box'; el.appendChild(boxEl)
  function startBox(g) { gesture = { ...g, kind: 'box' }; boxEl.style.display = 'block'; moveBox({ clientX: g.x, clientY: g.y }) }
  function moveBox(e) {
    const g = gesture, r = el.getBoundingClientRect()
    const x0 = Math.min(g.x, e.clientX), y0 = Math.min(g.y, e.clientY), x1 = Math.max(g.x, e.clientX), y1 = Math.max(g.y, e.clientY)
    g.rect = [x0, y0, x1, y1]
    Object.assign(boxEl.style, { left: x0 - r.left + 'px', top: y0 - r.top + 'px', width: x1 - x0 + 'px', height: y1 - y0 + 'px' })
  }
  function endBox(g) {
    boxEl.style.display = 'none'
    if (!g.rect) return
    const [x0, y0, x1, y1] = g.rect, ids = []
    for (const id of app.children(null)) {
      if (!selectable(id)) continue
      const o3d = objects.get(id); if (!o3d) continue
      _box.setFromObject(o3d); if (_box.isEmpty()) _box.setFromCenterAndSize(_v.setFromMatrixPosition(o3d.matrixWorld), _v2.set(0.1, 0.1, 0.1))
      const c = vp.project(_box.getCenter(_v))
      if (c.z < 1 && c.x >= x0 && c.x <= x1 && c.y >= y0 && c.y <= y1) ids.push(id)
    }
    app.select(ids, g.shift || g.ctrl ? { add: true } : {})
  }

  // ---------- camera ----------
  function camState() { const p = camera.position, t = orbit.target; const r = v => Math.round(v * 1000) / 1000; return { pos: [r(p.x), r(p.y), r(p.z)], target: [r(t.x), r(t.y), r(t.z)], fov: persp.fov, ortho: camera === ortho } }
  function setOrtho(on) {
    if (on === (camera === ortho)) return
    const dist = camera.position.distanceTo(orbit.target)
    if (on) { orthoDist = dist; ortho.position.copy(persp.position); ortho.quaternion.copy(persp.quaternion); ortho.zoom = 1; fitOrtho(); camera = ortho }
    else { persp.position.copy(ortho.position); const d = orthoDist / ortho.zoom; persp.position.copy(orbit.target).addScaledVector(_v.subVectors(ortho.position, orbit.target).normalize(), d); camera = persp }
    orbit.object = camera; tc.camera = camera
    orbit.update(); app.emit('camera', camState()); requestRender()
  }
  function setCam(s) {
    if (!s) return
    if (s.fov) { persp.fov = s.fov; persp.updateProjectionMatrix() }
    if (s.target) orbit.target.set(...s.target)
    if (s.pos) { persp.position.set(...s.pos); ortho.position.set(...s.pos) }
    if (s.ortho !== undefined) setOrtho(!!s.ortho)
    if (camera === ortho) { orthoDist = camera.position.distanceTo(orbit.target); ortho.zoom = 1; fitOrtho() }
    orbit.update(); requestRender()
  }
  let camAnim = null
  function animateCamera(to, duration = 250) {
    camAnim?.()
    const fromP = camera.position.clone(), fromT = orbit.target.clone(), fromZ = camera.zoom
    const toP = to.pos ? new THREE.Vector3(...to.pos) : fromP, toT = to.target ? new THREE.Vector3(...to.target) : fromT
    const toZ = to.zoom ?? fromZ
    if (to.fov && camera === persp) { persp.fov = to.fov; persp.updateProjectionMatrix() }
    if (!duration || matchMedia('(prefers-reduced-motion: reduce)').matches) { camera.position.copy(toP); orbit.target.copy(toT); camera.zoom = toZ; camera.updateProjectionMatrix(); orbit.update(); saveCam(); requestRender(); return Promise.resolve() }
    return new Promise(res => {
      const t0 = performance.now()
      const stop = vp.loop(() => {
        const t = Math.min(1, (performance.now() - t0) / duration) // wall clock: slow frames never stretch the move
        const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        camera.position.lerpVectors(fromP, toP, k); orbit.target.lerpVectors(fromT, toT, k)
        camera.zoom = fromZ + (toZ - fromZ) * k; camera.updateProjectionMatrix()
        orbit.update()
        if (t >= 1) { camAnim = null; saveCam(); res(); return false }
      })
      camAnim = () => { stop(); res() }
    })
  }
  function boxOf(ids) {
    const b = new THREE.Box3()
    for (const id of ids) { const o = objects.get(id); if (o && o.visible) { o.updateWorldMatrix(true, true); b.expandByObject(o) } }
    return b
  }
  function frame(ids, duration = 250) {
    ids = ids && ids.length ? ids : [...objects.keys()].filter(id => !app.obj(id)?.parent)
    const b = boxOf(ids)
    if (b.isEmpty()) b.setFromCenterAndSize(new THREE.Vector3(0, 1, 0), new THREE.Vector3(8, 8, 8))
    const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.5, b.getSize(_v2).length() / 2)
    const dir = _v.subVectors(camera.position, orbit.target).normalize()
    if (!isFinite(dir.x) || dir.lengthSq() < 0.5) dir.set(1, 0.8, 1).normalize()
    const fit = Math.min(persp.fov, persp.fov * persp.aspect) * D2R / 2
    const dist = r / Math.sin(fit) * 1.08
    if (camera === ortho) { orthoDist = dist; fitOrtho(); return animateCamera({ pos: c.clone().addScaledVector(dir, dist).toArray(), target: c.toArray(), zoom: 1 }, duration) }
    return animateCamera({ pos: c.clone().addScaledVector(dir, dist).toArray(), target: c.toArray() }, duration)
  }
  function setView(name, duration = 250) {
    const v = VIEWS[name]
    if (!v) throw new Error('Unknown view: ' + name)
    const dist = camera.position.distanceTo(orbit.target)
    const dir = new THREE.Vector3(...v).normalize()
    currentView = name
    const p = orbit.target.clone().addScaledVector(dir, dist)
    return animateCamera({ pos: p.toArray(), target: orbit.target.toArray() }, duration)
  }
  let currentView = 'user'
  let camTimer = 0
  function saveCam() {
    clearTimeout(camTimer)
    camTimer = setTimeout(() => { if (app.projectId) { try { localStorage.setItem('studio.cam.' + app.projectId, JSON.stringify(camState())) } catch {} } app.emit('camera', camState()) }, 400)
  }
  // endless zoom: OrbitControls stops dead at its target, so when the camera gets close the target jumps ahead along
  // the view; zooming keeps travelling forward (through doors, into rooms) at any scale
  const _fw = new THREE.Vector3()
  function keepAhead() {
    if (camera !== persp || !orbit.enabled) return
    const d = persp.position.distanceTo(orbit.target), rMin = Math.max(0.02, sceneR * 0.01)
    if (d < rMin) { persp.getWorldDirection(_fw); orbit.target.copy(persp.position).addScaledVector(_fw, rMin * 6); orbit.update() }
  }
  orbit.addEventListener('change', () => { keepAhead(); requestRender(); fitSoon() })
  orbit.addEventListener('start', () => { camAnim?.(); currentView = 'user' })
  orbit.addEventListener('end', saveCam)
  // ---------- fly mode (core/fly.js, loaded on first use) ----------
  const flyBtn = document.createElement('button')
  flyBtn.className = 'vp-fly'; flyBtn.type = 'button'; flyBtn.title = 'Fly through the scene (Shift+F)'; flyBtn.textContent = 'Fly'
  flyBtn.addEventListener('pointerdown', e => e.stopPropagation())
  flyBtn.addEventListener('click', e => { e.stopPropagation(); fly(!flyStop) })
  el.appendChild(flyBtn)
  async function fly(on) {
    if (flyBusy || !!on === !!flyStop) return !!flyStop
    if (!on) { const s = flyStop; flyStop = null; s(); flyBtn.classList.remove('on'); saveCam(); app.emit('camera', camState()); return false }
    flyBusy = true
    try {
      if (camera === ortho) setOrtho(false)
      camAnim?.()
      const { startFly } = await import('./fly.js')
      flyStop = startFly({ THREE, el, orbit, requestRender, loop: vp.loop, camera: () => camera, persp: () => persp, sceneR: () => sceneR, exit: () => fly(false) })
      flyBtn.classList.add('on')
    } finally { flyBusy = false }
    return true
  }
  Object.defineProperty(vp, 'flying', { get: () => !!flyStop, enumerable: true })
  Object.assign(vp, { frame, setView, animateCamera, setOrtho, getCamera: camState, setCamera: setCam, boxOf, fly })
  Object.defineProperty(vp, 'view', { get: () => currentView, enumerable: true }) // a live getter (Object.assign would copy the value once)

  // ---------- axis gizmo (top right) ----------
  const NS = 'http://www.w3.org/2000/svg'
  const axes = document.createElementNS(NS, 'svg')
  axes.setAttribute('class', 'vp-axes'); axes.setAttribute('viewBox', '-40 -40 80 80')
  const AX = [['X', '#e5484d', [1, 0, 0], 'right'], ['Y', '#3fb950', [0, 1, 0], 'top'], ['Z', '#3d8bfd', [0, 0, 1], 'front'], ['-X', '#e5484d', [-1, 0, 0], 'left'], ['-Y', '#3fb950', [0, -1, 0], 'bottom'], ['-Z', '#3d8bfd', [0, 0, -1], 'back']]
  const axEls = AX.map(([n, col, , view]) => {
    const g = document.createElementNS(NS, 'g'), l = document.createElementNS(NS, 'line'), c = document.createElementNS(NS, 'circle')
    l.setAttribute('stroke', col); l.setAttribute('stroke-width', '2'); l.setAttribute('x1', '0'); l.setAttribute('y1', '0')
    c.setAttribute('r', n[0] === '-' ? '5' : '8'); c.setAttribute('fill', n[0] === '-' ? 'transparent' : col); c.setAttribute('stroke', col); c.setAttribute('stroke-width', '1.5')
    g.append(l, c)
    if (n[0] !== '-') { const t = document.createElementNS(NS, 'text'); t.textContent = n; t.setAttribute('text-anchor', 'middle'); t.setAttribute('dy', '3.5'); g.append(t) } else l.setAttribute('opacity', '0')
    g.style.cursor = 'pointer'
    g.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); setView(view) })
    axes.append(g)
    return { g, l, c }
  })
  el.appendChild(axes)
  const _q = new THREE.Quaternion()
  function updateAxes() {
    _q.copy(camera.quaternion).invert()
    const list = AX.map(([, , d], i) => { const v = _v.set(...d).applyQuaternion(_q); return { i, x: v.x * 26, y: -v.y * 26, z: v.z } }).sort((a, b) => a.z - b.z)
    for (const { i, x, y } of list) { const a = axEls[i]; a.l.setAttribute('x2', x); a.l.setAttribute('y2', y); a.c.setAttribute('cx', x); a.c.setAttribute('cy', y); const t = a.g.querySelector('text'); if (t) { t.setAttribute('x', x); t.setAttribute('y', y) } axes.appendChild(a.g) }
  }

  // ---------- snapshot ----------
  // Draws into an offscreen target at thumbnail size: the canvas is never resized, so the main thread never waits for the GPU
  // to finish the frame on screen (a resize does: 0.2 s on a 50k-tri scene), and the screen needs no redraw afterwards.
  vp.snapshot = (o = {}) => {
    const w = o.w || 320, h = o.h || 200
    const hv = helpers.visible, gv = gizmo.visible, ins = inset
    helpers.visible = false; gizmo.visible = false
    const lh = []; world.traverse(c => { if ((c.userData.lightHelper || c.userData.helper) && c.visible) { c.visible = false; lh.push(c) } })
    if (ins) { inset = 0; applyInset() }
    const k = Math.min(1, Math.max(w / canvas.width, h / canvas.height)), sw = Math.max(1, Math.round(canvas.width * k)), sh = Math.max(1, Math.round(canvas.height * k))
    const rt = new THREE.WebGLRenderTarget(sw, sh, { samples: renderer.getContext().getContextAttributes().antialias ? 4 : 0, colorSpace: THREE.SRGBColorSpace })
    // three then shades it like the screen (tone mapping + sRGB in the shader): same picture, same compiled programs.
    // Plain RGBA8 storage, or the MSAA resolve fails (sRGB texture vs RGBA8 samples) and the picture comes out empty.
    rt.isXRRenderTarget = true; rt.texture.internalFormat = 'RGBA8'
    if (needShadow) { renderer.shadowMap.needsUpdate = true; needShadow = false }
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null)
    if (ins) { inset = ins; applyInset() }
    helpers.visible = hv; gizmo.visible = gv; for (const c of lh) c.visible = true
    const px = new Uint8Array(sw * sh * 4)
    const encode = () => {
      const im = new ImageData(sw, sh), row = sw * 4
      for (let y = 0; y < sh; y++) im.data.set(px.subarray((sh - 1 - y) * row, (sh - y) * row), y * row) // GL rows run bottom-up
      const c = document.createElement('canvas'); c.width = sw; c.height = sh; c.getContext('2d').putImageData(im, 0, 0)
      const out = document.createElement('canvas'); out.width = w; out.height = h
      const s = Math.max(w / sw, h / sh); out.getContext('2d').drawImage(c, (w - sw * s) / 2, (h - sh * s) / 2, sw * s, sh * s)
      try { return out.toDataURL(o.type || 'image/webp', o.quality ?? 0.8) } catch { return null }
    }
    if (!o.async) { renderer.readRenderTargetPixels(rt, 0, 0, sw, sh, px); rt.dispose(); return encode() }
    // async: the pixels copy on the GPU behind a fence; the main thread polls instead of waiting for the frame
    return renderer.readRenderTargetPixelsAsync(rt, 0, 0, sw, sh, px).then(encode, () => null).finally(() => rt.dispose())
  }

  // ---------- app events ----------
  app.on('project', () => {
    rebuildAll(); applyEnv(); refreshOutlines(); updateGizmo()
    let cam = null
    try { cam = JSON.parse(localStorage.getItem('studio.cam.' + app.projectId) || 'null') } catch {}
    setCam(cam || app.scene.camera)
    requestRender()
  })
  app.on('change', ch => {
    if (ch.objects.length) syncIds(ch.objects)
    if (ch.top.includes('env')) applyEnv()
    if (ch.textures.length) { for (const id of ch.textures) invalidateTexture(id); for (const k of [...texCache.keys()]) if (ch.textures.includes(k.split('|')[0])) texCache.delete(k); syncIds(app.ids().filter(id => ch.textures.includes(app.obj(id).texture)), true) }
    if (ch.top.includes('camera') && ch.source !== 'local') setCam(app.scene.camera)
    if (ch.objects.length) { fitSoon(); needShadow = true; if (!dragStart) { refreshOutlines(); updateGizmo() } }
    requestRender()
  })
  app.on('geo', ({ id }) => { syncIds(app.ids().filter(oid => app.obj(oid).geo === id)); refreshOutlines(); needShadow = true; fitSoon(); requestRender() })
  app.on('tex', ({ id }) => { invalidateTexture(id); for (const k of [...texCache.keys()]) if (k.startsWith(id + '|')) texCache.delete(k); syncIds(app.ids().filter(oid => app.obj(oid).texture === id), true); requestRender() })
  app.on('select', () => { refreshOutlines(); updateGizmo() })
  app.on('tool', updateGizmo)
  app.on('mode', updateGizmo)
  app.on('prefs', updateGizmo)
  return vp
}
