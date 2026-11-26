---
name: mobile
description: 'Use when the owner''s message starts with /mobile or the session is a phone cloud session (CLAUDE_CODE_REMOTE=true). No PC-only tools; use repo files, Artifacts and remote connectors, queue PC-only steps in queue/pc.md. "/mobile" alone replies "Mobile mode." and stops.'
---
# /mobile — Mobile mode

The prompt-router hook already wrote `.claude/.mode` = `{"mode":"mobile",...}`. Do not write it yourself.

## Rules
1. Message is exactly `/mobile` → reply `Mobile mode.` and stop.
2. PC-only tools are unavailable here and the pre-tool hook denies them: Roblox Studio MCP, Blender MCP, browser automation (claude-in-chrome), agent-audio MCP (local stdio), computer use, terminal panel, plugins, local paths outside the repo (`C:\...`, `~/...`). Use the fallback below instead.
3. Allowed: Read/Edit/Write/Grep/Glob/Bash inside the repo checkout in the cloud session, sub-agents, Artifacts (HTML/React previews), GitHub, remote connectors actually present in this session.
4. Never answer "Failed" / "can't" when a fallback exists. Fallback table:
   | Wanted | Do instead |
   |---|---|
   | Studio edit/play | Edit `.luau` under the Rojo `src/` tree in the repo; queue sync + playtest |
   | Blender model | three.js Artifact preview or procedural geometry code; queue Blender step |
   | Browser screenshot check | Headless Playwright screenshot at 390px + 1280px here; queue only if it can't run |
   | Run desktop app / local file | Repo file + queue the step |
   | Audio tool | WebAudio code (sfx skill), Artifact player |
5. Queue the PC-only remainder: append to `queue/pc.md`, one line each, exact format:
   `- [ ] YYYY-MM-DD step — context` (e.g. `- [ ] 2026-11-21 Rojo sync + playtest Sword.luau, check console — mobile edit of src/server/Sword.server.luau`).
   Steps must be executable cold: name files, the command/tool, and what "done" looks like.
   Sync: commit `queue/pc.md` together with the work to this cloud session's branch (the cloud pushes it). The PC SessionStart hook fetches origin and lists unchecked items from `origin/claude/*` branches plus the branches to merge; nothing else is needed.
6. PC on and live PC tools truly needed (Studio play, Blender render)? Suggest: "Run /remote-control on the PC to drive it from the phone." Do not wait; do the fallback now. If the session exposes `list_computer_folders` / `request_computer_folder`, attach the PC folder to read files that live only there; still mobile mode.
7. Keep replies short (phone screen). Always commit queue items + work to the session branch (rule 5); other pushes only if the owner asks or the cloud flow requires it.

## Done-check
- Fallback output exists (repo files or Artifact).
- Every PC-only step is in `queue/pc.md` in the exact format.
- Reply ends with one line: `Queued N PC steps.` (if N > 0).
