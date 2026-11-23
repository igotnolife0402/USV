---
name: improve
description: Owner-only /improve [think] <prompt>; think = quick|30s|2m|5m|deep|max. Opus thinks that long, writes a decision brief; the improver agent (Sonnet 5.5 low) expands it into a structured prompt (palette, exploded parts, steps, verify, owner rules); Opus builds from it.
disable-model-invocation: true
---

# /improve: brain writes the brief, Sonnet types the full prompt, then build

Owner rule 2026-11-23: manual only. Speed target replaced by the owner's think time (table below); quick stays < 10 s. Owner 2026-11-23: no line counts anywhere; length = best result, zero filler.
Owner design 2026-11-23: the main model writes the prompt's decisions itself; Sonnet only expands them, because Sonnet types ~2x faster than Opus (A/B below).

## Think time (owner 2026-11-23: "Opus is best"; the owner sets how long Opus thinks)
Syntax: `/improve [think] <prompt>`. `think` = the first word if it is `quick`/`q`, `<N>s`, `<N>m`, `deep` or `max`; strip it from RAW PROMPT. Owner's value always wins.
No think word → pick from the task's tier: simple = quick, medium = 30s, complex = 2m, huge = 5m. Say the chosen level in one line.

| think | Opus before the brief (the budget is wall-clock; stop at it) | Brief |
|---|---|---|
| quick (<= 10 s) | nothing: no reads, no Sonnet | write an outline yourself, then build (no spawn) |
| 30s | route only (`vault route`) | decisions only |
| 2m | route + the domain's first-read note + closest template's api lines | more decisions, all numbers checked |
| 5m / deep | + references (owner refs, templates), gate math checked with code (part counts, same-size ratio, tris) | full decisions + checked gate math |
| max | no cap: every gate pre-checked with code, contradictions resolved, explorer allowed | everything resolved |
- Gate math (2m and up): add up part counts, check the same-size ratio and the floor class before sending; a brief that fails its own gate is the A/B's top error (drones A and C).
- Measure: log `think <level>: <s> brief, <s> Sonnet, <s> total` in log.md.

## Delivery deadline (owner 2026-11-23: the full prompt lands at the think time +-5 s, never earlier or later)
- First tool call: `node scripts/improve-timer.mjs start <seconds>` (clock = the moment the owner's message arrived, from the prompt hook). It prints `send_brief_at` = think time - 18 s (measured Sonnet expansion); quick levels (<= 15 s) have no Sonnet.
- Between research steps: `node scripts/improve-timer.mjs left`; obey `advice` (keep researching / write the brief now / send now). Never start a read that won't finish before `brief_left`.
- Sonnet back early: spend the slack on a real check (brief values survived, gate math re-run, contradictions) and fix what it finds; still > 5 s early with nothing left to check: wait out the rest with Monitor until `left` <= 2. Late: deliver at once, never pad further.
- Show the prompt, then `node scripts/improve-timer.mjs done` and put its `elapsed`/`result` on one line under the prompt.

## Do exactly this
0. Do the think-time work for the level (quick: skip to building from your outline).
1. Next tool call: Agent, `subagent_type: improver`, `run_in_background: true` (owner 2026-11-23: build starts from the brief, never wait for Sonnet), prompt =
   ```
   MODE: <mobile|pc from the hook block>
   RAW PROMPT: <the owner's text after /improve, verbatim, think word removed>
   BRIEF:
   <decisions only, no prose; as long as the think level's work produced>
   ```
   BRIEF holds every decision that needs your judgment, as `key: value` lines:
   - goal (real goal + who uses it), tier, skill, checklist, scope out (what NOT to build).
   - 4-6 assumptions.
   - Type specifics. Model: style, 1-2 real references, pose, palette `role hex rough/metal`, parts `name size count material attach` (every distinct part), overall dims, parent tree. Roblox: files, remotes, data keys, tunables with numbers. Web: sections, palette, layout. Game: loop, controls, entities. Other: the outline.
   - verify: the ONE outside check + pass numbers.
   Write it fast: fragments, numbers, hex; Sonnet turns it into sentences and tables.
2. Same turn, right after the spawn: start the build from your BRIEF (invoke the brief's skill, open its checklist, first build step). Do not wait.
3. When the full prompt arrives: show it to the owner in a collapsed block (`<details><summary>Improved prompt</summary>...</details>`), then follow its Build steps, Verify and Owner rules for the rest of the build. Brief values win over anything Sonnet changed.
4. `/improve only ...`: skip step 2; show the prompt when it arrives and stop.

## Notes
- Owner's words win over any `(assumed)` choice.
- Agent files load at session start: in the session that created them, use general-purpose + `model: sonnet` + `effort: low` and tell it to Read improver.md first.
- A/B 2026-11-23 (dragon + Roblox pets, same template, raw prompt only): Sonnet low 15-19 s, Opus medium 30-34 s; Opus ~20-30% richer (parent tree, client-only pet visuals, DataStore load guard). The brief gives Opus-level decisions at Sonnet typing speed.
- Brief flow timed 2026-11-23 (pets): brief ~11 s + Sonnet 19.7 s = 30.7 s total; every brief value survived, Sonnet flagged a 10-vs-11 parts slip. The brief was reused from the A/B, so a fresh brief with real thinking will take longer.
- Drone A/B 2026-11-23 (fresh prompt): brief flow → build starts 16.3 s, full prompt 31.9 s; Sonnet only → prompt 16.4 s. Same start time, brief flow far fewer errors (Sonnet-only: 39 parts vs its own ">= 40" gate, 0.05 blades vs ">= 0.15" thickness rule, size contradiction). Keep brief flow.
- Fable 5.2 medium as sole writer (2026-11-23, drone): 39.6 s, richest detail but tier/skill wrong and spec fails the hero same-size gate; ~4x Sonnet price per token ($8/$40 vs $2/$10 per MTok). Not worth it here: brief flow = Opus decisions at Sonnet cost.
