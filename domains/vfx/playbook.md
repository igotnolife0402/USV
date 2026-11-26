---
summary: Fastest proven path to punchy, performant VFX: layered particles, shaders, bloom; PC screenshot-verified, mobile Artifacts
updated: 2026-11-26
status: current
triggers: [particles, shader, explosion, glow, bloom, vfx]
---
# VFX playbook

## Pick the tool
| Need | Use |
|---|---|
| 2D hits, sparks, dust | Canvas 2D particle pool, `globalCompositeOperation='lighter'` |
| Thousands of particles / 3D | three.js `Points` or InstancedMesh, GPU-updated in shader |
| Full-screen backgrounds, distortion | Fragment shader on a full-screen quad (raw WebGL or three.js) |
| Glow | three.js `EffectComposer` + `UnrealBloomPass`; 2D: additive + blur sprite |
| UI/CSS effects | CSS transforms, `filter`, `@keyframes`; no JS |
| Roblox | ParticleEmitter, Beam, Trail, Attachment; see [roblox](domains/roblox/index.md) |

## Anatomy of a good effect (layer these)
1. Anticipation (0-50 ms): flash or scale-up.
2. Core burst: bright, fast, short life (100-300 ms), additive.
3. Secondary: smoke/debris, slower, normal blend, gravity + drag.
4. Residue: embers/decals fading 0.5-2 s.
5. Camera: shake 4-10 px decaying, hit-stop 30-80 ms, optional chromatic flash.
Curves: size and alpha over life via ease-out; color hot (white/yellow) → cool (orange/red → gray).

## PC (/pc)
1. Build the effect in an isolated test page `vfx/<name>.html` with a trigger key and an FPS readout.
2. Serve, open with chrome-devtools-mcp/playwright-mcp, trigger, screenshot at peak (~100 ms) and decay; console clean.
3. Performance trace (chrome-devtools-mcp) for heavy effects: frame time ≤ 16 ms with 4x CPU throttle.
4. Integrate into the game/site; re-screenshot in context.
5. Roblox: build via Studio MCP run code (ParticleEmitter props), play, `look`/console check.

## Mobile fallback (/mobile)
- No browser automation or local files. Build the effect as an Artifact (tap to trigger) so the user sees it on the phone; save to `vfx/<name>.html` in the repo.
- Artifacts: no external textures; generate sprites on an offscreen canvas (radial gradient) or in-shader (smoothstep circles, noise).
- Shader errors are invisible without a console: log `gl.getShaderInfoLog` to an on-screen `<pre>`.
- Queue PC checks in [queue/pc.md](queue/pc.md), e.g.:
  `- [ ] 2026-11-21 perf trace explosion at 4x throttle, screenshot peak — vfx vfx/explosion.html`

## Quality bar
- Readable at a glance: clear silhouette, value contrast vs background, max ~0.5 s for gameplay hits.
- 60 fps on mid phone; particle cap enforced (pool), DPR capped at 2 for full-screen shaders.
- Respects `prefers-reduced-motion` (reduce shake/flash); no full-screen flashing > 3 Hz.
- No allocation per frame in update loops; no shader compile hitch at first trigger (warm up).

