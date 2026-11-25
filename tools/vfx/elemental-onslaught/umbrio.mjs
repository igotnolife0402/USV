// Elemental Onslaught v2 for Umbrio (owner 2026-11-25: "use my vfx pack"): every effect is a sheet from the owner's pack
// (vfx/sheets, white only) painted per element with tools/vfx/paint.py, placed in metres around the realistic sorcerer
// (the sorcerer generator output, origin, faces -Z, right hand at hand_r) and the hit zone at T.
//   PLUGINS=<dir with cine.js> node umbrio.mjs SPEC.json PACK SORC OUT
// PACK = folder holding vfx/index.tsv + vfx/sheets + tools/vfx/paint.py; SORC = sorcerer.py output dir; OUT gets
// studio/{project,meta,uploads}.json + fx/*.webp. Spec fx entry: {slug, ramp, t, life | dur(+fps), pos | at:'hand'|'T'
// (+off), size, flat, opacity, blend, beam:{length,speed}, rot, move:[[dt,[x,y,z]]...], grow:[[dt,s]...]} (dt = from t).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
if (!process.env.PLUGINS) { console.error('set PLUGINS to the dir holding cine.js'); process.exit(1) }
const { cinePass, cineLights } = await import(join(resolve(process.env.PLUGINS), 'cine.js'))
const [SPEC, PACK, SORC, OUT] = process.argv.slice(2)
if (!OUT) { console.error('usage: node umbrio.mjs SPEC.json PACK SORC OUT'); process.exit(1) }
const S = JSON.parse(readFileSync(SPEC)), LEN = S.len, ST = join(OUT, 'studio'), FX = join(OUT, 'fx')
mkdirSync(ST, { recursive: true }); mkdirSync(FX, { recursive: true })
const idx = Object.fromEntries(readFileSync(join(PACK, 'vfx/index.tsv'), 'utf8').trim().split('\n').slice(1).map(l => l.split('\t')).map(r => [r[0], { grid: +r[3], frames: +r[4] }]))
const add = (a, b = [0, 0, 0]) => a.map((v, i) => +(v + b[i]).toFixed(3))
const anchor = { hand: S.hand, T: S.T, caster: [0, 0, 0] }

const sorc = JSON.parse(readFileSync(join(SORC, 'live/p1.json')))
const objs = { ...sorc.objects }, tracks = {}, uploads = {}, bad = []
// parts may carry `tracks` ({pos, rot, scale, color, visible}: 3D bubbles, fireballs, rock spikes, books) that join the clip
for (const [k, { tracks: tr, ...o }] of Object.entries(S.parts || {})) {
  objs[k] = { type: 'part', material: 'SmoothPlastic', parent: null, rot: [0, 0, 0], ...o }
  if (tr) tracks[k] = tr
}
S.fx.forEach((e, i) => {
  const m = idx[e.slug]; if (!m) return bad.push('no sheet ' + e.slug)
  // per-layer paint: own ramp + texture (owner 2026-11-25: every white layer painted with gradients + textures, vibrant)
  const tex = e.tex || 'noise', amt = e.texAmt ?? 0.3
  const tid = `fx-${e.slug}-${e.ramp}${e.tex ? '-' + tex : ''}`, file = join(FX, tid + '.webp')
  if (!uploads[tid]) {
    if (!existsSync(file)) {
      const png = join(FX, tid + '.png')
      execFileSync('python3', [join(PACK, 'tools/vfx/paint.py'), join(PACK, 'vfx/sheets', e.slug + '.png'), png, '--ramp', S.ramps[e.ramp] || e.ramp,
        '--tex', tex, '--tex-amt', String(amt), '--grid', String(m.grid), '--seed', String(i + 1)])
      execFileSync('python3', ['-I', '-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],"WEBP",quality=86)', png, file])
    }
    uploads[tid] = resolve(file)
  }
  const loop = 'dur' in e, life = e.life ?? 0.6, dur = loop ? e.dur : life
  const pos = e.pos || add(anchor[e.at], e.off)
  const o = { type: 'flipbook', name: `FX ${e.ramp} ${e.slug.slice(4)} ${e.t}`, tex: tid, grid: m.grid, frames: m.frames, parent: null, pos,
    rot: e.rot || [0, 0, 0], size: e.size, start: e.t, life, loop, dur, fps: loop ? (e.fps || 12) : +(m.frames / life).toFixed(2),
    blend: e.blend || 'add', flat: !!e.flat }
  if (e.beam) Object.assign(o, { shape: 'beam', length: e.beam.length, speed: e.beam.speed ?? 24 })
  if (e.opacity != null) o.opacity = e.opacity
  if (e.t < 0 || e.t + dur > LEN + 1e-6) bad.push(`${e.slug} ${e.t}+${dur} leaves 0-${LEN}`)
  const id = 'fx' + String(i).padStart(2, '0'); objs[id] = o
  const tr = {}
  if (e.move) tr.pos = [[e.t, pos, 'linear'], ...e.move.map(([dt, p]) => [+(e.t + dt).toFixed(3), p, 'linear'])]
  if (e.grow) tr.scale = e.grow.map(([dt, s]) => [+(e.t + dt).toFixed(3), [s, s, s], 'auto'])
  if (Object.keys(tr).length) tracks[id] = tr
})
if (bad.length) { console.error('Failed: ' + bad.join('; ')); process.exit(1) }
let clip = { name: S.name, len: LEN, fps: 60, loop: false, tracks, camera: S.camera_keys }
clip = cinePass(clip, { payoff: S.payoff, kind: S.cine_kind || 'impact', tint: S.tint, push: S.push ?? 0.2 }, { pos: S.camera.pos, target: S.camera.target, fov: S.camera.fov })
const lit = cineLights(objs, clip, { tint: S.tint, impacts: S.impacts, rims: S.rims })
const now = new Date().toISOString().slice(0, 19) + 'Z'
const doc = { v: 1, name: S.name, objects: lit.objects, textures: sorc.textures || {}, updated: now, camera: S.camera, anims: { onslaught: lit.clip }, env: S.env }
writeFileSync(join(ST, 'project.json'), JSON.stringify(doc))
writeFileSync(join(ST, 'meta.json'), JSON.stringify({ name: S.name, updated: now, count: Object.keys(doc.objects).length, ai: true }))
writeFileSync(join(ST, 'uploads.json'), JSON.stringify(uploads, null, 1))
const fb = Object.values(doc.objects).filter(o => o.type === 'flipbook')
console.log(`${S.name}: ${Object.keys(doc.objects).length} objects, ${fb.length} flipbooks, ${Object.keys(uploads).length} sheets, payoff ${S.payoff} s, len ${LEN} s, ${Math.round(JSON.stringify(doc).length / 1024)} KB`)
