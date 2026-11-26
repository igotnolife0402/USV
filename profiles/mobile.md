---
summary: Mobile (phone cloud session) capabilities, what never exists, PC→mobile fallback table, queue format, Remote Control rule.
updated: 2026-11-21
status: current
triggers: [mobile, phone, cloud, fallback, remote]
---
# Profile: mobile (Claude Code cloud session from the phone)
Rule: never say "failed"/"can't" when a fallback exists. Do the fallback, queue the PC step, report both.

## Exists
- Repo files (this vault clone), Linux shell, git (commit/push to this repo), node.
- Web fetch/search (fall back to curl on docs + GitHub API if they fail).
- Sub-agents (omit `model`), repo `.claude/` skills, agents and hooks.
- Remote connectors configured for the account (e.g. Firecrawl, Figma, Claude Docs, Customuse) if present in the session tool list: check, don't assume.
- Artifacts in the Claude chat app (HTML/React previews; no external assets except pinned CDN libs).

## Never exists
- Local PC files outside the repo, `CLAUDE.local.md` paths.
- stdio MCPs: Roblox Studio MCP, Blender MCP, computer use, Claude in Chrome, built-in browser automation.
- Plugins, ~/.claude skills/hooks/settings, bypass-permissions mode.
- PC mode: `/pc` typed here stays mobile. Don't add npm dependencies (vault is Node stdlib only).

## Fallback table
| PC tool | Mobile next-best | Queue for PC |
|---|---|---|
| Roblox Studio MCP | Edit .luau files in Rojo layout in the repo; static-check logic | "sync via Rojo / paste into Studio, playtest" |
| Blender MCP | three.js Artifact preview + bpy script saved in the repo | "run script in Blender, export glb" |
| Browser testing (Chrome/preview) | Headless Chromium + Playwright (preinstalled, `require("playwright")`, verified 2026-11-23): one small screenshot; CDN hosts can 403 here (jsDelivr 2026-11-24): put three@<pin> from npm in the scratchpad and `page.route` the CDN URL to it (tools/roblox/wyvern/test/shot.mjs); WebGL needs `--use-angle=swiftshader`; else Artifact preview + node checks | "visual check in Chrome" if layout-critical |
| Computer use | none | the full step |
| agent-audio / audio gen | procedural WebAudio or jsfxr params in code | "generate final SFX with agent-audio" if needed |
| Local files | repo files only; ask owner to commit missing files | "copy X into repo" |
| Customuse gen (if connector absent) | procedural/primitive model | "generate in Customuse" |

## Queue format (append to [queue/pc.md](queue/pc.md))
`- [ ] YYYY-MM-DD step — context (files, why, expected result)`
One line per PC-only step, imperative, enough context to run cold.
Queue sync: mobile commits queue/pc.md and its work to its cloud session branch (the cloud pushes it); the PC SessionStart hook fetches origin and lists unchecked items from origin/claude/* branches plus the branches to merge.

## Remote Control
If the PC is on and the owner wants PC tools from the phone, suggest `/remote-control` (phone drives the PC session; mode becomes pc, remote). Don't suggest it for work the fallback covers.

PC capabilities: [profiles/pc.md](profiles/pc.md).
- New cloud session screen (before the first message): the `/` menu lists built-ins only (`/model`); repo skills load after the clone. Type the full `/improve 90 <prompt>` and send, or send one message first, then `/` lists repo skills (owner screenshot 2026-11-23). Account skills (claude.ai upload) are repo-independent.
