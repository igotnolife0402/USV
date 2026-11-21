---
summary: Images pipeline - style prompt assembly, and Roblox thumbnail scene to Studio Render image to delivered JPEG
updated: 2026-11-21
status: current
triggers: [thumbnail pipeline, prompt build, render image, gfx pipeline]
---
# Images pipeline

## A. Style prompt (< 1 min, PC and mobile)
1. Grep the style name in `tools/art/styles/index.html` (`STYLES`); take field 3 (prompt), replace `[SUBJECT]`.
2. Append add-ons from `ADDONS` in list order (Roblox, Design sheet, Thumbnail) as the request needs.
3. Mix: name 2-3 styles and the job of each in one sentence before the prompts.
4. Deliver the prompt text (or the image if an image tool is connected and the owner asked for it).

## B. Roblox thumbnail (≤ 15 min, render on PC)
1. Hero: avatar tab from [avatar](tools/3d/avatar/README.md) (`catalog.py` real items → `avatar.py KIT OUT --pose P`), face via `draw:` or `faces.py`.
2. Scene in a fresh Studio tab: `env.look: "roblox"`, Baseplate (studs texture), hero `glow`, 3-4 hooks (headline text, UI hooks, `burst`, `lines`, sparkles). Formats: [scene format](tools/3d/studio/docs/scene-format.md).
3. Render 16:9: `SHOTS_DEVICE=desktop SHOTS_RENDER=1 SHOTS_TAB=<OUT/studio> node tools/3d/studio/test/run.mjs shots` → `shots/render.png` (1920x1080).
4. JPEG: PIL `Image.open(p).convert('RGB').save(out, quality=90)`; keep ≤ 400 KB.
5. Look once; deliver. Mobile: stop after step 2 and queue steps 3-5 in [queue/pc.md](queue/pc.md).
