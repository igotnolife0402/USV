// Frost Comet for Umbrio (owner 2026-11-25: brand-new showcase, every layer has a physical cause, no spam).
// Story: air freezes above -> ice comet falls -> impact at T -> comet core freezes into one ice crystal -> frost cracks
// spread -> crystal shatters into glitter (no mist: it hid the crystal, owner 2026-11-26). Sheets: sheets.json (specs in SPEC.md), baked by
// ./bake-sheets.cjs. Grid 4x4, 16 frames.
//   PLUGINS=<dir with cine.js> node build.mjs RAW_SHEETS_DIR PAINT_PY OUT
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
const { cinePass, cineLights } = await import(join(resolve(process.env.PLUGINS || '.'), 'cine.js'))
const [RAW, PAINT, OUT] = process.argv.slice(2)
if (!OUT) { console.error('usage: PLUGINS=dir node build.mjs RAW_SHEETS_DIR PAINT_PY OUT'); process.exit(1) }
const ST = join(OUT, 'studio'), FX = join(OUT, 'fx'); mkdirSync(ST, { recursive: true }); mkdirSync(FX, { recursive: true })

const NAME = 'Frost Comet', LEN = 8, PAYOFF = 2.6, SKY = [0, 9, -3], T = [0, 0, 0]
// one ice family only, white = flash core (owner 2026-11-26: violet read as off)
const RAMP = {
  ice: '#031024,#0b4c8c,#2fa8ff,#8fe8ff,#cdf3ff',
  glint: '#0b4c8c,#2fa8ff,#8fe8ff,#e8fbff',
  fog: '#031024,#0b4c8c,#1f6fc0,#6fc8f0',
  mist: '#031024,#0b4c8c,#2fa8ff,#8fe8ff,#e8fbff',
}
// each flipbook = [sheet, ramp, tex, texAmt, cause, entry]
const FB = [
  ['fc-gather', 'ice', 'noise', 0.35, 'air freezing around the sky point', { t: 0.1, life: 1.4, pos: SKY, size: 5 }],
  ['fc-trail', 'ice', 'streaks', 0.6, 'ice shed by the falling comet', { t: 1.4, life: 2.4, pos: SKY, size: 6, cut: 1.2,
    move: [[1.2, [0, 0.9, 0]]] }],
  ['fc-shock', 'ice', 'cells', 0.6, 'impact pressure along the ground', { t: 2.6, life: 0.7, pos: [0, 0.03, 0], size: 14, flat: true }],
  ['fc-glitter', 'glint', 'noise', 0.3, 'ice fragments thrown up by the impact', { t: 2.6, life: 0.9, pos: [0, 1.4, 0], size: 9 }],
  ['fc-cracks', 'ice', 'cells', 0.5, 'frost spreading from the frozen crystal base', { t: 2.9, life: 2.6, pos: [0, 0.02, 0], size: 8, flat: true, blend: 'normal' }],
  ['fc-mist', 'fog', 'noise', 0.6, 'cold air pooling flat on the ground (never in front of the crystal)', { t: 2.8, life: 5.0, pos: [0, 0.04, 0], size: 9, flat: true, blend: 'normal', opacity: 0.3 }],
  ['fc-glitter', 'glint', 'noise', 0.3, 'the crystal shattering', { t: 5.0, life: 1.0, pos: [0, 1.6, 0], size: 8 }],
]
const objs = {}, tracks = {}, uploads = {}, causes = []
const k3 = (t, v, e = 'auto') => [+t.toFixed(3), v, e]
FB.forEach(([sheet, ramp, tex, amt, cause, e], i) => {
  const tid = `fc-${sheet.slice(3)}-${ramp}-${tex}`, file = join(FX, tid + '.webp')
  if (!uploads[tid]) {
    if (!existsSync(file)) {
      const png = join(FX, tid + '.png')
      execFileSync('python3', [PAINT, join(RAW, sheet + '.png'), png, '--ramp', RAMP[ramp], '--tex', tex, '--tex-amt', String(amt), '--grid', '4', '--seed', String(i + 1)])
      execFileSync('python3', ['-I', '-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],"WEBP",quality=88)', png, file])
    }
    uploads[tid] = resolve(file)
  }
  const id = 'fx' + i
  objs[id] = { type: 'flipbook', name: `FX ${sheet.slice(3)} ${e.t}`, tex: tid, grid: 4, frames: 16, parent: null, pos: e.pos, rot: [0, 0, 0],
    size: e.size, start: e.t, life: e.life, loop: false, dur: e.life, fps: +(16 / e.life).toFixed(2), blend: e.blend || 'add', flat: !!e.flat }
  if (e.opacity != null) objs[id].opacity = e.opacity
  const tr = {}
  if (e.move) tr.pos = [k3(e.t, e.pos, 'linear'), ...e.move.map(([dt, p]) => k3(e.t + dt, p, dt < 1.5 ? 'in' : 'linear'))]
  if (e.cut) tr.scale = [k3(e.t, [1, 1, 1], 'step'), k3(e.t + e.cut, [0, 0, 0], 'step')]   // trail ends at impact, before ugen erosion
  if (Object.keys(tr).length) tracks[id] = tr
  causes.push(`${id} ${sheet} ${e.t}s: ${cause}`)
})

