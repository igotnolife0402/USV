// The owner's request end to end on one scene: R6 dummy, coloured parts with materials,
// a sculpted mesh and a pen stroke, on desktop and phone; final screenshots of the build and the home grid.

async function build(s) {
  const ids = {}
  ids.rig = await s.run('parts.rig', { pos: [-6, 0, 0], select: false })
  const P = (shape, a) => s.run('parts.' + shape, { select: false, ...a })
  ids.wall = await P('box', { name: 'Wall', size: [6, 3, 1], pos: [0, 1.5, -4], color: '#b4553c', material: 'Brick' })
  ids.neon = await P('ball', { name: 'Neon', size: [1.6, 1.6, 1.6], pos: [-2, 0.8, 2.5], color: '#ff3d7f', material: 'Neon' })
  ids.metal = await P('cylinder', { name: 'Pipe', size: [1.4, 3, 1.4], pos: [3.2, 1.5, -1.5], color: '#8a9099', material: 'Metal' })
  ids.glass = await P('box', { name: 'Glass', size: [2, 2, 0.4], pos: [-2.5, 1, -2], color: '#9fd3ff', material: 'Glass', transparency: 0.35 })
  ids.wood = await P('wedge', { name: 'Ramp', size: [2, 1.5, 3], pos: [7, 0.75, -2], color: '#7a4e2d', material: 'WoodPlanks' })
  ids.grass = await P('cone', { name: 'Bush', size: [2, 2.6, 2], pos: [8, 1.3, 3], color: '#3f8d3a', material: 'Grass' })
  // sculpted mesh: a ball remeshed, then a ridge drawn in two passes and an inflate on the side facing the camera
  ids.blob = await P('ball', { name: 'Blob', size: [3, 3, 3], pos: [3, 1.5, 3] })
  await s.run('parts.color', { ids: [ids.blob], color: '#e0b25a' })
  await s.run('sculpt.remesh', { ids: [ids.blob], tris: 8000 })
  const before = await s.eval(id => { const A = window.studio.app; return [...A.geo.peek(A.obj(id).geo).verts] }, ids.blob)
  // a raised ridge: two draw passes along an arc on the sphere (y 2.3, radius 1.27 around the centre), facing the camera
  const arc = Array.from({ length: 14 }, (_, i) => { const a = (-20 + i * 10) * Math.PI / 180; return [3 + 1.27 * Math.cos(a), 2.3, 3 + 1.27 * Math.sin(a)] })
  for (let k = 0; k < 2; k++) await s.run('sculpt.stroke', { id: ids.blob, brush: 'draw', points: arc, radius: 0.45, strength: 1 })
  await s.run('sculpt.stroke', { id: ids.blob, brush: 'inflate', points: [[4.06, 1.5, 4.06], [4.06, 1.3, 4.06]], radius: 0.6, strength: 1 })
  const after = await s.eval(id => { const A = window.studio.app; return [...A.geo.peek(A.obj(id).geo).verts] }, ids.blob)
  let moved = 0; for (let i = 0; i < before.length; i += 3) moved = Math.max(moved, Math.hypot(after[i] - before[i], after[i + 1] - before[i + 1], after[i + 2] - before[i + 2]))
  // pen stroke: a yellow path across the floor in front of the build
  ids.stroke = await s.run('draw.stroke', { points: [[-9, 0.08, 5.5], [-5, 0.08, 6.5], [-1, 0.08, 5.6], [3, 0.08, 6.8], [7, 0.08, 5.8], [10, 0.08, 6.6]], width: 0.35, color: '#ffd400', smooth: true })
  return { ids, moved }
}

const checks = (s, ids) => s.eval(ids => {
  const A = window.studio.app, v = A.viewport, kids = Object.entries(A.scene.objects).filter(([, o]) => o.parent === ids.rig).map(([, o]) => [o.name, o.color, o.material])
  const neon = v.objects.get(ids.neon), m = neon.material || neon.children.find(c => c.isMesh)?.material
  return { kids, neon: m ? ['#' + m.color.getHexString(), '#' + m.emissive.getHexString(), m.toneMapped] : null, blob: A.obj(ids.blob).type, stroke: A.obj(ids.stroke)?.type, n: Object.keys(A.scene.objects).length }
}, ids)

export default async function (t) {
  for (const device of ['desktop', 'phone']) {
    await t.test(`${device}: R6 dummy, coloured parts with materials, a sculpted mesh and a pen stroke; build and home screenshots`, async () => {
      const s = await t.open({ device })
      await s.project('Build')
      const { ids, moved } = await build(s)
      const c = await checks(s, ids)
      t.eq(c.kids.length, 6, 'R6 dummy has 6 limbs')
      t.ok(c.kids.every(([, col, mat]) => col === '#a3a2a5' && mat === 'Plastic'), 'every limb is Roblox grey #A3A2A5 Plastic: ' + JSON.stringify(c.kids))
      t.eq(c.neon, ['#ff3d7f', '#ff3d7f', false], 'neon glows in its own colour, not tone-mapped')
      t.ok(moved > 0.1, 'sculpt strokes moved the blob surface by ' + moved.toFixed(3))
      t.eq([c.blob, c.stroke, c.n], ['mesh', 'stroke', 16], 'blob is a mesh, the stroke exists; 16 objects with the baseplate and rig group')
      await s.run('edit.select', { ids: [ids.blob] })
      const lines = await s.eval(id => { let n = 0; window.studio.app.viewport.objects.get(id).traverse(c => { if (c.isLineSegments2) n++ }); return n }, ids.blob)
      t.ok(lines > 0, 'the selected smooth sculpt shows an outline')
      await s.eval(async d => { await window.studio.app.viewport.setCamera(d === 'phone' ? { pos: [20, 15, 30], target: [1, 1.5, 1] } : { pos: [15, 9, 19], target: [0.5, 1.5, 0.5] }) }, device)
      await s.idle(); await s.eval(() => new Promise(r => setTimeout(r, 300)))
      const sw = await s.eval(() => document.documentElement.scrollWidth <= innerWidth)
      t.ok(sw, 'no sideways scroll')
      await s.shot(device + '-build.png')
      if (device === 'phone') {
        await s.eval(() => window.studio.app.store.flush())
        await s.run('file.home')
        await s.eval(() => window.studio.app.store.createProject('Racing track'))
        await s.waitFor(() => document.querySelectorAll('.home .card[data-id]').length === 2 && document.querySelectorAll('.home .card img').length === 1 && [...document.querySelectorAll('.home .card img')].every(i => i.complete && i.naturalWidth > 0), null, 8000)
        const cut = await s.eval(() => [...document.querySelectorAll('.home .card')].filter(c => c.scrollWidth > c.clientWidth + 1 || c.getBoundingClientRect().right > innerWidth).length)
        t.eq(cut, 0, 'home cards fit the phone width')
        const meta = await s.eval(() => [...document.querySelectorAll('.home .c-m span')].filter(e => e.getClientRects().length !== 1 || e.scrollWidth > e.clientWidth + 1).map(e => e.textContent))
        t.eq(meta, [], 'card count and date each sit on one uncut line')
        await s.shot('phone-home.png')
      }
      s.noErrors()
    })
  }
}
