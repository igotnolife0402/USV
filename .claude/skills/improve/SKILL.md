---
name: improve
description: Owner-only /improve <seconds> <prompt> (any number, e.g. /improve 90 ...). Opus uses that time, writes a decision brief; the improver agent (Sonnet 5.5 low) expands it into a structured prompt (palette, exploded parts, steps, verify, owner rules); Opus builds from it.
disable-model-invocation: true
argument-hint: <seconds> <your prompt>
---

# /improve: brain writes the brief, Sonnet types the full prompt, then build

Owner rules: manual only. The owner picks any think time in seconds; more time = better prompt (value ladder below). No line counts anywhere; length = best result, zero filler.
The main model writes the prompt's decisions itself; Sonnet only expands them, because Sonnet types ~2x faster than Opus (notes below).

## Think time (any number of seconds, no levels; the time box shows only when no number was given)
Syntax (time and prompt both go inside the skill call): `/improve <seconds> <prompt>`, e.g. `/improve 90 make a viking helmet`; the slash menu shows the hint `<seconds> <your prompt>`.
- Read the number from the skill arguments: first or last word (`90`, `90s`, `1.5m`); also accept a number typed just before `/improve` in the same message. Strip it from RAW PROMPT.
- No number found: your FIRST action is the time box, AskUserQuestion, header "Think time", question "How long should I think about this prompt?", options `30 s`, `60 s`, `120 s (Recommended for models)`, `240 s`; "Other" takes any number. The timer starts when the owner answers (`start <s> --now`).
- No prompt text: ask for it in one short line, then run.
Higher time = better prompt, by one rule: work down the value ladder below, in order, until the timer says write; whatever the budget, the most valuable work is done first, and every extra second buys the next rung.

Value ladder (order measured 2026-11-23: briefs missing rungs 1-3 broke owner rules or built the wrong thing):
1. Owner rules + route: the hook block (OWNER MUST, route, checklist) and `node scripts/vault.mjs route "<prompt>"`.
2. The domain's first-read build note (3D: `domains/3d/umbrio-build.md` + `detail.md`; Roblox/web/game: the routed playbook's top section).
3. Closest template + its api lines (3D: the playbook's which-tool table, e.g. helmets -> `tools/3d/armor/hq.py` kit); fix the front axis and units.
4. Gate math with code: part counts, same-size ratio, floor class, tris, proud/coplanar gaps.
5. Readability and look rules (`ref-quality.md`, dark-metal rule) and real references.
6. Contradiction pass: every number in the brief agrees with every other (totals, dims vs parts, units).
7. Depth: more distinct parts, wear, sub-assemblies, build stages, then repeat 4 and 6 for the additions.
- Budget under ~15 s: no Sonnet; write the outline yourself from rung 1 only, then build.
- Measure: log `improve <s>: <s> brief, <s> Sonnet, <s> total, rungs 1-<n>` in log.md.

## Delivery deadline (owner 2026-11-23: the full prompt lands at the think time +-5 s, never earlier or later)
- First tool call: `node scripts/improve-timer.mjs start <seconds>` (clock = the moment the owner's message arrived, from the prompt hook). It prints `send_brief_at` = think time - the Sonnet time it predicts for that budget (interpolated from measured runs, 17 s at 30 s to 27 s at 240 s); budgets <= 15 s have no Sonnet.
- Between research steps: `node scripts/improve-timer.mjs left`; obey `advice` (keep researching / write the brief now / send now). Never start a read that won't finish before `brief_left`.
- While `advice` says keep researching, spend the time on rungs 4-7 (gate math, contradiction pass, depth) and re-check `left`; an early brief wastes the owner's think time.
- Sonnet back early: spend the slack on a real check (brief values survived, gate math re-run, contradictions) and fix what it finds; still > 5 s early with nothing left to check: wait out the rest with Monitor until `left` <= 2. Late: deliver at once, never pad further.
- Promoted 2026-11-24 (L-136 seen 4x: 78.9, 69.4, 74.3 s on 60 s budgets): between the spawn and the shown prompt, every tool call must finish in <= 5 s (no Edits of big files, no test runs, no batches) and each one is chained with `left`; build work starts only after the prompt is shown.
- 2026-11-24 (L-189, 60 s run +14.8 s): a loop over files (20 paint.py calls, ~13 s) after the spawn hid an on-time Sonnet return; per-file loops, generators and skill calls wait until the prompt is shown.
- Promoted 2026-11-24 (L-177/L-178, +36 s and +48.6 s): prototype code is rung 4, never a reason to pass send_brief_at; a script run > 5 s before the spawn is forbidden.
- send_brief_at is a hard line (2026-11-24, 120 s run spawned 8 s late -> +12.4 s): when `left` says write, spawn in the next call; no 'one more' lookup. After the prompt shows, invoke every skill the router named, not only the first.
- Interrupted turns before `/improve` (2026-11-25, +49.5 s): start with `start <s> --now` so earlier turns do not eat the budget.
- Show the prompt, then `node scripts/improve-timer.mjs done` and put its `elapsed`/`result` on one line under the prompt.

## Do exactly this
0. Climb the value ladder until `left` says write the brief (budget <= 15 s: build from your outline).
1. Next tool call: Agent, `subagent_type: improver`, `run_in_background: true` (owner 2026-11-23: build starts from the brief, never wait for Sonnet), prompt =
   ```
   MODE: <mobile|pc from the hook block>
   RAW PROMPT: <the owner's text after /improve, verbatim, the seconds removed>
   BRIEF:
   <decisions only, no prose; as long as the ladder work produced>
   ```
   BRIEF holds every decision that needs your judgment, as `key: value` lines:
   - goal (real goal + who uses it), tier, skill, checklist, scope out (what NOT to build).
   - 4-6 assumptions.
   - Type specifics. Model: style, 1-2 real references, pose, palette `role hex rough/metal`, parts `name size count material attach` (every distinct part), overall dims, parent tree. Roblox: files, remotes, data keys, tunables with numbers. Web: sections, palette, layout. Game: loop, controls, entities. Other: the outline.
   - verify: the ONE outside check + pass numbers.
   Write it fast: fragments, numbers, hex; Sonnet turns it into sentences and tables.
2. Same turn, right after the spawn: start the build from your BRIEF (invoke the brief's skill, open its checklist, first build step). Do not wait. Until the prompt is shown, keep to short tool calls (reads, `left`): a background result is seen only between tool calls, so long planning between calls delays delivery past the deadline. At `left` <= 2, stop build work and wait for Sonnet with Monitor.
3. When the full prompt arrives: show it to the owner in a collapsed block (`<details><summary>Improved prompt</summary>...</details>`), then follow its Build steps, Verify and Owner rules for the rest of the build. Brief values win over anything Sonnet changed.
4. `/improve only ...`: skip step 2; show the prompt when it arrives and stop.

## Notes
- Owner's words win over any `(assumed)` choice.
- Agent files load at session start: in the session that created them, use general-purpose + `model: sonnet` + `effort: low` and tell it to Read improver.md first.
- Why the brief flow: the brief carries Opus-level decisions and Sonnet expands them at roughly half Opus's typing time; without a brief, Sonnet's prompt contradicts its own gates (part counts, thickness, sizes).
- Think time: quality rises steeply to ~120 s and flattens after; the most common short-budget failure is a wrong template or a missing front axis (rungs 2-3).
- Phone, new cloud session: `/improve` is not in the pre-session `/` menu (repo not cloned yet); type `/improve <s> <prompt>` in full and send, or use the account-level copy (tools/skills/improve-standalone).
