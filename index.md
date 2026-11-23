---
summary: Root map of the vault; one line per domain and core file. Start here, then read only the routed domain.
updated: 2026-11-21
status: current
triggers: [index, map, where, vault]
---
# Index

## Domains (read only the one the task routes to)
- [roblox](domains/roblox/index.md): Roblox games, Luau, Studio MCP, Rojo layout, obby/tycoon systems, publishing.
- [web](domains/web/index.md): websites, landing pages, portfolios, HTML/CSS/JS, React, deploy.
- [games](domains/games/index.md): browser games, canvas, Phaser, three.js games, game loops, input, juice.
- [3d](domains/3d/index.md): Blender + Blender MCP, meshes, glTF, three.js scenes, browser mini-Blender editor.
- [vfx](domains/vfx/index.md): particles, beams, trails, shaders, auras, slashes (Roblox and web).
- [audio](domains/audio/index.md): SFX, music, jsfxr, WebAudio, procedural sound, agent-audio.
- [animation](domains/animation/index.md): key poses, clips, motion specs for Studio, Roblox and video.
- Audio tool: [tools/audio/sfx.mjs](tools/audio/sfx.mjs): procedural game SFX (coin, hit, win...) → 16-bit WAV, no deps; `node tools/audio/sfx.mjs OUT`.
- [images](domains/images/index.md): the owner's 20 style prompts, add-ons, Roblox thumbnails rendered in Studio.
- [math](domains/math/index.md): calculations, formulas, game balance curves, probability, vectors/CFrame (compute with code, check twice).
- Tools (runnable, each with a README): [tools/3d](tools/3d/README.md), [tools/roblox](tools/roblox/README.md), [tools/vfx](tools/vfx/README.md), [tools/art](tools/art/README.md).

## Core
- [CLAUDE.md](CLAUDE.md): tiers, mode rules, retrieval/write rules, self-improvement loop, done.
- [router.json](router.json): trigger words → notes, checklist, skill; tier words.
- [profiles/pc.md](profiles/pc.md): PC capabilities, MCP preflight, queue-first rule.
- [profiles/mobile.md](profiles/mobile.md): cloud session capabilities, PC → mobile fallback table, queue format.
- [profiles/owner.md](profiles/owner.md): owner preferences and quality floor (both modes); read before any build.
- [profiles/must.md](profiles/must.md): the 10 owner hard rules the prompt router injects into every build prompt.
- [profiles/vault-rules.md](profiles/vault-rules.md): every applied lesson rule for vault work, hooks, routing and sub-agents.
- Checklists (definition of done): [simple](checklists/simple.md), [web](checklists/web.md), [game](checklists/game.md), [roblox](checklists/roblox.md), [3d](checklists/3d.md), [vfx](checklists/vfx.md), [audio](checklists/audio.md), [vault](checklists/vault.md).
- [lessons.md](lessons.md): ACE rule bullets; append-only, bump h/x or tag promoted/dup in place.
- [log.md](log.md): append-only session log; rolled monthly into archive/.
- [queue/pc.md](queue/pc.md): PC-only steps left by phone sessions.
- [state/README.md](state/README.md): per-task state notes for long tasks.
- [archive/README.md](archive/README.md): log rollups and retired bulk; read only for history.
- [CLAUDE.local.md.example](CLAUDE.local.md.example): template for gitignored PC paths.
- [.orchestration/ARCHITECTURE.md](.orchestration/ARCHITECTURE.md): frozen layout/schema contract.

## Skills (.claude/skills/<name>/SKILL.md)
- [vault](.claude/skills/vault/SKILL.md), [learn](.claude/skills/learn/SKILL.md), [queue](.claude/skills/queue/SKILL.md): talk to the vault (find/route/status, lessons, PC queue) via `scripts/vault.mjs`.
- [pc](.claude/skills/pc/SKILL.md): PC mode setup and MCP preflight.
- [mobile](.claude/skills/mobile/SKILL.md): mobile mode, fallbacks, queueing.
- [website](.claude/skills/website/SKILL.md): website recipe.
- [browser-game](.claude/skills/browser-game/SKILL.md): browser game recipe.
- [3d-editor](.claude/skills/3d-editor/SKILL.md): browser 3D editor / mini-Blender recipe.
- [roblox](.claude/skills/roblox/SKILL.md): Roblox build recipe.
- [vfx](.claude/skills/vfx/SKILL.md): VFX recipe.
- Engineering skills (auto-load on match): code-review-and-quality, debugging-and-error-recovery, test-driven-development, spec-driven-development, planning-and-task-breakdown, incremental-implementation, frontend-ui-engineering, performance-optimization, security-and-hardening, git-workflow-and-versioning, context-engineering, and more in `.claude/skills/`.
- [sfx](.claude/skills/sfx/SKILL.md): sound effects recipe.
- [crew](.claude/skills/crew/SKILL.md): any task, main model as manager + 3 crew-worker agents (Sonnet 5.5, low effort, copy-only: brain specs, worker one pass, brain OKs or re-instructs).
- [improve](.claude/skills/improve/SKILL.md): owner-only `/improve <seconds> <prompt>` (any number): Opus climbs a value ladder for that long, writes a brief, Sonnet 5.5 low expands it, delivered at the time +-5 s. Account-level copy for any repo or chat: [tools/skills/improve-standalone](tools/skills/improve-standalone/README.md).
- [swarm](.claude/skills/swarm/SKILL.md): huge-tier multi-agent waves.
- [vault-upkeep](.claude/skills/vault-upkeep/SKILL.md): lint, rollup, lesson promotion.
- Commands (.claude/commands): [/plan](.claude/commands/plan.md), [/review](.claude/commands/review.md), [/test](.claude/commands/test.md), [/learn](.claude/commands/learn.md).
- Agents: [qa-gate](.claude/agents/qa-gate.md) (adversarial verifier), [explorer](.claude/agents/explorer.md) (vault searcher, no model field).
