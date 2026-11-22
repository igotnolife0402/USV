// Compares metrics from tools/roblox/detail.luau (Studio) to tools/3d/detail/floor.json. Node 20+, no deps.
// Usage: node tools/roblox/detail-check.mjs <metrics.json | -> [--class prop|hero|scene]   (default hero; - = stdin)
// Exit 0 pass, 1 fail, 2 bad input.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const bad = m => { console.error(m); process.exit(2) }
const args = process.argv.slice(2)
let cls = 'hero'
const ci = args.indexOf('--class')
if (ci >= 0) { cls = args[ci + 1]; args.splice(ci, 2) }
const src = args[0]
if (!src) bad('usage: detail-check.mjs <metrics.json | -> [--class prop|hero|scene]')

let floor, m
try { floor = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../3d/detail/floor.json'), 'utf8')) }
catch (e) { bad('cannot read floor.json: ' + e.message) }
const f = floor.classes?.[cls]
if (!f) bad(`unknown class ${cls}`)
try { m = JSON.parse(readFileSync(src === '-' ? 0 : src, 'utf8')) } catch (e) { bad('bad metrics JSON: ' + e.message) }
if (typeof m === 'string') try { m = JSON.parse(m) } catch { bad('bad metrics JSON string') }
for (const k of ['parts', 'meshes', 'glow', 'textured', 'colors', 'surfaces', 'sameSizeMax'])
  if (typeof m?.[k] !== 'number') bad(`metrics.${k} missing or not a number`)

const r = x => Math.round(x * 1000) / 1000
const p = m.parts
const nonGlow = p - m.glow
const rows = [
  ['parts', p, f.min_parts, p >= f.min_parts, '>='],
  ['mesh_ratio', r(p ? m.meshes / p : 0), f.min_mesh_ratio, (p ? m.meshes / p : 0) >= f.min_mesh_ratio, '>='],
  ['textured_ratio', r(nonGlow > 0 ? m.textured / nonGlow : 0), f.min_textured_ratio, (nonGlow > 0 ? m.textured / nonGlow : 0) >= f.min_textured_ratio, '>='],
  ['colors', m.colors, f.min_colors, m.colors >= f.min_colors, '>='],
  ['surfaces', m.surfaces, f.min_surfaces, m.surfaces >= f.min_surfaces, '>='],
]
if (m.tris == null) console.log('SKIP tris (unreadable)')
else {
  rows.push(['tris', m.tris, f.min_tris, m.tris >= f.min_tris, '>='])
  if (m.maxMeshTris != null) rows.push(['max_tris_per_mesh', m.maxMeshTris, floor.max_tris_per_mesh, m.maxMeshTris <= floor.max_tris_per_mesh, '<='])
}
const ssr = p ? m.sameSizeMax / p : 1
rows.push(['same_size_ratio', r(ssr), f.max_same_size_ratio, ssr <= f.max_same_size_ratio, '<='])

const fails = []
for (const [n, v, need, ok, op] of rows) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${v} (need ${op} ${need})`)
  if (!ok) fails.push(n)
}
console.log(fails.length ? `DETAIL FAIL: ${fails.join(', ')}` : 'DETAIL PASS')
process.exit(fails.length ? 1 : 0)
