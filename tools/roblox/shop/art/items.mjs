// Item art for the shop, drawn as clean sticker-style SVG (160 x 160, 10 px margin).
// Construction, so no outline is ever out of place:
//   1. outline pass: every silhouette part filled and stroked in ink at 2x width (one merged outer outline);
//   2. fill pass: the same parts filled with their gradients, no stroke (internal seams vanish);
//   3. details (shading, highlights, seam lines) clipped inside the part they belong to.
// Usage: node shop/art/items.mjs   -> shop/art/items/*.svg (then node shop/art/render.mjs)
import { writeFileSync, mkdirSync } from 'node:fs'

const INK = '#22174a', OUT = 10   // outline pass width: 5 px shows outside the fill
let uid = 0
function item(parts, { rotate = 0, scale = 1, extras = '', defs = '' } = {}) {
  // parts: [{ d (path) | shape (raw svg element without fill), fill, clip details }]
  const el = p => p.d ? `<path d="${p.d}"/>` : p.shape
  const ids = parts.map(() => 'c' + ++uid)
  const outline = parts.map(p => el(p)).join('')
  // edge: the part sits inside the silhouette (lid on a box, sole under a shoe), so it gets its own 3 px edge line
  const fills = parts.map((p, i) => `<g fill="${p.fill}">${el(p)}</g>` + (p.inner ? `<g clip-path="url(#${ids[i]})">${p.inner}</g>` : '') +
    (p.edge ? `<g fill="none" stroke="${INK}" stroke-width="3">${el(p)}</g>` : '')).join('')
  const clips = parts.map((p, i) => `<clipPath id="${ids[i]}">${el(p)}</clipPath>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs>${clips}${defs}</defs>
<g transform="translate(80 80) scale(${scale}) rotate(${rotate}) translate(-80 -80)" stroke-linejoin="round" stroke-linecap="round">
<g fill="${INK}" stroke="${INK}" stroke-width="${OUT}">${outline}</g>${fills}${extras}</g></svg>`
}
const lin = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`
const rad = (id, stops, cx = 0.35, cy = 0.3, r = 0.8) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`
const glint = (x, y, rx = 5, ry = 3.5, a = 0.95, r = -30) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${a}" transform="rotate(${r} ${x} ${y})"/>`
const seam = (d, w = 3) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}"/>`
// 4-point sparkle with its own outline, placed where it touches nothing else
const sparkle = (x, y, r, c = '#fff8c8') => `<path d="M${x} ${y - r}Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${c}" stroke="${INK}" stroke-width="2.5"/>`

const ART = {}

// ---- Speed Boots: high-top sneaker facing right, heel wing, speed lines ----
ART.boots = item([
  { d: 'M40 60C26 58 14 48 12 30C20 36 26 37 30 35C26 28 26 20 28 14C36 24 44 30 54 34Z', fill: 'url(#bWing)',
    inner: seam('M22 34C30 42 38 46 48 48', 2.5) + seam('M26 22C34 32 42 38 52 40', 2.5) },
  { edge: true, d: 'M44 40Q44 32 52 32L76 32Q84 32 86 40L90 64Q116 68 130 80Q140 88 138 98L136 104L36 104Q30 104 30 98L32 54Q32 44 44 40Z', fill: 'url(#bBody)',
    inner: `<path d="M30 76Q80 82 140 70L140 110L30 110Z" fill="#0f7a2a" opacity=".35"/>` +
      `<path d="M50 88Q86 86 116 66L122 74Q90 98 52 100Z" fill="url(#bStripe)"/>` + seam('M50 88Q86 86 116 66M52 100Q90 98 122 74', 2.5) +
      `<path d="M96 70Q120 72 134 84Q138 90 138 96L104 96Q96 84 96 70Z" fill="#a6ff6e" opacity=".55"/>` + seam('M96 70Q98 86 104 98', 2.5) +
      `<path d="M44 40Q44 32 52 32L76 32Q84 32 86 40L86 46L44 46Z" fill="#ffffff" opacity=".9"/>` + seam('M44 46L86 46', 2.5) +
      [52, 60, 68].map(y => `<path d="M68 ${y}L84 ${y - 2}" stroke="#ffffff" stroke-width="5"/>` + seam(`M68 ${y}L84 ${y - 2}`, 1.6)).join('') +
      glint(56, 58, 6, 3.5) + glint(118, 80, 5, 3, 0.85, 20) },
  { d: 'M26 100L140 100Q148 100 146 108L144 114Q142 120 134 120L36 120Q26 120 26 110Z', fill: 'url(#bSole)', edge: true,
    inner: [44, 62, 80, 98, 116].map(x => seam(`M${x} 112L${x + 8} 116`, 2.5)).join('') + `<rect x="20" y="100" width="130" height="5" fill="#fff" opacity=".7"/>` }
], { rotate: -4, scale: 0.97,
  defs: lin('bWing', [[0, '#ffffff'], [1, '#bfe6ff']]) + lin('bBody', [[0, '#a6ff6e'], [0.5, '#3fdc4a'], [1, '#1fb03a']]) + lin('bStripe', [[0, '#fff27a'], [1, '#ffb703']]) + lin('bSole', [[0, '#ffffff'], [1, '#b9c8e6']]),
  extras: [[10, 82, 18], [8, 94, 16], [14, 106, 12]].map(([x, y, l]) => `<path d="M${x} ${y}L${x + l} ${y}" stroke="${INK}" stroke-width="9"/><path d="M${x} ${y}L${x + l} ${y}" stroke="#7fe3ff" stroke-width="4"/>`).join('') })

