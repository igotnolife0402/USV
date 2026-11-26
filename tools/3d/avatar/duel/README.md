---
summary: Two avatar.py rigs -> one Umbrio tab fight cutscene (one clip, world-space flipbook effects, beat gate)
updated: 2026-11-24
status: current
---
# duel

Fight cutscene for the Umbrio Sandbox: two `avatar.py` studio outputs merged into one tab with one clip, root paths
(dashes, knockbacks, jumps), a hide time (killed in the blast) and world-space flipbook effects from `tools/vfx/flipbook`.

1. Kits: `python3 ../catalog.py KIT --body ... --hair <public id>` per fighter (README Kits note: test ids with `v1/assetId`).
2. Clips as data: `python3 ../avatar.py KIT OUT --name N --pose P --clipfile fightA.json --fx fxA.json` per fighter.
3. Sheets: `python3 ../../../vfx/flipbook/vfx.py FXOUT all` (~75 s; the Lua library step may fail, sheets are written first).
4. Merge: `python3 duel.py SPEC.json OUT --work DIR` (`$WORK` in SPEC paths = DIR with A/, B/, fx/) → `OUT/studio/project.json`, `uploads.json`, `writes.json`; prints the beat gate
   (no fighter holds one key-to-key action > `max_beat` s before `still_from`).
5. Upload `uploads.json` files (Artifact `asset: true`, one call), fill `<upload id of x>` in `writes.json`, one ArtifactData batch each.
6. Read back `projects/<id>` with `out_dir .worktrees/hub`, run `zfight.py check` on it.

Process demo: [stages](stages/README.md) (new 7.6 s fight rendered after each of 6 passes).
Example: [supernova](supernova/spec.json) (20 s, Kaito saber vs Ren greatsword, supernova tie, 27 effects).
Limits: no animated camera in the studio (fixed scene camera); poses mid-clip are not z-fight checked (rest pose only).
