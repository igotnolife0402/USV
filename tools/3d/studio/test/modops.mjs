// Modify ops (plugins/modops.js): every op on node meshes (pure, no browser), exact counts where Blender's are known,
// then one browser pass running each mesh.<op> command through the app (undo, selection, store).
import { MODOPS, params } from '../plugins/modlist.js'
import { RUN, hull } from '../plugins/modops.js'
import { PRIM, signedVolume } from '../plugins/meshops.js'

const copy = m => ({ v: m.v.slice(), f: m.f.map(f => f.slice()), uv: m.uv ? m.uv.slice() : null })
const OP = Object.fromEntries(MODOPS.map(o => [o.id, o]))
const run = (id, m, sel = {}, a = {}) => RUN[id](m, { verts: null, faces: null, edges: null, target: null, ...sel }, params(OP[id], a))
function valid(m) {
  const n = m.v.length / 3
  if (!m.v.every(Number.isFinite)) return 'non-finite vertex'
  for (const f of m.f) { if (f.length < 3) return 'face under 3 corners'; if (new Set(f).size !== f.length) return 'repeated corner'; if (f.some(i => !(i >= 0 && i < n))) return 'index out of range' }
  if (m.uv && m.uv.length !== n * 2) return 'uv length'
  return ''
}
// Plane stood up in XY at x = 2: a lathe profile.
const upright = () => { const m = PRIM.plane(); for (let i = 0; i < m.v.length / 3; i++) { const z = m.v[3 * i + 2]; m.v[3 * i] += 2; m.v[3 * i + 1] = z; m.v[3 * i + 2] = 0 } return m }
// triangle count (decimate ratios count triangles, as in Blender)
const tris = m => m.f.reduce((s, f) => s + f.length - 2, 0)
const openEdges = m => { const he = new Set(); for (const f of m.f) f.forEach((a, k) => he.add(a + ',' + f[(k + 1) % f.length])); return [...he].filter(k => !he.has(k.split(',').reverse().join(','))).length }
// Selection args for ops that need one.
const SEL = { extrudeRepeat: () => ({ faces: [0] }), connect: m => ({ verts: new Set([m.f[0][0], m.f[0][2]]) }), makeCircle: m => ({ verts: new Set(m.f[0]) }), spin: () => ({ faces: [0] }), screw: () => ({ faces: [0] }), bridge: m => ({ faces: [0, 1] }), dissolveFaces: m => ({ faces: [0, 1] }), splitFaces: () => ({ faces: [0] }), dissolveEdges: m => ({ edges: [Math.min(m.f[0][0], m.f[0][1]) + '_' + Math.max(m.f[0][0], m.f[0][1])] }), selectLinkedFlat: () => ({ faces: [0] }), selectSimilarNormal: () => ({ faces: [0] }), selectLoop: () => ({ edges: [] }), shrinkwrap: () => ({ target: PRIM.icosphere({ radius: 2, sub: 2 }) }) }

