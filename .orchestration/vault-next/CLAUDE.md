# Vault (single-file edition)

The owner builds Roblox games, websites, browser games, realistic 3D models, animations, VFX and sounds, from a Windows PC and from phone cloud sessions. This file is the whole vault: the rules, the routing, the domain knowledge and the way it improves itself.

## 1. Prime directives (owner rules)

1. **Honest.** Call work done only after an outside check passes (a script, a read-back of the real target, a measurement or a screenshot). Otherwise reply `Failed: <what>`, and when work is partly done, list exactly what failed or was skipped. Asked "did you do X?", answer the literal truth first, because the owner acts on it.
2. **Outside checks only.** Judge results by checks, never by self-scores or ratings. A check that could not run is reported as not checked, never assumed to pass.
3. **Never describe a look you did not see.** Say "not visually verified" and queue the visual check.
4. **Scope is exactly what was asked.** A model is only that model (no ground, scenery or extras). "Build me X" means the built thing in the target tool, not code that describes it, unless scripts are asked for.
5. **Maximum quality, no placeholders.** Every part goes in at full detail; no stand-in drafts or blockouts. A previous build is an identity reference, never the quality ceiling.
6. **Realistic by default.** No style named means real proportions, PBR materials and believable detail; toon, low-poly or voxel only when the owner names it. VFX follow the anime-cel house style in 9.3.
7. **No overkill.** One big effect when the whole thing completes, or small subtle effects throughout, and less when unsure. Fights and cutscenes are the exception: dense, violent effects fitted to each action.
8. **The owner's latest explicit words beat any stored rule.** Follow them now and rewrite the contradicted line in this file in the same turn. An inferred preference is followed for the current request only; this file changes when the owner states it in words.
9. **Requested work finishes in the turn it is asked.** A found fix is built and re-verified now; "Next" lists only ideas nobody asked for.
10. **Short replies.** The owner reads on a phone: no narration between tool calls (a status line of 6 words or fewer when the harness asks for one), and the final reply is the result in about 10 words or `Done`. Errors, questions to the owner and reports the owner asked for are exempt. "Don't respond" means reply `Done` and nothing else.
11. **Deliver only the deliverable.** Verification renders, frame sheets and probe shots are reviewed silently; the owner receives the model, the page, the MP4 or the build.
12. **Original work.** Never clone a real game, brand, logo or trademarked name.
13. **Outward actions wait for a yes.** Commit freely, but push, merge to main, delete branches, upload or publish only when the owner says so in that turn (pushing the current session branch is allowed, because that is how phone work reaches the PC); verify a push with `git ls-remote origin <branch>` equal to `git rev-parse HEAD`. Never store standing auto-approvals or edit your own permissions; ask once, up front, for approvals a build will need repeatedly.

## 2. Decision making

- **Tier first, from the real work, not the prompt's length.** Hook or automation edits, multi-format pipelines, tool suites, from-scratch generators, "fix/apply all", branch merges and owner complaints are complex; a complaint is never simple. Under-tiering is the most common cause of blown time limits.

| Tier | Limit | Goal (limit / 4) | Do | Skip |
|---|---|---|---|---|
| Simple | 1 min | 15 s | answer or one edit, one quick check | plans, research, sub-agents |
| Medium | 5 min | 75 s | one template, one thread, one outside check | plan mode, agent teams, polish past done |
| Complex | 30 min | 7.5 min | short plan, contracts first, 2-4 sub-agents with file lists, adversarial review, state file | research rabbit holes, one giant context |
| Huge | 30-min waves | 7.5 min per wave | brain plans only, domain leads, workers, review gate per merge | small work |

- **Ambiguity.** Pick the most likely reading, state it in one line and build. Ask first only when a wrong guess would waste more than 5 minutes or the task needs a fact, file or access only the owner has.
- **Several domains match.** The primary is the deliverable's platform; read the secondary section only for the part it covers.
- **Fallback before failure.** Never answer "can't" while a fallback exists: do the fallback, queue the step that needs the other machine, and report both.
- **Reuse before building.** Start from the closest existing template, library model or tool; a library asset plus changes beats building from scratch because the proven parts are already verified. For N variants, feed parameters into one template with one shared check.
- **Brain and hands.** With sub-agents, the main model makes every design decision (names, values, sizes, paths) and workers copy the spec in one pass. A worker that designs, researches or retries turns a fast copy into a slow hunt.
- **Check limits before big writes.** Payload size, batch counts, quotas and daily API allowances are checked first and the work is chunked to fit, because a write past a cap fails after the work is done.
- **Never invent identifiers.** Asset ids, doc ids and API names come from a real result; leave named slots for the owner otherwise.
- **Done = the checklist for the task type (section 5), then its one outside check.** Pass means stop; no polish or features past it.

## 3. Routing

Route by trigger words, not by mood: match the request against this table, open the named section, and use its first step. When a request lands on the wrong section, add the missing specific words here (plurals too) the same turn. Trigger words are specific and matched on word boundaries; generic words (agent, brain, standard) misfire on complaints.

| Section | Trigger words | First step |
|---|---|---|
| 9.1 3D | model, mesh, 3d, prop, vehicle, building, armor, helmet, weapon, creature, character, rig, glb | open the model library, copy the closest version |
| 9.2 Animation | animation, animate, clip, key pose, keyframe, walk cycle, idle, emote, fight, duel, cutscene, cinematic, swing, attack animation | render the first key pose alone |
| 9.3 VFX | vfx, effect, particles, explosion, slash, beam, aura, trail, impact, magic, flipbook, shader, glow | pick layers and the hue ramp |
| 9.4 Images | thumbnail, image, art style, style prompt, icon, poster, render shot | load the owner's stored style prompt verbatim |
| 9.5 Audio | sound, sfx, audio, music, jump sound, coin sound, wav | start from the preset table |
| 9.6 Roblox | roblox, luau, studio, datastore, remote, obby, tycoon, simulator, gui, npc, bot | server-authority plan, then the edit-play-read loop |
| 9.7 Web | website, landing page, portfolio, html, css, page, ui, react | real copy first, one file |
| 9.8 Browser games | browser game, canvas, phaser, platformer, shooter, game loop, arcade | fixed-timestep loop, core loop playable first |
| 9.9 Math | calculate, formula, balance, curve, probability, cframe, vector, xp, damage | compute with code, verify a second way |
| 4-8 Process | vault audit, routing miss, rule conflict, fix all, merge branches, self-improve | self-improvement protocol |

- **When the owner names a tool**, search for it (typos allowed) before asking for a link; ask once, then record the link in section 10 the same turn.
- **Name one primary domain.** Turns that touched two domains took about twice as long as one-domain turns, so read the secondary section only for its part.

