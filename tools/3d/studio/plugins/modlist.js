// Modify tool list (boot): id, label, group, params. Implementations: modops.js, loaded on first use (boot size cap).
const AXES = ['x', 'y', 'z']
const P = (k, label, d, step, min, max) => ({ k, label, d, step, min, max })
const PA = (k, label, d, opts = AXES) => ({ k, label, d, opts })
export const MODOPS = [
  ['toSphere', 'To sphere', 'deform', [P('factor', 'Factor', 1, 0.1, 0, 1)]],
  ['cast', 'Cast', 'deform', [P('factor', 'Factor', 0.5, 0.1, -2, 2), PA('shape', 'Shape', 'sphere', ['sphere', 'cylinder', 'cuboid']), PA('axis', 'Axis', 'y')]],
  ['shear', 'Shear', 'deform', [P('factor', 'Factor', 0.3, 0.1), PA('axis', 'Move axis', 'x'), PA('along', 'By axis', 'y')]],
  ['bend', 'Bend', 'deform', [P('angle', 'Angle°', 90, 15), PA('axis', 'Along', 'y'), PA('toward', 'Toward', 'z')]],
  ['twist', 'Twist', 'deform', [P('angle', 'Angle°', 90, 15), PA('axis', 'Axis', 'y')]],
  ['taper', 'Taper', 'deform', [P('factor', 'Factor', -0.5, 0.1), PA('axis', 'Axis', 'y')]],
  ['stretch', 'Stretch', 'deform', [P('factor', 'Factor', 0.3, 0.1, -0.9), PA('axis', 'Axis', 'y')]],
  ['warp', 'Warp', 'deform', [P('angle', 'Angle°', 180, 15), PA('axis', 'Around', 'y'), P('cx', 'Cursor X', 0, 0.1), P('cy', 'Cursor Y', 0, 0.1), P('cz', 'Cursor Z', 0, 0.1)]],
  ['wave', 'Wave', 'deform', [P('amp', 'Height', 0.1, 0.05), P('length', 'Wavelength', 1, 0.1, 0.01), P('phase', 'Phase°', 0, 15), PA('axis', 'Up axis', 'y'), PA('mode', 'Shape', 'ripple', ['ripple', 'x', 'y', 'z'])]],
  ['displace', 'Displace noise', 'deform', [P('strength', 'Strength', 0.1, 0.02), P('scale', 'Noise size', 0.5, 0.1, 0.001), P('seed', 'Seed', 1, 1)]],
  ['randomize', 'Randomize', 'deform', [P('amount', 'Amount', 0.05, 0.01, 0), P('normal', 'Along normal', 0, 0.1, 0, 1), P('seed', 'Seed', 1, 1)]],
  ['shrinkFatten', 'Shrink/Fatten', 'deform', [P('dist', 'Distance', 0.05, 0.01)]],
  ['pushPull', 'Push/Pull', 'deform', [P('dist', 'Distance', 0.1, 0.05)]],
  ['smoothVerts', 'Smooth vertices', 'deform', [P('iter', 'Repeat', 3, 1, 1, 100), P('factor', 'Factor', 0.5, 0.1, 0, 1)]],
  ['smoothKeep', 'Smooth (keep volume)', 'deform', [P('iter', 'Repeat', 5, 1, 1, 100), P('factor', 'Factor', 0.5, 0.1, 0, 1)]],
  ['flatten', 'Flatten', 'deform', [PA('axis', 'Normal', 'auto', ['auto', ...AXES]), P('factor', 'Factor', 1, 0.1, 0, 1)]],
  ['shrinkwrap', 'Shrinkwrap', 'deform', [P('offset', 'Offset', 0, 0.01), P('factor', 'Factor', 1, 0.1, 0, 1)]],
  ['solidify', 'Solidify', 'generate', [P('thickness', 'Thickness', 0.05, 0.01)]],
  ['wireframe', 'Wireframe', 'generate', [P('thickness', 'Thickness', 0.03, 0.01, 0.0001)]],
  ['triangulate', 'Triangulate', 'generate', []],
  ['trisToQuads', 'Tris to quads', 'generate', [P('angle', 'Max angle°', 40, 5, 0, 180)]],
  ['poke', 'Poke faces', 'generate', [P('offset', 'Offset', 0, 0.01)]],
  ['extrudeEach', 'Extrude individual', 'generate', [P('dist', 'Distance', 0.1, 0.05)]],
  ['insetEach', 'Inset individual', 'generate', [P('amount', 'Amount', 0.2, 0.05, 0, 0.95)]],
  ['duplicate', 'Duplicate', 'generate', [P('dx', 'Offset X', 0, 0.1), P('dy', 'Offset Y', 0, 0.1), P('dz', 'Offset Z', 0, 0.1)]],
  ['bridge', 'Bridge faces', 'generate', []],
  ['spin', 'Spin (lathe)', 'generate', [P('angle', 'Angle°', 360, 15), P('steps', 'Steps', 16, 1, 1, 256), PA('axis', 'Axis', 'y'), P('cx', 'Centre X', 0, 0.1), P('cy', 'Centre Y', 0, 0.1), P('cz', 'Centre Z', 0, 0.1)]],
  ['screw', 'Screw', 'generate', [P('angle', 'Angle°', 720, 90), P('steps', 'Steps', 32, 1, 1, 512), P('height', 'Height', 1, 0.1), PA('axis', 'Axis', 'y'), P('cx', 'Centre X', 0, 0.1), P('cy', 'Centre Y', 0, 0.1), P('cz', 'Centre Z', 0, 0.1)]],
  ['array', 'Array', 'generate', [P('count', 'Count', 3, 1, 1, 200), P('rx', 'Rel X', 1, 0.1), P('ry', 'Rel Y', 0, 0.1), P('rz', 'Rel Z', 0, 0.1), PA('merge', 'Merge', 'yes', ['yes', 'no'])]],
  ['mirror', 'Mirror', 'generate', [PA('axis', 'Axis', 'x')]],
  ['symmetrize', 'Symmetrize', 'generate', [PA('axis', 'Axis', 'x'), PA('dir', 'Keep side', '+', ['+', '-'])]],
  ['bisect', 'Bisect', 'generate', [PA('axis', 'Axis', 'y'), P('offset', 'Offset', 0, 0.1), PA('clear', 'Clear side', 'none', ['none', 'neg', 'pos'])]],
  ['convexHull', 'Convex hull', 'generate', []],
  ['decimate', 'Decimate', 'generate', [P('ratio', 'Ratio', 0.5, 0.05, 0.01, 1)]],
  ['fillHoles', 'Fill holes', 'generate', []],
  ['dissolveFaces', 'Dissolve faces', 'clean', []],
  ['dissolveEdges', 'Dissolve edges', 'clean', []],
  ['limitedDissolve', 'Limited dissolve', 'clean', [P('angle', 'Max angle°', 5, 1, 0, 90)]],
  ['edgeSplit', 'Edge split', 'clean', [P('angle', 'Split angle°', 30, 5, 0, 180)]],
  ['splitFaces', 'Split faces', 'clean', []],
  ['removeIslands', 'Delete small parts', 'clean', [P('faces', 'Under faces', 8, 1, 1)]],
  ['cleanUp', 'Clean up', 'clean', [P('dist', 'Merge dist', 0.0001, 0.0001, 0)]],
  ['uvBox', 'UV box project', 'uv', [P('scale', 'Scale', 1, 0.1, 0.001)]],
  ['uvPlanar', 'UV planar project', 'uv', [P('scale', 'Scale', 1, 0.1, 0.001), PA('axis', 'View axis', 'z')]],
  ['uvCylinder', 'UV cylinder project', 'uv', [P('scale', 'Scale', 1, 0.1, 0.001), PA('axis', 'Axis', 'y')]],
  ['uvSphere', 'UV sphere project', 'uv', [P('scale', 'Scale', 1, 0.1, 0.001), PA('axis', 'Axis', 'y')]],
  ['selectMore', 'Select more', 'select', []],
  ['selectLess', 'Select less', 'select', []],
  ['selectInvert', 'Invert selection', 'select', []],
  ['selectRandom', 'Select random', 'select', [P('ratio', 'Ratio', 0.5, 0.1, 0, 1), P('seed', 'Seed', 1, 1)]],
  ['selectNonManifold', 'Select non-manifold', 'select', []],
  ['selectBoundary', 'Select boundary loop', 'select', []],
  ['selectSharp', 'Select sharp edges', 'select', [P('angle', 'Angle°', 30, 5, 0, 180)]],
  ['selectLinkedFlat', 'Select linked flat', 'select', [P('angle', 'Angle°', 5, 1, 0, 90)]],
  ['selectSimilarNormal', 'Select similar normal', 'select', [P('angle', 'Angle°', 10, 1, 0, 180)]],
  ['selectSide', 'Select side', 'select', [PA('axis', 'Axis', 'x'), PA('side', 'Side', '+', ['+', '-'])]],
  ['selectLoop', 'Select edge loop', 'select', []],
].map(([id, label, group, params]) => ({ id, label, group, params, select: group === 'select' }))
export const MODGROUPS = [['deform', 'Deform'], ['generate', 'Generate'], ['clean', 'Clean up'], ['uv', 'UV'], ['select', 'Select']]
// Resolved params: defaults, numbers clamped, axis/option strings checked.
export function params(o, a = {}) {
  const p = {}
  for (const d of o.params) {
    if (d.opts) { const v = a[d.k] === undefined ? d.d : String(a[d.k]); if (!d.opts.includes(v)) throw new Error(o.label + ': ' + d.k + ' is one of ' + d.opts.join(', ')); p[d.k] = v; continue }
    let v = a[d.k] === undefined ? d.d : +a[d.k]; if (!Number.isFinite(v)) throw new Error(o.label + ': ' + d.k + ' must be a number')
    if (d.min !== undefined) v = Math.max(d.min, v); if (d.max !== undefined) v = Math.min(d.max, v); p[d.k] = v
  }
  return p
}
