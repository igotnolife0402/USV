// Grassy meadow: everything that makes the lawn and the land around it a meadow instead of a green slab.
// Inside the 300 x 300 lobby (outside the spawn): colour patches, grass tufts, wildflower clumps, rocks, bushes.
// Outside it: rolling hills, scattered trees, a distant tree line. Studs, Y up.
// Thousands of pieces are merged into one mesh per colour (Studio's geo store), because the project document must stay
// under Studio's 256 KB save limit. Each s.stage = one live write.
import { HALF, PALETTE as C } from '../lib/layout.mjs'
import { shade, polar } from '../lib/color.mjs'
import { rng } from '../lib/rng.mjs'
import { cylinder, cone, box, sphere, place, createGeo } from '../lib/mesh.mjs'

const R = rng(2026)
const SPAWN_R = 44                              // keep clear of the spawn platform (78 studs across)
const MAX_VERTS = 3500                           // keeps every geo doc well under 230 KB
const GRASS = ['#5fae3e', '#6cb84a', '#78c552', '#4f9a35']
const FLOWERS = [['#ffffff', '#ffd23f'], ['#ffd23f', '#e08a1e'], ['#c58cff', '#ffe07a'], ['#ff8fb1', '#ffe07a'], ['#7fb8ff', '#ffffff']]
const STEM = '#3f8a2c'

function spot(minR = SPAWN_R, half = HALF - 3) {
  for (;;) { const x = R.range(-half, half), z = R.range(-half, half); if (Math.hypot(x, z) > minR) return [x, z] }
}
function ring(minR, maxR) { const a = R.range(0, 360), r = Math.sqrt(R.range(minR * minR, maxR * maxR)); const [x, , z] = polar(r, a); return [x, z] }
const outside = ([x, z]) => Math.abs(x) > HALF + 4 || Math.abs(z) > HALF + 4

// One merged mesh per colour key; a key that grows past MAX_VERTS starts a second mesh.
function collector(z, parent, area) {
  const open = new Map(), done = []
  return {
    add(key, style, piece) {
      let k = open.get(key)
      if (k && k.geo.data().verts.length / 3 + piece.pts.length > MAX_VERTS) { done.push(k); k = null }
      if (!k) open.set(key, k = { key, style, geo: createGeo(), n: done.filter(d => d.key === key).length + 1 })
      k.geo.add(piece)
    },
    flush(name) {
      for (const k of [...done, ...open.values()])
        z.mesh(`${name}: ${k.key}${k.n > 1 ? ' ' + k.n : ''}`, k.geo.data(), { parent, ...k.style, pieces: k.geo.pieces, area })
      open.clear(); done.length = 0
    }
  }
}
const grassStyle = color => ({ color, material: 'Grass', castShadow: false })
const plastic = color => ({ color, material: 'SmoothPlastic', castShadow: false })

function tuft(M, [x, zz], k = 1.8) {
  const n = R.int(4, 6), i = R.int(0, GRASS.length - 1)
  for (let b = 0; b < n; b++) {
    const h = R.range(1.1, 2.2) * k
    M.add('blades ' + i, grassStyle(GRASS[i]), place(cone([0.4 * k, h, 0.4 * k], 4), {
      pos: [x + R.range(-0.5, 0.5) * k, h / 2, zz + R.range(-0.5, 0.5) * k], rot: [R.range(-20, 20), R.range(0, 90), R.range(-20, 20)] }))
  }
}

function flower(M, [x, zz]) {
  const c = R.int(0, FLOWERS.length - 1), [petal, centre] = FLOWERS[c], h = R.range(1.6, 3.0), tilt = [R.range(-12, 12), 0, R.range(-12, 12)]
  M.add('stems', grassStyle(STEM), place(cylinder([0.2, h, 0.2], 4), { pos: [x, h / 2, zz] }))
  M.add('leaves', grassStyle('#4f9a35'), place(cone([0.5, 0.9, 0.2], 3), { pos: [x + 0.25, h * 0.3, zz], rot: [0, R.range(0, 360), -40] }))
  M.add('petals ' + c, plastic(petal), place(cylinder([1.5, 0.12, 1.5], 8), { pos: [x, h, zz], rot: tilt }))
  M.add('centres ' + centre, plastic(centre), place(cylinder([0.55, 0.2, 0.55], 6), { pos: [x, h + 0.08, zz], rot: tilt }))
}

