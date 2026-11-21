// Ground under the lobby and the hero SpawnLocation at the origin (domains/roblox/maps.md: hero piece, 10x method).
// The spawn is authored in working units of 0.1 stud (UNIT) and baked down: 780 units across = 78 studs.
// Tiers, bottom up (units): slate base (top 36) → marble tier (top 54) → tiled pad (top 69) → raised clover emblem (73.5).
// Stairs climb through 4 gates in the cobble rim; 4 fluted pillars on the diagonals hold a gold frame with a spinning
// neon halo of cut gems, a bobbing faceted crystal and a light beam rising from the emblem. Each s.stage = one live write.
import { SIZE, OUTER, UNIT, PALETTE as C } from '../lib/layout.mjs'
import { shade, polar } from '../lib/color.mjs'
import { rng } from '../lib/rng.mjs'

export const IDLE_CLIP = 'lobby-idle'
const R = rng(11)
const AXES = [0, 90, 180, 270], DIAG = [45, 135, 225, 315]
const SLATE = ['#5a606b', '#6d7480', '#7f8692']
const BEAM = '#7fe3ff', MINT = '#b8ffcf', LEAF = '#2ec85a', DEEP = '#145c2b', GOLD2 = '#f0c95e', BRONZE = '#c99a35', ICE = '#3fd8ff'
const HALO_Y = 228
const ang = (a, b) => Math.abs(((a - b + 540) % 360) - 180)

// Modelled details (no stand-in spheres): each is 3+ parts.
function gem(z, parent, at, col, k = 1) {      // cut gem: crown cone, gold girdle, pavilion cone
  const g = z.group('Cut gem', { parent, pos: at })
  z.part('Gem crown', { parent: g, shape: 'cone', size: [15 * k, 14 * k, 15 * k], pos: [0, 8 * k, 0], material: 'Neon', color: col })
  z.part('Gem girdle', { parent: g, shape: 'cylinder', size: [16 * k, 2 * k, 16 * k], pos: [0, 0.5 * k, 0], material: 'Foil', color: GOLD2 })
  z.part('Gem pavilion', { parent: g, shape: 'cone', size: [15 * k, 18 * k, 15 * k], pos: [0, -9 * k, 0], rot: [180, 0, 0], material: 'Neon', color: shade(col, -12) })
  return g
}
function flame(z, parent, at, k = 1) {           // nested cones: deep orange outer, gold mid, white-hot core
  const f = z.group('Flame', { parent, pos: at })
  z.part('Flame outer', { parent: f, shape: 'cone', size: [9 * k, 16 * k, 9 * k], pos: [0, 2 * k, 0], material: 'Neon', color: '#ff9a3c' })
  z.part('Flame mid', { parent: f, shape: 'cone', size: [6 * k, 12 * k, 6 * k], pos: [0, 2.5 * k, 0], material: 'Neon', color: C.lantern })
  z.part('Flame core', { parent: f, shape: 'cone', size: [3 * k, 7 * k, 3 * k], pos: [0, 1.5 * k, 0], material: 'Neon', color: '#fff6dc' })
  return f
}
function star(z, parent, at, col) {             // 4-point spark: two crossed diamonds + a tiny boss
  const s = z.group('Spark', { parent, pos: at })
  z.part('Spark ray', { parent: s, size: [16, 2, 2], rot: [0, 0, 45], material: 'Neon', color: col })
  z.part('Spark ray', { parent: s, size: [16, 2, 2], rot: [0, 0, -45], material: 'Neon', color: col })
  z.part('Spark boss', { parent: s, shape: 'cylinder', size: [4, 3, 4], rot: [90, 0, 0], material: 'Foil', color: GOLD2 })
  return s
}

