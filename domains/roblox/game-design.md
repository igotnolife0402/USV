---
summary: Design and playtest bar for every Roblox game: originality, first minute, feel, social, shop, mobile perf, 15 simulated-player playtests
updated: 2026-11-21
status: current
triggers: [roblox game, game idea, playtest, retention, first minute, thumbnail, monetisation, game pass, simulator, tycoon, obby]
---
# Roblox game design

Applies to every Roblox game. UI rules: [ui](domains/roblox/ui.md). Maps/lobbies: [maps](domains/roblox/maps.md). Source: owner standard 2026-11-18 (creator tips from @momentumcash, 151 transcripts).

## Originality
- Never clone an existing game. Ideas from outside Roblox: a mechanic from a popular game, a board game, a real job's most stressful/funny/satisfying task, a psychology experiment, a dead multiplayer game players miss, 2005-2015 games, #indiedev trends.
- Before building, survey the genre's top games (mechanics, player feedback) and name the gap nobody serves.
- No trademarked names, logos or recognisable maps.

## First minute
- 10-second test: a new player knows the goal in 10 s without reading.
- First small win within minutes. Tutorial = reactive NPC guide, fast, skippable, no text walls.
- Show what comes next (rewards, upgrades, milestones); reveal features gradually; every session leaves unfinished business.

## Feel
- The 3 most common actions get animation timing, sound and visual feedback first; every purchase/upgrade/task completion gets a clear response.
- The core loop is fun with coins, XP and badges removed.
- One consistent sound style; audit loud/annoying/off-style sounds and balance volume, pitch, EQ ([domains/audio/index.md](domains/audio/index.md)).

## Social
- Moments worth inviting friends to, competing in, showing off, laughing at; at least 3 moments a YouTuber would clip.

## Shop and monetisation
- Fast-food-menu clarity: few choices, each item's effect, cost and value readable at a glance. Compare the genre's top games before pricing.

## Look
- No AI giveaways: no generic UI, mixed art styles or off-style models.
- Thumbnails: study the genre's top thumbnails (curiosity gap, contrast, faces), make 5 concepts, rank, produce the top 3.
- Title, description and tags researched against the genre's discovery terms.

## Mobile and performance
- Check several phone sizes: nothing overlaps, disappears or is too small to tap.
- Low-end phone pass during real gameplay: FPS, memory, effects, UI. Optimise the 10 heaviest models without changing their look. Offer low/medium/high graphics presets.

## Playtest simulations (before every release)
Simulate each player, list the problems, fix, repeat until each passes:
1. Impatient 8-year-old (first 3 boring moments).
2. 7-year-old who doesn't get complicated instructions (plays without help).
3. 7-year-old exploring the map / browsing the shop (areas and items they ignore).
4. 8-year-old with sound off (events they miss).
5. Kid half-watching YouTube (moments needing too much attention).
6. Beginner in a server of experts (what intimidates).
7. 14-year-old showing it to an 8-year-old brother (what needs explaining).
8. Kid showing a best friend (what they show off, what makes the friend join).
9. Two best friends, first time (what they talk about next day).
10. Kids arguing which game to play (objections to yours).
11. Daily player for a month (what is still exciting, what repeats).
12. Kid picking among 20 thumbnails (why they scroll past).
13. Kid with a $10 weekly allowance (would they spend here).
14. 16-year-old assuming it's AI-made (every giveaway).
15. Brand-new user of any app (confusing, broken, frustrating steps).
- Real playtests with friends still happen. After launch: Funnel Analytics, fix the biggest drop-off stage first.

## PC (/pc)
- Run the simulations against the real game: playtest via Studio MCP, Device emulator for phone sizes, MicroProfiler / Stats for the perf pass.

## Mobile fallback (/mobile)
- Run the simulations against the design doc and code; write findings to `state/<task>.md`.
- Queue the device/perf pass and real playtest in [queue/pc.md](queue/pc.md).
