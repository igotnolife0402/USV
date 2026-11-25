---
summary: Reference-video pipeline (0.1 s important frames, captions, Sonnet grabbers, brain analysis) + rules distilled from 17 analysed TikToks
updated: 2026-11-25
status: current
---
# Reference videos → replication recipes

Goal: learn how a reference looks and moves well enough to rebuild the technique with our tools (VFX Generator, Ember VFX Studio, Umbrio, Roblox emitters, three.js). Same technique, original assets: never copy someone's characters, logos or art. Analyses: [refs index](domains/vfx/refs/index.md). Tool: [tools/refs/README.md](tools/refs/README.md).

## Phases
1. **Intake** (brain): links → `state/<batch>.md` table, numbered in link order (`NN-author` folders). Pasted links can be glued together: split on `https://`; drop duplicates (owner sent the same link twice for ref 18).
2. **Grab** (invoke the `crew` skill first so the hooks see it, then 3 `crew-worker`, Sonnet 5.5 low, one worker per <= 6 links (1 link = 1 worker, ~35 s); the vfx/roblox build skills are not needed for grab + analysis): `node tools/refs/grab.mjs <url> <NN>` per link, report the JSON line, one retry. No image reading. Batch 1: 17 links in ~3.6 min.
3. **Verify** (brain): every JSON line has kept > 0; `error` lines (region block) listed as failed, never hidden.
4. **Analyze** (brain, ONE video at a time): meta.json (desc, hashtags, on-screen stickers) + transcript.md first, then sheets in order. Talk/tutorial videos: `keep.py <dir> --cues` → `sheets_cues/` (one frame per caption) instead of 30+ sheets. Write `analysis.md` before opening the next video.
5. **Distill** (brain): patterns seen in 2+ videos → the rules below (and the domain playbook when it is a build rule).

## analysis.md template
What it is + why it reads well · timeline `t → event` with frame names · layers (shape, colour hex, blend, life) · motion/camera · replication recipe (tool + params) · not verified (unviewed sheets, guesses).

## Rules distilled from batch 1 (2026-11-25, refs 02-18)
1. **Contrast before the hit**: darken, desaturate or white-out the world for 0.3-1.6 s right before the payoff, then return colour on the hit (02 impact frame, 07 dark star flash, 16 B/W manga frames, 15 white + radial lines).
2. **One hue per effect, complementary accent only**: blue build-up → orange payoff (06), black + gold only (11), one hue per spell + pad (04), one accent per cutscene on a desaturated grade (15).
3. **Cel/toon VFX = meshes with 3 flat bands + dark outline + white highlight**, not particles (04, 02, 06 crescent with dark outer band). Reads at phone size and is cheap.
4. **Nothing vanishes clean**: dissolve (noise spots) then shards/wisps (04, 02 bubble breaks into wisps). Matches the vfx rules file.
5. **Sustain = many short re-rolled pieces** (crescents re-rolled every 0.1 s, 07; lightning re-randomised each frame, 02) instead of one long-lived mesh.
6. **Ground anchors every effect**: a pad, ring, crack star or decal under the caster (04, 07, 11, 12, 08). The aura in 11 only worked once the claws came out of glowing ground cracks.
7. **Themed props around the subject sell the theme cheaply**: orbiting or ringed props (12, 08), always the same accent metal (gold).
8. **Showcase editing**: calm establishing shot → fast 0.1-0.3 s cuts during build-up → one long hold at the payoff → slow wide reveal → fade (02, 03, 15, 16). Realism (03): one soft overhead light, dark room, detail close-ups first, wide reveal last.
9. **Build in rounds, one layer per prompt**, naming the failure plainly ("flat, 1 colour, no shading") (11); a multi-angle turnaround sheet before modelling (17).
10. **Skins/variants = one base + palette + 1-3 silhouette add-ons** (13, 08).
11. **Sound workflow**: build a timed event list from the frames, ask feeling / style / loudness target (portfolio ~-10, in-game ~-16, cinematic ~-23 LUFS) / voice-music, then layer (09).
12. **Crack web + dome = universal impact template**: hue-coloured Voronoi cracks scale in on the floor while a translucent dome expands from the hit; re-colour per skill (18 x3, 02 bubble shockwave).
13. **1-frame silhouette wipes** (flat matte of the character/debris shape) cut on action between showcase shots and hide camera jumps (18 x6, 16 smears).
- Measurable rules are scored by `tools/refs/baseline.py`; first own effect: tools/vfx/frost-fault (7/7, cel bands still weak by eye).
- Web builds: colour-cycling flicker (16) must stay ≤ 3 Hz full-screen (vfx rules file).

## Known tool limits
- Handheld or orbiting-camera videos keep ~95-100 % of frames (every frame changes): the filter cuts filler only on locked-off shots. Use `--cues` or view every 3rd sheet and say so in "not verified".
- Region-blocked TikToks (`cross_border_violation`) can't be grabbed from the cloud: needs a PC grab or the owner's screen recording.
