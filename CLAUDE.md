# Super Vault: router (AI-only, read by Claude only)

Knowledge vault for the owner's builds: Roblox games, websites, browser games, 3D models, VFX, sounds, tools (e.g. browser mini-Blender).
Runs from the Windows PC (`pc`) and from phone cloud sessions on this repo (`mobile`). Contract: [.orchestration/ARCHITECTURE.md](.orchestration/ARCHITECTURE.md).
Prime directives: hit the tier time target; never fill context; leave the vault smarter than you found it.

## Owner rules (both modes; detail in [profiles/owner.md](profiles/owner.md), read it before any build)
- 100% honest: never call it done unless checked; else `Failed: <what>`, no excuses or softening. A fallback + queued PC step is not a failure.
- Always improve: goal met is not the end; every build leaves one concrete improvement in the vault.
- No overkill: one big effect when the whole thing completes, or small subtle ones throughout; never a big effect per step. Less when unsure.
- Never claim a look you did not see: say "not visually verified" and queue the visual check.
- Replies short (aim <= 10 words); errors, questions and requested reports exempt.
- Max quality, no placeholders, scope = exactly what was asked. Owner's latest word beats any stored rule: fix that rule now.

## 0. Session start (every session)
1. Read the hook-injected block: mode, profile, index, newest lessons, PC queue. Do not re-read those files.
2. PC QUEUE: do queued items first if the task depends on them or the owner says /pc with no task; otherwise mention them in one line. Injected files are not re-read.
3. Pick tier (section 1), then set effort/fast mode once. Do not switch later.
4. Open the router-named checklist before building, not after.
5. Long task: create `state/<task>.md` before the first sub-agent.

## 1. Classify the task first (tier)
| Tier | Target | Do | Skip |
|---|---|---|---|
| Simple | < 1 min | Read only routed notes; answer or one edit; quick check | Plans, research, sub-agents |
| Medium | < 5 min | One recipe skill + scaffold; build in one thread; one check (/verify or screenshot); checklist; stop | Plan mode, agent teams, polish past the checklist |
| Complex | < 30 min | Short plan; contracts first; 2-4 sub-agents in own worktrees with file lists; 3-try cap; qa-gate before merge; `state/<task>.md` | Research rabbit holes, one giant context |
| Huge | 30-min waves | `swarm` skill: orchestrator plans only, domain leads, workers, qa-gate, retro into lessons.md | Simple/medium work |
- The prompt-router hook tags tier from router.json `tiers` words. No tag = medium unless obviously one-line.
- Over budget: ship the working subset, log what is left, stop. Never gold-plate.
- Multiple routes hit (e.g. roblox + vfx): primary = the deliverable's platform; read the secondary playbook only for the part it covers.
- Ambiguous request: pick the most likely reading, state it in one line, build. Ask only if a wrong guess wastes > 5 min.