// ---- Lucky Clover: four heart leaves around one centre, merged outline, stem behind ----
const leaf = 'M80 80C68 72 54 64 54 48C54 38 61 32 68 32C74 32 78 36 80 41C82 36 86 32 92 32C99 32 106 38 106 48C106 64 92 72 80 80Z'
ART.clover = item([
  { d: 'M88 86Q104 112 120 128L126 122Q110 108 96 80Z', fill: 'url(#cLeaf)' },
  ...[0, 90, 180, 270].map(r => ({ shape: `<path d="${leaf}" transform="rotate(${r} 80 80)"/>`, fill: 'url(#cLeaf)',
    inner: `<g transform="rotate(${r} 80 80)"><path d="M80 80C70 70 60 62 58 48L66 40C68 56 74 68 80 80Z" fill="#a6ff6e" opacity=".55"/>` +
      `<path d="M80 78C84 64 92 52 102 44L106 50C100 62 92 72 80 80Z" fill="#0f7a2a" opacity=".3"/>` + glint(66, 44, 5, 3.2) + `</g>` }))
], { rotate: 8, scale: 0.95, defs: lin('cLeaf', [[0, '#a6ff6e'], [0.5, '#3fdc4a'], [1, '#17a83a']]),
  extras: [45, 135, 225, 315].map(r => `<path d="M80 80L80 66" transform="rotate(${r} 80 80)" fill="none" stroke="${INK}" stroke-width="3"/>`).join('') +
    `<circle cx="80" cy="80" r="6" fill="#17a83a" stroke="${INK}" stroke-width="3"/>` +
    sparkle(132, 36, 11) + sparkle(30, 122, 8) })

