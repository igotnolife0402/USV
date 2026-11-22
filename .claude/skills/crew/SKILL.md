---
name: crew
description: 'Use for /crew <task> or when the owner wants sub agents with the main model as manager, any task. Brain (main model) decides everything and reviews; always 3 crew-worker agents (Sonnet 5.5, low) copy its exact spec in one pass, then wait for OK or a new instruction. Huge: swarm.'
---

# crew: you are the brain, 3 Sonnet workers are fast hands

Owner rule (2026-11-22, replaces the old size gate): ALWAYS 3 Sonnet workers. Workers never think for themselves: they copy the brain's spec in one fast pass, report, and the brain says OK or gives a new exact instruction. Slowness came from workers designing, researching and retrying a self-check for ~7 min; that is now banned on both sides.

## The loop (per worker)
brain spec → worker one pass (~1-2 min) → report → brain reviews → `OK` (TaskStop) or new exact instruction (SendMessage) → repeat. Max 3 rounds per worker, then the brain does that piece itself.

## 1. Brain decides everything first (workers spawned within 60 s)
- Owner 2026-11-22: 1.5 min of brain reading before a gun model was too slow. Easy builds (props, guns, small models, edits): read ONE template file (or a grep of it, not the whole thing), skip the router's "Read first" notes, index, playbook and checklist until the review step, no deliberation. Max 2 reads before spawning.
- Decide the result, every name, value, size, color, position, signature and file path. Nothing is left for a worker to choose.
- Split into exactly 3 pieces, one owner per file. Fewer natural pieces: split one file's work into sections that land in separate files, or give the spare worker(s) a variant of the hardest piece (different spec values you name) and keep the best. Never let a worker wait on another's output in the same round.
- Check command: reuse the template's own (e.g. its `--check`); never build or test-run one before spawning.

## 2. Brief = a spec to copy, not a problem to solve
Spawn all 3 `crew-worker` agents in ONE message, run_in_background. Each brief:
1. One line goal, then their piece.
2. Files they write (absolute paths) and the ONE template file to copy (closest working example). No "look around".
3. The exact spec: literal code, values, numbers, lists, or "copy template X, change only A→B, C→D". The more literal, the faster and more correct. Contract (shared names/paths/shapes) verbatim.
4. The check command to run once, or "no check".
5. "One pass, no retries, no research, ~8 tool calls; report in the format from your agent file."
Never write "find and fix", "make it good", "figure out", "research" or "improve" in a brief: those turn a 1-min copy into a 7-min hunt.

## 3. While they work
Write the integration, the merge and your review check. Never edit a worker's files while it runs.

## 4. Review each report (brain only)
- Visual check = ONE look at the existing output (Umbrio tab / Artifact). Never build a viewer, start a server or loop captures; never run heavy checks in parallel (PC lags).
- Open the files / run the check yourself. Read the GUESSED line: each guess is a hole in your spec.
- Good → reply nothing more, TaskStop the worker.
- Wrong → SendMessage the same worker ONE exact instruction: the defect and the literal fix ("line 40: size 2→1.5; rename Foo→Bar"). Never "try again" or "fix it".
- 3rd wrong round on a piece → TaskStop, do it yourself.
- No worker or background command stays running after its OK.

## 5. Model
The agent file pins claude-sonnet-5-5 at effort low. If the spawn errors on the model (this desktop app maps the `sonnet` alias to "auto"), re-spawn with no model override and tell the owner it ran on the main model.

## 6. Close
Verify the merged result yourself (owner rule: 100% honest; a worker's DONE is a claim). Log to log.md, lesson for anything that failed, answer the owner: result, what you checked, what was not verified.

## Not for
- Huge multi-hour builds: `swarm` (needs an approved spec).
