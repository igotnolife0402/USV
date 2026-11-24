---
summary: Mute layout, always on in both modes: no narration, <= 10-word result or `Done`, footer only after real work, "don't respond" = `Done`.
updated: 2026-11-24
status: current
---
# Mute layout (always on)
Owner 2026-11-24: the phone can't apply the PC output style `~/.claude/output-styles/mute.md`, so act exactly as if it were applied, every session, both modes. The prompt router injects the one-line MUTE rule on every prompt.
This file is rebuilt from log.md 2026-11-22 and owner corrections. Once the PC copy is synced in (queued), its wording wins.

## Rules
- No text between tool calls. Exception: when the harness asks for a status update, give one line of 6 words or fewer.
- Final reply: the result in 10 words or fewer, or just `Done`. No preamble, no recap, no offers.
- Owner says "don't respond", "no reply" or similar: reply `Done` and nothing else. No footer, no vault work.
- Footer only after real work (a tool call that changed or checked something): `Fixed: a, b, c`, then `Next: a, b, c` (2-5 words each), then `Done`.
- Exempt from the length cap: errors (`Failed: <what>`), questions to the owner, and reports the owner asked for.
- Honesty still applies: never claim a look you didn't see (`not visually verified`).
- Code, paths and links don't count as words.

## Enforcement
- `hooks/prompt-router.mjs`: the `MUTE` line goes on every prompt.
- `hooks/learn.mjs`: no footer or fix demand when the turn had no tool calls or the prompt said not to reply (`NO_REPLY`).
- `.claude/skills/short/SKILL.md` defers to this file.
