// Before/after fight preview for the cinematic baseline (2026-11-24): takes a built duel tab (OUT/studio) and writes a copy
// whose clip gets the baseline: anim.cine on the final blow, hit-stops on every clash, camera shots that enter moving.
//   PLUGINS=<editor plugins dir> node cine_duel.mjs IN_STUDIO OUT_STUDIO PAYOFF CLASHES [PUSH]   e.g. ... 13.8 3.6,5.4,5.85,6.3,7.0 0.2
// Geo, textures and uploads stay shared (symlinked dir entries are copied as paths, nothing re-generated).
import { readFileSync, writeFileSync, mkdirSync, existsSync, symlinkSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// The editor's plugins dir comes from the env (tools never import each other): PLUGINS=<repo>/tools/<editor>/plugins
const PLUGINS = process.env.PLUGINS
if (!PLUGINS) { console.error('set PLUGINS to the editor plugins dir (cine.js, sample.js)'); process.exit(1) }
const { cinePass, cineLights } = await import(join(resolve(PLUGINS), 'cine.js'))
const { sample } = await import(join(resolve(PLUGINS), 'sample.js'))

const [IN, OUT, PAY, CL, PUSH] = process.argv.slice(2)
if (!IN || !OUT || !PAY) { console.error('usage: node cine_duel.mjs IN_STUDIO OUT_STUDIO PAYOFF [CLASHES]'); process.exit(1) }
const p = JSON.parse(readFileSync(join(IN, 'project.json'))), name = Object.keys(p.anims)[0], c = p.anims[name]
const payoff = +PAY, clashes = (CL || '').split(',').filter(Boolean).map(Number).filter(t => t < payoff)
const fps = +c.fps || 60, orig = JSON.parse(JSON.stringify(c.camera))

// 1. The cine pass on the final blow. The clip's own camera already frames the build shot, so it is the wide shot.
const TINT = '#ffd27a'   // payoff blast colour (gold core of the final-blow sheets)
const n = cinePass(c, { payoff, kind: 'impact', push: PUSH ?? 0.2, tint: TINT }, {})
// The clip cuts to its own wide shot on the payoff, so the cut lands under the flash peak (cut on the flash) instead of a
// close-up hold: held close, the camera sat inside the blast sphere for 0.8 s of white with card edges (12 fps sheet, f-0192..0198).
const th = payoff
// 2. Keep the cine push-in and flash, then hard-cut back to the clip's own reveal (its wide pull-back and aerial
// were designed for the blast); a cut is intentional, so the cine reveal is not needed. The clip's bigger shake stays.
const ch = (keys, k) => [k[0], k[1], k[2]]
for (const chn of ['pos', 'target', 'fov']) {
  const pre = n.camera[chn].filter(k => k[0] <= th + 1e-4)
  const ov = chn === 'fov' ? orig.fov.map(k => [k[0], [k[1]], k[2]]) : orig[chn]
  let cut = sample(ov, th + 1e-3, 'pos'); if (chn === 'fov') cut = +cut[0].toFixed(3)
  const post = orig[chn].filter(k => k[0] > th + 1e-4)
  n.camera[chn] = [...pre, [th, cut, 'cubic:0.3,0.4,0.6,1'], ...post].map(k => ch(null, k))
}
n.camera.shake = orig.shake
// 3. Shots that enter moving: the original 'smooth' (in-out) keys brake to a stop at every cut; a shot now starts at speed and
// settles (camera-robotic lint). Keys inside the cine window keep their own eases.
const ENTER = 'cubic:0.3,0.4,0.6,1'
for (const chn of ['pos', 'target', 'fov']) n.camera[chn] = n.camera[chn].map(k => k[0] < payoff - 1.6 - 1e-4 || k[0] > th + 1e-4 ? [k[0], k[1], k[2] === 'smooth' ? ENTER : k[2]] : k)
// 4. Impact frames on every clash (owner 2026-11-24: "both replays are the same" - 3 frames at 60 fps = 0.05 s, invisible):
// freeze 0.12 s, then 0.5x for 0.15 story-s so the recoil reads; a small white pop scaled by the clash's own shake
// (small effects per step, the one big flash stays on the final blow).
const FREEZE = 0.12, SLOW = 0.15, w = n.warp
const out = [[0, 0]]
let off = 0
for (const t of clashes.sort((x, y) => x - y)) {
  out.push([+(t + off).toFixed(4), t]); off += FREEZE; out.push([+(t + off).toFixed(4), t])
  off += SLOW; out.push([+(t + SLOW + off).toFixed(4), +(t + SLOW).toFixed(4)])
}
const pops = clashes.flatMap(t => { const s = sample(orig.shake.map(k => [k[0], [k[1]], k[2]]), t + 1e-3, 'pos')[0] || 0.1
  return [[+(t - 1e-3).toFixed(4), 0, 'linear'], [t, +Math.min(0.35, 2 * s).toFixed(3), 'out'], [+(t + 0.14).toFixed(4), 0, 'linear']] })
n.camera.flash = [...pops, ...(n.camera.flash || [])].sort((x, y) => x[0] - y[0])
// 5. Lighting (owner 2026-11-24: "spacing vfx visuals lighting"): a vignette + light tint per clash (an exposure lift on top of the pop washed the frame milky) (the cine grade owns the
// build darken, vignette and the tinted payoff), a point light at every impact so the hit lights both fighters, and a rim
// light behind each fighter in its own colour that pulses on every hit. Impact points = the clash's own impact flipbook.
const fx = Object.values(p.objects).filter(o => o.type === 'flipbook')
const hitAt = t => (fx.find(o => /impact/.test(o.name) && Math.abs(o.start - t) < 0.06) || fx.find(o => /flash/.test(o.name) && Math.abs(o.start - t) < 0.1))?.pos
const bumps = clashes.flatMap(t => [[+(t - 1e-3).toFixed(4), [0, 0, 0], 'linear'], [t, [0, 0.2, 0.12], 'out'], [+(t + 0.15).toFixed(4), [0, 0, 0], 'linear']])
n.camera.grade = [...bumps, ...(n.camera.grade || [])].sort((x, y) => x[0] - y[0])
n.camera.gradeTint = TINT
const impacts = [...clashes.map(t => ({ t, at: hitAt(t) })), { t: payoff, at: hitAt(payoff) || [0, 4, -1], payoff: true, size: 1.2 }].filter(i => i.at)
const L = cineLights(p.objects, n, { impacts, tint: TINT, rims: [{ parent: 'a_A0', pos: [3, 4.5, 0], color: '#49c6ff' }, { parent: 'b_A0', pos: [-3, 4.5, 0], color: '#ff4f6a' }] })
p.objects = L.objects; Object.assign(n, L.clip)
for (const k of w.slice(1)) out.push([+(k[0] + off).toFixed(4), k[1]])
n.warp = out; n.len = +(n.len + off).toFixed(4); n.cine.hitstops = clashes
p.anims[name] = n

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'project.json'), JSON.stringify(p))
for (const f of ['meta.json', 'uploads.json']) writeFileSync(join(OUT, f), readFileSync(join(IN, f)))
for (const d of ['geo', 'tex']) if (existsSync(join(IN, d))) { rmSync(join(OUT, d), { force: true, recursive: true }); symlinkSync(resolve(IN, d), join(OUT, d)) }
console.log(JSON.stringify({ len: n.len, story: c.len, payoff, hold: th, hitstops: clashes.length, warp: n.warp.length, lights: n.cine.lights, impacts: impacts.length, grade: n.camera.grade.length }))
