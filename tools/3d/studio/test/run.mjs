// Test runner: node test/run.mjs [suite-name-filter] [--grep text]
// Serves the tool folder at https://studio.test/, maps the jsDelivr CDN to local node_modules (DEPS),
// injects the mock runtime, runs every test/*.mjs suite, prints PASS/FAIL lines and exits 1 on failure.
import { createRequire } from 'node:module'
import { readFile, readdir, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname, extname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
// Never a fixed session path: each cloud session has its own scratchpad. Suites stay serial: the software GPU is CPU-bound, parallel runs break the speed checks.
const SCRATCH = process.env.SCRATCH || join(tmpdir(), 'studio-test')
const DEPS = process.env.DEPS || join(SCRATCH, 'deps/node_modules')
const SHOTS = process.env.SHOTS || join(SCRATCH, 'shots')
if (!existsSync(join(DEPS, 'three'))) { console.error(`No local libraries at ${DEPS}: set SCRATCH (holds deps/node_modules) or DEPS (README: Tests)`); process.exit(2) }   // 404 boot errors named nothing
const ORIGIN = 'https://studio.test'   // https: a secure context, so WebCodecs (video export) exists
// NODE_TOOLS = folder whose node_modules has playwright (cloud default /opt/node-tools); CHROME = browser exe on PC (no Playwright browsers)
const require = createRequire((process.env.NODE_TOOLS || '/opt/node-tools') + '/')
const { chromium } = require('playwright')

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.wasm': 'application/wasm' }
export const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }
}
const MOCK = await readFile(join(HERE, 'mock-claude.js'), 'utf8')
const args = process.argv.slice(2)
const gi = args.indexOf('--grep')
const GREP = gi >= 0 ? args.splice(gi, 2)[1] : null
const FILTER = args[0] || null

