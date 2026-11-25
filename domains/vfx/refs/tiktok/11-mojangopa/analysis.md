---
summary: Ref 11: Roblox RNG wolf aura built in 7 prompt rounds; gold-ember claws from ground cracks, spikes, body energy, heartbeat
updated: 2026-11-25
status: current
---
# 11 · "Every prompt I used to make this aura with Claude" (Roblox RNG aura)
84.5 s · 810/845 kept (the aura never stops moving) · 36 caption cues → step view in `sheets_cues/` (one frame per cue) + full sheets for the final look (sheet26 = 63.5-65.8 s).

## The build order (the main lesson: layers added one prompt at a time)
| Step | t (s) | Prompt / change | Result |
|---|---|---|---|
| 0 | 7.0-13.9 | long master prompt: dark ghost-wolf silhouette that breathes, rim-lit gold vein marks, glowing eyes, claw scratches hang in the air then dissolve, signature moment every 5-8 s (head up, eyes flash, ring goes out), readable in daylight (dark mass + bright edges) | spec only |
| 1 | 16.3 | the wolf | black wolf with gold crack veins and orange chest plate |
| 2 | 20.7-27.4 | "make an aura" | flat black ground disc + thin gold spikes: reads as a "2D black spot" |
| — | 27.4 | "looks super 2D, just 1 colour, no shading, no details" | the correction that mattered |
| 3 | 32.3 | real 3D claws from the ground | curved claw blades with glowing gold cracks at their roots |
| 4 | 38.7 | spinning spikes | small rotating spikes; "didn't add much" |
| 5 | 44.2 | "way more effects, small glitters, animated VFX" | energy wisps around the body + glitter sparks |
| 6 | 50.1 | small slashes | short gold slash flicks in the air |
| 7 | 53.5 | heartbeat core + clean storm | pulsing light in the chest, faint storm swirl |
| 8 | 55.7 | bigger claws, more colours | claws taller, gradient orange → yellow → white tip |
| 9 | 59.8-64.1 | "missing something on the ground, where do the claws come from?" | ground-break animation: claws erupt from glowing cracks |

## Final look (63.5-68.9 s)
- 10-12 claw blades in a ring (~2.5x wolf height), curved inward like fangs, dark base #2a1a08, body #ff8a10, bright tip #fff2a0 (gradient over length), slight sway.
- Each claw root = a star of glowing cracks on the ground (#ffd23a core, #b04a00 edges), white sparkle at the centre.
- Wolf: matte black, gold vein lines, eyes #ffe060 that flare to a white star glint every few seconds (63.7-64.0).
- Glitter: small white/gold 4-point sparkles drifting up around the body.
- Background stays near-black #0a0a0c: the whole aura is one hue family (black + gold), which is why it looks premium.

## Replication recipe (Roblox aura, client-side)
1. Claws: 10-12 curved MeshParts in a circle radius 4-6 studs, SurfaceAppearance or a gradient texture (dark base → orange → white tip), Neon on a thin inner strip only; sway with a sine on the CFrame (±4°, 1.5 s).
2. Ground cracks: Decal/flat MeshPart per claw root with a star crack texture, Transparency pulse 0.1 ↔ 0.4; PointLight #ffb030 Range 6 at each root (or 3 shared to save lights).
3. Ground break (on equip): claws start below ground and rise 0.4 s Back-Out while the crack decals scale 0 → 1; Emit(20) rock chips.
4. Glitter: ParticleEmitter, 4-point star texture, Rate 15, Lifetime 1-1.5, Size 0.2 → 0, Speed 1 up, LightEmission 1, Color gold → white.
5. Body energy: Beam wisps between attachments on the torso, TextureSpeed 1.5, Transparency 0.3 → 1 at the ends.
6. Signature beat every 6 s: eye glint (Billboard star 0 → 1.5 → 0 in 0.3 s) + all crack lights +50 % for 0.3 s.
- Process lesson: start with a master spec (silhouette, palette, signature moment, daylight readability), then add ONE layer per round and judge it; name the failure plainly ("flat, 1 colour, no shading").

## Not verified
- Exact instance types (claws could be Beams with curve); the final 73.5-84 s is an ad for another game, not analysed.
