import { fileURLToPath } from 'node:url'
// Renders shop/out/project.json with the real Interface renderer (Studio's plugins/ui.js, path in STUDIO_UI) in headless Chromium,
// using a stub Studio app, and saves one screenshot per device. three.js is stubbed: the UI view never draws 3D.
// It also checks the owner's no-overlap rule on the rendered page: every element (outline and lip included) must sit
// inside its parent and clear of its siblings, and no text may wrap or clip. Exit code 1 on any problem.
// Usage: node shop/preview.mjs [outDir] [--play]
import { createServer } from 'node:http'
import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const root = fileURLToPath(new URL('./', import.meta.url))       // this tool's folder
const outDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : root + 'out/shots'
const play = process.argv.includes('--play')
mkdirSync(outDir, { recursive: true })

const files = {
  '/plugins/ui.js': () => readFileSync(process.env.STUDIO_UI || (() => { throw new Error('set STUDIO_UI to the Studio interface plugin (plugins/ui.js)') })()),
  '/core/ui.js': () => 'export const addIcons = () => {}; export const icon = () => ""',
  '/three.js': () => 'export class Group { constructor() { this.userData = {} } }',
  '/project.json': () => readFileSync(root + 'out/project.json'),
  '/': () => `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#7ec8ff}#vp{position:absolute;inset:0}[hidden]{display:none!important}</style>
<script type="importmap">{"imports":{"three":"/three.js"}}</script><div id="vp"></div>
<script type="module">
import plugin from '/plugins/ui.js'
const proj = await (await fetch('/project.json')).json(), O = proj.objects, ls = {}
const app = { mode: 'ui', prefs: { uiDevice: new URLSearchParams(location.search).get('d'), ui3d: true }, selection: [],
  setPref() {}, on(ev, fn) { (ls[ev] ||= []).push(fn) }, obj: id => O[id], ids: () => Object.keys(O),
  children: p => Object.keys(O).filter(id => (O[id].parent ?? null) === p).sort((a, b) => (O[a].order || 0) - (O[b].order || 0)),
  ui: { viewportEl: () => document.getElementById('vp') }, tex: { get: id => fetch('/tex/' + id + '.json').then(r => r.ok ? r.json() : null) }, select() {}, set() {}, begin() {}, end() {}, transact: (_, f) => f() }
plugin.init(app)
${play ? 'app.uiEditor.togglePlay(true)' : ''}
window.O = O; window.ready = true
</script>`
}
const server = createServer((q, r) => {
  const path = q.url.split('?')[0], tex = path.match(/^\/tex\/([\w-]+\.json)$/)
  const f = files[path] || (tex && existsSync(root + 'out/tex/' + tex[1]) ? () => readFileSync(root + 'out/tex/' + tex[1]) : null)
  if (!f) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': path.endsWith('.js') ? 'text/javascript' : path.endsWith('.json') ? 'application/json' : 'text/html' }); r.end(f())
}).listen(0)
const port = server.address().port


// Overlap check, run in the page. Rects come from the layout (left/top/width/height, before effect transforms),
// grown by the outline and the hard lip, then rotated by the element's own rotation.
function checkPage() {
  const LAYERS = new Set(['Rays', 'Highlight', 'Bubbles', 'Glow', 'Dim', 'Strike', 'Skin'])   // 'Rays' includes the burst image   // background layers (and the was-price strike line) share their parent's box
  const O = window.O, out = [], TOL = 0.5
  const box = el => {
    const o = O[el.dataset.id], t = o.stroke && o.stroke.t > 0 ? o.stroke.t : 0, sh = o.shadow && !o.shadow.b && o.shadow.a > 0 ? o.shadow : null
    let x0 = el.offsetLeft - t, y0 = el.offsetTop - t, x1 = el.offsetLeft + el.offsetWidth + t, y1 = el.offsetTop + el.offsetHeight + t
    if (sh) { x0 = Math.min(x0, x0 + (sh.x || 0)); x1 = Math.max(x1, x1 + (sh.x || 0)); y1 = Math.max(y1, y1 + (sh.y || 0)) }
    const r = (o.r || 0) * Math.PI / 180
    if (r) { const cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)), hw = (x1 - x0) / 2, hh = (y1 - y0) / 2
      const W = hw * c + hh * s, H = hw * s + hh * c; x0 = cx - W; x1 = cx + W; y0 = cy - H; y1 = cy + H }
    return { x0, y0, x1, y1, o }
  }
  const label = el => { const o = O[el.dataset.id]; let n = o.name, p = O[o.parent]; if (p) n = p.name + ' > ' + n; return n }
  for (const el of document.querySelectorAll('.gx')) {
    const o = O[el.dataset.id]; if (!o || o.kind === 'screen') continue
    const par = el.parentElement.closest('.gx'), po = par && O[par.dataset.id]
    const b = box(el)
    if (par && po.kind !== 'screen' && (b.x0 < -TOL || b.y0 < -TOL || b.x1 > par.offsetWidth + TOL || b.y1 > par.offsetHeight + TOL))
      out.push(`outside parent: ${label(el)} [${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}] in ${par.offsetWidth}x${par.offsetHeight}`)
    if (o.kind === 'text' || o.kind === 'button') {
      const t = el.querySelector(':scope > .gx-t')
      if (t && !t.hidden && t.textContent && (t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1)) out.push(`text does not fit: ${label(el)} "${t.textContent}"`)
    }
  }
  const groups = new Map()
  for (const el of document.querySelectorAll('.gx')) { const o = O[el.dataset.id]; if (!o || LAYERS.has(o.name) || o.kind === 'screen') continue; const k = o.parent; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(el) }
  for (const els of groups.values()) for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = box(els[i]), b = box(els[j])
    if (a.x0 < b.x1 - TOL && b.x0 < a.x1 - TOL && a.y0 < b.y1 - TOL && b.y0 < a.y1 - TOL) out.push(`overlap: ${label(els[i])}  <->  ${label(els[j])}`)
  }
  return out
}
const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined, args: ['--ignore-certificate-errors'] })
const errors = [], problems = []
for (const [d, w, h] of [['phone', 844, 390], ['pc', 1920, 1080], ['tablet', 1180, 820]]) {
  // viewport = device + the 38 px toolbar + 24 px margin, so the device renders at scale 1
  const page = await browser.newPage({ viewport: { width: w + 24, height: h + 62 }, deviceScaleFactor: 1 })
  page.on('console', m => m.type() === 'error' && errors.push(`${d}: ${m.text()}`)); page.on('pageerror', e => errors.push(`${d}: ${e.message}`))
  await page.goto(`http://127.0.0.1:${port}/?d=${d}`)
  await page.waitForFunction(() => window.ready); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(play ? 1800 : 1200)
  await page.locator('.uix-dev').screenshot({ path: `${outDir}/${d}.png` })
  if (d === 'phone') problems.push(...await page.evaluate(`(${checkPage})()`))
  await page.close()
}
await browser.close(); server.close()
console.log(errors.length ? 'console errors:\n' + errors.join('\n') : 'no console errors', '\nshots in', outDir)
console.log(problems.length ? `LAYOUT FAIL (${problems.length}):\n` + problems.join('\n') : 'layout check passed: no overlaps, nothing outside its parent, all text fits')
if (problems.length || errors.length) process.exitCode = 1
