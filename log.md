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

## [2026-11-24] vfx / fire-slash flipbook stack (done on mobile, PC step queued)
New `STACKS['fire-slash']` in tools/vfx/flipbook/vfx.py: flame-arc body + dim Na slash halo + crisp white-hot slash edge + 180 embers. --check: 4.6 s, max_step_jump 1.32, thin_stroke_pct 5.0; sheet looked at over dark + light sky (scratch only). Studio upload + playtest queued.
improved: fire-slash saved as reusable stack + recipes doc; router vfx route now names flipbook.md + "fire slash" word; vfx skill/playbook mobile lines fixed (cloud runs flipbook, not three.js fallback)

## [2026-11-24] vault / blind routing test (3 fresh sub-agents: vfx, model, anim+vfx; Failed: anim route, lantern commit)
improve 60: 45 s delivered (FAIL -15 s, no wait-out). VFX: vfx skill, playbook, flipbook tool, scratch out: pass, merged. Lantern: 3d playbook, umbrio-build, hub tab, .worktrees out: pass, but commit blocked (tools/3d/props at 20-item cap). Sword swing: animation playbook never read (router cut), Roblox luau put in tools/vfx: not merged.
improved: routeNotes interleaves notes per route; animation words sword swing/attack animation; 4 mobile playbooks + 3 path rules state Playwright is preinstalled; .claude/worktrees gitignored (L-223)
Slow (431 s vs 300 s): multi-agent test was tagged medium; tiers.complex now has sub agents / test all pathways / routing test. sed on .mjs blocked by hook: L-045 bumped.

## [2026-11-24] vault / fix blind-test failures + speed
tools/3d/props split (vapes/, setup/, lamps/); vapes, setup and lantern --check all PASS after the move; lantern generator landed. CLAUDE.md: no hook block → `vault.mjs route` first (one call gives sub-agents every path).
improved: props category subfolders (lint cap no longer blocks builds); route-first rule for hookless sub-agents; playbook generator-placement rule names the two-level paths; stale agent worktrees removed
Rerun blind sword swing: routed to vfx skill, ran Playwright check, but still skipped the animation playbook and hit lint on top-level vfx/ → .claude/rules/vfx.md sends motion effects to the animation playbook; vfx test pages live in tools/vfx/pages/. Agent's NODE_PATH claim not merged (require('playwright') works from / and /tmp here).
Slow 335 s: multi-part fix tagged medium + moved generators' '..' paths found by running (L-224); tiers.complex += fix everything, fix all.

## [2026-11-24] 3d / props → models library (versioned, catalog)
tools/3d/props renamed tools/3d/models; lantern → lantern/lantern_v1.py; styles/build.mjs now writes tools/3d/styles/library.md (28 models by kind/version, helpers excluded). Rule in 3d playbook top + checklist; animation/vfx playbooks link it. vapes, setup, lantern_v1, car --check all PASS after the move. improve 60: 58.7 s PASS.
improved: model library rule (reuse first, save as <kind>_v<N>); generated catalog by kind; router words for model library; helper/tool scripts kept out of the catalog
Lint fixed: repo-check exempts tools/3d/models/<kind>/<kind>_v<N> from the copy/version-name rule (owner 2026-11-24); catalog lives in tools/3d/styles/library.md so tools stay separate.

## [2026-11-24] 3d / prune models below the owner floor
Gate = own --check or detail.py on generated output. Removed: vehicle/drones.py (39 parts, 5 colors, 11.4k tris, same_size 0.278), armor.py (helm 7 parts, 0 textures), sets.py (6 parts, 0 textures) + solids.py, venomreaver.py + vhq_helm/limbs/torso.py (14 parts, 0 textures), committed armor/x/y geo output. props.py kept (every generator imports it) but retagged helper so its toon/lowpoly props leave the library. PASS kept: car, setup, house, lantern_v1, vapes, guns, shotgun. Not checkable here (glb/rbxmx output or missing skimage): beast dragon/orc/shadow*, avatar, shatter, voxel city, tiger. improve 60: 77.5 s FAIL (+17.5 s: generators ran before the brief).
improved: library 28 → 23 entries, all checkable ones pass the floor; armor README/tool.json now point to the hq.py kit; improve skill + 3d playbook helmet template fixed (vhq_helm gone)

## [2026-11-26] vault / /prompt audit (no such command; asked which audit)
/prompt is not a skill or command on any branch; "audit" routed nowhere.
improved: vault route owns audit / vault audit / prompt audit / health check

## [2026-11-26] vault / prompt audit (anthropics prompt-audit.md guide)
3 parallel auditors (core, vault skills/agents, vendored eng skills), target Opus 5.5 (Sonnet 5.5 for improver/crew-worker). ~80 findings; 53-hunk proposed diff passes git apply --check; not applied (guide: propose only). Report + diff sent to owner.
improved: audit found lessons written 3 ways; "always improve" 1 vs 3 conflict; thinking-control prose in crew/improver/crew-worker
## [2026-11-24] rule / mute layout always on
Owner: "don't respond" got a paragraph; act as if the PC mute style is applied, every session. profiles/mute.md (rebuilt; PC sync queued), MUTE line injected on every prompt, learn.mjs skips footer on no-tool / no-reply turns, L-143. improve 60: 49.5 s delivery (-10.5 FAIL: Sonnet faster than predicted).
improved: mute rules injected every prompt (were PC-only output style); Stop hook no longer forces footer on no-work or don't-respond turns; CLAUDE.md + short skill point to one mute source; tests cover the mute skip
prune proposal: lessons.md at 154 lines (> 150), roll L-001..L-040 into archive/

