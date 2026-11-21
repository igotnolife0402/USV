---
summary: Known Blender MCP, glTF/GLB and three.js failures with cause and fix
updated: 2026-11-21
status: current
triggers: [blender error, gltf error, three.js black, model invisible, normals]
---
# 3D errors

| Symptom | Cause | Fix | Seen |
|---|---|---|---|
| Blender froze/crashed mid-script, work lost | Heavy/broken execute_blender_code without saving | Save before every call; split ops into small scripts | 2026-11-21 |
| `KeyError: 'Principled BSDF'` | Node names are localized | Find node by `n.type == "BSDF_PRINCIPLED"` | 2026-11-21 |
| `TypeError: enum "X" not found` setting engine/format | Enum identifiers differ by version | Read `bl_rna.properties[...].enum_items`; try/except TypeError | 2026-11-21 |
| Material color right in viewport, wrong in render | Set `material.diffuse_color` (viewport only) | Set Base Color input on the Principled node | 2026-11-21 |
| Imported model is huge/tiny or below floor | Library/generated assets arrive at arbitrary scale | Scale by `world_bounding_box` to real size; min z = 0 | 2026-11-21 |
| GLB rotated 90° or lying down | Z-up vs Y-up mismatch | Export glTF with "+Y Up" on; apply rotation before export | 2026-11-21 |
| Model stretched/offset after export | Unapplied scale/rotation | Ctrl+A apply all transforms (or `bpy.ops.object.transform_apply`) | 2026-11-21 |
| Black or inside-out faces | Flipped normals | Recalculate outside (`bpy.ops.mesh.normals_make_consistent`) | 2026-11-21 |
| three.js model black | No lights or no environment for PBR | Add `RoomEnvironment` via PMREMGenerator + a DirectionalLight | 2026-11-21 |
| three.js colors washed out | Wrong color space | `renderer.outputColorSpace = SRGBColorSpace`; color textures `SRGBColorSpace` | 2026-11-21 |
| GLTFLoader 404 / CORS in Artifact | External assets blocked in Artifacts | Procedural geometry or embedded data URI | 2026-11-21 |
| `THREE.GLTFLoader: No DRACOLoader instance provided` | Draco-compressed GLB | `loader.setDRACOLoader(new DRACOLoader().setDecoderPath(pinnedUrl))` | 2026-11-21 |
| Import errors: `Failed to resolve module specifier "three"` | Missing import map | Add `<script type="importmap">` mapping `three` and `three/addons/` to pinned version | 2026-11-21 |
| Textures missing after GLB export | Image textures not packed / unsupported nodes | Use Principled BSDF + Image Texture only; bake procedurals | 2026-11-21 |
| Z-fighting flicker | Coplanar faces or near/far ratio too large | Offset faces; camera near 0.1, far ≤ 1000 | 2026-11-21 |
| Editor fork breaks after updating three | Editor and three versions mismatched | Pin both to the same release tag | 2026-11-21 |