// root: the folder served as the tool (a scratch copy for plugin tests)
const serveFrom = (ROOT) => async function serve(route) {
  const url = new URL(route.request().url())
  if (url.host === 'studio.test') {
    let p = decodeURIComponent(url.pathname)
    if (p === '/' || p === '/index.html') {
      const html = await readFile(join(ROOT, 'index.html'), 'utf8')
      // the artifact host wraps the page in a document skeleton
      return route.fulfill({ status: 200, contentType: 'text/html', body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${html}</body></html>` })
    }
    if (p === '/favicon.ico') return route.fulfill({ status: 204, body: '' })
    const f = join(ROOT, p)
    // A plugin not built yet loads as empty, so its builder's first Write can create it and other suites stay green
    if (f.startsWith(ROOT) && !existsSync(f) && /^\/plugins\/[\w-]+\.js$/.test(p)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: 'export default null' })
    if (!f.startsWith(ROOT) || !existsSync(f)) return route.fulfill({ status: 404, body: 'not found' })
    return route.fulfill({ status: 200, contentType: TYPES[extname(f)] || 'application/octet-stream', body: await readFile(f) })
  }
  if (url.host === 'cdn.jsdelivr.net') {
    const m = /^\/npm\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/(.*)$/.exec(url.pathname)
    let f = m && join(DEPS, m[1], m[2])
    // jsDelivr minifies X.js into X.min.js on request; npm ships only X.js, so serve that unless DEPS holds a Terser'd copy
    if (f && !existsSync(f) && f.endsWith('.min.js')) f = f.slice(0, -7) + '.js'
    if (!f || !existsSync(f)) return route.fulfill({ status: 404, body: 'missing dep ' + url.pathname })
    return route.fulfill({ status: 200, contentType: TYPES[extname(f)] || 'text/javascript', body: await readFile(f), headers: { 'access-control-allow-origin': '*' } })
  }
  if (url.host === 'fonts.googleapis.com') return route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  return route.abort()
}

let browser
const results = []
function makeT(suite) {
  const opened = new Set()
  const t = {
    SHOTS, ROOT, DEPS, ORIGIN, SCRATCH,
    log: (...a) => console.log('   ', ...a),
    ok(v, msg = 'expected truthy') { if (!v) throw new Error(msg) },
    eq(a, b, msg = '') { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${msg} expected ${y}, got ${x}`) },
    near(a, b, eps = 1e-3, msg = '') { const A = [].concat(a), B = [].concat(b); if (A.length !== B.length || A.some((v, i) => Math.abs(v - B[i]) > eps)) throw new Error(`${msg} expected ≈${JSON.stringify(b)}, got ${JSON.stringify(a)}`) },
    async test(name, fn) {
      const full = suite + ' › ' + name
      if (GREP && !full.toLowerCase().includes(GREP.toLowerCase())) return
      const t0 = Date.now()
      try { await fn(); results.push({ name: full, ok: true, ms: Date.now() - t0 }); console.log(`PASS ${full} (${Date.now() - t0} ms)`) }
      catch (e) { results.push({ name: full, ok: false, error: e }); console.log(`FAIL ${full} (${Date.now() - t0} ms)\n     ${String(e?.stack || e).split('\n').slice(0, 4).join('\n     ')}`) }
      finally { for (const s of [...opened]) await s.close().catch(() => {}) }
    },
    // Open the page. device: 'desktop'|'phone'; hash: '#' or '#id'; claude: false (no runtime) or mock config.
    async open({ device = 'desktop', hash = '', claude = {}, allowErrors = [], root = ROOT } = {}) {
      const ctx = await browser.newContext({ ...DEVICES[device], colorScheme: 'dark' })
      await ctx.route('**/*', serveFrom(root))
      if (claude !== false) await ctx.addInitScript(`window.__mockConfig = ${JSON.stringify(claude)};\n${MOCK}`)
      const page = await ctx.newPage()
      const errors = []
      const allowed = m => allowErrors.some(r => (r instanceof RegExp ? r.test(m) : m.includes(r)))
      // errors and warnings from our code fail noErrors(); GPU driver chatter from the software renderer does not
      page.on('console', m => { const k = m.type(), x = m.text(); if ((k === 'error' || k === 'warning') && !/GL Driver Message|GPU stall|\[\.WebGL-/.test(x) && !allowed(x)) errors.push(k + ': ' + x) })
      page.on('pageerror', e => { if (!allowed(String(e))) errors.push('pageerror: ' + (e.stack || e)) })
      await page.goto(ORIGIN + '/' + hash)
      await page.waitForFunction(() => window.studio?.ready, null, { timeout: 20000 }).catch(e => { throw errors.length ? new Error('boot failed: ' + errors.join('; ')) : e }) // a module syntax error names itself instead of a bare timeout
      await page.evaluate(() => window.studio.ready)
      const s = {
        page, ctx, errors, device,
        eval: (fn, arg) => page.evaluate(fn, arg),
        run: (cmd, a) => page.evaluate(([c, x]) => window.studio.run(c, x), [cmd, a ?? {}]),
        scene: () => page.evaluate(() => window.studio.scene()),
        waitFor: (fn, arg, timeout = 5000) => page.waitForFunction(fn, arg, { timeout, polling: 16 }),
        idle: () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0))))),
        async shot(name, opts = {}) { await mkdir(SHOTS, { recursive: true }); const p = join(SHOTS, name); await page.screenshot({ path: p, ...opts }); return p },
        // Create a project and open it in the editor; returns its id.
        async project(name = 'Test', opts = {}) {
          const id = await page.evaluate(([n, o]) => window.studio.run('file.new', { name: n, ...o }), [name, opts])
          await page.evaluate(id => { window.studio.open(id) }, id) // not awaited: a lazy module that fails to load would hang here; the wait below names the page error
          await page.waitForFunction(() => window.studio.app.loaded && window.studio.app.viewport, null, { timeout: 15000 }).catch(e => { throw errors.length ? new Error('open failed: ' + errors.join('; ')) : e })
          return id
        },
        noErrors(msg = '') { if (errors.length) throw new Error(`${msg} console errors:\n  ${errors.slice(0, 5).join('\n  ')}`) },
        async close() { opened.delete(s); await ctx.close() }
      }
      opened.add(s)
      return s
    }
  }
  return t
}

