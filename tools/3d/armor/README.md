# armor

Blocky, high-detail dragon armor (an original ember-wyrm design) fitted to the studio's R6 rig, built stage by stage straight into the live tab (numpy, ~1 s a stage). Notes: [3d playbook](../../../domains/3d/playbook.md); owner reference image [dragon-armor-reference.jpg](../../../.claude/references/dragon-armor-reference.jpg).

## Steps (live tab, permanent: write each stage the moment it is made; never inspect, size or render outputs before they are in the tab)
1. `python3 armor.py OUT <stage>`, stage = cuirass, pauldrons, arms, legs, helm → `OUT/geo/*.json` (each doc split under 200 KB) and `OUT/<stage>.json` (objects to merge into `projects/<id>`).
2. Replacing a piece: build an update that deletes the old children of its groups (`{"__delete__": true}`) and adds the new objects, in the same write.
3. One ArtifactData batch per stage: the geo docs (`projects/<id>/geo/<gid>`) plus the project update pinned with `if_version`; keep a batch under 1 MiB (split geo over two batches if needed, the project update last).
4. Equip: every group pops in (scale 0.01 → 1.2 → 0.95 → 1 over 0.32 s, visible from the pop); the closed helm hides the head boxes the moment it lands.
5. Check: the studio shots check on geo and project read back from the tab.

## How it works
- Only crisp low-poly convex solids: boxes, chamfered octagon plates, shield-shaped scale tiles in offset rows, stepped frustum horns along a bezier, pyramid spikes, claws and talons, triangular fins; every face is turned outward from its solid's centre.
- Fit: each piece is sized from the rig's own parts (torso 2x2x1, limbs 1x2x1, head 1.2) a few hundredths proud of the surface, in the joint groups, so it follows every pose. Left pieces are built and mirrored for the right.
- One flat-shaded mesh per material per group: plate `#b3121b`, scale `#d3232b`, deep `#5e070d`, gold `#d8a842`, dark `#17100f`, bone `#efe1ba`, horn `#b79a62`, ember neon `#ff5a14`.
- Groups: CP cuirass, LS/RS pauldrons, LV/RV vambraces and gauntlets, LG/RG cuisses, knees and greaves, LB/RB sabatons, HM dragon helm (snout, fangs, slanted ember eyes, fire in the mouth, swept horns, crest fins).

## More sets (`sets.py`)
`python3 sets.py OUT <frost|solar|storm|poison> <stage>`: the same rig, groups and stages. poison = Venomreaver (moss-green plate, toxin vials and canisters, plague-mask helm with glowing lenses and a respirator snout, acid drips; built 2026-11-21, hub project `venomreaver-p01s`). frost = Rimeguard (ice-steel knight, crystal clusters, T-visor great helm, ice crown); solar = Dawnbringer (white-and-gold paladin, sunbursts, feather wings, cross-slit helm, halo); storm = Storm Ronin (laced lamellar samurai, sode, kabuto with horns and a lightning maedate, oni mask). Each set is its own new tab: the first batch sets the project (rig + equip clip + cuirass) and `meta` with `building: true`; two more batches add pauldrons+arms and legs+helm, the last sets `building: false`.

## Files
| File | Does |
|---|---|
| `solids.py` | the solids, mirroring, the geo writer (`Kit`) |
| `armor.py` | the ember-wyrm dragon set |
| `sets.py` | the frost, solar and storm sets |

## Equip with liquid VFX (2026-11-21, Venomreaver)
1. `python tools/vfx/liquid/liquid.py OUT <preset> --check` → 4 sheets. Upload them as hub assets (Artifact publish `asset: true`); the tool refuses scratchpad paths, so copy them into the gitignored `.worktrees/` first.
2. One tex doc per layer: `projects/<id>/tex/fx-<preset>-<layer>` = `{"asset": "<id>"}`.
3. Rig, groups and equip clip: copy them from hub project `dragon-armor` (`R`, joints, the 8 body parts, `anims.equip`; drop tracks whose object is missing). At each of its 7 pop times, stack 4 flipbooks (mist, body, drops, glow; grid 8, frames 64, life 1.4, fps 45.71, same parent and size as the dragon burst, z +0.02 per layer).
4. Two batches: tex + geo (<= 50 writes), then the rest of the geo + `projects/<id>` + `meta/<id>`.
5. Check without signing in: studio `test/run.mjs shots` with SHOTS_TAB (geo/, project.json, meta.json, uploads.json = tex id → png path), `SHOTS_RENDER=1` for 1080p. Deps: `npm i three@0.186.1 three-mesh-bvh@0.9.16 three-bvh-csg@0.0.18 mp4-muxer@5.2.2 playwright` in scratch, `CHROME=<chrome.exe>`. About 10 s per run.
