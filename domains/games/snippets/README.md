# Games snippets

Belongs here: engine-free building blocks for browser games (loop, input, collision, pooling, screen shake, canvas resize).
Naming: `<what>.<ext>` (e.g. `loop.js`, `input.js`, `aabb.js`). Plain ES modules, no dependencies, Artifact-safe.

## Fixed-step loop + DPR canvas
```js
const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
function resize() { const d = devicePixelRatio || 1;
  cv.width = innerWidth * d; cv.height = innerHeight * d;
  cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  ctx.setTransform(d, 0, 0, d, 0, 0); }
addEventListener('resize', resize); resize();
const STEP = 1 / 60; let acc = 0, last = performance.now(), paused = false;
document.addEventListener('visibilitychange', () => paused = document.hidden);
function frame(t) {
  const dt = Math.min((t - last) / 1000, 0.1); last = t;
  if (!paused) { acc += dt; while (acc >= STEP) { update(STEP); acc -= STEP; } }
  render(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

## Input (keyboard + touch)
```js
const keys = new Set();
addEventListener('keydown', e => { if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault(); keys.add(e.key.toLowerCase()); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
const pointer = { down: false, x: 0, y: 0 };
cv.style.touchAction = 'none';
cv.addEventListener('pointerdown', e => { pointer.down = true; pointer.x = e.clientX; pointer.y = e.clientY; });
cv.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; });
addEventListener('pointerup', () => pointer.down = false);
const axisX = () => (keys.has('arrowright') || keys.has('d')) - (keys.has('arrowleft') || keys.has('a'));
```

## AABB + screen shake
```js
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
let shake = 0; // set shake = 8 on impact
function applyShake(dt) { if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake = Math.max(0, shake - 60 * dt); } }
```
