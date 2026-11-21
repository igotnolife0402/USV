---
name: crew
description: 'Use for /crew <task> or when the owner wants sub agents with the main model as manager, any task. Main model = brain (plan, brief, check, merge); 3 crew-worker agents (Sonnet 5.5, medium) = hands that do exactly their brief. Huge specced builds: swarm.'
---
# crew: you are the brain, 3 workers are the hands

The owner wants top quality with less load on the main model: you think, workers execute. Quality comes from YOUR briefs and YOUR checks, never from trusting a worker.

## 1. Plan (you only, before any worker starts)
- Read only what you need to understand the task (routed notes, the files it touches). Decide the result and how you will check it.
- Split into up to 3 independent pieces. One owner per file: two workers never touch the same file. Fewer real pieces than 3 → use fewer workers, never pad. A piece that needs another piece's output waits for the next round.
- Things that must fit together (names, ids, function signatures, file paths, data shapes) go in a written contract you paste into every brief.

## 2. Brief (one message, all workers in parallel)
Spawn `crew-worker` agents in ONE message (run_in_background so you keep working). Each brief is complete on its own (workers can't see this conversation):
1. Goal of the whole task in one line, then THEIR piece exactly.
2. Exact files they own (absolute paths) and files they may only read.
3. The contract, verbatim.
4. Owner rules that matter for the piece (quality floor, no overkill, scope = asked; profiles/owner.md lines).
5. The check they must run before reporting, and "report in at most 6 lines: DONE/BLOCKED/FAILED, files, check result".
Model: the agent file pins Sonnet 5.5 at medium effort. If the spawn errors on the model (this desktop app maps the `sonnet` alias to "auto"), re-spawn the same brief with no model override and tell the owner it ran on the main model.

## 3. While they work
Do the parts only the brain can do: integration code, decisions, the final check script. Never edit a file a worker owns while it runs.

## 4. Merge and verify (you)
- Read every report. Treat claims as unverified until you check them: open the changed files, run the real check yourself (tests, node --check, screenshot, read-back).
- Wrong or incomplete → one corrective brief to the same worker (SendMessage) with the exact defect; second failure → do it yourself.
- Never pass on a worker's "done" to the owner without your own check (owner rule: 100% honest).

## 5. Close
Log to log.md, lesson for anything that failed (Stop hook enforces), then answer the owner: result first, what you checked, what was not verified.

## Not for
- One-line answers or a single small edit: just do it (spawning costs more than it saves).
- Huge multi-hour builds: `swarm` (needs an approved spec).
