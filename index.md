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

## Core
- [CLAUDE.md](CLAUDE.md): tiers, mode rules, retrieval/write rules, self-improvement loop, done.
- [router.json](router.json): trigger words → notes, checklist, skill; tier words.
- [profiles/pc.md](profiles/pc.md): PC capabilities, MCP preflight, queue-first rule.
- [profiles/mobile.md](profiles/mobile.md): cloud session capabilities, PC → mobile fallback table, queue format.
- Checklists (definition of done): [simple](checklists/simple.md), [web](checklists/web.md), [game](checklists/game.md), [roblox](checklists/roblox.md), [3d](checklists/3d.md), [vfx](checklists/vfx.md), [audio](checklists/audio.md), [vault](checklists/vault.md).
- [lessons.md](lessons.md): ACE rule bullets with h/x counters; append or bump only.
- [log.md](log.md): append-only session log; rolled monthly into archive/.
- [queue/pc.md](queue/pc.md): PC-only steps left by phone sessions.
- [state/README.md](state/README.md): per-task state notes for long tasks.
- [archive/README.md](archive/README.md): log rollups and retired bulk; read only for history.
- [CLAUDE.local.md.example](CLAUDE.local.md.example): template for gitignored PC paths.
- [.orchestration/ARCHITECTURE.md](.orchestration/ARCHITECTURE.md): frozen layout/schema contract.

## Skills (.claude/skills/<name>/SKILL.md)
- [pc](.claude/skills/pc/SKILL.md): PC mode setup and MCP preflight.
- [mobile](.claude/skills/mobile/SKILL.md): mobile mode, fallbacks, queueing.
- [website](.claude/skills/website/SKILL.md): website recipe.
- [browser-game](.claude/skills/browser-game/SKILL.md): browser game recipe.
- [3d-editor](.claude/skills/3d-editor/SKILL.md): browser 3D editor / mini-Blender recipe.
- [roblox](.claude/skills/roblox/SKILL.md): Roblox build recipe.
- [vfx](.claude/skills/vfx/SKILL.md): VFX recipe.
- [sfx](.claude/skills/sfx/SKILL.md): sound effects recipe.
- [swarm](.claude/skills/swarm/SKILL.md): huge-tier multi-agent waves.
- [vault-upkeep](.claude/skills/vault-upkeep/SKILL.md): lint, rollup, lesson promotion.
- Agents: [qa-gate](.claude/agents/qa-gate.md) (adversarial verifier), [explorer](.claude/agents/explorer.md) (haiku vault searcher).
