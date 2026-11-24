# avatar

Roblox avatar renders from the real catalog items: body package meshes, accessories, classic shirt/pants templates and the face, fetched without a login, rigged and posed as a studio tab and rendered by the studio (owner: studio only, no outside 3D modeling software). First piece: the default bacon hair (2026-11-13), owner rule: use the actual items, never guessed colours or shapes.

## Quick path: an animation + effect
No code reading: everything below is the API.
1. Key poses in `POSES` (arms by Euler; a held blade by `aim`, its direction in the root frame), a clip in `CLIPS` `[(s, pose)]`; cards in `fx.json` next to their sheets: any effect is a flipbook recipe (its docs/recipes.md: `vfx.py OUT 'preset:element=Ne'`, 4 s).
2. `python3 avatar.py KIT OUT --pose P --clip C --fx fx.json --name Name` (1 s).
3. Check + render (15 s): in the studio tool, `SHOTS_TAB=OUT/studio SHOTS_AT=1,2,3 SHOTS_RENDER=1 SCRATCH=<scratchpad> node test/run.mjs shots` → `shots/shots.jpg` and `shots/render.png` (1920x1080); add `SHOTS_VIDEO=1` for `shots/clip.mp4` (the whole clip); send them.
4. One Artifact call uploads `OUT/studio/uploads.json` (`asset: true`, `file_paths`); one ArtifactData batch from `OUT/writes.json` (fill each `<upload id>`). Same tab again: only `set projects/<id>` ← `OUT/studio/project.json` (pin `if_version`).

## Steps
1. Setup: none beyond numpy and pillow (3D maths is in `vmath.py`); the studio's test deps ([studio note](../../../domains/3d/studio.md), [tests](../studio/docs/tests.md)) for the render.
2. Item ids: `https://catalog.roblox.com/v1/search/items?keyword=<name>` (asset ids); a bundle's body parts: `https://catalog.roblox.com/v1/bundles/<id>/details`. Bacon hair default: Man bundle 238 (parts 86500008, 86500036, 86500054, 86500064, 86500078), Pal Hair 63690008, Blue and Black Motorcycle Shirt 144076358, Dark Green Jeans 144076760, Smile 144075659, skin BrickColor White `#F2F3F3`.
3. Kit (~15 s): by ids, `python3 catalog.py KIT --body <ids> --hair <ids> --shirt <id> --pants <id> --face <id>`; or `--user <username>` (everything that avatar wears now: R6 or R15, body colours, headless, T-shirt; layered clothing is listed as skipped) → `KIT/kit.json`, meshes, templates, `KIT/refs/*.png` (the catalog thumbnails: look once to confirm colours).
4. Build: `python3 avatar.py KIT OUT` (~1 s). Pose: `--pose wave|stand|...` (`POSES` at the top of `avatar.py`: joints in the rig frame, degrees; R6 uses Root, Neck, shoulders, hips).
5. Studio tab (`--clip kamehameha` adds its animation): the avatar is the studio's own rig, a group per joint at its pivot with the meshes at rest under it, so the studio's animator poses it; the pose is the groups' rotations and a clip is smooth key poses on them (Animate mode, play). Never bake a pose into the meshes (owner). Then upload every file in `OUT/studio/uploads.json` in one Artifact call (`asset: true`, `file_paths`); its tex doc is `{"asset": id}`. `OUT/batches.json` lists the db writes: `["geo", id]` = `set projects/<id>/geo/<id>` ← `OUT/studio/geo/<id>.json`; `["tex", t]` = `projects/<id>/tex/<t>` ← `{"asset": <its upload id>}`; `["project"]`, `["meta"]` ← `OUT/studio/project.json`, `meta.json` (has the thumbnail). Replacing a tab (same piece): pin `if_version` and `delete` geo/tex docs the new project no longer uses.

## Faces
- `faces.py OUT.png shocked|scared|grin|cry|smirk [--skin #f2f3f3] [--size 512]`: an expression head texture in the kit's face.png layout (eyes y 0.29, mouth y 0.68), thumbnail-style (white eyes with ink rims, raised brows, open mouth with teeth and tongue). Set it as the Head mesh's texture so the real avatar shows the expression.

