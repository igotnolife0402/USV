---
summary: PC-only steps left by phone sessions; PC sessions show these first. Append one line per step, tick when done.
updated: 2026-11-21
status: current
triggers: [queue, pending, pc step]
---
# PC queue
Format: `- [ ] YYYY-MM-DD step — context (files, why, expected result)`. Done: `- [x]` + short result. Rolled to archive monthly.
PC QUEUE: do queued items first if the task depends on them or the owner says /pc with no task; otherwise mention them in one line.
Queue sync: mobile commits queue/pc.md and its work to its cloud session branch (the cloud pushes it); the PC SessionStart hook fetches origin and lists unchecked items from origin/claude/* branches plus the branches to merge.

## Pending
- [ ] 2026-11-21 vault hook: after a session resume the Stop hook re-reported errors from an earlier turn (venom/make.mjs heredoc escaping, already L-045); check parseTurn turn boundaries on resumed transcripts.
- [ ] 2026-11-22 2026-11-22 look at Umbrio tab computer-setup-1122 (Computer Setup, 28 parts) on the hub; built + read back + zfight PASS, not visually verified
- [ ] 2026-11-22 look at a fresh Umbrio upload of house + computer setup built with the new zfight fix (seethru PASS locally): confirm no gaps under the PC / inside the bed — 2026-11-22 gap fix, not visually verified
- [ ] 2026-11-22 look at Minigame Mayhem in Studio play: new palette UI (vote cards, top bar, spectate bar), cutscene orbit, 6 new arenas + theme decor, 15 new Umbrio kit models (tabs mm-kit5-games, mm-kit5-decor); none visually verified — swarm minigame-mayhem fun pass 2026-11-22
- [ ] 2026-11-22 2026-11-22 watch Minigame Mayhem bots in play (ObstacleRush, SpinSweep): do the waits/hops/dashes look human? not visually verified — bot-watch numbers only
- [ ] 2026-11-23 Run `node scripts/install-global.mjs` in the vault after pulling main: installs /improve (+ improver agent) as a personal skill so it works in every folder on the PC
- [ ] 2026-11-25 Open Umbrio hub project eo-onslaught-1 (Elemental Onslaught), play the 31.5 s clip, check the 7 flipbook cards line up with the sorcerer and read well — mobile build 2026-11-25; built-in browser is signed out so the look is not verified
- [ ] 2026-11-25 open Umbrio tab "Elemental Onslaught v2" (eo-onslaught-2), play clip onslaught: check pack-sheet placement at hand/target, pacing (3 s per element, payoff 21.25 s) — mobile build, not visually verified
- [ ] 2026-11-25 open Umbrio tab "Elemental Onslaught v3" (eo-onslaught-3), play clip onslaught: check bubbles/fireball/black hole/pillar/spikes/books read clearly and sizes — mobile build, not visually verified