// 3D hero meshes from models.py (owner 2026-11-26: Glass cones read as bland triangles): textured ice-rock comet 1.9 m with spikes
// and a glowing core tumbles SKY -> impact; the core freezes into a 13-shard crystal cluster that grows, holds, then shatters.
execFileSync('python3', [join(import.meta.dirname, 'models.py'), ST], { stdio: 'inherit' })   // geo -> ST/geo, objects -> ST/models.json
const M = JSON.parse(readFileSync(join(ST, 'models.json'), 'utf8'))
const group = (id, name, pos, tr) => { objs[id] = { type: 'group', name, parent: null, pos, rot: [0, 0, 0], scale: [1, 1, 1] }; tracks[id] = tr }
const vis = (a, b) => [[0, false, 'step'], [a, true, 'step'], [b, false, 'step']]
group('comet', 'Ice comet', SKY, { pos: [k3(1.4, SKY, 'linear'), k3(PAYOFF, [0, 1.0, 0], 'in')], rot: [k3(1.4, [0, 0, 0], 'linear'), k3(PAYOFF, [-200, 90, 40])],
  visible: vis(1.4, PAYOFF) })
group('crystal', 'Ice crystal', [0, 0, 0], { scale: [k3(0, [0.001, 0.001, 0.001], 'step'), k3(PAYOFF + 0.02, [0.06, 0.06, 0.06], 'step'),
  k3(PAYOFF + 0.24, [1.06, 1.06, 1.06], 'out'), k3(PAYOFF + 0.4, [1, 1, 1], 'smooth'), k3(4.85, [1, 1, 1], 'auto'), k3(5.0, [0.001, 0.001, 0.001], 'in')] })
Object.assign(objs, M.objects)

// close (3.5-4.5 m at the hold) and always moving: follow the fall, push in at impact, slow orbit round the crystal (owner 2026-11-26)
const camera = { pos: [2.7, 1.9, 4.5], target: [0, 1.4, 0], fov: 40 }
const camera_keys = { pos: [k3(0, [2.5, 6.5, 4], 'smooth'), k3(2.4, [2.7, 1.9, 4.5], 'out'), k3(PAYOFF, [2.3, 1.7, 3.9], 'smooth'),
    k3(4.8, [-3.0, 2.1, 4.0], 'smooth'), k3(LEN, [-3.6, 2.5, 4.6])],
  target: [k3(0, [0, 7, -2], 'smooth'), k3(1.4, [0, 6, -1.5], 'smooth'), k3(2.4, [0, 1.2, 0], 'smooth'), k3(4.8, [0, 1.6, 0], 'smooth'), k3(LEN, [0, 1.4, 0])],
  fov: [k3(0, 45), k3(PAYOFF, 50, 'smooth'), k3(LEN, 52)] }   // fov 45-52: the 3.2 m crystal fits whole in the 1100x580 export
let clip = { name: NAME, len: LEN, fps: 60, loop: false, tracks, camera: camera_keys }
clip = cinePass(clip, { payoff: PAYOFF, kind: 'impact', tint: '#e8fbff', push: 0.2 }, camera)
clip.camera = { ...clip.camera, pos: camera_keys.pos, target: camera_keys.target, fov: camera_keys.fov }   // cinePass rewrites the path (it froze target on the sky); keep its shake/flash only
const lit = cineLights(objs, clip, { tint: '#e8fbff', impacts: [{ t: PAYOFF, at: [0, 0.6, 0], color: '#e8fbff' }, { t: 5.0, at: [0, 1.6, 0], color: '#8fe8ff' }],
  rims: [{ pos: [-3, 4, 3], color: '#8fe8ff', base: 0.6 }] })
const now = new Date().toISOString().slice(0, 19) + 'Z'
const doc = { v: 1, name: NAME, objects: lit.objects, textures: M.textures, updated: now, camera, anims: { frost: lit.clip }, env: { bg: '#03060f', fog: null, grid: false, light: 'night' } }
writeFileSync(join(ST, 'project.json'), JSON.stringify(doc))
writeFileSync(join(ST, 'meta.json'), JSON.stringify({ name: NAME, updated: now, count: Object.keys(doc.objects).length, ai: true }))
writeFileSync(join(ST, 'uploads.json'), JSON.stringify(uploads, null, 1))
writeFileSync(join(ST, 'causes.txt'), causes.join('\n') + '\n')
const fb = Object.values(doc.objects).filter(o => o.type === 'flipbook').length
console.log(`${NAME}: ${Object.keys(doc.objects).length} objects, ${fb} flipbooks, ${Object.keys(uploads).length} sheets, payoff ${PAYOFF} s, len ${LEN} s`)