## [2026-11-24] build / anime supernova duel cutscene (/improve 60)
Umbrio tab supernova-duel-0106: 2 rigs (Kaito saber, Ren greatsword), 20 s clip, 27 effects, 15 beats (max action 1.6 s); read-back PASS (rigs, len, fx windows, no orphans/missing tex), zfight PASS. Not visually verified; shots queued for PC.
improve 60: ~37 s brief, 20 s Sonnet, 78.9 s total (FAIL +18.9), rungs 1-3.
improved: catalog.py 401 fallback to v1/assetId; avatar.py --clipfile clips as data + geo id sanitizing; new duel.py two-fighter cutscene tool + README; router words cutscene/duel/supernova -> animation

## [2026-11-24] review / supernova duel critique (/improve 60, 3 Sonnet raters)
Scores /10 (R1/R2/R3 avg): epic 3/3/3=3, clash 2/2/2=2, spacing 2/2/2=2, suspense 3/3/3=3, vfx 3/3/3=3, camera 3/3/4=3.3, distinct 5/6/5=5.3, ending 4/2/3=3. 15 faults CONFIRMED by FK on the read-back, 5 rater claims WRONG, rules logged only (no fixes). Umbrio: no timeline camera track (code-checked).
improve 60: ~15 s brief (early), 31.8 s Sonnet, 69.4 s total (FAIL +9.4), rungs 1-2.
improved: Cutscene rules section (animation playbook); FK fact-check script pattern (blade contact, through-torso, ground, fx offset); 8 errors rows (animation + vfx); studio shots run on mobile via scratch deps

## [2026-11-24] feature / Umbrio clip camera track + frame-by-frame rater shots
anim.js clip.camera (pos/target/fov/shake, Follow toggle, Key/Clear commands, toolbar button); test anim 11/11 PASS; hub v50 anim.js sha ee404376 = local. shots.mjs SHOTS_FPS (duel: 81 frames, 21 sheets) + saved scene camera default. duel.py camera_keys.
improve 60: ~22 s brief, 29 s Sonnet, 74.3 s total (FAIL +14.3), rungs 1-3.
improved: clip camera track in Umbrio; SHOTS_FPS frame sheets; shots no longer force a fake 7,5,9 view; rater protocol in animation playbook

## [2026-11-24] build / Supernova Duel II (cinematic rebuild, /improve 120)
New tab supernova-duel-ii-0143: 20 s, clip camera 31 keys (cuts, close-ups, low angles, orbit, shake), letterbox 2.39 (new anim.js bars pass, test 12/12), slow-mo binds at 3.6 and 12.4 s, 6 FK-solved contacts (<= 0.05 stud), 49 fx tinted per fighter at the contacts, bodies lie on the ground. Gate PASS, read-back = built, zfight PASS; frames reviewed at 12 fps headless; phone look queued.
improve 120: ~100 s brief, 20 s Sonnet, 132.4 s total (FAIL +12.4), rungs 1-4.
improved: letterbox bars in Umbrio; fk.py reusable FK + contact solver; tint.py sheet recolour; duel.py yaw paths/tint/extra tracks/fx variants/env; shots frames use the full render (bars, post passes)

## [2026-11-24] build / Supernova Duel III (all-new fitted VFX x6, /improve 120)
Tab supernova-duel-iii-0155: v2 choreography + camera, 300 flipbooks (v2 49), 35 new sheets (none from v1/v2), 16 trail arcs traced from FK tip paths (plane residual < 0.1), per-fighter Ar/Li colour. Gate PASS, read-back = built, zfight PASS; frames reviewed headless; phone fps queued.
improve 120: ~88 s brief, 21 s Sonnet, 121.2 s total (PASS), rungs 1-4.
improved: fitted swing-trail generator (FK tip trace, planar split); owner rule 9 cutscene exception; vfx playbook Cutscene VFX section; duel fx can ride rig groups

## [2026-11-24] feature / Umbrio animator quality upgrade (/improve 240)
New plugins/sample.js (one sampler: rot slerp with spin fallback, 'auto' Hermite + 'cubic:' eases, clip.warp time remap) used by viewport, GLB bake, Roblox export (30 fps bake for auto/cubic/warp/big turns), fk.py; anim.ik (two-bone), anim.mirror, anim.lint (euler-jump, pose-snap, dead-hold, robotic). Tests anim 14/14; roblox 1/7, core boot cap and vfx shadow fail identically at HEAD (pre-existing). Hub v52 shas = local. Duel III contacts unchanged under slerp.
improve 240: ~210 s brief, 25 s Sonnet, 238 s total (PASS), rungs 1-4.
improved: one shared sampler (viewport = exports = fk.py); IK/mirror/lint in Umbrio; animator rulebook with timing numbers; router words animator/rig/ik/slow-mo
- learn: animator turn 848 s vs medium 300 s: same root cause as L-151 (no complex tier word); L-151 bumped and promoted (router tiers += animator, rigging, improve how, engine, sampler); known-red suites listed in the 3d playbook so no stash re-baseline.

## [2026-11-24] feature / cinematic baseline: anim.cine + baseline lint (/improve 90)
Owner refs (outshot, confetti-cannon, Shenron loop, combo14) measured frame by frame (per-frame luma + sheets): build -> 4-frame dark dip -> flash + freeze -> shake -> held close-up -> slow reveal -> drifting settle. New plugins/cine.js + `anim.cine` (impact/burst/loop, idempotent, off), camera.flash pass, 5 lint rules; test anim 16/16; 12 fps sheet read: first pull-back jumped in 1 frame, fixed (hold + even ease). Real duel re-shot queued.
improve 90: ~60 s brief, 17 s Sonnet, 85.3 s total (PASS), rungs 1-3.
improved: anim.cine one-call cinematic floor; camera.flash dip/flash pass; lint motion-stop/camera-robotic/static-camera/payoff-flat/loop-seam; cinematic-baseline note with measured ref numbers; router tiers += animations, cinematic, frame by frame (this run tagged medium, real work complex)
- learn: 2 tool errors (sed on .js, L-045 bumped; push check via bare fetch) + skill miss: 'my standard' hit vault route, 'animations' plural missed animation → L-154, router words fixed.

