---
summary: Roblox maps and lobbies: spawn/walkability rules, hero-piece and scene detail floors, budgets, live chunked builds, lobby generator tool
updated: 2026-11-22
status: current
triggers: [lobby, roblox map, spawn, spawnlocation, hero piece, blueprint, meadow, level design, walkable]
---
# Roblox maps and lobbies

Tool: `tools/roblox/lobby` ([README](tools/roblox/README.md)). Its `validate.mjs` (`LIMITS`, `FLOORS`) is the source of truth for the numbers below; change them there first. General 3D detail/z-fighting rules: [domains/3d/index.md](domains/3d/index.md).

## Lobby spec (from Studio Lobby V1, approved 2026-11-18)
- Character ≈ 5 studs tall. Spawn pad at the origin; nothing from other zones within 40 studs, no solid part in the 12-stud clear radius above the plaza.
- Walkable surfaces continuous: gaps <= 2 studs, steps <= 1 stud unless ramp/stairs, doorways >= 6 tall and >= 4 wide.
- Fenced walkable area 300x300 studs ±2 centred on origin; surroundings to ~700x700 so the camera never sees void or bare grid. Perimeter forms a closed loop.
- Lighting finished: day light, sky-blue background, horizon-matched fog; lamps/Neon visibly lit.
- Camera: hero shot framing the lobby; bookmarks Spawn view (eye 4-7 studs), Overview, Detail.
- The theme the owner names (e.g. "grassy meadow") is built first, everywhere the camera sees. A green slab is not a meadow.
- Automated today: schema, budgets, hero and scene floors. NOT automated: spawn clearance, walk connectivity, gate sizes, perimeter loop, framing: check them by hand (inspect via MCP run-code on PC) and say so.

## Detail floors
Hero pieces (spawn, centrepiece, gates, anything the camera frames):
- >= 250 parts, >= 4 materials, >= 3 shape types, >= 3 height levels (base, 2 tiers, top feature).
- Original emblem (>= 8 parts) or a text sign. >= 2 effects (Neon, light, animation, VFX).
- Spawn/centrepiece >= 25% of lobby width (>= 75 studs in a 300-stud lobby).
- No stand-in spheres: plain spheres only for genuinely round things, named orb/ball/bead/dome.
- Boxes > 4 studs need bevel >= 0.1 or trim; strips (two sides <= 0.5) count as trim.
- Blueprint before modelling: references (hero, exploded, 360), dimensions, part counts, colours, materials, moving parts. Example: [oak blueprint](tools/roblox/lobby/blueprints/oak.md).
- 10x method: model at 0.1-stud working units, bake to final size (no scaled groups).
Whole scene:
- >= 3 effect kinds; >= 1 detail part per 60 sq studs of walkable area.
- Lobbies and scenic areas: no plain slab > 8x8 studs; walkable slabs need >= 1 part on top per 12x12 cell, terrain per 32x32. Game platforms are the exception: single slabs with the baseplate grid texture (owner 2026-11-22, [playbook](domains/roblox/playbook.md)); detail goes into the arena decor instead.
- Props >= 6 parts; repeats vary ±6% lightness, ±10% size, rotation. Each colour family >= 3 shades.

## Budgets
- <= 6,000 objects, 24 lights, 4 shadow casters.
- Mass-repeated scenery (grass, flowers, rocks, trees) merged into one mesh per colour; hero pieces stay Parts.
- Old hub Studio doc: <= 230 KB (refused over 256 KB); live writes <= 150 objects and < 750 KB per batch.
- Roblox side: Parts count and draw calls matter on phones; optimise the 10 heaviest models before finishing.

## Process
- No placeholders: every part added is at full detail. Build and check one hero piece at a time.
- Build live when the owner watches: write stage by stage (`stage.mjs` / `live.mjs` plan), mark building until the validator passes.
- No 1-12 rating step; pass/fail against the numbers plus looking at the result. A separate critic compares each piece to its blueprint.
- Never touch the owner's other places/projects; write only the target.

## PC (/pc)
- Real Roblox: port the generator to a Luau builder module and run it via Studio MCP run-code, or generate `.rbxmx` and run `node tools/roblox/rbxmx-check.mjs` then Insert from File ([delivery](domains/roblox/delivery.md)).
- Verify counts with run-code (`#workspace:GetDescendants()`, light count) and look from each bookmark position.

## Mobile fallback (/mobile)
- `node tools/roblox/lobby/build.mjs && node tools/roblox/lobby/validate.mjs` and `node --test tools/roblox/lobby/test/` run in cloud sessions.
- Queue the Studio build and visual check in [queue/pc.md](queue/pc.md); report "validated, not seen in Studio".
