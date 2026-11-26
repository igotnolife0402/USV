// Crossing, stages 4-6 (2026-11-24): turns build.py's tabs into the camera, lighting and VFX stages.
//   s4 camera   = s3 motion + authored shots (cuts are two keys at one time) + anim.cine on the payoff (push-in, slow-mo, dip
//                 and flash) with the impact frames of s3 kept, and NO grade, so the stage shows only what the camera adds.
//   s5 lighting = s4 + the cine grade (build darken, vignette, gold payoff wash), a tint bump per clash, a point light at every
//                 impact, a rim light per fighter in its colour, and a darker set.
//   s6 vfx      = s5 lighting on build.py's s6pre (same motion + the fresh flipbook cards).
//   PLUGINS=<studio plugins dir> node finish.mjs WORK
import { readFileSync, writeFileSync, mkdirSync, existsSync, symlinkSync, rmSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
const PLUGINS = process.env.PLUGINS
if (!PLUGINS) { console.error('set PLUGINS to the studio plugins dir (cine.js, sample.js)'); process.exit(1) }
const { cinePass, cineLights } = await import(join(resolve(PLUGINS), 'cine.js'))
const WORK = resolve(process.argv[2] || '.')
const beats = JSON.parse(readFileSync(join(WORK, 'beats.json'))), PAY = beats.payoff, CL = beats.clashes, LEN = beats.len
const TINT = '#ffd27a', ENTER = 'cubic:0.3,0.4,0.6,1'
const clone = x => JSON.parse(JSON.stringify(x))

// Shots: each enters already moving and settles (ENTER); a cut = the last key of a shot and the first of the next at one time.
const SHOTS = [
  [0, 1.3, [0, 3.6, 15], [0, 3.3, 12.5], [-0.5, 2.8, 0], [-0.5, 2.9, 0], 40],              // wide: the stand-off, a slow dolly in
  [1.3, 2.05, [-3.5, 1.6, 6.5], [-0.8, 2.0, 6.0], [-1.8, 3.0, 0], [-0.2, 3.5, 0], 38],      // low tracking with Kaito's dash into clash 1
  [2.05, 2.95, [-6.5, 6.5, 7.5], [-6.0, 6.0, 7.2], [-0.8, 2.2, -0.4], [-1.2, 1.6, -0.3], 40], // high three-quarter: the ground smash
  [2.95, 3.6, [5.6, 4.4, 2.6], [5.1, 4.2, 3.1], [-1.0, 3.4, -0.5], [-0.6, 3.6, -0.4], 38],  // over Ren's shoulder: clash 3
  [3.6, LEN, [0.2, 3.6, 11], [0.0, 3.4, 10.5], [-0.3, 3.0, -0.3], [-0.2, 3.1, -0.3], 40],   // wide side: the spin and the charge (cine's wide)
]
function shots(cam) {
  const pos = [], target = [], fov = []
  for (const [t0, t1, p0, p1, q0, q1, f] of SHOTS) {
    pos.push([t0, p0, ENTER], [t1, p1, 'linear']); target.push([t0, q0, ENTER], [t1, q1, 'linear']); fov.push([t0, [f], 'linear'], [t1, [f], 'linear'])
  }
  return { ...cam, pos, target, fov }
}

function stage(src, { light }) {
  const p = JSON.parse(readFileSync(join(WORK, src, 'project.json'))), c = p.anims.fight
  const s3cam = JSON.parse(readFileSync(join(WORK, 's3', 'project.json'))).anims.fight.camera, story = { ...c, camera: shots(c.camera) }
  delete story.warp; story.len = LEN
  const n = cinePass(story, { payoff: PAY, kind: 'impact', push: 0.35, tint: TINT }, {})
  // impact frames of s3 on every clash before the payoff (the payoff's own slow-mo comes from the cine pass)
  const FREEZE = 0.12, SLOW = 0.15, out = [[0, 0]]
  let off = 0
  for (const t of [...CL].sort((a, b) => a - b)) {
    out.push([+(t + off).toFixed(4), t]); off += FREEZE; out.push([+(t + off).toFixed(4), t])
    off += SLOW; out.push([+(t + SLOW + off).toFixed(4), +(t + SLOW).toFixed(4)])
  }
  for (const k of (n.warp || [[0, 0], [LEN, LEN]]).slice(1)) out.push([+(k[0] + off).toFixed(4), k[1]])
  n.warp = out; n.len = +(out.at(-1)[0]).toFixed(4); n.cine = { ...(n.cine || {}), hitstops: CL }
  // s3's clash pops and shake kicks stay; the cine pass owns the payoff's flash and shake
  const before = ks => (ks || []).filter(k => k[0] < PAY - 0.05)
  n.camera.flash = [...before(s3cam.flash), ...(n.camera.flash || []).filter(k => k[0] >= PAY - 1.6)].sort((a, b) => a[0] - b[0])
  n.camera.shake = [...before(s3cam.shake), ...(n.camera.shake || []).filter(k => k[0] >= PAY - 1.6)].sort((a, b) => a[0] - b[0])
  if (!light) { delete n.camera.grade; delete n.camera.gradeTint }
  else {
    const bumps = CL.flatMap(t => [[+(t - 1e-3).toFixed(4), [0, 0, 0], 'linear'], [t, [0, 0.2, 0.12], 'out'], [+(t + 0.15).toFixed(4), [0, 0, 0], 'linear']])
    n.camera.grade = [...bumps, ...(n.camera.grade || [])].sort((a, b) => a[0] - b[0]); n.camera.gradeTint = TINT
    const at = t => beats.contacts[Object.keys(beats.times).find(k => Math.abs(beats.times[k] - t) < 1e-3)]
    const impacts = [...CL.map(t => ({ t, at: at(t) })), { t: PAY, at: at(PAY), payoff: true, size: 1.2 }].filter(i => i.at)
    const L = cineLights(p.objects, n, { impacts, tint: TINT, rims: [{ parent: 'a_A0', pos: [3, 4.5, 0], color: '#49c6ff' }, { parent: 'b_A0', pos: [-3, 4.5, 0], color: '#ff4f6a' }] })
    p.objects = L.objects; Object.assign(n, L.clip); p.env = { ...p.env, bg: '#121620' }
  }
  p.anims.fight = n; return { p, n }
}

for (const [name, src, light] of [['s4', 's2', false], ['s5', 's2', true], ['s6', 's6pre', true]]) {
  const { p, n } = stage(src, { light }), out = join(WORK, name)
  p.name = `Crossing ${name}`; mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'project.json'), JSON.stringify(p))
  writeFileSync(join(out, 'meta.json'), JSON.stringify({ name: p.name, updated: '2026-11-24T00:00:00Z', count: Object.keys(p.objects).length, ai: true }))
  writeFileSync(join(out, 'uploads.json'), readFileSync(join(WORK, src, 'uploads.json')))
  rmSync(join(out, 'geo'), { force: true, recursive: true }); symlinkSync(realpathSync(join(WORK, src, 'geo')), join(out, 'geo'))
  console.log(name, JSON.stringify({ len: n.len, warp: n.warp.length, grade: (n.camera.grade || []).length, lights: n.cine?.lights, objects: Object.keys(p.objects).length }))
}
