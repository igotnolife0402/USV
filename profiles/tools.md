---
summary: Registry of the owner's tools and artifacts (name, where, how). Check first; anything the owner teaches is added the same turn.
updated: 2026-11-21
status: current
triggers: [artifact, sandbox, generator, my tool, tool, app, launcher, monitor, customizer]
---
# Owner's tools and artifacts

Find a named tool: 1) this table; hub tools are tiles INSIDE Claude-Hub (its index.html `T` list: name, entry), not separate gallery items (fuzzy: words in any order, typos) → 2) `Artifact` list with scope `all`, match title words → 3) only then ask the owner for the link ONCE, and add it here the same turn with `node scripts/vault.mjs tool add`.
Taught a new tool (owner explains or shows it): add it the same turn. Never ask twice for something in this table.

| Name | Kind | Where | How to use | Added |
|---|---|---|---|---|
| Claude-Hub | artifact | https://claude.ai/artifact/Bz8SnAVkhjyXgk79t8eadF | Pinned hub; hosts the Studio web 3D editor (tools/3d/studio) and art styles | 2026-11-21 |
| Ember VFX Studio | artifact | https://claude.ai/artifact/Fu7Hx25z9ELLUDBhJCp1pX | VFX authoring studio | 2026-11-21 |
| Rig Studio | artifact | https://claude.ai/artifact/7tcLRkPmoGFoZDKQ6t2yB3 | Character rigging and animation | 2026-11-21 |
| Character Customizer | artifact | https://claude.ai/artifact/D9YZTAbRkZdJM6B1wrMGBr | Avatar/outfit customizer | 2026-11-21 |
| Thumbnail Studio | artifact | https://claude.ai/artifact/K2wNPSMCxtxVCp58k8hJx3 | Roblox thumbnails | 2026-11-21 |
| Paint Studio | artifact | https://claude.ai/artifact/PM2jmNZ9UNSTdgQ7Dc2MDh | Texture painting | 2026-11-21 |
| Forge Launcher | artifact | https://claude.ai/artifact/9kvWcrbCkYc9JDcDe3XKyh | Launcher for forge tools | 2026-11-21 |
| World Border Kit | artifact | https://claude.ai/artifact/DaV55vckqZR9SbHnsKznth | Map border kit | 2026-11-21 |
| Vault Upgrade Atlas | artifact | https://claude.ai/artifact/KPFvUvTN12cLGupjDgVBPH | Vault research and blueprint | 2026-11-21 |
| Umbrio Sandbox | hub tool | https://claude.ai/artifact/Bz8SnAVkhjyXgk79t8eadF (Claude-Hub tile; entry tools/3d/studio/index.html) | The Studio 3D builder (parts, meshes, animation, textures, VFX plugin, export). Code = tools/3d/studio; edit there and republish the hub | 2026-11-21 |
| Styles | hub tool | https://claude.ai/artifact/Bz8SnAVkhjyXgk79t8eadF (Claude-Hub tile; entry tools/art/styles/index.html) | 20 image-style prompts + add-ons | 2026-11-21 |
| VFX Generator | cli | tools/vfx/liquid (local, python liquid.py) | Liquid-sim VFX, 4 stacked layers, ~2 s; import sheets into Umbrio Sandbox. Built 2026-11-21 because the owner's VFX generator link was not found | 2026-11-21 |
| VFX Library | repo folder | vfx/ (vfx/README.md) | Every white VFX sheet: `vfx/sheets/<slug>.png`, grep `vfx/index.tsv`; painting rules in vfx/README.md. The old hub artifact Bz8SnAVkhjyXgk79t8eadF is retired (owner 2026-11-24). |
| VFX Prompt Generator | artifact | https://claude.ai/artifact/Bz8SnAVkhjyXgk79t8eadF (Claude-Hub tile vfx generator; repo tools/vfx/showcase/generator.html) | 1-6 slots, Generate all fires every Claude call at once (Opus 5.5 medium via sample model/effort, needs runtime 0.2.99+); per slot: prompt, exact length 0.5-14 s (fitDuration rescales the warp, integer ms), style/hue/intensity/camera/loop/seed+lock/background, 60 s cap, timer, spec.json; sheets drawn in a worker pool (lib/ugen-worker.js). Draw is CPU bound: ~7 s per sheet per core | 2026-11-25 |

Hub republish rule (2026-11-25): a page that starts using a newer capability option (e.g. sample `model`/`effort`) is republished once with `contract: latest`; check the stored contract line in the publish result.
