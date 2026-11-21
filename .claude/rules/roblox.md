---
paths: ["**/*.luau","**/*.lua","**/default.project.json","domains/roblox/**"]
---
# Roblox rules
- Use Studio's built-in MCP server; never install or suggest the deprecated studio-rust-mcp-server.
- Every gameplay change goes through edit → play → read console → stop → fix before it counts as done.
- Use `task.wait/spawn/delay`; never `wait()`, `spawn()`, `delay()`.
- Server is authoritative: validate type, range and rate of every RemoteEvent/RemoteFunction arg.
- DataStore calls go in `pcall` with retry; use `UpdateAsync`; save on PlayerRemoving and BindToClose.
- Repo files are source of truth when `default.project.json` exists; never leave Studio-only script edits.
- New `.luau` files start with `--!strict`; run luau-lsp analyze before done.
- Script suffixes: `.server.luau` Script, `.client.luau` LocalScript, `.luau` ModuleScript.
- Mobile mode: no Studio claims; queue play-tests in queue/pc.md.
- Check domains/roblox/errors.md before debugging; add new failures there.
