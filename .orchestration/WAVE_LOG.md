# WAVE LOG

## Wave 0 — 2026-11-21 — contract freeze (Chief)
- Repo created at the vault root, git initialised on `main`, identity `Claude <noreply@anthropic.com>`.
- ARCHITECTURE.md frozen: layout, owners, frontmatter, size budgets, router schema, modes, hook I/O, tiers.
- .gitignore keeps PC-only files (`CLAUDE.local.md`, `.claude/settings.local.json`, `.claude/.mode`) and big binaries out of git.

## Wave 1 — 2026-11-21 — parallel build (4 workers, disjoint file locks, no worktrees needed)
- W-HOOKS: hooks/, scripts/, tests/, .claude/settings.json, CI workflow.
- W-CORE: CLAUDE.md, index, lessons, log, router.json, profiles, checklists, queue, state, archive.
- W-DOMAINS: domains/{roblox,web,games,3d,vfx,audio}, .claude/rules/.
- W-SKILLS: .claude/skills/{pc,mobile,website,browser-game,3d-editor,roblox,vfx,sfx,swarm,vault-upkeep}, .claude/agents/{qa-gate,explorer}.
- Retro notes: sub-agent model aliases `sonnet` and `haiku` both fail with model_not_found on this machine; workers ran on the default model. A worker that read the owner's old vault was blocked by the permission classifier; respawned without it.

## Wave 2 — QA gate (pending)
