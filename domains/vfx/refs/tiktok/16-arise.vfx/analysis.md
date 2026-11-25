---
summary: Ref 16: anime fan-edit VFX of a transformation (manga ink impact frames, 0.1 s colour-cycling flicker, smears); technique only
updated: 2026-11-25
status: current
---
# 16 · anime transformation fan edit (2D, 16:9 inside 9:16)
27.4 s · 263/274 kept · no captions · sheets 1, 2, 3, 5, 7, 9, 11 viewed (4, 6, 8, 10 not: they continue the same flicker loop, the stats show no new cuts there; not visually verified).
Hashtags name an existing manga/anime. The characters are someone else's IP: we copy the editing and VFX technique only, never the characters or designs.

## Why it hits so hard
- Impact frames in pure black and white: 4-5 frames (1.0-1.4 s) of manga ink (thick white speed hatching on black, then the reverse) between colour shots. Removing colour for 0.5 s makes the colour return feel like an explosion.
- Colour cycling at 10 Hz: during the 12 s transformation (3.2-19 s) every frame swaps the grade (magenta/violet, then orange/yellow, then cyan/white, then pink), while the drawing barely moves. That is how a near-static drawing feels violent. Owner VFX rule: no full-screen flashes faster than 3 Hz in our own web builds, so use a slower 3 Hz cycle or a smaller area.
- Ink lightning: thick black lines with a white/pink glow edge (inverted lightning) crawl over the frame, never thin and bright.
- Smears and wipes: big white brush-stroke shapes cross the frame in 1-2 frames (21.9-22.1 s), hiding cuts.
- Calm bookends: slow sunset sky shots (20.0-21.8, 25.0-27.0 s), almost static, so the chaos reads as chaos.

## Timeline
| t (s) | event |
|---|---|
| 0.0-0.9 | warm wide shot, debris hanging in the air, a cyan electric arc crawls once (0.1-0.2) |
| 1.0-1.4 | IMPACT FRAMES: black/white manga ink, silhouette + radial hatching, inverts each frame |
| 1.5-2.3 | colour back: magenta/violet energy explosion, black rock shards, orange 1-frame flash at 1.6 |
| 2.4-3.1 | glowing pink veins spread across the sky, horizontal glitch lines, white smear wipe at 3.1 |
| 3.2-19.0 | transformation close-up: fanged dark creature centre-frame, colour grade swaps every 0.1 s (violet / orange / cyan / pink), pink and cyan ink lightning crawling, black blobs flying |
| 9.6-9.9 | cut-away: calm face close-up (pacing break) |
| 10.0-11.9 | wide: white sphere blast at the top → cyan + magenta lightning crown, figure on a curved bridge, slow camera |
| 20.0-21.8 | sunset over a city, pink sparks fade |
| 21.9-22.3 | white brush smear + black whip lines swipe across (transition) |
| 25.0-27.3 | figure jumps out of the clouds toward the camera (scale 1 → full frame in 2 s), hold on a close-up |

## Replication recipe
- Web / three.js post: an impact-frame pass = threshold to pure black/white + a radial hatching texture overlay, 3-5 frames, inverting every other frame; a palette-swap pass = gradient-map LUT chosen per beat (violet, fire, ice, pink), switched on the beat at max 3 Hz.
- Ink lightning: polyline bolt drawn twice (black, 6 px; then a 2 px #ff6ad5 or #6ff0ff glow line offset inside), re-randomised every 2 frames.
- Roblox: impact frame = ColorCorrection Saturation -1 + Contrast 1 + a ScreenGui hatching ImageLabel for 0.3 s; palette beats = tween TintColor between 3 hues on the ability's hit times; ink lightning = black Beam behind a coloured thinner Beam.
- Editing for showcase videos: build-up (calm) → 4-frame B/W impact → colour chaos → calm wide → smear transition → hero close-up.

## Not verified
- Sheets 4, 6, 8, 10 (assumed same loop, see above).
