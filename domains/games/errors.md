---
summary: Known browser-game failures (loop, input, canvas, audio, physics) with cause and fix
updated: 2026-11-21
status: current
triggers: [game bug, canvas blurry, game lag, tunneling, input stuck]
---
# Games errors

| Symptom | Cause | Fix | Seen |
|---|---|---|---|
| Game runs faster on 120/144 Hz screens | Movement per frame, not per time | Fixed timestep accumulator or multiply by dt | 2026-11-21 |
| Huge jump/teleport after switching tabs | dt spikes when rAF resumes | Clamp dt to 0.1 s; pause on `visibilitychange` | 2026-11-21 |
| Canvas blurry on phone/retina | Backing store not scaled by devicePixelRatio | `canvas.width = cssW*dpr; ctx.setTransform(dpr,0,0,dpr,0,0)` | 2026-11-21 |
| Pixel art smeared | Image smoothing on | `ctx.imageSmoothingEnabled = false`; CSS `image-rendering: pixelated` | 2026-11-21 |
| Fast bullets pass through walls | Tunneling: step larger than collider | Substep movement or swept/ray test | 2026-11-21 |
| No sound until refresh / `The AudioContext was not allowed to start` | Autoplay policy | Create/resume AudioContext inside first pointerdown/keydown | 2026-11-21 |
| Keys stay "held" after alt-tab | keyup lost on blur | Clear input state on `blur` | 2026-11-21 |
| Page scrolls/zooms when playing on phone | Default touch gestures | `touch-action:none` on canvas, `preventDefault` in touch handlers with `{passive:false}` | 2026-11-21 |
| Arrow keys scroll page | Default key action | `preventDefault()` for game keys | 2026-11-21 |
| FPS drops over time | Arrays grow; listeners re-added on restart | Pool/filter dead entities; add listeners once | 2026-11-21 |
| Restart duplicates loop (double speed) | New rAF loop started without cancelling old | Keep one loop; reset state only, or `cancelAnimationFrame(id)` | 2026-11-21 |
| Sprite sheet image draws nothing | drawImage before image load | Await `img.decode()` before starting loop | 2026-11-21 |
| Collision jitter on platforms | Resolving both axes at once | Move X, resolve X; then move Y, resolve Y | 2026-11-21 |
| Artifact game loads but assets missing | External URLs blocked in Artifacts | Procedural shapes + WebAudio SFX; data URIs | 2026-11-21 |
| localStorage throws in Artifact/iframe | Storage blocked in sandbox | Wrap in try/catch; fall back to in-memory high score | 2026-11-21 |
