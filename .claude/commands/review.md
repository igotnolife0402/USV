---
description: Adversarial review of the current change with the qa-gate agent; pass/fail with file:line fixes.
disable-model-invocation: true
---
Review the current change (uncommitted diff, or $ARGUMENTS).

1. Spawn the `qa-gate` agent (`.claude/agents/qa-gate.md`) with: the diff or file list, the router-named checklist, and `profiles/owner.md`. Omit `model`.
2. Axes: correctness vs the ask and checklist, readability, architecture (fits existing patterns), security (inputs validated, no secrets), performance (no unbounded work), owner floor.
3. Findings: Critical / Required / Nit, each with file:line and the exact fix. Verdict is pass or fail, no scores.
4. Fix Critical and Required, re-run the checklist's one verification (3-try cap), then log and add a lesson for each root cause found.
