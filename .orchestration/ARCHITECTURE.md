# Super Vault: architecture contract (frozen in Wave 0)

AI-only knowledge vault run by Claude Code from a Windows PC and from the phone (Claude Code cloud sessions on this private GitHub repo).
Goals: simple task < 1 min, medium (a website) < 5 min, complex (a mini-Blender) < 30 min; never fills context; gets smarter every session; never misses a note or check.
No outside AI assistants built into the vault (no ChatGPT, Copilot, embedding indexes). On /pc every connected MCP, tool and plugin is allowed, Claude-native routes first. On /mobile only Claude's own tools, Artifacts, GitHub and remote connectors that exist in the session.

## Layout and owners
| Path | Holds | Owner |
|---|---|---|
| `CLAUDE.md` | Router: time budgets, mode rules, routing, pointers. 80-120 lines, hard cap 200 | W-CORE |
| `index.md` | Root index: one line per domain + core files. Cap 150 lines | W-CORE |
| `lessons.md` | ACE bullets `- [L-001] (h:0 x:0) YYYY-MM-DD rule — trigger: words` | W-CORE |
| `log.md` | Append-only: `## [YYYY-MM-DD] op / title` + 1-3 lines. Rolled monthly to `archive/log-YYYY-MM.md` | W-CORE |
| `router.json` | Trigger words → notes + checklist (schema below) | W-CORE |
| `profiles/pc.md`, `profiles/mobile.md` | Mode capability lists + fallback table | W-CORE |
| `checklists/<type>.md` | Definition of done per task type: simple, web, game, roblox, 3d, vfx, audio, vault | W-CORE |
| `queue/pc.md` | PC-only steps left by phone sessions (`- [ ] YYYY-MM-DD step — context`) | W-CORE |
| `state/README.md`, `archive/README.md` | How to use those folders | W-CORE |
| `CLAUDE.local.md.example` | Template for gitignored PC-only paths/MCP notes | W-CORE |
| `domains/<d>/` for d in roblox, web, games, 3d, vfx, audio | `index.md`, `playbook.md`, `errors.md`, `pipeline.md`, `snippets/README.md` | W-DOMAINS |
| `.claude/rules/<d>.md` | Path-scoped rules (`paths:` frontmatter) | W-DOMAINS |
| `.claude/skills/<name>/SKILL.md` | pc, mobile, website, browser-game, 3d-editor, roblox, vfx, sfx, swarm, vault-upkeep | W-SKILLS |
| `.claude/agents/*.md` | qa-gate (adversarial verifier), explorer (vault searcher; no model field) | W-SKILLS |
| `.claude/settings.json`, `.claude/settings.local.json.example` | Hook wiring + permissions | W-HOOKS |
| `hooks/*.mjs` | lib, session-start, prompt-router, pre-tool, post-tool-lint, stop-gate, learn (turn analysis, learn block, 3-try cap, metrics) | W-HOOKS |
| `hooks/global.mjs`, `scripts/install-global.mjs` | User-level hooks: sessions in any folder route through and learn into the vault (no-op inside the vault) | hooks |
| `archive/metrics.jsonl` | One line per owner turn: tier, secs, on-target, errors, retries, routes, signals. Rolled monthly into `archive/metrics-YYYY-MM.md` | hooks |
| `hooks/modes.json` | PC-only tool patterns + fallback text | W-HOOKS |
| `scripts/vault-lint.mjs`, `scripts/rollup.mjs` | Lint CLI/library, monthly log rollup | W-HOOKS |
| `tests/*.test.mjs` | `node --test tests/` | W-HOOKS |
| `.github/workflows/vault-lint.yml` | CI: lint + tests on every push | W-HOOKS |
| `.gitignore`, `.gitattributes`, `.orchestration/*` | Repo plumbing, this contract | Chief |

Workers write ONLY their own paths. Nobody runs git; the Chief commits.

## Note frontmatter (every note under domains/, profiles/, checklists/, plus index.md, lessons.md, queue/pc.md)
```
---
summary: one line, max 140 chars (what the note answers)
updated: YYYY-MM-DD
status: current            # or superseded (then add superseded_by: path)
triggers: [word, word]     # optional; words that should route here
---
```
Not notes (no frontmatter rule): CLAUDE.md, CLAUDE.local.md*, log.md, any README.md, archive/**, .orchestration/**, .github/**, .claude/** (skills/agents/rules use their own frontmatter).

## Size budgets (lint enforces)
- CLAUDE.md <= 200 lines (aim 80-120). index.md <= 150 lines. Notes <= 200 lines (warn > 150). SKILL.md <= 500 lines, description <= 300 chars.
- SessionStart injection <= 8000 characters total. Sub-agent replies <= 2k tokens.

## Links
Use relative markdown links `[text](domains/web/playbook.md)` (paths from vault root) or `[[path/without-ext]]`. Lint fails on links that don't resolve. External http(s) links are not checked.

## router.json schema
```json
{ "routes": [ { "id": "web", "words": ["website","landing","html","css"], "notes": ["domains/web/index.md"], "checklist": "checklists/web.md", "skill": "website" } ],
  "tiers": { "simple": ["outline","list","explain","rename","quick"], "complex": ["editor","engine","full app","multiplayer","pipeline"] } }
```
Words match case-insensitively on word boundaries. Multiple routes may match.

## Modes
- Auto: `CLAUDE_CODE_REMOTE=true` → `mobile` (phone cloud session). Else `pc`. `CLAUDE_CODE_BRIDGE_SESSION_ID` set → `pc` with `remote: true` (phone driving the PC).
- Override: a prompt starting `/pc` or `/mobile` writes `.claude/.mode` = `{"mode":"pc|mobile","session_id":"..."}` (gitignored). An override applies only to the same session_id.
- Mobile never runs PC-only tools (hooks/modes.json). It uses the fallback and appends PC-only steps to `queue/pc.md`. PC SessionStart shows the queue first.

## Hook I/O (Claude Code hook protocol; all hooks read JSON on stdin)
- SessionStart → stdout `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}`
- UserPromptSubmit → `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}`
- PreToolUse deny → `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"..."}}`
- PostToolUse / Stop block → `{"decision":"block","reason":"..."}`; Stop must exit 0 silently when `stop_hook_active` is true.
- Hooks must never crash the session: wrap in try/catch, exit 0 on internal error. Each hook < 1 s except git calls.
- Commands use `node "$CLAUDE_PROJECT_DIR/hooks/<file>.mjs"`. Node 20+ stdlib only, no npm dependencies.

## Task tiers (CLAUDE.md states these)
| Tier | Target | Do | Skip |
|---|---|---|---|
| Simple | < 1 min | Read only routed notes; answer or one edit; quick check | Plans, research, sub-agents |
| Medium | < 5 min | One recipe skill + scaffold; build in one thread; one check (/verify or screenshot); checklist; stop | Plan mode, agent teams, polish past the checklist |
| Complex | < 30 min | Short plan; contracts first; 2-4 sub-agents in own worktrees with file lists; 3-try cap; qa-gate before merge; state note | Research rabbit holes, one giant context |
| Huge | 30-min waves | `swarm` skill: orchestrator plans only, domain leads, workers, qa-gate, retro into lessons.md | Simple/medium work |
