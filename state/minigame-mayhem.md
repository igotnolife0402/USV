---
summary: Minigame Mayhem crew contract (world JSON names, server/client Luau, remotes, VFX names)
updated: 2026-11-22
status: current
---
# Minigame Mayhem: shared contract (brain-owned, workers copy exactly)

OUT dir (all outputs): %USERPROFILE%/RobloxImports/MinigameMayhem/ (the Roblox upload folder from CLAUDE.local.md)
Studio place: "minigame mayhem" (placeId 105467394921819). Style: bright realistic-stylized arena game, Roblox materials.

## World (worker A) -> OUT/world.json (Umbrio scene JSON, docs: tools/3d/studio/docs/scene-format.md)
- Generator: OUT/gen/world.mjs (node, no deps) writes OUT/world.json `{name:"MinigameMayhem",v:1,objects:{...},env:{bg:"#87b5e8",grid:false}}`. No baseplate object.
- Part shapes ONLY: box, sphere (equal size xyz), cylinder (size x == z, runs along Y), wedge. Every part `anchored:true`. World coords in every part `pos`; groups have `pos:[0,0,0]`.
- Materials (Roblox names): Grass, Slate, Concrete, Wood, WoodPlanks, Brick, Cobblestone, Metal, DiamondPlate, Neon, Glass, Ice, Sand, Marble, SmoothPlastic, Rock, Foil.
- Top groups (type group, parent null): Lobby, Arena01 .. Arena11. Arena i center X = i*400, Z = 0. Lobby center (0,0,0).
- Named parts the server finds by name inside each group (exact names, case-sensitive):
  - Every arena: `Start` (box 20x1x20, top surface = spawn floor), `FinishZone` (box, transparency 0.6, Neon #39ff7a) except Arena04, Arena09, Arena11.
  - Lobby: `LobbySpawn` (box 12x1x12 at y 1), `RoundBoard` (box 30x14x1 Neon? no: SmoothPlastic #1b1f2e, at (0,14,-70) facing +Z), `WinnerPodium` group (3 steps), `MainSign` group.
  - Arena01 LavaLeap: `Lava` floor (box 220x1x80, Neon #ff5a1f, y 0); Start at (X-90,10,0) on a pillar; 12 `Hop` tiles 6x1x6 zig-zag y 10..16; finish platform (X+90,12,0) with FinishZone 16x10x2 above it.
  - Arena02 SpinnerSprint: path box 160x2x30 at y 10 (top y 11); Start X-70; FinishZone at X+72; 3 groups `Spinner` each: `SpinHub` cylinder 4x4x4 at (x,13,0) and `SpinArm` box 28x1.5x1.5 Neon #ff2d55 centered on hub, at x = X-35, X, X+35. Lava floor `Lava` 220x1x80 at y -10.
  - Arena03 TileFall: 6 rows x 4 cols `FallTile` boxes 7x1x7 Glass #9be7ff transparency 0.3 at y 20, spacing 8, between Start (X-50,20,0) and finish platform (X+50,20,0); `Lava` box 200x1x80 Neon #ff5a1f at y 0.
  - Arena04 CoinRush: floor box 140x2x140 Grass; 15 `Coin` cylinders size [3,0.5,3] rot [0,0,90] Neon #ffd23f, y 4, scattered (fixed list); Start at (X,1,-60).
  - Arena05 TowerClimb: central cylinder pillar 12 dia, 120 tall; 14 platforms 8x1x8 spiralling from y 8 to y 112 radius 14; Start at (X,1,-25); top platform 16x1x16 at y 118 with FinishZone 12x8x2.
  - Arena06 HammerHall: corridor floor 170x2x22 at y 0 + side walls 170x14x2; 5 groups `Hammer`: `HammerPivot` box 2x2x2 at (x,24,0), `HammerArm` box 1x16x1 hanging below, `HammerHead` box 8x5x5 Metal #c9ccd6 at y 14; Start X-75, FinishZone X+80.
  - Arena07 JumpPadSky: 5 islands (cylinder 18 dia, 4 tall, y 40) at x X-100, X-50, X, X+50, X+100; `JumpPad1`..`JumpPad4` (cylinder 5x0.6x5 Neon #3dff9b) on islands 1-4 near +X edge; `Land2`..`Land5` (box 4x0.2x4 transparency 1) centered on islands 2-5 top; Start on island 1; FinishZone on island 5. `Lava` at y 0 200x1x80? no: `Void` not needed (server respawns when y < arena Start.Y - 30).
  - Arena08 MazeRun: floor 104x2x104; hedge walls box 2 wide 8 tall Grass #3f8f3a on a 10x10 cell grid (cell 10), fixed maze; Start in cell (0,0), FinishZone in cell (9,9).
  - Arena09 ButtonSmash: floor 110x2x110 Marble; `Button1`..`Button10` cylinders 6x1x6 Neon #ff3df2 on 3-tall pedestals in a ring radius 40; Start at center.
  - Arena10 IceSlide: ramp path of 10 Ice boxes 24 wide rising from y 0 to y 60 over 220 studs (x from X-110 to X+110), side rails; `BoulderSpawn` box 4x4x4 transparency 1 at top; `Boulder` sphere 8x8x8 Rock (template, server clones); Start at bottom; FinishZone top.
  - Arena11 Duel: floor cylinder 90 dia 2 tall Cobblestone; 8 pillars ring; `DuelSpawnA` (X-25,2,0), `DuelSpawnB` (X+25,2,0) boxes 6x1x6; group `SwordModel` at (X,50,0): `Handle` box 0.4x1.4x0.4 Wood, `Guard` box 1.6x0.3x0.4 Metal, `Blade` box 0.3x4x0.15 Metal #e8ecf4 (sword points +Y).
- Scenery every arena: themed backdrop around (rocks, trees, crystals, banners, lights) >= 25 parts; Lobby >= 150 parts (trees, lamps, fountain, benches, fences, rocks, flowers, sign letters as boxes not needed).
- Check: `node OUT/gen/world.mjs && node tools/3d/studio/cli/studio.mjs validate OUT/world.json` (NODE_PATH = OUT/deps/node_modules).

## Luau (workers B server, C client) -> OUT/src/
- B: OUT/src/server/Config.luau (ModuleScript, goes in ReplicatedStorage as `MMConfig`), OUT/src/server/RoundServer.server.luau (Script), OUT/src/server/Minigames.luau (ModuleScript under RoundServer).
- C: OUT/src/client/HUD.client.luau (LocalScript in StarterPlayerScripts), OUT/src/client/FX.luau (ModuleScript under HUD).
- `--!strict`, task.*, GetService, FindFirstChild + IsA (never bare-name index on Workspace).
- World lives at `workspace.MinigameMayhem.World.<Lobby|ArenaNN>` (models). VFX emitters at `ReplicatedStorage.MMVFX.<Burst|Sparkle|Smoke|Slash|Fireworks|Confetti>` (ParticleEmitter templates; client clones into an Attachment and :Emit(n)). Missing emitter -> skip silently.
- Remotes (created by server in ReplicatedStorage.MMRemotes): RemoteEvent `State` (server->client: phase:string, data:table), RemoteEvent `Fx` (server->client: kind:string, pos:Vector3), RemoteEvent `Progress` (server->client: done:number, total:number), RemoteFunction none.
- Phases sent via State: "Lobby" {countdown}, "Intro" {index, total, id, title, desc, icon, color}, "Countdown" {n}, "Race" {endsAt (workspace:GetServerTimeNow()), alive}, "Finished" {place, time} (to the finisher only), "Results" {order = {{name,time,eliminated}}}, "Duel" {a, b}, "Winner" {name, wins}.
- Fx kinds: "finish", "coin", "button", "jump", "hit", "eliminate", "respawn", "win".
- Config: TEST_MODE = true (solo: MIN_PLAYERS 1, nobody eliminated, plays all 10 games in order 1..10 then Duel vs a bot), MAX_PLAYERS 10, RACE_TIME 90, INTERMISSION 15, leaderstats `Wins`.
- Real mode: random game order, last finisher (or non-finisher) eliminated each round, until 2 remain -> Duel (sword, 100 HP, last alive wins). Winner +1 Wins, back to lobby, restart.
- Respawn rule (no lose): touching a part named `Lava`, falling below Start.Y-30, or dying mid-race -> teleport to Start + (0,4,0).
