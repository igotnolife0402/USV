import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cylinder, cone, box, sphere, place, createGeo } from '../lib/mesh.mjs'

// Newell normal per face must point away from the shape's centre (outward winding).
function outward(piece, c) {
  for (const f of piece.faces) {
    let nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0
    f.forEach((a, i) => {
      const p = piece.pts[a], q = piece.pts[f[(i + 1) % f.length]]
      nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1])
      cx += p[0] / f.length; cy += p[1] / f.length; cz += p[2] / f.length
    })
    if (nx * (cx - c[0]) + ny * (cy - c[1]) + nz * (cz - c[2]) <= 0) return false
  }
  return true
}

test('mesh: every primitive winds outward, also after placement', () => {
  for (const [name, prim] of Object.entries({ cylinder: cylinder([2, 3, 1.5]), cone: cone([2, 3, 2]), box: box([1, 2, 3]), sphere: sphere([2, 1, 3]) })) {
    assert.ok(outward(prim, [0, 0, 0]), name)
    assert.ok(outward(place(prim, { pos: [5, 1, -2], rot: [30, 70, -15] }), [5, 1, -2]), name + ' placed')
  }
})

test('mesh: geo merges pieces with offset faces and per-vertex uvs', () => {
  const g = createGeo(); g.add(box([1, 1, 1])); g.add(place(cone([1, 1, 1], 4), { pos: [3, 0, 0] }))
  const d = g.data()
  assert.equal(g.pieces, 2); assert.equal(d.verts.length / 3, 8 + 5); assert.equal(d.uvs.length / 2, 13)
  assert.ok(d.faces.flat().every(i => i >= 0 && i < 13)); assert.ok(d.faces.slice(6).flat().every(i => i >= 8))
})
