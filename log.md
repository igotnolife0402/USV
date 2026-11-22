# Log

## [2026-11-21] build / vault created
Core files written: CLAUDE.md router, index, lessons (16 seeds), router.json, profiles, checklists, queue, state/archive READMEs.
Domains, skills, agents and hooks built in parallel by other workers per .orchestration/ARCHITECTURE.md.

## [2026-11-21] vault / ported old-vault rules and memory
Added profiles/owner.md (owner floor), /plan /review /test /learn commands, lessons L-019..L-028, old-vault checks into checklists, router words (owner route, attack/destruction/animation/lobby/ui).
QA sync: queue-first, queue sync, lessons append-only rules unified across CLAUDE.md, profiles, queue, checklists; tiers pruned.

## [2026-11-21] build / auto-learning loop
Stop hook now analyses each turn (errors, retries, slowness, owner complaints, router misses) and blocks once until a lesson + note fix exist; 3-try cap in PreToolUse; per-turn metrics + PERF/PROMOTE digest at start; monthly metric rollup. 28 tests pass.

## [2026-11-21] build / learn on every task
Learning now triggers on any real error for every task size; new math domain + route + checklist; images get their own checklist.

## [2026-11-21] build / learn from every folder
User-level hooks (hooks/global.mjs via scripts/install-global.mjs) route any session's prompts through the vault and make failures in any folder write lessons into it.

## [2026-11-21] build / vault skills
New /vault, /learn, /queue skills on one CLI (scripts/vault.mjs); router-named skills are now enforced (skill-miss learning signal); personal copies installed so they work in every folder. 40 tests.

## [2026-11-21] fix / tool registry
Owner tools/artifacts registry (profiles/tools.md) + `vault.mjs tool find|add`, injected at session start, routed by 'artifact/sandbox/generator'; never ask twice.

## [2026-11-21] build / Umbrio Sandbox default + liquid VFX generator
Umbrio Sandbox is the enforced default (hooks/prefer.json blocks Blender/generators unless named); new tools/vfx/liquid generator (4 layers, ~2 s) registered as VFX Generator.

## [2026-11-21] rules / honesty + always-improve enforced; liquid VFX v-next
Owner: 100% honest, no excuses; always improve even when goals are met. Stop hook now blocks "done" after a failed last call (honesty) and asks for one vault improvement on clean builds (improve). Liquid: 256 px default, shaded droplets, rim, ripples (7.1 s). Still not done: import into Umbrio Sandbox + attach to an animation.

## [2026-11-21] build / Venomreaver poison armor in Umbrio Sandbox
New poison set in tools/3d/armor/sets.py (62 meshes), 28 liquid flipbooks (7 pops x 4 layers) on the dragon equip clip, hub project venomreaver-p01s. Checked: local shots + 1080p render, db read-back matches. liquid.py: zero RGB under zero alpha (sheets ~30% smaller). Not checked in the live hub page (browser pane not signed in).

## [2026-11-21] fix / Venomreaver liquid VFX blends in mid-air
Owner: splash landed on an invisible floor mid-air, looked pasted on, odd light. liquid.py --air (no floor, radial, half gravity), camera-lit translucent soft shading, 3-frame fade-in; hub tex swapped, splashes 0.8x. Checked: studio shots harness. Not checked in the signed-in hub page.

## [2026-11-22] fix / Venomreaver: one finale burst + permanent no-overkill rule
Owner: a big splash per armor piece was overstimulating. Removed the 7 per-piece splashes, one 4-layer burst when the helm lands (4.05 s). Rule added to profiles/owner.md, CLAUDE.md, checklists vfx+3d, vfx playbook, armor README. Checked: studio shots harness; hub db written (v8).

## [2026-11-22] fix / Umbrio Sandbox exports (partial)
Fixed: glb/gltf dropped every animation track (uuid map); R6 limbs kept Sandbox names so Roblox poses never matched; link-meshes.lua now moves joints to the mesh. Synced repo studio to the live hub (it was behind). Not fixed: Roblox export is still two files (FBX meshes w/o rig, rbxmx rig+anim w/o meshes); FBX/Collada have no animation; flipbooks have no Roblox form. Not tested in Roblox Studio (Open Cloud upload was blocked by the permission check). Studio suites: roblox 6 and io 4 tests fail against the live code (tests older than live), core boot 1.

