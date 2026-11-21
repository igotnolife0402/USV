---
description: Plan a complex task into a state file with vertical slices, acceptance criteria and one verify command each.
disable-model-invocation: true
---
Plan this task: $ARGUMENTS

1. Read only the router-named notes and checklist. Plan only: no code changes yet.
2. If `state/<task-slug>.md` exists with unchecked steps for different work, stop and ask; never overwrite an unfinished plan.
3. Write `state/<task-slug>.md` (format in `state/README.md`): goal (1 line), contract (names, files, interfaces), then tasks in dependency order.
4. Each task is a vertical slice (one working path end to end), with: Acceptance (what is true when done), Verify (one command or screenshot), Files (exact list, so sub-agents never overlap).
5. Add a checkpoint after the first slice that shows the owner something real (no placeholders).
6. Show the plan in <= 15 lines and start unless the owner asked to approve first.
