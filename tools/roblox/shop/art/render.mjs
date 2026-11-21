import { fileURLToPath } from 'node:url'
// Rasterises shop/art/**/*.svg to PNG and writes Studio texture docs ({kind:'image', data}) to shop/out/tex/<id>.json,
// plus a contact sheet for checking. Usage: node shop/art/render.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
const art = fileURLToPath(new URL('./', import.meta.url)), out = fileURLToPath(new URL('../out/tex/', import.meta.url))
mkdirSync(out, { recursive: true })
// id -> [svg path, px]. Items render at 2x their on-screen size so they stay sharp on high-DPI phones.
export const ART = {
  'sh-coin': ['ui/coin.svg', 96], 'sh-bracket': ['ui/bracket.svg', 64], 'sh-emboss': ['ui/emboss.svg', 40],
  'sh-gears': ['ui/gears.svg', 72], 'sh-burst': ['ui/burst.svg', 120],
  'sh-boots': ['items/boots.svg', 160], 'sh-clover': ['items/clover.svg', 160], 'sh-potion': ['items/potion.svg', 160],
  'sh-shovel': ['items/shovel.svg', 160], 'sh-trail': ['items/trail.svg', 160], 'sh-gift': ['items/gift.svg', 160],
  'sh-cart': ['items/cart.svg', 120], 'sh-star': ['items/star.svg', 120]
}
const browser = await chromium.launch(), page = await browser.newPage()
const sheet = []
for (const [id, [file, px]] of Object.entries(ART)) {
  if (!existsSync(art + file)) { console.log('missing', file); continue }
  const svg = readFileSync(art + file, 'utf8')
  await page.setViewportSize({ width: px, height: px })
  await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:${px}px;height:${px}px}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`)
  await page.waitForFunction(() => document.images[0].complete)
  const png = await page.screenshot({ omitBackground: true, type: 'png' })
  const data = 'data:image/png;base64,' + png.toString('base64')
  writeFileSync(out + id + '.json', JSON.stringify({ kind: 'image', data }))
  sheet.push([id, data]); console.log(id, (data.length / 1024).toFixed(1) + ' KB')
}
await page.setViewportSize({ width: 1100, height: 300 })
await page.setContent(`<body style="margin:0;background:#2f63e0;display:flex;flex-wrap:wrap;gap:12px;padding:12px;font:12px sans-serif;color:#fff">${sheet.map(([id, d]) => `<div><img src="${d}" style="width:96px;height:96px;object-fit:contain;background:${id === 'sh-emboss' || id === 'sh-gears' ? '#36b84e' : 'none'}"><br>${id}</div>`).join('')}</body>`)
await page.screenshot({ path: fileURLToPath(new URL('../out/art-sheet.png', import.meta.url)) })
await browser.close()