## [2026-11-24] feature / fight preview before/after + cinematic floor for every session (/improve 60)
Supernova Duel rendered twice headless (out3 vs cine_duel.mjs: anim.cine push 0.2, cut on the flash, 3-frame hit-stops on 5 clashes, shots enter moving); before/after Artifact https://claude.ai/artifact/EZcowSNZJYgCNRQmBwpHHy with beat chips that seek both clips at the same story time. 12 fps sheets of the payoff read: push-in close, flash at 15.75 s hides the cut to wide, blast reads.
improve 60: ~40 s brief, ~16 s Sonnet, 67.9 s total (FAIL +7.9), rungs 1-3.
improved: anim.cine takes per-call overrides (push, fov, slow, hold, flash...) + test; must.md rule 12 (animation floor for every build prompt) and hook context caps 3000/2800 -> 3600 so it arrives whole; animation route now loads umbrio-animator + cinematic-baseline first; playbook/rules/3d-editor skill say auto eases + hit-stops + lint 0 + cine on payoffs; router words fighting preview, fight preview, before and after, cinematic floor.
- learn: L-155 duel cine occlusion/white-out, L-156 hook cap truncation; lint fix: cine_duel imports via PLUGINS env (tools never reach into each other).

## [2026-11-24] fix / fight preview looked the same (owner)
Root cause: anim.cine hold/dip counted clip frames, so the 60 fps duel got 0.05-0.07 s freezes, and the before clip already had clash shakes. cine.js frame counts now 30 fps ref frames (anim 16/16); cine_duel clashes get 0.12 s freeze + 0.5x recoil + white pop sized to the shake; page gains half-speed toggle.
improved: cine frame counts fps-independent; clash impact frames in cine_duel + baseline note; before/after must differ per beat (L-157) + router words looks the same, no difference.

## [2026-11-24] build / cine v2: lighting, vfx light, spacing (owner /improve 60)
Answer: anim.cine had no lighting/spacing. Added clip.camera.grade pass (exp, vignette, element tint) + light `intensity` track (anim.js), cine grade keys + cineLights impact/rim lights (cine.js), lint spacing-close/far + framing; anim 17/17. Duel preview re-rendered with grade, 6 impact lights, blue/red rims.
improve 60: ~40 brief, ~20 Sonnet, 60.7 total (PASS)
improved: video export hid vp.helpers but not light gizmos (diamonds in MP4, L-159); grade ramp brightened before the hit (L-158); router word "looks the same,no difference" was one merged string, split + lighting/spacing words added.

## [2026-11-24] build / Crossing: new fight in 6 rendered stages (owner: see the whole process)
New 7.6 s Kaito vs Ren fight (rigs reused), exported after blocking, splines, impact frames, camera, lighting, vfx: tools/3d/avatar/duel/stages/{build.py,finish.mjs}; stage-stepper preview https://claude.ai/artifact/Y3ui5QSTtM2vT1EYiWbdNc with compare-with-previous; s6 payoff sheet seen (dip, flash, burst ok); s3-s5 clips not viewed.
improved: shots check reads anim.lint on any tab (SHOTS_LINT, with args); build gate (contacts, blade-through-body, ground tips) before render; auto IK in-betweens + Euler twin unwrap (lint 10 -> 6) and lower-residual re-solve (L-160); router words for "whole process / how it changed" (routed nowhere before).
open: Ren wrist flip at 2.75 (L-161) still trips lint 6.

## [2026-11-24] fix / Crossing preview: "5 fps" and no vfx (owner)
Cause: stage 1 (default view) is stepped blocking by design; s6 impact cards froze on their blank first frame during hit-stops (flipbooks run on story time). Fix: hit cards pre-roll 12% of life; page opens on stage 6 and labels stage 1 as choppy on purpose; s6 re-rendered.
improved: hit-stop flipbook pre-roll (L-162, vfx rules); preview default stage + stage-1 label; router words "no vfx / vfx missing"; frame-diff check s5 vs s6 used as the vfx outside check.

## [2026-11-24] improve / fight pipeline to <= 5 min
improve 30: ~18 s brief, ~72 s Sonnet, 89.7 s total (FAIL +59.7 s), rungs 1-3. Built `stages/fight.mjs`: one command build→finish→gate-stop→lint+chunked render→concat→payoff sheet; Crossing dry run 138 s (render 131), gate PASS, lint 6 (Ren wrist, L-161 still open).
improved: one-command fight runner with phase timing (was 30+ min by hand); FX sheet cache keyed by recipe hash (cold build 57 s → 6.6 s); shots.mjs video wrote to SCRATCH/shots not SHOTS (parallel chunks clobbered each other); mp4 export takes frames [a,b] chunks; gate stops before render.

## [2026-11-24] test / fight.mjs fresh run
Fresh WORK, warm FX cache: 147 s to MP4 (build 8.3, render 137.8), gate PASS, 313/313 frames, lint 6 (Ren wrist, L-161 open) so the runner prints FAIL.
improved: runner checks joined frame count vs clip (seam drop/double was unchecked); runner deletes .chunks after concat (~3 MB per render left behind); README records the re-test timing.

## [2026-11-24] build / 100 white VFX + themes
White greyscale default in vfx.py (`--color` opts out), VFX.lua themes (fire, ice, poison, void, holy, blood, Color3) + `VFX.recolor`, batch.py (10 families x 10 variants, 4-process pool, per-PNG verify, reseed on fail): 100/100 pass, 102 s wall (377 s serial), PNG zlib 9→6. Batch-of-10 Artifact: https://claude.ai/artifact/KrWLS8qnPpjDkPu6QEqYQA (preview only, not visually verified in Roblox; queued).
improve 60: ~40 s brief, ~16 s Sonnet, 58.3 s total, rungs 1-3
improved: shock attack 2.5→3.0 (jump 3.96→2.4); kamehameha arc strike softened (jump 3.3-6.5→1.7-2.6 on 6 seeds); glints attack param; PNG save 0.72→0.13 s; batch reseed loop; vault.library() shared; L-165 + router words

