---
summary: Roblox bot AI rules (pathfinding, variety, platforms, dodging, human feel) and the bot-watch targets every game with bots must meet.
updated: 2026-11-22
status: current
triggers: [bot, bots, bot ai, npc, npcs, pathfinding, dodge, dodging, robotic, stuck bots, ai players]
---
# Bots (any Roblox game with AI players)
Reference build: Minigame Mayhem `src/server/{Bots,BotNav,BotSense}.luau`. The owner flagged bots three times on 2026-11-22: "stuck all the time / don't wait on moving platforms", "they all use same path", and "very robot, they don't dodge obstacles".

## Rules
- Path: PathfindingService with per-bot AgentRadius (1.6-2.6) and per-bot random material Costs; recompute every 2 s, when the goal moves more than 6 studs, or on Blocked. Drop any path that has an unsafe waypoint (void or hazard below it).
- Variety: each bot has a lateral lane offset of up to ±3.5 studs, re-rolled every 6-10 s, applied only where the ground under the offset point is level.
- Corner cutting: skip to a later waypoint when the straight line is clear. Checks: same level (±1.2), no wall at knee or at waist ±1.2 (body width), standable ground at 35% and 70% of the line. Following every 4-stud waypoint reads as robotic zigzag.
- Moving platforms: read motion from a shared per-part sample cache (anchored movers are PivotTo-driven, so physics velocity reads 0). Never reset the sample per call: the second bot in the same tick then read 0 and did not wait. Wait at the edge until the platform is ready, ride it, and step off toward the next waypoint.
- Dodge before path-following: list moving parts within 26 studs (a hammer head moves ~60 studs/s), either solid or named like a hazard (Boulder, Bomb, Blast). Exclude the ground, rides and pickups. Predict 1.2 s ahead using the velocity of the point that would hit (v + w × r) and the jump arc (JumpPower 50 → apex 6.4 at 0.51 s). Pick the safest of: hop forward, 8 compass steps, wait, or hop in place, scored by clearance plus progress toward the goal, with standable ground at the landing spot.
- Dodge details that each cost a test round on 2026-11-22:
  - Keep the nearest threat parts by closest-point distance, not by part centre. A 30-stud spinner bar centred on its hub was cut from the list.
  - Sample time finely enough that a part moves at most 1.2 studs per step. A bar tip at 37 studs/s slips between 0.15 s samples.
  - Split the look-ahead: the first 0.6 s must be clear, and 0.6-1.2 s is only a preference. A 1.2 s rule left no legal move, so bots walked in blind.
  - Redo the miss roll every 1.2 s. Near a spinner the threat never clears, so one bad roll kept a bot blind all round.
  - Fixed-hub rotators (pivot estimate stable within 2.5 studs) rotate about the hub; rolling hazards slide.
  - A dash (player speed 48 for 0.18 s, 0.9 s cooldown, one reused LinearVelocity) is a dodge option.
- Human feel:
  - reaction delay per bot (0.1-0.45 s by skill);
  - a miss chance per threat (4-13%);
  - a pace change of ±1 stud/s every 2-5 s, only while the speed is the bot's own (boosts untouched);
  - a slight weave of 0.5-1.2 studs on long legs;
  - stepping around a person right ahead;
  - at the goal, shuffling within 1.6 studs every 1.2-3.5 s instead of freezing.
- Game bot hooks give goals; they never do blind timing (SpinSweep jumped when the bar was 8 studs away, about 0.5 s too early, and landed in it). Leave timing to the generic dodge.
- Stuck ladder: jump → sidestep → recompute → direct → hop to the next safe waypoint, only when the bot is more than 8 studs from the goal (a crowd at the goal is not stuck).
- Server-owned: SetNetworkOwner(nil) on spawn and again after every anchor/unfreeze.

## Proof: tools/roblox/bot-watch.luau
- Studio play, Server execute. It forces each listed game (Studio-only `MMForce` attribute read by the vote) and writes JSON per round to workspace `BotWatch`. Needs character counters `Knocks`, `Outs` and `Hops` bumped by the game.
- Per round it reports:
  - knocks, outs and teleport hops;
  - `stall2s`: windows where the bot tried to move but did not;
  - `idle2s`: windows where it stood still;
  - `sharpPerMin`: snaps over 60° per 0.1 s;
  - `jumpsPerMin`, `congaPct`, `nearPct`, falls over 1.5 s, and errors.
- Baseline 2026-11-22, before dodging (per bot-minute):

| Game | Knocks | Sharp turns | Other |
|---|---|---|---|
| ObstacleRush | 13.9 | 36 | |
| SpinSweep | 12.2 | 7 | idle 21, falls 68 |
| BoulderPeak | 9.2 | 27 | |
| BombRain | 5.6 | 31 | 6 outs in 45 s |

After v5n (2026-11-22), the same 5 games, per bot-minute:

| Game | Knocks (before → after) | Other |
|---|---|---|
| ObstacleRush | 13.9 → 10.1 | sharp 36 → 38 |
| SpinSweep | 12.2 → 8.1 | idle 21 → 2, falls 68 → 2 |
| BoulderPeak | 9.2 → 9.0 | 8 dodges in 60 s: boulders seen only ~0.5 s out |
| BombRain | 5.6 → 5.9 | 0 dodges: the bomb danger is the 8-stud blast, not the falling body |
| HotPotato | | idle 29 → 7, sharp 11 → 45 |

- Not solved yet: fast head-on threats (28 studs/s boulders plus 16 studs/s bots) need a look-out radius of about 40-50 studs; blast zones need a threat type of their own; sharp turns come mostly from knocks and from goals that are re-picked often.
- Process: when a metric does not move after a fix, trace ONE bot frame by frame (r to hazard, angle, speed, dodge/knock flags) before the next build. Three blind builds (v5h-v5k) went by before a trace showed a blind bot and an uncrossable spinner.
