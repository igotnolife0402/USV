---
summary: Ref 06 (@bbstudios4): Roblox spin-slash into ground slam, dark-edged blue crescent then orange fire crater, blue night grade, cast 3x
updated: 2026-11-25
status: current
---
# 06 · "Claude can build whole fighting animations" (Roblox Studio capture)
11.6 s · 45/116 kept · no captions · casts at 1.2, 4.9, 8.6 s (each ~1.4 s), filler between dropped.

## Why it reads well
- Colour story: cold blue for the wind-up slash, hot orange/red for the impact. Complementary colours mark "build-up" vs "payoff" with no text.
- The slash arc has a DARK outer band and a bright blue inner edge (anime ink style), so it reads on a bright or a dark background.
- Night grade (deep blue fog, low light) makes the fire the brightest thing on screen.

## Timeline (cast 1)
| t (s) | frames | event |
|---|---|---|
| 1.2-1.4 | f0013-f0015 | jump spin: thick crescent arc wraps the character (dark #0a1530 outer band, #3a8cff body, white inner edge), ~2x char height, rotating |
| 1.5-1.7 | f0016-f0018 | arc thins and fades while still rotating; faint after-image rings |
| 1.8 | f0019 | SLAM: orange-white fire burst at the ground, red radial glow on the floor, dark ring crater |
| 1.9-2.1 | f0020-f0022 | spark streaks (thin orange lines) shoot out sideways; flame column; white straight "speed lines" around the hit |
| 2.2-2.5 | f0023-f0026 | black debris chips float up, red ground glow + shockwave ring fade; ring outline lingers |
| 3.1 | f0032 | back to idle |

## Layers
- Crescent: mesh arc, 3 bands (dark outer, blue body, white inner edge), life 0.5 s, spin ~720°/s, fade last 0.2 s.
- Burst: fire flipbook, core #fff2c0 → #ff8a20 → #c02020, life 0.2-0.3 s, additive.
- Sparks: thin stretched streak particles #ffb060, speed high, life 0.2 s, drag.
- Ground: red glow decal #ff3b30 at 40 % → 0 over 0.6 s; dark crater ring + an expanding thin ring outline.
- Debris: small black chips, upward + gravity, life 0.8 s.
- Grade: Atmosphere blue #2a4a7a, Density 0.4; ambient low; slight motion blur / radial streaks on the slam.

## Replication recipe (Roblox)
1. Slash (0.5 s): crescent MeshPart with a 3-band texture, CFrame-spun on the root at 720°/s, Transparency 0→1 over the last 0.2 s.
2. Slam (on the landing animation event): fire ParticleEmitter Emit(1) big + Emit(20) sparks (Speed 30-50, Drag 6, Lifetime 0.2, Size 0.1→0, LightEmission 1, Orientation VelocityParallel); ground decal tween Transparency 0.6→1 in 0.6 s; ring mesh Size 2→14 studs in 0.25 s.
3. Debris: Emit(12) black chips, Acceleration (0,-40,0), Lifetime 0.8.
4. PointLight #ff7a30 Range 16, Brightness 4→0 in 0.4 s; camera shake 0.2 s (game script).
5. Clean-up with Debris; nothing persists.

## Not verified
- Exact animation keyframes (the character is small in frame).
