---
summary: Fastest proven path to good procedural SFX: jsfxr-style params in WebAudio, offline render to WAV; PC files vs mobile Artifact
updated: 2026-11-21
status: current
triggers: [sfx, sound effect, webaudio, jsfxr, wav export]
---
# Audio playbook

## Route
| Ask | Route |
|---|---|
| Game/UI SFX (jump, coin, laser, hit, explosion, click) | Procedural WebAudio synth with jsfxr-style params |
| Sounds shipped as files | Render via OfflineAudioContext → 16-bit WAV ([pipeline](domains/audio/pipeline.md)) |
| Background music loop | Simple step sequencer (oscillators + envelopes) or CC0 library track (PC) |
| Roblox | Export WAV/OGG, upload in Studio (PC); see [roblox pipeline](domains/roblox/pipeline.md) |

## Sound recipes (jsfxr-style params)
| Sound | Wave | Pitch | Envelope | Extra |
|---|---|---|---|---|
| Coin/pickup | square | 900 → 1400 Hz step at 60 ms | A 0, D 0.15 s | slight vibrato off |
| Jump | square/triangle | 250 → 600 Hz slide up | A 0, D 0.2 s | duty 0.25 |
| Laser | saw/square | 1200 → 200 Hz slide down | A 0, D 0.15 s | fast slide |
| Hit/hurt | noise + square | 300 → 80 Hz | A 0, D 0.12 s | lowpass 2 kHz |
| Explosion | noise | lowpass 1500 → 100 Hz | A 0, D 0.6-1.0 s | slight pitch drop |
| Click/UI | sine/triangle | 1200 Hz | A 0, D 0.03 s | very quiet (-18 dB) |
| Power-up | square | arpeggio up 3-4 notes | each 60 ms | |
Always randomize pitch ±5% per play to avoid repetition fatigue.

## Impact layering (general practice, unmeasured; see [epic-reference](domains/animation/epic-reference.md))
- Whoosh pre-hit 150-300 ms → 1-3 frames silence → crack transient < 30 ms + sub boom 40-60 Hz 0.5-1.5 s → debris tail 1-2 s → low rumble bed.

## PC (/pc)
1. Write the synth from [snippets](domains/audio/snippets/README.md) in `sfx/sfx.js` with a preset table.
2. Build `sfx/preview.html`: one button per preset + "export WAV".
3. Serve, open with playwright-mcp/chrome-devtools-mcp, click each button, console clean (you cannot hear; check envelopes by rendering offline and reading peak/RMS numbers).
4. Export WAVs via OfflineAudioContext to `sfx/out/<name>.wav`; optional `ffmpeg -i x.wav -c:a libvorbis -q:a 4 x.ogg`.
5. Normalize: peak ≤ -1 dBFS; SFX around -14 to -18 LUFS short-term, UI quieter.

## Mobile fallback (/mobile)
- No browser automation, no local files, no ffmpeg. Build `preview.html` as an Artifact: the user taps buttons to hear sounds on the phone; include a "download WAV" button (Blob URL) where the Artifact allows it.
- Save the synth/preset source to `sfx/sfx.js` in the repo; runtime synthesis means no binary files are needed.
- Queue file exports in [queue/pc.md](queue/pc.md), e.g.:
  `- [ ] 2026-11-21 export coin/jump/hit to WAV+OGG, normalize -1 dBFS — audio sfx/sfx.js`

## Quality bar
- No clicks: every envelope starts and ends at 0 with ≥ 2-5 ms ramps; never stop an oscillator at non-zero gain.
- No clipping: master gain ≤ 0.8 and a DynamicsCompressor on the master bus.
- Short and punchy: gameplay SFX ≤ 0.3 s except explosions/power-ups.
- Distinct timbres per action; pitch variance; volume hierarchy (player > enemies > ambience > UI).
- AudioContext created/resumed on first user gesture; global mute; respects game pause.

## Speed tricks
- One `play(preset, overrides)` function + preset table; never hand-write each sound.
- Noise buffer created once and reused.
- Mutate an existing preset (pitch ×1.5, decay ×0.7) instead of designing from zero.
- For variety: 3 variants of a preset via seeded random tweaks.

## Done
Run [checklists/audio.md](checklists/audio.md). Add new failures to [errors](domains/audio/errors.md).
