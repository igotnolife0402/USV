---
summary: Studio, the owner's web 3D editor in tools/3d/studio - files, data, live builds, speed caps, tests, shots check
updated: 2026-11-21
status: current
triggers: [studio, studio tab, web editor, 3d editor, shots, shots check, scene json, plugin, viewport, look, toon, render image, mp4, publish]
---
# Studio (web 3D editor)

The owner's browser 3D editor (iPhone + PC): parts like Roblox Studio, mesh edit/sculpt, animation, textures, paint, draw, VFX flipbooks, Roblox GUI, import/export, MP4. Code: [tools/3d/studio](tools/3d/studio/README.md). Reuse it before writing a new editor ([3d-editor skill](.claude/skills/3d-editor/SKILL.md)).
Docs (open only the one you need): [scene format](tools/3d/studio/docs/scene-format.md), [for AIs](tools/3d/studio/docs/for-ais.md), [plugins](tools/3d/studio/docs/plugins.md), [plugin API](tools/3d/studio/docs/plugin-api.md), [tests](tools/3d/studio/docs/tests.md), [limits](tools/3d/studio/docs/limits.md).

## Where projects live
- Hosted: the Claude-Hub artifact (url in `tools/3d/studio/tool.json`), projects as db docs `projects/<id>`, `meta/<id>`, `projects/<id>/geo/<gid>`, `projects/<id>/tex/<tid>`; edit with an Artifact data tool when the session has one ([for AIs](tools/3d/studio/docs/for-ais.md)).
- Local: serve the folder (`npx serve tools/3d/studio`); no runtime → saves to IndexedDB and warns (tested: `core › offline`).
- Headless: `node cli/studio.mjs validate|info|export scene.json out.glb` (also gltf/obj/stl/ply/rbxmx/lua); needs `three@0.186.1` on `NODE_PATH` from a scratch folder. Textures and imported models are skipped headless.

## Data rules (owner)
- `updated` is an ISO date; write with `if_version`; read first and keep the owner's edits (env, camera) when replacing a doc.
- Every AI build is a fresh project/tab: `projects/<id>` + `meta/<id>` `{name, updated, count, ai: true, building: true}`; bump `updated` each stage, last write sets `building: false`. One writer per project.
- Only the model asked for: no Baseplate, ground or scenery unless asked. Test helpers are `temp: true` (ball, sword, axis marker): they play in the tab, never export.
- Docs ≤ 225 KB each (project doc < 250 KB: short ids, defaults left out); a batch 10-100 objects, ≤ 50 writes, ≤ 1 MiB. Never one write per object.
- Geometry is immutable (cached by id): a replace writes NEW geo ids, repoints objects in the same write, deletes old docs, then checks every referenced doc exists.
- Big sprite sheets (> 170 KB) go up as assets: tex doc `{"asset": "<id>"}`.

## Live build (owner, permanent)
1. Start by writing the first part into the tab; never build, size, render or correct the whole thing elsewhere and import it.
2. One batch per stage (main shape → structure → details); stage only when the owner wants to watch, else the finished model in one go, fastest way.
3. A write the tab refuses (doc > 225 KB) is fixed by the next write, not a hidden trial run.
4. Every build ends with the [zfight gate](tools/3d/zfight/README.md) on the tab's read-back (never on local files), then the shots check.
5. Publishing the hub: another session may have published since; merge onto the live version.

## Speed rules (lock each with a test cap)
- Boot is one round trip: every module loaded at boot has a `<link rel="modulepreload">` in `index.html`, nothing preloaded unused (`core › boot`); own boot code ≤ 800 KB; one-feature code loads on first use (`import()`).
- CDN libs pinned exact (`three@0.186.1`, `three-mesh-bvh@0.9.16`, `three-bvh-csg@0.0.18`, `mp4-muxer@5.2.2`); jsDelivr `.min.js` only where all imports are bare, so no module loads under two URLs.
- Never block the main thread on the GPU (no canvas resize or sync pixel read in hot paths). Dense scenes: dynamic resolution while playing, `shadowOnly` 2x-coarser stand-ins, `castShadow: false` on detailed meshes.
- Phones: bake static parts into meshes (~150 draw calls max), never animate the root of a big build.
- Procedural textures: whole-image `tone` passes ([texture.js](tools/3d/studio/plugins/texture.js)), never per-pixel noise, float `%`, `**` or `Math.sin`; ≤ 30 ms per 512 px.
- Navigation: endless zoom, near plane 2% of orbit distance (phones' coarse depth), Fly mode (`core/fly.js`).
- Slow suite: measure CPU per process before changing anything; suites run serially (software GPU is CPU-bound).
- No session or machine paths in files: env vars or relative paths.

## PC (/pc)
- Tests: `node test/run.mjs [suite] [--grep text]` with `DEPS=<scratch>/node_modules` (three, three-mesh-bvh, three-bvh-csg, mp4-muxer), `NODE_TOOLS=<folder with node_modules/playwright>`, `CHROME=<chrome.exe>` if Playwright browsers are not installed, `SCRATCH=<scratchpad>`. Full suite ~4 min llvmpipe, ~9 min SwiftShader.
- Shots check before a tab goes up (10 s): `SHOTS_TAB=<OUT/studio> SHOTS_AT=1,2,3 [SHOTS_CAM=x,y,z,tx,ty,tz] node test/run.mjs shots` → `shots/shots.jpg`; `SHOTS_DEVICE=desktop` thumbnails 16:9; `SHOTS_DEPTH16=1 SHOTS_NEAR=0.1` phone-grade depth → `d16.jpg`; `SHOTS_VIDEO=1` → `clip.mp4`; `SHOTS_RENDER=1` → 1920x1080 `render.png`.
- Video: Export > Video (MP4 fast, ≤1280 px, ≤30 fps, ~0.5 MB/4 s) or `quality: "render"` (1080p, minutes).
- VFX suite fails over 45 s.

## Mobile fallback (/mobile)
- No browser tests. Edit studio files in the repo, `node --check` each touched module, run `node cli/studio.mjs validate scene.json` if `three` is installable in the session scratch.
- Preview: paste a scene as a three.js HTML Artifact (procedural, pinned CDN) or write the Hub db docs if an Artifact data tool exists.
- Queue: `- [ ] YYYY-MM-DD node tools/3d/studio/test/run.mjs <suite> + shots check — <change>` in [queue/pc.md](queue/pc.md).

## Done
[checklists/3d.md](checklists/3d.md) + zfight gate PASS on read-back + shots check looked at once. New failures → [3d errors](domains/3d/errors.md).
