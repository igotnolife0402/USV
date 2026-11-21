import { fileURLToPath, pathToFileURL } from 'node:url'
// Gadget Shop GUI v9: every frame wears a hand-made skin from shop/art/kit.mjs (craft level). v8: cash-grab with a twist (TYPE in design.mjs). Earlier notes, v5: bubbly candy shop for Studio's Interface mode (studio-plugins/ui.js gui objects).
// Every colour comes from PAL and every box from LAYOUT in shop/design.mjs (palette and layout first); the build
// stops if any colour is not in the palette, and shop/preview.mjs fails if any element overlaps another.
// v5: 3-stop gradients everywhere, lots of motion (rays, floats, sparkles, glows, shakes, pulses, shines,
// hover growth), and nothing overlaps: art, tags and buttons each own their space inside their card.
// Usage: node shop/design.mjs && node shop/art/items.mjs && node shop/art/render.mjs && node shop/build.mjs
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { PAL, LAYOUT as L, TYPE, allColours, vividCheck } from './design.mjs'

export const PROJECT_ID = 'shop-gui-7b3e'
export const NAME = 'Gadget Shop GUI'

const NEW = {
  screen: { p: [0, 0, 0, 0], s: [1, 0, 1, 0], a: [0, 0], bga: 1 },
  frame: { s: [0, 320, 0, 220], cr: 10 },
  text: { s: [0, 240, 0, 50], bga: 1, text: 'Label', ts: 36, tc: PAL.white },
  button: { s: [0, 200, 0, 64], cr: 14, text: '', ts: 30, tc: PAL.white },
  image: { s: [0, 120, 0, 120], bga: 1, it: 'fit' }
}
const INK = PAL.ink   // fallback line colour only; v10 uses each element's own deep shade (no dark tones)
// Background layers share their parent's box on purpose; the overlap check skips them (see preview.mjs).
export const LAYER_NAMES = ['Rays', 'Highlight', 'Bubbles', 'Glow', 'Dim', 'Strike', 'Skin']

