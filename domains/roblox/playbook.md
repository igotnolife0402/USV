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