// ---- Mega Potion: round flask, purple liquid with bubbles, cork ----
ART.potion = item([
  { d: 'M68 12Q68 8 72 8L88 8Q92 8 92 12L92 30L68 30Z', fill: 'url(#pCork)', edge: true, inner: seam('M74 14L74 26M82 12L82 26', 2) + glint(76, 14, 3, 2, 0.6) },
  { d: 'M60 30Q60 26 64 26L96 26Q100 26 100 30L100 38Q100 42 96 42L64 42Q60 42 60 38Z', fill: 'url(#pGlass)', edge: true, inner: glint(70, 31, 6, 2.5) },
  { d: 'M68 40L92 40L92 60Q124 70 124 104Q124 146 80 146Q36 146 36 104Q36 70 68 60Z', fill: 'url(#pGlass)',
    inner: `<path d="M30 96Q56 86 80 96Q104 106 130 94L130 150L30 150Z" fill="url(#pLiquid)"/>` + seam('M30 96Q56 86 80 96Q104 106 130 94', 3) +
      [[62, 116, 8], [90, 124, 6], [100, 108, 4], [74, 132, 4.5], [56, 104, 3.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e7cfff" stroke="${INK}" stroke-width="2.2"/>` + glint(x - r * 0.35, y - r * 0.35, r * 0.35, r * 0.25, 0.9)).join('') +
      `<path d="M30 120Q80 160 130 120L130 150L30 150Z" fill="#3d1270" opacity=".35"/>` +
      `<path d="M50 78Q44 90 46 104" fill="none" stroke="#fff" stroke-width="6" opacity=".85"/>` + glint(56, 72, 5, 3) +
      `<circle cx="104" cy="74" r="4" fill="#fff" opacity=".7"/><circle cx="112" cy="84" r="2.5" fill="#fff" opacity=".7"/>` }
], { rotate: 6, scale: 0.88,
  defs: lin('pCork', [[0, '#e8b27a'], [1, '#a8662e']]) + lin('pGlass', [[0, '#f4fcff'], [1, '#b9e4ff']]) + lin('pLiquid', [[0, '#d9a8ff'], [0.5, '#a56bff'], [1, '#7b3fe0']]) })

// ---- Golden Shovel: T-grip, wooden shaft, metal collar, gold spade blade ----
ART.shovel = item([
  { d: 'M54 14Q54 8 60 8L100 8Q106 8 106 14L106 20Q106 26 100 26L60 26Q54 26 54 20Z', fill: 'url(#sWood)', inner: seam('M62 14L96 14', 2) + glint(64, 12, 5, 2.2, 0.7) },
  { d: 'M72 24L88 24L88 86L72 86Z', fill: 'url(#sWood)', edge: true, inner: seam('M78 30L78 50M82 56L82 80', 2) + `<rect x="84" y="24" width="4" height="62" fill="#6b3a14" opacity=".35"/>` },
  { d: 'M66 82Q66 78 70 78L90 78Q94 78 94 82L94 96Q94 100 90 100L70 100Q66 100 66 96Z', fill: 'url(#sMetal)', edge: true, inner: seam('M66 89L94 89', 2) + glint(72, 82, 4, 2) },
  { d: 'M46 100Q80 94 114 100L112 122Q106 144 80 152Q54 144 48 122Z', fill: 'url(#sGold)', edge: true,
    inner: `<path d="M80 98L80 152L120 152L120 98Z" fill="#b86b00" opacity=".28"/>` + seam('M80 104L80 144', 3) +
      `<path d="M56 108Q58 126 70 138" fill="none" stroke="#fff" stroke-width="5" opacity=".85"/>` + glint(60, 106, 6, 3) }
], { rotate: 20, scale: 0.86,
  defs: lin('sWood', [[0, '#e0a060'], [1, '#9c5a26']], 1, 0) + lin('sMetal', [[0, '#f4f8ff'], [1, '#8d99ad']]) + lin('sGold', [[0, '#fff27a'], [0.5, '#ffc21a'], [1, '#e88f00']]) })

// ---- Rainbow Trail: rainbow tube ending in a star ----
const arc = 'M24 136Q64 132 96 76'
const bands = [['#ff4b5c', 40], ['#ff9d2e', 32], ['#ffe14d', 24], ['#3fdc4a', 16], ['#3aa0ff', 8]]
ART.trail = item([
  { shape: `<path d="${arc}" fill="none" stroke-width="${40 + OUT}"/>`, fill: 'none' },
  { d: 'M112 18L121 38L143 40L126 55L131 77L112 66L93 77L98 55L81 40L103 38Z', fill: 'url(#tStar)', edge: true,
    inner: `<path d="M112 18L112 66L131 77L126 55L143 40L121 38Z" fill="#e88f00" opacity=".3"/>` + glint(104, 42, 6, 3.5) + glint(112, 30, 3, 2) }
], { rotate: 0, scale: 0.86,
  defs: lin('tStar', [[0, '#fff6a8'], [1, '#ffc21a']]),
  extras: '' })
// the bands go between the outline pass and the star: rebuild with them in place
ART.trail = ART.trail.replace(`<g fill="url(#tStar)">`, bands.map(([c, w]) => `<path d="${arc}" fill="none" stroke="${c}" stroke-width="${w}"/>`).join('') + `<path d="M30 128Q60 124 84 86" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/><g fill="url(#tStar)">`)
  .replace('</g></svg>', sparkle(140, 108, 9) + sparkle(64, 40, 8, '#ffffff') + sparkle(28, 96, 6) + '</g></svg>')

// ---- Mystery Gift: lid + box, one ribbon over both, bow, a ? sticker ----
ART.gift = item([
  { d: 'M62 50C48 34 38 40 42 48C46 56 58 56 74 54Z', fill: 'url(#gGold)', inner: glint(48, 46, 4, 2.5) },
  { d: 'M98 50C112 34 122 40 118 48C114 56 102 56 86 54Z', fill: 'url(#gGold)', inner: glint(110, 44, 4, 2.5) },
  { d: 'M36 78L124 78L124 136Q124 142 118 142L42 142Q36 142 36 136Z', fill: 'url(#gBox)',
    inner: `<rect x="70" y="78" width="20" height="64" fill="url(#gGold)"/>` + seam('M70 78L70 142M90 78L90 142', 2.5) +
      `<path d="M100 78L124 78L124 142L100 142Z" fill="#9c1a78" opacity=".25"/>` + `<rect x="36" y="78" width="88" height="8" fill="#9c1a78" opacity=".35"/>` },
  { d: 'M30 60Q30 54 36 54L124 54Q130 54 130 60L130 74Q130 80 124 80L36 80Q30 80 30 74Z', fill: 'url(#gLid)', edge: true,
    inner: `<rect x="70" y="54" width="20" height="26" fill="url(#gGold)"/>` + seam('M70 54L70 80M90 54L90 80', 2.5) + glint(42, 60, 7, 2.6) + `<rect x="30" y="72" width="100" height="8" fill="#9c1a78" opacity=".3"/>` },
  { shape: '<circle cx="80" cy="52" r="9"/>', fill: 'url(#gGold)', edge: true, inner: glint(77, 49, 3, 2) },
  { shape: '<circle cx="80" cy="112" r="20"/>', fill: '#ffffff', edge: true,
    inner: `<text x="80" y="124" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="34" fill="#f04bbf" stroke="${INK}" stroke-width="2">?</text>` }
], { rotate: -6, scale: 0.94,
  defs: lin('gGold', [[0, '#fff27a'], [1, '#ffb703']]) + lin('gBox', [[0, '#ff9ce6'], [0.6, '#f04bbf'], [1, '#c22a95']]) + lin('gLid', [[0, '#ffc2f0'], [1, '#ff6fd0']]) })


// ---- Cart (shop title icon): basket with wheels, handle bar, a coin peeking out ----
ART.cart = item([
  { d: 'M14 34L34 34L40 46L140 46Q148 46 146 54L136 98Q134 106 126 106L56 106Q48 106 46 98L32 44L14 44Q8 44 8 39Q8 34 14 34Z', fill: 'url(#kBody)', edge: true,
    inner: [64, 84, 104, 124].map(x => seam(`M${x} 54L${x - 4} 98`, 2.5)).join('') + seam('M44 76L140 76', 2.5) + `<rect x="30" y="86" width="120" height="24" fill="#108a2c" opacity=".35"/>` + glint(56, 52, 7, 3) },
  { shape: '<circle cx="62" cy="126" r="12"/>', fill: '#ffffff', edge: true, inner: `<circle cx="62" cy="126" r="4" fill="#22174a"/>` },
  { shape: '<circle cx="120" cy="126" r="12"/>', fill: '#ffffff', edge: true, inner: `<circle cx="120" cy="126" r="4" fill="#22174a"/>` },
  { shape: '<circle cx="100" cy="36" r="16"/>', fill: 'url(#kCoin)', edge: true, inner: `<circle cx="100" cy="36" r="9" fill="none" stroke="#c76a00" stroke-width="2.5"/>` + glint(94, 30, 4, 2.5) }
], { rotate: -6, scale: 0.92, defs: lin('kBody', [[0, '#9dff00'], [0.5, '#3dff1a'], [1, '#00d42a']]) + lin('kCoin', [[0, '#fff38a'], [1, '#ffb800']]) })

// ---- Star (HOT tab icon): fat rounded star with a face-on bevel ----
ART.star = item([
  { d: 'M80 14Q86 14 89 22L100 48L128 51Q137 52 138 60Q138 66 132 71L111 90L117 118Q119 127 112 131Q106 134 99 129L80 115L61 129Q54 134 48 131Q41 127 43 118L49 90L28 71Q22 66 22 60Q23 52 32 51L60 48L71 22Q74 14 80 14Z', fill: 'url(#sStar)',
    inner: `<path d="M80 14L80 115L99 129Q106 134 112 131Q119 127 117 118L111 90L132 71Q138 66 138 60L100 48L89 22Q86 14 80 14Z" fill="#ff8a00" opacity=".3"/>` + glint(66, 46, 8, 4) + glint(80, 30, 4, 2.5) }
], { rotate: 8, scale: 0.92, defs: lin('sStar', [[0, '#fff38a'], [0.5, '#ffd000'], [1, '#ff9500']]),
  extras: sparkle(140, 26, 10) + sparkle(22, 124, 8) })

mkdirSync(new URL('./items/', import.meta.url), { recursive: true })
// coloured line art (owner rule: no black or near-black outlines): each item's lines are a deep shade of its own hue
const LINE = { boots: '#0f7a2a', clover: '#0f7a2a', potion: '#5a1fb3', shovel: '#b35a00', trail: '#a3002a', gift: '#a3006e', cart: '#0f7a2a', star: '#c25a00' }
for (const [k, svg] of Object.entries(ART)) writeFileSync(new URL(`./items/${k}.svg`, import.meta.url), svg.replaceAll(INK, LINE[k] || '#3a1fd6'))
console.log('wrote', Object.keys(ART).join(', '))
