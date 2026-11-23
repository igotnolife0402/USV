---
name: improve
description: Manual only, run when the user types /improve. Turns a rough prompt into the best possible structured build prompt in the think time the user gives (/improve 90 make a viking helmet), then carries it out. Works in any project or a plain chat.
disable-model-invocation: true
argument-hint: <seconds> <your prompt>
---

# /improve: think for the time given, write the best prompt, then do it

Usage: `/improve <seconds> <prompt>`, e.g. `/improve 90 make a viking helmet`. More seconds = better prompt.

## 1. Read the arguments
- Seconds: the first or last word if it is a number (`90`, `90s`, `1.5m`), also a number typed just before `/improve`. Remove it from the prompt.
- No number: ask with a selection box if you have one (header "Think time", "How long should I think about this prompt?", options `30 s`, `60 s`, `120 s (Recommended for 3D models)`, `240 s`; "Other" = any number). No box tool: ask in one line.
- No prompt: ask for it in one line.
- `only` anywhere in the arguments (`/improve 60 only ...`): deliver the prompt and stop, do not build.

## 2. Keep time (deliver at the chosen time, +-5 s)
- If you can run shell commands: `date +%s` at the start, again between steps; stop researching when the remaining budget is what the write-up needs (about 20 s at 30-60 s budgets, 25-30 s at 120-240 s).
- In a plain chat with no clock: match depth to the budget (short budget = rungs 1-2, long = all rungs) and say "timing estimated, no clock here".
- Early: spend spare time on a real check (step 4). Late: deliver at once.

## 3. Climb the value ladder, in order, until time is up (most valuable first; extra seconds buy the next rung)
1. The user's rules: their project instructions (CLAUDE.md, rules files, memory, profile notes) and anything said in this chat. Owner's latest word wins.
2. The domain's own guide in this project if there is one (playbook, build notes, style guide, README of the tool to use).
3. The closest existing template, file or example to copy from, with the exact function names / lines; fix the front axis, units and scale.
4. Numbers checked with code where possible: counts, totals, sizes, limits the project enforces (quality gates, tri budgets, sizes).
5. Look rules and real-world references (real objects, never film/game characters); materials readable under the renderer's lighting.
6. Contradiction pass: every number agrees with every other (totals, dimensions vs parts, units).
7. Depth: more distinct parts, wear, sub-assemblies, stages; then repeat 4 and 6.

## 4. Write the prompt
- Decide everything yourself first as a terse BRIEF (key: value lines: goal, scope out, assumptions, type specifics, verify).
- If you can spawn a sub-agent: give a Sonnet sub-agent (low effort, no tools) the BRIEF plus the instructions in `references/improver.md`, in the background, and start the work from your BRIEF meanwhile. Its values must match the BRIEF exactly; fix any drift.
- No sub-agents: write the full prompt yourself following `references/improver.md`.
- Show the prompt in a collapsed block (`<details><summary>Improved prompt</summary> ... </details>`) with one line under it: `think <s> s, delivered at <s> s` (or "timing estimated").

## 5. Then do the task
Follow the prompt's steps and its one outside check (script, measurement, screenshot, read-back). Done only when that check passes; otherwise say `Failed: <what>`. Never claim a look you did not see.

## Defaults for this user (when the project says nothing else)
- 3D models: realistic unless a style is named; built in Umbrio Sandbox inside the Claude-Hub artifact (https://claude.ai/artifact/Bz8SnAVkhjyXgk79t8eadF); effects with the VFX Generator or Ember VFX Studio (https://claude.ai/artifact/Fu7Hx25z9ELLUDBhJCp1pX); custom meshes, textures, real thickness, many parts, no placeholders, no z-fighting; dark metals no darker than #5a5a5a so they read.
- Every prompt for a model includes a colour palette table (role, hex, roughness/metalness, where used) and a breakdown shot (exploded parts table: part, shape, size, material, count, attaches to).
- Scope = exactly what was asked; no overkill effects; short replies; honest results.