## [2026-11-22] fix / Sandbox -> Roblox import verified
Venomreaver imported into Studio as one asset (100677928775604): 62 real meshes, 70 Motor6Ds bound, KeyframeSequence 4544 poses, visually checked. Exporter: rig armor Motor6Ds + poses, meshAssets linking, rigs force link mode. Open: Animation asset for in-game play, flipbook VFX as ParticleEmitters.

## [2026-11-22] fix / Venomreaver plays in Roblox: piece-by-piece equip + poison burst
Animation asset 82594256097105, 4 Decal sheets, model 123924497580446 (rig + 62 meshes + 4 ParticleEmitters + UmbrioPlay). Play-tested: bare at 0.2 s (62 hidden), boots 2 s, full + burst 4.1 s. Exporter: flipbooks -> ParticleEmitters, ShowAt/HideAt visibility, animOnly/animAssets/textureAssets.

## [2026-11-22] fix / Roblox export keeps the Sandbox scale pops
Owner: pieces appeared instantly in Roblox, no grow-in. Added PopScale data + UmbrioPop client script; play-tested (0.02 -> 2.47 -> 2.08 on the chest plate). Model asset 110558219659237.

## [2026-11-22] add / crew skill (main model = brain, 3 Sonnet 5.5 medium workers)
.claude/skills/crew + .claude/agents/crew-worker.md (model claude-sonnet-5-5, effort medium), also copied to ~/.claude for every folder; router route crew. Not yet verified that the worker runs on Sonnet: agent files load next session; fallback in the skill if the model errors.

## [2026-11-22] check / crew-worker runs on Sonnet 5.5
Test spawn: worker ran node, reported model claude-sonnet-5-5 (full id in agent frontmatter works; the sonnet alias does not).

## [2026-11-22] fix / fast-path routing
prompt-router: route `fast` entries (words -> read list + skill override) inject FAST PATH; 3d creature/monster asks open only tools/3d/beast/README.md (was 7 reads, ~2 min). Test in tests/hooks.test.mjs. Pre-existing worktree-path test fails in cli/global tests unchanged.
## [2026-11-22] build / Shadow Monster in Umbrio Sandbox
tools/3d/beast/shadow.py (22-stud rigged shadow creature: 4 glowing eyes, glowing grin, cracked core, horns, wisps, smoke skirt, tail; idle + lunge-screech clip). Hub project shadowmonster1122 written in 11 live stages (95k tris, 156 objects). Checked: zfight PASS, shots harness frames 0.5/3.0 s + close-up. zfight now skips shadowOnly stand-ins; shots harness loads tex docs (palette). Not checked in the signed-in hub page.

## [2026-11-22] build / Venomreaver remade at max quality
New smooth kit tools/3d/armor/hq.py (curved plates, rims, lathes, tubes, smooth-by-angle, audit) + preview.py; venomreaver.py + vhq_torso/limbs/helm (crew: 3 workers). ~288k tris, audit clean, studio render checked. Open: torso sides bare under arms, toe-cap rivets float, not yet written to hub project. Took ~45 min on a medium-tier target: crew + kit-bug round trips.

## [2026-11-22] build / Venomreaver HQ fixes + hub write
Torso side plates, toe-cap rivets fixed; 87 geo docs + project v9 + meta v7 written to hub project venomreaver-p01s (Umbrio Sandbox), read-back matches. Not checked in the live hub page itself.

## [2026-11-22] rebuild / Shadow Monster as parts
Owner: voxels not asked, then one fused smooth mesh had no detail. Rebuilt as 674 separate parts (tools/3d/beast/shadow_parts.py, same rig + clip), hub project shadowmonster-parts. Checked: shots harness full body + close-up. rig.py gained opt-in smooth=True (unused default). Rule: models = many parts (playbook, owner.md). Heavy: ~1M tris, ~1300 draws in the studio; not checked on a phone.

## [2026-11-22] rebuild / Shadow Monster custom meshes, voxel tab replaced
Owner: plain default shapes looked flat. shadow_mesh.py: 476 custom part meshes (swept tubes, sculpted blobs, horn rings, hooked claws) with procedural rock/brushed textures; written over hub project shadowmonster1122 (old voxel geo deleted, owner env/camera kept). Checked: shots harness close-up + full body. Not checked on a phone (~176k tris, ~950 draws).

