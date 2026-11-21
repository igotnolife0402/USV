---
paths: ["**/game/**","domains/games/**"]
---
# Games rules
- Make the core loop playable first (move, goal, fail, restart); polish only after.
- Update logic is frame-rate independent: fixed timestep or dt, dt clamped to 0.1 s.
- Canvas scales by devicePixelRatio; game is playable with keyboard and touch.
- Create/resume AudioContext only inside a user gesture; provide mute.
- Pool bullets/particles; never let entity arrays grow unbounded.
- One rAF loop only; restart resets state, never starts a second loop.
- Artifacts: no external assets; draw shapes and synthesize SFX; pin CDN versions.
- PC: verify by automation (console clean, input changes state, screenshot) before done.
- Done = checklists/game.md; new failures go into domains/games/errors.md.
