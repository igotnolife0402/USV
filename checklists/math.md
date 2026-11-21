---
summary: Done-check for any math task: calculations, formulas, game balance, physics, vectors/CFrame, conversions.
updated: 2026-11-21
status: current
triggers: [math, calculate, formula, equation, percent, probability]
---
# Done: math
- [ ] Every non-trivial number was computed by running code (node -e / python), not mentally.
- [ ] Units stated and consistent (studs, px, seconds, %); conversions shown once.
- [ ] Checked a second way: inverse operation, edge case (0, 1, max) or a rough estimate.
- [ ] Rounding stated; money/odds keep enough precision until the final step.
- [ ] Game formulas: show the curve at 3 sample points (start, middle, end).
## Verify (one)
- Re-run the calculation from scratch with the second method; both agree.
## Log
- Wrong result → row in [domains/math/errors.md](domains/math/errors.md) + lesson (the Stop hook asks automatically).
