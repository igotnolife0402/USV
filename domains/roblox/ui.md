---
summary: Roblox UI quality bar (shops, HUDs, menus): palette+layout first, layer recipe, vivid colours, no overlaps, phone sizes, motion timings
updated: 2026-11-21
status: current
triggers: [roblox ui, roblox gui, shop gui, hud, screengui, menu, popup, button style, uistroke, uigradient]
---
# Roblox UI

Applies to every interface. Game-level rules: [game-design](domains/roblox/game-design.md). Tools that enforce parts of this: [tools/roblox/README.md](tools/roblox/README.md) (`shop/`). Owner rules dated 2026-11-18 unless noted.

## Process (in order)
1. "Build me a UI" means build it in Studio (instances), not a pile of scripts, unless scripts are asked for.
2. Collect references (polished simulator shops), then write a named palette (one job per colour) and a wireframe with exact boxes. Show both as an image before building.
3. Decide a type system with the palette: one display face for headlines (rendered as images, any font), one body face from Roblox's font list, one rule for where text sits. Offer 3 directions; owner picks.
4. Build only from the palette: the build fails on any colour not in it (`shop/build.mjs`).
5. Render at phone/PC/tablet and run the overlap check (`shop/preview.mjs`, PC) or Studio Device emulator, then run the shop simulations in [game-design](domains/roblox/game-design.md).
6. Start from a template (shop window, game button, currency pill, notification, animated background); never ship the default look.

## Layer recipe (button, header, card)
- Lip: darker solid copy 4-8 px down, 0 blur, deepest shade of the hue.
- Face: 3-stop vertical gradient within one hue (light top, mid, deep bottom), never flat.
- Outline: one 3 px outline (5 px on windows) in a deeper shade of the shape's own hue, never black. Same width everywhere.
- Highlights: white top band at transparency 0.75 plus tilted gloss bars clipped to the shape.
- Corners: ~10 px default; candy kids' style 20-30 px; pills = half height.
- Craft level ("a pro had 1 minute instead of hours"): every frame/card/button/tab is a hand-made skin image at its exact size (ink outline, hard lip, 3-stop face, gloss, inner shadow, inner rim, faint texture). No built-in glyph icons; every icon is drawn art.
- Spacing on an 8 px grid, equal margins in every container, edges and baselines aligned across rows.

## Detail floor
- One hero: a featured offer first and widest, then a few big cards with even gaps (a kid sees ~4 things, not 9). No uniform grid of small cards, no cramped bento.
- Title on a tab breaking the window's top edge (inside the window bounds), currency bar in the header, category folder tabs on the left (icon + 14 px label).
- Every card: painted item art 75-110 px inside the card, title in the display face, an effect line, a green price button with a coin.
- Texture on every face (stripes or studs), static rays behind art, faint themed tile pattern on windows.
- Value cues: NEW burst, -% tag, struck-through was-price, countdown chip.
- Item art: sticker-style SVG, one outline pass around the whole silhouette, then fills, then details clipped inside each part; 10 px margin (`shop/art/items.mjs`).

## Text
- Banned defaults: Fredoka One / Luckiest Guy, the same black outline on every line, everything centred. "Unique" means not like every other simulator.
- Outlines are a choice: headlines may get inline/offset/extrusion; body text sits on its own plate or tag, no outline.
- Size contrast 2-3x ("+20%" big, "SPEED" small).
- Nothing under 14 px on a phone (844x390).

## Colour
- Super saturated, bright, toony. HSV: shine/mid/deep s >= 0.75 and v >= 0.75; lips and lines s >= 0.8 and v >= 0.5. Only white, text colours and dim overlays are exempt. `vividCheck()` in `shop/design.mjs` fails the build.
- No dark or gloomy tones anywhere: no near-black panels, plates or outlines. Contrast comes from hue, brightness, white and glow.
- Plates and chips: white with coloured text. Text shadows and headline offsets are coloured.
- One focal point: radial burst (yellow → orange → red edge) plus spinning rays behind the hero offer. Warm cards on a cool window.
- Roles: green = buy/confirm, red = close/cancel, blue = headers/windows, gold = currency/titles.
- Rarity: grey common, green uncommon, blue rare, purple epic, gold legendary, rainbow outline mythic.

## Layout
- No overlaps: every element (outline and lip included) sits fully inside its parent and never touches a sibling. Only background layers (rays, highlights, patterns, glow) share space.
- Design at 1920x1080; check phone 844x390 and portrait. Most players are on phones.
- Pad windows 30 px, items 12-24 px apart. Tap targets >= 44 px (old floor 38 px; NEW playbook uses 44).
- Popups dim the game with a black frame at transparency 0.4-0.6. No empty tabs.

## Motion (TweenService)
- Open: pop-in 0.35-0.45 s Back-out; slide-in 0.4 s from 60-120 px; stagger cards 0.06 s.
- Hover 1.05-1.08, press 0.92 then spring back.
- Shine sweep 1 s every 2.5-4 s at 20-45°. Float ±3-8 px over 2-2.5 s; pulse 1.04-1.06 over 1.2 s; glow pulse 1.4 s.
- Backgrounds: scrolling pattern 10-20% strength, 48-64 px tile, 10-20 px/s; sunburst 10-15°/s.
- Badges wiggle ~14° every 2-3 s. Typewriter 30-50 chars/s. Numbers count up 0.5-1.5 s expo-out.
- Animate generously, but offset phases so nothing pulses in unison.

## PC (/pc)
- Build in Studio via MCP (run code creating ScreenGui/Frames/UIGradient/UIStroke/UICorner), playtest, screenshot with Device emulator at phone size.
- Optional: `tools/roblox/shop` pipeline for palette checks and skins (render/preview need playwright).

## Mobile fallback (/mobile)
- Write the palette, wireframe and a Luau builder module (creates the whole GUI in code) in the repo; run `node tools/roblox/shop/design.mjs`-style palette checks if reusing that tool.
- Mock the layout as an HTML Artifact at 844x390 to check overlaps and sizes; queue "run GUI builder + device emulator check" in [queue/pc.md](queue/pc.md).