export function buildShop() {
  const objects = {}, stageOf = {}, stages = [], kids = {}
  let n = 0, stage = null
  const startStage = s => { stage = s; stages.push(s) }
  const add = (kind, name, fields = {}, parent = null) => {
    const id = `shop-${++n}`
    kids[parent] = (kids[parent] || 0) + 1
    objects[id] = { type: 'gui', kind, name, ...structuredClone(NEW[kind]), ...fields, parent, order: kids[parent] - 1 }
    stageOf[id] = stage
    return id
  }
  const at = (x, y, w, h) => ({ p: [0, x, 0, y], a: [0, 0], s: [0, w, 0, h] })
  const fill = () => ({ p: [0, 0, 0, 0], a: [0, 0], s: [1, 0, 1, 0] })
  const text = (parent, name, s, extra) => add('text', name, { ...fill(), text: s, ts: 20, font: TYPE.body, tc: PAL.white, tsk: null, tds: { c: PAL.window[3], y: 2 }, ...extra }, parent)
  const img = (parent, name, tex, x, y, size, extra = {}) => add('image', name, { ...at(x, y, size, size), img: tex, ...extra }, parent)
  const rays = (parent, x, y, w, h, cr, speed, alpha = 0.3, rayCount = 14) => add('frame', 'Rays', { ...at(x, y, w, h), bga: 1, cr, bgfx: { type: 'sunburst', rays: rayCount, c: PAL.white, alpha, speed, fade: 0.55 } }, parent)
  const HOVER = [{ type: 'hover', scale: 1.07 }, { type: 'press', scale: 0.9 }]
  // Craft level: every frame wears a hand-made skin image (shop/art/kit.mjs) that already holds its outline,
  // lip, gloss, rim and texture, so the element itself is transparent with no stroke or shadow.
  function skinned(kind, name, x, y, w, h, skin, parent, { cr = 12, fx = [], extra = {} } = {}) {
    const e = add(kind, name, { ...at(x, y, w, h), bga: 1, cr, fx, ...extra }, parent)
    add('image', 'Skin', { ...fill(), img: skin, it: 'stretch' }, e)
    return e
  }
  // green price button (green = buy): coin and amount centred on the face (face = height minus the 5 px lip)
  function priceButton(parent, price, x, y, w, h, skin, gap, ts = 26) {
    const b = skinned('button', 'BuyButton', x, y, w, h, skin, parent, { cr: Math.round(h / 2), fx: [...HOVER, { type: 'shine', dur: 0.9, gap, angle: 25, width: 24, alpha: 0.6 }] })
    const fh = h - 5
    img(b, 'Coin', 'sh-coin', 6, (fh - (fh - 6)) / 2, fh - 6)
    text(b, 'Price', price, { ...at(fh, 0, w - fh - 6, fh), ts, tc: PAL.white, tds: { c: PAL.buy[3], y: 2 } })
    return b
  }
  // plate: one line of body text on an inset (or red) skin, no outline
  function plate(parent, name, s, x, y, w, h, skin, { ts = 15, tc = PAL.cream, fx = [], ta = 'center', lip = 0 } = {}) {
    const f = skinned('frame', name, x, y, w, h, skin, parent, { cr: h / 2, fx })
    text(f, 'Text', s, { ...at(0, 0, w, h - lip), ts, tc, ta, tds: null })
    return f
  }
  // item art with a soft round glow behind it and sparkles; floats gently (k staggers loops so nothing pulses together)
  function art(parent, tex, x, y, size, k, sparkleCount = 4, sparkleSize = 15) {
    add('frame', 'Glow', { ...at(x + size * 0.2, y + size * 0.2, size * 0.6, size * 0.6), bga: 1, cr: size * 0.3, fx: [{ type: 'glow', c: PAL.title[0], size: size * 0.5, pulse: 1.4 + 0.3 * k }] }, parent)
    return img(parent, 'Art', tex, x, y, size, { fx: [{ type: 'float', amp: 3, period: 2.4, phase: 0.25 * k }, { type: 'sparkles', count: sparkleCount, c: PAL.white, size: sparkleSize, period: 1.5 + 0.2 * k }] })
  }

  // ---- 1. Screen, dim and window ----
  startStage('Window')
  const scr = add('screen', 'ShopGui')
  add('frame', 'Dim', { ...fill(), bg: PAL.dim, bga: 0.6, cr: 0, bgfx: { type: 'pattern', shape: 'stars', c: PAL.white, alpha: 0.08, tile: 60, dx: 12, dy: 8, rot: 0 } }, scr)
  const Wn = L.window
  const win = add('frame', 'ShopWindow', { p: [0.5, 0, 0.5, Wn.dy], a: [0.5, 0.5], s: [0, Wn.w, 0, Wn.h], bga: 1, cr: Wn.cr, fx: [{ type: 'popin', dur: 0.42 }] }, scr)
  add('image', 'Skin', { ...fill(), img: 'sk-window', it: 'stretch' }, win)
  const P = L.panel
  const panel = skinned('frame', 'Panel', P.x, P.y, P.w, P.h, 'sk-panel', win, { cr: P.cr })

  // ---- 2. Header: cart + SHOP headline, HOT DEALS, coin bar ----
  startStage('Header')
  const T = L.title
  img(win, 'Cart', 'sh-cart', T.x, T.y, 50, { fx: [{ type: 'wiggle', amp: 10, every: 3.5 }] })
  img(win, 'ShopTitle', 'sh-h-shop', T.x + 56, T.y - 1, 150, { s: [0, 150, 0, 52], fx: [{ type: 'pulse', amp: 0.04, period: 1.8 }] })
  const D = L.deals
  add('image', 'Deals', { ...at(D.x, D.y, D.w, D.h), img: 'sh-h-deals', fx: [{ type: 'pulse', amp: 0.05, period: 1.4 }] }, win)
  const C = L.coins
  const bar = skinned('frame', 'CoinBar', C.x, C.y, C.w, C.h, 'sk-coinbar', win, { cr: 16 })
  img(bar, 'Coin', 'sh-coin', 6, 6, 42, { fx: [{ type: 'wiggle', amp: 14, every: 3 }, { type: 'glow', c: PAL.coin, size: 10, pulse: 1.6 }] })
  text(bar, 'Amount', '12,450', { ...at(54, 0, 104, C.h), ts: 28, ta: 'left', tc: PAL.title[0], fx: [{ type: 'countup', dur: 1.2, hold: 6 }] })
  const plus = skinned('button', 'AddCoins', C.w - 47, 7, 40, 40, 'sk-plus', bar, { cr: 12, fx: [...HOVER, { type: 'pulse', amp: 0.06, period: 1.2 }] })
  text(plus, 'Plus', '+', { ...at(0, 0, 40, 35), ts: 24, tc: PAL.white, tds: { c: PAL.buy[3], y: 2 } })

  // ---- 3. Category tabs (blue = headers); the open one is tangerine and glows ----
  startStage('Tabs')
  const TB = L.tabs
  ;[['HOT', 'sh-star', true], ['ITEMS', 'sh-boots'], ['COINS', 'sh-coin']].forEach(([label, icon, on], i) => {
    const t = skinned('button', label + ' tab', TB.x, TB.y + i * (TB.h + TB.gap), TB.w, TB.h, on ? 'sk-tab-on' : 'sk-tab-off', win,
      { cr: TB.cr, fx: [...HOVER, ...(on ? [{ type: 'glow', c: PAL.tangerine[1], size: 16, pulse: 1.4 }] : [{ type: 'pulse', amp: 0.04, period: 1.6 + 0.5 * i }])] })
    img(t, 'Icon', icon, (TB.w - 36) / 2, 3, 36, { fx: [{ type: 'float', amp: 2, period: 2, phase: i * 0.3 }] })
    text(t, 'Label', label, { ...at(2, 40, TB.w - 4, 18), ts: 15 })
  })

  // ---- 4. Hero bundle: burst under a skin overlay (outline, gloss, rim), giant -30%, gold halo ----
  startStage('Hero bundle')
  const Hh = L.hero, Hi = L.heroIn, HF = Hh.h - 6
  const hero = add('button', 'Mega Bundle', { ...at(Hh.x, Hh.y, Hh.w, Hh.h), bga: 1, cr: Hh.cr, fx: [{ type: 'popin', dur: 0.38, delay: 0.25 }, { type: 'hover', scale: 1.04 }, { type: 'press', scale: 0.95 }, { type: 'glow', c: PAL.sunny[0], size: 18, pulse: 0 }, { type: 'glow', c: PAL.sunny[1], size: 52, pulse: 1.8 }] }, panel)
  add('image', 'Rays', { ...at(0, 0, Hh.w, HF), img: 'sh-burst-bg', it: 'crop', cr: Hh.cr, clip: true }, hero)
  rays(hero, 0, 0, Hh.w, HF, Hh.cr, 12, 0.3, 16)
  add('image', 'Skin', { ...fill(), img: 'sk-hero', it: 'stretch' }, hero)
  plate(hero, 'Timer', 'ENDS 2:14:09', 8, Hi.chipY, 112, Hi.chipH, 'sk-chip', { tc: PAL.sunny[3], lip: 3 })
  plate(hero, 'Perk2', '+3 POTIONS', Hh.w - 8 - 112, Hi.chipY, 112, Hi.chipH, 'sk-chip', { tc: PAL.sunny[3], lip: 3 })
  add('image', 'Headline', { ...at(8, Hi.headY, Hh.w - 16, Hi.headH), img: 'sh-h-bundle', fx: [{ type: 'pulse', amp: 0.03, period: 2.1 }] }, hero)
  add('image', 'Off', { ...at(8, Hi.offY, 140, 60), img: 'sh-h-off', fx: [{ type: 'wiggle', amp: 6, every: 2.4 }] }, hero)
  art(hero, 'sh-shovel', Hi.artX, Hi.artY, Hi.art, 0, 8, 22)
  // was-price on a red plate with an ink strike, so it reads at a glance
  const was = plate(hero, 'WasPrice', 'WAS 2,800', 10, Hi.wasY, 112, 24, 'sk-was', { ts: 15, tc: PAL.close[2], lip: 3 })
  add('frame', 'Strike', { p: [0.5, 14, 0.5, -1], a: [0.5, 0.5], s: [0, 50, 0, 2], r: -8, bg: PAL.close[1], cr: 1 }, was)
  priceButton(hero, '2,000', 10, Hi.buyY, Hi.buyW, Hi.buyH, 'sk-buy-hero', 2.2, 24)
  plate(hero, 'Perk1', '+50% DIG', Hi.perkX, Hi.perkY, 102, 24, 'sk-chip-perk', { tc: PAL.sunny[3], lip: 3 })

  // ---- 5-7. Wide offer rows: art | name plate + giant stat with a small unit word | price ----
  const RW = L.rows, R = L.row, RF = RW.h - 6
  const offers = [
    ['SPEED BOOTS', 'sh-h-s1', 'SPEED', '250', 'sh-boots', PAL.tangerine, 'sk-row-tangerine'],
    ['LUCKY CLOVER', 'sh-h-s2', 'LUCK', '400', 'sh-clover', PAL.mint, 'sk-row-mint'],
    ['MEGA POTION', 'sh-h-s3', 'HEALTH', '600', 'sh-potion', PAL.bubblegum, 'sk-row-bubblegum', 'NEW']
  ]
  offers.forEach(([nm, stat, unit, price, tex, col, skin, isNew], i) => {
    startStage('Row ' + nm)
    const r = add('button', nm, { ...at(RW.x, RW.y + i * (RW.h + RW.gap), RW.w, RW.h), bga: 1, cr: RW.cr,
      fx: [{ type: 'popin', dur: 0.35, delay: 0.31 + i * 0.07 }, { type: 'hover', scale: 1.04 }, { type: 'press', scale: 0.95 }, { type: 'glow', c: col[1], size: 16, pulse: 1.5 + 0.35 * i }] }, panel)
    add('image', 'Skin', { ...fill(), img: skin, it: 'stretch' }, r)
    rays(r, 0, 0, 96, RF, RW.cr, i % 2 ? -10 : 10, 0.25, 12)
    art(r, tex, 10, (RF - R.art) / 2, R.art, i + 1, 2, 12)
    plate(r, 'NamePlate', nm, R.nameX, R.nameY, R.nameW, R.nameH, 'sk-plate-' + skin.slice(7), { ts: 15, tc: col[3], ta: 'left', lip: 3 })
    add('image', 'Stat', { ...at(R.nameX, R.statY, R.statW, R.statH), img: stat, fx: [{ type: 'pulse', amp: 0.05, period: 1.6 + 0.3 * i }] }, r)
    text(r, 'Unit', unit, { ...at(R.nameX + R.statW + 2, R.statY + 6, R.unitW, 22), ts: 17, ta: 'left', tc: PAL.white, tds: { c: col[3], y: 2 } })
    if (isNew) plate(r, 'NewStamp', 'NEW!', R.nameX + R.nameW + 6, R.nameY, 50, 22, 'sk-new', { tc: PAL.white, lip: 3, fx: [{ type: 'wiggle', amp: 8, every: 2 }] })
    priceButton(r, price, R.buyX, (RF - R.buyH + 5) / 2, R.buyW, R.buyH, 'sk-buy-row', 2.6 + i * 0.5, 24)
  })

  // ---- 8. Close (red = close) ----
  startStage('Close button')
  const X = L.close
  const x = skinned('button', 'Close', X.x, X.y, X.size, X.size, 'sk-close', win, { cr: X.cr, fx: [...HOVER, { type: 'wiggle', amp: 10, every: 4 }] })
  text(x, 'X', 'X', { ...at(0, 0, X.size, X.size - 6), ts: 32, tds: { c: PAL.close[3], y: 3 } })

  return { objects, stages, stageOf }
}

