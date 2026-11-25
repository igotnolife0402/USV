---
summary: Ref 07: Roblox blue spinning-slash dome, dark star-flash anticipation, 2.6 s of random crescent arcs, cast 4x
updated: 2026-11-25
status: current
---
# 07 · "Claude is goated at vfx" (Roblox Studio, static wide camera)
26.6 s · 175/266 kept · captions = Spanish meme audio ("pass the hose"), unrelated to the visuals · Studio toolbar visible (it's a screen capture).
The same ability fires 4 times: 2.2-5.3, 9.0-12.1, 15.6-18.7, 22.5-25.7 s. Between casts the character walks around; most of that was dropped as filler.

## Why it reads well
- A big contrast swing before the burst: the whole world goes dark blue, a white 4-point star flashes on the character, and only then does the bright burst hit. Dark → bright makes the blue look much brighter than it is.
- The sustain is many short crescent slashes at random angles (new set every ~0.1 s) around a fixed ground ring, so it reads as a spinning dome without any real geometry.
- About 1 arc in 8 is orange/red: a complementary accent that keeps it from looking flat.

## Timeline (cast 1; casts 2-4 are the same, +6.8 / +13.4 / +20.3 s)
| t (s) | frames | event |
|---|---|---|
| 2.2-2.3 | f0023-f0024 | world desaturates and darkens slightly (ColorCorrection ramp) |
| 2.4 | f0025 | blue tint + dark vignette |
| 2.5 | f0026 | near-black blue world, white thin 4-point star cross on the character (lens-flare style, ~3x char height) |
| (cast 3/4: 16.0, 22.9) | f0161, f0230 | extra beat: black orb with a bright blue rim and inner glow on the character |
| 2.6 | f0027 | flat blue world tint, small bright ring at the feet |
| 2.7 | f0028 | BURST: white-hot spiky starburst at the feet, blue edges, ~4x char width |
| 2.8-5.1 | f0029-f0052 | SUSTAIN: crescent slash arcs (white core, cyan/blue body) around the character at random tilts, re-rolled every 0.1 s; a flat glowing ring decal on the ground; occasional vertical spikes; orange/red accent arcs |
| 5.3 | f0054 | arcs shrink into the ring and fade; world back to normal within 0.1 s |

## Layers
- Grade: ColorCorrection TintColor to #4a78c8, Brightness -0.3 → -0.6 for the star frame, back to 0 on the burst.
- Star flash: 2 crossed thin white beams (4 points), 0.1 s.
- Orb (variant): black sphere, blue fresnel rim #3a7bff, 0.1 s.
- Burst: spiky flipbook, white core #ffffff, edge #6fb0ff, 0.1-0.15 s, additive.
- Crescent arcs: half-ring meshes with a gradient texture (white inner edge → #4aa0ff → transparent), 3-6 alive at once, each lives 0.1-0.2 s, scale 1.5-2.5x char height, random rotation on all axes.
- Accent arcs: same mesh, #ff7a3a → #c03040, thinner, 1 in 8.
- Ground ring: flat ring decal #8fd0ff, additive, pulses in opacity.
- Light: PointLight #5aa0ff during the sustain (the floor around the character glows blue).

## Replication recipe (Roblox)
1. Anticipation 0.4 s: tween ColorCorrection (Saturation -0.5, TintColor #4a78c8, Brightness -0.6) over 0.3 s; at 0.3 s show the star (2 Beams or a BillboardGui star, 0.1 s).
2. Burst: Emit(1) spiky flipbook ParticleEmitter (Size 8, Lifetime 0.15, LightEmission 1) + reset ColorCorrection to 0 in 0.05 s.
3. Sustain 2.5 s: loop every 0.1 s: clone 3-4 crescent MeshParts (Neon off, texture with alpha gradient, Transparency 0.1), CFrame = root * random angles, tween Size 1→1.3 and Transparency →1 over 0.15 s, Debris 0.2 s. 1 in 8 uses the orange texture.
4. Ground ring: flat cylinder or decal at the feet, Transparency 0.3 ↔ 0.6 sine; PointLight Range 14 Brightness 2.
5. End: ring shrink 0.2 s, everything destroyed (Debris), no leftovers.
Budget: <= 8 arcs alive, 1 emitter, 1 light → fine for mobile.

## Not verified
- Whether the arcs are meshes or ParticleEmitter flipbooks (they look like meshes because they have perspective).
