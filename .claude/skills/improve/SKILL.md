---
name: improve
description: Owner-only /improve <seconds> <prompt> (any number, e.g. /improve 90 ...). Opus uses that time, writes a decision brief; the improver agent (Sonnet 5.5 low) expands it into a structured prompt (palette, exploded parts, steps, verify, owner rules); Opus builds from it.
disable-model-invocation: true
argument-hint: <seconds> <your prompt>
---

# /improve: brain writes the brief, Sonnet types the full prompt, then build

Owner rule 2026-11-23: manual only. The owner picks any think time in seconds; more time = better prompt (value ladder below). Owner 2026-11-23: no line counts anywhere; length = best result, zero filler.
Owner design 2026-11-23: the main model writes the prompt's decisions itself; Sonnet only expands them, because Sonnet types ~2x faster than Opus (A/B below).

## Think time (owner 2026-11-23: any number of seconds, no levels; the time box shows only when no number was given)
Syntax (owner 2026-11-23: time and prompt both go INSIDE the skill call): `/improve <seconds> <prompt>`, e.g. `/improve 90 make a viking helmet`; the slash menu shows the hint `<seconds> <your prompt>`.
- Read the number from the skill arguments: first or last word (`90`, `90s`, `1.5m`); also accept a number typed just before `/improve` in the same message. Strip it from RAW PROMPT.
- No number found: your FIRST action is the time box, AskUserQuestion, header "Think time", question "How long should I think about this prompt?", options `30 s`, `60 s`, `120 s (Recommended for models)`, `240 s`; "Other" takes any number. The timer starts when the owner answers (`start <s> --now`).
- No prompt text: ask for it in one short line, then run.
Higher time = better prompt, by one rule: work down the value ladder below, in order, until the timer says write; whatever the budget, the most valuable work is done first, and every extra second buys the next rung.

