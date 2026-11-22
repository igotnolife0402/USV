---
summary: Minigame Mayhem v2 crew contract: 3 Umbrio kits, Studio-built map via MapBuilder, 14 varied minigames, HUD/VFX upgrade
updated: 2026-11-22
status: current
---
# Minigame Mayhem v2 contract (brain-owned; workers copy exactly)
OUT = %USERPROFILE%/RobloxImports/MinigameMayhem. Style: polished stylized-realistic, Roblox materials, rich detail. v1 (single Umbrio world) superseded by this kit + Studio-built map contract.

## 1. Kits (worker A) -> Umbrio scene JSON, NOT a map
- OUT/kits/gen/kits.mjs writes OUT/kits/kit-env.json, kit-mech.json, kit-props.json (scene: name, v:1, objects, env). One top-level group per model, exact name below.
- Every model built at x=z=0, base on y=0 (lowest point y 0), group pos [0,0,0], world coords on parts. Shapes box/sphere(equal xyz)/cylinder(x==z)/wedge only. Nested groups allowed.
- Detail floor (min parts) in brackets. Bevels from wedges, trims, bolts, insets, 2-3 tone colors, no plain blocks. Decor parts offset >= 0.04 (no coplanar faces).
- Required named parts in "quotes" (runtime finds them).
ENV: Tile16 16x2x16 "Top" [12]; Tile8 8x2x8 "Top" [10]; Beam32 4x2x32 "Top" [8]; Ramp16 16w x16 long, rise 8, "Top" wedge [10]; Wall16 16x10x2 [14]; Pillar 4x16x4 [10]; FinishArch 20w x16h, "FinishZone" 16x10x2 [22]; StartPad 20x2x20 "Top","Spawn" 4x1x4 [14]; Oak 18 tall [14]; Pine 20 tall [10]; RockCluster 8w [6]; Crystal 6w [7]; Lamp 10 tall "Bulb" [12]; Bench [12]; Fence16 [7]; Banner 12 tall "Cloth" [6]; Torch 6 tall "Flame" [7]; Fountain 20 dia "Water" [30]; MainSign 44w x22h "Board" 30x6 [40]; Podium "Step1","Step2","Step3" [15]; RoundBoard 30x16 "Screen" [12]; Cloud [6]; FlowerBed 8x8 [10]; Bush [5]; Crate 6x6x6 [14]; Barrel [8].
MECH: JumpPad 8 dia "Pad" [12]; BouncePad 12 dia "Pad" [16]; BoostPad 8x12 "Pad" [10]; Conveyor 8x24 "Belt" (top, runs along +Z) [16]; Spinner: "Hub" + group "Arm" (bar 30 long, "Bar") [14]; Sweeper: tower 6 dia + group "Arm" (bar 44 long, center y 1.6, 1.2 tall, through center) [16]; Hammer: frame 26 tall, beam 12w, "Pivot" at (0,24,0), group "Swing" (shaft 1x14x1 + head 8x5x5 at y 7) [22]; MovingPlatform 10x1.5x10 "Top" [10]; GlassPanel 8x0.8x8 "Glass" [6]; ColorTile 6x1x6 "Top" [6]; Boulder 8 dia "Core" [6]; Bomb 3 dia "Body" [8]; Target 6 dia board facing +Z on 5-tall post "Board" [10]; Ring 14 dia vertical in XY plane (16 box segments) + "Trigger" cylinder 12 dia x1, rot [90,0,0], transparency 1 [17]; Gate 12w x12h "Door" 10x10x1, "Lock1".."Lock3" [14]; Checkpoint flag + "Zone" 12x8x12 transparency 1 [8]; LavaTile 32x1x32 all parts named "Lava" [8]; WaterTile 32x1x32 all parts named "Water" [4]; LavaRock [6].
PROPS: Sword standing, pommel at y 0, blade up (+Y), 5.6 long, grip cylinder "Handle" 1.2 long [28]; Blaster barrel along -Z, grip "Handle" vertical at origin, "Muzzle" at barrel tip [24]; Coin 3 dia face ±Z "Body" [6]; GoldCoin 4.5 dia "Body" [7]; Star 3 tall face ±Z [11]; Key 3 long [14]; Flag 10 tall "Cloth" [7]; Gem 2 tall [6]; Button pedestal 4 tall "Cap" [10]; Trophy 5 tall [18]; MagnetOrb 3 dia [8]; HealthOrb 3 dia [5]; SpeedOrb 3 dia [6].
- Check: `node OUT/kits/gen/kits.mjs` prints per-model part counts (fail if under floor); studio.mjs validate each json; `python tools/3d/zfight/zfight.py check <json>` 0 fights.

