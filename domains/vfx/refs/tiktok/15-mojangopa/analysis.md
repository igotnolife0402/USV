---
summary: Ref 15: four Roblox RNG aura reveal cutscenes (sea titan, glass shards, cannon, nova) made with Claude + Blender; dark grade, one hue
updated: 2026-11-25
status: current
---
# 15 · "POV: Claude + blender make insane cutscenes" (RNG Battlegrounds reveals)
16.8 s · 150/168 kept · no captions · all 7 sheets viewed. Each aura gets a 3-4 s reveal cutscene with its name in white caps under the shot.

## Why they read as "insane"
- Each reveal is a tiny film: establishing shot → build-up → reveal pose → one bright hit, in 3-4 s.
- Dark, desaturated grade with ONE accent hue per aura (cyan, cold white, orange-red, violet). The accent is the only saturated thing on screen.
- Blender-made set pieces (sea, monster, glass panes, cannon) carry the scale; Roblox avatar stays small and black so it reads as a silhouette.
- Hard cuts between auras; no transitions needed.

## Cutscenes
| Aura | t (s) | Beats |
|---|---|---|
| THALASSOR (sea) | 0.0-6.2 | stormy sea + lightning, helmet rises from the water (0-1.5) → underwater cyan light (2.1-2.5) → mound swells (2.6-3.1) → huge sea serpent erupts with cyan eye lights, mist, spray (3.2-6.0) → cyan flare (6.2) |
| SAUM (glass) | 6.3-12.8 | close-up: a glass shard slides past dark rock (6.3-7.0) → giant panes rise around the avatar (7.1-8.4) → wide: avatar in a ring of tall glass shards with cold white rim light (8.5-11.1) → panes shatter, black and white shards fly (11.2-12.8) |
| DREADNOUGHT (cannon) | 12.9-15.0 | dark red room, heavy cannon on the avatar's shoulder, orange rim light on metal (12.9-14.0) → muzzle flash with radial black streak lines + fire ring (14.1-14.3) → slow orange fireball/dome (14.5-15.0) |
| NOVA (star) | 15.1-16.7 | violet lightning on dark (15.1) → close-up blue-white star burst + sparkles + thin ring (15.2-15.7) → avatar pose (15.8) → white flash with radial black speed lines (15.9) → violet god-rays from below + magic circle (16.0-16.3) → rays fade into drifting stars (16.4-16.7) |

## Look values
- Grade: blacks #0a0c10, mid-greys blue-tinted #2a3240; accent hues: cyan #6ff0ff, cold white #dfe8ff, fire #ff6a1a, violet #7a5aff.
- Rim light from behind/side only; no fill light → silhouettes.
- Impact frames: radial thin black lines over a white flash (14.1, 15.9), 1-2 frames.

## Replication recipe (Roblox cutscene, game-script camera)
- Per aura: a Model set piece (Blender .fbx MeshParts) spawned off-map, 3-4 CameraTweens (each 0.5-1.5 s, Linear or Quad In for the push), Lighting swap at start (ColorCorrection Saturation -0.6, Contrast 0.3, TintColor per hue; Atmosphere Density 0.5), restore at end.
- Hit frame: full-screen ScreenGui ImageLabel with a radial black-line texture over white, 2 frames; Bloom Intensity 2 for 0.2 s.
- Glass: thin MeshParts (Glass material, Transparency 0.3, Reflectance 0.2), shatter = swap to 20-40 pre-cut pieces with random AssemblyLinearVelocity, Debris 1.5 s.
- Nova rays: Beams fanning from below the avatar (Width 0.5 → 4, LightEmission 1, #7a5aff), ParticleEmitter stars Rate 40 Lifetime 1.5.

## Not verified
- How much is pre-rendered in Blender vs. live in Roblox (the title says both).
