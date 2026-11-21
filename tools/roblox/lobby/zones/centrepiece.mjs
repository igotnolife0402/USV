// Old Oak centrepiece (hero piece), built from lobby/blueprints/oak.md with the 10x method: every number here is in
// 0.1-stud working units (UNIT) and baked to studs. Origin of the piece = OAK; +Z faces the spawn. Each s.stage = one live write.
import { OAK, UNIT, PALETTE as C } from '../lib/layout.mjs'
import { shade, polar } from '../lib/color.mjs'
import { rng } from '../lib/rng.mjs'

const R = rng(77)
const STONE = ['#9c978d', '#aaa59b', '#b8b3a8'], SLATE = ['#5a606b', '#6d7480', '#7f8692'], LEAVES = ['#3f8f2e', '#4f9a35', '#63b043']
const BARK = '#5b4030', BEAM = '#7fe3ff'
// Blueprint numbers are drawn at 1x; K scales the whole piece so it is >= 25% of the 300-stud lobby (Standard).
const K = 1.6, U = UNIT * K

// Cylinder from a to b (working units). Studio rotates XYZ (R = Rx*Ry*Rz); with Ry = 0, R*(0,1,0) = (-sin g, cos g cos a, cos g sin a).
function segment(z, name, parent, a, b, d, props = {}) {
  const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(...v), [dx, dy, dz] = v.map(c => c / len)
  const gam = -Math.asin(Math.max(-1, Math.min(1, dx))) * 180 / Math.PI, alp = Math.atan2(dz, dy) * 180 / Math.PI
  return z.part(name, { parent, shape: 'cylinder', size: [d, len, d], pos: a.map((c, i) => c + v[i] / 2), rot: [alp, 0, gam], material: 'Wood', color: BARK, ...props })
}
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

function flame(z, parent, at) {
  const f = z.group('Flame', { parent, pos: at })
  z.part('Flame outer', { parent: f, shape: 'cone', size: [9, 16, 9], pos: [0, 2, 0], material: 'Neon', color: '#ff9a3c' })
  z.part('Flame mid', { parent: f, shape: 'cone', size: [6, 12, 6], pos: [0, 2.5, 0], material: 'Neon', color: C.lantern })
  z.part('Flame core', { parent: f, shape: 'cone', size: [3, 7, 3], pos: [0, 1.5, 0], material: 'Neon', color: '#fff6dc' })
}

