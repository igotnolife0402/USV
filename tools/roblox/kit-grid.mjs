// Lay out an Umbrio kit (one top-level group per model) in a grid and optionally merge several kit scenes.
// Usage: node tools/roblox/kit-grid.mjs out.json "Scene Name" kitA.json [kitB.json ...] [--gap 6]
// Ids get a per-file prefix (k0_, k1_ ...) so merged kits never collide; parents are remapped.
// Models are shifted on X/Z only (base stays y 0) so a read-back tab shows every model side by side.
// Roblox import re-centres pivots (bottom-centre) so grid positions never matter in game.
import { readFileSync, writeFileSync } from 'node:fs'
const args = process.argv.slice(2)
const gi = args.indexOf('--gap'); const gap = gi >= 0 ? +args.splice(gi, 2)[1] : 6
const [out, name, ...files] = args
if (!files.length) { console.log('usage: node kit-grid.mjs out.json "Name" kit.json [...] [--gap 6]'); process.exit(1) }
const objects = {}, tops = []
files.forEach((f, k) => {
  const s = JSON.parse(readFileSync(f, 'utf8'))
  for (const [id, o] of Object.entries(s.objects)) {
    if (!o) continue
    const c = { ...o }
    if (c.parent) c.parent = `k${k}_${c.parent}`
    objects[`k${k}_${id}`] = c
    if (!o.parent && o.type === 'group') tops.push(`k${k}_${id}`)
  }
})
const kids = {}
for (const [id, o] of Object.entries(objects)) if (o.parent) (kids[o.parent] ||= []).push(id)
const desc = id => (kids[id] || []).flatMap(c => [c, ...desc(c)])
const half = o => { const s = o.size || [1, 1, 1]; return o.rot && o.rot.some(v => v) ? Array(3).fill(Math.hypot(...s) / 2) : s.map(v => v / 2) }
const boxes = tops.map(t => {
  const ps = desc(t).map(id => objects[id]).filter(o => o.type === 'part')
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]
  for (const p of ps) { const h = half(p); for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p.pos[a] - h[a]); hi[a] = Math.max(hi[a], p.pos[a] + h[a]) } }
  return { t, ps, lo, hi, w: hi[0] - lo[0], d: hi[2] - lo[2] }
})
const cols = Math.ceil(Math.sqrt(boxes.length)); let x = 0, z = 0, rowD = 0
boxes.forEach((b, i) => {
  if (i && i % cols === 0) { x = 0; z += rowD + gap; rowD = 0 }
  const dx = x - b.lo[0], dz = z - b.lo[2]
  for (const p of b.ps) p.pos = [+(p.pos[0] + dx).toFixed(3), p.pos[1], +(p.pos[2] + dz).toFixed(3)]
  x += b.w + gap; rowD = Math.max(rowD, b.d)
})
writeFileSync(out, JSON.stringify({ name, v: 1, updated: new Date().toISOString(), objects, env: { bg: '#20232b', grid: true } }))
console.log(`${out}: ${tops.length} models, ${Object.keys(objects).length} objects, ${(JSON.stringify(objects).length / 1024).toFixed(0)} KB`)
