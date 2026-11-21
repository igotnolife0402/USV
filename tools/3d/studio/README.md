# Studio

3D builder in the browser (iPhone and PC): build with parts like Roblox Studio, edit and sculpt meshes like in 3D modeling software, animate, texture, paint, draw, import and export. Every project is its own page, so several AIs can work on different projects at once.

## Pages
- `#` (home): project list: new, open, rename, duplicate, delete.
- `#<projectId>`: one project open in the editor. Ids are ASCII letters, digits, hyphens (`castle-3f9a`).

## Files
| Path | Job |
|---|---|
| `index.html` | page shell: theme CSS, importmap, modulepreload list, boot |
| `core/app.js` | state, commands, undo/redo, events, plugin registry, `window.studio` |
| `core/store.js` | projects in the artifact db: live sync, ops queue, geometry and texture stores, offline fallback |
| `core/model.js` | scene JSON ⇄ three.js objects, polygon mesh ⇄ BufferGeometry. No DOM: the CLI uses it too |
| `core/viewport.js` | renderer, camera, controls, gizmo, selection, render on demand |
| `core/ui.js` | layout, menus, panels, bottom sheets, command palette, icons, home page |
| `core/panels.js` | Properties and Scene panels, explorer tree, `makeControls` (the panel control kit) |
| `plugins/index.js` | the plugin list: one line per plugin |
| `plugins/*.js` | every feature (parts, camera, mesh, sculpt, anim, texture, paint, draw, io, export, roblox, vfx flipbooks); `meshops.js` is mesh.js's pure geometry ops and primitives, no plugin |
| `cli/studio.mjs` | headless: `validate`, `info`, `export` a scene to glb/gltf/obj/stl/ply/rbxmx/lua (needs `three` on `NODE_PATH`) |
| `test/` | mock `claude` runtime + Playwright feature, speed and layout tests |

Libraries load from the jsDelivr CDN through the importmap: `three@0.186.1`, `three-mesh-bvh@0.9.16`, `three-bvh-csg@0.0.18`. Nothing is bundled into the vault. The importmap points at jsDelivr's Terser builds (`X.min.js`, made on request from the pinned `X.js`) for files whose imports are all bare specifiers; the rest stay `X.js`, so no module ever loads under two URLs. Every module loaded at boot has a `<link rel="modulepreload">` in `index.html` so a phone fetches them in one round trip, not 7 (test `core › boot` fails on a missing or unused one). Heavy libraries used by one feature load on first use with `import()` (`three-mesh-bvh` in sculpt, `three-bvh-csg` in CSG).

## Docs (open only the one you need)
| Need | Doc |
|---|---|
| Scene JSON: objects, materials, textures, animation, effects, looks | [scene format](docs/scene-format.md) |
| An AI editing projects: db docs, ops, headless export, files, video | [for AIs](docs/for-ais.md) |
| Writing a plugin: shape, cookbook | [plugins](docs/plugins.md) |
| Plugin API: `app`, viewport, UI, commands | [plugin API](docs/plugin-api.md) |
| Running the tests, the shots check | [tests](docs/tests.md) |
| Known limits | [limits](docs/limits.md) |
