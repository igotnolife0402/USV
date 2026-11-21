// Live build: splits the project into one write per stage (lobby/out/stages/NN-name.json).
// Stage 0 is a full `set` of the project doc (replaces it); the rest are `update`s that merge their new objects in.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { buildProject } from './build.mjs'

const { project, scene } = buildProject(undefined, true)
const dir = new URL('./out/stages/', import.meta.url)
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })
// The db refuses one update that merges too many object fields (800 failed, 152 worked), so big stages go out
// in chunks of CHUNK objects: smaller live steps to watch, too.
const CHUNK = 150
const byStage = scene.stages.flatMap(name => {
  const ids = Object.keys(project.objects).filter(id => scene.stageOf[id] === name)
  const n = Math.ceil(ids.length / CHUNK)
  return Array.from({ length: Math.max(1, n) }, (_, k) => ({ name: n > 1 ? `${name} ${k + 1} of ${n}` : name, ids: ids.slice(k * CHUNK, (k + 1) * CHUNK) }))
})
const animIds = new Set(Object.values(project.anims).flatMap(c => Object.keys(c.tracks)))
let count = 0
byStage.forEach(({ name, ids }, i) => {
  const objects = Object.fromEntries(ids.map(id => [id, project.objects[id]]))
  count += ids.length
  // A clip goes out with the first stage whose objects it animates are all present.
  const anims = ids.some(id => animIds.has(id)) ? project.anims : undefined
  const doc = i === 0 ? { ...project, objects, anims: {} } : { objects, ...(anims && { anims }) }
  const slug = String(i).padStart(2, '0') + '-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  writeFileSync(new URL(slug + '.json', dir), JSON.stringify(doc))
  console.log(`${slug}  +${ids.length} objects (total ${count})${anims ? '  +anims' : ''}`)
})
