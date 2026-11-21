import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkHeroes, checkScene, FLOORS } from '../validate.mjs'
import { toWorld } from '../lib/world.mjs'

const proj = (objects, anims = {}) => ({ name: 'T', v: 1, objects, anims })
// A hero that meets every floor: 60 parts over 4 materials, 3 shapes, 3 levels, 8-part emblem, neon + light.
const N = FLOORS.hero.parts, SPAN = FLOORS.hero.minSpan
function goodHero() {
  const o = { h: { type: 'group', tag: 'hero', name: 'Hero' }, e: { type: 'group', name: 'Emblem', parent: 'h' } }
  const mats = ['Marble', 'Slate', 'Neon', 'Wood'], shapes = ['box', 'cylinder', 'torus']
  for (let i = 0; i < N; i++) o['p' + i] = { type: 'part', parent: i < 8 ? 'e' : 'h', material: mats[i % 4], shape: shapes[i % 3], size: [1, 1, 1], pos: [(i / (N - 1) - 0.5) * SPAN, i % 3 * 2, 0] }
  o.l = { type: 'light', parent: 'h' }
  return o
}

test('world: parent rotation and offset compose', () => {
  const objs = { g: { type: 'group', pos: [10, 0, 0], rot: [0, 90, 0] }, p: { type: 'part', parent: 'g', pos: [1, 0, 0] } }
  const [x, y, z] = toWorld(objs, 'p')
  assert.ok(Math.abs(x - 10) < 1e-9 && Math.abs(y) < 1e-9 && Math.abs(z + 1) < 1e-9)
})

test('heroes: a complete hero passes', () => assert.deepEqual(checkHeroes(proj(goodHero())), []))

test('heroes: each floor fails on its fixture', () => {
  const f = FLOORS.hero
  const cases = {
    'parts <': o => { for (let i = N / 2; i < N; i++) delete o['p' + i] },
    'studs wide': o => { for (const k in o) if (o[k].type === 'part') o[k].pos = [0, o[k].pos[1], 0] },
    'plain sphere': o => { o.p2.shape = 'sphere'; o.p2.name = 'Gem' },
    'materials <': o => { for (const k in o) if (o[k].type === 'part') o[k].material = 'Slate' },
    'shape types <': o => { for (const k in o) if (o[k].type === 'part') o[k].shape = 'box' },
    'height levels <': o => { for (const k in o) if (o[k].type === 'part') o[k].pos = [o[k].pos[0], 0, 0] },
    'no emblem': o => { o.e.name = 'Stuff' },
    'effect kinds': o => { delete o.l; for (const k in o) if (o[k].material === 'Neon') o[k].material = 'Glass' },
    'needs bevel': o => { o.p1.size = [f.bevelOver + 1, 1, 1]; o.p1.shape = 'box' }
  }
  for (const [msg, mut] of Object.entries(cases)) { const o = goodHero(); mut(o); assert.match(checkHeroes(proj(o)).join('\n'), new RegExp(msg), msg) }
  const o = goodHero(); o.p1.size = [6, 1, 1]; o.p1.shape = 'box'; o.p1.bevel = 0.2; o.p2.shape = 'sphere'; o.p2.name = 'Glass orb'
  assert.deepEqual(checkHeroes(proj(o)), [], 'bevelled long box and a named orb pass')
})

test('scene: effects, density, slabs, props, shades', () => {
  const F = { effects: 2, detailPerArea: 25, walkCell: 5, terrainCell: 10, propParts: 2, shades: 2, shadeMinUses: 3 }
  const slab = { s: { type: 'part', tag: 'walk', size: [10, 1, 10], pos: [0, -0.5, 0], material: 'Grass', color: '#00aa00' } }
  const errs = checkScene(proj({ ...slab, pr: { type: 'group', tag: 'prop', name: 'Bench' }, a: { type: 'part', parent: 'pr', color: '#111111' } }), F, 5).join('\n')
  for (const m of ['effect kinds', 'detail parts', 'plain slab', 'prop has 1', ]) assert.match(errs, new RegExp(m), m)
  const objs = { ...slab, l: { type: 'light', pos: [0, 3, 0] } }
  for (let i = 0; i < 4; i++) objs['t' + i] = { type: 'part', size: [1, 1, 1], pos: [i * 2 - 3, 0.5, 0], material: i ? 'Neon' : 'Wood', color: i % 2 ? '#ffee00' : '#ffcc00' }
  assert.deepEqual(checkScene(proj(objs), F, 5), [])
  objs.t1.color = objs.t2.color = objs.t3.color = '#ffcc00'
  assert.match(checkScene(proj(objs), F, 5).join('\n'), /Neon: 1 shades/)
})
