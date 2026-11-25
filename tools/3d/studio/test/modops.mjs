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
const openEdges = m => { const he = new Set(); for (const f of m.f) f.forEach((a, k) => he.add(a + ',' + f[(k + 1) % f.length])); return [...he].filter(k => !he.has(k.split(',').reverse().join(','))).length }
// Selection args for ops that need one.
const SEL = { spin: () => ({ faces: [0] }), screw: () => ({ faces: [0] }), bridge: m => ({ faces: [0, 1] }), dissolveFaces: m => ({ faces: [0, 1] }), splitFaces: () => ({ faces: [0] }), dissolveEdges: m => ({ edges: [Math.min(m.f[0][0], m.f[0][1]) + '_' + Math.max(m.f[0][0], m.f[0][1])] }), selectLinkedFlat: () => ({ faces: [0] }), selectSimilarNormal: () => ({ faces: [0] }), selectLoop: () => ({ edges: [] }), shrinkwrap: () => ({ target: PRIM.icosphere({ radius: 2, sub: 2 }) }) }

export default async function (t) {
  await t.test('modops: count and every op yields a valid mesh', async () => {
    t.ok(MODOPS.length >= 55, MODOPS.length + ' ops (>= 55)')
    const bad = []
    for (const o of MODOPS) {
      if (o.id === 'bridge' || o.id === 'selectLoop') continue
      const m = PRIM.cube({ seg: 2 }); m.uv = new Array(m.v.length / 3 * 2).fill(0)
      try { run(o.id, m, (SEL[o.id] || (() => ({})))(m)); const e = valid(m); if (e) bad.push(o.id + ': ' + e) } catch (e) { bad.push(o.id + ' threw ' + e.message) }
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
    m = PRIM.uvsphere({ seg: 32, rings: 16 }); const f0 = m.f.length; run('decimate', m, {}, { ratio: 0.25 }); t.ok(m.f.length <= f0 * 0.25 && m.f.length > f0 * 0.05, 'decimate ' + f0 + '→' + m.f.length)
    m = PRIM.cube(); m.f.splice(0, 1); run('fillHoles', m); t.eq([m.f.length, openEdges(m)].join(), '6,0', 'fill hole')
    m = PRIM.cube(); m.f = [m.f[0], m.f[1]]; run('bridge', m, { faces: [0, 1] }); t.eq([m.f.length, openEdges(m)].join(), '4,8', 'bridge 2 opposite faces = open tube')
    m = upright(); run('spin', m, {}, { steps: 12, axis: 'y' }); t.eq([m.f.length, openEdges(m), signedVolume(m) > 0].join(), '48,0,true', 'spin plane 360 = closed torus')
    m = upright(); run('screw', m, {}, { steps: 16 }); t.eq([m.f.length, openEdges(m)].join(), '66,0', 'screw = capped coil')
    const r = Math.random; let s = 7; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647
    const pts = Array.from({ length: 300 }, () => [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1]); Math.random = r
    const H = hull(pts), hm = { v: pts.flat(), f: H }; t.ok(openEdges(hm) === 0 && signedVolume(hm) > 6 && signedVolume(hm) <= 8, 'hull closed, volume ' + signedVolume(hm).toFixed(2))
    m = PRIM.icosphere({ sub: 2 }); run('shrinkwrap', m, { target: PRIM.cube({ size: 4, seg: 4 }) }); t.ok([...Array(m.v.length / 3).keys()].every(i => Math.abs(Math.max(...[0, 1, 2].map(k => Math.abs(m.v[3 * i + k]))) - 2) < 1e-6), 'shrinkwrap sphere onto cube surface')
    m = PRIM.cube({ seg: 4 }); const v0 = m.v.slice(); run('displace', m, {}, { seed: 3 }); const d1 = m.v.slice(); m.v = v0.slice(); run('displace', m, {}, { seed: 3 }); t.eq(m.v.join(), d1.join(), 'displace is seeded')
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
    t.ok(out.count >= 55, out.count + ' modify commands registered')
    await s.noErrors()
  })
}
