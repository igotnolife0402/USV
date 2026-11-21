---
summary: Done criteria for browser games: playable loop start→play→lose/win→restart, input, delta-time loop, no console errors.
updated: 2026-11-21
status: current
triggers: [browser game, canvas, phaser, platformer, shooter]
---
# Checklist: game (browser)
- [ ] Used the [browser-game skill](.claude/skills/browser-game/SKILL.md); followed the [games playbook](domains/games/playbook.md).
- [ ] Owner floor met ([profiles/owner.md](profiles/owner.md)): full detail, no placeholders, scope exactly as asked, original (no clones).
- [ ] 10-second test: goal clear without reading; the 3 most common actions each get animation + sound/visual feedback.
- [ ] Phone: touch targets >= 38 px, nothing overlaps or clips at 375 px wide.
- [ ] Full loop: start screen → play → lose/win → restart without reload.
- [ ] Controls: keyboard + pointer/touch where sensible; shown on screen.
- [ ] requestAnimationFrame loop with delta time; speed independent of frame rate.
- [ ] Score/feedback visible; basic juice (sound or screen feedback) if in scope.
- [ ] Assets procedural or local; Artifacts: no external assets, pinned CDN (exact Phaser/three.js version).
- [ ] No console errors; spawned objects get removed (no unbounded arrays).
## Verify (one)
- pc: run in browser, play one full loop to game over and restart, read console.
- mobile: Artifact preview playthrough, or `node --check` + logic smoke test in node.
## Log
- log.md entry (game, path, controls). Bugs → [games errors](domains/games/errors.md) + lesson.
