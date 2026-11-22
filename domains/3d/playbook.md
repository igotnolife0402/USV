---
summary: Fastest proven path to quality 3D: Blender MCP with asset libraries first, three.js editor base for mini-Blender, mobile Artifacts
updated: 2026-11-21
status: current
triggers: [blender mcp, 3d model, three.js editor, mini-blender, glb, armor, avatar, creature, voxel, props, rig, catalog, zfight]
---
# 3D playbook

## Pick the route
| Ask | Route |
|---|---|
| A model/scene/render | Blender MCP (PC) → export GLB |
| 3D on a web page / viewer | three.js + GLTFLoader |
| "Mini-Blender" / browser 3D editor | Fork three.js editor (MIT, github.com/mrdoob/three.js/tree/dev/editor), strip and extend |
| Asset for Roblox | Blender → FBX/GLB within [Roblox limits](domains/roblox/pipeline.md) |

## Owner rules (permanent, from the old vault)
- **Detail floor first** ([detail.md](domains/3d/detail.md)): every model, every route; gate `tools/3d/detail/detail.py` must pass before done.
- Maximum quality unless the owner says otherwise: real modelled detail (curved plates, individual scales, horns), PBR metal, never placeholder blocks. An owner reference is the target to match (e.g. [dragon armor](.claude/references/dragon-armor-reference.jpg): glossy deep-red scaled plate, horned closed helm, spiked pauldrons, clawed gauntlets).
- Start from the closest tool below and reuse its README Steps and code; look once, never a render-rate-fix quality loop.
- Every finished piece goes in a fresh [Studio](domains/3d/studio.md) tab, the exact model, written the fastest way; live stages only when asked. Renders come from the Studio (Render image, shots check).
- Roblox items (avatars, hair, clothing): real catalog assets ([avatar](tools/3d/avatar/README.md) `catalog.py`), never guessed colours or shapes.
- Models = many separate parts (owner 2026-11-22, refs: bunk bed, wardrobe): spheres, capsules, cones, cylinders, wedges, each its own Studio part in joint groups, Neon parts for glow; never one fused mesh. Not plain primitives: each part a custom mesh (swept tubes with taper, muscle bulge, sinew/horn ridges, curved flattened claws; sculpted blobs) with procedural textures (rock skin, brushed horn). Template: [beast/shadow_mesh.py](../../tools/3d/beast/shadow_mesh.py) (476 meshes, 176k tris, 10 geo batches + 1 project write); layout in shadow_parts.py. Blocks/voxels only when the owner asks.
- No floating parts (owner 2026-11-22): every piece touches its joint group's body; an aura is a deliberate separate VFX layer, never stray geometry. Gate: `attach_check()` in [beast/shadow_mesh.py](../../tools/3d/beast/shadow_mesh.py) (seats small studs, fails the build on detached parts).
- Block builds (only when asked): build huge, ship at size (0.125-stud blocks on a 20-stud figure: orc 315k blocks → 108k tris); mixed block sizes.
- Ship meshes, not thousands of parts: ≤ 19k tris per MeshPart (Roblox cap 20k); neon glow stays as Neon parts (a mesh texture can't glow).
- Voxel builds: vary colour per window/patch/stripe, never per voxel (per-voxel shades blocked greedy merging: 3,338 parts vs 2,243).
- No z-fighting: [zfight](tools/3d/zfight/README.md) `check` passes on the tab read-back before a build is live or finished; never stack rugs, trims, glass or decals on a surface (one plane, or cut what's under); judge on phone depth (`SHOTS_DEPTH16=1`), never a desktop render.
- Studio copy = the exact export (mesh objects, palette texture, geo docs ≤ 225 KB) with a 2x-coarser `shadowOnly` stand-in.

## Which tool (tools/3d, details in [tools/3d/README.md](tools/3d/README.md))
| Request | Tool |
|---|---|
| Rigged, animated Roblox creature (mesh + kit + video) | [beast](tools/3d/beast/README.md) (`orc.py` humanoid, `dragon.py` winged) |
| Roblox avatar from catalog items, weapons, clips, faces | [avatar](tools/3d/avatar/README.md) |
| Realistic animal render or GLB | [creature](tools/3d/creature/README.md) (tiger: 19,552 tris, 741 KB, 3.57 studs/m, feet y=0) |
| Block build (city, buildings) as Parts | [voxel](tools/3d/voxel/README.md) (50x50 city: 2,243 Parts, 1.46 MB rbxmx) |
| Low-poly/cartoon props as meshes (ONLY when that style is asked; plain requests are realistic, see owner.md) | [props](tools/3d/props/README.md) (≤ 3k tris lowpoly, 12k toon) |
| Something that breaks (Voronoi pieces) | [shatter](tools/3d/shatter/README.md) |
| Armor sets fitted to the R6 rig + equip | [armor](tools/3d/armor/README.md) |
| Z-fighting / flicker check and fix | [zfight](tools/3d/zfight/README.md) |
| Editing by hand, export, render, MP4 | [studio](tools/3d/studio/README.md) |
| Realistic default (house, furniture, anything with no named style) or none fits | Blender MCP (asset libraries first, PBR) (PC) below, or a new generator modelled on the closest tool |

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
0. The owner already has one: [Studio](domains/3d/studio.md). Extend it with a plugin ([plugins doc](tools/3d/studio/docs/plugins.md)) unless a separate editor is explicitly asked.
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
- Python generators in [tools/3d](tools/3d/README.md) need numpy (+ Pillow); if the session has them, run with an OUT folder in scratch and write the Studio JSON; else queue the run.

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

- Building props (house, cottage): copy tools/3d/props/house.py; rbox seg=1 for trim, same-facing layers >= 15 cm proud or embedded, frames as 4 non-overlapping bars, so zfight passes first run (L-097).

## Done
Run [checklists/3d.md](checklists/3d.md). Add new failures to [errors](domains/3d/errors.md).
