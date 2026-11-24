// VFX showcase clip (owner 2026-11-24: "a cool animation using 20 of the new vfx"): a floating crystal caster charges, casts,
// fires a barrage and releases one payoff burst, then settles. One flipbook per sheet from vfx/sheets (the newest set), each
// pre-painted with tools/vfx/paint.py (Studio flipbooks have no tint). Camera: a slow orbit; anim.cine adds the payoff
// push-in, warp, flash and shake; cineLights adds a light per impact.
//   PLUGINS=<editor plugins dir> node tools/vfx/showcase/build.mjs SPEC.json FXDIR OUT
// FXDIR holds the painted <slug>.png; OUT gets studio/{project,meta,uploads}.json + geo/ (shots.mjs and ArtifactData read them).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
// The editor's plugins dir comes from the env (tools never import each other)
if (!process.env.PLUGINS) { console.error('set PLUGINS to the editor plugins dir (cine.js)'); process.exit(1) }
const { cinePass, cineLights } = await import(join(resolve(process.env.PLUGINS), 'cine.js'))

const [SPEC, FX, OUT] = process.argv.slice(2)
if (!SPEC || !FX || !OUT) { console.error('usage: node build.mjs SPEC.json FXDIR OUT'); process.exit(1) }
const S = JSON.parse(readFileSync(SPEC)), LEN = S.len, ST = join(OUT, 'studio')
mkdirSync(join(ST, 'geo'), { recursive: true })
const idx = Object.fromEntries(readFileSync('vfx/index.tsv', 'utf8').trim().split('\n').slice(1).map(l => l.split('\t')).map(r => [r[0], { grid: +r[3], frames: +r[4] }]))

const objs = {}, tracks = {}, uploads = {}, bad = []
for (const [k, o] of Object.entries(S.parts)) objs[k] = { type: 'part', material: 'SmoothPlastic', parent: null, rot: [0, 0, 0], ...o }
for (const [k, tr] of Object.entries(S.tracks)) tracks[k] = tr
S.fx.forEach((e, i) => {
  const m = idx[e.slug]; if (!m) return bad.push('no sheet ' + e.slug)
  const png = join(FX, e.slug + '.png'); if (!existsSync(png)) return bad.push('not painted ' + e.slug)
  const tid = 'fx-' + e.slug, loop = 'dur' in e, life = e.life ?? 0.6, dur = loop ? e.dur : life
  uploads[tid] = resolve(png)
  const o = { type: 'flipbook', name: `FX ${e.slug} ${e.t}`, tex: tid, grid: m.grid, frames: m.frames, parent: e.parent || null, pos: e.pos,
    rot: e.rot || [0, 0, 0], size: e.size, start: e.t, life, loop, dur, fps: loop ? (e.fps || 12) : +(m.frames / life).toFixed(2), blend: 'add', flat: !!e.flat }
  if (e.shape === 'beam') Object.assign(o, { shape: 'beam', length: e.length, speed: e.speed ?? 18 })
  if (e.opacity != null) o.opacity = e.opacity
  if (e.t < 0 || e.t + dur > LEN + 1e-6) bad.push(`${e.slug} ${e.t}+${dur} leaves 0-${LEN}`)
  const id = 'fx' + String(i).padStart(2, '0'); objs[id] = o
  if (e.grow) tracks[id] = { scale: e.grow.map(([t, s, ez]) => [t, [s, s, s], ez || 'auto']) }
})
if (bad.length) { console.error('Failed: ' + bad.join('; ')); process.exit(1) }

let clip = { name: S.name, len: LEN, fps: 60, loop: false, tracks, camera: S.camera_keys }
clip = cinePass(clip, { payoff: S.payoff, kind: S.cine_kind || 'burst', tint: S.tint, push: S.push ?? 0.2 }, { pos: S.camera.pos, target: S.camera.target, fov: S.camera.fov })
const lit = cineLights(objs, clip, { tint: S.tint, impacts: S.impacts, rims: S.rims })
const now = new Date().toISOString().slice(0, 19) + 'Z'
const doc = { v: 1, name: S.name, objects: lit.objects, textures: {}, updated: now, camera: S.camera, anims: { show: lit.clip }, env: S.env }
writeFileSync(join(ST, 'project.json'), JSON.stringify(doc))
writeFileSync(join(ST, 'meta.json'), JSON.stringify({ name: S.name, updated: now, count: Object.keys(doc.objects).length, ai: true }))
writeFileSync(join(ST, 'uploads.json'), JSON.stringify(uploads, null, 1))
const n = Object.values(doc.objects).filter(o => o.type === 'flipbook').length, sheets = new Set(Object.values(doc.objects).filter(o => o.tex).map(o => o.tex)).size
console.log(`${S.name}: ${Object.keys(doc.objects).length} objects, ${n} flipbooks, ${sheets} distinct sheets, payoff ${S.payoff} s, len ${LEN} s`)
