---
summary: Getting vault output into Roblox Studio: .glb/.rbxmx imports, creature kits, effect-sheet asset ids, export rules, pre-delivery checks
updated: 2026-11-21
status: current
triggers: [rbxmx, rbxm, import into roblox, roblox export, kit, asset id, sheetassetids, 3d importer, insert from file]
---
# Roblox delivery (imports, kits, asset ids)

Generators that produce these files live in the 3D domain ([domains/3d/index.md](domains/3d/index.md)): creature kits (`tools/3d/beast`), Studio-scene exports (`tools/3d/studio`, `plugins/roblox.js`), maps (`tools/3d/voxel`; the old conemap generator was not ported). Effect sheets: [domains/vfx/index.md](domains/vfx/index.md).

## File types and how the owner imports them
| Deliverable | Studio action | Notes |
|---|---|---|
| `<Name>.glb` (meshes) | Avatar/Home → 3D Importer | Becomes a Model of MeshParts named after the segments. <= 19-20k tris per MeshPart ([pipeline](domains/roblox/pipeline.md) limits) |
| `<Name>Kit.rbxmx` (scripts + VFX) | Drag the kit into the imported model, press Play | Kit expects the importer to keep mesh names and placement |
| `<Map>.rbxmx` (parts + scripts) | Right-click Workspace → Insert from File (or drag in) | One file, nothing else to wire. 2,243 anchored Parts / 1.46 MB imported fine (Voxel City, 2026-11-13) |
| Effect sheets (zip of PNG flipbooks) | Owner uploads each PNG, pastes ids | See asset ids below |

## Kit layout (creature)
- `Rig` (server Script): builds Motor6Ds from the imported MeshParts, sets each emitter texture from `SheetAssetIds/<file>`.
- `Animator` (client LocalScript): smooth local animation, no network traffic.
- One motion spec drives the Lua, the studio clip and the video: never hand-edit the generated Lua, edit the spec.
- Glow colours export as Neon Parts (a mesh texture cannot glow).
- Map packages: server `Game` Script plus a disabled `Client` LocalScript that the server clones into each PlayerGui.

## Asset ids
- Ids only exist after the owner uploads (Creator Hub / Asset Manager). Never invent an id; leave a named slot (`SheetAssetIds` Folder of StringValues keyed by file name, or `AssetId` fields in a `VFXLibrary` module) and tell the owner which files go where.
- VFX library use: `VFX.make("explosion", part):Emit(1)`; loops: `VFX.make("black-hole", part).Enabled = true`.
- ParticleEmitter `FlipbookLayout` must match the sheet: 4x4 and 8x8 differ; a helper that hard-sets 4x4 needs the kit's own emitters for 8x8 sheets.
- Catalog items (avatars, hair, clothing): use real catalog asset ids (`https://catalog.roblox.com/v1/search/items?keyword=<name>`), never guessed colours or shapes.
- No ids available (cloud, nothing uploaded): animate with TweenService/physics instead of Animation assets, skip sounds, and say so.

## Export rules (so Studio gets real sizes and parts)
- Bake scale into sizes; no scaled groups (they do not survive export).
- Parts-only exports: box, sphere, cylinder. Keep spheres round and cylinders round; stretched ones export as mesh placeholders.
- Objects with `temp: true` (scaffolding) never export.
- Mass-repeated scenery as merged meshes; hero pieces stay real Parts.

## Checks before handing over (never skip)
1. `node tools/roblox/rbxmx-check.mjs <file>.rbxmx`: tags balance, every Ref resolves, scripts have Source. PASS required.
2. Scripts parse: `luau-lsp analyze` (PC) or at least a read for Lua 5.1/Luau grammar.
3. Maps: run the generator's own check (e.g. `tools/roblox/lobby/validate.mjs`).
4. Say which steps were not run in Roblox.

## PC (/pc)
- After the checks, test for real: Studio open (Studio MCP connected), Insert from File / 3D Importer, start play, read console via MCP, stop. Fix, max 3 tries.
- Still record in the reply that ids are pending until the owner uploads.

## Mobile fallback (/mobile)
- Build the files in the repo, run checks 1-3 (Node runs in cloud sessions), report "files checked, untested in Roblox".
- Queue: `- [ ] YYYY-MM-DD import <file> into Studio, paste asset ids into SheetAssetIds, playtest — <branch>` in [queue/pc.md](queue/pc.md).

## Umbrio Sandbox model -> Roblox, imported whole (verified 2026-11-22, Venomreaver)
Never rebuild in Studio by script (owner rule). Route that imports meshes + R6 rig + armor joints + animation as ONE asset:
1. Export the project with `roblox.export {link: true}` (rigs force this): `<name>.rbxmx` + `<name>-meshes.fbx`.
2. Open Cloud `POST /assets/v1/assets` assetType Model with the `-meshes.fbx` (upload folder must be approved in Studio: Assistant Settings > MCP Permissions). Poll the operation.
3. Read mesh ids without inserting: `game:GetObjects("rbxassetid://<id>")[1]`, calibrate with the UMBCAL cubes, JSON `{UMB00001: {id, size, rot}}` (importer turn was Ry180, scale 1).
4. Export again with `roblox.rbxmx {meshAssets}`: MeshParts carry MeshId + InitialSize, joints absorb the turn in C0/C1, no placeholders.
5. Upload that `.rbxmx` as Model with file `contentType: "model/x-rbxm"` (`model/x-rbxmx` is rejected "not supported yet"), then `insert_asset`.
6. Animation for in-game play: `roblox.rbxmx {animOnly: true}` -> upload as assetType Animation (contentType model/x-rbxm) -> pass `animAssets: {"<clip name>": "rbxassetid://<id>"}`.
7. VFX: upload each flipbook sheet .png as assetType Decal, read the image id via `game:GetObjects("rbxassetid://<decal>")[1].Texture`, pass `textureAssets: {<tex id>: image id}`: flipbooks become ParticleEmitters (Grid8x8, OneShot, Rate 0, ZOffset over the body, StartTime NumberValue).
8. The model then carries an Animation + Script UmbrioPlay: plays the clip, shows each piece at its ShowAt (Roblox poses can't hide parts), hides at HideAt, Emits effects at StartTime, every loop. Verified in play mode 2026-11-22: bare rig -> boots 2 s -> full armor + poison burst 4.1 s.
