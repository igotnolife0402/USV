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
const { cinePass } = await import(join(resolve(PLUGINS), 'cine.js'))
const { sample } = await import(join(resolve(PLUGINS), 'sample.js'))

const [IN, OUT, PAY, CL, PUSH] = process.argv.slice(2)
if (!IN || !OUT || !PAY) { console.error('usage: node cine_duel.mjs IN_STUDIO OUT_STUDIO PAYOFF [CLASHES]'); process.exit(1) }
const p = JSON.parse(readFileSync(join(IN, 'project.json'))), name = Object.keys(p.anims)[0], c = p.anims[name]
const payoff = +PAY, clashes = (CL || '').split(',').filter(Boolean).map(Number).filter(t => t < payoff)
const fps = +c.fps || 60, orig = JSON.parse(JSON.stringify(c.camera))

// 1. The cine pass on the final blow. The clip's own camera already frames the build shot, so it is the wide shot.
const n = cinePass(c, { payoff, kind: 'impact', push: PUSH ?? 0.2 }, {})
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
// 4. Hit-stop on every clash: 3 frozen frames (story time stands still) inside the clip's warp, before the cine slow-down.
const H = 3 / fps, w = n.warp, a = w.find(k => k[1] > 0 && k[1] < payoff && k[0] !== k[1]) || w[1]
const out = [[0, 0]]
let off = 0
for (const t of clashes.sort((x, y) => x - y)) { out.push([+(t + off).toFixed(4), t]); off += H; out.push([+(t + off).toFixed(4), t]) }
for (const k of w.slice(1)) out.push([+(k[0] + off).toFixed(4), k[1]])
n.warp = out; n.len = +(n.len + off).toFixed(4); n.cine.hitstops = clashes
p.anims[name] = n

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'project.json'), JSON.stringify(p))
for (const f of ['meta.json', 'uploads.json']) writeFileSync(join(OUT, f), readFileSync(join(IN, f)))
for (const d of ['geo', 'tex']) if (existsSync(join(IN, d))) { rmSync(join(OUT, d), { force: true, recursive: true }); symlinkSync(resolve(IN, d), join(OUT, d)) }
console.log(JSON.stringify({ len: n.len, story: c.len, payoff, hold: th, hitstops: clashes.length, warp: n.warp.length }))
