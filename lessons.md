---
summary: ACE lesson bullets with h/x counters; append-only, in place only bump counters or append promoted/dup tags. Seen twice → promote.
updated: 2026-11-21
status: current
triggers: [lesson, lessons, mistake, correction, rule]
---
# Lessons
Format: `- [L-NNN] (h:helped x:hurt) YYYY-MM-DD rule — trigger: words`. Next id = highest + 1.
lessons.md is append-only; allowed in-place edits are only bumping h:/x: counters and appending ` → promoted: <path>` or ` → dup of L-xxx` to a bullet's end; pruning is proposed in log.md, never deleted.

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
- [L-019] (h:0 x:0) 2026-11-18 routing by judgment sent tasks to the wrong note; route by router.json words and replay the real ask through hooks/prompt-router.mjs after adding a word — trigger: misroute, wrong note, route, routing
- [L-020] (h:0 x:0) 2026-11-18 a session built a separate page because the router never named the existing tool; name every tool/skill in index.md and reuse it before building new — trigger: separate page, new tool, duplicate, already exists
- [L-021] (h:0 x:0) 2026-11-18 a test prop was exported with the result; mark test helpers temporary and exclude them from every export — trigger: test prop, helper, export, temp, projectile
- [L-022] (h:0 x:0) 2026-11-18 live writes failed past size/count caps (doc 256 KB, ~150 objects per batch, a 658 KB mesh); measure payload size first, chunk writes, merge mass-repeated pieces into one mesh per colour — trigger: too large, refused, write failed, size limit, batch
- [L-023] (h:0 x:0) 2026-11-19 faces with inverted (negative) scale were invisible; check winding/normals face outward before writing geometry — trigger: invisible faces, inverted, negative scale, normals, winding
- [L-024] (h:0 x:0) 2026-11-19 called a scene clean from desktop renders while the owner's phone showed z-fighting (layers 1-12 cm apart) and the tab pointed at deleted geometry; never stack surfaces, verify on the target's read-back — trigger: z-fighting, flicker, phone, read-back, coplanar
- [L-025] (h:0 x:0) 2026-11-18 owner rejected a 4-part draft and a bare slab when a meadow was asked; no placeholders, the named theme is built first everywhere the camera sees — trigger: placeholder, draft, blockout, theme, empty, plain
- [L-026] (h:0 x:0) 2026-11-18 followed an old stored copy of the rules; the owner's latest word beats any stored rule, update that rule in the same task — trigger: old rules, outdated, owner said, correction
- [L-027] (h:0 x:0) 2026-11-18 wrote Luau scripts when the owner wanted a UI designed in Studio; "build me X" means the built thing in the target tool unless scripts are asked — trigger: build me, ui, gui, scripts, design in studio
- [L-028] (h:0 x:0) 2026-11-18 UI rejected 8 times for ad hoc colours, generic fonts, black outlines, overlaps; decide references + palette + layout + type first, check palette and overlaps by script on a render — trigger: ugly, generic, palette, overlap, font, ui rejected
- [L-029] (h:0 x:0) 2026-11-21 Hook commands must be `node "./hooks/x.mjs"` with ROOT from the hook file's location: after a session moves folders CLAUDE_PROJECT_DIR still points at the OLD folder, so $CLAUDE_PROJECT_DIR paths silently miss (hooks run in Git Bash, cwd = vault) — trigger: hook, CLAUDE_PROJECT_DIR, hook not firing, settings.json
- [L-030] (h:0 x:0) 2026-11-21 Never make a hook fail closed (`|| echo deny`): one broken guard locked every edit and shell call, including the fix — trigger: hook, deny, locked, fail closed
- [L-031] (h:0 x:0) 2026-11-21 Root cause of L-017: the desktop app sets ANTHROPIC_DEFAULT_SONNET_MODEL/OPUS/HAIKU=auto, so every model alias resolves to "auto" (404); omit model or pass a full model id — trigger: model_not_found, auto, alias, sonnet, haiku
- [L-032] (h:0 x:0) 2026-11-21 Never invent Roblox asset ids; leave named slots (SheetAssetIds / AssetId) and list which file goes where — trigger: asset id, upload, sheet, kit
- [L-033] (h:0 x:0) 2026-11-21 Run tools/roblox/rbxmx-check.mjs before handing over any .rbxmx — trigger: rbxmx, export, kit, deliver
- [L-034] (h:0 x:0) 2026-11-21 Node tool paths use fileURLToPath(import.meta.url), never URL.pathname (breaks on Windows and spaces) — trigger: ENOENT, C:C:, windows path
- [L-035] (h:0 x:0) 2026-11-21 The theme the owner names is built first everywhere the camera sees; no placeholders — trigger: lobby, map, meadow, scenery
- [L-036] (h:0 x:0) 2026-11-21 Run the zfight check on the Studio tab read-back and judge on phone depth (SHOTS_DEPTH16=1); a desktop render proves nothing — trigger: flicker, z-fighting, studio build
- [L-037] (h:0 x:0) 2026-11-21 A named art style means its STYLES row text verbatim; never paraphrase it — trigger: art style, voxel art, anime, image prompt
- [L-038] (h:0 x:0) 2026-11-21 Animation = key poses with smooth sine tweens from one spec; never a key per frame or edits to one output — trigger: animation, clip, keyframe
- [L-039] (h:0 x:0) 2026-11-21 Extend the Studio editor (tools/3d/studio) with a plugin before building a new 3D editor — trigger: editor, mini-blender, 3d editor
- [L-040] (h:0 x:0) 2026-11-21 Tool scripts take NODE_TOOLS/CHROME/DEPS env vars, never hardcoded machine paths — trigger: playwright, render.js, test runner
- [L-041] (h:0 x:0) 2026-11-21 Flipbook effect = 4 stacked recipes; `vfx.py --check` must show max_step_jump < ~3 and thin_stroke_pct < ~10, built to scratch — trigger: flipbook, sheet, vfx sheet
- [L-042] (h:0 x:0) 2026-11-21 New effect = a recipe of existing presets; only new physics gets code — trigger: new effect, preset, recipe
- [L-043] (h:0 x:0) 2026-11-21 8x8 sheets need FlipbookLayout Grid8x8, never a helper hard-coded to 4x4 — trigger: flipbook quarter frames, ElementVFX
- [L-044] (h:0 x:0) 2026-11-21 Effects never vanish cleanly: they erode into lingering embers or ash — trigger: effect end, dissipate, fade out
- [L-045] (h:0 x:4) 2026-11-21 Regex/backslash code piped through a Bash heredoc into node gets re-escaped and breaks; edit JS files with the Edit tool, not string-replace scripts — trigger: heredoc, node -e, escape, regex, anchor not found → promoted: checklists/vault.md
- [L-046] (h:0 x:1) 2026-11-21 Hook/automation work (code + tests + live check) was tiered medium (5 min) and took 6 min; it is complex tier → route hook/automation prompts as complex and plan the test run up front — trigger: hook, hooks, automation, learning loop, tier, slow
- [L-047] (h:0 x:1) 2026-11-21 Asked the owner for "Umbrio sandbox" after one gallery search; artifact listings can miss items (25-item cap, other orgs, chat artifacts) → keep owner tools in profiles/tools.md, search registry + scope all + fuzzy titles before asking, and save any link the owner gives the same turn — trigger: artifact, sandbox, generator, can't find, umbrio
- [L-048] (h:0 x:1) 2026-11-21 skill-miss fired on vault-tooling work because the prompt mentioned 'vfx' (an artifact name) and the check counted any file write → skill-miss only counts writes outside vault plumbing (hooks, scripts, notes, router) — trigger: skill miss, false positive, vfx, artifact name
- [L-049] (h:0 x:1) 2026-11-21 Umbrio Sandbox is a tile inside the Claude-Hub artifact, not its own gallery item, so a gallery title search can't find it → search Claude-Hub's index.html tool list (T: name, entry) before asking; hub tools are registered in profiles/tools.md — trigger: umbrio, sandbox, hub tool, can't find artifact
- [L-050] (h:0 x:1) 2026-11-21 built a new VFX generator straight from memory without invoking the routed vfx skill, so its recipe rules (4 layers with roles, physics not painting, look over dark and light, --check) were applied by luck → for any VFX build invoke the vfx skill first and follow its done-check, even when writing a new generator — trigger: vfx, generator, new effect tool, liquid
- [L-051] (h:0 x:1) 2026-11-21 treated a met speed goal as finished and answered the honesty request without saving it → owner rules are saved and enforced the same turn; a met goal still gets one concrete improvement — trigger: honest, transparency, improve, goal met
- [L-052] (h:0 x:1) 2026-11-21 the asset uploader only reads the working directory → upload hub assets from .worktrees/, not the scratchpad — trigger: asset upload, file_paths, outside allowed read paths
- [L-053] (h:0 x:1) 2026-11-21 the 8.3 short path the 8.3 short home path (NAME~1) is not matched as the allowed scratchpad, and uploads only read the working dir → never pass the LITTLE~1 short path to Artifact tools; long path for out_dir, .worktrees/ for uploads — trigger: out_dir, file-edit safety rules, LITTLE~1, scratchpad path
- [L-054] (h:0 x:1) 2026-11-21 reused the floor-splash sim for mid-air pops and baked an upper-left light into opaque camera-facing cards → match the sim to where the effect plays (air vs floor); flipbook cards are front-lit and translucent, never baked side light — trigger: mid air, hits the ground, layer on top, sticker, lighting weird, blend in
- [L-055] (h:0 x:1) 2026-11-21 the owner's open Studio tab re-saves the project (and meta thumb) after viewing, so a version from an earlier session is stale → always re-read a hub project's version right before writing it; never reuse a pin from an earlier turn — trigger: version_mismatch, if_version, stale pin, hub project write
