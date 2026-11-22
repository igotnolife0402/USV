---
summary: Every Minigame Mayhem mistake (2026-11-21/22) as a rule for the next Roblox game; read before planning any game.
updated: 2026-11-22
status: current
triggers: [new game, roblox game, party game, minigame, minigames, post-mortem, mistakes, lessons learned]
---
# Roblox game post-mortem rules (from Minigame Mayhem)
Read before planning any Roblox game. Each line: the rule, then what went wrong (source). Owner asked 2026-11-22: "learn from all mistakes of this game so they never happen for any future games".

## Plan and scope
- Design for the real player count from the first build (party games: 10): spawn decks, contested goals, crowding; the solo test comes second (v1 owner review; [playbook](domains/roblox/playbook.md)).
- Long-run fun is in the first spec, not a later polish pass: one new verb per game, a vote between rounds, mutators, a 3-line how-to card per game, a round-start cutscene. Without them the owner called it boring after 10 min (fun pass, 2026-11-22).
- Spectate ships in v1: out or finished players get a spectate bar (prev/next, target name, back). The owner had to ask for "an actual spectate menu".
- A scope cut against an approved spec goes into the state file and the same reply (tutorial island, shop and 2 games were cut in the fun pass).

## Movement and feel
- One reused mover per root, finite MaxForce, every speed from one capped module; prove it with a math test plus an in-play speed measurement. Dash plus roll stacked two infinite movers and flung players about 700 studs/s (L-120; [playbook](domains/roblox/playbook.md)).

## Bots
- Bots get pathfinding, per-bot variety, moving-platform timing and dodging from the first build, and are proven with numbers from [tools/roblox/bot-watch.luau](tools/roblox/bot-watch.luau). The owner reported "stuck", "same path" and "very robot" in three separate rounds because only stuck time was measured. Rules and targets: [bots](domains/roblox/bots.md).

- Every timed hazard is passable on foot. The gap between hits must be longer than the walk through its reach (chord ÷ walk speed + 0.2 s), and that must still hold at full crowd scaling. ObstacleRush spinners at 10 players returned every 1.29 s against a 1.9 s crossing, so every crosser was hit (13-21 knocks per bot-minute, 2026-11-22).

## Maps and looks
- Platforms are single slabs with the baseplate grid texture; tiled Grass/Rock floors read as part spam (owner review).
- Every arena is dressed to a theme: decor outside the reserved routes, at least 25 decor models per arena. Empty arenas were the main visual complaint (fun pass: 38-44 per arena after the fix).
- 0 clipping is proven by an occupancy audit before the owner looks (v1 had 174 overlaps that the owner found). Liquid planes and deliberate inserts are audit exceptions by name; never loosen the threshold for them.
- Every arena carries every marker the round server reads (Start or Spawns, FinishZone, Center/Radius). A missing Start silently dropped 6 games while the sim passed, so smoke tests go through the real selection function (L-124).
- Kit models share one quality tier: HERO >= 60 parts, PROP >= 30 (owner: uneven model quality).
- Kit import: PrimaryPart = nil, pivot = bottom-centre of the world AABB (L-123).

## UI
- A palette module plus a UI kit come before the first screen. No Neon material and no pure black in UI. A gate script fails on Color3 literals outside the palette (Minigame Mayhem repo, ui-gate test in its tests folder). Owner: "sloppy… weird neon and black colors" ([ui](domains/roblox/ui.md)).

## Pipeline and testing
- Test only what changed: dev attributes jump to the round under test. Use `SkipToDuel`, or `MMForce` (a Studio-only check in the vote) to force a game (L-116).
- Long Studio measurements run in task.spawn and write a workspace attribute (L-125).
- Base VFX on built-in particle textures; uploaded flipbook decals can take 40+ min (L-117).
- Fresh repo: set git user first (L-121). Crew specs that edit files read the anchors first (L-126).
- Script sync: pack-scripts into the kit rbxmx, rbxmx-check, one Model upload, then GetObjects swap in Edit, `pcall(require)` on each changed module, save. Never leave a Studio-only edit.

## Process
- Write qa-gate defects into the state file in the same turn, with their fixes. The 11 polish-gate defects were never recorded.
- A look that was not seen (UI, cutscene orbit, arenas) is queued in queue/pc.md and never claimed.
- Owner rule text changes only after the owner's own words (L-122).
