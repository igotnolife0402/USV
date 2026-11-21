---
summary: Known Roblox/Luau/Studio MCP/Rojo failures with cause and fix; check before debugging
updated: 2026-11-21
status: current
triggers: [roblox error, luau error, studio crash, rojo error, datastore error]
---
# Roblox errors

| Symptom | Cause | Fix | Seen |
|---|---|---|---|
| Studio MCP tools missing from tool list | Studio closed or MCP not enabled in Studio settings | Open Studio, enable MCP server in settings, restart Claude session | 2026-11-21 |
| Someone suggests studio-rust-mcp-server | Old repo, deprecated | Use Studio's built-in MCP (create.roblox.com/docs/studio/mcp) | 2026-11-21 |
| `Infinite yield possible on 'ReplicatedStorage:WaitForChild("X")'` | Name typo or object created later on server only | Check exact name/path; create object in Rojo tree or server before client waits | 2026-11-21 |
| LocalScript does nothing | Placed in Workspace or ServerScriptService | Put in StarterPlayerScripts, StarterGui, StarterCharacterScripts or ReplicatedFirst | 2026-11-21 |
| Server Script does nothing | Placed in ReplicatedStorage or StarterGui | Put in ServerScriptService (or Workspace) | 2026-11-21 |
| `HTTP 403 (Forbidden)` / DataStore fails in Studio | API services disabled for the place | Game Settings → Security → Enable Studio Access to API Services (place must be published) | 2026-11-21 |
| `DataStore request was added to queue` warning | Too many requests per key/minute | Cache in memory, save on interval >= 60 s and on leave; use UpdateAsync | 2026-11-21 |
| Data lost on server shutdown | No BindToClose save | `game:BindToClose` saves all players, wait for completion (30 s cap) | 2026-11-21 |
| Rojo: `default.project.json` changes ignored / scripts duplicated | Plugin connected to old session or instance created in Studio, not files | Reconnect plugin; delete Studio copy; files are source of truth | 2026-11-21 |
| Rojo plugin "version mismatch" | CLI and Studio plugin versions differ | `rojo plugin install` with same CLI version, or update via aftman/rokit | 2026-11-21 |
| Parts fall through world / scatter on play | Not Anchored, or welded to unanchored root | Anchor static parts; WeldConstraint to anchored root; check CanCollide | 2026-11-21 |
| Mesh import fails or is simplified | Over 20k triangles per MeshPart or >10k-ish for skinned | Decimate in Blender, split mesh, see [3d pipeline](domains/3d/pipeline.md) | 2026-11-21 |
| Exploiters give themselves currency | Client sends amount in RemoteEvent | Server computes values; validate type/range/rate of all args | 2026-11-21 |
| `attempt to index nil with 'Humanoid'` | Character not loaded yet or died | `player.Character or player.CharacterAdded:Wait()`; FindFirstChildOfClass | 2026-11-21 |
| Touched fires many times | No debounce, multiple limbs touch | Per-player debounce table keyed by UserId | 2026-11-21 |
| luau-lsp: unknown global `game`/`workspace` | Missing Roblox definitions file | Pass `--definitions=globalTypes.d.luau` (from luau-lsp releases) and sourcemap from `rojo sourcemap` | 2026-11-21 |
| Uploaded audio/image stays "pending"/blocked | Moderation or audio privacy permissions | Wait for moderation; grant place permission to the asset | 2026-11-21 |
| Owner: UI "plain grid, ugly" / "a pro had 1 minute" | Uniform small cards, built-in boxes and glyph icons, uneven gutters | Hero offer + few big cards, hand-made skins, drawn icons, 8 px grid ([ui](domains/roblox/ui.md)) | 2026-11-18 |
| Owner: colours "soft", then "gloomy" | Pastels, then near-black panels/outlines added for contrast | Vivid palette (s,v >= 0.75), coloured outlines, white plates; `vividCheck()` fails the build | 2026-11-18 |
| Owner: fonts/outlines "generic" | Default simulator recipe (Fredoka/Luckiest Guy, black outline everywhere, all centred) | Decide a type system with palette+layout, show 3 directions first | 2026-11-18 |
| UI art/badges break card edges, parts poke through | No containment rule | Every box inside its parent, outline+lip counted; overlap check (`shop/preview.mjs`) | 2026-11-18 |
| Phone UI: 9-11 px text, 30 px taps, clipped rows | Designed on desktop only | >= 14 px text, >= 44 px taps, effect line per card; render at 844x390 before going live | 2026-11-18 |
| Wrote Luau for a GUI the owner wanted designed in Studio | Misread "build me a UI" | UI requests = build instances in Studio unless scripts are asked for | 2026-11-18 |
| Live write failed halfway (doc too big) | Thousands of grass parts as separate objects | Merge mass-repeated pieces into one mesh per colour; doc <= 230 KB | 2026-11-18 |
| Large batch update refused | One giant write | Chunk writes: <= 150 objects, < 750 KB per batch (`lobby/stage.mjs`, `live.mjs`) | 2026-11-18 |
| Owner: "no scenery, I said grassy meadow" / placeholder spawn | Plain slab, 4-part draft, stand-in spheres | Build the named theme everywhere first; no placeholders; hero floors in [maps](domains/roblox/maps.md) | 2026-11-18 |
| Imported kit does nothing / effects blank | Mesh names changed on import, or `SheetAssetIds` empty | Keep importer names; owner uploads sheets and pastes ids ([delivery](domains/roblox/delivery.md)) | 2026-11-13 |
| Exported sphere/cylinder arrives as mesh placeholder | Non-uniform scale on round parts | Keep spheres/cylinders round; bake scale, no scaled groups | 2026-11-13 |
| Tool script ENOENT `C:\C:\...` on Windows | `new URL(...).pathname` used as a file path | `fileURLToPath(new URL(...))`; main guard `pathToFileURL(process.argv[1]).href` | 2026-11-21 |
| Open Cloud Model upload of .rbxmx: 'Creating Model from a model/x-rbxmx file is not supported yet' | the file part was sent as model/x-rbxmx; the API wants model/x-rbxm for both .rbxm and .rbxmx | pass contentType model/x-rbxm on the file | 2026-11-22 |
| execute_luau: 'X is not a valid member of Workspace' / 'CFrame is not a valid member of Motor6D' | Luau indexed instances by name: the owner had removed the inserted model, and Motor6Ds share their part's name, so FindFirstChild(name, true) hit a joint | read uploaded assets with game:GetObjects('rbxassetid://id') instead of workspace; search descendants with IsA('BasePart') when names repeat | 2026-11-22 |
| ParticleEmitter Size came in as 1 from an exported .rbxmx (burst invisible inside the body) | the XML writer maps prop 'Size' to the BasePart lowercase 'size' for every class, so ParticleEmitter.Size was dropped | lowercase only for BasePart props; NumberSequence/NumberRange keep their names; test a ParticleEmitter by reading its Size back in Studio | 2026-11-22 |
| client Script (RunContext Client) found nothing to animate: parts unchanged | the script scanned the model once at start, before its parts streamed in to the client | scan + model.DescendantAdded, and look up joints lazily | 2026-11-22 |
