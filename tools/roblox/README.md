# tools/roblox

Node 20+ ES modules, no npm deps unless noted. Scripts resolve paths from their own file, so any cwd works. Rules they enforce: [maps](domains/roblox/maps.md), [ui](domains/roblox/ui.md), [delivery](domains/roblox/delivery.md).
Generated `out/` folders are not committed: rerun the build.

| Tool | Does | Run | Mode |
|---|---|---|---|
| `wyvern/` | 50-stud wyvern pet showcase loop: spec -> GLB mesh + textures, baked Luau LocalScript (path, wings, VFX, player pose), three.js preview, loop tests ([README](wyvern/README.md)) | `node export-glb.mjs && node gen-luau.mjs && node build-preview.mjs && node test/sim.mjs` (in `tools/roblox/wyvern`) | both |
| `rbxmx-check.mjs` | Pre-delivery check of any `.rbxmx`: tags balance, every `<Ref>` resolves, unique referents, every script has `Source` | `node tools/roblox/rbxmx-check.mjs file.rbxmx` (`--self-test` for its own test) | both |
| `pack-scripts.mjs` | Packs Luau files (layout.json tree) into an Umbrio `.rbxmx` so world + code upload and insert as ONE Model asset (no pasting scripts through MCP) | `node tools/roblox/pack-scripts.mjs world.rbxmx out.rbxmx layout.json`, then rbxmx-check | pc |
| `detail.luau` + `detail-check.mjs` | Detail-floor gate for models built in Studio: the chunk (swap `MODEL_NAME`, run via execute_luau, read-only) returns raw counts; the checker compares them to `tools/3d/detail/floor.json` | `node tools/roblox/detail-check.mjs <metrics.json \| -> [--class prop\|hero\|scene]` (exit 1 on fail, 2 bad input) | PC (Studio MCP); checker both |
| `lobby/` | Deterministic lobby generator (meadow, hero spawn, Old Oak centrepiece) + validator: schema, budgets (6,000 objects, 24 lights, 4 shadows, 230 KB doc), hero and scene detail floors (spawn clearance, gates, framing are spec rules NOT yet automated) | `node tools/roblox/lobby/build.mjs && node tools/roblox/lobby/validate.mjs` (exit 1 on fail); tests `node --test tools/roblox/lobby/test/` | both |
| `lobby/live.mjs`, `lobby/stage.mjs` | Split the build into ordered write batches (`live.mjs`: <= 750 KB per batch; `stage.mjs`: <= 150 objects per write) so the owner watches it grow | `node tools/roblox/lobby/live.mjs [--from "Stage"]` | both |
| `lobby/blueprints/oak.md` | Blueprint example: references, dimensions, part counts before modelling | read | both |
| `shop/design.mjs` | Palette + layout first; `vividCheck()` fails on dull colours (HSV s,v >= 0.75; lips/lines s >= 0.8, v >= 0.5) | `node tools/roblox/shop/design.mjs` (design sheet PNG needs playwright) | check: both; PNG: PC |
| `shop/build.mjs` | Builds the shop GUI JSON from `design.mjs`; fails if a colour is dull or not in the palette; writes live stages | `node tools/roblox/shop/build.mjs` | both |
| `shop/art/items.mjs` | Sticker-style item SVGs (one outline pass, fills, details clipped inside) | `node tools/roblox/shop/art/items.mjs` | both |
| `shop/art/render.mjs`, `kit.mjs`, `headlines.mjs`, `design/type-directions.mjs` | SVG → PNG textures, hand-made 9-slice skins, headline images, 3 type directions for the owner to pick | `node <file>` | PC (needs `playwright` + Chromium) |
| `shop/preview.mjs` | Renders the GUI at phone/PC/tablet sizes, fails on any overlap or clipped text | `STUDIO_UI=<path to ui.js> node tools/roblox/shop/preview.mjs [outDir] [--play]` | PC (playwright + renderer) |

## Limits (read before reuse)
- Output format is the old Claude-Hub Studio project JSON (a three.js preview: `objects` with `part/group/light/mesh/gui`), not `.rbxlx`. To use in Roblox Studio, port the generator logic to a Luau builder module run via Studio MCP, or export through the 3D studio's rbxmx exporter (3d domain, [domains/3d/index.md](domains/3d/index.md)), then run `rbxmx-check.mjs`.
- `shop/preview.mjs` needs the old hub's Interface renderer (`plugins/ui.js`); it is not in this vault. Without it, rely on `build.mjs` checks plus a Studio device-emulator look on PC.
- Fixed 2026-11-21: `.pathname` and `file://${argv[1]}` main guards broke on Windows and paths with spaces; now `fileURLToPath`/`pathToFileURL`.
