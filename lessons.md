---
summary: ACE lesson bullets with helped/hurt counters; append new bullets or bump h/x, never rewrite. Seen twice → promote.
updated: 2026-11-21
status: current
triggers: [lesson, lessons, mistake, correction, rule]
---
# Lessons
Format: `- [L-NNN] (h:helped x:hurt) YYYY-MM-DD rule — trigger: words`. Next id = highest + 1. Promoted → append `→ promoted: path`.

## Rules
- [L-001] (h:0 x:0) 2026-11-21 Sub-agent model alias "sonnet" failed with model_not_found on this machine; omit `model` so the sub-agent inherits — trigger: subagent, agent, model, sonnet, model_not_found
- [L-002] (h:0 x:0) 2026-11-21 WebSearch/WebFetch can fail; fall back to curl on docs (code.claude.com/docs/en/<page>.md) and the GitHub API (api.github.com) — trigger: websearch, webfetch, docs, fetch failed
- [L-003] (h:0 x:0) 2026-11-21 Cloud (phone) sessions load only the repo .claude/; plugins and ~/.claude skills/hooks never load there, so anything mobile needs must live in the repo — trigger: mobile, cloud, plugin, skill missing, hook missing
- [L-004] (h:0 x:0) 2026-11-21 Hook additionalContext is cut at 10,000 chars; keep SessionStart injection <= 8000 chars total — trigger: hook, additionalContext, session-start, truncated
- [L-005] (h:0 x:0) 2026-11-21 Stop hook block loop caps at 8; stop-gate must exit 0 silently when stop_hook_active is true — trigger: stop hook, stop-gate, loop, stop_hook_active
- [L-006] (h:0 x:0) 2026-11-21 MEMORY.md/auto-memory loads only the first 200 lines / 25KB; put critical facts at the top or in the vault — trigger: memory, MEMORY.md, auto-memory
- [L-007] (h:0 x:0) 2026-11-21 CLAUDE.md @imports load in full at start (no context savings); link notes instead of importing — trigger: CLAUDE.md, import, @import, context size
- [L-008] (h:0 x:0) 2026-11-21 On Windows hooks run in Git Bash; use forward slashes and quote "$CLAUDE_PROJECT_DIR" (path has a space) — trigger: windows, hook, path, backslash, git bash
- [L-009] (h:0 x:0) 2026-11-21 Roblox Studio has a built-in MCP; the old studio-rust-mcp-server repo is deprecated, do not install it — trigger: roblox, studio, mcp, rust-mcp
- [L-010] (h:0 x:0) 2026-11-21 Blender MCP: save the .blend before every execute_blender_code call; a bad script can crash Blender and lose work — trigger: blender, execute, bpy, crash
- [L-011] (h:0 x:0) 2026-11-21 Blender imported/generated assets arrive at arbitrary scale; size from world_bounding_box and place on ground — trigger: blender, import, asset, scale, generate_3d
- [L-012] (h:0 x:0) 2026-11-21 Artifacts cannot load external assets except pinned CDN libs; inline assets/procedural generation, pin exact CDN versions — trigger: artifact, cdn, preview, mobile, three.js
- [L-013] (h:0 x:0) 2026-11-21 Cloud bundle limit is 100 MB; keep binaries (.blend, .rbxl, .wav, builds) out of git, commit generator scripts — trigger: git, binary, push, 100 MB, cloud
- [L-014] (h:0 x:0) 2026-11-21 Switching fast mode or model mid-session breaks the prompt cache; set both at session start — trigger: fast mode, model, cache, slow
- [L-015] (h:0 x:0) 2026-11-21 Agent teams cost ~7x tokens; never use them for simple/medium tasks, huge tier only — trigger: agent team, swarm, sub-agents, tokens
- [L-016] (h:0 x:0) 2026-11-21 Mobile never says "failed" when a fallback exists; do the fallback and queue the PC step in queue/pc.md — trigger: mobile, failed, can't, pc-only, queue
- [L-017] (h:0 x:0) 2026-11-21 Sub-agent model alias "haiku" also fails with model_not_found on this PC (same as "sonnet"); never set model on agents — trigger: haiku, model, subagent, explorer
- [L-018] (h:0 x:0) 2026-11-21 The permission classifier blocks sub-agents that read the owner's other vaults unless the owner asked; keep workers inside this repo — trigger: other vault, Newest-Vault, permission, denied
