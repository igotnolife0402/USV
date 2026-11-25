---
summary: Ref 10: Roblox anime power-up, red manga-panel backdrop, ink cracks, HA glyphs, blue vortex cut, ice burst
updated: 2026-11-25
status: current
---
# 10 · "Claude now has the skills of a pro Roblox dev" (Roblox Studio capture)
8.7 s · 57/87 kept · no captions · one 5 s cutscene-style ability, then idle.

## Why it reads well
- Background swaps instead of more particles: for the key beats the whole world becomes a flat red "manga panel" (radial speed lines, black ink cracks), so the character pops without any extra effects.
- 2D anime language in 3D: black-outlined lightning, white cel smoke puffs with hard edges, floating "HA" text glyphs as particles.
- Hard colour cuts: red (rage) → blue (vortex/ice burst) → red + yellow (release) → white flash → back to normal.

## Timeline
| t (s) | frames | event |
|---|---|---|
| 1.3-1.6 | f0014-f0017 | wind-up animation: arms raise, crouch |
| 1.7-2.3 | f0018-f0024 | CUT: full-screen red backdrop, radial light streaks, black jagged ink cracks, white cel smoke puffs, "HA" glyphs; character lit hot orange/yellow from below with a dark silhouette top |
| 2.4-2.6 | f0025-f0027 | character blows out to white/pink (over-exposed), smoke puffs grow |
| 2.7 | f0028 | character turns pale blue: colour handoff |
| 2.8-3.3 | f0029-f0034 | CUT: blue tunnel vortex (concentric rings + swirl streaks), camera dives in; small white star at the centre |
| 3.4-4.1 | f0035-f0042 | back in the world: blue ice/lightning starburst on the character, cel smoke, thin blue lightning bolts |
| 4.2-5.0 | f0043-f0051 | ground starburst ring, many white cel smoke puffs around the feet, blue cube debris |
| 5.0-5.4 | f0051-f0055 | red panel again: thick yellow-white lightning bolts with black outline, gold star sparks, "HA" glyphs, red cracks |
| 5.5-5.7 | f0056-f0058 | release: white full-screen flash (1 frame), red lightning streaks across the ground |
| 5.8-6.6 | f0059-f0067 | residue: red ink lightning, floating HA glyphs, gold embers, fade |

## Layers
- Red panel: #c00000 → #ff2a1a radial gradient + light streaks #ff6a4a; black ink cracks (thick jagged polylines).
- Smoke: white #ffffff cel puffs with a soft grey shadow side, pop + grow + fade, life 0.4 s.
- Glyphs: "HA" text, #ff4a3a fill on the red panel / yellow on the world shots, random size + rotation, drift up.
- Vortex: tunnel texture #2a50c8 / #8fb0ff rings, scrolling inward.
- Ice burst: spiky star #e8f4ff core, #5aa0ff edge, thin lightning #7fc0ff.
- Release bolts: #fff4b0 core, #ffd23a body, black #000 outline.

## Replication recipe (Roblox)
1. Panels: an inverted sphere (MeshPart, normals in) around the camera with a red radial-line texture, shown for 0.6-0.8 s; Highlight on the character (FillColor #ffb030, FillTransparency 0.4, OutlineColor black). Or a ViewportFrame cutscene if the world must disappear fully.
2. Ink cracks + bolts: Beams with black-outlined lightning textures (2 layers: black wider beam behind, yellow narrower in front), Segments 10, CurveSize random, 0.1 s life, re-rolled.
3. Smoke: ParticleEmitter, cel puff flipbook (hard edge), Size 1→3, Lifetime 0.4, Rate burst Emit(15).
4. HA glyphs: ParticleEmitter with a "HA" texture (our own font render), Rotation random, Size 1-2, Speed 3 up, Lifetime 0.8.
5. Vortex: second inverted sphere with a tunnel texture, rotate + scale camera FOV 70→40 over 0.5 s (game-script camera).
6. White flash: full-screen white Frame, 1 frame at 0 → fade 0.15 s.
Each panel is a separate one-shot; total ability 5 s → "one big effect at completion" fits if the panel beats only play on the final cast.

## Not verified
- How the red backdrop is done in Studio (sphere vs. Sky swap vs. ScreenGui).
