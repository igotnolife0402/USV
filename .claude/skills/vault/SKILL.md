---
name: vault
description: 'Use whenever you need the vault: how to do X (find), what a request routes to (route), vault health (status), or adding trigger words (words). Runs scripts/vault.mjs so the exact notes, checklist and skill are named, never guessed.'
---
# /vault — talk to the vault

One command per need. Run from the vault root (in other folders use the absolute path the hooks print).

| Need | Command | Then |
|---|---|---|
| How do I do X / what does the vault know | `node scripts/vault.mjs find <words>` | Read ONLY the listed paths (hits give file:line; read that range). |
| What will this request load | `node scripts/vault.mjs route "<the request>"` | Open the checklist; invoke every listed skill with the Skill tool before building. |
| Vault health | `node scripts/vault.mjs status` | Fix lint errors first; promote listed lessons; mention open queue items. |
| A request should have routed somewhere | `node scripts/vault.mjs words <route> <word...>` | Clashes print instead of being added: pick a more specific word. |

Rules
- Never guess a vault path: `find`/`route` print real ones. Never bulk-read folders.
- A skill named by `route` (or by the prompt hook) is mandatory for medium/complex work: invoke it first. Skipping it triggers the Stop hook's skill-miss check.
- Lessons and PC steps have their own skills: `/learn`, `/queue`.

## Mobile
Same commands: the CLI is plain Node and runs in phone cloud sessions.
