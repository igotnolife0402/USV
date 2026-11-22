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