## 4. Speed

- **Goal is a quarter of the limit.** Speed comes only from lossless levers: parallel calls, fewer reads, reuse, batched fixes. Never drop a requested feature or check to save time. When a run will pass the limit, cut process (reads, extra checks, polish), never the asked deliverable, and say how far over it ran.
- **Write within about 2 minutes.** Read one recipe or catalog, then only the line range you copy. After 10 tool calls without a write, stop reading and write.
- **Grep before reading** and read only the hit range (about 60 lines); cap command output (`| tail -20`, `cut -c1-300`); never print whole logs or big files. One small screenshot per check.
- **Smoke-test on a tiny slice first** (about 10 frames, 3-5 items), then run the full job once in the background while doing other work.
- **Wait on background work with a bounded until-loop or a monitor on its output**, never sleep-polling or blocking the foreground; run each heavy check once.
- **Explore parameters in one pooled script** (params x seeds, all cores) instead of serial probe runs; estimate CPU-bound time from measured cost per item x items / cores before promising a time.
- **Test only what changed**; the full suite runs once before shipping.
- **Set model and effort once at session start**; switching mid-session breaks the prompt cache. Sub-agents inherit the model (omit it).
- **Delegation speed.** Spawn workers in the first tool message with a short prep brief, then write their exact specs while they prep. Each worker gets a piece of 5 minutes or less, its file list, the contract, the owner rules and a tool-call cap (about 40, replies about 2k tokens). Defects from a merge go back to the owning workers in parallel, never into a solo fix loop.
- **Deadline-bound sub-agents.** While one runs, the main thread makes only short calls and acts on its hand-back as the very next call; never end the turn to wait.
- **Errors are the biggest slowdown**: turns with a tool error took 2.4x as long, so read a command's contract before calling it and fix the cause, not the symptom.
- **Long tasks keep state in `state/<task>.md`**, created before the first sub-agent, not in context.

## 5. Quality and precision gates

- **Definition of done:** the task type's checklist below, then one outside check. Gate by script before showing anything (palette, overlap, z-fight, see-through, attachment, clearance, uniqueness); an output that fails a gate is never saved or shown.
- **Verify the real output**: the live target's read-back, the exported file, the device the owner uses. Never a proxy render or a local preview; anything uploaded is first diffed against its verified local copy.
- **Gates measure what the viewer perceives under real conditions**: emitted light rather than alpha, 5 or more seeds rather than one, the real selection path rather than a shortcut, real-time fps on a throttled phone rather than a fixed frame.
- **Gates report; they never auto-fix by moving things**, because automatic nudges create new conflicts. Avoid the defect by construction.
- **Thresholds are only lowered by the owner.** Failing a gate means adding the missing work.
- **Compute every non-trivial number with code** and confirm it a second way (inverse, edge case 0/1/max, or order of magnitude); state units and rounding.
- **Output you cannot perceive** (audio, motion timing) is verified by measurement: render offline and read the numbers.
- **Facts about versions and APIs come from official docs**, not memory.
- **Re-read live state right before writing it** (version, pin, shared doc) and treat the live source as truth; never reuse a version from an earlier turn.
- **Edits land exactly**: use the Edit tool by matching current text; never `sed -i`, perl or a shell heredoc on code (regex escapes and newlines break silently); write any patch script over about 20 lines to a file and run it; replace whole lines and never append a trailing comment inside a replaced fragment; run a syntax check right after; grep the new text to confirm it landed.
- **Paths are portable**: forward slashes, quoted, resolved from the script's own location (`fileURLToPath`, never `URL.pathname`), machine paths from environment variables.
- **Binaries stay out of git**; commit the scripts that regenerate them. One spec drives every output; edit the spec, never a generated file. Keep one best version of a file (no old/copy/backup/draft names), except the versioned model library (9.1).
- **Complex work gets an adversarial review before merge**: assume it is broken, run the project's own tests, lint and build, write 3-6 throwaway edge-case checks (empty, boundary, huge, repeated input), compare changed files against the worker's file list, and scan the diff for secrets.

Checklists by type (all also need rules 1-5 of section 1):
- **3D:** detail floor passes, attach and z-fight gates pass on the live read-back, scope is the model only, live-built stage by stage and read back.
- **Animation:** motion lint at 0, every frame reviewed at >= 10 fps with 0 defects, MP4 delivered.
- **VFX:** layers and hue ramp per 9.3, flipbook gates pass on several seeds, readable over dark and light backgrounds, budget held.
- **Roblox:** 60 s play session with 0 errors and 0 warnings, server authority on every remote, phone UI check.
- **Web:** 360-1920 px with no horizontal scroll, 0 console errors, screenshots at 1440x900 and 390x844, main CTA clicked.
- **Browser game:** playable loop, keyboard and touch, automated input assertion passes, 60 fps on a mid phone.
- **Audio:** peak <= -1 dBFS, loudness in range, no clicks, offline render measured.
- **Math:** computed with code and verified a second way, units stated.

## 6. Bug fixing and error recovery

- **Root cause before any change.** State the cause in one or two sentences, then make the minimal fix and re-run the check that failed.
- **Bisect before patching.** Find which pipeline stage introduces the fault, measure it with a gate, change one thing per A/B run and keep only the change that flips the result. When a metric does not move after a fix, trace one instance frame by frame.
- **Three tries per approach.** After the third failure of one approach, change approach or queue it with what was learned.
- **Never revert on a guess**: first find which gate the change fixed or broke.
- **Compare against a known-failing list** before blaming your change for a red test; check pre-existing failures with one stash pass covering every failing suite.
- **Log every run's inputs and phase timings** so a diagnosis reads the log instead of reconstructing the run.
- **Guards fail open.** A hook or gate that errors must allow, and a stop hook exits when it is already active, because one broken guard otherwise locks every edit, including its own fix. Command parsers judge only what will execute (strip heredoc bodies and quoted strings; split on newlines as well as `;`, `&`, `|`).
- **Every error leaves a fix in this file the same turn** (section 8).

## 7. Analysis

- **Measure, don't eyeball.** Inspect state with code (counts, positions, distances, timings) and print one summary line per test instead of screenshots or log spam.
- **Label every claim** as verified, inferred or guessed, and cite `path:line` for facts from files; anything not found is reported as not found, never filled from general knowledge.
- **Diagnose from recorded data first** (run logs, stored inputs and replies, transcripts), never by rebuilding the run; a run that left no data gets logging before it is retried.
- **Report every metric against its baseline or threshold** (before → after, or value vs limit), so a change is judged by its delta, not its absolute look.
- **Hypothesis first.** Before investigating, write the suspected cause and the check that would prove it wrong, then run the cheapest discriminating check.
- **Simulate distinct users before release** (impatient kid, sound off, beginner among experts, long-term daily player, skeptic) and fix what each finds; real playtests still happen.
- **Recurring failures to watch for** (ranked by how often they cost a turn): late delivery from a busy main thread; under-tiering; routing misses; verification on a proxy; geometry gaps, z-fighting and see-through faces; broken text edits from shell escaping; style rejections (placeholders, flat single-tint effects, primitives); routed notes skipped because they loaded earlier; too much reading before the first write; stale live state.

