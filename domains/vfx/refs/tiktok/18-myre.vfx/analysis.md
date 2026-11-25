---
summary: Ref 18: weekly Roblox skill VFX reel, 7 skills on a grey dummy, one hue each, glowing crack floors, crack domes, 1-frame silhouette wipes
updated: 2026-11-25
status: current
---
# 18 · "What i've made in vfx this week" (Roblox skills, made with Claude)
42.7 s · 425/427 kept (camera always moves) · no captions · all 18 sheets viewed · top bar cropped (on-screen text only: "Dm me to buy").
The most directly reusable ref so far: plain grey R6 dummy, dark reflective studio floor, one skill per ~5 s.

## Why the reel reads as "pro"
- **One hue per skill** on a black, reflective floor: the hue paints the floor reflection, so the whole frame changes colour per skill without any background work.
- **Every skill ends on the ground**: glowing cracks (hex/Voronoi lines) in the skill hue + a translucent dome that expands from the impact (purple 4.0, teal 17.6, ice 30.6). Same template, re-coloured.
- **1-frame silhouette wipes** between shots: a flat full-screen matte of the character or debris shape (purple 2.9, teal 17.4, black/white 21.3, orange 24.3, white 30.0, black/white 38.3). It cuts on action and hides the camera jump.
- Thin streak sparks (stretched particles, velocity-aligned) instead of round dots: they read as speed.

## The 7 skills
| # | t (s) | Hue | Beats |
|---|---|---|---|
| 1 | 0.6-2.8 | cyan → red | punch: ring shockwave around the fist + hundreds of thin cyan streak sparks + black debris (0.7-1.6); second punch red sparks + red arc (1.8-2.6) |
| 2 | 2.9-6.7 | purple | silhouette wipe → orb of white rings in the hand (3.0-3.4) → slammed into the floor (3.6) → purple crack web + glassy dome (4.0-4.3) → ground split runs forward, rock slabs tilt up, light pillar at the end (4.4-5.4) → dark slabs float, embers (5.5-6.7) |
| 3 | 6.8-13.5 | red | red embers in the air (6.8-7.6) → thin red laser lines sweep through the scene (7.8-9.1) → dark dome closes with red rim (10.3-10.7) → red laser-grid arena: curved red blades on the walls, grid lines on the floor (10.8-13.5) |
| 4 | 13.6-20.4 | teal | glowing sword, teal motes (13.6-14.5) → teal pillar room, ground slash arcs, black rocks (14.7-16.7) → leap, silhouette wipe (17.4) → down-strike: teal crack web + dome + vertical light beam (17.6-18.7) → long teal ground slash lines (18.8-20.4) |
| 5 | 20.5-27.8 | gold/orange | stomp: thin gold spark streaks + ground ring (20.7-21.2) → B/W wipe → gold light ribbons spiral up into a ring (21.4-22.0) → orange crack web from above (22.1-22.7) → falling streak rain (22.8-24.1) → orange wipe → lava floor: slabs lift with yellow glowing cracks, dummy rises on them, gold embers (24.4-27.8) |
| 6 | 27.9-34.6 | ice blue | bow with glowing blue string, ice hex floor under the feet (27.9-28.7) → shot: blue streak sparks + rune circle (29.0-29.2) → ice shards pop up in a line (29.3-29.9) → white wipe → rune circle + crack web → big crystal cluster bursts up, ice dome (30.6-32.0) → crystal field remains (32.1-34.6) |
| 7 | 34.8-41.4 | gold/white | white motes gather, warm floor glow (34.9-35.6) → white flash dome, full-screen cream (35.8-35.9) → gold rune floor with radial lines (36.0) → huge white light pillars + concentric rings, floating rune circles (36.2-38.2) → wipe → radial gold grid, hex slabs lift with gold cracks (39.4-40.9) → back to idle, small gold spark under the feet (41.5-42.6) |

## Replication recipe (Roblox, client VFX fired by a server event)
- Studio: Lighting Future, black skybox, floor = SmoothPlastic black with Reflectance 0.3 (or a glossy MaterialVariant), Bloom Intensity 1 Threshold 0.8, ColorCorrection Contrast 0.15.
- Crack web: a Decal/flat MeshPart with a Voronoi crack texture (white lines, alpha), Color3 = skill hue, LightEmission via a SurfaceGui-free Neon trick: use a thin mesh with Neon material in the crack shape; scale 0 → 1 in 0.15 s, fade over 1.5 s.
- Dome: sphere MeshPart (ForceField material or Glass, Transparency 0.6, hue colour), Size 1 → 20 studs in 0.25 s (Quad Out), Transparency → 1 over 0.4 s.
- Streak sparks: ParticleEmitter, Orientation VelocityParallel, Size 0.05-0.1, Squash stretch via a tall thin texture, Speed 40-80, Drag 4, Lifetime 0.2-0.5, LightEmission 1, Emit(80-150) per hit.
- Ground split: 6-12 slab MeshParts along the slash line, rotate 15-35° up with Back Out in 0.2 s, hue PointLight under each 2nd slab.
- Light pillar: Neon cylinder 0.5 → 6 studs wide, 200 studs tall, Transparency 0 → 1 over 0.6 s + rings (flat torus meshes) rising.
- Silhouette wipe (cutscene/showcase only): ScreenGui ImageLabel of the dummy silhouette (or full-frame colour Frame), 1 frame at 0 transparency, then hide. Owner rule: a 1-frame flash is fine in showcases, keep ≤ 3 Hz.
- Showcase camera: game-script CameraType Scriptable, 1-2 s shots, low angles, cut on each wipe.

## Not verified
- Exact instance types (crack decal vs mesh; dome material); whether the reel was captured in Studio or a render.