export default async function (t) {
  await t.test('modops: count and every op yields a valid mesh', async () => {
    t.ok(MODOPS.length >= 78, MODOPS.length + ' ops (>= 78)')
    const bad = []
    for (const o of MODOPS) {
      if (o.id === 'bridge' || o.id === 'selectLoop') continue
      const m = PRIM.cube({ seg: 2 }); m.uv = new Array(m.v.length / 3 * 2).fill(0)
      try { const r = run(o.id, m, (SEL[o.id] || (() => ({})))(m)), out = o.group === 'add' ? r : m; const e = valid(out) || (o.group === 'add' && (openEdges(out) || signedVolume(out) <= 0) ? 'not a closed outward solid' : ''); if (e) bad.push(o.id + ': ' + e) } catch (e) { bad.push(o.id + ' threw ' + e.message) }
    }
    t.eq(bad.join(' | '), '', 'all ops valid')
  })
  await t.test('modops: Blender reference counts', async () => {
    let m = PRIM.cube(); run('solidify', m, {}, { thickness: 0.1 }); t.eq([m.v.length / 3, m.f.length, openEdges(m)].join(), '16,12,0', 'solidify closed cube 8v→16v, 12f')
    m = PRIM.plane(); run('solidify', m, {}, { thickness: 0.1 }); t.eq([m.v.length / 3, m.f.length, openEdges(m)].join(), '8,6,0', 'solidify plane = closed slab')
    m = PRIM.cube(); run('triangulate', m); t.eq(m.f.length, 12, 'triangulate cube 6→12')
    run('trisToQuads', m); t.eq(m.f.length, 6, 'tris→quads back to 6')
    m = PRIM.cube(); run('poke', m); t.eq([m.v.length / 3, m.f.length].join(), '14,24', 'poke cube')
    m = PRIM.cube({ seg: 2 }); run('limitedDissolve', m); t.eq([m.f.length, openEdges(m)].join(), '6,0', 'limited dissolve 24→6 faces')
    m = PRIM.cube(); run('mirror', m, {}, { axis: 'x' }); t.eq(m.f.length, 12, 'mirror doubles')
    m = PRIM.cube(); run('symmetrize', m, {}, { axis: 'x' }); t.eq([openEdges(m), Math.abs(signedVolume(m) - 8) < 1e-6].join(), '0,true', 'symmetrize cube stays closed, volume 8')
    m = PRIM.cube(); run('bisect', m, {}, { axis: 'y', offset: 0 }); t.eq([m.f.length, openEdges(m)].join(), '10,0', 'bisect cube: 4 sides split')
    m = PRIM.cube(); run('array', m, {}, { count: 3 }); t.eq([m.f.length, m.v.length / 3].join(), '18,16', 'array x3 merged')
    m = PRIM.cube(); run('extrudeEach', m, { faces: [0] }); t.eq([m.f.length, openEdges(m)].join(), '10,0', 'extrude one face')
    m = PRIM.cube(); run('insetEach', m, { faces: [0] }); t.eq(m.f.length, 10, 'inset one face')
    m = PRIM.cube(); run('wireframe', m, {}, { thickness: 0.1 }); t.eq([m.f.length, openEdges(m)].join(), '72,0', 'wireframe cube: 24 frame quads x2 + 24 hole rims, closed')
    m = PRIM.cube(); run('edgeSplit', m, {}, { angle: 30 }); t.eq(m.v.length / 3, 24, 'edge split cube: 24 verts')
    m = PRIM.cube(); run('cleanUp', m); t.eq(m.v.length / 3, 8, 'clean up keeps a clean cube')
    m = PRIM.uvsphere({ seg: 32, rings: 16 }); const f0 = tris(m); run('decimate', m, {}, { ratio: 0.25, method: 'fast' }); t.ok(m.f.length <= f0 * 0.25 && m.f.length > f0 * 0.05, 'fast decimate ' + f0 + ' tris →' + m.f.length)
    m = PRIM.cube(); m.f.splice(0, 1); run('fillHoles', m); t.eq([m.f.length, openEdges(m)].join(), '6,0', 'fill hole')
    m = PRIM.cube(); m.f = [m.f[0], m.f[1]]; run('bridge', m, { faces: [0, 1] }); t.eq([m.f.length, openEdges(m)].join(), '4,8', 'bridge 2 opposite faces = open tube')
    m = upright(); run('spin', m, {}, { steps: 12, axis: 'y' }); t.eq([m.f.length, openEdges(m), signedVolume(m) > 0].join(), '48,0,true', 'spin plane 360 = closed torus')
    m = upright(); run('screw', m, {}, { steps: 16 }); t.eq([m.f.length, openEdges(m)].join(), '66,0', 'screw = capped coil')
    const r = Math.random; let s = 7; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647
    const pts = Array.from({ length: 300 }, () => [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1]); Math.random = r
    const H = hull(pts), hm = { v: pts.flat(), f: H }; t.ok(openEdges(hm) === 0 && signedVolume(hm) > 6 && signedVolume(hm) <= 8, 'hull closed, volume ' + signedVolume(hm).toFixed(2))
    m = PRIM.icosphere({ sub: 2 }); run('shrinkwrap', m, { target: PRIM.cube({ size: 4, seg: 4 }) }); t.ok([...Array(m.v.length / 3).keys()].every(i => Math.abs(Math.max(...[0, 1, 2].map(k => Math.abs(m.v[3 * i + k]))) - 2) < 1e-6), 'shrinkwrap sphere onto cube surface')
    m = PRIM.cube({ seg: 4 }); const v0 = m.v.slice(); run('displace', m, {}, { seed: 3 }); const d1 = m.v.slice(); m.v = v0.slice(); run('displace', m, {}, { seed: 3 }); t.eq(m.v.join(), d1.join(), 'displace is seeded')
    m = PRIM.uvsphere({ seg: 48, rings: 24 }); const fq = tris(m); run('decimate', m, {}, { ratio: 0.2 }); t.ok(openEdges(m) === 0 && m.f.length <= fq * 0.2 * 1.3 + 4 && signedVolume(m) > 3.6, 'quality decimate stays closed, keeps volume: ' + fq + '→' + m.f.length + ' faces, vol ' + signedVolume(m).toFixed(2))
    t.eq(run('quadSphere', null, {}, { seg: 4 }).f.length, 96, 'quad sphere 6x4x4 faces')
    const rc = run('roundedCube', null, {}, { radius: 0.3 }); t.ok(openEdges(rc) === 0 && Math.abs(signedVolume(rc) - (8 - (12 - 3 * Math.PI) * 0.09 * 2 + (8 - 4 / 3 * Math.PI) * 0.027 * 0)) < 0.2, 'rounded cube closed, volume ' + signedVolume(rc).toFixed(3))
    const cap = run('capsule', null, {}, { seg: 32, rings: 8 }); t.ok(Math.abs(signedVolume(cap) - (Math.PI * 0.25 * 1 + 4 / 3 * Math.PI * 0.125)) < 0.05, 'capsule volume ' + signedVolume(cap).toFixed(3))
    const tb = run('tube', null, {}, { seg: 64 }); t.ok(Math.abs(signedVolume(tb) - Math.PI * (1 - 0.64) * 2) < 0.05, 'tube volume ' + signedVolume(tb).toFixed(3))
    m = PRIM.cube(); run('extrudeRepeat', m, { faces: [0] }, { count: 4 }); t.eq([m.f.length, openEdges(m)].join(), '22,0', 'extrude repeat x4 closed')
    m = PRIM.cube(); run('greeble', m, {}, { amount: 1 }); t.eq([m.f.length, openEdges(m)].join(), '54,0', 'greeble every face, closed')
    m = PRIM.cube(); const f0q = m.f[0]; run('connect', m, { verts: new Set([f0q[0], f0q[2]]) }); t.eq(m.f.length, 7, 'connect splits one quad')
    m = PRIM.uvsphere({ seg: 16, rings: 8 }); for (let i = 0; i < m.v.length / 3; i++) if (m.v[3 * i] > 0.01) m.v[3 * i] *= 1.1; run('snapSymmetry', m, {}, { axis: 'x', tol: 0.08 }); const xs = []; for (let i = 0; i < m.v.length / 3; i++) xs.push(Math.abs(m.v[3 * i]).toFixed(4) + ',' + m.v[3 * i + 1].toFixed(4) + ',' + m.v[3 * i + 2].toFixed(4)); const cnt = {}; xs.forEach(k => cnt[k] = (cnt[k] || 0) + 1); t.ok(Object.entries(cnt).every(([k, n]) => n === 2 || +k.split(',')[0] === 0), 'snap to symmetry pairs every vertex')
    m = PRIM.grid({ seg: 6 }); t.eq(run('selectLoop', m, { edges: ['8_9'] }).ids.length, 7, 'edge loop across a 6x6 grid')
  })
  await t.test('modops: commands run in the app with undo', async () => {
    const s = await t.open()
    await s.project('Modops', { empty: true })
    const id = await s.run('mesh.cube', { seg: 2 })
    const out = await s.eval(async id => {
      const A = window.studio.app, bad = [], faces = id => A.geo.peek(A.obj(id).geo).faces.length
      for (const c of [...A.commands.keys()].filter(k => /^mesh\.(solidify|bend|twist|wave|displace|decimate|uvBox|selectMore|spin|symmetrize)$/.test(k))) {
        const before = faces(id)
        try { await A.run(c, c === 'mesh.spin' ? { id, faces: [0] } : { id }) } catch (e) { bad.push(c + ': ' + e.message) }
        if (!faces(id)) bad.push(c + ' emptied the mesh (' + before + ' faces before)')
      }
      const n = faces(id); await A.run('mesh.solidify', { id, thickness: 0.05 }); const n2 = faces(id); A.history?.undo?.() ?? A.exec('edit.undo')
      return { bad, n, n2, back: faces(id), count: [...A.commands.keys()].filter(k => A.commands.get(k).modop).length }
    }, id)
    t.eq(out.bad.join(' | '), '', 'commands run')
    t.ok(out.n2 > out.n && out.back === out.n, `solidify ${out.n}→${out.n2}, undo → ${out.back}`)
    t.ok(out.count >= 78, out.count + ' modify commands registered')
    const j = await s.eval(async () => {
      const A = window.studio.app, a = await A.run('mesh.gear', { pos: [3, 0, 0] }), b = await A.run('mesh.rock', { pos: [6, 0, 0] }), n = id => A.geo.peek(A.obj(id).geo).faces.length, na = n(a), nb = n(b)
      A.run('mesh.join', { ids: [a, b] }); const joined = n(a), bGone = !A.obj(b)
      A.run('mesh.edit', { id: a }); const p = A.run('mesh.separate', { id: a, faces: [...Array(na).keys()] })
      return { na, nb, joined, bGone, left: n(a), part: n(p) }
    })
    t.ok(j.joined === j.na + j.nb && j.bGone && j.left === j.nb && j.part === j.na, 'join then separate: ' + JSON.stringify(j))
    await s.noErrors()
  })
}
