import { fileURLToPath } from 'node:url'
// Three type directions for the shop, rendered side by side for the owner to choose from before any rebuild.
// Body fonts are ones Studio's Interface mode renders live (studio-plugins/ui.js FONTS); headlines become images.
// Usage: node shop/design/type-directions.mjs  -> shop/out/type-directions.png
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
const art = id => JSON.parse(readFileSync(new URL(`../out/tex/${id}.json`, import.meta.url))).data
const boots = art('sh-boots'), coin = art('sh-coin'), potion = art('sh-potion')
const fonts = ['Bungee', 'Bungee+Shade', 'Montserrat:wght@900', 'Chango', 'Titan+One', 'Permanent+Marker', 'Rubik+Mono+One', 'Oswald:wght@500;700']
const INK = '#22174a'
const html = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts.map(f => 'family=' + f).join('&')}&display=block">
<style>
body{margin:0;background:#140558;display:flex;gap:22px;padding:22px;font-family:sans-serif}
.col{width:300px}.cap{color:#fff;font:700 15px Montserrat;margin:10px 0 4px}.sub{color:#b9a8ff;font:500 12px Montserrat;line-height:1.35}
.card{position:relative;width:300px;height:330px;border-radius:22px;overflow:hidden;border:4px solid ${INK}}
/* A: arcade marquee */
.a{background:linear-gradient(#ffb31a,#ff8c00 45%,#ff5e00)}
.a .head{position:absolute;left:14px;top:12px;font:44px 'Bungee Shade';color:#fff;line-height:1;letter-spacing:1px;text-shadow:0 0 14px #ffe600}
.a .art{position:absolute;right:6px;top:66px;width:150px}
.a .big{position:absolute;left:16px;top:84px;font:52px Bungee;color:#fff;line-height:.9;text-shadow:4px 4px 0 #b33a00}
.a .small{position:absolute;left:18px;top:136px;font:900 15px Montserrat;letter-spacing:4px;color:${INK}}
.a .plate{position:absolute;left:0;right:0;bottom:70px;height:40px;background:linear-gradient(#e9eef7,#9aa7bf);border-top:3px solid ${INK};border-bottom:3px solid ${INK};display:flex;align-items:center;padding-left:16px;font:900 18px Montserrat;letter-spacing:2px;color:${INK}}
.a .plate i{display:inline-block;width:8px;height:8px;border-radius:50%;background:${INK};margin-right:10px}
.a .ticket{position:absolute;left:16px;bottom:14px;height:44px;padding:0 18px 0 50px;background:#3dff1a;border:3px solid ${INK};font:28px Bungee;color:${INK};display:flex;align-items:center;
  -webkit-mask:radial-gradient(circle 8px at 0 50%,#0000 98%,#000) left/51% 100% no-repeat,radial-gradient(circle 8px at 100% 50%,#0000 98%,#000) right/51% 100% no-repeat}
.a .ticket img{position:absolute;left:8px;width:34px}
.a .tag{position:absolute;right:14px;bottom:20px;font:20px Bungee;color:#fff200;border:3px dashed #fff200;padding:2px 10px;transform:rotate(6deg);border-radius:8px}
/* B: toy-box sticker */
.b{background:radial-gradient(circle at 70% 30%,#ff66dd,#ff00b3 45%,#d6008f)}
.b .head{position:absolute;left:14px;top:14px;font:40px Chango;color:#fff;line-height:1;text-shadow:3px 3px 0 #33ccff,6px 6px 0 ${INK}}
.b .art{position:absolute;left:70px;top:70px;width:160px;transform:rotate(-8deg)}
.b .sticker{position:absolute;left:16px;bottom:92px;background:#fff;padding:6px 14px;border-radius:14px;box-shadow:0 0 0 4px ${INK};transform:rotate(-5deg);font:24px 'Titan One';color:#ff00b3}
.b .note{position:absolute;right:18px;top:96px;font:22px 'Permanent Marker';color:#fff200;transform:rotate(12deg)}
.b .note:after{content:'';position:absolute;left:-34px;top:14px;width:28px;height:3px;background:#fff200;transform:rotate(25deg)}
.b .stat{position:absolute;left:18px;bottom:62px;font:20px 'Titan One';color:#fff}.b .stat b{font-size:30px;color:#fff200}
.b .gun{position:absolute;right:14px;bottom:14px;width:120px;height:56px;background:#ff8c00;border-radius:12px 28px 28px 12px;box-shadow:0 0 0 4px ${INK},0 6px 0 4px ${INK};display:flex;align-items:center;justify-content:flex-end;padding-right:18px;font:30px 'Titan One';color:#fff;transform:rotate(-4deg)}
.b .gun:before{content:'';position:absolute;left:12px;width:14px;height:14px;border-radius:50%;background:#140558;box-shadow:0 0 0 3px #fff}
/* C: lab blueprint */
.c{background:linear-gradient(#0a9dff,#0062ff);background-image:linear-gradient(#ffffff22 1px,transparent 1px),linear-gradient(90deg,#ffffff22 1px,transparent 1px),linear-gradient(#0a9dff,#0062ff);background-size:20px 20px,20px 20px,100% 100%}
.c .head{position:absolute;left:16px;top:14px;font:24px 'Rubik Mono One';color:#fff;line-height:1.05}
.c .id{position:absolute;left:18px;top:70px;font:700 14px Oswald;letter-spacing:3px;color:#33ffd6}
.c .art{position:absolute;right:10px;top:58px;width:140px;filter:drop-shadow(0 0 12px #33ffd6)}
.c .spec{position:absolute;left:18px;top:104px;width:130px;font:500 15px Oswald;color:#fff;letter-spacing:1px}
.c .bar{height:12px;background:#0036b3;border:2px solid ${INK};border-radius:6px;margin:4px 0 10px;overflow:hidden}.c .bar i{display:block;height:100%;background:#9dff00}
.c .stamp{position:absolute;right:18px;top:190px;font:24px 'Rubik Mono One';color:#ff1a55;border:4px solid #ff1a55;padding:2px 8px;transform:rotate(-14deg);border-radius:6px;opacity:.95}
.c .buy{position:absolute;left:16px;right:16px;bottom:16px;height:52px;background:#3dff1a;border:3px solid ${INK};border-radius:12px;box-shadow:0 6px 0 #008a1f;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font:700 24px Oswald;color:${INK};letter-spacing:1px;white-space:nowrap}
.c .buy span{display:flex;align-items:center;gap:6px}.c .buy img{width:34px}
</style>
<div class="col"><div class="card a"><div class="head">SHOP</div><img class="art" src="${boots}"><div class="big">+20%</div><div class="small">RUN SPEED</div>
<div class="plate"><i></i>SPEED BOOTS</div><div class="ticket"><img src="${coin}">250</div><div class="tag">FAST</div></div>
<div class="cap">A · Arcade marquee</div><div class="sub">Neon sign headlines (Bungee Shade). Big stat number with small caps under it. Name on a riveted metal plate, price on a notched ticket stub. Body in Montserrat Black, no outlines.</div></div>
<div class="col"><div class="card b"><div class="head">SHOP!</div><img class="art" src="${potion}"><div class="note">so fizzy!</div>
<div class="sticker">Mega Potion</div><div class="stat"><b>+50</b> health</div><div class="gun">600</div></div>
<div class="cap">B · Toy-box sticker</div><div class="sub">Chunky Chango headline with a two-colour offset shadow (cyan, then ink), no black outline. Names on tilted die-cut stickers, hand-written marker callouts with arrows, prices on price-gun tags. Body in Titan One.</div></div>
<div class="col"><div class="card c"><div class="head">GADGET<br>LAB</div><div class="id">ITEM 01 / FOOTWEAR</div><img class="art" src="${boots}">
<div class="spec">SPEED<div class="bar"><i style="width:70%"></i></div>JUMP<div class="bar"><i style="width:35%"></i></div></div><div class="stamp">NEW</div>
<div class="buy"><span>SPEED BOOTS</span><span><img src="${coin}">250</span></div></div>
<div class="cap">C · Gadget lab blueprint</div><div class="sub">Blueprint grid, Rubik Mono headline, item codes and stat bars like a spec sheet, a red rubber-stamp NEW. Condensed Oswald body, left-aligned, no outlines. Fits the "gadget" theme.</div></div>`
const b = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined, args: ['--ignore-certificate-errors'] })
const p = await b.newPage({ viewport: { width: 1010, height: 470 }, deviceScaleFactor: 2 })
await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800)
await p.screenshot({ path: fileURLToPath(new URL('../out/type-directions.png', import.meta.url)), fullPage: true }); await b.close()
console.log('shop/out/type-directions.png')
