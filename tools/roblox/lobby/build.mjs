// Assembles the lobby and writes lobby/out/studio-lobby.json (project doc) and lobby/out/meta.json (list entry).
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createScene } from './lib/scene.mjs'
import { PROJECT_NAME } from './lib/layout.mjs'
import { buildSpawn } from './zones/spawn.mjs'
import { buildMeadow } from './zones/meadow.mjs'
import { buildCentrepiece } from './zones/centrepiece.mjs'
import { environment, camera } from './zones/lighting.mjs'

let SCENE = null
export function buildProject(updated = new Date().toISOString(), withScene = false) {
  const s = createScene()
  buildSpawn(s)
  buildMeadow(s)
  buildCentrepiece(s)
  SCENE = s
  const project = { name: PROJECT_NAME, v: 1, updated, objects: s.objects, anims: s.anims, textures: {}, env: environment(), camera: camera() }
  return withScene ? { project, scene: s } : project
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const p = buildProject()
  const out = new URL('./out/', import.meta.url)
  mkdirSync(out, { recursive: true })
  writeFileSync(new URL('studio-lobby.json', out), JSON.stringify(p))
  writeFileSync(new URL('geos.json', out), JSON.stringify(SCENE.geos))
  writeFileSync(new URL('meta.json', out), JSON.stringify({ name: p.name, updated: p.updated, count: Object.keys(p.objects).length, ai: true }))
  console.log(`built ${Object.keys(p.objects).length} objects`)
}
