# tools/vfx

Self-contained VFX generators ported from the old vault. Outputs go to a scratch folder (never into the repo); commit only scripts.
Domain notes: [vfx index](../../domains/vfx/index.md), rules for the flipbook: [domains/vfx/flipbook.md](../../domains/vfx/flipbook.md).

| Tool | Does | Run | Needs |
|---|---|---|---|
| [flipbook](flipbook/README.md) | Roblox flipbook sheets from physics (fluid sim, ray-traced black hole, kamehameha, lightsaber, slash/embers/flame-arc/dragon, shock/glints); 64 frames, 1024 px Grid8x8, `--check` prints `max_step_jump`, `thin_stroke_pct`, seconds (fails > 60 s) | `python3 tools/vfx/flipbook/vfx.py OUT <preset\|recipe\|a+b+c+d\|all> --check` | python3, numpy, Pillow |
| [liquid](liquid/README.md) | **VFX Generator**: liquid simulation as 4 stacked layers (mist, body, drops, glow) for poison/water/blood/slime/lava; ~2 s; import into Umbrio Sandbox | `python tools/vfx/liquid/liquid.py OUT <preset> --check` | python, numpy, Pillow |
| [shots/shoot.cjs](shots/shoot.cjs) | Headless Playwright frames of a deterministic three.js VFX page (`?t=`), local three for the blocked CDN, exit 1 on any console/shader error | `DEPS=<scratch>/deps/node_modules node tools/vfx/shots/shoot.cjs tools/vfx/crimson-beam/crimson-beam.html OUT 0.8,1.6,3,6.5` (serve repo on :8765) | playwright, npm three@0.186.1 in scratch |
| [VFX.lua](flipbook/VFX.lua) | Luau: `VFX.make(id, part)` turns a `VFXLibrary.lua` entry into a ParticleEmitter (loops overlap 4 cycles with fade so they never pop) | require beside the generated `VFXLibrary.lua` | Roblox |

Checked 2026-11-21: `vfx.py OUT slash --check` builds in 1.4 s, max_step_jump 1.41, thin_stroke_pct 1.2.
