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
| Surfaces flicker on iPhone, clean on desktop | Phone depth buffer far coarser: same-facing faces 3-12 cm apart fight | `python tools/3d/zfight/zfight.py check` then `fix` on the tab read-back; inlay one plane, floors' base 10 cm under; check with `SHOTS_DEPTH16=1` | 2026-11-17 |
| zfight PASS but phone still flickers | Gate checks meshes only; overlapping Parts invisible to it | Batch parts into meshes first, then run the gate | 2026-11-19 |
| zfight FAIL on a shatter/swap build | Gate ignores `visible` over time: whole object and its pieces overlap but never show together | Expected false positive; check the swap frame in shots instead | 2026-11-21 |
| Trim/visor/plate 2-8 cm proud of a face flickers | Near-coplanar stacking | Stand ≥ 15 cm clear, or sit behind the face | 2026-11-19 |
| Octagon of boxes flickers at corners | Coplanar overlapping tops | Horizontal octagonal slabs = one ring mesh; boxes only for vertical walls | 2026-11-19 |
| Hand-wound polar mesh inside-out (faces down) | Winding by reversing lists | Set winding by Newell-normal score (`facing()`), never by reversing | 2026-11-19 |
| Glow meshes sit inside walls | Built with a separate transform stack | Meshes built together share one transform stack | 2026-11-17 |
| Mirrored side feature on the inner face | Sign error on "outer" | Look at a side view of every mirrored piece before moving on | 2026-11-17 |
| Neon glow hidden | Opaque lamp cage in front | Glow behind glass, metal only at the corners | 2026-11-19 |
| Animate froze the iPhone | Shadow map redrawn per frame × 711 draw calls; whole-build root bob | Bake static parts (~150 calls max), never animate the root of a big build | 2026-11-19 |
| Changing an early stage breaks later stages | Positional object ids shift | Re-send the whole doc (keep env/camera from read-back) or diff full builds | 2026-11-19 |
| Tab refuses a write | Doc > 225 KB | Split geo docs (< 200-220 KB) or coarser studio copy; fix in the next tab write | 2026-11-13 |
| Voxel build 3,338 parts, doc 309 KB | Per-voxel colour noise blocks greedy merge | Vary colour per patch/window/stripe | 2026-11-13 |
| Studio test boot fails: module missing from modulepreload | New boot module (e.g. plugins/ui.js) added without `<link rel="modulepreload">` | Add the link in `tools/3d/studio/index.html` | 2026-11-21 |
| Studio test: no local libraries / boot 404 | `DEPS` lacks three etc. | `DEPS=<scratch>/node_modules` with three@0.186.1, three-mesh-bvh, three-bvh-csg, mp4-muxer | 2026-11-21 |
| Playwright `Executable doesn't exist` on PC | Playwright browsers not installed | `CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe"` (tools read it) | 2026-11-21 |
| `PCFSoftShadowMap` missing / warns | three r186 dropped it | Use `PCFShadowMap` | 2026-11-13 |
| Fast sword cut passes through the body | One 150° Euler key jump | `arc_keys` in-betweens (slerped wrist target + aim) — see [animation errors](domains/animation/errors.md) | 2026-11-16 |
| GUI text wraps before web fonts load | Box sized for the web font | Size for the widest fallback, plus `tsc` (scale to fit) | 2026-11-19 |
| beast build: `No such file 'sheets/...png'` | VFX flipbook sheets not passed | `--sheets DIR` built from the VFX sheet library ([vfx](domains/vfx/index.md)) | 2026-11-21 |
