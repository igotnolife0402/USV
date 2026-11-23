---
name: improve
description: Owner-only /improve <prompt>. Main model writes a dense decision brief (the thinking), the improver agent (Sonnet 5.5, low) expands it into a structured 100-120 line prompt (goal, route, palette, exploded breakdown, steps, verify, owner rules), then the main model runs it.
disable-model-invocation: true
---

# /improve: brain writes the brief, Sonnet types the full prompt, then build

Owner rule 2026-11-23: manual only; target < 30 s from /improve to improved prompt back (ideal < 10 s).
Owner design 2026-11-23: the main model writes the prompt's decisions itself; Sonnet only expands them, because Sonnet types ~2x faster than Opus (A/B below).

## Do exactly this (no reads before the spawn)
1. Your FIRST tool call: Agent, `subagent_type: improver`, `run_in_background: true` (owner 2026-11-23: build starts from the brief, never wait for Sonnet), prompt =
   ```
   MODE: <mobile|pc from the hook block>
   RAW PROMPT: <the owner's text after /improve, verbatim>
   BRIEF:
   <15-30 terse lines, decisions only, no prose>
   ```
   BRIEF holds every decision that needs your judgment, as `key: value` lines:
   - goal (real goal + who uses it), tier, skill, checklist, scope out (what NOT to build).
   - 4-6 assumptions.
   - Type specifics. Model: style, 1-2 real references, pose, palette `role hex rough/metal`, parts `name size count material attach` (8-15), overall dims, parent tree. Roblox: files, remotes, data keys, tunables with numbers. Web: sections, palette, layout. Game: loop, controls, entities. Other: the outline.
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
