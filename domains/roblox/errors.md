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