## [2026-11-24] build / layered band-texture VFX (5 per colour)
- vfx.py `bands()` + `--bands 5[,10]`: each white sheet -> 5 luminance band PNGs, one emitter each; VFX.lua `make` returns a Folder of per-band emitters (ramp colours +-2..6 RGB, flash-to-cool, core fades first), `emit`/`enable`/`recolor`, palettes inferno/abyss. batch 100: 115 s wall, 0 fails, band rebuild err <= 0.06/255; preview loops 3 staggered particles, 10/10 cards non-empty at 3 times, 0 console errors. Roblox look not visually verified (queued).
- improve 60: ~45 s brief, 17.6 s Sonnet, 117.7 s total (FAIL, compaction between spawn and show), rungs 1-3
- improved: library() crashed on batch.json in OUT (now skipped); preview blank-gap + negative first-frame time fixed (loop never blank); white theme collapses ramp (excluded from distinctness check, documented); router words for flat/layered vfx; L-167 rule in domains/vfx/rules.md

## [2026-11-24] fix / layered VFX turn retro (452 s vs 300)
- Root cause: full 100-sheet batch started only after all code; preview frame -1 bug cost a round; secondary "animate" route demanded 3d-editor.
- improved: learn.mjs skill-miss now requires only the primary route's skill (tests 46/46); vfx playbook speed rule: smoke 3 families then background batch while writing preview; L-168 preview loop clamp + batch overlap rule

## [2026-11-24] build / VFX preview plays like Studio emitters
Replaced the 3-staggered-particle loop in the layered-VFX preview (Artifact v3) with a Roblox ParticleEmitter emulation: one-shots = Emit(1) every Lifetime, OneShot frame over life; loops = Lifetime x4, 24 fps, Rate 2/life, fade 1-0-0-1; linear sequences as VFX.make writes. previewTime sweep: loops 0 jumps, 0 console errors; one-shot jumps only at each sheet's own start.
improved: preview emulates emitter instead of blinking restarts; batch10.json carries FlipbookFramerate; window.previewTime hook for deterministic frame checks; router vfx words (just blinking, in editer, in the editor) so this no longer routes to animation only; playbook rule + L-169.

## [2026-11-24] fix / VFX preview still blinking: sheets lost their light after the flash
Root cause: impact sheets (shock, crystal-burst, glints) dropped 75 %+ of their light in the first 10 of 64 frames and the one-shot Transparency fade doubled it, so each play read as a 0.1 s blink. vfx.py `sustain()` keeps post-peak light >= peak*(1-0.65p); bands use alpha-weighted quantile edges (85/15) and overlap capped at 0.4x the edge gap; VFX.lua + preview one-shot fade is now a light tail. Preview: 0.6 s gap between Emit plays, Speed 1x/0.5x/0.25x, renders only on-screen cards (abyss 32 -> 54 fps desktop).
improved: sustain() light floor for impact sheets; band edges alpha-weighted + overlap cap (fixes sliver layers); preview speed control + on-screen-only drawing; one-shot fade tail in VFX.lua; router words still blinking/full animation; playbook rule + L-170.
Rebuild 2026-11-24: 100 sheets, 173 s wall, 3 fails (shock-v03 bands10 sliver layer; flame-arc-v02/v08 thin 14.6/10.3 %). The 10 preview sheets pass. Artifact v4.

## [2026-11-24] vfx / white-vfx preview on WebGL
Owner saw flicker every 0.1-0.2 s: CPU band loops ran 7-17 fps on a throttled phone. Rewrote the preview renderer in WebGL (bands in the shader, sky in GL, viewport meta, fps readout); Pixel 7 at 4x throttle now 59-60 fps, dt median 17 ms, 0 flicker reversals on the visible card. Artifact v5.
improved: WebGL band shader replaces load-time split() and per-pixel loops; band overlap now read from the sheet (tops-edges) instead of a fixed 0.06 that ignored the vfx.py cap; missing viewport meta made phone tests render at 980 px with all 10 cards visible; opaque GL sky fixes colour shift of additive light; real-time fps check rule in vfx playbook (L-171); router words flickering/flicker every/choppy preview.

## [2026-11-24] vfx / white-vfx frozen stills fix
improve 60: ~38 s brief, 12 s Sonnet, 53.5 s total (6.5 s early, FAIL), rungs 1-2. Owner saw frozen image: 10 per-card WebGL contexts over the phone cap. Now 1 shared context + 2D copies, per-card try/catch, reduced motion at 0.5x. frozen.cjs: iPhone 13 / Pixel 7 / reduced motion, throttle 4: all PASS (1 context, cards change, clock 1.0/0.5). Artifact v6.
improved: shared WebGL context replaces 10 per-card contexts; tick no longer dies on one throw; reduced motion plays at 0.5x instead of a still; frozen.cjs regression check; router words frozen image/frozen preview (router sent this to images/3d-editor).

## [2026-11-24] fix / white-vfx preview "144p"
Preview canvas now CSS width x min(DPR,2) with adaptive step-down (fps<45), sheets kept at 1024 (128 px cells), band SIZE unified (VFX.lua + preview). Ring metric light/ideal p1 0.24 -> 1.00; frozen.cjs 6/6 PASS, rt.cjs 52 fps @4x throttle (PX 370 software GL). Artifact v7. Not verified on phone/Roblox.
improve 60: brief 97 s (late), Sonnet 13 s, 119.7 s total (+59.7 FAIL), rungs 1-3.
improved: VFX.lua band SIZE misalignment (Roblox rings too); adaptive preview resolution; ring metric script (scratch ring.py); router words 144p/pixelated/low res/dark rings; L-173 rule in vfx playbook

## [2026-11-24] build / VFX stylized glow look (owner reference)
Reference = saturated hue + white core + halo: HSV ramp, Brightness per step, -glow.png halo emitter, per-card hues, navy sky; 10 sheets pass gates, preview lit sat 0.59 (ref 0.60), hot cores 9/10, frozen.cjs PASS; artifact v8.
improve 120: ~95 s brief, ~17 s Sonnet, 119.7 s total (PASS), rungs 1-5.
improved: realism push reverted to owner's stylized reference (owner.md VFX exception); batch.py glow_spread gate; look.cjs/montage.cjs style metrics vs reference; router words stylized/glow halo/reference image

