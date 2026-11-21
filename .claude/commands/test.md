---
description: Test-first loop; for bugs the Prove-It pattern (failing reproduction before the fix).
disable-model-invocation: true
---
Target: $ARGUMENTS

Feature: write the smallest check that describes the behaviour (it must fail), implement, re-run until it passes.
Bug (Prove-It): 1) write a check that reproduces the bug, 2) confirm it fails, 3) fix the root cause where all callers route through, 4) confirm it passes, 5) run the related tests only (full suite only before shipping).
Use what exists: `node --test`, the domain's verify step in its checklist, a browser screenshot for visual bugs. Mobile without a runner: static check + queue the run in queue/pc.md.
Then add the error → fix to the domain `errors.md` and a lesson bullet.
