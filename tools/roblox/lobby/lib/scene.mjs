// Minimal builder for Studio project JSON (schema from Studio's core/model.js).
// Defaults mirror model.js so we only write fields that differ, like Studio's own compact().

export const SHAPES = ['box', 'sphere', 'cylinder', 'wedge', 'cornerwedge', 'cone', 'torus', 'plane', 'capsule']
export const MATERIALS = ['Plastic', 'SmoothPlastic', 'Wood', 'WoodPlanks', 'Brick', 'Cobblestone', 'Concrete', 'Slate',
  'Granite', 'Marble', 'Sand', 'Grass', 'Fabric', 'Metal', 'DiamondPlate', 'CorrodedMetal', 'Foil', 'Ice', 'Glass', 'Neon', 'ForceField']
export const LIGHT_KINDS = ['point', 'spot', 'directional']

const COMMON = { name: '', parent: null, pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], visible: true, locked: false, order: 0 }
export const DEFAULTS = {
  part: { ...COMMON, shape: 'box', size: [4, 1, 2], color: '#a3a2a5', material: 'Plastic', texture: null, transparency: 0, anchored: true, negate: false },
  group: { ...COMMON },
  light: { ...COMMON, kind: 'point', color: '#ffffff', intensity: 2, range: 16, angle: 45, shadow: false },
  mesh: { ...COMMON, geo: null, color: '#a3a2a5', material: 'Plastic', texture: null, transparency: 0, smooth: false, anchored: true }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
// Positions/sizes rounded to 1/1000 stud: keeps the JSON small and diffs stable across rebuilds.
const r3 = v => Math.round(v * 1000) / 1000 || 0
const tidy = v => Array.isArray(v) ? v.map(x => typeof x === 'number' ? r3(x) : x) : typeof v === 'number' ? r3(v) : v

export function compact(obj) {
  const d = DEFAULTS[obj.type] || COMMON
  const out = { type: obj.type }
  for (const k in obj) {
    if (k === 'type' || obj[k] === undefined || obj[k] === null) continue
    const v = tidy(obj[k])
    if (k in d && same(v, d[k])) continue
    out[k] = v
  }
  return out
}

export function createScene() {
  const objects = {}
  const counters = {}
  const geos = {}                        // geo id -> {verts, faces, uvs}: Studio's projects/<id>/geo store
  // Live build: every object remembers the stage it belongs to, so stage.mjs can write one sub-part at a time.
  const stages = [], stageOf = {}
  let stage = null
  const startStage = name => { stage = name; stages.push(name) }
  const nextId = prefix => { counters[prefix] = (counters[prefix] || 0) + 1; return `${prefix}-${counters[prefix]}` }

  // `unit` bakes a zone's working scale into the numbers (10x method: author in 0.1-stud units, unit = 0.1).
  const SCALED = ['pos', 'size']
  function bake(props, unit) {
    if (unit === 1) return props
    const out = { ...props }
    for (const k of SCALED) if (out[k]) out[k] = out[k].map(v => v * unit)
    for (const k of ['bevel', 'range']) if (out[k] != null) out[k] *= unit
    return out
  }

  function add(type, prefix, name, props = {}, unit = 1) {
    const id = nextId(prefix)
    const { parent, ...rest } = bake(props, unit)
    if (parent != null && !(parent in objects)) throw new Error(`${name}: unknown parent ${parent}`)
    objects[id] = compact({ type, name, parent: parent ?? null, ...rest })
    stageOf[id] = stage
    return id
  }

  // A zone builder stamps its prefix on every id, so ids stay stable when another zone changes.
  function zone(prefix, { unit = 1 } = {}) {
    return {
      unit,
      group: (name, props) => add('group', prefix, name, props, unit),
      part: (name, props) => add('part', prefix, name, props, unit),
      light: (name, props) => add('light', prefix, name, props, unit),
      // A merged mesh (world-space geometry already baked in): `pieces` and `area` let the validator count its detail.
      mesh: (name, geo, props) => { const gid = nextId(prefix + '-g'); geos[gid] = geo; return add('mesh', prefix, name, { ...props, geo: gid }) },
      // Position keys are in working units too.
      track: (clipId, objId, ch, keys) => track(clipId, objId, ch, ch === 'pos' ? keys.map(([t, v, e]) => [t, v.map(x => x * unit), e].filter(x => x !== undefined)) : keys)
    }
  }

  // Animation clips (Studio's anims: {name, len, fps, loop, tracks: {objId: {channel: [[t, value, ease?]]}}}).
  const anims = {}
  function clip(id, name, len, loop = true) { anims[id] = { name, len, fps: 30, loop, tracks: {} }; return id }
  function track(clipId, objId, ch, keys) {
    if (!(objId in objects)) throw new Error(`track: unknown object ${objId}`)
    ;(anims[clipId].tracks[objId] ||= {})[ch] = keys.map(k => k.map(tidy))
  }

  return { objects, anims, geos, zone, clip, track, stage: startStage, stages, stageOf, get: id => objects[id] }
}
