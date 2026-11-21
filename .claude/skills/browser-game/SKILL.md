---
name: browser-game
description: 'Use for any browser game, HTML5/canvas game, three.js game, arcade/platformer/shooter prototype or game loop (medium tier, < 5 min for a playable prototype). Fixed-timestep loop, input map, states, juice (shake, hit-stop, particles, procedural SFX), perf rules.'
---
# browser-game — canvas / three.js game recipe

## Pick the renderer
- 2D (platformer, shooter, puzzle) → Canvas 2D, zero deps. Default.
- 3D or owner says three.js → three.js via import map from a CDN (`https://unpkg.com/three@0.170.0/build/three.module.js`) or `npm i three` if a project exists.

## Layout
```
<game>/
  index.html   # <canvas id="c">, import map if three.js, <script type="module" src="main.js">
  main.js      # boot, loop, states
  input.js     # action map
  juice.js     # shake, hitstop, particles
  sfx.js       # procedural SFX hook (see sfx skill)
```
Under ~400 lines total → one `main.js` is fine. Don't split for its own sake.

## Loop (fixed timestep, render interpolated)
```js
const STEP = 1/60; let acc = 0, last = performance.now(), hitstop = 0;
function frame(now){
  let dt = Math.min((now - last)/1000, 0.25); last = now;      // clamp: tab-switch spiral guard
  if (hitstop > 0) { hitstop -= dt; dt = 0; }
  acc += dt;
  while (acc >= STEP) { update(STEP); acc -= STEP; }
  render(acc / STEP);                                          // alpha for interpolation
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```
Game logic only in `update(STEP)`. Never multiply logic by raw frame dt.

## Input map (actions, not keys)
```js
const MAP = { left:['ArrowLeft','KeyA'], right:['ArrowRight','KeyD'], jump:['Space','KeyW','ArrowUp'], fire:['KeyJ','KeyZ'], pause:['Escape','KeyP'] };
const down = new Set(), pressed = new Set();
addEventListener('keydown', e => { if (!e.repeat) pressed.add(e.code); down.add(e.code); if (e.code === 'Space') e.preventDefault(); });
addEventListener('keyup',   e => down.delete(e.code));
const held = a => MAP[a].some(k => down.has(k));
const hit  = a => MAP[a].some(k => pressed.has(k));   // pressed.clear() at end of each update
```
Phones: on-screen buttons whose pointerdown/pointerup add/delete a virtual code in `down`. Gamepad: poll `navigator.getGamepads()` in update.

## States
`title → play ⇄ pause; play → over → title`. Each state has `update(dt)` + `render()`. `blur` / `visibilitychange` → pause.

## Juice (always add; it is the difference between toy and game)
- Screen shake: `trauma = Math.min(1, trauma + amt)`; offset = `maxPx * trauma**2 * (Math.random()*2-1)`; decay `trauma -= 1.5*dt`. Apply in render only (`ctx.translate` / camera offset).
- Hit-stop: `hitstop = 0.05..0.12` s on hits/kills (freezes update, not render).
- Particles: pooled `{x,y,vx,vy,life,max,size,color}`; burst 8-20 on hit; gravity + drag; alpha = `life/max`; `globalCompositeOperation='lighter'` for sparks.
- Damage flash: draw target white 1-2 frames. Squash/stretch on jump/land (1.2/0.8, ease back 0.1 s).
- Smoothing for camera/UI: `x = lerp(x, target, 1 - Math.exp(-k*dt))`.
- SFX hook: `sfx.play('hit'|'jump'|'coin'|'explosion'|'ui')` → procedural WebAudio (`.claude/skills/sfx/SKILL.md`). Create/resume AudioContext on first user gesture.

## Perf rules
- One canvas sized to `devicePixelRatio` (cap 2); `imageSmoothingEnabled=false` for pixel art.
- Zero allocation in the hot loop: pool bullets/particles, reuse vectors.
- Spatial grid for collisions above ~200 entities; AABB before precise tests.
- three.js: share geometries/materials, `InstancedMesh` for many copies, `setPixelRatio(Math.min(devicePixelRatio,2))`, `dispose()` on removal, shadows off unless needed.
- Target 60 fps on a mid phone; smoothed `1/dt` fps counter during dev.

## Quality rules
- Playable in 3 s: title shows controls; first input starts.
- HUD (score/health), pause, game over + restart, difficulty ramps over time.
- Resize keeps aspect. Zero console errors.

## Verification (one check)
PC: module scripts fail on file:// → `npx --yes serve <game> -l 5173`, open in Chrome MCP, play 20 s, screenshot mid-play; confirm input, collision, score, game over, restart, console clean.

## Done-check (`checklists/game.md`)
- [ ] Fixed-timestep loop, input map, 4 states.
- [ ] Shake + hit-stop + particles + SFX on the core action.
- [ ] 60 fps, no console errors, restart works.
- [ ] Playtested once (screenshot).

## Time target
< 5 min: loop + player + one enemy/obstacle + score + juice. More content = a new pass.

## Mobile
Write the files in the repo and render a single-file version (inline JS; Canvas 2D or three.js from CDN) as an HTML Artifact to play in the viewer; include touch buttons. Queue: `- [ ] YYYY-MM-DD playtest <game>/index.html in Chrome 20 s, check console + fps — built on mobile`.