Value ladder (order measured 2026-11-23: briefs missing rungs 1-3 broke owner rules or built the wrong thing):
1. Owner rules + route: the hook block (OWNER MUST, route, checklist) and `node scripts/vault.mjs route "<prompt>"`.
2. The domain's first-read build note (3D: `domains/3d/umbrio-build.md` + `detail.md`; Roblox/web/game: the routed playbook's top section).
3. Closest template + its api lines (3D: the playbook's which-tool table, e.g. helmets -> `tools/3d/armor/vhq_helm.py`); fix the front axis and units.
4. Gate math with code: part counts, same-size ratio, floor class, tris, proud/coplanar gaps.
5. Readability and look rules (`ref-quality.md`, dark-metal rule) and real references.
6. Contradiction pass: every number in the brief agrees with every other (totals, dims vs parts, units).
7. Depth: more distinct parts, wear, sub-assemblies, build stages, then repeat 4 and 6 for the additions.
- Budget under ~15 s: no Sonnet; write the outline yourself from rung 1 only, then build.
- Measure: log `improve <s>: <s> brief, <s> Sonnet, <s> total, rungs 1-<n>` in log.md.

## Delivery deadline (owner 2026-11-23: the full prompt lands at the think time +-5 s, never earlier or later)
- First tool call: `node scripts/improve-timer.mjs start <seconds>` (clock = the moment the owner's message arrived, from the prompt hook). It prints `send_brief_at` = think time - the Sonnet time it predicts for that budget (interpolated from measured runs, 17 s at 30 s to 27 s at 240 s); budgets <= 15 s have no Sonnet.
- Between research steps: `node scripts/improve-timer.mjs left`; obey `advice` (keep researching / write the brief now / send now). Never start a read that won't finish before `brief_left`.
- Never write the brief while `advice` says keep researching (2026-11-23: the 200 s car brief stopped at 113 s, wasting 87 s): spend it on rungs 4-7 (gate math, contradiction pass, depth) and re-check `left`.
- Sonnet back early: spend the slack on a real check (brief values survived, gate math re-run, contradictions) and fix what it finds; still > 5 s early with nothing left to check: wait out the rest with Monitor until `left` <= 2. Late: deliver at once, never pad further.
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
2. Rule (promoted L-136, 2026-11-24: a 60 s beam prompt landed at 269.8 s because a 400-line Write was composed before the Sonnet notice): never Write or compose a file over ~40 lines, nor fire a batch of slow external calls (2026-11-24: 12 Firecrawl screenshots made a 120 s prompt 20 s late), before the prompt is shown; until then only reads, skill load, scaffold, one slow call at most and `left`.
   Same turn, right after the spawn: start the build from your BRIEF (invoke the brief's skill, open its checklist, first build step). Do not wait. Until the prompt is shown, only short tool calls (reads, `left`) with no long planning between them: a result is seen only between tool calls, and the 45 s car run (2026-11-23) delivered at 80.8 s because build planning hid the on-time Sonnet return. At `left` <= 2, stop build work and wait for Sonnet with Monitor.
3. When the full prompt arrives: show it to the owner in a collapsed block (`<details><summary>Improved prompt</summary>...</details>`), then follow its Build steps, Verify and Owner rules for the rest of the build. Brief values win over anything Sonnet changed.
4. `/improve only ...`: skip step 2; show the prompt when it arrives and stop.

## Notes
- Owner's words win over any `(assumed)` choice.
- Agent files load at session start: in the session that created them, use general-purpose + `model: sonnet` + `effort: low` and tell it to Read improver.md first.
- A/B 2026-11-23 (dragon + Roblox pets, same template, raw prompt only): Sonnet low 15-19 s, Opus medium 30-34 s; Opus ~20-30% richer (parent tree, client-only pet visuals, DataStore load guard). The brief gives Opus-level decisions at Sonnet typing speed.
- Brief flow timed 2026-11-23 (pets): brief ~11 s + Sonnet 19.7 s = 30.7 s total; every brief value survived, Sonnet flagged a 10-vs-11 parts slip. The brief was reused from the A/B, so a fresh brief with real thinking will take longer.
- Drone A/B 2026-11-23 (fresh prompt): brief flow → build starts 16.3 s, full prompt 31.9 s; Sonnet only → prompt 16.4 s. Same start time, brief flow far fewer errors (Sonnet-only: 39 parts vs its own ">= 40" gate, 0.05 blades vs ">= 0.15" thickness rule, size contradiction). Keep brief flow.
- Fable 5.2 medium as sole writer (2026-11-23, drone): 39.6 s, richest detail but tier/skill wrong and spec fails the hero same-size gate; ~4x Sonnet price per token ($8/$40 vs $2/$10 per MTok). Not worth it here: brief flow = Opus decisions at Sonnet cost.
- Think-time test 2026-11-23 (viking helmet, fresh Opus per level; rubric /100): 10s 20, 30s 30, 60s 81, 120s 91, 240s 98. Delivery: 10s 2.8 (early FAIL), 30s 31.0, 60s 61.6, 120s 126.3 (+6.3 FAIL), 240s 249.1 (+9.1 FAIL) -> Sonnet time now scales by level in the timer.
- Blind build test 2026-11-23 (helmets built from the 30/60/120/240 s prompts, real Studio render, 8 labeled views, 3 blind Sonnet raters, order shuffled): total /180 = 77 / 84 / 106 / 111 (43/47/59/62 %); all 3 ranked 30 s last; 120 s and 240 s won 2 of 3 each... (M first for 2 raters, T for 1). Prompt rubric overrated 60 s (81 vs real 47 %): its brief picked the wrong template (house.py) and no front axis. Sweet spot 120 s; 240 s +3 %.
- Phone, new cloud session: `/improve` is not in the pre-session `/` menu (repo not cloned yet); type `/improve <s> <prompt>` in full and send, or use the account-level copy (tools/skills/improve-standalone).