## 2. Map is built in Studio by code (worker A writes MapBuilder)
- OUT/src/server/MapBuilder.luau (ModuleScript under RoundServer). Kit lives at ReplicatedStorage.MMKit.<Name> (Models; WorldPivot = bottom-center, normalised at import).
- API passed to every game build as `kit`:
  kit.place(name, cf, parent, opts?) -> Model  (clone, PivotTo(cf), opts.name rename, opts.top = {Color, Material} recolors "Top")
  kit.tile(name, cf0, nx, nz, step, parent, opts?) -> {Model}
  kit.decor(name, cf, parent) -> Model? (skips if its bounding box overlaps anything in arena.Gameplay or arena.Start: spacing check; counts skips)
  kit.light(part, color, range, brightness); kit.ambient(part, preset) presets "embers","sparkle","fire","steam","mist" (enabled ParticleEmitter); kit.tag(model, "Spin"|"Bob"|"Pulse")
- MapBuilder.build(): destroys workspace.MinigameMayhem, rebuilds Lobby (at origin: plaza, MainSign, Fountain, Podium, RoundBoard, 16 Oaks, Lamps, Benches, Fences, Flowers, Banners, LobbySpawn = StartPad) and every game arena: Model workspace.MinigameMayhem.Arenas.<id> at origin CFrame.new(k*500,0,0) (k = index in games list; Duel at 15*500), each with Folders Gameplay + Decor, calls def.build(arena, origin, kit), then prints "BUILD <id> parts=<n> decorSkipped=<n>". Returns summary string.
- Lighting/ambient emitters for lava, torches, lamps, pickups are added by builds through kit.light/kit.ambient.

## 3. Games (B: OUT/src/server/GamesA.luau G01-G07; C: OUT/src/server/GamesB.luau G08-G14)
Each module returns { [id] = {id, title, icon, color, desc, objective, build(arena, origin, kit), setup(arena, ctx), stop()} }. build must place a StartPad named "Start" (kit.place(...,{name="Start"})). Every arena: themed floors from kit tiles, >= 20 decor via kit.decor, no single straight lane.
ctx (from RoundServer): finish(p); respawn(p); setCheckpoint(p, cf); penalty(p, sec); progress(p, done, total, label, icon); fx(kind, pos, data?, p?); target(p, pos?); hud(p?, data); players(); giveTool(p, kitName) -> Tool; knock(p, vel); clone(kitName) -> Model.
Lava/Water parts (by name) and falling below Start.Y-40 call respawn (checkpoint or Start); death mid-race -> respawn. No lose condition in TEST_MODE.
- G01 LavaRise 🌋 "Lava Rising": tower (Pillar stack) with 18 platforms in 3 spiral branches + 2 MovingPlatforms; LavaTiles plane cycles y -4..30 (sine, 16 s); respawn platform "SafeSpawn" y 34; FinishArch at y 110. Objective "Climb above the rising lava!". progress = height %.
- G02 CoinFrenzy 🪙: 120x120 plaza, 4 raised platforms + ramps + center tower; 25 Coins live at random of 60 spawn points, collected -> respawn elsewhere 2 s; GoldCoin (5 pts) every 8 s; MagnetOrb every 15 s (pulls coins within 14 for 6 s). Goal 30 points.
- G03 ColorCrash 🎨: 8x8 ColorTiles (6 colors) over WaterTiles; 7 rounds: hud banner "STAND ON <COLOR>" + swatch, 3.0 s shrinking to 1.6 s, other tiles drop 2 s; fall = respawn on side ledge + penalty 3 s. Finish after round 7.
- G04 KeyMaze 🗝️: 12x12 maze (cell 10, Wall16 scaled pieces/hedges), 3 Keys at dead ends, Gate at exit; client hides Door locally when keys==3; FinishZone behind gate counts only with 3 keys. hud slots keys; target nearest key.
- G05 ButtonHunt 🔘: multi-level playground (towers, ramps, Conveyor, Crates); 10 Buttons any order; target nearest unpressed per player.
- G06 SkyIslands 🏝️: center island + 6 outer islands (radius 70, y 60) with JumpPads both ways; Flag on each outer island; grab 6 then FinishZone on center.
- G07 ObstacleRush 🏃: two-route obby: Conveyors, Spinners, Hammers, MovingPlatforms over LavaTiles, 3 Checkpoints (setCheckpoint), routes split after CP1 (short beams vs long ramps), FinishArch.
- G08 TargetBlast 🎯: giveTool "Blaster"; 16 Targets pop up (tween up from ground) on pillars and 4 sliding rails; client sends Shoot(aimPos); server raycasts from head (range 220, 0.25 s cd); 15 hits = finish; hud crosshair on.
- G09 RingRush 💫: trampoline park: 12 BouncePads (launch 120 up), platforms, 10 Rings at y 30-85 any order (touch Trigger); target nearest.
- G10 GlassBridge 🪟: 12 rows x 2 GlassPanels over WaterTiles; one fake per row (random per round), fake breaks on touch (fx break, stays broken), FinishArch at end.
- G11 BoulderPeak ⛰️: wide slope 3 lanes with ledges/cover, Boulders roll every 1.6 s random lane, hit = knock (no respawn), FinishArch on summit.
- G12 SpeedLaps 🏁: oval track of Tile16 + Ramp16 jump shortcut, 6 BoostPads (WalkSpeed 42 for 1.6 s, fx boost), 4 Checkpoints in order, 2 laps; progress "Lap".
- G13 BombRain 💣: 100 dia arena; bombs drop at random spots every 0.7 s with fx telegraph (radius 8, 1.2 s) then boom (knock 70 + 1 s slow); collect 12 Stars spawning around; finish at 12.
- G14 SpinSweep 🌀: round platform 70 dia over WaterTiles, Sweeper arm spinning (40 deg/s, +6 deg/s every 5 s); 8 Stars appear one at a time; fall = respawn + penalty 3 s.
- DUEL (B, in RoundServer): arena colosseum at 15*500 built by MapBuilder (B supplies DuelBuild in GamesA as id "Duel"), Sword from kit (welded, Grip so blade points forward-up), swing 20 dmg cd 0.45, every 3rd hit within 1.5 s = heavy 35 + knock 60, fx damage{amount}; HealthOrb/SpeedOrb spawn every 8 s at 4 points; TEST bot holds a Sword clone.

