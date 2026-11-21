# Old vault review (NEWEST-VAULT, commit c755904) — 2026-11-21

Five agents each rated one slice of the old vault, nitpicked it, and ported the good parts into this vault.

| Slice | Rating | Best thing it had | Worst problem |
|---|---|---|---|
| Rules & memory (CLAUDE.md, Learned.md, standards, guides) | 6/10 | Hard owner rules you can check; every lesson written as cause → rule | One-off project notes mixed into rules; Learned.md silently dropped lessons past 10 |
| Enforcement (hub.py, device.py, git hooks, CI) | 7/10 | One repo-wide gate: dead links, orphans, caps, junk names, tool isolation, self-test | 628-line script mixing gates with a launcher; fail-closed when Python was missing |
| Roblox (guide + tools/roblox) | 5/10 | Exact delivery format (.glb + Kit.rbxmx + sheet ids); validator with pass/fail fixtures | Guide had no Luau/Studio/MCP guidance; tools crashed on Windows paths |
| 3D, Studio, animation, images | 7/10 | Studio editor with a real test runner and speed caps; z-fight gate; precise mesh limits | Hardcoded cloud paths; suite was red when frozen (boot 840 KB > 800 KB cap) |
| VFX, skills, agents | 7/10 | `vfx.py --check` prints measured numbers; recipes over new code | Skill descriptions up to 880 chars that hijack simple tasks; links to files that never existed |

## What was taken (and where it lives now)
- Owner rules, taste and phone-first checks → `profiles/owner.md`, CLAUDE.md "Owner rules", `checklists/*`.
- Every old gate → `scripts/repo-check.mjs` (run by `vault-lint --all`, the Stop hook and CI), `hooks/pre-tool.mjs` (device guard, install allowlist, destructive-command guard).
- Roblox delivery, UI, game-design and map standards → `domains/roblox/{delivery,ui,game-design,maps}.md`; tools → `tools/roblox/` (+ new `rbxmx-check.mjs`).
- Studio editor and 3D generators → `tools/3d/` (studio, zfight, props, shatter, voxel, creature, beast, avatar, armor); notes → `domains/3d/studio.md`, new `domains/animation/` and `domains/images/`.
- VFX flipbook tool → `tools/vfx/flipbook/`; rules → `domains/vfx/flipbook.md`; 26 engineering skills and 4 reviewer agents → `.claude/skills/`, `.claude/agents/`.
- 26 old lessons → `lessons.md` (now counter-based, never auto-deleted).

## Not taken, on purpose
- Claude-Hub launcher and `hub.py html`, the one-off lobby project plan, five one-off 3D projects (cathedral, skylight, conemap, borders, bamboo — their lessons are in `domains/3d/errors.md`), human showcase images.
- "No prefix = chat only" mode (replaced by auto-detect + /pc and /mobile overrides).

## Known gaps carried over
- Studio test suite: 91/119 pass on this PC; failures are missing libraries (three-mesh-bvh, three-bvh-csg, mp4-muxer) and old code over its own caps. Logged, not hidden.
- No tool yet writes native Roblox formats from Luau; the lobby spec's spawn-clearance and walkability rules are still manual.
