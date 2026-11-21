---
summary: Math symptom → cause → fix table (wrong numbers, unit slips, float issues, curve blow-ups).
updated: 2026-11-21
status: current
---
# Math errors

| Symptom | Cause | Fix | Seen |
|---|---|---|---|
| Answer off by a factor of 60/1000/100 | Units mixed (s vs ms, % vs fraction) | Write units next to every number; convert once at the start | 2026-11-21 |
| Mental arithmetic slightly wrong | Computed in the head | Always run `node -e` / `python -c` for the number | 2026-11-21 |
| 0.1 + 0.2 shows 0.30000000000000004 | Binary floating point | Round only for display; compare with a tolerance | 2026-11-21 |
| Rotation goes the wrong way in Roblox | Degrees passed where radians expected | `math.rad()` on every angle input | 2026-11-21 |
| Late-game costs explode to infinity | Exponential base too high or no cap | Check level max in the table; lower r or switch to polynomial | 2026-11-21 |
| Smoothing speed changes with frame rate | `lerp(a,b,k)` per frame | Use `1 - exp(-k*dt)` as the factor | 2026-11-21 |
| "Chance in N tries" overstated | Added probabilities (N*p) | Use `1-(1-p)^N` | 2026-11-21 |
| Negative damage or healing from armor | Subtractive defense | Use multiplicative `100/(100+armor)` | 2026-11-21 |