## Poses and clips
- `POSES`: joint name -> Euler degrees in the rig frame (right -X, front -Y, up Z), plus optional `ik`: `{side: (wrist target, elbow direction)}` in the root's frame, solved by two-bone IK (`ik_arm`), so hand placement is named, not guessed.
- `CLIPS`: `[(seconds, pose)]`; each joint that moves gets `rot` keys with the `smooth` ease, the root gets `pos` keys (feet on the ground in every key). Studio rotations are three.js XYZ (= 'ZYX' of the converted matrix); checked 2026-11-16: the rig matches the old build exactly (every joint, key and body vertex).
- Saber (2026-11-13): `--pose saber_guard --clip lightsaber` (ready, guard, wind-up, slash, low, high cut, guard, 5.2 s) with a `blade` card `{kind: blade, sheet: lightsaber-blade.png, length 4.2, size 0.9, speed 18, show [0.7, 4.75]}`: studio-only (no still), hilt parts plus a 3D blade on the right hand along the grip (forward at rest: the arm's forward raise aims it, -90 = up); it ignites and retracts at `speed`. Held blades aim by `aim` (a direction), never guessed Euler.
- Heavy greatsword (2026-11-16, replaces the saber-style dragon sword): `--pose gs_ready --clip greatsword` with cards `[{kind: greatsword, length 4.6}, {kind: swing, sheet: {file: greatsword-swing.png, frames 64, fps 66}, show: [1.75, 2.16], fade 0.6}]`. Two-handed (`two_hand: true`: the left wrist IKs to the grip below the right), right wrist by `ik`, blade by `aim`. Weight is timing: slow lift, long wind-up with the tip sagging behind, a held beat, a fast cut, a braked low follow-through, slow recovery.
- Dragon sword (`kind: greatsword`): serrated dragon-tooth blade (steel + glowing crimson edge + vein), a dragon-head guard (the blade leaves its open jaws; fangs, swept horns, glowing eyes), bat wings with gold finger bones, dragon-hide grip with rings, a claw pommel holding a glowing orb. The cut is 0.22 s at 60 fps (clip fps 60) after a held beat; the swing card `fade` 0.8 s leaves room for the lingering embers, its size is 3.6 x the tip radius so the flyoff stays inside the cell; the swing sheet is the 4-layer stack flame-arc + `dragon` + slash + embers from `OUT/swing-recipe.txt`.
- Macarena emote (2026-11-24): `--pose mac_ready --clip macarena`, 103 BPM, 16 beats = 9.33 s loop, hands from `MAC_HAND` (right side; left mirrors). Beats 1-4 forward-arm targets still read sideways (queued fix). Pose key `shift: (x, y, hop)` offsets the root (root frame) and lifts it off the ground for hops.
- Fast cuts: never one key jump (a 150 deg Euler lerp cuts through the body or over the wrong shoulder). `arc_keys([(t, pose, ease), ...])` adds solved in-betweens (wrist target and aim turned by slerp) so the tip draws a clean arc; clip keys take an optional ease `(t, pose, ease)`.
- Swing trail (`kind: swing`): `avatar.py` samples the studio's own key sampling over `show`, fits the tip path's plane and circle, writes `OUT/swing-recipe.txt` (the 4-layer flipbook stack with the real start/end angles, radius, sweep frames and progress curve `prog`), places a `flat` flipbook in that plane at the circle centre, and aims the tab camera square to the cut. Steps: run avatar.py, build the sheet with the flipbook tool from that recipe, run avatar.py again only if the clip changed, then the shots check with `SHOTS_CAM` = the project camera.

## Effects (`--fx fx.json`, with `--aspect 16:9 --bg #0b0f1a`)
- `{"frame_len": studs, "cards": [...], "lights": [...]}`; paths relative to the JSON. A card: `image` (straight-alpha PNG), `kind` `beam` (starts at the hands, runs `length` along the arms' aim, `width` wide, turned about its axis to face the camera) or billboard (`size`), `start` (studs along the aim), `strength`, optional `sheet` `{file, frames, fps}` (its 128 px flipbook: the studio copy gets `flipbook` objects, a beam as one 3D beam, `shape: "beam"` along the aim, shooting out at `speed`, default 60 studs/s), and for the studio clip `pose` (where it sits), `follow: hands` (rides the right hand), `show: [t0, t1]`, `grow: [[t, scale]]`. Effect tabs get a dark sky: additive glow on white is invisible. A light: `along`, `color`, `energy`, `radius` (point lights in the effect's colour).
- Cards with `sheet` become studio flipbooks (additive glow); `image`-only cards and `lights` are not supported and are ignored.
- Kamehameha (2026-11-13): `--pose kamehameha` with the flipbook tool's `kamehameha.py --render 2048` stills; frame_len 5.5, beam start -1.6 length 15 width 3.6 strength 3.2, charge size 2.6 strength 3.5, lights 600 and 900 W.

## Files
| File | Does |
|---|---|
| `rbx.py` | reads Roblox models (binary with LZ4, or XML) and meshes (v1 text to v5), no dependencies |
| `catalog.py` | asset ids → kit: R15 MeshParts with CFrames, sizes and rig attachments; accessories; images |
| `avatar.py` | kit → rigged, posed, animated studio tab (a small transform tree, `vmath.py`) |

## How it works
- R6: classic sharp blocks (torso 2x2x1, limbs 1x2x1, Motor6D pivots at the torso edges); each limb takes the whole template strip.
- Body (R15): each R15 MeshPart mesh is scaled to its `size` and placed at its CFrame (`R15ArtistIntent`); joints are the rig attachments; `to_b` turns Roblox (Y up, faces -Z, right +X) into the rig frame (Z up, faces -Y, right -X).
- Clothing: R15 mesh UVs point into Roblox's composite layout, not the classic template, so each limb is box-projected onto the template (face by triangle normal; per-part height slices as in Roblox's R15 composite: upper limb 46%, lower 34%, hand/foot 20%; torso 75/25). Pants under shirt, over skin.
- Head: the classic 1.2-stud head; the face image spans 1.4 studs, centred (eyes 0.30 above centre, as in Roblox's own thumbnail). Accessories: Handle = body part × its attachment × the handle attachment⁻¹, rotation included; MeshPart handles scale to their size.

## Known issues
- Clothing is a close match to Roblox's composite, not pixel-exact at the seams.
- Not rendered: layered clothing (needs cage wrapping) and dynamic heads; skinned (v4+ bone) meshes use their rest pose.
- `--user` needs users.roblox.com and avatar.roblox.com on the environment's allowed hosts, and the owner's go-ahead for the lookup.