export function buildSpawn(s) {
  const g0 = s.zone('ground')

  s.stage('Ground')
  const root = g0.group('Spawn')
  // Floor top sits at y = 0; the outer meadow is 0.05 lower so the two never z-fight. Same green: no visible lobby square.
  g0.part('Lobby lawn', { parent: root, tag: 'walk', size: [SIZE, 1, SIZE], pos: [0, -0.5, 0], material: 'Grass', color: C.meadow, castShadow: false })
  g0.part('Meadow ground', { parent: root, tag: 'terrain', size: [OUTER, 1, OUTER], pos: [0, -0.55, 0], material: 'Grass', color: C.meadow, castShadow: false })

  const z = s.zone('spawn', { unit: UNIT })
  const hero = z.group('SpawnLocation', { parent: root, tag: 'hero' })

  s.stage('Base tier')
  const base = z.group('Base tier', { parent: hero })
  z.part('Slate base', { parent: base, shape: 'cylinder', size: [600, 36, 600], pos: [0, 18, 0], material: 'Slate', color: SLATE[1] })
  z.part('Foot moulding', { parent: base, shape: 'torus', size: [608, 10, 608], pos: [0, 4, 0], material: 'Slate', color: SLATE[0] })
  z.part('Top moulding', { parent: base, shape: 'torus', size: [604, 6, 604], pos: [0, 34, 0], material: 'Concrete', color: '#b9b4a8' })
  // Two staggered flagstone rings between the marble tier (r 210) and the rim (r 268).
  for (const [ring, r, n, sz] of [[0, 226, 30, [38, 2.4, 26]], [1, 252, 36, [36, 2.4, 22]]])
    for (let i = 0; i < n; i++) {
      const a = (i + ring * 0.5) * 360 / n
      if (AXES.some(x => ang(a, x) < 7)) continue               // stair landings stay clear
      z.part('Slate flag', { parent: base, size: [sz[0] * R.range(0.9, 1.05), sz[1], sz[2]], bevel: 3, pos: polar(r, a, 37.2), rot: [0, a + R.range(-2, 2), 0], material: 'Slate', color: SLATE[(i + ring) % 3] })
    }
  for (const a of AXES) z.part('Landing slab', { parent: base, size: [150, 2.4, 70], bevel: 3, pos: polar(240, a, 37.2), rot: [0, a, 0], material: 'Marble', color: shade(C.marble, -6) })
  // Rim: 16 slots on r 288; the two flanking each stair axis stay open as gates. Each block: body, capstone, neon inlay.
  for (let i = 0; i < 16; i++) {
    const a = 11.25 + i * 22.5
    if (AXES.some(x => ang(a, x) < 12)) continue
    const b = z.group('Rim block', { parent: base, pos: polar(288, a, 0), rot: [0, a, 0] })
    z.part('Block body', { parent: b, size: [106, 44, 40], bevel: 4, pos: [0, 22, 0], material: 'Cobblestone', color: shade(C.stone, (i % 3 - 1) * 7 + R.range(-2, 2)) })
    z.part('Capstone', { parent: b, size: [110, 7, 46], bevel: 3, pos: [0, 47.5, 0], material: 'Concrete', color: shade('#c9c4b8', (i % 3 - 1) * 6) })
    z.part('Rim inlay trim', { parent: b, size: [70, 3, 2], pos: [0, 30, 21], material: 'Neon', color: BEAM })
    z.part('Rim inlay trim', { parent: b, size: [70, 3, 2], pos: [0, 30, -21], material: 'Neon', color: BEAM })
  }
  z.part('Gold inlay ring', { parent: base, shape: 'torus', size: [522, 5, 522], pos: [0, 37.6, 0], material: 'Foil', color: shade(C.gold, -10) })

  s.stage('Stairs and gates')
  const stairs = z.group('Stairs', { parent: hero })
  for (const a of AXES) {
    const st = z.group('Stair', { parent: stairs, rot: [0, a, 0] })
    // 3 full-height treads (tops 12 / 24 / 36 units = 1.2 / 2.4 / 3.6 studs): 1.2-stud risers, walkable for a Roblox character.
    for (const [k, top] of [12, 24, 36].entries()) {
      const r = 372 - k * 36
      z.part('Tread', { parent: st, size: [150, top, 36], bevel: 3, pos: [0, top / 2, r], material: 'Slate', color: SLATE[k] })
      z.part('Nosing trim', { parent: st, size: [140, 2, 4], pos: [0, top + 0.6, r + 15], material: 'Neon', color: BEAM })
    }
    for (const side of [-1, 1]) {
      // Stringer wedges rise toward the platform (high side faces inward).
      z.part('Stringer', { parent: st, shape: 'wedge', size: [14, 40, 112], pos: [side * 82, 20, 336], rot: [0, 180, 0], material: 'Cobblestone', color: shade('#8f8b82', side * 5) })
      const gp = z.group('Gate post', { parent: st, tag: 'prop', pos: [side * 96, 0, 288] })
      z.part('Post foot', { parent: gp, size: [46, 10, 46], bevel: 3, pos: [0, 5, 0], material: 'Slate', color: SLATE[0] })
      z.part('Post shaft', { parent: gp, size: [34, 56, 34], bevel: 4, pos: [0, 38, 0], material: 'Cobblestone', color: shade('#8f8b82', side * 4) })
      z.part('Post band', { parent: gp, size: [36, 3, 36], pos: [0, 50, 0], material: 'Neon', color: BEAM })
      z.part('Post cap', { parent: gp, size: [42, 6, 42], bevel: 2, pos: [0, 69, 0], material: 'Concrete', color: '#c9c4b8' })
      z.part('Post roof', { parent: gp, shape: 'cone', size: [34, 18, 34], pos: [0, 81, 0], material: 'Metal', color: shade(C.gold, side * 6) })
      gem(z, gp, [0, 100, 0], side < 0 ? ICE : C.clover, 0.8)
    }
  }

  s.stage('Marble tier')
  const mid = z.group('Marble tier', { parent: hero })
  z.part('Marble disc', { parent: mid, shape: 'cylinder', size: [420, 18, 420], pos: [0, 45, 0], material: 'Marble', color: C.marble })
  z.part('Gold trim band', { parent: mid, shape: 'torus', size: [428, 9, 428], pos: [0, 53, 0], material: 'Metal', color: C.gold })
  z.part('Lower trim band', { parent: mid, shape: 'torus', size: [424, 5, 424], pos: [0, 39, 0], material: 'Foil', color: GOLD2 })
  for (let i = 0; i < 8; i++) {
    const a = 22.5 + i * 45
    const rune = z.group('Rune', { parent: mid, pos: polar(180, a, 54), rot: [0, a, 0] })
    z.part('Rune frame', { parent: rune, size: [62, 2, 26], bevel: 1, pos: [0, 1, 0], material: 'Metal', color: BRONZE })
    z.part('Rune glow', { parent: rune, size: [52, 2.6, 16], bevel: 1, pos: [0, 1.4, 0], material: 'Neon', color: i % 2 ? C.clover : BEAM })
    for (const e of [-1, 1]) z.part('Rune stud', { parent: rune, size: [7, 3, 7], pos: [e * 36, 1.5, 0], rot: [0, 45, 0], material: 'Foil', color: GOLD2 })
    z.part('Joint line', { parent: mid, size: [3, 1.2, 72], pos: polar(168, i * 45, 54.4), rot: [0, i * 45, 0], material: 'Metal', color: shade(BRONZE, -8) })
  }

  s.stage('Spawn pad')
  const pad = z.group('Spawn pad', { parent: hero })
  z.part('Pad', { parent: pad, size: [285, 15, 285], bevel: 6, pos: [0, 61.5, 0], material: 'SmoothPlastic', color: shade(C.spawn, -4) })
  // 6 x 6 tiles of 44 units on a 47.5 pitch; the middle 4 x 4 stays clear for the emblem.
  for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 6; iz++) {
    if (ix >= 1 && ix <= 4 && iz >= 1 && iz <= 4) continue
    z.part('Pad tile', { parent: pad, size: [44, 2, 44], bevel: 2, pos: [(ix - 2.5) * 47.5, 70, (iz - 2.5) * 47.5], material: 'SmoothPlastic', color: (ix + iz) % 2 ? '#e8eef2' : '#d3dbe2' })
  }
  for (const a of AXES) {
    z.part('Edge trim', { parent: pad, size: [258, 3.6, 8], pos: polar(138, a, 70.5), rot: [0, a, 0], material: 'Neon', color: BEAM })
    z.part('Border trim', { parent: pad, size: [285, 4, 6], pos: polar(145, a, 67), rot: [0, a, 0], material: 'Foil', color: GOLD2 })
  }
  for (const a of DIAG) {
    const c = z.group('Corner ornament', { parent: pad, pos: polar(190, a, 69), rot: [0, a, 0] })
    z.part('Ornament base', { parent: c, size: [27, 9, 27], bevel: 3, pos: [0, 4.5, 0], material: 'Metal', color: shade(C.gold, 6) })
    z.part('Ornament glow', { parent: c, size: [20, 2, 20], pos: [0, 10, 0], material: 'Neon', color: BEAM })
    z.part('Ornament spire', { parent: c, shape: 'cone', size: [18, 14, 18], pos: [0, 18, 0], material: 'Foil', color: GOLD2 })
  }

  s.stage('Clover emblem')
  // Original four-leaf clover on a raised slate plinth: deep green disc, dial ring, leaves with neon rims, veins and highlights.
  z.part('Emblem plinth', { parent: hero, shape: 'cylinder', size: [198, 4.5, 198], pos: [0, 71.25, 0], material: 'Slate', color: '#4b515b' })
  const emb = z.group('Clover emblem', { parent: hero, pos: [0, 73.5, 0] })
  z.part('Emblem disc', { parent: emb, shape: 'cylinder', size: [180, 2, 180], pos: [0, 1, 0], material: 'SmoothPlastic', color: DEEP })
  z.part('Emblem ring', { parent: emb, shape: 'torus', size: [192, 7, 192], pos: [0, 2.5, 0], material: 'Foil', color: C.gold })
  z.part('Emblem inner ring', { parent: emb, shape: 'torus', size: [150, 2.5, 150], pos: [0, 2.2, 0], material: 'Neon', color: MINT })
  for (let i = 0; i < 24; i++)
    z.part('Dial spoke', { parent: emb, size: [4.5, 3, i % 3 ? 14 : 24], pos: polar(i % 3 ? 82 : 78, i * 15, 2.5), rot: [0, i * 15, 0], material: 'Foil', color: GOLD2 })
  for (const a of DIAG) {
    const leaf = z.group('Leaf', { parent: emb, rot: [0, a, 0] })
    for (const side of [-1, 1]) {
      z.part('Leaf rim', { parent: leaf, shape: 'cylinder', size: [43.5, 2.4, 43.5], pos: [side * 15, 2.4, 46.5], material: 'Neon', color: MINT })
      z.part('Leaf lobe', { parent: leaf, shape: 'cylinder', size: [37.5, 3.6, 37.5], pos: [side * 15, 3.6, 46.5], material: 'SmoothPlastic', color: shade(LEAF, side * 6) })
      z.part('Leaf highlight', { parent: leaf, shape: 'cylinder', size: [15, 1, 15], pos: [side * 19, 5.6, 52], material: 'SmoothPlastic', color: shade(LEAF, 28) })
    }
    z.part('Leaf tip', { parent: leaf, shape: 'wedge', size: [30, 3.6, 22], pos: [0, 3.6, 26], rot: [0, 180, 0], material: 'SmoothPlastic', color: LEAF })
    z.part('Leaf vein', { parent: leaf, size: [2.4, 4.4, 52], pos: [0, 4.2, 44], material: 'SmoothPlastic', color: DEEP })
  }
  for (const [k, a] of [200, 214, 228].entries())
    z.part('Stem', { parent: emb, size: [10, 4.2, 26], pos: polar(30 + k * 22, a + k * 4, 3), rot: [0, a + k * 7, 0], material: 'Neon', color: MINT })
  const boss = z.group('Centre boss', { parent: emb })
  z.part('Boss drum', { parent: boss, shape: 'cylinder', size: [27, 6, 27], pos: [0, 5, 0], material: 'Metal', color: C.gold })
  z.part('Boss ring', { parent: boss, shape: 'torus', size: [31, 3, 31], pos: [0, 5, 0], material: 'Foil', color: GOLD2 })
  z.part('Boss tip', { parent: boss, shape: 'cone', size: [13, 9, 13], pos: [0, 12.5, 0], material: 'Neon', color: MINT })
  for (const a of DIAG) z.part('Boss stud', { parent: boss, size: [4, 3, 4], pos: polar(11, a, 9), rot: [0, a, 0], material: 'Foil', color: GOLD2 })

  s.stage('Pillars')
  // 4 fluted pillars on the base diagonals at r 232 (clear of the pad corners at r 201), each with an arm to the halo frame
  // and a hanging lantern.
  for (const [i, a] of DIAG.entries()) {
    const p = z.group('Halo pillar', { parent: hero, tag: 'prop', pos: polar(232, a, 37), rot: [0, a, 0] })
    z.part('Pillar base', { parent: p, size: [44, 18, 44], bevel: 4, pos: [0, 9, 0], material: 'Slate', color: SLATE[i % 3] })
    z.part('Base moulding', { parent: p, shape: 'torus', size: [36, 6, 36], pos: [0, 20, 0], material: 'Marble', color: shade(C.marble, -5) })
    z.part('Shaft', { parent: p, shape: 'cylinder', size: [26, 160, 26], pos: [0, 100, 0], material: 'Marble', color: shade(C.marble, -2 - i) })
    for (let f = 0; f < 8; f++)
      z.part('Flute', { parent: p, size: [3, 150, 3], pos: polar(13, f * 45, 100), rot: [0, f * 45, 0], material: 'Marble', color: shade(C.marble, -12) })
    z.part('Lower collar', { parent: p, shape: 'torus', size: [32, 5, 32], pos: [0, 26, 0], material: 'Foil', color: GOLD2 })
    z.part('Upper collar', { parent: p, shape: 'torus', size: [32, 5, 32], pos: [0, 176, 0], material: 'Metal', color: shade(C.gold, i % 2 ? -8 : 7) })
    z.part('Capital', { parent: p, size: [36, 12, 36], bevel: 3, pos: [0, 186, 0], material: 'Marble', color: C.marble })
    z.part('Abacus', { parent: p, size: [42, 5, 42], bevel: 2, pos: [0, 194.5, 0], material: 'Foil', color: GOLD2 })
    gem(z, p, [0, 214, 0], i % 2 ? C.clover : ICE)
    // Arm runs inward (local -Z) from the capital to the halo frame at r 88, with two bracket wedges under it.
    z.part('Halo arm', { parent: p, size: [9, 9, 146], bevel: 3, pos: [0, HALO_Y - 37, -73], material: 'Metal', color: BRONZE })
    z.part('Arm bracket', { parent: p, shape: 'wedge', size: [7, 18, 26], pos: [0, HALO_Y - 50, -13], rot: [0, 180, 0], material: 'Metal', color: shade(BRONZE, -10) })
    z.part('Arm bracket', { parent: p, shape: 'wedge', size: [7, 14, 20], pos: [0, HALO_Y - 48, -136], material: 'Metal', color: shade(BRONZE, -10) })
    // Hanging lantern on the outer face: chain, cap, 4 frame posts, glass, nested-cone flame, base plate.
    const lan = z.group('Lantern', { parent: p, pos: [0, 120, 26] })
    z.part('Lantern hook', { parent: lan, size: [3, 3, 14], pos: [0, 30, -8], material: 'Metal', color: '#3b3330' })
    z.part('Lantern chain', { parent: lan, shape: 'cylinder', size: [2, 10, 2], pos: [0, 25, 0], material: 'Metal', color: '#3b3330' })
    z.part('Lantern cap', { parent: lan, shape: 'cone', size: [22, 10, 22], pos: [0, 16, 0], material: 'Metal', color: shade(C.woodDark, -20) })
    for (const c of DIAG) z.part('Frame post', { parent: lan, size: [2, 20, 2], pos: polar(8.5, c, 1), material: 'Metal', color: shade(C.gold, -14) })
    z.part('Lantern glass', { parent: lan, size: [14, 18, 14], pos: [0, 1, 0], material: 'Glass', color: C.glass })
    flame(z, lan, [0, -2, 0])
    z.part('Lantern plate', { parent: lan, size: [18, 3, 18], bevel: 1, pos: [0, -10, 0], material: 'Metal', color: shade(C.woodDark, -20) })
    z.light('Pillar lantern', { parent: lan, pos: [0, 1, 0], color: C.lantern, intensity: 1.3, range: 300 })
  }

  s.stage('Halo and crystal')
  const frame = z.group('Halo frame', { parent: hero, pos: [0, HALO_Y, 0] })
  z.part('Frame ring', { parent: frame, shape: 'torus', size: [177, 8, 177], material: 'Metal', color: C.gold })
  for (let i = 0; i < 8; i++) z.part('Frame clip', { parent: frame, size: [6, 16, 10], bevel: 1, pos: polar(88.5, i * 45 + 22.5), rot: [0, i * 45 + 22.5, 0], material: 'Foil', color: GOLD2 })
  const halo = z.group('Crystal halo', { parent: hero, pos: [0, HALO_Y, 0] })
  z.part('Halo ring', { parent: halo, shape: 'torus', size: [150, 5.4, 150], material: 'Neon', color: BEAM })
  for (let i = 0; i < 8; i++) gem(z, halo, polar(75, i * 45), i % 2 ? C.clover : ICE)
  const inner = z.group('Inner halo', { parent: hero, pos: [0, HALO_Y - 18, 0] })
  z.part('Inner ring', { parent: inner, shape: 'torus', size: [102, 4.2, 102], material: 'Neon', color: C.clover })
  for (let i = 0; i < 4; i++) star(z, inner, polar(51, i * 90, 0), MINT)
  const crystal = z.group('Crystal', { parent: hero, pos: [0, HALO_Y, 0] })
  z.part('Crystal crown', { parent: crystal, shape: 'cone', size: [60, 72, 60], pos: [0, 36, 0], material: 'Glass', color: ICE, transparency: 0.15 })
  z.part('Crystal pavilion', { parent: crystal, shape: 'cone', size: [60, 48, 60], pos: [0, -24, 0], rot: [180, 0, 0], material: 'Glass', color: ICE, transparency: 0.15 })
  z.part('Crystal belt', { parent: crystal, shape: 'torus', size: [62, 4, 62], material: 'Foil', color: GOLD2 })
  z.part('Inner crown', { parent: crystal, shape: 'cone', size: [24, 40, 24], pos: [0, 20, 0], material: 'Neon', color: C.glass })
  z.part('Inner pavilion', { parent: crystal, shape: 'cone', size: [24, 28, 24], pos: [0, -14, 0], rot: [180, 0, 0], material: 'Neon', color: C.glass })
  const beam = z.part('Spawn beam', { parent: hero, shape: 'cylinder', size: [36, 138, 36], pos: [0, 145, 0], material: 'Neon', color: BEAM, transparency: 0.6, castShadow: false })
  const rings = [100, 140, 180].map((y, k) => z.part('Beam ring', { parent: hero, shape: 'torus', size: [48 - k * 6, 2.5, 48 - k * 6], pos: [0, y, 0], material: 'Neon', color: MINT }))
  z.light('Spawn glow', { parent: hero, pos: [0, 120, 0], color: BEAM, intensity: 1.8, range: 600 })

  s.clip(IDLE_CLIP, 'Lobby idle', 8)
  // Quarter-turn keys: rotation blends as quaternions, so 0 → 360 in one step would not move.
  const turns = dir => [0, 2, 4, 6, 8].map((t, i) => [t, [0, dir * i * 90, 0], 'linear'])
  const pulse = (a, b) => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((t, i) => [t, i % 2 ? b : a, 'smooth'])
  z.track(IDLE_CLIP, halo, 'rot', turns(1))
  z.track(IDLE_CLIP, inner, 'rot', turns(-1))
  z.track(IDLE_CLIP, crystal, 'rot', turns(-1))
  z.track(IDLE_CLIP, crystal, 'pos', [0, 2, 4, 6, 8].map((t, i) => [t, [0, HALO_Y + (i % 2) * 18, 0], 'smooth']))
  z.track(IDLE_CLIP, beam, 'scale', pulse([1, 1, 1], [1.3, 1, 1.3]))
  z.track(IDLE_CLIP, beam, 'color', pulse(BEAM, '#d6fbff'))
  rings.forEach((r, k) => z.track(IDLE_CLIP, r, 'pos', [0, 4, 8].map((t, i) => [t, [0, [100, 140, 180][k] + (i % 2) * 30, 0], 'smooth'])))
  return root
}
