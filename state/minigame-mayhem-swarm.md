---
summary: Swarm spec for the Minigame Mayhem polish pass (no clipping, baseplate texture, uniform kit quality, 10-player games, feel)
updated: 2026-11-22
status: current
---
# minigame-mayhem polish  spec: awaiting approval   wave: 0/3
Base: [minigame-mayhem.md](minigame-mayhem.md) (v2 contract: kits, MapBuilder, 14 games, HUD). Code: %USERPROFILE%/RobloxImports/MinigameMayhem (git init there for worktrees; binaries stay out of the vault).

## Goal (owner review 2026-11-22)
1. Zero clipping: no model inside another (spawn pad in bench, tiles through props).
2. No "part spam": flat platforms = single slabs with the Roblox baseplate grid texture; props/models keep materials.
3. Every kit model at one quality bar (no weak models beside good ones).
4. Every minigame designed for 10 players (spawns, space, contested goals, player interaction); solo TEST mode still no-lose.
5. More satisfying: juice via UI, sound, particles, rank feed (camera never touched).

## Domains and waves (~30 min each)
- Wave 0 (1 worker, contracts): `contract.md` v3 = game def schema {mode: race|survival|score, spawns: 10, rank()}, MapBuilder v3 API (slab(), occupancy register, audit()), remotes (Leaderboard, Feed, Bonk), baseplate texture asset id verified in Studio via MarketplaceService:GetProductInfo (never guessed), tier table for kit models, git init + skeleton. Orchestrator reviews, freeze, tag.
- Wave 1 (parallel, 3 leads):
  - Kit lead (3 workers: env / mech / props): rebuild every model to its tier: HERO >= 60 parts (Sword, Blaster, Trophy, MainSign, Fountain, FinishArch, Podium, Gate, Hammer, Sweeper), PROP >= 30 (all pickups, pads, scenery), PIECE light (repeated pieces). Detail score gate per model in kits.mjs (parts, >= 3 colours, >= 2 materials, >= 10% bevel wedges, 0 coplanar/contact faces). Live-built into fresh Umbrio tabs + read back; one browser look per kit tab by the orchestrator.
  - Layout lead (2 workers): MapBuilder v3: slab() = one Part + baseplate Texture (studs grid) for every flat platform/floor/path; occupancy grid per arena (every place/decor registers its inset bounding box, overlap = skip or error); audit() lists every overlap between distinct models + every spawn spot not clear 6x6x6; new lobby (wide plaza slab, props on a clearance grid, 10 spawn spots).
  - Core/UI lead (2 workers): RoundServer ranking by mode (race = finish order, survival = fall-out order, score = points at timer), round elimination of lowest rank, Bonk (push nearby players, 3 s cooldown, button + key), live 10-player leaderboard panel, feed ("X finished 1st", "X fell"), combo pitch ramp on collects, finish/rank pop-ups.
- Wave 2 (Games lead, 3 workers, ~5 games each): re-lay all 14 games + duel on slabs for 10 players: 10 spawn spots, arenas >= 2x wider, multiple routes, contested objectives (shared coins, buttons stay pressed for first presser only, bridge reveals for all), survival modes for ColorCrash/BombRain/SpinSweep/GlassBridge (fall = out in real mode, respawn in TEST), score mode for CoinFrenzy/TargetBlast.
- Wave 3 (orchestrator + 1 worker): export kits, import, MapBuilder.build(), audit = 0, playtest each game briefly (console clean), qa-gate on the whole diff, save place.

## File ownership (one owner per file)
kits/gen/env.mjs, mech.mjs, props.mjs (kit workers); src/server/MapBuilder.luau + Lobby.luau (layout); src/server/RoundServer.server.luau, Config.luau, src/client/HUD.client.luau, FX.luau, Leaderboard.luau (core/UI); src/server/GamesA/B/C.luau (games workers). contract.md: Wave 0 only.

## Acceptance tests
1. `node kits/gen/kits.mjs` KITS PASS with tier floors + detail score; 3 Umbrio tabs read back.
2. Studio `MapBuilder.audit()` = 0 overlaps, 0 blocked spawns, for lobby + 15 arenas.
3. Every flat platform has the verified baseplate Texture; no Grass/Rock/Slate tiles as floors.
4. Each game: 10 spawn spots, declared mode, one solo round ends with console clean.
5. Leaderboard, feed, bonk work in play; full rotation of 3 random games + duel with no errors.
Not checkable by me: looks inside Studio (camera off-limits); kit looks checked only on Umbrio tabs.

## Cost
~10-12 agents, 3 waves (~90 min), roughly 7x the tokens of a single thread.

| id | lead | files | branch | tries | qa | status |
|---|---|---|---|---|---|---|
Decisions: swarm chosen by owner 2026-11-22.  Blocked: approval.  Next: Wave 0.
