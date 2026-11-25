---
summary: Ref 02 (@robloxwithai): anime water-sword ultimate in Roblox, charge → slash → launch → 1.6 s inverted impact frame → bubble shockwave
updated: 2026-11-25
status: current
---
# 02 · water-sword ultimate (Roblox, "Claude made this in one prompt")
Source: meta.json · 18.9 s · 161/189 frames kept · the same 9.5 s clip plays twice (0-9.5 s game view, 10.6-18.8 s Studio screen capture with toolbar).
Captions (ASR, audio is a meme voice line, not narration): 0.7 s "With my specialist ability", 2.9 s "...100% of...", 7.0 s "...the name of my power is Emperor time" → the impact frame lands on the punchline.
Hexes below are eyeballed from sheets (stats.csv palette predates the letterbox-crop fix).

## Why it reads well
Fast cuts (0.1-0.3 s per shot) during the build-up, then ONE long freeze (impact frame, 1.6 s) at the payoff. Every shot has one subject in the middle, effects are flat cel-shaded shapes with white rims, so they read at phone size.

## Timeline (first pass; second pass = +9.1 s)
| t (s) | frames | event |
|---|---|---|
| 0.0-1.7 | f0001-f0018 | idle wide shot, warm sun flare top-centre; filler dropped |
| 1.8-2.0 | f0019-f0021 | camera push-in along the sheath; first cyan lightning arcs crawl on it |
| 2.1-2.3 | f0022-f0024 | arcs + cyan "water blob" sprites spawn along sheath; white 4-point star flare at the hilt |
| 2.4-2.6 | f0025-f0027 | blobs grow and merge into a blue cel-shaded water mass that fills the frame (release) |
| 2.7-2.8 | f0028-f0029 | water geyser at feet + vertical cyan light pillars; low angle |
| 2.9-3.4 | f0030-f0035 | low-angle pose; cel-shaded water DRAGON head aura behind the character (white teeth, light rim) |
| 3.4-4.4 | f0035-f0045 | sword draw + 2 slashes: wide white/grey blade trail, water splash sprites at contact, cyan crescent droplets |
| 4.5-4.8 | f0046-f0049 | camera whips around the head; drip particles linger |
| 4.9-5.0 | f0050-f0051 | full-screen blue water slab with thick white rim = wipe transition |
| 5.1-5.3 | f0052-f0054 | cut to victim: horizontal blue/white crescent ring slices around the victim's waist; sun glare |
| 5.4-6.6 | f0055-f0067 | victim launched; camera follows with dutch roll up to ~40°, sky visible, cyan streak behind |
| 7.0-7.2 | f0071-f0073 | empty sky beat (0.2 s), then a dark-red silhouette enters |
| 7.3-8.8 | f0074-f0089 | IMPACT FRAME held 1.6 s: pure white world, attacker black, victim dark maroon, two blue ribbon lines spiral around them; slow camera drift only |
| 8.9-9.1 | f0090-f0092 | back to colour: glassy bubble shockwave (bright rim, clear centre) + diagonal white/cyan streak through it, rim breaks into wisps |
| 9.2-9.5 | f0093-f0096 | aftermath: victim on the ground, sun flare, end |

## Layers
- Charge arcs: thin branching lightning, #6fb8ff → #d8f0ff core, additive, life ~0.1 s, re-randomised every frame.
- Water blobs: flat cel sprites, fill #9fdcff, darker inner shapes #3f8fe0, white rim; pop in at full size, shrink + fade 0.3-0.5 s.
- Hilt flare: 4-point star, white, scale 0→big→0 in ~0.2 s, warm-white bloom.
- Dragon aura: stylised water dragon head, blue #2f7fe0 body, white teeth/rim, bobs slightly, ~1.5x character height, behind the character.
- Blade trail: wide, white #ffffff → light grey, alpha 0.8 → 0, life ~0.15 s.
- Hit ring: flat crescent ring at waist height, white core, blue #2a7fd6 edge, expands fast (~0.15 s), plus a vertical white slash line.
- Wipe slab: one huge blue cel shape #1f6fe0 with white rim #ffffff crossing the camera in 2 frames.
- Impact frame: background #ffffff, attacker #000000, victim #2b0505, ribbons #7b93e6 (2 strokes, ~4 px, spiral).
- Shockwave: bubble/fresnel sphere, rim #e8f6ff, centre clear, expands ~0.2 s then breaks into wisps.
- Lighting: low warm sun #ffd27a with heavy bloom/sun rays; ground dark blue-grey checker.

## Motion and camera
- Build-up shots 0.1-0.3 s each; cuts land on new effect beats.
- Camera: extreme close-up dolly along the weapon, low angles for power, whip pans, dutch roll on the launch.
- Freeze: action stops completely during the impact frame; only a slow camera drift keeps it alive.
- Ease: pops are instant-in, ease-out-out (scale 0→1 in 1 frame, fade over 3-5).

## Replication recipe (Roblox, client-side visuals fired by a server RemoteEvent)
1. Charge 0.8 s: 2 Attachments on the sheath + Beam (lightning flipbook texture, Width0/1 0.3, LightEmission 1, TextureSpeed 4, Color #6fb8ff); ParticleEmitter blobs (cel flipbook 4x4, Rate 60, Lifetime 0.3-0.5, Size 0.4→0, Speed 1-3, SpreadAngle 180, LightEmission 0.2); PointLight #6fb8ff Range 8; BillboardGui star at hilt tweened 0→3→0 studs in 0.2 s.
2. Release 0.3 s: burst Emit(40) big water flipbook + 3 neon cylinders (light pillars) scale Y 0→20, fade 0.3 s.
3. Aura: dragon MeshPart (cel texture, Highlight white outline, OutlineTransparency 0.2) welded behind HumanoidRootPart, sine bob 0.3 studs.
4. Slash: Trail on blade (Lifetime 0.15, WidthScale 1→0, Color white→#cfe8ff, Transparency 0→1, LightEmission 0.5); splash Emit(15) at contact point.
5. Hit: two ring meshes (white core + blue outer) at victim waist, Size 1→8 studs in 0.15 s Quad Out, Transparency 0→1.
6. Launch: victim AssemblyLinearVelocity up+back; cinematic camera follows with roll tween to 35° (game-script camera is allowed, owner rule 8).
7. Impact frame 1.2-1.6 s (guess, not verified in Studio): anchor both characters + pause anims; Highlight on each (FillTransparency 0, FillColor black / #2b0505, OutlineTransparency 1, DepthMode AlwaysOnTop); white out the world (ColorCorrection Brightness 1 + Saturation -1, or a white inverted sphere around the camera); 2 Beams spiral #7b93e6; camera drift 0.5 stud/s.
8. Shockwave: sphere with ForceField material (fresnel bubble look, guess) Size 2→14 in 0.25 s, Transparency 0.2→1; diagonal neon line part fades 0.3 s.
9. Lighting for the whole move: SunRays 0.2, Bloom Intensity 1 Size 40, low sun.

## Not verified
- Exact Roblox instances used (flipbook vs mesh for the dragon, how the white-out is done).
- Audio timing beyond the ASR caption times.