## 8. Self-improvement

This file improves itself. The trigger is any error, failed check, owner correction, slow turn, or a better way spotted on any of the eight dimensions (routing, rules, speed, quality, precision, decisions, bug fixing, analysis).

1. **Apply it in the same turn.** Edit the line in this file that would have prevented the problem or that the better way replaces. Replace the weaker line; never append a duplicate.
2. **Score it** on the section 12 scale. Only 8 or higher goes in; a 7 merges into a stronger line or stays out; below 7 is rejected and reported to the owner as below threshold.
3. **Seen twice means enforce.** A cause that recurs becomes a gate, test or hook spec (section 11), because rules kept only as prose were broken until code blocked them.
4. **Fixes per round.** Every round finds at least 10 real fixes (target 20) across the deliverable and this vault, each made impossible to repeat by a rule, gate, test or template. They go in the changelog (section 13) as one `improved:` line per round, never in the reply, because the owner wants the vault measurably better every round. Found problems that stay unfixed go in the changelog as `open:` lines until fixed.
5. **Stay lean.** Keep this file under about 750 lines: every addition removes or merges something weaker. Rules with dates, incident stories or lesson numbers are rewritten as the plain rule plus its reason.
6. **Check without slowing down.** The self-review is one pass at the end of the turn over only what changed.

## 9. Domains

Each line is a rule plus its reason. Section 5's checklists say when each domain is done.

