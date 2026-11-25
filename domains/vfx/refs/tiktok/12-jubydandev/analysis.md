---
summary: Ref 12: Claude-made voxel creature models with effect kits (water serpent, gear mammoth, purple beast) filmed off a monitor
updated: 2026-11-25
status: current
---
# 12 · "claude isn't good at making models" (rebuttal video)
10.8 s · 108/108 kept: phone-filmed monitor, the hand shake changes every frame, so the filter keeps all (known limit) · no captions.

## What it shows
0-2.8 s the Roblox pet game in play (voxel pets on a grass island, "Success" toast). 2.9-10.7 s the same pets as Claude-built 3D viewers (looks like Artifact pages with tabs such as Idle / Move / Ability), one creature per page, each with its own effect kit.

## Why the models read as "good"
- Voxel style with many small cubes per part (fur clumps, scales, plates), not a few big blocks → detail and readable silhouette at once.
- Each creature has a theme and repeats it in props that orbit or circle it: water serpent → gold tiki posts + bubbles + water pillars; mammoth → gears + gold ring + steam; purple beast → bones + crystals + pink flames. Orbiting props fill the frame and sell the theme cheaply.
- One accent colour against the body colour (gold on teal, gold on brown, magenta on deep purple).
- Every creature sits on a matching ground decal (swirl, ring, shadow disc).

## Timeline
| t (s) | frames | event |
|---|---|---|
| 0.0-2.8 | f0001-f0029 | in-game: red horned pet + brown dog pet, cyan pet ring under the player |
| 2.9-3.2 | f0030-f0033 | water serpent (teal #1fa59a, gold bands #e0b030) coiled on a white/teal swirl pad, breath cone of pale cyan mist |
| 3.3-3.6 | f0034-f0037 | "Tidal surge": 8 water pillars (teal with white foam caps) rise in a ring around the coil in ~0.3 s |
| 3.7-5.8 | f0038-f0059 | pillars hold, bubbles rise, the swirl pad scales up and rotates; breath stops at 4.6 s |
| 5.9-6.4 | f0060-f0065 | gear mammoth (brown voxel fur #6a3a1a, ivory tusks, brass lantern), big brass ring behind, orbiting gears |
| 6.5-7.4 | f0066-f0075 | ability: yellow sparkle burst at the feet → gold ground ring expands and fades (7.0-7.5) |
| 7.3-7.9 | f0074-f0080 | steam puffs (white voxel clouds) from the chimney/lantern |
| 8.0-10.7 | f0081-f0108 | red demon beside a blood-red moon; purple voxel beast (#3a2a9a, magenta flames #ff3ad0, yellow eye glow) with orbiting bones and blue crystals |

## Replication recipe
- Umbrio / three.js: InstancedMesh voxels (0.1-0.2 unit cubes) per part; 2-3 shade variants per colour (random per voxel ±6 % lightness) for texture; prop ring = N copies on a circle, slow rotate (0.3 rad/s) + bob.
- Ability beats: pillar ring rises with ease-out over 0.3 s; ground ring decal scales 1 → 2.5 while fading over 0.5 s; sparkle burst = 20 small yellow quads.
- Roblox: same voxels as unioned parts or a MeshPart export; orbit props welded to a spinning attachment (client-side).

## Not verified
- Which tool rendered the viewer pages (looks like Claude artifacts); exact part counts.
- Owner rule check: voxel is a style the owner must ask for (default is realistic).
