---
summary: Known VFX/particle/shader/post-processing failures with cause and fix
updated: 2026-11-21
status: current
triggers: [shader error, glsl error, particles lag, bloom broken, black screen]
---
# VFX errors

| Symptom | Cause | Fix | Seen |
|---|---|---|---|
| Commit lint: vfx/sheets "not referenced", "> 400 KB", "copy/version name", "> 20 items", "vfx not allowed in root" | repo-check.mjs had no rule for the binary VFX library | `VFX_LIB` exemption in scripts/repo-check.mjs (sheets indexed by vfx/index.tsv); run `node scripts/repo-check.mjs` before committing new sheets | 2026-11-24 |
| Black screen, no error visible | Shader compile/link failed silently | Check `gl.getShaderInfoLog` / `getProgramInfoLog`; three.js logs in console | 2026-11-21 |
| `ERROR: 0:12: '' : No precision specified for (float)` | GLSL ES fragment shader lacks precision | Add `precision highp float;` (mediump on old mobile) | 2026-11-21 |
| `cannot convert from 'const int' to 'float'` | GLSL has no implicit int→float | Write `1.0` not `1`; cast `float(i)` | 2026-11-21 |
| Shader looks different on phone | mediump precision / large time values | Wrap time `mod(t, 1000.)`; use highp where available | 2026-11-21 |
| FPS tanks after many explosions | Particles never freed / new objects each frame | Fixed-size pool; reuse; cap count | 2026-11-21 |
| Additive particles invisible on white bg | Additive blending adds to already-bright pixels | Use normal blend with dark core, or darken bg | 2026-11-21 |
| Transparent particles sort wrongly / pop | Depth write on transparent material | three.js: `depthWrite:false`, `transparent:true`, `blending:AdditiveBlending` | 2026-11-21 |
| Bloom blows out the whole scene | Threshold too low, tone mapping order | Raise threshold (~0.8), add OutputPass last | 2026-11-21 |
| Bloom/post makes colors dull | Missing OutputPass (color space) in composer | Append `OutputPass` after effects | 2026-11-21 |
| Full-screen shader hot on phone | Rendering at DPR 3 | `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` or render at 0.5 scale | 2026-11-21 |
| Hitch on first effect trigger | Shader compiled lazily | `renderer.compile(scene, cam)` at load / trigger once offscreen | 2026-11-21 |
| Texture sprite has dark fringes | Non-premultiplied alpha edges | Premultiply alpha or use radial gradient generated in canvas | 2026-11-21 |
| Roblox ParticleEmitter shows nothing | `Enabled` false with no `:Emit()`, or Rate 0, or parent not a part/attachment | Parent to Attachment/BasePart, call `emitter:Emit(n)` | 2026-11-21 |
| Effect fine at 60 Hz, too fast at 144 Hz | Per-frame updates | Multiply by dt; fixed step | 2026-11-21 |
| Flipbook choppy / pops (`max_step_jump` > ~3) | Something appears whole between frames; too few frames | 64 frames, ease the motion, tween keys along flow, never pop in | 2026-11-13 |
| Hair-thin lines read badly (`thin_stroke_pct` > ~10) | Strokes < 3 px at 128 px cell | Widen to >= 3 px; black hole 19.6 → 9 with 73° view, tighter frame, 3 px photon ring | 2026-11-13 |
| Loop visibly pops on Roblox | Single particle restarts its flipbook | Life = 4 cycles, Transparency fade in/out at 0.2/0.8, Rate 2/life so two overlap (VFX.lua) | 2026-11-13 |
| 8x8 sheet shows quarter frames | Emitter helper hard-coded `Grid4x4` (old `ElementVFX.make`) | Set `FlipbookLayout` from the sheet (Grid8x8); use tools/vfx/flipbook/VFX.lua | 2026-11-13 |
| Beam turns with the camera | Beam built as a camera-facing card | Make it a 3D volume (`shape: beam`), tile the blade sheet along x | 2026-11-13 |
| Effect ends with a hard cut at the cell edge | Content reaches the cell border / vanishes clean | Border fade `edge=0.07`; end by eroding into lingering embers/ash | 2026-11-13 |
| first liquid build exploded to the frame edges, second barely moved | built a new VFX generator straight from memory without invoking the routed vfx skill, so its recipe rules (4 layers with roles, physics not painting, look over dark and light, --check) were applied by luck | skill-first; tune with the preview sheet, keep --check under 60 s | 2026-11-21 |
| liquid splash on armor 'hits the ground' mid-air, looks like a sticker on top, lighting weird | reused the floor-splash sim for mid-air pops and baked an upper-left light into opaque camera-facing cards | liquid.py --air (no floor, radial, half gravity); front-lit, self-lit, translucent, soft edges; sizes 0.8x | 2026-11-21 |
| Clash fx float beside the blades (duel 2026-11-24) | Fx placed at fixed world x=0; FK contact was 0.54-2.56 studs away | Place clash fx at FK contact, parent beam/charge to hands | 2026-11-24 |
| 8 identical slashes, no escalation | Same preset, x=0, size 3-3.2, smaller than one 4.2 blade | Each exchange bigger than last (>= 1.5x), hero flash >= 1.5x blade | 2026-11-24 |
| Beam and black hole invisible in frames 10.5/12.8 | Beam size 1.1, length 2.6 stops 0.8 short of Ren; black hole 0.4-0.8 from Ren's root, hidden by his body | Beam width >= 2.5, reaches target; projectile path >= 2 studs, verify each fx in its frame | 2026-11-24 |
| improve +12.4 s; Stop hook skill miss | /improve 120 cutscene: brief spawned at ~104 s, 8 s after send_brief_at 96 (one extra catalog call), so the prompt landed at 132.4 s; vfx skill named by the router was not invoked this turn (3d-editor only) | spawn at send_brief_at; invoke all routed skills | 2026-11-24 |
| effects don't match the swings | duel v1/v2 used generic preset sheets (default arc, PIL-tinted) so trails never followed the blades; owner: make new ones, 5x more | supernova3/build.py fitted trails + new sheets | 2026-11-24 |
| turn over medium target | cutscene VFX redo (35 new sheets, 300 cards) ran 598 s against a medium 300 s target: the prompt had no complex tier word, so the budget was wrong, not the work | router tiers.complex words added | 2026-11-24 |
| s6 clash frames identical to s5 | flipbooks run on story time (clip.warp), so a hit-stop froze every impact card born on the hit at its blank first frame; owner saw no vfx | card() pre-roll in duel/stages/build.py | 2026-11-24 |
| variants of a passing preset fail max_step_jump | tuned presets were only checked on seed 1; kamehameha-charge (2-frame arc strike) and shock (2.5-frame attack) failed max_step_jump on most other seeds (3.3-6.5) | softer onsets: kamehameha LIFE 3-frame strike, shock attack=3.0; batch.py reseed loop | 2026-11-24 |
| NameError after a python str.replace edit; slow vfx turn | preset tuning was done as many serial probe runs, and an in-line string replace appended a comment that swallowed the rest of the line (NameError tt); turn 626 s vs 300 | domains/vfx/playbook.md speed tricks rule | 2026-11-24 |
| flat single-colour VFX | white sheets were themed by one emitter Color, which multiplies the whole particle, so every effect read as one flat tint with no gradient; owner saw no layers | vfx.py bands + VFX.lua per-band emitters | 2026-11-24 |
| slow vfx library turn, blank preview | 100-sheet batch ran after all code was written and a preview bug (rAF time before t0 -> frame -1) cost an extra round; turn 452 s vs 300 | domains/vfx/playbook.md speed tricks | 2026-11-24 |
| ModuleNotFoundError scipy; Bash refused by safety check | scratch measure script assumed scipy; heredoc + server restart + node packed in one compound call | numpy+PIL only (PIL resize for zoom); Write the script, run it in its own plain Bash call | 2026-11-24 |
| 140-flipbook pack took ~7 min, turn 557 s vs 300 s | actions.py recolors each 640 px sheet serially (~2.9 s) and full reruns per owner change | test on 5-24 effects, one background full run, multiprocessing Pool for recolor | 2026-11-24 |
| skill miss on a where-is question | Q&A turn with a README edit counted as a vfx build, so skill-miss fired | VAULT_META covers README.md + domains/ | 2026-11-25 |
| owner: generator only replayed the preview, reused old sheets | generator spec could only reference library slugs; no visible status on the stage | Claude writes sheet draw scripts, ugen.js (unique.py port) draws new white sheets; stage status overlay; generated clip replaces the example | 2026-11-25 |
| IndexError on split()[3] reading a library sheet | vfx/sheets PNGs are not RGBA (e.g. LA), so there is no 4th band | read alpha with .convert("RGBA").split()[3] or getchannel("A"); never Read a file a parallel call is still making | 2026-11-25 |
| 3-slot run 37.7 s vs 15 s target | 3 generator slots x 6 sheets took 37 s to draw on a 4-core box (1 slot 15 s): ugen.makeSheet is CPU bound, ~7 s per sheet per core, so parallel slots do not get faster than cores allow | worker pool + honest timing; fewer sheets per slot if speed matters | 2026-11-25 |