## [2026-11-22] build / Venomreaver overlap pass + textures (usage limit hit)
hq.py: --overlaps poke-through check (8 cores, ~13 s), textured Roblox materials in venomreaver.py, workers fixed spikes/drips/straps/goggles, new boots (domed toe + lames). Studio render checked; 625 overlap pairs remain (most allowed mounts/hidden parts, not triaged). NOT done: hub write of this version (hub still has the earlier one), Roblox upload + play of the sequence, boots still show bare leg between greave and boot. Next: triage overlaps, close the greave-boot gap, write hub, tools/roblox/read-mesh-assets.luau route.

## [2026-11-22] ship / Venomreaver max quality in Roblox
Boot gap closed, hub project v37 (85 vh2 geo docs). Roblox: meshes 84972987624067, anim 121640037198754, model 118391254294827 replaced "Venomreaver (full)" at the same pivot; play-tested: bare -> boots -> full armor -> poison burst, loops; 0 empty MeshIds. One upload folder for all Roblox imports: ~/RobloxImports (owner-approved). Crew: workers TaskStop on report, one 5-min round for medium.

## [2026-11-22] fix / Venomreaver in Roblox: rust + low detail
CorrodedMetal shows as orange rust in Roblox: all metals now Metal; 85 MeshParts RenderFidelity Precise; exporter sets Precise. Studio screenshot matches the Sandbox design; place saved.

## [2026-11-22] deliver / Shadow Monster in Roblox Studio
Plain FBX upload lost Neon, transparency and colour (owner: not the same). Used the link route: link export -> meshes FBX asset 73347141772478 -> linked rbxmx (MeshId + TextureID, Neon, transparency) -> Model 71634982918035, inserted as Workspace.ShadowMonsterLinked. Checked: Studio screenshot (veins, mouth and wisp glow match the Sandbox). Not animated in Roblox (group clips are not exported, only R6 rigs). Uploads go from %USERPROFILE%/RobloxImports.

## [2026-11-22] build / model detail floor
Owner: models were cheap primitives. Added domains/3d/detail.md + tools/3d/detail (floor.json, detail.py) + tools/roblox detail.luau/detail-check.mjs; rewrote rbxforge rules (no SmoothPlastic-only, no 1-call monsters); linked from owner, playbook, checklists, skills. shadow_mesh now 100% textured, gate PASS.

## [2026-11-22] fix / studio fly mode
Fly: editor pointer handlers (select box, drag, hover raycasts, dblclick) skip while flying; smoothed step + 0.1 s stop on release; keys clear on Meta/Ctrl up, focusout, hidden; no DPR flip-flop while flying. Editor fly tests extended (fail on old code, pass now). Published to hub on owner OK (version 48).

## [2026-11-22] crew / Shadow Monster maximum detail + no floating parts
Owner: low detail vs the Venomreaver armor; floating spikes. Crew (3 workers) wrote detail_head/torso/limbs (935 detail pieces: horn bands, eye rims, inner fangs, studded bone plates, vertebrae, core shards, vein networks, knuckle and claw sheaths). Back wisps now root on the back skin; attach_check gate in shadow_mesh seats studs and fails on detached parts. Hub tab shadowmonster1122 updated (geo sy*, 123 meshes, 290k tris); Roblox Workspace.ShadowMonsterHD (asset 81486116637925). Checked: Sandbox shots front/back/limbs, zfight PASS, rbxmx-check PASS. Not checked: Roblox look (camera capture not allowed), old sm*/sx* geo docs not deleted, still static in Roblox.

## [2026-11-22] build / 5 vapes
- tools/3d/props/vape_a|b|c.py + vapes.py: pod-vape, box-mod, disposable-vape, vape-pen, mech-mod (toon, 19-25 parts, 7-12k tris). Mesh check ok, detail PASS x5, zfight --prop PASS; preview looked at; studio shots not run.
- zfight.py: --prop mode (prop-scale bands), skips see-through parts; vapes.py --check runs every gate in one command; small-prop one-shot rules in props README.

## [2026-11-22] skill / crew size gate
- crew: size gate (0 workers when <= 3 min), haiku for mechanical pieces, one gate command made before briefing.

