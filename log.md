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

## [2026-11-22] build / Minigame Mayhem (crew, Roblox)
Lobby + 10 minigames + duel world from Umbrio scene JSON (1267 parts, tab mm-world-1122), exported rbxmx + packed server/client Luau, uploaded as one Model, inserted; 10 SFX + 6 VFX sheets uploaded. Solo playtest: games 1-10 complete via finish/coins/buttons, duel bot fights, win +1. Fixed HumanoidDescription crash.
improved: pack-scripts tool (code ships inside the Umbrio rbxmx); procedural sfx tool; SkipToDuel dev hook; playbook whole-game route; router words minigame/round system; L-116

## [2026-11-22] build / Minigame Mayhem v2 (crew) + swarm spec
v2: 3 Umbrio kit tabs (mm-kit-env/mech/props, 58 models, KITS PASS), Studio-built map via MapBuilder (15 arenas), 14 games + random Pick roulette, HUD/FX upgrade, 6 new SFX; solo test: no script errors, random pick works. Owner review: clipping, part-spam tiles, uneven model quality, not 10-player → swarm spec written, awaiting approval.
improved: kit-grid tool (merge + grid kits for tabs/export); flipbook-texture fallback to built-in particles + EmitScale; owner look rule in roblox playbook + memory; SFX presets +6

## [2026-11-22] swarm / minigame-mayhem polish waves 0-3
Wave 0 contracts v3 (+v3.1 liquid/embed), wave 1 kit (0 TIER WARN, heroes 60+) / layout (MapBuilder v3: baseplate slabs, occupancy, audit) / core-UI (10-player ranking, leaderboard, feed, bonk), wave 2 games re-laid for 10 players, wave 3 Studio: audit 7 → 0, 1260 baseplate slabs, 14-game setup/stop smoke 0 failures, qa-gate FAIL 11 → fixed. Place saved v16. Bots (contract v4) started on owner request.
improved: Studio audit pass catches clipping by script; setup/stop smoke test replaces per-round playtests; built-in particle textures as VFX base (L-117); measured sword grip (L-118); coplanar gates report-only (L-119); router words for bots

## [2026-11-22] swarm / minigame-mayhem fun pass wave 0-1
Spec state/minigame-mayhem-fun.md (owner budget 30-60 min: 6 new games, no tutorial island/shop). W0: contract v5 + MMShared Palette/UIKit/Momentum + ui-gate; Momentum Studio test 1000 chains: max 62.00, angle 0.03 deg, 0 NaN. 8 workers running.
improved: momentum cap module + Studio proof (L-120); swarm W0 git identity step (L-121); owner-rule edit gate (L-122); roblox router words for spectate/cutscene/mini games

## [2026-11-22] swarm / minigame-mayhem fun pass wave 2 (done)
Merged 8 workers; Studio v5c: 21 arenas audit 0, decor 38-44 each, 6 new games smoke 0 errors, dash+roll max 54.7 studs/s (was ~700), vote/mutator/intro/spectate run, full bot match restarted, saved v22. qa-gate FAIL 2 fixed (Start fallback, bot net owner).
improved: kit pivot from world AABB (L-123); contract marker rule in swarm skill (L-124); qa visual check queued for PC; lessons shortened to lint cap

## [2026-11-22] owner / camera rule narrowed
Owner OK: in-game camera code in game scripts (spectate, cutscenes) allowed; Studio/MCP camera still never touched (owner.md, must.md).
improved: camera rule matches owner intent; state file unblocked; L-122 gate followed (asked before editing)

## [2026-11-22] crew / minigame-mayhem bot pathfinding
New BotNav (path follow, jump links, per-bot lane offset + random agent radius/material costs, stuck ladder: jump, sidestep, repath, hop to next safe waypoint) + BotSense (moving-platform wait/ride, conveyors and obstacles excluded, lava/void/gap probes). Studio: BoulderPeak race 75 s, 9 bots: 0 stalled 10 s+, 0 hops, nearest-bot avg 21.8 studs; KeyMaze route test 1/6 bots took another route; 0 errors; saved.
improved: execute_luau long-test rule (L-125); crew Read-before-Edit spec rule (L-126); crowd near goal no longer counted as stuck

