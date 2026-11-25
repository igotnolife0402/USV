---
summary: Ref 09: realistic fire-angel boss VFX (other artist) + Claude /sfx-designer workflow: timeline, interview, LUFS targets
updated: 2026-11-25
status: current
---
# 09 · "How did I design this SFX for the VFX by Claude?"
29.3 s · 200/293 kept · no captions (on-screen text carries the story) · the VFX is credited on screen to another artist (Unreal-style showcase). We learn the technique and the SFX workflow, not the asset.

## Structure of the video (good format for our own showcase posts)
0-6 s hook (best 6 s of the VFX, muted look) → STEP 1-4 cards with the UI (6.0-20.3 s) → "THE RESULT, sound on" (20.4-29.2 s, full sequence).

## The SFX workflow shown (the main lesson)
1. Step 1 (6.0-8.4): pick a VFX clip with no sound.
2. Step 2 (8.9-14.5): run a Claude skill `/sfx-designer` on the video file. It first watches the video and writes a timeline with times, e.g. wings ignite 0.8 s, sword drawn 1.1 s, sigil slam 2.1 s, ring of swords 3-4.8 s, shoot skyward 5.0-5.7 s, fire pillar 6.2 s, sky ignites 7.0 s, sword rain 9-14 s, sun collapse flash 15.1 s, giant sword + final explosion 15.5 s, embers cool.
3. Step 3 (14.7-19.2): it interviews like a sound designer, 4 multiple-choice questions, each with a recommended pick:
   - Feeling: holy divine wrath / pure destructive fire / epic boss showcase.
   - Style: cinematic game (big, layered, fire + metal + magic sweeteners) / anime (snappy, exaggerated whooshes, sparkles) / realistic (real fire, metal, impacts, little magic).
   - Use and loudness: VFX portfolio ~-10 LUFS / in-game ~-16 LUFS (sits under music) / cinematic ~-23 LUFS (lots of dynamic range). Values read from small UI text.
   - Voice/music: SFX + holy choir tone / SFX only / SFX + boss vocal.
   The skill's checklist: study video → interview → brief and concept → gather and measure sources → build recipe, render, measure, fix → put sound on video and deliver.
4. Step 4 (19.7-20.3): ~70 layers of real fire, steel, stone and wings (a spectrogram is shown).

## VFX techniques in the result (22.0-29.2 s)
| t (s) | event | technique |
|---|---|---|
| 22.0 | sigil slam: flat fire disc flash on the ground | additive ground decal, white core → orange edge, expands in 0.1 s |
| 22.1-23.2 | rune circles burn in, lava cracks glow | animated emissive decal (#ff6a20) + crack mask, heat haze |
| 23.3-24.4 | ring of glowing swords rises, then they fly up as long streaks | mesh swords with emissive edges, stretched velocity-aligned streaks |
| 24.8-24.9 | boss rises in a thin vertical fire pillar | thin bright beam, white core |
| 25.0-26.1 | cut to sky: sun flare, fire ring horizon, wing emblem, cloud bank | wide establishing beat, black sky for contrast |
| 26.2-27.2 | sun portal (spiral fire ring) rains burning swords | radial fire ring flipbook, falling streaks |
| 27.3 | sun collapses: full-screen orange-white flash | 1-frame flash, then quick fall-off |
| 27.4-27.6 | one giant sword drops, shock dome on the ground | thin beam + hemisphere distortion |
| 27.7-28.4 | final explosion: radial white-hot starburst, rock shards, thousands of sparks | starburst sprite + debris meshes + spark particles |
| 28.5-29.2 | a phoenix-wing silhouette of fire fades into smoke; embers | dark smoke silhouette, ember trickle |
Palette: background haze #4a4058-#6a5a70 (cool, desaturated) so the fire #ff7a20 / #ffd080 / white cores dominate.

## What to copy
- Our sfx skill should ask the same 4 questions (feeling, style, loudness target, voice/music) with a recommended default, and build its layer timeline from frame times like these (our tools/refs frames + stats give the times).
- Loudness targets per use: portfolio ~-10, in-game ~-16, cinematic ~-23 LUFS.
- VFX: cool, desaturated backgrounds; one hot hue; white-hot cores; a 1-frame flash before the biggest hit.

## Not verified
- How many layers or which sources the skill really used (only the on-screen claim).
