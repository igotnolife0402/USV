---
summary: 3D domain entry: Umbrio Sandbox models (default), tools/3d generators, Blender only when named, GLB assets
updated: 2026-11-22
status: current
triggers: [studio tab, zfight, z-fighting, flicker, armor, avatar, creature, voxel, props, 3d, blender, model, mesh, gltf, glb, three.js, threejs, scene, editor, mini-blender, render, low poly]
---
# 3D

- [rules](domains/3d/rules.md): every applied lesson rule for this domain; read with the playbook.

Models, scenes and 3D editors. PC: Blender MCP + asset libraries. Mobile: three.js Artifacts + procedural geometry in repo files.

## Read in this order
- FIRST for any model: [Umbrio build in one read](domains/3d/umbrio-build.md): template, units, textures, z-fight-safe layout, gates, write format. Usually the only note needed.
- Quality bar: [ref-quality.md](domains/3d/ref-quality.md) owner reference photos as 8 build rules (rounded silhouettes, assemblies, contact, palette, materials, glow, props, proportions); read before any realistic model.
- Template lookup: [tools/3d/styles/](tools/3d/styles/) one catalog per style (every model, run, api/constants with line numbers); read one, never open templates one by one. Regenerate: `node tools/3d/styles/build.mjs --check`.
0. [Detail floor](domains/3d/detail.md): EVERY model meets it (meshes, textures, many parts) + gate. Read before any model.
1. [Playbook](domains/3d/playbook.md): fastest path, PC vs mobile, quality bar.
2. [Errors](domains/3d/errors.md): symptom → fix table.
3. [Pipeline](domains/3d/pipeline.md): Blender → GLB export, three.js load, Roblox export.
4. [Snippets](domains/3d/snippets/README.md): bpy and three.js known-good code.
5. [Studio](domains/3d/studio.md): the owner's web 3D editor (tools/3d/studio): data, live builds, speed caps, tests, shots check.

## Tools
- [tools/3d](tools/3d/README.md): studio, zfight gate, props, shatter, voxel, creature, beast, avatar, armor (which-tool table in the playbook).
- Owner reference images: [.claude/references/](.claude/references/dragon-armor-reference.jpg) (dragon armor).

## Skill and done
- Skill: [3d-editor](.claude/skills/3d-editor/SKILL.md)
- Done: [checklists/3d.md](checklists/3d.md)
- Modes: [profiles/pc.md](profiles/pc.md), [profiles/mobile.md](profiles/mobile.md); PC-only leftovers → [queue/pc.md](queue/pc.md)

## Related domains
- [Web](domains/web/index.md): page shell for three.js viewers.
- [Games](domains/games/index.md): 3D browser games.
- [VFX](domains/vfx/index.md): shaders, post-processing.
- [Roblox](domains/roblox/index.md): mesh limits for Roblox import.
- [Animation](domains/animation/index.md): key poses, clips, motion specs.
- [Images](domains/images/index.md): style prompts, Roblox thumbnails built in Studio.
