---
name: swarm
description: 'Use only for HUGE tasks (multi-hour builds, many domains) once the owner has approved an orchestration spec: orchestrator plans only, Wave 0 freezes contracts, domain leads + workers in own git worktrees, qa-gate before every merge, retro into lessons.md. Never for simple/medium tasks.'
---
# swarm — huge-tier orchestration in 30-min waves

## Gate (check before anything)
- Task is huge (would take > 30 min even with 4 sub-agents) AND the owner approved a written spec. No approved spec → write the spec (goal, domains, waves, contracts, file ownership, acceptance tests, cost note) to `state/<task>.md`, ask "Approve?", stop.
- Simple/medium/complex → do NOT swarm; use the tier rules in CLAUDE.md.
- Cost: agent teams burn ~7x the tokens of one thread. Say it in the spec.

## Roles
| Role | Does | Never |
|---|---|---|
| Orchestrator (you) | Plans waves, writes briefs, spawns leads, merges after qa-gate PASS, runs retro, keeps `state/<task>.md` | Writes product code |
| Wave 0 worker (1) | Freezes shared contracts: types, schemas, API shapes, `package.json`/deps, folder skeleton, test harness | Feature code |
| Domain lead (2-6) | Splits its domain into 2-6 worker briefs with exclusive file lists, spawns workers, reviews their reports, runs qa-gate on its branch set | Edits files a worker owns |
| Worker (2-6 per lead) | Implements its files in its own worktree, runs local checks, reports <= 8 lines | Touches files outside its list, edits contracts |
| qa-gate (`.claude/agents/qa-gate.md`) | Adversarial verify each branch | Fixes code |

## Worktrees (every worker, no exceptions)
```
git check-ignore -q .worktrees || echo ".worktrees/" >> .gitignore
git worktree add .worktrees/<id> -b swarm/<id>/<slug>      # id = w01, w02...; slug = kebab task
# after merge: git worktree remove .worktrees/<id> && git branch -d swarm/<id>/<slug>
```
Workers run with cwd = their worktree and absolute paths. Branch base = main after Wave 0 merge.

## Wave plan
- Wave 0 (one worker): contracts. Orchestrator reviews, qa-gate type-checks, merge, tag `swarm-<task>-w0`. Contracts are FROZEN; a change request goes to the orchestrator, who issues a new mini Wave 0.
- Wave 1..N (<= 30 min each): leads + workers in parallel on disjoint files. Each wave ends with qa-gate → merge → retro.
- Dependencies between workers → put them in different waves, never "wait for the other worker".

## Brief template (lead → worker; orchestrator → lead is the same shape)
```
ID: w07  Branch: swarm/w07/<slug>  Worktree: <abs>/.worktrees/w07
Goal: <one sentence, observable outcome>
Own ONLY: <exact file list>   Read-only: <contract files>
First: read lessons.md (whole) and <contract files>.
Contract: <names/signatures to implement verbatim>
Check before reporting: <exact commands, e.g. npx tsc --noEmit && node --test tests/x.test.mjs>
Fix cap: 3 attempts. Still failing → git checkout -- <your files>, report BLOCKED + last error.
Report (<= 8 lines): PASS|BLOCKED, files, checks run, what you could not check.
```

## Merge rule
qa-gate PASS on the branch → merge to main (`git merge --no-ff swarm/<id>/<slug>`) → re-run the project's full check on main → next branch. qa-gate FAIL → defect list back to the same worker (counts toward 3 tries). Merge conflicts mean file ownership was wrong: fix the plan, not by hand-editing a worker's file.

## State file `state/<task>.md` (orchestrator updates after every event)
```
# <task>  spec: approved YYYY-MM-DD   wave: 2/4
| id | lead | files | branch | tries | qa | status |
Decisions: ...   Blocked: ...   Next: ...
```
A new session resumes from this file alone.

## Retro (end of every wave, 2 min)
- For each BLOCKED or > 1 try: one cause, one rule. Append to `lessons.md` as `- [L-NNN] (h:0 x:0) YYYY-MM-DD rule — trigger: words` (next free number).
- A lesson that helped this wave: increment its `h`; one that misled: increment `x`.
- `log.md`: `## [YYYY-MM-DD] swarm / <task> wave N` + 1-3 lines.

## Verification
After the final wave: full test suite + type check + build on main, the spec's acceptance tests, one end-to-end run (screenshot/playtest), qa-gate on the whole diff since the Wave 0 tag.

## Done-check
- [ ] Every spec acceptance test passes on main.
- [ ] All worktrees removed, no `swarm/*` branches left unmerged without a note.
- [ ] State file final, lessons + log updated.

## Time target
30 min per wave; plan for the wave count in the spec. A wave overrunning by > 10 min → cut scope, ship what passed qa-gate.

## Mobile
Cloud sessions can run sub-agents and git in the repo checkout. Same plan; if `git worktree` fails, run workers sequentially on branches with exclusive file lists. Anything needing Studio/Blender/browser → queue: `- [ ] YYYY-MM-DD <step> — swarm <task> wave N`. Large swarms: prefer starting them from PC.
