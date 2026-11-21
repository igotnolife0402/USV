---
summary: Durable owner preferences and quality floor for every build, both modes: honesty, scope, detail, originality, phone-first, proof.
updated: 2026-11-21
status: current
triggers: [owner, preference, preferences, quality, detail, polish, style, taste, reference, references, standard, standards, honest]
---
# Profile: owner (applies in pc and mobile)
Mode-free rules: they hold on both devices. The owner's latest word beats any stored copy (this file included): update the line it contradicts in the same task.

## Honesty and replies
- Never call something done unless it was checked. Not done → `Failed: <what>`; gave up = failed.
- Exception: a fallback exists (mobile, or a missing MCP) → do it and report "done on mobile, PC step queued" ([profiles/mobile.md](profiles/mobile.md)). That is not a failure.
- Never claim a look you did not see. No screenshot possible → say "not visually verified" and queue the visual check in [queue/pc.md](queue/pc.md).
- Replies: short (aim 10 words or fewer). Errors, questions and requested reports are exempt.

## Quality and scope
- Maximum quality by default, expert-level, matching the owner's references; all effort up front.
- No placeholders or blockouts: every part is added at full detail; never show a stand-in draft to "fill in later".
- Scope = what was asked. A model is only that model: no ground, scenery or props unless asked. A named theme (e.g. "grassy meadow") is built first, everywhere the camera sees.
- "Build me X" means the built thing in the target tool (Studio, editor, page), not code that describes it, unless scripts are asked for.
- Asked to go faster: offer only lossless speedups (parallel work, fewer reads, reuse, batched fixes). Never silently drop a requested feature or check; over budget → ship the working subset and list exactly what is left.
- Judge by an outside check (script, measurement, screenshot), pass/fail. No self-scores or 1-12 ratings.

## Visual taste (3D, scenes, UI)
- Detail on everything: broken-up faces, chips, small variation. No flat or plain surface.
- Never one flat colour per material: darker low and in recesses, lighter high and on up-facing faces, a few related hues in bands.
- Natural over artificial: no perfect symmetry or even repetition; vary size, spacing, rotation.
- Rocks read as fractured stone (flat cleaved faces, sharp edges), never spheres or blobs.
- Borders and walls are unclimbable and hide everything past them.
- Original only: never clone a real game, brand or logo. No AI giveaways (generic UI, mixed art styles).
- Before any UI or hero build: collect or generate references, decide palette + layout (+ type for UI), show them, then build only from them.
- Domain numbers live in the domain playbooks: [3d](domains/3d/playbook.md), [roblox](domains/roblox/playbook.md), [vfx](domains/vfx/playbook.md).

## Phone-first (players and the owner use phones)
- Check on phone conditions, not just desktop: UI text >= 14 px and taps >= 38 px at 844x390; no UI overlaps or clipped text.
- No z-fighting: phones resolve depth coarsely, so stacked or coplanar surfaces flicker even 4-12 cm apart. A clean desktop render proves nothing.

## Live builds and test helpers
- When the owner watches a live target (Studio place, editor tab), build in it from the first step, in batches per stage (not one write per part); verify by reading the target back, not local files.
- Test helpers (a projectile, a probe) are marked temporary and never exported or shipped.

## Storage
- Keep one best version; a better version overwrites the same piece, never a different one. No `v2/old/copy/backup/draft` names.
- Generated outputs: commit the generator, not the output.
