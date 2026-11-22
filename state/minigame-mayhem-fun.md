1 | static + Studio | merged |1 | static + Studio | merged |1 | static + Studio | merged |1 | static + Studio | merged |1 | static + Studio | merged |1 | static + Studio | merged |1 | static + Studio | merged |1 | static + Studio | merged |---
summary: Swarm spec v5 "fun pass" for Minigame Mayhem: momentum fix, spectate, palette UI, 8 new games, dressed maps, tutorial island, cutscenes, progression
updated: 2026-11-22
status: current
---
# minigame-mayhem fun pass  spec: approved 2026-11-22 (owner: 30-60 min budget)   wave: 2/2
Base: [minigame-mayhem-swarm.md](minigame-mayhem-swarm.md) (v3/v4: 15 games, slabs, audit, bots). Code: %USERPROFILE%/RobloxImports/MinigameMayhem.

## Goal (owner 2026-11-22: "super fun, satisfying, not boring after 10 minutes")
1. Momentum: dash (Q) and roll (C) chain for extra speed with a hard cap; never a fling. Root cause today: two LinearVelocity with MaxForce = huge stack on one root.
2. Spectate menu: when out, finished or waiting: bottom bar with arrows, player card (headshot, rank, status), auto-follow leader, bots included.
3. One color palette for the whole game; UI rebuilt on a UI kit (no neon, no pure black, soft panels, icons, eased motion).
4. +8 minigames, each a new verb built for 10 players (23 total with the 15 now).
5. Every arena dressed to a theme (backdrop, perimeter props, lights, ambience): no empty maps.
6. Tutorial island on first join + "how to play" card before every game.
7. Cutscenes: arena flyover before a game, "VS" intro for the duel, winner podium shot.
8. Retention: game voting (3 choices), random mutators, coins + XP + levels saved in DataStore, trail shop and locker.
9. The 9 qa-gate defects from the bots diff (rig leak, stale MoveTo, weak-key tables, goal gate, rig retry, R6 guard, contract text).

## New minigames (one verb each, 10-player first)
| id | mode | verb | core rule |
|---|---|---|---|
| HotPotato | survival | pass | bomb jumps on touch; holder at fuse end is out; fuse shortens each pop |
| KingOfTheHill | score | hold | points while alone on a hill ring; the ring moves every 20 s |
| CrownKeep | score | steal | one crown, holder scores per second, bonk/touch to steal, 2 s steal guard |
| MusicalPads | survival | react | music stops → stand on a pad; pads = alive - 1; repeat |
| SumoRing | survival | push | round ring shrinks; bonk knockback x2; fall = out |
| TurfPaint | score | paint | 12x12 floor of 8-stud cells takes your color; most cells wins |
| TagInfection | survival | chase | 2 random taggers; tagged join them; last untagged ranks top |
| TowerClimb | race | climb | vertical branching tower, jump pads, moving ledges, 3 routes |
Mutators (35 % per round, announced on a card): Low Gravity, Turbo (walk 24), Tiny, Slippery, Double Coins, Fog.

## Waves (~30 min each, ~16-20 agents total)
- Wave 0 (1 worker): contract v5 in `contract.md`: shared folder ReplicatedStorage.MMShared (Palette, UIKit API, Momentum API, Net names), def additions {tutorial = {icon, lines[3]}, mutators = bool}, ctx additions {ctx.mutator, ctx.award(p, coins, xp)}, DataStore schema MMData_1 {coins, xp, level, wins, trails, equipped, tutorial}, remotes (Vote, ShopBuy, ShopEquip, TutorialDone, Cutscene), the 8 new kit names with bounding boxes, layout.json + pack-scripts for shared modules. Tag swarm-mm5-w0.
- Wave 1 (parallel, 5 leads):
  - Move lead: src/shared/Momentum.luau (pure math), src/client/Moves.client.luau, src/client/Spectate.client.luau, src/client/Cutscene.luau.
  - UI lead: src/shared/Palette.luau, src/shared/UIKit.luau, src/client/HUD.client.luau, Leaderboard.luau, FX.luau, src/client/Shop.client.luau (shop, locker, vote cards).
  - Core lead: RoundServer (vote, mutators, awards, cutscene cues, tutorial routing), src/server/Data.luau (new), Bots.luau (9 defects), Config.
  - Games lead: src/server/GamesD.luau (HotPotato, KingOfTheHill, CrownKeep, MusicalPads), GamesE.luau (SumoRing, TurfPaint, TagInfection, TowerClimb), each with def.bot + tutorial card.
  - Kit lead (Umbrio): kits/gen/games5.mjs (new game props), kits/gen/decor5.mjs (6 theme decor sets); live-built Umbrio tabs, read back, tier floors.
