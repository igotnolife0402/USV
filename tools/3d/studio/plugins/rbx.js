// Roblox plugin registration (boot): commands, File menu, importer/exporter entries and icons.
// The converter itself (plugins/roblox.js, ~90 KB) loads on first use, keeping boot code under the 800 KB cap.
const R = () => import('./roblox.js')
// The file picker opens right inside the tap (iOS drops input.click() after an await); the converter loads after.
function pickFile(app) {
  return new Promise((resolve, reject) => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = '.rbxmx,.rbxm,.xml'
    inp.onchange = () => { const f = inp.files?.[0]; if (f) R().then(r => r.importFile(app, f)).then(resolve, e => { app.toast?.(e.message, 'error'); reject(e) }); else resolve(null) }
    inp.click()
  })
}
const ICONS = {
  'rbx-brick': 'M2 5.5 8 2.5l6 3v5l-6 3-6-3z M2 5.5 8 8.5l6-3 M8 8.5v5',
  'rbx-script': 'M3 2.5h7l3 3v8H3z M10 2.5v3h3 M5.5 8.5 4.5 10l1 1.5 M10.5 8.5l1 1.5-1 1.5 M8.5 8l-1 4',
  'rbx-in': 'M2 10.5v3h12v-3 M8 2.5v8 M5 7.5l3 3 3-3'
}

export default {
  id: 'roblox', name: 'Roblox',
  commands: {
    'roblox.export': { label: 'Export Roblox model (.rbxmx)', icon: 'rbx-brick', noUndo: true, run: async (app, a = {}) => (await R()).exportTo(app, 'rbxmx', a) },
    'roblox.exportLua': { label: 'Export Roblox build script (.lua)', icon: 'rbx-script', noUndo: true, run: async (app, a = {}) => (await R()).exportTo(app, 'lua', a) },
    'roblox.import': { label: 'Import Roblox model (.rbxmx)', icon: 'rbx-in', run: (app, a = {}) => a.text ? R().then(r => r.addItems(app, r.readRoblox(a.text))) : pickFile(app) },
    'roblox.rbxmx': { label: 'Roblox model as text', icon: 'rbx-brick', hidden: true, noUndo: true, run: async (app, a = {}) => { const r = await (await R()).build(app, 'rbxmx', a); return { xml: r.xml, counts: r.counts, notes: r.notes, meshes: r.meshes.map(m => m.key) } } },
    'roblox.lua': { label: 'Roblox build script as text', icon: 'rbx-script', hidden: true, noUndo: true, run: async (app, a = {}) => { const r = await (await R()).build(app, 'lua', a); return { lua: r.lua, counts: r.counts, notes: r.notes } } }
  },
  menus: { File: ['-', 'roblox.import', 'roblox.export', 'roblox.exportLua'] },
  modes: [], tools: [], panels: [], types: {},
  importers: [{ ext: ['rbxmx', 'rbxm'], label: 'Roblox model', load: async (file, app) => (await R()).importFile(app, file) }],
  exporters: [
    { ext: 'rbxmx', label: 'Roblox model', hint: 'Roblox Studio: parts, Models, R6 animations. All meshes come in one .fbx (one Import 3D) plus a script that puts them in place.', save: async (app, opts = {}) => { const p = await (await R()).packFor(app, 'rbxmx', opts); return { filename: p.filename, data: p.data } } },
    { ext: 'lua', label: 'Roblox script', hint: 'Paste into Roblox Studio\'s Command Bar to build the parts. Meshes are skipped.', save: async (app, opts = {}) => { const p = await (await R()).packFor(app, 'lua', opts); return { filename: p.filename, data: p.data } } }
  ],
  async init(app) {
    try { (await import('../core/ui.js')).addIcons?.(ICONS) } catch {}
  }
}
