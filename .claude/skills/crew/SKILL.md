---
name: crew
description: 'Use for /crew <task> or when the owner wants sub agents with the main model as manager, any task; size gate first (0 workers when small). Main model = brain (plan, brief, check, merge); 3 crew-worker agents (Sonnet 5.5, medium) = hands that do exactly their brief. Huge specced builds: swarm.'
---
# crew: you are the brain, 3 workers are the hands

The owner wants top quality with less load on the main model: you think, workers execute. Quality comes from YOUR briefs and YOUR checks, never from trusting a worker.

## 0. Size gate (owner 2026-11-22: crew on 5 small vapes was slower and dearer than one thread)
Decide workers by cost, not by the skill name. Each worker costs ~1 min spawn+brief+merge and ~50k tokens.
- 0 workers: task fits in <= 3 min of your own work, or the pieces need ~the same reading (small models, one file, a few edits). Do it yourself in one thread, same gates, and say "crew: 0 workers (too small)".
- 1-3 workers: only pieces that each take > 3 min AND need different reading/files. Fewest that cut wall clock.
- Model per piece: mechanical pieces (follow a template, rename, port, run a fixed check) → `model: "haiku"`; design pieces → the agent default. Never main-model workers for mechanical work.

## 0b. Gate first (kills the fix-up rounds)
- BEFORE briefing, the brain makes ONE check command that runs every gate the result must pass (tests, lint, detail floor, zfight at the right scale, render) and runs it on an existing example so it is known to work.
- Every brief names that exact command; a worker reports DONE only on its exit 0. The brain runs the same command once on the merge. No gate the workers did not run gets added after.
- Give workers a template file to copy (closest existing working example) plus the known-pitfall list from the domain README/errors.md, so the first try passes.

## 1. Plan (you only, before any worker starts)
- Read only what you need to understand the task (routed notes, the files it touches). Decide the result and how you will check it.
- Split into up to 3 independent pieces. One owner per file: two workers never touch the same file. Fewer real pieces than 3 → use fewer workers, never pad. A piece that needs another piece's output waits for the next round.
- Things that must fit together (names, ids, function signatures, file paths, data shapes) go in a written contract you paste into every brief.

## 1b. Speed (owner, 2026-11-22): workers exist to make the task FASTER
- Cut work into small parallel pieces of <= 5 min each (research, one file, one fix list), never one long open-ended job per worker.
- Every brief has a hard cap: "<= 15 tool calls, report by 5 min, partial is fine". Wall clock of the whole task stays in its tier.
- The brain never waits idle: it writes the integration, the checks and the next step while workers run.
- Give workers exact defect lists (from your check), not "find and fix everything".
- Medium task = whole crew run under 5 min wall clock: 1 round of workers, then the brain finishes; no second worker round unless the owner asks.
- The moment a worker reports (or the cap passes), TaskStop it: no worker or its background command may stay running after its report.

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