- Wave 2 (World lead + orchestrator): MapBuilder dressing pass (theme per arena, >= 25 decor models each), src/server/Tutorial.luau (island: move course, race, survival, score, bonk, sword dummy stations), lobby polish; pack, upload, import, audit, sim, qa-gate on the whole diff, save place.

## File ownership
One owner per file as listed above; GamesA/B/C only get palette color swaps from the games lead in wave 2. MapBuilder + Tutorial = world lead. contract.md = wave 0 only.

## Acceptance tests
1. Momentum: Studio test runs 1000 random dash/roll chains through Momentum: horizontal speed <= 62 studs/s always, direction within 5 deg of input, no NaN. In play: the move controller called from a Client execute, root speed <= 62.
2. UI gate (node script in repo): no Color3 literals outside Palette.luau in client UI, no Neon material in UI, no pure black backgrounds.
3. 23 games: setup/stop smoke test 0 failures; every def has bot + tutorial; MapBuilder.audit() = 0 for lobby, tutorial island and 23 arenas.
4. Every arena: >= 25 decor models + backdrop (audit counts them).
5. Sim with 9 bots: vote, mutator, rounds to duel to winner, coins/XP awarded, console clean (sim-fast timers).
6. Data: save/load round trip (falls back to session memory with one warning if Studio API access is off).
7. Tutorial: fresh profile spawns on the island; finish or Skip goes to the lobby; flag saved.
8. Spectate: target cycles through alive players + bots (read from a SpectateTarget attribute).
Not checkable by me: looks inside Studio (I never touch the Studio camera); kit looks only on Umbrio tabs.

## Camera (needs owner decision)
Spectate and cutscenes are in-game camera code (CameraSubject, tweened CFrame) shipped inside game scripts. Owner rule says no camera code. Proposal: allow camera code in game scripts only; I still never move, script or capture the Studio camera myself.

## Cost
~16-20 agents, 3 waves (~90-100 min), roughly 7x the tokens of one thread. Pending upload of the bonk tuning is folded into this import.

| id | lead | files | branch | tries | qa | status |
|---|---|---|---|---|---|---|
| w00 | orch | contract.md v5, src/shared/{MMShared,Palette,UIKit,Momentum}, tests/ui-gate.mjs, layout.json, stubs | main | 1 | review | merged, tag swarm-mm5-w0 |
| w51 | move | Moves, Spectate, Cutscene (client) | swarm/w51/move | 1 | static + Studio | merged |
| w52 | ui | HUD, Leaderboard, FX | swarm/w52/ui | 1 | static + Studio | merged |
| w53 | core | RoundServer, Bots, Config | swarm/w53/core | 1 | static + Studio | merged |
| w54 | games | GamesD (+howto A/C) | swarm/w54/games-d | 1 | static + Studio | merged |
| w55 | games | GamesE (+howto B) | swarm/w55/games-e | 1 | static + Studio | merged |
| w56 | kit | kits/gen/games5.mjs | swarm/w56/kit-games | 1 | static + Studio | merged |
| w57 | kit | kits/gen/decor5.mjs | swarm/w57/kit-decor | 1 | static + Studio | merged |
| w58 | world | MapBuilder | swarm/w58/world | 1 | static + Studio | merged |
Decisions: budget cut (owner 30-60 min): 6 new games not 8 (TagInfection, TowerClimb cut), tutorial island + shop/DataStore cut; how-to cards in the intro cutscene instead. Leads work directly (no sub-workers) for time. Camera: owner asked for spectate + cutscenes, so in-game camera code ships in game scripts; rule text change blocked pending owner OK.
Studio (v5b, asset 127420115229747): 21 arenas, audit 0, decor 38-44 per arena; 6 new games setup/stop smoke 0 errors; dash+roll chain max 54.7 studs/s (cap 62); sim: vote -> intro -> round, human out -> spectate bar on a bot, 0 console errors. Fix: new kit pivots from world AABB (L-123).
| qa-gate | orch | diff swarm-mm5-w0..main | - | 1 | FAIL 2 (no Start marker in v5 arenas; bot network owner after unfreeze) | fixed by orch (Spawn1 fallback, SetNetworkOwner nil), re-imported v5c (asset 99785049279254); vote offered KingOfTheHill + MusicalPads, MusicalPads round ran with outs, 0 errors; place saved v22 |
Done 2026-11-22 (~48 min). Not verified: looks (UI, cutscene orbit, arenas, kit models) queued for PC; duel + winner cutscene only inferred (match restarted with fresh bots, 0 errors); spectate arrow cycling untested.
Blocked: none (camera rule narrowed, owner OK).  Next: tutorial island, shop + DataStore, TagInfection/TowerClimb.
