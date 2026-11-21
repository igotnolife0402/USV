---
summary: Fastest correct path for math tasks - compute with code, verify twice, game formulas and balance rules.
updated: 2026-11-21
status: current
---
# Math playbook

## PC (/pc) and Mobile fallback (/mobile)
Same on both: Claude's shell (`node -e` or `python -c`) is available in phone cloud sessions too. No PC-only tools.

## Method (simple tier: under 1 minute)
1. Restate the question as one equation with units.
2. Compute with code, never mentally, for anything beyond one-digit arithmetic.
3. Verify a second way: inverse operation, an edge case (0, 1, max), or an order-of-magnitude estimate.
4. Answer with the number, units and rounding stated. Show the formula only if asked or if it is reusable.

## Game formulas (default choices)
- Smooth motion: `lerp(a, b, t)` with easing `t*t*(3-2t)`; frame-rate independent smoothing `1 - exp(-k*dt)`.
- Level curve: `xp(n) = base * n^p` with p 1.5-2.2; check levels 1, 10 and max.
- Tycoon income: exponential costs `cost(n) = c0 * r^n` (r 1.07-1.15) vs linear income; payback time per upgrade should grow slowly, never jump.
- Damage: `dmg = base * (1 + bonus) * crit`; defense as `dmg * 100/(100+armor)` (never negative).
- Drop odds: show per-roll % and the chance of at least one in N rolls `1-(1-p)^N`.
- Roblox: CFrame math in studs; `CFrame.lookAt`, angles in radians (`math.rad`); 1 stud ≈ 0.28 m.

## Quality bar
- Numbers that feed a game are shown as a small table at 3 sample points.
- Probability and money keep full precision until the final rounding.

## Speed
- Simple question = one code run + one check. Do not write a script file unless it is reused.
- Balance work = one script that prints the table; adjust parameters in it, not by hand.

## Done
[checklists/math.md](checklists/math.md).
