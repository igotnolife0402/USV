---
name: roblox
description: 'Use for any Roblox, Roblox Studio, Luau, Rojo, place, game script, tool, NPC, GUI or DataStore task. Studio built-in MCP loop on PC (preflight, edit, play, read console, fix), Rojo layout, strict Luau rules; on mobile edit .luau in the repo and queue Studio steps.'
---
# roblox — Studio MCP + Rojo + Luau

## Preflight (PC, once per session, before any Studio MCP call)
1. Studio is open with the target place loaded (not the start page).
2. Studio MCP is on (built-in Assistant MCP server / the `Roblox_Studio` MCP connected in this session).
3. One cheap read: list children of `Workspace` (or get the place name). OK → loop. Fails → tell owner exactly: "Open the place in Studio and enable MCP", meanwhile edit files in the repo.
4. If the project uses Rojo: `rojo serve` running (PC terminal) and the Rojo plugin connected; then edit files, not Studio scripts (Studio edits get overwritten by sync).

## The loop (repeat, 3-try cap per bug)
1. Edit: Rojo project → write `.luau` files in `src/`; no Rojo → MCP script/instance tools.
2. Play: start a playtest via MCP (play/run), let it run 5-10 s (or trigger the feature).
3. Read console: fetch output/errors via MCP. Look for errors, warnings, `print` markers you added.
4. Fix → back to 1. Stop playtest before editing. After 3 failed fixes: revert, report BLOCKED with the console lines.
5. Remove debug prints before done.

## Rojo layout
```
default.project.json
src/
  server/   -> ServerScriptService   (*.server.luau = Script)
  client/   -> StarterPlayer.StarterPlayerScripts (*.client.luau = LocalScript)
  shared/   -> ReplicatedStorage.Shared (*.luau = ModuleScript)
```
```json
{ "name": "Game", "tree": { "$className": "DataModel",
  "ServerScriptService": { "Server": { "$path": "src/server" } },
  "ReplicatedStorage": { "Shared": { "$path": "src/shared" } },
  "StarterPlayer": { "StarterPlayerScripts": { "Client": { "$path": "src/client" } } } } }
```
Remotes: create in `ReplicatedStorage.Remotes` from one server module (`src/server/Remotes.server.luau`) or define in project json. `init.luau` in a folder makes the folder the module.

## Luau rules
- `--!strict` at top of every file; type function params/returns and module tables (`export type`).
- `local Players = game:GetService("Players")` — always GetService, cached at top.
- Modern APIs only: `task.wait/spawn/delay/defer` (never `wait/spawn/delay`), `:Connect` (never `:connect`), `Instance.new(cls)` then set Parent LAST, `workspace:Raycast` + `RaycastParams` (never `FindPartOnRay`), `TweenService`, `UserInputService`/`ContextActionService`, `Players.PlayerAdded` + loop existing players, `:GetPropertyChangedSignal`, `AssemblyLinearVelocity` (not `Velocity`), `TextChatService` (not legacy chat), `Humanoid:LoadAnimation` → `Animator:LoadAnimation`.
- Server authority: client sends intent only (`FireServer("Attack", targetId)`); server validates (distance, cooldown, ownership, type checks on every remote arg), applies damage/currency/state. Never trust client values for money, damage, position teleports.
- Rate-limit remotes per player (timestamp table). Sanitize strings; check `typeof(arg)`.
- DataStore: `pcall` every call, retry with backoff, `UpdateAsync` for currency, save on `PlayerRemoving` + `game:BindToClose`, session lock or at least one-write-per-6-s rule.
- Clean up: disconnect connections, `Debris:AddItem` or `:Destroy()` temporary parts; `Maid`/Trove pattern if many.
- No `while true do` without `task.wait`; prefer events (`Heartbeat`, `Touched` + debounce).
- Physics ownership: `part:SetNetworkOwner(nil)` for server-controlled NPCs.
- Names: PascalCase modules/instances, camelCase locals.

## Verification (one check)
Playtest via MCP + console shows zero errors/warnings from our scripts and the feature's marker print fired (then remove the print). Multiplayer logic → Studio "Start" with 2 players (PC, manual if MCP lacks it — ask owner).

## Done-check (`checklists/roblox.md`)
- [ ] `--!strict`, no deprecated APIs (grep: `\bwait\(|\bspawn\(|\bdelay\(|:connect\(|FindPartOnRay`).
- [ ] Every RemoteEvent handler validates args server-side.
- [ ] Playtest console clean; debug prints removed.
- [ ] Repo files match Studio (Rojo synced or scripts exported).

## Domain notes and tools
- Models/builds: [detail floor](../../../domains/3d/detail.md) + gate `tools/roblox/detail.luau` → `node tools/roblox/detail-check.mjs - --class hero`.
- Imports/kits/asset ids: [delivery](domains/roblox/delivery.md); UI: [ui](domains/roblox/ui.md); game design + playtest sims: [game-design](domains/roblox/game-design.md); lobbies/maps: [maps](domains/roblox/maps.md).
- Tools: `tools/roblox/rbxmx-check.mjs` (run before handing over any .rbxmx), `tools/roblox/lobby` (validator), `tools/roblox/shop` (palette/vivid checks). Index: `tools/roblox/README.md`.

## Time target
Single script/feature: medium < 5 min (2-3 loop iterations). Full game system (inventory + DataStore + UI): complex tier, split server/client/shared across sub-agents.

## Mobile
No Studio, no MCP. Edit `.luau` files under `src/` in the repo (create the Rojo layout above if missing). Self-check by reading: strict types, grep for deprecated APIs, server validation. Queue: `- [ ] YYYY-MM-DD rojo serve + sync, playtest <feature>, read console, fix — mobile edit of src/<path>.luau`. Visual/instance work (parts, GUIs) → write a builder module that creates instances in code, so the PC step is just "run it".
