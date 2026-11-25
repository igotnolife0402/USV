---
summary: Ref 03 (@bbstudios4): realistic car showcase in Roblox, dark garage, low-key light, slow detail dollies then wide reveal
updated: 2026-11-25
status: current
---
# 03 · "Claude can now make realistic car models" (Roblox showcase)
29.6 s · 84/296 frames kept (slow dollies → sampled every 0.2-0.7 s) · no captions · on-screen text in the top bar the whole video.
Two cars: dark grey police-style SUV (0-20.9 s), then a white electric pickup (20.9-29.5 s). Real brands. Copy the technique only; our own cars stay original (no logos or plates).

## Why it reads as realistic
- One soft overhead light in a dark concrete garage: the light only catches edges and bevels, so shape comes from the specular highlights, not from flat colour.
- Materials are not clean: matte paint with a dust/grime roughness layer, rough asphalt with faded yellow lines, stained concrete walls.
- Small parts sell it: plate with text, embossed tailgate lettering, LED light strip, amber side marker, door handles, a mirror with a turn-signal strip, a running board, visible panel gaps, an interior seen through the open door.
- The camera never shows the whole car until the reveal; close-ups hide any low-detail areas.

## Timeline
| t (s) | frames | shot |
|---|---|---|
| 0.0-7.3 | f0001-f0074 | low 3/4 front of the SUV, very slow push-in (~2 % per s) |
| 7.5-9.5 | f0076-f0096 | grille + emblem + plate close-up, slight drift |
| 9.6-10.7 | f0097-f0108 | headlight close-up (LED strip, amber corner) |
| 11.2-12.2 | f0113-f0123 | side window, then open driver door showing the interior |
| 12.3-14.2 | f0124-f0143 | rear: taillight, plate, badge |
| 15.5-18.6 | f0156-f0187 | side profile in deep shadow, wheel close-up |
| 19.8-20.2 | f0199-f0203 | REVEAL: wide 3/4 front, whole SUV in the garage |
| 20.5-21.1 | f0206-f0212 | cut: second car wide 3/4 front |
| 21.2-22.4 | f0213-f0225 | front grille / light bar close-up |
| 22.5-23.2 | f0226-f0233 | mirror + door + charge-port badge |
| 23.3-24.4 | f0234-f0245 | rear fender + tail |
| 24.6-27.0 | f0247-f0271 | tailgate with embossed model lettering, slow drift |
| 27.2-28.1 | f0273-f0282 | rear wheel arch |
| 28.5-29.5 | f0286-f0296 | running board, fade to black over ~1 s |

## Look values (eyeballed)
- Garage: walls #3a3a3a-#5a5a58, floor #1e1e1e with yellow lines #c9a227 at ~60 % opacity.
- SUV paint #2b2c2e, roughness ~0.6, dust layer lighter #5a5a58 on lower panels; black wheels #1a1a1a.
- Pickup paint #e9eaea glossy, roughness ~0.25; dark trim #111; taillights #5a0f12 with #b0202a lit core.
- Key light: one cool-white overhead, soft; no rim light; ambient very low; light fog/haze in the distance.

## Camera
- Lens ~50-85 mm equivalent (little distortion), camera height 0.4-1.2 m (car-detail level).
- Shots 1-3 s, each a slow linear dolly or drift; hard cuts; one wide reveal per car, placed late.
- Ends with a 1 s fade to black.

## Replication recipe
- Roblox (our own car model): Lighting Technology Future, Brightness 1, Ambient #101010, OutdoorAmbient #202020, one SurfaceLight/SpotLight overhead (Brightness 2, Range 30, Angle 120, white #e8eef5); Atmosphere Density 0.35 Haze 1; ColorCorrection Contrast 0.1, Saturation -0.15.
  Car: paint MaterialVariant (roughness ~0.6 dark / 0.25 light) + grime decal on lower panels; dark-trim Glass at Transparency 0.3 for windows; Neon only for LED strips (thin, 0.05 studs).
  Shot list = cinematic camera script (allowed in game scripts): 6-8 detail shots of 1-3 s with linear CFrame tweens of 1-2 studs, one wide reveal, fade with a full-screen black Frame.
- Umbrio/three.js: same light rig (1 soft area light above, envMap at 0.2), dark concrete room as the backdrop, 50 mm camera paths.

## Not verified
- Whether it is really Roblox or a Blender render (only the hashtag says #robloxdev).
