# tools/3d

Generators and the Studio web editor, ported from the old vault (2026-11-21). Rules and which-tool table: [3d playbook](../../domains/3d/playbook.md); Studio facts: [studio note](../../domains/3d/studio.md).
Outputs never go in the vault: copy a tool or pass an OUT folder in the scratchpad. Deps: Python 3 + numpy + Pillow (both on the PC); browser steps need Playwright + `three@0.186.1` from a scratch folder (never committed).

| Tool | What | Run / test | Where |
|---|---|---|---|
| [studio](studio/README.md) | Web 3D editor: parts, meshes, sculpt, anim, textures, paint, draw, VFX flipbooks, GUI, import/export (glb/gltf/obj/stl/ply/fbx/rbxmx/lua), MP4 | Serve the folder (`npx serve tools/3d/studio`); headless `node cli/studio.mjs validate|info|export scene.json out.glb`; tests `node test/run.mjs [suite]` ([tests](studio/docs/tests.md)) | both (mobile: headless CLI + edit files; browser tests PC) |
| [zfight](zfight/README.md) | Z-fight gate: finds same-facing overlaps that flicker on phones, fixes them | `python zfight.py check project.json geo/` (exit 1 > 0.5 m2), `fix ... out/` | both |
| [props](props/README.md) | Low-poly / toon props as Studio meshes (cone, wheel, rocks, trees, crate...) | `python props.py OUT all --check` (self-check: tris, bad faces, 225 KB, 20 s) | both |
| [shatter](shatter/README.md) | Voronoi breakable crystal + ball + physics clip | `python shatter.py OUT --pieces 100` | both |
| [voxel](voxel/README.md) | Voxel grid → greedy-merged Parts `.rbxmx` (city template) + stages | `python city.py city.rbxmx stages`; render `render.js` | both (render PC) |
| [creature](creature/README.md) | Realistic animal (tiger template) → fur render + Roblox GLB ≤20k tris | `python geo.py out`, `node render.js`, `python glb.py` | PC (render), both (geo/glb) |
| [beast](beast/README.md) | Rigged block creatures (orc, dragon) → GLB + Roblox kit + Studio tab + MP4 | `python orc.py out --sheets DIR` (needs VFX sheets), `node video.mjs out` (ffmpeg) | PC |
| [avatar](avatar/README.md) | Roblox avatar from real catalog items, posed/animated Studio tab, faces | `python catalog.py KIT ...`, `python avatar.py KIT OUT`, `python faces.py f.png grin` | both (catalog needs network) |
| [armor](armor/README.md) | Blocky armor sets fitted to the R6 rig (dragon, frost, solar, storm) | `python armor.py OUT cuirass`; `python sets.py OUT frost helm` | both |
| [detail](detail/README.md) | Detail-floor gate for every model (meshes, textures, parts, tris; thresholds floor.json) | `python detail/detail.py check project.json geo/ --class hero` (exit 1 = too cheap) | both |

Browser env vars (render.js, video.mjs, studio test/run.mjs): `NODE_TOOLS` = folder whose `node_modules` holds playwright (cloud default `/opt/node-tools`), `CHROME` = browser exe when Playwright's own Chromium is missing (PC: `C:/Program Files/Google/Chrome/Application/chrome.exe`), `NODE_MODULES`/`DEPS` = folder holding `three`.
Not ported (one-off project builds, knowledge moved to [3d errors](../../domains/3d/errors.md)): cathedral, skylight, conemap, borders, bamboo.
