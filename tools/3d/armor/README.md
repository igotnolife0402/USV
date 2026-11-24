# armor

Armor kit for the studio's R6 rig. The old sets (ember-wyrm `armor.py`, frost/solar/storm `sets.py`, Venomreaver `venomreaver.py` + `vhq_*.py`) were removed 2026-11-24: they failed the detail floor (6-14 parts per helm, no textures). Build new armor with `hq.py`, add textures, and save it in the model library ([3d playbook](../../../domains/3d/playbook.md)).

## Steps (live tab, permanent: write each stage the moment it is made)
1. Write a set generator on `hq.py` (`plate`, `rbox`, `lathe`, `rivet`, `tube`, `horn`...) that writes `OUT/geo/*.json` + `OUT/<stage>.json`, stages cuirass, pauldrons, arms, legs, helm; textures on every surface (textured_ratio >= 0.7).
2. Replacing a piece: build an update that deletes the old children of its groups (`{"__delete__": true}`) and adds the new objects, in the same write.
3. Reads with out_dir: use the gitignored .worktrees/ (scratchpad is refused). Project doc = collection `projects`, doc_id `<id>`. One ArtifactData batch per stage.
4. Equip: every group pops in (scale 0.01 → 1.2 → 0.95 → 1 over 0.32 s); the closed helm hides the head boxes the moment it lands.
5. Check: `tools/3d/detail` floor (`--class hero` for a set, `prop` for a lone helm) and the studio shots check on the tab read-back.

## Max-quality kit (`hq.py`, 2026-11-22): use this for every new or remade set
Owner rule: an older set is identity reference, never the quality bar. `hq.py` builds smooth,
curved, bevelled pieces: `plate` (curved shell, bulge, centre ridge, flare, rolled rim; `Plate.at/curve` put rivets and trims on
the face), `rbox`, `lathe`, `disc`, `sphere` (dome via cut), `rivet`, `torus`, `tube` (parallel-transport sweep), `horn`, `drip`,
`extrude`. Meshes are welded quads marked `smooth: 40` (angle), so curves shade smooth and creases stay crisp. Same groups/frames/
writer as `Kit`, docs split under 190 KB.
- Audit: `python hq.py OUT` must print `clean` (no holes, no flipped faces). Preview: `python preview.py OUT x.png --focus CP`
  (painter-sorted flat preview with the rig boxes; the studio shots render is the real look check).

## Files
| File | Does |
|---|---|
| `hq.py` | max-quality kit: curved plates, rims, rivets, tubes, horns; geo writer (`Kit`) |
| `preview.py` | fast shaded preview on the rig |

## Equip with liquid VFX (2026-11-21, Venomreaver)
1. `python tools/vfx/liquid/liquid.py OUT <preset> --check` → 4 sheets. Upload them as hub assets (Artifact publish `asset: true`); the tool refuses scratchpad paths, so copy them into the gitignored `.worktrees/` first.
2. One tex doc per layer: `projects/<id>/tex/fx-<preset>-<layer>` = `{"asset": "<id>"}`.
3. Rig, groups and equip clip: copy them from hub project `dragon-armor` (`R`, joints, the 8 body parts, `anims.equip`; drop tracks whose object is missing). No overkill (owner rule): ONE 4-layer burst when the last piece lands (parent R, pos 0,3,0.9, start ~4.05, size 6.5, `--air` sheets; grid 8, frames 64, life 1.4, fps 45.71, z +0.02 per layer), never one per piece.
4. Two batches: tex + geo (<= 50 writes), then the rest of the geo + `projects/<id>` + `meta/<id>`.
5. Check without signing in: studio `test/run.mjs shots` with SHOTS_TAB (geo/, project.json, meta.json, uploads.json = tex id → png path), `SHOTS_RENDER=1` for 1080p. Deps: `npm i three@0.186.1 three-mesh-bvh@0.9.16 three-bvh-csg@0.0.18 mp4-muxer@5.2.2 playwright` in scratch, `CHROME=<chrome.exe>`. About 10 s per run.
