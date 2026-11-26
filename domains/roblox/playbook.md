---
summary: Fastest proven path to a polished Roblox experience; Studio MCP loop on PC, Rojo files plus queue on mobile
updated: 2026-11-21
status: current
triggers: [roblox, luau, studio mcp, rojo, play test]
---
# Roblox playbook

## Core facts
- Studio ships a built-in MCP server (create.roblox.com/docs/studio/mcp). Use it. `Roblox/studio-rust-mcp-server` is deprecated: never install or recommend it.
- Studio MCP tools: run code, insert model, get console output, start/stop play. Exact tool names come from the live tool list; read it, do not guess.
- Rojo (github.com/rojo-rbx/rojo) keeps Luau in the repo as `.luau` files; Studio syncs from `rojo serve`.
- luau-lsp analyzer type-checks without Studio: `luau-lsp analyze --definitions=globalTypes.d.luau src`.

## Sub-notes (read only the one the task needs)
- Importing files, kits, asset ids → [delivery](domains/roblox/delivery.md). GUI/shop/HUD → [ui](domains/roblox/ui.md). New game or release → [game-design](domains/roblox/game-design.md). Lobby/map/hero piece → [maps](domains/roblox/maps.md).
- "Build me a UI" = build instances in Studio, not scripts, unless scripts are asked for.
- The owner's latest word beats any stored rule; update the note when it changes.

## PC (/pc)
1. Confirm Studio MCP is connected (tool list shows Roblox_Studio tools). Not connected → open Studio, enable MCP in Studio settings, retry once.
2. Repo has `default.project.json` → run `rojo serve`, connect the Rojo plugin, edit files in `src/`. No Rojo → edit via MCP run-code, then export scripts to files before stopping.
3. Build server-authoritative: logic in `ServerScriptService`, shared modules in `ReplicatedStorage`, UI/input in `StarterPlayerScripts`/`StarterGui`.
4. Test loop, every change: edit → start play → read console output → stop play → fix. Max 3 tries per bug, then re-read [errors](domains/roblox/errors.md) and rethink.
5. Inspect world state with run code (`print(#workspace:GetDescendants())`, positions, attributes) instead of screenshots.
6. Need models → insert model from toolbox/marketplace by ID, or import from [3D pipeline](domains/3d/pipeline.md). Anchor, set CollisionFidelity, check scale (1 stud ≈ 0.28 m; character ≈ 5 studs tall).
7. Run `luau-lsp analyze` (or selene) on `src/` before declaring done.

## Mobile fallback (/mobile)
- No Studio, no MCP, no local files. Work only in repo files with the Rojo layout from [pipeline](domains/roblox/pipeline.md).
- Write `.luau` modules with `--!strict` and explicit types; logic must be testable as pure ModuleScripts (no Instance calls in core math).
- Prototype pure logic (economy curves, spawn tables) in an Artifact as JS if it needs visual sanity checks; port to Luau.
- Append every Studio step to [queue/pc.md](queue/pc.md), one per line, e.g.:
  `- [ ] 2026-11-21 rojo serve + playtest coin pickup, read console — roblox obby branch feat/coins`
- Never claim "tested": say "type-checked by reading; play-test queued".

## Quality bar
- Zero errors/warnings in Output during a 60 s play session.
- Server validates every RemoteEvent arg (type, range, rate). Client never decides currency, damage or ownership.
- DataStore: `pcall` + retry with backoff, `UpdateAsync` over `SetAsync`, save on `PlayerRemoving` and `game:BindToClose`.
- No `wait()`/`spawn()`/`delay()`: use `task.wait/task.spawn/task.delay`.
- Disconnect connections on cleanup; no per-frame `Instance.new` in loops without pooling.
- UI: `UIScale`/`UIAspectRatioConstraint`, test phone emulator in Studio (Device emulator) for touch.
- Mobile players: buttons >= 44 px, `ContextActionService` for touch + keyboard.
- Showcase cameras: before shipping a push-in, sim camera-to-mesh distance over every point incl. wing/limb tips (gate >= 8 studs) and sweep push (L-140; tools/roblox/wyvern/test/sim.mjs).

## Speed tricks
- Start from a template place (Baseplate/Obby) not empty; reuse snippets in [snippets](domains/roblox/snippets/README.md).
- One run-code call can build a whole level layout from a table of parts; then save the generator as a module.
- Use Attributes (`SetAttribute`) for tunables instead of hardcoded constants; tweak live during play.
- Batch console reads: print a single summary line per test instead of spamming.
- CollectionService tags + one handler script beats one script per part.

## Done
Run [checklists/roblox.md](checklists/roblox.md). Delivered files:  must PASS and the reply names every step not run in Roblox. Record new failures in [errors](domains/roblox/errors.md).

## Uploads folder (promoted 2026-11-22)
- Every Roblox upload (models, meshes, animation, VFX, audio) is exported into the one owner-approved folder `~/RobloxImports` (exact path in CLAUDE.local.md); never a fresh per-build folder, which Studio MCP refuses until approved (L-076).
- Whole game from Umbrio (verified 2026-11-22, Minigame Mayhem): world scene JSON → studio CLI export to rbxmx (box/sphere/cylinder/wedge = real Parts, no mesh upload) → tools/roblox pack-scripts adds the Luau → one Model upload (open_cloud_invoke, model/x-rbxm) → `game:GetObjects` in execute_luau, move Scripts to services. SFX: tools/audio sfx → Audio uploads; VFX sheets → Decal uploads → read `.Texture` via GetObjects.
- Playtest only what is new or changed; long loops get a dev attribute (e.g. `SkipToDuel` on the config) to jump to the untested part. `HumanoidDescription` has no `.new` global: `Instance.new("HumanoidDescription")` (L-116).
- Owner look bar (2026-11-22, Minigame Mayhem review): flat platforms = single slabs with the Roblox baseplate grid texture (not Grass/Rock tiles; tiled kit floors read as "part spam"); props keep their materials; 0 clipping checked by an audit pass (spawn pad in a bench = fail); every kit model at the same quality tier; party games designed for 10 players (wide spawns, contested goals, player bumps), solo test second.
- VFX base layer = built-in `rbxasset://textures/particles/*.dds` (sparkles_main, fire_main, smoke_main, explosion01_*); uploaded flipbook decals can stay "being generated" for 40+ min, so they are an extra layer only (L-117).
- Tools from Umbrio kits: a cylinder Handle exports along X; measure blade direction against HRP Look/Up/Right in play before setting Grip (Sword: base * CFrame.Angles(0, math.rad(-90), 0)) (L-118).
- Map checks: build the map in Studio from kit models with an occupancy audit (Minigame Mayhem MapBuilder: `AUDIT <id> overlaps blocked`, target 0) and smoke-test every game's setup/stop in one Server execute with a stub ctx instead of playing each round.
- Movement abilities (dash, roll, launch): one reused mover per root (LinearVelocity Plane mode, finite MaxForce ~4e4), every speed from one pure module with a hard cap (Minigame Mayhem `MMShared.Momentum`, cap 62 studs/s, chain +5/link); prove it in Studio with 1000 random chains (incl. NaN and 700 studs/s input) before play. Stacked infinite-force movers fling players (L-120).
- Kit import pivots: set PrimaryPart = nil and WorldPivot = bottom-centre of the parts world AABB; GetBoundingBox follows a rotated PrimaryPart and returns sideways sizes (L-123).
- Long Studio measurements (bot samplers, soak tests): start them with task.spawn inside execute_luau and write the result to a workspace attribute; read it in a later short call. One call running ~60 s times out (L-125).