## [2026-11-22] build / 3 voxel guns
tools/3d/voxel/guns.py -> PlasmaPistol, AssaultRifle, SniperRifle .rbxmx in ~/RobloxImports/voxel-guns; gate: one connected body each (caught floating bipod). Not visually verified.
- 2026-11-22 Voxel Guns live-built in Umbrio Sandbox (hub meta/projects voxel-guns, 3 stages, read back v3).
- 2026-11-22 Voxel guns rebuilt as textured mesh parts (props/guns.py), detail+zfight pass, live-built in Umbrio (3 stages, meta v6, 84 objects). Old plain-Part guns removed. L-088.
- 2026-11-22 Voxel guns: fixed handle gaps + floating guards/slings/sight, rifle mag one piece; new attach gate in guns.py --check; Umbrio updated (meta v7). L-084 promoted.

## [2026-11-22] fix / crew speed: copy-only Sonnet workers
Slowness: workers at medium effort with web tools, 3 self-retries and DONE-only-on-gate looped ~7 min. Now always 3 Sonnet workers at effort low, one-pass copy of a literal brain spec, brain OKs or re-instructs (max 3 rounds). Skill + agent updated in repo and ~/.claude. L-090.

## [2026-11-22] report / crew speed before-after chart
Config deltas: retries 3->0, tool cap 15->8, web tools 2->0, effort medium->low. Time per worker 7->~1.5 min is a target, not measured yet (new agent file loads next session).

## [2026-11-22] fix / lint vs ACE clash
repo-check lesson 400-char cap now ignores allowed " → promoted/dup of" suffixes; L-084 text restored per ACE delta-only.

## [2026-11-22] fix / crew brain pre-spawn cap
Easy builds: one template read, router notes deferred to review, spawn within 60 s; no pre-built check. L-091.

## [2026-11-22] build / tactical shotgun (crew)
- tools/3d/props/shotgun.py: brain wrote template + checks; 3 crew workers made palette variants in ~25 s each, all passed detail/attach/zfight; kept tactical, built live in Umbrio (project tactical-shotgun, 27 writes).

## [2026-11-22] fix / guns attach gate CPU
attach() 1M samples 75 s -> shell-level 0.1 step 2.4 s for 3 guns; detached-part negative still fails. Killed runaway shotgun --check + http.server 8765.

## [2026-11-22] change / crew fetch round
Owner: workers research first. Crew now opens with a fetch round (3 workers paste literal excerpts to brain questions while brain reads), then same workers get the build spec via SendMessage. Easy one-template builds skip it.

## [2026-11-22] fix / crew spawn-first
House run spent 2m45s pre-spawn (reads 32 s, design 80 s, serial briefs 40 s). Crew now spawns 3 prep workers in the first message, brain designs in parallel, specs <= 15 lines via SendMessage.

## [2026-11-22] rule / default style realistic
Plain build requests are realistic; toon/low-poly/voxel only when asked. owner.md, 3d playbook table, crew skill updated.

## [2026-11-22] build / crew house
- tools/3d/props/house.py + house_a/b/c.py (crew, 3 Sonnet workers). Mesh + zfight checks pass; flat-shaded preview seen, not seen in Studio/Umbrio.

## [2026-11-22] fix / 3d done requires Umbrio save
House crew run ended on a PNG, never saved to Umbrio. Added to checklists/3d.md and crew close step.

## [2026-11-22] measure / house crew run
398 s: pre-spawn 153 (38%), workers 13 (3%, 2 calls each), brain fix loop 190 (48%), close 42 (11%). Workers fixed (was ~7 min). Crew now routes gate fixes to workers in parallel and always reports timing.

## [2026-11-22] fix / rules skipped
Causes: owner.md never injected, router missed house/sword, worker specs lacked owner rules, 3d notes said Blender-first (contradicted owner.md). Fix: profiles/must.md injected by prompt-router + global hook on build prompts, 20 object nouns on 3d route, crew pastes MUST into specs, playbook/index default Umbrio. Open: the old Documents vault still injects its own guides each prompt.

## [2026-11-22] fix / always-improve enforced + crew speed gate
Owner: every task fixes >= 3 problems; crew took ~2 min to send build specs (82 s brain-alone diagnosis). Stop hook now blocks until `improved:` lists 3, flags crew spawn > 30 s and specs > 90 s.
improved: improve gate raised 1 -> 3 fixes on every task (was builds-only); crew spawn/spec timing measured in parseTurn and flagged; crew rule: specs within 45 s, second fetch round instead of brain-alone reading; must.md rule 11 injected into every build prompt; improvedCount matches line-start only (first version counted the prose mention); crew-worker must use Edit, not string-replace scripts (worker broke learn.mjs regexes); 4 stale tests updated to the new rule, 45/45 pass