## [2026-11-22] roblox / minigame-mayhem bots watched + post-mortem
Built tools/roblox/bot-watch.luau (per-round knocks, outs, dodges, stalls, idle, sharp turns, conga) plus sim counters and a Studio-only MMForce game pick. Watched 5 hazard games over 6 builds (v5h-v5n): bots now dodge (hub-rotation prediction, closest-point threat list, adaptive sampling, hard/soft look-ahead, dash, miss re-roll), cut corners, steer, drift and shuffle. Knocks per bot-minute: ObstacleRush 13.9->10.1, SpinSweep 12.2->8.1 (falls 68->2, idle 21->2), HotPotato idle 29->7; BoulderPeak and BombRain unchanged. Spinners made crossable (85 deg/s). New notes: domains/roblox/game-postmortem.md (every Minigame Mayhem mistake as a rule) and domains/roblox/bots.md.
improved: shared motion-cache bug (2nd bot read 0); persistent miss roll; uncrossable spinner design; maps.md rule conflict with owner floor look; post-mortem + bots notes linked from index/checklist; router words for bots; L-127..L-131

## [2026-11-23] skill / improve
Added owner-only /improve skill + improver agent (Sonnet 5.5, low): rough prompt → 100-120 line structured prompt (goal, route, palette, exploded breakdown, steps, verify, owner rules). Timed: 34.7 s at 125 lines → 20.2 s after line cap.
improved: improve speed 35→20 s (line cap, 15-row parts table); mobile profile: Playwright screenshots exist on cloud; improver mobile Umbrio path via ArtifactData; skill listed in index + CLAUDE.md; 2 tests hardcoded "Super-Vault" clone name (blocked cloud commits)

## [2026-11-23] test / improve Sonnet low vs Opus medium
2 prompts x 2 models in parallel. Sonnet 15.2/18.8 s, Opus 30.4/33.6 s; Opus richer, Sonnet had a single-Part pet placeholder gap. Kept Sonnet, folded Opus patterns into the template.
improved: improver bans fictional-character references; 3D verify adds bounds/orphan/coplanar checks; Roblox block adds client-visual split, DataStore load guard, detail floor for pets; A/B result recorded in skill

## [2026-11-23] skill / improve brief flow (owner design)
Main writes a 15-30 line decision brief, improver (Sonnet low) expands it; values must survive verbatim. Pets test: 30.7 s total, all values kept.
improved: improver obeys BRIEF values as final; skill step 1 = brief format per task type; timing + caveat recorded

## [2026-11-23] skill / improve build-from-brief
Build starts from the brief (16.3 s with fresh thinking, drone test); Sonnet expands in background. Brief values survived verbatim.
improved: improver runs in background; build starts from brief same turn; /improve only path split out

## [2026-11-23] test / improve brief flow vs Sonnet only (drone)
Build start 16.3 s vs 16.4 s; Sonnet-only prompt had 3 self-contradictions, brief flow 1 minor (44 vs 47 count).
improved: fresh-prompt timing recorded; Sonnet-only failure modes recorded in skill; brief flow confirmed as default

## [2026-11-23] 3d / drone A/B from both /improve prompts
Built both drone prompts with the same helpers (tools/3d/props/drones.py), live into Umbrio tabs dab-a, dab-b. Read-back: 39/45 meshes, zfight PASS both. Hero gate: A FAIL (parts 39, colors 5, tris 11.4k), B PASS (45, 6, 15.9k).
improved: props.run tri_cap param (hero floor vs 12k prop cap contradiction); errors.md row for it; drones.py generator + README line; ready batch JSON per drone (L-089)

## [2026-11-23] test / Fable 5.2 medium prompt writer + drone C
Fable medium wrote the drone prompt in 39.6 s (stand-in, 1 Read); richest spec (bolts, seams, glass canopy) but wrong tier/skill, 74 vs 75 count, 24 identical bolts. Built as drone C (tab dab-c): 79 parts, 16.8k tris, read-back zfight PASS, hero gate FAIL same_size 0.278.
improved: drone C generator in drones.py; zfight caught my status-strip overlap before upload; 3-way A/B image + prices recorded in improve skill

## [2026-11-23] skill / improve think time
Owner sets Opus think time: `/improve [quick|30s|2m|5m|deep|max] <prompt>`; table maps each level to research depth, brief size and Sonnet LENGTH; default by tier. Not live-tested yet.
improved: router miss fixed ("outline" sent it to web; vault words added); improver takes LENGTH; gate-math rule for 2m+ briefs (A/B top error); index line updated

