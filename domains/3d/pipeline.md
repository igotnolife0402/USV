---
summary: 3D asset pipeline: Blender MCP build, GLB export settings, compression, three.js loading, Roblox export
updated: 2026-11-21
status: current
triggers: [gltf export, glb export, draco, gltf-transform, model pipeline]
---
# 3D pipeline

## 1. Layout
```
models/<name>.blend.py   Blender script that builds the asset (re-runnable, versioned)
models/<name>.blend      working file (PC, optional in repo if small)
models/<name>.glb        export (web/game)
models/<name>.fbx        export (Roblox skinned, if needed)
editor/                  forked three.js editor (pinned tag, MIT LICENSE kept)
```

## 2. Build in Blender (PC, Blender MCP)
1. `get_addon_status`, `get_scene_info`. Save file.
2. Library first: `search_assets` → `import_asset` (Poly Haven/Sketchfab/Poly Pizza). Else model via small `execute_blender_code` scripts, saving before each.
3. Normalize: scale by `world_bounding_box`, origin to base center, apply transforms, recalc normals.
4. Materials: Principled BSDF + image textures only (glTF-compatible). Bake procedurals to textures.
5. `look` to verify.

## 3. GLB export settings
```python
bpy.ops.export_scene.gltf(filepath="models/x.glb", export_format='GLB',
  use_selection=True, export_apply=True, export_yup=True,
  export_texcoords=True, export_normals=True, export_materials='EXPORT',
  export_image_format='AUTO', export_draco_mesh_compression_enable=False)
```
Then compress (PC): `npx @gltf-transform/cli optimize x.glb x.min.glb --compress meshopt --texture-compress webp`.
Parameter names vary by Blender version: on TypeError, inspect `bpy.ops.export_scene.gltf.get_rna_type().properties`.

## 4. Budgets
| Target | Tris | Textures | File |
|---|---|---|---|
| Web hero model | ≤ 50k | ≤ 2048 px, webp | ≤ 5 MB |
| Mobile web scene | ≤ 100k total | ≤ 1024 px | ≤ 10 MB |
| Roblox MeshPart | ≤ 20k per mesh | ≤ 1024 px | see [roblox pipeline](domains/roblox/pipeline.md) |

## 5. Load in three.js
Import map pinned (`three@0.170.0` + `three/addons/`), `GLTFLoader` (+ `MeshoptDecoder` or `DRACOLoader` if compressed), `RoomEnvironment` env, ACES tone mapping, sRGB output. Snippet in [snippets](domains/3d/snippets/README.md).

## 6. Roblox export
Scale: 1 stud = 0.28 m (export scale ≈ 3.57 if modelled in meters, or set unit scale). FBX/GLB, apply transforms, ≤ 20k tris, one material per MeshPart, import with Studio 3D Importer.

## 7. Mobile
Write `models/<name>.blend.py` + three.js Artifact preview with procedural stand-in; queue the Blender run in [queue/pc.md](queue/pc.md).