// Every colour in the build must be a palette colour (owner rule: no random colours).
export function checkPalette(objects) {
  const ok = new Set(allColours().map(c => c.toLowerCase())), bad = new Set()
  const walk = v => { if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) && !ok.has(v.toLowerCase())) bad.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk) }
  walk(objects)
  return [...bad]
}

const now = new Date().toISOString()
export function project(objects) {
  return { name: NAME, v: 1, updated: now, objects, anims: {}, textures: {},
    env: { light: 'day', look: 'roblox', bg: '#7ec8ff', fog: null, grid: false }, camera: { fov: 45, ortho: false, pos: [10, 8, 24], target: [0, 4, 0] } }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { objects, stages, stageOf } = buildShop()
  const dull = vividCheck()
  if (dull.length) { console.error('too dull for the toony style:', dull.join(', ')); process.exit(1) }
  const bad = checkPalette(objects)
  if (bad.length) { console.error('colours not in the palette:', bad.join(', ')); process.exit(1) }
  const out = fileURLToPath(new URL('./out/', import.meta.url)), live = out + 'live/'
  rmSync(live, { recursive: true, force: true }); mkdirSync(live, { recursive: true })   // keep out/tex (rendered art)
  writeFileSync(out + 'project.json', JSON.stringify(project(objects)))
  stages.forEach((st, k) => {
    const ids = Object.keys(objects).filter(id => stageOf[id] === st)
    // first write replaces the doc with only stage 1; later writes merge their objects in
    const doc = k === 0 ? project(Object.fromEntries(ids.map(id => [id, objects[id]]))) : { objects: Object.fromEntries(ids.map(id => [id, objects[id]])) }
    writeFileSync(live + String(k + 1).padStart(2, '0') + '-' + st.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json', JSON.stringify(doc))
  })
  const used = [...new Set(Object.values(objects).map(o => o.img).filter(Boolean))]
  console.log(`${Object.keys(objects).length} objects, ${stages.length} stages, palette check passed; textures: ${used.join(', ')}`)
}
