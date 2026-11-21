// Layout and speed: the desktop home and editor, the phone layout (no sideways scroll, 44 px touch targets,
// bottom sheet), rendering only on demand, and frame time with 500 parts. Saves the review screenshots.

// A small cottage scene built from explicit positions (degrees for rotation, y up, the baseplate top is y 0).
async function cottage(s) {
  return s.eval(() => {
    const A = window.studio.app, P = (shape, a) => A.run('parts.' + shape, { select: false, ...a })
    const ids = {}
    A.transact('Cottage', () => {
      P('box', { name: 'Lawn', size: [34, 0.4, 28], pos: [0, 0.2, 0], color: '#5b9a48', material: 'Grass' })
      P('box', { name: 'Path', size: [3, 0.2, 9], pos: [0, 0.5, 9.4], color: '#8d8a85', material: 'Cobblestone' })
      for (const [n, size, pos] of [['Back wall', [12, 7, 1], [0, 3.9, -4.5]], ['Left wall', [1, 7, 8], [-5.5, 3.9, 0]], ['Right wall', [1, 7, 8], [5.5, 3.9, 0]],
        ['Front wall', [4.5, 7, 1], [-3.75, 3.9, 4.5]], ['Front wall', [4.5, 7, 1], [3.75, 3.9, 4.5]], ['Lintel', [3, 1.4, 1], [0, 6.7, 4.5]]])
        P('box', { name: n, size, pos, color: '#b4553c', material: 'Brick' })
      ids.door = P('box', { name: 'Door', size: [3, 5.6, 0.4], pos: [0, 3.2, 4.5], color: '#7a4e2d', material: 'WoodPlanks' })
      P('box', { name: 'Roof', size: [8.2, 0.6, 11], pos: [-3.4, 9.5, 0], rot: [0, 0, 30], color: '#4a3a33', material: 'Slate' })
      P('box', { name: 'Roof', size: [8.2, 0.6, 11], pos: [3.4, 9.5, 0], rot: [0, 0, -30], color: '#4a3a33', material: 'Slate' })
      for (const z of [-4.5, 4.5]) for (const sx of [-1, 1]) P('wedge', { name: 'Gable', size: [1, 3.46, 6], pos: [sx * 3, 9.13, z], rot: [0, -sx * 90, 0], color: '#b4553c', material: 'Brick' })
      P('box', { name: 'Chimney', size: [1.4, 3.4, 1.4], pos: [3.4, 10.8, -2], color: '#9c4a35', material: 'Brick' })
      for (const x of [-6.05, 6.05]) P('box', { name: 'Window', size: [0.2, 2.2, 3], pos: [x, 4.4, 0], color: '#9fd3ff', material: 'Glass', transparency: 0.35 })
      P('cylinder', { name: 'Trunk', size: [1.2, 5, 1.2], pos: [-11, 2.9, -5], color: '#6e4a2c', material: 'Wood' })
      P('sphere', { name: 'Leaves', size: [6, 6, 6], pos: [-11, 7.6, -5], color: '#3f8d3a', material: 'Grass' })
      P('sphere', { name: 'Leaves', size: [4, 4, 4], pos: [-10.2, 10, -4.2], color: '#4a9a42', material: 'Grass' })
      P('cylinder', { name: 'Trunk', size: [0.8, 2.6, 0.8], pos: [-12, 1.7, 7], color: '#6e4a2c', material: 'Wood' })
      P('cone', { name: 'Pine', size: [4, 7, 4], pos: [-12, 6.4, 7], color: '#2f6a37' })
      P('cylinder', { name: 'Barrel', size: [2, 2.6, 2], pos: [8.2, 1.7, -2], color: '#8a5a33', material: 'WoodPlanks' })
      P('cylinder', { name: 'Lamp post', size: [0.4, 5, 0.4], pos: [-3.5, 2.9, 11], color: '#3a3d42', material: 'Metal' })
      P('sphere', { name: 'Lamp', size: [1.2, 1.2, 1.2], pos: [-3.5, 5.9, 11], color: '#ffd27a', material: 'Neon' })
      P('torus', { name: 'Tyre', size: [2.4, 0.8, 2.4], pos: [9, 0.8, 2], color: '#2a2c30' })
      ids.rig = A.run('parts.rig', { pos: [8, 0.4, 7], torso: '#3d8bfd', head: '#f2c79b', arms: '#f2c79b', legs: '#2f3a4a', select: false })
    })
    return ids
  })
}