## [2026-11-24] build / recreate owner VFX reference grid
grid.py composites the 10 real sheets in reference hues: lit sat 0.52 (ref 0.60), near-white 2.9 %; first pass (max-light frames) 0.39 / 5.9 % = white blobs. Shapes the reference has (rings, swirls, star glints, magic circles, tornados) do not exist as families yet.
improved: grid.py look tool (preview compositing in numpy, no browser); frame pick = most hued light, not max light; router "recreate the image" -> vfx (was images/3d-editor); flipbook.md step 5 look check

## [2026-11-24] build / recreate owner VFX reference sheet (stylized)
New tools/vfx/stylized (style/shapes/sheet): 62 effects at the reference layout in ~1 s, hues sampled from the reference, flipbook HSV ramp + halos. Compare check 31/62 cells within hue 20 deg + sat 0.1: Failed on the rest (tornado/portal fill, glint softness, swirl saturation).
improve 30: brief ~20 s, Sonnet 15 s, 66.2 s total (FAIL +36), rungs 1.
improved: stylized generator + per-cell compare gate; halo pad + round add-window (no square halo edges); hues sampled from ref, not guessed; tools/vfx README row

## [2026-11-24] build / recolor reference VFX sheet (identical shapes)
tools/vfx/stylized/recolor.py: white sheet from ref pixels + strong hue-shift gradient + soft-blended per-effect patterns; gates shape 0.963, hue 9.2°, gradient 51.6°; viewed.
improve 120: ~138 s brief, 12 s Sonnet, 168.6 s total (FAIL +48.6), rungs 1-4.
improved: pixel-mask recolour replaces procedural reshaping; pattern seams fixed by soft blend; router words for recolour/gradient; lesson on spawning at send_brief_at.

## [2026-11-24] build / 62 ref whites + 200 new stylized VFX
tools/vfx/stylized/batch.py: ref cells cut as whites; 200 new via shapes.py + recolor(); unique corr ≤ 0.92, 0 empty, gradient 32-41°; sheet 2 + whites viewed, sheets 0,1,3 viewed only sheet 0 earlier run.
improve 60: 28 s brief, 14 s Sonnet, 65.1 s total (FAIL +5.1), rungs 1-3.
improved: identical-shape repeats fixed by rotate/squash/mirror vary(); square halo box removed by radial edge fade; ring-heavy combos rebalanced; uniqueness keeps least-similar try.

## [2026-11-24] build / vfx 200 distinct symbols
tools/vfx/stylized/symbols.py: owner said batch repeated; 200 new whites now one distinct symbol/emblem each, max_corr 0.799, 0 empty, all 4 sheets viewed. Minor near-kin left: 2 chess kings, 2 hollow rings.
improved: font glyphs filtered (tofu, letters, clip-art SKIP); procedural emblems fill shortfall; stricter 0.80 corr gate; batch.py import shadowing fixed via importlib path.

