import { fileURLToPath, pathToFileURL } from 'node:url'
// Shop design, decided BEFORE building (domains/roblox/ui.md: palette and layout first).
// build.mjs takes every colour from PAL and every box from LAYOUT; it fails if it uses a colour not listed here.
// v5: 3-stop gradients (a shine tone per family) and a no-overlap layout: every box sits fully inside its parent,
// outline (3 px) and lip (6 px) included, and never touches a sibling.
// Usage: node shop/design.mjs   -> shop/out/design.png (palette swatches + layout wireframe at phone size)

// ---------- palette: candy-bright, one job per colour ----------
// Each family is [shine (top of the gradient), mid, deep (bottom), lip (the hard shadow under it)].
export const PAL = {
  // v10 (owner rule): no dark or gloomy tones. Lines are deeper shades of each element's own hue (coloured line art);
  // plates are white; text shadows are coloured. Every colour except white/cream passes vividCheck().
  ink: '#3a1fd6',                                         // fallback line colour only (vivid violet-blue, never black)
  white: '#ffffff',
  window: ['#33ccff', '#0a9dff', '#0062ff', '#0036b3'],   // window = blue (Standard role), electric sky blue
  panel: ['#9933ff', '#8019ff', '#6a00f5', '#4f00b8'],    // bright violet panel: hue contrast with the warm cards, not darkness
  dim: '#0036b3',                                         // tint behind the popup (transparent overlay)
  title: ['#ffe600', '#ffc400', '#ff9500', '#c25a00'],    // gold: titles and coins
  buy: ['#9dff00', '#3dff1a', '#00d42a', '#008a1f'],      // green: buy buttons and +
  close: ['#ff3d7a', '#ff1a55', '#f0003c', '#a3002a'],    // red: close, sale and NEW tags
  coin: '#ffd21a',                                        // coin glow
  tangerine: ['#ffb31a', '#ff8c00', '#ff5e00', '#b33a00'],
  mint: ['#33ffd6', '#00f0c0', '#00c2a0', '#00947a'],
  bubblegum: ['#ff33cc', '#ff00b3', '#d6008f', '#8a005c'],
  sunny: ['#fff200', '#ffd000', '#ffaa00', '#b86b00'],    // hero bundle
  tabOff: ['#33ccff', '#0a9dff', '#0062ff', '#0036b3'],   // closed tabs (window blue)
  cream: '#fff6c8'                                        // small text on colour (text, exempt)
}
// Owner rules (domains/roblox/ui.md): super saturated and bright, and nothing dark. HSV: shine/mid/deep s >= 0.75 and
// v >= 0.75; lips and lines s >= 0.8 and v >= 0.5. Only white, cream (text) and the dim overlay are exempt.
const EXEMPT = new Set(['white', 'cream', 'dim'])
const hsv = hex => { const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); return { s: mx ? (mx - mn) / mx : 0, v: mx } }
export function vividCheck() {
  const bad = []
  for (const [k, v] of Object.entries(PAL)) {
    if (EXEMPT.has(k)) continue
    ;(Array.isArray(v) ? v : [v]).forEach((c, i) => {
      const line = !Array.isArray(v) || (v.length === 4 && i === 3), { s, v: val } = hsv(c)
      if (line ? s < 0.8 || val < 0.5 : s < 0.75 || val < 0.75) bad.push(`${k}[${i}] ${c} (s ${s.toFixed(2)}, v ${val.toFixed(2)})`)
    })
  }
  return bad
}
export const allColours = () => [...new Set(Object.values(PAL).flat())]

// ---------- type system (owner rule: unique, never the default simulator recipe) ----------
// "Roblox cash-grab with a unique twist": giant gradient numbers like the loud money shops, but
//  - display face Bungee (signage), rendered as images: gold-chrome gradient + hot-pink then ink offset shadow, no black outline;
//  - body face Oswald (condensed caps, live text), white on dark plates, no outline, letter-spaced;
//  - size contrast: the number is 2-3x its unit word ("+20%" big, "SPEED" small).
export const TYPE = {
  display: 'Bungee', body: 'Oswald',
  // headline images: id -> [text, w, h, font px]
  heads: {
    'sh-h-shop': ['SHOP', 150, 52, 44], 'sh-h-deals': ['HOT DEALS', 190, 38, 26], 'sh-h-bundle': ['MEGA BUNDLE', 244, 34, 27],
    'sh-h-off': ['-30%', 140, 60, 60], 'sh-h-s1': ['+20%', 96, 34, 34], 'sh-h-s2': ['2X', 96, 34, 34], 'sh-h-s3': ['+50', 96, 34, 34]
  },
  gold: ['#ffffff', '#fff38a', '#ffc400', '#ff8a00'], offset: '#ff00b3', offset2: '#b3007d', edge: '#c25a00'
}

