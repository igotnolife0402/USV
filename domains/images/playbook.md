---
summary: Image rules - a named style means the owner's prompt, add-ons, 2-3 style mixes, Roblox thumbnail recipe built in Studio
updated: 2026-11-21
status: current
triggers: [art style, image prompt, voxel art, low-poly, anime, pixel art, thumbnail, roblox thumbnail, gfx, design sheet]
---
# Images playbook

## Style rules (owner, 2026-11-13)
- A named style means the owner's prompt for it: its text in [tools/art/styles](tools/art/styles/README.md) `index.html` `STYLES` is the spec (`[SUBJECT]` replaced), its "how it works" line the checklist. Applies to images and 3D pieces alike.
- The 20 styles: Photorealistic, 3D render, Cartoon, Anime, Pixel art, Voxel art, Low-poly, Stylized realism, Cinematic, Comic book, Manga, Watercolor, Oil painting, Sketch / pencil, Minimalist, Flat vector, Isometric, Claymation, Paper cutout, Surreal / abstract. Grep the name in the page for the exact prompt; never paraphrase from memory.
- Add-ons, appended after the style prompt in list order: Roblox assets → Roblox; reference sheets → Design sheet; thumbnails → Thumbnail.
- Mixes: two or three styles at most, each with a stated job (geometry, lighting, mood), e.g. "voxel geometry + cinematic lighting + dark fantasy atmosphere".
- New or better style: edit its row in place (one best version per style), never a second copy.

## Roblox thumbnails (owner's references, 2026-11-13)
- Build in the [Studio](domains/3d/studio.md), 15 min max: Look `roblox` (`toon` only for cartoon requests), the Baseplate recipe ([scene format](tools/3d/studio/docs/scene-format.md)), `text` hooks, `glow: "#ffffff"` on the hero, then Render image (1920x1080).
- Hero: the owner's bacon avatar ([avatar](tools/3d/avatar/README.md) tab) with a big drawn face (`draw: shocked|scared|grin|cry`, or `faces.py`).
- One headline in a chunky rounded font (`Lilita One`, `Luckiest Guy`): yellow or theme gradient, thick black outline, white outer rim (`outline2`), extrusion (`depth`), 2 lines, top corner.
- Game UI as hooks: speedometer badge (`bg.shape: gauge`), boss bar "[GODLY] ... 9,999,999", rarity list, green "Roll!" button, reaction inset.
- Ground: the Roblox studded baseplate unless another ground tells the story better.
- Energy: sunburst behind the key object (`burst`), speed lines (`lines`), sparkles, glow rims; bright saturated colours, 3-4 hooks max.
- Check: `SHOTS_DEVICE=desktop` (16:9) shots check; look once, no rating loop.

## PC (/pc)
- Prompt: grep the style row, assemble style + add-ons ([snippet](domains/images/snippets/README.md)), return it (or hand it to a connected image generator if the owner asked for the image itself).
- Thumbnail: Studio tab per above → `SHOTS_RENDER=1 SHOTS_DEVICE=desktop` shots check → `render.png` → JPEG ([pipeline](domains/images/pipeline.md)).

## Mobile fallback (/mobile)
- Prompts work fully (read the repo file). The styles page also runs as an HTML Artifact (paste `index.html`).
- Thumbnail: write the Studio scene JSON (hero, text hooks, Baseplate, look) in the repo; preview as a three.js Artifact; queue `- [ ] YYYY-MM-DD render thumbnail <name> in Studio (SHOTS_RENDER=1) — mobile scene` in [queue/pc.md](queue/pc.md).

## Done
Prompt: spec text verbatim + add-ons + subject. Thumbnail: rendered, looked at once, ≤ 15 min. New failure → [errors](domains/images/errors.md).
