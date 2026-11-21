---
summary: Known WebAudio/SFX/WAV export failures with cause and fix
updated: 2026-11-21
status: current
triggers: [audio error, no sound, click pop, audiocontext, wav broken]
---
# Audio errors

| Symptom | Cause | Fix | Seen |
|---|---|---|---|
| No sound; console `The AudioContext was not allowed to start` | Autoplay policy | Create or `ctx.resume()` inside first pointerdown/keydown | 2026-11-21 |
| Silent on iPhone | Ring/silent switch mutes WebAudio; context suspended | Resume on touchend; tell user to unmute; play a silent buffer on first tap | 2026-11-21 |
| Click/pop at start or end | Gain jumps to/from non-zero | `setValueAtTime(0,t)` + `linearRampToValueAtTime`; end with ramp to 0.0001 before stop | 2026-11-21 |
| `exponentialRampToValueAtTime` throws RangeError | Target value 0 not allowed | Ramp to 0.0001 (or use linear ramp) | 2026-11-21 |
| Ramp ignored, value jumps | No anchor event before ramp | Call `setValueAtTime(current, now)` before ramping | 2026-11-21 |
| `InvalidStateError: cannot call start more than once` | Reusing an OscillatorNode/BufferSource | Create new source nodes per play (they are cheap) | 2026-11-21 |
| Distortion when many sounds overlap | Sum exceeds 0 dBFS | Master gain ≤ 0.8 + DynamicsCompressorNode | 2026-11-21 |
| Exported WAV is noise/garbage | Float samples written without clamping/16-bit conversion or wrong header sizes | Clamp to [-1,1], scale to Int16, RIFF sizes = 36 + dataLen | 2026-11-21 |
| Exported WAV silent | Sources not started in OfflineAudioContext or rendered before scheduling | Schedule all nodes, then `await ctx.startRendering()` | 2026-11-21 |
| WAV plays at wrong speed/pitch | Header sample rate ≠ buffer sample rate | Write `buffer.sampleRate` into header | 2026-11-21 |
| Sounds lag 100-300 ms on Android | Default latency hint | `new AudioContext({ latencyHint: 'interactive' })`; pre-decode buffers | 2026-11-21 |
| Memory grows over long sessions | Nodes kept referenced; listeners accumulate | Let nodes disconnect on `onended`; no stored refs | 2026-11-21 |
| Download button does nothing in Artifact | Sandboxed iframe blocks downloads | Save source to repo; queue WAV export on PC | 2026-11-21 |
| Roblox audio won't play / blocked | Asset private or still in moderation | Grant place access; wait for moderation | 2026-11-21 |