## 2. Mode rules
- Auto-detect (hook): `CLAUDE_CODE_REMOTE=true` → mobile; else pc. `CLAUDE_CODE_BRIDGE_SESSION_ID` set → pc, remote.
- Override: prompt starting `/pc` or `/mobile` sets mode for this session only (`.claude/.mode`). `/pc` inside a cloud session stays mobile (PC tools do not exist there).
- In this vault the repo skills `.claude/skills/pc|mobile` and `profiles/` win over any plugin /pc or /mobile skill (plugins don't load in cloud sessions anyway).
- pc: every connected MCP, tool, plugin and local file is allowed. Claude-native routes first (own tools, repo skills), then MCPs, then computer use. Run [profiles/pc.md](profiles/pc.md) preflight; [queue/pc.md](queue/pc.md): PC QUEUE: do queued items first if the task depends on them or the owner says /pc with no task; otherwise mention them in one line.
- mobile: only tools that exist in the cloud session ([profiles/mobile.md](profiles/mobile.md)). PC-only step → use the fallback from the table, append the PC step to [queue/pc.md](queue/pc.md), report "done on mobile, PC step queued". Queue sync: mobile commits queue/pc.md and its work to its cloud session branch (the cloud pushes it); the PC SessionStart hook fetches origin and lists unchecked items from origin/claude/* branches plus the branches to merge.
- Never report "failed" or "can't" when a fallback exists. Pre-tool hook blocks PC-only tools on mobile: take the fallback it names, do not retry.

## 3. Retrieval rules (context is the scarce resource)
- Start from what the hooks injected: profile, [index.md](index.md), newest lessons, PC queue, router hits for the prompt.
- Read only the routed domain: its `index.md`, then `playbook.md`; `errors.md` only on an error; `pipeline.md` only for multi-step builds.
- Grep before reading: `grep -rn "<term>" domains/<d>/` then read the hit range (<= 60 lines), not the whole file.
- Cap tool output (`| tail -20`, `cut -c1-300`); never cat big files or logs. Images: one small screenshot per check, never full-size series.
- Test only what changed; full suites only before shipping.
- Never bulk-load folders, never read archive/ unless the task is history. Never read other domains "for context".
- Need broad search? One `explorer` sub-agent (complex only), reply <= 2k tokens.
- Unknown API/version facts: official docs first (curl the .md page), not memory.

## 4. Write rules
- One fact lives in one place. Elsewhere, link to it.
- Notes <= 150 lines (hard 200). Split by sub-topic before growing past 150.
- Every note: frontmatter `summary`, `updated: YYYY-MM-DD`, `status: current|superseded`. Dated facts get the date inline.
- Supersede, don't delete: set `status: superseded` + `superseded_by: path`, keep the file.
- New note → add one line to its domain `index.md` the same task. Unlinked note = lost note.
- [log.md](log.md): append one `## [YYYY-MM-DD] op / title` + 1-3 lines every session (stop-gate enforces).
- [lessons.md](lessons.md) (ACE): lessons.md is append-only; allowed in-place edits are only bumping h:/x: counters and appending ` → promoted: <path>` or ` → dup of L-xxx` to a bullet's end; pruning is proposed in log.md, never deleted.
- Binaries (models, audio, builds) stay out of git; commit scripts that regenerate them.
- Paths: forward slashes everywhere (hooks run in Git Bash on Windows).

## 5. Self-improvement loop (every session)
On any error, failed check or owner correction, in the same task:
1. Fix the wrong or missing note (domain `errors.md` or `playbook.md`).
2. Add a lesson bullet, or bump `h:`/`x:` on the matching one.
3. Add the trigger words that should have routed here to [router.json](router.json) (route `words` or `tiers`).
4. Lesson seen twice (h >= 2 or same root cause twice) → promote to a rule in the domain playbook or a hook; leave the lesson bullet, add `→ promoted: path`.
On success with a reusable trick: add it to the domain playbook or snippets, link it from the index.
Hooks run this loop automatically (`hooks/learn.mjs`): Stop reads the turn's transcript and blocks once on any real tool error (every task, however small: pictures, models, math, vault upkeep), a repeated failing call, a turn over its tier target, an owner complaint or a router miss, until the lesson + note fix (+ router words) exist. PreToolUse denies the 4th identical failing call (3-try cap). SessionStart shows PERF (on-target %, weakest routes) and PROMOTE NOW; per-turn metrics live in `archive/metrics.jsonl` and roll up monthly. Sessions in ANY folder learn into this vault too (user-level hooks from `scripts/install-global.mjs`; `--remove` undoes it).

## 6. Speed levers
- Simple: effort low, no sub-agents, no plan, answer from routed notes.
- Medium/complex: set fast mode and model at session start only. Switching mid-session breaks the prompt cache.
- No sub-agents for simple/medium. Agent teams cost ~7x tokens: huge tier only.
- Sub-agents: give file lists, a contract, the owner rules and the routed playbook (they don't load this file's context); omit `model` (inherit); replies <= 2k tokens; <= 40 tool calls, one review round, a stop line. 10 calls without a write: stop reading, write.
- `/clear` between unrelated tasks. Long task state goes in `state/<task>.md`, not in context ([state/README.md](state/README.md)).
- 3-try cap per failing approach, then change approach or queue/log it.
- Owner names a tool/artifact ("umbrio sandbox", "vfx generator"): `node scripts/vault.mjs tool find <words>` → Artifact list scope `all` (match title words, typos ok) → only then ask for the link ONCE. Owner teaches/shows a tool → `tool add` the same turn ([profiles/tools.md](profiles/tools.md)). Never give up after one empty search.
- Talk to the vault only through its skills (never guess paths): `/vault` find|route|status|words, `/learn` lessons + errors rows, `/queue` PC steps. All run `scripts/vault.mjs`.
- Reuse skills in `.claude/skills/` before writing from scratch: pc, mobile, website, browser-game, 3d-editor, roblox, vfx, sfx, crew (main model = brain, 3 Sonnet workers = hands, any task), swarm, vault-upkeep. Engineering skills (review, debug, TDD, spec, plan, perf, security, git) load on match; reuse tools in `tools/` (see [index.md](index.md)).

## 7. Definition of done
1. Open the checklist the router names ([checklists/](checklists/simple.md): simple, web, game, roblox, 3d, vfx, audio, images, math, vault).
2. Run its ONE verification (an outside check: script, measurement or screenshot, never self-judgment). Pass → stop. Fail → fix, re-run (3-try cap).
3. Complex: run the `qa-gate` agent ([.claude/agents/qa-gate.md](.claude/agents/qa-gate.md)) before merge.
4. Log to log.md; lessons/router updates per section 5. Then stop: no extra polish, no unrequested features.

## 8. Pointers
- [index.md](index.md): root map of domains and core files.
- [profiles/pc.md](profiles/pc.md), [profiles/mobile.md](profiles/mobile.md): capabilities, preflight, fallback table. [profiles/owner.md](profiles/owner.md): owner quality floor.
- `.claude/commands/`: `/plan` (state file), `/review` (qa-gate), `/test` (prove-it), `/learn` (lesson + router).
- `checklists/<type>.md`: done criteria per task type.
- [lessons.md](lessons.md): ACE rules. [queue/pc.md](queue/pc.md): PC-only steps from phone sessions.
- [router.json](router.json): trigger words → notes, checklist, skill, tiers.
- `.claude/skills/<name>/SKILL.md`, `.claude/agents/{qa-gate,explorer}.md`, `hooks/*.mjs`.
- [archive/README.md](archive/README.md): monthly log rollups and superseded bulk.
- `CLAUDE.local.md` (gitignored, PC only): local paths; template [CLAUDE.local.md.example](CLAUDE.local.md.example).