## [2026-11-24] build / vfx pack 70/30: 140 animated action flipbooks + 60 symbols
tools/vfx/stylized/actions.py: 22 action kinds (slash/smash/wind/others) as Grid4x4 flipbooks in recolor style; 60 symbols picked farthest-first. improve 30: brief 13 s, total 52.4 s (FAIL +22.4).
improved: action generator added (owner's main need); flipbook step-jump metric reused from flipbook/vfx.py; slash crescents thickened + spark trails after viewing frames; beam grow slowed (jump 6.4 -> 4.0).

## [2026-11-24] fix / vfx no rotated copies
actions.py: canonical angle per kind, uniqueness gate checks 8 rotations x mirror. Run: 140 made, 501 redraws, max_corr 0.914 (gate 0.85 missed on some), 95/2240 empty frames, 8 jumpy (beams, lightning); peak contact sheets viewed: heal/beam/smash variants look alike, dust/ice faint.
improved: rotation-invariant gate; canonical angles; slash sweep/fade overlap (jump 11 -> < 3); rule recorded as lesson.

## [2026-11-24] build / vfx flipbooks as GIFs
tools/vfx/stylized/gifs.py: 140 effects -> 280 looping GIFs (colour + white-on-black), 16 frames, 50 ms, 25 s; frames of one GIF read back and viewed.
improved: one file per effect instead of a sheet; GIF 1-bit alpha limit documented in README; white GIFs composited on black so glow survives.

## [2026-11-24] build / unique VFX grammar
unique.py: 33-element grammar, pair-once, frame-once, blurred silhouette gate; 67 unique action flipbooks + 30 symbols + GIFs (target 140 not met).
improved: element grammar replaces param variants; perceptual blurred gate calibrated on owner's complaint; Pool render 6.9 min -> 1 min; faint-scatter filter.

## [2026-11-24] build / white-only VFX atlases
pack.py: 67 effects -> 15 white 1024 atlases (2.9 MB, was 24 MB) + VFXAtlas.luau player; unique.py no longer writes colour sheets.
improved: colour output removed; held/empty frames deduped; 59->15 uploads via 128 px cells; router words for atlas/white requests.

## [2026-11-24] build / VFX library as repo folder vfx/
Owner: no artifact; all VFX in one place with painting rules. 676 white sheets in vfx/sheets (147 flipbook, 67 action, 462 symbol), grep index vfx/index.tsv, vfx/README.md painting rules, tools/vfx/paint.py gradient-map + texture painter (looked at fire/void output once).
improved: repo-check VFX_LIB exemption; vfx skill + rules now say grep vfx/index.tsv before generating; binaries rule gets the vfx/sheets exception; hub library note superseded and every pointer (index, playbook, tools.md, stylized README) repointed; router words for painting/where-are-vfx; L-187.

## [2026-11-24] improve / 20-vfx cinematic brief
improve 60: ~31 s brief, ~19 s Sonnet, 74.8 s total (FAIL +14.8), rungs 1-3. 20 slugs verified in vfx/index.tsv, painted to scratch; Umbrio tab not built yet.
improved: improve skill bans per-file loops before the prompt shows; L-136 bumped, L-189 added; lessons.md at the 200-line cap: 40 oldest applied lessons moved to archive/lessons-2026-11.md.

## [2026-11-24] build / VFX Showcase 20 (new set only)
Hub tab vfx-showcase-20: 20 mix3 sheets painted (void + holy), crystal caster, anim.cine impact payoff 8.5 s clip time, 5 cine lights; lint 0, read-back 20 flipbooks, 12 fps payoff sheets looked at.
improved: tools/vfx/showcase builder (spec-driven, reusable); cine slow-mo stretch documented (story len 10 -> clip 12.04); L-190 + router words "new vfx"; payoff resized after whiteout seen in frames

## [2026-11-25] answer / where vfx are saved and built
Saved vfx/sheets + vfx/index.tsv; built by tools/vfx/{flipbook,stylized,liquid} -> library.py; paint.py colours copies.
improved: vfx/README "Built by" table; mix3 generator gap recorded; spec.json + build.mjs re-read so the showcase docs match; learn.mjs: README + domains notes no longer count as builds (L-192)

## [2026-11-25] build / VFX prompt generator in Claude-Hub
tools/vfx/showcase/generator.html: prompt -> Claude writes spec (validate + 1 repair round) -> live paint of vfx/sheets -> cinePass/cineLights -> Studio vfx.js playback; hub tile "vfx generator" (v55, + sample capability, 97 sheets, cine.js). Check: headless default spec, payoff at 8.50 s, 0 console errors, payoff+0.6 s frame seen (holy burst + void ring). Real prompt generation not run (sample needs the hub).
improve 60: total 109.5 s (FAIL +49.5, clock already at 66.5 s from interrupted turns), rungs 1-3.
improved: spec.json carries ramp/tex so painting is data, not a manual paint.py step; generator plays with verbatim copies of Studio vfx.js/cine.js/sample.js in tools/vfx/showcase/lib (same look, tools stay separate); repo-check lets tools read the shared vfx/ library; hub index.html now in repo (tools/hub/index.html) so republishing no longer needs a read; headless check serves the repo via Playwright routing (no local server needed)

## [2026-11-25] build / vfx generator writes new sheets
Claude-Hub generator now has Claude write per-sheet draw scripts; lib/ugen.js (port of tools/vfx/stylized/unique.py) draws them into NEW white Grid4x4 sheets, painted + cine-played. Headless check: 6 sheets, jump max 2.45, alpha stats in library range, 0 errors. Hub v57. Real sample run not visually verified (queued PC).
improved: ugen.js port of the library method (33 elements); stage status overlay + "example vs generated" tag; vfx/README gap closed (mix3 = unique.py); errors row + L-195; 3 repair rounds instead of 2

## [2026-11-25] build / vfx generator slots, exact length, Opus 5.5
Generator: 1-6 slots, Generate all fires every sample call in one tick (Promise.allSettled), Opus 5.5 medium via sample model/effort, per-slot settings + apply to all, fitDuration (integer ms warp rescale), 60 s cap, 1 fix round after 30 s, worker-pool sheet drawing. Headless mocked hub check: start spread 0.6 ms, clipLen 1.234/3.000/7.5 exact, 0 fx visible at len, wall 38.9 s (1 slot 15.0 s); 0 errors. Hub v60 on runtime 0.2.99. Real model time not measured.
improved: sheet drawing moved to a worker pool (lib/ugen-worker.js, main-thread fallback); hub runtime upgraded 0.2.96 -> 0.2.99 so the model pin can apply; L-197 draw-time budget + L-198 contract rule in profiles/tools.md; router vfx words slots/exact duration/generate all; hub tile text says slots
improve 60: brief + Sonnet earlier turn; build ~12 min after prompt
learn: vault-upkeep skill-miss on the vfx build (generic vault words in brief/summary); L-154 x2 promoted: learn.mjs never requires vault-upkeep for non-vault builds

## [2026-11-25] build / vfx generator Sheet gallery + auto-save
Sheet button: every sheet as PNG (97 library + generated), search, PNG download, Copy script; new sheets auto-save to hub assets + db vfxsheets and are reused (rerun draw 14.2 s -> 3.0 s). Headless check with mocked db/assets/downloads: 103 sheets, 6 saved, 0 dupes, 0 errors.
improved: vfx/README says where generated sheets live (hub db vfxsheets); queue/pc.md duplicated date fixed; Playwright route-order lesson (domains/vfx/errors.md); tools.md generator row updated

## [2026-11-25] improve / vfx generator: always new, short clips, stand-ins
- Generator never reads saved sheets (fresh seed per Generate unless locked); slugs rejected. Target < 4 s: story len = target, cineOpts scales build/slow/hold, lifeErrs forces fix rounds; len floor 3 → 0.3 s. Stand-ins toggle + `stand_ins` export. Opus 5.5 pin kept (falls back via modelTier). Headless check6: 0.8 s exact, lives >= 0.52 s, slug fix round, 6 s spec at 0.8 s = 9 errs, stand-ins off 0 parts/10 fx, rerun redraws 14.9 s. improve 60: 61.6 s total PASS.
- improved: generator reuse removed; short-target quality validated; len floor bug (3 s) fixed; router words stand-in/filler → vfx; vfx skill notes generator exception; L-200; learn.mjs improvedCount now counts bulleted `- improved:` log lines (Stop hook missed them)

## [2026-11-25] build / vfx generator: scrap low quality, element names, sheets into vfx/ on main
- generator.html: JUMP_MAX 3 gate fails the slot (fix round) and never saves; sheet `name` = what it is (1-3 words, validated); saved list hides records imported to repo.
- tools/vfx/hub_import.mjs redrew 26 hub sheets into vfx/sheets (gen-*, LA) + index rows src hub/<key>; scrapped 3 (jump 3.25, 3.06, redraw 3.01); library.py keeps hub/ rows.
- improved: quality gate on saves; element-only sheet names; hub inbox importer; one-path-on-main tool output rule in CLAUDE.md; library.py no longer wipes imported rows
- main fast-forwarded to the session branch (owner yes); stop-gate now fast-forwards main every stop when clean. Gate check: jump 4/3.02 slots failed, 0 saved.

## [2026-11-25] build / Storm Nova custom VFX -> Umbrio MP4
Claude-written ugen script (tools/vfx/showcase/gen/storm-nova.js, jump 2.28, 0 empty) -> vfx/sheets/gen-storm-nova.png + index row; painted copy rendered in Umbrio headless (build.mjs spec + shots SHOTS_VIDEO), 4.2 s 1100x580 MP4 sent. Live hub tab not written.
improved: library.py keeps gen/ rows on rebuild; tools/vfx/showcase/gen/draw.mjs reusable headless drawer; tools/vfx README row with the 18 s Umbrio MP4 path

## [2026-11-25] vfx / generator paint rule: every layer painted, vibrant (L-203)
Read the changed Umbrio colouring rule (L-156 on claude/magical-galileo-ukn1v0); wrote it into generator RULES + `paintCheck` (rejects flat/one-hue ramps, tex none, reused sheet+ramp+tex, all-white ends); Storm Nova re-rendered with 5 own-painted layers.
improved: generator enforces per-layer hue-shifting ramps + textures; build.mjs paints each layer itself (no shared painted png); paint.py + generator presets now multi-hue; vfx/README rule 8 rewritten; white-end cap found by render (stacked white cores went grey)

## [2026-11-26] vfx / generator speed (15 s goal) + Type consistent|cinematic (L-205)
Cut the hub generator's wait: effort low, minified sheets-first reply (4-6 sheets, 8-16 fx), ~1 kB skeleton instead of the 8 kB example, sheets drawn while the reply streams, paint/timing/life faults fixed in code (no fix round). New per-slot Type: consistent = real time, action at t 0 (gunshot); cinematic = old build-up + slow-mo. Hub v65. Headless mock: early draw cut draw-after-reply ~40 s -> 9.7 s; real model time not measured (needs the hub).
improved: repair() auto-fixes ramps/textures/white ends/duplicates/timing instead of a 10-20 s model round; fixLives() fixes short lives locally; earlyDraw overlaps drawing with writing; repair keeps hue spread after dropping white stops (found by the streamed test); status shows fix rounds + auto-fixes; playbook speed rule + router words
improved (stop-gate): L-206 background-check wait rule promoted to vfx playbook; L-045 x13; vfx errors.md row for gunshot delay + slow generations

## [2026-11-26] build / vfx generator placeholder models + scope
Parts take `model` (humanoid, sword, gun, staff, shield, rock, crystal, tree, wall, barrel); `dissolve` track erodes a model with a glowing rim; SCOPE RULE + code swap of off-prompt rise (+ crosses) and flames. Hub v66. Headless acid check: 16-mesh humanoid, dissolve 0→1, 0 errors; erosion look not visually verified.
improved: placeholder models; dissolve channel; off-prompt element swap in code and early draw (no redraw after reply); router words placeholder/erode/dissolve; L-207 + errors row
improved (learn L-208): vault learn rejects lessons > 350 chars before lint; playbook rule to grep names before new consts; errors row for the 328 s overrun

## [2026-11-26] fix / vfx generator: fight prompts were 2 flash hits
Diagnosed from hub db vfxsheets (Anime fight: 5 impact sheets, clip not logged) + headless repro (2 impacts, still fighters). Added ACTION RULE + actionErrs, run log (vfxruns); hub republished.
improved: fight beat/motion check in code; SCOPE RULE no longer shrinks beats; every generation logged with prompt+reply for diagnosis
- learn L-210: improved: playbook rule read vfxruns first when diagnosing; mock repro specs pre-checked for jump gate; publish-refusal diff/republish step written down

## [2026-11-26] build / vfx generator: no filler, element colours, test models + reactions
Generator-wide: fixColors (element hue family, colour word wins), OFFSCOPE bubbles/petals/bolt/zigring, reactRepair (dissolve/char/freeze tracks, hole/cut/scorch/burn/crack/frost marks, test target/dummy), marks system + dummy/target/crate/car models, RULES text (FILLER, COLOUR, TEST). Headless: acid -> dissolve 0.6 + burn mark visible; gun -> test target + hole visible, ramps on hue 25; 0 errors. Not visually verified.
improve 60: 124.6 s total (FAIL +64.6), brief late after long edits; Sonnet 16.5 s
improved: repair fills missing sheet names (validate failed on them); char regex no longer matches "character"; colours re-fixed after duplicate-layer hue nudges; check10 harness with PROMPT=; router words bullet holes/test models/filler

## [2026-11-26] build / vfx showcase reel 20 s
tools/vfx/showcase/reel.html (artifact Rkbb6hcGYJ4zwPa6FP8Zkb): 10 shots (aura, gunshot, claw, thunder, acid, void, hellfire, frost, black hole, storm nova finale), size + aggression meters; MP4 via reel-capture.cjs + ffmpeg.
improved: peak-frame contact check caught 2 empty half-shots (gunshot, thunder) -> double strikes; reel-capture.cjs committed (regenerates the MP4, binary gitignored); router vfx words showcase/reel; playbook + index lines for reel requests; charset meta fixed mojibake in HUD

## [2026-11-26] build / VFX reel: 20 brand-new ugen sheets
20 new sheets (tools/vfx/showcase/gen/*.js, each with a `// PROMPT:` detailed prompt), all jump < 3, empty <= 2, into vfx/sheets + index.tsv; reel.html now 20 shots x 1 s; MP4 tools/vfx/showcase/out/vfx-reel-20s.mp4; artifact republished. Peaks contact viewed; full motion not visually verified frame by frame.
improved: draw.mjs --dir batch mode (one browser, 20 sheets ~18 s); slug clash check rule in vfx playbook (L-214, restored 2 overwritten hub sheets); jump-safe curve rule (L-215); reel-capture peaks follow SHOT length

## [2026-11-26] build / VFX reel: outline styles, new silhouettes, HUD layouts
Owner "try different outlines" → all three: core-layer outline shader (none/ink/rim/hot/toon, 8-tap dilate/erode), 4 new-silhouette sheets (mushroom-blast, toxic-creep, star-rift, plasma-crescent; jump 2.93/2.72/1.5/1.63) replacing round blobs, HUD layouts bar/frame/minimal; buttons + ?ol=&hud= in reel.html. Stills checked via styles grid; motion not visually verified.
improved: reel-capture `styles` mode (one comparison grid per run); window.reelStyle hook for captures; blob shots swapped for distinct silhouettes

## [2026-11-26] edit / reel default outline = rim
Owner picked "colour but brighter" (rim); reel.html defaults to it (?ol= still overrides). Headless check: button "Outline: rim", 0 errors, frame viewed. Artifact v4.
improved: rim default in reel.html; router vfx words outline/outlines/rim outline/reel; playbook reel line fixed (1 s shots, reel.test route for checks); L-216

## [2026-11-26] edit / rim outline 70% thinner
Rim dilate offset 0.016 -> 0.0048 (other modes unchanged). Frame viewed, 0 errors, artifact v5.
improved: rim width; reel-check.cjs one-frame check committed (was scratch-only); playbook reel line records width

## [2026-11-26] edit / reel outline Width slider
"Add slider to preview" read as outline thickness: Width slider 5-150 % per style (rim 30 %), uOw uniform, ?ow=. Checked headless at 390 px: labels 30/150 %, frames thin vs thick, no overflow, 0 errors. Artifact v6.
improved: Width slider; reel-slider-check.cjs committed; vfx router words slider/outline width; playbook reel line updated

## [2026-11-26] build / generator rim outline + width slider + thickness line
Rim outline (shot colour, brighter) now default in the VFX generator paint step, 30 % width, slider 5-50 % under the stage with a live on-screen px line; spec.json exports `outline`. Hub artifact republished (v73). Headless check: labels 5→0.2 px, 30→1.4 px, 50→2.4 px, 150 clamps to 50, 0 errors, no 390 px overflow. Rim look not visually verified (the no-sample overlay hides the stage headless).
improved: L-219 + playbook rule (outline asks target the generator); router words for generator outline/thickness; new gen-outline-check.cjs with THREE_DIR route so headless runs without the CDN tunnel
improved: hub one-file republish recipe in playbook (L-220); errors rows for headless CDN tunnel + rev-parse --short; check script THREE_DIR route documented

## [2026-11-26] fix / generator lag after rim outline
Root cause: rim paint did 8 bilinear taps on every pixel and all 20 sheets were painted in one microtask burst (paint 562 -> 3627 ms on the main thread). Now: separable-max early-out to the outer edge band, serial paint queue (one sheet per task), 1753 ms total. Outline check re-passed; hub republished. Not measured on a phone.
improved: paint perf instrumentation vfxgen.paintMs + gen-perf-check.cjs; paint queue survives a failed sheet (catch); rim no longer tints textured interiors
improved: L-222 speed rule (pageerror first, no mid-line // comments); errors.md row; L-045 bumped (sed -i on scratch .cjs)
## [2026-11-25] improve / VFX generator upgrade prompt
/improve 60: prompt for upgrading hub tool vfx generator (slots, exact duration, 60 s cap / 15 s target, Opus 5.5 medium). improve 60: ~35 s research, ~32 s brief, 19 s Sonnet, 97 s total (FAIL +37), rungs 1-3.
improved: tools.md VFX Generator row pointed at liquid CLI, now hub entry; hub-tool code read rule (Artifact read path); router words vfx generator/hub tool; improve skill brief-start rule for <= 60 s (L-143)
## [2026-11-24] build / wyvern pet showcase loop (/improve 80)
tools/roblox/wyvern: one spec -> GLB (39 parts, 34.6k tris, scale atlas + normal map), baked Luau LocalScript (path follow, wings, jaw, VFX, R15 anime pose), three.js preview artifact. test/sim.mjs all 7 PASS (body clearance 19.3, wingtips 4.8, seam 1.7e-8 / 0.64 %); 4 headless shots, 0 console errors. Not run in Studio (queued); Luau not analyzed (binary blocked).
improve 80: brief ~45 s, Sonnet 24 s, done logged 185.8 s (late: hand-back arrived mid-build), rungs 1-3.
improved: improve skill runs timer done on hand-back (L-136); mobile profile CDN-403 headless workaround (L-137); pre-tool install check ignores heredoc data + test (L-135 promoted); animation route skill 3d-editor -> roblox + wyvern/pet router words + complex tier words; animation playbook/index + tools/roblox index list the wyvern tool; roblox errors row for blocked luau binary
learn: L-138 flight-path clearance rule in animation playbook; vfx skill not invoked (VFX were native Roblox objects built in Fx.luau, primary route roblox)

## [2026-11-24] build / wyvern cinematic camera + post pass
Baked camera track (camera.mjs) with slow-mo hit-stop payoff, flash, shake, push-in; Camera.luau plays it with Bloom/CC/DoF; preview Cine/Free. sim 11/11 PASS; preview shots 0 errors; not run in Roblox (queued).
improve 60: 153 s total, FAIL +93 (late start + branch read).
improved: camera-to-body sim gate incl. wing tips (caught 5-stud clip); flash keyed on a sample (peak 0.69 -> 0.85); shot.mjs exits with install hint when three is missing; flash overlay no longer covers HUD; L-139 improve no-explore rule; router words camera/cinematic/graphics