## [2026-11-23] skill / improve: no line counts
Owner: length = best result, zero filler. Removed every line count from improver + skill (output contract, LENGTH, think table, parts row range).
improved: improver length rule = every line a needed decision/number/check; think table now sets depth not size; parts table one row per distinct part

## [2026-11-23] test / improve 2m level (medieval lantern)
think 2m: 26.7 s brief (route, template grep, gate math), 18.0 s Sonnet, 44.8 s total; build would start at ~27 s. All brief values kept; one unit mix (studs vs metres) from the agent template.
improved: improver unit rule (brief units, never mix); router 3d words lantern/lamp/candle (route had no checklist); timing logged per level

## [2026-11-23] test / improve think time 10-30-60-120-240 (viking helmet)
Fresh Opus per level + real Sonnet expansion. Delivered: 2.8 / 31.0 / 61.6 / 126.3 / 249.1 s (2 PASS in +-5, 120/240 late: Sonnet time grows with brief). Rubric: 20 / 30 / 81 / 91 / 98.
improved: timer Sonnet estimate per level (17/20/24/28 s); default medium think 30s -> 60s; router 3d words helmet/armor; playbook points helmets at vhq_helm.py

## [2026-11-23] 3d / real-render every-angle sheets (owner: labeled, real render)
tools/3d/studio/test/views.mjs: 8 labeled views via look.render in headless Chromium on mobile (~15 s). Fixed: scene Box3 caught the ground/sky (r 99 km) -> bounds from geo verts.
improved: views suite (labeled real renders); studio.md mobile: browser tests work here + exact setup; angles.py straight views level (L-134)

## [2026-11-23] test / helmets built from think-time prompts, blind rated
4 Opus builders (prompts verbatim), real Studio renders (views suite, shared light, front-yaw fixed for R), 3 blind Sonnet raters: 30s 77, 60s 84, 120s 106, 240s 111 /180. Uploaded hv-k, hv-r, hv-m, hv-t; read-back counts match.
improved: dark-metal readability rule in umbrio-build.md; views suite parent-scale + VIEWS_ENV + VIEWS_YAW; blind result + 120 s sweet spot in improve skill

## [2026-11-23] skill / improve: any think time
Owner: no levels or menu, `/improve <seconds> <prompt>`. Replaced the level table with a 7-rung value ladder (most valuable work first, more seconds = more rungs); timer interpolates Sonnet time for any budget. Not live-tested at a new budget yet.
improved: any-seconds syntax, never a selection box; value ladder ordered by the blind-test failures; timer interpolation (sonnetFor) + index line

