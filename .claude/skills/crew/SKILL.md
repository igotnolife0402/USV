---
name: crew
description: 'Use for /crew <task> or when the owner wants sub agents with the main model as manager, any task. Brain (main model) decides everything and reviews; always 3 crew-worker agents (Sonnet 5.5, low) copy its exact spec in one pass, then wait for OK or a new instruction. Huge: swarm.'
---

# crew: you are the brain, 3 Sonnet workers are fast hands

Owner rule: always 3 Sonnet workers. Workers make no design decisions: they copy the brain's spec in one fast pass, report, and the brain says OK or gives a new exact instruction. Workers that design, research or retry their own self-checks turn a 1-2 min pass into ~7 min.

## The loop (per worker)
spawn + prep (parallel with brain design) → brain spec → worker one pass (~1-2 min) → report → brain reviews → `OK` (TaskStop) or new exact instruction (SendMessage) → repeat. Max 3 rounds per worker, then the brain does that piece itself.

## 0. Spawn first, design after
Brain reads, silent design and long briefs written one by one all delay the first worker; spawning first lets prep overlap design.
- The brain's FIRST tool message (with update_plan) spawns all 3 `crew-worker`s, run_in_background, each with a <= 5 line prep brief: their piece in one line, the style catalog `tools/3d/styles/<style>.md` (one file = every model of that style with api/constant line numbers) + the exact line range to read, "paste the function signatures/patterns you will use, then wait for the spec". New task with no template: name the closest one (`ls` result is enough).
- Fetch questions (when the brain needs facts) go in that same prep brief: "in X, paste the lines that define Y". Literal excerpts, no opinions.
- While they prep, the brain designs; then sends each spec with SendMessage (same worker keeps its context).

## 1. Brain decides everything, fast
- Find templates by reading ONE style catalog (`tools/3d/styles/<style>.md`), never by opening template files one by one.
- Take the template's defaults, change only what the request needs. Max 2 reads of your own.
- The router's injected OWNER MUST block (profiles/must.md) is binding: paste it verbatim at the top of every worker spec (workers never see it otherwise).
- Template must match the asked style; no style named = realistic (profiles/owner.md), never toon/low-poly by default.
- Decide every name, value, size, color, position and file path; nothing left for a worker to choose.
- Split into exactly 3 pieces, one owner per file. Fewer natural pieces: split one file's work into sections in separate files, or give the spare worker a variant you name and keep the best. Never let a worker wait on another's output in the same round.
- Check command: reuse the template's own (e.g. its `--check`); never build or test-run one first.

## 2. Spec (SendMessage) = values to copy, <= 15 lines each
Fill the templates in [spec.md](spec.md) (prep + build + known-good checks); prose specs take longer to write than the 45 s spec budget allows.
1. Files they write (absolute paths) + the shared contract (names, origin, units) verbatim, identical in all 3.
2. A values list: part → size, position, color, material, count. "copy template fn X, change A→B". No geometry code written by the brain: the worker has the template's patterns from prep.
3. The check command to run once, or "no check". Only commands whose output you know: node tests = `node --test --test-reporter=tap <files> 2>&1 | grep -E "^ *not ok|^# (pass|fail)"` (the default reporter prints no "# pass" line, so a grep for it reads as a failure).
4. "One pass, no retries, no research of your own, ~8 tool calls; report in the format from your agent file."
Never write "find and fix", "make it good", "figure out", "research" or "improve": those turn a 1-min copy into a 7-min hunt.

## 3. While they work
Write the integration, the merge and your review check. Never edit a worker's files while it runs.
- Fetch reports in → build specs out within 45 s. Need more facts? Send a second fetch round to the same workers rather than investigating alone, which stalls all 3 workers. The Stop hook flags spawn > 30 s and specs > 90 s after spawn.

## 4. Review each report (brain only)
- Visual check = ONE look at the existing output (Umbrio tab / Artifact). Never build a viewer, start a server or loop captures; never run heavy checks in parallel (PC lags).
- Open the files / run the check yourself. Read the GUESSED line: each guess is a hole in your spec.
- Good → reply nothing more, TaskStop the worker.
- Wrong → SendMessage the same worker ONE exact instruction: the defect and the literal fix ("line 40: size 2→1.5; rename Foo→Bar"). Never "try again" or "fix it".
- 3rd wrong round on a piece → TaskStop, do it yourself.
- Gate failures on the merge (z-fight, tris, detail): split the defect list by owning worker and SendMessage all 3 in one message; a solo brain edit-rebuild loop serialises work the 3 workers can do in parallel.
- No worker or background command stays running after its OK.

## 5. Model
The agent file pins claude-sonnet-5-5 at effort low. If the spawn errors on the model (this desktop app maps the `sonnet` alias to "auto"), re-spawn with no model override and tell the owner it ran on the main model.

## 6. Close
- End with a crew report: phase timing table (pre-spawn, workers, review+fix rounds, Umbrio save, close) with seconds and % of total, worker tool calls each, fixes done this run, fixes still needed. Times from the transcript, never estimated.
3D/model tasks: the merged model is live-built into a fresh Umbrio Sandbox tab and read back before close (checklists/3d.md); a preview PNG is not done.
Verify the merged result yourself (owner rule: 100% honest; a worker's DONE is a claim). Log to log.md, lesson for anything that failed, answer the owner: result, what you checked, what was not verified.

## Not for
- Huge multi-hour builds: `swarm` (needs an approved spec).
