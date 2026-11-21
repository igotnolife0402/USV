import { fileURLToPath } from 'node:url'
// Live-build plan: the exact db batches to send, in order (lobby/out/live/plan.json + the files it points at).
// Batch 0 resets the project doc to every stage before `--from` (a full `set`); then each later stage goes out as
// batches of geo docs (each batch body < 750 KB, the db takes 1 MiB) with the stage's objects in the stage's last batch.
// Usage: node lobby/live.mjs [--from "Stage name"]
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { buildProject } from './build.mjs'
import { PROJECT_ID } from './lib/layout.mjs'

const fromArg = process.argv.indexOf('--from'), from = fromArg > 0 ? process.argv[fromArg + 1] : null
const { project, scene } = buildProject(undefined, true)
const dir = new URL('./out/live/', import.meta.url), path = name => fileURLToPath(new URL(name, dir))
rmSync(dir, { recursive: true, force: true }); mkdirSync(new URL('geo/', dir), { recursive: true })

const start = from ? scene.stages.indexOf(from) : 0
if (start < 0) throw new Error(`no stage "${from}"; stages: ${scene.stages.join(', ')}`)
const idsOf = st => Object.keys(project.objects).filter(id => scene.stageOf[id] === st)
const before = scene.stages.slice(0, start).flatMap(idsOf)
const pick = ids => Object.fromEntries(ids.map(id => [id, project.objects[id]]))
const animIds = new Set(Object.values(project.anims).flatMap(c => Object.keys(c.tracks)))
const animsReady = ids => [...animIds].every(id => ids.includes(id))

const plan = []
let count = before.length
const projects = 'projects', geoCol = `projects/${PROJECT_ID}/geo`
writeFileSync(path('00-reset.json'), JSON.stringify({ ...project, objects: pick(before), anims: animsReady(before) ? project.anims : {} }))
plan.push({ label: 'reset to: ' + (scene.stages.slice(0, start).join(', ') || 'empty'), count, writes: [{ op: 'set', collection: projects, doc_id: PROJECT_ID, file_path: path('00-reset.json') }] })

const LIMIT = 750 * 1024
scene.stages.slice(start).forEach((st, k) => {
  const ids = idsOf(st), slug = String(k + 1).padStart(2, '0') + '-' + st.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const geoIds = ids.map(id => project.objects[id]).filter(o => o.type === 'mesh').map(o => o.geo)
  const batches = [[]]; let size = 0
  for (const gid of geoIds) {
    const body = JSON.stringify(scene.geos[gid]), b = Buffer.byteLength(body)
    if (size + b > LIMIT && batches.at(-1).length) { batches.push([]); size = 0 }
    writeFileSync(path(`geo/${gid}.json`), body)
    batches.at(-1).push({ op: 'set', collection: geoCol, doc_id: gid, file_path: path(`geo/${gid}.json`) }); size += b
  }
  count += ids.length
  const done = [...before, ...scene.stages.slice(start, start + k + 1).flatMap(idsOf)]
  const doc = { objects: pick(ids), ...(ids.some(id => animIds.has(id)) && animsReady(done) ? { anims: project.anims } : {}) }
  writeFileSync(path(slug + '.json'), JSON.stringify(doc))
  batches.at(-1).push({ op: 'update', collection: projects, doc_id: PROJECT_ID, file_path: path(slug + '.json') })
  batches.forEach((w, i) => plan.push({ label: st + (batches.length > 1 ? ` (${i + 1}/${batches.length})` : ''), count: i === batches.length - 1 ? count : null, writes: w }))
})
writeFileSync(path('plan.json'), JSON.stringify(plan, null, 1))
for (const [i, b] of plan.entries()) console.log(`${i}: ${b.label} — ${b.writes.length} writes${b.count != null ? `, total ${b.count} objects` : ''}`)
