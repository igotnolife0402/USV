// World-space positions for validator rules: composes pos/rot(deg, XYZ like three.js)/scale up the parent chain.
const D2R = Math.PI / 180

export function rotMat([x, y, z]) {
  const [a, b, c] = [x * D2R, y * D2R, z * D2R]
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c)
  // three.js Euler 'XYZ': R = Rx * Ry * Rz
  return [
    [cb * cc, -cb * sc, sb],
    [ca * sc + sa * sb * cc, ca * cc - sa * sb * sc, -sa * cb],
    [sa * sc - ca * sb * cc, sa * cc + ca * sb * sc, ca * cb]
  ]
}
const mulV = (m, v) => m.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2])

// Maps a point in object `id`'s local space to world space.
export function toWorld(objects, id, p = [0, 0, 0]) {
  let v = p, o = objects[id], guard = 0
  while (o && guard++ < 64) {
    const s = o.scale || [1, 1, 1]
    v = mulV(rotMat(o.rot || [0, 0, 0]), [v[0] * s[0], v[1] * s[1], v[2] * s[2]])
    const t = o.pos || [0, 0, 0]
    v = [v[0] + t[0], v[1] + t[1], v[2] + t[2]]
    o = o.parent != null ? objects[o.parent] : null
  }
  return v
}

export function descendants(objects, rootId) {
  const kids = new Map()
  for (const [id, o] of Object.entries(objects)) if (o.parent != null) (kids.get(o.parent) || kids.set(o.parent, []).get(o.parent)).push(id)
  const out = [], stack = [...(kids.get(rootId) || [])]
  while (stack.length) { const id = stack.pop(); out.push(id); stack.push(...(kids.get(id) || [])) }
  return out
}