## [2026-11-22] fix / improvements must reach the owner
Owner: list >= 3 changes in the reply; vault edits count. Stop hook now also checks the reply for an `Improved:` line with 3+ items.
improved: reply-side Improved check in learn.mjs signals; hook message says vault edits count and to list fixes in the reply; must.md 11, CLAUDE.md 5 and owner.md reply rule updated; 2 tests added (logged-but-not-told, told), 45/45 pass

## [2026-11-22] fix / improve counter + complaint tier
improved: owner complaints classify medium, never simple (prompt-router classify uses CORRECTION + "you still didnt"); improvedCount reads numbered/bulleted Improved lists, not only one-line; CORRECTION exported from learn.mjs for reuse instead of a copy

## [2026-11-22] rule / reply lists what is still to improve
Owner: tell me >= 3 things that can still be improved. Stop hook now requires a `Still to improve:` list (>= 3) in the reply besides `Improved:`.
improved: learn.mjs requires a Still-to-improve list of 3+ in every reply; improvedCount takes a label so both lists share one parser; must.md 11 and owner.md reply rule name the list; tests cover missing backlog

## [2026-11-22] style / mute footer
Owner: keep output minimal but always show a tiny Fixed/Next footer. Mute style (~/.claude/output-styles/mute.md) now allows `Fixed:` + `Next:` 2-5 word phrases before Done; hook accepts that footer.
improved: mute style allows a tiny Fixed/Next footer (was Done-only, hid fixes and backlog); hook counts comma phrases and accepts Fixed/Next labels; must.md, owner.md, CLAUDE.md name the footer; tests cover footer + long form; crew route only on /crew or explicit "use sub agents" (complaint words no longer force crew)

## [2026-11-22] fix / lessons applied instantly + backlog
Owner: logged errors must be applied at once. Stop hook now blocks until every new lesson carries " → applied: <path>". Promoted L-065/069/076. Old Documents-vault plugin disabled (owner: fix all issues).
improved: new lessons must be applied same turn (stop-gate block + test); L-065/L-069/L-076 promoted into crew skill, 3d and roblox playbooks; pre-tool denies sed -i/perl -pi on js/mjs/ts (L-045, 4 breaks); stop-gate skips learning while workers still run; owner /crew no longer flags routed-skill miss; crew specs use tap reporter for test checks; old Documents-vault plugin disabled

## [2026-11-22] fix / apply all old lessons + crew spec template
All 95 unapplied lessons copied verbatim into domains/<d>/rules.md (3d 33, roblox 20, vfx 6, audio 2, games/animation/images 1) and profiles/vault-rules.md (31), tagged " → applied:" in lessons.md; router now injects playbook + rules for each domain. House realistic rebuild started in its own session.
improved: 95 lessons applied and routed (rules notes injected per prompt); crew spec.md fill-in templates with known-good checks; router note order playbook>rules>index so 2-route prompts keep rules; vault/crew routes load vault-rules

## [2026-11-22] fix / 9-min note reading on 3D builds
Realistic house rebuild read 8 files for ~9 min before code. New one-read recipe domains/3d/umbrio-build.md (template, units, textures, zfight layout, gates, Umbrio write format), linked first from 3d index, playbook, checklist. tools/3d/props/house.py rewritten realistic (39 parts, metres); toon house_a/b/c.py removed. L-105.
improved: one-read Umbrio recipe note; checklist caps reading at one note; house template now realistic; props README house section updated

## [2026-11-22] tools / style catalogs
One catalog per style in tools/3d/styles/<style>.md, generated by build.mjs from # @style/@model/@run tags on every tools/3d .py (crew: 3 workers tagged 40 files).
improved: style catalogs replace template hunting; crew + 3d index route to them; build.mjs --check flags untagged templates

## [2026-11-22] test / style catalog speed
Crew timed lookups: catalog 6.3 s + 7.0 s (2 calls each), control without catalog 8.6 s (2 calls; house+roof is an easy grep).
improved: measured catalog vs grep lookup; @prefix tag keeps lp_ functions out of toon catalog; toon.md 209->190 lines

## [2026-11-22] build / realistic house live in Umbrio
tools/3d/props/house.py (39 textured parts, metres) live-built into Umbrio project realistic-house in 3 stages (shell, roof, details; meta v3). Read-back: 39 parts, zfight PASS 0.00 m2, detail PASS. Not visually verified.
improved: zfight fix now cuts textured faces (was skipped, 25 m2 left); guns.attach dedupes samples per cell (MemoryError on house, now 5 s); house.py runs fix itself so --check passes first run

