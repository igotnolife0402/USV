// One command, prompt-to-MP4 for a fight (2026-11-24, target <= 5:00 wall clock): build.py -> finish.mjs -> lint + render in
// parallel frame chunks -> ffmpeg concat -> payoff sheet -> per-phase seconds appended to WORK/times.jsonl.
//   DEPS=<node_modules> node fight.mjs BASE_TAB WORK [--tab s6] [--jobs 3] [--stages s3,s6]
// --stages renders extra stage clips (only on request: each costs a full render). Output: WORK/out/<tab>.mp4, WORK/out/payoff.jpg
import { spawn } from 'node:child_process'
import { readFileSync, mkdirSync, appendFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = dirname(fileURLToPath(import.meta.url)), STUDIO = process.env.STUDIO || resolve(HERE, '..', '..', '..', 'studio')   // the Studio tool (test runner + plugins)
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args.splice(i, 2)[1] }
const TAB = flag('--tab', 's6'), JOBS = +flag('--jobs', 3), EXTRA = flag('--stages', '').split(',').filter(Boolean)
const [BASE, WORK] = args.map(a => resolve(a))
if (!BASE || !WORK || !process.env.DEPS) { console.error('usage: DEPS=<node_modules> node fight.mjs BASE_TAB WORK [--tab s6] [--jobs 3] [--stages a,b]'); process.exit(2) }
const OUT = join(WORK, 'out'); mkdirSync(OUT, { recursive: true })
const t0 = Date.now(), times = {}
const run = (cmd, argv, o = {}) => new Promise((res, rej) => {
  const p = spawn(cmd, argv, { cwd: o.cwd || HERE, env: { ...process.env, ...o.env } }); let log = ''
  p.stdout.on('data', d => { log += d }); p.stderr.on('data', d => { log += d })
  p.on('close', c => c ? rej(new Error(`${cmd} ${argv.slice(0, 2).join(' ')} exit ${c}\n${log.slice(-1500)}`)) : res(log))
})
async function phase (name, fn) { const s = Date.now(); const r = await fn(); times[name] = +((Date.now() - s) / 1000).toFixed(1); console.log(`${name.padEnd(8)} ${times[name]} s`); return r }

// one tab -> one MP4: JOBS headless browsers each render a frame range, ffmpeg joins them without re-encoding
async function render (tab, lint) {
  const dir = join(WORK, tab), clip = JSON.parse(readFileSync(join(dir, 'project.json'))).anims.fight
  const n = Math.max(1, Math.round(clip.len * 30)), per = Math.ceil(n / JOBS), parts = []
  const logs = await Promise.all([...Array(JOBS).keys()].map(async j => {
    const a = j * per, b = Math.min(n, a + per); if (a >= b) return ''
    const shots = join(WORK, '.chunks', `${tab}-${j}`); rmSync(shots, { recursive: true, force: true }); parts[j] = join(shots, 'clip.mp4')
    return run('node', ['test/run.mjs', 'shots'], { cwd: STUDIO, env: { SCRATCH: join(WORK, '.chunks'), SHOTS: shots, SHOTS_TAB: dir, SHOTS_AT: '0', SHOTS_VIDEO: '1',
      SHOTS_FRAMES: `${a}-${b}`, SHOTS_DEVICE: 'desktop', ...(lint && j === 0 ? { SHOTS_LINT: '{"chest":3}' } : {}) } })
  }))
  const list = join(WORK, '.chunks', `${tab}.txt`); writeFileSync(list, parts.filter(Boolean).map(p => `file '${p}'`).join('\n'))
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', join(OUT, `${tab}.mp4`)])
  return { log: logs[0], n, len: clip.len, warp: clip.warp }
}
const lintOf = log => { const m = log.match(/LINT (\d+)/); return m ? +m[1] : null }
// story time -> clip time through the clip's warp ([clipT, storyT] keys)
const clipAt = (w, s) => { if (!w) return s; for (let i = 1; i < w.length; i++) { const [c0, s0] = w[i - 1], [c1, s1] = w[i]; if (s <= s1 && s1 > s0) return c0 + (c1 - c0) * (s - s0) / (s1 - s0) } return w.at(-1)[0] }

try {
  const blog = await phase('build', () => run('python3', ['build.py', BASE, WORK], { env: { FX_CACHE: process.env.FX_CACHE || join(dirname(WORK), 'fx-cache') } }))
  await phase('finish', () => run('node', ['finish.mjs', WORK], { env: { PLUGINS: join(STUDIO, 'plugins') } }))
  const beats = JSON.parse(readFileSync(join(WORK, 'beats.json')))
  const gate = (blog.match(/GATE (PASS|FAIL[^\n]*)/) || [, 'missing'])[1]
  if (gate !== 'PASS') throw new Error('gate ' + gate + ' (no render: fix the choreography first)')
  const main = await phase('render', () => render(TAB, true))
  const lint = lintOf(main.log)
  for (const s of EXTRA) await phase(`render ${s}`, () => render(s, false))
  // payoff sheet: 12 frames at 12 fps from 0.4 s before the payoff, tiled 4x3, read from the finished MP4 (what the owner sees)
  await phase('sheet', () => run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, clipAt(main.warp, beats.payoff) - 0.4)), '-i', join(OUT, `${TAB}.mp4`),
    '-vf', 'fps=12,scale=360:-1,tile=4x3', '-frames:v', '1', join(OUT, 'payoff.jpg')]))
  const total = +((Date.now() - t0) / 1000).toFixed(1)
  const rec = { at: new Date().toISOString(), tab: TAB, jobs: JOBS, frames: main.n, len: main.len, gate, lint, times, total, pass: total <= 300 && /PASS/.test(gate) && lint === 0 }
  appendFileSync(join(WORK, 'times.jsonl'), JSON.stringify(rec) + '\n')
  console.log(`total    ${total} s  gate ${gate}  lint ${lint}  -> ${join(OUT, TAB + '.mp4')}  ${rec.pass ? 'PASS' : 'FAIL'}`)
  if (lint !== 0) console.log(main.log.split('\n').filter(l => /^\s*LINT/.test(l)).slice(0, 8).join('\n'))
} catch (e) { console.error('Failed:', e.message); process.exit(1) }
