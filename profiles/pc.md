---
summary: PC mode capabilities (all MCPs, tools, plugins, local files), preflight before MCP work, queue-first and push-after rules.
updated: 2026-11-21
status: current
triggers: [pc, desktop, mcp, preflight, local]
---
# Profile: pc (Windows desktop)
Everything connected is allowed. Order: Claude-native (own tools, repo skills) → dedicated MCP → browser MCP → computer use.

## Capabilities
- Local files anywhere the owner points (paths in `CLAUDE.local.md`), terminal (Git Bash + PowerShell), git, node.
- Roblox Studio built-in MCP (Roblox_Studio): read/write the open place, run Luau. Old studio-rust-mcp-server is deprecated.
- Blender MCP (blender): execute_blender_code (bpy), look, get_scene_info, search_assets/import_asset, generate_3d.
- Built-in browser preview and Claude in Chrome (`mcp__claude-in-chrome__*`): DOM-aware testing of sites/games.
- Computer use (`mcp__computer-use__*`): native apps with no MCP; request_access first.
- Terminal tools, scheduled tasks, worktrees (`git worktree`) for parallel sub-agents.
- Remote MCPs: Firecrawl (search/scrape/developer docs), Figma (create_session first), Claude Docs, Customuse (3D/image gen, needs workflowId), agent-audio (SFX/voice gen).
- Plugins and ~/.claude skills/hooks load here (never on mobile).
- Sub-agents (omit `model`, replies <= 2k tokens), agent teams (huge tier only).

## Preflight (before the first call to any app MCP)
1. Desktop app is open (Studio with the place loaded; Blender running).
2. Addon/plugin enabled (Blender MCP addon connected; Studio MCP toggle on).
3. One status call: Blender `get_addon_status` + `get_scene_info`; Studio a cheap read (list services/selection); Chrome `tabs_context`.
4. Fail → tell the owner the one exact step to fix (open app / enable addon), do non-MCP parts meanwhile. Do not loop retries.
- Blender: save the .blend before every execute call. Imported assets: rescale from world_bounding_box.

## PC QUEUE first
- SessionStart shows [queue/pc.md](queue/pc.md). If items exist, list them in one line and offer to run them before new work (run them first if they block the task).
- Done item → `- [x]`, add result in a few words; rolled to archive monthly.

## After work
- Log to [log.md](log.md); stop-gate auto-commits. Push so phone sessions see the change (`git push`).
- Binaries stay local/out of git; commit the scripts that produce them.
- Mobile rules and fallbacks: [profiles/mobile.md](profiles/mobile.md).
