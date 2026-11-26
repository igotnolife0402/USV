// Draw ugen sheet scripts headless (the hub generator's own drawer): node tools/vfx/showcase/gen/draw.mjs SCRIPT.js OUT.png [seed]
// Batch (one browser for all, ~20x faster than one call each): node .../draw.mjs --dir OUTDIR A.js B.js ...  -> OUTDIR/<name>.png
// prints {jump, empty}; floor = jump < 3, empty <= 4. Library copy: LA png in vfx/sheets + index row src gen/claude|<script>.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
const argv = process.argv.slice(2), batch = argv[0] === '--dir'
const jobs = batch ? argv.slice(2).map(f => [f, join(argv[1], f.split('/').pop().replace(/\.js$/, '.png')), '1125']) : [[argv[0], argv[1], argv[2] || '1125']], LIB = new URL('../lib', import.meta.url).pathname
const { chromium } = createRequire((process.env.NODE_TOOLS || '/opt/node-tools') + '/')('playwright')
const b = await chromium.launch(), p = await b.newPage()
await p.route('http://lib.test/**', r => r.fulfill({ path: join(LIB, new URL(r.request().url()).pathname.slice(1)), contentType: 'text/javascript' }))
await p.route('http://lib.test/', r => r.fulfill({ body: '<!doctype html>', contentType: 'text/html' }))
await p.goto('http://lib.test/')
for (const [codeF, out, seed] of jobs) {
const got = await p.evaluate(async ({ code, seed }) => {
  const { makeSheet } = await import('http://lib.test/ugen.js'), s = await makeSheet(code, seed)
  const u8 = new Uint8Array(await s.blob.arrayBuffer()); let bin = ''; for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode(...u8.subarray(i, i + 32768))
  return { png: btoa(bin), jump: s.jump, empty: s.empty }
}, { code: readFileSync(codeF, 'utf8'), seed: +seed })
writeFileSync(out, Buffer.from(got.png, 'base64'))
console.log(JSON.stringify(batch ? { file: codeF, jump: got.jump, empty: got.empty, ok: got.jump < 3 && got.empty <= 4 } : { jump: got.jump, empty: got.empty }))
}
await b.close()
