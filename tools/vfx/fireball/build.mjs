// Classic Fireball for Umbrio (owner 2026-11-26: "classic fireball that leaves burn marks on impact").
// Story: fireball arcs in from the upper left trailing fire -> impact at T -> flash + fire burst + ground ring + embers
// -> smoke rises -> a charred, still-glowing burn mark stays on the ground and cools (erodes, never vanishes clean).
// Reuses the frost-comet raw sheets (greyscale physics masks) recoloured by fire ramps; hero meshes from models.py.
//   PLUGINS=<dir with cine.js> node build.mjs RAW_SHEETS_DIR PAINT_PY OUT
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
const { cinePass, cineLights } = await import(join(resolve(process.env.PLUGINS || '.'), 'cine.js'))
const [RAW, PAINT, OUT] = process.argv.slice(2)
if (!OUT) { console.error('usage: PLUGINS=dir node build.mjs RAW_SHEETS_DIR PAINT_PY OUT'); process.exit(1) }
const ST = join(OUT, 'studio'), FX = join(OUT, 'fx'); mkdirSync(ST, { recursive: true }); mkdirSync(FX, { recursive: true })

const NAME = 'Fireball', LEN = 7, PAYOFF = 1.4, SKY = [-7, 5, -2]
// one fire family; ramps stop short of pure white so the gradient shows (frost-comet lesson 2026-11-26)
const RAMP = {
  fire: '#2a0602,#8a1a04,#ff5a10,#ffb13a,#fff0c0',
  ember: '#5a0c02,#ff5a10,#ffb13a,#ffe08a',
  smoke: '#050403,#14100d,#2a241f,#443b34',
  char: '#000000,#0a0503,#1c0d06,#3a1808',
  glow: '#1a0402,#7a1404,#ff4a0c,#ff9a2a',
}
// each flipbook = [raw sheet, ramp, tex, texAmt, cause, entry]
const FB = [
  ['fc-trail', 'fire', 'streaks', 0.6, 'flame shed behind the flying fireball', { t: 0.1, life: 1.6, pos: SKY, size: 2.4, cut: PAYOFF - 0.1,   // 4.5 covered the fireball mesh as a flat cream disc
    move: [[PAYOFF - 0.1, [0, 0.5, 0]]] }],
  ['fc-mist', 'fire', 'noise', 0.55, 'fuel bursting into flame at impact', { t: PAYOFF, life: 1.0, pos: [0, 1.1, 0], size: 5.5 }],   // gather sheet implodes: wrong for a burst
  ['fc-shock', 'fire', 'cells', 0.5, 'heat blast along the ground', { t: PAYOFF, life: 0.6, pos: [0, 0.04, 0], size: 9, flat: true }],
  ['fc-glitter', 'ember', 'noise', 0.35, 'burning debris thrown up', { t: PAYOFF + 0.05, life: 1.2, pos: [0, 1.2, 0], size: 6 }],
  ['fc-mist', 'smoke', 'noise', 0.6, 'smoke from the burning ground, rising', { t: PAYOFF + 0.3, life: 3.5, pos: [0, 1.4, 0], size: 6, blend: 'normal', opacity: 0.45,
    move: [[3.5, [0.3, 3.2, -0.4]]] }],
  ['fc-mist', 'char', 'noise', 0.6, 'scorched ground: the burn mark', { t: PAYOFF + 0.1, life: LEN - PAYOFF - 0.1, pos: [0, 0.02, 0], size: 4.5, flat: true, blend: 'normal', opacity: 0.9 }],   // cracks sheet left only thin lines
  ['fc-cracks', 'glow', 'cells', 0.5, 'embers still glowing in the scorch, cooling', { t: PAYOFF + 0.15, life: 3.2, pos: [0, 0.03, 0], size: 4.5, flat: true }],
]
const objs = {}, tracks = {}, uploads = {}, causes = []
const k3 = (t, v, e = 'auto') => [+t.toFixed(3), v, e]
FB.forEach(([sheet, ramp, tex, amt, cause, e], i) => {
  const tid = `fb-${sheet.slice(3)}-${ramp}-${tex}`, file = join(FX, tid + '.webp')
  if (!uploads[tid]) {
    if (!existsSync(file)) {
      const png = join(FX, tid + '.png')
      execFileSync('python3', [PAINT, join(RAW, sheet + '.png'), png, '--ramp', RAMP[ramp], '--tex', tex, '--tex-amt', String(amt), '--grid', '4', '--seed', String(i + 1)])
      execFileSync('python3', ['-I', '-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],"WEBP",quality=88)', png, file])
    }
    uploads[tid] = resolve(file)
  }
  const id = 'fx' + i
  objs[id] = { type: 'flipbook', name: `FX ${sheet.slice(3)} ${ramp} ${e.t}`, tex: tid, grid: 4, frames: 16, parent: null, pos: e.pos, rot: [0, 0, 0],
    size: e.size, start: e.t, life: e.life, loop: false, dur: e.life, fps: +(16 / e.life).toFixed(2), blend: e.blend || 'add', flat: !!e.flat }
  if (e.opacity != null) objs[id].opacity = e.opacity
  const tr = {}
  if (e.move) tr.pos = [k3(e.t, e.pos, 'linear'), ...e.move.map(([dt, p]) => k3(e.t + dt, p, dt < 1.5 ? 'in' : 'out'))]
  if (e.cut) tr.scale = [k3(e.t, [1, 1, 1], 'step'), k3(e.t + e.cut, [0, 0, 0], 'step')]   // trail ends at impact
  if (Object.keys(tr).length) tracks[id] = tr
  causes.push(`${id} ${sheet}/${ramp} ${e.t}s: ${cause}`)
})

