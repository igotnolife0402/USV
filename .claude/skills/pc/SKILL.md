---
name: pc
description: 'Use when the owner''s message starts with /pc. Sets PC mode for this session: every connected MCP, tool, plugin, local file and desktop app is allowed. Runs queued PC steps first only when the task needs them or "/pc" has no task; "/pc" alone with an empty queue replies "PC mode."'
---
# /pc — PC mode

The prompt-router hook already wrote `.claude/.mode` = `{"mode":"pc","session_id":...}`. Do not write it yourself.

## Rules
1. Message is exactly `/pc` (nothing after): queued items injected → run them (rule 4); none → reply `PC mode.` and stop, no tool calls.
2. Everything is allowed: every connected MCP server, Bash/PowerShell, local files anywhere, desktop apps (Roblox Studio, Blender), browser automation, computer use, plugins.
3. Route order (first that works wins):
   1. Claude-native: Read/Edit/Write/Grep/Glob/Bash, sub-agents, Artifacts.
   2. Dedicated MCP for the app (Roblox_Studio, blender, figma, ...).
   3. Chrome MCP for web apps without a dedicated MCP.
   4. Computer use for native apps with no MCP.
4. PC QUEUE: the SessionStart hook already injected the unchecked items (local `queue/pc.md` plus items on `origin/claude/*` cloud branches, and branches to merge); do not re-read it. Do queued items first only if the current task depends on them or the owner sent `/pc` with no task; otherwise mention them in one line and do the task. Merge the listed cloud branch before working its items; tick each done item `- [x]`.
5. Preflight before any desktop-app MCP work (one call each, not a research project):
   - Roblox Studio: Studio open with the place loaded + built-in MCP enabled → call a cheap read tool (list/get children of `game.Workspace`). Fails → tell owner "Open Studio, enable MCP (Assistant > MCP)" and continue with repo files meanwhile.
   - Blender: `get_addon_status` then `get_scene_info`. Fails → "Start Blender + MCP add-on".
   - Chrome: one `tabs` read. Not connected → ask owner to connect the extension.
6. Local paths outside the repo live in `CLAUDE.local.md` (gitignored). Read it when a task needs a PC path.
7. Remote: if `CLAUDE_CODE_BRIDGE_SESSION_ID` is set the phone is driving the PC; still PC mode, keep replies short.
8. Then follow the tier from CLAUDE.md and the routed skill (website, roblox, 3d-editor, ...).

## Done-check
- Queue items handled are ticked in `queue/pc.md`.
- Task's checklist (`checklists/<type>.md`) passes.
- One line in `log.md` if the vault changed.

## Mobile
Not applicable: on a phone cloud session use the `mobile` skill. If the owner types /pc from a cloud session (`CLAUDE_CODE_REMOTE=true`) say: "This is a cloud session; PC tools are not here. Use /remote-control from the PC session, or I continue in mobile mode." and follow the `mobile` skill.
