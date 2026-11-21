---
paths: ["**/*sfx*/**","**/*.wav","domains/audio/**"]
---
# Audio rules
- Generate SFX procedurally from a preset table (jsfxr-style params) before reaching for sample files.
- Create or resume the AudioContext only inside a user gesture; always provide mute.
- Every envelope ramps from and to near-zero (exponential ramps target 0.0001, never 0); no clicks.
- New source nodes per play; never call start() twice on one node.
- Master gain ≤ 0.8 plus a compressor; exported files peak ≤ -1 dBFS.
- Runtime and offline export share one `play(preset, ctx)` function.
- WAV export = 44.1 kHz 16-bit mono PCM with correct RIFF sizes and sample rate.
- You cannot hear output: verify by rendering offline and checking peak/duration numbers, plus console clean.
- Mobile: Artifact preview + repo source; queue file export/ffmpeg/upload in queue/pc.md.
- Done = checklists/audio.md; new failures go into domains/audio/errors.md.