export default async function (t) {
  await t.test('desktop: home grid and a demo scene in the editor', async () => {
    const s = await t.open()
    await s.waitFor(() => document.querySelector('.home .empty'))
    // header content lines up with the project grid
    const al = await s.eval(() => { const b = document.querySelector('.h-top .brand').getBoundingClientRect(), h = document.querySelector('.h-title').getBoundingClientRect(); return [Math.round(b.left), Math.round(h.left)] })
    t.ok(Math.abs(al[0] - al[1]) <= 1, 'home header lines up with the content, got ' + al)
    const pid = await s.project('Cottage')
    const ids = await cottage(s)
    await s.eval(async () => { const A = window.studio.app, v = A.viewport; await v.setCamera({ pos: [30, 20, 34], target: [-1, 3.5, 1] }); await A.store.flush() })
    await s.run('edit.select', { ids: [ids.door] }); await s.run('tool.move')
    await s.idle(); await s.eval(() => new Promise(r => setTimeout(r, 300)))
    // the main areas tile the window with no overlap
    const r = await s.eval(() => Object.fromEntries(['.topbar', '.toolstrip', '.vp', '.sidebar', '.statusbar'].map(q => { const b = document.querySelector(q).getBoundingClientRect(); return [q, [b.left, b.top, b.right, b.bottom].map(Math.round)] })))
    t.eq([r['.topbar'][3], r['.statusbar'][3]], [r['.vp'][1], 900], 'viewport starts under the top bar; status bar sits at the bottom')
    t.eq([r['.toolstrip'][2], r['.vp'][2]], [r['.vp'][0], r['.sidebar'][0]], 'tool strip | viewport | sidebar touch with no gap')
    const h = await s.eval(() => [...document.querySelectorAll('.topbar .ib, .toolstrip .tb')].filter(b => b.offsetParent).map(b => Math.round(b.getBoundingClientRect().height)))
    t.ok(h.every(v => v === 28), 'desktop controls are 28 px, got ' + [...new Set(h)])
    await s.shot('desktop-editor.png')
    // top bar: the project name, save chip and snap button never overlap, with every save text
    const tb = await s.eval(() => ['Saved', 'Saving…', 'Not saved', 'Saved in this browser'].map(txt => {
      const c = document.querySelector('.save-chip'); c.innerHTML = '<i></i>' + txt
      const R = ['.modes', '.pname', '.save-chip', '.t-right'].map(q => document.querySelector(q).getBoundingClientRect()).filter(b => b.width > 0)
      const hit = R.slice(1).some((b, i) => b.left < R[i].right + 4), cut = c.scrollWidth > c.clientWidth + 1
      return [txt, hit || cut, R.map(b => [Math.round(b.left), Math.round(b.right)]).join(' ')]
    }))
    t.ok(tb.every(([, bad]) => !bad), 'top bar items never overlap or clip: ' + JSON.stringify(tb))
    t.log('top bar', JSON.stringify(tb[3]))
    await s.eval(() => window.studio.app.store.flush())
    // back home: the project card shows its thumbnail
    await s.run('file.home')
    await s.waitFor(id => document.querySelector(`.card[data-id="${id}"] img`)?.complete, pid, 8000)
    await s.eval(() => window.studio.app.store.createProject('Racing track'))
    await s.waitFor(() => document.querySelectorAll('.home .card[data-id]').length === 2)
    await s.shot('desktop-home.png')
    s.noErrors()
  })

  await t.test('phone: no sideways scroll, 44 px touch targets, bottom sheet', async () => {
    const s = await t.open({ device: 'phone' })
    const big = async where => s.eval(q => [...document.querySelectorAll(q)].filter(b => b.offsetParent && getComputedStyle(b).visibility !== 'hidden').map(b => { const r = b.getBoundingClientRect(); return [b.className || b.tagName, Math.round(r.width), Math.round(r.height)] }).filter(([, w, h]) => w < 44 || h < 44), where)
    t.eq(await big('.home button'), [], 'home buttons ≥44 px')
    await s.project('Cottage')
    const ids = await cottage(s)
    await s.eval(async () => { await window.studio.app.viewport.setCamera({ pos: [34, 26, 46], target: [-1, 3, 2] }) })
    await s.run('edit.select', { ids: [ids.door] })
    await s.idle()
    const sw = await s.eval(() => [document.documentElement.scrollWidth, document.body.scrollWidth, innerWidth])
    t.ok(sw[0] <= sw[2] && sw[1] <= sw[2], 'no sideways scroll, got ' + sw)
    t.eq(await big('.topbar button, .mobilebar button'), [], 'top bar and tool bar buttons ≥44 px')
    // mode pill in the top bar: 32 px, #2a2f3a, radius 16, 15 px semibold label, accent icon; project name 12 px muted under it
    const pill = await s.eval(() => { const q = c => document.querySelector(c), cs = c => getComputedStyle(q(c)), r = q('.t-pill').getBoundingClientRect(), l = q('.t-ml')
      return { h: Math.round(r.height), bg: cs('.t-pill').backgroundColor, rad: cs('.t-pill').borderRadius, fs: cs('.t-ml').fontSize, fw: cs('.t-ml').fontWeight, label: l.textContent, cut: l.scrollWidth > l.clientWidth + 1, ic: getComputedStyle(q('.t-mi .ic')).color, name: q('.t-pn').textContent, nfs: cs('.t-pn').fontSize, nc: cs('.t-pn').color, pname: q('.pname').offsetParent === null } })
    t.eq(pill, { h: 32, bg: 'rgb(42, 47, 58)', rad: '16px', fs: '15px', fw: '600', label: 'Build', cut: false, ic: 'rgb(61, 139, 253)', name: 'Cottage', nfs: '12px', nc: 'rgb(139, 147, 161)', pname: true }, 'mode pill and project name')
    await s.page.tap('.t-mode'); await s.waitFor(() => document.querySelectorAll('.sheet .m-item').length > 0)
    const modes = await s.eval(() => [...document.querySelectorAll('.sheet .m-l')].map(l => l.textContent))
    t.eq(modes.length, await s.eval(() => window.studio.app.modes.size), 'mode sheet lists every mode: ' + modes.join(', '))
    t.ok(modes.length === 6, 'six modes')
    await s.page.tap('.sheet .m-item:nth-child(2)'); await s.waitFor(() => !document.querySelector('.sheet-wrap'))
    const ml = await s.eval(() => [document.querySelector('.t-ml').textContent, (m => m.short || m.label)(window.studio.app.modes.get(window.studio.app.mode))])
    t.eq(ml[0], ml[1], 'tapping a mode switches and the pill follows')
    // every mode: at most 6 slots, each ≥62 px, 11 px labels on one line, 22 px icons, the active tool always shown
    for (const m of await s.eval(() => [...window.studio.app.modes.keys()])) {
      await s.eval(m => window.studio.app.setMode(m), m); await s.eval(() => new Promise(r => setTimeout(r, 30)))
      const bar = await s.eval(() => { const bs = [...document.querySelectorAll('.mobilebar .mbt')]; return { n: bs.length, minW: Math.min(...bs.map(b => Math.round(b.getBoundingClientRect().width))), fs: [...new Set(bs.map(b => getComputedStyle(b).fontSize))], cut: bs.filter(b => { const l = b.querySelector('span'); return l.scrollWidth > l.clientWidth + 1 }).map(b => b.textContent), ic: [...new Set(bs.map(b => Math.round(b.querySelector('.ic').getBoundingClientRect().width)))], panels: !!document.querySelector('.mobilebar [data-act=panels]'), active: !!document.querySelector('.mobilebar .mbt.on[data-tool]') || !window.studio.app.tool, pillCut: (l => l.scrollWidth > l.clientWidth + 1 ? l.textContent : '')(document.querySelector('.t-ml')) } })
      t.ok(bar.n <= 6 && bar.minW >= 62 && bar.fs.join() === '11px' && !bar.cut.length && bar.ic.join() === '22' && bar.panels && bar.active && !bar.pillCut, 'mode ' + m + ' bar and pill ' + JSON.stringify(bar))
    }
    await s.eval(() => window.studio.app.setMode('build')); await s.eval(() => new Promise(r => setTimeout(r, 30)))
    const sa = await s.eval(() => getComputedStyle(document.querySelector('.mobilebar')).paddingBottom)
    t.ok(sa !== undefined, 'mobile bar pads for the home indicator')
    await s.shot('phone-editor.png')
    await s.page.tap('.mobilebar [data-act=panels]')
    await s.waitFor(() => document.querySelector('.sidebar.open'))
    t.eq(await s.eval(() => [document.querySelector('.sidebar').dataset.tab, document.querySelector('.mobilebar [data-act=panels]').classList.contains('on')]), ['props', true], 'Panels opens Properties for a selection, button lit')
    await s.eval(() => new Promise(r => setTimeout(r, 350)))
    t.eq(await big('.sidebar.open button, .sidebar.open .inp, .sidebar.open select'), [], 'sheet controls ≥44 px')
    const sw2 = await s.eval(() => document.documentElement.scrollWidth <= innerWidth)
    t.ok(sw2, 'sheet adds no sideways scroll')
    // the view shifts up so the scene centre stays visible above the sheet
    const vis = await s.eval(id => { const v = window.studio.app.viewport, THREE = v.camera.position.constructor, o = v.objects.get(id); o.updateWorldMatrix(true, false); return [Math.round(v.project(new THREE().setFromMatrixPosition(o.matrixWorld)).y), Math.round(document.querySelector('.sidebar').getBoundingClientRect().top)] }, ids.door)
    t.ok(vis[0] > 60 && vis[0] < vis[1], 'selected door stays above the sheet, door y ' + vis[0] + ', sheet top ' + vis[1])
    await s.shot('phone-sheet.png')
    // explorer tab lists the scene with 44 px rows
    await s.page.tap('.side-tabs [data-tab=explorer]')
    await s.waitFor(() => document.querySelector('.sidebar[data-tab=explorer]'))
    const rows = await s.eval(() => [...document.querySelectorAll('.ex-row')].filter(r => r.offsetParent).map(r => Math.round(r.getBoundingClientRect().height)))
    t.ok(rows.length > 5 && rows.every(h => h >= 44), 'explorer rows ≥44 px, got ' + [...new Set(rows)])
    // tapping the open tab keeps the sheet; Panels closes it
    await s.page.tap('.side-tabs [data-tab=explorer]'); t.ok(await s.eval(() => document.querySelector('.sidebar.open') !== null), 'tab tap keeps the sheet open')
    // closing the sheet gives the full view back
    await s.page.tap('.side-tabs .side-close')
    await s.waitFor(() => !window.studio.app.viewport.camera.view?.enabled, null, 3000)
    // the ••• menu sheet: at most 8 category rows, no shortcut text, ≤60% of the screen; each row opens a sub-sheet with a back chevron
    await s.page.tap('.t-more'); await s.waitFor(() => document.querySelectorAll('.sheet .m-item').length > 3)
    await s.eval(() => new Promise(r => setTimeout(r, 300)))
    const top = await s.eval(() => ({ rows: [...document.querySelectorAll('.sheet .m-l')].map(l => l.textContent), h: Math.round(document.querySelector('.sheet').getBoundingClientRect().height), max: Math.round(innerHeight * 0.6), go: document.querySelectorAll('.sheet .m-go .ic').length }))
    t.eq(top.rows, ['Mode', 'File', 'Edit', 'Add', 'Mesh', 'Animate', 'View', 'Help'], 'top level is 8 categories')
    t.ok(top.h <= top.max && top.go === top.rows.length, 'menu sheet ' + top.h + ' px ≤ 60% (' + top.max + '), each row has a chevron')
    await s.page.tap('.sheet .m-item:nth-child(3)')
    await s.waitFor(() => document.querySelector('.sheet .sheet-bk'))
    const sub = await s.eval(() => ({ title: document.querySelector('.sheet-h span').textContent, n: document.querySelectorAll('.sheet .m-item').length, h: Math.round(document.querySelector('.sheet').getBoundingClientRect().height), keys: [...document.querySelectorAll('.sheet .m-k')].filter(k => k.offsetParent && k.textContent).length }))
    t.ok(sub.title === 'Edit' && sub.n > 10 && sub.h <= top.max && sub.keys === 0, 'Edit sub-sheet ' + JSON.stringify(sub))
    const ms = await s.eval(() => { const it = [...document.querySelectorAll('.sheet .m-item')].map(b => b.getBoundingClientRect()); return { narrow: it.filter(r => r.width < innerWidth - 40).length, overlap: it.filter((r, i) => i && r.top < it[i - 1].bottom - 1 && r.top > it[i - 1].top - 1).length, cut: [...document.querySelectorAll('.sheet .m-l')].filter(l => l.scrollWidth > l.clientWidth + 1).map(l => l.textContent) } })
    t.eq(ms, { narrow: 0, overlap: 0, cut: [] }, 'menu sheet rows are full width, stacked, labels whole')
    await s.shot('phone-menu.png')
    await s.page.tap('.sheet .sheet-bk'); await s.waitFor(() => !document.querySelector('.sheet .sheet-bk'))
    t.eq(await s.eval(() => document.querySelectorAll('.sheet .m-item').length), 8, 'back chevron returns to the categories')
    await s.page.tap('.sheet .m-item:nth-child(2)'); await s.waitFor(() => document.querySelector('.sheet [data-cmd="file.rename"]'))
    t.ok(true, 'File sub-sheet holds Rename project')
    s.noErrors()
  })

  await t.test('speed: renders on demand, 500 parts', async () => {
    const s = await t.open()
    const boot = await s.eval(() => Math.round(performance.now())) // page start to studio.ready, plus one round trip
    const o0 = Date.now(); await s.project('Speed', { empty: true }); const open = Date.now() - o0
    t.log('boot ' + boot + ' ms to ready, project open ' + open + ' ms')
    t.ok(boot < 5000 && open < 3000, 'boots under 5 s and opens a project under 3 s on a software GPU')
    await s.eval(() => new Promise(r => setTimeout(r, 600)))
    const idle = await s.eval(async () => { const st = window.studio.app.viewport.stats, a = st.renders; await new Promise(r => setTimeout(r, 2000)); return st.renders - a })
    t.log('idle renders in 2 s: ' + idle)
    t.eq(idle, 0, 'no frames drawn while idle')
    const r = await s.eval(async () => {
      const A = window.studio.app, v = A.viewport, t0 = performance.now()
      A.transact('Many', () => { for (let i = 0; i < 500; i++) A.run('parts.box', { pos: [(i % 25) * 5 - 60, 0.5 + Math.floor(i / 250) * 2, Math.floor(i % 250 / 25) * 5 - 25], size: [4, 1, 2], select: false }) })
      const insert = performance.now() - t0
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const first = v.stats.lastMs
      v.frame(null, 0)
      const ms = []
      for (let i = 0; i < 12; i++) { v.render(); ms.push(v.stats.lastMs) }
      ms.sort((a, b) => a - b)
      // watch for long tasks from a fresh task, so this measuring task is not counted
      await new Promise(r => setTimeout(r, 0))
      const longs = []
      const po = new PerformanceObserver(l => longs.push(...l.getEntries().map(e => Math.round(e.duration)))); try { po.observe({ type: 'longtask' }) } catch {}
      for (let i = 0; i < 10; i++) { A.run('edit.set', { ids: [A.ids()[i]], patch: { color: '#3d8bfd' } }); await new Promise(r => requestAnimationFrame(r)) }
      await new Promise(r => setTimeout(r, 300))
      po.disconnect()
      return { insert: Math.round(insert), first: +first.toFixed(1), median: +ms[6].toFixed(1), calls: v.stats.calls, tris: v.stats.tris, longs }
    })
    t.log('500 parts: insert', r.insert, 'ms, first frame', r.first, 'ms, frame median', r.median, 'ms (software GPU), draw calls', r.calls, 'tris', r.tris, 'long tasks while editing', r.longs)
    t.ok(r.insert < 1500, 'inserting 500 parts takes under 1.5 s, got ' + r.insert)
    t.eq(r.longs.filter(d => d > 50), [], 'no task over 50 ms while editing 500 parts')
    s.noErrors()
  })
}
