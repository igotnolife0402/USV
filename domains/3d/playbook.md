---
summary: Fastest proven path to quality 3D: Blender MCP with asset libraries first, three.js editor base for mini-Blender, mobile Artifacts
updated: 2026-11-21
status: current
triggers: [blender mcp, 3d model, three.js editor, mini-blender, glb]
---
# 3D playbook

## Pick the route
| Ask | Route |
|---|---|
| A model/scene/render | Blender MCP (PC) → export GLB |
| 3D on a web page / viewer | three.js + GLTFLoader |
| "Mini-Blender" / browser 3D editor | Fork three.js editor (MIT, github.com/mrdoob/three.js/tree/dev/editor), strip and extend |
| Asset for Roblox | Blender → FBX/GLB within [Roblox limits](domains/roblox/pipeline.md) |

## PC (/pc)
### Blender MCP (github.com/ahujasid/blender-mcp)
1. `get_addon_status` then `get_scene_info` first: Blender version, enabled libraries/generators.
2. Save the .blend before every `execute_blender_code` (`bpy.ops.wm.save_mainfile()`); a bad script can crash Blender.
3. Split complex ops into small scripts (one object/material/modifier stack per call); `look` after each meaningful step with small `max_size`.
4. Asset libraries before modelling: `search_assets` / `import_asset` from Poly Haven (HDRIs, textures, models), Sketchfab, Poly Pizza. `generate_3d` only for one bespoke object (1-3 min, may cost credit), never a whole scene.
5. Imports arrive at arbitrary scale: read `world_bounding_box`, scale to real size (meters), set on ground (min z = 0).
6. Shader nodes by type, never by name (`n.type == "BSDF_PRINCIPLED"`); read enum identifiers, never hardcode; colors on node inputs, not `diffuse_color`.
7. Lighting: Poly Haven HDRI + one key light; camera 50 mm, rule-of-thirds framing; render Eevee for speed, Cycles for finals.
8. Export GLB per [pipeline](domains/3d/pipeline.md); verify by loading in a three.js page or `look`.

### Browser mini-Blender (< 30 min complex tier)
1. Copy three.js `editor/` at a pinned release tag (e.g. r170) into `editor/`; keep its MIT LICENSE.
2. It already has: scene tree, transform gizmos, material panel, import/export glTF, undo, scripting. Do not rebuild these.
3. Strip menus you don't need; add features as new `Sidebar.*.js`/`Menubar.*.js` modules following its signals pattern.
4. Serve (`npx serve editor`), test with playwright-mcp: add mesh, move, undo, export GLB, console clean.

## Mobile fallback (/mobile)
- No Blender, no browser automation, no local files.
- Build three.js scenes as Artifacts: procedural geometry (Box/Sphere/Lathe/Extrude, merged), MeshStandardMaterial, pinned CDN import map. No external GLB/HDRI loads; use RoomEnvironment for reflections.
- Write Blender scripts as repo files `*.blend.py` for later execution; append to [queue/pc.md](queue/pc.md):
  `- [ ] 2026-11-21 run models/chair.blend.py in Blender MCP, export GLB, look — 3d chair asset`
- Editor work: edit repo files of the forked editor; queue the browser test.

## Quality bar
- Real-world scale (1 unit = 1 m), origin at base center, transforms applied, +Y up in GLB.
- Clean normals (no black faces), smooth shading with auto-smooth/weighted normals where curved.
- PBR materials (baseColor, roughness, metallic, normal); textures ≤ 2048 px, ≤ 1024 for web/Roblox.
- Web GLB ≤ 5 MB (Draco/meshopt), ≤ 100k tris per scene for mobile.
- Lit to read form: environment + key light, shadows on, tone mapping ACES/AgX, sRGB output.

## Speed tricks
- Library asset + material tweak beats modelling from scratch 10x.
- Kitbash: arrays, mirror, bevel modifiers; low-poly style hides detail cost.
- Geometry Nodes scatter for nature instead of hand placement.
- In three.js, `OrbitControls` + `RoomEnvironment` + ACES = instant good look.

## Done
Run [checklists/3d.md](checklists/3d.md). Add new failures to [errors](domains/3d/errors.md).