const t0 = Date.now()
// syntax gate: every module parses (a duplicate const in a lazily loaded module would otherwise only show as a hang)
for (const dir of ['core', 'plugins']) for (const f of (await readdir(join(ROOT, dir))).filter(f => f.endsWith('.js'))) {
  const r = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: await readFile(join(ROOT, dir, f)), encoding: 'utf8' })
  if (r.status) { console.log(`FAIL syntax ${dir}/${f}\n     ${r.stderr.split('\n').slice(0, 5).join('\n     ')}`); process.exit(1) }
}
// WebGL on the CPU: Mesa llvmpipe (through ANGLE's GLES backend, no display needed) when the machine has it, else SwiftShader.
// GL=swiftshader|llvmpipe forces one.
const MESA = ['/usr/lib/x86_64-linux-gnu/libEGL_mesa.so.0', '/usr/lib/aarch64-linux-gnu/libEGL_mesa.so.0', '/usr/lib64/libEGL_mesa.so.0'].some(existsSync)
const GL = process.env.GL || (MESA ? 'llvmpipe' : 'swiftshader')
const GL_ARGS = GL === 'llvmpipe' ? ['--use-gl=angle', '--use-angle=gl-egl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: [...GL_ARGS, '--ignore-gpu-blocklist', '--enable-webgl'], env: { ...process.env, EGL_PLATFORM: 'surfaceless' } })
// llvmpipe JIT-compiles its first programs once per browser (~3 s); pay that here, not inside the first timed test
if (GL === 'llvmpipe') {
  const w0 = Date.now(), s = await makeT('warm-up').open()
  try { await s.project('Warm-up') } catch (e) { console.log('warm-up failed: ' + (e?.message || e)) } finally { await s.close() }
  console.log(`warm-up ${Date.now() - w0} ms`)
}
try {
  const files = (await readdir(HERE)).filter(f => f.endsWith('.mjs') && f !== 'run.mjs' && (!FILTER || f.includes(FILTER))).sort()
  const CAP = { vfx: 45 }                 // s per suite: the VFX check runs inside a 60 s VFX task (owner), browser start included
  for (const f of files) {
    const suite = f.replace(/\.mjs$/, ''), s0 = Date.now()
    try { const mod = await import(pathToFileURL(join(HERE, f)).href); await mod.default(makeT(suite)) }
    catch (e) { results.push({ name: suite + ' (suite)', ok: false, error: e }); console.log(`FAIL ${suite} (suite crashed)\n     ${e?.stack || e}`) }
    const took = (Date.now() - s0) / 1000
    if (CAP[suite] && took > CAP[suite]) { results.push({ name: suite + ' (speed cap)', ok: false, error: `${took.toFixed(1)} s > ${CAP[suite]} s` }); console.log(`FAIL ${suite} took ${took.toFixed(1)} s, cap ${CAP[suite]} s`) }
  }
} finally { await browser.close() }
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed, ${failed.length} failed in ${((Date.now() - t0) / 1000).toFixed(1)} s (WebGL: ${GL}). Screenshots: ${SHOTS}`)
// slowest tests first in line for a speed-up when the suite grows
if (results.length > 10) console.log('Slowest: ' + results.filter(r => r.ms).sort((x, y) => y.ms - x.ms).slice(0, 5).map(r => `${r.name} ${(r.ms / 1000).toFixed(1)} s`).join('; '))
for (const r of failed) console.log('  FAIL ' + r.name)
process.exit(failed.length ? 1 : 0)
