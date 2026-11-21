---
summary: Known-good math snippets - easing, frame-rate independent smoothing, odds, growth table.
updated: 2026-11-21
status: current
---
# Math snippets

Naming: `<what>.<ext>` (e.g. `growth-table.mjs`). Inline snippets below are tested patterns.

```js
// Easing and frame-rate independent smoothing
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);
const follow = (cur, target, k, dt) => lerp(cur, target, 1 - Math.exp(-k * dt));
```

```js
// Odds of at least one success in n tries
const atLeastOne = (p, n) => 1 - (1 - p) ** n;
console.log(atLeastOne(0.05, 20).toFixed(3)); // 0.642
```

```js
// Upgrade cost / income table at sample points
const c0 = 10, r = 1.12, income = (n) => 2 * n;
for (const n of [1, 25, 50]) console.log(n, Math.round(c0 * r ** n), income(n), (c0 * r ** n / income(n)).toFixed(1) + 's payback');
```
