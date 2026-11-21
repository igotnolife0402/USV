---
summary: Audio pipeline: preset synth, OfflineAudioContext render, WebAudio buffer to 16-bit WAV, OGG conversion, loudness, delivery
updated: 2026-11-21
status: current
triggers: [wav export, offlineaudiocontext, ogg, normalize, loudness]
---
# Audio pipeline

## 1. Layout
```
sfx/sfx.js          synth + PRESETS table (source of truth; runtime and export share it)
sfx/preview.html    buttons per preset + export
sfx/out/<name>.wav  rendered files (PC)
sfx/out/<name>.ogg  compressed for web/Roblox (PC, ffmpeg)
```

## 2. Preset format (jsfxr-style)
```js
{ wave: 'square'|'sawtooth'|'triangle'|'sine'|'noise',
  freq: 900, freqEnd: 1400, slideTime: 0.06,      // Hz, seconds
  attack: 0.002, decay: 0.15, volume: 0.5,
  lowpass: 8000, duty: 0.5 /* square only via PeriodicWave, optional */ }
```

## 3. Render → WAV
1. `const ctx = new OfflineAudioContext(1, Math.ceil(44100 * dur), 44100)`.
2. Call the same `play(preset, ctx)` used at runtime (synth takes a context argument).
3. `const buf = await ctx.startRendering()`.
4. Peak-normalize to -1 dBFS (scale by `0.891 / peak`).
5. Encode 16-bit PCM mono WAV (encoder in [snippets](domains/audio/snippets/README.md)), Blob → download or write file.

## 4. Formats
| Use | Format | Settings |
|---|---|---|
| Master/archive | WAV | 44.1 kHz, 16-bit, mono for SFX |
| Web | OGG Vorbis or MP3 (Safari: MP3/AAC safest) | `ffmpeg -i in.wav -c:a libvorbis -q:a 4 out.ogg`; `-c:a libmp3lame -q:a 4 out.mp3` |
| Roblox | OGG or MP3 (WAV/FLAC also accepted) | Upload via Studio/Creator Hub (PC); check size/duration limits |
| Runtime only | none | synthesize at load; zero files |

## 5. Loudness
Peak ≤ -1 dBFS. SFX -14..-18 LUFS short-term; UI -20..-24; music -16..-20 integrated. PC check: `ffmpeg -i x.wav -af loudnorm=print_format=summary -f null -`.

## 6. Integration
Games: `sfx.play('coin')` from update events, not render. Pre-create noise buffer once. Respect mute and pause.

## 7. Mobile
Runtime synthesis in repo (`sfx/sfx.js`) + Artifact preview. File export/ffmpeg/upload → [queue/pc.md](queue/pc.md).
