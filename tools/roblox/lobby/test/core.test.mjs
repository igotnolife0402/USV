import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createScene, compact } from '../lib/scene.mjs'
import { rng } from '../lib/rng.mjs'
import { checkSchema, checkBudget } from '../validate.mjs'

const project = objects => ({ name: 'T', v: 1, objects, anims: {}, textures: {}, env: {}, camera: {} })

test('scene: stable per-zone ids, parenting, defaults dropped', () => {
  const s = createScene(), a = s.zone('spawn'), b = s.zone('props')
  const g = a.group('Spawn')
  const p = a.part('Pad', { parent: g, size: [12, 1, 12], material: 'Plastic', color: '#a3a2a5' })
  const q = b.part('Bench', {})
  assert.deepEqual([g, p, q], ['spawn-1', 'spawn-2', 'props-1'])
  assert.deepEqual(s.get(p), { type: 'part', name: 'Pad', parent: 'spawn-1', size: [12, 1, 12] })
  assert.throws(() => a.part('X', { parent: 'nope' }), /unknown parent/)
})

test('compact rounds numbers to 1/1000 stud', () => {
  assert.deepEqual(compact({ type: 'part', pos: [1.23456, 0, -0.0000001] }).pos, [1.235, 0, 0])
})

test('rng is deterministic per seed', () => {
  const a = rng(7), b = rng(7), c = rng(8)
  const sa = [a.next(), a.next()], sb = [b.next(), b.next()]
  assert.deepEqual(sa, sb)
  assert.notEqual(sa[0], c.next())
  const r = rng(1); for (let i = 0; i < 200; i++) { const v = r.int(2, 4); assert.ok(v >= 2 && v <= 4) }
})

test('schema: valid project passes', () => {
  assert.deepEqual(checkSchema(project({ a: { type: 'group' }, b: { type: 'part', parent: 'a', shape: 'sphere', material: 'Grass', color: '#55aa33' } })), [])
})

test('schema: each rule fails on its fixture', () => {
  const cases = {
    'unknown type': { a: { type: 'mesh2' } },
    'unknown shape': { a: { type: 'part', shape: 'blob' } },
    'unknown material': { a: { type: 'part', material: 'Lava' } },
    'missing parent': { a: { type: 'part', parent: 'zz' } },
    'parent cycle': { a: { type: 'group', parent: 'b' }, b: { type: 'group', parent: 'a' } },
    'temp objects': { a: { type: 'part', temp: true } },
    'must be 3 numbers': { a: { type: 'part', pos: [0, 1] } },
    'size must be positive': { a: { type: 'part', size: [1, 0, 1] } },
    'bad color': { a: { type: 'part', color: 'green' } },
    'unknown light kind': { a: { type: 'light', kind: 'area' } }
  }
  for (const [msg, objs] of Object.entries(cases)) assert.match(checkSchema(project(objs)).join('\n'), new RegExp(msg), msg)
})

test('budget: caps on objects, lights, shadows, bytes', () => {
  const lim = { objects: 3, lights: 1, shadows: 0, bytes: 10_000 }
  assert.deepEqual(checkBudget(project({ a: { type: 'part' }, b: { type: 'light' } }), lim), [])
  const objs = { a: { type: 'part' }, b: { type: 'light', shadow: true }, c: { type: 'light' }, d: { type: 'part', name: 'x'.repeat(20000) } }
  const errs = checkBudget(project(objs), lim).join('\n')
  for (const m of ['objects 4', 'lights 2', 'shadow lights 1', 'document']) assert.match(errs, new RegExp(m))
})

test('scene: unit bakes working scale into pos, size, bevel, range and pos keys', () => {
  const s = createScene(), z = s.zone('h', { unit: 0.1 })
  const p = z.part('Tread', { size: [50, 4, 12], pos: [0, 2, 120], bevel: 3, rot: [0, 90, 0] })
  const l = z.light('Lamp', { pos: [0, 40, 0], range: 100 })
  s.clip('c', 'C', 2); z.track('c', p, 'pos', [[0, [0, 10, 0], 'smooth'], [2, [0, 20, 0]]])
  assert.deepEqual(s.get(p), { type: 'part', name: 'Tread', size: [5, 0.4, 1.2], pos: [0, 0.2, 12], bevel: 0.3, rot: [0, 90, 0] })
  assert.equal(s.get(l).range, 10)
  assert.deepEqual(s.anims.c.tracks[p].pos, [[0, [0, 1, 0], 'smooth'], [2, [0, 2, 0]]])
})
