---
summary: PC-only steps left by phone sessions; PC sessions show these first. Append one line per step, tick when done.
updated: 2026-11-21
status: current
triggers: [queue, pending, pc step]
---
# PC queue
Format: `- [ ] YYYY-MM-DD step — context (files, why, expected result)`. Done: `- [x]` + short result. Rolled to archive monthly.
PC QUEUE: do queued items first if the task depends on them or the owner says /pc with no task; otherwise mention them in one line.
Queue sync: mobile commits queue/pc.md and its work to its cloud session branch (the cloud pushes it); the PC SessionStart hook fetches origin and lists unchecked items from origin/claude/* branches plus the branches to merge.

## Pending
- [ ] 2026-11-21 vault hook: after a session resume the Stop hook re-reported errors from an earlier turn (venom/make.mjs heredoc escaping, already L-045); check parseTurn turn boundaries on resumed transcripts.
- [ ] 2026-11-22 2026-11-22 look at Umbrio tab computer-setup-1122 (Computer Setup, 28 parts) on the hub; built + read back + zfight PASS, not visually verified
- [ ] 2026-11-22 look at a fresh Umbrio upload of house + computer setup built with the new zfight fix (seethru PASS locally): confirm no gaps under the PC / inside the bed — 2026-11-22 gap fix, not visually verified
- [ ] 2026-11-22 look at Minigame Mayhem in Studio play: new palette UI (vote cards, top bar, spectate bar), cutscene orbit, 6 new arenas + theme decor, 15 new Umbrio kit models (tabs mm-kit5-games, mm-kit5-decor); none visually verified — swarm minigame-mayhem fun pass 2026-11-22
- [ ] 2026-11-22 2026-11-22 watch Minigame Mayhem bots in play (ObstacleRush, SpinSweep): do the waits/hops/dashes look human? not visually verified — bot-watch numbers only
- [ ] 2026-11-23 Run `node scripts/install-global.mjs` in the vault after pulling main: installs /improve (+ improver agent) as a personal skill so it works in every folder on the PC
- [ ] 2026-11-24 python3 tools/vfx/flipbook/vfx.py OUT fire-slash --check, upload PNG, set AssetId in VFXLibrary.lua, playtest in Studio — mobile vfx
- [ ] 2026-11-24 open Umbrio hub project lantern-20261124 (Hurricane Lantern), visually check glass/flame/bail on phone depth - 3d lantern
- [ ] 2026-11-24 Copy ~/.claude/output-styles/mute.md into profiles/mute.md, diff with the rebuilt rules, keep the owner's real wording — phone can't read the PC output style; repo copy is a reconstruction
- [ ] 2026-11-24 Shots check of Umbrio tab supernova-duel-0106: SHOTS_TAB=<hub tab> SHOTS_AT=2,7.4,11,17 SHOTS_VIDEO=1 node tools/3d/studio/test/run.mjs shots; watch clip once, fix poses/fx facing — mobile-built 20 s anime duel cutscene (tools/3d/avatar/duel/supernova/spec.json); not visually verified: fighter yaw, fall pose direction, fx positions
- [ ] 2026-11-24 Watch Umbrio tab supernova-duel-ii-0143 (Supernova Duel II) on the phone in Animate/play: camera cuts, letterbox, slow-mo clashes, tinted fx; note any shot that reads wrong — mobile build 2026-11-24; frames checked headless at 12 fps (llvmpipe), not on the owner's device
- [ ] 2026-11-24 Phone fps check: play Umbrio tab supernova-duel-iii-0155 (300 flipbook cards, 35 sheets) on the iPhone; note fps drops and which second — mobile build 2026-11-24; headless llvmpipe frames only
- [ ] 2026-11-24 Run anim.cine on Umbrio tab supernova-duel-iii-0155 (payoff = final blow) and watch it on the phone: push-in, slow-mo, flash, reveal read smooth on real rigs; tune CINE numbers in tools/3d/studio/plugins/cine.js if not — mobile 2026-11-24: cine verified on a 2-box test clip only (12 fps sheet); hub tabs not reachable headless
- [ ] 2026-11-24 Apply tools/3d/avatar/duel/preview/cine_duel.mjs result to Umbrio tab supernova-duel-iii-0155 (args 13.8 3.6,5.4,5.85,6.3,7.0 0.2) and watch the payoff on the phone: push-in, dip, flash cut, clash freezes — mobile 2026-11-24; preview artifact shows before/after headless renders only
- [ ] 2026-11-24 playtest white VFX themes in Studio: run tools/vfx/flipbook/batch.py OUT, upload the 10 v01 sheets, VFX.make(id, part, nil, 'fire'/'ice'/'void') on dark + light sky; VFX.lua theme code not run in Luau yet — mobile build
- [ ] 2026-11-24 2026-11-24 upload the 500 band PNGs (vfx100/<id>-b0of5..b4of5.png, rebuild: python3 tools/vfx/flipbook/batch.py OUT) and paste ids into VFXLibrary BandIds[5]; Studio playtest VFX.make(id, part, nil, 'fire') + 'inferno' (needs --bands 5,10): 5 layers visible, gradient dark->white-hot, no frame desync — mobile build
- [ ] 2026-11-24 2026-11-24 playtest white VFX in Studio after band SIZE unify: check no dark rings between colour bands (VFX.lua SIZE all 1) — mobile fix
- [ ] 2026-11-24 2026-11-24 Studio: upload *-glow.png + bands, set GlowId, VFX.make 3 effects; check Brightness 1-3 + Halo emitter read like the stylized reference — mobile build
- [ ] 2026-11-24 2026-11-24 upload vfx-atlas.zip atlases to Roblox, paste ids into VFXAtlas.ATLAS, playtest VFXAtlas.play — mobile build
- [ ] 2026-11-24 open Claude-Hub Umbrio tab "VFX Showcase 20", play it, check fps holds and the light-helper diamonds are hidden in play — mobile build (tools/vfx/showcase, headless frames looked at, phone GPU fps not measured)
- [ ] 2026-11-25 Open Claude-Hub > vfx generator: confirm default clip plays, then run one real prompt (e.g. fire sword triple slash + ground slam) and check the payoff at 12 fps — mobile build, not visually verified in the hub
- [ ] 2026-11-25 open Claude-Hub vfx generator, prompt 'poison bubble bursting', confirm new sheets draw (thumbnails), clip plays, sample works; check eval allowed in viewer
- [ ] 2026-11-25 Claude-Hub vfx generator: 3 slots real run (Opus 5.5 medium), check status shows claude-opus-5-5 (modelApplied), start times together, workers OK in viewer CSP, look at each slot's payoff and last frame — mobile build, not visually verified with a real model
- [ ] 2026-11-25 Claude-Hub vfx generator: run one slot, then Sheet: generated sheets show with PNG + Copy script, reload keeps them (assets upload + db vfxsheets in the real viewer), PNG download saves — Sheet gallery verified headless with mocked db/assets/downloads only; not visually verified in the viewer
- [ ] 2026-11-25 Claude-Hub vfx generator: one slot at 0.8 s target: flipbooks play past the last frames (no 2-frame flashes), status shows new sheets each Generate, Stand-ins off hides parts and keeps fx, status shows claude-opus-5-5 (modelApplied) — mobile build, headless only, not visually verified in the real viewer
- [ ] 2026-11-25 open Claude-Hub vfx generator, Sheet button: Library shows 26 gen- sheets, Generated here empty of imported ones; generate one slot and check saved name is the element (e.g. smoke cloud) — 2026-11-25 mobile: not visually verified in the real viewer
- [ ] 2026-11-25 visual check Storm Nova clip in Umbrio live tab (tools/vfx/showcase/gen/magic/storm-nova.js, vfx/sheets/gen-storm-nova.png) — mobile render via headless llvmpipe
- [ ] 2026-11-24 Import tools/roblox/wyvern/out/Wyvern.glb (units Studs) into Studio, move to ReplicatedStorage as Wyvern, rojo serve tools/roblox/wyvern, playtest 32 s: check parts follow the path (no offset/rotated parts), membranes translucent, trails/particles visible, player pose, console clean; run luau-lsp analyze on src/client/WyvernPet
- [ ] 2026-11-24 wyvern cinematic camera: rojo sync, 32 s playtest, check camera orbit/push/flash/DoF/ring sync, console clean; luau-lsp analyze Camera.luau + init.client.luau — mobile edit of tools/roblox/wyvern/src/client/WyvernPet/Camera.luau