export function buildCentrepiece(s) {
  const z = s.zone('oak', { unit: U })
  s.stage('Oak plinth')
  const hero = z.group('Old Oak', { tag: 'hero', pos: OAK.map(v => v / U) })
  const base = z.group('Stone ring', { parent: hero })
  z.part('Mound', { parent: base, shape: 'cylinder', size: [400, 16, 400], pos: [0, 8, 0], material: 'Grass', color: '#4d8f34' })
  z.part('Moss rim', { parent: base, shape: 'torus', size: [404, 9, 404], pos: [0, 15, 0], material: 'Grass', color: '#5fa63f' })
  // 22 wall blocks on r 220; the 3 slots facing +Z (the spawn) stay open for the steps.
  for (let i = 0; i < 25; i++) {
    const a = i * 14.4
    if (Math.abs(((a + 180) % 360) - 180) < 20) continue
    const b = z.group('Wall block', { parent: base, pos: polar(220, a, 0), rot: [0, a + R.range(-2, 2), 0] })
    z.part('Block', { parent: b, size: [60, 14, 24], bevel: 3, pos: [0, 7, 0], material: 'Cobblestone', color: STONE[i % 3] })
    z.part('Capstone', { parent: b, size: [64, 4, 28], bevel: 1.5, pos: [0, 16, 0], material: 'Concrete', color: shade('#c9c4b8', (i % 3 - 1) * 5) })
  }
  const st = z.group('Steps', { parent: base, pos: [0, 0, 236] })
  for (const [k, top] of [5, 10, 14].entries()) {
    z.part('Step', { parent: st, size: [80, top, 18], bevel: 2, pos: [0, top / 2, 18 - k * 18], material: 'Slate', color: SLATE[k] })
    z.part('Nosing trim', { parent: st, size: [74, 1.5, 3], pos: [0, top + 0.5, 25 - k * 18], material: 'Neon', color: BEAM })
  }
  // Plaque with an original clover emblem, on the wall beside the steps.
  const pl = z.group('Plaque', { parent: base, pos: polar(226, 24, 0), rot: [0, 24, 0] })
  z.part('Plaque board', { parent: pl, size: [70, 32, 4], bevel: 1.5, pos: [0, 30, 14], material: 'WoodPlanks', color: C.wood })
  z.part('Plaque post', { parent: pl, size: [6, 30, 6], bevel: 1, pos: [-28, 15, 14], material: 'Wood', color: C.woodDark })
  z.part('Plaque post', { parent: pl, size: [6, 30, 6], bevel: 1, pos: [28, 15, 14], material: 'Wood', color: C.woodDark })
  const em = z.group('Clover emblem', { parent: pl, pos: [0, 30, 16.5], rot: [90, 0, 0] })
  z.part('Emblem ring', { parent: em, shape: 'torus', size: [26, 2, 26], material: 'Foil', color: C.gold })
  for (const a of [45, 135, 225, 315]) for (const side of [-1, 1]) {
    const [cx, , cz] = polar(5.5, a), [px, , pz] = polar(2 * side, a + 90)
    z.part('Leaf lobe', { parent: em, shape: 'cylinder', size: [6, 1.2, 6], pos: [cx + px, 0.4, cz + pz], material: 'SmoothPlastic', color: shade('#2ec85a', side * 6) })
  }
  z.part('Emblem stem', { parent: em, size: [1.6, 1.4, 9], pos: polar(5, 200, 0.5), rot: [0, 200, 0], material: 'SmoothPlastic', color: '#1f9a45' })
  z.part('Emblem centre', { parent: em, shape: 'cylinder', size: [3.4, 1.6, 3.4], pos: [0, 0.8, 0], material: 'Foil', color: C.gold })

  s.stage('Oak roots and trunk')
  const tree = z.group('Tree', { parent: hero, pos: [0, 16, 0] })
  for (const [k, [d0, d1, y0, y1]] of [[96, 86, 0, 60], [86, 78, 60, 120], [78, 70, 120, 180], [70, 62, 180, 240]].entries())
    z.part('Trunk', { parent: tree, shape: 'cylinder', size: [(d0 + d1) / 2, y1 - y0, (d0 + d1) / 2], pos: [0, (y0 + y1) / 2, 0], material: 'Wood', color: shade(BARK, k * 3) })
  z.part('Trunk flare', { parent: tree, shape: 'cone', size: [140, 46, 140], pos: [0, 18, 0], material: 'Wood', color: shade(BARK, -6) })
  for (let i = 0; i < 12; i++) {
    const a = i * 30 + R.range(-6, 6)
    z.part('Bark ridge', { parent: tree, size: [5, 200 + R.range(-30, 20), 4], bevel: 1.2, pos: polar(44 - (i % 2) * 2, a, 110), rot: [0, a, 0], material: 'Wood', color: shade(BARK, -12) })
  }
  for (let i = 0; i < 8; i++) {
    const a = i * 45 + R.range(-10, 10); let p = polar(34, a, 22)
    for (let k = 0; k < 3; k++) {
      const q = add3(p, add3(polar(R.range(30, 38), a + R.range(-12, 12)), [0, -k * 5 - 6, 0]))
      segment(z, 'Root', tree, p, q, 30 - k * 9, { color: shade(BARK, -4 + k * 4) }); p = q
    }
  }

  s.stage('Oak branches')
  const tips = []
  for (let i = 0; i < 6; i++) {
    const a = i * 60 + 15 + R.range(-10, 10), lift = R.range(35, 55)
    const p0 = [0, 200 + i * 7, 0], mid = add3(p0, add3(polar(70 * Math.cos(lift * Math.PI / 180), a), [0, 70 * Math.sin(lift * Math.PI / 180), 0]))
    segment(z, 'Branch', tree, p0, mid, 22)
    const end = add3(mid, add3(polar(R.range(55, 75), a + R.range(-15, 15)), [0, R.range(25, 45), 0]))
    segment(z, 'Branch', tree, mid, end, 14)
    const twig = add3(mid, add3(polar(40, a + 70), [0, 30, 0])); segment(z, 'Twig', tree, mid, twig, 8)
    tips.push({ a, mid, end })
  }

  s.stage('Oak canopy')
  const canopy = z.group('Canopy', { parent: tree })
  // Three layers for depth: a high crown, the branch-tip clusters at mixed heights, and a lower inner ring that fills the gaps.
  const centres = [[0, 350, 0, 150], ...tips.map((t, i) => [t.end[0], t.end[1] + 10 + (i % 3) * 22, t.end[2], 115 + (i % 2) * 20]),
    ...[30, 150, 270].map(a => { const [x, , zz] = polar(70, a); return [x, 265, zz, 100] })]
  centres.forEach(([cx, cy, cz, sz], k) => {
    const cl = z.group('Leaf cluster', { parent: canopy, pos: [cx, cy, cz] })
    for (let j = 0; j < 5; j++) {
      const d = sz * R.range(0.55, 0.95), o = j === 0 ? [0, 0, 0] : add3(polar(sz * 0.38, j * 90 + k * 20), [0, R.range(-20, 15), 0])
      z.part('Leaf dome', { parent: cl, shape: 'sphere', size: [d, d * 0.8, d], pos: o, material: 'Grass', color: shade(LEAVES[(j + k) % 3], R.range(-6, 6)) })
    }
    for (let j = 0; j < 4; j++)
      z.part('Leaf drip', { parent: cl, shape: 'cone', size: [26, 30, 26], pos: add3(polar(sz * 0.42, j * 90 + 45), [0, -sz * 0.35, 0]), rot: [180, 0, 0], material: 'Grass', color: LEAVES[(j + k) % 3] })
  })

  s.stage('Oak details')
  // Swing on the branch at ~60°: two ropes, a 3-plank seat.
  const sw = tips.find(t => Math.abs(((t.a - 60 + 540) % 360) - 180) > 140) || tips[1]
  const hang = add3(sw.mid, [0, -6, 0])
  const swing = z.group('Swing', { parent: tree, pos: [hang[0], hang[1], hang[2]], rot: [0, sw.a, 0] })
  for (const x of [-18, 18]) z.part('Rope', { parent: swing, shape: 'cylinder', size: [1.6, 100, 1.6], pos: [x, -50, 0], material: 'Fabric', color: '#c9a777' })
  for (const [k, dz] of [-4.5, 0, 4.5].entries()) z.part('Seat plank', { parent: swing, size: [44, 3, 4.2], bevel: 1, pos: [0, -100, dz * 1.1], material: 'WoodPlanks', color: shade(C.wood, (k - 1) * 6) })
  // Three hanging lanterns under the canopy.
  tips.slice(0, 6).filter((t, i) => i % 2 === 0).forEach((t, i) => {
    const at = add3(t.end, [0, -20, 0])
    const lan = z.group('Lantern', { parent: tree, pos: at })
    z.part('Lantern chain', { parent: lan, shape: 'cylinder', size: [1.2, 26, 1.2], pos: [0, 13, 0], material: 'Metal', color: '#3b3330' })
    z.part('Lantern cap', { parent: lan, shape: 'cone', size: [18, 9, 18], pos: [0, -2, 0], material: 'Metal', color: '#3b2b22' })
    for (const c of [45, 135, 225, 315]) z.part('Frame post', { parent: lan, size: [1.6, 16, 1.6], pos: polar(7, c, -14), material: 'Metal', color: shade(C.gold, -14) })
    z.part('Lantern glass', { parent: lan, size: [12, 16, 12], pos: [0, -14, 0], material: 'Glass', color: C.glass })
    flame(z, lan, [0, -16, 0])
    z.part('Lantern plate', { parent: lan, size: [15, 2.5, 15], bevel: 0.8, pos: [0, -23, 0], material: 'Metal', color: '#3b2b22' })
    z.light('Oak lantern', { parent: lan, pos: [0, -14, 0], color: C.lantern, intensity: 1.4, range: 260 })
  })
  // Mushrooms ring the mound.
  for (let i = 0; i < 12; i++) {
    const a = i * 30 + R.range(-8, 8), m = z.group('Mushroom', { parent: base, pos: polar(R.range(120, 175), a, 16) })
    const k = R.range(0.7, 1.3)
    z.part('Mushroom stem', { parent: m, shape: 'cylinder', size: [8 * k, 10 * k, 8 * k], pos: [0, 5 * k, 0], material: 'SmoothPlastic', color: '#f1ead8' })
    z.part('Mushroom cap', { parent: m, shape: 'cone', size: [24 * k, 9 * k, 24 * k], pos: [0, 12 * k, 0], material: 'SmoothPlastic', color: shade('#e0473f', R.range(-8, 6)) })
    for (const sa of [40, 160, 280]) z.part('Cap spot', { parent: m, shape: 'cylinder', size: [4 * k, 1.2 * k, 4 * k], pos: polar(6 * k, sa, 12.5 * k), rot: [0, 0, 22], material: 'SmoothPlastic', color: '#ffffff' })
  }
  // Fireflies drift around the canopy.
  const flies = []
  for (let i = 0; i < 16; i++) {
    const f = z.part('Firefly bead', { parent: tree, shape: 'sphere', size: [3.5, 3.5, 3.5], pos: polar(R.range(60, 170), R.range(0, 360), R.range(120, 300)), material: 'Neon', color: i % 2 ? '#d9ff7a' : '#fff07a', castShadow: false })
    flies.push(f)
  }

  s.stage('Oak benches')
  for (const a of [45, 135, 225, 315]) {
    const b = z.group('Bench', { parent: hero, tag: 'prop', pos: polar(285, a, 0), rot: [0, a + 180, 0] })
    for (const [k, dz] of [-6, 0, 6].entries()) z.part('Seat plank', { parent: b, size: [70, 3, 5.5], bevel: 1, pos: [0, 16, dz], material: 'WoodPlanks', color: shade(C.wood, (k - 1) * 6) })
    for (const [k, y] of [26, 34].entries()) z.part('Back plank', { parent: b, size: [70, 5, 2.5], bevel: 0.8, pos: [0, y, -9], rot: [-8, 0, 0], material: 'WoodPlanks', color: shade(C.wood, k * 5 - 3) })
    for (const x of [-30, 30]) {
      z.part('Leg frame', { parent: b, size: [3, 16, 18], bevel: 0.8, pos: [x, 8, 0], material: 'Metal', color: '#3c3f46' })
      z.part('Armrest', { parent: b, size: [4, 2.5, 18], bevel: 0.8, pos: [x, 24, 0], material: 'Metal', color: '#4a4e57' })
    }
  }

  // Idle animation: canopy sways, swing rocks, fireflies bob (same 8 s clip as the spawn, so one Play runs both).
  const CLIP = 'lobby-idle'
  if (!s.anims[CLIP]) s.clip(CLIP, 'Lobby idle', 8)
  z.track(CLIP, canopy, 'rot', [0, 2, 4, 6, 8].map((t, i) => [t, [0, 0, [0, 2, 0, -2, 0][i]], 'smooth']))
  z.track(CLIP, swing, 'rot', [0, 2, 4, 6, 8].map((t, i) => [t, [[0, 8, 0, -8, 0][i], sw.a, 0], 'smooth']))
  flies.forEach((f, i) => {
    const p0 = s.objects[f].pos.map(v => v / U)
    z.track(CLIP, f, 'pos', [0, 2, 4, 6, 8].map((t, k) => [t, add3(p0, [0, [0, 18, 0, -12, 0][(k + i) % 5], 0]), 'smooth']))
  })
  return hero
}