// hero mesh: flies SKY -> impact, spinning, then gone in the burst
execFileSync('python3', [join(import.meta.dirname, 'models.py'), ST], { stdio: 'inherit' })
const M = JSON.parse(readFileSync(join(ST, 'models.json'), 'utf8'))
const dir = [7, -4.5, 2], yaw = Math.atan2(dir[0], dir[2]) * 180 / Math.PI, pitch = -Math.atan2(dir[1], Math.hypot(dir[0], dir[2])) * 180 / Math.PI
objs.fireball = { type: 'group', name: 'Fireball', parent: null, pos: SKY, rot: [pitch, yaw, 0], scale: [1, 1, 1] }   // flame tongue (-z) trails the motion
tracks.fireball = { pos: [k3(0, SKY, 'linear'), k3(PAYOFF, [0, 0.5, 0], 'in')], rot: [k3(0, [pitch, yaw, 0], 'linear'), k3(PAYOFF, [pitch, yaw, 300])],
  scale: [k3(0, [0.6, 0.6, 0.6], 'smooth'), k3(PAYOFF - 0.05, [1.15, 1.15, 1.15], 'step'), k3(PAYOFF + 0.06, [0.001, 0.001, 0.001])],
  visible: [[0, true, 'step'], [PAYOFF + 0.06, false, 'step']] }
Object.assign(objs, M.objects)

// close and moving: track the fireball in, settle on the impact, slow drift while the scorch cools
const camera = { pos: [3.8, 2.2, 5.6], target: [0, 0.8, 0], fov: 45 }
const camera_keys = { pos: [k3(0, [1.5, 4.5, 6.5], 'smooth'), k3(PAYOFF, [3.4, 2.0, 5.0], 'out'), k3(LEN, [4.4, 2.8, 4.6])],
  target: [k3(0, [-5, 3.8, -1.5], 'smooth'), k3(PAYOFF - 0.2, [-0.5, 0.8, 0], 'smooth'), k3(PAYOFF + 1, [0, 0.9, 0], 'smooth'), k3(LEN, [0, 0.4, 0])],
  fov: [k3(0, 48), k3(PAYOFF, 44, 'smooth'), k3(LEN, 46)] }
let clip = { name: NAME, len: LEN, fps: 60, loop: false, tracks, camera: camera_keys }
clip = cinePass(clip, { payoff: PAYOFF, kind: 'impact', tint: '#ffb13a', push: 0.2 }, camera)
clip.camera = { ...clip.camera, pos: camera_keys.pos, target: camera_keys.target, fov: camera_keys.fov }   // keep cinePass shake/flash only
const lit = cineLights(objs, clip, { tint: '#ffb13a', impacts: [{ t: PAYOFF, at: [0, 0.6, 0], color: '#ff9a2a' }],
  rims: [{ pos: [-3, 4, 3], color: '#ff7a12', base: 0.5 }] })
const now = new Date().toISOString().slice(0, 19) + 'Z'
const doc = { v: 1, name: NAME, objects: lit.objects, textures: M.textures, updated: now, camera, anims: { fire: lit.clip }, env: { bg: '#07060a', fog: null, grid: false, light: 'night' } }
writeFileSync(join(ST, 'project.json'), JSON.stringify(doc))
writeFileSync(join(ST, 'meta.json'), JSON.stringify({ name: NAME, updated: now, count: Object.keys(doc.objects).length, ai: true }))
writeFileSync(join(ST, 'uploads.json'), JSON.stringify(uploads, null, 1))
writeFileSync(join(ST, 'causes.txt'), causes.join('\n') + '\n')
const fb = Object.values(doc.objects).filter(o => o.type === 'flipbook').length
console.log(`${NAME}: ${Object.keys(doc.objects).length} objects, ${fb} flipbooks, ${Object.keys(uploads).length} sheets, payoff ${PAYOFF} s, len ${LEN} s`)
