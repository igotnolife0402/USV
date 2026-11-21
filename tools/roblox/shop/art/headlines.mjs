import { fileURLToPath } from 'node:url'
// Thumbnail-style headline text and the hero burst, rendered to Studio texture docs (shop/out/tex/<id>.json).
// Headlines: vertical gradient fill, white inner line, thick ink outline, ink drop for a 3D look (like top thumbnails).
// Burst: radial yellow -> orange -> red with soft rays, the focal glow behind the featured bundle.
// Rendered as HTML so the real Luckiest Guy web font is used. Usage: node shop/art/headlines.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { TYPE } from '../design.mjs'
const { chromium } = createRequire(import.meta.url)('playwright')
const out = fileURLToPath(new URL('../out/tex/', import.meta.url))
mkdirSync(out, { recursive: true })
const INK = '#22174a', SCALE = 2   // rendered at 2x the on-screen size so text stays crisp on phones

const GOLD = ['#fff8a0', '#ffe600', '#ffaa00', '#ff6a00'], WGOLD = ['#ffffff', '#fffbc0', '#ffee00', '#ffb800'], ICE = ['#ffffff', '#7ff0ff', '#00c8ff', '#0070ff']
// id -> [lines, on-screen w, h, font px, gradient, align]
const TEXTS = {
  'sh-txt-shop': [['SHOP'], 150, 56, 50, GOLD, 'start'],
  'sh-txt-deals': [["TODAY'S DEALS"], 208, 44, 25, GOLD, 'middle'],
  'sh-txt-bundle': [['LEGENDARY BUNDLE'], 244, 42, 26, WGOLD, 'middle']
}
function textSVG([lines, w, h, fs, g, align]) {
  const lh = fs * 1.05, top = (h - lh * lines.length) / 2 + fs * 0.86 - 2, x = align === 'middle' ? w / 2 : 6
  const t = (dy, attrs) => lines.map((l, i) => `<text x="${x}" y="${top + i * lh + dy}" text-anchor="${align}" ${attrs}>${l.replace(/'/g, '&#39;')}</text>`).join('')
  const base = `font-family="Luckiest Guy" font-size="${fs}" stroke-linejoin="round" paint-order="stroke"`
  const ow = fs * (fs < 24 ? 0.3 : 0.22)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * SCALE}" height="${h * SCALE}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${g.map((c, i) => `<stop offset="${i / (g.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient></defs>
  ${t(4, `${base} fill="${INK}" stroke="${INK}" stroke-width="${ow}"`)}
  ${t(0, `${base} fill="${INK}" stroke="${INK}" stroke-width="${ow}"`)}
  ${t(0, `${base} fill="#ffffff" stroke="#ffffff" stroke-width="${fs * 0.08}"`)}
  ${t(0, `${base} fill="url(#g)"`)}</svg>`
}
function burstSVG(w, h) {
  const rays = Array.from({ length: 18 }, (_, i) => { const a = i * 20 * Math.PI / 180, b = a + 9 * Math.PI / 180, R = Math.max(w, h)
    return `<path d="M${w / 2} ${h * 0.42}L${w / 2 + Math.cos(a) * R} ${h * 0.42 + Math.sin(a) * R}L${w / 2 + Math.cos(b) * R} ${h * 0.42 + Math.sin(b) * R}Z" fill="#fff8a0" opacity=".28"/>` }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * SCALE}" height="${h * SCALE}" viewBox="0 0 ${w} ${h}">
  <defs><radialGradient id="r" cx=".72" cy=".42" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".12" stop-color="#fff200"/><stop offset=".4" stop-color="#ffa800"/><stop offset=".65" stop-color="#ff6a00"/><stop offset=".88" stop-color="#ff2200"/><stop offset="1" stop-color="#c8001e"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#r)"/><g transform="translate(${w * 0.22} 0)">${rays}</g></svg>`
}


// v10: Bungee, gold-chrome gradient, a deep-orange edge (no black anywhere), then a hot-pink and an ink offset
// stacked down-right (a sticker-style double drop instead of the usual thick black outline)
function cashSVG([text, w, h, fs]) {
  const x = w / 2, y = h / 2 + fs * 0.36 - 3, g = TYPE.gold
  const t = (dx, dy, attrs) => `<text x="${x + dx}" y="${y + dy}" text-anchor="middle" font-family="${TYPE.display}" font-size="${fs}" stroke-linejoin="round" paint-order="stroke" ${attrs}>${text}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * SCALE}" height="${h * SCALE}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${g.map((c, i) => `<stop offset="${i / (g.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient></defs>
  ${t(fs * 0.11, fs * 0.13, `fill="${TYPE.offset2}" stroke="${TYPE.offset2}" stroke-width="${fs * 0.1}"`)}
  ${t(fs * 0.06, fs * 0.07, `fill="${TYPE.offset}" stroke="${TYPE.offset}" stroke-width="${fs * 0.08}"`)}
  ${t(0, 0, `fill="url(#g)" stroke="${TYPE.edge}" stroke-width="${fs * 0.1}"`)}
  ${t(0, -fs * 0.02, `fill="none" stroke="#ffffff" stroke-width="${fs * 0.025}" opacity=".9"`)}</svg>`
}

const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined, args: ['--ignore-certificate-errors'] })
const page = await browser.newPage()
const jobs = [...Object.entries(TYPE.heads).map(([id, spec]) => [id, cashSVG(spec), spec[1], spec[2], spec]), ['sh-burst-bg', burstSVG(260, 212), 260, 212]]
for (let [id, svg, w, h, spec] of jobs) {
  await page.setViewportSize({ width: w * SCALE, height: h * SCALE })
  await page.setContent(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bungee&display=block"><style>html,body{margin:0;background:transparent}</style>${svg}`)
  await page.evaluate(() => document.fonts.load('50px "Bungee"')); await page.evaluate(() => document.fonts.ready)
  const ok = await page.evaluate(() => document.fonts.check('50px "Bungee"'))
  if (!ok) throw new Error('Bungee did not load; headline text would render in a fallback font')
  // fit: measure the word in the real font and shrink it until it (plus its offset shadow) fits the box
  if (spec) {
    const len = await page.evaluate(() => Math.max(...[...document.querySelectorAll('text')].map(t => t.getComputedTextLength())))
    const room = w - spec[3] * 0.2 - 6
    if (len > room) { spec = [spec[0], w, h, Math.floor(spec[3] * room / len)]; svg = cashSVG(spec)
      await page.setContent(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bungee&display=block"><style>html,body{margin:0;background:transparent}</style>${svg}`)
      await page.evaluate(() => document.fonts.ready) }
  }
  // the burst is opaque, so JPEG keeps the texture doc small; text needs PNG transparency
  const jpg = id === 'sh-burst-bg', png = await page.locator('svg').screenshot(jpg ? { type: 'jpeg', quality: 82 } : { omitBackground: true, type: 'png' })
  writeFileSync(out + id + '.json', JSON.stringify({ kind: 'image', data: `data:image/${jpg ? 'jpeg' : 'png'};base64,` + png.toString('base64') }))
  writeFileSync(new URL(`../out/${id}.png`, import.meta.url), png)
  console.log(id, (png.length / 1024).toFixed(1) + ' KB')
}
await browser.close()
