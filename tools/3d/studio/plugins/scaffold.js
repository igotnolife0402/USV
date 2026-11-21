// Temporary models: test helpers (a ball to throw, a sword to hold, an axis marker to align, a dummy box) that live and animate in the
// tab like anything else but never leave it: every export (3D files, Roblox, scene .json, video) skips objects with `temp: true` and
// everything under them. The Explorer lists them in their own "Temporary models" section with a show/hide toggle.
const T = { temp: true }
const add = (app, o) => { const id = app.add({ ...o, ...T }); app.select([id]); return id }
const HELPERS = {
  ball: app => add(app, { type: 'part', shape: 'sphere', name: 'Temp ball', size: [1.5, 1.5, 1.5], pos: [-8, 2, 0], color: '#f4f6fa', metalness: 1, roughness: 0.02 }),
  sword: app => {
    const g = app.add({ type: 'group', name: 'Temp sword', pos: [0, 3, 3], ...T })
    app.add({ type: 'part', shape: 'box', name: 'Blade', parent: g, pos: [0, 2.4, 0], size: [0.5, 4.2, 0.12], color: '#c9ced6', metalness: 0.9, roughness: 0.2, ...T })
    app.add({ type: 'part', shape: 'box', name: 'Guard', parent: g, pos: [0, 0.25, 0], size: [1.4, 0.2, 0.3], color: '#c9962e', metalness: 1, roughness: 0.3, ...T })
    app.add({ type: 'part', shape: 'cylinder', name: 'Grip', parent: g, pos: [0, -0.4, 0], size: [0.25, 1.1, 0.25], color: '#3c2414', ...T })
    app.select([g]); return g
  },
  marker: app => {
    const g = app.add({ type: 'group', name: 'Temp marker (x red, y green, z blue)', pos: [0, 0, 0], ...T })
    for (const [n, size, pos, color] of [['X', [3, 0.08, 0.08], [1.5, 0, 0], '#ff4040'], ['Y', [0.08, 3, 0.08], [0, 1.5, 0], '#40ff60'], ['Z', [0.08, 0.08, 3], [0, 0, 1.5], '#4080ff']])
      app.add({ type: 'part', shape: 'box', name: 'Axis ' + n, parent: g, size, pos, color, material: 'Neon', ...T })
    app.select([g]); return g
  },
  box: app => add(app, { type: 'part', shape: 'box', name: 'Temp box', size: [2, 2, 2], pos: [0, 1, 0], color: '#ff9f1a', transparency: 0.4 })
}
const tempRoots = app => app.ids().filter(id => app.obj(id)?.temp && !app.isTemp(app.obj(id).parent))

export default {
  id: 'temp', name: 'Temporary models',
  commands: {
    'temp.ball': { label: 'Temporary ball', icon: 'sphere', run: app => HELPERS.ball(app) },
    'temp.sword': { label: 'Temporary sword', icon: 'plus', run: app => HELPERS.sword(app) },
    'temp.marker': { label: 'Temporary axis marker', icon: 'plus', run: app => HELPERS.marker(app) },
    'temp.box': { label: 'Temporary box', icon: 'cube', run: app => HELPERS.box(app) },
    'temp.make': {
      label: 'Make temporary (not exported)', run: (app, a = {}) => {
        const ids = a.ids || app.selection; if (!ids.length) throw new Error('Select objects first')
        const on = a.on ?? !ids.every(id => app.obj(id)?.temp)
        for (const id of ids) for (const d of [id, ...app.descendants(id)]) app.set(d, { temp: on || undefined })
        return { ids, temp: on }
      }
    },
    'temp.show': {
      label: 'Show / hide temporary models', run: (app, a = {}) => {
        const roots = tempRoots(app); if (!roots.length) return { shown: null }
        const show = a.show ?? roots.some(id => app.obj(id).visible === false)
        for (const id of roots) app.set(id, { visible: show }); return { shown: show }
      }
    }
  },
  menus: { Add: ['-', 'temp.ball', 'temp.sword', 'temp.marker', 'temp.box'], Context: ['-', 'temp.make'] },
  modes: [], tools: [], panels: []
}