## 4. Round core (B: RoundServer + Config)
Config: TEST_MODE=true, MIN_PLAYERS 1, MAX_PLAYERS 10, RACE_TIME 120, INTERMISSION 10, PICK_TIME 3.5, INTRO_TIME 4, COUNTDOWN 3, RESULTS_TIME 5, WINNER_TIME 7, PENALTY 3. Games = GamesA + GamesB merged.
Order: shuffle bag (TEST: every game once in random order, then Duel; real: random without repeats, last finisher eliminated, until 2 -> Duel). Remotes MMRemotes: State, Fx, Progress, Hud, Target (RemoteEvents), Shoot (client->server, validate Vector3, rate 5/s).
Phases (State): Lobby{countdown}, Pick{options = 8 {id,title,icon,color}, chosen index}, Intro{index,total,id,title,desc,objective,icon,color}, Countdown{n}, Race{endsAt,alive}, RaceUpdate{finished,total}, Finished{place,time,penalty}, Results{order={{name,time,penalty,eliminated}}}, Duel{a,b}, Winner{name,wins}.
Fx kinds: finish collect gold hit heavy jump bounce boost break boom telegraph checkpoint penalty eliminate respawn win damage shoot.

## 5. Client (C: HUD.client.luau + FX.luau)
Pick roulette (icon strip decelerating 3 s, Tick per step, Whoosh on land); objective bar; progress widget pop; timer red pulse < 10 s; "+3s" penalty popup; checkpoint toast; finished counter; waypoint BillboardGui (AlwaysOnTop diamond + distance) from Target; Hud kinds banner{text,color,dur}, crosshair{on}, slots{icon,have,total}; blaster: Activated -> Shoot(mouse.Hit.Position) + local Beam laser 0.15 s + hitmarker; damage numbers; ambient anim of tags Spin(90 deg/s)/Bob(0.4 studs, 1.6 s)/Pulse(neon transparency 0..0.35) re-basing when the server moves a model; boost Trail on HRP. Never touch CurrentCamera.
Sounds (ReplicatedStorage.MMSounds): Coin Button Finish Hit Jump Tick Go Eliminate Win Whoosh Shoot Break Boom Checkpoint Penalty Land.
