---
summary: Roblox build and asset pipeline: Rojo file layout, type-check, Studio MCP test, mesh/texture/audio limits, publish
updated: 2026-11-21
status: current
triggers: [rojo, default.project.json, roblox mesh, roblox publish, roblox assets]
---
# Roblox pipeline

## 1. Repo layout (Rojo)
```
<project>/
  default.project.json
  src/server/   -> ServerScriptService.Server   (*.server.luau = Script)
  src/client/   -> StarterPlayer.StarterPlayerScripts.Client (*.client.luau = LocalScript)
  src/shared/   -> ReplicatedStorage.Shared     (*.luau = ModuleScript)
  assets/       (meshes .fbx/.obj, textures .png, audio .ogg/.mp3; not synced)
  selene.toml, .luaurc
```
`init.luau` / `init.server.luau` makes the folder itself the script.

## 2. default.project.json
```json
{ "name": "Game",
  "tree": { "$className": "DataModel",
    "ReplicatedStorage": { "Shared": { "$path": "src/shared" } },
    "ServerScriptService": { "Server": { "$path": "src/server" } },
    "StarterPlayer": { "StarterPlayerScripts": { "Client": { "$path": "src/client" } } } } }
```
Add services (Workspace, Lighting) only when you need `$properties` on them. Commit this file.

## 3. Build/check
1. `rojo sourcemap default.project.json -o sourcemap.json`
2. `luau-lsp analyze --sourcemap=sourcemap.json --definitions=globalTypes.d.luau src` → 0 errors.
3. `selene src` (optional lint).
4. PC: `rojo serve` → Studio Rojo plugin Connect. Or `rojo build -o game.rbxlx` and open it.

## 4. Test (PC, Studio MCP)
edit → start play → get console output → stop play → fix. Log the single summary line per test.

## 5. Asset limits
| Asset | Format | Limit |
|---|---|---|
| MeshPart | .fbx, .obj, .gltf/.glb | 20,000 triangles per mesh; size max 2048 studs/axis |
| Texture/Decal | .png, .jpg, .tga, .bmp | 1024x1024 used max (larger downscaled) |
| SurfaceAppearance PBR | ColorMap, NormalMap (OpenGL), MetalnessMap, RoughnessMap | 1024 px each |
| Audio | .ogg, .mp3, .wav, .flac | < 20 MB, ≤ 7 min for most accounts; check current uploader limits |
| Skinned mesh | .fbx with armature | Bones ≤ 4 influences/vertex |
Units: 1 stud = 0.28 m. Export from Blender at scale 1.0 with "Apply transforms"; import with Studio's 3D Importer.

## 6. Publish
File → Publish to Roblox (PC only). Set Game Settings: API access, devices (phone/tablet ON), Max players. Mobile session → queue it in [queue/pc.md](queue/pc.md).
