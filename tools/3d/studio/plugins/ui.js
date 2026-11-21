// Interface mode (Roblox-style GUI editor): this stub registers the mode, the `gui` type, commands and panels at boot;
// the editor itself (ui-editor.js, about 60 KB) loads on first use: entering the mode, a ui.* command or a GUI selection.
import * as THREE from 'three'
import { addIcons } from '../core/ui.js'

addIcons({
  ui: 'M2.5 3.5h11v9h-11z M2.5 6h11 M4.5 8.5h3 M4.5 10.5h5',
  sparkle: 'M8 2l1.3 3.7L13 7l-3.7 1.3L8 12l-1.3-3.7L3 7l3.7-1.3z M12.5 11.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z'
})

let M = null, editor = null, loading = null, APP = null
const load = () => loading ||= import('./ui-editor.js').then(m => { M = m; editor = m.start(APP); return m },
  e => { loading = null; APP?.toast?.('Interface editor failed to load: ' + e.message, 'error'); throw e })
// Sync once loaded (ui.add returns the id), a promise before that.
const call = (fn, app, a) => M ? M.run[fn](app, a) : load().then(m => m.run[fn](app, a))
const isGuiSel = app => app.selection.length > 0 && app.selection.every(id => app.obj(id)?.type === 'gui')
// Panel shown before the editor arrives: render once it has, if the panel is still on screen. Without a refresh
// (uitools) core re-renders the panel on select and mode itself.
const lazyPanel = (id, refresh) => ({
  render(el, app) {
    if (M) return M.panels[id].render(el, app)
    el.innerHTML = '<div class="mute" style="padding:8px">Loading…</div>'
    load().then(m => { if (el.isConnected) { el.innerHTML = ''; m.panels[id].render(el, app) } }, () => {})
  },
  ...refresh && { refresh(el, app, ev) { if (M) M.panels[id].refresh(el, app, ev) } }
})

export default {
  id: 'ui', name: 'Interface',
  init(app) {
    APP = app
    // the mode's own Select tool keeps the phone bar's active button; leaving the mode returns to core's select
    app.on('mode', ({ mode }) => { if (mode === 'ui') { app.setTool('ui.select'); load().catch(() => {}) } })
    if (app.mode === 'ui') { app.setTool('ui.select'); load().catch(() => {}) }
  },
  modes: [{ id: 'ui', label: 'Interface', short: 'UI', icon: 'ui', order: 60 }],
  tools: [{ id: 'ui.select', label: 'Select', icon: 'select', mode: 'ui', order: 0 }],   // picking and dragging happen on the interface view itself
  types: {
    gui: {
      defaults: { kind: 'frame', p: [0.5, 0, 0.5, 0], s: [0, 200, 0, 100], a: [0.5, 0.5] },
      build() { const o = new THREE.Group(); o.userData.helper = true; return o },   // UI lives in the Interface view, not in 3D
      update(o3d) { return o3d }
    }
  },
  commands: {
    'ui.add': { label: 'Add UI element', icon: 'ui', run: (app, a) => call('add', app, a) },
    'ui.template': { label: 'Add UI template', icon: 'sparkle', run: (app, a) => call('template', app, a) },
    'ui.image': { label: 'Upload UI image…', icon: 'image', run: (app, a) => call('image', app, a) },
    'ui.play': { label: 'Play interface animations', icon: 'play', noUndo: true, run: (app, a = {}) => editor ? editor.togglePlay(a.on) : load().then(() => editor.togglePlay(a.on)) },
    'ui.device': { label: 'Interface device', noUndo: true, hidden: true, run: (app, a = {}) => editor ? editor.setDevice(a.device) : load().then(() => editor.setDevice(a.device)) },
    'ui.open': { label: 'Interface editor', icon: 'ui', noUndo: true, run: app => app.setMode('ui') }
  },
  menus: { Add: ['-', 'ui.open'] },
  panels: [
    { id: 'uitools', label: 'Interface', icon: 'ui', order: 2, mode: 'ui', ...lazyPanel('uitools') },
    { id: 'uiprops', label: 'UI properties', icon: 'sliders', order: 8, when: isGuiSel, ...lazyPanel('uiprops', true) }
  ]
}
