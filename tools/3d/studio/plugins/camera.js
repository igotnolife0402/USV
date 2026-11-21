// Camera: standard views (numpad, like 3D modeling software), orthographic, frame, the saved scene camera, bookmarks, field of view.
const VIEWS = [
  ['front', 'Front', 'Numpad1'], ['back', 'Back', 'Ctrl+Numpad1'], ['right', 'Right', 'Numpad3'],
  ['left', 'Left', 'Ctrl+Numpad3'], ['top', 'Top', 'Numpad7'], ['bottom', 'Bottom', 'Ctrl+Numpad7'], ['iso', 'Isometric', 'Numpad9']
]
const vp = app => app.viewport
const hasVp = app => !!app.viewport
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }
const SLOTS = [1, 2, 3]

const commands = {}
for (const [id, label, key] of VIEWS) commands['view.' + id] = { label: label + ' view', icon: 'camera', key, enabled: hasVp, noUndo: true, checked: app => app.viewport?.view === id, run: app => vp(app).setView(id) }
Object.assign(commands, {
  'view.ortho': { label: 'Orthographic', icon: 'grid', key: 'Numpad5', enabled: hasVp, noUndo: true, checked: app => !!app.viewport?.ortho, run(app, a) { const v = vp(app); v.setOrtho(a.value ?? !v.ortho); return v.ortho } },
  'view.frame': { label: 'Frame selection', icon: 'frame', key: 'F', enabled: hasVp, noUndo: true, run: (app, a) => vp(app).frame(a.ids || app.selection) },
  'view.frameAll': { label: 'Frame all', icon: 'frame', key: 'Home', enabled: hasVp, noUndo: true, run: app => vp(app).frame([]) },
  'view.camera': { label: 'Go to scene camera', icon: 'camera', key: 'Numpad0', enabled: hasVp, noUndo: true, run(app) { const c = app.scene.camera; const v = vp(app); if (!!c.ortho !== v.ortho) v.setOrtho(!!c.ortho); return v.animateCamera({ pos: c.pos, target: c.target, fov: c.fov }, 300) } },
  'view.saveCamera': { label: 'Set scene camera to view', icon: 'camera', key: 'Ctrl+Alt+Numpad0', enabled: hasVp, run(app) { const c = vp(app).getCamera(); app.setCamera({ pos: c.pos, target: c.target, fov: c.fov, ortho: c.ortho }); app.toast('Scene camera saved'); return c } },
  'view.fov': { label: 'Field of view', hidden: true, enabled: hasVp, noUndo: true, run(app, a) { const f = Math.max(10, Math.min(120, +a.fov || 50)); vp(app).setCamera({ fov: f }); return f } },
  'view.bookmarkSave': { label: 'Save camera bookmark', hidden: true, enabled: hasVp, run(app, a) { const s = String(a.slot ?? 1), c = vp(app).getCamera(); app.setCamera({ bookmarks: { ...(app.scene.camera.bookmarks || {}), [s]: { pos: c.pos, target: c.target } } }); return s } },
  'view.bookmarkGo': { label: 'Go to camera bookmark', hidden: true, enabled: hasVp, noUndo: true, run(app, a) { const b = app.scene.camera.bookmarks?.[String(a.slot ?? 1)]; if (!b) throw new Error('No bookmark ' + (a.slot ?? 1) + ' yet'); return vp(app).animateCamera(b, 300) } },
  'view.fly': { label: 'Fly mode', icon: 'camera', key: 'Shift+F', enabled: hasVp, noUndo: true, checked: app => !!app.viewport?.flying, run: (app, a) => vp(app).fly(a.value ?? !vp(app).flying) },
  'view.grid': { label: 'Grid', icon: 'grid', key: 'Shift+G', checked: app => app.scene.env.grid !== false, run: app => app.setEnv({ grid: app.scene.env.grid === false }) }
})
for (const s of SLOTS) {
  commands['view.bookmark' + s] = { label: 'Go to bookmark ' + s, icon: 'bookmark', key: 'Shift+' + s, enabled: hasVp, noUndo: true, run: app => app.run('view.bookmarkGo', { slot: s }) }
  commands['view.setBookmark' + s] = { label: 'Save bookmark ' + s, icon: 'bookmark', key: 'Ctrl+Shift+' + s, enabled: hasVp, run: app => app.run('view.bookmarkSave', { slot: s }) }
}