## Speed tricks
- Headless generator checks (L-206): run `check7.cjs` (streamed mock, `TYPES=`, `FIRST=1`) with run_in_background, no grep|head filter on its output; wait with one `timeout N bash -c 'until [ -s F ]...'`. Edit the .cjs with python/Edit, never sed -i.
- Hub generator speed (owner 2026-11-26: 30-45 s, goal 15 s, L-205): effort low, minified reply with "sheets" first, 4-6 sheets / 8-16 fx, ~1 kB SKELETON instead of the 8 kB example; sheets draw while the reply streams (`earlyDraw`, same genKey); paint/timing/life faults fixed in code (`repair`, `fixLives`) instead of a fix round. Type select: consistent = gameplay (identity warp, real time, first fx at t 0, story shifted), cinematic = build-up + slow-mo.
- Simple reel tweaks (default style, a ramp, a shot param; L-217): one edit, then ONE frame through `reel-capture.cjs . OUT styles` or the reel.test route (never a fresh file:// script), commit with the pre-commit lint only (no extra lint/test run); target 60 s.
- Diagnosing a hub generation (L-210): read hub db `vfxruns` (prompt, settings, full reply) first, never rebuild the clip; a headless repro mock returns one fixed spec (no fix rounds), so pre-fix gate faults (jump >= 3) in it before running; hub publish refused as "newer version": read the live generator file, diff vs HEAD, equal → publish again.
- Editing generator.html (L-208): before adding a top-level const/function, `grep -nE "(const|let|function) <name>\b"`; collisions (e.g. `cap`) only show at `node --check` and cost a pass.
- Generator repairs (owner 2026-11-26, L-211): `repair` fixes colour (`fixColors`: element hue family, colour word wins, stops within 35 deg), off-prompt elements (OFFSCOPE: rise, flames, bubbles, petals, bolt, zigring) and reactions (`reactRepair`: dissolve/char/freeze tracks, hole/cut/scorch/burn/crack/frost marks, test target/dummy when nothing is hit). Reaction regexes need word bounds (`char` hit "character"); repair must fill every field validate reads (sheet names). Headless check: `check10.cjs` with `PROMPT=` prints marksAt/dissolveAt/ramp hues.
- Painted-clip renders (2026-11-25, L-204): lint the spec with generator `paintCheck` rules (own ramp + tex per layer, only core ends #ffffff) BEFORE the ~25 s build+MP4 render, so one render passes; a rule missing on main: `git log --all --grep <L-id|word>` across origin/claude/* first.
- Library rebuilds (100 sheets ~115 s): start `batch.py` in the background the moment the code passes a 3-family smoke run (`--only shock,glints,explosion`), then write the preview/Lua/docs while it runs; preview loops: clamp `now - t0` at 0 (the first rAF time can precede t0 and index frame -1) (2026-11-24).
- Previews of Roblox emitters emulate the emitter, never a loop of staggered restarts (owner 2026-11-24: "just blinking"): particles born every 1/Rate, frame = OneShot age/Lifetime*64 or Loop age*FlipbookFramerate, linear Color/Transparency keys exactly as VFX.make writes them; one-shots play as Emit(1) every Lifetime. Check: `window.previewTime` sweep, loops 0 alpha jumps > 25 %.
- Animated previews render on the GPU (owner 2026-11-24: "flickering every 0.1-0.2 s" = CPU pixel loops at 7-17 fps on the phone): one sheet texture, bands cut in the fragment shader, sky drawn in GL on an opaque canvas (no colour>alpha compositing), `<meta name=viewport>`; check real time with Playwright Pixel 7 + CDP CPU throttle 4: fps >= 55, dt max <= 70 ms. Deterministic `previewTime` checks never show frame rate.
- One WebGL context per page, shared by all cards (render, then `drawImage` into each card's 2D canvas): phones cap live contexts and drop the oldest = frozen stills (owner 2026-11-24). try/catch per card inside the rAF tick so one throw never ends the loop; reduced motion = half speed, never a still. Check: Playwright iPhone 13 + Pixel 7, throttle 4, reducedMotion reduce: 1 context, every on-screen card changes over 2 s.
- Band layers cut from one sheet keep ONE Size (VFX.lua SIZE all 1): a per-band scale misaligns the cuts and the sky leaks at every edge (light down to 24%, dark rings). Preview canvases render at CSS width x min(DPR,2) from full 1024 sheets and step down only when fps < 45 (2026-11-24).
- Impact sheets must carry light past the flash (owner 2026-11-24: "I only see the first 0.1 s"): shock/crystal-burst/glints lost 75 %+ of sum(L*A) within 10 of 64 frames. `vfx.white` runs `sustain()` (per-frame gamma, light >= peak*(1-0.65p)); one-shot Transparency only tails (0.9-0.2f -> 0.15+0.35f). Measure light per frame, not alpha mass: alpha stayed 50-90 % while the light was gone.
- Flipbook preset tuning: sweep params x seeds in ONE pooled script that prints max_step_jump per combo (2026-11-24: 6 serial probes cost ~4 min); edit a code line by replacing the whole line, never by appending a comment mid-line (it swallowed `; tt = ...`).
- New ugen sheets in bulk (2026-11-26, L-214/L-215): check every new name against `vfx/index.tsv` before drawing (`grep '^gen-<name>\b'`), clash → rename the script; write curves linear/accelerating with ramped-in elements (an ease-out hold then a pop fails jump); `node tools/vfx/showcase/gen/draw.mjs --dir SCRATCH a.js b.js ...` draws all in one browser (~1 s/sheet); put the full art prompt in a `// PROMPT:` header line.
- One generic emitter `{rate, life, speed, spread, gravity, drag, colors, size}` + presets beats bespoke code.
- Additive blending makes anything look 2x better on dark backgrounds.
- Value noise / fbm in shader covers fire, smoke, water, clouds.
- Reuse snippets in [snippets](domains/vfx/snippets/README.md).

## Done
Run [checklists/vfx.md](checklists/vfx.md). Add new failures to [errors](domains/vfx/errors.md).

## Quality tricks (liquid, 2026-11-21)
- Shade every liquid layer, droplets included: normal from the density gradient, a broad + a sharp specular (`^40` and `^400`) and a fresnel rim `(1-n.z)^2` in the emissive colour. Flat-coloured drops read as blobs.
- Normalise splat density by blur width (`w*w`) so one droplet clears the surface threshold at any cell size.
- Thick flat pools need detail: add fixed (not per-frame) noise to the height before the gradient, or they flicker.
- Flipbook cards in a 3D scene: never bake a side light (it fights the scene light as the camera turns); light from the camera, mostly emissive, thin parts translucent, soft alpha edges. Physics must match where it plays: a floor bounce only on the ground (`liquid.py --air` for bodies/mid-air).
- No overkill: effects mark the one big moment (all done) or run small and subtle throughout; never a big burst on every step (each armor piece, each hit). Owner rule 2026-11-21, applies to all builds.

## Cutscene VFX (owner 2026-11-24)
- Never reuse preset sheets or recolour them in PIL: every effect is a fresh `vfx.py` recipe for the shot, coloured by `element=` per fighter (Ar cyan, Li crimson, Na white-gold).
- Swing trails are traced from the real blade-tip path (fk.py), split until each arc is planar (< 0.1 stud), one sheet + flat card per arc (`tools/3d/avatar/duel/supernova3/build.py`).
- Density: ~300 cards / 20 s (6x v2), <= 40 sheets; cover > 60 deg/frame pose snaps with 3-frame spark cards.
- Library rule (owner 2026-11-24): every VFX generator run ends by adding its white sheets to the repo folder `vfx/` (`tools/vfx/library.py`, add the set to `SRC`); find effects by grepping `vfx/index.tsv`, never by opening sheets; colour only at use time per [vfx/README.md](../../vfx/README.md).
- Hub republish refused as stale (L-212): if the live page equals local `tools/hub/index.html`, the first resend is refused as identical by design; send the same publish once more and it goes through. Copying a harness: grep the exact string first, never guess it.
- Showcase / reel requests (2026-11-26): copy `tools/vfx/showcase/reel.html` SHOTS (one shot = 1 s now, 3-6 layers, own ramp + tex each, `size`/`aggr` 1-5 drive meters, shake, push-in, light pool); check with `reel-capture.cjs . DIR peaks` (20 frames) and fill any shot whose second half is empty (double strike) before the 600-frame MP4; start that capture in the background at once (~2 min) and do upkeep while it renders (L-213). Default outline = rim (owner pick 2026-11-26); headless checks go through the reel.test route like reel-capture.cjs (file:// fails: sheet fetches 404).
