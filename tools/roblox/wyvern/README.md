# wyvern: 50-stud wyvern pet showcase loop (Roblox client + three.js preview)

A storm-teal wyvern (50 studs nose to tail, 4.2 thick, 34 wingspan, 39 MeshParts, 34.6k tris) loops around the
floating local player for 16 s, seamless: glide, front dash, loop-the-loop, corkscrew barrel roll, hover-flare roar
(one shockwave ring), diagonal dive, close weave. Wind trails on wingtips + tail, spiral wind ribbons and speed lines
on dashes, a puff at each dash start, faint ambient wind. Player floats 8 studs up in an anime pose (arms crossed,
knee raised), bobbing and turning once per loop.

## One spec -> every output
| File | Does |
|---|---|
| `spec.mjs` | body layout, path moves (+ seconds per move), per-move channels (wings, dash, roll, flare), tunables |
| `motion.mjs` | bakes the closed arc-length path, speed, banking (lift vector, clamp 55 deg outside the loop), flap phase; `pose(t)` |
| `geo.mjs` | meshes from code: domed capsule segments, lofted head + jaw + teeth + horns, membranes with sag, tucked legs, tail blade |
| `texture.mjs` | hex fish-scale colour + normal atlas (ivory strip for spikes/horns), veined membrane |
| `pose.mjs` | player R15 pose table (Motor6D C0 angles) |
| `export-glb.mjs` | `out/Wyvern.glb` (studs, straight rest pose, one node per part) + PNGs |
| `gen-luau.mjs` | `src/client/WyvernPet/Bake.luau` (path/time tables, parts, wing axes, pose) |
| `build-preview.mjs` | `out/wyvern.html` (three.js 0.160.0 from jsDelivr, same math inlined) |
| `test/sim.mjs` | loop checks: clearance, seam pos + velocity, joint gaps, 50-stud length, part/tri caps |
| `test/shot.mjs` | headless screenshot at time t (`NODE_MODULES=<dir with three@0.160.0>` when the CDN is blocked) |

Body = rigid segments placed by chord on the path (follow-the-leader), so joints never gap; domed front caps fill bends.
Tricks are the path shape plus an s-based roll, so the body inherits each trick as it passes the same spot.

## Build
```
node export-glb.mjs && node gen-luau.mjs && node build-preview.mjs && node test/sim.mjs
```

## Roblox
1. Run the Build line first (`out/` is not committed). Studio: 3D Importer -> `out/Wyvern.glb`, file units = **Studs**, keep hierarchy; move the model to ReplicatedStorage, name `Wyvern`.
2. `rojo serve` with `default.project.json` (LocalScript `StarterPlayerScripts.WyvernPet`), or copy `src/client/WyvernPet` as a LocalScript with its ModuleScripts.
3. Play: the script clones the model client-side, sets every part's Size from the bake (fixes unit scaling), anchors the root and runs the loop. Tunables: `CONFIG` in `init.client.luau` (SCALE, FX_ON, CAMERA, POST).

## Cinematic camera (2026-11-24)
- `camera.mjs` bakes one 16 s track from `CAMERA` in `spec.mjs`: one orbit, push-in build, dip, flash + 4-frame hit-stop, shake, hold, reveal. Story runs x0.3 into the flare payoff (story 10.24 s = clock 9.94 s), rest x1.11 so the loop stays 16 s.
- `Camera.luau` plays it (Scriptable camera, Bloom/ColorCorrection/DoF in Lighting, all restored on stop). `CONFIG.CAMERA=false` keeps the player camera; `POST=false` skips the effects.
- Preview: Cine/Free button or C key. Shockwave ring fires on the payoff crossing.
- push 0.35 (baseline 0.45 put a wing 5 studs from the lens; sim gate camera-to-body >= 8, now 9.36).

## Known limits (2026-11-24)
- Camera/post look not seen in Roblox; flash 0.85 is a strong white wash in the preview, may need lowering.
- Not yet run in Roblox: importer axis/naming assumptions, membrane transparency look and particle textures (`rbxasset://textures/particles/*`) are unverified.
- Luau not analyzed here (luau binary blocked in the cloud session); JS copy is what the tests run. Keep `Spine.luau` in step with `motion.mjs`.
- Weave stays >= 21 studs out (brief said 12): the 17-stud wing on the inside would hit the player.