## [2026-11-23] skill / improve everywhere + time box
Owner: skill missing in new sessions (lived only on the session branch) and wanted time+prompt inside the call. Added argument-hint, AskUserQuestion time box when no number, installer copies improve + improver agent with absolute script paths; merged to main; PC install queued.
improved: installer path rewrite covers every scripts/*.mjs + agents; AGENTS sync (improver); argument-hint + time box; PC queue step

## [2026-11-23] skill / improve as an account-level Claude skill
No tool can add account skills, so built a standalone /improve (no vault files) in tools/skills/improve-standalone + upload zip; owner uploads once in claude.ai Settings > Capabilities > Skills. Fixed the mobile hook blocking quoted PC-app names (L-135).
improved: standalone skill + references/improver.md (vault refs stripped); tool.json + index link; pre-tool hook ignores quoted/heredoc text (6 cases tested)
improved (follow-up): sed/perl .mjs rule also ignores quoted text (same root cause as L-135, bumped)

## [2026-11-23] skill / improve missing from new-session menu (owner screenshot)
Cause: pre-session `/` menu lists built-ins only; repo skills load after the clone. Documented the workaround (type in full / send a first message) and the account-skill route.
improved: mobile profile note on pre-session menu; improve skill + standalone README note; router words for skill-not-showing asks

## [2026-11-23] skill / improve 45 car
improve 45: ~25 s brief, 19.9 s Sonnet, 80.8 s delivered (FAIL +35.8), rungs 1-4. Cause: long build planning after spawn hid the Sonnet return.
improved: SKILL.md rule (short calls until prompt shown, wait at left<=2); lesson logged; car brief gate math checked by code (62 parts, same-size 0.065)

## [2026-11-23] 3d / car from /improve 45 prompt
Built tools/3d/props/car.py (57 parts, 36,324 tris), live into Umbrio tab car-a in 3 stages; read-back: hero floor PASS, zfight 0.00 m2, 0 orphans, size 4.34 L x 1.59 H (antenna) x 2.12 W (mirrors). Renders looked at: boxy wagon-like silhouette, unexplained light patch on rear slope.
improved: car generator + playbook row; 2 errors.md rows (fuv geo size, zfight fix whitening lofts); router words car/vehicle; panel-straddle rule for zfight
improved (follow-up): car + drones grouped in tools/3d/props/vehicle (props folder cap 20, tools may not import each other); pre-tool hook segments() splits on newlines (multi-line commands made later tokens count as rm args, blocked `rm -rf <subdir>`)
improved (stop-gate): router: '/improve' removed from vault words (every /improve build was routed to vault-upkeep); playbook speed rule for new generators; L-138

## [2026-11-23] fix / Umbrio double-sided materials (owner: flipped faces showed see-through)
core/model.js: every material DoubleSide; backColor/backTexture split a part into front + back meshes. Test in parts.mjs (7/7), look/mesh pass; car re-render: roof/sides solid. Published to Claude-Hub v49. core boot-size test was already failing (819 KB > 800 cap), untouched.
improved: double-sided default in Umbrio; backColor/backTexture fields + scene-format doc; errors.md row + L-139 + router words (see-through, flipped faces)
improved (stop-hook): 3d playbook Studio fast path (L-140); pre-tool sed/.mjs check no longer reads across newlines (L-135 bumped, promoted)

## [2026-11-23] hook / live tier clock (owner: car + fix both over 5 min)
Cause: time was only measured by the Stop hook after the turn. New hooks/budget.mjs (PostToolUse, all tools) warns at 50/80/100 % of the tier target, turn start from the transcript like the Stop hook; tested 6 cases. L-141.
improved: live budget warnings mid-turn; 3d playbook Studio fast path (L-140); pre-tool sed check stops at newlines

## [2026-11-23] 3d / /improve 60 vs 200 car compare (Failed: over budget, builds stopped at 779 s)
Prompts: 60 s delivered 63 s (OK, >=160 parts, no interior); 200 s delivered 166 s (FAIL -34 s, brain stopped at 113 s; 208 parts + interior + roofline fix). Builds stopped unfinished on owner complaint; partial car_p60.py parked in .worktrees/cmp.
improved: no-detail-limit rule (fit_parts split, total tri cap removed); improve skill forbids early brief; playbook rule for cheap comparisons (L-142)

## [2026-11-24] build / crimson cataclysm beam (/improve 60)
tools/vfx/crimson-beam/crimson-beam.html (three 0.186.1, artifact GJQ94bTLeBKkJA8BcA8E5d): vortex, pilot drop, r 12 beam, hit-stop, shockwaves, cracks, 600 debris, 6.7k GPU particles, push-in + shake. Check: tools/vfx/shots/shoot.cjs, 0 errors, red 39% at t=3 (try 3).
improve 60: ~45 s brief, 14 s Sonnet, 269.8 s total (FAIL, big Write before notice), rungs 1-4.
improved: pre-tool install check ignores redirects and quoted text; tools/vfx/shots/shoot.cjs cloud VFX screenshots; vfx playbook/errors beam gain + CDN rules; L-136 promoted into improve SKILL.

## [2026-11-24] fix / VFX builds go to Umbrio, previews are MP4 (owner correction)
Cause: vfx playbook + vfx skill + studio.md mobile lines said "three.js HTML Artifact", must.md rule 2 scoped Umbrio to 3D models only, vfx/animation routes never named umbrio-build. Rebuilt beam as Umbrio tab cbeam-1124 (150 objects, 149 tracks, read-back 150, zfight PASS), clip.mp4 1.6 MB sent.
improve 60: ~40 s brief, 18 s Sonnet, 66.9 s total (+6.9 FAIL), rungs 1-3.
improved: vfx/studio/must rules -> Umbrio + MP4; router vfx+animation load umbrio-build; mp4-muxer allowed on mobile (studio deps); tools/vfx/crimson-beam/umbrio_beam.py generator.

## [2026-11-24] build / crimson beam v2 detail pass (/improve 60, owner: "looks flat")
Umbrio tab cbeam2-1124: plasma flipbook beam (kamehameha-beam:element=Ne, hub asset), noise core tube, 3 helix strands, 8 lightning arcs, spiked crown, rippled shock rings, dust wall, 30 ground spikes, 48 streak sparks; rune circle kept. 205 objects read back, zfight PASS, clip.mp4 1.4 MB sent.
improve 60: ~40 s brief, 16 s Sonnet, 59.7 s total (PASS), rungs 1-3.
improved: vfx playbook depth rule + v2 template with tube() helper; flipbook sheet upload path (asset + local data-url for shots); L-146 lesson.

## [2026-11-24] fix / beam v2 white core (owner: "white middle looks pretty bad")
cbeam2-1124 core: solid white Neon 9 m tube -> translucent hot-red ForceField 4.4 m tube (new geo g-c2-core2, old deleted); read-back 205, zfight PASS, MP4 sent.
improved: vfx playbook core rule; umbrio_beam2.py core; L-147 lesson; old geo cleaned from hub.

## [2026-11-24] research / epic anime-fight reference study (/improve 120)
youtu.be/ljMl9px0WXI (35:12 AMV): youtube blocked + yt-dlp blocked on mobile, so 13 Firecrawl embed stills (one per chapter) -> domains/animation/epic-reference.md (10 measured rules: 2-tone impact frame 9:12, complementary accents, dark desaturated base, letterbox 9.6-12.4 %, diagonals...). Every-3 s/frame-by-frame/audio queued for PC.
improve 120: ~95 s brief, 22 s Sonnet, 140.2 s total (+20 FAIL), rungs 1-2.
improved: epic-reference note + links; vfx checklist epic section; audio playbook impact layering; router words epic/anime fight/impact frame/hit-stop; improve SKILL slow-call rule (L-148).

## [2026-11-24] research / every-3 s VFX study of the reference video (owner chose VFX fights only)
8 sub-agents, Firecrawl embed screenshots every 3 s over 5 effect fights: 148/383 stills before the daily MCP credit allowance ran out. Rules -> domains/vfx/anime-vfx-reference.md (12 rules with timestamps + crimson beam plan); missing ranges queued.
improved: anime-vfx-reference note + index links; Firecrawl daily cap documented (L-150); state/epic-frames.md result; queue item with exact missing ranges.

## [2026-11-24] build / Cyan Nova (/improve 60, "using what you learned")
Umbrio tab nova-1124 from anime-vfx-reference rules: obsidian crystal charges cyan plasma sphere, quiet dip, white impact frame, 7 plasma beams with hit rings, lit craters, chip debris, orange embers, dolly-back aftermath. 121 objects read back, zfight PASS, clip.mp4 sent. 2 render rounds (impact sphere fogged grey -> small sphere around camera).
improve 60: ~8 s brief (52.9 s lost before start), 17 s Sonnet, 115.9 s total (+56 FAIL), rungs 1-2.
improved: umbrio_nova.py template; impact-frame recipe in anime-vfx-reference; improve SKILL late-start rule (L-151); flipbook cyan sheets as hub assets.

## [2026-11-24] build / Cyan Nova v2 (/improve 60, owner 6/10 "orb not crystal, looks 2d, underwhelming")
Umbrio tab nova2-1124 (umbrio_nova2.py): 14 m crystal with cyan facet veins + 12 orbit shards + glints; 3D energy = 3 noise shells, 8 shell arcs, 3 tilted orbit rings (no facing card); thick helix-wrapped beams, 90 m shock rings, dust wall, 30 spikes, final flash, falling crystal fragments. 202 objects read back, zfight PASS, MP4 sent, 1 render run. Gate miss: crystal 0.4 % of frame at t=1.5 (target 3 %).
improve 60: ~20 s brief, 16 s Sonnet, 57.2 s total (PASS), rungs 1-3.
improved: v2 template; 3D-energy rule in anime-vfx-reference; L-153; one render run per build held.

## [2026-11-24] fix / tier time = absolute limit, goal = limit/4 (owner)
hooks/learn.mjs GOAL_S + metrics ok (<= goal) / inLimit; budget.mjs warns at goal then 50/80/100 % of limit; prompt-router shows "goal 75 s, limit 5 min"; perf digest "% on goal, % within limit"; rollup on goal; CLAUDE.md table, must.md rule 12, owner.md speed line; tests updated, all pass.
improve 60: ~20 s brief, 12 s Sonnet, 57.5 s total (PASS), rungs 1-2.
improved: goal/limit in hooks + docs; budget warns at the goal; perf digest shows on-goal %; L-155.

## [2026-11-24] build / Void Rift (/improve 60, "another vfx, different, within time")
Umbrio tab void-1124 (umbrio_void.py, full helper block copied): black singularity + 2 noise horizon shells, 3 rippled disk bands + orange inner edge, 6 lensing arcs, 24 infalling rocks on spirals, squeeze, impact frame, 2 shock rings, 12 spaghetti streaks, 30 embers. 110 objects read back, zfight PASS, 1 render (46 s), MP4 sent. Turn ~160 s (limit 300, goal 75 missed).
improve 60: ~25 s brief, 15 s Sonnet, 81.2 s total (+21 FAIL), rungs 1-2.
improved: void template; improve done-timing rule (L-156); helper-block copy via sed (no NameError).

## [2026-11-24] fix / Void Rift orb layers (owner "no gradient, no texture, 1 layer")
void-1124 v2: black core + 5 textured noise shells (clouds/marble/stripes, hue dark->lilac, counter-rotating) + pulsing photon ring + orange Doppler arc; old rim geo deleted. 115 objects read back, zfight PASS, 1 render 53 s, MP4 sent. Turn ~150 s (limit 300, goal 75 missed).
improve 60: ~25 s brief, 13 s Sonnet, 55.5 s total (PASS), rungs 1-2.
improved: orb layering rule (L-157); patch prepared before delivery so build started at the window; same-tab update via if_version + geo delete in one batch.

## [2026-11-24] build / Void Rift v3: ray-traced hero (owner "quality is horrible" + Interstellar-style reference)
blackhole.py frame size now env-tunable (BH_FRAME_PX=512 BH_GRID=4: 80 s, 2048 px sheet), tinted pink-white to the reference, uploaded as hub asset; umbrio_void.py --hero-bh swaps the primitive orb/disk for the ray-traced card + 160 stars, keeps squeeze/impact/burst. New tab void3-1124, 210 objects read back, zfight PASS, 1 render, MP4 sent.
improved: blackhole.py BH_FRAME_PX/BH_GRID; --hero-bh path in umbrio_void.py; realistic-phenomena rule applied (L-158).

## [2026-11-24] rule + build / VFX house style (owner, permanent) + Void Rift v4 anime
Permanent rule for ALL VFX: must.md rule 13 + vfx SKILL "House style" (one anime cel style, clear >= 4-step gradients, reference = structure only, max detail many parts, fast via templates). Void v4 (void4-1124, --anime): 317 objects, 4 cel photon tori, 8 lensed arcs, 16 speed lines, Doppler arcs, 160 stars + 12 sparkles; 1 render; MP4 sent. Defect: disk bands render flat white (Neon ignores gradient texture) -> L-159, fix next.
improve 120: ~45 s brief, 17 s Sonnet, 123.9 s total (PASS), rungs 1-6.
improved: permanent VFX house-style rule in must.md + vfx skill; errors row Neon vs gradient texture; --anime path in umbrio_void.py.

## [2026-11-24] rule / >= 10 fixes every round, every project, never listed (owner)
learn.mjs MIN_FIXES=10 (Stop hook blocks under 10), reply-footer checks removed; must.md 11, CLAUDE.md s5, owner.md, improver agent updated; tests pass. improve 60: 46.1 s (-13.9 early FAIL: spawned at 13 s).
improved: Stop hook enforces >= 10 logged fixes; Fixed/Next footer requirement removed everywhere (hook, CLAUDE.md, must.md, owner.md, improver agent); learn test rewritten for 10-fix rule; improve-timer start says LATE START spawn now when > half gone; pre-tool hook no longer blocks curl -o /dev/null; mobile.md Blender fallback -> Umbrio tab + MP4; router vault words for meta-rule prompts (every round, perm rule, things to fix); state/epic-frames superseded; vfx playbook links house style; void --anime disk bands solid Neon colour steps (Neon ignores gradient textures); void --anime disk tilt 25 deg so bands read; ship.py: one command builds shots dir, renders once, writes hub batch JSON; umbrio-build documents ship.py; L-161 lesson applied

## [2026-11-24] rule / log fixes as you go, implement at the end (owner)
vault.mjs fix add|list|done (state/fixes-pending.md); rules, hook text, skill, checklist updated; tests pass.
improved: vault.mjs fix add/list/done running fix list (state/fixes-pending.md); cli test covers fix add, list, done into log.md; must.md rule 11: log as you go, implement at the end; CLAUDE.md s5 fix workflow; owner.md fix workflow line; Stop hook reason text teaches fix add / fix done; improve skill: never spawn before send_brief_at unless LATE START; vault checklist: fix list empty, >= 10 moved to log; state/README documents fixes-pending.md; vault-rules: no backticks inside hook template literals + run learn test after hook text edits; vault.mjs usage header lists fix commands; L-162 lesson for the fix workflow applied

## [2026-11-24] build / Macarena emote clip
improve 30: 43.6 s FAIL (+13.6). avatar.py mac_* poses + macarena clip (9.33 s, 495 keys), set_pose shift/hop; shots+MP4 rendered; beat 1-4 arm placement wrong (sideways). Failed visual gate; queued fix.
improved: avatar IK targets: assert front axis with a one-frame render before writing a full clip (macarena beat-1 arm went sideways); studio shots deps: document npm i three three-mesh-bvh three-bvh-csg mp4-muxer@5.2.2 into SCRATCH/deps (2 failed runs); improve timer: Stop-hook commit turn delayed delivery +13.6 s; deliver before ending turn; studio run.mjs prints the exact deps install command; studio run.mjs fails fast when SHOTS_VIDEO lacks mp4-muxer; animation playbook: cloud MP4 render replaces artifact-only preview; animation playbook: one-frame IK pose render before full clip; animation errors.md: 2 rows (sideways arm, mp4-muxer); improve skill: never end turn while improver runs; avatar README: macarena clip + shift/hop key documented; avatar.py set_pose: shift/hop root offset (feet planted, hops possible); router: emote/macarena/dance words to animation; lessons L-163, L-164 applied; checklist 3d: animation MP4 + first-pose check; mobile profile: studio shots MP4 works in cloud

## [2026-11-24] fix / learn hook skipped relay build turns
Root cause: hooks/learn.mjs returned no signals for agent hand-back turns; the Macarena build ran in one. Now working relays are checked.
improved: learn.mjs: working relay turns (errors/writes/>=3 tools) get every signal; learn.mjs parseTurn counts tool calls; learn.mjs metrics line includes working relay turns; test: idle relay stays quiet; test: relay with errors teaches; test: working relay needs 10 fixes; vault-rules: learn hook covers the turn where work happened; improve skill: fix add in the hand-back turn; router vault words: you missed, log mistakes, learning loop; lesson L-165 applied to hooks/learn.mjs
improved: tests: node --test needs tests/*.test.mjs, not the folder (failed once)

## [2026-11-24] vault / build-fix gate + Macarena fixed
improve 60: 108.3 s FAIL (+48.3). fix add --build / fix built / fix done refusal + learn unbuilt Stop signal; rule in owner, must, CLAUDE, checklists. Macarena IK targets in reach: probe exact, shots+MP4 PASS, frames seen.
improved: Macarena IK targets moved inside 1.47 stud reach, rebuilt + probe + MP4; vault.mjs fix add --build tags deliverable fixes; vault.mjs fix built <n|all> marks rebuilt+re-verified; fix done refuses (exit 1, names them) while build fixes unbuilt; learn.mjs unbuilt Stop signal with BUILD THE FIX steps; stop-gate + global hooks pass unbuilt fixes to signals; tests: unbuilt signal + fix --build CLI flow; owner.md: fixes-apply-to-current-project rule (full text); CLAUDE.md s5 + must.md 11: build-fix rule line linking owner.md; checklists vault+3d: unbuilt 0 / re-render with every fix; checklists/vault.md: test cmd node --test tests/*.test.mjs; avatar README: IK targets <= 1.45 stud from shoulder rule; router: vault words build fixed version / apply fixes / fixes apply
