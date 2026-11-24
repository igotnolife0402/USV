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
- [ ] 2026-11-24 Watch tools/vfx/crimson-beam/crimson-beam.html on phone + desktop Chrome; judge feel, deepen crimson if still pink; check fps on a mid phone — headless frames passed red 39% / 0 errors; feel and fps not visually verified
- [ ] 2026-11-24 Open Umbrio tab 'Crimson Beam' (cbeam-1124) on phone + PC, play Strike anim; judge shake/push-in feel and pilot beam visibility — headless MP4 + frames passed; feel not visually verified on device
- [ ] 2026-11-24 Play Umbrio tab 'Crimson Beam v2' (cbeam2-1124) on phone + PC: confirm plasma flipbook loads from the hub asset and judge detail/feel — headless used a data-url copy of the sheet; hub uses asset ede874fc...; not visually verified on device
