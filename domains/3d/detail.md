---
summary: Detail floor for every generated model: custom meshes, textures, many combined parts, layered passes, and the gate.
updated: 2026-11-22
status: current
triggers: [detail, detailed, high detail, polished, cheap, low quality, haiku quality, textures, meshes, model quality, generate model, make a model, build a model]
---
# Detail floor (owner 2026-11-22: "Opus is making Haiku-quality models")
Applies to every model from every route: Umbrio Sandbox / Studio generators, Blender, rbxforge-build, rbxforge-mesh, Roblox Studio builds. A model that fails the gate is not done. This note beats older "simple/catalog/SmoothPlastic-only" rules.

## Why models came out cheap (root causes, fixed here)
- Time tiers allowed "monster/sword = 1 call, 1 min" → a few primitives. Now: tier sets speed of the PROCESS, never the detail floor.
- "SmoothPlastic only, no textures" rule (rbxforge) → flat plastic. Now: textured surfaces are required.
- No measurable check → self-judged "looks fine". Now: the gate below.

## How to build (every model, in order)
1. **Real reference first**: what does the real/ideal thing consist of? List its sub-parts (a sword: pommel, grip wrap, guard, ricasso, fuller, edge bevel, engravings). Owner refs in `.claude/references/`.
2. **Primary forms** as custom meshes, not raw primitives: swept tubes with taper (limbs, horns, handles), lathes (pommels, vases, domes), bevelled extrusions (blades, plates, signs), sculpted blobs (heads, rocks). Kits: `tools/3d/armor/hq.py` (lathe, sweep, rounded box, shell plate), MeshForge `lathe/tube/extrude/rock` in Roblox, Blender modifiers (bevel, subdivision, solidify).
3. **Secondary forms** as separate combined parts: trims, rims, straps, rivets, bolts, ridges, scales, teeth, claws, panel seams, hinges. Each sits proud (>= 0.04 studs / 1 cm), never coplanar (zfight).
4. **Tertiary detail**: chips, wear, rings, grooves, engraving lines, stitches; vary size/rotation (no perfect repetition).
5. **Surfaces**: every non-glow part gets a texture or textured material. Studio: procedural textures (`rock, woodgrain, brushed, fabric, carbon, grip...`, colours [base, dark, light]) or painted/image; Roblox: MeshPart TextureID / SurfaceAppearance / real materials (Metal, Wood, Slate, Fabric...) and Texture children. Colour bands: darker low/recesses, lighter high. Glow = Neon parts (owner-style), sparingly.
6. **Gate** (below), fix fails, then the visual check (Studio shots / Blender look / Roblox export render; never the Studio camera).

## Gate (one command, pass/fail; thresholds in [floor.json](../../tools/3d/detail/floor.json))
- Studio / Umbrio Sandbox project: `python tools/3d/detail/detail.py check project.json geo/ --class prop|hero|scene`.
- Roblox model: run [tools/roblox/detail.luau](../../tools/roblox/detail.luau) via execute_luau (swap MODEL_NAME), save the JSON, `node tools/roblox/detail-check.mjs metrics.json --class hero`.
- Class: `prop` (hand-held item, furniture, small object), `hero` (creature, character, weapon showcase, vehicle, armor set), `scene` (building, environment).
- Hero floor: >= 40 parts, >= 60% custom meshes, >= 70% textured, >= 6 colours, >= 3 surface types, >= 15k tris, no size group over 25%; every mesh <= 19k tris (Roblox cap 20k).
- Fail → add the missing detail pass (never lower floor.json; only the owner changes it).

## Templates that pass (copy their approach)
- [beast/shadow_mesh.py](../../tools/3d/beast/shadow_mesh.py): 476 custom meshes, 176k tris, 8 procedural textures (100% textured), Neon glow parts.
- [armor/hq.py](../../tools/3d/armor/hq.py) + `vhq_*.py`: bevelled curved plates, rolled rims, rivets, tubes.
