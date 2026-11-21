---
summary: Fastest proven path to a fun, polished browser game; fixed-step loop, juice, PC browser test vs mobile Artifact
updated: 2026-11-21
status: current
triggers: [browser game, canvas game, phaser, game feel, juice]
---
# Games playbook

## Stack choice
1. Canvas 2D, vanilla JS, one `index.html`: arcade, puzzle, platformer, top-down. Default.
2. three.js (pinned CDN or npm): 3D or heavy shaders.
3. Phaser 3: only when tilemaps/physics/scenes are a big part of the ask.
No engine for something a 300-line canvas file can do.

## PC (/pc)
1. Write `game/index.html` from the loop snippet in [snippets](domains/games/snippets/README.md): fixed timestep update, render with interpolation-free draw, input map.
2. Core loop first (player moves + one goal + one fail state) in the first 2 minutes. Playable beats pretty.
3. Serve (`npx serve game`), open with playwright-mcp or chrome-devtools-mcp, read console, screenshot.
4. Drive input via automation (`press_key` ArrowRight held, click canvas) and screenshot again to confirm movement/score change.
5. Add juice in this order: hit-stop/screen shake, particles ([vfx](domains/vfx/index.md)), SFX ([audio](domains/audio/index.md)), easing on UI, death/restart flash.
6. Add title → play → game over → restart states; high score in `localStorage`.
7. Re-test once; stop at checklist.

## Mobile fallback (/mobile)
- No browser automation or local files. Build the game as a single-file Artifact (the user plays it on the phone), then save the same file to `game/index.html` in the repo.
- Touch controls are mandatory here: on-screen buttons or swipe/tap; `touch-action:none` on canvas.
- Artifacts: pin CDN versions; no external sprites/sounds: draw shapes on canvas, generate SFX with WebAudio.
- Append PC steps to [queue/pc.md](queue/pc.md), e.g.:
  `- [ ] 2026-11-21 playwright run: 60 s play, console clean, fps check — games game/index.html`

## Quality bar
- Runs 60 fps on a mid phone; update is frame-rate independent (fixed step, dt clamp ≤ 0.1 s).
- Controls: keyboard (WASD + arrows) and touch; pause on `visibilitychange`; restart in one key/tap.
- Canvas sized to devicePixelRatio, letterboxed/responsive, crisp (`imageSmoothingEnabled=false` for pixel art).
- Clear goal within 5 s, readable score/UI, difficulty ramps, game over screen with restart.
- Audio starts only after first user gesture (autoplay policy); mute toggle.
- 0 console errors, no growing arrays (pool bullets/particles).

## Speed tricks
- Entities as plain objects in arrays; AABB/circle collision; no ECS for small games.
- Tunables in one `CONFIG` object at top; tweak feel there.
- Placeholder art = colored shapes with outlines and a glow; looks intentional.
- jsfxr-style param presets for SFX ([audio snippets](domains/audio/snippets/README.md)).
- Seeded RNG for reproducible bugs.

## Done
Run [checklists/game.md](checklists/game.md). Add new failures to [errors](domains/games/errors.md).
