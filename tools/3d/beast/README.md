# beast

Rigged block creatures for Roblox from code: shapes → 0.5-stud blocks with mixed-size chunks on the skin → one mesh per joint segment (no part lag) → a Roblox kit (rig + animation + purple VFX pack) → a video. Templates: `dragon.py` (black dragon from the owner's concept sheet, 2026-11-13) and `orc.py` (orc brute with a wooden club). Needs numpy, PIL, Playwright, ffmpeg and three@0.186.1; no installs in the vault.

## Steps
1. **Copy the closest template** (`orc.py` humanoids, `dragon.py` winged or long creatures) to `<name>.py` in a scratch folder next to a copy of `rig.py`, `video.html`, `video.mjs`. Edit only SEG, PAL, `shape()`, ANIM, FX, CAMS.
2. **Detail = build huge, ship at size**: `make(..., block=)` is the block size at the final scale; 0.125 for a 20-stud figure (the orc: 315k blocks, 108k tris), 0.5 for a 165-stud dragon. Then add detail a top modeller would: fingers, nails, teeth, wrinkles, straps with rivets and buckles, stitches, lacing, bark grooves, cracks, fur strands. Owner rules: only the model asked for (no ground or props), different block sizes, never a smooth base (`g.chunky`).
3. **Effects**: use the newest VFX sheet library the owner added (flipbook PNGs + metadata); pick sheets per action (impact, spikes, ground decal, dust, shockwave, aura). Build only those sheets into a scratch folder and pass it as `--sheets DIR`. The `PACK` presets are the dragon's own effects: don't reuse them on other creatures.
4. **Build**: `python3 <name>.py out --sheets DIR` (seconds) → `out/<Name>.glb`, `out/<Name>Kit.rbxmx`, `out/rig.json`, `out/project.json` + `meta.json` (studio tab copy, coarser blocks to fit 250 KB).
5. **Video**: `NODE_MODULES=<folder holding three> node video.mjs out 12 24` → `out/<Name>.mp4` (~25 s for the orc, ~45 s for the dragon; llvmpipe when present). Look at 4-6 frames once.
6. **Finished result in a fresh studio tab (owner: fastest; it must be the exact model)**: `out/studio/` holds the export as studio mesh objects (palette texture, geometry in the project's geo store, <= 225 KB per doc). `python3 stamp.py out final --mesh` prints the geo docs in groups of 4: one Artifact data `batch` per group (`set` `projects/<id>/geo` `<geo id>` ← `out/studio/geo/<geo id>.json`), then one last batch: `set` `projects/<id>/tex` `pal` ← `out/studio/tex/pal.json`, `projects/<id>` ← `out/live/pfinal.json`, `meta/<id>` ← `out/live/mfinal.json` (orc: 9 batches). The studio copy casts its shadow from a 2x-coarser stand-in (`shadowOnly` meshes, the detailed ones `castShadow: false`): orc 215k → 132k triangles per animated frame. Effects: the studio plays the same sheets as `flipbook` objects; sheets listed in `out/studio/uploads.json` (> 170 KB) go up as hub assets in one Artifact call (`asset: true`, `file_paths`), then `set` `projects/<id>/tex` `<tex id>` ← `{"asset": "<asset id>"}` in the last batch. Only when the owner asks to watch it grow: `stamp.py out <i> --mesh` per stage of `plan.json`. `updated` must be an ISO date (stamp.py writes it).
7. Deliver the `.glb`, the kit `.rbxmx`, the `.mp4` and a zip of `out/sheets/` (owner uploads them; ids go in the kit's `SheetAssetIds`). In Roblox Studio: 3D Importer → the `.glb` (a model of MeshParts named after the segments); insert the kit and drag it into that model; press Play.

## API (rig.py)
- `SEG = [(segment, parent | None, pivot)]`: joints in design units (Y up, the creature faces +Z, -X is its right). The first segment is the root.
- `PAL = [None, (name, '#rrggbb', 's' | 'n'), ...]`: up to 15 colours; `'n'` = glow, exported as Neon parts (a mesh texture can't glow).
- `shape(g, stud)`: paint with `g.ell(c, r, col, seg)`, `g.cap(a, b, r0, r1, col, seg)`, `g.spike(base, tip, r, col, seg, tipcol)`, `g.horn(pts, r0, col, seg, tipcol, ring)`, `g.box(lo, hi, col, seg)`, `g.sheet(tris, colfn, segfn, cuts)` (membranes). Each takes `over=True` (paint over) and `where=` (mask of x, y, z[, t]). First paint wins, so paint details before the body they sit on, or use `over`. Finish with `g.chunky(body, tones, rate, bites, sizes)` then `g.tiles({base: (tone1, tone2)}, None, size)`.
- `ANIM`: `{'len', 'periods': {name: s}, 'action': {'every': [a, b], 'first', 'len', 'phases': {name: [start, end, ramp_in, ramp_out]}}, 'joints': {seg: {'rot': {'x': terms}, 'pos': {'y': terms}}}, 'fx': [...]}`. Terms: `[amp, period, phase]` sine, `[phase_name, amp]` action window, `[const]`. Rotations in degrees, positions in studs. FX events: `{'att', 'on', 'off'}` (stream while on) or `{'att', 'burst', 'count'}` (one-shot Emit). Python (studio clip), Lua (Roblox) and JS (video) all read this one spec. The studio clip is fitted to key poses (`key_poses`: a few keys per joint channel on its turning points, `smooth` sine tweens between; orc 114 keys, <= 1.5 deg off the exact motion), never a key per frame.
- `FX = {attachment: {'seg', 'pos', 'pack': [item, ...]}}`. Item = a flipbook `{'sheet': {id, file, FlipbookLayout, FlipbookMode, FlipbookFramerate, Lifetime, LightEmission, Orientation, frames}, 'size': studs, 'count': per burst}` (the kit's Rig script sets each texture from `SheetAssetIds/<file>`), or a `PACK` preset name (dragon only): FireBreath, FireCore, Embers, Smoke, FireLight, Aura, AuraLight, EyeGlow, ImpactBurst, ImpactDust, ImpactSparks, ImpactLight. `fx_scale` scales them (dragon 3, orc 1.2).
- `make(name, SEG, PAL, bounds, sc, shape, ANIM, FX, out, CAMS, fx_scale=, block=0.5, fx_lib_dir=<sheets dir>)`; `CAMS = [{'ang', 'dist', 'y', 'look', 'studio_pos', 'studio_target'}]` (video cameras in Roblox studs, the creature faces -Z there).

## Files
| File | Does |
|---|---|
| `rig.py` | block grid, chunky skin, greedy faces, GLB (<= 19k tris per MeshPart, palette texture), kit (Rig + Animator scripts, VFX pack), studio copy |
| `dragon.py`, `orc.py` | creature templates |
| `video.html` + `video.mjs` | frames of the posed GLB + VFX sprites → MP4 |
| `stamp.py` | stage → live studio docs with `updated` = now |

## Known issues
- Untested inside Roblox from a cloud session: the kit expects the importer to keep mesh names and placement.
- A thin gap can open at a joint that bends far (the dragon's wrist).
- `three` must be at `$NODE_MODULES/three` (or `node_modules/` here, gitignored); never commit it.
