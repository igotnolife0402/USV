// Owner 2026-11-25: every VFX sheet lives in ONE place, the repo folder vfx/ (vfx/sheets/<slug>.png + vfx/index.tsv) on main.
// The Claude-Hub vfx generator cannot write git, so it saves each passing sheet to its hub db collection `vfxsheets` (the inbox).
// This tool moves the inbox into vfx/: it REDRAWS each record from its script + seed with the generator's own drawer
// (showcase/lib/ugen.js, deterministic), so no asset downloads are needed, then appends one index row per sheet.
//   1. ArtifactData list vfxsheets of the hub, out_dir SCRATCH/hubdb   (Claude, any session)
//   2. node tools/vfx/hub_import.mjs SCRATCH/hubdb/vfxsheets [vfx]      -> prints {"<doc id>": "<slug>"} for step 3
//   3. ArtifactData batch update each doc {repo: slug}; republish the hub with the new vfx/sheets files + vfx/index.tsv
// Rows below the quality floor (jump >= 3 or > 4 empty frames) are scrapped, never imported. Re-runs skip records already in the index.
import { readFileSync, readdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const JUMP_MAX = 3
const [inbox, out = 'vfx'] = process.argv.slice(2)
if (!inbox) { console.error('usage: node tools/vfx/hub_import.mjs <dir of vfxsheets record .json> [vfx dir]'); process.exit(2) }
const LIB = resolve(dirname(fileURLToPath(import.meta.url)), 'showcase/lib')
const idx = join(out, 'index.tsv'), rows = readFileSync(idx, 'utf8').trim().split('\n').slice(1).map(l => l.split('\t'))
const slugs = new Set(rows.map(r => r[0])), srcs = new Set(rows.map(r => r[6]))
const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'sheet'
const title = s => String(s).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase())

const recs = readdirSync(inbox).filter(f => f.endsWith('.json')).sort().map(f => {
  const j = JSON.parse(readFileSync(join(inbox, f), 'utf8')); return { doc: f.slice(0, -5), ...(j.data || j) }
})
const todo = [], scrapped = [], skipped = []
for (const r of recs) {
  if (!r.code || !r.key) skipped.push(r.doc)
  else if (!(r.jump < JUMP_MAX)) scrapped.push(`${r.doc} (${r.name}, jump ${r.jump})`)
  else if (srcs.has('hub/' + r.key) || r.repo) skipped.push(r.doc)
  else todo.push(r)
}
const map = {}, warn = []
if (todo.length) {
  const { chromium } = createRequire(import.meta.url)('playwright')
  const b = await chromium.launch(), p = await b.newPage()
  await p.route('http://lib.test/**', r => r.fulfill({ path: join(LIB, new URL(r.request().url()).pathname.slice(1)), contentType: 'text/javascript' }))
  await p.route('http://lib.test/', r => r.fulfill({ body: '<!doctype html>', contentType: 'text/html' }))
  await p.goto('http://lib.test/')
  for (const r of todo) {
    const got = await p.evaluate(async ({ code, seed }) => {
      const { makeSheet } = await import('http://lib.test/ugen.js'), s = await makeSheet(code, seed)
      const u8 = new Uint8Array(await s.blob.arrayBuffer()); let bin = ''; for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode(...u8.subarray(i, i + 32768))
      return { png: btoa(bin), jump: s.jump, empty: s.empty }
    }, { code: r.code, seed: r.seed ?? 1125 })
    if (!(got.jump < JUMP_MAX) || got.empty > 4) { scrapped.push(`${r.doc} (${r.name}, redraw jump ${got.jump}, empty ${got.empty})`); continue }
    if (Math.abs(got.jump - (r.jump ?? got.jump)) > 0.05) warn.push(`${r.doc}: redraw jump ${got.jump} vs saved ${r.jump}`)
    let slug = 'gen-' + slugify(r.name || r.sheet), k = 2
    while (slugs.has(slug)) slug = `gen-${slugify(r.name || r.sheet)}-${k++}`
    slugs.add(slug); srcs.add('hub/' + r.key); map[r.doc] = slug
    writeFileSync(join(out, 'sheets', slug + '.png'), Buffer.from(got.png, 'base64'))
    // library sheets are white, stored grey+alpha (LA) like the rest of vfx/sheets
    const png = join(out, 'sheets', slug + '.png'), py = spawnSync('python3', ['-c', 'import sys;from PIL import Image;a=Image.open(sys.argv[1]).convert("RGBA");Image.merge("LA",(Image.new("L",a.size,255),a.split()[3])).save(sys.argv[1],optimize=True)', png])
    if (py.status) warn.push(`${slug}: LA convert failed, kept RGBA`)
    appendFileSync(idx, `${slug}\t${title(r.name || r.sheet)}\taction\t4\t16\t${r.life ?? 0.9}\thub/${r.key}\n`)
  }
  await b.close()
}
console.error(JSON.stringify({ imported: Object.keys(map).length, scrapped, skipped: skipped.length, warn }))
console.log(JSON.stringify(map))
if (!existsSync(idx)) process.exit(1)