const ROCKS = ['#8d887f', '#9a958c', '#aaa59b']
function rock(M, [x, zz], s) {
  const a = R.range(0, 360), k = R.int(0, 2)
  M.add('rock ' + k, { color: ROCKS[k], material: 'Slate' }, place(sphere([2.6 * s, 1.5 * s, 2 * s], 6, 4), { pos: [x, 0.45 * s, zz], rot: [R.range(-8, 8), a, R.range(-10, 10)] }))
  const [cx, , cz] = polar(1.3 * s, a + 40), k2 = (k + 1) % 3
  M.add('rock ' + k2, { color: ROCKS[k2], material: 'Slate' }, place(box([1.3 * s, 0.9 * s, 1.1 * s]), { pos: [x + cx, 0.35 * s, zz + cz], rot: [0, a + 25, R.range(-15, 15)] }))
  M.add('moss', grassStyle('#5a9a3a'), place(sphere([1.9 * s, 0.35 * s, 1.4 * s], 6, 3), { pos: [x, 1.05 * s, zz], rot: [0, a, 0] }))
}

function bush(M, [x, zz], s) {
  const k = R.int(0, 2), col = shade(C.leaf, [-10, 0, 8][k])
  for (const [px, py, pz, d] of [[0, 1.1, 0, 2.6], [1.3, 0.85, 0.4, 1.9], [-1.2, 0.8, -0.3, 2.0], [0.3, 0.8, -1.2, 1.7]])
    M.add('bush ' + k, { color: col, material: 'Grass', smooth: true }, place(sphere([d * s, d * 0.8 * s, d * s], 8, 5), { pos: [x + px * s, py * s, zz + pz * s] }))
  for (let i = 0; i < 4; i++)
    M.add('berries', plastic('#e8454f'), place(sphere([0.3 * s, 0.3 * s, 0.3 * s], 5, 3), { pos: [x + R.range(-1, 1) * s, 1.55 * s, zz + R.range(-1, 1) * s] }))
}

function roundTree(M, [x, zz], s) {
  const a = R.range(0, 360), k = R.int(0, 2), leaf = [C.leaf, C.leafLight, C.leafDark][k]
  const bark = { color: C.bark, material: 'Wood' }
  M.add('bark', bark, place(cylinder([2.2 * s, 12 * s, 2.2 * s], 8), { pos: [x, 6 * s, zz] }))
  M.add('bark', bark, place(cone([4 * s, 2.4 * s, 4 * s], 8), { pos: [x, 1.2 * s, zz] }))
  for (const [b, tilt] of [[0, 35], [140, 40], [250, 32]]) {
    const [bx, , bz] = polar(1.6 * s, a + b)
    M.add('bark', bark, place(cylinder([1 * s, 6 * s, 1 * s], 6), { pos: [x + bx, 11.5 * s, zz + bz], rot: [tilt, a + b, 0] }))
  }
  for (const [px, py, pz, d] of [[0, 17, 0, 11], [4, 15, 2, 8], [-4, 15.5, -1, 8.5], [1, 14.5, -4, 7.5], [-1, 20, 1, 7]])
    M.add('canopy ' + k, { color: leaf, material: 'Grass', smooth: true }, place(sphere([d * s, d * 0.85 * s, d * s], 10, 6), { pos: [x + px * s, py * s, zz + pz * s], rot: [0, a, 0] }))
}

function pine(M, [x, zz], s) {
  M.add('pine trunks', { color: shade(C.bark, -6), material: 'Wood' }, place(cylinder([1.6 * s, 6 * s, 1.6 * s], 6), { pos: [x, 3 * s, zz] }))
  for (const [k, [d, h, y]] of [[10, 8, 7], [8, 7, 11], [5.5, 6, 15]].entries())
    M.add('pine tier ' + k, { color: shade(C.leafDark, k * 6), material: 'Grass' }, place(cone([d * s, h * s, d * s], 8), { pos: [x, y * s, zz], rot: [0, R.range(0, 90), 0] }))
}