// ---------- layout: phone landscape 844 x 390, boxes in px, all relative to their parent ----------
// Header: SHOP headline, HOT DEALS, coin bar, X. Body: tabs column, then the panel: the hero bundle on the left,
// and three wide offer rows on the right (art | name plate + giant stat | price), not the usual tall cards.
export const LAYOUT = {
  screen: [844, 390],
  window: { w: 800, h: 340, dy: 14, cr: 30, stroke: 5, lip: 8 },
  title: { x: 14, y: 10, w: 210, h: 50, cr: 18 },
  deals: { x: 246, y: 16, w: 190, h: 38 },
  coins: { x: 452, y: 8, w: 214, h: 54 },
  close: { x: 734, y: 10, size: 52, cr: 18 },
  tabs: { x: 16, y: 82, w: 68, h: 64, gap: 12, n: 3, cr: 18 },
  panel: { x: 98, y: 78, w: 688, h: 250, cr: 22, stroke: 4 },
  hero: { x: 16, y: 16, w: 260, h: 218, cr: 20 },
  rows: { x: 286, y: 16, w: 386, h: 66, gap: 10, cr: 18 },
  // inside the hero (260 x 214)
  heroIn: { chipY: 8, chipH: 24, headY: 40, headH: 34, offY: 80, wasY: 142, buyY: 172, buyW: 130, buyH: 38, art: 104, artX: 148, artY: 76, perkX: 150, perkY: 184 },
  // inside an offer row (380 x 66)
  row: { art: 56, nameX: 72, nameY: 6, nameW: 128, nameH: 22, statY: 28, statW: 96, statH: 34, unitW: 74, buyX: 270, buyY: 12, buyW: 104, buyH: 40 }
}

// ---------- design sheet ----------
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dull = vividCheck()
  if (dull.length) { console.error('too dull for the toony style:\n' + dull.join('\n')); process.exit(1) }
  const { createRequire } = await import('node:module')
  const { chromium } = createRequire(import.meta.url)('playwright')
  const L = LAYOUT, [SW, SH] = L.screen, W = L.window, wx = (SW - W.w) / 2, wy = (SH - W.h) / 2 + W.dy
  const box = (x, y, w, h, label, c) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border:2px dashed ${c};background:${c}22;box-sizing:border-box;font:600 11px sans-serif;color:${c};padding:3px">${label}</div>`
  const P = L.panel, px = wx + P.x, py = wy + P.y
  const wire = [
    box(wx, wy, W.w, W.h, `window ${W.w}×${W.h}`, '#2b8cff'),
    box(wx + L.title.x, wy + L.title.y, L.title.w, L.title.h, 'SHOP headline', '#c76a00'),
    box(wx + L.deals.x, wy + L.deals.y, L.deals.w, L.deals.h, 'HOT DEALS', '#c76a00'),
    box(wx + L.coins.x, wy + L.coins.y, L.coins.w, L.coins.h, 'coin bar', '#b86b00'),
    box(wx + L.close.x, wy + L.close.y, L.close.size, L.close.size, 'X', '#ff3b6b'),
    ...Array.from({ length: L.tabs.n }, (_, i) => box(wx + L.tabs.x, wy + L.tabs.y + i * (L.tabs.h + L.tabs.gap), L.tabs.w, L.tabs.h, 'tab', '#1f63c7')),
    box(px, py, P.w, P.h, '', '#6fa8d6'),
    box(px + L.hero.x, py + L.hero.y, L.hero.w, L.hero.h, 'HERO: timer · perk<br>MEGA BUNDLE<br>-30% (giant)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;art<br>was-price<br>buy&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;perk', '#ff7f24'),
    ...[0, 1, 2].map(i => box(px + L.rows.x, py + L.rows.y + i * (L.rows.h + L.rows.gap), L.rows.w, L.rows.h, 'art | NAME plate / +20% giant + unit | price', '#8f5bff'))
  ].join('')
  const sw = Object.entries(PAL).map(([k, v]) => `<div style="display:flex;flex-direction:column;gap:2px;font:600 11px sans-serif;color:#22174a">${Array.isArray(v) ? `<div style="width:64px;height:40px;border:2px solid #22174a;border-radius:8px;background:linear-gradient(${v[0]},${v[1]} 45%,${v[2]})"></div>` : ''}${(Array.isArray(v) ? v : [v]).map(c => `<div style="width:64px;height:12px;background:${c};border:2px solid #22174a;border-radius:4px"></div>`).join('')}${k}</div>`).join('')
  const html = `<body style="margin:0;background:#fff;font-family:sans-serif"><div style="display:flex;flex-wrap:wrap;gap:12px;padding:14px;width:${SW - 28}px">${sw}</div>
  <div style="position:relative;width:${SW}px;height:${SH}px;background:#eef3f9;outline:1px solid #ccd">${wire}</div></body>`
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: SW, height: SH + 200 } })
  await pg.setContent(html); await pg.screenshot({ path: fileURLToPath(new URL('./out/design.png', import.meta.url)), fullPage: true }); await b.close()
  console.log('design sheet written: shop/out/design.png')
}
