import { fileURLToPath, pathToFileURL } from 'node:url'
// The shop's skin kit: every frame, card, button, plate and tab as a hand-made image at its exact on-screen size
// (domains/roblox/ui.md, Craft level). Built-in shapes stop at a flat box + gradient; these add the layers that make
// a UI look like hours of work: hard lip, ink outline, 3-stop face, top gloss, bottom inner shadow, inset rim line,
// top highlight line and a faint texture. Wells (panels, bars, plates) are inset instead.
// Each image includes its lip, so the GUI element's box is the whole skin (nothing hangs outside it).
// Usage: node shop/art/kit.mjs   -> shop/out/tex/sk-*.json + shop/out/kit-sheet.png
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { PAL } from '../design.mjs'
const { chromium } = createRequire(import.meta.url)('playwright')
const out = fileURLToPath(new URL('../out/tex/', import.meta.url))
mkdirSync(out, { recursive: true })
const INK = PAL.ink, SCALE = 2
let n = 0
const rr = (x, y, w, h, r) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(0, Math.min(r, h / 2, w / 2))}"/>`

// raised skin: buttons, cards, tabs, the window
function raised(w, h, r, [shine, mid, deep, lip], { lipH = 6, stroke = 3, texture = 'stripes', overlay = false, frame = 0, line = lip } = {}) {
  const id = 'k' + ++n, fh = h - lipH, s = stroke / 2
  const face = (inset = 0) => rr(s + inset, s + inset, w - stroke - inset * 2, fh - stroke - inset * 2, r - inset)
  const tex = texture === 'stripes'
    ? `<pattern id="${id}t" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="4" height="10" fill="#fff" opacity=".07"/></pattern>`
    : texture === 'none' ? `<pattern id="${id}t" width="2" height="2" patternUnits="userSpaceOnUse"></pattern>`
    : `<pattern id="${id}t" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.4" fill="#fff" opacity=".12"/><circle cx="9" cy="9" r="1.4" fill="#fff" opacity=".12"/></pattern>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * SCALE}" height="${h * SCALE}" viewBox="0 0 ${w} ${h}"><defs>
<linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shine}"/><stop offset=".45" stop-color="${mid}"/><stop offset="1" stop-color="${deep}"/></linearGradient>
<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lip}" stop-opacity="0"/><stop offset="1" stop-color="${lip}" stop-opacity=".45"/></linearGradient>
${tex}<clipPath id="${id}c">${face()}</clipPath>
<mask id="${id}m"><rect width="${w}" height="${h}" fill="#fff"/><g fill="#000">${face()}</g></mask></defs>
<g fill="${lip}" stroke="${line}" stroke-width="${stroke}" ${overlay ? `mask="url(#${id}m)"` : ''}>${rr(s, s + lipH, w - stroke, fh - stroke, r)}</g>
<g fill="${overlay ? 'none' : `url(#${id}f)`}">${face()}</g>
<g clip-path="url(#${id}c)">
${overlay ? '' : `<rect width="${w}" height="${h}" fill="url(#${id}t)"/>`}
<rect x="0" y="0" width="${w}" height="${fh * 0.48}" fill="url(#${id}g)" rx="${r}"/>
<rect x="0" y="${fh * 0.62}" width="${w}" height="${fh * 0.38}" fill="url(#${id}s)"/>
${frame ? `<g fill="none" stroke="${deep}" stroke-width="2" opacity=".7">${face(frame)}</g><g fill="none" stroke="${shine}" stroke-width="1.5" opacity=".8">${face(frame + 2)}</g>` : ''}
<g fill="none" stroke="#fff" stroke-width="1.5" opacity=".35">${face(4)}</g>
<path d="M${r + 4} ${s + 3.5}H${w - r - 4}" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>
</g><g fill="none" stroke="${line}" stroke-width="${stroke}">${face()}</g></svg>`
}
// inset well: panels and bars. Bright and saturated (no dark wells): a coloured inner shadow at the top,
// a white rim at the bottom, and the outline in the well's own lip colour.
function inset(w, h, r, [shine, mid, deep, lip], { stroke = 3 } = {}) {
  const id = 'k' + ++n, s = stroke / 2
  const face = (i = 0) => rr(s + i, s + i, w - stroke - i * 2, h - stroke - i * 2, r - i)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * SCALE}" height="${h * SCALE}" viewBox="0 0 ${w} ${h}"><defs>
<linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${deep}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${shine}"/></linearGradient>
<linearGradient id="${id}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lip}" stop-opacity=".6"/><stop offset="1" stop-color="${lip}" stop-opacity="0"/></linearGradient>
<pattern id="${id}d" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.8" fill="#fff" opacity=".18"/><circle cx="12" cy="12" r="1.8" fill="#fff" opacity=".18"/></pattern>
<clipPath id="${id}c">${face()}</clipPath></defs>
<g fill="url(#${id}f)">${face()}</g><g clip-path="url(#${id}c)">
<rect width="${w}" height="${h}" fill="url(#${id}d)"/>
<rect width="${w}" height="${Math.min(16, h * 0.45)}" fill="url(#${id}i)"/>
<path d="M${r} ${h - s - 2.5}H${w - r}" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/></g>
<g fill="none" stroke="${lip}" stroke-width="${stroke}">${face()}</g></svg>`
}
// white plate tinted by its host: white face, the host's lip as outline and soft bottom shade
const whitePlate = (w, h, r, lip) => raised(w, h, r, ['#ffffff', '#ffffff', '#ffffff', lip], { lipH: 3, stroke: 2, texture: 'none' })

export const SKINS = {
  'sk-window': raised(800, 340, 30, PAL.window, { lipH: 8, stroke: 5, texture: 'dots', frame: 8 }),
  'sk-panel': inset(688, 250, 22, PAL.panel, { stroke: 4 }),
  'sk-hero': raised(260, 218, 20, PAL.sunny, { overlay: true }),
  'sk-row-tangerine': raised(386, 66, 18, PAL.tangerine),
  'sk-row-mint': raised(386, 66, 18, PAL.mint),
  'sk-row-bubblegum': raised(386, 66, 18, PAL.bubblegum),
  'sk-buy-row': raised(104, 40, 20, PAL.buy, { lipH: 5 }),
  'sk-buy-hero': raised(130, 38, 19, PAL.buy, { lipH: 5 }),
  'sk-plus': raised(40, 40, 12, PAL.buy, { lipH: 5 }),
  'sk-close': raised(52, 52, 16, PAL.close, { lipH: 6 }),
  'sk-tab-on': raised(68, 64, 18, PAL.tangerine, { lipH: 5 }),
  'sk-tab-off': raised(68, 64, 18, PAL.tabOff, { lipH: 5 }),
  'sk-coinbar': inset(214, 54, 16, PAL.window),
  'sk-plate-tangerine': whitePlate(128, 24, 8, PAL.tangerine[3]),
  'sk-plate-mint': whitePlate(128, 24, 8, PAL.mint[3]),
  'sk-plate-bubblegum': whitePlate(128, 24, 8, PAL.bubblegum[3]),
  'sk-chip': whitePlate(112, 24, 12, PAL.sunny[3]),
  'sk-chip-perk': whitePlate(102, 24, 12, PAL.sunny[3]),
  'sk-was': whitePlate(112, 24, 12, PAL.close[3]),
  'sk-new': raised(50, 22, 11, PAL.close, { lipH: 3, stroke: 2 })
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const b = await chromium.launch(), p = await b.newPage()
  const sheet = []
  for (const [id, svg] of Object.entries(SKINS)) {
    const [, w, h] = svg.match(/width="(\d+)" height="(\d+)"/).map(Number)
    await p.setViewportSize({ width: w, height: h })
    await p.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`)
    const png = await p.locator('svg').screenshot({ omitBackground: true, type: 'png' })
    const data = 'data:image/png;base64,' + png.toString('base64')
    writeFileSync(out + id + '.json', JSON.stringify({ kind: 'image', data }))
    sheet.push([id, data, w / SCALE, h / SCALE]); console.log(id, (png.length / 1024).toFixed(1) + ' KB')
  }
  await p.setViewportSize({ width: 1000, height: 900 })
  await p.setContent(`<body style="margin:0;padding:12px;background:#7ec8ff;display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start">${sheet.map(([id, d, w, h]) => `<img src="${d}" style="width:${Math.min(w, 960)}px" title="${id}">`).join('')}</body>`)
  await p.screenshot({ path: fileURLToPath(new URL('../out/kit-sheet.png', import.meta.url)), fullPage: true }); await b.close()
}