export function buildMeadow(s) {
  const z = s.zone('meadow')
  s.stage('Meadow colour')
  const root = z.group('Meadow')
  // Irregular flat patches of other greens break the lawn up (0.02 above it, so no z-fighting).
  const patches = collector(z, root, 'walk')
  for (let i = 0; i < 160; i++) {
    const [x, zz] = spot(SPAWN_R - 4), w = R.range(6, 18), k = i % 3
    patches.add('patch ' + k, grassStyle(shade(C.meadow, [-9, 5, 10][k])), place(cylinder([w, 0.04, w * R.range(0.5, 0.9)], 10), { pos: [x, 0.02 + k * 0.004, zz], rot: [0, R.range(0, 180), 0] }))
  }
  patches.flush('Grass patches')

  s.stage('Grass tufts')
  const tufts = collector(z, root, 'walk')
  for (let i = 0; i < 700; i++) tuft(tufts, spot())
  tufts.flush('Grass')

  s.stage('Wildflowers')
  // Flowers grow in clumps of 4-9 around 80 clump centres, plus strays.
  const fl = collector(z, root, 'walk')
  for (let c = 0; c < 80; c++) {
    const [cx, cz] = spot(SPAWN_R + 3), n = R.int(4, 9)
    for (let i = 0; i < n; i++) flower(fl, [cx + R.range(-4.5, 4.5), cz + R.range(-4.5, 4.5)])
  }
  for (let i = 0; i < 60; i++) flower(fl, spot())
  fl.flush('Wildflowers')

  s.stage('Rocks and bushes')
  const rb = collector(z, root, 'walk')
  for (let i = 0; i < 34; i++) rock(rb, spot(SPAWN_R + 6), R.range(0.7, 1.6))
  for (let i = 0; i < 34; i++) bush(rb, spot(SPAWN_R + 8), R.range(0.8, 1.4))
  rb.flush('Rocks and bushes')

  s.stage('Rolling hills')
  // Buried domes outside the lobby, grass and flowers on the near slopes.
  const hills = collector(z, root, 'terrain')
  for (let i = 0; i < 40; i++) {
    const [x, zz] = ring(HALF + 40, 330), w = R.range(60, 150), k = i % 3
    hills.add('hill ' + k, { color: [C.meadow, C.meadowFar, '#62ab42'][k], material: 'Grass', smooth: true, castShadow: false },
      place(sphere([w, w * R.range(0.18, 0.32), w * R.range(0.7, 1)], 16, 8), { pos: [x, -w * 0.05, zz], rot: [0, R.range(0, 180), 0] }))
  }
  for (let i = 0; i < 380; i++) { const p = ring(HALF + 6, HALF + 110); if (outside(p)) tuft(hills, p, 2.4) }
  for (let i = 0; i < 160; i++) { const p = ring(HALF + 6, HALF + 90); if (outside(p)) flower(hills, p) }
  hills.flush('Hills')

  s.stage('Meadow trees')
  const trees = collector(z, root, 'terrain')
  for (let i = 0; i < 40; i++) { const p = ring(HALF + 14, HALF + 120); if (outside(p)) roundTree(trees, p, R.range(0.9, 1.5)) }
  for (let i = 0; i < 26; i++) { const p = ring(HALF + 20, HALF + 130); if (outside(p)) pine(trees, p, R.range(1.2, 1.9)) }
  for (let i = 0; i < 24; i++) rock(trees, ring(HALF + 10, HALF + 110), R.range(1.5, 3))
  trees.flush('Trees')

  s.stage('Tree line')
  // A ring of tall pines near the edge of the world hides where the ground ends.
  const line = collector(z, root, 'terrain')
  for (let i = 0; i < 90; i++) { const a = i * 4 + R.range(-1.5, 1.5), [x, , zz] = polar(R.range(300, 335), a); pine(line, [x, zz], R.range(2.2, 3.2)) }
  line.flush('Tree line')
  return root
}
