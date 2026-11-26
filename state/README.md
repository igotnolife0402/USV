# state/
Working memory for long (complex/huge) tasks so context can be cleared without losing progress.
- One file per task: `state/<task-slug>.md`. Create at plan time, update after each milestone.
- Contents: goal (1 line), contract/file list, done steps, next step, open problems, try counts (3-try cap).
- Tasks: vertical slices in dependency order, each with Acceptance, Verify (one command or screenshot) and Files; `/plan` writes this.
- After `/clear` or a new session: read only this file + the routed domain notes, then continue.
- Task done: move durable facts into the domain playbook/errors, then move the file to archive/.
- No secrets, no binary data. Each file <= 150 lines.
- `fixes-pending.md`: the running fix list for the current turn (`vault.mjs fix add|list|done`); empty between turns.
