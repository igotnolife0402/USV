// Polygon meshes for Studio's geo store: {verts: [x,y,z...], faces: [[a,b,c(,d)]...], uvs: [u,v...]}.
// Used for anything mass-repeated (grass, flowers, rocks, trees, hills): thousands of small pieces merged into a few
// mesh objects per colour, because Studio's project document must stay under its 256 KB save limit.
// Faces wind counter-clockwise seen from outside (Studio computes Newell normals from the winding).
import { rotMat } from './world.mjs'

const TAU = Math.PI * 2
const ring = (n, r, y, k = 1) => Array.from({ length: n }, (_, i) => [r * Math.cos(i / n * TAU), y, r * k * Math.sin(i / n * TAU)])

// Unit-ish primitives centred on the origin; `size` = full extents like Studio parts (x, y, z).
export function cylinder([sx, sy, sz], n = 8) {
  const b = ring(n, sx / 2, -sy / 2, sz / sx), t = ring(n, sx / 2, sy / 2, sz / sx), pts = [...b, ...t], faces = []
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([i, n + i, n + j, j]) }
  faces.push([...Array(n).keys()].map(i => n + (n - 1 - i)))      // top: reverse order faces up
  faces.push([...Array(n).keys()])                                 // bottom faces down
  return { pts, faces }
}
export function cone([sx, sy, sz], n = 6) {
  const b = ring(n, sx / 2, -sy / 2, sz / sx), pts = [...b, [0, sy / 2, 0]], faces = []
  for (let i = 0; i < n; i++) faces.push([i, n, (i + 1) % n])
  faces.push([...Array(n).keys()])
  return { pts, faces }
}
export function box([sx, sy, sz]) {
  const x = sx / 2, y = sy / 2, z = sz / 2
  const pts = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]
  return { pts, faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [0, 1, 5, 4], [3, 7, 6, 2]] }
}
export function sphere([sx, sy, sz], lon = 8, lat = 5) {
  const pts = [[0, -sy / 2, 0]], faces = []
  for (let j = 1; j < lat; j++) {
    const phi = Math.PI * j / lat, y = -Math.cos(phi) * sy / 2, r = Math.sin(phi)
    for (let i = 0; i < lon; i++) pts.push([r * sx / 2 * Math.cos(i / lon * TAU), y, r * sz / 2 * Math.sin(i / lon * TAU)])
  }
  const top = pts.push([0, sy / 2, 0]) - 1, at = (j, i) => 1 + (j - 1) * lon + (i % lon)
  for (let i = 0; i < lon; i++) faces.push([0, at(1, i), at(1, i + 1)])
  for (let j = 1; j < lat - 1; j++) for (let i = 0; i < lon; i++) faces.push([at(j, i), at(j + 1, i), at(j + 1, i + 1), at(j, i + 1)])
  for (let i = 0; i < lon; i++) faces.push([at(lat - 1, i), top, at(lat - 1, i + 1)])
  return { pts, faces }
}

// Places a primitive (rot in degrees, XYZ like Studio) and returns world points.
export function place(prim, { pos = [0, 0, 0], rot = [0, 0, 0] } = {}) {
  const m = rotMat(rot)
  return { faces: prim.faces, pts: prim.pts.map(p => [0, 1, 2].map(r => m[r][0] * p[0] + m[r][1] * p[1] + m[r][2] * p[2] + pos[r])) }
}

// Collects placed pieces into one geo; uvs are in studs (x + z across, y up) so Studio's material patterns tile.
export function createGeo() {
  const verts = [], faces = [], uvs = []
  let pieces = 0
  const r3 = v => Math.round(v * 1000) / 1000 || 0
  return {
    add(piece) {
      const base = verts.length / 3
      for (const [x, y, z] of piece.pts) { verts.push(r3(x), r3(y), r3(z)); uvs.push(r3(x + z), r3(y + (x - z) * 0.5)) }
      for (const f of piece.faces) faces.push(f.map(i => i + base))
      pieces++
    },
    get pieces() { return pieces },
    data: () => ({ verts, faces, uvs })
  }
}