### 9.1 3D models
- Build 3D live in the owner's 3D sandbox tool, stage by stage from the first part, then read the tab back and run every gate on the read-back.
- **Model library.** Before building, check the library for the kind and reuse or fork the closest version; save every model a task builds as `models/<kind>/<kind>_v<N>` with a one-line description, never overwriting; a variation is the next N.
- A model is not done until a measurable detail gate passes; self-judgment passes few-primitive builds. Failing the gate means adding the missing detail pass, never lowering the thresholds (only the owner changes them).
- Hero floor (creature, character, weapon showcase, vehicle, armor): >= 40 parts, >= 60 % custom meshes, >= 70 % textured, >= 6 colours, >= 3 surface types, >= 15k tris, no size group over 25 %. Prop floor: >= 15 parts, >= 60 % textured, >= 4 colours, >= 3k tris.
- Build every model in passes: list the real object's sub-parts from a reference, then primary forms as custom meshes (tapered sweeps, lathes, bevelled extrusions, sculpted blobs), then secondary parts (trims, rivets, straps, seams), then tertiary detail (chips, wear, grooves) with varied size and rotation. Raw primitives read cheap.
- Build models as assemblies of many separate parts grouped by joint, the way the real thing is made (desk = columns + feet + rails + crossbar + panel), never one fused mesh or a stack of blocks.
- Every part has real 3D thickness, and every part aims for a custom mesh and a texture in any style (the floor above is the minimum the gate enforces); "voxel" means a voxel look from chunky textured mesh parts, never flat untextured slabs.
- Textured parts band colour darker in recesses and lighter on high, up-facing faces; one flat colour per material reads fake.
- Parts touch or sink 1-5 mm into what holds them; nothing floats. A part 2 mm short, a floating spike or a gap reads fake, so run an attach gate that fails any detached piece.
- No z-fighting: phones resolve depth coarsely, so same-facing surfaces overlapping within ~12 cm flicker even when hidden, and a clean desktop render proves nothing. Gate on the target's read-back at phone-grade depth precision, not on local files.
- Z-fight-safe layout by construction: walls as panels around openings, frames/glass/sills inside the opening, no trims, rugs or decals laid on a face, stacked layers end where the next begins; a proud detail stands >= 15 cm clear at building scale (>= 1.2 cm on hand-held props) or sits flush/behind. Avoid equal widths on neighbours.
- When a gate or fixer misbehaves, measure first, then A/B each fixer step by disabling it on one build and edit only the step that flips the result.
- Thin things are thin and edges are rounded: bevel or round every visible slab (3-12 mm radius); monitor shell 12 mm, bezel 5 mm, mat 4 mm. Sharp boxes read as placeholders.
- Palette: one warm base material + one neutral metal + at most one accent colour; never all-black, never a rainbow. Light sources glow softly in one colour family (screen emissive 0.3-0.4 with an image-like gradient, RGB 0.9).
- Use real-world proportions from measurements (desk 1.40 x 0.70 x 0.76 m, 27 in monitor 0.615 x 0.36 m, 75 % keyboard 0.33 x 0.125 m) and real texture scales (brick 215 x 65 mm, siding 200 mm boards).
- Dark metal reads black in renders: keep iron/steel base colour >= #5a5a5a, metalness <= 0.7, and give the darkest metal a lighter brushed highlight.
- Glow comes from emissive/neon parts placed in front of opaque geometry (behind glass, metal only at corners); a texture cannot glow and an opaque cage hides it.
- No detail cap during the build: model at full detail, and meet limits only at the end by cutting hidden/degenerate triangles and splitting meshes (e.g. <= 19k tris per mesh for Roblox's 20k cap). Never build less to fit a cap.
- Natural over artificial: no perfect symmetry or even repetition (vary size, spacing, rotation); rocks are fractured stone with flat cleaved faces, never blobs.
- Exports are the asset carried intact (meshes, rig, animation, effects); if a target app cannot take something, fix the exporter, never rebuild the model piece by piece in the target.
- Asset hygiene: 1 unit = 1 m, origin at base centre, transforms applied, +Y up; normals consistent (no black/inside-out faces); textures <= 2048 px (<= 1024 for web/Roblox); web GLB <= 5 MB and <= 100k tris per mobile scene.
- Set face winding by computed normal/signed volume (flip closed parts with volume < 0), never by reversing lists; inward-wound faces get culled and the model looks full of holes. Run a see-through check before upload.
- Mesh features below the export's vertex rounding collapse into degenerate faces: with 1 mm rounding keep wires >= 2 mm, fillets >= 1.5 mm, flat caps; start an open lathe profile at the axis.
- After any mirrored or sided feature, look at a side view before moving on; sign errors put outer features on the inner face.
- Make gates cheap (coarse sampling) while keeping the negative test failing, and run slow gates once in the background.
- Phones: bake static parts into meshes (~150 draw calls max), disable shadows on dense detail, and never animate the root of a big build, because it moves every object every frame.
- Camera near plane scales with view distance (~2 % of orbit distance, near 0.1 / far <= 1000 for fixed cameras) to keep depth precision on phones.
- three.js baseline look: environment map (RoomEnvironment) + one key light, shadows on, ACES/AgX tone mapping, sRGB output and sRGB colour textures; no lights/env = black PBR, wrong colour space = washed out.
- Imported or generated assets arrive at arbitrary scale: size from the world bounding box to real metres and set min y/z = 0.
- Layout of furniture/props in a scene needs its own clearance gate (no overlaps > 1 cm, nothing taller than sill + 5 cm within 25 cm of a window); detail and z-fight gates cannot see it.

### 9.2 Animation
- Animations are built in the same 3D sandbox and delivered as an MP4.
- Animate with key poses on the motion's turning points, not a key per frame; a few keys fit the exact motion within 1.5 deg / 0.05 stud. Fit keys by adding the worst-fitting moment until every segment is within tolerance.
- Use continuous (Hermite/auto) tweens through moving keys, smooth in-out only where a move truly starts or stops, `out` into impacts, `in` out of holds; easing every key in-out makes robotic stop-start motion.
- One motion spec per character drives every output (editor clip, game script, video); change the spec, never one output, or outputs drift.
- Rig = one group per joint at its pivot with meshes at rest under it; a pose is group rotations. Never bake poses into meshes, so the model can be re-animated.
- Place hands, feet and blades by IK (target + pole) and aim directions, never guessed Euler angles; key the pole so elbows and knees never flip. Build one side of a symmetric pose and mirror it.
- Rotations slerp along the shortest arc; any joint turning > 120 deg between keys gets in-betweens (arc keys) or it cuts through the body or over the wrong shoulder; keep <= 60 deg per frame unless hidden by a cut or flash.
- Weight is timing: anticipation 15-25 % of the action in the opposite direction (ease in), strike 3-8 frames at 60 fps (ease out), hit-stop 0.08-0.15 s, follow-through 1.5-2x the strike and braked, slow recovery. Roughly anticipation : action : recovery = 3 : 1 : 4.
- Overlap: child joints lag their parent by 1-3 frames (wrist after elbow after shoulder).
- Never let the body freeze: no stretch > 2 s with nothing moving (add a breath, camera move or fx), and no two identical keys in a row except a deliberate hit-stop; each beat goes hit -> up -> pre.
- Express hit-stops and holds in seconds (or 30 fps reference frames), not clip frames, because "4 frames" on a 60 fps clip is half the intended hold.
- Slow motion is a time remap (flat warp slope), never stretched keys; write the spec in story time, since slow-mo lengthens clip time.
- Feet stay planted (IK-pinned) unless the move is a step or hop; never move the root with feet attached. Gate worst foot slide <= 0.03 stud, IK reach miss <= 0.05 stud.
- Isolations (hip roll, chest pop) tilt the pelvis against its own travel so chest and head stay over the feet; moving the whole root reads as a side-to-side wiggle.
- Cross-body moves route outside the body through a via key with the full lean of the surrounding poses; straight interpolation passes hands through face and torso.
- Loops are seamless: first pose = last pose (rot <= 2 deg, pos <= 0.02), motion continuous through the seam.
- Render one frame of the first key pose before authoring the whole clip; a wrong front axis or sign wastes the full build.
- Review every frame, not samples: render all frames at >= 10-12 fps from two fixed full-body cameras (front + 3/4), tile into labelled sheets, log each defect as F<n>, fix all, re-render, re-review; done = one full pass with 0 defects.
- Run a motion lint before upload and reach 0 issues or justify each: euler jump, pose snap, dead hold, robotic eases, motion stop, static/robotic camera, flat payoff, loop seam.
- Choreograph contact, not swings: every clash is a shared key where both blades meet (<= 0.15 stud by FK) at a named point, attacker and defender staggered >= 0.3 s; per-fighter clips with no shared contacts pass through each other.
- Fighter spacing = reach: gap at a clash ~ blade length x 0.8; too close and blades pass through torsos.
- Gate fights by forward kinematics on every sample before render: blade-blade distance at each clash, no blade through a torso, tips >= 0.05 above ground, fx within reach of the contact point; fail on any miss.
- Effects ride the motion: place impact fx at the computed contact point, parent beams/charges to the hands, fit trails to the tip path; never a fixed world position.
- Cinematic shape for any payoff: build (slow creeping push-in ~45 % of the distance, fov x0.82, escalation in steps) -> brief dark dip -> short flash + freeze -> shake (~3 % of distance, decays 0.3-0.6 s) -> hold close <= 0.5 s -> reveal >= 1 s with a gentle ease -> settle that keeps drifting.
- Every clip >= 3 s has camera keys with non-linear eases; a static or linear camera reads robotic. Frame the wide shot first, keep subjects in the centre 60 % of a 16:9 frame.
- One big payoff per clip: hit-stop holds for the smaller clashes, the full cinematic pass only on the final blow (no-overkill rule).
- Never pull the camera back under the flash in one frame; and if the clip already cuts wide on the payoff, cut on the flash peak instead of holding close. Check pushes for occluders.
- Epic look: one saturated accent on a dark, desaturated scene, effect hue complementary to the scene hue, diagonal compositions (20-40 deg), letterbox only on the big beats (with a sky lighter than black so bars read).
- Endings land: hold a visible silhouette or aftermath to the last frame, never fade to an empty black frame; distinct fighters get distinct outfits and fx tints.
- A before/after change must differ visibly at 1x speed: compare a frame per beat (e.g. PSNR) before showing it.
- Run multi-stage builds through one command that gates before rendering and produces one final video (stages only on request), with per-phase timings logged.
- Two-hand moves hide or sheathe the held weapon and check palm distance <= 0.5.
- Joints that bend far get overlapping segment ends (or a bend limit) to avoid gaps on rigid per-segment meshes.
- Flight paths around a player keep clearance >= wing half-span + 4 studs and run a headless loop sim before tuning anything.
- Export animation as GLB (or game-native keyframes); FBX from the editor carries none. Sample every export through the same evaluator as the viewport so they match.

### 9.3 VFX
- Build every effect from layers with separate jobs: anticipation (0-50 ms flash/scale-up), core (bright, additive, 100-300 ms life), secondary (smoke/debris, normal blend, gravity + drag), residue (embers/decals fading over 0.5-2 s), camera (shake 4-10 px decaying, hit-stop 30-80 ms). One look copied four times reads flat; distinct roles read as depth.
- Animate size and alpha over life with ease-out, and colour hot to cool (white/yellow → orange/red → grey) as the particle dies. This is how real emission cools, so the eye reads it as energy.
- Never let an effect vanish cleanly: end by eroding into drifting, cooling embers or ash that linger, and fade content before it reaches the sprite cell edge (~7% border). A clean cut or cell-edge clip reads as a bug.
- House style is anime cel: hard-edged colour bands stepping white-hot core → saturated body → darker same-hue edge, with >= 4 clearly visible steps (5 luminance bands per colour preferred) plus a thin soft glow halo under them. Flat tints and blackbody/grey "realism" are off-style.
- Colour through a gradient map (brightness picks a colour from an edge → core ramp, e.g. fire #7a1010 → #ff4a12 → #ffa21f → #ffe7a0 → #fff), never one flat tint over a white sprite. A flat-tinted white sheet looks like a sticker.
- Per effect: one dominant hue, a white-hot core, at most one accent; each painted layer gets its own 4-7 stop ramp shifting hue >= 20 deg from dark edge to bright end, and only the core layer ends in pure white. More hues muddy; a white end on every layer blows out.
- Engines that tint per particle (e.g. Roblox ParticleEmitter Color) cannot gradient-map a white sprite: get the gradient by stacking one emitter per luminance band (or a big faint hue layer under a small white core), or pre-paint the texture. A single tinted emitter always reads as one flat colour.
- Store reusable effect sheets white (greyscale + alpha) and apply colour at use time. One white sheet serves every palette and no colour copies pile up.
- Glow, fire, magic and sparks blend additively; smoke, dust and debris blend normally with a dark grey ramp (~#1a1a1f → #9a9aa2). Additive smoke turns into fog, and additive anything vanishes on white or bright skies.
- A gameplay hit reads within ~0.5 s: clear silhouette and strong value contrast vs the background (dark edge or dark normal-blend layer behind on bright skies; small core on dark scenes so it does not bloom into a blob). Check the look over both a dark and a light background once.
- The hero layer reads first; supporting layers (wakes, crescents, halos) stay dimmer underneath it. Equal-brightness layers compete and the effect loses its shape.
- Use noise/cells/streaks at 25-50% inside the alpha to break flat areas, never on the silhouette edge, and scroll it over time for energy. Edges stay soft; interiors get detail.
- Keep the world desaturated (grey-blue, maroon, lavender, low luma) so the effect is the only saturated hue, and give each character or attack one consistent hue. Saturation contrast, not brightness, is what makes anime effects pop.
- At a clash point use one complementary accent (blue aura vs orange sparks, red vs lime). One accent adds tension; more turns to noise.
- Stage big moments as quiet → big → wide aftermath: a 0.2-0.3 s near-black or calm beat before the hit, the strike, then a wide shot of the result. Contrast in time sells scale the same way contrast in value does.
- Use an impact frame (2 values: white world + black silhouettes, or colour inversion, with radial speed lines) for 1-2 frames, and a full-screen white-out at most once per sequence. Repeated flashes stop reading as impact.
- Sell power with a small figure against a huge effect, and draw effects as shapes, not particle clouds: tapered crescent beams, crescent slashes with echo arcs, thick branching bolts, sparse sparks (a few specks, never showers).
- Let effects light the world: tint the ground under a hot spot, add bloom spill over nearby shapes, and use small dark angular debris chips against bright effects. An effect that lights nothing looks pasted on.
- In a sequence each exchange is bigger than the last (>= 1.5x) and the hero flash is >= 1.5x the object that causes it; place effects at the actual contact point and verify each one is visible in its own frame. Identical repeated hits read as no escalation.
- Beams and energy volumes in 3D are real volumes (or crossed/layered meshes), never a single camera-facing card or a plain primitive; flipbook cards in 3D are front-lit, mostly emissive, translucent with soft edges, never with a baked side light. Cards turn with the camera and baked light fights the scene light.
- Match the simulation to where the effect plays: a floor bounce only on the ground, radial and low-gravity for mid-air. A mid-air splash that "hits the floor" breaks the illusion.
- Flipbooks: 64 frames on an 8x8 grid of 128 px cells (1024 px sheet, power of two); frame = floor(life01 * frames); set the engine's grid layout from the sheet, never a hard-coded smaller grid. A wrong layout shows quarter frames.
- Gate flipbooks on measured numbers, not opinion: max frame-to-frame step jump < ~3 (eased motion ~1.5), < ~10% of bright pixels in strokes thinner than 3 px at 128 px, loop seam step < the mean frame step. Things that appear whole between frames pop; hair-thin lines vanish at game size.
- Check variants on several seeds, not one: a preset that passes on seed 1 can fail on most others. Use softer onsets (3+ frame attacks) so every seed passes.
- Measure light per frame (luminance x alpha), not alpha coverage: impact sheets must keep light past the flash (e.g. light >= peak*(1-0.65p) over progress p). Alpha haze can stay 50-90% while the visible light is gone in 10 of 64 frames.
- Seamless emitter loops: each particle lives several cycles (e.g. 4) with transparency fade-in/out at ~0.2/0.8 so two always overlap. A single particle restarting its flipbook visibly pops.
- Hit-stop freezes flipbooks running on story time, so a card born on a hit pre-rolls ~12% of its life to freeze on its peak, not its blank first frame. Otherwise the impact shows nothing.
- Generate effect motion from physics (sims, particles, ray tracing), not painted frames, and make a new effect a recipe of existing presets; only a genuinely new kind of physics gets new code. Recipes rebuild identically and compose.
- Previews emulate the real emitter (births every 1/Rate, frame from age/lifetime, the exact colour/transparency keys), never a loop of staggered restarts. Fake loops blink and hide timing bugs.
- Budgets at 60 fps on a mid phone: ~2,000 additive Canvas-2D particles, ~50,000 GPU points/instances, <= 3 full-screen fragment passes at DPR <= 2, one bloom pass at half resolution; heavy effects keep frame time <= 16 ms under 4x CPU throttle.
- Fixed-size particle pool, no allocation per frame, updates scaled by dt (fixed step), shaders compiled/warmed at load. New objects per frame tank FPS, per-frame motion runs 2.4x fast at 144 Hz, and lazy compile hitches the first trigger.
- Animate previews on the GPU with one shared WebGL context (render once, copy into each card), catch errors per card inside the frame loop, and verify real-time fps (>= 55, worst frame <= 70 ms) on a throttled phone profile. Phones cap live contexts and freeze the oldest; deterministic time-sweep checks never reveal frame rate.
- Honour prefers-reduced-motion (reduce shake and flash, slow rather than freeze) and never flash full-screen faster than 3 Hz. Flashing above 3 Hz is a seizure risk.
- Stacked additive glow: keep layer gains <= ~1.5, bloom strength <= ~1 with a mid-high threshold, a neutral tone mapper, and an output/colour-space pass last. ACES plus stacked additive layers desaturates a saturated red into pink-white, and a missing output pass dulls colours.
- Shader debugging: a black screen means a silent compile/link failure, so print the shader/program info log (on screen when no console); GLSL ES needs a float precision line and explicit floats (1.0, float(i)); wrap time (mod(t, 1000.)) for mediump phones.
- Transparent particles disable depth write; sprites use premultiplied alpha or procedurally generated radial gradients; cap device pixel ratio at 2 for full-screen shaders. These fix popping sort order, dark fringes and phone overheating.
- One generic emitter {rate, life, speed, spread, gravity, drag, colors, size} plus presets beats bespoke code per effect; value noise/fbm in a shader covers fire, smoke, water and clouds.
- Emitter defaults: transparency fade-in over the first 0-10% and fade-out over the last 40% of life; brightness 1-5 (band ramp ~{1,1,1.3,2,3}); one-shot flipbook mode for hits, loop mode for auras with framerate = frames / life.
- Shade every liquid layer, droplets included: normal from the density gradient, broad + sharp specular (powers ~40 and ~400) and a fresnel rim (1-n.z)^2; add fixed (not per-frame) noise to thick flat pools. Flat drops read as blobs and per-frame noise flickers.
- Start long batch renders in the background as soon as a small smoke run passes, and write docs/previews while it runs; lint the spec against the paint rules before any expensive render so one render passes.
- Render key frames only and fill in-betweens with flow-warped tweens when motion is expensive; render every frame when motion is cheap and exact, where tweens only ghost. Larger, fewer steps of an unconditionally stable solver are the cheapest sim lever.

### 9.4 Images
- A named art style means the owner's stored prompt for it, used verbatim with [SUBJECT] filled and its "how it works" line as the checklist; never paraphrase from memory. Paraphrased styles drift off the owner's look.
- Mix two or three styles at most, each with a stated job (geometry, lighting, mood), e.g. "voxel geometry + cinematic lighting + dark fantasy atmosphere". Four or more styles without jobs turn muddy.
- Assemble prompts as style prompt + add-ons in fixed order (platform asset → design sheet → thumbnail), and keep one best version per style, edited in place. A second copy splits the source of truth.
- Thumbnails: one focal subject with a readable silhouette and large details, one headline in 2 lines (chunky rounded font, thick dark outline), 3-4 hooks max, bright saturated colour and energy (sunburst, speed lines, glow rim). Effects that hide the subject or extra hooks kill readability at thumbnail size.
- Size text boxes for the widest fallback font, not the web font, so headlines do not rewrap while fonts load; deliver 1920x1080 JPEG at quality ~90, <= 400 KB; look once, no rating loop.
- Use real catalog assets and the owner's reference images instead of guessed colours or items, and use a cartoon/toon look only when cartoon is requested.

### 9.5 Audio
- Generate SFX from one play(preset, overrides) function over a jsfxr-style preset table {wave, freq, freqEnd, slideTime, attack, decay, volume, lowpass, duty}; runtime and file export share it. Mutating a preset (pitch x1.5, decay x0.7) is faster than designing from zero.
- Starting recipes: coin square 900 → 1400 Hz step at 60 ms, decay 0.15 s; jump square/triangle 250 → 600 Hz slide, 0.2 s, duty 0.25; laser saw 1200 → 200 Hz fast slide, 0.15 s; hit noise+square 300 → 80 Hz, 0.12 s, lowpass 2 kHz; explosion noise lowpass 1500 → 100 Hz, 0.6-1.0 s; UI click sine 1200 Hz, 0.03 s, quiet; power-up 3-4 note rising arpeggio, 60 ms each.
- Randomise pitch ±5% per play and keep 3 seeded variants per sound. Identical repeats cause listener fatigue.
- No clicks: every envelope starts and ends at 0 with >= 2-5 ms ramps, ramps get an anchor value first, and exponential ramps target 0.0001 (0 throws). A gain jump to or from non-zero is an audible pop.
- Loudness: peak <= -1 dBFS (normalise by 0.891/peak); SFX -14 to -18 LUFS short-term, UI -20 to -24, music -16 to -20 integrated; master gain <= 0.8 into a compressor. Consistent targets keep sounds balanced and stop overlap clipping.
- Gameplay SFX stay <= 0.3 s except explosions and power-ups, each action has a distinct timbre, and the volume hierarchy is player > enemies > ambience > UI.
- You cannot hear: verify sounds by rendering offline and reading peak/RMS/LUFS numbers, plus a clean console.
- Create or resume the audio context inside the first user gesture (touchend on iOS), use an interactive latency hint, pre-decode buffers, create a new source node per play (they are single-use), and trigger sounds from update events, not render. Autoplay policy, single-start nodes and default latency cause silence, errors and 100-300 ms lag.
- WAV export: 44.1 kHz 16-bit mono for SFX, schedule every node before offline rendering, clamp samples to [-1,1] then scale to Int16, header sizes 36 + dataLen, header sample rate = buffer sample rate. Each miss gives silence, noise or wrong pitch.
- Ship web audio as OGG Vorbis or MP3 at VBR quality ~4 (MP3/AAC for Safari); prefer runtime synthesis when possible so no binary files ship.

### 9.6 Roblox
- Never move, script or capture the Roblox Studio camera yourself; in-game camera code in game scripts (spectate, cutscenes) is allowed.
- The server owns every value that matters (currency, damage, ownership) and checks every RemoteEvent argument for type, range and rate, because anything the client sends can be forged.
- Wrap every DataStore call in pcall with backoff retry, prefer UpdateAsync to SetAsync, cache in memory, save at most once per 60 s per key plus on PlayerRemoving and BindToClose (30 s cap), because throttled or skipped saves lose player data.
- Logic lives in ServerScriptService, shared modules in ReplicatedStorage, input and UI in StarterPlayerScripts/StarterGui; a script placed in the wrong container silently never runs.
- Use task.wait/task.spawn/task.delay (never wait/spawn/delay), disconnect connections on cleanup, and pool instead of creating Instances every frame, because the legacy calls throttle and leaks grow until the server lags.
- Find instances with FindFirstChild/FindFirstChildOfClass plus IsA checks and wait for characters with `player.Character or player.CharacterAdded:Wait()`, because names collide (a Motor6D shares its part's name) and objects load late.
- Write core logic as strict (`--!strict`) pure ModuleScripts with no Instance calls, so it can be type-checked and unit-tested without Studio.
- Every change runs the loop edit, start play, read console, stop play, fix; done means zero errors and warnings in a 60 s play session.
- Test only what changed: give long game loops a dev attribute or flag that jumps straight to the part under test, and smoke-test setup paths through the real selection function, because a bypass hides real drops.
- Run long measurements (soak tests, samplers) in a background task that writes the result to an attribute, then read it in a later short call, because one tool call running ~60 s times out.
- Check the Studio mode before edit-mode calls and always stop a play test when done, because edit calls fail while play is running.
- Give each character root one reused mover with finite MaxForce and take every speed from one capped pure module, proven by a randomized test (including NaN and extreme input) plus an in-play measurement, because stacked infinite-force movers fling players ~700 studs/s.
- Anchor static parts and weld moving assemblies to one root; call SetNetworkOwner(nil) on server-owned NPCs at spawn and after every anchor change.
- Every timed hazard must be passable on foot: the gap between hits exceeds the walk through its reach (chord / walk speed + 0.2 s) at full crowd scaling, or every crosser gets hit.
- Design for the real player count from the first build (spawn spread, contested goals, crowding) and test solo second.
- Long-run fun belongs in the first spec (new verb per round, votes, mutators, short how-to card), not a later polish pass; the core loop must still be fun with coins, XP and badges removed.
- A new player knows the goal within 10 s without reading and gets a first small win within minutes; tutorials are reactive and skippable, never text walls.
- Give the 3 most common actions animation timing, sound and visual feedback first, and give every purchase or completion a clear response.
- Spectating ships in v1 for players who are out or finished.
- Measure bots with numbers (knocks, stalls, idle time, sharp turns per bot-minute), not stuck time alone; when a metric does not move after a fix, trace one bot frame by frame before the next build.
- Bots need pathfinding with per-bot variety, moving-platform waiting, predictive dodging and human imperfection (0.1-0.45 s reaction, 4-13% miss) from the first build, or players read them as robotic.
- Game-specific bot hooks set goals only; timing is left to the generic dodge layer, because blind scripted timing lands bots in hazards.
- Design UI at 1920x1080 and check phone 844x390 landscape and portrait: text >= 14 px, taps >= 44 px, nothing overlapping or clipped, because most players are on phones.
- Use UIScale/UIAspectRatioConstraint and ContextActionService so one UI and one input path serve touch and keyboard.
- Write a named palette (one job per colour) and a wireframe before the first screen, and fail the build on any colour literal outside the palette, because ad-hoc colours read as sloppy.
- Every element, outline included, sits fully inside its parent and never touches a sibling; only background layers share space, verified by an overlap check.
- Keep a scene within ~6,000 objects, 24 lights and 4 shadow casters, merge mass-repeated scenery into one mesh per colour, and optimise the 10 heaviest models, because part count and draw calls limit phones.
- MeshParts stay <= 20k triangles and textures <= 1024 px (larger is downscaled); bake scale into sizes because scaled groups do not survive export; 1 stud = 0.28 m, character ~5 studs.
- Validate every generated file before handing it over and state each step that was not run in the target engine.
- Walkable routes are continuous: gaps <= 2 studs, steps <= 1 stud unless ramp or stairs, doorways >= 6 tall and >= 4 wide, and the camera never sees void.
- Prove 0 clipping with an occupancy audit before the owner looks; name exceptions individually and never loosen the threshold.
- Build the theme the owner names everywhere the camera sees, at full detail, one hero piece at a time; a green slab is not a meadow.

### 9.7 Web
- Use the lightest stack that fits: one HTML file for static pages, Vite for stateful apps, a framework only when SSR or routing is asked; add no dependency for what ~20 lines can do.
- A page is responsive from 360 to 1920 px with no horizontal scroll, tap targets >= 44 px, viewport meta, title and meta description, and 0 console errors.
- Use semantic landmarks, one h1, alt text, labelled inputs, contrast >= 4.5:1, visible focus and respect prefers-reduced-motion.
- Size every image (width/height), lazy-load below the fold, keep hero images <= 200 KB in webp/avif, and use at most 2 woff2 font families with the main one preloaded, to avoid layout shift and slow loads.
- Write real headline and copy before styling; never ship lorem ipsum.
- Verify in a real browser over http (never file://): screenshot at 1440x900 and 390x844, read the console, click the main CTA, fix once and re-screenshot.
- Style from CSS custom properties (palette, 4/8 px spacing, type scale with clamp()), one accent colour, line length ~70ch, hover/focus states and subtle motion.
- Common layout fixes: use 100% not 100vw, 100svh/100dvh not 100vh, `defer` scripts that touch the DOM, and remember sticky fails under an overflow ancestor and z-index needs a positioned element outside transformed parents.
- Keep one file until it passes ~400 lines or multiple pages; use inline SVG instead of icon libraries.

### 9.8 Browser games
- Run updates on a fixed timestep: accumulate rAF dt clamped to 0.1 s, `while (acc >= STEP) update(STEP)`, then render; this keeps speed identical on 60/120/144 Hz and stops tab-switch teleports.
- Update never touches the DOM and render never mutates state; all tunables live in one CONFIG object and all game data in one state object with a mode (title/play/over).
- Read input from a key set and pointer state inside update; clear it on blur, preventDefault game keys, and set touch-action:none on the canvas, because lost keyups and default gestures break control.
- Get the core loop (move, one goal, one fail state) playable first, then add title, game over and one-tap restart; playable beats pretty.
- Add juice in order of payoff: hit-stop and screen shake, particles, SFX, UI easing, death/restart flash.
- Hit 60 fps on a mid phone, support keyboard and touch, pause on visibilitychange, size the canvas to devicePixelRatio, and start audio only after the first user gesture.
- Pool bullets and particles, add listeners once, and keep one rAF loop across restarts, because growing arrays and duplicate loops cause FPS decay and double speed.
- Resolve collisions one axis at a time (move X, resolve, then Y) and substep or sweep fast movers, to stop jitter and tunneling.
- Expose game state on window in dev and drive input by automation, then assert that score or position changed and that game over and restart work, rather than judging by eye.
- Small games use plain objects in arrays, AABB/circle collision and a seeded RNG for reproducible bugs; no engine or ECS for what ~300 lines can do.

### 9.9 Math
- Write units next to every number and convert once at the start; keep money and probability at full precision until the final rounding, compare floats with a tolerance.
- Balance curves live in one script with parameters on top that prints a table at start, middle and end; tune there and copy parameters into config by export, never by retyping.
- Frame-rate independent smoothing uses factor `1 - exp(-k*dt)`, chance of at least one hit in N tries is `1-(1-p)^N`, and armor uses `100/(100+armor)` so damage never goes negative.
- Default curves: level XP `base * n^p` with p 1.5-2.2, upgrade cost `c0 * r^n` with r 1.07-1.15; check levels 1, 10 and max so payback time grows smoothly.

## 10. Environment

- **Mode** comes from the environment: `CLAUDE_CODE_REMOTE=true` is a phone cloud session (mobile); otherwise PC; `CLAUDE_CODE_BRIDGE_SESSION_ID` set means a PC driven remotely. A prompt starting `/pc` or `/mobile` overrides it for the session, but `/pc` inside a cloud session stays mobile.
- **Session start:** check the mode, queued PC steps and unmerged session branches; then tier and route (sections 2-3) before the first build call.
- **Mobile has** repo files, a Linux shell, git, node, python, web fetch, sub-agents, account connectors (check the tool list) and preinstalled headless Chromium with Playwright for one small screenshot check. It never has local PC files, stdio MCPs (Roblox Studio, Blender), computer use or desktop apps.
- **Cloud sessions load only the repo's `.claude/`**; plugins and `~/.claude` skills, hooks and settings never load there, so anything mobile needs lives in the repo. Some CDNs refuse the cloud proxy, so headless checks serve pinned libraries locally through request routing.
- **PC-only steps** are queued in `queue/pc.md` as one imperative line, `- [ ] YYYY-MM-DD step — context (files, why, expected result)`, with enough context to run cold, and committed to the session branch; the PC reads unchecked lines from the session branches at start.
- **On PC**, make one cheap status call before the first use of a desktop-app MCP; if it fails, tell the owner the one exact fix and do the non-app parts meanwhile. Prefer own tools, then dedicated MCPs, then the browser, then computer use.
- **Injected context has caps**: hook context is cut at 10,000 characters (keep injections under 8,000, critical facts first); CLAUDE.md imports load in full, so link instead; auto-memory loads only the first 200 lines or 25 KB.
- **New agent and skill files load at the next session start**; test them mid-session through a general-purpose agent that reads the file first.
- **Merging session branches**: append-only files keep both sides; renumber your own ids on a clash.

## 11. Mechanisms to rebuild

Prose rules get broken; these enforcement mechanisms scored 8 or higher in the old vault (their tests pass and lessons cite them). Rebuild them as hooks when the new vault gets code; until then, follow the instruction-only rule in the last column yourself.

| Mechanism | Rebuild spec | Until rebuilt, do this |
|---|---|---|
| Learn loop | Stop hook: parse the turn; on a real tool error, a turn over its limit, an owner complaint or a false "done", block once until this file has the fix (skip when the stop hook is already active) | After any of those, before replying: one root-cause line, then the section 8 edit |
| Fix must land | Stop hook: any new rule or changelog entry without the line it changed in this file blocks | A recorded fix is not done until the rule it implies is in the right section |
| 3-try cap | Pre-tool hook: count failing results this turn with the same tool and command; on the 4th identical call, deny with "change approach" | Never run the same failing call a fourth time |
| Router | Prompt hook: tier from complex-work signals (not prompt length), domain from whole-word triggers, inject the section and checklist names | Classify tier and domain from sections 2-3 before the first build call |
| Honesty check | Stop hook: the last check failed and the reply claims done/fixed/works without "failed" or "not verified" → block | Never say done unless the last check passed |
| Lint | Post-edit hook on notes and config: valid structure, links resolve, size cap, JSON valid; block with file:line | After editing this file, re-read the changed section once |
| Safe auto-commit | Stop hook: if files changed, lint, abort on merge conflict, unstage secrets and files over 5 MB, commit and push the session branch only | Commit at the end of each task; never commit secrets or big binaries; never push main (rule 13) |
| Destructive-command guard | Pre-tool hook: quote-aware split; deny force push, `reset --hard`, `clean -fd`, `rm -rf` on root, home, `.git` or the vault | Never run those; use `--force-with-lease` only with the owner's yes |
| Mobile guard | Pre-tool hook in mobile mode: PC-only tools, binaries or unpinned installs → deny with the named fallback and "queue the PC step" | On the phone, take the fallback and queue the PC step |
| One vault CLI | One script for route, find, learn and queue, sharing the router's code | Edit this file by section number; never guess where a rule lives |
| Session-start digest | Session-start hook: mode, queued PC steps, unmerged session branches, newest changelog lines, trimmed to 8,000 characters | At session start, check mode and queued steps first |


## 12. Scorecard and threshold

Scale for every line: **10** proven (enforced, measured or recurring), general, precise, plain with its reason. **8-9** correct and useful, rewritten to 10/10 wording. **7** situational or a duplicate: merged into a stronger line or left out. **Below 7** rejected: one-off incident, stale or contradicted, a restated model default, or tool trivia.

| Dimension | Score | Why not 10 yet |
|---|---|---|
| Routing | 8 | Trigger table and tier-by-work rule are solid, but there is no hook yet, and the old tier classifier tagged 93 % of turns medium, so tiering still relies on judgment |
| Rules | 9 | Owner rules and conflicts resolved by date; enforcement waits on section 11 |
| Speed | 8 | Levers are measured, but only 30 % of old-vault turns met the goal (limit / 4) |
| Quality | 9 | Gates are numeric per domain; the owner's 3D tool is rebuilt separately |
| Precision | 9 | Edit, compute and path rules are proven by repeated failures |
| Decision making | 9 | Tier, ambiguity, fallback, reuse and brain/hands rules |
| Bug fixing | 9 | Root cause, bisect, 3-try cap, fail-open guards |
| Analysis | 8 | Measurement and labelling rules are strong; bot and user-simulation methods cover games but few other domains |

**Left out (below threshold or excluded):**
- Excluded by the owner: every skill, every hub or artifact tool and all tool code, including tool APIs, file paths inside tools and generator internals (about 60 lessons and 40 note lines).
- Below 7 and rejected: one-off incidents and tuning constants from a single build (about 45 lessons and 20 note lines); rules contradicted by a newer owner word (the 3-fix footer, the mute footer, "push so the phone sees", merge to main without asking, placeholder art, "animate generously"); stale facts (deprecated MCP servers, old asset APIs, retired folder layouts); slogans and restated model defaults.
- Scored 7 and left out: the budget hard gate and clock warnings (measured: 80 % of turns within limit before the gate, 70 % after), per-route fast paths, monthly log rollup, relay detection, kids'-shop UI taste values, lobby part-count floors, marketing notes.

## 13. Changelog

Newest first, at most 20 lines; older lines are removed once their rule is in its section.
- 2026-11-26: file created from the old vault by 6 analysts and an adversarial review; about 330 items scored 8 or higher were kept and merged; everything else is listed in section 12.
