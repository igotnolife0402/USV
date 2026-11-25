---
summary: Ref 04: 8 cel-shaded anime spells on a rune arena (Blender meshes in Roblox), outlined toon VFX, noise-dissolve deaths
updated: 2026-11-25
status: current
---
# 04 · 8 anime spells, one arena (Roblox, meshes made in Blender)
21.3 s · 212/213 kept (camera never stops, so nearly every frame changes) · ASR = an epic "flow state" voice-over, unrelated to the visuals.
Description: Opus directed 60+ Sonnet agents from one Blender tutorial to build 8 spells. Seamless loop: the first and last frames are the same wide shot.

## Why it reads well (the style rules)
- Toon VFX = solid MESHES, not particles: every spell is built from modelled shapes with 2-3 flat cel bands, a dark outline (inverted hull) and white highlight strokes. That reads clearly at phone size and stays cheap.
- One hue per spell, on its own glowing ground pad in that hue (fire orange, ice cyan, water blue, wind green, arcane purple, lightning yellow, slash pink, storm violet). A shared gold rune ring ties them together.
- Hot cores are white with bloom; the outline stays dark → contrast without washing out.
- Deaths are designed: puffs burn out with a black-spot noise dissolve, then split into white curved streak shards that fly up. Nothing just fades.

## Spell catalogue (where to look)
| Spell | Frames (t s) | Build |
|---|---|---|
| Mushroom explosion | 0.2-2.6, 3.4-4.9, 16.3-18.1, 19.4-21 | white-hot flash at the pad → orange cel puffs (#ff7a1a, shadow #c0400f, highlight #fff2d0, outline #3a1005) grow from a white stem in ~0.6 s ease-out → hold → black-spot dissolve (2.3) → white curved shards fly up (2.4-2.6) |
| Fire pillar | 0.0, 11.6-13.3 | tall spiky flame cards in rings (outer #e0401a, mid #ff9a1a, core #fff0a0), dark red outline, flicker by swapping cards; gold ring pad |
| Ice crystals | 0.6-1.3, 7.2-8.6 | white flash (7.3) → hexagonal prism crystals burst out radially (#bfe8ff faces, #6fb0ff shade, dark blue edge lines), white radial ground streaks, small shards fly off, then crystals sink |
| Water serpent | 5.4-6.7 | coil rises from a blue pad, body = cel water (#3a9cff with white patches #e8f6ff), droplet "teardrops" with outlines along the spine, white swirl rings on the pad |
| Wind tornado | 10.4-11.4 | stacked twisted green cone ribbons (#2ec46a / #7ff0a0), pale yellow ribbons orbiting, leaf/confetti quads (#fff0a0) spiralling, green rings on the pad |
| Arcane pillar | 8.7-9.9 | pink pad (#ff6ad5, white rune ring) → thin purple beam (#b070ff) with 3-4 stacked thin rings rising, white 4-point sparkles |
| Lightning strike | 13.4-15.0 | yellow ground crack star (#ffd23a) with a dark scorch → white bolt drops (14.2-14.3) → embers |
| Slash cross | 15.6-16.1, 17.7-19.2 | white feather-like slash arcs + pink X sparkle (#ff3a8a) on a red ring pad, radial pink spikes |
| Storm cloud | 13.4-14.9 | huge violet cel cloud (#4a3a7a, highlight #8a7ac0) with a yellow glowing underside, crushes down onto the lightning pad |

## Camera
Slow orbit + fly-through at low height with a wide lens; passes close to each spell for 1-2 s, then pulls out to the opening shot (loop).

## Replication recipe
- Roblox: each spell = MeshParts (Blender-made, cel texture baked: 3 flat bands + highlight strokes), outline = duplicate mesh scaled 1.03 with flipped normals, black, or a Highlight (OutlineColor #1a0a05, FillTransparency 1). Neon only on white cores; Bloom Intensity 0.8 Size 24 Threshold 0.9.
  Animate with TweenService: grow 0→1 scale in 0.4-0.6 s (Back/Quad Out), hold, then the dissolve: swap to a texture flipbook with a black-spot noise mask (4-6 frames), then Emit white curved shard particles (Speed 20 up, Lifetime 0.4).
  Pads: flat cylinder 0.1 studs high, hue fill at Transparency 0.4 + white rune-ring decal, PointLight in the spell hue.
- Umbrio / three.js: MeshToonMaterial with a 3-step gradientMap, inverted-hull outline (BackSide, scale 1.03, black), additive white core sprite + UnrealBloomPass (strength 0.8, threshold 0.85); dissolve = alphaTest against a noise texture with an animated threshold.
- Blender (PC only): model the puffs/crystals/coils, bake the 3-band cel texture, export .fbx → Roblox.

## Not verified
- Whether the outlines are inverted hulls or Highlights; whether the dissolve is a flipbook or a SurfaceAppearance trick.