const cameraPanel = {
  id: 'camera', label: 'Camera', icon: 'camera', order: 30, when: app => !app.selection.length && !!app.viewport,
  render(el, app) {
    const C = app.ui.controls, v = vp(app)
    const g = C.group(el)
    const views = h('div', 'seg views')
    for (const [id, label, key] of VIEWS) { const b = h('button', 'segb', label === 'Isometric' ? 'Iso' : label); b.dataset.view = id; b.title = label + ' (' + key + ')'; b.onclick = () => app.exec('view.' + id); views.appendChild(b) }
    g.appendChild(C.row('View', views, 'wide'))
    const ctls = [
      C.toggle('Orthographic', { read: () => ({ v: v.ortho }), write: val => v.setOrtho(val) }),
      C.slider('Field of view', { min: 10, max: 120, step: 1, digits: 0, read: () => ({ v: Math.round(v.getCamera().fov) }), write: val => v.setCamera({ fov: val }) })
    ]
    for (const c of ctls) g.appendChild(c.el)
    const acts = h('div', 'btn-row')
    const btn = (label, cmd, ic) => { const b = h('button', 'btn sm', `${app.ui.icon(ic)}<span>${label}</span>`); b.onclick = () => app.exec(cmd); acts.appendChild(b); return b }
    btn('Frame all', 'view.frameAll', 'frame'); btn('Scene camera', 'view.camera', 'camera'); btn('Save view', 'view.saveCamera', 'check')
    g.appendChild(acts)
    const bm = h('div', 'btn-row bookmarks')
    for (const s of SLOTS) {
      const b = h('button', 'btn sm bm', `${app.ui.icon('bookmark')}<span>${s}</span>`)
      b.title = `Bookmark ${s}: click to go (Shift+${s}), long-press or right-click to save (Ctrl+Shift+${s})`
      let t = 0, long = false
      b.addEventListener('pointerdown', () => { long = false; t = setTimeout(() => { long = true; app.exec('view.bookmarkSave', { slot: s }); app.toast('Bookmark ' + s + ' saved') }, 550) })
      b.addEventListener('pointerup', () => clearTimeout(t)); b.addEventListener('pointerleave', () => clearTimeout(t))
      b.addEventListener('click', () => { if (!long) app.exec('view.bookmarkGo', { slot: s }) })
      b.addEventListener('contextmenu', e => { e.preventDefault(); clearTimeout(t); app.exec('view.bookmarkSave', { slot: s }); app.toast('Bookmark ' + s + ' saved') })
      bm.appendChild(b)
    }
    g.appendChild(C.row('Bookmarks', bm, 'wide'))
    const update = () => {
      for (const c of ctls) c.update()
      for (const b of views.children) b.classList.toggle('on', v.view === b.dataset.view)
      const marks = app.scene.camera.bookmarks || {}
      for (const [i, b] of [...bm.children].entries()) b.classList.toggle('set', !!marks[String(i + 1)])
    }
    update()
    el._upd = update
    return app.on('camera', update)
  },
  refresh(el, app, ev) { if (ev.type !== 'time') el._upd?.() }
}

export default {
  id: 'camera', name: 'Camera',
  commands,
  menus: { View: [...VIEWS.map(v => 'view.' + v[0]), '-', 'view.ortho', 'view.frame', 'view.frameAll', '-', 'view.camera', 'view.saveCamera', '-', 'view.fly', 'view.grid'] },
  panels: [cameraPanel]
}
