---
summary: Images domain entry - the owner's 20 art-style prompts, add-ons, and Roblox thumbnails built and rendered in the Studio
updated: 2026-11-21
status: current
triggers: [image, images, art style, style, styles, thumbnail, gfx, design sheet, picture, poster, icon, drawing, prompt]
---
# Images

- [rules](domains/images/rules.md): every applied lesson rule for this domain; read with the playbook.

Image prompts in the owner's named styles ([styles page](tools/art/styles/README.md)) and Roblox thumbnails/GFX rendered in the [Studio](domains/3d/studio.md). Voxel or block 3D models are [3D](domains/3d/index.md).

## Read in this order
1. [Playbook](domains/images/playbook.md): style rules, add-ons, mixes, thumbnail recipe.
2. [Errors](domains/images/errors.md): symptom → fix.
3. [Pipeline](domains/images/pipeline.md): prompt build; thumbnail scene → Render image → JPEG.
4. [Snippets](domains/images/snippets/README.md): prompt assembly, thumbnail headline/text JSON.

## Skill and done
- Skill: none dedicated; thumbnails use [3d-editor](.claude/skills/3d-editor/SKILL.md) (Studio).
- Done: [checklists/simple.md](checklists/simple.md) for a prompt; [checklists/3d.md](checklists/3d.md) + one look at the render for a thumbnail.
- Modes: [profiles/pc.md](profiles/pc.md), [profiles/mobile.md](profiles/mobile.md); PC-only leftovers → [queue/pc.md](queue/pc.md).

## Code
- [tools/art/styles](tools/art/README.md): `STYLES` `[name, how it works, prompt]` and `ADDONS` in `index.html` (single source of prompt text).
- Thumbnail hero + faces: [avatar](tools/3d/avatar/README.md) (`faces.py shocked|scared|grin|cry|smirk`).

## Related domains
- [3D](domains/3d/index.md): Studio, Render image. [VFX](domains/vfx/index.md): bursts, sparkles, glow. [Roblox](domains/roblox/index.md): game icons/thumbnails upload.