## [2026-11-22] 3d / computer setup (crew)
Realistic desk + monitor + keyboard + mouse + glass PC tower, 28 parts, tools/3d/props/setup.py + setup_{desk,screen,tower}.py; detail, attach, zfight PASS; live-built in 3 stages to Umbrio project computer-setup-1122, read back 28 objects, zfight PASS on read-back; not visually verified (browser pane signed out, queued). 227 s to read-back.
improved: setup.py multi-piece template (one stage per worker piece); spec gate rule for grid fit + textures; style catalog now lists setup models; visual check queued instead of claimed

## [2026-11-22] 3d / computer setup polish (crew)
Owner: gaps + unpolished. Fixed: solid keyboard body, monitor neck embedded into base + housing, slab rear housing, rounded desk top/legs/kb/tower front, apron + tray embedded, GPU touches mobo, added CPU cooler, 4 RAM sticks, rear fan, lit screen gradient. 31 parts, 6348 tris; detail/attach/zfight PASS; new Umbrio project computer-setup-1122b read back 31 objects, zfight PASS. Only the local preview thumbnail was seen, Umbrio tab not visually verified.
improved: polish floor rule in umbrio-build.md; preview zoom step before upload; lesson for gaps/unpolished triggers

## [2026-11-22] build / furnished house (crew)
House finished inside: plaster linings, oak floors, ceiling, stairwell + 15-riser stair with rails, upstairs partition + doorway; furniture by 3 crew workers (house_a/b/c.py, 25-41 s each, 3 tool calls each, all OK first round). Umbrio project furnished-house, 6 stages, read back 110 parts, zfight PASS 0.00 m2, detail prop PASS; scene-class floor not met (110/120 parts, 16.7k/40k tris). Not visually verified.
improved: crew specs sent at spawn (no prep round) so workers finished in under 45 s; house live() stages interior/furniture by id prefix automatically; umbrio-build note names the furnished template; heredoc patch lesson L-106

## [2026-11-22] 3d / reference quality bar (crew)
Owner sent 9 desk-setup photos as the bar for all future builds. Wrote domains/3d/ref-quality.md (8 rules), linked from 3d index, umbrio-build.md and checklists/3d.md. Rebuilt computer setup to it: standing desk (2-stage white columns, butcher-block top), walnut riser, felt mat, thin-bezel monitor with sunset screen + light bar, white speakers, cream/sage 75% keyboard + wood wrist rest, glass RGB tower on desk, plant. 44 parts, 10928 tris; detail/attach/zfight PASS; Umbrio project computer-setup-1122c read back 44 objects, zfight PASS. Seen only as local preview thumbnail; Umbrio tab not visually verified.
improved: ref-quality.md reference rules; checklist gate for reference bar; mesh limit rule (slab/rbox seg); lessons for reference + degenerate/tri cap

## [2026-11-22] fix / house furniture overlaps (crew)
Owner: fridge cut into dining table, bad spacing, too slow. New gate tools/3d/props/clear.py (item overlap + window zones; welds fuv faces, degrees fixed) in house.py --check; living/dining moved, fridge -5 cm, back windows moved/raised. Umbrio project family-house (3 batches), read back 110 parts, zfight PASS, clear PASS. Not visually verified.
improved: clearance gate catches overlaps and blocked windows; Umbrio upload 3 batches instead of 6; L-111 layout rule in umbrio-build note

## [2026-11-22] fix / see-through gaps in models (crew)
Owner: models leave gaps (inside the bed, under the PC to the floor). Cause: zfight fix moved pieces 1.5 cm apart and cut covered faces to the cover's exact edge (desk-top hole under the PC); bed had no base. New tools/3d/zfight/seethru.py gate in house.py/setup.py --check; fix = cut first, exact only where sealed, inset over air gaps, separation fallback; bed base board. setup: zfight PASS, seethru 0.37% -> 0.00%; house: all gates PASS, seethru 0.09%. Not uploaded to Umbrio, not visually verified (queued).
improved: seethru gate (3 s) catches holes; zfight fix no longer cuts holes; zfight separation no longer opens slits; bed base + mattress fit; router words for gaps; checklist row
learn: L-115 measure-first A/B rule for fixer bugs in 3d playbook speed section
