---
summary: Ref 08: Blender creature showcase reel, 6 themed creatures on matching podiums, ghost cross-dissolves, lower-third name cards
updated: 2026-11-25
status: current
---
# 08 · "CREATURE SHOWCASE: 6 mythic & wild creatures" (Blender, for Roblox)
38.8 s · 363/388 kept · no captions · sheets 1, 4, 8, 12, 16 viewed (one per creature + intro/outro); 2-3, 5-7, 9-11, 13-15 not viewed (same orbit shots of the same creatures, not visually verified).
Same art family as ref 12 (water serpent with tiki posts, gear mammoth): probably the same creator or toolchain.

## Structure (a reusable showcase template)
| t (s) | beat |
|---|---|
| 0.0-0.8 | fade up from black on a grey cyclorama; all 6 creatures small in a row |
| 1.3-3.3 | title "CREATURE SHOWCASE" + subtitle fade in, a slow push-in on the line-up |
| ~4-36 | one creature per ~5 s: slow 3/4 orbit, lower-third name card (small "01/06" counter, big name in white caps with a colour bar, subtitle e.g. "Spirit of the forest"), then a 0.5 s ghost cross-dissolve (both creatures semi-transparent, 9.8-10.3, 18.4-18.9, 28.0-28.5) into the next |
| 38.3-38.7 | back to the line-up title card ("fully animated · custom VFX · made in Blender"), fade to black |
Creatures seen: fox (forest), owl (night), shark (reef), unicorn (crystals), phoenix (flame), sea dragon (tides).

## Why the models look premium
- Stylised low-saturation-bg + high-saturation creature: neutral grey cyclorama #c8ccd2, creature in 2-3 theme colours, gold accents shared by all (#e0b030 posts, bands, horn).
- Every creature stands on a round themed podium (swirl decal) inside a ring of themed pillars (trees, coral columns, crystal spires, stone braziers, water pillars) with gold capitals; small gold props float and orbit around the ring.
- Stylised faceted shapes (flat-shaded low facets, feathers/fur as separate cards), clean silhouettes, soft AO shadow under the podium.
- Each has an idle VFX in its theme: green leaf swirl (fox), water spiral + sparkles (shark), pink sparkles (unicorn), fire flames on braziers + ember sparks (phoenix), breath mist + bubbles (sea dragon).

## Replication recipe
- Umbrio / three.js showcase page: neutral grey studio (HemisphereLight + one soft key, ACES tonemap), each creature on a podium group (cylinder + swirl texture + 6-8 themed pillars on a circle + 4-6 gold props orbiting at 0.3 rad/s), camera orbit 25°/s at 3/4 height, cross-fade between creatures with material opacity 1 → 0 over 0.5 s while the next fades in, lower-third HTML card.
- Roblox showcase place: same layout, ViewportFrame or a camera path; idle VFX = one ParticleEmitter per theme (Rate 10-20), not more (owner rule: small, subtle effects).
- Owner style rule: these are stylised; our default stays realistic unless the owner names this style.

## Not verified
- Sheets not listed above; exact Blender workflow (only the end card claims "made in Blender").
