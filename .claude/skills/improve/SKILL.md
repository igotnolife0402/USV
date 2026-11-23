---
name: improve
description: Owner-only /improve <prompt>. Sends the raw prompt to the improver agent (Sonnet 5.5, low) which returns a structured 100-120 line prompt (goal, route, palette, exploded breakdown, steps, verify, owner rules), then runs it.
disable-model-invocation: true
---

# /improve: rough prompt in, structured prompt back, then build

Owner rule 2026-11-23: manual only; target < 30 s to get the improved prompt back (ideal < 10 s).

## Do exactly this (no reads, no thinking before the spawn)
1. Your FIRST tool call: Agent, `subagent_type: improver`, `run_in_background: false`, prompt =
   ```
   MODE: <mobile|pc from the hook block>
   RAW PROMPT: <the owner's text after /improve, verbatim>
   ```
   Add nothing else: the agent already holds the template, tools and owner rules.
2. Note the start time; when it returns, check: >= 100 lines and all 9 sections. Short or missing → fill the gaps yourself, do not respawn.
3. Show the owner the improved prompt in a collapsed block (`<details><summary>Improved prompt</summary>...</details>`) or plain if the client can't collapse.
4. Then carry it out as the task (its Route, Steps, Verify). If the owner wrote `/improve only ...`, stop after step 3.

## Notes
- Improved prompt ignores nothing the owner said; owner's words win over the agent's `(assumed)` choices.
- Timing 2026-11-23 (general-purpose stand-in + 1 Read, 125 lines): 34.7 s; output length is the cost. Over 30 s → lower the line target first; < 10 s is not reachable at 100+ lines.
- Agent files load at session start: in the session that created them, use general-purpose + `model: sonnet` + `effort: low` and tell it to Read improver.md first.
- A/B 2026-11-23 (dragon + Roblox pets, same template): Sonnet low 15-19 s, Opus medium 30-34 s. Opus ~20-30% richer (parent tree, client-only pet visuals, DataStore load guard) but over the 30 s target; its best patterns were folded into the improver template instead. Keep Sonnet.
